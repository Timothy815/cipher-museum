import { RotorType, ReflectorType } from './types';

export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const ROTOR_DATA: Record<RotorType, { wiring: string; notch: string }> = {
  [RotorType.I]:   { wiring: 'EKMFLGDQVZNTOWYHXUSPAIBRCJ', notch: 'Q' },
  [RotorType.II]:  { wiring: 'AJDKSIRUXBLHWTMCQGZNPYFVOE', notch: 'E' },
  [RotorType.III]: { wiring: 'BDFHJLCPRTXVZNYEIWGAKMUSQO', notch: 'V' },
  [RotorType.IV]:  { wiring: 'ESOVPZJAYQUIRHXLNFTGKDCMWB', notch: 'J' },
  [RotorType.V]:   { wiring: 'VZBRGITYUPSDNHLXAWMJQOFECK', notch: 'Z' },
};

export const REFLECTOR_DATA: Record<ReflectorType, string> = {
  [ReflectorType.A]: 'EJMZALYXVBWFCRQUONTSPIKHGD',
  [ReflectorType.B]: 'YRUHQSLDPXNGOKMIEBFZCWVJAT',
  [ReflectorType.C]: 'FVPJIAOYEDRZXWGCTKUQSBNMHL',
};

export const KEYBOARD_LAYOUT = [
  'QWERTZUIO',
  'ASDFGHJK',
  'PYXCVBNML',
];
