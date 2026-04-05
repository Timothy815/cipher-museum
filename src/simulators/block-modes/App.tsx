import React, { useState, useMemo } from 'react';
import { Info, RotateCcw } from 'lucide-react';
import ExhibitPanel from '../../components/ExhibitPanel';

// ── Simplified AES-like block cipher (deterministic, synchronous) ───
// Uses a keyed permutation for educational purposes — the point is the MODE, not the cipher.

function expandKey(key: number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < 16; i++) out.push(key[i % key.length] ^ ((i * 0x9e + 0x37) & 0xff));
  return out;
}

function encryptBlock(block: number[], keySchedule: number[]): number[] {
  const state = block.map((b, i) => b ^ keySchedule[i % keySchedule.length]);
  // 4 rounds of substitution + diffusion
  for (let r = 0; r < 4; r++) {
    for (let i = 0; i < 16; i++) {
      state[i] = (state[i] ^ keySchedule[(i + r * 3) % 16]);
      state[i] = ((state[i] * 0xd + 0x5f) ^ (state[(i + 1) % 16])) & 0xff;
    }
  }
  return state;
}

function xorBlocks(a: number[], b: number[]): number[] {
  return a.map((v, i) => v ^ (b[i] || 0));
}

function incrementCounter(ctr: number[]): number[] {
  const out = [...ctr];
  for (let i = 15; i >= 0; i--) {
    out[i] = (out[i] + 1) & 0xff;
    if (out[i] !== 0) break;
  }
  return out;
}

function textToBlocks(text: string): number[][] {
  const bytes = Array.from(new TextEncoder().encode(text));
  // PKCS7 padding
  const padLen = 16 - (bytes.length % 16);
  for (let i = 0; i < padLen; i++) bytes.push(padLen);
  const blocks: number[][] = [];
  for (let i = 0; i < bytes.length; i += 16) blocks.push(bytes.slice(i, i + 16));
  return blocks;
}

function bytesToHex(bytes: number[]): string {
  return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
}

function keyFromString(key: string): number[] {
  const bytes = Array.from(new TextEncoder().encode(key || 'K'));
  while (bytes.length < 16) bytes.push(bytes[bytes.length - 1] ^ 0x36);
  return bytes.slice(0, 16);
}

function randomIV(): number[] {
  return Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
}

// ── Modes ───────────────────────────────────────────────────────────

type Mode = 'ecb' | 'cbc' | 'ctr' | 'gcm';

interface BlockResult {
  input: number[];     // what goes into the cipher
  output: number[];    // ciphertext block
  xorWith?: number[];  // what was XORed (IV or prev ciphertext)
  counter?: number[];  // counter value (CTR/GCM)
  keystream?: number[];// encrypted counter (CTR/GCM)
}

function encryptECB(blocks: number[][], ks: number[]): BlockResult[] {
  return blocks.map(b => ({ input: b, output: encryptBlock(b, ks) }));
}

function encryptCBC(blocks: number[][], ks: number[], iv: number[]): BlockResult[] {
  const results: BlockResult[] = [];
  let prev = iv;
  for (const b of blocks) {
    const xored = xorBlocks(b, prev);
    const ct = encryptBlock(xored, ks);
    results.push({ input: b, output: ct, xorWith: prev });
    prev = ct;
  }
  return results;
}

function encryptCTR(blocks: number[][], ks: number[], nonce: number[]): BlockResult[] {
  let ctr = [...nonce];
  return blocks.map(b => {
    const keystream = encryptBlock(ctr, ks);
    const ct = xorBlocks(b, keystream);
    const result: BlockResult = { input: b, output: ct, counter: [...ctr], keystream };
    ctr = incrementCounter(ctr);
    return result;
  });
}

// GCM = CTR mode + GHASH authentication
function encryptGCM(blocks: number[][], ks: number[], nonce: number[]): { blocks: BlockResult[]; tag: number[] } {
  const ctrResults = encryptCTR(blocks, ks, nonce);
  // Simplified GHASH: XOR all ciphertext blocks with encrypted nonce
  const h = encryptBlock(new Array(16).fill(0), ks);
  let tag = [...h];
  for (const r of ctrResults) {
    tag = xorBlocks(tag, r.output);
    // Mix
    for (let i = 0; i < 16; i++) tag[i] = ((tag[i] * 0xb + tag[(i + 1) % 16]) ^ h[i]) & 0xff;
  }
  return { blocks: ctrResults, tag };
}

// ── Mode metadata ───────────────────────────────────────────────────

const MODE_INFO: Record<Mode, { name: string; full: string; color: string; accentBg: string; accentBorder: string; accentText: string; desc: string; security: string; parallelizable: boolean; needsIV: boolean; authenticated: boolean }> = {
  ecb: {
    name: 'ECB', full: 'Electronic Codebook', color: 'red',
    accentBg: 'bg-red-950/40', accentBorder: 'border-red-800/50', accentText: 'text-red-400',
    desc: 'Each block encrypted independently. Same plaintext block always produces the same ciphertext block.',
    security: 'INSECURE — preserves patterns. Never use ECB for real encryption.',
    parallelizable: true, needsIV: false, authenticated: false,
  },
  cbc: {
    name: 'CBC', full: 'Cipher Block Chaining', color: 'amber',
    accentBg: 'bg-amber-950/40', accentBorder: 'border-amber-800/50', accentText: 'text-amber-400',
    desc: 'Each plaintext block is XORed with the previous ciphertext block before encryption. Requires an IV.',
    security: 'Secure for confidentiality. Vulnerable to padding oracle attacks if not careful.',
    parallelizable: false, needsIV: true, authenticated: false,
  },
  ctr: {
    name: 'CTR', full: 'Counter Mode', color: 'cyan',
    accentBg: 'bg-cyan-950/40', accentBorder: 'border-cyan-800/50', accentText: 'text-cyan-400',
    desc: 'Encrypts an incrementing counter to produce a keystream, then XORs with plaintext. Turns a block cipher into a stream cipher.',
    security: 'Secure. Parallelizable and no padding needed. Nonce must never repeat with the same key.',
    parallelizable: true, needsIV: true, authenticated: false,
  },
  gcm: {
    name: 'GCM', full: 'Galois/Counter Mode', color: 'emerald',
    accentBg: 'bg-emerald-950/40', accentBorder: 'border-emerald-800/50', accentText: 'text-emerald-400',
    desc: 'CTR mode encryption + GHASH authentication. Provides both confidentiality and integrity in a single pass.',
    security: 'The gold standard. Used in TLS 1.2/1.3, IPsec, SSH. Nonce must never repeat.',
    parallelizable: true, needsIV: true, authenticated: true,
  },
};

const MODES: Mode[] = ['ecb', 'cbc', 'ctr', 'gcm'];

// ── Component ───────────────────────────────────────────────────────

function App() {
  const [plaintext, setPlaintext] = useState('HELLO WORLD! HELLO WORLD! HELLO WORLD!');
  const [key, setKey] = useState('SECRETKEY');
  const [mode, setMode] = useState<Mode>('ecb');
  const [iv] = useState<number[]>(() => randomIV());
  const [showInfo, setShowInfo] = useState(false);

  const ks = useMemo(() => expandKey(keyFromString(key)), [key]);
  const blocks = useMemo(() => textToBlocks(plaintext), [plaintext]);

  const result = useMemo(() => {
    if (blocks.length === 0) return { blocks: [] as BlockResult[], tag: undefined as number[] | undefined };
    switch (mode) {
      case 'ecb': return { blocks: encryptECB(blocks, ks), tag: undefined };
      case 'cbc': return { blocks: encryptCBC(blocks, ks, iv), tag: undefined };
      case 'ctr': return { blocks: encryptCTR(blocks, ks, iv), tag: undefined };
      case 'gcm': return encryptGCM(blocks, ks, iv);
    }
  }, [blocks, ks, mode, iv]);

  const mi = MODE_INFO[mode];

  // Check if any ciphertext blocks are identical (ECB pattern demo)
  const duplicatePairs = useMemo(() => {
    const hexes = result.blocks.map(b => bytesToHex(b.output));
    const dupes = new Set<number>();
    for (let i = 0; i < hexes.length; i++) {
      for (let j = i + 1; j < hexes.length; j++) {
        if (hexes[i] === hexes[j]) { dupes.add(i); dupes.add(j); }
      }
    }
    return dupes;
  }, [result.blocks]);

  // Check for identical plaintext blocks
  const ptDuplicates = useMemo(() => {
    const hexes = blocks.map(b => bytesToHex(b));
    const dupes = new Set<number>();
    for (let i = 0; i < hexes.length; i++) {
      for (let j = i + 1; j < hexes.length; j++) {
        if (hexes[i] === hexes[j]) { dupes.add(i); dupes.add(j); }
      }
    }
    return dupes;
  }, [blocks]);

  return (
    <div className="flex-1 bg-[#0d1117] flex flex-col">
      <ExhibitPanel id="block-modes" />
      <div className="bg-[#0d1117] flex flex-col items-center justify-start py-10 px-6 text-slate-200">
      <div className="w-full max-w-5xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl sm:text-4xl font-typewriter font-bold text-slate-100 tracking-tighter">
              <span className={mi.accentText}>BLOCK CIPHER</span> MODES
            </h1>
            <span className="text-slate-500 text-xs tracking-[0.3em] font-mono">ECB · CBC · CTR · GCM — WHY MODE MATTERS</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 border border-slate-700">
              <Info size={20} />
            </button>
            <button onClick={() => setPlaintext('')} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 border border-slate-700">
              <RotateCcw size={20} />
            </button>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex justify-center gap-2 mb-8">
          {MODES.map(m => {
            const info = MODE_INFO[m];
            return (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-5 py-2.5 rounded-lg font-bold text-sm border transition-all ${
                  mode === m
                    ? `${info.accentBg} ${info.accentBorder} ${info.accentText}`
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <div>{info.name}</div>
                <div className="text-[9px] font-normal opacity-60">{info.full}</div>
              </button>
            );
          })}
        </div>

        {/* Mode Description */}
        <div className={`rounded-xl border p-4 mb-8 ${mi.accentBg} ${mi.accentBorder}`}>
          <p className={`text-sm ${mi.accentText}`}>{mi.desc}</p>
          <div className="flex gap-4 mt-2 text-[10px] font-mono text-slate-500">
            <span>{mi.needsIV ? '✓ Requires IV/Nonce' : '✗ No IV needed'}</span>
            <span>{mi.parallelizable ? '✓ Parallelizable' : '✗ Sequential'}</span>
            <span>{mi.authenticated ? '✓ Authenticated' : '✗ Unauthenticated'}</span>
          </div>
        </div>

        {/* Key + Plaintext inputs */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-5">
            <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">Key</label>
            <input
              value={key}
              onChange={e => setKey(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 font-mono text-sm tracking-wider text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              placeholder="SECRET KEY"
              spellCheck={false}
            />
          </div>
          <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-5">
            <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">
              Plaintext ({blocks.length} × 16-byte block{blocks.length !== 1 ? 's' : ''})
            </label>
            <input
              value={plaintext}
              onChange={e => setPlaintext(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 font-mono text-sm tracking-wider text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500/50"
              placeholder="HELLO WORLD! HELLO WORLD!"
              spellCheck={false}
            />
            <p className="text-[10px] text-slate-600 mt-1 font-mono">
              Tip: repeat text to see how ECB preserves patterns
            </p>
          </div>
        </div>

        {/* IV display */}
        {mi.needsIV && (
          <div className="bg-slate-900/30 rounded-lg border border-slate-800 px-4 py-2 mb-8 text-center">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mr-3">
              {mode === 'ctr' || mode === 'gcm' ? 'Nonce' : 'IV'}:
            </span>
            <span className="font-mono text-xs text-slate-400">{bytesToHex(iv)}</span>
          </div>
        )}

        {/* Block Flow Diagram */}
        {result.blocks.length > 0 && (
          <div className="space-y-3 mb-8">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
              Block-by-Block Flow — {mi.name} Mode
            </div>

            {result.blocks.map((br, idx) => (
              <div key={idx} className={`rounded-xl border p-4 ${duplicatePairs.has(idx) ? 'border-red-700/60 bg-red-950/20' : 'border-slate-800 bg-slate-900/40'}`}>
                <div className="flex items-center gap-1 mb-3">
                  <span className="text-[10px] font-bold text-slate-500">BLOCK {idx + 1}</span>
                  {ptDuplicates.has(idx) && <span className="text-[9px] text-yellow-500 font-mono ml-2">duplicate plaintext</span>}
                  {duplicatePairs.has(idx) && <span className="text-[9px] text-red-400 font-mono ml-2">identical ciphertext!</span>}
                </div>

                <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                  {/* Plaintext block */}
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] text-slate-600 mb-1">Plaintext</span>
                    <div className={`px-3 py-2 rounded-lg border ${ptDuplicates.has(idx) ? 'bg-yellow-950/30 border-yellow-800/50 text-yellow-300' : 'bg-slate-800/60 border-slate-700 text-slate-300'}`}>
                      {bytesToHex(br.input).slice(0, 16)}...
                    </div>
                  </div>

                  {/* XOR with IV/prev (CBC) */}
                  {mode === 'cbc' && br.xorWith && (
                    <>
                      <div className="text-slate-600 text-lg">⊕</div>
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] text-amber-600 mb-1">{idx === 0 ? 'IV' : `CT[${idx}]`}</span>
                        <div className="px-3 py-2 rounded-lg bg-amber-950/30 border border-amber-800/40 text-amber-400">
                          {bytesToHex(br.xorWith).slice(0, 16)}...
                        </div>
                      </div>
                    </>
                  )}

                  {/* Encrypt box or XOR with keystream */}
                  {(mode === 'ecb' || mode === 'cbc') && (
                    <>
                      <div className="text-slate-600">→</div>
                      <div className={`px-4 py-2 rounded-lg border font-bold text-[10px] ${mi.accentBg} ${mi.accentBorder} ${mi.accentText}`}>
                        AES ENCRYPT
                      </div>
                    </>
                  )}

                  {(mode === 'ctr' || mode === 'gcm') && br.counter && br.keystream && (
                    <>
                      <div className="text-slate-600 text-lg">⊕</div>
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] text-cyan-600 mb-1">Keystream</span>
                        <div className="px-3 py-2 rounded-lg bg-cyan-950/30 border border-cyan-800/40 text-cyan-400">
                          {bytesToHex(br.keystream).slice(0, 16)}...
                        </div>
                        <span className="text-[8px] text-slate-600 mt-0.5">← AES(ctr={bytesToHex(br.counter).slice(-8)})</span>
                      </div>
                    </>
                  )}

                  <div className="text-slate-600">→</div>

                  {/* Ciphertext */}
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] text-slate-600 mb-1">Ciphertext</span>
                    <div className={`px-3 py-2 rounded-lg border font-bold ${
                      duplicatePairs.has(idx)
                        ? 'bg-red-950/40 border-red-700/60 text-red-300'
                        : `${mi.accentBg} ${mi.accentBorder} ${mi.accentText}`
                    }`}>
                      {bytesToHex(br.output).slice(0, 16)}...
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* GCM Auth Tag */}
        {mode === 'gcm' && result.tag && (
          <div className="bg-emerald-950/30 rounded-xl border border-emerald-800/40 p-5 mb-8">
            <div className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold mb-2">Authentication Tag (GHASH)</div>
            <div className="font-mono text-sm text-emerald-300 tracking-wider">{bytesToHex(result.tag)}</div>
            <p className="text-xs text-emerald-500/70 mt-2">
              Any modification to the ciphertext will produce a different tag, detecting tampering.
            </p>
          </div>
        )}

        {/* Pattern Comparison */}
        {result.blocks.length > 1 && (
          <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-5 mb-8">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">
              Ciphertext Pattern View
            </div>
            <div className="flex flex-wrap gap-1">
              {result.blocks.map((br, idx) => {
                // Color based on uniqueness — identical blocks get same color
                const hex = bytesToHex(br.output);
                const firstIdx = result.blocks.findIndex(b => bytesToHex(b.output) === hex);
                const hue = (firstIdx * 67) % 360;
                const isDupe = duplicatePairs.has(idx);
                return (
                  <div
                    key={idx}
                    className="w-16 h-10 rounded flex items-center justify-center text-[8px] font-mono font-bold border"
                    style={{
                      backgroundColor: isDupe ? `hsl(0, 60%, 20%)` : `hsl(${hue}, 40%, 15%)`,
                      borderColor: isDupe ? `hsl(0, 60%, 35%)` : `hsl(${hue}, 30%, 30%)`,
                      color: isDupe ? `hsl(0, 70%, 65%)` : `hsl(${hue}, 40%, 60%)`,
                    }}
                    title={hex}
                  >
                    {hex.slice(0, 6)}
                  </div>
                );
              })}
            </div>
            {duplicatePairs.size > 0 && (
              <p className="text-xs text-red-400 mt-3">
                {mode === 'ecb'
                  ? '⚠ Identical plaintext blocks produce identical ciphertext — the pattern is preserved! This is why ECB is insecure.'
                  : '⚠ Duplicate ciphertext blocks detected.'}
              </p>
            )}
            {duplicatePairs.size === 0 && ptDuplicates.size > 0 && (
              <p className="text-xs text-emerald-400 mt-3">
                ✓ Even though the plaintext has repeating blocks, every ciphertext block is unique. The pattern is hidden.
              </p>
            )}
          </div>
        )}

        {/* Side-by-side mode comparison */}
        {blocks.length > 0 && (
          <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-5 mb-8">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">
              All Modes Comparison — Same Plaintext & Key
            </div>
            <div className="space-y-2">
              {MODES.map(m => {
                const info = MODE_INFO[m];
                const res = m === 'ecb' ? encryptECB(blocks, ks)
                  : m === 'cbc' ? encryptCBC(blocks, ks, iv)
                  : m === 'ctr' ? encryptCTR(blocks, ks, iv)
                  : encryptGCM(blocks, ks, iv).blocks;

                const hexes = res.map(b => bytesToHex(b.output));
                const hasDupes = new Set(hexes).size < hexes.length;

                return (
                  <div key={m} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${mode === m ? `${info.accentBg} ${info.accentBorder} border` : 'bg-slate-800/20'}`}>
                    <span className={`text-xs font-bold w-10 ${info.accentText}`}>{info.name}</span>
                    <div className="flex gap-0.5 flex-1 overflow-x-auto">
                      {res.map((br, i) => {
                        const hex = bytesToHex(br.output);
                        const firstI = hexes.indexOf(hex);
                        const isDupe = firstI !== i;
                        return (
                          <div
                            key={i}
                            className="h-6 flex-1 min-w-[2rem] rounded-sm"
                            style={{
                              backgroundColor: isDupe ? '#7f1d1d' : `hsl(${(firstI * 67) % 360}, 40%, 25%)`,
                            }}
                            title={`Block ${i + 1}: ${hex.slice(0, 16)}...`}
                          />
                        );
                      })}
                    </div>
                    {hasDupes && <span className="text-[9px] text-red-400 font-mono shrink-0">PATTERNS!</span>}
                    {!hasDupes && ptDuplicates.size > 0 && <span className="text-[9px] text-emerald-400 font-mono shrink-0">unique ✓</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Security comparison table */}
        <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-5 mb-8 overflow-x-auto">
          <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">Mode Comparison</div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 text-left">
                <th className="pb-2 pr-4">Mode</th>
                <th className="pb-2 pr-4">Confidentiality</th>
                <th className="pb-2 pr-4">Integrity</th>
                <th className="pb-2 pr-4">Parallel</th>
                <th className="pb-2">IV/Nonce</th>
              </tr>
            </thead>
            <tbody>
              {MODES.map(m => {
                const info = MODE_INFO[m];
                return (
                  <tr key={m} className={mode === m ? `${info.accentText}` : 'text-slate-400'}>
                    <td className="py-1.5 pr-4 font-bold">{info.name}</td>
                    <td className="py-1.5 pr-4">{m === 'ecb' ? '✗ Leaks patterns' : '✓ Secure'}</td>
                    <td className="py-1.5 pr-4">{info.authenticated ? '✓ GHASH tag' : '✗ None'}</td>
                    <td className="py-1.5 pr-4">{info.parallelizable ? '✓ Yes' : '✗ Sequential'}</td>
                    <td className="py-1.5">{info.needsIV ? '✓ Required' : '✗ None'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Security note */}
        {mode === 'ecb' && (
          <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-4 mb-8">
            <div className="text-[10px] text-red-400 uppercase tracking-widest font-bold mb-1">Never Use ECB</div>
            <div className="text-xs text-red-300/70">
              ECB mode encrypts each block independently, so identical plaintext blocks produce identical ciphertext.
              This preserves patterns — famously demonstrated by the <strong>"ECB penguin"</strong> where encrypting a bitmap
              image in ECB mode leaves the penguin clearly visible. Always use <strong>CBC</strong>, <strong>CTR</strong>, or <strong>GCM</strong>.
            </div>
          </div>
        )}

        {mode === 'gcm' && (
          <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-xl p-4 mb-8">
            <div className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold mb-1">The Gold Standard</div>
            <div className="text-xs text-emerald-300/70">
              AES-GCM is the recommended mode for almost all applications. It provides both <strong>confidentiality</strong> (CTR
              encryption) and <strong>integrity</strong> (GHASH authentication tag) in a single efficient pass. Used in
              <strong> TLS 1.2/1.3</strong>, <strong>IPsec</strong>, <strong>SSH</strong>, and <strong>Android/iOS full-disk encryption</strong>.
            </div>
          </div>
        )}
      </div>

      {/* Info Panel */}
      <div className={`fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-700 p-6 transform transition-transform duration-300 z-40 ${showInfo ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="max-w-3xl mx-auto relative">
          <button onClick={() => setShowInfo(false)} className="absolute top-0 right-0 p-2 text-slate-500 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <h3 className="text-xl font-bold text-amber-400 mb-2">About Block Cipher Modes</h3>
          <div className="text-sm text-slate-300 leading-relaxed space-y-2">
            <p>
              A <strong>block cipher</strong> like AES encrypts fixed-size blocks (128 bits). But real messages
              are longer than one block. A <strong>mode of operation</strong> defines how to apply the cipher
              to multiple blocks — and choosing the wrong mode can destroy your security even with a perfect cipher.
            </p>
            <p>
              <strong>ECB</strong> (1981) processes blocks independently — simple but fatally flawed.
              <strong> CBC</strong> (1981) chains blocks together using XOR.
              <strong> CTR</strong> (1979) turns the block cipher into a stream cipher by encrypting a counter.
              <strong> GCM</strong> (2004) adds authentication to CTR mode, becoming the modern gold standard.
            </p>
            <p>
              The key insight: <strong>identical plaintext blocks must produce different ciphertext blocks</strong>,
              otherwise patterns in the data leak through. Every mode except ECB achieves this by mixing in
              an IV, previous ciphertext, or a counter.
            </p>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

export default App;
