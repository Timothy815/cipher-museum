import React, { useState, useMemo, useCallback } from 'react';
import { Info, Copy, Check, Zap } from 'lucide-react';
import ExhibitPanel from '../../components/ExhibitPanel';

// ─── SHA-256 Constants ──────────────────────────────────────────────────
const K = [
  0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
  0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
  0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
  0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
  0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
  0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
  0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
  0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2,
];

const INIT_HASH = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
  0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
];

const HASH_LABELS = ['a','b','c','d','e','f','g','h'];

function rotr(x: number, n: number): number {
  return ((x >>> n) | (x << (32 - n))) >>> 0;
}

function hex(n: number): string {
  return (n >>> 0).toString(16).padStart(8, '0');
}

function hexBytes(arr: Uint8Array): string {
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── SHA-256 with round snapshots ───────────────────────────────────────

interface RoundSnapshot {
  round: number;
  a: number; b: number; c: number; d: number;
  e: number; f: number; g: number; h: number;
  W: number;
  K: number;
  S1: number;
  ch: number;
  temp1: number;
  S0: number;
  maj: number;
  temp2: number;
}

function sha256WithSnapshots(input: string): { hash: string; snapshots: RoundSnapshot[]; paddedHex: string; messageSchedule: number[] } {
  // Convert to bytes
  const data = new TextEncoder().encode(input);

  // Padding
  const bitLen = data.length * 8;
  const padLen = (64 - ((data.length + 9) % 64)) % 64;
  const padded = new Uint8Array(data.length + 1 + padLen + 8);
  padded.set(data);
  padded[data.length] = 0x80;
  const dv = new DataView(padded.buffer);
  dv.setUint32(padded.length - 4, bitLen, false);

  let [H0, H1, H2, H3, H4, H5, H6, H7] = INIT_HASH;
  const snapshots: RoundSnapshot[] = [];
  let messageSchedule: number[] = [];

  // Process first block only (for visualization)
  const W = new Uint32Array(64);
  for (let i = 0; i < 16; i++) {
    W[i] = dv.getUint32(i * 4, false);
  }
  for (let i = 16; i < 64; i++) {
    const s0 = rotr(W[i-15], 7) ^ rotr(W[i-15], 18) ^ (W[i-15] >>> 3);
    const s1 = rotr(W[i-2], 17) ^ rotr(W[i-2], 19) ^ (W[i-2] >>> 10);
    W[i] = (W[i-16] + s0 + W[i-7] + s1) >>> 0;
  }
  messageSchedule = Array.from(W);

  let a = H0, b = H1, c = H2, d = H3, e = H4, f = H5, g = H6, h = H7;

  for (let i = 0; i < 64; i++) {
    const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
    const ch = (e & f) ^ (~e & g);
    const temp1 = (h + S1 + ch + K[i] + W[i]) >>> 0;
    const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
    const maj = (a & b) ^ (a & c) ^ (b & c);
    const temp2 = (S0 + maj) >>> 0;

    h = g; g = f; f = e; e = (d + temp1) >>> 0;
    d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;

    snapshots.push({ round: i, a, b, c, d, e, f, g, h, W: W[i], K: K[i], S1, ch, temp1, S0, maj, temp2 });
  }

  H0 = (H0 + a) >>> 0; H1 = (H1 + b) >>> 0; H2 = (H2 + c) >>> 0; H3 = (H3 + d) >>> 0;
  H4 = (H4 + e) >>> 0; H5 = (H5 + f) >>> 0; H6 = (H6 + g) >>> 0; H7 = (H7 + h) >>> 0;

  // If multiple blocks, finish hashing (without snapshots)
  for (let offset = 64; offset < padded.length; offset += 64) {
    const W2 = new Uint32Array(64);
    for (let i = 0; i < 16; i++) W2[i] = dv.getUint32(offset + i * 4, false);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(W2[i-15], 7) ^ rotr(W2[i-15], 18) ^ (W2[i-15] >>> 3);
      const s1 = rotr(W2[i-2], 17) ^ rotr(W2[i-2], 19) ^ (W2[i-2] >>> 10);
      W2[i] = (W2[i-16] + s0 + W2[i-7] + s1) >>> 0;
    }
    a = H0; b = H1; c = H2; d = H3; e = H4; f = H5; g = H6; h = H7;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch2 = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch2 + K[i] + W2[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj2 = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj2) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0;
      d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    H0 = (H0+a)>>>0; H1 = (H1+b)>>>0; H2 = (H2+c)>>>0; H3 = (H3+d)>>>0;
    H4 = (H4+e)>>>0; H5 = (H5+f)>>>0; H6 = (H6+g)>>>0; H7 = (H7+h)>>>0;
  }

  const hash = [H0,H1,H2,H3,H4,H5,H6,H7].map(hex).join('');
  return { hash, snapshots, paddedHex: hexBytes(padded), messageSchedule };
}

// ─── Avalanche: count bit differences between two hashes ────────────────
function bitDiff(hash1: string, hash2: string): { count: number; bits: boolean[] } {
  const bits: boolean[] = [];
  let count = 0;
  for (let i = 0; i < hash1.length; i++) {
    const a = parseInt(hash1[i], 16);
    const b = parseInt(hash2[i], 16);
    const diff = a ^ b;
    for (let bit = 3; bit >= 0; bit--) {
      const d = (diff >> bit) & 1;
      bits.push(d === 1);
      if (d) count++;
    }
  }
  return { count, bits };
}

function App() {
  const [input, setInput] = useState('abc');
  const [showInfo, setShowInfo] = useState(false);
  const [currentRound, setCurrentRound] = useState(0);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<'hash' | 'rounds' | 'avalanche'>('hash');

  // Avalanche comparison
  const [avalancheInput1, setAvalancheInput1] = useState('hello');
  const [avalancheInput2, setAvalancheInput2] = useState('Hello');

  const result = useMemo(() => sha256WithSnapshots(input), [input]);

  const avalanche = useMemo(() => {
    const r1 = sha256WithSnapshots(avalancheInput1);
    const r2 = sha256WithSnapshots(avalancheInput2);
    const diff = bitDiff(r1.hash, r2.hash);
    return { hash1: r1.hash, hash2: r2.hash, ...diff };
  }, [avalancheInput1, avalancheInput2]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(result.hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [result.hash]);

  const snap = result.snapshots[currentRound];
  const prevSnap = currentRound > 0 ? result.snapshots[currentRound - 1] : null;

  const tabActive = 'bg-cyan-900/50 border-cyan-700 text-cyan-300';
  const tabInactive = 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200';

  return (
    <div className="flex-1 bg-[#0d1117] flex flex-col">
      <ExhibitPanel id="sha256" />
      <div className="bg-[#0d1117] flex flex-col items-center justify-start py-10 px-6 text-slate-200">
      <div className="w-full max-w-5xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl sm:text-4xl font-typewriter font-bold text-slate-100 tracking-tighter">
              SHA-<span className="text-cyan-500">256</span>
            </h1>
            <span className="text-slate-500 text-xs tracking-[0.3em] font-mono">SECURE HASH ALGORITHM — NSA 2001</span>
          </div>
          <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 border border-slate-700">
            <Info size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-2 mb-8">
          <button onClick={() => setTab('hash')} className={`px-5 py-2 rounded-lg font-bold text-sm border transition-colors ${tab === 'hash' ? tabActive : tabInactive}`}>
            HASH
          </button>
          <button onClick={() => setTab('rounds')} className={`px-5 py-2 rounded-lg font-bold text-sm border transition-colors ${tab === 'rounds' ? tabActive : tabInactive}`}>
            ROUNDS
          </button>
          <button onClick={() => setTab('avalanche')} className={`px-5 py-2 rounded-lg font-bold text-sm border transition-colors ${tab === 'avalanche' ? tabActive : tabInactive}`}>
            AVALANCHE
          </button>
        </div>

        {/* ═══════════════ HASH TAB ═══════════════ */}
        {tab === 'hash' && (
          <>
            {/* Input */}
            <div className="mb-6">
              <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Input Message</label>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Type anything..."
                className="w-full h-24 bg-slate-900 border border-slate-700 rounded-xl p-4 font-mono text-base focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none text-slate-200 placeholder-slate-700"
                spellCheck={false}
              />
              <div className="text-xs text-slate-600 mt-1 font-mono">{new TextEncoder().encode(input).length} bytes</div>
            </div>

            {/* Hash Output */}
            <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold">SHA-256 Hash (256 bits / 64 hex chars)</label>
                <button onClick={handleCopy} className="flex items-center gap-1 px-2 py-1 rounded text-xs font-bold border bg-slate-800 border-slate-700 text-slate-400 hover:text-cyan-300 transition-colors">
                  {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                </button>
              </div>
              <div className="font-mono text-lg text-cyan-300 bg-slate-950 rounded-lg p-4 border border-slate-800 break-all tracking-wider leading-relaxed">
                {result.hash}
              </div>
            </div>

            {/* Hash as 8 words */}
            <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 mb-6">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">
                8 × 32-bit Words (H0–H7)
              </div>
              <div className="grid grid-cols-4 gap-2">
                {result.hash.match(/.{8}/g)?.map((word, i) => (
                  <div key={i} className="bg-slate-950 rounded-lg p-2 border border-slate-800 text-center">
                    <div className="text-[9px] text-slate-500 font-bold">H{i}</div>
                    <div className="font-mono text-sm text-cyan-400">{word}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Initial hash values */}
            <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-5 mb-6">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">
                Initial Hash Values (first 8 primes, square roots)
              </div>
              <div className="grid grid-cols-4 gap-2">
                {INIT_HASH.map((h, i) => (
                  <div key={i} className="text-center">
                    <span className="text-[9px] text-slate-600 font-bold">H{i}⁰ = </span>
                    <span className="font-mono text-xs text-slate-400">{hex(h)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Padded message */}
            <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-5">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">
                Padded Message (512-bit blocks)
              </div>
              <div className="font-mono text-[10px] text-slate-400 break-all leading-relaxed bg-slate-950 rounded-lg p-3 border border-slate-800">
                {result.paddedHex.match(/.{2}/g)?.map((byte, i) => {
                  const isMessage = i < new TextEncoder().encode(input).length;
                  const isPadBit = i === new TextEncoder().encode(input).length;
                  const isLength = i >= result.paddedHex.length / 2 - 8;
                  return (
                    <span key={i} className={`${
                      isMessage ? 'text-cyan-400' : isPadBit ? 'text-amber-400' : isLength ? 'text-violet-400' : 'text-slate-600'
                    } ${i > 0 && i % 4 === 0 ? 'ml-1' : ''} ${i > 0 && i % 32 === 0 ? 'block' : ''}`}>
                      {byte}
                    </span>
                  );
                })}
              </div>
              <div className="flex gap-4 mt-2 text-[9px]">
                <span className="text-cyan-400">■ message</span>
                <span className="text-amber-400">■ pad (0x80)</span>
                <span className="text-slate-600">■ zero padding</span>
                <span className="text-violet-400">■ length (bits)</span>
              </div>
            </div>
          </>
        )}

        {/* ═══════════════ ROUNDS TAB ═══════════════ */}
        {tab === 'rounds' && (
          <>
            {/* Input */}
            <div className="mb-4">
              <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Input</label>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-slate-200"
              />
            </div>

            {/* Round selector */}
            <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                  Round {currentRound} of 63
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentRound(Math.max(0, currentRound - 1))}
                    disabled={currentRound === 0}
                    className="px-3 py-1 rounded text-xs font-bold border bg-slate-800 border-slate-700 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                  >← Prev</button>
                  <button
                    onClick={() => setCurrentRound(Math.min(63, currentRound + 1))}
                    disabled={currentRound === 63}
                    className="px-3 py-1 rounded text-xs font-bold border bg-slate-800 border-slate-700 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                  >Next →</button>
                </div>
              </div>

              {/* Round slider */}
              <input
                type="range" min="0" max="63" value={currentRound}
                onChange={e => setCurrentRound(Number(e.target.value))}
                className="w-full accent-cyan-500 mb-4"
              />

              {/* Progress bar with round groups */}
              <div className="flex gap-[1px] h-2 rounded overflow-hidden">
                {Array.from({ length: 64 }, (_, i) => (
                  <div
                    key={i}
                    className={`flex-1 cursor-pointer transition-colors ${
                      i === currentRound ? 'bg-cyan-400' :
                      i < currentRound ? 'bg-cyan-800' : 'bg-slate-800'
                    }`}
                    onClick={() => setCurrentRound(i)}
                    title={`Round ${i}`}
                  />
                ))}
              </div>
            </div>

            {/* State after this round */}
            {snap && (
              <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 mb-6">
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-4">
                  Working Variables After Round {currentRound}
                </div>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[snap.a, snap.b, snap.c, snap.d, snap.e, snap.f, snap.g, snap.h].map((val, i) => {
                    const prev = prevSnap ? [prevSnap.a, prevSnap.b, prevSnap.c, prevSnap.d, prevSnap.e, prevSnap.f, prevSnap.g, prevSnap.h][i] : INIT_HASH[i];
                    const changed = val !== prev;
                    return (
                      <div key={i} className={`rounded-lg p-2 border text-center transition-all ${
                        changed ? 'bg-cyan-950/40 border-cyan-700/50' : 'bg-slate-950 border-slate-800'
                      }`}>
                        <div className={`text-[9px] font-bold ${changed ? 'text-cyan-400' : 'text-slate-500'}`}>{HASH_LABELS[i]}</div>
                        <div className={`font-mono text-sm ${changed ? 'text-cyan-300' : 'text-slate-400'}`}>{hex(val)}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Round computation details */}
                <div className="bg-slate-950 rounded-lg p-4 border border-slate-800">
                  <div className="text-[9px] text-slate-500 uppercase font-bold mb-2">Round {currentRound} Computation</div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs font-mono">
                    <div><span className="text-slate-500">W[{currentRound}] = </span><span className="text-amber-400">{hex(snap.W)}</span></div>
                    <div><span className="text-slate-500">K[{currentRound}] = </span><span className="text-violet-400">{hex(snap.K)}</span></div>
                    <div><span className="text-slate-500">Σ1(e)  = </span><span className="text-slate-400">{hex(snap.S1)}</span></div>
                    <div><span className="text-slate-500">Ch(e,f,g) = </span><span className="text-slate-400">{hex(snap.ch)}</span></div>
                    <div><span className="text-slate-500">temp1  = </span><span className="text-cyan-400">{hex(snap.temp1)}</span></div>
                    <div><span className="text-slate-500">Σ0(a)  = </span><span className="text-slate-400">{hex(snap.S0)}</span></div>
                    <div><span className="text-slate-500">Maj(a,b,c) = </span><span className="text-slate-400">{hex(snap.maj)}</span></div>
                    <div><span className="text-slate-500">temp2  = </span><span className="text-cyan-400">{hex(snap.temp2)}</span></div>
                  </div>
                </div>
              </div>
            )}

            {/* Message Schedule (first 16 + current) */}
            <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-5">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">
                Message Schedule W[0..63]
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-1 max-h-48 overflow-y-auto">
                {result.messageSchedule.map((w, i) => (
                  <div
                    key={i}
                    className={`text-center py-1 px-0.5 rounded text-[9px] font-mono cursor-pointer transition-colors ${
                      i === currentRound
                        ? 'bg-cyan-900/50 border border-cyan-700 text-cyan-300'
                        : i < 16
                        ? 'bg-amber-950/20 text-amber-400/70'
                        : 'bg-slate-800/30 text-slate-500'
                    }`}
                    onClick={() => setCurrentRound(i)}
                    title={`W[${i}] = ${hex(w)}`}
                  >
                    <div className="text-[7px] text-slate-600">{i}</div>
                    {hex(w).slice(0, 4)}
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-2 text-[9px]">
                <span className="text-amber-400/70">■ W[0-15] from message</span>
                <span className="text-slate-500">■ W[16-63] computed</span>
              </div>
            </div>
          </>
        )}

        {/* ═══════════════ AVALANCHE TAB ═══════════════ */}
        {tab === 'avalanche' && (
          <>
            <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 mb-6">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-4">
                Avalanche Effect — Change 1 bit, see ~50% of hash change
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Input A</label>
                  <input
                    value={avalancheInput1}
                    onChange={e => setAvalancheInput1(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Input B</label>
                  <input
                    value={avalancheInput2}
                    onChange={e => setAvalancheInput2(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-slate-200"
                  />
                </div>
              </div>

              {/* Quick presets */}
              <div className="flex flex-wrap gap-2 mb-4">
                {[
                  { label: 'Case flip', a: 'hello', b: 'Hello' },
                  { label: '1 char diff', a: 'abc', b: 'abd' },
                  { label: 'Add space', a: 'test', b: 'test ' },
                  { label: 'Same', a: 'same', b: 'same' },
                  { label: 'Empty vs a', a: '', b: 'a' },
                ].map(p => (
                  <button
                    key={p.label}
                    onClick={() => { setAvalancheInput1(p.a); setAvalancheInput2(p.b); }}
                    className="px-3 py-1 rounded text-xs font-bold border bg-slate-800 border-slate-700 text-slate-500 hover:text-cyan-300 hover:border-cyan-700 transition-colors"
                  >
                    <Zap size={10} className="inline mr-1" />{p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Hash comparison */}
            <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 mb-6">
              <div className="space-y-3">
                <div>
                  <div className="text-[9px] text-slate-500 font-bold mb-1">Hash A</div>
                  <div className="font-mono text-sm text-cyan-400 bg-slate-950 rounded-lg p-2 border border-slate-800 break-all">
                    {avalanche.hash1}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-slate-500 font-bold mb-1">Hash B</div>
                  <div className="font-mono text-sm text-violet-400 bg-slate-950 rounded-lg p-2 border border-slate-800 break-all">
                    {avalanche.hash2}
                  </div>
                </div>
              </div>
            </div>

            {/* Bit-level diff visualization */}
            <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                  Bit Differences
                </div>
                <div className="text-sm font-mono font-bold text-cyan-400">
                  {avalanche.count} / 256 bits changed ({(avalanche.count / 256 * 100).toFixed(1)}%)
                </div>
              </div>

              {/* Bit grid */}
              <div className="font-mono text-[8px] leading-tight bg-slate-950 rounded-lg p-3 border border-slate-800">
                {Array.from({ length: 8 }, (_, row) => (
                  <div key={row} className="flex gap-[1px] mb-[1px]">
                    {avalanche.bits.slice(row * 32, (row + 1) * 32).map((diff, i) => (
                      <span
                        key={i}
                        className={`w-3 h-3 inline-flex items-center justify-center rounded-sm ${
                          diff ? 'bg-red-500/70 text-white' : 'bg-slate-800 text-slate-600'
                        }`}
                      >
                        {diff ? '1' : '0'}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-2 text-[9px]">
                <span className="text-red-400">■ changed bit</span>
                <span className="text-slate-600">■ same bit</span>
                <span className="text-slate-500 ml-auto">Ideal: ~128 bits (50%)</span>
              </div>

              {/* Progress bar */}
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      avalanche.count === 0 ? 'bg-slate-700' :
                      avalanche.count > 100 && avalanche.count < 156 ? 'bg-emerald-500' :
                      'bg-amber-500'
                    }`}
                    style={{ width: `${(avalanche.count / 256) * 100}%` }}
                  />
                </div>
                <span className={`text-xs font-bold ${
                  avalanche.count === 0 ? 'text-slate-500' :
                  avalanche.count > 100 && avalanche.count < 156 ? 'text-emerald-400' :
                  'text-amber-400'
                }`}>
                  {avalanche.count === 0 ? 'IDENTICAL' :
                   avalanche.count === 256 ? 'ALL DIFFERENT' :
                   avalanche.count > 100 && avalanche.count < 156 ? 'EXCELLENT' : 'GOOD'}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Info Panel */}
      <div className={`fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-700 p-6 transform transition-transform duration-300 z-40 ${showInfo ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="max-w-3xl mx-auto relative">
          <button onClick={() => setShowInfo(false)} className="absolute top-0 right-0 p-2 text-slate-500 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <h3 className="text-xl font-bold text-cyan-400 mb-2">About SHA-256</h3>
          <p className="text-sm text-slate-300 leading-relaxed mb-3">
            <strong>SHA-256</strong> (Secure Hash Algorithm 256-bit) was designed by the <strong>NSA</strong> and published by NIST
            in 2001 as part of the SHA-2 family. It takes an arbitrary-length input and produces a fixed 256-bit (32-byte) hash —
            a unique "fingerprint" of the data.
          </p>
          <p className="text-sm text-slate-300 leading-relaxed mb-3">
            <strong>How it works:</strong> The message is padded to a multiple of 512 bits, then processed in 64 rounds per block.
            Each round uses bitwise operations (rotations, XOR, AND, majority) plus addition mod 2³². The 64 round constants K
            come from the cube roots of the first 64 primes. The 8 initial hash values come from the square roots of the first 8 primes.
          </p>
          <p className="text-sm text-slate-300 leading-relaxed">
            <strong>Avalanche effect:</strong> Changing even a single bit of input changes roughly 50% of the output bits.
            This property makes SHA-256 ideal for integrity verification, digital signatures, proof-of-work (Bitcoin), and
            password hashing. No collision has ever been found for SHA-256, and it is considered secure as of 2024.
          </p>
        </div>
      </div>
    </div>
    </div>
  );
}

export default App;
