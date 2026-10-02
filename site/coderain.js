// THE SCRIPTS BACKDROP: code raining behind Glorb, matrix style, but colour-coded
// like an editor -- keywords violet, calls green, strings magenta, numbers cyan,
// comments dim -- so it reads as his Cinema 4D scripts falling past, not as noise.
//
// Each column streams one line of the source, character by character, top to
// bottom: a bright head with a glow, a trail that fades behind it. The rain lives
// on its own persistent canvas (the fading trail IS the persistence); every frame
// it is copied onto the visible canvas and Glorb's particles are carved out of it,
// the same boolean subtract the weave uses.
import { makeCarve } from './weave.js?v=339f448a';

const SOURCE = `import c4d
from c4d import gui, documents
# Auto-Rig Pro -> Mixamo: rename the rig so Mixamo clips just work
ARP_TO_MIXAMO = {
    "c_root_master.x": "mixamorig:Hips",
    "c_spine_01.x": "mixamorig:Spine",
    "c_spine_02.x": "mixamorig:Spine1",
    "c_neck.x": "mixamorig:Neck",
    "c_head.x": "mixamorig:Head",
    "c_arm_fk.l": "mixamorig:LeftArm",
    "c_forearm_fk.l": "mixamorig:LeftForeArm",
    "c_hand_fk.l": "mixamorig:LeftHand",
    "c_thigh_fk.r": "mixamorig:RightUpLeg",
    "c_leg_fk.r": "mixamorig:RightLeg",
}
def walk(obj):
    while obj:
        yield obj
        for child in walk(obj.GetDown()):
            yield child
        obj = obj.GetNext()
def rename_rig(doc):
    doc.StartUndo()
    count = 0
    for joint in walk(doc.GetFirstObject()):
        if joint.GetType() != c4d.Ojoint:
            continue
        name = ARP_TO_MIXAMO.get(joint.GetName())
        if name:
            doc.AddUndo(c4d.UNDOTYPE_CHANGE_SMALL, joint)
            joint.SetName(name)
            count += 1
    doc.EndUndo()
    return count
# FBX files -> Takes: one clip per take, ready to export
def import_takes(doc, folder):
    takes = doc.GetTakeData()
    main = takes.GetMainTake()
    for path in sorted(glob.glob(os.path.join(folder, "*.fbx"))):
        take = takes.AddTake(os.path.basename(path)[:-4], main, None)
        c4d.documents.MergeDocument(doc, path, c4d.SCENEFILTER_ANIMATION)
        take.SetCamera(takes, None)
        fps = doc.GetFps()
        doc.SetMaxTime(c4d.BaseTime(240, fps))
    c4d.EventAdd()
def main():
    doc = documents.GetActiveDocument()
    n = rename_rig(doc)
    gui.MessageDialog("Renamed %d joints" % n)
if __name__ == "__main__":
    main()`;

const PAL = { kw: '#c77dff', fn: '#7dff6a', str: '#ff5fd2', num: '#5fe8ff', com: '#8a7aa8', id: '#d9ccf5', op: '#a98bff' };
const KW = new Set('import from def for in if not return while yield continue and or class with as else elif True False None'.split(' '));

// Every line, tokenised once into characters that each carry their syntax colour.
function tokenise(src) {
  return src.split('\n').filter(l => l.trim()).map(line => {
    const out = [];
    const re = /(#.*$)|("[^"]*"|'[^']*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)(\s*\()?|(\s+)|(.)/g;
    let m;
    while ((m = re.exec(line))) {
      const [all, com, str, num, word, call, ws, op] = m;
      const col = com ? PAL.com : str ? PAL.str : num ? PAL.num : word ? (KW.has(word) ? PAL.kw : call ? PAL.fn : PAL.id) : ws ? null : PAL.op;
      const text = word && call ? word : all;
      for (const ch of text) out.push([ch, col]);
      if (word && call) for (const ch of call) out.push([ch, PAL.op]);
    }
    return out;
  });
}

export const RAIN = { size: 15, speed: [7, 16], fade: 0.075, alpha: 0.85 };

export function createCodeRain(host, field = () => null) {
  const cv = document.createElement('canvas');
  cv.className = 'weave rain off'; host.appendChild(cv);
  const ctx = cv.getContext('2d');
  const buf = document.createElement('canvas'), bg = buf.getContext('2d');     // the persistent rain
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  const lines = tokenise(SOURCE);
  const carve = makeCarve();
  const S = { on: false, offAt: 0, last: 0, cols: [], paused: false };

  function layout() {
    const w = Math.round(host.clientWidth * dpr), h = Math.round(host.clientHeight * dpr);
    if (cv.width === w && cv.height === h) return;
    cv.width = buf.width = w; cv.height = buf.height = h;
    const step = RAIN.size * dpr * 0.95, n = Math.ceil(w / step);
    S.cols = Array.from({ length: n }, (_, i) => newDrop(i * step + step / 2, true));
  }
  function newDrop(x, scatter) {
    const line = lines[(Math.random() * lines.length) | 0];
    return { x, y: scatter ? -Math.random() * cv.height * 1.2 : -Math.random() * cv.height * 0.4,
      v: (RAIN.speed[0] + Math.random() * (RAIN.speed[1] - RAIN.speed[0])) * RAIN.size * dpr * 0.13,
      line, i: 0, acc: 0 };
  }

  function frame(now) {
    requestAnimationFrame(frame);
    if (S.paused || document.hidden || (!S.on && now - S.offAt > 900)) { S.last = now; return; }
    if (now - S.last < 33) return;
    const dt = Math.min(0.1, (now - S.last) / 1000); S.last = now;
    layout();
    // the trail: everything already drawn fades a little toward nothing
    bg.globalCompositeOperation = 'destination-out'; bg.fillStyle = `rgba(0,0,0,${RAIN.fade})`;
    bg.fillRect(0, 0, buf.width, buf.height); bg.globalCompositeOperation = 'source-over';
    const fs = RAIN.size * dpr;
    bg.font = `600 ${fs}px ui-monospace, "SF Mono", Menlo, Consolas, monospace`; bg.textAlign = 'center'; bg.textBaseline = 'middle';
    for (let c = 0; c < S.cols.length; c++) {
      let d = S.cols[c];
      d.acc += d.v * dt * 60;
      while (d.acc >= fs) {                         // one character per row it falls
        d.acc -= fs; d.y += fs;
        const [ch, col] = d.line[d.i] || [' ', null];
        d.i++;
        if (col && ch !== ' ') {
          // settle the previous head into its syntax colour, then draw the new bright head
          bg.shadowBlur = 0; bg.globalAlpha = 1; bg.fillStyle = col; bg.fillText(ch, d.x, d.y - fs);
          bg.shadowColor = col; bg.shadowBlur = 8 * dpr; bg.fillStyle = '#ffffff'; bg.fillText(ch, d.x, d.y);
          bg.shadowBlur = 0;
        }
        if (d.i >= d.line.length || d.y > buf.height + fs) { d = S.cols[c] = newDrop(d.x, false); break; }
      }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.globalAlpha = RAIN.alpha; ctx.drawImage(buf, 0, 0); ctx.globalAlpha = 1;
    carve(ctx, cv, field(), dpr);
  }
  requestAnimationFrame(frame);

  return {
    canvas: cv,
    visible(v) { if (S.on === !!v) return; S.on = !!v; cv.classList.toggle('off', !v); if (!v) S.offAt = performance.now(); },
    pause(p) { S.paused = !!p; },
    RAIN,
  };
}
