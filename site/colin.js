// Mini-Colin: the rigged, talking mini-me, docked in the corner of every page.
//
// He is PASSIVE by default -- he idles, glances at your pointer, and says
// nothing until he is tapped. Browsers will not play sound before a tap anyway,
// and waiting is also what keeps the voice bill sane.
//
// The brain and the voice are the SAME Worker the colin and glorp apps use
// (orb-brain), as the `colin` cast: his persona and his cloned voice live
// there, never in this page. This page only adds what he can't know on his own
// -- what is on the site -- through the Worker's `known` field.
//
// Navigation does NOT wait for the model: "take me to the games" is matched
// here, the page moves at once, and he talks about it while it does.

import * as THREE from '../vendor/three.module.min.js';
import { loadCharacter, skinnedBounds, pickClip, play } from './rig.js?v=222cfe45';
import { mouth, speakBuffer, hush, VISEME, JAW } from './speech.js?v=d7e94a3c';

export const BRAIN = 'https://orb-brain.colinwillowtree.workers.dev';
const canon = n => n.toLowerCase().replace(/[^a-z]/g, '').replace(/mix$/, '');

// --- where things are, for "take me to ..." ----------------------------------
const SYN = {
  '': ['home', 'globe', 'start', 'beginning', 'main page'],
  play: ['play', 'games', 'game', 'apps', 'app'],
  assets: ['assets', 'characters', 'character', 'models', 'store', 'shop', 'buy', 'downloads', 'rigs'],
  scripts: ['scripts', 'script', 'tools', 'cinema 4d', 'c4d', 'tutorial'],
  web: ['websites', 'website', 'web', 'sites'],
  motion: ['motion', 'videos', 'video', 'clips', 'animations', 'cgi'],
  studios: ['studios', 'studio', 'seawillow', 'sea willow', 'majia', 'unknown', 'companies', 'brands'],
  writing: ['writing', 'essays', 'essay', 'articles', 'read'],
  workbench: ['workbench', 'illustrations', 'illustration', 'logos', 'drawings', 'ceramics', 'crafts'],
  about: ['about', 'who are you', 'contact'],
};
const NAV_VERB = /\b(take me|go to|go back|show me|open|navigate|bring me|let me see|jump to|head to|where (are|is|can)|see the|to the)\b/;

export function routeFor(text, items) {
  const t = ' ' + text.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ') + ' ';
  const words = t.trim().split(' ').length;
  if (!NAV_VERB.test(t) && words > 3) return null;
  for (const it of items) if (t.includes(' ' + it.title.toLowerCase() + ' ')) return it.path;
  for (const [path, syn] of Object.entries(SYN)) if (syn.some(w => t.includes(' ' + w + ' '))) return path;
  return null;
}

// --- the brain ------------------------------------------------------------------
function createBrain(known) {
  const log = [];
  return {
    log,
    async ask(text, page, onText) {
      log.push({ role: 'user', content: text });
      if (log.length > 20) log.splice(0, log.length - 20);
      const res = await fetch(BRAIN, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: log, persona: 'colin', known,
          state: { room: false, figure: { who: 'colin', model: 'colin' }, page, site: 'portfolio' } }),
      }).catch(() => null);
      if (!res || !res.ok || !res.body) { log.pop(); throw new Error(res ? 'HTTP ' + res.status : 'unreachable'); }
      const rd = res.body.getReader(), dec = new TextDecoder();
      let raw = '';
      for (;;) {
        const { done, value } = await rd.read(); if (done) break;
        raw += dec.decode(value, { stream: true });
        const cut = raw.indexOf('\u0000'); onText?.((cut >= 0 ? raw.slice(0, cut) : raw).trim());
      }
      const cut = raw.indexOf('\u0000');
      const reply = (cut >= 0 ? raw.slice(0, cut) : raw).trim();
      let frame = {}; try { if (cut >= 0) frame = JSON.parse(raw.slice(cut + 1)); } catch {}
      if (reply) log.push({ role: 'assistant', content: reply }); else log.pop();
      return { reply, show: frame.show || null };
    },
    remember(role, content) { log.push({ role, content }); },
  };
}

async function voice(text, prev, next) {
  const res = await fetch(BRAIN + '/speak', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text, persona: 'colin', marks: 1, prev, next }) });
  if (!res.ok) throw new Error('speak ' + res.status);
  const j = await res.json();
  const bytes = Uint8Array.from(atob(j.audio_base64), c => c.charCodeAt(0));
  return { bytes: bytes.buffer, marks: j.normalized_alignment || j.alignment || null, text };
}

// --- the body --------------------------------------------------------------------
const ACT = { wave: 'waving', dance: 'dance_hiphop_01', happy: 'dance_wiggle_feet', jump: 'dance_wiggle_feet',
  strut: 'walk_fwd_swagger', tiptoe: 'walk_fwd_tiptoe', sad: 'idle_sad_kick', bored: 'idle_exhausted',
  kneel: 'idle_kneeling', fan: 'dance_moonwalk' };

export function createMiniColin({ go, known, items, pageOf }) {
  const dock = document.createElement('div');
  dock.id = 'mini'; dock.className = 'loading';
  dock.innerHTML = `
    <div class="mini-cap" hidden aria-live="polite"></div>
    <div class="mini-panel" hidden>
      <div class="mini-log"></div>
      <form class="mini-ask">
        <input type="text" placeholder="Type to Colin" aria-label="Type to Colin" autocomplete="off">
        <button type="submit" aria-label="Send">↑</button>
      </form>
    </div>
    <div class="mini-tools" hidden>
      <button class="mini-cc" aria-pressed="false" title="Show what he says">CC</button>
      <button class="mini-kb" aria-pressed="false" title="Type instead">⌨</button>
      <button class="mini-off" title="Stop listening">✕</button>
    </div>
    <div class="mini-bubble" hidden role="dialog" aria-label="Colin">
      <p>Hey. Want to talk? I can show you around.</p>
      <div><button class="mini-yes">Talk</button><button class="mini-no" aria-label="Dismiss">✕</button></div>
    </div>
    <button class="mini-body" aria-label="Colin"><canvas></canvas><span class="mini-tag"></span></button>`;
  // he lives ON the strip now, which is part of the page, so he scrolls with it
  const perch = () => document.getElementById('deck') || document.body;
  perch().appendChild(dock);
  const $d = s => dock.querySelector(s);
  const bodyEl = $d('.mini-body');   // his box: what a FLIP moves (see flipMark)
  const canvas = $d('canvas'), panel = $d('.mini-panel'), logEl = $d('.mini-log'), form = $d('form'),
        input = $d('form input'), cap = $d('.mini-cap'), tools = $d('.mini-tools'), tag = $d('.mini-tag');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(22, 1, 0.01, 50);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x80766c, 2.4));
  const key = new THREE.DirectionalLight(0xffffff, 2.0); key.position.set(1.5, 3, 3); scene.add(key);

  let ch = null, head = null, face = [], idle = null, blinkT = 2, blink = 0, dead = false;
  const ZERO2 = new THREE.Vector2(), look = new THREE.Vector2(), lookNow = new THREE.Vector2();
  const headBase = new THREE.Quaternion(), glance = new THREE.Quaternion(), eul = new THREE.Euler();
  // Talking gestures. The rig ships no gesture clips, so the arms are moved in
  // code while he speaks. The axes were MEASURED on colin.glb (which rotation
  // takes each hand forward and up), not guessed: forearm/arm about local Z,
  // +Z on his left, -Z on his right. Same take-it-off-before-the-mixer rule as
  // the head glance, or the offsets would stack every frame.
  const gest = []; let gAmt = 0, gBeat = 0, lastShape = 'rest', pres = 0, presWant = 0;
  const Y = new THREE.Vector3(0, 1, 0);
  const GESTURES = false;   // the code-driven talking hands read badly: off until there is a real Mixamo clip for it
  const PRESENT = { fore: 1.4, arm: 0.5, twist: 1.3 };   // "this is everything": elbows down, forearms out, palms up
  const Z = new THREE.Vector3(0, 0, 1), X = new THREE.Vector3(1, 0, 0);
  addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect();
    look.set(Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / innerWidth * 2)),
             Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height * 0.2)) / innerHeight * 2)));
  }, { passive: true });

  function size() {
    const r = canvas.getBoundingClientRect(); if (!r.width) return;
    renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; camera.updateProjectionMatrix();
  }
  new ResizeObserver(size).observe(canvas);

  /* HIS LITTLE LIFE ON THE DECK. He stands on the bar at the foot of the page
     and gets on with things: stands about, wanders to somewhere else along it,
     now and then does something (a wave, a kick at nothing, a moonwalk), and
     every so often walks off one edge and comes back in from one side a while
     later. Scrolling down to read sends him off the nearest edge so he is not
     in the way; stopping brings him back. All of it is paused while he is
     talking or borrowed by the About page. Positions are the dock's LEFT edge in
     CSS px; his walking speed is his own height per second, converted through
     the camera so the feet do not skate. */
  const LIFE = { x: null, to: 0, mode: 'idle', t: 2 + Math.random() * 3, face: 0, faceNow: 0, gone: false,
                 speed: 0.62, clips: {} };
  const pxPerM = () => { const r = canvas.getBoundingClientRect(); return r.height / (2 * camera.position.z * Math.tan(camera.fov * Math.PI / 360)); };
  const bodyW = () => canvas.getBoundingClientRect().width || 120;
  const lane = () => [8, Math.max(8, innerWidth - bodyW() - 8)];
  let heroDir = 0, groove = false, lookBackOn = false;
  // MUSIC ON: wherever he would stand idle he bops instead. The calmest dance in his file
  // (measured: the least rotation of the six); dance_hiphop_03 is the next most casual.
  const DANCE = 'dance_wiggle_feet';
  /* HIS MOUTH. The export's mouth mesh has no material, so it is coloured here: it is four
     separate pieces -- the upper and lower rows of teeth (the two biggest), and the upper gums
     and the lower gums-and-tongue -- found by welding the vertices and grouping what connects. */
  function paintMouth(o) {
    const g = o.geometry, P = g.attributes.position, I = g.index, n = P.count;
    const id = new Map(), par = [], vid = new Int32Array(n);
    const find = x => { while (par[x] !== x) x = par[x] = par[par[x]]; return x; };
    for (let i = 0; i < n; i++) { const k = P.getX(i).toFixed(4) + ',' + P.getY(i).toFixed(4) + ',' + P.getZ(i).toFixed(4);
      if (!id.has(k)) { id.set(k, id.size); par.push(id.size - 1); } vid[i] = id.get(k); }
    if (I) for (let f = 0; f < I.count; f += 3) { const a = find(vid[I.getX(f)]); par[find(vid[I.getX(f + 1)])] = a; par[find(vid[I.getX(f + 2)])] = a; }
    const size = new Map(); for (let i = 0; i < n; i++) { const r = find(vid[i]); size.set(r, (size.get(r) || 0) + 1); }
    const teeth = new Set([...size].sort((a, b) => b[1] - a[1]).slice(0, 2).map(x => x[0]));
    const white = new THREE.Color(0xf4efe6), pink = new THREE.Color(0xc76a72), col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) (teeth.has(find(vid[i])) ? white : pink).toArray(col, i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    o.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0 });
  }
  function lifeClip(name) {
    if (name === 'idle' && groove && state === 'off' && LIFE.clips.dance) name = 'dance';
    const c = LIFE.clips[name]; if (!c || LIFE.cur === c) return; LIFE.cur = c;
    play(ch.mixer, c, { fade: 0.35 });
  }
  function walkTo(x) { LIFE.to = x; LIFE.mode = 'walk'; LIFE.face = x > LIFE.x ? 1 : -1; lifeClip(LIFE.walk);
    if (LIFE.exit && bubble) bubble.hidden = true; }
  function lifeDecide() {
    const [lo, hi] = lane(), r = Math.random();
    if (LIFE.gone) {                    // back in, from whichever side
      const fromLeft = Math.random() < 0.5;
      LIFE.x = fromLeft ? -bodyW() - 10 : innerWidth + 10; LIFE.gone = false; dock.classList.remove('away');
      walkTo(lo + Math.random() * (hi - lo)); return;
    }
    if (r < 0.12) {                     // off an edge for a while
      LIFE.exit = true; walkTo(LIFE.x < innerWidth / 2 ? -bodyW() - 20 : innerWidth + 20); return;
    }
    if (r < 0.55) {                     // somewhere else along the bar, not a shuffle
      let x; do { x = lo + Math.random() * (hi - lo); } while (Math.abs(x - LIFE.x) < (hi - lo) * 0.25 && hi - lo > 60);
      LIFE.walk = Math.random() < 0.2 && LIFE.clips.swagger ? 'swagger' : 'walk'; walkTo(x); return;
    }
    LIFE.mode = 'idle'; LIFE.face = 0; LIFE.t = 3 + Math.random() * 6;
    const fid = ['kick', 'wave', 'moon', 'tired'].filter(k => LIFE.clips[k]);
    if (r > 0.8 && fid.length) { const k = fid[(Math.random() * fid.length) | 0];
      LIFE.cur = null; play(ch.mixer, LIFE.clips[k], { once: true, back: LIFE.clips.idle, fade: 0.3 }); LIFE.cur = LIFE.clips.idle; }
    else lifeClip('idle');
  }
  /* A page travel: the world pans under him, and he walks the way it goes --
     a few steps' worth of screen, mostly treading while the page slides past,
     which is what makes the pan read as the camera following him. */
  function stroll(dir, ms) {
    if (!ch || dock.classList.contains('hero') || state !== 'off') return;
    if (LIFE.gone) { LIFE.gone = false; LIFE.exit = false; dock.classList.remove('away'); LIFE.x = dir > 0 ? -bodyW() : innerWidth; }
    const [lo, hi] = lane();
    LIFE.tread = ms / 1000; LIFE.face = dir; LIFE.faceNow = dir; LIFE.mode = 'tread';
    LIFE.to = Math.max(lo, Math.min(hi, LIFE.x + dir * 36));
    LIFE.walk = 'walk'; lifeClip('walk');
  }
  function lifeStep(dt) {
    if (!ch) return;
    if (dock.classList.contains('hero')) {
      // borrowed by a page: he stands centre stage, facing out, whatever he was doing on the strip
      // (or, in the line-up, walks with the line when it shifts: `heroWalk`)
      if (LIFE.mode !== 'idle') { LIFE.mode = 'idle'; LIFE.t = 3; }
      const hd = state !== 'off' ? 0 : heroDir;   // talking: always facing out, never walking
      LIFE.face = hd; lifeClip(hd ? 'walk' : 'idle');
      LIFE.faceNow += (hd - LIFE.faceNow) * (1 - Math.exp(-9 * dt));
      // on a game's page he turns round to look at the game behind him (not while walking or talking)
      const back = lookBackOn && !hd && state === 'off' ? 1 : 0;
      LIFE.back = (LIFE.back || 0) + (back - (LIFE.back || 0)) * (1 - Math.exp(-4 * dt));
      ch.model.rotation.y = LIFE.faceNow * Math.PI / 2 + LIFE.back * Math.PI * 0.82;
      dock.style.transform = '';
      return;
    }
    if (LIFE.mode === 'tread') {
      LIFE.tread -= dt;
      LIFE.x += (LIFE.to - LIFE.x) * (1 - Math.exp(-3 * dt));
      ch.model.rotation.y = LIFE.faceNow * Math.PI / 2;
      dock.style.transform = `translateX(${LIFE.x}px)`;
      if (LIFE.tread <= 0) { LIFE.mode = 'idle'; LIFE.face = 0; LIFE.t = 2 + Math.random() * 3; lifeClip('idle'); }
      else return;
    }
    if (state !== 'off') {
      // talking: he comes to the right-hand end, where the conversation opens
      const hi = lane()[1];
      if (LIFE.gone || LIFE.x === null) { LIFE.x = innerWidth + 10; LIFE.gone = false; LIFE.exit = false; dock.classList.remove('away'); }
      if (Math.abs(LIFE.x - hi) > 1) { if (LIFE.mode !== 'walk' || LIFE.to !== hi) { LIFE.walk = 'walk'; walkTo(hi); } }
      else if (LIFE.mode === 'walk') { LIFE.mode = 'idle'; LIFE.face = 0; lifeClip('idle'); }
      if (LIFE.mode === 'walk') {
        const v = LIFE.speed * pxPerM() * (camera.userData.h || 1), d = LIFE.to - LIFE.x;
        if (Math.abs(LIFE.faceNow - LIFE.face) < 0.35) LIFE.x += Math.sign(d) * Math.min(Math.abs(d), v * 1.4 * dt);
      }
      LIFE.faceNow += (LIFE.face - LIFE.faceNow) * (1 - Math.exp(-9 * dt));
      ch.model.rotation.y = LIFE.faceNow * Math.PI / 2;
      dock.style.transform = `translateX(${LIFE.x}px)`; dock.classList.add('rside');
      return;
    }
    if (LIFE.x === null) { const [lo, hi] = lane(); LIFE.x = hi; }
    const reading = false;   // he is part of the page now: scrolling away from him is not a reason to leave
    if (reading && !LIFE.gone && !LIFE.exit) { LIFE.exit = true; LIFE.walk = 'walk';
      walkTo(LIFE.x < innerWidth / 2 ? -bodyW() - 20 : innerWidth + 20); }
    if (LIFE.mode === 'walk') {
      const v = LIFE.speed * (LIFE.walk === 'swagger' ? 0.85 : 1) * pxPerM() * (camera.userData.h || 1);
      const d = LIFE.to - LIFE.x, step = Math.sign(d) * Math.min(Math.abs(d), v * dt);
      // only move once he has actually turned, or he glides sideways while facing out
      if (Math.abs(LIFE.faceNow - LIFE.face) < 0.35) LIFE.x += step;
      if (Math.abs(LIFE.to - LIFE.x) < 0.5) {
        if (LIFE.exit) { LIFE.exit = false; LIFE.gone = true; LIFE.mode = 'gone'; dock.classList.add('away');
          LIFE.t = reading ? 1e9 : 5 + Math.random() * 12; lifeClip('idle'); }
        else { LIFE.mode = 'idle'; LIFE.face = 0; LIFE.t = 2.5 + Math.random() * 5; lifeClip('idle'); }
      }
    } else {
      if (LIFE.gone && reading) LIFE.t = Math.max(LIFE.t, 1.2);
      else if (LIFE.gone && LIFE.t > 1.2) LIFE.t = Math.min(LIFE.t, 1.2 + Math.random() * 6);
      LIFE.t -= dt; if (LIFE.t <= 0) lifeDecide();
    }
    // turning is a turn, not a snap: profile to walk, back to the viewer to stand
    LIFE.faceNow += (LIFE.face - LIFE.faceNow) * (1 - Math.exp(-9 * dt));
    ch.model.rotation.y = LIFE.faceNow * Math.PI / 2;
    dock.style.transform = `translateX(${LIFE.x}px)`;
    dock.classList.toggle('rside', LIFE.x > innerWidth / 2);
  }

  const clock = new THREE.Clock();
  function frame() {
    if (dead) return;
    requestAnimationFrame(frame);
    if (document.hidden || !ch) return;
    const dt = Math.min(0.05, clock.getDelta());
    lifeStep(dt);
    { const r = bodyEl.getBoundingClientRect(); if (r.width && r.height && !bodyEl.style.transform) flipSeen = r; }   // for a FLIP from a stage that has since been hidden
    // Take last frame's glance OFF before the mixer runs: if the idle has no
    // head track, nothing else would, and the offset would stack every frame.
    if (head) head.quaternion.copy(headBase);
    for (const g of gest) g.bone.quaternion.copy(g.base);
    ch.mixer.update(dt);
    // gestures: ease in while he talks, with a little beat on each open vowel
    const talking = mouth.talking && mouth.who === 'colin';
    gAmt += ((talking && GESTURES ? 1 : 0) - gAmt) * (1 - Math.exp(-3 * dt));
    if (talking && mouth.shape !== lastShape && (mouth.shape === 'AI' || mouth.shape === 'O')) gBeat = 1;
    lastShape = mouth.shape; gBeat *= Math.exp(-5 * dt);
    const tt = performance.now() / 1000;
    for (const g of gest) {
      g.base.copy(g.bone.quaternion);
      if (gAmt < 0.002) continue;
      const n = Math.sin(tt * 1.3 + g.seed) * 0.6 + Math.sin(tt * 2.9 + g.seed * 2) * 0.4;      // -1..1, per arm
      if (g.fore) g.bone.rotateOnAxis(Z, g.side * gAmt * (0.55 + 0.35 * n + 0.25 * gBeat));
      else { g.bone.rotateOnAxis(Z, g.side * gAmt * (0.14 + 0.1 * n)); g.bone.rotateOnAxis(X, -gAmt * 0.08 * (1 + n)); }
    }
    // PRESENTING (the home hero): forearms raised forward and out, palms turned up, held
    // with a slow breath in it -- on top of the idle, eased in and out like the gestures
    pres += (presWant - pres) * (1 - Math.exp(-3 * dt));
    if (pres > 0.002) for (const g of gest) {
      const b = 1 + 0.04 * Math.sin(tt * 1.1 + g.seed);
      if (g.fore) { g.bone.rotateOnAxis(Z, g.side * pres * PRESENT.fore * b); g.bone.rotateOnAxis(Y, -g.side * pres * PRESENT.twist); }
      else g.bone.rotateOnAxis(Z, -g.side * pres * PRESENT.arm);
    }
    // look toward the pointer, on top of whatever the clip did to the head
    lookNow.lerp(state !== 'off' ? ZERO2 : look, 1 - Math.exp(-4 * dt));   // talking to you: he looks at you
    if (head) {
      headBase.copy(head.quaternion);
      glance.setFromEuler(eul.set(lookNow.y * 0.25, lookNow.x * 0.45, 0));
      head.quaternion.multiply(glance);
    }
    // face: base shape always on, blink, visemes
    blinkT -= dt; if (blinkT < 0) { blink = 1; blinkT = 2 + Math.random() * 4; }
    blink = Math.max(0, blink - dt * 7);
    const want = {};
    want.colinhead = 1;
    want.eyeblinkl = want.eyeblinkr = blink > 0.5 ? 1 : blink * 2;
    const sh = mouth.talking ? mouth.shape : 'rest';
    for (const [n, v] of Object.entries(VISEME[sh] || {})) want[canon(n)] = v;
    want.jawopen = JAW[sh] || 0;
    for (const f of face) {
      for (const [k, i] of f.index) {
        const target = want[k] ?? 0;
        f.infl[i] = k === 'colinhead' ? 1 : f.infl[i] + (target - f.infl[i]) * (1 - Math.exp(-28 * dt));
      }
    }
    renderer.render(scene, camera);
  }

  loadCharacter(new URL('../models/colin.glb', import.meta.url).href).then(c => {
    ch = c;
    // Loose, unskinned meshes in a character file are exporter donors (a spare
    // head per blend shape), not part of him.
    const loose = []; let skinned = 0;
    c.model.traverse(o => { if (o.isSkinnedMesh) skinned++; else if (o.isMesh) loose.push(o); });
    if (skinned) loose.forEach(o => o.removeFromParent());
    c.model.traverse(o => {
      // bones BEFORE the mesh-only return, or the head glance and the arms never find theirs
      if (o.isBone && /head$/i.test(o.name) && !head) { head = o; headBase.copy(o.quaternion); }
      const m = o.isBone && o.name.match(/(Left|Right)(ForeArm|Arm)$/);
      if (m) gest.push({ bone: o, side: m[1] === 'Left' ? 1 : -1, fore: m[2] === 'ForeArm', base: o.quaternion.clone(), seed: Math.random() * 10 });
      if (!o.isMesh) return;
      if (/teeth/i.test(o.name) && !o.material.map) paintMouth(o);   // no material in the export: teeth white, gums and tongue pink
      if (o.morphTargetDictionary) face.push({ infl: o.morphTargetInfluences,
        index: new Map(Object.entries(o.morphTargetDictionary).map(([n, i]) => [canon(n), i])) });
    });
    scene.add(c.model);
    idle = pickClip(c.clips, 'idle_neutral', 'neutral_idle');
    Object.assign(LIFE.clips, { dance: c.clips.find(x => x.name === DANCE) || null, idle, walk: pickClip(c.clips, 'walk_fwd_neutral'), swagger: pickClip(c.clips, 'walk_fwd_swagger'),
      kick: pickClip(c.clips, 'idle_sad_kick'), wave: pickClip(c.clips, 'waving'), moon: pickClip(c.clips, 'dance_moonwalk'),
      tired: pickClip(c.clips, 'idle_exhausted') });
    LIFE.walk = 'walk'; LIFE.cur = idle;
    play(c.mixer, idle, { fade: 0 }); c.mixer.update(0.01);
    const box = skinnedBounds(c.model), h = box.max.y - box.min.y;
    c.model.position.y -= box.min.y;
    c.model.position.x -= (box.min.x + box.max.x) / 2;
    const dist = h * 0.62 / Math.tan(camera.fov * Math.PI / 360);
    camera.position.set(0, h * 0.62, dist); camera.lookAt(0, h * 0.5, 0); camera.userData.h = h;
    size(); dock.classList.remove('loading');
    frame();
  }).catch(err => { console.warn('mini colin', err); dock.remove(); dead = true; });

  function act(name) {
    if (!ch) return;
    const clip = pickClip(ch.clips, ACT[name] || name);
    if (clip && clip !== idle) play(ch.mixer, clip, { once: true, back: idle, fade: 0.3 });
  }

  // --- conversation -------------------------------------------------------------
  // Tap him once and he is ON: he listens, answers out loud, and moves the page
  // himself. Text stays hidden unless you ask for it (CC), and typing is there
  // for when talking isn't an option (the keyboard button).
  const brain = createBrain(known);
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let ctx = null, state = 'off', rec = null, heard = '', gapT = 0, cc = false, turn = 0;
  const watchers = new Set();
  const setState = s2 => { state = s2; dock.dataset.state = s2; watchers.forEach(f => f(s2 !== 'off'));
    tag.textContent = { off: '', listening: 'Listening', thinking: 'Thinking', speaking: 'Talking' }[s2];
    if (s2 !== 'off') bubble.hidden = true; };
  const log = (who, text) => { const p = document.createElement('p'); p.className = who; p.textContent = text;
    logEl.appendChild(p); while (logEl.children.length > 10) logEl.firstChild.remove(); logEl.scrollTop = 1e6; return p; };
  let capT = 0;
  const caption = (text, force = false) => {
    if (!cc && !force) return;
    cap.textContent = text; cap.hidden = !text; clearTimeout(capT);
    if (text) capT = setTimeout(() => { if (state !== 'speaking') cap.hidden = true; }, 6000);
  };

  // Every reply is spoken a sentence at a time, so he starts talking on the
  // first sentence instead of waiting for the whole answer. The sentences are
  // FETCHED in parallel and PLAYED in order.
  function speaker(myTurn) {
    const queue = []; let said = '', idx = 0, active = false, running = Promise.resolve();
    async function run() {
      active = true;
      while (idx < queue.length) {       // re-checked every pass: sentences keep arriving while he talks
        const job = queue[idx++];
        if (myTurn !== turn) break;
        let v; try { v = await job; } catch (err) { console.warn('speak', err); continue; }
        if (myTurn !== turn || !v) break;
        const buf = await ctx.decodeAudioData(v.bytes.slice(0));
        if (myTurn !== turn) break;
        setState('speaking'); caption(v.text);
        await speakBuffer(ctx, buf, v.marks, v.text).done;
      }
      active = false;
    }
    return {
      add(sentence) {
        const prev = said.slice(-300); said += ' ' + sentence;
        const job = voice(sentence, prev); job.catch(() => {}); queue.push(job);
        if (!active) running = run();
      },
      finished: () => running,
    };
  }
  const SENT = /[^.!?\n]+[.!?]+["')\]]*\s+|[^.!?\n]+\n+/g;

  async function ask(text) {
    text = text.trim(); if (!text) return;
    const my = ++turn; hush();
    stopListening(); setState('thinking'); log('you', text);
    const path = routeFor(text, items);
    if (path !== null) { go(path); act('wave'); }
    const sp = speaker(my); let spoken = 0, said = 0;
    const line = log('him', '…');
    /* He was WORDY: asked to go somewhere, he went and then narrated the whole
       section unprompted. The page moving IS the answer, so a navigation turn
       gets one sentence and everything else gets three -- asked for in the
       prompt, and enforced here, because a model asked for brevity is not a
       model that is brief. Whatever runs past the cap is neither said nor shown. */
    const cap = path !== null ? 1 : 3;
    const clip = t => { const m = t.match(SENT) || []; let n = 0, out = '';
      for (const s2 of m) { if (n++ >= cap) break; out += s2; } return n > cap || m.length >= cap ? out.trim() : t; };
    try {
      const { reply, show } = await brain.ask(
        path !== null
          ? `${text}\n(The page has just taken them to /${path || ''}. Reply with ONE short casual sentence, under twelve words. Do not describe or list what is there.)`
          : `${text}\n(Keep it short: two sentences at most, like talking, no lists.)`, pageOf(),
        t => {
          if (my !== turn) return;
          line.textContent = clip(t);
          // hand each finished sentence to the voice as soon as it exists
          const done = t.slice(spoken).match(SENT);
          if (done) for (const s2 of done) { if (said < cap) { sp.add(s2.trim()); said++; } spoken += s2.length; }
        });
      if (my !== turn) return;
      const rest = reply.slice(spoken).trim();
      if (rest && said < cap) sp.add(rest);
      line.textContent = clip(reply);
      if (show?.act) act(show.act);
      if (show?.pages && path === null) go('');
      await sp.finished();
    } catch (err) {
      console.warn('colin', err);
      const msg = location.hostname.endsWith('github.io')
        ? "I can't reach my brain right now. Try me again in a minute."
        : "I can only talk on colinwillow.github.io for now.";
      line.textContent = msg; caption(msg, true);
    }
    if (my === turn && state !== 'off') { setState('listening'); setTimeout(listen, 350); }
  }

  // Hands-free listening. The sentence is over when the words stop CHANGING
  // for a beat (a room with a fridge in it is never quiet enough for the
  // recogniser's own end-of-speech). He never listens while he is talking,
  // or he would hear himself.
  function listen() {
    if (!SR || state !== 'listening' || rec) return;
    heard = '';
    rec = new SR(); rec.lang = 'en-US'; rec.interimResults = true; rec.continuous = true;
    rec.onresult = ev => {
      heard = [...ev.results].map(r => r[0].transcript).join(' ').trim();
      if (cc) caption('“' + heard + '”');
      clearTimeout(gapT);
      gapT = setTimeout(() => { const h = heard; if (h) ask(h); }, 750);
    };
    rec.onerror = e => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { caption("I need the microphone to hear you. You can type instead.", true); openKeys(true); } };
    rec.onend = () => { rec = null; if (state === 'listening') setTimeout(listen, 250); };  // Safari drops sessions; pick it back up
    try { rec.start(); } catch { rec = null; }
  }
  function stopListening() { clearTimeout(gapT); if (rec) { const r = rec; rec = null; r.onend = null; try { r.abort(); } catch {} } }

  async function wake() {
    // Everything that must happen INSIDE the tap happens here, first.
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    await ctx.resume();
    const blip = ctx.createBufferSource(); blip.buffer = ctx.createBuffer(1, 1, 22050); blip.connect(ctx.destination); blip.start();
    dock.classList.add('on'); tools.hidden = false; act('wave');
    const my = ++turn, sp = speaker(my);
    const hi = SR ? "Hey, I'm Colin. Well, a small one. Just talk to me, or tell me where you want to go."
                  : "Hey, I'm Colin. Type to me down here, or tell me where you want to go.";
    brain.remember('assistant', hi); log('him', hi);
    setState('speaking');
    sp.add(hi);
    if (!SR) openKeys(true);
    await sp.finished().catch(() => {});
    if (my === turn) { setState('listening'); listen(); }
  }
  function sleep() {
    turn++; stopListening(); hush(); setState('off'); dock.classList.remove('on');
    tools.hidden = true; panel.hidden = true; cap.hidden = true;
  }
  function openKeys(on) {
    panel.hidden = !on; $d('.mini-kb').setAttribute('aria-pressed', String(on));
    if (on) setTimeout(() => input.focus({ preventScroll: true }), 50);
  }

  /* Talking is an Easter egg, not a button on the page: tap him and he asks,
     in a bubble you can wave away. Once a visit he offers on his own, a while
     after you arrive, and never again once you have said no. */
  const bubble = $d('.mini-bubble');
  let offered = false; try { offered = !!sessionStorage.getItem('cw.colinAsked'); } catch {}
  const offer = () => { if (state !== 'off' || dock.classList.contains('away')) return;
    bubble.hidden = false; offered = true; try { sessionStorage.setItem('cw.colinAsked', '1'); } catch {}
    if (ch) act('wave'); };
  // (he used to offer by himself after a while; he does not -- talking is found, not pushed)
  $d('.mini-yes').onclick = () => { bubble.hidden = true; wake(); };
  $d('.mini-no').onclick = () => { bubble.hidden = true; };
  $d('.mini-body').onclick = () => {
    if (state === 'off') { if (bubble.hidden) offer(); else bubble.hidden = true; }
    else if (state === 'speaking') { turn++; hush(); setState('listening'); listen(); }   // tap to interrupt him
  };
  $d('.mini-off').onclick = sleep;
  $d('.mini-cc').onclick = function () { cc = !cc; this.setAttribute('aria-pressed', String(cc)); if (!cc) cap.hidden = true; };
  $d('.mini-kb').onclick = () => openKeys(panel.hidden);
  form.onsubmit = e => { e.preventDefault(); const t = input.value; input.value = ''; if (state === 'off') wake().then(() => ask(t)); else ask(t); };
  setState('off');

  // Hero mode: the About page borrows him, big, in its own frame.
  const home = { parent: document.body, next: null };
  /* MOVING HIM WITHOUT A SNAP (FLIP). He is one element moved between stages of different
     sizes, so a move is a jump. Measure where his body is before the move, move him, then
     put him straight back where he WAS with a transform and let it ease off: he glides and
     grows (or shrinks) into his new place, anchored at his feet so he stays on the floor.
     Several moves in one task (About lets him go, the stage takes him) are one glide, from
     where he was first to where he ends up. */
  let flipFrom = null, flipQueued = false, flipSeen = null;
  function flipMark() {
    // where he was: now, or -- if the page has already hidden the stage he was on (the Colin
    // page hides the hero box before it takes him) -- where he was last seen
    if (!flipFrom) { const r = bodyEl.getBoundingClientRect(); flipFrom = r.width && r.height ? r : flipSeen; }
    if (!flipQueued) { flipQueued = true; requestAnimationFrame(flipPlay); }
  }
  function flipPlay() {
    flipQueued = false; const a = flipFrom; flipFrom = null; if (!a) return;
    const b = bodyEl.getBoundingClientRect(); if (!b.width || !b.height) return;
    const k = a.height / b.height, dx = (a.left + a.width / 2) - (b.left + b.width / 2), dy = a.bottom - b.bottom;
    if (Math.abs(dx) < 2 && Math.abs(dy) < 2 && Math.abs(k - 1) < 0.02) return;
    bodyEl.style.transition = 'none'; bodyEl.style.transformOrigin = '50% 100%';
    bodyEl.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${k.toFixed(4)})`;
    bodyEl.getBoundingClientRect();
    bodyEl.style.transition = 'transform .75s cubic-bezier(.22,.8,.2,1)'; bodyEl.style.transform = '';
  }
  function adopt(host, { present = false } = {}) { heroDir = 0; presWant = present ? 1 : 0; if (!host) return; if (dock.parentElement === host) return; flipMark(); host.appendChild(dock); dock.classList.add('hero'); if (bubble) bubble.hidden = true; size(); }
  function release() { heroDir = 0; presWant = 0; if (dock.parentElement !== perch()) { flipMark(); perch().appendChild(dock); dock.classList.remove('hero'); size(); } }
  /** Where his head is on screen (client px), for things that orbit it. */
  const hv = new THREE.Vector3();
  function headScreen() {
    if (!head) return null;
    head.getWorldPosition(hv); hv.y += 0.06; hv.project(camera);
    const r = canvas.getBoundingClientRect();
    return { x: r.left + (hv.x * 0.5 + 0.5) * r.width, y: r.top + (-hv.y * 0.5 + 0.5) * r.height, w: r.width, h: r.height };
  }
  /* Handing him to the Characters line-up and back. `body()` is where he is drawn
     right now (client px) and how tall he stands in it; `standAt(cx)` puts him back on
     the strip with his middle at screen x `cx`, standing, facing out -- where the
     line-up's copy of him last was, so it reads as one Colin, not two. */
  function body() { if (!ch) return null; const r = canvas.getBoundingClientRect(); return { cx: r.left + r.width / 2, px: r.height / 1.24 }; }
  function standAt(cx) {
    if (!ch) return;
    LIFE.gone = false; LIFE.exit = false; dock.classList.remove('away');
    LIFE.x = cx - bodyW() / 2; LIFE.mode = 'idle'; LIFE.face = 0; LIFE.faceNow = 0; LIFE.t = 3 + Math.random() * 4; lifeClip('idle');
  }
  const present = v => { presWant = v ? 1 : 0; };
  const heroWalk = d => { heroDir = d || 0; };
  const grooveSet = on => { on = !!on; if (on === groove) return; groove = on;
    if (ch && (LIFE.cur === LIFE.clips.idle || LIFE.cur === LIFE.clips.dance)) lifeClip('idle'); };
  const watch = f => { watchers.add(f); f(state !== 'off'); return () => watchers.delete(f); };
  return { act, ask, wake, sleep, adopt, release, present, heroWalk, lookBack: v => { lookBackOn = !!v; }, watch, groove: grooveSet, headScreen, stroll, body, standAt, get awake() { return state !== 'off'; } };
}
