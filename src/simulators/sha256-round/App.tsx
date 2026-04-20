import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Info, X, Play, Pause, SkipBack, SkipForward, RotateCcw, Hash, Shuffle } from 'lucide-react';

// ── SHA-256 constants ─────────────────────────────────────────────────────────
const K: number[] = [
  0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
  0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
  0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
  0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
  0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
  0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
  0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
  0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2,
];

const IV: number[] = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
  0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
];

const VAR_LABELS = ['a','b','c','d','e','f','g','h'];

// ── Low-level helpers ─────────────────────────────────────────────────────────
function rotr32(x: number, n: number): number { return ((x >>> n) | (x << (32 - n))) >>> 0; }
function add32(...vals: number[]): number { return vals.reduce((a, b) => (a + b) >>> 0, 0); }
function h32(n: number): string { return (n >>> 0).toString(16).padStart(8, '0'); }
function h8(n: number): string  { return (n >>> 0).toString(16).padStart(8, '0'); }

// ── SHA-256 message schedule ──────────────────────────────────────────────────
function buildMessageSchedule(block: Uint8Array): number[] {
  const W = new Array(64).fill(0);
  const dv = new DataView(block.buffer, block.byteOffset, 64);
  for (let i = 0; i < 16; i++) W[i] = dv.getUint32(i * 4, false);
  for (let i = 16; i < 64; i++) {
    const s0 = rotr32(W[i-15], 7) ^ rotr32(W[i-15], 18) ^ (W[i-15] >>> 3);
    const s1 = rotr32(W[i-2], 17) ^ rotr32(W[i-2], 19) ^ (W[i-2] >>> 10);
    W[i] = add32(W[i-16], s0, W[i-7], s1);
  }
  return W;
}

// ── Padding ───────────────────────────────────────────────────────────────────
function padMessage(msg: string): Uint8Array {
  const data = new TextEncoder().encode(msg);
  const bitLen = data.length * 8;
  const padLen = (55 - data.length % 64 + 64) % 64;
  const padded = new Uint8Array(data.length + 1 + padLen + 8);
  padded.set(data);
  padded[data.length] = 0x80;
  const dv = new DataView(padded.buffer);
  dv.setUint32(padded.length - 4, bitLen >>> 0, false);
  return padded;
}

// ── Stage types ───────────────────────────────────────────────────────────────
type StageType = 'initial' | 'round' | 'final';

interface RoundDetail {
  round: number;
  W: number; K: number;
  S1: number; Ch: number; T1: number;
  S0: number; Maj: number; T2: number;
  inputState: number[]; // [a,b,c,d,e,f,g,h] before this round
}

interface SHA256Stage {
  type: StageType;
  label: string;
  state: number[]; // [a,b,c,d,e,f,g,h]
  prevState?: number[];
  detail?: RoundDetail;
}

// ── Compute all 66 stages ─────────────────────────────────────────────────────
// Stage 0: initial IV [a=H0,b=H1,...,h=H7]
// Stages 1-64: after each compression round
// Stage 65: after Davies-Meyer addition = final hash words
function computeStages(msg: string): { stages: SHA256Stage[]; schedule: number[]; paddedHex: string; hash: string } {
  const padded = padMessage(msg);
  const block = padded.slice(0, 64);
  const W = buildMessageSchedule(block);

  const stages: SHA256Stage[] = [];

  // Initial state
  let [a, b, c, d, e, f, g, h] = IV;
  stages.push({
    type: 'initial',
    label: 'Initial State (IV)',
    state: [a, b, c, d, e, f, g, h],
  });

  // 64 compression rounds
  for (let i = 0; i < 64; i++) {
    const prevState = [a, b, c, d, e, f, g, h];
    const S1   = rotr32(e, 6) ^ rotr32(e, 11) ^ rotr32(e, 25);
    const Ch   = (e & f) ^ (~e & g) >>> 0;
    const T1   = add32(h, S1, (e & f) ^ ((~e >>> 0) & g), K[i], W[i]);
    const S0   = rotr32(a, 2) ^ rotr32(a, 13) ^ rotr32(a, 22);
    const Maj  = (a & b) ^ (a & c) ^ (b & c);
    const T2   = add32(S0, Maj);

    h = g; g = f; f = e; e = add32(d, T1);
    d = c; c = b; b = a; a = add32(T1, T2);

    stages.push({
      type: 'round',
      label: `Round ${i}`,
      state: [a, b, c, d, e, f, g, h],
      prevState,
      detail: {
        round: i,
        W: W[i], K: K[i],
        S1, Ch: (prevState[4] & prevState[5]) ^ ((~prevState[4] >>> 0) & prevState[6]),
        T1, S0, Maj, T2,
        inputState: prevState,
      },
    });
  }

  // Davies-Meyer feed-forward
  const finalState = [
    add32(IV[0], a), add32(IV[1], b), add32(IV[2], c), add32(IV[3], d),
    add32(IV[4], e), add32(IV[5], f), add32(IV[6], g), add32(IV[7], h),
  ];
  stages.push({
    type: 'final',
    label: 'Davies-Meyer + Final Hash',
    state: finalState,
    prevState: [a, b, c, d, e, f, g, h],
  });

  // Final hash string
  const hash = finalState.map(h8).join('');

  // Padded hex (for display)
  const paddedHex = Array.from(padded).map(b => b.toString(16).padStart(2, '0')).join('');

  return { stages, schedule: W, paddedHex, hash };
}

// ── Avalanche: compare round-by-round states of two inputs ────────────────────
function computeAvalanche(msgA: string, msgB: string): { diffBits: number[]; hashA: string; hashB: string } {
  const a = computeStages(msgA);
  const b = computeStages(msgB);
  const diffBits = a.stages.map((stA, i) => {
    const stB = b.stages[i];
    let bits = 0;
    stA.state.forEach((w, j) => {
      let v = (w ^ stB.state[j]) >>> 0;
      while (v) { bits += v & 1; v >>>= 1; }
    });
    return bits;
  });
  return { diffBits, hashA: a.hash, hashB: b.hash };
}

// ── Color scheme ──────────────────────────────────────────────────────────────
// a,e = truly new values per round; b-d, f-h = shifts of previous vars
const VAR_COLORS_NEW  = 'bg-amber-900/60 border-amber-600 text-amber-200';
const VAR_COLORS_SHIFT = 'bg-slate-800/60 border-slate-700 text-slate-400';
const VAR_COLORS_INIT  = 'bg-violet-900/60 border-violet-600 text-violet-200';
const VAR_COLORS_FINAL = 'bg-cyan-900/60 border-cyan-600 text-cyan-200';
const VAR_LABEL_COLORS = ['text-amber-400','text-slate-500','text-slate-500','text-slate-500','text-amber-400','text-slate-500','text-slate-500','text-slate-500'];

function varCellClass(type: StageType, idx: number, _changed: boolean): string {
  if (type === 'initial') return VAR_COLORS_INIT;
  if (type === 'final')   return VAR_COLORS_FINAL;
  // In round stages, a (idx=0) and e (idx=4) are new; rest are shifts
  return (idx === 0 || idx === 4) ? VAR_COLORS_NEW : VAR_COLORS_SHIFT;
}

// ── Explanation text ──────────────────────────────────────────────────────────
interface Explanation { heading: string; what: string; why: string; tip?: string; }

function getExplanation(stage: SHA256Stage): Explanation {
  if (stage.type === 'initial') return {
    heading: 'Initial Hash Values (IV)',
    what: 'The eight 32-bit working variables a–h are initialised with SHA-256\'s eight Initialization Vectors — the fractional parts of the square roots of the first eight prime numbers (2, 3, 5, 7, 11, 13, 17, 19). These constants are defined in the FIPS 180-4 standard.',
    why: 'These initial values are a "nothing-up-my-sleeve" number selection: they are determined by a simple, publicly verifiable formula, proving they were not chosen to hide a trapdoor. Starting from a known fixed state makes every SHA-256 computation deterministic and independently verifiable.',
    tip: 'H0 = fractional part of √2. H1 = fractional part of √3. H2 = fractional part of √5. And so on through √19. The 64 round constants K[i] use the same approach, but with cube roots of the first 64 primes.',
  };

  if (stage.type === 'final') return {
    heading: 'Davies-Meyer Feed-Forward  →  Final Hash',
    what: 'After all 64 rounds, each working variable a–h is added (mod 2³²) to the corresponding initial hash value H0–H7. This feed-forward step — named after the Davies-Meyer hash construction — produces the final eight 32-bit words that form the 256-bit hash.',
    why: 'Without the feed-forward addition, the compression function would not be collision-resistant: an attacker could invert the rounds and derive inputs that produce any desired output. Adding the IV back in makes this one-way. It also means the initial hash values contribute to the output, which is why changing them (as SHA-224 does) produces a completely different hash function.',
    tip: 'For messages longer than 55 bytes (requiring more than one 512-bit block), the final hash of block N becomes the input IV for block N+1. That chaining is the Merkle-Damgård construction — the same principle used in MD5 and SHA-1.',
  };

  // Round stage
  const r = stage.detail!.round;
  return {
    heading: `Round ${r} — SHA-256 Compression`,
    what: `This round computes two new values: Temp₁ = h + Σ₁(e) + Ch(e,f,g) + K[${r}] + W[${r}], and Temp₂ = Σ₀(a) + Maj(a,b,c). The new 'a' = Temp₁ + Temp₂ and the new 'e' = d + Temp₁. The other six variables simply shift: b←a, c←b, d←c (unchanged d), f←e, g←f, h←g.`,
    why: `Every round injects one word of the message schedule W[${r}] and one round constant K[${r}] into the state. Σ₁ and Σ₀ are rotational mixing functions — they spread each bit change across the 32-bit word. Ch ("choose") selects bits from f or g based on e, adding bit-level conditional non-linearity. Maj ("majority") votes on the most common bit among a, b, c. After 64 rounds, every output bit depends on every bit of the original message block.`,
    tip: r < 4
      ? `The first few rounds inject W[0]–W[3], which come directly from the message bytes. From W[16] onward, the message schedule mixes earlier words using σ₀ and σ₁ rotations, amplifying any input difference exponentially.`
      : r >= 60
      ? `By round ${r}, the mixing is nearly complete. Even a 1-bit change in any message byte has spread to all 256 bits of the working state. The next step — the Davies-Meyer feed-forward — locks this in as the final hash.`
      : undefined,
  };
}

// ── Mini state bar (pipeline row) ─────────────────────────────────────────────
function MiniStateBar({ stage }: { stage: SHA256Stage }) {
  return (
    <div className="flex gap-[2px] flex-1 justify-center">
      {stage.state.map((val, i) => (
        <div key={i} className="flex flex-col items-center gap-[1px]">
          <span className={`text-[7px] font-bold ${VAR_LABEL_COLORS[i]}`}>{VAR_LABELS[i]}</span>
          <div className={`w-[52px] h-[13px] flex items-center justify-center text-[7px] font-mono font-bold rounded-[2px] border ${varCellClass(stage.type, i, false)}`}>
            {h32(val).slice(0, 8)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Full state grid (detail panel) ────────────────────────────────────────────
function FullStateGrid({ stage, label }: { stage: SHA256Stage; label: string }) {
  return (
    <div>
      {label && <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{label}</div>}
      <div className="grid grid-cols-4 gap-1.5">
        {stage.state.map((val, i) => (
          <div key={i} className={`px-2 py-1.5 rounded border text-center ${varCellClass(stage.type, i, false)}`}>
            <div className={`text-[9px] font-bold mb-0.5 ${VAR_LABEL_COLORS[i]}`}>{VAR_LABELS[i]}</div>
            <div className="font-mono text-xs">{h32(val)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
const SHA256RoundApp: React.FC = () => {
  const [msg, setMsg]     = useState('abc');
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed]     = useState(400);
  const [showInfo, setShowInfo]         = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [mode, setMode] = useState<'stepthrough' | 'avalanche'>('stepthrough');
  const [avaA, setAvaA] = useState('abc');
  const [avaB, setAvaB] = useState('abd');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { stages, schedule, paddedHex, hash } = useMemo(() => computeStages(msg), [msg]);
  const ava = useMemo(() => computeAvalanche(avaA, avaB), [avaA, avaB]);

  const totalStages = stages.length; // 66
  const currentStage = stages[stage] ?? stages[0];

  const reset = useCallback(() => { setPlaying(false); setStage(0); }, []);
  const stepFwd = useCallback(() => setStage(s => Math.min(s + 1, totalStages - 1)), [totalStages]);
  const stepBck = useCallback(() => setStage(s => Math.max(s - 1, 0)), []);

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setStage(s => {
          if (s >= totalStages - 1) { setPlaying(false); return s; }
          return s + 1;
        });
      }, speed);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, speed, totalStages]);

  useEffect(() => { if (stage >= totalStages - 1) setPlaying(false); }, [stage, totalStages]);
  useEffect(() => { reset(); }, [msg, reset]);

  const expl = getExplanation(currentStage);

  // For avalanche bit diff visualization of the final hash
  const finalHashA = ava.hashA;
  const finalHashB = ava.hashB;
  const hashBitDiff: boolean[] = Array.from({ length: 64 }, (_, i) => {
    const a = parseInt(finalHashA[i] ?? '0', 16);
    const b = parseInt(finalHashB[i] ?? '0', 16);
    const diff = a ^ b;
    return [3, 2, 1, 0].map(bit => !!((diff >> bit) & 1));
  }).flat();
  const hashBitDiffCount = hashBitDiff.filter(Boolean).length;

  return (
    <div className="flex-1 bg-[#0d1117] flex flex-col overflow-hidden">

      {/* ── TOP STRIP ──────────────────────────────────────────────────────── */}
      <div className="bg-[#0d1117] border-b border-slate-800/60 px-8 pt-5 pb-4 flex-shrink-0">

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-cyan-900/30 border border-cyan-700/40">
              <Hash size={28} className="text-cyan-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-cyan-300 tracking-wide">SHA-256 ROUND VISUALIZER</h1>
              <p className="text-sm text-slate-400 mt-0.5">Merkle-Damgård Construction · 64-Round Compression Function</p>
            </div>
          </div>
          <button onClick={() => setShowInfo(v => !v)}
            className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-cyan-700/50 transition-colors flex-shrink-0">
            {showInfo ? <X size={20} className="text-cyan-400" /> : <Info size={20} className="text-cyan-400" />}
          </button>
        </div>

        {showInfo && (
          <div className="bg-cyan-950/20 border border-cyan-900/40 rounded-xl p-6 space-y-3 text-sm text-slate-300 leading-relaxed mb-4">
            <h2 className="text-base font-bold text-cyan-300">SHA-256 — How the Compression Function Works</h2>
            <p>SHA-256 processes messages in 512-bit blocks through a Merkle-Damgård construction. Each block is compressed via 64 rounds. Every round takes a 256-bit working state <strong className="text-white">[a, b, c, d, e, f, g, h]</strong> and one word of the message schedule W[i], producing a new 256-bit state. After all 64 rounds, the output is added (mod 2³²) back to the initial values — the Davies-Meyer feed-forward.</p>
            <p>Each round injects non-linearity through <strong className="text-white">Ch(e,f,g)</strong> (conditional bit selection) and <strong className="text-white">Maj(a,b,c)</strong> (majority vote), and diffusion through the rotation functions <strong className="text-white">Σ₀(a)</strong> and <strong className="text-white">Σ₁(e)</strong>. The 64 round constants K[i] are the fractional parts of the cube roots of the first 64 primes.</p>
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[
                { label: 'Initial IV',     color: 'bg-violet-900/40 text-violet-400 border border-violet-700/40' },
                { label: 'Round (×64)',    color: 'bg-amber-900/40 text-amber-400 border border-amber-700/40' },
                { label: 'Final Hash',     color: 'bg-cyan-900/40 text-cyan-400 border border-cyan-700/40' },
              ].map(({ label, color }) => (
                <div key={label} className={`px-3 py-2 rounded-lg text-xs font-mono text-center ${color}`}>{label}</div>
              ))}
            </div>
          </div>
        )}

        {/* Controls row */}
        <div className="flex flex-wrap items-end gap-5">
          {/* Message input */}
          {mode === 'stepthrough' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Message</label>
              <div className="flex items-center gap-2">
                <input value={msg} onChange={e => setMsg(e.target.value)}
                  className="bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2 font-mono text-sm text-white focus:outline-none focus:border-cyan-700/50 w-60"
                  placeholder="abc" />
                <button onClick={() => {
                  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
                  setMsg(Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''));
                }}
                  className="p-2 rounded-lg bg-slate-800 border border-slate-700 hover:border-cyan-600/50 transition-colors">
                  <Shuffle size={14} className="text-slate-400" />
                </button>
              </div>
              <div className="text-[10px] text-slate-600 font-mono">
                {new TextEncoder().encode(msg).length} bytes → {paddedHex.length / 2} bytes padded · hash: <span className="text-cyan-500">{hash.slice(0, 16)}…</span>
              </div>
            </div>
          )}

          {/* Mode toggle */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mode</label>
            <div className="flex items-center gap-1">
              <button onClick={() => setMode('stepthrough')}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${mode === 'stepthrough' ? 'bg-cyan-900/50 text-cyan-200 border border-cyan-600/60' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'}`}>
                Step-Through
              </button>
              <button onClick={() => setMode('avalanche')}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${mode === 'avalanche' ? 'bg-orange-900/50 text-orange-200 border border-orange-600/60' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'}`}>
                Avalanche
              </button>
            </div>
          </div>

          {mode === 'avalanche' && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Message A</label>
                <input value={avaA} onChange={e => setAvaA(e.target.value)}
                  className="bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2 font-mono text-sm text-white focus:outline-none focus:border-cyan-700/50 w-40" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Message B</label>
                <input value={avaB} onChange={e => setAvaB(e.target.value)}
                  className="bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2 font-mono text-sm text-white focus:outline-none focus:border-cyan-700/50 w-40" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Presets</label>
                <div className="flex items-center gap-1 flex-wrap">
                  {[{ label:'1 char', a:'abc', b:'abd' }, { label:'case', a:'hello', b:'Hello' }, { label:'+space', a:'test', b:'test ' }, { label:'empty/a', a:'', b:'a' }].map(p => (
                    <button key={p.label} onClick={() => { setAvaA(p.a); setAvaB(p.b); }}
                      className="px-2 py-1.5 rounded text-xs bg-slate-800 border border-slate-700 text-slate-400 hover:text-orange-300 hover:border-orange-700 transition-colors">
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {mode === 'stepthrough' && (
            <>
              <div className="h-10 w-px bg-slate-700/60 self-center" />
              <div className="flex items-center gap-2">
                <button onClick={stepBck} disabled={stage === 0}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40 transition-colors text-sm">
                  <SkipBack size={14} /> Back
                </button>
                <button onClick={() => setPlaying(p => !p)} disabled={stage >= totalStages - 1 && !playing}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-600/20 border border-cyan-700/50 text-cyan-300 hover:bg-cyan-600/30 disabled:opacity-40 transition-colors text-sm font-medium">
                  {playing ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Play</>}
                </button>
                <button onClick={stepFwd} disabled={stage >= totalStages - 1}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40 transition-colors text-sm">
                  <SkipForward size={14} /> Next
                </button>
                <button onClick={reset}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors text-sm">
                  <RotateCcw size={14} /> Reset
                </button>
              </div>
              <div className="flex flex-col gap-1 self-center">
                <span className="text-xs font-mono text-slate-400">Stage {stage + 1} / {totalStages}</span>
                <span className="text-[10px] font-mono text-slate-500">{currentStage.label}</span>
              </div>
              <div className="flex flex-col gap-1.5 ml-auto">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Speed</label>
                <div className="flex items-center gap-2">
                  {([['Slow', 900], ['Med', 400], ['Fast', 150]] as [string, number][]).map(([lbl, ms]) => (
                    <button key={lbl} onClick={() => setSpeed(ms)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${speed === ms ? 'bg-cyan-900/50 text-cyan-300 border border-cyan-700/50' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'}`}>
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── AVALANCHE BODY ──────────────────────────────────────────────────── */}
      {mode === 'avalanche' && (
        <div className="flex-1 overflow-hidden grid grid-cols-[minmax(380px,1fr)_520px] gap-5 p-6">

          {/* Left: round-by-round state diff chart */}
          <div className="bg-slate-900/60 border border-orange-900/30 rounded-xl overflow-y-auto p-5">
            <div className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-1">Round-by-Round State Divergence</div>
            <div className="text-[10px] text-slate-500 mb-4">
              Bits differing in [a,b,c,d,e,f,g,h] across all 66 stages (out of 256 total)
            </div>
            <div className="space-y-0.5">
              {stages.map((st, idx) => {
                const diff = ava.diffBits[idx] ?? 0;
                const pct  = (diff / 256) * 100;
                const barColor = diff === 0  ? 'bg-slate-700' :
                                 diff <= 32  ? 'bg-yellow-500/70' :
                                 diff <= 96  ? 'bg-orange-500/70' : 'bg-red-500/70';
                const numColor = diff === 0  ? 'text-slate-600' :
                                 diff <= 32  ? 'text-yellow-400' :
                                 diff <= 96  ? 'text-orange-400' : 'text-red-400';
                const stageBg = st.type === 'initial' ? 'bg-violet-900/40 text-violet-400 border border-violet-700/40' :
                                st.type === 'final'   ? 'bg-cyan-900/40 text-cyan-400 border border-cyan-700/40' :
                                                         'bg-amber-900/30 text-amber-500 border border-amber-800/30';
                return (
                  <div key={idx} className="flex items-center gap-2 py-0.5">
                    <div className={`w-8 text-center rounded text-[8px] font-bold shrink-0 ${stageBg}`}>
                      {st.type === 'initial' ? 'IV' : st.type === 'final' ? 'DM' : `${idx - 1}`}
                    </div>
                    <div className="flex-1 relative h-3.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="absolute inset-y-0 left-1/2 w-px bg-slate-600/50" />
                      <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className={`w-7 text-[10px] font-mono font-bold text-right shrink-0 ${numColor}`}>{diff}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: hash comparison + explanation */}
          <div className="overflow-y-auto space-y-5 pr-1">
            {/* Final hash comparison */}
            <div className="bg-slate-900/60 border border-orange-900/30 rounded-xl p-5">
              <div className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-3">Final Hash Comparison</div>
              <div className="space-y-2 mb-4">
                <div>
                  <div className="text-[9px] text-slate-500 mb-1">Hash A  ("{avaA}")</div>
                  <div className="font-mono text-sm text-cyan-400 bg-slate-950 rounded p-2 border border-slate-800 break-all">{finalHashA}</div>
                </div>
                <div>
                  <div className="text-[9px] text-slate-500 mb-1">Hash B  ("{avaB}")</div>
                  <div className="font-mono text-sm text-violet-400 bg-slate-950 rounded p-2 border border-slate-800 break-all">{finalHashB}</div>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs mb-3">
                <span className="text-slate-500">Bit differences</span>
                <span className={`font-mono font-bold ${hashBitDiffCount > 100 && hashBitDiffCount < 156 ? 'text-emerald-400' : 'text-orange-400'}`}>
                  {hashBitDiffCount} / 256 ({(hashBitDiffCount / 256 * 100).toFixed(1)}%)
                </span>
              </div>
              {/* 256-bit diff grid */}
              <div className="flex flex-wrap gap-[1px]">
                {hashBitDiff.map((diff, i) => (
                  <div key={i} className={`w-3 h-3 rounded-[1px] text-[6px] flex items-center justify-center font-mono ${diff ? 'bg-orange-500/70 text-white' : 'bg-slate-800 text-slate-700'}`}>
                    {diff ? '1' : '0'}
                  </div>
                ))}
              </div>
              <div className="mt-3 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${hashBitDiffCount > 100 && hashBitDiffCount < 156 ? 'bg-emerald-500/70' : 'bg-orange-500/70'}`}
                  style={{ width: `${(hashBitDiffCount / 256) * 100}%` }} />
              </div>
            </div>

            {/* Avalanche explanation */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="text-xs font-bold text-orange-400 uppercase tracking-wider">Avalanche Effect in SHA-256</div>
              <p className="text-sm text-slate-300 leading-relaxed">
                A single-character change in the message changes approximately <strong className="text-white">half (50%) of all 256 output bits</strong>. This is the strict avalanche criterion — a core requirement for any cryptographic hash function.
              </p>
              <p className="text-sm text-slate-400 leading-relaxed">
                The left chart shows how the working state [a,b,c,d,e,f,g,h] diverges round by round. Starting from the same IV, the two inputs usually produce completely different states by round 2–3. By round 64, every bit is influenced by every message bit.
              </p>
              <p className="text-sm text-slate-400 leading-relaxed">
                Unlike AES, SHA-256 is a <em className="text-orange-300">one-way function</em>: there is no decryption. The compression is designed so that even knowing the output and algorithm, computing any input that produces it is computationally infeasible — forming the basis of digital signatures, certificates, and Bitcoin proof-of-work.
              </p>
              <div className="bg-slate-900/60 rounded-lg px-3 py-2 border border-slate-700/60">
                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Try: </span>
                <span className="text-xs text-slate-400">Change just one character (e.g. "abc" vs "abd"), or flip one bit of case ("hello" vs "Hello"). Notice the divergence bar reaches maximum by round 10 in both cases — no part of the message is "more or less important" to the avalanche.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP-THROUGH BODY ───────────────────────────────────────────────── */}
      {mode === 'stepthrough' && (
        <div className="flex-1 overflow-hidden grid grid-cols-[minmax(380px,1fr)_600px] gap-5 p-6">

          {/* Left: Pipeline */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-y-auto p-4 space-y-0.5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Compression Pipeline — 66 Stages</div>
              <div className="text-[10px] text-slate-600 italic">Click any row to jump</div>
            </div>

            {stages.map((st, idx) => {
              const isActive = idx === stage;
              const isPast   = idx < stage;
              const stageBgBadge = st.type === 'initial' ? 'bg-violet-900/40 text-violet-400 border border-violet-700/40' :
                                   st.type === 'final'   ? 'bg-cyan-900/40 text-cyan-400 border border-cyan-700/40' :
                                                            'bg-amber-900/30 text-amber-500 border border-amber-800/30';
              return (
                <React.Fragment key={idx}>
                  {/* Separator before round 0 */}
                  {idx === 1 && (
                    <div className="flex items-center gap-2 py-1">
                      <div className="flex-1 h-px bg-slate-800" />
                      <span className="text-[9px] text-slate-600 font-bold uppercase tracking-wider">64 Compression Rounds</span>
                      <div className="flex-1 h-px bg-slate-800" />
                    </div>
                  )}
                  {/* Separator before final stage */}
                  {idx === totalStages - 1 && (
                    <div className="flex items-center gap-2 py-1">
                      <div className="flex-1 h-px bg-slate-800" />
                      <span className="text-[9px] text-slate-600 font-bold uppercase tracking-wider">Davies-Meyer</span>
                      <div className="flex-1 h-px bg-slate-800" />
                    </div>
                  )}
                  <div
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                      idx > stage ? 'opacity-40' : 'opacity-100'
                    } ${isActive ? 'bg-slate-800/60 ring-2 ring-white/20' : isPast ? 'bg-slate-900/20' : ''}`}
                    onClick={() => setStage(idx)}
                  >
                    {/* Stage badge */}
                    <div className="w-10 flex-shrink-0 text-center">
                      <span className={`text-[9px] px-1 py-0.5 rounded font-bold ${stageBgBadge}`}>
                        {st.type === 'initial' ? 'IV' : st.type === 'final' ? 'DM' : `R${idx - 1}`}
                      </span>
                    </div>

                    {/* Mini state bar */}
                    <MiniStateBar stage={st} />

                    {/* W[i] for round stages */}
                    <div className="flex-shrink-0 text-right w-20">
                      {st.type === 'round' && st.detail && (
                        <div className="font-mono text-[8px] text-slate-600">
                          W={h32(st.detail.W).slice(0, 6)}
                        </div>
                      )}
                    </div>
                  </div>

                  {idx < totalStages - 1 && (
                    <div className="flex justify-center py-0">
                      <div className="text-slate-800 text-[10px]">▼</div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Right: Detail panel */}
          <div className="overflow-y-auto space-y-4 pr-1">

            {/* Working state full display */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <FullStateGrid stage={currentStage} label={currentStage.type === 'final' ? 'Final Hash Words' : `Working State — ${currentStage.label}`} />
              {currentStage.type === 'final' && (
                <div className="mt-3 pt-3 border-t border-slate-800">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">SHA-256 Hash Output</div>
                  <div className="font-mono text-sm text-cyan-300 bg-slate-950 rounded-lg p-3 border border-slate-800 break-all">
                    {currentStage.state.map(h8).join('')}
                  </div>
                </div>
              )}
            </div>

            {/* Round computation detail */}
            {currentStage.type === 'round' && currentStage.detail && (() => {
              const d = currentStage.detail;
              const inp = d.inputState;
              const [ia, , , id, ie, inf, ig, ih] = inp;
              return (
                <div className="bg-slate-900/60 border border-amber-900/40 rounded-xl p-5">
                  <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-4">
                    Round {d.round} — Compression Detail
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    {/* Left column: T1 path */}
                    <div className="space-y-2">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">T₁ path (→ new a, e)</div>

                      <div className="bg-slate-800/50 rounded-lg p-2.5 font-mono text-xs space-y-1">
                        <div className="text-slate-500 text-[9px] uppercase font-bold mb-1">Σ₁(e) — rotation mix</div>
                        <div><span className="text-slate-600">ROTR(e,6)  = </span><span className="text-slate-400">{h32(rotr32(ie, 6))}</span></div>
                        <div><span className="text-slate-600">ROTR(e,11) = </span><span className="text-slate-400">{h32(rotr32(ie, 11))}</span></div>
                        <div><span className="text-slate-600">ROTR(e,25) = </span><span className="text-slate-400">{h32(rotr32(ie, 25))}</span></div>
                        <div className="border-t border-slate-700 pt-1">
                          <span className="text-slate-500">Σ₁(e) = </span><span className="text-amber-300 font-bold">{h32(d.S1)}</span>
                        </div>
                      </div>

                      <div className="bg-slate-800/50 rounded-lg p-2.5 font-mono text-xs space-y-1">
                        <div className="text-slate-500 text-[9px] uppercase font-bold mb-1">Ch(e,f,g) — choose</div>
                        <div><span className="text-slate-600">e = </span><span className="text-slate-400">{h32(ie)}</span></div>
                        <div><span className="text-slate-600">f = </span><span className="text-slate-400">{h32(inf)}</span></div>
                        <div><span className="text-slate-600">g = </span><span className="text-slate-400">{h32(ig)}</span></div>
                        <div className="border-t border-slate-700 pt-1">
                          <span className="text-slate-500">Ch = (e∧f)⊕(¬e∧g) = </span><span className="text-amber-300 font-bold">{h32(d.Ch)}</span>
                        </div>
                      </div>

                      <div className="bg-slate-800/50 rounded-lg p-2.5 font-mono text-xs space-y-1">
                        <div className="text-slate-500 text-[9px] uppercase font-bold mb-1">T₁ = h + Σ₁ + Ch + K + W</div>
                        <div><span className="text-slate-600">h       = </span><span className="text-slate-400">{h32(ih)}</span></div>
                        <div><span className="text-slate-600">Σ₁(e)  = </span><span className="text-slate-400">{h32(d.S1)}</span></div>
                        <div><span className="text-slate-600">Ch     = </span><span className="text-slate-400">{h32(d.Ch)}</span></div>
                        <div><span className="text-slate-600">K[{d.round.toString().padStart(2)}]  = </span><span className="text-violet-400">{h32(d.K)}</span></div>
                        <div><span className="text-slate-600">W[{d.round.toString().padStart(2)}]  = </span><span className="text-sky-400">{h32(d.W)}</span></div>
                        <div className="border-t border-slate-700 pt-1">
                          <span className="text-slate-500">T₁ = </span><span className="text-amber-200 font-bold text-sm">{h32(d.T1)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right column: T2 path */}
                    <div className="space-y-2">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">T₂ path (→ new a)</div>

                      <div className="bg-slate-800/50 rounded-lg p-2.5 font-mono text-xs space-y-1">
                        <div className="text-slate-500 text-[9px] uppercase font-bold mb-1">Σ₀(a) — rotation mix</div>
                        <div><span className="text-slate-600">ROTR(a,2)  = </span><span className="text-slate-400">{h32(rotr32(ia, 2))}</span></div>
                        <div><span className="text-slate-600">ROTR(a,13) = </span><span className="text-slate-400">{h32(rotr32(ia, 13))}</span></div>
                        <div><span className="text-slate-600">ROTR(a,22) = </span><span className="text-slate-400">{h32(rotr32(ia, 22))}</span></div>
                        <div className="border-t border-slate-700 pt-1">
                          <span className="text-slate-500">Σ₀(a) = </span><span className="text-emerald-300 font-bold">{h32(d.S0)}</span>
                        </div>
                      </div>

                      <div className="bg-slate-800/50 rounded-lg p-2.5 font-mono text-xs space-y-1">
                        <div className="text-slate-500 text-[9px] uppercase font-bold mb-1">Maj(a,b,c) — majority</div>
                        <div><span className="text-slate-600">a = </span><span className="text-slate-400">{h32(ia)}</span></div>
                        <div><span className="text-slate-600">b = </span><span className="text-slate-400">{h32(inp[1])}</span></div>
                        <div><span className="text-slate-600">c = </span><span className="text-slate-400">{h32(inp[2])}</span></div>
                        <div className="border-t border-slate-700 pt-1">
                          <span className="text-slate-500">Maj = (a∧b)⊕(a∧c)⊕(b∧c) = </span><span className="text-emerald-300 font-bold">{h32(d.Maj)}</span>
                        </div>
                      </div>

                      <div className="bg-slate-800/50 rounded-lg p-2.5 font-mono text-xs space-y-1">
                        <div className="text-slate-500 text-[9px] uppercase font-bold mb-1">T₂ = Σ₀ + Maj</div>
                        <div><span className="text-slate-600">Σ₀(a) = </span><span className="text-slate-400">{h32(d.S0)}</span></div>
                        <div><span className="text-slate-600">Maj  = </span><span className="text-slate-400">{h32(d.Maj)}</span></div>
                        <div className="border-t border-slate-700 pt-1">
                          <span className="text-slate-500">T₂ = </span><span className="text-emerald-200 font-bold text-sm">{h32(d.T2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Output row */}
                  <div className="mt-4 bg-amber-950/20 border border-amber-900/30 rounded-lg p-3 font-mono text-xs">
                    <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-2">New State Values</div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                      <div><span className="text-amber-500 font-bold">new a</span><span className="text-slate-500"> = T₁ + T₂ = </span><span className="text-amber-200 font-bold">{h32(currentStage.state[0])}</span></div>
                      <div><span className="text-amber-500 font-bold">new e</span><span className="text-slate-500"> = d + T₁ = </span><span className="text-amber-200 font-bold">{h32(currentStage.state[4])}</span></div>
                      <div className="col-span-2 text-slate-600 text-[10px] pt-1">b←a, c←b, d←c (unchanged) · f←e, g←f, h←g (shift)</div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Initial state detail */}
            {currentStage.type === 'initial' && (
              <div className="bg-slate-900/60 border border-violet-900/40 rounded-xl p-5">
                <div className="text-xs font-bold text-violet-400 uppercase tracking-wider mb-3">Initialization Vectors — Square Roots of First 8 Primes</div>
                <div className="grid grid-cols-2 gap-2 font-mono text-xs mb-4">
                  {IV.map((v, i) => {
                    const primes = [2, 3, 5, 7, 11, 13, 17, 19];
                    return (
                      <div key={i} className="bg-slate-800/50 rounded-lg p-2">
                        <span className="text-violet-400 font-bold">H{i}</span>
                        <span className="text-slate-600"> = frac(√{primes[i]}) = </span>
                        <span className="text-violet-200">{h32(v)}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 space-y-2">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Message (first block)</div>
                  <div className="text-xs font-mono text-slate-400 break-all leading-relaxed">
                    {paddedHex.slice(0, 128).match(/.{2}/g)?.map((byte, i) => {
                      const msgLen = new TextEncoder().encode(msg).length;
                      const cls = i < msgLen ? 'text-cyan-400' : i === msgLen ? 'text-amber-400' : i >= 56 ? 'text-violet-400' : 'text-slate-700';
                      return <span key={i} className={`${cls}${i > 0 && i % 4 === 0 ? ' ml-0.5' : ''}`}>{byte}</span>;
                    })}
                  </div>
                  <div className="flex gap-3 text-[9px]">
                    <span className="text-cyan-400">■ message</span>
                    <span className="text-amber-400">■ 0x80</span>
                    <span className="text-slate-700">■ zeros</span>
                    <span className="text-violet-400">■ bit length</span>
                  </div>
                </div>
              </div>
            )}

            {/* Davies-Meyer detail */}
            {currentStage.type === 'final' && currentStage.prevState && (
              <div className="bg-slate-900/60 border border-cyan-900/40 rounded-xl p-5">
                <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-4">Davies-Meyer Feed-Forward Addition</div>
                <div className="font-mono text-xs space-y-1.5">
                  <div className="grid grid-cols-3 gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    <div>IV (H₀…H₇)</div>
                    <div className="text-center">+ compressed</div>
                    <div className="text-right">= final hash</div>
                  </div>
                  {IV.map((iv, i) => (
                    <div key={i} className="grid grid-cols-3 gap-2 items-center">
                      <div className="text-violet-400">{h32(iv)}</div>
                      <div className="text-center text-slate-500">+ {h32(currentStage.prevState![i])}</div>
                      <div className="text-cyan-300 font-bold text-right">{h32(currentStage.state[i])}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Explanation card */}
            <div className={`rounded-xl border p-5 space-y-3 ${
              currentStage.type === 'initial' ? 'bg-violet-950/20 border-violet-900/40' :
              currentStage.type === 'final'   ? 'bg-cyan-950/20 border-cyan-900/40' :
                                                 'bg-amber-950/20 border-amber-900/40'
            }`}>
              <div className={`text-xs font-bold uppercase tracking-wider ${
                currentStage.type === 'initial' ? 'text-violet-400' :
                currentStage.type === 'final'   ? 'text-cyan-400' : 'text-amber-400'
              }`}>{expl.heading}</div>
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">What is happening</div>
                <p className="text-sm text-slate-300 leading-relaxed">{expl.what}</p>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Why we do this</div>
                <p className="text-sm text-slate-400 leading-relaxed">{expl.why}</p>
              </div>
              {expl.tip && (
                <div className="bg-slate-900/60 rounded-lg px-3 py-2 border border-slate-700/60">
                  <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Tip: </span>
                  <span className="text-xs text-slate-400">{expl.tip}</span>
                </div>
              )}
            </div>

            {/* Message schedule */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <button onClick={() => setShowSchedule(v => !v)}
                className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors w-full">
                <span className="font-bold uppercase tracking-wider">Message Schedule W[0..63]</span>
                <span className="ml-auto">{showSchedule ? '▲' : '▼'}</span>
              </button>
              {showSchedule && (
                <div className="mt-4">
                  <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
                    W[0–15] come directly from the 512-bit message block. W[16–63] are derived: W[i] = σ₁(W[i-2]) + W[i-7] + σ₀(W[i-15]) + W[i-16], where σ₀ = ROTR(7)⊕ROTR(18)⊕SHR(3) and σ₁ = ROTR(17)⊕ROTR(19)⊕SHR(10).
                  </p>
                  <div className="grid grid-cols-8 gap-[2px]">
                    {schedule.map((w, i) => {
                      const isActive = currentStage.type === 'round' && currentStage.detail?.round === i;
                      return (
                        <div key={i}
                          onClick={() => setStage(i + 1)}
                          className={`cursor-pointer rounded text-center py-1 transition-colors ${
                            isActive ? 'bg-amber-900/50 border border-amber-700/60' :
                            i < 16   ? 'bg-sky-950/40 hover:bg-sky-900/40' :
                                        'bg-slate-800/40 hover:bg-slate-700/40'
                          }`}>
                          <div className={`text-[7px] font-bold mb-0.5 ${isActive ? 'text-amber-400' : 'text-slate-600'}`}>{i}</div>
                          <div className={`font-mono text-[8px] ${isActive ? 'text-amber-200' : i < 16 ? 'text-sky-400/70' : 'text-slate-500'}`}>
                            {h32(w).slice(0, 4)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-4 mt-2 text-[9px]">
                    <span className="text-sky-400/70">■ W[0-15] from message</span>
                    <span className="text-slate-500">■ W[16-63] computed</span>
                    <span className="text-amber-400 ml-auto">■ current round</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SHA256RoundApp;
