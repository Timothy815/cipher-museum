import React, { useState, useMemo } from 'react';
import { Info, RotateCcw } from 'lucide-react';

const DEFAULT_KEY = 'BGWKZQPNDSIOAXEFCLUMTHYVR'; // 25-letter key (I/J combined)
const DISPLAY_ALPHA = 'ABCDEFGHIKLMNOPQRSTUVWXYZ'; // no J

function generateSquare(key: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  const k = key.toUpperCase().replace(/J/g, 'I').replace(/[^A-Z]/g, '');
  for (const ch of k) {
    if (!seen.has(ch)) { seen.add(ch); result.push(ch); }
  }
  for (const ch of DISPLAY_ALPHA) {
    if (!seen.has(ch)) { seen.add(ch); result.push(ch); }
  }
  return result;
}

function findPos(square: string[], ch: string): [number, number] {
  const c = ch === 'J' ? 'I' : ch;
  const idx = square.indexOf(c);
  return [Math.floor(idx / 5), idx % 5];
}

function bifidEncrypt(text: string, square: string[], period: number): { output: string; rows: number[]; cols: number[]; combined: number[]; pairs: [number, number][] } {
  const plain = text.toUpperCase().replace(/J/g, 'I').split('').filter(c => DISPLAY_ALPHA.includes(c));
  if (plain.length === 0) return { output: '', rows: [], cols: [], combined: [], pairs: [] };

  const rows: number[] = [];
  const cols: number[] = [];
  for (const ch of plain) {
    const [r, c] = findPos(square, ch);
    rows.push(r);
    cols.push(c);
  }

  // Process in blocks of 'period' size
  const combined: number[] = [];
  const pairs: [number, number][] = [];
  for (let start = 0; start < plain.length; start += period) {
    const end = Math.min(start + period, plain.length);
    const blockRows = rows.slice(start, end);
    const blockCols = cols.slice(start, end);
    const interleaved = [...blockRows, ...blockCols];
    combined.push(...interleaved);
    for (let i = 0; i < interleaved.length; i += 2) {
      pairs.push([interleaved[i], interleaved[i + 1] ?? 0]);
    }
  }

  const output = pairs.map(([r, c]) => square[r * 5 + c]).join('');
  return { output, rows, cols, combined, pairs };
}

function bifidDecrypt(text: string, square: string[], period: number): { output: string; rows: number[]; cols: number[]; combined: number[]; pairs: [number, number][] } {
  const cipher = text.toUpperCase().replace(/J/g, 'I').split('').filter(c => DISPLAY_ALPHA.includes(c));
  if (cipher.length === 0) return { output: '', rows: [], cols: [], combined: [], pairs: [] };

  // Convert ciphertext to coordinate pairs
  const cipherPairs: [number, number][] = [];
  for (const ch of cipher) {
    const [r, c] = findPos(square, ch);
    cipherPairs.push([r, c]);
  }

  // Flatten pairs into combined stream, then split back per block
  const allCoords = cipherPairs.flatMap(([r, c]) => [r, c]);
  const rows: number[] = [];
  const cols: number[] = [];

  let pos = 0;
  for (let start = 0; start < cipher.length; start += period) {
    const blockLen = Math.min(period, cipher.length - start);
    const blockCoords = allCoords.slice(pos, pos + blockLen * 2);
    const blockRows = blockCoords.slice(0, blockLen);
    const blockCols = blockCoords.slice(blockLen);
    rows.push(...blockRows);
    cols.push(...blockCols);
    pos += blockLen * 2;
  }

  const combined = allCoords;
  const pairs = cipherPairs;
  const output = rows.map((r, i) => square[r * 5 + cols[i]]).join('');
  return { output, rows, cols, combined, pairs };
}

function App() {
  const [keyPhrase, setKeyPhrase] = useState('BIFID');
  const [period, setPeriod] = useState(0); // 0 = full message (classic Bifid)
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [showInfo, setShowInfo] = useState(false);

  const square = useMemo(() => generateSquare(keyPhrase), [keyPhrase]);
  const effectivePeriod = period === 0 ? 9999 : period;

  const result = useMemo(() => {
    if (!input) return { output: '', rows: [], cols: [], combined: [], pairs: [] };
    return mode === 'encrypt'
      ? bifidEncrypt(input, square, effectivePeriod)
      : bifidDecrypt(input, square, effectivePeriod);
  }, [input, square, effectivePeriod, mode]);

  const plainLetters = input.toUpperCase().replace(/J/g, 'I').split('').filter(c => DISPLAY_ALPHA.includes(c));

  return (
    <div className="flex-1 bg-[#141118] flex flex-col items-center justify-start py-10 px-6 text-slate-200">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl sm:text-4xl font-typewriter font-bold text-slate-100 tracking-tighter">
              BIFID <span className="text-fuchsia-400">CIPHER</span>
            </h1>
            <span className="text-slate-500 text-xs tracking-[0.3em] font-mono">FRACTIONATION CIPHER — DELASTELLE, 1901</span>
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
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 font-mono text-xl tracking-[0.3em] text-fuchsia-300 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 text-center"
              placeholder="KEYWORD"
              spellCheck={false}
            />
          </div>
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6">
            <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">
              Period {period === 0 ? '(classic — full message)' : `(${period})`}
            </label>
            <input
              type="range" min="0" max="15" value={period}
              onChange={e => setPeriod(Number(e.target.value))}
              className="w-full accent-fuchsia-500 mt-3"
            />
            <div className="flex justify-between text-[10px] text-slate-600 font-mono mt-1">
              <span>∞ (classic)</span>
              <span>15</span>
            </div>
          </div>
        </div>

        {/* Polybius Square */}
        <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-5 mb-8">
          <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold text-center mb-3">
            5×5 Polybius Square (I/J combined)
          </div>
          <div className="flex justify-center">
            <div>
              {/* Column headers */}
              <div className="flex">
                <div className="w-10 h-8" />
                {[0,1,2,3,4].map(c => (
                  <div key={c} className="w-10 h-8 flex items-center justify-center text-xs font-mono font-bold text-fuchsia-400/60">
                    {c}
                  </div>
                ))}
              </div>
              {[0,1,2,3,4].map(r => (
                <div key={r} className="flex">
                  <div className="w-10 h-10 flex items-center justify-center text-xs font-mono font-bold text-fuchsia-400/60">
                    {r}
                  </div>
                  {[0,1,2,3,4].map(c => {
                    const ch = square[r * 5 + c];
                    const isHighlighted = plainLetters.includes(ch);
                    return (
                      <div key={c} className={`w-10 h-10 flex items-center justify-center rounded font-mono font-bold text-sm border transition-colors ${
                        isHighlighted
                          ? 'bg-fuchsia-900/40 border-fuchsia-700/50 text-fuchsia-300'
                          : 'bg-slate-800/60 border-slate-700/40 text-slate-300'
                      }`}>
                        {ch}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex justify-center gap-2 mb-6">
          <button onClick={() => setMode('encrypt')}
            className={`px-6 py-2 rounded-lg font-bold text-sm border transition-colors ${
              mode === 'encrypt' ? 'bg-fuchsia-900/50 border-fuchsia-700 text-fuchsia-300' : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >ENCRYPT</button>
          <button onClick={() => setMode('decrypt')}
            className={`px-6 py-2 rounded-lg font-bold text-sm border transition-colors ${
              mode === 'decrypt' ? 'bg-fuchsia-900/50 border-fuchsia-700 text-fuchsia-300' : 'bg-slate-800 border-slate-700 text-slate-400'
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
              className="w-full h-40 bg-slate-900 border border-slate-700 rounded-xl p-4 font-mono text-lg tracking-wider focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 resize-none text-slate-200 placeholder-slate-700"
              spellCheck={false}
            />
          </div>
          <div>
            <label className="block text-xs text-fuchsia-400 font-bold uppercase tracking-wider mb-2">
              {mode === 'encrypt' ? 'Ciphertext' : 'Plaintext'}
            </label>
            <div className="w-full h-40 bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 font-mono text-lg tracking-wider text-fuchsia-200 overflow-y-auto break-all">
              {result.output ? result.output.match(/.{1,5}/g)?.join(' ') : <span className="text-slate-700">...</span>}
            </div>
          </div>
        </div>

        {/* Fractionation Visualization */}
        {input && result.output && mode === 'encrypt' && (
          <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-5 mb-8 overflow-x-auto">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">
              Fractionation Process
            </div>
            <div className="space-y-2 font-mono text-xs">
              {/* Step 1: Letters with coordinates */}
              <div className="flex items-center gap-0.5">
                <span className="text-slate-600 w-16 shrink-0 text-right pr-2">Plain:</span>
                {plainLetters.slice(0, 20).map((ch, i) => (
                  <div key={i} className="w-8 h-7 flex items-center justify-center rounded bg-slate-800/60 text-slate-300 font-bold">
                    {ch}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-0.5">
                <span className="text-slate-600 w-16 shrink-0 text-right pr-2">Rows:</span>
                {result.rows.slice(0, 20).map((r, i) => (
                  <div key={i} className="w-8 h-7 flex items-center justify-center rounded bg-fuchsia-900/30 text-fuchsia-400 border border-fuchsia-800/40">
                    {r}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-0.5">
                <span className="text-slate-600 w-16 shrink-0 text-right pr-2">Cols:</span>
                {result.cols.slice(0, 20).map((c, i) => (
                  <div key={i} className="w-8 h-7 flex items-center justify-center rounded bg-violet-900/30 text-violet-400 border border-violet-800/40">
                    {c}
                  </div>
                ))}
              </div>

              {/* Step 2: Interleaved */}
              <div className="mt-2 pt-2 border-t border-slate-800">
                <div className="text-[10px] text-slate-600 mb-1">Concatenate rows then cols, read off in pairs:</div>
                <div className="flex items-center gap-0.5 flex-wrap">
                  <span className="text-slate-600 w-16 shrink-0 text-right pr-2">Stream:</span>
                  {result.combined.slice(0, 40).map((n, i) => {
                    const isRow = i < result.rows.length;
                    return (
                      <div key={i} className={`w-6 h-6 flex items-center justify-center rounded text-[10px] font-bold ${
                        isRow
                          ? 'bg-fuchsia-900/30 text-fuchsia-400'
                          : 'bg-violet-900/30 text-violet-400'
                      } ${i % 2 === 0 ? 'ml-1' : ''}`}>
                        {n}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Result */}
              <div className="mt-2 pt-2 border-t border-slate-800">
                <div className="flex items-center gap-0.5">
                  <span className="text-slate-600 w-16 shrink-0 text-right pr-2">Cipher:</span>
                  {result.output.split('').slice(0, 20).map((ch, i) => (
                    <div key={i} className="w-8 h-7 flex items-center justify-center rounded bg-fuchsia-900/40 text-fuchsia-300 font-bold border border-fuchsia-700/40">
                      {ch}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {plainLetters.length > 20 && (
              <div className="text-[10px] text-slate-600 mt-2">Showing first 20 of {plainLetters.length} characters</div>
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
          <h3 className="text-xl font-bold text-fuchsia-400 mb-2">About the Bifid Cipher</h3>
          <div className="text-sm text-slate-300 leading-relaxed space-y-2">
            <p>
              Invented by <strong>Félix Delastelle</strong> in 1901, the Bifid cipher is a <strong>fractionation cipher</strong> —
              it breaks each letter into two halves (row and column coordinates), mixes them, then recombines them
              into new letters. This makes it significantly harder to break than simple substitution.
            </p>
            <p>
              The process: (1) look up each letter's row and column in a 5×5 <strong>Polybius square</strong>,
              (2) write all rows in one line and all columns below, (3) read off pairs vertically to form new
              coordinates, (4) look up each pair to get the ciphertext letter.
            </p>
            <p>
              The optional <strong>period</strong> controls how many letters are fractionated together. Classic Bifid
              uses the entire message; a shorter period makes it more practical for long messages but slightly weaker.
              Setting period to 1 reduces Bifid to a simple Polybius substitution.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
