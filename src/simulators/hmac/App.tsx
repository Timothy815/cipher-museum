import React, { useState, useMemo } from 'react';
import { Info, RotateCcw } from 'lucide-react';
import ExhibitPanel from '../../components/ExhibitPanel';

// Minimal SHA-256 for educational HMAC (works in browser without crypto API)
function sha256(message: Uint8Array): Uint8Array {
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

  const rotr = (x: number, n: number) => ((x >>> n) | (x << (32 - n))) >>> 0;
  const ch = (x: number, y: number, z: number) => ((x & y) ^ (~x & z)) >>> 0;
  const maj = (x: number, y: number, z: number) => ((x & y) ^ (x & z) ^ (y & z)) >>> 0;
  const sig0 = (x: number) => (rotr(x, 2) ^ rotr(x, 13) ^ rotr(x, 22)) >>> 0;
  const sig1 = (x: number) => (rotr(x, 6) ^ rotr(x, 11) ^ rotr(x, 25)) >>> 0;
  const gam0 = (x: number) => (rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3)) >>> 0;
  const gam1 = (x: number) => (rotr(x, 17) ^ rotr(x, 19) ^ (x >>> 10)) >>> 0;

  // Padding
  const bitLen = message.length * 8;
  const padLen = (64 - ((message.length + 9) % 64)) % 64;
  const padded = new Uint8Array(message.length + 1 + padLen + 8);
  padded.set(message);
  padded[message.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 4, bitLen, false);

  let [h0, h1, h2, h3, h4, h5, h6, h7] = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  for (let off = 0; off < padded.length; off += 64) {
    const W = new Uint32Array(64);
    for (let t = 0; t < 16; t++) W[t] = view.getUint32(off + t * 4, false);
    for (let t = 16; t < 64; t++) W[t] = (gam1(W[t-2]) + W[t-7] + gam0(W[t-15]) + W[t-16]) >>> 0;

    let [a, b, c, d, e, f, g, h] = [h0, h1, h2, h3, h4, h5, h6, h7];
    for (let t = 0; t < 64; t++) {
      const T1 = (h + sig1(e) + ch(e, f, g) + K[t] + W[t]) >>> 0;
      const T2 = (sig0(a) + maj(a, b, c)) >>> 0;
      h = g; g = f; f = e; e = (d + T1) >>> 0;
      d = c; c = b; b = a; a = (T1 + T2) >>> 0;
    }

    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }

  const result = new Uint8Array(32);
  const rv = new DataView(result.buffer);
  [h0, h1, h2, h3, h4, h5, h6, h7].forEach((v, i) => rv.setUint32(i * 4, v, false));
  return result;
}

function hmacSha256(key: Uint8Array, message: Uint8Array): { mac: Uint8Array; ipad: Uint8Array; opad: Uint8Array; innerHash: Uint8Array } {
  const BLOCK_SIZE = 64;

  // Step 1: Normalize key to block size
  let normKey: Uint8Array;
  if (key.length > BLOCK_SIZE) {
    normKey = sha256(key); // Hash long keys
  } else {
    normKey = new Uint8Array(BLOCK_SIZE);
    normKey.set(key);
  }

  // Step 2: Create padded keys
  const ipad = new Uint8Array(BLOCK_SIZE);
  const opad = new Uint8Array(BLOCK_SIZE);
  for (let i = 0; i < BLOCK_SIZE; i++) {
    ipad[i] = normKey[i] ^ 0x36;
    opad[i] = normKey[i] ^ 0x5c;
  }

  // Step 3: Inner hash = SHA-256(ipad || message)
  const innerInput = new Uint8Array(BLOCK_SIZE + message.length);
  innerInput.set(ipad);
  innerInput.set(message, BLOCK_SIZE);
  const innerHash = sha256(innerInput);

  // Step 4: Outer hash = SHA-256(opad || innerHash)
  const outerInput = new Uint8Array(BLOCK_SIZE + 32);
  outerInput.set(opad);
  outerInput.set(innerHash, BLOCK_SIZE);
  const mac = sha256(outerInput);

  return { mac, ipad, opad, innerHash };
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function App() {
  const [key, setKey] = useState('secret-key');
  const [message, setMessage] = useState('');
  const [verifyMac, setVerifyMac] = useState('');
  const [showInfo, setShowInfo] = useState(false);

  const keyBytes = useMemo(() => new TextEncoder().encode(key || 'k'), [key]);
  const msgBytes = useMemo(() => new TextEncoder().encode(message), [message]);

  const result = useMemo(() => {
    if (!message) return null;
    return hmacSha256(keyBytes, msgBytes);
  }, [keyBytes, msgBytes, message]);

  const macHex = result ? bytesToHex(result.mac) : '';
  const isVerifying = verifyMac.length > 0;
  const verifyMatch = isVerifying && verifyMac.toLowerCase().replace(/\s/g, '') === macHex;

  // Tampered message demo
  const tamperedResult = useMemo(() => {
    if (!message || message.length < 2) return null;
    const tampered = message.slice(0, -1) + String.fromCharCode(message.charCodeAt(message.length - 1) ^ 1);
    const tamperedBytes = new TextEncoder().encode(tampered);
    return {
      message: tampered,
      mac: bytesToHex(hmacSha256(keyBytes, tamperedBytes).mac),
    };
  }, [keyBytes, message]);

  // Count differing hex chars between original and tampered MACs
  const diffCount = macHex && tamperedResult
    ? macHex.split('').filter((c, i) => c !== tamperedResult.mac[i]).length
    : 0;

  return (
    <div className="flex-1 bg-[#0f1115] flex flex-col">
      <ExhibitPanel id="hmac" />
      <div className="bg-[#0f1115] flex flex-col items-center justify-start py-10 px-6 text-slate-200">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl sm:text-4xl font-typewriter font-bold text-slate-100 tracking-tighter">
              <span className="text-sky-400">HMAC</span>-SHA256
            </h1>
            <span className="text-slate-500 text-xs tracking-[0.3em] font-mono">HASH-BASED MESSAGE AUTHENTICATION — RFC 2104</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 border border-slate-700">
              <Info size={20} />
            </button>
            <button onClick={() => { setMessage(''); setVerifyMac(''); }} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 border border-slate-700">
              <RotateCcw size={20} />
            </button>
          </div>
        </div>

        {/* Key */}
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 mb-8">
          <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">Secret Key</label>
          <input
            value={key}
            onChange={e => setKey(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 font-mono text-lg tracking-wider text-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-500/50 text-center"
            placeholder="SECRET KEY"
            spellCheck={false}
          />
          <div className="text-[10px] text-slate-600 text-center mt-2 font-mono">
            {keyBytes.length} bytes {keyBytes.length > 64 ? '(will be hashed to 32 bytes)' : `(padded to 64-byte block)`}
          </div>
        </div>

        {/* Message */}
        <div className="mb-8">
          <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Message</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Type your message..."
            className="w-full h-32 bg-slate-900 border border-slate-700 rounded-xl p-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 resize-none text-slate-200 placeholder-slate-700"
            spellCheck={false}
          />
        </div>

        {/* MAC Output */}
        {result && (
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 mb-8">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">HMAC-SHA256 Output (256 bits)</div>
            <div className="font-mono text-sm text-sky-300 break-all tracking-wider bg-slate-800/60 rounded-lg p-4 border border-slate-700/50">
              {macHex}
            </div>
          </div>
        )}

        {/* Pipeline Visualization */}
        {result && (
          <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-5 mb-8">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-4">
              HMAC Construction Pipeline
            </div>
            <div className="space-y-3 font-mono text-xs">
              {/* Step 1: Key padding */}
              <div className="flex items-start gap-3">
                <span className="text-sky-500 font-bold w-6 shrink-0">1.</span>
                <div>
                  <div className="text-slate-400">Key → pad/hash to 64 bytes</div>
                  <div className="text-slate-600 mt-0.5 text-[10px]">{bytesToHex(keyBytes).slice(0, 40)}{keyBytes.length > 20 ? '...' : ''} → {keyBytes.length > 64 ? 'SHA-256(key)' : 'zero-padded'}</div>
                </div>
              </div>
              {/* Step 2: ipad */}
              <div className="flex items-start gap-3">
                <span className="text-sky-500 font-bold w-6 shrink-0">2.</span>
                <div>
                  <div className="text-slate-400">ipad = key ⊕ 0x36 (repeated)</div>
                  <div className="text-emerald-400/60 mt-0.5 text-[10px]">{bytesToHex(result.ipad).slice(0, 48)}...</div>
                </div>
              </div>
              {/* Step 3: Inner hash */}
              <div className="flex items-start gap-3">
                <span className="text-sky-500 font-bold w-6 shrink-0">3.</span>
                <div>
                  <div className="text-slate-400">Inner hash = SHA-256(ipad ‖ message)</div>
                  <div className="text-amber-400/80 mt-0.5 text-[10px]">{bytesToHex(result.innerHash)}</div>
                </div>
              </div>
              {/* Step 4: opad */}
              <div className="flex items-start gap-3">
                <span className="text-sky-500 font-bold w-6 shrink-0">4.</span>
                <div>
                  <div className="text-slate-400">opad = key ⊕ 0x5c (repeated)</div>
                  <div className="text-violet-400/60 mt-0.5 text-[10px]">{bytesToHex(result.opad).slice(0, 48)}...</div>
                </div>
              </div>
              {/* Step 5: Final */}
              <div className="flex items-start gap-3">
                <span className="text-sky-500 font-bold w-6 shrink-0">5.</span>
                <div>
                  <div className="text-slate-400">HMAC = SHA-256(opad ‖ inner_hash)</div>
                  <div className="text-sky-400 font-bold mt-0.5 text-[10px]">{macHex}</div>
                </div>
              </div>
            </div>

            {/* Formula box */}
            <div className="mt-4 bg-slate-800/60 rounded-lg p-3 text-center border border-slate-700/50">
              <div className="text-[11px] font-mono text-slate-300">
                HMAC(K, m) = H( (K' ⊕ opad) ‖ H( (K' ⊕ ipad) ‖ m ) )
              </div>
            </div>
          </div>
        )}

        {/* Verification */}
        <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-5 mb-8">
          <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">
            Verify a MAC
          </div>
          <input
            value={verifyMac}
            onChange={e => setVerifyMac(e.target.value)}
            placeholder="Paste a MAC to verify..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 font-mono text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/50 placeholder-slate-700"
            spellCheck={false}
          />
          {isVerifying && result && (
            <div className={`mt-2 px-3 py-2 rounded-lg text-xs font-mono font-bold ${
              verifyMatch
                ? 'bg-emerald-950/40 border border-emerald-800/50 text-emerald-400'
                : 'bg-red-950/40 border border-red-800/50 text-red-400'
            }`}>
              {verifyMatch ? 'VALID — MAC matches. Message is authentic and unmodified.' : 'INVALID — MAC does not match. Message may have been tampered with.'}
            </div>
          )}
        </div>

        {/* Tamper demonstration */}
        {result && tamperedResult && (
          <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-5 mb-8">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">
              Tamper Detection Demo
            </div>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-start gap-3">
                <span className="text-slate-600 w-20 shrink-0 text-right">Original:</span>
                <span className="text-slate-300">"{message.slice(0, 40)}{message.length > 40 ? '...' : ''}"</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-slate-600 w-20 shrink-0 text-right">Tampered:</span>
                <span className="text-red-400">"{tamperedResult.message.slice(0, 40)}{tamperedResult.message.length > 40 ? '...' : ''}"</span>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-800">
                <div className="flex items-start gap-3">
                  <span className="text-slate-600 w-20 shrink-0 text-right">MAC orig:</span>
                  <span className="text-sky-400/80 break-all">{macHex}</span>
                </div>
                <div className="flex items-start gap-3 mt-1">
                  <span className="text-slate-600 w-20 shrink-0 text-right">MAC tamp:</span>
                  <span className="text-red-400/80 break-all">{tamperedResult.mac}</span>
                </div>
              </div>
              <div className="text-[10px] text-slate-500 mt-2">
                Flipping 1 bit in the message changed <span className="text-amber-400 font-bold">{diffCount}/64</span> hex
                characters in the MAC — demonstrating the <span className="text-slate-300">avalanche effect</span>.
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
          <h3 className="text-xl font-bold text-sky-400 mb-2">About HMAC</h3>
          <div className="text-sm text-slate-300 leading-relaxed space-y-2">
            <p>
              <strong>HMAC</strong> (Hash-based Message Authentication Code), defined in <strong>RFC 2104</strong> (1997)
              by Bellare, Canetti, and Krawczyk, provides both <strong>data integrity</strong> and
              <strong> authentication</strong>. Unlike encryption (which hides data), HMAC proves that a message
              hasn't been tampered with and came from someone who knows the secret key.
            </p>
            <p>
              The construction uses <strong>two passes</strong> of the hash function with different padded keys
              (ipad = 0x36, opad = 0x5c). This "double wrapping" design was carefully chosen to prevent
              <strong>length extension attacks</strong> that break naive hash(key || message) schemes.
            </p>
            <p>
              HMAC is used everywhere: <strong>TLS</strong>, <strong>JWT tokens</strong>, <strong>API authentication</strong>,
              <strong>TOTP/HOTP</strong> (2FA codes), and <strong>key derivation</strong> (HKDF, PBKDF2).
              Its security proof reduces to the security of the underlying hash function.
            </p>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

export default App;
