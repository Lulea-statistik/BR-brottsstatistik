import * as duckdb from 'https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.32.0/+esm';

let META, CATEGORIES, MUNICIPALITIES, MUNICIPAL_META, GEO;
let db, conn, map, geoLayer;
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
  ['overviewYear','mapYear'].forEach(id=>fillSelect(id,years,META.latest_year));
  const countyItems=[{value:'',text:'Alla län'},...counties.map(x=>({value:x,text:x}))];
  const skrItems=[{value:'',text:'Alla kommungrupper'},...skrGroups.map(([value,text])=>({value,text}))];
  fillSelect('mapCounty',countyItems,'');
  fillSelect('mapSkrGroup',skrItems,'');
  fillSelect('overviewCounty',countyItems,'');
  fillSelect('overviewSkrGroup',skrItems,'');
  refreshOverviewMunicipalities();
  fillSelect('trendCounty',countyItems,'');
  fillSelect('trendSkrGroup',skrItems,'');

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
  el('mapYear').addEventListener('change',renderMap);
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
  RankPer100000: {line:'#7c3aed', fill:'rgba(124,58,237,.15)', gradient:['#ede9fe','#a78bfa','#4c1d95']}
};

function metricInfo(metric){
  const isCount = metric === 'Antal' || metric === 'RankAntal';
  const isRank = metric === 'RankAntal' || metric === 'RankPer100000';
  return {
    metric,
    isCount,
    isRank,
    field: isCount ? 'count' : 'rate',
    style: METRIC_STYLES[metric] || METRIC_STYLES.Per100000,
    label: metric === 'Antal' ? 'Antal brott'
      : metric === 'Per100000' ? 'Brott per 100 000 inv.'
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
  return row.rankRate;
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
    const data=await trendRows(municipality,crimeId,metric,cohort);
    const category=CATEGORIES.find(c=>String(c['Brott_ID'])===crimeId);
    const info=metricInfo(metric);
    const county=el('trendCounty').value;
    const skr=el('trendSkrGroup').value;
    const scope=[county,skr].filter(Boolean).join(' · ');
    el('trendTitle').textContent=municipality+' – '+(category?.Brott||'Brott')+(scope?' · '+scope:'');
    drawLine('trendChart',data,metric,info.label);
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
  fillSelect(
    'trendMunicipality',
    names.map(x=>({value:x,text:x})),
    names.includes(current)?current:(names.includes(META.default_municipality)?META.default_municipality:names[0])
  );
}

function drawFunnel(id,data,metric,selectedMunicipality){
  const info=metricInfo(metric);
  destroyChart(id);
  const ranked=data
    .filter(r=>Number.isFinite(Number(metricValue(r,metric))))
    .slice()
    .sort((a,b)=>info.isRank
      ? Number(metricValue(a,metric))-Number(metricValue(b,metric))
      : Number(metricValue(b,metric))-Number(metricValue(a,metric)));

  let shown=selectedMunicipality==='__ALL__' ? ranked : ranked.slice(0,15);
  const selected=ranked.find(r=>r.Kommun===selectedMunicipality);
  if(selected && !shown.some(r=>r.Kommun===selectedMunicipality)) shown=[...shown,selected];
  const wrap=el('overviewChartWrap');
  if(wrap) wrap.style.height=Math.max(500,shown.length*22)+'px';

  const total=ranked.length;
  const widths=shown.map(r=>{
    if(info.isRank){
      const rank=Number(metricValue(r,metric));
      return Math.max(1,total-rank+1);
    }
    return Math.max(0,Number(metricValue(r,metric)));
  });
  const maxWidth=Math.max(...widths,1);
  const bars=widths.map(v=>[-v/(2*maxWidth),v/(2*maxWidth)]);
  const values=shown.map(r=>metricValue(r,metric));

  charts[id]=new Chart(el(id),{
    type:'bar',
    data:{
      labels:shown.map(r=>r.Kommun),
      datasets:[{
        data:bars,
        backgroundColor:shown.map(r=>r.Kommun===selectedMunicipality?info.style.line:info.style.fill),
        borderColor:info.style.line,
        borderWidth:1.2,
        borderRadius:3,
        barPercentage:.82,
        categoryPercentage:.88
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
          callbacks:{
            label:ctx=>{
              const value=values[ctx.dataIndex];
              return info.isRank
                ? 'Placering '+fmt0.format(value)+' av '+total
                : info.isCount
                  ? fmt0.format(value)+' brott'
                  : fmt1.format(value)+' per 100 000';
            }
          }
        }
      },
      scales:{
        x:{display:false,stacked:false,min:-.52,max:.52},
        y:{grid:{display:false},ticks:{autoSkip:false,font:{size:11}}}
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
  let t=max===min?.5:(value-min)/(max-min);
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
  const fmt=v=>info.isRank?fmt0.format(v):(metric==='Antal'?fmt0.format(v):fmt1.format(v));
  const suffix=metric==='Per100000'?' /100 000':'';
  return '<div class="gradient-legend" style="background:linear-gradient(90deg,'+colors.join(',')+')"></div>'+
    '<div class="gradient-labels"><span>'+fmt(min)+suffix+'</span><span>'+fmt(mid)+suffix+'</span><span>'+fmt(max)+suffix+'</span></div>';
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

function fitMapToVisible(){
  if(!map || !geoLayer)return;
  const bounds=geoLayer.getBounds();
  if(bounds && bounds.isValid()){
    map.fitBounds(bounds,{padding:[12,12],maxZoom:7});
  }
}

async function renderMap(){
  setLoading('Laddar årskarta…');
  try{
    const year=Number(el('mapYear').value);
    const crimeId=el('mapCrime').value;
    const metric=el('mapMetric').value;
    const info=metricInfo(metric);
    let data=await query(`
      SELECT "Kommun",
             CAST("Antal" AS DOUBLE) AS count,
             CAST("Per100000" AS DOUBLE) AS rate
      FROM read_parquet('${parquetUrl(year)}')
      WHERE "Brott_ID"=${Number(crimeId)} AND "Antal">-555
    `);
    const visibleNames=mapFilterNames();
    data=data.filter(r=>visibleNames.has(r.Kommun));
    addRanks(data);
    const byName=new Map(data.map(r=>[r.Kommun,r]));
    const values=data.map(r=>Number(metricValue(r,metric))).filter(Number.isFinite);
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
        return {color:special,weight:(name==='Luleå'||name==='Boden')?3:0.7,fillColor:continuousColor(value,minValue,maxValue,metric),fillOpacity:.82};
      },
      onEachFeature:(f,layer)=>{
        const name=f.properties.Kommun;
        const row=byName.get(name);
        const value=row?metricValue(row,metric):null;
        const rankedTotal=data.filter(r=>Number.isFinite(Number(info.isCount?r.count:r.rate))).length;
        let label='Data saknas';
        if(value!=null){
          label=info.isRank
            ? 'Placering '+fmt0.format(value)+' av '+rankedTotal
            : (metric==='Antal'?fmt0.format(value):fmt1.format(value)+' per 100 000');
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
    el('mapTitle').textContent=year+' – '+(category?.Brott||'Brott');
    const county=el('mapCounty').value;
    const skr=el('mapSkrGroup').value;
    const filterText=[county,skr].filter(Boolean).join(' · ');
    el('mapStatus').textContent=data.length+' kommuner med värde'
      +(filterText?' · '+filterText:'')
      +'. '+(info.isRank?'Placering 1 = högst värde inom visat urval.':'');
    el('mapLegend').innerHTML=continuousLegendHtml(values,metric);
  }finally{setLoading(null);}
}

function renderMethod(){
  fetch('data/build.json?v=7',{cache:'no-store'}).then(r=>r.json()).then(b=>{
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
      fetch('data/metadata.json?v=7',{cache:'no-store'}).then(r=>r.json()),
      fetch('data/categories.json?v=7',{cache:'no-store'}).then(r=>r.json()),
      fetch('data/municipalities.json?v=7',{cache:'no-store'}).then(r=>r.json()),
      fetch('data/municipality_meta.json?v=7',{cache:'no-store'}).then(r=>r.json()),
      fetch('data/municipalities.geojson?v=7',{cache:'no-store'}).then(r=>r.json())
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
