// ─── Fortuna CSPRNG Engine ──────────────────────────────────────────────
// Simplified but structurally accurate Fortuna implementation.
// Uses a software AES-256 core for the generator and SHA-256 for reseeding.
// Based on Ferguson & Schneier's design from "Practical Cryptography" (2003).

// ─── AES-256 Core (minimal implementation for CTR mode) ─────────────────

const SBOX = [
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

const RCON = [0x01,0x02,0x04,0x08,0x10,0x20,0x40,0x80,0x1b,0x36];

function subWord(w: number): number {
  return (SBOX[(w >>> 24) & 0xff] << 24) |
         (SBOX[(w >>> 16) & 0xff] << 16) |
         (SBOX[(w >>> 8)  & 0xff] << 8)  |
          SBOX[w & 0xff];
}

function rotWord(w: number): number {
  return ((w << 8) | (w >>> 24)) >>> 0;
}

function aes256KeyExpansion(key: Uint8Array): Uint32Array {
  const Nk = 8, Nr = 14;
  const W = new Uint32Array(4 * (Nr + 1));
  for (let i = 0; i < Nk; i++) {
    W[i] = (key[4*i] << 24) | (key[4*i+1] << 16) | (key[4*i+2] << 8) | key[4*i+3];
  }
  for (let i = Nk; i < 4 * (Nr + 1); i++) {
    let temp = W[i - 1];
    if (i % Nk === 0) {
      temp = (subWord(rotWord(temp)) ^ (RCON[(i / Nk) - 1] << 24)) >>> 0;
    } else if (i % Nk === 4) {
      temp = subWord(temp);
    }
    W[i] = (W[i - Nk] ^ temp) >>> 0;
  }
  return W;
}

function xtime(a: number): number {
  return ((a << 1) ^ ((a & 0x80) ? 0x1b : 0)) & 0xff;
}

function gmul(a: number, b: number): number {
  let p = 0;
  for (let i = 0; i < 8; i++) {
    if (b & 1) p ^= a;
    a = xtime(a);
    b >>= 1;
  }
  return p & 0xff;
}

function aes256EncryptBlock(block: Uint8Array, expandedKey: Uint32Array): Uint8Array {
  const Nr = 14;
  // State is column-major 4×4
  const s = new Uint8Array(16);
  for (let i = 0; i < 16; i++) s[i] = block[i];

  // AddRoundKey(0)
  for (let c = 0; c < 4; c++) {
    const w = expandedKey[c];
    s[4*c]   ^= (w >>> 24) & 0xff;
    s[4*c+1] ^= (w >>> 16) & 0xff;
    s[4*c+2] ^= (w >>> 8)  & 0xff;
    s[4*c+3] ^= w & 0xff;
  }

  for (let round = 1; round <= Nr; round++) {
    // SubBytes
    for (let i = 0; i < 16; i++) s[i] = SBOX[s[i]];
    // ShiftRows
    const t1 = s[1]; s[1] = s[5]; s[5] = s[9]; s[9] = s[13]; s[13] = t1;
    const t2a = s[2]; const t2b = s[6]; s[2] = s[10]; s[6] = s[14]; s[10] = t2a; s[14] = t2b;
    const t3 = s[15]; s[15] = s[11]; s[11] = s[7]; s[7] = s[3]; s[3] = t3;
    // MixColumns (skip in last round)
    if (round < Nr) {
      for (let c = 0; c < 4; c++) {
        const a0 = s[4*c], a1 = s[4*c+1], a2 = s[4*c+2], a3 = s[4*c+3];
        s[4*c]   = gmul(a0,2) ^ gmul(a1,3) ^ a2 ^ a3;
        s[4*c+1] = a0 ^ gmul(a1,2) ^ gmul(a2,3) ^ a3;
        s[4*c+2] = a0 ^ a1 ^ gmul(a2,2) ^ gmul(a3,3);
        s[4*c+3] = gmul(a0,3) ^ a1 ^ a2 ^ gmul(a3,2);
      }
    }
    // AddRoundKey
    for (let c = 0; c < 4; c++) {
      const w = expandedKey[round * 4 + c];
      s[4*c]   ^= (w >>> 24) & 0xff;
      s[4*c+1] ^= (w >>> 16) & 0xff;
      s[4*c+2] ^= (w >>> 8)  & 0xff;
      s[4*c+3] ^= w & 0xff;
    }
  }

  return s;
}

// ─── SHA-256 (minimal implementation for reseeding) ─────────────────────

const SHA256_K = new Uint32Array([
  0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
  0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
  0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
  0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
  0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
  0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
  0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
  0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2,
]);

function sha256(data: Uint8Array): Uint8Array {
  let H0 = 0x6a09e667, H1 = 0xbb67ae85, H2 = 0x3c6ef372, H3 = 0xa54ff53a;
  let H4 = 0x510e527f, H5 = 0x9b05688c, H6 = 0x1f83d9ab, H7 = 0x5be0cd19;

  // Padding
  const bitLen = data.length * 8;
  const padLen = (64 - ((data.length + 9) % 64)) % 64;
  const padded = new Uint8Array(data.length + 1 + padLen + 8);
  padded.set(data);
  padded[data.length] = 0x80;
  // Length in bits as big-endian 64-bit
  const dv = new DataView(padded.buffer);
  dv.setUint32(padded.length - 4, bitLen, false);

  const rotr = (x: number, n: number) => ((x >>> n) | (x << (32 - n))) >>> 0;

  for (let offset = 0; offset < padded.length; offset += 64) {
    const W = new Uint32Array(64);
    for (let i = 0; i < 16; i++) {
      W[i] = dv.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(W[i-15], 7) ^ rotr(W[i-15], 18) ^ (W[i-15] >>> 3);
      const s1 = rotr(W[i-2], 17) ^ rotr(W[i-2], 19) ^ (W[i-2] >>> 10);
      W[i] = (W[i-16] + s0 + W[i-7] + s1) >>> 0;
    }

    let a = H0, b = H1, c = H2, d = H3, e = H4, f = H5, g = H6, h = H7;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + SHA256_K[i] + W[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + temp1) >>> 0;
      d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }
    H0 = (H0 + a) >>> 0; H1 = (H1 + b) >>> 0; H2 = (H2 + c) >>> 0; H3 = (H3 + d) >>> 0;
    H4 = (H4 + e) >>> 0; H5 = (H5 + f) >>> 0; H6 = (H6 + g) >>> 0; H7 = (H7 + h) >>> 0;
  }

  const result = new Uint8Array(32);
  const rv = new DataView(result.buffer);
  rv.setUint32(0, H0); rv.setUint32(4, H1); rv.setUint32(8, H2); rv.setUint32(12, H3);
  rv.setUint32(16, H4); rv.setUint32(20, H5); rv.setUint32(24, H6); rv.setUint32(28, H7);
  return result;
}

// ─── Fortuna CSPRNG ─────────────────────────────────────────────────────

export const NUM_POOLS = 32;

export interface PoolState {
  data: Uint8Array;    // accumulated entropy bytes
  length: number;      // how many bytes have been added
}

export interface GeneratorState {
  key: Uint8Array;     // 32-byte AES-256 key
  counter: Uint8Array; // 16-byte counter (128-bit)
}

export interface FortunaState {
  pools: PoolState[];
  generator: GeneratorState;
  reseedCount: number;
  totalGenerated: number; // bytes generated since last reseed
  lastReseedTime: number;
}

export interface FortunaEvent {
  type: 'add_entropy' | 'reseed' | 'generate' | 'rekey';
  detail: string;
  poolIndex?: number;
  poolsUsed?: number[];
  bytesGenerated?: number;
  oldKey?: Uint8Array;
  newKey?: Uint8Array;
}

export function createFortunaState(): FortunaState {
  const pools: PoolState[] = [];
  for (let i = 0; i < NUM_POOLS; i++) {
    pools.push({ data: new Uint8Array(0), length: 0 });
  }
  return {
    pools,
    generator: {
      key: new Uint8Array(32), // initially zero
      counter: new Uint8Array(16),
    },
    reseedCount: 0,
    totalGenerated: 0,
    lastReseedTime: 0,
  };
}

function incrementCounter(counter: Uint8Array): void {
  for (let i = 15; i >= 0; i--) {
    counter[i]++;
    if (counter[i] !== 0) break;
  }
}

function isCounterZero(counter: Uint8Array): boolean {
  return counter.every(b => b === 0);
}

// Generate blocks from the generator (AES-256-CTR)
function generateBlocks(gen: GeneratorState, numBlocks: number): Uint8Array {
  const output = new Uint8Array(numBlocks * 16);
  const expandedKey = aes256KeyExpansion(gen.key);

  for (let i = 0; i < numBlocks; i++) {
    incrementCounter(gen.counter);
    const block = aes256EncryptBlock(gen.counter, expandedKey);
    output.set(block, i * 16);
  }

  return output;
}

// Add entropy to a specific pool
export function addEntropy(
  state: FortunaState,
  sourceId: number,
  data: Uint8Array,
): FortunaEvent {
  const poolIndex = sourceId % NUM_POOLS;
  const pool = state.pools[poolIndex];

  // Concatenate new data (in real Fortuna this feeds into a hash accumulator)
  const newData = new Uint8Array(pool.data.length + data.length);
  newData.set(pool.data);
  newData.set(data, pool.data.length);
  pool.data = newData;
  pool.length += data.length;

  return {
    type: 'add_entropy',
    detail: `Added ${data.length} bytes from source ${sourceId} to pool ${poolIndex}`,
    poolIndex,
  };
}

// Determine which pools participate in a reseed
export function getReseedPools(reseedCount: number): number[] {
  const pools: number[] = [];
  for (let i = 0; i < NUM_POOLS; i++) {
    // Pool i is used every 2^i reseeds
    if (reseedCount % (1 << i) === 0) {
      pools.push(i);
    } else {
      break; // once a pool is skipped, all higher pools are also skipped
    }
  }
  return pools;
}

// Reseed the generator
export function reseed(state: FortunaState): FortunaEvent | null {
  // Only reseed if pool 0 has enough entropy (≥64 bytes in real Fortuna)
  if (state.pools[0].length < 2) return null;

  state.reseedCount++;
  const poolsUsed = getReseedPools(state.reseedCount);
  const oldKey = new Uint8Array(state.generator.key);

  // Concatenate current key + all participating pool data, then SHA-256
  let totalLen = 32; // current key
  for (const pi of poolsUsed) totalLen += state.pools[pi].data.length;

  const seedMaterial = new Uint8Array(totalLen);
  seedMaterial.set(state.generator.key);
  let offset = 32;
  for (const pi of poolsUsed) {
    seedMaterial.set(state.pools[pi].data, offset);
    offset += state.pools[pi].data.length;
    // Clear pool after use
    state.pools[pi].data = new Uint8Array(0);
    state.pools[pi].length = 0;
  }

  // New key = SHA-256(old_key || pool_data)
  state.generator.key = sha256(seedMaterial);
  // Increment counter (ensures non-repeat)
  incrementCounter(state.generator.counter);
  state.totalGenerated = 0;
  state.lastReseedTime = Date.now();

  return {
    type: 'reseed',
    detail: `Reseed #${state.reseedCount} using pools [${poolsUsed.join(', ')}]`,
    poolsUsed,
    oldKey,
    newKey: new Uint8Array(state.generator.key),
  };
}

// Generate random bytes
export function generateBytes(state: FortunaState, numBytes: number): { bytes: Uint8Array; events: FortunaEvent[] } {
  const events: FortunaEvent[] = [];

  if (isCounterZero(state.generator.counter) && state.reseedCount === 0) {
    // Not yet seeded — force a reseed if possible
    const reseedEvent = reseed(state);
    if (reseedEvent) events.push(reseedEvent);
    if (isCounterZero(state.generator.counter)) {
      // Still not seeded — return zeros
      return { bytes: new Uint8Array(numBytes), events };
    }
  }

  // Generate ceil(numBytes/16) blocks
  const numBlocks = Math.ceil(numBytes / 16);
  const raw = generateBlocks(state.generator, numBlocks);
  const output = raw.slice(0, numBytes);

  events.push({
    type: 'generate',
    detail: `Generated ${numBytes} bytes (${numBlocks} AES blocks)`,
    bytesGenerated: numBytes,
  });

  state.totalGenerated += numBytes;

  // Rekey: generate 2 more blocks and use them as the new key
  const oldKey = new Uint8Array(state.generator.key);
  const rekeyBlocks = generateBlocks(state.generator, 2);
  state.generator.key = rekeyBlocks;

  events.push({
    type: 'rekey',
    detail: 'Rekeyed generator with 2 fresh AES blocks (32 bytes)',
    oldKey,
    newKey: new Uint8Array(state.generator.key),
  });

  return { bytes: output, events };
}

// ─── Randomness analysis utilities ──────────────────────────────────────

export function byteFrequency(data: Uint8Array): number[] {
  const freq = new Array(256).fill(0);
  for (const b of data) freq[b]++;
  return freq;
}

export function bitBalance(data: Uint8Array): { zeros: number; ones: number } {
  let ones = 0;
  for (const b of data) {
    for (let i = 0; i < 8; i++) {
      if ((b >> i) & 1) ones++;
    }
  }
  const total = data.length * 8;
  return { zeros: total - ones, ones };
}

export function chiSquared(data: Uint8Array): number {
  const freq = byteFrequency(data);
  const expected = data.length / 256;
  if (expected === 0) return 0;
  let chi2 = 0;
  for (let i = 0; i < 256; i++) {
    chi2 += ((freq[i] - expected) ** 2) / expected;
  }
  return chi2;
}

// Runs test: count sequences of same bit
export function runsTest(data: Uint8Array): { runs: number; expected: number } {
  if (data.length === 0) return { runs: 0, expected: 0 };
  const bits: number[] = [];
  for (const b of data) {
    for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1);
  }
  let runs = 1;
  for (let i = 1; i < bits.length; i++) {
    if (bits[i] !== bits[i - 1]) runs++;
  }
  const n = bits.length;
  const ones = bits.reduce((a, b) => a + b, 0);
  const p = ones / n;
  const expected = 1 + 2 * n * p * (1 - p);
  return { runs, expected };
}

// Monte Carlo Pi estimation from byte pairs
export function monteCarloPi(data: Uint8Array): number {
  let inside = 0;
  const pairs = Math.floor(data.length / 2);
  for (let i = 0; i < pairs; i++) {
    const x = data[i * 2] / 256;
    const y = data[i * 2 + 1] / 256;
    if (x * x + y * y <= 1) inside++;
  }
  return pairs > 0 ? (4 * inside) / pairs : 0;
}

export function toHex(bytes: Uint8Array, maxLen?: number): string {
  const slice = maxLen ? bytes.slice(0, maxLen) : bytes;
  return Array.from(slice).map(b => b.toString(16).padStart(2, '0')).join('');
}
