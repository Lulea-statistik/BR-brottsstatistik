(() => {
  const ROOT = 'data/handlagda/';
  const TABLE_LABELS = {
    '300':'Utredning och beslut',
    '310':'Misstänkt person och beslut',
    '320':'Anmälningsår'
  };
  const REGION_ORDER = ['La','Rn01','Rn02','Rn03','Rn04','Rn05','Rn06','Rn07'];
  const REGION_NAMES = {
    La:'Hela landet',
    Rn01:'Region Nord',
    Rn02:'Region Mitt',
    Rn03:'Region Stockholm',
    Rn04:'Region Öst',
    Rn05:'Region Väst',
    Rn06:'Region Syd',
    Rn07:'Region Bergslagen'
  };
  const cache = new Map();
  let manifest = null;
  let currentPayload = null;
  let trendChart = null;
  let rankChart = null;
  let crimeOptions = [];
  let selectedCrimeKey = '';

  const $ = id => document.getElementById(id);

  function fmtNumber(value, percent=false){
    const n=Number(value);
    if(!Number.isFinite(n)) return '–';
    if(percent) return new Intl.NumberFormat('sv-SE',{maximumFractionDigits:1}).format(n)+' %';
    return new Intl.NumberFormat('sv-SE',{maximumFractionDigits:0}).format(n);
  }

  function isPercentMeasure(label){
    return /\(%\)|procent|andel/i.test(label||'');
  }

  function canonicalMeasure(label, year){
    let s=String(label||'').toLocaleLowerCase('sv-SE').replace(/\s+/g,' ').trim();
    const y=Number(year);
    if(Number.isFinite(y)){
      s=s.replace(new RegExp(String(y),'g'),'<y0>');
      s=s.replace(new RegExp(String(y-1),'g'),'<y1>');
      s=s.replace(new RegExp(String(y-2),'g'),'<y2>');
    }
    s=s.replace(/\b(?:19|20)\d{2}\b/g,'<year>');
    return s;
  }

  function crimeKey(row){
    return String(row?.[0]??'')+'|||'+String(row?.[1]??'');
  }

  function crimeLabel(row){
    const law=String(row?.[0]??'').trim();
    const crime=String(row?.[1]??'').trim();
    return law && law!==crime ? crime+' — '+law : crime||law||'Okänd brottstyp';
  }

  function fileEntry(table,year,region){
    return manifest?.files?.find(x=>String(x.table_id)===String(table)&&String(x.year)===String(year)&&x.region_code===region);
  }

  async function loadJson(path){
    if(cache.has(path)) return cache.get(path);
    const p=fetch(ROOT+path,{cache:'no-store'}).then(r=>{
      if(!r.ok) throw new Error('HTTP '+r.status+' för '+path);
      return r.json();
    });
    cache.set(path,p);
    try{return await p;}catch(err){cache.delete(path);throw err;}
  }

  function setSelect(id,items,preferred){
    const el=$(id); if(!el)return '';
    const before=preferred ?? el.value;
    el.innerHTML='';
    items.forEach(item=>{
      const opt=document.createElement('option');
      opt.value=String(item.value);
      opt.textContent=item.text;
      el.appendChild(opt);
    });
    const chosen=items.some(x=>String(x.value)===String(before)) ? String(before) : (items[0]?String(items[0].value):'');
    if(chosen)el.value=chosen;
    return chosen;
  }

  function availableYears(table){
    return [...new Set((manifest?.files||[]).filter(x=>String(x.table_id)===String(table)).map(x=>Number(x.year)))]
      .sort((a,b)=>b-a);
  }

  function availableRegions(table,year){
    const rows=(manifest?.files||[]).filter(x=>String(x.table_id)===String(table)&&Number(x.year)===Number(year));
    const map=new Map(rows.map(x=>[x.region_code,x.region_name]));
    return REGION_ORDER.filter(code=>map.has(code)).map(code=>({value:code,text:REGION_NAMES[code]||map.get(code)}));
  }

  function selectedSheet(){
    const name=$('handledSheet')?.value;
    return currentPayload?.sheets?.[name]||null;
  }

  function findColumnIndex(sheet,matcher){
    return (sheet?.columns||[]).findIndex((label,i)=>i>=2&&matcher(String(label||'')));
  }

  function currentMeasure(){
    const key=$('handledMeasure')?.value||'';
    const text=$('handledMeasure')?.selectedOptions?.[0]?.textContent||'Värde';
    return {key,label:text,percent:isPercentMeasure(text)||key.startsWith('derived:')};
  }

  function measureResult(payload,sheetName,row,measure){
    if(!row||!measure)return {value:null,count:null};
    const table=String(payload?.table_id||$('handledTable')?.value||'');
    const sheet=payload?.sheets?.[sheetName]||null;

    if(measure.key==='derived:investigated_share'||measure.key==='derived:direct_share'){
      const candidateSheets=Object.values(payload?.sheets||{});
      for(const s of [sheet,...candidateSheets]){
        if(!s?.columns||!s?.rows)continue;
        const matchedRow=s.rows.find(r=>crimeKey(r)===crimeKey(row));
        if(!matchedRow)continue;
        const totalIdx=findColumnIndex(s,label=>{
          const x=label.toLocaleLowerCase('sv-SE');
          return x.includes('handlagda brott')&&x.includes('totalt')&&!x.includes('övriga');
        });
        const countIdx=findColumnIndex(s,label=>{
          const x=label.toLocaleLowerCase('sv-SE');
          return measure.key==='derived:investigated_share'
            ? /^utredda brott(?:, totalt)?$/.test(x.trim())
            : /^direktavskrivna brott(?:, totalt)?$/.test(x.trim());
        });
        const total=Number(matchedRow[totalIdx]);
        const count=Number(matchedRow[countIdx]);
        if(totalIdx>=2&&countIdx>=2&&Number.isFinite(total)&&total>0&&Number.isFinite(count)){
          return {value:(count/total)*100,count};
        }
      }
      return {value:null,count:null};
    }

    if([
      'derived:with_suspect_share',
      'derived:with_suspect_personcleared_share',
      'derived:personcleared_prosecution_share',
      'derived:personcleared_penaltyorder_share',
      'derived:personcleared_waiver_share',
      'derived:with_suspect_fub_share',
      'derived:with_suspect_other_share'
    ].includes(measure.key)){
      const configs={
        'derived:with_suspect_share':{
          numerator:x=>x.includes('handlagda brott med misstänkt person')&&x.includes('totalt')&&!x.includes('både med och utan'),
          denominator:x=>x.includes('samtliga handlagda brott')&&x.includes('både med och utan misstänkt person')
        },
        'derived:with_suspect_personcleared_share':{
          numerator:x=>x.includes('handlagda brott med misstänkt person som personuppklarats'),
          denominator:x=>x.includes('handlagda brott med misstänkt person')&&x.includes('totalt')&&!x.includes('både med och utan')
        },
        'derived:personcleared_prosecution_share':{
          numerator:x=>x.includes('personuppklarade brott där åtal väckts'),
          denominator:x=>x.includes('handlagda brott med misstänkt person som personuppklarats')
        },
        'derived:personcleared_penaltyorder_share':{
          numerator:x=>x.includes('personuppklarade brott där strafföreläggande'),
          denominator:x=>x.includes('handlagda brott med misstänkt person som personuppklarats')
        },
        'derived:personcleared_waiver_share':{
          numerator:x=>x.includes('personuppklarade brott där åtalsunderlåtelse'),
          denominator:x=>x.includes('handlagda brott med misstänkt person som personuppklarats')
        },
        'derived:with_suspect_fub_share':{
          numerator:x=>x.includes('handlagda brott med misstänkt person')&&x.includes('förundersöknings')&&x.includes('begräns'),
          denominator:x=>x.includes('handlagda brott med misstänkt person')&&x.includes('totalt')&&!x.includes('både med och utan')
        },
        'derived:with_suspect_other_share':{
          numerator:x=>x.includes('handlagda brott med misstänkt person')&&x.includes('övriga beslut'),
          denominator:x=>x.includes('handlagda brott med misstänkt person')&&x.includes('totalt')&&!x.includes('både med och utan')
        }
      };
      const config=configs[measure.key];
      const candidateSheets=Object.values(payload?.sheets||{});
      for(const s of [sheet,...candidateSheets]){
        if(!s?.columns||!s?.rows)continue;
        const matchedRow=s.rows.find(r=>crimeKey(r)===crimeKey(row));
        if(!matchedRow)continue;
        const norm=label=>String(label||'').toLocaleLowerCase('sv-SE').replace(/-/g,' ').replace(/\s+/g,' ').trim();
        const numeratorIdx=findColumnIndex(s,label=>config.numerator(norm(label)));
        const denominatorIdx=findColumnIndex(s,label=>config.denominator(norm(label)));
        const count=Number(matchedRow[numeratorIdx]);
        const total=Number(matchedRow[denominatorIdx]);
        if(numeratorIdx>=2&&denominatorIdx>=2&&Number.isFinite(count)&&Number.isFinite(total)&&total>0){
          return {value:(count/total)*100,count};
        }
      }
      return {value:null,count:null};
    }

    if(measure.key==='derived:no_suspect_fub_share'||measure.key==='derived:no_suspect_other_share'){
      const candidateSheets=Object.values(payload?.sheets||{});
      for(const s of [sheet,...candidateSheets]){
        if(!s?.columns||!s?.rows)continue;
        const matchedRow=s.rows.find(r=>crimeKey(r)===crimeKey(row));
        if(!matchedRow)continue;
        const totalIdx=findColumnIndex(s,label=>{
          const x=label.toLocaleLowerCase('sv-SE').replace(/-/g,' ');
          return x.includes('handlagda brott utan misstänkt person')&&x.includes('totalt');
        });
        const countIdx=findColumnIndex(s,label=>{
          const x=label.toLocaleLowerCase('sv-SE').replace(/-/g,' ');
          return measure.key==='derived:no_suspect_fub_share'
            ? x.includes('handlagda brott utan misstänkt person')&&x.includes('förundersöknings')&&x.includes('begräns')
            : x.includes('handlagda brott utan misstänkt person')&&x.includes('övriga beslut');
        });
        const total=Number(matchedRow[totalIdx]);
        const count=Number(matchedRow[countIdx]);
        if(totalIdx>=2&&countIdx>=2&&Number.isFinite(total)&&total>0&&Number.isFinite(count)){
          return {value:(count/total)*100,count};
        }
      }
      return {value:null,count:null};
    }

    if(measure.key==='derived:current_year_share'){
      const year=Number(payload?.year);
      const target=canonicalMeasure('Andel handlagda brott anmälda '+year+' (%)',year);
      const candidateSheets=[
        sheet,
        ...Object.entries(payload?.sheets||{})
          .filter(([name])=>name!==sheetName)
          .map(([,s])=>s)
      ];
      for(const s of candidateSheets){
        if(!s?.columns||!s?.rows)continue;
        const matchedRow=s.rows.find(r=>crimeKey(r)===crimeKey(row));
        if(!matchedRow)continue;
        let idx=s.columns.findIndex(c=>canonicalMeasure(c,year)===target);
        let countIdx=findColumnIndex(s,label=>{
          const x=label.toLocaleLowerCase('sv-SE');
          return x.includes('handlagda brott')&&x.includes('totalt')&&!x.includes('personuppklarade')&&!x.includes('övriga');
        });
        if(idx<2&&String(table)==='320'&&s.columns.length>=4)idx=3;
        if(countIdx<2&&String(table)==='320'&&s.columns.length>=3)countIdx=2;
        const value=Number(matchedRow[idx]);
        const count=Number(matchedRow[countIdx]);
        if(idx>=2&&Number.isFinite(value)){
          return {value,count:Number.isFinite(count)?count:null};
        }
      }
      return {value:null,count:null};
    }

    if(measure.key.startsWith('column:')){
      const canonical=measure.key.slice(7);
      const year=Number(payload?.year);
      const candidateSheets=[
        sheet,
        ...Object.entries(payload?.sheets||{})
          .filter(([name])=>name!==sheetName)
          .map(([,s])=>s)
      ];
      for(const s of candidateSheets){
        if(!s?.columns||!s?.rows)continue;
        const matchedRow=s.rows.find(r=>crimeKey(r)===crimeKey(row));
        if(!matchedRow)continue;
        const idx=s.columns.findIndex(c=>canonicalMeasure(c,year)===canonical);
        if(idx<2)continue;
        const value=Number(matchedRow[idx]);
        if(Number.isFinite(value))return {value,count:null};
      }
    }
    return {value:null,count:null};
  }

  function hasPositiveMeasureValue(row,measure=currentMeasure(),payload=currentPayload,sheetName=$('handledSheet')?.value){
    const result=measureResult(payload,sheetName,row,measure);
    return Number.isFinite(result.value)&&result.value>0;
  }

  function resolveCrimeRow(sheet){
    if(!sheet?.rows?.length)return null;
    const measure=currentMeasure();
    const validRows=sheet.rows.filter(r=>hasPositiveMeasureValue(r,measure));
    if(!validRows.length)return null;
    const selectedKey=$('handledCrime')?.value||selectedCrimeKey;
    return validRows.find(r=>crimeKey(r)===selectedKey)
      || validRows.find(r=>crimeKey(r)===selectedCrimeKey)
      || validRows.find(r=>String(r?.[1]||'').trim().toUpperCase()==='SAMTLIGA BROTT')
      || validRows[0];
  }

  function refreshCrimeList(preserve=true){
    const sheet=selectedSheet();
    const select=$('handledCrime');
    if(!sheet||!select)return;

    const oldKey=preserve?selectedCrimeKey:'';
    const measure=currentMeasure();
    crimeOptions=sheet.rows
      .filter(row=>hasPositiveMeasureValue(row,measure))
      .map(row=>({key:crimeKey(row),label:crimeLabel(row),row}));

    let chosen=crimeOptions.find(x=>x.key===oldKey)
      || crimeOptions.find(x=>String(x.row?.[1]||'').trim().toUpperCase()==='SAMTLIGA BROTT')
      || crimeOptions[0];

    setSelect(
      'handledCrime',
      crimeOptions.map(item=>({value:item.key,text:item.label})),
      chosen?.key||''
    );

    selectedCrimeKey=select.value||chosen?.key||'';
  }

  const RANK_WINDOW_SIZE=15;

  function rankWindowStart(){
    return Math.max(0,Number($('handledTopN')?.value||0));
  }

  function updateRankSlider(totalRows){
    const slider=$('handledTopN');
    if(!slider)return;
    const total=Math.max(0,Number(totalRows)||0);
    const maxStart=Math.max(0,total-RANK_WINDOW_SIZE);
    slider.min='0';
    slider.max=String(maxStart);
    if(Number(slider.value)>maxStart)slider.value=String(maxStart);
    const start=rankWindowStart();
    const end=Math.min(total,start+RANK_WINDOW_SIZE);
    const pct=maxStart>0?(start/maxStart)*100:0;
    slider.style.setProperty('--handled-topn-pct',pct+'%');
    slider.disabled=maxStart===0;
    if($('handledTopNValue')){
      $('handledTopNValue').textContent=total ? (start+1)+'–'+end+' av '+total : '–';
    }
  }

  function refreshMeasures(preserve=true){
    const sheet=selectedSheet();
    if(!sheet)return;
    const table=String($('handledTable')?.value||'');
    const old=preserve?$('handledMeasure')?.value:'';
    let measures=[];

    if(table==='300'){
      measures=[
        {value:'derived:investigated_share',text:'Andel utredda brott (%)'},
        {value:'derived:direct_share',text:'Andel direktavskrivna brott (%)'}
      ];
      const percentageSource=Object.values(currentPayload?.sheets||{}).find(s=>
        (s?.columns||[]).some(label=>/lagföringsprocent|personuppklaringsprocent/i.test(String(label||'')))
      );
      (percentageSource?.columns||[]).forEach(label=>{
        if(/lagföringsprocent|personuppklaringsprocent/i.test(String(label||''))){
          measures.push({
            value:'column:'+canonicalMeasure(label,currentPayload?.year),
            text:String(label).replace(/\s*\(%\)\s*$/,' (%)')
          });
        }
      });
    }else if(table==='310'&&$('handledSheet')?.value==='Brott med misstänkt person'){
      measures=[
        {value:'derived:with_suspect_share',text:'Andel handlagda brott med misstänkt person (%)'},
        {value:'derived:with_suspect_personcleared_share',text:'Andel handlagda brott med misstänkt person som personuppklarats (%)'},
        {value:'derived:personcleared_prosecution_share',text:'Andel personuppklarade brott där åtal väckts (%)'},
        {value:'derived:personcleared_penaltyorder_share',text:'Andel personuppklarade brott där strafföreläggande utfärdats (%)'},
        {value:'derived:personcleared_waiver_share',text:'Andel personuppklarade brott där åtalsunderlåtelse utfärdats (%)'},
        {value:'derived:with_suspect_fub_share',text:'Andel handlagda brott med misstänkt person som förundersökningsbegränsats (%)'},
        {value:'derived:with_suspect_other_share',text:'Andel handlagda brott med misstänkt person som avslutats med övriga beslut (%)'}
      ];
    }else if(table==='310'&&$('handledSheet')?.value==='Brott utan misstänkt person'){
      measures=[
        {value:'derived:no_suspect_fub_share',text:'Andel brott utan misstänkt person som förundersökningsbegränsats (%)'},
        {value:'derived:no_suspect_other_share',text:'Andel brott utan misstänkt person som avslutats med övriga beslut (%)'}
      ];
    }else if(table==='320'){
      measures=[{value:'derived:current_year_share',text:'Andel handlagda brott anmäld'}];
    }else{
      measures=sheet.columns.slice(2).map(text=>({
        value:'column:'+canonicalMeasure(text,currentPayload?.year),
        text
      }));
    }

    setSelect('handledMeasure',measures,old);
  }

  function chartOptions(percent=false,indexAxis='x'){
    return {
      responsive:true,
      maintainAspectRatio:false,
      animation:false,
      indexAxis,
      plugins:{
        legend:{display:false},
        tooltip:{
          titleFont:{size:14,weight:'700'},
          bodyFont:{size:13},
          padding:11,
          callbacks:{
            label:ctx=>fmtNumber(ctx.raw,percent),
            afterLabel:ctx=>{
              const count=ctx.dataset?._counts?.[ctx.dataIndex];
              return Number.isFinite(Number(count)) ? 'Antal: '+fmtNumber(count,false) : '';
            }
          }
        }
      },
      scales:{
        x:indexAxis==='y'
          ? {beginAtZero:true,ticks:{callback:v=>percent?v+' %':new Intl.NumberFormat('sv-SE',{notation:'compact',maximumFractionDigits:1}).format(v)}}
          : {grid:{display:false}},
        y:indexAxis==='y'
          ? {grid:{display:false},ticks:{font:{size:11},autoSkip:false}}
          : {beginAtZero:true,ticks:{callback:v=>percent?v+' %':new Intl.NumberFormat('sv-SE',{notation:'compact',maximumFractionDigits:1}).format(v)}}
      }
    };
  }

  function renderCurrent(){
    const sheet=selectedSheet();
    if(!sheet)return;
    const row=resolveCrimeRow(sheet);
    if(!row)return;

    selectedCrimeKey=crimeKey(row);
    $('handledCrime').value=selectedCrimeKey;

    const measure=currentMeasure();
    const result=measureResult(currentPayload,$('handledSheet').value,row,measure);

    $('handledValue').textContent=fmtNumber(result.value,measure.percent);
    $('handledValueSub').textContent=measure.label;
    $('handledCrimeKpi').textContent=String(row[1]??'–');
    $('handledLawKpi').textContent=String(row[0]??'–');
    $('handledSheetKpi').textContent=$('handledSheet').value;
    $('handledSourceKpi').textContent=(REGION_NAMES[currentPayload?.region_code]||currentPayload?.region_name||'')+' · '+(currentPayload?.year||'');
    $('handledSourceLink').href=currentPayload?.source_file||currentPayload?.source_page||'#';

    renderDetail(sheet,row);
    renderRanking(sheet,measure);
    renderTrend(row,measure);
  }

  function renderDetail(sheet,row){
    const tbody=$('handledDetailBody');
    tbody.innerHTML='';
    sheet.columns.slice(2).forEach((label,i)=>{
      const idx=i+2;
      const raw=row[idx];
      if(raw===null||raw===undefined||raw===''||!Number.isFinite(Number(raw))||Number(raw)===0)return;
      const tr=document.createElement('tr');
      const th=document.createElement('th');
      const td=document.createElement('td');
      th.textContent=label;
      td.textContent=fmtNumber(raw,isPercentMeasure(label));
      tr.append(th,td);
      tbody.appendChild(tr);
    });
    $('handledDetailStatus').textContent=(currentPayload?.year||'')+' · '+(REGION_NAMES[currentPayload?.region_code]||currentPayload?.region_name||'')+' · '+crimeLabel(row);
  }

  function renderRanking(sheet,measure){
    const ranked=sheet.rows
      .map(r=>({row:r,...measureResult(currentPayload,$('handledSheet').value,r,measure)}))
      .filter(x=>Number.isFinite(x.value)&&x.value>0)
      .filter(x=>String(x.row?.[1]||'').trim().toUpperCase()!=='SAMTLIGA BROTT')
      .sort((a,b)=>b.value-a.value);

    updateRankSlider(ranked.length);
    const start=rankWindowStart();
    const rows=ranked.slice(start,start+RANK_WINDOW_SIZE);
    const end=Math.min(ranked.length,start+RANK_WINDOW_SIZE);

    if(rankChart)rankChart.destroy();
    rankChart=new Chart($('handledRankChart'),{
      type:'bar',
      data:{
        labels:rows.map((x,i)=>(start+i+1)+'. '+String(x.row[1]||x.row[0]||'')),
        datasets:[{
          data:rows.map(x=>x.value),
          _counts:rows.map(x=>x.count),
          backgroundColor:'rgba(15,118,110,.72)',
          borderColor:'rgb(15,118,110)',
          borderWidth:1,
          borderRadius:3
        }]
      },
      options:chartOptions(measure.percent,'y')
    });
    $('handledRankTitle').textContent='Rankade värden – '+(currentPayload?.year||'');
    $('handledRankStatus').textContent=measure.label+' · '+(REGION_NAMES[currentPayload?.region_code]||currentPayload?.region_name||'')+' · plats '+(start+1)+'–'+end+' av '+ranked.length;
  }

  async function renderTrend(currentRow,measure){
    const table=$('handledTable').value;
    const region=$('handledRegion').value;
    const sheetName=$('handledSheet').value;
    const targetKey=crimeKey(currentRow);

    $('handledTrendStatus').textContent='Laddar tidsserie…';

    const entries=(manifest.files||[])
      .filter(x=>String(x.table_id)===String(table)&&x.region_code===region)
      .sort((a,b)=>Number(a.year)-Number(b.year));

    const points=(await Promise.all(entries.map(async entry=>{
      try{
        const payload=await loadJson(entry.path);
        const sheetEntries=Object.entries(payload.sheets||{});
        const orderedSheets=[
          ...sheetEntries.filter(([name])=>name===sheetName),
          ...sheetEntries.filter(([name])=>name!==sheetName)
        ];
        for(const [name,sheet] of orderedSheets){
          const row=sheet?.rows?.find(r=>crimeKey(r)===targetKey);
          if(!row)continue;
          const result=measureResult(payload,name,row,measure);
          if(Number.isFinite(result.value)&&result.value>0){
            return {year:Number(payload.year),value:result.value,count:result.count};
          }
        }
        return null;
      }catch{return null;}
    }))).filter(Boolean);

    if(trendChart)trendChart.destroy();
    trendChart=new Chart($('handledTrendChart'),{
      type:'line',
      data:{
        labels:points.map(x=>String(x.year)),
        datasets:[{
          data:points.map(x=>x.value),
          _counts:points.map(x=>x.count),
          borderColor:'rgb(37,99,235)',
          backgroundColor:'rgba(37,99,235,.12)',
          pointRadius:3,
          pointHoverRadius:5,
          tension:.15,
          fill:false
        }]
      },
      options:chartOptions(measure.percent,'x')
    });
    $('handledTrendTitle').textContent='Utveckling över tid – '+String(currentRow[1]||'');
    $('handledTrendStatus').textContent=measure.label+' · '+($('handledRegion').selectedOptions[0]?.textContent||region)+' · '+points.length+' år';
  }

  async function loadSelection({preserveSheet=true,preserveCrime=true,preserveMeasure=true}={}){
    const table=$('handledTable').value;
    const year=$('handledYear').value;
    const region=$('handledRegion').value;
    const entry=fileEntry(table,year,region);
    if(!entry){
      $('handledStatus').textContent='Ingen datafil finns för valt urval.';
      return;
    }
    $('handledStatus').textContent='Laddar '+TABLE_LABELS[table]+'…';
    try{
      currentPayload=await loadJson(entry.path);
      const sheets=Object.keys(currentPayload.sheets||{});
      const is300=String(table)==='300';
      const is320=String(table)==='320';
      const visibleSheets=is300&&sheets.includes('Utredda brott')
        ? ['Utredda brott']
        : sheets;
      const preferredSheet=is320
        ? (sheets.includes('Samtliga handlagda brott')?'Samtliga handlagda brott':sheets[0])
        : (is300&&visibleSheets.includes('Utredda brott')
          ? 'Utredda brott'
          : (preserveSheet?$('handledSheet')?.value:''));
      setSelect('handledSheet',visibleSheets.map(x=>({value:x,text:x})),preferredSheet);
      $('handledSheetLabel')?.classList.toggle('hidden',is320);
      refreshMeasures(preserveMeasure&&!is320);
      refreshCrimeList(preserveCrime);
      $('handledStatus').textContent='Brå · '+currentPayload.year+' · '+(REGION_NAMES[currentPayload.region_code]||currentPayload.region_name)+' · '+(is320?'Samtliga handlagda brott':visibleSheets.length+' deltabeller');
      renderCurrent();
    }catch(err){
      console.error(err);
      $('handledStatus').textContent='Kunde inte läsa data: '+err.message;
    }
  }

  function refreshYearRegion({preserveYear=true,preserveRegion=true}={}){
    const table=$('handledTable').value;
    const years=availableYears(table);
    const year=setSelect('handledYear',years.map(y=>({value:y,text:String(y)})),preserveYear?$('handledYear')?.value:years[0]);
    const regions=availableRegions(table,year);
    setSelect('handledRegion',regions,preserveRegion?$('handledRegion')?.value:(regions.find(x=>x.value==='Rn01')?.value||regions[0]?.value));
  }

  async function init(){
    if(!$('handledTable'))return;
    try{
      const r=await fetch(ROOT+'manifest.json',{cache:'no-store'});
      if(!r.ok)throw new Error('HTTP '+r.status);
      manifest=await r.json();

      refreshYearRegion({preserveYear:false,preserveRegion:false});
      await loadSelection({preserveSheet:false,preserveCrime:false,preserveMeasure:false});

      $('handledTable').addEventListener('change',async()=>{
        refreshYearRegion({preserveYear:false,preserveRegion:false});
        selectedCrimeKey='';
        await loadSelection({preserveSheet:false,preserveCrime:false,preserveMeasure:false});
      });
      $('handledYear').addEventListener('change',async()=>{
        const table=$('handledTable').value;
        const regions=availableRegions(table,$('handledYear').value);
        setSelect('handledRegion',regions,$('handledRegion').value);
        await loadSelection();
      });
      $('handledRegion').addEventListener('change',()=>loadSelection());
      $('handledSheet').addEventListener('change',()=>{
        selectedCrimeKey='';
        refreshMeasures(false);
        refreshCrimeList(false);
        $('handledTopN').value='0';
        renderCurrent();
      });
      $('handledMeasure').addEventListener('change',()=>{
        refreshCrimeList(true);
        $('handledTopN').value='0';
        renderCurrent();
      });
      $('handledCrime').addEventListener('change',()=>{
        selectedCrimeKey=$('handledCrime').value;
        renderCurrent();
      });
      $('handledTopN')?.addEventListener('input',()=>{
        renderCurrent();
      });
    }catch(err){
      console.error(err);
      $('handledStatus').textContent='Interaktiv data är ännu inte färdigbyggd: '+err.message;
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();