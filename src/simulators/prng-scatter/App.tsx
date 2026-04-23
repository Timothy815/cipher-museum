import React, { useEffect, useRef, useState, useCallback } from 'react';
import { autoBytes } from '../../lib/englishScore';

// ── PRNG implementations ───────────────────────────────────────────────

function genLCG(n: number, seed = 12345): Uint8Array {
  // Numerical Recipes LCG — famous for visible lattice structure
  let x = seed >>> 0;
  const out = new Uint8Array(n + 1);
  for (let i = 0; i <= n; i++) {
    x = (Math.imul(1664525, x) + 1013904223) >>> 0;
    out[i] = x >>> 24; // high byte
  }
  return out;
}

function genXorshift(n: number, seed = 0xDEADBEEF): Uint8Array {
  let x = seed >>> 0;
  const out = new Uint8Array(n + 1);
  for (let i = 0; i <= n; i++) {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x = x >>> 0;
    out[i] = x & 0xFF;
  }
  return out;
}

function genRC4(n: number): Uint8Array {
  const key = [0x01, 0x23, 0x45, 0x67, 0x89, 0xAB, 0xCD, 0xEF];
  const S = Array.from({ length: 256 }, (_, i) => i);
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + S[i] + key[i % key.length]) & 0xFF;
    [S[i], S[j]] = [S[j], S[i]];
  }
  // Discard first 256 bytes (RC4 early-output bias mitigation)
  let ri = 0, rj = 0;
  for (let k = 0; k < 256; k++) {
    ri = (ri + 1) & 0xFF; rj = (rj + S[ri]) & 0xFF;
    [S[ri], S[rj]] = [S[rj], S[ri]];
  }
  const out = new Uint8Array(n + 1);
  for (let k = 0; k <= n; k++) {
    ri = (ri + 1) & 0xFF; rj = (rj + S[ri]) & 0xFF;
    [S[ri], S[rj]] = [S[rj], S[ri]];
    out[k] = S[(S[ri] + S[rj]) & 0xFF];
  }
  return out;
}

function genChaCha20(n: number): Uint8Array {
  const rot = (v: number, s: number) => ((v << s) | (v >>> (32 - s))) >>> 0;
  function qr(s: Uint32Array, a: number, b: number, c: number, d: number) {
    s[a] = (s[a] + s[b]) >>> 0; s[d] = rot(s[d] ^ s[a], 16);
    s[c] = (s[c] + s[d]) >>> 0; s[b] = rot(s[b] ^ s[c], 12);
    s[a] = (s[a] + s[b]) >>> 0; s[d] = rot(s[d] ^ s[a], 8);
    s[c] = (s[c] + s[d]) >>> 0; s[b] = rot(s[b] ^ s[c], 7);
  }
  const key = new Uint32Array([0x03020100,0x07060504,0x0b0a0908,0x0f0e0d0c,0x13121110,0x17161514,0x1b1a1918,0x1f1e1d1c]);
  const nonce = new Uint32Array([0x09000000, 0x4a000000, 0x00000000]);
  const bytes: number[] = [];
  for (let counter = 0; bytes.length <= n + 1; counter++) {
    const s = new Uint32Array([0x61707865,0x3320646e,0x79622d32,0x6b206574,...key,counter,0,...nonce]);
    const w = new Uint32Array(s);
    for (let i = 0; i < 10; i++) {
      qr(w,0,4,8,12); qr(w,1,5,9,13); qr(w,2,6,10,14); qr(w,3,7,11,15);
      qr(w,0,5,10,15); qr(w,1,6,11,12); qr(w,2,7,8,13); qr(w,3,4,9,14);
    }
    for (let i = 0; i < 16; i++) w[i] = (w[i] + s[i]) >>> 0;
    const b = new Uint8Array(w.buffer);
    for (let i = 0; i < 64; i++) bytes.push(b[i]);
  }
  return new Uint8Array(bytes.slice(0, n + 1));
}

// ── Canvas renderer ────────────────────────────────────────────────────

function renderScatter(
  canvas: HTMLCanvasElement,
  bytes: Uint8Array,
  color: string
) {
  const SZ = 256;
  canvas.width = SZ;
  canvas.height = SZ;
  const ctx = canvas.getContext('2d')!;

  // Heat map: accumulate hits per pixel, then color
  const hits = new Uint16Array(SZ * SZ);
  for (let i = 0; i < bytes.length - 1; i++) hits[bytes[i] * SZ + bytes[i + 1]]++;
  const maxH = Math.max(1, ...hits);

  const img = ctx.createImageData(SZ, SZ);
  for (let i = 0; i < SZ * SZ; i++) {
    if (hits[i] === 0) {
      const p = i * 4;
      img.data[p] = 13; img.data[p+1] = 17; img.data[p+2] = 23; img.data[p+3] = 255;
    } else {
      const v = Math.min(1, Math.log1p(hits[i]) / Math.log1p(maxH));
      const p = i * 4;
      // Parse hex color
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      img.data[p]   = Math.round(r * v);
      img.data[p+1] = Math.round(g * v);
      img.data[p+2] = Math.round(b * v);
      img.data[p+3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

// ── Panel ──────────────────────────────────────────────────────────────

type PrngId = 'lcg' | 'xorshift' | 'rc4' | 'chacha20' | 'custom';

interface PrngDef {
  label: string;
  color: string;
  accent: string;
  desc: string;
  gen: (n: number) => Uint8Array;
}

const PRNGS: Record<PrngId, PrngDef> = {
  lcg:      { label: 'LCG',      color: '#ef4444', accent: 'text-red-400',    desc: 'Numerical Recipes: visible diagonal lattice structure',    gen: n => genLCG(n) },
  xorshift: { label: 'Xorshift', color: '#f59e0b', accent: 'text-amber-400',  desc: 'Marsaglia Xorshift: better but faint structure persists',   gen: n => genXorshift(n) },
  rc4:      { label: 'RC4',      color: '#a78bfa', accent: 'text-violet-400', desc: 'RC4 (with 256-byte discard): improved, subtle bias remains', gen: n => genRC4(n) },
  chacha20: { label: 'ChaCha20', color: '#22d3ee', accent: 'text-cyan-400',   desc: 'ChaCha20: cryptographically secure — uniform cloud',         gen: n => genChaCha20(n) },
  custom:   { label: 'Your Data',color: '#4ade80', accent: 'text-green-400',  desc: 'Paste your own ciphertext, hash output, or PRNG output',     gen: () => new Uint8Array(0) },
};

interface ScatterPanelProps {
  id: PrngId;
  active: boolean;
  sampleSize: number;
  customBytes?: Uint8Array;
  onClick: () => void;
}

const ScatterPanel: React.FC<ScatterPanelProps> = ({ id, active, sampleSize, customBytes, onClick }) => {
  const def = PRNGS[id];
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const bytes = id === 'custom' ? (customBytes ?? new Uint8Array(0)) : def.gen(sampleSize);
    if (bytes.length >= 2) renderScatter(canvasRef.current, bytes, def.color);
  }, [id, sampleSize, customBytes]);

  return (
    <div onClick={onClick}
      className={`flex flex-col rounded-xl border overflow-hidden cursor-pointer transition-all ${
        active ? 'border-slate-500 scale-[1.02]' : 'border-slate-800 hover:border-slate-700'
      }`}
    >
      <div className="relative bg-slate-950" style={{ aspectRatio: '1' }}>
        <canvas ref={canvasRef} className="w-full h-full" style={{ imageRendering: 'pixelated' }} />
        <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800">
          <span className={`text-[10px] font-bold ${def.accent}`}>{def.label}</span>
        </div>
      </div>
      <div className="px-2 py-1.5 bg-slate-900/60">
        <p className="text-[9px] text-slate-500 leading-snug">{def.desc}</p>
      </div>
    </div>
  );
};

// ── Main ───────────────────────────────────────────────────────────────

const PRNGScatterApp: React.FC = () => {
  const [active, setActive] = useState<PrngId>('lcg');
  const [sampleSize, setSampleSize] = useState(5000);
  const [customInput, setCustomInput] = useState('');
  const [customBytes, setCustomBytes] = useState<Uint8Array>(new Uint8Array(0));

  const handleCustom = (val: string) => {
    setCustomInput(val);
    if (!val.trim()) return;
    const r = autoBytes(val);
    setCustomBytes(r ? r.bytes : new TextEncoder().encode(val));
    setActive('custom');
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950 text-slate-200"
         style={{ fontFamily: "'Share Tech Mono', monospace" }}>

      <div className="flex-shrink-0 px-6 pt-5 pb-3 border-b border-slate-800 bg-slate-900/60">
        <h1 className="text-xl font-bold text-white">PRNG Scatter Plot</h1>
        <p className="text-xs text-slate-400 mt-1">
          Plot x[i] vs x[i+1] — weak PRNGs reveal lattice structure; cryptographic ones look like random clouds
        </p>
      </div>

      <div className="flex-1 overflow-auto flex flex-col lg:flex-row gap-4 p-4">

        <div className="flex-1 flex flex-col gap-3 min-w-0">

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400">Samples:</span>
              {[1000, 5000, 10000].map(n => (
                <button key={n} onClick={() => setSampleSize(n)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${sampleSize === n ? 'text-amber-400' : 'text-slate-600'}`}>
                  {n.toLocaleString()}
                </button>
              ))}
            </div>
            <span className="text-[9px] text-slate-600">Each dot = (output[i], output[i+1])</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(PRNGS) as PrngId[]).filter(id => id !== 'custom').map(id => (
              <ScatterPanel key={id} id={id} active={active === id} sampleSize={sampleSize}
                onClick={() => setActive(id)} />
            ))}
          </div>

          {/* Custom input */}
          <div className="rounded-xl border border-slate-700 p-3 bg-slate-900/40">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest">Your Data</span>
              <span className="text-[9px] text-slate-600">Paste hex, base64, or text</span>
            </div>
            <textarea value={customInput} onChange={e => handleCustom(e.target.value)} rows={2}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-[10px] font-mono text-slate-300 resize-none outline-none focus:border-green-700"
              placeholder="Paste ciphertext, hash output, PRNG bytes…" spellCheck={false} />
            {customBytes.length >= 2 && (
              <ScatterPanel id="custom" active={active === 'custom'} sampleSize={customBytes.length}
                customBytes={customBytes} onClick={() => setActive('custom')} />
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-64 flex-shrink-0 flex flex-col gap-3">

          <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4">
            <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2">What to Look For</div>
            <div className="space-y-2 text-xs text-slate-400 leading-relaxed">
              <p><span className="text-red-400 font-bold">LCG lattice</span> — Output lies on a small number of parallel diagonal lines. Marsaglia (1968) proved all LCGs have this structure in N-dimensional space.</p>
              <p><span className="text-amber-400 font-bold">Xorshift structure</span> — Faint diagonal striping. Better than LCG but still fails in 3D and higher dimensions.</p>
              <p><span className="text-violet-400 font-bold">RC4 cloud</span> — Looks random for most outputs, but early bytes show a bias toward small values (the Fluhrer-Mantin-Shamir attack exploited this in WEP).</p>
              <p><span className="text-cyan-400 font-bold">ChaCha20 cloud</span> — Indistinguishable from a true random source. No structure at any scale. The scatter plot passes all statistical tests.</p>
            </div>
          </div>

          <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4">
            <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2">Marsaglia's Theorem</div>
            <div className="text-xs text-slate-400 leading-relaxed">
              <p>Any LCG with modulus m produces output that, when viewed as k-tuples, lies on at most m^(1/k) parallel hyperplanes. In 2D (k=2), this is visible as diagonal lattice lines.</p>
              <p className="mt-2">This isn't a bug in the specific LCG — it's an inherent mathematical property of all linear congruential generators.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PRNGScatterApp;
