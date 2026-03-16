import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Settings, RotateCcw, ChevronUp, ChevronDown } from 'lucide-react';
import { RotorType, ReflectorType, RotorConfig, MachineState } from '../enigma-m4/types';
import { ROTOR_DATA, REFLECTOR_DATA, ALPHABET } from '../enigma-m4/constants';

// ── Helpers ────────────────────────────────────────────────────────
const toIndex = (c: string) => c.charCodeAt(0) - 65;
const toChar = (i: number) => String.fromCharCode(((i % 26) + 26) % 26 + 65);
const mod = (n: number) => ((n % 26) + 26) % 26;

const KEYBOARD_LAYOUT = ['QWERTZUIO', 'ASDFGHJK', 'PYXCVBNML'];

// ── SVG Layout ─────────────────────────────────────────────────────
const SVG_W = 920;
const SVG_H = 640;
const COL_X = [140, 300, 460, 620, 780];
const LETTER_Y0 = 55;
const LETTER_DY = 21;
const WIRE_PAD = 16;
const letterY = (i: number) => LETTER_Y0 + i * LETTER_DY;

// ── Rotor math ─────────────────────────────────────────────────────
function passForward(idx: number, rotor: RotorConfig): number {
  const shift = rotor.position - rotor.ringSetting;
  const pin = mod(idx + shift);
  const contact = ROTOR_DATA[rotor.type].wiring.charCodeAt(pin) - 65;
  return mod(contact - shift);
}

function passBackward(idx: number, rotor: RotorConfig): number {
  const shift = rotor.position - rotor.ringSetting;
  const pin = mod(idx + shift);
  const target = String.fromCharCode(pin + 65);
  const inputIdx = ROTOR_DATA[rotor.type].wiring.indexOf(target);
  return mod(inputIdx - shift);
}

function effectiveWiring(rotor: RotorConfig): number[] {
  return Array.from({ length: 26 }, (_, i) => passForward(i, rotor));
}

function reflectorMapping(type: ReflectorType): number[] {
  const w = REFLECTOR_DATA[type];
  return Array.from({ length: 26 }, (_, i) => w.charCodeAt(i) - 65);
}

function stepRotors(rotors: MachineState['rotors']): void {
  const [, left, mid, right] = rotors;
  const rightNotch = ROTOR_DATA[right.type].notch.includes(toChar(right.position));
  const midNotch = ROTOR_DATA[mid.type].notch.includes(toChar(mid.position));
  right.position = (right.position + 1) % 26;
  if (rightNotch || midNotch) mid.position = (mid.position + 1) % 26;
  if (midNotch) left.position = (left.position + 1) % 26;
}

function cloneState(s: MachineState): MachineState {
  return { ...s, rotors: s.rotors.map(r => ({ ...r })) as MachineState['rotors'], plugboard: { ...s.plugboard } };
}

// ── Signal trace ───────────────────────────────────────────────────
interface SignalTrace {
  forward: number[];   // length 5: col 0→4
  backward: number[];  // length 5: col 4→0
  reflIn: number;
  reflOut: number;
  inputChar: string;
  outputChar: string;
  pbIn: string | null;
  pbOut: string | null;
}

function traceSignal(inputChar: string, state: MachineState): SignalTrace {
  let ch = inputChar;
  const pbIn = state.plugboard[ch] || null;
  if (pbIn) ch = pbIn;

  let idx = toIndex(ch);
  const forward: number[] = [idx];
  for (const ri of [3, 2, 1, 0]) {
    idx = passForward(idx, state.rotors[ri]);
    forward.push(idx);
  }

  const reflIn = idx;
  const reflOut = REFLECTOR_DATA[state.reflector].charCodeAt(idx) - 65;
  idx = reflOut;

  const backward: number[] = [idx];
  for (const ri of [0, 1, 2, 3]) {
    idx = passBackward(idx, state.rotors[ri]);
    backward.push(idx);
  }

  let outChar = toChar(idx);
  const pbOut = state.plugboard[outChar] || null;
  if (pbOut) outChar = pbOut;

  return { forward, backward, reflIn, reflOut, inputChar, outputChar: outChar, pbIn, pbOut };
}

// ── Wire color by index ────────────────────────────────────────────
const wireHue = (i: number) => (i * 360) / 26;

// ── Initial state ──────────────────────────────────────────────────
const createInitialState = (): MachineState => ({
  rotors: [
    { type: RotorType.Beta, wiring: ROTOR_DATA[RotorType.Beta].wiring, notch: '', position: 0, ringSetting: 0 },
    { type: RotorType.III, wiring: ROTOR_DATA[RotorType.III].wiring, notch: ROTOR_DATA[RotorType.III].notch, position: 0, ringSetting: 0 },
    { type: RotorType.II, wiring: ROTOR_DATA[RotorType.II].wiring, notch: ROTOR_DATA[RotorType.II].notch, position: 0, ringSetting: 0 },
    { type: RotorType.I, wiring: ROTOR_DATA[RotorType.I].wiring, notch: ROTOR_DATA[RotorType.I].notch, position: 0, ringSetting: 0 },
  ],
  reflector: ReflectorType.B_Thin,
  plugboard: {},
});

// ════════════════════════════════════════════════════════════════════
const App: React.FC = () => {
  const [state, setState] = useState<MachineState>(createInitialState);
  const [history, setHistory] = useState<MachineState[]>([]);
  const [trace, setTrace] = useState<SignalTrace | null>(null);
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const [tape, setTape] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [plugboardText, setPlugboardText] = useState('');

  // ── Computed wirings ────────────────────────────────────────────
  // Physical layout: GREEK(0) on left, RIGHT(3) on right
  const wirings = useMemo(() => [
    effectiveWiring(state.rotors[0]),
    effectiveWiring(state.rotors[1]),
    effectiveWiring(state.rotors[2]),
    effectiveWiring(state.rotors[3]),
  ], [state.rotors]);

  const reflMap = useMemo(() => reflectorMapping(state.reflector), [state.reflector]);

  // ── Active wire indices ─────────────────────────────────────────
  // Physical layout (L→R): GREEK(gap0), LEFT(gap1), MIDDLE(gap2), RIGHT(gap3)
  // Columns (L→R): col0(refl side), col1, col2, col3, col4(entry)
  // Forward signal: entry(col4) → RIGHT(gap3) → MID(gap2) → LEFT(gap1) → GREEK(gap0) → reflector
  // forward[0]=entry(col4), forward[1]=afterRIGHT(col3), forward[2]=afterMID(col2), forward[3]=afterLEFT(col1), forward[4]=afterGREEK(col0)
  // Active wire = [leftColIdx, rightColIdx] for each gap
  const activeForward: [number, number][] | null = trace ? [
    [trace.forward[4], trace.forward[3]],  // gap0(GREEK): col0=forward[4], col1=forward[3]
    [trace.forward[3], trace.forward[2]],  // gap1(LEFT):  col1=forward[3], col2=forward[2]
    [trace.forward[2], trace.forward[1]],  // gap2(MID):   col2=forward[2], col3=forward[1]
    [trace.forward[1], trace.forward[0]],  // gap3(RIGHT): col3=forward[1], col4=forward[0]
  ] : null;

  // Return signal: reflector → GREEK(gap0) → LEFT(gap1) → MID(gap2) → RIGHT(gap3) → entry
  // backward[0]=afterRefl(col0), backward[1]=afterGREEKinv(col1), backward[2]=afterLEFTinv(col2), backward[3]=afterMIDinv(col3), backward[4]=afterRIGHTinv(col4)
  const activeReturn: [number, number][] | null = trace ? [
    [trace.backward[0], trace.backward[1]],  // gap0: col0→col1
    [trace.backward[1], trace.backward[2]],  // gap1: col1→col2
    [trace.backward[2], trace.backward[3]],  // gap2: col2→col3
    [trace.backward[3], trace.backward[4]],  // gap3: col3→col4
  ] : null;

  // ── Highlighted letters at each column ──────────────────────────
  // Physical layout: col 0=reflector side (GREEK), col 4=entry side (RIGHT)
  // forward[0]=entry(col4), forward[1]=afterRIGHT(col3), forward[2]=afterMID(col2), forward[3]=afterLEFT(col1), forward[4]=afterGREEK(col0)
  // backward[0]=afterRefl(col0), backward[1]=afterGREEKinv(col1), backward[2]=afterLEFTinv(col2), backward[3]=afterMIDinv(col3), backward[4]=afterRIGHTinv(col4)
  const highlights = useMemo(() => {
    if (!trace) return new Map<string, string>();
    const m = new Map<string, string>();
    // Forward: signal goes right→left (col4→col0)
    for (let i = 0; i < 5; i++) {
      const col = 4 - i; // forward[0]→col4(entry), forward[4]→col0(greek out)
      m.set(`${col}-${trace.forward[i]}`, col === 4 ? 'input' : 'forward');
    }
    // Return: signal goes left→right (col0→col4)
    for (let i = 0; i < 5; i++) {
      const col = i; // backward[0]→col0, backward[4]→col4(output)
      const key = `${col}-${trace.backward[i]}`;
      if (!m.has(key)) m.set(key, col === 4 ? 'output' : 'return');
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

  // ── Key handling ────────────────────────────────────────────────
  // Trace persists until the NEXT key is pressed (not cleared on key up)
  const handleKeyDown = useCallback((char: string) => {
    if (pressedKey) return;
    setHistory(prev => [...prev, state]);
    const ns = cloneState(state);
    stepRotors(ns.rotors);
    const sig = traceSignal(char, ns);
    setTrace(sig);
    setPressedKey(char);
    setTape(prev => prev + sig.outputChar);
    setState(ns);
  }, [state, pressedKey]);

  const handleKeyUp = useCallback(() => {
    // Keep trace visible — only clear pressedKey so next key can fire
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

  // ── Config helpers ──────────────────────────────────────────────
  const adjustPosition = (ri: number, d: number) => {
    const rs = [...state.rotors] as MachineState['rotors'];
    rs[ri] = { ...rs[ri], position: mod(rs[ri].position + d) };
    setState({ ...state, rotors: rs });
  };

  const adjustRing = (ri: number, d: number) => {
    const rs = [...state.rotors] as MachineState['rotors'];
    rs[ri] = { ...rs[ri], ringSetting: mod(rs[ri].ringSetting + d) };
    setState({ ...state, rotors: rs });
  };

  const setRotorType = (ri: number, type: RotorType) => {
    const d = ROTOR_DATA[type];
    const rs = [...state.rotors] as MachineState['rotors'];
    rs[ri] = { ...rs[ri], type, wiring: d.wiring, notch: d.notch };
    setState({ ...state, rotors: rs });
  };

  const applyPlugboard = (text: string) => {
    setPlugboardText(text);
    const pb: Record<string, string> = {};
    const pairs = text.toUpperCase().split(/[\s,]+/).filter(p => p.length === 2 && /^[A-Z]{2}$/.test(p));
    for (const pair of pairs) {
      const [a, b] = pair.split('');
      if (!pb[a] && !pb[b] && a !== b) { pb[a] = b; pb[b] = a; }
    }
    setState(prev => ({ ...prev, plugboard: pb }));
  };

  const handleReset = () => {
    setState(createInitialState());
    setHistory([]);
    setTape('');
    setTrace(null);
    setPressedKey(null);
    setPlugboardText('');
  };

  // Gap labels — physical order: GREEK, LEFT, MIDDLE, RIGHT
  const gapRotorNames = [
    state.rotors[0].type,
    state.rotors[1].type,
    state.rotors[2].type,
    state.rotors[3].type,
  ];
  const gapSlotNames = ['GREEK', 'LEFT', 'MIDDLE', 'RIGHT'];

  return (
    <div className="flex-1 bg-slate-950 flex flex-col items-center px-4 py-8 text-slate-200">
      <div className="w-full max-w-5xl">

        {/* ── Header ──────────────────────────────────────────── */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              ENIGMA <span className="text-amber-500">WIRING EXPLORER</span>
            </h1>
            <p className="text-xs text-slate-500 font-mono tracking-widest">M4 KRIEGSMARINE — INTERACTIVE SIGNAL TRACER</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleReset}
              className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Reset">
              <RotateCcw size={18} />
            </button>
            <button onClick={() => setShowSettings(!showSettings)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all border ${
                showSettings ? 'bg-amber-900/50 border-amber-700 text-amber-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}>
              <Settings size={16} /> CONFIG
            </button>
          </div>
        </div>

        {/* ── Settings Panel ──────────────────────────────────── */}
        {showSettings && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 mb-6 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { idx: 0, label: 'GREEK (4th)', types: [RotorType.Beta, RotorType.Gamma] },
                { idx: 1, label: 'LEFT (3rd)', types: [RotorType.I, RotorType.II, RotorType.III, RotorType.IV, RotorType.V, RotorType.VI, RotorType.VII, RotorType.VIII] },
                { idx: 2, label: 'MIDDLE (2nd)', types: [RotorType.I, RotorType.II, RotorType.III, RotorType.IV, RotorType.V, RotorType.VI, RotorType.VII, RotorType.VIII] },
                { idx: 3, label: 'RIGHT (1st)', types: [RotorType.I, RotorType.II, RotorType.III, RotorType.IV, RotorType.V, RotorType.VI, RotorType.VII, RotorType.VIII] },
              ].map(slot => (
                <div key={slot.idx} className="space-y-2">
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{slot.label}</div>
                  <select value={state.rotors[slot.idx].type}
                    onChange={e => setRotorType(slot.idx, e.target.value as RotorType)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
                    {slot.types.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <div className="text-[9px] text-slate-600 mb-1">Position</div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => adjustPosition(slot.idx, -1)} className="p-1 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:text-white"><ChevronDown size={12} /></button>
                        <div className="flex-1 text-center font-mono font-bold text-amber-400">{toChar(state.rotors[slot.idx].position)}</div>
                        <button onClick={() => adjustPosition(slot.idx, 1)} className="p-1 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:text-white"><ChevronUp size={12} /></button>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="text-[9px] text-slate-600 mb-1">Ring</div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => adjustRing(slot.idx, -1)} className="p-1 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:text-white"><ChevronDown size={12} /></button>
                        <div className="flex-1 text-center font-mono font-bold text-slate-300">{toChar(state.rotors[slot.idx].ringSetting)}</div>
                        <button onClick={() => adjustRing(slot.idx, 1)} className="p-1 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:text-white"><ChevronUp size={12} /></button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-800">
              <div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Reflector</div>
                <select value={state.reflector}
                  onChange={e => setState({ ...state, reflector: e.target.value as ReflectorType })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
                  <option value={ReflectorType.B_Thin}>UKW-B (thin)</option>
                  <option value={ReflectorType.C_Thin}>UKW-C (thin)</option>
                </select>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Plugboard (Stecker)</div>
                <input type="text" value={plugboardText}
                  onChange={e => applyPlugboard(e.target.value)}
                  placeholder="e.g. AB CD EF GH IJ"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate-600" />
                <div className="text-[9px] text-slate-600 mt-1">Enter letter pairs separated by spaces (max 13 pairs)</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Rotor Position Windows ──────────────────────────── */}
        <div className="flex justify-center gap-6 sm:gap-10 mb-4">
          {[
            { idx: 0, label: 'Greek' },
            { idx: 1, label: 'Left' },
            { idx: 2, label: 'Mid' },
            { idx: 3, label: 'Right' },
          ].map(({ idx, label }) => (
            <div key={idx} className="flex flex-col items-center">
              <div className="text-[9px] text-slate-600 font-bold uppercase">{label}</div>
              <div className="text-[10px] text-amber-700 font-mono">{state.rotors[idx].type}</div>
              <div className="flex items-center gap-0.5 mt-1">
                <button onClick={() => adjustPosition(idx, 1)} className="p-0.5 text-slate-600 hover:text-amber-400 transition-colors"><ChevronUp size={14} /></button>
                <div className="w-8 h-9 bg-slate-800 border border-slate-600 rounded-lg flex items-center justify-center font-mono font-bold text-amber-400 text-lg">
                  {toChar(state.rotors[idx].position)}
                </div>
                <button onClick={() => adjustPosition(idx, -1)} className="p-0.5 text-slate-600 hover:text-amber-400 transition-colors"><ChevronDown size={14} /></button>
              </div>
              <div className="text-[8px] text-slate-700 font-mono mt-0.5">Ring {toChar(state.rotors[idx].ringSetting)}</div>
            </div>
          ))}
        </div>

        {/* ── SVG Wiring Diagram ──────────────────────────────── */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-2 sm:p-3 mb-6 overflow-x-auto">
          <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full h-auto" style={{ minWidth: 600 }}>
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

            {/* Column headers — physical layout: reflector on left, entry on right */}
            {[0, 1, 2, 3].map(c => (
              <text key={c} x={COL_X[c]} y={20} textAnchor="middle" fill="#64748b" fontSize={9} fontWeight="bold" fontFamily="monospace" opacity={0.5}>
                {'•'}
              </text>
            ))}
            <text x={COL_X[4]} y={20} textAnchor="middle" fill="#64748b" fontSize={10} fontWeight="bold" fontFamily="monospace">ENTRY</text>

            {/* Reflector label — on the left */}
            <text x={COL_X[0] - 40} y={20} textAnchor="end" fill="#7c3aed" fontSize={10} fontWeight="bold" fontFamily="monospace">
              UKW-{state.reflector === ReflectorType.B_Thin ? 'B' : 'C'}
            </text>

            {/* Gap slot labels */}
            {gapSlotNames.map((name, g) => {
              const cx = (COL_X[g] + COL_X[g + 1]) / 2;
              return (
                <g key={`gap-label-${g}`}>
                  <text x={cx} y={32} textAnchor="middle" fill="#92400e" fontSize={8} fontWeight="bold" fontFamily="monospace" opacity={0.7}>
                    {name}
                  </text>
                  <text x={cx} y={42} textAnchor="middle" fill="#b45309" fontSize={9} fontWeight="bold" fontFamily="monospace" opacity={0.5}>
                    {gapRotorNames[g]}
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

            {/* Gap wires — invert wirings for display since signal flows R→L but beziers draw L→R */}
            {wirings.map(w => {
              const inv = new Array(26);
              for (let i = 0; i < 26; i++) inv[w[i]] = i;
              return inv;
            }).map((wiring, g) => {
              const x1 = COL_X[g] + WIRE_PAD;
              const x2 = COL_X[g + 1] - WIRE_PAD;
              const cp = (x2 - x1) * 0.15;
              const fwIdx = activeForward ? activeForward[g][0] : -1;
              const rtIdx = activeReturn ? activeReturn[g][0] : -1;

              return (
                <g key={`gap-${g}`}>
                  {/* Background wires */}
                  {wiring.map((outIdx, inIdx) => {
                    if (inIdx === fwIdx || inIdx === rtIdx) return null;
                    const y1 = letterY(inIdx);
                    const y2 = letterY(outIdx);
                    return (
                      <path key={inIdx}
                        d={`M ${x1} ${y1} C ${x1 + cp} ${y1}, ${x2 - cp} ${y2}, ${x2} ${y2}`}
                        stroke={`hsla(${wireHue(inIdx)}, 40%, 45%, ${trace ? 0.04 : 0.13})`}
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
                    fontSize={60} fontWeight="bold" fontFamily="monospace"
                    fill="rgba(100, 116, 139, 0.04)">
                    {g + 1}
                  </text>
                </g>
              );
            })}

            {/* Reflector arcs — on the left side (col 0) */}
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

            {/* Input / Output indicators — on the right side (col 4 = ENTRY) */}
            {trace && (
              <g>
                {/* Input arrow & label */}
                <polygon
                  points={`${COL_X[4] + WIRE_PAD + 6},${letterY(trace.forward[0]) - 4} ${COL_X[4] + WIRE_PAD + 6},${letterY(trace.forward[0]) + 4} ${COL_X[4] + WIRE_PAD},${letterY(trace.forward[0])}`}
                  fill="#f59e0b" />
                <text x={COL_X[4] + WIRE_PAD + 10} y={letterY(trace.forward[0]) + 1}
                  textAnchor="start" dominantBaseline="central"
                  fontSize={13} fontWeight="bold" fontFamily="monospace" fill="#f59e0b">
                  {trace.inputChar}
                </text>
                {trace.pbIn && (
                  <text x={COL_X[4] + WIRE_PAD + 10} y={letterY(trace.forward[0]) + 13}
                    textAnchor="start" dominantBaseline="central"
                    fontSize={8} fontFamily="monospace" fill="#ec4899">
                    PB→{trace.pbIn}
                  </text>
                )}

                {/* Output arrow & label */}
                <polygon
                  points={`${COL_X[4] + WIRE_PAD},${letterY(trace.backward[4]) - 4} ${COL_X[4] + WIRE_PAD},${letterY(trace.backward[4]) + 4} ${COL_X[4] + WIRE_PAD + 6},${letterY(trace.backward[4])}`}
                  fill="#10b981" />
                <text x={COL_X[4] + WIRE_PAD + 10} y={letterY(trace.backward[4]) + 1}
                  textAnchor="start" dominantBaseline="central"
                  fontSize={13} fontWeight="bold" fontFamily="monospace" fill="#10b981">
                  {trace.outputChar}
                </text>
                {trace.pbOut && (
                  <text x={COL_X[4] + WIRE_PAD + 10} y={letterY(trace.backward[4]) - 11}
                    textAnchor="start" dominantBaseline="central"
                    fontSize={8} fontFamily="monospace" fill="#ec4899">
                    PB→{trace.pbOut}
                  </text>
                )}
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
                Press a key to trace the signal...
              </text>
            )}
          </svg>
        </div>

        {/* ── Signal Path Text ────────────────────────────────── */}
        {trace && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 mb-6">
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-sm">
              <span className="text-amber-400 font-bold">{trace.inputChar}</span>
              {trace.pbIn && (
                <><span className="text-slate-600">→</span><span className="text-pink-400 text-[10px]">[PB]</span><span className="text-amber-400">{trace.pbIn}</span></>
              )}
              {trace.forward.slice(1).map((idx, i) => (
                <React.Fragment key={`f${i}`}>
                  <span className="text-slate-600">→</span>
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
              {trace.pbOut && (
                <><span className="text-slate-600">→</span><span className="text-pink-400 text-[10px]">[PB]</span></>
              )}
              <span className="text-slate-600">→</span>
              <span className="text-emerald-400 font-bold text-lg">{trace.outputChar}</span>
            </div>
          </div>
        )}

        {/* ── Plugboard Display ────────────────────────────────── */}
        {Object.keys(state.plugboard).length > 0 && (
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 mb-6">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Plugboard (Steckerbrett)</div>
            <div className="flex flex-wrap gap-2">
              {(() => {
                const shown = new Set<string>();
                return Object.entries(state.plugboard).map(([a, b]) => {
                  if (shown.has(a)) return null;
                  shown.add(a); shown.add(b);
                  const active = trace && (trace.inputChar === a || trace.inputChar === b || trace.outputChar === a || trace.outputChar === b);
                  return (
                    <div key={a} className={`px-2 py-1 rounded-lg text-sm font-mono font-bold border ${
                      active ? 'bg-pink-950/30 border-pink-800 text-pink-400' : 'bg-slate-800/50 border-slate-700 text-slate-400'
                    }`}>
                      {a} ↔ {b}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* ── Keyboard ────────────────────────────────────────── */}
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
                      isActive ? 'bg-amber-600 border-amber-500 text-white scale-95' :
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

        {/* ── Output Tape ─────────────────────────────────────── */}
        {tape && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 mb-6">
            <div className="flex justify-between items-center mb-2">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Output Tape</div>
              <button onClick={() => { setTape(''); setHistory([]); }}
                className="text-xs text-slate-500 hover:text-red-400 transition-colors">Clear</button>
            </div>
            <div className="font-mono text-lg tracking-widest text-amber-400 break-all">
              {tape.match(/.{1,5}/g)?.join(' ')}
            </div>
          </div>
        )}

        {/* ── How it works ────────────────────────────────────── */}
        <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-5 text-xs text-slate-500 space-y-2">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">How to Read the Wiring Diagram</div>
          <p>
            Inspired by the <span className="text-white">Pringles Can Enigma</span> teaching model, this diagram shows the M4 Enigma
            "unrolled" flat. Each column of A–Z represents a set of 26 electrical contacts. The colored curves between
            columns show how each rotor's internal wiring scrambles the signal.
          </p>
          <p>
            Press any key (or click the on-screen keyboard) to see the <span className="text-amber-400">forward path</span> (amber)
            travel left-to-right through each rotor, bounce off the <span className="text-violet-400">reflector</span> (purple arcs),
            then trace the <span className="text-cyan-400">return path</span> (cyan) back to produce the
            <span className="text-emerald-400"> output</span> letter.
          </p>
          <p>
            The rotors step with each keypress, changing all the wiring connections. Use the position windows above the
            diagram or open <span className="text-white">CONFIG</span> to change rotor types (I–VIII, Beta/Gamma), ring settings,
            reflector (UKW-B/C thin), and plugboard connections.
          </p>
          <p className="text-slate-600">
            Tip: The forward and return signals always use different wires in each gap — this is why Enigma never
            encrypts a letter to itself.
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;
