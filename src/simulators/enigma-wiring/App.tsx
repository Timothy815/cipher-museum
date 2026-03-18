import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Settings, RotateCcw, ChevronUp, ChevronDown } from 'lucide-react';
import { RotorType, ReflectorType, RotorConfig, MachineState } from '../enigma-m4/types';
import { ROTOR_DATA, REFLECTOR_DATA, ALPHABET } from '../enigma-m4/constants';

// ── Helpers ────────────────────────────────────────────────────────
const toIndex = (c: string) => c.charCodeAt(0) - 65;
const toChar = (i: number) => String.fromCharCode(((i % 26) + 26) % 26 + 65);
const mod = (n: number) => ((n % 26) + 26) % 26;

const KEYBOARD_LAYOUT = ['QWERTZUIO', 'ASDFGHJK', 'PYXCVBNML'];

// ── SVG Layout (dual-column per rotor) ────────────────────────────
// 9 columns: Greek-L(0), Greek-R(1), Left-L(2), Left-R(3),
//            Mid-L(4), Mid-R(5), Right-L(6), Right-R(7), Entry(8)
const SVG_W = 880;
const SVG_H = 640;
const COL_X = [100, 158, 255, 313, 410, 468, 565, 623, 755];
const LETTER_Y0 = 55;
const LETTER_DY = 21;
const WIRE_PAD = 12;
const letterY = (i: number) => LETTER_Y0 + i * LETTER_DY;

// Rotor pair definitions: [leftCol, rightCol, rotorIndex]
const ROTOR_PAIRS = [
  { lc: 0, rc: 1, ri: 0 }, // Greek
  { lc: 2, rc: 3, ri: 1 }, // Left
  { lc: 4, rc: 5, ri: 2 }, // Middle
  { lc: 6, rc: 7, ri: 3 }, // Right
];

// Stator gaps: [leftCol, rightCol] — connections between adjacent rotor faces
const STATOR_GAPS = [
  { lc: 1, rc: 2 }, // Greek-R ↔ Left-L
  { lc: 3, rc: 4 }, // Left-R ↔ Mid-L
  { lc: 5, rc: 6 }, // Mid-R ↔ Right-L
  { lc: 7, rc: 8 }, // Right-R ↔ Entry
];

const SLOT_NAMES = ['GREEK', 'LEFT', 'MIDDLE', 'RIGHT'];

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
  forward: number[];   // length 5: entry → after each rotor
  backward: number[];  // length 5: after reflector → after each inverse
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

  // ── Computed wirings (effective = visual for dual-column pairs) ──
  const wirings = useMemo(() => [
    effectiveWiring(state.rotors[0]),
    effectiveWiring(state.rotors[1]),
    effectiveWiring(state.rotors[2]),
    effectiveWiring(state.rotors[3]),
  ], [state.rotors]);

  const reflMap = useMemo(() => reflectorMapping(state.reflector), [state.reflector]);

  // ── Column rotation offsets (9 columns) ────────────────────────
  // Both faces of each rotor pair share the same offset; Entry is fixed
  const colOffsets = useMemo(() => {
    const o = (ri: number) => mod(state.rotors[ri].position - state.rotors[ri].ringSetting);
    return [o(0), o(0), o(1), o(1), o(2), o(2), o(3), o(3), 0];
  }, [state.rotors]);

  const toVisual = (contactIdx: number, col: number) => mod(contactIdx - colOffsets[col]);

  // ── Signal contact at each column (forward & return) ──────────
  // forward[0]=entry, forward[1]=afterRight, forward[2]=afterMid, forward[3]=afterLeft, forward[4]=afterGreek
  // Columns: 0=Greek-L, 1=Greek-R, 2=Left-L, 3=Left-R, 4=Mid-L, 5=Mid-R, 6=Right-L, 7=Right-R, 8=Entry
  const fwdContacts: number[] | null = trace ? [
    trace.forward[4], trace.forward[3],  // Greek: left=after-greek, right=after-left
    trace.forward[3], trace.forward[2],  // Left: left=after-left, right=after-mid
    trace.forward[2], trace.forward[1],  // Mid: left=after-mid, right=after-right
    trace.forward[1], trace.forward[0],  // Right: left=after-right, right=entry
    trace.forward[0],                     // Entry
  ] : null;

  const retContacts: number[] | null = trace ? [
    trace.backward[0], trace.backward[1],  // Greek
    trace.backward[1], trace.backward[2],  // Left
    trace.backward[2], trace.backward[3],  // Mid
    trace.backward[3], trace.backward[4],  // Right
    trace.backward[4],                      // Entry
  ] : null;

  // ── Highlighted letters at each column ──────────────────────────
  const highlights = useMemo(() => {
    if (!fwdContacts || !retContacts) return new Map<string, string>();
    const m = new Map<string, string>();
    for (let c = 0; c < 9; c++) {
      m.set(`${c}-${fwdContacts[c]}`, c === 8 ? 'input' : 'forward');
    }
    for (let c = 0; c < 9; c++) {
      const key = `${c}-${retContacts[c]}`;
      if (!m.has(key)) m.set(key, c === 8 ? 'output' : 'return');
    }
    return m;
  }, [fwdContacts, retContacts]);

  const hlColor = (type: string) => {
    switch (type) {
      case 'input': case 'forward': return '#f59e0b';
      case 'return': return '#06b6d4';
      case 'output': return '#10b981';
      default: return '#94a3b8';
    }
  };

  // ── Key handling ────────────────────────────────────────────────
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

  return (
    <div className="flex-1 bg-slate-950 flex flex-col items-center px-4 py-8 text-slate-200">
      <div className="w-full max-w-6xl">

        {/* ── Header ──────────────────────────────────────────── */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              ENIGMA <span className="text-amber-500">WIRING EXPLORER</span>
            </h1>
            <p className="text-xs text-slate-500 font-mono tracking-widest">M4 KRIEGSMARINE — MECHANICALLY ACCURATE SIGNAL TRACER</p>
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

        {/* ── SVG Wiring Diagram (Dual-Column per Rotor) ───────── */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-2 sm:p-3 mb-6 overflow-x-auto">
          <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full h-auto" style={{ minWidth: 700 }}>
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

            {/* ── Rotor pair background rectangles ──────────────── */}
            {ROTOR_PAIRS.map(({ lc, rc, ri }) => (
              <rect key={`bg-${ri}`}
                x={COL_X[lc] - 18} y={LETTER_Y0 - 14}
                width={COL_X[rc] - COL_X[lc] + 36} height={26 * LETTER_DY + 6}
                rx={8} ry={8}
                fill="rgba(245, 158, 11, 0.02)" stroke="rgba(245, 158, 11, 0.06)" strokeWidth={1} />
            ))}

            {/* ── Rotor pair labels ─────────────────────────────── */}
            {ROTOR_PAIRS.map(({ lc, rc, ri }) => {
              const cx = (COL_X[lc] + COL_X[rc]) / 2;
              return (
                <g key={`label-${ri}`}>
                  <text x={cx} y={20} textAnchor="middle" fill="#92400e" fontSize={8} fontWeight="bold" fontFamily="monospace" opacity={0.7}>
                    {SLOT_NAMES[ri]}
                  </text>
                  <text x={cx} y={32} textAnchor="middle" fill="#b45309" fontSize={9} fontWeight="bold" fontFamily="monospace" opacity={0.5}>
                    {state.rotors[ri].type}
                  </text>
                </g>
              );
            })}

            {/* Entry label */}
            <text x={COL_X[8]} y={20} textAnchor="middle" fill="#64748b" fontSize={10} fontWeight="bold" fontFamily="monospace">ENTRY</text>

            {/* Reflector label */}
            <text x={COL_X[0] - 40} y={20} textAnchor="end" fill="#7c3aed" fontSize={10} fontWeight="bold" fontFamily="monospace">
              UKW-{state.reflector === ReflectorType.B_Thin ? 'B' : 'C'}
            </text>

            {/* Stator gap labels */}
            {STATOR_GAPS.map(({ lc, rc }, i) => {
              const cx = (COL_X[lc] + COL_X[rc]) / 2;
              return (
                <text key={`stator-label-${i}`} x={cx} y={42} textAnchor="middle"
                  fill="#334155" fontSize={7} fontFamily="monospace" opacity={0.6}>
                  STATOR
                </text>
              );
            })}

            {/* ── Column letters (all 9 columns) ───────────────── */}
            {COL_X.map((cx, c) => (
              <g key={`col-${c}`}>
                {ALPHABET.split('').map((_, i) => {
                  const contactIdx = mod(i + colOffsets[c]);
                  const letter = toChar(contactIdx);
                  const hl = highlights.get(`${c}-${contactIdx}`);
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

            {/* ── Internal rotor wiring (colored beziers) ──────── */}
            {ROTOR_PAIRS.map(({ lc, rc, ri }) => {
              const x1 = COL_X[lc] + WIRE_PAD;
              const x2 = COL_X[rc] - WIRE_PAD;
              const cp = (x2 - x1) * 0.35;
              const wiring = wirings[ri];
              // Active contacts for this rotor pair
              const activeFwdRV = fwdContacts ? toVisual(fwdContacts[rc], rc) : -1;
              const activeRetRV = retContacts ? toVisual(retContacts[rc], rc) : -1;

              return (
                <g key={`rotor-${ri}`}>
                  {/* Background wires: iterate rightVis → leftVis via effectiveWiring */}
                  {wiring.map((leftContact, rightVis) => {
                    if (rightVis === activeFwdRV || rightVis === activeRetRV) return null;
                    const leftVis = leftContact; // effectiveWiring already gives visual position
                    return (
                      <path key={rightVis}
                        d={`M ${x1} ${letterY(leftVis)} C ${x1 + cp} ${letterY(leftVis)}, ${x2 - cp} ${letterY(rightVis)}, ${x2} ${letterY(rightVis)}`}
                        stroke={`hsla(${wireHue(rightVis)}, 40%, 45%, ${trace ? 0.12 : 0.22})`}
                        strokeWidth={1} fill="none" />
                    );
                  })}

                  {/* Active forward wire */}
                  {fwdContacts && (() => {
                    const rv = toVisual(fwdContacts[rc], rc);
                    const lv = toVisual(fwdContacts[lc], lc);
                    return (
                      <path
                        d={`M ${x1} ${letterY(lv)} C ${x1 + cp} ${letterY(lv)}, ${x2 - cp} ${letterY(rv)}, ${x2} ${letterY(rv)}`}
                        stroke="#f59e0b" strokeWidth={2.5} fill="none" filter="url(#glow-fwd)" />
                    );
                  })()}

                  {/* Active return wire */}
                  {retContacts && (() => {
                    const rv = toVisual(retContacts[rc], rc);
                    const lv = toVisual(retContacts[lc], lc);
                    return (
                      <path
                        d={`M ${x1} ${letterY(lv)} C ${x1 + cp} ${letterY(lv)}, ${x2 - cp} ${letterY(rv)}, ${x2} ${letterY(rv)}`}
                        stroke="#06b6d4" strokeWidth={2.5} fill="none" filter="url(#glow-ret)" />
                    );
                  })()}
                </g>
              );
            })}

            {/* ── Stator connections (thin lines showing rotation offset) ── */}
            {STATOR_GAPS.map(({ lc, rc }, si) => {
              const x1 = COL_X[lc] + WIRE_PAD;
              const x2 = COL_X[rc] - WIRE_PAD;
              const oL = colOffsets[lc];
              const oR = colOffsets[rc];
              // Active physical contacts at this stator
              const activeFwdJ = fwdContacts ? fwdContacts[lc] : -1;
              const activeRetJ = retContacts ? retContacts[lc] : -1;

              return (
                <g key={`stator-${si}`}>
                  {/* Background stator wires */}
                  {Array.from({ length: 26 }, (_, j) => {
                    if (j === activeFwdJ || j === activeRetJ) return null;
                    const lv = mod(j - oL);
                    const rv = mod(j - oR);
                    return (
                      <line key={j}
                        x1={x1} y1={letterY(lv)}
                        x2={x2} y2={letterY(rv)}
                        stroke={`rgba(100, 116, 139, ${trace ? 0.06 : 0.12})`}
                        strokeWidth={0.7} />
                    );
                  })}

                  {/* Active forward stator wire */}
                  {fwdContacts && activeFwdJ >= 0 && (() => {
                    const lv = mod(activeFwdJ - oL);
                    const rv = mod(activeFwdJ - oR);
                    return (
                      <line x1={x1} y1={letterY(lv)} x2={x2} y2={letterY(rv)}
                        stroke="#f59e0b" strokeWidth={2} filter="url(#glow-fwd)" />
                    );
                  })()}

                  {/* Active return stator wire */}
                  {retContacts && activeRetJ >= 0 && (() => {
                    const lv = mod(activeRetJ - oL);
                    const rv = mod(activeRetJ - oR);
                    return (
                      <line x1={x1} y1={letterY(lv)} x2={x2} y2={letterY(rv)}
                        stroke="#06b6d4" strokeWidth={2} filter="url(#glow-ret)" />
                    );
                  })()}
                </g>
              );
            })}

            {/* ── Reflector arcs (off col 0 = Greek left face) ─── */}
            {(() => {
              const x = COL_X[0] - WIRE_PAD;
              const drawn = new Set<number>();
              return reflMap.map((outIdx, inIdx) => {
                if (drawn.has(inIdx)) return null;
                drawn.add(inIdx);
                drawn.add(outIdx);
                const vIn = toVisual(inIdx, 0);
                const vOut = toVisual(outIdx, 0);
                const y1 = letterY(vIn);
                const y2 = letterY(vOut);
                const dist = Math.abs(vOut - vIn);
                const bulge = 12 + dist * 2.8;
                const isActive = trace && (
                  (trace.reflIn === inIdx && trace.reflOut === outIdx) ||
                  (trace.reflIn === outIdx && trace.reflOut === inIdx)
                );
                return (
                  <path key={inIdx}
                    d={`M ${x} ${y1} C ${x - bulge} ${y1}, ${x - bulge} ${y2}, ${x} ${y2}`}
                    stroke={isActive ? '#a78bfa' : `rgba(100, 116, 139, ${trace ? 0.12 : 0.2})`}
                    strokeWidth={isActive ? 2.5 : 1} fill="none"
                    filter={isActive ? 'url(#glow-refl)' : undefined} />
                );
              });
            })()}

            {/* ── Input / Output indicators (off col 8 = Entry) ── */}
            {trace && (() => {
              const inputVis = toVisual(trace.forward[0], 8);
              const outputVis = toVisual(trace.backward[4], 8);
              return (
                <g>
                  <polygon
                    points={`${COL_X[8] + WIRE_PAD + 6},${letterY(inputVis) - 4} ${COL_X[8] + WIRE_PAD + 6},${letterY(inputVis) + 4} ${COL_X[8] + WIRE_PAD},${letterY(inputVis)}`}
                    fill="#f59e0b" />
                  <text x={COL_X[8] + WIRE_PAD + 10} y={letterY(inputVis) + 1}
                    textAnchor="start" dominantBaseline="central"
                    fontSize={13} fontWeight="bold" fontFamily="monospace" fill="#f59e0b">
                    {trace.inputChar}
                  </text>
                  {trace.pbIn && (
                    <text x={COL_X[8] + WIRE_PAD + 10} y={letterY(inputVis) + 13}
                      textAnchor="start" dominantBaseline="central"
                      fontSize={8} fontFamily="monospace" fill="#ec4899">
                      PB→{trace.pbIn}
                    </text>
                  )}

                  <polygon
                    points={`${COL_X[8] + WIRE_PAD},${letterY(outputVis) - 4} ${COL_X[8] + WIRE_PAD},${letterY(outputVis) + 4} ${COL_X[8] + WIRE_PAD + 6},${letterY(outputVis)}`}
                    fill="#10b981" />
                  <text x={COL_X[8] + WIRE_PAD + 10} y={letterY(outputVis) + 1}
                    textAnchor="start" dominantBaseline="central"
                    fontSize={13} fontWeight="bold" fontFamily="monospace" fill="#10b981">
                    {trace.outputChar}
                  </text>
                  {trace.pbOut && (
                    <text x={COL_X[8] + WIRE_PAD + 10} y={letterY(outputVis) - 11}
                      textAnchor="start" dominantBaseline="central"
                      fontSize={8} fontFamily="monospace" fill="#ec4899">
                      PB→{trace.pbOut}
                    </text>
                  )}
                </g>
              );
            })()}

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
              <line x1={305} y1={0} x2={330} y2={0} stroke="rgba(100,116,139,0.3)" strokeWidth={1} />
              <text x={335} y={1} dominantBaseline="central" fontSize={9} fill="#64748b" fontFamily="monospace">Stator</text>
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
            This diagram shows the M4 Enigma with <span className="text-white">mechanically accurate</span> rotor visualization.
            Each rotor is shown as a <span className="text-amber-400">pair of columns</span> — the left column is the output face
            and the right column is the input face. Both faces rotate together when the rotor steps, just like the
            physical brass rotor barrel.
          </p>
          <p>
            The <span className="text-amber-400">colored curves</span> within each rotor pair show the internal wiring that
            scrambles the signal. The thin <span className="text-slate-400">stator lines</span> between rotor pairs show how
            spring-loaded contacts connect adjacent rotors. When rotors are at different positions, the stator lines
            cross — this is the relative displacement between neighboring rotors.
          </p>
          <p>
            Press any key to see the <span className="text-amber-400">forward path</span> (amber)
            travel right-to-left through each rotor, bounce off the <span className="text-violet-400">reflector</span> (purple arcs),
            then trace the <span className="text-cyan-400">return path</span> (cyan) back to produce the
            <span className="text-emerald-400"> output</span> letter.
          </p>
          <p className="text-slate-600">
            Tip: Step a single rotor and watch how the stator lines shift while the internal wiring stays fixed —
            exactly what happens inside the real machine.
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;
