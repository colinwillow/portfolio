// Point clouds for the swarm to become. Every shape is just a list of points --
// sampled off a mesh's SURFACE (area-weighted, so a big face gets more points
// than a small one), off a rigged character in pose, or off text drawn on a
// canvas. Each procedural shape also returns its mesh, which the lab fades in
// as a hologram once the particles have settled into it.

import * as THREE from '../vendor/three.module.min.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';

/** `n` points spread over a geometry's surface, weighted by triangle area. */
export function sampleSurface(geo, n, out = new Float32Array(n * 3), off = 0) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const p = g.attributes.position.array, tris = p.length / 9;
  const cum = new Float32Array(tris);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  let total = 0;
  for (let t = 0; t < tris; t++) {
    a.fromArray(p, t * 9); b.fromArray(p, t * 9 + 3); c.fromArray(p, t * 9 + 6);
    total += b.sub(a).cross(c.sub(a)).length() / 2; cum[t] = total;
  }
  for (let i = 0; i < n; i++) {
    const r = Math.random() * total;
    let lo = 0, hi = tris - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < r) lo = m + 1; else hi = m; }
    let u = Math.random(), v = Math.random(); if (u + v > 1) { u = 1 - u; v = 1 - v; }
    const k = lo * 9, o = (off + i) * 3;
    for (let j = 0; j < 3; j++) out[o + j] = p[k + j] + u * (p[k + 3 + j] - p[k + j]) + v * (p[k + 6 + j] - p[k + j]);
  }
  return out;
}

/** `n` points filling the letters of `text`, laid flat across `width` world units at height `y`. */
export function sampleText(text, n, { width = 3, y = -1.55, depth = 0.06, weight = 800, fitWidth = false } = {}, out = new Float32Array(n * 3), off = 0) {
  const W = 1024, H = 200, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  let size = 150;
  g.font = `${weight} ${size}px "Inter Tight", system-ui, sans-serif`;
  const tw = g.measureText(text).width;
  if (tw > W * 0.92) size *= W * 0.92 / tw;
  g.font = `${weight} ${size}px "Inter Tight", system-ui, sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff';
  g.fillText(text, W / 2, H / 2);
  const d = g.getImageData(0, 0, W, H).data, hits = [];
  for (let yy = 0; yy < H; yy += 2) for (let xx = 0; xx < W; xx += 2) if (d[(yy * W + xx) * 4 + 3] > 140) hits.push(xx, yy);
  // fitWidth: `width` is the width of the INK, not of the canvas -- for a glyph used as a shape
  const s = fitWidth ? width / Math.min(W, g.measureText(text).width) : width / W;
  for (let i = 0; i < n; i++) {
    const h = ((Math.random() * hits.length / 2) | 0) * 2, o = (off + i) * 3;
    out[o] = (hits[h] - W / 2 + Math.random() * 2) * s;
    out[o + 1] = y - (hits[h + 1] - H / 2 + Math.random() * 2) * s;
    out[o + 2] = (Math.random() - 0.5) * depth;
  }
  return out;
}

// --- procedural objects (unit-ish, centred) -------------------------------------
const box = (w, h, d, x = 0, y = 0, z = 0, r = [0, 0, 0]) => {
  const g = new THREE.BoxGeometry(w, h, d, 2, 2, 2); g.rotateX(r[0]); g.rotateY(r[1]); g.rotateZ(r[2]); g.translate(x, y, z); return g;
};
const cyl = (rt, rb, h, x = 0, y = 0, z = 0, r = [0, 0, 0], seg = 28) => {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg); g.rotateX(r[0]); g.rotateY(r[1]); g.rotateZ(r[2]); g.translate(x, y, z); return g;
};
const cap = (rad, len, x, y, z, r) => {
  const g = new THREE.CapsuleGeometry(rad, len, 6, 16); g.rotateX(r[0]); g.rotateY(r[1]); g.rotateZ(r[2]); g.translate(x, y, z); return g;
};
const merge = gs => mergeGeometries(gs.map(g => { g.deleteAttribute('uv'); return g.index ? g.toNonIndexed() : g; }));

export const OBJECTS = {
  // Play: a game controller
  controller: () => merge([
    box(1.9, 0.62, 0.42, 0, 0.05, 0),
    cap(0.32, 0.55, -0.82, -0.28, 0, [0, 0, 0.55]), cap(0.32, 0.55, 0.82, -0.28, 0, [0, 0, -0.55]),
    box(0.42, 0.13, 0.1, -0.55, 0.12, 0.24), box(0.13, 0.42, 0.1, -0.55, 0.12, 0.24),
    ...[[0.5, 0.26], [0.72, 0.1], [0.5, -0.06], [0.28, 0.1]].map(([x, y]) => cyl(0.085, 0.085, 0.1, x, y, 0.24, [Math.PI / 2, 0, 0], 16)),
    cyl(0.15, 0.17, 0.12, -0.28, -0.22, 0.24, [Math.PI / 2, 0, 0]), cyl(0.15, 0.17, 0.12, 0.28, -0.22, 0.24, [Math.PI / 2, 0, 0]),
  ]),
  // Motion: a film camera with two reels
  camera: () => merge([
    box(1.3, 0.8, 0.55, 0, -0.25, 0),
    cyl(0.4, 0.4, 0.14, -0.35, 0.55, 0, [Math.PI / 2, 0, 0]), cyl(0.4, 0.4, 0.14, 0.42, 0.55, 0, [Math.PI / 2, 0, 0]),
    cyl(0.2, 0.28, 0.6, 0.95, -0.25, 0, [0, 0, Math.PI / 2]),
    box(0.35, 0.3, 0.3, -0.6, -0.8, 0), box(0.1, 0.5, 0.1, -0.6, -1.1, 0),
  ]),
  // Writing: an open book
  book: () => merge([
    box(1.05, 0.05, 1.4, -0.52, 0, 0, [0, 0, 0.18]), box(1.05, 0.05, 1.4, 0.52, 0, 0, [0, 0, -0.18]),
    ...Array.from({ length: 5 }, (_, i) => box(0.98, 0.012, 1.32, -0.5, 0.05 + i * 0.022, 0, [0, 0, 0.18 - i * 0.02])),
    ...Array.from({ length: 5 }, (_, i) => box(0.98, 0.012, 1.32, 0.5, 0.05 + i * 0.022, 0, [0, 0, -0.18 + i * 0.02])),
  ]).rotateX(0.95),
  // Web: a browser window
  browser: () => merge([
    box(2.2, 1.45, 0.06, 0, 0, 0), box(2.2, 0.16, 0.1, 0, 0.66, 0.03),
    box(1.3, 0.07, 0.12, 0.2, 0.66, 0.06),
    box(1.9, 0.4, 0.1, 0, 0.3, 0.05), box(0.58, 0.55, 0.1, -0.66, -0.25, 0.05), box(0.58, 0.55, 0.1, 0, -0.25, 0.05), box(0.58, 0.55, 0.1, 0.66, -0.25, 0.05),
  ]),
  // Workbench: a paintbrush and a pencil, crossed
  tools: () => merge([
    cyl(0.07, 0.09, 1.9, -0.1, 0, 0, [0, 0, 0.55]), cyl(0.16, 0.07, 0.4, -0.72, 1.0, 0, [0, 0, 0.55], 20),
    cyl(0.07, 0.07, 1.7, 0.1, 0, 0.1, [0, 0, -0.55], 6), cyl(0.0, 0.07, 0.28, 0.62, 0.84, 0.1, [0, 0, -0.55], 6),
  ]),
  // Studios: three blocks, a small skyline
  studios: () => merge([box(0.55, 1.5, 0.55, -0.7, 0.1, 0), box(0.6, 2.1, 0.6, 0, 0.4, -0.1), box(0.5, 1.1, 0.5, 0.7, -0.1, 0.1)]),
};

/** Scale and centre a geometry so its largest extent is `size`, lifted by `lift`. */
export function fit(geo, size = 2.2, lift = 0.25) {
  geo.computeBoundingBox();
  const b = geo.boundingBox, c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3());
  const k = size / Math.max(s.x, s.y, s.z);
  geo.translate(-c.x, -c.y, -c.z); geo.scale(k, k, k); geo.translate(0, lift, 0);
  geo.userData.fit = { k, c, lift };   // so a model can be placed exactly where its points are
  return geo;
}

/** Points on a posed, skinned character (what the bones actually drew). */
export function sampleSkinned(model, n, size = 2.3, lift = 0.25) {
  model.updateMatrixWorld(true);
  const meshes = [], v = new THREE.Vector3();
  model.traverse(o => { if (o.isSkinnedMesh) meshes.push(o); });
  // bake each mesh's current pose into a plain geometry, then sample that
  const geos = meshes.map(m => {
    const src = m.geometry, pos = src.attributes.position, arr = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); m.applyBoneTransform(i, v); v.applyMatrix4(m.matrixWorld); v.toArray(arr, i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(arr, 3)); if (src.index) g.setIndex(src.index);
    return g.index ? g.toNonIndexed() : g;
  });
  const geo = fit(mergeGeometries(geos), size, lift);
  return { points: sampleSurface(geo, n), bounds: geo };
}
