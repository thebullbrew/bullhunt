/* BullHunt waypoints: drop pins, list, navigate, GPX export */
(function(){
"use strict";
const { el, esc, dist, bearing, fmtDist, compass16, on, posOrFallback } = window.BH;

const KEY = "bullhunt-pins";
const COLORS = { stand:"#B49A5B", parking:"#5C2A2A", camera:"#7fb3d5", trail:"#c0392b", other:"#8a8474" };
const NAMES = { stand:"Tree stand", parking:"Parking", camera:"Trail camera", trail:"Blood trail", other:"Other" };

function getPins(){
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch(e){ return []; }
}
function savePins(p){ localStorage.setItem(KEY, JSON.stringify(p)); syncMap(); renderList(); }

function dropPinAt(lat, lon, name, type){
  const pins = getPins();
  pins.push({ id: Date.now(), lat:+lat.toFixed(6), lon:+lon.toFixed(6),
              name: (name||"").trim() || (NAMES[type]||"Pin"), type, ts: Date.now() });
  savePins(pins);
}

function syncMap(){
  const pins = getPins();
  const fc = { type:"FeatureCollection", features: pins.map(p => ({
    type:"Feature",
    geometry:{ type:"Point", coordinates:[p.lon, p.lat] },
    properties:{ name:p.name, color:COLORS[p.type]||COLORS.other }
  }))};
  if (window.BH.setPinsData) window.BH.setPinsData(fc);
}

function renderList(){
  const ul = el("pin-list");
  const pins = getPins().slice().reverse();
  const here = posOrFallback();
  ul.innerHTML = "";
  if (!pins.length){ ul.innerHTML = "<li class='muted'>No pins yet. Drop one at your stand, parking spot, or trail camera.</li>"; return; }
  pins.forEach(p => {
    const d = dist(here, p), b = bearing(here, p);
    const li = document.createElement("li");
    li.innerHTML =
      "<span class='pin-dot' style='background:"+(COLORS[p.type]||COLORS.other)+"'></span>"+
      "<span class='nm'>"+esc(p.name)+"<small>"+esc(NAMES[p.type]||p.type)+" · "+
        fmtDist(d)+" "+compass16(b)+" ("+Math.round(b)+"°)</small></span>";
    const go = document.createElement("button");
    go.textContent = "Go"; go.style.borderColor = "#B49A5B"; go.style.color = "#B49A5B";
    go.onclick = () => {
      // switch to map tab and fly to pin
      document.querySelector('[data-tab="tab-map"]').click();
      const m = window.BH.getMap();
      if (m) m.flyTo({ center:[p.lon, p.lat], zoom:15 });
    };
    const del = document.createElement("button");
    del.textContent = "✕";
    del.onclick = () => savePins(getPins().filter(x => x.id !== p.id));
    li.appendChild(go); li.appendChild(del);
    ul.appendChild(li);
  });
}

function exportGpx(){
  const pins = getPins();
  if (!pins.length){ window.BH.showToast("No pins to export"); return; }
  let gpx = '<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="BullHunt">\n';
  pins.forEach(p => {
    gpx += '  <wpt lat="'+p.lat+'" lon="'+p.lon+'"><name>'+esc(p.name)+
           '</name><type>'+esc(NAMES[p.type]||p.type)+'</type></wpt>\n';
  });
  gpx += "</gpx>";
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([gpx],{type:"application/gpx+xml"}));
  a.download = "bullhunt-waypoints.gpx";
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href), 5000);
}

document.addEventListener("DOMContentLoaded", () => {
  el("btn-pin-here").onclick = () => {
    const p = posOrFallback();
    dropPinAt(p.lat, p.lon, el("pin-name").value, el("pin-type").value);
    el("pin-name").value = "";
    window.BH.showToast("Pin dropped");
  };
  el("btn-pin-center").onclick = () => {
    const m = window.BH.getMap();
    if (!m){ window.BH.showToast("Open the map first"); return; }
    const c = m.getCenter();
    dropPinAt(c.lat, c.lng, el("pin-name").value, el("pin-type").value);
    el("pin-name").value = "";
    window.BH.showToast("Pin dropped");
  };
  el("btn-gpx").onclick = exportGpx;
  renderList();
  on("map-ready", syncMap);
});

window.BH = window.BH || {};
Object.assign(window.BH, { dropPinAt, getPins });
})();
