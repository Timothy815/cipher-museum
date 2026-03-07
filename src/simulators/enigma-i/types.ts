export enum RotorType {
  I = 'I',
  II = 'II',
  III = 'III',
  IV = 'IV',
  V = 'V',
}

export enum ReflectorType {
  A = 'UKW-A',
  B = 'UKW-B',
  C = 'UKW-C',
}

export interface RotorConfig {
  type: RotorType;
  wiring: string;
  notch: string;
  position: number;
  ringSetting: number;
}

export interface MachineState {
  rotors: [RotorConfig, RotorConfig, RotorConfig];
  reflector: ReflectorType;
  plugboard: Record<string, string>;
}
