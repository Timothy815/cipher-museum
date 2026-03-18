import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Settings, RefreshCw, Eraser, Info, Play, RotateCcw, Delete } from 'lucide-react';
import ConfigSlots from '../shared/ConfigSlots';
import TapeActions from '../shared/TapeActions';
import { PurpleMachine } from './services/purpleMachine';
import { CipherMode, LogEntry, MachineState } from './types';
import RotorDisplay from './components/RotorDisplay';
import Keyboard from './components/Keyboard';
import TapeDisplay from './components/TapeDisplay';
import HelpModal from './components/HelpModal';

// Initialize service outside component to persist state across re-renders if needed, 
// though we will sync it with React state.
const purpleMachine = new PurpleMachine();

const App: React.FC = () => {
  const [mode, setMode] = useState<CipherMode>(CipherMode.ENCRYPT);
  const [machineState, setMachineState] = useState<MachineState>(purpleMachine.getState());
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [inputText, setInputText] = useState('');
  const [activePath, setActivePath] = useState<'sixes' | 'twenties' | null>(null);
  const [lastKeyPressed, setLastKeyPressed] = useState<string | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  
  // Settings Visibility
  const [showSettings, setShowSettings] = useState(true);

  // Auto-typing demo state
  const [isAutoTyping, setIsAutoTyping] = useState(false);
  const autoTypeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Undo history: ref avoids stale closure issues with rapid backspaces
  const historyRef = useRef<MachineState[]>([]);

  const handleReset = () => {
    purpleMachine.reset();
    setMachineState(purpleMachine.getState());
    setLogs([]);
    setInputText('');
    setLastKeyPressed(null);
    setActivePath(null);
    historyRef.current = [];
    setIsAutoTyping(false);
    if (autoTypeRef.current) clearTimeout(autoTypeRef.current);
  };

  const handleClearText = () => {
    // Restore machine to state before any characters were typed
    if (historyRef.current.length > 0) {
      const initialState = historyRef.current[0];
      purpleMachine.setState(initialState);
      setMachineState(initialState);
    }
    setLogs([]);
    setInputText('');
    historyRef.current = [];
  };

  const processInput = useCallback((char: string) => {
    // Only allow A-Z
    if (!/^[a-zA-Z]$/.test(char)) return;

    // Save state before processing for undo
    historyRef.current = [...historyRef.current, purpleMachine.getState()];

    const result = purpleMachine.processChar(char, mode);

    setMachineState(result.machineStateAfter);
    setLogs(prev => [...prev, { input: result.inputChar, output: result.outputChar, index: prev.length }]);
    setInputText(prev => prev + result.inputChar);
    setLastKeyPressed(result.inputChar);
    setActivePath(result.isSixes ? 'sixes' : 'twenties');

    // Clear active path highlight after a short delay
    setTimeout(() => setActivePath(null), 400);
  }, [mode]);

  const handleUndo = useCallback(() => {
    if (historyRef.current.length === 0) return;

    const prevState = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    purpleMachine.setState(prevState);
    setMachineState(prevState);
    setLogs(prev => prev.slice(0, -1));
    setInputText(prev => prev.slice(0, -1));
    setLastKeyPressed(null);
  }, []);

  const handlePasteInput = useCallback((chars: string[]) => {
    const newLogs: LogEntry[] = [];
    let newInput = '';
    for (const char of chars) {
      if (!/^[a-zA-Z]$/.test(char)) continue;
      historyRef.current = [...historyRef.current, purpleMachine.getState()];
      const result = purpleMachine.processChar(char, mode);
      newLogs.push({ input: result.inputChar, output: result.outputChar, index: 0 });
      newInput += result.inputChar;
    }
    setMachineState(purpleMachine.getState());
    setLogs(prev => {
      const offset = prev.length;
      return [...prev, ...newLogs.map((l, i) => ({ ...l, index: offset + i }))];
    });
    setInputText(prev => prev + newInput);
  }, [mode]);

  const handleLoadConfig = useCallback((state: any) => {
    const ms = state.machineState || state;
    purpleMachine.setState(ms);
    setMachineState(ms);
    if (state.mode !== undefined) setMode(state.mode);
    setLogs([]);
    setInputText('');
    historyRef.current = [];
  }, []);

  // Physical Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.length === 1 && /^[a-zA-Z]$/.test(e.key)) {
        processInput(e.key);
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [processInput]);

  // Adjust Rotors Manually
  const adjustRotor = (key: keyof MachineState, delta: number) => {
    const current = purpleMachine.getState();
    const max = key === 'sixesPosition' ? 6 : 20;
    const newVal = (current[key] + delta + max) % max; // Ensure positive mod
    
    const newState = { ...current, [key]: newVal };
    purpleMachine.setState(newState);
    setMachineState(newState);
  };

  // Demo Script
  const startDemo = () => {
    handleReset();
    const demoText = "PURPLE CODE";
    let i = 0;
    setIsAutoTyping(true);

    const typeNext = () => {
      if (i < demoText.length) {
        if (demoText[i] !== ' ') {
             processInput(demoText[i]);
        }
        i++;
        autoTypeRef.current = setTimeout(typeNext, 600);
      } else {
        setIsAutoTyping(false);
      }
    };
    typeNext();
  };

  return (
    <div className="flex-1 bg-[#121212] text-neutral-200 flex flex-col items-center py-10 px-6 selection:bg-purple-500 selection:text-white">
      
      {/* Header */}
      <header className="w-full max-w-4xl flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded flex items-center justify-center font-bold text-xl shadow-lg shadow-purple-900/50">97</div>
            <div>
                <h1 className="text-2xl font-bold tracking-wider text-white">SYSTEM 97 <span className="text-purple-400">"PURPLE"</span></h1>
                <p className="text-xs text-neutral-500 uppercase tracking-widest">Imperial Diplomatic Cipher</p>
            </div>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={startDemo} 
                disabled={isAutoTyping}
                className="flex items-center gap-2 px-4 py-2 bg-blue-900/30 text-blue-300 hover:bg-blue-800/30 rounded border border-blue-800/50 transition-all text-sm font-medium"
            >
                <Play size={16} /> DEMO
            </button>
            <button onClick={() => setIsHelpOpen(true)} className="p-2 text-neutral-400 hover:text-white transition-colors">
                <Info size={24} />
            </button>
        </div>
      </header>

      {/* Config Slots */}
      <div className="w-full max-w-4xl mb-4">
        <ConfigSlots machineId="purple" currentState={{ machineState, mode }} onLoadState={handleLoadConfig} accentColor="purple" />
      </div>

      {/* Main Machine Interface */}
      <main className="w-full max-w-4xl space-y-8">
        
        {/* Top Control Bar */}
        <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl flex flex-wrap gap-4 items-center justify-between shadow-xl">
            {/* Mode Switch */}
            <div className="flex bg-neutral-800 p-1 rounded-lg">
                <button 
                    onClick={() => setMode(CipherMode.ENCRYPT)}
                    className={`px-6 py-2 rounded-md font-bold text-sm transition-all ${mode === CipherMode.ENCRYPT ? 'bg-red-900/80 text-white shadow-lg' : 'text-neutral-500 hover:text-neutral-300'}`}
                >
                    ENCRYPT
                </button>
                <button 
                    onClick={() => setMode(CipherMode.DECRYPT)}
                    className={`px-6 py-2 rounded-md font-bold text-sm transition-all ${mode === CipherMode.DECRYPT ? 'bg-blue-900/80 text-white shadow-lg' : 'text-neutral-500 hover:text-neutral-300'}`}
                >
                    DECRYPT
                </button>
            </div>

            {/* Utility Buttons */}
            <div className="flex gap-3">
                 <button onClick={() => setShowSettings(!showSettings)} className={`p-2 rounded border ${showSettings ? 'bg-neutral-700 border-neutral-600 text-white' : 'border-neutral-800 text-neutral-500 hover:border-neutral-600'}`} title="Toggle Settings">
                    <Settings size={20} />
                </button>
                <button onClick={handleUndo} disabled={logs.length === 0} className="p-2 rounded border border-neutral-800 text-neutral-500 hover:text-white hover:border-neutral-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed" title="Undo (Backspace)">
                    <Delete size={20} />
                </button>
                <button onClick={handleClearText} className="p-2 rounded border border-neutral-800 text-neutral-500 hover:text-white hover:border-neutral-600 transition-all" title="Clear Tape">
                    <Eraser size={20} />
                </button>
                <button onClick={handleReset} className="p-2 rounded border border-neutral-800 text-neutral-500 hover:text-red-400 hover:border-red-900/50 transition-all" title="Full Reset">
                    <RotateCcw size={20} />
                </button>
            </div>
        </div>

        {/* Settings Panel (Collapsible) */}
        {showSettings && (
            <div className="bg-[#1a1a1a] border border-neutral-800 p-6 rounded-xl animate-[fadeIn_0.2s_ease-out]">
                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <RefreshCw size={12} /> Initial Rotor Positions
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     {/* Helper component for setting controls */}
                     {(['sixesPosition', 'twentiesSlow', 'twentiesMedium', 'twentiesFast'] as const).map((key, idx) => {
                         const label = key === 'sixesPosition' ? 'SIXES' : key.replace('twenties', '').toUpperCase();
                         const color = key === 'sixesPosition' ? 'text-purple-400' : 'text-emerald-400';
                         return (
                            <div key={key} className="flex flex-col items-center bg-neutral-900 p-3 rounded border border-neutral-800">
                                <span className={`text-[10px] font-bold mb-2 ${color}`}>{label}</span>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => adjustRotor(key, -1)} className="w-8 h-8 flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-400 font-bold">-</button>
                                    <span className="font-mono text-xl w-6 text-center">{machineState[key]}</span>
                                    <button onClick={() => adjustRotor(key, 1)} className="w-8 h-8 flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-400 font-bold">+</button>
                                </div>
                            </div>
                         );
                     })}
                </div>
            </div>
        )}

        {/* Visualizer */}
        <RotorDisplay state={machineState} activePath={activePath} />

        {/* Output Area */}
        <div className="relative group">
          <TapeDisplay logs={logs} title={mode === CipherMode.ENCRYPT ? 'Ciphertext' : 'Plaintext'} />
          <div className="absolute top-1/2 -translate-y-1/2 -right-12 sm:-right-20 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <TapeActions outputText={logs.map(l => l.output).join('')} onProcessInput={handlePasteInput} accentColor="purple" />
          </div>
        </div>

        {/* Input Area */}
        <div className="mt-8">
            <Keyboard onKeyPress={processInput} lastPressed={lastKeyPressed} disabled={isAutoTyping} />
        </div>

      </main>

      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      
      <footer className="mt-12 text-neutral-600 text-xs">
         Japanese Type 97 "Purple" Simulator
      </footer>
    </div>
  );
};

export default App;