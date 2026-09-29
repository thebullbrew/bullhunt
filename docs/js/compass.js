/* BullHunt compass: device heading + GPS readout */
(function(){
"use strict";
const { el, on, compass16 } = window.BH;

let heading = null;

function applyHeading(){
  if (heading === null) return;
  el("dial-rose").style.transform = "rotate(" + (-heading) + "deg)";
  el("needle").style.transform = "rotate(" + heading + "deg)";
  el("heading").textContent = Math.round(heading) + "° " + compass16(heading);
}

function enable(){
  const DOE = window.DeviceOrientationEvent;
  const start = () => window.addEventListener("deviceorientation", onOrient, true);

  if (DOE && typeof DOE.requestPermission === "function") {
    // iOS 13+: must request
    DOE.requestPermission().then(s => {
      if (s === "granted") { start(); el("btn-compass-enable").style.display="none"; }
      else window.BH.showToast("Motion access denied");
    }).catch(()=> window.BH.showToast("Compass unavailable"));
  } else if ("ondeviceorientationabsolute" in window || "ondeviceorientation" in window) {
    start(); el("btn-compass-enable").style.display="none";
  } else {
    window.BH.showToast("No compass sensor on this device");
  }
}

function onOrient(e){
  if (e.webkitCompassHeading !== undefined && e.webkitCompassHeading !== null) {
    heading = e.webkitCompassHeading; // iOS, already true-north
  } else if (e.alpha !== null && e.alpha !== undefined) {
    heading = (360 - e.alpha) % 360;  // Android (magnetic-ish)
  }
  applyHeading();
}

function onPos(p){
  el("c-lat").textContent = p.lat.toFixed(5);
  el("c-lon").textContent = p.lon.toFixed(5);
  el("c-alt").textContent = p.alt != null ? Math.round(p.alt*3.28084)+" ft" : "—";
  el("c-acc").textContent = p.acc != null ? "±"+Math.round(p.acc*3.28084)+" ft" : "—";
}

document.addEventListener("DOMContentLoaded", () => {
  el("btn-compass-enable").onclick = enable;
  on("pos", onPos);
  on("gps-error", () => {
    el("c-lat").textContent = "GPS unavailable";
  });
});
})();
