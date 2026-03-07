import { MachineState } from '../types';
import { ALPHABET } from '../constants';

export function encryptCharacter(char: string, state: MachineState): { result: string; newState: MachineState } {
  const upper = char.toUpperCase();
  if (!ALPHABET.includes(upper)) return { result: char, newState: state };

  // Step rotor before encryption
  const newPosition = (state.rotor.position + 1) % 26;

  // Simple single-rotor substitution with position offset
  const charIndex = ALPHABET.indexOf(upper);
  const shifted = (charIndex + newPosition) % 26;
  const outChar = state.rotor.wiring[shifted];
  const outIndex = ALPHABET.indexOf(outChar);
  const result = ALPHABET[(outIndex - newPosition + 26) % 26];

  return {
    result,
    newState: { rotor: { ...state.rotor, position: newPosition } },
  };
}
