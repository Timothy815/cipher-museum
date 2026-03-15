import React, { useState, useMemo, useCallback } from 'react';
import { Info, X, RefreshCw, Lock, Unlock, Copy, Check, Shuffle } from 'lucide-react';

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
  const { g, x } = extendedGcd(((a % mod) + mod) % mod, mod);
  if (g !== 1n) return null;
  return ((x % mod) + mod) % mod;
}

function randomInRange(min: bigint, max: bigint): bigint {
  const range = Number(max - min);
  return min + BigInt(Math.floor(Math.random() * range));
}

// ── Presets ──────────────────────────────────────────────────────────

const PRESETS = [
  { label: 'Small (p=23, g=5)', p: '23', g: '5', x: '6' },
  { label: 'Medium (p=283, g=3)', p: '283', g: '3', x: '47' },
  { label: 'Larger (p=7919, g=7)', p: '7919', g: '7', x: '103' },
  { label: 'p=104729, g=3', p: '104729', g: '3', x: '8821' },
];

type CipherPair = { c1: bigint; c2: bigint; k: bigint; m: bigint };

// ── Component ───────────────────────────────────────────────────────

const App: React.FC = () => {
  const [showInfo, setShowInfo] = useState(false);
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [pStr, setPStr] = useState('283');
  const [gStr, setGStr] = useState('3');
  const [xStr, setXStr] = useState('47');
  const [plaintext, setPlaintext] = useState('Hello');
  const [ciphertextInput, setCiphertextInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [encryptCounter, setEncryptCounter] = useState(0);

  const p = useMemo(() => { try { const v = BigInt(pStr); return v > 1n ? v : 2n; } catch { return 283n; } }, [pStr]);
  const g = useMemo(() => { try { const v = BigInt(gStr); return v > 0n ? v : 3n; } catch { return 3n; } }, [gStr]);
  const x = useMemo(() => { try { const v = BigInt(xStr); return v > 0n ? v : 1n; } catch { return 47n; } }, [xStr]);
  const h = useMemo(() => modPow(g, x, p), [g, x, p]);

  // Encrypt
  const encrypted = useMemo((): CipherPair[] => {
    void encryptCounter; // dependency to re-trigger
    if (mode !== 'encrypt' || !plaintext) return [];
    const bytes = new TextEncoder().encode(plaintext);
    return Array.from(bytes).map(byte => {
      const m = BigInt(byte);
      if (m >= p) return { c1: 0n, c2: 0n, k: 0n, m };
      const k = randomInRange(2n, p - 1n);
      const c1 = modPow(g, k, p);
      const c2 = (m * modPow(h, k, p)) % p;
      return { c1, c2, k, m };
    });
  }, [mode, plaintext, g, h, p, encryptCounter]);

  const ciphertextStr = useMemo(() =>
    encrypted.map(e => `(${e.c1},${e.c2})`).join(' '),
    [encrypted]
  );

  // Decrypt
  const decrypted = useMemo((): { pairs: { c1: bigint; c2: bigint; s: bigint; sInv: bigint | null; m: bigint }[]; text: string } | null => {
    if (mode !== 'decrypt' || !ciphertextInput.trim()) return null;
    const pairRegex = /\((\d+)\s*,\s*(\d+)\)/g;
    const pairs: { c1: bigint; c2: bigint; s: bigint; sInv: bigint | null; m: bigint }[] = [];
    let match;
    while ((match = pairRegex.exec(ciphertextInput)) !== null) {
      const c1 = BigInt(match[1]);
      const c2 = BigInt(match[2]);
      const s = modPow(c1, x, p);
      const sInv = modInverse(s, p);
      const m = sInv !== null ? (c2 * sInv) % p : 0n;
      pairs.push({ c1, c2, s, sInv, m });
    }
    const bytes = new Uint8Array(pairs.map(pr => Number(pr.m)));
    const text = new TextDecoder().decode(bytes);
    return { pairs, text };
  }, [mode, ciphertextInput, x, p]);

  // Homomorphic demo
  const homoDemo = useMemo(() => {
    if (p <= 2n) return null;
    const m1 = 7n, m2 = 5n;
    const k1 = randomInRange(2n, p - 1n);
    const k2 = randomInRange(2n, p - 1n);
    const c1_a = modPow(g, k1, p);
    const c2_a = (m1 * modPow(h, k1, p)) % p;
    const c1_b = modPow(g, k2, p);
    const c2_b = (m2 * modPow(h, k2, p)) % p;
    const c1_prod = (c1_a * c1_b) % p;
    const c2_prod = (c2_a * c2_b) % p;
    const s = modPow(c1_prod, x, p);
    const sInv = modInverse(s, p);
    const mDecrypted = sInv !== null ? (c2_prod * sInv) % p : 0n;
    const product = (m1 * m2) % p;
    return { m1, m2, k1, k2, c1_a, c2_a, c1_b, c2_b, c1_prod, c2_prod, mDecrypted, product };
  }, [g, h, x, p, encryptCounter]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(ciphertextStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [ciphertextStr]);

  const handleEncryptAgain = () => setEncryptCounter(c => c + 1);

  const randomSecret = () => {
    const max = Number(p) - 2;
    return String(Math.floor(Math.random() * max) + 2);
  };

  const inputClass = 'bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-violet-700/50 w-full';
  const labelClass = 'text-xs font-bold text-slate-400 uppercase tracking-wider';
  const panelClass = 'bg-slate-900/60 border border-slate-800 rounded-xl p-5';

  return (
    <div className="min-h-screen bg-[#1a1814] text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-violet-400">ElGamal Encryption</h1>
            <p className="text-sm text-slate-400 mt-1">Probabilistic public-key encryption based on Diffie-Hellman</p>
          </div>
          <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-violet-700/50 transition-colors">
            {showInfo ? <X size={20} className="text-violet-400" /> : <Info size={20} className="text-violet-400" />}
          </button>
        </div>

        {/* Info Panel */}
        {showInfo && (
          <div className="bg-violet-950/20 border border-violet-900/40 rounded-xl p-6 space-y-3 text-sm text-slate-300 leading-relaxed">
            <h2 className="text-base font-bold text-violet-400">About ElGamal Encryption</h2>
            <p>Proposed by <strong className="text-white">Taher ElGamal</strong> in <strong className="text-white">1985</strong>, this cryptosystem extends the Diffie-Hellman key exchange into a full encryption scheme. The sender generates an ephemeral DH key pair for each message, computes a shared secret with the recipient's public key, and uses it as a one-time mask.</p>
            <p><strong className="text-white">Probabilistic encryption:</strong> The same plaintext encrypts to different ciphertexts each time because a fresh random <code className="text-violet-300">k</code> is chosen per encryption. This is a fundamental advantage over deterministic schemes.</p>
            <p><strong className="text-white">Homomorphic property:</strong> ElGamal is multiplicatively homomorphic: <code className="text-violet-300">E(m1) * E(m2) = E(m1 * m2 mod p)</code>. Multiplying two ciphertexts produces a valid encryption of the product of their plaintexts.</p>
            <p><strong className="text-white">Used in:</strong> Original GPG/PGP encryption, DSA digital signatures (closely related), some e-voting protocols (leveraging the homomorphic property). Security relies on the <strong className="text-white">Decisional Diffie-Hellman (DDH)</strong> assumption.</p>
          </div>
        )}

        {/* Key Generation */}
        <div className={panelClass}>
          <h2 className="text-sm font-bold text-violet-400 uppercase tracking-wider mb-4">Key Generation</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div>
              <label className={`${labelClass} block mb-1`}>Prime p</label>
              <input value={pStr} onChange={e => setPStr(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={`${labelClass} block mb-1`}>Generator g</label>
              <input value={gStr} onChange={e => setGStr(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={`${labelClass} block mb-1`}>Secret key x</label>
              <div className="flex gap-1">
                <input value={xStr} onChange={e => setXStr(e.target.value)} className={inputClass} />
                <button onClick={() => setXStr(randomSecret())} className="px-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-violet-400 transition-colors"><RefreshCw size={14} /></button>
              </div>
            </div>
            <div>
              <label className={`${labelClass} block mb-1`}>Public key h</label>
              <div className="bg-slate-900/80 border border-violet-900/30 rounded-lg px-4 py-3 font-mono text-sm text-violet-300">
                {h.toString()}
              </div>
            </div>
          </div>

          {/* Presets */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {PRESETS.map(pr => (
              <button key={pr.label} onClick={() => { setPStr(pr.p); setGStr(pr.g); setXStr(pr.x); }}
                className="px-3 py-1.5 text-xs font-mono bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:border-violet-700/50 hover:text-violet-400 transition-colors">
                {pr.label}
              </button>
            ))}
          </div>

          {/* Key relationship */}
          <div className="bg-slate-900/80 rounded-lg p-3 font-mono text-xs space-y-1">
            <div className="text-slate-500">Public parameters: <span className="text-white">(p = {pStr}, g = {gStr})</span></div>
            <div className="text-slate-500">Private key: <span className="text-violet-400 font-bold">x = {xStr}</span></div>
            <div className="text-slate-500">Public key: <span className="text-violet-300 font-bold">h = g<sup>x</sup> mod p = {gStr}<sup>{xStr}</sup> mod {pStr} = {h.toString()}</span></div>
          </div>
        </div>

        {/* Encrypt / Decrypt Mode Toggle */}
        <div className={panelClass}>
          <div className="flex items-center gap-3 mb-5">
            <button onClick={() => setMode('encrypt')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${mode === 'encrypt' ? 'bg-violet-950/40 border border-violet-700/50 text-violet-400' : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-violet-400'}`}>
              <Lock size={16} /> Encrypt
            </button>
            <button onClick={() => setMode('decrypt')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${mode === 'decrypt' ? 'bg-violet-950/40 border border-violet-700/50 text-violet-400' : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-violet-400'}`}>
              <Unlock size={16} /> Decrypt
            </button>
          </div>

          {mode === 'encrypt' ? (
            <div className="space-y-4">
              <div>
                <label className={`${labelClass} block mb-1`}>Plaintext Message</label>
                <input value={plaintext} onChange={e => setPlaintext(e.target.value)} placeholder="Type a message..." className={inputClass} />
                <div className="text-[10px] text-slate-600 mt-1">Each character is encrypted as a separate (c1, c2) pair with a unique random k</div>
              </div>

              {/* Encrypt Again button */}
              <div className="flex gap-2">
                <button onClick={handleEncryptAgain}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-violet-950/40 border border-violet-700/50 text-violet-400 hover:bg-violet-950/60 transition-colors">
                  <Shuffle size={16} /> Encrypt Again (New Random k)
                </button>
                <div className="flex items-center text-xs text-slate-500">
                  Same plaintext, different ciphertext each time — probabilistic encryption!
                </div>
              </div>

              {encrypted.length > 0 && (
                <>
                  {/* Step-by-step for first 3 bytes */}
                  <div>
                    <h3 className="text-xs font-bold text-violet-400 uppercase tracking-wider mb-2">Step-by-Step (first {Math.min(3, encrypted.length)} bytes)</h3>
                    <div className="space-y-2">
                      {encrypted.slice(0, 3).map((e, i) => (
                        <div key={i} className="bg-slate-900/80 rounded-lg p-3 font-mono text-xs space-y-1">
                          <div className="text-slate-400">Byte {i}: <span className="text-white">'{String.fromCharCode(Number(e.m))}'</span> = <span className="text-white">{e.m.toString()}</span></div>
                          <div className="text-slate-500">Random k = <span className="text-amber-400">{e.k.toString()}</span></div>
                          <div className="text-slate-500">c1 = g<sup>k</sup> mod p = {gStr}<sup>{e.k.toString()}</sup> mod {pStr} = <span className="text-violet-300">{e.c1.toString()}</span></div>
                          <div className="text-slate-500">c2 = m * h<sup>k</sup> mod p = {e.m.toString()} * {h.toString()}<sup>{e.k.toString()}</sup> mod {pStr} = <span className="text-violet-300">{e.c2.toString()}</span></div>
                          <div className="text-violet-400 font-bold">({e.c1.toString()}, {e.c2.toString()})</div>
                        </div>
                      ))}
                      {encrypted.length > 3 && (
                        <div className="text-xs text-slate-600 font-mono pl-3">... and {encrypted.length - 3} more byte(s)</div>
                      )}
                    </div>
                  </div>

                  {/* Ciphertext output */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className={labelClass}>Ciphertext</label>
                      <button onClick={handleCopy}
                        className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-slate-800 border border-slate-700 text-slate-400 hover:text-violet-400 transition-colors">
                        {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <div className="bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 font-mono text-xs text-violet-300 break-all max-h-32 overflow-y-auto">
                      {ciphertextStr}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className={`${labelClass} block mb-1`}>Ciphertext Pairs</label>
                <textarea value={ciphertextInput} onChange={e => setCiphertextInput(e.target.value)}
                  placeholder="Paste ciphertext: (c1,c2) (c1,c2) ..."
                  className={`${inputClass} h-24 resize-none`} />
                <div className="text-[10px] text-slate-600 mt-1">Format: (c1,c2) pairs separated by spaces</div>
              </div>

              {decrypted && decrypted.pairs.length > 0 && (
                <>
                  {/* Step-by-step for first 3 pairs */}
                  <div>
                    <h3 className="text-xs font-bold text-violet-400 uppercase tracking-wider mb-2">Step-by-Step (first {Math.min(3, decrypted.pairs.length)} pairs)</h3>
                    <div className="space-y-2">
                      {decrypted.pairs.slice(0, 3).map((pr, i) => (
                        <div key={i} className="bg-slate-900/80 rounded-lg p-3 font-mono text-xs space-y-1">
                          <div className="text-slate-400">Pair {i}: <span className="text-violet-300">({pr.c1.toString()}, {pr.c2.toString()})</span></div>
                          <div className="text-slate-500">s = c1<sup>x</sup> mod p = {pr.c1.toString()}<sup>{xStr}</sup> mod {pStr} = <span className="text-white">{pr.s.toString()}</span></div>
                          <div className="text-slate-500">s<sup>-1</sup> mod p = <span className="text-white">{pr.sInv?.toString() ?? 'undefined'}</span></div>
                          <div className="text-slate-500">m = c2 * s<sup>-1</sup> mod p = {pr.c2.toString()} * {pr.sInv?.toString() ?? '?'} mod {pStr} = <span className="text-emerald-400 font-bold">{pr.m.toString()}</span></div>
                          <div className="text-white">= '{String.fromCharCode(Number(pr.m))}'</div>
                        </div>
                      ))}
                      {decrypted.pairs.length > 3 && (
                        <div className="text-xs text-slate-600 font-mono pl-3">... and {decrypted.pairs.length - 3} more pair(s)</div>
                      )}
                    </div>
                  </div>

                  {/* Recovered plaintext */}
                  <div className="bg-emerald-950/30 border border-emerald-700/40 rounded-xl p-4">
                    <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-1">Recovered Plaintext</label>
                    <div className="font-mono text-lg text-white">{decrypted.text}</div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Relationship to Diffie-Hellman */}
        <div className={panelClass}>
          <h2 className="text-sm font-bold text-violet-400 uppercase tracking-wider mb-4">Relationship to Diffie-Hellman</h2>
          <p className="text-xs text-slate-400 mb-4">ElGamal encryption is Diffie-Hellman key agreement combined with one-time pad masking. The random <code className="text-violet-300">k</code> acts as an <strong className="text-white">ephemeral DH private key</strong>.</p>

          <div className="grid md:grid-cols-2 gap-4">
            {/* DH side */}
            <div className="bg-violet-950/20 border border-violet-900/30 rounded-xl p-4 space-y-3">
              <div className="text-sm font-bold text-violet-300 text-center">Diffie-Hellman</div>
              <div className="font-mono text-xs space-y-2">
                <div className="bg-slate-900/80 rounded-lg p-2 space-y-1">
                  <div className="text-slate-500">Alice (long-term):</div>
                  <div className="text-white">Private: <span className="text-violet-400">x</span>, Public: <span className="text-violet-300">h = g<sup>x</sup> mod p</span></div>
                </div>
                <div className="bg-slate-900/80 rounded-lg p-2 space-y-1">
                  <div className="text-slate-500">Bob (ephemeral):</div>
                  <div className="text-white">Private: <span className="text-amber-400">k</span>, Public: <span className="text-amber-300">c1 = g<sup>k</sup> mod p</span></div>
                </div>
                <div className="bg-slate-900/80 rounded-lg p-2 space-y-1">
                  <div className="text-slate-500">Shared secret:</div>
                  <div className="text-emerald-400 font-bold">s = h<sup>k</sup> = c1<sup>x</sup> = g<sup>xk</sup> mod p</div>
                </div>
              </div>
            </div>

            {/* ElGamal side */}
            <div className="bg-violet-950/20 border border-violet-900/30 rounded-xl p-4 space-y-3">
              <div className="text-sm font-bold text-violet-300 text-center">ElGamal Encryption</div>
              <div className="font-mono text-xs space-y-2">
                <div className="bg-slate-900/80 rounded-lg p-2 space-y-1">
                  <div className="text-slate-500">Recipient's key pair:</div>
                  <div className="text-white">Private: <span className="text-violet-400">x = {xStr}</span>, Public: <span className="text-violet-300">h = {h.toString()}</span></div>
                </div>
                <div className="bg-slate-900/80 rounded-lg p-2 space-y-1">
                  <div className="text-slate-500">Sender picks ephemeral:</div>
                  <div className="text-white">Random <span className="text-amber-400">k</span> per byte (like a one-time DH key)</div>
                  <div className="text-white">Sends <span className="text-amber-300">c1 = g<sup>k</sup></span> (ephemeral public key)</div>
                </div>
                <div className="bg-slate-900/80 rounded-lg p-2 space-y-1">
                  <div className="text-slate-500">Mask the message:</div>
                  <div className="text-white">c2 = m * <span className="text-emerald-400">s</span> mod p</div>
                  <div className="text-slate-500">where <span className="text-emerald-400">s = h<sup>k</sup></span> is the DH shared secret</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 text-xs text-slate-500 bg-slate-900/80 rounded-lg p-3 font-mono">
            <span className="text-violet-400">Key insight:</span> Each encryption is a fresh DH exchange. The ephemeral key k is never reused, making the shared secret s a one-time mask. This is why the same plaintext encrypts differently each time.
          </div>
        </div>

        {/* Homomorphic Property */}
        <div className={panelClass}>
          <h2 className="text-sm font-bold text-violet-400 uppercase tracking-wider mb-4">Multiplicative Homomorphism</h2>
          <p className="text-xs text-slate-400 mb-4">
            Multiplying two ElGamal ciphertexts produces a valid encryption of the product of their plaintexts:
            <code className="text-violet-300 ml-1">E(m1) * E(m2) = E(m1 * m2 mod p)</code>
          </p>

          {homoDemo && (
            <div className="space-y-3">
              <div className="grid md:grid-cols-3 gap-3">
                <div className="bg-slate-900/80 rounded-lg p-3 font-mono text-xs space-y-1">
                  <div className="text-slate-500">Message 1:</div>
                  <div className="text-white font-bold">m1 = {homoDemo.m1.toString()}</div>
                  <div className="text-slate-500">k1 = <span className="text-amber-400">{homoDemo.k1.toString()}</span></div>
                  <div className="text-violet-300">E(m1) = ({homoDemo.c1_a.toString()}, {homoDemo.c2_a.toString()})</div>
                </div>
                <div className="bg-slate-900/80 rounded-lg p-3 font-mono text-xs space-y-1">
                  <div className="text-slate-500">Message 2:</div>
                  <div className="text-white font-bold">m2 = {homoDemo.m2.toString()}</div>
                  <div className="text-slate-500">k2 = <span className="text-amber-400">{homoDemo.k2.toString()}</span></div>
                  <div className="text-violet-300">E(m2) = ({homoDemo.c1_b.toString()}, {homoDemo.c2_b.toString()})</div>
                </div>
                <div className="bg-slate-900/80 rounded-lg p-3 font-mono text-xs space-y-1 border border-violet-900/30">
                  <div className="text-slate-500">Product of ciphertexts:</div>
                  <div className="text-violet-300">c1' = c1_a * c1_b mod p = <span className="text-white">{homoDemo.c1_prod.toString()}</span></div>
                  <div className="text-violet-300">c2' = c2_a * c2_b mod p = <span className="text-white">{homoDemo.c2_prod.toString()}</span></div>
                </div>
              </div>

              <div className={`rounded-xl p-4 text-center ${homoDemo.mDecrypted === homoDemo.product ? 'bg-emerald-950/30 border border-emerald-700/40' : 'bg-red-950/30 border border-red-700/40'}`}>
                <div className="font-mono text-sm">
                  <span className="text-slate-400">Decrypt product:</span>{' '}
                  <span className="text-emerald-400 font-bold">{homoDemo.mDecrypted.toString()}</span>
                  <span className="text-slate-600 mx-2">=</span>
                  <span className="text-slate-400">m1 * m2 mod p:</span>{' '}
                  <span className="text-emerald-400 font-bold">{homoDemo.product.toString()}</span>
                  <span className="text-slate-600 mx-2">=</span>
                  <span className="text-white">{homoDemo.m1.toString()} * {homoDemo.m2.toString()} mod {pStr}</span>
                </div>
                {homoDemo.mDecrypted === homoDemo.product && (
                  <div className="text-xs text-emerald-400 mt-1">Homomorphic property verified: decryption of product equals product of plaintexts</div>
                )}
              </div>
              <button onClick={handleEncryptAgain}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono bg-slate-800 border border-slate-700 text-slate-400 hover:border-violet-700/50 hover:text-violet-400 transition-colors">
                <RefreshCw size={12} /> Re-run with new random k values
              </button>
            </div>
          )}
        </div>

        {/* Protocol Steps */}
        <div className={panelClass}>
          <h2 className="text-sm font-bold text-violet-400 uppercase tracking-wider mb-4">Protocol Overview</h2>
          <div className="space-y-3">
            {[
              { step: 1, label: 'Key generation', detail: `Choose prime p = ${pStr}, generator g = ${gStr}. Pick secret x = ${xStr}. Publish h = g^x mod p = ${h.toString()}.`, tag: 'SETUP' },
              { step: 2, label: 'Sender picks random k', detail: `For each byte of plaintext, choose a fresh random k in [2, p-2]. This is the ephemeral private key.`, tag: 'ENCRYPT' },
              { step: 3, label: 'Compute ciphertext pair', detail: `c1 = g^k mod p (ephemeral public key), c2 = m * h^k mod p (masked message).`, tag: 'ENCRYPT' },
              { step: 4, label: 'Send (c1, c2)', detail: `The ciphertext is the pair (c1, c2) for each byte. Ciphertext is ~2x the plaintext size.`, tag: 'PUBLIC' },
              { step: 5, label: 'Recipient computes shared secret', detail: `s = c1^x mod p. This is the same DH shared secret the sender computed as h^k mod p.`, tag: 'DECRYPT' },
              { step: 6, label: 'Recover plaintext', detail: `m = c2 * s^(-1) mod p. The modular inverse of s undoes the one-time mask.`, tag: 'DECRYPT' },
            ].map(s => (
              <div key={s.step} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-violet-950/50 text-violet-400 border border-violet-800">
                  {s.step}
                </div>
                <div>
                  <div className="text-sm font-medium text-white flex items-center gap-2">
                    {s.label}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                      s.tag === 'SETUP' ? 'text-slate-500 bg-slate-800 border-slate-700' :
                      s.tag === 'ENCRYPT' ? 'text-violet-400 bg-violet-950/50 border-violet-800/50' :
                      s.tag === 'DECRYPT' ? 'text-emerald-400 bg-emerald-950/50 border-emerald-800/50' :
                      'text-amber-400 bg-amber-950/50 border-amber-800/50'
                    }`}>{s.tag}</span>
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">{s.detail}</div>
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
