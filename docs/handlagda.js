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

  function resolveCrimeRow(sheet){
    if(!sheet?.rows?.length)return null;
    let row=sheet.rows.find(r=>crimeKey(r)===selectedCrimeKey);
    if(row)return row;

    const text=($('handledCrime')?.value||'').trim().toLocaleLowerCase('sv-SE');
    if(text){
      row=sheet.rows.find(r=>crimeLabel(r).toLocaleLowerCase('sv-SE')===text)
        || sheet.rows.find(r=>String(r?.[1]||'').toLocaleLowerCase('sv-SE')===text)
        || sheet.rows.find(r=>crimeLabel(r).toLocaleLowerCase('sv-SE').includes(text));
    }
    return row || sheet.rows[0];
  }

  function refreshCrimeList(preserve=true){
    const sheet=selectedSheet();
    const list=$('handledCrimeList');
    if(!sheet||!list)return;

    const oldKey=preserve?selectedCrimeKey:'';
    crimeOptions=sheet.rows.map(row=>({key:crimeKey(row),label:crimeLabel(row),row}));
    list.innerHTML='';
    crimeOptions.forEach(item=>{
      const opt=document.createElement('option');
      opt.value=item.label;
      list.appendChild(opt);
    });

    let chosen=crimeOptions.find(x=>x.key===oldKey)
      || crimeOptions.find(x=>String(x.row?.[1]||'').trim().toUpperCase()==='SAMTLIGA BROTT')
      || crimeOptions[0];

    if(chosen){
      selectedCrimeKey=chosen.key;
      $('handledCrime').value=chosen.label;
    }
  }

  function refreshMeasures(preserve=true){
    const sheet=selectedSheet();
    if(!sheet)return;
    const old=preserve?$('handledMeasure')?.value:'';
    const measures=sheet.columns.slice(2).map((text,i)=>({value:String(i+2),text}));
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
            label:ctx=>fmtNumber(ctx.raw,percent)
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
    $('handledCrime').value=crimeLabel(row);

    const measureIndex=Number($('handledMeasure').value||2);
    const measure=sheet.columns[measureIndex]||'Värde';
    const value=row[measureIndex];
    const percent=isPercentMeasure(measure);

    $('handledValue').textContent=fmtNumber(value,percent);
    $('handledValueSub').textContent=measure;
    $('handledCrimeKpi').textContent=String(row[1]??'–');
    $('handledLawKpi').textContent=String(row[0]??'–');
    $('handledSheetKpi').textContent=$('handledSheet').value;
    $('handledSourceKpi').textContent=(REGION_NAMES[currentPayload?.region_code]||currentPayload?.region_name||'')+' · '+(currentPayload?.year||'');
    $('handledSourceLink').href=currentPayload?.source_file||currentPayload?.source_page||'#';

    renderDetail(sheet,row);
    renderRanking(sheet,measureIndex,measure,percent);
    renderTrend(row,measure,percent);
  }

  function renderDetail(sheet,row){
    const tbody=$('handledDetailBody');
    tbody.innerHTML='';
    sheet.columns.slice(2).forEach((label,i)=>{
      const idx=i+2;
      const tr=document.createElement('tr');
      const th=document.createElement('th');
      const td=document.createElement('td');
      th.textContent=label;
      td.textContent=fmtNumber(row[idx],isPercentMeasure(label));
      tr.append(th,td);
      tbody.appendChild(tr);
    });
    $('handledDetailStatus').textContent=(currentPayload?.year||'')+' · '+(REGION_NAMES[currentPayload?.region_code]||currentPayload?.region_name||'')+' · '+crimeLabel(row);
  }

  function renderRanking(sheet,measureIndex,measure,percent){
    const rows=sheet.rows
      .map(r=>({row:r,value:Number(r[measureIndex])}))
      .filter(x=>Number.isFinite(x.value))
      .filter(x=>String(x.row?.[1]||'').trim().toUpperCase()!=='SAMTLIGA BROTT')
      .sort((a,b)=>b.value-a.value)
      .slice(0,15);

    if(rankChart)rankChart.destroy();
    rankChart=new Chart($('handledRankChart'),{
      type:'bar',
      data:{
        labels:rows.map(x=>String(x.row[1]||x.row[0]||'')),
        datasets:[{
          data:rows.map(x=>x.value),
          backgroundColor:'rgba(15,118,110,.72)',
          borderColor:'rgb(15,118,110)',
          borderWidth:1,
          borderRadius:3
        }]
      },
      options:chartOptions(percent,'y')
    });
    $('handledRankTitle').textContent='Högsta värden – '+(currentPayload?.year||'');
    $('handledRankStatus').textContent=measure+' · '+(REGION_NAMES[currentPayload?.region_code]||currentPayload?.region_name||'')+' · Top 15 brottstyper';
  }

  async function renderTrend(currentRow,measure,percent){
    const table=$('handledTable').value;
    const region=$('handledRegion').value;
    const sheetName=$('handledSheet').value;
    const targetKey=crimeKey(currentRow);
    const currentYear=Number($('handledYear').value);
    const targetCanonical=canonicalMeasure(measure,currentYear);

    $('handledTrendStatus').textContent='Laddar tidsserie…';

    const entries=(manifest.files||[])
      .filter(x=>String(x.table_id)===String(table)&&x.region_code===region)
      .sort((a,b)=>Number(a.year)-Number(b.year));

    const points=(await Promise.all(entries.map(async entry=>{
      try{
        const payload=await loadJson(entry.path);
        const sheet=payload.sheets?.[sheetName];
        if(!sheet)return null;
        const row=sheet.rows.find(r=>crimeKey(r)===targetKey);
        if(!row)return null;
        const idx=sheet.columns.findIndex(c=>canonicalMeasure(c,payload.year)===targetCanonical);
        if(idx<2)return null;
        const value=Number(row[idx]);
        return Number.isFinite(value)?{year:Number(payload.year),value}:null;
      }catch{return null;}
    }))).filter(Boolean);

    if(trendChart)trendChart.destroy();
    trendChart=new Chart($('handledTrendChart'),{
      type:'line',
      data:{
        labels:points.map(x=>String(x.year)),
        datasets:[{
          data:points.map(x=>x.value),
          borderColor:'rgb(37,99,235)',
          backgroundColor:'rgba(37,99,235,.12)',
          pointRadius:3,
          pointHoverRadius:5,
          tension:.15,
          fill:false
        }]
      },
      options:chartOptions(percent,'x')
    });
    $('handledTrendTitle').textContent='Utveckling över tid – '+String(currentRow[1]||'');
    $('handledTrendStatus').textContent=measure+' · '+($('handledRegion').selectedOptions[0]?.textContent||region)+' · '+points.length+' år';
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
      setSelect('handledSheet',sheets.map(x=>({value:x,text:x})),preserveSheet?$('handledSheet')?.value:'');
      refreshCrimeList(preserveCrime);
      refreshMeasures(preserveMeasure);
      $('handledStatus').textContent='Brå · '+currentPayload.year+' · '+(REGION_NAMES[currentPayload.region_code]||currentPayload.region_name)+' · '+sheets.length+' deltabeller';
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
        refreshCrimeList(false);
        refreshMeasures(false);
        renderCurrent();
      });
      $('handledMeasure').addEventListener('change',renderCurrent);
      $('handledCrime').addEventListener('change',()=>{
        const text=$('handledCrime').value.trim().toLocaleLowerCase('sv-SE');
        const chosen=crimeOptions.find(x=>x.label.toLocaleLowerCase('sv-SE')===text)
          || crimeOptions.find(x=>String(x.row?.[1]||'').toLocaleLowerCase('sv-SE')===text)
          || crimeOptions.find(x=>x.label.toLocaleLowerCase('sv-SE').includes(text));
        if(chosen)selectedCrimeKey=chosen.key;
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