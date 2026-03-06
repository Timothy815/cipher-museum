export interface WheelConfig {
  id: number;
  size: number;
  pins: boolean[]; // true = active (right), false = inactive (left)
  position: number; // Current index (0 to size-1)
  label: string; // usually alphabet
}

export interface LugSetting {
  // A bar has 2 lugs. 
  // Each lug can engage with one of the 6 wheels (1-6) or be neutral (0).
  // In reality, positions are complex, but we model it as:
  // lug1: wheel index (0-5) or null
  // lug2: wheel index (0-5) or null
  // overlap_count: how many effective shifts this bar causes if activated
  lug1: number | null; 
  lug2: number | null;
}

export interface MachineState {
  wheels: WheelConfig[];
  bars: LugSetting[]; // 27 bars
}

export interface TapeEntry {
  input: string;
  output: string;
  index: number;
}

export enum GameMode {
  ENCRYPT = 'ENCRYPT',
  DECRYPT = 'DECRYPT', // Actually reciprocal, but UI context might change
}