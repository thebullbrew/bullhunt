/* BullHunt bootstrap: tabs, GPS, service worker */
(function(){
"use strict";

document.addEventListener("DOMContentLoaded", () => {
  // tab switching
  const btns = document.querySelectorAll("#tabbar button");
  btns.forEach(b => b.addEventListener("click", () => {
    btns.forEach(x => x.classList.remove("active"));
    b.classList.add("active");
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.getElementById(b.dataset.tab).classList.add("active");
    if (b.dataset.tab === "tab-map" && window.BH.getMap()) {
      setTimeout(()=> window.BH.getMap().resize(), 50);
    }
  }));

  // GPS
  window.BH.startGps();

  // service worker (offline)
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(e => console.warn("SW failed", e));
  }
});
})();
