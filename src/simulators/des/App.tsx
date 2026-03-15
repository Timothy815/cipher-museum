import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Info, X, Play, Pause, SkipForward, RotateCcw, Lock, Unlock } from 'lucide-react';

// ─── DES Tables ───────────────────────────────────────────────────────────────

const IP: number[] = [
  58,50,42,34,26,18,10,2, 60,52,44,36,28,20,12,4,
  62,54,46,38,30,22,14,6, 64,56,48,40,32,24,16,8,
  57,49,41,33,25,17, 9,1, 59,51,43,35,27,19,11,3,
  61,53,45,37,29,21,13,5, 63,55,47,39,31,23,15,7,
];

const FP: number[] = [
  40,8,48,16,56,24,64,32, 39,7,47,15,55,23,63,31,
  38,6,46,14,54,22,62,30, 37,5,45,13,53,21,61,29,
  36,4,44,12,52,20,60,28, 35,3,43,11,51,19,59,27,
  34,2,42,10,50,18,58,26, 33,1,41, 9,49,17,57,25,
];

const E: number[] = [
  32, 1, 2, 3, 4, 5,  4, 5, 6, 7, 8, 9,
   8, 9,10,11,12,13, 12,13,14,15,16,17,
  16,17,18,19,20,21, 20,21,22,23,24,25,
  24,25,26,27,28,29, 28,29,30,31,32, 1,
];

const P: number[] = [
  16, 7,20,21,29,12,28,17, 1,15,23,26, 5,18,31,10,
   2, 8,24,14,32,27, 3, 9,19,13,30, 6,22,11, 4,25,
];

const SBOXES: number[][][] = [
  [[14,4,13,1,2,15,11,8,3,10,6,12,5,9,0,7],[0,15,7,4,14,2,13,1,10,6,12,11,9,5,3,8],[4,1,14,8,13,6,2,11,15,12,9,7,3,10,5,0],[15,12,8,2,4,9,1,7,5,11,3,14,10,0,6,13]],
  [[15,1,8,14,6,11,3,4,9,7,2,13,12,0,5,10],[3,13,4,7,15,2,8,14,12,0,1,10,6,9,11,5],[0,14,7,11,10,4,13,1,5,8,12,6,9,3,2,15],[13,8,10,1,3,15,4,2,11,6,7,12,0,5,14,9]],
  [[10,0,9,14,6,3,15,5,1,13,12,7,11,4,2,8],[13,7,0,9,3,4,6,10,2,8,5,14,12,11,15,1],[13,6,4,9,8,15,3,0,11,1,2,12,5,10,14,7],[1,10,13,0,6,9,8,7,4,15,14,3,11,5,2,12]],
  [[7,13,14,3,0,6,9,10,1,2,8,5,11,12,4,15],[13,8,11,5,6,15,0,3,4,7,2,12,1,10,14,9],[10,6,9,0,12,11,7,13,15,1,3,14,5,2,8,4],[3,15,0,6,10,1,13,8,9,4,5,11,12,7,2,14]],
  [[2,12,4,1,7,10,11,6,8,5,3,15,13,0,14,9],[14,11,2,12,4,7,13,1,5,0,15,10,3,9,8,6],[4,2,1,11,10,13,7,8,15,9,12,5,6,3,0,14],[11,8,12,7,1,14,2,13,6,15,0,9,10,4,5,3]],
  [[12,1,10,15,9,2,6,8,0,13,3,4,14,7,5,11],[10,15,4,2,7,12,9,5,6,1,13,14,0,11,3,8],[9,14,15,5,2,8,12,3,7,0,4,10,1,13,11,6],[4,3,2,12,9,5,15,10,11,14,1,7,6,0,8,13]],
  [[4,11,2,14,15,0,8,13,3,12,9,7,5,10,6,1],[13,0,11,7,4,9,1,10,14,3,5,12,2,15,8,6],[1,4,11,13,12,3,7,14,10,15,6,8,0,5,9,2],[6,11,13,8,1,4,10,7,9,5,0,15,14,2,3,12]],
  [[13,2,8,4,6,15,11,1,10,12,9,7,3,14,5,0],[1,15,13,8,10,3,7,4,12,5,6,2,0,14,9,11],[7,11,4,1,9,12,14,2,0,6,10,13,15,3,5,8],[2,1,14,7,4,10,8,13,15,12,9,0,3,5,6,11]],
];

const PC1: number[] = [
  57,49,41,33,25,17, 9, 1,58,50,42,34,26,18,
  10, 2,59,51,43,35,27,19,11, 3,60,52,44,36,
  63,55,47,39,31,23,15, 7,62,54,46,38,30,22,
  14, 6,61,53,45,37,29,21,13, 5,28,20,12, 4,
];

const PC2: number[] = [
  14,17,11,24, 1, 5, 3,28,15, 6,21,10,
  23,19,12, 4,26, 8,16, 7,27,20,13, 2,
  41,52,31,37,47,55,30,40,51,45,33,48,
  44,49,39,56,34,53,46,42,50,36,29,32,
];

const SHIFT_SCHEDULE: number[] = [1,1,2,2,2,2,2,2,1,2,2,2,2,2,2,1];

// ─── DES Engine ───────────────────────────────────────────────────────────────

function toBits(bytes: number[]): number[] {
  const bits: number[] = [];
  for (const b of bytes) for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1);
  return bits;
}

function bitsToHex(bits: number[]): string {
  let hex = '';
  for (let i = 0; i < bits.length; i += 4) {
    const nibble = (bits[i] << 3) | (bits[i+1] << 2) | (bits[i+2] << 1) | bits[i+3];
    hex += nibble.toString(16).toUpperCase();
  }
  return hex;
}

function permute(input: number[], table: number[]): number[] {
  return table.map(pos => input[pos - 1]);
}

function xorBits(a: number[], b: number[]): number[] {
  return a.map((v, i) => v ^ b[i]);
}

function leftShift(bits: number[], count: number): number[] {
  return [...bits.slice(count), ...bits.slice(0, count)];
}

function sboxSubstitute(input48: number[]): { outputs: { input6: number[]; row: number; col: number; output4: number[] }[]; result: number[] } {
  const outputs: { input6: number[]; row: number; col: number; output4: number[] }[] = [];
  const result: number[] = [];
  for (let i = 0; i < 8; i++) {
    const chunk = input48.slice(i * 6, i * 6 + 6);
    const row = (chunk[0] << 1) | chunk[5];
    const col = (chunk[1] << 3) | (chunk[2] << 2) | (chunk[3] << 1) | chunk[4];
    const val = SBOXES[i][row][col];
    const out4 = [(val >> 3) & 1, (val >> 2) & 1, (val >> 1) & 1, val & 1];
    outputs.push({ input6: chunk, row, col, output4: out4 });
    result.push(...out4);
  }
  return { outputs, result };
}

interface RoundState {
  round: number;
  L: number[];
  R: number[];
  K: number[];
  expanded: number[];
  xorWithKey: number[];
  sboxDetail: { input6: number[]; row: number; col: number; output4: number[] }[];
  sboxOut: number[];
  pPermuted: number[];
  newR: number[];
}

interface DESResult {
  inputBits: number[];
  afterIP: number[];
  rounds: RoundState[];
  beforeFP: number[];
  outputBits: number[];
  roundKeys: number[][];
}

function generateRoundKeys(keyBytes: number[]): { roundKeys: number[][]; cd: { C: number[]; D: number[] }[] } {
  const keyBits = toBits(keyBytes);
  const pc1Bits = permute(keyBits, PC1);
  let C = pc1Bits.slice(0, 28);
  let D = pc1Bits.slice(28, 56);
  const roundKeys: number[][] = [];
  const cd: { C: number[]; D: number[] }[] = [{ C: [...C], D: [...D] }];
  for (let i = 0; i < 16; i++) {
    C = leftShift(C, SHIFT_SCHEDULE[i]);
    D = leftShift(D, SHIFT_SCHEDULE[i]);
    cd.push({ C: [...C], D: [...D] });
    roundKeys.push(permute([...C, ...D], PC2));
  }
  return { roundKeys, cd };
}

function desProcess(plainBytes: number[], keyBytes: number[], decrypt: boolean): DESResult {
  const { roundKeys } = generateRoundKeys(keyBytes);
  const orderedKeys = decrypt ? [...roundKeys].reverse() : roundKeys;
  const inputBits = toBits(plainBytes);
  const afterIP = permute(inputBits, IP);
  let L = afterIP.slice(0, 32);
  let R = afterIP.slice(32, 64);
  const rounds: RoundState[] = [];

  for (let i = 0; i < 16; i++) {
    const K = orderedKeys[i];
    const expanded = permute(R, E);
    const xorWithKey = xorBits(expanded, K);
    const { outputs: sboxDetail, result: sboxOut } = sboxSubstitute(xorWithKey);
    const pPermuted = permute(sboxOut, P);
    const newR = xorBits(L, pPermuted);
    rounds.push({ round: i + 1, L: [...L], R: [...R], K, expanded, xorWithKey, sboxDetail, sboxOut, pPermuted, newR });
    L = R;
    R = newR;
  }

  const beforeFP = [...R, ...L]; // final swap
  const outputBits = permute(beforeFP, FP);
  return { inputBits, afterIP, rounds, beforeFP, outputBits, roundKeys: orderedKeys };
}

function textToBlocks(text: string): number[][] {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) bytes.push(text.charCodeAt(i) & 0xFF);
  // PKCS#5 padding
  const padLen = 8 - (bytes.length % 8);
  for (let i = 0; i < padLen; i++) bytes.push(padLen);
  const blocks: number[][] = [];
  for (let i = 0; i < bytes.length; i += 8) blocks.push(bytes.slice(i, i + 8));
  return blocks;
}

function textToBytes(text: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < 8; i++) bytes.push(i < text.length ? text.charCodeAt(i) & 0xFF : 0);
  return bytes;
}

function hexToBlocks(hex: string): number[][] {
  const clean = hex.replace(/\s/g, '');
  if (!/^[0-9a-fA-F]*$/.test(clean) || clean.length === 0) return [];
  const padded = clean.length % 16 === 0 ? clean : clean + '0'.repeat(16 - (clean.length % 16));
  const blocks: number[][] = [];
  for (let i = 0; i < padded.length; i += 16) {
    const block: number[] = [];
    for (let j = 0; j < 16; j += 2) block.push(parseInt(padded.slice(i + j, i + j + 2), 16));
    blocks.push(block);
  }
  return blocks;
}

function hexToBytes(hex: string): number[] | null {
  const clean = hex.replace(/\s/g, '');
  if (clean.length !== 16 || !/^[0-9a-fA-F]+$/.test(clean)) return null;
  const bytes: number[] = [];
  for (let i = 0; i < 16; i += 2) bytes.push(parseInt(clean.slice(i, i + 2), 16));
  return bytes;
}

function bytesToHex(bytes: number[]): string {
  return bytes.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join('');
}

function removePkcs5(bytes: number[]): number[] {
  if (bytes.length === 0) return bytes;
  const padLen = bytes[bytes.length - 1];
  if (padLen >= 1 && padLen <= 8 && bytes.slice(-padLen).every(b => b === padLen)) {
    return bytes.slice(0, -padLen);
  }
  return bytes;
}

function bitsToBytes(bits: number[]): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8 && i + j < bits.length; j++) b = (b << 1) | bits[i + j];
    bytes.push(b);
  }
  return bytes;
}

// ─── Component ────────────────────────────────────────────────────────────────

const App: React.FC = () => {
  const [plaintext, setPlaintext] = useState('ABCDEFGH');
  const [keyText, setKeyText] = useState('13345779');
  const [hexMode, setHexMode] = useState(false);
  const [decrypt, setDecrypt] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [activeRound, setActiveRound] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(500);
  const [showKeySchedule, setShowKeySchedule] = useState(false);
  const [inspectBlock, setInspectBlock] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const keyBytes = hexMode ? (hexToBytes(keyText) ?? textToBytes(keyText.slice(0, 8))) : textToBytes(keyText.slice(0, 8));

  // Multi-block support
  const allBlocks = decrypt
    ? hexToBlocks(plaintext)
    : (hexMode ? hexToBlocks(plaintext) : textToBlocks(plaintext));
  const firstBlock = allBlocks[inspectBlock] ?? allBlocks[0] ?? textToBytes('');
  const inputBytes = firstBlock;

  // Full encrypt/decrypt all blocks
  const fullOutput = allBlocks.map(block => {
    const r = desProcess(block, keyBytes, decrypt);
    return bitsToBytes(r.outputBits);
  }).flat();

  const fullOutputHex = bytesToHex(fullOutput);
  const fullOutputText = decrypt
    ? removePkcs5(fullOutput).map(b => b >= 32 && b < 127 ? String.fromCharCode(b) : '·').join('')
    : '';

  const result = desProcess(inputBytes, keyBytes, decrypt);
  const { roundKeys, cd } = generateRoundKeys(keyBytes);

  const stopAnimation = useCallback(() => {
    setIsRunning(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const runAnimation = useCallback(() => {
    stopAnimation();
    setIsRunning(true);
    setActiveRound(0);
    let r = 0;
    const tick = () => {
      r++;
      if (r > 17) { setIsRunning(false); setActiveRound(null); return; }
      setActiveRound(r);
      timerRef.current = setTimeout(tick, speed);
    };
    timerRef.current = setTimeout(tick, speed);
  }, [speed, stopAnimation]);

  const stepForward = useCallback(() => {
    stopAnimation();
    setActiveRound(prev => {
      if (prev === null) return 0;
      if (prev >= 17) return null;
      return prev + 1;
    });
  }, [stopAnimation]);

  const reset = useCallback(() => {
    stopAnimation();
    setActiveRound(null);
  }, [stopAnimation]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const activeRoundData = activeRound !== null && activeRound >= 1 && activeRound <= 16 ? result.rounds[activeRound - 1] : null;

  const labelClass = 'text-xs font-bold text-slate-400 uppercase tracking-wider';
  const panelClass = 'bg-slate-900/60 border border-slate-800 rounded-xl p-5';
  const inputClass = 'bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-cyan-700/50 w-full';

  return (
    <div className="min-h-screen bg-[#1a1814] text-white px-6 py-4 sm:px-10 md:px-16 md:py-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-cyan-400">DES Simulator</h1>
            <p className="text-sm text-slate-500 mt-1">Data Encryption Standard — 16-Round Feistel Network</p>
          </div>
          <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 border border-slate-700">
            {showInfo ? <X size={20} /> : <Info size={20} />}
          </button>
        </div>

        {/* Input Panel */}
        <div className={panelClass}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className={labelClass}>{decrypt ? 'Ciphertext (hex)' : 'Plaintext'}</span>
                {!decrypt && (
                  <button onClick={() => setHexMode(!hexMode)} className="text-xs px-2 py-0.5 rounded border border-slate-700 text-slate-400 hover:text-cyan-400 hover:border-cyan-800">
                    {hexMode ? 'HEX' : 'TEXT'}
                  </button>
                )}
              </div>
              <textarea value={plaintext} onChange={e => { setPlaintext(e.target.value); setInspectBlock(0); }}
                className={`${inputClass} h-20 resize-none`}
                placeholder={decrypt ? 'Paste hex ciphertext...' : (hexMode ? 'Hex input (any length)...' : 'Type any message...')} />
              <div className="text-xs text-slate-600 mt-1 font-mono">{allBlocks.length} block{allBlocks.length !== 1 ? 's' : ''} × 64 bits (ECB mode{!decrypt ? ', PKCS#5 padded' : ''})</div>
            </div>
            <div>
              <span className={`${labelClass} block mb-2`}>Key (8 chars / 16 hex)</span>
              <input value={keyText} onChange={e => setKeyText(e.target.value.slice(0, 16))} className={inputClass} placeholder="8 characters or 16 hex" />
              <div className="text-xs text-slate-600 mt-1 font-mono">{bytesToHex(keyBytes)}</div>
              <div className="flex items-center gap-3 mt-3">
                <button onClick={() => { setDecrypt(!decrypt); setPlaintext(decrypt ? '' : fullOutputHex); setInspectBlock(0); }} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border font-bold text-sm transition-colors ${decrypt ? 'bg-amber-950/40 border-amber-700/50 text-amber-400' : 'bg-cyan-950/40 border-cyan-700/50 text-cyan-400'}`}>
                  {decrypt ? <Unlock size={16} /> : <Lock size={16} />}
                  {decrypt ? 'Decrypt' : 'Encrypt'}
                </button>
              </div>
            </div>
          </div>
          {/* Full output */}
          <div className="mt-4 pt-4 border-t border-slate-800">
            <span className={`${labelClass} block mb-2`}>{decrypt ? 'Decrypted Output' : 'Full Ciphertext (hex)'}</span>
            <div className="bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 font-mono text-sm text-cyan-300 break-all select-all cursor-pointer"
              onClick={() => { if (!decrypt) { setDecrypt(true); setPlaintext(fullOutputHex); setInspectBlock(0); } }}>
              {decrypt ? fullOutputText || fullOutputHex : fullOutputHex}
            </div>
            {!decrypt && <p className="text-[10px] text-slate-600 mt-1">Click to copy to decrypt mode</p>}
            {decrypt && fullOutputText && <div className="mt-1 text-xs text-slate-500 font-mono">hex: {fullOutputHex}</div>}
          </div>
          {/* Block selector for inspection */}
          {allBlocks.length > 1 && (
            <div className="mt-3 flex items-center gap-2">
              <span className={labelClass}>Inspect Block:</span>
              <div className="flex gap-1 flex-wrap">
                {allBlocks.map((_, i) => (
                  <button key={i} onClick={() => setInspectBlock(i)}
                    className={`px-2 py-1 rounded text-xs font-mono ${inspectBlock === i ? 'bg-cyan-950/50 text-cyan-400 border border-cyan-800' : 'bg-slate-800 text-slate-500 border border-slate-700 hover:text-white'}`}>
                    {i + 1}
                  </button>
                ))}
              </div>
              <span className="text-xs text-slate-600 font-mono">{bytesToHex(firstBlock)}</span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className={panelClass}>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={isRunning ? stopAnimation : runAnimation} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-950/50 border border-cyan-900/40 text-cyan-400 hover:bg-cyan-900/40 text-sm font-bold">
              {isRunning ? <Pause size={16} /> : <Play size={16} />}
              {isRunning ? 'Pause' : 'Auto Run'}
            </button>
            <button onClick={stepForward} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-sm font-bold">
              <SkipForward size={16} /> Step
            </button>
            <button onClick={reset} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-sm font-bold">
              <RotateCcw size={16} /> Reset
            </button>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-slate-500">Speed</span>
              <input type="range" min={100} max={1500} step={100} value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-24 accent-cyan-500" />
              <span className="text-xs text-slate-500 w-12">{speed}ms</span>
            </div>
            <div className="text-sm text-slate-400">
              {activeRound === null ? 'Ready' : activeRound === 0 ? 'Initial Permutation' : activeRound <= 16 ? `Round ${activeRound} / 16` : 'Final Permutation'}
            </div>
          </div>
        </div>

        {/* Main visualization: Feistel + Detail side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Feistel Network View */}
          <div className={`${panelClass} lg:col-span-1`}>
            <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-3">Feistel Network</h2>
            <div className="space-y-0.5 max-h-[600px] overflow-y-auto pr-1">
              {/* IP */}
              <div className={`flex items-center gap-2 px-2 py-1 rounded text-xs font-mono ${activeRound === 0 ? 'bg-cyan-950/50 border border-cyan-700/50 text-cyan-300' : 'text-slate-500'}`}>
                <span className="w-8 text-right text-slate-600">IP</span>
                <span>L₀={bitsToHex(result.afterIP.slice(0, 32))}</span>
                <span>R₀={bitsToHex(result.afterIP.slice(32, 64))}</span>
              </div>
              {/* Rounds */}
              {result.rounds.map((rd, i) => {
                const isActive = activeRound === i + 1;
                const isCompleted = activeRound !== null && activeRound > i + 1;
                return (
                  <button key={i} onClick={() => { stopAnimation(); setActiveRound(i + 1); }}
                    className={`w-full flex items-center gap-2 px-2 py-1 rounded text-xs font-mono text-left transition-colors ${isActive ? 'bg-cyan-950/50 border border-cyan-700/50 text-cyan-300' : isCompleted ? 'text-slate-400' : 'text-slate-600 hover:text-slate-400'}`}>
                    <span className="w-8 text-right text-slate-600">R{rd.round}</span>
                    <span className="flex-1 truncate">L={bitsToHex(rd.newR === rd.R ? rd.L : rd.R)} R={bitsToHex(rd.newR)}</span>
                  </button>
                );
              })}
              {/* FP */}
              <div className={`flex items-center gap-2 px-2 py-1 rounded text-xs font-mono ${activeRound === 17 ? 'bg-cyan-950/50 border border-cyan-700/50 text-cyan-300' : 'text-slate-500'}`}>
                <span className="w-8 text-right text-slate-600">FP</span>
                <span className="text-cyan-400 font-bold">{bitsToHex(result.outputBits)}</span>
              </div>
            </div>
          </div>

          {/* Round Detail + S-Box */}
          <div className="lg:col-span-2 space-y-6">
            {activeRoundData ? (
              <>
                {/* Round Detail */}
                <div className={panelClass}>
                  <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-3">Round {activeRoundData.round} Detail</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                    <div><span className="text-slate-500">L{activeRoundData.round - 1}:</span> <span className="text-white">{bitsToHex(activeRoundData.L)}</span></div>
                    <div><span className="text-slate-500">R{activeRoundData.round - 1}:</span> <span className="text-white">{bitsToHex(activeRoundData.R)}</span></div>
                    <div><span className="text-slate-500">E(R) 32→48:</span> <span className="text-slate-300">{bitsToHex(activeRoundData.expanded)}</span></div>
                    <div><span className="text-slate-500">K{activeRoundData.round}:</span> <span className="text-amber-400">{bitsToHex(activeRoundData.K)}</span></div>
                    <div className="md:col-span-2"><span className="text-slate-500">E(R) ⊕ K:</span> <span className="text-slate-300">{bitsToHex(activeRoundData.xorWithKey)}</span></div>
                    <div><span className="text-slate-500">S-box out 48→32:</span> <span className="text-cyan-300">{bitsToHex(activeRoundData.sboxOut)}</span></div>
                    <div><span className="text-slate-500">P-perm:</span> <span className="text-cyan-300">{bitsToHex(activeRoundData.pPermuted)}</span></div>
                    <div className="md:col-span-2"><span className="text-slate-500">new R = L ⊕ P(S(E(R) ⊕ K)):</span> <span className="text-cyan-400 font-bold">{bitsToHex(activeRoundData.newR)}</span></div>
                  </div>
                </div>

                {/* S-Box Detail */}
                <div className={panelClass}>
                  <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-3">S-Box Substitutions</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {activeRoundData.sboxDetail.map((sb, i) => (
                      <div key={i} className="bg-slate-950/50 rounded-lg p-3 border border-slate-800">
                        <div className="text-xs text-slate-500 mb-1">S{i + 1}</div>
                        <div className="text-xs font-mono space-y-0.5">
                          <div><span className="text-slate-500">in:</span> <span className="text-white">{sb.input6.join('')}</span></div>
                          <div><span className="text-slate-500">row:</span> <span className="text-amber-400">{sb.row}</span> <span className="text-slate-500 ml-1">col:</span> <span className="text-amber-400">{sb.col}</span></div>
                          <div><span className="text-slate-500">out:</span> <span className="text-cyan-400 font-bold">{sb.output4.join('')}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : activeRound === 0 ? (
              <div className={panelClass}>
                <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-3">Initial Permutation (IP)</h2>
                <div className="text-xs font-mono space-y-2">
                  <div><span className="text-slate-500">Input bits:</span> <span className="text-white">{bitsToHex(result.inputBits)}</span></div>
                  <div><span className="text-slate-500">After IP:</span> <span className="text-cyan-300">{bitsToHex(result.afterIP)}</span></div>
                  <div><span className="text-slate-500">L₀:</span> <span className="text-white">{bitsToHex(result.afterIP.slice(0, 32))}</span></div>
                  <div><span className="text-slate-500">R₀:</span> <span className="text-white">{bitsToHex(result.afterIP.slice(32, 64))}</span></div>
                </div>
                <p className="text-xs text-slate-500 mt-3">The 64-bit input is rearranged according to the IP table, then split into 32-bit left and right halves.</p>
              </div>
            ) : activeRound === 17 ? (
              <div className={panelClass}>
                <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-3">Final Permutation (FP)</h2>
                <div className="text-xs font-mono space-y-2">
                  <div><span className="text-slate-500">Before FP (R16 || L16):</span> <span className="text-white">{bitsToHex(result.beforeFP)}</span></div>
                  <div><span className="text-slate-500">After FP (output):</span> <span className="text-cyan-400 font-bold">{bitsToHex(result.outputBits)}</span></div>
                </div>
                <p className="text-xs text-slate-500 mt-3">After 16 rounds, the halves are swapped (R16 || L16) and the inverse of IP is applied to produce the final ciphertext.</p>
              </div>
            ) : (
              <div className={`${panelClass} flex items-center justify-center h-48 text-slate-600`}>
                <p className="text-sm">Press <strong className="text-cyan-500">Auto Run</strong> or <strong className="text-cyan-500">Step</strong> to visualize the Feistel rounds.</p>
              </div>
            )}

            {/* Key Schedule Toggle */}
            <div className={panelClass}>
              <button onClick={() => setShowKeySchedule(!showKeySchedule)} className="text-sm font-bold text-cyan-400 uppercase tracking-wider hover:text-cyan-300">
                {showKeySchedule ? '▾' : '▸'} Key Schedule
              </button>
              {showKeySchedule && (
                <div className="mt-3 space-y-2">
                  <div className="text-xs font-mono">
                    <span className="text-slate-500">64-bit key:</span> <span className="text-white">{bytesToHex(keyBytes)}</span>
                  </div>
                  <div className="text-xs font-mono">
                    <span className="text-slate-500">After PC-1 (56 bits):</span> <span className="text-slate-300">C₀={bitsToHex(cd[0].C)} D₀={bitsToHex(cd[0].D)}</span>
                  </div>
                  <div className="text-xs text-slate-500 mb-1">16 round keys via left-shift + PC-2:</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1 max-h-64 overflow-y-auto">
                    {roundKeys.map((k, i) => (
                      <div key={i} className={`text-xs font-mono px-2 py-1 rounded ${activeRound === i + 1 ? 'bg-cyan-950/40 text-cyan-300' : 'text-slate-500'}`}>
                        <span className="text-slate-600 w-6 inline-block">K{(i + 1).toString().padStart(2, ' ')}</span>
                        <span>{bitsToHex(k)}</span>
                        <span className="text-slate-700 ml-2">shift={SHIFT_SCHEDULE[i]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Round State Table */}
        <div className={panelClass}>
          <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-3">Round State Table</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="text-slate-500 border-b border-slate-800">
                  <th className="text-left py-1 pr-3">Round</th>
                  <th className="text-left py-1 pr-3">Lᵢ</th>
                  <th className="text-left py-1 pr-3">Rᵢ</th>
                  <th className="text-left py-1">Kᵢ</th>
                </tr>
              </thead>
              <tbody>
                <tr className="text-slate-600 border-b border-slate-900">
                  <td className="py-1 pr-3">0</td>
                  <td className="py-1 pr-3">{bitsToHex(result.afterIP.slice(0, 32))}</td>
                  <td className="py-1 pr-3">{bitsToHex(result.afterIP.slice(32, 64))}</td>
                  <td className="py-1">—</td>
                </tr>
                {result.rounds.map((rd, i) => {
                  const isActive = activeRound === i + 1;
                  return (
                    <tr key={i} className={`border-b border-slate-900 ${isActive ? 'text-cyan-300 bg-cyan-950/20' : 'text-slate-500'}`}>
                      <td className="py-1 pr-3">{rd.round}</td>
                      <td className="py-1 pr-3">{bitsToHex(rd.R)}</td>
                      <td className="py-1 pr-3">{bitsToHex(rd.newR)}</td>
                      <td className="py-1 text-amber-400/60">{bitsToHex(rd.K)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Info Panel */}
      <div className={`fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-700 p-6 transform transition-transform duration-300 z-40 ${showInfo ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="max-w-3xl mx-auto relative">
          <button onClick={() => setShowInfo(false)} className="absolute top-0 right-0 p-2 text-slate-500 hover:text-white">
            <X size={20} />
          </button>
          <h3 className="text-xl font-bold text-cyan-400 mb-2">About DES</h3>
          <div className="text-sm text-slate-300 leading-relaxed space-y-2">
            <p>
              The <strong>Data Encryption Standard (DES)</strong> was developed by IBM as <strong>Lucifer</strong> in the
              early 1970s and adopted by the U.S. National Bureau of Standards (NBS) in 1977 as FIPS 46. The NSA
              controversially reduced the key size from 128 to <strong>56 bits</strong>, raising suspicions of a
              deliberate backdoor — though the NSA also strengthened the S-boxes against differential cryptanalysis,
              a technique not publicly known until 1990.
            </p>
            <p>
              In 1998, the <strong>EFF DES Cracker</strong> ("Deep Crack") broke a DES key in 56 hours for $250,000,
              proving 56-bit keys were insufficient. <strong>Triple DES (3DES)</strong> extended the effective key
              length to 112 bits by encrypting three times with two or three keys. DES was officially superseded by
              the <strong>Advanced Encryption Standard (AES)</strong> in 2001.
            </p>
            <p>
              DES uses a <strong>Feistel network</strong> — an elegant construction where each round splits data into
              left and right halves, applies a round function <em>f</em> to the right half, XORs the result with the
              left half, then swaps. The beauty: <strong>decryption uses the exact same algorithm</strong> with round
              keys applied in reverse order. The round function need not even be invertible.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
