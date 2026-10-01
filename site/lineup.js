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
import { loadCharacter, skinnedBounds, pickClip, play } from './rig.js?v=222cfe45';

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

export function createLineup(host, chars, { onPick = () => {}, colin = null } = {}) {
  const cv = document.createElement('canvas');
  cv.className = 'lineup off'; document.body.appendChild(cv);   // above the strip, so their feet stand on its top face
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
  const dpr = Math.min(devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(LINE.fov, 1, 0.1, 60);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x3a2a4a, 2.1));
  const key = new THREE.DirectionalLight(0xffffff, 1.9); key.position.set(2, 4, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xb06bff, 2.2); rim.position.set(-3, 3, -4); scene.add(rim);     // Glorb's violet from behind
  scene.fog = new THREE.Fog(0x0e0e0f, 18, 26);                      // the mist they walk out of
  const rim2 = new THREE.DirectionalLight(0x7dff6a, 0.9); rim2.position.set(4, 2, -3); scene.add(rim2);

  // Everyone is a little agent: where they are (x, z), where they are going (tx, tz),
  // their own walking speed, and which way they face. Picking someone reorders the
  // line -- they walk to the middle and step forward, the rest walk aside -- and a
  // spacing rule keeps anyone from walking through anyone.
  const hash = k => { let h = 2166136261; for (let i = 0; i < k.length; i++) h = Math.imul(h ^ k.charCodeAt(i), 16777619); return ((h >>> 0) % 10000) / 10000; };
  // ASSIGNED SEATS: the order they are handed in is the order they stand, centred on
  // Colin (who is already here). Anyone left of him comes in from the left, anyone
  // right of him from the right, the ones nearest him first -- so nobody ever has to
  // get past anybody, and there is nothing to get caught on.
  const home = Math.max(0, chars.findIndex(c => c.colin));
  const slots = chars.map((c, i) => ({ c, i, x: 0, z: 0, y: 0, vy: 0, tx: 0, tz: 0, yaw: 0, rest: (hash(c.slug) - 0.5) * 0.5,
    spd: 1.15 + 0.55 * hash(c.slug + 'v'), run: 3.0 + 0.8 * hash(c.slug + 'r'), how: c.colin ? 'here' : i < home ? 'left' : 'right',
    rank: Math.abs(i - home), delay: 0, state: 'wait',
    group: new THREE.Group(), mixer: null, clips: {}, cur: null, mats: [], lit: 1, loaded: false }));
  slots.forEach(s => { s.group.visible = false; scene.add(s.group); });
  const S = { fling: 0, below: 14, shift: 0, restH: 0, exitUntil: 0, on: false, started: false, sel: null, camX: 0, wantX: 0, ground: 0, last: 0, paused: false, drag: null };
  const span = () => Math.max(home, slots.length - 1 - home) * LINE.gap;

  // where everyone should be: the line in `order`, every other one a step back, the picked one forward
  // the line keeps its order; picking someone slides the WHOLE line so they stand in the
  // middle -- everyone walks the same way the same distance, so nobody crosses anybody
  function layout() {
    slots.forEach((s, k) => { s.tx = (k - home - S.shift) * LINE.gap; s.tz = S.sel === s.c.slug ? 0.5 : (k % 2 ? -LINE.stagger : 0); });
  }
  layout();

  function clip(s, name) {
    if (s.ghost) return;
    const c = s.clips[name] || s.clips.idle; if (!c || s.cur === c) return; s.cur = c;
    play(s.mixer, c, { fade: 0.25 });
  }
  const off = s => (s.how === 'left' ? -1 : 1) * (span() + 3);       // just past the edge of the frame, on their side
  // offstage, waiting for their turn (`delay` seconds)
  function stageLeft(s, delay) {
    s.delay = delay; s.y = 0; s.z = s.tz; s.state = s.how === 'here' ? 'idle' : 'wait';
    s.x = s.how === 'here' ? s.tx : off(s); s.yaw = s.how === 'here' ? s.rest : (s.how === 'left' ? 1 : -1) * Math.PI / 2;
    s.group.visible = false; s.grow0 = 0;
    if (s.how === 'here') { s.x = s.tx; s.state = 'idle'; colin?.joined?.(true); }
  }
  // COLIN'S SEAT IS EMPTY ON PURPOSE. There is only ever one Colin -- the hero on the page --
  // so the line keeps a seat for him and says, every frame, where on screen it is and how
  // big a man standing in it would be (`colin.place`). He stands there; it is as if they
  // were all in the one canvas.
  async function loadAll() {
    // the middle of the line first, then outward, so the screen fills from the centre
    const mid = (slots.length - 1) / 2;
    const seq = [...slots].sort((a, b) => Math.abs(a.i - mid) - Math.abs(b.i - mid));
    for (const s of seq) {
      if (S.dead) return;
      if (s.c.colin) { s.ghost = true; s.loaded = true; s.mixer = { update() {} }; stageLeft(s, 0); continue; }
      try {
        const ch = await loadCharacter(new URL('../' + s.c.glb, import.meta.url).href, null, { anim: s.c.anim && new URL('../' + s.c.anim, import.meta.url).href });
        if (s.c.colin) {                                           // Colin's own file: donor heads out, his face shape on
          const loose = []; let sk = 0; ch.model.traverse(o => { if (o.isSkinnedMesh) sk++; else if (o.isMesh) loose.push(o); });
          if (sk) loose.forEach(o => o.removeFromParent());
          let headMat = null; ch.model.traverse(o => { if (o.isMesh && /head/i.test(o.name) && o.material.map) headMat = o.material; });
          ch.model.traverse(o => { if (o.isMesh && /teeth/i.test(o.name) && !o.material.map && headMat) o.material = headMat;
            if (o.isMesh && o.morphTargetDictionary) for (const [n, k] of Object.entries(o.morphTargetDictionary)) if (/colin.?head/i.test(n)) o.morphTargetInfluences[k] = 1; });
        }
        shrinkTextures(ch.model);
        const has = re => ch.clips.find(c => re.test(c.name));
        s.clips = { idle: pickClip(ch.clips, ...(s.c.prefer || []), 'idle'),
          run: has(/^run_fwd$|run_fwd|^running$|^run$|drunk_run_forward/i),
          walk: has(/walk_fwd_neutral|^walk_fwd|^walking$|^walk$|walk/i),
          air: has(/floating|in_air|falling_idle|jump_going_up|air|fall/i),
          land: has(/landing_soft|^landing$|landing|hard_landing/i) };
        s.mixer = ch.mixer; s.cur = null; clip(s, 'idle'); ch.mixer.update(0.01);
        const a = ch.mixer.existingAction(s.clips.idle); if (a) a.time = Math.random() * s.clips.idle.duration;   // out of step
        const box = skinnedBounds(ch.model), tall = box.max.y - box.min.y || 1, k = (s.c.h || 1.75) / tall;
        ch.model.scale.setScalar(k);
        ch.model.position.set(-(box.min.x + box.max.x) / 2 * k, -box.min.y * k, -(box.min.z + box.max.z) / 2 * k);
        ch.model.traverse(o => { if (o.isMesh) for (const m of [].concat(o.material)) if (m.color) s.mats.push({ m, base: m.color.clone() }); });
        s.group.add(ch.model); s.loaded = true;
        stageLeft(s, 0.1);
      } catch (e) { console.warn('line-up', s.c.slug, e); }
    }
  }

  function step(s, dt) {
    if (s.state === 'wait') {
      s.delay -= dt; if (s.delay > 0) return;
      s.state = 'enter'; s.group.visible = true; clip(s, s.clips.run && !s.walkIn ? 'run' : 'walk');
    }
    if (s.state === 'enter' || s.state === 'exit') {                // running in to their seat, or out past the edge
      const to = s.state === 'exit' ? s.exitX : s.tx, dx = to - s.x, v = s.walkIn ? 1.4 : s.clips.run ? s.run : s.spd * 1.3;
      s.wantYaw = Math.sign(dx || 1) * Math.PI / 2;
      if (Math.abs(dx) < 0.5 && s.state === 'enter') { s.state = 'walk'; s.walkIn = false; clip(s, 'walk'); }
      else s.x += Math.sign(dx) * Math.min(Math.abs(dx), v * dt);
      if (s.state === 'exit' && Math.abs(dx) < 0.05) s.group.visible = false;
      let dy = s.wantYaw - s.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); s.yaw += dy * (1 - Math.exp(-10 * dt));
      return;
    }
    if (s.state === 'fall') {
      s.vy -= 14 * dt; s.y += s.vy * dt;
      if (s.y <= 0) { s.y = 0; s.vy = 0; s.state = 'land'; s.landT = 0.5; clip(s, s.clips.land ? 'land' : 'idle'); }
    } else if (s.state === 'land') {
      s.landT -= dt; if (s.landT <= 0) s.state = 'idle';
    } else {
      const dx = s.tx - s.x, dz = s.tz - s.z, d = Math.hypot(dx, dz);
      if (d > 0.06) {
        if (s.state !== 'walk') { s.state = 'walk'; clip(s, 'walk'); }
        const v = Math.min(d * 3, d > 1.6 && s.clips.run ? 2.6 : 1.4);   // one pace for everyone, so the line moves as a line
        if (d > 1.6 && s.clips.run && s.cur !== s.clips.run) clip(s, 'run'); else if (d <= 1.6 && s.cur === s.clips.run) clip(s, 'walk');
        s.x += dx / d * v * dt; s.z += dz / d * v * dt;
        s.wantYaw = Math.atan2(dx, dz);
      } else {
        if (s.state !== 'idle') { s.state = 'idle'; clip(s, 'idle'); }
        s.wantYaw = s.rest;                                          // back to (nearly) facing us
      }
      let dy = (s.wantYaw ?? 0) - s.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      s.yaw += dy * (1 - Math.exp(-8 * dt));
    }
  }
  // nobody walks through anybody: anyone closer than a body width is nudged apart along the line
  function separate() {
    const live = slots.filter(s => s.loaded && s.group.visible && s.state !== 'fall');
    for (let a = 0; a < live.length; a++) for (let b = a + 1; b < live.length; b++) {
      const A = live[a], B = live[b]; if (Math.abs(A.z - B.z) > 0.32) continue;
      const min = 0.3 * ((A.c.h || 1.75) + (B.c.h || 1.75)) / 1.75 + 0.06, d = B.x - A.x;
      if (Math.abs(d) < min) { const push = (min - Math.abs(d)) / 2 * (d >= 0 ? 1 : -1); A.x -= push; B.x += push; }
    }
  }

  // The canvas is only as tall as the band above the strip -- nothing below it is ever
  // seen, so rendering it would be wasted fill (and a full-screen WebGL layer over
  // Glorb's full-screen canvas did not composite at all in headless Chromium).
  function resize() {
    // one size, measured with the page at the top; scrolling SLIDES it up with the strip
    if (!S.restH || scrollY < 2) S.restH = S.ground;
    // and it reaches DOWN past their floor line to the front of the floor (`S.below`), so a
    // foot that dips, or someone stepping forward, is never cut off at the canvas edge
    const w = innerWidth, room = Math.max(60, Math.round(S.restH || host.clientHeight * 0.55)), h = room + S.below;
    if (cv.style.height !== h + 'px') cv.style.height = h + 'px';
    cv.style.transform = `translateY(${Math.round((S.ground || room) - room)}px)`;
    if (cv.width === Math.round(w * dpr) && cv.height === Math.round(h * dpr)) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }

  // the camera stands back far enough that a 1.8 m person is `tall` of the room above the strip,
  // and is raised or lowered so the floor (y = 0) lands exactly on the strip's top edge
  function frameCamera() {
    const H = cv.clientHeight || 1, g = H - S.below - 2, t = Math.tan(LINE.fov * Math.PI / 360);
    const D = (H * 1.8) / (LINE.tall * (H - S.below) * 2 * t);
    const ppm = H / (2 * D * t), y = 1.0 + (g - H / 2 - ppm) / ppm;
    camera.position.set(S.camX, y, D); camera.lookAt(S.camX, y, 0);
    scene.fog.near = D + 1.2; scene.fog.far = D + 7.5;
    return ppm;
  }

  const clock = new THREE.Clock();
  function frame(now) {
    if (S.dead) return;
    requestAnimationFrame(frame);
    if ((!S.on && performance.now() > S.exitUntil) || S.paused || document.hidden) { clock.getDelta(); return; }
    const dt = Math.min(0.05, clock.getDelta());
    resize();
    // THROWN: after a swipe the camera carries on at the speed it was let go, slowing with
    // friction like a flicked scroll; thrown past either end it runs on a little, then eases back
    if (!S.drag && S.fling) {
      S.wantX += S.fling * dt; S.camX = S.wantX;
      const out = S.wantX > span() || S.wantX < -span();
      S.fling *= Math.exp(-(out ? 9 : 2.6) * dt);
      if (Math.abs(S.fling) < 0.04) { S.fling = 0; S.wantX = Math.max(-span(), Math.min(span(), S.wantX)); }
    }
    if (!S.drag) S.camX += (S.wantX - S.camX) * (1 - Math.exp(-5 * dt));
    frameCamera();
    for (const s of slots) if (s.loaded) step(s, dt);
    for (const s of slots) {
      if (!s.loaded) continue;
      s.mixer.update(dt);
      s.group.position.set(s.x, s.y, s.z); s.group.rotation.y = s.yaw;
      if (s.grow0) { const span0 = Math.abs(s.tx - s.from) || 1, p = Math.min(1, 1 - Math.abs(s.tx - s.x) / span0);
        const e = p * p * (3 - 2 * p); s.group.scale.setScalar(s.grow0 + (1 - s.grow0) * e); if (p >= 1) { s.grow0 = 0; s.group.scale.setScalar(1); } }
      const want = !S.sel || S.sel === s.c.slug ? 1 : LINE.dim;
      s.lit += (want - s.lit) * (1 - Math.exp(-6 * dt));
      for (const { m, base } of s.mats) m.color.copy(base).multiplyScalar(s.lit);
    }
    renderer.render(scene, camera);
    if (S.on) seat();   // running out after the line is gone: the seat is not reporting any more
  }
  requestAnimationFrame(frame);
  const sv = new THREE.Vector3();
  function seat() {
    const s = slots.find(t => t.ghost); if (!s) return;
    const r = cv.getBoundingClientRect();
    sv.set(s.x, 0, s.z).project(camera); const cx = r.left + (sv.x + 1) / 2 * r.width, foot = r.top + (1 - sv.y) / 2 * r.height;
    sv.set(s.x, s.c.h || 1.8, s.z).project(camera); const head = r.top + (1 - sv.y) / 2 * r.height;
    colin?.place?.({ cx, foot, px: foot - head, lit: s.lit, dir: s.state === 'walk' && Math.abs(s.tx - s.x) > 0.06 ? Math.sign(s.tx - s.x) : 0 });
  }

  // drag to walk the line; a tap picks whoever is under the thumb
  cv.addEventListener('pointerdown', e => { S.fling = 0; S.drag = { x: e.clientX, camX: S.camX, moved: 0, lx: e.clientX, lt: performance.now(), v: 0, iv: 16 }; });
  const onMove = e => {
    if (!S.drag) return;
    const dx = e.clientX - S.drag.x; S.drag.moved = Math.max(S.drag.moved, Math.abs(dx));
    const ppm = frameCamera();
    S.camX = S.wantX = Math.max(-span() - 0.6, Math.min(span() + 0.6, S.drag.camX - dx / ppm));
    // how fast it is going, in metres a second, smoothed over the last few moves
    const now = performance.now(), dt = Math.max(1, now - S.drag.lt) / 1000; S.drag.iv = S.drag.iv * 0.7 + dt * 1000 * 0.3;
    S.drag.v = S.drag.v * 0.6 + (-(e.clientX - S.drag.lx) / ppm / dt) * 0.4; S.drag.lx = e.clientX; S.drag.lt = now;
  };
  addEventListener('pointermove', onMove);
  const onUp = e => {
    if (!S.drag) return;
    const tap = S.drag.moved < 8, d = S.drag; S.drag = null;
    if (!tap) {   // let go mid-swipe: throw it (a finger that stopped before lifting throws nothing)
      const idle = performance.now() - d.lt > Math.max(100, d.iv * 3);   // stopped: well past the rhythm the moves were coming in at
      S.fling = idle ? 0 : Math.max(-14, Math.min(14, d.v));
      if (!S.fling) S.wantX = Math.max(-span(), Math.min(span(), S.camX));
      return;
    }
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
  };
  addEventListener('pointerup', onUp);

  const api = {
    canvas: cv,
    visible(v) {
      v = !!v; if (v === S.on) return;
      S.on = v; cv.classList.toggle('off', !v);
      if (v) {
        // back again: everyone offstage first, then in, nearest Colin first -- and draw that
        // empty stage NOW, so the canvas never shows the last frame of them running out
        S.sel = null; S.shift = 0; S.camX = S.wantX = 0; S.fling = 0; resize(); layout();
        for (const s of slots) if (s.loaded) stageLeft(s, 0.12 + s.rank * 0.16);
        for (const s of slots) if (s.loaded) s.group.position.set(s.x, s.y, s.z);
        renderer.render(scene, camera);
        if (!S.started) { S.started = true; loadAll(); }
      } else {
        for (const s of slots) if (s.loaded && s.how !== 'here') {   // they run off the way they came
          s.state = 'exit'; s.exitX = off(s); clip(s, s.clips.run ? 'run' : 'walk');
        }
        colin?.place?.(null); colin?.joined?.(false);
        S.exitUntil = performance.now() + 900;
      }
    },
    /** centre the camera on one character, light them and dim the rest (null: everyone lit) */
    focus(slug) {
      S.sel = slug || null;
      const k = slots.findIndex(s => s.c.slug === slug);
      S.shift = k >= 0 ? k - home : 0; S.wantX = 0; S.fling = 0;                    // the line walks over until they are in the middle
      layout();
    },
    /** the strip's top edge in CSS px from the top of the host: their floor */
    ground(y, below) { S.ground = y; if (below != null) S.below = Math.round(below); },
    pause(p) { p = !!p; if (p === S.paused) return; S.paused = p; cv.style.visibility = p ? 'hidden' : ''; },   // off the top: gone, not a frozen frame
    fog(hex) { scene.fog.color.set(hex); },
    /** gone for good: a different game's cast is taking the stage */
    destroy() {
      S.dead = true; S.on = false; removeEventListener('pointermove', onMove); removeEventListener('pointerup', onUp);
      for (const s of slots) s.mixer?.stopAllAction?.();
      scene.traverse(o => { if (o.isMesh) { o.geometry?.dispose(); for (const m of [].concat(o.material)) { for (const k in m) if (m[k]?.isTexture) m[k].dispose(); m.dispose(); } } });
      renderer.dispose(); renderer.forceContextLoss?.(); cv.remove();
    },
    LINE, _slots: slots, _camera: camera, _S: S, _renderer: renderer, _scene: scene,
  };
  return api;
}
