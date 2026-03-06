import { MachineState, RotorConfig } from '../types';
import { ALPHABET, REFLECTOR_WIRING } from '../constants';

/**
 * Pass a character through a rotor in the forward direction.
 */
function forwardThroughRotor(charIndex: number, rotor: RotorConfig): number {
  // Apply ring setting offset
  const shifted = (charIndex + rotor.position - rotor.ringSetting + 26) % 26;
  const outChar = rotor.wiring[shifted];
  const outIndex = ALPHABET.indexOf(outChar);
  return (outIndex - rotor.position + rotor.ringSetting + 26) % 26;
}

/**
 * Pass a character through a rotor in the reverse direction.
 */
function reverseThroughRotor(charIndex: number, rotor: RotorConfig): number {
  const shifted = (charIndex + rotor.position - rotor.ringSetting + 26) % 26;
  const outChar = ALPHABET[shifted];
  const outIndex = rotor.wiring.indexOf(outChar);
  return (outIndex - rotor.position + rotor.ringSetting + 26) % 26;
}

/**
 * Step the rotors before encryption.
 * Typex uses multiple notches per rotor for irregular stepping.
 * Only rotors 3, 4, 5 (indices 2, 3, 4) step. Stators (0, 1) never step.
 *
 * Stepping logic (odometer-style with multiple notches):
 * - Fast rotor (index 4) always steps.
 * - Medium rotor (index 3) steps when fast rotor is at a notch position.
 * - Slow rotor (index 2) steps when medium rotor is at a notch position.
 * - Double-stepping: if medium is at a notch, it steps again when slow steps.
 */
function stepRotors(rotors: MachineState['rotors']): MachineState['rotors'] {
  const newRotors = rotors.map(r => ({ ...r })) as MachineState['rotors'];

  const fast = newRotors[4];
  const medium = newRotors[3];
  const slow = newRotors[2];

  // Check notch positions BEFORE stepping
  const mediumAtNotch = medium.notches.includes(medium.position);
  const fastAtNotch = fast.notches.includes(fast.position);

  // Slow steps if medium is at a notch
  if (mediumAtNotch) {
    slow.position = (slow.position + 1) % 26;
  }

  // Medium steps if fast is at a notch, OR double-stepping (medium is at notch)
  if (fastAtNotch || mediumAtNotch) {
    medium.position = (medium.position + 1) % 26;
  }

  // Fast always steps
  fast.position = (fast.position + 1) % 26;

  return newRotors;
}

/**
 * Encrypt a single character through the Typex machine.
 * Returns the encrypted character and the new machine state.
 */
export function encryptCharacter(
  char: string,
  state: MachineState
): { result: string; newState: MachineState } {
  const upperChar = char.toUpperCase();
  if (!ALPHABET.includes(upperChar)) {
    return { result: char, newState: state };
  }

  // Step rotors first (before encryption, like the real machine)
  const steppedRotors = stepRotors(state.rotors);

  let charIndex = ALPHABET.indexOf(upperChar);

  // Forward through all 5 rotors (stator1 → stator2 → slow → medium → fast)
  for (let i = 0; i < 5; i++) {
    charIndex = forwardThroughRotor(charIndex, steppedRotors[i]);
  }

  // Through reflector
  charIndex = ALPHABET.indexOf(REFLECTOR_WIRING[charIndex]);

  // Reverse through all 5 rotors (fast → medium → slow → stator2 → stator1)
  for (let i = 4; i >= 0; i--) {
    charIndex = reverseThroughRotor(charIndex, steppedRotors[i]);
  }

  const result = ALPHABET[charIndex];

  return {
    result,
    newState: {
      ...state,
      rotors: steppedRotors,
    },
  };
}
