const BAND_RANGES = {
  "120m":[2300,2495],"90m":[3200,3400],"75m":[3900,4000],"60m":[4750,5060],
  "49m":[5900,6200],"41m":[7200,7600],"31m":[9400,9900],"25m":[11600,12100],
  "22m":[13570,13870],"19m":[15100,15800],"16m":[17480,17900],
  "13m":[21450,21850],"11m":[25670,26100]
};

const BAND_ORDER = Object.keys(BAND_RANGES);
const RX = { lat:62.0, lon:25.0, label:"Northern Europe profile" };

function toRad(v){return v*Math.PI/180}
function toDeg(v){return v*180/Math.PI}
function distanceKm(a,b,c,d){
  const R=6371,dl=toRad(c-a),dn=toRad(d-b);
  const x=Math.sin(dl/2)**2+Math.cos(toRad(a))*Math.cos(toRad(c))*Math.sin(dn/2)**2;
  return Math.round(R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x)));
}
function bearing(a,b,c,d){
  const y=Math.sin(toRad(d-b))*Math.cos(toRad(c));
  const x=Math.cos(toRad(a))*Math.sin(toRad(c))-Math.sin(toRad(a))*Math.cos(toRad(c))*Math.cos(toRad(d-b));
  return Math.round((toDeg(Math.atan2(y,x))+360)%360);
}
function compass(deg){
  const dirs=["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
  return dirs[Math.round(deg/22.5)%16];
}
function utcMinutesNow(date=new Date()){return date.getUTCHours()*60+date.getUTCMinutes()}
function timeToMinutes(v){
  if(!v)return null; v=String(v).trim(); if(v==="2400")return 1440;
  v=v.padStart(4,"0"); const h=Number(v.slice(0,2)),m=Number(v.slice(2,4));
  return Number.isFinite(h)&&Number.isFinite(m)?h*60+m:null;
}
function onAir(item,now=new Date()){
  const n=utcMinutesNow(now),s=timeToMinutes(item.start),e=timeToMinutes(item.end);
  if(s===null||e===null)return false;
  if(s===e)return true; if(s<e)return n>=s&&n<e; return n>=s||n<e;
}
function dayOfYear(date){const start=new Date(Date.UTC(date.getUTCFullYear(),0,0));return Math.floor((date-start)/86400000)}
function solarElevation(lat,lon,date=new Date()){
  const day=dayOfYear(date),hour=date.getUTCHours()+date.getUTCMinutes()/60;
  const decl=23.44*Math.sin(toRad((360/365)*(day-81)));
  const solarTime=hour+lon/15,hourAngle=15*(solarTime-12);
  return toDeg(Math.asin(Math.sin(toRad(lat))*Math.sin(toRad(decl))+Math.cos(toRad(lat))*Math.cos(toRad(decl))*Math.cos(toRad(hourAngle))));
}
function modeFor(lat,lon,date=new Date()){const e=solarElevation(lat,lon,date);return e>8?"Day":e>-6?"Twilight":"Night"}
function conditionScore(band,mode){
  const s={
    Day:{"120m":15,"90m":20,"75m":25,"60m":35,"49m":50,"41m":65,"31m":80,"25m":75,"22m":65,"19m":55,"16m":40,"13m":25,"11m":15},
    Twilight:{"120m":35,"90m":45,"75m":55,"60m":65,"49m":85,"41m":80,"31m":75,"25m":55,"22m":40,"19m":30,"16m":20,"13m":15,"11m":10},
    Night:{"120m":60,"90m":70,"75m":80,"60m":85,"49m":95,"41m":88,"31m":60,"25m":35,"22m":25,"19m":15,"16m":10,"13m":5,"11m":5}
  }; return s[mode]?.[band]??0;
}
function assistantBandScore(band,mode,count,sw){
  let score=conditionScore(band,mode)+Math.min(25,count*.25);
  const kp=Number(sw?.kp||0),sfi=Number(sw?.sfi||100);
  const low=["120m","90m","75m","60m","49m"],high=["25m","22m","19m","16m","13m","11m"];
  if(kp>=5)score-=20; else if(kp>=4)score-=10;
  if(sfi>=130&&high.includes(band))score+=18;
  if(sfi<90&&low.includes(band))score+=8;
  return Math.round(score);
}
function pathAwareness(item,date=new Date()){
  if(!item.txLat||!item.txLon)return {label:"Unknown path",score:0};
  const band=item.band||"",rx=modeFor(RX.lat,RX.lon,date),tx=modeFor(Number(item.txLat),Number(item.txLon),date);
  const grey=rx==="Twilight"||tx==="Twilight",nn=rx==="Night"&&tx==="Night",dd=rx==="Day"&&tx==="Day";
  const low=["120m","90m","75m","60m","49m"],mid=["41m","31m"],high=["25m","22m","19m","16m","13m","11m"];
  if(grey)return {label:"Greyline potential",score:low.includes(band)?95:85};
  if(low.includes(band))return nn?{label:"Strong low-band path",score:90}:dd?{label:"Daylight absorption likely",score:25}:{label:"Transition low-band path",score:65};
  if(mid.includes(band))return nn?{label:"Good night path",score:78}:dd?{label:"Usable daytime path",score:62}:{label:"Mixed mid-band path",score:70};
  if(high.includes(band))return dd?{label:"Good high-band daylight path",score:82}:nn?{label:"High-band night risk",score:35}:{label:"Transition high-band path",score:58};
  return {label:nn?"Night path":dd?"Daylight path":"Mixed path",score:nn?80:dd?50:60};
}
function season(date=new Date()){const m=date.getUTCMonth()+1;return [12,1,2].includes(m)?"winter":[6,7,8].includes(m)?"summer":"transition"}
function dxScore(item,path,aware,sw,date=new Date()){
  let score=path.distance?Math.min(50,path.distance/200):0;
  score+=aware.score||0;
  if(item.country&&item.country!=="CLA")score+=5;
  if(item.country==="CLA")score+=20;
  if(["49m","41m","31m"].includes(item.band))score+=8;
  const kp=Number(sw?.kp||0),sfi=Number(sw?.sfi||100),x=String(sw?.xray||"").toLowerCase();
  const low=["120m","90m","75m","60m","49m"],mid=["41m","31m"],high=["25m","22m","19m","16m","13m","11m"];
  if(kp>=5){score-=18;if(low.includes(item.band))score-=18}else if(kp>=4)score-=8;
  if(sfi>=150&&high.includes(item.band))score+=22;else if(sfi>=120&&high.includes(item.band))score+=12;
  if(sfi<90&&high.includes(item.band))score-=22;
  if((x.includes("m-class")||x.includes("x-class"))&&high.includes(item.band))score-=25;
  if(sfi>=120&&mid.includes(item.band))score+=6;
  const se=season(date);
  if(se==="summer"){if(["120m","90m","75m","60m"].includes(item.band))score-=18;if(item.band==="49m"&&path.distance>7000)score-=12;if(["19m","16m","13m"].includes(item.band))score+=10}
  if(se==="winter"){if(["49m","60m","75m"].includes(item.band))score+=15;if(path.distance>5000)score+=10}
  if(se==="transition"&&aware.label==="Greyline potential")score+=10;
  if(kp>=5){score-=20;if(high.includes(item.band))score-=15}
  if(sfi>=140&&high.includes(item.band))score+=25;
  if(sfi>=110&&item.band==="31m")score+=10;
  if(sfi<90&&low.includes(item.band))score+=10;
  return Math.max(0,Math.round(score));
}
function formatSite(i){return i.txSite||i.txCode||i.type||"—"}
function opening(band,score){
  if(score>=120)return `${band} is calling right now.`;
  if(score>=90)return `${band} is worth checking first.`;
  return `${band} is probably your best bet right now.`;
}
function analysis(band,mode,count,sw){
  const p=[];
  if(mode==="Night")p.push("Night-time propagation currently favours the lower shortwave bands.");
  if(mode==="Twilight")p.push("Greyline conditions are developing and can produce surprisingly long paths.");
  if(mode==="Day")p.push("Daylight propagation is supporting the higher HF bands.");
  p.push(`${count} broadcasts are currently active on ${band}.`);
  const kp=Number(sw?.kp||0),sfi=Number(sw?.sfi||100);
  if(kp<=2)p.push("Geomagnetic conditions are nice and quiet.");
  if(kp>=5)p.push("Geomagnetic activity may make long paths less predictable.");
  if(sfi>=140)p.push("Solar flux is helping the higher frequencies.");
  return p.join(" ");
}

export async function onRequestGet(context){
  const cacheKey=new Request(new URL(context.request.url).origin+"/api/bridge?v=2",{method:"GET"});
  const cache=caches.default;
  const hit=await cache.match(cacheKey);
  if(hit)return hit;

  const origin=new URL(context.request.url).origin;
  const [schedRes,swRes]=await Promise.all([
    fetch(origin+"/data/schedules.json",{cf:{cacheTtl:300,cacheEverything:true}}),
    fetch(origin+"/data/space-weather.json",{cf:{cacheTtl:120,cacheEverything:true}})
  ]);
  if(!schedRes.ok||!swRes.ok)return new Response(JSON.stringify({error:"source unavailable"}),{status:503,headers:{"content-type":"application/json"}});
  const [data,sw]=await Promise.all([schedRes.json(),swRes.json()]);
  const schedules=Array.isArray(data?.schedules)?data.schedules:[];
  const now=new Date();

  // Match the default Shortwave.sbs view: EiBi enabled.
  const active=schedules.filter(i=>String(i.source||"").split("+").map(x=>x.trim()).includes("EiBi")&&onAir(i,now));
  const mode=modeFor(RX.lat,RX.lon,now);

  const rankedBands=BAND_ORDER.map(band=>{
    const count=active.filter(i=>i.band===band).length;
    return {band,active_count:count,score:assistantBandScore(band,mode,count,sw)};
  }).filter(x=>x.active_count>0).sort((a,b)=>b.score-a.score);
  const guide=rankedBands[0]||{band:"49m",active_count:0,score:0};

  const candidateRows=active.filter(i=>i.txLat&&i.txLon&&i.station&&i.freq).map(i=>{
    const dist=distanceKm(RX.lat,RX.lon,Number(i.txLat),Number(i.txLon));
    const br=bearing(RX.lat,RX.lon,Number(i.txLat),Number(i.txLon));
    const aware=pathAwareness(i,now);
    return {item:i,distance:dist,bearing:br,compass:compass(br),awareness:aware,score:dxScore(i,{distance:dist},aware,sw,now)};
  }).sort((a,b)=>b.score-a.score||b.distance-a.distance);

  const selected=[],stations=new Set(),freqs=new Set();
  for(const c of candidateRows){
    const s=String(c.item.station||"").trim().toLowerCase(),f=String(c.item.freq||"");
    if(stations.has(s)||freqs.has(f))continue;
    stations.add(s);freqs.add(f);selected.push(c);
    if(selected.length>=6)break;
  }

  const guideFreqs=[...new Set(active.filter(i=>i.band===guide.band).map(i=>Number(i.freq)).filter(Number.isFinite))].sort((a,b)=>a-b).slice(0,3);
  let note="Nothing really stands out just yet.";
  if(guideFreqs.length===1)note=`I'd check ${guideFreqs[0]} kHz first.`;
  if(guideFreqs.length===2)note=`I'd check ${guideFreqs[0]} and ${guideFreqs[1]} kHz first.`;
  if(guideFreqs.length>=3)note=`I'd check ${guideFreqs[0]}, ${guideFreqs[1]} and ${guideFreqs[2]} kHz first.`;

  const payload={
    version:2,
    updated:new Date().toISOString(),
    profile:RX.label,
    guide:{
      band:guide.band,mode,score:guide.score,active_count:guide.active_count,
      headline:opening(guide.band,guide.score),
      analysis:analysis(guide.band,mode,guide.active_count,sw),
      note
    },
    best_dx:selected.map(c=>({
      station:c.item.station||"Unknown station",
      frequency:Number(c.item.freq),
      site:formatSite(c.item),
      country:c.item.country||"",
      distance_km:c.distance,bearing:c.bearing,compass:c.compass,
      score:c.score,path:c.awareness.label
    })),
    space_weather:{
      updated:sw.updated||null,kp:sw.kp??null,sfi:sw.sfi??null,
      aIndex:sw.aIndex??null,xray:sw.xray||null,aurora:Boolean(sw.aurora),hf:sw.hf||{}
    }
  };

  const response=new Response(JSON.stringify(payload),{
    headers:{
      "content-type":"application/json; charset=utf-8",
      "cache-control":"public, max-age=120, s-maxage=300",
      "access-control-allow-origin":"https://dxing.world"
    }
  });
  context.waitUntil(cache.put(cacheKey,response.clone()));
  return response;
}
