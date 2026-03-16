import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Settings, RotateCcw, ChevronUp, ChevronDown } from 'lucide-react';
import { ROTOR_WIRINGS, REFLECTOR_WIRING, ALPHABET } from '../fialka/constants';

// ── Helpers ────────────────────────────────────────────────────────
const toIndex = (c: string) => c.charCodeAt(0) - 65;
const toChar = (i: number) => String.fromCharCode(((i % 26) + 26) % 26 + 65);
const mod = (n: number) => ((n % 26) + 26) % 26;

const KEYBOARD_LAYOUT = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

// ── SVG Layout ─────────────────────────────────────────────────────
// 11 columns (entry + 10 rotors), 10 gaps, plus reflector arcs
const NUM_COLS = 11;
const NUM_GAPS = 10;
const SVG_W = 1420;
const SVG_H = 640;
const MARGIN_X = 55;
const COL_SPACING = (SVG_W - 2 * MARGIN_X - 90) / NUM_GAPS; // ~127.5
const COL_X = Array.from({ length: NUM_COLS }, (_, i) => MARGIN_X + i * COL_SPACING);
const LETTER_Y0 = 55;
const LETTER_DY = 21;
const WIRE_PAD = 14;
const letterY = (i: number) => LETTER_Y0 + i * LETTER_DY;
const wireHue = (i: number) => (i * 360) / 26;

// ── Rotor math ─────────────────────────────────────────────────────
function getEffectiveWiring(wiring: string, reversed: boolean): string {
  if (!reversed) return wiring;
  const inv = new Array(26);
  for (let i = 0; i < 26; i++) {
    inv[ALPHABET.indexOf(wiring[i])] = ALPHABET[i];
  }
  return inv.join('');
}

function passForward(idx: number, wiring: string, position: number, ringSetting: number): number {
  const shifted = mod(idx + position - ringSetting);
  const outChar = wiring[shifted];
  return mod(ALPHABET.indexOf(outChar) - position + ringSetting);
}

function passBackward(idx: number, wiring: string, position: number, ringSetting: number): number {
  const shifted = mod(idx + position - ringSetting);
  const target = String.fromCharCode(shifted + 65);
  const inputIdx = wiring.indexOf(target);
  return mod(inputIdx - position + ringSetting);
}

function computeEffectiveWiring(wiring: string, reversed: boolean, position: number, ringSetting: number): number[] {
  const ew = getEffectiveWiring(wiring, reversed);
  return Array.from({ length: 26 }, (_, i) => passForward(i, ew, position, ringSetting));
}

function reflectorMapping(): number[] {
  return Array.from({ length: 26 }, (_, i) => REFLECTOR_WIRING.charCodeAt(i) - 65);
}

// ── Rotor state ────────────────────────────────────────────────────
interface RotorState {
  id: number;
  position: number;
  ringSetting: number;
  reversed: boolean;
}

function stepRotors(rotors: RotorState[]): RotorState[] {
  const newRotors = rotors.map(r => ({ ...r }));
  for (let i = 9; i >= 0; i--) {
    if (i === 9) {
      newRotors[i].position = (newRotors[i].position + 1) % 26;
    } else {
      const rightRotor = rotors[i + 1];
      const blockingPositions = ROTOR_WIRINGS[rightRotor.id].blocking;
      if (blockingPositions.includes(rightRotor.position)) {
        newRotors[i].position = (newRotors[i].position + 1) % 26;
      }
    }
  }
  return newRotors;
}

// ── Signal trace ───────────────────────────────────────────────────
interface SignalTrace {
  forward: number[];   // length 11: col 0 -> 10
  backward: number[];  // length 11: col 10 -> 0
  reflIn: number;
  reflOut: number;
  inputChar: string;
  outputChar: string;
}

function traceSignal(inputChar: string, rotors: RotorState[]): SignalTrace {
  let idx = toIndex(inputChar);
  const forward: number[] = [idx];

  // Forward through rotors 10 -> 1 (right to left, indices 9 -> 0)
  for (let i = 9; i >= 0; i--) {
    const ew = getEffectiveWiring(ROTOR_WIRINGS[rotors[i].id].wiring, rotors[i].reversed);
    idx = passForward(idx, ew, rotors[i].position, rotors[i].ringSetting);
    forward.push(idx);
  }

  const reflIn = idx;
  const reflOut = REFLECTOR_WIRING.charCodeAt(idx) - 65;
  idx = reflOut;

  const backward: number[] = [idx];
  // Reverse through rotors 1 -> 10 (left to right, indices 0 -> 9)
  for (let i = 0; i <= 9; i++) {
    const ew = getEffectiveWiring(ROTOR_WIRINGS[rotors[i].id].wiring, rotors[i].reversed);
    idx = passBackward(idx, ew, rotors[i].position, rotors[i].ringSetting);
    backward.push(idx);
  }

  return {
    forward,
    backward,
    reflIn,
    reflOut,
    inputChar,
    outputChar: toChar(idx),
  };
}

// ── Initial state ──────────────────────────────────────────────────
const createInitialRotors = (): RotorState[] =>
  Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    position: 0,
    ringSetting: 0,
    reversed: false,
  }));

// ════════════════════════════════════════════════════════════════════
const App: React.FC = () => {
  const [rotors, setRotors] = useState<RotorState[]>(createInitialRotors);
  const [history, setHistory] = useState<RotorState[][]>([]);
  const [trace, setTrace] = useState<SignalTrace | null>(null);
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const [tape, setTape] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // ── Computed wirings for each gap ──────────────────────────────
  // Gap 0 = leftmost rotor (id 1), ... gap 9 = rightmost rotor (id 10)
  // Columns: 0=after reflector (rotor 1 output), ... 10=ENTRY
  const wirings = useMemo(() =>
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i =>
      computeEffectiveWiring(
        ROTOR_WIRINGS[rotors[i].id].wiring,
        rotors[i].reversed,
        rotors[i].position,
        rotors[i].ringSetting,
      )
    ), [rotors]);

  const reflMap = useMemo(() => reflectorMapping(), []);

  // ── Active wire indices for each gap ──────────────────────────
  // Display gap g corresponds to rotor index g (0=rotor1, 9=rotor10)
  // forward trace goes right-to-left: forward[0]=entry at col 10, forward[10]=reflector side at col 0
  // So display gap g (between col g and col g+1) corresponds to trace gap (NUM_GAPS - 1 - g)
  const activeForward: [number, number][] | null = trace
    ? Array.from({ length: NUM_GAPS }, (_, g) => {
        const traceGap = NUM_GAPS - 1 - g;
        return [trace.forward[traceGap + 1], trace.forward[traceGap]] as [number, number];
      })
    : null;

  const activeReturn: [number, number][] | null = trace
    ? Array.from({ length: NUM_GAPS }, (_, g) => {
        const traceGap = NUM_GAPS - 1 - g;
        return [trace.backward[NUM_GAPS - 1 - traceGap], trace.backward[NUM_GAPS - traceGap]] as [number, number];
      })
    : null;

  // ── Highlighted letters ───────────────────────────────────────
  // Display col c maps to trace index (NUM_COLS - 1 - c)
  // Col NUM_COLS-1 = ENTRY (input/output), Col 0 = reflector side
  const highlights = useMemo(() => {
    const m = new Map<string, string>();
    if (!trace) return m;
    for (let c = 0; c < NUM_COLS; c++) {
      const traceIdx = NUM_COLS - 1 - c;
      m.set(`${c}-${trace.forward[traceIdx]}`, c === NUM_COLS - 1 ? 'input' : 'forward');
    }
    for (let c = 0; c < NUM_COLS; c++) {
      const traceIdx = NUM_COLS - 1 - c;
      const idx = trace.backward[NUM_COLS - 1 - traceIdx];
      const key = `${c}-${idx}`;
      if (!m.has(key)) m.set(key, c === NUM_COLS - 1 ? 'output' : 'return');
    }
    return m;
  }, [trace]);

  const hlColor = (type: string) => {
    switch (type) {
      case 'input': case 'forward': return '#f59e0b';
      case 'return': return '#06b6d4';
      case 'output': return '#10b981';
      default: return '#94a3b8';
    }
  };

  // ── Gap labels ────────────────────────────────────────────────
  // Gap 0 is leftmost rotor (rotor 1), gap 9 is rightmost (rotor 10)
  const gapRotorIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  // ── Key handling (trace persists between keypresses) ──────────
  const handleKeyDown = useCallback((char: string) => {
    if (pressedKey) return;
    setHistory(prev => [...prev, rotors]);
    const newRotors = stepRotors(rotors);
    const sig = traceSignal(char, newRotors);
    setTrace(sig);
    setPressedKey(char);
    setTape(prev => prev + sig.outputChar);
    setRotors(newRotors);
  }, [rotors, pressedKey]);

  const handleKeyUp = useCallback(() => {
    setPressedKey(null);
  }, []);

  const handleBackspace = useCallback(() => {
    if (history.length === 0) return;
    setRotors(history[history.length - 1]);
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

  // ── Config helpers ────────────────────────────────────────────
  const adjustPosition = (ri: number, d: number) => {
    const nr = [...rotors];
    nr[ri] = { ...nr[ri], position: mod(nr[ri].position + d) };
    setRotors(nr);
  };

  const adjustRing = (ri: number, d: number) => {
    const nr = [...rotors];
    nr[ri] = { ...nr[ri], ringSetting: mod(nr[ri].ringSetting + d) };
    setRotors(nr);
  };

  const toggleReversed = (ri: number) => {
    const nr = [...rotors];
    nr[ri] = { ...nr[ri], reversed: !nr[ri].reversed };
    setRotors(nr);
  };

  const setRotorId = (ri: number, id: number) => {
    const nr = [...rotors];
    nr[ri] = { ...nr[ri], id };
    setRotors(nr);
  };

  const handleReset = () => {
    setRotors(createInitialRotors());
    setHistory([]);
    setTape('');
    setTrace(null);
    setPressedKey(null);
  };

  return (
    <div className="flex-1 bg-slate-950 flex flex-col items-center px-4 py-8 text-slate-200">
      <div className="w-full max-w-6xl">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              FIALKA <span className="text-rose-400">WIRING EXPLORER</span>
            </h1>
            <p className="text-xs text-slate-500 font-mono tracking-widest">M-125 — 10 ROTORS + REFLECTOR</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleReset}
              className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Reset">
              <RotateCcw size={18} />
            </button>
            <button onClick={() => setShowSettings(!showSettings)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all border ${
                showSettings ? 'bg-rose-900/50 border-rose-700 text-rose-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}>
              <Settings size={16} /> CONFIG
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 mb-6 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {Array.from({ length: 10 }, (_, i) => {
                const ri = i; // display order: rotor 1 (leftmost) first
                const r = rotors[ri];
                return (
                  <div key={ri} className="space-y-2">
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Rotor {r.id}</div>
                    <select value={r.id}
                      onChange={e => setRotorId(ri, parseInt(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white font-mono">
                      {Array.from({ length: 10 }, (_, j) => j + 1).map(id => (
                        <option key={id} value={id}>R{id}</option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <div className="text-[9px] text-slate-600 mb-1">Pos</div>
                        <div className="flex items-center gap-0.5">
                          <button onClick={() => adjustPosition(ri, -1)} className="p-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:text-white"><ChevronDown size={10} /></button>
                          <div className="flex-1 text-center font-mono font-bold text-rose-400 text-xs">{toChar(r.position)}</div>
                          <button onClick={() => adjustPosition(ri, 1)} className="p-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:text-white"><ChevronUp size={10} /></button>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="text-[9px] text-slate-600 mb-1">Ring</div>
                        <div className="flex items-center gap-0.5">
                          <button onClick={() => adjustRing(ri, -1)} className="p-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:text-white"><ChevronDown size={10} /></button>
                          <div className="flex-1 text-center font-mono font-bold text-slate-300 text-xs">{toChar(r.ringSetting)}</div>
                          <button onClick={() => adjustRing(ri, 1)} className="p-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:text-white"><ChevronUp size={10} /></button>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleReversed(ri)}
                      className={`w-full text-[9px] px-2 py-1 rounded border font-bold transition-colors ${
                        r.reversed
                          ? 'bg-rose-900/40 border-rose-700 text-rose-300'
                          : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'
                      }`}>
                      {r.reversed ? 'REVERSED' : 'NORMAL'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Rotor Position Windows */}
        <div className="flex justify-center gap-2 sm:gap-3 mb-4 flex-wrap">
          {Array.from({ length: 10 }, (_, i) => {
            const ri = i; // display left to right: rotor 1 (leftmost) first
            const r = rotors[ri];
            return (
              <div key={ri} className="flex flex-col items-center">
                <div className="text-[8px] text-slate-600 font-bold uppercase">R{r.id}</div>
                <div className="flex items-center gap-0.5 mt-0.5">
                  <button onClick={() => adjustPosition(ri, 1)} className="p-0.5 text-slate-600 hover:text-rose-400 transition-colors"><ChevronUp size={12} /></button>
                  <div className="w-7 h-8 bg-slate-800 border border-slate-600 rounded-md flex items-center justify-center font-mono font-bold text-rose-400 text-sm">
                    {toChar(r.position)}
                  </div>
                  <button onClick={() => adjustPosition(ri, -1)} className="p-0.5 text-slate-600 hover:text-rose-400 transition-colors"><ChevronDown size={12} /></button>
                </div>
                <div className="text-[7px] text-slate-700 font-mono mt-0.5">
                  {r.reversed ? 'REV' : 'NOR'}
                </div>
              </div>
            );
          })}
        </div>

        {/* SVG Wiring Diagram */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-2 sm:p-3 mb-6 overflow-x-auto">
          <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full h-auto" style={{ minWidth: 800 }}>
            <defs>
              <filter id="glow-fwd" filterUnits="userSpaceOnUse">
                <feGaussianBlur stdDeviation="2.5" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="glow-ret" filterUnits="userSpaceOnUse">
                <feGaussianBlur stdDeviation="2.5" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="glow-refl" filterUnits="userSpaceOnUse">
                <feGaussianBlur stdDeviation="3" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* Column headers */}
            <text x={COL_X[NUM_COLS - 1]} y={18} textAnchor="middle" fill="#64748b" fontSize={10} fontWeight="bold" fontFamily="monospace">ENTRY</text>
            {Array.from({ length: 10 }, (_, c) => (
              <text key={c} x={COL_X[c]} y={18} textAnchor="middle" fill="#64748b" fontSize={9} fontWeight="bold" fontFamily="monospace" opacity={0.4}>
                {'·'}
              </text>
            ))}

            {/* Reflector label */}
            <text x={COL_X[0] - 40} y={18} textAnchor="end" fill="#7c3aed" fontSize={10} fontWeight="bold" fontFamily="monospace">
              UKW
            </text>

            {/* Gap slot labels */}
            {gapRotorIds.map((rotorId, g) => {
              const cx = (COL_X[g] + COL_X[g + 1]) / 2;
              const r = rotors[rotorId - 1]; // map to actual index
              return (
                <g key={`gap-lbl-${g}`}>
                  <text x={cx} y={33} textAnchor="middle" fill="#9f1239" fontSize={7} fontWeight="bold" fontFamily="monospace" opacity={0.7}>
                    R{rotorId}
                  </text>
                  <text x={cx} y={43} textAnchor="middle" fill="#be123c" fontSize={8} fontWeight="bold" fontFamily="monospace" opacity={0.4}>
                    {r.reversed ? 'REV' : toChar(r.position)}
                  </text>
                </g>
              );
            })}

            {/* Column letters */}
            {COL_X.map((cx, c) => (
              <g key={`col-${c}`}>
                {ALPHABET.split('').map((letter, i) => {
                  const hl = highlights.get(`${c}-${i}`);
                  const y = letterY(i);
                  return (
                    <g key={i}>
                      {hl && (
                        <circle cx={cx} cy={y} r={9}
                          fill={hlColor(hl)} fillOpacity={0.2}
                          stroke={hlColor(hl)} strokeWidth={1.5} strokeOpacity={0.6} />
                      )}
                      <text x={cx} y={y + 1} textAnchor="middle" dominantBaseline="central"
                        fontSize={11} fontWeight="bold" fontFamily="monospace"
                        fill={hl ? hlColor(hl) : '#475569'}>
                        {letter}
                      </text>
                    </g>
                  );
                })}
              </g>
            ))}

            {/* Gap wires */}
            {wirings.map((wiring, g) => {
              // Invert the wiring for display: signal enters from right col, exits at left col
              // wiring[inIdx] = outIdx (forward), so inverse: for each outIdx, find inIdx
              const invWiring = new Array(26);
              for (let i = 0; i < 26; i++) invWiring[wiring[i]] = i;

              const x1 = COL_X[g] + WIRE_PAD;
              const x2 = COL_X[g + 1] - WIRE_PAD;
              const cp = (x2 - x1) * 0.15;
              const fwIdx = activeForward ? activeForward[g][0] : -1;
              const rtIdx = activeReturn ? activeReturn[g][0] : -1;

              return (
                <g key={`gap-${g}`}>
                  {/* Background wires */}
                  {invWiring.map((rightIdx: number, leftIdx: number) => {
                    if (leftIdx === fwIdx || leftIdx === rtIdx) return null;
                    return (
                      <path key={leftIdx}
                        d={`M ${x1} ${letterY(leftIdx)} C ${x1 + cp} ${letterY(leftIdx)}, ${x2 - cp} ${letterY(rightIdx)}, ${x2} ${letterY(rightIdx)}`}
                        stroke={`hsla(${wireHue(rightIdx)}, 40%, 45%, ${trace ? 0.04 : 0.13})`}
                        strokeWidth={1} fill="none" />
                    );
                  })}

                  {/* Active forward wire */}
                  {activeForward && (() => {
                    const [inI, outI] = activeForward[g];
                    return (
                      <path
                        d={`M ${x1} ${letterY(inI)} C ${x1 + cp} ${letterY(inI)}, ${x2 - cp} ${letterY(outI)}, ${x2} ${letterY(outI)}`}
                        stroke="#f59e0b" strokeWidth={2.5} fill="none" filter="url(#glow-fwd)" />
                    );
                  })()}

                  {/* Active return wire */}
                  {activeReturn && (() => {
                    const [inI, outI] = activeReturn[g];
                    return (
                      <path
                        d={`M ${x1} ${letterY(inI)} C ${x1 + cp} ${letterY(inI)}, ${x2 - cp} ${letterY(outI)}, ${x2} ${letterY(outI)}`}
                        stroke="#06b6d4" strokeWidth={2.5} fill="none" filter="url(#glow-ret)" />
                    );
                  })()}

                  {/* Gap watermark number */}
                  <text x={(COL_X[g] + COL_X[g + 1]) / 2} y={SVG_H / 2 + 15}
                    textAnchor="middle" dominantBaseline="central"
                    fontSize={40} fontWeight="bold" fontFamily="monospace"
                    fill="rgba(100, 116, 139, 0.03)">
                    {g + 1}
                  </text>
                </g>
              );
            })}

            {/* Reflector arcs */}
            {(() => {
              const x = COL_X[0] - WIRE_PAD;
              const drawn = new Set<number>();
              return reflMap.map((outIdx, inIdx) => {
                if (drawn.has(inIdx)) return null;
                drawn.add(inIdx);
                drawn.add(outIdx);
                const y1 = letterY(inIdx);
                const y2 = letterY(outIdx);
                const dist = Math.abs(outIdx - inIdx);
                const bulge = 12 + dist * 2.8;
                const isActive = trace && (
                  (trace.reflIn === inIdx && trace.reflOut === outIdx) ||
                  (trace.reflIn === outIdx && trace.reflOut === inIdx)
                );
                return (
                  <path key={inIdx}
                    d={`M ${x} ${y1} C ${x - bulge} ${y1}, ${x - bulge} ${y2}, ${x} ${y2}`}
                    stroke={isActive ? '#a78bfa' : `rgba(100, 116, 139, ${trace ? 0.04 : 0.1})`}
                    strokeWidth={isActive ? 2.5 : 1} fill="none"
                    filter={isActive ? 'url(#glow-refl)' : undefined} />
                );
              });
            })()}

            {/* Input / Output indicators */}
            {trace && (
              <g>
                {/* Input arrow & label (entry is at col NUM_COLS-1, rightmost) */}
                <polygon
                  points={`${COL_X[NUM_COLS - 1] + WIRE_PAD + 6},${letterY(trace.forward[0]) - 4} ${COL_X[NUM_COLS - 1] + WIRE_PAD + 6},${letterY(trace.forward[0]) + 4} ${COL_X[NUM_COLS - 1] + WIRE_PAD},${letterY(trace.forward[0])}`}
                  fill="#f59e0b" />
                <text x={COL_X[NUM_COLS - 1] + WIRE_PAD + 10} y={letterY(trace.forward[0]) + 1}
                  textAnchor="start" dominantBaseline="central"
                  fontSize={13} fontWeight="bold" fontFamily="monospace" fill="#f59e0b">
                  {trace.inputChar}
                </text>

                {/* Output arrow & label (returns to rightmost column) */}
                <polygon
                  points={`${COL_X[NUM_COLS - 1] + WIRE_PAD},${letterY(trace.backward[NUM_GAPS]) - 4} ${COL_X[NUM_COLS - 1] + WIRE_PAD},${letterY(trace.backward[NUM_GAPS]) + 4} ${COL_X[NUM_COLS - 1] + WIRE_PAD + 6},${letterY(trace.backward[NUM_GAPS])}`}
                  fill="#10b981" />
                <text x={COL_X[NUM_COLS - 1] + WIRE_PAD + 10} y={letterY(trace.backward[NUM_GAPS]) + 1}
                  textAnchor="start" dominantBaseline="central"
                  fontSize={13} fontWeight="bold" fontFamily="monospace" fill="#10b981">
                  {trace.outputChar}
                </text>
              </g>
            )}

            {/* Legend */}
            <g transform={`translate(12, ${SVG_H - 18})`}>
              <circle cx={0} cy={0} r={4} fill="#f59e0b" />
              <text x={8} y={1} dominantBaseline="central" fontSize={9} fill="#64748b" fontFamily="monospace">Forward</text>
              <circle cx={75} cy={0} r={4} fill="#06b6d4" />
              <text x={83} y={1} dominantBaseline="central" fontSize={9} fill="#64748b" fontFamily="monospace">Return</text>
              <circle cx={140} cy={0} r={4} fill="#a78bfa" />
              <text x={148} y={1} dominantBaseline="central" fontSize={9} fill="#64748b" fontFamily="monospace">Reflector</text>
              <circle cx={225} cy={0} r={4} fill="#10b981" />
              <text x={233} y={1} dominantBaseline="central" fontSize={9} fill="#64748b" fontFamily="monospace">Output</text>
            </g>

            {/* "Press a key" prompt */}
            {!trace && (
              <text x={SVG_W / 2} y={SVG_H / 2 + 15}
                textAnchor="middle" dominantBaseline="central"
                fontSize={14} fill="#334155" fontFamily="monospace">
                Press a key to trace the signal through 10 rotors...
              </text>
            )}
          </svg>
        </div>

        {/* Signal Path Text */}
        {trace && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 mb-6">
            <div className="flex flex-wrap items-center gap-1 font-mono text-sm">
              <span className="text-amber-400 font-bold">{trace.inputChar}</span>
              {trace.forward.slice(1).map((idx, i) => (
                <React.Fragment key={`f${i}`}>
                  <span className="text-slate-600">→</span>
                  <span className="text-rose-400/60 text-[9px]">[R{10 - i}]</span>
                  <span className="text-amber-300">{toChar(idx)}</span>
                </React.Fragment>
              ))}
              <span className="text-slate-600">→</span>
              <span className="text-violet-400 font-bold text-[10px]">[UKW]</span>
              <span className="text-violet-400 font-bold">{toChar(trace.reflOut)}</span>
              {trace.backward.slice(1).map((idx, i) => (
                <React.Fragment key={`b${i}`}>
                  <span className="text-slate-600">→</span>
                  <span className="text-cyan-300">{toChar(idx)}</span>
                </React.Fragment>
              ))}
              <span className="text-slate-600">→</span>
              <span className="text-emerald-400 font-bold text-lg">{trace.outputChar}</span>
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
                return (
                  <button key={char}
                    onMouseDown={e => { e.preventDefault(); handleKeyDown(char); }}
                    onMouseUp={e => { e.preventDefault(); handleKeyUp(); }}
                    onMouseLeave={() => { if (isActive) handleKeyUp(); }}
                    onTouchStart={e => { e.preventDefault(); handleKeyDown(char); }}
                    onTouchEnd={e => { e.preventDefault(); handleKeyUp(); }}
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg border-2 flex items-center justify-center
                      text-base sm:text-lg font-mono font-bold transition-all ${
                      isActive ? 'bg-rose-600 border-rose-500 text-white scale-95' :
                      isOutput ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400' :
                      'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}>
                    {char}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Output Tape */}
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
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">About the Fialka M-125</div>
          <p>
            The <span className="text-white">Fialka</span> (Russian for "violet") was a Soviet electromechanical
            cipher machine developed in the 1950s and used by all Warsaw Pact nations through the 1990s. It was
            one of the most complex rotor machines ever built, far surpassing the Enigma in sophistication.
          </p>
          <p>
            With <span className="text-rose-400">10 rotors</span>, each of which could be inserted forward or
            reversed, the Fialka's internal wiring creates an enormous keyspace. The signal travels right-to-left
            through all 10 rotors (shown in <span className="text-amber-400">amber</span>), bounces off the
            <span className="text-violet-400"> reflector</span>, then returns left-to-right through all 10 rotors
            (shown in <span className="text-cyan-400">cyan</span>).
          </p>
          <p>
            The <span className="text-white">blocking pin mechanism</span> creates irregular stepping patterns —
            unlike Enigma's odometer-like stepping, each Fialka rotor has 5 blocking positions that determine
            whether the adjacent rotor advances. This makes the rotor motion far harder to predict.
          </p>
          <p className="text-slate-600">
            Tip: Open CONFIG to change rotor selections, positions, ring settings, and reverse individual rotors.
            Watch how the wiring diagram shifts with each keypress as the rotors step.
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;
