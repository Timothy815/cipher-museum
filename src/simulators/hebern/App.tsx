import React, { useState, useEffect, useCallback } from 'react';
import { Eraser, Info } from 'lucide-react';
import ConfigSlots from '../shared/ConfigSlots';
import TapeActions from '../shared/TapeActions';
import { MachineState } from './types';
import { ROTOR_WIRINGS } from './constants';
import { encryptCharacter } from './services/hebernService';
import { RotorDisplay } from './components/RotorDisplay';
import { Lampboard } from './components/Lampboard';
import { Keyboard } from './components/Keyboard';
import { Tape } from './components/Tape';

const createInitialState = (rotorId: number = 1): MachineState => ({
  rotor: { wiring: ROTOR_WIRINGS[rotorId], position: 0 },
});

function App() {
  const [machineState, setMachineState] = useState<MachineState>(createInitialState());
  const [stateHistory, setStateHistory] = useState<MachineState[]>([]);
  const [litChar, setLitChar] = useState<string | null>(null);
  const [tapeText, setTapeText] = useState('');
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const [showInfo, setShowInfo] = useState(false);
  const [selectedRotor, setSelectedRotor] = useState(1);
  const [decrypt, setDecrypt] = useState(false);

  const handleKeyDown = useCallback((char: string) => {
    if (pressedKeys.has(char)) return;
    setStateHistory(prev => [...prev, machineState]);
    const { result, newState } = encryptCharacter(char, machineState, decrypt);
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

  const handleRotorSelect = (id: number) => {
    setSelectedRotor(id);
    setMachineState({ rotor: { wiring: ROTOR_WIRINGS[id], position: machineState.rotor.position } });
  };

  const handlePasteInput = useCallback((chars: string[]) => {
    let currentState = machineState;
    const results: string[] = [];
    const history: MachineState[] = [];
    for (const char of chars) {
      history.push(currentState);
      const { result, newState } = encryptCharacter(char, currentState, decrypt);
      results.push(result);
      currentState = newState;
    }
    setStateHistory(prev => [...prev, ...history]);
    setMachineState(currentState);
    setTapeText(prev => prev + results.join(''));
  }, [machineState, decrypt]);

  const handleLoadConfig = useCallback((state: any) => {
    const { machineState: ms, decrypt: d, selectedRotor: sr } = state;
    setMachineState(ms);
    setDecrypt(d);
    setSelectedRotor(sr);
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
    <div className="flex-1 bg-[#121614] flex flex-col items-center justify-start py-10 px-6 text-neutral-200">
      {/* Header */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-8">
        <div className="flex flex-col">
          <h1 className="text-3xl sm:text-4xl font-typewriter font-bold text-neutral-100 tracking-tighter">
            HEBERN <span className="text-teal-400">ELECTRIC</span>
          </h1>
          <span className="text-neutral-500 text-xs tracking-[0.3em] font-mono">FIRST ROTOR CIPHER MACHINE — 1918</span>
        </div>
        <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-lg hover:bg-neutral-800 text-neutral-400 transition-colors border border-neutral-700">
          <Info size={20} />
        </button>
      </div>

      {/* Config Slots */}
      <div className="w-full max-w-4xl mb-4">
        <ConfigSlots machineId="hebern" currentState={{ machineState, decrypt, selectedRotor }} onLoadState={handleLoadConfig} accentColor="teal" />
      </div>

      {/* Machine */}
      <div className="w-full max-w-3xl flex flex-col gap-10 relative z-0">
        {/* Rotor Section */}
        <div className="bg-neutral-950 rounded-xl border border-neutral-800 p-6 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] relative">
          <div className="absolute top-2 left-4 text-neutral-700 text-xs font-mono tracking-widest opacity-50">HEBERN ELECTRIC CODE</div>
          <div className="absolute top-2 right-4 text-neutral-700 text-xs font-mono tracking-widest opacity-50">PAT. 1918</div>

          <div className="flex flex-col items-center gap-4 mt-4">
            {/* Mode + Rotor selector */}
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                {Object.keys(ROTOR_WIRINGS).map(k => {
                  const id = Number(k);
                  return (
                    <button
                      key={id}
                      onClick={() => handleRotorSelect(id)}
                      className={`px-3 py-1 rounded text-xs font-mono font-bold border transition-colors ${
                        selectedRotor === id
                          ? 'bg-teal-900/50 border-teal-700 text-teal-300'
                          : 'bg-neutral-800 border-neutral-700 text-neutral-500 hover:text-white'
                      }`}
                    >
                      #{id}
                    </button>
                  );
                })}
              </div>
              <div className="w-px h-6 bg-neutral-700" />
              <button
                onClick={() => setDecrypt(d => !d)}
                className={`px-3 py-1 rounded text-xs font-mono font-bold border transition-colors ${
                  decrypt
                    ? 'bg-amber-900/50 border-amber-700 text-amber-300'
                    : 'bg-neutral-800 border-neutral-700 text-neutral-500 hover:text-white'
                }`}
              >
                {decrypt ? '⟲ REVERSED (DECRYPT)' : 'FORWARD (ENCRYPT)'}
              </button>
            </div>

            <RotorDisplay
              position={machineState.rotor.position}
              rotorId={selectedRotor}
              onStep={d => setMachineState({ rotor: { ...machineState.rotor, position: (machineState.rotor.position + d + 26) % 26 } })}
              onChange={p => setMachineState({ rotor: { ...machineState.rotor, position: p } })}
            />
          </div>
        </div>

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
            <TapeActions outputText={tapeText} onProcessInput={handlePasteInput} accentColor="teal" />
          </div>
        </div>
      </div>

      {/* Info Panel */}
      <div className={`fixed bottom-0 left-0 right-0 bg-neutral-900/95 backdrop-blur border-t border-neutral-700 p-6 transform transition-transform duration-300 z-40 ${showInfo ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="max-w-3xl mx-auto relative">
          <button onClick={() => setShowInfo(false)} className="absolute top-0 right-0 p-2 text-neutral-500 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <h3 className="text-xl font-bold text-teal-400 mb-2">About the Hebern Electric Code Machine</h3>
          <p className="text-sm text-neutral-300 mb-4 leading-relaxed">
            The <strong>Hebern Electric Code Machine</strong> (1918) was one of the world's first rotor-based cipher
            machines, invented by Edward Hebern in Oakland, California. It used a <strong>single rotor</strong> that
            stepped with each keypress, creating a polyalphabetic substitution cipher. Though simple by later standards,
            it was revolutionary — the concept of wired rotors that Hebern pioneered became the foundation for
            <strong> Enigma</strong>, <strong>SIGABA</strong>, and virtually every electromechanical cipher machine
            that followed.
          </p>
          <div className="grid grid-cols-2 gap-4 text-xs font-mono text-neutral-500">
            <div>* Single rotor — the simplest rotor cipher.</div>
            <div>* Steps once per keypress (Caesar-like advance).</div>
            <div>* No reflector — reverse rotor to decrypt.</div>
            <div>* Grandfather of all rotor cipher machines.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
