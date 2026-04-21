import React, { useState, useCallback, useMemo } from 'react';

// ── S-Box Data ────────────────────────────────────────────────────────────────

const S4: number[][] = [
  [0xE, 0x4, 0xD, 0x1],
  [0x2, 0xF, 0xB, 0x8],
  [0x3, 0xA, 0x6, 0xC],
  [0x5, 0x9, 0x0, 0x7],
];

const S8_FLAT: number[] = [
  0x35,0x0F,0x29,0x1A,0x3E,0x06,0x14,0x23,
  0x3B,0x18,0x02,0x2D,0x10,0x37,0x0B,0x3C,
  0x21,0x0A,0x3F,0x16,0x27,0x01,0x33,0x0C,
  0x1E,0x38,0x0D,0x2A,0x05,0x1C,0x31,0x12,
  0x2F,0x17,0x09,0x3A,0x22,0x2C,0x04,0x19,
  0x3D,0x0E,0x28,0x13,0x36,0x03,0x1F,0x2B,
  0x20,0x39,0x11,0x1D,0x07,0x30,0x2E,0x15,
  0x08,0x34,0x1B,0x26,0x00,0x24,0x32,0x25,
];
const S8: number[][] = Array.from({ length: 8 }, (_, r) => S8_FLAT.slice(r * 8, r * 8 + 8));

const AES_FLAT: number[] = [
  0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
  0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
  0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
  0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
  0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
  0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
  0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
  0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
  0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
  0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
  0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
  0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
  0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
  0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
  0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
  0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16,
];
const S16: number[][] = Array.from({ length: 16 }, (_, r) => AES_FLAT.slice(r * 16, r * 16 + 16));

// ── Inverse table builder ─────────────────────────────────────────────────────
// If S[r][c] = v (output), then S_inv at (v's hi/lo bits) = original input (r,c encoded)
function buildInverse(table: number[][], rows: number, cols: number, loBits: number): number[][] {
  const mask = (1 << loBits) - 1;
  const inv: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v     = table[r][c];
      const invR  = v >> loBits;
      const invC  = v & mask;
      inv[invR][invC] = (r << loBits) | c;
    }
  }
  return inv;
}

const S4_INV  = buildInverse(S4,  4,  4,  2);
const S8_INV  = buildInverse(S8,  8,  8,  3);
const S16_INV = buildInverse(S16, 16, 16, 4);

// ── Colors ────────────────────────────────────────────────────────────────────
const CLR = {
  bg:      '#06090d',
  surface: '#0b0f14',
  surf2:   '#0f1520',
  border:  '#1a2535',
  accent:  '#00e5ff',
  accent2: '#ff3d6b',
  accent3: '#f5c400',
  accent4: '#39ff6a',
  text:    '#c8d6e5',
  dim:     '#3d5166',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function hx(v: number, digits: number): string {
  return v.toString(16).toUpperCase().padStart(digits, '0');
}

function popcount(x: number): number {
  let n = x, count = 0;
  while (n) { count += n & 1; n >>>= 1; }
  return count;
}

// Heatmap: interpolate #0f1520 → #00c8e0 (dark to cyan)
function heatmapStyle(value: number, maxValue: number): React.CSSProperties {
  const t  = value / maxValue;
  const r  = Math.round(15  * (1 - t));
  const g  = Math.round(21  + t * 179);
  const b  = Math.round(32  + t * 192);
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return { background: `rgb(${r},${g},${b})`, color: lum > 100 ? '#000d12' : CLR.text };
}

// ── Config ────────────────────────────────────────────────────────────────────
type SBoxSize = 4 | 8 | 16;

interface SBoxConfig {
  fwdTable: number[][];
  invTable: number[][];
  rows: number;
  cols: number;
  inBits: number;
  hiBits: number;
  loBits: number;
  outBits: number;
  outMax: string;
  maxVal: number;
  hexDigits: number;
  title: string;
  sub: string;
  bannerColor: string;
  inDesc: string;
  outDesc: string;
  sideInfo: string;
  bannerStats: Array<{ l: string; v: string }>;
}

const CONFIG: Record<SBoxSize, SBoxConfig> = {
  4: {
    fwdTable: S4, invTable: S4_INV, rows: 4, cols: 4,
    inBits: 4, hiBits: 2, loBits: 2, outBits: 4, outMax: '0xF', maxVal: 15, hexDigits: 1,
    title: '4×4 S-Box — 4-bit',
    sub: '4-bit input → 4-bit output | 16 entries | values 0x0–0xF each once',
    bannerColor: CLR.accent4, inDesc: '4-BIT INPUT', outDesc: '4-BIT OUTPUT',
    sideInfo: '<strong>4-bit S-Box:</strong> Split 4-bit input into 2 high bits (row 0–3) and 2 low bits (col 0–3). Output is also 4 bits. Values 0x0–0xF, each appearing exactly once — a true bijection. Used in DES-style toy ciphers and the SPN Visualizer.',
    bannerStats: [
      { l: 'INPUT BITS',    v: '4' },
      { l: 'OUTPUT BITS',   v: '4' },
      { l: 'TABLE ENTRIES', v: '16' },
      { l: 'ROW INDEX',     v: '2 high bits (0–3)' },
      { l: 'COL INDEX',     v: '2 low bits (0–3)' },
      { l: 'OUTPUT RANGE',  v: '0x0 – 0xF' },
      { l: 'BIJECTIVE?',    v: 'YES — all 16 values unique' },
    ],
  },
  8: {
    fwdTable: S8, invTable: S8_INV, rows: 8, cols: 8,
    inBits: 6, hiBits: 3, loBits: 3, outBits: 6, outMax: '0x3F', maxVal: 63, hexDigits: 2,
    title: '8×8 S-Box — 6-bit',
    sub: '6-bit input → 6-bit output | 64 entries | values 0x00–0x3F each once',
    bannerColor: CLR.accent3, inDesc: '6-BIT INPUT', outDesc: '6-BIT OUTPUT',
    sideInfo: '<strong>6-bit S-Box:</strong> Split 6-bit input into 3 high bits (row 0–7) and 3 low bits (col 0–7). Output is also 6 bits — values <em>bounded to 0x00–0x3F</em>. Each of the 64 values appears exactly once.',
    bannerStats: [
      { l: 'INPUT BITS',    v: '6' },
      { l: 'OUTPUT BITS',   v: '6' },
      { l: 'TABLE ENTRIES', v: '64' },
      { l: 'ROW INDEX',     v: '3 high bits (0–7)' },
      { l: 'COL INDEX',     v: '3 low bits (0–7)' },
      { l: 'OUTPUT RANGE',  v: '0x00 – 0x3F  ← max is 63, not 255' },
      { l: 'BIJECTIVE?',    v: 'YES — all 64 values unique' },
    ],
  },
  16: {
    fwdTable: S16, invTable: S16_INV, rows: 16, cols: 16,
    inBits: 8, hiBits: 4, loBits: 4, outBits: 8, outMax: '0xFF', maxVal: 255, hexDigits: 2,
    title: '16×16 S-Box — AES (8-bit)',
    sub: '8-bit input → 8-bit output | 256 entries | values 0x00–0xFF each once',
    bannerColor: CLR.accent, inDesc: '8-BIT INPUT', outDesc: '8-BIT OUTPUT',
    sideInfo: '<strong>AES S-Box (full):</strong> Split 8-bit input into 4 high bits (row 0–F) and 4 low bits (col 0–F). Output is a full byte — values <em>range 0x00–0xFF</em>. Built from GF(2⁸) multiplicative inverse + affine transform. Designed to have 0 fixed points and maximum non-linearity.',
    bannerStats: [
      { l: 'INPUT BITS',    v: '8' },
      { l: 'OUTPUT BITS',   v: '8' },
      { l: 'TABLE ENTRIES', v: '256' },
      { l: 'ROW INDEX',     v: '4 high bits / high nibble (0–F)' },
      { l: 'COL INDEX',     v: '4 low bits / low nibble (0–F)' },
      { l: 'OUTPUT RANGE',  v: '0x00 – 0xFF  ← full byte range' },
      { l: 'BIJECTIVE?',    v: 'YES — all 256 values unique' },
      { l: 'CONSTRUCTION',  v: 'GF(2⁸) inverse + affine XOR' },
    ],
  },
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function SBoxApp() {
  const [size,        setSize]        = useState<SBoxSize>(4);
  const [selR,        setSelR]        = useState(-1);
  const [selC,        setSelC]        = useState(-1);
  const [showInverse, setShowInverse] = useState(false);
  const [heatmap,     setHeatmap]     = useState(false);
  const [searchStr,   setSearchStr]   = useState('');
  const [searchError, setSearchError] = useState(false);

  const c           = CONFIG[size];
  const activeTable = showInverse ? c.invTable : c.fwdTable;

  // ── Fixed-point count (cells where output === input) ─────────────────────
  const fixedPoints = useMemo(() => {
    let count = 0;
    for (let r = 0; r < c.rows; r++)
      for (let col = 0; col < c.cols; col++)
        if (activeTable[r][col] === ((r << c.loBits) | col)) count++;
    return count;
  }, [size, showInverse, activeTable, c]);

  const handleSetSize = (n: SBoxSize) => {
    setSize(n); setSelR(-1); setSelC(-1);
    setSearchStr(''); setSearchError(false);
  };

  const probe = useCallback((r: number, col: number) => {
    setSelR(r); setSelC(col);
  }, []);

  const randomProbe = useCallback(() => {
    const r   = Math.floor(Math.random() * c.rows);
    const col = Math.floor(Math.random() * c.cols);
    probe(r, col);
  }, [c, probe]);

  const handleSearch = () => {
    const raw   = searchStr.trim().replace(/^0x/i, '');
    const value = parseInt(raw, 16);
    if (isNaN(value) || value < 0 || value > c.maxVal) {
      setSearchError(true);
      return;
    }
    setSearchError(false);
    const r   = value >> c.loBits;
    const col = value & ((1 << c.loBits) - 1);
    probe(r, col);
  };

  // ── Derived probe values ──────────────────────────────────────────────────
  const hasProbe  = selR >= 0 && selC >= 0;
  const probeInV  = hasProbe ? (selR << c.loBits) | selC : null;
  const probeVal  = hasProbe ? activeTable[selR][selC] : null;
  const bitFlips  = hasProbe ? popcount(probeInV! ^ probeVal!) : null;

  // ── Cell style ────────────────────────────────────────────────────────────
  function cellStyle(r: number, col: number, v: number): React.CSSProperties {
    const base: React.CSSProperties = {
      borderColor: CLR.border,
      fontSize:    size === 16 ? '10px' : '11px',
      padding:     size === 16 ? '4px 5px' : '5px 7px',
    };
    if (r === selR && col === selC) {
      return { ...base, background: CLR.accent3, color: '#000', fontWeight: 'bold',
        boxShadow: '0 0 14px rgba(245,196,0,.5)', transform: 'scale(1.08)', zIndex: 10, position: 'relative' };
    }
    if (r === selR)   return { ...base, background: 'rgba(0,229,255,0.09)',   color: CLR.accent };
    if (col === selC) return { ...base, background: 'rgba(255,61,107,0.09)', color: CLR.accent2 };
    if (heatmap)      return { ...base, ...heatmapStyle(v, c.maxVal) };
    return base;
  }

  // ── Inverse notation helper ───────────────────────────────────────────────
  const sLabel = showInverse ? 'S⁻¹' : 'S';

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: CLR.bg, color: CLR.text, fontFamily: "'Barlow Condensed', sans-serif" }}>

      {/* ── Header ── */}
      <header className="flex-shrink-0 flex items-center gap-5 px-7 py-4 border-b" style={{ background: 'linear-gradient(90deg,#0b0f14,#080d12)', borderColor: CLR.border }}>
        <div className="font-mono text-[10px] border px-2 py-1 tracking-[2px] opacity-70" style={{ color: CLR.accent, borderColor: CLR.accent }}>S-BOX</div>
        <h1 className="text-2xl font-black tracking-[4px] uppercase text-white">
          Substitution <span style={{ color: CLR.accent }}>Lookup</span> Visualizer
        </h1>
        <div className="ml-auto text-right font-mono text-[10px] tracking-[2px] leading-loose" style={{ color: CLR.dim }}>
          CLICK ANY CELL TO PROBE<br />ROW = HIGH BITS &nbsp;|&nbsp; COL = LOW BITS
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ── */}
        <aside className="flex-shrink-0 w-64 flex flex-col gap-4 p-4 overflow-y-auto border-r" style={{ background: CLR.surface, borderColor: CLR.border }}>

          {/* Size tabs */}
          <div>
            <div className="font-mono text-[9px] tracking-[3px] uppercase mb-2" style={{ color: CLR.dim }}>S-Box Type</div>
            <div className="flex flex-col gap-1">
              {([4, 8, 16] as SBoxSize[]).map(n => {
                const active = size === n;
                const line1  = n === 4 ? '4-BIT IN → 4-BIT OUT · 16 ENTRIES' : n === 8 ? '6-BIT IN → 6-BIT OUT · 64 ENTRIES' : '8-BIT IN → 8-BIT OUT · 256 ENTRIES';
                const line2  = n === 4 ? 'ROWS 0–3 · COLS 0–3 · VALUES 0x0–0xF' : n === 8 ? 'ROWS 0–7 · COLS 0–7 · VALUES 0x00–0x3F' : 'ROWS 0–F · COLS 0–F · VALUES 0x00–0xFF';
                return (
                  <button key={n} onClick={() => handleSetSize(n)} className="text-left p-3 border transition-all"
                    style={{ background: active ? 'rgba(0,229,255,0.05)' : 'transparent', borderColor: active ? CLR.accent : CLR.border }}>
                    <div className="text-[17px] font-bold tracking-[2px]" style={{ color: active ? CLR.accent : CLR.text }}>{n} × {n}</div>
                    <div className="font-mono text-[9px] tracking-[1px] mt-1" style={{ color: active ? 'rgba(0,229,255,0.5)' : CLR.dim }}>{line1}</div>
                    <div className="font-mono text-[9px] tracking-[1px]"     style={{ color: active ? 'rgba(0,229,255,0.5)' : CLR.dim }}>{line2}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── View toggles ── */}
          <div>
            <div className="font-mono text-[9px] tracking-[3px] uppercase mb-2" style={{ color: CLR.dim }}>View Options</div>
            <div className="flex flex-col gap-1">
              <ToggleBtn
                active={showInverse}
                label="Inverse S⁻¹"
                sublabel={showInverse ? 'SHOWING DECRYPTION TABLE' : 'SHOW DECRYPTION TABLE'}
                activeColor={CLR.accent2}
                onClick={() => { setShowInverse(v => !v); setSelR(-1); setSelC(-1); }}
              />
              <ToggleBtn
                active={heatmap}
                label="Heatmap"
                sublabel={heatmap ? 'VALUES COLORED BY MAGNITUDE' : 'COLOR CELLS BY OUTPUT VALUE'}
                activeColor={CLR.accent3}
                onClick={() => setHeatmap(v => !v)}
              />
            </div>
          </div>

          {/* ── Search ── */}
          <div>
            <div className="font-mono text-[9px] tracking-[3px] uppercase mb-2" style={{ color: CLR.dim }}>
              Jump to Input
            </div>
            <div className="flex gap-1">
              <input
                type="text"
                value={searchStr}
                onChange={e => { setSearchStr(e.target.value); setSearchError(false); }}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder={size === 4 ? '0–F' : size === 8 ? '00–3F' : '00–FF'}
                maxLength={4}
                className="flex-1 font-mono text-[12px] px-2 py-1.5 border outline-none"
                style={{
                  background: '#000',
                  borderColor: searchError ? CLR.accent2 : CLR.border,
                  color: CLR.text,
                }}
              />
              <button
                onClick={handleSearch}
                className="px-2 font-mono text-[10px] border transition-all"
                style={{ background: 'transparent', borderColor: CLR.dim, color: CLR.dim }}
                onMouseEnter={e => { (e.target as HTMLButtonElement).style.borderColor = CLR.accent; (e.target as HTMLButtonElement).style.color = CLR.accent; }}
                onMouseLeave={e => { (e.target as HTMLButtonElement).style.borderColor = CLR.dim; (e.target as HTMLButtonElement).style.color = CLR.dim; }}
              >
                GO
              </button>
            </div>
            {searchError && (
              <div className="font-mono text-[9px] mt-1" style={{ color: CLR.accent2 }}>
                invalid — enter hex 0x00–0x{hx(c.maxVal, c.hexDigits)}
              </div>
            )}
          </div>

          {/* ── Probe panel ── */}
          <div>
            <div className="font-mono text-[9px] tracking-[3px] uppercase mb-2" style={{ color: CLR.dim }}>Active Probe</div>
            <div className="font-mono text-[11px] p-3 border" style={{ background: '#000', borderColor: CLR.border }}>
              {[
                { k: 'INPUT',         v: hasProbe ? `0x${hx(probeInV!,c.hexDigits)}  (${probeInV})` : '—',                           col: CLR.accent4 },
                { k: 'ROW (hi bits)', v: hasProbe ? `${hx(selR,c.hexDigits)}  [${selR.toString(2).padStart(c.hiBits,'0')}]` : '—',    col: CLR.accent },
                { k: 'COL (lo bits)', v: hasProbe ? `${hx(selC,c.hexDigits)}  [${selC.toString(2).padStart(c.loBits,'0')}]` : '—',    col: CLR.accent2 },
                { k: 'OUTPUT (hex)',  v: hasProbe ? `0x${hx(probeVal!,c.hexDigits)}` : '—',                                            col: CLR.accent3 },
                { k: 'OUTPUT (dec)',  v: hasProbe ? String(probeVal) : '—',                                                              col: CLR.text },
                { k: 'OUTPUT (bin)',  v: hasProbe ? probeVal!.toString(2).padStart(c.outBits,'0') : '—',                               col: CLR.text },
                { k: 'BIT FLIPS',     v: hasProbe ? `${bitFlips} / ${c.inBits} bits` : '—',
                  col: hasProbe ? (bitFlips! >= c.inBits * 0.4 ? CLR.accent4 : CLR.accent3) : CLR.text },
              ].map(row => (
                <div key={row.k} className="flex justify-between py-[3px] border-b last:border-0" style={{ borderColor: '#0d1520' }}>
                  <span className="text-[9px] tracking-[1px] self-center" style={{ color: CLR.dim }}>{row.k}</span>
                  <span className="text-[13px]" style={{ color: row.col }}>{row.v}</span>
                </div>
              ))}
            </div>

            {/* Arrow box */}
            <div className="mt-2 p-2 border font-mono text-[11px] text-center min-h-[60px] flex items-center justify-center leading-loose"
              style={{ borderColor: 'rgba(245,196,0,0.2)', background: 'rgba(245,196,0,0.03)', color: CLR.accent3 }}>
              {hasProbe ? (
                <span>
                  IN&nbsp;0x{hx(probeInV!,c.hexDigits)}&nbsp;→&nbsp;{sLabel}[{hx(selR,c.hexDigits)}][{hx(selC,c.hexDigits)}]<br />
                  <span style={{ color: CLR.accent }}>{selR.toString(2).padStart(c.hiBits,'0')}</span>
                  <span style={{ color: CLR.accent2 }}>{selC.toString(2).padStart(c.loBits,'0')}</span>
                  &nbsp;→&nbsp;
                  <span style={{ color: CLR.accent3 }}>0x{hx(probeVal!,c.hexDigits)}</span>
                </span>
              ) : (
                <span style={{ color: CLR.dim }}>[ click a cell ]</span>
              )}
            </div>
          </div>

          {/* Random probe */}
          <button onClick={randomProbe} className="w-full py-2 font-mono text-[10px] tracking-[2px] border transition-all"
            style={{ background: 'transparent', borderColor: CLR.dim, color: CLR.dim }}
            onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = CLR.accent4; (e.target as HTMLElement).style.color = CLR.accent4; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = CLR.dim; (e.target as HTMLElement).style.color = CLR.dim; }}>
            ⟳&nbsp;&nbsp;RANDOM PROBE
          </button>

          {/* Legend */}
          <div>
            <div className="font-mono text-[9px] tracking-[3px] uppercase mb-2" style={{ color: CLR.dim }}>Legend</div>
            <div className="flex flex-col gap-1">
              <LegendItem swatch={<div className="w-3 h-3 rounded-[2px]" style={{ background: 'rgba(0,229,255,0.15)', border: '1px solid rgba(0,229,255,.4)' }} />} label="Row highlight — high bits" />
              <LegendItem swatch={<div className="w-3 h-3 rounded-[2px]" style={{ background: 'rgba(255,61,107,0.15)', border: '1px solid rgba(255,61,107,.4)' }} />} label="Col highlight — low bits" />
              <LegendItem swatch={<div className="w-3 h-3 rounded-[2px]" style={{ background: 'rgba(245,196,0,0.7)', border: '1px solid rgba(245,196,0,.9)' }} />} label="Output — intersection" />
              {heatmap && (
                <LegendItem
                  swatch={
                    <div className="w-3 h-3 rounded-[2px] border" style={{ background: 'linear-gradient(90deg,#0f1520,#00c8e0)', borderColor: CLR.border }} />
                  }
                  label="Heatmap: 0x00 dark → max bright"
                />
              )}
            </div>
          </div>

          {/* Info callout */}
          <div className="border border-l-2 p-3 text-[12px] leading-loose" style={{ borderColor: CLR.border, borderLeftColor: showInverse ? CLR.accent2 : CLR.accent }}>
            {showInverse
              ? <span><strong>Inverse S-Box ({sLabel}):</strong> Reverses the substitution. If {sLabel.replace('⁻¹','')}(x)&nbsp;=&nbsp;y then {sLabel}(y)&nbsp;=&nbsp;x. Used during <em>decryption</em> in AES and other block ciphers.</span>
              : <span dangerouslySetInnerHTML={{ __html: c.sideInfo }} />
            }
          </div>
        </aside>

        {/* ── Main Content ── */}
        <div className="flex-1 overflow-auto p-6">

          {/* Banner — stats + fixed-point count */}
          <div className="p-3 mb-5 text-[13px] leading-loose border font-mono border-l-[3px]" style={{
            borderColor: CLR.border,
            borderLeftColor: c.bannerColor,
            background: size === 4 ? 'rgba(57,255,106,0.03)' : size === 8 ? 'rgba(245,196,0,0.03)' : 'rgba(0,229,255,0.03)',
          }}>
            <div className="flex flex-wrap gap-6">
              {c.bannerStats.map(stat => (
                <div key={stat.l} className="flex flex-col gap-0.5">
                  <div className="text-[9px] tracking-[2px]" style={{ color: CLR.dim }}>{stat.l}</div>
                  <div className="text-[15px]" style={{ color: c.bannerColor }}>{stat.v}</div>
                </div>
              ))}
              {/* Fixed-point count — dynamic */}
              <div className="flex flex-col gap-0.5">
                <div className="text-[9px] tracking-[2px]" style={{ color: CLR.dim }}>FIXED POINTS {showInverse ? '(S⁻¹)' : '(S)'}</div>
                <div className="text-[15px]" style={{ color: fixedPoints === 0 ? CLR.accent4 : CLR.accent2 }}>
                  {fixedPoints === 0 ? '0 — none (good)' : fixedPoints}
                </div>
              </div>
            </div>
          </div>

          {/* Grid header */}
          <div className="flex items-baseline gap-3 mb-4">
            <div className="text-xl font-black tracking-[3px] uppercase">
              {c.title}{showInverse ? ' — Inverse' : ''}
            </div>
            <div className="font-mono text-[10px]" style={{ color: CLR.dim }}>
              {showInverse
                ? `${sLabel}: reverses the forward substitution`
                : c.sub}
            </div>
            {heatmap && (
              <div className="ml-auto font-mono text-[9px] px-2 py-1 border" style={{ color: CLR.accent3, borderColor: 'rgba(245,196,0,0.3)', background: 'rgba(245,196,0,0.04)' }}>
                HEATMAP ON
              </div>
            )}
            {showInverse && (
              <div className="font-mono text-[9px] px-2 py-1 border" style={{ color: CLR.accent2, borderColor: 'rgba(255,61,107,0.3)', background: 'rgba(255,61,107,0.04)' }}>
                S⁻¹ ACTIVE
              </div>
            )}
          </div>

          {/* Table */}
          <div className="overflow-auto max-w-full">
            <table style={{ borderCollapse: 'collapse', fontFamily: 'Share Tech Mono, monospace' }}>
              <thead>
                <tr>
                  <td className="border p-1 text-center text-[9px] tracking-[1px]"
                    style={{ background: CLR.surf2, borderColor: CLR.border, color: CLR.dim }}>row\col</td>
                  {Array.from({ length: c.cols }, (_, col) => (
                    <th key={col} className="border text-center text-[10px] tracking-[1px] min-w-[32px]"
                      style={{
                        background:  selC === col ? 'rgba(255,61,107,0.18)' : CLR.surf2,
                        borderColor: CLR.border,
                        color:       selC === col ? '#fff' : CLR.accent2,
                        padding:     size === 16 ? '4px 5px' : '5px 7px',
                      }}>
                      {hx(col, c.hexDigits)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: c.rows }, (_, row) => (
                  <tr key={row}>
                    <th className="border text-right text-[10px] tracking-[1px] whitespace-nowrap"
                      style={{
                        background:  selR === row ? 'rgba(0,229,255,0.18)' : CLR.surf2,
                        borderColor: CLR.border,
                        color:       selR === row ? '#fff' : CLR.accent,
                        padding:     size === 16 ? '4px 10px' : '5px 12px',
                      }}>
                      {hx(row, c.hexDigits)}
                    </th>
                    {Array.from({ length: c.cols }, (_, col) => {
                      const v = activeTable[row][col];
                      return (
                        <td key={col} onClick={() => probe(row, col)}
                          className="border text-center cursor-pointer transition-colors"
                          style={cellStyle(row, col, v)}>
                          {hx(v, c.hexDigits)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Flow section */}
          <div className="mt-6 pt-5 border-t" style={{ borderColor: CLR.border }}>
            <div className="font-mono text-[9px] tracking-[3px] mb-4" style={{ color: CLR.dim }}>
              LOOKUP FLOW — CURRENT PROBE
            </div>

            {hasProbe ? (
              <>
                <div className="flex items-center flex-wrap gap-1">
                  <FlowBox label={c.inDesc} value={`0x${hx(probeInV!,c.hexDigits)}`} color={CLR.accent4} />
                  <FlowArrow />
                  <FlowBox label={`HIGH ${c.hiBits} BITS → ROW`} value={hx(selR,c.hexDigits)} color={CLR.accent} />
                  <span className="font-mono text-[20px] px-1" style={{ color: CLR.dim }}>+</span>
                  <FlowBox label={`LOW ${c.loBits} BITS → COL`} value={hx(selC,c.hexDigits)} color={CLR.accent2} />
                  <FlowArrow />
                  <FlowBox label={`${c.outDesc} · ${sLabel}[${hx(selR,c.hexDigits)}][${hx(selC,c.hexDigits)}]`}
                    value={`0x${hx(probeVal!,c.hexDigits)}`} color={CLR.accent3} large />
                  {/* Bit flips badge */}
                  <div className="border p-2 text-center font-mono min-w-[90px]"
                    style={{ borderColor: bitFlips! >= c.inBits * 0.4 ? CLR.accent4 : CLR.accent3 }}>
                    <div className="text-[8px] tracking-[2px] mb-1" style={{ color: CLR.dim }}>BIT FLIPS</div>
                    <div className="text-[17px] font-bold" style={{ color: bitFlips! >= c.inBits * 0.4 ? CLR.accent4 : CLR.accent3 }}>
                      {bitFlips} / {c.inBits}
                    </div>
                  </div>
                </div>

                {/* Input bit strip */}
                <div className="mt-4 mb-1 font-mono text-[9px] tracking-[2px]" style={{ color: CLR.dim }}>INPUT BITS</div>
                <div className="flex items-center gap-1 flex-wrap">
                  {Array.from({ length: c.inBits }, (_, i) => {
                    const bitIdx = c.inBits - 1 - i;
                    const bit    = (probeInV! >> bitIdx) & 1;
                    const isHi   = bitIdx >= c.loBits;
                    return (
                      <React.Fragment key={bitIdx}>
                        {bitIdx === c.loBits - 1 && <div className="w-[2px] h-8 opacity-40 mx-1" style={{ background: CLR.dim }} />}
                        <div className="border py-[5px] px-[9px] font-mono text-[13px] min-w-[30px] text-center"
                          style={isHi
                            ? { borderColor: 'rgba(0,229,255,.5)',   color: CLR.accent,  background: 'rgba(0,229,255,.05)'  }
                            : { borderColor: 'rgba(255,61,107,.5)', color: CLR.accent2, background: 'rgba(255,61,107,.05)' }}>
                          {bit}
                        </div>
                      </React.Fragment>
                    );
                  })}
                  <div className="font-mono text-[9px] ml-2 tracking-[1px]" style={{ color: CLR.dim }}>
                    <span style={{ color: CLR.accent }}>■ ROW bits</span>&nbsp;&nbsp;
                    <span style={{ color: CLR.accent2 }}>■ COL bits</span>
                  </div>
                </div>

                {/* Output bit strip */}
                <div className="mt-3 mb-1 font-mono text-[9px] tracking-[2px]" style={{ color: CLR.dim }}>OUTPUT BITS</div>
                <div className="flex items-center gap-1 flex-wrap">
                  {Array.from({ length: c.outBits }, (_, i) => {
                    const bitIdx  = c.outBits - 1 - i;
                    const inBit   = (probeInV! >> bitIdx) & 1;
                    const outBit  = (probeVal! >> bitIdx) & 1;
                    const flipped = inBit !== outBit;
                    return (
                      <div key={bitIdx} className="border py-[5px] px-[9px] font-mono text-[13px] min-w-[30px] text-center"
                        style={flipped
                          ? { borderColor: 'rgba(245,196,0,.6)', color: CLR.accent3, background: 'rgba(245,196,0,.05)' }
                          : { borderColor: CLR.border, color: CLR.dim }}>
                        {outBit}
                      </div>
                    );
                  })}
                  <div className="font-mono text-[9px] ml-2 tracking-[1px]" style={{ color: CLR.dim }}>
                    <span style={{ color: CLR.accent3 }}>■</span> bit changed vs input
                  </div>
                </div>
              </>
            ) : (
              <div className="border p-4 font-mono text-[13px] text-center" style={{ borderColor: CLR.dim, color: CLR.dim }}>
                WAITING — click a cell to see the lookup flow
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function ToggleBtn({ active, label, sublabel, activeColor, onClick }: {
  active: boolean; label: string; sublabel: string; activeColor: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="text-left p-3 border transition-all w-full"
      style={{ background: active ? `${activeColor}11` : 'transparent', borderColor: active ? activeColor : CLR.border }}>
      <div className="flex items-center justify-between">
        <span className="text-[15px] font-bold tracking-[1px]" style={{ color: active ? activeColor : CLR.text }}>{label}</span>
        <span className="font-mono text-[9px] px-1.5 py-0.5 border" style={{
          borderColor: active ? activeColor : CLR.dim,
          color:       active ? activeColor : CLR.dim,
          background:  active ? `${activeColor}18` : 'transparent',
        }}>{active ? 'ON' : 'OFF'}</span>
      </div>
      <div className="font-mono text-[9px] tracking-[1px] mt-0.5" style={{ color: active ? `${activeColor}99` : CLR.dim }}>{sublabel}</div>
    </button>
  );
}

function LegendItem({ swatch, label }: { swatch: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 text-[13px] tracking-[1px]" style={{ color: CLR.text }}>
      {swatch}{label}
    </div>
  );
}

function FlowBox({ label, value, color, large }: { label: string; value: string; color: string; large?: boolean }) {
  return (
    <div className="border p-2 text-center font-mono min-w-[110px]" style={{ borderColor: color }}>
      <div className="text-[8px] tracking-[2px] mb-1" style={{ color: CLR.dim }}>{label}</div>
      <div style={{ fontSize: large ? '22px' : '17px', fontWeight: 'bold', color }}>{value}</div>
    </div>
  );
}

function FlowArrow() {
  return <span className="font-mono text-[20px] px-[2px]" style={{ color: CLR.dim }}>→</span>;
}
