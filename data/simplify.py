import json, math

def perp_dist(p, a, b):
    # perpendicular distance from p to segment ab (in degrees)
    dx, dy = b[0]-a[0], b[1]-a[1]
    if dx == 0 and dy == 0:
        return math.hypot(p[0]-a[0], p[1]-a[1])
    t = ((p[0]-a[0])*dx + (p[1]-a[1])*dy) / (dx*dx + dy*dy)
    t = max(0, min(1, t))
    return math.hypot(p[0]-(a[0]+t*dx), p[1]-(a[1]+t*dy))

def rdp(pts, tol):
    if len(pts) <= 2: return pts
    dmax, idx = 0, 0
    for i in range(1, len(pts)-1):
        d = perp_dist(pts[i], pts[0], pts[-1])
        if d > dmax: dmax, idx = d, i
    if dmax > tol:
        left = rdp(pts[:idx+1], tol)
        right = rdp(pts[idx:], tol)
        return left[:-1] + right
    return [pts[0], pts[-1]]

def simplify_ring(ring, tol):
    closed = ring[0] == ring[-1]
    work = ring[:-1] if closed else ring
    out = rdp(work, tol)
    if closed: out = out + [out[0]]
    return [[round(x,5), round(y,5)] for x,y in out]

def process(src, dst, tol, keep_props):
    with open(src) as f: fc = json.load(f)
    total_in = total_out = 0
    for feat in fc["features"]:
        g = feat["geometry"]
        if g["type"] == "Polygon":
            rings = [simplify_ring(r, tol) for r in g["coordinates"]]
        elif g["type"] == "MultiPolygon":
            rings = [[simplify_ring(r, tol) for r in poly] for poly in g["coordinates"]]
        else:  # points etc: just round
            rings = None
            if g["type"] == "Point":
                g["coordinates"] = [round(c,5) for c in g["coordinates"]]
        if rings is not None:
            g["coordinates"] = rings
        feat["properties"] = {k: feat["properties"].get(k) for k in keep_props}
    with open(dst, "w") as f:
        json.dump(fc, f, separators=(",", ":"))
    import os
    print(f"{dst}: {len(fc['features'])} features, {os.path.getsize(dst)/1024:.0f} KB")

D = "/home/hatch/workspace/hunting-app/data/"
process(D+"sgl.geojson", D+"sgl.min.geojson", 0.00025, ["SGL","NAME","ACRES","PGC_REGION"])
process(D+"wmu.geojson", D+"wmu.min.geojson", 0.001, ["WMU_ID","ACREAGE"])
process(D+"sgl_parking.geojson", D+"sgl_parking.min.geojson", 0, ["SGL","PGC_REGION"])
