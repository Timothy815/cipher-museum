import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { autoBytes } from '../../lib/englishScore';

// ── Engine ─────────────────────────────────────────────────────────────

const SZ = 256;

function buildMap(bytes: Uint8Array): Float64Array {
  const counts = new Float64Array(SZ * SZ);
  for (let i = 0; i < bytes.length - 1; i++) counts[bytes[i] * SZ + bytes[i + 1]]++;
  return counts;
}

function maxOf(a: Float64Array): number {
  let m = 0;
  for (let i = 0; i < a.length; i++) if (a[i] > m) m = a[i];
  return m;
}

function renderMap(canvas: HTMLCanvasElement, counts: Float64Array, scaleMax: number) {
  canvas.width = SZ;
  canvas.height = SZ;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(SZ, SZ);
  const logM = Math.log1p(Math.max(1, scaleMax));
  for (let i = 0; i < SZ * SZ; i++) {
    const v = Math.floor((Math.log1p(counts[i]) / logM) * 255);
    const p = i * 4;
    img.data[p]     = Math.floor(v * 0.08);
    img.data[p + 1] = Math.floor(v * 0.72);
    img.data[p + 2] = v;
    img.data[p + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

// ── Sample generators ──────────────────────────────────────────────────

const ENG_TEXT = (`When in the course of human events it becomes necessary for one people to dissolve the
political bands which have connected them with another and to assume among the powers of the earth the separate
and equal station to which the laws of nature and of nature's god entitle them a decent respect to the opinions
of mankind requires that they should declare the causes which impel them to the separation we hold these truths
to be self evident that all men are created equal that they are endowed by their creator with certain unalienable
rights that among these are life liberty and the pursuit of happiness the quick brown fox jumps over the lazy dog
peter piper picked a peck of pickled peppers how much wood would a woodchuck chuck if a woodchuck could chuck wood
she sells seashells by the seashore the shells she sells are surely seashells four score and seven years ago our
fathers brought forth on this continent a new nation conceived in liberty and dedicated to the proposition`).repeat(4);

type Preset = 'english' | 'random' | 'xor3' | 'xor19';

const PRESETS: Record<Preset, { label: string; color: string; gen: () => Uint8Array }> = {
  english: { label: 'English text',      color: 'amber',
    gen: () => new TextEncoder().encode(ENG_TEXT.slice(0, 3000)) },
  random:  { label: 'Random bytes',      color: 'slate',
    gen: () => { const b = new Uint8Array(3000); crypto.getRandomValues(b); return b; } },
  xor3:    { label: 'Vigenère (k=3)',    color: 'rose',
    gen: () => { const src = new TextEncoder().encode(ENG_TEXT.slice(0, 3000)); const key = [0x5A, 0x3F, 0x71]; return src.map((b, i) => b ^ key[i % 3]); } },
  xor19:   { label: 'Vigenère (k=19)',   color: 'purple',
    gen: () => { const src = new TextEncoder().encode(ENG_TEXT.slice(0, 3000)); const key = [0x5A,0x3F,0x71,0xA3,0x2C,0x8E,0x17,0x4B,0xCC,0x09,0xF2,0x6D,0xB8,0x35,0x9A,0xE1,0x57,0x88,0xC4]; return src.map((b, i) => b ^ key[i % 19]); } },
};

const COLOR_CLASSES: Record<string, string> = {
  amber:  'border-amber-700/60 bg-amber-900/20 text-amber-400',
  slate:  'border-slate-600/60 bg-slate-800/20 text-slate-400',
  rose:   'border-rose-700/60 bg-rose-900/20 text-rose-400',
  purple: 'border-purple-700/60 bg-purple-900/20 text-purple-400',
};

// ── Panel ──────────────────────────────────────────────────────────────

interface PanelProps {
  title: string;
  defaultPreset: Preset;
  scaleMax: number;
}

const Panel: React.FC<PanelProps> = ({ title, defaultPreset, scaleMax }) => {
  const [preset, setPreset] = useState<Preset>(defaultPreset);
  const [custom, setCustom] = useState('');
  const [bytes, setBytes] = useState<Uint8Array>(() => PRESETS[defaultPreset].gen());
  const [hover, setHover] = useState<{ x: number; y: number; count: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const countsRef = useRef<Float64Array>(buildMap(PRESETS[defaultPreset].gen()));

  useEffect(() => {
    if (canvasRef.current) renderMap(canvasRef.current, countsRef.current, scaleMax);
  }, [scaleMax]);

  const applyBytes = useCallback((b: Uint8Array) => {
    setBytes(b);
    countsRef.current = buildMap(b);
    if (canvasRef.current) renderMap(canvasRef.current, countsRef.current, scaleMax);
  }, [scaleMax]);

  useEffect(() => {
    if (!custom) applyBytes(PRESETS[preset].gen());
  }, [preset]);

  const handleCustom = (val: string) => {
    setCustom(val);
    if (!val.trim()) return;
    const r = autoBytes(val);
    const b = r ? r.bytes : new TextEncoder().encode(val);
    setPreset('english'); // reset label
    applyBytes(b);
  };

  const handleHover = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * SZ);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * SZ);
    if (x >= 0 && x < SZ && y >= 0 && y < SZ)
      setHover({ x, y, count: countsRef.current[y * SZ + x] });
  };

  return (
    <div className="flex-1 flex flex-col gap-2 min-w-0">
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</div>
      <div className="flex flex-wrap gap-1">
        {(Object.keys(PRESETS) as Preset[]).map(id => (
          <button key={id} onClick={() => { setCustom(''); setPreset(id); }}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
              preset === id && !custom
                ? COLOR_CLASSES[PRESETS[id].color]
                : 'border-slate-700 text-slate-600 hover:text-slate-300'
            }`}>{PRESETS[id].label}</button>
        ))}
      </div>
      <textarea value={custom} onChange={e => handleCustom(e.target.value)} rows={2}
        className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-[10px] font-mono text-slate-300 resize-none outline-none focus:border-cyan-700"
        placeholder="Or paste text / hex / base64…" spellCheck={false} />
      <p className="text-[9px] text-slate-600 font-mono -mt-1">{bytes.length} bytes · {bytes.length - 1} bigrams</p>

      <div className="relative rounded-lg border border-slate-800 overflow-hidden bg-slate-950"
           style={{ aspectRatio: '1' }}>
        <div className="absolute top-0 left-0 right-0 flex justify-between px-1 pt-0.5 pointer-events-none z-10">
          <span className="text-[8px] text-slate-700">0x00</span>
          <span className="text-[8px] text-slate-600 font-bold">byte[i] →</span>
          <span className="text-[8px] text-slate-700">0xFF</span>
        </div>
        <div className="absolute bottom-0 left-0 top-0 flex flex-col justify-between py-1 pl-0.5 pointer-events-none z-10">
          <span className="text-[8px] text-slate-700">00</span>
          <span className="text-[8px] text-slate-600 font-bold" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>byte[i+1]</span>
          <span className="text-[8px] text-slate-700">FF</span>
        </div>
        <canvas ref={canvasRef}
          onMouseMove={handleHover} onMouseLeave={() => setHover(null)}
          className="w-full h-full cursor-crosshair"
          style={{ imageRendering: 'pixelated' }} />
        {hover && (
          <div className="absolute bottom-2 right-2 bg-slate-950/95 border border-slate-700 rounded px-2 py-1 text-[9px] font-mono pointer-events-none z-20">
            <span className="text-cyan-400">0x{hover.x.toString(16).padStart(2, '0').toUpperCase()}</span>
            <span className="text-slate-500"> → </span>
            <span className="text-cyan-400">0x{hover.y.toString(16).padStart(2, '0').toUpperCase()}</span>
            <span className="text-slate-500"> : </span>
            <span className="text-white font-bold">{hover.count}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main ───────────────────────────────────────────────────────────────

const BigramMapApp: React.FC = () => {
  const [linked, setLinked] = useState(true);

  // We compute scaleMax at the top level by keeping track of each panel's max
  const [leftMax, setLeftMax] = useState(1);
  const [rightMax, setRightMax] = useState(1);

  // The scaleMax computation is purely visual — we can compute it from defaults
  const engCounts = useMemo(() => buildMap(PRESETS.english.gen()), []);
  const rndCounts = useMemo(() => buildMap(PRESETS.random.gen()), []);
  const defaultShared = useMemo(() => Math.max(maxOf(engCounts), maxOf(rndCounts)), []);

  // For linked scale we need a shared max. Without user interaction, use defaults.
  const sharedMax = Math.max(leftMax || maxOf(engCounts), rightMax || maxOf(rndCounts));

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950 text-slate-200"
         style={{ fontFamily: "'Share Tech Mono', monospace" }}>

      <div className="flex-shrink-0 px-6 pt-5 pb-3 border-b border-slate-800 bg-slate-900/60">
        <h1 className="text-xl font-bold text-white">Byte Bigram Heatmap</h1>
        <p className="text-xs text-slate-400 mt-1">
          Pixel (x, y) = how often byte x is immediately followed by byte y — structure vs. randomness made visible
        </p>
      </div>

      <div className="flex-1 overflow-auto flex flex-col gap-4 p-4">

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div onClick={() => setLinked(!linked)}
              className={`w-8 h-4 rounded-full transition-colors relative cursor-pointer ${linked ? 'bg-cyan-600' : 'bg-slate-700'}`}>
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${linked ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-[10px] text-slate-400">Linked color scale (fair A/B comparison)</span>
          </label>
        </div>

        <div className="flex gap-6 flex-col lg:flex-row">
          <Panel title="Panel A" defaultPreset="english" scaleMax={linked ? defaultShared : 0} />
          <Panel title="Panel B — Compare" defaultPreset="random" scaleMax={linked ? defaultShared : 0} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
          <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4">
            <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-2">What You're Seeing</div>
            <div className="space-y-2 text-xs text-slate-400 leading-relaxed">
              <p><span className="text-white font-bold">English text</span> — Dense diagonal band: common pairs like TH, HE, IN, ER. Visible structure in the 0x20–0x7E region (printable ASCII).</p>
              <p><span className="text-white font-bold">Random bytes</span> — Flat uniform gray. Every pair appears equally often. No structure anywhere.</p>
              <p><span className="text-white font-bold">Vigenère (short key)</span> — Shifted copies of the English pattern. The key length determines how many shifted clusters appear.</p>
            </div>
          </div>
          <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4">
            <div className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-2">The Security Requirement</div>
            <div className="space-y-2 text-xs text-slate-400 leading-relaxed">
              <p>A secure block cipher must produce a bigram map <span className="text-white">indistinguishable from random bytes</span> — flat gray.</p>
              <p>Any visible structure, clustering, or banding means statistical relationships in the plaintext have survived encryption.</p>
              <p>This is exactly why ECB mode fails: identical 16-byte input blocks produce identical output blocks, creating a bigram map with sharp grid lines.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BigramMapApp;
