export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Typex rotor wirings — historically classified, these are plausible substitution permutations.
// Each string is a 26-char permutation of the alphabet representing the forward wiring.
export const ROTOR_DATA: Record<string, { wiring: string; notches: number[] }> = {
  'I':    { wiring: 'JPGVOUMFYQBENHZRDKASXLICTW', notches: [4, 13, 22] },
  'II':   { wiring: 'NZJHGRCXMYSWBOUFAIVLPEKQDT', notches: [7, 16, 25] },
  'III':  { wiring: 'FKQHTLXOCBJSPDZRAMEWNIUYGV', notches: [3, 11, 19] },
  'IV':   { wiring: 'ESOVPZJAYQUIRHXLNFTGKDCMWB', notches: [5, 14, 23] },
  'V':    { wiring: 'VZBRGITYUPSDNHLXAWMJQOFECK', notches: [9, 17, 24] },
  // Stator rotors (used in positions 1 & 2, don't step)
  'SA':   { wiring: 'QWERTYUIOPASDFGHJKLZXCVBNM', notches: [] },
  'SB':   { wiring: 'PLOKMIJNUHBYGVTFCRDXESZWAQ', notches: [] },
};

// Stepping rotors available for positions 3-5
export const STEPPING_ROTOR_TYPES = ['I', 'II', 'III', 'IV', 'V'];

// Stator rotors available for positions 1-2
export const STATOR_ROTOR_TYPES = ['SA', 'SB'];

// Reflector wiring
export const REFLECTOR_WIRING = 'YRUHQSLDPXNGOKMIEBFZCWVJAT';
