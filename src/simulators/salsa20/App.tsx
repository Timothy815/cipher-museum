import React, { useState, useMemo, useCallback } from 'react';
import { Info, X, RefreshCw, Play, SkipForward, RotateCcw } from 'lucide-react';

// ── Salsa20 Core ──────────────────────────────────────────────────────────────

function rotl32(v: number, n: number): number {
  return ((v << n) | (v >>> (32 - n))) >>> 0;
}

function quarterRound(s: Uint32Array, a: number, b: number, c: number, d: number): void {
  s[b] = (s[b] ^ rotl32((s[a] + s[d]) >>> 0, 7)) >>> 0;
  s[c] = (s[c] ^ rotl32((s[b] + s[a]) >>> 0, 9)) >>> 0;
  s[d] = (s[d] ^ rotl32((s[c] + s[b]) >>> 0, 13)) >>> 0;
  s[a] = (s[a] ^ rotl32((s[d] + s[c]) >>> 0, 18)) >>> 0;
}

function salsa20Block(key: Uint32Array, nonce: Uint32Array, counter: number): Uint32Array {
  const s = new Uint32Array(16);
  // Constants: "expa" "nd 3" "2-by" "te k"
  s[0]  = 0x61707865; s[5]  = 0x3320646e; s[10] = 0x79622d32; s[15] = 0x6b206574;
  // Key
  s[1] = key[0]; s[2] = key[1]; s[3] = key[2]; s[4] = key[3];
  s[11] = key[4]; s[12] = key[5]; s[13] = key[6]; s[14] = key[7];
  // Nonce
  s[6] = nonce[0]; s[7] = nonce[1];
  // Counter
  s[8] = counter >>> 0; s[9] = 0;

  const orig = new Uint32Array(s);
  for (let i = 0; i < 10; i++) {
    // Column rounds
    quarterRound(s, 0, 4, 8, 12);
    quarterRound(s, 5, 9, 13, 1);
    quarterRound(s, 10, 14, 2, 6);
    quarterRound(s, 15, 3, 7, 11);
    // Row rounds
    quarterRound(s, 0, 1, 2, 3);
    quarterRound(s, 5, 6, 7, 4);
    quarterRound(s, 10, 11, 8, 9);
    quarterRound(s, 15, 12, 13, 14);
  }
  for (let i = 0; i < 16; i++) s[i] = (s[i] + orig[i]) >>> 0;
  return s;
}

function salsa20Encrypt(plainBytes: Uint8Array, key: Uint32Array, nonce: Uint32Array): { keystream: Uint8Array; cipher: Uint8Array } {
  const out = new Uint8Array(plainBytes.length);
  const ks = new Uint8Array(plainBytes.length);
  let blockIdx = 0;
  for (let off = 0; off < plainBytes.length; off += 64) {
    const block = salsa20Block(key, nonce, blockIdx++);
    const blockBytes = new Uint8Array(block.buffer);
    const end = Math.min(64, plainBytes.length - off);
    for (let i = 0; i < end; i++) {
      ks[off + i] = blockBytes[i];
      out[off + i] = plainBytes[off + i] ^ blockBytes[i];
    }
  }
  return { keystream: ks, cipher: out };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function hexWord(v: number): string {
  return (v >>> 0).toString(16).padStart(8, '0');
}

function randomHexKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function randomHexNonce(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToUint32Array(hex: string, count: number): Uint32Array {
  const padded = hex.padEnd(count * 8, '0').slice(0, count * 8);
  const arr = new Uint32Array(count);
  for (let i = 0; i < count; i++) {
    const chunk = padded.slice(i * 8, i * 8 + 8);
    // Little-endian byte order
    arr[i] = (
      (parseInt(chunk.slice(6, 8), 16)) |
      (parseInt(chunk.slice(4, 6), 16) << 8) |
      (parseInt(chunk.slice(2, 4), 16) << 16) |
      (parseInt(chunk.slice(0, 2), 16) << 24)
    ) >>> 0;
  }
  return arr;
}

function textToBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── QR Step Snapshots (for animation) ─────────────────────────────────────────

interface QRStep {
  label: string;
  indices: [number, number, number, number];
  rotAmount: number;
  addPair: [string, string];
  result: number;
  target: string;
  state: Uint32Array;
}

function buildQRSteps(
  stateIn: Uint32Array,
  a: number, b: number, c: number, d: number,
  names: [string, string, string, string]
): QRStep[] {
  const steps: QRStep[] = [];
  const s = new Uint32Array(stateIn);

  const addVal1 = (s[a] + s[d]) >>> 0;
  s[b] = (s[b] ^ rotl32(addVal1, 7)) >>> 0;
  steps.push({ label: `${names[1]} ^= (${names[0]}+${names[3]}) <<< 7`, indices: [a, b, c, d], rotAmount: 7, addPair: [names[0], names[3]], result: s[b], target: names[1], state: new Uint32Array(s) });

  const addVal2 = (s[b] + s[a]) >>> 0;
  s[c] = (s[c] ^ rotl32(addVal2, 9)) >>> 0;
  steps.push({ label: `${names[2]} ^= (${names[1]}+${names[0]}) <<< 9`, indices: [a, b, c, d], rotAmount: 9, addPair: [names[1], names[0]], result: s[c], target: names[2], state: new Uint32Array(s) });

  const addVal3 = (s[c] + s[b]) >>> 0;
  s[d] = (s[d] ^ rotl32(addVal3, 13)) >>> 0;
  steps.push({ label: `${names[3]} ^= (${names[2]}+${names[1]}) <<< 13`, indices: [a, b, c, d], rotAmount: 13, addPair: [names[2], names[1]], result: s[d], target: names[3], state: new Uint32Array(s) });

  const addVal4 = (s[d] + s[c]) >>> 0;
  s[a] = (s[a] ^ rotl32(addVal4, 18)) >>> 0;
  steps.push({ label: `${names[0]} ^= (${names[3]}+${names[2]}) <<< 18`, indices: [a, b, c, d], rotAmount: 18, addPair: [names[3], names[2]], result: s[a], target: names[0], state: new Uint32Array(s) });

  return steps;
}

// ── Component ─────────────────────────────────────────────────────────────────

const CELL_LABELS = [
  'const', 'key[0]', 'key[1]', 'key[2]',
  'key[3]', 'const', 'nonce[0]', 'nonce[1]',
  'ctr[0]', 'ctr[1]', 'const', 'key[4]',
  'key[5]', 'key[6]', 'key[7]', 'const'
];

const COL_QR: [number, number, number, number][] = [[0,4,8,12],[5,9,13,1],[10,14,2,6],[15,3,7,11]];
const ROW_QR: [number, number, number, number][] = [[0,1,2,3],[5,6,7,4],[10,11,8,9],[15,12,13,14]];

const App: React.FC = () => {
  const [plaintext, setPlaintext] = useState('Hello, Salsa20!');
  const [ciphertextHex, setCiphertextHex] = useState('');
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [keyHex, setKeyHex] = useState(randomHexKey);
  const [nonceHex, setNonceHex] = useState(randomHexNonce);
  const [showInfo, setShowInfo] = useState(false);
  const [animStep, setAnimStep] = useState(-1); // -1 = no animation
  const [animRound, setAnimRound] = useState(0); // 0..19 double-half index (0-7 col, 8-15 row within a double round... simplified to step list)

  const key = useMemo(() => hexToUint32Array(keyHex.replace(/[^0-9a-fA-F]/g, ''), 8), [keyHex]);
  const nonce = useMemo(() => hexToUint32Array(nonceHex.replace(/[^0-9a-fA-F]/g, ''), 2), [nonceHex]);

  // Initial state matrix
  const initState = useMemo(() => {
    const s = new Uint32Array(16);
    s[0] = 0x61707865; s[5] = 0x3320646e; s[10] = 0x79622d32; s[15] = 0x6b206574;
    s[1] = key[0]; s[2] = key[1]; s[3] = key[2]; s[4] = key[3];
    s[11] = key[4]; s[12] = key[5]; s[13] = key[6]; s[14] = key[7];
    s[6] = nonce[0]; s[7] = nonce[1];
    s[8] = 0; s[9] = 0;
    return s;
  }, [key, nonce]);

  // Build ALL quarter-round steps for 20 rounds (10 double-rounds x 8 QRs = 80 QRs x 4 steps = 320 steps)
  const allSteps = useMemo(() => {
    const steps: QRStep[] = [];
    const s = new Uint32Array(initState);
    for (let dr = 0; dr < 10; dr++) {
      for (let q = 0; q < 4; q++) {
        const [a, b, c, d] = COL_QR[q];
        const names: [string, string, string, string] = [String(a), String(b), String(c), String(d)];
        const qSteps = buildQRSteps(s, a, b, c, d, names);
        steps.push(...qSteps);
        const last = qSteps[qSteps.length - 1];
        for (let i = 0; i < 16; i++) s[i] = last.state[i];
      }
      for (let q = 0; q < 4; q++) {
        const [a, b, c, d] = ROW_QR[q];
        const names: [string, string, string, string] = [String(a), String(b), String(c), String(d)];
        const qSteps = buildQRSteps(s, a, b, c, d, names);
        steps.push(...qSteps);
        const last = qSteps[qSteps.length - 1];
        for (let i = 0; i < 16; i++) s[i] = last.state[i];
      }
    }
    return steps;
  }, [initState]);

  // Current display state based on animation step
  const displayState = animStep < 0 ? initState : (animStep < allSteps.length ? allSteps[animStep].state : allSteps[allSteps.length - 1].state);

  // Highlighted cells
  const highlightedCells = new Set<number>();
  if (animStep >= 0 && animStep < allSteps.length) {
    allSteps[animStep].indices.forEach(i => highlightedCells.add(i));
  }

  // Which double-round / phase
  const currentDoubleRound = animStep < 0 ? -1 : Math.floor(animStep / 32);
  const withinDR = animStep < 0 ? -1 : animStep % 32;
  const isColumnPhase = withinDR >= 0 && withinDR < 16;
  const currentQR = animStep < 0 ? -1 : Math.floor((animStep % 16) / 4);

  // Encryption result
  const encResult = useMemo(() => {
    if (mode === 'encrypt') {
      const plainBytes = textToBytes(plaintext);
      if (plainBytes.length === 0) return null;
      return salsa20Encrypt(plainBytes, key, nonce);
    } else {
      const clean = ciphertextHex.replace(/[^0-9a-fA-F]/g, '');
      if (clean.length < 2) return null;
      const inputBytes = new Uint8Array(clean.length / 2);
      for (let i = 0; i < inputBytes.length; i++) inputBytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
      return salsa20Encrypt(inputBytes, key, nonce);
    }
  }, [plaintext, ciphertextHex, mode, key, nonce]);

  const handleStepForward = useCallback(() => {
    setAnimStep(prev => Math.min(prev + 1, allSteps.length - 1));
  }, [allSteps.length]);

  const handleSkipQR = useCallback(() => {
    setAnimStep(prev => {
      const nextQRBoundary = (Math.floor((prev + 4) / 4)) * 4 - 1;
      return Math.min(nextQRBoundary, allSteps.length - 1);
    });
  }, [allSteps.length]);

  const handleReset = useCallback(() => { setAnimStep(-1); }, []);

  const handleSkipToEnd = useCallback(() => {
    setAnimStep(allSteps.length - 1);
  }, [allSteps.length]);

  return (
    <div className="flex-1 bg-[#1a1814] flex flex-col items-center py-10 px-6 sm:px-10 md:px-16 text-stone-200 overflow-y-auto">
      <div className="w-full max-w-6xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-stone-100 tracking-tight">
              SALSA<span className="text-cyan-400">20</span>
            </h1>
            <span className="text-slate-500 text-xs tracking-[0.3em] font-mono">ARX STREAM CIPHER — D.J. BERNSTEIN, 2005</span>
          </div>
          <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 border border-slate-700">
            {showInfo ? <X size={20} /> : <Info size={20} />}
          </button>
        </div>

        {/* Info Panel */}
        {showInfo && (
          <div className="bg-cyan-950/20 border border-cyan-900/40 rounded-xl p-6 mb-8">
            <h3 className="text-lg font-bold text-cyan-400 mb-3">About Salsa20</h3>
            <p className="text-sm text-slate-300 leading-relaxed mb-3">
              Salsa20 was designed by <strong>Daniel J. Bernstein</strong> in 2005 and selected as a Phase 3 finalist
              in the <strong>eSTREAM</strong> competition. It uses an elegant <strong>ARX</strong> (Add-Rotate-XOR)
              construction — no S-boxes, no lookup tables, making it resistant to timing side-channel attacks.
            </p>
            <p className="text-sm text-slate-300 leading-relaxed mb-3">
              The cipher operates on a 4x4 matrix of 32-bit words, initialized with a 256-bit key, a 64-bit nonce,
              a 64-bit counter, and four constant words ("expand 32-byte k"). Twenty rounds of quarter-round
              operations (10 column rounds + 10 row rounds, grouped as 10 double-rounds) mix the state, then the
              original state is added back to produce a 64-byte keystream block.
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">
              Salsa20 is the foundation of <strong>NaCl</strong> and <strong>libsodium</strong> cryptographic
              libraries. Its variant <strong>ChaCha20</strong> (also by Bernstein) is used in TLS 1.3 and
              WireGuard. Compared to AES-CTR, Salsa20 requires no hardware acceleration to achieve high
              performance and constant-time execution.
            </p>
          </div>
        )}

        {/* Inputs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Key */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">256-bit Key (hex)</label>
              <button onClick={() => setKeyHex(randomHexKey())} className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold text-cyan-400 hover:bg-slate-800 transition-colors">
                <RefreshCw size={12} /> Generate
              </button>
            </div>
            <input
              value={keyHex}
              onChange={e => setKeyHex(e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 64))}
              className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-cyan-700/50 break-all"
              spellCheck={false}
              maxLength={64}
            />
            <div className="text-[10px] text-slate-600 mt-1 font-mono">{keyHex.replace(/[^0-9a-fA-F]/g, '').length}/64 hex chars</div>
          </div>

          {/* Nonce */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">64-bit Nonce (hex)</label>
              <button onClick={() => setNonceHex(randomHexNonce())} className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold text-cyan-400 hover:bg-slate-800 transition-colors">
                <RefreshCw size={12} /> Generate
              </button>
            </div>
            <input
              value={nonceHex}
              onChange={e => setNonceHex(e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 16))}
              className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-cyan-700/50"
              spellCheck={false}
              maxLength={16}
            />
            <div className="text-[10px] text-slate-600 mt-1 font-mono">{nonceHex.replace(/[^0-9a-fA-F]/g, '').length}/16 hex chars</div>
          </div>
        </div>

        {/* Input */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => setMode('encrypt')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${mode === 'encrypt' ? 'bg-cyan-950/50 text-cyan-400 border border-cyan-900/40' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'}`}>Encrypt Text</button>
            <button onClick={() => setMode('decrypt')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${mode === 'decrypt' ? 'bg-amber-950/50 text-amber-400 border border-amber-900/40' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'}`}>Decrypt Hex</button>
          </div>
          {mode === 'encrypt' ? (
            <textarea
              value={plaintext}
              onChange={e => setPlaintext(e.target.value)}
              placeholder="Type your message (any length)..."
              className="w-full h-20 bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-cyan-700/50 resize-none"
              spellCheck={false}
            />
          ) : (
            <textarea
              value={ciphertextHex}
              onChange={e => setCiphertextHex(e.target.value)}
              placeholder="Paste hex ciphertext..."
              className="w-full h-20 bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-amber-700/50 resize-none"
              spellCheck={false}
            />
          )}
        </div>

        {/* State Matrix */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">4x4 State Matrix</label>
              {animStep >= 0 && (
                <span className="ml-3 text-xs text-cyan-400 font-mono">
                  DR {currentDoubleRound + 1}/10 — {isColumnPhase ? 'Column' : 'Row'} QR {currentQR + 1}/4 — Step {(animStep % 4) + 1}/4
                </span>
              )}
            </div>
            {animStep >= 0 && (
              <span className="text-[10px] text-slate-500 font-mono">step {animStep + 1}/{allSteps.length}</span>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2 max-w-lg mx-auto mb-4">
            {Array.from({ length: 16 }, (_, i) => {
              const isConst = [0, 5, 10, 15].includes(i);
              const isHighlighted = highlightedCells.has(i);
              return (
                <div
                  key={i}
                  className={`rounded-lg p-2 text-center border transition-all duration-200 ${
                    isHighlighted
                      ? 'bg-cyan-950/60 border-cyan-500/70 ring-1 ring-cyan-500/30'
                      : isConst
                        ? 'bg-amber-950/30 border-amber-900/40'
                        : 'bg-slate-800/60 border-slate-700/50'
                  }`}
                >
                  <div className={`font-mono text-xs font-bold ${isHighlighted ? 'text-cyan-300' : isConst ? 'text-amber-400/80' : 'text-slate-200'}`}>
                    {hexWord(displayState[i])}
                  </div>
                  <div className={`text-[9px] mt-0.5 ${isConst ? 'text-amber-600/70' : 'text-slate-600'}`}>
                    {CELL_LABELS[i]}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Current step description */}
          {animStep >= 0 && animStep < allSteps.length && (
            <div className="bg-cyan-950/30 border border-cyan-900/40 rounded-lg px-4 py-3 text-center mb-4">
              <span className="font-mono text-sm text-cyan-300">{allSteps[animStep].label}</span>
              <span className="text-slate-500 text-xs ml-3">rot={allSteps[animStep].rotAmount}</span>
              <div className="font-mono text-xs text-slate-400 mt-1">
                → cell [{allSteps[animStep].target}] = <span className="text-cyan-400">{hexWord(allSteps[animStep].result)}</span>
              </div>
            </div>
          )}

          {/* Animation controls */}
          <div className="flex justify-center gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-slate-400 bg-slate-800/60 border border-slate-700 hover:text-white transition-colors"
            >
              <RotateCcw size={14} /> Reset
            </button>
            <button
              onClick={handleStepForward}
              disabled={animStep >= allSteps.length - 1}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-900/50 hover:bg-cyan-950/60 transition-colors disabled:opacity-30"
            >
              <Play size={14} /> Step
            </button>
            <button
              onClick={handleSkipQR}
              disabled={animStep >= allSteps.length - 1}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-900/50 hover:bg-cyan-950/60 transition-colors disabled:opacity-30"
            >
              <SkipForward size={14} /> Next QR
            </button>
            <button
              onClick={handleSkipToEnd}
              disabled={animStep >= allSteps.length - 1}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-slate-400 bg-slate-800/60 border border-slate-700 hover:text-white transition-colors disabled:opacity-30"
            >
              Skip to End
            </button>
          </div>
        </div>

        {/* Quarter-Round Reference */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 mb-6">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">Quarter-Round Operation (ARX)</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { expr: 'b ^= (a + d) <<< 7', rot: 7, color: 'text-cyan-400' },
              { expr: 'c ^= (b + a) <<< 9', rot: 9, color: 'text-cyan-300' },
              { expr: 'd ^= (c + b) <<< 13', rot: 13, color: 'text-cyan-200' },
              { expr: 'a ^= (d + c) <<< 18', rot: 18, color: 'text-cyan-100' },
            ].map((step, i) => (
              <div
                key={i}
                className={`font-mono text-sm px-3 py-2 rounded-lg border transition-all ${
                  animStep >= 0 && animStep % 4 === i
                    ? 'bg-cyan-950/50 border-cyan-700/60 ' + step.color
                    : 'bg-slate-800/40 border-slate-700/30 text-slate-500'
                }`}
              >
                <span className="text-slate-600 text-xs mr-2">step {i + 1}:</span>{step.expr}
              </div>
            ))}
          </div>
          <div className="mt-3 text-[10px] text-slate-600">
            Each double-round: 4 column quarter-rounds (cols 0,1,2,3) then 4 row quarter-rounds (rows 0,1,2,3). Total: 10 double-rounds = 20 rounds.
          </div>
        </div>

        {/* Round structure overview */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 mb-6">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">Round Structure — 10 Double-Rounds</label>
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: 10 }, (_, dr) => {
              const isActive = currentDoubleRound === dr;
              const isDone = currentDoubleRound > dr || animStep >= allSteps.length - 1;
              return (
                <div key={dr} className="flex gap-0.5">
                  {/* Column phase */}
                  <div
                    className={`w-6 h-6 rounded-sm flex items-center justify-center text-[9px] font-mono border transition-all ${
                      isActive && isColumnPhase
                        ? 'bg-cyan-600/40 border-cyan-500 text-cyan-300'
                        : isDone || (isActive && !isColumnPhase)
                          ? 'bg-slate-700/50 border-slate-600 text-slate-400'
                          : 'bg-slate-800/30 border-slate-700/30 text-slate-700'
                    }`}
                    title={`DR ${dr + 1} — Column rounds`}
                  >
                    C
                  </div>
                  {/* Row phase */}
                  <div
                    className={`w-6 h-6 rounded-sm flex items-center justify-center text-[9px] font-mono border transition-all ${
                      isActive && !isColumnPhase
                        ? 'bg-cyan-600/40 border-cyan-500 text-cyan-300'
                        : isDone
                          ? 'bg-slate-700/50 border-slate-600 text-slate-400'
                          : 'bg-slate-800/30 border-slate-700/30 text-slate-700'
                    }`}
                    title={`DR ${dr + 1} — Row rounds`}
                  >
                    R
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-2 text-[10px] text-slate-600">
            <span><span className="inline-block w-2 h-2 rounded-sm bg-cyan-600/40 border border-cyan-500 mr-1" />Active</span>
            <span><span className="inline-block w-2 h-2 rounded-sm bg-slate-700/50 border border-slate-600 mr-1" />Complete</span>
            <span><span className="inline-block w-2 h-2 rounded-sm bg-slate-800/30 border border-slate-700/30 mr-1" />Pending</span>
          </div>
        </div>

        {/* Encryption XOR Visualization */}
        {encResult && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 mb-6">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">
              Encrypt / Decrypt — XOR with Keystream
            </label>
            <div className="overflow-x-auto">
              <table className="font-mono text-xs w-full">
                <thead>
                  <tr className="text-slate-600">
                    <td className="pr-3 text-[10px] uppercase tracking-wider font-bold py-1 w-24">{mode === 'encrypt' ? 'Plaintext' : 'Ciphertext'}</td>
                    {(mode === 'encrypt' ? Array.from(textToBytes(plaintext)) : (() => { const clean = ciphertextHex.replace(/[^0-9a-fA-F]/g, ''); const b: number[] = []; for (let i = 0; i + 1 < clean.length; i += 2) b.push(parseInt(clean.slice(i, i + 2), 16)); return b; })()).slice(0, 32).map((b, i) => (
                      <td key={i} className="px-0.5 text-center w-7">{mode === 'encrypt' ? String.fromCharCode(b) : b.toString(16).padStart(2, '0')}</td>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="pr-3 text-[10px] text-slate-600 uppercase tracking-wider font-bold py-1">{mode === 'encrypt' ? 'Plain' : 'Cipher'} hex</td>
                    {(mode === 'encrypt' ? Array.from(textToBytes(plaintext)) : (() => { const clean = ciphertextHex.replace(/[^0-9a-fA-F]/g, ''); const b: number[] = []; for (let i = 0; i + 1 < clean.length; i += 2) b.push(parseInt(clean.slice(i, i + 2), 16)); return b; })()).slice(0, 32).map((b, i) => (
                      <td key={i} className="px-0.5 text-center text-slate-400">{b.toString(16).padStart(2, '0')}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="pr-3 text-[10px] text-cyan-600 uppercase tracking-wider font-bold py-1">Keystream</td>
                    {Array.from(encResult.keystream).slice(0, 32).map((b, i) => (
                      <td key={i} className="px-0.5 text-center text-cyan-500/70">{b.toString(16).padStart(2, '0')}</td>
                    ))}
                  </tr>
                  <tr className="border-t border-slate-700/50">
                    <td className="pr-3 text-[10px] text-cyan-400 uppercase tracking-wider font-bold py-1">{mode === 'encrypt' ? 'Cipher' : 'Plain'} =</td>
                    {Array.from(encResult.cipher).slice(0, 32).map((b, i) => (
                      <td key={i} className="px-0.5 text-center text-cyan-300 font-bold">{b.toString(16).padStart(2, '0')}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
              {(mode === 'encrypt' ? textToBytes(plaintext).length : ciphertextHex.replace(/[^0-9a-fA-F]/g, '').length / 2) > 32 && (
                <div className="text-[10px] text-slate-600 mt-1">Showing first 32 of {mode === 'encrypt' ? textToBytes(plaintext).length : Math.floor(ciphertextHex.replace(/[^0-9a-fA-F]/g, '').length / 2)} bytes</div>
              )}
            </div>

            <div className="mt-4">
              <label className="text-[10px] text-slate-600 uppercase tracking-wider font-bold">{mode === 'encrypt' ? 'Full Ciphertext (hex)' : 'Decrypted Output'}</label>
              {mode === 'decrypt' && (
                <div className="bg-slate-800/50 border border-slate-700/40 rounded-lg px-3 py-2 mt-1 font-mono text-sm text-emerald-300 break-all">
                  {Array.from(encResult.cipher).map(b => b >= 32 && b < 127 ? String.fromCharCode(b) : '·').join('')}
                </div>
              )}
              <div className="bg-slate-800/50 border border-slate-700/40 rounded-lg px-3 py-2 mt-1 font-mono text-xs text-cyan-300/80 break-all select-all cursor-pointer"
                onClick={() => { if (mode === 'encrypt') { setCiphertextHex(bytesToHex(encResult.cipher)); setMode('decrypt'); } }}>
                {bytesToHex(encResult.cipher)}
              </div>
              {mode === 'encrypt' && <p className="text-[10px] text-slate-600 mt-1">Click to copy to decrypt mode</p>}
            </div>
          </div>
        )}

        {/* Keystream Addition Note */}
        <div className="bg-cyan-950/20 border border-cyan-900/40 rounded-xl p-5 mb-6">
          <label className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2 block">Keystream Generation</label>
          <p className="text-xs text-slate-400 leading-relaxed">
            After all 20 rounds, the final state is <strong className="text-slate-300">added word-by-word</strong> to
            the original input state (before the rounds). This feedforward addition prevents an attacker from inverting
            the rounds. The resulting 16 words (64 bytes) form one keystream block. For messages longer than 64 bytes,
            the counter increments and a new block is generated. Encryption is simply <strong className="text-cyan-400">plaintext XOR keystream</strong> —
            decryption is the same operation.
          </p>
        </div>

        {/* Constants legend */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">Matrix Layout (Salsa20 Spec)</label>
          <div className="grid grid-cols-4 gap-2 max-w-lg mx-auto font-mono text-xs">
            {[
              { label: '"expa"', cls: 'text-amber-400/80 bg-amber-950/30 border-amber-900/40' },
              { label: 'key[0..3]', cls: 'text-slate-300 bg-slate-800/60 border-slate-700/50' },
              { label: 'key[0..3]', cls: 'text-slate-300 bg-slate-800/60 border-slate-700/50' },
              { label: 'key[0..3]', cls: 'text-slate-300 bg-slate-800/60 border-slate-700/50' },
              { label: 'key[0..3]', cls: 'text-slate-300 bg-slate-800/60 border-slate-700/50' },
              { label: '"nd 3"', cls: 'text-amber-400/80 bg-amber-950/30 border-amber-900/40' },
              { label: 'nonce', cls: 'text-emerald-400/80 bg-emerald-950/30 border-emerald-900/40' },
              { label: 'nonce', cls: 'text-emerald-400/80 bg-emerald-950/30 border-emerald-900/40' },
              { label: 'counter', cls: 'text-purple-400/80 bg-purple-950/30 border-purple-900/40' },
              { label: 'counter', cls: 'text-purple-400/80 bg-purple-950/30 border-purple-900/40' },
              { label: '"2-by"', cls: 'text-amber-400/80 bg-amber-950/30 border-amber-900/40' },
              { label: 'key[4..7]', cls: 'text-slate-300 bg-slate-800/60 border-slate-700/50' },
              { label: 'key[4..7]', cls: 'text-slate-300 bg-slate-800/60 border-slate-700/50' },
              { label: 'key[4..7]', cls: 'text-slate-300 bg-slate-800/60 border-slate-700/50' },
              { label: 'key[4..7]', cls: 'text-slate-300 bg-slate-800/60 border-slate-700/50' },
              { label: '"te k"', cls: 'text-amber-400/80 bg-amber-950/30 border-amber-900/40' },
            ].map((cell, i) => (
              <div key={i} className={`rounded-lg px-2 py-1.5 text-center border ${cell.cls}`}>{cell.label}</div>
            ))}
          </div>
          <div className="flex flex-wrap gap-4 mt-3 text-[10px] text-slate-600 justify-center">
            <span><span className="inline-block w-2 h-2 rounded-sm bg-amber-950/30 border border-amber-900/40 mr-1" />Constants</span>
            <span><span className="inline-block w-2 h-2 rounded-sm bg-slate-800/60 border border-slate-700/50 mr-1" />Key</span>
            <span><span className="inline-block w-2 h-2 rounded-sm bg-emerald-950/30 border border-emerald-900/40 mr-1" />Nonce</span>
            <span><span className="inline-block w-2 h-2 rounded-sm bg-purple-950/30 border border-purple-900/40 mr-1" />Counter</span>
          </div>
        </div>
      </div>

      {/* Spacer at bottom */}
      <div className="h-10" />
    </div>
  );
};

export default App;
