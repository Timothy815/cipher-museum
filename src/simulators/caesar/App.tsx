import React, { useState } from 'react';
import { Info, RotateCcw } from 'lucide-react';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function caesarEncrypt(text: string, shift: number): string {
  return text.toUpperCase().split('').map(c => {
    const i = ALPHABET.indexOf(c);
    if (i === -1) return c;
    return ALPHABET[(i + shift + 26) % 26];
  }).join('');
}

function App() {
  const [shift, setShift] = useState(3); // Caesar's original shift
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [showInfo, setShowInfo] = useState(false);

  const effectiveShift = mode === 'encrypt' ? shift : (26 - shift) % 26;
  const output = caesarEncrypt(input, effectiveShift);

  return (
    <div className="flex-1 bg-[#1a1814] flex flex-col items-center justify-start py-10 px-6 text-stone-200">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl sm:text-4xl font-typewriter font-bold text-stone-100 tracking-tighter">
              CAESAR <span className="text-yellow-500">CIPHER</span>
            </h1>
            <span className="text-stone-500 text-xs tracking-[0.3em] font-mono">SHIFT CIPHER — ~50 BC</span>
          </div>
          <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-lg hover:bg-stone-800 text-stone-400 border border-stone-700">
            <Info size={20} />
          </button>
        </div>

        {/* Shift Wheel */}
        <div className="bg-stone-900/60 rounded-2xl border border-stone-800 p-8 mb-8">
          <div className="text-center mb-6">
            <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-2">Shift Value</div>
            <div className="text-6xl font-typewriter font-bold text-yellow-400">{shift}</div>
          </div>

          {/* Alphabet visualization */}
          <div className="mb-6">
            <div className="flex justify-center gap-[2px] mb-1">
              {ALPHABET.split('').map(c => (
                <div key={c} className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-[10px] sm:text-xs font-mono text-stone-400 bg-stone-800/50 rounded">
                  {c}
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-[2px]">
              {ALPHABET.split('').map((c, i) => (
                <div key={c} className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-[10px] sm:text-xs font-mono font-bold text-yellow-400 bg-yellow-950/30 rounded border border-yellow-900/30">
                  {ALPHABET[(i + shift) % 26]}
                </div>
              ))}
            </div>
          </div>

          {/* Shift slider */}
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0"
              max="25"
              value={shift}
              onChange={e => setShift(Number(e.target.value))}
              className="flex-1 accent-yellow-500"
            />
            <button onClick={() => setShift(3)} className="text-stone-500 hover:text-yellow-400 p-1" title="Reset to Caesar's shift (3)">
              <RotateCcw size={16} />
            </button>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex justify-center gap-2 mb-6">
          <button
            onClick={() => setMode('encrypt')}
            className={`px-6 py-2 rounded-lg font-bold text-sm border transition-colors ${
              mode === 'encrypt' ? 'bg-yellow-900/50 border-yellow-700 text-yellow-300' : 'bg-stone-800 border-stone-700 text-stone-400'
            }`}
          >ENCRYPT</button>
          <button
            onClick={() => setMode('decrypt')}
            className={`px-6 py-2 rounded-lg font-bold text-sm border transition-colors ${
              mode === 'decrypt' ? 'bg-yellow-900/50 border-yellow-700 text-yellow-300' : 'bg-stone-800 border-stone-700 text-stone-400'
            }`}
          >DECRYPT</button>
        </div>

        {/* Input/Output */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-xs text-stone-400 font-bold uppercase tracking-wider mb-2">
              {mode === 'encrypt' ? 'Plaintext' : 'Ciphertext'}
            </label>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value.toUpperCase())}
              placeholder="TYPE YOUR MESSAGE..."
              className="w-full h-40 bg-stone-900 border border-stone-700 rounded-xl p-4 font-mono text-lg tracking-wider focus:outline-none focus:ring-2 focus:ring-yellow-500/50 resize-none text-stone-200 placeholder-stone-700"
              spellCheck={false}
            />
          </div>
          <div>
            <label className="block text-xs text-yellow-400 font-bold uppercase tracking-wider mb-2">
              {mode === 'encrypt' ? 'Ciphertext' : 'Plaintext'}
            </label>
            <div className="w-full h-40 bg-stone-800/50 border border-stone-700/50 rounded-xl p-4 font-mono text-lg tracking-wider text-yellow-200 overflow-y-auto break-all">
              {output || <span className="text-stone-700">...</span>}
            </div>
          </div>
        </div>

        {/* Brute Force */}
        <div className="bg-stone-900/40 rounded-xl border border-stone-800 p-5">
          <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-3">
            Brute Force — All 25 Shifts
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-60 overflow-y-auto">
            {Array.from({ length: 25 }, (_, i) => i + 1).map(s => (
              <div
                key={s}
                className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-mono cursor-pointer hover:bg-stone-800 transition-colors ${
                  s === shift ? 'bg-yellow-900/30 text-yellow-300' : 'text-stone-500'
                }`}
                onClick={() => { setShift(s); setMode('decrypt'); }}
              >
                <span className="text-stone-600 w-8">+{s}</span>
                <span className="truncate">{caesarEncrypt(input || 'HELLO', (26 - s) % 26)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className={`fixed bottom-0 left-0 right-0 bg-stone-900/95 backdrop-blur border-t border-stone-700 p-6 transform transition-transform duration-300 z-40 ${showInfo ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="max-w-3xl mx-auto relative">
          <button onClick={() => setShowInfo(false)} className="absolute top-0 right-0 p-2 text-stone-500 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <h3 className="text-xl font-bold text-yellow-400 mb-2">About the Caesar Cipher</h3>
          <p className="text-sm text-stone-300 leading-relaxed">
            Named after <strong>Julius Caesar</strong>, who used it to communicate with his generals (~50 BC).
            Each letter is shifted by a fixed number of positions in the alphabet. Caesar himself used a shift of 3.
            With only 25 possible keys, it can be broken instantly by trying all shifts — the <strong>brute force</strong>
            panel below demonstrates this. Despite its simplicity, it's the foundation of all substitution ciphers.
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
