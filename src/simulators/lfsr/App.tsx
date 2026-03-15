import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Info, X, Play, Pause, SkipForward, RotateCcw } from 'lucide-react';

interface Preset { name: string; size: number; taps: number[]; }

const PRESETS: Preset[] = [
  { name: 'x⁴+x+1', size: 4, taps: [3, 0] },
  { name: 'x⁴+x³+1', size: 4, taps: [3, 2] },
  { name: 'x⁸+x⁶+x⁵+x⁴+1', size: 8, taps: [7, 5, 4, 3] },
  { name: 'x⁸+x⁴+x³+x²+1', size: 8, taps: [7, 3, 2, 1] },
  { name: 'x¹⁶+x¹⁴+x¹³+x¹¹+1', size: 16, taps: [15, 13, 12, 10] },
];

interface HistoryEntry { cycle: number; state: number[]; output: number; feedback: number; }

function textToBits(text: string): number[] {
  const bits: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    for (let b = 7; b >= 0; b--) bits.push((code >> b) & 1);
  }
  return bits;
}

function bitsToText(bits: number[]): string {
  let s = '';
  for (let i = 0; i + 7 < bits.length; i += 8) {
    let byte = 0;
    for (let b = 0; b < 8; b++) byte = (byte << 1) | bits[i + b];
    s += byte >= 32 && byte < 127 ? String.fromCharCode(byte) : '·';
  }
  return s;
}

const App: React.FC = () => {
  const [showInfo, setShowInfo] = useState(false);
  const [regSize, setRegSize] = useState(4);
  const [taps, setTaps] = useState<Set<number>>(new Set([3, 0]));
  const [register, setRegister] = useState<number[]>([1, 0, 0, 1]);
  const [initialReg, setInitialReg] = useState<number[]>([1, 0, 0, 1]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [outputBits, setOutputBits] = useState<number[]>([]);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(300);
  const [period, setPeriod] = useState<number | null>(null);
  const [plaintext, setPlaintext] = useState('');
  const [ciphertextHex, setCiphertextHex] = useState('');
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [tab, setTab] = useState<'visualize' | 'encrypt'>('visualize');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetLfsr = useCallback(() => {
    setRunning(false);
    setRegister([...initialReg]);
    setHistory([]);
    setOutputBits([]);
    setPeriod(null);
  }, [initialReg]);

  const changeSize = useCallback((newSize: number) => {
    setRunning(false);
    setRegSize(newSize);
    const newReg = Array.from({ length: newSize }, (_, i) => (i === 0 ? 1 : 0));
    setRegister(newReg);
    setInitialReg(newReg);
    setTaps(new Set([newSize - 1, 0]));
    setHistory([]);
    setOutputBits([]);
    setPeriod(null);
  }, []);

  const applyPreset = useCallback((p: Preset) => {
    setRunning(false);
    setRegSize(p.size);
    const newReg = Array.from({ length: p.size }, (_, i) => (i === 0 ? 1 : 0));
    setRegister(newReg);
    setInitialReg(newReg);
    setTaps(new Set(p.taps));
    setHistory([]);
    setOutputBits([]);
    setPeriod(null);
  }, []);

  const stepOnce = useCallback(() => {
    setRegister(prev => {
      const output = prev[prev.length - 1];
      let feedback = 0;
      taps.forEach(t => { if (t < prev.length) feedback ^= prev[t]; });
      const next = [feedback, ...prev.slice(0, -1)];

      setHistory(h => [...h, { cycle: h.length + 1, state: [...prev], output, feedback }]);
      setOutputBits(o => {
        const newOut = [...o, output];
        // Detect period: check if current state matches initial
        if (next.every((v, i) => v === initialReg[i]) && period === null) {
          setPeriod(newOut.length);
        }
        return newOut;
      });
      return next;
    });
  }, [taps, initialReg, period]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(stepOnce, speed);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, speed, stepOnce]);

  // Stop auto-run when period is found
  useEffect(() => { if (period !== null) setRunning(false); }, [period]);

  const toggleTap = (i: number) => {
    setTaps(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const toggleBit = (i: number) => {
    const next = [...register];
    next[i] ^= 1;
    setRegister(next);
    setInitialReg(next);
    setHistory([]);
    setOutputBits([]);
    setPeriod(null);
  };

  const generateKeystream = (len: number): number[] => {
    const ks: number[] = [];
    const reg = [...initialReg];
    for (let s = 0; s < len; s++) {
      ks.push(reg[reg.length - 1]);
      let fb = 0;
      taps.forEach(t => { if (t < reg.length) fb ^= reg[t]; });
      reg.pop();
      reg.unshift(fb);
    }
    return ks;
  };

  function hexToBytes(hex: string): number[] {
    const clean = hex.replace(/\s/g, '');
    const bytes: number[] = [];
    for (let i = 0; i + 1 < clean.length; i += 2) bytes.push(parseInt(clean.slice(i, i + 2), 16) || 0);
    return bytes;
  }
  function bytesToBits(bytes: number[]): number[] {
    const bits: number[] = [];
    for (const b of bytes) for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1);
    return bits;
  }
  function bitsToHex(bits: number[]): string {
    return Array.from({ length: Math.ceil(bits.length / 8) }, (_, i) => {
      let byte = 0;
      for (let b = 0; b < 8 && i * 8 + b < bits.length; b++) byte = (byte << 1) | bits[i * 8 + b];
      return byte.toString(16).padStart(2, '0');
    }).join(' ');
  }

  const inputBits = mode === 'encrypt' ? textToBits(plaintext) : bytesToBits(hexToBytes(ciphertextHex));
  const hasInput = mode === 'encrypt' ? plaintext.length > 0 : ciphertextHex.replace(/\s/g, '').length >= 2;
  const keystream = hasInput ? generateKeystream(inputBits.length) : [];
  const outputBitsEnc = inputBits.map((b, i) => b ^ keystream[i]);

  return (
    <div className="min-h-screen bg-[#1a1814] text-white px-6 py-4 sm:px-10 md:px-16 md:py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-cyan-400">LFSR Simulator</h1>
            <p className="text-sm text-slate-400 mt-1">Linear Feedback Shift Register — Stream Cipher Fundamentals</p>
          </div>
          <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-cyan-700/50 transition-colors">
            {showInfo ? <X size={20} className="text-cyan-400" /> : <Info size={20} className="text-cyan-400" />}
          </button>
        </div>

        {/* Info Panel */}
        {showInfo && (
          <div className="bg-cyan-950/20 border border-cyan-900/40 rounded-xl p-6 space-y-3 text-sm text-slate-300 leading-relaxed">
            <h2 className="text-base font-bold text-cyan-400">What is an LFSR?</h2>
            <p>A <strong className="text-white">Linear Feedback Shift Register</strong> is a shift register whose input bit is a linear function (XOR) of selected bit positions called <em>taps</em>. Each clock cycle, every bit shifts one position right, the rightmost bit is output, and a new bit computed from the taps is fed into the leftmost position.</p>
            <p>LFSRs generate long pseudo-random sequences efficiently in hardware. With a <strong className="text-white">maximal-length</strong> tap configuration (primitive polynomial), an n-bit LFSR produces a sequence of period 2ⁿ−1 before repeating.</p>
            <h3 className="text-sm font-bold text-cyan-400 pt-2">Real-World Use</h3>
            <p>LFSRs are building blocks in <strong className="text-white">A5/1</strong> (GSM voice encryption, three LFSRs with irregular clocking), <strong className="text-white">E0</strong> (Bluetooth), GPS C/A code generation, and CDMA spreading codes. They also appear in CRC computation and built-in self-test circuits.</p>
            <h3 className="text-sm font-bold text-cyan-400 pt-2">Why Insecure Alone?</h3>
            <p>A single LFSR is <strong className="text-white">completely broken</strong> by the <strong className="text-white">Berlekamp-Massey algorithm</strong>, which recovers the feedback polynomial from just 2n output bits. This is why practical stream ciphers combine multiple LFSRs with nonlinear combining functions or irregular clocking.</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2">
          {(['visualize', 'encrypt'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-cyan-950/50 text-cyan-400 border border-cyan-900/40' : 'bg-slate-900/40 text-slate-400 border border-slate-800 hover:text-white'}`}>
              {t === 'visualize' ? 'Visualize' : 'Encrypt Mode'}
            </button>
          ))}
        </div>

        {/* Configuration */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Register Size</label>
              <select value={regSize} onChange={e => changeSize(Number(e.target.value))}
                className="bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-cyan-700/50">
                {Array.from({ length: 13 }, (_, i) => i + 4).map(n => (
                  <option key={n} value={n}>{n} bits</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Presets</label>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map(p => (
                  <button key={p.name} onClick={() => applyPreset(p)}
                    className="px-3 py-2 text-xs font-mono bg-slate-800/80 border border-slate-700 rounded-lg hover:border-cyan-700/50 hover:text-cyan-400 transition-colors">
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Register Display */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Register State (click to toggle)</label>
            <div className="flex gap-1 flex-wrap items-end">
              {register.map((bit, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <span className={`text-[10px] font-mono ${taps.has(i) ? 'text-cyan-400 font-bold' : 'text-slate-600'}`}>
                    {taps.has(i) ? 'TAP' : `b${i}`}
                  </span>
                  <button onClick={() => toggleBit(i)}
                    className={`w-10 h-10 rounded-lg font-mono text-sm font-bold border-2 transition-all ${
                      taps.has(i)
                        ? bit ? 'bg-cyan-500/30 border-cyan-500 text-cyan-300' : 'bg-cyan-950/40 border-cyan-800 text-cyan-600'
                        : bit ? 'bg-slate-700 border-slate-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-500'
                    }`}>
                    {bit}
                  </button>
                </div>
              ))}
              <div className="flex flex-col items-center gap-1 ml-2">
                <span className="text-[10px] font-mono text-emerald-500">OUT</span>
                <div className="w-10 h-10 rounded-lg font-mono text-sm font-bold border-2 bg-emerald-950/30 border-emerald-700 text-emerald-400 flex items-center justify-center">
                  {register[register.length - 1]}
                </div>
              </div>
            </div>
          </div>

          {/* Tap Selection */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Feedback Taps (click to toggle)</label>
            <div className="flex gap-1 flex-wrap">
              {Array.from({ length: regSize }, (_, i) => (
                <button key={i} onClick={() => toggleTap(i)}
                  className={`w-10 h-8 rounded text-xs font-mono font-bold transition-all ${
                    taps.has(i) ? 'bg-cyan-600/40 border border-cyan-500 text-cyan-300' : 'bg-slate-800 border border-slate-700 text-slate-500 hover:border-slate-500'
                  }`}>
                  {i}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-mono">
              Feedback = {[...taps].sort((a, b) => b - a).map(t => `b${t}`).join(' ⊕ ') || '(none)'}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={stepOnce} disabled={period !== null}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600/20 border border-cyan-700/50 text-cyan-400 hover:bg-cyan-600/30 disabled:opacity-40 transition-colors text-sm font-medium">
              <SkipForward size={16} /> Step
            </button>
            <button onClick={() => setRunning(r => !r)} disabled={period !== null && !running}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600/20 border border-cyan-700/50 text-cyan-400 hover:bg-cyan-600/30 disabled:opacity-40 transition-colors text-sm font-medium">
              {running ? <><Pause size={16} /> Pause</> : <><Play size={16} /> Run</>}
            </button>
            <button onClick={resetLfsr}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors text-sm font-medium">
              <RotateCcw size={16} /> Reset
            </button>
            <div className="flex items-center gap-2 ml-auto">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Speed</label>
              <input type="range" min={50} max={800} step={50} value={800 - speed + 50}
                onChange={e => setSpeed(800 - Number(e.target.value) + 50)}
                className="w-24 accent-cyan-500" />
            </div>
          </div>
        </div>

        {tab === 'visualize' ? (
          <>
            {/* Feedback Visualization */}
            {history.length > 0 && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">Last Step Computation</label>
                <div className="font-mono text-sm space-y-1">
                  <div className="flex flex-wrap gap-1 items-center">
                    {[...taps].sort((a, b) => a - b).map((t, idx) => (
                      <React.Fragment key={t}>
                        {idx > 0 && <span className="text-cyan-500 font-bold mx-1">⊕</span>}
                        <span className="text-cyan-400">b{t}=</span>
                        <span className={history[history.length - 1].state[t] ? 'text-white' : 'text-slate-500'}>
                          {history[history.length - 1].state[t]}
                        </span>
                      </React.Fragment>
                    ))}
                    <span className="text-slate-400 mx-2">=</span>
                    <span className="text-yellow-400 font-bold">{history[history.length - 1].feedback}</span>
                    <span className="text-slate-500 ml-3">→ new leftmost bit</span>
                  </div>
                  <div className="text-emerald-400">Output bit: <span className="font-bold">{history[history.length - 1].output}</span> (rightmost)</div>
                </div>
              </div>
            )}

            {/* Output Stream */}
            {outputBits.length > 0 && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Output Stream ({outputBits.length} bits)</label>
                  {period !== null && (
                    <span className="text-xs font-bold text-yellow-400 bg-yellow-500/10 border border-yellow-600/30 px-3 py-1 rounded-full">
                      Period = {period} (max {Math.pow(2, regSize) - 1})
                    </span>
                  )}
                </div>
                <div className="font-mono text-sm flex flex-wrap gap-[2px] leading-relaxed">
                  {outputBits.map((b, i) => (
                    <span key={i} className={b ? 'text-cyan-400' : 'text-slate-600'}>{b}</span>
                  ))}
                </div>
              </div>
            )}

            {/* State History */}
            {history.length > 0 && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">State History</label>
                <div className="overflow-auto max-h-64">
                  <table className="w-full text-sm font-mono">
                    <thead>
                      <tr className="text-xs text-slate-500 uppercase tracking-wider border-b border-slate-800">
                        <th className="text-left py-2 px-2">Cycle</th>
                        <th className="text-left py-2 px-2">Register</th>
                        <th className="text-left py-2 px-2">Feedback</th>
                        <th className="text-left py-2 px-2">Output</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map(h => (
                        <tr key={h.cycle} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                          <td className="py-1.5 px-2 text-slate-400">{h.cycle}</td>
                          <td className="py-1.5 px-2">
                            {h.state.map((b, i) => (
                              <span key={i} className={taps.has(i) ? (b ? 'text-cyan-400' : 'text-cyan-800') : (b ? 'text-white' : 'text-slate-600')}>
                                {b}
                              </span>
                            ))}
                          </td>
                          <td className="py-1.5 px-2 text-yellow-400">{h.feedback}</td>
                          <td className="py-1.5 px-2 text-emerald-400">{h.output}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Encrypt / Decrypt Mode */
          <div className="space-y-4">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex gap-2 mb-2">
                <button onClick={() => setMode('encrypt')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${mode === 'encrypt' ? 'bg-cyan-950/50 text-cyan-400 border border-cyan-900/40' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'}`}>Encrypt Text</button>
                <button onClick={() => setMode('decrypt')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${mode === 'decrypt' ? 'bg-amber-950/50 text-amber-400 border border-amber-900/40' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'}`}>Decrypt Hex</button>
              </div>

              {mode === 'encrypt' ? (
                <>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Plaintext</label>
                  <textarea value={plaintext} onChange={e => setPlaintext(e.target.value)} placeholder="Type message of any length..."
                    className="w-full h-20 bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-cyan-700/50 resize-none" />
                </>
              ) : (
                <>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Ciphertext (hex)</label>
                  <textarea value={ciphertextHex} onChange={e => setCiphertextHex(e.target.value)} placeholder="Paste hex ciphertext..."
                    className="w-full h-20 bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-amber-700/50 resize-none" />
                </>
              )}

              {hasInput && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">{mode === 'encrypt' ? 'Input' : 'Ciphertext'} Bits</label>
                    <div className="font-mono text-xs flex flex-wrap gap-[1px]">
                      {inputBits.slice(0, 256).map((b, i) => (
                        <span key={i} className={`${b ? 'text-white' : 'text-slate-600'}${i > 0 && i % 8 === 0 ? ' ml-2' : ''}`}>{b}</span>
                      ))}
                      {inputBits.length > 256 && <span className="text-slate-600 ml-2">... ({inputBits.length} total)</span>}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Keystream (LFSR Output)</label>
                    <div className="font-mono text-xs flex flex-wrap gap-[1px]">
                      {keystream.slice(0, 256).map((b, i) => (
                        <span key={i} className={`${b ? 'text-cyan-400' : 'text-cyan-900'}${i > 0 && i % 8 === 0 ? ' ml-2' : ''}`}>{b}</span>
                      ))}
                      {keystream.length > 256 && <span className="text-cyan-700 ml-2">... ({keystream.length} total)</span>}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">{mode === 'encrypt' ? 'Ciphertext' : 'Decrypted Plaintext'} (hex)</label>
                      <div className="bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 font-mono text-sm text-yellow-400 break-all select-all cursor-pointer" onClick={e => { if (mode === 'encrypt') { setCiphertextHex(bitsToHex(outputBitsEnc).replace(/ /g, '')); setMode('decrypt'); } }}>
                        {bitsToHex(outputBitsEnc)}
                      </div>
                      {mode === 'encrypt' && <p className="text-[10px] text-slate-600 mt-1">Click to copy to decrypt tab</p>}
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">{mode === 'encrypt' ? 'Ciphertext' : 'Decrypted Plaintext'} (text)</label>
                      <div className="bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 font-mono text-sm text-yellow-400 break-all">
                        {bitsToText(outputBitsEnc)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
