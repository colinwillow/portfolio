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
import { loadCharacter, skinnedBounds, pickClip, play } from './rig.js?v=0090c5af';
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
    <button class="mini-body" aria-label="Talk to Colin"><canvas></canvas><span class="mini-tag">Tap to talk</span></button>`;
  document.body.appendChild(dock);
  const $d = s => dock.querySelector(s);
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
  const look = new THREE.Vector2(), lookNow = new THREE.Vector2();
  const headBase = new THREE.Quaternion(), glance = new THREE.Quaternion(), eul = new THREE.Euler();
  // Talking gestures. The rig ships no gesture clips, so the arms are moved in
  // code while he speaks. The axes were MEASURED on colin.glb (which rotation
  // takes each hand forward and up), not guessed: forearm/arm about local Z,
  // +Z on his left, -Z on his right. Same take-it-off-before-the-mixer rule as
  // the head glance, or the offsets would stack every frame.
  const gest = []; let gAmt = 0, gBeat = 0, lastShape = 'rest';
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

  const clock = new THREE.Clock();
  function frame() {
    if (dead) return;
    requestAnimationFrame(frame);
    if (document.hidden || !ch) return;
    const dt = Math.min(0.05, clock.getDelta());
    // Take last frame's glance OFF before the mixer runs: if the idle has no
    // head track, nothing else would, and the offset would stack every frame.
    if (head) head.quaternion.copy(headBase);
    for (const g of gest) g.bone.quaternion.copy(g.base);
    ch.mixer.update(dt);
    // gestures: ease in while he talks, with a little beat on each open vowel
    const talking = mouth.talking && mouth.who === 'colin';
    gAmt += ((talking ? 1 : 0) - gAmt) * (1 - Math.exp(-3 * dt));
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
    // look toward the pointer, on top of whatever the clip did to the head
    lookNow.lerp(look, 1 - Math.exp(-4 * dt));
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
    let headMat = null;
    c.model.traverse(o => { if (o.isMesh && /head/i.test(o.name) && o.material.map) headMat = o.material; });
    c.model.traverse(o => {
      if (!o.isMesh) return;
      if (/teeth/i.test(o.name) && !o.material.map && headMat) o.material = headMat;  // untextured teeth read as white
      if (o.morphTargetDictionary) face.push({ infl: o.morphTargetInfluences,
        index: new Map(Object.entries(o.morphTargetDictionary).map(([n, i]) => [canon(n), i])) });
      if (o.isBone && /head$/i.test(o.name) && !head) { head = o; headBase.copy(o.quaternion); }
      const m = o.isBone && o.name.match(/(Left|Right)(ForeArm|Arm)$/);
      if (m) gest.push({ bone: o, side: m[1] === 'Left' ? 1 : -1, fore: m[2] === 'ForeArm', base: o.quaternion.clone(), seed: Math.random() * 10 });
    });
    scene.add(c.model);
    idle = pickClip(c.clips, 'idle_neutral', 'neutral_idle');
    play(c.mixer, idle, { fade: 0 }); c.mixer.update(0.01);
    const box = skinnedBounds(c.model), h = box.max.y - box.min.y;
    c.model.position.y -= box.min.y;
    c.model.position.x -= (box.min.x + box.max.x) / 2;
    const dist = h * 0.62 / Math.tan(camera.fov * Math.PI / 360);
    camera.position.set(0, h * 0.62, dist); camera.lookAt(0, h * 0.5, 0);
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
  const setState = s2 => { state = s2; dock.dataset.state = s2;
    tag.textContent = { off: 'Tap to talk', listening: 'Listening', thinking: 'Thinking', speaking: 'Talking' }[s2]; };
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

  $d('.mini-body').onclick = () => {
    if (state === 'off') wake();
    else if (state === 'speaking') { turn++; hush(); setState('listening'); listen(); }   // tap to interrupt him
  };
  $d('.mini-off').onclick = sleep;
  $d('.mini-cc').onclick = function () { cc = !cc; this.setAttribute('aria-pressed', String(cc)); if (!cc) cap.hidden = true; };
  $d('.mini-kb').onclick = () => openKeys(panel.hidden);
  form.onsubmit = e => { e.preventDefault(); const t = input.value; input.value = ''; if (state === 'off') wake().then(() => ask(t)); else ask(t); };
  setState('off');

  // Hero mode: the About page borrows him, big, in its own frame.
  const home = { parent: document.body, next: null };
  function adopt(host) { if (!host) return; host.appendChild(dock); dock.classList.add('hero'); size(); }
  function release() { if (dock.parentElement !== document.body) { document.body.appendChild(dock); dock.classList.remove('hero'); size(); } }
  /** Where his head is on screen (client px), for things that orbit it. */
  const hv = new THREE.Vector3();
  function headScreen() {
    if (!head) return null;
    head.getWorldPosition(hv); hv.y += 0.06; hv.project(camera);
    const r = canvas.getBoundingClientRect();
    return { x: r.left + (hv.x * 0.5 + 0.5) * r.width, y: r.top + (-hv.y * 0.5 + 0.5) * r.height, w: r.width, h: r.height };
  }
  return { act, ask, wake, sleep, adopt, release, headScreen, get awake() { return state !== 'off'; } };
}
