import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RotateCcw, ChevronUp, ChevronDown, Lock, Unlock } from 'lucide-react';

// ── Purple Constants ─────────────────────────────────────────────────
const SIXES = ['A', 'E', 'I', 'O', 'U', 'Y'];
const TWENTIES = ['B', 'C', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'V', 'W', 'X', 'Z'];
const KEYBOARD_LAYOUT = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

const PERM_SIXES = [4, 2, 5, 0, 1, 3];
const PERM_TWENTIES_1 = [19, 4, 18, 1, 17, 2, 16, 3, 15, 8, 14, 9, 13, 5, 12, 6, 11, 7, 10, 0];
const PERM_TWENTIES_2 = [1, 18, 4, 17, 2, 16, 19, 10, 5, 15, 6, 14, 7, 13, 8, 12, 9, 11, 3, 0];
const PERM_TWENTIES_3 = [5, 19, 1, 14, 2, 18, 3, 17, 4, 16, 0, 15, 6, 12, 7, 11, 8, 13, 9, 10];

const mod = (n: number, m: number) => ((n % m) + m) % m;

// ── Types ────────────────────────────────────────────────────────────
interface MachineState {
  sixesPos: number;
  twentiesSlow: number;
  twentiesMedium: number;
  twentiesFast: number;
}

interface SignalTrace {
  inputChar: string;
  outputChar: string;
  isSixes: boolean;
  // Sixes: [input, output]
  // Twenties: [input, afterSlow, afterMed, afterFast] (encrypt) or [input, afterFast, afterMed, afterSlow] (decrypt)
  path: number[];
}

// ── Signal tracing ───────────────────────────────────────────────────
function traceSignal(char: string, state: MachineState, mode: 'encrypt' | 'decrypt'): SignalTrace {
  const upper = char.toUpperCase();
  const isSixes = SIXES.includes(upper);

  if (isSixes) {
    const idx = SIXES.indexOf(upper);
    const offset = state.sixesPos;
    if (mode === 'encrypt') {
      const shifted = mod(idx + offset, 6);
      const permuted = PERM_SIXES[shifted];
      const finalIdx = mod(permuted - offset, 6);
      return { inputChar: upper, outputChar: SIXES[finalIdx], isSixes: true, path: [idx, finalIdx] };
    } else {
      const shifted = mod(idx + offset, 6);
      const permuted = PERM_SIXES.indexOf(shifted);
      const finalIdx = mod(permuted - offset, 6);
      return { inputChar: upper, outputChar: SIXES[finalIdx], isSixes: true, path: [idx, finalIdx] };
    }
  } else {
    const idx = TWENTIES.indexOf(upper);
    const { twentiesSlow: slow, twentiesMedium: med, twentiesFast: fast } = state;
    if (mode === 'encrypt') {
      // Slow → Medium → Fast
      let v = mod(idx + slow, 20);
      v = PERM_TWENTIES_3[v];
      const afterSlow = mod(v - slow, 20);

      v = mod(afterSlow + med, 20);
      v = PERM_TWENTIES_2[v];
      const afterMed = mod(v - med, 20);

      v = mod(afterMed + fast, 20);
      v = PERM_TWENTIES_1[v];
      const afterFast = mod(v - fast, 20);

      return { inputChar: upper, outputChar: TWENTIES[afterFast], isSixes: false, path: [idx, afterSlow, afterMed, afterFast] };
    } else {
      // Fast → Medium → Slow
      let v = mod(idx + fast, 20);
      v = PERM_TWENTIES_1.indexOf(v);
      const afterFast = mod(v - fast, 20);

      v = mod(afterFast + med, 20);
      v = PERM_TWENTIES_2.indexOf(v);
      const afterMed = mod(v - med, 20);

      v = mod(afterMed + slow, 20);
      v = PERM_TWENTIES_3.indexOf(v);
      const afterSlow = mod(v - slow, 20);

      return { inputChar: upper, outputChar: TWENTIES[afterSlow], isSixes: false, path: [idx, afterFast, afterMed, afterSlow] };
    }
  }
}

function stepMachine(state: MachineState): MachineState {
  const s = { ...state };
  s.sixesPos = (s.sixesPos + 1) % 6;
  s.twentiesFast = (s.twentiesFast + 1) % 20;
  if (s.twentiesFast === 0) {
    s.twentiesMedium = (s.twentiesMedium + 1) % 20;
    if (s.twentiesMedium === 0) {
      s.twentiesSlow = (s.twentiesSlow + 1) % 20;
    }
  }
  return s;
}

// ── Effective wiring computation ─────────────────────────────────────
function effectiveSixesWiring(pos: number, decrypt: boolean): number[] {
  if (!decrypt) {
    return Array.from({ length: 6 }, (_, i) => {
      const shifted = mod(i + pos, 6);
      const permuted = PERM_SIXES[shifted];
      return mod(permuted - pos, 6);
    });
  } else {
    return Array.from({ length: 6 }, (_, i) => {
      const shifted = mod(i + pos, 6);
      const permuted = PERM_SIXES.indexOf(shifted);
      return mod(permuted - pos, 6);
    });
  }
}

function effectiveTwentiesWiring(perm: number[], pos: number, decrypt: boolean): number[] {
  if (!decrypt) {
    return Array.from({ length: 20 }, (_, i) => {
      const shifted = mod(i + pos, 20);
      const permuted = perm[shifted];
      return mod(permuted - pos, 20);
    });
  } else {
    return Array.from({ length: 20 }, (_, i) => {
      const shifted = mod(i + pos, 20);
      const permuted = perm.indexOf(shifted);
      return mod(permuted - pos, 20);
    });
  }
}

// ── SVG Wiring Panel ─────────────────────────────────────────────────
const LETTER_DY = 22;
const WIRE_PAD = 14;

const WiringPanel: React.FC<{
  letters: string[];
  wirings: number[][];
  gapLabels: string[];
  activeIndices: number[] | null; // index at each column
  forwardColor: string;
  title: string;
  titleColor: string;
  columnOffsets?: number[];
}> = ({ letters, wirings, gapLabels, activeIndices, forwardColor, title, titleColor, columnOffsets }) => {
  const numCols = wirings.length + 1;
  const n = letters.length;
  const colSpacing = Math.max(100, Math.min(160, 600 / Math.max(wirings.length, 1)));
  const marginX = 50;
  const colX = Array.from({ length: numCols }, (_, i) => marginX + i * colSpacing);
  const svgW = colX[numCols - 1] + marginX + 20;
  const letterY0 = 50;
  const letterY = (i: number) => letterY0 + i * LETTER_DY;
  const svgH = letterY0 + n * LETTER_DY + 20;
  const wireHue = (i: number) => (i * 360) / n;

  return (
    <div>
      <div className={`text-xs font-bold uppercase tracking-wider mb-2 ${titleColor}`}>{title}</div>
      <div className="bg-slate-950/60 rounded-xl p-2 border border-slate-800 overflow-x-auto">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" style={{ minWidth: Math.min(400, svgW) }}>
          <defs>
            <filter id={`glow-${title.replace(/\s/g, '')}`} filterUnits="userSpaceOnUse">
              <feGaussianBlur stdDeviation="2.5" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Column headers */}
          {colX.map((cx, c) => (
            <text key={c} x={cx} y={16} textAnchor="middle" fill="#64748b" fontSize={9} fontWeight="bold" fontFamily="monospace">
              {c === 0 ? 'IN' : c === numCols - 1 ? 'OUT' : '•'}
            </text>
          ))}

          {/* Gap labels */}
          {gapLabels.map((label, g) => (
            <text key={g} x={(colX[g] + colX[g + 1]) / 2} y={32} textAnchor="middle" fill={titleColor.replace('text-', '').includes('purple') ? '#9333ea' : '#059669'} fontSize={8} fontWeight="bold" fontFamily="monospace" opacity={0.7}>
              {label}
            </text>
          ))}

          {/* Column letters (rotated by column offset) */}
          {colX.map((cx, c) => {
            const off = columnOffsets ? (columnOffsets[c] ?? 0) : 0;
            return (
              <g key={`col-${c}`}>
                {letters.map((_, i) => {
                  const contactIdx = (i + off) % n;
                  const letter = letters[contactIdx];
                  const isActive = activeIndices && activeIndices[c] === contactIdx;
                  const y = letterY(i);
                  return (
                    <g key={i}>
                      {isActive && (
                        <circle cx={cx} cy={y} r={9} fill={forwardColor} fillOpacity={0.2}
                          stroke={forwardColor} strokeWidth={1.5} strokeOpacity={0.6} />
                      )}
                      <text x={cx} y={y + 1} textAnchor="middle" dominantBaseline="central"
                        fontSize={11} fontWeight="bold" fontFamily="monospace"
                        fill={isActive ? forwardColor : '#475569'}>
                        {letter}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* Wires (adjusted for column rotation) */}
          {wirings.map((wiring, g) => {
            const x1 = colX[g] + WIRE_PAD;
            const x2 = colX[g + 1] - WIRE_PAD;
            const cp = (x2 - x1) * 0.15;
            const activeIn = activeIndices ? activeIndices[g] : -1;
            const leftOff = columnOffsets ? (columnOffsets[g] ?? 0) : 0;
            const rightOff = columnOffsets ? (columnOffsets[g + 1] ?? 0) : 0;

            return (
              <g key={`gap-${g}`}>
                {/* Background */}
                {wiring.map((outIdx, inIdx) => {
                  if (inIdx === activeIn) return null;
                  const vIn = ((inIdx - leftOff) % n + n) % n;
                  const vOut = ((outIdx - rightOff) % n + n) % n;
                  return (
                    <path key={inIdx}
                      d={`M ${x1} ${letterY(vIn)} C ${x1 + cp} ${letterY(vIn)}, ${x2 - cp} ${letterY(vOut)}, ${x2} ${letterY(vOut)}`}
                      stroke={`hsla(${wireHue(inIdx)}, 40%, 45%, ${activeIndices ? 0.12 : 0.22})`}
                      strokeWidth={1} fill="none" />
                  );
                })}
                {/* Active */}
                {activeIndices && activeIn >= 0 && (() => {
                  const outIdx = wiring[activeIn];
                  const vIn = ((activeIn - leftOff) % n + n) % n;
                  const vOut = ((outIdx - rightOff) % n + n) % n;
                  return (
                    <path
                      d={`M ${x1} ${letterY(vIn)} C ${x1 + cp} ${letterY(vIn)}, ${x2 - cp} ${letterY(vOut)}, ${x2} ${letterY(vOut)}`}
                      stroke={forwardColor} strokeWidth={2.5} fill="none"
                      filter={`url(#glow-${title.replace(/\s/g, '')})`} />
                  );
                })()}
              </g>
            );
          })}

          {/* Input/Output arrows */}
          {activeIndices && (() => {
            const inContact = activeIndices[0];
            const outContact = activeIndices[numCols - 1];
            const leftOff = columnOffsets ? (columnOffsets[0] ?? 0) : 0;
            const rightOff = columnOffsets ? (columnOffsets[numCols - 1] ?? 0) : 0;
            const vIn = ((inContact - leftOff) % n + n) % n;
            const vOut = ((outContact - rightOff) % n + n) % n;
            const eX = colX[0];
            const oX = colX[numCols - 1];
            return (
              <g>
                <polygon points={`${eX - WIRE_PAD - 6},${letterY(vIn) - 4} ${eX - WIRE_PAD - 6},${letterY(vIn) + 4} ${eX - WIRE_PAD},${letterY(vIn)}`}
                  fill={forwardColor} />
                <polygon points={`${oX + WIRE_PAD},${letterY(vOut) - 4} ${oX + WIRE_PAD},${letterY(vOut) + 4} ${oX + WIRE_PAD + 6},${letterY(vOut)}`}
                  fill="#10b981" />
              </g>
            );
          })()}
        </svg>
      </div>
    </div>
  );
};

// ── Main Component ───────────────────────────────────────────────────
const App: React.FC = () => {
  const [state, setState] = useState<MachineState>({ sixesPos: 0, twentiesSlow: 0, twentiesMedium: 0, twentiesFast: 0 });
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [trace, setTrace] = useState<SignalTrace | null>(null);
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const [tape, setTape] = useState('');
  const [history, setHistory] = useState<MachineState[]>([]);

  const isDecrypt = mode === 'decrypt';

  // Effective wirings
  const sixesWiring = useMemo(() => effectiveSixesWiring(state.sixesPos, isDecrypt), [state.sixesPos, isDecrypt]);
  const twentiesWirings = useMemo(() => {
    if (!isDecrypt) {
      // Encrypt: Slow → Medium → Fast
      return [
        effectiveTwentiesWiring(PERM_TWENTIES_3, state.twentiesSlow, false),
        effectiveTwentiesWiring(PERM_TWENTIES_2, state.twentiesMedium, false),
        effectiveTwentiesWiring(PERM_TWENTIES_1, state.twentiesFast, false),
      ];
    } else {
      // Decrypt: Fast⁻¹ → Medium⁻¹ → Slow⁻¹
      return [
        effectiveTwentiesWiring(PERM_TWENTIES_1, state.twentiesFast, true),
        effectiveTwentiesWiring(PERM_TWENTIES_2, state.twentiesMedium, true),
        effectiveTwentiesWiring(PERM_TWENTIES_3, state.twentiesSlow, true),
      ];
    }
  }, [state, isDecrypt]);

  // Active indices for diagrams
  const sixesActiveIndices = useMemo(() => {
    if (!trace || !trace.isSixes) return null;
    return trace.path; // [inputIdx, outputIdx]
  }, [trace]);

  const twentiesActiveIndices = useMemo(() => {
    if (!trace || trace.isSixes) return null;
    return trace.path; // [input, after1, after2, after3]
  }, [trace]);

  // Gap labels
  const twentiesGapLabels = useMemo(() => {
    if (!isDecrypt) return ['SLOW', 'MEDIUM', 'FAST'];
    return ['FAST⁻¹', 'MEDIUM⁻¹', 'SLOW⁻¹'];
  }, [isDecrypt]);

  // Key handling
  const handleKeyDown = useCallback((char: string) => {
    if (pressedKey) return;
    const upper = char.toUpperCase();
    if (!/^[A-Z]$/.test(upper)) return;
    if (!SIXES.includes(upper) && !TWENTIES.includes(upper)) return;

    setHistory(prev => [...prev, state]);
    const sig = traceSignal(upper, state, mode);
    setTrace(sig);
    setPressedKey(upper);
    setTape(prev => prev + sig.outputChar);
    setState(stepMachine(state));
  }, [state, pressedKey, mode]);

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
    setState({ sixesPos: 0, twentiesSlow: 0, twentiesMedium: 0, twentiesFast: 0 });
    setTrace(null);
    setPressedKey(null);
    setTape('');
    setHistory([]);
  };

  const adjustPos = (key: keyof MachineState, delta: number) => {
    const max = key === 'sixesPos' ? 6 : 20;
    setState(prev => ({ ...prev, [key]: mod(prev[key] + delta, max) }));
    setTrace(null);
  };

  return (
    <div className="flex-1 bg-[#121212] flex flex-col items-center px-4 py-8 text-slate-200">
      <div className="w-full max-w-6xl">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              PURPLE <span className="text-purple-400">WIRING EXPLORER</span>
            </h1>
            <p className="text-xs text-slate-500 font-mono tracking-widest">TYPE 97 — SPLIT-ALPHABET SWITCHING</p>
          </div>
          <button onClick={handleReset}
            className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-colors">
            <RotateCcw size={18} />
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => { setMode('encrypt'); setTrace(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              mode === 'encrypt' ? 'bg-purple-950/40 border border-purple-700/50 text-purple-400' : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-purple-400'
            }`}>
            <Lock size={16} /> Encrypt
          </button>
          <button onClick={() => { setMode('decrypt'); setTrace(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              mode === 'decrypt' ? 'bg-purple-950/40 border border-purple-700/50 text-purple-400' : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-purple-400'
            }`}>
            <Unlock size={16} /> Decrypt
          </button>
          <span className="text-xs text-slate-500 font-mono">
            {trace ? (trace.isSixes ? 'SIXES path (vowel)' : 'TWENTIES path (consonant)') : 'Press a key...'}
          </span>
        </div>

        {/* Switch Position Controls */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 mb-6">
          <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">Switch Positions</div>
          <div className="grid grid-cols-4 gap-4">
            {([
              { key: 'sixesPos' as const, label: 'SIXES', color: 'text-purple-400', max: 6 },
              { key: 'twentiesSlow' as const, label: 'SLOW', color: 'text-emerald-400', max: 20 },
              { key: 'twentiesMedium' as const, label: 'MEDIUM', color: 'text-emerald-400', max: 20 },
              { key: 'twentiesFast' as const, label: 'FAST', color: 'text-emerald-400', max: 20 },
            ]).map(({ key, label, color }) => (
              <div key={key} className="flex flex-col items-center">
                <div className={`text-[9px] font-bold ${color}`}>{label}</div>
                <div className="flex items-center gap-0.5 mt-1">
                  <button onClick={() => adjustPos(key, 1)} className="p-0.5 text-slate-600 hover:text-purple-400"><ChevronUp size={12} /></button>
                  <div className="w-8 h-9 bg-slate-800 border border-slate-600 rounded-lg flex items-center justify-center font-mono font-bold text-purple-400 text-lg">
                    {state[key]}
                  </div>
                  <button onClick={() => adjustPos(key, -1)} className="p-0.5 text-slate-600 hover:text-purple-400"><ChevronDown size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Split Alphabet Indicator */}
        <div className="flex gap-3 mb-4">
          <div className={`flex-1 rounded-lg border p-2 text-center text-xs font-mono transition-colors ${
            trace?.isSixes ? 'bg-purple-950/30 border-purple-700/50 text-purple-400' : 'bg-slate-900/40 border-slate-800 text-slate-600'
          }`}>
            SIXES (Vowels): {SIXES.join(' ')}
          </div>
          <div className={`flex-1 rounded-lg border p-2 text-center text-xs font-mono transition-colors ${
            trace && !trace.isSixes ? 'bg-emerald-950/30 border-emerald-700/50 text-emerald-400' : 'bg-slate-900/40 border-slate-800 text-slate-600'
          }`}>
            TWENTIES (Consonants): {TWENTIES.join(' ')}
          </div>
        </div>

        {/* Wiring Diagrams — side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Sixes wiring */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-3">
            <WiringPanel
              letters={SIXES}
              wirings={[sixesWiring]}
              gapLabels={['SIXES']}
              activeIndices={sixesActiveIndices}
              forwardColor="#a855f7"
              title="Sixes Path"
              titleColor="text-purple-400"
              columnOffsets={[state.sixesPos, 0]}
            />
          </div>

          {/* Twenties wiring */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-3">
            <WiringPanel
              letters={TWENTIES}
              wirings={twentiesWirings}
              gapLabels={twentiesGapLabels}
              activeIndices={twentiesActiveIndices}
              forwardColor="#10b981"
              title="Twenties Path"
              titleColor="text-emerald-400"
              columnOffsets={[state.twentiesSlow, state.twentiesMedium, state.twentiesFast, 0]}
            />
          </div>
        </div>

        {/* Signal Path Text */}
        {trace && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-1.5 font-mono text-sm flex-wrap">
              <span className={`font-bold ${trace.isSixes ? 'text-purple-400' : 'text-emerald-400'}`}>{trace.inputChar}</span>
              {trace.isSixes ? (
                <>
                  <span className="text-slate-600">→</span>
                  <span className="text-purple-400 text-[10px]">[SIXES]</span>
                </>
              ) : (
                <>
                  {twentiesGapLabels.map((label, i) => (
                    <React.Fragment key={i}>
                      <span className="text-slate-600">→</span>
                      <span className="text-emerald-400 text-[10px]">[{label}]</span>
                      <span className="text-emerald-300">{TWENTIES[trace.path[i + 1]]}</span>
                    </React.Fragment>
                  ))}
                </>
              )}
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
                      isActive ? (isSixesChar ? 'bg-purple-600 border-purple-500' : 'bg-emerald-600 border-emerald-500') + ' text-white scale-95' :
                      isOutput ? 'bg-amber-600/20 border-amber-500 text-amber-400' :
                      isSixesChar ? 'bg-slate-800 border-purple-900/50 text-purple-300/60 hover:bg-slate-700 hover:text-purple-300' :
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
            <div className="font-mono text-lg tracking-widest text-purple-400 break-all">
              {tape.match(/.{1,5}/g)?.join(' ')}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-5 text-xs text-slate-500 space-y-2">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">How the Purple Machine Works</div>
          <p>
            The <span className="text-white">Type 97</span> "Purple" machine split the alphabet into two groups:
            the <span className="text-purple-400">sixes</span> (vowels A, E, I, O, U, Y) encrypted by one switch, and
            the <span className="text-emerald-400">twenties</span> (all consonants) encrypted by three switches in series.
          </p>
          <p>
            The <span className="text-purple-400">sixes switch</span> applies a single permutation shifted by the switch position.
            The <span className="text-emerald-400">twenties path</span> chains three 20-point stepping switches
            (Slow → Medium → Fast) in an odometer arrangement: Fast steps every character, Medium steps when Fast wraps,
            Slow steps when Medium wraps.
          </p>
          <p>
            This split was the <span className="text-white">fatal weakness</span> — the sixes always encrypted to sixes,
            meaning vowel positions were preserved. American cryptanalysts (<span className="text-white">William Friedman</span>'s team)
            exploited this to break Purple in 1940, building an analog machine before ever seeing the original.
          </p>
          <p className="text-slate-600">
            Tip: Notice how vowels on the keyboard are tinted purple — they always go through the sixes path, never mixing with consonants.
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;
