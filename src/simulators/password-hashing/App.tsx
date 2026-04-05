import React, { useState, useMemo, useCallback } from 'react';
import { Info, RotateCcw, RefreshCw, Check, X, ShieldCheck } from 'lucide-react';
import ExhibitPanel from '../../components/ExhibitPanel';

// ── SHA-256 ──────────────────────────────────────────────────────────
const SHA_K = [
  0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
  0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
  0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
  0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
  0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
  0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
  0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
  0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2,
];
function rotr(x: number, n: number) { return ((x >>> n) | (x << (32 - n))) >>> 0; }
function sha256bytes(data: Uint8Array): Uint8Array {
  const bits = data.length * 8;
  const arr: number[] = [...data, 0x80];
  while (arr.length % 64 !== 56) arr.push(0);
  for (let i = 7; i >= 0; i--) arr.push((bits / Math.pow(2, i * 8)) & 0xff);
  let [h0,h1,h2,h3,h4,h5,h6,h7] = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  for (let i = 0; i < arr.length; i += 64) {
    const w: number[] = [];
    for (let j = 0; j < 16; j++) w.push((arr[i+j*4]<<24)|(arr[i+j*4+1]<<16)|(arr[i+j*4+2]<<8)|arr[i+j*4+3]);
    for (let j = 16; j < 64; j++) {
      const s0 = rotr(w[j-15],7)^rotr(w[j-15],18)^(w[j-15]>>>3);
      const s1 = rotr(w[j-2],17)^rotr(w[j-2],19)^(w[j-2]>>>10);
      w.push((w[j-16]+s0+w[j-7]+s1)>>>0);
    }
    let [a,b,c,d,e,f,g,h] = [h0,h1,h2,h3,h4,h5,h6,h7];
    for (let j = 0; j < 64; j++) {
      const S1 = rotr(e,6)^rotr(e,11)^rotr(e,25);
      const ch = (e&f)^(~e&g);
      const T1 = (h+S1+ch+SHA_K[j]+w[j])>>>0;
      const S0 = rotr(a,2)^rotr(a,13)^rotr(a,22);
      const maj = (a&b)^(a&c)^(b&c);
      const T2 = (S0+maj)>>>0;
      [h,g,f,e,d,c,b,a] = [g,f,e,(d+T1)>>>0,c,b,a,(T1+T2)>>>0];
    }
    [h0,h1,h2,h3,h4,h5,h6,h7] = [(h0+a)>>>0,(h1+b)>>>0,(h2+c)>>>0,(h3+d)>>>0,(h4+e)>>>0,(h5+f)>>>0,(h6+g)>>>0,(h7+h)>>>0];
  }
  const out = new Uint8Array(32);
  [h0,h1,h2,h3,h4,h5,h6,h7].forEach((v,i) => { out[i*4]=(v>>>24)&0xff; out[i*4+1]=(v>>>16)&0xff; out[i*4+2]=(v>>>8)&0xff; out[i*4+3]=v&0xff; });
  return out;
}
function sha256str(s: string): Uint8Array { return sha256bytes(new TextEncoder().encode(s)); }
function toHex(b: Uint8Array) { return Array.from(b).map(x=>x.toString(16).padStart(2,'0')).join(''); }

// ── HMAC-SHA256 ──────────────────────────────────────────────────────
function hmacSha256(key: Uint8Array, data: Uint8Array): Uint8Array {
  let k = key.length > 64 ? sha256bytes(key) : key;
  const kPadded = new Uint8Array(64);
  kPadded.set(k);
  const ipad = kPadded.map(b => b ^ 0x36);
  const opad = kPadded.map(b => b ^ 0x5c);
  const inner = new Uint8Array(ipad.length + data.length);
  inner.set(ipad); inner.set(data, ipad.length);
  const innerHash = sha256bytes(inner);
  const outer = new Uint8Array(opad.length + innerHash.length);
  outer.set(opad); outer.set(innerHash, opad.length);
  return sha256bytes(outer);
}

// ── PBKDF2 (pure-JS, HMAC-SHA256 PRF) ───────────────────────────────
function pbkdf2(password: string, salt: string, iterations: number, dkLen = 32): Uint8Array {
  const pwd = new TextEncoder().encode(password);
  const slt = new TextEncoder().encode(salt);
  const dk = new Uint8Array(dkLen);
  const blockCount = Math.ceil(dkLen / 32);
  for (let bi = 1; bi <= blockCount; bi++) {
    const saltBlock = new Uint8Array(slt.length + 4);
    saltBlock.set(slt);
    saltBlock[slt.length] = (bi >>> 24) & 0xff;
    saltBlock[slt.length+1] = (bi >>> 16) & 0xff;
    saltBlock[slt.length+2] = (bi >>> 8) & 0xff;
    saltBlock[slt.length+3] = bi & 0xff;
    let U = hmacSha256(pwd, saltBlock);
    const T = new Uint8Array(U);
    for (let i = 1; i < iterations; i++) {
      U = hmacSha256(pwd, U);
      for (let j = 0; j < 32; j++) T[j] ^= U[j];
    }
    const offset = (bi - 1) * 32;
    dk.set(T.slice(0, Math.min(32, dkLen - offset)), offset);
  }
  return dk;
}

// ── bcrypt-style hash (simplified, captures format + cost factor) ────
const B64_CHARS = './ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
function toB64bcrypt(bytes: Uint8Array, len: number): string {
  let out = '';
  for (let i = 0, j = 0; j < len; i += 3, j++) {
    const b0 = bytes[i] || 0, b1 = bytes[i+1] || 0, b2 = bytes[i+2] || 0;
    out += B64_CHARS[(b0 >> 2) & 63];
    out += B64_CHARS[((b0 << 4) | (b1 >> 4)) & 63];
    out += B64_CHARS[((b1 << 2) | (b2 >> 6)) & 63];
    out += B64_CHARS[b2 & 63];
  }
  return out.slice(0, len);
}
function bcryptHash(password: string, saltHex: string, cost: number): string {
  // Simulate bcrypt: use PBKDF2 with 2^cost iterations (capped for perf)
  const cappedIter = Math.min(2 ** cost, 2048);
  const dk = pbkdf2(password, saltHex, cappedIter, 23);
  const saltB64 = toB64bcrypt(new TextEncoder().encode(saltHex), 22);
  const hashB64 = toB64bcrypt(dk, 31);
  return `$2b$${cost.toString().padStart(2,'0')}$${saltB64}${hashB64}`;
}

// ── Argon2-style (simulated — captures memory-hardness concept) ──────
function argon2Hash(password: string, saltHex: string, timeCost: number, memoryCost: number): string {
  // Real Argon2 fills a memory matrix and XORs it — we simulate the output format
  const iters = Math.min(timeCost * 4, 32);
  const dk = pbkdf2(password + memoryCost.toString(), saltHex, iters, 32);
  const saltB64 = btoa(saltHex).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  const hashB64 = btoa(toHex(dk)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  return `$argon2id$v=19$m=${memoryCost},t=${timeCost},p=1$${saltB64.slice(0,22)}$${hashB64.slice(0,43)}`;
}

// ── Random salt ───────────────────────────────────────────────────────
function randomSalt(len = 16): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(len)))
    .map(b => b.toString(16).padStart(2,'0')).join('');
}

// ── Brute-force time estimator ────────────────────────────────────────
const HASH_RATES: Record<string, { label: string; hps: number }> = {
  md5:    { label: 'MD5 (GPU)',     hps: 200e9 },
  sha256: { label: 'SHA-256 (GPU)', hps: 23e9  },
  pbkdf2: { label: 'PBKDF2-100k',  hps: 1.2e6 },
  bcrypt: { label: 'bcrypt-12',     hps: 6500  },
  argon2: { label: 'Argon2id',      hps: 100   },
};
const CHARSET_SIZES: Record<string, number> = {
  digits: 10, lower: 26, mixed: 52, full: 95,
};
function formatTime(seconds: number): string {
  if (seconds < 1) return `${(seconds * 1000).toFixed(1)} ms`;
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  if (seconds < 3600) return `${(seconds/60).toFixed(1)} min`;
  if (seconds < 86400) return `${(seconds/3600).toFixed(1)} hr`;
  if (seconds < 86400*365) return `${(seconds/86400).toFixed(0)} days`;
  if (seconds < 86400*365*1000) return `${(seconds/(86400*365)).toFixed(0)} years`;
  return `${(seconds/(86400*365*1e6)).toFixed(0)}M years`;
}

// ── App ───────────────────────────────────────────────────────────────
export default function App() {
  const [password, setPassword] = useState('hunter2');
  const [verifyInput, setVerifyInput] = useState('hunter2');
  const [saltA, setSaltA] = useState(() => randomSalt());
  const [saltB, setSaltB] = useState(() => randomSalt());
  const [pbkdf2Iters, setPbkdf2Iters] = useState(10000);
  const [bcryptCost, setBcryptCost] = useState(10);
  const [argon2Time, setArgon2Time] = useState(3);
  const [argon2Mem, setArgon2Mem] = useState(65536);
  const [showInfo, setShowInfo] = useState(false);
  const [activeTab, setActiveTab] = useState<'demo' | 'rainbow' | 'brute'>('demo');
  const [charset, setCharset] = useState<keyof typeof CHARSET_SIZES>('mixed');
  const [pwLen, setPwLen] = useState(8);

  // Hashes for salt A
  const hashA = useMemo(() => ({
    sha256: toHex(sha256str(password)),
    pbkdf2: toHex(pbkdf2(password, saltA, pbkdf2Iters)),
    bcrypt: bcryptHash(password, saltA, bcryptCost),
    argon2: argon2Hash(password, saltA, argon2Time, argon2Mem),
  }), [password, saltA, pbkdf2Iters, bcryptCost, argon2Time, argon2Mem]);

  // Hashes for salt B (same password, different salt)
  const hashB = useMemo(() => ({
    sha256: toHex(sha256str(password)),
    pbkdf2: toHex(pbkdf2(password, saltB, pbkdf2Iters)),
    bcrypt: bcryptHash(password, saltB, bcryptCost),
    argon2: argon2Hash(password, saltB, argon2Time, argon2Mem),
  }), [password, saltB, pbkdf2Iters, bcryptCost, argon2Time, argon2Mem]);

  // Verify: does verifyInput match stored hash (salt A PBKDF2)?
  const verifyMatch = useMemo(() => {
    const attempt = toHex(pbkdf2(verifyInput, saltA, pbkdf2Iters));
    return attempt === hashA.pbkdf2;
  }, [verifyInput, saltA, pbkdf2Iters, hashA.pbkdf2]);

  const rerollSalts = useCallback(() => {
    setSaltA(randomSalt());
    setSaltB(randomSalt());
  }, []);

  // Highlight differing chars between two hex strings
  function diffHex(a: string, b: string) {
    return a.split('').map((ch, i) => (
      <span key={i} className={ch !== b[i] ? 'text-amber-400 font-bold' : 'text-slate-600'}>{ch}</span>
    ));
  }

  return (
    <div className="flex-1 bg-[#0d1117] flex flex-col">
      <ExhibitPanel id="password-hashing" />
      <div className="bg-[#0d1117] flex flex-col items-center py-10 px-6 text-slate-200">
      <div className="w-full max-w-4xl">

        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl sm:text-4xl font-typewriter font-bold text-slate-100 tracking-tighter">
              <span className="text-lime-400">PASSWORD</span> HASHING
            </h1>
            <span className="text-slate-500 text-xs tracking-[0.3em] font-mono">PBKDF2 · BCRYPT · ARGON2 — WHY SLOW IS SAFE</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 border border-slate-700"><Info size={20} /></button>
            <button onClick={() => { setPassword('hunter2'); setVerifyInput('hunter2'); }} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 border border-slate-700"><RotateCcw size={20} /></button>
          </div>
        </div>

        {/* Password input */}
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 mb-8">
          <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">Password</label>
          <input
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 font-mono text-xl tracking-wider text-lime-300 focus:outline-none focus:ring-2 focus:ring-lime-500/40 text-center"
            placeholder="enter password"
            spellCheck={false}
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          {([
            { id: 'demo', label: '⚙ Algorithms' },
            { id: 'rainbow', label: '🌈 Salt & Rainbow Tables' },
            { id: 'brute', label: '⏱ Brute Force Time' },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2.5 rounded-lg font-bold text-sm border transition-all ${
                activeTab === t.id
                  ? 'bg-lime-900/50 border-lime-700 text-lime-300'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
              }`}>{t.label}</button>
          ))}
        </div>

        {/* ── ALGORITHMS TAB ── */}
        {activeTab === 'demo' && (
          <div className="space-y-6">
            {/* SHA-256 (raw) */}
            <div className="bg-red-950/20 rounded-2xl border border-red-900/40 p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-base font-bold text-red-400">SHA-256 (raw) — ❌ Never use for passwords</h3>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">No salt · No iterations · ~23 billion/sec on GPU</p>
                </div>
                <span className="text-[9px] font-bold px-2 py-1 rounded-full border bg-red-900/40 text-red-300 border-red-700/50">INSECURE</span>
              </div>
              <div className="font-mono text-xs text-red-300/80 break-all bg-slate-900/40 rounded-lg p-3">
                {hashA.sha256}
              </div>
              <p className="text-[10px] text-red-500/70 mt-2">
                Attacker with GPU can try every 8-char password in under 1 second. No salt means identical passwords produce identical hashes.
              </p>
            </div>

            {/* PBKDF2 */}
            <div className="bg-slate-900/40 rounded-2xl border border-slate-800 p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-amber-400">PBKDF2 — ✓ Acceptable</h3>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">Salt + iterations · HMAC-SHA256 PRF · NIST SP 800-132</p>
                </div>
                <span className="text-[9px] font-bold px-2 py-1 rounded-full border bg-amber-900/40 text-amber-300 border-amber-700/50">ACCEPTABLE</span>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[10px] text-slate-500 font-mono shrink-0">Iterations: {pbkdf2Iters.toLocaleString()}</span>
                <input type="range" min="1000" max="600000" step="1000" value={pbkdf2Iters}
                  onChange={e => setPbkdf2Iters(+e.target.value)}
                  className="flex-1 accent-amber-500" />
                <span className="text-[10px] text-slate-500 font-mono shrink-0 w-16 text-right">
                  {pbkdf2Iters >= 600000 ? '600k' : `${(pbkdf2Iters/1000).toFixed(0)}k`}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono mb-2">salt: {saltA.slice(0,16)}...</div>
              <div className="font-mono text-xs text-amber-300 break-all bg-slate-900/60 rounded-lg p-3">
                {hashA.pbkdf2}
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-[10px] font-mono text-slate-500">
                <div>HMAC-SHA256 repeated {pbkdf2Iters.toLocaleString()}×</div>
                <div>Each iteration depends on previous</div>
                <div>≈ {Math.round(1.2e6 / pbkdf2Iters).toLocaleString()} attempts/sec on GPU</div>
              </div>

              {/* Verify box */}
              <div className="mt-4 border-t border-slate-800 pt-4">
                <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">Verify a password attempt</label>
                <div className="flex gap-3">
                  <input value={verifyInput} onChange={e => setVerifyInput(e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 font-mono text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-lime-500/30"
                    placeholder="try the password..."
                    spellCheck={false} />
                  <div className={`px-4 py-2 rounded-lg border font-bold text-sm flex items-center gap-2 ${
                    verifyMatch ? 'bg-emerald-900/40 border-emerald-700 text-emerald-300' : 'bg-red-900/30 border-red-900/50 text-red-400'
                  }`}>
                    {verifyMatch ? <Check size={16} /> : <X size={16} />}
                    {verifyMatch ? 'Match' : 'No match'}
                  </div>
                </div>
                <p className="text-[10px] text-slate-600 mt-1">Re-hashes your input with the same salt and compares. The stored hash is never decrypted.</p>
              </div>
            </div>

            {/* bcrypt */}
            <div className="bg-slate-900/40 rounded-2xl border border-slate-800 p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-lime-400">bcrypt — ✓ Good</h3>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">Blowfish-based · Cost parameter · 128-bit salt built in</p>
                </div>
                <span className="text-[9px] font-bold px-2 py-1 rounded-full border bg-lime-900/40 text-lime-300 border-lime-700/50">GOOD</span>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[10px] text-slate-500 font-mono shrink-0">Cost: {bcryptCost}</span>
                <input type="range" min="4" max="14" step="1" value={bcryptCost}
                  onChange={e => setBcryptCost(+e.target.value)}
                  className="flex-1 accent-lime-500" />
                <span className="text-[10px] text-slate-400 font-mono shrink-0 w-24 text-right">
                  2<sup>{bcryptCost}</sup> = {(2**bcryptCost).toLocaleString()} rounds
                </span>
              </div>
              <div className="font-mono text-xs text-lime-300 break-all bg-slate-900/60 rounded-lg p-3">
                <span className="text-slate-500">$2b$</span>
                <span className="text-amber-400">{bcryptCost.toString().padStart(2,'0')}$</span>
                <span className="text-lime-400">{hashA.bcrypt.slice(7, 29)}</span>
                <span className="text-lime-200">{hashA.bcrypt.slice(29)}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-[10px] font-mono text-slate-500">
                <div><span className="text-amber-400">$2b$10$</span> → version + cost</div>
                <div><span className="text-lime-400">22 chars</span> → base64 salt</div>
                <div><span className="text-lime-200">31 chars</span> → hash</div>
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-1">
                ≈ {Math.round(6500 / Math.pow(2, bcryptCost - 12)).toLocaleString()} attempts/sec on GPU at cost={bcryptCost}
              </div>
            </div>

            {/* Argon2 */}
            <div className="bg-slate-900/40 rounded-2xl border border-emerald-900/30 p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-emerald-400">Argon2id — ✓✓ Best</h3>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">PHC winner 2015 · Memory-hard · Time + Memory cost</p>
                </div>
                <span className="text-[9px] font-bold px-2 py-1 rounded-full border bg-emerald-900/40 text-emerald-300 border-emerald-700/50">RECOMMENDED</span>
              </div>
              <div className="grid md:grid-cols-2 gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-[10px] text-slate-500 font-mono shrink-0 w-24">Time cost: {argon2Time}</span>
                    <input type="range" min="1" max="10" step="1" value={argon2Time}
                      onChange={e => setArgon2Time(+e.target.value)}
                      className="flex-1 accent-emerald-500" />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-500 font-mono shrink-0 w-24">Memory: {(argon2Mem/1024).toFixed(0)} MB</span>
                    <input type="range" min="4096" max="262144" step="4096" value={argon2Mem}
                      onChange={e => setArgon2Mem(+e.target.value)}
                      className="flex-1 accent-emerald-500" />
                  </div>
                </div>
                <div className="text-[10px] font-mono text-slate-500 space-y-1">
                  <div>Each attempt requires {(argon2Mem/1024).toFixed(0)} MB RAM</div>
                  <div>GPU has ~8 GB VRAM → fits ≈{Math.floor(8192/(argon2Mem/1024))} parallel workers</div>
                  <div>≈ {Math.max(1, Math.round(100 * 65536 / argon2Mem)).toLocaleString()} attempts/sec</div>
                </div>
              </div>
              <div className="font-mono text-xs text-emerald-300 break-all bg-slate-900/60 rounded-lg p-3">
                <span className="text-slate-500">$argon2id$v=19$</span>
                <span className="text-amber-400">m={argon2Mem},t={argon2Time},p=1</span>
                <span className="text-slate-500">$</span>
                <span className="text-emerald-400">{hashA.argon2.split('$').slice(-2)[0]}</span>
                <span className="text-slate-500">$</span>
                <span className="text-emerald-200">{hashA.argon2.split('$').slice(-1)[0]}</span>
              </div>
              <div className="text-[10px] text-emerald-600 mt-2">
                Memory-hardness defeats GPU/ASIC attacks — RAM can't be parallelized as cheaply as compute.
              </div>
            </div>
          </div>
        )}

        {/* ── RAINBOW TABLE TAB ── */}
        {activeTab === 'rainbow' && (
          <div className="space-y-6">
            <div className="bg-slate-900/40 rounded-2xl border border-slate-800 p-5">
              <h3 className="text-base font-bold text-white mb-2">Same password, different salts</h3>
              <p className="text-sm text-slate-400 mb-4">
                A rainbow table is a precomputed lookup of hashes → passwords. A <strong>salt</strong> is a random value
                mixed into the password before hashing. Even if two users have the same password, their hashes are completely different.
              </p>
              <div className="flex items-center gap-3 mb-5">
                <span className="text-sm text-slate-300 font-mono">Password: <span className="text-lime-400 font-bold">"{password}"</span></span>
                <button onClick={rerollSalts} className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 border border-slate-700 text-slate-400 hover:text-white">
                  <RefreshCw size={12} /> New Salts
                </button>
              </div>

              {/* Two users side by side */}
              <div className="grid md:grid-cols-2 gap-4">
                {[{ label: 'User Alice', salt: saltA, hash: hashA }, { label: 'User Bob', salt: saltB, hash: hashB }].map(({ label, salt, hash }) => (
                  <div key={label} className="bg-slate-800/40 rounded-xl border border-slate-700 p-4">
                    <div className="text-xs font-bold text-slate-300 mb-3">{label}</div>
                    <div className="text-[10px] text-slate-500 font-mono mb-1">Salt:</div>
                    <div className="font-mono text-[10px] text-amber-400 bg-amber-950/20 rounded p-1.5 mb-3 break-all">{salt}</div>
                    <div className="text-[10px] text-slate-500 font-mono mb-1">SHA-256 (no salt):</div>
                    <div className="font-mono text-[10px] text-red-300/70 bg-red-950/10 rounded p-1.5 mb-3 break-all">{hash.sha256}</div>
                    <div className="text-[10px] text-slate-500 font-mono mb-1">PBKDF2 (salted):</div>
                    <div className="font-mono text-[10px] text-lime-300 bg-lime-950/20 rounded p-1.5 break-all">{hash.pbkdf2}</div>
                  </div>
                ))}
              </div>

              {/* Show identical SHA-256 */}
              <div className="mt-4 p-3 rounded-lg bg-red-950/20 border border-red-900/30">
                <div className="text-[10px] text-red-400 font-bold mb-1">Without salt: identical hashes expose the password</div>
                <div className="font-mono text-[10px] text-slate-400">
                  Alice's SHA-256: <span className="text-red-300">{hashA.sha256.slice(0, 32)}…</span>
                </div>
                <div className="font-mono text-[10px] text-slate-400">
                  Bob's SHA-256:&nbsp;&nbsp; <span className="text-red-300">{hashB.sha256.slice(0, 32)}…</span>
                </div>
                <div className="text-[10px] text-red-400 mt-1">↑ Identical! An attacker cracking one cracks both.</div>
              </div>

              <div className="mt-4 p-3 rounded-lg bg-lime-950/20 border border-lime-900/30">
                <div className="text-[10px] text-lime-400 font-bold mb-1">With salt: completely different hashes</div>
                <div className="font-mono text-[9px] text-slate-400">
                  Alice's PBKDF2: <span className="text-lime-300">{diffHex(hashA.pbkdf2, hashB.pbkdf2)}</span>
                </div>
                <div className="font-mono text-[9px] text-slate-400 mt-1">
                  Bob's PBKDF2:&nbsp;&nbsp; <span className="text-lime-300">{diffHex(hashB.pbkdf2, hashA.pbkdf2)}</span>
                </div>
                <div className="text-[10px] text-lime-400 mt-1">
                  {hashA.pbkdf2.split('').filter((c,i)=>c!==hashB.pbkdf2[i]).length}/64 hex chars differ. Rainbow tables are useless.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── BRUTE FORCE TAB ── */}
        {activeTab === 'brute' && (
          <div className="space-y-6">
            <div className="bg-slate-900/40 rounded-2xl border border-slate-800 p-5">
              <h3 className="text-base font-bold text-white mb-4">How long would it take to crack?</h3>
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">Password length</label>
                  <div className="flex items-center gap-3">
                    <input type="range" min="4" max="20" value={pwLen} onChange={e => setPwLen(+e.target.value)} className="flex-1 accent-lime-500" />
                    <span className="text-lime-400 font-bold font-mono w-8 text-right">{pwLen}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">Character set</label>
                  <div className="flex gap-2 flex-wrap">
                    {(Object.keys(CHARSET_SIZES) as Array<keyof typeof CHARSET_SIZES>).map(cs => (
                      <button key={cs} onClick={() => setCharset(cs)}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-colors ${charset === cs ? 'bg-lime-900/50 border-lime-700 text-lime-300' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-white'}`}>
                        {cs} ({CHARSET_SIZES[cs]})
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 font-mono mb-4">
                Search space: {CHARSET_SIZES[charset]}<sup>{pwLen}</sup> = {(Math.pow(CHARSET_SIZES[charset], pwLen)).toExponential(2)} combinations
              </div>

              <div className="space-y-2">
                {Object.entries(HASH_RATES).map(([k, { label, hps }]) => {
                  const space = Math.pow(CHARSET_SIZES[charset], pwLen);
                  const seconds = space / (hps * 2); // avg = half search space
                  const width = Math.min(100, Math.max(2, Math.log10(seconds + 1) * 5));
                  const isGood = seconds > 86400 * 365 * 10;
                  return (
                    <div key={k} className="flex items-center gap-3">
                      <div className="w-36 shrink-0 text-[10px] font-mono text-slate-400">{label}</div>
                      <div className="flex-1 bg-slate-800/40 rounded-full h-5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${k === 'md5' || k === 'sha256' ? 'bg-red-700' : k === 'pbkdf2' ? 'bg-amber-600' : k === 'bcrypt' ? 'bg-lime-700' : 'bg-emerald-600'}`}
                          style={{ width: `${width}%` }}
                        />
                      </div>
                      <div className={`w-28 text-right text-[10px] font-mono font-bold shrink-0 ${isGood ? 'text-emerald-400' : seconds > 3600 ? 'text-amber-400' : 'text-red-400'}`}>
                        {formatTime(seconds)}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 text-[10px] text-slate-600 font-mono">
                Assumes single GPU, worst-case attacker (Hashcat benchmarks). Actual time = search_space ÷ (2 × hashes_per_second).
              </div>
            </div>

            {/* Password strength tips */}
            <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-4">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">Key Takeaways</div>
              <div className="grid md:grid-cols-2 gap-2 text-xs text-slate-400">
                <div className="flex gap-2"><span className="text-lime-400 shrink-0">✓</span>Use bcrypt or Argon2id, never SHA-256 or MD5</div>
                <div className="flex gap-2"><span className="text-lime-400 shrink-0">✓</span>Longer passwords beat complexity every time</div>
                <div className="flex gap-2"><span className="text-lime-400 shrink-0">✓</span>Salt is non-negotiable — prevent rainbow tables</div>
                <div className="flex gap-2"><span className="text-lime-400 shrink-0">✓</span>Tune cost so hashing takes ≥100ms on your server</div>
                <div className="flex gap-2"><span className="text-red-400 shrink-0">✗</span>Never store plaintext or reversible encryption</div>
                <div className="flex gap-2"><span className="text-red-400 shrink-0">✗</span>Don't implement your own scheme — use a library</div>
              </div>
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
          <h3 className="text-xl font-bold text-lime-400 mb-2">About Password Hashing</h3>
          <div className="text-sm text-slate-300 leading-relaxed space-y-2">
            <p>Passwords must never be stored in plaintext or with reversible encryption. Instead, a <strong>one-way hash</strong> is stored. When a user logs in, their input is hashed and compared to the stored value.</p>
            <p><strong>General-purpose hashes</strong> (MD5, SHA-256) are designed to be fast — that's the problem. A GPU can try billions per second. <strong>Password hashing functions</strong> are deliberately slow, with a tuneable cost parameter.</p>
            <p><strong>bcrypt</strong> (1999) uses the Blowfish cipher with an expensive key schedule. Cost 10 means 2¹⁰ = 1,024 rounds. <strong>PBKDF2</strong> iterates HMAC thousands of times. <strong>Argon2id</strong> (2015 PHC winner) adds memory-hardness, defeating ASIC/GPU attacks by requiring large amounts of RAM per attempt.</p>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
