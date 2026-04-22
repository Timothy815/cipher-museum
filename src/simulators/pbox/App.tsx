import React, { useState, useMemo } from 'react';

// ─── Permutation Data ────────────────────────────────────────────────
// Convention: perm[outIdx] = inIdx  (0-indexed)
// "Output bit at position outIdx comes from input bit at position inIdx"

const DES_P_RAW  = [16,7,20,21,29,12,28,17,1,15,23,26,5,18,31,10,2,8,24,14,32,27,3,9,19,13,30,6,22,11,4,25];
const DES_E_RAW  = [32,1,2,3,4,5,4,5,6,7,8,9,8,9,10,11,12,13,12,13,14,15,16,17,16,17,18,19,20,21,20,21,22,23,24,25,24,25,26,27,28,29,28,29,30,31,32,1];
const DES_IP_RAW = [58,50,42,34,26,18,10,2,60,52,44,36,28,20,12,4,62,54,46,38,30,22,14,6,64,56,48,40,32,24,16,8,57,49,41,33,25,17,9,1,59,51,43,35,27,19,11,3,61,53,45,37,29,21,13,5,63,55,47,39,31,23,15,7];
// AES ShiftRows: out[i] = in[perm[i]], column-major state
const AES_SR     = [0,5,10,15,4,9,14,3,8,13,2,7,12,1,6,11];

const r1 = (arr: number[]) => arr.map(x => x - 1);

interface PBoxDef {
  id: string;
  label: string;
  cipher: string;
  inBits: number;
  outBits: number;
  perm: number[];
  description: string;
  unitLabel: string; // 'bit' or 'byte'
}

const PBOXES: PBoxDef[] = [
  {
    id: 'des-p',
    label: 'DES P',
    cipher: 'DES',
    inBits: 32, outBits: 32,
    perm: r1(DES_P_RAW),
    unitLabel: 'bit',
    description:
      'The 32-bit straight permutation applied to the S-box output in every DES round. ' +
      'Designed so each of the 8 S-box output bits feeds a different S-box in the next round — ' +
      'achieving maximum diffusion across rounds.',
  },
  {
    id: 'des-e',
    label: 'DES E',
    cipher: 'DES',
    inBits: 32, outBits: 48,
    perm: r1(DES_E_RAW),
    unitLabel: 'bit',
    description:
      'The DES expansion permutation: 32 input bits → 48 output bits. ' +
      '16 boundary bits are duplicated so each S-box receives 6 bits (4 unique + 2 shared with neighbours). ' +
      'This allows XOR with the 48-bit round key before S-box substitution.',
  },
  {
    id: 'des-ip',
    label: 'DES IP',
    cipher: 'DES',
    inBits: 64, outBits: 64,
    perm: r1(DES_IP_RAW),
    unitLabel: 'bit',
    description:
      'The DES Initial Permutation (IP): a 64-bit fixed permutation applied before round 1, ' +
      'undone by IP⁻¹ after the final round. Provides no cryptographic strength — included ' +
      'for byte-alignment efficiency in 1970s hardware. The IP scatters adjacent bits widely ' +
      'across the state.',
  },
  {
    id: 'aes-sr',
    label: 'AES ShiftRows',
    cipher: 'AES',
    inBits: 16, outBits: 16,
    perm: AES_SR,
    unitLabel: 'byte',
    description:
      'AES ShiftRows viewed as a byte-level permutation on the 16-byte state (column-major layout). ' +
      'Row 0: no shift. Row 1: left 1. Row 2: left 2. Row 3: left 3. ' +
      'Guarantees that after MixColumns, every column contains bytes from all four original columns — ' +
      'the critical inter-column diffusion step.',
  },
];

// ─── Color ───────────────────────────────────────────────────────────

function wireHsl(inIdx: number, outIdx: number, maxBits: number): string {
  const disp = outIdx - inIdx;
  if (disp === 0) return '130,70%,60%';
  const mag = Math.abs(disp) / (maxBits - 1); // 0→1
  if (disp > 0) {
    const hue = Math.round(200 - mag * 200);
    return `${hue},80%,62%`;
  } else {
    const hue = Math.round(45 - mag * 45);
    return `${hue},85%,62%`;
  }
}

// ─── Main Component ───────────────────────────────────────────────────

const PBoxApp: React.FC = () => {
  const [activeId, setActiveId]       = useState('des-p');
  const [hovered,  setHovered]        = useState<number | null>(null);
  const [selected, setSelected]       = useState<number | null>(null);
  const [hexInput, setHexInput]       = useState('');

  const pb = PBOXES.find(p => p.id === activeId)!;
  const focus = selected ?? hovered;

  // Parse hex input → input bit array
  const inBits: (0 | 1)[] | null = useMemo(() => {
    const hex = hexInput.replace(/\s/g, '').toUpperCase();
    const needed = Math.ceil(pb.inBits / 4);
    if (hex.length < needed || /[^0-9A-F]/.test(hex.slice(0, needed))) return null;
    const bits: (0 | 1)[] = [];
    for (let i = 0; i < pb.inBits; i++) {
      const nib = parseInt(hex[Math.floor(i / 4)], 16);
      bits.push(((nib >> (3 - (i % 4))) & 1) as 0 | 1);
    }
    return bits;
  }, [hexInput, pb.inBits]);

  const outBitsArr: (0 | 1)[] | null = useMemo(
    () => inBits ? pb.perm.map(src => inBits[src]) : null,
    [inBits, pb.perm],
  );

  // Stats
  const stats = useMemo(() => {
    const disps = pb.perm.map((src, dst) => Math.abs(dst - src));
    const fixed = disps.filter(d => d === 0).length;
    const maxD  = Math.max(...disps);
    const avgD  = disps.reduce((a, b) => a + b, 0) / disps.length;
    // Duplicate source bits (for expansion P-boxes)
    const srcCount = new Map<number, number>();
    pb.perm.forEach(s => srcCount.set(s, (srcCount.get(s) ?? 0) + 1));
    const duplicated = [...srcCount.values()].filter(c => c > 1).length;
    return { fixed, maxD, avgD: avgD.toFixed(1), duplicated };
  }, [pb]);

  // SVG geometry
  const PAD = 28;
  const svgW = Math.max(pb.inBits, pb.outBits) * (pb.inBits <= 32 ? 21 : pb.inBits <= 48 ? 16 : 11) + PAD * 2;
  const svgH = 200;
  const topY = 36, botY = 164;
  const inScale  = (svgW - PAD * 2) / pb.inBits;
  const outScale = (svgW - PAD * 2) / pb.outBits;
  const ix = (i: number) => PAD + (i + 0.5) * inScale;
  const ox = (o: number) => PAD + (o + 0.5) * outScale;
  const midY = (topY + botY) / 2;

  // Which input index is highlighted (from output-side focus)
  const focusSrc = focus !== null ? pb.perm[focus] : null;

  function toggleSelect(o: number) {
    setSelected(s => (s === o ? null : o));
    setHovered(null);
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950 text-slate-200"
         style={{ fontFamily: "'Share Tech Mono', monospace" }}>

      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-5 pb-3 border-b border-slate-800 bg-slate-900/60">
        <h1 className="text-xl font-bold tracking-wide text-white">P-Box Permutation Explorer</h1>
        <p className="text-xs text-slate-400 mt-1">
          Trace how block ciphers route input bits to output positions — diffusion in action
        </p>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 flex border-b border-slate-800 bg-slate-900/40">
        {PBOXES.map(p => (
          <button key={p.id}
            onClick={() => { setActiveId(p.id); setSelected(null); setHovered(null); setHexInput(''); }}
            className={`px-5 py-3 text-xs font-bold transition-colors border-b-2 ${
              activeId === p.id
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            {p.label}
            <span className="ml-1.5 text-[10px] opacity-50">{p.cipher}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto flex flex-col lg:flex-row gap-4 p-4">

        {/* ── Left: SVG panel ── */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">

          {/* Hex input */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-900/60 rounded-xl border border-slate-700 px-4 py-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Input Hex</span>
            <input
              value={hexInput}
              onChange={e => setHexInput(e.target.value)}
              placeholder={`${Math.ceil(pb.inBits / 4)} hex digits`}
              maxLength={Math.ceil(pb.inBits / 4)}
              className="flex-1 min-w-0 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-amber-300 placeholder-slate-600 outline-none focus:border-amber-600"
              spellCheck={false}
            />
            {inBits
              ? <span className="text-[10px] text-green-400 font-mono">✓ {pb.inBits} {pb.unitLabel}s</span>
              : hexInput && <span className="text-[10px] text-red-400">needs {Math.ceil(pb.inBits/4)} hex digits</span>
            }
            <button
              onClick={() => {
                const bytes = Math.ceil(pb.inBits / 8);
                const arr = new Uint8Array(bytes);
                crypto.getRandomValues(arr);
                setHexInput(Array.from(arr).map(b => b.toString(16).padStart(2,'0')).join('').slice(0, Math.ceil(pb.inBits/4)).toUpperCase());
              }}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-[10px] font-bold text-slate-300 transition-colors"
            >
              RANDOM
            </button>
          </div>

          {/* Row labels */}
          <div className="flex justify-between text-[10px] font-mono text-slate-500 uppercase tracking-widest px-1">
            <span>Input ({pb.inBits} {pb.unitLabel}s)</span>
            <span>{pb.inBits !== pb.outBits ? `Output (${pb.outBits} ${pb.unitLabel}s)` : `Output (${pb.outBits} ${pb.unitLabel}s)`}</span>
          </div>

          {/* SVG wire diagram */}
          <div className="bg-slate-900/60 rounded-xl border border-slate-700 overflow-x-auto">
            <svg
              viewBox={`0 0 ${svgW} ${svgH}`}
              width="100%"
              style={{ minWidth: `${Math.min(svgW, 900)}px` }}
            >
              {/* All wires — dim when something is focused */}
              {pb.perm.map((src, dst) => {
                const active = focus === dst;
                const dimmed = focus !== null && !active;
                const hsl = wireHsl(src, dst, Math.max(pb.inBits, pb.outBits));
                return (
                  <path key={dst}
                    d={`M ${ix(src)} ${topY + 14} C ${ix(src)} ${midY}, ${ox(dst)} ${midY}, ${ox(dst)} ${botY - 14}`}
                    stroke={`hsla(${hsl},${dimmed ? 0.08 : active ? 1 : 0.35})`}
                    strokeWidth={active ? 2.5 : dimmed ? 0.5 : 1}
                    fill="none"
                    style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
                    onMouseEnter={() => setHovered(dst)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => toggleSelect(dst)}
                  />
                );
              })}

              {/* Input bit boxes */}
              {Array.from({ length: pb.inBits }, (_, i) => {
                const x = ix(i);
                const lit  = focusSrc === i;
                const val  = inBits ? inBits[i] : null;
                const lbl  = val !== null ? String(val) : (pb.inBits <= 48 ? String(i) : i % 8 === 0 ? String(i) : '');
                return (
                  <g key={i}>
                    <rect x={x - 9} y={topY - 14} width={18} height={15} rx={2}
                      fill={lit ? '#78350f' : '#0f172a'}
                      stroke={lit ? '#f59e0b' : '#334155'} strokeWidth={lit ? 1.5 : 0.6} />
                    <text x={x} y={topY - 3} textAnchor="middle"
                      fontSize={val !== null ? 9 : pb.inBits <= 32 ? 8 : 6}
                      fill={lit ? '#fbbf24' : val !== null ? (val ? '#34d399' : '#64748b') : '#64748b'}
                      fontFamily="monospace" fontWeight={lit ? 'bold' : 'normal'}
                    >{lbl}</text>
                  </g>
                );
              })}

              {/* Output bit boxes */}
              {Array.from({ length: pb.outBits }, (_, o) => {
                const x   = ox(o);
                const lit = focus === o;
                const val = outBitsArr ? outBitsArr[o] : null;
                const lbl = val !== null ? String(val) : (pb.outBits <= 48 ? String(o) : o % 8 === 0 ? String(o) : '');
                return (
                  <g key={o} style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHovered(o)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => toggleSelect(o)}
                  >
                    <rect x={x - 9} y={botY - 1} width={18} height={15} rx={2}
                      fill={lit ? '#0c2a4a' : '#0f172a'}
                      stroke={lit ? '#38bdf8' : '#334155'} strokeWidth={lit ? 1.5 : 0.6} />
                    <text x={x} y={botY + 10} textAnchor="middle"
                      fontSize={val !== null ? 9 : pb.outBits <= 48 ? 8 : 6}
                      fill={lit ? '#7dd3fc' : val !== null ? (val ? '#34d399' : '#64748b') : '#64748b'}
                      fontFamily="monospace" fontWeight={lit ? 'bold' : 'normal'}
                    >{lbl}</text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Active wire callout */}
          {focus !== null ? (
            <div className="bg-slate-900/60 rounded-xl border border-amber-800/40 px-4 py-3 flex flex-wrap items-center gap-3 text-sm">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Selected Wire</span>
              <span className="text-amber-400 font-bold font-mono">out[{focus}]</span>
              <span className="text-slate-500">←</span>
              <span className="text-cyan-400 font-bold font-mono">in[{pb.perm[focus]}]</span>
              <span className="text-slate-400 text-xs ml-2">
                displacement {pb.perm[focus] - focus > 0 ? '+' : ''}{pb.perm[focus] - focus}
                {pb.perm[focus] === focus ? ' · fixed point' : ''}
                {pb.id === 'des-e' && pb.perm.filter(v => v === pb.perm[focus]).length > 1 ? ' · duplicated bit' : ''}
              </span>
              <button onClick={() => setSelected(null)} className="ml-auto text-[10px] text-slate-600 hover:text-slate-400 font-mono">CLEAR ×</button>
            </div>
          ) : (
            <div className="text-center text-[11px] text-slate-600 font-mono">
              hover or click a wire / output box to trace it
            </div>
          )}
        </div>

        {/* ── Right: Sidebar ── */}
        <div className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-3">

          {/* Description */}
          <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4">
            <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2">
              {pb.label} — {pb.cipher}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">{pb.description}</p>
          </div>

          {/* Stats */}
          <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Stats</div>
            <div className="space-y-2.5">
              {[
                ['Mapping',       `${pb.inBits} → ${pb.outBits} ${pb.unitLabel}s`],
                ['Fixed Points',  stats.fixed === 0 ? '0 ✓' : String(stats.fixed)],
                ['Max Displacement', String(stats.maxD)],
                ['Avg Displacement', stats.avgD],
                ...(pb.id === 'des-e' ? [['Duplicated Inputs', String(stats.duplicated)]] : []),
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs">
                  <span className="text-slate-400">{k}</span>
                  <span className={`font-mono font-bold ${
                    k === 'Fixed Points' && stats.fixed === 0 ? 'text-green-400' :
                    k === 'Duplicated Inputs' ? 'text-purple-400' :
                    'text-cyan-400'
                  }`}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Permutation table */}
          <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
              Permutation Table <span className="text-slate-600 normal-case font-normal">(out→in)</span>
            </div>
            <div className={`grid gap-0.5 text-[10px] font-mono max-h-56 overflow-y-auto ${pb.outBits <= 32 ? 'grid-cols-4' : pb.outBits <= 48 ? 'grid-cols-6' : 'grid-cols-8'}`}>
              {pb.perm.map((src, dst) => (
                <div key={dst}
                  style={{ cursor: 'pointer' }}
                  className={`flex gap-0.5 px-1 py-0.5 rounded transition-colors ${
                    focus === dst ? 'bg-amber-900/40 text-amber-300' : 'hover:bg-slate-800 text-slate-400'
                  }`}
                  onMouseEnter={() => setHovered(dst)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => toggleSelect(dst)}
                >
                  <span className="text-slate-600">{dst}→</span>
                  <span>{src}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Wire Color Legend</div>
            <div className="space-y-2">
              {[
                ['hsl(130,70%,60%)', 'Fixed point (no move)'],
                ['hsl(200,80%,62%)', 'Shifts right (small)'],
                ['hsl(0,80%,62%)',   'Shifts right (large)'],
                ['hsl(45,85%,62%)',  'Shifts left (small)'],
                ['hsl(0,85%,62%)',   'Shifts left (large)'],
              ].map(([color, label]) => (
                <div key={label} className="flex items-center gap-2.5 text-xs">
                  <div className="w-10 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                  <span className="text-slate-400">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PBoxApp;
