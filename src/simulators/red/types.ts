export interface SwitchState {
  position: number; // current position of the stepping switch
  size: number;     // number of positions (6 or 20)
  wiring: string[]; // permutation at each position
}

export interface MachineState {
  sixes: SwitchState;    // handles the 6 vowels
  twenties: SwitchState; // handles the 20 consonants
  halfRotor: number;     // half-rotor selector (0 or 1) for sixes
}
