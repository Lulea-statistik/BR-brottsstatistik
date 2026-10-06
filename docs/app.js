import * as duckdb from 'https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.32.0/+esm';

let META, CATEGORIES, MUNICIPALITIES, MUNICIPAL_META, GEO;
let db, conn, map, geoLayer, mapAutoBounds;
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
  x.textContent=msg;x.classList.remove('hidden');
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
}
function buildCrimeTree(selectId){
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

  const byParent=new Map();
  CATEGORIES.forEach(cat=>{
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
  ['overviewCrime','trendCrime','mapCrime'].forEach(buildCrimeTree);
  document.addEventListener('click',()=>document.querySelectorAll('.crime-tree-menu').forEach(m=>m.classList.add('hidden')));
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
  ['mapYearStart','mapYearEnd'].forEach(id=>{
    el(id).min=String(minYear);
    el(id).max=String(maxYear);
    el(id).value=String(maxYear);
  });
  updateMapYearUi();
  const countyItems=[{value:'',text:'Alla län'},...counties.map(x=>({value:x,text:x}))];
  const skrItems=[{value:'',text:'Alla kommungrupper'},...skrGroups.map(([value,text])=>({value,text}))];
  fillSelect('mapCounty',countyItems,'');
  fillSelect('mapSkrGroup',skrItems,'');
  fillSelect('overviewCounty',countyItems,'');
  fillSelect('overviewSkrGroup',skrItems,'');
  refreshOverviewMunicipalities();
  fillSelect('trendCounty',countyItems,'');
  fillSelect('trendSkrGroup',skrItems,'');
  refreshTrendMunicipalities();
  setupCrimeTrees();

  el('overviewMunicipality').addEventListener('change',renderOverview);
  el('overviewCrime').addEventListener('change',renderOverview);
  el('overviewYear').addEventListener('change',renderOverview);
  el('overviewMetric').addEventListener('change',renderOverview);
  el('overviewCounty').addEventListener('change',async()=>{refreshOverviewMunicipalities();await renderOverview();});
  el('overviewSkrGroup').addEventListener('change',async()=>{refreshOverviewMunicipalities();await renderOverview();});
  el('trendMunicipality').addEventListener('change',renderTrend);
  el('trendCrime').addEventListener('change',renderTrend);
  el('trendMetric').addEventListener('change',renderTrend);
  el('trendCounty').addEventListener('change',async()=>{refreshTrendMunicipalities();await renderTrend();});
  el('trendSkrGroup').addEventListener('change',async()=>{refreshTrendMunicipalities();await renderTrend();});
  el('mapYearStart').addEventListener('input',()=>handleMapYearRange('start'));
  el('mapYearEnd').addEventListener('input',()=>handleMapYearRange('end'));
  el('mapCrime').addEventListener('change',renderMap);
  el('mapMetric').addEventListener('change',renderMap);
  el('mapCounty').addEventListener('change',renderMap);
  el('mapSkrGroup').addEventListener('change',renderMap);
}

function setupTabs(){
  document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===btn));
    document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
    el('page-'+btn.dataset.page).classList.add('active');
    if(btn.dataset.page==='map'&&map)setTimeout(()=>{
      map.invalidateSize();
      fitMapToVisible();
    },60);
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

function drawLine(id,data,metric,label){
  const info=metricInfo(metric);
  destroyChart(id);
  charts[id]=new Chart(el(id),{
    type:'line',
    data:{labels:data.map(r=>r.year),datasets:[{
      label,
      data:data.map(r=>metricValue(r,metric)),
      borderColor:info.style.line,
      backgroundColor:info.style.fill,
      borderWidth:2,
      pointRadius:2,
      pointBackgroundColor:info.style.line,
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
      drawLine('trendChart',data,metric,info.label);
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
  const selected=current==='__ALL__'?'__ALL__':
    (names.includes(current)?current:(names.includes(META.default_municipality)?META.default_municipality:'__ALL__'));
  fillSelect('overviewMunicipality',items,selected);
}

function refreshTrendMunicipalities(){
  const current=el('trendMunicipality').value;
  const names=filteredMunicipalityNames('trendCounty','trendSkrGroup')
    .sort((a,b)=>a.localeCompare(b,'sv'));
  const items=[{value:'__ALL__',text:'Alla'},...names.map(x=>({value:x,text:x}))];
  const selected=current==='__ALL__'?'__ALL__':
    (names.includes(current)?current:(names.includes(META.default_municipality)?META.default_municipality:'__ALL__'));
  fillSelect('trendMunicipality',items,selected);
}

function drawFunnel(id,data,metric,selectedMunicipality){
  const info=metricInfo(metric);
  destroyChart(id);
  const ranked=data
    .filter(r=>Number.isFinite(Number(metricValue(r,metric))))
    .slice()
    .sort((x,y)=>info.isRank
      ? Number(metricValue(x,metric))-Number(metricValue(y,metric))
      : Number(metricValue(y,metric))-Number(metricValue(x,metric)));

  const shown=selectedMunicipality==='__ALL__'
    ? ranked
    : ranked.filter((r,i)=>i<15 || r.Kommun===selectedMunicipality);
  const n=Math.max(shown.length,1);
  const barPct=n<=6 ? .72 : n<=20 ? .78 : n<=80 ? .86 : .96;
  const catPct=n<=6 ? .82 : n<=20 ? .88 : n<=80 ? .92 : 1;
  const values=shown.map(r=>metricValue(r,metric));

  charts[id]=new Chart(el(id),{
    type:'bar',
    data:{
      labels:shown.map(r=>r.Kommun),
      datasets:[{
        data:values,
        backgroundColor:shown.map(r=>r.Kommun===selectedMunicipality?info.style.line:info.style.fill),
        borderColor:info.style.line,
        borderWidth:n>120 ? .4 : 1,
        borderRadius:n>80 ? 0 : 3,
        barPercentage:barPct,
        categoryPercentage:catPct,
        maxBarThickness:n<=6 ? 120 : n<=20 ? 70 : undefined
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      animation:false,
      plugins:{
        legend:{display:false},
        tooltip:{
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
          grid:{display:false},
          ticks:{autoSkip:true,maxRotation:n>35 ? 90 : 45,minRotation:0,font:{size:n>100 ? 8 : 10}}
        },
        y:{
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

function handleMapYearRange(which){
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
  renderMap();
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
  const datasets=names.map(name=>({
    label:name,
    data:years.map(year=>metricValue(byKey.get(name+'|'+year),metric)),
    borderColor:info.style.line+'55',
    backgroundColor:'transparent',
    borderWidth:1,
    pointRadius:0,
    tension:.12,
    fill:false,
    spanGaps:true
  }));
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
    addRanks(data);

    const byName=new Map(data.map(r=>[r.Kommun,r]));
    const municipalitiesWithCrime=new Set(
      data.filter(r=>Number.isFinite(Number(r.count)) && Number(r.count)>0).map(r=>r.Kommun)
    );
    mapAutoBounds=boundsForMunicipalities(municipalitiesWithCrime) || swedenBounds();

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
        const special=name==='Luleå'?'#dc2626':name==='Boden'?'#d4a800':'#667085';
        const noCrime=!row || !Number.isFinite(Number(row.count)) || Number(row.count)<=0;
        return {
          color:special,
          weight:(name==='Luleå'||name==='Boden')?3:0.7,
          fillColor:noCrime?'transparent':continuousColor(value,minValue,maxValue,metric),
          fillOpacity:noCrime?0:.82
        };
      },
      onEachFeature:(f,layer)=>{
        const name=f.properties.Kommun;
        const row=byName.get(name);
        const value=row?metricValue(row,metric):null;
        const rankField=info.isCount?'count':'rate';
        const rankedTotal=data.filter(r=>Number.isFinite(Number(r[rankField]))).length;
        const noCrime=!row || !Number.isFinite(Number(row.count)) || Number(row.count)<=0;
        let label=noCrime?'0 brott':'Data saknas';
        if(!noCrime && value!=null){
          if(info.isRank){
            label='Placering '+fmt0.format(value)+' av '+rankedTotal;
          }else if(info.isAverage){
            label=fmt1.format(value)+(info.isCount?' brott i medel':' per 100 000 i medel');
          }else if(metric==='Antal'){
            label=fmt0.format(value)+(multi?' brott totalt':' brott');
          }else{
            label=fmt1.format(value)+(multi?' per 100 000, summa':' per 100 000');
          }
        }
        const meta=municipalityMeta(name);
        const extra=[
          meta?.Lan,
          meta?.SKR_Gruppkod && meta?.SKR_Kommungrupp ? meta.SKR_Gruppkod+' – '+meta.SKR_Kommungrupp : null
        ].filter(Boolean).join('<br>');
        layer.bindTooltip('<b>'+name+'</b><br>'+label+(extra?'<br>'+extra:''));
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
      +(valueCount===0?' · inga kommuner har värde, kartan visar hela Sverige.':'. ')
      +(info.isRank && valueCount>0?'Placering 1 = högst värde inom visat urval.':'');

    el('mapLegend').innerHTML=continuousLegendHtml(values,metric);
  }finally{setLoading(null);}
}

function renderMethod(){
  fetch('data/build.json?v=10',{cache:'no-store'}).then(r=>r.json()).then(b=>{
    el('methodMeta').innerHTML=
      '<p><b>Källa:</b> '+META.source+'</p>'+
      '<p><b>Period:</b> '+META.start_year+'–'+META.latest_year+'</p>'+
      '<p><b>Geometri:</b> '+b.geometry_source+'</p>'+
      '<p><b>Kommunpolygoner:</b> '+b.geometry_municipalities+'</p>';
  });
}

async function main(){
  try{
    setLoading('Förbereder rapport…');
    [META,CATEGORIES,MUNICIPALITIES,MUNICIPAL_META,GEO]=await Promise.all([
      fetch('data/metadata.json?v=10',{cache:'no-store'}).then(r=>r.json()),
      fetch('data/categories.json?v=10',{cache:'no-store'}).then(r=>r.json()),
      fetch('data/municipalities.json?v=10',{cache:'no-store'}).then(r=>r.json()),
      fetch('data/municipality_meta.json?v=10',{cache:'no-store'}).then(r=>r.json()),
      fetch('data/municipalities.geojson?v=10',{cache:'no-store'}).then(r=>r.json())
    ]);
    await initDuck();
    setupTabs();setupControls();initMap();renderMethod();
    await renderOverview();
    await renderTrend();
    await renderMap();
  }catch(err){
    console.error(err);
    setLoading('Fel: '+err.message);
  }
}
main();
