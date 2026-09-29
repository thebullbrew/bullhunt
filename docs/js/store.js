/* BullHunt shared state: GPS position + tiny pub/sub */
(function(){
"use strict";

const SCRANTON = { lat: 41.4090, lon: -75.6649 }; // fallback center

const state = {
  pos: null,          // {lat, lon, alt, acc, ts}
  listeners: {},
};

function on(evt, fn){
  (state.listeners[evt] = state.listeners[evt] || []).push(fn);
}
function emit(evt, data){
  (state.listeners[evt] || []).forEach(fn => { try{ fn(data); }catch(e){ console.warn(e); } });
}

function startGps(){
  if (!("geolocation" in navigator)) { emit("gps-error","unsupported"); return; }
  navigator.geolocation.watchPosition(
    p => {
      state.pos = {
        lat: p.coords.latitude, lon: p.coords.longitude,
        alt: p.coords.altitude, acc: p.coords.accuracy, ts: p.timestamp
      };
      emit("pos", state.pos);
    },
    err => emit("gps-error", err.code),
    { enableHighAccuracy:true, maximumAge:5000, timeout:20000 }
  );
}

function posOrFallback(){
  return state.pos || SCRANTON;
}

window.BH = window.BH || {};
Object.assign(window.BH, { state, on, emit, startGps, posOrFallback, SCRANTON });
})();
