// Loading a character, shared by the asset viewer and mini-Colin.
//
// Every GLB here is draco + WebP and exported from Cinema 4D, so three things
// are handled once in this file rather than at every call site:
//   * the draco decoder (a missing one is a load failure, not a warning);
//   * exporter residue -- `CINEMA_4D_Main`, Blender's `.001` duplicates and the
//     one-frame `*_rigged_mixamo` take -- is dropped from the clip list;
//   * bounds come from the SKINNED vertices, never Box3.setFromObject, which
//     applies the 0.01 armature scale to vertices the bones already placed and
//     reports a character a hundredth of his size.

import * as THREE from '../vendor/three.module.min.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { DRACOLoader } from '../vendor/DRACOLoader.js';

let loader;
function gltf() {
  if (!loader) {
    const draco = new DRACOLoader();
    draco.setDecoderPath(new URL('../vendor/draco/', import.meta.url).href);
    loader = new GLTFLoader();
    loader.setDRACOLoader(draco);
  }
  return loader;
}

const RESIDUE = /CINEMA_4D_Main|\.\d{3}$|_rigged_mixamo$|^handyman_animations$/;

/** Load a character. `onProgress(0..1)` when the server sends a length. */
export async function loadCharacter(url, onProgress) {
  const g = await new Promise((res, rej) => gltf().load(url, res,
    e => { if (e.total) onProgress?.(e.loaded / e.total); }, rej));
  const model = g.scene;
  let tris = 0, joints = 0;
  model.traverse(o => {
    if (!o.isMesh) return;
    o.frustumCulled = false;            // skinned bounds lie; a culled hero is a vanished hero
    const geo = o.geometry;
    tris += (geo.index ? geo.index.count : geo.attributes.position.count) / 3;
    if (o.isSkinnedMesh) joints = Math.max(joints, o.skeleton.bones.length);
    for (const m of [].concat(o.material)) {
      // C4D writes BLEND whenever a texture has an alpha channel at all, and a
      // transparent skin sorts against itself: the far side draws over the near.
      if (m.transparent && m.alphaTest === 0) { m.transparent = false; m.depthWrite = true; }
    }
  });
  const clips = g.animations.filter(c => !RESIDUE.test(c.name) && c.tracks.length);
  const mixer = new THREE.AnimationMixer(model);
  return { model, clips, mixer, tris: Math.round(tris), joints };
}

/** World-space box of what is actually drawn, after the current pose. */
export function skinnedBounds(model) {
  model.updateMatrixWorld(true);
  const box = new THREE.Box3(), v = new THREE.Vector3();
  model.traverse(o => {
    if (!o.isMesh) return;
    const pos = o.geometry.attributes.position;
    const step = Math.max(1, Math.floor(pos.count / 3000));   // a sample is plenty for framing
    for (let i = 0; i < pos.count; i += step) {
      v.fromBufferAttribute(pos, i);
      if (o.isSkinnedMesh) o.applyBoneTransform(i, v);
      v.applyMatrix4(o.matrixWorld);
      box.expandByPoint(v);
    }
  });
  return box;
}

/** Pick a clip by preference, loosely: first name that contains any of `want`. */
export function pickClip(clips, ...want) {
  for (const w of want) {
    const c = clips.find(c => c.name.toLowerCase() === w) || clips.find(c => c.name.toLowerCase().includes(w));
    if (c) return c;
  }
  return clips[0];
}

/** Cross-fade to a clip. `once` plays it through and returns to `back`. */
export function play(mixer, clip, { fade = 0.3, once = false, back = null } = {}) {
  if (!clip) return null;
  const a = mixer.clipAction(clip);
  a.reset().setEffectiveWeight(1).fadeIn(fade).play();
  a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
  a.clampWhenFinished = once;
  // Ask the WEIGHT, never isRunning(): a finished LoopOnce clip is paused, so it
  // is "not running" while still holding its last frame at full weight.
  for (const other of mixer._actions) if (other !== a && other.getEffectiveWeight() > 0) other.fadeOut(fade);
  if (once && back) {
    const done = e => { if (e.action !== a) return; mixer.removeEventListener('finished', done); play(mixer, back, { fade }); };
    mixer.addEventListener('finished', done);
  }
  return a;
}
