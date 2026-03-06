import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Eraser, Info } from 'lucide-react';
import { MachineState, RotorConfig, RotorType, ReflectorType } from './types';
import { ROTOR_DATA } from './constants';
import { encryptCharacter } from './services/enigmaService';
import { RotorAssembly } from './components/RotorAssembly';
import { Lampboard } from './components/Lampboard';
import { Keyboard } from './components/Keyboard';
import { Tape } from './components/Tape';
import { SettingsPanel } from './components/SettingsPanel';

// Initial State Factory
const createInitialState = (): MachineState => ({
  rotors: [
    { type: RotorType.Beta, wiring: ROTOR_DATA[RotorType.Beta].wiring, notch: '', position: 0, ringSetting: 0 },
    { type: RotorType.III, wiring: ROTOR_DATA[RotorType.III].wiring, notch: ROTOR_DATA[RotorType.III].notch, position: 0, ringSetting: 0 },
    { type: RotorType.II, wiring: ROTOR_DATA[RotorType.II].wiring, notch: ROTOR_DATA[RotorType.II].notch, position: 0, ringSetting: 0 },
    { type: RotorType.I, wiring: ROTOR_DATA[RotorType.I].wiring, notch: ROTOR_DATA[RotorType.I].notch, position: 0, ringSetting: 0 },
  ],
  reflector: ReflectorType.B_Thin,
  plugboard: {}
});

function App() {
  const [machineState, setMachineState] = useState<MachineState>(createInitialState());
  const [litChar, setLitChar] = useState<string | null>(null);
  const [tapeText, setTapeText] = useState<string>('');
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  // Handle key press logic (Encryption)
  const handleKeyDown = useCallback((char: string) => {
    if (pressedKeys.has(char)) return; // Prevent repeat if holding key
    
    // Encrypt
    const { result, newState } = encryptCharacter(char, machineState);
    
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

  // Keyboard Event Listeners
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const char = e.key.toUpperCase();
      if (/^[A-Z]$/.test(char) && !e.repeat && !e.metaKey && !e.ctrlKey && !e.altKey) {
        handleKeyDown(char);
      }
      if (e.key === 'Backspace') {
        setTapeText(prev => prev.slice(0, -1));
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
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
  }, [handleKeyDown, handleKeyUp]);

  // Handler for manual rotor change from UI
  const handleRotorChange = (index: number, newConfig: Partial<RotorConfig>) => {
    const newRotors = [...machineState.rotors] as MachineState['rotors'];
    newRotors[index] = { ...newRotors[index], ...newConfig };
    setMachineState({ ...machineState, rotors: newRotors });
  };

  const handleClearTape = () => setTapeText('');

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-start py-8 px-4 text-slate-200">
      
      {/* Header / Top Bar */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-8">
        <div className="flex flex-col">
            <h1 className="text-3xl sm:text-4xl font-typewriter font-bold text-slate-100 tracking-tighter">ENIGMA <span className="text-amber-600">M4</span></h1>
            <span className="text-slate-500 text-xs tracking-[0.3em] font-mono">KRIEGSMARINE SIMULATION</span>
        </div>
        <div className="flex gap-3">
             <button 
                onClick={() => setShowInfo(!showInfo)}
                className="p-2 rounded-full hover:bg-slate-800 text-slate-400 transition-colors"
                title="About"
            >
                <Info size={24} />
            </button>
            <button 
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-amber-500 px-4 py-2 rounded-lg font-bold transition-all border border-slate-700 shadow-lg"
            >
                <Settings size={20} />
                <span className="hidden sm:inline">CONFIG</span>
            </button>
        </div>
      </div>

      {/* Main Machine Interface */}
      <div className="w-full max-w-3xl flex flex-col gap-8 relative z-0">
        
        {/* Rotor Assembly */}
        <RotorAssembly rotors={machineState.rotors} onChange={handleRotorChange} />
        
        {/* Lampboard */}
        <div className="relative">
            <div className="absolute inset-0 bg-black/40 blur-xl rounded-full transform scale-y-75 z-[-1]"></div>
            <Lampboard litChar={litChar} />
        </div>

        {/* Keyboard */}
        <div className="bg-slate-900/50 p-4 rounded-3xl border border-slate-800 shadow-2xl">
            <Keyboard 
                onMouseDown={handleKeyDown} 
                onMouseUp={handleKeyUp}
                isPressed={(c) => pressedKeys.has(c)}
            />
        </div>

        {/* Output Tape */}
        <div className="relative group">
            <Tape text={tapeText} />
            <button 
                onClick={handleClearTape}
                className="absolute top-1/2 -translate-y-1/2 -right-12 sm:-right-16 text-slate-600 hover:text-red-400 p-2 transition-colors opacity-0 group-hover:opacity-100"
                title="Clear Tape"
            >
                <Eraser size={24} />
            </button>
        </div>
      </div>

      {/* Footer Info */}
      <div className={`fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-700 p-6 transform transition-transform duration-300 z-40 ${showInfo ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="max-w-3xl mx-auto relative">
             <button onClick={() => setShowInfo(false)} className="absolute top-0 right-0 p-2 text-slate-500 hover:text-white"><XIcon /></button>
             <h3 className="text-xl font-bold text-amber-500 mb-2">How to use</h3>
             <p className="text-sm text-slate-300 mb-4 leading-relaxed">
                Click the rotor wheels or type into the input fields to set the initial key. 
                Use your physical keyboard or the on-screen keys to type. 
                Open <strong>Config</strong> to change rotor types (I-VIII, Beta/Gamma), ring settings, and plugboard connections.
             </p>
             <div className="grid grid-cols-2 gap-4 text-xs font-mono text-slate-500">
                <div>* M4 Logic: 4th rotor (Greek) never steps.</div>
                <div>* Middle rotor double-stepping implemented.</div>
             </div>
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsPanel 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        state={machineState}
        onUpdateState={setMachineState}
        onReset={() => { setMachineState(createInitialState()); setTapeText(''); }}
      />

    </div>
  );
}

const XIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
)

export default App;