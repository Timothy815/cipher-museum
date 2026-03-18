import React, { useState, useEffect, useCallback, useRef } from 'react';
import { generateRandomState } from './constants';
import { MachineState, TapeEntry } from './types';
import { M209Service } from './services/m209Service';
import { Wheel } from './components/Wheel';
import { Tape } from './components/Tape';
import InternalView from './components/InternalView';
import ConfigSlots from '../shared/ConfigSlots';
import TapeActions from '../shared/TapeActions';
import { RefreshCw, RotateCcw, Trash2, Info, X, CheckCircle, Undo2, Wrench } from 'lucide-react';

const App: React.FC = () => {
  const [state, setState] = useState<MachineState>(generateRandomState());
  // Track the wheel positions at the start of the current message (when tape is empty)
  // This allows us to "Reset to Message Key" for decryption
  const [startPositions, setStartPositions] = useState<number[]>([]);
  
  const [tape, setTape] = useState<TapeEntry[]>([]);
  const [inputText, setInputText] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isRekeying, setIsRekeying] = useState(false);
  const [showInternals, setShowInternals] = useState(false);

  // Initialize start positions on mount
  useEffect(() => {
    if (startPositions.length === 0 && state.wheels.length > 0) {
       setStartPositions(state.wheels.map(w => w.position));
    }
  }, [state.wheels, startPositions.length]);

  // Handling user manual wheel rotation
  const handleRotate = useCallback((id: number, dir: 'up' | 'down') => {
    setState(prev => {
      const newWheels = [...prev.wheels];
      newWheels[id] = M209Service.rotateWheel(newWheels[id], dir);
      
      // If the tape is empty, this rotation is setting the Message Key (Start Position)
      if (tape.length === 0) {
        setStartPositions(prevStarts => {
          const newStarts = [...prevStarts];
          newStarts[id] = newWheels[id].position;
          return newStarts;
        });
      }

      return { ...prev, wheels: newWheels };
    });
  }, [tape.length]);

  // Handling reset/re-key (New Internal Key)
  const handleRekey = () => {
    // Visual feedback start
    setIsRekeying(true);

    // Short timeout to allow the visual "shake" or transition to register before values snap
    setTimeout(() => {
      const newState = generateRandomState();
      setState(newState);
      setStartPositions(newState.wheels.map(w => w.position)); // Sync start positions to new random state
      setTape([]);
      setInputText('');
      
      setIsRekeying(false);
      
      // Visual feedback success
      setToastMessage("NEW DAILY KEY GENERATED");
      setTimeout(() => setToastMessage(null), 3000);
    }, 300);
  };

  // Reset to Message Key (Start Positions) - Logic for "Quick Decrypt"
  const handleResetToStart = () => {
    if (startPositions.length === 0) return;

    setState(prev => ({
      ...prev,
      wheels: prev.wheels.map((w, i) => ({
        ...w,
        position: startPositions[i]
      }))
    }));
    setTape([]);
    setInputText('');
    
    setToastMessage("RESET TO MESSAGE KEY");
    setTimeout(() => setToastMessage(null), 2000);
  };

  const handleClearTape = () => {
    // Removed confirm for smoother UX, simulation context implies easy undo via retyping or reset
    setTape([]);
    setInputText('');
    // When clearing tape, the CURRENT wheel positions become the NEW start positions for the next message
    setStartPositions(state.wheels.map(w => w.position));
  };

  const handlePasteInput = useCallback((chars: string[]) => {
    let currentState = state;
    const newEntries: TapeEntry[] = [];
    let currentTapeIndex = tape.length;

    chars.forEach(char => {
      if (!/^[A-Z]$/.test(char)) return;
      const { result, newState } = M209Service.processCharacter(char, currentState);
      currentState = newState;
      newEntries.push({ input: char, output: result, index: currentTapeIndex++ });
    });

    if (newEntries.length > 0) {
      setState(currentState);
      setTape(prev => [...prev, ...newEntries]);
      setInputText(prev => prev + chars.filter(c => /^[A-Z]$/.test(c)).join(''));
    }
  }, [state, tape.length]);

  const handleLoadConfig = useCallback((saved: any) => {
    setState(saved);
    setStartPositions(saved.wheels.map((w: any) => w.position));
    setTape([]);
    setInputText('');
  }, []);

  // Processing input
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const rawVal = e.target.value;
    
    if (rawVal.length < inputText.length) {
      // Deletion
      setInputText(rawVal);
      return;
    }

    const newContent = rawVal.slice(inputText.length).toUpperCase();
    const chars = newContent.split('');
    
    let currentState = state;
    const newEntries: TapeEntry[] = [];
    let currentTapeIndex = tape.length;

    chars.forEach(char => {
       if (!/^[A-Z]$/.test(char)) {
          return;
       }

       const { result, newState } = M209Service.processCharacter(char, currentState);
       currentState = newState;
       newEntries.push({ input: char, output: result, index: currentTapeIndex++ });
    });

    if (newEntries.length > 0) {
      setState(currentState);
      setTape(prev => [...prev, ...newEntries]);
    }
    
    // Force uppercase in UI
    setInputText(rawVal.toUpperCase());
  };

  return (
    <div className="flex-1 bg-stone-900 text-stone-200 flex flex-col font-sans selection:bg-amber-500/30">

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-1/2 translate-x-1/2 z-50 bg-amber-600 text-white px-6 py-3 rounded-full shadow-[0_0_20px_rgba(245,158,11,0.5)] font-bold tracking-wider animate-in fade-in slide-in-from-top-4 duration-300 flex items-center gap-2 border border-amber-400">
          <CheckCircle size={20} className="text-amber-100" />
          {toastMessage}
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-start px-6 py-10 gap-8">

        {/* Page Header */}
        <div className="w-full max-w-5xl flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-olive-700 rounded-full flex items-center justify-center shadow-inner border border-olive-600">
               <span className="font-mono font-bold text-amber-500 text-lg">M</span>
             </div>
             <div>
               <h1 className="text-xl font-bold text-amber-50 tracking-wide">M-209 SIMULATOR</h1>
               <p className="text-xs text-olive-400 uppercase tracking-widest">Converter M-209-B (US ARMY)</p>
             </div>
          </div>
          <div className="flex gap-2">
            <button
               onClick={() => setShowInternals(!showInternals)}
               className={`transition-colors flex items-center gap-2 px-3 py-1.5 rounded border ${showInternals ? 'bg-amber-900/50 border-amber-700 text-amber-200' : 'bg-transparent border-transparent text-olive-400 hover:text-amber-200 hover:bg-olive-800'}`}
            >
              <Wrench size={20} />
              <span className="text-sm font-semibold hidden sm:inline">Internals</span>
            </button>
            <button
               onClick={() => setShowInfo(!showInfo)}
               className={`transition-colors flex items-center gap-2 px-3 py-1.5 rounded border ${showInfo ? 'bg-amber-900/50 border-amber-700 text-amber-200' : 'bg-transparent border-transparent text-olive-400 hover:text-amber-200 hover:bg-olive-800'}`}
            >
              <Info size={20} />
              <span className="text-sm font-semibold hidden sm:inline">Instructions</span>
            </button>
          </div>
        </div>
        
        {/* Config Slots */}
        <div className="w-full max-w-5xl">
          <ConfigSlots machineId="m209" currentState={state} onLoadState={handleLoadConfig} accentColor="amber" />
        </div>

        {/* Info Modal/Panel */}
        {showInfo && (
          <div className="max-w-5xl w-full bg-stone-800/90 border border-amber-700/30 p-6 rounded-lg shadow-2xl animate-fadeIn relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-600 to-olive-600"></div>
            <button 
              onClick={() => setShowInfo(false)}
              className="absolute top-4 right-4 text-stone-500 hover:text-amber-400"
            >
              <X size={20} />
            </button>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-amber-500 font-mono font-bold text-lg mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-amber-500 rounded-full"></span> 
                  HOW TO ENCRYPT
                </h3>
                <ol className="list-decimal list-outside ml-5 space-y-3 text-sm text-stone-300">
                  <li>
                    <strong className="text-stone-200">Set Message Key:</strong> Use the arrows to set the wheels to a random starting sequence (e.g., <code className="text-amber-200 bg-stone-900 px-1 rounded">A A A A A A</code>).
                  </li>
                  <li>
                    <strong className="text-stone-200">Type Message:</strong> Enter text below.
                  </li>
                  <li>
                    <strong className="text-stone-200">Read Tape:</strong> The paper tape displays the ciphertext.
                  </li>
                </ol>
              </div>

              <div>
                <h3 className="text-olive-400 font-mono font-bold text-lg mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-olive-500 rounded-full"></span>
                  HOW TO DECRYPT
                </h3>
                <ol className="list-decimal list-outside ml-5 space-y-3 text-sm text-stone-300">
                  <li>
                    <strong className="text-stone-200">Reset Wheels:</strong> Click <span className="inline-flex items-center gap-1 bg-stone-700 px-1 rounded text-xs text-amber-200"><Undo2 size={10}/> Reset Indicators</span> to return wheels to start position.
                  </li>
                  <li>
                    <strong className="text-stone-200">Type Ciphertext:</strong> Enter the code you want to decipher.
                  </li>
                  <li>
                    <strong className="text-stone-200">Result:</strong> Read the original message on the tape.
                  </li>
                </ol>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-stone-700/50 text-xs text-stone-400 bg-stone-900/50 p-3 rounded flex gap-4">
              <div className="flex-1">
                 <strong className="text-amber-600 uppercase block mb-1">New Daily Key:</strong> 
                 Randomizes internal pins & lugs. Changes the cipher logic completely.
              </div>
              <div className="flex-1">
                 <strong className="text-olive-400 uppercase block mb-1">Reset Indicators:</strong> 
                 Rewinds wheels to where they were before you started typing. Use this to decrypt what you just typed.
              </div>
            </div>
          </div>
        )}

        {/* The Machine Visual */}
        <div className="w-full max-w-5xl bg-olive-800 rounded-3xl p-8 sm:p-12 shadow-2xl border-t border-olive-700 relative">

          {/* Metal Plate Detail */}
          <div className="text-olive-950/30 font-bold text-4xl sm:text-5xl select-none pointer-events-none tracking-tighter mb-8">
            US ARMY
          </div>

          <div className="flex flex-col items-center gap-10 z-10 relative">
             
             {/* Rotor Array */}
             <div className={`flex flex-wrap justify-center gap-2 sm:gap-4 bg-black/20 p-4 rounded-xl border border-olive-900/50 shadow-inner transition-opacity duration-300 ${isRekeying ? 'opacity-50 blur-sm scale-95' : 'opacity-100 scale-100'}`}>
               {state.wheels.map(wheel => (
                 <Wheel 
                   key={wheel.id} 
                   wheel={wheel} 
                   onRotate={handleRotate} 
                 />
               ))}
             </div>

             {/* Output Tape */}
             <div className="w-full relative group">
               <Tape entries={tape} />
               <div className="absolute top-1/2 -translate-y-1/2 -right-10 sm:-right-16 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                 <TapeActions outputText={tape.map(e => e.output).join('')} onProcessInput={handlePasteInput} accentColor="amber" />
               </div>
             </div>

          </div>

          {/* Machine Controls (Bottom Plate) */}
          <div className="mt-8 pt-6 border-t border-olive-700 flex flex-wrap justify-between items-center gap-4">
             
             {/* Left Actions (Keys & Resets) */}
             <div className="flex flex-wrap gap-2">
                <button 
                  onClick={handleRekey}
                  className={`flex items-center gap-2 px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 rounded shadow-md border border-stone-700 transition-all text-xs font-bold uppercase tracking-wide active:bg-amber-800 active:border-amber-600 active:text-amber-100 ${isRekeying ? 'animate-pulse bg-amber-900/50' : ''}`}
                  title="Randomize Internal Pins & Lugs (Daily Key)"
                >
                  <RefreshCw size={14} className={isRekeying ? 'animate-spin' : ''} /> New Daily Key
                </button>
                
                <div className="w-px h-8 bg-olive-600 mx-2 self-center hidden sm:block"></div>

                <button 
                  onClick={handleResetToStart}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-700 hover:bg-amber-600 text-white rounded shadow-md border border-amber-600 transition-all text-sm font-bold shadow-[0_2px_10px_rgba(245,158,11,0.2)] active:translate-y-0.5 active:shadow-none"
                  title="Reset wheels to start position (Message Key) and clear tape"
                >
                  <Undo2 size={16} /> Reset Indicators
                </button>

                <button 
                  onClick={handleClearTape}
                  className="flex items-center gap-2 px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 rounded shadow-md border border-stone-700 transition-all text-xs font-semibold active:translate-y-0.5"
                  title="Clear tape only (Keep current wheel positions)"
                >
                  <Trash2 size={14} /> Clear Tape
                </button>
             </div>

             <div className="text-[10px] sm:text-xs text-olive-500 font-mono text-right">
                <div>MSG KEY: <span className="text-olive-300">{startPositions.map((p, i) => String.fromCharCode(65 + p)).join('')}</span></div>
                <div>INTERNAL: {state.wheels.reduce((a, b) => a + (b.pins.filter(p=>p).length), 0)} PINS</div>
             </div>
          </div>

        </div>

        {/* Input Area */}
        <div className="w-full max-w-5xl">
          <label className="block text-olive-400 text-xs font-bold mb-2 uppercase tracking-wider flex justify-between">
            <span>Message Input</span>
            <span className="text-olive-600">Type to Encrypt/Decrypt</span>
          </label>
          <div className="relative">
            <textarea
              value={inputText}
              onChange={handleInput}
              placeholder="TYPE MESSAGE HERE..."
              className="w-full bg-stone-800 text-amber-50 border-2 border-olive-700 rounded-lg p-4 font-mono text-lg focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600 placeholder-olive-700 uppercase shadow-inner resize-none h-32"
              spellCheck={false}
            />
            <div className="absolute bottom-4 right-4 text-olive-600 text-xs">
              {inputText.length} CHARS
            </div>
          </div>
        </div>

        {/* Internal Mechanism View */}
        {showInternals && (
          <InternalView
            state={state}
            onUpdateState={setState}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-olive-600 text-sm">
        <p>Simulation based on Hagelin M-209 Mechanical Cipher.</p>
      </footer>


    </div>
  );
};

export default App;