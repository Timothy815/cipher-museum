export enum RotorType {
  I = 'I',
  II = 'II',
  III = 'III',
  IV = 'IV',
  V = 'V',
  VI = 'VI',
  VII = 'VII',
  VIII = 'VIII',
  Beta = 'Beta',
  Gamma = 'Gamma',
}

export enum ReflectorType {
  B_Thin = 'B_Thin',
  C_Thin = 'C_Thin',
}

export interface RotorConfig {
  type: RotorType;
  wiring: string;
  notch: string;
  position: number;
  ringSetting: number;
}

export interface MachineState {
  rotors: [RotorConfig, RotorConfig, RotorConfig, RotorConfig];
  reflector: ReflectorType;
  plugboard: Record<string, string>;
}

export interface EncryptResult {
  ciphertext: string;
  newState: MachineState;
  path: number[];
}
