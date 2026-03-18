import React, { useState, useEffect, useCallback } from 'react';
import { Eraser, Info, Eye, EyeOff } from 'lucide-react';
import ConfigSlots from '../shared/ConfigSlots';
import TapeActions from '../shared/TapeActions';
import { MachineState } from './types';
import { SIXES_CHARS, TWENTIES_CHARS, SIXES_WIRINGS, TWENTIES_WIRINGS } from './constants';
import { encryptCharacter, decryptCharacter } from './services/redService';
import { SwitchDisplay } from './components/SwitchDisplay';
import { Lampboard } from './components/Lampboard';
import { Keyboard } from './components/Keyboard';
import { Tape } from './components/Tape';

const createInitialState = (): MachineState => ({
  sixes: { position: 0, size: SIXES_WIRINGS.length, wiring: SIXES_WIRINGS },
  twenties: { position: 0, size: TWENTIES_WIRINGS.length, wiring: TWENTIES_WIRINGS },
  halfRotor: 0,
});

function App() {
  const [machineState, setMachineState] = useState<MachineState>(createInitialState());
  const [stateHistory, setStateHistory] = useState<MachineState[]>([]);
  const [litChar, setLitChar] = useState<string | null>(null);
  const [tapeText, setTapeText] = useState('');
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const [showInfo, setShowInfo] = useState(false);
  const [showSwitches, setShowSwitches] = useState(false);
  const [decrypt, setDecrypt] = useState(false);

  const handleKeyDown = useCallback((char: string) => {
    if (pressedKeys.has(char)) return;
    setStateHistory(prev => [...prev, machineState]);
    const processFn = decrypt ? decryptCharacter : encryptCharacter;
    const { result, newState } = processFn(char, machineState);
    setMachineState(newState);
    setLitChar(result);
    setTapeText(prev => prev + result);
    setPressedKeys(prev => new Set(prev).add(char));
  }, [machineState, pressedKeys]);

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

  const handleStepSixes = (delta: number) => {
    const newPos = (machineState.sixes.position + delta + machineState.sixes.size) % machineState.sixes.size;
    setMachineState({ ...machineState, sixes: { ...machineState.sixes, position: newPos } });
  };

  const handleStepTwenties = (delta: number) => {
    const newPos = (machineState.twenties.position + delta + machineState.twenties.size) % machineState.twenties.size;
    setMachineState({ ...machineState, twenties: { ...machineState.twenties, position: newPos } });
  };

  const handlePasteInput = useCallback((chars: string[]) => {
    const processFn = decrypt ? decryptCharacter : encryptCharacter;
    let currentState = machineState;
    const results: string[] = [];
    const history: MachineState[] = [];
    for (const char of chars) {
      history.push(currentState);
      const { result, newState } = processFn(char, currentState);
      results.push(result);
      currentState = newState;
    }
    setStateHistory(prev => [...prev, ...history]);
    setMachineState(currentState);
    setTapeText(prev => prev + results.join(''));
  }, [machineState, decrypt]);

  const handleLoadConfig = useCallback((saved: any) => {
    const { machineState: savedMachineState, decrypt: savedDecrypt } = saved;
    setMachineState(savedMachineState);
    setDecrypt(savedDecrypt ?? false);
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

  return (
    <div className="flex-1 bg-[#161018] flex flex-col items-center justify-start py-10 px-6 text-neutral-200">
      {/* Header */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-8">
        <div className="flex flex-col">
          <h1 className="text-3xl sm:text-4xl font-typewriter font-bold text-neutral-100 tracking-tighter">
            RED <span className="text-rose-500">TYPE 91</span>
          </h1>
          <span className="text-neutral-500 text-xs tracking-[0.3em] font-mono">JAPANESE DIPLOMATIC CIPHER</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setDecrypt(d => !d)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-xs transition-all border ${
              decrypt ? 'bg-amber-900/50 border-amber-700 text-amber-300' : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white'
            }`}
          >
            {decrypt ? 'DECRYPT' : 'ENCRYPT'}
          </button>
          <button
            onClick={() => setShowSwitches(!showSwitches)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-xs transition-all border ${
              showSwitches ? 'bg-rose-900/50 border-rose-700 text-rose-300' : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white'
            }`}
          >
            {showSwitches ? <EyeOff size={16} /> : <Eye size={16} />}
            <span className="hidden sm:inline">Switches</span>
          </button>
          <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-lg hover:bg-neutral-800 text-neutral-400 transition-colors border border-neutral-700">
            <Info size={20} />
          </button>
        </div>
      </div>

      {/* Config Slots */}
      <div className="w-full max-w-4xl mb-4">
        <ConfigSlots machineId="red" currentState={{ machineState, decrypt }} onLoadState={handleLoadConfig} accentColor="rose" />
      </div>

      {/* Machine */}
      <div className="w-full max-w-3xl flex flex-col gap-10 relative z-0">
        {/* Switch displays */}
        {showSwitches && (
          <div className="grid md:grid-cols-2 gap-4">
            <SwitchDisplay label="Sixes (Vowels)" chars={SIXES_CHARS} switchState={machineState.sixes} color="text-rose-400" onStep={handleStepSixes} />
            <SwitchDisplay label="Twenties (Consonants)" chars={TWENTIES_CHARS} switchState={machineState.twenties} color="text-indigo-400" onStep={handleStepTwenties} />
          </div>
        )}

        {/* Lampboard */}
        <div className="relative">
          <div className="absolute inset-0 bg-black/40 blur-xl rounded-full transform scale-y-75 z-[-1]"></div>
          <Lampboard litChar={litChar} />
        </div>

        {/* Keyboard */}
        <div className="bg-neutral-900/50 p-4 rounded-3xl border border-neutral-800 shadow-2xl">
          <Keyboard onMouseDown={handleKeyDown} onMouseUp={handleKeyUp} isPressed={c => pressedKeys.has(c)} />
        </div>

        {/* Tape */}
        <div className="relative group">
          <Tape text={tapeText} />
          <div className="absolute top-1/2 -translate-y-1/2 -right-12 sm:-right-20 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleClearTape}
              className="text-neutral-600 hover:text-red-400 p-1.5 transition-colors"
              title="Clear Tape"
            >
              <Eraser size={20} />
            </button>
            <TapeActions outputText={tapeText} onProcessInput={handlePasteInput} accentColor="rose" />
          </div>
        </div>
      </div>

      {/* Info Panel */}
      <div className={`fixed bottom-0 left-0 right-0 bg-neutral-900/95 backdrop-blur border-t border-neutral-700 p-6 transform transition-transform duration-300 z-40 ${showInfo ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="max-w-3xl mx-auto relative">
          <button onClick={() => setShowInfo(false)} className="absolute top-0 right-0 p-2 text-neutral-500 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <h3 className="text-xl font-bold text-rose-400 mb-2">About the RED Machine (Type 91)</h3>
          <p className="text-sm text-neutral-300 mb-4 leading-relaxed">
            The <strong>RED machine</strong> (Type 91) was Japan's first major cipher machine, used for diplomatic
            communications from 1931. It pioneered the use of <strong>telephone stepping switches</strong> instead
            of rotors. The alphabet was split into <strong>"sixes"</strong> (6 vowels: A, E, I, O, U, Y) and
            <strong>"twenties"</strong> (20 consonants), each encrypted by separate switch banks. This fatal
            weakness — vowels always encrypted to vowels — allowed the US Signal Intelligence Service to break it
            by 1935, leading to its replacement by the Purple machine.
          </p>
          <div className="grid grid-cols-2 gap-4 text-xs font-mono text-neutral-500">
            <div>* Sixes: vowels (AEIOUY) encrypted separately.</div>
            <div>* Twenties: consonants encrypted separately.</div>
            <div>* Stepping switches instead of rotors.</div>
            <div>* Broken by SIS in 1935; replaced by Purple in 1939.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
