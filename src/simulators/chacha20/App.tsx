import React, { useState, useMemo, useCallback } from 'react';
import { Info, X, RefreshCw, Play, ChevronLeft, ChevronRight } from 'lucide-react';

// ── ChaCha20 core (RFC 8439) ────────────────────────────────────────────────

const CONSTANTS: [number, number, number, number] = [0x61707865, 0x3320646e, 0x79622d32, 0x6b206574];

function rotl(v: number, n: number): number {
  return ((v << n) | (v >>> (32 - n))) >>> 0;
}

function quarterRound(s: number[], a: number, b: number, c: number, d: number): void {
  s[a] = (s[a] + s[b]) >>> 0; s[d] = rotl(s[d] ^ s[a], 16);
  s[c] = (s[c] + s[d]) >>> 0; s[b] = rotl(s[b] ^ s[c], 12);
  s[a] = (s[a] + s[b]) >>> 0; s[d] = rotl(s[d] ^ s[a], 8);
  s[c] = (s[c] + s[d]) >>> 0; s[b] = rotl(s[b] ^ s[c], 7);
}

function chacha20Block(key: number[], counter: number, nonce: number[]): number[] {
  const state = [
    CONSTANTS[0], CONSTANTS[1], CONSTANTS[2], CONSTANTS[3],
    key[0], key[1], key[2], key[3],
    key[4], key[5], key[6], key[7],
    counter >>> 0, nonce[0], nonce[1], nonce[2],
  ];
  const working = [...state];
  for (let i = 0; i < 10; i++) {
    quarterRound(working, 0, 4, 8, 12);
    quarterRound(working, 1, 5, 9, 13);
    quarterRound(working, 2, 6, 10, 14);
    quarterRound(working, 3, 7, 11, 15);
    quarterRound(working, 0, 5, 10, 15);
    quarterRound(working, 1, 6, 11, 12);
    quarterRound(working, 2, 7, 8, 13);
    quarterRound(working, 3, 4, 9, 14);
  }
  return working.map((v, i) => (v + state[i]) >>> 0);
}

function chacha20Encrypt(plainBytes: number[], key: number[], nonce: number[], counter: number): number[] {
  const out: number[] = [];
  for (let j = 0; j < plainBytes.length; j += 64) {
    const block = chacha20Block(key, counter + Math.floor(j / 64), nonce);
    const ks = wordsToBytesLE(block);
    for (let k = 0; k < 64 && j + k < plainBytes.length; k++) {
      out.push((plainBytes[j + k] ^ ks[k]) & 0xff);
    }
  }
  return out;
}

function wordsToBytesLE(words: number[]): number[] {
  const bytes: number[] = [];
  for (const w of words) {
    bytes.push(w & 0xff, (w >>> 8) & 0xff, (w >>> 16) & 0xff, (w >>> 24) & 0xff);
  }
  return bytes;
}

function hexToWords(hex: string): number[] {
  const clean = hex.replace(/\s/g, '');
  const words: number[] = [];
  for (let i = 0; i < clean.length; i += 8) {
    const chunk = clean.slice(i, i + 8).padEnd(8, '0');
    // Key bytes are little-endian words
    const b = [
      parseInt(chunk.slice(0, 2), 16),
      parseInt(chunk.slice(2, 4), 16),
      parseInt(chunk.slice(4, 6), 16),
      parseInt(chunk.slice(6, 8), 16),
    ];
    words.push(((b[3] << 24) | (b[2] << 16) | (b[1] << 8) | b[0]) >>> 0);
  }
  return words;
}

function randomHex(bytes: number): string {
  return Array.from({ length: bytes }, () =>
    Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
  ).join('');
}

function toHex32(n: number): string {
  return (n >>> 0).toString(16).padStart(8, '0');
}

function textToBytes(text: string): number[] {
  return Array.from(new TextEncoder().encode(text));
}

function bytesToHex(bytes: number[]): string {
  return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Snapshot generation for round stepping ──────────────────────────────────

interface RoundSnapshot {
  label: string;
  state: number[];
  active: number[]; // indices highlighted
}

function generateSnapshots(key: number[], counter: number, nonce: number[]): RoundSnapshot[] {
  const initial = [
    CONSTANTS[0], CONSTANTS[1], CONSTANTS[2], CONSTANTS[3],
    key[0], key[1], key[2], key[3],
    key[4], key[5], key[6], key[7],
    counter >>> 0, nonce[0], nonce[1], nonce[2],
  ];
  const working = [...initial];
  const snaps: RoundSnapshot[] = [{ label: 'Initial State', state: [...working], active: [] }];

  const colQR: [number, number, number, number][] = [[0,4,8,12],[1,5,9,13],[2,6,10,14],[3,7,11,15]];
  const diagQR: [number, number, number, number][] = [[0,5,10,15],[1,6,11,12],[2,7,8,13],[3,4,9,14]];

  for (let r = 0; r < 10; r++) {
    for (let q = 0; q < 4; q++) {
      const [a, b, c, d] = colQR[q];
      quarterRound(working, a, b, c, d);
      snaps.push({ label: `Round ${r * 2 + 1} — Column QR(${a},${b},${c},${d})`, state: [...working], active: [a, b, c, d] });
    }
    for (let q = 0; q < 4; q++) {
      const [a, b, c, d] = diagQR[q];
      quarterRound(working, a, b, c, d);
      snaps.push({ label: `Round ${r * 2 + 2} — Diagonal QR(${a},${b},${c},${d})`, state: [...working], active: [a, b, c, d] });
    }
  }

  const final = working.map((v, i) => (v + initial[i]) >>> 0);
  snaps.push({ label: 'Final (working + initial)', state: final, active: [] });
  return snaps;
}

// ── Component ───────────────────────────────────────────────────────────────

const App: React.FC = () => {
  const [plaintext, setPlaintext] = useState('ChaCha20 is blazing fast!');
  const [ciphertextHex, setCiphertextHex] = useState('');
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [keyHex, setKeyHex] = useState(() => randomHex(32));
  const [nonceHex, setNonceHex] = useState(() => randomHex(12));
  const [counter, setCounter] = useState(1);
  const [showInfo, setShowInfo] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [showComparison, setShowComparison] = useState(false);

  const keyWords = useMemo(() => {
    const clean = keyHex.replace(/\s/g, '');
    if (clean.length !== 64 || !/^[0-9a-fA-F]+$/.test(clean)) return null;
    return hexToWords(clean);
  }, [keyHex]);

  const nonceWords = useMemo(() => {
    const clean = nonceHex.replace(/\s/g, '');
    if (clean.length !== 24 || !/^[0-9a-fA-F]+$/.test(clean)) return null;
    return hexToWords(clean);
  }, [nonceHex]);

  const snapshots = useMemo(() => {
    if (!keyWords || !nonceWords) return null;
    return generateSnapshots(keyWords, counter, nonceWords);
  }, [keyWords, nonceWords, counter]);

  const encryption = useMemo(() => {
    if (!keyWords || !nonceWords) return null;
    let inputBytes: number[];
    if (mode === 'encrypt') {
      if (!plaintext) return null;
      inputBytes = textToBytes(plaintext);
    } else {
      const clean = ciphertextHex.replace(/[^0-9a-fA-F]/g, '');
      if (clean.length < 2) return null;
      inputBytes = [];
      for (let i = 0; i + 1 < clean.length; i += 2) inputBytes.push(parseInt(clean.slice(i, i + 2), 16));
    }
    const cipherBytes = chacha20Encrypt(inputBytes, keyWords, nonceWords, counter);
    const block = chacha20Block(keyWords, counter, nonceWords);
    const ksBytes = wordsToBytesLE(block);
    return { plainBytes: inputBytes, cipherBytes, ksBytes };
  }, [plaintext, ciphertextHex, mode, keyWords, nonceWords, counter]);

  const safeStep = snapshots ? Math.min(stepIdx, snapshots.length - 1) : 0;
  const snap = snapshots?.[safeStep];

  const prev = useCallback(() => setStepIdx(i => Math.max(0, i - 1)), []);
  const next = useCallback(() => setStepIdx(i => (snapshots ? Math.min(snapshots.length - 1, i + 1) : i)), [snapshots]);

  const cellColor = (idx: number): string => {
    if (snap?.active.includes(idx)) return 'bg-cyan-500/30 border-cyan-400 text-cyan-200';
    if (idx < 4) return 'bg-violet-950/40 border-violet-800/50 text-violet-300';
    if (idx < 12) return 'bg-cyan-950/30 border-cyan-900/40 text-cyan-300';
    if (idx === 12) return 'bg-amber-950/30 border-amber-800/50 text-amber-300';
    return 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300';
  };

  const cellLabel = (idx: number): string => {
    if (idx < 4) return 'const';
    if (idx < 12) return 'key';
    if (idx === 12) return 'ctr';
    return 'nonce';
  };

  return (
    <div className="flex-1 bg-[#1a1814] flex flex-col items-center py-10 px-6 sm:px-10 md:px-16 text-stone-200">
      <div className="w-full max-w-6xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-stone-100 tracking-tight">
              CHACHA<span className="text-cyan-400">20</span>
            </h1>
            <span className="text-stone-500 text-xs tracking-[0.3em] font-mono">
              STREAM CIPHER — BERNSTEIN 2008 / RFC 8439
            </span>
          </div>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 border border-slate-700"
          >
            {showInfo ? <X size={20} /> : <Info size={20} />}
          </button>
        </div>

        {/* Info Panel */}
        {showInfo && (
          <div className="bg-cyan-950/20 border border-cyan-900/40 rounded-xl p-6 mb-8">
            <h3 className="text-lg font-bold text-cyan-400 mb-3">History & Significance</h3>
            <p className="text-sm text-stone-300 leading-relaxed mb-3">
              ChaCha20 was designed by <strong>Daniel J. Bernstein</strong> in 2008 as an improvement to his earlier
              Salsa20 cipher. Google adopted it in 2013 for TLS on Android devices lacking AES hardware acceleration.
              It was standardized as <strong>RFC 8439</strong> (formerly 7539) and became the default cipher suite
              in <strong>TLS 1.3</strong> alongside AES-GCM. <strong>WireGuard</strong> uses ChaCha20-Poly1305
              exclusively.
            </p>
            <p className="text-sm text-stone-300 leading-relaxed mb-3">
              ChaCha20-Poly1305 replaced RC4 and is preferred over AES-GCM on devices without <strong>AES-NI</strong>
              hardware instructions because ChaCha20 uses only ARX operations (Add, Rotate, XOR) — achieving
              constant-time execution without special CPU support, making it immune to cache-timing side-channel attacks.
            </p>
            <p className="text-sm text-stone-400 leading-relaxed">
              The name "ChaCha" refers to the cha-cha dance — the quarter-round operations "shuffle" bits with
              improved diffusion compared to Salsa20's quarter-round.
            </p>
          </div>
        )}

        {/* Inputs */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <button onClick={() => setMode('encrypt')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${mode === 'encrypt' ? 'bg-cyan-950/50 text-cyan-400 border border-cyan-900/40' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'}`}>Encrypt Text</button>
              <button onClick={() => setMode('decrypt')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${mode === 'decrypt' ? 'bg-amber-950/50 text-amber-400 border border-amber-900/40' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'}`}>Decrypt Hex</button>
            </div>
            {mode === 'encrypt' ? (
              <textarea
                value={plaintext}
                onChange={e => setPlaintext(e.target.value)}
                className="w-full h-20 bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-cyan-700/50 resize-none"
                spellCheck={false}
                placeholder="Enter plaintext (any length)..."
              />
            ) : (
              <textarea
                value={ciphertextHex}
                onChange={e => setCiphertextHex(e.target.value)}
                className="w-full h-20 bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-amber-700/50 resize-none"
                spellCheck={false}
                placeholder="Paste hex ciphertext..."
              />
            )}
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">256-bit Key (hex)</label>
              <button
                onClick={() => setKeyHex(randomHex(32))}
                className="flex items-center gap-1 text-xs font-bold text-cyan-400 hover:text-cyan-300"
              >
                <RefreshCw size={12} /> Generate
              </button>
            </div>
            <input
              value={keyHex}
              onChange={e => setKeyHex(e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 64))}
              className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-cyan-700/50"
              spellCheck={false}
              maxLength={64}
            />
            {keyHex.replace(/\s/g, '').length !== 64 && (
              <span className="text-xs text-amber-400 mt-1 block">Need 64 hex chars ({keyHex.replace(/\s/g, '').length}/64)</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">96-bit Nonce (hex)</label>
              <button
                onClick={() => setNonceHex(randomHex(12))}
                className="flex items-center gap-1 text-xs font-bold text-cyan-400 hover:text-cyan-300"
              >
                <RefreshCw size={12} /> Generate
              </button>
            </div>
            <input
              value={nonceHex}
              onChange={e => setNonceHex(e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 24))}
              className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-cyan-700/50"
              maxLength={24}
              spellCheck={false}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">32-bit Counter</label>
            <input
              type="number"
              value={counter}
              onChange={e => setCounter(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-cyan-700/50"
              min={0}
            />
          </div>
        </div>

        {/* State Matrix + Round Stepper */}
        {snap && snapshots && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 mb-6">
            <div className="flex justify-between items-center mb-4">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                State Matrix — {snap.label}
              </label>
              <div className="flex items-center gap-2">
                <button onClick={prev} disabled={safeStep === 0} className="p-1 rounded hover:bg-slate-800 text-slate-400 disabled:opacity-30"><ChevronLeft size={18} /></button>
                <span className="text-xs font-mono text-slate-500">{safeStep + 1}/{snapshots.length}</span>
                <button onClick={next} disabled={safeStep === snapshots.length - 1} className="p-1 rounded hover:bg-slate-800 text-slate-400 disabled:opacity-30"><ChevronRight size={18} /></button>
                <button
                  onClick={() => setStepIdx(0)}
                  className="ml-2 px-2 py-1 text-xs font-bold text-cyan-400 rounded hover:bg-slate-800"
                >
                  <Play size={12} className="inline mr-1" />Reset
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 max-w-lg mx-auto">
              {snap.state.map((word, idx) => (
                <div
                  key={idx}
                  className={`border rounded-lg px-2 py-2 text-center font-mono transition-colors ${cellColor(idx)}`}
                >
                  <div className="text-[10px] text-slate-500 uppercase mb-0.5">{cellLabel(idx)}[{idx}]</div>
                  <div className="text-xs">{toHex32(word)}</div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 justify-center mt-4 text-[10px] uppercase tracking-wider">
              <span className="text-violet-400">■ Constants</span>
              <span className="text-cyan-400">■ Key</span>
              <span className="text-amber-400">■ Counter</span>
              <span className="text-emerald-400">■ Nonce</span>
            </div>
          </div>
        )}

        {/* Quarter-Round Detail */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 mb-6">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">
            Quarter-Round Operation (ARX)
          </label>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-slate-950/60 rounded-lg p-4 font-mono text-xs leading-6 text-cyan-300">
              <div><span className="text-slate-500">1.</span> a += b; d ^= a; d {'<<<'}= <span className="text-amber-300">16</span></div>
              <div><span className="text-slate-500">2.</span> c += d; b ^= c; b {'<<<'}= <span className="text-amber-300">12</span></div>
              <div><span className="text-slate-500">3.</span> a += b; d ^= a; d {'<<<'}= <span className="text-amber-300">8</span></div>
              <div><span className="text-slate-500">4.</span> c += d; b ^= c; b {'<<<'}= <span className="text-amber-300">7</span></div>
            </div>
            <div className="text-xs text-stone-400 leading-relaxed">
              <p className="mb-2">
                Each quarter-round mixes 4 words using only <strong className="text-cyan-300">Add</strong>,{' '}
                <strong className="text-cyan-300">Rotate</strong>, and <strong className="text-cyan-300">XOR</strong> (ARX).
                Rotation amounts 16, 12, 8, 7 were chosen for optimal diffusion.
              </p>
              <p>
                <strong className="text-violet-300">vs Salsa20:</strong> ChaCha applies operations in a{' '}
                <em>cascading</em> pattern (a→d→c→b) rather than Salsa20's parallel pattern. This achieves
                the same diffusion in fewer rounds — ChaCha20 with 20 rounds exceeds Salsa20/20's security margin.
              </p>
            </div>
          </div>
        </div>

        {/* Round Structure */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 mb-6">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">
            Round Structure — 20 Rounds (10 Double-Rounds)
          </label>
          <div className="grid sm:grid-cols-2 gap-4 text-xs">
            <div>
              <div className="text-cyan-400 font-bold mb-1">Odd Rounds — Column QRs</div>
              <div className="bg-slate-950/60 rounded-lg p-3 font-mono text-slate-300 space-y-0.5">
                <div>QR(0, 4, 8, 12) — col 0</div>
                <div>QR(1, 5, 9, 13) — col 1</div>
                <div>QR(2, 6, 10, 14) — col 2</div>
                <div>QR(3, 7, 11, 15) — col 3</div>
              </div>
            </div>
            <div>
              <div className="text-emerald-400 font-bold mb-1">Even Rounds — Diagonal QRs</div>
              <div className="bg-slate-950/60 rounded-lg p-3 font-mono text-slate-300 space-y-0.5">
                <div>QR(0, 5, 10, 15) — diag 0</div>
                <div>QR(1, 6, 11, 12) — diag 1</div>
                <div>QR(2, 7, 8, 13) — diag 2</div>
                <div>QR(3, 4, 9, 14) — diag 3</div>
              </div>
            </div>
          </div>
        </div>

        {/* Keystream + Encryption */}
        {encryption && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 mb-6">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">
              Keystream XOR Encryption
            </label>
            <div className="overflow-x-auto">
              <table className="font-mono text-xs w-full">
                <thead>
                  <tr className="text-slate-500">
                    <td className="pr-3 text-[10px] uppercase tracking-wider pb-1 w-24">Byte #</td>
                    {encryption.plainBytes.slice(0, 16).map((_, i) => (
                      <td key={i} className="text-center px-1 pb-1 w-8">{i}</td>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="pr-3 text-slate-500 text-[10px] uppercase tracking-wider">{mode === 'encrypt' ? 'Plain' : 'Cipher'}</td>
                    {encryption.plainBytes.slice(0, 16).map((b, i) => (
                      <td key={i} className="text-center px-1 text-stone-300">{b.toString(16).padStart(2, '0')}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="pr-3 text-slate-500 text-[10px] uppercase tracking-wider">Keystream</td>
                    {encryption.ksBytes.slice(0, 16).map((b, i) => (
                      <td key={i} className="text-center px-1 text-cyan-400/70">{b.toString(16).padStart(2, '0')}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="pr-3 text-slate-500 text-[10px] uppercase tracking-wider">⊕ {mode === 'encrypt' ? 'Cipher' : 'Plain'}</td>
                    {encryption.cipherBytes.slice(0, 16).map((b, i) => (
                      <td key={i} className="text-center px-1 text-cyan-300 font-bold">{b.toString(16).padStart(2, '0')}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
              {encryption.plainBytes.length > 16 && (
                <div className="text-[10px] text-slate-500 mt-2">Showing first 16 of {encryption.plainBytes.length} bytes</div>
              )}
            </div>

            <div className="mt-4">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                {mode === 'encrypt' ? 'Full Ciphertext (hex)' : 'Decrypted Output'}
              </label>
              {mode === 'decrypt' && (
                <div className="bg-slate-950/60 rounded-lg p-3 font-mono text-sm text-emerald-300 break-all mb-2">
                  {encryption.cipherBytes.map(b => b >= 32 && b < 127 ? String.fromCharCode(b) : '·').join('')}
                </div>
              )}
              <div className="bg-slate-950/60 rounded-lg p-3 font-mono text-xs text-cyan-300 break-all select-all cursor-pointer"
                onClick={() => { if (mode === 'encrypt') { setCiphertextHex(bytesToHex(encryption.cipherBytes)); setMode('decrypt'); } }}>
                {bytesToHex(encryption.cipherBytes)}
              </div>
              {mode === 'encrypt' && <p className="text-[10px] text-slate-600 mt-1">Click to copy to decrypt mode</p>}
            </div>
          </div>
        )}

        {/* Comparison Panel */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 mb-6">
          <button
            onClick={() => setShowComparison(!showComparison)}
            className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider w-full"
          >
            <span className={`transition-transform ${showComparison ? 'rotate-90' : ''}`}>▶</span>
            ChaCha20 vs Salsa20 Comparison
          </button>

          {showComparison && (
            <div className="grid sm:grid-cols-2 gap-4 mt-4 text-xs">
              <div className="bg-cyan-950/20 border border-cyan-900/40 rounded-lg p-4">
                <div className="text-cyan-400 font-bold mb-2">ChaCha20</div>
                <ul className="space-y-1 text-stone-300">
                  <li>• Cascading QR: a→d→c→b chain</li>
                  <li>• Rotations: 16, 12, 8, 7</li>
                  <li>• Matrix: constants / key / key / ctr+nonce</li>
                  <li>• Better diffusion per round</li>
                  <li>• RFC 8439, TLS 1.3 default</li>
                  <li>• Used in WireGuard, TLS, SSH</li>
                </ul>
              </div>
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4">
                <div className="text-slate-400 font-bold mb-2">Salsa20</div>
                <ul className="space-y-1 text-stone-400">
                  <li>• Parallel QR: independent a,b,c,d ops</li>
                  <li>• Rotations: 7, 9, 13, 18</li>
                  <li>• Matrix: const/key / nonce+ctr / key/const</li>
                  <li>• Slightly less diffusion per round</li>
                  <li>• eSTREAM portfolio finalist</li>
                  <li>• Used in NaCl/libsodium</li>
                </ul>
              </div>
              <div className="sm:col-span-2 text-stone-500 text-[11px]">
                Both are ARX ciphers (Add-Rotate-XOR) by Daniel Bernstein. ChaCha20 is the "improved remix" — same
                philosophy but with structural changes that give every bit better diffusion, making it the
                preferred modern choice.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
