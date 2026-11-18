import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitAffine, applyAffine, acceptFit, MAX_RMSE_M } from './fit_frame.mjs';

// A known poster -> meters transform: 0.8 m/px, slight rotation, y flipped.
const T = [[0.8, 0.02, -9000], [0.02, -0.8, 8500]];
const grid = [[1000, 1000], [9000, 1200], [3000, 15000], [12000, 18000], [6000, 8000], [500, 19000], [11000, 4000]];

test('recovers an exact affine from 7 noise-free points', () => {
  const pts = grid.map(([u, v], i) => { const [x, y] = applyAffine(T, u, v); return { name: `p${i}`, u, v, x, y }; });
  const fit = fitAffine(pts);
  for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) assert.ok(Math.abs(fit.affine[r][c] - T[r][c]) < 1e-6);
  assert.ok(fit.rmse_m < 1e-6);
  assert.ok(acceptFit(fit));
});

test('reports RMSE and names the worst point; rejects above 75 m', () => {
  const pts = grid.map(([u, v], i) => { const [x, y] = applyAffine(T, u, v); return { name: `p${i}`, u, v, x, y }; });
  pts[4].x += 400; // one badly-placed landmark (central, low leverage)
  const fit = fitAffine(pts);
  assert.equal(fit.worst.name, 'p4');
  assert.ok(fit.rmse_m > MAX_RMSE_M);
  assert.equal(acceptFit(fit), false);
});

test('needs >= 6 points and refuses collinear input', () => {
  assert.throws(() => fitAffine([{ u: 0, v: 0, x: 0, y: 0 }]), /at least 6/);
  const line = [0, 1, 2, 3, 4, 5].map(i => ({ u: i * 100, v: i * 100, x: i, y: i }));
  assert.throws(() => fitAffine(line), /degenerate/);
});
