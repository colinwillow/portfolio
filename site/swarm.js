// The swarm: one Points draw call, every particle morphing between two point
// sets entirely on the GPU. The CPU only writes a new target when the shape
// changes; the flight, the breathing, the finger and the blast are all shader.
//
// A particle leaves on its own beat (a per-particle stagger) and bows out
// sideways mid-flight, so a change of shape reads as the swarm FLOWING into
// the new form rather than cross-fading.

import * as THREE from '../vendor/three.module.min.js';

const VS = /* glsl */`
  attribute vec3 aFrom; attribute vec3 aTo; attribute vec4 aSeed; // stagger, size, accent, phase
  uniform float uT, uTime, uLevel, uBlast, uPx, uAspect, uHush;
  uniform vec2 uPtr; uniform float uPtrOn;
  varying float vAcc; varying float vA;
  vec3 wobble(vec3 p, float t) {
    return vec3(sin(p.y * 2.3 + t * 1.1) + sin(p.z * 3.1 - t * 0.7),
                sin(p.z * 2.1 + t * 0.9) + sin(p.x * 2.7 + t * 1.3),
                sin(p.x * 1.9 - t * 1.2) + sin(p.y * 3.3 + t * 0.6)) * 0.5;
  }
  void main() {
    float k = clamp((uT - aSeed.x * 0.5) / 0.5, 0.0, 1.0);
    k = k * k * (3.0 - 2.0 * k);
    float fly = sin(3.14159 * k);
    vec3 p = mix(aFrom, aTo, k);
    p += wobble(aTo * 1.4 + aSeed.w, uTime) * (0.55 * fly + 0.012 + uLevel * 0.08);
    vec3 out_ = normalize(p + vec3(0.0001));
    p += out_ * uBlast * (2.0 + aSeed.w * 2.5);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    // the finger pushes particles away in screen space
    vec2 ndc = gl_Position.xy / gl_Position.w;
    vec2 d = ndc - uPtr; d.x *= uAspect;
    float r = length(d);
    float push = uPtrOn * smoothstep(0.28, 0.0, r) * 0.22;
    gl_Position.xy += normalize(d + 1e-5) * vec2(1.0 / uAspect, 1.0) * push * gl_Position.w;
    gl_PointSize = aSeed.y * uPx / -mv.z * (1.0 + fly * 0.8 + uLevel * 0.6);
    vAcc = aSeed.z;
    vA = (1.0 - uHush * 0.65) * (1.0 - clamp(uBlast, 0.0, 1.0));
  }`;
const FS = /* glsl */`
  uniform vec3 uInk; uniform vec3 uAccent;
  varying float vAcc; varying float vA;
  void main() {
    float r = length(gl_PointCoord - 0.5);
    if (r > 0.5) discard;
    float soft = smoothstep(0.5, 0.1, r);
    gl_FragColor = linearToOutputTexel(vec4(mix(uInk, uAccent, vAcc), soft * vA * 0.55));
  }`;

export function createSwarm(renderer, count) {
  const g = new THREE.BufferGeometry();
  const from = new Float32Array(count * 3), to = new Float32Array(count * 3), seed = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    seed[i * 4] = Math.random();
    seed[i * 4 + 1] = 1.6 + Math.random() * 2.6;
    seed[i * 4 + 2] = Math.random() < 0.18 ? 1 : 0;
    seed[i * 4 + 3] = Math.random() * 6.28;
  }
  g.setAttribute('position', new THREE.BufferAttribute(to, 3));   // for bounds only; the shader reads aTo
  g.setAttribute('aFrom', new THREE.BufferAttribute(from, 3));
  g.setAttribute('aTo', new THREE.BufferAttribute(to, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  const U = {
    uT: { value: 1 }, uTime: { value: 0 }, uLevel: { value: 0 }, uBlast: { value: 0 }, uHush: { value: 0 },
    uPx: { value: 1 }, uAspect: { value: 1 }, uPtr: { value: new THREE.Vector2(9, 9) }, uPtrOn: { value: 0 },
    uInk: { value: new THREE.Color('#e9e6df') }, uAccent: { value: new THREE.Color('#b07a8f') },
  };
  const mat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: VS, fragmentShader: FS,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const points = new THREE.Points(g, mat);
  points.frustumCulled = false;

  let t = 1, dur = 1.6;
  const ease = x => x * x * (3 - 2 * x);
  /** Where every particle is right now, minus the wobble -- the start of the next flight. */
  function snapshot() {
    for (let i = 0; i < count; i++) {
      const k = ease(Math.min(1, Math.max(0, (t - seed[i * 4] * 0.5) / 0.5)));
      for (let j = 0; j < 3; j++) from[i * 3 + j] += (to[i * 3 + j] - from[i * 3 + j]) * k;
    }
  }
  return {
    points, uniforms: U, count,
    /** Fly to a new point set (Float32Array of count*3). */
    morph(target, seconds = 1.6) {
      snapshot();
      to.set(target);
      t = 0; dur = seconds;
      g.attributes.aFrom.needsUpdate = true; g.attributes.aTo.needsUpdate = true; g.attributes.position.needsUpdate = true;
    },
    /** Jump straight to a shape with no flight (first frame). */
    set(target) { to.set(target); from.set(target); t = 1; g.attributes.aFrom.needsUpdate = g.attributes.aTo.needsUpdate = true; },
    get settled() { return t >= 1; },
    get progress() { return t; },
    step(dt, time) { t = Math.min(1, t + dt / dur); U.uT.value = t; U.uTime.value = time; },
    resize(w, h) {
      U.uAspect.value = w / h;
      U.uPx.value = h * renderer.getPixelRatio() / (2 * Math.tan(THREE.MathUtils.degToRad(40) / 2)) * 0.0068;
    },
  };
}
