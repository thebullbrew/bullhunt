/* BullHunt hunt tab: sunrise/sunset (NOAA), moon phase, legal hours, verdict */
(function(){
"use strict";
const { el, fmtTime, fmtDate, posOrFallback } = window.BH;

const RAD = Math.PI/180, DEG = 180/Math.PI;

// NOAA sunrise/sunset. returns {sunrise, sunset} as Dates (local) or nulls
function sunTimes(date, lat, lon){
  const N = Math.floor((date - new Date(date.getFullYear(),0,0)) / 864e5);
  const lngHour = lon/15;
  function calc(isRise){
    const t = N + ((isRise?6:18) - lngHour)/24;
    const M = (0.9856*t) - 3.289;
    let L = M + 1.916*Math.sin(M*RAD) + 0.020*Math.sin(2*M*RAD) + 282.634;
    L = ((L%360)+360)%360;
    let RA = Math.atan(0.91764*Math.tan(L*RAD))*DEG;
    RA = ((RA%360)+360)%360;
    RA += Math.floor(L/90)*90 - Math.floor(RA/90)*90;
    RA /= 15;
    const sinDec = 0.39782*Math.sin(L*RAD), cosDec = Math.cos(Math.asin(sinDec));
    const cosH = (Math.cos(90.833*RAD) - sinDec*Math.sin(lat*RAD)) / (cosDec*Math.cos(lat*RAD));
    if (cosH > 1 || cosH < -1) return null; // polar day/night
    let H = isRise ? 360 - Math.acos(cosH)*DEG : Math.acos(cosH)*DEG;
    H /= 15;
    const T = H + RA - 0.06571*t - 6.622;
    let UT = (T - lngHour)%24; if (UT<0) UT+=24;
    const d = new Date(date);
    // convert UTC hour to local: use timezone offset of the date
    const utcMs = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) + UT*3600e3;
    return new Date(utcMs);
  }
  return { sunrise: calc(true), sunset: calc(false) };
}

// Moon: phase 0..1 (0=new, 0.5=full), illumination 0..1
function moon(date){
  const synodic = 29.53058867;
  const ref = Date.UTC(2000,0,6,18,14)/864e5; // new moon Jan 6 2000
  const d = date.getTime()/864e5 - ref;
  const phase = ((d % synodic)+synodic)%synodic / synodic;
  const illum = (1 - Math.cos(2*Math.PI*phase))/2;
  return { phase, illum };
}
function moonName(phase){
  const names=["New Moon","Waxing Crescent","First Quarter","Waxing Gibbous",
               "Full Moon","Waning Gibbous","Last Quarter","Waning Crescent"];
  return names[Math.floor(((phase*8)+0.5))%8];
}

function render(){
  const p = posOrFallback();
  const now = new Date();
  el("hunt-date").textContent = fmtDate(now) + " · " + p.lat.toFixed(3) + ", " + p.lon.toFixed(3);
  const { sunrise, sunset } = sunTimes(now, p.lat, p.lon);
  const m = moon(now);

  if (sunrise && sunset){
    el("h-sunrise").textContent = fmtTime(sunrise);
    el("h-sunset").textContent = fmtTime(sunset);
    const open = new Date(sunrise.getTime() - 30*60e3);
    const close = new Date(sunset.getTime() + 30*60e3);
    el("h-legal").textContent = fmtTime(open) + " – " + fmtTime(close);
  } else {
    el("h-legal").textContent = "—";
  }
  el("h-moon").textContent = moonName(m.phase);
  el("h-illum").textContent = Math.round(m.illum*100) + "%";

  // verdict: combine light + moon
  let v = "";
  const inHours = sunrise && sunset &&
    now >= new Date(sunrise.getTime()-30*60e3) && now <= new Date(sunset.getTime()+30*60e3);
  if (inHours) v += "<b>You're in legal shooting light right now.</b> ";
  else if (sunrise && now < sunrise) v += "Still dark — first light in about " +
    Math.max(1,Math.round((sunrise-now)/60000)) + " min. ";
  else v += "Shooting light is over for today. ";

  if (m.illum > 0.75) v += "Bright moon ("+Math.round(m.illum*100)+"%) — deer often feed at night and move late in the morning; consider a mid-morning sit.";
  else if (m.illum < 0.25) v += "Dark moon — deer move more in daylight. Good day to be on stand early.";
  else v += "Moon at "+Math.round(m.illum*100)+"% — decent daylight movement expected.";
  v += " Check wind direction on the Weather tab and hunt with the wind in your face.";
  el("hunt-verdict").innerHTML = v;
}

document.addEventListener("DOMContentLoaded", () => {
  render();
  document.querySelector('[data-tab="tab-hunt"]').addEventListener("click", render);
  // re-render when GPS locks (uses real position for sun times)
  let done = false;
  window.BH.on("pos", () => { if (!done){ done=true; render(); } });
});
})();
