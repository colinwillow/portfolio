// The silhouettes Glorb makes for each section. He takes flat points and draws
// them inside his own ring, so these only have to read FRONT ON: every shape is
// the same mesh the old swarm used, turned a little so it is not a flat plate,
// and sampled over its surface. Zap is his own baked point cloud.
import * as THREE from '../vendor/three.module.min.js';
import { OBJECTS, fit, sampleSurface, sampleText } from './shapes.js?v=aac1b012';

const N = 1400;
const KIND = { play: 'controller', assets: 'zap', motion: 'camera', scripts: 'code', writing: 'book',
  web: 'browser', studios: 'studios', workbench: 'tools', audio: 'speaker', about: 'bust' };
const TURN = { controller: [0.35, -0.3], camera: [0.1, -0.5], book: [-0.5, 0], browser: [0.1, -0.25],
  studios: [0.15, -0.45], tools: [0, 0], speaker: [0.1, -0.4], bust: [0, 0.3] };

const bust = () => {
  const m = (g, x, y, z) => { g.deleteAttribute('uv'); g.translate(x, y, z); return g.index ? g.toNonIndexed() : g; };
  const g = [m(new THREE.SphereGeometry(0.52, 24, 18), 0, 0.72, 0),
             m(new THREE.CylinderGeometry(0.2, 0.24, 0.3, 16), 0, 0.12, 0),
             m(new THREE.SphereGeometry(0.95, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2.4), 0, -0.72, 0)];
  const out = new THREE.BufferGeometry(), arr = [];
  for (const q of g) arr.push(...q.attributes.position.array);
  out.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
  return out;
};

let zap = null;
const zapReady = fetch(new URL('../models/points/zap.bin', import.meta.url)).then(r => r.arrayBuffer()).then(buf => {
  const q = new Int16Array(buf), n = q.length / 3, out = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { const j = ((i * 7919) % n) * 3; for (let k = 0; k < 3; k++) out[i * 3 + k] = q[j + k] / 8000; }
  zap = out;
}).catch(() => {});

const cache = new Map();
export async function glorbPoints(key) {
  const kind = KIND[key];
  if (!kind) return null;
  if (cache.has(kind)) return cache.get(kind);
  let p;
  if (kind === 'zap') { await zapReady; p = zap; }
  else if (kind === 'code') p = sampleText('</>', N, { width: 2.4, y: 0, depth: 0.05, fitWidth: true });
  else {
    const geo = kind === 'bust' ? bust() : OBJECTS[kind]();
    const [rx, ry] = TURN[kind] || [0, 0];
    geo.rotateY(ry); geo.rotateX(rx);
    p = sampleSurface(fit(geo, 2.3, 0), N);
  }
  if (p) cache.set(kind, p);
  return p;
}
