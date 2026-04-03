import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Eraser, Settings, Info, Eye, EyeOff } from 'lucide-react';
import ConfigSlots from '../shared/ConfigSlots';
import TapeActions from '../shared/TapeActions';
import { MachineState } from './types';
import { getInitialState, processCharacter } from './services/sigabaLogic';
import Rotor from './components/Rotor';
import Keyboard from './components/Keyboard';
import Lampboard from './components/Lampboard';
import Tape from './components/Tape';
import SignalTrace from './components/SignalTrace';
import SettingsPanel from './components/SettingsPanel';
import ExhibitPanel from '../../components/ExhibitPanel';

const App: React.FC = () => {
  const [machineState, setMachineState] = useState<MachineState>(getInitialState());
  const [history, setHistory] = useState<MachineState[]>([]);
  const [litChar, setLitChar] = useState<string | null>(null);
  const [tapeText, setTapeText] = useState<string>('');
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [showTrace, setShowTrace] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  // Audio refs
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize Audio
  useEffect(() => {
    const initAudio = () => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
    };
    window.addEventListener('click', initAudio, { once: true });
    window.addEventListener('keydown', initAudio, { once: true });
  }, []);

  const playSound = (freq: number, duration: number) => {
    if (audioContextRef.current && audioContextRef.current.state === 'running') {
        const osc = audioContextRef.current.createOscillator();
        const gain = audioContextRef.current.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, audioContextRef.current.currentTime);
        gain.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioContextRef.current.destination);
        osc.start();
        osc.stop(audioContextRef.current.currentTime + duration);
    }
  };

  const handleRotorChange = (bankName: 'cipherBank' | 'controlBank' | 'indexBank') => (id: number, newPos: number) => {
    setMachineState(prev => ({
      ...prev,
      [bankName]: prev[bankName].map(r => r.id === id ? { ...r, currentPos: newPos } : r)
    }));
    playSound(200, 0.05);
  };

  const handleKeyPress = (char: string) => {
    setActiveKey(char);
    playSound(400, 0.1);

    setHistory(prev => [...prev, JSON.parse(JSON.stringify(machineState))]);

    const { result, newState } = processCharacter(char, machineState);

    setMachineState(newState);
    setLitChar(result);
    setTapeText(prev => (prev + result).slice(-40));
  };

  const handleKeyRelease = () => {
    setActiveKey(null);
    setLitChar(null);
  };

  const handleBackspace = () => {
    if (history.length === 0) return;

    setActiveKey('BACKSPACE');
    playSound(300, 0.15);
    setTimeout(() => setActiveKey(null), 150);

    const previousState = history[history.length - 1];
    setMachineState(previousState);
    setHistory(prev => prev.slice(0, -1));

    setTapeText(prev => prev.slice(0, -1));
    setLitChar(null);
  };

  const handlePasteInput = useCallback((chars: string[]) => {
    let currentState = machineState;
    const results: string[] = [];
    const history: MachineState[] = [];
    for (const char of chars) {
      history.push(JSON.parse(JSON.stringify(currentState)));
      const { result, newState } = processCharacter(char, currentState);
      results.push(result);
      currentState = newState;
    }
    setHistory(prev => [...prev, ...history]);
    setMachineState(currentState);
    setTapeText(prev => (prev + results.join('')).slice(-40));
  }, [machineState]);

  const handleLoadConfig = useCallback((state: any) => {
    setMachineState(state);
    setTapeText('');
    setHistory([]);
    setLitChar(null);
  }, []);

  const toggleMode = () => {
    setMachineState(prev => ({
      ...prev,
      mode: prev.mode === 'ENCIPHER' ? 'DECIPHER' : 'ENCIPHER'
    }));
  };

  return (
    <div className="flex-1 bg-[#111] flex flex-col">
      <ExhibitPanel id="sigaba" />
      <div className="bg-[#111] text-gray-200 flex flex-col items-center pb-20 overflow-hidden relative">
      {/* Background Texture */}
      <div className="absolute inset-0 opacity-5 pointer-events-none"
           style={{
             backgroundImage: `radial-gradient(circle at 2px 2px, #333 1px, transparent 0)`,
             backgroundSize: '20px 20px'
           }}>
      </div>

      {/* Header */}
      <header className="w-full bg-[#1a1c23] border-b border-gray-700 px-6 py-4 flex justify-between items-center shadow-lg z-10">
        <div className="flex items-center gap-3">
            <div className="bg-amber-600 text-black font-bold px-2 py-1 rounded text-xs tracking-wider">TOP SECRET</div>
            <h1 className="text-xl md:text-2xl font-bold tracking-widest text-gray-100">
              SIGABA <span className="text-gray-500 text-lg">ECM MARK II</span>
            </h1>
        </div>
        <div className="flex gap-2">
            <button
              onClick={() => setShowTrace(!showTrace)}
              className={`p-2 rounded border transition-colors flex items-center gap-1.5 text-xs font-bold ${
                showTrace
                  ? 'bg-amber-900/50 border-amber-700 text-amber-300'
                  : 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'
              }`}
              title="Toggle Signal Trace"
            >
              {showTrace ? <EyeOff size={16} /> : <Eye size={16} />}
              <span className="hidden sm:inline">Trace</span>
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors flex items-center gap-1.5 text-xs font-bold"
              title="Machine Settings"
            >
              <Settings size={16} />
              <span className="hidden sm:inline">Config</span>
            </button>
            <button
              onClick={() => setShowInfo(!showInfo)}
              className={`p-2 rounded border transition-colors ${
                showInfo
                  ? 'bg-blue-900/50 border-blue-700 text-blue-300'
                  : 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'
              }`}
              title="How it works"
            >
              <Info size={16} />
            </button>
        </div>
      </header>

      {/* Config Slots */}
      <div className="w-full max-w-5xl px-6 md:px-10 pt-6">
        <ConfigSlots machineId="sigaba" currentState={machineState} onLoadState={handleLoadConfig} accentColor="amber" />
      </div>

      {/* Main Machine UI */}
      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-5xl px-6 md:px-10 py-8 gap-8">

        {/* Info Panel */}
        {showInfo && (
          <div className="w-full bg-[#1a1c23] border border-gray-700 rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-amber-400 tracking-wider">How SIGABA Works</h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-300">
              <div className="bg-black/20 p-4 rounded-lg border border-amber-800/30">
                <h4 className="text-amber-400 font-bold text-xs uppercase tracking-wider mb-2">Cipher Bank (Bottom)</h4>
                <p className="text-xs leading-relaxed text-gray-400">
                  5 rotors that perform the actual encryption. Unlike Enigma, SIGABA is <strong className="text-gray-200">not reciprocal</strong> — it has
                  separate encipher/decipher modes. Each rotor can be inserted forward or reversed.
                </p>
              </div>
              <div className="bg-black/20 p-4 rounded-lg border border-blue-800/30">
                <h4 className="text-blue-400 font-bold text-xs uppercase tracking-wider mb-2">Control Bank (Middle)</h4>
                <p className="text-xs leading-relaxed text-gray-400">
                  5 rotors that generate stepping signals. The middle 3 rotors step in an odometer pattern.
                  Signals F, G, H, I pass through these rotors to determine <strong className="text-gray-200">which cipher rotors advance</strong>.
                </p>
              </div>
              <div className="bg-black/20 p-4 rounded-lg border border-green-800/30">
                <h4 className="text-green-400 font-bold text-xs uppercase tracking-wider mb-2">Index Bank (Top)</h4>
                <p className="text-xs leading-relaxed text-gray-400">
                  5 rotors that <strong className="text-gray-200">permute the control signals</strong> before they reach the cipher bank stepping magnets.
                  These rotors stay fixed during operation, set once as part of the key.
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500 pt-2 border-t border-gray-800">
              This complex 3-tier stepping mechanism made SIGABA's rotor motion unpredictable.
              It is the only major WWII cipher machine <strong className="text-gray-400">never broken</strong> by an adversary.
              Enable <strong className="text-gray-400">Trace</strong> to watch the stepping signals flow in real time.
            </p>
          </div>
        )}

        {/* Signal Trace */}
        {showTrace && <SignalTrace state={machineState} />}

        {/* Rotors Section */}
        <div className="bg-[#222] p-4 md:p-6 rounded-lg border-2 border-gray-600 shadow-2xl relative w-full">
           <div className="absolute -top-3 left-4 bg-[#222] px-2 text-xs text-gray-400 font-mono">ROTOR BANKS</div>

           <div className="flex flex-col md:flex-row justify-around gap-6 md:gap-2">
              {/* Index Bank */}
              <div className="flex flex-col items-center">
                 <div className="text-[10px] text-gray-500 mb-2 font-bold tracking-widest uppercase border-b border-gray-700 w-full text-center pb-1">Index (Permutation)</div>
                 <div className="flex bg-black/40 p-2 rounded-lg border border-gray-700">
                    {machineState.indexBank.map(r => (
                      <Rotor key={r.id} rotor={r} onChange={handleRotorChange('indexBank')} label={`I-${r.id + 1}`} />
                    ))}
                 </div>
              </div>

              {/* Control Bank */}
              <div className="flex flex-col items-center">
                 <div className="text-[10px] text-gray-500 mb-2 font-bold tracking-widest uppercase border-b border-gray-700 w-full text-center pb-1">Control (Stepping)</div>
                 <div className="flex bg-black/40 p-2 rounded-lg border border-gray-700">
                    {machineState.controlBank.map(r => (
                      <Rotor key={r.id} rotor={r} onChange={handleRotorChange('controlBank')} label={`C-${r.id - 4}`} />
                    ))}
                 </div>
              </div>

              {/* Cipher Bank */}
              <div className="flex flex-col items-center">
                 <div className="text-[10px] text-amber-500/70 mb-2 font-bold tracking-widest uppercase border-b border-amber-900/30 w-full text-center pb-1">Cipher (Main)</div>
                 <div className="flex bg-black/40 p-2 rounded-lg border border-amber-900/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                    {machineState.cipherBank.map(r => (
                      <Rotor key={r.id} rotor={r} onChange={handleRotorChange('cipherBank')} label={`M-${r.id + 1}`} />
                    ))}
                 </div>
              </div>
           </div>
        </div>

        {/* Controls */}
        <div className="w-full flex justify-between items-center bg-[#1a1c23] p-4 rounded-lg border border-gray-700">
           <div className="flex items-center gap-4">
               <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 uppercase">Operation Mode</span>
                  <button
                    onClick={toggleMode}
                    className={`text-sm font-bold px-4 py-1 rounded transition-colors border ${machineState.mode === 'ENCIPHER' ? 'bg-red-900/50 border-red-700 text-red-200' : 'bg-green-900/50 border-green-700 text-green-200'}`}
                  >
                    {machineState.mode}
                  </button>
               </div>
           </div>

           <div className="flex gap-2">
              <button onClick={() => { setTapeText(''); setHistory([]); }} className="p-2 hover:bg-gray-700 rounded text-gray-400" title="Clear Tape">
                 <Eraser size={20} />
              </button>
              <TapeActions outputText={tapeText} onProcessInput={handlePasteInput} accentColor="amber" />
           </div>
        </div>

        {/* Lampboard */}
        <Lampboard litChar={litChar} />

        {/* Tape */}
        <Tape text={tapeText} />

        {/* Keyboard */}
        <Keyboard
          onPress={handleKeyPress}
          onRelease={handleKeyRelease}
          onBackspace={handleBackspace}
          activeKey={activeKey}
        />

      </main>

      {/* Settings Modal */}
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        state={machineState}
        onUpdateState={setMachineState}
        onReset={() => {
          setMachineState(getInitialState());
          setTapeText('');
          setHistory([]);
        }}
      />
    </div>
    </div>
  );
};

export default App;
