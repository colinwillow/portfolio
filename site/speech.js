// Anything that speaks -- an essay reading, or mini-Colin answering -- goes
// through here, and publishes the mouth shape it is on. Mini-Colin's face
// reads `mouth` every frame and has no idea which of the two is talking.
//
// Mouth shapes are timed from the TEXT and anchored to the AUDIO (the colin
// repo's visemes.ts, ported): ElevenLabs and the aligner both give a start
// and end time for every character, which is the difference between a jaw
// flapping to the loudness and a mouth saying the words.

const SHAPE_OF = { a: 'AI', i: 'AI', y: 'AI', e: 'E', o: 'O', u: 'U', w: 'WQ', q: 'WQ',
  l: 'L', f: 'FV', v: 'FV', m: 'MBP', b: 'MBP', p: 'MBP' };
const HOLD = { AI: 2.2, E: 2.0, O: 2.2, U: 2.0, WQ: 1.6, L: 1.2, FV: 1.2, MBP: 1.0, etc: 1.0, rest: 1.6 };

/** Shape -> morph targets on colin.glb (names matched loosely, `_MIX` dropped). */
export const VISEME = {
  MBP: { V_Explosive: 1, Mouth_Close: 0.55, Mouth_Press_L: 0.35, Mouth_Press_R: 0.35 },
  FV: { V_Dental_Lip: 1 }, E: { V_Wide: 0.88 }, AI: { V_Open: 0.9, V_Lip_Open: 0.35 },
  O: { V_Tight_O: 0.92, Mouth_Funnel: 0.25 }, U: { V_Tight_O: 0.55, V_Tight: 0.6, Mouth_Pucker: 0.25 },
  WQ: { V_Tight: 0.95, Mouth_Pucker: 0.35 }, L: { V_Lip_Open: 0.6 }, etc: { V_Affricate: 0.8 }, rest: {},
};
export const JAW = { AI: 0.5, O: 0.35, E: 0.25, U: 0.18, L: 0.22, etc: 0.15, WQ: 0.12, FV: 0.05, MBP: 0, rest: 0 };

export function timelineFromMarks(a) {
  const ch = a?.characters || [], t0 = a?.character_start_times_seconds || [], t1 = a?.character_end_times_seconds || [];
  const seq = [];
  for (let i = 0; i < ch.length; i++) {
    const c = String(ch[i]).toLowerCase(), s0 = +t0[i], s1 = +(t1[i] ?? t0[i]);
    if (!(s1 >= s0)) continue;
    let shape;
    if (c >= 'a' && c <= 'z') shape = SHAPE_OF[c] || 'etc';
    else if (/[.,;:!?]/.test(c)) shape = 'rest';
    else if (c === ' ') { if (s1 - s0 < 0.12) continue; shape = 'rest'; }
    else continue;
    const last = seq[seq.length - 1];
    if (last && last.shape === shape) last.t1 = s1; else seq.push({ shape, t0: s0, t1: s1 });
  }
  return seq;
}
export function timelineFromText(text, dur) {
  const seq = [];
  for (const c of String(text).toLowerCase()) {
    const shape = c >= 'a' && c <= 'z' ? SHAPE_OF[c] || 'etc' : /[.,;:!?]/.test(c) ? 'rest' : null;
    if (!shape) continue;
    const last = seq[seq.length - 1];
    if (last && last.shape === shape) last.w += HOLD[shape]; else seq.push({ shape, w: HOLD[shape] });
  }
  const total = seq.reduce((s, x) => s + x.w, 0) || 1;
  let t = 0;
  return seq.map(x => { const t0 = t; t += x.w / total * dur; return { shape: x.shape, t0, t1: t }; });
}
function shapeAt(spans, t) {
  let lo = 0, hi = spans.length - 1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (spans[m].t1 < t) lo = m + 1; else if (spans[m].t0 > t) hi = m - 1; else return spans[m].shape; }
  return 'rest';
}

/** What the mouth is doing right now. `talking` is false between voices. */
export const mouth = { shape: 'rest', talking: false, who: null };
const listeners = new Set();
export const onSpeech = fn => (listeners.add(fn), () => listeners.delete(fn));
const emit = (type, detail) => listeners.forEach(fn => fn(type, detail));

let current = null;
/** Stop whatever is speaking. */
export function hush() { current?.stop(); current = null; }

/**
 * Play a list of parts `{ src, marks, text }` back to back. Streams each part
 * with an <audio> element rather than decoding it -- a whole essay as PCM is a
 * couple of hundred megabytes on a phone.
 * `onTick(partIndex, seconds)` fires every frame while playing.
 */
export function speakParts(parts, { who = 'reading', onTick, onEnd } = {}) {
  hush();
  const el = new Audio(); el.preload = 'auto';
  let i = -1, spans = [], raf = 0, stopped = false, paused = false;
  const ctl = {
    get index() { return i; }, get paused() { return paused; }, el,
    stop() { stopped = true; cancelAnimationFrame(raf); el.pause(); el.removeAttribute('src'); el.load();
      mouth.shape = 'rest'; mouth.talking = false; emit('end', { who }); if (current === ctl) current = null; },
    pause() { paused = true; el.pause(); mouth.talking = false; mouth.shape = 'rest'; emit('pause', { who }); },
    resume() { paused = false; el.play().catch(() => {}); mouth.talking = true; emit('start', { who }); },
    seekPart(k) { next(k); },
  };
  function next(k = i + 1) {
    if (stopped) return;
    if (k >= parts.length) { ctl.stop(); onEnd?.(); return; }
    i = k; const p = parts[i];
    spans = p.marks ? timelineFromMarks(p.marks) : [];
    el.src = p.src;
    el.onloadedmetadata = () => { if (!p.marks) spans = timelineFromText(p.text || '', el.duration || 1); };
    el.onended = () => next();
    el.play().catch(err => { console.warn('speech', err); ctl.stop(); });
  }
  function loop() {
    if (stopped) return;
    raf = requestAnimationFrame(loop);
    if (paused) return;
    mouth.shape = el.paused ? 'rest' : shapeAt(spans, el.currentTime);
    onTick?.(i, el.currentTime);
  }
  current = ctl; mouth.talking = true; mouth.who = who; emit('start', { who });
  next(0); loop();
  return ctl;
}
