import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Info, X, Play, Pause, SkipBack, SkipForward, RotateCcw, Layers, Shuffle } from 'lucide-react';

// ── AES-128 S-Box (Rijndael) ──────────────────────────────────────────────────
const SBOX: number[] = [
  0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
  0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
  0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
  0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
  0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
  0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
  0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
  0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
  0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
  0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
  0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
  0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
  0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
  0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
  0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
  0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16,
];
const INV_SBOX: number[] = (() => {
  const inv = new Array(256).fill(0);
  SBOX.forEach((v, i) => { inv[v] = i; });
  return inv;
})();
// Round constants for key expansion
const RCON: number[] = [0x01,0x02,0x04,0x08,0x10,0x20,0x40,0x80,0x1b,0x36];

// ── GF(2^8) multiplication ────────────────────────────────────────────────────
function gmul(a: number, b: number): number {
  let p = 0;
  for (let i = 0; i < 8; i++) {
    if (b & 1) p ^= a;
    const hi = a & 0x80;
    a = (a << 1) & 0xff;
    if (hi) a ^= 0x1b;
    b >>= 1;
  }
  return p;
}

// ── State type: column-major 4×4 byte matrix ─────────────────────────────────
// state[col][row], col ∈ [0,3], row ∈ [0,3]
type AESState = number[][];

function newState(): AESState { return Array.from({ length: 4 }, () => [0, 0, 0, 0]); }
function cloneState(s: AESState): AESState { return s.map(c => [...c]); }

function bytesToState(bytes: number[]): AESState {
  const s = newState();
  for (let i = 0; i < 16; i++) s[i >> 2][i & 3] = bytes[i] ?? 0;
  return s;
}

function stateToBytes(s: AESState): number[] {
  const out: number[] = [];
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) out.push(s[c][r]);
  return out;
}

function bitDiffCount(a: AESState, b: AESState): number {
  let count = 0;
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++) {
      let v = (a[c][r] ^ b[c][r]);
      while (v) { count += v & 1; v >>>= 1; }
    }
  return count;
}

// ── AES-128 operations ────────────────────────────────────────────────────────
function subBytesOp(s: AESState): AESState {
  const out = cloneState(s);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) out[c][r] = SBOX[s[c][r]];
  return out;
}

function shiftRowsOp(s: AESState): AESState {
  const out = cloneState(s);
  for (let r = 1; r < 4; r++) for (let c = 0; c < 4; c++) out[c][r] = s[(c + r) % 4][r];
  return out;
}

function mixColumnsOp(s: AESState): AESState {
  const out = cloneState(s);
  for (let c = 0; c < 4; c++) {
    const a = s[c];
    out[c][0] = gmul(a[0], 2) ^ gmul(a[1], 3) ^ a[2] ^ a[3];
    out[c][1] = a[0] ^ gmul(a[1], 2) ^ gmul(a[2], 3) ^ a[3];
    out[c][2] = a[0] ^ a[1] ^ gmul(a[2], 2) ^ gmul(a[3], 3);
    out[c][3] = gmul(a[0], 3) ^ a[1] ^ a[2] ^ gmul(a[3], 2);
  }
  return out;
}

function addRoundKeyOp(s: AESState, rk: AESState): AESState {
  const out = cloneState(s);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) out[c][r] = s[c][r] ^ rk[c][r];
  return out;
}

function invSubBytesOp(s: AESState): AESState {
  const out = cloneState(s);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) out[c][r] = INV_SBOX[s[c][r]];
  return out;
}

function invShiftRowsOp(s: AESState): AESState {
  const out = cloneState(s);
  for (let r = 1; r < 4; r++) for (let c = 0; c < 4; c++) out[c][r] = s[(c - r + 4) % 4][r];
  return out;
}

function invMixColumnsOp(s: AESState): AESState {
  const out = cloneState(s);
  for (let c = 0; c < 4; c++) {
    const a = s[c];
    out[c][0] = gmul(a[0], 14) ^ gmul(a[1], 11) ^ gmul(a[2], 13) ^ gmul(a[3], 9);
    out[c][1] = gmul(a[0], 9)  ^ gmul(a[1], 14) ^ gmul(a[2], 11) ^ gmul(a[3], 13);
    out[c][2] = gmul(a[0], 13) ^ gmul(a[1], 9)  ^ gmul(a[2], 14) ^ gmul(a[3], 11);
    out[c][3] = gmul(a[0], 11) ^ gmul(a[1], 13) ^ gmul(a[2], 9)  ^ gmul(a[3], 14);
  }
  return out;
}

// ── AES-128 key expansion (11 round keys, 16 bytes each) ─────────────────────
function keyExpansion128(keyBytes: number[]): AESState[] {
  const w: number[][] = [];
  for (let i = 0; i < 4; i++)
    w.push([keyBytes[4*i]??0, keyBytes[4*i+1]??0, keyBytes[4*i+2]??0, keyBytes[4*i+3]??0]);
  for (let i = 4; i < 44; i++) {
    let temp = [...w[i - 1]];
    if (i % 4 === 0) {
      // RotWord → SubWord → XOR with Rcon
      temp = [SBOX[temp[1]] ^ RCON[i / 4 - 1], SBOX[temp[2]], SBOX[temp[3]], SBOX[temp[0]]];
    }
    w.push(w[i - 4].map((b, j) => b ^ temp[j]));
  }
  return Array.from({ length: 11 }, (_, r) =>
    Array.from({ length: 4 }, (_, c) => [...w[r * 4 + c]])
  );
}

// ── Stage type definitions ────────────────────────────────────────────────────
type StepType = 'plain' | 'addKey' | 'subBytes' | 'shiftRows' | 'mixCols' | 'cipher';

interface AESStage {
  type: StepType;
  label: string;
  round: number;
  state: AESState;
  prevState?: AESState;
  roundKey?: AESState;
}

// ── Compute encrypt stages (41 total: 0=plain, 1=addKey0, 2-40=rounds) ────────
function computeEncryptStages(ptBytes: number[], keyBytes: number[]): AESStage[] {
  const rks = keyExpansion128(keyBytes);
  const stages: AESStage[] = [];
  let s = bytesToState(ptBytes);

  stages.push({ type: 'plain', label: 'Plaintext', round: 0, state: cloneState(s) });

  const p0 = cloneState(s);
  s = addRoundKeyOp(s, rks[0]);
  stages.push({ type: 'addKey', label: 'Initial AddRoundKey', round: 0, state: cloneState(s), prevState: p0, roundKey: cloneState(rks[0]) });

  for (let r = 1; r <= 10; r++) {
    const pSub = cloneState(s);
    s = subBytesOp(s);
    stages.push({ type: 'subBytes', label: `SubBytes R${r}`, round: r, state: cloneState(s), prevState: pSub });

    const pShift = cloneState(s);
    s = shiftRowsOp(s);
    stages.push({ type: 'shiftRows', label: `ShiftRows R${r}`, round: r, state: cloneState(s), prevState: pShift });

    if (r < 10) {
      const pMix = cloneState(s);
      s = mixColumnsOp(s);
      stages.push({ type: 'mixCols', label: `MixColumns R${r}`, round: r, state: cloneState(s), prevState: pMix });
    }

    const pArk = cloneState(s);
    s = addRoundKeyOp(s, rks[r]);
    stages.push({
      type: r === 10 ? 'cipher' : 'addKey',
      label: r === 10 ? `AddRoundKey R${r}  →  Ciphertext` : `AddRoundKey R${r}`,
      round: r, state: cloneState(s), prevState: pArk, roundKey: cloneState(rks[r]),
    });
  }
  return stages; // 41 stages: indices 0-40
}

// ── Compute decrypt stages (41 total) ─────────────────────────────────────────
function computeDecryptStages(ctBytes: number[], keyBytes: number[]): AESStage[] {
  const rks = keyExpansion128(keyBytes);
  const stages: AESStage[] = [];
  let s = bytesToState(ctBytes);

  stages.push({ type: 'cipher', label: 'Ciphertext', round: 10, state: cloneState(s) });

  // Undo final round (no InvMixColumns for round 10)
  const p10 = cloneState(s);
  s = addRoundKeyOp(s, rks[10]);
  stages.push({ type: 'addKey', label: 'Undo AddRoundKey R10', round: 10, state: cloneState(s), prevState: p10, roundKey: cloneState(rks[10]) });

  const pSh10 = cloneState(s);
  s = invShiftRowsOp(s);
  stages.push({ type: 'shiftRows', label: 'Inv ShiftRows R10', round: 10, state: cloneState(s), prevState: pSh10 });

  const pSb10 = cloneState(s);
  s = invSubBytesOp(s);
  stages.push({ type: 'subBytes', label: 'Inv SubBytes R10', round: 10, state: cloneState(s), prevState: pSb10 });

  // Rounds 9 down to 1: AddRoundKey, InvMixColumns, InvShiftRows, InvSubBytes
  for (let r = 9; r >= 1; r--) {
    const pArk = cloneState(s);
    s = addRoundKeyOp(s, rks[r]);
    stages.push({ type: 'addKey', label: `Undo AddRoundKey R${r}`, round: r, state: cloneState(s), prevState: pArk, roundKey: cloneState(rks[r]) });

    const pMix = cloneState(s);
    s = invMixColumnsOp(s);
    stages.push({ type: 'mixCols', label: `Inv MixColumns R${r}`, round: r, state: cloneState(s), prevState: pMix });

    const pShift = cloneState(s);
    s = invShiftRowsOp(s);
    stages.push({ type: 'shiftRows', label: `Inv ShiftRows R${r}`, round: r, state: cloneState(s), prevState: pShift });

    const pSub = cloneState(s);
    s = invSubBytesOp(s);
    stages.push({ type: 'subBytes', label: `Inv SubBytes R${r}`, round: r, state: cloneState(s), prevState: pSub });
  }

  const pFinal = cloneState(s);
  s = addRoundKeyOp(s, rks[0]);
  stages.push({ type: 'plain', label: 'Undo Initial AddRoundKey  →  Plaintext', round: 0, state: cloneState(s), prevState: pFinal, roundKey: cloneState(rks[0]) });

  return stages; // 41 stages: indices 0-40
}

// ── Hex helpers ───────────────────────────────────────────────────────────────
function hx(b: number): string { return b.toString(16).padStart(2, '0'); }

function parseHex32(s: string): number[] {
  const clean = s.replace(/\s/g, '').toLowerCase().padEnd(32, '0').slice(0, 32);
  const bytes: number[] = [];
  for (let i = 0; i < 32; i += 2) {
    const h = clean.slice(i, i + 2);
    bytes.push(parseInt(h, 16) || 0);
  }
  return bytes;
}

function isValidHex32(s: string): boolean {
  return /^[0-9a-fA-F]{32}$/.test(s.replace(/\s/g, ''));
}

function randomHex32(): string {
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('').toUpperCase();
}

function stateHexSummary(s: AESState): string {
  return stateToBytes(s).map(hx).join('');
}

// ── Color system ──────────────────────────────────────────────────────────────
interface TypeColors { badge: string; cell: string; border: string; text: string; bg: string; }

function typeColors(type: StepType): TypeColors {
  switch (type) {
    case 'plain':     return { badge: 'bg-amber-900/40 text-amber-400 border border-amber-700/40',   cell: 'bg-amber-900/60 border-amber-600 text-amber-200',   border: 'border-amber-900/40',  text: 'text-amber-400',  bg: 'bg-amber-950/20' };
    case 'addKey':    return { badge: 'bg-violet-900/40 text-violet-400 border border-violet-700/40', cell: 'bg-violet-900/60 border-violet-600 text-violet-200', border: 'border-violet-900/40', text: 'text-violet-400', bg: 'bg-violet-950/20' };
    case 'subBytes':  return { badge: 'bg-green-900/40 text-green-400 border border-green-700/40',   cell: 'bg-green-900/60 border-green-600 text-green-200',   border: 'border-green-900/40',  text: 'text-green-400',  bg: 'bg-green-950/20' };
    case 'shiftRows': return { badge: 'bg-blue-900/40 text-blue-400 border border-blue-700/40',      cell: 'bg-blue-900/60 border-blue-600 text-blue-200',      border: 'border-blue-900/40',   text: 'text-blue-400',   bg: 'bg-blue-950/20' };
    case 'mixCols':   return { badge: 'bg-orange-900/40 text-orange-400 border border-orange-700/40', cell: 'bg-orange-900/60 border-orange-600 text-orange-200', border: 'border-orange-900/40', text: 'text-orange-400', bg: 'bg-orange-950/20' };
    case 'cipher':    return { badge: 'bg-cyan-900/40 text-cyan-400 border border-cyan-700/40',      cell: 'bg-cyan-900/60 border-cyan-600 text-cyan-200',      border: 'border-cyan-900/40',   text: 'text-cyan-400',   bg: 'bg-cyan-950/20' };
  }
}

// ── Mini 4×4 state grid (for pipeline rows) ───────────────────────────────────
function MiniGrid({ state, prevState, type }: { state: AESState; prevState?: AESState; type: StepType }) {
  const c = typeColors(type);
  return (
    <div className="flex flex-col gap-[1px]">
      {[0, 1, 2, 3].map(row => (
        <div key={row} className="flex gap-[1px]">
          {[0, 1, 2, 3].map(col => {
            const changed = prevState && prevState[col][row] !== state[col][row];
            return (
              <div key={col} className={`w-[22px] h-[15px] flex items-center justify-center text-[8px] font-mono font-bold rounded-[2px] border transition-colors ${
                changed ? c.cell : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}>
                {hx(state[col][row])}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Full 4×4 state grid (for detail panel) ────────────────────────────────────
function FullGrid({ state, prevState, type, label }: { state: AESState; prevState?: AESState; type?: StepType; label: string }) {
  const c = type ? typeColors(type) : null;
  return (
    <div>
      {label && <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{label}</div>}
      <div className="grid grid-cols-4 gap-[3px]">
        {[0, 1, 2, 3].map(row => [0, 1, 2, 3].map(col => {
          const byte = state[col][row];
          const changed = prevState && prevState[col][row] !== byte;
          return (
            <div key={`${row}-${col}`} className={`w-9 h-7 flex items-center justify-center font-mono text-xs font-bold rounded border transition-all ${
              changed && c ? c.cell : 'bg-slate-800/60 border-slate-700/50 text-slate-300'
            }`}>
              {hx(byte)}
            </div>
          );
        }))}
      </div>
    </div>
  );
}

// ── Explanations ──────────────────────────────────────────────────────────────
interface Explanation { heading: string; what: string; why: string; tip?: string; }

function getExplanation(type: StepType, round: number, isDecrypt: boolean): Explanation {
  switch (type) {
    case 'plain':
      return {
        heading: isDecrypt ? 'Recovered Plaintext' : 'Input Plaintext',
        what: isDecrypt
          ? 'All 10 rounds have been reversed. The final XOR with Round Key 0 recovers the original plaintext — 16 bytes in the State matrix, read column-by-column to produce the original byte sequence.'
          : 'The 16-byte plaintext is loaded into a 4×4 byte matrix called the State. Bytes are placed column-by-column: bytes 0–3 fill column 0, bytes 4–7 fill column 1, and so on. Every subsequent AES operation acts on this matrix as a whole.',
        why: isDecrypt
          ? 'AES decryption is the exact arithmetic inverse of encryption. Every operation (SubBytes, ShiftRows, MixColumns, AddRoundKey) has a computable inverse. Using the correct key in the correct order perfectly recovers the plaintext. Any wrong key bit anywhere in the 128-bit key produces a completely different, meaningless output.'
          : 'Operating on a 4×4 matrix rather than a flat bit string enables each operation to provide a distinct geometric action — row rotation, column mixing, non-linear byte substitution — that together achieve complete confusion and diffusion across all 128 bits within just two rounds.',
        tip: isDecrypt
          ? 'Switch to Encrypt mode to see the forward process. The same key and the same 41 steps in reverse order recover your original message perfectly.'
          : 'AES-128 encrypts exactly 128 bits at a time. The plaintext here is treated as a single 16-byte block. Click through all 41 stages to watch these bytes transform into statistically random ciphertext.',
      };

    case 'addKey':
      if (round === 0 && !isDecrypt) return {
        heading: 'Initial Key Whitening — AddRoundKey',
        what: 'Each of the 16 bytes in the State is XORed with the corresponding byte of Round Key 0 (the first 16 bytes of the master key). XOR is bitwise: each bit is independently flipped or preserved depending on the matching key bit.',
        why: 'Without this initial XOR, the first SubBytes layer would see the raw plaintext. An attacker who knows the plaintext could reverse SubBytes and ShiftRows to expose round key material. Key whitening at both ends of the cipher — before round 1 and after round 10 — closes that structural weakness. This technique was used in DES as well.',
        tip: 'XOR is self-inverse: (x ⊕ k) ⊕ k = x. Decryption does not need a "reverse XOR" operation — it XORs with the same round key again.',
      };
      if (round === 0 && isDecrypt) return {
        heading: 'Undo Initial Key Whitening',
        what: 'The very first step of AES encryption was XOR with Round Key 0. Decryption ends by XORing with Round Key 0 again. Since XOR is self-inverse, this perfectly cancels the original whitening and reveals the plaintext.',
        why: 'This is the final step of decryption. Every other inverse operation has already been applied in reverse order. If the correct key was used throughout, this final XOR produces the exact original plaintext. Any wrong key produces random garbage.',
        tip: 'The decrypt pipeline works backwards through the key schedule: Round Key 10 first, then 9, 8, … 1, and finally Round Key 0 here at the end.',
      };
      return {
        heading: isDecrypt ? `Undo AddRoundKey R${round}` : `Round ${round} — AddRoundKey`,
        what: isDecrypt
          ? `Each byte of the State is XORed with Round Key ${round}, cancelling the XOR that encryption performed at this same point. XOR with the same value twice returns the original: (state ⊕ key) ⊕ key = state.`
          : `Each byte of the State is XORed with the corresponding byte of Round Key ${round}. This injects ${round === 10 ? 'the final round\'s' : `round ${round}'s`} key material into the cipher, binding the ciphertext irrevocably to the secret key.`,
        why: isDecrypt
          ? 'Subkeys are applied in reverse order during decryption. Using a subkey in the wrong order — even with the correct master key — produces garbage. This ordering is part of what makes partial-key recovery attacks so hard: knowing one round key does not directly reveal adjacent round keys.'
          : `Key injection every round is what makes AES a cipher rather than a fixed permutation. Without AddRoundKey, an attacker could precompute the entire cipher table offline with no knowledge of the key. The key schedule derives Round Key ${round} from the master key via independent RotWord, SubWord, and Rcon XOR steps, making each round key statistically independent.`,
        tip: round <= 2 && !isDecrypt ? 'Notice how even just one or two rounds of AddRoundKey + SubBytes + ShiftRows already produce a state where all 16 bytes look different from the plaintext.' : undefined,
      };

    case 'subBytes':
      return {
        heading: `${isDecrypt ? 'Inverse ' : ''}SubBytes — Byte Substitution (Round ${round})`,
        what: isDecrypt
          ? `Each of the 16 bytes in the State is independently looked up in the Inverse Rijndael S-box (INV_SBOX). If the forward S-box mapped byte A → B, the inverse maps B → A. All 16 lookups happen in parallel — no byte influences any other byte during this step.`
          : `Each of the 16 bytes in the State is independently looked up in the Rijndael S-box — a fixed 256-entry table. The byte value (0x00–0xFF) is the table index; the entry at that index becomes the new byte. All 16 substitutions happen in parallel.`,
        why: `SubBytes is AES's only non-linear operation — the source of confusion. The Rijndael S-box is constructed as the GF(2^8) multiplicative inverse of the input byte (the most algebraically non-linear function in GF(2^8)), followed by a fixed affine transformation. This two-step construction was chosen to maximise non-linearity while providing proven resistance to both differential and linear cryptanalysis. Without SubBytes, AES would be a linear transformation over GF(2) and could be broken by solving a system of linear equations with just a handful of known plaintext-ciphertext pairs.`,
        tip: isDecrypt
          ? 'The inverse S-box is precomputed: INV_SBOX[i] = the unique j such that SBOX[j] = i. It has no fixed points either — INV_SBOX[b] ≠ b for all b.'
          : 'The Rijndael S-box has no fixed points (SBOX[b] ≠ b for all b) and no byte maps to zero from a non-zero input (SBOX[b] ≠ 0 for b ≠ 0). Both properties help resist differential cryptanalysis.',
      };

    case 'shiftRows':
      return {
        heading: `${isDecrypt ? 'Inverse ' : ''}ShiftRows — Row Rotation (Round ${round})`,
        what: isDecrypt
          ? `The three bottom rows of the State are cyclically shifted right (right = inverse of left). Row 0: no shift. Row 1: shifts right by 1. Row 2: shifts right by 2. Row 3: shifts right by 3. This exactly reverses the forward ShiftRows.`
          : `The four rows of the State matrix are independently rotated left. Row 0: no shift. Row 1: shifts left by 1. Row 2: shifts left by 2. Row 3: shifts left by 3.`,
        why: `ShiftRows is AES's inter-column diffusion step. MixColumns alone only mixes bytes within each column — a change in one column could never affect other columns without ShiftRows. After ShiftRows, each column contains bytes from all four original columns. MixColumns then spreads each of those bytes to all four positions in its column. The combination means a single byte change propagates to all 16 State bytes within two rounds — the Wide Trail design strategy.`,
        tip: `The shift amounts [0,1,2,3] were mathematically optimised. Any other assignment would leave a subset of columns independent for more than two rounds, weakening the cipher.`,
      };

    case 'mixCols':
      return {
        heading: `${isDecrypt ? 'Inverse ' : ''}MixColumns — Column Mixing in GF(2⁸) (Round ${round})`,
        what: isDecrypt
          ? `Each column of the State is multiplied by the inverse MixColumns matrix [14,11,13,9 / 9,14,11,13 / 13,9,14,11 / 11,13,9,14] in GF(2^8). This exactly undoes the forward MixColumns for each column independently.`
          : `Each of the four columns is treated as a four-element vector over GF(2^8) and multiplied by the fixed matrix [2,3,1,1 / 1,2,3,1 / 1,1,2,3 / 3,1,1,2]. Every output byte is a GF(2^8) linear combination of all four input bytes from the same column.`,
        why: `MixColumns provides intra-column diffusion. A single byte change within one column produces changes in all four bytes of that column after MixColumns. Combined with ShiftRows (which moves bytes across columns), two rounds of SubBytes → ShiftRows → MixColumns guarantee that every output byte depends on every input byte — full diffusion in two rounds. GF(2^8) arithmetic is used because it preserves the binary structure (no carry), is fully invertible, and maps cleanly to hardware: multiplication by 2 is a conditional shift-and-XOR.`,
        tip: isDecrypt
          ? 'Notice that InvMixColumns uses larger multipliers (9, 11, 13, 14) than the forward version (1, 2, 3). The inverse matrix was computed over GF(2^8) to satisfy [2,3,1,1] × [14,11,13,9] = identity (mod GF(2^8)).'
          : 'The final AES round (Round 10) deliberately omits MixColumns. The subsequent AddRoundKey provides equivalent security without the extra computation — this is a conscious design economy, not an oversight.',
      };

    case 'cipher':
      return {
        heading: isDecrypt ? 'Input Ciphertext' : 'Output Ciphertext',
        what: isDecrypt
          ? 'Decryption begins here. The 16-byte ciphertext — the output of AES encryption — is loaded into the 4×4 State matrix in column-major order. Every bit depends on every plaintext bit and every key bit from the original encryption.'
          : 'All 10 AES-128 rounds are complete. The 16-byte State is now the ciphertext — statistically indistinguishable from random noise. Reading the State column-by-column gives the 16 ciphertext bytes.',
        why: isDecrypt
          ? 'AES is a symmetric cipher: the same 128-bit key encrypts and decrypts. Decryption applies the exact inverse operations in the exact reverse order, peeling back each round of diffusion and confusion until the original plaintext is recovered.'
          : 'Each of the 128 output bits depends on all 128 input bits and all 128 key bits. SubBytes provides confusion (non-linear key-plaintext mixing). ShiftRows + MixColumns provide diffusion (every bit influences every other bit within two rounds). Together in 10 rounds, they produce ciphertext that reveals nothing about the plaintext without the key.',
        tip: isDecrypt
          ? 'Try Avalanche mode to see how a 1-bit change in the ciphertext scrambles the recovered plaintext almost completely — 64 bits changed on average.'
          : 'Switch to Avalanche mode. Flip 1 bit of the plaintext and watch how quickly the change spreads: by Round 2, nearly all 128 output bits are affected.',
      };
  }
}

// ── Main component ────────────────────────────────────────────────────────────
const AESRoundApp: React.FC = () => {
  // NIST FIPS 197 test vector (AES-128)
  const [ptHex,  setPtHex]  = useState('00112233445566778899AABBCCDDEEFF');
  const [keyHex, setKeyHex] = useState('000102030405060708090A0B0C0D0E0F');
  const [ptError,  setPtError]  = useState('');
  const [keyError, setKeyError] = useState('');
  const [mode, setMode]         = useState<'encrypt' | 'decrypt' | 'avalanche'>('encrypt');
  const [stage, setStage]       = useState(0);
  const [playing, setPlaying]   = useState(false);
  const [speed, setSpeed]       = useState(600);
  const [showInfo, setShowInfo] = useState(false);
  const [showKeySchedule, setShowKeySchedule] = useState(false);
  const [flipTarget, setFlipTarget] = useState<'pt' | 'key'>('pt');
  const [flipBit, setFlipBit]       = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const validPt  = isValidHex32(ptHex);
  const validKey = isValidHex32(keyHex);

  const ptBytes  = validPt  ? parseHex32(ptHex)  : new Array(16).fill(0);
  const keyBytes = validKey ? parseHex32(keyHex) : new Array(16).fill(0);

  const encStages  = computeEncryptStages(ptBytes, keyBytes);
  const ctBytes    = stateToBytes(encStages[40].state);
  const decStages  = computeDecryptStages(ctBytes, keyBytes);
  const roundKeys  = keyExpansion128(keyBytes);

  const stages      = mode === 'decrypt' ? decStages : encStages;
  const totalStages = 41;
  const currentStage = stages[stage] ?? stages[0];

  // Avalanche: flip 1 bit in plaintext or key
  const modPtBytes  = ptBytes.map((b, i) => flipTarget === 'pt'  && i === Math.floor(flipBit / 8) ? b ^ (1 << (7 - (flipBit % 8))) : b);
  const modKeyBytes = keyBytes.map((b, i) => flipTarget === 'key' && i === Math.floor(flipBit / 8) ? b ^ (1 << (7 - (flipBit % 8))) : b);
  const modEncStages = computeEncryptStages(modPtBytes, modKeyBytes);
  const avalancheDiffs = encStages.map((st, i) => bitDiffCount(st.state, modEncStages[i].state));

  const handlePtChange = (v: string) => {
    const clean = v.replace(/[^0-9A-Fa-f]/g, '').toUpperCase().slice(0, 32);
    setPtHex(clean);
    setPtError(clean.length < 32 ? 'Need 32 hex chars (16 bytes)' : '');
  };
  const handleKeyChange = (v: string) => {
    const clean = v.replace(/[^0-9A-Fa-f]/g, '').toUpperCase().slice(0, 32);
    setKeyHex(clean);
    setKeyError(clean.length < 32 ? 'Need 32 hex chars (16 bytes)' : '');
  };

  const reset = useCallback(() => { setPlaying(false); setStage(0); }, []);
  const stepFwd = useCallback(() => setStage(s => Math.min(s + 1, 40)), []);
  const stepBck = useCallback(() => setStage(s => Math.max(s - 1, 0)), []);

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setStage(s => { if (s >= 40) { setPlaying(false); return 40; } return s + 1; });
      }, speed);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, speed]);

  useEffect(() => { if (stage >= 40) setPlaying(false); }, [stage]);
  useEffect(() => { reset(); }, [ptHex, keyHex, mode, reset]);

  const isDecrypt = mode === 'decrypt';
  const activeType = currentStage.type;
  const expl = getExplanation(activeType, currentStage.round, isDecrypt);
  const colors = typeColors(activeType);

  // Round group separator: show a divider before the first stage of each round
  function isRoundStart(idx: number): boolean {
    if (idx === 0) return false;
    const cur = stages[idx];
    const prev = stages[idx - 1];
    return cur.round !== prev.round;
  }

  return (
    <div className="flex-1 bg-[#1a1814] flex flex-col overflow-hidden">

      {/* ── TOP STRIP ──────────────────────────────────────────────────────── */}
      <div className="bg-[#1a1814] border-b border-slate-800/60 px-8 pt-5 pb-4 flex-shrink-0">

        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-violet-900/30 border border-violet-700/40">
              <Layers size={28} className="text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-violet-300 tracking-wide">AES-128 ROUND VISUALIZER</h1>
              <p className="text-sm text-slate-400 mt-0.5">Advanced Encryption Standard · 10-Round Internal Pipeline</p>
            </div>
          </div>
          <button onClick={() => setShowInfo(v => !v)}
            className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-violet-700/50 transition-colors flex-shrink-0">
            {showInfo ? <X size={20} className="text-violet-400" /> : <Info size={20} className="text-violet-400" />}
          </button>
        </div>

        {/* Collapsible info */}
        {showInfo && (
          <div className="bg-violet-950/20 border border-violet-900/40 rounded-xl p-6 space-y-3 text-sm text-slate-300 leading-relaxed mb-4">
            <h2 className="text-base font-bold text-violet-300">AES-128 — The Production SPN</h2>
            <p>AES (Rijndael) is a Substitution-Permutation Network operating on a 4×4 byte State matrix. AES-128 uses a 128-bit key and 10 rounds. Each round (except the last) applies four operations in sequence: <strong className="text-white">SubBytes</strong> (non-linear S-box substitution), <strong className="text-white">ShiftRows</strong> (inter-column diffusion), <strong className="text-white">MixColumns</strong> (intra-column diffusion in GF(2⁸)), and <strong className="text-white">AddRoundKey</strong> (key injection). The final round omits MixColumns.</p>
            <p>This is the direct evolution of the educational SPN: replace 4-bit nibbles with 8-bit bytes, scale to 16 bytes (128 bits), and run 10 rounds with a proper key schedule. The same four principles — confusion, diffusion, key injection, and iteration — produce a cipher that secures most of the world's encrypted traffic.</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 pt-1">
              {(['addKey', 'subBytes', 'shiftRows', 'mixCols', 'cipher'] as StepType[]).map(t => {
                const c = typeColors(t);
                const label = t === 'addKey' ? 'AddRoundKey' : t === 'subBytes' ? 'SubBytes' : t === 'shiftRows' ? 'ShiftRows' : t === 'mixCols' ? 'MixColumns' : 'Ciphertext';
                return (
                  <div key={t} className={`px-3 py-2 rounded-lg text-xs font-mono text-center ${c.badge}`}>
                    {label}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Inputs + mode + controls */}
        <div className="flex flex-wrap items-end gap-5">
          {/* Plaintext */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Plaintext (32 hex)</label>
            <div className="flex items-center gap-2">
              <input value={ptHex} onChange={e => handlePtChange(e.target.value)}
                className={`bg-slate-900/80 border rounded-lg px-3 py-2 font-mono text-xs text-white focus:outline-none w-60 ${ptError ? 'border-red-600' : 'border-slate-700 focus:border-violet-700/50'}`}
                placeholder="00112233445566778899AABBCCDDEEFF" maxLength={32} />
              <button onClick={() => handlePtChange(randomHex32())}
                className="p-2 rounded-lg bg-slate-800 border border-slate-700 hover:border-violet-600/50 transition-colors" title="Randomize">
                <Shuffle size={14} className="text-slate-400" />
              </button>
            </div>
            {ptError && <span className="text-[10px] text-red-400">{ptError}</span>}
          </div>

          {/* Key */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Key (32 hex)</label>
            <div className="flex items-center gap-2">
              <input value={keyHex} onChange={e => handleKeyChange(e.target.value)}
                className={`bg-slate-900/80 border rounded-lg px-3 py-2 font-mono text-xs text-white focus:outline-none w-60 ${keyError ? 'border-red-600' : 'border-slate-700 focus:border-violet-700/50'}`}
                placeholder="000102030405060708090A0B0C0D0E0F" maxLength={32} />
              <button onClick={() => handleKeyChange(randomHex32())}
                className="p-2 rounded-lg bg-slate-800 border border-slate-700 hover:border-violet-600/50 transition-colors" title="Randomize">
                <Shuffle size={14} className="text-slate-400" />
              </button>
            </div>
            {keyError && <span className="text-[10px] text-red-400">{keyError}</span>}
          </div>

          {/* Mode */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mode</label>
            <div className="flex items-center gap-1">
              {(['encrypt', 'decrypt', 'avalanche'] as const).map(m => (
                <button key={m} onClick={() => { setMode(m); setStage(0); setPlaying(false); }}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors capitalize ${
                    mode === m
                      ? m === 'encrypt' ? 'bg-violet-900/50 text-violet-200 border border-violet-600/60'
                      : m === 'decrypt' ? 'bg-cyan-900/50 text-cyan-200 border border-cyan-600/60'
                      : 'bg-orange-900/50 text-orange-200 border border-orange-600/60'
                      : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
                  }`}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Avalanche controls */}
          {mode === 'avalanche' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Flip 1 bit</label>
              <div className="flex items-center gap-2">
                {(['pt', 'key'] as const).map(t => (
                  <button key={t} onClick={() => { setFlipTarget(t); setFlipBit(0); }}
                    className={`px-2 py-1.5 rounded text-xs transition-colors ${flipTarget === t ? 'bg-orange-900/50 text-orange-200 border border-orange-600/50' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'}`}>
                    {t === 'pt' ? 'Plaintext' : 'Key'}
                  </button>
                ))}
                <span className="text-slate-500 text-xs">bit</span>
                <input type="number" min={0} max={127} value={flipBit}
                  onChange={e => setFlipBit(Math.max(0, Math.min(127, parseInt(e.target.value) || 0)))}
                  className="bg-slate-900/80 border border-slate-700 rounded-lg px-2 py-1.5 font-mono text-xs text-white w-14 focus:outline-none focus:border-orange-600/50" />
                <span className="text-[10px] text-slate-500">of 0–127</span>
              </div>
            </div>
          )}

          <div className="h-10 w-px bg-slate-700/60 self-center" />

          {/* Playback */}
          {mode !== 'avalanche' && (
            <>
              <div className="flex items-center gap-2">
                <button onClick={stepBck} disabled={stage === 0}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40 transition-colors text-sm">
                  <SkipBack size={14} /> Back
                </button>
                <button onClick={() => setPlaying(p => !p)} disabled={stage >= 40 && !playing}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600/20 border border-violet-700/50 text-violet-300 hover:bg-violet-600/30 disabled:opacity-40 transition-colors text-sm font-medium">
                  {playing ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Play</>}
                </button>
                <button onClick={stepFwd} disabled={stage >= 40}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40 transition-colors text-sm">
                  <SkipForward size={14} /> Next
                </button>
                <button onClick={reset}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors text-sm">
                  <RotateCcw size={14} /> Reset
                </button>
              </div>
              <div className="flex flex-col gap-1 self-center">
                <span className="text-xs font-mono text-slate-400">Stage {stage + 1} / 41</span>
                <span className="text-[10px] font-mono text-slate-500">{currentStage.label}</span>
              </div>
              <div className="flex flex-col gap-1.5 ml-auto">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Speed</label>
                <div className="flex items-center gap-2">
                  {([['Slow', 1200], ['Med', 600], ['Fast', 250]] as [string, number][]).map(([lbl, ms]) => (
                    <button key={lbl} onClick={() => setSpeed(ms)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${speed === ms ? 'bg-violet-900/50 text-violet-300 border border-violet-700/50' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'}`}>
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── AVALANCHE BODY ──────────────────────────────────────────────────── */}
      {mode === 'avalanche' && (
        <div className="flex-1 overflow-hidden grid grid-cols-[minmax(380px,1fr)_520px] gap-5 p-6">

          {/* Left: comparison table */}
          <div className="bg-slate-900/60 border border-orange-900/30 rounded-xl overflow-y-auto p-5">
            <div className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-1">State Comparison</div>
            <div className="text-[10px] text-slate-500 mb-4">
              Original vs. {flipTarget === 'pt' ? `plaintext bit ${flipBit}` : `key bit ${flipBit}`} flipped · orange cells = bytes that differ
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-[140px_1fr_36px_1fr] gap-x-2 text-[9px] font-bold text-slate-600 uppercase tracking-wider mb-2 px-1">
              <div>Stage</div>
              <div>Original</div>
              <div className="text-center">Δ</div>
              <div>Modified</div>
            </div>

            <div className="space-y-0.5">
              {encStages.map((origStage, idx) => {
                const modStage = modEncStages[idx];
                const diff = avalancheDiffs[idx];
                const origBytes = stateToBytes(origStage.state);
                const modBytes = stateToBytes(modStage.state);
                const diffColor = diff === 0 ? 'text-slate-600 bg-slate-800/40' :
                                  diff <= 8  ? 'text-yellow-400 bg-yellow-900/30 border border-yellow-800/40' :
                                  diff <= 32 ? 'text-orange-400 bg-orange-900/30 border border-orange-800/40' :
                                               'text-red-400 bg-red-900/30 border border-red-800/40';
                const tc = typeColors(origStage.type);
                return (
                  <React.Fragment key={idx}>
                    {isRoundStart(idx) && (
                      <div className="flex items-center gap-2 py-1">
                        <div className="flex-1 h-px bg-slate-800" />
                        <span className="text-[9px] text-slate-600 font-bold uppercase">Round {origStage.round}</span>
                        <div className="flex-1 h-px bg-slate-800" />
                      </div>
                    )}
                    <div className="grid grid-cols-[140px_1fr_36px_1fr] gap-x-2 items-center py-1.5 px-1 rounded-lg hover:bg-slate-800/20 transition-colors">
                      <div>
                        <div className="text-[10px] font-semibold text-slate-400 leading-tight truncate">{origStage.label}</div>
                        <span className={`text-[8px] px-1 py-0.5 rounded font-bold uppercase ${tc.badge}`}>
                          {origStage.type === 'addKey' ? 'key xor' : origStage.type}
                        </span>
                      </div>
                      {/* Original state */}
                      <div className="grid grid-cols-4 gap-[1px]">
                        {origBytes.map((b, i) => (
                          <div key={i} className="w-full text-center font-mono text-[7px] bg-slate-800/50 border border-slate-700/30 rounded-[2px] text-slate-400 py-[1px]">
                            {hx(b)}
                          </div>
                        ))}
                      </div>
                      {/* Diff badge */}
                      <div className={`text-center py-0.5 rounded text-[9px] font-bold ${diffColor}`}>{diff}</div>
                      {/* Modified state */}
                      <div className="grid grid-cols-4 gap-[1px]">
                        {modBytes.map((b, i) => {
                          const differs = origBytes[i] !== b;
                          return (
                            <div key={i} className={`w-full text-center font-mono text-[7px] rounded-[2px] border py-[1px] ${
                              differs
                                ? 'bg-orange-900/70 border-orange-600 text-orange-200'
                                : 'bg-slate-800/50 border-slate-700/30 text-slate-400'
                            }`}>
                              {hx(b)}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Right: diffusion chart + explanation */}
          <div className="overflow-y-auto space-y-5 pr-1">
            <div className="bg-slate-900/60 border border-orange-900/30 rounded-xl p-5">
              <div className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-1">Bit Diffusion Progress</div>
              <div className="text-[10px] text-slate-500 mb-4">Bits changed at each stage (of 128 total)</div>
              <div className="space-y-1.5">
                {encStages.map((st, idx) => {
                  const diff = avalancheDiffs[idx];
                  const pct = (diff / 128) * 100;
                  const barColor = diff === 0  ? 'bg-slate-700' :
                                   diff <= 16  ? 'bg-yellow-500/70' :
                                   diff <= 48  ? 'bg-orange-500/70' : 'bg-red-500/70';
                  const numColor = diff === 0  ? 'text-slate-600' :
                                   diff <= 16  ? 'text-yellow-400' :
                                   diff <= 48  ? 'text-orange-400' : 'text-red-400';
                  return (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="w-28 text-[9px] text-slate-500 text-right shrink-0 leading-tight truncate">{st.label}</div>
                      <div className="flex-1 relative h-4 bg-slate-800 rounded-full overflow-hidden">
                        <div className="absolute inset-y-0 left-1/2 w-px bg-slate-600/50" />
                        <div className={`h-full rounded-full transition-all duration-300 ${barColor}`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className={`w-7 text-xs font-mono font-bold text-right ${numColor}`}>{diff}</div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-500 border-t border-slate-800 pt-3">
                <div className="w-3 h-px bg-slate-600" />
                <span>50% line (ideal = 64 bits)</span>
                <span className={`ml-auto font-mono font-bold ${avalancheDiffs[40] >= 48 ? 'text-orange-400' : 'text-slate-500'}`}>
                  Final: {avalancheDiffs[40]}/128 bits
                </span>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="text-xs font-bold text-orange-400 uppercase tracking-wider">The Avalanche Effect in AES</div>
              <p className="text-sm text-slate-300 leading-relaxed">
                A single-bit change in the plaintext or key should cause approximately <strong className="text-white">half of all 128 ciphertext bits</strong> to change. This is the strict avalanche criterion — a mathematical requirement for any secure block cipher.
              </p>
              <p className="text-sm text-slate-400 leading-relaxed">
                SubBytes creates local non-linearity: one changed byte becomes a different byte. ShiftRows moves that changed byte into a new column. MixColumns then spreads that column change to all four bytes of the column. After just 2 rounds, every output byte depends on every input byte.
              </p>
              <p className="text-sm text-slate-400 leading-relaxed">
                This is the <em className="text-orange-300">Wide Trail Strategy</em> — the design principle Joan Daemen used to prove that AES achieves full diffusion in 2 rounds and resists differential/linear attacks over 10 rounds.
              </p>
              <div className="bg-slate-900/60 rounded-lg px-3 py-2 border border-slate-700/60">
                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Try: </span>
                <span className="text-xs text-slate-400">Flip different bit positions (0 vs 63 vs 127) and compare the final diff. Each produces ~64 changed bits — no single bit is "more dangerous" than any other. That uniform sensitivity is the goal.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN BODY ───────────────────────────────────────────────────────── */}
      {mode !== 'avalanche' && (
        <div className="flex-1 overflow-hidden grid grid-cols-[minmax(360px,1fr)_600px] gap-5 p-6">

          {/* Left: Pipeline */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-y-auto p-4 space-y-0.5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {isDecrypt ? 'Decryption Pipeline' : 'Encryption Pipeline'} — 41 Stages
              </div>
              <div className="text-[10px] text-slate-600 italic">Click any row to jump</div>
            </div>
            {isDecrypt && validPt && validKey && (
              <div className="text-[10px] text-cyan-400 font-mono mb-2 px-1">
                Decrypting CT: {stateHexSummary(encStages[40].state).slice(0, 16)}…
              </div>
            )}

            {stages.map((st, idx) => {
              const isActive = idx === stage;
              const isPast   = idx < stage;
              const tc = typeColors(st.type);
              return (
                <React.Fragment key={idx}>
                  {isRoundStart(idx) && (
                    <div className="flex items-center gap-2 py-1">
                      <div className="flex-1 h-px bg-slate-800" />
                      <span className="text-[9px] text-slate-600 font-bold uppercase tracking-wider">
                        {isDecrypt ? `Undo Round ${st.round}` : `Round ${st.round}`}
                      </span>
                      <div className="flex-1 h-px bg-slate-800" />
                    </div>
                  )}
                  <div
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all cursor-pointer ${
                      idx > stage ? 'opacity-40' : 'opacity-100'
                    } ${isActive ? 'bg-slate-800/60 ring-2 ring-white/20' : isPast ? 'bg-slate-900/20' : ''}`}
                    onClick={() => setStage(idx)}
                  >
                    {/* Label */}
                    <div className="w-36 flex-shrink-0">
                      <div className={`text-[10px] font-semibold leading-tight ${isActive ? 'text-white' : 'text-slate-400'}`}>{st.label}</div>
                      <span className={`text-[8px] px-1 py-0.5 rounded font-bold uppercase ${tc.badge}`}>
                        {st.type === 'addKey' ? 'key xor' : st.type}
                      </span>
                    </div>

                    {/* Mini state grid */}
                    <MiniGrid state={st.state} prevState={st.prevState} type={st.type} />

                    {/* Hex summary (first 8 bytes) */}
                    <div className={`ml-auto text-[9px] font-mono text-right flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-600'}`}>
                      {stateHexSummary(st.state).slice(0, 16)}<br />
                      <span className="text-slate-700">{stateHexSummary(st.state).slice(16)}</span>
                    </div>
                  </div>

                  {idx < 40 && (
                    <div className="flex justify-center py-0.5">
                      <div className="text-slate-800 text-xs">▼</div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Right: Detail panel */}
          <div className="overflow-y-auto space-y-4 pr-1">

            {/* Before / After grids */}
            {currentStage.prevState && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">State Transformation</div>
                <div className="flex items-start gap-4 flex-wrap">
                  <FullGrid state={currentStage.prevState} label="Before" />
                  <div className="flex flex-col items-center justify-center pt-6">
                    <div className={`text-lg font-bold ${colors.text}`}>
                      {activeType === 'addKey' ? '⊕' : activeType === 'subBytes' ? 'S' : activeType === 'shiftRows' ? '↺' : activeType === 'mixCols' ? '×' : '→'}
                    </div>
                    <div className={`text-[9px] font-bold uppercase tracking-wider mt-1 ${colors.text}`}>
                      {activeType === 'addKey' ? 'XOR' : activeType === 'subBytes' ? 'SBOX' : activeType === 'shiftRows' ? 'SHIFT' : activeType === 'mixCols' ? 'GCMUL' : ''}
                    </div>
                  </div>
                  <FullGrid state={currentStage.state} prevState={currentStage.prevState} type={activeType} label="After" />
                </div>
              </div>
            )}

            {/* Operation-specific detail widget */}
            {activeType === 'subBytes' && currentStage.prevState && (() => {
              const sbox = isDecrypt ? INV_SBOX : SBOX;
              const label = isDecrypt ? 'Inverse S-Box Lookups' : 'S-Box Lookups — all 16 bytes';
              return (
                <div className={`bg-slate-900/60 border ${colors.border} rounded-xl p-5`}>
                  <div className={`text-xs font-bold uppercase tracking-wider mb-3 ${colors.text}`}>{label}</div>
                  <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
                    {isDecrypt
                      ? 'Each byte is looked up in the inverse Rijndael S-box. If SBOX[a] = b during encryption, then INV_SBOX[b] = a here. Every substitution is independent.'
                      : 'Each of the 16 bytes in the 4×4 State is independently looked up in the Rijndael S-box. The input byte is the table index; the output byte is the table entry at that index.'}
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {[0, 1, 2, 3].map(row => [0, 1, 2, 3].map(col => {
                      const inByte  = currentStage.prevState![col][row];
                      const outByte = currentStage.state[col][row];
                      const changed = inByte !== outByte;
                      return (
                        <div key={`${row}-${col}`} className="bg-slate-800/50 rounded-lg p-2 text-center">
                          <div className="text-[9px] text-slate-500 mb-0.5">({row},{col})</div>
                          <div className="font-mono text-xs text-slate-400">{hx(inByte)}</div>
                          <div className={`text-[9px] my-0.5 ${changed ? colors.text : 'text-slate-600'}`}>↓</div>
                          <div className={`font-mono text-xs font-bold ${changed ? 'text-green-300' : 'text-slate-500'}`}>{hx(outByte)}</div>
                        </div>
                      );
                    }))}
                  </div>
                </div>
              );
            })()}

            {activeType === 'shiftRows' && currentStage.prevState && (() => {
              const inv = isDecrypt;
              const shifts = inv ? [0, 3, 2, 1] : [0, 1, 2, 3];
              const rowColors = ['text-amber-400', 'text-emerald-400', 'text-sky-400', 'text-pink-400'];
              return (
                <div className={`bg-slate-900/60 border ${colors.border} rounded-xl p-5`}>
                  <div className={`text-xs font-bold uppercase tracking-wider mb-3 ${colors.text}`}>
                    {inv ? 'Inverse ShiftRows — Row Rotation' : 'ShiftRows — Row Rotation'}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
                    {inv
                      ? 'Rows are cyclically shifted right by their row index (inverse of forward). Row 0: no shift. Row 1: +1. Row 2: +2. Row 3: +3.'
                      : 'Rows are cyclically shifted left by their row index. Row 0: no shift. Row 1: −1 (left 1). Row 2: −2. Row 3: −3.'}
                  </p>
                  <div className="space-y-2">
                    {[0, 1, 2, 3].map(row => {
                      const shift = shifts[row];
                      const beforeRow = [0, 1, 2, 3].map(col => currentStage.prevState![col][row]);
                      const afterRow  = [0, 1, 2, 3].map(col => currentStage.state[col][row]);
                      return (
                        <div key={row} className="flex items-center gap-3">
                          <div className={`w-24 text-[10px] font-mono shrink-0 ${rowColors[row]}`}>
                            Row {row} {shift === 0 ? '(no shift)' : inv ? `→ +${shift}` : `← ${shift}`}
                          </div>
                          <div className="flex gap-1">
                            {beforeRow.map((b, i) => (
                              <div key={i} className="w-9 h-6 flex items-center justify-center font-mono text-[10px] bg-slate-800/60 border border-slate-700/50 rounded text-slate-400">{hx(b)}</div>
                            ))}
                          </div>
                          <div className="text-slate-600 text-sm">→</div>
                          <div className="flex gap-1">
                            {afterRow.map((b, i) => (
                              <div key={i} className={`w-9 h-6 flex items-center justify-center font-mono text-[10px] rounded border ${
                                b !== beforeRow[i] ? `${colors.cell}` : 'bg-slate-800/60 border-slate-700/50 text-slate-400'
                              }`}>{hx(b)}</div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {activeType === 'mixCols' && currentStage.prevState && (() => {
              const inv = isDecrypt;
              const matrix = inv
                ? [[14,11,13,9],[9,14,11,13],[13,9,14,11],[11,13,9,14]]
                : [[2,3,1,1],[1,2,3,1],[1,1,2,3],[3,1,1,2]];
              // Show computation for column 0
              const inCol  = currentStage.prevState[0];
              const outCol = currentStage.state[0];
              return (
                <div className={`bg-slate-900/60 border ${colors.border} rounded-xl p-5`}>
                  <div className={`text-xs font-bold uppercase tracking-wider mb-2 ${colors.text}`}>
                    {inv ? 'Inv MixColumns — GF(2⁸) Column Mixing' : 'MixColumns — GF(2⁸) Column Mixing'}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
                    Each column is multiplied by a fixed {inv ? 'inverse ' : ''}matrix in GF(2⁸). Column 0 shown below — all four columns receive the same treatment simultaneously.
                  </p>
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Matrix */}
                    <div>
                      <div className="text-[9px] text-slate-500 mb-1 text-center">Matrix</div>
                      <div className="grid grid-cols-4 gap-[2px]">
                        {matrix.map((mrow, ri) => mrow.map((v, ci) => (
                          <div key={`${ri}-${ci}`} className={`w-7 h-6 flex items-center justify-center font-mono text-[9px] rounded border ${colors.badge}`}>{v}</div>
                        )))}
                      </div>
                    </div>
                    <div className={`text-xl font-bold ${colors.text}`}>×</div>
                    {/* Input column */}
                    <div>
                      <div className="text-[9px] text-slate-500 mb-1 text-center">Col 0 in</div>
                      <div className="flex flex-col gap-[2px]">
                        {inCol.map((b, i) => (
                          <div key={i} className="w-9 h-6 flex items-center justify-center font-mono text-[10px] bg-slate-800/60 border border-slate-700/50 rounded text-slate-300">{hx(b)}</div>
                        ))}
                      </div>
                    </div>
                    <div className={`text-xl font-bold ${colors.text}`}>=</div>
                    {/* Output column */}
                    <div>
                      <div className="text-[9px] text-slate-500 mb-1 text-center">Col 0 out</div>
                      <div className="flex flex-col gap-[2px]">
                        {outCol.map((b, i) => (
                          <div key={i} className={`w-9 h-6 flex items-center justify-center font-mono text-[10px] rounded border ${colors.cell}`}>{hx(b)}</div>
                        ))}
                      </div>
                    </div>
                    {/* Formula for row 0 */}
                    <div className="ml-2 text-[10px] text-slate-500 space-y-1">
                      <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">Row 0 formula</div>
                      {matrix[0].map((m, j) => (
                        <div key={j}>
                          <span className={`${colors.text} font-mono`}>{m}</span>
                          <span className="text-slate-600">·</span>
                          <span className="text-slate-400 font-mono">{hx(inCol[j])}</span>
                          {j < 3 && <span className={`${colors.text}`}> ⊕ </span>}
                        </div>
                      ))}
                      <div className="border-t border-slate-700 pt-1">
                        = <span className={`font-mono font-bold ${colors.text}`}>{hx(outCol[0])}</span>
                        <span className="text-slate-600 text-[8px]"> (GF(2⁸))</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {activeType === 'addKey' && currentStage.prevState && currentStage.roundKey && (
              <div className={`bg-slate-900/60 border ${colors.border} rounded-xl p-5`}>
                <div className={`text-xs font-bold uppercase tracking-wider mb-3 ${colors.text}`}>
                  AddRoundKey — State ⊕ Round Key {currentStage.round}
                </div>
                <div className="flex items-start gap-4 flex-wrap">
                  <FullGrid state={currentStage.prevState} label="State" />
                  <div className="flex flex-col items-center justify-center pt-6">
                    <div className={`text-xl font-bold ${colors.text}`}>⊕</div>
                  </div>
                  <FullGrid state={currentStage.roundKey} type="addKey" label={`Round Key ${currentStage.round}`} />
                  <div className="flex flex-col items-center justify-center pt-6">
                    <div className={`text-xl font-bold ${colors.text}`}>=</div>
                  </div>
                  <FullGrid state={currentStage.state} prevState={currentStage.prevState} type="addKey" label="Result" />
                </div>
              </div>
            )}

            {/* Plain / Cipher large display */}
            {(activeType === 'plain' || activeType === 'cipher') && (
              <div className={`bg-slate-900/60 border ${colors.border} rounded-xl p-5`}>
                <div className={`text-xs font-bold uppercase tracking-wider mb-3 ${colors.text}`}>
                  {activeType === 'plain' ? (isDecrypt ? 'Recovered Plaintext' : 'Input Plaintext') : (isDecrypt ? 'Input Ciphertext' : 'Output Ciphertext')}
                </div>
                <FullGrid state={currentStage.state} label="" />
                <div className={`mt-3 font-mono text-sm font-bold ${colors.text} break-all`}>
                  {stateHexSummary(currentStage.state).toUpperCase()}
                </div>
              </div>
            )}

            {/* Explanation card */}
            <div className={`rounded-xl border p-5 space-y-3 ${colors.bg} ${colors.border}`}>
              <div className={`text-xs font-bold uppercase tracking-wider ${colors.text}`}>{expl.heading}</div>
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">What is happening</div>
                <p className="text-sm text-slate-300 leading-relaxed">{expl.what}</p>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Why we do this</div>
                <p className="text-sm text-slate-400 leading-relaxed">{expl.why}</p>
              </div>
              {expl.tip && (
                <div className="bg-slate-900/60 rounded-lg px-3 py-2 border border-slate-700/60">
                  <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Tip: </span>
                  <span className="text-xs text-slate-400">{expl.tip}</span>
                </div>
              )}
            </div>

            {/* Key schedule */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <button onClick={() => setShowKeySchedule(v => !v)}
                className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors w-full">
                <span className="font-bold uppercase tracking-wider">Key Schedule — 11 Round Keys</span>
                <span className="ml-auto">{showKeySchedule ? '▲' : '▼'}</span>
              </button>
              {showKeySchedule && (
                <div className="mt-4 space-y-2">
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    AES-128 derives 11 independent 16-byte round keys from the 16-byte master key using RotWord (byte rotation), SubWord (S-box), and XOR with round constants (Rcon). The current round's key is highlighted.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                    {roundKeys.map((rk, i) => {
                      const isCurrentRound = i === currentStage.round &&
                        (activeType === 'addKey' || (i === 0 && activeType === 'plain') || (i === 10 && activeType === 'cipher'));
                      return (
                        <div key={i} className={`rounded-lg p-2.5 border transition-colors ${
                          isCurrentRound ? 'bg-violet-950/40 border-violet-700/50' : 'bg-slate-800/30 border-slate-700/30'
                        }`}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className={`text-[10px] font-bold ${isCurrentRound ? 'text-violet-300' : 'text-slate-500'}`}>
                              Round Key {i}
                            </span>
                            <span className="font-mono text-[8px] text-slate-600">
                              {stateToBytes(rk).slice(0, 4).map(hx).join('')}…
                            </span>
                          </div>
                          <div className="grid grid-cols-8 gap-[1px]">
                            {stateToBytes(rk).map((b, j) => (
                              <div key={j} className={`text-center font-mono text-[7px] rounded py-[1px] ${
                                isCurrentRound ? 'bg-violet-900/50 text-violet-300' : 'bg-slate-900/60 text-slate-500'
                              }`}>
                                {hx(b)}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AESRoundApp;
