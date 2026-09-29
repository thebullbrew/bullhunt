/* BullHunt weather: Open-Meteo, cached for offline */
(function(){
"use strict";
const { el, esc, posOrFallback, compass16 } = window.BH;

const CACHE_KEY = "bullhunt-wx";
const WMO = {0:"Clear",1:"Mostly clear",2:"Partly cloudy",3:"Overcast",45:"Fog",48:"Icing fog",
  51:"Light drizzle",53:"Drizzle",55:"Heavy drizzle",61:"Light rain",63:"Rain",65:"Heavy rain",
  71:"Light snow",73:"Snow",75:"Heavy snow",80:"Showers",81:"Showers",82:"Violent showers",
  95:"Thunderstorm",96:"Storm + hail",99:"Storm + hail"};

async function refresh(){
  const p = posOrFallback();
  const url = "https://api.open-meteo.com/v1/forecast?latitude="+p.lat.toFixed(4)+
    "&longitude="+p.lon.toFixed(4)+
    "&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation"+
    "&hourly=temperature_2m,precipitation_probability,weather_code"+
    "&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=2";
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error("wx "+r.status);
    const d = await r.json();
    d._ts = Date.now(); d._lat = p.lat; d._lon = p.lon;
    localStorage.setItem(CACHE_KEY, JSON.stringify(d));
    render(d, false);
  } catch(e) {
    const c = localStorage.getItem(CACHE_KEY);
    if (c) render(JSON.parse(c), true);
    else el("wx-now").innerHTML = "<div class='muted'>No weather data — connect once to load.</div>";
  }
}

function render(d, stale){
  const c = d.current;
  const when = new Date(d._ts);
  el("wx-updated").textContent = (stale ? "Offline — last update " : "Updated ") +
    when.toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});
  el("wx-now").innerHTML =
    "<div class='t'>"+Math.round(c.temperature_2m)+"°F</div>"+
    "<div class='d'>"+esc(WMO[c.weather_code]||"—")+" · Humidity "+c.relative_humidity_2m+"%"+
    (c.precipitation>0 ? " · Precip "+c.precipitation+" in" : "")+"</div>";
  const wd = c.wind_direction_10m;
  el("wx-wind").innerHTML =
    stat("Wind", Math.round(c.wind_speed_10m)+" mph "+compass16(wd)) +
    stat("Direction", Math.round(wd)+"°") +
    stat("Gusts", Math.round(c.wind_gusts_10m)+" mph") +
    stat("Wind from", windFromWord(wd));
  // hourly strip: next 24h
  const h = d.hourly, now = Date.now();
  let html = "";
  let count = 0;
  for (let i=0;i<h.time.length && count<24;i++){
    const t = new Date(h.time[i]).getTime();
    if (t < now - 3600e3) continue;
    const dt = new Date(h.time[i]);
    html += "<div class='hour'><div class='hh'>"+dt.getHours()+":00</div>"+
      "<div class='tt'>"+Math.round(h.temperature_2m[i])+"°</div>"+
      "<div>"+(h.precipitation_probability[i]||0)+"%</div></div>";
    count++;
  }
  el("wx-hourly").innerHTML = html || "<div class='muted'>—</div>";
}

function stat(k,v){ return "<div class='stat'><span class='k'>"+k+"</span><span class='v'>"+esc(v)+"</span></div>"; }
function windFromWord(deg){
  // where the wind is coming FROM — what matters for scent
  return compass16((deg+180)%360)+" (scent blows "+compass16(deg)+")";
}

document.addEventListener("DOMContentLoaded", () => {
  refresh();
  // refresh when tab opened and when position updates (throttled by visibility)
  document.querySelector('[data-tab="tab-weather"]').addEventListener("click", refresh);
});
window.BH = window.BH || {};
Object.assign(window.BH, { refreshWeather: refresh });
})();
