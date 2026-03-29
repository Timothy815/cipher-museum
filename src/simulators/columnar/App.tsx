import React, { useState, useMemo } from 'react';
import { Info, RotateCcw, Shuffle } from 'lucide-react';

// ─── Column colors ──────────────────────────────────────────────────────
const COL_COLORS = [
  { text: 'text-sky-400',     bg: 'bg-sky-950/40',     border: 'border-sky-700/50',     header: 'bg-sky-900/50 border-sky-700 text-sky-300' },
  { text: 'text-amber-400',   bg: 'bg-amber-950/40',   border: 'border-amber-700/50',   header: 'bg-amber-900/50 border-amber-700 text-amber-300' },
  { text: 'text-emerald-400', bg: 'bg-emerald-950/40', border: 'border-emerald-700/50', header: 'bg-emerald-900/50 border-emerald-700 text-emerald-300' },
  { text: 'text-violet-400',  bg: 'bg-violet-950/40',  border: 'border-violet-700/50',  header: 'bg-violet-900/50 border-violet-700 text-violet-300' },
  { text: 'text-rose-400',    bg: 'bg-rose-950/40',    border: 'border-rose-700/50',    header: 'bg-rose-900/50 border-rose-700 text-rose-300' },
  { text: 'text-cyan-400',    bg: 'bg-cyan-950/40',    border: 'border-cyan-700/50',    header: 'bg-cyan-900/50 border-cyan-700 text-cyan-300' },
  { text: 'text-orange-400',  bg: 'bg-orange-950/40',  border: 'border-orange-700/50',  header: 'bg-orange-900/50 border-orange-700 text-orange-300' },
  { text: 'text-pink-400',    bg: 'bg-pink-950/40',    border: 'border-pink-700/50',    header: 'bg-pink-900/50 border-pink-700 text-pink-300' },
  { text: 'text-lime-400',    bg: 'bg-lime-950/40',    border: 'border-lime-700/50',    header: 'bg-lime-900/50 border-lime-700 text-lime-300' },
  { text: 'text-teal-400',    bg: 'bg-teal-950/40',    border: 'border-teal-700/50',    header: 'bg-teal-900/50 border-teal-700 text-teal-300' },
  { text: 'text-indigo-400',  bg: 'bg-indigo-950/40',  border: 'border-indigo-700/50',  header: 'bg-indigo-900/50 border-indigo-700 text-indigo-300' },
  { text: 'text-fuchsia-400', bg: 'bg-fuchsia-950/40', border: 'border-fuchsia-700/50', header: 'bg-fuchsia-900/50 border-fuchsia-700 text-fuchsia-300' },
];

function colColor(i: number) {
  return COL_COLORS[i % COL_COLORS.length];
}

// ─── Columnar transposition logic ───────────────────────────────────────

function getColumnOrder(keyword: string): number[] {
  // Convert keyword to alphabetical column order
  // e.g. "ZEBRA" → Z(5) E(2) B(1) R(4) A(0) → order [4, 2, 0, 3, 1]
  // "order" means: in the sorted position, which original column goes there
  const chars = keyword.toUpperCase().split('');
  const indexed = chars.map((c, i) => ({ char: c, origIndex: i }));
  // Stable sort by character
  indexed.sort((a, b) => {
    if (a.char !== b.char) return a.char.localeCompare(b.char);
    return a.origIndex - b.origIndex; // preserve left-to-right for ties
  });
  // order[sortedPosition] = originalColumn
  const order = indexed.map(x => x.origIndex);
  return order;
}

function getReadOrder(keyword: string): number[] {
  // readOrder[originalColumn] = which position it's read in
  const order = getColumnOrder(keyword);
  const readOrder = new Array(order.length);
  order.forEach((origCol, sortedPos) => {
    readOrder[origCol] = sortedPos;
  });
  return readOrder;
}

interface GridData {
  grid: string[][];     // grid[row][col]
  numRows: number;
  numCols: number;
  columnOrder: number[]; // sorted order → original col index
  readOrder: number[];   // original col → read position
  keyword: string;
  padChar: string;
}

function buildGrid(text: string, keyword: string, padChar: string = 'X'): GridData {
  const numCols = keyword.length;
  if (numCols === 0) return { grid: [], numRows: 0, numCols: 0, columnOrder: [], readOrder: [], keyword, padChar };

  // Pad text to fill complete grid
  const padded = text + padChar.repeat((numCols - (text.length % numCols)) % numCols);
  const numRows = Math.ceil(padded.length / numCols);

  const grid: string[][] = [];
  for (let r = 0; r < numRows; r++) {
    const row: string[] = [];
    for (let c = 0; c < numCols; c++) {
      row.push(padded[r * numCols + c] || padChar);
    }
    grid.push(row);
  }

  return {
    grid,
    numRows,
    numCols,
    columnOrder: getColumnOrder(keyword),
    readOrder: getReadOrder(keyword),
    keyword,
    padChar,
  };
}

function columnarEncrypt(text: string, keyword: string, padChar: string = 'X'): { ciphertext: string; gridData: GridData } {
  const gridData = buildGrid(text, keyword, padChar);
  if (gridData.numCols === 0) return { ciphertext: '', gridData };

  // Read columns in alphabetical keyword order
  let ciphertext = '';
  for (const origCol of gridData.columnOrder) {
    for (let r = 0; r < gridData.numRows; r++) {
      ciphertext += gridData.grid[r][origCol];
    }
  }

  return { ciphertext, gridData };
}

function columnarDecrypt(cipher: string, keyword: string): { plaintext: string; gridData: GridData } {
  const numCols = keyword.length;
  if (numCols === 0 || cipher.length === 0) {
    return { plaintext: '', gridData: { grid: [], numRows: 0, numCols: 0, columnOrder: [], readOrder: [], keyword, padChar: 'X' } };
  }

  const numRows = Math.ceil(cipher.length / numCols);
  const columnOrder = getColumnOrder(keyword);

  // Distribute ciphertext into columns (in sorted order)
  const colLengths = new Array(numCols).fill(numRows);
  // If cipher length doesn't fill completely, shorter columns at the end
  const totalCells = numRows * numCols;
  const shortage = totalCells - cipher.length;
  // Last `shortage` columns (in original order sorted to end) are shorter
  // For simplicity, assume cipher fills exactly (padded on encrypt)

  const columns: string[][] = new Array(numCols);
  let idx = 0;
  for (const origCol of columnOrder) {
    const len = colLengths[origCol];
    columns[origCol] = cipher.slice(idx, idx + len).split('');
    idx += len;
  }

  // Read row by row
  const grid: string[][] = [];
  let plaintext = '';
  for (let r = 0; r < numRows; r++) {
    const row: string[] = [];
    for (let c = 0; c < numCols; c++) {
      const ch = columns[c]?.[r] || '?';
      row.push(ch);
      plaintext += ch;
    }
    grid.push(row);
  }

  const readOrder = getReadOrder(keyword);

  return {
    plaintext,
    gridData: { grid, numRows, numCols, columnOrder, readOrder, keyword, padChar: 'X' },
  };
}

// ─── Preset keywords ────────────────────────────────────────────────────
const PRESETS = [
  { label: 'ZEBRA', keyword: 'ZEBRA' },
  { label: 'GERMAN', keyword: 'GERMAN' },
  { label: 'CIPHER', keyword: 'CIPHER' },
  { label: 'ENIGMA', keyword: 'ENIGMA' },
  { label: 'SECRET', keyword: 'SECRET' },
  { label: 'BLETCHLEY', keyword: 'BLETCHLEY' },
];

function randomKeyword(): string {
  const words = ['CRYPTO', 'ATTACK', 'BERLIN', 'LONDON', 'PARIS', 'TURING', 'ULTRA', 'MAGIC', 'PURPLE', 'SIGNAL', 'DECODE', 'BREACH'];
  return words[Math.floor(Math.random() * words.length)];
}

function App() {
  const [keyword, setKeyword] = useState('ZEBRA');
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [showInfo, setShowInfo] = useState(false);
  const [highlightCol, setHighlightCol] = useState<number | null>(null);

  const cleanInput = input.toUpperCase().replace(/[^A-Z]/g, '');
  const cleanKeyword = keyword.toUpperCase().replace(/[^A-Z]/g, '');

  const result = useMemo(() => {
    if (!cleanInput || !cleanKeyword) return null;
    if (mode === 'encrypt') {
      return columnarEncrypt(cleanInput, cleanKeyword);
    } else {
      const { plaintext, gridData } = columnarDecrypt(cleanInput, cleanKeyword);
      return { ciphertext: plaintext, gridData };
    }
  }, [cleanInput, cleanKeyword, mode]);

  const output = result ? result.ciphertext : '';
  const gridData = result?.gridData;

  // Column read order for numbered header display
  const sortedKeyword = useMemo(() => {
    if (!cleanKeyword) return [];
    const readOrder = getReadOrder(cleanKeyword);
    return cleanKeyword.split('').map((ch, i) => ({
      char: ch,
      origIndex: i,
      readPosition: readOrder[i],
    }));
  }, [cleanKeyword]);

  return (
    <div className="flex-1 bg-[#11140e] flex flex-col items-center justify-start py-10 px-6 text-stone-200">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl sm:text-4xl font-typewriter font-bold text-stone-100 tracking-tighter">
              COLUMNAR <span className="text-sky-500">TRANSPOSITION</span>
            </h1>
            <span className="text-stone-500 text-xs tracking-[0.3em] font-mono">KEYWORD COLUMN REORDER — WWI / WWII</span>
          </div>
          <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-lg hover:bg-stone-800 text-stone-400 border border-stone-700">
            <Info size={20} />
          </button>
        </div>

        {/* Keyword Input */}
        <div className="bg-stone-900/60 rounded-2xl border border-stone-800 p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-[10px] text-stone-500 uppercase tracking-widest font-bold">Keyword</label>
            <div className="flex gap-2">
              <button
                onClick={() => setKeyword(randomKeyword())}
                className="flex items-center gap-1 px-3 py-1 rounded text-xs font-bold border bg-stone-800 border-stone-700 text-stone-400 hover:text-sky-300 hover:border-sky-700 transition-colors"
              >
                <Shuffle size={12} /> Random
              </button>
              <button
                onClick={() => setKeyword('ZEBRA')}
                className="flex items-center gap-1 px-3 py-1 rounded text-xs font-bold border bg-stone-800 border-stone-700 text-stone-400 hover:text-sky-300 transition-colors"
              >
                <RotateCcw size={12} /> Reset
              </button>
            </div>
          </div>
          <input
            value={keyword}
            onChange={e => setKeyword(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
            placeholder="ENTER KEYWORD..."
            className="w-full bg-stone-900 border border-stone-700 rounded-xl px-4 py-3 font-mono text-2xl tracking-[0.5em] text-center focus:outline-none focus:ring-2 focus:ring-sky-500/50 text-sky-300 placeholder-stone-700"
            spellCheck={false}
            maxLength={12}
          />

          {/* Presets */}
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {PRESETS.map(p => (
              <button
                key={p.keyword}
                onClick={() => setKeyword(p.keyword)}
                className={`px-3 py-1 rounded text-xs font-bold border transition-colors ${
                  cleanKeyword === p.keyword
                    ? 'bg-sky-900/50 border-sky-700 text-sky-300'
                    : 'bg-stone-800 border-stone-700 text-stone-500 hover:text-stone-300'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Column order visualization */}
          {cleanKeyword && (
            <div className="mt-6">
              <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-2 text-center">
                Column Read Order (alphabetical sort)
              </div>
              <div className="flex justify-center gap-1">
                {sortedKeyword.map(({ char, origIndex, readPosition }) => (
                  <div
                    key={origIndex}
                    className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
                      highlightCol === origIndex ? 'scale-110' : ''
                    }`}
                    onMouseEnter={() => setHighlightCol(origIndex)}
                    onMouseLeave={() => setHighlightCol(null)}
                  >
                    <div className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center text-lg font-mono font-bold ${colColor(origIndex).header}`}>
                      {char}
                    </div>
                    <div className={`text-[10px] font-mono font-bold ${colColor(origIndex).text}`}>
                      #{readPosition + 1}
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-center mt-2 text-[9px] text-stone-600">
                Read order: {getColumnOrder(cleanKeyword).map((c, i) => (
                  <span key={i} className={`${colColor(c).text} font-bold`}>
                    {cleanKeyword[c]}{i < cleanKeyword.length - 1 ? ' → ' : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Mode toggle */}
        <div className="flex justify-center gap-2 mb-6">
          <button
            onClick={() => setMode('encrypt')}
            className={`px-6 py-2 rounded-lg font-bold text-sm border transition-colors ${
              mode === 'encrypt' ? 'bg-sky-900/50 border-sky-700 text-sky-300' : 'bg-stone-800 border-stone-700 text-stone-400'
            }`}
          >ENCRYPT</button>
          <button
            onClick={() => setMode('decrypt')}
            className={`px-6 py-2 rounded-lg font-bold text-sm border transition-colors ${
              mode === 'decrypt' ? 'bg-sky-900/50 border-sky-700 text-sky-300' : 'bg-stone-800 border-stone-700 text-stone-400'
            }`}
          >DECRYPT</button>
        </div>

        {/* Input / Output */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-xs text-stone-400 font-bold uppercase tracking-wider mb-2">
              {mode === 'encrypt' ? 'Plaintext' : 'Ciphertext'}
            </label>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value.toUpperCase())}
              placeholder="TYPE YOUR MESSAGE..."
              className="w-full h-32 bg-stone-900 border border-stone-700 rounded-xl p-4 font-mono text-lg tracking-wider focus:outline-none focus:ring-2 focus:ring-sky-500/50 resize-none text-stone-200 placeholder-stone-700"
              spellCheck={false}
            />
          </div>
          <div>
            <label className="block text-xs text-sky-400 font-bold uppercase tracking-wider mb-2">
              {mode === 'encrypt' ? 'Ciphertext' : 'Plaintext'}
            </label>
            <div className="w-full h-32 bg-stone-800/50 border border-stone-700/50 rounded-xl p-4 font-mono text-lg tracking-wider text-sky-200 overflow-y-auto break-all">
              {output || <span className="text-stone-700">...</span>}
            </div>
          </div>
        </div>

        {/* ─── Grid Visualization ────────────────────────────────────── */}
        {gridData && gridData.numCols > 0 && gridData.grid.length > 0 && (
          <div className="bg-stone-900/60 rounded-2xl border border-stone-800 p-6 mb-6 overflow-x-auto">
            <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-4">
              {mode === 'encrypt' ? 'Plaintext Grid (write left-to-right, read columns in keyword order)' : 'Reconstructed Grid'}
            </div>

            <div className="inline-block">
              {/* Keyword header */}
              <div className="flex">
                <div className="w-8 flex-shrink-0" /> {/* spacer for row labels */}
                {cleanKeyword.split('').map((ch, c) => (
                  <div
                    key={c}
                    className={`w-10 h-10 flex flex-col items-center justify-center text-sm font-mono font-bold flex-shrink-0 rounded-t border-2 transition-all ${
                      colColor(c).header
                    } ${highlightCol === c ? 'scale-105 brightness-125' : ''}`}
                    onMouseEnter={() => setHighlightCol(c)}
                    onMouseLeave={() => setHighlightCol(null)}
                  >
                    <span>{ch}</span>
                    <span className="text-[8px] opacity-60">#{gridData.readOrder[c] + 1}</span>
                  </div>
                ))}
              </div>

              {/* Grid rows */}
              {gridData.grid.map((row, r) => (
                <div key={r} className="flex">
                  <div className="w-8 flex-shrink-0 flex items-center justify-center text-[9px] font-mono text-stone-600">
                    {r + 1}
                  </div>
                  {row.map((ch, c) => {
                    const isPad = mode === 'encrypt' && r * gridData.numCols + c >= cleanInput.length;
                    return (
                      <div
                        key={c}
                        className={`w-10 h-10 flex items-center justify-center text-sm font-mono font-bold flex-shrink-0 border transition-all ${
                          colColor(c).bg
                        } ${colColor(c).border} ${
                          isPad ? 'opacity-40' : colColor(c).text
                        } ${highlightCol === c ? 'brightness-125 scale-105' : ''}`}
                        onMouseEnter={() => setHighlightCol(c)}
                        onMouseLeave={() => setHighlightCol(null)}
                      >
                        {ch}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Column Extraction (encrypt mode) ──────────────────────── */}
        {mode === 'encrypt' && gridData && gridData.numCols > 0 && gridData.grid.length > 0 && (
          <div className="bg-stone-900/60 rounded-2xl border border-stone-800 p-6 mb-6">
            <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-4">
              Read-Off by Column (alphabetical keyword order)
            </div>
            <div className="space-y-2">
              {gridData.columnOrder.map((origCol, readPos) => {
                const colChars = gridData.grid.map(row => row[origCol]);
                return (
                  <div
                    key={readPos}
                    className={`flex items-center gap-3 transition-all ${highlightCol === origCol ? 'scale-[1.02]' : ''}`}
                    onMouseEnter={() => setHighlightCol(origCol)}
                    onMouseLeave={() => setHighlightCol(null)}
                  >
                    <span className={`text-xs font-bold w-24 flex-shrink-0 ${colColor(origCol).text}`}>
                      Col {cleanKeyword[origCol]} (#{readPos + 1}):
                    </span>
                    <div className="flex gap-[2px]">
                      {colChars.map((ch, i) => (
                        <span
                          key={i}
                          className={`w-8 h-8 flex items-center justify-center text-xs font-mono font-bold rounded ${colColor(origCol).bg} ${colColor(origCol).border} border ${colColor(origCol).text}`}
                        >
                          {ch}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-stone-500 uppercase tracking-widest font-bold">Ciphertext:</span>
              <span className="font-mono text-sm tracking-wider">
                {gridData.columnOrder.map((origCol, readPos) => {
                  const colChars = gridData.grid.map(row => row[origCol]).join('');
                  return (
                    <span
                      key={readPos}
                      className={`${colColor(origCol).text} ${highlightCol === origCol ? 'underline' : ''}`}
                      onMouseEnter={() => setHighlightCol(origCol)}
                      onMouseLeave={() => setHighlightCol(null)}
                    >
                      {colChars}
                    </span>
                  );
                })}
              </span>
            </div>
          </div>
        )}

        {/* ─── How It Works ──────────────────────────────────────────── */}
        <div className="bg-stone-900/40 rounded-xl border border-stone-800 p-5">
          <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-3">
            How It Works
          </div>
          <div className="grid sm:grid-cols-4 gap-4 text-xs text-stone-400">
            <div>
              <div className="font-bold text-sky-400 mb-1">1. Choose Keyword</div>
              <p>The keyword determines column count and read order. Columns are read in alphabetical order of the keyword letters.</p>
            </div>
            <div>
              <div className="font-bold text-sky-400 mb-1">2. Write Grid</div>
              <p>Fill plaintext left-to-right, top-to-bottom into a grid with as many columns as keyword letters. Pad the last row.</p>
            </div>
            <div>
              <div className="font-bold text-sky-400 mb-1">3. Read Columns</div>
              <p>Read each column top-to-bottom, but in alphabetical keyword order. Concatenate to form the ciphertext.</p>
            </div>
            <div>
              <div className="font-bold text-sky-400 mb-1">4. Key Space</div>
              <p>n! permutations for an n-letter keyword. ZEBRA (5 letters) = 120 possible orderings — much stronger than Rail Fence.</p>
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
          <h3 className="text-xl font-bold text-sky-400 mb-2">About Columnar Transposition</h3>
          <p className="text-sm text-stone-300 leading-relaxed mb-3">
            <strong>Columnar transposition</strong> is one of the most historically significant transposition ciphers, used
            extensively in both World Wars. The German <strong>ADFGVX cipher</strong> (1918) used columnar transposition as its
            second stage after Polybius square substitution. <strong>SOE agents</strong> in WWII used double columnar transposition
            — applying the cipher twice with different keywords — for field communications.
          </p>
          <p className="text-sm text-stone-300 leading-relaxed mb-3">
            The cipher works by writing plaintext into a grid row-by-row, then reading it out column-by-column in an order
            determined by alphabetically sorting the keyword. A 5-letter keyword yields 5! = 120 possible column orderings,
            while a 10-letter keyword gives 3,628,800 possibilities — making brute force significantly harder than the Rail Fence cipher.
          </p>
          <p className="text-sm text-stone-300 leading-relaxed">
            <strong>Cryptanalysis:</strong> Single columnar transposition is vulnerable to <strong>anagramming</strong> — rearranging
            columns until recognizable bigrams and trigrams appear. The attacker guesses the keyword length from message length
            factors, then tries column arrangements. Double transposition is much harder but can be broken with enough ciphertext
            using techniques developed by <strong>Friedman</strong> and later <strong>Kullback</strong> at the SIS.
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
