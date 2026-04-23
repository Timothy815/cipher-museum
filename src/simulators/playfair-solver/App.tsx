import React, { useState, useRef, useCallback } from 'react';
import { clean, bigramScore } from '../../lib/englishScore';

// ── Playfair engine ───────────────────────────────────────────────────

type Square = string[]; // 25 letters, row-major

function buildSquare(key: string): Square {
  const seen = new Set<string>();
  const sq: string[] = [];
  const k = (key.toUpperCase().replace(/J/g, 'I') + 'ABCDEFGHIKLMNOPQRSTUVWXYZ');
  for (const c of k) {
    if (/[A-Z]/.test(c) && !seen.has(c)) { seen.add(c); sq.push(c); }
  }
  return sq;
}

function squareToKey(sq: Square): string {
  // Derive a key string: the unique prefix that generates this square
  return sq.join('');
}

function pfDecryptPair(sq: Square, a: string, b: string): [string, string] {
  const ia = sq.indexOf(a), ib = sq.indexOf(b);
  const ra = Math.floor(ia / 5), ca = ia % 5;
  const rb = Math.floor(ib / 5), cb = ib % 5;

  if (ra === rb) {
    // Same row — shift left
    return [sq[ra * 5 + (ca + 4) % 5], sq[rb * 5 + (cb + 4) % 5]];
  } else if (ca === cb) {
    // Same col — shift up
    return [sq[((ra + 4) % 5) * 5 + ca], sq[((rb + 4) % 5) * 5 + cb]];
  } else {
    // Rectangle — swap cols
    return [sq[ra * 5 + cb], sq[rb * 5 + ca]];
  }
}

function prepareDigraphs(ct: string): string[][] {
  const t = clean(ct).replace(/J/g, 'I');
  const pairs: string[][] = [];
  let i = 0;
  while (i < t.length) {
    const a = t[i];
    const b = i + 1 < t.length ? t[i + 1] : 'X';
    if (a === b) { pairs.push([a, 'X']); i++; }
    else { pairs.push([a, b]); i += 2; }
  }
  return pairs;
}

function playfairDecrypt(digraphs: string[][], sq: Square): string {
  return digraphs.map(([a, b]) => pfDecryptPair(sq, a, b).join('')).join('');
}

// ── Simulated Annealing ───────────────────────────────────────────────

interface SolveResult {
  square: Square;
  plaintext: string;
  score: number;
  keyStr: string;
}

function swapTwo(sq: Square): Square {
  const s = [...sq];
  const i = Math.floor(Math.random() * 25);
  let j = Math.floor(Math.random() * 24);
  if (j >= i) j++;
  [s[i], s[j]] = [s[j], s[i]];
  return s;
}

function randomSquare(): Square {
  const alpha = 'ABCDEFGHIKLMNOPQRSTUVWXYZ'.split('');
  for (let i = alpha.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [alpha[i], alpha[j]] = [alpha[j], alpha[i]];
  }
  return alpha;
}

function runSA(digraphs: string[][], T_START: number, T_END: number, steps: number): SolveResult {
  let sq = randomSquare();
  let pt = playfairDecrypt(digraphs, sq);
  let score = bigramScore(pt);
  let bestSq = sq, bestPt = pt, bestScore = score;

  const decay = Math.pow(T_END / T_START, 1 / steps);
  let T = T_START;

  for (let i = 0; i < steps; i++) {
    const newSq = swapTwo(sq);
    const newPt = playfairDecrypt(digraphs, newSq);
    const newScore = bigramScore(newPt);
    const delta = newScore - score;

    if (delta > 0 || Math.random() < Math.exp(delta / T)) {
      sq = newSq; pt = newPt; score = newScore;
    }
    if (score > bestScore) {
      bestSq = sq; bestPt = pt; bestScore = score;
    }
    T *= decay;
  }

  return { square: bestSq, plaintext: bestPt, score: bestScore, keyStr: squareToKey(bestSq) };
}

// ── Render helpers ────────────────────────────────────────────────────

function SquareGrid({ sq, highlight }: { sq: Square; highlight?: Set<number> }) {
  return (
    <div className="grid gap-px" style={{ gridTemplateColumns: 'repeat(5, 1fr)', width: 160 }}>
      {sq.map((c, i) => (
        <div key={i}
          className={`flex items-center justify-center text-sm font-bold rounded
            ${highlight?.has(i) ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300'}`}
          style={{ height: 30 }}
        >
          {c}
        </div>
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────

const SAMPLE = 'IKEWENENXLNQLPZSLERUMRHEERYBOFNEINCHCV';

const PlayfairSolverApp: React.FC = () => {
  const [input, setInput] = useState(SAMPLE);
  const [restarts, setRestarts] = useState(4);
  const [stepsK, setStepsK] = useState(40);
  const [solving, setSolving] = useState(false);
  const [results, setResults] = useState<SolveResult[]>([]);
  const [selIdx, setSelIdx] = useState(0);
  const [manualKey, setManualKey] = useState('');
  const [manualPt, setManualPt] = useState('');
  const abortRef = useRef(false);

  const digraphs = prepareDigraphs(input);

  const handleSolve = useCallback(() => {
    if (solving) { abortRef.current = true; return; }
    if (digraphs.length < 4) return;

    abortRef.current = false;
    setSolving(true);
    setResults([]);
    setSelIdx(0);

    const all: SolveResult[] = [];
    let run = 0;

    const step = () => {
      if (abortRef.current || run >= restarts) {
        all.sort((a, b) => b.score - a.score);
        setResults(all);
        setSolving(false);
        return;
      }
      const r = runSA(digraphs, 10, 0.001, stepsK * 1000);
      all.push(r);
      all.sort((a, b) => b.score - a.score);
      setResults([...all]);
      run++;
      setTimeout(step, 10);
    };

    setTimeout(step, 10);
  }, [solving, digraphs, restarts, stepsK]);

  // Manual key decrypt
  const handleManualKey = (k: string) => {
    setManualKey(k);
    if (k.trim().length >= 1) {
      const sq = buildSquare(k);
      const pt = playfairDecrypt(digraphs, sq);
      setManualPt(pt.toLowerCase());
    } else {
      setManualPt('');
    }
  };

  const active = results[selIdx];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950 text-slate-200"
         style={{ fontFamily: "'Share Tech Mono', monospace" }}>

      <div className="flex-shrink-0 px-6 pt-5 pb-3 border-b border-slate-800 bg-slate-900/60">
        <h1 className="text-xl font-bold text-white">Playfair Auto-Solver</h1>
        <p className="text-xs text-slate-400 mt-1">
          Simulated annealing on the 5×5 key square — scored by bigram log-likelihood
        </p>
      </div>

      <div className="flex-1 overflow-auto flex flex-col lg:flex-row gap-4 p-4">

        {/* Left */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">

          <textarea
            value={input}
            onChange={e => { setInput(e.target.value); setResults([]); }}
            rows={3}
            className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-300 resize-none outline-none focus:border-amber-700"
            placeholder="Paste Playfair ciphertext (uppercase letters)…"
            spellCheck={false}
          />
          <p className="text-[10px] text-slate-500 font-mono -mt-1">
            {digraphs.length * 2} letters → {digraphs.length} digraphs
          </p>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400">Restarts:</span>
              {[2,4,6,8].map(n => (
                <button key={n} onClick={() => setRestarts(n)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${restarts === n ? 'text-amber-400' : 'text-slate-600'}`}
                >{n}</button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400">Steps/restart:</span>
              {[20,40,60,100].map(n => (
                <button key={n} onClick={() => setStepsK(n)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${stepsK === n ? 'text-amber-400' : 'text-slate-600'}`}
                >{n}k</button>
              ))}
            </div>
            <button
              onClick={handleSolve}
              disabled={digraphs.length < 4}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                solving
                  ? 'bg-red-800 border-red-700 text-red-200'
                  : 'bg-amber-600 border-amber-500 text-white hover:bg-amber-500 disabled:opacity-40'
              }`}
            >
              {solving ? `Stop (${results.length}/${restarts} done)` : 'Solve'}
            </button>
          </div>

          {/* Best result */}
          {active && (
            <div className="bg-slate-900/60 rounded-xl border border-amber-800/40 p-4">
              <div className="flex items-start gap-4">
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Key Square #{selIdx + 1}</div>
                  <SquareGrid sq={active.square} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Plaintext</div>
                  <p className="text-sm font-mono text-slate-200 break-all leading-relaxed">
                    {active.plaintext.toLowerCase()}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-2">
                    Score: <span className="text-amber-400 font-bold">{active.score.toFixed(0)}</span>
                    {' · '}Key: <span className="text-cyan-400">{active.keyStr.slice(0, 20)}{active.keyStr.length > 20 ? '…' : ''}</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* All restarts */}
          {results.length > 1 && (
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">All Runs</div>
              <div className="space-y-1">
                {results.map((r, i) => (
                  <button key={i}
                    onClick={() => setSelIdx(i)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors text-left ${
                      selIdx === i ? 'bg-amber-900/30 border border-amber-800/40' : 'hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-amber-400 font-bold w-6">#{i + 1}</span>
                    <span className="text-cyan-400 font-mono w-16">{r.score.toFixed(0)}</span>
                    <span className="text-slate-400 font-mono truncate text-[10px]">
                      {r.plaintext.toLowerCase().slice(0, 60)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Manual key */}
          <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Manual Key Entry</div>
            <input
              value={manualKey}
              onChange={e => handleManualKey(e.target.value)}
              placeholder="Type a key word / phrase…"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs font-mono text-slate-300 outline-none focus:border-amber-700 mb-2"
              spellCheck={false}
            />
            {manualKey && (
              <div className="flex items-start gap-4">
                <SquareGrid sq={buildSquare(manualKey)} />
                <p className="text-xs font-mono text-slate-300 break-all leading-relaxed flex-1">
                  {manualPt}
                </p>
              </div>
            )}
          </div>

          {digraphs.length < 4 && input.length > 0 && (
            <p className="text-xs text-amber-400">Need at least 8 ciphertext letters for analysis.</p>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-64 flex-shrink-0 flex flex-col gap-3">

          <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4">
            <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2">How Playfair Works</div>
            <div className="text-xs text-slate-400 leading-relaxed space-y-2">
              <p>A 5×5 key square holds 25 letters (I=J). Plaintext is split into digraphs, padding with X when needed.</p>
              <p><strong className="text-slate-300">Same row</strong> → shift right (encrypt) / left (decrypt).</p>
              <p><strong className="text-slate-300">Same col</strong> → shift down / up.</p>
              <p><strong className="text-slate-300">Rectangle</strong> → swap columns within same rows.</p>
            </div>
          </div>

          <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4">
            <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2">Solving Strategy</div>
            <div className="text-xs text-slate-400 leading-relaxed space-y-2">
              <p>SA starts with a random 5×5 square, randomly swaps two letters, accepts the change if it improves the bigram score or with probability e^(Δ/T).</p>
              <p>Temperature cools from 10 → 0.001 over all steps. More steps = better accuracy but slower.</p>
              <p>Longer ciphertexts (&gt;100 letters) solve reliably. Short texts (&lt;40) may need many restarts.</p>
            </div>
          </div>

          <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Tips</div>
            <div className="text-xs text-slate-400 leading-relaxed space-y-1.5">
              <p>• Double letters within a pair are separated by X: BALLOON → BA LX LO ON</p>
              <p>• Odd-length text gets trailing X appended</p>
              <p>• I and J are treated as the same letter</p>
              <p>• Best results with 80+ letters</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayfairSolverApp;
