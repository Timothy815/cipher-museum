import React, { useState, useMemo } from 'react';
import { clean, ioc } from '../../lib/englishScore';

// ── Kasiski Engine ────────────────────────────────────────────────────

interface Repeat {
  seq: string;
  positions: number[];
  spacings: number[];
  factors: number[];
  gcd: number;
}

function gcd(a: number, b: number): number {
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

function gcdAll(nums: number[]): number {
  return nums.reduce((a, b) => gcd(a, b));
}

function factorsUpTo(n: number, max: number): number[] {
  const f: number[] = [];
  for (let i = 2; i <= Math.min(n, max); i++) if (n % i === 0) f.push(i);
  return f;
}

function findRepeats(text: string, minLen: number, maxLen: number): Repeat[] {
  const t = clean(text);
  const seen = new Map<string, number[]>();

  for (let len = maxLen; len >= minLen; len--) {
    for (let i = 0; i <= t.length - len; i++) {
      const seq = t.slice(i, i + len);
      if (seen.has(seq)) continue;

      const positions: number[] = [];
      for (let j = 0; j <= t.length - len; j++) {
        if (t.slice(j, j + len) === seq) positions.push(j);
      }
      if (positions.length >= 2) seen.set(seq, positions);
    }
  }

  return [...seen.entries()].map(([seq, positions]) => {
    const spacings: number[] = [];
    for (let i = 0; i < positions.length - 1; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        spacings.push(positions[j] - positions[i]);
      }
    }
    const allFactors: number[] = [];
    spacings.forEach(s => allFactors.push(...factorsUpTo(s, 30)));
    const g = gcdAll(spacings);
    return { seq, positions, spacings, factors: allFactors, gcd: g };
  }).sort((a, b) => b.seq.length - a.seq.length || b.positions.length - a.positions.length);
}

function factorHistogram(repeats: Repeat[]): Map<number, number> {
  const freq = new Map<number, number>();
  for (const r of repeats) {
    const seen = new Set<number>();
    for (const s of r.spacings) {
      for (const f of factorsUpTo(s, 30)) {
        if (!seen.has(f)) { seen.add(f); freq.set(f, (freq.get(f) ?? 0) + 1); }
      }
    }
  }
  return freq;
}

// ── IoC at stride ─────────────────────────────────────────────────────

function iocAtStride(text: string, stride: number): number {
  const t = clean(text);
  const streams: string[] = Array.from({length: stride}, (_,i) => {
    let s = '';
    for (let j = i; j < t.length; j += stride) s += t[j];
    return s;
  });
  return streams.reduce((sum, s) => sum + ioc(s), 0) / stride;
}

// ── Main ──────────────────────────────────────────────────────────────

const SAMPLE = `CHREEVOAHMAERATBIAXXWTNXBEEOPHBSBQMQEQERBW
RVXUOAKXAOSXXWEAHBWGJMMQMNKGRFVGXWTRZXWI
AKXTVEXFEYXHMOFRAFLXMXRLWNHJKTRZYBIQKMAXX
STAXMTSUGYNT`;

const KasiskiApp: React.FC = () => {
  const [input,  setInput]  = useState(SAMPLE.replace(/\n/g,' '));
  const [minLen, setMinLen] = useState(3);
  const [maxLen, setMaxLen] = useState(5);
  const [selKL,  setSelKL]  = useState<number | null>(null);

  const t = clean(input);

  const repeats = useMemo(() => {
    if (t.length < 20) return [];
    return findRepeats(t, minLen, maxLen);
  }, [t, minLen, maxLen]);

  const histogram = useMemo(() => factorHistogram(repeats), [repeats]);

  const sortedFactors = useMemo(() => {
    return [...histogram.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);
  }, [histogram]);

  const maxCount = sortedFactors[0]?.[1] ?? 1;

  const iocValues = useMemo(() => {
    if (t.length < 20) return [];
    return Array.from({length: 14}, (_, i) => {
      const kl = i + 2;
      return { kl, ioc: iocAtStride(t, kl) };
    });
  }, [t]);

  const overallIoc = useMemo(() => t.length >= 2 ? ioc(t) : 0, [t]);

  // Estimated key length: highest factor count (avoid 1, 2)
  const topKL = sortedFactors.filter(([f]) => f >= 2).slice(0, 5);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950 text-slate-200"
         style={{ fontFamily: "'Share Tech Mono', monospace" }}>

      <div className="flex-shrink-0 px-6 pt-5 pb-3 border-b border-slate-800 bg-slate-900/60">
        <h1 className="text-xl font-bold text-white">Kasiski Examination</h1>
        <p className="text-xs text-slate-400 mt-1">
          Find repeated sequences, extract their spacings, and factor-analyze to estimate the Vigenère key length
        </p>
      </div>

      <div className="flex-1 overflow-auto flex flex-col lg:flex-row gap-4 p-4">

        {/* Left: main analysis */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">

          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            rows={4}
            className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-300 resize-none outline-none focus:border-amber-700"
            placeholder="Paste Vigenère / polyalphabetic ciphertext…"
            spellCheck={false}
          />

          <div className="flex flex-wrap items-center gap-4">
            <span className="text-[10px] text-slate-500 font-mono">{t.length} letters</span>
            <span className={`text-[10px] font-mono font-bold ${overallIoc > 0.060 ? 'text-green-400' : overallIoc > 0.050 ? 'text-amber-400' : 'text-slate-400'}`}>
              IoC={overallIoc.toFixed(4)}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400">Repeat length:</span>
              {[3,4,5,6].map(n => (
                <button key={n}
                  onClick={() => setMinLen(Math.min(n, maxLen))}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${minLen <= n && n <= maxLen ? 'text-amber-400' : 'text-slate-600'}`}
                >{n}</button>
              ))}
            </div>
          </div>

          {/* Factor frequency chart */}
          {sortedFactors.length > 0 && (
            <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                Factor Frequency
                <span className="normal-case font-normal ml-1 text-slate-600">— the most common factor is likely the key length</span>
              </div>
              <div className="space-y-1.5">
                {sortedFactors.map(([factor, count]) => {
                  const pct = (count / maxCount) * 100;
                  const isCandidateKL = factor >= 2;
                  return (
                    <button key={factor}
                      onClick={() => setSelKL(selKL === factor ? null : factor)}
                      className={`w-full flex items-center gap-3 px-2 py-1.5 rounded-lg transition-colors text-left ${
                        selKL === factor ? 'bg-amber-900/30' : 'hover:bg-slate-800'
                      }`}
                    >
                      <span className={`text-xs font-bold w-8 ${isCandidateKL ? 'text-amber-400' : 'text-slate-500'}`}>
                        ×{factor}
                      </span>
                      <div className="flex-1 bg-slate-800 rounded-full h-3 overflow-hidden">
                        <div className="h-full rounded-full bg-cyan-600 transition-all" style={{width:`${pct}%`}}/>
                      </div>
                      <span className="text-xs text-slate-400 font-mono w-8 text-right">{count}</span>
                      {topKL[0]?.[0] === factor && (
                        <span className="text-[9px] text-amber-400 font-bold">★ top</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* IoC at stride */}
          {iocValues.length > 0 && (
            <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                IoC at Each Key Length
                <span className="normal-case font-normal ml-1 text-slate-600">— spike near English (0.067) = correct stride</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {iocValues.map(({kl, ioc:v}) => (
                  <div key={kl}
                    className={`px-2 py-1 rounded-lg text-[10px] font-mono border ${
                      v > 0.062 ? 'border-green-700/50 bg-green-950/20 text-green-400' :
                      v > 0.055 ? 'border-cyan-700/40 bg-cyan-950/10 text-cyan-400' :
                      'border-slate-700 text-slate-500'
                    }`}
                  >
                    <span className="text-slate-400">KL={kl} </span>{v.toFixed(4)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Repeated sequences table */}
          {repeats.length > 0 && (
            <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                Repeated Sequences ({repeats.length} found)
              </div>
              <div className="overflow-x-auto">
                <table className="text-[11px] font-mono w-full">
                  <thead>
                    <tr className="text-[9px] text-slate-500 uppercase tracking-widest">
                      <th className="text-left pb-2 pr-3">Seq</th>
                      <th className="text-left pb-2 pr-3">Count</th>
                      <th className="text-left pb-2 pr-3">Positions</th>
                      <th className="text-left pb-2 pr-3">Spacings</th>
                      <th className="text-left pb-2">GCD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {repeats.slice(0, 30).map((r, i) => (
                      <tr key={i} className={selKL && r.spacings.every(s => s % selKL === 0) ? 'bg-amber-900/10' : ''}>
                        <td className="py-1.5 pr-3 text-amber-400 font-bold">{r.seq}</td>
                        <td className="py-1.5 pr-3 text-slate-300">{r.positions.length}×</td>
                        <td className="py-1.5 pr-3 text-slate-500">{r.positions.slice(0,6).join(', ')}{r.positions.length>6?'…':''}</td>
                        <td className="py-1.5 pr-3 text-cyan-400">{r.spacings.slice(0,4).join(', ')}{r.spacings.length>4?'…':''}</td>
                        <td className={`py-1.5 font-bold ${r.gcd >= 2 ? 'text-green-400' : 'text-slate-500'}`}>{r.gcd}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {repeats.length > 30 && (
                  <p className="text-[10px] text-slate-600 mt-2">(showing 30 of {repeats.length})</p>
                )}
              </div>
            </div>
          )}

          {t.length < 20 && t.length > 0 && (
            <p className="text-xs text-amber-400">Needs at least 20 letters for meaningful analysis.</p>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-64 flex-shrink-0 flex flex-col gap-3">

          {topKL.length > 0 && (
            <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4">
              <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-2">Top Key Length Candidates</div>
              <div className="space-y-2">
                {topKL.map(([f, count], i) => (
                  <div key={f} className={`flex items-center gap-2 text-sm ${i===0?'text-cyan-400':'text-slate-400'}`}>
                    <span className="text-[10px] text-slate-500">#{i+1}</span>
                    <span className="font-bold font-mono">KL = {f}</span>
                    <span className="text-[10px] text-slate-500">{count} spacings divisible</span>
                    {i === 0 && <span className="text-[9px] text-amber-400 ml-auto">★</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4">
            <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2">How Kasiski Works</div>
            <div className="text-xs text-slate-400 leading-relaxed space-y-2">
              <p>In a Vigenère cipher with key length <em>n</em>, any repeated plaintext that aligns with the same key position will produce the same ciphertext fragment.</p>
              <p>The distance between two such matches is always a multiple of <em>n</em>. Collecting all distances and finding their most common factor reveals the key length.</p>
              <p>Once the key length is known, each position i decrypts as a simple Caesar cipher with key[i mod n].</p>
            </div>
          </div>

          <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">IoC Reference</div>
            <div className="space-y-1 text-[10px]">
              {[
                ['0.0385','Random/uniform','text-slate-400'],
                ['0.0430','Vigenère KL>8','text-slate-400'],
                ['0.0530','Vigenère KL=3','text-amber-400'],
                ['0.0600','Vigenère KL=2','text-amber-400'],
                ['0.0667','English text','text-green-400'],
              ].map(([v,l,c])=>(
                <div key={v} className="flex gap-2">
                  <span className={`font-mono font-bold w-14 ${c}`}>{v}</span>
                  <span className="text-slate-400">{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KasiskiApp;
