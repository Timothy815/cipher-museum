import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Settings, RotateCcw, ChevronUp, ChevronDown } from 'lucide-react';
import { ROTOR_WIRINGS, REFLECTOR_WIRING, ALPHABET } from '../fialka/constants';
import { DualColumnWiring, DualColumnTrace } from '../shared/DualColumnWiring';
import ConfigSlots from '../shared/ConfigSlots';
import TapeActions from '../shared/TapeActions';

// ── Helpers ────────────────────────────────────────────────────────
const toIndex = (c: string) => c.charCodeAt(0) - 65;
const toChar = (i: number) => String.fromCharCode(((i % 26) + 26) % 26 + 65);
const mod = (n: number) => ((n % 26) + 26) % 26;

const KEYBOARD_LAYOUT = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

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

  // ── DualColumnWiring props ──────────────────────────────────
  const dualWirings = useMemo(() =>
    rotors.map(r =>
      computeEffectiveWiring(
        ROTOR_WIRINGS[r.id].wiring,
        r.reversed,
        r.position,
        r.ringSetting,
      )
    ), [rotors]);

  const reflMap = useMemo(() => reflectorMapping(), []);

  const rotorPairs = useMemo(() =>
    rotors.map((r, i) => ({
      label: `R${r.id}`,
      sublabel: r.reversed ? 'REV' : String.fromCharCode(mod(r.position) + 65),
      offset: mod(r.position - r.ringSetting),
    })), [rotors]);

  const dualTrace: DualColumnTrace | null = useMemo(() => {
    if (!trace) return null;
    return {
      forward: trace.forward,
      backward: trace.backward,
      reflIn: trace.reflIn,
      reflOut: trace.reflOut,
      inputChar: trace.inputChar,
      outputChar: trace.outputChar,
    };
  }, [trace]);

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

  const handlePasteInput = useCallback((chars: string[]) => {
    let currentRotors = rotors;
    const results: string[] = [];
    const historyBatch: RotorState[][] = [];
    for (const char of chars) {
      historyBatch.push(currentRotors);
      const newRotors = stepRotors(currentRotors);
      const sig = traceSignal(char, newRotors);
      results.push(sig.outputChar);
      currentRotors = newRotors;
    }
    setHistory(prev => [...prev, ...historyBatch]);
    setRotors(currentRotors);
    setTape(prev => prev + results.join(''));
    setTrace(null);
    setPressedKey(null);
  }, [rotors]);

  const handleLoadConfig = useCallback((loadedState: any) => {
    setRotors(loadedState);
    setHistory([]);
    setTape('');
    setTrace(null);
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
            <p className="text-xs text-slate-500 font-mono tracking-widest">M-125 — MECHANICALLY ACCURATE SIGNAL TRACER</p>
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

        {/* Config Slots */}
        <div className="mb-4">
          <ConfigSlots machineId="fialka-wiring" currentState={rotors} onLoadState={handleLoadConfig} accentColor="red" />
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
          <DualColumnWiring
            rotorPairs={rotorPairs}
            wirings={dualWirings}
            reflector={reflMap}
            reflectorLabel="UKW"
            trace={dualTrace}
            accentColor="#9f1239"
          />
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
              <div className="flex items-center gap-2">
                <TapeActions outputText={tape} onProcessInput={handlePasteInput} accentColor="red" />
                <button onClick={() => { setTape(''); setHistory([]); }}
                  className="text-xs text-slate-500 hover:text-red-400 transition-colors">Clear</button>
              </div>
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
