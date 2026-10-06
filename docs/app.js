import * as duckdb from 'https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.32.0/+esm';

let META, CATEGORIES, MUNICIPALITIES, GEO;
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
  ['overviewCrime','trendCrime','mapCrime'].forEach(id=>fillSelect(id,cats,META.default_crime_id));
  ['overviewMunicipality','trendMunicipality'].forEach(id=>fillSelect(id,mun,META.default_municipality));
  ['overviewYear','mapYear'].forEach(id=>fillSelect(id,years,META.latest_year));

  el('overviewMunicipality').addEventListener('change',renderOverview);
  el('overviewCrime').addEventListener('change',renderOverview);
  el('overviewYear').addEventListener('change',renderOverview);
  el('trendMunicipality').addEventListener('change',renderTrend);
  el('trendCrime').addEventListener('change',renderTrend);
  el('trendMetric').addEventListener('change',renderTrend);
  el('mapYear').addEventListener('change',renderMap);
  el('mapCrime').addEventListener('change',renderMap);
  el('mapMetric').addEventListener('change',renderMap);
}

function setupTabs(){
  document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===btn));
    document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
    el('page-'+btn.dataset.page).classList.add('active');
    if(btn.dataset.page==='map'&&map)setTimeout(()=>map.invalidateSize(),30);
  }));
}

async function trendRows(municipality,crimeId){
  return query(`
    SELECT "År" AS year,
           MAX("Antal") AS count,
           MAX("Per100000") AS rate
    FROM read_parquet(${allParquetSql()})
    WHERE "Kommun"='${esc(municipality)}'
      AND "Brott_ID"=${Number(crimeId)}
      AND "Antal">-555
    GROUP BY "År"
    ORDER BY "År"
  `);
}

function drawLine(id,data,metric,label){
  destroyChart(id);
  charts[id]=new Chart(el(id),{
    type:'line',
    data:{labels:data.map(r=>r.year),datasets:[{label,data:data.map(r=>metric==='Antal'?r.count:r.rate),borderWidth:2,pointRadius:2,tension:.18}]},
    options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{display:false}},scales:{x:{grid:{display:false}},y:{beginAtZero:false,title:{display:true,text:label}}}}
  });
}

async function renderTrend(){
  setLoading('Laddar trend…');
  try{
    const municipality=el('trendMunicipality').value;
    const crimeId=el('trendCrime').value;
    const metric=el('trendMetric').value;
    const data=await trendRows(municipality,crimeId);
    const category=CATEGORIES.find(c=>String(c['Brott_ID'])===crimeId);
    el('trendTitle').textContent=municipality+' – '+(category?.Brott||'Brott');
    drawLine('trendChart',data,metric,metric==='Antal'?'Antal brott':'Brott per 100 000 inv.');
  }finally{setLoading(null);}
}

async function renderOverview(){
  setLoading('Laddar översikt…');
  try{
    const municipality=el('overviewMunicipality').value;
    const crimeId=el('overviewCrime').value;
    const year=Number(el('overviewYear').value);
    const file="'"+parquetUrl(year)+"'";
    const data=await query(`
      SELECT "Kommun", "Antal" AS count, "Per100000" AS rate
      FROM read_parquet(${file})
      WHERE "Brott_ID"=${Number(crimeId)} AND "Antal">-555
    `);
    const chosen=data.find(r=>r.Kommun===municipality);
    const ranked=data.filter(r=>Number.isFinite(Number(r.rate))).sort((a,b)=>Number(b.rate)-Number(a.rate));
    const rank=ranked.findIndex(r=>r.Kommun===municipality)+1;
    el('cardCount').textContent=chosen?fmt0.format(chosen.count):'–';
    el('cardRate').textContent=chosen&&chosen.rate!=null?fmt1.format(chosen.rate):'–';
    el('cardRank').textContent=rank>0?rank+' av '+ranked.length:'–';
    el('cardCoverage').textContent=String(data.length);

    const trend=await trendRows(municipality,crimeId);
    drawLine('overviewChart',trend,'Per100000','Brott per 100 000 inv.');
  }finally{setLoading(null);}
}

function quantiles(values,n=7){
  const v=values.filter(Number.isFinite).sort((a,b)=>a-b);
  if(!v.length)return [];
  const out=[];for(let i=1;i<n;i++){out.push(v[Math.min(v.length-1,Math.floor(i*v.length/n))]);}
  return [...new Set(out)];
}
const palette=['#eff6ff','#dbeafe','#bfdbfe','#93c5fd','#60a5fa','#3b82f6','#1d4ed8','#1e3a8a'];
function colorFor(v,cuts){
  if(!Number.isFinite(v))return '#e5e7eb';
  let i=0;while(i<cuts.length&&v>cuts[i])i++;
  return palette[Math.min(i,palette.length-1)];
}
function legendHtml(cuts,metric){
  const unit=metric==='Antal'?'':' /100 000';
  let prev=null;
  return [...cuts,null].map((cut,i)=>{
    const label=i===0?('≤ '+fmt1.format(cuts[0])):(cut==null?('> '+fmt1.format(cuts[cuts.length-1])):(fmt1.format(prev)+'–'+fmt1.format(cut)));
    prev=cut;
    return '<div class="legend-row"><span class="legend-box" style="background:'+palette[i]+'"></span><span>'+label+unit+'</span></div>';
  }).join('');
}

function initMap(){
  map=L.map('crimeMap',{zoomControl:true}).setView([62.2,16.5],5);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:16,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
}

async function renderMap(){
  setLoading('Laddar årskarta…');
  try{
    const year=Number(el('mapYear').value);
    const crimeId=el('mapCrime').value;
    const metric=el('mapMetric').value;
    const data=await query(`
      SELECT "Kommun", "Antal" AS count, "Per100000" AS rate
      FROM read_parquet('${parquetUrl(year)}')
      WHERE "Brott_ID"=${Number(crimeId)} AND "Antal">-555
    `);
    const byName=new Map(data.map(r=>[r.Kommun,r]));
    const values=data.map(r=>Number(metric==='Antal'?r.count:r.rate)).filter(Number.isFinite);
    const cuts=quantiles(values,7);
    if(geoLayer)geoLayer.remove();
    geoLayer=L.geoJSON(GEO,{
      style:f=>{
        const name=f.properties.Kommun;
        const row=byName.get(name);
        const value=row?Number(metric==='Antal'?row.count:row.rate):NaN;
        const special=name==='Luleå'?'#dc2626':name==='Boden'?'#d4a800':'#667085';
        return {color:special,weight:(name==='Luleå'||name==='Boden')?3:0.7,fillColor:colorFor(value,cuts),fillOpacity:.78};
      },
      onEachFeature:(f,layer)=>{
        const name=f.properties.Kommun;
        const row=byName.get(name);
        const value=row?(metric==='Antal'?row.count:row.rate):null;
        layer.bindTooltip('<b>'+name+'</b><br>'+(value==null?'Data saknas':(metric==='Antal'?fmt0.format(value):fmt1.format(value)+' per 100 000')));
      }
    }).addTo(map);
    if(!map._crimeFitDone){map.fitBounds(geoLayer.getBounds(),{padding:[6,6]});map._crimeFitDone=true;}
    const category=CATEGORIES.find(c=>String(c['Brott_ID'])===crimeId);
    el('mapTitle').textContent=year+' – '+(category?.Brott||'Brott');
    el('mapStatus').textContent=data.length+' kommuner med värde.';
    el('mapLegend').innerHTML=legendHtml(cuts,metric);
  }finally{setLoading(null);}
}

function renderMethod(){
  fetch('data/build.json?v=2',{cache:'no-store'}).then(r=>r.json()).then(b=>{
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
    [META,CATEGORIES,MUNICIPALITIES,GEO]=await Promise.all([
      fetch('data/metadata.json?v=2',{cache:'no-store'}).then(r=>r.json()),
      fetch('data/categories.json?v=2',{cache:'no-store'}).then(r=>r.json()),
      fetch('data/municipalities.json?v=2',{cache:'no-store'}).then(r=>r.json()),
      fetch('data/municipalities.geojson?v=2',{cache:'no-store'}).then(r=>r.json())
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
