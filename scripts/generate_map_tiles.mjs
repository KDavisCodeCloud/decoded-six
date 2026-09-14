#!/usr/bin/env node
// Generates a z/x/y tile pyramid from one source map image, for Leaflet's
// CRS.Simple mode (see src/lib/map-coords.ts for the coordinate mapping
// this pairs with).
//
// Usage:
//   node scripts/generate_map_tiles.mjs <source-image> [--out <dir>] [--max-zoom <n>]
//
// Output: 256px PNG tiles at public/map-tiles/{z}/{x}/{y}.png (or --out),
// zoom 0..maxZoom (default 6). Written to public/ (not Supabase storage) --
// this is a static asset that ships with every deploy exactly like
// public/map-icons/ or public/sounds/ already do, so it's versioned with
// the code, works with Vercel's CDN/edge caching for free, and needs zero
// extra runtime config (no storage bucket, no signed URLs). Swap to
// Supabase storage later only if the real tile set gets too large for a
// git-tracked repo -- not a concern at this placeholder stage.
//
// Tiling scheme: standard XYZ (row 0 = top of image), matching how sharp
// crops top-down. LeafletMap.tsx requests these with the Leaflet `tms`
// option so CRS.Simple's upward-increasing Y still lines up visually with
// the source image's natural orientation.

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const TILE_SIZE = 256;

function parseArgs(argv) {
  const args = { out: 'public/map-tiles', maxZoom: 6 };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out') args.out = argv[++i];
    else if (argv[i] === '--max-zoom') args.maxZoom = parseInt(argv[++i], 10);
    else positional.push(argv[i]);
  }
  args.source = positional[0];
  return args;
}

async function main() {
  const { source, out, maxZoom } = parseArgs(process.argv.slice(2));
  if (!source) {
    console.error('Usage: node scripts/generate_map_tiles.mjs <source-image> [--out <dir>] [--max-zoom <n>]');
    process.exit(1);
  }
  if (!fs.existsSync(source)) {
    console.error(`Source image not found: ${source}`);
    process.exit(1);
  }

  const worldPx = TILE_SIZE * 2 ** maxZoom; // e.g. 256 * 64 = 16384 at zoom 6
  console.log(`Generating tile pyramid: zoom 0-${maxZoom}, native resolution ${worldPx}x${worldPx}px`);

  const srcMeta = await sharp(source).metadata();
  console.log(`Source image: ${srcMeta.width}x${srcMeta.height}`);

  // Letterbox the source image onto a square canvas so world coordinates
  // stay a simple fixed square across every zoom level (see map-coords.ts
  // WORLD_SIZE) -- avoids aspect-ratio bookkeeping for a placeholder pass.
  // limitInputPixels: false -- default sharp caps output at ~268M px
  // (16384x16384 at maxZoom 6 sits right at that ceiling), which isn't an
  // actual memory constraint here, just a safety default meant for
  // untrusted uploads. This script only ever runs against a source image
  // the operator picked themselves.
  const squareBuffer = await sharp(source, { limitInputPixels: false })
    .resize(worldPx, worldPx, { fit: 'contain', background: { r: 7, g: 9, b: 16, alpha: 1 } })
    .png()
    .toBuffer();

  let totalTiles = 0;

  for (let z = maxZoom; z >= 0; z--) {
    const zoomPx = TILE_SIZE * 2 ** z;
    const tilesPerSide = 2 ** z;

    // Downsample the full-res square to this zoom's native resolution once,
    // then slice -- far cheaper than re-resizing per tile.
    const zoomImage = sharp(squareBuffer, { limitInputPixels: false }).resize(zoomPx, zoomPx);
    const zoomBuffer = await zoomImage.png().toBuffer();

    for (let y = 0; y < tilesPerSide; y++) {
      for (let x = 0; x < tilesPerSide; x++) {
        const dir = path.join(out, String(z), String(x));
        fs.mkdirSync(dir, { recursive: true });
        const tilePath = path.join(dir, `${y}.png`);
        await sharp(zoomBuffer, { limitInputPixels: false })
          .extract({ left: x * TILE_SIZE, top: y * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE })
          .toFile(tilePath);
        totalTiles++;
      }
    }
    console.log(`  zoom ${z}: ${tilesPerSide}x${tilesPerSide} tiles (${zoomPx}x${zoomPx}px native)`);
  }

  console.log(`\nDone. ${totalTiles} tiles written to ${out}/`);
  console.log(`Set MAP_TILE_URL=/map-tiles/{z}/{x}/{y}.png to use them.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
