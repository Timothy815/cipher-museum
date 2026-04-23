/**
 * englishScore.ts
 * Shared English-fitness scoring utilities used by all cryptanalysis tools.
 * All scores: higher = more English-like (used by SA solvers).
 */

// ── Letter frequencies ────────────────────────────────────────────────
// Standard English, A–Z
export const ENG_FREQ: number[] = [
  0.0817, 0.0149, 0.0278, 0.0425, 0.1270, 0.0223, 0.0202, 0.0609,
  0.0697, 0.0015, 0.0077, 0.0403, 0.0241, 0.0675, 0.0751, 0.0193,
  0.0010, 0.0599, 0.0633, 0.0906, 0.0276, 0.0098, 0.0236, 0.0015,
  0.0197, 0.0007,
];

const _LOG_ENG = ENG_FREQ.map(f => Math.log10(f));
const _LETTER_FLOOR = Math.log10(1e-6);

// ── Bigram log-probabilities ──────────────────────────────────────────
// Counts per 10,000 bigrams in typical English text.
// Only top ~120 listed; everything else gets BIG_FLOOR.
const _BIG_RAW: [string, number][] = [
  ['TH',356],['HE',307],['IN',243],['ER',205],['AN',199],['RE',185],
  ['ON',176],['EN',175],['AT',149],['OU',146],['EA',131],['HI',128],
  ['ES',123],['ST',116],['NT',113],['IT',111],['TO',107],['OR',104],
  ['IS',102],['TE',101],['HA',100],['ND', 98],['TI', 97],['ED', 95],
  ['NG', 89],['AL', 88],['AS', 87],['OF', 86],['SI', 85],['LI', 84],
  ['ME', 83],['NC', 80],['SE', 79],['VE', 78],['IC', 77],['LE', 76],
  ['DE', 75],['AR', 74],['RI', 73],['NS', 72],['IO', 71],['SA', 70],
  ['NO', 69],['OT', 68],['BE', 67],['GH', 66],['EL', 65],['ET', 64],
  ['OM', 63],['AD', 62],['LA', 61],['HO', 60],['WA', 59],['CO', 58],
  ['FO', 57],['LL', 56],['WI', 55],['OW', 54],['SS', 53],['EC', 52],
  ['RS', 51],['AC', 50],['WH', 49],['RT', 48],['LO', 47],['SO', 45],
  ['UT', 44],['EE', 43],['MA', 42],['CA', 41],['CE', 40],['DO', 39],
  ['RO', 38],['WE', 38],['PR', 37],['NE', 35],['TU', 35],['LY', 34],
  ['IR', 33],['CH', 31],['TR', 32],['RD', 32],['EM', 30],['UN', 29],
  ['WO', 28],['CT', 28],['PE', 27],['IM', 26],['IL', 22],['LD', 22],
  ['GR', 22],['BL', 12],['GE', 19],['OO', 18],['FI', 18],['RN', 18],
  ['IF', 14],['UL', 14],['PO', 14],['OI', 10],['UA', 8], ['PH',  9],
  ['EI', 11],['OL', 15],['OC', 10],['EW', 12],['IG', 25],['EV', 16],
  ['KE', 12],['EX', 10],['OB',  8],['BU', 16],['FU',  8],['VI', 11],
  ['YO', 12],['YE',  8],['ID', 20],['BI', 10],['PL', 15],['ER',205],
];

const _BIG_MAP = new Map<string, number>();
export const BIG_FLOOR = Math.log10(1 / 100_000);
for (const [bg, cnt] of _BIG_RAW) {
  _BIG_MAP.set(bg, Math.log10(cnt / 10_000));
}

// ── Utilities ─────────────────────────────────────────────────────────

/** Strip non-alpha, uppercase */
export function clean(text: string): string {
  return text.toUpperCase().replace(/[^A-Z]/g, '');
}

/** Count A-Z occurrences (returns length-26 array) */
export function letterCounts(text: string): number[] {
  const cnt = new Array(26).fill(0);
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i) - 65;
    if (c >= 0 && c < 26) cnt[c]++;
  }
  return cnt;
}

// ── Scoring Functions ─────────────────────────────────────────────────

/** Log-likelihood that letter frequencies match English. Higher = better. */
export function letterScore(text: string): number {
  const t = clean(text);
  if (!t.length) return _LETTER_FLOOR * 50;
  const cnt = letterCounts(t);
  let s = 0;
  for (let i = 0; i < 26; i++) {
    s += cnt[i] > 0 ? cnt[i] * _LOG_ENG[i] : _LETTER_FLOOR * 0.05;
  }
  return s;
}

/** Sum of bigram log-probabilities. Higher = more English-like. */
export function bigramScore(text: string): number {
  const t = clean(text);
  let s = 0;
  for (let i = 0; i < t.length - 1; i++) {
    s += _BIG_MAP.get(t[i] + t[i + 1]) ?? BIG_FLOOR;
  }
  return s;
}

/** Combined fitness for SA. Higher = more English-like. */
export function fitness(text: string): number {
  const t = clean(text);
  if (t.length < 15) return letterScore(t);
  return bigramScore(t) + letterScore(t) * 0.15;
}

/** Chi-squared test against English letter frequencies. Lower = more English. */
export function chiSquared(text: string): number {
  const t = clean(text);
  if (!t.length) return 1e9;
  const cnt = letterCounts(t);
  const n = t.length;
  return ENG_FREQ.reduce((acc, ef, i) => {
    const e = n * ef;
    return acc + (cnt[i] - e) ** 2 / e;
  }, 0);
}

/** Index of Coincidence (English ≈ 0.0667, random ≈ 0.0385) */
export function ioc(text: string): number {
  const t = clean(text);
  if (t.length < 2) return 0;
  const cnt = letterCounts(t);
  const n = t.length;
  return cnt.reduce((acc, c) => acc + c * (c - 1), 0) / (n * (n - 1));
}

/** Shannon entropy in bits per byte. Random/encrypted ≈ 8, English text ≈ 3.5-4.5 */
export function shannonEntropy(bytes: Uint8Array | number[]): number {
  const cnt = new Array(256).fill(0);
  for (const b of bytes) cnt[b]++;
  const n = bytes instanceof Uint8Array ? bytes.length : bytes.length;
  let H = 0;
  for (const c of cnt) {
    if (c > 0) { const p = c / n; H -= p * Math.log2(p); }
  }
  return H;
}

/** Hamming distance (bit flips) between two equal-length byte arrays */
export function hamming(a: Uint8Array, b: Uint8Array): number {
  let d = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    let x = a[i] ^ b[i];
    while (x) { d += x & 1; x >>= 1; }
  }
  return d;
}

/** Parse a hex string to Uint8Array. Ignores spaces. */
export function hexToBytes(hex: string): Uint8Array | null {
  const h = hex.replace(/\s/g, '');
  if (h.length % 2 !== 0 || /[^0-9a-fA-F]/.test(h)) return null;
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(h.slice(i*2, i*2+2), 16);
  return out;
}

/** Parse base64 to Uint8Array */
export function b64ToBytes(b64: string): Uint8Array | null {
  try {
    const bin = atob(b64.trim());
    return new Uint8Array(bin.length).map((_, i) => bin.charCodeAt(i));
  } catch { return null; }
}

/** Auto-detect format (hex / base64 / ascii) and return bytes */
export function autoBytes(input: string): { bytes: Uint8Array; format: string } | null {
  const trimmed = input.trim();
  // Try hex
  const hexClean = trimmed.replace(/\s/g, '');
  if (hexClean.length > 0 && hexClean.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(hexClean)) {
    const b = hexToBytes(hexClean);
    if (b) return { bytes: b, format: 'hex' };
  }
  // Try base64
  if (/^[A-Za-z0-9+/=\s]+$/.test(trimmed) && trimmed.length % 4 === 0) {
    const b = b64ToBytes(trimmed);
    if (b && b.length > 2) return { bytes: b, format: 'base64' };
  }
  // Raw ASCII
  if (trimmed.length > 0) {
    return { bytes: new TextEncoder().encode(trimmed), format: 'ascii' };
  }
  return null;
}
