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

  // Save pre-step positions for notch engagement checks
  // (notch engagement is sensed mechanically before any rotor moves)
  const driveEngaged = newDrive.notches.includes(newDrive.position);
  const r3Engaged = newRotors[3].notchRing.includes(newRotors[3].position);
  const r2Engaged = newRotors[2].notchRing.includes(newRotors[2].position);

  // Drive wheel always steps
  newDrive.position = (newDrive.position + 1) % 26;

  // Rightmost rotor (index 3) always steps
  newRotors[3].position = (newRotors[3].position + 1) % 26;

  // Other rotors step based on pre-step notch engagement
  if (r3Engaged) {
    newRotors[2].position = (newRotors[2].position + 1) % 26;
  }
  if (r2Engaged) {
    newRotors[1].position = (newRotors[1].position + 1) % 26;
  }
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
