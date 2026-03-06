export enum RotorType {
  CONTROL = 'CONTROL',
  INDEX = 'INDEX',
  CIPHER = 'CIPHER'
}

export interface RotorConfig {
  id: number;
  wiring: string; // 26 char string mapping A->?
  notch: string; // Notches for stepping (used mainly in Enigma, less in Sigaba but kept for structure)
  currentPos: number; // 0-25
  reversed: boolean; // Sigaba rotors can be inserted backwards
}

export interface MachineState {
  cipherBank: RotorConfig[]; // 5 Rotors (Bottom) - The actual encryption path
  controlBank: RotorConfig[]; // 5 Rotors (Middle) - Generates stepping signals
  indexBank: RotorConfig[]; // 5 Rotors (Top) - Permutes stepping signals
  mode: 'ENCIPHER' | 'DECIPHER';
}

export interface LogEntry {
  input: string;
  output: string;
  cipherRotors: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
