import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Settings, RotateCcw, ChevronUp, ChevronDown } from 'lucide-react';
import { DualColumnWiring, DualColumnTrace } from '../shared/DualColumnWiring';
import ConfigSlots from '../shared/ConfigSlots';
import TapeActions from '../shared/TapeActions';

// ── Hebern Constants ───────────────────────────────────────────────
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const KEYBOARD_LAYOUT = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

const ROTORS: Record<string, string> = {
  R1: 'DMTWSILRUYQNKFEJCAZBPGXOHV',
  R2: 'HQZGPJTMOBLNCIFDYAWVEUSKRX',
  R3: 'UQNTLSZFMREHDPXKIBVYGJCWOA',
  R4: 'QJHGENLKZMDRPIFYXSTCWBAUOV',
  R5: 'CIABORJXLHWMPFZSVDYEGNTKUQ',
};

const mod = (n: number) => ((n % 26) + 26) % 26;
const toChar = (i: number) => String.fromCharCode(mod(i) + 65);

// ── Rotor math ─────────────────────────────────────────────────────
function computeWiring(wiring: string, position: number): number[] {
  return Array.from({ length: 26 }, (_, i) => {
    const pin = mod(i + position);
    const contact = wiring.charCodeAt(pin) - 65;
    return mod(contact - position);
  });
}

function traceSignal(inputChar: string, wiring: string, position: number): DualColumnTrace {
  const inIdx = inputChar.charCodeAt(0) - 65;
  const pin = mod(inIdx + position);
  const contact = wiring.charCodeAt(pin) - 65;
  const outIdx = mod(contact - position);
  return {
    forward: [inIdx, outIdx],
    inputChar,
    outputChar: toChar(outIdx),
  };
}

// ════════════════════════════════════════════════════════════════════
const App: React.FC = () => {
  const [rotorId, setRotorId] = useState('R1');
  const [position, setPosition] = useState(0);
  const [trace, setTrace] = useState<DualColumnTrace | null>(null);
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const [tape, setTape] = useState('');
  const [history, setHistory] = useState<{ position: number }[]>([]);

  const wiring = ROTORS[rotorId];

  // Compute effective wiring for SVG (invert to rightVis→leftVis format)
  const dualWiring = useMemo(() => {
    const fw = computeWiring(wiring, position);
    const inv = new Array(26);
    for (let i = 0; i < 26; i++) inv[fw[i]] = i;
    return inv;
  }, [wiring, position]);

  const rotorPairs = useMemo(() => [
    { label: 'ROTOR', sublabel: rotorId, offset: position },
  ], [rotorId, position]);

  // ── Key handling ────────────────────────────────────────────────
  const handleKeyDown = useCallback((char: string) => {
    if (pressedKey) return;
    setHistory(prev => [...prev, { position }]);
    const newPos = (position + 1) % 26;
    const sig = traceSignal(char, wiring, newPos);
    setTrace(sig);
    setPressedKey(char);
    setTape(prev => prev + sig.outputChar);
    setPosition(newPos);
  }, [position, wiring, pressedKey]);

  const handleKeyUp = useCallback(() => {
    setPressedKey(null);
  }, []);

  const handlePasteInput = useCallback((chars: string[]) => {
    let currentPos = position;
    const results: string[] = [];
    const historyBatch: { position: number }[] = [];
    for (const char of chars) {
      historyBatch.push({ position: currentPos });
      const newPos = (currentPos + 1) % 26;
      const sig = traceSignal(char, wiring, newPos);
      results.push(sig.outputChar!);
      currentPos = newPos;
    }
    setHistory(prev => [...prev, ...historyBatch]);
    setPosition(currentPos);
    setTape(prev => prev + results.join(''));
    setTrace(null);
    setPressedKey(null);
  }, [position, wiring]);

  const handleLoadConfig = useCallback((loadedState: any) => {
    setRotorId(loadedState.rotorId);
    setPosition(loadedState.position);
    setHistory([]);
    setTape('');
    setTrace(null);
    setPressedKey(null);
  }, []);

  const handleBackspace = useCallback(() => {
    if (history.length === 0) return;
    setPosition(history[history.length - 1].position);
    setHistory(prev => prev.slice(0, -1));
    setTape(prev => prev.slice(0, -1));
    setTrace(null);
    setPressedKey(null);
  }, [history]);

  useEffect(() => {
    const isInput = () => {
      const t = document.activeElement?.tagName;
      return t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT';
    };
    const down = (e: KeyboardEvent) => {
      if (isInput()) return;
      const ch = e.key.toUpperCase();
      if (/^[A-Z]$/.test(ch) && !e.repeat && !e.metaKey && !e.ctrlKey && !e.altKey) handleKeyDown(ch);
      if (e.key === 'Backspace') handleBackspace();
    };
    const up = (e: KeyboardEvent) => {
      if (isInput()) return;
      if (/^[A-Z]$/.test(e.key.toUpperCase())) handleKeyUp();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [handleKeyDown, handleKeyUp, handleBackspace]);

  const handleReset = () => {
    setPosition(0);
    setTrace(null);
    setPressedKey(null);
    setTape('');
    setHistory([]);
  };

  return (
    <div className="flex-1 bg-slate-950 flex flex-col items-center px-4 py-8 text-slate-200">
      <div className="w-full max-w-4xl">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              HEBERN <span className="text-teal-400">WIRING EXPLORER</span>
            </h1>
            <p className="text-xs text-slate-500 font-mono tracking-widest">SINGLE ROTOR — MECHANICALLY ACCURATE SIGNAL TRACER</p>
          </div>
          <button onClick={handleReset}
            className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Reset">
            <RotateCcw size={18} />
          </button>
        </div>

        {/* Config Slots */}
        <div className="mb-4">
          <ConfigSlots machineId="hebern-wiring" currentState={{ rotorId, position }} onLoadState={handleLoadConfig} accentColor="teal" />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-8 mb-6">
          <div className="flex flex-col items-center">
            <div className="text-[9px] text-slate-600 font-bold uppercase mb-1">Rotor</div>
            <select value={rotorId} onChange={e => { setRotorId(e.target.value); setTrace(null); }}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono">
              {Object.keys(ROTORS).map(id => <option key={id} value={id}>{id}</option>)}
            </select>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-[9px] text-slate-600 font-bold uppercase mb-1">Position</div>
            <div className="flex items-center gap-0.5">
              <button onClick={() => setPosition(mod(position + 1))} className="p-0.5 text-slate-600 hover:text-teal-400 transition-colors"><ChevronUp size={14} /></button>
              <div className="w-8 h-9 bg-slate-800 border border-slate-600 rounded-lg flex items-center justify-center font-mono font-bold text-teal-400 text-lg">
                {toChar(position)}
              </div>
              <button onClick={() => setPosition(mod(position - 1))} className="p-0.5 text-slate-600 hover:text-teal-400 transition-colors"><ChevronDown size={14} /></button>
            </div>
          </div>
        </div>

        {/* SVG Wiring Diagram */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-2 sm:p-3 mb-6 overflow-x-auto">
          <DualColumnWiring
            rotorPairs={rotorPairs}
            wirings={[dualWiring]}
            trace={trace}
            accentColor="#0d9488"
          />
        </div>

        {/* Signal Path Text */}
        {trace && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 font-mono text-sm">
              <span className="text-amber-400 font-bold">{trace.inputChar}</span>
              <span className="text-slate-600">→</span>
              <span className="text-teal-400 text-[10px]">[{rotorId}]</span>
              <span className="text-slate-600">→</span>
              <span className="text-emerald-400 font-bold text-lg">{trace.outputChar}</span>
            </div>
          </div>
        )}

        {/* Keyboard */}
        <div className="flex flex-col items-center gap-2 mb-6 select-none">
          {KEYBOARD_LAYOUT.map((row, rIdx) => (
            <div key={rIdx} className="flex gap-1.5 sm:gap-2">
              {row.split('').map(char => {
                const isActive = pressedKey === char;
                const isOutput = trace?.outputChar === char;
                return (
                  <button key={char}
                    onMouseDown={e => { e.preventDefault(); handleKeyDown(char); }}
                    onMouseUp={e => { e.preventDefault(); handleKeyUp(); }}
                    onMouseLeave={() => { if (isActive) handleKeyUp(); }}
                    onTouchStart={e => { e.preventDefault(); handleKeyDown(char); }}
                    onTouchEnd={e => { e.preventDefault(); handleKeyUp(); }}
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg border-2 flex items-center justify-center
                      text-base sm:text-lg font-mono font-bold transition-all ${
                      isActive ? 'bg-teal-600 border-teal-500 text-white scale-95' :
                      isOutput ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400' :
                      'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}>
                    {char}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Output Tape */}
        {(
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 mb-6">
            <div className="flex justify-between items-center mb-2">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Output Tape</div>
              <div className="flex items-center gap-2">
                <TapeActions outputText={tape} onProcessInput={handlePasteInput} accentColor="teal" />
                <button onClick={() => { setTape(''); setHistory([]); }}
                  className="text-xs text-slate-500 hover:text-red-400 transition-colors">Clear</button>
              </div>
            </div>
            <div className="font-mono text-lg tracking-widest text-teal-400 break-all">
              {tape ? tape.match(/.{1,5}/g)?.join(' ') : <span className="text-slate-700 text-sm tracking-normal">Type or paste to begin...</span>}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-5 text-xs text-slate-500 space-y-2">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">About the Hebern Electric</div>
          <p>
            Edward Hebern's 1918 invention was the <span className="text-white">world's first rotor cipher machine</span>.
            A single rotor scrambles the alphabet — each wire inside connects an input contact to a different output
            contact, creating a substitution cipher.
          </p>
          <p>
            The rotor <span className="text-teal-400">steps one position</span> after each letter, shifting all 26 wiring
            connections. This means the substitution changes with every character, making simple frequency analysis much harder.
          </p>
          <p>
            With only one rotor and 26 positions, the Hebern repeats after 26 letters — far too short
            for security. The Enigma solved this by chaining multiple rotors together, which you can see
            in the Enigma I and M4 wiring explorers.
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;
