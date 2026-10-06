// Shared trip planner logic.
// Usage: call initTrip(TRIP, config) after the DOM is ready.
//
// config shape:
//   brand        {string}   topbar label, e.g. "🏔️ Banff & Beyond"
//   themeKey     {string}   localStorage key for dark/light preference
//   tripStart    {Date}     start of trip (for countdown)
//   tripEnd      {Date}     end of trip (for "happening now" check)
//   weatherTZ    {string}   IANA timezone for Open-Meteo, e.g. "America/Edmonton"
//   wxLabel      {string}   city name shown in banner weather chip
//   countdownMsg {fn(d)}    returns string for countdown message given days remaining
//   inTripMsg    {string}   shown while trip is happening
//   afterTripMsg {string}   shown after trip ends
//   icons        {object}   optional extra kind→emoji mappings merged with defaults

const DEFAULT_ICONS = {
  drive:"🚗", hike:"🥾", food:"🍽️", cafe:"☕", shop:"🛒", walk:"🚶",
  view:"🏔️", activity:"✨", tip:"💡", warning:"⚠️", decision:"🤔",
  gondola:"🚡", wake:"⏰", home:"🏠", plane:"✈️", stop:"⛽", lake:"🏞️",
  beer:"🍺", ferry:"⛴️", sauna:"🧖", night:"🌙", bike:"🚲",
  hotel:"🏨", border:"🛂", sight:"🏛️",
};

function wmo(code){
  const m={0:["☀️","Clear"],1:["🌤️","Mostly clear"],2:["⛅","Partly cloudy"],3:["☁️","Overcast"],
    45:["🌫️","Fog"],48:["🌫️","Rime fog"],51:["🌦️","Light drizzle"],53:["🌦️","Drizzle"],55:["🌦️","Heavy drizzle"],
    56:["🌧️","Freezing drizzle"],57:["🌧️","Freezing drizzle"],61:["🌧️","Light rain"],63:["🌧️","Rain"],65:["🌧️","Heavy rain"],
    66:["🌧️","Freezing rain"],67:["🌧️","Freezing rain"],71:["🌨️","Light snow"],73:["🌨️","Snow"],75:["❄️","Heavy snow"],
    77:["🌨️","Snow grains"],80:["🌦️","Showers"],81:["🌦️","Showers"],82:["⛈️","Heavy showers"],85:["🌨️","Snow showers"],
    86:["❄️","Snow showers"],95:["⛈️","Thunderstorm"],96:["⛈️","Storm + hail"],99:["⛈️","Storm + hail"]};
  return m[code]||["🌡️","—"];
}

function initTrip(TRIP, cfg){
  const ICONS = Object.assign({}, DEFAULT_ICONS, cfg.icons||{});
  const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const TRAIL_TARGET = isIOS ? "_self" : "_blank";
  let active = 0;

  // ---------- Weather ----------
  async function loadWeather(){
    const lats = TRIP.map(d=>d.loc.lat).join(",");
    const lons = TRIP.map(d=>d.loc.lon).join(",");
    const tz = encodeURIComponent(cfg.weatherTZ||"UTC");
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
      `&current=temperature_2m,weather_code&timezone=${tz}&forecast_days=16`;
    try{
      const res = await fetch(url); const data = await res.json();
      const arr = Array.isArray(data) ? data : [data];
      const now = arr[0]?.current;
      if(now){
        const [em,txt] = wmo(now.weather_code);
        const wxNow = document.getElementById("wxNow");
        if(wxNow) wxNow.innerHTML =
          `<span class="emoji">${em}</span><span>${cfg.wxLabel||""} now · <b>${Math.round(now.temperature_2m)}°C</b> · ${txt}</span>`;
      }
      TRIP.forEach((d,i)=>{
        const day = arr[i]?.daily; if(!day) return;
        const idx = day.time.indexOf(d.iso);
        d.wx = idx>=0 ? {
          code:day.weather_code[idx], hi:Math.round(day.temperature_2m_max[idx]),
          lo:Math.round(day.temperature_2m_min[idx]), pop:day.precipitation_probability_max[idx]
        } : null;
        d.wxLoaded = true;
      });
      const chip = document.querySelector("#dayView .wx-day");
      if(chip) chip.outerHTML = wxBox(TRIP[active]);
    }catch(e){
      const wxNow = document.getElementById("wxNow");
      if(wxNow) wxNow.innerHTML = `<span class="emoji">🌐</span><span>Weather unavailable offline</span>`;
    }
  }

  // ---------- Render ----------
  function wxBox(d){
    if(!d.wxLoaded) return `<div class="wx-day pending"><div class="em">⏳</div><div class="soon">loading…</div></div>`;
    if(!d.wx) return `<div class="wx-day pending"><div class="em">🔮</div><div class="soon">forecast unlocks ~16 days out</div></div>`;
    const [em] = wmo(d.wx.code);
    return `<div class="wx-day"><div class="em">${em}</div><div class="hi">${d.wx.hi}°</div>` +
      `<div class="lo">low ${d.wx.lo}°</div>` + (d.wx.pop!=null?`<div class="pop">💧${d.wx.pop}%</div>`:``)+`</div>`;
  }

  function renderTabs(){
    const t = document.getElementById("tabs");
    const todayIso = new Date().toISOString().slice(0,10);
    t.innerHTML = TRIP.map((d,i)=>
      `<button class="tab ${i===active?'active':''} ${d.iso===todayIso?'today':''}" data-i="${i}">
        <span class="dow">${d.dow}</span><span class="dt">${d.date}</span></button>`).join("");
    t.querySelectorAll(".tab").forEach(b=>b.onclick=()=>select(+b.dataset.i));
    const a = t.querySelector(".tab.active"); if(a) a.scrollIntoView({inline:"center",block:"nearest",behavior:"smooth"});
  }

  function renderDay(i){
    const d = TRIP[i];
    const items = d.items.map((it,n)=>{
      const stats = [it.dist&&`<span class="pill b">📏 ${it.dist}</span>`, it.dur&&`<span class="pill">⏱️ ${it.dur}</span>`].filter(Boolean).join("");
      const trail = it.trail ? `<a class="trail" href="${it.trail}" target="${TRAIL_TARGET}" rel="noopener">🥾 AllTrails ↗</a>` : "";
      const track = it.track ? `<a class="trail" href="${it.track}" target="_blank" rel="noopener">🛰️ Live status ↗</a>` : "";
      const link  = it.link  ? `<a class="trail" href="${it.link}"  target="_blank" rel="noopener">${it.linkLabel||"Open ↗"}</a>` : "";
      return `<div class="item ${it.kind}" style="animation-delay:${n*45}ms">
        <div class="ic">${ICONS[it.kind]||"✨"}</div>
        <div class="body">
          ${it.time ? `<div class="time">${it.time}</div>` : ""}
          <div class="ttl">${it.title}</div>
          ${it.desc ? `<div class="desc">${it.desc}</div>` : ""}
          ${stats ? `<div class="pills">${stats}</div>` : ""}
          ${trail}${track}${link}
        </div></div>`;
    }).join("");

    const flight = d.items.find(it=>it.kind==="plane"&&it.track);
    const isToday = d.iso===new Date().toISOString().slice(0,10);
    const flightAlert = (flight&&isToday) ?
      `<div class="flight-alert"><span class="fa-em">✈️</span>
         <span class="fa-txt">Flight day — safe travels!
           <span class="fa-sub">Tap for today's live departure/arrival status.</span></span>
         <a href="${flight.track}" target="_blank" rel="noopener">Live status ↗</a>
       </div>` : "";

    document.getElementById("dayView").innerHTML =
      `<div class="day" key="${i}">
        <div class="day-head">
          <div><div class="day-meta">DAY ${i+1} · ${d.dow} · ${d.date}</div>
            <h2>${d.emoji} ${d.title}</h2></div>
          ${wxBox(d)}
        </div>
        ${flightAlert}
        <div class="timeline">${items}</div>
      </div>`;

    const prev = TRIP[i-1], next = TRIP[i+1];
    const pb = document.getElementById("prevBtn"), nb = document.getElementById("nextBtn");
    pb.disabled = !prev; nb.disabled = !next;
    pb.querySelector(".pdow").textContent = prev?prev.dow:"Start";
    pb.querySelector(".pdate").textContent = prev?prev.date:"";
    nb.querySelector(".ndow").textContent = next?next.dow:"End";
    nb.querySelector(".ndate").textContent = next?next.date:"";
    document.getElementById("progress").textContent = `Day ${i+1} of ${TRIP.length}`;
  }

  function scrollToDay(){
    const view = document.getElementById("dayView");
    view.style.scrollMarginTop = document.getElementById("tabs").offsetHeight+"px";
    view.scrollIntoView({behavior:"smooth",block:"start"});
  }

  function updateURL(){
    try{ history.replaceState(null,"","?i="+active); }catch(e){}
  }

  function select(i){
    active = Math.max(0, Math.min(TRIP.length-1, i));
    renderTabs(); renderDay(active); scrollToDay(); updateURL();
  }

  // ---------- Countdown ----------
  function tick(){
    const now = new Date(), diff = cfg.tripStart - now;
    const cd = document.getElementById("countdown"), msg = document.getElementById("cdMsg");
    if(!cd||!msg) return;
    if(diff<=0){
      cd.style.display = "none";
      msg.textContent = now < cfg.tripEnd
        ? (cfg.inTripMsg  || "🎉 The adventure is happening RIGHT NOW!")
        : (cfg.afterTripMsg || "✈️ That was one for the books.");
      return;
    }
    const d=Math.floor(diff/864e5), h=Math.floor(diff/36e5)%24, m=Math.floor(diff/6e4)%60, s=Math.floor(diff/1e3)%60;
    const cell = (n,l) => `<div class="cd-cell"><div class="cd-num">${String(n).padStart(2,"0")}</div><div class="cd-lbl">${l}</div></div>`;
    cd.innerHTML = cell(d,"days")+cell(h,"hrs")+cell(m,"min")+cell(s,"sec");
    msg.textContent = cfg.countdownMsg ? cfg.countdownMsg(d) : `${d} sleep${d===1?"":"s"} to go!`;
  }

  // ---------- Theme ----------
  const tgl = document.getElementById("themeToggle");
  if(tgl){
    function setTheme(t){ document.documentElement.dataset.theme=t; tgl.textContent=t==="dark"?"🌙":"☀️"; localStorage.setItem(cfg.themeKey||"trip-theme",t); }
    tgl.onclick = () => setTheme(document.documentElement.dataset.theme==="dark"?"light":"dark");
    setTheme(localStorage.getItem(cfg.themeKey||"trip-theme")||"dark");
  }

  // ---------- Nav + swipe ----------
  document.getElementById("prevBtn").onclick = () => select(active-1);
  document.getElementById("nextBtn").onclick = () => select(active+1);
  document.addEventListener("keydown", e=>{if(e.key==="ArrowLeft")select(active-1); if(e.key==="ArrowRight")select(active+1);});
  let tx=0, ty=0;
  const mv = document.getElementById("dayView");
  mv.addEventListener("touchstart", e=>{tx=e.changedTouches[0].clientX; ty=e.changedTouches[0].clientY;}, {passive:true});
  mv.addEventListener("touchend", e=>{
    const dx=e.changedTouches[0].clientX-tx, dy=e.changedTouches[0].clientY-ty;
    if(Math.abs(dx)>90 && Math.abs(dx)>Math.abs(dy)*2) select(active+(dx<0?1:-1));
  }, {passive:true});

  // ---------- Boot ----------
  (function initDay(){
    const p = parseInt(new URLSearchParams(location.search).get("i"), 10);
    if(Number.isInteger(p) && p>=0 && p<TRIP.length){ active=p; return; }
    const todayIso = new Date().toISOString().slice(0,10);
    const idx = TRIP.findIndex(d=>d.iso===todayIso);
    active = idx>=0 ? idx : 0;
  })();

  renderTabs(); renderDay(active); updateURL(); tick(); setInterval(tick,1000); loadWeather();
}
