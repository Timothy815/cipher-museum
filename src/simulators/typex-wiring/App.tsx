import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Settings, RotateCcw, ChevronUp, ChevronDown } from 'lucide-react';
import { WiringDiagram, WiringTrace } from '../shared/WiringDiagram';

// ── Typex Constants ─────────────────────────────────────────────────
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const KEYBOARD_LAYOUT = ['QWERTZUIO', 'ASDFGHJK', 'PYXCVBNML'];

const mod = (n: number) => ((n % 26) + 26) % 26;
const toChar = (i: number) => String.fromCharCode(mod(i) + 65);

// Stator wirings (positions 0-1, never step)
const STATORS: Record<string, string> = {
  SA: 'QWERTYUIOPASDFGHJKLZXCVBNM',
  SB: 'PLOKMIJNUHBYGVTFCRDXESZWAQ',
};

// Stepping rotor wirings (positions 2-4)
const ROTORS: Record<string, { wiring: string; notches: number[] }> = {
  I:   { wiring: 'JPGVOUMFYQBENHZRDKASXLICTW', notches: [4, 13, 22] },
  II:  { wiring: 'NZJHGRCXMYSWBOUFAIVLPEKQDT', notches: [7, 16, 25] },
  III: { wiring: 'FKQHTLXOCBJSPDZRAMEWNIUYGV', notches: [3, 11, 19] },
  IV:  { wiring: 'ESOVPZJAYQUIRHXLNFTGKDCMWB', notches: [5, 14, 23] },
  V:   { wiring: 'VZBRGITYUPSDNHLXAWMJQOFECK', notches: [9, 17, 24] },
};

const REFLECTOR_WIRING = 'YRUHQSLDPXNGOKMIEBFZCWVJAT';

const ROTOR_IDS = Object.keys(ROTORS);

// ── Rotor math ──────────────────────────────────────────────────────
function passForward(idx: number, wiring: string, position: number, ringSetting: number): number {
  const shift = position - ringSetting;
  const pin = mod(idx + shift);
  const contact = wiring.charCodeAt(pin) - 65;
  return mod(contact - shift);
}

function passBackward(idx: number, wiring: string, position: number, ringSetting: number): number {
  const shift = position - ringSetting;
  const pin = mod(idx + shift);
  const target = String.fromCharCode(pin + 65);
  const inputIdx = wiring.indexOf(target);
  return mod(inputIdx - shift);
}

function computeEffectiveWiring(wiring: string, position: number, ringSetting: number): number[] {
  return Array.from({ length: 26 }, (_, i) => passForward(i, wiring, position, ringSetting));
}

function reflectorMapping(): number[] {
  return Array.from({ length: 26 }, (_, i) => REFLECTOR_WIRING.charCodeAt(i) - 65);
}

// ── Machine state ───────────────────────────────────────────────────
interface TypexState {
  stator0: string;  // SA or SB
  stator1: string;  // SA or SB
  slow: { id: string; position: number; ringSetting: number };   // position 2
  medium: { id: string; position: number; ringSetting: number }; // position 3
  fast: { id: string; position: number; ringSetting: number };   // position 4
}

function createInitialState(): TypexState {
  return {
    stator0: 'SA',
    stator1: 'SB',
    slow:   { id: 'I',   position: 0, ringSetting: 0 },
    medium: { id: 'II',  position: 0, ringSetting: 0 },
    fast:   { id: 'III', position: 0, ringSetting: 0 },
  };
}

function cloneState(s: TypexState): TypexState {
  return {
    stator0: s.stator0,
    stator1: s.stator1,
    slow:   { ...s.slow },
    medium: { ...s.medium },
    fast:   { ...s.fast },
  };
}

// Stepping: Fast always steps. Medium steps if Fast at notch OR Medium at notch (double-step).
// Slow steps if Medium at notch.
function stepRotors(state: TypexState): void {
  const fastNotch = ROTORS[state.fast.id].notches.includes(state.fast.position);
  const mediumNotch = ROTORS[state.medium.id].notches.includes(state.medium.position);

  state.fast.position = (state.fast.position + 1) % 26;
  if (fastNotch || mediumNotch) state.medium.position = (state.medium.position + 1) % 26;
  if (mediumNotch) state.slow.position = (state.slow.position + 1) % 26;
}

// ── Signal trace ────────────────────────────────────────────────────
// Signal path (left to right in diagram):
//   Entry -> Stator A (gap 0) -> Stator B (gap 1) -> Fast (gap 2) -> Medium (gap 3) -> Slow (gap 4) -> Reflector
//   Reflector -> Slow^-1 (gap 4) -> Medium^-1 (gap 3) -> Fast^-1 (gap 2) -> Stator B^-1 (gap 1) -> Stator A^-1 (gap 0) -> Output

interface TypexTrace extends WiringTrace {
  pathLabels: string[];
}

function traceSignal(inputChar: string, state: TypexState): TypexTrace {
  let idx = inputChar.charCodeAt(0) - 65;

  // Forward: 6 column positions (entry + after each of 5 gaps)
  const forward: number[] = [idx];
  const pathLabels: string[] = [inputChar];

  // Gap 0: Stator A (position 0, ring 0)
  idx = passForward(idx, STATORS[state.stator0], 0, 0);
  forward.push(idx);
  pathLabels.push(toChar(idx));

  // Gap 1: Stator B (position 0, ring 0)
  idx = passForward(idx, STATORS[state.stator1], 0, 0);
  forward.push(idx);
  pathLabels.push(toChar(idx));

  // Gap 2: Fast rotor
  idx = passForward(idx, ROTORS[state.fast.id].wiring, state.fast.position, state.fast.ringSetting);
  forward.push(idx);
  pathLabels.push(toChar(idx));

  // Gap 3: Medium rotor
  idx = passForward(idx, ROTORS[state.medium.id].wiring, state.medium.position, state.medium.ringSetting);
  forward.push(idx);
  pathLabels.push(toChar(idx));

  // Gap 4: Slow rotor
  idx = passForward(idx, ROTORS[state.slow.id].wiring, state.slow.position, state.slow.ringSetting);
  forward.push(idx);
  pathLabels.push(toChar(idx));

  // Reflector
  const reflIn = idx;
  const reflOut = REFLECTOR_WIRING.charCodeAt(idx) - 65;
  idx = reflOut;
  pathLabels.push(toChar(idx));

  // Backward: 6 column positions (from rightmost column back to entry)
  const backward: number[] = [idx];

  // Gap 4 inverse: Slow rotor
  idx = passBackward(idx, ROTORS[state.slow.id].wiring, state.slow.position, state.slow.ringSetting);
  backward.push(idx);
  pathLabels.push(toChar(idx));

  // Gap 3 inverse: Medium rotor
  idx = passBackward(idx, ROTORS[state.medium.id].wiring, state.medium.position, state.medium.ringSetting);
  backward.push(idx);
  pathLabels.push(toChar(idx));

  // Gap 2 inverse: Fast rotor
  idx = passBackward(idx, ROTORS[state.fast.id].wiring, state.fast.position, state.fast.ringSetting);
  backward.push(idx);
  pathLabels.push(toChar(idx));

  // Gap 1 inverse: Stator B
  idx = passBackward(idx, STATORS[state.stator1], 0, 0);
  backward.push(idx);
  pathLabels.push(toChar(idx));

  // Gap 0 inverse: Stator A
  idx = passBackward(idx, STATORS[state.stator0], 0, 0);
  backward.push(idx);
  pathLabels.push(toChar(idx));

  const outputChar = toChar(idx);

  return {
    forward,
    backward,
    reflIn,
    reflOut,
    inputChar,
    outputChar,
    pathLabels,
  };
}

// ════════════════════════════════════════════════════════════════════
const App: React.FC = () => {
  const [state, setState] = useState<TypexState>(createInitialState);
  const [history, setHistory] = useState<TypexState[]>([]);
  const [trace, setTrace] = useState<TypexTrace | null>(null);
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const [tape, setTape] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // ── Computed wirings for the 5 gaps (physical: SLOW, MEDIUM, FAST, SB, SA) ──
  const wirings = useMemo(() => [
    computeEffectiveWiring(ROTORS[state.slow.id].wiring, state.slow.position, state.slow.ringSetting),
    computeEffectiveWiring(ROTORS[state.medium.id].wiring, state.medium.position, state.medium.ringSetting),
    computeEffectiveWiring(ROTORS[state.fast.id].wiring, state.fast.position, state.fast.ringSetting),
    computeEffectiveWiring(STATORS[state.stator1], 0, 0),
    computeEffectiveWiring(STATORS[state.stator0], 0, 0),
  ], [state]);

  const reflMap = useMemo(() => reflectorMapping(), []);

  // ── Column and gap definitions for WiringDiagram ───────────────
  const columns = [
    { label: '\u2022' },
    { label: '\u2022' },
    { label: '\u2022' },
    { label: '\u2022' },
    { label: '\u2022' },
    { label: 'ENTRY' },
  ];

  const gapLabels = [
    { name: 'SLOW', detail: state.slow.id },
    { name: 'MEDIUM', detail: state.medium.id },
    { name: 'FAST', detail: state.fast.id },
    { name: 'STATOR B', detail: state.stator1, isStator: true },
    { name: 'STATOR A', detail: state.stator0, isStator: true },
  ];

  // ── Key handling ──────────────────────────────────────────────
  const handleKeyDown = useCallback((char: string) => {
    if (pressedKey) return;
    setHistory(prev => [...prev, state]);
    const ns = cloneState(state);
    stepRotors(ns);
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

  // ── Config helpers ────────────────────────────────────────────
  const adjustPosition = (rotor: 'slow' | 'medium' | 'fast', d: number) => {
    setState(prev => ({
      ...prev,
      [rotor]: { ...prev[rotor], position: mod(prev[rotor].position + d) },
    }));
  };

  const adjustRing = (rotor: 'slow' | 'medium' | 'fast', d: number) => {
    setState(prev => ({
      ...prev,
      [rotor]: { ...prev[rotor], ringSetting: mod(prev[rotor].ringSetting + d) },
    }));
  };

  const setRotorType = (rotor: 'slow' | 'medium' | 'fast', id: string) => {
    setState(prev => ({
      ...prev,
      [rotor]: { ...prev[rotor], id },
    }));
  };

  const handleReset = () => {
    setState(createInitialState());
    setHistory([]);
    setTape('');
    setTrace(null);
    setPressedKey(null);
  };

  return (
    <div className="flex-1 bg-slate-950 flex flex-col items-center px-4 py-8 text-slate-200">
      <div className="w-full max-w-5xl">

        {/* ── Header ──────────────────────────────────────────── */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              TYPEX <span className="text-emerald-400">WIRING EXPLORER</span>
            </h1>
            <p className="text-xs text-slate-500 font-mono tracking-widest">BRITISH 5-ROTOR — STATORS + STEPPING ROTORS</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleReset}
              className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Reset">
              <RotateCcw size={18} />
            </button>
            <button onClick={() => setShowSettings(!showSettings)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all border ${
                showSettings ? 'bg-emerald-900/50 border-emerald-700 text-emerald-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}>
              <Settings size={16} /> CONFIG
            </button>
          </div>
        </div>

        {/* ── Settings Panel ──────────────────────────────────── */}
        {showSettings && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 mb-6 space-y-4">
            {/* Stators */}
            <div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-3">Stators (fixed, no stepping)</div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[9px] text-slate-600 font-bold uppercase mb-1">Stator A (position 0)</div>
                  <select value={state.stator0}
                    onChange={e => setState(prev => ({ ...prev, stator0: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono">
                    {Object.keys(STATORS).map(id => <option key={id} value={id}>{id}</option>)}
                  </select>
                </div>
                <div>
                  <div className="text-[9px] text-slate-600 font-bold uppercase mb-1">Stator B (position 1)</div>
                  <select value={state.stator1}
                    onChange={e => setState(prev => ({ ...prev, stator1: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono">
                    {Object.keys(STATORS).map(id => <option key={id} value={id}>{id}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Stepping rotors */}
            <div className="pt-3 border-t border-slate-800">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-3">Stepping Rotors</div>
              <div className="grid grid-cols-3 gap-4">
                {([
                  { key: 'slow' as const, label: 'SLOW (position 2)' },
                  { key: 'medium' as const, label: 'MEDIUM (position 3)' },
                  { key: 'fast' as const, label: 'FAST (position 4)' },
                ]).map(slot => (
                  <div key={slot.key} className="space-y-2">
                    <div className="text-[9px] text-slate-600 font-bold uppercase">{slot.label}</div>
                    <select value={state[slot.key].id}
                      onChange={e => setRotorType(slot.key, e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono">
                      {ROTOR_IDS.map(id => <option key={id} value={id}>{id}</option>)}
                    </select>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <div className="text-[9px] text-slate-600 mb-1">Position</div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => adjustPosition(slot.key, -1)} className="p-1 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:text-white"><ChevronDown size={12} /></button>
                          <div className="flex-1 text-center font-mono font-bold text-emerald-400">{toChar(state[slot.key].position)}</div>
                          <button onClick={() => adjustPosition(slot.key, 1)} className="p-1 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:text-white"><ChevronUp size={12} /></button>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="text-[9px] text-slate-600 mb-1">Ring</div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => adjustRing(slot.key, -1)} className="p-1 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:text-white"><ChevronDown size={12} /></button>
                          <div className="flex-1 text-center font-mono font-bold text-slate-300">{toChar(state[slot.key].ringSetting)}</div>
                          <button onClick={() => adjustRing(slot.key, 1)} className="p-1 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:text-white"><ChevronUp size={12} /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reflector (fixed) */}
            <div className="pt-3 border-t border-slate-800">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Reflector</div>
              <div className="text-sm text-slate-400 font-mono bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2">
                UKW (fixed)
              </div>
            </div>
          </div>
        )}

        {/* ── Quick Position Windows (stepping rotors only) ───── */}
        <div className="flex justify-center gap-6 sm:gap-10 mb-4">
          {([
            { key: 'slow' as const, label: 'Slow' },
            { key: 'medium' as const, label: 'Medium' },
            { key: 'fast' as const, label: 'Fast' },
          ]).map(({ key, label }) => (
            <div key={key} className="flex flex-col items-center">
              <div className="text-[9px] text-slate-600 font-bold uppercase">{label}</div>
              <div className="text-[10px] text-emerald-700 font-mono">{state[key].id}</div>
              <div className="flex items-center gap-0.5 mt-1">
                <button onClick={() => adjustPosition(key, 1)} className="p-0.5 text-slate-600 hover:text-emerald-400 transition-colors"><ChevronUp size={14} /></button>
                <div className="w-8 h-9 bg-slate-800 border border-slate-600 rounded-lg flex items-center justify-center font-mono font-bold text-emerald-400 text-lg">
                  {toChar(state[key].position)}
                </div>
                <button onClick={() => adjustPosition(key, -1)} className="p-0.5 text-slate-600 hover:text-emerald-400 transition-colors"><ChevronDown size={14} /></button>
              </div>
              <div className="text-[8px] text-slate-700 font-mono mt-0.5">Ring {toChar(state[key].ringSetting)}</div>
            </div>
          ))}
        </div>

        {/* ── SVG Wiring Diagram ──────────────────────────────── */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-2 sm:p-3 mb-6 overflow-x-auto">
          <WiringDiagram
            columns={columns}
            gapLabels={gapLabels}
            wirings={wirings}
            reflector={reflMap}
            reflectorLabel="UKW"
            reflectorSide="left"
            trace={trace}
            accentColor="#059669"
          />
        </div>

        {/* ── Signal Path Text ────────────────────────────────── */}
        {trace && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 mb-6">
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-sm">
              <span className="text-amber-400 font-bold">{trace.inputChar}</span>

              {/* Forward through stators */}
              <span className="text-slate-600">{'\u2192'}</span>
              <span className="text-slate-500 text-[10px]">[{state.stator0}]</span>
              <span className="text-amber-300">{toChar(trace.forward[1])}</span>

              <span className="text-slate-600">{'\u2192'}</span>
              <span className="text-slate-500 text-[10px]">[{state.stator1}]</span>
              <span className="text-amber-300">{toChar(trace.forward[2])}</span>

              {/* Forward through stepping rotors */}
              <span className="text-slate-600">{'\u2192'}</span>
              <span className="text-emerald-400 text-[10px]">[Fast {state.fast.id}]</span>
              <span className="text-amber-300">{toChar(trace.forward[3])}</span>

              <span className="text-slate-600">{'\u2192'}</span>
              <span className="text-emerald-400 text-[10px]">[Med {state.medium.id}]</span>
              <span className="text-amber-300">{toChar(trace.forward[4])}</span>

              <span className="text-slate-600">{'\u2192'}</span>
              <span className="text-emerald-400 text-[10px]">[Slow {state.slow.id}]</span>
              <span className="text-amber-300">{toChar(trace.forward[5])}</span>

              {/* Reflector */}
              <span className="text-slate-600">{'\u2192'}</span>
              <span className="text-violet-400 font-bold text-[10px]">[UKW]</span>
              <span className="text-violet-400 font-bold">{toChar(trace.reflOut!)}</span>

              {/* Backward through stepping rotors */}
              <span className="text-slate-600">{'\u2192'}</span>
              <span className="text-cyan-400 text-[10px]">[Slow{'\u207B\u00B9'}]</span>
              <span className="text-cyan-300">{toChar(trace.backward![1])}</span>

              <span className="text-slate-600">{'\u2192'}</span>
              <span className="text-cyan-400 text-[10px]">[Med{'\u207B\u00B9'}]</span>
              <span className="text-cyan-300">{toChar(trace.backward![2])}</span>

              <span className="text-slate-600">{'\u2192'}</span>
              <span className="text-cyan-400 text-[10px]">[Fast{'\u207B\u00B9'}]</span>
              <span className="text-cyan-300">{toChar(trace.backward![3])}</span>

              {/* Backward through stators */}
              <span className="text-slate-600">{'\u2192'}</span>
              <span className="text-slate-500 text-[10px]">[{state.stator1}{'\u207B\u00B9'}]</span>
              <span className="text-cyan-300">{toChar(trace.backward![4])}</span>

              <span className="text-slate-600">{'\u2192'}</span>
              <span className="text-slate-500 text-[10px]">[{state.stator0}{'\u207B\u00B9'}]</span>

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
                      isActive ? 'bg-emerald-600 border-emerald-500 text-white scale-95' :
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
            <div className="font-mono text-lg tracking-widest text-emerald-400 break-all">
              {tape.match(/.{1,5}/g)?.join(' ')}
            </div>
          </div>
        )}

        {/* ── Educational Info ─────────────────────────────────── */}
        <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-5 text-xs text-slate-500 space-y-2">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">About the Typex</div>
          <p>
            The <span className="text-white">Typex</span> (Type X or TypeX) was the principal British cipher machine of World War II.
            Based on the commercial Enigma, it was significantly enhanced with <span className="text-emerald-400">five rotors</span> instead
            of three, and two of those rotors were configured as <span className="text-emerald-400">stators</span> — fixed wiring
            substitutions that never step.
          </p>
          <p>
            The two stators (positions 0 and 1) effectively replaced the Enigma's plugboard, providing a fixed
            scramble at the entry point. The three stepping rotors (Slow, Medium, Fast) work like the Enigma's
            rotor mechanism: the <span className="text-emerald-400">fast rotor always steps</span>, the medium rotor steps when the
            fast rotor reaches a notch position (or double-steps at its own notch), and the slow rotor steps when
            the medium rotor is at a notch.
          </p>
          <p>
            Unlike the Enigma's single notch per rotor, Typex rotors have <span className="text-emerald-400">multiple notches</span> (typically
            three per rotor), creating a more irregular stepping pattern. This made the Typex significantly harder
            to cryptanalyze than the standard Enigma.
          </p>
          <p className="text-slate-600">
            The reflector ensures that encryption and decryption are the same operation — like the Enigma, pressing
            the same key with the same settings will always reverse the cipher. The signal travels forward through
            all five rotors, bounces off the reflector, then returns through the rotors in reverse order.
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;
