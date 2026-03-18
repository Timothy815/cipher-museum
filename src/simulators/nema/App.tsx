import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Eraser, Info, Eye, EyeOff } from 'lucide-react';
import ConfigSlots from '../shared/ConfigSlots';
import TapeActions from '../shared/TapeActions';
import { MachineState, RotorConfig } from './types';
import { ROTOR_WIRINGS, DRIVE_WHEEL_NOTCHES } from './constants';
import { encryptCharacter } from './services/nemaService';
import { RotorAssembly } from './components/RotorAssembly';
import { Lampboard } from './components/Lampboard';
import { Keyboard } from './components/Keyboard';
import { Tape } from './components/Tape';
import { SettingsPanel } from './components/SettingsPanel';
import { SignalPath } from './components/SignalPath';

const createInitialState = (): MachineState => ({
  rotors: [
    { id: 1, wiring: ROTOR_WIRINGS[1].wiring, position: 0, ringSetting: 0, notchRing: ROTOR_WIRINGS[1].notches },
    { id: 2, wiring: ROTOR_WIRINGS[2].wiring, position: 0, ringSetting: 0, notchRing: ROTOR_WIRINGS[2].notches },
    { id: 3, wiring: ROTOR_WIRINGS[3].wiring, position: 0, ringSetting: 0, notchRing: ROTOR_WIRINGS[3].notches },
    { id: 4, wiring: ROTOR_WIRINGS[4].wiring, position: 0, ringSetting: 0, notchRing: ROTOR_WIRINGS[4].notches },
  ],
  driveWheel: { position: 0, notches: DRIVE_WHEEL_NOTCHES },
  reflector: 'Standard',
});

function App() {
  const [machineState, setMachineState] = useState<MachineState>(createInitialState());
  const [stateHistory, setStateHistory] = useState<MachineState[]>([]);
  const [litChar, setLitChar] = useState<string | null>(null);
  const [tapeText, setTapeText] = useState('');
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

  const handleRotorChange = (index: number, config: Partial<RotorConfig>) => {
    const newRotors = [...machineState.rotors] as MachineState['rotors'];
    newRotors[index] = { ...newRotors[index], ...config };
    setMachineState({ ...machineState, rotors: newRotors });
  };

  const handleDriveChange = (position: number) => {
    setMachineState({ ...machineState, driveWheel: { ...machineState.driveWheel, position } });
  };

  const handlePasteInput = useCallback((chars: string[]) => {
    let currentState = machineState;
    const results: string[] = [];
    const history: MachineState[] = [];
    for (const char of chars) {
      history.push(currentState);
      const { result, newState } = encryptCharacter(char, currentState);
      results.push(result);
      currentState = newState;
    }
    setStateHistory(prev => [...prev, ...history]);
    setMachineState(currentState);
    setTapeText(prev => prev + results.join(''));
  }, [machineState]);

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

  return (
    <div className="flex-1 bg-[#141418] flex flex-col items-center justify-start py-10 px-6 text-neutral-200">
      {/* Header */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-8">
        <div className="flex flex-col">
          <h1 className="text-3xl sm:text-4xl font-typewriter font-bold text-neutral-100 tracking-tighter">
            NEMA <span className="text-sky-400">T-D</span>
          </h1>
          <span className="text-neutral-500 text-xs tracking-[0.3em] font-mono">SWISS CIPHER MACHINE</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSignalPath(!showSignalPath)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-xs transition-all border ${
              showSignalPath ? 'bg-sky-900/50 border-sky-700 text-sky-300' : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white'
            }`}
          >
            {showSignalPath ? <EyeOff size={16} /> : <Eye size={16} />}
            <span className="hidden sm:inline">Signal</span>
          </button>
          <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-lg hover:bg-neutral-800 text-neutral-400 transition-colors border border-neutral-700">
            <Info size={20} />
          </button>
          <button onClick={() => setIsSettingsOpen(true)} className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-sky-400 px-4 py-2 rounded-lg font-bold transition-all border border-neutral-700 shadow-lg">
            <Settings size={20} />
            <span className="hidden sm:inline">CONFIG</span>
          </button>
        </div>
      </div>

      {/* Config Slots */}
      <div className="w-full max-w-4xl mb-4">
        <ConfigSlots machineId="nema" currentState={machineState} onLoadState={handleLoadConfig} accentColor="sky" />
      </div>

      {/* Machine */}
      <div className="w-full max-w-3xl flex flex-col gap-10 relative z-0">
        <RotorAssembly rotors={machineState.rotors} driveWheel={machineState.driveWheel} onChange={handleRotorChange} onDriveChange={handleDriveChange} />

        <div className="relative">
          <div className="absolute inset-0 bg-black/40 blur-xl rounded-full transform scale-y-75 z-[-1]"></div>
          <Lampboard litChar={litChar} />
        </div>

        <div className="bg-neutral-900/50 p-4 rounded-3xl border border-neutral-800 shadow-2xl">
          <Keyboard onMouseDown={handleKeyDown} onMouseUp={handleKeyUp} isPressed={c => pressedKeys.has(c)} />
        </div>

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
            <TapeActions outputText={tapeText} onProcessInput={handlePasteInput} accentColor="sky" />
          </div>
        </div>

        {showSignalPath && <SignalPath state={machineState} lastInput={lastInputChar} />}
      </div>

      {/* Info Panel */}
      <div className={`fixed bottom-0 left-0 right-0 bg-neutral-900/95 backdrop-blur border-t border-neutral-700 p-6 transform transition-transform duration-300 z-40 ${showInfo ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="max-w-3xl mx-auto relative">
          <button onClick={() => setShowInfo(false)} className="absolute top-0 right-0 p-2 text-neutral-500 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <h3 className="text-xl font-bold text-sky-400 mb-2">About NEMA</h3>
          <p className="text-sm text-neutral-300 mb-4 leading-relaxed">
            The <strong>NEMA</strong> (NEue MAschine, or "New Machine") was a Swiss electromechanical cipher machine
            developed in 1947 as an improvement over the Enigma. It featured <strong>4 cipher rotors</strong> chosen
            from a set of 10, plus a <strong>drive wheel</strong> (Triebrad) with an irregular notch pattern that
            controlled the stepping of the slowest rotor. Multiple notch positions per rotor created far more
            irregular stepping than Enigma, making cryptanalysis significantly harder.
          </p>
          <div className="grid grid-cols-2 gap-4 text-xs font-mono text-neutral-500">
            <div>* 4 rotors from 10 available, each with multiple notches.</div>
            <div>* Drive wheel (Triebrad) provides irregular slow-rotor stepping.</div>
            <div>* No plugboard — security came from stepping complexity.</div>
            <div>* Used by Swiss military from 1947 into the 1970s.</div>
          </div>
        </div>
      </div>

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
