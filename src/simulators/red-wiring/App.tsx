import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RotateCcw, ChevronUp, ChevronDown, Lock, Unlock } from 'lucide-react';

// ── RED Constants (matches red/constants.ts) ─────────────────────────
const SIXES_CHARS = 'AEIOUY';
const TWENTIES_CHARS = 'BCDFGHJKLMNPQRSTVWXZ';
const SIXES = SIXES_CHARS.split('');
const TWENTIES = TWENTIES_CHARS.split('');
const KEYBOARD_LAYOUT = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

// Generate wirings (same logic as red/constants.ts)
function generateSixesWirings(): string[] {
  const base = SIXES_CHARS.split('');
  const perms: string[] = [];
  for (let i = 0; i < 25; i++) {
    const shift = (i + 1) % 6;
    const perm = base.map((_, j) => base[(j + shift + Math.floor(i / 6)) % 6]).join('');
    perms.push(perm);
  }
  return perms;
}

function generateTwentiesWirings(): string[] {
  const base = TWENTIES_CHARS.split('');
  const perms: string[] = [];
  for (let i = 0; i < 25; i++) {
    const shift = (i * 7 + 3) % 20;
    const perm = base.map((_, j) => base[(j + shift) % 20]).join('');
    perms.push(perm);
  }
  return perms;
}

const SIXES_WIRINGS = generateSixesWirings();
const TWENTIES_WIRINGS = generateTwentiesWirings();

// ── Types ────────────────────────────────────────────────────────────
interface MachineState {
  sixesPos: number;
  twentiesPos: number;
}

interface SignalTrace {
  inputChar: string;
  outputChar: string;
  isSixes: boolean;
  inputIdx: number;
  outputIdx: number;
}

// ── Signal tracing ───────────────────────────────────────────────────
function traceSignal(char: string, state: MachineState, decrypt: boolean): SignalTrace {
  const upper = char.toUpperCase();
  const isSixes = SIXES.includes(upper);

  if (isSixes) {
    const wiring = SIXES_WIRINGS[state.sixesPos];
    const inputIdx = SIXES.indexOf(upper);
    if (!decrypt) {
      const outChar = wiring[inputIdx];
      return { inputChar: upper, outputChar: outChar, isSixes: true, inputIdx, outputIdx: SIXES.indexOf(outChar) };
    } else {
      const outputIdx = wiring.indexOf(upper);
      return { inputChar: upper, outputChar: SIXES[outputIdx], isSixes: true, inputIdx, outputIdx };
    }
  } else {
    const wiring = TWENTIES_WIRINGS[state.twentiesPos];
    const inputIdx = TWENTIES.indexOf(upper);
    if (!decrypt) {
      const outChar = wiring[inputIdx];
      return { inputChar: upper, outputChar: outChar, isSixes: false, inputIdx, outputIdx: TWENTIES.indexOf(outChar) };
    } else {
      const outputIdx = wiring.indexOf(upper);
      return { inputChar: upper, outputChar: TWENTIES[outputIdx], isSixes: false, inputIdx, outputIdx };
    }
  }
}

function stepMachine(state: MachineState): MachineState {
  return {
    sixesPos: (state.sixesPos + 1) % SIXES_WIRINGS.length,
    twentiesPos: (state.twentiesPos + 1) % TWENTIES_WIRINGS.length,
  };
}

// ── Effective wiring as index array ──────────────────────────────────
function wiringToIndices(wiring: string, alphabet: string[], decrypt: boolean): number[] {
  if (!decrypt) {
    return Array.from({ length: alphabet.length }, (_, i) => alphabet.indexOf(wiring[i]));
  } else {
    return Array.from({ length: alphabet.length }, (_, i) => wiring.indexOf(alphabet[i]));
  }
}

// ── SVG Wiring Panel ─────────────────────────────────────────────────
const LETTER_DY = 22;
const WIRE_PAD = 16;

const WiringPanel: React.FC<{
  letters: string[];
  wiring: number[];
  activeIn: number;
  activeOut: number;
  forwardColor: string;
  title: string;
  titleColor: string;
  position: number;
}> = ({ letters, wiring, activeIn, activeOut, forwardColor, title, titleColor, position }) => {
  const n = letters.length;
  const colSpacing = 160;
  const marginX = 50;
  const colX = [marginX, marginX + colSpacing];
  const svgW = colX[1] + marginX + 20;
  const letterY0 = 50;
  const letterY = (i: number) => letterY0 + i * LETTER_DY;
  const svgH = letterY0 + n * LETTER_DY + 20;
  const wireHue = (i: number) => (i * 360) / n;
  const x1 = colX[0] + WIRE_PAD;
  const x2 = colX[1] - WIRE_PAD;
  const cp = (x2 - x1) * 0.15;

  return (
    <div>
      <div className={`text-xs font-bold uppercase tracking-wider mb-2 ${titleColor}`}>
        {title} <span className="text-slate-600 font-normal">— position {position}</span>
      </div>
      <div className="bg-slate-950/60 rounded-xl p-2 border border-slate-800 overflow-x-auto">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" style={{ minWidth: 280 }}>
          <defs>
            <filter id={`glow-${title.replace(/\s/g, '')}`} filterUnits="userSpaceOnUse">
              <feGaussianBlur stdDeviation="2.5" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Column headers */}
          <text x={colX[0]} y={16} textAnchor="middle" fill="#64748b" fontSize={9} fontWeight="bold" fontFamily="monospace">IN</text>
          <text x={colX[1]} y={16} textAnchor="middle" fill="#64748b" fontSize={9} fontWeight="bold" fontFamily="monospace">OUT</text>
          <text x={(colX[0] + colX[1]) / 2} y={32} textAnchor="middle" fill={forwardColor} fontSize={8} fontWeight="bold" fontFamily="monospace" opacity={0.7}>
            SWITCH
          </text>

          {/* Letters */}
          {[0, 1].map(c => (
            <g key={`col-${c}`}>
              {letters.map((letter, i) => {
                const isActive = (c === 0 && i === activeIn) || (c === 1 && i === activeOut);
                const y = letterY(i);
                return (
                  <g key={i}>
                    {isActive && (
                      <circle cx={colX[c]} cy={y} r={9} fill={c === 1 ? '#10b981' : forwardColor} fillOpacity={0.2}
                        stroke={c === 1 ? '#10b981' : forwardColor} strokeWidth={1.5} strokeOpacity={0.6} />
                    )}
                    <text x={colX[c]} y={y + 1} textAnchor="middle" dominantBaseline="central"
                      fontSize={11} fontWeight="bold" fontFamily="monospace"
                      fill={isActive ? (c === 1 ? '#10b981' : forwardColor) : '#475569'}>
                      {letter}
                    </text>
                  </g>
                );
              })}
            </g>
          ))}

          {/* Wires */}
          {wiring.map((outIdx, inIdx) => {
            if (inIdx === activeIn && activeIn >= 0) return null;
            return (
              <path key={inIdx}
                d={`M ${x1} ${letterY(inIdx)} C ${x1 + cp} ${letterY(inIdx)}, ${x2 - cp} ${letterY(outIdx)}, ${x2} ${letterY(outIdx)}`}
                stroke={`hsla(${wireHue(inIdx)}, 40%, 45%, ${activeIn >= 0 ? 0.05 : 0.15})`}
                strokeWidth={1} fill="none" />
            );
          })}
          {activeIn >= 0 && (() => {
            const outIdx = wiring[activeIn];
            return (
              <path
                d={`M ${x1} ${letterY(activeIn)} C ${x1 + cp} ${letterY(activeIn)}, ${x2 - cp} ${letterY(outIdx)}, ${x2} ${letterY(outIdx)}`}
                stroke={forwardColor} strokeWidth={2.5} fill="none"
                filter={`url(#glow-${title.replace(/\s/g, '')})`} />
            );
          })()}

          {/* Arrows */}
          {activeIn >= 0 && (
            <g>
              <polygon points={`${colX[0] - WIRE_PAD - 6},${letterY(activeIn) - 4} ${colX[0] - WIRE_PAD - 6},${letterY(activeIn) + 4} ${colX[0] - WIRE_PAD},${letterY(activeIn)}`}
                fill={forwardColor} />
              <polygon points={`${colX[1] + WIRE_PAD},${letterY(activeOut) - 4} ${colX[1] + WIRE_PAD},${letterY(activeOut) + 4} ${colX[1] + WIRE_PAD + 6},${letterY(activeOut)}`}
                fill="#10b981" />
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};

// ── Main Component ───────────────────────────────────────────────────
const App: React.FC = () => {
  const [state, setState] = useState<MachineState>({ sixesPos: 0, twentiesPos: 0 });
  const [decrypt, setDecrypt] = useState(false);
  const [trace, setTrace] = useState<SignalTrace | null>(null);
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const [tape, setTape] = useState('');
  const [history, setHistory] = useState<MachineState[]>([]);

  const sixesWiring = useMemo(() => wiringToIndices(SIXES_WIRINGS[state.sixesPos], SIXES, decrypt), [state.sixesPos, decrypt]);
  const twentiesWiring = useMemo(() => wiringToIndices(TWENTIES_WIRINGS[state.twentiesPos], TWENTIES, decrypt), [state.twentiesPos, decrypt]);

  const handleKeyDown = useCallback((char: string) => {
    if (pressedKey) return;
    const upper = char.toUpperCase();
    if (!/^[A-Z]$/.test(upper)) return;
    if (!SIXES.includes(upper) && !TWENTIES.includes(upper)) return;

    // RED steps BEFORE processing
    const stepped = stepMachine(state);
    setHistory(prev => [...prev, state]);
    const sig = traceSignal(upper, stepped, decrypt);
    setTrace(sig);
    setPressedKey(upper);
    setTape(prev => prev + sig.outputChar);
    setState(stepped);
  }, [state, pressedKey, decrypt]);

  const handleKeyUp = useCallback(() => {
    setPressedKey(null);
  }, []);

  const handleBackspace = useCallback(() => {
    if (history.length === 0) return;
    setState(history[history.length - 1]);
    setHistory(prev => prev.slice(0, -1));
    setTape(prev => prev.slice(0, -1));
    setTrace(null);
    setPressedKey(null);
  }, [history]);

  useEffect(() => {
    const isInput = () => {
      const t = document.activeElement?.tagName;
      return t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT';
    };
    const down = (e: KeyboardEvent) => {
      if (isInput()) return;
      const ch = e.key.toUpperCase();
      if (/^[A-Z]$/.test(ch) && !e.repeat && !e.metaKey && !e.ctrlKey && !e.altKey) handleKeyDown(ch);
      if (e.key === 'Backspace') handleBackspace();
    };
    const up = (e: KeyboardEvent) => {
      if (isInput()) return;
      if (/^[A-Z]$/.test(e.key.toUpperCase())) handleKeyUp();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [handleKeyDown, handleKeyUp, handleBackspace]);

  const handleReset = () => {
    setState({ sixesPos: 0, twentiesPos: 0 });
    setTrace(null);
    setPressedKey(null);
    setTape('');
    setHistory([]);
  };

  return (
    <div className="flex-1 bg-[#161018] flex flex-col items-center px-4 py-8 text-slate-200">
      <div className="w-full max-w-5xl">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              RED <span className="text-rose-400">WIRING EXPLORER</span>
            </h1>
            <p className="text-xs text-slate-500 font-mono tracking-widest">TYPE 91 — SPLIT-ALPHABET STEPPING SWITCHES</p>
          </div>
          <button onClick={handleReset}
            className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-colors">
            <RotateCcw size={18} />
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => { setDecrypt(false); setTrace(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              !decrypt ? 'bg-rose-950/40 border border-rose-700/50 text-rose-400' : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-rose-400'
            }`}>
            <Lock size={16} /> Encrypt
          </button>
          <button onClick={() => { setDecrypt(true); setTrace(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              decrypt ? 'bg-rose-950/40 border border-rose-700/50 text-rose-400' : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-rose-400'
            }`}>
            <Unlock size={16} /> Decrypt
          </button>
          <span className="text-xs text-slate-500 font-mono">
            {trace ? (trace.isSixes ? 'SIXES path (vowel)' : 'TWENTIES path (consonant)') : 'Press a key...'}
          </span>
        </div>

        {/* Position Controls */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 mb-6">
          <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">Switch Positions</div>
          <div className="grid grid-cols-2 gap-6">
            {([
              { key: 'sixesPos' as const, label: 'SIXES', color: 'text-rose-400', max: SIXES_WIRINGS.length },
              { key: 'twentiesPos' as const, label: 'TWENTIES', color: 'text-indigo-400', max: TWENTIES_WIRINGS.length },
            ]).map(({ key, label, color, max }) => (
              <div key={key} className="flex flex-col items-center">
                <div className={`text-[9px] font-bold ${color}`}>{label}</div>
                <div className="flex items-center gap-1 mt-1">
                  <button onClick={() => { setState(s => ({ ...s, [key]: (s[key] + 1) % max })); setTrace(null); }}
                    className="p-0.5 text-slate-600 hover:text-rose-400"><ChevronUp size={14} /></button>
                  <div className="w-10 h-9 bg-slate-800 border border-slate-600 rounded-lg flex items-center justify-center font-mono font-bold text-rose-400 text-lg">
                    {state[key]}
                  </div>
                  <button onClick={() => { setState(s => ({ ...s, [key]: (s[key] - 1 + max) % max })); setTrace(null); }}
                    className="p-0.5 text-slate-600 hover:text-rose-400"><ChevronDown size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Split Alphabet Indicator */}
        <div className="flex gap-3 mb-4">
          <div className={`flex-1 rounded-lg border p-2 text-center text-xs font-mono transition-colors ${
            trace?.isSixes ? 'bg-rose-950/30 border-rose-700/50 text-rose-400' : 'bg-slate-900/40 border-slate-800 text-slate-600'
          }`}>
            SIXES: {SIXES.join(' ')}
          </div>
          <div className={`flex-1 rounded-lg border p-2 text-center text-xs font-mono transition-colors ${
            trace && !trace.isSixes ? 'bg-indigo-950/30 border-indigo-700/50 text-indigo-400' : 'bg-slate-900/40 border-slate-800 text-slate-600'
          }`}>
            TWENTIES: {TWENTIES.join(' ')}
          </div>
        </div>

        {/* Wiring Diagrams — side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-3">
            <WiringPanel
              letters={SIXES}
              wiring={sixesWiring}
              activeIn={trace?.isSixes ? trace.inputIdx : -1}
              activeOut={trace?.isSixes ? trace.outputIdx : -1}
              forwardColor="#f43f5e"
              title="Sixes Switch"
              titleColor="text-rose-400"
              position={state.sixesPos}
            />
          </div>
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-3">
            <WiringPanel
              letters={TWENTIES}
              wiring={twentiesWiring}
              activeIn={trace && !trace.isSixes ? trace.inputIdx : -1}
              activeOut={trace && !trace.isSixes ? trace.outputIdx : -1}
              forwardColor="#818cf8"
              title="Twenties Switch"
              titleColor="text-indigo-400"
              position={state.twentiesPos}
            />
          </div>
        </div>

        {/* Signal Path */}
        {trace && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-1.5 font-mono text-sm">
              <span className={`font-bold ${trace.isSixes ? 'text-rose-400' : 'text-indigo-400'}`}>{trace.inputChar}</span>
              <span className="text-slate-600">→</span>
              <span className={`text-[10px] ${trace.isSixes ? 'text-rose-400' : 'text-indigo-400'}`}>
                [{trace.isSixes ? 'SIXES' : 'TWENTIES'} switch @ pos {trace.isSixes ? state.sixesPos : state.twentiesPos}]
              </span>
              <span className="text-slate-600">→</span>
              <span className="text-amber-400 font-bold text-lg">{trace.outputChar}</span>
            </div>
          </div>
        )}

        {/* Keyboard */}
        <div className="flex flex-col items-center gap-2 mb-6 select-none">
          {KEYBOARD_LAYOUT.map((row, rIdx) => (
            <div key={rIdx} className="flex gap-1.5 sm:gap-2">
              {row.split('').map(char => {
                const isActive = pressedKey === char;
                const isOutput = trace?.outputChar === char;
                const isSixesChar = SIXES.includes(char);
                return (
                  <button key={char}
                    onMouseDown={e => { e.preventDefault(); handleKeyDown(char); }}
                    onMouseUp={e => { e.preventDefault(); handleKeyUp(); }}
                    onMouseLeave={() => { if (isActive) handleKeyUp(); }}
                    onTouchStart={e => { e.preventDefault(); handleKeyDown(char); }}
                    onTouchEnd={e => { e.preventDefault(); handleKeyUp(); }}
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg border-2 flex items-center justify-center
                      text-base sm:text-lg font-mono font-bold transition-all ${
                      isActive ? (isSixesChar ? 'bg-rose-600 border-rose-500' : 'bg-indigo-600 border-indigo-500') + ' text-white scale-95' :
                      isOutput ? 'bg-amber-600/20 border-amber-500 text-amber-400' :
                      isSixesChar ? 'bg-slate-800 border-rose-900/50 text-rose-300/60 hover:bg-slate-700 hover:text-rose-300' :
                      'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}>
                    {char}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Tape */}
        {tape && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 mb-6">
            <div className="flex justify-between items-center mb-2">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Output Tape</div>
              <button onClick={() => { setTape(''); setHistory([]); }}
                className="text-xs text-slate-500 hover:text-red-400 transition-colors">Clear</button>
            </div>
            <div className="font-mono text-lg tracking-widest text-rose-400 break-all">
              {tape.match(/.{1,5}/g)?.join(' ')}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-5 text-xs text-slate-500 space-y-2">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">About the RED Machine (Type 91)</div>
          <p>
            The <span className="text-white">RED machine</span> (Type 91) was Japan's first major cipher machine, used from 1931.
            It used <span className="text-rose-400">telephone stepping switches</span> instead of rotors. Like Purple, it split the
            alphabet into <span className="text-rose-400">sixes</span> (vowels) and <span className="text-indigo-400">twenties</span> (consonants),
            each encrypted by a separate switch bank.
          </p>
          <p>
            Unlike Purple's three chained switches for the twenties, RED uses only a
            <span className="text-white"> single switch per group</span>. Both switches step with every character,
            cycling through their permutation tables. The switches step <span className="text-white">before</span> encryption
            (opposite of Purple's post-step behavior).
          </p>
          <p>
            The <span className="text-white">fatal weakness</span> was identical to Purple's: vowels always encrypt to vowels,
            consonants to consonants. The US <span className="text-white">Signal Intelligence Service</span> broke RED by 1935,
            which directly aided the later breaking of Purple.
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;
