// THE CHARACTERS BACKDROP: everyone standing in a line in front of Glorb, each
// playing an idle, on the strip's top edge as their floor. Drag along the line to
// walk the camera past them; tap one (or its thumbnail below) and the camera
// glides to centre them, they light up and the rest dim back.
//
// Ten skinned characters is a lot for a phone, so:
//   * they load one at a time from the middle of the line outward, and appear as
//     they land -- the first one is up in a second, nobody waits for the last;
//   * every texture is drawn down to 512 px before it ever reaches the GPU. A 2K
//     map is ~22 MB resident and the line-up is ten of them; at 512 it is ~1.4
//     each, and from where the camera stands nobody can tell;
//   * it only renders while the Characters page is showing and on screen.
import * as THREE from '../vendor/three.module.min.js';
import { loadCharacter, skinnedBounds, pickClip, play } from './rig.js?v=0090c5af';

export const LINE = { gap: 1.05, stagger: 0.35, tall: 0.4, tex: 512, dim: 0.32, fov: 30 };

function shrinkTextures(model) {
  const done = new Set();
  model.traverse(o => {
    if (!o.isMesh) return;
    for (const m of [].concat(o.material)) for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap']) {
      const t = m[k]; if (!t || done.has(t) || !t.image) continue; done.add(t);
      const im = t.image, w = im.width || 0, h = im.height || 0;
      if (Math.max(w, h) <= LINE.tex) continue;
      const k2 = LINE.tex / Math.max(w, h), c = document.createElement('canvas');
      c.width = Math.round(w * k2); c.height = Math.round(h * k2);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      im.close?.();
      t.image = c; t.needsUpdate = true;
    }
  });
}

export function createLineup(host, chars, { onPick = () => {} } = {}) {
  const cv = document.createElement('canvas');
  cv.className = 'lineup off'; host.appendChild(cv);
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
  const dpr = Math.min(devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(LINE.fov, 1, 0.1, 60);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x3a2a4a, 2.1));
  const key = new THREE.DirectionalLight(0xffffff, 1.9); key.position.set(2, 4, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xb06bff, 2.2); rim.position.set(-3, 3, -4); scene.add(rim);     // Glorb's violet from behind
  const rim2 = new THREE.DirectionalLight(0x7dff6a, 0.9); rim2.position.set(4, 2, -3); scene.add(rim2);

  // where each one stands: a line along X, centred, every other one a step back
  const mid = (chars.length - 1) / 2;
  const slots = chars.map((c, i) => ({ c, i, x: (i - mid) * LINE.gap * (c.h < 1.2 ? 0.8 : 1), z: (i % 2 ? -LINE.stagger : 0),
    group: new THREE.Group(), mixer: null, mats: [], lit: 1, loaded: false }));
  slots.forEach(s => { s.group.position.set(s.x, 0, s.z); scene.add(s.group); });
  const S = { on: false, started: false, sel: null, camX: 0, wantX: 0, ground: 0, last: 0, paused: false, drag: null };

  async function loadAll() {
    // the middle of the line first, then outward, so the screen fills from the centre
    const order = [...slots].sort((a, b) => Math.abs(a.i - mid) - Math.abs(b.i - mid));
    for (const s of order) {
      try {
        const ch = await loadCharacter(new URL('../' + s.c.glb, import.meta.url).href);
        shrinkTextures(ch.model);
        const idle = pickClip(ch.clips, ...(s.c.prefer || []), 'idle');
        const a = play(ch.mixer, idle, { fade: 0 });
        if (a && idle) a.time = Math.random() * idle.duration;     // nobody in step with anybody
        ch.mixer.update(0.01);
        const box = skinnedBounds(ch.model), tall = box.max.y - box.min.y || 1, k = (s.c.h || 1.75) / tall;
        ch.model.scale.setScalar(k);
        ch.model.position.set(-(box.min.x + box.max.x) / 2 * k, -box.min.y * k, -(box.min.z + box.max.z) / 2 * k);
        ch.model.rotation.y = (Math.random() - 0.5) * 0.5;          // a little turned, as people stand
        ch.model.traverse(o => { if (o.isMesh) for (const m of [].concat(o.material)) if (m.color) s.mats.push({ m, base: m.color.clone() }); });
        s.group.add(ch.model); s.mixer = ch.mixer; s.loaded = true;
        s.group.scale.setScalar(0.001); s.pop = 0;                   // grows in
      } catch (e) { console.warn('line-up', s.c.slug, e); }
    }
  }

  // The canvas is only as tall as the band above the strip -- nothing below it is ever
  // seen, so rendering it would be wasted fill (and a full-screen WebGL layer over
  // Glorb's full-screen canvas did not composite at all in headless Chromium).
  function resize() {
    const w = host.clientWidth, h = Math.max(60, Math.round(S.ground || host.clientHeight * 0.55));
    if (cv.style.height !== h + 'px') cv.style.height = h + 'px';
    if (cv.width === Math.round(w * dpr) && cv.height === Math.round(h * dpr)) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }

  // the camera stands back far enough that a 1.8 m person is `tall` of the room above the strip,
  // and is raised or lowered so the floor (y = 0) lands exactly on the strip's top edge
  function frameCamera() {
    const H = cv.clientHeight || 1, g = H - 2, t = Math.tan(LINE.fov * Math.PI / 360);
    const D = (H * 1.8) / (LINE.tall * g * 2 * t);
    const ppm = H / (2 * D * t), y = 1.0 + (g - H / 2 - ppm) / ppm;
    camera.position.set(S.camX, y, D); camera.lookAt(S.camX, y, 0);
    return ppm;
  }

  const clock = new THREE.Clock();
  function frame(now) {
    requestAnimationFrame(frame);
    if (!S.on || S.paused || document.hidden) { clock.getDelta(); return; }
    const dt = Math.min(0.05, clock.getDelta());
    resize();
    if (!S.drag) S.camX += (S.wantX - S.camX) * (1 - Math.exp(-5 * dt));
    frameCamera();
    for (const s of slots) {
      if (!s.loaded) continue;
      s.mixer.update(dt);
      if (s.pop < 1) { s.pop = Math.min(1, s.pop + dt * 2.2); const e = 1 - Math.pow(1 - s.pop, 3); s.group.scale.setScalar(Math.max(0.001, e)); }
      const want = !S.sel || S.sel === s.c.slug ? 1 : LINE.dim;
      s.lit += (want - s.lit) * (1 - Math.exp(-6 * dt));
      for (const { m, base } of s.mats) m.color.copy(base).multiplyScalar(s.lit);
    }
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  // drag to walk the line; a tap picks whoever is under the thumb
  const span = () => (slots.length - 1) / 2 * LINE.gap;
  cv.addEventListener('pointerdown', e => { S.drag = { x: e.clientX, camX: S.camX, moved: 0 }; });
  addEventListener('pointermove', e => {
    if (!S.drag) return;
    const dx = e.clientX - S.drag.x; S.drag.moved = Math.max(S.drag.moved, Math.abs(dx));
    const ppm = frameCamera();
    S.camX = S.wantX = Math.max(-span(), Math.min(span(), S.drag.camX - dx / ppm));
  });
  addEventListener('pointerup', e => {
    if (!S.drag) return;
    const tap = S.drag.moved < 8; S.drag = null;
    if (!tap) return;
    const r = cv.getBoundingClientRect(), v = new THREE.Vector3();
    let best = null, bd = 1e9;
    for (const s of slots) {
      if (!s.loaded) continue;
      v.set(s.x, (s.c.h || 1.75) * 0.5, s.z).project(camera);
      const sx = (v.x + 1) / 2 * r.width + r.left, sy = (1 - v.y) / 2 * r.height + r.top;
      const d = Math.hypot(sx - e.clientX, (sy - e.clientY) * 0.4);
      if (d < bd) { bd = d; best = s; }
    }
    if (best && bd < 90) { api.focus(best.c.slug); onPick(best.c.slug); }
  });

  const api = {
    canvas: cv,
    visible(v) {
      S.on = !!v; cv.classList.toggle('off', !v);
      if (v && !S.started) { S.started = true; loadAll(); }
    },
    /** centre the camera on one character, light them and dim the rest (null: everyone lit) */
    focus(slug) {
      S.sel = slug || null;
      const s = slots.find(s => s.c.slug === slug);
      if (s) S.wantX = s.x;
    },
    /** the strip's top edge in CSS px from the top of the host: their floor */
    ground(y) { S.ground = y; },
    pause(p) { S.paused = !!p; },
    LINE, _slots: slots, _camera: camera, _S: S, _renderer: renderer, _scene: scene,
  };
  return api;
}
