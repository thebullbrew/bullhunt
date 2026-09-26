/* BullHunt map: SGL boundaries, parking, WMUs, GPS dot, pins */
(function(){
"use strict";
const { el, esc, posOrFallback, on } = window.BH;

let map = null;
let sglData = null, parkingData = null, wmuData = null;
let userMarker = null, selectedSgl = null;

const SAT_TILES = ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"];
const TOPO_TILES = ["https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"];

function baseSource(kind){
  return {
    type: "raster",
    tiles: kind === "sat" ? SAT_TILES : TOPO_TILES,
    tileSize: 256, maxzoom: 19,
    attribution: kind === "sat"
      ? "Imagery © Esri, Maxar, Earthstar Geographics"
      : "© OpenStreetMap contributors © CARTO"
  };
}

async function loadData(){
  const [sgl, park, wmu] = await Promise.all([
    fetch("data/sgl.min.geojson").then(r=>r.json()),
    fetch("data/sgl_parking.min.geojson").then(r=>r.json()),
    fetch("data/wmu.min.geojson").then(r=>r.json()),
  ]);
  sglData = sgl; parkingData = park; wmuData = wmu;
}

function initMap(){
  const c = posOrFallback();
  map = new maplibregl.Map({
    container: "map",
    style: { version: 8, sources: { base: baseSource("sat") },
             layers: [{ id:"base", type:"raster", source:"base", paint:{"raster-opacity":1} }] },
    center: [c.lon, c.lat], zoom: 11,
    attributionControl: { compact: true },
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass:false }), "bottom-right");
  map.addControl(new maplibregl.GeolocateControl({
    positionOptions:{ enableHighAccuracy:true }, trackUserLocation:true, showUserLocation:true
  }), "bottom-right");

  map.on("load", () => {
    // SGL fill + outline
    map.addSource("sgl", { type:"geojson", data: sglData });
    map.addLayer({ id:"sgl-fill", type:"fill", source:"sgl",
      paint:{ "fill-color":"#B49A5B", "fill-opacity":0.22 } });
    map.addLayer({ id:"sgl-line", type:"line", source:"sgl",
      paint:{ "line-color":"#B49A5B", "line-width":1.6 } });
    map.addLayer({ id:"sgl-label", type:"symbol", source:"sgl",
      minzoom: 9,
      layout:{ "text-field":["concat","SGL ",["get","SGL"]], "text-size":11,
               "text-font":["Open Sans Bold"], "text-allow-overlap":false },
      paint:{ "text-color":"#F5F2E8", "text-halo-color":"#1F3522", "text-halo-width":2 } });

    // parking points
    map.addSource("parking", { type:"geojson", data: parkingData });
    map.addLayer({ id:"parking", type:"circle", source:"parking", minzoom: 10,
      paint:{ "circle-radius":5, "circle-color":"#5C2A2A",
              "circle-stroke-color":"#F5F2E8", "circle-stroke-width":1.5 } });

    // WMU boundaries (off by default)
    map.addSource("wmu", { type:"geojson", data: wmuData });
    map.addLayer({ id:"wmu-line", type:"line", source:"wmu", layout:{visibility:"none"},
      paint:{ "line-color":"#7fb3d5", "line-width":1.4, "line-dasharray":[4,3] } });
    map.addLayer({ id:"wmu-label", type:"symbol", source:"wmu", layout:{visibility:"none"},
      minzoom: 7,
      layout:{ "text-field":["concat","WMU ",["get","WMU_ID"]], "text-size":12,
               "text-font":["Open Sans Bold"] },
      paint:{ "text-color":"#7fb3d5", "text-halo-color":"#1F3522", "text-halo-width":2 } });

    // waypoint pins (populated by waypoints.js)
    map.addSource("pins", { type:"geojson", data:{type:"FeatureCollection",features:[]} });
    map.addLayer({ id:"pins", type:"circle", source:"pins",
      paint:{ "circle-radius":7, "circle-color":["get","color"],
              "circle-stroke-color":"#F5F2E8", "circle-stroke-width":2 } });
    map.addLayer({ id:"pins-label", type:"symbol", source:"pins", minzoom: 11,
      layout:{ "text-field":["get","name"], "text-size":11, "text-offset":[0,1.4],
               "text-font":["Open Sans Regular"] },
      paint:{ "text-color":"#F5F2E8", "text-halo-color":"#1F3522", "text-halo-width":2 } });

    wireUi();
    BH.emit("map-ready", map);
  });

  map.on("click", "sgl-fill", e => {
    const f = e.features[0];
    showSglCard(f.properties, e.lngLat);
  });
  map.on("click", "parking", e => {
    const f = e.features[0].properties;
    showToast("Parking area — SGL " + esc(f.SGL ?? "?"));
  });
  map.on("mouseenter","sgl-fill", ()=> map.getCanvas().style.cursor="pointer");
  map.on("mouseleave","sgl-fill", ()=> map.getCanvas().style.cursor="");
}

function showSglCard(props, lngLat){
  selectedSgl = { props, lngLat };
  el("sgl-title").textContent = "SGL " + props.SGL;
  const acres = props.ACRES ? Number(props.ACRES).toLocaleString("en-US",{maximumFractionDigits:0}) : "—";
  el("sgl-body").innerHTML =
    "<div><b>" + acres + "</b> acres · PGC Region " + esc(props.PGC_REGION ?? "—") + "</div>" +
    "<div class='muted'>Boundaries: PA Game Commission (Jan 2023). Verify with PGC before hunting.</div>";
  el("sgl-card").classList.remove("hidden");
}

function wireUi(){
  el("btn-layers").onclick = () => {
    el("layer-panel").classList.toggle("hidden");
    el("offline-panel").classList.add("hidden");
  };
  el("btn-download").onclick = () => {
    el("offline-panel").classList.toggle("hidden");
    el("layer-panel").classList.add("hidden");
    BH.renderPackList && BH.renderPackList();
  };
  el("btn-locate").onclick = () => {
    const p = posOrFallback();
    map.flyTo({ center:[p.lon, p.lat], zoom: Math.max(map.getZoom(), 13) });
  };
  el("sgl-close").onclick = () => el("sgl-card").classList.add("hidden");
  el("btn-sgl-pin").onclick = () => {
    if (selectedSgl && BH.dropPinAt) {
      BH.dropPinAt(selectedSgl.lngLat.lat, selectedSgl.lngLat.lng, "SGL " + selectedSgl.props.SGL, "other");
      showToast("Pin dropped");
    }
    el("sgl-card").classList.add("hidden");
  };
  el("lyr-sgl").onchange = e => {
    const v = e.target.checked ? "visible" : "none";
    ["sgl-fill","sgl-line","sgl-label"].forEach(l => map.setLayoutProperty(l,"visibility",v));
  };
  el("lyr-parking").onchange = e =>
    map.setLayoutProperty("parking","visibility", e.target.checked ? "visible":"none");
  el("lyr-wmu").onchange = e => {
    const v = e.target.checked ? "visible" : "none";
    ["wmu-line","wmu-label"].forEach(l => map.setLayoutProperty(l,"visibility",v));
  };
  el("sel-basemap").onchange = e => {
    map.removeLayer("base"); map.removeSource("base");
    map.addSource("base", baseSource(e.target.value));
    map.addLayer({ id:"base", type:"raster", source:"base" }, "sgl-fill");
  };
}

function showToast(msg){
  let t = el("toast");
  if (!t){ t = document.createElement("div"); t.id="toast"; document.getElementById("app").appendChild(t); }
  t.textContent = msg; t.classList.add("show");
  clearTimeout(t._h); t._h = setTimeout(()=>t.classList.remove("show"), 2200);
}

function boot(){
  loadData().then(initMap).catch(err => {
    console.error(err);
    el("map").innerHTML = "<div class='muted' style='padding:40px'>Could not load map data.</div>";
  });
  on("pos", updateUserDot);
}

window.BH = window.BH || {};
Object.assign(window.BH, { boot, showToast, getMap: ()=>map,
  setPinsData: fc => { if (map && map.getSource("pins")) map.getSource("pins").setData(fc); } });

document.addEventListener("DOMContentLoaded", boot);
})();
