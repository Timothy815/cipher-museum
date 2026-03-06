import { RotorType, ReflectorType } from './types';

// Standard alphabet
export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Rotor Wiring (Standard Military Enigma)
export const ROTOR_DATA: Record<RotorType, { wiring: string; notch: string }> = {
  [RotorType.I]:    { wiring: 'EKMFLGDQVZNTOWYHXUSPAIBRCJ', notch: 'Q' },
  [RotorType.II]:   { wiring: 'AJDKSIRUXBLHWTMCQGZNPYFVOE', notch: 'E' },
  [RotorType.III]:  { wiring: 'BDFHJLCPRTXVZNYEIWGAKMUSQO', notch: 'V' },
  [RotorType.IV]:   { wiring: 'ESOVPZJAYQUIRHXLNFTGKDCMWB', notch: 'J' },
  [RotorType.V]:    { wiring: 'VZBRGITYUPSDNHLXAWMJQOFECK', notch: 'Z' },
  [RotorType.VI]:   { wiring: 'JPGVOUMFYQBENHZRDKASXLICTW', notch: 'ZM' }, // M4 rotors VI-VIII have two notches
  [RotorType.VII]:  { wiring: 'NZJHGRCXMYSWBUOFAIVLPEKQDT', notch: 'ZM' },
  [RotorType.VIII]: { wiring: 'FKQHTLXOCBJSPDZRAMEWNIUYGV', notch: 'ZM' },
  // M4 Thin Rotors (No stepping notches relevant for their position, but data included)
  [RotorType.Beta]: { wiring: 'LEYJVCNIXWPBQMDRTAKZGFUHOS', notch: '' },
  [RotorType.Gamma]:{ wiring: 'FSOKANUERHMBTIYCWLQPZXVGJD', notch: '' },
};

// Reflector Wiring
export const REFLECTOR_DATA: Record<ReflectorType, string> = {
  [ReflectorType.B_Thin]: 'ENKQAUYWJICOPBLMDXZVFTHRGS',
  [ReflectorType.C_Thin]: 'RDOBJNTKVEHMLFCWZAXGYIPSUQ',
};

// Defaults
export const DEFAULT_PLUGBOARD: Record<string, string> = {};
export const KEYBOARD_LAYOUT = [
  'QWERTZUIO',
  'ASDFGHJK',
  'PYXCVBNML'
];
