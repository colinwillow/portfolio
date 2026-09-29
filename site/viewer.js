// The asset viewer: one character on a turntable, every clip it ships with
// one tap away, and the numbers read off the file in your own browser.
// That last part is the pitch -- a spec sheet you can check, not a claim.

import * as THREE from '../vendor/three.module.min.js';
import { loadCharacter, skinnedBounds, pickClip, play } from './rig.js?v=0090c5af';

function facing(model) {
  const toes = [], v = new THREE.Vector3(), w = new THREE.Vector3(), sum = new THREE.Vector3();
  model.traverse(o => { if (o.isBone && /toe/i.test(o.name) && !/end|top/i.test(o.name) && o.parent?.isBone) toes.push(o); });
  for (const t of toes) { t.getWorldPosition(v); t.parent.getWorldPosition(w); v.sub(w); v.y = 0; if (v.lengthSq() > 1e-10) sum.add(v.normalize()); }
  return sum.lengthSq() > 1e-6 ? sum.normalize() : new THREE.Vector3(0, 0, 1);
}

const pretty = n => n.replace(/[_.]+/g, ' ').replace(/\s+/g, ' ').trim();

export function mountViewer(host, { url, prefer = [] }) {
  host.innerHTML = `
    <div class="viewer-stage"><canvas></canvas>
      <div class="viewer-status">Loading…</div>
      <div class="viewer-hint">drag to turn · pinch or scroll to zoom</div>
    </div>
    <div class="viewer-side">
      <dl class="specs live"></dl>
      <h3 class="sub">Clips</h3>
      <div class="clips" role="listbox" aria-label="Animations"></div>
    </div>`;
  const canvas = host.querySelector('canvas');
  const status = host.querySelector('.viewer-status');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8078, 2.2));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(2, 4, 3); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 1.2); rim.position.set(-3, 2, -3); scene.add(rim);

  // A soft contact disc is what grounds a character; a shadow map is overkill here.
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({
    transparent: true, depthWrite: false, map: (() => {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(0,0,0,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(c);
    })(),
  }));
  disc.rotation.x = -Math.PI / 2; scene.add(disc);

  const turn = new THREE.Group(); scene.add(turn);
  const orbit = { yaw: 0.5, pitch: 0.12, dist: 1, auto: true, target: new THREE.Vector3(), h: 1 };
  let ch = null, dead = false, raf = 0, last = performance.now();

  function size() {
    const r = canvas.parentElement.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / Math.max(1, r.height); camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(size); ro.observe(canvas.parentElement); size();

  // Drag to turn, wheel/pinch to zoom.
  const ptrs = new Map(); let pinch0 = 0, dist0 = 0, touched = false;
  canvas.addEventListener('pointerdown', e => { ptrs.set(e.pointerId, e); canvas.setPointerCapture(e.pointerId); orbit.auto = false; touched = true;
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); dist0 = orbit.dist; } });
  canvas.addEventListener('pointermove', e => {
    const p = ptrs.get(e.pointerId); if (!p) return;
    if (ptrs.size === 1) {
      orbit.yaw -= (e.clientX - p.clientX) * 0.01;
      orbit.pitch = Math.max(-0.3, Math.min(1.1, orbit.pitch + (e.clientY - p.clientY) * 0.006));
    }
    ptrs.set(e.pointerId, e);
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()];
      const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      orbit.dist = Math.max(0.5, Math.min(2.2, dist0 * pinch0 / Math.max(1, d))); }
  });
  const up = e => ptrs.delete(e.pointerId);
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', e => { e.preventDefault(); orbit.dist = Math.max(0.5, Math.min(2.2, orbit.dist * Math.exp(e.deltaY * 0.001))); }, { passive: false });

  function frame(now) {
    if (dead) return;
    raf = requestAnimationFrame(frame);
    if (!host.isConnected) return destroy();
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (orbit.auto) orbit.yaw += dt * 0.35;
    ch?.mixer.update(dt);
    const R = orbit.h * 2.7 * orbit.dist;
    camera.position.set(
      orbit.target.x + Math.sin(orbit.yaw) * Math.cos(orbit.pitch) * R,
      orbit.target.y + Math.sin(orbit.pitch) * R,
      orbit.target.z + Math.cos(orbit.yaw) * Math.cos(orbit.pitch) * R);
    camera.lookAt(orbit.target);
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);

  function destroy() {
    dead = true; cancelAnimationFrame(raf); ro.disconnect();
    scene.traverse(o => { o.geometry?.dispose(); [].concat(o.material || []).forEach(m => { m.map?.dispose(); m.dispose(); }); });
    renderer.dispose();
  }

  loadCharacter(url, p => { status.textContent = `Loading… ${Math.round(p * 100)}%`; }).then(c => {
    if (dead) return;
    ch = c; turn.add(c.model);
    const idle = pickClip(c.clips, ...prefer, 'idle_neutral', 'idle_01', 'standing_idle', 'drunk_idle', 'idle');
    play(c.mixer, idle, { fade: 0 }); c.mixer.update(0.01);
    const box = skinnedBounds(c.model), h = box.max.y - box.min.y;
    c.model.position.y -= box.min.y;                      // soles on the floor
    const cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2;
    c.model.position.x -= cx; c.model.position.z -= cz;
    orbit.h = h; orbit.target.set(0, h * 0.52, 0);
    // Open on his FRONT, three-quarter. Which way a rig faces is measured, not
    // assumed: a foot points forwards, so toe-minus-foot, averaged over both feet
    // (which cancels the splay), is the facing. Fallback is glTF-ish +Z.
    const f = facing(c.model);
    orbit.yaw = Math.atan2(f.x, f.z) + 0.45;
    orbit.auto = false; setTimeout(() => { if (!ptrs.size && !touched) orbit.auto = true; }, 2600);
    disc.scale.setScalar(h * 0.42);
    status.remove();

    const bytes = performance.getEntriesByName(new URL(url, document.baseURI).href)[0]?.encodedBodySize;
    host.querySelector('.specs.live').innerHTML = `
      <dt>Triangles</dt><dd>${c.tris.toLocaleString()}</dd>
      <dt>Joints</dt><dd>${c.joints}</dd>
      <dt>Clips</dt><dd>${c.clips.length}</dd>
      ${bytes ? `<dt>File</dt><dd>${(bytes / 1e6).toFixed(1)} MB</dd>` : ''}
      <dt>Height</dt><dd>${h.toFixed(2)} units</dd>`;
    const list = host.querySelector('.clips');
    list.innerHTML = c.clips.map((cl, i) =>
      `<button role="option" data-i="${i}" aria-selected="${cl === idle}">${pretty(cl.name)}<i>${cl.duration.toFixed(1)}s</i></button>`).join('');
    list.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      list.querySelectorAll('[aria-selected="true"]').forEach(x => x.setAttribute('aria-selected', 'false'));
      b.setAttribute('aria-selected', 'true');
      play(c.mixer, c.clips[+b.dataset.i], { fade: 0.25 });
    });
  }).catch(err => {
    console.warn('viewer', err);
    status.textContent = 'Could not load this model.';
  });

  return { destroy };
}
