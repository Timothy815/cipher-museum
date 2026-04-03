import React, { useState, useEffect, useCallback } from 'react';
import { Eraser, Info, Settings } from 'lucide-react';
import ConfigSlots from '../shared/ConfigSlots';
import TapeActions from '../shared/TapeActions';
import ExhibitPanel from '../../components/ExhibitPanel';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// KL-7: 8 rotors (historically ADONIS), each with 36 contacts and multiple notches
const ROTOR_SIZE = 36; // 36 contacts (26 letters + 10 figures, we'll use 26 for letter mode)

// Generate 8 rotor wirings deterministically
function generateRotorWiring(seed: number): number[] {
  const wiring = Array.from({ length: 26 }, (_, i) => i);
  let s = seed;
  for (let i = 25; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [wiring[i], wiring[j]] = [wiring[j], wiring[i]];
  }
  return wiring;
}

function invertWiring(wiring: number[]): number[] {
  const inv = new Array(wiring.length);
  for (let i = 0; i < wiring.length; i++) inv[wiring[i]] = i;
  return inv;
}

// Each rotor has multiple notches for irregular stepping
function generateNotches(seed: number, count: number): number[] {
  const notches: Set<number> = new Set();
  let s = seed;
  while (notches.size < count) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    notches.add(s % 26);
  }
  return Array.from(notches).sort((a, b) => a - b);
}

interface RotorConfig {
  wiring: number[];
  inverseWiring: number[];
  notches: number[];
  position: number;
}

const ROTOR_BANK: RotorConfig[] = Array.from({ length: 12 }, (_, i) => {
  const wiring = generateRotorWiring((i + 1) * 4957);
  return {
    wiring,
    inverseWiring: invertWiring(wiring),
    notches: generateNotches((i + 1) * 3571, 3 + (i % 3)), // 3-5 notches each
    position: 0,
  };
});

interface MachineState {
  rotors: RotorConfig[]; // 8 active rotors
}

function createInitialState(): MachineState {
  return {
    rotors: [0, 1, 2, 3, 4, 5, 6, 7].map(i => ({ ...ROTOR_BANK[i], position: 0 })),
  };
}

function stepRotors(rotors: RotorConfig[]): RotorConfig[] {
  const newRotors = rotors.map(r => ({ ...r }));

  // Rotor 0 (rightmost) always steps
  newRotors[0] = { ...newRotors[0], position: (newRotors[0].position + 1) % 26 };

  // Each subsequent rotor steps if the previous rotor is at a notch position
  for (let i = 1; i < 8; i++) {
    if (newRotors[i - 1].notches.includes(newRotors[i - 1].position)) {
      newRotors[i] = { ...newRotors[i], position: (newRotors[i].position + 1) % 26 };
    }
  }

  return newRotors;
}

function processCharacter(char: string, state: MachineState, decrypt: boolean): { result: string; newState: MachineState } {
  const upper = char.toUpperCase();
  if (!ALPHABET.includes(upper)) return { result: char, newState: state };

  const newRotors = stepRotors(state.rotors);
  let signal = ALPHABET.indexOf(upper);

  if (!decrypt) {
    // Forward through all 8 rotors
    for (let i = 0; i < 8; i++) {
      const r = newRotors[i];
      signal = (signal + r.position) % 26;
      signal = r.wiring[signal];
      signal = (signal - r.position + 26) % 26;
    }
  } else {
    // Backward through all 8 rotors
    for (let i = 7; i >= 0; i--) {
      const r = newRotors[i];
      signal = (signal + r.position) % 26;
      signal = r.inverseWiring[signal];
      signal = (signal - r.position + 26) % 26;
    }
  }

  return {
    result: ALPHABET[signal],
    newState: { rotors: newRotors },
  };
}

function App() {
  const [machineState, setMachineState] = useState<MachineState>(createInitialState());
  const [stateHistory, setStateHistory] = useState<MachineState[]>([]);
  const [litChar, setLitChar] = useState<string | null>(null);
  const [tapeText, setTapeText] = useState('');
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const [showInfo, setShowInfo] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [decrypt, setDecrypt] = useState(false);

  const handleKeyDown = useCallback((char: string) => {
    if (pressedKeys.has(char)) return;
    setStateHistory(prev => [...prev, machineState]);
    const { result, newState } = processCharacter(char, machineState, decrypt);
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

  const handlePasteInput = useCallback((chars: string[]) => {
    let currentState = machineState;
    const results: string[] = [];
    const history: MachineState[] = [];
    for (const char of chars) {
      history.push(currentState);
      const { result, newState } = processCharacter(char, currentState, decrypt);
      results.push(result);
      currentState = newState;
    }
    setStateHistory(prev => [...prev, ...history]);
    setMachineState(currentState);
    setTapeText(prev => prev + results.join(''));
  }, [machineState, decrypt]);

  const handleLoadConfig = useCallback((state: any) => {
    setMachineState(state);
    setTapeText('');
    setStateHistory([]);
    setLitChar(null);
  }, []);

  const handleClearTape = () => {
    if (stateHistory.length > 0) setMachineState(stateHistory[0]);
    setStateHistory([]);
    setTapeText('');
    setLitChar(null);
  };

  const handleRotorChange = (index: number, rotorId: number) => {
    const newRotors = [...machineState.rotors];
    newRotors[index] = { ...ROTOR_BANK[rotorId], position: newRotors[index].position };
    setMachineState({ rotors: newRotors });
  };

  const handlePositionChange = (index: number, pos: number) => {
    const newRotors = [...machineState.rotors];
    newRotors[index] = { ...newRotors[index], position: pos };
    setMachineState({ rotors: newRotors });
  };

  const KEYBOARD_ROWS = [
    'QWERTYUIOP'.split(''),
    'ASDFGHJKL'.split(''),
    'ZXCVBNM'.split(''),
  ];

  return (
    <div className="flex-1 bg-[#0e1218] flex flex-col">
      <ExhibitPanel id="kl7" />
      <div className="bg-[#0e1218] flex flex-col items-center justify-start py-10 px-6 text-slate-200">
      {/* Header */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-8">
        <div className="flex flex-col">
          <h1 className="text-3xl sm:text-4xl font-typewriter font-bold text-slate-100 tracking-tighter">
            KL-7 <span className="text-blue-400">ADONIS</span>
          </h1>
          <span className="text-slate-500 text-xs tracking-[0.3em] font-mono">NATO CIPHER MACHINE — 1952-1983</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setDecrypt(d => !d)}
            className={`px-3 py-2 rounded-lg font-bold text-xs transition-all border ${
              decrypt ? 'bg-blue-900/50 border-blue-700 text-blue-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            {decrypt ? 'DECRYPT' : 'ENCRYPT'}
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-xs transition-all border ${
              showSettings ? 'bg-blue-900/50 border-blue-700 text-blue-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <Settings size={16} />
          </button>
          <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 border border-slate-700">
            <Info size={20} />
          </button>
        </div>
      </div>

      {/* Config Slots */}
      <div className="w-full max-w-4xl mb-4">
        <ConfigSlots machineId="kl7" currentState={machineState} onLoadState={handleLoadConfig} accentColor="blue" />
      </div>

      <div className="w-full max-w-3xl flex flex-col gap-8 relative z-0">
        {/* 8 Rotors */}
        <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-5">
          <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">8-Rotor Assembly</div>
          <div className="grid grid-cols-8 gap-1.5">
            {machineState.rotors.map((rotor, i) => {
              const atNotch = rotor.notches.includes(rotor.position);
              return (
                <div key={i} className="flex flex-col items-center">
                  <div className="text-[9px] font-mono text-slate-500 mb-1">R{i + 1}</div>
                  <button
                    onClick={() => handlePositionChange(i, (rotor.position + 1) % 26)}
                    className="text-slate-600 hover:text-blue-400 text-xs mb-0.5"
                  >
                    &#9650;
                  </button>
                  <div className={`w-full h-12 rounded-lg border flex items-center justify-center font-mono text-lg font-bold ${
                    atNotch
                      ? 'bg-blue-900/40 border-blue-600/60 text-blue-300'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300'
                  }`}>
                    {ALPHABET[rotor.position]}
                  </div>
                  <button
                    onClick={() => handlePositionChange(i, (rotor.position - 1 + 26) % 26)}
                    className="text-slate-600 hover:text-blue-400 text-xs mt-0.5"
                  >
                    &#9660;
                  </button>
                  {atNotch && <div className="text-[8px] text-blue-400 font-mono mt-0.5">notch</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-5">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">Rotor Selection (12 available)</div>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
              {machineState.rotors.map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <label className="text-[9px] font-mono text-slate-500">R{i + 1}</label>
                  <select
                    value={ROTOR_BANK.findIndex(rb => rb.wiring === machineState.rotors[i].wiring)}
                    onChange={e => handleRotorChange(i, Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-1 py-1 text-xs font-mono text-blue-300 focus:outline-none"
                  >
                    {ROTOR_BANK.map((_, ri) => (
                      <option key={ri} value={ri}>#{ri + 1}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lampboard */}
        <div className="bg-slate-950 rounded-2xl border border-slate-800 p-6 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)]">
          <div className="flex flex-wrap justify-center gap-1.5">
            {ALPHABET.split('').map(c => (
              <div
                key={c}
                className={`w-9 h-9 rounded-full flex items-center justify-center font-mono text-sm font-bold border transition-all duration-100 ${
                  litChar === c
                    ? 'bg-blue-400 text-slate-900 border-blue-300 shadow-[0_0_15px_rgba(96,165,250,0.6)]'
                    : 'bg-slate-800/40 text-slate-500 border-slate-700'
                }`}
              >
                {c}
              </div>
            ))}
          </div>
        </div>

        {/* Keyboard */}
        <div className="bg-slate-900/50 p-4 rounded-3xl border border-slate-800 shadow-2xl">
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
                      ? 'bg-slate-600 border-slate-500 text-white translate-y-[1px]'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
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
          <div className="bg-blue-50/[0.03] rounded-xl border border-slate-800 p-4">
            <div className="font-mono text-lg tracking-[0.3em] text-blue-200/80 min-h-[2rem] break-all">
              {tapeText || <span className="text-slate-700 tracking-normal text-sm">Type on the keyboard...</span>}
            </div>
          </div>
          <div className="absolute top-1/2 -translate-y-1/2 -right-12 sm:-right-20 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleClearTape}
              className="text-slate-600 hover:text-red-400 p-1.5 transition-colors"
              title="Clear Tape"
            >
              <Eraser size={20} />
            </button>
            <TapeActions outputText={tapeText} onProcessInput={handlePasteInput} accentColor="blue" />
          </div>
        </div>
      </div>

      {/* Info Panel */}
      <div className={`fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-700 p-6 transform transition-transform duration-300 z-40 ${showInfo ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="max-w-3xl mx-auto relative">
          <button onClick={() => setShowInfo(false)} className="absolute top-0 right-0 p-2 text-slate-500 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <h3 className="text-xl font-bold text-blue-400 mb-2">About the KL-7 (ADONIS)</h3>
          <p className="text-sm text-slate-300 mb-4 leading-relaxed">
            The <strong>KL-7</strong>, codenamed <strong>ADONIS</strong>, was NATO's primary cipher machine from 1952
            to 1983. It used <strong>8 rotors</strong> selected from a set of 12, each with multiple notches creating
            highly irregular stepping patterns. The machine processed both letters and figures via 36-contact rotors.
            It was used by all NATO nations for classified communications and was considered highly secure for its era.
            The KL-7 was only retired when electronic cipher systems became practical. In 2003, a former US Navy
            warrant officer (<strong>John Walker</strong>) was revealed to have sold KL-7 key material to the Soviets
            — one of the most damaging espionage cases of the Cold War.
          </p>
          <div className="grid grid-cols-2 gap-4 text-xs font-mono text-slate-500">
            <div>* 8 rotors from a set of 12 available.</div>
            <div>* Multiple notches per rotor — irregular stepping.</div>
            <div>* Used by all NATO nations for 30 years.</div>
            <div>* Compromised by the Walker spy ring.</div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

export default App;
