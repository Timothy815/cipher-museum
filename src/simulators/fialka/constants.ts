export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// 10 rotor wirings — historically inspired permutations
export const ROTOR_WIRINGS: Record<number, { wiring: string; blocking: number[] }> = {
  1:  { wiring: 'LPGSZMHAEOQKVXRFYBUTNICJDW', blocking: [2, 7, 14, 19, 23] },
  2:  { wiring: 'SLVGBTFXJQOHEWIRZYAMKPCNDU', blocking: [3, 8, 12, 18, 22] },
  3:  { wiring: 'CJGDPSHKTURAWZXFMYNQOBVLIE', blocking: [1, 6, 13, 17, 25] },
  4:  { wiring: 'FVPJIAOYEDRZXWGCTKUQSBNMHL', blocking: [4, 9, 15, 20, 24] },
  5:  { wiring: 'HBZGPQTDJLYCXMERWISOKUFAVN', blocking: [0, 5, 11, 16, 21] },
  6:  { wiring: 'QCYLXWENFTZOSMVJUDKGIARPHB', blocking: [2, 10, 14, 19, 23] },
  7:  { wiring: 'XYFUBJZPOGDCITKSMQNHRAWELV', blocking: [3, 7, 13, 18, 25] },
  8:  { wiring: 'DRLAIYSOGENJFHWTMBXZKVQPCU', blocking: [1, 8, 12, 17, 22] },
  9:  { wiring: 'MWTHYUESONIAFLPGDCJZBKRXVQ', blocking: [4, 6, 11, 20, 24] },
  10: { wiring: 'TNABORIJXLHWMPFZSVDYEGKCUQ', blocking: [0, 9, 15, 16, 21] },
};

export const REFLECTOR_WIRING = 'YRUHQSLDPXNGOKMIEBFZCWVJAT';

// Default card substitution (identity — no swap)
export const DEFAULT_CARD: Record<string, string> = {};
ALPHABET.split('').forEach(c => { DEFAULT_CARD[c] = c; });
