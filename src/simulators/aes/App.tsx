import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Info, X, Play, Pause, SkipForward, SkipBack, RotateCcw, ChevronRight, ChevronLeft } from 'lucide-react';

// ── AES S-Box (Rijndael) ──────────────────────────────────────────
const SBOX: number[] = [
  0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
  0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
  0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
  0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
  0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
  0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
  0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
  0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
  0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
  0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
  0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
  0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
  0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
  0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
  0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
  0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16,
];

const RCON: number[] = [0x01,0x02,0x04,0x08,0x10,0x20,0x40,0x80,0x1b,0x36];

// ── GF(2^8) arithmetic ────────────────────────────────────────────
function gmul(a: number, b: number): number {
  let p = 0;
  for (let i = 0; i < 8; i++) {
    if (b & 1) p ^= a;
    const hi = a & 0x80;
    a = (a << 1) & 0xff;
    if (hi) a ^= 0x1b;
    b >>= 1;
  }
  return p;
}

// ── AES core functions ────────────────────────────────────────────
type State = number[][];           // 4×4, column-major: state[col][row]

function textToState(bytes: number[]): State {
  const s: State = Array.from({ length: 4 }, () => Array(4).fill(0));
  for (let i = 0; i < 16; i++) s[i >> 2][i & 3] = bytes[i] ?? 0;
  return s;
}

function cloneState(s: State): State {
  return s.map(c => [...c]);
}

function subBytes(s: State): State {
  const out = cloneState(s);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++)
      out[c][r] = SBOX[s[c][r]];
  return out;
}

function shiftRows(s: State): State {
  const out = cloneState(s);
  for (let r = 1; r < 4; r++)
    for (let c = 0; c < 4; c++)
      out[c][r] = s[(c + r) % 4][r];
  return out;
}

function mixColumns(s: State): State {
  const out = cloneState(s);
  for (let c = 0; c < 4; c++) {
    const a = s[c];
    out[c][0] = gmul(a[0], 2) ^ gmul(a[1], 3) ^ a[2] ^ a[3];
    out[c][1] = a[0] ^ gmul(a[1], 2) ^ gmul(a[2], 3) ^ a[3];
    out[c][2] = a[0] ^ a[1] ^ gmul(a[2], 2) ^ gmul(a[3], 3);
    out[c][3] = gmul(a[0], 3) ^ a[1] ^ a[2] ^ gmul(a[3], 2);
  }
  return out;
}

function addRoundKey(s: State, rk: State): State {
  const out = cloneState(s);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++)
      out[c][r] = s[c][r] ^ rk[c][r];
  return out;
}

function keyExpansion(key: number[]): State[] {
  const w: number[][] = [];
  for (let i = 0; i < 4; i++) w[i] = [key[4*i], key[4*i+1], key[4*i+2], key[4*i+3]];
  for (let i = 4; i < 44; i++) {
    let temp = [...w[i - 1]];
    if (i % 4 === 0) {
      temp = [SBOX[temp[1]], SBOX[temp[2]], SBOX[temp[3]], SBOX[temp[0]]];
      temp[0] ^= RCON[(i / 4) - 1];
    }
    w[i] = w[i - 4].map((b, j) => b ^ temp[j]);
  }
  const roundKeys: State[] = [];
  for (let r = 0; r <= 10; r++) {
    const rk: State = Array.from({ length: 4 }, (_, c) => [...w[r * 4 + c]]);
    roundKeys.push(rk);
  }
  return roundKeys;
}

// ── Step definitions ──────────────────────────────────────────────
type StepKind = 'initial' | 'subBytes' | 'shiftRows' | 'mixColumns' | 'addRoundKey';

interface AESStep {
  round: number;
  kind: StepKind;
  label: string;
  stateBefore: State;
  stateAfter: State;
  roundKey?: State;
}

function computeAllSteps(plaintext: number[], key: number[]): AESStep[] {
  const rks = keyExpansion(key);
  const steps: AESStep[] = [];
  let state = textToState(plaintext);

  // Initial AddRoundKey
  const after0 = addRoundKey(state, rks[0]);
  steps.push({ round: 0, kind: 'initial', label: 'Initial AddRoundKey', stateBefore: cloneState(state), stateAfter: cloneState(after0), roundKey: cloneState(rks[0]) });
  state = after0;

  for (let round = 1; round <= 10; round++) {
    // SubBytes
    const afterSub = subBytes(state);
    steps.push({ round, kind: 'subBytes', label: `Round ${round} — SubBytes`, stateBefore: cloneState(state), stateAfter: cloneState(afterSub) });
    state = afterSub;

    // ShiftRows
    const afterShift = shiftRows(state);
    steps.push({ round, kind: 'shiftRows', label: `Round ${round} — ShiftRows`, stateBefore: cloneState(state), stateAfter: cloneState(afterShift) });
    state = afterShift;

    // MixColumns (skip round 10)
    if (round < 10) {
      const afterMix = mixColumns(state);
      steps.push({ round, kind: 'mixColumns', label: `Round ${round} — MixColumns`, stateBefore: cloneState(state), stateAfter: cloneState(afterMix) });
      state = afterMix;
    }

    // AddRoundKey
    const afterARK = addRoundKey(state, rks[round]);
    steps.push({ round, kind: 'addRoundKey', label: `Round ${round} — AddRoundKey`, stateBefore: cloneState(state), stateAfter: cloneState(afterARK), roundKey: cloneState(rks[round]) });
    state = afterARK;
  }

  return steps;
}

// ── Helpers ───────────────────────────────────────────────────────
function hex(b: number): string { return b.toString(16).padStart(2, '0'); }

function parseInput(text: string): number[] {
  const bytes: number[] = [];
  // If it looks like hex (only hex chars & even length), parse as hex
  const cleaned = text.replace(/\s/g, '');
  if (/^[0-9a-fA-F]+$/.test(cleaned) && cleaned.length % 2 === 0 && cleaned.length <= 32) {
    for (let i = 0; i < 32; i += 2) {
      const h = cleaned.substring(i, i + 2);
      bytes.push(h ? parseInt(h, 16) : 0);
    }
  } else {
    for (let i = 0; i < 16; i++) bytes.push(i < text.length ? text.charCodeAt(i) & 0xff : 0);
  }
  while (bytes.length < 16) bytes.push(0);
  return bytes.slice(0, 16);
}

// ── MixColumns visualization matrix ──────────────────────────────
const MIX_MATRIX = [[2,3,1,1],[1,2,3,1],[1,1,2,3],[3,1,1,2]];

// ── Component ─────────────────────────────────────────────────────
const AESSimulator: React.FC = () => {
  const [plainInput, setPlainInput] = useState('Two One Nine Two');
  const [keyInput, setKeyInput] = useState('Thats my Kung Fu');
  const [showInfo, setShowInfo] = useState(false);
  const [showKeySchedule, setShowKeySchedule] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(800);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const plainBytes = parseInput(plainInput);
  const keyBytes = parseInput(keyInput);
  const steps = computeAllSteps(plainBytes, keyBytes);
  const roundKeys = keyExpansion(keyBytes);
  const currentStep = steps[stepIndex] ?? steps[0];
  const totalSteps = steps.length;

  // Auto-play
  useEffect(() => {
    if (playing) {
      timerRef.current = setInterval(() => {
        setStepIndex(prev => {
          if (prev >= totalSteps - 1) { setPlaying(false); return prev; }
          return prev + 1;
        });
      }, speed);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [playing, speed, totalSteps]);

  const reset = useCallback(() => { setStepIndex(0); setPlaying(false); }, []);

  // Color for changed bytes
  function cellColor(before: State, after: State, col: number, row: number, kind: StepKind): string {
    if (before[col][row] !== after[col][row]) {
      if (kind === 'subBytes') return 'bg-amber-500/30 text-amber-300';
      if (kind === 'shiftRows') return 'bg-purple-500/30 text-purple-300';
      if (kind === 'mixColumns') return 'bg-emerald-500/30 text-emerald-300';
      if (kind === 'addRoundKey' || kind === 'initial') return 'bg-cyan-500/30 text-cyan-300';
    }
    return 'text-slate-300';
  }

  const StateGrid: React.FC<{ state: State; prevState?: State; kind?: StepKind; label: string; compact?: boolean }> = ({ state, prevState, kind, label, compact }) => (
    <div className={compact ? '' : ''}>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{label}</p>
      <div className="grid grid-cols-4 gap-1">
        {[0,1,2,3].map(r => [0,1,2,3].map(c => {
          const cls = prevState && kind ? cellColor(prevState, state, c, r, kind) : 'text-slate-300';
          return (
            <div key={`${r}-${c}`} className={`font-mono text-sm text-center py-1.5 px-1 rounded ${cls} bg-slate-800/60 border border-slate-700/50 transition-all duration-300`}>
              {hex(state[c][r])}
            </div>
          );
        }))}
      </div>
    </div>
  );

  const stepKindLabel: Record<StepKind, string> = {
    initial: 'AddRoundKey (Initial)',
    subBytes: 'SubBytes',
    shiftRows: 'ShiftRows',
    mixColumns: 'MixColumns',
    addRoundKey: 'AddRoundKey',
  };

  const stepDesc: Record<StepKind, string> = {
    initial: 'XOR the plaintext state with the initial round key (Round Key 0).',
    subBytes: 'Each byte is substituted using the Rijndael S-box — a nonlinear mapping that provides confusion.',
    shiftRows: 'Rows 1–3 are cyclically shifted left by 1, 2, and 3 positions respectively, providing diffusion across columns.',
    mixColumns: 'Each column is multiplied by a fixed polynomial matrix in GF(2^8), mixing bytes within each column.',
    addRoundKey: 'The round key is XORed with the current state, incorporating key material into the cipher.',
  };

  return (
    <div className="min-h-screen bg-[#1a1814] text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-cyan-400">AES-128 Simulator</h1>
            <p className="text-slate-400 text-sm mt-1">Advanced Encryption Standard — Rijndael Block Cipher</p>
          </div>
          <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-lg bg-slate-800/60 border border-slate-700 hover:border-cyan-700/50 transition-colors">
            {showInfo ? <X size={20} className="text-cyan-400" /> : <Info size={20} className="text-cyan-400" />}
          </button>
        </div>

        {/* Info Panel */}
        {showInfo && (
          <div className="bg-cyan-950/20 border border-cyan-900/40 rounded-xl p-6 space-y-4 text-sm text-slate-300 leading-relaxed">
            <h2 className="text-lg font-bold text-cyan-400">About AES (Rijndael)</h2>
            <p>
              In 1997, NIST launched a competition to replace the aging DES standard. Fifteen candidates were submitted — MARS, RC6, Rijndael, Serpent, and Twofish made the final five. In October 2000, <strong className="text-white">Rijndael</strong>, designed by Belgian cryptographers Joan Daemen and Vincent Rijmen, was selected as the Advanced Encryption Standard.
            </p>
            <p>
              AES operates on a 4×4 matrix of bytes called the <strong className="text-white">State</strong>. For AES-128, 10 rounds of four operations transform plaintext into ciphertext. Each round applies SubBytes (S-box substitution for confusion), ShiftRows (byte permutation for row diffusion), MixColumns (column mixing in GF(2^8) for column diffusion), and AddRoundKey (XOR with derived key material). The final round omits MixColumns.
            </p>
            <p>
              <strong className="text-white">GF(2^8) Arithmetic:</strong> MixColumns multiplies in the Galois Field GF(2^8) with irreducible polynomial x^8 + x^4 + x^3 + x + 1 (0x11B). Multiplication by 2 is a left-shift; if the high bit was set, XOR with 0x1B. Multiplication by 3 is xtime(a) XOR a.
            </p>
            <p>
              <strong className="text-white">Why AES replaced DES:</strong> DES's 56-bit key was brute-forced in under 24 hours by 1999. AES's 128-bit key space (2^128 possibilities) is computationally infeasible to brute-force with any foreseeable technology.
            </p>
            <p>
              <strong className="text-white">Where AES is used today:</strong> TLS/HTTPS (virtually all web traffic), full-disk encryption (BitLocker, FileVault), WiFi (WPA2/WPA3), VPNs (IPsec, WireGuard), file encryption (7-Zip, GPG), messaging (Signal Protocol), and hardware-accelerated via AES-NI instructions on modern CPUs.
            </p>
          </div>
        )}

        {/* Input Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Plaintext (16 chars or 32 hex digits)</label>
            <input
              value={plainInput}
              onChange={e => { setPlainInput(e.target.value); reset(); }}
              className="w-full mt-2 bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-cyan-700/50"
              maxLength={32}
            />
            <p className="text-xs text-slate-500 mt-1 font-mono">{plainBytes.map(hex).join(' ')}</p>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Key (16 chars or 32 hex digits)</label>
            <input
              value={keyInput}
              onChange={e => { setKeyInput(e.target.value); reset(); }}
              className="w-full mt-2 bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-cyan-700/50"
              maxLength={32}
            />
            <p className="text-xs text-slate-500 mt-1 font-mono">{keyBytes.map(hex).join(' ')}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => { setStepIndex(0); setPlaying(false); }} className="p-2 rounded-lg bg-slate-800 border border-slate-700 hover:border-cyan-700/50 transition-colors" title="Reset">
              <RotateCcw size={18} className="text-slate-300" />
            </button>
            <button onClick={() => setStepIndex(Math.max(0, stepIndex - 1))} disabled={stepIndex === 0} className="p-2 rounded-lg bg-slate-800 border border-slate-700 hover:border-cyan-700/50 transition-colors disabled:opacity-30" title="Previous step">
              <SkipBack size={18} className="text-slate-300" />
            </button>
            <button onClick={() => setPlaying(!playing)} className="p-2 rounded-lg bg-cyan-900/50 border border-cyan-800/50 hover:border-cyan-600/50 transition-colors" title={playing ? 'Pause' : 'Play'}>
              {playing ? <Pause size={18} className="text-cyan-400" /> : <Play size={18} className="text-cyan-400" />}
            </button>
            <button onClick={() => setStepIndex(Math.min(totalSteps - 1, stepIndex + 1))} disabled={stepIndex >= totalSteps - 1} className="p-2 rounded-lg bg-slate-800 border border-slate-700 hover:border-cyan-700/50 transition-colors disabled:opacity-30" title="Next step">
              <SkipForward size={18} className="text-slate-300" />
            </button>

            <div className="flex items-center gap-2 ml-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Speed</span>
              <input type="range" min={100} max={2000} step={100} value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-24 accent-cyan-500" />
              <span className="text-xs text-slate-500 w-12">{speed}ms</span>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-slate-500">Step {stepIndex + 1} / {totalSteps}</span>
              <span className="text-xs font-bold text-cyan-400">Round {currentStep.round}</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-cyan-500/70 rounded-full transition-all duration-300" style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }} />
          </div>
        </div>

        {/* Current Step Label & Description */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              currentStep.kind === 'subBytes' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
              currentStep.kind === 'shiftRows' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
              currentStep.kind === 'mixColumns' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
              'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
            }`}>
              {stepKindLabel[currentStep.kind]}
            </span>
            <span className="text-sm text-slate-400">{currentStep.label}</span>
          </div>
          <p className="text-sm text-slate-400">{stepDesc[currentStep.kind]}</p>
        </div>

        {/* State Visualization */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Before State */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
            <StateGrid state={currentStep.stateBefore} label="State Before" />
          </div>

          {/* Operation Detail (center) */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col items-center justify-center">
            {currentStep.kind === 'subBytes' && (
              <div className="text-center space-y-3">
                <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">S-Box Substitution</p>
                <div className="grid grid-cols-4 gap-1">
                  {[0,1,2,3].map(r => [0,1,2,3].map(c => {
                    const before = currentStep.stateBefore[c][r];
                    const after = currentStep.stateAfter[c][r];
                    return (
                      <div key={`sb-${r}-${c}`} className="text-center">
                        <span className="font-mono text-xs text-slate-500">{hex(before)}</span>
                        <ChevronRight size={10} className="inline text-amber-500 mx-0.5" />
                        <span className="font-mono text-xs text-amber-300">{hex(after)}</span>
                      </div>
                    );
                  }))}
                </div>
              </div>
            )}
            {currentStep.kind === 'shiftRows' && (
              <div className="text-center space-y-2">
                <p className="text-xs font-bold text-purple-400 uppercase tracking-wider">Row Shifts</p>
                {[0,1,2,3].map(r => (
                  <div key={r} className="flex items-center gap-2 justify-center">
                    <span className="text-xs text-slate-500 w-14">Row {r}:</span>
                    <span className="font-mono text-xs text-purple-300">{r === 0 ? 'no shift' : `← shift ${r}`}</span>
                  </div>
                ))}
              </div>
            )}
            {currentStep.kind === 'mixColumns' && (
              <div className="text-center space-y-2">
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">GF(2^8) Matrix</p>
                <div className="grid grid-cols-4 gap-1">
                  {MIX_MATRIX.map((row, ri) => row.map((v, ci) => (
                    <div key={`mx-${ri}-${ci}`} className="font-mono text-xs text-emerald-300 bg-emerald-900/20 rounded px-2 py-1">{v}</div>
                  )))}
                </div>
                <p className="text-xs text-slate-500 mt-1">× each column in GF(2^8)</p>
              </div>
            )}
            {(currentStep.kind === 'addRoundKey' || currentStep.kind === 'initial') && currentStep.roundKey && (
              <div className="w-full">
                <StateGrid state={currentStep.roundKey} label={`Round Key ${currentStep.round}`} compact />
                <p className="text-xs text-cyan-500/70 mt-2 text-center">State ⊕ Round Key</p>
              </div>
            )}
          </div>

          {/* After State */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
            <StateGrid state={currentStep.stateAfter} prevState={currentStep.stateBefore} kind={currentStep.kind} label="State After" />
          </div>
        </div>

        {/* Ciphertext Output */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ciphertext (after all 10 rounds)</label>
          <div className="mt-2 font-mono text-sm text-cyan-300 tracking-wider">
            {(() => {
              const final = steps[steps.length - 1]?.stateAfter;
              if (!final) return '';
              const bytes: string[] = [];
              for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) bytes.push(hex(final[c][r]));
              return bytes.join(' ');
            })()}
          </div>
        </div>

        {/* Key Schedule Toggle */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
          <button onClick={() => setShowKeySchedule(!showKeySchedule)} className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
            {showKeySchedule ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            <span className="text-xs font-bold uppercase tracking-wider">Key Expansion Schedule (11 Round Keys)</span>
          </button>
          {showKeySchedule && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {roundKeys.map((rk, i) => (
                <div key={i} className={`rounded-lg p-3 border ${i === currentStep.round ? 'bg-cyan-950/30 border-cyan-700/50' : 'bg-slate-800/40 border-slate-700/30'}`}>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Round Key {i}</p>
                  <div className="grid grid-cols-4 gap-1">
                    {[0,1,2,3].map(r => [0,1,2,3].map(c => (
                      <div key={`rk-${i}-${r}-${c}`} className="font-mono text-xs text-center text-slate-300 bg-slate-900/60 rounded py-0.5">
                        {hex(rk[c][r])}
                      </div>
                    )))}
                  </div>
                  {i > 0 && (
                    <p className="text-xs text-slate-600 mt-1">
                      Rcon: {hex(RCON[i - 1])} | RotWord → SubWord → XOR
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AESSimulator;
