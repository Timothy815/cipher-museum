export interface RotorConfig {
  id: number;
  wiring: string;
  position: number;
  ringSetting: number;
  notchRing: number[]; // positions where this rotor's notch engages
}

export interface MachineState {
  rotors: [RotorConfig, RotorConfig, RotorConfig, RotorConfig]; // 4 cipher rotors
  driveWheel: { position: number; notches: number[] }; // the Triebrad
  reflector: string;
}
