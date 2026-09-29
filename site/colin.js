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
import { loadCharacter, skinnedBounds, pickClip, play } from './rig.js';
import { mouth, speakParts, hush, VISEME, JAW } from './speech.js';

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

async function voice(text) {
  const res = await fetch(BRAIN + '/speak', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text, persona: 'colin', marks: 1 }) });
  if (!res.ok) throw new Error('speak ' + res.status);
  const j = await res.json();
  const bin = Uint8Array.from(atob(j.audio_base64), c => c.charCodeAt(0));
  return { src: URL.createObjectURL(new Blob([bin], { type: 'audio/mpeg' })), marks: j.normalized_alignment || j.alignment || null, text };
}

// --- the body --------------------------------------------------------------------
const ACT = { wave: 'waving', dance: 'dance_hiphop_01', happy: 'dance_wiggle_feet', jump: 'dance_wiggle_feet',
  strut: 'walk_fwd_swagger', tiptoe: 'walk_fwd_tiptoe', sad: 'idle_sad_kick', bored: 'idle_exhausted',
  kneel: 'idle_kneeling', fan: 'dance_moonwalk' };

export function createMiniColin({ go, known, items, pageOf }) {
  const dock = document.createElement('div');
  dock.id = 'mini'; dock.className = 'loading';
  dock.innerHTML = `
    <div class="mini-panel" hidden>
      <div class="mini-log" aria-live="polite"></div>
      <form class="mini-ask">
        <input type="text" placeholder="Ask me anything, or say where to go" aria-label="Talk to Colin" autocomplete="off">
        <button type="button" class="mini-mic" aria-label="Hold to talk" title="Hold to talk">●</button>
        <button type="button" class="mini-mute" aria-label="Voice on" title="Voice on/off">🔊</button>
      </form>
    </div>
    <button class="mini-body" aria-label="Talk to mini Colin"><canvas></canvas><span class="mini-tag">Colin</span></button>`;
  document.body.appendChild(dock);
  const canvas = dock.querySelector('canvas'), panel = dock.querySelector('.mini-panel'),
        logEl = dock.querySelector('.mini-log'), form = dock.querySelector('form'),
        input = form.querySelector('input'), mic = dock.querySelector('.mini-mic'), mute = dock.querySelector('.mini-mute');

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
    ch.mixer.update(dt);
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

  // --- conversation ------------------------------------------------------------
  const brain = createBrain(known);
  let voiceOn = true, greeted = false, busy = false;
  const say = (who, text) => {
    const p = document.createElement('p'); p.className = who; p.textContent = text;
    logEl.appendChild(p); while (logEl.children.length > 8) logEl.firstChild.remove();
    logEl.scrollTop = logEl.scrollHeight; return p;
  };
  function open() {
    panel.hidden = false; dock.classList.add('open');
    if (!greeted) {
      greeted = true;
      const hi = "Hey, I'm Colin. Well, a small one. Ask me anything, or tell me where you want to go.";
      say('him', hi); brain.remember('assistant', hi); act('wave');
    }
    setTimeout(() => input.focus({ preventScroll: true }), 50);
  }
  dock.querySelector('.mini-body').onclick = () => (panel.hidden ? open() : (panel.hidden = true, dock.classList.remove('open')));
  mute.onclick = () => { voiceOn = !voiceOn; mute.textContent = voiceOn ? '🔊' : '🔇'; if (!voiceOn) hush(); };

  async function ask(text) {
    text = text.trim(); if (!text || busy) return;
    busy = true; say('you', text); hush();
    const path = routeFor(text, items);
    if (path !== null) { go(path); act('wave'); }
    const line = say('him thinking', '…');
    try {
      const { reply, show } = await brain.ask(
        path !== null ? `${text}\n(The page has just taken them to /${path || ''}.)` : text,
        pageOf(), t => { if (t) { line.textContent = t; line.classList.remove('thinking'); } });
      line.textContent = reply || '…'; line.classList.remove('thinking');
      if (show?.act) act(show.act);
      if (show?.pages && path === null) go('');
      if (voiceOn && reply) { const v = await voice(reply); speakParts([v], { who: 'colin', onEnd: () => URL.revokeObjectURL(v.src) }); }
    } catch (err) {
      console.warn('colin', err);
      line.classList.remove('thinking');
      line.textContent = location.hostname.endsWith('github.io')
        ? "I can't reach my brain right now. Try me again in a minute."
        : "I can only talk on colinwillow.github.io for now — my brain doesn't take calls from here yet.";
    } finally { busy = false; }
  }
  form.onsubmit = e => { e.preventDefault(); const t = input.value; input.value = ''; ask(t); };

  // Hold to talk, through the browser's own speech recognition (no key).
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) mic.remove();
  else {
    let rec = null, heard = '';
    const start = e => {
      e.preventDefault(); hush(); heard = ''; mic.classList.add('on');
      rec = new SR(); rec.lang = 'en-US'; rec.interimResults = true; rec.continuous = true;
      rec.onresult = ev => { heard = [...ev.results].map(r => r[0].transcript).join(' '); input.value = heard; };
      rec.onerror = () => {}; rec.start();
    };
    const stop = () => { if (!rec) return; mic.classList.remove('on'); const r = rec; rec = null;
      setTimeout(() => { r.stop(); if (heard.trim()) { input.value = ''; ask(heard); } }, 350); };
    mic.addEventListener('pointerdown', start);
    mic.addEventListener('pointerup', stop); mic.addEventListener('pointerleave', stop); mic.addEventListener('pointercancel', stop);
  }

  return { act, open, ask };
}
