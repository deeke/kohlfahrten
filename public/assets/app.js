"use strict";
/* ================= Konfiguration ================= */
let ADMIN_MAIL = 'dc@bossel.de';     // wird vom Server (config.php) übernommen
const VOTE_KEY   = 'bossel_votes';
let CSRF = '', APP_VERSION = '';
const NEAR_KM    = 10;
const SHOW_GASTRO = true;
const RAFFLE_END_TS = Date.parse('2027-03-31T23:59:59+02:00');   // Gewinnspiel-Ende (Server prüft zusätzlich)
let RAFFLE_OPEN_SERVER = false;
const raffleOpen = () => RAFFLE_OPEN_SERVER && Date.now() <= RAFFLE_END_TS;   // Gasthäuser & Bollerwagenverleih öffentlich anzeigen? (true = einblenden)

const CATS = {
  kohlfahrt: {label:'Kohlfahrt',             icon:'fa-leaf',          color:'#1e8c0b'},
  bossel:    {label:'Boßeltour',             icon:'fa-bowling-ball',  color:'#1e88e5'},
  beides:    {label:'Kohlfahrt + Boßeln',    icon:'fa-champagne-glasses', color:'#f59e0b'}
};
const mk = a => a.map(([k,l,i])=>({k,l,i}));
const FEATURES = mk([
  ['teer','Teerstraße','fa-road'],['feldweg','Feldweg','fa-wheat-awn'],['waldweg','Waldweg','fa-tree'],
  ['schotter','Schotter / Pflaster','fa-cubes-stacked'],['deich','Deich / am Wasser','fa-water'],
  ['flach','flach','fa-ruler-horizontal'],['huegelig','hügelig','fa-mountain'],['verkehrsarm','verkehrsarm','fa-shield-halved'],
  ['graben','Gräben am Rand','fa-triangle-exclamation'],['bollerwagen','bollerwagentauglich','fa-trailer'],
  ['kinderwagen','kinderwagentauglich','fa-baby-carriage'],['einkehr','Einkehr unterwegs','fa-utensils'],['ziel','endet an Gaststätte','fa-flag-checkered'],['spielplatz','Platz für Spiele','fa-dice'],
  ['wc','WC unterwegs','fa-restroom'],['parken','Parkplatz am Start','fa-square-parking'],
  ['oepnv','Bus / Bahn erreichbar','fa-bus'],['hunde','hundefreundlich','fa-dog'],['beleuchtet','beleuchtet','fa-lightbulb']
]);
const GH_INKL = mk([
  ['gruenkohl','Grünkohl satt','fa-leaf'],['pinkel','Pinkel, Kassler & Kochwurst','fa-hotdog'],['vegetarisch','Vegetarische Option','fa-carrot'],
  ['schnaps','Begrüßungsschnaps','fa-whiskey-glass'],['musik','DJ / Live-Musik','fa-music'],['tanz','Tanzfläche','fa-compact-disc'],
  ['koenig','Kohlkönig-Krönung','fa-crown'],['strecke','Boßelstrecke ab Haus','fa-route'],['bollerwagen','Bollerwagen vor Ort','fa-trailer'],
  ['shuttle','Shuttle-Service','fa-van-shuttle'],['parkplatz','Großer Parkplatz','fa-square-parking'],['saal','Eigener Saal','fa-users']
]);
const VL_AUSST = mk([
  ['musikbox','Musikbox (Bluetooth)','fa-music'],['kuehlbox','Kühlbox','fa-snowflake'],['dach','Regendach / Plane','fa-umbrella'],
  ['sitz','Sitzbank','fa-chair'],['licht','LED-Beleuchtung','fa-lightbulb'],['luftreifen','Luftreifen (geländegängig)','fa-circle-dot'],
  ['bremse','Feststellbremse','fa-hand'],['kugeln','Boßelkugeln inklusive','fa-bowling-ball'],['getraenkehalter','Flaschenhalter','fa-wine-bottle'],
  ['schnaps','Schnapsglas-Halter','fa-whiskey-glass'],['getraenke','Getränkepaket buchbar','fa-beer-mug-empty'],['deko','Deko & Fahnen','fa-flag'],
  ['powerbank','Powerbank / USB','fa-battery-full'],['muell','Müllbeutel inklusive','fa-trash'],['erstehilfe','Erste-Hilfe-Set','fa-kit-medical'],
  ['lieferung','Lieferung & Abholung','fa-truck']
]);
const byKey = list => Object.fromEntries(list.map(f=>[f.k,f]));
const F = byKey(FEATURES), GI = byKey(GH_INKL), VA = byKey(VL_AUSST);
const TYPES = {
  route:   {coll:'routes',      label:'Strecke',            icon:'fa-route',    color:'#1e88e5'},
  gasthaus:{coll:'gasthaeuser', label:'Gaststätte',           icon:'fa-utensils', color:'#8d6e63'},
  verleih: {coll:'verleih',     label:'Bollerwagenverleih', icon:'fa-trailer',  color:'#f59e0b'}
};
const STATUS = {pending:['Ausstehend','fa-hourglass-half'],approved:['Freigegeben','fa-circle-check'],rejected:['Abgelehnt','fa-ban']};

/* ================= Helfer ================= */
const $  = (s,el=document)=>el.querySelector(s);
const $$ = (s,el=document)=>[...el.querySelectorAll(s)];
const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const avg = a => a&&a.length ? a.reduce((x,y)=>x+y,0)/a.length : 0;
const fmtKm = k => (k||0).toLocaleString('de-DE',{maximumFractionDigits:1})+' km';
const fmtEur = v => v===''||v==null||isNaN(v) ? '–' : (+v).toLocaleString('de-DE',{style:'currency',currency:'EUR'});
const fmtDate = t => new Date(t).toLocaleString('de-DE',{dateStyle:'medium',timeStyle:'short'});
const safeUrl = u => /^https?:\/\//i.test(u||'') ? u : (u ? 'https://'+u : '');
function dist(a,b){const R=6371,toR=x=>x*Math.PI/180;const dLa=toR(b[0]-a[0]),dLo=toR(b[1]-a[1]);const h=Math.sin(dLa/2)**2+Math.cos(toR(a[0]))*Math.cos(toR(b[0]))*Math.sin(dLo/2)**2;return 2*R*Math.asin(Math.sqrt(h));}
function onlyStart(r){const p=r.points||[];return p.length<2||p.every(q=>q[0]===p[0][0]&&q[1]===p[0][1]);}
function kmLabel(r){return onlyStart(r)?'nur Startpunkt':fmtKm(r.lengthKm);}
function lineKm(c){let s=0;for(let i=1;i<c.length;i++)s+=dist(c[i-1],c[i]);return s;}
function starsHTML(a,n){let h='';for(let i=1;i<=5;i++){h+= a>=i-.25?'<i class="fa-solid fa-star"></i>':a>=i-.75?'<i class="fa-solid fa-star-half-stroke"></i>':'<i class="fa-regular fa-star"></i>';}
  return `<span class="stars" title="${a?a.toFixed(1):'–'} von 5">${h}<small>${n?a.toFixed(1).replace('.',',')+' ('+n+')':'noch keine'}</small></span>`;}
function catBadge(k){const c=CATS[k]||CATS.bossel;return `<span class="cat" style="--c:${c.color}"><i class="fa-solid ${c.icon}"></i>${c.label}</span>`;}
function stBadge(s){const [l,i]=STATUS[s]||STATUS.pending;return `<span class="st ${s}"><i class="fa-solid ${i}"></i>${l}</span>`;}
function featIcons(keys,dict=F){return (keys||[]).filter(k=>dict[k]).map(k=>`<span class="ficon" title="${esc(dict[k].l)}"><i class="fa-solid ${dict[k].i}"></i></span>`).join('');}
function featTags(keys,dict=F,cls=''){return (keys||[]).filter(k=>dict[k]).map(k=>`<span class="ftag ${cls}"><i class="fa-solid ${dict[k].i}"></i>${esc(dict[k].l)}</span>`).join('');}
function toast(msg,type='ok',ms=4200){const icons={ok:'fa-circle-check',warn:'fa-triangle-exclamation',err:'fa-circle-xmark',mail:'fa-envelope'};
  const colors={ok:'var(--grass-d)',warn:'var(--amber)',err:'var(--red)',mail:'var(--sky-d)'};
  const t=document.createElement('div');t.className='toast '+type;t.innerHTML=`<i class="fa-solid ${icons[type]}" style="color:${colors[type]}"></i><div>${msg}</div>`;
  $('#toasts').appendChild(t);setTimeout(()=>t.remove(),ms);}

/* ================= Speicher ================= */
let state={routes:[],gasthaeuser:[],verleih:[],mails:[],voted:{}};
/* ---------- Server-Schnittstelle (api.php) ---------- */
function b64utf8(s){const b=new TextEncoder().encode(s);let r='';for(let i=0;i<b.length;i+=0x8000)r+=String.fromCharCode.apply(null,b.subarray(i,i+0x8000));return btoa(r);}
async function api(action,data,{retry=true,query=''}={}){
  const opt=data===undefined?{method:'GET'}:{method:'POST',headers:{'Content-Type':'application/json','X-CSRF':CSRF},body:JSON.stringify({_b64:b64utf8(JSON.stringify(data))})};
  let r,j;
  try{r=await fetch('api.php?action='+encodeURIComponent(action)+(query?'&'+query:''),{...opt,credentials:'same-origin',cache:'no-store'});}
  catch(e){throw new Error('Server nicht erreichbar. Bitte Internetverbindung prüfen.');}
  try{j=await r.json();}catch(e){throw new Error(`Ungültige Server-Antwort (${r.status}). Ist PHP aktiv und api.php hochgeladen?`);}
  if(j&&j.csrf)CSRF=j.csrf;
  if(!r.ok||j.error){const err=new Error(j.error||('Fehler '+r.status));err.data=j;err.status=r.status;
    if(r.status===403&&j.csrf&&retry&&data!==undefined){return api(action,data,{retry:false,query});} // CSRF erneuert -> einmal wiederholen
    if(r.status===401&&adminOK){adminOK=false;}
    throw err;}
  return j;
}
function loadVotes(){try{return JSON.parse(localStorage.getItem(VOTE_KEY)||'{}');}catch(e){return{};}}
function saveVotes(){try{localStorage.setItem(VOTE_KEY,JSON.stringify(state.voted));}catch(e){}}
async function reload(){
  const j=await api('list');
  state.routes=j.routes||[];state.gasthaeuser=j.gasthaeuser||[];state.verleih=j.verleih||[];state.mails=j.mails||[];
  adminOK=!!j.admin;APP_VERSION=j.version||'';if(typeof j.raffleOpen==='boolean')RAFFLE_OPEN_SERVER=j.raffleOpen;applyRaffleVisibility();if(j.mailTo)ADMIN_MAIL=j.mailTo;
  updateBadge();
}
async function load(){
  state.voted=loadVotes();
  try{await reload();}
  catch(e){toast(esc(e.message),'err',12000);
    const n=document.createElement('div');n.className='wrap';n.innerHTML=`<div class="demo-note" style="margin-top:14px;background:#fde4e4;border-color:#e99;color:#7a1c1c"><i class="fa-solid fa-plug-circle-xmark"></i><span><b>Keine Verbindung zum Server.</b> ${esc(e.message)}</span></div>`;
    $('main').prepend(n);}
}
function save(){updateBadge();}            // Daten liegen jetzt auf dem Server
function coll(type){return state[TYPES[type].coll];}
function find(type,id){return coll(type).find(x=>x.id===id);}
async function withBusy(btn,fn){const h=btn?btn.innerHTML:'';if(btn){btn.disabled=true;btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Bitte warten…';}
  try{return await fn();}finally{if(btn){btn.disabled=false;btn.innerHTML=h;}}}

/* ================= Beispielbilder (SVG) ================= */
function scene(v=0,label=''){
  const hues=[['#8ed1f2','#e3f5fd'],['#76c5ec','#fbe7c6'],['#a9dcf5','#ffffff'],['#9ccfe8','#f1f9fc']][v%4];
  const h1=60+(v*17)%40,h2=90+(v*23)%30;
  const extra=[`<g fill="#2e5e2a"><circle cx="70" cy="${h1+12}" r="16"/><circle cx="95" cy="${h1+6}" r="20"/><rect x="92" y="${h1+20}" width="5" height="18" fill="#5d4037"/></g>`,
    `<path d="M0 ${h2+18}H400" stroke="#4fa3d1" stroke-width="10" opacity=".7"/>`,
    `<g fill="#2e5e2a"><circle cx="300" cy="${h1+4}" r="18"/><circle cx="330" cy="${h1+10}" r="14"/><circle cx="270" cy="${h1+12}" r="13"/></g>`,
    `<g><rect x="290" y="${h1-6}" width="40" height="28" fill="#c0392b"/><path d="M284 ${h1-6}L310 ${h1-26}L336 ${h1-6}Z" fill="#7b2b20"/></g>`][v%4];
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hues[0]}"/><stop offset="1" stop-color="${hues[1]}"/></linearGradient></defs>
  <rect width="400" height="300" fill="url(#s)"/><circle cx="${300-(v*40)%200}" cy="60" r="26" fill="#ffd84d"/>
  <ellipse cx="${80+(v*50)%200}" cy="50" rx="40" ry="11" fill="#fff" opacity=".9"/>
  <path d="M0 ${h1+40} Q100 ${h1} 200 ${h1+30} T400 ${h1+20} V300 H0Z" fill="#7ccb72"/>
  ${extra}
  <path d="M0 ${h2+60} Q150 ${h2+20} 260 ${h2+50} T400 ${h2+40} V300 H0Z" fill="#5cb85c"/>
  <path d="M120 300 Q190 ${h2+80} 330 ${h2+48}" stroke="#d8d1bf" stroke-width="22" fill="none"/>
  <path d="M0 ${h2+150} Q200 ${h2+110} 400 ${h2+140} V300 H0Z" fill="#2e7d32"/>
  <circle cx="${150+(v*30)%120}" cy="${h2+105}" r="9" fill="#1d3a2a"/>
  <text x="12" y="290" font-family="sans-serif" font-size="13" fill="#fff" opacity=".85">${label||'Beispielbild'}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}

/* ================= Demo-Daten ================= */
function seed(){
  /* Startdaten Kohlfahrten.de – recherchierte Gaststätten & Verleihe (Stand Nov. 2026, Angaben ohne Gewähr) */
  const now=Date.now(),d=n=>now-n*86400000;
  const R=(o)=>Object.assign({id:uid(),status:'approved',ratings:[],photos:[],features:[],description:'',author:'Redaktion',created:d(10)},o);
  const routes=[
    R({title:"Dörpener Kohltour zum Westhus",category:'beides',plz:'26892',ort:"Dörpen",roundtrip:false,points:[[52.9578, 7.3343], [52.975, 7.345], [52.96601, 7.32136]],geometry:[[52.95814, 7.33435], [52.95804, 7.33616], [52.96, 7.3375], [52.95996, 7.33969], [52.96282, 7.33899], [52.96423, 7.34064], [52.9642, 7.34087], [52.96566, 7.34106], [52.96576, 7.34197], [52.9676, 7.34133], [52.97056, 7.34385], [52.97194, 7.34431], [52.97269, 7.34357], [52.97394, 7.34452], [52.97418, 7.34366], [52.97521, 7.34442], [52.97528, 7.34474], [52.97512, 7.3419], [52.97474, 7.34119], [52.9748, 7.3387], [52.97261, 7.33633], [52.97045, 7.3334], [52.96915, 7.32901], [52.96701, 7.32766], [52.96708, 7.32385], [52.96622, 7.324], [52.96608, 7.32272], [52.9657, 7.32258], [52.96574, 7.32213], [52.96614, 7.32168]],features:["teer", "feldweg", "flach", "bollerwagen", "einkehr", "ziel"],created:d(30),description:"Vom Bahnhof Dörpen durch die Felder im Norden des Ortes und zurück zum Hotel Westhus – dort finden im Februar und März die Boßelpartys statt. Überwiegend asphaltierte Nebenstraßen."}),
    R({title:"Venhauser Boßelrunde",category:'beides',plz:'48480',ort:"Spelle",roundtrip:true,points:[[52.35729, 7.44769], [52.366, 7.462], [52.351, 7.474]],geometry:[[52.35735, 7.44752], [52.36206, 7.452], [52.36399, 7.45812], [52.36414, 7.45797], [52.36462, 7.45961], [52.36473, 7.45952], [52.36493, 7.46027], [52.36546, 7.4601], [52.36556, 7.46091], [52.36595, 7.46213], [52.36556, 7.46091], [52.36546, 7.4601], [52.36468, 7.46039], [52.36432, 7.46062], [52.36263, 7.46293], [52.36079, 7.46497], [52.36037, 7.46586], [52.36011, 7.46927], [52.35896, 7.47274], [52.35647, 7.47154], [52.35618, 7.47127], [52.35574, 7.47117], [52.35303, 7.46938], [52.35269, 7.47124], [52.35138, 7.47379], [52.35125, 7.47361], [52.35106, 7.47407], [52.35125, 7.47361], [52.35138, 7.47379], [52.35269, 7.47124], [52.35344, 7.46733], [52.35339, 7.46673], [52.35191, 7.46424], [52.3527, 7.46338], [52.35189, 7.45851], [52.35228, 7.45815], [52.35226, 7.45794], [52.3521, 7.45697], [52.35204, 7.45704], [52.35162, 7.45643], [52.35199, 7.45229], [52.3526, 7.45268], [52.35379, 7.45296], [52.35515, 7.4528], [52.35529, 7.45153], [52.35719, 7.44737], [52.35735, 7.44752]],features:["feldweg", "teer", "flach", "verkehrsarm", "bollerwagen", "ziel"],created:d(27),description:"Rundtour ab und bis Gaststätte Spieker-Wübbel in Venhaus. Ruhige Wirtschaftswege – der bestückte Bollerwagen kann direkt beim Wirt bestellt werden."}),
    R({title:"Emsteker Kohlrunde",category:'beides',plz:'49685',ort:"Emstek",roundtrip:true,points:[[52.83383, 8.15958], [52.846, 8.178], [52.826, 8.186]],geometry:[[52.83369, 8.15949], [52.83302, 8.16212], [52.83417, 8.16297], [52.83403, 8.16382], [52.8344, 8.16422], [52.83396, 8.16604], [52.83585, 8.16726], [52.83785, 8.17115], [52.84092, 8.17502], [52.84146, 8.17614], [52.8428, 8.17607], [52.84318, 8.17844], [52.84417, 8.17835], [52.84423, 8.17874], [52.84417, 8.17835], [52.84318, 8.17844], [52.84378, 8.18205], [52.8411, 8.18198], [52.83961, 8.18242], [52.83808, 8.18102], [52.83739, 8.18295], [52.83539, 8.18188], [52.82921, 8.18036], [52.82805, 8.18609], [52.82607, 8.18543], [52.82805, 8.18609], [52.8323, 8.16495], [52.83369, 8.15949]],features:["teer", "feldweg", "flach", "bollerwagen", "ziel", "parken"],created:d(24),description:"Runde ab Hotel Schute durch die Bauerschaften östlich von Emstek – passend zur geführten Boßeltour des Hauses an den Winter-Samstagen."}),
    R({title:"Lingen: Vom Markt nach Schepsdorf",category:'kohlfahrt',plz:'49808',ort:"Lingen (Ems)",roundtrip:false,points:[[52.5227, 7.3175], [52.5155, 7.305], [52.50949, 7.2946]],geometry:[[52.52269, 7.31765], [52.52242, 7.31762], [52.52267, 7.31644], [52.5226, 7.31626], [52.5234, 7.31479], [52.52352, 7.31481], [52.52422, 7.31322], [52.52431, 7.31227], [52.52451, 7.31164], [52.52476, 7.31144], [52.52507, 7.31049], [52.52542, 7.31042], [52.52509, 7.3097], [52.5249, 7.30864], [52.5244, 7.3086], [52.52439, 7.30683], [52.52386, 7.30642], [52.52247, 7.30647], [52.52063, 7.30583], [52.51792, 7.30628], [52.51667, 7.30545], [52.51661, 7.30523], [52.51617, 7.30514], [52.516, 7.30567], [52.51554, 7.30495], [52.51491, 7.30376], [52.51426, 7.30466], [52.51178, 7.3068], [52.51004, 7.30048], [52.50981, 7.29914], [52.50968, 7.2965], [52.50937, 7.29467]],features:["teer", "oepnv", "flach", "bollerwagen", "ziel", "wc"],created:d(21),description:"Kurze Stadt-Kohlfahrt vom Lingener Marktplatz über die Ems nach Schepsdorf zum Gasthof zum Berge (Grünkohl nur auf Vorbestellung). Gut mit Bus und Bahn erreichbar."}),
    R({title:"Kirchhattener Kohlfahrt-Runde",category:'kohlfahrt',plz:'26209',ort:"Hatten",roundtrip:true,points:[[53.01789, 8.34945], [53.031, 8.368], [53.012, 8.381]],geometry:[[53.01788, 8.34915], [53.01835, 8.3488], [53.0185, 8.34934], [53.01861, 8.35189], [53.01964, 8.35243], [53.02034, 8.35693], [53.02339, 8.35865], [53.02573, 8.35933], [53.02828, 8.36468], [53.03084, 8.36849], [53.03146, 8.36904], [53.02911, 8.37219], [53.02918, 8.37505], [53.02737, 8.37866], [53.02168, 8.37133], [53.02028, 8.37489], [53.01721, 8.37446], [53.01557, 8.37988], [53.0138, 8.37917], [53.01323, 8.38089], [53.01207, 8.38046], [53.01323, 8.38089], [53.0138, 8.37917], [53.01557, 8.37988], [53.0172, 8.37449], [53.01753, 8.37079], [53.01736, 8.36842], [53.01752, 8.36312], [53.01788, 8.36155], [53.01763, 8.35842], [53.01841, 8.35811], [53.01834, 8.35578], [53.0186, 8.35428], [53.01825, 8.35395], [53.01814, 8.35198], [53.01831, 8.35197], [53.0185, 8.34934], [53.01835, 8.3488], [53.01788, 8.34915]],features:["teer", "waldweg", "feldweg", "bollerwagen", "ziel", "parken"],created:d(18),description:"Rundweg ab dem Marktplatz Kirchhatten (Zum Deutschen Hause) durch Feld und Wald der Hatter Geest."}),
    R({title:"Oldenburg: Schlossplatz – Bümmersteder Krug",category:'kohlfahrt',plz:'26133',ort:"Oldenburg",roundtrip:false,points:[[53.1386, 8.2141], [53.115, 8.222], [53.09263, 8.21113]],geometry:[[53.1386, 8.21413], [53.13841, 8.21517], [53.13686, 8.21692], [53.13366, 8.21968], [53.13238, 8.21858], [53.13216, 8.21927], [53.126, 8.21658], [53.12441, 8.2192], [53.12278, 8.21825], [53.12229, 8.22026], [53.11979, 8.21853], [53.11942, 8.21929], [53.11789, 8.21827], [53.11753, 8.2197], [53.11496, 8.22278], [53.11033, 8.21937], [53.10904, 8.21906], [53.10894, 8.21984], [53.10586, 8.21993], [53.10113, 8.22373], [53.09894, 8.22277], [53.09591, 8.2203], [53.09294, 8.2164], [53.09241, 8.21114]],features:["teer", "oepnv", "flach", "bollerwagen", "ziel", "beleuchtet"],created:d(15),description:"Klassische Stadt-Kohltour aus der Oldenburger Innenstadt über Osternburg und Kreyenbrück zum Bümmersteder Krug. Bollerwagen gibt es z. B. beim Bollerwagen Center in Osternburg – direkt an der Strecke."}),
    R({title:"Bremen: Hauptbahnhof – Kuhhirte",category:'kohlfahrt',plz:'28195',ort:"Bremen",roundtrip:false,points:[[53.0833, 8.8136], [53.074, 8.812], [53.06646, 8.81589]],geometry:[[53.08278, 8.81266], [53.08244, 8.81211], [53.08238, 8.81229], [53.0821, 8.81208], [53.0809, 8.81069], [53.08014, 8.81078], [53.08002, 8.8104], [53.0799, 8.8106], [53.0795, 8.81], [53.07933, 8.80998], [53.07877, 8.81034], [53.07812, 8.81049], [53.07724, 8.81169], [53.07698, 8.81125], [53.07621, 8.81189], [53.0743, 8.81231], [53.07404, 8.81178], [53.07396, 8.81184], [53.07358, 8.81191], [53.07482, 8.80887], [53.07433, 8.80813], [53.07246, 8.80423], [53.07182, 8.8057], [53.07151, 8.80587], [53.07062, 8.80728], [53.07005, 8.80833], [53.06965, 8.8094], [53.06792, 8.81218], [53.06646, 8.81589]],features:["teer", "oepnv", "flach", "beleuchtet", "ziel", "wc"],created:d(12),description:"Kurze Innenstadt-Kohlfahrt vom Hauptbahnhof durch die Altstadt, über die Weser und am Werdersee entlang zum Kuhhirten."}),
    R({title:"Apener Mühlenrunde",category:'beides',plz:'26689',ort:"Apen",roundtrip:false,points:[[53.2219, 7.8085], [53.228, 7.795], [53.21708, 7.78596]],geometry:[[53.22188, 7.80847], [53.22264, 7.80725], [53.22259, 7.80707], [53.22204, 7.80565], [53.22069, 7.80435], [53.22027, 7.80305], [53.22085, 7.80289], [53.22125, 7.80256], [53.22329, 7.79998], [53.22374, 7.799], [53.22459, 7.79628], [53.22684, 7.79322], [53.2272, 7.79234], [53.22735, 7.79142], [53.22757, 7.79148], [53.22769, 7.79219], [53.22858, 7.79438], [53.22769, 7.79219], [53.22757, 7.79148], [53.22729, 7.79151], [53.2268, 7.79105], [53.2249, 7.78801], [53.2219, 7.78488], [53.22116, 7.78461], [53.21843, 7.78632], [53.21827, 7.78592], [53.21709, 7.78584]],features:["teer", "feldweg", "flach", "bollerwagen", "ziel"],created:d(9),description:"Kleine Tour durch Augustfehn mit Ziel Hengstforder Mühle – beliebte Einkehr für Kohlfahrten im Ammerland."})
  ];
  routes.forEach(r=>{r.lengthKm=+lineKm(r.geometry).toFixed(2);});
  const G=(o)=>Object.assign({id:uid(),status:'approved',created:d(20),author:'Redaktion',inkl:[],kohlfahrt:true,bossel:false,bosselText:'',region:'',quelle:'',web:'',telefon:'',email:'',adresse:'',saal:'',preis:'',saison:'',minPers:'',kohlText:''},o);
  const gasthaeuser=[
    /* ---- Emsland ---- */
    G({name:'Hotel Westhus',adresse:'Heeder Straße 66',plz:'26892',ort:'Dörpen',lat:52.96601,lng:7.32136,region:'Emsland',web:'https://www.hotel-westhus.de',quelle:'https://www.hotel-westhus.de',
       preis:75,saison:'Feb – März',kohlText:'Boßelparty-Paket: Getränke, Buffet und geführter Rundgang. Buffet ab 19 Uhr, Getränke bis 24 Uhr, DJ und Krönung von Boßelkönig/-königin.',
       bossel:true,bosselText:'Boßelpartys im Februar und März: Boßelwagen mit Getränken, 2 Kugeln + Kescher, anschließend Party im Saal. Anmeldung telefonisch (Start der Anmeldung 28.10.2026, 15 Uhr).',inkl:['gruenkohl','musik','tanz','koenig','strecke','bollerwagen','saal']}),
    G({name:'Hotel Borchers',adresse:'Neudörpener Str. 48-52',plz:'26892',ort:'Dörpen',lat:52.96282,lng:7.34287,region:'Emsland',web:'https://www.hotelborchers.de',telefon:'04963 91930',quelle:'https://www.hotelborchers.de',
       preis:154.9,saison:'Nov – März',minPers:6,kohlText:'Arrangement „Grünkohltour“ mit Übernachtung (Preis p. P. im DZ): Grünkohl mit Kassler & Pinkel, Ausflugsziele wie Berentzen-Hof und Schloss Clemenswerth.',inkl:['gruenkohl','pinkel']}),
    G({name:'Gaststätte Spieker-Wübbel',adresse:'Dorfstraße 18',plz:'48480',ort:'Spelle-Venhaus',lat:52.35729,lng:7.44769,region:'Emsland',telefon:'05977 231',
       preis:20,saison:'Feb – März',kohlText:'Boßelpartys von Mitte Februar bis Ende März: Essen ab 20 € p. P., All-in-Paket ca. 60 € p. P.',
       bossel:true,bosselText:'Boßelpartys 13.02.–20.03.2027. Ein bestückter Bollerwagen kann beim Wirt bestellt werden.',inkl:['gruenkohl','strecke','bollerwagen','saal']}),
    G({name:'Gasthof zum Berge',adresse:'Nordhorner Straße 15',plz:'49808',ort:'Lingen-Schepsdorf',lat:52.50949,lng:7.2946,region:'Emsland',telefon:'0591 3414',
       kohlText:'Grünkohl zur Boßelparty – nur auf Vorbestellung. Dienstag Ruhetag.',bossel:true,bosselText:'Boßelgruppen willkommen, Grünkohl nach der Tour auf Vorbestellung.',inkl:['gruenkohl']}),
    G({name:'Gaststätte Wulfekotte',adresse:'Waldstraße',plz:'49774',ort:'Lähden-Holte-Lastrup',lat:52.74075,lng:7.62113,region:'Emsland',
       kohlText:'Grünkohlessen für Gruppen im Saal.',bossel:true,bosselText:'Boßelgruppen sind willkommen – Saal für die Feier danach.',inkl:['gruenkohl','saal']}),
    /* ---- Oldenburger Münsterland ---- */
    G({name:'Hotel Schute',adresse:'Lange Str. 15',plz:'49685',ort:'Emstek',lat:52.83383,lng:8.15958,region:'Oldenburger Münsterland',web:'https://www.hotel-schute.de',telefon:'04473 1006',email:'info@hotel-schute.de',quelle:'https://www.hotel-schute.de',
       preis:129.5,saison:'samstags 23.01.–06.03.2027',kohlText:'Kohlfahrt als geführte Boßeltour – all-inclusive bis 1 Uhr, mit Übernachtung und Katerfrühstück (EZ-Zuschlag 10 €).',
       bossel:true,bosselText:'Geführte Boßeltour an den Winter-Samstagen, anschließend Grünkohlessen und Feier.',inkl:['gruenkohl','pinkel','musik','strecke','saal']}),
    G({name:'Waldgasthof Schöning',adresse:'Zum Herrensand 2',plz:'26169',ort:'Friesoythe',lat:52.94239,lng:7.89489,region:'Oldenburger Münsterland',telefon:'04495 92630',
       preis:170,minPers:10,kohlText:'Boßelpaket für 10–26 Personen inkl. 2 Übernachtungen und 3-Gänge-Grünkohlmenü (EZ-Zuschlag 55 €).',
       bossel:true,bosselText:'Boßeln mit Bollerwagen und Getränken, danach Grünkohlmenü.',inkl:['gruenkohl','strecke','bollerwagen']}),
    /* ---- Oldenburger Land / Ammerland ---- */
    G({name:'Zum Deutschen Hause',adresse:'Marktplatz 2',plz:'26209',ort:'Hatten-Kirchhatten',lat:53.01789,lng:8.34945,region:'Oldenburger Land',
       kohlText:'Gemeinschaftskohlfahrt mit Musik und Tanz. Bollerwagen werden vom Haus gestellt.',inkl:['gruenkohl','musik','tanz','bollerwagen','saal']}),
    G({name:'Bümmersteder Krug',adresse:'Sandkruger Str. 180',plz:'26133',ort:'Oldenburg',lat:53.09263,lng:8.21113,region:'Oldenburger Land',
       kohlText:'Beliebtes Kohltour-Ziel: Grünkohl, Musik & Tanz, Kohlkönig-Krönung – auch vegane Grünkohlgerichte.',inkl:['gruenkohl','vegetarisch','musik','tanz','koenig','saal']}),
    G({name:'Gaststätte Zum Drögen Hasen',adresse:'Drögen-Hasen-Weg',plz:'26129',ort:'Oldenburg',lat:53.15101,lng:8.15986,region:'Oldenburger Land',web:'https://www.zum-droegen-hasen.de',
       kohlText:'Gruppenaktionen und Kohlfahrten buchbar.',inkl:['gruenkohl']}),
    G({name:'Vielstedter Bauernhaus',adresse:'Am Bauernhaus 1',plz:'27798',ort:'Hude',lat:53.07931,lng:8.46464,region:'Oldenburger Land',
       preis:15,kohlText:'Grünkohl im historischen Bauernhaus (Preis für das Grünkohlgericht).',inkl:['gruenkohl']}),
    G({name:'Hengstforder Mühle',adresse:'Hauptstraße 308',plz:'26689',ort:'Apen-Augustfehn',lat:53.21708,lng:7.78596,region:'Ammerland',
       kohlText:'Beliebte Einkehr für Kohlfahrten im Ammerland.',inkl:['gruenkohl']}),
    G({name:'Residenz-Hotel Zum Zollhaus',adresse:'Kleibroker Straße 139',plz:'26180',ort:'Rastede',lat:53.26281,lng:8.20678,region:'Ammerland',
       kohlText:'Kohlparty-Arrangement mit Grünkohlessen und Feier.',inkl:['gruenkohl','musik']}),
    /* ---- Ostfriesland ---- */
    G({name:'Gaststätte Müller-Ardorf',adresse:'Heglitzer Str. 20',plz:'26409',ort:'Wittmund-Ardorf',lat:53.54262,lng:7.6917,region:'Ostfriesland',telefon:'04466 289',saal:250,
       preis:22,saison:'samstags, Buffet ab 18 Uhr',minPers:10,kohlText:'Grünkohl satt 22 € p. P., mit 6 Stunden Getränken 55 € p. P. Saal für 10–250 Personen.',inkl:['gruenkohl','pinkel','saal']}),
    G({name:'Landgasthof Zum großen Krug',plz:'26529',ort:'Wirdum',lat:53.47979,lng:7.20593,region:'Ostfriesland',
       preis:17.5,kohlText:'Ostfriesischer Grünkohl (Preis für das Gericht).',inkl:['gruenkohl']}),
    G({name:'Hotel Restaurant Bootshaus',adresse:'Marscher Weg 18',plz:'26624',ort:'Südbrookmerland-Bedekaspel',lat:53.44317,lng:7.27716,region:'Ostfriesland',
       saison:'Winter',kohlText:'Grünkohl in der Wintersaison am Großen Meer.',inkl:['gruenkohl']}),
    /* ---- Bremen ---- */
    G({name:'Der Kuhhirte',adresse:'Kuhhirtenweg',plz:'28201',ort:'Bremen',lat:53.06646,lng:8.81589,region:'Bremen',
       preis:70,saison:'Jan – März, Fr & Sa',kohlText:'Kohlparty 18–24 Uhr mit Grünkohl, Pinkel, Musik und Tanz – all-inclusive 70 € (Fr) / 75 € (Sa).',inkl:['gruenkohl','pinkel','musik','tanz','saal']}),
    G({name:'Union-Brauerei',adresse:'Theodorstraße',plz:'28219',ort:'Bremen-Walle',lat:53.1009,lng:8.79311,region:'Bremen',
       preis:82.5,saison:'Fr & Sa',kohlText:'Kohlbuffet, Getränke-Flat und DJ.',inkl:['gruenkohl','musik','tanz']}),
    G({name:'Schüttinger Gasthausbrauerei',adresse:'Hinter dem Schütting 12-13',plz:'28195',ort:'Bremen',lat:53.07498,lng:8.80631,region:'Bremen',
       preis:79,kohlText:'Kohlfahrt-Abschluss mit Grünkohl und DJ. Bollerwagen können über Nacht abgestellt werden.',inkl:['gruenkohl','musik']}),
    G({name:'Haus am Walde',adresse:'Kuhgrabenweg 2',plz:'28359',ort:'Bremen',lat:53.10671,lng:8.84075,region:'Bremen',
       preis:79,saison:'Fr & Sa, Mitte Jan – Anf. März',kohlText:'3-Gänge-Grünkohlmenü, auch vegan.',inkl:['gruenkohl','vegetarisch']}),
    G({name:'Bremer Ratskeller',adresse:'Am Markt',plz:'28195',ort:'Bremen',lat:53.07609,lng:8.80738,region:'Bremen',
       preis:81.5,kohlText:'Kohlfahrt-Paket im historischen Ratskeller. Bollerwagen können bis Montag abgestellt werden.',inkl:['gruenkohl']}),
    G({name:'Gasthof zum Kaiser Friedrich',adresse:'Lange Wieren 13',plz:'28195',ort:'Bremen',lat:53.07349,lng:8.80894,region:'Bremen',
       preis:19.9,saison:'Okt – Apr',kohlText:'Braunkohlteller (Preis für das Gericht).',inkl:['gruenkohl']}),
    G({name:"Gartelmann's Gasthof",adresse:'Oberblockland 14',plz:'28357',ort:'Bremen-Blockland',lat:53.14301,lng:8.84733,region:'Bremen',
       saison:'ab Ende November',kohlText:'Grünkohl-Saison im Blockland – beliebtes Ziel für Kohlfahrten entlang der Wümme.',inkl:['gruenkohl']})
  ];
  const V=(o)=>Object.assign({id:uid(),status:'approved',created:d(15),author:'Redaktion',ausst:[],web:'',telefon:'',email:'',adresse:'',anzahl:'',preisTag:'',preisWE:'',kaution:'',zuladung:'',kisten:'',beschreibung:''},o);
  const verleih=[
    V({name:'Bollerwagen Center Oldenburg',adresse:'Schützenhofstr. 154',plz:'26133',ort:'Oldenburg',lat:53.12012,lng:8.21853,telefon:'0441 48563063',
       beschreibung:'Bollerwagen für Kohlfahrt, JGA & Feiern. Öffnungszeiten: Di–Mi 10–15, Do 10–20, Fr 10–17, Sa 10–12 Uhr. Bring- und Abholdienst.',ausst:['lieferung']}),
    V({name:'StammSchild – Party-Bollerwagen',plz:'26831',ort:'Bunde',lat:53.18402,lng:7.26954,
       beschreibung:'Party-Bollerwagen als „rollende Theke“ für Kohlfahrten und Feiern.',ausst:['getraenkehalter','musikbox']}),
    V({name:'mnj-eventservice',plz:'26122',ort:'Oldenburg',lat:53.13898,lng:8.2146,
       beschreibung:'Party-Bollerwagen mit Soundboks-Lautsprecher für Kohlfahrten in Oldenburg und Umgebung.',ausst:['musikbox']})
  ];
  return {routes,gasthaeuser,verleih,mails:[],voted:{},v:1};
}

/* ================= Karten & Geodienste ================= */
function makeMap(el,{center=[53.35,7.85],zoom=9}={}){
  const m=L.map(el,{scrollWheelZoom:true}).setView(center,zoom);
  const tl=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>-Mitwirkende',maxZoom:19}).addTo(m);
  let errs=0,shown=false;tl.on('tileerror',()=>{if(++errs<4||shown)return;shown=true;const n=document.createElement('div');n.className='tilehint';
    n.innerHTML='<i class="fa-solid fa-circle-info"></i> Kartenhintergrund lädt in dieser Vorschau nicht. Datei herunterladen und im Browser (Chrome, Firefox, Edge, Safari) öffnen.';el.appendChild(n);});
  tl.on('tileload',()=>{errs=0;});
  return m;
}
const pinIcon=(fa,color,s=34)=>L.divIcon({className:'pin',html:`<div class="pin-b" style="--c:${color}"><i class="fa-solid ${fa}"></i></div>`,iconSize:[s,s],iconAnchor:[s/2,s],popupAnchor:[0,-s]});
const viaIcon=n=>L.divIcon({className:'pin',html:`<div class="via">${n}</div>`,iconSize:[24,24],iconAnchor:[12,12]});

async function fetchJSON(url,ms=8000){const c=new AbortController();const t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(url,{signal:c.signal});if(!r.ok)throw new Error(r.status);return await r.json();}finally{clearTimeout(t);}}
async function routeVia(coords){
  const s=coords.map(c=>c[1].toFixed(6)+','+c[0].toFixed(6)).join(';');
  const urls=[`https://routing.openstreetmap.de/routed-foot/route/v1/driving/${s}?overview=full&geometries=geojson`,
              `https://router.project-osrm.org/route/v1/driving/${s}?overview=full&geometries=geojson`];
  for(const u of urls){try{const j=await fetchJSON(u);if(j.routes&&j.routes[0])return{geometry:j.routes[0].geometry.coordinates.map(c=>[+c[1].toFixed(6),+c[0].toFixed(6)]),km:j.routes[0].distance/1000,routed:true};}catch(e){}}
  return {geometry:coords.slice(),km:lineKm(coords),routed:false};
}
async function reverseGeo(lat,lng){
  try{const j=await fetchJSON(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}&lang=de`);const p=j.features?.[0]?.properties;
    if(p&&(p.postcode||p.city))return{plz:p.postcode||'',ort:p.city||p.town||p.village||p.locality||p.district||p.county||'',strasse:[p.street,p.housenumber].filter(Boolean).join(' ')};}catch(e){}
  try{const j=await fetchJSON(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=de`);const a=j.address||{};
    return{plz:a.postcode||'',ort:a.city||a.town||a.village||a.municipality||'',strasse:[a.road,a.house_number].filter(Boolean).join(' ')};}catch(e){}
  return null;
}
async function geocode(q){
  try{const j=await fetchJSON(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lang=de&limit=1&lat=53.3&lon=7.9`);const f=j.features?.[0];if(f)return[f.geometry.coordinates[1],f.geometry.coordinates[0]];}catch(e){}
  try{const j=await fetchJSON(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=de&q=${encodeURIComponent(q)}`);if(j[0])return[+j[0].lat,+j[0].lon];}catch(e){}
  return null;
}

/* ================= Routen-Editor ================= */
class RouteEditor{
  constructor(host,{color='#1e88e5',onChange=()=>{},onStart=()=>{}}={}){
    this.host=host;this.map=makeMap($('.ed-map',host));this.points=[];this.round=false;this.follow=true;
    this.hist=[];this.geometry=[];this.km=0;this.routed=false;this.seq=0;this.onChange=onChange;this.onStart=onStart;
    this.guide=L.polyline([], {color:'#37474f',weight:2,dashArray:'5 7',opacity:.5}).addTo(this.map);
    this.line=L.polyline([], {color,weight:6,opacity:.9}).addTo(this.map);
    this.mk=L.layerGroup().addTo(this.map);
    this.map.on('click',e=>this.addPoint([+e.latlng.lat.toFixed(6),+e.latlng.lng.toFixed(6)]));
    $('[data-a=undo]',host).onclick=()=>this.undo();
    $('[data-a=reset]',host).onclick=()=>this.reset();
    $('[data-a=round]',host).onchange=e=>{this.snap();this.round=e.target.checked;this.update();};
    $('[data-a=follow]',host).onchange=e=>{this.follow=e.target.checked;this.update();};
    const si=$('.ed-search input',host),go=async()=>{if(!si.value.trim())return;const p=await geocode(si.value.trim());if(p)this.map.setView(p,14);else toast('Ort nicht gefunden','warn');};
    $('.ed-search button',host).onclick=go;si.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();go();}};
    $('[data-a=locate]',host).onclick=()=>{if(!navigator.geolocation)return toast('Standort nicht verfügbar','warn');
      navigator.geolocation.getCurrentPosition(p=>this.map.setView([p.coords.latitude,p.coords.longitude],15),()=>toast('Standort konnte nicht ermittelt werden','warn'));};
    this.renderStatus();
  }
  setColor(c){this.line.setStyle({color:c});}
  snap(){this.hist.push(JSON.stringify({p:this.points,r:this.round}));if(this.hist.length>60)this.hist.shift();}
  coords(){const p=this.points;return p.length<2?p.slice():(this.round?[...p,p[0]]:p.slice());}
  addPoint(p){
    this.snap();const pts=this.points,n=pts.length;let pos=n;
    if(n>=2){let best=Infinity;const segs=this.round?n:n-1;
      for(let i=0;i<segs;i++){const a=pts[i],b=pts[(i+1)%n],c=dist(a,p)+dist(p,b)-dist(a,b);if(c<best){best=c;pos=i+1;}}
      if(!this.round&&dist(pts[n-1],p)<best)pos=n;}
    pts.splice(pos,0,p);this.update(pos===0||n===0);
  }
  undo(){const s=this.hist.pop();if(!s)return toast('Nichts zum Rückgängig machen','warn',2000);const o=JSON.parse(s);this.points=o.p;this.round=o.r;$('[data-a=round]',this.host).checked=this.round;this.update(true);}
  reset(){if(!this.points.length)return;this.snap();this.points=[];this.update();}
  update(startChanged=false){this.renderMarkers();this.guide.setLatLngs(this.coords());this.compute();if(startChanged&&this.points[0])this.onStart(this.points[0]);}
  async compute(){
    const c=this.coords(),my=++this.seq;
    if(c.length<2){this.geometry=c.length?[]:[];this.km=0;this.line.setLatLngs([]);return this.emit();}
    if(!this.follow){this.geometry=c;this.km=lineKm(c);this.routed=false;this.line.setLatLngs(c);return this.emit();}
    this.setHint('<i class="fa-solid fa-spinner fa-spin"></i> Route entlang der Wege wird berechnet…');
    const r=await routeVia(c);if(my!==this.seq)return;
    this.geometry=r.geometry;this.km=r.km;this.routed=r.routed;this.line.setLatLngs(r.geometry);
    if(!r.routed&&!this.warned){this.warned=true;toast('Routing-Dienst gerade nicht erreichbar – Strecke wird als Luftlinie gespeichert.','warn');}
    this.emit();
  }
  emit(){this.renderStatus();this.onChange(this.data());}
  data(){return{points:this.points.map(p=>p.slice()),roundtrip:this.round,geometry:this.geometry.map(p=>p.slice()),lengthKm:+(+this.km).toFixed(2)};}
  renderMarkers(){
    this.mk.clearLayers();const n=this.points.length;
    this.points.forEach((p,i)=>{
      const isEnd=i===n-1&&!this.round&&n>1;
      const icon=i===0?pinIcon(this.round?'fa-arrows-rotate':'fa-flag','#2e7d32'):isEnd?pinIcon('fa-flag-checkered','#c62828'):viaIcon(i);
      const m=L.marker(p,{icon,draggable:true,autoPan:true}).addTo(this.mk);
      m.on('dragend',()=>{this.snap();const ll=m.getLatLng();this.points[i]=[+ll.lat.toFixed(6),+ll.lng.toFixed(6)];this.update(i===0);});
      const el=document.createElement('div');el.className='mk-pop';
      el.innerHTML=`<b>${i===0?(this.round?'Start & Ziel':'Start'):isEnd?'Ziel':'Zwischenpunkt '+i}</b><br><span class="muted">Ziehen zum Verschieben</span><br><button type="button" class="btn sm danger"><i class="fa-solid fa-trash-can"></i> Punkt entfernen</button>`;
      el.querySelector('button').onclick=()=>{this.snap();this.points.splice(i,1);this.map.closePopup();this.update(i===0);};
      m.bindPopup(el);
    });
  }
  setHint(h){$('.ed-hint',this.host).innerHTML=h;}
  renderStatus(){
    const n=this.points.length;let h;
    if(n===0)h='<i class="fa-solid fa-hand-pointer"></i> Klicke in die Karte, um den <b>Startpunkt</b> zu setzen.';
    else if(n===1)h=this.round?'<i class="fa-solid fa-arrows-rotate"></i> Rundtour: Klicke Punkte, um die Runde zu formen.':'<i class="fa-solid fa-flag-checkered"></i> Jetzt den <b>Zielpunkt</b> klicken – oder „Rundtour“ aktivieren.';
    else h='<i class="fa-solid fa-circle-info"></i> Weitere Klicks fügen Zwischenpunkte ein. Marker ziehen zum Anpassen.';
    this.setHint(h);
    $('.ed-km',this.host).innerHTML=`<i class="fa-solid fa-ruler"></i> ${fmtKm(this.km)}${this.round?' · Rundtour':''}${n>=2&&this.follow&&!this.routed?' · Luftlinie':''}`;
  }
  load(r){
    this.points=(r.points||[]).map(p=>p.slice());this.round=!!r.roundtrip;$('[data-a=round]',this.host).checked=this.round;
    this.geometry=(r.geometry||[]).map(p=>p.slice());this.km=r.lengthKm||lineKm(this.geometry);this.routed=true;
    this.renderMarkers();this.guide.setLatLngs(this.coords());this.line.setLatLngs(this.geometry);this.renderStatus();
  }
  fit(){const all=[...this.geometry,...this.points];if(all.length){this.map.fitBounds(L.latLngBounds(all),{padding:[30,30],maxZoom:15});}}
}

/* ================= Sicherheitsfrage ================= */
const NUMW=['null','eins','zwei','drei','vier','fünf','sechs','sieben','acht','neun','zehn'];
const TRIVIA=[
  {q:'Welches Gemüse wird bei einer Kohlfahrt gegessen? (Tipp: Grün…)',a:['grünkohl','gruenkohl','kohl']},
  {q:'Was rollt beim Boßeln über die Straße? (Tipp: K…)',a:['kugel','boßelkugel','bosselkugel','die kugel']},
  {q:'Welche Farbe hat frisches Gras?',a:['grün','gruen']},
  {q:'Welche Farbe hat der Himmel an einem sonnigen Tag?',a:['blau','hellblau']},
  {q:'Wie heißt der Wagen, der bei der Kohlfahrt gezogen wird? (Tipp: Boller…)',a:['bollerwagen','boller wagen']}
];
const norm=s=>String(s||'').toLowerCase().trim().replace(/[.!?"„“]/g,'').replace(/\s+/g,' ');
function captchaHTML(){
  return `<div class="captcha">
    <div class="q"><i class="fa-solid fa-robot"></i> Sicherheitsfrage <span class="req" style="color:var(--red)">*</span>
      <button type="button" class="btn ghost sm cap-new" style="margin-left:auto" title="Andere Frage"><i class="fa-solid fa-arrows-rotate"></i></button></div>
    <div class="cap-q" style="margin-bottom:8px"><i class="fa-solid fa-spinner fa-spin"></i> Frage wird geladen…</div>
    <input type="text" class="cap-in" autocomplete="off" placeholder="Deine Antwort">
    <div class="muted" style="font-size:.8rem;margin-top:6px"><i class="fa-solid fa-shield-halved"></i> Schützt vor automatischen Einträgen durch Bots – keine Anmeldung nötig.</div>
    <input type="text" name="website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
  </div>`;
}
async function loadCaptcha(root){
  const c=$('.captcha',root);if(!c)return;
  const btn=$('.cap-new',c);if(btn&&!btn._b){btn._b=1;btn.onclick=()=>loadCaptcha(root);}
  try{const j=await api('captcha');$('.cap-q',c).textContent=j.q;$('.cap-in',c).value='';}
  catch(e){$('.cap-q',c).innerHTML='<span class="err">Frage konnte nicht geladen werden: '+esc(e.message)+'</span>';}
}
function captchaData(root){const c=$('.captcha',root);return c?{captcha:$('.cap-in',c).value,website:$('.hp',c).value}:{};}

/* ================= Fotos ================= */
function readPhoto(file,max=1000){
  return new Promise((res,rej)=>{if(!file||!file.type.startsWith('image/'))return rej('Kein Bild');
    const fr=new FileReader();fr.onload=()=>{const img=new Image();img.onload=()=>{const s=Math.min(1,max/Math.max(img.width,img.height));
      const cv=document.createElement('canvas');cv.width=Math.round(img.width*s);cv.height=Math.round(img.height*s);cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);
      res(cv.toDataURL('image/jpeg',.75));};img.onerror=()=>rej('Bild nicht lesbar');img.src=fr.result;};fr.readAsDataURL(file);});
}

/* ================= Modal ================= */
function openModal(html,{wide=false,onClose}={}){
  const bg=document.createElement('div');bg.className='modal-bg';
  bg.innerHTML=`<div class="modal ${wide?'wide':''}" role="dialog"><button class="modal-x" aria-label="Schließen"><i class="fa-solid fa-xmark"></i></button><div class="modal-body">${html}</div></div>`;
  $('#modal-root').appendChild(bg);document.body.style.overflow='hidden';
  const close=()=>{bg.remove();if(!$('#modal-root').children.length)document.body.style.overflow='';document.removeEventListener('keydown',k);onClose&&onClose();};
  const k=e=>{if(e.key==='Escape'&&$('#modal-root').lastElementChild===bg)close();};
  document.addEventListener('keydown',k);
  bg.addEventListener('mousedown',e=>{if(e.target===bg)close();});
  $('.modal-x',bg).onclick=close;
  return{el:$('.modal-body',bg),close};
}
function confirmModal(text,okLabel='Ja',danger=true){
  return new Promise(res=>{const m=openModal(`<h3><i class="fa-solid fa-circle-question" style="color:var(--sky-d)"></i> Bitte bestätigen</h3><p>${text}</p>
    <div class="btnrow" style="justify-content:flex-end"><button class="btn ghost" data-r="0">Abbrechen</button><button class="btn ${danger?'danger':''}" data-r="1">${okLabel}</button></div>`,{onClose:()=>res(false)});
    $$('[data-r]',m.el).forEach(b=>b.onclick=()=>{const v=b.dataset.r==='1';res(v);m.close();});});
}
function lightbox(src){openModal(`<div class="lightbox"><img src="${src}" alt="Foto"></div>`,{wide:true});}

/* ================= Strecken-Formular ================= */
function mountRouteForm(host,{route=null,admin=false,onDone}={}){
  const r=route?JSON.parse(JSON.stringify(route)):{category:'kohlfahrt',features:[],photos:[]};
  const photos=[r.photos?.[0]||null,r.photos?.[1]||null];
  host.innerHTML=`
  <form class="rform" novalidate>
    <div class="rform-grid">
      <div class="mapcol card">
        <h3 class="section-title"><span class="step">1</span> Strecke in der Karte einzeichnen</h3>
        <div class="ed-toolbar">
          <div class="ed-search"><input type="text" placeholder="Ort suchen, z. B. Jever"><button type="button" class="btn sky sm"><i class="fa-solid fa-magnifying-glass"></i></button></div>
          <button type="button" class="btn ghost sm" data-a="locate" title="Mein Standort"><i class="fa-solid fa-location-crosshairs"></i></button>
        </div>
        <div class="ed-toolbar">
          <label class="switch"><input type="checkbox" data-a="round"><i class="fa-solid fa-arrows-rotate"></i> Rundtour</label>
          <label class="switch"><input type="checkbox" data-a="follow" checked><i class="fa-solid fa-route"></i> Wegen folgen</label>
          <button type="button" class="btn ghost sm" data-a="undo"><i class="fa-solid fa-rotate-left"></i> Rückgängig</button>
          <button type="button" class="btn ghost sm" data-a="reset"><i class="fa-solid fa-trash-can"></i> Neu beginnen</button>
        </div>
        <div class="map ed-map"></div>
        <div class="ed-status"><span class="ed-hint"></span><span class="ed-km"></span></div>
      </div>
      <div class="card">
        <h3 class="section-title"><span class="step">2</span> Angaben zur Strecke</h3>
        <label class="fl"><i class="fa-solid fa-heading"></i> Titel <span class="req">*</span></label>
        <input type="text" name="title" maxlength="80" placeholder="z. B. Rund um den Deich" value="${esc(r.title)}">
        <label class="fl"><i class="fa-solid fa-tags"></i> Kategorie <span class="req">*</span></label>
        <div class="catcards">${Object.entries(CATS).map(([k,c])=>`<label class="catcard" style="--c:${c.color}"><input type="radio" name="category" value="${k}" ${r.category===k?'checked':''}><i class="fa-solid ${c.icon}"></i>${c.label}</label>`).join('')}</div>
        <div class="row2">
          <div><label class="fl"><i class="fa-solid fa-hashtag"></i> PLZ <span class="req">*</span></label><input type="text" name="plz" inputmode="numeric" maxlength="5" value="${esc(r.plz)}"></div>
          <div><label class="fl"><i class="fa-solid fa-city"></i> Ort <span class="req">*</span><span class="autofill"><i class="fa-solid fa-wand-magic-sparkles"></i> automatisch</span></label><input type="text" name="ort" value="${esc(r.ort)}"></div>
        </div>
        <div class="muted" style="font-size:.82rem;margin-top:4px"><i class="fa-solid fa-circle-info"></i> PLZ &amp; Ort werden beim Setzen des Startpunkts automatisch ausgefüllt.</div>
        <label class="fl"><i class="fa-solid fa-align-left"></i> Beschreibung</label>
        <textarea name="description" maxlength="1500" placeholder="Was macht die Strecke aus? Tipps für Start, Parken, Einkehr…">${esc(r.description)}</textarea>
        <h3 class="section-title" style="margin-top:20px"><span class="step">3</span> Besonderheiten</h3>
        <div class="chips">${FEATURES.map(f=>`<label class="chip"><input type="checkbox" name="feat" value="${f.k}" ${r.features?.includes(f.k)?'checked':''}><i class="fa-solid ${f.i}"></i>${f.l}</label>`).join('')}</div>
        <h3 class="section-title" style="margin-top:20px"><span class="step">4</span> Fotos <span class="muted" style="font-size:.9rem;font-family:Nunito">(max. 2)</span></h3>
        <div class="photos">${[0,1].map(i=>`<label class="photo-slot" data-i="${i}"><input type="file" accept="image/*" hidden><div><i class="fa-solid fa-camera"></i>Foto ${i+1} hochladen</div></label>`).join('')}</div>
        ${admin?`
          <label class="fl"><i class="fa-solid fa-flag"></i> Status</label>
          <select name="status">${Object.entries(STATUS).map(([k,[l]])=>`<option value="${k}" ${r.status===k?'selected':''}>${l}</option>`).join('')}</select>
          <label class="fl"><i class="fa-solid fa-star"></i> Bewertungen</label>
          <div class="btnrow">${starsHTML(avg(r.ratings),r.ratings?.length||0)} ${r.ratings?.length?'<button type="button" class="btn ghost sm" data-a="clearRatings"><i class="fa-solid fa-eraser"></i> Bewertungen zurücksetzen</button>':''}</div>`
        :`
          ${raffleOpen()?`<div class="raffle-box">
            <label class="check" style="margin:0"><input type="checkbox" name="rjoin"> <span><b><i class="fa-solid fa-gift" style="color:#c62828"></i> An Gewinnspiel teilnehmen</b><br><span class="muted" style="font-size:.86rem">Jeden Monat 50 € Einkaufsgutschein für bossel.de – Teilnahme bis 31.03.2027, ab 18 Jahren.</span></span></label>
            <div class="rfields hidden">
              <label class="fl"><i class="fa-solid fa-user"></i> Vor- und Nachname <span class="req">*</span></label><input type="text" name="rname" maxlength="100" autocomplete="name">
              <div class="row2" style="grid-template-columns:1fr 1fr">
                <div><label class="fl"><i class="fa-solid fa-envelope"></i> E-Mail</label><input type="email" name="rmail" maxlength="150" autocomplete="email"></div>
                <div><label class="fl"><i class="fa-solid fa-mobile-screen"></i> Handynummer</label><input type="tel" name="rphone" maxlength="40" autocomplete="tel"></div>
              </div>
              <div class="muted" style="font-size:.82rem;margin-top:6px"><i class="fa-solid fa-lock"></i> E-Mail oder Handynummer – mindestens eins von beiden. Gespeichert werden <b>nur Name, E-Mail und Handynummer</b> – ausschließlich für die Auslosung und die Gewinnbenachrichtigung.</div>
              <label class="check"><input type="checkbox" name="radult"> <span>Ich bin mindestens <b>18 Jahre</b> alt und akzeptiere die <a href="#gewinnspiel" target="_blank" rel="noopener">Teilnahmebedingungen</a>.</span></label>
            </div>
          </div>`:''}
          <h3 class="section-title" style="margin-top:20px"><span class="step">5</span> Kontakt <span class="muted" style="font-size:.9rem;font-family:Nunito">(optional, für Rückfragen)</span></h3>
          <div class="row2" style="grid-template-columns:1fr 1fr">
            <div><label class="fl"><i class="fa-solid fa-user"></i> Name</label><input type="text" name="author" maxlength="60"></div>
            <div><label class="fl"><i class="fa-solid fa-envelope"></i> E-Mail</label><input type="email" name="authorMail" maxlength="100"></div>
          </div>
          ${captchaHTML()}
          <label class="check"><input type="checkbox" name="privacy"> <span>Ich habe die <a href="#start">Datenschutzerklärung</a> gelesen und bestätige, dass ich die Rechte an den hochgeladenen Fotos besitze.</span></label>`}
        <div class="err hidden"></div>
        <div class="btnrow" style="margin-top:16px">
          <button type="submit" class="btn lg"><i class="fa-solid ${admin?'fa-floppy-disk':'fa-paper-plane'}"></i> ${admin?'Speichern':'Strecke einreichen'}</button>
          ${admin?'':'<span class="muted" style="font-size:.85rem"><i class="fa-solid fa-user-shield"></i> Wird nach Prüfung freigeschaltet.</span>'}
        </div>
      </div>
    </div>
  </form>`;
  const form=$('form',host),plz=$('[name=plz]',form),ort=$('[name=ort]',form),af=$('.autofill',form);
  let auto=!r.plz&&!r.ort, geo=r.points?{points:r.points,roundtrip:r.roundtrip,geometry:r.geometry,lengthKm:r.lengthKm}:{points:[],geometry:[]};
  [plz,ort].forEach(i=>i.addEventListener('input',()=>auto=false));
  const colorOf=()=>CATS[$('[name=category]:checked',form)?.value||'kohlfahrt'].color;
  const ed=new RouteEditor($('.mapcol',form),{color:colorOf(),onChange:d=>geo=d,
    onStart:async p=>{if(!auto&&plz.value&&ort.value)return;const g=await reverseGeo(p[0],p[1]);if(g){plz.value=g.plz||plz.value;ort.value=g.ort||ort.value;auto=true;af.classList.add('show');setTimeout(()=>af.classList.remove('show'),2500);}}});
  $$('[name=category]',form).forEach(i=>i.onchange=()=>ed.setColor(colorOf()));
  if(r.points?.length){if(onlyStart(r))ed.load({points:[r.points[0]],roundtrip:false,geometry:[],lengthKm:0});else ed.load(r);}
  setTimeout(()=>{ed.map.invalidateSize();if(r.points?.length)ed.fit();},60);
  // Fotos
  const drawSlot=i=>{const s=$(`.photo-slot[data-i="${i}"]`,form);$$('img,.rm',s).forEach(e=>e.remove());
    if(photos[i]){s.insertAdjacentHTML('beforeend',`<img src="${photos[i]}" alt=""><button type="button" class="btn danger sm rm"><i class="fa-solid fa-xmark"></i></button>`);
      $('.rm',s).onclick=e=>{e.preventDefault();e.stopPropagation();photos[i]=null;$('input',s).value='';drawSlot(i);};}};
  [0,1].forEach(i=>{drawSlot(i);$(`.photo-slot[data-i="${i}"] input`,form).onchange=async e=>{try{photos[i]=await readPhoto(e.target.files[0]);drawSlot(i);}catch(err){toast(String(err),'err');}};});
  const cr=$('[data-a=clearRatings]',form);if(cr)cr.onclick=()=>{clearRatings=true;cr.parentElement.innerHTML=starsHTML(0,0);toast('Bewertungen werden beim Speichern zurückgesetzt');};
  let clearRatings=false;
  if(!admin)loadCaptcha(form);
  const rj=form.rjoin;if(rj)rj.onchange=()=>$('.rfields',form).classList.toggle('hidden',!rj.checked);
  form.onsubmit=async e=>{
    e.preventDefault();const err=$('.err',form);const fail=m=>{err.innerHTML='<i class="fa-solid fa-circle-exclamation"></i> '+m;err.classList.remove('hidden');};
    err.classList.add('hidden');
    const data={title:form.title.value.trim(),category:$('[name=category]:checked',form)?.value,plz:plz.value.trim(),ort:ort.value.trim(),
      description:form.description.value.trim(),features:$$('[name=feat]:checked',form).map(i=>i.value),photos:photos.filter(Boolean),...geo};
    if(!data.title)return fail('Bitte einen Titel eingeben.');
    if(!data.category)return fail('Bitte eine Kategorie wählen.');
    if(!data.points||data.points.length<2||!data.geometry||data.geometry.length<2)return fail('Bitte mindestens Start- und Zielpunkt in der Karte setzen (bzw. bei Rundtour mindestens 2 Punkte).');
    if(!/^\d{5}$/.test(data.plz))return fail('Bitte eine gültige 5-stellige PLZ angeben.');
    if(!data.ort)return fail('Bitte einen Ort angeben.');
    const sb=$('button[type=submit]',form);
    if(admin){
      data.status=form.status.value;data.id=route?.id;
      try{await withBusy(sb,()=>api('admin_save',{type:'route',item:data,clearRatings}));}catch(ex){return fail(esc(ex.message));}
      await reload();toast('Strecke gespeichert');onDone&&onDone();return;
    }
    if(!form.privacy.checked)return fail('Bitte die Datenschutzerklärung bestätigen.');
    let raffle=null;
    if(form.rjoin&&form.rjoin.checked){
      raffle={join:true,name:form.rname.value.trim(),email:form.rmail.value.trim(),phone:form.rphone.value.trim(),adult:form.radult.checked};
      if(raffle.name.length<2)return fail('Gewinnspiel: Bitte deinen Namen angeben.');
      if(!raffle.email&&!raffle.phone)return fail('Gewinnspiel: Bitte E-Mail-Adresse oder Handynummer angeben.');
      if(!raffle.adult)return fail('Gewinnspiel: Bitte bestätige, dass du mindestens 18 Jahre alt bist und die Teilnahmebedingungen akzeptierst.');
    }
    try{await withBusy(sb,()=>api('submit',{type:'route',data,author:form.author.value.trim(),authorMail:form.authorMail.value.trim(),privacy:true,raffle,...captchaData(form)}));}
    catch(ex){if(ex.data?.newCaptcha)loadCaptcha(form);return fail(esc(ex.message));}
    toast(`Danke! Die Redaktion (<b>${esc(ADMIN_MAIL)}</b>) wurde per E-Mail benachrichtigt.`,'mail',6000);
    onDone&&onDone({...data,raffle:!!raffle});
  };
  return ed;
}

/* ================= Ansichten ================= */
const maps={};
let routeLayers={};
const approved=type=>coll(type).filter(x=>x.status==='approved');

function renderStart(){
  const rs=approved('route'),nr=rs.reduce((s,r)=>s+(r.ratings?.length||0),0),gs=approved('gasthaus'),vs=approved('verleih');
  $('#startStats').innerHTML=[
    ['fa-route','#1e8c0b',rs.length,'Strecken'],['fa-utensils','#8d6e63',gs.length,'Gaststätten'],
    ['fa-trailer','#f59e0b',vs.length,'Bollerwagenverleihe'],['fa-star','#f5b301',nr,'Bewertungen']
  ].map(([i,c,b,s])=>`<div class="card stat" style="--c:${c}"><i class="fa-solid ${i}"></i><div><b>${b}</b><span>${s}</span></div></div>`).join('');
  const top=[...rs].sort((a,b)=>avg(b.ratings)-avg(a.ratings)||b.ratings.length-a.ratings.length).slice(0,3);
  $('#topRoutes').innerHTML=top.map(routeCard).join('')||'<div class="card empty"><i class="fa-solid fa-route"></i>Noch keine Strecken – <a href="#eintragen">trag die erste ein!</a></div>';
  bindRouteCards($('#topRoutes'));
  const neu=[...rs].sort((a,b)=>b.created-a.created).slice(0,3);
  $('#newRoutes').innerHTML=neu.map(routeCard).join('')||'<div class="card empty"><i class="fa-solid fa-route"></i>Noch keine Strecken – <a href="#eintragen">trag die erste ein!</a></div>';
  bindRouteCards($('#newRoutes'));
  renderPremium();
  $('#gameTeaser').innerHTML=GAMES.slice(0,4).map(gameCard).join('');
  renderStartMap();
}
function isPremium(g){return g.premium&&(!g.premiumBis||new Date(g.premiumBis+'T23:59:59')>=new Date());}
function renderPremium(){
  const ps=approved('gasthaus').filter(isPremium);
  const free=Math.max(0,3-ps.length);
  $('#premiumHost').innerHTML=ps.map(g=>`<a class="premium" href="${g.web?esc(safeUrl(g.web)):'#gaststaetten'}" ${g.web?'target="_blank" rel="noopener"':''}>
      ${g.bannerImg?`<img src="${esc(g.bannerImg)}" alt="">`:`<i class="fa-solid fa-utensils pdeco"></i>`}
      <span class="pbadge"><i class="fa-solid fa-star"></i> Tipp</span>
      <h3>${esc(g.name)}</h3><p><i class="fa-solid fa-location-dot"></i> ${esc(g.ort)}${g.region?' · '+esc(g.region):''}</p>
      ${g.bannerText?`<p>${esc(g.bannerText)}</p>`:g.kohlfahrt&&g.preis!==''?`<p><i class="fa-solid fa-leaf"></i> Kohlfahrt ab ${fmtEur(g.preis)} p. P.</p>`:''}</a>`).join('')
    +Array.from({length:free},()=>`<a class="premium empty" href="#banner"><i class="fa-solid fa-bullhorn" style="font-size:2rem"></i><h3>Ihre Gaststätte hier?</h3><p>Premium-Banner für die Kohlfahrt-Saison buchen</p></a>`).join('');
}
const startLayers={routes:true,gasthaus:true,bossel:true,verleih:true};
function renderStartMap(){
  if(!maps.start){maps.start=makeMap($('#startMap'),{center:[53.0,7.9],zoom:8});maps.startLayer=L.layerGroup().addTo(maps.start);
    $('#startLayers').innerHTML=[['routes','Strecken','fa-route'],['gasthaus','Gaststätten','fa-utensils'],['bossel','Boßelangebote','fa-bowling-ball'],['verleih','Bollerwagen','fa-trailer']]
      .map(([k,l,i])=>`<label class="chip"><input type="checkbox" data-l="${k}" checked><i class="fa-solid ${i}"></i>${l}</label>`).join('');
    $$('#startLayers input').forEach(i=>i.onchange=()=>{startLayers[i.dataset.l]=i.checked;renderStartMap();});}
  const L0=maps.startLayer;L0.clearLayers();const pts=[];
  if(startLayers.routes)approved('route').forEach(r=>{const c=CATS[r.category]||CATS.kohlfahrt;
    if(!onlyStart(r))L.polyline(r.geometry,{color:c.color,weight:4,opacity:.85}).addTo(L0);
    L.marker(r.points[0],{icon:pinIcon(c.icon,c.color,28)}).addTo(L0).bindPopup(`<b>${esc(r.title)}</b><br>${esc(r.ort)} · ${kmLabel(r)}<br><button class="btn sm" data-route="${r.id}" style="margin-top:6px"><i class="fa-solid fa-eye"></i> Details</button>`)
      .on('popupopen',ev=>{const b=ev.popup.getElement().querySelector('[data-route]');if(b)b.onclick=()=>openRouteDetail(b.dataset.route);});pts.push(r.points[0]);});
  approved('gasthaus').forEach(g=>{
    const isB=!!g.bossel;if(isB?!(startLayers.bossel||startLayers.gasthaus):!startLayers.gasthaus)return;
    if(isB&&!startLayers.bossel&&!startLayers.gasthaus)return;
    const col=isB?'#e65100':(g.kohlfahrt?'#2e7d32':'#8d6e63');
    L.marker([g.lat,g.lng],{icon:pinIcon(isB?'fa-bowling-ball':'fa-utensils',col,30)}).addTo(L0).bindPopup(`<b>${esc(g.name)}</b><br>${esc(g.plz)} ${esc(g.ort)}${g.kohlfahrt&&g.preis!==''?`<br>Kohlfahrt ab ${fmtEur(g.preis)}`:''}${g.web?`<br><a href="${esc(safeUrl(g.web))}" target="_blank" rel="noopener">Webseite</a>`:''}`);pts.push([g.lat,g.lng]);});
  if(startLayers.verleih)approved('verleih').forEach(v=>{L.marker([v.lat,v.lng],{icon:pinIcon('fa-trailer','#f59e0b',30)}).addTo(L0).bindPopup(`<b>${esc(v.name)}</b><br>${esc(v.plz)} ${esc(v.ort)}`);pts.push([v.lat,v.lng]);});
  if(pts.length&&!maps.startFitted){maps.start.fitBounds(L.latLngBounds(pts),{padding:[30,30],maxZoom:11});maps.startFitted=true;}
}

/* ---------- Werbung bossel.de ---------- */
function renderAds(){
  $$('.ads[data-ads]').forEach(el=>{const n=+el.dataset.ads||2;const pick=[...ADS].sort(()=>Math.random()-.5).slice(0,n);
    el.innerHTML=pick.map(a=>`<a class="ad" href="${esc(a.url)}" target="_blank" rel="noopener"><span class="abadge">${esc(a.badge)}</span><img src="assets/img/products/${a.img}.svg" alt="" loading="lazy"><div><b>${esc(a.t)}</b><span class="s">${esc(a.s)}</span><span class="go">${esc(a.btn)} <i class="fa-solid fa-arrow-right"></i></span></div><span class="anz">bossel.de</span></a>`).join('');});
}

/* ---------- Spiele ---------- */
function gameCard(g){
  const sc=g.shop&&SHOP_CATS.find(c=>c.k===g.shop);
  return `<div class="game"><div class="gh"><div class="gi"><i class="fa-solid ${g.i}"></i></div><div><h3>${esc(g.t)}</h3><span class="gtag">${esc(g.tag)}</span></div></div>
    <div class="gmeta"><span><i class="fa-solid fa-users"></i> ${esc(g.pers)}</span><span><i class="fa-solid fa-location-dot"></i> ${esc(g.ort)}</span></div>
    <p>${esc(g.d)}</p><div class="gmat"><b><i class="fa-solid fa-box-open" style="color:var(--kf)"></i> Du brauchst:</b> ${esc(g.mat)}</div>
    ${sc?`<a class="gshop" href="${esc(sc.url)}" target="_blank" rel="noopener"><i class="fa-solid fa-store"></i> Passend bei bossel.de: ${esc(sc.t)}</a>`:''}</div>`;
}
let gTag='';
function renderSpiele(){
  if(!$('#gTags').dataset.init){$('#gTags').dataset.init=1;
    const tags=['',...new Set(GAMES.map(g=>g.tag))];
    $('#gTags').innerHTML=tags.map(t=>`<span class="chip ${t===''?'on':''}" data-t="${esc(t)}">${t?esc(t):'<i class="fa-solid fa-layer-group"></i> Alle'}</span>`).join('');
    $$('#gTags .chip').forEach(c=>c.onclick=()=>{gTag=c.dataset.t;$$('#gTags .chip').forEach(x=>x.classList.toggle('on',x===c));renderSpiele();});
    $('#gSearch').oninput=renderSpiele;
    $('#kingHost').innerHTML=KING_METHODS.map(([i,t,d])=>`<div class="king"><i class="fa-solid ${i}"></i><b>${esc(t)}</b><span class="muted">${esc(d)}</span></div>`).join('');}
  const q=norm($('#gSearch').value);
  const gs=GAMES.filter(g=>(!gTag||g.tag===gTag)&&(!q||norm([g.t,g.d,g.mat].join(' ')).includes(q)));
  $('#gamesHost').innerHTML=gs.map(gameCard).join('')||'<div class="card empty"><i class="fa-solid fa-dice"></i>Kein Spiel gefunden.</div>';
}

/* ---------- Shop ---------- */
function renderShop(){
  $('#shopTop').innerHTML=SHOP_CATS.filter(c=>c.top).map(c=>`<a class="shop-feature" href="${esc(c.url)}" target="_blank" rel="noopener"><img src="assets/img/products/${c.img}.svg" alt="" loading="lazy"><div><b>${esc(c.t)}</b><span>${esc(c.d)}</span><span class="go">Zum Shop <i class="fa-solid fa-arrow-up-right-from-square"></i></span></div></a>`).join('');
  $('#shopHost').innerHTML=SHOP_CATS.map(c=>`<a class="shop-cat" href="${esc(c.url)}" target="_blank" rel="noopener"><i class="fa-solid ${c.i} ic"></i><div><b>${esc(c.t)}</b><span>${esc(c.d)}</span></div></a>`).join('');
}

/* ---------- Banner buchen ---------- */
function renderBanner(){
  const host=$('#bannerFormHost');if(host.dataset.init)return;host.dataset.init=1;
  host.innerHTML=`<h3><i class="fa-solid fa-paper-plane" style="color:var(--kf)"></i> Werbeplatz anfragen</h3>
  <form novalidate>
    <div class="row3" style="grid-template-columns:1fr 1fr">
      <div><label class="fl"><i class="fa-solid fa-utensils"></i> Gaststätte <span class="req">*</span></label><input type="text" name="name" maxlength="120"></div>
      <div><label class="fl"><i class="fa-solid fa-location-dot"></i> Ort <span class="req">*</span></label><input type="text" name="ort" maxlength="100"></div>
      <div><label class="fl"><i class="fa-solid fa-user"></i> Ansprechpartner <span class="req">*</span></label><input type="text" name="person" maxlength="100"></div>
      <div><label class="fl"><i class="fa-solid fa-envelope"></i> E-Mail <span class="req">*</span></label><input type="email" name="email" maxlength="150"></div>
      <div><label class="fl"><i class="fa-solid fa-phone"></i> Telefon</label><input type="tel" name="telefon" maxlength="40"></div>
      <div><label class="fl"><i class="fa-solid fa-box"></i> Paket</label><select name="paket"><option>Premium-Banner</option><option>Saison-Paket</option><option>Basis-Eintrag</option></select></div>
    </div>
    <label class="fl"><i class="fa-solid fa-align-left"></i> Nachricht</label><textarea name="nachricht" maxlength="2000" placeholder="Zeitraum, Wünsche, Fragen…"></textarea>
    ${captchaHTML()}
    <label class="check"><input type="checkbox" name="privacy"> <span>Ich habe die <a href="#datenschutz">Datenschutzerklärung</a> gelesen.</span></label>
    <div class="err hidden"></div>
    <div class="btnrow" style="margin-top:14px"><button type="submit" class="btn lg"><i class="fa-solid fa-paper-plane"></i> Anfrage senden</button></div>
  </form>`;
  const form=$('form',host);loadCaptcha(form);
  form.onsubmit=async e=>{e.preventDefault();const err=$('.err',form),fail=m=>{err.innerHTML='<i class="fa-solid fa-circle-exclamation"></i> '+m;err.classList.remove('hidden');};err.classList.add('hidden');
    const d={name:form.name.value.trim(),ort:form.ort.value.trim(),person:form.person.value.trim(),email:form.email.value.trim(),telefon:form.telefon.value.trim(),paket:form.paket.value,nachricht:form.nachricht.value.trim()};
    if(!d.name||!d.ort||!d.person||!d.email)return fail('Bitte alle Pflichtfelder ausfüllen.');
    if(!form.privacy.checked)return fail('Bitte die Datenschutzerklärung bestätigen.');
    try{await withBusy($('button[type=submit]',form),()=>api('banner_request',{...d,privacy:true,...captchaData(form)}));}
    catch(ex){if(ex.data?.newCaptcha)loadCaptcha(form);return fail(esc(ex.message));}
    host.innerHTML=`<div style="text-align:center;padding:20px"><div style="font-size:3rem;color:var(--kf)"><i class="fa-solid fa-circle-check"></i></div><h2>Vielen Dank!</h2><p>Ihre Anfrage ist bei uns eingegangen. Wir melden uns zeitnah mit einem Angebot.</p></div>`;};
}

function routeCard(r){
  const th=r.photos?.[0]?`<img class="thumb" src="${r.photos[0]}" alt="">`:`<div class="thumb" style="color:${CATS[r.category]?.color}"><i class="fa-solid ${CATS[r.category]?.icon}"></i></div>`;
  return `<div class="card rcard" data-id="${r.id}">${th}<div>
    ${catBadge(r.category)}
    <h3>${esc(r.title)}</h3>
    <div class="meta"><span><i class="fa-solid fa-location-dot"></i>${esc(r.plz)} ${esc(r.ort)}</span><span><i class="fa-solid fa-ruler"></i>${kmLabel(r)}</span>${r.roundtrip?'<span><i class="fa-solid fa-arrows-rotate"></i>Rundtour</span>':''}${r.photos?.length?`<span><i class="fa-solid fa-camera"></i>${r.photos.length}</span>`:''}</div>
    <div style="margin-top:4px">${starsHTML(avg(r.ratings),r.ratings?.length||0)}</div>
    <div class="ficons">${featIcons(r.features)}</div></div></div>`;
}
function bindRouteCards(root){
  $$('.rcard',root).forEach(c=>{c.onclick=()=>openRouteDetail(c.dataset.id);
    c.onmouseenter=()=>{const l=routeLayers[c.dataset.id];if(l)l.line.setStyle({weight:9,opacity:1}).bringToFront();};
    c.onmouseleave=()=>{const l=routeLayers[c.dataset.id];if(l)l.line.setStyle({weight:5,opacity:.85});};});
}

const rFilter={cat:'all',feats:new Set()};
function initStrecken(){
  $('#rCats').innerHTML=[['all','Alle','fa-layer-group'],...Object.entries(CATS).map(([k,c])=>[k,c.label,c.icon])].map(([k,l,i])=>`<span class="chip ${k==='all'?'on':''}" data-c="${k}"><i class="fa-solid ${i}"></i>${l}</span>`).join('');
  $$('#rCats .chip').forEach(ch=>ch.onclick=()=>{rFilter.cat=ch.dataset.c;$$('#rCats .chip').forEach(x=>x.classList.toggle('on',x===ch));renderRouteList(true);});
  $('#rFeats').innerHTML=FEATURES.map(f=>`<label class="chip"><input type="checkbox" value="${f.k}"><i class="fa-solid ${f.i}"></i>${f.l}</label>`).join('');
  $$('#rFeats input').forEach(i=>i.onchange=()=>{i.checked?rFilter.feats.add(i.value):rFilter.feats.delete(i.value);$('#rFeatCount').textContent=rFilter.feats.size?`(${rFilter.feats.size})`:'';renderRouteList(true);});
  $('#rSearch').oninput=()=>renderRouteList(true);$('#rSort').onchange=()=>renderRouteList(false);
  $('#routesLegend').innerHTML=Object.values(CATS).map(c=>`<span><i class="dot" style="--c:${c.color}"></i>${c.label}</span>`).join('')+'<span><i class="fa-solid fa-flag" style="color:#2e7d32"></i> Start</span>';
  maps.routes=makeMap($('#routesMap'));maps.routesLayer=L.layerGroup().addTo(maps.routes);
}
function renderRouteList(fit=true){
  if(!maps.routes)initStrecken();
  const q=norm($('#rSearch').value);
  let rs=approved('route').filter(r=>{
    if(rFilter.cat!=='all'&&!(r.category===rFilter.cat||(r.category==='beides'&&rFilter.cat!=='beides')))return false;
    for(const f of rFilter.feats)if(!r.features?.includes(f))return false;
    return !q||norm([r.title,r.ort,r.plz,r.description].join(' ')).includes(q);});
  const s=$('#rSort').value;
  rs.sort({rating:(a,b)=>avg(b.ratings)-avg(a.ratings)||b.ratings.length-a.ratings.length,new:(a,b)=>b.created-a.created,short:(a,b)=>a.lengthKm-b.lengthKm,long:(a,b)=>b.lengthKm-a.lengthKm,az:(a,b)=>a.title.localeCompare(b.title,'de')}[s]);
  $('#routeList').innerHTML=rs.length?`<div class="muted" style="font-weight:700"><i class="fa-solid fa-list"></i> ${rs.length} Strecke${rs.length===1?'':'n'} gefunden</div>`+rs.map(routeCard).join(''):
    '<div class="card empty"><i class="fa-solid fa-map"></i>Keine Strecke gefunden. Filter anpassen oder <a href="#eintragen">neue Strecke eintragen</a>.</div>';
  bindRouteCards($('#routeList'));
  maps.routesLayer.clearLayers();routeLayers={};const all=[];
  rs.forEach(r=>{const c=CATS[r.category]||CATS.bossel;
    const line=L.polyline(r.geometry,{color:c.color,weight:5,opacity:.85}).addTo(maps.routesLayer);
    const m=L.marker(r.points[0],{icon:pinIcon(c.icon,c.color)}).addTo(maps.routesLayer);
    const pop=`<b>${esc(r.title)}</b><br>${esc(r.plz)} ${esc(r.ort)} · ${kmLabel(r)}<br>${starsHTML(avg(r.ratings),r.ratings.length)}<br><button class="btn sm" style="margin-top:6px" data-route="${r.id}"><i class="fa-solid fa-eye"></i> Details</button>`;
    line.bindPopup(pop);m.bindPopup(pop);[line,m].forEach(l=>l.on('popupopen',ev=>{const btn=ev.popup.getElement().querySelector('[data-route]');if(btn)btn.onclick=()=>openRouteDetail(btn.dataset.route);}));
    const hl=on=>{const card=$(`#routeList .rcard[data-id="${r.id}"]`);card&&card.classList.toggle('hl',on);};
    line.on('mouseover',()=>hl(true));line.on('mouseout',()=>hl(false));
    routeLayers[r.id]={line,m};all.push(...r.geometry);});
  if(fit&&all.length)maps.routes.fitBounds(L.latLngBounds(all),{padding:[30,30],maxZoom:13});
}

function nearby(type,pt,km=NEAR_KM){return approved(type).map(x=>({x,d:dist(pt,type==='route'?x.points[0]:[x.lat,x.lng])})).filter(o=>o.d<=km).sort((a,b)=>a.d-b.d);}

function openRouteDetail(id){
  const r=find('route',id);if(!r)return;const c=CATS[r.category]||CATS.bossel;
  const voted=state.voted?.[id];
  const nG=nearby('gasthaus',r.points[0]),nV=nearby('verleih',r.points[0]);
  const m=openModal(`
    <div class="dt-head">${catBadge(r.category)} ${r.status!=='approved'?stBadge(r.status):''}</div>
    <h2 style="font-size:1.9rem;margin:4px 0">${esc(r.title)}</h2>
    <div class="meta" style="font-size:.98rem"><span><i class="fa-solid fa-location-dot"></i>${esc(r.plz)} ${esc(r.ort)}</span><span><i class="fa-solid fa-ruler"></i>${kmLabel(r)}</span>
      <span><i class="fa-solid ${r.roundtrip?'fa-arrows-rotate':'fa-arrow-right-long'}"></i>${onlyStart(r)?'Startpunkt':r.roundtrip?'Rundtour':'Strecke A → B'}</span>${onlyStart(r)?'':`<span><i class="fa-solid fa-clock"></i>ca. ${Math.max(1,Math.round((r.lengthKm||0)/3*60/15)*15)} Min. Gehzeit (+ Würfe)</span>`}</div>
    <div style="margin-top:6px">${starsHTML(avg(r.ratings),r.ratings?.length||0)}</div>
    <div class="dt-grid">
      <div><div class="map dt-map" id="dtMap"></div>
        <div class="btnrow" style="margin-top:8px"><a class="btn sky sm" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${r.points[0][0]},${r.points[0][1]}"><i class="fa-solid fa-diamond-turn-right"></i> Navigation zum Start</a>
        <button class="btn ghost sm" id="dtGpx"><i class="fa-solid fa-download"></i> GPX</button></div></div>
      <div>
        ${r.photos?.length?`<div class="dt-photos">${r.photos.map(p=>`<img src="${p}" alt="Foto der Strecke">`).join('')}</div>`:''}
        ${r.description?`<p style="margin-top:0">${esc(r.description).replace(/\n/g,'<br>')}</p>`:''}
        <h4><i class="fa-solid fa-list-check" style="color:var(--grass-d)"></i> Besonderheiten</h4>
        <div class="flist">${featTags(r.features)||'<span class="muted">keine Angaben</span>'}</div>
        <div class="ratebox"><b><i class="fa-solid fa-star" style="color:#f5b301"></i> ${voted?'Deine Bewertung':'Wie gefällt dir die Strecke?'}</b>
          <div class="rate" id="dtRate">${[1,2,3,4,5].map(i=>`<button aria-label="${i} Sterne" data-v="${i}" class="${voted>=i?'on':''}"><i class="fa-solid fa-star"></i></button>`).join('')}</div>
          <div class="muted" style="font-size:.85rem" id="dtRateTxt">${voted?'Danke! Du hast bereits abgestimmt.':'Klicke auf 1 bis 5 Sterne.'}</div></div>
      </div>
    </div>
    <div class="ads compact" data-ads="2" style="margin-top:16px"></div>
    ${SHOW_GASTRO?`<div class="dt-grid" style="margin-top:18px">
      <div><h4><i class="fa-solid fa-utensils" style="color:var(--brown)"></i> Gaststätten in der Nähe (${NEAR_KM} km)</h4>${nG.length?nG.slice(0,4).map(o=>`<div class="ftag sky" style="margin:0 6px 6px 0">${o.x.kohlfahrt?'<i class="fa-solid fa-leaf"></i>':'<i class="fa-solid fa-utensils"></i>'}${esc(o.x.name)} · ${o.d.toFixed(1).replace('.',',')} km</div>`).join(''):'<span class="muted">Keine eingetragen.</span>'}</div>
      <div><h4><i class="fa-solid fa-trailer" style="color:var(--amber)"></i> Bollerwagenverleih in der Nähe</h4>${nV.length?nV.slice(0,4).map(o=>`<div class="ftag sky" style="margin:0 6px 6px 0"><i class="fa-solid fa-trailer"></i>${esc(o.x.name)} · ${o.d.toFixed(1).replace('.',',')} km</div>`).join(''):'<span class="muted">Keine eingetragen.</span>'}</div>
    </div>`:''}`,{wide:true});
  renderAds();
  const map=makeMap($('#dtMap',m.el));
  L.polyline(r.geometry,{color:c.color,weight:6}).addTo(map);
  L.marker(r.points[0],{icon:pinIcon(r.roundtrip?'fa-arrows-rotate':'fa-flag','#2e7d32')}).addTo(map).bindPopup('Start');
  if(!r.roundtrip&&!onlyStart(r))L.marker(r.points[r.points.length-1],{icon:pinIcon('fa-flag-checkered','#c62828')}).addTo(map).bindPopup('Ziel');
  if(SHOW_GASTRO)nG.forEach(o=>L.marker([o.x.lat,o.x.lng],{icon:pinIcon('fa-utensils',o.x.kohlfahrt?'#2e7d32':'#8d6e63',28)}).addTo(map).bindPopup(esc(o.x.name)));
  setTimeout(()=>{map.invalidateSize();if(onlyStart(r))map.setView(r.points[0],15);else map.fitBounds(L.latLngBounds(r.geometry),{padding:[25,25],maxZoom:15});},50);
  $$('.dt-photos img',m.el).forEach(i=>i.onclick=()=>lightbox(i.src));
  $('#dtGpx',m.el).onclick=()=>{const gpx=`<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Kohlfahrten.de" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>${esc(r.title)}</name><trkseg>${r.geometry.map(p=>`<trkpt lat="${p[0]}" lon="${p[1]}"/>`).join('')}</trkseg></trk></gpx>`;
    download(r.title.replace(/[^\wäöüß-]+/gi,'_')+'.gpx',gpx,'application/gpx+xml');};
  const btns=$$('#dtRate button',m.el);
  btns.forEach(b=>{b.onmouseenter=()=>{if(!state.voted[id])btns.forEach(x=>x.classList.toggle('on',+x.dataset.v<=+b.dataset.v));};
    b.onmouseleave=()=>{if(!state.voted[id])btns.forEach(x=>x.classList.remove('on'));};
    b.onclick=async()=>{const v=+b.dataset.v;if(state.voted[id]){toast('Du hast diese Strecke bereits bewertet.','warn');return;}
      try{const j=await api('rate',{id,stars:v});r.ratings=j.ratings;}catch(ex){if(ex.status===409){state.voted[id]=v;saveVotes();}toast(esc(ex.message),'warn');return;}
      state.voted[id]=v;saveVotes();btns.forEach(x=>x.classList.toggle('on',+x.dataset.v<=v));
      $('#dtRateTxt',m.el).textContent=`Danke für deine ${v}-Sterne-Bewertung!`;toast(`Bewertung gespeichert: ${'★'.repeat(v)}`);refreshCurrent();};});
}
window.openRouteDetail=openRouteDetail;

function download(name,text,type='text/plain'){
  try{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);}
  catch(e){toast('Download nicht möglich','err');}
}

/* ---------- Eintragen ---------- */
function renderEintragen(){
  const host=$('#routeFormHost');
  if(host.dataset.mounted){setTimeout(()=>host._ed&&host._ed.map.invalidateSize(),50);return;}
  host.dataset.mounted='1';
  host._ed=mountRouteForm(host,{onDone:item=>{
    host.dataset.mounted='';host.innerHTML=`<div class="card" style="text-align:center;padding:40px;max-width:640px;margin:0 auto">
      <div style="font-size:3rem;color:var(--grass-d)"><i class="fa-solid fa-circle-check"></i></div>
      <h2>Danke für deine Strecke!</h2><p>„<b>${esc(item.title)}</b>“ wurde eingereicht und wird von der Redaktion geprüft. Nach der Freigabe erscheint sie in der Streckenliste.</p>
      ${item.raffle?'<p class="raffle-box" style="text-align:left"><i class="fa-solid fa-gift" style="color:#c62828"></i> <b>Du nimmst am Gewinnspiel teil!</b> Sobald deine Strecke freigegeben ist, bist du in der Auslosung dieses Monats dabei. Viel Glück!</p>':''}
      <div class="btnrow" style="justify-content:center"><button class="btn" id="again"><i class="fa-solid fa-plus"></i> Weitere Strecke eintragen</button><a class="btn ghost" href="#strecken"><i class="fa-solid fa-route"></i> Zu den Strecken</a></div></div>`;
    $('#again').onclick=()=>renderEintragen();window.scrollTo(0,0);}});
}

/* ---------- Gasthäuser ---------- */
const ghFilter=new Set();
function ghCard(g){
  const nR=nearby('route',[g.lat,g.lng]);const prem=isPremium(g);
  return `<div class="card ecard ${prem?'premium-on':''}" data-id="${g.id}">
    ${prem?'<span class="pill" style="background:#ffd84d;color:#3a2600;margin-bottom:6px"><i class="fa-solid fa-star"></i> Tipp der Redaktion</span>':''}
    <h3><i class="fa-solid ${g.bossel?'fa-bowling-ball':'fa-utensils'}" style="color:${g.bossel?'#e65100':g.kohlfahrt?'var(--grass-d)':'var(--brown)'}"></i>${esc(g.name)}</h3>
    <div class="addr"><i class="fa-solid fa-location-dot"></i> ${g.adresse?esc(g.adresse)+', ':''}${esc(g.plz)} ${esc(g.ort)}${g.region?` · <span class="ftag region-tag" style="padding:1px 8px;font-size:.78rem">${esc(g.region)}</span>`:''}${g.saal?` · <i class="fa-solid fa-users"></i> Saal bis ${esc(g.saal)} Pers.`:''}</div>
    ${g.kohlfahrt?`<div class="kohlbox"><h4><i class="fa-solid fa-leaf"></i> Kohlfahrt-Angebot ${g.preis!==''&&g.preis!=null?`<span class="price" style="margin-left:auto">${fmtEur(g.preis)}<small style="font-size:.7rem;color:var(--muted)"> p. P.</small></span>`:''}</h4>
      <div class="meta" style="margin-bottom:6px">${g.saison?`<span><i class="fa-solid fa-calendar"></i>${esc(g.saison)}</span>`:''}${g.minPers?`<span><i class="fa-solid fa-people-group"></i>ab ${esc(g.minPers)} Personen</span>`:''}</div>
      ${g.kohlText?`<div style="font-size:.92rem;margin-bottom:8px">${esc(g.kohlText)}</div>`:''}<div class="flist">${featTags(g.inkl,GI)}</div></div>`:''}
    ${g.bossel?`<div class="kohlbox" style="background:linear-gradient(135deg,#fff3e0,#fffaf2);border-color:#ffcc80"><h4 style="color:#e65100"><i class="fa-solid fa-bowling-ball"></i> Boßelveranstaltung</h4><div style="font-size:.92rem">${esc(g.bosselText||'Boßelgruppen willkommen.')}</div></div>`:''}
    ${!g.kohlfahrt&&!g.bossel?`<div class="flist" style="margin:10px 0">${featTags(g.inkl,GI)}</div>`:''}
    <div class="contact">${g.web?`<a class="btn sm" href="${esc(safeUrl(g.web))}" target="_blank" rel="noopener"><i class="fa-solid fa-globe" style="color:#fff"></i> Zur Gaststätte</a>`:''}
      ${g.telefon?`<a href="tel:${esc(g.telefon.replace(/[^\d+]/g,''))}"><i class="fa-solid fa-phone"></i>${esc(g.telefon)}</a>`:''}${g.email?`<a href="mailto:${esc(g.email)}"><i class="fa-solid fa-envelope"></i>${esc(g.email)}</a>`:''}</div>
    ${nR.length?`<div class="near"><i class="fa-solid fa-route" style="color:var(--kf)"></i> Strecken in der Nähe: ${nR.slice(0,3).map(o=>`<a href="javascript:void(0)" data-route="${o.x.id}">${esc(o.x.title)}</a> (${o.d.toFixed(1).replace('.',',')} km)`).join(', ')}</div>`:''}
    ${g.quelle?`<div class="src"><i class="fa-solid fa-circle-info"></i> Angaben ohne Gewähr · Quelle: <a href="${esc(safeUrl(g.quelle))}" target="_blank" rel="noopener">${esc(new URL(safeUrl(g.quelle)).hostname.replace(/^www\./,''))}</a></div>`:''}
  </div>`;
}
function renderGast(){
  if(!maps.gh){maps.gh=makeMap($('#ghMap'));maps.ghLayer=L.layerGroup().addTo(maps.gh);
    $('#ghSearch').oninput=renderGast;$('#ghOnlyKohl').onchange=renderGast;$('#ghOnlyBossel').onchange=renderGast;$('#ghRegion').onchange=renderGast;$('#ghSuggest').onclick=()=>openEntityForm('gasthaus');
    $('#ghRegion').innerHTML='<option value="">Alle Regionen</option>'+REGIONS.map(r=>`<option>${esc(r)}</option>`).join('');
    $('#ghFeats').innerHTML=GH_INKL.map(f=>`<label class="chip"><input type="checkbox" value="${f.k}"><i class="fa-solid ${f.i}"></i>${f.l}</label>`).join('');
    $$('#ghFeats input').forEach(i=>i.onchange=()=>{i.checked?ghFilter.add(i.value):ghFilter.delete(i.value);renderGast();});}
  const q=norm($('#ghSearch').value),onlyK=$('#ghOnlyKohl').checked,onlyB=$('#ghOnlyBossel').checked,reg=$('#ghRegion').value;
  const gs=approved('gasthaus').filter(g=>(!onlyK||g.kohlfahrt)&&(!onlyB||g.bossel)&&(!reg||g.region===reg)&&[...ghFilter].every(f=>g.inkl?.includes(f))&&(!q||norm([g.name,g.ort,g.plz,g.adresse,g.region].join(' ')).includes(q)))
    .sort((a,b)=>(isPremium(b)-isPremium(a))||(b.kohlfahrt+b.bossel-a.kohlfahrt-a.bossel)||a.name.localeCompare(b.name,'de'));
  $('#ghList').innerHTML=(gs.length?`<div class="muted" style="font-weight:700"><i class="fa-solid fa-list"></i> ${gs.length} Gaststätte${gs.length===1?'':'n'}</div>`+gs.map(ghCard).join(''):'<div class="card empty"><i class="fa-solid fa-utensils"></i>Keine Gaststätte gefunden.</div>')
    +'<div class="ads compact" data-ads="2"></div>';
  renderAds();
  entityMap(maps.gh,maps.ghLayer,gs,g=>pinIcon(g.bossel?'fa-bowling-ball':g.kohlfahrt?'fa-leaf':'fa-utensils',g.bossel?'#e65100':g.kohlfahrt?'#2e7d32':'#8d6e63'),g=>`<b>${esc(g.name)}</b><br>${esc(g.plz)} ${esc(g.ort)}${g.kohlfahrt&&g.preis!==''?`<br><i class="fa-solid fa-leaf" style="color:#2e7d32"></i> Kohlfahrt ab ${fmtEur(g.preis)}`:''}`,'#ghList');
}
function entityMap(map,layer,items,icon,pop,listSel){
  layer.clearLayers();const pts=[];
  items.forEach(x=>{const m=L.marker([x.lat,x.lng],{icon:icon(x)}).addTo(layer).bindPopup(pop(x));pts.push([x.lat,x.lng]);
    m.on('click',()=>{const c=$(`${listSel} [data-id="${x.id}"]`);if(c){c.scrollIntoView({behavior:'smooth',block:'center'});c.classList.add('hl');c.style.outline='3px solid var(--sky)';setTimeout(()=>{c.style.outline='';},1600);}});});
  $$(`${listSel} .ecard`).forEach(c=>c.onclick=e=>{if(e.target.closest('a,button'))return;const x=items.find(i=>i.id===c.dataset.id);if(x)map.setView([x.lat,x.lng],14);});
  if(pts.length)map.fitBounds(L.latLngBounds(pts),{padding:[40,40],maxZoom:13});
}

/* ---------- Verleih ---------- */
const vlFilter=new Set();
function vlCard(v){
  return `<div class="card ecard" data-id="${v.id}">
    <h3><i class="fa-solid fa-trailer" style="color:var(--amber)"></i>${esc(v.name)}</h3>
    <div class="addr"><i class="fa-solid fa-location-dot"></i> ${esc(v.adresse)}${v.adresse?', ':''}${esc(v.plz)} ${esc(v.ort)}</div>
    ${(()=>{const fs=[[v.preisTag,'fa-euro-sign',fmtEur(v.preisTag),'pro Tag'],[v.preisWE,'fa-calendar-week',fmtEur(v.preisWE),'Wochenende'],[v.kaution,'fa-hand-holding-dollar',fmtEur(v.kaution),'Kaution'],[v.anzahl,'fa-trailer',esc(v.anzahl),'Wagen verfügbar'],[v.zuladung,'fa-weight-hanging',esc(v.zuladung)+' kg','Zuladung'],[v.kisten,'fa-beer-mug-empty',esc(v.kisten),'Getränkekisten']].filter(f=>f[0]!==''&&f[0]!=null);
      return fs.length?`<div class="facts">${fs.map(f=>`<div class="fact"><i class="fa-solid ${f[1]}"></i><b>${f[2]}</b><span>${f[3]}</span></div>`).join('')}</div>`:'';})()}
    ${v.beschreibung?`<div style="font-size:.93rem;margin-bottom:8px">${esc(v.beschreibung)}</div>`:''}
    <div class="flist">${featTags(v.ausst,VA)}</div>
    <div class="contact">${v.web?`<a class="btn sm amber" href="${esc(safeUrl(v.web))}" target="_blank" rel="noopener"><i class="fa-solid fa-globe" style="color:#3a2600"></i> Webseite</a>`:''}
      ${v.telefon?`<a href="tel:${esc(v.telefon.replace(/\s/g,''))}"><i class="fa-solid fa-phone"></i>${esc(v.telefon)}</a>`:''}${v.email?`<a href="mailto:${esc(v.email)}"><i class="fa-solid fa-envelope"></i>${esc(v.email)}</a>`:''}</div>
  </div>`;
}
function renderVerleih(){
  if(!maps.vl){maps.vl=makeMap($('#vlMap'));maps.vlLayer=L.layerGroup().addTo(maps.vl);
    $('#vlSearch').oninput=renderVerleih;$('#vlSuggest').onclick=()=>openEntityForm('verleih');
    $('#vlFeats').innerHTML=VL_AUSST.map(f=>`<label class="chip"><input type="checkbox" value="${f.k}"><i class="fa-solid ${f.i}"></i>${f.l}</label>`).join('');
    $$('#vlFeats input').forEach(i=>i.onchange=()=>{i.checked?vlFilter.add(i.value):vlFilter.delete(i.value);renderVerleih();});}
  const q=norm($('#vlSearch').value);
  const vs=approved('verleih').filter(v=>[...vlFilter].every(f=>v.ausst?.includes(f))&&(!q||norm([v.name,v.ort,v.plz].join(' ')).includes(q)));
  $('#vlList').innerHTML=(vs.length?vs.map(vlCard).join(''):'<div class="card empty"><i class="fa-solid fa-trailer"></i>Kein Verleih mit dieser Ausstattung gefunden.</div>')+'<div class="ads compact" data-ads="2"></div>';renderAds();
  entityMap(maps.vl,maps.vlLayer,vs,()=>pinIcon('fa-trailer','#f59e0b'),v=>`<b>${esc(v.name)}</b><br>${esc(v.plz)} ${esc(v.ort)}${v.preisTag!==''&&v.preisTag!=null?`<br>ab ${fmtEur(v.preisTag)} / Tag`:''}`,'#vlList');
}

/* ---------- Formular Gasthaus / Verleih ---------- */
const ENT_FIELDS={
  gasthaus:[['name','Name der Gaststätte','fa-utensils','text',1],['adresse','Straße & Hausnummer','fa-road','text'],['plz','PLZ','fa-hashtag','text',1],['ort','Ort','fa-city','text',1],
    ['web','Link zur Gaststätte (Webseite)','fa-globe','url'],['telefon','Telefon','fa-phone','tel'],['email','E-Mail','fa-envelope','email'],['saal','Saalgröße (Personen)','fa-users','number']],
  verleih:[['name','Name des Verleihs','fa-trailer','text',1],['adresse','Straße & Hausnummer','fa-road','text'],['plz','PLZ','fa-hashtag','text',1],['ort','Ort','fa-city','text',1],
    ['web','Internetadresse','fa-globe','url'],['telefon','Telefon','fa-phone','tel'],['email','E-Mail','fa-envelope','email'],
    ['anzahl','Anzahl Bollerwagen','fa-trailer','number'],['preisTag','Preis pro Tag (€)','fa-euro-sign','number'],['preisWE','Preis Wochenende (€)','fa-calendar-week','number'],
    ['kaution','Kaution (€)','fa-hand-holding-dollar','number'],['zuladung','Max. Zuladung (kg)','fa-weight-hanging','number'],['kisten','Platz für Getränkekisten','fa-beer-mug-empty','number']]
};
function openEntityForm(type,item=null,admin=false){
  const t=TYPES[type],x=item?JSON.parse(JSON.stringify(item)):{inkl:[],ausst:[],kohlfahrt:type==='gasthaus'};
  const field=([k,l,i,tp,req])=>`<div><label class="fl"><i class="fa-solid ${i}"></i> ${l}${req?' <span class="req">*</span>':''}</label><input type="${tp}" name="${k}" value="${esc(x[k]??'')}" ${tp==='number'?'step="any" min="0"':''}></div>`;
  const fl=ENT_FIELDS[type];
  const m=openModal(`
    <h2><i class="fa-solid ${t.icon}" style="color:${t.color}"></i> ${item?'Bearbeiten':t.label+' eintragen'}</h2>
    ${admin?'':'<p class="muted" style="margin-top:0">Der Eintrag wird nach Prüfung durch die Redaktion veröffentlicht.</p>'}
    <form novalidate>
      <div class="row3" style="grid-template-columns:2fr 2fr 1fr 1.5fr">${fl.slice(0,4).map(field).join('')}</div>
      <div class="ed-toolbar" style="margin-top:12px"><button type="button" class="btn sky sm" data-a="geo"><i class="fa-solid fa-magnifying-glass-location"></i> Adresse in Karte suchen</button>
        <span class="muted" style="font-size:.85rem"><i class="fa-solid fa-hand-pointer"></i> oder Standort direkt in die Karte klicken – Adresse wird ergänzt.</span></div>
      <div class="map" style="height:280px" id="entMap"></div>
      <div class="row3">${fl.slice(4).map(field).join('')}</div>
      ${type==='gasthaus'?`
        <div class="kohlbox" style="margin-top:16px">
          <label class="check" style="margin:0"><input type="checkbox" name="kohlfahrt" ${x.kohlfahrt?'checked':''}> <b><i class="fa-solid fa-leaf" style="color:var(--grass-d)"></i> Wir bieten ein Kohlfahrt-Angebot an</b></label>
          <div class="kf ${x.kohlfahrt?'':'hidden'}">
            <div class="row3"><div><label class="fl"><i class="fa-solid fa-euro-sign"></i> Preis p. P. (€)</label><input type="number" step="0.1" min="0" name="preis" value="${esc(x.preis??'')}"></div>
              <div><label class="fl"><i class="fa-solid fa-calendar"></i> Saison</label><input type="text" name="saison" placeholder="z. B. Nov – März" value="${esc(x.saison??'')}"></div>
              <div><label class="fl"><i class="fa-solid fa-people-group"></i> ab Personen</label><input type="number" min="1" name="minPers" value="${esc(x.minPers??'')}"></div></div>
            <label class="fl"><i class="fa-solid fa-align-left"></i> Beschreibung des Angebots</label><textarea name="kohlText">${esc(x.kohlText??'')}</textarea>
          </div>
        </div>
        <div class="kohlbox" style="background:linear-gradient(135deg,#fff3e0,#fffaf2);border-color:#ffcc80">
          <label class="check" style="margin:0"><input type="checkbox" name="bossel" ${x.bossel?'checked':''}> <b><i class="fa-solid fa-bowling-ball" style="color:#e65100"></i> Boßelveranstaltungen / Boßelpartys</b></label>
          <label class="fl"><i class="fa-solid fa-align-left"></i> Beschreibung Boßelangebot</label><textarea name="bosselText" placeholder="z. B. Boßelparty im Saal, Kugeln &amp; Kescher werden gestellt">${esc(x.bosselText??'')}</textarea>
        </div>
        <div class="row3" style="grid-template-columns:1fr 1fr">
          <div><label class="fl"><i class="fa-solid fa-map"></i> Region</label><select name="region"><option value="">– bitte wählen –</option>${REGIONS.map(r=>`<option ${x.region===r?'selected':''}>${esc(r)}</option>`).join('')}</select></div>
          <div><label class="fl"><i class="fa-solid fa-link"></i> Quelle der Angaben (optional)</label><input type="url" name="quelle" value="${esc(x.quelle??'')}"></div>
        </div>
        ${admin?`<div class="kohlbox" style="background:linear-gradient(135deg,#fffde7,#fff8d6);border-color:#ffe082">
          <label class="check" style="margin:0"><input type="checkbox" name="premium" ${x.premium?'checked':''}> <b><i class="fa-solid fa-star" style="color:#e0a800"></i> Premium-Banner (bezahlt) – auf der Startseite und oben in der Liste</b></label>
          <div class="row3" style="grid-template-columns:1fr 2fr"><div><label class="fl"><i class="fa-solid fa-calendar"></i> Banner bis</label><input type="date" name="premiumBis" value="${esc(x.premiumBis??'')}"></div>
          <div><label class="fl"><i class="fa-solid fa-quote-left"></i> Werbetext</label><input type="text" name="bannerText" maxlength="120" value="${esc(x.bannerText??'')}" placeholder="z. B. Kohlfahrt mit Live-Musik – jetzt Termine sichern!"></div></div>
          <label class="fl"><i class="fa-solid fa-image"></i> Bannerbild (Querformat)</label>
          <div class="btnrow"><input type="file" name="bannerFile" accept="image/*" style="max-width:320px"><span class="muted" style="font-size:.85rem">${x.bannerImg?'Aktuelles Bild vorhanden – neues Bild ersetzt es.':'Ohne Bild wird ein grüner Banner angezeigt.'}</span>${x.bannerImg?'<label class="check" style="margin:0"><input type="checkbox" name="bannerDel"> Bild entfernen</label>':''}</div>
        </div>`:''}
        <label class="fl"><i class="fa-solid fa-list-check"></i> Leistungen &amp; Inklusive</label>
        <div class="chips">${GH_INKL.map(f=>`<label class="chip"><input type="checkbox" name="inkl" value="${f.k}" ${x.inkl?.includes(f.k)?'checked':''}><i class="fa-solid ${f.i}"></i>${f.l}</label>`).join('')}</div>`
      :`<label class="fl"><i class="fa-solid fa-align-left"></i> Beschreibung</label><textarea name="beschreibung">${esc(x.beschreibung??'')}</textarea>
        <label class="fl"><i class="fa-solid fa-toolbox"></i> Ausstattung der Bollerwagen</label>
        <div class="chips">${VL_AUSST.map(f=>`<label class="chip"><input type="checkbox" name="ausst" value="${f.k}" ${x.ausst?.includes(f.k)?'checked':''}><i class="fa-solid ${f.i}"></i>${f.l}</label>`).join('')}</div>`}
      ${admin?`<label class="fl"><i class="fa-solid fa-flag"></i> Status</label><select name="status">${Object.entries(STATUS).map(([k,[l]])=>`<option value="${k}" ${x.status===k?'selected':''}>${l}</option>`).join('')}</select>`
        :`<div class="row3" style="grid-template-columns:1fr 1fr"><div><label class="fl"><i class="fa-solid fa-user"></i> Dein Name</label><input type="text" name="author"></div><div><label class="fl"><i class="fa-solid fa-envelope"></i> Deine E-Mail (für Rückfragen)</label><input type="email" name="authorMail"></div></div>
          ${captchaHTML()}<label class="check"><input type="checkbox" name="privacy"> <span>Ich habe die <a href="#start">Datenschutzerklärung</a> gelesen.</span></label>`}
      <div class="err hidden"></div>
      <div class="btnrow" style="margin-top:16px;justify-content:flex-end"><button type="button" class="btn ghost" data-a="cancel">Abbrechen</button><button type="submit" class="btn"><i class="fa-solid ${admin?'fa-floppy-disk':'fa-paper-plane'}"></i> ${admin?'Speichern':'Einreichen'}</button></div>
    </form>`,{wide:true});
  const form=$('form',m.el);
  const map=makeMap($('#entMap',m.el),x.lat?{center:[x.lat,x.lng],zoom:14}:{});let marker=null,pos=x.lat?[x.lat,x.lng]:null;
  const setPos=(p,fill)=>{pos=p;if(marker)marker.setLatLng(p);else{marker=L.marker(p,{draggable:true,icon:pinIcon(t.icon,t.color)}).addTo(map);marker.on('dragend',()=>{const l=marker.getLatLng();setPos([+l.lat.toFixed(6),+l.lng.toFixed(6)],true);});}
    if(fill)reverseGeo(p[0],p[1]).then(g=>{if(!g)return;if(!form.plz.value)form.plz.value=g.plz;if(!form.ort.value)form.ort.value=g.ort;if(!form.adresse.value&&g.strasse)form.adresse.value=g.strasse;});};
  if(pos)setPos(pos,false);
  map.on('click',e=>setPos([+e.latlng.lat.toFixed(6),+e.latlng.lng.toFixed(6)],true));
  setTimeout(()=>map.invalidateSize(),60);
  $('[data-a=geo]',form).onclick=async()=>{const q=[form.adresse.value,form.plz.value,form.ort.value].filter(Boolean).join(', ');if(!q)return toast('Bitte zuerst Adresse, PLZ oder Ort eingeben','warn');
    const p=await geocode(q);if(p){setPos(p,false);map.setView(p,16);}else toast('Adresse nicht gefunden – bitte in die Karte klicken','warn');};
  $('[data-a=cancel]',form).onclick=m.close;
  const kf=form.kohlfahrt;if(kf)kf.onchange=()=>$('.kf',form).classList.toggle('hidden',!kf.checked);
  if(!admin)loadCaptcha(form);
  form.onsubmit=async e=>{e.preventDefault();const err=$('.err',form),fail=s=>{err.innerHTML='<i class="fa-solid fa-circle-exclamation"></i> '+s;err.classList.remove('hidden');};
    const d={};fl.forEach(([k,l,i,tp,req])=>{const v=form[k].value.trim();d[k]=tp==='number'?(v===''?'':+v):v;});
    for(const [k,l,,,req] of fl)if(req&&d[k]==='')return fail(`Bitte „${l}“ ausfüllen.`);
    if(!/^\d{5}$/.test(d.plz))return fail('Bitte eine gültige 5-stellige PLZ angeben.');
    if(!pos)return fail('Bitte den Standort in der Karte setzen (oder „Adresse in Karte suchen“).');
    d.lat=pos[0];d.lng=pos[1];
    if(type==='gasthaus'){d.kohlfahrt=form.kohlfahrt.checked;d.preis=form.preis.value===''?'':+form.preis.value;d.saison=form.saison.value.trim();d.minPers=form.minPers.value;d.kohlText=form.kohlText.value.trim();d.inkl=$$('[name=inkl]:checked',form).map(i=>i.value);
      d.bossel=form.bossel.checked;d.bosselText=form.bosselText.value.trim();d.region=form.region.value;d.quelle=form.quelle.value.trim();
      if(admin){d.premium=form.premium.checked;d.premiumBis=form.premiumBis.value;d.bannerText=form.bannerText.value.trim();
        d.bannerImg=x.bannerImg||'';if(form.bannerDel&&form.bannerDel.checked)d.bannerImg='';
        const bf=form.bannerFile.files[0];if(bf){try{d.bannerImg=await readPhoto(bf,1600);}catch(e2){return fail('Bannerbild konnte nicht gelesen werden.');}}}}
    else{d.beschreibung=form.beschreibung.value.trim();d.ausst=$$('[name=ausst]:checked',form).map(i=>i.value);}
    const sb=$('button[type=submit]',form);
    if(admin){d.status=form.status.value;d.id=item?.id;
      try{await withBusy(sb,()=>api('admin_save',{type,item:d}));}catch(ex){return fail(esc(ex.message));}
      await reload();toast('Gespeichert');m.close();refreshCurrent();return;}
    if(!form.privacy.checked)return fail('Bitte die Datenschutzerklärung bestätigen.');
    try{await withBusy(sb,()=>api('submit',{type,data:d,author:form.author.value.trim(),authorMail:form.authorMail.value.trim(),privacy:true,...captchaData(form)}));}
    catch(ex){if(ex.data?.newCaptcha)loadCaptcha(form);return fail(esc(ex.message));}
    const n=d;m.close();
    openModal(`<div style="text-align:center"><div style="font-size:3rem;color:var(--grass-d)"><i class="fa-solid fa-circle-check"></i></div><h2>Vielen Dank!</h2><p>„<b>${esc(n.name)}</b>“ wurde eingereicht und wird nach Prüfung veröffentlicht.</p></div>`);
  };
}

/* ================= Admin ================= */
let adminOK=false,adminTab='pending';
function updateBadge(){const n=['route','gasthaus','verleih'].reduce((s,t)=>s+coll(t).filter(x=>x.status==='pending').length,0);const b=$('#pendBadge');if(!b)return;b.textContent=n;b.classList.toggle('hidden',!n);}
function renderAdmin(){
  const host=$('#adminHost');
  if(!adminOK){
    host.innerHTML=`<div class="card login"><div class="lock"><i class="fa-solid fa-lock"></i></div><h2>Adminbereich</h2><p class="muted">Bitte mit dem Admin-Passwort anmelden.</p>
      <form id="loginF"><input type="password" id="pw" placeholder="Passwort" autocomplete="current-password"><div class="err hidden" id="pwErr">Falsches Passwort.</div>
      <button class="btn lg" style="width:100%;margin-top:12px"><i class="fa-solid fa-right-to-bracket"></i> Anmelden</button></form>
      </div>`;
    $('#loginF').onsubmit=async e=>{e.preventDefault();const er=$('#pwErr');er.classList.add('hidden');
      try{await withBusy($('#loginF button'),()=>api('login',{password:$('#pw').value}));adminTab='pending';await reload();renderAdmin();}
      catch(ex){er.textContent=ex.message;er.classList.remove('hidden');}};
    return;
  }
  const cnt=t=>coll(t).length,pend=['route','gasthaus','verleih'].reduce((s,t)=>s+coll(t).filter(x=>x.status==='pending').length,0);
  const tabs=[['pending','Freigaben','fa-hourglass-half',pend],['routes','Strecken','fa-route'],['gasthaus','Gaststätten','fa-utensils'],['verleih','Bollerwagen','fa-trailer'],['csv','CSV-Import','fa-file-csv'],['mail','Postfach','fa-inbox',state.mails.length],['settings','Einstellungen','fa-gear']];
  host.innerHTML=`<div class="page-head"><div><h1><i class="fa-solid fa-user-shield"></i> Adminbereich</h1><p>Alle Einträge prüfen, freigeben, bearbeiten und per CSV importieren. Benachrichtigungen gehen an <b>${esc(ADMIN_MAIL)}</b>.</p></div>
    <button class="btn ghost" id="logout"><i class="fa-solid fa-right-from-bracket"></i> Abmelden</button></div>
    <div class="adm-stats">${[['fa-hourglass-half','#f59e0b',pend,'Ausstehend'],['fa-route','#1e88e5',cnt('route'),'Strecken'],['fa-utensils','#8d6e63',cnt('gasthaus'),'Gaststätten'],['fa-trailer','#f59e0b',cnt('verleih'),'Verleihe'],['fa-envelope','#1f7fb8',state.mails.length,'E-Mails']]
      .map(([i,c,b,s])=>`<div class="card stat" style="--c:${c}"><i class="fa-solid ${i}"></i><div><b>${b}</b><span>${s}</span></div></div>`).join('')}</div>
    <div class="tabs">${tabs.map(([k,l,i,n])=>`<button class="tab ${adminTab===k?'on':''}" data-t="${k}"><i class="fa-solid ${i}"></i>${l}${n?` <span class="badge" style="${k==='mail'?'background:var(--sky-d)':''}">${n}</span>`:''}</button>`).join('')}</div>
    <div id="admBody"></div>`;
  $('#logout').onclick=async()=>{try{await api('logout',{});}catch(e){}adminOK=false;await reload().catch(()=>{});renderAdmin();};
  $$('.tab',host).forEach(b=>b.onclick=()=>{adminTab=b.dataset.t;renderAdmin();});
  ({pending:admPending,routes:()=>admTable('route'),gasthaus:()=>admTable('gasthaus'),verleih:()=>admTable('verleih'),csv:admCSV,raffle:admRaffle,mail:admMail,settings:admSettings})[adminTab]($('#admBody'));
}
async function setStatus(type,id,s){const x=find(type,id);if(!x)return;
  try{await api('admin_status',{id,status:s});}catch(e){return toast(esc(e.message),'err');}
  await reload();toast(`${TYPES[type].label} „${esc(x.title||x.name)}“: ${STATUS[s][0]}`);renderAdmin();}
async function delItem(type,id){const x=find(type,id);if(!await confirmModal(`„<b>${esc(x.title||x.name)}</b>“ endgültig löschen?`,'Löschen'))return;
  try{await api('admin_delete',{id});}catch(e){return toast(esc(e.message),'err');}
  await reload();toast('Gelöscht');renderAdmin();}
function editItem(type,id){
  const x=find(type,id);
  if(type==='route'){const m=openModal('<h2><i class="fa-solid fa-pen" style="color:var(--sky-d)"></i> Strecke bearbeiten</h2><div id="admEdit"></div>',{wide:true});
    mountRouteForm($('#admEdit',m.el),{route:x,admin:true,onDone:()=>{m.close();renderAdmin();}});}
  else openEntityForm(type,x,true);
}
function viewItem(type,id){if(type==='route')openRouteDetail(id);else editItem(type,id);}
window.adm={setStatus,delItem,editItem,viewItem};
function actBtns(type,x){
  return `<div class="btnrow" style="flex-wrap:nowrap">
    <button class="btn ghost sm" title="Ansehen" data-adm="viewItem" data-type="${type}" data-id="${x.id}"><i class="fa-solid fa-eye"></i></button>
    <button class="btn sky sm" title="Bearbeiten" data-adm="editItem" data-type="${type}" data-id="${x.id}"><i class="fa-solid fa-pen"></i></button>
    ${x.status!=='approved'?`<button class="btn sm" title="Freigeben" data-adm="setStatus" data-type="${type}" data-id="${x.id}" data-s="approved"><i class="fa-solid fa-check"></i></button>`:''}
    ${x.status!=='rejected'?`<button class="btn amber sm" title="Ablehnen" data-adm="setStatus" data-type="${type}" data-id="${x.id}" data-s="rejected"><i class="fa-solid fa-ban"></i></button>`:''}
    <button class="btn danger sm" title="Löschen" data-adm="delItem" data-type="${type}" data-id="${x.id}"><i class="fa-solid fa-trash-can"></i></button></div>`;
}
function admPending(el){
  const items=['route','gasthaus','verleih'].flatMap(t=>coll(t).filter(x=>x.status==='pending').map(x=>({t,x}))).sort((a,b)=>b.x.created-a.x.created);
  el.innerHTML=`<div class="card"><h3><i class="fa-solid fa-hourglass-half" style="color:var(--amber)"></i> Warten auf Freigabe (${items.length})</h3>
    ${items.length?items.map(({t,x})=>`<div class="pend-item"><div class="ic" style="--c:${TYPES[t].color}"><i class="fa-solid ${TYPES[t].icon}"></i></div>
      <div><b style="font-family:'Baloo 2';font-size:1.1rem">${esc(x.title||x.name)}</b> <span class="muted">· ${TYPES[t].label}</span>${t==='route'?' '+catBadge(x.category):''}
        <div class="meta"><span><i class="fa-solid fa-location-dot"></i>${esc(x.plz)} ${esc(x.ort)}</span>${t==='route'?`<span><i class="fa-solid fa-ruler"></i>${kmLabel(x)}</span><span><i class="fa-solid fa-camera"></i>${x.photos?.length||0} Fotos</span>`:''}
        <span><i class="fa-solid fa-user"></i>${esc(x.author||'anonym')}</span><span><i class="fa-solid fa-clock"></i>${fmtDate(x.created)}</span></div></div>
      ${actBtns(t,x)}</div>`).join(''):'<div class="empty"><i class="fa-solid fa-mug-hot"></i>Alles erledigt – keine offenen Freigaben.</div>'}</div>`;
}
const admQ={route:'',gasthaus:'',verleih:''},admS={route:'all',gasthaus:'all',verleih:'all'};
function admTable(type){
  const el=$('#admBody');
  const rows=coll(type).filter(x=>(admS[type]==='all'||x.status===admS[type])&&(!admQ[type]||norm([x.title,x.name,x.ort,x.plz].join(' ')).includes(norm(admQ[type])))).sort((a,b)=>b.created-a.created);
  const head=type==='route'?['','Titel','Kategorie','PLZ / Ort','Länge','Bewertung','Status','Eingang','']:type==='gasthaus'?['Name','PLZ / Ort','Kohlfahrt','Preis','Status','Eingang','']:['Name','PLZ / Ort','Wagen','Preis/Tag','Ausstattung','Status',''];
  const row=x=>type==='route'?`<td>${x.photos?.[0]?`<img class="mini" src="${x.photos[0]}" alt="">`:''}</td><td><b>${esc(x.title)}</b>${x.roundtrip?' <i class="fa-solid fa-arrows-rotate muted" title="Rundtour"></i>':''}</td><td>${catBadge(x.category)}</td><td>${esc(x.plz)} ${esc(x.ort)}</td><td>${kmLabel(x)}</td><td>${starsHTML(avg(x.ratings),x.ratings?.length||0)}</td><td>${stBadge(x.status)}</td><td class="muted">${fmtDate(x.created)}</td>`
    :type==='gasthaus'?`<td><b>${esc(x.name)}</b></td><td>${esc(x.plz)} ${esc(x.ort)}</td><td>${x.kohlfahrt?'<i class="fa-solid fa-leaf" style="color:var(--grass-d)"></i> ja':'–'}</td><td>${x.kohlfahrt?fmtEur(x.preis):'–'}</td><td>${stBadge(x.status)}</td><td class="muted">${fmtDate(x.created)}</td>`
    :`<td><b>${esc(x.name)}</b></td><td>${esc(x.plz)} ${esc(x.ort)}</td><td>${esc(x.anzahl||'–')}</td><td>${fmtEur(x.preisTag)}</td><td><div class="ficons" style="margin:0">${featIcons(x.ausst,VA)}</div></td><td>${stBadge(x.status)}</td>`;
  el.innerHTML=`<div class="card"><div class="filters" style="margin-bottom:10px">
      <div class="search"><i class="fa-solid fa-magnifying-glass"></i><input type="search" id="admQ" placeholder="Suchen…" value="${esc(admQ[type])}"></div>
      <select id="admS"><option value="all">Alle Status</option>${Object.entries(STATUS).map(([k,[l]])=>`<option value="${k}" ${admS[type]===k?'selected':''}>${l}</option>`).join('')}</select>
      ${type!=='route'?`<button class="btn" id="admNew"><i class="fa-solid fa-plus"></i> Neu anlegen</button>`:`<a class="btn" href="#eintragen"><i class="fa-solid fa-plus"></i> Neue Strecke</a> <button class="btn sky" data-admtab="csv"><i class="fa-solid fa-file-csv"></i> CSV-Import</button>`}
    </div>
    <div class="tblwrap"><table class="tbl"><thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>
    ${rows.map(x=>`<tr>${row(x)}<td>${actBtns(type,x)}</td></tr>`).join('')||`<tr><td colspan="${head.length}" class="empty">Keine Einträge.</td></tr>`}</tbody></table></div></div>`;
  const qi=$('#admQ');qi.oninput=()=>{admQ[type]=qi.value;admTable(type);const n=$('#admQ');n.focus();n.setSelectionRange(n.value.length,n.value.length);};
  $('#admS').onchange=e=>{admS[type]=e.target.value;admTable(type);};
  const nb=$('#admNew');if(nb)nb.onclick=()=>{openEntityFormAdminNew(type);};
}
function openEntityFormAdminNew(type){openEntityForm(type,null,true);}
/* ---------- CSV ---------- */
const CSV_COLS=[
  ['titel','ja','Name der Strecke','Rund um den Deich'],
  ['kategorie','ja','bossel · kohlfahrt · beides','bossel'],
  ['plz','–','5-stellig; leer = automatisch aus Startpunkt','26434'],
  ['ort','–','leer = automatisch aus Startpunkt','Wangerland'],
  ['start_lat','*','Breitengrad, Dezimalgrad (Punkt oder Komma)','53.6385'],
  ['start_lng','*','Längengrad, Dezimalgrad','8.0225'],
  ['start_adresse','*','alternativ zu Koordinaten – wird geokodiert','Am Hafen 1, 26434 Hooksiel'],
  ['ziel_lat','–','leer bei Rundtour oder wenn nur der Startpunkt bekannt ist','53.6800'],
  ['ziel_lng','–','leer bei Rundtour','8.0450'],
  ['ziel_adresse','–','alternativ zu Ziel-Koordinaten',''],
  ['rundtour','–','ja / nein (Standard: nein)','nein'],
  ['wegpunkte','–','Zwischenpunkte „lat,lng“ mit | getrennt','53.6505,8.0335|53.6610,8.0400'],
  ['besonderheiten','–','Schlüssel mit | getrennt (siehe unten)','deich|teer|flach'],
  ['laenge_km','–','leer = wird berechnet','6,2'],
  ['beschreibung','–','Freitext',"Schöne Deichstrecke"],
];
const CSV_TEMPLATE='﻿'+CSV_COLS.map(c=>c[0]).join(';')+'\n'+
  'Deich-Tour Hooksiel;bossel;26434;Wangerland;53.6385;8.0225;;53.6800;8.0450;;nein;53.6505,8.0335|53.6610,8.0400;deich|teer|flach;;Schnurgerade am Deich\n'+
  'Kohlrunde Rastede;kohlfahrt;;;53.2450;8.1985;;;;;ja;53.2560,8.2110|53.2700,8.2400;feldweg|einkehr;;Gemütliche Runde\n'+
  'Stadtrunde Jever;beides;26441;Jever;;;Alter Markt, 26441 Jever;;;Schlosserplatz, 26441 Jever;nein;;teer|oepnv|einkehr;3,5;Mit Adresse statt Koordinaten\n';
function parseCSV(text){
  text=text.replace(/^﻿/,'');const first=text.split(/\r?\n/)[0]||'';
  const delim=[';',',','\t'].sort((a,b)=>first.split(b).length-first.split(a).length)[0];
  const rows=[];let row=[],f='',q=false;
  for(let i=0;i<text.length;i++){const c=text[i];
    if(q){if(c==='"'){if(text[i+1]==='"'){f+='"';i++;}else q=false;}else f+=c;}
    else if(c==='"')q=true;else if(c===delim){row.push(f);f='';}
    else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(f);rows.push(row);row=[];f='';}
    else f+=c;}
  if(f!==''||row.length){row.push(f);rows.push(row);}
  return {delim,rows:rows.filter(r=>r.some(v=>v.trim()!==''))};
}
const num=v=>{v=String(v||'').trim().replace(',','.');return v===''?null:(isNaN(+v)?NaN:+v);};
const CAT_ALIAS={bossel:'bossel','boßel':'bossel',bosselstrecke:'bossel','boßelstrecke':'bossel',kohlfahrt:'kohlfahrt',kohl:'kohlfahrt',kohlfahrten:'kohlfahrt',beides:'beides',beide:'beides','bossel & kohlfahrt':'beides','boßeln & kohlfahrt':'beides'};
function validateRow(o){
  const errs=[],warns=[];const r={title:(o.titel||'').trim(),description:(o.beschreibung||'').trim(),plz:(o.plz||'').trim(),ort:(o.ort||'').trim()};
  if(!r.title)errs.push('Titel fehlt');
  r.category=CAT_ALIAS[norm(o.kategorie)];if(!r.category)errs.push(`Kategorie „${o.kategorie||''}“ unbekannt`);
  const sl=num(o.start_lat),sg=num(o.start_lng);
  if(sl!=null&&sg!=null&&!isNaN(sl)&&!isNaN(sg)){if(sl<47||sl>56||sg<5||sg>16)warns.push('Startkoordinaten liegen außerhalb Deutschlands');r.start=[sl,sg];}
  else if((o.start_adresse||'').trim())r.startAddr=o.start_adresse.trim();else errs.push('Startpunkt fehlt (Koordinaten oder Adresse)');
  r.roundtrip=/^(ja|j|yes|y|1|x|true)$/i.test((o.rundtour||'').trim());
  const zl=num(o.ziel_lat),zg=num(o.ziel_lng);
  if(zl!=null&&zg!=null&&!isNaN(zl)&&!isNaN(zg))r.end=[zl,zg];else if((o.ziel_adresse||'').trim())r.endAddr=o.ziel_adresse.trim();
  r.via=[];(o.wegpunkte||'').split('|').map(s=>s.trim()).filter(Boolean).forEach(s=>{const [a,b]=s.split(/[,\s]+/).map(num);if(a&&b&&!isNaN(a)&&!isNaN(b))r.via.push([a,b]);else warns.push(`Wegpunkt „${s}“ ungültig`);});
  if(!r.roundtrip&&!r.end&&!r.endAddr&&!r.via.length)warns.push('Kein Ziel – wird als Startpunkt angelegt, Strecke später im Admin einzeichnen');
  if(r.roundtrip&&!r.via.length&&!r.end&&!r.endAddr)warns.push('Rundtour ohne Wegpunkte');
  r.features=[];(o.besonderheiten||'').split(/[|,]/).map(s=>norm(s)).filter(Boolean).forEach(s=>{const f=FEATURES.find(x=>x.k===s||norm(x.l)===s);if(f)r.features.push(f.k);else warns.push(`Besonderheit „${s}“ unbekannt`);});
  const lk=num(o.laenge_km);if(lk!=null&&!isNaN(lk))r.lengthKm=lk;
  if(r.plz&&!/^\d{5}$/.test(r.plz))warns.push('PLZ ungültig – wird automatisch ermittelt'),r.plz='';
  return{r,errs,warns};
}
let csvParsed=null;
function admCSV(el){
  el.innerHTML=`<div class="card">
    <h3><i class="fa-solid fa-file-csv" style="color:var(--grass-d)"></i> Viele Strecken auf einmal importieren</h3>
    <p class="muted" style="margin-top:0">CSV-Datei mit Semikolon (<code>;</code>) als Trenner, UTF-8, erste Zeile = Spaltennamen. Excel: „Speichern unter → CSV UTF-8 (Trennzeichen-getrennt)“.</p>
    <div class="btnrow"><button class="btn sky" id="csvTpl"><i class="fa-solid fa-download"></i> Vorlage herunterladen</button><button class="btn ghost" id="csvCopy"><i class="fa-solid fa-copy"></i> Vorlage kopieren</button></div>
    <details class="more" style="margin-top:14px" open><summary><i class="fa-solid fa-table-columns"></i> Feldbeschreibung</summary>
      <div class="tblwrap" style="margin-top:8px"><table class="tbl spec"><thead><tr><th>Spalte</th><th>Pflicht</th><th>Beschreibung</th><th>Beispiel</th></tr></thead><tbody>
      ${CSV_COLS.map(c=>`<tr><td>${c[0]}</td><td>${c[1]==='ja'?'<b style="color:var(--red)">ja</b>':c[1]==='*'?'<b style="color:var(--amber)">*</b>':'–'}</td><td>${esc(c[2])}</td><td class="muted">${esc(c[3])}</td></tr>`).join('')}
      </tbody></table></div>
      <p style="font-size:.88rem"><b style="color:var(--amber)">*</b> Startpunkt: entweder <code>start_lat</code> + <code>start_lng</code> <i>oder</i> <code>start_adresse</code>.</p>
      <p style="font-size:.88rem"><b>Schlüssel für Besonderheiten:</b> ${FEATURES.map(f=>`<span class="ftag" style="margin:2px;font-size:.78rem"><i class="fa-solid ${f.i}"></i><code>${f.k}</code></span>`).join('')}</p>
    </details>
    <hr style="border:0;border-top:1.5px solid var(--line);margin:18px 0">
    <div class="row3" style="grid-template-columns:1fr 1fr;align-items:end">
      <div><label class="fl"><i class="fa-solid fa-upload"></i> CSV-Datei wählen</label><input type="file" id="csvFile" accept=".csv,text/csv,text/plain"></div>
      <div><label class="fl"><i class="fa-solid fa-flag"></i> Status nach Import</label><select id="csvStatus"><option value="approved">direkt freigeben</option><option value="pending">als „ausstehend“ markieren</option></select></div>
    </div>
    <label class="fl"><i class="fa-solid fa-paste"></i> … oder CSV-Inhalt einfügen</label>
    <textarea id="csvText" style="min-height:120px;font-family:ui-monospace,monospace;font-size:.85rem" placeholder="titel;kategorie;plz;ort;start_lat;start_lng;…"></textarea>
    <label class="check"><input type="checkbox" id="csvRoute" checked> <span><i class="fa-solid fa-route"></i> Strecken automatisch entlang der Wege berechnen (dauert etwas länger)</span></label>
    <div class="btnrow" style="margin-top:12px"><button class="btn sky" id="csvCheck"><i class="fa-solid fa-magnifying-glass"></i> Prüfen</button><button class="btn" id="csvGo" disabled><i class="fa-solid fa-file-import"></i> Importieren</button></div>
    <div id="csvOut" style="margin-top:14px"></div>
  </div>`;
  $('#csvTpl').onclick=()=>download('bosselstrecken-vorlage.csv',CSV_TEMPLATE,'text/csv;charset=utf-8');
  $('#csvCopy').onclick=async()=>{try{await navigator.clipboard.writeText(CSV_TEMPLATE.replace('﻿',''));toast('Vorlage kopiert');}catch(e){$('#csvText').value=CSV_TEMPLATE.replace('﻿','');toast('Vorlage ins Textfeld eingefügt','warn');}};
  $('#csvFile').onchange=e=>{const f=e.target.files[0];if(!f)return;const fr=new FileReader();fr.onload=()=>{$('#csvText').value=fr.result;$('#csvCheck').click();};fr.readAsText(f,'utf-8');};
  $('#csvCheck').onclick=()=>{
    const {rows,delim}=parseCSV($('#csvText').value);const out=$('#csvOut');
    if(rows.length<2){out.innerHTML='<div class="err">Keine Datenzeilen gefunden.</div>';$('#csvGo').disabled=true;return;}
    const head=rows[0].map(h=>norm(h).replace(/\s+/g,'_'));
    const missing=['titel','kategorie'].filter(h=>!head.includes(h));
    if(missing.length){out.innerHTML=`<div class="err">Pflichtspalten fehlen: ${missing.join(', ')}</div>`;$('#csvGo').disabled=true;return;}
    csvParsed=rows.slice(1).map(cells=>{const o={};head.forEach((h,i)=>o[h]=cells[i]??'');return validateRow(o);});
    const ok=csvParsed.filter(x=>!x.errs.length).length;
    out.innerHTML=`<div class="demo-note" style="background:#eef8ff;border-color:#9fd3f0;color:var(--sky-dd)"><i class="fa-solid fa-circle-info"></i><span>Trennzeichen erkannt: <code>${delim==='\t'?'Tab':delim}</code> · ${csvParsed.length} Zeilen · <b style="color:var(--grass-d)">${ok} gültig</b> · <b style="color:var(--red)">${csvParsed.length-ok} fehlerhaft</b></span></div>
      <div class="tblwrap" style="margin-top:10px"><table class="tbl csvprev"><thead><tr><th>#</th><th></th><th>Titel</th><th>Kategorie</th><th>Start</th><th>Rundtour</th><th>Besonderheiten</th><th>Hinweise</th></tr></thead><tbody>
      ${csvParsed.map((x,i)=>`<tr><td>${i+2}</td><td class="${x.errs.length?'bad':x.warns.length?'warn':'ok'}"><i class="fa-solid ${x.errs.length?'fa-circle-xmark':x.warns.length?'fa-triangle-exclamation':'fa-circle-check'}"></i></td>
        <td><b>${esc(x.r.title)}</b></td><td>${x.r.category?catBadge(x.r.category):'–'}</td><td class="muted">${x.r.start?x.r.start.join(', '):esc(x.r.startAddr||'–')}</td><td>${x.r.roundtrip?'ja':'nein'}</td>
        <td><div class="ficons" style="margin:0">${featIcons(x.r.features)}</div></td><td class="${x.errs.length?'bad':'warn'}" style="font-size:.85rem">${[...x.errs,...x.warns].map(esc).join('<br>')}</td></tr>`).join('')}
      </tbody></table></div><div class="progress hidden" id="csvProg"><div></div></div><div id="csvProgTxt" class="muted" style="font-weight:700;margin-top:6px"></div>`;
    const go=$('#csvGo');go.disabled=!ok;go.innerHTML=`<i class="fa-solid fa-file-import"></i> ${ok} Strecke${ok===1?'':'n'} importieren`;
  };
  $('#csvGo').onclick=async()=>{
    const list=(csvParsed||[]).filter(x=>!x.errs.length);if(!list.length)return;
    const go=$('#csvGo');go.disabled=true;$('#csvCheck').disabled=true;
    const prog=$('#csvProg');prog.classList.remove('hidden');const bar=$('div',prog),txt=$('#csvProgTxt');
    const status=$('#csvStatus').value,doRoute=$('#csvRoute').checked;let done=0,fails=[];
    for(const {r} of list){
      txt.textContent=`Importiere „${r.title}“ (${done+1}/${list.length})…`;
      try{
        let start=r.start||(r.startAddr&&await geocode(r.startAddr));if(!start)throw new Error('Startadresse nicht gefunden');
        let end=r.end||(r.endAddr&&await geocode(r.endAddr))||null;if(r.endAddr&&!end)throw new Error('Zieladresse nicht gefunden');
        const points=[start,...r.via];if(end&&!(r.roundtrip&&dist(end,start)<0.05))points.push(end);if(points.length<2)points.push(start.slice());
        const coords=r.roundtrip?[...points,points[0]]:points;
        let geometry=coords,km=lineKm(coords);
        if(doRoute&&coords.length>=2){const rr=await routeVia(coords);geometry=rr.geometry;km=rr.km;}
        if(!r.plz||!r.ort){const g=await reverseGeo(start[0],start[1]);if(g){r.plz=r.plz||g.plz;r.ort=r.ort||g.ort;}}
        await api('admin_import',{status,items:[{title:r.title,category:r.category,plz:r.plz||'',ort:r.ort||'',description:r.description,features:r.features,
          points,roundtrip:r.roundtrip,geometry,lengthKm:+(r.lengthKm??km).toFixed(2)}]});
      }catch(e){fails.push(`${r.title}: ${e.message}`);}
      done++;bar.style.width=(done/list.length*100)+'%';
    }
    await reload();txt.innerHTML=`<span style="color:var(--grass-d)"><i class="fa-solid fa-circle-check"></i> ${done-fails.length} Strecken importiert.</span>${fails.length?`<br><span style="color:var(--red)">${fails.map(esc).join('<br>')}</span>`:''}`;
    toast(`${done-fails.length} Strecken importiert`);$('#csvCheck').disabled=false;csvParsed=null;
  };
}
function admMail(el){
  el.innerHTML=`<div class="card"><h3><i class="fa-solid fa-inbox" style="color:var(--sky-d)"></i> Versendete Benachrichtigungen an ${esc(ADMIN_MAIL)}</h3>
    <div class="btnrow" style="margin-bottom:12px"><button class="btn sky sm" id="testMail"><i class="fa-solid fa-paper-plane"></i> Testmail senden</button>
      <span class="muted" style="font-size:.85rem">Prüft, ob der Mailversand aus config.php funktioniert.</span></div>
    ${state.mails.map(m=>`<div class="mail"><div class="hd"><span><i class="fa-solid fa-envelope"></i> an ${esc(m.to)} · ${m.sent?'<span style="color:var(--grass-d)"><i class="fa-solid fa-circle-check"></i> versendet</span>':`<span style="color:var(--red)" title="${esc(m.error||'')}"><i class="fa-solid fa-circle-xmark"></i> nicht versendet: ${esc(m.error||'unbekannt')}</span>`}</span><span>${fmtDate(m.date)}</span></div>
      <b>${esc(m.subject)}</b><pre>${esc(m.body)}</pre>${m.ref&&find(m.ref.type,m.ref.id)?`<div class="btnrow" style="margin-top:8px">${actBtns(m.ref.type,find(m.ref.type,m.ref.id))}</div>`:''}</div>`).join('')||'<div class="empty"><i class="fa-solid fa-inbox"></i>Noch keine E-Mails.</div>'}</div>`;
  $('#testMail').onclick=async e=>{try{const j=await withBusy(e.currentTarget,()=>api('admin_testmail',{}));
    toast(j.sent?`Testmail an ${esc(ADMIN_MAIL)} versendet – bitte Postfach prüfen.`:'Versand fehlgeschlagen: '+esc(j.error),j.sent?'mail':'err',8000);}catch(ex){toast(esc(ex.message),'err');}
    await reload();admMail(el);};
}
function admSettings(el){
  const empty=!state.routes.length&&!state.gasthaeuser.length&&!state.verleih.length;
  el.innerHTML=`<div class="card"><h3><i class="fa-solid fa-server" style="color:var(--sky-d)"></i> System</h3>
      <div class="flist" id="sysInfo"><span class="ftag sky"><i class="fa-solid fa-spinner fa-spin"></i> wird geladen…</span></div></div>
    <div class="card" style="margin-top:14px"><h3><i class="fa-solid fa-key" style="color:var(--sky-d)"></i> Admin-Passwort sicher speichern</h3>
      <p class="muted" style="margin-top:0">Neues Passwort eingeben, Hash erzeugen und in <code>config.php</code> bei <code>'admin_password'</code> einfügen. So steht das Passwort nirgends im Klartext.</p>
      <div class="btnrow"><input type="password" id="newPw" placeholder="Neues Passwort (mind. 10 Zeichen)" style="max-width:320px" autocomplete="new-password"><button class="btn sky" id="mkHash"><i class="fa-solid fa-lock"></i> Hash erzeugen</button></div>
      <div id="hashOut" style="margin-top:10px"></div></div>
    <div class="card" style="margin-top:14px"><h3><i class="fa-solid fa-database" style="color:var(--sky-d)"></i> Daten</h3>
      <div class="btnrow"><button class="btn sky" id="expJson"><i class="fa-solid fa-download"></i> Alle Daten als JSON exportieren</button>
        <button class="btn ghost" id="expCsv"><i class="fa-solid fa-file-csv"></i> Strecken als CSV exportieren</button>
        ${empty?'<button class="btn amber" id="seedBtn"><i class="fa-solid fa-wand-magic-sparkles"></i> Startdaten laden</button>':''}</div>
      ${empty?'<p class="muted" style="font-size:.88rem">Die Datenbank ist leer. Mit „Startdaten laden“ werden die recherchierten Gaststätten, Bollerwagenverleihe und Kohlfahrt-Strecken angelegt (später einzeln bearbeit- und löschbar).</p>':''}</div>`;
  api('admin_status_info').then(i=>{$('#sysInfo').innerHTML=[
      ['fa-code-branch','Version '+i.version+' · DB-Schema '+i.schema],['fa-brands fa-php fa-code','PHP '+i.php],['fa-database','MySQL '+i.mysql],
      ['fa-envelope','Mail: '+i.mailMode+' → '+i.mailTo],[i.uploadsWritable?'fa-circle-check':'fa-triangle-exclamation',i.uploadsWritable?'Foto-Upload: OK':'Upload-Ordner nicht beschreibbar!'],
      [i.passwordHashed?'fa-lock':'fa-lock-open',i.passwordHashed?'Admin-Passwort: als Hash gespeichert':'Admin-Passwort: Klartext – Hash empfohlen']]
      .map(([ic,t])=>`<span class="ftag sky"><i class="fa-solid ${ic.split(' ').pop()}"></i>${esc(t)}</span>`).join('');}).catch(e=>{$('#sysInfo').innerHTML=`<span class="err">${esc(e.message)}</span>`;});
  $('#mkHash').onclick=async e=>{try{const j=await withBusy(e.currentTarget,()=>api('admin_hash',{password:$('#newPw').value}));
      $('#hashOut').innerHTML=`<div class="demo-note" style="display:block;background:#eef8ff;border-color:#9fd3f0;color:var(--sky-dd)">In config.php eintragen:<br><code style="user-select:all;word-break:break-all">'admin_password' => '${esc(j.hash)}',</code><br><button class="btn sm sky" id="cpHash" style="margin-top:8px"><i class="fa-solid fa-copy"></i> Kopieren</button></div>`;
      $('#cpHash').onclick=async()=>{try{await navigator.clipboard.writeText(`'admin_password' => '${j.hash}',`);toast('Kopiert');}catch(x){toast('Bitte Text markieren und kopieren','warn');}};}
    catch(ex){toast(esc(ex.message),'err');}};
  $('#expJson').onclick=()=>download('bossel-daten.json',JSON.stringify({routes:state.routes,gasthaeuser:state.gasthaeuser,verleih:state.verleih},null,1),'application/json');
  $('#expCsv').onclick=()=>{const q=v=>{v=String(v??'');return /[;"\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
    const lines=state.routes.map(r=>{const end=r.roundtrip?null:r.points[r.points.length-1];const via=r.points.slice(1,r.roundtrip?undefined:-1);
      return [r.title,r.category,r.plz,r.ort,r.points[0][0],r.points[0][1],'',end?end[0]:'',end?end[1]:'','',r.roundtrip?'ja':'nein',via.map(p=>p.join(',')).join('|'),(r.features||[]).join('|'),String(r.lengthKm).replace('.',','),r.description].map(q).join(';');});
    download('bosselstrecken-export.csv','﻿'+CSV_COLS.map(c=>c[0]).join(';')+'\n'+lines.join('\n'),'text/csv;charset=utf-8');};
  const sb=$('#seedBtn');if(sb)sb.onclick=async e=>{if(!await confirmModal('Beispieldaten in die leere Datenbank laden?','Laden',false))return;
    const d=seed();try{const parts=[{verleih:d.verleih},...Array.from({length:Math.ceil(d.gasthaeuser.length/6)},(_,i)=>({gasthaeuser:d.gasthaeuser.slice(i*6,i*6+6)})),...d.routes.map(r=>({routes:[r]}))];let n=0;
      await withBusy(sb,async()=>{for(let i=0;i<parts.length;i++){const j=await api('admin_seed',{data:parts[i],append:i>0});n+=j.count;}});toast(n+' Einträge angelegt');}
    catch(ex){return toast(esc(ex.message),'err');}await reload();renderAdmin();};
}

/* ================= Gewinnspiel ================= */
function applyRaffleVisibility(){
  const open=raffleOpen();
  $$('.raffle-only').forEach(el=>el.classList.toggle('hidden',!open));
  $$('.raffle-ended').forEach(el=>el.classList.toggle('hidden',open));
  $$('.raffle-link').forEach(el=>el.classList.toggle('hidden',!open));
}
const monthName=m=>{const [y,mo]=m.split('-');return new Date(+y,+mo-1,1).toLocaleDateString('de-DE',{month:'long',year:'numeric'});};
const curMonth=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');};
let raffleMonth='';
async function admRaffle(el){
  el.innerHTML='<div class="card"><i class="fa-solid fa-spinner fa-spin"></i> Lade Gewinnspiel-Daten…</div>';
  let d;try{d=await api('admin_raffle',undefined,{query:raffleMonth?'month='+raffleMonth:''});}catch(e){el.innerHTML=`<div class="card err">${esc(e.message)}</div>`;return;}
  const months=[...new Set([curMonth(),...d.months.map(m=>m.month)])].sort().reverse();
  const cnt=Object.fromEntries(d.months.map(m=>[m.month,m.count]));
  const prevMonth=(()=>{const t=new Date();t.setDate(1);t.setMonth(t.getMonth()-1);return t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0');})();
  const drawDefault=months.includes(prevMonth)?prevMonth:months[0];
  el.innerHTML=`
  <div class="card">
    <div class="btnrow" style="justify-content:space-between">
      <h3 style="margin:0"><i class="fa-solid fa-gift" style="color:#c62828"></i> Gewinnspiel: jeden Monat 50 € Gutschein</h3>
      ${d.open?'<span class="st approved"><i class="fa-solid fa-circle-play"></i> läuft bis 31.03.2027</span>':'<span class="st rejected"><i class="fa-solid fa-flag-checkered"></i> beendet</span>'}
    </div>
    <div class="chips" style="margin-top:12px">${d.months.length?d.months.map(m=>`<span class="ftag sky"><i class="fa-solid fa-calendar"></i>${esc(monthName(m.month))}: <b>${m.count}</b></span>`).join(''):'<span class="muted">Noch keine Teilnahmen.</span>'}</div>
  </div>
  <div class="card" style="margin-top:14px">
    <h3><i class="fa-solid fa-dice" style="color:var(--sky-d)"></i> Monatliche Auslosung</h3>
    <p class="muted" style="margin-top:0">Zieht zufällig einen Gewinner aus den Teilnahmen des gewählten Monats. Jede Person (gleiche E-Mail bzw. Handynummer) ist nur einmal im Lostopf. Bereits gezogene Gewinner des Monats werden bei einer Neuauslosung ausgeschlossen.</p>
    <div class="row3" style="align-items:end">
      <div><label class="fl"><i class="fa-solid fa-calendar"></i> Monat</label><select id="drawMonth">${months.map(m=>`<option value="${m}" ${m===drawDefault?'selected':''}>${esc(monthName(m))} (${cnt[m]||0})</option>`).join('')}</select></div>
      <div><label class="fl"><i class="fa-solid fa-note-sticky"></i> Notiz (optional)</label><input type="text" id="drawNote" placeholder="z. B. Neuauslosung, nicht erreichbar"></div>
      <div><label class="check" style="margin:0 0 10px"><input type="checkbox" id="drawApproved" checked> <span>nur freigegebene Strecken</span></label></div>
    </div>
    <div class="btnrow" style="margin-top:12px"><button class="btn lg" id="drawBtn"><i class="fa-solid fa-shuffle"></i> Gewinner auslosen</button></div>
    <div id="drawResult" style="margin-top:12px"></div>
    <h4 style="margin-top:18px"><i class="fa-solid fa-trophy" style="color:#f5b301"></i> Bisherige Gewinner</h4>
    <div class="tblwrap"><table class="tbl"><thead><tr><th>Monat</th><th>Name</th><th>E-Mail</th><th>Handy</th><th>Strecke</th><th>Lose</th><th>Gezogen am</th><th>Notiz</th></tr></thead><tbody>
    ${d.draws.map(w=>`<tr><td><b>${esc(monthName(w.month))}</b></td><td>${esc(w.name||'–')}</td><td>${w.email?`<a href="mailto:${esc(w.email)}">${esc(w.email)}</a>`:'–'}</td><td>${w.phone?`<a href="tel:${esc(w.phone)}">${esc(w.phone)}</a>`:'–'}</td><td>${esc(w.title||'–')}</td><td>${w.pool}</td><td class="muted">${fmtDate(w.date)}</td><td class="muted">${esc(w.note)}</td></tr>`).join('')||'<tr><td colspan="8" class="empty">Noch keine Auslosung.</td></tr>'}
    </tbody></table></div>
  </div>
  <div class="card" style="margin-top:14px">
    <div class="filters" style="margin-bottom:10px">
      <h3 style="margin:0;flex:1"><i class="fa-solid fa-users" style="color:var(--sky-d)"></i> Teilnehmerliste</h3>
      <select id="listMonth"><option value="">Alle Monate</option>${months.map(m=>`<option value="${m}" ${m===raffleMonth?'selected':''}>${esc(monthName(m))}</option>`).join('')}</select>
      <button class="btn ghost" id="raffleCsv"><i class="fa-solid fa-file-csv"></i> CSV-Export</button>
    </div>
    <div class="tblwrap"><table class="tbl"><thead><tr><th>Datum</th><th>Monat</th><th>Name</th><th>E-Mail</th><th>Handy</th><th>Strecke</th><th>Status</th><th></th></tr></thead><tbody>
    ${d.entries.map(r=>`<tr><td class="muted">${fmtDate(r.date)}</td><td>${esc(monthName(r.month))}</td><td><b>${esc(r.name||'–')}</b></td><td>${esc(r.email||'–')}</td><td>${esc(r.phone||'–')}</td><td>${esc(r.title)}</td><td>${r.status==='deleted'?'<span class="st rejected">gelöscht</span>':stBadge(r.status)}</td>
      <td><div class="btnrow" style="flex-wrap:nowrap">${r.status!=='deleted'?`<button class="btn ghost sm" title="Strecke ansehen" data-adm="editItem" data-type="route" data-id="${esc(r.entryId)}"><i class="fa-solid fa-eye"></i></button>`:''}<button class="btn danger sm" title="Teilnahme löschen" data-rdel="${r.id}"><i class="fa-solid fa-trash-can"></i></button></div></td></tr>`).join('')||'<tr><td colspan="8" class="empty">Keine Teilnahmen.</td></tr>'}
    </tbody></table></div>
  </div>
  <div class="card" style="margin-top:14px">
    <h3><i class="fa-solid fa-user-lock" style="color:var(--red)"></i> Datenschutz</h3>
    <p class="muted" style="margin-top:0">Gespeichert werden nur Name, E-Mail und Handynummer. Nach Ende des Gewinnspiels und Ausgabe aller Gutscheine bitte alle Teilnahmedaten löschen.</p>
    <button class="btn danger" id="raffleWipe"><i class="fa-solid fa-trash-can"></i> Alle Teilnahmedaten löschen</button>
  </div>`;
  $('#listMonth').onchange=e=>{raffleMonth=e.target.value;admRaffle(el);};
  $('#drawBtn').onclick=async e=>{
    const month=$('#drawMonth').value;
    if(!await confirmModal(`Jetzt einen Gewinner für <b>${esc(monthName(month))}</b> auslosen?`,'Auslosen',false))return;
    try{const r=await withBusy($('#drawBtn'),()=>api('admin_raffle_draw',{month,note:$('#drawNote').value,onlyApproved:$('#drawApproved').checked}));
      const t=find('route',r.winner.entryId);
      openModal(`<div style="text-align:center"><div style="font-size:3rem;color:#f5b301"><i class="fa-solid fa-trophy"></i></div><h2>Gewinner ${esc(monthName(month))}</h2>
        <p style="font-size:1.15rem">${r.winner.name?`<i class="fa-solid fa-user"></i> <b>${esc(r.winner.name)}</b><br>`:''}${r.winner.email?`<i class="fa-solid fa-envelope"></i> <b>${esc(r.winner.email)}</b><br>`:''}${r.winner.phone?`<i class="fa-solid fa-mobile-screen"></i> <b>${esc(r.winner.phone)}</b>`:''}</p>
        <p class="muted">Strecke: ${esc(t?t.title:'–')} · gezogen aus ${r.pool} Teilnahme${r.pool===1?'':'n'}</p>
        <p class="muted" style="font-size:.88rem">Bitte innerhalb von 14 Tagen benachrichtigen. Meldet sich niemand, einfach erneut auslosen.</p></div>`);
      admRaffle(el);}
    catch(ex){toast(esc(ex.message),'err');}};
  $$('[data-rdel]',el).forEach(b=>b.onclick=async()=>{if(!await confirmModal('Diese Teilnahme löschen?','Löschen'))return;
    try{await api('admin_raffle_delete',{id:+b.dataset.rdel,confirm:'LÖSCHEN'});toast('Teilnahme gelöscht');admRaffle(el);}catch(ex){toast(esc(ex.message),'err');}});
  $('#raffleWipe').onclick=()=>{const m=openModal(`<h3><i class="fa-solid fa-triangle-exclamation" style="color:var(--red)"></i> Alle Teilnahmedaten löschen</h3>
      <p>Löscht <b>alle</b> Teilnahmen und Auslosungen endgültig. Zur Bestätigung <b>LÖSCHEN</b> eingeben:</p><input type="text" id="wipeTxt" autocomplete="off">
      <div class="btnrow" style="justify-content:flex-end;margin-top:12px"><button class="btn ghost" id="wipeNo">Abbrechen</button><button class="btn danger" id="wipeYes">Endgültig löschen</button></div>`);
    $('#wipeNo',m.el).onclick=m.close;
    $('#wipeYes',m.el).onclick=async()=>{try{await api('admin_raffle_delete',{confirm:$('#wipeTxt',m.el).value.trim()});m.close();toast('Alle Teilnahmedaten gelöscht');admRaffle(el);}catch(ex){toast(esc(ex.message),'err');}};};
  $('#raffleCsv').onclick=()=>{const q=v=>{v=String(v??'');return /[;"\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
    download('gewinnspiel-teilnehmer'+(raffleMonth?'-'+raffleMonth:'')+'.csv','﻿'+['datum','monat','name','email','handy','strecke','status'].join(';')+'\n'+d.entries.map(r=>[fmtDate(r.date),r.month,r.name,r.email,r.phone,r.title,r.status].map(q).join(';')).join('\n'),'text/csv;charset=utf-8');};
}

/* ================= Router ================= */
const VIEWS={spiele:renderSpiele,infos:()=>{},shop:renderShop,banner:renderBanner,impressum:()=>{},datenschutz:()=>{},start:renderStart,strecken:()=>renderRouteList(true),eintragen:renderEintragen,gaststaetten:renderGast,bollerwagen:renderVerleih,admin:renderAdmin};
let current='start';
function route(v){
  if(typeof v!=='string'){try{v=(location.hash||'#start').slice(1);}catch(e){v='start';}}
  current=VIEWS[v]?v:'start';
  $$('.view').forEach(s=>s.classList.toggle('hidden',s.id!=='v-'+current));
  $$('#mainnav a').forEach(a=>a.classList.toggle('active',a.dataset.v===current));
  $('#mainnav').classList.remove('open');
  try{VIEWS[current]();renderAds();}catch(e){console.error(e);toast('Fehler beim Anzeigen: '+esc(e.message),'err');}
  window.scrollTo(0,0);
  setTimeout(()=>Object.values(maps).forEach(m=>m&&m.invalidateSize&&m.invalidateSize()),60);
}
function go(v){
  $$('.modal-bg').forEach(b=>b.remove());document.body.style.overflow='';
  route(v);
  try{if(location.hash!=='#'+v)history.replaceState(null,'','#'+v);}catch(e){}
}
// Alle Klicks zentral behandeln (funktioniert auch in Vorschau-Fenstern ohne Hash-Navigation)
// Formulare ohne echtes Absenden (Vorschau-Fenster blockieren Form-Submits)
const fakeSubmit=f=>f.dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}));
document.addEventListener('keydown',e=>{
  if(e.key!=='Enter'||e.defaultPrevented)return;const t=e.target;
  if(t.tagName==='INPUT'&&t.form&&!['checkbox','radio','file','button','submit'].includes(t.type)){e.preventDefault();fakeSubmit(t.form);}
});
document.addEventListener('click',e=>{
  const sb=e.target.closest('button[type=submit],button:not([type])');
  if(sb&&sb.form){e.preventDefault();fakeSubmit(sb.form);return;}
  const a=e.target.closest('a[href^="#"]');
  if(a&&a.target==='_blank')return;
  if(a){const v=a.getAttribute('href').slice(1);if(VIEWS[v]){e.preventDefault();go(v);}else if(v===''){e.preventDefault();}return;}
  const jmp=e.target.closest('[data-jump]');
  if(jmp){e.preventDefault();const t=document.getElementById(jmp.dataset.jump);if(t)window.scrollTo({top:t.getBoundingClientRect().top+window.scrollY-90,behavior:'smooth'});return;}
  const r=e.target.closest('[data-route]');
  if(r){e.preventDefault();e.stopPropagation();openRouteDetail(r.dataset.route);return;}
  const b=e.target.closest('[data-adm]');
  if(b){e.preventDefault();e.stopPropagation();const fn=window.adm[b.dataset.adm];if(b.dataset.adm==='setStatus')fn(b.dataset.type,b.dataset.id,b.dataset.s);else fn(b.dataset.type,b.dataset.id);return;}
  const t=e.target.closest('[data-admtab]');
  if(t){adminTab=t.dataset.admtab;renderAdmin();}
});
function refreshCurrent(){if(current==='strecken')renderRouteList(false);else if(current==='start')renderStart();else if(current==='gaststaetten')renderGast();else if(current==='bollerwagen')renderVerleih();else if(current==='admin')renderAdmin();updateBadge();}
$('#burger').onclick=()=>$('#mainnav').classList.toggle('open');
window.addEventListener('hashchange',()=>route());
route();load().then(()=>{updateBadge();refreshCurrent();});
