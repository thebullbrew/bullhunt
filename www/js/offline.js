/* BullHunt offline tile packs: download satellite tiles into Cache Storage */
(function(){
"use strict";
const { el, esc, tilesForRadius, posOrFallback, tileBounds } = window.BH;

const TILE_URL = z => x => y =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
const META_KEY = "bullhunt-packs";
const ZMIN = 10, ZMAX = 14;

function getPacks(){
  try { return JSON.parse(localStorage.getItem(META_KEY) || "[]"); }
  catch(e){ return []; }
}
function savePacks(p){ localStorage.setItem(META_KEY, JSON.stringify(p)); }

async function downloadPack(){
  const btn = el("btn-dl-start");
  btn.disabled = true;
  try {
    let center;
    if (el("dl-center").value === "gps") {
      center = posOrFallback();
    } else {
      const m = window.BH.getMap();
      if (!m) { window.BH.showToast("Map not ready"); return; }
      const c = m.getCenter(); center = { lat:c.lat, lon:c.lng };
    }
    const miles = parseInt(el("dl-radius").value, 10);
    const tiles = tilesForRadius(center.lat, center.lon, miles, ZMIN, ZMAX);
    const cache = await caches.open("bullhunt-tiles");
    const prog = el("dl-progress"), bar = el("dl-bar"), txt = el("dl-text");
    prog.classList.remove("hidden");

    let done = 0, failed = 0;
    const CONC = 6;
    for (let i=0; i<tiles.length; i+=CONC){
      const batch = tiles.slice(i, i+CONC).map(async t => {
        const url = TILE_URL(t.z)(t.x)(t.y);
        try {
          const hit = await cache.match(url);
          if (!hit) await cache.add(url);
        } catch(e){ failed++; }
        done++;
        bar.style.width = Math.round(done/tiles.length*100) + "%";
        txt.textContent = done + " / " + tiles.length + " tiles";
      });
      await Promise.all(batch);
    }
    const packs = getPacks();
    packs.push({ lat:+center.lat.toFixed(4), lon:+center.lon.toFixed(4),
                 miles, tiles: tiles.length, failed, ts: Date.now() });
    savePacks(packs);
    renderPackList();
    window.BH.showToast("Pack saved — works offline now");
  } finally {
    btn.disabled = false;
    setTimeout(()=> el("dl-progress").classList.add("hidden"), 1500);
  }
}

function renderPackList(){
  const ul = el("dl-list");
  const packs = getPacks();
  if (!packs.length){ ul.innerHTML = "<li class='muted'>No packs yet.</li>"; return; }
  ul.innerHTML = "";
  packs.forEach((p, i) => {
    const li = document.createElement("li");
    li.innerHTML = "<span>" + esc(p.miles) + " mi pack · " +
      p.lat.toFixed(2) + ", " + p.lon.toFixed(2) +
      " <small class='muted'>" + p.tiles + " tiles</small></span>";
    const del = document.createElement("button");
    del.textContent = "Delete";
    del.onclick = async () => {
      // remove this pack's tiles from cache
      const cache = await caches.open("bullhunt-tiles");
      const tiles = tilesForRadius(p.lat, p.lon, p.miles, ZMIN, ZMAX);
      for (const t of tiles) await cache.delete(TILE_URL(t.z)(t.x)(t.y));
      const all = getPacks(); all.splice(i,1); savePacks(all);
      renderPackList();
    };
    li.appendChild(del);
    ul.appendChild(li);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  el("btn-dl-start").onclick = downloadPack;
});

window.BH = window.BH || {};
Object.assign(window.BH, { renderPackList, getPacks });
})();
