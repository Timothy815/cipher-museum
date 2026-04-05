import React, { useState, useMemo } from 'react';
import { Info, RotateCcw } from 'lucide-react';
import ExhibitPanel from '../../components/ExhibitPanel';

// 27 symbols: 26 letters + "." as the 27th (filler/period)
const TRIFID_ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ.';

function generateCube(key: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  const k = key.toUpperCase().replace(/[^A-Z.]/g, '');
  for (const ch of k) {
    if (!seen.has(ch)) { seen.add(ch); result.push(ch); }
  }
  for (const ch of TRIFID_ALPHA) {
    if (!seen.has(ch)) { seen.add(ch); result.push(ch); }
  }
  return result;
}

function findPos(cube: string[], ch: string): [number, number, number] {
  const idx = cube.indexOf(ch);
  const layer = Math.floor(idx / 9);
  const row = Math.floor((idx % 9) / 3);
  const col = idx % 3;
  return [layer, row, col];
}

function trifidEncrypt(text: string, cube: string[], period: number): {
  output: string; layers: number[]; rows: number[]; cols: number[];
} {
  const plain = text.toUpperCase().split('').filter(c => cube.includes(c));
  if (plain.length === 0) return { output: '', layers: [], rows: [], cols: [] };

  const layers: number[] = [], rows: number[] = [], cols: number[] = [];
  for (const ch of plain) {
    const [l, r, c] = findPos(cube, ch);
    layers.push(l); rows.push(r); cols.push(c);
  }

  const result: string[] = [];
  for (let start = 0; start < plain.length; start += period) {
    const end = Math.min(start + period, plain.length);
    const bL = layers.slice(start, end);
    const bR = rows.slice(start, end);
    const bC = cols.slice(start, end);
    const stream = [...bL, ...bR, ...bC];
    // Read off in triplets
    for (let i = 0; i < stream.length; i += 3) {
      const l = stream[i] ?? 0;
      const r = stream[i + 1] ?? 0;
      const c = stream[i + 2] ?? 0;
      result.push(cube[l * 9 + r * 3 + c]);
    }
  }

  return { output: result.join(''), layers, rows, cols };
}

function trifidDecrypt(text: string, cube: string[], period: number): {
  output: string; layers: number[]; rows: number[]; cols: number[];
} {
  const cipher = text.toUpperCase().split('').filter(c => cube.includes(c));
  if (cipher.length === 0) return { output: '', layers: [], rows: [], cols: [] };

  const layers: number[] = [], rows: number[] = [], cols: number[] = [];
  const result: string[] = [];

  for (let start = 0; start < cipher.length; start += period) {
    const end = Math.min(start + period, cipher.length);
    const blockLen = end - start;
    const block = cipher.slice(start, end);

    // Convert ciphertext block to triplets
    const stream: number[] = [];
    for (const ch of block) {
      const [l, r, c] = findPos(cube, ch);
      stream.push(l, r, c);
    }

    // Split stream back into layers, rows, cols
    const bL = stream.slice(0, blockLen);
    const bR = stream.slice(blockLen, blockLen * 2);
    const bC = stream.slice(blockLen * 2, blockLen * 3);

    layers.push(...bL);
    rows.push(...bR);
    cols.push(...bC);

    for (let i = 0; i < blockLen; i++) {
      result.push(cube[bL[i] * 9 + bR[i] * 3 + bC[i]]);
    }
  }

  return { output: result.join(''), layers, rows, cols };
}

function App() {
  const [keyPhrase, setKeyPhrase] = useState('TRIFID');
  const [period, setPeriod] = useState(5);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [showInfo, setShowInfo] = useState(false);

  const cube = useMemo(() => generateCube(keyPhrase), [keyPhrase]);
  const effectivePeriod = period === 0 ? 9999 : period;

  const result = useMemo(() => {
    if (!input) return { output: '', layers: [], rows: [], cols: [] };
    return mode === 'encrypt'
      ? trifidEncrypt(input, cube, effectivePeriod)
      : trifidDecrypt(input, cube, effectivePeriod);
  }, [input, cube, effectivePeriod, mode]);

  const plainLetters = input.toUpperCase().split('').filter(c => cube.includes(c));

  return (
    <div className="flex-1 bg-[#111318] flex flex-col">
      <ExhibitPanel id="trifid" />
      <div className="bg-[#111318] flex flex-col items-center justify-start py-10 px-6 text-slate-200">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl sm:text-4xl font-typewriter font-bold text-slate-100 tracking-tighter">
              TRIFID <span className="text-indigo-400">CIPHER</span>
            </h1>
            <span className="text-slate-500 text-xs tracking-[0.3em] font-mono">3D FRACTIONATION — DELASTELLE, 1901</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 border border-slate-700">
              <Info size={20} />
            </button>
            <button onClick={() => setInput('')} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 border border-slate-700">
              <RotateCcw size={20} />
            </button>
          </div>
        </div>

        {/* Key + Period */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6">
            <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">Key Phrase</label>
            <input
              value={keyPhrase}
              onChange={e => setKeyPhrase(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 font-mono text-xl tracking-[0.3em] text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-center"
              placeholder="KEYWORD"
              spellCheck={false}
            />
          </div>
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6">
            <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">
              Period {period === 0 ? '(full message)' : `(${period})`}
            </label>
            <input
              type="range" min="0" max="15" value={period}
              onChange={e => setPeriod(Number(e.target.value))}
              className="w-full accent-indigo-500 mt-3"
            />
            <div className="flex justify-between text-[10px] text-slate-600 font-mono mt-1">
              <span>∞ (full)</span>
              <span>15</span>
            </div>
          </div>
        </div>

        {/* 3×3×3 Cube Display */}
        <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-5 mb-8">
          <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold text-center mb-4">
            3 × 3 × 3 Cube (27 symbols: A–Z + ".")
          </div>
          <div className="flex justify-center gap-6 flex-wrap">
            {[0, 1, 2].map(layer => (
              <div key={layer}>
                <div className="text-[10px] text-indigo-400/70 font-mono font-bold text-center mb-2">
                  Layer {layer}
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {[0, 1, 2].map(row => (
                    [0, 1, 2].map(col => {
                      const idx = layer * 9 + row * 3 + col;
                      const ch = cube[idx];
                      const isHighlighted = plainLetters.includes(ch);
                      return (
                        <div key={`${row}-${col}`} className={`w-10 h-10 flex flex-col items-center justify-center rounded font-mono text-sm border transition-colors ${
                          isHighlighted
                            ? 'bg-indigo-900/40 border-indigo-700/50 text-indigo-300 font-bold'
                            : 'bg-slate-800/60 border-slate-700/40 text-slate-300'
                        }`}>
                          <span>{ch}</span>
                          <span className="text-[8px] text-slate-600">{layer}{row}{col}</span>
                        </div>
                      );
                    })
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex justify-center gap-2 mb-6">
          <button onClick={() => setMode('encrypt')}
            className={`px-6 py-2 rounded-lg font-bold text-sm border transition-colors ${
              mode === 'encrypt' ? 'bg-indigo-900/50 border-indigo-700 text-indigo-300' : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >ENCRYPT</button>
          <button onClick={() => setMode('decrypt')}
            className={`px-6 py-2 rounded-lg font-bold text-sm border transition-colors ${
              mode === 'decrypt' ? 'bg-indigo-900/50 border-indigo-700 text-indigo-300' : 'bg-slate-800 border-slate-700 text-slate-400'
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
              className="w-full h-40 bg-slate-900 border border-slate-700 rounded-xl p-4 font-mono text-lg tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none text-slate-200 placeholder-slate-700"
              spellCheck={false}
            />
          </div>
          <div>
            <label className="block text-xs text-indigo-400 font-bold uppercase tracking-wider mb-2">
              {mode === 'encrypt' ? 'Ciphertext' : 'Plaintext'}
            </label>
            <div className="w-full h-40 bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 font-mono text-lg tracking-wider text-indigo-200 overflow-y-auto break-all">
              {result.output ? result.output.match(/.{1,5}/g)?.join(' ') : <span className="text-slate-700">...</span>}
            </div>
          </div>
        </div>

        {/* Fractionation Visualization */}
        {input && result.output && mode === 'encrypt' && (
          <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-5 mb-8 overflow-x-auto">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">
              3D Fractionation Process
            </div>
            <div className="space-y-2 font-mono text-xs">
              {/* Letters */}
              <div className="flex items-center gap-0.5">
                <span className="text-slate-600 w-16 shrink-0 text-right pr-2">Plain:</span>
                {plainLetters.slice(0, 16).map((ch, i) => (
                  <div key={i} className="w-8 h-7 flex items-center justify-center rounded bg-slate-800/60 text-slate-300 font-bold">
                    {ch}
                  </div>
                ))}
              </div>
              {/* Layers */}
              <div className="flex items-center gap-0.5">
                <span className="text-slate-600 w-16 shrink-0 text-right pr-2">Layer:</span>
                {result.layers.slice(0, 16).map((v, i) => (
                  <div key={i} className="w-8 h-7 flex items-center justify-center rounded bg-indigo-900/30 text-indigo-400 border border-indigo-800/40">
                    {v}
                  </div>
                ))}
              </div>
              {/* Rows */}
              <div className="flex items-center gap-0.5">
                <span className="text-slate-600 w-16 shrink-0 text-right pr-2">Row:</span>
                {result.rows.slice(0, 16).map((v, i) => (
                  <div key={i} className="w-8 h-7 flex items-center justify-center rounded bg-violet-900/30 text-violet-400 border border-violet-800/40">
                    {v}
                  </div>
                ))}
              </div>
              {/* Cols */}
              <div className="flex items-center gap-0.5">
                <span className="text-slate-600 w-16 shrink-0 text-right pr-2">Col:</span>
                {result.cols.slice(0, 16).map((v, i) => (
                  <div key={i} className="w-8 h-7 flex items-center justify-center rounded bg-fuchsia-900/30 text-fuchsia-400 border border-fuchsia-800/40">
                    {v}
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-600">
                Concatenate layers + rows + cols, read in triplets → look up each triplet in cube → ciphertext
              </div>

              {/* Result */}
              <div className="flex items-center gap-0.5">
                <span className="text-slate-600 w-16 shrink-0 text-right pr-2">Cipher:</span>
                {result.output.split('').slice(0, 16).map((ch, i) => (
                  <div key={i} className="w-8 h-7 flex items-center justify-center rounded bg-indigo-900/40 text-indigo-300 font-bold border border-indigo-700/40">
                    {ch}
                  </div>
                ))}
              </div>
            </div>
            {plainLetters.length > 16 && (
              <div className="text-[10px] text-slate-600 mt-2">Showing first 16 of {plainLetters.length}</div>
            )}
          </div>
        )}
      </div>

      {/* Info Panel */}
      <div className={`fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-700 p-6 transform transition-transform duration-300 z-40 ${showInfo ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="max-w-3xl mx-auto relative">
          <button onClick={() => setShowInfo(false)} className="absolute top-0 right-0 p-2 text-slate-500 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <h3 className="text-xl font-bold text-indigo-400 mb-2">About the Trifid Cipher</h3>
          <div className="text-sm text-slate-300 leading-relaxed space-y-2">
            <p>
              Also invented by <strong>Félix Delastelle</strong> around 1901, the Trifid cipher extends the
              Bifid concept from 2D to <strong>3D</strong>. Instead of a 5×5 square, it uses a 3×3×3 cube
              holding 27 symbols (26 letters plus a period/filler character).
            </p>
            <p>
              Each letter is split into <strong>three</strong> coordinates (layer, row, column). These are
              written in three rows, concatenated, and read off in triplets to produce ciphertext. This
              triple fractionation creates even more diffusion than Bifid, making the relationship between
              plaintext and ciphertext harder to analyze.
            </p>
            <p>
              The <strong>period</strong> controls the block size for fractionation. A shorter period is more
              practical; a longer period provides more mixing. The cipher was considered quite strong for its
              era and was used in various military contexts.
            </p>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

export default App;
