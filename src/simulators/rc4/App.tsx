import React, { useState, useMemo } from 'react';
import { Info, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import ExhibitPanel from '../../components/ExhibitPanel';

// ── RC4 core ──────────────────────────────────────────────────────────────────

function ksa(key: number[]): number[] {
  const S = Array.from({ length: 256 }, (_, i) => i);
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + S[i] + key[i % key.length]) & 0xff;
    [S[i], S[j]] = [S[j], S[i]];
  }
  return S;
}

interface StepDetail {
  n: number;
  i: number;
  j: number;
  sBoxBefore: number[];  // state before this step's swap
  siVal: number;         // S[i] before swap
  sjVal: number;         // S[j] before swap
  lookupIdx: number;     // (S[i]+S[j]) mod 256 after swap = (sjVal+siVal) mod 256
  keystreamByte: number;
  inputByte: number;
  outputByte: number;
}

function computeSteps(inputBytes: number[], keyBytes: number[]): StepDetail[] {
  const S = ksa(keyBytes);
  let i = 0, j = 0;
  const steps: StepDetail[] = [];
  for (let n = 0; n < inputBytes.length; n++) {
    const sBoxBefore = [...S];
    i = (i + 1) & 0xff;
    j = (j + S[i]) & 0xff;
    const siVal = sBoxBefore[i];
    const sjVal = sBoxBefore[j];
    [S[i], S[j]] = [S[j], S[i]];
    const lookupIdx = (S[i] + S[j]) & 0xff;
    const keystreamByte = S[lookupIdx];
    const inputByte = inputBytes[n];
    steps.push({ n, i, j, sBoxBefore, siVal, sjVal, lookupIdx, keystreamByte, inputByte, outputByte: inputByte ^ keystreamByte });
  }
  return steps;
}

function rc4(input: number[], key: number[]): { output: number[]; keystream: number[] } {
  const S = ksa(key);
  let i = 0, j = 0;
  const keystream: number[] = [];
  for (let n = 0; n < input.length; n++) {
    i = (i + 1) & 0xff;
    j = (j + S[i]) & 0xff;
    [S[i], S[j]] = [S[j], S[i]];
    keystream.push(S[(S[i] + S[j]) & 0xff]);
  }
  return { output: input.map((b, k) => b ^ keystream[k]), keystream };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function textToBytes(text: string): number[] {
  return Array.from(new TextEncoder().encode(text));
}
function bytesToHex(bytes: number[]): string {
  return bytes.map(b => b.toString(16).padStart(2, '0')).join(' ');
}
function hexToBytes(hex: string): number[] {
  const clean = hex.replace(/[^0-9a-fA-F]/g, '');
  const out: number[] = [];
  for (let i = 0; i < clean.length; i += 2) out.push(parseInt(clean.slice(i, i + 2), 16));
  return out;
}
function bytesToText(bytes: number[]): string {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes)); }
  catch { return ''; }
}
function hex(n: number, pad = 2): string { return n.toString(16).padStart(pad, '0'); }
function isPrintable(b: number): boolean { return b >= 0x20 && b <= 0x7e; }

// ── S-Box Grid ────────────────────────────────────────────────────────────────

function SBoxGrid({ s, hiI, hiJ, hiLookup }: {
  s: number[];
  hiI: number | null;
  hiJ: number | null;
  hiLookup: number | null;
}) {
  return (
    <div className="overflow-x-auto">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(16, 1fr)', gap: '2px' }}>
        {s.map((v, idx) => {
          const isI = idx === hiI;
          const isJ = idx === hiJ && idx !== hiI;
          const isLookup = idx === hiLookup && idx !== hiI && idx !== hiJ;
          return (
            <div
              key={idx}
              title={`S[${idx}] = 0x${hex(v)}`}
              className={`
                flex items-center justify-center rounded text-[8px] font-mono select-none
                ${isI      ? 'bg-cyan-500/30 text-cyan-300 ring-1 ring-cyan-400 font-bold'    : ''}
                ${isJ      ? 'bg-amber-500/30 text-amber-300 ring-1 ring-amber-400 font-bold' : ''}
                ${isLookup ? 'bg-emerald-500/30 text-emerald-300 ring-1 ring-emerald-400 font-bold' : ''}
                ${!isI && !isJ && !isLookup ? 'bg-slate-800/40 text-slate-600' : ''}
              `}
              style={{ aspectRatio: '1', minWidth: 0 }}
            >
              {hex(v)}
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 mt-2 justify-center flex-wrap">
        <span className="text-[9px] font-mono flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-cyan-500/30 ring-1 ring-cyan-400" />
          <span className="text-slate-500">i = {hiI ?? '—'}</span>
        </span>
        <span className="text-[9px] font-mono flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-amber-500/30 ring-1 ring-amber-400" />
          <span className="text-slate-500">j = {hiJ ?? '—'}</span>
        </span>
        <span className="text-[9px] font-mono flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-emerald-500/30 ring-1 ring-emerald-400" />
          <span className="text-slate-500">lookup = {hiLookup ?? '—'}</span>
        </span>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────

function App() {
  const [key, setKey] = useState('SECRET');
  const [input, setInput] = useState('HELLO');
  const [direction, setDirection] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [showInfo, setShowInfo] = useState(false);
  const [showSBox, setShowSBox] = useState(false);
  const [stepMode, setStepMode] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const keyBytes  = useMemo(() => textToBytes(key || 'A'), [key]);
  const inputBytes = useMemo(() => direction === 'decrypt' ? hexToBytes(input) : textToBytes(input), [input, direction]);
  const result     = useMemo(() => inputBytes.length === 0 ? { output: [], keystream: [] } : rc4(inputBytes, keyBytes), [inputBytes, keyBytes]);
  const decryptedText = useMemo(() => direction === 'decrypt' && result.output.length > 0 ? bytesToText(result.output) : '', [direction, result.output]);
  const sBoxAfterKSA  = useMemo(() => ksa(keyBytes), [keyBytes]);
  const steps = useMemo(() => inputBytes.length === 0 ? [] : computeSteps(inputBytes, keyBytes), [inputBytes, keyBytes]);

  const step = steps[currentStep] ?? null;
  const totalSteps = steps.length;

  // S-Box to display in step view: sBoxBefore with i/j highlighted (pre-swap)
  // lookupIdx is the index AFTER the swap, which equals (sjVal + siVal) mod 256
  const sBoxForStep = step ? step.sBoxBefore : sBoxAfterKSA;
  // After swap: S[i] becomes sjVal, S[j] becomes siVal
  // lookupIdx = (sjVal + siVal) mod 256 — shown in sBoxBefore for reference (value may differ post-swap)
  const lookupInBefore = step ? step.lookupIdx : null;

  return (
    <div className="flex-1 bg-[#0d1117] flex flex-col">
      <ExhibitPanel id="rc4" />
      <div className="bg-[#0d1117] flex flex-col items-center justify-start py-10 px-6 text-slate-200">
      <div className="w-full max-w-4xl">

        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl sm:text-4xl font-typewriter font-bold text-slate-100 tracking-tighter">
              <span className="text-orange-400">RC4</span> STREAM CIPHER
            </h1>
            <span className="text-slate-500 text-xs tracking-[0.3em] font-mono">RIVEST CIPHER 4 — 1987 (LEAKED 1994)</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowSBox(!showSBox)}
              className={`px-3 py-2 rounded-lg font-bold text-xs border transition-all ${
                showSBox ? 'bg-orange-900/50 border-orange-700 text-orange-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >S-Box</button>
            <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 border border-slate-700">
              <Info size={20} />
            </button>
            <button onClick={() => setInput('')} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 border border-slate-700">
              <RotateCcw size={20} />
            </button>
          </div>
        </div>

        {/* Key input */}
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 mb-8">
          <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">
            Key (1–256 bytes)
          </label>
          <input
            value={key}
            onChange={e => setKey(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 font-mono text-xl tracking-wider text-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-center"
            placeholder="SECRET KEY"
            spellCheck={false}
          />
          <div className="text-[10px] text-slate-600 text-center mt-2 font-mono">
            {keyBytes.length} byte{keyBytes.length !== 1 ? 's' : ''}: [{bytesToHex(keyBytes.slice(0, 16))}{keyBytes.length > 16 ? ' ...' : ''}]
          </div>
        </div>

        {/* S-Box after KSA (static view) */}
        {showSBox && (
          <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-4 mb-8">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold text-center mb-3">
              S-Box After Key Scheduling (KSA) — initial PRGA state
            </div>
            <SBoxGrid s={sBoxAfterKSA} hiI={null} hiJ={null} hiLookup={null} />
            <div className="text-[10px] text-slate-600 text-center mt-2 font-mono">
              {sBoxAfterKSA.filter((v, i) => v === i).length} values unchanged from identity
            </div>
          </div>
        )}

        {/* Direction toggle */}
        <div className="flex justify-center gap-2 mb-6">
          <button onClick={() => { setDirection('encrypt'); setInput(''); setCurrentStep(0); }}
            className={`px-6 py-2 rounded-lg font-bold text-sm border transition-colors ${
              direction === 'encrypt' ? 'bg-orange-900/50 border-orange-700 text-orange-300' : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >ENCRYPT</button>
          <button onClick={() => { setDirection('decrypt'); setInput(''); setCurrentStep(0); }}
            className={`px-6 py-2 rounded-lg font-bold text-sm border transition-colors ${
              direction === 'decrypt' ? 'bg-orange-900/50 border-orange-700 text-orange-300' : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >DECRYPT</button>
        </div>

        {/* Input / Output */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">
              {direction === 'encrypt' ? 'Plaintext' : 'Ciphertext (hex)'}
            </label>
            <textarea
              value={input}
              onChange={e => { setInput(e.target.value); setCurrentStep(0); }}
              placeholder={direction === 'encrypt' ? 'TYPE YOUR MESSAGE...' : 'PASTE HEX CIPHERTEXT...'}
              className="w-full h-32 bg-slate-900 border border-slate-700 rounded-xl p-4 font-mono text-sm tracking-wider focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none text-slate-200 placeholder-slate-700"
              spellCheck={false}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-orange-400 font-bold uppercase tracking-wider">
                {direction === 'encrypt' ? 'Ciphertext (hex)' : 'Plaintext'}
              </label>
              {direction === 'encrypt' && result.output.length > 0 && (
                <button
                  onClick={() => { setDirection('decrypt'); setInput(bytesToHex(result.output)); setCurrentStep(0); }}
                  className="text-[10px] text-orange-500 hover:text-orange-300 font-mono border border-orange-800/50 hover:border-orange-600 rounded px-2 py-0.5 transition-colors"
                >
                  → Decrypt this
                </button>
              )}
            </div>
            <div className="w-full h-32 bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 font-mono text-sm tracking-wider overflow-y-auto break-all">
              {direction === 'encrypt' ? (
                result.output.length > 0
                  ? <span className="text-orange-200">{bytesToHex(result.output)}</span>
                  : <span className="text-slate-700">...</span>
              ) : (
                result.output.length > 0 ? (
                  <div className="space-y-2">
                    {decryptedText
                      ? <div className="text-green-300">{decryptedText}</div>
                      : <div className="text-slate-500 text-xs italic">Output is not valid UTF-8 text</div>}
                    <div className="text-slate-600 text-xs border-t border-slate-700/50 pt-2">{bytesToHex(result.output)}</div>
                  </div>
                ) : <span className="text-slate-700">...</span>
              )}
            </div>
          </div>
        </div>

        {/* Step-through toggle */}
        {steps.length > 0 && (
          <div className="flex justify-center mb-4">
            <button
              onClick={() => { setStepMode(!stepMode); setCurrentStep(0); }}
              className={`px-6 py-2 rounded-lg font-bold text-sm border transition-colors ${
                stepMode
                  ? 'bg-cyan-900/40 border-cyan-700 text-cyan-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              {stepMode ? '✕ Close Step-Through' : '⟳ Step Through PRGA'}
            </button>
          </div>
        )}

        {/* ── STEP-THROUGH PANEL ── */}
        {stepMode && step && (
          <div className="bg-slate-900/60 rounded-2xl border border-slate-700 p-6 mb-8">

            {/* Navigation bar */}
            <div className="flex items-center justify-between mb-5">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold font-mono">
                PRGA Step-Through
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
                  disabled={currentStep === 0}
                  className="p-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-mono text-slate-400">
                  Step <span className="text-white font-bold">{currentStep + 1}</span> / {totalSteps}
                </span>
                <button
                  onClick={() => setCurrentStep(s => Math.min(totalSteps - 1, s + 1))}
                  disabled={currentStep === totalSteps - 1}
                  className="p-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Character selector strip */}
            <div className="flex gap-1 flex-wrap mb-6">
              {steps.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStep(idx)}
                  className={`w-9 h-9 rounded font-mono text-xs border flex flex-col items-center justify-center leading-none transition-colors ${
                    idx === currentStep
                      ? 'bg-orange-900/60 border-orange-600 text-orange-300'
                      : 'bg-slate-800/60 border-slate-700 text-slate-500 hover:text-white hover:border-slate-500'
                  }`}
                  title={`Step ${idx + 1}: byte 0x${hex(s.inputByte)}`}
                >
                  <span>{isPrintable(s.inputByte) ? String.fromCharCode(s.inputByte) : '·'}</span>
                  <span className="text-[7px] opacity-60">{hex(s.inputByte)}</span>
                </button>
              ))}
            </div>

            <div className="grid lg:grid-cols-[1fr_300px] gap-6">

              {/* Left: S-Box grid */}
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">
                  S-Box — state before step {currentStep + 1} swap
                </div>
                <SBoxGrid
                  s={sBoxForStep}
                  hiI={step.i}
                  hiJ={step.j}
                  hiLookup={lookupInBefore}
                />
                <p className="text-[10px] text-slate-600 font-mono mt-3 leading-relaxed">
                  Cyan cell (index {step.i}) and amber cell (index {step.j}) are
                  swapped this step. The green cell (index {step.lookupIdx}) is where
                  the keystream byte is read from <em>after</em> the swap.
                </p>
              </div>

              {/* Right: PRGA formula */}
              <div className="space-y-4">
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                  PRGA Operations
                </div>

                {/* Step 1 */}
                <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/50">
                  <div className="text-[9px] text-slate-600 uppercase tracking-widest font-bold mb-1">① Advance i</div>
                  <div className="font-mono text-xs text-slate-300">
                    i = (i + 1) mod 256
                  </div>
                  <div className="font-mono text-xs text-cyan-300 mt-1">
                    = ({(step.i - 1 + 256) & 0xff} + 1) mod 256 = <span className="font-bold">{step.i}</span>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/50">
                  <div className="text-[9px] text-slate-600 uppercase tracking-widest font-bold mb-1">② Update j</div>
                  <div className="font-mono text-xs text-slate-300">
                    j = (j + S[i]) mod 256
                  </div>
                  <div className="font-mono text-xs text-amber-300 mt-1">
                    = (j_prev + S[{step.i}]) mod 256
                  </div>
                  <div className="font-mono text-xs text-amber-300">
                    = (j_prev + 0x{hex(step.siVal)}) mod 256 = <span className="font-bold">{step.j}</span>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/50">
                  <div className="text-[9px] text-slate-600 uppercase tracking-widest font-bold mb-1">③ Swap S[i] ↔ S[j]</div>
                  <div className="font-mono text-xs text-slate-300 space-y-0.5">
                    <div>S[<span className="text-cyan-400">{step.i}</span>]: 0x{hex(step.siVal)} → <span className="text-amber-400">0x{hex(step.sjVal)}</span></div>
                    <div>S[<span className="text-amber-400">{step.j}</span>]: 0x{hex(step.sjVal)} → <span className="text-cyan-400">0x{hex(step.siVal)}</span></div>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/50">
                  <div className="text-[9px] text-slate-600 uppercase tracking-widest font-bold mb-1">④ Lookup keystream byte</div>
                  <div className="font-mono text-xs text-slate-300">
                    idx = (S[i] + S[j]) mod 256
                  </div>
                  <div className="font-mono text-xs text-slate-300 mt-0.5">
                    = (0x{hex(step.sjVal)} + 0x{hex(step.siVal)}) mod 256 = <span className="text-emerald-400 font-bold">{step.lookupIdx}</span>
                  </div>
                  <div className="font-mono text-xs text-emerald-300 font-bold mt-1">
                    K = S[{step.lookupIdx}] = 0x{hex(step.keystreamByte)}
                  </div>
                </div>

                {/* XOR */}
                <div className="bg-orange-950/30 rounded-lg p-3 border border-orange-800/40">
                  <div className="text-[9px] text-orange-600 uppercase tracking-widest font-bold mb-2">⑤ XOR with input byte</div>
                  <div className="font-mono text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 w-20 text-right">
                        {direction === 'encrypt' ? 'Plaintext' : 'Ciphertext'}:
                      </span>
                      <span className="text-slate-300">
                        0x{hex(step.inputByte)}
                        {isPrintable(step.inputByte) && (
                          <span className="text-slate-500 ml-1">'{String.fromCharCode(step.inputByte)}'</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 w-20 text-right">⊕ Keystream:</span>
                      <span className="text-emerald-400">0x{hex(step.keystreamByte)}</span>
                    </div>
                    <div className="border-t border-slate-700 pt-1 flex items-center gap-2">
                      <span className="text-slate-500 w-20 text-right">
                        {direction === 'encrypt' ? 'Ciphertext' : 'Plaintext'}:
                      </span>
                      <span className="text-orange-300 font-bold">
                        0x{hex(step.outputByte)}
                        {isPrintable(step.outputByte) && (
                          <span className="text-orange-500 ml-1">'{String.fromCharCode(step.outputByte)}'</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress strip */}
            <div className="mt-5 pt-4 border-t border-slate-800">
              <div className="text-[9px] text-slate-600 uppercase tracking-widest font-bold mb-2">All bytes so far</div>
              <div className="overflow-x-auto">
                <table className="text-[10px] font-mono w-full">
                  <thead>
                    <tr className="text-slate-600">
                      <td className="pr-3 pb-1">Step</td>
                      <td className="pr-3 pb-1">Char</td>
                      <td className="pr-3 pb-1">i</td>
                      <td className="pr-3 pb-1">j</td>
                      <td className="pr-3 pb-1">Keystream</td>
                      <td className="pr-3 pb-1">Input</td>
                      <td className="pb-1">Output</td>
                    </tr>
                  </thead>
                  <tbody>
                    {steps.map((s, idx) => (
                      <tr
                        key={idx}
                        onClick={() => setCurrentStep(idx)}
                        className={`cursor-pointer transition-colors ${
                          idx === currentStep ? 'text-orange-300' : idx < currentStep ? 'text-slate-500' : 'text-slate-700'
                        } hover:text-slate-300`}
                      >
                        <td className="pr-3 py-0.5">{idx + 1}</td>
                        <td className="pr-3">{isPrintable(s.inputByte) ? String.fromCharCode(s.inputByte) : '·'}</td>
                        <td className="pr-3">{s.i}</td>
                        <td className="pr-3">{s.j}</td>
                        <td className="pr-3 text-emerald-600">0x{hex(s.keystreamByte)}</td>
                        <td className="pr-3">0x{hex(s.inputByte)}</td>
                        <td className="text-orange-500">0x{hex(s.outputByte)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* XOR summary (collapsed when step mode active) */}
        {!stepMode && result.output.length > 0 && (
          <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-5 mb-8 overflow-x-auto">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">
              XOR Summary — first {Math.min(16, result.output.length)} bytes
            </div>
            <div className="space-y-2 font-mono text-xs">
              {[
                { label: direction === 'encrypt' ? 'Plaintext' : 'Ciphertext', bytes: inputBytes, color: 'text-slate-300', bg: 'bg-slate-800/60' },
                { label: '⊕ Keystream', bytes: result.keystream, color: 'text-orange-400', bg: 'bg-orange-900/30 border border-orange-800/40' },
                { label: direction === 'encrypt' ? 'Ciphertext' : 'Plaintext', bytes: result.output, color: 'text-orange-300 font-bold', bg: 'bg-orange-900/40 border border-orange-700/40' },
              ].map(({ label, bytes, color, bg }) => (
                <div key={label} className="flex items-center gap-1">
                  <span className="text-slate-600 w-24 shrink-0 text-right pr-2 text-[10px]">{label}:</span>
                  {bytes.slice(0, 16).map((b, i) => (
                    <div key={i} className={`w-10 h-7 flex items-center justify-center rounded ${bg} ${color}`}>
                      {b.toString(16).padStart(2, '0')}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            {result.output.length > 16 && (
              <div className="text-[10px] text-slate-600 mt-2">… {result.output.length - 16} more bytes</div>
            )}
          </div>
        )}

        {/* Security note */}
        <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-4 mb-8">
          <div className="text-[10px] text-red-400 uppercase tracking-widest font-bold mb-1">Security Warning</div>
          <div className="text-xs text-red-300/70">
            RC4 is <strong>cryptographically broken</strong> and must not be used for security.
            Biases in the keystream allow statistical attacks, and related-key weaknesses broke WEP.
            It was removed from TLS in 2015 (RFC 7465). Use <strong>ChaCha20</strong> or <strong>AES-GCM</strong> instead.
          </div>
        </div>
      </div>

      {/* Info Panel */}
      <div className={`fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-700 p-6 transform transition-transform duration-300 z-40 ${showInfo ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="max-w-3xl mx-auto relative">
          <button onClick={() => setShowInfo(false)} className="absolute top-0 right-0 p-2 text-slate-500 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <h3 className="text-xl font-bold text-orange-400 mb-2">About RC4</h3>
          <div className="text-sm text-slate-300 leading-relaxed space-y-2">
            <p>
              <strong>RC4</strong> (Rivest Cipher 4) was designed by <strong>Ron Rivest</strong> in 1987 for RSA Security.
              It was a trade secret until it was anonymously leaked in 1994 (the leaked version is called "ARCFOUR").
              It was the most widely deployed stream cipher in history — used in SSL/TLS, WEP, WPA-TKIP, and many protocols.
            </p>
            <p>
              The algorithm is remarkably simple: a <strong>Key Scheduling Algorithm (KSA)</strong> initializes a
              256-byte permutation from the key, then a <strong>Pseudo-Random Generation Algorithm (PRGA)</strong>
              produces keystream bytes by swapping elements of the permutation. Each byte of plaintext is XORed
              with a keystream byte.
            </p>
            <p>
              Despite its simplicity and speed, RC4 has multiple known weaknesses: <strong>Fluhrer-Mantin-Shamir</strong>
              attacks broke WEP, <strong>biases in the first bytes</strong> of output leak information, and
              <strong>statistical biases</strong> throughout the keystream enable plaintext recovery in TLS.
            </p>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

export default App;
