import { WheelConfig } from "./types";

// Standard ITA2 Baudot Code Table
// Expanded to cover all 32 combinations to ensure reversibility (no '?' outputs)
// 1 = Mark (hole), 0 = Space (no hole)
export const BAUDOT_MAP: Record<string, number[]> = {
  'A': [1, 1, 0, 0, 0], 'B': [1, 0, 0, 1, 1], 'C': [0, 1, 1, 1, 0], 'D': [1, 0, 0, 1, 0],
  'E': [1, 0, 0, 0, 0], 'F': [1, 0, 1, 1, 0], 'G': [0, 1, 0, 1, 1], 'H': [0, 0, 1, 0, 1],
  'I': [0, 1, 1, 0, 0], 'J': [1, 1, 0, 1, 0], 'K': [1, 1, 1, 1, 0], 'L': [0, 1, 0, 0, 1],
  'M': [0, 0, 1, 1, 1], 'N': [0, 0, 1, 1, 0], 'O': [0, 0, 0, 1, 1], 'P': [0, 1, 1, 0, 1],
  'Q': [1, 1, 1, 0, 1], 'R': [0, 1, 0, 1, 0], 'S': [1, 0, 1, 0, 0], 'T': [0, 0, 0, 0, 1],
  'U': [1, 1, 1, 0, 0], 'V': [0, 1, 1, 1, 1], 'W': [1, 1, 0, 0, 1], 'X': [1, 0, 1, 1, 1],
  'Y': [1, 0, 1, 0, 1], 'Z': [1, 0, 0, 0, 1],
  ' ': [0, 0, 1, 0, 0], 
  // Filling the 5 missing 5-bit combinations with punctuation to prevent '?' errors during XOR
  '.': [0, 0, 0, 0, 0], // Null / Blank
  '-': [0, 0, 0, 1, 0], // Line Feed
  ',': [0, 1, 0, 0, 0], // Carriage Return
  '!': [1, 1, 0, 1, 1], // Figures
  '/': [1, 1, 1, 1, 1], // Letters
};

export const REVERSE_BAUDOT_MAP: Record<string, string> = Object.entries(BAUDOT_MAP).reduce((acc, [char, bits]) => {
  acc[bits.join('')] = char;
  return acc;
}, {} as Record<string, string>);

const createPattern = (size: number, seed: number) => {
  const pattern = [];
  let s = seed;
  for (let i = 0; i < size; i++) {
    s = (s * 9301 + 49297) % 233280;
    pattern.push(s % 2);
  }
  return pattern;
};

export const INITIAL_WHEELS: WheelConfig[] = [
  // Chi (X) Wheels - Step every character
  { id: 'chi1', label: 'Χ1', type: 'Chi', size: 41, position: 0, pattern: createPattern(41, 1) },
  { id: 'chi2', label: 'Χ2', type: 'Chi', size: 31, position: 0, pattern: createPattern(31, 2) },
  { id: 'chi3', label: 'Χ3', type: 'Chi', size: 29, position: 0, pattern: createPattern(29, 3) },
  { id: 'chi4', label: 'Χ4', type: 'Chi', size: 26, position: 0, pattern: createPattern(26, 4) },
  { id: 'chi5', label: 'Χ5', type: 'Chi', size: 23, position: 0, pattern: createPattern(23, 5) },

  // Mu (M) Motor Wheels
  { id: 'mu61', label: 'Μ61', type: 'Mu', size: 61, position: 0, pattern: createPattern(61, 6) },
  { id: 'mu37', label: 'Μ37', type: 'Mu', size: 37, position: 0, pattern: createPattern(37, 7) },

  // Psi (Ψ) Wheels - Step irregularly
  { id: 'psi1', label: 'Ψ1', type: 'Psi', size: 43, position: 0, pattern: createPattern(43, 8) },
  { id: 'psi2', label: 'Ψ2', type: 'Psi', size: 47, position: 0, pattern: createPattern(47, 9) },
  { id: 'psi3', label: 'Ψ3', type: 'Psi', size: 51, position: 0, pattern: createPattern(51, 10) },
  { id: 'psi4', label: 'Ψ4', type: 'Psi', size: 53, position: 0, pattern: createPattern(53, 11) },
  { id: 'psi5', label: 'Ψ5', type: 'Psi', size: 59, position: 0, pattern: createPattern(59, 12) },
];