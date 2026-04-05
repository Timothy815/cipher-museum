import React, { useState, useMemo } from 'react';
import { Info, RotateCcw } from 'lucide-react';
import ExhibitPanel from '../../components/ExhibitPanel';

// ─── Rail colors (one per rail, cycling) ────────────────────────────────
const RAIL_COLORS = [
  { text: 'text-rose-400',   bg: 'bg-rose-950/40',   border: 'border-rose-700/50',   badge: 'bg-rose-500/20 text-rose-300 border-rose-700/50' },
  { text: 'text-sky-400',    bg: 'bg-sky-950/40',     border: 'border-sky-700/50',     badge: 'bg-sky-500/20 text-sky-300 border-sky-700/50' },
  { text: 'text-amber-400',  bg: 'bg-amber-950/40',   border: 'border-amber-700/50',   badge: 'bg-amber-500/20 text-amber-300 border-amber-700/50' },
  { text: 'text-emerald-400',bg: 'bg-emerald-950/40', border: 'border-emerald-700/50', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-700/50' },
  { text: 'text-violet-400', bg: 'bg-violet-950/40',  border: 'border-violet-700/50',  badge: 'bg-violet-500/20 text-violet-300 border-violet-700/50' },
  { text: 'text-pink-400',   bg: 'bg-pink-950/40',    border: 'border-pink-700/50',    badge: 'bg-pink-500/20 text-pink-300 border-pink-700/50' },
  { text: 'text-cyan-400',   bg: 'bg-cyan-950/40',    border: 'border-cyan-700/50',    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-700/50' },
  { text: 'text-orange-400', bg: 'bg-orange-950/40',  border: 'border-orange-700/50',  badge: 'bg-orange-500/20 text-orange-300 border-orange-700/50' },
  { text: 'text-lime-400',   bg: 'bg-lime-950/40',    border: 'border-lime-700/50',    badge: 'bg-lime-500/20 text-lime-300 border-lime-700/50' },
  { text: 'text-fuchsia-400',bg: 'bg-fuchsia-950/40', border: 'border-fuchsia-700/50', badge: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-700/50' },
];

function railColor(rail: number) {
  return RAIL_COLORS[rail % RAIL_COLORS.length];
}

// ─── Rail Fence cipher logic ────────────────────────────────────────────

interface GridCell {
  char: string;
  rail: number;
  col: number;
  readOrder: number; // position in ciphertext
}

function buildZigzag(text: string, rails: number): { grid: (GridCell | null)[][]; railStrings: string[] } {
  if (rails < 2 || text.length === 0) return { grid: [], railStrings: [] };

  // Initialize empty grid
  const grid: (GridCell | null)[][] = Array.from({ length: rails }, () =>
    Array.from({ length: text.length }, () => null)
  );

  // Fill zigzag pattern
  let rail = 0;
  let direction = 1; // 1 = down, -1 = up
  for (let col = 0; col < text.length; col++) {
    grid[rail][col] = { char: text[col], rail, col, readOrder: 0 };
    // Change direction at top and bottom rails
    if (rail === 0) direction = 1;
    else if (rail === rails - 1) direction = -1;
    rail += direction;
  }

  // Compute read order (row by row, left to right)
  let order = 0;
  const railStrings: string[] = [];
  for (let r = 0; r < rails; r++) {
    let rs = '';
    for (let c = 0; c < text.length; c++) {
      if (grid[r][c]) {
        grid[r][c]!.readOrder = order++;
        rs += grid[r][c]!.char;
      }
    }
    railStrings.push(rs);
  }

  return { grid, railStrings };
}

function railFenceEncrypt(text: string, rails: number): string {
  if (rails < 2) return text;
  const { railStrings } = buildZigzag(text, rails);
  return railStrings.join('');
}

function railFenceDecrypt(cipher: string, rails: number): string {
  if (rails < 2 || cipher.length === 0) return cipher;
  const n = cipher.length;

  // First, figure out how many chars go on each rail
  const railLengths = new Array(rails).fill(0);
  let rail = 0;
  let direction = 1;
  for (let i = 0; i < n; i++) {
    railLengths[rail]++;
    if (rail === 0) direction = 1;
    else if (rail === rails - 1) direction = -1;
    rail += direction;
  }

  // Split ciphertext into rail segments
  const railChars: string[][] = [];
  let idx = 0;
  for (let r = 0; r < rails; r++) {
    railChars.push(cipher.slice(idx, idx + railLengths[r]).split(''));
    idx += railLengths[r];
  }

  // Read back in zigzag order
  const railPointers = new Array(rails).fill(0);
  let result = '';
  rail = 0;
  direction = 1;
  for (let i = 0; i < n; i++) {
    result += railChars[rail][railPointers[rail]];
    railPointers[rail]++;
    if (rail === 0) direction = 1;
    else if (rail === rails - 1) direction = -1;
    rail += direction;
  }

  return result;
}

function App() {
  const [rails, setRails] = useState(3);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [showInfo, setShowInfo] = useState(false);

  const cleanInput = input.toUpperCase().replace(/[^A-Z0-9]/g, '');

  const output = useMemo(() => {
    if (!cleanInput) return '';
    return mode === 'encrypt'
      ? railFenceEncrypt(cleanInput, rails)
      : railFenceDecrypt(cleanInput, rails);
  }, [cleanInput, rails, mode]);

  // Build zigzag grid for visualization (always shows the plaintext pattern)
  const vizText = mode === 'encrypt' ? cleanInput : output;
  const { grid, railStrings } = useMemo(() => buildZigzag(vizText, rails), [vizText, rails]);

  // Brute force (all possible rail counts)
  const bruteForce = useMemo(() => {
    if (!cleanInput || mode !== 'decrypt') return [];
    return Array.from({ length: Math.min(cleanInput.length - 1, 9) }, (_, i) => ({
      rails: i + 2,
      text: railFenceDecrypt(cleanInput, i + 2),
    }));
  }, [cleanInput, mode]);

  // How many columns to show in the grid (cap for display)
  const maxDisplayCols = Math.min(vizText.length, 60);
  const displayGrid = grid.map(row => row.slice(0, maxDisplayCols));
  const isTruncated = vizText.length > maxDisplayCols;

  return (
    <div className="flex-1 bg-[#14120e] flex flex-col">
      <ExhibitPanel id="rail-fence" />
      <div className="bg-[#14120e] flex flex-col items-center justify-start py-10 px-6 text-stone-200">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl sm:text-4xl font-typewriter font-bold text-stone-100 tracking-tighter">
              RAIL FENCE <span className="text-rose-500">CIPHER</span>
            </h1>
            <span className="text-stone-500 text-xs tracking-[0.3em] font-mono">ZIGZAG TRANSPOSITION — ANCIENT</span>
          </div>
          <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-lg hover:bg-stone-800 text-stone-400 border border-stone-700">
            <Info size={20} />
          </button>
        </div>

        {/* Rails control */}
        <div className="bg-stone-900/60 rounded-2xl border border-stone-800 p-8 mb-8">
          <div className="text-center mb-6">
            <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-2">Number of Rails</div>
            <div className="text-6xl font-typewriter font-bold text-rose-400">{rails}</div>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="range" min="2" max="10" value={rails}
              onChange={e => setRails(Number(e.target.value))}
              className="flex-1 accent-rose-500"
            />
            <button onClick={() => setRails(3)} className="text-stone-500 hover:text-rose-400 p-1" title="Reset to 3 rails">
              <RotateCcw size={16} />
            </button>
          </div>
          {/* Rail indicators */}
          <div className="flex justify-center gap-2 mt-4">
            {Array.from({ length: rails }, (_, i) => (
              <span key={i} className={`text-xs font-bold px-2 py-0.5 rounded-full border ${railColor(i).badge}`}>
                Rail {i}
              </span>
            ))}
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex justify-center gap-2 mb-6">
          <button
            onClick={() => setMode('encrypt')}
            className={`px-6 py-2 rounded-lg font-bold text-sm border transition-colors ${
              mode === 'encrypt' ? 'bg-rose-900/50 border-rose-700 text-rose-300' : 'bg-stone-800 border-stone-700 text-stone-400'
            }`}
          >ENCRYPT</button>
          <button
            onClick={() => setMode('decrypt')}
            className={`px-6 py-2 rounded-lg font-bold text-sm border transition-colors ${
              mode === 'decrypt' ? 'bg-rose-900/50 border-rose-700 text-rose-300' : 'bg-stone-800 border-stone-700 text-stone-400'
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
              className="w-full h-32 bg-stone-900 border border-stone-700 rounded-xl p-4 font-mono text-lg tracking-wider focus:outline-none focus:ring-2 focus:ring-rose-500/50 resize-none text-stone-200 placeholder-stone-700"
              spellCheck={false}
            />
          </div>
          <div>
            <label className="block text-xs text-rose-400 font-bold uppercase tracking-wider mb-2">
              {mode === 'encrypt' ? 'Ciphertext' : 'Plaintext'}
            </label>
            <div className="w-full h-32 bg-stone-800/50 border border-stone-700/50 rounded-xl p-4 font-mono text-lg tracking-wider text-rose-200 overflow-y-auto break-all">
              {output || <span className="text-stone-700">...</span>}
            </div>
          </div>
        </div>

        {/* ─── Zigzag Visualization ──────────────────────────────────── */}
        {vizText.length > 0 && (
          <div className="bg-stone-900/60 rounded-2xl border border-stone-800 p-6 mb-6 overflow-x-auto">
            <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-4">
              Zigzag Pattern {mode === 'decrypt' ? '(decrypted plaintext)' : ''}
              {isTruncated && <span className="text-stone-600 ml-2">(showing first {maxDisplayCols} of {vizText.length} chars)</span>}
            </div>

            {/* Grid */}
            <div className="inline-block min-w-full">
              {displayGrid.map((row, r) => (
                <div key={r} className="flex">
                  {/* Rail label */}
                  <div className={`w-8 flex-shrink-0 flex items-center justify-center text-[9px] font-bold ${railColor(r).text}`}>
                    {r}
                  </div>
                  {/* Cells */}
                  {row.map((cell, c) => (
                    <div
                      key={c}
                      className={`w-8 h-8 flex items-center justify-center text-sm font-mono font-bold flex-shrink-0 transition-all ${
                        cell
                          ? `${railColor(r).bg} ${railColor(r).border} border rounded ${railColor(r).text}`
                          : ''
                      }`}
                    >
                      {cell?.char ?? ''}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Zigzag connecting lines (SVG) */}
            {vizText.length > 1 && vizText.length <= maxDisplayCols && (
              <svg
                className="mt-[-1px] pointer-events-none"
                width={vizText.length * 32 + 32}
                height={rails * 32}
                style={{ position: 'relative', top: -(rails * 32), marginBottom: -(rails * 32), opacity: 0.2 }}
              >
                {Array.from({ length: vizText.length - 1 }, (_, i) => {
                  // Find which rail each character is on
                  let r1 = -1, r2 = -1;
                  for (let r = 0; r < rails; r++) {
                    if (grid[r][i]) r1 = r;
                    if (grid[r][i + 1]) r2 = r;
                  }
                  if (r1 === -1 || r2 === -1) return null;
                  const x1 = 32 + i * 32 + 16;
                  const y1 = r1 * 32 + 16;
                  const x2 = 32 + (i + 1) * 32 + 16;
                  const y2 = r2 * 32 + 16;
                  return (
                    <line
                      key={i}
                      x1={x1} y1={y1} x2={x2} y2={y2}
                      stroke="rgb(244,63,94)"
                      strokeWidth="1.5"
                    />
                  );
                })}
              </svg>
            )}
          </div>
        )}

        {/* ─── Rail Extraction ───────────────────────────────────────── */}
        {vizText.length > 0 && mode === 'encrypt' && (
          <div className="bg-stone-900/60 rounded-2xl border border-stone-800 p-6 mb-6">
            <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-4">
              Read-Off by Rail
            </div>
            <div className="space-y-2">
              {railStrings.map((rs, r) => (
                <div key={r} className="flex items-center gap-3">
                  <span className={`text-xs font-bold w-16 ${railColor(r).text}`}>Rail {r}:</span>
                  <div className="flex gap-[2px]">
                    {rs.split('').map((ch, i) => (
                      <span
                        key={i}
                        className={`w-7 h-7 flex items-center justify-center text-xs font-mono font-bold rounded ${railColor(r).bg} ${railColor(r).border} border ${railColor(r).text}`}
                      >
                        {ch}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-[10px] text-stone-500 uppercase tracking-widest font-bold">Ciphertext:</span>
              <span className="font-mono text-sm text-rose-300 tracking-wider">{railStrings.join('')}</span>
            </div>
          </div>
        )}

        {/* ─── Brute Force (decrypt mode) ────────────────────────────── */}
        {mode === 'decrypt' && cleanInput.length > 0 && (
          <div className="bg-stone-900/40 rounded-xl border border-stone-800 p-5 mb-6">
            <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-3">
              Brute Force — All Rail Counts
            </div>
            <div className="grid grid-cols-1 gap-1 max-h-64 overflow-y-auto">
              {bruteForce.map(({ rails: r, text }) => (
                <div
                  key={r}
                  className={`flex items-center gap-3 px-3 py-2 rounded text-xs font-mono cursor-pointer hover:bg-stone-800 transition-colors ${
                    r === rails ? `${railColor(0).bg} ${railColor(0).text}` : 'text-stone-500'
                  }`}
                  onClick={() => setRails(r)}
                >
                  <span className={`w-16 flex-shrink-0 font-bold ${r === rails ? railColor(0).text : 'text-stone-600'}`}>
                    {r} rails
                  </span>
                  <span className="truncate">{text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── How It Works (always visible) ─────────────────────────── */}
        <div className="bg-stone-900/40 rounded-xl border border-stone-800 p-5">
          <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-3">
            How It Works
          </div>
          <div className="grid sm:grid-cols-3 gap-4 text-xs text-stone-400">
            <div>
              <div className="font-bold text-rose-400 mb-1">1. Write</div>
              <p>Write the plaintext in a zigzag pattern across the rails, bouncing up and down.</p>
            </div>
            <div>
              <div className="font-bold text-rose-400 mb-1">2. Read</div>
              <p>Read each rail left-to-right, concatenating to form the ciphertext.</p>
            </div>
            <div>
              <div className="font-bold text-rose-400 mb-1">3. Key Space</div>
              <p>Only {'{'}n-1{'}'} possible keys (rail counts 2 to n). Trivially brute-forced.</p>
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
          <h3 className="text-xl font-bold text-rose-400 mb-2">About the Rail Fence Cipher</h3>
          <p className="text-sm text-stone-300 leading-relaxed mb-3">
            The <strong>Rail Fence cipher</strong> (also called the <strong>zigzag cipher</strong>) is one of the oldest known
            transposition ciphers. Unlike substitution ciphers that replace letters, transposition ciphers rearrange the positions
            of letters without changing them.
          </p>
          <p className="text-sm text-stone-300 leading-relaxed mb-3">
            The plaintext is written diagonally in a zigzag pattern across a number of "rails" (rows), then read off row by row.
            The key is simply the number of rails used. With only <strong>n-1 possible keys</strong> for a message of length n,
            it provides minimal security on its own — but it demonstrates the fundamental concept of transposition.
          </p>
          <p className="text-sm text-stone-300 leading-relaxed">
            Historically, rail fence was sometimes combined with other ciphers for added security. The <strong>ADFGVX cipher</strong>
            used in WWI combined a Polybius square substitution with columnar transposition — a much stronger approach than
            either technique alone.
          </p>
        </div>
      </div>
    </div>
    </div>
  );
}

export default App;
