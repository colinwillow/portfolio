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
  // no Mouth_Close: it closes the lips AGAINST AN OPEN JAW, and with the jaw shut (MBP is jaw 0) it
  // rolled his lower lip up over the top one until the mouth vanished. V_Explosive already closes them.
  MBP: { V_Explosive: 1, Mouth_Press_L: 0.35, Mouth_Press_R: 0.35 },
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

/* FASTER WITHOUT HIGHER: time-stretch by WSOLA. Playing audio faster raises its pitch with it (a
   tape on fast-forward), and that made Colin sound like a small cartoon version of himself. This
   cuts the sound into overlapping ~25 ms slices, takes them from further along the original than
   it lays them down (that is the speed-up), and nudges each one within a few ms to where its
   waveform lines up best with what is already there (that is what keeps the voice from warbling),
   then crossfades them together. Pitch untouched, duration / rate. Pure: channels in, channels out,
   so it can be measured in node. The search correlates every 4th sample over the overlap only --
   cheap enough for a sentence in a few ms on a phone. */
export function wsola(chans, sr, rate) {
  if (!(rate > 0) || Math.abs(rate - 1) < 0.005) return chans;
  const N = Math.max(256, Math.round(sr * 0.025) & ~1), Hs = N >> 1, Ha = Hs * rate, tol = Math.round(sr * 0.006);
  const len = chans[0].length, outLen = Math.max(1, Math.floor(len / rate)), win = new Float32Array(N);
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
  const out = chans.map(() => new Float32Array(outLen + N)), norm = new Float32Array(outLen + N), x = chans[0];
  let prev = 0;                                   // where the last slice was taken from
  for (let k = 0, o = 0; o < outLen; k++, o += Hs) {
    const want = Math.round(k * Ha);
    let best = want;
    if (k > 0) {                                  // the slice that would naturally follow the last one
      const nat = prev + Hs; let bestC = -Infinity;
      for (let d = -tol; d <= tol; d += 2) {
        const p = want + d; if (p < 0 || p + N > len) continue;
        let c = 0; for (let i = 0; i < Hs; i += 4) c += x[p + i] * x[nat + i];
        if (c > bestC) { bestC = c; best = p; }
      }
    }
    best = Math.max(0, Math.min(len - N, best)); prev = best;
    for (let ch = 0; ch < chans.length; ch++) { const src = chans[ch], dst = out[ch];
      for (let i = 0; i < N && o + i < dst.length; i++) dst[o + i] += src[best + i] * win[i]; }
    for (let i = 0; i < N && o + i < norm.length; i++) norm[o + i] += win[i];
  }
  return out.map(a => { const r = a.subarray(0, outLen); for (let i = 0; i < outLen; i++) if (norm[i] > 1e-3) r[i] /= norm[i]; return r; });
}

/**
 * Play a decoded AudioBuffer through an AudioContext that was unlocked by a tap.
 * This is how anything that arrives AFTER a network round trip has to play on
 * iOS: an <audio>.play() started outside the tap's call stack is refused, and
 * refused silently, so the mouth moves and nothing comes out. A context resumed
 * inside the tap stays unlocked for the whole session.
 * Returns a controller whose `done` resolves when it finishes or is stopped.
 */
/* `rate` plays it faster or slower than it was generated -- time-stretched, so the pitch stays his --
   and the mouth's timeline runs at the same rate so the lip sync stays on the syllable. Used because
   Eleven v4 has no speed control. */
export function speakBuffer(ctx, buffer, marks, text, { who = 'colin', rate = 1 } = {}) {
  hush();
  const spans = marks ? timelineFromMarks(marks) : timelineFromText(text, buffer.duration);   // in the ORIGINAL clip's time
  if (Math.abs(rate - 1) > 0.005 && buffer.length > 4096) {   // faster at the SAME pitch (wsola above)
    const ch = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
    const st = wsola(ch, buffer.sampleRate, rate), nb = ctx.createBuffer(st.length, st[0].length, buffer.sampleRate);
    st.forEach((d, i) => nb.copyToChannel(d, i)); buffer = nb;
  } else rate = 1;
  const src = ctx.createBufferSource(); src.buffer = buffer; src.connect(ctx.destination);
  const t0 = ctx.currentTime + 0.03; src.start(t0);
  let stopped = false, raf = 0, resolve;
  const ctl = {
    done: new Promise(r => { resolve = r; }),
    stop() {
      if (stopped) return; stopped = true;
      try { src.stop(); } catch {}
      cancelAnimationFrame(raf); mouth.shape = 'rest'; mouth.talking = false;
      emit('end', { who }); if (current === ctl) current = null; resolve();
    },
  };
  src.onended = () => ctl.stop();
  const loop = () => { if (stopped) return; raf = requestAnimationFrame(loop); mouth.shape = shapeAt(spans, (ctx.currentTime - t0) * rate); };
  current = ctl; mouth.talking = true; mouth.who = who; emit('start', { who }); loop();
  return ctl;
}
