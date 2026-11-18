#!/usr/bin/env python3
"""Map Phase 2 sanity check: land extent of the gtadb frame vs the reported
in-game size (~16 km tall x 10.9 km wide).

Stitches one zoom level of a gtadb tile set from a local clone, classifies
water (blue clearly above red), removes the poster's printed text/scale-bar
strokes with a 5x5 opening, keeps land components >= --min-km2 and reports
their bounding box in canonical meters. The legend panel east of 3800 m is
ignored, same as the tile import.

  python3 scripts/gtadb_land_extent.py <gtadb-clone> [--set yanis,18] [--zoom 3]
"""
import argparse, json, os
import numpy as np
import cv2
from PIL import Image

REPORTED_W_KM, REPORTED_H_KM = 10.9, 16.0

ap = argparse.ArgumentParser()
ap.add_argument("repo"); ap.add_argument("--set", default="yanis,18")
ap.add_argument("--zoom", type=int, default=3); ap.add_argument("--min-km2", type=float, default=0.1)
a = ap.parse_args()

z = a.zoom; W = 1024 * 2 ** z; mpp = 32768 / W
d = os.path.join(a.repo, "maps/tiles/6", a.set, str(z))
img = np.zeros((W, W, 3), np.uint8); img[:] = (44, 103, 164)
for f in os.listdir(d):
    _, ty, tx = map(int, f[:-4].split(","))
    img[ty * 256:(ty + 1) * 256, tx * 256:(tx + 1) * 256] = np.array(Image.open(os.path.join(d, f)).convert("RGB"))
r, b = img[..., 0].astype(int), img[..., 2].astype(int)
land = (b <= r + 30).astype(np.uint8)
xs = -16384 + (np.arange(W) + 0.5) * mpp; ys = 16384 - (np.arange(W) + 0.5) * mpp
land[:, xs > 3800] = 0
land = cv2.morphologyEx(land, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
n, lab, stats, _ = cv2.connectedComponentsWithStats(land, 8)
keep = [i for i in range(1, n) if stats[i, cv2.CC_STAT_AREA] * mpp * mpp / 1e6 >= a.min_km2]
py, px = np.nonzero(np.isin(lab, keep))
w_km = (xs[px].max() - xs[px].min()) / 1000; h_km = (ys[py].max() - ys[py].min()) / 1000
print(json.dumps({
    "set": a.set, "zoom": z, "components": len(keep),
    "x_range_m": [round(float(xs[px].min())), round(float(xs[px].max()))],
    "y_range_m": [round(float(ys[py].min())), round(float(ys[py].max()))],
    "width_km": round(float(w_km), 2), "height_km": round(float(h_km), 2),
    "land_km2": round(len(px) * mpp * mpp / 1e6, 1),
    "vs_reported": {"width_pct": round((w_km / REPORTED_W_KM - 1) * 100, 1),
                    "height_pct": round((h_km / REPORTED_H_KM - 1) * 100, 1)},
}, indent=2))
