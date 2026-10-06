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
  fillSelect('mapCounty',[{value:'',text:'Alla län'},...counties.map(x=>({value:x,text:x}))],'');
  fillSelect('mapSkrGroup',[{value:'',text:'Alla kommungrupper'},...skrGroups.map(([value,text])=>({value,text}))],'');

  el('overviewMunicipality').addEventListener('change',renderOverview);
  el('overviewCrime').addEventListener('change',renderOverview);
  el('overviewYear').addEventListener('change',renderOverview);
  el('overviewMetric').addEventListener('change',renderOverview);
  el('trendMunicipality').addEventListener('change',renderTrend);
  el('trendCrime').addEventListener('change',renderTrend);
  el('trendMetric').addEventListener('change',renderTrend);
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

function metricInfo(metric){
  const isCount = metric === 'Antal' || metric === 'RankAntal';
  const isRank = metric === 'RankAntal' || metric === 'RankPer100000';
  return {
    metric,
    isCount,
    isRank,
    field: isCount ? 'count' : 'rate',
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

async function trendRows(municipality,crimeId,metric){
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

  const all=await query(`
    SELECT CAST("År" AS INTEGER) AS year,
           "Kommun",
           CAST("Antal" AS DOUBLE) AS count,
           CAST("Per100000" AS DOUBLE) AS rate
    FROM read_parquet(${allParquetSql()})
    WHERE "Brott_ID"=${Number(crimeId)}
      AND "Antal">-555
    ORDER BY "År"
  `);
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
  return out.sort((a,b)=>a.year-b.year);
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
    data:{labels:data.map(r=>r.year),datasets:[{label,data:data.map(r=>metricValue(r,metric)),borderWidth:2,pointRadius:2,tension:.18}]},
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
    const data=await trendRows(municipality,crimeId,metric);
    const category=CATEGORIES.find(c=>String(c['Brott_ID'])===crimeId);
    const info=metricInfo(metric);
    el('trendTitle').textContent=municipality+' – '+(category?.Brott||'Brott');
    drawLine('trendChart',data,metric,info.label);
  }finally{setLoading(null);}
}

async function renderOverview(){
  setLoading('Laddar översikt…');
  try{
    const municipality=el('overviewMunicipality').value;
    const crimeId=el('overviewCrime').value;
    const year=Number(el('overviewYear').value);
    const metric=el('overviewMetric').value;
    const info=metricInfo(metric);
    const file="'"+parquetUrl(year)+"'";
    const data=await query(`
      SELECT "Kommun",
             CAST("Antal" AS DOUBLE) AS count,
             CAST("Per100000" AS DOUBLE) AS rate
      FROM read_parquet(${file})
      WHERE "Brott_ID"=${Number(crimeId)} AND "Antal">-555
    `);
    addRanks(data);
    const chosen=data.find(r=>r.Kommun===municipality);
    const rankValue=chosen?(info.isCount?chosen.rankCount:chosen.rankRate):null;
    const rankedCount=data.filter(r=>Number.isFinite(Number(info.isCount?r.count:r.rate))).length;
    el('cardCount').textContent=chosen?fmt0.format(chosen.count):'–';
    el('cardRate').textContent=chosen&&chosen.rate!=null?fmt1.format(chosen.rate):'–';
    el('cardRankLabel').textContent=info.isCount?'Placering efter antal':'Placering per 100 000';
    el('cardRank').textContent=rankValue?rankValue+' av '+rankedCount:'–';
    el('cardCoverage').textContent=String(data.length);

    const trend=await trendRows(municipality,crimeId,metric);
    drawLine('overviewChart',trend,metric,info.label);
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
  const info=metricInfo(metric);
  if(info.isRank){
    let prev=null;
    return [...cuts,null].map((cut,i)=>{
      const label=i===0?('Placering 1–'+fmt0.format(cuts[0]))
        :(cut==null?('Placering '+(fmt0.format(cuts[cuts.length-1]+1))+'+')
        :('Placering '+fmt0.format(prev+1)+'–'+fmt0.format(cut)));
      prev=cut;
      const color=palette[Math.max(0,palette.length-1-i)];
      return '<div class="legend-row"><span class="legend-box" style="background:'+color+'"></span><span>'+label+'</span></div>';
    }).join('');
  }
  const unit=metric==='Antal'?'':' /100 000';
  let prev=null;
  return [...cuts,null].map((cut,i)=>{
    const label=i===0?('≤ '+fmt1.format(cuts[0])):(cut==null?('> '+fmt1.format(cuts[cuts.length-1])):(fmt1.format(prev)+'–'+fmt1.format(cut)));
    prev=cut;
    return '<div class="legend-row"><span class="legend-box" style="background:'+palette[i]+'"></span><span>'+label+unit+'</span></div>';
  }).join('');
}

function colorForMetric(v,cuts,metric){
  const info=metricInfo(metric);
  if(!Number.isFinite(v))return '#e5e7eb';
  let i=0;while(i<cuts.length&&v>cuts[i])i++;
  if(info.isRank) return palette[Math.max(0,palette.length-1-i)];
  return palette[Math.min(i,palette.length-1)];
}

function initMap(){
  map=L.map('crimeMap',{zoomControl:true}).setView([62.2,16.5],5);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:16,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
}

function municipalityMeta(name){
  return MUNICIPAL_META.find(x=>x.Kommun===name);
}

function mapFilterNames(){
  const county=el('mapCounty')?.value || '';
  const skr=el('mapSkrGroup')?.value || '';
  return new Set(
    MUNICIPAL_META
      .filter(x=>(!county || x.Lan===county) && (!skr || x.SKR_Gruppkod===skr))
      .map(x=>x.Kommun)
  );
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
    const cuts=quantiles(values,7);
    if(geoLayer)geoLayer.remove();
    geoLayer=L.geoJSON(GEO,{
      filter:f=>visibleNames.has(f.properties.Kommun),
      style:f=>{
        const name=f.properties.Kommun;
        const row=byName.get(name);
        const value=row?Number(metricValue(row,metric)):NaN;
        const special=name==='Luleå'?'#dc2626':name==='Boden'?'#d4a800':'#667085';
        return {color:special,weight:(name==='Luleå'||name==='Boden')?3:0.7,fillColor:colorForMetric(value,cuts,metric),fillOpacity:.78};
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
    el('mapLegend').innerHTML=legendHtml(cuts,metric);
  }finally{setLoading(null);}
}

function renderMethod(){
  fetch('data/build.json?v=5',{cache:'no-store'}).then(r=>r.json()).then(b=>{
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
      fetch('data/metadata.json?v=5',{cache:'no-store'}).then(r=>r.json()),
      fetch('data/categories.json?v=5',{cache:'no-store'}).then(r=>r.json()),
      fetch('data/municipalities.json?v=5',{cache:'no-store'}).then(r=>r.json()),
      fetch('data/municipality_meta.json?v=5',{cache:'no-store'}).then(r=>r.json()),
      fetch('data/municipalities.geojson?v=5',{cache:'no-store'}).then(r=>r.json())
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
