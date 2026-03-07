import { MachineState, RotorConfig } from '../types';
import { ALPHABET, REFLECTOR_WIRING } from '../constants';

function forwardThrough(charIndex: number, rotor: RotorConfig): number {
  const shifted = (charIndex + rotor.position - rotor.ringSetting + 26) % 26;
  const outChar = rotor.wiring[shifted];
  const outIndex = ALPHABET.indexOf(outChar);
  return (outIndex - rotor.position + rotor.ringSetting + 26) % 26;
}

function reverseThrough(charIndex: number, rotor: RotorConfig): number {
  const shifted = (charIndex + rotor.position - rotor.ringSetting + 26) % 26;
  const outChar = ALPHABET[shifted];
  const outIndex = rotor.wiring.indexOf(outChar);
  return (outIndex - rotor.position + rotor.ringSetting + 26) % 26;
}

function stepRotors(state: MachineState): MachineState {
  const newRotors = state.rotors.map(r => ({ ...r })) as MachineState['rotors'];
  const newDrive = { ...state.driveWheel };

  // Drive wheel always steps
  const driveEngaged = newDrive.notches.includes(newDrive.position);
  newDrive.position = (newDrive.position + 1) % 26;

  // Rightmost rotor (index 3) always steps
  newRotors[3].position = (newRotors[3].position + 1) % 26;

  // Other rotors step based on irregular notch engagement
  // Rotor 2 steps if rotor 3's notch ring is engaged
  if (newRotors[3].notchRing.includes(newRotors[3].position)) {
    newRotors[2].position = (newRotors[2].position + 1) % 26;
  }

  // Rotor 1 steps if rotor 2's notch ring is engaged
  if (newRotors[2].notchRing.includes(newRotors[2].position)) {
    newRotors[1].position = (newRotors[1].position + 1) % 26;
  }

  // Rotor 0 steps if drive wheel notch is engaged
  if (driveEngaged) {
    newRotors[0].position = (newRotors[0].position + 1) % 26;
  }

  return { ...state, rotors: newRotors, driveWheel: newDrive };
}

export function encryptCharacter(char: string, state: MachineState): { result: string; newState: MachineState } {
  const upperChar = char.toUpperCase();
  if (!ALPHABET.includes(upperChar)) {
    return { result: char, newState: state };
  }

  // Step before encryption
  const newState = stepRotors(state);

  let charIndex = ALPHABET.indexOf(upperChar);

  // Forward through 4 rotors (right to left: 3 → 0)
  for (let i = 3; i >= 0; i--) {
    charIndex = forwardThrough(charIndex, newState.rotors[i]);
  }

  // Reflector
  charIndex = ALPHABET.indexOf(REFLECTOR_WIRING[charIndex]);

  // Reverse through 4 rotors (left to right: 0 → 3)
  for (let i = 0; i <= 3; i++) {
    charIndex = reverseThrough(charIndex, newState.rotors[i]);
  }

  return {
    result: ALPHABET[charIndex],
    newState,
  };
}
