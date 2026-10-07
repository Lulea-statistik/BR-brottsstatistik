const ALLOWED_ORIGINS = new Set([
  "https://lulea-statistik.github.io"
]);

function cors(origin){
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://lulea-statistik.github.io",
    "Access-Control-Allow-Methods":"POST,OPTIONS",
    "Access-Control-Allow-Headers":"Content-Type",
    "Vary":"Origin"
  };
}

export default {
  async fetch(request, env) {
    const origin=request.headers.get("Origin")||"";
    if(request.method==="OPTIONS"){
      return new Response(null,{status:204,headers:cors(origin)});
    }
    if(request.method!=="POST"){
      return new Response("Method not allowed",{status:405,headers:cors(origin)});
    }
    if(!ALLOWED_ORIGINS.has(origin)){
      return Response.json({error:"Origin not allowed"},{status:403,headers:cors(origin)});
    }

    let body;
    try{ body=await request.json(); }
    catch{ return Response.json({error:"Invalid JSON"},{status:400,headers:cors(origin)}); }

    const question=String(body?.question||"").trim().slice(0,800);
    const context=body?.context||{};
    if(!question){
      return Response.json({error:"Question is required"},{status:400,headers:cors(origin)});
    }
    if(!env.MISTRAL_API_KEY){
      return Response.json({error:"MISTRAL_API_KEY is not configured"},{status:500,headers:cors(origin)});
    }

    const system=`Du är en statistikassistent för en svensk kommunal rapport om anmälda brott.
Svara endast utifrån statistikunderlaget som bifogas. Hitta aldrig på siffror eller saknade värden.
Svara som vanlig löpande svensk text. Skriv aldrig JSON, kodblock, programmeringssyntax eller fältnamn från underlaget.
Om underlaget innehåller "summary", använd i första hand de färdigberäknade värdena där.
Rapporten har kommunnivå för Sveriges kommuner. Säg aldrig att kommunuppgifter saknas om geographyCapabilities.municipalityLevel är true.
Om countyComparison finns får du jämföra län. Förklara vid behov kort att länsfrekvensen är beräknad genom summerade kommunvärden och härledd befolkning, inte ett oviktat medelvärde.
Om municipalityComparison finns får du jämföra, rangordna och beskriva kommuner utifrån dessa rader.
När municipalityComparison.requestedMunicipalities innehåller flera kommuner ska municipalityComparison.rows vara huvudkällan. Säg inte att en efterfrågad kommun saknas om den finns i rows.
Ignorera en eventuell enkelkommun-serie när frågan uttryckligen jämför två eller flera kommuner.
Om frågan gäller utveckling: beskriv riktning och storlek på förändringen och ange start- och slutår.
Skilj alltid på antal och per 100 000 invånare. Ange relevanta årtal och enheter.
Om underlaget inte räcker, säg kort vilken uppgift som saknas i stället för att konstruera ett tomt JSON-svar.
Svara kort, tydligt och sakligt på svenska, normalt 2–5 meningar. Avsluta med "Källa: Brå." när svaret innehåller statistik.`;

    const payload={
      model: env.MISTRAL_MODEL || "ministral-3b-2512",
      temperature:0.1,
      messages:[
        {role:"system",content:system},
        {role:"user",content:`Fråga: ${question}\n\nRapportunderlag (JSON):\n${JSON.stringify(context)}`}
      ]
    };

    const upstream=await fetch("https://api.mistral.ai/v1/chat/completions",{
      method:"POST",
      headers:{
        "Authorization":`Bearer ${env.MISTRAL_API_KEY}`,
        "Content-Type":"application/json"
      },
      body:JSON.stringify(payload)
    });

    const data=await upstream.json().catch(()=>({}));
    if(!upstream.ok){
      const upstreamMessage =
        data?.message ||
        data?.detail?.message ||
        (typeof data?.detail === "string" ? data.detail : null) ||
        data?.error?.message ||
        null;
      return Response.json({
        error:"Mistral request failed",
        upstreamStatus:upstream.status,
        upstreamMessage:upstreamMessage || "Okänt fel från Mistral API"
      },{status:502,headers:cors(origin)});
    }
    const answer=data?.choices?.[0]?.message?.content;
    return Response.json({answer:typeof answer==="string"?answer:"Inget svar returnerades."},{headers:cors(origin)});
  }
};
