export enum CipherMode {
  ENCRYPT = 'ENCRYPT',
  DECRYPT = 'DECRYPT',
}

export interface MachineState {
  sixesPosition: number; // 0-24 (technically 25 steps sequences, simplified here to 0-5 for demo or 0-24 for realism)
  twentiesFast: number; // 0-24
  twentiesMedium: number; // 0-24
  twentiesSlow: number; // 0-24
}

export interface EncryptionResult {
  inputChar: string;
  outputChar: string;
  isSixes: boolean; // Which path did it take?
  machineStateAfter: MachineState;
}

export interface LogEntry {
  input: string;
  output: string;
  index: number;
}

// The "Sixes" alphabet (Vowels + Y usually, simplified for this demo)
export const SIXES_ALPHABET = ['A', 'E', 'I', 'O', 'U', 'Y'];
// The "Twenties" alphabet (Consonants)
export const TWENTIES_ALPHABET = [
  'B', 'C', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 
  'N', 'P', 'Q', 'R', 'S', 'T', 'V', 'W', 'X', 'Z'
];

export const FULL_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');
