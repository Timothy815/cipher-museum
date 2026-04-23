import React, { useState, useMemo } from 'react';
import { hamming, hexToBytes, b64ToBytes, chiSquared, clean, ENG_FREQ, letterCounts } from '../../lib/englishScore';

// ── Parse input ───────────────────────────────────────────────────────

function parseInput(raw: string): Uint8Array | null {
  const t = raw.trim();
  const hexClean = t.replace(/\s/g, '');
  if (hexClean.length > 0 && hexClean.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(hexClean))
    return hexToBytes(hexClean);
  if (/^[A-Za-z0-9+/=\s]+$/.test(t) && t.replace(/\s/g,'').length % 4 === 0)
    return b64ToBytes(t);
  // Raw text
  return new TextEncoder().encode(t);
}

// ── Hamming key-length analysis ───────────────────────────────────────

interface KLResult {
  kl: number;
  normHamming: number;
  rank: number;
}

function keyLengthCandidates(bytes: Uint8Array, maxKL = 40): KLResult[] {
  const results: { kl: number; normHamming: number }[] = [];
  for (let kl = 2; kl <= Math.min(maxKL, Math.floor(bytes.length / 4)); kl++) {
    // Average Hamming distance over up to 4 block pairs
    const pairs = Math.min(4, Math.floor(bytes.length / kl) - 1);
    let totalHam = 0;
    for (let p = 0; p < pairs; p++) {
      const a = bytes.slice(p * kl, (p + 1) * kl);
      const b = bytes.slice((p + 1) * kl, (p + 2) * kl);
      totalHam += hamming(a, b);
    }
    results.push({ kl, normHamming: totalHam / pairs / kl });
  }
  results.sort((a, b) => a.normHamming - b.normHamming);
  return results.slice(0, 12).map((r, i) => ({ ...r, rank: i + 1 }));
}

// ── Per-column frequency attack ────────────────────────────────────────

function crackColumn(col: Uint8Array): { keyByte: number; chi: number; decrypted: Uint8Array } {
  let bestByte = 0, bestChi = Infinity;
  for (let k = 0; k < 256; k++) {
    const dec = col.map(b => b ^ k);
    const text = String.fromCharCode(...dec);
    const x = chiSquared(text);
    if (x < bestChi) { bestChi = x; bestByte = k; }
  }
  return { keyByte: bestByte, chi: bestChi, decrypted: col.map(b => b ^ bestByte) };
}

interface DecryptResult {
  kl: number;
  key: Uint8Array;
  plaintext: string;
  avgChi: number;
}

function decryptWithKeyLength(bytes: Uint8Array, kl: number): DecryptResult {
  const key = new Uint8Array(kl);
  const cols: Uint8Array[] = Array.from({ length: kl }, (_, i) => {
    const col: number[] = [];
    for (let j = i; j < bytes.length; j += kl) col.push(bytes[j]);
    return new Uint8Array(col);
  });
  let totalChi = 0;
  for (let i = 0; i < kl; i++) {
    const { keyByte, chi } = crackColumn(cols[i]);
    key[i] = keyByte;
    totalChi += chi;
  }
  const plain = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) plain[i] = bytes[i] ^ key[i % kl];
  return { kl, key, plaintext: String.fromCharCode(...plain), avgChi: totalChi / kl };
}

// ── Components ────────────────────────────────────────────────────────

const SAMPLE_HEX = `1b37373331363f78151b7f2b783431333d78397828372d363c78373e783a393b3736`;

const XorAnalyzerApp: React.FC = () => {
  const [input, setInput]   = useState(SAMPLE_HEX);
  const [selKL,  setSelKL]  = useState<number | null>(null);

  const bytes = useMemo(() => parseInput(input), [input]);

  const klCandidates = useMemo(() => {
    if (!bytes || bytes.length < 8) return [];
    return keyLengthCandidates(bytes);
  }, [bytes]);

  const topKL = klCandidates.slice(0, 5);

  const decryptResults = useMemo(() => {
    if (!bytes || !topKL.length) return [];
    return topKL.map(({ kl }) => decryptWithKeyLength(bytes, kl));
  }, [bytes, topKL]);

  const activeKL = selKL ?? (topKL[0]?.kl ?? null);
  const activeResult = decryptResults.find(r => r.kl === activeKL) ?? decryptResults[0];

  const bytesLen = bytes?.length ?? 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950 text-slate-200"
         style={{ fontFamily: "'Share Tech Mono', monospace" }}>

      <div className="flex-shrink-0 px-6 pt-5 pb-3 border-b border-slate-800 bg-slate-900/60">
        <h1 className="text-xl font-bold text-white">Repeating-Key XOR Analyzer</h1>
        <p className="text-xs text-slate-400 mt-1">
          Hamming distance key-length detection + per-column frequency analysis
        </p>
      </div>

      <div className="flex-1 overflow-auto flex flex-col lg:flex-row gap-4 p-4">

        {/* Left */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">

          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ciphertext</span>
            <div className="flex gap-2 text-[10px] font-mono">
              {['hex', 'base64', 'ascii'].map(fmt => (
                <span key={fmt} className="text-slate-500">{fmt}</span>
              ))}
              <span className="text-slate-500">— auto-detected</span>
            </div>
          </div>

          <textarea
            value={input}
            onChange={e => { setInput(e.target.value); setSelKL(null); }}
            className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-300 resize-none outline-none focus:border-cyan-700 h-24"
            placeholder="Paste hex, base64, or ASCII ciphertext…"
            spellCheck={false}
          />

          {bytes && <p className="text-[10px] text-slate-500 font-mono">{bytesLen} bytes parsed</p>}
          {!bytes && input.trim() && <p className="text-[10px] text-red-400">Could not parse input</p>}

          {/* Key-length analysis table */}
          {klCandidates.length > 0 && (
            <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                Key Length Candidates
                <span className="normal-case font-normal ml-1 text-slate-600">(lower Hamming distance = more likely)</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {klCandidates.map(({ kl, normHamming, rank }) => (
                  <button key={kl}
                    onClick={() => setSelKL(kl)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${
                      activeKL === kl
                        ? 'bg-cyan-700/40 border-cyan-600 text-cyan-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    KL={kl}
                    <span className="ml-1.5 font-normal opacity-70">{normHamming.toFixed(3)}</span>
                    {rank === 1 && <span className="ml-1 text-amber-400">★</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Decrypted output */}
          {activeResult && (
            <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">
                  Decrypted — Key Length {activeResult.kl}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  avg χ²={activeResult.avgChi.toFixed(1)}
                </span>
              </div>

              {/* Key display */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] text-slate-500 uppercase">Key (hex):</span>
                <code className="text-xs text-amber-400 font-mono">
                  {Array.from(activeResult.key).map(b => b.toString(16).padStart(2,'0')).join(' ')}
                </code>
                {activeResult.key.every(b => b >= 0x20 && b < 0x7F) && (
                  <>
                    <span className="text-[10px] text-slate-500">ascii:</span>
                    <code className="text-xs text-green-400 font-mono">
                      "{String.fromCharCode(...activeResult.key)}"
                    </code>
                  </>
                )}
              </div>

              {/* Plaintext */}
              <div className="bg-slate-950/60 rounded-lg p-3 text-xs font-mono leading-relaxed break-all text-slate-200 max-h-40 overflow-y-auto">
                {activeResult.plaintext.split('').map((c, i) => {
                  const isPrint = c.charCodeAt(0) >= 0x20 && c.charCodeAt(0) < 0x7F;
                  return <span key={i} className={isPrint ? 'text-slate-200' : 'text-red-600'}>{isPrint ? c : '·'}</span>;
                })}
              </div>
            </div>
          )}

          {/* All top-5 keys */}
          {decryptResults.length > 1 && (
            <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">All Candidates</div>
              <div className="space-y-2">
                {decryptResults.map(r => (
                  <button key={r.kl}
                    onClick={() => setSelKL(r.kl)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors border ${
                      activeKL === r.kl
                        ? 'bg-cyan-900/30 border-cyan-700 text-cyan-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <span className="font-bold">KL={r.kl}</span>
                    <span className="ml-2 opacity-60">χ²={r.avgChi.toFixed(1)}</span>
                    <span className="ml-3 font-mono text-amber-300/80 text-[10px]">
                      {r.plaintext.slice(0, 48).replace(/[^\x20-\x7e]/g, '·')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right */}
        <div className="w-full lg:w-64 flex-shrink-0 flex flex-col gap-3">

          <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4">
            <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2">Algorithm</div>
            <div className="text-xs text-slate-400 leading-relaxed space-y-2">
              <p><span className="text-slate-200">Step 1 — Key length.</span> For each candidate length <em>n</em>, XOR consecutive n-byte blocks and count bit differences (Hamming distance). Two English blocks XORed together have ~3.1 bits/byte — far lower than random (~4.0). The true key length gives the lowest normalized distance.</p>
              <p><span className="text-slate-200">Step 2 — Per-byte key.</span> Group every n-th byte together (column 0: bytes 0, n, 2n… — all encrypted with the same key byte). Try all 256 values; pick the one whose decryption best matches English letter frequencies (chi-squared test).</p>
            </div>
          </div>

          <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Hamming Distances</div>
            {klCandidates.length > 0 && (
              <div className="space-y-1">
                {klCandidates.map(({ kl, normHamming }) => {
                  const pct = Math.max(0, Math.min(1, (normHamming - 2.5) / 1.5));
                  return (
                    <div key={kl} className="flex items-center gap-2 text-[10px]">
                      <span className="text-slate-400 w-10">KL={kl}</span>
                      <div className="flex-1 bg-slate-800 rounded-full h-2">
                        <div className="h-2 rounded-full bg-cyan-600" style={{ width: `${pct * 100}%` }} />
                      </div>
                      <span className="text-slate-400 font-mono w-10 text-right">{normHamming.toFixed(3)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default XorAnalyzerApp;
