import React, { useState, useMemo } from 'react';
import { Info } from 'lucide-react';
import ExhibitPanel from '../../components/ExhibitPanel';

// ─── Pigpen cipher symbol definitions ───────────────────────────────────
// Each letter maps to a path drawn on a small SVG canvas.
// Grid 1 (tic-tac-toe, no dot):  A B C / D E F / G H I
// Grid 2 (tic-tac-toe, dot):     J K L / M N O / P Q R
// Grid 3 (X, no dot):            S T U V
// Grid 4 (X, dot):               W X Y Z

interface SymbolDef {
  // SVG path data drawn in a 40x40 viewBox
  path: string;
  dot: boolean;
}

const SYMBOLS: Record<string, SymbolDef> = {
  // Grid 1: tic-tac-toe positions (no dot)
  'A': { path: 'M20,40 L20,10 L40,10',           dot: false }, // bottom-left corner: right + top
  'B': { path: 'M0,10 L40,10',                     dot: false }, // bottom open: top line
  'C': { path: 'M0,10 L20,10 L20,40',             dot: false }, // bottom-right corner: left + top
  'D': { path: 'M20,0 L40,0 L40,40',              dot: false }, // left open: top-right
  'E': { path: 'M0,0 L40,0 M0,40 L40,40',         dot: false }, // box open left+right: top+bottom
  'F': { path: 'M0,0 L0,40 L20,40',               dot: false }, // right open: top-left down
  'G': { path: 'M20,0 L20,30 L40,30',             dot: false }, // top-left corner
  'H': { path: 'M0,30 L40,30',                     dot: false }, // top open: bottom line
  'I': { path: 'M0,30 L20,30 L20,0',              dot: false }, // top-right corner

  // Grid 2: tic-tac-toe positions (with dot)
  'J': { path: 'M20,40 L20,10 L40,10',           dot: true },
  'K': { path: 'M0,10 L40,10',                     dot: true },
  'L': { path: 'M0,10 L20,10 L20,40',             dot: true },
  'M': { path: 'M20,0 L40,0 L40,40',              dot: true },
  'N': { path: 'M0,0 L40,0 M0,40 L40,40',         dot: true },
  'O': { path: 'M0,0 L0,40 L20,40',               dot: true },
  'P': { path: 'M20,0 L20,30 L40,30',             dot: true },
  'Q': { path: 'M0,30 L40,30',                     dot: true },
  'R': { path: 'M0,30 L20,30 L20,0',              dot: true },

  // Grid 3: X positions (no dot)
  'S': { path: 'M20,20 L40,0',                     dot: false }, // top-right arm
  'T': { path: 'M0,0 L20,20 L40,0',               dot: false }, // top V
  'U': { path: 'M0,0 L20,20',                      dot: false }, // top-left arm
  'V': { path: 'M20,20 L40,40',                    dot: false }, // bottom-right arm

  // Grid 4: X positions (with dot) — but we need W X Y Z
  'W': { path: 'M20,20 L40,0',                     dot: true },
  'X': { path: 'M0,0 L20,20 L40,0',               dot: true },
  'Y': { path: 'M0,0 L20,20',                      dot: true },
  'Z': { path: 'M20,20 L40,40',                    dot: true },
};

// ─── SVG symbol renderer ────────────────────────────────────────────────
function PigpenSymbol({ char, size = 40, className = '' }: { char: string; size?: number; className?: string }) {
  const def = SYMBOLS[char.toUpperCase()];
  if (!def) return <span className={`inline-block ${className}`} style={{ width: size, height: size }} />;

  const pad = 6;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`${-pad} ${-pad} ${40 + pad * 2} ${40 + pad * 2}`}
      className={className}
    >
      <path
        d={def.path}
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {def.dot && (
        <circle cx="20" cy="20" r="3" fill="currentColor" />
      )}
    </svg>
  );
}

// ─── Reference grid diagrams ────────────────────────────────────────────
function GridDiagram({ letters, type, hasDot }: { letters: string[]; type: 'grid' | 'x'; hasDot: boolean }) {
  if (type === 'grid') {
    return (
      <div className="flex flex-col items-center">
        <div className="text-[8px] text-stone-600 mb-1">{hasDot ? 'With dot' : 'No dot'}</div>
        <div className="grid grid-cols-3 border-2 border-stone-600 w-24 h-24">
          {letters.map((ch, i) => (
            <div
              key={ch}
              className={`flex items-center justify-center text-[10px] font-mono font-bold text-stone-400
                ${i % 3 !== 2 ? 'border-r-2 border-stone-600' : ''}
                ${i < 6 ? 'border-b-2 border-stone-600' : ''}
              `}
            >
              {ch}
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center">
      <div className="text-[8px] text-stone-600 mb-1">{hasDot ? 'With dot' : 'No dot'}</div>
      <svg width="96" height="96" viewBox="0 0 96 96" className="text-stone-600">
        <line x1="8" y1="8" x2="88" y2="88" stroke="currentColor" strokeWidth="2" />
        <line x1="88" y1="8" x2="8" y2="88" stroke="currentColor" strokeWidth="2" />
        {/* Labels */}
        <text x="48" y="20" textAnchor="middle" className="fill-stone-400 text-[12px] font-mono font-bold">{letters[1]}</text>
        <text x="20" y="52" textAnchor="middle" className="fill-stone-400 text-[12px] font-mono font-bold">{letters[2]}</text>
        <text x="76" y="52" textAnchor="middle" className="fill-stone-400 text-[12px] font-mono font-bold">{letters[0]}</text>
        <text x="48" y="82" textAnchor="middle" className="fill-stone-400 text-[12px] font-mono font-bold">{letters[3]}</text>
      </svg>
    </div>
  );
}

function App() {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'encrypt' | 'reference'>('encrypt');
  const [showInfo, setShowInfo] = useState(false);

  const cleanInput = input.toUpperCase().replace(/[^A-Z ]/g, '');

  // Encoded symbols
  const encoded = useMemo(() => {
    return cleanInput.split('').map((ch, i) => ({
      char: ch,
      index: i,
      hasSymbol: ch !== ' ' && SYMBOLS[ch] !== undefined,
    }));
  }, [cleanInput]);

  return (
    <div className="flex-1 bg-[#16140e] flex flex-col">
      <ExhibitPanel id="pigpen" />
      <div className="bg-[#16140e] flex flex-col items-center justify-start py-10 px-6 text-stone-200">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl sm:text-4xl font-typewriter font-bold text-stone-100 tracking-tighter">
              PIGPEN <span className="text-amber-500">CIPHER</span>
            </h1>
            <span className="text-stone-500 text-xs tracking-[0.3em] font-mono">MASONIC CIPHER — 18TH CENTURY</span>
          </div>
          <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-lg hover:bg-stone-800 text-stone-400 border border-stone-700">
            <Info size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-2 mb-8">
          <button
            onClick={() => setMode('encrypt')}
            className={`px-6 py-2 rounded-lg font-bold text-sm border transition-colors ${
              mode === 'encrypt' ? 'bg-amber-900/50 border-amber-700 text-amber-300' : 'bg-stone-800 border-stone-700 text-stone-400'
            }`}
          >ENCODE</button>
          <button
            onClick={() => setMode('reference')}
            className={`px-6 py-2 rounded-lg font-bold text-sm border transition-colors ${
              mode === 'reference' ? 'bg-amber-900/50 border-amber-700 text-amber-300' : 'bg-stone-800 border-stone-700 text-stone-400'
            }`}
          >REFERENCE KEY</button>
        </div>

        {/* ─── ENCODE TAB ────────────────────────────────────────────── */}
        {mode === 'encrypt' && (
          <>
            {/* Input */}
            <div className="mb-6">
              <label className="block text-xs text-stone-400 font-bold uppercase tracking-wider mb-2">
                Plaintext
              </label>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value.toUpperCase())}
                placeholder="TYPE YOUR SECRET MESSAGE..."
                className="w-full h-28 bg-stone-900 border border-stone-700 rounded-xl p-4 font-mono text-lg tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none text-stone-200 placeholder-stone-700"
                spellCheck={false}
              />
            </div>

            {/* Pigpen Output */}
            <div className="bg-stone-900/60 rounded-2xl border border-stone-800 p-6 mb-6">
              <label className="block text-[10px] text-amber-400 uppercase tracking-widest font-bold mb-4">
                Pigpen Symbols
              </label>
              <div className="flex flex-wrap gap-2 min-h-[60px] items-center">
                {encoded.length > 0 ? encoded.map((e, i) => (
                  e.char === ' ' ? (
                    <div key={i} className="w-4" />
                  ) : e.hasSymbol ? (
                    <div key={i} className="group relative">
                      <div className="text-amber-400 transition-transform group-hover:scale-125">
                        <PigpenSymbol char={e.char} size={44} />
                      </div>
                      {/* Hover tooltip */}
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-mono text-amber-300 bg-stone-800 px-1.5 py-0.5 rounded border border-stone-700 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        {e.char}
                      </div>
                    </div>
                  ) : null
                )) : (
                  <span className="text-stone-700 text-sm">Symbols will appear here...</span>
                )}
              </div>
            </div>

            {/* Letter-by-letter breakdown */}
            {cleanInput.replace(/ /g, '').length > 0 && (
              <div className="bg-stone-900/60 rounded-2xl border border-stone-800 p-6 mb-6">
                <label className="block text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-4">
                  Letter-by-Letter Breakdown
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
                  {encoded.filter(e => e.char !== ' ' && e.hasSymbol).map((e, i) => (
                    <div key={i} className="flex flex-col items-center gap-1 py-2 px-1 rounded-lg bg-stone-800/40 hover:bg-stone-800 transition-colors">
                      <span className="text-lg font-mono font-bold text-stone-300">{e.char}</span>
                      <div className="text-amber-400">
                        <PigpenSymbol char={e.char} size={36} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ─── REFERENCE KEY TAB ─────────────────────────────────────── */}
        {mode === 'reference' && (
          <div className="bg-stone-900/60 rounded-2xl border border-stone-800 p-6 mb-6">
            <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-6 text-center">
              The Four Pigpen Grids
            </div>

            {/* Grid diagrams */}
            <div className="flex flex-wrap justify-center gap-8 mb-8">
              <GridDiagram letters={['A','B','C','D','E','F','G','H','I']} type="grid" hasDot={false} />
              <GridDiagram letters={['J','K','L','M','N','O','P','Q','R']} type="grid" hasDot={true} />
              <GridDiagram letters={['S','T','U','V']} type="x" hasDot={false} />
              <GridDiagram letters={['W','X','Y','Z']} type="x" hasDot={true} />
            </div>

            {/* Full alphabet reference */}
            <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-4 text-center">
              Complete Alphabet
            </div>
            <div className="grid grid-cols-6 sm:grid-cols-9 md:grid-cols-13 gap-2">
              {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(ch => (
                <div key={ch} className="flex flex-col items-center gap-1 py-3 px-1 rounded-lg bg-stone-800/40 hover:bg-stone-800 transition-colors group">
                  <span className="text-sm font-mono font-bold text-stone-300 group-hover:text-amber-300 transition-colors">{ch}</span>
                  <div className="text-amber-400 group-hover:scale-110 transition-transform">
                    <PigpenSymbol char={ch} size={32} />
                  </div>
                  <span className="text-[8px] text-stone-600">
                    {SYMBOLS[ch].dot ? '• dot' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── How It Works ──────────────────────────────────────────── */}
        <div className="bg-stone-900/40 rounded-xl border border-stone-800 p-5">
          <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-3">
            How It Works
          </div>
          <div className="grid sm:grid-cols-3 gap-4 text-xs text-stone-400">
            <div>
              <div className="font-bold text-amber-400 mb-1">1. Four Grids</div>
              <p>Two tic-tac-toe grids (9 letters each) and two X grids (4 letters each) cover all 26 letters. The second grid of each pair adds a dot.</p>
            </div>
            <div>
              <div className="font-bold text-amber-400 mb-1">2. Symbol = Shape</div>
              <p>Each letter's symbol is the portion of the grid surrounding it. Corner letters get two lines, edge letters one, center letters two parallel lines.</p>
            </div>
            <div>
              <div className="font-bold text-amber-400 mb-1">3. Dot = Second Grid</div>
              <p>J-R use the same shapes as A-I but with a center dot. W-Z mirror S-V with a dot. The dot doubles the alphabet capacity.</p>
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
          <h3 className="text-xl font-bold text-amber-400 mb-2">About the Pigpen Cipher</h3>
          <p className="text-sm text-stone-300 leading-relaxed mb-3">
            The <strong>Pigpen cipher</strong> (also called the <strong>Masonic cipher</strong> or <strong>Freemason's cipher</strong>)
            is a geometric substitution cipher that replaces letters with symbols derived from a grid pattern. It dates to at least
            the <strong>18th century</strong> and was used by Freemasons to keep their records private.
          </p>
          <p className="text-sm text-stone-300 leading-relaxed mb-3">
            Despite its mysterious appearance, Pigpen is just a simple substitution cipher — each letter always maps to the same symbol.
            It can be broken instantly by frequency analysis, just like the Caesar cipher. Its real strength was that most people
            couldn't recognize it as writing at all — it looked like meaningless geometric doodles.
          </p>
          <p className="text-sm text-stone-300 leading-relaxed">
            The cipher appears in numerous historical contexts: <strong>Confederate prisoners</strong> in the Civil War,
            <strong> Boy Scout</strong> handbooks, and countless puzzle books. It remains popular as a teaching tool and
            in geocaching. The symbol set is sometimes varied — some versions swap grid assignments or use different geometric bases.
          </p>
        </div>
      </div>
    </div>
    </div>
  );
}

export default App;
