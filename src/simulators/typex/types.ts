export interface RotorConfig {
  type: string;
  wiring: string;
  notches: number[]; // Multiple notch positions (Typex feature)
  position: number;
  ringSetting: number;
  isStator: boolean; // Stator rotors don't step
}

export interface MachineState {
  // 5 rotors: [stator1, stator2, slow, medium, fast]
  rotors: [RotorConfig, RotorConfig, RotorConfig, RotorConfig, RotorConfig];
  reflector: string;
}
