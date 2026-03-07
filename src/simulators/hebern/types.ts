export interface RotorConfig {
  wiring: string;
  position: number;
}

export interface MachineState {
  rotor: RotorConfig;
}
