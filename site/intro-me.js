// Him, for the way in: the rig on its own transparent canvas over everything,
// walking across the screen once. The intro asks where his body is each frame
// (a few circles in screen px: head, chest, hips, and the two hands) so the
// particles can be shoved out of his way. When he has walked off the right he
// takes his canvas with him.
import * as THREE from '../vendor/three.module.min.js';
import { loadCharacter, skinnedBounds, pickClip, play } from './rig.js?v=0090c5af';

export async function mountMe(cv) {
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
  const walkA = play(c.mixer, walk, { fade: 0 }); c.mixer.update(0.01);
  const box = skinnedBounds(c.model), h = box.max.y - box.min.y;
  c.model.position.y -= box.min.y;
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
  const PACE = 1.35;
  if (walkA) walkA.timeScale = PACE;

  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NeutralToneMapping;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(24, 1, 0.05, 100);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6a6070, 2.3));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(-2, 3, 3); scene.add(key);
  const rim = new THREE.DirectionalLight(0xb488ff, 1.6); rim.position.set(2, 2, -3); scene.add(rim);
  scene.add(c.model); c.model.rotation.y = Math.PI / 2;           // he faces +Z; walking right is +X

  let W = 0, H = 0, span = 0, x0 = 0, x1 = 0, t = 0, dur = 1, running = false, dead = false;
  const speed = footSpeed * PACE;                                         // metres a second: his feet, measured
  const v = new THREE.Vector3(), clock = new THREE.Clock();
  function layout(w, hgt) {
    W = w; H = hgt; renderer.setSize(W, H, false); camera.aspect = W / H;
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
    t += dt; c.model.position.x = x0 + (x1 - x0) * Math.min(1, t / dur);
    c.mixer.update(dt);
    renderer.render(scene, camera);
    silhouette();
    const sx = (c.model.position.x / (span * 2) + 0.5) * W;          // his screen speed, px per 60 Hz frame
    bodyVx = dt > 0 ? (sx - lastX) / (dt * 60) : 0; lastX = sx;
    if (t > dur + 0.1) dispose();
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
