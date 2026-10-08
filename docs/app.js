import * as duckdb from 'https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.32.0/+esm';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

let META, CATEGORIES, MUNICIPALITIES, MUNICIPAL_META, GEO;
let db, conn, map, geoLayer, mapAutoBounds, profileRendered=false, mapInitialFitDone=false;
const charts = {};
let legislationTimelineCache=null;
const FOCUS_COLOR_STORAGE='bra-focus-colors-v1';
const focusColorOverrides=new Map();
const fmt0 = new Intl.NumberFormat('sv-SE',{maximumFractionDigits:0});
const fmt1 = new Intl.NumberFormat('sv-SE',{maximumFractionDigits:1});

function fmtAverage(value){
  const n=Number(value);
  if(!Number.isFinite(n))return '–';
  const a=Math.abs(n);
  const digits=a>=5 ? 0 : a>=1 ? 1 : 2;
  return new Intl.NumberFormat('sv-SE',{
    minimumFractionDigits:digits,
    maximumFractionDigits:digits
  }).format(n);
}

const el=id=>document.getElementById(id);
const esc=s=>String(s).replaceAll("'","''");

function rows(table){
  const normalise = value => {
    if (typeof value === 'bigint') return Number(value);
    if (Array.isArray(value)) return value.map(normalise);
    if (value && typeof value === 'object') {
      const out = {};
      for (const [key, item] of Object.entries(value)) out[key] = normalise(item);
      return out;
    }
    return value;
  };
  return table.toArray().map(r=>{
    const raw = typeof r.toJSON==='function' ? r.toJSON() : r;
    return normalise(raw);
  });
}
function parquetUrl(year){
  return new URL('data/parquet/year='+year+'.parquet', location.href).href;
}
function allParquetSql(){
  return '['+META.available_years.map(y=>"'"+parquetUrl(y)+"'").join(',')+']';
}
async function query(sql){
  const t=await conn.query(sql);
  return rows(t);
}
function setLoading(msg){
  const x=el('loading'); if(!x)return;
  if(!msg){
    x.classList.add('hidden');
    x.classList.remove('loading-tint');
    return;
  }
  const t=el('loadingText');
  if(t)t.textContent=msg;
  else x.textContent=msg;
  x.classList.add('loading-tint');
  x.classList.remove('hidden');
}

function setInlineLoading(id,text,isLoading){
  const node=el(id);
  if(!node)return;
  node.textContent=text;
  node.classList.toggle('loading-tint',Boolean(isLoading));
}
function destroyChart(id){if(charts[id]){charts[id].destroy();delete charts[id];}}

async function initDuck(){
  const bundle=await duckdb.selectBundle(duckdb.getJsDelivrBundles());
  const workerUrl=URL.createObjectURL(new Blob([`importScripts("${bundle.mainWorker}");`],{type:'text/javascript'}));
  const worker=new Worker(workerUrl);
  db=new duckdb.AsyncDuckDB(new duckdb.ConsoleLogger(),worker);
  await db.instantiate(bundle.mainModule,bundle.pthreadWorker);
  URL.revokeObjectURL(workerUrl);
  conn=await db.connect();
}

function categoryOption(c){
  const indent='· '.repeat(Math.max(0,Number(c['Brottsnivå']||1)-1));
  const ended=c['Upphört']===true||String(c['Upphört']).toLowerCase()==='true'?' [upphört]':'';
  return {value:String(c['Brott_ID']),text:indent+c['Brott']+ended};
}
function fillSelect(id,items,selected){
  const s=el(id);s.innerHTML='';
  items.forEach(item=>{
    const o=document.createElement('option');
    o.value=item.value;o.textContent=item.text;
    if(String(item.value)===String(selected))o.selected=true;
    s.appendChild(o);
  });
  if(s.dataset.municipalitySearch==='1')buildMunicipalitySearch(id);
}
function buildMunicipalitySearch(selectId){
  const select=el(selectId);
  if(!select)return;
  select.dataset.municipalitySearch='1';
  select.classList.add('native-municipality-select');

  const old=select.parentElement.querySelector('.municipality-picker');
  if(old)old.remove();

  const picker=document.createElement('div');
  picker.className='municipality-picker';

  const button=document.createElement('button');
  button.type='button';
  button.className='municipality-button';

  const menu=document.createElement('div');
  menu.className='municipality-menu hidden';

  const search=document.createElement('input');
  search.type='search';
  search.className='municipality-search';
  search.placeholder='Sök kommun…';
  search.autocomplete='off';
  search.setAttribute('aria-label','Sök kommun');

  const list=document.createElement('div');
  list.className='municipality-list';

  menu.append(search,list);
  picker.append(button,menu);
  select.insertAdjacentElement('afterend',picker);

  const options=()=>[...select.options].map(o=>({
    value:o.value,
    text:o.textContent||o.value
  }));

  const syncButton=()=>{
    const selected=select.options[select.selectedIndex];
    button.textContent=selected?.textContent||'Välj kommun';
  };

  const choose=item=>{
    select.value=item.value;
    syncButton();
    menu.classList.add('hidden');
    search.value='';
    select.dispatchEvent(new Event('change',{bubbles:true}));
  };

  const renderList=()=>{
    const q=search.value.trim().toLocaleLowerCase('sv-SE');
    const items=options()
      .filter(item=>!q || item.text.toLocaleLowerCase('sv-SE').includes(q))
      .sort((a,b)=>{
        if(a.value==='__ALL__')return -1;
        if(b.value==='__ALL__')return 1;
        if(q){
          const as=a.text.toLocaleLowerCase('sv-SE').startsWith(q);
          const bs=b.text.toLocaleLowerCase('sv-SE').startsWith(q);
          if(as!==bs)return as?-1:1;
        }
        return a.text.localeCompare(b.text,'sv-SE');
      });

    list.innerHTML='';
    if(!items.length){
      const empty=document.createElement('div');
      empty.className='municipality-empty';
      empty.textContent='Ingen kommun hittades';
      list.appendChild(empty);
      return;
    }

    items.forEach(item=>{
      const row=document.createElement('button');
      row.type='button';
      row.className='municipality-option';
      if(String(item.value)===String(select.value))row.classList.add('selected');
      row.textContent=item.text;
      row.addEventListener('click',()=>choose(item));
      list.appendChild(row);
    });
  };

  const openMenu=()=>{
    document.querySelectorAll('.municipality-menu').forEach(m=>{
      if(m!==menu)m.classList.add('hidden');
    });
    menu.classList.remove('hidden');
    renderList();
    requestAnimationFrame(()=>search.focus());
  };

  button.addEventListener('click',e=>{
    e.stopPropagation();
    if(menu.classList.contains('hidden'))openMenu();
    else menu.classList.add('hidden');
  });
  search.addEventListener('input',renderList);
  search.addEventListener('keydown',e=>{
    if(e.key==='Escape'){
      menu.classList.add('hidden');
      button.focus();
    }else if(e.key==='Enter'){
      const first=list.querySelector('.municipality-option');
      if(first){e.preventDefault();first.click();}
    }
  });
  picker.addEventListener('click',e=>e.stopPropagation());

  syncButton();
}

function setupMunicipalitySearch(){
  ['overviewMunicipality','trendMunicipality','profileMunicipality'].forEach(buildMunicipalitySearch);
  document.addEventListener('click',()=>{
    document.querySelectorAll('.municipality-menu').forEach(m=>m.classList.add('hidden'));
  });
}

function buildCrimeTree(selectId,availableIds=null){
  const select=el(selectId);
  if(!select)return;
  select.classList.add('native-crime-select');

  const old=select.parentElement.querySelector('.crime-tree-picker');
  if(old)old.remove();

  const picker=document.createElement('div');
  picker.className='crime-tree-picker';
  const button=document.createElement('button');
  button.type='button';
  button.className='crime-tree-button';
  const menu=document.createElement('div');
  menu.className='crime-tree-menu hidden';
  picker.append(button,menu);
  select.insertAdjacentElement('afterend',picker);

  const allowed=availableIds ? new Set([...availableIds].map(String)) : null;
  const byParent=new Map();
  CATEGORIES.filter(cat=>!allowed || allowed.has(String(cat.Brott_ID))).forEach(cat=>{
    const parent=cat['Förälder_ID'];
    const key=parent==null?'ROOT':String(Math.trunc(Number(parent)));
    if(!byParent.has(key))byParent.set(key,[]);
    byParent.get(key).push(cat);
  });
  for(const list of byParent.values()){
    list.sort((a,b)=>String(a.Brott).localeCompare(String(b.Brott),'sv'));
  }

  function selectedText(){
    const cat=CATEGORIES.find(x=>String(x.Brott_ID)===String(select.value));
    button.textContent=cat?.Brott||'Välj brottskategori';
  }
  function selectCategory(cat){
    select.value=String(cat.Brott_ID);
    selectedText();
    menu.classList.add('hidden');
    select.dispatchEvent(new Event('change',{bubbles:true}));
  }
  function branch(cat,level){
    const wrap=document.createElement('div');
    wrap.className='crime-branch';
    const children=byParent.get(String(Math.trunc(Number(cat.Brott_ID))))||[];
    const row=document.createElement('div');
    row.className='crime-tree-row';
    row.style.paddingLeft=((level-1)*16)+'px';

    if(children.length){
      const toggle=document.createElement('button');
      toggle.type='button';
      toggle.className='crime-tree-toggle';
      toggle.textContent='▸';
      const childBox=document.createElement('div');
      childBox.className='crime-tree-children hidden';
      toggle.addEventListener('click',e=>{
        e.stopPropagation();
        const opening=childBox.classList.contains('hidden');
        childBox.classList.toggle('hidden');
        toggle.textContent=opening?'▾':'▸';
      });
      row.appendChild(toggle);
      children.forEach(ch=>childBox.appendChild(branch(ch,level+1)));
      wrap.append(row,childBox);
    }else{
      const spacer=document.createElement('span');
      spacer.className='crime-tree-toggle-spacer';
      row.appendChild(spacer);
      wrap.append(row);
    }

    const label=document.createElement('button');
    label.type='button';
    label.className='crime-tree-label';
    label.textContent=cat.Brott+(cat.Upphört?' [upphört]':'');
    label.addEventListener('click',()=>selectCategory(cat));
    row.appendChild(label);
    return wrap;
  }

  const roots=byParent.get('ROOT')||[];
  roots.forEach(cat=>menu.appendChild(branch(cat,1)));
  selectedText();

  button.addEventListener('click',e=>{
    e.stopPropagation();
    document.querySelectorAll('.crime-tree-menu').forEach(m=>{
      if(m!==menu)m.classList.add('hidden');
    });
    menu.classList.toggle('hidden');
  });
  picker.addEventListener('click',e=>e.stopPropagation());
}

function setupCrimeTrees(){
  ['overviewCrime','trendCrime','mapCrime'].forEach(id=>buildCrimeTree(id));
  document.addEventListener('click',()=>document.querySelectorAll('.crime-tree-menu').forEach(m=>m.classList.add('hidden')));
}

function sqlStringList(values){
  return values.map(v=>"'"+esc(v)+"'").join(',');
}

function currentPageMunicipalities(page){
  if(page==='overview'){
    const municipality=el('overviewMunicipality').value;
    if(municipality && municipality!=='__ALL__')return [municipality];
    return filteredMunicipalityNames('overviewCounty','overviewSkrGroup');
  }
  if(page==='map'){
    return filteredMunicipalityNames('mapCounty','mapSkrGroup');
  }
  if(page==='trend'){
    const municipality=el('trendMunicipality').value;
    if(municipality && municipality!=='__ALL__')return [municipality];
    return filteredMunicipalityNames('trendCounty','trendSkrGroup');
  }
  return [];
}

async function availableCrimeIds(page){
  let files;
  if(page==='overview'){
    files="'"+parquetUrl(Number(el('overviewYear').value))+"'";
  }else if(page==='map'){
    const {start,end}=mapYearRange();
    files=parquetSqlForRange(start,end);
  }else{
    files=allParquetSql();
  }

  const municipalities=currentPageMunicipalities(page);
  const allMunicipalities=municipalities.length===MUNICIPAL_META.length;
  const municipalityWhere=(!municipalities.length || allMunicipalities)
    ? ''
    : ' AND "Kommun" IN ('+sqlStringList(municipalities)+')';

  const result=await query(`
    SELECT CAST("Brott_ID" AS INTEGER) AS crimeId
    FROM read_parquet(${files})
    WHERE "Antal">0${municipalityWhere}
    GROUP BY "Brott_ID"
    HAVING SUM(CAST("Antal" AS DOUBLE))>0
  `);
  return new Set(result.map(r=>String(r.crimeId)));
}

async function refreshCrimeTreeForPage(page){
  const selectId=page==='overview'?'overviewCrime':page==='map'?'mapCrime':'trendCrime';
  const select=el(selectId);
  const ids=await availableCrimeIds(page);
  const current=String(select.value);
  if(!ids.has(current)){
    const fallback=ids.has(String(META.default_crime_id))
      ? String(META.default_crime_id)
      : (CATEGORIES.find(cat=>ids.has(String(cat.Brott_ID)))?.Brott_ID ?? '');
    if(fallback!=='')select.value=String(fallback);
  }
  buildCrimeTree(selectId,ids);
}

function setupControls(){
  const cats=CATEGORIES.map(categoryOption);
  const mun=MUNICIPALITIES.map(x=>({value:x,text:x}));
  const years=META.available_years.slice().sort((a,b)=>b-a).map(y=>({value:String(y),text:String(y)}));
  const counties=[...new Set(MUNICIPAL_META.map(x=>x.Lan).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'sv'));
  const skrGroups=[...new Map(
    MUNICIPAL_META.filter(x=>x.SKR_Gruppkod).map(x=>[
      x.SKR_Gruppkod,
      x.SKR_Gruppkod+' – '+x.SKR_Kommungrupp
    ])
  ).entries()].sort((a,b)=>a[0].localeCompare(b[0],'sv'));
  ['overviewCrime','trendCrime','mapCrime'].forEach(id=>fillSelect(id,cats,META.default_crime_id));
  ['overviewMunicipality','trendMunicipality','changeMunicipality'].forEach(id=>fillSelect(id,mun,META.default_municipality));
  fillSelect('overviewYear',years,META.latest_year);
  const minYear=Math.min(...META.available_years);
  const maxYear=Math.max(...META.available_years);
  ['mapYearStart','mapYearEnd','profileYearStart','profileYearEnd'].forEach(id=>{
    el(id).min=String(minYear);
    el(id).max=String(maxYear);
    el(id).value=String(maxYear);
  });
  updateMapYearUi();
  updateProfileYearUi();
  if(el('changeBaseYear')){
    el('changeBaseYear').min=String(minYear);
    el('changeBaseYear').max=String(Math.max(minYear,maxYear-1));
    el('changeBaseYear').value=String(Math.max(minYear,maxYear-10));
    updateChangeYearUi();
  }
  const countyItems=[{value:'',text:'Alla län'},...counties.map(x=>({value:x,text:x}))];
  const skrItems=[{value:'',text:'Alla kommungrupper'},...skrGroups.map(([value,text])=>({value,text}))];
  fillSelect('mapCounty',countyItems,'');
  fillSelect('mapSkrGroup',skrItems,'');
  fillSelect('profileCounty',countyItems,'');
  fillSelect('profileSkrGroup',skrItems,'');
  fillSelect('overviewCounty',countyItems,'');
  fillSelect('overviewSkrGroup',skrItems,'');
  refreshOverviewMunicipalities();
  el('overviewMunicipality').value='__ALL__';
  el('overviewCrime').value=String(META.default_crime_id);
  el('overviewYear').value=String(META.latest_year);
  el('overviewCounty').value='';
  el('overviewSkrGroup').value='';
  el('overviewMetric').value='Per100000';
  fillSelect('trendCounty',countyItems,'');
  fillSelect('trendSkrGroup',skrItems,'');
  refreshTrendMunicipalities();
  refreshProfileMunicipalities();
  setupMunicipalitySearch();
  setupCrimeTrees();

  el('overviewMunicipality').addEventListener('change',async()=>{await refreshCrimeTreeForPage('overview');await renderOverview();});
  el('overviewCrime').addEventListener('change',renderOverview);
  el('overviewYear').addEventListener('change',async()=>{await refreshCrimeTreeForPage('overview');await renderOverview();});
  el('overviewMetric').addEventListener('change',renderOverview);
  el('overviewCounty').addEventListener('change',async()=>{refreshOverviewMunicipalities();await refreshCrimeTreeForPage('overview');await renderOverview();});
  el('overviewSkrGroup').addEventListener('change',async()=>{refreshOverviewMunicipalities();await refreshCrimeTreeForPage('overview');await renderOverview();});
  el('trendMunicipality').addEventListener('change',async()=>{await refreshCrimeTreeForPage('trend');await renderTrend();});
  el('trendCrime').addEventListener('change',renderTrend);
  el('trendMetric').addEventListener('change',renderTrend);
  el('trendCounty').addEventListener('change',async()=>{refreshTrendMunicipalities();await refreshCrimeTreeForPage('trend');await renderTrend();});
  el('trendSkrGroup').addEventListener('change',async()=>{refreshTrendMunicipalities();await refreshCrimeTreeForPage('trend');await renderTrend();});
  el('changeMunicipality').addEventListener('change',renderChangeRanking);
  el('changeMetric').addEventListener('change',renderChangeRanking);
  el('changeMode').addEventListener('change',renderChangeRanking);
  el('changeLevel').addEventListener('change',renderChangeRanking);
  el('changeBaseYear').addEventListener('input',()=>{updateChangeYearUi();renderChangeRanking(false);});
  el('changeBaseYear').addEventListener('change',()=>renderChangeRanking(true));
  el('mapYearStart').addEventListener('input',()=>handleMapYearRange('start',false));
  el('mapYearEnd').addEventListener('input',()=>handleMapYearRange('end',false));
  el('mapYearStart').addEventListener('change',()=>handleMapYearRange('start',true));
  el('mapYearEnd').addEventListener('change',()=>handleMapYearRange('end',true));
  el('mapCrime').addEventListener('change',renderMap);
  el('mapMetric').addEventListener('change',renderMap);
  el('mapCounty').addEventListener('change',async()=>{
    await refreshCrimeTreeForPage('map');
    await renderMap();
    scheduleMapFilterFit();
  });
  el('mapSkrGroup').addEventListener('change',async()=>{
    await refreshCrimeTreeForPage('map');
    await renderMap();
    scheduleMapFilterFit();
  });

  el('profileMunicipality').addEventListener('change',renderProfile);
  el('profileMetric').addEventListener('change',renderProfile);
  el('profileCounty').addEventListener('change',async()=>{refreshProfileMunicipalities();await renderProfile();});
  el('profileSkrGroup').addEventListener('change',async()=>{refreshProfileMunicipalities();await renderProfile();});
  el('profileYearStart').addEventListener('input',()=>handleProfileYearRange('start',false));
  el('profileYearEnd').addEventListener('input',()=>handleProfileYearRange('end',false));
  el('profileYearStart').addEventListener('change',()=>handleProfileYearRange('start',true));
  el('profileYearEnd').addEventListener('change',()=>handleProfileYearRange('end',true));

  ['legislationSearch','legislationDetail','legislationLevel','legislationStatus'].forEach(id=>{
    const control=el(id);
    if(!control)return;
    const eventName=id==='legislationSearch'?'input':'change';
    control.addEventListener(eventName,()=>renderLegislationTimeline(false));
  });
}

function setupTabs(){
  document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===btn));
    document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
    el('page-'+btn.dataset.page).classList.add('active');
    if(btn.dataset.page==='map'&&map)setTimeout(async()=>{
      map.invalidateSize(false);
      await renderMap();
      if(!mapInitialFitDone)fitMapToVisible();
    },60);
    if(btn.dataset.page==='profile')setTimeout(async()=>{
      await renderProfile();
    },20);
    if(btn.dataset.page==='change')setTimeout(async()=>{
      await renderChangeRanking();
    },20);
    if(btn.dataset.page==='legislation')setTimeout(async()=>{
      await renderLegislationTimeline();
    },20);
  }));
}

const METRIC_STYLES = {
  Antal: {line:'#2563eb', fill:'rgba(37,99,235,.15)', gradient:['#dbeafe','#60a5fa','#1e3a8a']},
  Per100000: {line:'#0f766e', fill:'rgba(15,118,110,.15)', gradient:['#ccfbf1','#2dd4bf','#134e4a']},
  RankAntal: {line:'#d97706', fill:'rgba(217,119,6,.15)', gradient:['#fef3c7','#f59e0b','#78350f']},
  RankPer100000: {line:'#7c3aed', fill:'rgba(124,58,237,.15)', gradient:['#ede9fe','#a78bfa','#4c1d95']},
  AvgAntal: {line:'#be123c', fill:'rgba(190,18,60,.15)', gradient:['#ffe4e6','#fb7185','#881337']},
  AvgPer100000: {line:'#0369a1', fill:'rgba(3,105,161,.15)', gradient:['#e0f2fe','#38bdf8','#0c4a6e']}
};

function metricInfo(metric){
  const isCount = metric === 'Antal' || metric === 'RankAntal' || metric === 'AvgAntal';
  const isRank = metric === 'RankAntal' || metric === 'RankPer100000';
  const isAverage = metric === 'AvgAntal' || metric === 'AvgPer100000';
  return {
    metric,
    isCount,
    isRank,
    isAverage,
    field: metric==='AvgAntal'?'avgCount'
      : metric==='AvgPer100000'?'avgRate'
      : isCount?'count':'rate',
    style: METRIC_STYLES[metric] || METRIC_STYLES.Per100000,
    label: metric === 'Antal' ? 'Antal brott'
      : metric === 'Per100000' ? 'Brott per 100 000 inv.'
      : metric === 'AvgAntal' ? 'Medelantal brott'
      : metric === 'AvgPer100000' ? 'Medelantal brott per 100 000'
      : metric === 'RankAntal' ? 'Placering efter antal'
      : 'Placering efter antal per 100 000'
  };
}

function addRanks(data){
  const rankField = (rows, field, outField) => {
    const valid = rows.filter(r=>Number.isFinite(Number(r[field])))
      .sort((a,b)=>Number(b[field])-Number(a[field]));
    let previous = null;
    let rank = 0;
    valid.forEach((row,i)=>{
      const value = Number(row[field]);
      if (previous === null || value !== previous) rank = i + 1;
      row[outField] = rank;
      previous = value;
    });
  };
  rankField(data,'count','rankCount');
  rankField(data,'rate','rankRate');
  return data;
}

async function trendRows(municipality,crimeId,metric,cohortNames=null){
  const info=metricInfo(metric);
  if(!info.isRank){
    return query(`
      SELECT CAST("År" AS INTEGER) AS year,
             CAST(MAX("Antal") AS DOUBLE) AS count,
             CAST(MAX("Per100000") AS DOUBLE) AS rate
      FROM read_parquet(${allParquetSql()})
      WHERE "Kommun"='${esc(municipality)}'
        AND "Brott_ID"=${Number(crimeId)}
        AND "Antal">-555
      GROUP BY "År"
      ORDER BY "År"
    `);
  }

  let all=await query(`
    SELECT CAST("År" AS INTEGER) AS year,
           "Kommun",
           CAST("Antal" AS DOUBLE) AS count,
           CAST("Per100000" AS DOUBLE) AS rate
    FROM read_parquet(${allParquetSql()})
    WHERE "Brott_ID"=${Number(crimeId)}
      AND "Antal">-555
    ORDER BY "År"
  `);
  if(cohortNames){
    const cohort=new Set(cohortNames);
    all=all.filter(r=>cohort.has(r.Kommun));
  }
  const grouped=new Map();
  all.forEach(row=>{
    if(!grouped.has(row.year)) grouped.set(row.year,[]);
    grouped.get(row.year).push(row);
  });
  const out=[];
  for(const [year,rowsForYear] of grouped){
    addRanks(rowsForYear);
    const row=rowsForYear.find(r=>r.Kommun===municipality);
    if(row){
      out.push({
        year:Number(year),
        count:row.count,
        rate:row.rate,
        rankCount:row.rankCount,
        rankRate:row.rankRate
      });
    }
  }
  return out.sort((x,y)=>x.year-y.year);
}

function addMetricRank(rows,metric){
  const valid=rows
    .filter(r=>Number.isFinite(Number(metricValue(r,metric))))
    .sort((a,b)=>Number(metricValue(b,metric))-Number(metricValue(a,metric)));
  let previous=null;
  let rank=0;
  valid.forEach((row,i)=>{
    const value=Number(metricValue(row,metric));
    if(previous===null || value!==previous)rank=i+1;
    row.metricRank=rank;
    previous=value;
  });
  return valid;
}

function metricValue(row,metric){
  if(!row)return null;
  if(metric==='Antal')return row.count;
  if(metric==='Per100000')return row.rate;
  if(metric==='RankAntal')return row.rankCount;
  if(metric==='RankPer100000')return row.rankRate;
  if(metric==='AvgAntal')return row.avgCount;
  if(metric==='AvgPer100000')return row.avgRate;
  return null;
}

function drawLine(id,data,metric,label,municipality=null){
  const info=metricInfo(metric);
  const highlight=municipality?municipalityHighlight(municipality):null;
  const lineColor=highlight?.line || info.style.line;
  const fillColor=highlight?.soft || info.style.fill;
  destroyChart(id);
  charts[id]=new Chart(el(id),{
    type:'line',
    data:{labels:data.map(r=>r.year),datasets:[{
      label,
      data:data.map(r=>metricValue(r,metric)),
      borderColor:lineColor,
      backgroundColor:fillColor,
      borderWidth:2,
      pointRadius:2,
      pointBackgroundColor:lineColor,
      tension:.18,
      fill:info.isRank?'end':'origin'
    }]},
    options:{
      responsive:true,
      maintainAspectRatio:false,
      interaction:{mode:'index',intersect:false},
      plugins:{legend:{display:false}},
      scales:{
        x:{grid:{display:false}},
        y:{
          beginAtZero:false,
          reverse:info.isRank,
          suggestedMin:info.isRank?1:undefined,
          title:{display:true,text:label},
          ticks:info.isRank
            ? {precision:0}
            : info.isAverage
              ? {callback:value=>fmtAverage(value)}
              : undefined
        }
      }
    }
  });
}

async function renderTrend(){
  setLoading('Laddar trend…');
  try{
    const municipality=el('trendMunicipality').value;
    const crimeId=el('trendCrime').value;
    const metric=el('trendMetric').value;
    const cohort=filteredMunicipalityNames('trendCounty','trendSkrGroup');
    const category=CATEGORIES.find(c=>String(c['Brott_ID'])===crimeId);
    const info=metricInfo(metric);
    const county=el('trendCounty').value;
    const skr=el('trendSkrGroup').value;
    const scope=[county,skr].filter(Boolean).join(' · ');

    if(municipality==='__ALL__'){
      const data=await allTrendRows(crimeId,metric,cohort);
      el('trendTitle').textContent='Alla kommuner – '+(category?.Brott||'Brott')+(scope?' · '+scope:'');
      drawAllTrends('trendChart',data,metric,info.label);
    }else{
      const data=await trendRows(municipality,crimeId,metric,cohort);
      el('trendTitle').textContent=municipality+' – '+(category?.Brott||'Brott')+(scope?' · '+scope:'');
      drawLine('trendChart',data,metric,info.label,municipality);
    }
  }finally{setLoading(null);}
}

function updateChangeYearUi(){
  const slider=el('changeBaseYear');
  if(!slider)return;
  const base=Number(slider.value);
  const latest=Number(META.latest_year);
  const windowYears=Math.max(0,latest-base);
  if(el('changeYearPeriod'))el('changeYearPeriod').textContent=base+'–'+latest;
  if(el('changeWindowText'))el('changeWindowText').textContent=windowYears+' år';
}

async function changeRankingRows(municipality,baseYear,latestYear,level,metric){
  const field=metric==='Antal' ? 'Antal' : 'Per100000';
  const rows=await query(`
    SELECT CAST("År" AS INTEGER) AS year,
           CAST("Brott_ID" AS INTEGER) AS crimeId,
           CAST("${field}" AS DOUBLE) AS value,
           CAST("Antal" AS DOUBLE) AS count
    FROM read_parquet(['${parquetUrl(baseYear)}','${parquetUrl(latestYear)}'])
    WHERE "Kommun"='${esc(municipality)}'
      AND "Antal">-555
      AND "Brott_ID"<>${Number(META.default_crime_id)}
      AND CAST("År" AS INTEGER) IN (${Number(baseYear)},${Number(latestYear)})
  `);

  const byCrime=new Map();
  for(const row of rows){
    const cat=CATEGORIES.find(c=>String(c.Brott_ID)===String(row.crimeId));
    if(!cat || Number(cat['Brottsnivå'])!==Number(level))continue;
    if(!byCrime.has(String(row.crimeId))){
      byCrime.set(String(row.crimeId),{
        crimeId:Number(row.crimeId),
        category:legislationDisplayLabel(row.crimeId,cat.Brott),
        fullCategory:String(cat.Brott),
        level:Number(cat['Brottsnivå']),
        base:null,
        latest:null,
        baseCount:null,
        latestCount:null
      });
    }
    const item=byCrime.get(String(row.crimeId));
    if(Number(row.year)===Number(baseYear)){
      item.base=Number(row.value);
      item.baseCount=Number(row.count);
    }
    if(Number(row.year)===Number(latestYear)){
      item.latest=Number(row.value);
      item.latestCount=Number(row.count);
    }
  }

  return [...byCrime.values()]
    .filter(r=>Number.isFinite(r.base) && Number.isFinite(r.latest) && r.base>=0 && r.latest>=0)
    .map(r=>({
      ...r,
      absoluteChange:r.latest-r.base,
      percentChange:r.base>0 ? (r.latest-r.base)/r.base*100 : null
    }));
}

function drawChangeRankingChart(id,rows,mode,metric,title){
  destroyChart(id);
  const isPercent=mode==='percent';
  const values=rows.map(r=>isPercent?r.percentChange:r.absoluteChange);
  const labels=rows.map(r=>r.category);
  const unit=metric==='Antal'?'brott':'per 100 000';

  charts[id]=new Chart(el(id),{
    type:'bar',
    data:{
      labels,
      datasets:[{
        label:title,
        data:values,
        backgroundColor:rows.map(r=>r._direction==='increase'?'rgba(190,24,93,.72)':'rgba(15,118,110,.72)'),
        borderColor:rows.map(r=>r._direction==='increase'?'rgb(190,24,93)':'rgb(15,118,110)'),
        borderWidth:1,
        borderRadius:4
      }]
    },
    options:{
      indexAxis:'y',
      responsive:true,
      maintainAspectRatio:false,
      animation:false,
      plugins:{
        legend:{display:false},
        tooltip:{
          titleFont:{size:15,weight:'700'},
          bodyFont:{size:14},
          padding:12,
          titleSpacing:4,
          bodySpacing:5,
          callbacks:{
            title:items=>rows[items[0].dataIndex]?.fullCategory||items[0].label,
            label:ctx=>{
              const r=rows[ctx.dataIndex];
              const change=isPercent ? fmt1.format(r.percentChange)+' %' : fmt1.format(r.absoluteChange)+' '+unit;
              const base=metric==='Antal'?fmt0.format(r.base):fmt1.format(r.base);
              const latest=metric==='Antal'?fmt0.format(r.latest):fmt1.format(r.latest);
              return [
                'Förändring: '+change,
                'Basår: '+base+' '+unit,
                'Senaste år: '+latest+' '+unit
              ];
            }
          }
        }
      },
      scales:{
        x:{
          title:{display:true,text:isPercent?'Förändring (%)':'Förändring ('+unit+')'},
          grid:{color:'rgba(148,163,184,.18)'}
        },
        y:{
          grid:{display:false},
          ticks:{
            autoSkip:false,
            font:{size:12}
          }
        }
      }
    }
  });
}

async function renderChangeRanking(showLoading=true){
  if(!el('changeIncreaseChart') || !el('changeDecreaseChart'))return;
  if(showLoading)setLoading('Beräknar förändring per brottskategori…');
  try{
    const municipality=el('changeMunicipality').value;
    const metric=el('changeMetric').value;
    const mode=el('changeMode').value;
    const level=Number(el('changeLevel').value);
    const baseYear=Number(el('changeBaseYear').value);
    const latestYear=Number(META.latest_year);
    const rows=await changeRankingRows(municipality,baseYear,latestYear,level,metric);

    const usable=rows.filter(r=>mode==='percent'?Number.isFinite(r.percentChange):Number.isFinite(r.absoluteChange));
    const increases=usable
      .filter(r=>(mode==='percent'?r.percentChange:r.absoluteChange)>0)
      .sort((a,b)=>(mode==='percent'?b.percentChange-a.percentChange:b.absoluteChange-a.absoluteChange))
      .slice(0,10)
      .map(r=>({...r,_direction:'increase'}));
    const decreases=usable
      .filter(r=>(mode==='percent'?r.percentChange:r.absoluteChange)<0)
      .sort((a,b)=>(mode==='percent'?a.percentChange-b.percentChange:a.absoluteChange-b.absoluteChange))
      .slice(0,10)
      .map(r=>({...r,_direction:'decrease'}));

    const metricText=metric==='Antal'?'antal brott':'brott per 100 000 invånare';
    const modeText=mode==='percent'?'procentuell förändring':'absolut förändring';
    const period=baseYear+'–'+latestYear;

    el('changeIncreaseTitle').textContent='Störst ökning – '+municipality;
    el('changeDecreaseTitle').textContent='Störst minskning – '+municipality;
    el('changeIncreaseStatus').textContent='Top 10 · '+period+' · '+metricText+' · '+modeText+' · nivå '+level;
    el('changeDecreaseStatus').textContent='Top 10 · '+period+' · '+metricText+' · '+modeText+' · nivå '+level;

    drawChangeRankingChart('changeIncreaseChart',increases,mode,metric,'Ökning');
    drawChangeRankingChart('changeDecreaseChart',decreases,mode,metric,'Minskning');
  }catch(err){
    console.error(err);
    if(el('changeIncreaseStatus'))el('changeIncreaseStatus').textContent='Fel: '+String(err.message||err);
    if(el('changeDecreaseStatus'))el('changeDecreaseStatus').textContent='Fel: '+String(err.message||err);
  }finally{
    if(showLoading)setLoading(null);
  }
}

function filteredMunicipalityNames(countyId,skrId){
  const county=el(countyId)?.value || '';
  const skr=el(skrId)?.value || '';
  return MUNICIPAL_META
    .filter(x=>(!county || x.Lan===county) && (!skr || x.SKR_Gruppkod===skr))
    .map(x=>x.Kommun);
}

function refreshOverviewMunicipalities(){
  const current=el('overviewMunicipality').value;
  const names=filteredMunicipalityNames('overviewCounty','overviewSkrGroup')
    .sort((a,b)=>a.localeCompare(b,'sv'));
  const items=[{value:'__ALL__',text:'Alla'},...names.map(x=>({value:x,text:x}))];
  const selected=(current && items.some(i=>i.value===current)) ? current : '__ALL__';
  fillSelect('overviewMunicipality',items,selected);
}

function refreshTrendMunicipalities(){
  const current=el('trendMunicipality').value;
  const names=filteredMunicipalityNames('trendCounty','trendSkrGroup')
    .sort((a,b)=>a.localeCompare(b,'sv'));
  const items=[{value:'__ALL__',text:'Alla'},...names.map(x=>({value:x,text:x}))];
  const selected=(current && items.some(i=>i.value===current)) ? current : '__ALL__';
  fillSelect('trendMunicipality',items,selected);
}

function refreshProfileMunicipalities(){
  const current=el('profileMunicipality')?.value || '__ALL__';
  const names=filteredMunicipalityNames('profileCounty','profileSkrGroup')
    .sort((a,b)=>a.localeCompare(b,'sv'));
  const items=[{value:'__ALL__',text:'Alla'},...names.map(x=>({value:x,text:x}))];
  const selected=(current && items.some(i=>i.value===current)) ? current : '__ALL__';
  fillSelect('profileMunicipality',items,selected);
}

function drawFunnel(id,data,metric,selectedMunicipality){
  const info=metricInfo(metric);
  destroyChart(id);

  const ranked=data
    .filter(r=>{
      const value=Number(metricValue(r,metric));
      const count=Number(r.count ?? 0);
      return Number.isFinite(value) && Number.isFinite(count) && count>0;
    })
    .slice()
    .sort((x,y)=>info.isRank
      ? Number(metricValue(x,metric))-Number(metricValue(y,metric))
      : Number(metricValue(y,metric))-Number(metricValue(x,metric)));

  let shown;
  if(selectedMunicipality==='__ALL__'){
    shown=ranked;
  }else{
    shown=ranked.filter((r,i)=>
      i<15 ||
      r.Kommun===selectedMunicipality ||
      municipalityHighlight(r.Kommun)
    );
  }

  const n=Math.max(shown.length,1);
  const values=shown.map(r=>Number(metricValue(r,metric)));
  const maxValue=Math.max(...values,0);
  const capSize=maxValue>0 ? maxValue*0.035 : 1;

  const mainColors=shown.map(r=>{
    const h=municipalityHighlight(r.Kommun);
    if(h)return h.soft;
    if(selectedMunicipality!=='__ALL__' && r.Kommun===selectedMunicipality)return info.style.line;
    return info.style.fill;
  });
  const borderColors=shown.map(r=>{
    const h=municipalityHighlight(r.Kommun);
    return h?.line || info.style.line;
  });
  const capData=shown.map(r=>municipalityHighlight(r.Kommun)?capSize:0);
  const capColors=shown.map(r=>municipalityHighlight(r.Kommun)?.line || 'rgba(0,0,0,0)');

  const barPct=n<=6 ? .72 : n<=20 ? .78 : n<=80 ? .86 : .96;
  const catPct=n<=6 ? .82 : n<=20 ? .88 : n<=80 ? .92 : 1;

  charts[id]=new Chart(el(id),{
    type:'bar',
    data:{
      labels:shown.map(r=>r.Kommun),
      datasets:[
        {
          label:'Värde',
          data:values,
          backgroundColor:mainColors,
          borderColor:borderColors,
          borderWidth:n>120 ? .4 : 1,
          borderRadius:n>80 ? 0 : 3,
          barPercentage:barPct,
          categoryPercentage:catPct,
          maxBarThickness:n<=6 ? 120 : n<=20 ? 70 : undefined,
          stack:'total'
        },
        {
          label:'Markering',
          data:capData,
          backgroundColor:capColors,
          borderColor:capColors,
          borderWidth:0,
          barPercentage:barPct,
          categoryPercentage:catPct,
          maxBarThickness:n<=6 ? 120 : n<=20 ? 70 : undefined,
          stack:'total'
        }
      ]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      animation:false,
      layout:{padding:{bottom:n<=20 ? 24 : 14}},
      plugins:{
        legend:{display:false},
        tooltip:{
          filter:ctx=>ctx.datasetIndex===0,
          callbacks:{
            label:ctx=>{
              const value=ctx.raw;
              return info.isRank
                ? 'Placering '+fmt0.format(value)+' av '+ranked.length
                : info.isAverage
                  ? fmtAverage(value)+(info.isCount?' brott':' per 100 000')
                  : info.isCount
                    ? fmt0.format(value)+' brott'
                    : fmt1.format(value)+' per 100 000';
            }
          }
        }
      },
      scales:{
        x:{
          stacked:true,
          grid:{display:false},
          ticks:{
            autoSkip:n>20,
            maxRotation:n<=12 ? 0 : n<=35 ? 45 : 90,
            minRotation:n<=12 ? 0 : n<=35 ? 45 : 90,
            padding:10,
            font:{size:n>100 ? 8 : n>40 ? 9 : 11}
          }
        },
        y:{
          stacked:true,
          beginAtZero:!info.isRank,
          reverse:info.isRank,
          suggestedMin:info.isRank?1:undefined,
          ticks:info.isRank?{precision:0}:undefined
        }
      }
    }
  });
}

async function renderOverview(){
  setLoading('Laddar översikt…');
  try{
    const municipality=el('overviewMunicipality').value;
    const crimeId=el('overviewCrime').value;
    const year=Number(el('overviewYear').value);
    const metric=el('overviewMetric').value;
    const info=metricInfo(metric);
    const visibleNames=new Set(filteredMunicipalityNames('overviewCounty','overviewSkrGroup'));
    const file="'"+parquetUrl(year)+"'";
    let data=await query(`
      SELECT "Kommun",
             CAST("Antal" AS DOUBLE) AS count,
             CAST("Per100000" AS DOUBLE) AS rate
      FROM read_parquet(${file})
      WHERE "Brott_ID"=${Number(crimeId)} AND "Antal">-555
    `);
    data=data.filter(r=>visibleNames.has(r.Kommun));
    addRanks(data);
    const chosen=municipality==='__ALL__'?null:data.find(r=>r.Kommun===municipality);
    const rankValue=chosen?(info.isCount?chosen.rankCount:chosen.rankRate):null;
    const rankedCount=data.filter(r=>Number.isFinite(Number(info.isCount?r.count:r.rate))).length;
    el('cardCount').textContent=chosen?fmt0.format(chosen.count):'–';
    el('cardRate').textContent=chosen&&chosen.rate!=null?fmt1.format(chosen.rate):'–';
    el('cardRankLabel').textContent=info.isCount?'Placering efter antal':'Placering per 100 000';
    el('cardRank').textContent=rankValue?rankValue+' av '+rankedCount:'–';
    el('cardCoverage').textContent=String(data.length);

    const county=el('overviewCounty').value;
    const skr=el('overviewSkrGroup').value;
    const scope=[county,skr].filter(Boolean).join(' · ') || 'Sverige';
    el('overviewChartTitle').textContent='Kommunjämförelse – '+scope;
    drawFunnel('overviewChart',data,metric,municipality);
  }finally{setLoading(null);}
}

function hexToRgb(hex){
  const h=hex.replace('#','');
  return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];
}
function rgbToHex(rgb){
  return '#'+rgb.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
}
function mixHex(a,b,t){
  const ra=hexToRgb(a), rb=hexToRgb(b);
  return rgbToHex(ra.map((v,i)=>v+(rb[i]-v)*t));
}
function continuousColor(value,min,max,metric){
  if(!Number.isFinite(value))return '#e5e7eb';
  const info=metricInfo(metric);
  let t=max===min ? .5 : (value-min)/(max-min);
  t=Math.max(0,Math.min(1,t));
  if(info.isRank)t=1-t;
  const [low,mid,high]=info.style.gradient;
  return t<=.5?mixHex(low,mid,t*2):mixHex(mid,high,(t-.5)*2);
}
function continuousLegendHtml(values,metric){
  const valid=values.filter(Number.isFinite);
  if(!valid.length)return '';
  const min=Math.min(...valid), max=Math.max(...valid), mid=(min+max)/2;
  const info=metricInfo(metric);
  const [low,midColor,high]=info.style.gradient;
  const colors=info.isRank?[high,midColor,low]:[low,midColor,high];
  const fmt=v=>info.isRank
    ? fmt0.format(v)
    : info.isAverage
      ? fmtAverage(v)
      : ((metric==='Antal')?fmt0.format(v):fmt1.format(v));
  const suffix=(metric==='Per100000'||metric==='AvgPer100000')?' /100 000':'';
  return '<div class="gradient-legend" style="background:linear-gradient(90deg,'+colors.join(',')+')"></div>'+
    '<div class="gradient-labels"><span>'+fmt(min)+suffix+'</span><span>'+fmt(mid)+suffix+'</span><span>'+fmt(max)+suffix+'</span></div>';
}

function profileYearRange(){
  let start=Number(el('profileYearStart').value);
  let end=Number(el('profileYearEnd').value);
  if(start>end)[start,end]=[end,start];
  return {start,end,multi:start!==end};
}

function updateProfileYearUi(){
  const {start,end,multi}=profileYearRange();
  el('profileYearStartLabel').textContent=String(start);
  el('profileYearEndLabel').textContent=String(end);
  el('profileYearPeriod').textContent=multi ? start+'–'+end : String(start);

  const min=Number(el('profileYearStart').min);
  const max=Number(el('profileYearStart').max);
  const span=Math.max(1,max-min);
  const left=((start-min)/span)*100;
  const right=((end-min)/span)*100;
  const control=el('profileYearControl');
  control.style.setProperty('--range-left',left+'%');
  control.style.setProperty('--range-right',right+'%');

  const metric=el('profileMetric');
  const countOpt=metric.querySelector('option[value="Antal"]');
  const rateOpt=metric.querySelector('option[value="Per100000"]');
  const avgCountOpt=metric.querySelector('option[value="AvgAntal"]');
  const avgRateOpt=metric.querySelector('option[value="AvgPer100000"]');
  countOpt.textContent=multi?'Summa brott':'Antal brott';
  rateOpt.textContent=multi?'Summa antal brott per 100 000':'Antal brott per 100 000';
  [avgCountOpt,avgRateOpt].forEach(opt=>{
    opt.hidden=!multi;
    opt.disabled=!multi;
  });
  if(!multi && (metric.value==='AvgAntal'||metric.value==='AvgPer100000')){
    metric.value=metric.value==='AvgAntal'?'Antal':'Per100000';
  }
}

function handleProfileYearRange(which,shouldRender){
  let start=Number(el('profileYearStart').value);
  let end=Number(el('profileYearEnd').value);
  if(start>end){
    if(which==='start'){
      end=start;el('profileYearEnd').value=String(end);
    }else{
      start=end;el('profileYearStart').value=String(start);
    }
  }
  updateProfileYearUi();
  if(shouldRender)renderProfile();
}

function mapYearRange(){
  let start=Number(el('mapYearStart').value);
  let end=Number(el('mapYearEnd').value);
  if(start>end)[start,end]=[end,start];
  return {start,end,multi:start!==end};
}

function updateMapYearUi(){
  const {start,end,multi}=mapYearRange();
  el('mapYearStartLabel').textContent=String(start);
  el('mapYearEndLabel').textContent=String(end);
  const period=el('mapYearPeriod');
  if(period)period.textContent=multi ? start+'–'+end : String(start);

  const min=Number(el('mapYearStart').min);
  const max=Number(el('mapYearStart').max);
  const span=Math.max(1,max-min);
  const left=((start-min)/span)*100;
  const right=((end-min)/span)*100;
  const control=el('mapYearControl');
  if(control){
    control.style.setProperty('--range-left',left+'%');
    control.style.setProperty('--range-right',right+'%');
  }

  const select=el('mapMetric');
  const countOpt=select.querySelector('option[value="Antal"]');
  const rateOpt=select.querySelector('option[value="Per100000"]');
  const avgCountOpt=select.querySelector('option[value="AvgAntal"]');
  const avgRateOpt=select.querySelector('option[value="AvgPer100000"]');

  countOpt.textContent=multi?'Summa brott':'Antal brott';
  rateOpt.textContent=multi?'Summa antal brott per 100 000':'Antal brott per 100 000';
  [avgCountOpt,avgRateOpt].forEach(opt=>{
    opt.hidden=!multi;
    opt.disabled=!multi;
  });
  if(!multi && (select.value==='AvgAntal' || select.value==='AvgPer100000')){
    select.value=select.value==='AvgAntal'?'Antal':'Per100000';
  }
}

function handleMapYearRange(which,shouldRender){
  let start=Number(el('mapYearStart').value);
  let end=Number(el('mapYearEnd').value);
  if(start>end){
    if(which==='start'){
      end=start;
      el('mapYearEnd').value=String(end);
    }else{
      start=end;
      el('mapYearStart').value=String(start);
    }
  }
  updateMapYearUi();
  if(shouldRender)(async()=>{await refreshCrimeTreeForPage('map');await renderMap();})();
}

function parquetSqlForRange(start,end){
  const years=META.available_years.filter(y=>y>=start && y<=end);
  return '['+years.map(y=>"'"+parquetUrl(y)+"'").join(',')+']';
}

async function allTrendRows(crimeId,metric,cohortNames){
  let all=await query(`
    SELECT CAST("År" AS INTEGER) AS year,
           "Kommun",
           CAST("Antal" AS DOUBLE) AS count,
           CAST("Per100000" AS DOUBLE) AS rate
    FROM read_parquet(${allParquetSql()})
    WHERE "Brott_ID"=${Number(crimeId)}
      AND "Antal">-555
    ORDER BY "År","Kommun"
  `);
  const cohort=new Set(cohortNames||[]);
  all=all.filter(r=>cohort.has(r.Kommun));
  if(metric==='RankAntal' || metric==='RankPer100000'){
    const grouped=new Map();
    all.forEach(row=>{
      if(!grouped.has(row.year))grouped.set(row.year,[]);
      grouped.get(row.year).push(row);
    });
    grouped.forEach(rowsForYear=>addRanks(rowsForYear));
  }
  return all;
}

function drawAllTrends(id,data,metric,label){
  const info=metricInfo(metric);
  destroyChart(id);
  const years=[...new Set(data.map(r=>Number(r.year)))].sort((x,y)=>x-y);
  const names=[...new Set(data.map(r=>r.Kommun))].sort((x,y)=>x.localeCompare(y,'sv'));
  const byKey=new Map(data.map(r=>[r.Kommun+'|'+r.year,r]));
  const datasets=names.map(name=>{
    const h=municipalityHighlight(name);
    return {
      label:name,
      data:years.map(year=>metricValue(byKey.get(name+'|'+year),metric)),
      borderColor:h?.line || (info.style.line+'55'),
      backgroundColor:'transparent',
      borderWidth:h ? (h.kind==='norrbotten'?1.8:2.4) : 1,
      pointRadius:0,
      tension:.12,
      fill:false,
      spanGaps:true
    };
  });
  charts[id]=new Chart(el(id),{
    type:'line',
    data:{labels:years,datasets},
    options:{
      responsive:true,
      maintainAspectRatio:false,
      animation:false,
      interaction:{mode:'nearest',intersect:false},
      plugins:{legend:{display:false}},
      scales:{
        x:{grid:{display:false}},
        y:{
          beginAtZero:false,
          reverse:info.isRank,
          suggestedMin:info.isRank?1:undefined,
          title:{display:true,text:label},
          ticks:info.isRank?{precision:0}:undefined
        }
      }
    }
  });
}

function initMap(){
  map=L.map('crimeMap',{zoomControl:true,minZoom:3,maxZoom:19}).setView([62.2,16.5],5);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxNativeZoom:19,
    maxZoom:19,
    attribution:'&copy; OpenStreetMap contributors'
  }).addTo(map);
}

function municipalityMeta(name){
  return MUNICIPAL_META.find(x=>x.Kommun===name);
}

function defaultMunicipalityFocus(name){
  if(name==='Luleå')return {color:'#dc2626',kind:'lulea'};
  if(name==='Boden')return {color:'#d4a800',kind:'boden'};
  const meta=municipalityMeta(name);
  if(meta?.Lan==='Norrbottens län')return {color:'#6b7280',kind:'norrbotten'};
  return null;
}

function hexToRgba(hex,alpha=.22){
  const raw=String(hex||'').replace('#','');
  if(!/^[0-9a-fA-F]{6}$/.test(raw))return 'rgba(107,114,128,'+alpha+')';
  const r=parseInt(raw.slice(0,2),16);
  const g=parseInt(raw.slice(2,4),16);
  const b=parseInt(raw.slice(4,6),16);
  return 'rgba('+r+','+g+','+b+','+alpha+')';
}

function municipalityFocusState(name){
  if(focusColorOverrides.has(name)){
    const value=focusColorOverrides.get(name);
    if(!value)return null;
    return {color:value,kind:'custom'};
  }
  return defaultMunicipalityFocus(name);
}

function municipalityHighlight(name){
  const state=municipalityFocusState(name);
  if(!state)return null;
  return {
    line:state.color,
    fill:state.color,
    soft:hexToRgba(state.color,state.kind==='norrbotten'?.24:.22),
    kind:state.kind
  };
}

function loadFocusColorOverrides(){
  try{
    const raw=JSON.parse(localStorage.getItem(FOCUS_COLOR_STORAGE)||'{}');
    Object.entries(raw).forEach(([name,value])=>{
      if(value===null || /^#[0-9a-fA-F]{6}$/.test(String(value))){
        focusColorOverrides.set(name,value);
      }
    });
  }catch{}
}

function saveFocusColorOverrides(){
  try{
    localStorage.setItem(FOCUS_COLOR_STORAGE,JSON.stringify(Object.fromEntries(focusColorOverrides)));
  }catch{}
}

function activePageName(){
  return document.querySelector('.page.active')?.id?.replace(/^page-/,'')||'overview';
}

function refreshMapFocusStyles(){
  if(!geoLayer)return;
  geoLayer.eachLayer(layer=>{
    const name=layer?.feature?.properties?.Kommun;
    if(!name)return;
    const h=municipalityHighlight(name);
    const noCrime=Number(layer.options?.fillOpacity||0)<=0;
    layer.setStyle({
      color:noCrime?'transparent':(h?.line||'#aab2bd'),
      weight:noCrime?0:(h?(h.kind==='norrbotten'?1.7:3):0.7),
      opacity:noCrime?0:1
    });
  });
}

async function rerenderFocusSensitiveView(){
  const page=activePageName();
  if(page==='overview')await renderOverview();
  else if(page==='trends')await renderTrend();
  else if(page==='map')refreshMapFocusStyles();
}

function setupFocusColorPicker(){
  const button=el('focusColorButton');
  const menu=el('focusColorMenu');
  const search=el('focusColorSearch');
  const list=el('focusColorList');
  const clearAll=el('focusColorClearAll');
  const resetAll=el('focusColorResetAll');
  if(!button||!menu||!search||!list)return;

  const defaultInactiveColor='#2563eb';

  const render=()=>{
    const q=search.value.trim().toLocaleLowerCase('sv-SE');
    const names=(MUNICIPALITIES||[])
      .filter(name=>!q||name.toLocaleLowerCase('sv-SE').includes(q))
      .sort((a,b)=>{
        const af=municipalityFocusState(a)?0:1;
        const bf=municipalityFocusState(b)?0:1;
        if(af!==bf)return af-bf;
        return a.localeCompare(b,'sv-SE');
      });

    list.innerHTML='';
    names.forEach(name=>{
      const state=municipalityFocusState(name);
      const def=defaultMunicipalityFocus(name);

      const row=document.createElement('div');
      row.className='focus-color-row';

      const label=document.createElement('span');
      label.className='focus-color-name';
      label.textContent=name;

      const controls=document.createElement('div');
      controls.className='focus-color-row-controls';

      const swatch=document.createElement('button');
      swatch.type='button';
      swatch.className='focus-color-swatch'+(state?' active':' inactive');
      swatch.title=state?'Ändra färg för '+name:'Välj fokusfärg för '+name;
      swatch.setAttribute('aria-label',swatch.title);
      if(state)swatch.style.setProperty('--focus-swatch',state.color);

      const color=document.createElement('input');
      color.type='color';
      color.className='focus-color-input';
      color.value=state?.color||defaultInactiveColor;
      color.tabIndex=-1;
      color.setAttribute('aria-label','Färg för '+name);

      swatch.addEventListener('click',()=>color.click());
      color.addEventListener('input',()=>{
        focusColorOverrides.set(name,color.value);
        saveFocusColorOverrides();
        swatch.classList.remove('inactive');
        swatch.classList.add('active');
        swatch.style.setProperty('--focus-swatch',color.value);
      });
      color.addEventListener('change',async()=>{
        focusColorOverrides.set(name,color.value);
        saveFocusColorOverrides();
        render();
        await rerenderFocusSensitiveView();
      });

      controls.append(swatch,color);

      if(focusColorOverrides.has(name)){
        const reset=document.createElement('button');
        reset.type='button';
        reset.className='focus-color-reset';
        reset.textContent='Återställ';
        reset.title=def?'Återställ standardfärg':'Ta bort fokusfärg';
        reset.addEventListener('click',async()=>{
          focusColorOverrides.delete(name);
          saveFocusColorOverrides();
          render();
          await rerenderFocusSensitiveView();
        });
        controls.appendChild(reset);
      }

      row.append(label,controls);
      list.appendChild(row);
    });

    if(!names.length){
      const empty=document.createElement('div');
      empty.className='focus-color-empty';
      empty.textContent='Ingen kommun hittades';
      list.appendChild(empty);
    }
  };

  button.addEventListener('click',e=>{
    e.stopPropagation();
    const opening=menu.classList.contains('hidden');
    menu.classList.toggle('hidden',!opening);
    button.setAttribute('aria-expanded',opening?'true':'false');
    if(opening){
      render();
      requestAnimationFrame(()=>search.focus());
    }
  });
  menu.addEventListener('click',e=>e.stopPropagation());
  search.addEventListener('input',render);
  search.addEventListener('keydown',e=>{
    if(e.key==='Escape'){
      menu.classList.add('hidden');
      button.setAttribute('aria-expanded','false');
      button.focus();
    }
  });
  clearAll?.addEventListener('click',async()=>{
    focusColorOverrides.clear();
    (MUNICIPALITIES||[]).forEach(name=>focusColorOverrides.set(name,null));
    saveFocusColorOverrides();
    render();
    await rerenderFocusSensitiveView();
  });
  resetAll?.addEventListener('click',async()=>{
    focusColorOverrides.clear();
    saveFocusColorOverrides();
    render();
    await rerenderFocusSensitiveView();
  });
  document.addEventListener('click',()=>{
    menu.classList.add('hidden');
    button.setAttribute('aria-expanded','false');
  });
}

function mapFilterNames(){
  return new Set(filteredMunicipalityNames('mapCounty','mapSkrGroup'));
}

function swedenBounds(){
  const layer=L.geoJSON(GEO);
  return layer.getBounds();
}

function latitudeOffsetForMeters(meters){
  const earthRadius=6371008.8;
  return (Number(meters||0)/earthRadius)*(180/Math.PI);
}

function swedenDisplayBounds(){
  const bounds=swedenBounds();
  if(!bounds || !bounds.isValid())return bounds;
  const marginLat=latitudeOffsetForMeters(10000);
  return L.latLngBounds(
    [bounds.getSouth()-marginLat,bounds.getWest()],
    [bounds.getNorth()+marginLat,bounds.getEast()]
  );
}

function boundsForMunicipalities(names){
  if(!names || !names.size)return null;
  const layer=L.geoJSON(GEO,{filter:f=>names.has(f.properties.Kommun)});
  const bounds=layer.getBounds();
  return bounds && bounds.isValid()?bounds:null;
}

function fitMapToVisible({force=false}={}){
  if(!map)return;
  if(mapInitialFitDone&&!force)return;
  const bounds=swedenDisplayBounds();
  if(bounds && bounds.isValid()){
    map.invalidateSize(false);
    map.fitBounds(bounds,{padding:[8,8],animate:false});
    mapInitialFitDone=true;
  }
}

function fitMapToCurrentFilter(){
  if(!map)return;
  const county=String(el('mapCounty')?.value||'');
  const skr=String(el('mapSkrGroup')?.value||'');
  map.invalidateSize(false);

  if(!county&&!skr){
    const bounds=swedenDisplayBounds();
    if(bounds&&bounds.isValid()){
      map.fitBounds(bounds,{padding:[8,8],animate:false});
      mapInitialFitDone=true;
    }
    return;
  }

  const bounds=geoLayer?.getBounds?.();
  if(bounds&&bounds.isValid()){
    map.fitBounds(bounds,{padding:[24,24],maxZoom:10,animate:false});
    mapInitialFitDone=true;
  }
}

function scheduleMapFilterFit(){
  requestAnimationFrame(()=>{
    setTimeout(()=>{
      map?.invalidateSize(false);
      fitMapToCurrentFilter();
    },80);
  });
}

async function renderMap(){
  setLoading('Laddar årskarta…');
  setInlineLoading('mapStatus','Laddar kartdata…',true);
  try{
    const {start,end,multi}=mapYearRange();
    const crimeId=el('mapCrime').value;
    const metric=el('mapMetric').value;
    const info=metricInfo(metric);
    const parquetFiles=parquetSqlForRange(start,end);

    let data=await query(`
      SELECT "Kommun",
             CAST(SUM(CAST("Antal" AS DOUBLE)) AS DOUBLE) AS count,
             CAST(SUM(CAST("Per100000" AS DOUBLE)) AS DOUBLE) AS rate,
             CAST(AVG(CAST("Antal" AS DOUBLE)) AS DOUBLE) AS avgCount,
             CAST(AVG(CAST("Per100000" AS DOUBLE)) AS DOUBLE) AS avgRate
      FROM read_parquet(${parquetFiles})
      WHERE "Brott_ID"=${Number(crimeId)} AND "Antal">-555
      GROUP BY "Kommun"
    `);

    const visibleNames=mapFilterNames();
    data=data.filter(r=>visibleNames.has(r.Kommun));

    const activeData=data.filter(r=>{
      const count=Number(r.count);
      return Number.isFinite(count) && count>0;
    });
    const municipalitiesWithCrime=new Set(activeData.map(r=>r.Kommun));
    addRanks(activeData);
    const rankedForMetric=addMetricRank(activeData,metric);

    const byName=new Map(data.map(r=>[r.Kommun,r]));
    // Kartans dataurval följer län/SKR-filtret. Själva zoomningen styrs
    // separat så brott, mått och år inte återställer användarens manuella zoom.
    mapAutoBounds=boundsForMunicipalities(visibleNames)||swedenDisplayBounds();

    const values=data
      .filter(r=>Number.isFinite(Number(r.count)) && Number(r.count)>0)
      .map(r=>Number(metricValue(r,metric)))
      .filter(Number.isFinite);
    const minValue=values.length?Math.min(...values):NaN;
    const maxValue=values.length?Math.max(...values):NaN;

    if(geoLayer)geoLayer.remove();
    geoLayer=L.geoJSON(GEO,{
      filter:f=>visibleNames.has(f.properties.Kommun),
      style:f=>{
        const name=f.properties.Kommun;
        const row=byName.get(name);
        const value=row?Number(metricValue(row,metric)):NaN;
        const h=municipalityHighlight(name);
        const noCrime=!row || !Number.isFinite(Number(row.count)) || Number(row.count)<=0;
        const outline=h?.line || '#aab2bd';
        const outlineWeight=h ? (h.kind==='norrbotten'?1.7:3) : 0.7;
        return {
          color:noCrime?'transparent':outline,
          weight:noCrime?0:outlineWeight,
          opacity:noCrime?0:1,
          fillColor:noCrime?'transparent':continuousColor(value,minValue,maxValue,metric),
          fillOpacity:noCrime?0:.82
        };
      },
      onEachFeature:(f,layer)=>{
        const name=f.properties.Kommun;
        const row=byName.get(name);
        const value=row?metricValue(row,metric):null;
        const rankedTotal=rankedForMetric.length;
        const noCrime=!row || !Number.isFinite(Number(row.count)) || Number(row.count)<=0;
        let label=noCrime?'0 brott':'Data saknas';
        if(!noCrime && value!=null){
          if(info.isAverage){
            label=fmtAverage(value)+(info.isCount?' brott i medel per år':' per 100 000 i medel per år');
          }else if(metric==='Antal'){
            label=fmt0.format(value)+(multi?' brott totalt':' brott');
          }else{
            label=fmt1.format(value)+(multi?' per 100 000, summa':' per 100 000');
          }
        }
        const periodText=multi ? start+'-'+end : String(start);
        const rankText=(!noCrime && row?.metricRank)
          ? '<br>Placering: '+fmt0.format(row.metricRank)+' av '+rankedTotal
          : '';
        layer.bindTooltip('<b>'+name+'</b><br>'+label+rankText+'<br>Period: '+periodText);
      }
    }).addTo(map);

    if(el('page-map').classList.contains('active')){
      setTimeout(()=>{
        map.invalidateSize(false);
        if(!mapInitialFitDone)fitMapToVisible();
      },60);
    }

    const category=CATEGORIES.find(c=>String(c['Brott_ID'])===crimeId);
    const yearText=multi?start+'–'+end:String(start);
    el('mapTitle').textContent=yearText+' – '+(category?.Brott||'Brott');

    const county=el('mapCounty').value;
    const skr=el('mapSkrGroup').value;
    const filterText=[county,skr].filter(Boolean).join(' · ');
    const valueCount=municipalitiesWithCrime.size;
    setInlineLoading(
      'mapStatus',
      valueCount+' kommuner med brott'
        +(filterText?' · '+filterText:'')
        +(valueCount===0?' · inga kommuner har värde, kartan visar hela Sverige.':'. '),
      false
    );

    el('mapLegend').innerHTML=continuousLegendHtml(values,metric);
  }catch(err){
    console.error(err);
    setInlineLoading('mapStatus','Fel vid kartuppdatering: '+String(err.message||err),false);
    throw err;
  }finally{
    setLoading(null);
  }
}

function profileMunicipalityNames(){
  const selected=el('profileMunicipality').value;
  if(selected && selected!=='__ALL__')return [selected];
  return filteredMunicipalityNames('profileCounty','profileSkrGroup');
}

function categoryParentId(cat){
  const p=cat?.['Förälder_ID'];
  return p==null || p==='' || Number.isNaN(Number(p)) ? null : String(Math.trunc(Number(p)));
}

function buildProfileTree(rows,metric,totalValue,totalCount){
  const valueById=new Map(rows.map(r=>[String(r.crimeId),Number(r.value)]));
  const countById=new Map(rows.map(r=>[String(r.crimeId),Number(r.countValue)]));
  const catById=new Map(CATEGORIES.map(cat=>[String(cat.Brott_ID),cat]));
  const totalId=String(META.default_crime_id);

  const positiveIds=new Set(
    [...valueById.entries()]
      .filter(([id,v])=>id!==totalId && Number.isFinite(v) && v>0)
      .map(([id])=>id)
  );

  const needed=new Set(positiveIds);
  for(const id of [...positiveIds]){
    let cur=catById.get(id);
    while(cur){
      const parent=categoryParentId(cur);
      if(!parent || parent===totalId)break;
      needed.add(parent);
      cur=catById.get(parent);
    }
  }

  const nodeMap=new Map();
  for(const id of needed){
    const cat=catById.get(id);
    if(!cat)continue;
    nodeMap.set(id,{
      id,
      name:String(cat.Brott),
      level:Number(cat['Brottsnivå']||1),
      children:[],
      rawValue:Number(valueById.get(id)||0),
      rawCount:Number(countById.get(id)||0),
      synthetic:false
    });
  }

  const root={
    id:'root',
    name:'Alla brottskategorier',
    level:0,
    children:[],
    rawValue:Number(totalValue)||0,
    rawCount:Number(totalCount)||0,
    synthetic:false
  };

  for(const node of nodeMap.values()){
    const cat=catById.get(node.id);
    const parentId=categoryParentId(cat);
    const parent=nodeMap.get(parentId);
    if(parent)parent.children.push(node);
    else root.children.push(node);
  }

  let scaledBranches=0;
  let residualNodes=0;

  function partition(node,targetValue,targetCount){
    const ownValue=Math.max(0,Number(targetValue)||0);
    const ownCount=Math.max(0,Number(targetCount)||0);
    const children=(node.children||[]).filter(ch=>ch.rawValue>0);

    node.displayValue=ownValue;
    node.displayCount=ownCount;

    if(!children.length){
      node.areaValue=ownValue;
      node.areaCount=ownCount;
      node.children=[];
      return;
    }

    const childRawSum=children.reduce((s,ch)=>s+Math.max(0,ch.rawValue),0);
    const childCountSum=children.reduce((s,ch)=>s+Math.max(0,ch.rawCount),0);

    // Children are a decomposition of their parent. If their published totals
    // overlap and sum above the parent, scale only their treemap areas
    // proportionally to the parent's authoritative total. Tooltip values remain raw.
    const scale=childRawSum>ownValue && childRawSum>0 ? ownValue/childRawSum : 1;
    const countScale=childCountSum>ownCount && childCountSum>0 ? ownCount/childCountSum : 1;
    if(scale<0.999999)scaledBranches++;

    const out=[];
    for(const ch of children){
      const childTarget=Math.max(0,ch.rawValue)*scale;
      const childCountTarget=Math.max(0,ch.rawCount)*countScale;
      partition(ch,childTarget,childCountTarget);
      ch.displayValue=ch.rawValue;
      ch.displayCount=ch.rawCount;
      out.push(ch);
    }

    const allocated=out.reduce((s,ch)=>s+Number(ch.areaValue||0),0);
    const allocatedCount=out.reduce((s,ch)=>s+Number(ch.areaCount||0),0);
    const residual=Math.max(0,ownValue-allocated);
    const residualCount=Math.max(0,ownCount-allocatedCount);

    if(residual>0.000001){
      residualNodes++;
      out.push({
        id:node.id+'__residual',
        name:'Övrigt inom '+node.name,
        level:Math.min(5,Number(node.level||0)+1),
        children:[],
        rawValue:residual,
        rawCount:residualCount,
        displayValue:residual,
        displayCount:residualCount,
        areaValue:residual,
        areaCount:residualCount,
        synthetic:true
      });
    }

    node.children=out;
    node.areaValue=out.reduce((s,ch)=>s+Number(ch.areaValue||0),0);
    node.areaCount=out.reduce((s,ch)=>s+Number(ch.areaCount||0),0);
  }

  partition(root,root.rawValue,root.rawCount);

  root.children=root.children.filter(ch=>Number(ch.areaValue||0)>0);
  root.value=root.rawValue;
  root.count=root.rawCount;
  root.rawLeafValue=root.children.reduce((s,ch)=>s+Number(ch.areaValue||0),0);
  root.rawLeafCount=root.children.reduce((s,ch)=>s+Number(ch.areaCount||0),0);
  root.scaledBranches=scaledBranches;
  root.residualNodes=residualNodes;
  return root;
}

function profileScopeText(){
  const municipality=el('profileMunicipality').value;
  if(municipality && municipality!=='__ALL__')return municipality;
  const county=el('profileCounty').value;
  const skr=el('profileSkrGroup').value;
  return [county,skr].filter(Boolean).join(' · ') || 'Sverige';
}

function conciseCrimeLabel(name){
  let text=String(name||'').trim();

  const prefixes=[
    /^Brott mot brottsbalken,\s*/i,
    /^Brott mot specialstraffrättsliga författningar,?\s*/i,
    /^Brott mot specialstraffrätten,?\s*/i
  ];
  for(const re of prefixes)text=text.replace(re,'');

  // Repeated hierarchy path fragments such as
  // "8-12 kap. Brott mot förmögenhet, 12 kap. Skadegörelsebrott, Skadegörelse inkl. grov åverkan"
  // are reduced to the most specific, reader-relevant final segment.
  const parts=text.split(/,\s*/).map(x=>x.trim()).filter(Boolean);
  if(parts.length>1){
    let best=parts[parts.length-1];

    // If the last part is only a chapter/section marker, step back.
    if(/^\d+(?:-\d+)?\s*kap\.?$/i.test(best) && parts.length>1){
      best=parts[parts.length-2];
    }

    // Prefer the final segment that is not merely "Brott mot ..." or a chapter reference.
    for(let i=parts.length-1;i>=0;i--){
      const p=parts[i];
      if(!/^\d+(?:-\d+)?\s*kap\.?/i.test(p) && !/^Brott mot\b/i.test(p)){
        best=p;
        break;
      }
    }
    text=best;
  }

  text=text
    .replace(/^\d+(?:-\d+)?\s*kap\.\s*/i,'')
    .replace(/^Brott mot\s+/i,'')
    .trim();

  return text || String(name||'');
}

function treemapCrimeLabel(id,name){
  const base=conciseCrimeLabel(name).replace(/\s+/g,' ').trim();
  if(!base)return String(name||'');

  // Legal fragments can be split by commas in Brå's hierarchy, e.g.
  // "Skadegörelse inkl. grov, åverkan (1-3 §)".
  // Rejoin the nearest semantic fragment and remove the legal citation.
  if(/§/.test(base)){
    const parts=String(name||'').split(/,\s*/).map(x=>x.trim()).filter(Boolean);
    const last=parts[parts.length-1]||base;
    const previous=parts.length>1?parts[parts.length-2]:'';
    const combined=(previous+' '+last)
      .replace(/\s*\([^)]*§[^)]*\)\s*/g,' ')
      .replace(/\s+/g,' ')
      .trim();
    if(combined)return combined;
  }

  const cryptic=
    base.length<18 ||
    /\b(?:o\.?\s*d\.?|m\.?\s*m\.?|m\.?\s*fl\.?)\b/i.test(base);

  if(cryptic){
    const hierarchy=crimeHierarchyRows(id);
    if(hierarchy.length>1){
      const parent=conciseCrimeLabel(hierarchy[hierarchy.length-2].name)
        .replace(/\s+/g,' ')
        .trim();
      if(parent && parent!==base && !/^Brott mot\b/i.test(parent)){
        return parent+': '+base;
      }
    }
  }

  return base;
}

function crimeHierarchyRows(id){
  const byId=new Map(CATEGORIES.map(cat=>[String(cat.Brott_ID),cat]));
  const parts=[];
  let current=byId.get(String(id));
  const seen=new Set();

  while(current && !seen.has(String(current.Brott_ID))){
    seen.add(String(current.Brott_ID));
    parts.unshift({
      level:Number(current['Brottsnivå']||parts.length+1),
      name:String(current.Brott)
    });
    const parent=categoryParentId(current);
    if(!parent)break;
    current=byId.get(parent);
  }

  return parts;
}

function escapeHtml(value){
  return String(value)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'","&#039;");
}

function renderTreemap(tree,metric){
  const host=el('profileTreemap');
  host.innerHTML='';
  const rect=host.getBoundingClientRect();
  const width=Math.max(700,Math.round(rect.width||1200));
  const height=Math.max(520,Math.round(rect.height||620));

  if(!tree.children.length || tree.value<=0){
    host.innerHTML='<div class="profile-empty">Inga brott finns i valt urval.</div>';
    return;
  }

  const root=d3.hierarchy(tree,d=>d.children)
    .sum(d=>(!d.children||!d.children.length)?Number(d.areaValue||0):0)
    .sort((a,b)=>b.value-a.value);

  d3.treemap()
    .size([width,height])
    .paddingOuter(2)
    .paddingTop(d=>d.depth===1?22:0)
    .paddingInner(2)
    .round(true)(root);

  const topNames=root.children.map(d=>d.data.name);
  const color=d3.scaleOrdinal()
    .domain(topNames)
    .range(['#6ea8eb','#56c8b4','#e9b94f','#9b7be5','#e98282','#62b9e8','#72c78b','#b780df','#eaa064','#9aa4b2']);

  const levelIntensity=level=>{
    if(level<=1)return .95;
    if(level===2)return .82;
    if(level===3)return .62;
    if(level===4)return .42;
    return .24;
  };
  const leafFill=d=>{
    const base=color(topAncestor(d).data.name);
    const level=Number(d.data.level||5);
    return d3.interpolateRgb('#ffffff',base)(levelIntensity(level));
  };

  const svg=d3.select(host).append('svg')
    .attr('viewBox',`0 0 ${width} ${height}`)
    .attr('preserveAspectRatio','xMidYMid meet');

  let tooltip=document.querySelector('.profile-tooltip');
  if(!tooltip){
    tooltip=document.createElement('div');
    tooltip.className='profile-tooltip';
    tooltip.style.display='none';
    document.body.appendChild(tooltip);
  }

  const leaves=root.leaves().filter(d=>d.value>0);
  const layoutTotal=d3.sum(leaves,d=>d.value);
  const total=Number(tree.value)||layoutTotal;

  const topAncestor=d=>{
    let n=d;
    while(n.parent && n.parent.depth>0)n=n.parent;
    return n;
  };

  const g=svg.selectAll('g.profile-leaf')
    .data(leaves)
    .join('g')
    .attr('class','profile-leaf')
    .attr('transform',d=>`translate(${d.x0},${d.y0})`);

  g.append('rect')
    .attr('class','profile-tile')
    .attr('width',d=>Math.max(0,d.x1-d.x0))
    .attr('height',d=>Math.max(0,d.y1-d.y0))
    .attr('rx',3)
    .attr('fill',d=>leafFill(d))
    .on('mousemove',(event,d)=>{
      const share=total>0?100*d.value/total:0;
      const info=metricInfo(metric);
      const displayValue=Number(d.data.displayValue ?? d.data.rawValue ?? d.value);
      const valueText=info.isAverage
        ? fmtAverage(displayValue)+(info.isCount?' brott i medel per år':' per 100 000 i medel per år')
        : info.isCount
          ? fmt0.format(displayValue)+' brott'
          : fmt1.format(displayValue)+' per 100 000';
      const hierarchyRows=crimeHierarchyRows(d.data.id);
      const hierarchyHtml=hierarchyRows.map(item=>
        '<div class="profile-tooltip-level"><span>Nivå '+item.level+':</span> '+escapeHtml(item.name)+'</div>'
      ).join('');
      tooltip.innerHTML='<b>'+escapeHtml(conciseCrimeLabel(d.data.name))+'</b>'
        +'<br>'+escapeHtml(valueText)
        +'<br>Andel: '+fmt1.format(share)+' %'
        +(hierarchyHtml?'<div class="profile-tooltip-hierarchy">'+hierarchyHtml+'</div>':'');
      tooltip.style.display='block';
      tooltip.style.left=(event.clientX+14)+'px';
      tooltip.style.top=(event.clientY+14)+'px';
    })
    .on('mouseleave',()=>{tooltip.style.display='none';});

  g.each(function(d){
    const w=d.x1-d.x0,h=d.y1-d.y0;
    if(w<56 || h<26)return;
    const group=d3.select(this);
    const share=total>0?100*d.value/total:0;
    const label=treemapCrimeLabel(d.data.id,d.data.name);
    const fs=w<105?9:10.5;
    const maxLines=h>=62?3:2;
    const words=label.split(/\s+/);
    const maxChars=Math.max(7,Math.floor(w/(fs*.58)));
    let line='',lines=[];
    for(const word of words){
      const test=(line+' '+word).trim();
      if(test.length>maxChars && line){
        lines.push(line);
        line=word;
      }else{
        line=test;
      }
      if(lines.length>=maxLines)break;
    }
    if(line && lines.length<maxLines)lines.push(line);
    const text=group.append('text').attr('class','profile-tile-label').attr('x',6).attr('y',14).style('font-size',fs+'px');
    lines.slice(0,maxLines).forEach((ln,i)=>text.append('tspan').attr('x',6).attr('dy',i===0?0:fs+1.5).text(ln));
    if(h>50){
      group.append('text').attr('class','profile-tile-share').attr('x',6).attr('y',h-7).style('font-size','9px').text(fmt1.format(share)+' %');
    }
  });

  root.children.forEach(groupNode=>{
    svg.append('text')
      .attr('class','profile-group-label')
      .attr('x',groupNode.x0+6)
      .attr('y',groupNode.y0+16)
      .style('font-size','11px')
      .text(groupNode.data.name);
  });
}

async function renderProfile(){
  if(!el('profileTreemap'))return;
  setLoading('Laddar områdesprofil…');
  try{
    const {start,end,multi}=profileYearRange();
    const metric=el('profileMetric').value;
    const info=metricInfo(metric);
    const municipalities=profileMunicipalityNames();
    const allMunicipalities=municipalities.length===MUNICIPAL_META.length;
    const municipalityWhere=(!municipalities.length || allMunicipalities)
      ? ''
      : ' AND "Kommun" IN ('+sqlStringList(municipalities)+')';

    const expression=metric==='Antal'
      ? 'SUM(CAST("Antal" AS DOUBLE))'
      : metric==='Per100000'
        ? 'SUM(CAST("Per100000" AS DOUBLE))'
        : metric==='AvgAntal'
          ? 'SUM(CAST("Antal" AS DOUBLE)) / '+(end-start+1)
          : 'SUM(CAST("Per100000" AS DOUBLE)) / '+(end-start+1);

    const totalRows=await query(`
      SELECT CAST(${expression} AS DOUBLE) AS value,
             CAST(SUM(CAST("Antal" AS DOUBLE)) AS DOUBLE) AS countValue
      FROM read_parquet(${parquetSqlForRange(start,end)})
      WHERE "Antal">-555${municipalityWhere}
        AND "Brott_ID"=${Number(META.default_crime_id)}
    `);
    const authoritativeTotalValue=Number(totalRows[0]?.value)||0;
    const authoritativeTotalCount=Number(totalRows[0]?.countValue)||0;

    const rows=await query(`
      SELECT CAST("Brott_ID" AS INTEGER) AS crimeId,
             CAST(${expression} AS DOUBLE) AS value,
             CAST(SUM(CAST("Antal" AS DOUBLE)) AS DOUBLE) AS countValue
      FROM read_parquet(${parquetSqlForRange(start,end)})
      WHERE "Antal">0${municipalityWhere}
        AND "Brott_ID"<>${Number(META.default_crime_id)}
      GROUP BY "Brott_ID"
      HAVING ${expression}>0
    `);

    const tree=buildProfileTree(rows,metric,authoritativeTotalValue,authoritativeTotalCount);
    const scope=profileScopeText();
    const periodText=multi?start+'–'+end:String(start);
    el('profileTitle').textContent='Områdesprofil – '+scope;
    el('profileTotalCrimes').textContent=fmt0.format(authoritativeTotalCount);
    el('profileTotalCrimesPeriod').textContent=(multi ? 'summa för '+start+'–'+end : 'år '+start)
      +' · källa: Totalt antal brott';
    const statusBase=periodText+' · '+info.label+' · '+tree.children.length+' huvudgrupper';
    const qaParts=[];
    if(tree.scaledBranches>0)qaParts.push(tree.scaledBranches+' överlappande grenar normaliserade');
    if(tree.residualNodes>0)qaParts.push(tree.residualNodes+' restkategorier skapade');
    el('profileStatus').textContent=statusBase+(qaParts.length?' · '+qaParts.join(' · '):'');
    renderTreemap(tree,metric);
    profileRendered=true;
  }catch(err){
    console.error(err);
    el('profileTreemap').innerHTML='<div class="profile-empty">Fel: '+String(err.message||err)+'</div>';
  }finally{
    setLoading(null);
  }
}

function normalizeLegislationLabelText(text){
  return String(text||'')
    .replace(/\s+/g,' ')
    .replace(/\s*([,;:])\s*/g,'$1 ')
    .trim();
}

function legislationHasLetters(text){
  return /[A-Za-zÅÄÖåäö]/.test(String(text||''));
}

function isWeakLegislationLabel(text){
  const t=normalizeLegislationLabelText(text);
  if(!t)return true;
  if(!legislationHasLetters(t))return true;

  const letterCount=(t.match(/[A-Za-zÅÄÖåäö]/g)||[]).length;
  const digitSymbolCount=(t.match(/[0-9§().,:/\-–]/g)||[]).length;
  const alphaWords=t.split(/\s+/).filter(w=>/[A-Za-zÅÄÖåäö]{2,}/.test(w)).length;

  if(alphaWords===0)return true;
  if(letterCount<4)return true;
  if(digitSymbolCount>letterCount*1.5)return true;
  return false;
}

function legislationCategoryById(crimeId){
  return CATEGORIES.find(x=>String(x.Brott_ID)===String(crimeId))||null;
}

function legislationAncestorChain(cat){
  const byId=new Map(CATEGORIES.map(x=>[String(x.Brott_ID),x]));
  const chain=[];
  const seen=new Set();
  let current=cat;

  while(current && !seen.has(String(current.Brott_ID))){
    chain.push(current);
    seen.add(String(current.Brott_ID));
    const parentId=categoryParentId(current);
    current=parentId ? byId.get(String(parentId)) : null;
  }
  return chain;
}

function firstMeaningfulLegislationAncestorLabel(cat){
  const chain=legislationAncestorChain(cat);
  for(const item of chain){
    const candidate=normalizeLegislationLabelText(
      treemapCrimeLabel(item.Brott_ID,item.Brott)||item.Brott
    );
    if(!isWeakLegislationLabel(candidate))return candidate;
  }
  return normalizeLegislationLabelText(cat?.Förälder||cat?.Brott||'');
}

function cleanSpecialLegislationLabel(rawName){
  let text=normalizeLegislationLabelText(rawName)
    .replace(/^Brott mot specialstraffrättsliga författningar,?\s*/i,'')
    .trim();

  // Remove legal citations from the visible label, but keep meaningful law/offence wording.
  text=text
    .replace(/\s*\([^)]*§[^)]*\)\s*/g,' ')
    .replace(/\s+/g,' ')
    .replace(/\s+,/g,',')
    .trim();

  // Make a final ", överträdelse" read as explanatory context rather than a loose fragment.
  text=text.replace(/,\s*(överträdelse(?:r)?)$/i,' – $1');

  return text;
}

function isGenericLegislationLabel(text){
  const t=normalizeLegislationLabelText(text).toLocaleLowerCase('sv');
  return t==='brott mot specialstraffrättsliga författningar'
    || t==='brott mot brottsbalken'
    || t==='specialstraffrättsliga författningar';
}

function needsLegislationContext(label){
  const t=normalizeLegislationLabelText(label);
  if(isWeakLegislationLabel(t))return true;

  // Short trailing fragments often lose the law/context after concise-label trimming.
  if(/^(?:badanläggningar|bibliotek|butiker|överträdelse|underlåtenhet|övriga brott)\b/i.test(t))return true;
  if(t.length<28 && !/^(?:Lag|Lagen|Förordning|Brott mot|Aktiebolagslagen|Alkohollagen|Arbetsmiljölagen|Vapenlagen|Ordningslagen)\b/i.test(t)){
    return true;
  }
  return false;
}

function legislationDisplayLabel(crimeId,rawName){
  const cat=legislationCategoryById(crimeId);
  const raw=normalizeLegislationLabelText(rawName);
  const shortLabel=normalizeLegislationLabelText(
    treemapCrimeLabel(crimeId,rawName)||rawName
  );

  const isSpecial=/^Brott mot specialstraffrättsliga författningar\b/i.test(raw);
  if(isSpecial){
    const specific=cleanSpecialLegislationLabel(raw);
    if(specific && !isWeakLegislationLabel(specific)){
      // Prefer the fuller law/offence wording whenever the concise form has lost context.
      if(needsLegislationContext(shortLabel) || isGenericLegislationLabel(shortLabel)){
        return specific;
      }
      return shortLabel;
    }
  }

  if(!isWeakLegislationLabel(shortLabel) && !isGenericLegislationLabel(shortLabel)){
    return shortLabel;
  }

  const chain=legislationAncestorChain(cat);
  const ancestorItem=chain.find(item=>{
    const candidate=normalizeLegislationLabelText(
      treemapCrimeLabel(item.Brott_ID,item.Brott)||item.Brott
    );
    return !isWeakLegislationLabel(candidate) && !isGenericLegislationLabel(candidate);
  });
  const ancestorLabel=ancestorItem
    ? normalizeLegislationLabelText(treemapCrimeLabel(ancestorItem.Brott_ID,ancestorItem.Brott)||ancestorItem.Brott)
    : '';

  const parts=raw.split(',').map(x=>x.trim()).filter(Boolean);
  const tail=parts.length ? parts[parts.length-1] : '';

  if(tail && !isWeakLegislationLabel(tail) && !isGenericLegislationLabel(tail) && tail!==ancestorLabel){
    return ancestorLabel ? ancestorLabel+': '+tail : tail;
  }

  if(ancestorLabel){
    return ancestorLabel+' (paragrafhänvisning)';
  }

  return raw||'Oklar brottskategori';
}

function explicitLegislationPeriod(name,minYear,maxYear){
  const text=String(name||'');
  const startMatch=text.match(/(?:fr\.?\s*o\.?\s*m\.?|från\s+och\s+med)\s*(\d{4})(?:[-/.](\d{1,2}))?/i);
  const endMatch=text.match(/(?:t\.?\s*o\.?\s*m\.?|till\s+och\s+med)\s*(\d{4})(?:[-/.](\d{1,2}))?/i);

  const startYear=startMatch ? Number(startMatch[1]) : null;
  const endYear=endMatch ? Number(endMatch[1]) : null;

  return {
    startYear:Number.isFinite(startYear) && startYear>=minYear && startYear<=maxYear+1 ? startYear : null,
    endYear:Number.isFinite(endYear) && endYear>=minYear-1 && endYear<=maxYear+1 ? endYear : null,
    startText:startMatch ? startMatch[0] : null,
    endText:endMatch ? endMatch[0] : null
  };
}

async function loadLegislationTimeline(){
  if(legislationTimelineCache)return legislationTimelineCache;

  const observed=await query(`
    SELECT CAST("Brott_ID" AS INTEGER) AS crimeId,
           MIN(CAST("År" AS INTEGER)) AS firstYear,
           MAX(CAST("År" AS INTEGER)) AS lastYear,
           COUNT(DISTINCT CAST("År" AS INTEGER)) AS observedYears
    FROM read_parquet(${allParquetSql()})
    WHERE "Antal">-555
    GROUP BY "Brott_ID"
  `);

  const catById=new Map(CATEGORIES.map(cat=>[String(cat.Brott_ID),cat]));
  const minYear=Number(META.start_year);
  const maxYear=Number(META.latest_year);

  legislationTimelineCache=observed.map(row=>{
    const cat=catById.get(String(row.crimeId));
    if(!cat)return null;

    const observedFirstYear=Number(row.firstYear);
    const observedLastYear=Number(row.lastYear);
    const explicit=explicitLegislationPeriod(cat.Brott,minYear,maxYear);
    const firstYear=explicit.startYear ?? observedFirstYear;
    const lastYear=explicit.endYear ?? observedLastYear;
    const explicitEnded=explicit.endYear!=null && explicit.endYear<maxYear;

    return {
      crimeId:Number(row.crimeId),
      name:String(cat.Brott||''),
      label:legislationDisplayLabel(cat.Brott_ID,cat.Brott),
      level:Number(cat['Brottsnivå']||0),
      ended:explicitEnded || cat['Upphört']===true || String(cat['Upphört']).toLowerCase()==='true',
      firstYear,
      lastYear,
      observedFirstYear,
      observedLastYear,
      explicitStartYear:explicit.startYear,
      explicitEndYear:explicit.endYear,
      explicitStartText:explicit.startText,
      explicitEndText:explicit.endText,
      observedYears:Number(row.observedYears)
    };
  }).filter(Boolean);

  return legislationTimelineCache;
}

function aggregateLegislationRows(rows,maxDisplayLevel=4){
  const byId=new Map(rows.map(r=>[String(r.crimeId),r]));
  const catById=new Map(CATEGORIES.map(cat=>[String(cat.Brott_ID),cat]));
  const groups=new Map();

  function anchorFor(row){
    let cat=catById.get(String(row.crimeId));
    const seen=new Set();
    while(cat && Number(cat['Brottsnivå']||0)>maxDisplayLevel){
      const id=String(cat.Brott_ID);
      if(seen.has(id))break;
      seen.add(id);
      const parent=categoryParentId(cat);
      if(!parent)break;
      cat=catById.get(String(parent));
    }
    return cat ? String(cat.Brott_ID) : String(row.crimeId);
  }

  for(const row of rows){
    const anchorId=anchorFor(row);
    const anchorRow=byId.get(anchorId) || row;
    if(!groups.has(anchorId)){
      groups.set(anchorId,{
        ...anchorRow,
        crimeId:Number(anchorId),
        children:[]
      });
    }
    const group=groups.get(anchorId);
    group.firstYear=Math.min(group.firstYear,row.firstYear);
    group.lastYear=Math.max(group.lastYear,row.lastYear);
    group.ended=group.ended || row.ended;
    if(String(row.crimeId)!==anchorId){
      group.children.push(row);
    }
  }

  for(const group of groups.values()){
    group.children.sort((a,b)=>
      a.level-b.level ||
      a.firstYear-b.firstYear ||
      a.label.localeCompare(b.label,'sv')
    );
  }
  return [...groups.values()];
}

function buildLegislationGroups(rows){
  const catById=new Map(CATEGORIES.map(cat=>[String(cat.Brott_ID),cat]));
  const rowById=new Map(rows.map(row=>[String(row.crimeId),row]));

  function ancestorAtLevel(cat,targetLevel){
    let current=cat;
    const seen=new Set();
    while(current && Number(current['Brottsnivå']||0)>targetLevel){
      const id=String(current.Brott_ID);
      if(seen.has(id))break;
      seen.add(id);
      const parentId=categoryParentId(current);
      if(!parentId)break;
      current=catById.get(String(parentId));
    }
    return current && Number(current['Brottsnivå']||0)===targetLevel ? current : null;
  }

  function groupAnchorFor(row){
    const cat=catById.get(String(row.crimeId));
    if(!cat)return null;
    const level1=String(cat.Nivå1||'').toLocaleLowerCase('sv');

    // Specialstraffrätt: group by named law / chapter on level 2.
    if(level1.includes('specialstraffrättsliga')){
      return ancestorAtLevel(cat,2);
    }

    // Brottsbalken: group by the more concrete chapter/category on level 3.
    if(level1.includes('brott mot brottsbalken')){
      return ancestorAtLevel(cat,3);
    }

    return null;
  }

  const groups=new Map();
  const ungrouped=[];

  for(const row of rows){
    const anchorCat=groupAnchorFor(row);
    if(!anchorCat){
      ungrouped.push(row);
      continue;
    }

    const anchorId=String(anchorCat.Brott_ID);
    const anchorRow=rowById.get(anchorId);
    if(!anchorRow){
      ungrouped.push(row);
      continue;
    }

    if(!groups.has(anchorId)){
      groups.set(anchorId,{
        ...anchorRow,
        group:true,
        children:[]
      });
    }

    if(String(row.crimeId)!==anchorId){
      groups.get(anchorId).children.push(row);
    }
  }

  const groupedIds=new Set();
  for(const [anchorId,group] of groups){
    if(!group.children.length){
      groups.delete(anchorId);
      continue;
    }
    groupedIds.add(anchorId);
    for(const child of group.children)groupedIds.add(String(child.crimeId));

    group.firstYear=Math.min(group.firstYear,...group.children.map(ch=>ch.firstYear));
    group.lastYear=Math.max(group.lastYear,...group.children.map(ch=>ch.lastYear));
    group.ended=group.ended || group.children.some(ch=>ch.ended);
    group.children.sort((a,b)=>
      a.level-b.level ||
      a.firstYear-b.firstYear ||
      a.label.localeCompare(b.label,'sv')
    );
  }

  const topLevel=[
    ...groups.values(),
    ...rows.filter(row=>!groupedIds.has(String(row.crimeId)))
  ];

  return topLevel;
}

function legislationTooltipHtml(row,maxYear){
  const endText=row.lastYear===maxYear && !row.ended?'pågår':String(row.lastYear);
  const observedEnd=row.observedLastYear===maxYear?'senaste dataår':String(row.observedLastYear);
  const differs=row.observedFirstYear!=null && row.observedLastYear!=null
    && (row.firstYear!==row.observedFirstYear || row.lastYear!==row.observedLastYear);

  let html='<strong>'+escapeHtml(row.label)+'</strong>'
    +'<div class="legislation-tooltip-meta">Visad period: '+row.firstYear+'–'+endText+'</div>';

  if(row.explicitStartYear!=null || row.explicitEndYear!=null){
    const pieces=[];
    if(row.explicitStartText)pieces.push(row.explicitStartText);
    if(row.explicitEndText)pieces.push(row.explicitEndText);
    html+='<div class="legislation-tooltip-rule">Explicit period i kategorinamnet: '+escapeHtml(pieces.join(' · '))+'</div>';
  }

  if(differs){
    html+='<div class="legislation-tooltip-observed">Förekommer i Brå-data: '
      +row.observedFirstYear+'–'+observedEnd+'</div>';
  }
  if(row.children?.length){
    html+='<div class="legislation-tooltip-title">Underliggande kategorier</div>';
    html+=row.children.map(child=>{
      const childEnd=child.lastYear===maxYear && !child.ended?'pågår':String(child.lastYear);
      const observedDiff=child.observedFirstYear!=null && child.observedLastYear!=null
        && (child.firstYear!==child.observedFirstYear || child.lastYear!==child.observedLastYear);
      return '<div class="legislation-tooltip-child">'
        +'<span>Nivå '+child.level+':</span> '
        +escapeHtml(child.label)
        +' <small>'+child.firstYear+'–'+childEnd+'</small>'
        +(observedDiff
          ? '<div class="legislation-tooltip-child-observed">Brå-data: '+child.observedFirstYear+'–'+child.observedLastYear+'</div>'
          : '')
      +'</div>';
    }).join('');
  }
  return html;
}

function legislationYearTicks(minYear,maxYear){
  const ticks=[minYear];
  for(let y=Math.ceil(minYear/5)*5;y<maxYear;y+=5){
    if(y>minYear)ticks.push(y);
  }
  if(!ticks.includes(maxYear))ticks.push(maxYear);
  return ticks;
}

async function renderLegislationTimeline(showLoading=true){
  const host=el('legislationTimeline');
  if(!host)return;
  if(showLoading)setLoading('Laddar kategori- och paragraftidslinje…');

  try{
    const rows=await loadLegislationTimeline();
    const minYear=Number(META.start_year);
    const maxYear=Number(META.latest_year);
    const search=String(el('legislationSearch')?.value||'').trim().toLocaleLowerCase('sv');
    const detail=String(el('legislationDetail')?.value||'aggregate');
    const level=String(el('legislationLevel')?.value||'');
    const status=String(el('legislationStatus')?.value||'changes');

    const baseRows=detail==='aggregate' ? aggregateLegislationRows(rows,4) : rows;
    const displayRows=buildLegislationGroups(baseRows);
    let filtered=displayRows.filter(row=>{
      if(level && String(row.level)!==level)return false;
      if(search){
        const ownMatch=row.name.toLocaleLowerCase('sv').includes(search) || row.label.toLocaleLowerCase('sv').includes(search);
        const childMatch=(row.children||[]).some(ch=>
          ch.name.toLocaleLowerCase('sv').includes(search) || ch.label.toLocaleLowerCase('sv').includes(search)
        );
        if(!ownMatch && !childMatch)return false;
      }

      const isNew=row.firstYear>minYear;
      const isEnded=row.lastYear<maxYear || row.ended;
      const isActive=row.lastYear===maxYear && !row.ended;

      if(status==='changes' && !(isNew||isEnded))return false;
      if(status==='new' && !isNew)return false;
      if(status==='ended' && !isEnded)return false;
      if(status==='active' && !isActive)return false;
      return true;
    });

    filtered=filtered.sort((a,b)=>
      b.firstYear-a.firstYear ||
      a.lastYear-b.lastYear ||
      a.label.localeCompare(b.label,'sv')
    );

    const statusText=el('legislationStatusText');
    if(statusText){
      const changeCount=rows.filter(r=>r.firstYear>minYear || r.lastYear<maxYear || r.ended).length;
      const detailText=detail==='aggregate'?'sammanfattat till nivå 1–4':'alla nivåer 1–6';
      statusText.textContent=filtered.length+' rader visas · '+detailText+' · '+changeCount+' kategorier har en observerad förändring under '+minYear+'–'+maxYear+'.';
    }

    if(!filtered.length){
      host.innerHTML='<div class="profile-empty">Inga kategorier matchar filtret.</div>';
      return;
    }

    const ticks=legislationYearTicks(minYear,maxYear);
    const span=maxYear-minYear+1;
    const tickHtml=ticks.map(year=>{
      const left=((year-minYear)/Math.max(1,maxYear-minYear))*100;
      return '<span class="legislation-year-tick" style="left:'+left+'%">'+year+'</span>';
    }).join('');

    function legislationRowHtml(row,index,child=false){
      const left=((row.firstYear-minYear)/span)*100;
      const width=((row.lastYear-row.firstYear+1)/span)*100;
      const state=(row.lastYear<maxYear || row.ended)?'ended':'active';
      const endText=row.lastYear===maxYear && !row.ended?'pågår':String(row.lastYear);
      const childCount=row.children?.length||0;
      const childText=childCount ? ' · '+childCount+' underkategorier' : '';
      const rowClass=child?' legislation-row-child':'';
      const toggle=childCount
        ? '<button class="legislation-toggle" type="button" data-legislation-toggle="'+index+'" aria-expanded="false">▸</button>'
        : '<span class="legislation-toggle-spacer"></span>';

      return '<div class="legislation-row'+rowClass+'">'
        +'<div class="legislation-label" data-legislation-index="'+index+'">'
          +toggle
          +'<div class="legislation-label-text">'
            +'<strong>'+escapeHtml(row.label)+'</strong>'
            +'<small>Nivå '+row.level+' · '+row.firstYear+'–'+endText+childText+'</small>'
          +'</div>'
        +'</div>'
        +'<div class="legislation-track">'
          +'<div class="legislation-grid">'+tickHtml+'</div>'
          +'<div class="legislation-bar '+state+'" data-legislation-index="'+index+'" style="left:'+left+'%;width:'+Math.max(width,1.2)+'%"></div>'
        +'</div>'
      +'</div>';
    }

    const renderedRows=[];
    const rowsHtml=filtered.map((row,index)=>{
      renderedRows.push(row);
      const parentIndex=renderedRows.length-1;
      let html=legislationRowHtml(row,parentIndex,false);

      if(row.children?.length){
        const childrenHtml=row.children.map(child=>{
          renderedRows.push(child);
          return legislationRowHtml(child,renderedRows.length-1,true);
        }).join('');
        html+='<div class="legislation-children" data-legislation-children="'+parentIndex+'" hidden>'+childrenHtml+'</div>';
      }
      return html;
    }).join('');

    host.innerHTML='<div class="legislation-axis"><div></div><div class="legislation-axis-track">'+tickHtml+'</div></div>'+rowsHtml;

    host.querySelectorAll('[data-legislation-toggle]').forEach(button=>{
      button.addEventListener('click',event=>{
        event.stopPropagation();
        const index=button.dataset.legislationToggle;
        const children=host.querySelector('[data-legislation-children="'+index+'"]');
        if(!children)return;
        const opening=children.hasAttribute('hidden');
        if(opening)children.removeAttribute('hidden');
        else children.setAttribute('hidden','');
        button.textContent=opening?'▾':'▸';
        button.setAttribute('aria-expanded',String(opening));
      });
    });

    let tooltip=document.querySelector('.legislation-tooltip');
    if(!tooltip){
      tooltip=document.createElement('div');
      tooltip.className='legislation-tooltip';
      tooltip.style.display='none';
      document.body.appendChild(tooltip);
    }
    host.querySelectorAll('[data-legislation-index]').forEach(node=>{
      node.addEventListener('mousemove',event=>{
        const row=renderedRows[Number(node.dataset.legislationIndex)];
        if(!row)return;
        tooltip.innerHTML=legislationTooltipHtml(row,maxYear);
        tooltip.style.display='block';
        const pad=14;
        const maxLeft=window.innerWidth-tooltip.offsetWidth-pad;
        const maxTop=window.innerHeight-tooltip.offsetHeight-pad;
        tooltip.style.left=Math.max(pad,Math.min(event.clientX+14,maxLeft))+'px';
        tooltip.style.top=Math.max(pad,Math.min(event.clientY+14,maxTop))+'px';
      });
      node.addEventListener('mouseleave',()=>{tooltip.style.display='none';});
    });
  }catch(err){
    console.error(err);
    host.innerHTML='<div class="profile-empty">Fel: '+escapeHtml(String(err.message||err))+'</div>';
  }finally{
    if(showLoading)setLoading(null);
  }
}

function renderMethod(){
  // Method & data text is maintained directly in index.html.
}


function chatActivePage(){
  const active=document.querySelector('.page.active');
  return active?.id?.replace('page-','')||'overview';
}
function chatCategoryName(crimeId){
  return CATEGORIES.find(x=>String(x.Brott_ID)===String(crimeId))?.Brott||null;
}
function chatMetricLabel(value){
  const labels={Antal:'Antal',Per100000:'Per 100 000 inv.',RankAntal:'Placering antal',RankPer100000:'Placering per 100 000',AvgAntal:'Medelantal',AvgPer100000:'Medel per 100 000'};
  return labels[value]||value||null;
}
function chatCountyNames(){
  return [...new Set(MUNICIPAL_META.map(x=>x.Lan).filter(Boolean))]
    .sort((a,b)=>a.localeCompare(b,'sv'));
}

async function chatProfilePageContext(){
  const {start,end,multi}=profileYearRange();
  const metric=el('profileMetric')?.value||'Antal';
  const info=metricInfo(metric);
  const municipalities=profileMunicipalityNames();
  const allMunicipalities=municipalities.length===MUNICIPAL_META.length;
  const municipalityWhere=(!municipalities.length||allMunicipalities)
    ? ''
    : ' AND "Kommun" IN ('+sqlStringList(municipalities)+')';
  const years=Math.max(1,end-start+1);
  const expression=metric==='Antal'
    ? 'SUM(CAST("Antal" AS DOUBLE))'
    : metric==='Per100000'
      ? 'SUM(CAST("Per100000" AS DOUBLE))'
      : metric==='AvgAntal'
        ? 'SUM(CAST("Antal" AS DOUBLE)) / '+years
        : 'SUM(CAST("Per100000" AS DOUBLE)) / '+years;

  const totalRows=await query(`
    SELECT CAST(SUM(CAST("Antal" AS DOUBLE)) AS DOUBLE) AS totalCount
    FROM read_parquet(${parquetSqlForRange(start,end)})
    WHERE "Antal">-555${municipalityWhere}
      AND "Brott_ID"=${Number(META.default_crime_id)}
  `);

  const rows=await query(`
    SELECT CAST("Brott_ID" AS INTEGER) AS crimeId,
           CAST(${expression} AS DOUBLE) AS value,
           CAST(SUM(CAST("Antal" AS DOUBLE)) AS DOUBLE) AS countValue
    FROM read_parquet(${parquetSqlForRange(start,end)})
    WHERE "Antal">0${municipalityWhere}
      AND "Brott_ID"<>${Number(META.default_crime_id)}
    GROUP BY "Brott_ID"
    HAVING ${expression}>0
  `);

  const categoryById=new Map(CATEGORIES.map(c=>[String(c.Brott_ID),c]));
  const level2=rows
    .map(r=>({r,cat:categoryById.get(String(r.crimeId))}))
    .filter(x=>x.cat&&Number(x.cat['Brottsnivå'])===2)
    .map(x=>({
      category:legislationDisplayLabel(x.cat.Brott_ID,x.cat.Brott),
      value:Number(x.r.value),
      count:Number(x.r.countValue)
    }))
    .filter(x=>Number.isFinite(x.value)&&x.value>0)
    .sort((a,b)=>b.value-a.value)
    .slice(0,15);

  return {
    scope:profileScopeText(),
    municipalities:municipalities.length,
    startYear:start,
    endYear:end,
    period:multi?start+'–'+end:String(start),
    metric:info.label,
    totalReportedCrimes:Number(totalRows[0]?.totalCount)||0,
    topLevel2Categories:level2,
    note:'Topplistan använder Brå-hierarkins nivå 2 för att undvika dubbelräkning mellan över- och underkategorier. Områdesprofilens treemap kan dessutom normalisera överlappande grenar för visningen.'
  };
}

async function chatLegislationPageContext(){
  const rows=await loadLegislationTimeline();
  const minYear=Number(META.start_year);
  const maxYear=Number(META.latest_year);
  const search=String(el('legislationSearch')?.value||'').trim().toLocaleLowerCase('sv');
  const detail=String(el('legislationDetail')?.value||'aggregate');
  const level=String(el('legislationLevel')?.value||'');
  const status=String(el('legislationStatus')?.value||'changes');
  const baseRows=detail==='aggregate'?aggregateLegislationRows(rows,4):rows;
  const displayRows=buildLegislationGroups(baseRows);
  const filtered=displayRows.filter(row=>{
    if(level&&String(row.level)!==level)return false;
    if(search){
      const own=row.name.toLocaleLowerCase('sv').includes(search)||row.label.toLocaleLowerCase('sv').includes(search);
      const child=(row.children||[]).some(ch=>
        ch.name.toLocaleLowerCase('sv').includes(search)||ch.label.toLocaleLowerCase('sv').includes(search)
      );
      if(!own&&!child)return false;
    }
    const isNew=row.firstYear>minYear;
    const isEnded=row.lastYear<maxYear||row.ended;
    const isActive=row.lastYear===maxYear&&!row.ended;
    if(status==='changes'&&!(isNew||isEnded))return false;
    if(status==='new'&&!isNew)return false;
    if(status==='ended'&&!isEnded)return false;
    if(status==='active'&&!isActive)return false;
    return true;
  }).sort((a,b)=>b.firstYear-a.firstYear||a.lastYear-b.lastYear||a.label.localeCompare(b.label,'sv'));

  return {
    search:search||null,
    detail,
    level:level||'alla',
    status,
    dataPeriod:[minYear,maxYear],
    matchingRows:filtered.length,
    rows:filtered.slice(0,40).map(row=>({
      category:row.label,
      level:row.level,
      firstYear:row.firstYear,
      lastYear:row.lastYear,
      ended:Boolean(row.ended),
      observedFirstYear:row.observedFirstYear,
      observedLastYear:row.observedLastYear,
      childCount:row.children?.length||0
    })),
    note:'Första och sista förekomst avser i första hand förekomst i rapportens Brå-data. Det är inte automatiskt samma sak som juridiskt ikraftträdande eller upphävande; explicita årtal i kategorinamnet används när sådana finns.'
  };
}

function chatMethodologyContext(){
  return {
    officialStatistics:'Brå ansvarar för officiell statistik inom rättsväsendet.',
    reportedCrime:{
      scope:'Anmälda brott omfattar händelser som anmälts och registrerats som brott hos polis, tull eller åklagare. Även händelser som senare visar sig inte vara brott kan ingå.',
      caution:'Anmälda brott beskriver inte den faktiska brottsligheten eftersom alla brott inte kommer till rättsväsendets kännedom.',
      geography:'Kommunredovisningen avser kommunen där brottet har begåtts när kommunuppgift finns. Från 2015 redovisas polisens regionala statistik efter sju polisregioner i stället för tidigare län/polismyndigheter.'
    },
    handledCrime:{
      scope:'Handlagda brott omfattar anmälda brott där polis, åklagare eller annan utredande myndighet fattat ett beslut som avslutar handläggningen under redovisningsåret.',
      revision:'Den reviderade statistiken över handlagda brott infördes från helåret 2014 och ersatte statistiken över uppklarade brott.',
      caution:'Lagföringsprocenten ska enligt Brå tolkas som en grov indikator; flera faktorer som myndigheterna inte råder över kan påverka måttet.'
    },
    timeComparison:'Brå anger att statistikrutiner, insamling, redovisningssätt, juridiska förändringar och enskilda stora ärenden kan påverka jämförelser över tid.',
    reportSpecific:{
      municipalityRates:'Kommunvärden per 100 000 kommer från Brå-underlaget. När rapporten härleder länstal grupperas kommuner och befolkning härleds från kommunernas antal och publicerade frekvenser, vilket kan ge mindre avrundningsskillnader.',
      legislationTimeline:'Tidslinjen Lag & kategorier över tid visar observerad första/sista förekomst i data och ska inte ensam användas som belägg för lagens ikraftträdande eller upphävande.',
      profile:'Områdesprofilen visualiserar brottshierarkin och normaliserar vid behov överlappande grenar för att undvika visuell dubbelräkning.'
    },
    sources:[
      {title:'Brå – Statistik',url:'https://bra.se/statistik'},
      {title:'Brå – Om statistiken över anmälda brott',url:'https://bra.se/statistik/statistik-om-rattsvasendet/anmalda-brott/om-statistiken-over-anmalda-brott'},
      {title:'Brå – Handlagda brott',url:'https://bra.se/statistik/statistik-om-rattsvasendet/handlagda-brott'},
      {title:'Brå – Om statistiken över handlagda brott',url:'https://bra.se/statistik/statistik-om-rattsvasendet/handlagda-brott/om-statistiken-over-handlagda-brott'}
    ]
  };
}

function chatQuestionGeography(question){
  const q=String(question||'').toLocaleLowerCase('sv');
  const municipalities=MUNICIPALITIES.filter(name=>
    q.includes(String(name).toLocaleLowerCase('sv'))
  );
  const counties=chatCountyNames().filter(name=>{
    const low=String(name).toLocaleLowerCase('sv');
    const short=low.replace(/\s+län$/,'');
    return q.includes(low) || (short.length>4 && q.includes(short));
  });
  return {
    asksMunicipality:/\bkommun(?:er|erna|nivå)?\b/i.test(q) || municipalities.length>0,
    asksCounty:/\blän(?:en|snivå)?\b/i.test(q) || counties.length>0,
    municipalities,
    counties
  };
}

async function chatMunicipalityComparison(year,crimeId){
  const rows=await query(`
    SELECT "Kommun",
           CAST("Antal" AS DOUBLE) AS count,
           CAST("Per100000" AS DOUBLE) AS rate
    FROM read_parquet('${parquetUrl(year)}')
    WHERE "Brott_ID"=${Number(crimeId)} AND "Antal">-555
  `);
  const metaByName=new Map(MUNICIPAL_META.map(x=>[x.Kommun,x]));
  return rows.map(r=>({
    municipality:r.Kommun,
    county:metaByName.get(r.Kommun)?.Lan||null,
    count:Number(r.count),
    rate:r.rate==null?null:Number(r.rate)
  }));
}

async function chatCountyComparison(year,crimeId){
  const [crimeRows,totalRows]=await Promise.all([
    query(`
      SELECT "Kommun",
             CAST("Antal" AS DOUBLE) AS count,
             CAST("Per100000" AS DOUBLE) AS rate
      FROM read_parquet('${parquetUrl(year)}')
      WHERE "Brott_ID"=${Number(crimeId)} AND "Antal">-555
    `),
    query(`
      SELECT "Kommun",
             CAST("Antal" AS DOUBLE) AS totalCount,
             CAST("Per100000" AS DOUBLE) AS totalRate
      FROM read_parquet('${parquetUrl(year)}')
      WHERE "Brott_ID"=${Number(META.default_crime_id)} AND "Antal">-555
    `)
  ]);

  const metaByName=new Map(MUNICIPAL_META.map(x=>[x.Kommun,x]));
  const totalByName=new Map(totalRows.map(r=>[r.Kommun,r]));
  const grouped=new Map();

  for(const row of crimeRows){
    const meta=metaByName.get(row.Kommun);
    if(!meta?.Lan)continue;
    const total=totalByName.get(row.Kommun);
    const totalCount=Number(total?.totalCount);
    const totalRate=Number(total?.totalRate);
    const population=(Number.isFinite(totalCount) && Number.isFinite(totalRate) && totalRate>0)
      ? totalCount/totalRate*100000
      : null;

    if(!grouped.has(meta.Lan)){
      grouped.set(meta.Lan,{county:meta.Lan,count:0,populationDerived:0,municipalities:0,populationMunicipalities:0});
    }
    const g=grouped.get(meta.Lan);
    g.count+=Number(row.count)||0;
    g.municipalities+=1;
    if(Number.isFinite(population) && population>0){
      g.populationDerived+=population;
      g.populationMunicipalities+=1;
    }
  }

  return [...grouped.values()].map(g=>({
    county:g.county,
    count:g.count,
    rateDerived:g.populationDerived>0 ? g.count/g.populationDerived*100000 : null,
    populationDerived:Math.round(g.populationDerived),
    municipalities:g.municipalities,
    populationMunicipalities:g.populationMunicipalities
  })).sort((a,b)=>(Number(b.rateDerived)||-Infinity)-(Number(a.rateDerived)||-Infinity));
}

async function chatCategoryComparison(year,municipality){
  if(!municipality)return {level:null,rows:[]};
  const rows=await query(`
    SELECT CAST("Brott_ID" AS INTEGER) AS crimeId,
           CAST("Antal" AS DOUBLE) AS count,
           CAST("Per100000" AS DOUBLE) AS rate
    FROM read_parquet('${parquetUrl(year)}')
    WHERE "Kommun"='${esc(municipality)}'
      AND "Antal">0
  `);
  const catById=new Map(CATEGORIES.map(c=>[String(c.Brott_ID),c]));
  const preferredLevels=[2,3,1];

  for(const level of preferredLevels){
    const out=rows
      .map(r=>{
        const cat=catById.get(String(r.crimeId));
        if(!cat || Number(cat['Brottsnivå'])!==level)return null;
        if(String(cat.Brott_ID)===String(META.default_crime_id))return null;
        return {
          crimeId:Number(r.crimeId),
          category:conciseCrimeLabel(cat.Brott),
          count:Number(r.count),
          rate:r.rate==null?null:Number(r.rate)
        };
      })
      .filter(Boolean)
      .sort((a,b)=>b.count-a.count);

    if(out.length>=2)return {level,rows:out};
  }
  return {level:null,rows:[]};
}

function chatSpecificCrimeMatches(question){
  const q=String(question||'').toLocaleLowerCase('sv')
    .replace(/[^a-zåäö0-9\s-]/g,' ')
    .replace(/\s+/g,' ')
    .trim();
  if(!q)return [];

  const terms=q.split(/\s+/).filter(t=>t.length>=4);
  const scored=[];

  for(const cat of CATEGORIES){
    const level=Number(cat['Brottsnivå']||0);
    if(level<2 || level>6)continue;
    const name=String(cat.Brott||'').toLocaleLowerCase('sv');
    let score=0;

    for(const term of terms){
      if(name.includes(term))score+=term.length;
      if(term.startsWith('cykel') && /cykel/.test(name))score+=8;
      if(term.startsWith('stöld') && /stöld|tillgrepp/.test(name))score+=8;
    }

    if(score>0)scored.push({cat,score});
  }

  return scored
    .sort((a,b)=>b.score-a.score || Number(b.cat['Brottsnivå'])-Number(a.cat['Brottsnivå']))
    .slice(0,12)
    .map(x=>x.cat);
}

async function chatSpecificCrimeContext(year,municipality,question){
  if(!municipality)return null;
  const matches=chatSpecificCrimeMatches(question);
  if(!matches.length)return null;

  const ids=matches.map(c=>Number(c.Brott_ID)).filter(Number.isFinite);
  const [rows,totalRows]=await Promise.all([
    query(`
      SELECT CAST("Brott_ID" AS INTEGER) AS crimeId,
             CAST("Antal" AS DOUBLE) AS count,
             CAST("Per100000" AS DOUBLE) AS rate
      FROM read_parquet('${parquetUrl(year)}')
      WHERE "Kommun"='${esc(municipality)}'
        AND "Brott_ID" IN (${ids.join(',')})
        AND "Antal">-555
    `),
    query(`
      SELECT CAST("Antal" AS DOUBLE) AS totalCount,
             CAST("Per100000" AS DOUBLE) AS totalRate
      FROM read_parquet('${parquetUrl(year)}')
      WHERE "Kommun"='${esc(municipality)}'
        AND "Brott_ID"=${Number(META.default_crime_id)}
        AND "Antal">-555
      LIMIT 1
    `)
  ]);

  const totalCount=Number(totalRows[0]?.totalCount);
  const totalRate=Number(totalRows[0]?.totalRate);
  const byId=new Map(rows.map(r=>[String(r.crimeId),r]));
  const out=matches.map(cat=>{
    const row=byId.get(String(cat.Brott_ID));
    if(!row)return null;
    return {
      crimeId:Number(cat.Brott_ID),
      hierarchyLevel:Number(cat['Brottsnivå']||0),
      category:conciseCrimeLabel(cat.Brott),
      fullCategory:String(cat.Brott),
      count:Number(row.count),
      rate:row.rate==null?null:Number(row.rate),
      totalReportedCrimes:Number.isFinite(totalCount)?totalCount:null,
      totalReportedRate:Number.isFinite(totalRate)?totalRate:null,
      shareOfAllReportedPercent:Number.isFinite(totalCount) && totalCount>0
        ? Number(row.count)/totalCount*100
        : null
    };
  }).filter(Boolean);

  return out.length ? {
    year,
    municipality,
    matches:out,
    note:'Specifika brottstyper söks i Brå-hierarkin på nivå 2–6. shareOfAllReportedPercent är brottstypens antal dividerat med Totalt antal brott för samma kommun och år.'
  } : null;
}

async function buildChatContext(question='',history=[]){
  const page=chatActivePage();
  let municipality=null,crimeId=null,metric=null,year=null,startYear=null,endYear=null;

  if(page==='overview'){
    municipality=el('overviewMunicipality')?.value;
    crimeId=el('overviewCrime')?.value;
    metric=el('overviewMetric')?.value;
    year=Number(el('overviewYear')?.value)||null;
  }else if(page==='trends'){
    municipality=el('trendMunicipality')?.value;
    crimeId=el('trendCrime')?.value;
    metric=el('trendMetric')?.value;
  }else if(page==='map'){
    crimeId=el('mapCrime')?.value;
    metric=el('mapMetric')?.value;
    const range=mapYearRange();
    startYear=range.start;endYear=range.end;
  }else if(page==='profile'){
    municipality=el('profileMunicipality')?.value;
    metric=el('profileMetric')?.value;
    const range=profileYearRange();
    startYear=range.start;endYear=range.end;
  }

  if(municipality==='__ALL__')municipality=null;

  const recentUserHistory=(history||[])
    .filter(m=>m?.role==='user')
    .slice(-3)
    .map(m=>String(m.content||''))
    .join(' ');
  const lookupQuestion=(recentUserHistory+' '+String(question||'')).trim();
  const q=String(lookupQuestion||'').toLocaleLowerCase('sv');
  const geography=chatQuestionGeography(lookupQuestion);
  const mentionedMunicipality=geography.municipalities.length===1
    ? geography.municipalities[0]
    : null;
  if(geography.municipalities.length>1){
    municipality=null;
  }else if(mentionedMunicipality){
    municipality=mentionedMunicipality;
  }

  const totalIntent=/\b(total|totalt|samtliga brott|alla brott|brottslighet(?:en)? totalt)\b/i.test(q);
  if(totalIntent) crimeId=String(META.default_crime_id);

  const categoryIntent=/\b(vanligast|vanligaste|mest förekommande|brottstyp(?:er)?|brottskategor(?:i|ier)|typ(?:er)? av brott)\b/i.test(q);

  const context={
    source:'Brottsförebyggande rådet (Brå)',
    report:'BRÅ brottsstatistik – Sveriges kommuner',
    page,municipality,crimeId:crimeId?Number(crimeId):null,
    crimeCategory:crimeId?chatCategoryName(crimeId):null,
    metric:chatMetricLabel(metric),
    selectedYear:year,startYear,endYear,
    availableYears:[META.start_year,META.latest_year],
    methodology:chatMethodologyContext(),
    geographyCapabilities:{
      municipalityLevel:true,
      municipalityCount:MUNICIPALITIES.length,
      countyLevelDerived:true,
      counties:chatCountyNames(),
      note:'Län byggs genom att gruppera kommuner. Länets frekvens per 100 000 beräknas som summa brott dividerat med summa härledd kommunbefolkning.'
    }
  };

  if(page==='handled'&&typeof window.getHandledChatContext==='function'){
    context.handled=window.getHandledChatContext();
  }
  if(page==='profile'){
    context.profile=await chatProfilePageContext();
  }
  if(page==='legislation'){
    context.legislation=await chatLegislationPageContext();
  }
  if(page==='method'){
    context.methodPage={
      purpose:'Förklara datakällor, definitioner, metod, jämförbarhet och begränsningar i rapporten.',
      guidance:'Använd methodology som primärt underlag. Var tydlig med skillnaden mellan anmälda brott, faktisk brottslighet och handlagda brott.'
    };
  }

  const comparisonYear=Number(year||endYear||META.latest_year);
  if(crimeId && geography.asksMunicipality){
    const municipalityRows=await chatMunicipalityComparison(comparisonYear,crimeId);
    const wanted=new Set(geography.municipalities);
    const sorted=municipalityRows.slice().sort((a,b)=>(Number(b.rate)||-Infinity)-(Number(a.rate)||-Infinity));
    const comparisonRows=wanted.size
      ? municipalityRows.filter(r=>wanted.has(r.municipality))
      : sorted;
    context.municipalityComparison={
      year:comparisonYear,
      category:chatCategoryName(crimeId),
      requestedMunicipalities:[...wanted],
      rows:comparisonRows,
      complete:wanted.size===0 || comparisonRows.length===wanted.size,
      note:'Kommunvärden kommer direkt från Brå-underlaget. Om requestedMunicipalities innehåller flera namn ska rows användas som huvudunderlag för jämförelsen.'
    };
  }

  const specificCrimeContext=await chatSpecificCrimeContext(comparisonYear,municipality,lookupQuestion);
  if(specificCrimeContext){
    context.specificCrime=specificCrimeContext;
  }

  if(categoryIntent && municipality){
    const categoryData=await chatCategoryComparison(comparisonYear,municipality);
    context.categoryComparison={
      year:comparisonYear,
      municipality,
      hierarchyLevel:categoryData.level,
      rows:categoryData.rows,
      note:'Kategorierna jämförs inom samma Brå-hierarkinivå för att undvika att över- och underkategorier dubbelräknas. Raderna är sorterade efter antal brott.'
    };
  }

  if(crimeId && geography.asksCounty){
    let countyRows=await chatCountyComparison(comparisonYear,crimeId);
    if(geography.counties.length){
      const wanted=new Set(geography.counties);
      countyRows=countyRows.filter(r=>wanted.has(r.county));
    }
    context.countyComparison={
      year:comparisonYear,
      category:chatCategoryName(crimeId),
      rows:countyRows,
      rateMethod:'summa kommunala brott / summa härledd kommunbefolkning × 100 000',
      populationMethod:'kommunbefolkning ≈ totalt antal brott / totalt antal brott per 100 000 × 100 000',
      caution:'Härledd befolkning och länsfrekvens kan avvika något på grund av avrundning i publicerade kommunfrekvenser.'
    };
  }

  if(municipality && crimeId){
    const series=await query(`
      SELECT CAST("År" AS INTEGER) AS year,
             CAST("Antal" AS DOUBLE) AS count,
             CAST("Per100000" AS DOUBLE) AS rate
      FROM read_parquet(${allParquetSql()})
      WHERE "Kommun"='${esc(municipality)}'
        AND "Brott_ID"=${Number(crimeId)}
        AND "Antal">-555
      ORDER BY "År"
    `);
    context.series=series.map(r=>({year:Number(r.year),count:Number(r.count),rate:r.rate==null?null:Number(r.rate)}));

    const valid=context.series.filter(r=>Number.isFinite(r.count));
    if(valid.length){
      const first=valid[0], latest=valid[valid.length-1];
      const minRow=valid.reduce((a,b)=>b.count<a.count?b:a);
      const maxRow=valid.reduce((a,b)=>b.count>a.count?b:a);
      context.summary={
        firstYear:first.year,
        firstCount:first.count,
        firstRate:first.rate,
        latestYear:latest.year,
        latestCount:latest.count,
        latestRate:latest.rate,
        absoluteChange:latest.count-first.count,
        percentChange:first.count!==0?((latest.count-first.count)/first.count*100):null,
        minYear:minRow.year,
        minCount:minRow.count,
        maxYear:maxRow.year,
        maxCount:maxRow.count
      };
    }
  }
  return context;
}
function addChatMessage(role,text,extraClass=''){
  const box=el('chatMessages');if(!box)return;
  const div=document.createElement('div');
  div.className='chat-message '+role+(extraClass?' '+extraClass:'');
  div.textContent=text;
  box.appendChild(div);
  box.scrollTop=box.scrollHeight;
}
function setupChat(){
  const launcher=el('chatLauncher'),panel=el('chatPanel'),close=el('chatClose'),form=el('chatForm'),input=el('chatInput'),send=el('chatSend'),status=el('chatStatus');
  if(!launcher||!panel||!form)return;
  const chatHistory=[];
  const toggle=open=>{
    panel.classList.toggle('hidden',!open);
    launcher.setAttribute('aria-expanded',String(open));
    if(open)requestAnimationFrame(()=>input?.focus());
  };
  launcher.addEventListener('click',()=>toggle(panel.classList.contains('hidden')));
  close?.addEventListener('click',()=>toggle(false));
  input?.addEventListener('keydown',e=>{
    if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();form.requestSubmit();}
  });
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    const question=input.value.trim();
    if(!question)return;
    const endpoint=String(window.CRIME_CHAT_API_URL||'').trim();
    const recentHistory=chatHistory.slice(-8);
    addChatMessage('user',question);
    chatHistory.push({role:'user',content:question});
    input.value='';
    if(!endpoint){
      addChatMessage('assistant','Chatten är inlagd men AI-endpointen är ännu inte konfigurerad. Lägg Worker-URL:en i chat-config.js för att aktivera svar.','error');
      return;
    }
    send.disabled=true;status.textContent='Tar fram underlag…';
    try{
      const context=await buildChatContext(question,recentHistory);
      status.textContent='Frågar modellen…';
      const response=await fetch(endpoint,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({question,context,history:recentHistory})
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok){
        const detail=data.upstreamStatus
          ? data.error+' ('+data.upstreamStatus+'): '+(data.upstreamMessage||'okänt fel')
          : (data.error||('HTTP '+response.status));
        throw new Error(detail);
      }
      const answer=String(data.answer||'Inget svar returnerades.');
      addChatMessage('assistant',answer);
      chatHistory.push({role:'assistant',content:answer});
      if(chatHistory.length>12)chatHistory.splice(0,chatHistory.length-12);
    }catch(err){
      console.error(err);
      addChatMessage('assistant','Kunde inte hämta AI-svar: '+String(err.message||err),'error');
    }finally{
      send.disabled=false;status.textContent='';
    }
  });
}

async function main(){
  try{
    setLoading('Förbereder rapport…');
    [META,CATEGORIES,MUNICIPALITIES,MUNICIPAL_META,GEO]=await Promise.all([
      fetch('data/metadata.json?v=29',{cache:'no-store'}).then(r=>r.json()),
      fetch('data/categories.json?v=29',{cache:'no-store'}).then(r=>r.json()),
      fetch('data/municipalities.json?v=29',{cache:'no-store'}).then(r=>r.json()),
      fetch('data/municipality_meta.json?v=29',{cache:'no-store'}).then(r=>r.json()),
      fetch('data/municipalities.geojson?v=29',{cache:'no-store'}).then(r=>r.json())
    ]);
    loadFocusColorOverrides();
    await initDuck();
    setupTabs();setupControls();setupFocusColorPicker();initMap();renderMethod();setupChat();
    await refreshCrimeTreeForPage('overview');
    await refreshCrimeTreeForPage('trend');
    await refreshCrimeTreeForPage('map');
    await renderOverview();
    await renderTrend();
    await renderChangeRanking(false);
    await renderMap();
  }catch(err){
    console.error(err);
    setLoading('Fel: '+err.message);
  }
}
let profileResizeTimer=null;
window.addEventListener('resize',()=>{
  if(!el('page-profile')?.classList.contains('active') || !profileRendered)return;
  clearTimeout(profileResizeTimer);
  profileResizeTimer=setTimeout(()=>renderProfile(),180);
});

main();
