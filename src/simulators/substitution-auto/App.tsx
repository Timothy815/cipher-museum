import React, { useState, useRef, useCallback } from 'react';
import { clean, fitness, letterScore, chiSquared, ENG_FREQ, letterCounts } from '../../lib/englishScore';

// ── SA Solver ─────────────────────────────────────────────────────────

interface SolveResult {
  key: number[];   // key[cipher_idx] = plaintext_idx
  text: string;
  score: number;
  steps: number;
}

function decryptWith(ct: number[], key: number[]): string {
  return ct.map(c => String.fromCharCode(65 + key[c])).join('');
}

function runSA(ciphertext: string, restarts: number, stepsPerRun: number): SolveResult {
  const ct = clean(ciphertext);
  const codes = Array.from(ct).map(c => c.charCodeAt(0) - 65);

  // Sort cipher & English letters by frequency for initial key
  const freq = new Array(26).fill(0);
  for (const c of codes) freq[c]++;
  const byCipherFreq = Array.from({ length: 26 }, (_, i) => i).sort((a, b) => freq[b] - freq[a]);
  const byEngFreq    = Array.from({ length: 26 }, (_, i) => i).sort((a, b) => ENG_FREQ[b] - ENG_FREQ[a]);

  let globalBest: SolveResult = { key: [], text: '', score: -Infinity, steps: 0 };

  for (let run = 0; run < restarts; run++) {
    const key = new Array(26).fill(0);
    for (let i = 0; i < 26; i++) key[byCipherFreq[i]] = byEngFreq[i];

    // Add jitter on subsequent restarts
    if (run > 0) {
      for (let s = 0; s < 8; s++) {
        const i = Math.floor(Math.random() * 26);
        const j = (i + 1 + Math.floor(Math.random() * 25)) % 26;
        [key[i], key[j]] = [key[j], key[i]];
      }
    }

    let curScore = fitness(decryptWith(codes, key));
    let bestKey  = [...key];
    let bestScore = curScore;

    const T_START = 20;
    const T_END   = 0.1;
    const decay   = Math.pow(T_END / T_START, 1 / stepsPerRun);
    let T = T_START;

    for (let step = 0; step < stepsPerRun; step++) {
      const i = Math.floor(Math.random() * 26);
      const j = (i + 1 + Math.floor(Math.random() * 25)) % 26;
      [key[i], key[j]] = [key[j], key[i]];

      const ns = fitness(decryptWith(codes, key));
      if (ns > curScore || Math.random() < Math.exp((ns - curScore) / T)) {
        curScore = ns;
        if (ns > bestScore) { bestScore = ns; bestKey = [...key]; }
      } else {
        [key[i], key[j]] = [key[j], key[i]]; // undo
      }
      T *= decay;
    }

    if (bestScore > globalBest.score) {
      globalBest = {
        key: bestKey,
        text: decryptWith(codes, bestKey),
        score: bestScore,
        steps: stepsPerRun * (run + 1),
      };
    }
  }

  return globalBest;
}

// ── Key Display ────────────────────────────────────────────────────────

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function KeyTable({ cipherKey, onSwap }: {
  cipherKey: number[];
  onSwap: (i: number, j: number) => void;
}) {
  const [swapA, setSwapA] = useState<number | null>(null);

  function handleClick(i: number) {
    if (swapA === null) {
      setSwapA(i);
    } else {
      if (swapA !== i) onSwap(swapA, i);
      setSwapA(null);
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="text-[11px] font-mono border-separate border-spacing-0.5">
        <thead>
          <tr>
            <td className="px-2 text-slate-500 text-[10px]">CIPHER</td>
            {ALPHA.split('').map(c => (
              <td key={c} className="w-7 text-center text-slate-400">{c}</td>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="px-2 text-slate-500 text-[10px]">PLAIN</td>
            {cipherKey.map((pt, i) => {
              const isSwapA = swapA === i;
              return (
                <td key={i}
                  onClick={() => handleClick(i)}
                  className={`w-7 h-7 text-center rounded cursor-pointer transition-colors font-bold select-none ${
                    isSwapA ? 'bg-amber-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-cyan-400'
                  }`}
                >
                  {ALPHA[pt]}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
      {swapA !== null && (
        <p className="text-[10px] text-amber-400 mt-1 font-mono">
          Swapping {ALPHA[swapA]} → click another cipher letter to complete swap
        </p>
      )}
    </div>
  );
}

// ── Frequency Bar ──────────────────────────────────────────────────────

function FreqBars({ text }: { text: string }) {
  const t = clean(text);
  const cnt = letterCounts(t);
  const n = t.length || 1;
  const maxObs = Math.max(...cnt) / n;

  return (
    <div className="flex gap-px items-end h-16">
      {ALPHA.split('').map((c, i) => {
        const obs = cnt[i] / n;
        const eng = ENG_FREQ[i];
        return (
          <div key={c} className="flex flex-col items-center" style={{ width: 14 }}>
            <div className="w-full flex flex-col-reverse gap-px" style={{ height: 52 }}>
              <div style={{ height: `${(obs / maxObs) * 100}%`, minHeight: obs > 0 ? 2 : 0 }}
                className="bg-cyan-500 w-full rounded-t" />
              <div style={{ height: `${(eng / maxObs) * 100}%` }}
                className="bg-slate-600 w-full rounded-t opacity-40" />
            </div>
            <span className="text-[8px] text-slate-500 mt-0.5">{c}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────

const SAMPLE = `LKBOH LZYBK TQHBL ZKVKN ZHBLZ KXHLB PKZQN ZKBOH LHXNX OBKZQ
NXHBL ZLKBK HXBLZ KVKNH NZQHB LZKXO BLZKV KNZQH BLZKB OHLZK
YBNZQ HBLZK XHLBP KZQNZ KBOHL ZKYBN ZQHBL ZKXHL BPKZQ NZKBO`;

const SubstitutionAutoApp: React.FC = () => {
  const [input,    setInput]    = useState(SAMPLE);
  const [result,   setResult]   = useState<SolveResult | null>(null);
  const [running,  setRunning]  = useState(false);
  const [manKey,   setManKey]   = useState<number[] | null>(null);

  const handleSolve = useCallback(() => {
    if (clean(input).length < 20) return;
    setRunning(true);
    setManKey(null);
    setTimeout(() => {
      const r = runSA(input, 4, 30_000);
      setResult(r);
      setManKey([...r.key]);
      setRunning(false);
    }, 30);
  }, [input]);

  const handleSwap = useCallback((i: number, j: number) => {
    if (!manKey) return;
    const k = [...manKey];
    [k[i], k[j]] = [k[j], k[i]];
    setManKey(k);
  }, [manKey]);

  const decrypted = manKey && result
    ? decryptWith(Array.from(clean(input)).map(c => c.charCodeAt(0) - 65), manKey)
    : null;

  const ct = clean(input);
  const chi = ct.length > 10 ? chiSquared(input).toFixed(1) : '—';
  const letS = ct.length > 10 ? letterScore(input).toFixed(1) : '—';

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950 text-slate-200"
         style={{ fontFamily: "'Share Tech Mono', monospace" }}>

      <div className="flex-shrink-0 px-6 pt-5 pb-3 border-b border-slate-800 bg-slate-900/60">
        <h1 className="text-xl font-bold text-white">Auto Substitution Solver</h1>
        <p className="text-xs text-slate-400 mt-1">
          Simulated annealing + bigram scoring — automatically breaks simple substitution ciphers
        </p>
      </div>

      <div className="flex-1 overflow-auto flex flex-col lg:flex-row gap-4 p-4">

        {/* Left: input + controls */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">

          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ciphertext</span>
            <span className="text-[10px] text-slate-600 font-mono">{ct.length} letters</span>
            {ct.length > 10 && <span className="text-[10px] text-slate-600 font-mono">χ²={chi}</span>}
          </div>
          <textarea
            value={input}
            onChange={e => { setInput(e.target.value); setResult(null); setManKey(null); }}
            className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-300 resize-none outline-none focus:border-amber-700 h-36"
            placeholder="Paste monoalphabetic substitution ciphertext…"
            spellCheck={false}
          />

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleSolve}
              disabled={running || ct.length < 20}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-bold text-white transition-colors"
            >
              {running ? 'SOLVING…' : 'AUTO-SOLVE'}
            </button>
            <button
              onClick={() => { setInput(''); setResult(null); setManKey(null); }}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-400 transition-colors"
            >
              CLEAR
            </button>
            {ct.length < 20 && ct.length > 0 && (
              <span className="text-[10px] text-red-400 self-center">needs ≥ 20 letters</span>
            )}
          </div>

          {running && (
            <div className="bg-slate-900 border border-amber-800/40 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                <span className="text-xs text-amber-400">Running 4 SA restarts × 30,000 steps…</span>
              </div>
            </div>
          )}

          {/* Key table */}
          {manKey && !running && (
            <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Key — click two cipher letters to swap</span>
                {result && <span className="text-[10px] text-slate-500 font-mono">fitness {result.score.toFixed(0)}</span>}
              </div>
              <KeyTable cipherKey={manKey} onSwap={handleSwap} />
            </div>
          )}

          {/* Decrypted output */}
          {decrypted && !running && (
            <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Decrypted</span>
                <span className="text-[10px] text-slate-500 font-mono">χ²={chiSquared(decrypted).toFixed(1)}</span>
              </div>
              <p className="text-sm text-slate-200 font-mono leading-relaxed break-all">
                {decrypted.toLowerCase()}
              </p>
            </div>
          )}
        </div>

        {/* Right: sidebar */}
        <div className="w-full lg:w-64 flex-shrink-0 flex flex-col gap-3">

          {/* Frequency bars */}
          <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
              Letter Frequency
              <span className="normal-case font-normal ml-1 text-slate-600">(cyan=observed, dark=English)</span>
            </div>
            <FreqBars text={decrypted ?? input} />
          </div>

          {/* How it works */}
          <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4">
            <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2">How It Works</div>
            <div className="text-xs text-slate-400 leading-relaxed space-y-2">
              <p>Starts with a frequency-matched key (most-common cipher letter → E, T, A…).</p>
              <p>Runs simulated annealing: randomly swaps two key letters, keeps swaps that improve bigram fitness, occasionally accepts worse swaps to escape local optima.</p>
              <p>4 independent restarts with different random seeds. Picks the best result.</p>
              <p>After solving, click two cipher letters in the key table to manually correct errors.</p>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Tips</div>
            <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
              <li>Works best on ≥ 100 letters</li>
              <li>Short texts may need manual correction</li>
              <li>Re-run for a second opinion</li>
              <li>Use the key table to fix individual letters</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubstitutionAutoApp;
