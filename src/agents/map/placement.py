"""Map pin pipeline -- placement. In order of preference:

1. Screenshot match: an in-game map screenshot / VOD frame is matched against
   the ACTIVE base layer (our own Supabase-hosted tiles, never a third-party
   image) with OpenCV -- ORB first, SIFT fallback -- and a RANSAC homography.
   Accept at >= 25 inliers and low reprojection error; the screenshot centre
   is converted to canonical meters.
2. Gazetteer: anchor landmarks / name / district matched against imported
   gtadb landmarks (+ OCR'd official-map labels once Phase 4 lands).
   landmark ~150 m, district ~800 m, county = no pin.
3. Neither -> no position (HITL "needs placement").
"""

from __future__ import annotations

import logging
import math
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

from src.agents.map.rules import RADIUS_DISTRICT, RADIUS_LANDMARK, RADIUS_SCREENSHOT, normalize_name

log = logging.getLogger(__name__)

WORLD_HALF_M = 16384
MIN_INLIERS = 25
MAX_REPROJ_PX = 4.0
# land bbox of the gtadb frame (scripts/gtadb_land_extent.py) + margin
REF_X = (-9800, 3400)
REF_Y = (-7700, 9700)
REF_ZOOM = 3                    # 4 m/px


@dataclass
class Placement:
    x: float
    y: float
    radius_m: float
    method: str                 # screenshot_match | gazetteer_landmark | gazetteer_district
    detail: str


# ============================================================ screenshot match
class ScreenshotMatcher:
    """Lazily stitches the reference image from the active layer's tiles."""

    def __init__(self, tile_url_template: str, cache_dir: Optional[str] = None, http: Any = None):
        self.template = tile_url_template
        self.cache = Path(cache_dir or os.environ.get("MAP_REF_CACHE", "/tmp/decodedsix-map-ref"))
        self.http = http
        self._ref = None

    def _reference(self):
        if self._ref is not None:
            return self._ref
        import cv2
        import numpy as np
        import requests

        z = REF_ZOOM
        mpp = 2 * WORLD_HALF_M / (1024 * 2 ** z)
        tx0, tx1 = int((REF_X[0] + WORLD_HALF_M) / mpp // 256), int((REF_X[1] + WORLD_HALF_M) / mpp // 256)
        ty0, ty1 = int((WORLD_HALF_M - REF_Y[1]) / mpp // 256), int((WORLD_HALF_M - REF_Y[0]) / mpp // 256)
        self.cache.mkdir(parents=True, exist_ok=True)
        key = re.sub(r"[^A-Za-z0-9]+", "_", self.template.split("?v=")[-1])[:40]
        cached = self.cache / f"ref_z{z}_{key}.png"
        if cached.exists():
            img = cv2.imread(str(cached), cv2.IMREAD_GRAYSCALE)
        else:
            http = self.http or requests
            img = np.full(((ty1 - ty0 + 1) * 256, (tx1 - tx0 + 1) * 256), 110, np.uint8)
            for ty in range(ty0, ty1 + 1):
                for tx in range(tx0, tx1 + 1):
                    url = self.template.replace("{z}", str(z)).replace("{y}", str(ty)).replace("{x}", str(tx))
                    r = http.get(url, timeout=15)
                    if r.status_code == 200:
                        tile = cv2.imdecode(np.frombuffer(r.content, np.uint8), cv2.IMREAD_GRAYSCALE)
                        if tile is not None:
                            img[(ty - ty0) * 256:(ty - ty0 + 1) * 256, (tx - tx0) * 256:(tx - tx0 + 1) * 256] = tile
            cv2.imwrite(str(cached), img)
        orb = cv2.ORB_create(nfeatures=60000, scaleFactor=1.2, nlevels=10)
        kp, des = orb.detectAndCompute(img, None)
        self._ref = {"img": img, "mpp": mpp, "x0px": tx0 * 256, "y0px": ty0 * 256, "orb": (kp, des), "sift": None}
        return self._ref

    def _px_to_m(self, ref: dict, px: float, py: float) -> tuple[float, float]:
        gx, gy = ref["x0px"] + px, ref["y0px"] + py
        return -WORLD_HALF_M + gx * ref["mpp"], WORLD_HALF_M - gy * ref["mpp"]

    def match(self, image_bytes: bytes) -> Optional[Placement]:
        import cv2
        import numpy as np

        q = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_GRAYSCALE)
        if q is None or min(q.shape) < 200:
            return None
        if max(q.shape) > 1600:
            s = 1600 / max(q.shape)
            q = cv2.resize(q, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
        ref = self._reference()
        for algo in ("orb", "sift"):
            res = self._match_with(algo, q, ref)
            if res:
                return res
        return None

    def _match_with(self, algo: str, q, ref: dict) -> Optional[Placement]:
        import cv2
        import numpy as np

        if algo == "orb":
            det = cv2.ORB_create(nfeatures=8000, scaleFactor=1.2, nlevels=10)
            norm = cv2.NORM_HAMMING
            kp_r, des_r = ref["orb"]
        else:
            det = cv2.SIFT_create(nfeatures=8000)
            norm = cv2.NORM_L2
            if ref["sift"] is None:
                ref["sift"] = cv2.SIFT_create(nfeatures=80000).detectAndCompute(ref["img"], None)
            kp_r, des_r = ref["sift"]
        kp_q, des_q = det.detectAndCompute(q, None)
        if des_q is None or des_r is None or len(kp_q) < MIN_INLIERS:
            return None
        pairs = cv2.BFMatcher(norm).knnMatch(des_q, des_r, k=2)
        good = [m for m, n in (p for p in pairs if len(p) == 2) if m.distance < 0.75 * n.distance]
        if len(good) < MIN_INLIERS:
            return None
        src = np.float32([kp_q[m.queryIdx].pt for m in good]).reshape(-1, 1, 2)
        dst = np.float32([kp_r[m.trainIdx].pt for m in good]).reshape(-1, 1, 2)
        H, mask = cv2.findHomography(src, dst, cv2.RANSAC, 5.0)
        if H is None:
            return None
        inl = mask.ravel().astype(bool)
        n_in = int(inl.sum())
        if n_in < MIN_INLIERS:
            return None
        proj = cv2.perspectiveTransform(src[inl], H)
        reproj = float(np.sqrt(((proj - dst[inl]) ** 2).sum(-1)).mean())
        if reproj > MAX_REPROJ_PX:
            return None
        h, w = q.shape
        corners = cv2.perspectiveTransform(np.float32([[[0, 0]], [[w, 0]], [[w, h]], [[0, h]]]), H).reshape(-1, 2)
        # reject degenerate warps (fold-overs / absurd scale) before trusting the centre
        area_px = abs(cv2.contourArea(corners.astype(np.float32)))
        width_m = math.sqrt(area_px) * ref["mpp"]
        if not (50 <= width_m <= 20000) or not cv2.isContourConvex(corners.astype(np.float32)):
            return None
        cx, cy = cv2.perspectiveTransform(np.float32([[[w / 2, h / 2]]]), H).reshape(2)
        x, y = self._px_to_m(ref, float(cx), float(cy))
        # the claim is "somewhere in this view": tight for a zoomed-in map, looser for a wide one
        radius = max(RADIUS_SCREENSHOT, min(400.0, width_m * 0.05))
        return Placement(x, y, radius, "screenshot_match",
                         f"{algo.upper()} {n_in} inliers, reproj {reproj:.1f}px, view ~{width_m:.0f} m wide")


def looks_like_map_frame(bgr) -> bool:
    """Cheap pre-filter for VOD frames: a full-screen map is dominated by flat
    water + land colours with little skin/sky gradient. Histogram heuristic:
    >= 20% of pixels in the water hue band and low overall edge density."""
    import cv2
    import numpy as np

    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    water = ((hsv[..., 0] >= 90) & (hsv[..., 0] <= 125) & (hsv[..., 1] >= 60)).mean()
    edges = cv2.Canny(cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY), 80, 160).mean() / 255
    return bool(water >= 0.20 and edges <= 0.18)


def vod_map_frames(video_url: str, max_frames: int = 30, max_duration_s: int = 2700,
                   workdir: Optional[str] = None) -> list[bytes]:
    """Downloads a low-res copy with yt-dlp, keeps up to max_frames frames
    that look like the full-screen map. Frames feed screenshot matching only;
    they are never stored or published. [] on any failure."""
    import subprocess
    import tempfile

    import cv2

    with tempfile.TemporaryDirectory(dir=workdir) as tmp:
        out = os.path.join(tmp, "v.mp4")
        try:
            subprocess.run(["yt-dlp", "-q", "--no-playlist", "--match-filter", f"duration<{max_duration_s}",
                            "-f", "worst[ext=mp4][height>=360]/worst[ext=mp4]", "-o", out, video_url],
                           check=True, capture_output=True, timeout=600)
        except Exception as exc:
            log.info("[map-scrape] yt-dlp skipped %s: %s", video_url, type(exc).__name__)
            return []
        if not os.path.exists(out):
            return []
        cap = cv2.VideoCapture(out)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        step = max(1, int(fps * 4))                      # one frame per 4 s
        frames: list[bytes] = []
        last_kept = -10 ** 9
        for idx in range(0, total, step):
            cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
            ok, frame = cap.read()
            if not ok:
                break
            if idx - last_kept < fps * 8:               # avoid near-duplicates of one map view
                continue
            if looks_like_map_frame(frame):
                frames.append(cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 90])[1].tobytes())
                last_kept = idx
                if len(frames) >= max_frames:
                    break
        cap.release()
        return frames


# ===================================================================== gazetteer
_GENERIC = {"gas station", "store", "shop", "safehouse", "hospital", "police station", "gym", "bank",
            "house", "building", "beach", "park", "bar", "club", "hotel", "motel", "garage", "unnamed"}


@dataclass
class GazEntry:
    name: str
    norm: str
    x: float
    y: float
    kind: str                   # landmark | district


class Gazetteer:
    def __init__(self, entries: list[GazEntry]):
        self.entries = entries
        self.by_norm: dict[str, list[GazEntry]] = {}
        for e in entries:
            self.by_norm.setdefault(e.norm, []).append(e)

    @classmethod
    def from_rows(cls, rows: list[dict]) -> "Gazetteer":
        """rows: map_markers gtadb_import/staff rows (name, area_name, x, y)."""
        entries: list[GazEntry] = []
        districts: dict[str, list[tuple[float, float]]] = {}
        for r in rows:
            if r.get("x") is None:
                continue
            x, y = float(r["x"]), float(r["y"])
            name = r.get("name") or ""
            if name and not name.startswith("Unnamed ") and normalize_name(name) not in _GENERIC:
                entries.append(GazEntry(name, normalize_name(name), x, y, "landmark"))
            for part in (r.get("area_name") or "").split(","):
                part = part.strip()
                if part and not part.endswith(" County") and part != "Leonida":
                    districts.setdefault(part, []).append((x, y))
        for d, pts in districts.items():
            if len(pts) >= 3:
                entries.append(GazEntry(d, normalize_name(d), sum(p[0] for p in pts) / len(pts),
                                        sum(p[1] for p in pts) / len(pts), "district"))
        return cls(entries)

    def lookup(self, phrase: str) -> Optional[GazEntry]:
        n = normalize_name(phrase)
        if len(n) < 4 or n in _GENERIC:
            return None
        hits = self.by_norm.get(n)
        if hits:
            # prefer a landmark over a district of the same name
            hits = sorted(hits, key=lambda e: e.kind != "landmark")
            if hits[0].kind == "district" or len({(round(h.x, -2), round(h.y, -2)) for h in hits if h.kind == "landmark"}) == 1:
                return hits[0]
            return None       # same name at several places -> ambiguous, don't guess
        # phrase contains a whole multi-word landmark name ("the pier at Ocean Beach")
        best = None
        for e in self.entries:
            if len(e.norm.split()) >= 2 and re.search(rf"\b{re.escape(e.norm)}\b", n):
                if best is None or (e.kind == "landmark", len(e.norm)) > (best.kind == "landmark", len(best.norm)):
                    best = e
        return best

    def place(self, anchors: list[str], name: str, location_description: str) -> Optional[Placement]:
        landmark = district = None
        for phrase in [*anchors, name, location_description]:
            e = self.lookup(phrase or "")
            if not e:
                continue
            if e.kind == "landmark" and landmark is None:
                landmark = (e, phrase)
            elif e.kind == "district" and district is None:
                district = (e, phrase)
        if landmark:
            e, p = landmark
            return Placement(e.x, e.y, RADIUS_LANDMARK, "gazetteer_landmark", f"landmark '{e.name}' from '{p[:60]}'")
        if district:
            e, p = district
            return Placement(e.x, e.y, RADIUS_DISTRICT, "gazetteer_district", f"district '{e.name}' from '{p[:60]}'")
        return None
