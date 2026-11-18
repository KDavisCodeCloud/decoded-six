#!/usr/bin/env node
// Map Phase 2: fit a 2x3 affine transform from a source frame (u, v) -- e.g.
// pixel coordinates on Rockstar's official poster -- into canonical gtadb
// meters (x, y), by least squares over >= 6 control points.
//
//   x = a*u + b*v + c
//   y = d*u + e*v + f
//
// Reports RMSE in meters and the worst point. Rejects the fit (exit 2) when
// RMSE > 75 m. With --save <frame_id> a passing fit is written to map_frames.
//
// Control points file (JSON): [{ "name": "Vice City Stadium", "u": 1234, "v": 5678,
//                               "x": -512.3, "y": 1022.9 }, ...]
//
// Usage:
//   node scripts/fit_frame.mjs points.json [--save official_v1 --name "..." --kind raster]
//   (with --save: set -a; . ./.env.local; set +a)

import fs from 'fs';

export const MIN_POINTS = 6;
export const MAX_RMSE_M = 75;

/** Solve the 3x3 system M p = r by Gaussian elimination with partial pivoting. */
function solve3(M, r) {
  const A = M.map((row, i) => [...row, r[i]]);
  for (let col = 0; col < 3; col++) {
    let piv = col;
    for (let i = col + 1; i < 3; i++) if (Math.abs(A[i][col]) > Math.abs(A[piv][col])) piv = i;
    if (Math.abs(A[piv][col]) < 1e-12) throw new Error('control points are degenerate (collinear or duplicated)');
    [A[col], A[piv]] = [A[piv], A[col]];
    for (let i = 0; i < 3; i++) {
      if (i === col) continue;
      const f = A[i][col] / A[col][col];
      for (let j = col; j < 4; j++) A[i][j] -= f * A[col][j];
    }
  }
  return A.map((row, i) => row[3] / row[i]);
}

/** Apply a 2x3 affine to (u, v). */
export function applyAffine(T, u, v) {
  return [T[0][0] * u + T[0][1] * v + T[0][2], T[1][0] * u + T[1][1] * v + T[1][2]];
}

/**
 * Least-squares affine fit. Coordinates are centred first for numerical
 * stability (poster pixels run to ~20k, meters to ~10k).
 * Returns { affine, rmse_m, worst: {name, error_m}, residuals: [{name, error_m}], scale_m_per_unit }.
 */
export function fitAffine(points, { minPoints = MIN_POINTS } = {}) {
  if (!Array.isArray(points) || points.length < minPoints) {
    throw new Error(`need at least ${minPoints} control points, got ${points?.length ?? 0}`);
  }
  const n = points.length;
  const mu = points.reduce((s, p) => s + p.u, 0) / n;
  const mv = points.reduce((s, p) => s + p.v, 0) / n;
  // normal equations: (P^T P) [a b c'] = P^T x, with P rows [u-mu, v-mv, 1]
  const PtP = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const Ptx = [0, 0, 0];
  const Pty = [0, 0, 0];
  for (const p of points) {
    const row = [p.u - mu, p.v - mv, 1];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) PtP[i][j] += row[i] * row[j];
      Ptx[i] += row[i] * p.x;
      Pty[i] += row[i] * p.y;
    }
  }
  const [a, b, c0] = solve3(PtP, Ptx);
  const [d, e, f0] = solve3(PtP, Pty);
  // un-centre: x = a(u-mu) + b(v-mv) + c0
  const affine = [[a, b, c0 - a * mu - b * mv], [d, e, f0 - d * mu - e * mv]];

  const residuals = points.map(p => {
    const [x, y] = applyAffine(affine, p.u, p.v);
    return { name: p.name ?? `${p.u},${p.v}`, error_m: Math.hypot(x - p.x, y - p.y) };
  });
  const rmse_m = Math.sqrt(residuals.reduce((s, r) => s + r.error_m ** 2, 0) / n);
  const worst = residuals.reduce((w, r) => (r.error_m > w.error_m ? r : w), residuals[0]);
  const scale_m_per_unit = Math.sqrt(Math.abs(a * e - b * d));
  return { affine, rmse_m, worst, residuals, scale_m_per_unit };
}

export function acceptFit(fit, maxRmse = MAX_RMSE_M) {
  return fit.rmse_m <= maxRmse;
}

async function main() {
  const args = process.argv.slice(2);
  const file = args.find(a => !a.startsWith('--') && !['--save', '--name', '--kind'].includes(args[args.indexOf(a) - 1]));
  const opt = k => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
  if (!file) throw new Error('usage: fit_frame.mjs points.json [--save <frame_id> --name "..." --kind raster]');

  const points = JSON.parse(fs.readFileSync(file, 'utf8'));
  const fit = fitAffine(points);
  const ok = acceptFit(fit);
  console.log(JSON.stringify({
    points: points.length,
    rmse_m: +fit.rmse_m.toFixed(2),
    worst: { name: fit.worst.name, error_m: +fit.worst.error_m.toFixed(2) },
    scale_m_per_unit: +fit.scale_m_per_unit.toFixed(5),
    affine: fit.affine,
    verdict: ok ? 'PASS' : `REJECT (RMSE > ${MAX_RMSE_M} m)`,
  }, null, 2));
  if (!ok) process.exit(2);

  const frameId = opt('--save');
  if (!frameId) return;
  const { createClient } = await import('@supabase/supabase-js');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set');
  const sb = createClient(url, key);
  const { error } = await sb.from('map_frames').upsert({
    id: frameId, name: opt('--name') ?? frameId, kind: opt('--kind') ?? 'raster',
    affine: fit.affine, rmse_m: fit.rmse_m, control_points: points, updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`map_frames upsert: ${error.message}`);
  await sb.from('audit_log').insert({
    agent_id: 'map-fit-frame', action: 'map_frame_fitted',
    result: `success: ${frameId} rmse=${fit.rmse_m.toFixed(1)}m n=${points.length} worst=${fit.worst.name}`,
  });
  console.log(`map_frames.${frameId} saved`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(e => { console.error(e.message); process.exit(1); });
}
