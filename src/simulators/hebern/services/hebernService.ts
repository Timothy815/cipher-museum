import { MachineState } from '../types';
import { ALPHABET } from '../constants';

export function encryptCharacter(char: string, state: MachineState, decrypt: boolean = false): { result: string; newState: MachineState } {
  const upper = char.toUpperCase();
  if (!ALPHABET.includes(upper)) return { result: char, newState: state };

  // Step rotor before encryption
  const newPosition = (state.rotor.position + 1) % 26;

  const charIndex = ALPHABET.indexOf(upper);
  const shifted = (charIndex + newPosition) % 26;

  let result: string;
  if (!decrypt) {
    // Forward through rotor wiring
    const outChar = state.rotor.wiring[shifted];
    const outIndex = ALPHABET.indexOf(outChar);
    result = ALPHABET[(outIndex - newPosition + 26) % 26];
  } else {
    // Reverse through rotor wiring (rotor flipped)
    const inverseIndex = state.rotor.wiring.indexOf(ALPHABET[shifted]);
    result = ALPHABET[(inverseIndex - newPosition + 26) % 26];
  }

  return {
    result,
    newState: { rotor: { ...state.rotor, position: newPosition } },
  };
}
