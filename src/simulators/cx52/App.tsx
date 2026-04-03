import React, { useState, useEffect, useCallback } from 'react';
import { Eraser, Info, Eye, EyeOff } from 'lucide-react';
import ExhibitPanel from '../../components/ExhibitPanel';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// CX-52: 6 pin wheels with irregular pin counts, and a sliding bar cage (drum) with 32 bars
// Each wheel has a different number of pins (prime-ish numbers for irregular stepping)
const WHEEL_SIZES = [47, 53, 59, 61, 64, 65]; // historically accurate pin counts
const WHEEL_LABELS = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'];

interface WheelState {
  pins: boolean[]; // active pins
  position: number;
}

interface BarState {
  lugs: boolean[]; // which wheels each bar engages (6 booleans)
}

interface MachineState {
  wheels: WheelState[];
  bars: BarState[];
}

function createDefaultPins(size: number, seed: number): boolean[] {
  const pins: boolean[] = [];
  let s = seed;
  for (let i = 0; i < size; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    pins.push(s % 3 !== 0); // ~2/3 active
  }
  return pins;
}

function createDefaultBars(): BarState[] {
  const bars: BarState[] = [];
  for (let i = 0; i < 32; i++) {
    const lugs: boolean[] = [false, false, false, false, false, false];
    // Each bar engages 1-2 wheels
    lugs[i % 6] = true;
    if (i % 3 === 0) lugs[(i + 2) % 6] = true;
    bars.push({ lugs });
  }
  return bars;
}

function createInitialState(): MachineState {
  return {
    wheels: WHEEL_SIZES.map((size, i) => ({
      pins: createDefaultPins(size, (i + 1) * 7919),
      position: 0,
    })),
    bars: createDefaultBars(),
  };
}

function encryptCharacter(char: string, state: MachineState, decrypt: boolean): { result: string; newState: MachineState } {
  const upper = char.toUpperCase();
  if (!ALPHABET.includes(upper)) return { result: char, newState: state };

  // Step all wheels
  const newWheels = state.wheels.map(w => ({
    ...w,
    position: (w.position + 1) % w.pins.length,
  }));

  // Check which wheels have active pin at current position
  const activePins = newWheels.map(w => w.pins[w.position]);

  // Count engaged bars: a bar is engaged if ANY of its lugged wheels has an active pin
  let shift = 0;
  for (const bar of state.bars) {
    let engaged = false;
    for (let w = 0; w < 6; w++) {
      if (bar.lugs[w] && activePins[w]) {
        engaged = true;
        break;
      }
    }
    if (engaged) shift++;
  }

  const charIndex = ALPHABET.indexOf(upper);
  let resultIndex: number;
  if (!decrypt) {
    resultIndex = (charIndex + shift) % 26;
  } else {
    resultIndex = (charIndex - shift + 26) % 26;
  }
  const result = ALPHABET[resultIndex];

  return {
    result,
    newState: { ...state, wheels: newWheels },
  };
}

function App() {
  const [machineState, setMachineState] = useState<MachineState>(createInitialState());
  const [stateHistory, setStateHistory] = useState<MachineState[]>([]);
  const [litChar, setLitChar] = useState<string | null>(null);
  const [tapeText, setTapeText] = useState('');
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const [showInfo, setShowInfo] = useState(false);
  const [showInternals, setShowInternals] = useState(false);
  const [decrypt, setDecrypt] = useState(false);

  const handleKeyDown = useCallback((char: string) => {
    if (pressedKeys.has(char)) return;
    setStateHistory(prev => [...prev, machineState]);
    const { result, newState } = encryptCharacter(char, machineState, decrypt);
    setMachineState(newState);
    setLitChar(result);
    setTapeText(prev => prev + result);
    setPressedKeys(prev => new Set(prev).add(char));
  }, [machineState, pressedKeys, decrypt]);

  const handleKeyUp = useCallback((char: string) => {
    setLitChar(null);
    setPressedKeys(prev => { const n = new Set(prev); n.delete(char); return n; });
  }, []);

  const handleBackspace = useCallback(() => {
    if (stateHistory.length === 0) return;
    setMachineState(stateHistory[stateHistory.length - 1]);
    setStateHistory(prev => prev.slice(0, -1));
    setTapeText(prev => prev.slice(0, -1));
    setLitChar(null);
  }, [stateHistory]);

  useEffect(() => {
    const isInputFocused = () => {
      const tag = document.activeElement?.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (isInputFocused()) return;
      const char = e.key.toUpperCase();
      if (/^[A-Z]$/.test(char) && !e.repeat && !e.metaKey && !e.ctrlKey && !e.altKey) handleKeyDown(char);
      if (e.key === 'Backspace') handleBackspace();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (isInputFocused()) return;
      const char = e.key.toUpperCase();
      if (/^[A-Z]$/.test(char)) handleKeyUp(char);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); };
  }, [handleKeyDown, handleKeyUp, handleBackspace]);

  const handleClearTape = () => {
    if (stateHistory.length > 0) setMachineState(stateHistory[0]);
    setStateHistory([]);
    setTapeText('');
    setLitChar(null);
  };

  const handleRandomize = () => {
    const seed = Date.now();
    setMachineState({
      wheels: WHEEL_SIZES.map((size, i) => ({
        pins: createDefaultPins(size, seed + i * 997),
        position: 0,
      })),
      bars: createDefaultBars(),
    });
    setStateHistory([]);
    setTapeText('');
    setLitChar(null);
  };

  // Compute current shift for display
  const activePins = machineState.wheels.map(w => w.pins[w.position]);
  let currentShift = 0;
  for (const bar of machineState.bars) {
    let engaged = false;
    for (let w = 0; w < 6; w++) {
      if (bar.lugs[w] && activePins[w]) { engaged = true; break; }
    }
    if (engaged) currentShift++;
  }

  const KEYBOARD_ROWS = [
    'QWERTYUIOP'.split(''),
    'ASDFGHJKL'.split(''),
    'ZXCVBNM'.split(''),
  ];

  return (
    <div className="flex-1 bg-[#12140e] flex flex-col">
      <ExhibitPanel id="cx52" />
      <div className="bg-[#12140e] flex flex-col items-center justify-start py-10 px-6 text-stone-200">
      {/* Header */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-8">
        <div className="flex flex-col">
          <h1 className="text-3xl sm:text-4xl font-typewriter font-bold text-stone-100 tracking-tighter">
            HAGELIN <span className="text-amber-400">CX-52</span>
          </h1>
          <span className="text-stone-500 text-xs tracking-[0.3em] font-mono">CRYPTO AG — COLD WAR ERA</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setDecrypt(d => !d)}
            className={`px-3 py-2 rounded-lg font-bold text-xs transition-all border ${
              decrypt ? 'bg-amber-900/50 border-amber-700 text-amber-300' : 'bg-stone-800 border-stone-700 text-stone-400 hover:text-white'
            }`}
          >
            {decrypt ? 'DECRYPT' : 'ENCRYPT'}
          </button>
          <button
            onClick={() => setShowInternals(!showInternals)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-xs transition-all border ${
              showInternals ? 'bg-amber-900/50 border-amber-700 text-amber-300' : 'bg-stone-800 border-stone-700 text-stone-400 hover:text-white'
            }`}
          >
            {showInternals ? <EyeOff size={16} /> : <Eye size={16} />}
            <span className="hidden sm:inline">Internals</span>
          </button>
          <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-lg hover:bg-stone-800 text-stone-400 border border-stone-700">
            <Info size={20} />
          </button>
        </div>
      </div>

      <div className="w-full max-w-3xl flex flex-col gap-8 relative z-0">
        {/* Wheel positions */}
        <div className="bg-stone-900/60 rounded-xl border border-stone-800 p-5">
          <div className="flex justify-between items-center mb-3">
            <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold">Pin Wheels — Current Shift: <span className="text-amber-400">{currentShift}</span></div>
            <button onClick={handleRandomize} className="text-[10px] text-amber-400 hover:text-amber-300 font-bold uppercase tracking-wider">Randomize</button>
          </div>
          <div className="grid grid-cols-6 gap-2">
            {machineState.wheels.map((wheel, wi) => (
              <div key={wi} className="flex flex-col items-center">
                <div className="text-[9px] font-mono text-stone-500 mb-1">{WHEEL_LABELS[wi]} ({WHEEL_SIZES[wi]})</div>
                <div className={`w-full h-12 rounded-lg border flex items-center justify-center font-mono text-lg font-bold ${
                  activePins[wi]
                    ? 'bg-amber-900/40 border-amber-700/60 text-amber-300'
                    : 'bg-stone-800/50 border-stone-700 text-stone-500'
                }`}>
                  {wheel.position}
                </div>
                <div className="text-[9px] font-mono mt-1 text-stone-600">
                  pin: {activePins[wi] ? <span className="text-amber-400">ON</span> : 'off'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Internals: bar/lug display */}
        {showInternals && (
          <div className="bg-stone-900/60 rounded-xl border border-stone-800 p-5 overflow-x-auto">
            <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-3">Drum Bars (32) — Lug Engagement</div>
            <div className="inline-block min-w-full">
              <div className="flex gap-px mb-1">
                <div className="w-10 shrink-0" />
                {WHEEL_LABELS.map(l => (
                  <div key={l} className="w-7 text-center text-[9px] font-mono text-stone-500">{l}</div>
                ))}
                <div className="w-8 text-center text-[9px] font-mono text-stone-500 ml-2">Hit</div>
              </div>
              {machineState.bars.map((bar, bi) => {
                let engaged = false;
                for (let w = 0; w < 6; w++) {
                  if (bar.lugs[w] && activePins[w]) { engaged = true; break; }
                }
                return (
                  <div key={bi} className={`flex gap-px mb-px ${engaged ? 'bg-amber-950/30' : ''}`}>
                    <div className="w-10 shrink-0 text-[9px] font-mono text-stone-600 flex items-center">{bi + 1}</div>
                    {bar.lugs.map((lug, wi) => (
                      <div key={wi} className={`w-7 h-5 rounded-sm flex items-center justify-center text-[10px] font-mono ${
                        lug
                          ? (activePins[wi] ? 'bg-amber-600/40 text-amber-300' : 'bg-stone-700/60 text-stone-400')
                          : 'bg-stone-800/20 text-stone-800'
                      }`}>
                        {lug ? '\u2022' : ''}
                      </div>
                    ))}
                    <div className={`w-8 text-center text-[9px] font-mono ml-2 flex items-center justify-center ${engaged ? 'text-amber-400 font-bold' : 'text-stone-700'}`}>
                      {engaged ? 'YES' : '-'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Lampboard */}
        <div className="bg-stone-950 rounded-2xl border border-stone-800 p-6 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)]">
          <div className="flex flex-wrap justify-center gap-1.5">
            {ALPHABET.split('').map(c => (
              <div
                key={c}
                className={`w-9 h-9 rounded-full flex items-center justify-center font-mono text-sm font-bold border transition-all duration-100 ${
                  litChar === c
                    ? 'bg-amber-400 text-stone-900 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.6)]'
                    : 'bg-stone-800/40 text-stone-500 border-stone-700'
                }`}
              >
                {c}
              </div>
            ))}
          </div>
        </div>

        {/* Keyboard */}
        <div className="bg-stone-900/50 p-4 rounded-3xl border border-stone-800 shadow-2xl">
          {KEYBOARD_ROWS.map((row, ri) => (
            <div key={ri} className="flex justify-center gap-1.5 mb-1.5" style={{ paddingLeft: ri * 12 }}>
              {row.map(c => (
                <button
                  key={c}
                  onMouseDown={() => handleKeyDown(c)}
                  onMouseUp={() => handleKeyUp(c)}
                  onMouseLeave={() => handleKeyUp(c)}
                  className={`w-10 h-10 rounded-lg font-mono text-sm font-bold border transition-all ${
                    pressedKeys.has(c)
                      ? 'bg-stone-600 border-stone-500 text-white translate-y-[1px]'
                      : 'bg-stone-800 border-stone-700 text-stone-300 hover:bg-stone-700'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Tape */}
        <div className="relative group">
          <div className="bg-amber-50/[0.03] rounded-xl border border-stone-800 p-4">
            <div className="font-mono text-lg tracking-[0.3em] text-amber-200/80 min-h-[2rem] break-all">
              {tapeText || <span className="text-stone-700 tracking-normal text-sm">Type on the keyboard...</span>}
            </div>
          </div>
          <button onClick={handleClearTape} className="absolute top-1/2 -translate-y-1/2 -right-12 sm:-right-16 text-stone-600 hover:text-red-400 p-2 transition-colors opacity-0 group-hover:opacity-100">
            <Eraser size={24} />
          </button>
        </div>
      </div>

      {/* Info Panel */}
      <div className={`fixed bottom-0 left-0 right-0 bg-stone-900/95 backdrop-blur border-t border-stone-700 p-6 transform transition-transform duration-300 z-40 ${showInfo ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="max-w-3xl mx-auto relative">
          <button onClick={() => setShowInfo(false)} className="absolute top-0 right-0 p-2 text-stone-500 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <h3 className="text-xl font-bold text-amber-400 mb-2">About the Hagelin CX-52</h3>
          <p className="text-sm text-stone-300 mb-4 leading-relaxed">
            The <strong>CX-52</strong> was Boris Hagelin's improved cipher machine, successor to the WWII-era M-209.
            Manufactured by <strong>Crypto AG</strong> in Switzerland, it was sold to over 60 countries during the
            Cold War. In one of history's greatest intelligence coups — <strong>Operation Rubicon</strong> — the CIA
            and BND (West German intelligence) secretly purchased Crypto AG in 1970 and deliberately weakened the
            machines sold to foreign governments, reading their encrypted communications for decades. The operation
            wasn't revealed until a 2020 investigation. The CX-52 uses 6 pin wheels of different sizes (47 to 65 pins)
            and a cage of 32 sliding bars with lugs, creating a variable shift cipher far more complex than the M-209.
          </p>
          <div className="grid grid-cols-2 gap-4 text-xs font-mono text-stone-500">
            <div>* 6 pin wheels (47, 53, 59, 61, 64, 65 pins).</div>
            <div>* 32-bar drum cage with configurable lugs.</div>
            <div>* Successor to the M-209 (Hagelin C-38).</div>
            <div>* Secretly backdoored by CIA (Operation Rubicon).</div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

export default App;
