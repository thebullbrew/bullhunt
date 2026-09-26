/* BullHunt shared utilities */
(function(){
"use strict";

const R = 6371000; // earth radius, meters
const MI = 1609.344;

function toRad(d){ return d*Math.PI/180; }
function toDeg(r){ return r*180/Math.PI; }

// Haversine distance in meters
function dist(a, b){ // {lat,lon}
  const dLat = toRad(b.lat-a.lat), dLon = toRad(b.lon-a.lon);
  const s = Math.sin(dLat/2)**2 + Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(s));
}

// Initial bearing a->b in degrees (0=N)
function bearing(a, b){
  const dLon = toRad(b.lon-a.lon);
  const y = Math.sin(dLon)*Math.cos(toRad(b.lat));
  const x = Math.cos(toRad(a.lat))*Math.sin(toRad(b.lat)) -
            Math.sin(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.cos(dLon);
  return (toDeg(Math.atan2(y,x))+360)%360;
}

function fmtDist(m){
  if (m < 1000) return Math.round(m)+" m";
  const mi = m/MI;
  return mi < 10 ? mi.toFixed(1)+" mi" : Math.round(mi)+" mi";
}

function fmtTime(d){
  let h=d.getHours(), m=d.getMinutes();
  const ap = h>=12 ? "PM":"AM"; h=h%12||12;
  return h+":"+String(m).padStart(2,"0")+" "+ap;
}

function fmtDate(d){
  return d.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});
}

function compass16(deg){
  const pts=["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
  return pts[Math.round(deg/22.5)%16];
}

// tile math (slippy)
function lonToX(lon,z){ return Math.floor((lon+180)/360*Math.pow(2,z)); }
function latToY(lat,z){
  const r=toRad(lat);
  return Math.floor((1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*Math.pow(2,z));
}
function tileBounds(x,y,z){
  const n=Math.pow(2,z);
  const lon1=x/n*360-180, lon2=(x+1)/n*360-180;
  const lat1=toDeg(Math.atan(Math.sinh(Math.PI*(1-2*y/n))));
  const lat2=toDeg(Math.atan(Math.sinh(Math.PI*(1-2*(y+1)/n))));
  return {lat1,lon1,lat2,lon2};
}
function tilesForRadius(lat,lon,miles,zMin,zMax){
  const out=[];
  for(let z=zMin;z<=zMax;z++){
    const rDegLat = miles/69.0, rDegLon = miles/(69.0*Math.cos(toRad(lat)));
    const x0=lonToX(lon-rDegLon,z), x1=lonToX(lon+rDegLon,z);
    const y0=latToY(lat+rDegLat,z), y1=latToY(lat-rDegLat,z);
    for(let x=x0;x<=x1;x++) for(let y=y0;y<=y1;y++) out.push({x,y,z});
  }
  return out;
}

function el(id){ return document.getElementById(id); }
function esc(s){ return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }

window.BH = window.BH || {};
Object.assign(window.BH,{dist,bearing,fmtDist,fmtTime,fmtDate,compass16,lonToX,latToY,tileBounds,tilesForRadius,el,esc,MI});
})();
