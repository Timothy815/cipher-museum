import React, { useMemo } from 'react';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LETTER_Y0 = 55;
const LETTER_DY = 21;
const WIRE_PAD = 12;
const SVG_H = 640;
const letterY = (i: number) => LETTER_Y0 + i * LETTER_DY;
const wireHue = (i: number) => (i * 360) / 26;
const mod26 = (n: number) => ((n % 26) + 26) % 26;

// ── Types ──────────────────────────────────────────────────────────
export interface RotorPairDef {
  label: string;       // e.g., "LEFT", "ROTOR 3"
  sublabel: string;    // e.g., "III", "#4"
  offset: number;      // mod(position - ringSetting)
  isStator?: boolean;  // stators drawn with muted styling
}

export interface DualColumnTrace {
  forward: number[];      // signal indices in flow order (length N+1)
  backward?: number[];    // return path (reflector machines, length N+1)
  reflIn?: number;
  reflOut?: number;
  inputChar: string;
  outputChar: string;
  pbIn?: string;
  pbOut?: string;
}

export interface DualColumnWiringProps {
  rotorPairs: RotorPairDef[];
  /** effectiveWiring per pair: wiring[rightVis] = leftVis (always right→left format) */
  wirings: number[][];
  reflector?: number[];
  reflectorLabel?: string;
  trace: DualColumnTrace | null;
  accentColor?: string;
}

// ── Layout computation ─────────────────────────────────────────────
function computeLayout(N: number, hasReflector: boolean) {
  // Scale spacing based on rotor count
  const pairW = N <= 4 ? 58 : Math.max(30, Math.round(58 - (N - 4) * 4.7));
  const statorW = N <= 4 ? 97 : Math.max(38, Math.round(97 - (N - 4) * 9.8));
  const entryW = N <= 4 ? 132 : Math.max(50, Math.round(132 - (N - 4) * 13.7));
  const reflM = hasReflector ? (N <= 4 ? 100 : Math.max(55, Math.round(100 - (N - 4) * 7.5))) : 30;
  const rightM = 60;

  const totalCols = 2 * N + 1;
  const colX: number[] = [];

  // Build pair and stator gap indices
  const pairCols: { lc: number; rc: number; ri: number }[] = [];
  const statorGaps: { lc: number; rc: number }[] = [];
  let entryCol: number;

  if (hasReflector) {
    // [P0L, P0R, stator, P1L, P1R, ..., PN-1_R, stator, Entry]
    let x = reflM;
    for (let i = 0; i < N; i++) {
      pairCols.push({ lc: 2 * i, rc: 2 * i + 1, ri: i });
      colX.push(x);           // pair i left
      colX.push(x + pairW);   // pair i right
      x += pairW;
      if (i < N - 1) {
        statorGaps.push({ lc: 2 * i + 1, rc: 2 * (i + 1) });
        x += statorW;
      } else {
        statorGaps.push({ lc: 2 * i + 1, rc: 2 * N });
        x += entryW;
      }
    }
    colX.push(x); // Entry
    entryCol = 2 * N;
  } else {
    // [Entry, stator, P0L, P0R, stator, P1L, P1R, ...]
    let x = 30; // left margin for entry
    colX.push(x); // Entry
    x += entryW;
    for (let i = 0; i < N; i++) {
      if (i === 0) {
        statorGaps.push({ lc: 0, rc: 1 });
      }
      pairCols.push({ lc: 2 * i + 1, rc: 2 * i + 2, ri: i });
      colX.push(x);           // pair i left
      colX.push(x + pairW);   // pair i right
      x += pairW;
      if (i < N - 1) {
        statorGaps.push({ lc: 2 * i + 2, rc: 2 * (i + 1) + 1 });
        x += statorW;
      }
    }
    entryCol = 0;
  }

  const svgW = colX[colX.length - 1] + rightM;
  return { totalCols, colX, pairCols, statorGaps, entryCol, svgW };
}

// ── Component ──────────────────────────────────────────────────────
export const DualColumnWiring: React.FC<DualColumnWiringProps> = ({
  rotorPairs, wirings, reflector, reflectorLabel, trace, accentColor = '#92400e',
}) => {
  const N = rotorPairs.length;
  const hasReflector = !!reflector;
  const layout = useMemo(() => computeLayout(N, hasReflector), [N, hasReflector]);
  const { totalCols, colX, pairCols, statorGaps, entryCol, svgW } = layout;

  // ── Column offsets ───────────────────────────────────────────────
  const colOffsets = useMemo(() => {
    const offsets = new Array(totalCols).fill(0);
    for (const { lc, rc, ri } of pairCols) {
      offsets[lc] = rotorPairs[ri].offset;
      offsets[rc] = rotorPairs[ri].offset;
    }
    return offsets;
  }, [totalCols, pairCols, rotorPairs]);

  const toVisual = (contactIdx: number, col: number) => mod26(contactIdx - colOffsets[col]);

  // ── Per-column signal contacts ───────────────────────────────────
  const fwdContacts: number[] | null = useMemo(() => {
    if (!trace) return null;
    const c = new Array(totalCols).fill(-1);
    if (hasReflector) {
      c[entryCol] = trace.forward[0];
      for (let j = 0; j < N; j++) {
        c[pairCols[j].rc] = trace.forward[N - 1 - j];
        c[pairCols[j].lc] = trace.forward[N - j];
      }
    } else {
      c[entryCol] = trace.forward[0];
      for (let j = 0; j < N; j++) {
        c[pairCols[j].lc] = trace.forward[j];
        c[pairCols[j].rc] = trace.forward[j + 1];
      }
    }
    return c;
  }, [trace, totalCols, N, hasReflector, entryCol, pairCols]);

  const retContacts: number[] | null = useMemo(() => {
    if (!trace?.backward) return null;
    const c = new Array(totalCols).fill(-1);
    c[entryCol] = trace.backward[N];
    for (let j = 0; j < N; j++) {
      c[pairCols[j].lc] = trace.backward[j];
      c[pairCols[j].rc] = trace.backward[j + 1];
    }
    return c;
  }, [trace, totalCols, N, entryCol, pairCols]);

  // ── Highlighted letters ──────────────────────────────────────────
  const highlights = useMemo(() => {
    const m = new Map<string, string>();
    if (!fwdContacts) return m;
    for (let c = 0; c < totalCols; c++) {
      if (fwdContacts[c] >= 0) m.set(`${c}-${fwdContacts[c]}`, c === entryCol ? 'input' : 'forward');
    }
    if (retContacts) {
      for (let c = 0; c < totalCols; c++) {
        if (retContacts[c] >= 0) {
          const key = `${c}-${retContacts[c]}`;
          if (!m.has(key)) m.set(key, c === entryCol ? 'output' : 'return');
        }
      }
    } else if (trace) {
      // Forward-only: output at far end
      const outCol = hasReflector ? entryCol : totalCols - 1;
      const outIdx = trace.forward[trace.forward.length - 1];
      const key = `${outCol}-${outIdx}`;
      if (!m.has(key)) m.set(key, 'output');
    }
    return m;
  }, [fwdContacts, retContacts, trace, totalCols, entryCol, hasReflector]);

  const hlColor = (type: string) => {
    switch (type) {
      case 'input': case 'forward': return '#f59e0b';
      case 'return': return '#06b6d4';
      case 'output': return '#10b981';
      default: return '#94a3b8';
    }
  };

  return (
    <svg viewBox={`0 0 ${svgW} ${SVG_H}`} className="w-full h-auto" style={{ minWidth: Math.min(700, svgW) }}>
      <defs>
        <filter id="dc-glow-fwd" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="dc-glow-ret" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="dc-glow-refl" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* ── Rotor pair background rectangles ──────────────── */}
      {pairCols.map(({ lc, rc, ri }) => (
        <rect key={`bg-${ri}`}
          x={colX[lc] - 18} y={LETTER_Y0 - 14}
          width={colX[rc] - colX[lc] + 36} height={26 * LETTER_DY + 6}
          rx={8} ry={8}
          fill={rotorPairs[ri].isStator ? 'rgba(100, 116, 139, 0.02)' : `rgba(245, 158, 11, 0.02)`}
          stroke={rotorPairs[ri].isStator ? 'rgba(100, 116, 139, 0.06)' : 'rgba(245, 158, 11, 0.06)'}
          strokeWidth={1} />
      ))}

      {/* ── Rotor pair labels ─────────────────────────────── */}
      {pairCols.map(({ lc, rc, ri }) => {
        const cx = (colX[lc] + colX[rc]) / 2;
        const p = rotorPairs[ri];
        return (
          <g key={`label-${ri}`}>
            <text x={cx} y={20} textAnchor="middle" fill={p.isStator ? '#475569' : accentColor}
              fontSize={N > 6 ? 6 : 8} fontWeight="bold" fontFamily="monospace" opacity={0.7}>
              {p.label}
            </text>
            <text x={cx} y={32} textAnchor="middle" fill={p.isStator ? '#64748b' : accentColor}
              fontSize={N > 6 ? 7 : 9} fontWeight="bold" fontFamily="monospace" opacity={0.5}>
              {p.sublabel}
            </text>
          </g>
        );
      })}

      {/* Entry label */}
      <text x={colX[entryCol]} y={20} textAnchor="middle" fill="#64748b" fontSize={10} fontWeight="bold" fontFamily="monospace">
        ENTRY
      </text>

      {/* Reflector label */}
      {reflector && reflectorLabel && (
        <text x={colX[0] - 40} y={20} textAnchor="end" fill="#7c3aed" fontSize={10} fontWeight="bold" fontFamily="monospace">
          {reflectorLabel}
        </text>
      )}

      {/* Stator gap labels */}
      {statorGaps.map(({ lc, rc }, i) => {
        const cx = (colX[lc] + colX[rc]) / 2;
        return (
          <text key={`stator-lbl-${i}`} x={cx} y={42} textAnchor="middle"
            fill="#334155" fontSize={N > 6 ? 5 : 7} fontFamily="monospace" opacity={0.6}>
            STATOR
          </text>
        );
      })}

      {/* ── Column letters ────────────────────────────────── */}
      {colX.map((cx, c) => (
        <g key={`col-${c}`}>
          {ALPHABET.split('').map((_, i) => {
            const contactIdx = mod26(i + colOffsets[c]);
            const letter = ALPHABET[contactIdx];
            const hl = highlights.get(`${c}-${contactIdx}`);
            const y = letterY(i);
            return (
              <g key={i}>
                {hl && (
                  <circle cx={cx} cy={y} r={9}
                    fill={hlColor(hl)} fillOpacity={0.2}
                    stroke={hlColor(hl)} strokeWidth={1.5} strokeOpacity={0.6} />
                )}
                <text x={cx} y={y + 1} textAnchor="middle" dominantBaseline="central"
                  fontSize={11} fontWeight="bold" fontFamily="monospace"
                  fill={hl ? hlColor(hl) : '#475569'}>
                  {letter}
                </text>
              </g>
            );
          })}
        </g>
      ))}

      {/* ── Internal rotor wiring (colored beziers) ──────── */}
      {pairCols.map(({ lc, rc, ri }) => {
        const x1 = colX[lc] + WIRE_PAD;
        const x2 = colX[rc] - WIRE_PAD;
        const cp = (x2 - x1) * 0.35;
        const wiring = wirings[ri];
        const activeFwdRV = fwdContacts ? toVisual(fwdContacts[rc], rc) : -1;
        const activeRetRV = retContacts ? toVisual(retContacts[rc], rc) : -1;
        // For forward-only, active highlight on left vis
        const activeFwdLV = (fwdContacts && !hasReflector) ? toVisual(fwdContacts[lc], lc) : -1;

        return (
          <g key={`rotor-${ri}`}>
            {/* Background wires */}
            {wiring.map((leftVis, rightVis) => {
              if (rightVis === activeFwdRV || rightVis === activeRetRV) return null;
              if (!hasReflector && leftVis === activeFwdLV) return null;
              return (
                <path key={rightVis}
                  d={`M ${x1} ${letterY(leftVis)} C ${x1 + cp} ${letterY(leftVis)}, ${x2 - cp} ${letterY(rightVis)}, ${x2} ${letterY(rightVis)}`}
                  stroke={`hsla(${wireHue(rightVis)}, 40%, 45%, ${trace ? 0.12 : 0.22})`}
                  strokeWidth={1} fill="none" />
              );
            })}

            {/* Active forward wire */}
            {fwdContacts && fwdContacts[rc] >= 0 && (() => {
              const rv = toVisual(fwdContacts[rc], rc);
              const lv = toVisual(fwdContacts[lc], lc);
              return (
                <path
                  d={`M ${x1} ${letterY(lv)} C ${x1 + cp} ${letterY(lv)}, ${x2 - cp} ${letterY(rv)}, ${x2} ${letterY(rv)}`}
                  stroke="#f59e0b" strokeWidth={2.5} fill="none" filter="url(#dc-glow-fwd)" />
              );
            })()}

            {/* Active return wire */}
            {retContacts && retContacts[rc] >= 0 && (() => {
              const rv = toVisual(retContacts[rc], rc);
              const lv = toVisual(retContacts[lc], lc);
              return (
                <path
                  d={`M ${x1} ${letterY(lv)} C ${x1 + cp} ${letterY(lv)}, ${x2 - cp} ${letterY(rv)}, ${x2} ${letterY(rv)}`}
                  stroke="#06b6d4" strokeWidth={2.5} fill="none" filter="url(#dc-glow-ret)" />
              );
            })()}
          </g>
        );
      })}

      {/* ── Stator connections (thin lines showing rotation offset) ── */}
      {statorGaps.map(({ lc, rc }, si) => {
        const x1 = colX[lc] + WIRE_PAD;
        const x2 = colX[rc] - WIRE_PAD;
        const oL = colOffsets[lc];
        const oR = colOffsets[rc];
        const activeFwdJ = fwdContacts ? fwdContacts[lc] : -1;
        const activeRetJ = retContacts ? retContacts[lc] : -1;

        return (
          <g key={`stator-${si}`}>
            {Array.from({ length: 26 }, (_, j) => {
              if (j === activeFwdJ || j === activeRetJ) return null;
              const lv = mod26(j - oL);
              const rv = mod26(j - oR);
              return (
                <line key={j}
                  x1={x1} y1={letterY(lv)} x2={x2} y2={letterY(rv)}
                  stroke={`rgba(100, 116, 139, ${trace ? 0.06 : 0.12})`}
                  strokeWidth={0.7} />
              );
            })}

            {fwdContacts && activeFwdJ >= 0 && (() => {
              const lv = mod26(activeFwdJ - oL);
              const rv = mod26(activeFwdJ - oR);
              return (
                <line x1={x1} y1={letterY(lv)} x2={x2} y2={letterY(rv)}
                  stroke="#f59e0b" strokeWidth={2} filter="url(#dc-glow-fwd)" />
              );
            })()}

            {retContacts && activeRetJ >= 0 && (() => {
              const lv = mod26(activeRetJ - oL);
              const rv = mod26(activeRetJ - oR);
              return (
                <line x1={x1} y1={letterY(lv)} x2={x2} y2={letterY(rv)}
                  stroke="#06b6d4" strokeWidth={2} filter="url(#dc-glow-ret)" />
              );
            })()}
          </g>
        );
      })}

      {/* ── Reflector arcs ──────────────────────────────────── */}
      {reflector && (() => {
        const reflCol = 0;
        const x = colX[reflCol] - WIRE_PAD;
        const drawn = new Set<number>();
        return reflector.map((outIdx, inIdx) => {
          if (drawn.has(inIdx)) return null;
          drawn.add(inIdx);
          drawn.add(outIdx);
          const vIn = toVisual(inIdx, reflCol);
          const vOut = toVisual(outIdx, reflCol);
          const y1 = letterY(vIn);
          const y2 = letterY(vOut);
          const dist = Math.abs(vOut - vIn);
          const bulge = 12 + dist * 2.8;
          const isActive = trace && trace.reflIn !== undefined && (
            (trace.reflIn === inIdx && trace.reflOut === outIdx) ||
            (trace.reflIn === outIdx && trace.reflOut === inIdx)
          );
          return (
            <path key={inIdx}
              d={`M ${x} ${y1} C ${x - bulge} ${y1}, ${x - bulge} ${y2}, ${x} ${y2}`}
              stroke={isActive ? '#a78bfa' : `rgba(100, 116, 139, ${trace ? 0.12 : 0.2})`}
              strokeWidth={isActive ? 2.5 : 1} fill="none"
              filter={isActive ? 'url(#dc-glow-refl)' : undefined} />
          );
        });
      })()}

      {/* ── Input / Output indicators ───────────────────────── */}
      {trace && (() => {
        const eX = colX[entryCol];
        const isEntryRight = hasReflector;
        const ePad = isEntryRight ? WIRE_PAD : -WIRE_PAD;
        const eDir = isEntryRight ? 1 : -1;
        const eAnchor = isEntryRight ? 'start' as const : 'end' as const;
        const inputVis = toVisual(trace.forward[0], entryCol);

        // Output position
        const hasReturn = !!trace.backward;
        const outputContact = hasReturn
          ? trace.backward![trace.backward!.length - 1]
          : trace.forward[trace.forward.length - 1];
        const outputCol = hasReturn ? entryCol : totalCols - 1;
        const outputVis = toVisual(outputContact, outputCol);

        return (
          <g>
            {/* Input arrow */}
            <polygon
              points={`${eX + ePad + eDir * 6},${letterY(inputVis) - 4} ${eX + ePad + eDir * 6},${letterY(inputVis) + 4} ${eX + ePad},${letterY(inputVis)}`}
              fill="#f59e0b" />
            <text x={eX + ePad + eDir * 10} y={letterY(inputVis) + 1}
              textAnchor={eAnchor} dominantBaseline="central"
              fontSize={13} fontWeight="bold" fontFamily="monospace" fill="#f59e0b">
              {trace.inputChar}
            </text>
            {trace.pbIn && (
              <text x={eX + ePad + eDir * 10} y={letterY(inputVis) + 13}
                textAnchor={eAnchor} dominantBaseline="central"
                fontSize={8} fontFamily="monospace" fill="#ec4899">
                PB→{trace.pbIn}
              </text>
            )}

            {/* Output arrow */}
            {hasReturn ? (
              <g>
                <polygon
                  points={`${eX + ePad},${letterY(outputVis) - 4} ${eX + ePad},${letterY(outputVis) + 4} ${eX + ePad + eDir * 6},${letterY(outputVis)}`}
                  fill="#10b981" />
                <text x={eX + ePad + eDir * 10} y={letterY(outputVis) + 1}
                  textAnchor={eAnchor} dominantBaseline="central"
                  fontSize={13} fontWeight="bold" fontFamily="monospace" fill="#10b981">
                  {trace.outputChar}
                </text>
                {trace.pbOut && (
                  <text x={eX + ePad + eDir * 10} y={letterY(outputVis) - 11}
                    textAnchor={eAnchor} dominantBaseline="central"
                    fontSize={8} fontFamily="monospace" fill="#ec4899">
                    PB→{trace.pbOut}
                  </text>
                )}
              </g>
            ) : (
              <g>
                {/* Forward-only output at far end */}
                <polygon
                  points={`${colX[totalCols - 1] + WIRE_PAD},${letterY(outputVis) - 4} ${colX[totalCols - 1] + WIRE_PAD},${letterY(outputVis) + 4} ${colX[totalCols - 1] + WIRE_PAD + 6},${letterY(outputVis)}`}
                  fill="#10b981" />
                <text x={colX[totalCols - 1] + WIRE_PAD + 10} y={letterY(outputVis) + 1}
                  textAnchor="start" dominantBaseline="central"
                  fontSize={13} fontWeight="bold" fontFamily="monospace" fill="#10b981">
                  {trace.outputChar}
                </text>
              </g>
            )}
          </g>
        );
      })()}

      {/* Legend */}
      <g transform={`translate(12, ${SVG_H - 18})`}>
        <circle cx={0} cy={0} r={4} fill="#f59e0b" />
        <text x={8} y={1} dominantBaseline="central" fontSize={9} fill="#64748b" fontFamily="monospace">Forward</text>
        {!!trace?.backward && (
          <>
            <circle cx={75} cy={0} r={4} fill="#06b6d4" />
            <text x={83} y={1} dominantBaseline="central" fontSize={9} fill="#64748b" fontFamily="monospace">Return</text>
          </>
        )}
        {reflector && (
          <>
            <circle cx={trace?.backward ? 140 : 75} cy={0} r={4} fill="#a78bfa" />
            <text x={trace?.backward ? 148 : 83} y={1} dominantBaseline="central" fontSize={9} fill="#64748b" fontFamily="monospace">Reflector</text>
          </>
        )}
        <circle cx={trace?.backward ? (reflector ? 225 : 140) : (reflector ? 155 : 75)} cy={0} r={4} fill="#10b981" />
        <text x={trace?.backward ? (reflector ? 233 : 148) : (reflector ? 163 : 83)} y={1} dominantBaseline="central" fontSize={9} fill="#64748b" fontFamily="monospace">Output</text>
        <line x1={trace?.backward ? (reflector ? 290 : 198) : (reflector ? 215 : 130)} y1={0}
          x2={trace?.backward ? (reflector ? 315 : 223) : (reflector ? 240 : 155)} y2={0}
          stroke="rgba(100,116,139,0.3)" strokeWidth={1} />
        <text x={trace?.backward ? (reflector ? 320 : 228) : (reflector ? 245 : 160)} y={1}
          dominantBaseline="central" fontSize={9} fill="#64748b" fontFamily="monospace">Stator</text>
      </g>

      {/* "Press a key" prompt */}
      {!trace && (
        <text x={svgW / 2} y={SVG_H / 2 + 15}
          textAnchor="middle" dominantBaseline="central"
          fontSize={14} fill="#334155" fontFamily="monospace">
          Press a key to trace the signal...
        </text>
      )}
    </svg>
  );
};
