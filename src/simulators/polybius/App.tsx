import React, { useState, useMemo } from 'react';
import { Info, RotateCcw, Shuffle } from 'lucide-react';
import ExhibitPanel from '../../components/ExhibitPanel';

// ─── Polybius Square logic ──────────────────────────────────────────────
// Classic 5x5 grid (I/J merged) with configurable row/column headers.

const DEFAULT_HEADERS = '12345';
const ADFGVX_HEADERS = 'ADFGVX'; // 6x6 variant with digits

function buildAlphabet(keyword: string, size: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  const pool = size === 6
    ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    : 'ABCDEFGHIKLMNOPQRSTUVWXYZ'; // I/J merged for 5x5

  // Keyword letters first
  for (const ch of keyword.toUpperCase()) {
    const c = ch === 'J' && size === 5 ? 'I' : ch;
    if (!seen.has(c) && pool.includes(c)) {
      seen.add(c);
      result.push(c);
    }
  }
  // Fill remaining
  for (const c of pool) {
    if (!seen.has(c)) {
      seen.add(c);
      result.push(c);
    }
  }
  return result;
}

function polybiusEncrypt(text: string, alphabet: string[], headers: string, size: number): string {
  const map = new Map<string, string>();
  for (let i = 0; i < alphabet.length; i++) {
    const row = Math.floor(i / size);
    const col = i % size;
    map.set(alphabet[i], headers[row] + headers[col]);
  }
  // I/J equivalence for 5x5
  if (size === 5) {
    const jCode = map.get('I');
    if (jCode) map.set('J', jCode);
  }

  return text.toUpperCase().split('').map(ch => {
    const code = map.get(ch);
    if (code) return code;
    if (ch === ' ') return ' ';
    return '';
  }).join('');
}

function polybiusDecrypt(cipher: string, alphabet: string[], headers: string, size: number): string {
  const map = new Map<string, string>();
  for (let i = 0; i < alphabet.length; i++) {
    const row = Math.floor(i / size);
    const col = i % size;
    map.set(headers[row] + headers[col], alphabet[i]);
  }

  // Parse pairs (skip spaces)
  let result = '';
  let i = 0;
  const clean = cipher.toUpperCase();
  while (i < clean.length) {
    if (clean[i] === ' ') {
      result += ' ';
      i++;
      continue;
    }
    if (i + 1 < clean.length) {
      const pair = clean[i] + clean[i + 1];
      const ch = map.get(pair);
      result += ch || '?';
      i += 2;
    } else {
      i++;
    }
  }
  return result;
}

const PRESETS = [
  { label: 'Classic (1-5)', headers: '12345', size: 5, keyword: '' },
  { label: 'ADFGX', headers: 'ADFGX', size: 5, keyword: '' },
  { label: 'ADFGVX (6×6)', headers: 'ADFGVX', size: 6, keyword: '' },
  { label: 'Alpha headers', headers: 'ABCDE', size: 5, keyword: '' },
];

function App() {
  const [keyword, setKeyword] = useState('');
  const [headers, setHeaders] = useState(DEFAULT_HEADERS);
  const [gridSize, setGridSize] = useState(5);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [showInfo, setShowInfo] = useState(false);
  const [highlightCell, setHighlightCell] = useState<number | null>(null);

  const alphabet = useMemo(() => buildAlphabet(keyword, gridSize), [keyword, gridSize]);

  const output = useMemo(() => {
    if (!input) return '';
    return mode === 'encrypt'
      ? polybiusEncrypt(input, alphabet, headers, gridSize)
      : polybiusDecrypt(input, alphabet, headers, gridSize);
  }, [input, alphabet, headers, gridSize, mode]);

  // Build coordinate lookup for highlighting
  const charToCoord = useMemo(() => {
    const map = new Map<string, { row: number; col: number; code: string }>();
    for (let i = 0; i < alphabet.length; i++) {
      const row = Math.floor(i / gridSize);
      const col = i % gridSize;
      map.set(alphabet[i], { row, col, code: headers[row] + headers[col] });
    }
    if (gridSize === 5) {
      const iCoord = map.get('I');
      if (iCoord) map.set('J', iCoord);
    }
    return map;
  }, [alphabet, headers, gridSize]);

  return (
    <div className="flex-1 bg-[#141610] flex flex-col">
      <ExhibitPanel id="polybius" />
      <div className="bg-[#141610] flex flex-col items-center justify-start py-10 px-6 text-stone-200">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl sm:text-4xl font-typewriter font-bold text-stone-100 tracking-tighter">
              POLYBIUS <span className="text-lime-500">SQUARE</span>
            </h1>
            <span className="text-stone-500 text-xs tracking-[0.3em] font-mono">COORDINATE SUBSTITUTION — ~150 BC</span>
          </div>
          <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-lg hover:bg-stone-800 text-stone-400 border border-stone-700">
            <Info size={20} />
          </button>
        </div>

        {/* Configuration */}
        <div className="bg-stone-900/60 rounded-2xl border border-stone-800 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold">Grid Configuration</div>
            <button
              onClick={() => { setKeyword(''); setHeaders(DEFAULT_HEADERS); setGridSize(5); }}
              className="flex items-center gap-1 px-3 py-1 rounded text-xs font-bold border bg-stone-800 border-stone-700 text-stone-400 hover:text-lime-300 transition-colors"
            >
              <RotateCcw size={12} /> Reset
            </button>
          </div>

          {/* Presets */}
          <div className="flex flex-wrap gap-2 mb-4">
            {PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => { setHeaders(p.headers); setGridSize(p.size); }}
                className={`px-3 py-1 rounded text-xs font-bold border transition-colors ${
                  headers === p.headers && gridSize === p.size
                    ? 'bg-lime-900/50 border-lime-700 text-lime-300'
                    : 'bg-stone-800 border-stone-700 text-stone-500 hover:text-stone-300'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Keyword */}
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-1">
                Keyword (optional — shuffles alphabet)
              </label>
              <input
                value={keyword}
                onChange={e => setKeyword(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                placeholder="KEYWORD"
                className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-lime-500/50 text-lime-300 placeholder-stone-700"
              />
            </div>
            <div>
              <label className="block text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-1">
                Row/Column Headers
              </label>
              <input
                value={headers}
                onChange={e => {
                  const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                  if (val.length <= gridSize) setHeaders(val);
                }}
                className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-lime-500/50 text-lime-300 placeholder-stone-700"
              />
            </div>
          </div>

          {/* The Grid */}
          <div className="flex justify-center">
            <div className="inline-block">
              {/* Column headers */}
              <div className="flex">
                <div className="w-10 h-8 flex-shrink-0" /> {/* corner */}
                {headers.split('').slice(0, gridSize).map((h, c) => (
                  <div key={c} className="w-10 h-8 flex items-center justify-center text-xs font-mono font-bold text-lime-400 flex-shrink-0">
                    {h}
                  </div>
                ))}
              </div>
              {/* Grid rows */}
              {Array.from({ length: gridSize }, (_, r) => (
                <div key={r} className="flex">
                  {/* Row header */}
                  <div className="w-10 h-10 flex items-center justify-center text-xs font-mono font-bold text-lime-400 flex-shrink-0">
                    {headers[r]}
                  </div>
                  {/* Cells */}
                  {Array.from({ length: gridSize }, (_, c) => {
                    const idx = r * gridSize + c;
                    const ch = alphabet[idx] || '';
                    const isHighlight = highlightCell === idx;
                    const isKeyword = keyword.toUpperCase().includes(ch) || (ch === 'I' && keyword.toUpperCase().includes('J'));
                    return (
                      <div
                        key={c}
                        className={`w-10 h-10 flex items-center justify-center text-sm font-mono font-bold flex-shrink-0 border rounded transition-all cursor-default ${
                          isHighlight
                            ? 'bg-lime-600/40 border-lime-400 text-lime-200 scale-110'
                            : isKeyword
                            ? 'bg-lime-950/60 border-lime-700/50 text-lime-300'
                            : 'bg-stone-800/40 border-stone-700/50 text-stone-300'
                        }`}
                        onMouseEnter={() => setHighlightCell(idx)}
                        onMouseLeave={() => setHighlightCell(null)}
                      >
                        {ch}
                        {gridSize === 5 && ch === 'I' && (
                          <span className="text-[7px] text-stone-600 absolute ml-4 mt-3">/J</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Highlight info */}
          {highlightCell !== null && alphabet[highlightCell] && (
            <div className="text-center mt-3 text-xs font-mono">
              <span className="text-stone-500">{alphabet[highlightCell]} = </span>
              <span className="text-lime-400 font-bold">
                {headers[Math.floor(highlightCell / gridSize)]}{headers[highlightCell % gridSize]}
              </span>
            </div>
          )}
        </div>

        {/* Mode toggle */}
        <div className="flex justify-center gap-2 mb-6">
          <button
            onClick={() => setMode('encrypt')}
            className={`px-6 py-2 rounded-lg font-bold text-sm border transition-colors ${
              mode === 'encrypt' ? 'bg-lime-900/50 border-lime-700 text-lime-300' : 'bg-stone-800 border-stone-700 text-stone-400'
            }`}
          >ENCRYPT</button>
          <button
            onClick={() => setMode('decrypt')}
            className={`px-6 py-2 rounded-lg font-bold text-sm border transition-colors ${
              mode === 'decrypt' ? 'bg-lime-900/50 border-lime-700 text-lime-300' : 'bg-stone-800 border-stone-700 text-stone-400'
            }`}
          >DECRYPT</button>
        </div>

        {/* Input / Output */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-xs text-stone-400 font-bold uppercase tracking-wider mb-2">
              {mode === 'encrypt' ? 'Plaintext' : 'Ciphertext (coordinate pairs)'}
            </label>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value.toUpperCase())}
              placeholder={mode === 'encrypt' ? 'TYPE YOUR MESSAGE...' : '11 22 33 44...'}
              className="w-full h-32 bg-stone-900 border border-stone-700 rounded-xl p-4 font-mono text-lg tracking-wider focus:outline-none focus:ring-2 focus:ring-lime-500/50 resize-none text-stone-200 placeholder-stone-700"
              spellCheck={false}
            />
          </div>
          <div>
            <label className="block text-xs text-lime-400 font-bold uppercase tracking-wider mb-2">
              {mode === 'encrypt' ? 'Ciphertext' : 'Plaintext'}
            </label>
            <div className="w-full h-32 bg-stone-800/50 border border-stone-700/50 rounded-xl p-4 font-mono text-lg tracking-[0.3em] text-lime-200 overflow-y-auto break-all">
              {output || <span className="text-stone-700">...</span>}
            </div>
          </div>
        </div>

        {/* Letter-by-letter breakdown (encrypt) */}
        {mode === 'encrypt' && input && (
          <div className="bg-stone-900/60 rounded-2xl border border-stone-800 p-6 mb-6">
            <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-3">
              Encoding Breakdown
            </div>
            <div className="flex flex-wrap gap-2">
              {input.toUpperCase().split('').filter(ch => ch !== ' ' && charToCoord.has(ch === 'J' && gridSize === 5 ? 'I' : ch)).map((ch, i) => {
                const lookup = ch === 'J' && gridSize === 5 ? 'I' : ch;
                const coord = charToCoord.get(lookup);
                return (
                  <div key={i} className="flex flex-col items-center py-2 px-2 rounded-lg bg-stone-800/40">
                    <span className="text-sm font-mono font-bold text-stone-300">{ch}</span>
                    <span className="text-[9px] text-stone-600 my-0.5">↓</span>
                    <span className="text-sm font-mono font-bold text-lime-400">{coord?.code}</span>
                    <span className="text-[8px] text-stone-600">
                      r{coord?.row}{' '}c{coord?.col}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* How It Works */}
        <div className="bg-stone-900/40 rounded-xl border border-stone-800 p-5">
          <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-3">How It Works</div>
          <div className="grid sm:grid-cols-3 gap-4 text-xs text-stone-400">
            <div>
              <div className="font-bold text-lime-400 mb-1">1. Build Grid</div>
              <p>Arrange 25 letters (I/J shared) in a 5×5 grid, optionally shuffled by keyword. The 6×6 variant (ADFGVX) adds digits 0-9.</p>
            </div>
            <div>
              <div className="font-bold text-lime-400 mb-1">2. Encode</div>
              <p>Replace each letter with its row and column header pair. "A" at row 1, col 1 becomes "11". This is fractionation — splitting each letter into two symbols.</p>
            </div>
            <div>
              <div className="font-bold text-lime-400 mb-1">3. Applications</div>
              <p>The Polybius square is the first stage of ADFGVX (WWI). It enables torch/flag signaling (only 5 symbols needed) and is the ancestor of all fractionation ciphers.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Panel */}
      <div className={`fixed bottom-0 left-0 right-0 bg-stone-900/95 backdrop-blur border-t border-stone-700 p-6 transform transition-transform duration-300 z-40 ${showInfo ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="max-w-3xl mx-auto relative">
          <button onClick={() => setShowInfo(false)} className="absolute top-0 right-0 p-2 text-stone-500 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <h3 className="text-xl font-bold text-lime-400 mb-2">About the Polybius Square</h3>
          <p className="text-sm text-stone-300 leading-relaxed mb-3">
            The <strong>Polybius square</strong> was described by the Greek historian <strong>Polybius</strong> around <strong>150 BC</strong>
            as a method for encoding messages using torches for long-distance signaling. By representing each letter as a pair of
            coordinates (row, column), the 26-letter alphabet could be transmitted using only 5 distinct symbols.
          </p>
          <p className="text-sm text-stone-300 leading-relaxed mb-3">
            This <strong>fractionation</strong> — splitting one letter into two symbols — is a profound idea. It enables the letter's
            identity to be "smeared" across two positions, making frequency analysis harder when combined with transposition.
            The <strong>ADFGVX cipher</strong> used by Germany in WWI exploited exactly this: Polybius square encoding followed by
            columnar transposition.
          </p>
          <p className="text-sm text-stone-300 leading-relaxed">
            The 5×5 grid merges I and J (since they were often interchangeable in Latin). The 6×6 ADFGVX variant adds the digits
            0-9, using the letters A, D, F, G, V, X as headers — chosen because they sound distinct in Morse code, reducing
            transmission errors on the battlefield.
          </p>
        </div>
      </div>
    </div>
    </div>
  );
}

export default App;
