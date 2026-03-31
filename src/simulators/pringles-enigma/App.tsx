import React, { useState, useRef, useEffect } from 'react';
import { Download, Printer, Save, Trash2, Volume2, VolumeX, Share2, Check, FileText, GripVertical } from 'lucide-react';
import { jsPDF } from 'jspdf';

const ENIGMA_MODELS: Record<string, { rotors: string[], reflectors: string[], slots: number, thinRotors?: string[] }> = {
  'Enigma I': {
    rotors: ['I', 'II', 'III', 'IV', 'V'],
    reflectors: ['UKW-A', 'UKW-B', 'UKW-C'],
    slots: 3
  },
  'M3 Army': {
    rotors: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'],
    reflectors: ['UKW-B', 'UKW-C'],
    slots: 3
  },
  'M4 Navy': {
    rotors: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'Beta', 'Gamma'],
    thinRotors: ['Beta', 'Gamma'],
    reflectors: ['UKW-B Thin', 'UKW-C Thin'],
    slots: 4
  }
};

const ROTOR_WIRINGS: Record<string, { wiring: string, notch: string[] }> = {
  'I': { wiring: 'EKMFLGDQVZNTOWYHXUSPAIBRCJ', notch: ['Q'] },
  'II': { wiring: 'AJDKSIRUXBLHWTMCQGZNPYFVOE', notch: ['E'] },
  'III': { wiring: 'BDFHJLCPRTXVZNYEIWGAKMUSQO', notch: ['V'] },
  'IV': { wiring: 'ESOVPZJAYQUIRHXLNFTGKDCMWB', notch: ['J'] },
  'V': { wiring: 'VZBRGITYUPSDNHLXAWMJQOFECK', notch: ['Z'] },
  'VI': { wiring: 'JPGVOUMFYQBENHZRDKASXLICTW', notch: ['Z', 'M'] },
  'VII': { wiring: 'NZJHGRCXMYSWBOUFAIVLPEKQDT', notch: ['Z', 'M'] },
  'VIII': { wiring: 'FKQHTLXOCBJSPDZRAMEWNIUYGV', notch: ['Z', 'M'] },
  'Beta': { wiring: 'LEYJVCNIXWPBQMDRTAKZGFUHOS', notch: [] },
  'Gamma': { wiring: 'FSOKANUERHMBTIYCWLQPZXVGJD', notch: [] },
};

const REFLECTOR_WIRINGS: Record<string, string> = {
  'UKW-A': 'EJMZALYXVBWFCRQUONTSPIKHGD',
  'UKW-B': 'YRUHQSLDPXNGOKMIEBFZCWVJAT',
  'UKW-C': 'FVPJIAOYEDRZXWGCTKUQSBNMHL',
  'UKW-B Thin': 'ENKQAUYWJICOPBLMDXZVFTHRGS',
  'UKW-C Thin': 'RDOBJNTKVEHMLFCWZAXGYIPSUQ',
};

const COLORS = [
  '#1f77b4', '#aec7e8', '#ff7f0e', '#ffbb78', '#2ca02c',
  '#98df8a', '#d62728', '#ff9896', '#9467bd', '#c5b0d5',
  '#8c564b', '#c49c94', '#e377c2', '#f7b6d2', '#7f7f7f',
  '#c7c7c7', '#bcbd22', '#dbdb8d', '#17becf', '#9edae5',
  '#393b79', '#5254a3', '#6b6ecf', '#9c9ede', '#637939',
  '#8ca252'
];

const GRAY_SHADES = Array.from({ length: 26 }).map((_, i) => `hsl(0, 0%, ${15 + (i * 60 / 25)}%)`);

function parsePlugboard(input: string): number[] {
  const mapping = Array.from({ length: 26 }, (_, i) => i);
  const pairs = input.toUpperCase().split(/[^A-Z]+/);
  for (const pair of pairs) {
    if (pair.length === 2) {
      const a = pair.charCodeAt(0) - 65;
      const b = pair.charCodeAt(1) - 65;
      if (a >= 0 && a < 26 && b >= 0 && b < 26) {
        mapping[a] = b;
        mapping[b] = a;
      }
    }
  }
  return mapping;
}

const EnigmaSVG = ({ rotors, setRotors, ringSettings, setRingSettings, reflector, plugboard, isBWMode, lineStyle, showZebra, zebraContrast, lineWidth, rotorPositions, setRotorPositions, viewMode, selectedLetter, onLetterClick, printOrientation = 'landscape' }: any) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragState, setDragState] = useState<any>(null);
  
  const isLandscape = printOrientation === 'landscape';
  const letterHeight = isLandscape ? 273 / 26 : 235 / 26;
  const svgHeight = isLandscape ? (viewMode === 'simulate' ? 288 : 298) : (viewMode === 'simulate' ? 250 : 260);
  const tabY = isLandscape ? 288 : 250;
  const tabTextY = isLandscape ? 294.5 : 256.5;
  
  const effectivePositions = viewMode === 'simulate' ? rotorPositions : Array(rotors.length).fill(0);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent, type: 'horizontal' | 'vertical', index: number) => {
    if (viewMode !== 'simulate') return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    setDragState({
      type,
      index,
      startX: clientX,
      startY: clientY,
      initialValue: type === 'horizontal' ? index : rotorPositions[index],
      currentX: clientX,
      currentY: clientY
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!dragState) return;
      
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      
      setDragState((prev: any) => ({ ...prev, currentX: clientX, currentY: clientY }));

      if (dragState.type === 'vertical') {
        const deltaY = clientY - dragState.startY;
        const deltaSteps = Math.round(deltaY / (letterHeight * 1.5));
        const newPos = (dragState.initialValue + deltaSteps + 26) % 26;
        if (newPos !== rotorPositions[dragState.index]) {
          const updatedPositions = [...rotorPositions];
          updatedPositions[dragState.index] = newPos;
          setRotorPositions(updatedPositions);
        }
      } else if (dragState.type === 'horizontal') {
        const deltaX = clientX - dragState.startX;
        const rotorW = isLandscape ? 85 : 55;
        const threshold = rotorW * 0.8;
        
        if (Math.abs(deltaX) > threshold) {
          const direction = deltaX > 0 ? 1 : -1;
          const targetIndex = dragState.index + direction;
          
          if (targetIndex >= 0 && targetIndex < rotors.length) {
            // Swap rotors
            const newRotors = [...rotors];
            const newRings = [...ringSettings];
            const newPos = [...rotorPositions];
            
            [newRotors[dragState.index], newRotors[targetIndex]] = [newRotors[targetIndex], newRotors[dragState.index]];
            [newRings[dragState.index], newRings[targetIndex]] = [newRings[targetIndex], newRings[dragState.index]];
            [newPos[dragState.index], newPos[targetIndex]] = [newPos[targetIndex], newPos[dragState.index]];
            
            setRotors(newRotors);
            setRingSettings(newRings);
            setRotorPositions(newPos);
            
            setDragState({
              ...dragState,
              index: targetIndex,
              startX: clientX,
              initialValue: targetIndex
            });
          }
        }
      }
    };
    
    const handleMouseUp = () => setDragState(null);
    
    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove);
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [dragState, rotorPositions, rotors, ringSettings, letterHeight, isLandscape, setRotors, setRingSettings, setRotorPositions]);

  const rotorForward = (rotorName: string, ringSetting: number, rotorPosition: number, pos: number) => {
    const rotor = ROTOR_WIRINGS[rotorName];
    const i = (pos + rotorPosition) % 26;
    const contactIn = (i - ringSetting + 26) % 26;
    const wiredChar = rotor.wiring[contactIn];
    const contactOut = wiredChar.charCodeAt(0) - 65;
    const outPos = (contactOut + ringSetting) % 26;
    return (outPos - rotorPosition + 26) % 26;
  };

  const rotorBackward = (rotorName: string, ringSetting: number, rotorPosition: number, pos: number) => {
    const outPos = (pos + rotorPosition) % 26;
    const rotor = ROTOR_WIRINGS[rotorName];
    const contactOut = (outPos - ringSetting + 26) % 26;
    const wiredChar = String.fromCharCode(contactOut + 65);
    const contactIn = rotor.wiring.indexOf(wiredChar);
    const i = (contactIn + ringSetting) % 26;
    return (i - rotorPosition + 26) % 26;
  };

  const reflectorForward = (refName: string, pos: number) => {
    const wiring = REFLECTOR_WIRINGS[refName];
    const outChar = wiring[pos];
    return outChar.charCodeAt(0) - 65;
  };

  let activePath: any = null;
  if (selectedLetter !== null) {
    const p0 = selectedLetter;
    let currentPos = p0;
    const rotorPaths = [];
    
    // Forward through rotors (Right to Left in UI: R0 -> R1 -> R2)
    for (let i = 0; i < rotors.length; i++) {
      const nextPos = rotorForward(rotors[i], ringSettings[i], effectivePositions[i], currentPos);
      rotorPaths.push([currentPos, -1]);
      currentPos = nextPos;
    }
    
    // Reflector
    const refIn = currentPos;
    const refOut = reflectorForward(reflector, refIn);
    currentPos = refOut;
    
    // Backward through rotors (Left to Right in UI: R2 -> R1 -> R0)
    for (let i = rotors.length - 1; i >= 0; i--) {
      const nextPos = rotorBackward(rotors[i], ringSettings[i], effectivePositions[i], currentPos);
      rotorPaths[i][1] = nextPos;
      currentPos = nextPos;
    }
    
    const pEnd = currentPos;
    
    activePath = {
      input: [p0, pEnd],
      rotors: rotorPaths,
      reflector: [refIn, refOut]
    };
  }
  
  const renderStrip = (key: string, x: number, width: number, title: string, renderContent: (w: number) => React.ReactNode, isRotor = false, rotorIdx = -1) => {
    const isDraggingH = dragState?.type === 'horizontal' && dragState?.index === rotorIdx;
    const isDraggingV = dragState?.type === 'vertical' && dragState?.index === rotorIdx;
    
    return (
      <g key={key} transform={`translate(${x}, 0)`} className={isDraggingH ? 'opacity-50' : ''}>
        {/* Strip Outline */}
        <rect x={0} y={0} width={width} height={svgHeight} fill="none" stroke="#cbd5e1" strokeWidth="0.5" />
        
        {/* Header - Draggable for horizontal reordering */}
        <rect 
          x={0} y={0} width={width} height={15} 
          fill={isDraggingH ? "#e2e8f0" : "#f1f5f9"} 
          stroke="#cbd5e1" strokeWidth="0.5" 
          style={{ cursor: isRotor && viewMode === 'simulate' ? 'grab' : 'default' }}
          onMouseDown={(e) => isRotor && handleMouseDown(e, 'horizontal', rotorIdx)}
          onTouchStart={(e) => isRotor && handleMouseDown(e, 'horizontal', rotorIdx)}
        />
        
        {isRotor && viewMode === 'simulate' && (
          <g transform={`translate(${width - 8}, 4)`} style={{ pointerEvents: 'none' }}>
            <rect x="0" y="0" width="1" height="1" fill="#cbd5e1" />
            <rect x="2" y="0" width="1" height="1" fill="#cbd5e1" />
            <rect x="0" y="2" width="1" height="1" fill="#cbd5e1" />
            <rect x="2" y="2" width="1" height="1" fill="#cbd5e1" />
            <rect x="0" y="4" width="1" height="1" fill="#cbd5e1" />
            <rect x="2" y="4" width="1" height="1" fill="#cbd5e1" />
          </g>
        )}
        
        {viewMode === 'simulate' && isRotor ? (
          <>
            <text x={3} y={5} fontSize="4" fontWeight="bold" textAnchor="start" fill="#94a3b8">{title}</text>
            <foreignObject x={width / 2 - 4} y={5} width={8} height={6}>
              <input
                type="text"
                maxLength={1}
                value={String.fromCharCode(65 + rotorPositions[rotorIdx])}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  if (/^[A-Z]$/.test(val)) {
                    const newPos = [...rotorPositions];
                    newPos[rotorIdx] = val.charCodeAt(0) - 65;
                    setRotorPositions(newPos);
                  }
                }}
                onFocus={(e) => e.target.select()}
                className="w-full h-full text-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-sm outline-none font-bold text-[#0f172a] dark:text-slate-200 p-0 m-0"
                style={{ fontSize: '4px', lineHeight: '1' }}
              />
            </foreignObject>
            <g style={{ cursor: 'pointer' }} onClick={() => {
              const newPos = [...effectivePositions];
              newPos[rotorIdx] = (newPos[rotorIdx] - 1 + 26) % 26;
              setRotorPositions(newPos);
            }}>
              <polygon points={`${width/2 - 2.5},4 ${width/2 + 2.5},4 ${width/2},1`} fill="#64748b" />
            </g>
            <g style={{ cursor: 'pointer' }} onClick={() => {
              const newPos = [...effectivePositions];
              newPos[rotorIdx] = (newPos[rotorIdx] + 1) % 26;
              setRotorPositions(newPos);
            }}>
              <polygon points={`${width/2 - 2.5},12 ${width/2 + 2.5},12 ${width/2},15`} fill="#64748b" />
            </g>
          </>
        ) : (
          <text x={width / 2} y={10.5} fontSize="5" fontWeight="bold" textAnchor="middle" fill="#475569">{title}</text>
        )}
        
        {/* Tab */}
        {viewMode === 'print' && (
          <>
            <rect x={0} y={tabY} width={width} height={10} fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.5" />
            <text x={width / 2} y={tabTextY} fontSize="3.5" textAnchor="middle" fill="#94a3b8">OVERLAP & TAPE</text>
          </>
        )}
  
        {/* Content - Draggable for vertical setting */}
        <g 
          transform={`translate(0, 15)`}
          onMouseDown={(e) => isRotor && handleMouseDown(e, 'vertical', rotorIdx)}
          onTouchStart={(e) => isRotor && handleMouseDown(e, 'vertical', rotorIdx)}
          style={{ cursor: isRotor && viewMode === 'simulate' ? 'ns-resize' : 'default' }}
        >
          {Array.from({ length: viewMode === 'simulate' ? 26 : 27 }).map((_, i) => (
            <g key={i}>
              {showZebra && i % 2 === 1 && i < 26 && <rect x={0} y={i * letterHeight} width={width} height={letterHeight} fill="#94a3b8" opacity={zebraContrast} />}
              <line x1={0} y1={i * letterHeight} x2={width} y2={i * letterHeight} stroke="#e2e8f0" strokeWidth="0.3" />
            </g>
          ))}
          {renderContent(width)}
        </g>
      </g>
    );
  };

  const renderInput = (w: number) => {
    const pb = parsePlugboard(plugboard);
    return (
      <>
        {Array.from({ length: 26 }).map((_, i) => {
          const y = (i + 0.5) * letterHeight;
          const letterIndex = pb[i];
          const letter = String.fromCharCode(65 + letterIndex);
          
          const isActive = activePath ? activePath.input.includes(i) : false;
          const opacity = activePath ? (isActive ? 1 : 0.15) : 1;
          const color = isBWMode ? GRAY_SHADES[i % 8] : COLORS[i % 8];
          const strokeW = isActive ? lineWidth * 3 : lineWidth;
          
          return (
            <g key={i} 
               onClick={() => onLetterClick?.(i)} 
               style={{ cursor: 'pointer', opacity, transition: 'opacity 0.2s' }}>
              <polygon points={`${w-2},${y} ${w-6},${y-2} ${w-6},${y+2}`} fill="#475569" />
              <text x={w-10} y={y + 1.5} fontSize="5" fontWeight="bold" textAnchor="end" fill="#0f172a">
                {letter}
              </text>
              <path 
                d={`M ${w-15} ${y} L 2 ${y}`} 
                fill="none" stroke={color} strokeWidth={strokeW} strokeLinejoin="round"
              />
              <circle cx={w-15} cy={y} r={isActive ? lineWidth * 2.4 : lineWidth * 1.2} fill={color} />
              <circle cx={2} cy={y} r={isActive ? lineWidth * 2.4 : lineWidth * 1.2} fill={color} />
            </g>
          );
        })}
      </>
    );
  };

  const renderRotor = (rotorName: string, ringSetting: number, idx: number, w: number) => {
    const rotor = ROTOR_WIRINGS[rotorName];
    if (!rotor) return null;
    
    const offset = effectivePositions[idx];
    
    const renderRotorContent = (offsetY: number) => (
      <g transform={`translate(0, ${offsetY})`}>
        {Array.from({ length: 26 }).map((_, i) => {
          const y = (i + 0.5) * letterHeight;
          const letter = String.fromCharCode(65 + i);
          const isNotch = rotor.notch.includes(letter);
          
          // Wiring calculation (Forward: Right to Left)
          const contactIn = (i - ringSetting + 26) % 26;
          const wiredChar = rotor.wiring[contactIn];
          const contactOut = wiredChar.charCodeAt(0) - 65;
          const outPos = (contactOut + ringSetting) % 26;
          const outY = (outPos + 0.5) * letterHeight;
          
          const isActive = activePath ? activePath.rotors[idx].map((p: number) => (p + offset) % 26).includes(i) : false;
          const opacity = activePath ? (isActive ? 1 : 0.15) : 1;
          const color = isBWMode ? GRAY_SHADES[i % 26] : COLORS[i % 26];
          const strokeW = isActive ? lineWidth * 3 : lineWidth;
          
          const stagger = i / 25;
          const cpX1 = w - 12 - (w - 24) * (0.1 + stagger * 0.8);
          const cpX2 = 12 + (w - 24) * (0.1 + stagger * 0.8);
          
          const dy = Math.abs(y - outY);
          const isShort = dy < letterHeight * 8;

          const d = lineStyle === 'hybrid'
            ? (isShort ? `M ${w - 12} ${y} C ${cpX1} ${y}, ${cpX2} ${outY}, 12 ${outY}` : `M ${w - 12} ${y} L 12 ${outY}`)
            : lineStyle === 'curved'
            ? `M ${w - 12} ${y} C ${cpX1} ${y}, ${cpX2} ${outY}, 12 ${outY}`
            : lineStyle === 'stepped'
            ? `M ${w - 12} ${y} L ${cpX1} ${y} L ${cpX1} ${outY} L 12 ${outY}`
            : `M ${w - 12} ${y} L 12 ${outY}`;
          
          return (
            <g key={i} style={{ opacity, transition: 'opacity 0.2s' }}>
              <text x={w - 4} y={y + 1.5} fontSize="5" fontWeight="bold" textAnchor="end" fill="#0f172a">
                {letter}
              </text>
              {isNotch && <circle cx={w - 10} cy={y} r={1.5} fill="#ef4444" />}
              
              <text x={4} y={y + 1.5} fontSize="5" fontWeight="bold" textAnchor="start" fill="#0f172a">
                {letter}
              </text>
              
              <path 
                d={d} 
                fill="none" stroke={color} strokeWidth={strokeW} strokeLinejoin="round"
              />
              <circle cx={w - 12} cy={y} r={isActive ? lineWidth * 2.4 : lineWidth * 1.2} fill={color} />
              <circle cx={12} cy={outY} r={isActive ? lineWidth * 2.4 : lineWidth * 1.2} fill={color} />
            </g>
          );
        })}
      </g>
    );

    return (
      <svg x={0} y={0} width={w} height={26 * letterHeight} style={{ overflow: 'hidden' }}>
        <g transform={`translate(0, ${-offset * letterHeight})`}>
          {renderRotorContent(-26 * letterHeight)}
          {renderRotorContent(0)}
          {renderRotorContent(26 * letterHeight)}
        </g>
      </svg>
    );
  };

  const renderReflector = (refName: string, w: number) => {
    const wiring = REFLECTOR_WIRINGS[refName];
    if (!wiring) return null;
    
    const drawn = new Set<number>();
    
    return (
      <>
        {Array.from({ length: 26 }).map((_, i) => {
          const y = (i + 0.5) * letterHeight;
          const letter = String.fromCharCode(65 + i);
          
          const outChar = wiring[i];
          const outPos = outChar.charCodeAt(0) - 65;
          const outY = (outPos + 0.5) * letterHeight;
          
          const isActive = activePath ? activePath.reflector.includes(i) : false;
          const opacity = activePath ? (isActive ? 1 : 0.15) : 1;
          const color = isBWMode ? GRAY_SHADES[i % 26] : COLORS[i % 26];
          const strokeW = isActive ? lineWidth * 3 : lineWidth;
          
          let path = null;
          if (!drawn.has(i)) {
            drawn.add(i);
            drawn.add(outPos);
            
            const stagger = i / 25;
            const extendX = w - 15 - stagger * (w - 25);
            
            const dy = Math.abs(y - outY);

            const d = lineStyle === 'hybrid' || lineStyle === 'curved'
              ? `M ${w - 10} ${y} C ${extendX - 5} ${y}, ${extendX - 5} ${outY}, ${w - 10} ${outY}`
              : lineStyle === 'stepped'
              ? `M ${w - 10} ${y} L ${extendX} ${y} L ${extendX} ${outY} L ${w - 10} ${outY}`
              : `M ${w - 10} ${y} L ${extendX} ${(y + outY) / 2} L ${w - 10} ${outY}`;
            path = (
              <>
                <path d={d} fill="none" stroke={color} strokeWidth={strokeW} strokeLinejoin="round" />
                <circle cx={w - 10} cy={y} r={isActive ? lineWidth * 2.4 : lineWidth * 1.2} fill={color} />
                <circle cx={w - 10} cy={outY} r={isActive ? lineWidth * 2.4 : lineWidth * 1.2} fill={color} />
              </>
            );
          }
          
          return (
            <g key={i} style={{ opacity, transition: 'opacity 0.2s' }}>
              <text x={w - 4} y={y + 1.5} fontSize="5" fontWeight="bold" textAnchor="end" fill="#0f172a">
                {letter}
              </text>
              {path}
            </g>
          );
        })}
      </>
    );
  };

  let currentX = 0;
  const strips = [];
  
  const inputW = isLandscape ? 45 : 35;
  const rotorW = isLandscape ? 85 : 55;
  const refW = isLandscape ? 85 : 55;

  // Reflector (Left)
  const refLabel = reflector.replace('UKW-', 'REF ').replace(' Thin', '');
  strips.push(renderStrip('reflector', currentX, refW, refLabel, (w) => renderReflector(reflector, w)));
  currentX += refW;

  // Rotors (Slow -> Middle -> Fast, Left to Right)
  // Rotor 0 is fast, Rotor length-1 is slow. So we render in reverse order.
  const rotorIndices = Array.from({ length: rotors.length }, (_, i) => rotors.length - 1 - i);
  rotorIndices.forEach((idx) => {
    const r = rotors[idx];
    const label = r === 'Beta' ? 'B' : r === 'Gamma' ? 'G' : r;
    strips.push(renderStrip(`rotor-${idx}`, currentX, rotorW, label, (w) => renderRotor(r, ringSettings[idx], idx, w), true, idx));
    currentX += rotorW;
  });

  // Input (Right)
  strips.push(renderStrip('input', currentX, inputW, 'INPUT', renderInput));
  currentX += inputW;

  return (
    <svg 
      ref={svgRef}
      id="enigma-svg"
      xmlns="http://www.w3.org/2000/svg" 
      viewBox={`0 0 ${currentX} ${svgHeight}`} 
      className={`bg-white dark:bg-slate-100 shadow-xl rounded-sm print:shadow-none print:w-full print:h-auto ${isLandscape ? 'print:max-h-[190mm]' : 'print:max-h-[250mm]'}`}
      style={{ maxWidth: '100%', height: 'auto', width: `${currentX}mm` }}
    >
      {strips}
    </svg>
  );
};

interface SavedConfig {
  id: string;
  name: string;
  model: string;
  rotors: string[];
  ringSettings: number[];
  reflector: string;
  plugboard: string;
}

let audioCtx: AudioContext | null = null;
const getAudioCtx = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
};

const playClack = () => {
  try {
    const ctx = getAudioCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch (e) {}
};

const playStep = () => {
  try {
    const ctx = getAudioCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(100, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch (e) {}
};

const PlugboardVisualizer = ({ plugboard, setPlugboard }: { plugboard: string, setPlugboard: (p: string) => void }) => {
  const [hoveredChar, setHoveredChar] = useState<string | null>(null);
  const [firstSelected, setFirstSelected] = useState<string | null>(null);
  const pairs = plugboard.toUpperCase().split(' ').filter(p => p.length === 2);
  const letters = "QWERTZUIOASDFGHJKPYXCVBNML".split('');

  // Find connections
  const connections: { a: string, b: string, color: string }[] = [];
  const colors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e', '#64748b', '#78716c', '#a16207'];
  
  pairs.forEach((pair, i) => {
    if (pair[0] !== pair[1] && letters.includes(pair[0]) && letters.includes(pair[1])) {
      connections.push({ a: pair[0], b: pair[1], color: colors[i % colors.length] });
    }
  });

  const getPos = (char: string) => {
    const idx = letters.indexOf(char);
    if (idx < 9) return { x: 10 + idx * 10, y: 20 }; // Q-O
    if (idx < 17) return { x: 15 + (idx - 9) * 10, y: 50 }; // A-K
    return { x: 10 + (idx - 17) * 10, y: 80 }; // P-L
  };

  const handleClick = (char: string) => {
    const existingPairIdx = pairs.findIndex(p => p.includes(char));
    
    if (existingPairIdx !== -1) {
      // Remove existing connection
      const newPairs = pairs.filter((_, i) => i !== existingPairIdx);
      setPlugboard(newPairs.join(' '));
      setFirstSelected(null);
    } else if (firstSelected === null) {
      // Start new connection
      setFirstSelected(char);
    } else if (firstSelected === char) {
      // Deselect
      setFirstSelected(null);
    } else {
      // Complete new connection
      const newPairs = [...pairs, firstSelected + char];
      setPlugboard(newPairs.join(' '));
      setFirstSelected(null);
    }
  };

  const hoveredConnection = hoveredChar ? connections.find(c => c.a === hoveredChar || c.b === hoveredChar) : null;

  return (
    <div className="w-full max-w-md mx-auto bg-slate-800 p-6 rounded-xl shadow-inner border-4 border-slate-700 relative">
      <h4 className="text-slate-400 text-xs font-bold tracking-widest text-center mb-4 uppercase">Steckerbrett</h4>
      <div className="absolute top-2 right-4 text-[10px] text-slate-500 font-mono">
        {firstSelected ? `SELECTING PAIR FOR ${firstSelected}...` : 'CLICK SOCKETS TO CONNECT'}
      </div>
      <svg viewBox="0 0 100 130" className="w-full h-auto drop-shadow-md" style={{ overflow: 'visible' }}>
        {/* Draw cables */}
        {connections.map((conn, i) => {
          const posA = getPos(conn.a);
          const posB = getPos(conn.b);
          // Draw a curved cable
          const dx = posB.x - posA.x;
          const dy = posB.y - posA.y;
          const cx = posA.x + dx / 2 + (i % 2 === 0 ? 5 : -5);
          const cy = Math.max(posA.y, posB.y) + Math.abs(dx) * 0.2 + 15 + (i * 4); // stagger curves
          
          const isHighlighted = hoveredConnection && hoveredConnection.a === conn.a && hoveredConnection.b === conn.b;
          const opacity = hoveredConnection ? (isHighlighted ? "1" : "0.2") : "0.8";
          const strokeWidth = isHighlighted ? "3" : "2";

          return (
            <path
              key={i}
              d={`M ${posA.x} ${posA.y + 5} Q ${cx} ${cy} ${posB.x} ${posB.y + 5}`}
              fill="none"
              stroke={conn.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              className="drop-shadow-lg transition-all duration-200"
              opacity={opacity}
            />
          );
        })}

        {/* Draw sockets */}
        {letters.map((char, i) => {
          const pos = getPos(char);
          const isConnected = connections.find(c => c.a === char || c.b === char);
          const isFirstSelected = firstSelected === char;
          const isHighlighted = (hoveredConnection && (hoveredConnection.a === char || hoveredConnection.b === char)) || isFirstSelected;
          const opacity = hoveredConnection ? (isHighlighted ? 1 : 0.4) : 1;
          
          return (
            <g 
              key={char} 
              transform={`translate(${pos.x}, ${pos.y})`}
              onMouseEnter={() => setHoveredChar(char)}
              onMouseLeave={() => setHoveredChar(null)}
              onClick={() => handleClick(char)}
              className="cursor-pointer transition-opacity duration-200"
              style={{ opacity }}
            >
              <circle 
                cx="0" cy="0" r="3.5" 
                fill="#1e293b" 
                stroke={isFirstSelected ? "#6366f1" : (isHighlighted ? isConnected?.color : "#475569")} 
                strokeWidth={isHighlighted || isFirstSelected ? "1.5" : "0.5"} 
                className="transition-all duration-200" 
              />
              <circle cx="-1.2" cy="0" r="0.8" fill={isConnected ? isConnected.color : (isFirstSelected ? "#6366f1" : "#0f172a")} />
              <circle cx="1.2" cy="0" r="0.8" fill={isConnected ? isConnected.color : (isFirstSelected ? "#6366f1" : "#0f172a")} />
              <text x="0" y="-5" fontSize="3.5" fill={isHighlighted || isFirstSelected ? "#fff" : "#94a3b8"} textAnchor="middle" fontWeight="bold" fontFamily="monospace" className="transition-colors duration-200">
                {char}
              </text>
              {/* Invisible larger circle for easier hovering */}
              <circle cx="0" cy="0" r="6" fill="transparent" />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const RotorWindow = ({ rotors, rotorPositions, setRotorPositions }: any) => {
  return (
    <div className="bg-slate-800 p-6 rounded-xl shadow-inner border-4 border-slate-700 w-full max-w-3xl mx-auto mb-6 flex flex-col items-center">
      <h4 className="text-slate-400 text-xs font-bold tracking-widest text-center mb-6 uppercase">Rotoren</h4>
      <div className="flex justify-center gap-6">
        {Array.from({ length: rotors.length }, (_, i) => rotors.length - 1 - i).map((idx: number) => {
          const rotor = rotors[idx];
          const pos = rotorPositions[idx];
          const prevPos = (pos - 1 + 26) % 26;
          const nextPos = (pos + 1) % 26;
          return (
            <div key={idx} className="flex flex-col items-center">
              <div className="text-slate-400 text-xs font-bold mb-2">{rotor}</div>
              <div className="bg-slate-900 border-2 border-slate-700 rounded-md w-14 h-28 overflow-hidden relative flex flex-col items-center justify-center shadow-inner">
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/80 via-transparent to-black/80 z-10" />
                
                <div className="flex flex-col items-center w-full">
                  <div 
                    className="text-slate-500 text-sm font-mono opacity-50 cursor-pointer hover:text-slate-300 hover:opacity-100 py-1 w-full text-center" 
                    onClick={() => {
                      const newPos = [...rotorPositions];
                      newPos[idx] = (newPos[idx] - 1 + 26) % 26;
                      setRotorPositions(newPos);
                    }}
                  >
                    {String.fromCharCode(65 + prevPos)}
                  </div>
                  
                  <div className="text-slate-100 text-2xl font-bold font-mono my-1 bg-slate-800 w-full text-center border-y border-slate-700">
                    {String.fromCharCode(65 + pos)}
                  </div>
                  
                  <div 
                    className="text-slate-500 text-sm font-mono opacity-50 cursor-pointer hover:text-slate-300 hover:opacity-100 py-1 w-full text-center" 
                    onClick={() => {
                      const newPos = [...rotorPositions];
                      newPos[idx] = (newPos[idx] + 1) % 26;
                      setRotorPositions(newPos);
                    }}
                  >
                    {String.fromCharCode(65 + nextPos)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Lightboard = ({ litLetter }: { litLetter: string | null }) => {
  const rows = [
    ['Q', 'W', 'E', 'R', 'T', 'Z', 'U', 'I', 'O'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K'],
    ['P', 'Y', 'X', 'C', 'V', 'B', 'N', 'M', 'L']
  ];
  return (
    <div className="bg-slate-800 p-6 rounded-xl shadow-inner border-4 border-slate-700 w-full max-w-3xl mx-auto mb-6">
      <h4 className="text-slate-400 text-xs font-bold tracking-widest text-center mb-6 uppercase">Lampenbrett</h4>
      <div className="flex flex-col gap-4 items-center">
        {rows.map((row, i) => (
          <div key={i} className="flex gap-2 sm:gap-4">
            {row.map(char => {
              const isLit = litLetter === char;
              return (
                <div key={char} className="relative flex items-center justify-center w-8 h-8 sm:w-12 sm:h-12 rounded-full border-2 border-slate-900 bg-slate-900 shadow-inner">
                  <div className={`absolute inset-0 rounded-full transition-opacity duration-75 ${isLit ? 'opacity-100' : 'opacity-0'}`} style={{ background: 'radial-gradient(circle, #fef08a 20%, #eab308 60%, #ca8a04 100%)', boxShadow: '0 0 15px 5px rgba(234, 179, 8, 0.4)' }} />
                  <span className={`relative z-10 text-base sm:text-lg font-bold font-mono ${isLit ? 'text-slate-900' : 'text-slate-400'}`}>{char}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

const Keyboard = ({ onKeyPress, onKeyRelease }: { onKeyPress: (char: string) => void, onKeyRelease: (char: string) => void }) => {
  const rows = [
    ['Q', 'W', 'E', 'R', 'T', 'Z', 'U', 'I', 'O'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K'],
    ['P', 'Y', 'X', 'C', 'V', 'B', 'N', 'M', 'L']
  ];
  return (
    <div className="bg-slate-800 p-6 rounded-xl shadow-inner border-4 border-slate-700 w-full max-w-3xl mx-auto mb-8">
      <h4 className="text-slate-400 text-xs font-bold tracking-widest text-center mb-6 uppercase">Tastatur</h4>
      <div className="flex flex-col gap-3 items-center">
        {rows.map((row, i) => (
          <div key={i} className="flex gap-1 sm:gap-3">
            {row.map(char => (
              <button
                key={char}
                onMouseDown={() => onKeyPress(char)}
                onMouseUp={() => onKeyRelease(char)}
                onMouseLeave={() => onKeyRelease(char)}
                onTouchStart={(e) => { e.preventDefault(); onKeyPress(char); }}
                onTouchEnd={(e) => { e.preventDefault(); onKeyRelease(char); }}
                className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-slate-900 border-b-4 border-slate-950 active:border-b-0 active:translate-y-1 hover:bg-slate-700 flex items-center justify-center shadow-sm transition-all"
              >
                <span className="text-base sm:text-lg font-bold font-mono text-slate-300">{char}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default function App() {
  const [model, setModel] = useState('Enigma I');
  const [rotors, setRotors] = useState(['III', 'II', 'I']);
  const [ringSettings, setRingSettings] = useState([0, 0, 0]);
  const [reflector, setReflector] = useState('UKW-B');
  const [plugboard, setPlugboard] = useState('');
  const [isBWMode, setIsBWMode] = useState(false);
  const [lineStyle, setLineStyle] = useState<'straight' | 'curved' | 'stepped' | 'hybrid'>('hybrid');
  const [showZebra, setShowZebra] = useState(true);
  const [zebraContrast, setZebraContrast] = useState(0.2);
  const [lineWidth, setLineWidth] = useState(0.5);
  const [viewMode, setViewMode] = useState<'simulate' | 'print'>('simulate');
  const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [rotorPositions, setRotorPositions] = useState([0, 0, 0]);
  const rotorPositionsRef = useRef(rotorPositions);
  useEffect(() => {
    rotorPositionsRef.current = rotorPositions;
  }, [rotorPositions]);
  const [plaintext, setPlaintext] = useState('');
  const [simulationSteps, setSimulationSteps] = useState<any[]>([]);
  const simulationStepsRef = useRef(simulationSteps);
  useEffect(() => {
    simulationStepsRef.current = simulationSteps;
  }, [simulationSteps]);
  const [litLetter, setLitLetter] = useState<string | null>(null);
  const [groupOutput, setGroupOutput] = useState(true);
  const lightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>(() => {
    try {
      const saved = localStorage.getItem('enigmaConfigs');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [configName, setConfigName] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const isDarkMode = true; // Always dark in museum
  const [selectedLetter, setSelectedLetter] = useState<number | null>(null);
  const [activeOutputLetter, setActiveOutputLetter] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('model') && ENIGMA_MODELS[params.get('model') as keyof typeof ENIGMA_MODELS]) {
      setModel(params.get('model')!);
    }
    if (params.has('rotors')) setRotors(params.get('rotors')!.split(','));
    if (params.has('rings')) setRingSettings(params.get('rings')!.split(',').map(Number));
    if (params.has('pos')) setRotorPositions(params.get('pos')!.split(',').map(Number));
    if (params.has('ref')) setReflector(params.get('ref')!);
    if (params.has('plug')) setPlugboard(params.get('plug')!);
  }, []);

  const handleShare = () => {
    const params = new URLSearchParams();
    params.set('model', model);
    params.set('rotors', rotors.join(','));
    params.set('rings', ringSettings.join(','));
    params.set('pos', rotorPositions.join(','));
    params.set('ref', reflector);
    params.set('plug', plugboard);
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const stepRotors = (positions: number[]) => {
    const newPos = [...positions];
    // Rotor 0 is the fast rotor (now on the right in UI)
    const fastAtNotch = ROTOR_WIRINGS[rotors[0]].notch.includes(String.fromCharCode(65 + positions[0]));
    const middleAtNotch = ROTOR_WIRINGS[rotors[1]].notch.includes(String.fromCharCode(65 + positions[1]));
    
    newPos[0] = (newPos[0] + 1) % 26;
    if (fastAtNotch || middleAtNotch) {
      newPos[1] = (newPos[1] + 1) % 26;
    }
    if (middleAtNotch) {
      newPos[2] = (newPos[2] + 1) % 26;
    }
    return newPos;
  };

  const encryptChar = (char: string, positions: number[]) => {
    let p = char.charCodeAt(0) - 65;
    const pb = parsePlugboard(plugboard);
    p = pb[p];
    
    // Forward through rotors: Fast -> Middle -> Slow (Right to Left in UI)
    for (let i = 0; i < rotors.length; i++) {
      const rotor = ROTOR_WIRINGS[rotors[i]];
      const contactIn = ((p + positions[i]) - ringSettings[i] + 26) % 26;
      const wiredChar = rotor.wiring[contactIn];
      const contactOut = wiredChar.charCodeAt(0) - 65;
      p = (contactOut + ringSettings[i] - positions[i] + 26) % 26;
    }
    
    const refWiring = REFLECTOR_WIRINGS[reflector];
    p = refWiring.charCodeAt(p) - 65;

    // Backward through rotors: Slow -> Middle -> Fast (Left to Right in UI)
    for (let i = rotors.length - 1; i >= 0; i--) {
      const rotor = ROTOR_WIRINGS[rotors[i]];
      const contactOut = ((p + positions[i]) - ringSettings[i] + 26) % 26;
      const wiredChar = String.fromCharCode(contactOut + 65);
      const contactIn = rotor.wiring.indexOf(wiredChar);
      p = (contactIn + ringSettings[i] - positions[i] + 26) % 26;
    }
    
    p = pb[p];
    return String.fromCharCode(p + 65);
  };

  const handleLetterClick = (i: number) => {
    if (selectedLetter === i) {
      setSelectedLetter(null);
      setActiveOutputLetter(null);
    } else {
      if (soundEnabled) {
        playClack();
        playStep();
      }
      setSelectedLetter(i);
      if (viewMode === 'simulate') {
        const prev = rotorPositionsRef.current;
        const newPos = stepRotors(prev);
        const charIn = String.fromCharCode(i + 65);
        const charOut = encryptChar(charIn, newPos);
        
        rotorPositionsRef.current = newPos;
        
        setRotorPositions(newPos);
        setActiveOutputLetter(charOut);
        
        setSimulationSteps(s => [...s, { 
          charIn, 
          charOut,
          positions: [...newPos]
        }]);
        setPlaintext(p => p + charIn);
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      if (e.repeat) return;
      
      if (e.key === 'Backspace') {
        if (viewMode === 'simulate') {
          const steps = simulationStepsRef.current;
          if (steps.length > 0) {
            const lastStep = steps[steps.length - 1];
            const prevPos = lastStep.prevPositions;
            
            rotorPositionsRef.current = prevPos;
            setRotorPositions(prevPos);
            
            setPlaintext(p => p.slice(0, -1));
            setSimulationSteps(s => s.slice(0, -1));
            
            setLitLetter(null);
            setActiveOutputLetter(null);
            
            if (soundEnabled) {
              playClack();
            }
          }
        }
        return;
      }
      
      const key = e.key.toUpperCase();
      if (/^[A-Z]$/.test(key)) {
        if (soundEnabled) {
          playClack();
          playStep();
        }
        const i = key.charCodeAt(0) - 65;
        setSelectedLetter(i);
        
        if (viewMode === 'simulate') {
          const prev = rotorPositionsRef.current;
          const newPos = stepRotors(prev);
          const charOut = encryptChar(key, newPos);
          
          rotorPositionsRef.current = newPos;
          
          setRotorPositions(newPos);
          setActiveOutputLetter(charOut);
          
          setPlaintext(p => p + key);
          setSimulationSteps(s => [...s, {
            charIn: key,
            charOut,
            positions: [...newPos],
            prevPositions: [...prev]
          }]);
          
          setLitLetter(charOut);
          if (lightTimeoutRef.current) clearTimeout(lightTimeoutRef.current);
          lightTimeoutRef.current = setTimeout(() => {
            setLitLetter(null);
          }, 500);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      const key = e.key.toUpperCase();
      if (/^[A-Z]$/.test(key)) {
        const i = key.charCodeAt(0) - 65;
        setSelectedLetter((prev) => (prev === i ? null : prev));
        setActiveOutputLetter(null);
        setLitLetter(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [rotors, ringSettings, reflector, plugboard, viewMode, soundEnabled]);
  
  const generatePDF = async () => {
    const svgEl = document.getElementById('enigma-svg') as SVGSVGElement | null;
    if (!svgEl) return null;

    try {
      // Clone and inline all computed styles so the serialized SVG renders correctly
      const svgClone = svgEl.cloneNode(true) as SVGSVGElement;
      svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

      // Inline computed styles on all elements
      const inlineStyles = (source: Element, target: Element) => {
        const computed = window.getComputedStyle(source);
        const important = ['fill', 'stroke', 'stroke-width', 'opacity', 'font-size', 'font-weight', 'font-family', 'text-anchor', 'dominant-baseline', 'transform', 'clip-path', 'overflow'];
        let style = '';
        for (const prop of important) {
          const val = computed.getPropertyValue(prop);
          if (val && val !== 'none' && val !== 'normal' && val !== '') {
            style += `${prop}:${val};`;
          }
        }
        if (style) (target as SVGElement).setAttribute('style', ((target as SVGElement).getAttribute('style') || '') + style);
        const sourceChildren = source.children;
        const targetChildren = target.children;
        for (let i = 0; i < sourceChildren.length; i++) {
          if (targetChildren[i]) inlineStyles(sourceChildren[i], targetChildren[i]);
        }
      };
      inlineStyles(svgEl, svgClone);

      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svgClone);

      // Use data URI instead of blob URL to avoid browser security restrictions
      const dataUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);

      const viewBox = svgEl.viewBox.baseVal;
      const scale = 4;
      const canvas = document.createElement('canvas');
      canvas.width = viewBox.width * scale;
      canvas.height = viewBox.height * scale;
      const ctx = canvas.getContext('2d')!;

      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = (e) => {
          console.error('Image load error:', e);
          reject(new Error('Failed to load SVG as image'));
        };
        img.src = dataUri;
      });

      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF({
        orientation: printOrientation,
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgRatio = canvas.height / canvas.width;

      const margin = 15;
      const maxPdfWidth = pdfWidth - margin * 2;
      const maxPdfHeight = pdfHeight - margin * 2;

      let renderWidth = maxPdfWidth;
      let renderHeight = renderWidth * imgRatio;

      if (renderHeight > maxPdfHeight) {
        renderHeight = maxPdfHeight;
        renderWidth = renderHeight / imgRatio;
      }

      const x = (pdfWidth - renderWidth) / 2;
      const y = margin;

      pdf.addImage(imgData, 'PNG', x, y, renderWidth, renderHeight);
      return pdf;
    } catch (err) {
      console.error('Error generating PDF:', err);
      return null;
    }
  };

  const handlePrint = async () => {
    // Open window synchronously to avoid popup blocker
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print. Alternatively, you can use the Download PDF button.');
      return;
    }
    
    printWindow.document.write('<html><body style="font-family: sans-serif; padding: 20px; text-align: center;"><h2>Preparing print view...</h2><p>Please wait while we generate the document.</p></body></html>');
    
    const pdf = await generatePDF();
    if (pdf) {
      pdf.autoPrint();
      const blob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      printWindow.location.href = blobUrl;
    } else {
      printWindow.close();
      alert('Failed to generate print view.');
    }
  };

  const handleDownloadPDF = async () => {
    const pdf = await generatePDF();
    if (pdf) {
      pdf.save('pringles-enigma.pdf');
    } else {
      alert('Failed to generate PDF. Please try printing instead.');
    }
  };

  const saveConfig = () => {
    if (!configName.trim()) return;
    if (savedConfigs.length >= 10) {
      alert('Maximum of 10 configurations can be saved. Please delete one first.');
      return;
    }
    const newConfig: SavedConfig = {
      id: Date.now().toString(),
      name: configName.trim(),
      model,
      rotors,
      ringSettings,
      reflector,
      plugboard
    };
    const newConfigs = [...savedConfigs, newConfig];
    setSavedConfigs(newConfigs);
    localStorage.setItem('enigmaConfigs', JSON.stringify(newConfigs));
    setConfigName('');
  };

  const loadConfig = (config: SavedConfig) => {
    if (!ENIGMA_MODELS[config.model as keyof typeof ENIGMA_MODELS]) return;
    setModel(config.model);
    setRotors(config.rotors);
    setRingSettings(config.ringSettings);
    setReflector(config.reflector);
    setPlugboard(config.plugboard);
    setRotorPositions(Array(config.rotors.length).fill(0));
    setSimulationSteps([]);
    setPlaintext('');
  };

  const deleteConfig = (id: string) => {
    const newConfigs = savedConfigs.filter(c => c.id !== id);
    setSavedConfigs(newConfigs);
    localStorage.setItem('enigmaConfigs', JSON.stringify(newConfigs));
  };

  const simulateMessage = () => {
    let currentPos = [...rotorPositions];
    const steps = [];
    let ciphertext = '';
    
    const cleanText = plaintext.toUpperCase().replace(/[^A-Z]/g, '');
    for (let i = 0; i < cleanText.length; i++) {
      const charIn = cleanText[i];
      const prev = [...currentPos];
      currentPos = stepRotors(currentPos);
      const charOut = encryptChar(charIn, currentPos);
      ciphertext += charOut;
      steps.push({
        charIn,
        charOut,
        positions: [...currentPos],
        prevPositions: prev
      });
    }
    
    setSimulationSteps(steps);
    setRotorPositions(currentPos);
    rotorPositionsRef.current = currentPos;
  };

  const handleVirtualKeyPress = (char: string) => {
    if (soundEnabled) {
      playClack();
      playStep();
    }
    
    const i = char.charCodeAt(0) - 65;
    setSelectedLetter(i);
    
    if (viewMode === 'simulate') {
      const prev = rotorPositionsRef.current;
      const newPos = stepRotors(prev);
      const charOut = encryptChar(char, newPos);
      
      rotorPositionsRef.current = newPos;
      
      setRotorPositions(newPos);
      setActiveOutputLetter(charOut);
      
      setPlaintext(p => p + char);
      setSimulationSteps(s => [...s, {
        charIn: char,
        charOut,
        positions: [...newPos],
        prevPositions: [...prev]
      }]);
      
      setLitLetter(charOut);
      if (lightTimeoutRef.current) clearTimeout(lightTimeoutRef.current);
      lightTimeoutRef.current = setTimeout(() => {
        setLitLetter(null);
      }, 500);
    }
  };

  const handleVirtualKeyRelease = (char: string) => {
    const i = char.charCodeAt(0) - 65;
    setSelectedLetter((prev) => (prev === i ? null : prev));
    setActiveOutputLetter(null);
    setLitLetter(null);
  };

  return (
    <div className="dark flex-1 flex flex-col font-sans bg-slate-950 text-slate-200 px-6 sm:px-10 lg:px-16">
      {/* Toolbar */}
      <div className="bg-slate-900/80 border-b border-slate-800 rounded-xl mt-6 px-8 sm:px-10 py-6 print:hidden">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-end justify-between gap-6 mb-5">
            <div>
              <h2 className="text-2xl sm:text-3xl font-typewriter font-bold text-stone-100 tracking-tighter">
                PRINGLES CAN <span className="text-amber-400">ENIGMA</span>
              </h2>
              <span className="text-stone-500 text-[10px] tracking-[0.3em] font-mono">PRINTABLE PAPER ENIGMA GENERATOR</span>
            </div>
            <div className="flex bg-slate-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('simulate')}
                className={`px-5 py-2 rounded-md text-sm font-bold transition-colors ${viewMode === 'simulate' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Simulator
              </button>
              <button
                onClick={() => setViewMode('print')}
                className={`px-5 py-2 rounded-md text-sm font-bold transition-colors ${viewMode === 'print' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Print Layout
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setSoundEnabled(!soundEnabled)} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2.5 rounded-lg transition-colors text-xs border border-slate-700" title="Toggle Sound">
              {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
              <span className="hidden sm:inline">{soundEnabled ? 'Sound On' : 'Sound Off'}</span>
            </button>
            <button onClick={handleShare} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2.5 rounded-lg transition-colors text-xs border border-slate-700" title="Share Configuration">
              {copiedLink ? <Check size={15} className="text-green-400" /> : <Share2 size={15} />}
              <span className="hidden sm:inline">{copiedLink ? 'Copied!' : 'Share'}</span>
            </button>
            <button onClick={() => setLineStyle(s => s === 'straight' ? 'hybrid' : s === 'hybrid' ? 'curved' : s === 'curved' ? 'stepped' : 'straight')} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2.5 rounded-lg transition-colors text-xs border border-slate-700">
              {lineStyle === 'straight' ? "Straight" : lineStyle === 'hybrid' ? "Hybrid" : lineStyle === 'curved' ? "Curved" : "Stepped"}
            </button>
            <button onClick={() => setIsBWMode(!isBWMode)} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2.5 rounded-lg transition-colors text-xs border border-slate-700">
              {isBWMode ? "Color" : "B&W"}
            </button>
            <button onClick={() => setPrintOrientation(o => o === 'portrait' ? 'landscape' : 'portrait')} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2.5 rounded-lg transition-colors text-xs border border-slate-700">
              {printOrientation === 'landscape' ? "Landscape" : "Portrait"}
            </button>
            <div className="w-px h-6 bg-slate-700 mx-1 hidden sm:block" />
            <button onClick={handlePrint} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2.5 rounded-lg transition-colors text-xs border border-slate-700">
              <Printer size={14} /> Print
            </button>
            <button onClick={handleDownloadPDF} className="flex items-center gap-2 bg-amber-700 hover:bg-amber-600 px-5 py-2.5 rounded-lg transition-colors text-xs font-bold border border-amber-600">
              <Download size={14} /> Download PDF
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full py-8 flex flex-col lg:flex-row gap-10 print:p-0 print:m-0">
        {/* Settings Panel */}
        <aside className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-6 print:hidden">
          <div className="bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-800">
            <h2 className="text-lg font-semibold mb-4 text-slate-200">Machine Settings</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Model</label>
                <select 
                  value={model}
                  onChange={(e) => {
                    const newModel = e.target.value;
                    setModel(newModel);
                    const slots = ENIGMA_MODELS[newModel as keyof typeof ENIGMA_MODELS].slots;
                    if (slots === 3) {
                      setRotors(['III', 'II', 'I']);
                      setRingSettings([0, 0, 0]);
                      setRotorPositions([0, 0, 0]);
                      setReflector('UKW-B');
                    } else {
                      setRotors(['III', 'II', 'I', 'Beta']);
                      setRingSettings([0, 0, 0, 0]);
                      setRotorPositions([0, 0, 0, 0]);
                      setReflector('UKW-B Thin');
                    }
                    setSimulationSteps([]);
                    setPlaintext('');
                  }}
                  className="w-full border border-slate-700 bg-slate-800 text-slate-200 rounded-md p-2 text-sm"
                >
                  {Object.keys(ENIGMA_MODELS).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Reflector</label>
                <select 
                  value={reflector}
                  onChange={(e) => setReflector(e.target.value)}
                  className="w-full border border-slate-700 bg-slate-800 text-slate-200 rounded-md p-2 text-sm"
                >
                  {ENIGMA_MODELS[model as keyof typeof ENIGMA_MODELS].reflectors.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-800">
            <h2 className="text-lg font-semibold mb-4 text-slate-200">Rotors (Right to Left)</h2>
            <div className="space-y-4">
              {rotors.map((r, idx) => (
                <div 
                  key={idx} 
                  className="flex gap-2 items-end group"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('rotorIndex', idx.toString());
                    e.currentTarget.classList.add('opacity-50');
                  }}
                  onDragEnd={(e) => {
                    e.currentTarget.classList.remove('opacity-50');
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const fromIdx = parseInt(e.dataTransfer.getData('rotorIndex'));
                    const toIdx = idx;
                    if (fromIdx !== toIdx) {
                      const newRotors = [...rotors];
                      const newRings = [...ringSettings];
                      const newPos = [...rotorPositions];
                      
                      [newRotors[fromIdx], newRotors[toIdx]] = [newRotors[toIdx], newRotors[fromIdx]];
                      [newRings[fromIdx], newRings[toIdx]] = [newRings[toIdx], newRings[fromIdx]];
                      [newPos[fromIdx], newPos[toIdx]] = [newPos[toIdx], newPos[fromIdx]];
                      
                      setRotors(newRotors);
                      setRingSettings(newRings);
                      setRotorPositions(newPos);
                    }
                  }}
                >
                  <div className="flex items-center justify-center h-9 w-6 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 transition-colors">
                    <GripVertical size={16} />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-400 mb-1">Rotor {idx + 1}</label>
                    <select 
                      value={r}
                      onChange={(e) => {
                        const newRotors = [...rotors];
                        newRotors[idx] = e.target.value;
                        setRotors(newRotors);
                      }}
                      className="w-full border border-slate-700 bg-slate-800 text-slate-200 rounded-md p-2 text-sm"
                    >
                      {ENIGMA_MODELS[model as keyof typeof ENIGMA_MODELS].rotors.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      {model === 'M4 Navy' && idx === 3 && ENIGMA_MODELS['M4 Navy'].thinRotors?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div className="w-20">
                    <label className="block text-xs font-medium text-slate-400 mb-1">Ring</label>
                    <select 
                      value={ringSettings[idx]}
                      onChange={(e) => {
                        const newRings = [...ringSettings];
                        newRings[idx] = parseInt(e.target.value);
                        setRingSettings(newRings);
                      }}
                      className="w-full border border-slate-700 bg-slate-800 text-slate-200 rounded-md p-2 text-sm"
                    >
                      {Array.from({length: 26}).map((_, i) => (
                        <option key={i} value={i}>{String.fromCharCode(65 + i)} ({i + 1})</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-20">
                    <label className="block text-xs font-medium text-slate-400 mb-1">Start Pos</label>
                    <input
                      type="text"
                      maxLength={1}
                      value={String.fromCharCode(65 + rotorPositions[idx])}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        if (/^[A-Z]$/.test(val)) {
                          const newPos = [...rotorPositions];
                          newPos[idx] = val.charCodeAt(0) - 65;
                          setRotorPositions(newPos);
                        }
                      }}
                      onFocus={(e) => e.target.select()}
                      className="w-full border border-slate-700 bg-slate-800 text-slate-200 rounded-md p-2 text-sm uppercase text-center font-mono"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-800">
            <h2 className="text-lg font-semibold mb-4 text-slate-200">Plugboard</h2>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Connections (e.g. AB CD)</label>
              <input 
                type="text" 
                value={plugboard}
                onChange={(e) => setPlugboard(e.target.value)}
                placeholder="AB CD EF"
                className="w-full border border-slate-700 bg-slate-800 text-slate-200 rounded-md p-2 text-sm uppercase font-mono"
              />
            </div>
          </div>

          <div className="bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-800">
            <h2 className="text-lg font-semibold mb-4 text-slate-200">Visual Settings</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-300">Zebra Striping</label>
                <button 
                  onClick={() => setShowZebra(!showZebra)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showZebra ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showZebra ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {showZebra && (
                <div>
                  <label className="flex justify-between text-sm font-medium text-slate-300 mb-1">
                    <span>Zebra Contrast</span>
                    <span className="text-slate-400">{Math.round(zebraContrast * 100)}%</span>
                  </label>
                  <input 
                    type="range" 
                    min="0.05" 
                    max="0.8" 
                    step="0.05" 
                    value={zebraContrast}
                    onChange={(e) => setZebraContrast(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}

              <div>
                <label className="flex justify-between text-sm font-medium text-slate-300 mb-1">
                  <span>Line Thickness</span>
                  <span className="text-slate-400">{lineWidth.toFixed(1)}</span>
                </label>
                <input 
                  type="range" 
                  min="0.1" 
                  max="2.0" 
                  step="0.1" 
                  value={lineWidth}
                  onChange={(e) => setLineWidth(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-800">
            <h2 className="text-lg font-semibold mb-4 text-slate-200">Saved Configurations</h2>
            <div className="flex gap-2 mb-4">
              <input 
                type="text" 
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
                placeholder="Config Name"
                className="flex-1 border border-slate-700 bg-slate-800 text-slate-200 rounded-md p-2 text-sm"
              />
              <button 
                onClick={saveConfig}
                disabled={!configName.trim()}
                className="bg-slate-800 text-white px-3 py-2 rounded-md hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={18} />
              </button>
            </div>
            
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {savedConfigs.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-2">No saved configs</p>
              ) : (
                savedConfigs.map(config => (
                  <div key={config.id} className="flex items-center justify-between bg-slate-800 p-2 rounded-md border border-slate-100 dark:border-slate-700">
                    <button 
                      onClick={() => loadConfig(config)}
                      className="text-sm font-medium text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-left flex-1"
                    >
                      {config.name}
                    </button>
                    <button 
                      onClick={() => deleteConfig(config.id)}
                      className="text-slate-400 hover:text-red-500 p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {viewMode === 'simulate' && (
            <div className="bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-800 print:hidden">
              <h2 className="text-lg font-semibold mb-4 text-slate-200">Message Simulator</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Plaintext</label>
                  <textarea 
                    value={plaintext}
                    onChange={(e) => setPlaintext(e.target.value)}
                    className="w-full border border-slate-700 bg-slate-800 text-slate-200 rounded-md p-2 text-sm uppercase font-mono"
                    rows={3}
                    placeholder="HELLO WORLD"
                  />
                </div>
                <button 
                  onClick={simulateMessage}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  Simulate & Encrypt
                </button>
                
                {simulationSteps.length > 0 && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-300 mb-1">Ciphertext</label>
                    <div className="p-3 bg-slate-800 rounded-md font-mono text-lg tracking-widest break-all dark:text-slate-200">
                      {simulationSteps.map(s => s.charOut || s.out).join('')}
                    </div>
                    
                    <div className="mt-4 max-h-60 overflow-y-auto border border-slate-700 rounded-md">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-800 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 font-medium text-slate-400">Step</th>
                            <th className="px-3 py-2 font-medium text-slate-400">Align Strips To</th>
                            <th className="px-3 py-2 font-medium text-slate-400">Trace</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                          {simulationSteps.map((step, i) => (
                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                              <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                              <td className="px-3 py-2 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                {(step.positions || []).map((p: number) => String.fromCharCode(65 + p)).join('-')}
                              </td>
                              <td className="px-3 py-2 font-mono dark:text-slate-300">
                                {step.charIn || step.in} &rarr; <span className="font-bold text-slate-900 dark:text-slate-100">{step.charOut || step.out}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </aside>

        {/* Preview Area */}
        <section className="flex-1 flex flex-col items-center overflow-auto print:overflow-visible">
          <div className="mb-4 text-center print:hidden">
            <p className="text-slate-400 text-sm">
              {viewMode === 'simulate' 
                ? "Interactive simulation mode. Drag rotors up/down or use arrows to set starting position." 
                : "Preview of the printable strips. Print at 100% scale."}
            </p>
          </div>
          <div id="enigma-container" className={`print:w-full flex justify-center bg-white bg-slate-900 ${printOrientation === 'landscape' ? 'print:max-h-[190mm]' : 'print:max-h-[250mm]'}`}>
            <EnigmaSVG 
              rotors={rotors} 
              setRotors={setRotors}
              ringSettings={ringSettings} 
              setRingSettings={setRingSettings}
              reflector={reflector} 
              plugboard={plugboard} 
              isBWMode={isBWMode}
              lineStyle={lineStyle}
              showZebra={showZebra}
              zebraContrast={zebraContrast}
              lineWidth={lineWidth}
              rotorPositions={rotorPositions}
              setRotorPositions={setRotorPositions}
              viewMode={viewMode}
              selectedLetter={selectedLetter}
              onLetterClick={handleLetterClick}
              printOrientation={printOrientation}
            />
          </div>
          
          {viewMode === 'simulate' && (
            <div className="mt-8 w-full print:hidden">
              <RotorWindow rotors={rotors} rotorPositions={rotorPositions} setRotorPositions={setRotorPositions} />
              <Lightboard litLetter={litLetter} />
              <Keyboard onKeyPress={handleVirtualKeyPress} onKeyRelease={handleVirtualKeyRelease} />
            </div>
          )}
          
          {viewMode === 'simulate' && (
            <div className="mt-8 border-t border-slate-800 pt-6 print:hidden w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-slate-400" />
                  Message Log (Ticker Tape)
                </h3>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                    <input type="checkbox" checked={groupOutput} onChange={(e) => setGroupOutput(e.target.checked)} className="rounded border-slate-300 dark:border-slate-700 dark:bg-slate-800 text-indigo-600 focus:ring-indigo-500" />
                    Format as 5-letter groups
                  </label>
                  <button 
                    onClick={() => {
                      if (simulationSteps.length > 0) {
                        const firstStep = simulationSteps[0];
                        setRotorPositions(firstStep.prevPositions);
                        rotorPositionsRef.current = firstStep.prevPositions;
                      }
                      setPlaintext('');
                      setSimulationSteps([]);
                    }}
                    className="px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 rounded-md transition-colors"
                  >
                    Clear Log
                  </button>
                </div>
              </div>
              <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 font-mono text-sm overflow-x-auto whitespace-nowrap">
                <div className="flex flex-col gap-2 min-h-[4rem]">
                  <div className="flex items-center gap-4">
                    <span className="text-slate-400 dark:text-slate-500 font-semibold w-12 shrink-0">IN:</span>
                    <span className="tracking-[0.2em] text-slate-300">{groupOutput ? plaintext.replace(/(.{5})/g, '$1 ').trim() : plaintext || <span className="text-slate-300 dark:text-slate-600 italic">Type to begin...</span>}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-slate-400 dark:text-slate-500 font-semibold w-12 shrink-0">OUT:</span>
                    <span className="tracking-[0.2em] text-indigo-600 dark:text-indigo-400 font-bold">{groupOutput ? simulationSteps.map(s => s.charOut || s.out).join('').replace(/(.{5})/g, '$1 ').trim() : simulationSteps.map(s => s.charOut || s.out).join('')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {viewMode === 'simulate' && (
            <div className="mt-8 border-t border-slate-800 pt-6 print:hidden">
              <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-slate-400"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                Plugboard Connections
              </h3>
              <PlugboardVisualizer plugboard={plugboard} setPlugboard={setPlugboard} />
            </div>
          )}
        </section>
        
        <div className="hidden print:block break-before-page mt-8 p-8 max-w-4xl mx-auto font-serif">
          <h1 className="text-3xl font-bold mb-6 text-center border-b-2 border-black pb-4">Pringles Can Enigma - Assembly & Usage Guide</h1>
          
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h2 className="text-xl font-bold mb-3">Assembly Instructions</h2>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Eat a can of Pringles and wipe the inside clean.</li>
                <li>Cut out each of the printed strips along the outer gray borders.</li>
                <li>Wrap each strip around the Pringles can.</li>
                <li>Tape the ends together where it says "OVERLAP & TAPE", making sure the strip can still slide and rotate freely around the can.</li>
                <li>Arrange the strips on the can in the exact order they are printed (from left to right).</li>
              </ol>
            </div>
            
            <div>
              <h2 className="text-xl font-bold mb-3">How to Encrypt a Message</h2>
              <ol className="list-decimal pl-5 space-y-2">
                <li><strong>Set the starting position:</strong> Rotate the strips so your chosen starting key (e.g., "A-A-A") is lined up in a straight horizontal row.</li>
                <li><strong>Step the rotors:</strong> Before encrypting each letter, you must step the rotors:
                  <ul className="list-disc pl-5 mt-1 text-sm">
                    <li>Always rotate the <strong>Fast Rotor</strong> (the one next to the Plugboard) UP by one letter.</li>
                    <li>If the Fast Rotor shows a <span className="text-red-600 font-bold">Red Dot</span>, rotate the <strong>Middle Rotor</strong> UP by one letter.</li>
                    <li>If the Middle Rotor shows a <span className="text-red-600 font-bold">Red Dot</span>, rotate the <strong>Middle AND Slow Rotors</strong> UP by one letter (the double-step anomaly).</li>
                  </ul>
                </li>
                <li><strong>Trace the path:</strong> Find your plaintext letter on the Plugboard strip. Follow the line to the <strong>left</strong>, crossing each strip until you hit the Reflector. Then follow the line back to the <strong>right</strong>. The letter you end up on at the Plugboard is your ciphertext letter!</li>
              </ol>
            </div>
          </div>
        </div>
      </main>
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background: white; }
          @page { size: ${printOrientation}; margin: 10mm; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}} />
    </div>
  );
}
