import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, ArrowRightLeft, Settings, Info, Play, SkipBack } from 'lucide-react';
import { LorenzMachine } from './services/lorenzService';
import { INITIAL_WHEELS } from './constants';
import { WheelConfig } from './types';
import WheelControl from './components/WheelControl';

// Instantiate logic outside component to persist simulated state if needed,
// but inside component is better for React reactivity. 
// We will use a ref for the machine instance to keep it stable across renders
// and state variables to force UI updates.

const App: React.FC = () => {
  const machineRef = useRef<LorenzMachine>(new LorenzMachine(INITIAL_WHEELS));
  
  // State for UI
  const [wheels, setWheels] = useState<WheelConfig[]>(INITIAL_WHEELS);
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'simulator' | 'about'>('simulator');

  // Sync state from machine ref
  const updateMachineState = () => {
    setWheels([...machineRef.current.getCurrentState()]);
  };

  const handleWheelChange = (id: string, delta: number) => {
    const currentWheels = machineRef.current.getCurrentState();
    const wheel = currentWheels.find(w => w.id === id);
    if (wheel) {
      let newPos = wheel.position + delta;
      if (newPos < 0) newPos = wheel.size - 1;
      if (newPos >= wheel.size) newPos = 0;
      wheel.position = newPos;
      updateMachineState();
      reprocessFullText();
    }
  };

  const reprocessFullText = () => {
    if (!inputText) return;
    
    // Create a temp machine with current wheel settings as the START
    const tempMachine = new LorenzMachine(machineRef.current.getCurrentState());
    let out = '';
    for (const char of inputText) {
      const result = tempMachine.processCharacter(char);
      if (result.outputChar) {
          out += result.outputChar;
      }
    }
    setOutputText(out);
  };
  
  const processText = (text: string) => {
    setInputText(text);
    
    // Always re-encrypt the whole string from the current "Start Settings" visible on screen.
    const tempMachine = new LorenzMachine(wheels); // Start from what's on screen
    let out = '';
    for (const char of text) {
      const result = tempMachine.processCharacter(char);
      if (result.outputChar) {
          out += result.outputChar;
      }
    }
    setOutputText(out);
  };

  const handleReset = () => {
    machineRef.current.resetTo(INITIAL_WHEELS);
    updateMachineState();
    setInputText('');
    setOutputText('');
  };

  const handleRandomize = () => {
    const randomWheels = wheels.map(w => ({
      ...w,
      position: Math.floor(Math.random() * w.size)
    }));
    machineRef.current.resetTo(randomWheels);
    updateMachineState();
    // We need to trigger reprocess with the updated ref state, but processText uses 'wheels' state which isn't updated yet in this closure
    // So we manually create the new machine state for processing
    const tempMachine = new LorenzMachine(randomWheels);
    let out = '';
    for (const char of inputText) {
        const result = tempMachine.processCharacter(char);
        if (result.outputChar) {
            out += result.outputChar;
        }
    }
    setOutputText(out);
  };

  return (
    <div className="flex-1 bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">

      <main className="max-w-7xl mx-auto px-6 py-10">

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center shadow-lg shadow-blue-900/50">
              <Settings className="text-white animate-spin-slow" size={18} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Lorenz <span className="text-blue-400">SZ42</span> Simulator
            </h1>
          </div>
          <div className="flex gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
             <button
                onClick={() => setActiveTab('simulator')}
                className={`text-sm font-medium px-4 py-1.5 rounded-md transition-colors ${activeTab === 'simulator' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:text-white'}`}
             >
                Simulator
             </button>
             <button
                onClick={() => setActiveTab('about')}
                className={`text-sm font-medium px-4 py-1.5 rounded-md transition-colors ${activeTab === 'about' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:text-white'}`}
             >
                About Tunny
             </button>
          </div>
        </div>
        
        {activeTab === 'simulator' ? (
          <div className="space-y-10">
            {/* Control Panel (The Machine) */}
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-emerald-500 to-amber-500 opacity-50"></div>
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Settings size={18} className="text-slate-400" />
                    Wheel Settings (Key)
                  </h2>
                  <p className="text-sm text-slate-400">Set the start position of the 12 wheels.</p>
                </div>
                <div className="flex gap-2">
                   <button 
                    onClick={handleRandomize}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-sm font-medium transition-all hover:text-white"
                  >
                    <RefreshCw size={16} /> Randomize
                  </button>
                  <button 
                    onClick={handleReset}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-sm font-medium transition-all hover:text-white"
                  >
                    <SkipBack size={16} /> Reset
                  </button>
                </div>
              </div>

              {/* Wheels Container - Flex Wrap for better flow with large items */}
              <div className="flex flex-wrap xl:flex-nowrap justify-center gap-8 md:gap-12 bg-slate-950/50 p-8 rounded-xl border border-slate-800/50">
                
                {/* Chi Wheels Group */}
                <div className="flex flex-wrap justify-center gap-4">
                    {wheels.filter(w => w.type === 'Chi').map(w => (
                    <WheelControl 
                        key={w.id} 
                        wheel={w} 
                        onIncrement={(id) => handleWheelChange(id, 1)}
                        onDecrement={(id) => handleWheelChange(id, -1)}
                    />
                    ))}
                </div>
                
                {/* Divider */}
                <div className="hidden xl:block w-px self-stretch bg-slate-800 mx-2"></div>
                <div className="w-full h-px bg-slate-800 xl:hidden"></div>

                {/* Motor Wheels Group */}
                <div className="flex flex-wrap justify-center gap-4">
                    {wheels.filter(w => w.type === 'Mu').map(w => (
                    <WheelControl 
                        key={w.id} 
                        wheel={w} 
                        onIncrement={(id) => handleWheelChange(id, 1)}
                        onDecrement={(id) => handleWheelChange(id, -1)}
                    />
                    ))}
                </div>

                {/* Divider */}
                <div className="hidden xl:block w-px self-stretch bg-slate-800 mx-2"></div>
                <div className="w-full h-px bg-slate-800 xl:hidden"></div>

                {/* Psi Wheels Group */}
                <div className="flex flex-wrap justify-center gap-4">
                    {wheels.filter(w => w.type === 'Psi').map(w => (
                    <WheelControl 
                        key={w.id} 
                        wheel={w} 
                        onIncrement={(id) => handleWheelChange(id, 1)}
                        onDecrement={(id) => handleWheelChange(id, -1)}
                    />
                    ))}
                </div>
              </div>
              
              <div className="mt-6 flex flex-wrap justify-center gap-8 text-sm text-slate-500 font-medium font-mono">
                 <div className="flex items-center gap-2"><span className="w-4 h-4 bg-blue-900/50 border border-blue-800 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.3)]"></span> Chi (Χ) Wheels</div>
                 <div className="flex items-center gap-2"><span className="w-4 h-4 bg-amber-900/50 border border-amber-800 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.3)]"></span> Mu (Μ) Wheels</div>
                 <div className="flex items-center gap-2"><span className="w-4 h-4 bg-emerald-900/50 border border-emerald-800 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]"></span> Psi (Ψ) Wheels</div>
              </div>
            </section>

            {/* Input / Output */}
            <section className="grid md:grid-cols-2 gap-6">
              
              {/* Input */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-300 ml-1">Plaintext / Ciphertext Input</label>
                <textarea 
                  value={inputText}
                  onChange={(e) => processText(e.target.value.toUpperCase())}
                  placeholder="TYPE MESSAGE HERE..."
                  className="w-full h-64 bg-slate-900 border border-slate-700 rounded-xl p-6 font-mono text-xl tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none shadow-inner text-slate-200 placeholder-slate-600 transition-all"
                  spellCheck={false}
                />
                <div className="text-xs text-slate-500 text-right">
                   Only A-Z and SPACE supported (plus , . - ! /). Other chars are ignored.
                </div>
              </div>

              {/* Output */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-blue-300 ml-1 flex justify-between">
                  <span>Result</span>
                  <span className="text-xs font-normal text-slate-500">Symmetrical (XOR)</span>
                </label>
                <div className="w-full h-64 bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 font-mono text-xl tracking-widest text-blue-200 shadow-inner overflow-y-auto break-all">
                  {outputText || <span className="text-slate-600 opacity-50">OUTPUT WILL APPEAR HERE...</span>}
                </div>
              </div>

            </section>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
             <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
                <h2 className="text-2xl font-bold text-white mb-4">About the Lorenz SZ40/42</h2>
                <div className="space-y-4 text-slate-300 leading-relaxed">
                  <p>
                    The <strong>Lorenz SZ40, SZ42a, and SZ42b</strong> were German rotor stream cipher machines used by the German High Command during World War II. While the famous Enigma machine was used for field units, the Lorenz (codenamed "Tunny" by the British) was used for high-level strategic communications between Berlin and army group commanders.
                  </p>
                  <p>
                    The machine used the <strong>Vernam cipher</strong> principle (XOR encryption) with a pseudorandom keystream generated by 12 wheels.
                  </p>
                  <ul className="list-disc pl-5 space-y-2 text-slate-400">
                    <li><strong>5 Chi (Χ) wheels:</strong> Stepped regularly with every character.</li>
                    <li><strong>5 Psi (Ψ) wheels:</strong> Stepped irregularly, controlled by the motor wheels.</li>
                    <li><strong>2 Mu (Μ) wheels:</strong> The "Motor" wheels that controlled the stepping of the Psi wheels to create a complex, non-repeating pattern.</li>
                  </ul>
                  <p>
                    British cryptanalysts at <strong>Bletchley Park</strong>, notably <strong>Bill Tutte</strong> and <strong>Tommy Flowers</strong>, deduced the logical structure of the machine without ever seeing one. This effort led to the construction of <strong>Colossus</strong>, the world's first programmable electronic digital computer, designed specifically to break Tunny messages.
                  </p>
                </div>
             </div>
             
             <div className="bg-blue-900/20 border border-blue-900/50 rounded-xl p-6 flex gap-4 items-start">
               <Info className="text-blue-400 shrink-0 mt-1" />
               <div>
                 <h3 className="font-bold text-blue-300 mb-1">How to use this simulator</h3>
                 <p className="text-sm text-blue-200/80">
                   1. Set the 12 wheels to a specific "Start Position" (The Key).<br/>
                   2. Type your message on the left.<br/>
                   3. To decrypt, reset the wheels to the SAME start position and type the ciphertext.<br/>
                   Note: This simulation assumes standard ITA2 Baudot mapping (A-Z).
                 </p>
               </div>
             </div>
          </div>
        )}
      </main>

    </div>
  );
};

export default App;