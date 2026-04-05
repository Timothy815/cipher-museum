import React, { useState, useMemo } from 'react';
import { Info, RotateCcw, Check, X, ShieldCheck, ShieldX } from 'lucide-react';
import ExhibitPanel from '../../components/ExhibitPanel';

// ── Minimal SHA-256 ──────────────────────────────────────────────────
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
function rotr32(x: number, n: number) { return ((x >>> n) | (x << (32 - n))) >>> 0; }
function sha256(msg: string): string {
  const bytes = new TextEncoder().encode(msg);
  const bits = bytes.length * 8;
  const arr: number[] = [...bytes, 0x80];
  while (arr.length % 64 !== 56) arr.push(0);
  for (let i = 7; i >= 0; i--) arr.push((bits / Math.pow(2, i * 8)) & 0xff);
  let [h0,h1,h2,h3,h4,h5,h6,h7] = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  for (let i = 0; i < arr.length; i += 64) {
    const w: number[] = [];
    for (let j = 0; j < 16; j++) w.push((arr[i+j*4]<<24)|(arr[i+j*4+1]<<16)|(arr[i+j*4+2]<<8)|arr[i+j*4+3]);
    for (let j = 16; j < 64; j++) {
      const s0 = rotr32(w[j-15],7)^rotr32(w[j-15],18)^(w[j-15]>>>3);
      const s1 = rotr32(w[j-2],17)^rotr32(w[j-2],19)^(w[j-2]>>>10);
      w.push(((w[j-16]+s0+w[j-7]+s1)>>>0));
    }
    let [a,b,c,d,e,f,g,h] = [h0,h1,h2,h3,h4,h5,h6,h7];
    for (let j = 0; j < 64; j++) {
      const S1 = rotr32(e,6)^rotr32(e,11)^rotr32(e,25);
      const ch = (e&f)^(~e&g);
      const T1 = (h+S1+ch+K[j]+w[j])>>>0;
      const S0 = rotr32(a,2)^rotr32(a,13)^rotr32(a,22);
      const maj = (a&b)^(a&c)^(b&c);
      const T2 = (S0+maj)>>>0;
      [h,g,f,e,d,c,b,a] = [g,f,e,(d+T1)>>>0,c,b,a,(T1+T2)>>>0];
    }
    [h0,h1,h2,h3,h4,h5,h6,h7] = [(h0+a)>>>0,(h1+b)>>>0,(h2+c)>>>0,(h3+d)>>>0,(h4+e)>>>0,(h5+f)>>>0,(h6+g)>>>0,(h7+h)>>>0];
  }
  return [h0,h1,h2,h3,h4,h5,h6,h7].map(n=>n.toString(16).padStart(8,'0')).join('');
}

// ── Toy RSA (small primes, purely educational) ───────────────────────
// Uses BigInt so the math is real, but primes are small so numbers are legible.

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = 1n;
  base = base % mod;
  while (exp > 0n) {
    if (exp % 2n === 1n) result = (result * base) % mod;
    exp = exp / 2n;
    base = (base * base) % mod;
  }
  return result;
}

function gcd(a: bigint, b: bigint): bigint { return b === 0n ? a : gcd(b, a % b); }

function modInverse(a: bigint, m: bigint): bigint {
  let [old_r, r] = [a, m];
  let [old_s, s] = [1n, 0n];
  while (r !== 0n) {
    const q = old_r / r;
    [old_r, r] = [r, old_r - q * r];
    [old_s, s] = [s, old_s - q * s];
  }
  return ((old_s % m) + m) % m;
}

// Presets — each (p, q, e) tuple defines a key pair
const KEY_PRESETS = [
  { label: 'Small (visible math)', p: 61n, q: 53n, e: 17n },
  { label: 'Medium', p: 127n, q: 131n, e: 65537n },
  { label: 'Large', p: 1009n, q: 1013n, e: 65537n },
];

interface RSAKey {
  p: bigint; q: bigint; n: bigint; phi: bigint;
  e: bigint; d: bigint;
}

function deriveKey(preset: typeof KEY_PRESETS[0]): RSAKey {
  const { p, q, e } = preset;
  const n = p * q;
  const phi = (p - 1n) * (q - 1n);
  const d = modInverse(e, phi);
  return { p, q, n, phi, e, d };
}

// Sign: hash the message (truncated to fit modulus), then compute sig = hash^d mod n
function signMessage(message: string, key: RSAKey): { hash: string; hashNum: bigint; sig: bigint } {
  const hash = sha256(message);
  // Reduce hash to a number that fits in key.n
  const hashNum = BigInt('0x' + hash.slice(0, 14)) % key.n;
  const sig = modPow(hashNum, key.d, key.n);
  return { hash, hashNum, sig };
}

function verifySignature(message: string, sig: bigint, key: RSAKey): { valid: boolean; hash: string; hashNum: bigint; recovered: bigint } {
  const hash = sha256(message);
  const hashNum = BigInt('0x' + hash.slice(0, 14)) % key.n;
  const recovered = modPow(sig, key.e, key.n);
  return { valid: recovered === hashNum, hash, hashNum, recovered };
}

// ── Component ────────────────────────────────────────────────────────

function App() {
  const [message, setMessage] = useState('The transfer of $1,000 to Alice is authorized.');
  const [tamperedMessage, setTamperedMessage] = useState('The transfer of $9,000 to Alice is authorized.');
  const [presetIdx, setPresetIdx] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const [showPrivKey, setShowPrivKey] = useState(false);
  const [activeTab, setActiveTab] = useState<'sign' | 'verify' | 'tamper'>('sign');

  const key = useMemo(() => deriveKey(KEY_PRESETS[presetIdx]), [presetIdx]);
  const { hash, hashNum, sig } = useMemo(() => signMessage(message, key), [message, key]);
  const verifyResult = useMemo(() => verifySignature(message, sig, key), [message, sig, key]);
  const tamperResult = useMemo(() => verifySignature(tamperedMessage, sig, key), [tamperedMessage, sig, key]);

  const preset = KEY_PRESETS[presetIdx];

  return (
    <div className="flex-1 bg-[#0d1117] flex flex-col">
      <ExhibitPanel id="digital-signature" />
      <div className="bg-[#0d1117] flex flex-col items-center justify-start py-10 px-6 text-slate-200">
      <div className="w-full max-w-4xl">

        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl sm:text-4xl font-typewriter font-bold text-slate-100 tracking-tighter">
              <span className="text-violet-400">DIGITAL</span> SIGNATURES
            </h1>
            <span className="text-slate-500 text-xs tracking-[0.3em] font-mono">RSA-SHA256 — SIGN · VERIFY · TAMPER DETECTION</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 border border-slate-700">
              <Info size={20} />
            </button>
            <button onClick={() => { setMessage('The transfer of $1,000 to Alice is authorized.'); setTamperedMessage('The transfer of $9,000 to Alice is authorized.'); }} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 border border-slate-700">
              <RotateCcw size={20} />
            </button>
          </div>
        </div>

        {/* Key Pair Panel */}
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">RSA Key Pair</span>
            <div className="flex gap-2 items-center">
              <span className="text-[10px] text-slate-500 font-mono">Key size:</span>
              {KEY_PRESETS.map((pr, i) => (
                <button key={i} onClick={() => setPresetIdx(i)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-colors ${presetIdx === i ? 'bg-violet-900/50 border-violet-700 text-violet-300' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-white'}`}>
                  {pr.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Public Key */}
            <div className="bg-slate-800/60 rounded-xl border border-slate-700 p-4">
              <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                Public Key (shared with everyone)
              </div>
              <div className="space-y-1.5 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">n (modulus)</span>
                  <span className="text-slate-200">{key.n.toString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">e (exponent)</span>
                  <span className="text-emerald-300">{key.e.toString()}</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-600 mt-2">Used to VERIFY signatures</p>
            </div>

            {/* Private Key */}
            <div className="bg-red-950/20 rounded-xl border border-red-900/40 p-4">
              <div className="text-[10px] text-red-400 font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                Private Key (kept secret)
                <button onClick={() => setShowPrivKey(!showPrivKey)} className="ml-auto text-[9px] text-slate-500 hover:text-white border border-slate-700 rounded px-2 py-0.5">
                  {showPrivKey ? 'hide' : 'reveal'}
                </button>
              </div>
              <div className="space-y-1.5 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">p, q (primes)</span>
                  {showPrivKey
                    ? <span className="text-red-300">{preset.p.toString()} × {preset.q.toString()}</span>
                    : <span className="text-slate-700">████ × ████</span>}
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">d (exponent)</span>
                  {showPrivKey
                    ? <span className="text-red-300">{key.d.toString()}</span>
                    : <span className="text-slate-700">{'█'.repeat(Math.min(key.d.toString().length, 12))}</span>}
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">φ(n) = (p-1)(q-1)</span>
                  {showPrivKey
                    ? <span className="text-red-300">{key.phi.toString()}</span>
                    : <span className="text-slate-700">{'█'.repeat(Math.min(key.phi.toString().length, 12))}</span>}
                </div>
              </div>
              <p className="text-[10px] text-slate-600 mt-2">Used to CREATE signatures</p>
            </div>
          </div>

          {/* Key math */}
          <div className="mt-3 text-[10px] font-mono text-slate-600 text-center">
            n = p × q = {preset.p.toString()} × {preset.q.toString()} = {key.n.toString()}
            &nbsp;·&nbsp; d·e ≡ 1 (mod φ(n)) &nbsp;·&nbsp; gcd(e, φ(n)) = {gcd(key.e, key.phi).toString()}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          {(['sign', 'verify', 'tamper'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-lg font-bold text-sm border transition-all capitalize ${
                activeTab === tab
                  ? tab === 'tamper' ? 'bg-red-900/50 border-red-700 text-red-300'
                    : 'bg-violet-900/50 border-violet-700 text-violet-300'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
              }`}>
              {tab === 'sign' ? '✍ Sign' : tab === 'verify' ? '✓ Verify' : '⚠ Tamper'}
            </button>
          ))}
        </div>

        {/* ── SIGN TAB ── */}
        {activeTab === 'sign' && (
          <div className="space-y-6">
            <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6">
              <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">Message to Sign</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 font-mono text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none h-24"
                spellCheck={false}
              />
            </div>

            {/* Step pipeline */}
            <div className="space-y-3">
              {/* Step 1: Hash */}
              <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-6 h-6 rounded-full bg-violet-900 border border-violet-700 flex items-center justify-center text-xs font-bold text-violet-300">1</div>
                  <span className="text-sm font-bold text-white">Hash the message</span>
                  <span className="text-[10px] font-mono text-slate-500">SHA-256(message) → 256-bit digest</span>
                </div>
                <div className="font-mono text-xs text-violet-300 bg-violet-950/30 rounded-lg p-3 break-all">
                  {hash}
                </div>
                <p className="text-[10px] text-slate-600 mt-2">
                  Any change to the message produces a completely different hash (avalanche effect).
                  Hash truncated to fit modulus n={key.n.toString()}: <span className="text-violet-400">{hashNum.toString()}</span>
                </p>
              </div>

              {/* Step 2: Sign */}
              <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-6 h-6 rounded-full bg-violet-900 border border-violet-700 flex items-center justify-center text-xs font-bold text-violet-300">2</div>
                  <span className="text-sm font-bold text-white">Sign with private key</span>
                  <span className="text-[10px] font-mono text-slate-500">sig = hash<sup>d</sup> mod n</span>
                </div>
                <div className="font-mono text-xs text-slate-400 mb-2">
                  sig = {hashNum.toString()}<sup>{key.d.toString()}</sup> mod {key.n.toString()}
                </div>
                <div className="font-mono text-lg font-bold text-violet-400 bg-violet-950/30 rounded-lg p-3">
                  Signature = <span className="text-white">{sig.toString()}</span>
                </div>
                <p className="text-[10px] text-slate-600 mt-2">
                  Only the private key holder can produce this. Signing is slow — this is why we hash first.
                </p>
              </div>

              {/* Signature as hex (for realism) */}
              <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-400">✓</div>
                  <span className="text-sm font-bold text-white">Output — what gets sent with the message</span>
                </div>
                <div className="grid md:grid-cols-2 gap-3 text-xs font-mono">
                  <div>
                    <div className="text-[9px] text-slate-500 mb-1">Message</div>
                    <div className="text-slate-300 bg-slate-800 rounded p-2 text-[11px] leading-relaxed">{message}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-500 mb-1">Signature</div>
                    <div className="text-violet-400 bg-violet-950/20 rounded p-2 font-bold">{sig.toString()}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── VERIFY TAB ── */}
        {activeTab === 'verify' && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-4">
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">Received Message</div>
                <div className="font-mono text-sm text-slate-300 bg-slate-800 rounded-lg p-3">{message}</div>
              </div>
              <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-4">
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">Received Signature</div>
                <div className="font-mono text-sm text-violet-400 bg-violet-950/20 rounded-lg p-3 font-bold">{sig.toString()}</div>
              </div>
            </div>

            {/* Verification pipeline */}
            <div className="space-y-3">
              <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-900 border border-emerald-700 flex items-center justify-center text-xs font-bold text-emerald-300">1</div>
                  <span className="text-sm font-bold text-white">Hash the received message</span>
                </div>
                <div className="font-mono text-xs text-emerald-300 bg-emerald-950/20 rounded-lg p-3 break-all">{verifyResult.hash}</div>
                <div className="text-[10px] text-slate-500 font-mono mt-1">→ {verifyResult.hashNum.toString()}</div>
              </div>

              <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-900 border border-emerald-700 flex items-center justify-center text-xs font-bold text-emerald-300">2</div>
                  <span className="text-sm font-bold text-white">Recover hash from signature</span>
                  <span className="text-[10px] font-mono text-slate-500">recovered = sig<sup>e</sup> mod n</span>
                </div>
                <div className="font-mono text-xs text-slate-400 mb-2">
                  recovered = {sig.toString()}<sup>{key.e.toString()}</sup> mod {key.n.toString()}
                </div>
                <div className="font-mono text-sm text-emerald-400 bg-emerald-950/20 rounded-lg p-3 font-bold">
                  Recovered = {verifyResult.recovered.toString()}
                </div>
              </div>

              <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-900 border border-emerald-700 flex items-center justify-center text-xs font-bold text-emerald-300">3</div>
                  <span className="text-sm font-bold text-white">Compare</span>
                </div>
                <div className="flex items-center gap-4 font-mono text-sm">
                  <div>
                    <div className="text-[9px] text-slate-500 mb-1">Computed hash</div>
                    <div className="text-emerald-300 font-bold">{verifyResult.hashNum.toString()}</div>
                  </div>
                  <div className="text-2xl text-slate-500">{verifyResult.valid ? '=' : '≠'}</div>
                  <div>
                    <div className="text-[9px] text-slate-500 mb-1">Recovered hash</div>
                    <div className="text-emerald-300 font-bold">{verifyResult.recovered.toString()}</div>
                  </div>
                </div>
              </div>

              {/* Result */}
              <div className={`rounded-xl border p-5 flex items-center gap-4 ${verifyResult.valid ? 'bg-emerald-950/30 border-emerald-700/60' : 'bg-red-950/30 border-red-700/60'}`}>
                {verifyResult.valid
                  ? <ShieldCheck size={32} className="text-emerald-400 shrink-0" />
                  : <ShieldX size={32} className="text-red-400 shrink-0" />}
                <div>
                  <div className={`text-lg font-bold ${verifyResult.valid ? 'text-emerald-300' : 'text-red-300'}`}>
                    {verifyResult.valid ? 'Signature VALID' : 'Signature INVALID'}
                  </div>
                  <p className={`text-xs mt-1 ${verifyResult.valid ? 'text-emerald-500' : 'text-red-500'}`}>
                    {verifyResult.valid
                      ? 'Message is authentic and unmodified. Only the private key holder could have produced this signature.'
                      : 'Signature does not match. Message may have been tampered with, or signed by a different key.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAMPER TAB ── */}
        {activeTab === 'tamper' && (
          <div className="space-y-6">
            <div className="bg-amber-950/20 border border-amber-900/40 rounded-xl p-4">
              <div className="text-[10px] text-amber-400 font-bold uppercase tracking-widest mb-1">Attack Scenario</div>
              <p className="text-xs text-amber-300/80">
                An attacker intercepts the signed message and tries to modify it before forwarding.
                They have the <strong>signature</strong> and the <strong>public key</strong>, but not the private key.
                Edit the message below to see what happens.
              </p>
            </div>

            {/* Original */}
            <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-4">
              <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-2">Original Signed Message</div>
              <div className="font-mono text-sm text-slate-300 mb-1">{message}</div>
              <div className="text-[10px] text-slate-600 font-mono">sig = {sig.toString()}</div>
            </div>

            {/* Attacker edits */}
            <div className="bg-red-950/20 rounded-xl border border-red-900/40 p-4">
              <label className="block text-[10px] text-red-400 font-bold uppercase tracking-widest mb-2">Attacker's Modified Message</label>
              <textarea
                value={tamperedMessage}
                onChange={e => setTamperedMessage(e.target.value)}
                className="w-full bg-slate-900 border border-red-900/50 rounded-xl p-3 font-mono text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/40 resize-none h-20"
                spellCheck={false}
              />
              <p className="text-[10px] text-slate-600 mt-1">The attacker uses the same signature — they cannot forge a new one without the private key.</p>
            </div>

            {/* Hash diff */}
            <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-4 space-y-3">
              <div>
                <div className="text-[9px] text-emerald-500 font-mono mb-1">SHA-256(original)</div>
                <div className="font-mono text-xs break-all">
                  {sha256(message).split('').map((ch, i) => {
                    const tamperHash = sha256(tamperedMessage);
                    return (
                      <span key={i} className={ch !== tamperHash[i] ? 'text-red-400 font-bold' : 'text-slate-500'}>
                        {ch}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="text-[9px] text-red-500 font-mono mb-1">SHA-256(tampered)</div>
                <div className="font-mono text-xs break-all">
                  {sha256(tamperedMessage).split('').map((ch, i) => {
                    const origHash = sha256(message);
                    return (
                      <span key={i} className={ch !== origHash[i] ? 'text-red-400 font-bold' : 'text-slate-500'}>
                        {ch}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div className="text-[10px] text-slate-600 font-mono">
                {sha256(message).split('').filter((ch, i) => ch !== sha256(tamperedMessage)[i]).length} / 64 hex chars differ
              </div>
            </div>

            {/* Verification of tampered */}
            <div className={`rounded-xl border p-5 flex items-center gap-4 ${tamperResult.valid ? 'bg-emerald-950/30 border-emerald-700/60' : 'bg-red-950/30 border-red-700/60'}`}>
              {tamperResult.valid
                ? <ShieldCheck size={32} className="text-emerald-400 shrink-0" />
                : <ShieldX size={32} className="text-red-400 shrink-0" />}
              <div>
                <div className={`text-lg font-bold ${tamperResult.valid ? 'text-emerald-300' : 'text-red-300'}`}>
                  Verification: {tamperResult.valid ? 'VALID (message unchanged)' : 'FAILED — tampering detected!'}
                </div>
                <div className="font-mono text-xs mt-2 space-y-0.5">
                  <div><span className="text-slate-500">Computed hash: </span><span className="text-slate-300">{tamperResult.hashNum.toString()}</span></div>
                  <div><span className="text-slate-500">Recovered hash: </span><span className="text-slate-300">{tamperResult.recovered.toString()}</span></div>
                  <div className={`font-bold mt-1 ${tamperResult.valid ? 'text-emerald-400' : 'text-red-400'}`}>
                    {tamperResult.hashNum.toString()} {tamperResult.valid ? '=' : '≠'} {tamperResult.recovered.toString()}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-4">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">Why the attacker fails</div>
              <div className="text-xs text-slate-400 space-y-1">
                <p>To forge a valid signature on the modified message, the attacker needs to compute:</p>
                <p className="font-mono text-violet-400 text-center py-2">new_sig = SHA256(tampered_message)<sup>d</sup> mod n</p>
                <p>But <strong>d</strong> (the private exponent) is secret. Without it, the attacker cannot produce a signature that satisfies <span className="font-mono text-emerald-400">sig<sup>e</sup> mod n = hash(message)</span>. This security rests on the <strong>RSA problem</strong> — factoring n into p and q.</p>
              </div>
            </div>
          </div>
        )}

        {/* Real-world note */}
        <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-4 mt-8">
          <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">Real-World Signatures</div>
          <div className="grid md:grid-cols-3 gap-3 text-xs text-slate-400">
            <div><span className="text-violet-400 font-bold">RSA-PKCS#1 v1.5</span> — used in TLS handshakes, code signing, email (S/MIME)</div>
            <div><span className="text-emerald-400 font-bold">ECDSA (P-256)</span> — Bitcoin transactions, TLS 1.3, JWT (ES256), SSH keys</div>
            <div><span className="text-amber-400 font-bold">Ed25519</span> — SSH, WireGuard, Signal. Faster & safer than ECDSA. No random nonce required.</div>
          </div>
        </div>

      </div>

      {/* Info Panel */}
      <div className={`fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-700 p-6 transform transition-transform duration-300 z-40 ${showInfo ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="max-w-3xl mx-auto relative">
          <button onClick={() => setShowInfo(false)} className="absolute top-0 right-0 p-2 text-slate-500 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <h3 className="text-xl font-bold text-violet-400 mb-2">About Digital Signatures</h3>
          <div className="text-sm text-slate-300 leading-relaxed space-y-2">
            <p>
              A <strong>digital signature</strong> provides three guarantees: <strong>authentication</strong> (it came from who you think),
              <strong> integrity</strong> (the message wasn't modified), and <strong>non-repudiation</strong> (the sender can't deny signing it).
            </p>
            <p>
              The trick: sign a <strong>hash</strong> of the message, not the message itself. Hashing is fast regardless of message size,
              and any 1-bit change to the message produces a completely different hash (avalanche effect).
            </p>
            <p>
              <strong>RSA signing</strong>: sig = hash<sup>d</sup> mod n (private key). Verification: recover = sig<sup>e</sup> mod n (public key).
              If recover equals the hash of the received message, the signature is valid. This works because (m<sup>d</sup>)<sup>e</sup> ≡ m (mod n) by Euler's theorem.
            </p>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

export default App;
