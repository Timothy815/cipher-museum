import React, { useState, useMemo } from 'react';
import { hexToBytes } from '../../lib/englishScore';

// ── Crib Drag Engine ──────────────────────────────────────────────────

interface DragResult {
  offset: number;
  xorBytes: number[];      // crib XOR ciphertext at offset
  keyBytes: number[];      // same — these are candidate key bytes
  readable: boolean;       // all printable ASCII?
  score: number;           // fraction of printable ASCII
  display: string;         // human-readable version
}

function isPrint(b: number) {
  return b >= 0x20 && b < 0x7F;
}

function isAlphaSpace(b: number) {
  return (b >= 65 && b <= 90) || (b >= 97 && b <= 122) || b === 32;
}

function drag(ciphertext: Uint8Array, crib: Uint8Array): DragResult[] {
  const results: DragResult[] = [];
  const maxOffset = ciphertext.length - crib.length;
  for (let off = 0; off <= maxOffset; off++) {
    const xor: number[] = [];
    for (let i = 0; i < crib.length; i++) {
      xor.push(ciphertext[off + i] ^ crib[i]);
    }
    const printCount = xor.filter(isPrint).length;
    const alphaCount = xor.filter(isAlphaSpace).length;
    const score = alphaCount / crib.length;
    results.push({
      offset: off,
      xorBytes: xor,
      keyBytes: xor,
      readable: xor.every(isPrint),
      score,
      display: xor.map(b => isPrint(b) ? String.fromCharCode(b) : '·').join(''),
    });
  }
  return results.sort((a, b) => b.score - a.score);
}

// When two ciphertexts are XORed (OTP reuse), XOR output = PT1 XOR PT2
// Place a known word at each offset of the XOR stream
function dragXorStream(c1: Uint8Array, c2: Uint8Array, crib: Uint8Array): DragResult[] {
  const xorStream = new Uint8Array(Math.min(c1.length, c2.length));
  for (let i = 0; i < xorStream.length; i++) xorStream[i] = c1[i] ^ c2[i];
  return drag(xorStream, crib);
}

// ── Hex / Text parsing ────────────────────────────────────────────────

function parseHexOrText(s: string): Uint8Array | null {
  const h = s.trim().replace(/\s/g, '');
  if (/^[0-9a-fA-F]+$/.test(h) && h.length % 2 === 0) return hexToBytes(h);
  if (s.trim().length > 0) return new TextEncoder().encode(s.trim());
  return null;
}

// ── Color coding ──────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 0.9) return 'text-green-400 bg-green-950/40 border-green-700/50';
  if (score >= 0.7) return 'text-cyan-400 bg-cyan-950/40 border-cyan-700/50';
  if (score >= 0.5) return 'text-amber-400 bg-amber-950/30 border-amber-700/40';
  return 'text-slate-500 bg-slate-900/40 border-slate-700/30';
}

// ── Main ──────────────────────────────────────────────────────────────

const SAMPLE_CT1 = '1c0111001f010100061a024b5353355009' +
                   '0715b374042d' ;  // from matasano challenge

const CribDragApp: React.FC = () => {
  const [mode,   setMode]   = useState<'single' | 'dual'>('single');
  const [ct1,    setCt1]    = useState(SAMPLE_CT1);
  const [ct2,    setCt2]    = useState('');
  const [crib,   setCrib]   = useState('the');
  const [topN,   setTopN]   = useState(20);
  const [sortBy, setSortBy] = useState<'score' | 'offset'>('score');

  const bytes1 = useMemo(() => parseHexOrText(ct1), [ct1]);
  const bytes2 = useMemo(() => parseHexOrText(ct2), [ct2]);
  const cribBytes = useMemo(() => crib.trim() ? new TextEncoder().encode(crib.trim()) : null, [crib]);

  const results = useMemo<DragResult[]>(() => {
    if (!bytes1 || !cribBytes || cribBytes.length === 0) return [];
    if (mode === 'dual' && bytes2) {
      return dragXorStream(bytes1, bytes2, cribBytes);
    }
    return drag(bytes1, cribBytes);
  }, [bytes1, bytes2, cribBytes, mode]);

  const sorted = useMemo(() => {
    const r = [...results];
    if (sortBy === 'offset') r.sort((a, b) => a.offset - b.offset);
    return r.slice(0, topN);
  }, [results, sortBy, topN]);

  const bestScore = results[0]?.score ?? 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950 text-slate-200"
         style={{ fontFamily: "'Share Tech Mono', monospace" }}>

      <div className="flex-shrink-0 px-6 pt-5 pb-3 border-b border-slate-800 bg-slate-900/60">
        <h1 className="text-xl font-bold text-white">Crib Drag</h1>
        <p className="text-xs text-slate-400 mt-1">
          Slide a known-plaintext crib across XOR/stream ciphertext to recover the key
        </p>
      </div>

      <div className="flex-1 overflow-auto flex flex-col lg:flex-row gap-4 p-4">

        {/* Left: inputs */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">

          {/* Mode toggle */}
          <div className="flex gap-2">
            {(['single', 'dual'] as const).map(m => (
              <button key={m}
                onClick={() => setMode(m)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                  mode === m
                    ? 'bg-amber-600 border-amber-500 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                {m === 'single' ? 'Single CT (key XOR pt)' : 'Dual CT (OTP/stream reuse)'}
              </button>
            ))}
          </div>

          {/* Ciphertext inputs */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {mode === 'dual' ? 'Ciphertext 1' : 'Ciphertext'} (hex or ASCII)
            </span>
            <textarea
              value={ct1}
              onChange={e => setCt1(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-300 resize-none outline-none focus:border-amber-700 h-20"
              placeholder="hex bytes or ASCII…"
              spellCheck={false}
            />
            {bytes1 && <span className="text-[10px] text-slate-500 font-mono">{bytes1.length} bytes</span>}
          </div>

          {mode === 'dual' && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ciphertext 2</span>
              <textarea
                value={ct2}
                onChange={e => setCt2(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-300 resize-none outline-none focus:border-amber-700 h-20"
                placeholder="Second ciphertext encrypted with the same key…"
                spellCheck={false}
              />
              {bytes2 && <span className="text-[10px] text-slate-500 font-mono">{bytes2.length} bytes</span>}
            </div>
          )}

          {/* Crib */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Crib (known plaintext)</span>
            <input
              value={crib}
              onChange={e => setCrib(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-green-400 outline-none focus:border-amber-700"
              placeholder="e.g. the, hello, password, CRYPTO…"
              spellCheck={false}
            />
            {cribBytes && (
              <span className="text-[10px] text-slate-500 font-mono">{cribBytes.length}B</span>
            )}
          </div>

          {/* Sort / limit */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500">Sort:</span>
              {(['score', 'offset'] as const).map(s => (
                <button key={s}
                  onClick={() => setSortBy(s)}
                  className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
                    sortBy === s ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >{s}</button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500">Show top:</span>
              {[20, 50, 100].map(n => (
                <button key={n}
                  onClick={() => setTopN(n)}
                  className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
                    topN === n ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >{n}</button>
              ))}
            </div>
            {results.length > 0 && (
              <span className="text-[10px] text-slate-500 font-mono">{results.length} offsets</span>
            )}
          </div>

          {/* Results table */}
          {sorted.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Results
                <span className="normal-case font-normal ml-1 text-slate-600">(green = probable plaintext)</span>
              </div>
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {sorted.map(r => (
                  <div key={r.offset}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-xs font-mono ${scoreColor(r.score)}`}
                  >
                    <span className="text-slate-400 w-14 flex-shrink-0">
                      off +{r.offset}
                    </span>
                    <span className="flex-1 tracking-wide">{r.display}</span>
                    <span className="text-[10px] opacity-60 flex-shrink-0">
                      {(r.score * 100).toFixed(0)}%
                    </span>
                    <span className="text-[10px] text-slate-600 flex-shrink-0">
                      {Array.from(r.keyBytes).map(b => b.toString(16).padStart(2,'0')).join('')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : bytes1 && cribBytes ? (
            <p className="text-xs text-slate-500">Crib longer than ciphertext — shorten the crib.</p>
          ) : null}
        </div>

        {/* Right: sidebar */}
        <div className="w-full lg:w-64 flex-shrink-0 flex flex-col gap-3">

          <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4">
            <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2">How Crib Drag Works</div>
            <div className="text-xs text-slate-400 leading-relaxed space-y-2">
              <p>If ciphertext = key ⊕ plaintext, then:</p>
              <p className="font-mono text-slate-300 bg-slate-800 rounded p-2 text-[10px]">
                CT ⊕ crib = key ⊕ PT ⊕ crib
                <br />
                = key ⊕ (PT ⊕ crib)
              </p>
              <p>If our crib matches the plaintext at offset n, then CT[n..] ⊕ crib = key[n..], and the result should be readable ASCII text (the rest of the key).</p>
              <p>Score = fraction of result bytes that are alpha/space. Green rows are likely matches.</p>
            </div>
          </div>

          <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4">
            <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2">OTP Reuse (Dual Mode)</div>
            <div className="text-xs text-slate-400 leading-relaxed space-y-2">
              <p>If CT1 = K ⊕ PT1 and CT2 = K ⊕ PT2, then:</p>
              <p className="font-mono text-slate-300 bg-slate-800 rounded p-2 text-[10px]">CT1 ⊕ CT2 = PT1 ⊕ PT2</p>
              <p>The key cancels out entirely. Dragging a crib over PT1 ⊕ PT2 reveals PT2 at matching offsets. This is why OTP / stream ciphers must never reuse a key.</p>
            </div>
          </div>

          <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Good Cribs</div>
            <div className="flex flex-wrap gap-1.5">
              {['the ','and ','that ','with ','have ','this ',
                'Hello','password','secret','CRYPTO','http://'
              ].map(c => (
                <button key={c}
                  onClick={() => setCrib(c.trim())}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-[10px] font-mono text-slate-400 hover:text-white transition-colors border border-slate-700"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CribDragApp;
