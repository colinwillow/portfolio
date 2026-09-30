// What Glorb becomes for each section: a 3D point cloud sampled over the same
// placeholder meshes the old swarm used (Zap is his own baked cloud), handed
// to Glorb's own formation system so HIS particles do the forming and turning.
// And a colour per section, so the field changes hue with the shelf.
import * as THREE from '../vendor/three.module.min.js';
import { OBJECTS, fit, sampleSurface, sampleText } from './shapes.js?v=aac1b012';

const KIND = { play: 'controller', assets: 'zap', motion: 'camera', scripts: 'code', writing: 'book',
  web: 'browser', studios: 'studios', workbench: 'tools', audio: 'speaker', about: 'bust' };

const bust = () => {
  const parts = [[new THREE.SphereGeometry(0.52, 24, 18), 0, 0.72], [new THREE.CylinderGeometry(0.2, 0.24, 0.3, 16), 0, 0.12],
    [new THREE.SphereGeometry(0.95, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2.4), 0, -0.72]];
  const arr = [];
  for (const [g, x, y] of parts) { g.translate(x, y, 0); const q = g.index ? g.toNonIndexed() : g; arr.push(...q.attributes.position.array); }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); return out;
};

const cache = new Map();
export async function shapePoints(key, n) {
  const kind = KIND[key];
  if (!kind) return null;
  const id = kind + ':' + n;
  if (cache.has(id)) return cache.get(id);
  let p;
  if (kind === 'zap') {
    const q = new Int16Array(await fetch(new URL('../models/points/zap.bin', import.meta.url)).then(r => r.arrayBuffer()));
    const m = q.length / 3; p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const j = ((i * 7919) % m) * 3; for (let k = 0; k < 3; k++) p[i * 3 + k] = q[j + k] / 8000; }
  } else if (kind === 'code') p = sampleText('</>', n, { width: 2.4, y: 0, depth: 0.5, fitWidth: true });
  else p = sampleSurface(fit(kind === 'bust' ? bust() : OBJECTS[kind](), 2.3, 0), n);
  cache.set(id, p);
  return p;
}

export { sectionColours } from './palette.js?v=8afb0eea';
