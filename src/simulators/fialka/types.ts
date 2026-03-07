export interface RotorConfig {
  id: number;
  wiring: string;
  position: number;
  ringSetting: number;
  reversed: boolean;
  blockingPin: boolean; // true = allows next rotor to step
}

export interface MachineState {
  rotors: RotorConfig[];
  reflector: string;
  cardSubstitution: Record<string, string>; // simulates the punch card reader
}
