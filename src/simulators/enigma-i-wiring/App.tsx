import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Settings, RotateCcw, ChevronUp, ChevronDown } from 'lucide-react';
import ConfigSlots from '../shared/ConfigSlots';
import TapeActions from '../shared/TapeActions';
import { DualColumnWiring, DualColumnTrace } from '../shared/DualColumnWiring';

// ── Constants ─────────────────────────────────────────────────────
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const KEYBOARD_LAYOUT = ['QWERTZUIO', 'ASDFGHJK', 'PYXCVBNML'];

const mod = (n: number) => ((n % 26) + 26) % 26;
const toChar = (i: number) => String.fromCharCode(mod(i) + 65);
const toIndex = (c: string) => c.charCodeAt(0) - 65;

// ── Rotor Data ────────────────────────────────────────────────────
const ROTORS: Record<string, { wiring: string; notch: string }> = {
  I:   { wiring: 'EKMFLGDQVZNTOWYHXUSPAIBRCJ', notch: 'Q' },
  II:  { wiring: 'AJDKSIRUXBLHWTMCQGZNPYFVOE', notch: 'E' },
  III: { wiring: 'BDFHJLCPRTXVZNYEIWGAKMUSQO', notch: 'V' },
  IV:  { wiring: 'ESOVPZJAYQUIRHXLNFTGKDCMWB', notch: 'J' },
  V:   { wiring: 'VZBRGITYUPSDNHLXAWMJQOFECK', notch: 'Z' },
};

const REFLECTORS: Record<string, string> = {
  'UKW-A': 'EJMZALYXVBWFCRQUONTSPIKHGD',
  'UKW-B': 'YRUHQSLDPXNGOKMIEBFZCWVJAT',
  'UKW-C': 'FVPJIAOYEDRZXWGCTKUQSBNMHL',
};

const ROTOR_IDS = Object.keys(ROTORS);
const REFLECTOR_IDS = Object.keys(REFLECTORS);

// ── Machine State ─────────────────────────────────────────────────
interface RotorState {
  type: string;
  position: number;
  ringSetting: number;
}

interface MachineState {
  rotors: [RotorState, RotorState, RotorState]; // [left, middle, right]
  reflector: string;
  plugboard: Record<string, string>;
}

function createInitialState(): MachineState {
  return {
    rotors: [
      { type: 'I',   position: 0, ringSetting: 0 },
      { type: 'II',  position: 0, ringSetting: 0 },
      { type: 'III', position: 0, ringSetting: 0 },
    ],
    reflector: 'UKW-B',
    plugboard: {},
  };
}

function cloneState(s: MachineState): MachineState {
  return {
    rotors: s.rotors.map(r => ({ ...r })) as MachineState['rotors'],
    reflector: s.reflector,
    plugboard: { ...s.plugboard },
  };
}

// ── Rotor Math ────────────────────────────────────────────────────
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

function effectiveWiring(rotor: RotorState): number[] {
  const { wiring } = ROTORS[rotor.type];
  return Array.from({ length: 26 }, (_, i) =>
    passForward(i, wiring, rotor.position, rotor.ringSetting)
  );
}

function reflectorMapping(type: string): number[] {
  const w = REFLECTORS[type];
  return Array.from({ length: 26 }, (_, i) => w.charCodeAt(i) - 65);
}

// ── Stepping ──────────────────────────────────────────────────────
// Right always steps. Middle steps if right at notch OR middle at notch (double-step).
// Left steps if middle at notch.
function stepRotors(rotors: MachineState['rotors']): void {
  const [left, middle, right] = rotors;
  const rightAtNotch = toChar(right.position) === ROTORS[right.type].notch;
  const middleAtNotch = toChar(middle.position) === ROTORS[middle.type].notch;

  // Right always steps
  right.position = (right.position + 1) % 26;

  // Middle steps if right was at notch OR middle itself is at notch (double-step)
  if (rightAtNotch || middleAtNotch) {
    middle.position = (middle.position + 1) % 26;
  }

  // Left steps if middle was at notch
  if (middleAtNotch) {
    left.position = (left.position + 1) % 26;
  }
}

// ── Signal Trace ──────────────────────────────────────────────────
interface SignalTrace {
  forward: number[];    // length 4: entry + 3 inter-rotor contact points
  backward: number[];   // length 4: from reflector back to entry
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

  const [left, middle, right] = state.rotors;
  let idx = toIndex(ch);
  const forward: number[] = [idx];

  // Signal path: Plugboard -> Right -> Middle -> Left -> Reflector
  const rotorOrder = [right, middle, left];
  for (const rotor of rotorOrder) {
    const { wiring } = ROTORS[rotor.type];
    idx = passForward(idx, wiring, rotor.position, rotor.ringSetting);
    forward.push(idx);
  }

  // Reflector
  const reflIn = idx;
  const reflOut = REFLECTORS[state.reflector].charCodeAt(idx) - 65;
  idx = reflOut;

  // Return path: Left -> Middle -> Right -> Plugboard
  const backward: number[] = [idx];
  const returnOrder = [left, middle, right];
  for (const rotor of returnOrder) {
    const { wiring } = ROTORS[rotor.type];
    idx = passBackward(idx, wiring, rotor.position, rotor.ringSetting);
    backward.push(idx);
  }

  let outChar = toChar(idx);
  const pbOut = state.plugboard[outChar] || null;
  if (pbOut) outChar = pbOut;

  return { forward, backward, reflIn, reflOut, inputChar, outputChar: outChar, pbIn, pbOut };
}

// ════════════════════════════════════════════════════════════════════
const App: React.FC = () => {
  const [state, setState] = useState<MachineState>(createInitialState);
  const [history, setHistory] = useState<MachineState[]>([]);
  const [trace, setTrace] = useState<SignalTrace | null>(null);
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const [tape, setTape] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [plugboardText, setPlugboardText] = useState('');

  // ── Computed wirings for WiringDiagram ────────────────────────
  // Physical layout: Left, Middle, Right (left-to-right in diagram)
  // Reflector on the left, entry on the right
  const wirings = useMemo(() => [
    effectiveWiring(state.rotors[0]), // Left
    effectiveWiring(state.rotors[1]), // Middle
    effectiveWiring(state.rotors[2]), // Right
  ], [state.rotors]);

  const reflMap = useMemo(() => reflectorMapping(state.reflector), [state.reflector]);

  // ── DualColumnWiring props ───────────────────────────────────
  const rotorPairs = useMemo(() => [
    { label: 'LEFT', sublabel: state.rotors[0].type, offset: mod(state.rotors[0].position - state.rotors[0].ringSetting) },
    { label: 'MIDDLE', sublabel: state.rotors[1].type, offset: mod(state.rotors[1].position - state.rotors[1].ringSetting) },
    { label: 'RIGHT', sublabel: state.rotors[2].type, offset: mod(state.rotors[2].position - state.rotors[2].ringSetting) },
  ], [state.rotors]);

  const dualTrace: DualColumnTrace | null = useMemo(() => {
    if (!trace) return null;
    return {
      forward: trace.forward,
      backward: trace.backward,
      reflIn: trace.reflIn,
      reflOut: trace.reflOut,
      inputChar: trace.inputChar,
      outputChar: trace.outputChar,
      pbIn: trace.pbIn || undefined,
      pbOut: trace.pbOut || undefined,
    };
  }, [trace]);

  // ── Key handling ──────────────────────────────────────────────
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
    // Keep trace visible -- only clear pressedKey so next key can fire
    setPressedKey(null);
  }, []);

  const handlePasteInput = useCallback((chars: string[]) => {
    let currentState = state;
    const results: string[] = [];
    const historyBatch: MachineState[] = [];
    for (const char of chars) {
      historyBatch.push(currentState);
      const ns = cloneState(currentState);
      stepRotors(ns.rotors);
      const sig = traceSignal(char, ns);
      results.push(sig.outputChar);
      currentState = ns;
    }
    setHistory(prev => [...prev, ...historyBatch]);
    setState(currentState);
    setTape(prev => prev + results.join(''));
    setTrace(null);
    setPressedKey(null);
  }, [state]);

  const handleLoadConfig = useCallback((loadedState: any) => {
    setState(loadedState);
    setHistory([]);
    setTape('');
    setTrace(null);
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

  const setRotorType = (ri: number, type: string) => {
    const rs = [...state.rotors] as MachineState['rotors'];
    rs[ri] = { ...rs[ri], type };
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
      <div className="w-full max-w-5xl">

        {/* ── Header ──────────────────────────────────────────── */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              ENIGMA I <span className="text-amber-500">WIRING EXPLORER</span>
            </h1>
            <p className="text-xs text-slate-500 font-mono tracking-widest">WEHRMACHT — MECHANICALLY ACCURATE SIGNAL TRACER</p>
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

        {/* ── Config Slots ────────────────────────────────────── */}
        <div className="mb-4">
          <ConfigSlots machineId="enigma-i-wiring" currentState={state} onLoadState={handleLoadConfig} accentColor="amber" />
        </div>

        {/* ── Settings Panel ──────────────────────────────────── */}
        {showSettings && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 mb-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { idx: 0, label: 'LEFT (Slow)' },
                { idx: 1, label: 'MIDDLE (Med)' },
                { idx: 2, label: 'RIGHT (Fast)' },
              ].map(slot => (
                <div key={slot.idx} className="space-y-2">
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{slot.label}</div>
                  <select value={state.rotors[slot.idx].type}
                    onChange={e => setRotorType(slot.idx, e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono">
                    {ROTOR_IDS.map(id => <option key={id} value={id}>{id}</option>)}
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
                  onChange={e => setState({ ...state, reflector: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono">
                  {REFLECTOR_IDS.map(id => <option key={id} value={id}>{id}</option>)}
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
            { idx: 0, label: 'Left' },
            { idx: 1, label: 'Mid' },
            { idx: 2, label: 'Right' },
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
          <DualColumnWiring
            rotorPairs={rotorPairs}
            wirings={wirings}
            reflector={reflMap}
            reflectorLabel={state.reflector}
            trace={dualTrace}
            accentColor="#92400e"
          />
        </div>

        {/* ── Signal Path Text ────────────────────────────────── */}
        {trace && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 mb-6">
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-sm">
              <span className="text-amber-400 font-bold">{trace.inputChar}</span>
              {trace.pbIn && (
                <><span className="text-slate-600">&rarr;</span><span className="text-pink-400 text-[10px]">[PB]</span><span className="text-amber-400">{trace.pbIn}</span></>
              )}
              <span className="text-slate-600">&rarr;</span>
              <span className="text-amber-700 text-[10px]">[R]</span>
              <span className="text-amber-300">{toChar(trace.forward[1])}</span>
              <span className="text-slate-600">&rarr;</span>
              <span className="text-amber-700 text-[10px]">[M]</span>
              <span className="text-amber-300">{toChar(trace.forward[2])}</span>
              <span className="text-slate-600">&rarr;</span>
              <span className="text-amber-700 text-[10px]">[L]</span>
              <span className="text-amber-300">{toChar(trace.forward[3])}</span>
              <span className="text-slate-600">&rarr;</span>
              <span className="text-violet-400 font-bold text-[10px]">[UKW]</span>
              <span className="text-violet-400 font-bold">{toChar(trace.reflOut)}</span>
              <span className="text-slate-600">&rarr;</span>
              <span className="text-cyan-700 text-[10px]">[L]</span>
              <span className="text-cyan-300">{toChar(trace.backward[1])}</span>
              <span className="text-slate-600">&rarr;</span>
              <span className="text-cyan-700 text-[10px]">[M]</span>
              <span className="text-cyan-300">{toChar(trace.backward[2])}</span>
              <span className="text-slate-600">&rarr;</span>
              <span className="text-cyan-700 text-[10px]">[R]</span>
              <span className="text-cyan-300">{toChar(trace.backward[3])}</span>
              {trace.pbOut && (
                <><span className="text-slate-600">&rarr;</span><span className="text-pink-400 text-[10px]">[PB]</span></>
              )}
              <span className="text-slate-600">&rarr;</span>
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
                      {a} &harr; {b}
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
        {(
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 mb-6">
            <div className="flex justify-between items-center mb-2">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Output Tape</div>
              <div className="flex items-center gap-2">
                <TapeActions outputText={tape} onProcessInput={handlePasteInput} accentColor="amber" />
                <button onClick={() => { setTape(''); setHistory([]); }}
                  className="text-xs text-slate-500 hover:text-red-400 transition-colors">Clear</button>
              </div>
            </div>
            <div className="font-mono text-lg tracking-widest text-amber-400 break-all">
              {tape ? tape.match(/.{1,5}/g)?.join(' ') : <span className="text-slate-700 text-sm tracking-normal">Type or paste to begin...</span>}
            </div>
          </div>
        )}

        {/* ── Info ─────────────────────────────────────────────── */}
        <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-5 text-xs text-slate-500 space-y-2">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">About the Enigma I</div>
          <p>
            The <span className="text-white">Enigma I</span> (Wehrmacht Enigma) was the standard German military cipher machine
            from 1930 through World War II. It used <span className="text-amber-400">three rotors</span> selected from a set
            of five (I through V), a <span className="text-violet-400">reflector</span> (Umkehrwalze), and a
            <span className="text-pink-400"> plugboard</span> (Steckerbrett) with up to 13 letter-pair connections.
          </p>
          <p>
            The signal travels through the <span className="text-amber-400">plugboard</span>, then
            <span className="text-amber-400"> forward</span> through the right, middle, and left rotors, bounces off
            the <span className="text-violet-400">reflector</span>, then returns <span className="text-cyan-400">backward</span> through
            the left, middle, and right rotors, and passes through the plugboard again. The reflector ensures the cipher
            is <span className="text-white">reciprocal</span> (decryption uses the same settings as encryption), but also
            means a letter can never encrypt to itself.
          </p>
          <p>
            The <span className="text-white">double-stepping mechanism</span> is a key feature: the right rotor steps every
            keypress, the middle rotor steps when the right rotor passes its notch, and the left rotor steps when the
            middle rotor passes its notch. The middle rotor also steps when it is itself at its notch position (the
            "double step"), creating an irregular stepping pattern that was intended to increase security.
          </p>
          <p className="text-slate-600">
            Tip: Open CONFIG to select different rotors, adjust ring settings, choose a reflector, and configure plugboard
            connections. Each rotor's notch position determines when the next rotor advances.
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;
