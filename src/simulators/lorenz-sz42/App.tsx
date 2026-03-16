import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Settings, Eraser, Info, RefreshCw, Cpu } from 'lucide-react';
import { LorenzMachine } from './services/lorenzService';
import { INITIAL_WHEELS, BAUDOT_MAP } from './constants';
import { WheelConfig } from './types';
import WheelControl from './components/WheelControl';

const VALID_CHARS = Object.keys(BAUDOT_MAP);

const KEYBOARD_ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['Z','X','C','V','B','N','M'],
];

const EXTRA_KEYS = [' ', '.', ',', '-', '!', '/'];

function App() {
  const machineRef = useRef<LorenzMachine>(new LorenzMachine(INITIAL_WHEELS));
  const [wheels, setWheels] = useState<WheelConfig[]>(INITIAL_WHEELS);
  const [startWheels, setStartWheels] = useState<WheelConfig[]>(JSON.parse(JSON.stringify(INITIAL_WHEELS)));
  const [inputTape, setInputTape] = useState<string>('');
  const [outputTape, setOutputTape] = useState<string>('');
  const [litChar, setLitChar] = useState<string | null>(null);
  const [lastKeystream, setLastKeystream] = useState<number[] | null>(null);
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const outputTapeRef = useRef<HTMLDivElement>(null);

  const processChar = useCallback((char: string) => {
    const upper = char.toUpperCase();
    if (!VALID_CHARS.includes(upper)) return;

    const result = machineRef.current.processCharacter(upper);
    if (result.outputChar) {
      setInputTape(prev => prev + upper);
      setOutputTape(prev => prev + result.outputChar);
      setLitChar(result.outputChar);
      setLastKeystream(result.keystream);
      setWheels([...machineRef.current.getCurrentState()]);
    }
  }, []);

  const handleKeyDown = useCallback((char: string) => {
    if (pressedKeys.has(char)) return;
    setPressedKeys(prev => new Set(prev).add(char));
    processChar(char);
  }, [pressedKeys, processChar]);

  const handleKeyUp = useCallback((char: string) => {
    setLitChar(null);
    setLastKeystream(null);
    setPressedKeys(prev => {
      const next = new Set(prev);
      next.delete(char);
      return next;
    });
  }, []);

  // Physical keyboard handling
  useEffect(() => {
    const isInputFocused = () => {
      const tag = document.activeElement?.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isInputFocused()) return;
      const char = e.key === ' ' ? ' ' : e.key.toUpperCase();
      if (VALID_CHARS.includes(char) && !e.repeat && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (char === ' ') e.preventDefault();
        handleKeyDown(char);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (isInputFocused()) return;
      const char = e.key === ' ' ? ' ' : e.key.toUpperCase();
      if (VALID_CHARS.includes(char)) {
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

  // Auto-scroll tape
  useEffect(() => {
    if (outputTapeRef.current) {
      outputTapeRef.current.scrollLeft = outputTapeRef.current.scrollWidth;
    }
  }, [outputTape]);

  const handleClearTape = () => {
    // Reset machine back to starting wheel positions
    machineRef.current.resetTo(startWheels);
    setWheels(JSON.parse(JSON.stringify(startWheels)));
    setInputTape('');
    setOutputTape('');
    setLitChar(null);
    setLastKeystream(null);
  };

  const handleReset = () => {
    machineRef.current.resetTo(INITIAL_WHEELS);
    const fresh = JSON.parse(JSON.stringify(INITIAL_WHEELS));
    setWheels(fresh);
    setStartWheels(fresh);
    setInputTape('');
    setOutputTape('');
    setLitChar(null);
    setLastKeystream(null);
  };

  const handleRandomize = () => {
    const randomWheels: WheelConfig[] = INITIAL_WHEELS.map(w => ({
      ...w,
      position: Math.floor(Math.random() * w.size)
    }));
    machineRef.current.resetTo(randomWheels);
    const copy = JSON.parse(JSON.stringify(randomWheels));
    setWheels(copy);
    setStartWheels(JSON.parse(JSON.stringify(randomWheels)));
    setInputTape('');
    setOutputTape('');
    setLitChar(null);
    setLastKeystream(null);
  };

  const handleWheelChange = (id: string, delta: number) => {
    // Only allow wheel changes when tape is empty (machine not in use)
    if (inputTape.length > 0) return;
    const currentWheels = machineRef.current.getCurrentState();
    const wheel = currentWheels.find(w => w.id === id);
    if (wheel) {
      let newPos = wheel.position + delta;
      if (newPos < 0) newPos = wheel.size - 1;
      if (newPos >= wheel.size) newPos = 0;
      wheel.position = newPos;
      const updated = [...machineRef.current.getCurrentState()];
      setWheels(updated);
      setStartWheels(JSON.parse(JSON.stringify(updated)));
    }
  };

  const displayChar = (c: string) => {
    if (c === ' ') return '\u2423'; // visible space
    return c;
  };

  return (
    <div className="flex-1 bg-slate-950 flex flex-col items-center justify-start py-10 px-6 text-slate-200">

      {/* Header */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-8">
        <div className="flex flex-col">
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tighter">
            LORENZ <span className="text-blue-400">SZ42</span>
          </h1>
          <span className="text-slate-500 text-xs tracking-[0.3em] font-mono">GERMAN TELEPRINTER CIPHER</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors border border-slate-700"
            title="About"
          >
            <Info size={20} />
          </button>
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all border shadow-lg ${
              isSettingsOpen
                ? 'bg-blue-900/30 border-blue-700 text-blue-400'
                : 'bg-slate-800 hover:bg-slate-700 text-blue-400 border-slate-700'
            }`}
          >
            <Settings size={20} />
            <span className="hidden sm:inline">WHEELS</span>
          </button>
        </div>
      </div>

      {/* Machine */}
      <div className="w-full max-w-4xl flex flex-col gap-8 relative z-0">

        {/* Wheel Settings Panel */}
        {isSettingsOpen && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden animate-in slide-in-from-top-2 duration-200">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-amber-500 to-emerald-500 opacity-50"></div>

            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Cpu size={18} className="text-blue-400" />
                  Wheel Settings (Key)
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {inputTape.length > 0
                    ? 'Clear tape to change wheel positions'
                    : 'Set start positions for the 12 wheels'}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleRandomize}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-xs font-medium transition-all hover:text-white"
                >
                  <RefreshCw size={14} /> Randomize
                </button>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-xs font-medium transition-all hover:text-white"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-6 bg-slate-950/50 p-6 rounded-xl border border-slate-800/50">
              {/* Chi wheels */}
              <div className="flex flex-col items-center gap-2">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Chi Wheels</span>
                <div className="flex gap-3">
                  {wheels.filter(w => w.type === 'Chi').map(w => (
                    <WheelControl
                      key={w.id}
                      wheel={w}
                      onIncrement={(id) => handleWheelChange(id, 1)}
                      onDecrement={(id) => handleWheelChange(id, -1)}
                    />
                  ))}
                </div>
              </div>

              <div className="w-px self-stretch bg-slate-800 hidden sm:block"></div>

              {/* Mu wheels */}
              <div className="flex flex-col items-center gap-2">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Motor Wheels</span>
                <div className="flex gap-3">
                  {wheels.filter(w => w.type === 'Mu').map(w => (
                    <WheelControl
                      key={w.id}
                      wheel={w}
                      onIncrement={(id) => handleWheelChange(id, 1)}
                      onDecrement={(id) => handleWheelChange(id, -1)}
                    />
                  ))}
                </div>
              </div>

              <div className="w-px self-stretch bg-slate-800 hidden sm:block"></div>

              {/* Psi wheels */}
              <div className="flex flex-col items-center gap-2">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Psi Wheels</span>
                <div className="flex gap-3">
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
            </div>
          </div>
        )}

        {/* Lampboard - shows output character */}
        <div className="relative">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Output</span>
              {lastKeystream && (
                <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                  <span className="text-blue-400">K</span>
                  <span>=</span>
                  {lastKeystream.map((b, i) => (
                    <span key={i} className={b ? 'text-blue-300' : 'text-slate-600'}>{b}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap justify-center gap-1.5">
              {VALID_CHARS.map(c => {
                const isLit = litChar === c;
                return (
                  <div
                    key={c}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center font-mono text-sm font-bold transition-all duration-100 ${
                      isLit
                        ? 'bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.6)] scale-110'
                        : 'bg-slate-800/50 text-slate-600 border border-slate-800'
                    }`}
                  >
                    {displayChar(c)}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Keyboard */}
        <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 shadow-2xl">
          <div className="flex flex-col items-center gap-2">
            {KEYBOARD_ROWS.map((row, ri) => (
              <div key={ri} className="flex gap-1.5" style={{ marginLeft: ri === 1 ? '20px' : ri === 2 ? '40px' : 0 }}>
                {row.map(c => (
                  <button
                    key={c}
                    onMouseDown={() => handleKeyDown(c)}
                    onMouseUp={() => handleKeyUp(c)}
                    onMouseLeave={() => { if (pressedKeys.has(c)) handleKeyUp(c); }}
                    className={`w-10 h-10 sm:w-11 sm:h-11 rounded-lg font-mono text-sm font-bold transition-all select-none ${
                      pressedKeys.has(c)
                        ? 'bg-blue-600 text-white shadow-inner translate-y-0.5'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600 shadow-md hover:shadow-lg active:translate-y-0.5'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            ))}
            {/* Extra keys row */}
            <div className="flex gap-1.5 mt-1">
              {EXTRA_KEYS.map(c => (
                <button
                  key={c}
                  onMouseDown={() => handleKeyDown(c)}
                  onMouseUp={() => handleKeyUp(c)}
                  onMouseLeave={() => { if (pressedKeys.has(c)) handleKeyUp(c); }}
                  className={`h-10 rounded-lg font-mono text-sm font-bold transition-all select-none ${
                    c === ' ' ? 'w-40 sm:w-48' : 'w-10 sm:w-11'
                  } ${
                    pressedKeys.has(c)
                      ? 'bg-blue-600 text-white shadow-inner translate-y-0.5'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600 shadow-md hover:shadow-lg active:translate-y-0.5'
                  }`}
                >
                  {c === ' ' ? 'SPACE' : c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Output Tape */}
        <div className="relative group">
          <div className="bg-[#fdf6e3] rounded-xl p-4 shadow-inner border border-amber-200/30 overflow-hidden">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] font-bold text-amber-800/50 uppercase tracking-wider">Tape Output</span>
              <span className="text-[10px] font-mono text-amber-800/30">{outputTape.length} chars</span>
            </div>
            <div
              ref={outputTapeRef}
              className="overflow-x-auto whitespace-nowrap scrollbar-thin pb-1"
            >
              <div className="flex gap-0.5 min-h-[2.5rem]">
                {outputTape.split('').map((c, i) => (
                  <div
                    key={i}
                    className="w-7 h-10 flex items-center justify-center font-mono text-lg font-bold text-amber-900 border-r border-amber-200/30 last:border-r-0 flex-shrink-0"
                  >
                    {displayChar(c)}
                  </div>
                ))}
                {outputTape.length === 0 && (
                  <span className="text-amber-800/30 font-mono text-sm py-2">TYPE TO ENCRYPT...</span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={handleClearTape}
            className="absolute top-1/2 -translate-y-1/2 -right-12 sm:-right-14 text-slate-600 hover:text-red-400 p-2 transition-colors opacity-0 group-hover:opacity-100"
            title="Clear Tape"
          >
            <Eraser size={22} />
          </button>
        </div>

        {/* Input Tape (secondary, smaller) */}
        {inputTape.length > 0 && (
          <div className="bg-slate-900/40 rounded-xl p-3 border border-slate-800/50">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1 block">Input</span>
            <div className="font-mono text-xs text-slate-500 tracking-[0.2em] break-all">
              {inputTape.split('').map((c, i) => (
                <span key={i}>{displayChar(c)}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Info Panel */}
      <div className={`fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-700 p-6 transform transition-transform duration-300 z-40 ${showInfo ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="max-w-3xl mx-auto relative">
          <button onClick={() => setShowInfo(false)} className="absolute top-0 right-0 p-2 text-slate-500 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <h3 className="text-xl font-bold text-blue-400 mb-2">About the Lorenz SZ42</h3>
          <p className="text-sm text-slate-300 mb-4 leading-relaxed">
            The <strong>Lorenz SZ40/42</strong> was used by the German High Command for strategic teleprinter communications in WWII.
            Codenamed <strong>"Tunny"</strong> by British cryptanalysts, it used the Vernam cipher (XOR) with a keystream generated
            by <strong>12 wheels</strong>: 5 Chi (regular stepping), 5 Psi (irregular), and 2 Motor wheels controlling Psi movement.
            Breaking Tunny led to the construction of <strong>Colossus</strong>, the world's first programmable electronic computer.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono text-slate-500">
            <div className="flex items-center gap-2"><span className="w-3 h-3 bg-blue-500/30 border border-blue-700 rounded-full"></span> Chi wheels step every character</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 bg-amber-500/30 border border-amber-700 rounded-full"></span> Motor wheels control Psi stepping</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 bg-emerald-500/30 border border-emerald-700 rounded-full"></span> Psi wheels step irregularly</div>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Encryption is symmetrical (XOR): type ciphertext with the same wheel start positions to decrypt.
            Uses ITA2 Baudot encoding (A-Z, space, and select punctuation).
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
