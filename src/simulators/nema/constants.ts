export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// NEMA had 10 available rotors — historically inspired wirings
export const ROTOR_WIRINGS: Record<number, { wiring: string; notches: number[] }> = {
  1:  { wiring: 'EKMFLGDQVZNTOWYHXUSPAIBRCJ', notches: [3, 9, 14, 21] },
  2:  { wiring: 'AJDKSIRUXBLHWTMCQGZNPYFVOE', notches: [5, 11, 17, 24] },
  3:  { wiring: 'BDFHJLCPRTXVZNYEIWGAKMUSQO', notches: [2, 8, 15, 20] },
  4:  { wiring: 'ESOVPZJAYQUIRHXLNFTGKDCMWB', notches: [4, 10, 16, 22] },
  5:  { wiring: 'VZBRGITYUPSDNHLXAWMJQOFECK', notches: [1, 7, 13, 19, 25] },
  6:  { wiring: 'JPGVOUMFYQBENHZRDKASXLICTW', notches: [3, 6, 12, 18, 23] },
  7:  { wiring: 'NZJHGRCXMYSWBUOFAIVLPEKQDT', notches: [0, 5, 11, 16, 22] },
  8:  { wiring: 'FKQHTLXOCBJSPDZRAMEWNIUYGV', notches: [2, 9, 14, 20, 25] },
  9:  { wiring: 'LPGSZMHAEOQKVXRFYBUTNICJDW', notches: [4, 8, 13, 19, 24] },
  10: { wiring: 'SLVGBTFXJQOHEWIRZYAMKPCNDU', notches: [1, 7, 10, 17, 21] },
};

// Drive wheel (Triebrad) — irregular notch pattern
export const DRIVE_WHEEL_NOTCHES = [0, 3, 5, 8, 11, 14, 17, 19, 22, 25];

// NEMA reflector
export const REFLECTOR_WIRING = 'QYHOGNECVPUZTFDJAXWMKISRBL';
