import React, { useMemo } from 'react';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LETTER_Y0 = 55;
const LETTER_DY = 21;
const WIRE_PAD = 16;
const letterY = (i: number) => LETTER_Y0 + i * LETTER_DY;
const wireHue = (i: number) => (i * 360) / 26;

// ── Types ──────────────────────────────────────────────────────────
export interface WiringColumn {
  label: string;
  sublabel?: string;
}

export interface WiringGapLabel {
  name: string;
  detail: string;
  isStator?: boolean;
}

export interface WiringTrace {
  forward: number[];      // index at each column going left→right
  backward?: number[];    // index at each column going right→left (only with reflector)
  reflIn?: number;
  reflOut?: number;
  inputChar: string;
  outputChar: string;
  pbSwapIn?: string;      // plugboard-swapped input letter (if different)
  pbSwapOut?: string;     // plugboard-swapped output letter (if different)
}

export interface WiringDiagramProps {
  columns: WiringColumn[];
  gapLabels: WiringGapLabel[];
  wirings: number[][];          // one 26-element array per gap
  reflector?: number[];         // reflector mapping at rightmost column (or leftmost if reflectorSide='left')
  reflectorLabel?: string;
  reflectorSide?: 'left' | 'right';  // which side to draw reflector arcs, default 'right'
  trace: WiringTrace | null;
  accentColor?: string;         // for gap headers, default '#92400e'
}

// ── Component ──────────────────────────────────────────────────────
export const WiringDiagram: React.FC<WiringDiagramProps> = ({
  columns, gapLabels, wirings, reflector, reflectorLabel, reflectorSide = 'right', trace,
  accentColor = '#92400e',
}) => {
  const numCols = columns.length;
  const numGaps = numCols - 1;

  // Auto-scale layout based on number of columns
  const marginX = 55;
  const reflMargin = reflector ? 90 : 0;
  const maxSpacing = 180;
  const minSpacing = 90;
  const colSpacing = Math.max(minSpacing, Math.min(maxSpacing, 900 / Math.max(numGaps, 1)));
  const leftExtra = reflectorSide === 'left' ? reflMargin : 0;
  const rightExtra = reflectorSide === 'right' ? reflMargin : 0;
  const colX = useMemo(() => Array.from({ length: numCols }, (_, i) => marginX + leftExtra + i * colSpacing), [numCols, colSpacing, leftExtra]);
  const svgW = colX[numCols - 1] + marginX + rightExtra + 30;
  const svgH = 640;
  const hasReturn = !!trace?.backward;

  // Entry column: where the input/output arrows are drawn
  const entryCol = reflectorSide === 'left' ? numCols - 1 : 0;

  // ── Map signal-flow indices to column indices ───────────────────
  // forward/backward are in signal-flow order; we map to column order
  const fwAtCol = (c: number) => {
    if (!trace) return -1;
    // reflectorSide='right': signal flows L→R, forward[c] = col c
    // reflectorSide='left': signal flows R→L, forward[0] = entry (rightmost col), forward[last] = reflector (leftmost col)
    return reflectorSide === 'left' ? trace.forward[numCols - 1 - c] : trace.forward[c];
  };
  const bwAtCol = (c: number) => {
    if (!trace?.backward) return -1;
    // reflectorSide='right': return flows R→L, backward[0] = rightmost, backward[last] = leftmost
    // reflectorSide='left': return flows L→R, backward[0] = leftmost (reflector), backward[last] = rightmost (entry)
    return reflectorSide === 'left' ? trace.backward![c] : trace.backward![numCols - 1 - c];
  };

  // ── Active wire indices for each gap ────────────────────────────
  // For gap g between col g and col g+1: active wire = [leftColIdx, rightColIdx]
  const activeForward: [number, number][] | null = trace
    ? Array.from({ length: numGaps }, (_, g) => [fwAtCol(g), fwAtCol(g + 1)] as [number, number])
    : null;

  const activeReturn: [number, number][] | null = trace?.backward
    ? Array.from({ length: numGaps }, (_, g) => [bwAtCol(g), bwAtCol(g + 1)] as [number, number])
    : null;

  // ── Highlighted letters ─────────────────────────────────────────
  const highlights = useMemo(() => {
    const m = new Map<string, string>();
    if (!trace) return m;
    for (let c = 0; c < numCols; c++) {
      const idx = fwAtCol(c);
      if (idx >= 0) m.set(`${c}-${idx}`, c === entryCol ? 'input' : 'forward');
    }
    if (trace.backward) {
      for (let c = 0; c < numCols; c++) {
        const idx = bwAtCol(c);
        if (idx >= 0) {
          const key = `${c}-${idx}`;
          if (!m.has(key)) m.set(key, c === entryCol ? 'output' : 'return');
        }
      }
    } else {
      // Forward-only: output is at the far end from entry
      const outCol = numCols - 1;
      const lastIdx = trace.forward[trace.forward.length - 1];
      const key = `${outCol}-${lastIdx}`;
      m.set(key, 'output');
    }
    return m;
  }, [trace, numCols, entryCol]);

  const hlColor = (type: string) => {
    switch (type) {
      case 'input': case 'forward': return '#f59e0b';
      case 'return': return '#06b6d4';
      case 'output': return '#10b981';
      default: return '#94a3b8';
    }
  };

  // Output position depends on mode
  const outputCol = hasReturn ? entryCol : numCols - 1;
  const outputIdx = trace
    ? (hasReturn ? trace.backward![trace.backward!.length - 1] : trace.forward[trace.forward.length - 1])
    : -1;

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto" style={{ minWidth: Math.min(600, svgW) }}>
      <defs>
        <filter id="glow-fwd" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="glow-ret" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="glow-refl" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Column headers */}
      {columns.map((col, c) => (
        <g key={`hdr-${c}`}>
          <text x={colX[c]} y={18} textAnchor="middle" fill="#64748b" fontSize={10} fontWeight="bold" fontFamily="monospace">
            {col.label}
          </text>
          {col.sublabel && (
            <text x={colX[c]} y={30} textAnchor="middle" fill="#475569" fontSize={8} fontFamily="monospace">
              {col.sublabel}
            </text>
          )}
        </g>
      ))}

      {/* Reflector label */}
      {reflector && reflectorLabel && (
        reflectorSide === 'left' ? (
          <text x={colX[0] - 40} y={18} textAnchor="end" fill="#7c3aed" fontSize={10} fontWeight="bold" fontFamily="monospace">
            {reflectorLabel}
          </text>
        ) : (
          <text x={colX[numCols - 1] + 40} y={18} textAnchor="start" fill="#7c3aed" fontSize={10} fontWeight="bold" fontFamily="monospace">
            {reflectorLabel}
          </text>
        )
      )}

      {/* Gap slot labels */}
      {gapLabels.map((gap, g) => {
        const cx = (colX[g] + colX[g + 1]) / 2;
        return (
          <g key={`gap-lbl-${g}`}>
            <text x={cx} y={35} textAnchor="middle" fill={gap.isStator ? '#475569' : accentColor} fontSize={8} fontWeight="bold" fontFamily="monospace" opacity={0.7}>
              {gap.name}
            </text>
            <text x={cx} y={45} textAnchor="middle" fill={gap.isStator ? '#64748b' : accentColor} fontSize={9} fontWeight="bold" fontFamily="monospace" opacity={0.5}>
              {gap.detail}
            </text>
          </g>
        );
      })}

      {/* Column letters */}
      {colX.map((cx, c) => (
        <g key={`col-${c}`}>
          {ALPHABET.split('').map((letter, i) => {
            const hl = highlights.get(`${c}-${i}`);
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

      {/* Gap wires */}
      {/* When reflectorSide='left', invert wirings so beziers correctly show left→right connections */}
      {(reflectorSide === 'left' ? wirings.map(w => {
        const inv = new Array(26);
        for (let i = 0; i < 26; i++) inv[w[i]] = i;
        return inv;
      }) : wirings).map((wiring, g) => {
        const x1 = colX[g] + WIRE_PAD;
        const x2 = colX[g + 1] - WIRE_PAD;
        const cp = (x2 - x1) * 0.15;
        const fwIdx = activeForward ? activeForward[g][0] : -1;
        const rtIdx = activeReturn ? activeReturn[g][0] : -1;

        return (
          <g key={`gap-${g}`}>
            {/* Background wires */}
            {wiring.map((outIdx, inIdx) => {
              if (inIdx === fwIdx || inIdx === rtIdx) return null;
              return (
                <path key={inIdx}
                  d={`M ${x1} ${letterY(inIdx)} C ${x1 + cp} ${letterY(inIdx)}, ${x2 - cp} ${letterY(outIdx)}, ${x2} ${letterY(outIdx)}`}
                  stroke={`hsla(${wireHue(inIdx)}, 40%, 45%, ${trace ? 0.04 : 0.13})`}
                  strokeWidth={1} fill="none" />
              );
            })}

            {/* Active forward wire */}
            {activeForward && (() => {
              const [inI, outI] = activeForward[g];
              return (
                <path
                  d={`M ${x1} ${letterY(inI)} C ${x1 + cp} ${letterY(inI)}, ${x2 - cp} ${letterY(outI)}, ${x2} ${letterY(outI)}`}
                  stroke="#f59e0b" strokeWidth={2.5} fill="none" filter="url(#glow-fwd)" />
              );
            })()}

            {/* Active return wire */}
            {activeReturn && (() => {
              const [inI, outI] = activeReturn[g];
              return (
                <path
                  d={`M ${x1} ${letterY(inI)} C ${x1 + cp} ${letterY(inI)}, ${x2 - cp} ${letterY(outI)}, ${x2} ${letterY(outI)}`}
                  stroke="#06b6d4" strokeWidth={2.5} fill="none" filter="url(#glow-ret)" />
              );
            })()}

            {/* Gap watermark */}
            <text x={(colX[g] + colX[g + 1]) / 2} y={svgH / 2 + 15}
              textAnchor="middle" dominantBaseline="central"
              fontSize={Math.max(30, 60 - numGaps * 5)} fontWeight="bold" fontFamily="monospace"
              fill="rgba(100, 116, 139, 0.04)">
              {g + 1}
            </text>
          </g>
        );
      })}

      {/* Reflector arcs */}
      {reflector && (() => {
        const isLeft = reflectorSide === 'left';
        const x = isLeft ? colX[0] - WIRE_PAD : colX[numCols - 1] + WIRE_PAD;
        const drawn = new Set<number>();
        return reflector.map((outIdx, inIdx) => {
          if (drawn.has(inIdx)) return null;
          drawn.add(inIdx);
          drawn.add(outIdx);
          const y1 = letterY(inIdx);
          const y2 = letterY(outIdx);
          const dist = Math.abs(outIdx - inIdx);
          const bulge = 12 + dist * 2.8;
          const isActive = trace && trace.reflIn !== undefined && (
            (trace.reflIn === inIdx && trace.reflOut === outIdx) ||
            (trace.reflIn === outIdx && trace.reflOut === inIdx)
          );
          const bDir = isLeft ? -bulge : bulge;
          return (
            <path key={inIdx}
              d={`M ${x} ${y1} C ${x + bDir} ${y1}, ${x + bDir} ${y2}, ${x} ${y2}`}
              stroke={isActive ? '#a78bfa' : `rgba(100, 116, 139, ${trace ? 0.04 : 0.1})`}
              strokeWidth={isActive ? 2.5 : 1} fill="none"
              filter={isActive ? 'url(#glow-refl)' : undefined} />
          );
        });
      })()}

      {/* Input/Output indicators */}
      {trace && (() => {
        // Entry side: left (col 0) when reflector is right; right (last col) when reflector is left
        const eCol = entryCol;
        const eX = colX[eCol];
        const isEntryRight = reflectorSide === 'left';
        const ePad = isEntryRight ? WIRE_PAD : -WIRE_PAD;
        const eDir = isEntryRight ? 1 : -1; // +1 = arrows/text to the right, -1 = to the left
        const eAnchor = isEntryRight ? 'start' as const : 'end' as const;
        const inputIdx = fwAtCol(entryCol);

        return (
          <g>
            {/* Input arrow */}
            <polygon
              points={`${eX + ePad + eDir * 6},${letterY(inputIdx) - 4} ${eX + ePad + eDir * 6},${letterY(inputIdx) + 4} ${eX + ePad},${letterY(inputIdx)}`}
              fill="#f59e0b" />
            <text x={eX + ePad + eDir * 10} y={letterY(inputIdx) + 1}
              textAnchor={eAnchor} dominantBaseline="central"
              fontSize={13} fontWeight="bold" fontFamily="monospace" fill="#f59e0b">
              {trace.inputChar}
            </text>
            {trace.pbSwapIn && (
              <text x={eX + ePad + eDir * 10} y={letterY(inputIdx) + 13}
                textAnchor={eAnchor} dominantBaseline="central"
                fontSize={8} fontFamily="monospace" fill="#ec4899">
                PB→{trace.pbSwapIn}
              </text>
            )}

            {/* Output arrow */}
            {hasReturn ? (
              // Reflector mode: output returns to entry side
              <g>
                <polygon
                  points={`${eX + ePad},${letterY(outputIdx) - 4} ${eX + ePad},${letterY(outputIdx) + 4} ${eX + ePad + eDir * 6},${letterY(outputIdx)}`}
                  fill="#10b981" />
                <text x={eX + ePad + eDir * 10} y={letterY(outputIdx) + 1}
                  textAnchor={eAnchor} dominantBaseline="central"
                  fontSize={13} fontWeight="bold" fontFamily="monospace" fill="#10b981">
                  {trace.outputChar}
                </text>
                {trace.pbSwapOut && (
                  <text x={eX + ePad + eDir * 10} y={letterY(outputIdx) - 11}
                    textAnchor={eAnchor} dominantBaseline="central"
                    fontSize={8} fontFamily="monospace" fill="#ec4899">
                    PB→{trace.pbSwapOut}
                  </text>
                )}
              </g>
            ) : (
              // Forward-only: output at opposite side from entry
              <g>
                <polygon
                  points={`${colX[numCols - 1] + WIRE_PAD},${letterY(outputIdx) - 4} ${colX[numCols - 1] + WIRE_PAD},${letterY(outputIdx) + 4} ${colX[numCols - 1] + WIRE_PAD + 6},${letterY(outputIdx)}`}
                  fill="#10b981" />
                <text x={colX[numCols - 1] + WIRE_PAD + 10} y={letterY(outputIdx) + 1}
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
      <g transform={`translate(12, ${svgH - 18})`}>
        <circle cx={0} cy={0} r={4} fill="#f59e0b" />
        <text x={8} y={1} dominantBaseline="central" fontSize={9} fill="#64748b" fontFamily="monospace">Forward</text>
        {hasReturn && (
          <>
            <circle cx={75} cy={0} r={4} fill="#06b6d4" />
            <text x={83} y={1} dominantBaseline="central" fontSize={9} fill="#64748b" fontFamily="monospace">Return</text>
          </>
        )}
        {reflector && (
          <>
            <circle cx={hasReturn ? 140 : 75} cy={0} r={4} fill="#a78bfa" />
            <text x={hasReturn ? 148 : 83} y={1} dominantBaseline="central" fontSize={9} fill="#64748b" fontFamily="monospace">Reflector</text>
          </>
        )}
        <circle cx={hasReturn ? (reflector ? 225 : 140) : (reflector ? 155 : 75)} cy={0} r={4} fill="#10b981" />
        <text x={(hasReturn ? (reflector ? 233 : 148) : (reflector ? 163 : 83))} y={1} dominantBaseline="central" fontSize={9} fill="#64748b" fontFamily="monospace">Output</text>
      </g>

      {/* Prompt */}
      {!trace && (
        <text x={svgW / 2} y={svgH / 2 + 15}
          textAnchor="middle" dominantBaseline="central"
          fontSize={14} fill="#334155" fontFamily="monospace">
          Press a key to trace the signal...
        </text>
      )}
    </svg>
  );
};
