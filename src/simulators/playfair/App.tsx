import React, { useState, useMemo } from 'react';
import { Info } from 'lucide-react';
import ExhibitPanel from '../../components/ExhibitPanel';

const ALPHABET = 'ABCDEFGHIKLMNOPQRSTUVWXYZ'; // no J (merged with I)

function buildGrid(keyword: string): string[] {
  const seen = new Set<string>();
  const grid: string[] = [];
  const key = keyword.toUpperCase().replace(/J/g, 'I').replace(/[^A-Z]/g, '');
  for (const c of key) {
    if (!seen.has(c)) { grid.push(c); seen.add(c); }
  }
  for (const c of ALPHABET) {
    if (!seen.has(c)) { grid.push(c); seen.add(c); }
  }
  return grid;
}

function findPos(grid: string[], c: string): [number, number] {
  const idx = grid.indexOf(c === 'J' ? 'I' : c);
  return [Math.floor(idx / 5), idx % 5];
}

function playfairProcess(text: string, grid: string[], decrypt: boolean): string {
  // Prepare digraphs
  const clean = text.toUpperCase().replace(/J/g, 'I').replace(/[^A-Z]/g, '');
  const pairs: string[] = [];
  let i = 0;
  while (i < clean.length) {
    const a = clean[i];
    const b = i + 1 < clean.length ? clean[i + 1] : 'X';
    if (a === b) {
      pairs.push(a + 'X');
      i++;
    } else {
      pairs.push(a + b);
      i += 2;
    }
  }
  if (pairs.length > 0 && pairs[pairs.length - 1].length === 1) {
    pairs[pairs.length - 1] += 'X';
  }

  const dir = decrypt ? -1 : 1;

  return pairs.map(pair => {
    const [r1, c1] = findPos(grid, pair[0]);
    const [r2, c2] = findPos(grid, pair[1]);

    if (r1 === r2) {
      // Same row
      return grid[r1 * 5 + (c1 + dir + 5) % 5] + grid[r2 * 5 + (c2 + dir + 5) % 5];
    } else if (c1 === c2) {
      // Same column
      return grid[((r1 + dir + 5) % 5) * 5 + c1] + grid[((r2 + dir + 5) % 5) * 5 + c2];
    } else {
      // Rectangle
      return grid[r1 * 5 + c2] + grid[r2 * 5 + c1];
    }
  }).join(' ');
}

function App() {
  const [keyword, setKeyword] = useState('MONARCHY');
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [showInfo, setShowInfo] = useState(false);

  const grid = useMemo(() => buildGrid(keyword), [keyword]);
  const output = input ? playfairProcess(input, grid, mode === 'decrypt') : '';

  return (
    <div className="flex-1 bg-[#14160e] flex flex-col">
      <ExhibitPanel id="playfair" />
      <div className="bg-[#14160e] flex flex-col items-center justify-start py-10 px-6 text-stone-200">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl sm:text-4xl font-typewriter font-bold text-stone-100 tracking-tighter">
              PLAYFAIR <span className="text-lime-400">CIPHER</span>
            </h1>
            <span className="text-stone-500 text-xs tracking-[0.3em] font-mono">DIGRAPH SUBSTITUTION — 1854</span>
          </div>
          <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-lg hover:bg-stone-800 text-stone-400 border border-stone-700">
            <Info size={20} />
          </button>
        </div>

        {/* Keyword + Grid */}
        <div className="bg-stone-900/60 rounded-2xl border border-stone-800 p-6 mb-8">
          <label className="block text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-2">Keyword</label>
          <input
            value={keyword}
            onChange={e => setKeyword(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
            className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 font-mono text-2xl tracking-[0.5em] text-lime-300 focus:outline-none focus:ring-2 focus:ring-lime-500/50 text-center mb-6"
            placeholder="KEYWORD"
          />

          {/* 5x5 Grid */}
          <div className="flex justify-center">
            <div className="grid grid-cols-5 gap-1">
              {grid.map((c, i) => {
                const isKeyChar = keyword.toUpperCase().replace(/J/g, 'I').includes(c);
                return (
                  <div
                    key={i}
                    className={`w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-lg font-mono text-xl font-bold border transition-colors ${
                      isKeyChar
                        ? 'bg-lime-950/50 border-lime-800/50 text-lime-300'
                        : 'bg-stone-800/50 border-stone-700 text-stone-300'
                    }`}
                  >
                    {c}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="text-center mt-3 text-[10px] text-stone-600 font-mono">I/J merged into one cell</div>
        </div>

        {/* Mode */}
        <div className="flex justify-center gap-2 mb-6">
          <button onClick={() => setMode('encrypt')} className={`px-6 py-2 rounded-lg font-bold text-sm border transition-colors ${mode === 'encrypt' ? 'bg-lime-900/50 border-lime-700 text-lime-300' : 'bg-stone-800 border-stone-700 text-stone-400'}`}>ENCRYPT</button>
          <button onClick={() => setMode('decrypt')} className={`px-6 py-2 rounded-lg font-bold text-sm border transition-colors ${mode === 'decrypt' ? 'bg-lime-900/50 border-lime-700 text-lime-300' : 'bg-stone-800 border-stone-700 text-stone-400'}`}>DECRYPT</button>
        </div>

        {/* I/O */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs text-stone-400 font-bold uppercase tracking-wider mb-2">{mode === 'encrypt' ? 'Plaintext' : 'Ciphertext'}</label>
            <textarea value={input} onChange={e => setInput(e.target.value.toUpperCase())} placeholder="TYPE YOUR MESSAGE..." className="w-full h-40 bg-stone-900 border border-stone-700 rounded-xl p-4 font-mono text-lg tracking-wider focus:outline-none focus:ring-2 focus:ring-lime-500/50 resize-none text-stone-200 placeholder-stone-700" spellCheck={false} />
          </div>
          <div>
            <label className="block text-xs text-lime-400 font-bold uppercase tracking-wider mb-2">{mode === 'encrypt' ? 'Ciphertext' : 'Plaintext'} (digraphs)</label>
            <div className="w-full h-40 bg-stone-800/50 border border-stone-700/50 rounded-xl p-4 font-mono text-lg tracking-wider text-lime-200 overflow-y-auto break-all">
              {output || <span className="text-stone-700">...</span>}
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
          <h3 className="text-xl font-bold text-lime-400 mb-2">About the Playfair Cipher</h3>
          <p className="text-sm text-stone-300 leading-relaxed">
            Invented by <strong>Charles Wheatstone</strong> in 1854 but named after Lord Playfair who promoted it.
            The first practical <strong>digraph substitution cipher</strong> — encrypting pairs of letters using a 5x5 grid.
            Letters I and J share a cell. Same-row pairs shift right, same-column pairs shift down, and rectangle
            pairs swap columns. Used by the British in the Boer War and WWI. Significantly harder to break than
            simple substitution because letter frequency analysis requires digraph analysis.
          </p>
        </div>
      </div>
    </div>
    </div>
  );
}

export default App;
