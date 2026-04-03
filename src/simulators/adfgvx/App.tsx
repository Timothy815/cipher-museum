import React, { useState, useMemo } from 'react';
import { Info } from 'lucide-react';
import ExhibitPanel from '../../components/ExhibitPanel';

const GRID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const HEADERS = ['A', 'D', 'F', 'G', 'V', 'X'];

function buildGrid(keyword: string): string[] {
  const seen = new Set<string>();
  const grid: string[] = [];
  const key = keyword.toUpperCase().replace(/[^A-Z0-9]/g, '');
  for (const c of key) {
    if (!seen.has(c)) { grid.push(c); seen.add(c); }
  }
  for (const c of GRID_CHARS) {
    if (!seen.has(c)) { grid.push(c); seen.add(c); }
  }
  return grid;
}

function adfgvxEncrypt(text: string, grid: string[], transKey: string): { fractionated: string; columnar: string; result: string } {
  // Step 1: Fractionation — each letter becomes a pair of ADFGVX
  const clean = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
  let fractionated = '';
  for (const c of clean) {
    const idx = grid.indexOf(c);
    if (idx === -1) continue;
    const row = Math.floor(idx / 6);
    const col = idx % 6;
    fractionated += HEADERS[row] + HEADERS[col];
  }

  // Step 2: Columnar transposition
  const key = transKey.toUpperCase().replace(/[^A-Z]/g, '');
  if (!key) return { fractionated, columnar: fractionated, result: fractionated };

  const numCols = key.length;
  const columns: string[] = Array.from({ length: numCols }, () => '');

  for (let i = 0; i < fractionated.length; i++) {
    columns[i % numCols] += fractionated[i];
  }

  // Sort columns by key letter order
  const order = key.split('').map((c, i) => ({ c, i })).sort((a, b) => a.c.localeCompare(b.c));
  const columnar = order.map(o => `[${key[o.i]}] ${columns[o.i]}`).join('  ');
  const result = order.map(o => columns[o.i]).join('');

  return { fractionated, columnar, result };
}

function adfgvxDecrypt(ciphertext: string, grid: string[], transKey: string): { deTransposed: string; plaintext: string } {
  const clean = ciphertext.toUpperCase().replace(/[^ADFGVX]/g, '');
  const key = transKey.toUpperCase().replace(/[^A-Z]/g, '');
  if (!key || !clean) return { deTransposed: '', plaintext: '' };

  // Step 1: Reverse columnar transposition
  const numCols = key.length;
  const numRows = Math.ceil(clean.length / numCols);
  const fullCells = clean.length;

  // Determine column order (sorted by key letter)
  const order = key.split('').map((c, i) => ({ c, i })).sort((a, b) => a.c.localeCompare(b.c));

  // Calculate how many chars go in each column
  const colLengths: number[] = Array(numCols).fill(0);
  for (let i = 0; i < fullCells; i++) {
    colLengths[i % numCols]++;
  }

  // Fill columns in sorted order
  const columns: string[] = Array(numCols).fill('');
  let pos = 0;
  for (const o of order) {
    const len = colLengths[o.i];
    columns[o.i] = clean.slice(pos, pos + len);
    pos += len;
  }

  // Read row by row
  let deTransposed = '';
  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < numCols; c++) {
      if (r < columns[c].length) {
        deTransposed += columns[c][r];
      }
    }
  }

  // Step 2: Reverse fractionation — pairs of ADFGVX back to letters
  let plaintext = '';
  for (let i = 0; i < deTransposed.length - 1; i += 2) {
    const rowIdx = HEADERS.indexOf(deTransposed[i]);
    const colIdx = HEADERS.indexOf(deTransposed[i + 1]);
    if (rowIdx === -1 || colIdx === -1) continue;
    plaintext += grid[rowIdx * 6 + colIdx];
  }

  return { deTransposed, plaintext };
}

function App() {
  const [gridKey, setGridKey] = useState('PRIVACY');
  const [transKey, setTransKey] = useState('GERMAN');
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [showInfo, setShowInfo] = useState(false);

  const grid = useMemo(() => buildGrid(gridKey), [gridKey]);

  const encResult = mode === 'encrypt' && input ? adfgvxEncrypt(input, grid, transKey) : null;
  const decResult = mode === 'decrypt' && input ? adfgvxDecrypt(input, grid, transKey) : null;

  return (
    <div className="flex-1 bg-[#161210] flex flex-col">
      <ExhibitPanel id="adfgvx" />
      <div className="bg-[#161210] flex flex-col items-center justify-start py-10 px-6 text-stone-200">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl sm:text-4xl font-typewriter font-bold text-stone-100 tracking-tighter">
              ADFGVX <span className="text-orange-400">CIPHER</span>
            </h1>
            <span className="text-stone-500 text-xs tracking-[0.3em] font-mono">WWI GERMAN FIELD CIPHER — 1918</span>
          </div>
          <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-lg hover:bg-stone-800 text-stone-400 border border-stone-700">
            <Info size={20} />
          </button>
        </div>

        {/* Keys */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <div className="bg-stone-900/60 rounded-xl border border-stone-800 p-5">
            <label className="block text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-2">Polybius Grid Key</label>
            <input value={gridKey} onChange={e => setGridKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 font-mono text-lg tracking-wider text-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-center" />
          </div>
          <div className="bg-stone-900/60 rounded-xl border border-stone-800 p-5">
            <label className="block text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-2">Transposition Key</label>
            <input value={transKey} onChange={e => setTransKey(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))} className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 font-mono text-lg tracking-wider text-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-center" />
          </div>
        </div>

        {/* 6x6 Grid */}
        <div className="bg-stone-900/60 rounded-xl border border-stone-800 p-5 mb-8">
          <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-3">6x6 Polybius Square</div>
          <div className="flex justify-center">
            <div>
              <div className="flex gap-1 mb-1">
                <div className="w-10 h-8"></div>
                {HEADERS.map(h => (
                  <div key={h} className="w-10 h-8 flex items-center justify-center text-sm font-mono font-bold text-orange-400">{h}</div>
                ))}
              </div>
              {Array.from({ length: 6 }, (_, r) => (
                <div key={r} className="flex gap-1 mb-1">
                  <div className="w-10 h-10 flex items-center justify-center text-sm font-mono font-bold text-orange-400">{HEADERS[r]}</div>
                  {Array.from({ length: 6 }, (_, c) => {
                    const ch = grid[r * 6 + c];
                    return (
                      <div key={c} className="w-10 h-10 flex items-center justify-center rounded font-mono text-sm font-bold bg-stone-800/50 border border-stone-700 text-stone-300">
                        {ch}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => { setMode('encrypt'); setInput(''); }}
            className={`px-4 py-2 rounded-lg text-sm font-bold tracking-wider transition-colors ${mode === 'encrypt' ? 'bg-orange-500/20 text-orange-300 border border-orange-600/50' : 'bg-stone-800/50 text-stone-500 border border-stone-700 hover:text-stone-300'}`}
          >
            ENCRYPT
          </button>
          <button
            onClick={() => { setMode('decrypt'); setInput(''); }}
            className={`px-4 py-2 rounded-lg text-sm font-bold tracking-wider transition-colors ${mode === 'decrypt' ? 'bg-orange-500/20 text-orange-300 border border-orange-600/50' : 'bg-stone-800/50 text-stone-500 border border-stone-700 hover:text-stone-300'}`}
          >
            DECRYPT
          </button>
        </div>

        {/* I/O */}
        <div className="space-y-4 mb-8">
          <div>
            <label className="block text-xs text-stone-400 font-bold uppercase tracking-wider mb-2">
              {mode === 'encrypt' ? 'Plaintext' : 'Ciphertext (ADFGVX characters only)'}
            </label>
            <textarea value={input} onChange={e => setInput(e.target.value.toUpperCase())} placeholder={mode === 'encrypt' ? 'TYPE YOUR MESSAGE...' : 'PASTE CIPHERTEXT...'} className="w-full h-28 bg-stone-900 border border-stone-700 rounded-xl p-4 font-mono text-lg tracking-wider focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none text-stone-200 placeholder-stone-700" spellCheck={false} />
          </div>

          {mode === 'encrypt' && encResult && (
            <>
              <div>
                <label className="block text-xs text-stone-500 font-bold uppercase tracking-wider mb-2">Step 1: Fractionated (ADFGVX pairs)</label>
                <div className="bg-stone-800/50 border border-stone-700/50 rounded-xl p-4 font-mono text-base tracking-wider text-stone-400 break-all">
                  {encResult.fractionated.match(/.{1,2}/g)?.join(' ')}
                </div>
              </div>
              <div>
                <label className="block text-xs text-orange-400 font-bold uppercase tracking-wider mb-2">Step 2: Final Ciphertext (after transposition)</label>
                <div className="bg-stone-800/50 border border-stone-700/50 rounded-xl p-4 font-mono text-lg tracking-wider text-orange-200 break-all min-h-[3rem]">
                  {encResult.result}
                </div>
              </div>
            </>
          )}

          {mode === 'decrypt' && decResult && (
            <>
              <div>
                <label className="block text-xs text-stone-500 font-bold uppercase tracking-wider mb-2">Step 1: De-transposed (ADFGVX pairs)</label>
                <div className="bg-stone-800/50 border border-stone-700/50 rounded-xl p-4 font-mono text-base tracking-wider text-stone-400 break-all">
                  {decResult.deTransposed.match(/.{1,2}/g)?.join(' ')}
                </div>
              </div>
              <div>
                <label className="block text-xs text-orange-400 font-bold uppercase tracking-wider mb-2">Step 2: Recovered Plaintext</label>
                <div className="bg-stone-800/50 border border-stone-700/50 rounded-xl p-4 font-mono text-lg tracking-wider text-orange-200 break-all min-h-[3rem]">
                  {decResult.plaintext}
                </div>
              </div>
            </>
          )}

          {!encResult && !decResult && (
            <div>
              <label className="block text-xs text-orange-400 font-bold uppercase tracking-wider mb-2">
                {mode === 'encrypt' ? 'Ciphertext' : 'Plaintext'}
              </label>
              <div className="bg-stone-800/50 border border-stone-700/50 rounded-xl p-4 font-mono text-lg tracking-wider text-orange-200 break-all min-h-[3rem]">
                <span className="text-stone-700">...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className={`fixed bottom-0 left-0 right-0 bg-stone-900/95 backdrop-blur border-t border-stone-700 p-6 transform transition-transform duration-300 z-40 ${showInfo ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="max-w-3xl mx-auto relative">
          <button onClick={() => setShowInfo(false)} className="absolute top-0 right-0 p-2 text-stone-500 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <h3 className="text-xl font-bold text-orange-400 mb-2">About the ADFGVX Cipher</h3>
          <p className="text-sm text-stone-300 leading-relaxed">
            Used by the <strong>German Army</strong> during the Spring Offensive of 1918. Combines two powerful
            techniques: <strong>fractionation</strong> (each letter becomes a pair from the set A, D, F, G, V, X —
            chosen because they sound distinct in Morse code) via a 6x6 Polybius square, followed by
            <strong> columnar transposition</strong>. Broken by French cryptanalyst <strong>Georges Painvin</strong>
            in one of the greatest cryptanalytic feats of WWI, though it nearly killed him from exhaustion.
          </p>
        </div>
      </div>
    </div>
    </div>
  );
}

export default App;
