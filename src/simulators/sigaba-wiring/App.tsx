import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RotateCcw, ChevronUp, ChevronDown, Info } from 'lucide-react';
import { DualColumnWiring, DualColumnTrace } from '../shared/DualColumnWiring';
import ConfigSlots from '../shared/ConfigSlots';
import TapeActions from '../shared/TapeActions';

// ── Constants ─────────────────────────────────────────────────────
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const KEYBOARD_LAYOUT = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

// Rotor wirings from the SIGABA simulator
const ROTOR_WIRINGS = [
  'EKMFLGDQVZNTOWYHXUSPAIBRCJ', // I
  'AJDKSIRUXBLHWTMCQGZNPYFVOE', // II
  'BDFHJLCPRTXVZNYEIWGAKMUSQO', // III
  'ESOVPZJAYQUIRHXLNFTGKDCMWB', // IV
  'VZBRGITYUPSDNHLXAWMJQOFECK', // V
  'JPGVOUMFYQBENHZRDKASXLICTW', // VI
  'NZJHGRCXMYSWBOUFAIVLPEKQDT', // VII
  'FKQHTLXOCBJSPDZRAMEWNIUYGV', // VIII
  'LEYJVCNIXWPBQMDRTAKZGFUHOS', // IX
  'FSOKANUERHMBTIYCWLQPZXVGJD', // X
];

const ROTOR_NAMES = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

const mod = (n: number) => ((n % 26) + 26) % 26;
const toChar = (i: number) => String.fromCharCode(mod(i) + 65);

// ── Rotor math ────────────────────────────────────────────────────
function computeWiring(wiringStr: string, position: number): number[] {
  return Array.from({ length: 26 }, (_, i) => {
    const pin = mod(i + position);
    const contact = wiringStr.charCodeAt(pin) - 65;
    return mod(contact - position);
  });
}

function computeInverseWiring(wiringStr: string, position: number): number[] {
  return Array.from({ length: 26 }, (_, i) => {
    const entry = mod(i + position);
    const ch = ALPHABET[entry];
    const idx = wiringStr.indexOf(ch);
    return mod(idx - position);
  });
}

// Map a single signal through a rotor (forward)
function mapForward(charIdx: number, wiringStr: string, pos: number): number {
  const entry = mod(charIdx + pos);
  const out = wiringStr.charCodeAt(entry) - 65;
  return mod(out - pos);
}

// Map a single signal through a rotor (backward / inverse)
function mapBackward(charIdx: number, wiringStr: string, pos: number): number {
  const entry = mod(charIdx + pos);
  const ch = ALPHABET[entry];
  const idx = wiringStr.indexOf(ch);
  return mod(idx - pos);
}

// ── Stepping logic (from sigabaLogic.ts) ──────────────────────────
interface SteppingResult {
  controlInputs: number[];          // F,G,H,I = [5,6,7,8]
  controlOutputs: number[];         // after control bank
  indexOutputs: number[];           // after index bank
  cipherStepMask: boolean[];        // which cipher rotors step
  newControlPositions: number[];    // updated control positions
}

function computeStepping(
  controlWirings: number[],   // rotor indices
  controlPositions: number[],
  indexWirings: number[],     // rotor indices
  indexPositions: number[],
): SteppingResult {
  // Step control rotors (odometer on middle 3: indices 1,2,3)
  const newControlPos = [...controlPositions];
  newControlPos[2] = mod(newControlPos[2] + 1);
  if (newControlPos[2] === 0) {
    newControlPos[3] = mod(newControlPos[3] + 1);
    if (newControlPos[3] === 0) {
      newControlPos[1] = mod(newControlPos[1] + 1);
    }
  }

  // Pass F,G,H,I through control bank
  const inputs = [5, 6, 7, 8];
  const controlOutputs: number[] = [];
  inputs.forEach(inp => {
    let signal = inp;
    for (let i = 0; i < 5; i++) {
      signal = mapForward(signal, ROTOR_WIRINGS[controlWirings[i]], newControlPos[i]);
    }
    controlOutputs.push(signal);
  });

  // Pass through index bank
  const indexOutputs: number[] = [];
  const cipherStepMask = [false, false, false, false, false];
  controlOutputs.forEach(signal => {
    let s = signal;
    for (let i = 0; i < 5; i++) {
      s = mapForward(s, ROTOR_WIRINGS[indexWirings[i]], indexPositions[i]);
    }
    indexOutputs.push(s);
    const target = Math.floor(s / 5);
    if (target >= 0 && target < 5) {
      cipherStepMask[target] = true;
    }
  });

  return {
    controlInputs: inputs,
    controlOutputs,
    indexOutputs,
    cipherStepMask,
    newControlPositions: newControlPos,
  };
}

// ── Trace through cipher bank ─────────────────────────────────────
function traceCipherBank(
  inputChar: string,
  cipherWirings: number[],
  cipherPositions: number[],
  mode: 'ENCIPHER' | 'DECIPHER',
): DualColumnTrace {
  const inIdx = inputChar.charCodeAt(0) - 65;
  const forward: number[] = [inIdx];

  if (mode === 'ENCIPHER') {
    let signal = inIdx;
    for (let i = 0; i < 5; i++) {
      signal = mapForward(signal, ROTOR_WIRINGS[cipherWirings[i]], cipherPositions[i]);
      forward.push(signal);
    }
  } else {
    let signal = inIdx;
    for (let i = 4; i >= 0; i--) {
      signal = mapBackward(signal, ROTOR_WIRINGS[cipherWirings[i]], cipherPositions[i]);
      forward.push(signal);
    }
  }

  const outIdx = forward[forward.length - 1];
  return {
    forward,
    inputChar,
    outputChar: ALPHABET[outIdx],
  };
}

// ════════════════════════════════════════════════════════════════════
const App: React.FC = () => {
  // Cipher bank state
  const [cipherRotors, setCipherRotors] = useState([0, 1, 2, 3, 4]);
  const [cipherPositions, setCipherPositions] = useState([0, 0, 0, 0, 0]);

  // Control bank state
  const [controlRotors, setControlRotors] = useState([5, 6, 7, 8, 9]);
  const [controlPositions, setControlPositions] = useState([0, 0, 0, 0, 0]);

  // Index bank state
  const [indexRotors, setIndexRotors] = useState([9, 8, 7, 6, 5]);
  const [indexPositions, setIndexPositions] = useState([0, 0, 0, 0, 0]);

  const [mode, setMode] = useState<'ENCIPHER' | 'DECIPHER'>('ENCIPHER');
  const [trace, setTrace] = useState<DualColumnTrace | null>(null);
  const [steppingInfo, setSteppingInfo] = useState<SteppingResult | null>(null);
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const [tape, setTape] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  const [history, setHistory] = useState<{
    cipherPositions: number[];
    controlPositions: number[];
  }[]>([]);

  // Compute effective wirings (inverted to rightVis→leftVis for dual-column)
  const dualWirings = useMemo(() => {
    const fwWirings = mode === 'ENCIPHER'
      ? cipherRotors.map((r, i) => computeWiring(ROTOR_WIRINGS[r], cipherPositions[i]))
      : [...cipherRotors].reverse().map((r, i) => {
          const origIdx = 4 - i;
          return computeInverseWiring(ROTOR_WIRINGS[r], cipherPositions[origIdx]);
        });
    return fwWirings.map(w => {
      const inv = new Array(26);
      for (let i = 0; i < 26; i++) inv[w[i]] = i;
      return inv;
    });
  }, [cipherRotors, cipherPositions, mode]);

  const cipherRotorPairs = useMemo(() => {
    if (mode === 'ENCIPHER') {
      return cipherRotors.map((r, i) => ({
        label: `CIPHER ${i + 1}`,
        sublabel: ROTOR_NAMES[r],
        offset: cipherPositions[i],
      }));
    } else {
      return [...cipherRotors].reverse().map((r, i) => ({
        label: `CIPHER ${5 - i}`,
        sublabel: `${ROTOR_NAMES[r]} inv`,
        offset: cipherPositions[4 - i],
      }));
    }
  }, [cipherRotors, cipherPositions, mode]);

  const diagramTrace: DualColumnTrace | null = useMemo(() => {
    if (!trace) return null;
    return trace;
  }, [trace]);

  // ── Key handling ────────────────────────────────────────────────
  const handleKeyDown = useCallback((char: string) => {
    if (pressedKey) return;

    // Save state for undo
    setHistory(prev => [...prev, {
      cipherPositions: [...cipherPositions],
      controlPositions: [...controlPositions],
    }]);

    // 1. Compute stepping
    const stepping = computeStepping(
      controlRotors, controlPositions,
      indexRotors, indexPositions,
    );
    setSteppingInfo(stepping);

    // 2. Apply stepping to cipher and control positions
    const newCipherPos = cipherPositions.map((p, i) =>
      stepping.cipherStepMask[i] ? mod(p + 1) : p
    );
    const newControlPos = stepping.newControlPositions;

    setCipherPositions(newCipherPos);
    setControlPositions(newControlPos);

    // 3. Trace signal through cipher bank
    let sig: DualColumnTrace;
    if (mode === 'ENCIPHER') {
      sig = traceCipherBank(char, cipherRotors, newCipherPos, mode);
    } else {
      // Decipher: trace goes backward through rotors 4..0
      // We build the forward array for the reversed rotor order
      const inIdx = char.charCodeAt(0) - 65;
      const fwd: number[] = [inIdx];
      let signal = inIdx;
      for (let i = 4; i >= 0; i--) {
        signal = mapBackward(signal, ROTOR_WIRINGS[cipherRotors[i]], newCipherPos[i]);
        fwd.push(signal);
      }
      sig = {
        forward: fwd,
        inputChar: char,
        outputChar: ALPHABET[fwd[fwd.length - 1]],
      };
    }

    setTrace(sig);
    setPressedKey(char);
    setTape(prev => prev + sig.outputChar);
  }, [cipherPositions, controlPositions, cipherRotors, controlRotors, indexRotors, indexPositions, pressedKey, mode]);

  const handlePasteInput = useCallback((chars: string[]) => {
    let curCipherPos = [...cipherPositions];
    let curControlPos = [...controlPositions];
    const results: string[] = [];
    const historyBatch: { cipherPositions: number[]; controlPositions: number[] }[] = [];

    for (const char of chars) {
      historyBatch.push({
        cipherPositions: [...curCipherPos],
        controlPositions: [...curControlPos],
      });

      // 1. Compute stepping
      const stepping = computeStepping(controlRotors, curControlPos, indexRotors, indexPositions);

      // 2. Apply stepping
      const newCipherPos = curCipherPos.map((p, i) =>
        stepping.cipherStepMask[i] ? mod(p + 1) : p
      );
      const newControlPos = stepping.newControlPositions;

      // 3. Trace signal
      let sig: DualColumnTrace;
      if (mode === 'ENCIPHER') {
        sig = traceCipherBank(char, cipherRotors, newCipherPos, mode);
      } else {
        const inIdx = char.charCodeAt(0) - 65;
        const fwd: number[] = [inIdx];
        let signal = inIdx;
        for (let i = 4; i >= 0; i--) {
          signal = mapBackward(signal, ROTOR_WIRINGS[cipherRotors[i]], newCipherPos[i]);
          fwd.push(signal);
        }
        sig = { forward: fwd, inputChar: char, outputChar: ALPHABET[fwd[fwd.length - 1]] };
      }

      results.push(sig.outputChar);
      curCipherPos = newCipherPos;
      curControlPos = newControlPos;
    }

    setHistory(prev => [...prev, ...historyBatch]);
    setCipherPositions(curCipherPos);
    setControlPositions(curControlPos);
    setTape(prev => prev + results.join(''));
    setTrace(null);
    setSteppingInfo(null);
    setPressedKey(null);
  }, [cipherPositions, controlPositions, cipherRotors, controlRotors, indexRotors, indexPositions, mode]);

  const handleLoadConfig = useCallback((loadedState: any) => {
    setCipherRotors(loadedState.cipherRotors);
    setCipherPositions(loadedState.cipherPositions);
    setControlRotors(loadedState.controlRotors);
    setControlPositions(loadedState.controlPositions);
    setIndexRotors(loadedState.indexRotors);
    setIndexPositions(loadedState.indexPositions);
    if (loadedState.mode) setMode(loadedState.mode);
    setHistory([]);
    setTape('');
    setTrace(null);
    setSteppingInfo(null);
    setPressedKey(null);
  }, []);

  const handleKeyUp = useCallback(() => {
    setPressedKey(null);
  }, []);

  const handleBackspace = useCallback(() => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setCipherPositions(prev.cipherPositions);
    setControlPositions(prev.controlPositions);
    setHistory(h => h.slice(0, -1));
    setTape(t => t.slice(0, -1));
    setTrace(null);
    setSteppingInfo(null);
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
      if (e.key === 'Backspace') { e.preventDefault(); handleBackspace(); }
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
    setCipherPositions([0, 0, 0, 0, 0]);
    setControlPositions([0, 0, 0, 0, 0]);
    setTrace(null);
    setSteppingInfo(null);
    setPressedKey(null);
    setTape('');
    setHistory([]);
  };

  // Position change helpers
  const setCipherPos = (idx: number, delta: number) => {
    setCipherPositions(prev => prev.map((p, i) => i === idx ? mod(p + delta) : p));
    setTrace(null);
  };
  const setControlPos = (idx: number, delta: number) => {
    setControlPositions(prev => prev.map((p, i) => i === idx ? mod(p + delta) : p));
    setTrace(null);
  };
  const setIndexPos = (idx: number, delta: number) => {
    setIndexPositions(prev => prev.map((p, i) => i === idx ? mod(p + delta) : p));
    setTrace(null);
  };

  // ── Stepping visualization ──────────────────────────────────────
  const SteppingPanel: React.FC = () => {
    return (
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-3">
          Stepping Mechanism — Control + Index Banks Determine Cipher Rotor Motion
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Control Bank */}
          <div className="bg-slate-900/60 border border-blue-900/40 rounded-lg p-3">
            <div className="text-[9px] text-blue-400 font-bold uppercase tracking-wider mb-2 text-center">
              Control Bank (5 Rotors)
            </div>
            <div className="flex justify-center gap-1">
              {controlRotors.map((r, i) => (
                <div key={i} className="flex flex-col items-center">
                  <button onClick={() => setControlPos(i, 1)} className="text-slate-600 hover:text-blue-400 transition-colors"><ChevronUp size={10} /></button>
                  <div className={`w-7 h-8 rounded flex items-center justify-center font-mono text-xs font-bold border ${
                    steppingInfo && (i === 1 || i === 2 || i === 3) && controlPositions[i] !== (history.length > 0 ? history[history.length - 1].controlPositions[i] : controlPositions[i])
                      ? 'bg-blue-900/50 border-blue-600 text-blue-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}>
                    {toChar(controlPositions[i])}
                  </div>
                  <button onClick={() => setControlPos(i, -1)} className="text-slate-600 hover:text-blue-400 transition-colors"><ChevronDown size={10} /></button>
                  <div className="text-[7px] text-slate-600 mt-0.5">{ROTOR_NAMES[r]}</div>
                </div>
              ))}
            </div>
            {steppingInfo && (
              <div className="mt-2 text-center">
                <div className="text-[8px] text-slate-600">Inputs: F,G,H,I</div>
                <div className="text-[8px] text-blue-400 font-mono">
                  Out: {steppingInfo.controlOutputs.map(o => ALPHABET[o]).join(',')}
                </div>
              </div>
            )}
          </div>

          {/* Index Bank */}
          <div className="bg-slate-900/60 border border-emerald-900/40 rounded-lg p-3">
            <div className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider mb-2 text-center">
              Index Bank (5 Rotors)
            </div>
            <div className="flex justify-center gap-1">
              {indexRotors.map((r, i) => (
                <div key={i} className="flex flex-col items-center">
                  <button onClick={() => setIndexPos(i, 1)} className="text-slate-600 hover:text-emerald-400 transition-colors"><ChevronUp size={10} /></button>
                  <div className="w-7 h-8 bg-slate-800 border border-slate-700 rounded flex items-center justify-center font-mono text-xs font-bold text-slate-400">
                    {toChar(indexPositions[i])}
                  </div>
                  <button onClick={() => setIndexPos(i, -1)} className="text-slate-600 hover:text-emerald-400 transition-colors"><ChevronDown size={10} /></button>
                  <div className="text-[7px] text-slate-600 mt-0.5">{ROTOR_NAMES[r]}</div>
                </div>
              ))}
            </div>
            {steppingInfo && (
              <div className="mt-2 text-center">
                <div className="text-[8px] text-emerald-400 font-mono">
                  Out: {steppingInfo.indexOutputs.map(o => ALPHABET[o]).join(',')}
                </div>
              </div>
            )}
          </div>

          {/* Stepping Result */}
          <div className="bg-slate-900/60 border border-red-900/40 rounded-lg p-3">
            <div className="text-[9px] text-red-400 font-bold uppercase tracking-wider mb-2 text-center">
              Cipher Stepping Result
            </div>
            <div className="flex justify-center gap-2 mt-1">
              {cipherRotors.map((r, i) => {
                const steps = steppingInfo?.cipherStepMask[i] ?? false;
                return (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono text-xs font-bold border-2 transition-all ${
                      steps
                        ? 'bg-red-900/60 border-red-500 text-red-300 shadow-[0_0_8px_rgba(239,68,68,0.3)]'
                        : 'bg-slate-800/60 border-slate-700 text-slate-600'
                    }`}>
                      {steps ? '+1' : '--'}
                    </div>
                    <div className="text-[7px] text-slate-600">C{i + 1}</div>
                  </div>
                );
              })}
            </div>
            {steppingInfo && (
              <div className="mt-2 text-center text-[8px] text-slate-500">
                {steppingInfo.cipherStepMask.filter(Boolean).length} of 5 rotors stepped
              </div>
            )}
          </div>
        </div>

        {/* Flow Arrow */}
        {steppingInfo && (
          <div className="flex items-center justify-center gap-2 mt-3 text-[9px] font-mono text-slate-500">
            <span className="text-blue-400">F,G,H,I</span>
            <span>-&gt;</span>
            <span className="text-blue-400">[Control]</span>
            <span>-&gt;</span>
            <span className="text-emerald-400">[Index]</span>
            <span>-&gt;</span>
            <span className="text-red-400">Step Mask</span>
            <span>-&gt;</span>
            <span className="text-red-300 font-bold">
              C{steppingInfo.cipherStepMask.map((s, i) => s ? (i + 1) : '').filter(Boolean).join(',C')} step
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 bg-slate-950 flex flex-col items-center px-4 py-8 text-slate-200">
      <div className="w-full max-w-5xl">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              SIGABA <span className="text-red-400">WIRING EXPLORER</span>
            </h1>
            <p className="text-xs text-slate-500 font-mono tracking-widest">ECM MARK II — MECHANICALLY ACCURATE SIGNAL TRACER</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowInfo(!showInfo)}
              className={`p-2 rounded-lg border transition-colors ${
                showInfo
                  ? 'bg-red-900/30 border-red-800 text-red-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
              title="About SIGABA">
              <Info size={18} />
            </button>
            <button onClick={handleReset}
              className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Reset">
              <RotateCcw size={18} />
            </button>
          </div>
        </div>

        {/* Config Slots */}
        <div className="mb-4">
          <ConfigSlots
            machineId="sigaba-wiring"
            currentState={{ cipherRotors, cipherPositions, controlRotors, controlPositions, indexRotors, indexPositions, mode }}
            onLoadState={handleLoadConfig}
            accentColor="amber"
          />
        </div>

        {/* Info Panel */}
        {showInfo && (
          <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-5 text-xs text-slate-500 space-y-2 mb-6">
            <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-2">About SIGABA (ECM Mark II)</div>
            <p>
              SIGABA was the <span className="text-white">most secure cipher machine of WWII</span> and was
              never broken by any adversary. It used a revolutionary design with <span className="text-red-300">three banks of rotors</span> totaling
              15 rotors.
            </p>
            <p>
              The <span className="text-red-300">cipher bank</span> (5 rotors) performs the actual encryption.
              Unlike Enigma, SIGABA has <span className="text-white">no reflector</span> -- the signal passes
              forward only, making it non-reciprocal (separate encipher/decipher modes).
            </p>
            <p>
              The <span className="text-blue-400">control bank</span> (5 rotors) and <span className="text-emerald-400">index bank</span> (5 rotors)
              work together to determine <span className="text-white">which cipher rotors step</span> after each keypress.
              Signals F, G, H, I enter the control bank, pass through the index bank, and the outputs
              activate stepping magnets on 1-4 cipher rotors at a time. This made the rotor motion
              completely unpredictable.
            </p>
            <p>
              The control bank's middle 3 rotors step in an odometer pattern. The index rotors
              remain stationary during operation, set once as part of the daily key.
            </p>
          </div>
        )}

        {/* Mode + Cipher Rotor Selection */}
        <div className="flex flex-wrap items-start justify-center gap-6 mb-6">
          {/* Mode Toggle */}
          <div className="flex flex-col items-center">
            <div className="text-[9px] text-slate-600 font-bold uppercase mb-1">Mode</div>
            <button
              onClick={() => { setMode(m => m === 'ENCIPHER' ? 'DECIPHER' : 'ENCIPHER'); setTrace(null); }}
              className={`text-xs font-bold px-3 py-2 rounded-lg transition-colors border ${
                mode === 'ENCIPHER'
                  ? 'bg-red-900/40 border-red-800 text-red-300'
                  : 'bg-sky-900/40 border-sky-800 text-sky-300'
              }`}
            >
              {mode}
            </button>
          </div>

          {/* Cipher Rotor Selectors + Positions */}
          {cipherRotors.map((r, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="text-[9px] text-red-400/60 font-bold uppercase mb-1">Cipher {i + 1}</div>
              <select
                value={r}
                onChange={e => {
                  const newRotors = [...cipherRotors];
                  newRotors[i] = parseInt(e.target.value);
                  setCipherRotors(newRotors);
                  setTrace(null);
                }}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono mb-1"
              >
                {ROTOR_WIRINGS.map((_, ri) => (
                  <option key={ri} value={ri}>{ROTOR_NAMES[ri]}</option>
                ))}
              </select>
              <div className="flex items-center gap-0.5">
                <button onClick={() => setCipherPos(i, 1)} className="p-0.5 text-slate-600 hover:text-red-400 transition-colors"><ChevronUp size={12} /></button>
                <div className="w-7 h-8 bg-slate-800 border border-red-900/50 rounded-lg flex items-center justify-center font-mono font-bold text-red-400 text-sm">
                  {toChar(cipherPositions[i])}
                </div>
                <button onClick={() => setCipherPos(i, -1)} className="p-0.5 text-slate-600 hover:text-red-400 transition-colors"><ChevronDown size={12} /></button>
              </div>
            </div>
          ))}
        </div>

        {/* Control + Index Bank Rotor Selection */}
        <div className="flex flex-wrap justify-center gap-6 mb-6">
          {/* Control Rotors */}
          <div className="flex flex-col items-center">
            <div className="text-[9px] text-blue-400/60 font-bold uppercase mb-1">Control Rotors</div>
            <div className="flex gap-1">
              {controlRotors.map((r, i) => (
                <select key={i}
                  value={r}
                  onChange={e => {
                    const newRotors = [...controlRotors];
                    newRotors[i] = parseInt(e.target.value);
                    setControlRotors(newRotors);
                    setTrace(null);
                  }}
                  className="bg-slate-800 border border-slate-700 rounded px-1 py-0.5 text-[10px] text-blue-300 font-mono"
                >
                  {ROTOR_WIRINGS.map((_, ri) => (
                    <option key={ri} value={ri}>{ROTOR_NAMES[ri]}</option>
                  ))}
                </select>
              ))}
            </div>
          </div>

          {/* Index Rotors */}
          <div className="flex flex-col items-center">
            <div className="text-[9px] text-emerald-400/60 font-bold uppercase mb-1">Index Rotors</div>
            <div className="flex gap-1">
              {indexRotors.map((r, i) => (
                <select key={i}
                  value={r}
                  onChange={e => {
                    const newRotors = [...indexRotors];
                    newRotors[i] = parseInt(e.target.value);
                    setIndexRotors(newRotors);
                    setTrace(null);
                  }}
                  className="bg-slate-800 border border-slate-700 rounded px-1 py-0.5 text-[10px] text-emerald-300 font-mono"
                >
                  {ROTOR_WIRINGS.map((_, ri) => (
                    <option key={ri} value={ri}>{ROTOR_NAMES[ri]}</option>
                  ))}
                </select>
              ))}
            </div>
          </div>
        </div>

        {/* Cipher Bank Wiring Diagram */}
        <div className="bg-slate-900/40 border border-red-900/30 rounded-2xl p-2 sm:p-3 mb-4 overflow-x-auto">
          <div className="text-[9px] text-red-400/60 font-bold uppercase tracking-wider mb-1 ml-2">
            Cipher Bank — {mode === 'ENCIPHER' ? 'Forward' : 'Inverse (Backward)'} Signal Path
          </div>
          <DualColumnWiring
            rotorPairs={cipherRotorPairs}
            wirings={dualWirings}
            trace={diagramTrace}
            accentColor="#dc2626"
          />
        </div>

        {/* Stepping Mechanism Panel */}
        <div className="mb-6">
          <SteppingPanel />
        </div>

        {/* Signal Path Text */}
        {trace && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 font-mono text-sm flex-wrap">
              <span className="text-amber-400 font-bold">{trace.inputChar}</span>
              {mode === 'ENCIPHER' ? (
                cipherRotors.map((r, i) => (
                  <React.Fragment key={i}>
                    <span className="text-slate-600">-&gt;</span>
                    <span className="text-red-400/70 text-[10px]">[C{i + 1}:{ROTOR_NAMES[r]}]</span>
                  </React.Fragment>
                ))
              ) : (
                [...cipherRotors].reverse().map((r, i) => (
                  <React.Fragment key={i}>
                    <span className="text-slate-600">-&gt;</span>
                    <span className="text-sky-400/70 text-[10px]">[C{5 - i}:{ROTOR_NAMES[r]} inv]</span>
                  </React.Fragment>
                ))
              )}
              <span className="text-slate-600">-&gt;</span>
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
                      isActive ? 'bg-red-600 border-red-500 text-white scale-95' :
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
                <TapeActions outputText={tape} onProcessInput={handlePasteInput} accentColor="amber" />
                <button onClick={() => { setTape(''); setHistory([]); }}
                  className="text-xs text-slate-500 hover:text-red-400 transition-colors">Clear</button>
              </div>
            </div>
            <div className="font-mono text-lg tracking-widest text-red-400 break-all">
              {tape ? tape.match(/.{1,5}/g)?.join(' ') : <span className="text-slate-700 text-sm tracking-normal">Type or paste to begin...</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
