import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Info, X, Play, Pause, SkipBack, SkipForward, RotateCcw, Layers, Shuffle } from 'lucide-react';

// ── Shared S-box (same as Heys' SPN) ────────────────────────────────────────
const SBOX: number[] = [0xE, 0x4, 0xD, 0x1, 0x2, 0xF, 0xB, 0x8, 0x3, 0xA, 0x6, 0xC, 0x5, 0x9, 0x0, 0x7];

// ── Crypto helpers ───────────────────────────────────────────────────────────
function applySboxByte(byte: number): number {
  const hi = SBOX[(byte >> 4) & 0xF];
  const lo = SBOX[byte & 0xF];
  return ((hi << 4) | lo) & 0xFF;
}

function fFunction(r: number, roundKey: number): number {
  const xored = (r ^ roundKey) & 0xFF;
  return applySboxByte(xored);
}

function deriveRoundKeys(key16: number): number[] {
  // K1=bits15-8, K2=bits11-4, K3=bits7-0, K4=bits15-8 rotated
  const k1 = (key16 >> 8) & 0xFF;
  const k2 = (key16 >> 4) & 0xFF;
  const k3 = key16 & 0xFF;
  // K4: rotate K1 left by 2
  const k4 = (((k1 << 2) | (k1 >> 6)) & 0xFF);
  return [k1, k2, k3, k4];
}

// ── Types ────────────────────────────────────────────────────────────────────
interface RoundState {
  L_in:     number;
  R_in:     number;
  roundKey: number;
  xored:    number;
  F_out:    number;
  L_out:    number;
  R_out:    number;
}

function computeRounds(pt: number, key16: number): RoundState[] {
  const roundKeys = deriveRoundKeys(key16);
  const rounds: RoundState[] = [];
  let L = (pt >> 8) & 0xFF;
  let R = pt & 0xFF;

  for (let r = 0; r < 4; r++) {
    const rk = roundKeys[r];
    const xored = (R ^ rk) & 0xFF;
    const fOut = applySboxByte(xored);
    const newL = R;
    const newR = (L ^ fOut) & 0xFF;
    rounds.push({ L_in: L, R_in: R, roundKey: rk, xored, F_out: fOut, L_out: newL, R_out: newR });
    L = newL;
    R = newR;
  }
  return rounds;
}

// Total steps: 4 rounds × 5 phases + initial (phase 0) = 21 steps
// step 0 = initial display
// steps 1-5 = round 1 phases 0-4
// steps 6-10 = round 2 ...
// etc.
const TOTAL_STEPS = 21;

function stepToRoundPhase(step: number): { round: number; phase: number } {
  if (step === 0) return { round: 0, phase: 0 };
  const r = Math.ceil(step / 5);
  const p = ((step - 1) % 5);
  return { round: r, phase: p };
}

// ── Utility ──────────────────────────────────────────────────────────────────
function to8Bits(v: number): number[] {
  return Array.from({ length: 8 }, (_, i) => (v >> (7 - i)) & 1);
}

function toHex2(v: number): string {
  return v.toString(16).toUpperCase().padStart(2, '0');
}

function toHex4(v: number): string {
  return v.toString(16).toUpperCase().padStart(4, '0');
}

function randomHex(digits: number): string {
  return Array.from({ length: digits }, () => Math.floor(Math.random() * 16).toString(16)).join('').toUpperCase();
}

// ── Small bit row ─────────────────────────────────────────────────────────────
function BitRow({ bits, color, dim }: { bits: number[]; color: string; dim?: boolean }) {
  return (
    <div className="flex gap-0.5">
      {bits.map((b, i) => (
        <div key={i}
          className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-mono font-bold border transition-colors ${
            b === 1
              ? dim ? `bg-slate-800 border-slate-600 ${color}` : `${color}`
              : 'bg-slate-900 border-slate-700 text-slate-600'
          }`}>
          {b}
        </div>
      ))}
    </div>
  );
}

// ── Round block SVG connections ───────────────────────────────────────────────
function RoundSVG({ active }: { active: boolean }) {
  const lColor = active ? '#f59e0b' : '#78350f';
  const rColor = active ? '#22d3ee' : '#164e63';
  const fColor = active ? '#4ade80' : '#14532d';
  return (
    <svg viewBox="0 0 200 80" className="w-full" style={{ height: 80 }}>
      {/* L straight down */}
      <line x1={50} y1={0} x2={50} y2={80} stroke={lColor} strokeWidth={2} />
      {/* R down to F box */}
      <line x1={150} y1={0} x2={150} y2={25} stroke={rColor} strokeWidth={2} />
      {/* R into F box */}
      <rect x={120} y={25} width={60} height={22} rx={4} fill="#0f172a" stroke={fColor} strokeWidth={1.5} />
      <text x={150} y={40} textAnchor="middle" fontSize={10} fill={fColor} fontFamily="monospace" fontWeight="bold">F(R,K)</text>
      {/* F output line goes left */}
      <line x1={120} y1={36} x2={80} y2={36} stroke={fColor} strokeWidth={2} />
      {/* XOR circle */}
      <circle cx={65} cy={56} r={10} fill="#0f172a" stroke={lColor} strokeWidth={1.5} />
      <line x1={59} y1={56} x2={71} y2={56} stroke={lColor} strokeWidth={1.5} />
      <line x1={65} y1={50} x2={65} y2={62} stroke={lColor} strokeWidth={1.5} />
      {/* L into XOR */}
      <line x1={50} y1={56} x2={55} y2={56} stroke={lColor} strokeWidth={2} />
      {/* F to XOR */}
      <line x1={80} y1={36} x2={80} y2={56} stroke={fColor} strokeWidth={2} />
      <line x1={80} y1={56} x2={75} y2={56} stroke={fColor} strokeWidth={2} />
      {/* R_out from XOR */}
      <line x1={65} y1={66} x2={65} y2={80} stroke={rColor} strokeWidth={2} />
      <line x1={65} y1={80} x2={150} y2={80} stroke={rColor} strokeWidth={2} />
      {/* R straight to L_out */}
      <line x1={150} y1={47} x2={150} y2={80} stroke={rColor} strokeWidth={1} strokeDasharray="3,3" />
      <line x1={150} y1={80} x2={50} y2={80} stroke={lColor} strokeWidth={1} strokeDasharray="3,3" />
    </svg>
  );
}

// ── Phase explanations ────────────────────────────────────────────────────────
// Index 0 = initial plaintext split; indices 1–5 = phases 0–4 within each round
interface PhaseExplanation {
  heading: string;
  what: string;
  why: string;
  tip?: string;
}

const PHASE_EXPLANATIONS: PhaseExplanation[] = [
  {
    heading: 'Plaintext Split — L₀ and R₀',
    what: 'The 16-bit plaintext is divided down the middle: the high 8 bits become the Left half (L₀) and the low 8 bits become the Right half (R₀). These two halves will travel through the network separately, interacting at every round.',
    why: 'Splitting the block into two halves is the defining idea of a Feistel network. It means that each half acts as both data and a "temporary key" for the other half. This symmetric structure was invented by Horst Feistel at IBM in the 1970s and underlies DES, Blowfish, Twofish, and many others.',
    tip: 'Try swapping L₀ and R₀ (reverse the plaintext nibbles) and see whether the ciphertext is a simple mirror. It will not be — the asymmetric F-function and key schedule break any such symmetry.',
  },
  {
    heading: 'Round Inputs: L and R enter the round',
    what: 'At the start of each round, the current L and R halves are passed in. L will flow straight through without change this round — it only gets modified by the XOR with F(R,K) at the end. R enters the F-function.',
    why: 'The L half sitting idle is not wasted — it stores the "memory" of what the data looked like before the F-function was applied. This is what makes Feistel networks reversible: even if F itself is a one-way function, you can always undo the round by XORing L with F(R,K) again, because R is unchanged.',
    tip: 'Notice that at the start of every round the current R is identical to the L from the previous round after the swap. The data "leapfrogs" across the two halves — each side processes the other in alternating steps.',
  },
  {
    heading: 'F-Function Step 1: XOR with Round Key',
    what: 'The right half R is XORed (⊕) with the round key K. XOR flips every bit where the key bit is 1 and leaves it unchanged where the key bit is 0. This key-dependent mixing is the first step inside the F-function.',
    why: 'Mixing the data with the key at this point ties the output of every subsequent operation to the secret. Even if an attacker knows R, they cannot predict the XOR output without knowing K. The key schedule ensures each round uses a different subkey, so equal R values in different rounds produce different F outputs.',
    tip: 'XOR is its own inverse: (R ⊕ K) ⊕ K = R. This is why the Feistel construction is reversible during decryption — you simply apply the same subkeys in reverse order and XOR cancels itself out.',
  },
  {
    heading: 'F-Function Step 2: S-Box Substitution',
    what: 'The XOR result is split into two 4-bit nibbles. Each nibble is independently looked up in the S-box table to produce a different 4-bit value. The table is deliberately non-linear — small changes in the input cause large, unpredictable changes in the output.',
    why: 'This non-linearity provides confusion — hiding the relationship between the round key and the round output. Without it, the entire cipher could be broken with linear algebra (a technique called linear cryptanalysis). The S-box is where the cipher\'s security is concentrated. This is the same S-box used in the SPN visualizer, illustrating how both cipher families share fundamental building blocks.',
    tip: 'A single bit flip in the nibble input often flips 2–3 bits in the output. Good S-boxes are designed to satisfy the Strict Avalanche Criterion: flipping any one input bit changes each output bit with exactly 50% probability.',
  },
  {
    heading: 'XOR with L: Computing the New Right Half',
    what: 'The output of F(R, K) is XORed with the current left half L to produce the new right half R_out. In other words: new R = L ⊕ F(R, K). The new left half L_out will simply be the old R (the swap happens next).',
    why: 'This XOR is the heart of the Feistel security argument. Because R stays unchanged going into the next step, anyone who wants to reverse the round can compute F(R, K) again and XOR it away. The cipher does not need F to be mathematically invertible — it only needs XOR\'s self-inverse property.',
    tip: 'Try changing the plaintext by a single bit and note how many bits of the final R differ. After four rounds of S-box mixing and this XOR, even a one-bit change should cascade into roughly half of all output bits changing — the avalanche effect.',
  },
  {
    heading: 'Swap: L_out = old R, R_out = L ⊕ F(R, K)',
    what: 'After the XOR, the two halves swap roles: the unchanged old R becomes the new L, and the freshly computed XOR result becomes the new R. This swap feeds the round\'s output directly into the next round\'s input, and ensures every bit eventually passes through the F-function from both sides.',
    why: 'The swap is what makes the two halves alternate: in odd rounds L goes through F, in even rounds R does — or equivalently each round\'s R becomes the next round\'s L. After enough rounds, every output bit depends on every input bit and every key bit. Note: the very last round of real ciphers like DES omits the swap to keep encryption and decryption structurally identical.',
    tip: 'After all 4 rounds, assemble the ciphertext by concatenating the final L and R. Decryption uses the same circuit but applies the round keys in reverse order — no separate "inverse" circuit is needed, which is why Feistel networks are so practical to implement in hardware.',
  },
];

// ── Main Component ────────────────────────────────────────────────────────────
const FeistelApp: React.FC = () => {
  const [ptHex, setPtHex] = useState('ABCD');
  const [keyHex, setKeyHex] = useState('1234');
  const [ptError, setPtError] = useState('');
  const [keyError, setKeyError] = useState('');

  const [currentStep, setCurrentStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(800);
  const [showInfo, setShowInfo] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const ptVal = parseInt(ptHex, 16);
  const keyVal = parseInt(keyHex, 16);
  const validPt = /^[0-9A-Fa-f]{1,4}$/.test(ptHex);
  const validKey = /^[0-9A-Fa-f]{1,4}$/.test(keyHex);

  const rounds = (validPt && validKey)
    ? computeRounds(isNaN(ptVal) ? 0 : ptVal & 0xFFFF, isNaN(keyVal) ? 0 : keyVal & 0xFFFF)
    : Array.from({ length: 4 }, () => ({ L_in: 0, R_in: 0, roundKey: 0, xored: 0, F_out: 0, L_out: 0, R_out: 0 }));

  const roundKeys = validKey ? deriveRoundKeys(isNaN(keyVal) ? 0 : keyVal & 0xFFFF) : [0, 0, 0, 0];

  const { round: activeRound, phase: activePhase } = stepToRoundPhase(currentStep);

  const finalL = rounds[3]?.L_out ?? 0;
  const finalR = rounds[3]?.R_out ?? 0;
  const ciphertext = ((finalL << 8) | finalR) & 0xFFFF;

  const handlePtChange = (v: string) => {
    const clean = v.replace(/[^0-9A-Fa-f]/g, '').toUpperCase().slice(0, 4);
    setPtHex(clean);
    setPtError(clean.length === 0 ? 'Required' : '');
  };

  const handleKeyChange = (v: string) => {
    const clean = v.replace(/[^0-9A-Fa-f]/g, '').toUpperCase().slice(0, 4);
    setKeyHex(clean);
    setKeyError(clean.length === 0 ? 'Required' : '');
  };

  const reset = useCallback(() => {
    setPlaying(false);
    setCurrentStep(0);
  }, []);

  const stepForward = useCallback(() => {
    setCurrentStep(s => Math.min(s + 1, TOTAL_STEPS - 1));
  }, []);

  const stepBack = useCallback(() => {
    setCurrentStep(s => Math.max(s - 1, 0));
  }, []);

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setCurrentStep(s => {
          if (s >= TOTAL_STEPS - 1) { setPlaying(false); return TOTAL_STEPS - 1; }
          return s + 1;
        });
      }, speed);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, speed]);

  useEffect(() => { if (currentStep >= TOTAL_STEPS - 1) setPlaying(false); }, [currentStep]);
  useEffect(() => { reset(); }, [ptHex, keyHex, reset]);

  // Phase labels
  const phaseLabels = ['L/R Input', 'F: XOR Key', 'F: S-Box', 'XOR with L', 'Swap Output'];

  // Determine visibility of F-detail: only when round is active and phase >= 1
  const showFDetail = activeRound >= 1 && activeRound <= 4 && activePhase >= 1;
  const detailRoundIdx = activeRound - 1;

  return (
    <div className="flex-1 bg-[#1a1814] flex flex-col overflow-hidden">

      {/* ── TOP STRIP (always visible, no scroll) ─────────── */}
      <div className="bg-[#1a1814] border-b border-slate-800/60 px-8 pt-5 pb-4 flex-shrink-0">

        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-900/30 border border-amber-700/40">
              <Layers size={28} className="text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-amber-300 tracking-wide">FEISTEL NETWORK</h1>
              <p className="text-sm text-slate-400 mt-0.5">4-Round Feistel Cipher · 16-bit block · Interactive Step-through</p>
            </div>
          </div>
          <button onClick={() => setShowInfo(v => !v)}
            className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-amber-700/50 transition-colors flex-shrink-0">
            {showInfo ? <X size={20} className="text-amber-400" /> : <Info size={20} className="text-amber-400" />}
          </button>
        </div>

        {/* Collapsible info panel */}
        {showInfo && (
          <div className="bg-amber-950/20 border border-amber-900/40 rounded-xl p-6 space-y-3 text-sm text-slate-300 leading-relaxed mb-4">
            <h2 className="text-base font-bold text-amber-300">Feistel Network</h2>
            <p>A Feistel network splits a block into two halves (L and R). Each round applies a keyed function F to one half and XORs the result with the other half, then swaps them. After all rounds, the halves are concatenated to produce the ciphertext.</p>
            <p>The key insight: <strong className="text-white">F does not need to be invertible</strong> — decryption uses the same structure with round keys in reverse order. This design was used in <strong className="text-white">DES</strong>, Blowfish, and many other historic ciphers.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 font-mono text-xs">
              <div className="bg-amber-900/20 border border-amber-800/40 rounded-lg p-3">
                <div className="text-amber-400 font-bold mb-1">L half</div>
                <div className="text-slate-400">Passes through or becomes R_in of next round</div>
              </div>
              <div className="bg-cyan-900/20 border border-cyan-800/40 rounded-lg p-3">
                <div className="text-cyan-400 font-bold mb-1">R half</div>
                <div className="text-slate-400">Fed into F(R, K), output XORs with L</div>
              </div>
              <div className="bg-green-900/20 border border-green-800/40 rounded-lg p-3">
                <div className="text-green-400 font-bold mb-1">F function</div>
                <div className="text-slate-400">XOR with round key → S-box substitution</div>
              </div>
            </div>
          </div>
        )}

        {/* Combined inputs + controls row */}
        <div className="flex flex-wrap items-end gap-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Plaintext (4 hex)</label>
            <div className="flex items-center gap-2">
              <input value={ptHex} onChange={e => handlePtChange(e.target.value)}
                className={`bg-slate-900/80 border rounded-lg px-3 py-2 font-mono text-sm text-white focus:outline-none w-28 ${ptError ? 'border-red-600' : 'border-slate-700 focus:border-amber-700/50'}`}
                placeholder="ABCD" maxLength={4} />
              <button onClick={() => handlePtChange(randomHex(4))}
                className="p-2 rounded-lg bg-slate-800 border border-slate-700 hover:border-amber-600/50 transition-colors">
                <Shuffle size={14} className="text-slate-400" />
              </button>
            </div>
            {ptError && <span className="text-xs text-red-400">{ptError}</span>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Key (4 hex)</label>
            <div className="flex items-center gap-2">
              <input value={keyHex} onChange={e => handleKeyChange(e.target.value)}
                className={`bg-slate-900/80 border rounded-lg px-3 py-2 font-mono text-sm text-white focus:outline-none w-28 ${keyError ? 'border-red-600' : 'border-slate-700 focus:border-amber-700/50'}`}
                placeholder="1234" maxLength={4} />
              <button onClick={() => handleKeyChange(randomHex(4))}
                className="p-2 rounded-lg bg-slate-800 border border-slate-700 hover:border-amber-600/50 transition-colors">
                <Shuffle size={14} className="text-slate-400" />
              </button>
            </div>
            {keyError && <span className="text-xs text-red-400">{keyError}</span>}
          </div>
          {/* Vertical divider */}
          <div className="h-10 w-px bg-slate-700/60 self-center" />
          {/* Playback controls */}
          <div className="flex items-center gap-2">
            <button onClick={stepBack} disabled={currentStep === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40 transition-colors text-sm">
              <SkipBack size={14} /> Back
            </button>
            <button onClick={() => setPlaying(p => !p)} disabled={currentStep >= TOTAL_STEPS - 1 && !playing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600/20 border border-amber-700/50 text-amber-300 hover:bg-amber-600/30 disabled:opacity-40 transition-colors text-sm font-medium">
              {playing ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Play</>}
            </button>
            <button onClick={stepForward} disabled={currentStep >= TOTAL_STEPS - 1}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40 transition-colors text-sm">
              <SkipForward size={14} /> Next
            </button>
            <button onClick={reset}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors text-sm">
              <RotateCcw size={14} /> Reset
            </button>
          </div>
          {/* Step indicator */}
          <div className="flex flex-col gap-1 self-center">
            <div className="text-sm font-mono text-white">
              Step {currentStep} / {TOTAL_STEPS - 1}
              {activeRound >= 1 && activeRound <= 4 && (
                <span className="ml-2 text-amber-400 text-xs">Round {activeRound} · {phaseLabels[activePhase]}</span>
              )}
            </div>
            <div className="h-1.5 w-48 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500/70 rounded-full transition-all"
                style={{ width: `${(currentStep / (TOTAL_STEPS - 1)) * 100}%` }} />
            </div>
          </div>
          {/* Speed selector */}
          <div className="flex flex-col gap-1.5 ml-auto">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Speed</label>
            <div className="flex items-center gap-2">
              {([['Slow', 1200], ['Med', 700], ['Fast', 300]] as [string, number][]).map(([lbl, ms]) => (
                <button key={lbl} onClick={() => setSpeed(ms)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${speed === ms ? 'bg-amber-900/50 text-amber-300 border border-amber-700/50' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'}`}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN BODY (fills remaining height, no outer scroll) */}
      <div className="flex-1 overflow-hidden grid grid-cols-[1fr_460px] gap-5 p-6">

        {/* Left: Feistel Ladder */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-y-auto p-5 space-y-2">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Feistel Ladder</div>

              {/* Initial L/R */}
              <div className={`flex gap-4 items-start p-3 rounded-lg transition-all ${currentStep === 0 ? 'bg-slate-800/60 ring-2 ring-white/20' : ''}`}>
                <div className="flex-1">
                  <div className="text-xs font-bold text-amber-400 mb-1">L₀ (plaintext high byte)</div>
                  <div className="flex items-center gap-2">
                    <BitRow bits={to8Bits(rounds[0]?.L_in ?? 0)} color="bg-amber-900/70 border-amber-600 text-amber-200" />
                    <span className="font-mono text-xs text-amber-400">{toHex2(rounds[0]?.L_in ?? 0)}</span>
                  </div>
                </div>
                <div className="w-px self-stretch bg-slate-700" />
                <div className="flex-1">
                  <div className="text-xs font-bold text-cyan-400 mb-1">R₀ (plaintext low byte)</div>
                  <div className="flex items-center gap-2">
                    <BitRow bits={to8Bits(rounds[0]?.R_in ?? 0)} color="bg-cyan-900/70 border-cyan-600 text-cyan-200" />
                    <span className="font-mono text-xs text-cyan-400">{toHex2(rounds[0]?.R_in ?? 0)}</span>
                  </div>
                </div>
              </div>

              {/* Rounds */}
              {rounds.map((rnd, ri) => {
                const rNum = ri + 1;
                const isActive = activeRound === rNum;
                const isPast = activeRound > rNum || currentStep >= rNum * 5 + 5;
                const opacity = activeRound < rNum && currentStep < rNum * 5 ? 'opacity-40' : 'opacity-100';
                const phaseActive = isActive ? activePhase : -1;

                return (
                  <div key={ri} className={`border rounded-xl p-4 transition-all ${opacity} ${isActive ? 'border-amber-700/50 bg-amber-950/10 ring-1 ring-amber-600/20' : isPast ? 'border-slate-800 bg-slate-900/20' : 'border-slate-800/60'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`text-sm font-bold ${isActive ? 'text-amber-300' : 'text-slate-500'}`}>Round {rNum}</span>
                      {isActive && (
                        <span className="text-xs px-2 py-0.5 rounded bg-amber-900/40 border border-amber-700/40 text-amber-400 font-mono">
                          {phaseLabels[activePhase]}
                        </span>
                      )}
                      <span className="ml-auto font-mono text-xs text-slate-500">K{rNum} = {toHex2(rnd.roundKey)}</span>
                    </div>

                    {/* L_in / R_in row */}
                    <div className={`flex gap-4 items-start mb-2 p-2 rounded-lg transition-colors ${phaseActive === 0 ? 'bg-slate-800/60' : ''}`}>
                      <div className="flex-1">
                        <div className="text-[10px] text-amber-600 mb-1">L{ri} in</div>
                        <div className="flex items-center gap-1.5">
                          <BitRow bits={to8Bits(rnd.L_in)} color="bg-amber-900/70 border-amber-600 text-amber-200" dim={phaseActive > 0 && phaseActive !== -1} />
                          <span className="font-mono text-[10px] text-amber-500">{toHex2(rnd.L_in)}</span>
                        </div>
                      </div>
                      <div className="w-px self-stretch bg-slate-700/50" />
                      <div className="flex-1">
                        <div className="text-[10px] text-cyan-600 mb-1">R{ri} in</div>
                        <div className="flex items-center gap-1.5">
                          <BitRow bits={to8Bits(rnd.R_in)} color="bg-cyan-900/70 border-cyan-600 text-cyan-200" dim={phaseActive > 0 && phaseActive !== -1} />
                          <span className="font-mono text-[10px] text-cyan-500">{toHex2(rnd.R_in)}</span>
                        </div>
                      </div>
                    </div>

                    {/* F function summary */}
                    <div className={`ml-4 pl-3 border-l-2 border-cyan-800/40 space-y-1.5 text-xs font-mono`}>
                      <div className={`flex items-center gap-2 p-1.5 rounded transition-colors ${phaseActive === 1 ? 'bg-cyan-950/40 ring-1 ring-cyan-700/30' : ''}`}>
                        <span className="text-slate-500 w-20">R ⊕ K{rNum}</span>
                        <span className="text-cyan-400">{toHex2(rnd.R_in)}</span>
                        <span className="text-slate-600">⊕</span>
                        <span className="text-violet-400">{toHex2(rnd.roundKey)}</span>
                        <span className="text-slate-600">=</span>
                        <span className="text-white">{toHex2(rnd.xored)}</span>
                        <div className="flex gap-0.5 ml-1">
                          {to8Bits(rnd.xored).map((b, i) => (
                            <span key={i} className={b ? 'text-white' : 'text-slate-700'}>{b}</span>
                          ))}
                        </div>
                      </div>
                      <div className={`flex items-center gap-2 p-1.5 rounded transition-colors ${phaseActive === 2 ? 'bg-green-950/40 ring-1 ring-green-700/30' : ''}`}>
                        <span className="text-slate-500 w-20">SBox({toHex2(rnd.xored)})</span>
                        <span className="text-slate-600">=</span>
                        <span className="text-green-300 font-bold">{toHex2(rnd.F_out)}</span>
                        <div className="flex gap-0.5 ml-1">
                          {to8Bits(rnd.F_out).map((b, i) => (
                            <span key={i} className={b ? 'text-green-300' : 'text-slate-700'}>{b}</span>
                          ))}
                        </div>
                      </div>
                      <div className={`flex items-center gap-2 p-1.5 rounded transition-colors ${phaseActive === 3 ? 'bg-amber-950/40 ring-1 ring-amber-700/30' : ''}`}>
                        <span className="text-slate-500 w-20">L ⊕ F</span>
                        <span className="text-amber-400">{toHex2(rnd.L_in)}</span>
                        <span className="text-slate-600">⊕</span>
                        <span className="text-green-400">{toHex2(rnd.F_out)}</span>
                        <span className="text-slate-600">=</span>
                        <span className="text-cyan-300 font-bold">{toHex2(rnd.R_out)}</span>
                      </div>
                    </div>

                    {/* Swap output row */}
                    <div className={`flex gap-4 items-start mt-2 p-2 rounded-lg transition-colors ${phaseActive === 4 ? 'bg-slate-800/60 ring-1 ring-white/10' : ''}`}>
                      <div className="flex-1">
                        <div className="text-[10px] text-amber-600 mb-1">L{ri + 1} out (= R{ri})</div>
                        <div className="flex items-center gap-1.5">
                          <BitRow bits={to8Bits(rnd.L_out)} color="bg-amber-900/70 border-amber-600 text-amber-200" />
                          <span className="font-mono text-[10px] text-amber-500">{toHex2(rnd.L_out)}</span>
                        </div>
                      </div>
                      <div className="w-px self-stretch bg-slate-700/50" />
                      <div className="flex-1">
                        <div className="text-[10px] text-cyan-600 mb-1">R{ri + 1} out (= L ⊕ F)</div>
                        <div className="flex items-center gap-1.5">
                          <BitRow bits={to8Bits(rnd.R_out)} color="bg-cyan-900/70 border-cyan-600 text-cyan-200" />
                          <span className="font-mono text-[10px] text-cyan-500">{toHex2(rnd.R_out)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Final ciphertext */}
              <div className={`flex gap-4 items-start p-3 rounded-lg transition-all ${currentStep >= TOTAL_STEPS - 1 ? 'bg-slate-800/60 ring-2 ring-cyan-600/20' : 'opacity-40'}`}>
                <div className="flex-1">
                  <div className="text-xs font-bold text-amber-400 mb-1">Ciphertext high byte</div>
                  <div className="flex items-center gap-2">
                    <BitRow bits={to8Bits(finalL)} color="bg-amber-900/70 border-amber-600 text-amber-200" />
                    <span className="font-mono text-xs text-amber-400">{toHex2(finalL)}</span>
                  </div>
                </div>
                <div className="w-px self-stretch bg-slate-700" />
                <div className="flex-1">
                  <div className="text-xs font-bold text-cyan-400 mb-1">Ciphertext low byte</div>
                  <div className="flex items-center gap-2">
                    <BitRow bits={to8Bits(finalR)} color="bg-cyan-900/70 border-cyan-600 text-cyan-200" />
                    <span className="font-mono text-xs text-cyan-400">{toHex2(finalR)}</span>
                  </div>
                </div>
                <div className="flex flex-col justify-center ml-4">
                  <div className="text-[10px] text-slate-500 mb-1">Ciphertext</div>
                  <div className="font-mono text-lg font-bold text-white">{toHex4(ciphertext)}</div>
                </div>
              </div>

        </div>

        {/* Right: Detail Panel */}
        <div className="overflow-y-auto space-y-4 pr-1">

              {/* F-function detail */}
              {showFDetail && detailRoundIdx >= 0 && detailRoundIdx < 4 && (
                <div className="bg-slate-900/60 border border-green-900/40 rounded-xl p-5">
                  <div className="text-xs font-bold text-green-400 uppercase tracking-wider mb-3">
                    F Function · Round {detailRoundIdx + 1}
                  </div>
                  <div className="space-y-3 font-mono text-xs">
                    {/* R input */}
                    <div className={`p-2 rounded-lg transition-colors ${activePhase === 0 ? 'bg-cyan-950/40 ring-1 ring-cyan-700/30' : ''}`}>
                      <div className="text-[10px] text-slate-500 mb-1">1. R input</div>
                      <div className="flex items-center gap-2">
                        <BitRow bits={to8Bits(rounds[detailRoundIdx].R_in)} color="bg-cyan-900/70 border-cyan-600 text-cyan-200" />
                        <span className="text-cyan-400">{toHex2(rounds[detailRoundIdx].R_in)}</span>
                      </div>
                    </div>
                    {/* Round key */}
                    <div className={`p-2 rounded-lg transition-colors ${activePhase === 1 ? 'bg-violet-950/40 ring-1 ring-violet-700/30' : ''}`}>
                      <div className="text-[10px] text-slate-500 mb-1">2. Round key K{detailRoundIdx + 1}</div>
                      <div className="flex items-center gap-2">
                        <BitRow bits={to8Bits(rounds[detailRoundIdx].roundKey)} color="bg-violet-900/70 border-violet-600 text-violet-200" />
                        <span className="text-violet-400">{toHex2(rounds[detailRoundIdx].roundKey)}</span>
                      </div>
                    </div>
                    {/* XOR result */}
                    <div className={`p-2 rounded-lg transition-colors ${activePhase === 1 ? 'bg-slate-800/60' : ''}`}>
                      <div className="text-[10px] text-slate-500 mb-1">3. XOR result</div>
                      <div className="flex items-center gap-2">
                        <BitRow bits={to8Bits(rounds[detailRoundIdx].xored)} color="bg-slate-700 border-slate-500 text-white" />
                        <span className="text-white">{toHex2(rounds[detailRoundIdx].xored)}</span>
                      </div>
                    </div>
                    {/* S-box nibbles */}
                    <div className={`p-2 rounded-lg transition-colors ${activePhase === 2 ? 'bg-green-950/40 ring-1 ring-green-700/30' : ''}`}>
                      <div className="text-[10px] text-slate-500 mb-2">4. S-box (two nibbles)</div>
                      {[0, 1].map(n => {
                        const inNib = n === 0 ? (rounds[detailRoundIdx].xored >> 4) & 0xF : rounds[detailRoundIdx].xored & 0xF;
                        const outNib = n === 0 ? (rounds[detailRoundIdx].F_out >> 4) & 0xF : rounds[detailRoundIdx].F_out & 0xF;
                        return (
                          <div key={n} className="flex items-center gap-1.5 mb-1">
                            <span className={`text-[10px] ${n === 0 ? 'text-amber-400' : 'text-sky-400'}`}>N{n}:</span>
                            <span className="text-slate-400">{inNib.toString(16).toUpperCase()}</span>
                            <span className="text-slate-600">→</span>
                            <span className="text-green-400">{outNib.toString(16).toUpperCase()}</span>
                            <div className="flex gap-0.5 ml-1">
                              {Array.from({ length: 4 }, (_, i) => (outNib >> (3 - i)) & 1).map((b, i) => (
                                <span key={i} className={b ? 'text-green-300' : 'text-slate-700'}>{b}</span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* F output */}
                    <div className={`p-2 rounded-lg transition-colors ${activePhase === 3 || activePhase === 4 ? 'bg-green-950/40 ring-1 ring-green-700/30' : ''}`}>
                      <div className="text-[10px] text-slate-500 mb-1">5. F output</div>
                      <div className="flex items-center gap-2">
                        <BitRow bits={to8Bits(rounds[detailRoundIdx].F_out)} color="bg-green-900/70 border-green-600 text-green-200" />
                        <span className="text-green-400 font-bold">{toHex2(rounds[detailRoundIdx].F_out)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SVG diagram of current round */}
              {activeRound >= 1 && activeRound <= 4 && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Round Structure</div>
                  <RoundSVG active={true} />
                  <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] font-mono">
                    <div className="flex items-center gap-1"><span className="w-3 h-0.5 bg-amber-500 inline-block" /> L path</div>
                    <div className="flex items-center gap-1"><span className="w-3 h-0.5 bg-cyan-500 inline-block" /> R path</div>
                    <div className="flex items-center gap-1"><span className="w-3 h-0.5 bg-green-500 inline-block" /> F(R,K)</div>
                  </div>
                </div>
              )}

              {/* Key Schedule */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Key Schedule</div>
                <div className="font-mono text-xs space-y-2">
                  {/* Master key */}
                  <div className="mb-3">
                    <div className="text-slate-500 mb-1">Master key (16-bit)</div>
                    <div className="flex gap-0.5 flex-wrap">
                      {Array.from({ length: 16 }, (_, i) => {
                        const kv = isNaN(keyVal) ? 0 : keyVal & 0xFFFF;
                        const bit = (kv >> (15 - i)) & 1;
                        return (
                          <span key={i} className={`${bit ? 'text-violet-300' : 'text-slate-700'}${i > 0 && i % 4 === 0 ? ' ml-0.5' : ''}`}>{bit}</span>
                        );
                      })}
                    </div>
                    <div className="text-violet-400 mt-1">{keyHex.padStart(4, '0').toUpperCase()}</div>
                  </div>

                  {/* Sliding window visualization */}
                  <div className="text-slate-500 mb-1">Sliding 8-bit windows</div>
                  {roundKeys.map((rk, ki) => {
                    const isUsed = activeRound === ki + 1;
                    const windowLabels = ['bits 15–8', 'bits 11–4', 'bits 7–0', 'bits 15–8 rotL2'];
                    return (
                      <div key={ki} className={`rounded-lg px-2 py-1.5 transition-colors ${isUsed ? 'bg-amber-900/30 ring-1 ring-amber-600/40' : 'bg-slate-800/30'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={isUsed ? 'text-amber-300 font-bold' : 'text-slate-500'}>K{ki + 1}</span>
                          <span className="text-slate-600 text-[10px]">({windowLabels[ki]})</span>
                          <span className={`ml-auto ${isUsed ? 'text-amber-200' : 'text-slate-500'}`}>{toHex2(rk)}</span>
                        </div>
                        <div className="flex gap-0.5">
                          {to8Bits(rk).map((b, i) => (
                            <span key={i} className={b ? (isUsed ? 'text-amber-300' : 'text-slate-400') : 'text-slate-700'}>{b}</span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step Explanation Card */}
              {(() => {
                const expIdx = currentStep === 0 ? 0 : activePhase + 1;
                const exp = PHASE_EXPLANATIONS[expIdx];
                const isInitial = currentStep === 0;
                const borderClass = isInitial         ? 'bg-amber-950/20 border-amber-900/40' :
                                    activePhase === 0 ? 'bg-slate-800/40 border-slate-700/40' :
                                    activePhase === 1 ? 'bg-violet-950/20 border-violet-900/40' :
                                    activePhase === 2 ? 'bg-green-950/20 border-green-900/40' :
                                    activePhase === 3 ? 'bg-amber-950/20 border-amber-900/40' :
                                                        'bg-cyan-950/20 border-cyan-900/40';
                const headClass = isInitial         ? 'text-amber-400' :
                                   activePhase === 0 ? 'text-slate-400' :
                                   activePhase === 1 ? 'text-violet-400' :
                                   activePhase === 2 ? 'text-green-400' :
                                   activePhase === 3 ? 'text-amber-400' :
                                                       'text-cyan-400';
                return (
                  <div className={`rounded-xl border p-5 space-y-3 ${borderClass}`}>
                    <div className={`text-xs font-bold uppercase tracking-wider ${headClass}`}>{exp.heading}</div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">What is happening</div>
                      <p className="text-sm text-slate-300 leading-relaxed">{exp.what}</p>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Why we do this</div>
                      <p className="text-sm text-slate-400 leading-relaxed">{exp.why}</p>
                    </div>
                    {exp.tip && (
                      <div className="bg-slate-900/60 rounded-lg px-3 py-2 border border-slate-700/60">
                        <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Tip: </span>
                        <span className="text-xs text-slate-400">{exp.tip}</span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Summary box */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Encryption Summary</div>
                <div className="font-mono text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Plaintext:</span>
                    <span className="text-amber-300">{toHex4(isNaN(ptVal) ? 0 : ptVal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Key:</span>
                    <span className="text-violet-300">{keyHex.padStart(4, '0').toUpperCase()}</span>
                  </div>
                  <div className="border-t border-slate-700 pt-1.5 flex justify-between">
                    <span className="text-slate-500">Ciphertext:</span>
                    <span className="text-cyan-300 font-bold">{toHex4(ciphertext)}</span>
                  </div>
                </div>
              </div>

        </div>
      </div>
    </div>
  );
};

export default FeistelApp;
