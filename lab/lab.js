// The lab: the whole site as ONE thing. A particle swarm that becomes each
// section -- swipe to change what it is, tap to go through it. Once the
// particles settle, the real object fades in inside them as a hologram.
//
// This is a prototype beside the real site, not a replacement for it yet:
// every section still has its ordinary page, and "enter" goes there.

import * as THREE from '../vendor/three.module.min.js';
import { createSwarm } from '../site/swarm.js?v=a192b303';
import { OBJECTS, fit, sampleSurface, sampleText, sampleSkinned } from '../site/shapes.js?v=aac1b012';
import { loadCharacter, pickClip, play } from '../site/rig.js?v=54637da4';
import { onAccent, oklchHex } from '../site/palette.js?v=7fa72879';

const SLIDES = [
  { key: '',        label: 'COLIN WILLOW', sub: 'Games, characters, tools and strange little worlds.', shape: 'orb' },
  { key: 'play',    label: 'PLAY',    sub: 'Games and apps you can open right now.', shape: 'controller' },
  { key: 'assets',  label: 'ASSETS',  sub: 'Rigged, animated characters built for web games.', shape: 'zap' },
  { key: 'motion',  label: 'MOTION',  sub: 'CGI loops, logo reveals, character tests.', shape: 'camera' },
  { key: 'scripts', label: 'SCRIPTS', sub: 'Cinema 4D and pipeline scripts from the tutorials.', shape: 'code' },
  { key: 'writing', label: 'WRITING', sub: 'Essays about art and making, read aloud.', shape: 'book' },
  { key: 'web',     label: 'WEB',     sub: 'Sites built for brands and friends.', shape: 'browser' },
  { key: 'studios', label: 'STUDIOS', sub: 'SeaWillow, Majia and Unknown.', shape: 'studios' },
];

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.setClearColor(0x0b0b0c, 1);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
const rig = new THREE.Group(); rig.position.y = 0.45; scene.add(rig);

const phone = innerWidth * innerHeight < 600000;
const N = phone ? 12000 : 20000;
const swarm = createSwarm(renderer, N);
rig.add(swarm.points);

// --- holograms ------------------------------------------------------------------
const holoMat = new THREE.ShaderMaterial({
  uniforms: { uColor: { value: new THREE.Color('#b07a8f') }, uOp: { value: 0 }, uTime: { value: 0 } },
  vertexShader: `varying vec3 vN; varying vec3 vV; varying float vY;
    void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
      vY = position.y; gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `uniform vec3 uColor; uniform float uOp; uniform float uTime; varying vec3 vN; varying vec3 vV; varying float vY;
    void main() { float f = pow(1.0 - abs(dot(vN, vV)), 2.2);
      float scan = 0.75 + 0.25 * sin(vY * 90.0 - uTime * 6.0);
      gl_FragColor = linearToOutputTexel(vec4(uColor * (0.25 + 1.6 * f) * scan, (0.1 + 0.9 * f) * uOp)); }`,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
});
const wireMat = new THREE.MeshBasicMaterial({ color: '#b07a8f', wireframe: true, transparent: true, opacity: 0,
  depthWrite: false, blending: THREE.AdditiveBlending });

// Accent after the materials exist -- onAccent fires immediately.
onAccent(a => {
  const hex = oklchHex(a);
  swarm.uniforms.uAccent.value.set(hex);
  holoMat.uniforms.uColor.value.set(hex);
  wireMat.color.set(hex);
  document.documentElement.style.setProperty('--accent', hex);
});

// --- targets (built on first use, then cached) ------------------------------------
const SHAPE_N = Math.floor(N * 0.74), TEXT_N = N - SHAPE_N;
const cache = new Map();
let zap = null;

function withLabel(shapePts, label) {
  const out = new Float32Array(N * 3);
  out.set(shapePts);
  sampleText(label, TEXT_N, { width: Math.min(3.2, 0.34 * label.length + 0.4), y: -1.5, fitWidth: true }, out, SHAPE_N);
  return out;
}
function orb(n) {
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = 1.25 + (Math.random() - 0.5) * 0.12;
    const s = Math.sqrt(1 - u * u);
    a[i * 3] = Math.cos(th) * s * r; a[i * 3 + 1] = u * r + 0.25; a[i * 3 + 2] = Math.sin(th) * s * r;
  }
  return a;
}
function target(slide) {
  if (cache.has(slide.shape)) return cache.get(slide.shape);
  let pts, holo = null;
  if (slide.shape === 'orb') pts = orb(SHAPE_N);
  else if (slide.shape === 'code') pts = sampleText('</>', SHAPE_N, { width: 2.4, y: 0.3, depth: 0.5, fitWidth: true });
  else if (slide.shape === 'zap') {
    if (!zap) return null;                      // still loading; caller shows the orb meanwhile
    pts = zap.points; holo = zap.holo;
  } else {
    const geo = fit(OBJECTS[slide.shape]());
    pts = sampleSurface(geo, SHAPE_N);
    holo = new THREE.Mesh(geo, holoMat);
  }
  if (holo) { holo.visible = false; rig.add(holo); }
  const t = { pts: withLabel(pts, slide.label), holo };
  cache.set(slide.shape, t);
  return t;
}

// Zap, as a point cloud of his real posed mesh, and his real rig as the hologram.
loadCharacter(new URL('../models/assets/zap.glb', import.meta.url).href).then(c => {
  const idle = pickClip(c.clips, 'idle_01', 'idle');
  play(c.mixer, idle, { fade: 0 }); c.mixer.update(0.4);
  const { points, bounds } = sampleSkinned(c.model, SHAPE_N);
  const { k, c: ctr, lift } = bounds.userData.fit;
  const holder = new THREE.Group();
  c.model.traverse(o => { if (o.isMesh) o.material = wireMat; });
  c.model.scale.setScalar(k);
  c.model.position.set(-ctr.x * k, -ctr.y * k + lift, -ctr.z * k);
  holder.add(c.model);
  zap = { points, holo: holder, mixer: c.mixer };
  if (SLIDES[cur].shape === 'zap') go(cur, true);
}).catch(err => console.warn('zap', err));

// --- navigation ------------------------------------------------------------------
let cur = 0, shown = null, holoOp = 0, blasting = 0;
const dotsEl = document.getElementById('dots'), subEl = document.getElementById('sub'), hint = document.getElementById('hint');
dotsEl.innerHTML = SLIDES.map(() => '<i></i>').join('');

function go(i, force = false) {
  i = (i + SLIDES.length) % SLIDES.length;
  if (i === cur && !force && shown) return;
  cur = i;
  const s = SLIDES[i];
  const t = target(s) || target(SLIDES[0]);
  if (shown?.holo && shown !== t) shown.holo.visible = false;
  shown = t; holoOp = 0;
  if (!swarm._started) { swarm.set(t.pts); swarm._started = true; } else swarm.morph(t.pts, 1.7);
  [...dotsEl.children].forEach((d, j) => d.classList.toggle('on', j === i));
  subEl.style.opacity = 0;
  setTimeout(() => { subEl.textContent = s.sub; subEl.style.opacity = 1; }, 250);
  hint.textContent = s.key ? 'swipe · tap to enter' : 'swipe to explore';
  try { history.replaceState(null, '', '#' + (s.key || 'home')); } catch {}
}

function enter() {
  const s = SLIDES[cur];
  if (!s.key || blasting) return;
  blasting = 0.0001;
  setTimeout(() => { location.href = '../' + s.key; }, 650);
}
addEventListener('pageshow', e => { if (e.persisted) { blasting = 0; swarm.uniforms.uBlast.value = 0; } });

// Swipe left/right to change, tap or swipe up to go in. The finger also
// scatters the particles it passes over, so the thing feels touchable.
let down = null;
const toNdc = e => swarm.uniforms.uPtr.value.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight * 2 - 1));
canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; toNdc(e); swarm.uniforms.uPtrOn.value = 1; });
addEventListener('pointermove', e => { toNdc(e); if (e.pointerType === 'mouse') swarm.uniforms.uPtrOn.value = 1;
  if (down) drag.target = (e.clientX - down.x) / innerWidth * 1.2; });
addEventListener('pointerup', e => {
  if (e.pointerType !== 'mouse') swarm.uniforms.uPtrOn.value = 0;
  if (!down) return;
  const dx = e.clientX - down.x, dy = e.clientY - down.y, dt = performance.now() - down.t;
  down = null; drag.target = 0;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(cur + (dx < 0 ? 1 : -1));
  else if (dy < -70) enter();
  else if (Math.hypot(dx, dy) < 12 && dt < 400) enter();
});
addEventListener('pointerleave', () => { swarm.uniforms.uPtrOn.value = 0; });
addEventListener('keydown', e => {
  if (e.key === 'ArrowRight') go(cur + 1); else if (e.key === 'ArrowLeft') go(cur - 1);
  else if (e.key === 'Enter' || e.key === 'ArrowUp') enter();
});
let wheelLock = 0;
addEventListener('wheel', e => { if (performance.now() < wheelLock) return; const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
  if (Math.abs(d) > 25) { wheelLock = performance.now() + 900; go(cur + (d > 0 ? 1 : -1)); } }, { passive: true });

// Music drives the swarm.
const snd = { el: null, an: null, buf: null };
document.getElementById('sound').onclick = async function () {
  if (!snd.el) {
    snd.el = new Audio('../audio/Yoga_Pants.mp3'); snd.el.loop = true;
    const ctx = new (window.AudioContext || window.webkitAudioContext)(), src = ctx.createMediaElementSource(snd.el);
    snd.an = ctx.createAnalyser(); snd.an.fftSize = 256; snd.buf = new Uint8Array(128);
    src.connect(snd.an); snd.an.connect(ctx.destination); snd.ctx = ctx;
  }
  if (snd.el.paused) { await snd.ctx.resume(); snd.el.play(); this.setAttribute('aria-pressed', 'true'); }
  else { snd.el.pause(); this.setAttribute('aria-pressed', 'false'); }
};

// --- frame -----------------------------------------------------------------------
const drag = { v: 0, target: 0 };
function size() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h;
  // fit ~3.6 units of width on a narrow phone, never closer than 6.4
  camera.position.set(0, 0, Math.max(6.4, 1.8 / (Math.tan(THREE.MathUtils.degToRad(20)) * camera.aspect)));
  camera.updateProjectionMatrix(); swarm.resize(w, h);
}
addEventListener('resize', size); size();

let last = performance.now(), lvl = 0;
function frame(now) {
  requestAnimationFrame(frame);
  if (document.hidden) return;
  const dt = Math.min(0.05, (now - last) / 1000), time = now / 1000; last = now;
  swarm.step(dt, time);
  if (snd.el && !snd.el.paused) { snd.an.getByteFrequencyData(snd.buf); let v = 0; for (let i = 0; i < 24; i++) v += snd.buf[i];
    lvl += (Math.max(0, v / (24 * 255) - 0.25) * 1.8 - lvl) * 0.25; } else lvl *= 0.9;
  swarm.uniforms.uLevel.value = lvl;
  drag.v += (drag.target - drag.v) * (1 - Math.exp(-8 * dt));
  rig.rotation.y = Math.sin(time * 0.25) * 0.2 + drag.v;
  rig.rotation.x = Math.sin(time * 0.17) * 0.06;
  // hologram in once the particles have landed; particles dim to let it read
  const want = swarm.settled && shown?.holo && !blasting ? 1 : 0;
  holoOp += (want - holoOp) * (1 - Math.exp(-2.5 * dt));
  if (shown?.holo) { shown.holo.visible = holoOp > 0.01; }
  holoMat.uniforms.uOp.value = holoOp; holoMat.uniforms.uTime.value = time;
  wireMat.opacity = holoOp * 0.35;
  swarm.uniforms.uHush.value = holoOp;
  if (zap && shown?.holo === zap.holo) zap.mixer.update(dt);
  if (blasting) { blasting += dt; swarm.uniforms.uBlast.value = blasting * 2.2; }
  renderer.render(scene, camera);
}

const start = Math.max(0, SLIDES.findIndex(s => '#' + (s.key || 'home') === location.hash));
go(start, true);
requestAnimationFrame(frame);
