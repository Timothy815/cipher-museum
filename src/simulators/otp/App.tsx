import React, { useState, useMemo } from 'react';
import { Info, RefreshCw } from 'lucide-react';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function generateKey(length: number): string {
  let key = '';
  for (let i = 0; i < length; i++) {
    key += ALPHABET[Math.floor(Math.random() * 26)];
  }
  return key;
}

function otpProcess(text: string, key: string): { pairs: { plain: number; key: number; result: number }[]; output: string } | null {
  const clean = text.toUpperCase().replace(/[^A-Z]/g, '');
  const cleanKey = key.toUpperCase().replace(/[^A-Z]/g, '');
  if (!clean || !cleanKey) return null;

  const pairs: { plain: number; key: number; result: number }[] = [];
  let output = '';

  for (let i = 0; i < clean.length; i++) {
    const p = ALPHABET.indexOf(clean[i]);
    const k = ALPHABET.indexOf(cleanKey[i % cleanKey.length]);
    const r = (p + k) % 26;
    pairs.push({ plain: p, key: k, result: r });
    output += ALPHABET[r];
  }

  return { pairs, output };
}

function otpDecrypt(cipher: string, key: string): { pairs: { cipher: number; key: number; result: number }[]; output: string } | null {
  const clean = cipher.toUpperCase().replace(/[^A-Z]/g, '');
  const cleanKey = key.toUpperCase().replace(/[^A-Z]/g, '');
  if (!clean || !cleanKey) return null;

  const pairs: { cipher: number; key: number; result: number }[] = [];
  let output = '';

  for (let i = 0; i < clean.length; i++) {
    const c = ALPHABET.indexOf(clean[i]);
    const k = ALPHABET.indexOf(cleanKey[i % cleanKey.length]);
    const r = (c - k + 26) % 26;
    pairs.push({ cipher: c, key: k, result: r });
    output += ALPHABET[r];
  }

  return { pairs, output };
}

function App() {
  const [input, setInput] = useState('');
  const [key, setKey] = useState(() => generateKey(40));
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [showInfo, setShowInfo] = useState(false);

  const cleanInput = input.toUpperCase().replace(/[^A-Z]/g, '');
  const cleanKey = key.toUpperCase().replace(/[^A-Z]/g, '');
  const keyTooShort = cleanInput.length > cleanKey.length;

  const result = useMemo(() => {
    if (!cleanInput || !cleanKey) return null;
    return mode === 'encrypt' ? otpProcess(input, key) : otpDecrypt(input, key);
  }, [input, key, mode]);

  const handleNewKey = () => {
    const len = Math.max(40, cleanInput.length);
    setKey(generateKey(len));
  };

  return (
    <div className="flex-1 bg-[#101418] flex flex-col items-center justify-start py-10 px-6 text-stone-200">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl sm:text-4xl font-typewriter font-bold text-stone-100 tracking-tighter">
              ONE-TIME <span className="text-emerald-400">PAD</span>
            </h1>
            <span className="text-stone-500 text-xs tracking-[0.3em] font-mono">THEORETICALLY UNBREAKABLE — 1882 / 1917</span>
          </div>
          <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-lg hover:bg-stone-800 text-stone-400 border border-stone-700">
            <Info size={20} />
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setMode('encrypt')} className={`px-4 py-2 rounded-lg text-sm font-bold tracking-wider transition-colors ${mode === 'encrypt' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-600/50' : 'bg-stone-800/50 text-stone-500 border border-stone-700 hover:text-stone-300'}`}>
            ENCRYPT
          </button>
          <button onClick={() => setMode('decrypt')} className={`px-4 py-2 rounded-lg text-sm font-bold tracking-wider transition-colors ${mode === 'decrypt' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-600/50' : 'bg-stone-800/50 text-stone-500 border border-stone-700 hover:text-stone-300'}`}>
            DECRYPT
          </button>
        </div>

        {/* Key */}
        <div className="bg-stone-900/60 rounded-xl border border-stone-800 p-5 mb-6">
          <div className="flex justify-between items-center mb-2">
            <label className="text-[10px] text-stone-500 uppercase tracking-widest font-bold">
              Key Pad ({cleanKey.length} characters)
              {keyTooShort && <span className="text-amber-400 ml-2">— KEY IS SHORTER THAN MESSAGE (reuses key, NOT a true OTP!)</span>}
            </label>
            <button onClick={handleNewKey} className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold text-emerald-400 hover:bg-stone-800 transition-colors">
              <RefreshCw size={12} /> Generate
            </button>
          </div>
          <textarea
            value={key}
            onChange={e => setKey(e.target.value.toUpperCase())}
            className={`w-full h-24 bg-stone-800 border rounded-lg p-3 font-mono text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none text-emerald-300/80 ${keyTooShort ? 'border-amber-600/50' : 'border-stone-700'}`}
            spellCheck={false}
          />
        </div>

        {/* Input */}
        <div className="space-y-4 mb-8">
          <div>
            <label className="block text-xs text-stone-400 font-bold uppercase tracking-wider mb-2">
              {mode === 'encrypt' ? 'Plaintext' : 'Ciphertext'}
            </label>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value.toUpperCase())}
              placeholder={mode === 'encrypt' ? 'TYPE YOUR MESSAGE...' : 'PASTE CIPHERTEXT...'}
              className="w-full h-24 bg-stone-900 border border-stone-700 rounded-xl p-4 font-mono text-lg tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none text-stone-200 placeholder-stone-700"
              spellCheck={false}
            />
          </div>

          {/* Step-by-step */}
          {result && result.pairs.length > 0 && (
            <div>
              <label className="block text-xs text-stone-500 font-bold uppercase tracking-wider mb-2">
                {mode === 'encrypt' ? 'Addition mod 26: (plaintext + key) mod 26' : 'Subtraction mod 26: (ciphertext - key) mod 26'}
              </label>
              <div className="bg-stone-800/50 border border-stone-700/50 rounded-xl p-4 overflow-x-auto">
                <table className="font-mono text-sm">
                  <tbody>
                    <tr>
                      <td className="pr-3 text-stone-500 text-xs">{mode === 'encrypt' ? 'Plain' : 'Cipher'}</td>
                      {result.pairs.map((p, i) => (
                        <td key={i} className="px-1 text-center text-stone-300 w-8">{ALPHABET['plain' in p ? p.plain : (p as any).cipher]}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="pr-3 text-stone-500 text-xs">Key</td>
                      {result.pairs.map((p, i) => (
                        <td key={i} className="px-1 text-center text-emerald-400/60 w-8">{ALPHABET[p.key]}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="pr-3 text-stone-500 text-xs">=</td>
                      {result.pairs.map((p, i) => (
                        <td key={i} className="px-1 text-center font-bold text-emerald-300 w-8">{ALPHABET[p.result]}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="pr-3 text-stone-600 text-[10px]">num</td>
                      {result.pairs.map((p, i) => (
                        <td key={i} className="px-1 text-center text-stone-600 text-[10px] w-8">
                          {'plain' in p ? p.plain : (p as any).cipher}+{p.key}={('plain' in p ? p.plain + p.key : (p as any).cipher - p.key + 26) % 26}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Output */}
          <div>
            <label className="block text-xs text-emerald-400 font-bold uppercase tracking-wider mb-2">
              {mode === 'encrypt' ? 'Ciphertext' : 'Recovered Plaintext'}
            </label>
            <div className="bg-stone-800/50 border border-stone-700/50 rounded-xl p-4 font-mono text-lg tracking-wider text-emerald-200 break-all min-h-[3rem]">
              {result?.output || <span className="text-stone-700">...</span>}
            </div>
          </div>
        </div>

        {/* Security Rules */}
        <div className="bg-emerald-950/30 rounded-xl border border-emerald-900/50 p-5">
          <div className="text-[10px] text-emerald-500 uppercase tracking-widest font-bold mb-3">Requirements for Perfect Secrecy</div>
          <div className="grid sm:grid-cols-3 gap-3 text-xs text-stone-400">
            <div className="flex items-start gap-2">
              <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${cleanKey.length >= cleanInput.length && cleanInput.length > 0 ? 'bg-emerald-500' : 'bg-stone-600'}`} />
              <span>Key must be at least as long as the message</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 w-2 h-2 rounded-full shrink-0 bg-stone-600" />
              <span>Key must be truly random (not pseudorandom)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 w-2 h-2 rounded-full shrink-0 bg-stone-600" />
              <span>Key must never be reused (one-time use only)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className={`fixed bottom-0 left-0 right-0 bg-stone-900/95 backdrop-blur border-t border-stone-700 p-6 transform transition-transform duration-300 z-40 ${showInfo ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="max-w-3xl mx-auto relative">
          <button onClick={() => setShowInfo(false)} className="absolute top-0 right-0 p-2 text-stone-500 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <h3 className="text-xl font-bold text-emerald-400 mb-2">About the One-Time Pad</h3>
          <p className="text-sm text-stone-300 leading-relaxed">
            The one-time pad is the <strong>only cipher proven to be theoretically unbreakable</strong> — a result
            formally proven by <strong>Claude Shannon</strong> in 1949. The concept was first described by
            Frank Miller in 1882 and reinvented by Gilbert Vernam and Joseph Mauborgne in 1917. Each letter of the
            plaintext is combined with a random key letter using modular addition. The <strong>Moscow-Washington
            hotline</strong> (the "red telephone") used one-time pads, with key material physically exchanged.
            The cipher's weakness is purely practical: key distribution. The key must be as long as the message,
            truly random, and never reused — the <strong>VENONA</strong> project broke Soviet messages precisely
            because key pages were reused during WWII.
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
