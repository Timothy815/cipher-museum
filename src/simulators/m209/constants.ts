import { WheelConfig, LugSetting } from './types';

// The M-209 has 6 wheels with these letter counts
export const WHEEL_SIZES = [26, 25, 23, 21, 19, 17];

// Standard alphabet rings usually printed on wheels
export const WHEEL_ALPHABETS = [
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ", // 26
  "ABCDEFGHIJKLMNOPQRSTUVWXY",  // 25
  "ABCDEFGHIJKLMNOPQRSTUVW",    // 23
  "ABCDEFGHIJKLMNOPQRSTU",      // 21
  "ABCDEFGHIJKLMNOPQRS",        // 19
  "ABCDEFGHIJKLMNOPQ"           // 17
];

// Helper to generate a random machine configuration
export const generateRandomState = (): { wheels: WheelConfig[], bars: LugSetting[] } => {
  const wheels: WheelConfig[] = WHEEL_SIZES.map((size, index) => ({
    id: index,
    size,
    // Random pins: ~50% active
    pins: Array.from({ length: size }, () => Math.random() > 0.5),
    // Randomize starting position for visual variance and security
    position: Math.floor(Math.random() * size),
    label: String.fromCharCode(65 + index) // A, B, C, D, E, F identifiers
  }));

  // 27 Bars on the drum
  const bars: LugSetting[] = Array.from({ length: 27 }, () => {
    // Randomize lugs. Lugs can be at positions specific to wheels.
    // Simplifying assumption: Lugs can hit any wheel.
    // In real M-209, valid lug positions are constrained, but for simulation visual:
    // We allow ~40% chance of a lug being set.
    const l1 = Math.random() > 0.6 ? Math.floor(Math.random() * 6) : null;
    let l2 = Math.random() > 0.6 ? Math.floor(Math.random() * 6) : null;
    
    // Lug 2 cannot be same as Lug 1 on same bar usually, or it's redundant.
    if (l1 === l2) l2 = null;

    return { lug1: l1, lug2: l2 };
  });

  return { wheels, bars };
};