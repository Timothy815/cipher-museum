import React, { useState, useMemo } from 'react';
import { clean, fitness, chiSquared } from '../../lib/englishScore';

// ── Columnar Transposition Decrypt ─────────────────────────────────────

/**
 * Given ciphertext and a key permutation (0-indexed, `order[i]` = which column
 * goes to position i in left-to-right reading order), reconstruct the plaintext.
 */
function decryptColumnar(ct: string, order: number[]): string {
  const t = clean(ct);
  const numCols = order.length;
  const numRows = Math.ceil(t.length / numCols);
  const shortCols = numRows * numCols - t.length; // cols with one fewer character

  // Build each column
  const cols: string[] = [];
  let pos = 0;
  // order[i] = original column index; col i has (numRows - (order[i] >= numCols - shortCols ? 1 : 0)) chars
  const colLengths = new Array(numCols).fill(numRows);
  // The last `shortCols` columns (by column-read order) are one char shorter
  const sortedOrder = [...order].sort((a,b) => a - b);
  for (let i = numCols - shortCols; i < numCols; i++) colLengths[sortedOrder[i]]--;

  for (let col = 0; col < numCols; col++) {
    cols.push(t.slice(pos, pos + colLengths[col]));
    pos += colLengths[col];
  }

  // Reassemble row by row using the order permutation
  // order[i] = the column that goes to position i in the key
  // Actually: the key tells us the reading order of columns.
  // Standard columnar: key "CARGO" → sorted = ACGOR → col 0 read first (A=index 1 in CARGO)...
  // We just map: position i in the read order corresponds to column order[i].
  let result = '';
  for (let row = 0; row < numRows; row++) {
    for (let i = 0; i < numCols; i++) {
      const col = order[i];
      if (row < cols[col].length) result += cols[col][row];
    }
  }
  return result;
}

// ── Permutation Enumeration ────────────────────────────────────────────

function* permutations(n: number): Generator<number[]> {
  const arr = Array.from({ length: n }, (_, i) => i);
  function* perm(arr: number[], l: number): Generator<number[]> {
    if (l === arr.length) { yield [...arr]; return; }
    for (let i = l; i < arr.length; i++) {
      [arr[l], arr[i]] = [arr[i], arr[l]];
      yield* perm(arr, l + 1);
      [arr[l], arr[i]] = [arr[i], arr[l]];
    }
  }
  yield* perm(arr, 0);
}

interface SolveResult {
  order: number[];
  plaintext: string;
  score: number;
  chi: number;
}

function solveColumnar(ciphertext: string, kl: number, maxPerms = 40320): SolveResult[] {
  const results: SolveResult[] = [];
  let count = 0;
  for (const perm of permutations(kl)) {
    const pt = decryptColumnar(ciphertext, perm);
    const s  = fitness(pt);
    results.push({ order: [...perm], plaintext: pt, score: s, chi: chiSquared(pt) });
    if (++count >= maxPerms) break;
  }
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 20);
}

// Greedy column ordering for longer keys
function solveColumnarGreedy(ciphertext: string, kl: number, iterations = 5000): SolveResult[] {
  const results: SolveResult[] = [];
  for (let attempt = 0; attempt < Math.min(iterations, 200); attempt++) {
    // Random starting order
    const order = Array.from({ length: kl }, (_, i) => i)
      .sort(() => Math.random() - 0.5);
    let curScore = fitness(decryptColumnar(ciphertext, order));

    // Hill-climb: try all swaps
    let improved = true;
    while (improved) {
      improved = false;
      for (let i = 0; i < kl; i++) {
        for (let j = i + 1; j < kl; j++) {
          [order[i], order[j]] = [order[j], order[i]];
          const ns = fitness(decryptColumnar(ciphertext, order));
          if (ns > curScore) { curScore = ns; improved = true; }
          else [order[i], order[j]] = [order[j], order[i]];
        }
      }
    }
    const pt = decryptColumnar(ciphertext, order);
    results.push({ order: [...order], plaintext: pt, score: curScore, chi: chiSquared(pt) });
  }
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 20);
}

// ── Key string from order ──────────────────────────────────────────────

function orderToKeyStr(order: number[]): string {
  // Invert: col_read_position[col] = i means col is read at position i
  const inv = new Array(order.length);
  for (let i = 0; i < order.length; i++) inv[order[i]] = i;
  return inv.map(n => String.fromCharCode(65 + n)).join('');
}

// ── Main ──────────────────────────────────────────────────────────────

const SAMPLE = `TEOHTAAENRHDISLIWTGETLSOHAEVTEECMIUODHNRPNSEOH`;

const ColumnarSolverApp: React.FC = () => {
  const [input,    setInput]    = useState(SAMPLE);
  const [kl,       setKL]       = useState(5);
  const [running,  setRunning]  = useState(false);
  const [results,  setResults]  = useState<SolveResult[] | null>(null);
  const [selIdx,   setSelIdx]   = useState(0);

  const ct = clean(input);

  const klRange = useMemo(() => {
    const maxKL = Math.min(15, Math.floor(ct.length / 2));
    return Array.from({ length: Math.max(0, maxKL - 1) }, (_, i) => i + 2);
  }, [ct]);

  function handleSolve() {
    if (!ct.length) return;
    setRunning(true);
    setResults(null);
    setSelIdx(0);
    setTimeout(() => {
      let r: SolveResult[];
      if (kl <= 8) {
        r = solveColumnar(ct, kl);
      } else {
        r = solveColumnarGreedy(ct, kl, 300);
      }
      setResults(r);
      setRunning(false);
    }, 30);
  }

  const active = results?.[selIdx];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950 text-slate-200"
         style={{ fontFamily: "'Share Tech Mono', monospace" }}>

      <div className="flex-shrink-0 px-6 pt-5 pb-3 border-b border-slate-800 bg-slate-900/60">
        <h1 className="text-xl font-bold text-white">Columnar Transposition Solver</h1>
        <p className="text-xs text-slate-400 mt-1">
          Brute-force (≤8 columns) or hill-climb (9–15) using bigram fitness scoring
        </p>
      </div>

      <div className="flex-1 overflow-auto flex flex-col lg:flex-row gap-4 p-4">

        {/* Left */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ciphertext</span>
            <textarea
              value={input}
              onChange={e => { setInput(e.target.value); setResults(null); }}
              className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-300 resize-none outline-none focus:border-amber-700 h-24"
              placeholder="Paste columnar transposition ciphertext (letters only)…"
              spellCheck={false}
            />
            <p className="text-[10px] text-slate-500 mt-1 font-mono">{ct.length} letters</p>
          </div>

          {/* Key length selector */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Key Length</span>
            <div className="flex flex-wrap gap-1.5">
              {klRange.map(n => (
                <button key={n}
                  onClick={() => { setKL(n); setResults(null); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                    kl === n
                      ? 'bg-amber-600 border-amber-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  {n}
                  {n > 8 && <span className="ml-1 text-[9px] opacity-60">~</span>}
                </button>
              ))}
            </div>
            {kl > 8 && (
              <span className="text-[10px] text-amber-400/80">(hill-climb, may need re-runs)</span>
            )}
          </div>

          {/* Solve button */}
          <div className="flex gap-2">
            <button
              onClick={handleSolve}
              disabled={running || !ct.length}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 rounded-lg text-xs font-bold text-white transition-colors"
            >
              {running ? 'SOLVING…' : `SOLVE (KL=${kl})`}
            </button>
            {kl <= 8 && ct.length > 0 && (
              <span className="text-[10px] text-slate-500 self-center font-mono">
                {[...Array(kl)].reduce((a,_,i) => a*(kl-i), 1).toLocaleString()} permutations
              </span>
            )}
          </div>

          {running && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
              <span className="text-xs text-amber-400">
                {kl <= 8 ? `Testing all ${[...Array(kl)].reduce((a,_,i)=>a*(kl-i),1).toLocaleString()} permutations…` : 'Hill-climbing…'}
              </span>
            </div>
          )}

          {/* Best result */}
          {active && (
            <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Best Decryption</span>
                <span className="text-[10px] text-slate-500 font-mono">χ²={active.chi.toFixed(1)}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <span className="text-[10px] text-slate-500">Column order: </span>
                  <code className="text-xs text-amber-400 font-mono">{active.order.map(n=>n+1).join('-')}</code>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500">Key approx: </span>
                  <code className="text-xs text-green-400 font-mono">{orderToKeyStr(active.order)}</code>
                </div>
              </div>
              <p className="text-sm text-slate-200 font-mono leading-relaxed break-all bg-slate-950/40 rounded-lg p-3">
                {active.plaintext.toLowerCase()}
              </p>
            </div>
          )}

          {/* Top 20 results */}
          {results && results.length > 1 && (
            <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                Top {Math.min(results.length, 10)} Candidates
              </div>
              <div className="space-y-1">
                {results.slice(0, 10).map((r, i) => (
                  <button key={i}
                    onClick={() => setSelIdx(i)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors border font-mono ${
                      selIdx === i
                        ? 'bg-cyan-900/30 border-cyan-700 text-cyan-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <span className="text-slate-500 mr-2">#{i+1}</span>
                    <span className="text-amber-300/80 mr-3">{r.order.map(n=>n+1).join('-')}</span>
                    <span className="text-slate-500 mr-3">χ²={r.chi.toFixed(0)}</span>
                    <span className="text-slate-300 text-[10px]">
                      {r.plaintext.toLowerCase().slice(0,40)}…
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: sidebar */}
        <div className="w-full lg:w-64 flex-shrink-0 flex flex-col gap-3">

          <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4">
            <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2">How Columnar Works</div>
            <div className="text-xs text-slate-400 leading-relaxed space-y-2">
              <p>Plaintext is written in rows across <em>n</em> columns. Columns are then read out in the order specified by a keyword.</p>
              <p>To encrypt "HELLO WORLD" with key "CAB" (order 2,0,1):</p>
              <pre className="bg-slate-800 rounded p-2 text-[10px] text-slate-300 overflow-x-auto">{`H E L   col 0=H,L,O col 1=E,O,L
L O W   col 2=L,W,D
O R L
D

key CAB → read C(2),A(0),B(1)
CT: LWD HLO EOL`}</pre>
              <p>Solver tries all <em>n!</em> column orderings and scores each with English bigram frequencies.</p>
            </div>
          </div>

          <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Key Length Hints</div>
            <div className="text-xs text-slate-400 space-y-1.5">
              <p>If you know the text length and key length, check: text_len = rows × cols, short columns = text_len mod cols.</p>
              <p>Try consecutive key lengths — if one gives a much lower chi-squared, it's likely correct.</p>
              <p>Double columnar transposition (VIC cipher) requires two passes.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColumnarSolverApp;
