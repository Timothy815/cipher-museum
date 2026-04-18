import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Info, X, Play, Pause, SkipBack, SkipForward, RotateCcw, Network, Shuffle } from 'lucide-react';

// ── Heys' SPN constants ─────────────────────────────────────────────────────
const SBOX: number[] = [0xE, 0x4, 0xD, 0x1, 0x2, 0xF, 0xB, 0x8, 0x3, 0xA, 0x6, 0xC, 0x5, 0x9, 0x0, 0x7];
const PERM: number[] = [0, 4, 8, 12, 1, 5, 9, 13, 2, 6, 10, 14, 3, 7, 11, 15];

// ── Crypto helpers ───────────────────────────────────────────────────────────
function applySubstitution(block: number): number {
  let out = 0;
  for (let i = 0; i < 4; i++) {
    const nibble = (block >> (12 - i * 4)) & 0xF;
    out |= SBOX[nibble] << (12 - i * 4);
  }
  return out & 0xFFFF;
}

function applyPermutation(block: number): number {
  let out = 0;
  for (let i = 0; i < 16; i++) {
    const bit = (block >> (15 - i)) & 1;
    out |= bit << (15 - PERM[i]);
  }
  return out & 0xFFFF;
}

function deriveSubkeys(key32: number): number[] {
  // K0=bits31-16, K1=bits23-8, K2=bits15-0, K3=bits31-16 (reuse)
  const k0 = (key32 >> 16) & 0xFFFF;
  const k1 = (key32 >> 8) & 0xFFFF;
  const k2 = key32 & 0xFFFF;
  const k3 = (key32 >> 16) & 0xFFFF;
  return [k0, k1, k2, k3];
}

function computeAllStages(pt: number, key32: number): number[] {
  const [k0, k1, k2, k3] = deriveSubkeys(key32);
  const s0 = pt;
  const s1 = s0 ^ k0;          // after K0 XOR
  const s2 = applySubstitution(s1); // after S-box r1
  const s3 = applyPermutation(s2);  // after Perm r1
  const s4 = s3 ^ k1;          // after K1 XOR
  const s5 = applySubstitution(s4); // after S-box r2
  const s6 = applyPermutation(s5);  // after Perm r2
  const s7 = s6 ^ k2;          // after K2 XOR
  const s8 = applySubstitution(s7); // after S-box r3
  const s9 = s8 ^ k3;          // after K3 XOR = ciphertext
  return [s0, s1, s2, s3, s4, s5, s6, s7, s8, s9];
}

// ── Type definitions ─────────────────────────────────────────────────────────
type StageType = 'plain' | 'xor' | 'sub' | 'perm' | 'cipher';

interface StageInfo {
  label: string;
  type: StageType;
  round: number;
}

const STAGE_INFO: StageInfo[] = [
  { label: 'Plaintext',       type: 'plain',  round: 0 },
  { label: 'XOR Key K₀',     type: 'xor',    round: 1 },
  { label: 'S-Box R1',        type: 'sub',    round: 1 },
  { label: 'Permutation R1',  type: 'perm',   round: 1 },
  { label: 'XOR Key K₁',     type: 'xor',    round: 2 },
  { label: 'S-Box R2',        type: 'sub',    round: 2 },
  { label: 'Permutation R2',  type: 'perm',   round: 2 },
  { label: 'XOR Key K₂',     type: 'xor',    round: 3 },
  { label: 'S-Box R3',        type: 'sub',    round: 3 },
  { label: 'XOR Key K₃ (CT)', type: 'cipher', round: 3 },
];

interface StageExplanation {
  heading: string;
  what: string;
  why: string;
  tip?: string;
}

const STAGE_EXPLANATIONS: StageExplanation[] = [
  {
    heading: 'Input Plaintext',
    what: 'This is your original, unencrypted message — 16 bits of raw data. Every 0 and 1 is fully readable. The cipher is about to scramble it beyond recognition through a series of mathematical operations.',
    why: 'Block ciphers work on fixed-size chunks of data called blocks. Our educational cipher uses 16-bit blocks. The real-world AES cipher uses 128-bit blocks — but the same SPN structure applies at any size.',
    tip: 'Try changing one bit of the plaintext and step all the way through. Notice how many ciphertext bits change — this is the avalanche effect.',
  },
  {
    heading: 'Key Whitening (⊕ K₀)',
    what: 'Every bit of the plaintext is XORed (⊕) with the matching bit of subkey K₀. XOR is simple: two identical bits give 0, two different bits give 1. Each bit is individually flipped or kept according to the key.',
    why: 'This is called "whitening" because it makes the data look statistically random before any round begins. Without it, an attacker who worked backwards from the ciphertext could peel away the last round and study a weaker version of the cipher. Whitening at both ends closes that gap — even knowing the full cipher design gives no advantage without the key.',
    tip: 'The term whitening comes from signal processing: the operation makes any structured input look like white noise (random). XOR with a random key is a perfectly secure one-time pad — the rounds that follow add the additional security of key reuse.',
  },
  {
    heading: 'S-Box Substitution — Round 1',
    what: 'The 16-bit state is cut into four 4-bit nibbles. Each nibble is independently looked up in a substitution table (the S-box): the nibble value is the row index, the table entry is its replacement. The table is deliberately non-linear — no formula can predict the output from the input.',
    why: 'This provides confusion — hiding the relationship between the key and the ciphertext. Without non-linearity, an attacker could use linear algebra to solve for the key from just a few plaintext/ciphertext pairs. The S-box breaks that algebraic structure. This principle comes directly from Claude Shannon\'s 1949 paper "Communication Theory of Secrecy Systems".',
    tip: 'Four S-boxes work in parallel on the four nibbles. Notice that the bit pattern changes drastically even for inputs that differ by only one bit — this is the strict avalanche criterion that good S-boxes are designed to satisfy.',
  },
  {
    heading: 'Bit Permutation — Round 1',
    what: 'The 16 bits are rearranged to new positions according to a fixed pattern: bit 0 stays, bit 1 moves to position 4, bit 2 to position 8, and so on. The pattern deliberately crosses nibble boundaries, so each nibble\'s output bits are scattered across all four groups.',
    why: 'This provides diffusion — spreading each input bit\'s influence across many output positions. After permutation, a change in one bit of the previous stage affects multiple S-boxes in the next round. After two full rounds, changing a single plaintext bit changes approximately half of all ciphertext bits. This "avalanche effect" makes statistical attacks on individual bits useless.',
    tip: 'Without the permutation, each S-box would process the same four bits round after round — you could break the cipher one nibble at a time. Permutation forces the S-boxes to interact, multiplying the effective key search space.',
  },
  {
    heading: 'Round Key Mixing (⊕ K₁)',
    what: 'The state is XORed with subkey K₁, a different 16-bit slice of the master key. K₁ is taken from bits 8–23 of the 32-bit key — overlapping with both K₀ and K₂.',
    why: 'Every round must inject fresh key material. Without it, the cipher would be a fixed, key-independent permutation — an attacker could study it offline without ever needing the key. The overlapping key windows mean every bit of the master key appears in at least two subkeys, creating inter-dependency that makes partial key recovery much harder.',
  },
  {
    heading: 'S-Box Substitution — Round 2',
    what: 'The same S-box lookup, applied again. But crucially, each 4-bit nibble now contains bits that originally came from different S-box groups — the permutation mixed them in Round 1.',
    why: 'By this point, each output bit depends on multiple input bits from the previous round\'s S-box layer, not just the four bits in the same nibble. Each application of the S-box multiplies that dependence exponentially. After Round 2, no single input bit controls any single output bit — partial information about the plaintext reveals nothing about the ciphertext.',
  },
  {
    heading: 'Bit Permutation — Round 2',
    what: 'The same bit rearrangement pattern is applied again. After two rounds of substitution and permutation, every output bit depends on every input bit.',
    why: 'This is called full diffusion — achieved in just two SPN rounds thanks to the carefully designed permutation pattern. It means an attacker cannot look at a subset of ciphertext bits and learn anything useful about the corresponding plaintext bits. Real-world AES achieves full diffusion in two rounds for the same reason.',
    tip: 'The permutation pattern is designed so that the output bits of each S-box in round 1 become the input bits of all four S-boxes in round 2. This guarantees full diffusion in the minimum number of rounds.',
  },
  {
    heading: 'Round Key Mixing (⊕ K₂)',
    what: 'XOR with subkey K₂, taken from the lowest 16 bits of the master key. This is the third injection of key material.',
    why: 'Each subkey covers a different slice of the master key using a sliding window (bits 31–16, then 23–8, then 15–0). This simple key schedule ensures every master key bit contributes to at least two subkeys — changing a single master key bit changes the cipher\'s behaviour in at least two places.',
  },
  {
    heading: 'S-Box Substitution — Round 3',
    what: 'The final non-linear layer. Notice that there is no permutation step after this S-box. The final round of most SPNs deliberately omits the permutation.',
    why: 'The final permutation would add no security: the key XOR that follows it provides the same mixing. Omitting it saves computation without weakening the cipher. AES does exactly the same — the final round has SubBytes and AddRoundKey but no MixColumns (the permutation equivalent). This is a conscious design economy, not an oversight.',
  },
  {
    heading: 'Final Key Whitening → Ciphertext',
    what: 'The last XOR with K₃ completes the encryption. The output — the ciphertext — is 16 bits that are statistically indistinguishable from random noise. K₃ is the same value as K₀ in this cipher.',
    why: 'Without final whitening, an attacker could observe the last round\'s S-box outputs directly from the ciphertext and use them to deduce the last round key — stripping one round and attacking a weaker cipher. The final XOR closes that door. Decryption simply runs the same steps in reverse, applying subkeys in the order K₃, K₂, K₁, K₀.',
    tip: 'You have now traced a complete block cipher encryption. The same structure — key XOR, S-box, permutation, repeat — scaled to 128-bit blocks with ten rounds and a more complex key schedule is AES, the cipher protecting most of the world\'s encrypted traffic today.',
  },
];

// ── Inverse S-Box (SBOX_INV[SBOX[i]] = i) ──────────────────────────────────
const SBOX_INV: number[] = (() => {
  const inv = new Array(16).fill(0);
  SBOX.forEach((v, i) => { inv[v] = i; });
  return inv;
})();

function applyInvSubstitution(block: number): number {
  let out = 0;
  for (let i = 0; i < 4; i++) {
    const nibble = (block >> (12 - i * 4)) & 0xF;
    out |= SBOX_INV[nibble] << (12 - i * 4);
  }
  return out & 0xFFFF;
}

// Decryption: reverse order, use SBOX_INV, same permutation (P is an involution: P=P^-1)
function computeDecryptStages(ct: number, key32: number): number[] {
  const [k0, k1, k2, k3] = deriveSubkeys(key32);
  const d0 = ct;
  const d1 = d0 ^ k3;
  const d2 = applyInvSubstitution(d1);
  const d3 = d2 ^ k2;
  const d4 = applyPermutation(d3);   // P is its own inverse for this SPN
  const d5 = applyInvSubstitution(d4);
  const d6 = d5 ^ k1;
  const d7 = applyPermutation(d6);
  const d8 = applyInvSubstitution(d7);
  const d9 = d8 ^ k0;
  return [d0, d1, d2, d3, d4, d5, d6, d7, d8, d9];
}

const DECRYPT_STAGE_INFO: StageInfo[] = [
  { label: 'Ciphertext',         type: 'cipher', round: 0 },
  { label: '⊕ K₃ (undo)',       type: 'xor',    round: 3 },
  { label: 'Inv S-Box R3',       type: 'sub',    round: 3 },
  { label: '⊕ K₂ (undo)',       type: 'xor',    round: 2 },
  { label: 'Inv Perm R2',        type: 'perm',   round: 2 },
  { label: 'Inv S-Box R2',       type: 'sub',    round: 2 },
  { label: '⊕ K₁ (undo)',       type: 'xor',    round: 1 },
  { label: 'Inv Perm R1',        type: 'perm',   round: 1 },
  { label: 'Inv S-Box R1',       type: 'sub',    round: 1 },
  { label: '⊕ K₀ → Plaintext',  type: 'plain',  round: 0 },
];

const DECRYPT_STAGE_EXPLANATIONS: StageExplanation[] = [
  {
    heading: 'Input: Ciphertext',
    what: 'Decryption begins with the ciphertext — the fully scrambled 16-bit output of encryption. Every bit depends on every plaintext bit and every key bit. The goal is to reverse all encryption operations in exactly the reverse order.',
    why: 'An SPN is reversible with the correct key because every operation (XOR, S-box, permutation) has a mathematically defined inverse. Applying the inverses in reverse order perfectly undoes the encryption.',
  },
  {
    heading: 'Undo Final Whitening (⊕ K₃)',
    what: 'The last thing encryption did was XOR with subkey K₃. We undo it first by XORing with K₃ again. Since XOR is its own inverse — (x ⊕ K) ⊕ K = x — this perfectly recovers the state before that XOR.',
    why: 'Subkeys must be applied in reverse order. Using the right key in the wrong order produces garbage. This ordering requirement is part of what ties correct decryption to possession of the full master key.',
    tip: 'K₃ in this SPN reuses bits 31–16 of the master key (same as K₀). Notice the key schedule is symmetric.',
  },
  {
    heading: 'Inverse S-Box — Round 3',
    what: 'Encryption looked up each nibble\'s value in the forward S-box table. Decryption uses the inverse S-box: the ciphertext nibble is the index, and the table entry is the original pre-substitution nibble. Every forward mapping A→B maps back as B→A in the inverse.',
    why: 'The inverse S-box exists because the forward S-box is a bijection (one-to-one): every input maps to a unique output, so each output can be traced back to exactly one input. Cryptographers deliberately design S-boxes to be bijective AND non-linear.',
  },
  {
    heading: 'Undo Key Mixing (⊕ K₂)',
    what: 'XOR with K₂ recovers the state that existed after round 2\'s permutation — before round 3\'s key was mixed in. A second XOR with the same subkey perfectly cancels the first.',
    why: 'Each XOR with a subkey is an independent reversible gate. Security comes not from any single XOR being hard to undo, but from the combination of many XOR, S-box, and permutation steps all derived from the same secret key.',
  },
  {
    heading: 'Inverse Permutation — Round 2',
    what: 'The permutation moved bits to new positions during encryption. The inverse permutation moves each bit back. For Heys\' SPN, the bit permutation is its own inverse: applying it twice returns the identity.',
    why: 'Because P(P(x)) = x for this particular permutation, decryption uses exactly the same permutation hardware as encryption — no separate inverse circuit is needed. This elegant self-inverse property was chosen deliberately by Heys.',
    tip: 'You can verify: for every bit position i in the PERM table, PERM[PERM[i]] = i. This halves the hardware needed for a physical chip implementation.',
  },
  {
    heading: 'Inverse S-Box — Round 2',
    what: 'Reversing the round 2 S-box substitution. Each of the four nibbles is independently looked up in the inverse S-box table, recovering the four nibbles that existed before round 2\'s substitution step.',
    why: 'Three S-box applications during encryption are undone by three inverse S-box applications during decryption. The inverse table is pre-computed from the forward table and never changes for a given cipher design.',
  },
  {
    heading: 'Undo Key Mixing (⊕ K₁)',
    what: 'XOR with K₁ recovers the state that entered round 2 — the output of round 1\'s permutation. We are now three steps from the plaintext: one more inverse permutation, one more inverse S-box, and one final XOR.',
    why: 'The key mixing steps are the only ones that change with the key. The S-box and permutation are fixed, public structures. This is why key secrecy matters — the XOR steps are what bind each unique ciphertext to a specific key.',
  },
  {
    heading: 'Inverse Permutation — Round 1',
    what: 'Undoes the round 1 permutation, recovering the state immediately after the round 1 S-box substitution. Bit positions are restored to their pre-permutation arrangement.',
    why: 'Without reversing the permutation, each nibble\'s decryption would be independent of the others and the diffusion that spread changes across nibble boundaries could not be undone. This step restores the inter-nibble relationships that diffusion created.',
  },
  {
    heading: 'Inverse S-Box — Round 1',
    what: 'The first S-box applied during encryption is the last to be undone during decryption. The inverse lookup for each of the four nibbles recovers the state that existed after the initial key whitening (⊕ K₀).',
    why: 'This is the final non-linear step in decryption. After it, only a linear XOR remains. The inverse S-box here recovers exactly the state that key whitening produced from the plaintext.',
  },
  {
    heading: 'Undo Key Whitening (⊕ K₀) → Plaintext',
    what: 'The very first encryption step was XOR with K₀. Applying K₀ one final time undoes it, recovering the original plaintext exactly. If all previous steps used the correct key in the correct order, this last XOR produces the exact original message.',
    why: 'Any error — wrong key, wrong order, any corrupted bit anywhere in the chain — produces meaningless output at this final step. The cipher provides no partial credit: the correct key gives the exact plaintext; any other key gives noise.',
    tip: 'Compare this recovered value with the original plaintext — they should be identical. Now try switching to Encrypt mode, change one bit of the key, and switch back to Decrypt: the recovered plaintext will be completely wrong.',
  },
];

// ── Popcount helper ───────────────────────────────────────────────────────────
function popcount(n: number): number {
  let count = 0; let v = n >>> 0;
  while (v) { count += v & 1; v >>>= 1; }
  return count;
}

// ── Bit display helpers ───────────────────────────────────────────────────────
function to16Bits(v: number): number[] {
  return Array.from({ length: 16 }, (_, i) => (v >> (15 - i)) & 1);
}

function toHex4(v: number): string {
  return v.toString(16).toUpperCase().padStart(4, '0');
}

function randomHex(digits: number): string {
  return Array.from({ length: digits }, () => Math.floor(Math.random() * 16).toString(16)).join('').toUpperCase();
}

// ── Bit box component ─────────────────────────────────────────────────────────
function bitBoxClass(bit: number, type: StageType): string {
  const base = 'w-5 h-5 flex items-center justify-center rounded text-[10px] font-mono font-bold border transition-colors';
  if (bit === 0) return `${base} bg-slate-900 border-slate-700 text-slate-600`;
  switch (type) {
    case 'xor':    return `${base} bg-violet-900/70 border-violet-600 text-violet-200`;
    case 'sub':    return `${base} bg-green-900/70 border-green-600 text-green-200`;
    case 'perm':   return `${base} bg-blue-900/70 border-blue-600 text-blue-200`;
    case 'plain':  return `${base} bg-amber-900/70 border-amber-600 text-amber-200`;
    case 'cipher': return `${base} bg-cyan-900/70 border-cyan-600 text-cyan-200`;
  }
}

function typeBadgeClass(type: StageType): string {
  switch (type) {
    case 'xor':    return 'bg-violet-900/40 text-violet-400 border border-violet-700/40';
    case 'sub':    return 'bg-green-900/40 text-green-400 border border-green-700/40';
    case 'perm':   return 'bg-blue-900/40 text-blue-400 border border-blue-700/40';
    case 'plain':  return 'bg-amber-900/40 text-amber-400 border border-amber-700/40';
    case 'cipher': return 'bg-cyan-900/40 text-cyan-400 border border-cyan-700/40';
  }
}

const NIBBLE_COLORS = ['text-amber-400', 'text-emerald-400', 'text-sky-400', 'text-pink-400'];
const NIBBLE_STROKE = ['#f59e0b', '#34d399', '#38bdf8', '#f472b6'];

// ── Permutation SVG diagram ───────────────────────────────────────────────────
function PermDiagram({ value }: { value: number }) {
  const W = 480;
  const H = 90;
  const pad = 16;
  const spacing = (W - 2 * pad) / 15;

  const srcX = (i: number) => pad + i * spacing;
  const dstX = (i: number) => pad + PERM[i] * spacing;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-lg" style={{ height: H }}>
      {/* Source bit circles */}
      {Array.from({ length: 16 }, (_, i) => (
        <g key={`src-${i}`}>
          <circle cx={srcX(i)} cy={14} r={9} fill="#1e293b" stroke={NIBBLE_STROKE[Math.floor(i / 4)]} strokeWidth={1.5} />
          <text x={srcX(i)} y={18} textAnchor="middle" fontSize={8} fill={NIBBLE_STROKE[Math.floor(i / 4)]} fontFamily="monospace">{i}</text>
        </g>
      ))}
      {/* Connecting lines */}
      {Array.from({ length: 16 }, (_, i) => (
        <line key={`line-${i}`}
          x1={srcX(i)} y1={23} x2={dstX(i)} y2={67}
          stroke={NIBBLE_STROKE[Math.floor(i / 4)]} strokeWidth={1} opacity={0.7}
        />
      ))}
      {/* Destination bit circles */}
      {Array.from({ length: 16 }, (_, i) => (
        <g key={`dst-${i}`}>
          <circle cx={pad + i * spacing} cy={76} r={9} fill="#1e293b" stroke={NIBBLE_STROKE[Math.floor(i / 4)]} strokeWidth={1.5} />
          <text x={pad + i * spacing} y={80} textAnchor="middle" fontSize={8} fill={NIBBLE_STROKE[Math.floor(i / 4)]} fontFamily="monospace">{i}</text>
        </g>
      ))}
    </svg>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
const SPNApp: React.FC = () => {
  const [ptHex, setPtHex] = useState('2D39');
  const [keyHex, setKeyHex] = useState('5A9F3C2E');
  const [ptError, setPtError] = useState('');
  const [keyError, setKeyError] = useState('');

  const [mode, setMode] = useState<'encrypt' | 'decrypt' | 'avalanche'>('encrypt');
  const [currentStage, setCurrentStage] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(800);
  const [showInfo, setShowInfo] = useState(false);
  const [flipTarget, setFlipTarget] = useState<'pt' | 'key'>('pt');
  const [flipBit, setFlipBit]     = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const ptVal = parseInt(ptHex, 16);
  const keyVal = parseInt(keyHex, 16);
  const validPt = /^[0-9A-Fa-f]{1,4}$/.test(ptHex);
  const validKey = /^[0-9A-Fa-f]{1,8}$/.test(keyHex);

  const encStages = (validPt && validKey)
    ? computeAllStages(isNaN(ptVal) ? 0 : ptVal & 0xFFFF, isNaN(keyVal) ? 0 : keyVal & 0xFFFFFFFF)
    : Array(10).fill(0);
  const ctVal = encStages[9]; // ciphertext = last encryption stage
  const decStages = (validPt && validKey)
    ? computeDecryptStages(ctVal, isNaN(keyVal) ? 0 : keyVal & 0xFFFFFFFF)
    : Array(10).fill(0);
  const stages = mode === 'encrypt' ? encStages : decStages;
  const activeStageInfo = mode === 'encrypt' ? STAGE_INFO : DECRYPT_STAGE_INFO;
  const activeExplanations = mode === 'encrypt' ? STAGE_EXPLANATIONS : DECRYPT_STAGE_EXPLANATIONS;

  const maxFlipBit = flipTarget === 'pt' ? 15 : 31;
  const safeBit = Math.min(flipBit, maxFlipBit);
  const modPtVal  = (flipTarget === 'pt'  ? (ptVal  ^ (1 << (15 - safeBit))) : ptVal)  & 0xFFFF;
  const modKeyVal = (flipTarget === 'key' ? (keyVal ^ (1 << (31 - safeBit))) : keyVal) & 0xFFFFFFFF;
  const modStages = (validPt && validKey)
    ? computeAllStages(modPtVal, modKeyVal)
    : Array(10).fill(0);
  const diffCounts = encStages.map((s, i) => popcount((s ^ modStages[i]) & 0xFFFF));

  const subkeys = validKey ? deriveSubkeys(isNaN(keyVal) ? 0 : keyVal & 0xFFFFFFFF) : [0, 0, 0, 0];

  const handlePtChange = (v: string) => {
    const clean = v.replace(/[^0-9A-Fa-f]/g, '').toUpperCase().slice(0, 4);
    setPtHex(clean);
    setPtError(clean.length === 0 ? 'Required' : '');
  };

  const handleKeyChange = (v: string) => {
    const clean = v.replace(/[^0-9A-Fa-f]/g, '').toUpperCase().slice(0, 8);
    setKeyHex(clean);
    setKeyError(clean.length === 0 ? 'Required' : '');
  };

  const reset = useCallback(() => {
    setPlaying(false);
    setCurrentStage(0);
  }, []);

  const stepForward = useCallback(() => {
    setCurrentStage(s => Math.min(s + 1, 9));
  }, []);

  const stepBack = useCallback(() => {
    setCurrentStage(s => Math.max(s - 1, 0));
  }, []);

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setCurrentStage(s => {
          if (s >= 9) { setPlaying(false); return 9; }
          return s + 1;
        });
      }, speed);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, speed]);

  // Stop at end
  useEffect(() => { if (currentStage >= 9) setPlaying(false); }, [currentStage]);

  // Reset stage on input change
  useEffect(() => { reset(); }, [ptHex, keyHex, reset]);

  const activeType = activeStageInfo[currentStage].type;

  // S-box detail: show nibble substitutions for sub stages
  const isSubStage = activeType === 'sub';
  const isPermStage = activeType === 'perm';

  // For S-box detail, use the stage BEFORE the sub stage
  const subInputStage = isSubStage ? currentStage - 1 : null;
  const subOutputStage = isSubStage ? currentStage : null;

  return (
    <div className="flex-1 bg-[#1a1814] flex flex-col overflow-hidden">

      {/* ── TOP STRIP (always visible, no scroll) ─────────── */}
      <div className="bg-[#1a1814] border-b border-slate-800/60 px-8 pt-5 pb-4 flex-shrink-0">

        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-violet-900/30 border border-violet-700/40">
              <Network size={28} className="text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-violet-300 tracking-wide">SPN VISUALIZER</h1>
              <p className="text-sm text-slate-400 mt-0.5">Substitution-Permutation Network · Heys' Tutorial Cipher</p>
            </div>
          </div>
          <button onClick={() => setShowInfo(v => !v)}
            className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-violet-700/50 transition-colors flex-shrink-0">
            {showInfo ? <X size={20} className="text-violet-400" /> : <Info size={20} className="text-violet-400" />}
          </button>
        </div>

        {/* Collapsible info panel */}
        {showInfo && (
          <div className="bg-violet-950/20 border border-violet-900/40 rounded-xl p-6 space-y-3 text-sm text-slate-300 leading-relaxed mb-4">
            <h2 className="text-base font-bold text-violet-300">Substitution-Permutation Network (SPN)</h2>
            <p>An SPN is a series of linked mathematical operations used in block ciphers. Each round applies three transformations: a <strong className="text-white">key XOR</strong> (whitening), a <strong className="text-white">substitution</strong> (S-box lookup, providing confusion), and a <strong className="text-white">permutation</strong> (bit rearrangement, providing diffusion).</p>
            <p>This visualizer implements Howard Heys' tutorial SPN: a 16-bit block cipher with a 4-bit S-box, a 16-bit permutation, and a 32-bit key split into four 16-bit subkeys via a sliding window. It uses 3 full rounds with an additional final key XOR.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              {(['xor', 'sub', 'perm', 'cipher'] as StageType[]).map(t => (
                <div key={t} className={`px-3 py-2 rounded-lg text-xs font-mono text-center ${typeBadgeClass(t)}`}>
                  {t === 'xor' ? 'Key XOR' : t === 'sub' ? 'S-Box' : t === 'perm' ? 'Permutation' : 'Ciphertext'}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Combined inputs + controls row */}
        <div className="flex flex-wrap items-end gap-6">
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Plaintext (4 hex)</label>
            <div className="flex items-center gap-2">
              <input value={ptHex} onChange={e => handlePtChange(e.target.value)}
                className={`bg-slate-900/80 border rounded-lg px-3 py-2 font-mono text-sm text-white focus:outline-none w-28 ${ptError ? 'border-red-600' : 'border-slate-700 focus:border-violet-700/50'}`}
                placeholder="2D39" maxLength={4} />
              <button onClick={() => handlePtChange(randomHex(4))}
                className="p-2 rounded-lg bg-slate-800 border border-slate-700 hover:border-violet-600/50 transition-colors" title="Randomize">
                <Shuffle size={14} className="text-slate-400" />
              </button>
            </div>
            {ptError && <span className="text-xs text-red-400">{ptError}</span>}
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Key (8 hex)</label>
            <div className="flex items-center gap-2">
              <input value={keyHex} onChange={e => handleKeyChange(e.target.value)}
                className={`bg-slate-900/80 border rounded-lg px-3 py-2 font-mono text-sm text-white focus:outline-none w-36 ${keyError ? 'border-red-600' : 'border-slate-700 focus:border-violet-700/50'}`}
                placeholder="5A9F3C2E" maxLength={8} />
              <button onClick={() => handleKeyChange(randomHex(8))}
                className="p-2 rounded-lg bg-slate-800 border border-slate-700 hover:border-violet-600/50 transition-colors" title="Randomize">
                <Shuffle size={14} className="text-slate-400" />
              </button>
            </div>
            {keyError && <span className="text-xs text-red-400">{keyError}</span>}
          </div>
          {/* Mode toggle */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mode</label>
            <div className="flex items-center gap-1">
              <button onClick={() => { setMode('encrypt'); setCurrentStage(0); setPlaying(false); }}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${mode === 'encrypt' ? 'bg-violet-900/50 text-violet-200 border border-violet-600/60' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'}`}>
                Encrypt
              </button>
              <button onClick={() => { setMode('decrypt'); setCurrentStage(0); setPlaying(false); }}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${mode === 'decrypt' ? 'bg-cyan-900/50 text-cyan-200 border border-cyan-600/60' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'}`}>
                Decrypt
              </button>
              <button onClick={() => { setMode('avalanche'); setCurrentStage(0); setPlaying(false); }}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${mode === 'avalanche' ? 'bg-orange-900/50 text-orange-200 border border-orange-600/60' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'}`}>
                Avalanche
              </button>
            </div>
          </div>
          {mode === 'avalanche' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Flip one bit</label>
              <div className="flex items-center gap-2">
                <button onClick={() => { setFlipTarget('pt'); setFlipBit(0); }}
                  className={`px-2 py-1.5 rounded text-xs transition-colors ${flipTarget === 'pt' ? 'bg-orange-900/50 text-orange-200 border border-orange-600/50' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'}`}>
                  Plaintext
                </button>
                <button onClick={() => { setFlipTarget('key'); setFlipBit(0); }}
                  className={`px-2 py-1.5 rounded text-xs transition-colors ${flipTarget === 'key' ? 'bg-orange-900/50 text-orange-200 border border-orange-600/50' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'}`}>
                  Key
                </button>
                <span className="text-slate-500 text-xs">bit</span>
                <input type="number" min={0} max={flipTarget === 'pt' ? 15 : 31} value={flipBit}
                  onChange={e => setFlipBit(Math.max(0, Math.min(flipTarget === 'pt' ? 15 : 31, parseInt(e.target.value) || 0)))}
                  className="bg-slate-900/80 border border-slate-700 rounded-lg px-2 py-1.5 font-mono text-sm text-white w-14 focus:outline-none focus:border-orange-600/50" />
                <span className="text-[10px] text-slate-500">of {flipTarget === 'pt' ? '0–15' : '0–31'}</span>
              </div>
            </div>
          )}
          {/* Vertical divider */}
          <div className="h-10 w-px bg-slate-700/60 self-center" />
          {/* Playback controls */}
          {mode !== 'avalanche' && (
            <>
              <div className="flex items-center gap-2">
                <button onClick={stepBack} disabled={currentStage === 0}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40 transition-colors text-sm">
                  <SkipBack size={14} /> Back
                </button>
                <button onClick={() => setPlaying(p => !p)} disabled={currentStage >= 9 && !playing}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600/20 border border-violet-700/50 text-violet-300 hover:bg-violet-600/30 disabled:opacity-40 transition-colors text-sm font-medium">
                  {playing ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Play</>}
                </button>
                <button onClick={stepForward} disabled={currentStage >= 9}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40 transition-colors text-sm">
                  <SkipForward size={14} /> Next
                </button>
                <button onClick={reset}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors text-sm">
                  <RotateCcw size={14} /> Reset
                </button>
              </div>
              {/* Stage counter */}
              <div className="flex flex-col gap-1 self-center">
                <span className="text-xs font-mono text-slate-400">Stage {currentStage + 1} / 10</span>
                <span className="text-[10px] font-mono text-slate-500">{activeStageInfo[currentStage].label}</span>
              </div>
              {/* Speed selector */}
              <div className="flex flex-col gap-1.5 ml-auto">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Speed</label>
                <div className="flex items-center gap-2">
                  {([['Slow', 1200], ['Med', 700], ['Fast', 300]] as [string, number][]).map(([lbl, ms]) => (
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

      {/* ── AVALANCHE BODY */}
      {mode === 'avalanche' && (
        <div className="flex-1 overflow-hidden grid grid-cols-[minmax(360px,1fr)_520px] gap-5 p-6">

          {/* Left: Comparison pipeline */}
          <div className="bg-slate-900/60 border border-orange-900/30 rounded-xl overflow-y-auto p-5">
            <div className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-1">Bit-by-bit comparison</div>
            <div className="text-[10px] text-slate-500 mb-4">
              Original vs. {flipTarget === 'pt' ? `plaintext bit ${safeBit} flipped` : `key bit ${safeBit} flipped`} · orange = differs
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-[112px_1fr_52px_1fr_44px] gap-x-2 text-[9px] font-bold text-slate-600 uppercase tracking-wider mb-2 px-1">
              <div>Stage</div>
              <div>Original</div>
              <div className="text-center">Δ</div>
              <div>Modified</div>
              <div className="text-right">hex</div>
            </div>

            <div className="space-y-1">
              {encStages.map((origVal, idx) => {
                const modVal = modStages[idx];
                const nDiff = diffCounts[idx];
                const origBits = to16Bits(origVal);
                const modBits  = to16Bits(modVal);
                const info = STAGE_INFO[idx];
                const diffColor = nDiff === 0 ? 'text-slate-600 bg-slate-800/60' :
                                  nDiff <= 3  ? 'text-yellow-400 bg-yellow-900/30 border border-yellow-800/40' :
                                  nDiff <= 7  ? 'text-orange-400 bg-orange-900/30 border border-orange-800/40' :
                                                'text-red-400 bg-red-900/30 border border-red-800/40';
                return (
                  <div key={idx} className="grid grid-cols-[112px_1fr_52px_1fr_44px] gap-x-2 items-center py-1.5 px-1 rounded-lg hover:bg-slate-800/20 transition-colors">
                    {/* Stage label */}
                    <div>
                      <div className="text-[10px] font-semibold text-slate-400 leading-tight">{info.label}</div>
                      <span className={`text-[8px] px-1 py-0.5 rounded font-bold uppercase ${typeBadgeClass(info.type)}`}>{info.type}</span>
                    </div>
                    {/* Original bits — 4 nibble groups */}
                    <div className="flex gap-1">
                      {[0,1,2,3].map(n => (
                        <div key={n} className="flex gap-0.5">
                          {origBits.slice(n*4, n*4+4).map((b, bi) => (
                            <div key={bi} className={`w-4 h-4 flex items-center justify-center rounded text-[9px] font-mono font-bold border ${
                              b ? 'bg-slate-700/60 border-slate-500 text-slate-200' : 'bg-slate-900 border-slate-800 text-slate-700'
                            }`}>{b}</div>
                          ))}
                        </div>
                      ))}
                    </div>
                    {/* Diff badge */}
                    <div className={`text-center py-0.5 rounded text-[10px] font-bold ${diffColor}`}>
                      {nDiff}
                    </div>
                    {/* Modified bits */}
                    <div className="flex gap-1">
                      {[0,1,2,3].map(n => (
                        <div key={n} className="flex gap-0.5">
                          {modBits.slice(n*4, n*4+4).map((b, bi) => {
                            const differs = origBits[n*4+bi] !== b;
                            return (
                              <div key={bi} className={`w-4 h-4 flex items-center justify-center rounded text-[9px] font-mono font-bold border ${
                                differs ? 'bg-orange-900/70 border-orange-500 text-orange-200 ring-1 ring-orange-500/50' :
                                b ? 'bg-slate-700/60 border-slate-500 text-slate-200' : 'bg-slate-900 border-slate-800 text-slate-700'
                              }`}>{b}</div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                    {/* Hex diff */}
                    <div className="text-right font-mono text-[10px] text-orange-400">
                      {nDiff > 0 ? toHex4(modVal) : <span className="text-slate-700">—</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: diffusion chart + explanation */}
          <div className="overflow-y-auto space-y-5 pr-1">

            {/* Diffusion chart */}
            <div className="bg-slate-900/60 border border-orange-900/30 rounded-xl p-5">
              <div className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-1">Bit Diffusion</div>
              <div className="text-[10px] text-slate-500 mb-4">Bits changed at each stage (of 16 total)</div>
              <div className="space-y-2">
                {diffCounts.map((count, idx) => {
                  const info = STAGE_INFO[idx];
                  const pct  = (count / 16) * 100;
                  const barColor = count === 0  ? 'bg-slate-700' :
                                   count <= 3   ? 'bg-yellow-500/70' :
                                   count <= 7   ? 'bg-orange-500/70' : 'bg-red-500/70';
                  const numColor = count === 0  ? 'text-slate-600' :
                                   count <= 3   ? 'text-yellow-400' :
                                   count <= 7   ? 'text-orange-400' : 'text-red-400';
                  return (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-28 text-[10px] text-slate-500 text-right shrink-0 leading-tight">{info.label}</div>
                      <div className="flex-1 relative h-5 bg-slate-800 rounded-full overflow-hidden">
                        {/* 50% marker */}
                        <div className="absolute inset-y-0 left-1/2 w-px bg-slate-600/50" />
                        <div className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                          style={{ width: `${pct}%` }} />
                      </div>
                      <div className={`w-6 text-xs font-mono font-bold text-right ${numColor}`}>{count}</div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-500 border-t border-slate-800 pt-3">
                <div className="w-3 h-px bg-slate-600" />
                <span>50% line (ideal target = 8 bits)</span>
                <span className={`ml-auto font-mono font-bold ${diffCounts[9] >= 6 ? 'text-orange-400' : 'text-slate-500'}`}>
                  Final: {diffCounts[9]}/16 bits
                </span>
              </div>
            </div>

            {/* Text explanation */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="text-xs font-bold text-orange-400 uppercase tracking-wider">The Avalanche Effect</div>
              <p className="text-sm text-slate-300 leading-relaxed">
                A single-bit change in the plaintext or key should cause approximately <strong className="text-white">half of all ciphertext bits</strong> to change. This is the <em className="text-orange-300">strict avalanche criterion</em> — a cornerstone of modern cipher design.
              </p>
              <p className="text-sm text-slate-400 leading-relaxed">
                Watch the diffusion bar chart as rounds progress. The S-Box provides <strong className="text-white">confusion</strong> — one changed input nibble produces a very different output nibble. The Permutation provides <strong className="text-white">diffusion</strong> — it scatters those changed bits across all four nibbles, so the next S-Box application amplifies the cascade further.
              </p>
              <p className="text-sm text-slate-400 leading-relaxed">
                By round 3, the single flipped bit has propagated through every nibble in both the original and modified pipelines, and the ciphertext outputs diverge by roughly 8 bits — exactly what a strong block cipher requires.
              </p>
              <div className="bg-slate-900/60 rounded-lg px-3 py-2 border border-slate-700/60">
                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Try: </span>
                <span className="text-xs text-slate-400">Flip bits at different positions — bit 0 vs bit 7 vs bit 15. Notice that by the final stage, all positions produce roughly the same number of changed ciphertext bits. No single bit is "special" or "more dangerous" — that uniform sensitivity is the goal.</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── MAIN BODY (fills remaining height, no outer scroll) */}
      {mode !== 'avalanche' && (
      <div className="flex-1 overflow-hidden grid grid-cols-[minmax(360px,1fr)_580px] gap-5 p-6">

        {/* Left: Pipeline */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-y-auto p-5 space-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {mode === 'encrypt' ? 'Encryption Pipeline' : 'Decryption Pipeline'}
            </div>
            <div className="text-[10px] text-slate-600 italic">Click any row to jump to that stage</div>
          </div>
          {mode === 'decrypt' && validPt && validKey && <div className="text-[10px] text-cyan-400 font-mono mb-2">Decrypting CT: {toHex4(ctVal)}</div>}
              {stages.map((val, idx) => {
                const info = activeStageInfo[idx];
                const isActive = idx === currentStage;
                const isPast = idx < currentStage;
                const opacity = idx > currentStage ? 'opacity-40' : 'opacity-100';
                const bits = to16Bits(val);

                return (
                  <React.Fragment key={idx}>
                    <div
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${opacity} ${isActive ? 'bg-slate-800/60 ring-2 ring-white/20' : isPast ? 'bg-slate-900/20' : ''}`}
                      onClick={() => setCurrentStage(idx)}
                      style={{ cursor: 'pointer' }}
                    >
                      {/* Stage label */}
                      <div className="w-28 flex-shrink-0">
                        <div className={`text-xs font-semibold ${isActive ? 'text-white' : 'text-slate-400'}`}>{info.label}</div>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${typeBadgeClass(info.type)}`}>
                          {info.type}
                        </span>
                      </div>

                      {/* Bit boxes in nibble groups */}
                      <div className="flex gap-1 flex-1 justify-center">
                        {[0, 1, 2, 3].map(nibble => (
                          <div key={nibble} className="flex gap-0.5">
                            {bits.slice(nibble * 4, nibble * 4 + 4).map((bit, bi) => (
                              <div key={bi} className={bitBoxClass(bit, info.type)}>
                                {bit}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>

                      {/* Hex value */}
                      <div className={`w-14 text-right font-mono text-sm flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`}>
                        {toHex4(val)}
                      </div>
                    </div>

                    {/* Arrow between stages */}
                    {idx < 9 && (
                      <div className="flex justify-center py-0.5">
                        <div className="text-slate-700 text-xs">▼</div>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}

        </div>

        {/* Right: Detail Panel */}
        <div className="overflow-y-auto space-y-5 pr-1">

              {/* S-Box Detail */}
              {isSubStage && subInputStage !== null && subOutputStage !== null && (() => {
                const activeSbox = mode === 'encrypt' ? SBOX : SBOX_INV;
                const nibbles = [0, 1, 2, 3].map(n => ({
                  inNib:  (stages[subInputStage]  >> (12 - n * 4)) & 0xF,
                  outNib: (stages[subOutputStage] >> (12 - n * 4)) & 0xF,
                }));
                // which nibble index uses each table position (first match wins for display)
                const nibbleAtIdx = (idx: number) => nibbles.findIndex(({ inNib }) => inNib === idx);

                const NIBBLE_BG = [
                  'bg-amber-900/60 text-amber-200 ring-1 ring-amber-500/60',
                  'bg-emerald-900/60 text-emerald-200 ring-1 ring-emerald-500/60',
                  'bg-sky-900/60 text-sky-200 ring-1 ring-sky-500/60',
                  'bg-pink-900/60 text-pink-200 ring-1 ring-pink-500/60',
                ];
                const NIBBLE_TEXT = ['text-amber-400', 'text-emerald-400', 'text-sky-400', 'text-pink-400'];
                const NIBBLE_LABEL = ['text-amber-300', 'text-emerald-300', 'text-sky-300', 'text-pink-300'];

                return (
                  <div className="bg-slate-900/60 border border-green-900/40 rounded-xl p-5 space-y-5">
                    <div className="text-xs font-bold text-green-400 uppercase tracking-wider">
                      {mode === 'encrypt' ? 'S-Box Lookup' : 'Inverse S-Box Lookup'}
                    </div>
                    {mode === 'decrypt'
                      ? <p className="text-[11px] text-slate-400 leading-relaxed -mt-2">The inverse S-box maps each encrypted nibble back to its original value. SBOX_INV[SBOX[n]] = n for every nibble n.</p>
                      : <p className="text-[11px] text-slate-400 leading-relaxed -mt-2">
                          The 16-bit state is cut into four 4-bit nibbles. Each nibble's value is used as an
                          index (0–15) into the S-Box table — the entry at that position becomes the new nibble.
                        </p>
                    }

                    {/* ── Full indexed lookup table ── */}
                    <div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Lookup table — index the row to find the output
                      </div>

                      {/* Index header row */}
                      <div className="flex font-mono text-[10px] mb-0.5">
                        <div className="w-10 shrink-0 text-slate-600 text-right pr-1.5 self-end pb-0.5">idx</div>
                        {Array.from({ length: 16 }, (_, i) => {
                          const ni = nibbleAtIdx(i);
                          return (
                            <div key={i} className={`flex-1 text-center font-bold ${ni >= 0 ? NIBBLE_TEXT[ni] : 'text-slate-600'}`}>
                              {i.toString(16).toUpperCase()}
                            </div>
                          );
                        })}
                      </div>

                      {/* Output value row */}
                      <div className="flex font-mono text-sm">
                        <div className="w-10 shrink-0 text-slate-600 text-right pr-1.5 self-center text-[10px]">out</div>
                        {activeSbox.map((v, i) => {
                          const ni = nibbleAtIdx(i);
                          return (
                            <div key={i} className={`flex-1 text-center py-1.5 rounded font-bold transition-all ${
                              ni >= 0 ? NIBBLE_BG[ni] : 'bg-slate-800/50 text-slate-500'
                            }`}>
                              {v.toString(16).toUpperCase()}
                            </div>
                          );
                        })}
                      </div>

                      {/* Pointer arrows row */}
                      <div className="flex font-mono text-[9px] mt-0.5">
                        <div className="w-10 shrink-0" />
                        {Array.from({ length: 16 }, (_, i) => {
                          const ni = nibbleAtIdx(i);
                          return (
                            <div key={i} className={`flex-1 text-center ${ni >= 0 ? NIBBLE_TEXT[ni] : 'text-transparent'}`}>
                              ▲
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex font-mono text-[9px]">
                        <div className="w-10 shrink-0" />
                        {Array.from({ length: 16 }, (_, i) => {
                          const ni = nibbleAtIdx(i);
                          return (
                            <div key={i} className={`flex-1 text-center ${ni >= 0 ? NIBBLE_TEXT[ni] : 'text-transparent'}`}>
                              N{ni >= 0 ? ni : ''}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* ── Per-nibble breakdown ── */}
                    <div className="space-y-2">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Per-nibble detail</div>
                      {nibbles.map(({ inNib, outNib }, n) => {
                        const inBits  = Array.from({ length: 4 }, (_, i) => (inNib  >> (3 - i)) & 1);
                        const outBits = Array.from({ length: 4 }, (_, i) => (outNib >> (3 - i)) & 1);
                        return (
                          <div key={n} className="bg-slate-800/50 rounded-lg p-3 font-mono text-xs">
                            {/* Label row */}
                            <div className={`text-[10px] font-bold mb-2 ${NIBBLE_LABEL[n]}`}>Nibble {n}</div>

                            {/* Input → index → output pipeline */}
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Input bits */}
                              <div className="flex flex-col items-center gap-0.5">
                                <div className="text-[9px] text-slate-500">input bits</div>
                                <div className="flex gap-0.5">
                                  {inBits.map((b, i) => (
                                    <div key={i} className={`w-5 h-5 flex items-center justify-center rounded text-[10px] border font-bold ${
                                      b ? 'bg-green-900/70 border-green-600 text-green-200' : 'bg-slate-900 border-slate-700 text-slate-600'
                                    }`}>{b}</div>
                                  ))}
                                </div>
                              </div>

                              {/* Input hex */}
                              <div className="flex flex-col items-center gap-0.5">
                                <div className="text-[9px] text-slate-500">= index</div>
                                <div className={`text-sm font-bold px-2 py-0.5 rounded ${NIBBLE_BG[n]}`}>
                                  {inNib.toString(16).toUpperCase()}
                                </div>
                              </div>

                              {/* Arrow */}
                              <div className="flex flex-col items-center">
                                <div className="text-[9px] text-slate-600">SBOX</div>
                                <div className="text-slate-500 text-base">→</div>
                              </div>

                              {/* Output hex */}
                              <div className="flex flex-col items-center gap-0.5">
                                <div className="text-[9px] text-slate-500">output</div>
                                <div className="text-sm font-bold text-green-300 px-2 py-0.5 rounded bg-green-900/30 border border-green-700/40">
                                  {outNib.toString(16).toUpperCase()}
                                </div>
                              </div>

                              {/* Output bits */}
                              <div className="flex flex-col items-center gap-0.5">
                                <div className="text-[9px] text-slate-500">output bits</div>
                                <div className="flex gap-0.5">
                                  {outBits.map((b, i) => (
                                    <div key={i} className={`w-5 h-5 flex items-center justify-center rounded text-[10px] border font-bold ${
                                      b ? 'bg-green-900/70 border-green-600 text-green-200' : 'bg-slate-900 border-slate-700 text-slate-600'
                                    }`}>{b}</div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Change summary */}
                            <div className="mt-2 text-[10px] text-slate-500">
                              <span className={NIBBLE_TEXT[n]}>{inNib.toString(2).padStart(4,'0').split('').join(' ')}</span>
                              {' '}({inNib.toString(16).toUpperCase()}){'  '}→{'  '}
                              <span className="text-green-400">{outNib.toString(2).padStart(4,'0').split('').join(' ')}</span>
                              {' '}({outNib.toString(16).toUpperCase()})
                              {'  ·  '}{
                                [0,1,2,3].filter(i => ((inNib >> (3-i)) & 1) !== ((outNib >> (3-i)) & 1)).length
                              } bit{[0,1,2,3].filter(i => ((inNib >> (3-i)) & 1) !== ((outNib >> (3-i)) & 1)).length !== 1 ? 's' : ''} flipped
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Permutation Detail */}
              {isPermStage && (
                <div className="bg-slate-900/60 border border-blue-900/40 rounded-xl p-5">
                  <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-3">Bit Permutation</div>
                  <p className="text-xs text-slate-500 mb-3">Bit <em>i</em> moves to position PERM[i]</p>
                  <PermDiagram value={stages[currentStage - 1]} />
                  <div className="mt-3 grid grid-cols-4 gap-1.5 font-mono text-[10px]">
                    {[0, 1, 2, 3].map(n => (
                      <div key={n} className={`text-center py-1 rounded ${['bg-amber-900/30 text-amber-400', 'bg-emerald-900/30 text-emerald-400', 'bg-sky-900/30 text-sky-400', 'bg-pink-900/30 text-pink-400'][n]}`}>
                        Nibble {n}: bits {n * 4}–{n * 4 + 3}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Plain/Cipher stage info */}
              {(activeType === 'plain' || activeType === 'cipher') && (
                <div className={`bg-slate-900/60 border rounded-xl p-5 ${activeType === 'plain' ? 'border-amber-900/40' : 'border-cyan-900/40'}`}>
                  <div className={`text-xs font-bold uppercase tracking-wider mb-3 ${activeType === 'plain' ? 'text-amber-400' : 'text-cyan-400'}`}>
                    {activeType === 'plain' ? 'Input Plaintext' : 'Output Ciphertext'}
                  </div>
                  <div className="font-mono text-lg font-bold text-white">{toHex4(stages[currentStage])}</div>
                  <div className="flex gap-0.5 mt-2 flex-wrap">
                    {to16Bits(stages[currentStage]).map((b, i) => (
                      <span key={i} className={`font-mono text-xs ${b ? (activeType === 'plain' ? 'text-amber-300' : 'text-cyan-300') : 'text-slate-700'}`}>{b}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* XOR stage info */}
              {activeType === 'xor' && (
                <div className="bg-slate-900/60 border border-violet-900/40 rounded-xl p-5">
                  <div className="text-xs font-bold text-violet-400 uppercase tracking-wider mb-3">Key Whitening (XOR)</div>
                  {(() => {
                    const ki = [1, 4, 7, 9].indexOf(currentStage);
                    const keyIdx = ki >= 0 ? ki : 0;
                    const prevVal = stages[currentStage - 1];
                    const keyVal2 = subkeys[keyIdx];
                    const result = stages[currentStage];
                    return (
                      <div className="font-mono text-xs space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="text-slate-500 w-8">In:</span>
                          <span className="text-white">{toHex4(prevVal)}</span>
                          <div className="flex gap-0.5">{to16Bits(prevVal).map((b, i) => <span key={i} className={b ? 'text-slate-300' : 'text-slate-700'}>{b}</span>)}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-violet-400 w-8">K{keyIdx}:</span>
                          <span className="text-violet-300">{toHex4(keyVal2)}</span>
                          <div className="flex gap-0.5">{to16Bits(keyVal2).map((b, i) => <span key={i} className={b ? 'text-violet-300' : 'text-slate-700'}>{b}</span>)}</div>
                        </div>
                        <div className="border-t border-slate-700 pt-2 flex items-center gap-3">
                          <span className="text-white w-8">Out:</span>
                          <span className="text-white font-bold">{toHex4(result)}</span>
                          <div className="flex gap-0.5">{to16Bits(result).map((b, i) => <span key={i} className={b ? 'text-violet-200' : 'text-slate-700'}>{b}</span>)}</div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Step Explanation Card */}
              <div className={`rounded-xl border p-5 space-y-3 ${
                activeType === 'xor'    ? 'bg-violet-950/20 border-violet-900/40' :
                activeType === 'sub'    ? 'bg-green-950/20 border-green-900/40' :
                activeType === 'perm'   ? 'bg-blue-950/20 border-blue-900/40' :
                activeType === 'plain'  ? 'bg-amber-950/20 border-amber-900/40' :
                                          'bg-cyan-950/20 border-cyan-900/40'
              }`}>
                <div className={`text-xs font-bold uppercase tracking-wider ${
                  activeType === 'xor'   ? 'text-violet-400' :
                  activeType === 'sub'   ? 'text-green-400' :
                  activeType === 'perm'  ? 'text-blue-400' :
                  activeType === 'plain' ? 'text-amber-400' :
                                           'text-cyan-400'
                }`}>
                  {activeExplanations[currentStage].heading}
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">What is happening</div>
                  <p className="text-sm text-slate-300 leading-relaxed">{activeExplanations[currentStage].what}</p>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Why we do this</div>
                  <p className="text-sm text-slate-400 leading-relaxed">{activeExplanations[currentStage].why}</p>
                </div>
                {activeExplanations[currentStage].tip && (
                  <div className="bg-slate-900/60 rounded-lg px-3 py-2 border border-slate-700/60">
                    <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Tip: </span>
                    <span className="text-xs text-slate-400">{activeExplanations[currentStage].tip}</span>
                  </div>
                )}
              </div>

              {/* Key Schedule */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Key Schedule</div>
                <div className="space-y-2 font-mono text-xs">
                  <div>
                    <div className="text-slate-500 mb-1">Master Key (32-bit)</div>
                    <div className="flex gap-0.5 flex-wrap">
                      {Array.from({ length: 32 }, (_, i) => {
                        const kv = isNaN(keyVal) ? 0 : keyVal & 0xFFFFFFFF;
                        const bit = (kv >> (31 - i)) & 1;
                        return <span key={i} className={`${bit ? 'text-violet-300' : 'text-slate-700'}${i > 0 && i % 8 === 0 ? ' ml-1' : ''}`}>{bit}</span>;
                      })}
                    </div>
                    <div className="text-violet-400 mt-1">{keyHex.padStart(8, '0').toUpperCase()}</div>
                  </div>
                  {subkeys.map((sk, ki) => {
                    const ranges = ['bits 31–16', 'bits 23–8', 'bits 15–0', 'bits 31–16'];
                    const isUsed = mode === 'encrypt'
                      ? [1, 4, 7, 9].indexOf(currentStage) === ki
                      : [9, 6, 3, 1].indexOf(currentStage) === ki; // decrypt uses k0,k1,k2,k3 at stages 9,6,3,1
                    return (
                      <div key={ki} className={`rounded-lg px-2 py-1.5 transition-colors ${isUsed ? 'bg-violet-900/30 ring-1 ring-violet-600/40' : 'bg-slate-800/30'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={isUsed ? 'text-violet-300 font-bold' : 'text-slate-500'}>K{ki}</span>
                          <span className="text-slate-600 text-[10px]">({ranges[ki]})</span>
                          <span className={`ml-auto ${isUsed ? 'text-violet-200' : 'text-slate-500'}`}>{toHex4(sk)}</span>
                        </div>
                        <div className="flex gap-0.5">
                          {to16Bits(sk).map((b, i) => (
                            <span key={i} className={b ? (isUsed ? 'text-violet-300' : 'text-slate-400') : 'text-slate-700'}>{b}</span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

        </div>
      </div>
      )}
    </div>
  );
};

export default SPNApp;
