// The swarm as the site's stage -- the same interface as globe.js, so app.js
// does not care which one is running (`?globe` brings the globe back).
//
// Home: it is an orb behind the name. Walking down the aisle it becomes each
// shelf's thing as that shelf reaches the middle of the screen, dimmed so the
// shelves stay the thing you read. On a section page it sits in the top band
// as that section's shape.

import * as THREE from '../vendor/three.module.min.js';
import { createSwarm } from './swarm.js?v=a192b303';
import { OBJECTS, fit, sampleSurface, sampleText } from './shapes.js?v=aac1b012';

const SHAPE = { home: 'orb', play: 'controller', assets: 'zap', motion: 'camera', scripts: 'code',
  writing: 'book', web: 'browser', studios: 'studios', workbench: 'tools', audio: 'speaker', about: 'orb' };

export function createStage({ canvas }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  const rig = new THREE.Group(); scene.add(rig);
  const phone = innerWidth * innerHeight < 600000;
  const N = phone ? 9000 : 16000;
  const swarm = createSwarm(renderer, N);
  rig.add(swarm.points);

  const cache = new Map();
  let zapPts = null;
  fetch(new URL('../models/points/zap.bin', import.meta.url)).then(r => r.arrayBuffer()).then(buf => {
    const q = new Int16Array(buf), n = q.length / 3, out = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { const j = ((i * 7919) % n) * 3; out[i * 3] = q[j] / 8000; out[i * 3 + 1] = q[j + 1] / 8000; out[i * 3 + 2] = q[j + 2] / 8000; }
    zapPts = out;
    if (SHAPE[st.key] === 'zap') show(st.key, true);
  }).catch(() => {});

  function points(shape) {
    if (cache.has(shape)) return cache.get(shape);
    let p;
    if (shape === 'orb') {
      p = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        const u = Math.random() * 2 - 1, th = Math.random() * 6.2832, r = 1.25 + (Math.random() - 0.5) * 0.12, s = Math.sqrt(1 - u * u);
        p[i * 3] = Math.cos(th) * s * r; p[i * 3 + 1] = u * r; p[i * 3 + 2] = Math.sin(th) * s * r;
      }
    } else if (shape === 'code') p = sampleText('</>', N, { width: 2.4, y: 0, depth: 0.5, fitWidth: true });
    else if (shape === 'zap') { if (!zapPts) return points('orb'); p = zapPts; }
    else p = sampleSurface(fit(OBJECTS[shape](), 2.3, 0), N);
    cache.set(shape, p);
    return p;
  }

  const st = { mode: 'home', key: null, y: 0, s: 1, x: 0, tY: 0, tS: 1, tX: 0, hush: 0, tHush: 0, level: 0, shown: null };
  let visH = 1, visW = 1;
  function layout() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.position.set(0, 0, 7); camera.updateProjectionMatrix(); swarm.resize(w, h);
    visH = 2 * 7 * Math.tan(THREE.MathUtils.degToRad(20)); visW = visH * camera.aspect;
    const fitS = f => Math.min(visH * f, visW * 0.8) / 2.6;
    if (st.mode === 'home') { st.tS = fitS(0.5); st.tY = visH * 0.08; st.tX = 0; st.tHush = 0; }
    else if (st.mode === 'aisle') {
      // wide screens: stand to the right of the shelves; phones: behind them, dimmer
      const wide = camera.aspect > 1.2;
      st.tS = fitS(wide ? 0.5 : 0.42); st.tY = 0; st.tX = wide ? visW * 0.31 : 0; st.tHush = wide ? 0.35 : 0.86;
    } else { const band = visH * 0.38; st.tS = Math.min(band * 0.7, visW * 0.5) / 2.6; st.tY = visH / 2 - band / 2; st.tX = 0; st.tHush = 0; }
  }
  function show(key, force) {
    const shape = SHAPE[key || 'home'] || 'orb';
    if (!force && st.shown === shape && !(shape === 'zap' && !zapPts)) return;
    const p = points(shape);
    if (!st.started) { swarm.set(p); st.started = true; } else swarm.morph(p, 1.5);
    st.shown = shape === 'zap' && !zapPts ? 'orb' : shape;
  }
  function setMode(mode, key) { st.mode = mode; st.key = key || null; layout(); show(key || (mode === 'home' ? 'home' : null)); }

  function applyTheme() {
    const dark = document.documentElement.dataset.theme === 'dark';
    swarm.points.material.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending;
    swarm.points.material.needsUpdate = true;
  }

  let last = performance.now(), running = false;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000), t = now / 1000; last = now;
    swarm.step(dt, t);
    const k = 1 - Math.exp(-3.5 * dt);
    st.y += (st.tY - st.y) * k; st.s += (st.tS - st.s) * k; st.x += (st.tX - st.x) * k; st.hush += (st.tHush - st.hush) * k;
    rig.position.set(st.x, st.y, 0); rig.scale.setScalar(st.s);
    rig.rotation.y = t * 0.18 + Math.sin(t * 0.4) * 0.2; rig.rotation.x = Math.sin(t * 0.23) * 0.08;
    if (st.shown !== 'orb' && st.shown !== 'zap') rig.rotation.y = Math.sin(t * 0.3) * 0.45;   // objects sway, the orb spins
    swarm.uniforms.uHush.value = st.hush; swarm.uniforms.uLevel.value = st.level;
    renderer.render(scene, camera);
  }
  const start = () => { if (!running) { running = true; last = performance.now(); renderer.setAnimationLoop(frame); } };
  document.addEventListener('visibilitychange', () => { if (document.hidden) { running = false; renderer.setAnimationLoop(null); } else start(); });
  addEventListener('resize', layout);
  addEventListener('pointermove', e => { swarm.uniforms.uPtr.value.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight * 2 - 1)); swarm.uniforms.uPtrOn.value = 1; }, { passive: true });
  addEventListener('pointerleave', () => { swarm.uniforms.uPtrOn.value = 0; });
  new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  applyTheme(); layout(); st.s = st.tS; st.y = st.tY; start();

  return {
    setMode,
    pulse(v = 1) { swarm.uniforms.uBlast.value = 0; },
    setLevel(v) { st.level = v; },
    setColors({ ink, accent }) { swarm.uniforms.uInk.value.set(ink); swarm.uniforms.uAccent.value.set(accent); },
  };
}
