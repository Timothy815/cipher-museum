import React, { useState, useMemo, useCallback } from 'react';
import { Info, X, RefreshCw, Lock, Unlock, Copy, Check, Shield, ShieldAlert } from 'lucide-react';

// ── BigInt math utilities ───────────────────────────────────────────

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  if (mod === 1n) return 0n;
  let result = 1n;
  base = ((base % mod) + mod) % mod;
  while (exp > 0n) {
    if (exp & 1n) result = (result * base) % mod;
    exp >>= 1n;
    base = (base * base) % mod;
  }
  return result;
}

function gcd(a: bigint, b: bigint): bigint {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b > 0n) { [a, b] = [b, a % b]; }
  return a;
}

function extendedGcd(a: bigint, b: bigint): { g: bigint; x: bigint; y: bigint } {
  if (a === 0n) return { g: b, x: 0n, y: 1n };
  const { g, x, y } = extendedGcd(b % a, a);
  return { g, x: y - (b / a) * x, y: x };
}

function modInverse(a: bigint, mod: bigint): bigint | null {
  const { g, x } = extendedGcd(a % mod, mod);
  if (g !== 1n) return null;
  return ((x % mod) + mod) % mod;
}

function isPrime(n: bigint): boolean {
  if (n < 2n) return false;
  if (n < 4n) return true;
  if (n % 2n === 0n || n % 3n === 0n) return false;
  // Trial division for small factors
  for (let i = 5n; i * i <= n && i < 10000n; i += 6n) {
    if (n % i === 0n || n % (i + 2n) === 0n) return false;
  }
  // Miller-Rabin for larger numbers
  if (n > 10000n) {
    let d = n - 1n;
    let r = 0n;
    while (d % 2n === 0n) { d >>= 1n; r++; }
    const witnesses = [2n, 3n, 5n, 7n, 11n, 13n];
    for (const a of witnesses) {
      if (a >= n) continue;
      let x = modPow(a, d, n);
      if (x === 1n || x === n - 1n) continue;
      let composite = true;
      for (let i = 0n; i < r - 1n; i++) {
        x = (x * x) % n;
        if (x === n - 1n) { composite = false; break; }
      }
      if (composite) return false;
    }
  }
  return true;
}

function randomPrime(min: number, max: number): bigint {
  let attempts = 0;
  while (attempts < 5000) {
    const n = BigInt(Math.floor(Math.random() * (max - min)) + min) | 1n;
    if (isPrime(n)) return n;
    attempts++;
  }
  return 61n; // fallback
}

function randomBigInt(bits: number): bigint {
  const bytes = new Uint8Array(Math.ceil(bits / 8));
  crypto.getRandomValues(bytes);
  // Mask top byte to get exact bit length
  const excessBits = bytes.length * 8 - bits;
  if (excessBits > 0) bytes[0] &= (1 << (8 - excessBits)) - 1;
  // Set the top bit to ensure we get a number of the right magnitude
  bytes[0] |= 1 << (7 - excessBits);
  let n = 0n;
  for (const byte of bytes) n = (n << 8n) | BigInt(byte);
  return n;
}

function randomBigPrime(bits: number): bigint {
  for (let attempts = 0; attempts < 10000; attempts++) {
    let candidate = randomBigInt(bits);
    candidate |= 1n; // ensure odd
    if (isPrime(candidate)) return candidate;
  }
  // Fallback: increment until we find a prime
  let candidate = randomBigInt(bits) | 1n;
  while (!isPrime(candidate)) candidate += 2n;
  return candidate;
}

function trialFactor(n: bigint): { p: bigint; q: bigint; steps: number; found: boolean } {
  if (n % 2n === 0n) return { p: 2n, q: n / 2n, steps: 1, found: true };
  let steps = 0;
  for (let i = 3n; i * i <= n && steps < 500000; i += 2n) {
    steps++;
    if (n % i === 0n) return { p: i, q: n / i, steps, found: true };
  }
  return { p: 0n, q: 0n, steps, found: false };
}

// ── Presets ──────────────────────────────────────────────────────────

const PRIME_PRESETS = [
  { label: 'Tiny (61, 53)', p: '61', q: '53' },
  { label: 'Small (257, 263)', p: '257', q: '263' },
  { label: 'Medium (104729, 104723)', p: '104729', q: '104723' },
];

const BIT_SIZE_OPTIONS = [
  { label: '8-bit', bits: 8, desc: 'Trivially breakable' },
  { label: '16-bit', bits: 16, desc: 'Breakable instantly' },
  { label: '32-bit', bits: 32, desc: 'Seconds to factor' },
  { label: '64-bit', bits: 64, desc: 'Minutes on a laptop' },
  { label: '128-bit', bits: 128, desc: 'Expensive but feasible' },
  { label: '256-bit', bits: 256, desc: 'Currently very hard' },
  { label: '512-bit', bits: 512, desc: 'Broken by researchers (1999)' },
  { label: '1024-bit', bits: 1024, desc: 'Deprecated, still used' },
  { label: '2048-bit', bits: 2048, desc: 'Current standard minimum' },
];

const E_OPTIONS = [
  { label: '3', value: '3' },
  { label: '17', value: '17' },
  { label: '65537 (standard)', value: '65537' },
];

// ── Component ───────────────────────────────────────────────────────

const App: React.FC = () => {
  const [showInfo, setShowInfo] = useState(false);
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [pStr, setPStr] = useState('61');
  const [qStr, setQStr] = useState('53');
  const [eStr, setEStr] = useState('17');
  const [plaintext, setPlaintext] = useState('Hello RSA!');
  const [ciphertextInput, setCiphertextInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [showFactoring, setShowFactoring] = useState(false);
  const [factorResult, setFactorResult] = useState<{
    p: bigint; q: bigint; steps: number; found: boolean; timeMs: number;
  } | null>(null);
  const [generating, setGenerating] = useState(false);

  const inputClass = 'bg-slate-900/80 border border-slate-700 rounded-lg px-5 py-4 font-mono text-base text-white focus:outline-none focus:border-violet-700/50 w-full';
  const labelClass = 'text-sm font-bold text-slate-400 uppercase tracking-wider';
  const panelClass = 'bg-slate-900/60 border border-slate-800 rounded-xl p-6 md:p-8 overflow-hidden';

  // ── Key generation ──────────────────────────────────────────────

  const p = useMemo(() => { try { return BigInt(pStr); } catch { return 61n; } }, [pStr]);
  const q = useMemo(() => { try { return BigInt(qStr); } catch { return 53n; } }, [qStr]);
  const e = useMemo(() => { try { return BigInt(eStr); } catch { return 17n; } }, [eStr]);

  const n = useMemo(() => p * q, [p, q]);
  const phi = useMemo(() => (p - 1n) * (q - 1n), [p, q]);
  const gcdVal = useMemo(() => gcd(e, phi), [e, phi]);
  const d = useMemo(() => modInverse(e, phi), [e, phi]);

  const pValid = useMemo(() => isPrime(p), [p]);
  const qValid = useMemo(() => isPrime(q), [q]);
  const eValid = gcdVal === 1n && e > 1n && e < phi;
  const keyValid = pValid && qValid && eValid && d !== null && p !== q;

  // ── Extended GCD steps for display ────────────────────────────

  const egcdSteps = useMemo(() => {
    if (!eValid || phi <= 0n) return [];
    const steps: string[] = [];
    let a = e % phi, b = phi;
    const stack: { a: bigint; b: bigint }[] = [];
    while (a !== 0n) {
      stack.push({ a, b });
      [a, b] = [b % a, a];
    }
    steps.push(`gcd(${e}, ${phi})`);
    for (const { a: ai, b: bi } of stack) {
      const quotient = bi / ai;
      steps.push(`  ${bi} = ${quotient} * ${ai} + ${bi % ai}`);
    }
    steps.push(`Back-substituting to find d such that e*d ≡ 1 (mod φ)`);
    if (d !== null) steps.push(`  d = ${d}`);
    return steps;
  }, [e, phi, eValid, d]);

  // ── Encrypt ───────────────────────────────────────────────────

  const encrypted = useMemo(() => {
    if (!keyValid) return [];
    const bytes = new TextEncoder().encode(plaintext);
    return Array.from(bytes).map(byte => {
      const m = BigInt(byte);
      const c = modPow(m, e, n);
      return { m, c };
    });
  }, [plaintext, e, n, keyValid]);

  const ciphertextArray = encrypted.map(x => x.c);
  const ciphertextHex = ciphertextArray.map(c => c.toString(16).padStart(2, '0')).join(' ');
  const ciphertextNums = ciphertextArray.map(c => c.toString()).join(', ');

  // ── Decrypt ───────────────────────────────────────────────────

  const decrypted = useMemo(() => {
    if (!keyValid || !d || !ciphertextInput.trim()) return null;
    try {
      let nums: bigint[];
      const trimmed = ciphertextInput.trim();
      if (/^[\da-fA-F\s]+$/.test(trimmed) && trimmed.includes(' ') && !trimmed.includes(',')) {
        // hex format
        nums = trimmed.split(/\s+/).map(h => BigInt('0x' + h));
      } else {
        // number array format
        nums = trimmed.split(/[,\s]+/).filter(Boolean).map(s => BigInt(s.trim()));
      }
      const decBytes = nums.map(c => {
        const m = modPow(c, d, n);
        return { c, m };
      });
      const text = new TextDecoder().decode(new Uint8Array(decBytes.map(x => Number(x.m))));
      return { pairs: decBytes, text };
    } catch {
      return null;
    }
  }, [ciphertextInput, d, n, keyValid]);

  // ── Factoring challenge ───────────────────────────────────────

  const attemptFactor = useCallback(() => {
    const start = performance.now();
    const result = trialFactor(n);
    const timeMs = performance.now() - start;
    setFactorResult({ ...result, timeMs });
    setShowFactoring(true);
  }, [n]);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const generateRandomPrimes = (bits?: number) => {
    if (!bits) {
      const rp = randomPrime(50, 500);
      let rq = randomPrime(50, 500);
      while (rq === rp) rq = randomPrime(50, 500);
      setPStr(rp.toString());
      setQStr(rq.toString());
      return;
    }
    // Each prime is bits/2 bits so that n is approximately `bits` bits
    const primeBits = Math.max(4, Math.floor(bits / 2));
    setGenerating(true);
    // Use setTimeout to let the UI update before heavy computation
    setTimeout(() => {
      try {
        const rp = randomBigPrime(primeBits);
        let rq = randomBigPrime(primeBits);
        while (rq === rp) rq = randomBigPrime(primeBits);
        setPStr(rp.toString());
        setQStr(rq.toString());
        setEStr('65537');
        setFactorResult(null);
      } finally {
        setGenerating(false);
      }
    }, 50);
  };

  return (
    <div className="flex-1 bg-[#1a1814] text-white flex flex-col items-center px-6 py-8 sm:px-10 md:px-16 md:py-8">
      <div className="w-full max-w-6xl space-y-8">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-violet-400">RSA Cryptosystem</h1>
            <p className="text-sm text-slate-400 mt-1">Public-key encryption based on the difficulty of factoring large numbers</p>
          </div>
          <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-violet-700/50 transition-colors">
            {showInfo ? <X size={20} className="text-violet-400" /> : <Info size={20} className="text-violet-400" />}
          </button>
        </div>

        {/* ── Info Panel ─────────────────────────────────────── */}
        {showInfo && (
          <div className="bg-violet-950/20 border border-violet-900/40 rounded-xl p-6 space-y-3 text-sm text-slate-300 leading-relaxed">
            <h2 className="text-base font-bold text-violet-400">About RSA</h2>
            <p>Publicly described in 1977 by <strong className="text-white">Ron Rivest</strong>, <strong className="text-white">Adi Shamir</strong>, and <strong className="text-white">Leonard Adleman</strong> at MIT. However, an equivalent system was secretly developed in 1973 by <strong className="text-white">Clifford Cocks</strong> at GCHQ, remaining classified until 1997.</p>
            <p>RSA's security rests on the <strong className="text-white">Integer Factorization Problem</strong>: multiplying two large primes is trivial, but factoring their product back into those primes is computationally infeasible for sufficiently large numbers. A 2048-bit RSA modulus (about 617 digits) is currently considered secure.</p>
            <p><strong className="text-white">RSA-129</strong>, a 129-digit challenge number published in 1977, was factored in 1994 using ~1,600 machines over 8 months. The RSA Factoring Challenge offered prizes for factoring progressively larger semiprimes; the largest publicly factored RSA number is RSA-250 (250 digits, factored in 2020).</p>
            <p><strong className="text-white">Used in:</strong> PGP/GPG email encryption, TLS/SSL certificates, SSH keys, code signing, secure boot, digital signatures (PKCS#1). RSA is typically used to encrypt a symmetric key rather than bulk data.</p>
            <p><strong className="text-white">The shift to elliptic curves:</strong> ECC achieves equivalent security with far smaller keys. A 256-bit ECC key offers roughly the same security as a 3072-bit RSA key. This matters for constrained devices, certificate sizes, and TLS handshake speed. Post-quantum algorithms (CRYSTALS-Kyber, CRYSTALS-Dilithium) are also emerging as replacements.</p>
            <table className="text-xs mt-2 border-collapse">
              <thead><tr className="text-violet-400">
                <th className="pr-4 text-left">Security Level</th><th className="pr-4 text-left">RSA Key Size</th><th className="text-left">ECC Key Size</th>
              </tr></thead>
              <tbody className="text-slate-400">
                <tr><td className="pr-4">80-bit</td><td className="pr-4">1024 bits</td><td>160 bits</td></tr>
                <tr><td className="pr-4">128-bit</td><td className="pr-4">3072 bits</td><td>256 bits</td></tr>
                <tr><td className="pr-4">256-bit</td><td className="pr-4">15360 bits</td><td>512 bits</td></tr>
              </tbody>
            </table>
          </div>
        )}

        {/* ── Key Generation ─────────────────────────────────── */}
        <div className={panelClass}>
          <h2 className="text-sm font-bold text-violet-400 uppercase tracking-wider mb-4">Step 1 — Key Generation</h2>

          {/* Prime inputs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className={`${labelClass} block mb-1`}>
                Prime p {pStr.length > 0 && (pValid ? <span className="text-emerald-400 ml-1">prime ({p.toString(2).length}-bit)</span> : <span className="text-red-400 ml-1">not prime</span>)}
              </label>
              <textarea value={pStr} onChange={e => { setPStr(e.target.value); setFactorResult(null); }}
                className={inputClass + ' resize-none min-h-[44px] max-h-32'} rows={pStr.length > 80 ? 3 : 1} />
            </div>
            <div>
              <label className={`${labelClass} block mb-1`}>
                Prime q {qStr.length > 0 && (qValid ? <span className="text-emerald-400 ml-1">prime ({q.toString(2).length}-bit)</span> : <span className="text-red-400 ml-1">not prime</span>)}
              </label>
              <textarea value={qStr} onChange={e => { setQStr(e.target.value); setFactorResult(null); }}
                className={inputClass + ' resize-none min-h-[44px] max-h-32'} rows={qStr.length > 80 ? 3 : 1} />
            </div>
            <div>
              <label className={`${labelClass} block mb-1`}>
                Public exponent e
              </label>
              <select value={eStr} onChange={e => setEStr(e.target.value)}
                className={inputClass + ' cursor-pointer'}>
                {E_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Presets */}
          <div className="flex gap-2 mb-3 flex-wrap">
            {PRIME_PRESETS.map(pr => (
              <button key={pr.label} onClick={() => { setPStr(pr.p); setQStr(pr.q); setFactorResult(null); }}
                className="px-3 py-1.5 text-xs font-mono bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:border-violet-700/50 hover:text-violet-400 transition-colors">
                {pr.label}
              </button>
            ))}
            <button onClick={() => generateRandomPrimes()}
              className="px-3 py-1.5 text-xs font-mono bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:border-violet-700/50 hover:text-violet-400 transition-colors flex items-center gap-1.5">
              <RefreshCw size={12} /> Random Small
            </button>
          </div>

          {/* Generate by bit size */}
          <div className="mb-5">
            <label className={`${labelClass} block mb-2`}>Generate by key size (n ≈ this many bits)</label>
            <div className="flex gap-2 flex-wrap">
              {BIT_SIZE_OPTIONS.map(opt => (
                <button
                  key={opt.bits}
                  onClick={() => generateRandomPrimes(opt.bits)}
                  disabled={generating}
                  className="group px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:border-violet-700/50 hover:text-violet-400 transition-colors disabled:opacity-50 disabled:cursor-wait"
                >
                  <div className="font-mono font-bold">{opt.label}</div>
                  <div className="text-xs text-slate-600 group-hover:text-slate-500">{opt.desc}</div>
                </button>
              ))}
            </div>
            {generating && (
              <div className="mt-2 text-xs text-violet-400 flex items-center gap-2">
                <RefreshCw size={12} className="animate-spin" /> Generating primes...
              </div>
            )}
          </div>

          {/* Computed values step-by-step */}
          <div className="space-y-2 font-mono text-sm break-all">
            <div className="bg-slate-900/80 rounded-lg p-3 space-y-1">
              <div className="text-slate-500 text-xs">1. Compute n = p x q</div>
              <div className="text-white">n = {pStr} x {qStr} = <span className="text-violet-300 font-bold">{n.toString()}</span></div>
              <div className="text-slate-600 text-xs">{n.toString().length} digits, {n.toString(2).length} bits — messages must be smaller than n</div>
            </div>

            <div className="bg-slate-900/80 rounded-lg p-3 space-y-1">
              <div className="text-slate-500 text-xs">2. Euler's totient: phi(n) = (p-1)(q-1)</div>
              <div className="text-white">phi({n.toString()}) = ({pStr}-1)({qStr}-1) = <span className="text-violet-300 font-bold">{phi.toString()}</span></div>
            </div>

            <div className="bg-slate-900/80 rounded-lg p-3 space-y-1">
              <div className="text-slate-500 text-xs">3. Verify gcd(e, phi) = 1</div>
              <div className="text-white">
                gcd({eStr}, {phi.toString()}) = <span className={eValid ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>{gcdVal.toString()}</span>
                {eValid ? ' — coprime, valid e' : ' — NOT coprime, pick a different e'}
              </div>
            </div>

            <div className="bg-slate-900/80 rounded-lg p-3 space-y-1">
              <div className="text-slate-500 text-xs">4. Compute d = e^(-1) mod phi(n) via Extended Euclidean Algorithm</div>
              {d !== null ? (
                <div className="text-white">d = {eStr}^(-1) mod {phi.toString()} = <span className="text-violet-300 font-bold">{d.toString()}</span></div>
              ) : (
                <div className="text-red-400">Cannot compute — e and phi(n) are not coprime</div>
              )}
              {egcdSteps.length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-slate-500 cursor-pointer hover:text-violet-400">Show extended GCD steps</summary>
                  <div className="mt-1 text-xs text-slate-500 space-y-0.5 pl-2 border-l border-slate-800">
                    {egcdSteps.map((s, i) => <div key={i}>{s}</div>)}
                  </div>
                </details>
              )}
            </div>

            {d !== null && (
              <div className="bg-slate-900/80 rounded-lg p-3 space-y-1">
                <div className="text-slate-500 text-xs">5. Verify: e * d mod phi(n) = 1</div>
                <div className="text-white">
                  {eStr} x {d.toString()} mod {phi.toString()} = <span className="text-emerald-400 font-bold">{((e * d) % phi).toString()}</span>
                </div>
              </div>
            )}
          </div>

          {/* Key display */}
          {keyValid && d !== null && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-xl p-4 min-w-0">
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Unlock size={14} /> Public Key</div>
                <div className="font-mono text-sm text-white space-y-1 break-all">
                  <div>e = <span className="text-emerald-300">{eStr}</span></div>
                  <div>n = <span className="text-emerald-300">{n.toString()}</span></div>
                </div>
                <div className="text-xs text-slate-500 mt-2">Share this freely — anyone can encrypt with it</div>
              </div>
              <div className="bg-red-950/20 border border-red-800/40 rounded-xl p-4 min-w-0">
                <div className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Lock size={14} /> Private Key</div>
                <div className="font-mono text-sm text-white space-y-1 break-all">
                  <div>d = <span className="text-red-300">{d.toString()}</span></div>
                  <div>n = <span className="text-red-300">{n.toString()}</span></div>
                </div>
                <div className="text-xs text-slate-500 mt-2">Keep this secret — only you can decrypt</div>
              </div>
            </div>
          )}
        </div>

        {/* ── Encrypt / Decrypt ──────────────────────────────── */}
        <div className={panelClass}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-violet-400 uppercase tracking-wider">Step 2 — Encrypt / Decrypt</h2>
            <div className="flex bg-slate-800 rounded-lg p-0.5 border border-slate-700">
              <button onClick={() => setMode('encrypt')}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors flex items-center gap-1.5 ${mode === 'encrypt' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                <Lock size={12} /> Encrypt
              </button>
              <button onClick={() => setMode('decrypt')}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors flex items-center gap-1.5 ${mode === 'decrypt' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                <Unlock size={12} /> Decrypt
              </button>
            </div>
          </div>

          {!keyValid && (
            <div className="text-sm text-amber-400 bg-amber-950/20 border border-amber-800/30 rounded-lg p-3 mb-4">
              Generate valid keys above first. Ensure p and q are distinct primes and gcd(e, phi) = 1.
            </div>
          )}

          {mode === 'encrypt' ? (
            <div className="space-y-4">
              <div>
                <label className={`${labelClass} block mb-1`}>Plaintext Message</label>
                <textarea value={plaintext} onChange={e => setPlaintext(e.target.value)}
                  className={inputClass + ' h-32 resize-y'} placeholder="Type your message..." />
              </div>

              {keyValid && encrypted.length > 0 && (
                <>
                  <div>
                    <label className={`${labelClass} block mb-2`}>Encryption: c = m^e mod n for each byte</label>
                    <div className="bg-slate-900/80 rounded-lg p-3 max-h-48 overflow-y-auto">
                      <div className="font-mono text-xs space-y-1">
                        {encrypted.slice(0, 50).map((pair, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-slate-500 w-20 shrink-0">
                              '{String.fromCharCode(Number(pair.m))}' ({pair.m.toString()})
                            </span>
                            <span className="text-slate-600">-&gt;</span>
                            <span className="text-white">{pair.m.toString()}^{eStr} mod {n.toString()}</span>
                            <span className="text-slate-600">=</span>
                            <span className="text-violet-300 font-bold">{pair.c.toString()}</span>
                          </div>
                        ))}
                        {encrypted.length > 50 && (
                          <div className="text-slate-600">... and {encrypted.length - 50} more bytes</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className={labelClass}>Ciphertext (numbers)</label>
                        <button onClick={() => copyToClipboard(ciphertextNums)}
                          className="text-xs text-slate-500 hover:text-violet-400 flex items-center gap-1">
                          {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <div className="bg-slate-900/80 border border-slate-700 rounded-lg p-3 font-mono text-xs text-emerald-300 break-all max-h-32 overflow-y-auto">
                        {ciphertextNums}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className={labelClass}>Ciphertext (hex)</label>
                        <button onClick={() => copyToClipboard(ciphertextHex)}
                          className="text-xs text-slate-500 hover:text-violet-400 flex items-center gap-1">
                          {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <div className="bg-slate-900/80 border border-slate-700 rounded-lg p-3 font-mono text-xs text-emerald-300 break-all max-h-32 overflow-y-auto">
                        {ciphertextHex}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className={`${labelClass} block mb-1`}>Ciphertext (paste numbers or hex)</label>
                <textarea value={ciphertextInput} onChange={e => setCiphertextInput(e.target.value)}
                  className={inputClass + ' h-32 resize-y'} placeholder="e.g. 2790, 127, 3 or hex: af3 7f 03" />
                {keyValid && ciphertextNums && mode === 'decrypt' && !ciphertextInput && (
                  <button onClick={() => setCiphertextInput(ciphertextNums)}
                    className="text-xs text-violet-400 mt-1 hover:underline">
                    Paste ciphertext from encrypt tab
                  </button>
                )}
              </div>

              {keyValid && decrypted && (
                <>
                  <div>
                    <label className={`${labelClass} block mb-2`}>Decryption: m = c^d mod n for each value</label>
                    <div className="bg-slate-900/80 rounded-lg p-3 max-h-48 overflow-y-auto">
                      <div className="font-mono text-xs space-y-1">
                        {decrypted.pairs.slice(0, 50).map((pair, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-violet-300 w-16 shrink-0">{pair.c.toString()}</span>
                            <span className="text-slate-600">-&gt;</span>
                            <span className="text-white">{pair.c.toString()}^{d!.toString()} mod {n.toString()}</span>
                            <span className="text-slate-600">=</span>
                            <span className="text-emerald-400 font-bold">{pair.m.toString()}</span>
                            <span className="text-slate-500">'{String.fromCharCode(Number(pair.m))}'</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className={`${labelClass} block mb-1`}>Recovered Plaintext</label>
                    <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-lg p-4 font-mono text-base text-emerald-300">
                      {decrypted.text}
                    </div>
                  </div>
                </>
              )}

              {keyValid && ciphertextInput.trim() && !decrypted && (
                <div className="text-sm text-red-400 bg-red-950/20 border border-red-800/30 rounded-lg p-3">
                  Could not parse ciphertext. Use comma-separated numbers or space-separated hex values.
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Factoring Challenge ────────────────────────────── */}
        <div className={panelClass}>
          <h2 className="text-sm font-bold text-violet-400 uppercase tracking-wider mb-4">Step 3 — Factoring Challenge</h2>
          <p className="text-xs text-slate-400 mb-4 break-all">
            An attacker knows only the public key <span className="text-white font-mono">(e={eStr}, n={n.toString()})</span>. To break RSA, they must factor <span className="text-white font-mono">n</span> back into <span className="text-white font-mono">p x q</span>, then compute the private key.
          </p>

          <div className="flex items-center gap-3 mb-4">
            <button onClick={attemptFactor}
              className="px-4 py-2 text-sm font-bold bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors flex items-center gap-2">
              <ShieldAlert size={16} /> Try to Break It
            </button>
            <div className="text-xs text-slate-500">
              n has {n.toString().length} digits ({n.toString(2).length} bits)
            </div>
          </div>

          {showFactoring && factorResult && (
            <div className={`rounded-xl p-4 space-y-2 ${factorResult.found ? 'bg-red-950/20 border border-red-800/40' : 'bg-emerald-950/20 border border-emerald-800/40'}`}>
              {factorResult.found ? (
                <>
                  <div className="text-sm font-bold text-red-400 flex items-center gap-2">
                    <ShieldAlert size={16} /> Key Broken!
                  </div>
                  <div className="font-mono text-xs space-y-1 break-all">
                    <div className="text-white">Found: {n.toString()} = <span className="text-red-300">{factorResult.p.toString()}</span> x <span className="text-red-300">{factorResult.q.toString()}</span></div>
                    <div className="text-slate-400">Trial divisions tested: <span className="text-white">{factorResult.steps.toLocaleString()}</span></div>
                    <div className="text-slate-400">Time: <span className="text-white">{factorResult.timeMs.toFixed(2)} ms</span></div>
                    {(() => {
                      const recoveredPhi = (factorResult.p - 1n) * (factorResult.q - 1n);
                      const recoveredD = modInverse(e, recoveredPhi);
                      return (
                        <div className="mt-2 pt-2 border-t border-red-900/30">
                          <div className="text-slate-500">Recovered phi(n) = {recoveredPhi.toString()}</div>
                          <div className="text-slate-500">Recovered d = <span className="text-red-300 font-bold">{recoveredD?.toString() ?? 'N/A'}</span></div>
                          {recoveredD !== null && d !== null && (
                            <div className={`mt-1 font-bold ${recoveredD === d ? 'text-red-400' : 'text-amber-400'}`}>
                              {recoveredD === d ? 'Private key matches — full break!' : 'Key recovered (different form)'}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                    <Shield size={16} /> Key Held!
                  </div>
                  <div className="font-mono text-xs space-y-1 break-all">
                    <div className="text-white">Could not factor {n.toString()} within {factorResult.steps.toLocaleString()} trial divisions</div>
                    <div className="text-slate-400">Time: <span className="text-white">{factorResult.timeMs.toFixed(2)} ms</span></div>
                    <div className="text-emerald-400 text-xs mt-1">Larger keys are exponentially harder to break. Real RSA uses 2048-4096 bit keys (600+ digits).</div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Security comparison */}
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            {[
              { bits: '40-bit', digits: '~12', time: 'Milliseconds', color: 'text-red-400', bg: 'bg-red-950/20 border-red-900/30' },
              { bits: '512-bit', digits: '~155', time: 'Hours (cluster)', color: 'text-amber-400', bg: 'bg-amber-950/20 border-amber-900/30' },
              { bits: '2048-bit', digits: '~617', time: 'Infeasible (classical)', color: 'text-emerald-400', bg: 'bg-emerald-950/20 border-emerald-900/30' },
            ].map(level => (
              <div key={level.bits} className={`${level.bg} border rounded-lg p-3`}>
                <div className={`text-sm font-bold ${level.color}`}>{level.bits}</div>
                <div className="text-xs text-slate-500">{level.digits} digits</div>
                <div className="text-xs text-slate-400 mt-1">Factor in: {level.time}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Protocol Summary ───────────────────────────────── */}
        <div className={panelClass}>
          <h2 className="text-sm font-bold text-violet-400 uppercase tracking-wider mb-4">How RSA Works</h2>
          <div className="space-y-3">
            {[
              { step: 1, label: 'Choose two large primes', detail: `Select distinct primes p = ${pStr} and q = ${qStr}`, tag: 'SECRET' },
              { step: 2, label: 'Compute modulus', detail: `n = p * q = ${n.toString()}`, tag: 'PUBLIC' },
              { step: 3, label: 'Compute Euler\'s totient', detail: `phi(n) = (p-1)(q-1) = ${phi.toString()}`, tag: 'SECRET' },
              { step: 4, label: 'Choose public exponent', detail: `e = ${eStr}, verify gcd(e, phi) = ${gcdVal.toString()}`, tag: 'PUBLIC' },
              { step: 5, label: 'Compute private exponent', detail: `d = e^(-1) mod phi(n) = ${d?.toString() ?? '???'}`, tag: 'SECRET' },
              { step: 6, label: 'Encrypt', detail: `c = m^e mod n — anyone can do this with the public key`, tag: 'PUBLIC' },
              { step: 7, label: 'Decrypt', detail: `m = c^d mod n — only the private key holder can do this`, tag: 'SECRET' },
            ].map(s => (
              <div key={s.step} className="flex items-start gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${s.tag === 'PUBLIC' ? 'bg-violet-950/50 text-violet-400 border border-violet-800' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                  {s.step}
                </div>
                <div>
                  <div className="text-sm font-medium text-white flex items-center gap-2">
                    {s.label}
                    {s.tag === 'PUBLIC'
                      ? <span className="text-xs text-violet-400 bg-violet-950/50 px-1.5 py-0.5 rounded border border-violet-800/50">PUBLIC</span>
                      : <span className="text-xs text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">SECRET</span>}
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5 break-all">{s.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default App;
