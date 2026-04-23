import React, { useState, useMemo } from 'react';
import { clean, chiSquared, ENG_FREQ } from '../../lib/englishScore';

// ── Modular inverse ───────────────────────────────────────────────────
function modInv(a: number, m: number): number {
  for (let x = 1; x < m; x++) if ((a * x) % m === 1) return x;
  return -1;
}

// ── Affine decrypt ────────────────────────────────────────────────────
function affineDecrypt(ct: string, a: number, b: number): string {
  const inv = modInv(a, 26);
  if (inv === -1) return '';
  return clean(ct).split('').map(c => {
    const x = c.charCodeAt(0) - 65;
    return String.fromCharCode(((inv * (x - b + 26)) % 26) + 65);
  }).join('');
}

// ── Valid `a` values (coprime to 26) ──────────────────────────────────
const VALID_A = [1,3,5,7,9,11,15,17,19,21,23,25];

interface Candidate {
  a: number;
  b: number;
  label: string;
  plaintext: string;
  chi: number;
}

function buildCandidates(ct: string): Candidate[] {
  const results: Candidate[] = [];
  for (const a of VALID_A) {
    for (let b = 0; b < 26; b++) {
      const pt = affineDecrypt(ct, a, b);
      if (!pt.length) continue;
      results.push({
        a, b,
        label: a === 1 ? `Caesar +${b}` : `a=${a}, b=${b}`,
        plaintext: pt,
        chi: chiSquared(pt),
      });
    }
  }
  return results.sort((a, b) => a.chi - b.chi);
}

// ── Chi-squared colour ────────────────────────────────────────────────
function chiColor(chi: number): string {
  if (chi < 20)  return 'text-green-400';
  if (chi < 50)  return 'text-cyan-400';
  if (chi < 100) return 'text-amber-400';
  return 'text-slate-500';
}

function chiBg(chi: number): string {
  if (chi < 20)  return 'border-green-700/50 bg-green-950/20';
  if (chi < 50)  return 'border-cyan-700/40 bg-cyan-950/10';
  if (chi < 100) return 'border-amber-800/30 bg-amber-950/10';
  return 'border-slate-700 bg-slate-900/20';
}

// ── Letter frequency bar ──────────────────────────────────────────────
function FreqBar({ text }: { text: string }) {
  const t = clean(text);
  if (!t.length) return null;
  const cnt = new Array(26).fill(0);
  for (let i = 0; i < t.length; i++) cnt[t.charCodeAt(i)-65]++;
  const n = t.length;
  const maxV = Math.max(...cnt.map(c=>c/n), ...ENG_FREQ);
  return (
    <div className="flex gap-px items-end" style={{height:36}}>
      {cnt.map((c,i)=>{
        const obs = c/n; const eng = ENG_FREQ[i];
        return (
          <div key={i} title={String.fromCharCode(65+i)} className="flex flex-col-reverse gap-px" style={{width:7,height:34}}>
            <div style={{height:`${(obs/maxV)*100}%`,minHeight:obs>0?1:0}} className="bg-cyan-500 rounded-t w-full"/>
            <div style={{height:`${(eng/maxV)*100}%`}} className="bg-slate-600/40 rounded-t w-full"/>
          </div>
        );
      })}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────

const SAMPLE_CAESAR = 'WKH TXLFN EURZQ IRA MXPSV RYHU WKH ODCB GRJ';
const SAMPLE_AFFINE = 'IHHWATLASAIQ';

type Mode = 'caesar' | 'affine';

const ShiftSolverApp: React.FC = () => {
  const [mode,   setMode]   = useState<Mode>('caesar');
  const [input,  setInput]  = useState(SAMPLE_CAESAR);
  const [selIdx, setSelIdx] = useState(0);
  const [showAll, setShowAll] = useState(false);

  const ct = clean(input);

  const candidates = useMemo(() => {
    if (!ct.length) return [];
    if (mode === 'caesar') {
      return buildCandidates(ct).filter(c => c.a === 1);
    }
    return buildCandidates(ct);
  }, [ct, mode]);

  const display = showAll ? candidates : candidates.slice(0, mode === 'caesar' ? 25 : 20);
  const active = candidates[selIdx];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950 text-slate-200"
         style={{ fontFamily: "'Share Tech Mono', monospace" }}>

      <div className="flex-shrink-0 px-6 pt-5 pb-3 border-b border-slate-800 bg-slate-900/60">
        <h1 className="text-xl font-bold text-white">Caesar & Affine Brute-Forcer</h1>
        <p className="text-xs text-slate-400 mt-1">
          All 25 Caesar shifts or all 312 Affine (a,b) pairs — ranked by chi-squared fitness
        </p>
      </div>

      <div className="flex-1 overflow-auto flex flex-col lg:flex-row gap-4 p-4">

        {/* Left */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">

          {/* Mode */}
          <div className="flex gap-2">
            {(['caesar','affine'] as Mode[]).map(m => (
              <button key={m}
                onClick={() => { setMode(m); setSelIdx(0); setInput(m==='caesar' ? SAMPLE_CAESAR : SAMPLE_AFFINE); }}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                  mode === m ? 'bg-amber-600 border-amber-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                {m === 'caesar' ? 'Caesar (25 shifts)' : 'Affine (312 pairs)'}
              </button>
            ))}
          </div>

          <textarea
            value={input}
            onChange={e => { setInput(e.target.value); setSelIdx(0); }}
            rows={3}
            className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-300 resize-none outline-none focus:border-amber-700"
            placeholder="Paste ciphertext…"
            spellCheck={false}
          />
          <p className="text-[10px] text-slate-500 font-mono -mt-1">{ct.length} letters</p>

          {/* Best result callout */}
          {active && (
            <div className={`rounded-xl border p-4 ${chiBg(active.chi)}`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm font-bold ${chiColor(active.chi)}`}>{active.label}</span>
                <span className={`text-xs font-mono ${chiColor(active.chi)}`}>χ²={active.chi.toFixed(1)}</span>
              </div>
              <p className="text-sm font-mono text-slate-200 break-all leading-relaxed">
                {active.plaintext.toLowerCase()}
              </p>
              <div className="mt-3">
                <FreqBar text={active.plaintext} />
              </div>
            </div>
          )}

          {/* Candidate table */}
          {display.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  All Candidates <span className="text-slate-600 font-normal">(click to select)</span>
                </span>
                {candidates.length > display.length && (
                  <button onClick={() => setShowAll(true)} className="text-[10px] text-amber-400 hover:text-amber-300">
                    show all {candidates.length}
                  </button>
                )}
              </div>
              <div className="space-y-0.5 max-h-96 overflow-y-auto">
                {display.map((c, i) => (
                  <button key={`${c.a}-${c.b}`}
                    onClick={() => setSelIdx(i)}
                    className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors ${
                      selIdx === i ? 'bg-amber-900/30 border border-amber-800/50' : 'hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-amber-400 font-bold w-24 flex-shrink-0">{c.label}</span>
                    <span className={`font-mono w-12 flex-shrink-0 ${chiColor(c.chi)}`}>
                      {c.chi.toFixed(0)}
                    </span>
                    <span className="text-slate-400 font-mono truncate text-[10px]">
                      {c.plaintext.toLowerCase().slice(0, 50)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-60 flex-shrink-0 flex flex-col gap-3">

          <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4">
            <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2">
              {mode === 'caesar' ? 'Caesar Cipher' : 'Affine Cipher'}
            </div>
            <div className="text-xs text-slate-400 leading-relaxed space-y-2">
              {mode === 'caesar' ? (
                <>
                  <p>E(x) = (x + shift) mod 26. Only 25 meaningful keys — trivially broken by trying all.</p>
                  <p>ROT13 is Caesar with shift=13. It's its own inverse.</p>
                </>
              ) : (
                <>
                  <p>E(x) = (a·x + b) mod 26. Decrypt: D(x) = a⁻¹·(x − b) mod 26.</p>
                  <p><code className="text-slate-300">a</code> must be coprime to 26: {VALID_A.join(', ')}. That gives 12×26 = 312 keys.</p>
                  <p>Caesar is affine with a=1. Atbash is a=25, b=25.</p>
                </>
              )}
            </div>
          </div>

          <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Score Guide</div>
            <div className="space-y-1.5 text-xs">
              {[
                ['< 20',  'green',  'Very likely English'],
                ['20–50', 'cyan',   'Possibly English'],
                ['50–100','amber',  'Unlikely'],
                ['> 100', 'slate',  'Wrong key'],
              ].map(([r, c, l]) => (
                <div key={r} className="flex items-center gap-2">
                  <span className={`font-mono w-14 text-${c}-400`}>{r}</span>
                  <span className="text-slate-400">{l}</span>
                </div>
              ))}
            </div>
          </div>

          {mode === 'affine' && (
            <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Notable Keys</div>
              <div className="space-y-1 text-[10px] font-mono">
                {[
                  ['a=1, b=13','ROT13'],
                  ['a=1, b=3', 'Caesar +3'],
                  ['a=25, b=25','Atbash'],
                  ['a=7, b=3', 'Example affine'],
                ].map(([k,v])=>(
                  <div key={k} className="flex gap-2">
                    <span className="text-cyan-400">{k}</span>
                    <span className="text-slate-500">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShiftSolverApp;
