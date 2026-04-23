import React, { useState, useMemo } from 'react';
import { autoBytes } from '../../lib/englishScore';

// ── Statistics helpers ─────────────────────────────────────────────────

// Approximation of erfc for NIST monobit p-value
function erfc(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const p = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const e = 1 - p * Math.exp(-(x * x));
  return x >= 0 ? 1 - e : 1 + e;
}

function normSF(z: number): number {
  return 0.5 * erfc(Math.abs(z) / Math.SQRT2);
}

// ── Test implementations ───────────────────────────────────────────────

interface TestResult {
  name: string;
  pass: boolean;
  pValue?: number;
  stat: string;
  detail: React.ReactNode;
}

function toBits(bytes: Uint8Array): number[] {
  const bits: number[] = [];
  for (const b of bytes) for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1);
  return bits;
}

function runMonobit(bits: number[]): TestResult {
  const n = bits.length;
  const ones = bits.reduce((a, b) => a + b, 0);
  const zeros = n - ones;
  const pct = (ones / n) * 100;
  const sObs = Math.abs(ones - zeros) / Math.sqrt(n);
  const pValue = erfc(sObs / Math.SQRT2);
  return {
    name: 'Monobit (Frequency)',
    pass: pValue >= 0.01,
    pValue,
    stat: `${pct.toFixed(2)}% ones`,
    detail: (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 w-10">0-bits</span>
          <div className="flex-1 bg-slate-800 rounded h-3 overflow-hidden">
            <div className="h-full bg-slate-500 rounded" style={{ width: `${(zeros / n) * 100}%` }} />
          </div>
          <span className="text-[10px] font-mono text-slate-400 w-12">{(zeros / n * 100).toFixed(1)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 w-10">1-bits</span>
          <div className="flex-1 bg-slate-800 rounded h-3 overflow-hidden">
            <div className="h-full bg-cyan-600 rounded" style={{ width: `${(ones / n) * 100}%` }} />
          </div>
          <span className="text-[10px] font-mono text-cyan-400 w-12">{(ones / n * 100).toFixed(1)}%</span>
        </div>
        <div className="w-full relative h-3 bg-slate-800 rounded overflow-hidden">
          <div className="absolute inset-y-0 left-1/2 w-px bg-slate-600" />
          <div className="absolute inset-y-0 bg-slate-600/40" style={{ left: '47%', right: '47%' }} />
          <div className="absolute inset-y-0 w-1 rounded" style={{ left: `calc(${pct}% - 2px)`, background: pValue >= 0.01 ? '#22d3ee' : '#f87171' }} />
        </div>
        <p className="text-[10px] text-slate-500">Expected 50% ± 2–3% for random. |S| = {sObs.toFixed(3)}, p = {pValue.toFixed(4)}</p>
      </div>
    ),
  };
}

function runBitPosition(bytes: Uint8Array): TestResult {
  const n = bytes.length;
  const pos = new Array(8).fill(0);
  for (const b of bytes) for (let i = 0; i < 8; i++) if ((b >> i) & 1) pos[i]++;
  const maxDev = Math.max(...pos.map(c => Math.abs(c / n - 0.5)));
  const pass = maxDev < 0.05;
  return {
    name: 'Bit Position Balance',
    pass,
    stat: `max dev ${(maxDev * 100).toFixed(2)}%`,
    detail: (
      <div className="space-y-1">
        <div className="flex gap-1 items-end" style={{ height: 50 }}>
          {pos.map((c, i) => {
            const pct = c / n;
            const dev = Math.abs(pct - 0.5);
            const color = dev > 0.05 ? 'bg-red-500' : dev > 0.02 ? 'bg-amber-500' : 'bg-cyan-600';
            return (
              <div key={i} className="flex-1 flex flex-col-reverse gap-px" title={`bit ${i}: ${(pct*100).toFixed(1)}%`}>
                <div className={`${color} rounded-t`} style={{ height: `${pct * 100}%`, minHeight: 1 }} />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-[9px] text-slate-600">
          {['b0','b1','b2','b3','b4','b5','b6','b7'].map(l => <span key={l}>{l}</span>)}
        </div>
        <p className="text-[10px] text-slate-500">Each bit position should be ~50%. Red = &gt;5% deviation.</p>
      </div>
    ),
  };
}

function runRuns(bits: number[]): TestResult {
  let runs = 1;
  for (let i = 1; i < bits.length; i++) if (bits[i] !== bits[i - 1]) runs++;
  const n = bits.length;
  const ones = bits.filter(b => b === 1).length;
  const pi = ones / n;
  const eRuns = 2 * n * pi * (1 - pi) + 1;
  const varRuns = Math.max(1, 4 * n * pi ** 2 * (1 - pi) ** 2);
  const z = (runs - eRuns) / Math.sqrt(varRuns);
  const pValue = 2 * normSF(Math.abs(z));
  const pass = pValue >= 0.01;

  // Run length histogram (up to 20)
  const runLens: number[] = [];
  let cur = 1;
  for (let i = 1; i < bits.length; i++) {
    if (bits[i] === bits[i - 1]) cur++;
    else { runLens.push(cur); cur = 1; }
  }
  runLens.push(cur);
  const maxLen = Math.min(20, Math.max(...runLens));
  const lenCounts = new Array(maxLen + 1).fill(0);
  for (const l of runLens) if (l <= maxLen) lenCounts[l]++;
  const maxCount = Math.max(1, ...lenCounts);

  return {
    name: 'Runs Test',
    pass,
    pValue,
    stat: `${runs} runs`,
    detail: (
      <div className="space-y-2">
        <div className="flex gap-px items-end" style={{ height: 40 }}>
          {lenCounts.slice(1).map((c, i) => {
            const expected = Math.round(runLens.length * (0.5 ** (i + 1)));
            return (
              <div key={i} className="flex-1 flex flex-col-reverse gap-px relative" title={`len=${i+1}: ${c}`}>
                <div className="bg-slate-700 rounded-t opacity-50" style={{ height: `${(expected / maxCount) * 100}%` }} />
                <div className="bg-cyan-600 rounded-t absolute bottom-0 left-0 right-0" style={{ height: `${(c / maxCount) * 100}%` }} />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-[9px] text-slate-600">
          <span>len=1</span><span>len={maxLen}</span>
        </div>
        <p className="text-[10px] text-slate-500">Cyan = observed. Gray = expected geometric. {runs} runs, expected {eRuns.toFixed(0)}. p = {pValue.toFixed(4)}</p>
      </div>
    ),
  };
}

function runSerial(bits: number[]): TestResult {
  const n = bits.length - 1;
  const counts = [0, 0, 0, 0]; // 00, 01, 10, 11
  for (let i = 0; i < bits.length - 1; i++) counts[bits[i] * 2 + bits[i + 1]]++;
  const expected = n / 4;
  const chi2 = counts.reduce((s, c) => s + (c - expected) ** 2 / expected, 0);
  const pass = chi2 < 7.815; // critical value df=3, α=0.05
  return {
    name: '2-Bit Serial Test',
    pass,
    stat: `χ²=${chi2.toFixed(2)}`,
    detail: (
      <div className="space-y-2">
        <div className="flex gap-2">
          {['00', '01', '10', '11'].map((lbl, i) => (
            <div key={lbl} className="flex-1">
              <div className="flex items-end gap-0.5 h-10">
                <div className="flex-1 bg-slate-700/50 rounded-t" style={{ height: `${(expected / Math.max(...counts, expected)) * 100}%` }} />
                <div className="flex-1 bg-cyan-600 rounded-t" style={{ height: `${(counts[i] / Math.max(...counts, expected)) * 100}%` }} />
              </div>
              <div className="text-[9px] text-slate-500 text-center mt-0.5">{lbl}</div>
              <div className="text-[9px] font-mono text-cyan-400 text-center">{counts[i]}</div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-500">Expected ~{expected.toFixed(0)} each. χ²={chi2.toFixed(2)} (pass if &lt; 7.82 at α=0.05)</p>
      </div>
    ),
  };
}

function runByteFreq(bytes: Uint8Array): TestResult {
  const freq = new Array(256).fill(0);
  for (const b of bytes) freq[b]++;
  const n = bytes.length;
  const expected = n / 256;
  const chi2 = freq.reduce((s, c) => s + (c - expected) ** 2 / expected, 0);
  const critical = 293.2; // chi2 df=255, α=0.05
  const pass = chi2 < critical;
  const maxFreq = Math.max(...freq);

  return {
    name: 'Byte Frequency (χ² Uniformity)',
    pass,
    stat: `χ²=${chi2.toFixed(0)}`,
    detail: (
      <div className="space-y-2">
        <div className="flex gap-px items-end" style={{ height: 36 }}>
          {freq.map((c, i) => (
            <div key={i} title={`0x${i.toString(16).padStart(2,'0')}: ${c}`}
              className="flex-1"
              style={{ height: `${(c / maxFreq) * 100}%`, minHeight: c > 0 ? 1 : 0,
                background: c === 0 ? '#1e293b' : `hsl(${(i / 256) * 280 + 180}, 70%, 55%)` }}
            />
          ))}
        </div>
        <div className="flex justify-between text-[9px] text-slate-600">
          <span>0x00</span><span>0x7F</span><span>0xFF</span>
        </div>
        <p className="text-[10px] text-slate-500">χ²={chi2.toFixed(0)} vs. critical {critical} (df=255, α=0.05). Expected each byte ~{expected.toFixed(1)}×.</p>
      </div>
    ),
  };
}

// ── Presets ─────────────────────────────────────────────────────────────

function lcgBytes(n: number, seed = 12345): Uint8Array {
  let x = seed >>> 0;
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) { x = (Math.imul(1664525, x) + 1013904223) >>> 0; out[i] = x >>> 24; }
  return out;
}

type Preset = 'random' | 'lcg' | 'english' | 'zeros';
const PRESET_LABELS: Record<Preset, string> = {
  random: 'Random (secure)',
  lcg: 'LCG (weak PRNG)',
  english: 'English text',
  zeros: 'All zeros',
};

// ── Main ───────────────────────────────────────────────────────────────

const BitTestsApp: React.FC = () => {
  const [preset, setPreset] = useState<Preset>('random');
  const [custom, setCustom] = useState('');
  const [bytes, setBytes] = useState<Uint8Array>(() => { const b = new Uint8Array(4096); crypto.getRandomValues(b); return b; });

  const applyPreset = (p: Preset) => {
    setCustom('');
    setPreset(p);
    if (p === 'random') { const b = new Uint8Array(4096); crypto.getRandomValues(b); setBytes(b); }
    else if (p === 'lcg') setBytes(lcgBytes(4096));
    else if (p === 'english') setBytes(new TextEncoder().encode((`The quick brown fox jumps over the lazy dog. `.repeat(100)).slice(0, 4096)));
    else setBytes(new Uint8Array(4096));
  };

  const handleCustom = (val: string) => {
    setCustom(val);
    if (!val.trim()) return;
    const r = autoBytes(val);
    setBytes(r ? r.bytes : new TextEncoder().encode(val));
  };

  const bits = useMemo(() => toBits(bytes), [bytes]);

  const results = useMemo((): TestResult[] => {
    if (bytes.length < 32) return [];
    return [
      runMonobit(bits),
      runBitPosition(bytes),
      runRuns(bits),
      runSerial(bits),
      runByteFreq(bytes),
    ];
  }, [bytes, bits]);

  const passed = results.filter(r => r.pass).length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950 text-slate-200"
         style={{ fontFamily: "'Share Tech Mono', monospace" }}>

      <div className="flex-shrink-0 px-6 pt-5 pb-3 border-b border-slate-800 bg-slate-900/60">
        <h1 className="text-xl font-bold text-white">Bit Distribution Tests</h1>
        <p className="text-xs text-slate-400 mt-1">
          Five statistical tests that reveal whether a byte sequence looks random — or hides structure
        </p>
      </div>

      <div className="flex-1 overflow-auto flex flex-col lg:flex-row gap-4 p-4">

        <div className="flex-1 flex flex-col gap-3 min-w-0">

          <div className="flex flex-wrap gap-2 items-center">
            {(Object.keys(PRESET_LABELS) as Preset[]).map(p => (
              <button key={p} onClick={() => applyPreset(p)}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                  preset === p && !custom ? 'bg-amber-900/30 border-amber-700/60 text-amber-400' : 'border-slate-700 text-slate-500 hover:text-slate-300'
                }`}>{PRESET_LABELS[p]}</button>
            ))}
          </div>

          <textarea value={custom} onChange={e => handleCustom(e.target.value)} rows={3}
            className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-300 resize-none outline-none focus:border-amber-700"
            placeholder="Paste text, hex, or base64 to test…" spellCheck={false} />

          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-500 font-mono">{bytes.length} bytes · {bits.length} bits</span>
            {results.length > 0 && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                passed === results.length ? 'text-green-400 border-green-700/50 bg-green-950/20' :
                passed >= results.length / 2 ? 'text-amber-400 border-amber-700/50 bg-amber-950/20' :
                'text-red-400 border-red-700/50 bg-red-950/20'
              }`}>{passed}/{results.length} tests pass</span>
            )}
          </div>

          {bytes.length < 32 && <p className="text-xs text-amber-400">Need at least 32 bytes.</p>}

          <div className="grid gap-3 md:grid-cols-2">
            {results.map(r => (
              <div key={r.name} className={`rounded-xl border p-4 ${r.pass ? 'border-slate-700 bg-slate-900/40' : 'border-red-800/50 bg-red-950/10'}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-300">{r.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-500">{r.stat}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                      r.pass ? 'text-green-400 border-green-700/50 bg-green-950/20' : 'text-red-400 border-red-700/50 bg-red-950/20'
                    }`}>{r.pass ? 'PASS' : 'FAIL'}</span>
                  </div>
                </div>
                {r.detail}
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-60 flex-shrink-0 flex flex-col gap-3">
          <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4">
            <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2">Test Guide</div>
            <div className="space-y-2 text-xs text-slate-400 leading-relaxed">
              <p><span className="text-white">Monobit</span> — Should be 50% 1-bits. Imbalance means one value is over-represented.</p>
              <p><span className="text-white">Bit Position</span> — Each bit position should be equally likely to be 1. LCGs often fail this.</p>
              <p><span className="text-white">Runs</span> — Alternations should follow a geometric distribution. Patterns cause too few or too many.</p>
              <p><span className="text-white">Serial</span> — 2-bit windows should be 25% each. Tests for short-range dependencies.</p>
              <p><span className="text-white">Byte Freq</span> — All 256 byte values should appear equally often.</p>
            </div>
          </div>

          <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Pass ≠ Secure</div>
            <div className="text-xs text-slate-400 leading-relaxed">
              <p>A sequence can pass all five tests and still be predictable. These tests detect obvious weaknesses, not subtle ones.</p>
              <p className="mt-2">NIST SP 800-22 defines 15 more rigorous tests used for PRNG certification. Passing all of those is necessary (but not sufficient) for cryptographic use.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BitTestsApp;
