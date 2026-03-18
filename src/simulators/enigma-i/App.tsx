import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Eraser, Info, Eye, EyeOff } from 'lucide-react';
import ConfigSlots from '../shared/ConfigSlots';
import TapeActions from '../shared/TapeActions';
import { MachineState, RotorConfig, RotorType, ReflectorType } from './types';
import { ROTOR_DATA } from './constants';
import { encryptCharacter } from './services/enigmaService';
import { RotorAssembly } from './components/RotorAssembly';
import { Lampboard } from './components/Lampboard';
import { Keyboard } from './components/Keyboard';
import { Tape } from './components/Tape';
import { SettingsPanel } from './components/SettingsPanel';
import { SignalPath } from './components/SignalPath';

const createInitialState = (): MachineState => ({
  rotors: [
    { type: RotorType.III, wiring: ROTOR_DATA[RotorType.III].wiring, notch: ROTOR_DATA[RotorType.III].notch, position: 0, ringSetting: 0 },
    { type: RotorType.II, wiring: ROTOR_DATA[RotorType.II].wiring, notch: ROTOR_DATA[RotorType.II].notch, position: 0, ringSetting: 0 },
    { type: RotorType.I, wiring: ROTOR_DATA[RotorType.I].wiring, notch: ROTOR_DATA[RotorType.I].notch, position: 0, ringSetting: 0 },
  ],
  reflector: ReflectorType.B,
  plugboard: {},
});

function App() {
  const [machineState, setMachineState] = useState<MachineState>(createInitialState());
  const [stateHistory, setStateHistory] = useState<MachineState[]>([]);
  const [litChar, setLitChar] = useState<string | null>(null);
  const [tapeText, setTapeText] = useState<string>('');
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showSignalPath, setShowSignalPath] = useState(false);
  const [lastInputChar, setLastInputChar] = useState<string | null>(null);

  const handleKeyDown = useCallback((char: string) => {
    if (pressedKeys.has(char)) return;

    setStateHistory(prev => [...prev, machineState]);

    const { result, newState } = encryptCharacter(char, machineState);

    setLastInputChar(char);
    setMachineState(newState);
    setLitChar(result);
    setTapeText(prev => prev + result);
    setPressedKeys(prev => new Set(prev).add(char));
  }, [machineState, pressedKeys]);

  const handleKeyUp = useCallback((char: string) => {
    setLitChar(null);
    setPressedKeys(prev => {
      const next = new Set(prev);
      next.delete(char);
      return next;
    });
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
      if (/^[A-Z]$/.test(char) && !e.repeat && !e.metaKey && !e.ctrlKey && !e.altKey) {
        handleKeyDown(char);
      }
      if (e.key === 'Backspace') {
        handleBackspace();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (isInputFocused()) return;
      const char = e.key.toUpperCase();
      if (/^[A-Z]$/.test(char)) {
        handleKeyUp(char);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [handleKeyDown, handleKeyUp, handleBackspace]);

  const handleRotorChange = (index: number, newConfig: Partial<RotorConfig>) => {
    const newRotors = [...machineState.rotors] as MachineState['rotors'];
    newRotors[index] = { ...newRotors[index], ...newConfig };
    setMachineState({ ...machineState, rotors: newRotors });
  };

  const handlePasteInput = useCallback((chars: string[]) => {
    let i = 0;
    const typeNext = () => {
      if (i < chars.length) {
        handleKeyDown(chars[i]);
        handleKeyUp(chars[i]);
        i++;
        setTimeout(typeNext, 30);
      }
    };
    typeNext();
  }, [handleKeyDown, handleKeyUp]);

  const handleLoadConfig = useCallback((state: any) => {
    setMachineState(state);
    setTapeText('');
    setStateHistory([]);
    setLitChar(null);
  }, []);

  const handleClearTape = () => {
    if (stateHistory.length > 0) {
      setMachineState(stateHistory[0]);
    }
    setStateHistory([]);
    setTapeText('');
    setLitChar(null);
  };

  return (
    <div className="flex-1 bg-[#1c1a16] flex flex-col items-center justify-start py-10 px-6 text-stone-200">

      {/* Header */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-8">
        <div className="flex flex-col">
          <h1 className="text-3xl sm:text-4xl font-typewriter font-bold text-stone-100 tracking-tighter">
            ENIGMA <span className="text-yellow-500">I</span>
          </h1>
          <span className="text-stone-500 text-xs tracking-[0.3em] font-mono">WEHRMACHT CIPHER MACHINE</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSignalPath(!showSignalPath)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-xs transition-all border ${
              showSignalPath
                ? 'bg-yellow-900/50 border-yellow-700 text-yellow-300'
                : 'bg-stone-800 border-stone-700 text-stone-400 hover:text-white'
            }`}
            title="Signal Path"
          >
            {showSignalPath ? <EyeOff size={16} /> : <Eye size={16} />}
            <span className="hidden sm:inline">Signal</span>
          </button>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="p-2 rounded-lg hover:bg-stone-800 text-stone-400 transition-colors border border-stone-700"
            title="About"
          >
            <Info size={20} />
          </button>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 bg-stone-800 hover:bg-stone-700 text-yellow-400 px-4 py-2 rounded-lg font-bold transition-all border border-stone-700 shadow-lg"
          >
            <Settings size={20} />
            <span className="hidden sm:inline">CONFIG</span>
          </button>
        </div>
      </div>

      {/* Config Slots */}
      <div className="w-full max-w-4xl mb-4">
        <ConfigSlots machineId="enigma-i" currentState={machineState} onLoadState={handleLoadConfig} accentColor="yellow" />
      </div>

      {/* Machine */}
      <div className="w-full max-w-3xl flex flex-col gap-10 relative z-0">

        {/* Rotor Assembly */}
        <RotorAssembly rotors={machineState.rotors} onChange={handleRotorChange} />

        {/* Lampboard */}
        <div className="relative">
          <div className="absolute inset-0 bg-black/40 blur-xl rounded-full transform scale-y-75 z-[-1]"></div>
          <Lampboard litChar={litChar} />
        </div>

        {/* Keyboard */}
        <div className="bg-stone-900/50 p-4 rounded-3xl border border-stone-800 shadow-2xl">
          <Keyboard
            onMouseDown={handleKeyDown}
            onMouseUp={handleKeyUp}
            isPressed={(c) => pressedKeys.has(c)}
          />
        </div>

        {/* Output Tape */}
        <div className="relative group">
          <Tape text={tapeText} />
          <div className="absolute top-1/2 -translate-y-1/2 -right-12 sm:-right-20 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleClearTape}
              className="text-stone-600 hover:text-red-400 p-1.5 transition-colors"
              title="Clear Tape"
            >
              <Eraser size={20} />
            </button>
            <TapeActions outputText={tapeText} onProcessInput={handlePasteInput} accentColor="yellow" />
          </div>
        </div>

        {/* Signal Path */}
        {showSignalPath && (
          <SignalPath state={machineState} lastInput={lastInputChar} />
        )}
      </div>

      {/* Info Panel */}
      <div className={`fixed bottom-0 left-0 right-0 bg-stone-900/95 backdrop-blur border-t border-stone-700 p-6 transform transition-transform duration-300 z-40 ${showInfo ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="max-w-3xl mx-auto relative">
          <button onClick={() => setShowInfo(false)} className="absolute top-0 right-0 p-2 text-stone-500 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <h3 className="text-xl font-bold text-yellow-400 mb-2">About Enigma I</h3>
          <p className="text-sm text-stone-300 mb-4 leading-relaxed">
            The <strong>Enigma I</strong> (Wehrmacht Enigma) was the standard German military cipher machine used
            from 1930 through the end of WWII. With <strong>3 rotors</strong> chosen from a set of 5,
            a <strong>plugboard</strong> (Steckerbrett) providing 10 letter-pair swaps, and <strong>double-stepping</strong>,
            it produced an astronomical number of possible settings — yet was famously broken by Polish mathematicians
            and later by Alan Turing's team at Bletchley Park.
          </p>
          <div className="grid grid-cols-2 gap-4 text-xs font-mono text-stone-500">
            <div>* 3 rotors from set I-V, each with one notch.</div>
            <div>* Reflector (UKW) ensures no letter encrypts to itself.</div>
            <div>* Double-stepping anomaly on middle rotor.</div>
            <div>* ~158 quintillion possible daily settings.</div>
          </div>
        </div>
      </div>

      {/* Settings */}
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        state={machineState}
        onUpdateState={setMachineState}
        onReset={() => { setMachineState(createInitialState()); setTapeText(''); setStateHistory([]); }}
      />
    </div>
  );
}

export default App;
