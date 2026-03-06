import { MachineState, RotorConfig } from '../types';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Historical or Pseudo-Historical Wirings for SIGABA Rotors
// In reality, SIGABA had large sets of rotors. We define a subset here.
const ROTOR_WIRINGS = [
  "EKMFLGDQVZNTOWYHXUSPAIBRCJ", // I
  "AJDKSIRUXBLHWTMCQGZNPYFVOE", // II
  "BDFHJLCPRTXVZNYEIWGAKMUSQO", // III
  "ESOVPZJAYQUIRHXLNFTGKDCMWB", // IV
  "VZBRGITYUPSDNHLXAWMJQOFECK", // V
  "JPGVOUMFYQBENHZRDKASXLICTW", // VI
  "NZJHGRCXMYSWBOUFAIVLPEKQDT", // VII
  "FKQHTLXOCBJSPDZRAMEWNIUYGV", // VIII
  "LEYJVCNIXWPBQMDRTAKZGFUHOS", // IX
  "FSOKANUERHMBTIYCWLQPZXVGJD", // X
];

// Helper to create a rotor
export const createRotor = (id: number, pos: number = 0, reversed: boolean = false): RotorConfig => ({
  id,
  wiring: ROTOR_WIRINGS[id % ROTOR_WIRINGS.length],
  notch: 'Q', // Simplified for this implementation
  currentPos: pos,
  reversed
});

export const getInitialState = (): MachineState => ({
  // Bottom Bank: Handles the signal
  cipherBank: [0, 1, 2, 3, 4].map(i => createRotor(i, 0, false)),
  // Middle Bank: Controls stepping
  controlBank: [5, 6, 7, 8, 9].map(i => createRotor(i, 0, false)),
  // Top Bank: Permutes control signals (usually stationary during op)
  indexBank: [0, 1, 2, 3, 4].map(i => createRotor(9 - i, 0, false)),
  mode: 'ENCIPHER'
});

// Modulo helper that handles negative numbers
const mod = (n: number, m: number) => ((n % m) + m) % m;

// Map character through a single rotor
const mapThroughRotor = (
  charIndex: number,
  rotor: RotorConfig,
  direction: 'FORWARD' | 'BACKWARD'
): number => {
  const offset = rotor.currentPos;
  
  if (direction === 'FORWARD') {
    // Enter at input contact (charIndex + offset)
    const entryContact = mod(charIndex + offset, 26);
    // Find pin mapping
    const wiringChar = rotor.wiring[entryContact];
    const wiringOffset = ALPHABET.indexOf(wiringChar);
    // Exit at output contact
    return mod(wiringOffset - offset, 26);
  } else {
    // Inverse mapping
    const entryContact = mod(charIndex + offset, 26);
    // Find which input maps to this output
    const wiringChar = ALPHABET[entryContact];
    const wiringIndex = rotor.wiring.indexOf(wiringChar);
    return mod(wiringIndex - offset, 26);
  }
};

// The Complex Stepping Logic of SIGABA
export const stepRotors = (state: MachineState): MachineState => {
  const newState = JSON.parse(JSON.stringify(state)) as MachineState; // Deep copy

  // 1. Step Control Rotors (Middle Bank)
  // In SIGABA, control rotors step in a somewhat regular odometer-like fashion 
  // or a slightly complex pattern depending on modification. 
  // We will use a simplified odometer step for the Control Bank (Rotors 2 & 3 step fast/medium).
  // Authentic SIGABA: Middle 3 control rotors step.
  
  const cRotors = newState.controlBank;
  cRotors[2].currentPos = mod(cRotors[2].currentPos + 1, 26);
  if (cRotors[2].currentPos === 0) {
    cRotors[3].currentPos = mod(cRotors[3].currentPos + 1, 26);
    if (cRotors[3].currentPos === 0) {
      cRotors[1].currentPos = mod(cRotors[1].currentPos + 1, 26);
    }
  }

  // 2. Determine Logic Inputs for Cipher Stepping
  // Signal passes through Control Rotors.
  // SIGABA uses inputs F, G, H, I into the Control Bank.
  const inputs = [5, 6, 7, 8]; // F, G, H, I indices
  const controlOutputs: number[] = [];

  inputs.forEach(input => {
    let signal = input;
    // Pass through Control Bank (Reverse order 4 -> 0 usually, but let's do 0->4 for simplicity of linear flow)
    // Authentic flow: It goes through the control bank.
    for (let i = 0; i < 5; i++) {
      signal = mapThroughRotor(signal, cRotors[i], 'FORWARD');
    }
    controlOutputs.push(signal);
  });

  // 3. Pass Control Outputs through Index Rotors (Top Bank)
  // Index rotors are stationary during operation.
  const iRotors = newState.indexBank;
  const cipherStepMask = [false, false, false, false, false];

  controlOutputs.forEach(signal => {
    let idxSignal = signal;
    for (let i = 0; i < 5; i++) {
        idxSignal = mapThroughRotor(idxSignal, iRotors[i], 'FORWARD');
    }
    // Logic: Output of Index bank (0-25) maps to the 5 Cipher rotors.
    // E.g., A=0 -> steps Rotor 0, B=1 -> steps Rotor 1, etc.
    // SIGABA Logic: The 26 outputs are wired to the 5 magnets.
    // Standard mapping: 
    // 0-4 (A-E) -> Rotor 0
    // 5-9 (F-J) -> Rotor 1
    // ...
    // This is a simplification of the actual "Maze" but functionally identical.
    const targetRotor = Math.floor(idxSignal / 5);
    if (targetRotor >= 0 && targetRotor < 5) {
      cipherStepMask[targetRotor] = true;
    }
  });

  // 4. Step Cipher Rotors (Bottom Bank) based on mask
  newState.cipherBank.forEach((rotor, idx) => {
    if (cipherStepMask[idx]) {
      rotor.currentPos = mod(rotor.currentPos + 1, 26);
    }
  });

  return newState;
};

// Encrypt/Decrypt a single character
export const processCharacter = (char: string, state: MachineState): { result: string, newState: MachineState } => {
  const charIdx = ALPHABET.indexOf(char.toUpperCase());
  if (charIdx === -1) return { result: char, newState: state };

  // 1. Step Rotors BEFORE encryption (Sigaba style)
  const nextState = stepRotors(state);

  // 2. Signal Path
  // In SIGABA, signal goes Forward through Cipher Bank -> Reflected via Wiring (or external) -> Backward?
  // SIGABA (ECM Mark II) is NOT reciprocal like Enigma. It has separate Encipher/Decipher modes.
  // Encipher: Plaintext -> Bank -> Ciphertext
  // Decipher: Ciphertext -> Inverse Bank -> Plaintext
  
  let signal = charIdx;
  const bank = nextState.cipherBank;

  if (state.mode === 'ENCIPHER') {
    // Forward through bank
    for (let i = 0; i < 5; i++) {
      signal = mapThroughRotor(signal, bank[i], 'FORWARD');
    }
  } else {
    // Backward through bank (Inverse operations in reverse order)
    for (let i = 4; i >= 0; i--) {
      signal = mapThroughRotor(signal, bank[i], 'BACKWARD');
    }
  }

  const result = ALPHABET[signal];
  return { result, newState: nextState };
};

export const formatRotorString = (rotors: RotorConfig[]) => {
  return rotors.map(r => ALPHABET[r.currentPos]).join(' ');
};
