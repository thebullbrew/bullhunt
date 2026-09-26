import json, urllib.request, urllib.parse, sys

BASE = "https://mapservices.pasda.psu.edu/server/rest/services/pasda/PennsylvaniaGameCommission/MapServer"
OUT = "/home/hatch/workspace/hunting-app/data"

def fetch_layer(layer_id, fields, name):
    feats = []
    offset = 0
    while True:
        q = {
            "where": "1=1",
            "outFields": ",".join(fields),
            "returnGeometry": "true",
            "outSR": "4326",
            "f": "geojson",
            "resultOffset": offset,
            "resultRecordCount": 1000,
        }
        url = f"{BASE}/{layer_id}/query?" + urllib.parse.urlencode(q)
        req = urllib.request.Request(url, headers={"User-Agent": "BullHunt/1.0"})
        with urllib.request.urlopen(req, timeout=60) as r:
            d = json.loads(r.read().decode())
        batch = d.get("features", [])
        feats.extend(batch)
        print(f"  {name}: offset {offset}, got {len(batch)}, total {len(feats)}", flush=True)
        if len(batch) < 1000:
            break
        offset += 1000
    fc = {"type": "FeatureCollection", "features": feats}
    p = f"{OUT}/{name}.geojson"
    with open(p, "w") as f:
        json.dump(fc, f)
    print(f"  saved {p} ({len(feats)} features)")
    return p

fetch_layer(4, ["SGL", "NAME", "ACRES", "PGC_REGION"], "sgl")
fetch_layer(9, ["NAME", "SGL"], "sgl_parking")
fetch_layer(5, ["WMU", "NAME"], "wmu")
