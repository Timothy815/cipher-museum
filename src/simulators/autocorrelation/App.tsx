import React, { useEffect, useRef, useState, useMemo } from 'react';
import { autoBytes } from '../../lib/englishScore';

// ── Engine ─────────────────────────────────────────────────────────────

function autocorr(bytes: Uint8Array, maxLag: number): number[] {
  const n = Math.min(bytes.length, 4096); // cap for performance
  let mean = 0;
  for (let i = 0; i < n; i++) mean += bytes[i];
  mean /= n;
  let variance = 0;
  for (let i = 0; i < n; i++) variance += (bytes[i] - mean) ** 2;
  variance /= n;
  if (variance === 0) return new Array(maxLag).fill(0);

  const result: number[] = [];
  for (let lag = 1; lag <= maxLag; lag++) {
    let cov = 0;
    for (let i = 0; i < n - lag; i++) cov += (bytes[i] - mean) * (bytes[i + lag] - mean);
    result.push(cov / ((n - lag) * variance));
  }
  return result;
}

// Significance bound (±1.96 / sqrt(n))
function sigBound(n: number): number {
  return 1.96 / Math.sqrt(Math.min(n, 4096));
}

// Find peaks above threshold
function findPeaks(r: number[], threshold: number): number[] {
  const peaks: number[] = [];
  for (let i = 0; i < r.length; i++) {
    if (Math.abs(r[i]) > threshold) peaks.push(i + 1); // 1-indexed lag
  }
  return peaks;
}

// ── Canvas chart ────────────────────────────────────────────────────────

function drawChart(
  canvas: HTMLCanvasElement,
  r: number[],
  sig: number,
  maxLag: number
) {
  const W = canvas.width = canvas.offsetWidth || 600;
  const H = canvas.height = 180;
  const ctx = canvas.getContext('2d')!;

  const PAD = { top: 12, bottom: 28, left: 42, right: 12 };
  const PW = W - PAD.left - PAD.right;
  const PH = H - PAD.top - PAD.bottom;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, W, H);

  const yRange = Math.max(0.4, Math.ceil(Math.max(...r.map(Math.abs), sig * 1.5) * 10) / 10);
  const toX = (lag: number) => PAD.left + ((lag - 1) / (r.length - 1)) * PW;
  const toY = (v: number) => PAD.top + PH / 2 - (v / yRange) * (PH / 2);

  // Grid lines
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  for (let v = -yRange; v <= yRange; v += yRange / 4) {
    const y = toY(v);
    ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(W - PAD.right, y); ctx.stroke();
  }

  // X axis tick marks (every 16 lags)
  ctx.fillStyle = '#475569';
  ctx.font = '9px Share Tech Mono, monospace';
  ctx.textAlign = 'center';
  for (let lag = 0; lag <= maxLag; lag += 16) {
    const x = toX(lag + 1);
    ctx.fillText(String(lag), x, H - 6);
  }

  // Y axis labels
  ctx.textAlign = 'right';
  for (let v of [-yRange, -yRange / 2, 0, yRange / 2, yRange]) {
    ctx.fillText(v.toFixed(2), PAD.left - 4, toY(v) + 3);
  }

  // Significance bounds (dashed)
  ctx.setLineDash([4, 3]);
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 1;
  for (const sv of [sig, -sig]) {
    ctx.beginPath(); ctx.moveTo(PAD.left, toY(sv)); ctx.lineTo(W - PAD.right, toY(sv)); ctx.stroke();
  }
  ctx.setLineDash([]);

  // Baseline
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(PAD.left, toY(0)); ctx.lineTo(W - PAD.right, toY(0)); ctx.stroke();

  // Bars
  const barW = Math.max(1, PW / r.length - 0.5);
  for (let i = 0; i < r.length; i++) {
    const x = toX(i + 1);
    const y0 = toY(0);
    const y1 = toY(r[i]);
    const significant = Math.abs(r[i]) > sig;
    ctx.fillStyle = significant ? '#f59e0b' : '#0e7490';
    ctx.fillRect(x - barW / 2, Math.min(y0, y1), barW, Math.abs(y1 - y0) + 0.5);
  }

  // Legend
  ctx.font = '9px Share Tech Mono, monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ef4444';
  ctx.fillText(`±${sig.toFixed(3)} sig. bound`, PAD.left + 4, PAD.top + 10);
  ctx.fillStyle = '#f59e0b';
  ctx.fillText('significant peak', PAD.left + 4, PAD.top + 22);
}

// ── Presets ─────────────────────────────────────────────────────────────

const ENG = (`when in the course of human events it becomes necessary for one people to dissolve the political
bands which have connected them with another the quick brown fox jumps over the lazy dog she sells seashells
by the seashore four score and seven years ago our fathers brought forth upon this continent a new nation
conceived in liberty and dedicated to the proposition that all men are created equal`).repeat(8);

type PresetId = 'random' | 'english' | 'xor7' | 'xor13';

interface Preset { label: string; desc: string; gen: () => Uint8Array }

const PRESETS: Record<PresetId, Preset> = {
  random:  { label: 'Random',          desc: 'No correlation at any lag',
    gen: () => { const b = new Uint8Array(2000); crypto.getRandomValues(b); return b; } },
  english: { label: 'English text',    desc: 'Mild long-range correlations from language statistics',
    gen: () => new TextEncoder().encode(ENG.slice(0, 2000)) },
  xor7:    { label: 'XOR cipher k=7',  desc: 'Repeating 7-byte key — expect spikes at lags 7, 14, 21…',
    gen: () => { const src = new TextEncoder().encode(ENG.slice(0, 2000)); const k = [0x5A,0x3F,0x71,0xA3,0x2C,0x8E,0x17]; return src.map((b,i) => b ^ k[i%7]); } },
  xor13:   { label: 'XOR cipher k=13', desc: 'Repeating 13-byte key — spikes at multiples of 13',
    gen: () => { const src = new TextEncoder().encode(ENG.slice(0, 2000)); const k = [0x5A,0x3F,0x71,0xA3,0x2C,0x8E,0x17,0x4B,0xCC,0x09,0xF2,0x6D,0xB8]; return src.map((b,i) => b ^ k[i%13]); } },
};

// ── Main ───────────────────────────────────────────────────────────────

const AutocorrelationApp: React.FC = () => {
  const [preset, setPreset] = useState<PresetId>('xor7');
  const [custom, setCustom] = useState('');
  const [bytes, setBytes] = useState<Uint8Array>(() => PRESETS.xor7.gen());
  const [maxLag, setMaxLag] = useState(64);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const r = useMemo(() => autocorr(bytes, maxLag), [bytes, maxLag]);
  const sig = useMemo(() => sigBound(bytes.length), [bytes.length]);
  const peaks = useMemo(() => findPeaks(r, sig), [r, sig]);

  useEffect(() => {
    if (canvasRef.current) drawChart(canvasRef.current, r, sig, maxLag);
  }, [r, sig, maxLag]);

  // Redraw on resize
  useEffect(() => {
    const ro = new ResizeObserver(() => {
      if (canvasRef.current) drawChart(canvasRef.current, r, sig, maxLag);
    });
    if (canvasRef.current) ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, [r, sig, maxLag]);

  const applyBytes = (b: Uint8Array) => { setBytes(b); };

  const handleCustom = (val: string) => {
    setCustom(val);
    if (!val.trim()) return;
    const res = autoBytes(val);
    applyBytes(res ? res.bytes : new TextEncoder().encode(val));
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950 text-slate-200"
         style={{ fontFamily: "'Share Tech Mono', monospace" }}>

      <div className="flex-shrink-0 px-6 pt-5 pb-3 border-b border-slate-800 bg-slate-900/60">
        <h1 className="text-xl font-bold text-white">Autocorrelation Explorer</h1>
        <p className="text-xs text-slate-400 mt-1">
          R(lag) measures how much a sequence correlates with a shifted copy of itself — periodicity appears as spikes
        </p>
      </div>

      <div className="flex-1 overflow-auto flex flex-col lg:flex-row gap-4 p-4">

        {/* Left: controls + chart */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">

          <div className="flex flex-wrap gap-1">
            {(Object.keys(PRESETS) as PresetId[]).map(id => (
              <button key={id}
                onClick={() => { setCustom(''); setPreset(id); applyBytes(PRESETS[id].gen()); }}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                  preset === id && !custom ? 'bg-amber-900/30 border-amber-700/60 text-amber-400' : 'border-slate-700 text-slate-500 hover:text-slate-300'
                }`}
                title={PRESETS[id].desc}>{PRESETS[id].label}</button>
            ))}
          </div>

          <textarea value={custom} onChange={e => handleCustom(e.target.value)} rows={3}
            className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-300 resize-none outline-none focus:border-amber-700"
            placeholder="Paste text, hex, or base64 ciphertext…" spellCheck={false} />

          <div className="flex items-center gap-4">
            <span className="text-[10px] text-slate-500 font-mono">{bytes.length} bytes</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400">Max lag:</span>
              {[32, 64, 128, 256].map(n => (
                <button key={n} onClick={() => setMaxLag(n)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${maxLag === n ? 'text-amber-400' : 'text-slate-600'}`}>{n}</button>
              ))}
            </div>
          </div>

          {/* Chart */}
          <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-3">
            <canvas ref={canvasRef} className="w-full" style={{ height: 180 }} />
          </div>

          {/* Peak report */}
          <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Significant Peaks <span className="font-normal text-slate-600">(|R(lag)| &gt; {sig.toFixed(3)})</span>
            </div>
            {peaks.length === 0 ? (
              <p className="text-xs text-green-400">No significant peaks — consistent with random data.</p>
            ) : (
              <div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {peaks.map(p => (
                    <span key={p} className="px-2 py-0.5 rounded bg-amber-900/30 border border-amber-700/40 text-amber-400 text-[10px] font-bold">
                      lag {p}
                    </span>
                  ))}
                </div>
                {peaks.length >= 2 && (
                  <p className="text-xs text-slate-400">
                    Spacing between first peaks:{' '}
                    <span className="text-cyan-400 font-bold">
                      {peaks.length >= 2 ? peaks[1] - peaks[0] : '—'}
                    </span>
                    {' '}— likely period / key length
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-64 flex-shrink-0 flex flex-col gap-3">

          <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4">
            <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2">How to Read It</div>
            <div className="text-xs text-slate-400 leading-relaxed space-y-2">
              <p>R(lag) = 1 means perfect correlation. R = 0 means none. R = −1 means anti-correlation.</p>
              <p>For truly random data, all bars should lie between the <span className="text-red-400">red dashed bounds</span>.</p>
              <p>A repeating-key cipher retains the structure of the plaintext at every multiple of the key length — creating visible <span className="text-amber-400">amber spikes</span>.</p>
            </div>
          </div>

          <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4">
            <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2">Connection to Kasiski</div>
            <div className="text-xs text-slate-400 leading-relaxed space-y-2">
              <p>Kasiski looks at specific repeated trigrams. Autocorrelation is a continuous version: it measures all possible spacings simultaneously.</p>
              <p>For a length-n key, spikes appear at lags n, 2n, 3n… The first spike directly reveals the key length — no trigrams needed.</p>
            </div>
          </div>

          <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Formula</div>
            <div className="text-[10px] font-mono text-slate-400 space-y-1">
              <p>R(k) = Σ(x[i]−μ)(x[i+k]−μ)</p>
              <p className="pl-4">÷ (N−k) · σ²</p>
              <p className="text-slate-600 mt-1">Significance: ±1.96/√N</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutocorrelationApp;
