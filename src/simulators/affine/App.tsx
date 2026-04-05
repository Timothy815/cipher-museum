import React, { useState, useMemo } from 'react';
import { Info, RotateCcw } from 'lucide-react';
import ExhibitPanel from '../../components/ExhibitPanel';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const VALID_A = [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25]; // coprime with 26

// Extended Euclidean algorithm → modular multiplicative inverse
function modInverse(a: number, m: number): number {
  let [old_r, r] = [a, m];
  let [old_s, s] = [1, 0];
  while (r !== 0) {
    const q = Math.floor(old_r / r);
    [old_r, r] = [r, old_r - q * r];
    [old_s, s] = [s, old_s - q * s];
  }
  return ((old_s % m) + m) % m;
}

function affineEncrypt(text: string, a: number, b: number): string {
  return text.toUpperCase().split('').map(c => {
    const x = ALPHABET.indexOf(c);
    if (x === -1) return c;
    return ALPHABET[(a * x + b) % 26];
  }).join('');
}

function affineDecrypt(text: string, a: number, b: number): string {
  const aInv = modInverse(a, 26);
  return text.toUpperCase().split('').map(c => {
    const y = ALPHABET.indexOf(c);
    if (y === -1) return c;
    return ALPHABET[((aInv * (y - b + 26)) % 26 + 26) % 26];
  }).join('');
}

function gcd(a: number, b: number): number {
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

function App() {
  const [a, setA] = useState(5);
  const [b, setB] = useState(8);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [showInfo, setShowInfo] = useState(false);

  const isValidA = VALID_A.includes(a);
  const aInverse = isValidA ? modInverse(a, 26) : null;

  const output = useMemo(() => {
    if (!isValidA) return '';
    return mode === 'encrypt' ? affineEncrypt(input, a, b) : affineDecrypt(input, a, b);
  }, [input, a, b, mode, isValidA]);

  // Full substitution table
  const subTable = useMemo(() => {
    if (!isValidA) return [];
    return ALPHABET.split('').map((ch, i) => ({
      plain: ch,
      cipher: ALPHABET[(a * i + b) % 26],
    }));
  }, [a, b, isValidA]);

  // Brute force all 312 valid keys
  const bruteForce = useMemo(() => {
    if (!input) return [];
    const results: { a: number; b: number; text: string }[] = [];
    for (const va of VALID_A) {
      for (let vb = 0; vb < 26; vb++) {
        results.push({ a: va, b: vb, text: affineDecrypt(input, va, vb) });
      }
    }
    return results;
  }, [input]);

  return (
    <div className="flex-1 bg-[#0f1419] flex flex-col">
      <ExhibitPanel id="affine" />
      <div className="bg-[#0f1419] flex flex-col items-center justify-start py-10 px-6 text-slate-200">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl sm:text-4xl font-typewriter font-bold text-slate-100 tracking-tighter">
              AFFINE <span className="text-teal-400">CIPHER</span>
            </h1>
            <span className="text-slate-500 text-xs tracking-[0.3em] font-mono">E(x) = (ax + b) mod 26</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 border border-slate-700">
              <Info size={20} />
            </button>
            <button onClick={() => { setA(5); setB(8); setInput(''); }} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 border border-slate-700">
              <RotateCcw size={20} />
            </button>
          </div>
        </div>

        {/* Key controls */}
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 sm:p-8 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {/* Multiplier a */}
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">
                Multiplier (a) — must be coprime with 26
              </div>
              <div className="text-5xl font-typewriter font-bold text-teal-400 mb-4">{a}</div>
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: 26 }, (_, i) => i + 1).map(v => {
                  const valid = gcd(v, 26) === 1;
                  const selected = v === a;
                  return (
                    <button key={v} onClick={() => valid && setA(v)}
                      className={`w-9 h-9 rounded-lg text-xs font-mono font-bold border transition-all ${
                        selected ? 'bg-teal-600 border-teal-400 text-white scale-105' :
                        valid ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white cursor-pointer' :
                        'bg-slate-900/30 border-slate-800/50 text-slate-700 cursor-not-allowed'
                      }`}
                    >
                      {v}
                    </button>
                  );
                })}
              </div>
              {isValidA && (
                <div className="mt-3 text-xs text-slate-500 font-mono">
                  a⁻¹ mod 26 = <span className="text-teal-400 font-bold">{aInverse}</span>
                  <span className="text-slate-600 ml-2">({a} × {aInverse} = {a * aInverse!} ≡ 1 mod 26)</span>
                </div>
              )}
              {!isValidA && (
                <div className="mt-3 text-xs text-red-400 font-mono">
                  gcd({a}, 26) = {gcd(a, 26)} ≠ 1 — no inverse exists
                </div>
              )}
            </div>

            {/* Shift b */}
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">
                Shift (b)
              </div>
              <div className="text-5xl font-typewriter font-bold text-amber-400 mb-4">{b}</div>
              <input
                type="range" min="0" max="25" value={b}
                onChange={e => setB(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
              <div className="flex justify-between text-[10px] text-slate-600 font-mono mt-1">
                <span>0</span><span>25</span>
              </div>
            </div>
          </div>

          {/* Formula display */}
          <div className="mt-6 bg-slate-800/60 rounded-xl p-4 text-center border border-slate-700/50">
            <div className="font-mono text-sm">
              <span className="text-slate-500">Encrypt:</span>{' '}
              <span className="text-slate-300">E(x) = (</span>
              <span className="text-teal-400 font-bold">{a}</span>
              <span className="text-slate-300">x + </span>
              <span className="text-amber-400 font-bold">{b}</span>
              <span className="text-slate-300">) mod 26</span>
              <span className="text-slate-700 mx-4">|</span>
              <span className="text-slate-500">Decrypt:</span>{' '}
              <span className="text-slate-300">D(y) = </span>
              <span className="text-teal-400 font-bold">{aInverse ?? '?'}</span>
              <span className="text-slate-300">(y − </span>
              <span className="text-amber-400 font-bold">{b}</span>
              <span className="text-slate-300">) mod 26</span>
            </div>
            <div className="text-[10px] text-slate-600 mt-1 font-mono">
              Key space: 12 × 26 = 312 possible keys
            </div>
          </div>
        </div>

        {/* Substitution Table */}
        {isValidA && (
          <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-4 mb-8 overflow-x-auto">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold text-center mb-3">
              Substitution Table
            </div>
            <div className="flex justify-center gap-[2px] mb-1">
              {subTable.map(({ plain }) => (
                <div key={plain} className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-[10px] sm:text-xs font-mono text-slate-400 bg-slate-800/50 rounded">
                  {plain}
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-[2px]">
              {subTable.map(({ plain, cipher }) => (
                <div key={plain} className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-[10px] sm:text-xs font-mono font-bold text-teal-400 bg-teal-950/30 rounded border border-teal-900/30">
                  {cipher}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mode toggle */}
        <div className="flex justify-center gap-2 mb-6">
          <button onClick={() => setMode('encrypt')}
            className={`px-6 py-2 rounded-lg font-bold text-sm border transition-colors ${
              mode === 'encrypt' ? 'bg-teal-900/50 border-teal-700 text-teal-300' : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >ENCRYPT</button>
          <button onClick={() => setMode('decrypt')}
            className={`px-6 py-2 rounded-lg font-bold text-sm border transition-colors ${
              mode === 'decrypt' ? 'bg-teal-900/50 border-teal-700 text-teal-300' : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >DECRYPT</button>
        </div>

        {/* Input / Output */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">
              {mode === 'encrypt' ? 'Plaintext' : 'Ciphertext'}
            </label>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value.toUpperCase())}
              placeholder="TYPE YOUR MESSAGE..."
              className="w-full h-40 bg-slate-900 border border-slate-700 rounded-xl p-4 font-mono text-lg tracking-wider focus:outline-none focus:ring-2 focus:ring-teal-500/50 resize-none text-slate-200 placeholder-slate-700"
              spellCheck={false}
            />
          </div>
          <div>
            <label className="block text-xs text-teal-400 font-bold uppercase tracking-wider mb-2">
              {mode === 'encrypt' ? 'Ciphertext' : 'Plaintext'}
            </label>
            <div className="w-full h-40 bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 font-mono text-lg tracking-wider text-teal-200 overflow-y-auto break-all">
              {!isValidA ? (
                <span className="text-red-400 text-sm">Invalid key: a must be coprime with 26</span>
              ) : output || <span className="text-slate-700">...</span>}
            </div>
          </div>
        </div>

        {/* Step-by-step for first few chars */}
        {isValidA && input && (
          <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-5 mb-8">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">
              Step-by-Step — {mode === 'encrypt' ? 'Encryption' : 'Decryption'}
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {input.toUpperCase().split('').slice(0, 12).map((ch, i) => {
                const x = ALPHABET.indexOf(ch);
                if (x === -1) return (
                  <div key={i} className="text-xs font-mono text-slate-600">'{ch}' → (non-letter, pass through)</div>
                );
                if (mode === 'encrypt') {
                  const result = (a * x + b) % 26;
                  return (
                    <div key={i} className="text-xs font-mono flex items-center gap-1">
                      <span className="text-slate-400 w-4">{ch}</span>
                      <span className="text-slate-600">→ x={x}</span>
                      <span className="text-slate-600">→ ({a}×{x} + {b}) mod 26</span>
                      <span className="text-slate-600">= {a * x + b} mod 26</span>
                      <span className="text-slate-600">= {result}</span>
                      <span className="text-slate-600">→</span>
                      <span className="text-teal-400 font-bold">{ALPHABET[result]}</span>
                    </div>
                  );
                } else {
                  const inv = modInverse(a, 26);
                  const result = ((inv * (x - b + 26)) % 26 + 26) % 26;
                  return (
                    <div key={i} className="text-xs font-mono flex items-center gap-1">
                      <span className="text-slate-400 w-4">{ch}</span>
                      <span className="text-slate-600">→ y={x}</span>
                      <span className="text-slate-600">→ {inv}×({x} − {b}) mod 26</span>
                      <span className="text-slate-600">= {inv}×{((x - b + 26) % 26 + 26) % 26} mod 26</span>
                      <span className="text-slate-600">= {result}</span>
                      <span className="text-slate-600">→</span>
                      <span className="text-teal-400 font-bold">{ALPHABET[result]}</span>
                    </div>
                  );
                }
              })}
              {input.replace(/[^A-Za-z]/g, '').length > 12 && (
                <div className="text-xs text-slate-600 font-mono">... ({input.replace(/[^A-Za-z]/g, '').length - 12} more)</div>
              )}
            </div>
          </div>
        )}

        {/* Brute Force */}
        {input && mode === 'decrypt' && (
          <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-5">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">
              Brute Force — All 312 Keys
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-72 overflow-y-auto">
              {bruteForce.map(({ a: ba, b: bb, text }, i) => {
                const selected = ba === a && bb === b;
                return (
                  <div key={i}
                    className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-mono cursor-pointer hover:bg-slate-800 transition-colors ${
                      selected ? 'bg-teal-900/30 text-teal-300' : 'text-slate-500'
                    }`}
                    onClick={() => { setA(ba); setB(bb); }}
                  >
                    <span className="text-slate-600 w-16 shrink-0">a={ba} b={bb}</span>
                    <span className="truncate">{text.slice(0, 30)}</span>
                  </div>
                );
              })}
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
          <h3 className="text-xl font-bold text-teal-400 mb-2">About the Affine Cipher</h3>
          <div className="text-sm text-slate-300 leading-relaxed space-y-2">
            <p>
              The Affine cipher encrypts each letter using the formula <strong>E(x) = (ax + b) mod 26</strong>,
              where <strong>a</strong> is the multiplier and <strong>b</strong> is the shift. It generalizes both
              the <strong>Caesar cipher</strong> (a=1) and the <strong>Atbash cipher</strong> (a=25, b=25).
            </p>
            <p>
              The multiplier <strong>a</strong> must be <strong>coprime with 26</strong> (gcd(a, 26) = 1) to ensure
              the mapping is one-to-one and reversible. This limits a to 12 values: {VALID_A.join(', ')}.
              Combined with 26 choices for b, the total key space is just <strong>312 keys</strong> — easily brute-forced.
            </p>
            <p>
              Decryption requires the <strong>modular multiplicative inverse</strong> of a, computed via the
              Extended Euclidean Algorithm. This concept is foundational to modern public-key cryptography,
              including <strong>RSA</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

export default App;
