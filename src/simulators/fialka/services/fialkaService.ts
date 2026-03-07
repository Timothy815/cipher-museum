import { MachineState, RotorConfig } from '../types';
import { ALPHABET, ROTOR_WIRINGS, REFLECTOR_WIRING } from '../constants';

function getEffectiveWiring(rotor: RotorConfig): string {
  if (!rotor.reversed) return rotor.wiring;
  // Reverse: invert the permutation
  const inv = new Array(26);
  for (let i = 0; i < 26; i++) {
    inv[ALPHABET.indexOf(rotor.wiring[i])] = ALPHABET[i];
  }
  return inv.join('');
}

function forwardThrough(charIndex: number, rotor: RotorConfig): number {
  const wiring = getEffectiveWiring(rotor);
  const shifted = (charIndex + rotor.position - rotor.ringSetting + 26) % 26;
  const outChar = wiring[shifted];
  const outIndex = ALPHABET.indexOf(outChar);
  return (outIndex - rotor.position + rotor.ringSetting + 26) % 26;
}

function reverseThrough(charIndex: number, rotor: RotorConfig): number {
  const wiring = getEffectiveWiring(rotor);
  const shifted = (charIndex + rotor.position - rotor.ringSetting + 26) % 26;
  const outChar = ALPHABET[shifted];
  const outIndex = wiring.indexOf(outChar);
  return (outIndex - rotor.position + rotor.ringSetting + 26) % 26;
}

function stepRotors(rotors: RotorConfig[]): RotorConfig[] {
  const newRotors = rotors.map(r => ({ ...r }));

  // Rightmost rotor (index 9) always steps
  // Each rotor steps the next one if its blocking pin is active at current position
  for (let i = 9; i >= 0; i--) {
    if (i === 9) {
      // Rightmost always steps
      newRotors[i].position = (newRotors[i].position + 1) % 26;
    } else {
      // Step if the rotor to the right had its blocking pin engaged BEFORE stepping
      const rightRotor = rotors[i + 1]; // pre-step position
      const blockingPositions = ROTOR_WIRINGS[rightRotor.id].blocking;
      if (blockingPositions.includes(rightRotor.position)) {
        newRotors[i].position = (newRotors[i].position + 1) % 26;
      }
    }
  }

  return newRotors;
}

export function encryptCharacter(char: string, state: MachineState): { result: string; newState: MachineState } {
  const upperChar = char.toUpperCase();
  if (!ALPHABET.includes(upperChar)) {
    return { result: char, newState: state };
  }

  // Step rotors before encryption (like Enigma)
  const newRotors = stepRotors(state.rotors);

  // Apply card substitution (entry)
  let current = state.cardSubstitution[upperChar] || upperChar;
  let charIndex = ALPHABET.indexOf(current);

  // Forward through 10 rotors (right to left: 9 → 0)
  for (let i = 9; i >= 0; i--) {
    charIndex = forwardThrough(charIndex, newRotors[i]);
  }

  // Reflector
  charIndex = ALPHABET.indexOf(REFLECTOR_WIRING[charIndex]);

  // Reverse through 10 rotors (left to right: 0 → 9)
  for (let i = 0; i <= 9; i++) {
    charIndex = reverseThrough(charIndex, newRotors[i]);
  }

  // Apply card substitution (exit) — reverse lookup
  let outChar = ALPHABET[charIndex];
  for (const [from, to] of Object.entries(state.cardSubstitution)) {
    if (to === outChar) {
      outChar = from;
      break;
    }
  }

  return {
    result: outChar,
    newState: { ...state, rotors: newRotors },
  };
}
