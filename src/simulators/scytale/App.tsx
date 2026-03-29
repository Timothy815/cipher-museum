import React, { useState, useMemo } from 'react';
import { Info, RotateCcw } from 'lucide-react';

// ─── Scytale cipher logic ───────────────────────────────────────────────
// A scytale with N faces means text is written in rows of N columns.
// This is equivalent to a columnar transposition with columns read in order.
// Encrypt: write row-by-row on the rod, read the unwound strip (column-by-column).
// Decrypt: reverse — write column-by-column, read row-by-row.

function scytaleEncrypt(text: string, faces: number): string {
  if (faces < 2 || text.length === 0) return text;
  const rows = Math.ceil(text.length / faces);
  const padded = text.padEnd(rows * faces, ' ');

  // Read column by column
  let result = '';
  for (let c = 0; c < faces; c++) {
    for (let r = 0; r < rows; r++) {
      result += padded[r * faces + c];
    }
  }
  return result;
}

function scytaleDecrypt(cipher: string, faces: number): string {
  if (faces < 2 || cipher.length === 0) return cipher;
  const rows = Math.ceil(cipher.length / faces);
  const padded = cipher.padEnd(rows * faces, ' ');

  // The ciphertext was written column-by-column, so read row-by-row
  // But we need to reconstruct: the cipher has `rows` characters per column, `faces` columns
  const cols = faces;
  const grid: string[][] = Array.from({ length: rows }, () => Array(cols).fill(' '));

  // Fill column by column
  let idx = 0;
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      grid[r][c] = padded[idx++];
    }
  }

  // Read row by row
  return grid.map(row => row.join('')).join('');
}

// ─── Rod colors for wrapping visualization ──────────────────────────────
const FACE_COLORS = [
  'text-sky-400 bg-sky-950/40 border-sky-700/50',
  'text-amber-400 bg-amber-950/40 border-amber-700/50',
  'text-emerald-400 bg-emerald-950/40 border-emerald-700/50',
  'text-violet-400 bg-violet-950/40 border-violet-700/50',
  'text-rose-400 bg-rose-950/40 border-rose-700/50',
  'text-cyan-400 bg-cyan-950/40 border-cyan-700/50',
  'text-orange-400 bg-orange-950/40 border-orange-700/50',
  'text-pink-400 bg-pink-950/40 border-pink-700/50',
  'text-lime-400 bg-lime-950/40 border-lime-700/50',
  'text-teal-400 bg-teal-950/40 border-teal-700/50',
];

function faceColor(i: number) {
  return FACE_COLORS[i % FACE_COLORS.length];
}

const FACE_TEXT_COLORS = [
  'text-sky-400', 'text-amber-400', 'text-emerald-400', 'text-violet-400', 'text-rose-400',
  'text-cyan-400', 'text-orange-400', 'text-pink-400', 'text-lime-400', 'text-teal-400',
];

function App() {
  const [faces, setFaces] = useState(4);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [showInfo, setShowInfo] = useState(false);

  const cleanInput = input.toUpperCase().replace(/[^A-Z ]/g, '');

  const output = useMemo(() => {
    if (!cleanInput) return '';
    return mode === 'encrypt'
      ? scytaleEncrypt(cleanInput, faces)
      : scytaleDecrypt(cleanInput, faces);
  }, [cleanInput, faces, mode]);

  // Build the rod grid for visualization
  const vizText = mode === 'encrypt' ? cleanInput : output;
  const grid = useMemo(() => {
    if (!vizText || faces < 2) return [];
    const rows = Math.ceil(vizText.length / faces);
    const padded = vizText.padEnd(rows * faces, ' ');
    const g: { char: string; col: number; isPad: boolean }[][] = [];
    for (let r = 0; r < rows; r++) {
      const row: { char: string; col: number; isPad: boolean }[] = [];
      for (let c = 0; c < faces; c++) {
        const idx = r * faces + c;
        row.push({
          char: padded[idx],
          col: c,
          isPad: idx >= vizText.length,
        });
      }
      g.push(row);
    }
    return g;
  }, [vizText, faces]);

  // Unwound strip (the ciphertext order)
  const stripChars = useMemo(() => {
    if (!vizText || faces < 2) return [];
    const rows = Math.ceil(vizText.length / faces);
    const padded = vizText.padEnd(rows * faces, ' ');
    const chars: { char: string; col: number }[] = [];
    for (let c = 0; c < faces; c++) {
      for (let r = 0; r < rows; r++) {
        chars.push({ char: padded[r * faces + c], col: c });
      }
    }
    return chars;
  }, [vizText, faces]);

  // Brute force
  const bruteForce = useMemo(() => {
    if (!cleanInput || mode !== 'decrypt') return [];
    return Array.from({ length: Math.min(cleanInput.length - 1, 12) }, (_, i) => ({
      faces: i + 2,
      text: scytaleDecrypt(cleanInput, i + 2),
    }));
  }, [cleanInput, mode]);

  return (
    <div className="flex-1 bg-[#13110d] flex flex-col items-center justify-start py-10 px-6 text-stone-200">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl sm:text-4xl font-typewriter font-bold text-stone-100 tracking-tighter">
              SCYTALE <span className="text-emerald-500">CIPHER</span>
            </h1>
            <span className="text-stone-500 text-xs tracking-[0.3em] font-mono">SPARTAN TRANSPOSITION — ~700 BC</span>
          </div>
          <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-lg hover:bg-stone-800 text-stone-400 border border-stone-700">
            <Info size={20} />
          </button>
        </div>

        {/* Rod Diameter Control */}
        <div className="bg-stone-900/60 rounded-2xl border border-stone-800 p-8 mb-8">
          <div className="text-center mb-6">
            <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-2">Rod Faces (Diameter)</div>
            <div className="text-6xl font-typewriter font-bold text-emerald-400">{faces}</div>
            <div className="text-xs text-stone-500 mt-1">{faces} letters per wrap</div>
          </div>

          {/* Rod cross-section visualization */}
          <div className="flex justify-center mb-6">
            <svg width="120" height="120" viewBox="0 0 120 120">
              {/* Draw polygon for rod cross-section */}
              {Array.from({ length: faces }, (_, i) => {
                const angle = (2 * Math.PI * i) / faces - Math.PI / 2;
                const nextAngle = (2 * Math.PI * (i + 1)) / faces - Math.PI / 2;
                const r = 45;
                const cx = 60, cy = 60;
                const x1 = cx + r * Math.cos(angle);
                const y1 = cy + r * Math.sin(angle);
                const x2 = cx + r * Math.cos(nextAngle);
                const y2 = cy + r * Math.sin(nextAngle);
                return (
                  <g key={i}>
                    <line
                      x1={x1} y1={y1} x2={x2} y2={y2}
                      stroke={`hsl(${(i * 360) / faces}, 60%, 55%)`}
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <text
                      x={cx + (r + 14) * Math.cos((angle + nextAngle) / 2)}
                      y={cy + (r + 14) * Math.sin((angle + nextAngle) / 2)}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="fill-stone-500 text-[9px] font-mono font-bold"
                    >
                      {i + 1}
                    </text>
                  </g>
                );
              })}
              {/* Center label */}
              <text x="60" y="60" textAnchor="middle" dominantBaseline="central" className="fill-emerald-400 text-[11px] font-bold">
                ROD
              </text>
            </svg>
          </div>

          <div className="flex items-center gap-4">
            <input
              type="range" min="2" max="12" value={faces}
              onChange={e => setFaces(Number(e.target.value))}
              className="flex-1 accent-emerald-500"
            />
            <button onClick={() => setFaces(4)} className="text-stone-500 hover:text-emerald-400 p-1" title="Reset to 4 faces">
              <RotateCcw size={16} />
            </button>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex justify-center gap-2 mb-6">
          <button
            onClick={() => setMode('encrypt')}
            className={`px-6 py-2 rounded-lg font-bold text-sm border transition-colors ${
              mode === 'encrypt' ? 'bg-emerald-900/50 border-emerald-700 text-emerald-300' : 'bg-stone-800 border-stone-700 text-stone-400'
            }`}
          >ENCRYPT</button>
          <button
            onClick={() => setMode('decrypt')}
            className={`px-6 py-2 rounded-lg font-bold text-sm border transition-colors ${
              mode === 'decrypt' ? 'bg-emerald-900/50 border-emerald-700 text-emerald-300' : 'bg-stone-800 border-stone-700 text-stone-400'
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
              className="w-full h-32 bg-stone-900 border border-stone-700 rounded-xl p-4 font-mono text-lg tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none text-stone-200 placeholder-stone-700"
              spellCheck={false}
            />
          </div>
          <div>
            <label className="block text-xs text-emerald-400 font-bold uppercase tracking-wider mb-2">
              {mode === 'encrypt' ? 'Ciphertext' : 'Plaintext'}
            </label>
            <div className="w-full h-32 bg-stone-800/50 border border-stone-700/50 rounded-xl p-4 font-mono text-lg tracking-wider text-emerald-200 overflow-y-auto break-all">
              {output || <span className="text-stone-700">...</span>}
            </div>
          </div>
        </div>

        {/* ─── Wrapped Rod Visualization ──────────────────────────────── */}
        {grid.length > 0 && (
          <div className="bg-stone-900/60 rounded-2xl border border-stone-800 p-6 mb-6 overflow-x-auto">
            <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-4">
              Text Wrapped on Rod — Read {mode === 'encrypt' ? 'down each column for ciphertext' : 'across each row for plaintext'}
            </div>

            <div className="inline-block">
              {/* Face headers */}
              <div className="flex">
                <div className="w-10 flex-shrink-0" />
                {Array.from({ length: faces }, (_, c) => (
                  <div
                    key={c}
                    className={`w-10 h-8 flex items-center justify-center text-[10px] font-mono font-bold flex-shrink-0 rounded-t border ${faceColor(c)}`}
                  >
                    F{c + 1}
                  </div>
                ))}
              </div>

              {/* Grid rows = wraps around the rod */}
              {grid.map((row, r) => (
                <div key={r} className="flex">
                  <div className="w-10 flex-shrink-0 flex items-center justify-center text-[9px] font-mono text-stone-600">
                    W{r + 1}
                  </div>
                  {row.map((cell, c) => (
                    <div
                      key={c}
                      className={`w-10 h-10 flex items-center justify-center text-sm font-mono font-bold flex-shrink-0 border transition-colors ${
                        faceColor(c)
                      } ${cell.isPad ? 'opacity-30' : ''}`}
                    >
                      {cell.char === ' ' ? '·' : cell.char}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Unwound Strip ─────────────────────────────────────────── */}
        {stripChars.length > 0 && mode === 'encrypt' && (
          <div className="bg-stone-900/60 rounded-2xl border border-stone-800 p-6 mb-6">
            <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-4">
              Unwound Strip (read column by column)
            </div>
            <div className="flex flex-wrap gap-[2px]">
              {stripChars.map((sc, i) => (
                <span
                  key={i}
                  className={`w-7 h-7 flex items-center justify-center text-xs font-mono font-bold rounded border ${faceColor(sc.col)}`}
                >
                  {sc.char === ' ' ? '·' : sc.char}
                </span>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[10px] text-stone-500 uppercase tracking-widest font-bold">Ciphertext:</span>
              <span className="font-mono text-sm tracking-wider">
                {Array.from({ length: faces }, (_, c) => {
                  const rows = Math.ceil(vizText.length / faces);
                  const padded = vizText.padEnd(rows * faces, ' ');
                  let col = '';
                  for (let r = 0; r < rows; r++) col += padded[r * faces + c];
                  return (
                    <span key={c} className={FACE_TEXT_COLORS[c % FACE_TEXT_COLORS.length]}>
                      {col}
                    </span>
                  );
                })}
              </span>
            </div>
          </div>
        )}

        {/* ─── Brute Force (decrypt mode) ────────────────────────────── */}
        {mode === 'decrypt' && cleanInput.length > 0 && (
          <div className="bg-stone-900/40 rounded-xl border border-stone-800 p-5 mb-6">
            <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-3">
              Brute Force — All Rod Sizes
            </div>
            <div className="grid grid-cols-1 gap-1 max-h-64 overflow-y-auto">
              {bruteForce.map(({ faces: f, text }) => (
                <div
                  key={f}
                  className={`flex items-center gap-3 px-3 py-2 rounded text-xs font-mono cursor-pointer hover:bg-stone-800 transition-colors ${
                    f === faces ? 'bg-emerald-950/30 text-emerald-300' : 'text-stone-500'
                  }`}
                  onClick={() => setFaces(f)}
                >
                  <span className={`w-20 flex-shrink-0 font-bold ${f === faces ? 'text-emerald-400' : 'text-stone-600'}`}>
                    {f} faces
                  </span>
                  <span className="truncate">{text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* How It Works */}
        <div className="bg-stone-900/40 rounded-xl border border-stone-800 p-5">
          <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-3">How It Works</div>
          <div className="grid sm:grid-cols-3 gap-4 text-xs text-stone-400">
            <div>
              <div className="font-bold text-emerald-400 mb-1">1. Wrap</div>
              <p>Wind a strip of parchment around a rod of specific diameter. Write your message across the exposed faces, one letter per face.</p>
            </div>
            <div>
              <div className="font-bold text-emerald-400 mb-1">2. Unwrap</div>
              <p>Remove the strip. The letters are now scrambled — each column of the rod becomes a separate run of characters on the strip.</p>
            </div>
            <div>
              <div className="font-bold text-emerald-400 mb-1">3. Decrypt</div>
              <p>The recipient wraps the strip around an identical rod. The correct diameter re-aligns the letters into readable rows.</p>
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
          <h3 className="text-xl font-bold text-emerald-400 mb-2">About the Scytale</h3>
          <p className="text-sm text-stone-300 leading-relaxed mb-3">
            The <strong>scytale</strong> (rhymes with "Italy") is one of the oldest known cryptographic devices, used by the
            <strong> Spartans</strong> as early as <strong>700 BC</strong>. It consists of a cylinder (the rod) around which
            a strip of parchment or leather is wound helically. The message is written across the exposed faces of the strip.
          </p>
          <p className="text-sm text-stone-300 leading-relaxed mb-3">
            When unwound, the letters appear scrambled on the strip. Only someone with a rod of the <strong>same diameter</strong>
            can re-wrap the strip and read the message. The "key" is the physical rod itself — or more precisely, the number of
            faces (columns) that fit around its circumference.
          </p>
          <p className="text-sm text-stone-300 leading-relaxed">
            The Greek historian <strong>Plutarch</strong> describes the Spartan ephors (magistrates) using the scytale to
            communicate with generals in the field. Mathematically, the scytale performs a simple <strong>columnar transposition</strong>
            — it's the physical ancestor of the columnar cipher used thousands of years later in both World Wars.
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
