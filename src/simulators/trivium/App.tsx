import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Info, X, Play, Pause, SkipForward, RotateCcw, Lock, Unlock } from 'lucide-react';

// ── Trivium state: 3 shift registers totaling 288 bits ──────────────
// Register A: bits 0..92   (93 bits)
// Register B: bits 93..176 (84 bits)
// Register C: bits 177..287 (111 bits)

type TriviumState = {
  bits: Uint8Array; // 288 bits
};

function createTriviumState(key: Uint8Array, iv: Uint8Array): TriviumState {
  const bits = new Uint8Array(288);
  // Load 80-bit key into bits 0..79
  for (let i = 0; i < 80; i++) {
    bits[i] = (key[Math.floor(i / 8)] >> (i % 8)) & 1;
  }
  // Load 80-bit IV into bits 93..172
  for (let i = 0; i < 80; i++) {
    bits[93 + i] = (iv[Math.floor(i / 8)] >> (i % 8)) & 1;
  }
  // Set bits 285, 286, 287 to 1
  bits[285] = 1;
  bits[286] = 1;
  bits[287] = 1;
  return { bits };
}

interface ClockResult {
  output: number;
  // Feedback values for visualization
  t1: number; t2: number; t3: number;
  and1: number; and2: number; and3: number;
  fb1: number; fb2: number; fb3: number;
}

function clockTrivium(state: TriviumState): ClockResult {
  const s = state.bits;
  // Register A taps
  const t1 = s[65] ^ s[92];
  const and1 = s[90] & s[91];
  // Register B taps
  const t2 = s[161] ^ s[176];
  const and2 = s[174] & s[175];
  // Register C taps
  const t3 = s[242] ^ s[287];
  const and3 = s[285] & s[286];

  const output = t1 ^ t2 ^ t3;

  // Feedback
  const fb1 = t3 ^ and1 ^ s[68];  // feeds into A[0], uses C output + A AND + A[68]
  const fb2 = t1 ^ and2 ^ s[77 + 93]; // feeds into B[0], uses A output + B AND + B[77] = s[170]
  const fb3 = t2 ^ and3 ^ s[86 + 177]; // feeds into C[0], uses B output + C AND + C[86] = s[263]

  // Shift all registers right (MSB direction)
  // Register C: bits 177..287, shift right, new bit at 177
  for (let i = 287; i > 177; i--) s[i] = s[i - 1];
  s[177] = fb3;
  // Register B: bits 93..176, shift right, new bit at 93
  for (let i = 176; i > 93; i--) s[i] = s[i - 1];
  s[93] = fb2;
  // Register A: bits 0..92, shift right, new bit at 0
  for (let i = 92; i > 0; i--) s[i] = s[i - 1];
  s[0] = fb1;

  return { output, t1, t2, t3, and1, and2, and3, fb1, fb2, fb3 };
}

function cloneTriviumState(s: TriviumState): TriviumState {
  return { bits: new Uint8Array(s.bits) };
}

// ── Hex helpers ──────────────────────────────────────────────────────
function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/\s/g, '').padEnd(20, '0').slice(0, 20);
  const bytes = new Uint8Array(10);
  for (let i = 0; i < 10; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16) || 0;
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function textToBits(text: string): number[] {
  const bits: number[] = [];
  const bytes = new TextEncoder().encode(text);
  for (const byte of bytes) {
    for (let b = 7; b >= 0; b--) bits.push((byte >> b) & 1);
  }
  return bits;
}

function bitsToText(bits: number[]): string {
  let s = '';
  for (let i = 0; i + 7 < bits.length; i += 8) {
    let byte = 0;
    for (let b = 0; b < 8; b++) byte = (byte << 1) | bits[i + b];
    s += byte >= 32 && byte < 127 ? String.fromCharCode(byte) : '\u00b7';
  }
  return s;
}

function bitsToHex(bits: number[]): string {
  let hex = '';
  for (let i = 0; i + 3 < bits.length; i += 4) {
    const nib = (bits[i] << 3) | (bits[i + 1] << 2) | (bits[i + 2] << 1) | bits[i + 3];
    hex += nib.toString(16);
  }
  return hex;
}

// ── SVG Constants ────────────────────────────────────────────────────
const REG_COLORS = ['#f59e0b', '#3b82f6', '#10b981']; // amber, blue, emerald
const REG_NAMES = ['Register A (93 bits)', 'Register B (84 bits)', 'Register C (111 bits)'];
const REG_RANGES: [number, number][] = [[0, 92], [93, 176], [177, 287]];

// ── Component ────────────────────────────────────────────────────────
const App: React.FC = () => {
  const [showInfo, setShowInfo] = useState(false);
  const [keyHex, setKeyHex] = useState('0123456789abcdef0123');
  const [ivHex, setIvHex] = useState('00000000000000000000');
  const [state, setState] = useState<TriviumState>(() => createTriviumState(hexToBytes('0123456789abcdef0123'), hexToBytes('00000000000000000000')));
  const [warmupDone, setWarmupDone] = useState(false);
  const [cycle, setCycle] = useState(0);
  const [history, setHistory] = useState<ClockResult[]>([]);
  const [keystream, setKeystream] = useState<number[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(100); // ms per step
  const timerRef = useRef<number | null>(null);

  // Encrypt/decrypt state
  const [plaintext, setPlaintext] = useState('Hello, Trivium!');
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');

  const initState = useCallback(() => {
    const key = hexToBytes(keyHex);
    const iv = hexToBytes(ivHex);
    const s = createTriviumState(key, iv);
    setState(s);
    setWarmupDone(false);
    setCycle(0);
    setHistory([]);
    setKeystream([]);
    setIsRunning(false);
    if (timerRef.current) cancelAnimationFrame(timerRef.current);
  }, [keyHex, ivHex]);

  const doWarmup = useCallback(() => {
    const s = createTriviumState(hexToBytes(keyHex), hexToBytes(ivHex));
    // 4 full initialization rounds (4 × 288 = 1152 clocks)
    for (let i = 0; i < 4 * 288; i++) {
      clockTrivium(s);
    }
    setState(s);
    setWarmupDone(true);
    setCycle(0);
    setHistory([]);
    setKeystream([]);
  }, [keyHex, ivHex]);

  const stepOnce = useCallback(() => {
    setState(prev => {
      const s = cloneTriviumState(prev);
      const result = clockTrivium(s);
      setHistory(h => [...h.slice(-63), result]);
      setKeystream(k => [...k, result.output]);
      setCycle(c => c + 1);
      return s;
    });
  }, []);

  const stepN = useCallback((n: number) => {
    setState(prev => {
      const s = cloneTriviumState(prev);
      const newHistory: ClockResult[] = [];
      const newKeystream: number[] = [];
      for (let i = 0; i < n; i++) {
        const result = clockTrivium(s);
        newHistory.push(result);
        newKeystream.push(result.output);
      }
      setHistory(h => [...h, ...newHistory].slice(-64));
      setKeystream(k => [...k, ...newKeystream]);
      setCycle(c => c + n);
      return s;
    });
  }, []);

  useEffect(() => {
    if (!isRunning) return;
    let last = 0;
    const tick = (time: number) => {
      if (time - last >= speed) {
        stepOnce();
        last = time;
      }
      timerRef.current = requestAnimationFrame(tick);
    };
    timerRef.current = requestAnimationFrame(tick);
    return () => { if (timerRef.current) cancelAnimationFrame(timerRef.current); };
  }, [isRunning, speed, stepOnce]);

  // Encrypt/decrypt computed
  const cryptResult = useMemo(() => {
    if (!plaintext) return null;
    const key = hexToBytes(keyHex);
    const iv = hexToBytes(ivHex);
    const s = createTriviumState(key, iv);
    // Warmup
    for (let i = 0; i < 4 * 288; i++) clockTrivium(s);
    // Generate keystream
    const inputBits = textToBits(plaintext);
    const ks: number[] = [];
    const outputBits: number[] = [];
    for (let i = 0; i < inputBits.length; i++) {
      const r = clockTrivium(s);
      ks.push(r.output);
      outputBits.push(inputBits[i] ^ r.output);
    }
    return {
      inputBits,
      keystreamBits: ks,
      outputBits,
      outputText: bitsToText(outputBits),
      outputHex: bitsToHex(outputBits),
      keystreamHex: bitsToHex(ks),
    };
  }, [plaintext, keyHex, ivHex]);

  const inputClass = 'bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-cyan-700/50 w-full';
  const panelClass = 'bg-slate-900/60 border border-slate-800 rounded-xl p-5';
  const labelClass = 'text-xs font-bold text-slate-400 uppercase tracking-wider';

  // Register visualization data
  const regBitCounts = [93, 84, 111];
  const svgW = 900;
  const regH = 28;
  const regGap = 50;
  const svgH = 3 * regH + 2 * regGap + 100;

  return (
    <div className="flex-1 bg-slate-950 text-white flex flex-col items-center px-6 py-4 sm:px-10 md:px-16 md:py-8">
      <div className="w-full max-w-6xl space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-cyan-400">Trivium</h1>
            <p className="text-sm text-slate-400 mt-1">Lightweight stream cipher — three coupled shift registers</p>
          </div>
          <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-cyan-700/50 transition-colors">
            {showInfo ? <X size={20} className="text-cyan-400" /> : <Info size={20} className="text-cyan-400" />}
          </button>
        </div>

        {showInfo && (
          <div className="bg-cyan-950/20 border border-cyan-900/40 rounded-xl p-6 space-y-3 text-sm text-slate-300 leading-relaxed">
            <h2 className="text-base font-bold text-cyan-400">About Trivium</h2>
            <p>
              Designed by <strong className="text-white">Christophe De Canni&egrave;re</strong> and <strong className="text-white">Bart Preneel</strong> in 2005,
              Trivium was selected for the <strong className="text-white">eSTREAM portfolio</strong> (Profile 2: hardware) in 2008.
              It's designed for extreme simplicity and efficiency in hardware — the entire cipher uses only 288 flip-flops and 11 XOR/AND gates.
            </p>
            <p>
              <strong className="text-white">Architecture:</strong> Three interconnected nonlinear feedback shift registers (NFSRs)
              of lengths 93, 84, and 111 bits (totaling 288 bits). Each register feeds into the next in a circular chain.
              The nonlinear coupling (AND gates) prevents the linear attacks that break plain LFSRs.
            </p>
            <p>
              <strong className="text-white">Key &amp; IV:</strong> 80-bit key, 80-bit IV. After loading, the cipher runs 1,152 warm-up clocks
              (4 &times; 288) before generating keystream. The same key with different IVs produces completely different keystreams.
            </p>
            <p>
              <strong className="text-white">Security:</strong> Despite its simplicity, no practical attack on full Trivium has been found.
              The best published attacks reach only reduced-round variants. The design principle is that three interleaved registers
              with AND-gate feedback create enough nonlinearity to resist all known cryptanalytic techniques.
            </p>
          </div>
        )}

        {/* Key / IV Setup */}
        <div className={panelClass}>
          <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-4">Key &amp; IV Setup</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div>
              <label className={`${labelClass} block mb-1`}>80-bit Key (hex)</label>
              <input value={keyHex} onChange={e => setKeyHex(e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 20))} className={inputClass} placeholder="0123456789abcdef0123" />
            </div>
            <div>
              <label className={`${labelClass} block mb-1`}>80-bit IV (hex)</label>
              <input value={ivHex} onChange={e => setIvHex(e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 20))} className={inputClass} placeholder="00000000000000000000" />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={initState}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-slate-800 border border-slate-700 text-slate-400 hover:text-cyan-400 transition-colors">
              <RotateCcw size={14} /> Reset
            </button>
            <button onClick={doWarmup}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-cyan-950/40 border border-cyan-700/50 text-cyan-400 hover:bg-cyan-950/60 transition-colors">
              Run 1152 Warmup Clocks
            </button>
            {warmupDone && (
              <span className="flex items-center text-xs text-emerald-400 font-mono">Warmup complete — generating keystream</span>
            )}
          </div>
        </div>

        {/* Register Visualization */}
        <div className={panelClass}>
          <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-2">Register State</h2>
          <p className="text-xs text-slate-500 mb-3">
            Cycle {cycle}{warmupDone ? ' (post-warmup)' : ' (pre-warmup)'}
            {history.length > 0 && ` — last output bit: ${history[history.length - 1].output}`}
          </p>

          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 overflow-x-auto">
            <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" style={{ minWidth: 700 }}>
              {/* Three registers */}
              {[0, 1, 2].map(r => {
                const [start, end] = REG_RANGES[r];
                const len = end - start + 1;
                const y = 30 + r * (regH + regGap);
                const cellW = Math.min(8, (svgW - 120) / len);
                const x0 = 60;
                return (
                  <g key={r}>
                    {/* Label */}
                    <text x={x0 - 5} y={y + regH / 2 + 1} textAnchor="end" fill={REG_COLORS[r]} fontSize={9} fontWeight="bold" fontFamily="monospace">
                      {String.fromCharCode(65 + r)}
                    </text>
                    {/* Cells */}
                    {Array.from({ length: len }, (_, i) => {
                      const bit = state.bits[start + i];
                      const cx = x0 + i * cellW;
                      return (
                        <rect key={i} x={cx} y={y} width={cellW - 0.5} height={regH}
                          fill={bit ? REG_COLORS[r] : '#0f172a'}
                          stroke={REG_COLORS[r]} strokeWidth={0.3} strokeOpacity={0.3}
                          opacity={bit ? 0.8 : 1}
                          rx={1} />
                      );
                    })}
                    {/* Tap markers */}
                    {r === 0 && [65, 68, 90, 91, 92].map(pos => (
                      <circle key={`ta${pos}`} cx={x0 + (pos) * cellW + cellW / 2} cy={y - 4} r={2}
                        fill={REG_COLORS[0]} opacity={0.7} />
                    ))}
                    {r === 1 && [161 - 93, 170 - 93, 174 - 93, 175 - 93, 176 - 93].map(pos => (
                      <circle key={`tb${pos}`} cx={x0 + pos * cellW + cellW / 2} cy={y - 4} r={2}
                        fill={REG_COLORS[1]} opacity={0.7} />
                    ))}
                    {r === 2 && [242 - 177, 263 - 177, 285 - 177, 286 - 177, 287 - 177].map(pos => (
                      <circle key={`tc${pos}`} cx={x0 + pos * cellW + cellW / 2} cy={y - 4} r={2}
                        fill={REG_COLORS[2]} opacity={0.7} />
                    ))}
                    {/* Bit count label */}
                    <text x={x0 + len * cellW + 8} y={y + regH / 2 + 1} fill="#64748b" fontSize={8} fontFamily="monospace" dominantBaseline="central">
                      {len}b
                    </text>
                  </g>
                );
              })}

              {/* Feedback arrows between registers */}
              {(() => {
                const y0 = 30, y1 = 30 + regH + regGap, y2 = 30 + 2 * (regH + regGap);
                const mx = svgW - 40;
                return (
                  <g>
                    {/* A → B */}
                    <path d={`M ${mx} ${y0 + regH} L ${mx} ${y1}`}
                      stroke={REG_COLORS[0]} strokeWidth={1.5} fill="none" markerEnd="url(#arrow)" opacity={0.5} />
                    <text x={mx + 8} y={(y0 + regH + y1) / 2} fill={REG_COLORS[0]} fontSize={8} fontFamily="monospace" dominantBaseline="central" opacity={0.6}>
                      A→B
                    </text>
                    {/* B → C */}
                    <path d={`M ${mx} ${y1 + regH} L ${mx} ${y2}`}
                      stroke={REG_COLORS[1]} strokeWidth={1.5} fill="none" markerEnd="url(#arrow)" opacity={0.5} />
                    <text x={mx + 8} y={(y1 + regH + y2) / 2} fill={REG_COLORS[1]} fontSize={8} fontFamily="monospace" dominantBaseline="central" opacity={0.6}>
                      B→C
                    </text>
                    {/* C → A (wrap around) */}
                    <path d={`M ${mx + 20} ${y2 + regH} L ${mx + 20} ${y2 + regH + 15} L 30 ${y2 + regH + 15} L 30 ${y0} L 55 ${y0 + regH / 2}`}
                      stroke={REG_COLORS[2]} strokeWidth={1.5} fill="none" markerEnd="url(#arrow)" opacity={0.5} />
                    <text x={35} y={y2 + regH + 25} fill={REG_COLORS[2]} fontSize={8} fontFamily="monospace" opacity={0.6}>
                      C→A
                    </text>
                  </g>
                );
              })()}

              {/* Output label */}
              <text x={svgW / 2} y={svgH - 10} textAnchor="middle" fill="#64748b" fontSize={10} fontFamily="monospace">
                output = t1 ⊕ t2 ⊕ t3 (XOR of three register outputs)
              </text>

              <defs>
                <marker id="arrow" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                  <path d="M0,0 L6,2 L0,4" fill="none" stroke="#64748b" strokeWidth={0.8} />
                </marker>
              </defs>
            </svg>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3 mt-4">
            <button onClick={() => setIsRunning(!isRunning)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${isRunning ? 'bg-red-950/40 border border-red-700/50 text-red-400' : 'bg-cyan-950/40 border border-cyan-700/50 text-cyan-400'}`}>
              {isRunning ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Run</>}
            </button>
            <button onClick={stepOnce} disabled={isRunning}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-slate-800 border border-slate-700 text-slate-400 hover:text-cyan-400 transition-colors disabled:opacity-40">
              <SkipForward size={14} /> Step
            </button>
            <button onClick={() => stepN(8)} disabled={isRunning}
              className="px-3 py-2 rounded-lg text-sm font-bold bg-slate-800 border border-slate-700 text-slate-400 hover:text-cyan-400 transition-colors disabled:opacity-40">
              +8 bits
            </button>
            <button onClick={() => stepN(64)} disabled={isRunning}
              className="px-3 py-2 rounded-lg text-sm font-bold bg-slate-800 border border-slate-700 text-slate-400 hover:text-cyan-400 transition-colors disabled:opacity-40">
              +64 bits
            </button>
            <div className="flex items-center gap-2 ml-4">
              <label className="text-xs text-slate-500">Speed</label>
              <input type="range" min={10} max={500} value={speed} onChange={e => setSpeed(Number(e.target.value))}
                className="w-24 accent-cyan-500" />
              <span className="text-xs text-slate-500 font-mono w-16">{speed}ms</span>
            </div>
          </div>
        </div>

        {/* Keystream Output */}
        {keystream.length > 0 && (
          <div className={panelClass}>
            <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-3">Keystream ({keystream.length} bits)</h2>
            <div className="bg-slate-950/60 rounded-lg p-3 font-mono text-xs max-h-40 overflow-y-auto">
              {/* Binary */}
              <div className="text-cyan-300 break-all leading-relaxed">
                {keystream.map((b, i) => (
                  <span key={i} className={b ? 'text-cyan-300' : 'text-slate-600'}>
                    {b}{(i + 1) % 8 === 0 ? ' ' : ''}
                  </span>
                ))}
              </div>
              {/* Hex */}
              {keystream.length >= 4 && (
                <div className="mt-2 text-slate-400 break-all">
                  Hex: {bitsToHex(keystream)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Last clock details */}
        {history.length > 0 && (
          <div className={panelClass}>
            <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-3">Last Clock Detail</h2>
            {(() => {
              const last = history[history.length - 1];
              return (
                <div className="bg-slate-900/80 rounded-lg p-3 font-mono text-xs space-y-1">
                  <div><span className="text-amber-400">Register A:</span> t1 = s[65] ⊕ s[92] = <span className="text-white">{last.t1}</span>, AND = s[90] &amp; s[91] = <span className="text-white">{last.and1}</span></div>
                  <div><span className="text-blue-400">Register B:</span> t2 = s[161] ⊕ s[176] = <span className="text-white">{last.t2}</span>, AND = s[174] &amp; s[175] = <span className="text-white">{last.and2}</span></div>
                  <div><span className="text-emerald-400">Register C:</span> t3 = s[242] ⊕ s[287] = <span className="text-white">{last.t3}</span>, AND = s[285] &amp; s[286] = <span className="text-white">{last.and3}</span></div>
                  <div className="border-t border-slate-800 pt-1 mt-1">
                    <span className="text-cyan-400 font-bold">Output = t1 ⊕ t2 ⊕ t3 = {last.t1} ⊕ {last.t2} ⊕ {last.t3} = {last.output}</span>
                  </div>
                  <div className="text-slate-500">
                    Feedback: A←{last.fb1}, B←{last.fb2}, C←{last.fb3}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Encrypt / Decrypt */}
        <div className={panelClass}>
          <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-4">Encrypt / Decrypt</h2>
          <p className="text-xs text-slate-400 mb-4">
            XOR plaintext bits with the Trivium keystream. Since XOR is its own inverse, encryption and decryption are identical operations with the same key and IV.
          </p>

          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => setMode('encrypt')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${mode === 'encrypt' ? 'bg-cyan-950/40 border border-cyan-700/50 text-cyan-400' : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-cyan-400'}`}>
              <Lock size={16} /> Encrypt
            </button>
            <button onClick={() => setMode('decrypt')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${mode === 'decrypt' ? 'bg-cyan-950/40 border border-cyan-700/50 text-cyan-400' : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-cyan-400'}`}>
              <Unlock size={16} /> Decrypt
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className={`${labelClass} block mb-1`}>
                {mode === 'encrypt' ? 'Plaintext' : 'Plaintext (paste text to encrypt/decrypt)'}
              </label>
              <input value={plaintext} onChange={e => setPlaintext(e.target.value)}
                placeholder="Type a message..."
                className={inputClass} />
            </div>

            {cryptResult && (
              <div className="space-y-3">
                {/* Bit-level XOR visualization (first 64 bits) */}
                <div>
                  <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">
                    Bit-level XOR (first {Math.min(64, cryptResult.inputBits.length)} of {cryptResult.inputBits.length} bits)
                  </h3>
                  <div className="bg-slate-900/80 rounded-lg p-3 font-mono text-[11px] space-y-1 overflow-x-auto">
                    <div className="flex gap-0.5 flex-wrap">
                      <span className="text-slate-500 w-20 shrink-0">Input:    </span>
                      {cryptResult.inputBits.slice(0, 64).map((b, i) => (
                        <span key={i} className={`w-3 text-center ${b ? 'text-amber-400' : 'text-slate-600'}`}>{b}</span>
                      ))}
                    </div>
                    <div className="flex gap-0.5 flex-wrap">
                      <span className="text-slate-500 w-20 shrink-0">Keystream:</span>
                      {cryptResult.keystreamBits.slice(0, 64).map((b, i) => (
                        <span key={i} className={`w-3 text-center ${b ? 'text-cyan-400' : 'text-slate-600'}`}>{b}</span>
                      ))}
                    </div>
                    <div className="flex gap-0.5 flex-wrap border-t border-slate-800 pt-1">
                      <span className="text-slate-500 w-20 shrink-0">Output:   </span>
                      {cryptResult.outputBits.slice(0, 64).map((b, i) => (
                        <span key={i} className={`w-3 text-center ${b ? 'text-emerald-400' : 'text-slate-600'}`}>{b}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Output */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-slate-900/80 rounded-lg p-3">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Output (hex)</div>
                    <div className="font-mono text-sm text-cyan-300 break-all">{cryptResult.outputHex}</div>
                  </div>
                  <div className="bg-slate-900/80 rounded-lg p-3">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Output (text)</div>
                    <div className="font-mono text-sm text-white break-all">{cryptResult.outputText}</div>
                  </div>
                </div>

                <div className="bg-slate-900/80 rounded-lg p-3">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Keystream (hex)</div>
                  <div className="font-mono text-xs text-slate-400 break-all">{cryptResult.keystreamHex}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Architecture */}
        <div className={panelClass}>
          <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-4">Trivium Architecture</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {[
              { name: 'Register A', bits: '93 bits (0–92)', taps: 's[65], s[68], s[90]&s[91], s[92]', color: 'amber', feeds: 'Feeds → B' },
              { name: 'Register B', bits: '84 bits (93–176)', taps: 's[161], s[170], s[174]&s[175], s[176]', color: 'blue', feeds: 'Feeds → C' },
              { name: 'Register C', bits: '111 bits (177–287)', taps: 's[242], s[263], s[285]&s[286], s[287]', color: 'emerald', feeds: 'Feeds → A' },
            ].map(reg => (
              <div key={reg.name} className="bg-slate-900/80 rounded-lg p-4 space-y-2">
                <div className={`text-sm font-bold text-${reg.color}-400`}>{reg.name}</div>
                <div className="text-xs text-slate-400 font-mono">{reg.bits}</div>
                <div className="text-xs text-slate-500 font-mono">Taps: {reg.taps}</div>
                <div className="text-xs text-slate-500">{reg.feeds}</div>
              </div>
            ))}
          </div>

          <div className="bg-slate-900/80 rounded-lg p-3 font-mono text-xs text-slate-400 space-y-1">
            <div className="text-cyan-400 font-bold mb-1">Each clock cycle:</div>
            <div>1. t1 = s[65] ⊕ s[92]</div>
            <div>2. t2 = s[161] ⊕ s[176]</div>
            <div>3. t3 = s[242] ⊕ s[287]</div>
            <div className="text-cyan-300">4. output = t1 ⊕ t2 ⊕ t3</div>
            <div className="border-t border-slate-800 pt-1 mt-1">5. feedback_A = t3 ⊕ (s[90] &amp; s[91]) ⊕ s[68]</div>
            <div>6. feedback_B = t1 ⊕ (s[174] &amp; s[175]) ⊕ s[170]</div>
            <div>7. feedback_C = t2 ⊕ (s[285] &amp; s[286]) ⊕ s[263]</div>
            <div className="text-slate-500 mt-1">8. Shift all registers right, insert feedback at position 0</div>
          </div>

          <div className="mt-3 text-xs text-slate-500 bg-slate-900/80 rounded-lg p-3 font-mono">
            <span className="text-cyan-400">vs plain LFSR:</span> The AND gates (s[90]&amp;s[91], etc.) introduce nonlinearity.
            Without them, Trivium would be a linear system breakable by the Berlekamp-Massey algorithm in ~288 known output bits.
            The AND gates make the internal state update nonlinear, preventing algebraic attacks.
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
