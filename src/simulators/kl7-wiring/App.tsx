import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RotateCcw, ChevronUp, ChevronDown, Lock, Unlock } from 'lucide-react';
import { WiringDiagram, WiringTrace } from '../shared/WiringDiagram';

// ── KL-7 Constants ────────────────────────────────────────────────
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const KEYBOARD_LAYOUT = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

const mod = (n: number) => ((n % 26) + 26) % 26;
const toChar = (i: number) => String.fromCharCode(mod(i) + 65);

// ── Rotor generation (matches kl7/App.tsx exactly) ────────────────
function generateRotorWiring(seed: number): number[] {
  const wiring = Array.from({ length: 26 }, (_, i) => i);
  let s = seed;
  for (let i = 25; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [wiring[i], wiring[j]] = [wiring[j], wiring[i]];
  }
  return wiring;
}

function invertWiring(wiring: number[]): number[] {
  const inv = new Array(wiring.length);
  for (let i = 0; i < wiring.length; i++) inv[wiring[i]] = i;
  return inv;
}

function generateNotches(seed: number, count: number): number[] {
  const notches: Set<number> = new Set();
  let s = seed;
  while (notches.size < count) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    notches.add(s % 26);
  }
  return Array.from(notches).sort((a, b) => a - b);
}

interface RotorDef {
  wiring: number[];
  inverseWiring: number[];
  notches: number[];
}

const ROTOR_BANK: RotorDef[] = Array.from({ length: 12 }, (_, i) => {
  const wiring = generateRotorWiring((i + 1) * 4957);
  return {
    wiring,
    inverseWiring: invertWiring(wiring),
    notches: generateNotches((i + 1) * 3571, 3 + (i % 3)),
  };
});

// ── Effective wiring for the diagram ──────────────────────────────
function computeEffectiveWiring(wiring: number[], position: number): number[] {
  return Array.from({ length: 26 }, (_, i) => {
    const pin = mod(i + position);
    const contact = wiring[pin];
    return mod(contact - position);
  });
}

// ── Trace signal through all 8 rotors ─────────────────────────────
function traceFullSignal(
  inputChar: string,
  rotorIds: number[],
  positions: number[],
  mode: 'ENCIPHER' | 'DECIPHER',
): WiringTrace {
  const inIdx = inputChar.charCodeAt(0) - 65;
  const forward: number[] = [inIdx];

  let signal = inIdx;
  if (mode === 'ENCIPHER') {
    for (let i = 0; i < 8; i++) {
      const r = ROTOR_BANK[rotorIds[i]];
      const pos = positions[i];
      signal = mod(signal + pos);
      signal = r.wiring[signal];
      signal = mod(signal - pos);
      forward.push(signal);
    }
  } else {
    // Decipher: pass through rotors in reverse order using inverse wiring
    for (let i = 7; i >= 0; i--) {
      const r = ROTOR_BANK[rotorIds[i]];
      const pos = positions[i];
      signal = mod(signal + pos);
      signal = r.inverseWiring[signal];
      signal = mod(signal - pos);
      forward.push(signal);
    }
  }

  return {
    forward,
    inputChar,
    outputChar: toChar(signal),
  };
}

// ── Stepping logic (matches kl7/App.tsx) ──────────────────────────
function stepPositions(positions: number[], rotorIds: number[]): number[] {
  const newPos = [...positions];
  // Rotor 0 (rightmost) always steps
  newPos[0] = mod(newPos[0] + 1);
  // Each subsequent rotor steps if the previous is at a notch
  for (let i = 1; i < 8; i++) {
    if (ROTOR_BANK[rotorIds[i - 1]].notches.includes(newPos[i - 1])) {
      newPos[i] = mod(newPos[i] + 1);
    }
  }
  return newPos;
}

// ════════════════════════════════════════════════════════════════════
const App: React.FC = () => {
  const [rotorIds, setRotorIds] = useState([0, 1, 2, 3, 4, 5, 6, 7]);
  const [positions, setPositions] = useState([0, 0, 0, 0, 0, 0, 0, 0]);
  const [trace, setTrace] = useState<WiringTrace | null>(null);
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const [tape, setTape] = useState('');
  const [history, setHistory] = useState<{ positions: number[] }[]>([]);
  const [mode, setMode] = useState<'ENCIPHER' | 'DECIPHER'>('ENCIPHER');

  // Compute effective wirings for diagram (8 gaps)
  const effectiveWirings = useMemo(() => {
    if (mode === 'ENCIPHER') {
      return rotorIds.map((rid, i) => computeEffectiveWiring(ROTOR_BANK[rid].wiring, positions[i]));
    } else {
      // Decipher: reverse rotor order, use inverse wirings
      const reversed = [...rotorIds].reverse();
      const reversedPos = [...positions].reverse();
      return reversed.map((rid, i) => computeEffectiveWiring(ROTOR_BANK[rid].inverseWiring, reversedPos[i]));
    }
  }, [rotorIds, positions, mode]);

  // 9 columns (INPUT + 8 rotors), 8 gaps
  const displayOrder = mode === 'ENCIPHER' ? rotorIds : [...rotorIds].reverse();
  const displayPositions = mode === 'ENCIPHER' ? positions : [...positions].reverse();

  const columns = useMemo(() => [
    { label: 'INPUT' },
    ...displayOrder.map((rid, i) => ({
      label: `R${mode === 'ENCIPHER' ? i + 1 : 8 - i}`,
      sublabel: `#${rid + 1}`,
    })),
    { label: 'OUTPUT' },
  ], [displayOrder, mode]);

  const gapLabels = useMemo(
    () => displayOrder.map((rid, i) => ({
      name: `ROTOR ${mode === 'ENCIPHER' ? i + 1 : 8 - i}`,
      detail: `#${rid + 1} (${toChar(displayPositions[i])})`,
    })),
    [displayOrder, displayPositions, mode],
  );

  // ── Key handling ────────────────────────────────────────────────
  const handleKeyDown = useCallback((char: string) => {
    if (pressedKey) return;
    setHistory(prev => [...prev, { positions }]);
    const newPos = stepPositions(positions, rotorIds);
    const sig = traceFullSignal(char, rotorIds, newPos, mode);
    setTrace(sig);
    setPressedKey(char);
    setTape(prev => prev + sig.outputChar);
    setPositions(newPos);
  }, [positions, rotorIds, pressedKey, mode]);

  const handleKeyUp = useCallback(() => {
    setPressedKey(null);
  }, []);

  const handleBackspace = useCallback(() => {
    if (history.length === 0) return;
    setPositions(history[history.length - 1].positions);
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
    setPositions([0, 0, 0, 0, 0, 0, 0, 0]);
    setTrace(null);
    setPressedKey(null);
    setTape('');
    setHistory([]);
  };

  const handleRotorChange = (slot: number, newId: number) => {
    setRotorIds(prev => { const n = [...prev]; n[slot] = newId; return n; });
    setTrace(null);
  };

  const handlePositionChange = (slot: number, delta: number) => {
    setPositions(prev => { const n = [...prev]; n[slot] = mod(n[slot] + delta); return n; });
    setTrace(null);
  };

  return (
    <div className="flex-1 bg-[#0e1218] flex flex-col items-center px-4 py-8 text-slate-200">
      <div className="w-full max-w-5xl">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              KL-7 <span className="text-blue-400">WIRING EXPLORER</span>
            </h1>
            <p className="text-xs text-slate-500 font-mono tracking-widest">ADONIS — 8 ROTORS, NO REFLECTOR</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleReset}
              className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Reset">
              <RotateCcw size={18} />
            </button>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => { setMode('ENCIPHER'); setTrace(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              mode === 'ENCIPHER'
                ? 'bg-blue-950/40 border border-blue-700/50 text-blue-400'
                : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-blue-400'
            }`}>
            <Lock size={16} /> Encipher
          </button>
          <button onClick={() => { setMode('DECIPHER'); setTrace(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              mode === 'DECIPHER'
                ? 'bg-blue-950/40 border border-blue-700/50 text-blue-400'
                : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-blue-400'
            }`}>
            <Unlock size={16} /> Decipher
          </button>
          <span className="text-xs text-slate-500 font-mono">
            {mode === 'ENCIPHER' ? 'Signal: R1→R2→...→R8' : 'Signal: R8→R7→...→R1 (inverse wirings)'}
          </span>
        </div>

        {/* Rotor Selection and Position Controls */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 mb-6">
          <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">Rotor Assembly — 8 slots from 12 available</div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
            {rotorIds.map((rid, slot) => {
              const atNotch = ROTOR_BANK[rid].notches.includes(positions[slot]);
              return (
                <div key={slot} className="flex flex-col items-center gap-1">
                  <label className="text-[9px] font-mono text-slate-500">R{slot + 1}</label>
                  <select
                    value={rid}
                    onChange={e => handleRotorChange(slot, Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-1 py-1 text-xs font-mono text-blue-300 focus:outline-none"
                  >
                    {ROTOR_BANK.map((_, ri) => (
                      <option key={ri} value={ri}>#{ri + 1}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-0.5 mt-1">
                    <button onClick={() => handlePositionChange(slot, 1)}
                      className="p-0.5 text-slate-600 hover:text-blue-400 transition-colors">
                      <ChevronUp size={12} />
                    </button>
                    <div className={`w-7 h-8 rounded-lg border flex items-center justify-center font-mono font-bold text-sm ${
                      atNotch
                        ? 'bg-blue-900/40 border-blue-600/60 text-blue-300'
                        : 'bg-slate-800 border-slate-600 text-slate-300'
                    }`}>
                      {toChar(positions[slot])}
                    </div>
                    <button onClick={() => handlePositionChange(slot, -1)}
                      className="p-0.5 text-slate-600 hover:text-blue-400 transition-colors">
                      <ChevronDown size={12} />
                    </button>
                  </div>
                  {atNotch && <div className="text-[7px] text-blue-400 font-mono">notch</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* SVG Wiring Diagram */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-2 sm:p-3 mb-6 overflow-x-auto">
          <WiringDiagram
            columns={columns}
            gapLabels={gapLabels}
            wirings={effectiveWirings}
            trace={trace}
            accentColor="#3b82f6"
            columnOffsets={[...displayPositions, 0]}
          />
        </div>

        {/* Signal Path Text */}
        {trace && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-1.5 font-mono text-sm flex-wrap">
              <span className="text-amber-400 font-bold">{trace.inputChar}</span>
              {displayOrder.map((rid, i) => (
                <React.Fragment key={i}>
                  <span className="text-slate-600">→</span>
                  <span className="text-blue-400 text-[10px]">[R{mode === 'ENCIPHER' ? i + 1 : 8 - i}&sup;{mode === 'DECIPHER' ? '⁻¹' : ''}]</span>
                </React.Fragment>
              ))}
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
                      isActive ? 'bg-blue-600 border-blue-500 text-white scale-95' :
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
        {tape && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 mb-6">
            <div className="flex justify-between items-center mb-2">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Output Tape</div>
              <button onClick={() => { setTape(''); setHistory([]); }}
                className="text-xs text-slate-500 hover:text-red-400 transition-colors">Clear</button>
            </div>
            <div className="font-mono text-lg tracking-widest text-blue-400 break-all">
              {tape.match(/.{1,5}/g)?.join(' ')}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-5 text-xs text-slate-500 space-y-2">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">About the KL-7 (ADONIS)</div>
          <p>
            The <span className="text-white">KL-7</span>, codenamed <span className="text-blue-400">ADONIS</span>, was
            NATO's primary cipher machine from 1952 to 1983. It used <span className="text-white">8 rotors</span> selected
            from a set of 12, each with multiple notches creating highly irregular stepping patterns.
          </p>
          <p>
            Unlike the Enigma, the KL-7 has <span className="text-blue-400">no reflector</span> — the signal passes forward
            through all 8 rotors in sequence, producing the output at the far end. This means the machine is
            <span className="text-white"> not self-reciprocal</span>: encrypting a letter does not necessarily produce the
            original when typed again, so a separate decrypt mode is needed.
          </p>
          <p>
            The machine historically used <span className="text-white">36-contact rotors</span> (26 letters + 10 figures),
            but this explorer shows the 26-letter mode. Multiple notches per rotor (3-5 each) create complex, irregular
            stepping — far harder to cryptanalyze than Enigma's regular turnover pattern.
          </p>
          <p>
            The KL-7 was compromised by the <span className="text-blue-400">Walker spy ring</span> — one of the most
            damaging espionage cases of the Cold War. It was retired in 1983 when electronic cipher systems became practical.
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;
