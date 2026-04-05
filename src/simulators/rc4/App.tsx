import React, { useState, useMemo } from 'react';
import { Info, RotateCcw } from 'lucide-react';
import ExhibitPanel from '../../components/ExhibitPanel';

function ksa(key: number[]): number[] {
  const S = Array.from({ length: 256 }, (_, i) => i);
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + S[i] + key[i % key.length]) & 0xff;
    [S[i], S[j]] = [S[j], S[i]];
  }
  return S;
}

function prga(S: number[], length: number): { keystream: number[]; states: { i: number; j: number; swap: [number, number]; byte: number }[] } {
  const state = [...S];
  let i = 0, j = 0;
  const keystream: number[] = [];
  const states: { i: number; j: number; swap: [number, number]; byte: number }[] = [];
  for (let n = 0; n < length; n++) {
    i = (i + 1) & 0xff;
    j = (j + state[i]) & 0xff;
    [state[i], state[j]] = [state[j], state[i]];
    const byte = state[(state[i] + state[j]) & 0xff];
    keystream.push(byte);
    states.push({ i, j, swap: [state[j], state[i]], byte });
  }
  return { keystream, states };
}

function rc4(input: number[], key: number[]): { output: number[]; keystream: number[]; states: { i: number; j: number; swap: [number, number]; byte: number }[] } {
  const S = ksa(key);
  const { keystream, states } = prga(S, input.length);
  const output = input.map((b, i) => b ^ keystream[i]);
  return { output, keystream, states };
}

function textToBytes(text: string): number[] {
  return Array.from(new TextEncoder().encode(text));
}

function bytesToHex(bytes: number[]): string {
  return bytes.map(b => b.toString(16).padStart(2, '0')).join(' ');
}

function hexToBytes(hex: string): number[] {
  const clean = hex.replace(/[^0-9a-fA-F]/g, '');
  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i += 2) {
    bytes.push(parseInt(clean.slice(i, i + 2), 16));
  }
  return bytes;
}

function App() {
  const [key, setKey] = useState('SECRET');
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'text' | 'hex'>('text');
  const [showInfo, setShowInfo] = useState(false);
  const [showSBox, setShowSBox] = useState(false);

  const keyBytes = useMemo(() => textToBytes(key || 'A'), [key]);
  const inputBytes = useMemo(() => {
    if (mode === 'hex') return hexToBytes(input);
    return textToBytes(input);
  }, [input, mode]);

  const result = useMemo(() => {
    if (inputBytes.length === 0) return { output: [], keystream: [], states: [] };
    return rc4(inputBytes, keyBytes);
  }, [inputBytes, keyBytes]);

  const sBoxAfterKSA = useMemo(() => ksa(keyBytes), [keyBytes]);

  return (
    <div className="flex-1 bg-[#0d1117] flex flex-col">
      <ExhibitPanel id="rc4" />
      <div className="bg-[#0d1117] flex flex-col items-center justify-start py-10 px-6 text-slate-200">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl sm:text-4xl font-typewriter font-bold text-slate-100 tracking-tighter">
              <span className="text-orange-400">RC4</span> STREAM CIPHER
            </h1>
            <span className="text-slate-500 text-xs tracking-[0.3em] font-mono">RIVEST CIPHER 4 — 1987 (LEAKED 1994)</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowSBox(!showSBox)}
              className={`px-3 py-2 rounded-lg font-bold text-xs border transition-all ${
                showSBox ? 'bg-orange-900/50 border-orange-700 text-orange-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >S-Box</button>
            <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 border border-slate-700">
              <Info size={20} />
            </button>
            <button onClick={() => setInput('')} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 border border-slate-700">
              <RotateCcw size={20} />
            </button>
          </div>
        </div>

        {/* Key input */}
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 mb-8">
          <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">
            Key (1–256 bytes)
          </label>
          <input
            value={key}
            onChange={e => setKey(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 font-mono text-xl tracking-wider text-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-center"
            placeholder="SECRET KEY"
            spellCheck={false}
          />
          <div className="text-[10px] text-slate-600 text-center mt-2 font-mono">
            {keyBytes.length} bytes: [{bytesToHex(keyBytes.slice(0, 16))}{keyBytes.length > 16 ? ' ...' : ''}]
          </div>
        </div>

        {/* S-Box after KSA */}
        {showSBox && (
          <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-4 mb-8 overflow-x-auto">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold text-center mb-3">
              S-Box After Key Scheduling (KSA)
            </div>
            <div className="grid grid-cols-16 gap-px">
              {sBoxAfterKSA.map((v, i) => (
                <div key={i} className={`w-full aspect-square flex items-center justify-center text-[8px] font-mono rounded ${
                  v === i ? 'bg-slate-800/40 text-slate-600' : 'bg-orange-950/20 text-orange-400/70'
                }`} title={`S[${i}] = ${v}`}>
                  {v.toString(16).padStart(2, '0')}
                </div>
              ))}
            </div>
            <div className="text-[10px] text-slate-600 text-center mt-2 font-mono">
              256-byte permutation — {sBoxAfterKSA.filter((v, i) => v === i).length} values unchanged from identity
            </div>
          </div>
        )}

        {/* Mode + Input/Output */}
        <div className="flex justify-center gap-2 mb-6">
          <button onClick={() => setMode('text')}
            className={`px-6 py-2 rounded-lg font-bold text-sm border transition-colors ${
              mode === 'text' ? 'bg-orange-900/50 border-orange-700 text-orange-300' : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >TEXT INPUT</button>
          <button onClick={() => setMode('hex')}
            className={`px-6 py-2 rounded-lg font-bold text-sm border transition-colors ${
              mode === 'hex' ? 'bg-orange-900/50 border-orange-700 text-orange-300' : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >HEX INPUT</button>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">
              {mode === 'text' ? 'Plaintext' : 'Hex Input'}
            </label>
            <textarea
              value={input}
              onChange={e => setInput(mode === 'hex' ? e.target.value : e.target.value)}
              placeholder={mode === 'text' ? 'TYPE YOUR MESSAGE...' : '48 65 6c 6c 6f ...'}
              className="w-full h-32 bg-slate-900 border border-slate-700 rounded-xl p-4 font-mono text-sm tracking-wider focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none text-slate-200 placeholder-slate-700"
              spellCheck={false}
            />
          </div>
          <div>
            <label className="block text-xs text-orange-400 font-bold uppercase tracking-wider mb-2">
              Ciphertext (hex)
            </label>
            <div className="w-full h-32 bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 font-mono text-sm tracking-wider text-orange-200 overflow-y-auto break-all">
              {result.output.length > 0
                ? bytesToHex(result.output)
                : <span className="text-slate-700">...</span>}
            </div>
          </div>
        </div>

        {/* XOR visualization */}
        {result.output.length > 0 && (
          <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-5 mb-8 overflow-x-auto">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">
              XOR Process (showing first {Math.min(16, result.output.length)} bytes)
            </div>
            <div className="space-y-2 font-mono text-xs">
              <div className="flex items-center gap-1">
                <span className="text-slate-600 w-20 shrink-0 text-right pr-2">Input:</span>
                {inputBytes.slice(0, 16).map((b, i) => (
                  <div key={i} className="w-10 h-7 flex items-center justify-center rounded bg-slate-800/60 text-slate-300">
                    {b.toString(16).padStart(2, '0')}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-600 w-20 shrink-0 text-right pr-2">⊕ Key stream:</span>
                {result.keystream.slice(0, 16).map((b, i) => (
                  <div key={i} className="w-10 h-7 flex items-center justify-center rounded bg-orange-900/30 text-orange-400 border border-orange-800/40">
                    {b.toString(16).padStart(2, '0')}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-600 w-20 shrink-0 text-right pr-2">=</span>
                {inputBytes.slice(0, 16).map((_, i) => (
                  <div key={i} className="w-10 h-1 bg-slate-700 rounded" />
                ))}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-600 w-20 shrink-0 text-right pr-2">Output:</span>
                {result.output.slice(0, 16).map((b, i) => (
                  <div key={i} className="w-10 h-7 flex items-center justify-center rounded bg-orange-900/40 text-orange-300 font-bold border border-orange-700/40">
                    {b.toString(16).padStart(2, '0')}
                  </div>
                ))}
              </div>
            </div>
            {result.output.length > 16 && (
              <div className="text-[10px] text-slate-600 mt-2">... {result.output.length - 16} more bytes</div>
            )}
          </div>
        )}

        {/* PRGA step details */}
        {result.states.length > 0 && (
          <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-5 mb-8">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">
              PRGA Steps (first {Math.min(12, result.states.length)})
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-60 overflow-y-auto">
              {result.states.slice(0, 12).map((st, n) => (
                <div key={n} className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono bg-slate-800/30">
                  <span className="text-slate-600 w-6">#{n + 1}</span>
                  <span className="text-slate-400">i={st.i}</span>
                  <span className="text-slate-400">j={st.j}</span>
                  <span className="text-slate-600">→</span>
                  <span className="text-orange-400 font-bold">{st.byte.toString(16).padStart(2, '0')}</span>
                  <span className="text-slate-600">⊕</span>
                  <span className="text-slate-400">{inputBytes[n]?.toString(16).padStart(2, '0') ?? '??'}</span>
                  <span className="text-slate-600">=</span>
                  <span className="text-orange-300 font-bold">{result.output[n]?.toString(16).padStart(2, '0') ?? '??'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Security note */}
        <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-4 mb-8">
          <div className="text-[10px] text-red-400 uppercase tracking-widest font-bold mb-1">Security Warning</div>
          <div className="text-xs text-red-300/70">
            RC4 is <strong>cryptographically broken</strong> and must not be used for security.
            Biases in the keystream allow statistical attacks, and related-key weaknesses broke WEP.
            It was removed from TLS in 2015 (RFC 7465). Use <strong>ChaCha20</strong> or <strong>AES-GCM</strong> instead.
          </div>
        </div>
      </div>

      {/* Info Panel */}
      <div className={`fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-700 p-6 transform transition-transform duration-300 z-40 ${showInfo ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="max-w-3xl mx-auto relative">
          <button onClick={() => setShowInfo(false)} className="absolute top-0 right-0 p-2 text-slate-500 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <h3 className="text-xl font-bold text-orange-400 mb-2">About RC4</h3>
          <div className="text-sm text-slate-300 leading-relaxed space-y-2">
            <p>
              <strong>RC4</strong> (Rivest Cipher 4) was designed by <strong>Ron Rivest</strong> in 1987 for RSA Security.
              It was a trade secret until it was anonymously leaked in 1994 (the leaked version is called "ARCFOUR").
              It was the most widely deployed stream cipher in history — used in SSL/TLS, WEP, WPA-TKIP, and many protocols.
            </p>
            <p>
              The algorithm is remarkably simple: a <strong>Key Scheduling Algorithm (KSA)</strong> initializes a
              256-byte permutation from the key, then a <strong>Pseudo-Random Generation Algorithm (PRGA)</strong>
              produces keystream bytes by swapping elements of the permutation. Each byte of plaintext is XORed
              with a keystream byte.
            </p>
            <p>
              Despite its simplicity and speed, RC4 has multiple known weaknesses: <strong>Fluhrer-Mantin-Shamir</strong>
              attacks broke WEP, <strong>biases in the first bytes</strong> of output leak information, and
              <strong>statistical biases</strong> throughout the keystream enable plaintext recovery in TLS.
            </p>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

export default App;
