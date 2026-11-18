#!/usr/bin/env node
// Copies one gtadb tile set from a local git clone of rolux/gtadb.org into
// Supabase Storage and registers it as a map_layers row (migration 029).
//
// gtadb asks that nobody fetch live data/media from gtadb.org ("simply
// `git pull` for updates"), so this reads ONLY from a local clone, never HTTP.
//
// Usage (env from .env.local):
//   set -a; . ./.env.local; set +a
//   node scripts/upload_gtadb_tiles.mjs <gtadb-clone> \
//     [--set "yanis,18"] [--prefix gtadb-yanis-v18] [--layer community] \
//     [--mask-east-of 3800] [--dry-run]
//
// The legend-panel trim is PERMANENT and ON BY DEFAULT for every gtadb
// import (Kelvin, 2026-11-18); there is deliberately no flag to turn it off.
// --mask-east-of only moves the cut, for a future set whose panel sits
// elsewhere -- check that set's tiles before uploading (--dry-run).
//
// --mask-east-of <m> (default 3800): gtadb's poster tiles carry a legend/credits panel east
// of the map (yanis,18: x = 4000..10000 m) that includes a "frames reference"
// grid of Rockstar trailer stills. We never serve it: tiles wholly east of
// the cut are dropped (and deleted from storage if already uploaded), tiles
// straddling it get the east part painted ocean. Pure ocean lies between the
// coast (< 3300 m) and the panel, so 3800 m loses no map.
//
// Tiles land at map-tiles/<prefix>/{z}/{z},{y},{x}.jpg, keeping gtadb's own
// naming (256px JPEG, zoom 0-5, level 5 = 1 px/m, world centred on 0,0,
// +/-16384 m). Re-runs skip tiles that are already uploaded.

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const BUCKET = 'map-tiles';
const CONCURRENCY = 4;
const WORLD_HALF_M = 16384;
const OCEAN = { r: 44, g: 103, b: 164 };   // yanis ocean fill
const DEFAULT_MASK_EAST_OF_M = 3800;      // legend panel trim, always applied

function parseArgs(argv) {
  const a = { set: 'yanis,18', prefix: 'gtadb-yanis-v18', layer: 'community', dryRun: false, maskEastOf: DEFAULT_MASK_EAST_OF_M };
  const pos = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--set') a.set = argv[++i];
    else if (argv[i] === '--prefix') a.prefix = argv[++i];
    else if (argv[i] === '--layer') a.layer = argv[++i];
    else if (argv[i] === '--dry-run') a.dryRun = true;
    else if (argv[i] === '--mask-east-of') a.maskEastOf = Number(argv[++i]);
    else if (argv[i].startsWith('--')) throw new Error(`unknown flag ${argv[i]}`);
    else pos.push(argv[i]);
  }
  a.repo = pos[0];
  return a;
}

/** Every tile in the set plus per-zoom [[minX,minY],[maxX,maxY]] tile ranges. */
/** Tile's west edge (m) and the pixel column where x = cutM falls (256 = not in this tile). */
export function tileCut(z, x, cutM) {
  const mPerPx = (2 * WORLD_HALF_M) / (1024 * 2 ** z);
  const west = -WORLD_HALF_M + x * 256 * mPerPx;
  return { west, cutPx: Math.max(0, Math.min(256, Math.round((cutM - west) / mPerPx))) };
}

export function scanTiles(setDir, maskEastOf = null) {
  const tiles = [];
  const dropped = [];
  const ranges = {};
  for (const z of fs.readdirSync(setDir).filter(d => /^\d+$/.test(d)).sort((a, b) => a - b)) {
    for (const f of fs.readdirSync(path.join(setDir, z))) {
      const m = /^(\d+),(\d+),(\d+)\.jpg$/.exec(f);
      if (!m || m[1] !== z) throw new Error(`unexpected tile name ${z}/${f} in ${setDir}`);
      const [y, x] = [Number(m[2]), Number(m[3])];
      const cutPx = maskEastOf == null ? 256 : tileCut(Number(z), x, maskEastOf).cutPx;
      if (cutPx === 0) { dropped.push(`${z}/${f}`); continue; }
      const r = (ranges[z] ??= [[x, y], [x, y]]);
      r[0][0] = Math.min(r[0][0], x); r[0][1] = Math.min(r[0][1], y);
      r[1][0] = Math.max(r[1][0], x); r[1][1] = Math.max(r[1][1], y);
      const file = path.join(setDir, z, f);
      tiles.push({ file, key: `${z}/${f}`, size: fs.statSync(file).size, cutPx });
    }
  }
  return { tiles, ranges, dropped };
}

/** Tile bytes to upload: the original, or with everything east of cutPx painted ocean. */
async function tileBody(t) {
  if (t.cutPx >= 256) return fs.readFileSync(t.file);
  const patch = await sharp({ create: { width: 256 - t.cutPx, height: 256, channels: 3, background: OCEAN } }).png().toBuffer();
  return sharp(t.file).composite([{ input: patch, left: t.cutPx, top: 0 }]).jpeg({ quality: 90 }).toBuffer();
}

async function listExisting(sb, prefix, zooms) {
  const have = new Set();
  for (const z of zooms) {
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await sb.storage.from(BUCKET).list(`${prefix}/${z}`, { limit: 1000, offset });
      if (error) throw new Error(`listing ${prefix}/${z}: ${error.message}`);
      data.forEach(o => have.add(`${z}/${o.name}`));
      if (data.length < 1000) break;
    }
  }
  return have;
}

async function uploadOne(sb, prefix, t) {
  const body = await tileBody(t);
  for (let attempt = 0; ; attempt++) {
    const { error } = await sb.storage.from(BUCKET).upload(`${prefix}/${t.key}`, body, {
      contentType: 'image/jpeg', cacheControl: '31536000', upsert: true,
    });
    if (!error) return;
    if (attempt >= 4) throw new Error(`upload ${t.key} failed after 5 tries: ${error.message}`);
    await new Promise(r => setTimeout(r, 1000 * 2 ** attempt));
  }
}

async function main() {
  const a = parseArgs(process.argv.slice(2));
  if (!Number.isFinite(a.maskEastOf) || a.maskEastOf > WORLD_HALF_M) {
    throw new Error('--mask-east-of must be a meter value inside the world; the legend panel trim cannot be disabled');
  }
  if (!a.repo) throw new Error('usage: upload_gtadb_tiles.mjs <gtadb-clone> [--set "yanis,18"] [--prefix ...] [--dry-run]');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set (set -a; . ./.env.local; set +a)');

  const sha = execFileSync('git', ['-C', a.repo, 'rev-parse', '--short=9', 'HEAD']).toString().trim();
  const setDir = path.join(a.repo, 'maps', 'tiles', '6', a.set);
  const { tiles, ranges, dropped } = scanTiles(setDir, a.maskEastOf);
  const bytes = tiles.reduce((s, t) => s + t.size, 0);
  const masked = tiles.filter(t => t.cutPx < 256);
  console.log(`gtadb@${sha} ${a.set}: ${tiles.length} tiles, ${(bytes / 1e6).toFixed(1)} MB, zooms ${Object.keys(ranges).join(',')}`
    + (a.maskEastOf == null ? '' : `; east of ${a.maskEastOf} m: ${dropped.length} dropped, ${masked.length} masked`));
  if (a.dryRun) return;

  const sb = createClient(url, key);
  const have = await listExisting(sb, a.prefix, Object.keys(ranges));
  // dropped tiles must not stay public from an earlier unmasked run
  const stale = dropped.filter(k => have.has(k));
  for (let i = 0; i < stale.length; i += 500) {
    const { error } = await sb.storage.from(BUCKET).remove(stale.slice(i, i + 500).map(k => `${a.prefix}/${k}`));
    if (error) throw new Error(`removing panel tiles: ${error.message}`);
  }
  if (stale.length) console.log(`removed ${stale.length} previously uploaded panel tiles`);
  // masked tiles are always re-uploaded so an unmasked copy never survives
  const todo = tiles.filter(t => !have.has(t.key) || t.cutPx < 256);
  console.log(`${have.size - stale.length} already uploaded, ${todo.length} to go`);

  let done = 0, next = 0;
  const worker = async () => {
    while (next < todo.length) {
      const t = todo[next++];
      await uploadOne(sb, a.prefix, t);
      if (++done % 250 === 0 || done === todo.length) console.log(`  ${done}/${todo.length}`);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const maxNative = Math.max(...Object.keys(ranges).map(Number));
  const row = {
    id: a.layer,
    label: 'Community reconstruction (gtadb)',
    kind: 'community',
    frame: 'gtadb_world',
    // ?v= changes whenever tile bytes at the same path change (e.g. masking),
    // so year-long CDN/browser caches never serve a superseded tile
    tile_url_template: `${url}/storage/v1/object/public/${BUCKET}/${a.prefix}/{z}/{z},{y},{x}.jpg`
      + `?v=${sha}${a.maskEastOf == null ? '' : `-m${a.maskEastOf}`}`,
    min_zoom: 0,
    max_native_zoom: maxNative,
    max_zoom: maxNative + 1,
    tile_ranges: ranges,
    background_color: '#2c67a4',   // gtadb's yanis ocean fill (44,103,164)
    attribution: [{
      text: 'GTA VI Map Tiles (CC BY 4.0) — https://map.gtadb.org',
      url: 'https://map.gtadb.org',
      license_url: 'https://creativecommons.org/licenses/by/4.0/',
      adapted: true,
    }],
    source_ref: `rolux/gtadb.org@${sha} maps/tiles/6/${a.set}`
      + (a.maskEastOf == null ? '' : ` (legend panel east of x=${a.maskEastOf} m removed)`),
    updated_at: new Date().toISOString(),
  };
  // insert enables it as the default; re-runs leave enabled/is_default alone
  const { data: existing } = await sb.from('map_layers').select('id').eq('id', a.layer).maybeSingle();
  const { error } = existing
    ? await sb.from('map_layers').update(row).eq('id', a.layer)
    : await sb.from('map_layers').insert({ ...row, enabled: true, is_default: true, sort_order: 10 });
  if (error) throw new Error(`map_layers upsert: ${error.message}`);
  await sb.from('audit_log').insert({
    agent_id: 'map-tiles-upload', action: 'map_layer_registered',
    result: `success: ${a.layer} <- ${row.source_ref}, ${tiles.length} tiles (${todo.length} uploaded this run)`,
  });
  console.log(`map_layers.${a.layer} registered -> ${row.source_ref}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(e => { console.error(e.message); process.exit(1); });
}
