// An essay: the text, set to be read, and -- when there is a reading -- a player
// that follows along word by word while mini-Colin (if he is on screen) says it.

import { speakParts, hush } from './speech.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Just enough markdown for prose: headings, paragraphs, emphasis, links, quotes.
function md(src) {
  const inline = s => esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  return src.replace(/\r/g, '').split(/\n{2,}/).map(b => {
    b = b.trim(); if (!b) return '';
    if (/^!\[/.test(b)) return '';
    const h = b.match(/^(#{1,3})\s+(.*)$/); if (h) return `<h${h[1].length + 1}>${inline(h[2])}</h${h[1].length + 1}>`;
    if (b.startsWith('>')) return `<blockquote>${inline(b.replace(/^>\s?/gm, ''))}</blockquote>`;
    return `<p>${inline(b.replace(/\n/g, ' '))}</p>`;
  }).join('');
}

export async function mountReader(host, it) {
  const [text, reading] = await Promise.all([
    fetch(it.text).then(r => r.ok ? r.text() : ''),
    it.reading ? fetch(it.reading).then(r => r.ok ? r.json() : null).catch(() => null) : null,
  ]);
  const body = text.replace(/^#\s+.*\n+/, '');         // the title is already on the page
  const words = body.split(/\s+/).filter(Boolean).length;
  host.innerHTML = `
    <div class="essay-meta">${words.toLocaleString()} words · ${Math.max(1, Math.round(words / 230))} min read
      ${reading ? ` · ${Math.round(reading.duration / 60) || '<1'} min listen` : ''}</div>
    ${reading ? `<div class="player">
      <button class="play" aria-label="Play the reading">▶</button>
      <div class="pbody"><div class="pline"><b>${esc(it.voice || reading.voice || 'Reading')}</b><span class="ptime">0:00</span></div>
        <div class="pbar"><i></i></div><div class="caption" aria-live="off"></div></div></div>` : ''}
    <article class="essay">${md(body)}</article>`;
  if (!reading) return { destroy() {} };

  const base = new URL(it.reading, document.baseURI);
  const parts = reading.parts.map(p => ({ ...p, src: new URL(p.audio, base).href }));
  const starts = []; let acc = 0; for (const p of parts) { starts.push(acc); acc += p.duration || 0; }
  const total = reading.duration || acc || 1;
  const btn = host.querySelector('.play'), bar = host.querySelector('.pbar i'),
        time = host.querySelector('.ptime'), cap = host.querySelector('.caption');
  const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  // Word highlighting: the marks time every LETTER, so count letters through
  // the part's words and light the word the current letter belongs to.
  let shown = -1, wordEls = [], letterWord = [], letterT = [];
  function caption(k) {
    const p = parts[k]; shown = k;
    const ws = (p.text || '').split(/\s+/).filter(Boolean);
    cap.innerHTML = ws.map(w => `<span>${esc(w)}</span>`).join(' ');
    wordEls = [...cap.children]; letterWord = [];
    ws.forEach((w, wi) => { for (const c of w) if (/[a-z0-9]/i.test(c)) letterWord.push(wi); });
    letterT = [];
    const m = p.marks;
    if (m) m.characters.forEach((c, j) => { if (/[a-z0-9]/i.test(c)) letterT.push(+m.character_start_times_seconds[j]); });
  }

  let ctl = null;
  const setBtn = on => { btn.textContent = on ? '❚❚' : '▶'; btn.setAttribute('aria-label', on ? 'Pause' : 'Play the reading'); };
  btn.onclick = () => {
    if (!ctl) {
      ctl = speakParts(parts, {
        who: 'reading',
        onTick(k, t) {
          if (k !== shown) caption(k);
          const at = starts[k] + t;
          bar.style.width = (100 * at / total).toFixed(2) + '%';
          time.textContent = `${fmt(at)} / ${fmt(total)}`;
          let li = 0;
          if (letterT.length) { while (li < letterT.length - 1 && letterT[li + 1] <= t) li++; }
          else li = Math.floor(letterWord.length * t / (parts[k].duration || 1));
          const wi = letterWord[Math.min(li, letterWord.length - 1)];
          wordEls.forEach((e, j) => e.classList.toggle('now', j === wi));
        },
        onEnd() { ctl = null; setBtn(false); bar.style.width = '100%'; },
      });
      setBtn(true);
    } else if (ctl.paused) { ctl.resume(); setBtn(true); }
    else { ctl.pause(); setBtn(false); }
  };
  return { destroy() { if (ctl) hush(); } };
}
