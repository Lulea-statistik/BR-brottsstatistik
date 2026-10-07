(() => {
  const TABLES = ['300','310','320'];
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
  let rows=[];

  function parseCSV(text){
    const out=[]; let row=[],field='',quoted=false;
    for(let i=0;i<text.length;i++){
      const c=text[i],n=text[i+1];
      if(c==='"'){
        if(quoted&&n==='"'){field+='"';i++;} else quoted=!quoted;
      }else if(c===','&&!quoted){row.push(field);field='';}
      else if((c==='\n'||c==='\r')&&!quoted){
        if(c==='\r'&&n==='\n')i++;
        row.push(field); if(row.some(v=>v!==''))out.push(row);
        row=[];field='';
      }else field+=c;
    }
    if(field||row.length){row.push(field);out.push(row)}
    if(!out.length)return[];
    const head=out.shift();
    return out.map(r=>Object.fromEntries(head.map((h,i)=>[h,r[i]??''])));
  }

  function fillSelect(id, values, preferred){
    const el=document.getElementById(id); if(!el)return;
    el.innerHTML='';
    values.forEach(v=>{
      const o=document.createElement('option');
      o.value=v.value;o.textContent=v.text;el.appendChild(o);
    });
    if([...el.options].some(o=>o.value===preferred))el.value=preferred;
  }

  function render(){
    const year=document.getElementById('handledYear')?.value;
    const region=document.getElementById('handledRegion')?.value;
    if(!year||!region)return;

    let available=0;
    TABLES.forEach(id=>{
      const matches=rows.filter(r=>r.table_id===id&&String(r.year)===String(year)&&r.region_code===region);
      const box=document.getElementById('handledFile'+id);
      const badge=document.getElementById('handledBadge'+id);
      if(!box||!badge)return;

      if(matches.length){
        available++;
        badge.textContent='Tillgänglig';
        badge.classList.add('available');
        const links=matches.map((r,i)=>'<a href="'+r.file_url+'" target="_blank" rel="noopener">'+
          (matches.length>1?'Källfil '+(i+1):'Öppna Brå-fil')+'</a>').join('');
        box.innerHTML='<div class="handled-file-meta"><strong>'+year+' · '+(REGION_NAMES[region]||region)+'</strong>'+
          '<span>'+matches.map(r=>r.file_name).join(' · ')+'</span></div><div class="handled-file-links">'+links+'</div>';
      }else{
        badge.textContent='Ingen fil hittad';
        badge.classList.remove('available');
        box.innerHTML='<div class="handled-empty">Ingen publicerad fil hittades i källkatalogen för detta urval.</div>';
      }
    });
    const status=document.getElementById('handledStatus');
    if(status)status.textContent=available+' av 3 tabeller har källfil för '+year+' · '+(REGION_NAMES[region]||region)+'.';
  }

  async function init(){
    const status=document.getElementById('handledStatus');
    try{
      const r=await fetch('data/handlagda_source_catalog.csv',{cache:'no-store'});
      if(!r.ok)throw new Error('HTTP '+r.status);
      rows=parseCSV(await r.text());
      if(!rows.length)throw new Error('Katalogen är tom');

      const years=[...new Set(rows.map(r=>String(r.year)).filter(Boolean))].sort((a,b)=>+b-+a);
      fillSelect('handledYear',years.map(y=>({value:y,text:y})),years[0]);

      const regions=[...new Set(rows.map(r=>r.region_code).filter(Boolean))];
      const ordered=REGION_ORDER.filter(x=>regions.includes(x));
      fillSelect('handledRegion',ordered.map(x=>({value:x,text:REGION_NAMES[x]||x})),ordered.includes('Rn01')?'Rn01':ordered[0]);

      document.getElementById('handledYear')?.addEventListener('change',render);
      document.getElementById('handledRegion')?.addEventListener('change',render);
      render();
    }catch(err){
      if(status)status.textContent='Kunde inte läsa källkatalogen: '+err.message;
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();