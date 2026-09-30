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
  play(c.mixer, walk, { fade: 0 }); c.mixer.update(0.01);
  const box = skinnedBounds(c.model), h = box.max.y - box.min.y;
  c.model.position.y -= box.min.y;
  const bones = {};
  c.model.traverse(o => { if (!o.isBone) return;
    for (const k of ['Head', 'Spine2', 'Hips', 'LeftHand', 'RightHand', 'LeftFoot', 'RightFoot'])
      if (new RegExp(k + '$').test(o.name) && !bones[k]) bones[k] = o; });

  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NeutralToneMapping;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(24, 1, 0.05, 100);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6a6070, 2.3));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(-2, 3, 3); scene.add(key);
  const rim = new THREE.DirectionalLight(0xb488ff, 1.6); rim.position.set(2, 2, -3); scene.add(rim);
  scene.add(c.model); c.model.rotation.y = Math.PI / 2;           // he faces +Z; walking right is +X

  let W = 0, H = 0, span = 0, x0 = 0, x1 = 0, t = 0, dur = 1, running = false, dead = false;
  const speed = 0.85 * h;                                          // metres a second, for this clip
  const v = new THREE.Vector3(), clock = new THREE.Clock();
  function layout(w, hgt) {
    W = w; H = hgt; renderer.setSize(W, H, false); camera.aspect = W / H;
    // frame him about 55% of the screen tall, feet a little below the middle-third line
    const tall = h / 0.55, dist = tall / (2 * Math.tan(camera.fov * Math.PI / 360));
    camera.position.set(0, h * 0.62, dist); camera.lookAt(0, h * 0.62, 0); camera.updateProjectionMatrix();
    span = tall * camera.aspect / 2 + h * 0.5;                    // just off either edge
    x0 = -span; x1 = span; dur = (x1 - x0) / speed;
  }
  const scr = (o, lift = 0) => { o.getWorldPosition(v); v.y += lift; v.project(camera);
    return { x: (v.x * 0.5 + 0.5) * W, y: (-v.y * 0.5 + 0.5) * H }; };
  function frame() {
    if (dead) return;
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, clock.getDelta());
    if (!running) return;
    t += dt; c.model.position.x = x0 + (x1 - x0) * Math.min(1, t / dur);
    c.mixer.update(dt);
    renderer.render(scene, camera);
    if (t > dur + 0.1) dispose();
  }
  function dispose() {
    if (dead) return; dead = true; running = false;
    renderer.dispose(); cv.remove();
  }
  const pxM = () => H / (2 * camera.position.z * Math.tan(camera.fov * Math.PI / 360));
  frame();
  return {
    start(w, hgt) { layout(w, hgt); t = 0; running = true; clock.getDelta(); cv.classList.add('on'); },
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
