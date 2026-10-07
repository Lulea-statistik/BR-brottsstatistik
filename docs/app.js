import * as duckdb from 'https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.32.0/+esm';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

let META, CATEGORIES, MUNICIPALITIES, MUNICIPAL_META, GEO;
let db, conn, map, geoLayer, mapAutoBounds, profileRendered=false;
const charts = {};
const fmt0 = new Intl.NumberFormat('sv-SE',{maximumFractionDigits:0});
const fmt1 = new Intl.NumberFormat('sv-SE',{maximumFractionDigits:1});

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
  if(!msg){x.classList.add('hidden');return;}
  const t=el('loadingText');
  if(t)t.textContent=msg;
  else x.textContent=msg;
  x.classList.remove('hidden');
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
  ['overviewMunicipality','trendMunicipality'].forEach(id=>fillSelect(id,mun,META.default_municipality));
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
  el('mapYearStart').addEventListener('input',()=>handleMapYearRange('start',false));
  el('mapYearEnd').addEventListener('input',()=>handleMapYearRange('end',false));
  el('mapYearStart').addEventListener('change',()=>handleMapYearRange('start',true));
  el('mapYearEnd').addEventListener('change',()=>handleMapYearRange('end',true));
  el('mapCrime').addEventListener('change',renderMap);
  el('mapMetric').addEventListener('change',renderMap);
  el('mapCounty').addEventListener('change',async()=>{await refreshCrimeTreeForPage('map');await renderMap();});
  el('mapSkrGroup').addEventListener('change',async()=>{await refreshCrimeTreeForPage('map');await renderMap();});

  el('profileMunicipality').addEventListener('change',renderProfile);
  el('profileMetric').addEventListener('change',renderProfile);
  el('profileCounty').addEventListener('change',async()=>{refreshProfileMunicipalities();await renderProfile();});
  el('profileSkrGroup').addEventListener('change',async()=>{refreshProfileMunicipalities();await renderProfile();});
  el('profileYearStart').addEventListener('input',()=>handleProfileYearRange('start',false));
  el('profileYearEnd').addEventListener('input',()=>handleProfileYearRange('end',false));
  el('profileYearStart').addEventListener('change',()=>handleProfileYearRange('start',true));
  el('profileYearEnd').addEventListener('change',()=>handleProfileYearRange('end',true));
}

function setupTabs(){
  document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===btn));
    document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
    el('page-'+btn.dataset.page).classList.add('active');
    if(btn.dataset.page==='map'&&map)setTimeout(async()=>{
      map.invalidateSize();
      await renderMap();
    },60);
    if(btn.dataset.page==='profile')setTimeout(async()=>{
      await renderProfile();
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
          ticks:info.isRank?{precision:0}:undefined
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
      r.Kommun==='Luleå' ||
      r.Kommun==='Boden'
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
                  ? fmt1.format(value)+(info.isCount?' brott':' per 100 000')
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
  const fmt=v=>info.isRank?fmt0.format(v):((metric==='Antal')?fmt0.format(v):fmt1.format(v));
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
  map=L.map('crimeMap',{zoomControl:true}).setView([62.2,16.5],5);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:16,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
}

function municipalityMeta(name){
  return MUNICIPAL_META.find(x=>x.Kommun===name);
}

function municipalityHighlight(name){
  if(name==='Luleå')return {line:'#dc2626',fill:'#dc2626',soft:'rgba(220,38,38,.22)',kind:'lulea'};
  if(name==='Boden')return {line:'#d4a800',fill:'#d4a800',soft:'rgba(212,168,0,.22)',kind:'boden'};
  const meta=municipalityMeta(name);
  if(meta?.Lan==='Norrbottens län'){
    return {line:'#6b7280',fill:'#6b7280',soft:'rgba(107,114,128,.24)',kind:'norrbotten'};
  }
  return null;
}

function mapFilterNames(){
  return new Set(filteredMunicipalityNames('mapCounty','mapSkrGroup'));
}

function swedenBounds(){
  const layer=L.geoJSON(GEO);
  return layer.getBounds();
}

function boundsForMunicipalities(names){
  if(!names || !names.size)return null;
  const layer=L.geoJSON(GEO,{filter:f=>names.has(f.properties.Kommun)});
  const bounds=layer.getBounds();
  return bounds && bounds.isValid()?bounds:null;
}

function fitMapToVisible(){
  if(!map)return;
  const bounds=(mapAutoBounds && mapAutoBounds.isValid()) ? mapAutoBounds : swedenBounds();
  if(bounds && bounds.isValid()){
    map.fitBounds(bounds,{padding:[18,18],maxZoom:9,animate:false});
  }
}

async function renderMap(){
  setLoading('Laddar årskarta…');
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
    addRanks(activeData);
    const rankedForMetric=addMetricRank(activeData,metric);

    const byName=new Map(data.map(r=>[r.Kommun,r]));
    mapAutoBounds=null;
    const municipalitiesWithCrime=new Set(activeData.map(r=>r.Kommun));
    const crimeBounds=boundsForMunicipalities(municipalitiesWithCrime);
    mapAutoBounds=(crimeBounds && crimeBounds.isValid()) ? crimeBounds : swedenBounds();

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
            label=fmt1.format(value)+(info.isCount?' brott i medel per år':' per 100 000 i medel per år');
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
        map.invalidateSize();
        fitMapToVisible();
      },30);
    }

    const category=CATEGORIES.find(c=>String(c['Brott_ID'])===crimeId);
    const yearText=multi?start+'–'+end:String(start);
    el('mapTitle').textContent=yearText+' – '+(category?.Brott||'Brott');

    const county=el('mapCounty').value;
    const skr=el('mapSkrGroup').value;
    const filterText=[county,skr].filter(Boolean).join(' · ');
    const valueCount=municipalitiesWithCrime.size;
    el('mapStatus').textContent=valueCount+' kommuner med brott'
      +(filterText?' · '+filterText:'')
      +(valueCount===0?' · inga kommuner har värde, kartan visar hela Sverige.':'. ');

    el('mapLegend').innerHTML=continuousLegendHtml(values,metric);
  }finally{setLoading(null);}
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
        ? fmt1.format(displayValue)+(info.isCount?' brott i medel per år':' per 100 000 i medel per år')
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
    if(w<70 || h<34)return;
    const group=d3.select(this);
    const share=total>0?100*d.value/total:0;
    const label=conciseCrimeLabel(d.data.name);
    const words=label.split(/\s+/);
    const maxChars=Math.max(8,Math.floor(w/7));
    let line='',lines=[];
    for(const word of words){
      const test=(line+' '+word).trim();
      if(test.length>maxChars && line){lines.push(line);line=word;}
      else line=test;
      if(lines.length>=2)break;
    }
    if(line && lines.length<2)lines.push(line);
    const fs=w<120?10:12;
    const text=group.append('text').attr('class','profile-tile-label').attr('x',7).attr('y',16).style('font-size',fs+'px');
    lines.slice(0,2).forEach((ln,i)=>text.append('tspan').attr('x',7).attr('dy',i===0?0:fs+2).text(ln));
    if(h>55){
      group.append('text').attr('class','profile-tile-share').attr('x',7).attr('y',h-8).style('font-size','10px').text(fmt1.format(share)+' %');
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
async function buildChatContext(question=''){
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

  const q=String(question||'').toLocaleLowerCase('sv');
  const mentionedMunicipality=MUNICIPALITIES.find(name=>q.includes(String(name).toLocaleLowerCase('sv')));
  if(mentionedMunicipality) municipality=mentionedMunicipality;

  const totalIntent=/\b(total|totalt|samtliga brott|alla brott|brottslighet(?:en)? totalt)\b/i.test(q);
  if(totalIntent) crimeId=String(META.default_crime_id);

  const context={
    source:'Brottsförebyggande rådet (Brå), anmälda brott',
    report:'BRÅ brottsstatistik – Sveriges kommuner',
    page,municipality,crimeId:crimeId?Number(crimeId):null,
    crimeCategory:crimeId?chatCategoryName(crimeId):null,
    metric:chatMetricLabel(metric),
    selectedYear:year,startYear,endYear,
    availableYears:[META.start_year,META.latest_year]
  };

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
    addChatMessage('user',question);
    input.value='';
    if(!endpoint){
      addChatMessage('assistant','Chatten är inlagd men AI-endpointen är ännu inte konfigurerad. Lägg Worker-URL:en i chat-config.js för att aktivera svar.','error');
      return;
    }
    send.disabled=true;status.textContent='Tar fram underlag…';
    try{
      const context=await buildChatContext(question);
      status.textContent='Frågar modellen…';
      const response=await fetch(endpoint,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({question,context})
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok){
        const detail=data.upstreamStatus
          ? data.error+' ('+data.upstreamStatus+'): '+(data.upstreamMessage||'okänt fel')
          : (data.error||('HTTP '+response.status));
        throw new Error(detail);
      }
      addChatMessage('assistant',String(data.answer||'Inget svar returnerades.'));
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
    await initDuck();
    setupTabs();setupControls();initMap();renderMethod();setupChat();
    await refreshCrimeTreeForPage('overview');
    await refreshCrimeTreeForPage('trend');
    await refreshCrimeTreeForPage('map');
    await renderOverview();
    await renderTrend();
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
