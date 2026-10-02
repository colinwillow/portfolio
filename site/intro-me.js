// Him, for the way in: the rig on its own transparent canvas over everything,
// walking across the screen once. The intro asks where his body is each frame
// (a few circles in screen px: head, chest, hips, and the two hands) so the
// particles can be shoved out of his way. When he has walked off the right he
// takes his canvas with him.
import * as THREE from '../vendor/three.module.min.js';
import { loadCharacter, skinnedBounds, pickClip, play } from './rig.js?v=b66102e5';

export async function mountMe(cv, { bg = '#f3e4c6', mode = 'depth' } = {}) {
  const c = await loadCharacter(new URL('../models/colin.glb', import.meta.url).href);
  const loose = []; let skinned = 0;
  c.model.traverse(o => { if (o.isSkinnedMesh) skinned++; else if (o.isMesh) loose.push(o); });
  if (skinned) loose.forEach(o => o.removeFromParent());
  let headMat = null;
  c.model.traverse(o => { if (o.isMesh && /head/i.test(o.name) && o.material.map) headMat = o.material; });
  const face = [];
  c.model.traverse(o => {
    if (o.isMesh && /teeth/i.test(o.name) && !o.material.map && headMat) o.material = headMat;
    if (o.isMesh && o.morphTargetDictionary) for (const [n, i] of Object.entries(o.morphTargetDictionary))
      if (/colin.?head/i.test(n)) o.morphTargetInfluences[i] = 1;          // the shape that makes the head his
  });
  const walk = pickClip(c.clips, 'walk_fwd_swagger', 'walk_fwd_neutral');
  const idle = pickClip(c.clips, 'idle_neutral', 'neutral_idle');
  /* Measured on the IDLE, exactly as the homepage Colin measures himself (colin.js), so the
     place this one stops is the place that one stands, to the pixel: same height, same
     ground, same centring. */
  let hIdle = 0, idleBox = null;
  if (idle) { const a = play(c.mixer, idle, { fade: 0 }); c.mixer.update(0.01); idleBox = skinnedBounds(c.model); hIdle = idleBox.max.y - idleBox.min.y; a.stop(); }
  const walkA = play(c.mixer, walk, { fade: 0 }); c.mixer.update(0.01);
  const box = idleBox || skinnedBounds(c.model), h = box.max.y - box.min.y;
  c.model.position.y -= box.min.y;
  if (mode === 'depth') c.model.position.x -= (box.min.x + box.max.x) / 2;
  const bones = {};
  c.model.traverse(o => { if (!o.isBone) return;
    for (const k of ['Head', 'Spine2', 'Hips', 'LeftHand', 'RightHand', 'LeftFoot', 'RightFoot'])
      if (new RegExp(k + '$').test(o.name) && !bones[k]) bones[k] = o; });

  /* HOW FAST HIS FEET ACTUALLY GO. The clip walks in place, so the speed he is
     moved at has to match what his planted foot is doing or he skates. Played
     through once, the LOWER foot at each moment is the planted one, and it
     travels backwards under him at exactly his walking speed: that is the
     number, read off the clip rather than guessed. */
  function stride() {
    const T = walk.duration, steps = 90, fv = new THREE.Vector3(), prev = {};
    const speeds = [];
    for (let s = 0; s <= steps; s++) {
      c.mixer.setTime((s / steps) * T); c.model.updateMatrixWorld(true);
      const now = {};
      for (const k of ['LeftFoot', 'RightFoot']) { bones[k].getWorldPosition(fv); now[k] = { y: fv.y, z: fv.z }; }
      if (s) { const k = now.LeftFoot.y < now.RightFoot.y ? 'LeftFoot' : 'RightFoot';
        speeds.push(-(now[k].z - prev[k].z) / (T / steps)); }
      Object.assign(prev, now);
    }
    c.mixer.setTime(0);
    speeds.sort((a, b) => a - b);
    const v = speeds[Math.floor(speeds.length * 0.5)];
    return v > 0.05 * h && v < 3 * h ? v : 0.7 * h;
  }
  const footSpeed = bones.LeftFoot && bones.RightFoot ? stride() : 0.7 * h;
  /* A brisker walk than the clip's own: the step plays faster AND he travels
     faster by the same factor, so the planted foot still does not slide. */
  const PACE = mode === 'depth' ? 1.6 : 1.35;
  if (walkA) walkA.timeScale = PACE;

  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NeutralToneMapping;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(24, 1, 0.05, 100);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6a6070, 2.3));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(-2, 3, 3); scene.add(key);
  const rim = new THREE.DirectionalLight(0xb488ff, 1.6); rim.position.set(2, 2, -3); scene.add(rim);
  scene.add(c.model);
  if (mode === 'depth') {
    /* OUT OF THE FOG: his far distance fades into the page's own colour, so he condenses out
       of the background rather than being a small man standing on it. */
    scene.fog = null;   // (out of the SHADOWS, not a fog: he fades in, see the frame loop)
  } else c.model.rotation.y = Math.PI / 2;           // he faces +Z; walking right is +X

  let W = 0, H = 0, span = 0, x0 = 0, x1 = 0, t = 0, dur = 1, running = false, dead = false;
  const speed = footSpeed * PACE;                                         // metres a second: his feet, measured
  const v = new THREE.Vector3(), clock = new THREE.Clock();
  /* THE HOMEPAGE'S CAMERA. The hero Colin is drawn by a 22-degree camera into a box 0.7 wide
     by the stage's height; this one IS that camera -- same lens, same place, same aim -- with
     its view offset widened to the whole screen, so the box the hero draws into is exactly a
     window in this picture. Wherever he stops at z = 0 is therefore where the hero stands,
     at his size, to the pixel, and the page can take him without anything moving. */
  const stageRect = () => {
    const st = document.getElementById('home-stage'), r = st?.getBoundingClientRect();
    return r && r.height > 40 && getComputedStyle(st).display !== 'none' ? r : null;
  };
  let depth = mode === 'depth', Z0 = 0, walkT = 0, endT = 0;
  const STOP = 0.6;   // seconds of slowing to a stand at the end
  function aim() {
    const r = stageRect(); if (!r) return false;
    const ch = r.height, cw = ch * 0.7, L = r.left + r.width / 2 - cw / 2, T = r.top;
    camera.fov = 22; camera.aspect = 0.7;
    const dist = h * 0.62 / Math.tan(camera.fov * Math.PI / 360);
    camera.position.set(0, h * 0.62, dist); camera.lookAt(0, h * 0.5, 0);
    camera.setViewOffset(cw, ch, -L, -T, W, H); camera.updateProjectionMatrix();
    return true;
  }
  function layout(w, hgt) {
    W = w; H = hgt; renderer.setSize(W, H, false); camera.aspect = W / H;
    if (depth) {
      // the walk: about three and a half seconds of steps from far back, then a stand
      walkT = 2.3; Z0 = speed * (walkT + STOP * 0.5); endT = walkT + STOP;
      if (aim()) { dur = endT; return; }
      depth = false; c.model.rotation.y = Math.PI / 2; c.model.position.x = 0;   // no stage to aim at: the side walk
    }
    // frame him about 55% of the screen tall, feet a little below the middle-third line
    const tall = h / 0.42, dist = tall / (2 * Math.tan(camera.fov * Math.PI / 360));
    camera.position.set(0, h * 0.62, dist); camera.lookAt(0, h * 0.62, 0); camera.updateProjectionMatrix();
    span = tall * camera.aspect / 2 + h * 0.5;                    // just off either edge
    x0 = -span; x1 = span; dur = (x1 - x0) / speed;
  }
  /* THE COLLIDER IS HIS SILHOUETTE. Each frame he is drawn a second time, flat
     white on black, into a small render target (a quarter of the screen in each
     direction), read back, and blurred twice into a smooth field: 1 deep inside
     him, 0 well clear, and a soft ramp at his outline. The field's value says
     how far into him a point is; its slope says which way is OUT of him at that
     point -- the surface normal -- so a particle can bounce off an elbow or roll
     up a shoulder rather than off a circle standing in for one. */
  const DS = 4;
  let mw = 1, mh = 1, rt = null, raw = null, fld = null, tmp = null, fresh = false;
  const flat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  function maskSize() {
    mw = Math.max(8, Math.round(W / DS)); mh = Math.max(8, Math.round(H / DS));
    rt?.dispose(); rt = new THREE.WebGLRenderTarget(mw, mh);
    raw = new Uint8Array(mw * mh * 4); fld = new Float32Array(mw * mh); tmp = new Float32Array(mw * mh);
  }
  function blur(a, b, r) {                        // separable box, a -> b -> a
    for (let y = 0; y < mh; y++) { let acc = 0; const row = y * mw;
      for (let x = -r; x < mw; x++) {
        if (x + r < mw) acc += a[row + x + r];
        if (x - r - 1 >= 0) acc -= a[row + x - r - 1];
        if (x >= 0) b[row + x] = acc / (2 * r + 1);
      } }
    for (let x = 0; x < mw; x++) { let acc = 0;
      for (let y = -r; y < mh; y++) {
        if (y + r < mh) acc += b[(y + r) * mw + x];
        if (y - r - 1 >= 0) acc -= b[(y - r - 1) * mw + x];
        if (y >= 0) a[y * mw + x] = acc / (2 * r + 1);
      } }
  }
  function silhouette() {
    const bg = scene.background; scene.overrideMaterial = flat; scene.background = new THREE.Color(0);
    renderer.setRenderTarget(rt); renderer.render(scene, camera); renderer.setRenderTarget(null);
    scene.overrideMaterial = null; scene.background = bg;
    renderer.readRenderTargetPixels(rt, 0, 0, mw, mh, raw);
    // the target is stored bottom-up; flip into screen rows as it is copied
    for (let y = 0; y < mh; y++) { const sr = (mh - 1 - y) * mw * 4, dr = y * mw;
      for (let x = 0; x < mw; x++) fld[dr + x] = raw[sr + x * 4] > 60 ? 1 : 0; }
    blur(fld, tmp, 2); blur(fld, tmp, 2);
    // walking toward you the field is a SHELL: deep in his middle, ramping off to nothing a little
    // outside him -- a wide soft bevel, so the particles pile up round him rather than on him
    if (depth) { const r = Math.max(2, Math.round(mw / 40)); blur(fld, tmp, r); blur(fld, tmp, r); }
    fresh = true;
  }
  const at = (x, y) => { x = Math.max(0, Math.min(mw - 1.001, x)); y = Math.max(0, Math.min(mh - 1.001, y));
    const i = x | 0, j = y | 0, fx = x - i, fy = y - j, o = j * mw + i;
    return (fld[o] * (1 - fx) + fld[o + 1] * fx) * (1 - fy) + (fld[o + mw] * (1 - fx) + fld[o + mw + 1] * fx) * fy; };
  let bodyVx = 0, lastX = 0, wasX = 0;
  const scr = (o, lift = 0) => { o.getWorldPosition(v); v.y += lift; v.project(camera);
    return { x: (v.x * 0.5 + 0.5) * W, y: (-v.y * 0.5 + 0.5) * H }; };
  function frame() {
    if (dead) return;
    wasX = c.model.position.x;
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, clock.getDelta());
    if (!running) return;
    t += dt;
    if (depth) {
      aim();                                    // the page may scroll or resize under him: follow its stage
      // distance covered: full pace, then easing to a stand over STOP (the step slows with him)
      const u = Math.max(0, Math.min(1, (t - walkT) / STOP)), pace = t < walkT ? 1 : 1 - u;
      const done = t < walkT ? speed * t : speed * (walkT + STOP * (u - u * u / 2));
      c.model.position.z = -Z0 + done;
      if (!gone) cv.style.opacity = String(Math.min(1, t / 0.75));   // stepping out of the dark
      if (walkA) walkA.timeScale = PACE * Math.max(0.15, pace);
      if (idle && !stood && t > walkT + STOP * 0.35) { stood = true; play(c.mixer, idle, { fade: STOP * 0.65 }); }
    } else c.model.position.x = x0 + (x1 - x0) * Math.min(1, t / dur);
    c.mixer.update(dt);
    renderer.render(scene, camera);
    silhouette();
    const sx = depth ? lastX : (c.model.position.x / (span * 2) + 0.5) * W;          // his screen speed, px per 60 Hz frame
    bodyVx = dt > 0 ? (sx - lastX) / (dt * 60) : 0; lastX = sx;
    if (!depth && t > dur + 0.1) dispose();
    if (depth && t > endT) handoff();
  }
  /* He holds the spot until the homepage's own Colin is up and drawn there, then the two
     crossfade over a third of a second -- they are standing in the same place in the same
     pose, so it reads as nothing happening at all. If the page never brings one (no WebGL,
     ?nocolin), he fades on his own after a while rather than standing there for ever. */
  let stood = false, gone = 0;
  function handoff() {
    if (gone) return;
    // ...and only once the intro has lifted: before that the page is still covered, and
    // fading out here would just make him vanish into the overlay
    const ready = !document.getElementById('intro') && document.querySelector('#home-stage #mini:not(.loading) canvas');
    if (ready || t > endT + 12) {
      gone = 1; cv.style.transition = 'opacity .35s'; cv.style.opacity = '0';
      if (ready) dispatchEvent(new Event('cw:handoff'));
      setTimeout(dispose, 450);
    }
  }
  function dispose() {
    if (dead) return; dead = true; running = false;
    renderer.dispose(); cv.remove();
  }
  const pxM = () => H / (2 * camera.position.z * Math.tan(camera.fov * Math.PI / 360));
  frame();
  return {
    start(w, hgt) { layout(w, hgt); maskSize(); t = 0; running = true; clock.getDelta(); lastX = (x0 / (span * 2) + 0.5) * W; cv.classList.add('on'); },
    /** where a screen point is against his body: depth (0 clear .. 1 deep inside) and the
        outward normal, from the silhouette field. null while he is not on screen. */
    hit(x, y) {
      if (!running || !fresh) return null;
      const u = x / DS, v2 = y / DS, d = at(u, v2);
      if (d < 0.02) return null;
      const gx = at(u + 1, v2) - at(u - 1, v2), gy = at(u, v2 + 1) - at(u, v2 - 1), g = Math.hypot(gx, gy) || 1;
      return { d, nx: -gx / g, ny: -gy / g, vx: bodyVx };
    },
    progress: () => Math.min(1, t / dur),
    /** walking toward the camera (true) or across (false) -- decided when he starts */
    get depth() { return depth; },
    /** where his chest is on screen and how tall he stands there, px */
    chest() {
      if (!running) return null;
      const p = scr(bones.Spine2 || c.model, 0), hd = scr(bones.Head || c.model, 0.1), ft = scr(c.model, 0);
      return { x: p.x, y: p.y, r: Math.abs(ft.y - hd.y) };
    },
    body() {
      if (!running) return [];
      const k = pxM(), out = [];
      const add = (b, r, lift) => { if (b) { const p = scr(b, lift); p.r = r * k; out.push(p); } };
      add(bones.Head, h * 0.17, 0.05); add(bones.Spine2, h * 0.2); add(bones.Hips, h * 0.19);
      add(bones.LeftHand, h * 0.09); add(bones.RightHand, h * 0.09);
      add(bones.LeftFoot, h * 0.08); add(bones.RightFoot, h * 0.08);
      return out;
    },
    dispose,
  };
}
