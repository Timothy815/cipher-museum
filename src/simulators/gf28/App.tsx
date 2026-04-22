import React, { useState, useMemo } from 'react';

// ── GF(2⁸) Core Mathematics ───────────────────────────────────────────────────
// Irreducible polynomial: x⁸ + x⁴ + x³ + x + 1  (0x11B)
// When bit 7 overflows after doubling, XOR with 0x1B (drop the x⁸ term)

function gfMul(a: number, b: number): number {
  let p = 0, hi: number;
  for (let i = 0; i < 8; i++) {
    if (b & 1) p ^= a;
    hi = a & 0x80;
    a  = (a << 1) & 0xFF;
    if (hi) a ^= 0x1B;
    b >>= 1;
  }
  return p;
}

interface GFStep {
  i: number;
  bBit: number;      // b's LSB at this step
  aIn: number;       // a entering this step
  aOut: number;      // a after doubling/reduction
  reduced: boolean;  // was 0x1B reduction applied?
  contrib: number;   // contribution to accumulator (aIn if bBit=1 else 0)
  accAfter: number;  // accumulator after this step
}

function gfMulSteps(a: number, b: number): GFStep[] {
  const steps: GFStep[] = [];
  let acc = 0, cur = a, bv = b;
  for (let i = 0; i < 8; i++) {
    const bit    = bv & 1;
    const contrib = bit ? cur : 0;
    const newAcc = acc ^ contrib;
    const hi     = cur & 0x80;
    const aOut   = ((cur << 1) & 0xFF) ^ (hi ? 0x1B : 0);
    steps.push({ i, bBit: bit, aIn: cur, aOut, reduced: !!hi, contrib, accAfter: newAcc });
    acc = newAcc; cur = aOut; bv >>= 1;
  }
  return steps;
}

// Precompute full multiplication table
const MUL = new Uint8Array(256 * 256);
for (let a = 0; a < 256; a++)
  for (let b = 0; b < 256; b++)
    MUL[a * 256 + b] = gfMul(a, b);

// Powers of generator 0x03: POW3[k] = 0x03^k
const POW3 = new Uint8Array(256);
POW3[0] = 1;
for (let k = 1; k < 256; k++) POW3[k] = gfMul(POW3[k - 1], 3);
// POW3[255] = 1 = POW3[0]  (field has order 255)

// Discrete log base 0x03: DLOG3[v] = k  (−1 for v=0)
const DLOG3 = new Int16Array(256).fill(-1);
for (let k = 0; k < 255; k++) DLOG3[POW3[k]] = k;

// ── Helpers ───────────────────────────────────────────────────────────────────
const hx  = (v: number, d = 2) => v.toString(16).toUpperCase().padStart(d, '0');
const SUP = ['⁰','¹','²','³','⁴','⁵','⁶','⁷'];

function toPolyStr(v: number): string {
  if (v === 0) return '0';
  const terms: string[] = [];
  for (let i = 7; i >= 0; i--) {
    if (!((v >> i) & 1)) continue;
    if      (i === 0) terms.push('1');
    else if (i === 1) terms.push('x');
    else              terms.push(`x${SUP[i]}`);
  }
  return terms.join(' ⊕ ');
}

function parseHex(s: string): number | null {
  const v = parseInt(s.trim().replace(/^0x/i, ''), 16);
  return isNaN(v) || v < 0 || v > 255 ? null : v;
}

// ── Colors ────────────────────────────────────────────────────────────────────
const C = {
  bg:      '#0a0e1a',
  surf:    '#0f1428',
  surf2:   '#151b35',
  border:  '#252d52',
  v1:      '#c084fc',   // violet-400  — primary
  v2:      '#a78bfa',   // violet-300  — secondary
  cyan:    '#67e8f9',   // result/output
  green:   '#4ade80',   // contributing steps
  orange:  '#fb923c',   // reduction
  text:    '#e2d9f3',
  dim:     '#5b5280',
};

// Heatmap for table cells: #151b35 → #c084fc
function hmStyle(v: number): React.CSSProperties {
  const t = v / 255;
  const r = Math.round(21  + t * 171);
  const g = Math.round(27  + t * 105);
  const b = Math.round(53  + t * 252 * 0.9);
  const lum = 0.299*r + 0.587*g + 0.114*b;
  return { background: `rgb(${r},${g},${b})`, color: lum > 90 ? '#000' : C.text };
}

// ── Sub-components ────────────────────────────────────────────────────────────
function BitRow({ v, bits = 8, hiColor = C.v1, loColor = C.dim }: {
  v: number; bits?: number; hiColor?: string; loColor?: string;
}) {
  return (
    <div className="flex gap-[3px]">
      {Array.from({ length: bits }, (_, i) => {
        const bi = bits - 1 - i, set = (v >> bi) & 1;
        return (
          <div key={bi} className="w-5 h-5 flex items-center justify-center font-mono text-[11px] border"
            style={{ background: set ? `${hiColor}22` : 'transparent',
                     borderColor: set ? `${hiColor}88` : C.border,
                     color: set ? hiColor : C.dim }}>
            {set}
          </div>
        );
      })}
    </div>
  );
}

function SLabel({ children, color = C.v1 }: { children: React.ReactNode; color?: string }) {
  return <span className="font-mono text-[9px] tracking-[2px] uppercase" style={{ color }}>{children}</span>;
}

function Panel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border p-4 flex flex-col gap-3" style={{ borderColor: C.border, background: C.surf }}>
      <SLabel>{label}</SLabel>
      {children}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
type Mode = 'multiply' | 'table' | 'powers';

export default function GF28App() {
  const [mode,       setMode]       = useState<Mode>('multiply');
  // Multiply
  const [hexA,       setHexA]       = useState('57');
  const [hexB,       setHexB]       = useState('83');
  // Table
  const [mulConst,   setMulConst]   = useState(2);
  const [mulConstStr,setMulConstStr]= useState('02');
  const [mulConstErr,setMulConstErr]= useState(false);
  const [tblProbe,   setTblProbe]   = useState(-1);   // input value 0-255
  // Powers
  const [powProbe,   setPowProbe]   = useState(-1);   // exponent k 0-254
  const [powSearch,  setPowSearch]  = useState('');
  const [powSearchErr,setPowSearchErr] = useState(false);

  // ── Multiply derived ──────────────────────────────────────────────────────
  const aVal    = useMemo(() => parseHex(hexA), [hexA]);
  const bVal    = useMemo(() => parseHex(hexB), [hexB]);
  const validAB = aVal !== null && bVal !== null;
  const steps   = useMemo(() => validAB ? gfMulSteps(aVal!, bVal!) : [], [aVal, bVal, validAB]);
  const result  = validAB ? MUL[aVal! * 256 + bVal!] : null;
  const contributions = steps.filter(s => s.bBit === 1);

  // ── Multiplier const input ────────────────────────────────────────────────
  const applyMulConst = () => {
    const v = parseHex(mulConstStr);
    if (v === null) { setMulConstErr(true); return; }
    setMulConstErr(false); setMulConst(v);
  };

  // ── Powers search ─────────────────────────────────────────────────────────
  const doPowSearch = () => {
    const v = parseHex(powSearch);
    if (v === null || v === 0) { setPowSearchErr(true); return; }
    const k = DLOG3[v];
    if (k === -1) { setPowSearchErr(true); return; }
    setPowSearchErr(false); setPowProbe(k);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden font-sans"
      style={{ background: C.bg, color: C.text }}>

      {/* ── Header ── */}
      <header className="flex-shrink-0 flex items-center gap-5 px-7 py-3 border-b"
        style={{ background: `linear-gradient(90deg,${C.surf},${C.bg})`, borderColor: C.border }}>
        <div className="font-mono text-[10px] border px-2 py-1 tracking-[2px] opacity-70"
          style={{ color: C.v1, borderColor: C.v1 }}>GF(2⁸)</div>
        <h1 className="text-2xl font-black tracking-[3px] uppercase text-white">
          Galois Field <span style={{ color: C.v1 }}>Arithmetic</span> Explorer
        </h1>
        <div className="ml-auto font-mono text-[10px] tracking-[2px] leading-loose text-right" style={{ color: C.dim }}>
          IRREDUCIBLE POLY: x⁸ + x⁴ + x³ + x + 1 &nbsp;(0x11B)<br />
          REDUCTION CONST: x⁴ + x³ + x + 1 &nbsp;(0x1B)
        </div>
      </header>

      {/* ── Mode Tabs ── */}
      <div className="flex-shrink-0 flex gap-0 border-b" style={{ borderColor: C.border, background: C.surf }}>
        {([['multiply','MULTIPLY','Step-by-step a × b in GF(2⁸)'],
           ['table',   'FIELD TABLE','All products for a fixed constant'],
           ['powers',  'GENERATOR POWERS','0x03^k cycling through all 255 non-zero elements'],
          ] as [Mode,string,string][]).map(([m,lbl,sub])=>(
          <button key={m} onClick={()=>setMode(m)}
            className="px-6 py-3 border-r text-left transition-all"
            style={{ borderColor: C.border,
                     background: mode===m ? `${C.v1}12` : 'transparent',
                     borderBottom: mode===m ? `2px solid ${C.v1}` : '2px solid transparent' }}>
            <div className="font-bold text-[13px] tracking-[2px]" style={{ color: mode===m ? C.v1 : C.text }}>{lbl}</div>
            <div className="font-mono text-[9px] tracking-[1px]" style={{ color: mode===m ? `${C.v1}80` : C.dim }}>{sub}</div>
          </button>
        ))}
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ────────── LEFT PANEL ────────── */}
        <div className="flex-shrink-0 w-[340px] flex flex-col gap-4 p-5 overflow-y-auto border-r"
          style={{ borderColor: C.border, background: C.surf }}>

          {/* ── MULTIPLY: inputs ── */}
          {mode === 'multiply' && (
            <>
              <Panel label="Operands">
                <div className="flex flex-col gap-3">
                  {([['A', hexA, setHexA, aVal], ['B', hexB, setHexB, bVal]] as
                     [string, string, React.Dispatch<React.SetStateAction<string>>, number|null][]).map(([name,val,setter,parsed])=>(
                    <div key={name}>
                      <div className="flex items-center gap-2 mb-1">
                        <SLabel color={name==='A'?C.v1:C.v2}>{name}</SLabel>
                        <div className="font-mono text-[10px]" style={{color:C.dim}}>
                          {parsed !== null ? `= ${toPolyStr(parsed)}` : 'invalid hex'}
                        </div>
                      </div>
                      <div className="flex gap-2 items-center">
                        <span className="font-mono text-[12px]" style={{color:C.dim}}>0x</span>
                        <input value={val} onChange={e=>setter(e.target.value.toUpperCase())} maxLength={2}
                          className="w-14 font-mono text-[18px] font-bold px-2 py-1 border outline-none text-center"
                          style={{background:'#000', borderColor: parsed!==null?C.border:C.orange, color:name==='A'?C.v1:C.v2}}/>
                        {parsed !== null && <BitRow v={parsed} hiColor={name==='A'?C.v1:C.v2}/>}
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              {validAB && (
                <Panel label="Result">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-mono text-[10px] mb-1" style={{color:C.dim}}>
                        0x{hx(aVal!)} × 0x{hx(bVal!)} =
                      </div>
                      <div className="font-mono text-[32px] font-black" style={{color:C.cyan}}>
                        0x{hx(result!)}
                      </div>
                      <div className="font-mono text-[10px] mt-1" style={{color:C.dim}}>
                        = {toPolyStr(result!)}
                      </div>
                    </div>
                    <BitRow v={result!} hiColor={C.cyan}/>
                  </div>
                </Panel>
              )}

              <Panel label="Field Properties">
                <div className="flex flex-col gap-2 font-mono text-[11px]">
                  {[
                    ['FIELD', 'GF(2⁸) — 256 elements'],
                    ['CHAR', '2 (addition = XOR, no carrying)'],
                    ['IRRED POLY', 'x⁸+x⁴+x³+x+1 (0x11B)'],
                    ['REDUCTION', 'XOR 0x1B when bit 7 overflows'],
                    ['USED IN', 'AES MixColumns, S-Box construction'],
                  ].map(([k,v])=>(
                    <div key={k} className="flex gap-2">
                      <span className="w-28 flex-shrink-0 text-[9px] tracking-[1px]" style={{color:C.dim}}>{k}</span>
                      <span style={{color:C.text}}>{v}</span>
                    </div>
                  ))}
                </div>
              </Panel>
            </>
          )}

          {/* ── TABLE: multiplier selector ── */}
          {mode === 'table' && (
            <>
              <Panel label="Constant Multiplier">
                <div className="flex gap-2 items-center">
                  <span className="font-mono text-[12px]" style={{color:C.dim}}>0x</span>
                  <input value={mulConstStr}
                    onChange={e=>{setMulConstStr(e.target.value.toUpperCase());setMulConstErr(false);}}
                    onKeyDown={e=>e.key==='Enter'&&applyMulConst()} maxLength={2}
                    className="w-14 font-mono text-[18px] font-bold px-2 py-1 border outline-none text-center"
                    style={{background:'#000',borderColor:mulConstErr?C.orange:C.border,color:C.v1}}/>
                  <button onClick={applyMulConst} className="px-3 py-1.5 font-mono text-[10px] border"
                    style={{background:'transparent',borderColor:C.dim,color:C.dim}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor=C.v1;e.currentTarget.style.color=C.v1;}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor=C.dim;e.currentTarget.style.color=C.dim;}}>SET</button>
                </div>
                {mulConstErr && <div className="font-mono text-[9px]" style={{color:C.orange}}>invalid — enter 00–FF</div>}
                <div>
                  <SLabel>AES MixColumns Constants</SLabel>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {[[2,'×2 xtime'],[3,'×3'],[9,'×9'],[0xB,'×0B'],[0xD,'×0D'],[0xE,'×0E']].map(([v,lbl])=>(
                      <button key={v} onClick={()=>{setMulConst(v as number);setMulConstStr(hx(v as number));setMulConstErr(false);}}
                        className="px-2 py-1 border font-mono text-[10px]"
                        style={{borderColor:mulConst===v?C.v1:C.border,color:mulConst===v?C.v1:C.dim,background:mulConst===v?`${C.v1}12`:'transparent'}}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
              </Panel>

              <Panel label="Active Probe">
                {tblProbe >= 0 ? (
                  <div className="flex flex-col gap-2">
                    {[
                      ['INPUT x',  `0x${hx(tblProbe)}`, C.v2],
                      ['CONSTANT', `0x${hx(mulConst)}`, C.v1],
                      ['PRODUCT',  `0x${hx(MUL[tblProbe*256+mulConst])}`, C.cyan],
                    ].map(([k,v,col])=>(
                      <div key={k} className="flex justify-between border-b py-1" style={{borderColor:C.border}}>
                        <span className="font-mono text-[9px] tracking-[1px]" style={{color:C.dim}}>{k}</span>
                        <span className="font-mono text-[15px] font-bold" style={{color:col as string}}>{v as string}</span>
                      </div>
                    ))}
                    <div className="font-mono text-[10px] mt-1" style={{color:C.dim}}>
                      {toPolyStr(tblProbe)} × {toPolyStr(mulConst)}<br/>
                      = {toPolyStr(MUL[tblProbe*256+mulConst])}
                    </div>
                  </div>
                ) : (
                  <div className="font-mono text-[11px]" style={{color:C.dim}}>[ click any cell ]</div>
                )}
              </Panel>

              <Panel label="About This Table">
                <div className="text-[12px] leading-relaxed" style={{color:C.dim}}>
                  Each cell shows <span style={{color:C.cyan}}>x × constant</span> in GF(2⁸),
                  where x is determined by the cell's row (high nibble) and column (low nibble).<br/><br/>
                  AES MixColumns uses <strong style={{color:C.v1}}>×2, ×3, ×9, ×0B, ×0D, ×0E</strong> to
                  mix the four bytes of each state column, providing diffusion.
                </div>
              </Panel>
            </>
          )}

          {/* ── POWERS: probe + search ── */}
          {mode === 'powers' && (
            <>
              <Panel label="Generator: 0x03">
                <div className="text-[12px] leading-relaxed" style={{color:C.dim}}>
                  <span style={{color:C.v1}}>0x03</span> is a primitive element of GF(2⁸) — its successive
                  powers cycle through all <strong style={{color:C.text}}>255 non-zero</strong> field elements
                  before returning to 1.<br/><br/>
                  This is the discrete logarithm foundation of DH and ECC, but operating in a finite field
                  rather than integers mod p.
                </div>
              </Panel>

              <Panel label="Active Probe">
                {powProbe >= 0 ? (
                  <div className="flex flex-col gap-2">
                    {[
                      ['EXPONENT k',     String(powProbe),        C.v2],
                      ['0x03^k (hex)',   `0x${hx(POW3[powProbe])}`, C.v1],
                      ['0x03^k (poly)',  toPolyStr(POW3[powProbe]),  C.text],
                      ['LOG₀ₓ₀₃(value)', String(powProbe),        C.cyan],
                    ].map(([k,v,col])=>(
                      <div key={k} className="flex flex-col py-1 border-b" style={{borderColor:C.border}}>
                        <span className="font-mono text-[9px] tracking-[1px]" style={{color:C.dim}}>{k}</span>
                        <span className="font-mono text-[14px] font-bold" style={{color:col as string}}>{v as string}</span>
                      </div>
                    ))}
                    {powProbe === 254 && (
                      <div className="font-mono text-[10px] border-l-2 pl-2 mt-1" style={{borderColor:C.green,color:C.green}}>
                        0x03^255 = 0x03^0 = 0x01 — cycle complete
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="font-mono text-[11px]" style={{color:C.dim}}>[ click any cell to probe ]</div>
                )}
              </Panel>

              <Panel label="Find Discrete Log">
                <div className="text-[11px] mb-2" style={{color:C.dim}}>Enter a field element → find its log base 0x03</div>
                <div className="flex gap-2">
                  <span className="font-mono text-[12px]" style={{color:C.dim}}>0x</span>
                  <input value={powSearch} onChange={e=>{setPowSearch(e.target.value.toUpperCase());setPowSearchErr(false);}}
                    onKeyDown={e=>e.key==='Enter'&&doPowSearch()} maxLength={2} placeholder="01–FF"
                    className="w-14 font-mono text-[16px] font-bold px-2 py-1 border outline-none text-center"
                    style={{background:'#000',borderColor:powSearchErr?C.orange:C.border,color:C.v2}}/>
                  <button onClick={doPowSearch} className="px-3 py-1 font-mono text-[10px] border"
                    style={{background:'transparent',borderColor:C.dim,color:C.dim}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor=C.v1;e.currentTarget.style.color=C.v1;}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor=C.dim;e.currentTarget.style.color=C.dim;}}>FIND</button>
                </div>
                {powSearchErr && <div className="font-mono text-[9px]" style={{color:C.orange}}>enter non-zero hex 01–FF</div>}
              </Panel>
            </>
          )}
        </div>

        {/* ────────── RIGHT PANEL ────────── */}
        <div className="flex-1 overflow-auto p-6">

          {/* ═══ MULTIPLY: step table ═══ */}
          {mode === 'multiply' && (
            <>
              <div className="flex items-baseline gap-4 mb-5">
                <div className="text-xl font-black tracking-[3px] uppercase" style={{color:C.v1}}>
                  Russian Peasant Multiplication
                </div>
                <div className="font-mono text-[10px]" style={{color:C.dim}}>
                  8 doublings — doubling doubles a modulo the irreducible polynomial
                </div>
              </div>

              {!validAB ? (
                <div className="border p-6 font-mono text-[13px] text-center" style={{borderColor:C.dim,color:C.dim}}>
                  Enter valid hex values for A and B in the left panel
                </div>
              ) : (
                <>
                  {/* Operand polynomials */}
                  <div className="flex gap-6 mb-6">
                    {([[aVal!,C.v1,'A'],[bVal!,C.v2,'B']] as [number,string,string][]).map(([v,col,n])=>(
                      <div key={n} className="border p-4 flex-1" style={{borderColor:col+`44`,background:col+`08`}}>
                        <div className="font-mono text-[9px] tracking-[2px] mb-2" style={{color:col}}>{n} = 0x{hx(v)} = {v.toString(2).padStart(8,'0')}</div>
                        <div className="font-mono text-[13px]" style={{color:C.text}}>{toPolyStr(v)}</div>
                        <div className="mt-2"><BitRow v={v} hiColor={col}/></div>
                      </div>
                    ))}
                  </div>

                  {/* Step table */}
                  <table style={{borderCollapse:'collapse',fontFamily:'Share Tech Mono, monospace',width:'100%'}} className="mb-6">
                    <thead>
                      <tr style={{background:C.surf2}}>
                        {['STEP','b[i]','A VALUE','BINARY','REDUCTION','CONTRIBUTION'].map(h=>(
                          <th key={h} className="border px-3 py-2 text-left text-[9px] tracking-[2px]"
                            style={{borderColor:C.border,color:C.dim}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {steps.map((s,idx)=>{
                        const contributing = s.bBit === 1;
                        const rowBg = contributing ? `${C.green}0a` : 'transparent';
                        return (
                          <tr key={idx} style={{background:rowBg}}>
                            <td className="border px-3 py-2 font-mono text-[12px]" style={{borderColor:C.border,color:C.dim}}>{s.i}</td>
                            <td className="border px-3 py-2 font-mono text-[14px] text-center font-bold" style={{borderColor:C.border,color:contributing?C.green:C.dim}}>{s.bBit}</td>
                            <td className="border px-3 py-2 font-mono text-[14px] font-bold" style={{borderColor:C.border,color:C.v1}}>0x{hx(s.aIn)}</td>
                            <td className="border px-3 py-2" style={{borderColor:C.border}}>
                              <BitRow v={s.aIn} hiColor={C.v1}/>
                            </td>
                            <td className="border px-3 py-2 font-mono text-[11px]" style={{borderColor:C.border}}>
                              {s.reduced
                                ? <span style={{color:C.orange}}>⊕ 0x1B (overflow)</span>
                                : <span style={{color:C.dim}}>—</span>}
                            </td>
                            <td className="border px-3 py-2 font-mono text-[14px] font-bold" style={{borderColor:C.border}}>
                              {contributing
                                ? <span style={{color:C.green}}>0x{hx(s.contrib)} ✓</span>
                                : <span style={{color:C.dim}}>—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* XOR tree */}
                  <div className="border p-5" style={{borderColor:C.border,background:C.surf}}>
                    <div className="font-mono text-[9px] tracking-[2px] mb-4" style={{color:C.dim}}>RESULT — XOR OF CONTRIBUTING TERMS</div>
                    <div className="flex items-center flex-wrap gap-2 mb-4">
                      {contributions.map((s, i) => (
                        <React.Fragment key={s.i}>
                          {i > 0 && <span className="font-mono text-[18px]" style={{color:C.dim}}>⊕</span>}
                          <div className="border px-3 py-2 font-mono text-[14px] font-bold" style={{borderColor:`${C.green}44`,color:C.green,background:`${C.green}0a`}}>
                            0x{hx(s.contrib)}
                            <span className="text-[9px] ml-1" style={{color:C.dim}}>step {s.i}</span>
                          </div>
                        </React.Fragment>
                      ))}
                      <span className="font-mono text-[18px]" style={{color:C.dim}}>=</span>
                      <div className="border px-4 py-2 font-mono text-[22px] font-black"
                        style={{borderColor:C.cyan,color:C.cyan,background:`${C.cyan}0a`,boxShadow:`0 0 20px ${C.cyan}22`}}>
                        0x{hx(result!)}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="font-mono text-[9px] mb-1" style={{color:C.dim}}>RESULT POLYNOMIAL</div>
                        <div className="font-mono text-[13px]" style={{color:C.cyan}}>{toPolyStr(result!)}</div>
                      </div>
                      <div className="ml-4">
                        <div className="font-mono text-[9px] mb-1" style={{color:C.dim}}>BINARY</div>
                        <BitRow v={result!} hiColor={C.cyan}/>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* ═══ TABLE: heatmap grid ═══ */}
          {mode === 'table' && (
            <>
              <div className="flex items-baseline gap-4 mb-2">
                <div className="text-xl font-black tracking-[3px] uppercase" style={{color:C.v1}}>
                  x × 0x{hx(mulConst)} for all x ∈ GF(2⁸)
                </div>
                <div className="font-mono text-[10px]" style={{color:C.dim}}>row = high nibble, col = low nibble of x</div>
              </div>
              <div className="font-mono text-[11px] mb-5" style={{color:C.dim}}>
                cell[r][c] = GF_MUL( 0x{hx(0)}{'{r}'}{hx(0)}{'{c}'} , 0x{hx(mulConst)} )
                &nbsp;—&nbsp;heatmap: dark=0x00, bright=0xFF
              </div>

              <div className="overflow-auto">
                <table style={{borderCollapse:'collapse',fontFamily:'Share Tech Mono, monospace'}}>
                  <thead>
                    <tr>
                      <td className="border px-2 py-1 text-[9px] text-center" style={{background:C.surf2,borderColor:C.border,color:C.dim}}>x↓</td>
                      {Array.from({length:16},(_,c)=>(
                        <th key={c} className="border text-center text-[10px] min-w-[30px]"
                          style={{background:C.surf2,borderColor:C.border,color:C.v2,padding:'4px 5px'}}>
                          {hx(c,1)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({length:16},(_,row)=>(
                      <tr key={row}>
                        <th className="border text-right text-[10px]" style={{background:C.surf2,borderColor:C.border,color:C.v1,padding:'4px 8px'}}>
                          {hx(row,1)}
                        </th>
                        {Array.from({length:16},(_,col)=>{
                          const x   = (row<<4)|col;
                          const out = MUL[x*256+mulConst];
                          const sel = x === tblProbe;
                          return (
                            <td key={col} onClick={()=>setTblProbe(x)}
                              className="border text-center cursor-pointer text-[10px]"
                              style={{
                                borderColor:C.border, padding:'4px 5px',
                                ...(sel
                                  ? {background:'#f5c400',color:'#000',fontWeight:'bold',transform:'scale(1.1)',zIndex:10,position:'relative'}
                                  : hmStyle(out)),
                              }}>
                              {hx(out)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ═══ POWERS: generator grid ═══ */}
          {mode === 'powers' && (
            <>
              <div className="flex items-baseline gap-4 mb-2">
                <div className="text-xl font-black tracking-[3px] uppercase" style={{color:C.v1}}>
                  Powers of 0x03 — Complete Field Tour
                </div>
                <div className="font-mono text-[10px]" style={{color:C.dim}}>click cell at position k to see 0x03^k</div>
              </div>
              <div className="font-mono text-[11px] mb-5" style={{color:C.dim}}>
                cell at position k shows the value of 0x03^k — all 255 non-zero GF(2⁸) elements appear exactly once (k=0..254)
              </div>

              <div className="overflow-auto">
                <table style={{borderCollapse:'collapse',fontFamily:'Share Tech Mono, monospace'}}>
                  <thead>
                    <tr>
                      <td className="border px-2 py-1 text-[9px] text-center" style={{background:C.surf2,borderColor:C.border,color:C.dim}}>k÷16</td>
                      {Array.from({length:16},(_,c)=>(
                        <th key={c} className="border text-center text-[10px] min-w-[34px]"
                          style={{background:C.surf2,borderColor:C.border,color:C.v2,padding:'4px 6px'}}>
                          +{c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({length:16},(_,row)=>(
                      <tr key={row}>
                        <th className="border text-right text-[10px] whitespace-nowrap"
                          style={{background:C.surf2,borderColor:C.border,color:C.v1,padding:'4px 8px'}}>
                          {row*16}
                        </th>
                        {Array.from({length:16},(_,col)=>{
                          const k   = row*16+col;
                          const sel = k === powProbe;
                          if (k === 255) {
                            // Cycle indicator
                            return (
                              <td key={col} onClick={()=>setPowProbe(0)}
                                className="border text-center cursor-pointer text-[9px]"
                                style={{borderColor:C.border,padding:'4px 5px',background:`${C.green}15`,color:C.green,fontStyle:'italic'}}>
                                ↩ k=0
                              </td>
                            );
                          }
                          const val = POW3[k];
                          return (
                            <td key={col} onClick={()=>setPowProbe(k)}
                              className="border text-center cursor-pointer text-[10px]"
                              style={{
                                borderColor:C.border, padding:'4px 5px',
                                ...(sel
                                  ? {background:C.v1,color:'#000',fontWeight:'bold',transform:'scale(1.1)',zIndex:10,position:'relative'}
                                  : hmStyle(val)),
                              }}>
                              {hx(val)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Verification callout */}
              <div className="mt-6 border border-l-2 p-4 font-mono text-[11px] leading-loose"
                style={{borderColor:C.border,borderLeftColor:C.green,color:C.dim}}>
                <strong style={{color:C.green}}>Field order verified:</strong>&nbsp;
                0x03^255 = <span style={{color:C.v1}}>0x{hx(POW3[255])}</span> = 0x03^0 = 1 &nbsp;✓&nbsp;
                The multiplicative group GF(2⁸)* has order 255 = 3 × 5 × 17.
                Since 0x03 generates the full group, it is a <em>primitive element</em>.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
