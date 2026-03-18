import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { RefreshCw, Info, Cpu, Play, ChevronUp, ChevronDown, Delete } from 'lucide-react';
import ConfigSlots from '../shared/ConfigSlots';
import TapeActions from '../shared/TapeActions';

// ─── Baudot / ITA2 ───────────────────────────────────────────────
const BAUDOT_MAP: Record<string, number[]> = {
  'A': [1,1,0,0,0], 'B': [1,0,0,1,1], 'C': [0,1,1,1,0], 'D': [1,0,0,1,0],
  'E': [1,0,0,0,0], 'F': [1,0,1,1,0], 'G': [0,1,0,1,1], 'H': [0,0,1,0,1],
  'I': [0,1,1,0,0], 'J': [1,1,0,1,0], 'K': [1,1,1,1,0], 'L': [0,1,0,0,1],
  'M': [0,0,1,1,1], 'N': [0,0,1,1,0], 'O': [0,0,0,1,1], 'P': [0,1,1,0,1],
  'Q': [1,1,1,0,1], 'R': [0,1,0,1,0], 'S': [1,0,1,0,0], 'T': [0,0,0,0,1],
  'U': [1,1,1,0,0], 'V': [0,1,1,1,1], 'W': [1,1,0,0,1], 'X': [1,0,1,1,1],
  'Y': [1,0,1,0,1], 'Z': [1,0,0,0,1],
  ' ': [0,0,1,0,0],
  '.': [0,0,0,0,0], '-': [0,0,0,1,0], ',': [0,1,0,0,0], '!': [1,1,0,1,1], '/': [1,1,1,1,1],
};
const REVERSE_BAUDOT: Record<string, string> = {};
for (const [ch, bits] of Object.entries(BAUDOT_MAP)) {
  REVERSE_BAUDOT[bits.join('')] = ch;
}
const VALID_CHARS = Object.keys(BAUDOT_MAP);

// ─── Wheel definitions (same as constants.ts) ────────────────────
const createPattern = (size: number, seed: number) => {
  const pattern: number[] = [];
  let s = seed;
  for (let i = 0; i < size; i++) {
    s = (s * 9301 + 49297) % 233280;
    pattern.push(s % 2);
  }
  return pattern;
};

interface WheelDef {
  id: string; label: string; type: 'Chi' | 'Mu' | 'Psi'; size: number; pattern: number[];
}

const WHEEL_DEFS: WheelDef[] = [
  { id: 'chi1', label: 'X1', type: 'Chi', size: 41, pattern: createPattern(41, 1) },
  { id: 'chi2', label: 'X2', type: 'Chi', size: 31, pattern: createPattern(31, 2) },
  { id: 'chi3', label: 'X3', type: 'Chi', size: 29, pattern: createPattern(29, 3) },
  { id: 'chi4', label: 'X4', type: 'Chi', size: 26, pattern: createPattern(26, 4) },
  { id: 'chi5', label: 'X5', type: 'Chi', size: 23, pattern: createPattern(23, 5) },
  { id: 'mu61', label: 'M61', type: 'Mu', size: 61, pattern: createPattern(61, 6) },
  { id: 'mu37', label: 'M37', type: 'Mu', size: 37, pattern: createPattern(37, 7) },
  { id: 'psi1', label: 'P1', type: 'Psi', size: 43, pattern: createPattern(43, 8) },
  { id: 'psi2', label: 'P2', type: 'Psi', size: 47, pattern: createPattern(47, 9) },
  { id: 'psi3', label: 'P3', type: 'Psi', size: 51, pattern: createPattern(51, 10) },
  { id: 'psi4', label: 'P4', type: 'Psi', size: 53, pattern: createPattern(53, 11) },
  { id: 'psi5', label: 'P5', type: 'Psi', size: 59, pattern: createPattern(59, 12) },
];

// ─── Signal tracing ──────────────────────────────────────────────
interface SignalTrace {
  inputChar: string;
  inputBits: number[];
  chiBits: number[];       // 5 bits from Chi wheels
  chiXorBits: number[];    // input XOR chi (intermediate — not real, just for viz)
  psiBits: number[];       // 5 bits from Psi wheels
  keystreamBits: number[]; // chi XOR psi
  outputBits: number[];    // input XOR keystream
  outputChar: string;
  mu61Bit: number;
  mu37Bit: number;
  psiStepped: boolean;
}

function traceSignal(char: string, positions: number[]): { trace: SignalTrace; newPositions: number[] } {
  const inputBits = BAUDOT_MAP[char];
  if (!inputBits) {
    return {
      trace: { inputChar: char, inputBits: [0,0,0,0,0], chiBits: [0,0,0,0,0], chiXorBits: [0,0,0,0,0], psiBits: [0,0,0,0,0], keystreamBits: [0,0,0,0,0], outputBits: [0,0,0,0,0], outputChar: '?', mu61Bit: 0, mu37Bit: 0, psiStepped: false },
      newPositions: [...positions],
    };
  }

  const pos = [...positions];
  // Read bits before stepping
  const chiBits = [0,1,2,3,4].map(i => WHEEL_DEFS[i].pattern[pos[i]]);
  const mu61Bit = WHEEL_DEFS[5].pattern[pos[5]];
  const mu37Bit = WHEEL_DEFS[6].pattern[pos[6]];
  const psiBits = [0,1,2,3,4].map(i => WHEEL_DEFS[7 + i].pattern[pos[7 + i]]);

  const keystreamBits = chiBits.map((c, i) => c ^ psiBits[i]);
  const outputBits = inputBits.map((b, i) => b ^ keystreamBits[i]);
  const outputChar = REVERSE_BAUDOT[outputBits.join('')] || '?';

  // Step
  // Chi always steps
  for (let i = 0; i < 5; i++) pos[i] = (pos[i] + 1) % WHEEL_DEFS[i].size;
  // Mu61 always steps
  pos[5] = (pos[5] + 1) % WHEEL_DEFS[5].size;
  // Mu37 steps if mu61 bit was 1
  if (mu61Bit === 1) pos[6] = (pos[6] + 1) % WHEEL_DEFS[6].size;
  // Psi steps if mu37 bit was 1
  const psiStepped = mu37Bit === 1;
  if (psiStepped) {
    for (let i = 7; i < 12; i++) pos[i] = (pos[i] + 1) % WHEEL_DEFS[i].size;
  }

  return {
    trace: { inputChar: char, inputBits, chiBits, chiXorBits: keystreamBits, psiBits, keystreamBits, outputBits, outputChar, mu61Bit, mu37Bit, psiStepped },
    newPositions: pos,
  };
}

// ─── SVG Visualization ──────────────────────────────────────────
const SVG_W = 900;
const SVG_H = 520;

function SignalDiagram({ trace }: { trace: SignalTrace | null }) {
  // Column positions
  const colInput = 60;
  const colChi = 230;
  const colXor1 = 400;
  const colPsi = 570;
  const colOutput = 780;
  const motorY = 420;
  const bitY = (i: number) => 70 + i * 65;

  const bitColor = (b: number) => b === 1 ? '#3b82f6' : '#334155';
  const bitTextColor = (b: number) => b === 1 ? '#fff' : '#64748b';

  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full" style={{ maxHeight: '520px' }}>
      <defs>
        <filter id="lg-glow" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Background */}
      <rect width={SVG_W} height={SVG_H} fill="#0f172a" rx="16" />

      {/* Column labels */}
      <text x={colInput} y={30} textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="700" letterSpacing="0.1em">INPUT</text>
      <text x={colChi} y={30} textAnchor="middle" fill="#3b82f6" fontSize="11" fontWeight="700" letterSpacing="0.1em">CHI (X)</text>
      <text x={colXor1} y={30} textAnchor="middle" fill="#f59e0b" fontSize="11" fontWeight="700" letterSpacing="0.1em">XOR</text>
      <text x={colPsi} y={30} textAnchor="middle" fill="#10b981" fontSize="11" fontWeight="700" letterSpacing="0.1em">PSI (P)</text>
      <text x={colOutput} y={30} textAnchor="middle" fill="#f59e0b" fontSize="11" fontWeight="700" letterSpacing="0.1em">OUTPUT</text>

      {/* 5 bit channels */}
      {[0,1,2,3,4].map(i => {
        const y = bitY(i);
        const ib = trace?.inputBits[i] ?? 0;
        const cb = trace?.chiBits[i] ?? 0;
        const pb = trace?.psiBits[i] ?? 0;
        const kb = trace?.keystreamBits[i] ?? 0;
        const ob = trace?.outputBits[i] ?? 0;
        const active = trace !== null;

        return (
          <g key={i}>
            {/* Bit channel label */}
            <text x={14} y={y + 5} fill="#475569" fontSize="10" fontWeight="600">b{i+1}</text>

            {/* Input bit */}
            <rect x={colInput - 16} y={y - 16} width={32} height={32} rx={6} fill={active ? bitColor(ib) : '#1e293b'} stroke="#334155" strokeWidth={1} />
            <text x={colInput} y={y + 5} textAnchor="middle" fill={active ? bitTextColor(ib) : '#475569'} fontSize="14" fontWeight="700">{ib}</text>

            {/* Line: input → chi */}
            <line x1={colInput + 16} y1={y} x2={colChi - 22} y2={y} stroke={active && ib ? '#3b82f680' : '#1e293b'} strokeWidth={2} />

            {/* Chi bit */}
            <rect x={colChi - 20} y={y - 16} width={40} height={32} rx={6} fill={active ? (cb ? '#1e3a5f' : '#0f172a') : '#0f172a'} stroke="#2563eb" strokeWidth={1.5} />
            <text x={colChi} y={y + 5} textAnchor="middle" fill={active ? (cb ? '#60a5fa' : '#334155') : '#475569'} fontSize="14" fontWeight="700">{cb}</text>
            <text x={colChi} y={y + 22} textAnchor="middle" fill="#1e40af" fontSize="8">{WHEEL_DEFS[i].label}</text>

            {/* Line: chi → xor */}
            <line x1={colChi + 22} y1={y} x2={colXor1 - 18} y2={y} stroke={active ? '#f59e0b40' : '#1e293b'} strokeWidth={2} />

            {/* XOR circle */}
            <circle cx={colXor1} cy={y} r={16} fill={active && kb ? '#78350f' : '#1e293b'} stroke="#f59e0b" strokeWidth={1.5} />
            <text x={colXor1} y={y + 1} textAnchor="middle" dominantBaseline="middle" fill={active ? '#fbbf24' : '#475569'} fontSize="16" fontWeight="700">{'\u2295'}</text>

            {/* Line: psi → xor */}
            <line x1={colPsi - 22} y1={y} x2={colXor1 + 18} y2={y} stroke={active ? '#10b98140' : '#1e293b'} strokeWidth={2} strokeDasharray="4 3" />

            {/* Psi bit */}
            <rect x={colPsi - 20} y={y - 16} width={40} height={32} rx={6} fill={active ? (pb ? '#064e3b' : '#0f172a') : '#0f172a'} stroke="#10b981" strokeWidth={1.5} />
            <text x={colPsi} y={y + 5} textAnchor="middle" fill={active ? (pb ? '#6ee7b7' : '#334155') : '#475569'} fontSize="14" fontWeight="700">{pb}</text>
            <text x={colPsi} y={y + 22} textAnchor="middle" fill="#047857" fontSize="8">{WHEEL_DEFS[7 + i].label}</text>

            {/* Keystream bit result label */}
            {active && (
              <text x={colXor1} y={y - 22} textAnchor="middle" fill={kb ? '#fbbf24' : '#78350f'} fontSize="10" fontWeight="600">K={kb}</text>
            )}

            {/* Line: xor → output xor */}
            <line x1={colXor1 + 18} y1={y - 10} x2={colOutput - 40} y2={y - 10} stroke="none" />

            {/* Second XOR: input XOR keystream = output */}
            {/* Line from XOR result down to output */}
            <line x1={colOutput - 40} y1={y} x2={colOutput - 18} y2={y} stroke={active ? '#f59e0b40' : '#1e293b'} strokeWidth={2} />

            {/* Output bit */}
            <rect x={colOutput - 16} y={y - 16} width={32} height={32} rx={6} fill={active ? bitColor(ob) : '#1e293b'} stroke={active && ob ? '#3b82f6' : '#334155'} strokeWidth={1.5} />
            <text x={colOutput} y={y + 5} textAnchor="middle" fill={active ? bitTextColor(ob) : '#475569'} fontSize="14" fontWeight="700">{ob}</text>

            {/* Flow arrow indicator when active */}
            {active && (
              <>
                <line x1={colInput + 20} y1={y} x2={colChi - 24} y2={y} stroke={ib ? '#3b82f650' : '#1e293b50'} strokeWidth={active ? 3 : 1} filter={ib ? 'url(#lg-glow)' : undefined} />
              </>
            )}
          </g>
        );
      })}

      {/* Motor wheels section */}
      <line x1={colPsi - 60} y1={370} x2={colPsi + 60} y2={370} stroke="#334155" strokeWidth={1} strokeDasharray="4 2" />

      {/* Motor wheel box */}
      <rect x={colChi + 60} y={motorY - 24} width={200} height={48} rx={10} fill="#1c1917" stroke="#f59e0b" strokeWidth={1.5} />
      <text x={colChi + 100} y={motorY + 5} textAnchor="middle" fill="#fbbf24" fontSize="12" fontWeight="700">M61</text>
      <rect x={colChi + 76} y={motorY - 12} width={48} height={24} rx={4} fill={trace?.mu61Bit ? '#78350f' : '#0c0a09'} stroke="#92400e" strokeWidth={1} />
      <text x={colChi + 100} y={motorY + 5} textAnchor="middle" fill={trace?.mu61Bit ? '#fbbf24' : '#57534e'} fontSize="14" fontWeight="700">{trace?.mu61Bit ?? '-'}</text>

      <text x={colChi + 160} y={motorY - 8} textAnchor="middle" fill="#92400e" fontSize="8">{trace?.mu61Bit ? 'STEPS M37' : ''}</text>
      <text x={colChi + 200} y={motorY + 5} textAnchor="middle" fill="#fbbf24" fontSize="12" fontWeight="700">M37</text>
      <rect x={colChi + 176} y={motorY - 12} width={48} height={24} rx={4} fill={trace?.mu37Bit ? '#78350f' : '#0c0a09'} stroke="#92400e" strokeWidth={1} />
      <text x={colChi + 200} y={motorY + 5} textAnchor="middle" fill={trace?.mu37Bit ? '#fbbf24' : '#57534e'} fontSize="14" fontWeight="700">{trace?.mu37Bit ?? '-'}</text>

      {/* Psi stepped indicator */}
      {trace && (
        <g>
          <text x={colPsi} y={motorY + 5} textAnchor="middle" fill={trace.psiStepped ? '#10b981' : '#334155'} fontSize="11" fontWeight="600">
            {trace.psiStepped ? 'PSI STEPPED' : 'PSI HELD'}
          </text>
          {/* Arrow from M37 to Psi label */}
          <line x1={colChi + 226} y1={motorY} x2={colPsi - 50} y2={motorY} stroke={trace.psiStepped ? '#10b981' : '#334155'} strokeWidth={1.5} markerEnd={trace.psiStepped ? undefined : undefined} strokeDasharray={trace.psiStepped ? 'none' : '4 3'} />
        </g>
      )}

      {/* Input / Output character labels */}
      {trace && (
        <>
          <rect x={colInput - 20} y={SVG_H - 60} width={40} height={36} rx={8} fill="#1e293b" stroke="#475569" strokeWidth={1} />
          <text x={colInput} y={SVG_H - 37} textAnchor="middle" fill="#e2e8f0" fontSize="18" fontWeight="700">
            {trace.inputChar === ' ' ? '\u2423' : trace.inputChar}
          </text>
          <text x={colInput} y={SVG_H - 16} textAnchor="middle" fill="#64748b" fontSize="9">PLAIN</text>

          <rect x={colOutput - 20} y={SVG_H - 60} width={40} height={36} rx={8} fill="#1e3a5f" stroke="#3b82f6" strokeWidth={1.5} />
          <text x={colOutput} y={SVG_H - 37} textAnchor="middle" fill="#60a5fa" fontSize="18" fontWeight="700">
            {trace.outputChar === ' ' ? '\u2423' : trace.outputChar}
          </text>
          <text x={colOutput} y={SVG_H - 16} textAnchor="middle" fill="#64748b" fontSize="9">CIPHER</text>
        </>
      )}

      {/* Equation */}
      <text x={SVG_W / 2} y={SVG_H - 12} textAnchor="middle" fill="#475569" fontSize="10" fontFamily="monospace">
        Output = Input XOR (Chi XOR Psi)
      </text>
    </svg>
  );
}

// ─── Mini wheel display ─────────────────────────────────────────
const WHEEL_COLORS: Record<string, { label: string; border: string; textOn: string; dot: string; dotShadow: string }> = {
  Chi:  { label: 'text-blue-400',    border: 'border-blue-800/50',    textOn: 'text-blue-300 bg-blue-950/50',    dot: 'bg-blue-500',    dotShadow: 'shadow-blue-500/50' },
  Mu:   { label: 'text-amber-400',   border: 'border-amber-800/50',   textOn: 'text-amber-300 bg-amber-950/50',  dot: 'bg-amber-500',   dotShadow: 'shadow-amber-500/50' },
  Psi:  { label: 'text-emerald-400', border: 'border-emerald-800/50', textOn: 'text-emerald-300 bg-emerald-950/50', dot: 'bg-emerald-500', dotShadow: 'shadow-emerald-500/50' },
};

function MiniWheel({ def, position, onChange }: { def: WheelDef; position: number; onChange: (delta: number) => void }) {
  const c = WHEEL_COLORS[def.type];
  const bit = def.pattern[position];
  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`text-[9px] font-bold ${c.label}`}>{def.label}</span>
      <div className={`flex flex-col items-center bg-slate-900 border ${c.border} rounded-lg overflow-hidden`}>
        <button onClick={() => onChange(-1)} className="px-2 py-0.5 hover:bg-slate-800 text-slate-500 transition-colors">
          <ChevronUp size={10} />
        </button>
        <div className={`w-10 h-7 flex items-center justify-center font-mono text-sm font-bold ${bit ? c.textOn : 'text-slate-600 bg-slate-950'}`}>
          {(position + 1).toString().padStart(2, '0')}
        </div>
        <button onClick={() => onChange(1)} className="px-2 py-0.5 hover:bg-slate-800 text-slate-500 transition-colors">
          <ChevronDown size={10} />
        </button>
      </div>
      <div className={`w-3 h-3 rounded-full ${bit ? `${c.dot} shadow-[0_0_6px] ${c.dotShadow}` : 'bg-slate-800'}`}></div>
    </div>
  );
}

// ─── Keyboard chars ─────────────────────────────────────────────
const KB_ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['Z','X','C','V','B','N','M'],
];

// ─── Main App ───────────────────────────────────────────────────
function App() {
  const [positions, setPositions] = useState<number[]>(WHEEL_DEFS.map(() => 0));
  const [trace, setTrace] = useState<SignalTrace | null>(null);
  const [history, setHistory] = useState<{ char: string; out: string }[]>([]);
  const [positionHistory, setPositionHistory] = useState<number[][]>([]);
  const [showInfo, setShowInfo] = useState(false);
  const [showBaudot, setShowBaudot] = useState(false);
  const tapeRef = useRef<HTMLDivElement>(null);

  const handleChar = useCallback((char: string) => {
    const upper = char.toUpperCase();
    if (!BAUDOT_MAP[upper]) return;
    setPositionHistory(prev => [...prev, positions]);
    const { trace: t, newPositions } = traceSignal(upper, positions);
    setTrace(t);
    setPositions(newPositions);
    setHistory(prev => [...prev, { char: upper, out: t.outputChar }]);
  }, [positions]);

  const handleBackspace = useCallback(() => {
    if (positionHistory.length === 0) return;
    setPositions(positionHistory[positionHistory.length - 1]);
    setPositionHistory(prev => prev.slice(0, -1));
    setHistory(prev => prev.slice(0, -1));
    setTrace(null);
  }, [positionHistory]);

  const handlePasteInput = useCallback((chars: string[]) => {
    let currentPositions = positions;
    const newHistoryEntries: { char: string; out: string }[] = [];
    const posHistoryBatch: number[][] = [];
    for (const char of chars) {
      const upper = char.toUpperCase();
      if (!BAUDOT_MAP[upper]) continue;
      posHistoryBatch.push(currentPositions);
      const { trace: t, newPositions } = traceSignal(upper, currentPositions);
      newHistoryEntries.push({ char: upper, out: t.outputChar });
      currentPositions = newPositions;
    }
    setPositionHistory(prev => [...prev, ...posHistoryBatch]);
    setPositions(currentPositions);
    setHistory(prev => [...prev, ...newHistoryEntries]);
    setTrace(null);
  }, [positions]);

  const handleLoadConfig = useCallback((loadedState: any) => {
    setPositions(loadedState);
    setHistory([]);
    setPositionHistory([]);
    setTrace(null);
  }, []);

  const outputText = useMemo(() => history.map(h => h.out).join(''), [history]);

  useEffect(() => {
    const isInputFocused = () => {
      const tag = document.activeElement?.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (isInputFocused()) return;
      if (e.key === 'Backspace') { e.preventDefault(); handleBackspace(); return; }
      const c = e.key === ' ' ? ' ' : e.key.toUpperCase();
      if (VALID_CHARS.includes(c) && !e.repeat && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (c === ' ') e.preventDefault();
        handleChar(c);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleChar, handleBackspace]);

  useEffect(() => {
    if (tapeRef.current) tapeRef.current.scrollLeft = tapeRef.current.scrollWidth;
  }, [history]);

  const handleReset = () => {
    setPositions(WHEEL_DEFS.map(() => 0));
    setTrace(null);
    setHistory([]);
    setPositionHistory([]);
  };

  const handleRandomize = () => {
    setPositions(WHEEL_DEFS.map(w => Math.floor(Math.random() * w.size)));
    setTrace(null);
    setHistory([]);
    setPositionHistory([]);
  };

  const handleWheelChange = (idx: number, delta: number) => {
    if (history.length > 0) return;
    setPositions(prev => {
      const next = [...prev];
      next[idx] = (next[idx] + delta + WHEEL_DEFS[idx].size) % WHEEL_DEFS[idx].size;
      return next;
    });
  };

  const displayChar = (c: string) => c === ' ' ? '\u2423' : c;

  return (
    <div className="flex-1 bg-slate-950 flex flex-col items-center justify-start py-10 px-6 text-slate-200">
      {/* Header */}
      <div className="w-full max-w-5xl flex justify-between items-center mb-8">
        <div className="flex flex-col">
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tighter">
            LORENZ <span className="text-blue-400">VISUALIZER</span>
          </h1>
          <span className="text-slate-500 text-xs tracking-[0.3em] font-mono">12-WHEEL XOR SIGNAL FLOW</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors border border-slate-700" title="About">
            <Info size={20} />
          </button>
          <button onClick={handleRandomize} className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition-all">
            <RefreshCw size={14} /> Randomize
          </button>
          <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition-all">
            Reset
          </button>
        </div>
      </div>

      {/* Config Slots */}
      <div className="w-full max-w-5xl mb-4">
        <ConfigSlots machineId="lorenz-wiring" currentState={positions} onLoadState={handleLoadConfig} accentColor="blue" />
      </div>

      <div className="w-full max-w-5xl flex flex-col gap-6">
        {/* Wheel positions */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl overflow-x-auto">
          <div className="flex justify-center gap-2 sm:gap-3 min-w-fit">
            {WHEEL_DEFS.map((def, idx) => (
              <MiniWheel key={def.id} def={def} position={positions[idx]} onChange={(d) => handleWheelChange(idx, d)} />
            ))}
          </div>
        </div>

        {/* Signal diagram */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <SignalDiagram trace={trace} />
        </div>

        {/* Keyboard */}
        <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 shadow-xl">
          <div className="flex flex-col items-center gap-1.5">
            {KB_ROWS.map((row, ri) => (
              <div key={ri} className="flex gap-1" style={{ marginLeft: ri === 1 ? '16px' : ri === 2 ? '32px' : 0 }}>
                {row.map(c => (
                  <button key={c} onClick={() => handleChar(c)} className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg font-mono text-sm font-bold bg-slate-700 text-slate-300 hover:bg-slate-600 shadow-md active:translate-y-0.5 transition-all select-none">
                    {c}
                  </button>
                ))}
              </div>
            ))}
            <div className="flex gap-1 mt-1">
              <button onClick={() => handleChar(' ')} className="w-36 sm:w-44 h-9 sm:h-10 rounded-lg font-mono text-xs font-bold bg-slate-700 text-slate-300 hover:bg-slate-600 shadow-md active:translate-y-0.5 transition-all select-none">SPACE</button>
              {['.', ',', '-', '!', '/'].map(c => (
                <button key={c} onClick={() => handleChar(c)} className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg font-mono text-sm font-bold bg-slate-700 text-slate-300 hover:bg-slate-600 shadow-md active:translate-y-0.5 transition-all select-none">{c}</button>
              ))}
              <button onClick={handleBackspace} className="h-9 sm:h-10 px-3 rounded-lg text-sm font-bold bg-slate-700 text-slate-300 hover:bg-red-900/50 hover:text-red-400 shadow-md active:translate-y-0.5 transition-all select-none" title="Backspace">
                <Delete size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Baudot Code Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <button onClick={() => setShowBaudot(!showBaudot)} className="flex items-center gap-2 w-full">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">ITA2 / Baudot Code Table</span>
            <span className="text-slate-600 text-xs">{showBaudot ? '▾' : '▸'}</span>
          </button>
          {showBaudot && (
            <div className="mt-4 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {Object.entries(BAUDOT_MAP).map(([ch, bits]) => {
                const isActive = trace?.inputChar === ch || trace?.outputChar === ch;
                return (
                  <div key={ch} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border ${
                    isActive ? 'bg-blue-950/40 border-blue-700/50' : 'bg-slate-800/40 border-slate-800/50'
                  }`}>
                    <span className={`font-mono font-bold text-sm w-5 text-center ${isActive ? 'text-blue-300' : 'text-slate-300'}`}>
                      {ch === ' ' ? '\u2423' : ch}
                    </span>
                    <div className="flex gap-px">
                      {bits.map((b, i) => (
                        <span key={i} className={`w-3.5 h-5 flex items-center justify-center text-[9px] font-mono font-bold rounded-sm ${
                          b ? (isActive ? 'bg-blue-600 text-white' : 'bg-slate-600 text-slate-200') : (isActive ? 'bg-slate-700 text-slate-400' : 'bg-slate-900 text-slate-600')
                        }`}>{b}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tape */}
        {history.length > 0 && (
          <div className="bg-[#fdf6e3] rounded-xl p-3 shadow-inner border border-amber-200/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-amber-800/50 uppercase tracking-wider">History</span>
                <span className="text-[10px] font-mono text-amber-800/30">{history.length} chars</span>
              </div>
              <TapeActions outputText={outputText} onProcessInput={handlePasteInput} accentColor="blue" validPattern={/[A-Z .,!\-\/]/} />
            </div>
            <div ref={tapeRef} className="overflow-x-auto whitespace-nowrap pb-1">
              <div className="flex gap-0.5">
                {history.map((h, i) => (
                  <div key={i} className="flex flex-col items-center flex-shrink-0">
                    <span className="text-[9px] font-mono text-amber-700/40">{displayChar(h.char)}</span>
                    <div className="w-7 h-8 flex items-center justify-center font-mono text-sm font-bold text-amber-900 border-r border-amber-200/30 last:border-r-0">
                      {displayChar(h.out)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info panel */}
      <div className={`fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-700 p-6 transform transition-transform duration-300 z-40 ${showInfo ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="max-w-3xl mx-auto relative">
          <button onClick={() => setShowInfo(false)} className="absolute top-0 right-0 p-2 text-slate-500 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <h3 className="text-xl font-bold text-blue-400 mb-2">Lorenz Signal Flow</h3>
          <p className="text-sm text-slate-300 mb-3 leading-relaxed">
            Each character is encoded as <strong>5 ITA2/Baudot bits</strong>. The Lorenz produces a 5-bit keystream by
            XORing the outputs of the <strong>Chi</strong> and <strong>Psi</strong> wheel groups. The plaintext is then XORed
            with this keystream to produce ciphertext. The process is perfectly symmetrical.
          </p>
          <p className="text-sm text-slate-300 leading-relaxed">
            The <strong>Motor wheels</strong> (M61 and M37) control whether the Psi wheels step on each character.
            M61 always steps. If M61's current bit is 1, M37 also steps. If M37's current bit is 1, all Psi wheels step.
            This irregular stepping creates the complex, hard-to-predict keystream that made Lorenz so difficult to break.
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
