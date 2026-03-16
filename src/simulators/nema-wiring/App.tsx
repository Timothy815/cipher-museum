import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Settings, RotateCcw, ChevronUp, ChevronDown } from 'lucide-react';
import { WiringDiagram, WiringTrace } from '../shared/WiringDiagram';

// ── NEMA Constants ──────────────────────────────────────────────────
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const KEYBOARD_LAYOUT = ['QWERTZUIO', 'ASDFGHJK', 'PYXCVBNML'];

const ROTORS: { wiring: string; notches: number[] }[] = [
  { wiring: 'EKMFLGDQVZNTOWYHXUSPAIBRCJ', notches: [3, 9, 14, 21] },
  { wiring: 'AJDKSIRUXBLHWTMCQGZNPYFVOE', notches: [5, 11, 17, 24] },
  { wiring: 'BDFHJLCPRTXVZNYEIWGAKMUSQO', notches: [2, 8, 15, 20] },
  { wiring: 'ESOVPZJAYQUIRHXLNFTGKDCMWB', notches: [4, 10, 16, 22] },
  { wiring: 'VZBRGITYUPSDNHLXAWMJQOFECK', notches: [1, 7, 13, 19, 25] },
  { wiring: 'JPGVOUMFYQBENHZRDKASXLICTW', notches: [3, 6, 12, 18, 23] },
  { wiring: 'NZJHGRCXMYSWBUOFAIVLPEKQDT', notches: [0, 5, 11, 16, 22] },
  { wiring: 'FKQHTLXOCBJSPDZRAMEWNIUYGV', notches: [2, 9, 14, 20, 25] },
  { wiring: 'LPGSZMHAEOQKVXRFYBUTNICJDW', notches: [4, 8, 13, 19, 24] },
  { wiring: 'SLVGBTFXJQOHEWIRZYAMKPCNDU', notches: [1, 7, 10, 17, 21] },
];

const DRIVE_WHEEL_NOTCHES = [0, 3, 5, 8, 11, 14, 17, 19, 22, 25];
const REFLECTOR = 'QYHOGNECVPUZTFDJAXWMKISRBL';

const mod = (n: number) => ((n % 26) + 26) % 26;
const toChar = (i: number) => String.fromCharCode(mod(i) + 65);

// ── Rotor math ──────────────────────────────────────────────────────
function passForward(idx: number, wiring: string, position: number, ringSetting: number): number {
  const shift = position - ringSetting;
  const pin = ((idx + shift) % 26 + 26) % 26;
  const contact = wiring.charCodeAt(pin) - 65;
  return ((contact - shift) % 26 + 26) % 26;
}

function passBackward(idx: number, wiring: string, position: number, ringSetting: number): number {
  const shift = position - ringSetting;
  const pin = ((idx + shift) % 26 + 26) % 26;
  const target = String.fromCharCode(pin + 65);
  const inputIdx = wiring.indexOf(target);
  return ((inputIdx - shift) % 26 + 26) % 26;
}

function effectiveWiring(wiring: string, position: number, ringSetting: number): number[] {
  return Array.from({ length: 26 }, (_, i) => passForward(i, wiring, position, ringSetting));
}

function reflectorMapping(): number[] {
  return Array.from({ length: 26 }, (_, i) => REFLECTOR.charCodeAt(i) - 65);
}

// ── Machine State ───────────────────────────────────────────────────
interface RotorState {
  rotorIdx: number;   // 0-9 (which of the 10 rotors)
  position: number;
  ringSetting: number;
}

interface MachineState {
  rotors: [RotorState, RotorState, RotorState, RotorState]; // [leftmost(0), left(1), mid(2), right(3)]
  driveWheelPos: number;
}

function cloneState(s: MachineState): MachineState {
  return {
    rotors: s.rotors.map(r => ({ ...r })) as MachineState['rotors'],
    driveWheelPos: s.driveWheelPos,
  };
}

// ── Stepping ────────────────────────────────────────────────────────
function stepMachine(state: MachineState): void {
  const [r0, r1, r2, r3] = state.rotors;

  // Rotor 3 (rightmost) ALWAYS steps
  const r3Pos = r3.position;
  r3.position = (r3.position + 1) % 26;

  // Rotor 2 steps if rotor 3's current position (before step) is in rotor 3's notch list
  const r2Steps = ROTORS[r3.rotorIdx].notches.includes(r3Pos);
  if (r2Steps) {
    const r2Pos = r2.position;
    r2.position = (r2.position + 1) % 26;

    // Rotor 1 steps if rotor 2's current position (before step) is in rotor 2's notch list
    if (ROTORS[r2.rotorIdx].notches.includes(r2Pos)) {
      r1.position = (r1.position + 1) % 26;
    }
  }

  // Rotor 0 steps if drive wheel's current position is in drive wheel's notch list
  if (DRIVE_WHEEL_NOTCHES.includes(state.driveWheelPos)) {
    r0.position = (r0.position + 1) % 26;
  }

  // Drive wheel ALWAYS steps
  state.driveWheelPos = (state.driveWheelPos + 1) % 26;
}

// ── Signal trace ────────────────────────────────────────────────────
interface NemaTrace extends WiringTrace {
  forwardLabels: string[];
  backwardLabels: string[];
}

function traceSignal(inputChar: string, state: MachineState): NemaTrace {
  let idx = inputChar.charCodeAt(0) - 65;
  const forward: number[] = [idx];
  const forwardLabels: string[] = [inputChar];

  // Signal path: Right(3) -> Mid(2) -> Left(1) -> Leftmost(0) -> Reflector
  for (const ri of [3, 2, 1, 0]) {
    const r = state.rotors[ri];
    idx = passForward(idx, ROTORS[r.rotorIdx].wiring, r.position, r.ringSetting);
    forward.push(idx);
    forwardLabels.push(toChar(idx));
  }

  const reflIn = idx;
  const reflOut = REFLECTOR.charCodeAt(idx) - 65;
  idx = reflOut;

  // Return: Leftmost(0)^-1 -> Left(1)^-1 -> Mid(2)^-1 -> Right(3)^-1
  const backward: number[] = [idx];
  const backwardLabels: string[] = [toChar(idx)];
  for (const ri of [0, 1, 2, 3]) {
    const r = state.rotors[ri];
    idx = passBackward(idx, ROTORS[r.rotorIdx].wiring, r.position, r.ringSetting);
    backward.push(idx);
    backwardLabels.push(toChar(idx));
  }

  const outputChar = toChar(idx);

  return {
    forward,
    backward,
    reflIn,
    reflOut,
    inputChar,
    outputChar,
    forwardLabels,
    backwardLabels,
  };
}

// ── Initial state ───────────────────────────────────────────────────
const createInitialState = (): MachineState => ({
  rotors: [
    { rotorIdx: 0, position: 0, ringSetting: 0 },
    { rotorIdx: 1, position: 0, ringSetting: 0 },
    { rotorIdx: 2, position: 0, ringSetting: 0 },
    { rotorIdx: 3, position: 0, ringSetting: 0 },
  ],
  driveWheelPos: 0,
});

// ════════════════════════════════════════════════════════════════════
const App: React.FC = () => {
  const [state, setState] = useState<MachineState>(createInitialState);
  const [history, setHistory] = useState<MachineState[]>([]);
  const [trace, setTrace] = useState<NemaTrace | null>(null);
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const [tape, setTape] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // ── Computed wirings for the WiringDiagram ────────────────────────
  // Gap order: Right(3), Mid(2), Left(1), Leftmost(0)
  const wirings = useMemo(() => [
    effectiveWiring(ROTORS[state.rotors[3].rotorIdx].wiring, state.rotors[3].position, state.rotors[3].ringSetting),
    effectiveWiring(ROTORS[state.rotors[2].rotorIdx].wiring, state.rotors[2].position, state.rotors[2].ringSetting),
    effectiveWiring(ROTORS[state.rotors[1].rotorIdx].wiring, state.rotors[1].position, state.rotors[1].ringSetting),
    effectiveWiring(ROTORS[state.rotors[0].rotorIdx].wiring, state.rotors[0].position, state.rotors[0].ringSetting),
  ], [state.rotors]);

  const reflMap = useMemo(() => reflectorMapping(), []);

  // ── Columns and gap labels for WiringDiagram ──────────────────────
  const columns = [
    { label: 'ENTRY' },
    { label: '\u2022' },
    { label: '\u2022' },
    { label: '\u2022' },
    { label: '\u2022' },
  ];

  const gapLabels = [
    { name: 'RIGHT', detail: `R${state.rotors[3].rotorIdx + 1}` },
    { name: 'MIDDLE', detail: `R${state.rotors[2].rotorIdx + 1}` },
    { name: 'LEFT', detail: `R${state.rotors[1].rotorIdx + 1}` },
    { name: 'LEFTMOST', detail: `R${state.rotors[0].rotorIdx + 1}` },
  ];

  // ── Key handling ──────────────────────────────────────────────────
  const handleKeyDown = useCallback((char: string) => {
    if (pressedKey) return;
    setHistory(prev => [...prev, cloneState(state)]);
    const ns = cloneState(state);
    stepMachine(ns);
    const sig = traceSignal(char, ns);
    setTrace(sig);
    setPressedKey(char);
    setTape(prev => prev + sig.outputChar);
    setState(ns);
  }, [state, pressedKey]);

  const handleKeyUp = useCallback(() => {
    // Only clear pressedKey, NOT the trace — trace persists until next keypress
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

  // ── Config helpers ────────────────────────────────────────────────
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

  const setRotorChoice = (ri: number, rotorIdx: number) => {
    const rs = [...state.rotors] as MachineState['rotors'];
    rs[ri] = { ...rs[ri], rotorIdx };
    setState({ ...state, rotors: rs });
  };

  const adjustDriveWheel = (d: number) => {
    setState(prev => ({ ...prev, driveWheelPos: mod(prev.driveWheelPos + d) }));
  };

  const handleReset = () => {
    setState(createInitialState());
    setHistory([]);
    setTape('');
    setTrace(null);
    setPressedKey(null);
  };

  // Slot display info: signal path is Right(3) -> Mid(2) -> Left(1) -> Leftmost(0)
  const slotInfo = [
    { idx: 3, label: 'Right', slot: 'R3' },
    { idx: 2, label: 'Mid', slot: 'R2' },
    { idx: 1, label: 'Left', slot: 'R1' },
    { idx: 0, label: 'Leftmost', slot: 'R0' },
  ];

  return (
    <div className="flex-1 bg-slate-950 flex flex-col items-center px-4 py-8 text-slate-200">
      <div className="w-full max-w-5xl">

        {/* ── Header ──────────────────────────────────────────── */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              NEMA <span className="text-sky-400">WIRING EXPLORER</span>
            </h1>
            <p className="text-xs text-slate-500 font-mono tracking-widest">SWISS 4-ROTOR — DRIVE WHEEL STEPPING</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleReset}
              className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Reset">
              <RotateCcw size={18} />
            </button>
            <button onClick={() => setShowSettings(!showSettings)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all border ${
                showSettings ? 'bg-sky-900/50 border-sky-700 text-sky-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
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
                { idx: 0, label: 'LEFTMOST (4th)' },
                { idx: 1, label: 'LEFT (3rd)' },
                { idx: 2, label: 'MIDDLE (2nd)' },
                { idx: 3, label: 'RIGHT (1st)' },
              ].map(slot => (
                <div key={slot.idx} className="space-y-2">
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{slot.label}</div>
                  <select value={state.rotors[slot.idx].rotorIdx}
                    onChange={e => setRotorChoice(slot.idx, parseInt(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono">
                    {ROTORS.map((_, i) => <option key={i} value={i}>Rotor {i + 1}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <div className="text-[9px] text-slate-600 mb-1">Position</div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => adjustPosition(slot.idx, -1)} className="p-1 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:text-white"><ChevronDown size={12} /></button>
                        <div className="flex-1 text-center font-mono font-bold text-sky-400">{toChar(state.rotors[slot.idx].position)}</div>
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
                  <div className="text-[8px] text-slate-600 font-mono">
                    Notches: {ROTORS[state.rotors[slot.idx].rotorIdx].notches.map(n => toChar(n)).join(',')}
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-3 border-t border-slate-800">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Drive Wheel</div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <button onClick={() => adjustDriveWheel(-1)} className="p-1 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:text-white"><ChevronDown size={12} /></button>
                  <div className="w-8 h-9 bg-slate-800 border border-slate-600 rounded-lg flex items-center justify-center font-mono font-bold text-orange-400 text-lg">
                    {toChar(state.driveWheelPos)}
                  </div>
                  <button onClick={() => adjustDriveWheel(1)} className="p-1 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:text-white"><ChevronUp size={12} /></button>
                </div>
                <div className="text-[9px] text-slate-600 font-mono">
                  Notches: {DRIVE_WHEEL_NOTCHES.map(n => toChar(n)).join(',')}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Rotor Position Windows ──────────────────────────── */}
        <div className="flex justify-center gap-4 sm:gap-8 mb-4">
          {slotInfo.map(({ idx, label }) => (
            <div key={idx} className="flex flex-col items-center">
              <div className="text-[9px] text-slate-600 font-bold uppercase">{label}</div>
              <div className="text-[10px] text-sky-700 font-mono">R{state.rotors[idx].rotorIdx + 1}</div>
              <div className="flex items-center gap-0.5 mt-1">
                <button onClick={() => adjustPosition(idx, 1)} className="p-0.5 text-slate-600 hover:text-sky-400 transition-colors"><ChevronUp size={14} /></button>
                <div className="w-8 h-9 bg-slate-800 border border-slate-600 rounded-lg flex items-center justify-center font-mono font-bold text-sky-400 text-lg">
                  {toChar(state.rotors[idx].position)}
                </div>
                <button onClick={() => adjustPosition(idx, -1)} className="p-0.5 text-slate-600 hover:text-sky-400 transition-colors"><ChevronDown size={14} /></button>
              </div>
              <div className="text-[8px] text-slate-700 font-mono mt-0.5">Ring {toChar(state.rotors[idx].ringSetting)}</div>
            </div>
          ))}
          {/* Drive wheel position */}
          <div className="flex flex-col items-center">
            <div className="text-[9px] text-slate-600 font-bold uppercase">Drive</div>
            <div className="text-[10px] text-orange-700 font-mono">Wheel</div>
            <div className="flex items-center gap-0.5 mt-1">
              <button onClick={() => adjustDriveWheel(1)} className="p-0.5 text-slate-600 hover:text-orange-400 transition-colors"><ChevronUp size={14} /></button>
              <div className="w-8 h-9 bg-slate-800 border border-orange-800/50 rounded-lg flex items-center justify-center font-mono font-bold text-orange-400 text-lg">
                {toChar(state.driveWheelPos)}
              </div>
              <button onClick={() => adjustDriveWheel(-1)} className="p-0.5 text-slate-600 hover:text-orange-400 transition-colors"><ChevronDown size={14} /></button>
            </div>
            <div className="text-[8px] text-slate-700 font-mono mt-0.5">&nbsp;</div>
          </div>
        </div>

        {/* ── SVG Wiring Diagram ──────────────────────────────── */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-2 sm:p-3 mb-6 overflow-x-auto">
          <WiringDiagram
            columns={columns}
            gapLabels={gapLabels}
            wirings={wirings}
            reflector={reflMap}
            reflectorLabel="UKW"
            trace={trace}
            accentColor="#0284c7"
          />
        </div>

        {/* ── Signal Path Text ────────────────────────────────── */}
        {trace && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 mb-6">
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-sm">
              <span className="text-amber-400 font-bold">{trace.inputChar}</span>
              {trace.forward.slice(1).map((idx, i) => {
                const labels = ['R' + (state.rotors[3].rotorIdx + 1), 'R' + (state.rotors[2].rotorIdx + 1), 'R' + (state.rotors[1].rotorIdx + 1), 'R' + (state.rotors[0].rotorIdx + 1)];
                return (
                  <React.Fragment key={`f${i}`}>
                    <span className="text-slate-600">{'\u2192'}</span>
                    <span className="text-sky-400/60 text-[10px]">[{labels[i]}]</span>
                    <span className="text-amber-300">{toChar(idx)}</span>
                  </React.Fragment>
                );
              })}
              <span className="text-slate-600">{'\u2192'}</span>
              <span className="text-violet-400 font-bold text-[10px]">[UKW]</span>
              <span className="text-violet-400 font-bold">{toChar(trace.reflOut!)}</span>
              {trace.backward!.slice(1).map((idx, i) => {
                const labels = ['R' + (state.rotors[0].rotorIdx + 1), 'R' + (state.rotors[1].rotorIdx + 1), 'R' + (state.rotors[2].rotorIdx + 1), 'R' + (state.rotors[3].rotorIdx + 1)];
                return (
                  <React.Fragment key={`b${i}`}>
                    <span className="text-slate-600">{'\u2192'}</span>
                    <span className="text-sky-400/60 text-[10px]">[{labels[i]}{'\u207B\u00B9'}]</span>
                    <span className="text-cyan-300">{toChar(idx)}</span>
                  </React.Fragment>
                );
              })}
              <span className="text-slate-600">{'\u2192'}</span>
              <span className="text-emerald-400 font-bold text-lg">{trace.outputChar}</span>
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
                      isActive ? 'bg-sky-600 border-sky-500 text-white scale-95' :
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
            <div className="font-mono text-lg tracking-widest text-sky-400 break-all">
              {tape.match(/.{1,5}/g)?.join(' ')}
            </div>
          </div>
        )}

        {/* ── Info ─────────────────────────────────────────────── */}
        <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-5 text-xs text-slate-500 space-y-2">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">About the NEMA (NEue MAschine)</div>
          <p>
            The NEMA was a <span className="text-white">Swiss-designed 4-rotor cipher machine</span> developed during World War II
            as an improvement over the commercial Enigma K. Used by the Swiss Army from 1947 into the 1970s, it was
            one of the most sophisticated rotor machines of its era.
          </p>
          <p>
            Unlike the Enigma's regular odometer-style stepping, the NEMA uses an <span className="text-sky-400">irregular stepping
            mechanism</span> driven by a separate <span className="text-orange-400">drive wheel</span>. The rightmost rotor and the
            drive wheel always advance, but the other rotors step only when specific notch conditions are met. This
            creates a much longer and less predictable stepping cycle.
          </p>
          <p>
            Each NEMA rotor has <span className="text-white">multiple notch positions</span> (4-5 per rotor), and the drive wheel
            has 10 notches that control the leftmost rotor independently. This means the period before the machine
            state repeats is vastly longer than the Enigma's, making cryptanalysis significantly more difficult.
          </p>
          <p>
            The signal path passes through all four rotors, reflects off the <span className="text-violet-400">reflector (UKW)</span>,
            and returns through the rotors in reverse — ensuring that, like the Enigma, no letter ever encrypts to
            itself. The 10 interchangeable rotors (select any 4) provide {(10 * 9 * 8 * 7).toLocaleString()} possible
            rotor orderings before considering positions and ring settings.
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;
