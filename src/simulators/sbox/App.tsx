import React, { useState, useCallback, useMemo } from 'react';

// ── 4-bit flat tables (16 values each) ───────────────────────────────────────
const FLAT4: Record<string, number[]> = {
  toy:      [0xE,0x4,0xD,0x1,0x2,0xF,0xB,0x8,0x3,0xA,0x6,0xC,0x5,0x9,0x0,0x7],
  present:  [12,5,6,11,9,0,10,13,3,14,15,8,4,7,1,2],
  skinny:   [12,6,9,0,1,10,2,11,3,8,5,13,4,14,7,15],
  gift:     [1,10,4,12,6,15,3,9,2,13,11,7,5,0,8,14],
  serp0:    [3,8,15,1,10,6,5,11,14,13,4,2,7,0,9,12],
  serp1:    [15,12,2,7,9,0,5,10,1,11,14,8,6,13,3,4],
  serp2:    [8,6,7,9,3,12,10,15,13,1,14,4,0,11,5,2],
  serp3:    [0,15,11,8,12,9,6,3,13,1,2,4,10,7,5,14],
  serp4:    [1,15,8,3,12,0,11,6,2,5,4,10,9,14,7,13],
  serp5:    [15,5,2,11,4,10,9,12,0,3,14,8,13,6,7,1],
  serp6:    [7,2,12,5,8,4,6,11,14,9,1,15,13,3,10,0],
  serp7:    [1,13,15,0,14,8,2,11,7,4,12,10,9,3,5,6],
};
function make4x4(f: number[]): number[][] { return Array.from({length:4},(_,r)=>f.slice(r*4,r*4+4)); }

// ── 6-bit (8×8) ──────────────────────────────────────────────────────────────
const S8_FLAT = [
  0x35,0x0F,0x29,0x1A,0x3E,0x06,0x14,0x23,0x3B,0x18,0x02,0x2D,0x10,0x37,0x0B,0x3C,
  0x21,0x0A,0x3F,0x16,0x27,0x01,0x33,0x0C,0x1E,0x38,0x0D,0x2A,0x05,0x1C,0x31,0x12,
  0x2F,0x17,0x09,0x3A,0x22,0x2C,0x04,0x19,0x3D,0x0E,0x28,0x13,0x36,0x03,0x1F,0x2B,
  0x20,0x39,0x11,0x1D,0x07,0x30,0x2E,0x15,0x08,0x34,0x1B,0x26,0x00,0x24,0x32,0x25,
];
const S8 = Array.from({length:8},(_,r)=>S8_FLAT.slice(r*8,r*8+8));

// ── 8-bit flat tables (256 values each) ──────────────────────────────────────
const AES_FLAT = [
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
const SM4_FLAT = [
  0xD6,0x90,0xE9,0xFE,0xCC,0xE1,0x3D,0xB7,0x16,0xB6,0x14,0xC2,0x28,0xFB,0x2C,0x05,
  0x2B,0x67,0x9A,0x76,0x2A,0xBE,0x04,0xC3,0xAA,0x44,0x13,0x26,0x49,0x86,0x06,0x99,
  0x9C,0x42,0x50,0xF4,0x91,0xEF,0x98,0x7A,0x33,0x54,0x0B,0x43,0xED,0xCF,0xAC,0x62,
  0xE4,0xB3,0x1C,0xA9,0xC9,0x08,0xE8,0x95,0x80,0xDF,0x94,0xFA,0x75,0x8F,0x3F,0xA6,
  0x47,0x07,0xA7,0xFC,0xF3,0x73,0x17,0xBA,0x83,0x59,0x3C,0x19,0xE6,0x85,0x4F,0xA8,
  0x68,0x6B,0x81,0xB2,0x71,0x64,0xDA,0x8B,0xF8,0xEB,0x0F,0x4B,0x70,0x56,0x9D,0x35,
  0x1E,0x24,0x0E,0x5E,0x63,0x58,0xD1,0xA2,0x25,0x22,0x7C,0x3B,0x01,0x21,0x78,0x87,
  0xD4,0x00,0x46,0x57,0x9F,0xD3,0x27,0x52,0x4C,0x36,0x02,0xE7,0xA0,0xC4,0xC8,0x9E,
  0xEA,0xBF,0x8A,0xD2,0x40,0xC7,0x38,0xB5,0xA3,0xF7,0xF2,0xCE,0xF9,0x61,0x15,0xA1,
  0xE0,0xAE,0x5D,0xA4,0x9B,0x34,0x1A,0x55,0xAD,0x93,0x32,0x30,0xF5,0x8C,0xB1,0xE3,
  0x1D,0xF6,0xE2,0x2E,0x82,0x66,0xCA,0x60,0xC0,0x29,0x23,0xAB,0x0D,0x53,0x4E,0x6F,
  0xD5,0xDB,0x37,0x45,0xDE,0xFD,0x8E,0x2F,0x03,0xFF,0x6A,0x72,0x6D,0x6C,0x5B,0x51,
  0x8D,0x1B,0xAF,0x92,0xBB,0xDD,0xBC,0x7F,0x11,0xD9,0x5C,0x41,0x1F,0x10,0x5A,0xD8,
  0x0A,0xC1,0x31,0x88,0xA5,0xCD,0x7B,0xBD,0x2D,0x74,0xD0,0x12,0xB8,0xE5,0xB4,0xB0,
  0x89,0x69,0x97,0x4A,0x0C,0x96,0x77,0x7E,0x65,0xB9,0xF1,0x09,0xC5,0x6E,0xC6,0x84,
  0x18,0xF0,0x7D,0xEC,0x3A,0xDC,0x4D,0x20,0x79,0xEE,0x5F,0x3E,0xD7,0xCB,0x39,0x48,
];
const FLAT8: Record<string, number[]> = { aes: AES_FLAT, sm4: SM4_FLAT };
function make16x16(f: number[]): number[][] { return Array.from({length:16},(_,r)=>f.slice(r*16,r*16+16)); }

// ── DES S-boxes (4 rows × 16 cols, 6-bit in → 4-bit out) ────────────────────
// Row addressing: row = b5||b0 (outer bits), col = b4b3b2b1 (inner bits)
const DES_TABLES: Record<string, number[][]> = {
  s1:[[14,4,13,1,2,15,11,8,3,10,6,12,5,9,0,7],[0,15,7,4,14,2,13,1,10,6,12,11,9,5,3,8],[4,1,14,8,13,6,2,11,15,12,9,7,3,10,5,0],[15,12,8,2,4,9,1,7,5,11,3,14,10,0,6,13]],
  s2:[[15,1,8,14,6,11,3,4,9,7,2,13,12,0,5,10],[3,13,4,7,15,2,8,14,12,0,1,10,6,9,11,5],[0,14,7,11,10,4,13,1,5,8,12,6,9,3,2,15],[13,8,10,1,3,15,4,2,11,6,7,12,0,5,14,9]],
  s3:[[10,0,9,14,6,3,15,5,1,13,12,7,11,4,2,8],[13,7,0,9,3,4,6,10,2,8,5,14,12,11,15,1],[13,6,4,9,8,15,3,0,11,1,2,12,5,10,14,7],[1,10,13,0,6,9,8,7,4,15,14,3,11,5,2,12]],
  s4:[[7,13,14,3,0,6,9,10,1,2,8,5,11,12,4,15],[13,8,11,5,6,15,0,3,4,7,2,12,1,10,14,9],[10,6,9,0,12,11,7,13,15,1,3,14,5,2,8,4],[3,15,0,6,10,1,13,8,9,4,5,11,12,7,2,14]],
  s5:[[2,12,4,1,7,10,11,6,8,5,3,15,13,0,14,9],[14,11,2,12,4,7,13,1,5,0,15,10,3,9,8,6],[4,2,1,11,10,13,7,8,15,9,12,5,6,3,0,14],[11,8,12,7,1,14,2,13,6,15,0,9,10,4,5,3]],
  s6:[[12,1,10,15,9,2,6,8,0,13,3,4,14,7,5,11],[10,15,4,2,7,12,9,5,6,1,13,14,0,11,3,8],[9,14,15,5,2,8,12,3,7,0,4,10,1,13,11,6],[4,3,2,12,9,5,15,10,11,14,1,7,6,0,8,13]],
  s7:[[4,11,2,14,15,0,8,13,3,12,9,7,5,10,6,1],[13,0,11,7,4,9,1,10,14,3,5,12,2,15,8,6],[1,4,11,13,12,3,7,14,10,15,6,8,0,5,9,2],[6,11,13,8,1,4,10,7,9,5,0,15,14,2,3,12]],
  s8:[[13,2,8,4,6,15,11,1,10,9,3,14,5,0,12,7],[1,15,13,8,10,3,7,4,12,5,6,11,0,14,9,2],[7,11,4,1,9,12,14,2,0,6,10,13,15,3,5,8],[2,1,14,7,4,10,8,13,15,12,9,0,3,5,6,11]],
};

// ── Inverse builder (bijective S-boxes only) ──────────────────────────────────
function buildInverse(tbl: number[][], rows: number, cols: number, loBits: number): number[][] {
  const mask = (1 << loBits) - 1;
  const inv  = Array.from({length:rows},()=>new Array(cols).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const v = tbl[r][c];
      inv[v >> loBits][v & mask] = (r << loBits) | c;
    }
  return inv;
}

// Precompute inverses for all bijective tables
const INV4:  Record<string, number[][]> = {};
const INV8:  Record<string, number[][]> = {};
for (const [k,f] of Object.entries(FLAT4)) INV4[k]  = buildInverse(make4x4(f),  4,  4, 2);
for (const [k,f] of Object.entries(FLAT8)) INV8[k]  = buildInverse(make16x16(f),16,16, 4);
const INV6 = buildInverse(S8, 8, 8, 3);

// ── Types / Config ────────────────────────────────────────────────────────────
type Tab = '4bit' | '6bit' | '8bit' | 'des';

interface TabCfg {
  rows: number; cols: number;
  inBits: number; outBits: number;
  rowBits: number; colBits: number;
  tblHex: number;  // hex digits for table headers/cells
  inHex: number;   // hex digits for input in probe panel
  maxInput: number; maxOutput: number;
  des: boolean;
}
const TAB_CFG: Record<Tab, TabCfg> = {
  '4bit': { rows:4,  cols:4,  inBits:4, outBits:4, rowBits:2, colBits:2, tblHex:1, inHex:1, maxInput:15,  maxOutput:15,  des:false },
  '6bit': { rows:8,  cols:8,  inBits:6, outBits:6, rowBits:3, colBits:3, tblHex:2, inHex:2, maxInput:63,  maxOutput:63,  des:false },
  '8bit': { rows:16, cols:16, inBits:8, outBits:8, rowBits:4, colBits:4, tblHex:2, inHex:2, maxInput:255, maxOutput:255, des:false },
  'des':  { rows:4,  cols:16, inBits:6, outBits:4, rowBits:2, colBits:4, tblHex:1, inHex:2, maxInput:63,  maxOutput:15,  des:true  },
};

const VARIANTS: Record<Tab, string[]> = {
  '4bit': ['toy','present','skinny','gift','serp0','serp1','serp2','serp3','serp4','serp5','serp6','serp7'],
  '6bit': ['custom'],
  '8bit': ['aes','sm4'],
  'des':  ['s1','s2','s3','s4','s5','s6','s7','s8'],
};
const DEFAULT_VARIANT: Record<Tab, string> = { '4bit':'toy', '6bit':'custom', '8bit':'aes', 'des':'s1' };

interface VMeta { label: string; cipher: string; sideInfo: string; }
const VMETA: Record<string, VMeta> = {
  toy:     { label:'Toy (DES-style)',  cipher:'Tutorial',       sideInfo:'<strong>Toy 4-bit S-Box:</strong> A pedagogical 4-bit bijection used in textbook SPN ciphers. Same structure as the DES mini S-boxes taught in courses. All 16 values appear exactly once.' },
  present: { label:'PRESENT',         cipher:'PRESENT (2007)', sideInfo:'<strong>PRESENT S-Box:</strong> From the PRESENT lightweight block cipher (2007), designed for constrained hardware like RFID tags. One of the most widely studied 4-bit S-boxes for differential/linear cryptanalysis resistance.' },
  skinny:  { label:'SKINNY',          cipher:'SKINNY (2016)',  sideInfo:'<strong>SKINNY S-Box:</strong> From the SKINNY tweakable block cipher family (2016). Designed for low-latency hardware with a simple algebraic structure over GF(2⁴).' },
  gift:    { label:'GIFT',            cipher:'GIFT (2017)',    sideInfo:'<strong>GIFT S-Box:</strong> From the GIFT ultra-lightweight cipher (2017), a redesign of PRESENT optimized for both hardware area and software speed. Used in GIFT-COFB, a NIST lightweight finalist.' },
  serp0:   { label:'Serpent S0',      cipher:'Serpent (1998)', sideInfo:'<strong>Serpent S0:</strong> One of 8 S-boxes used in rotation by Serpent, the AES competition finalist (1998). Serpent applies a different S-box each round, cycling S0→S7→S0…' },
  serp1:   { label:'Serpent S1',      cipher:'Serpent (1998)', sideInfo:'<strong>Serpent S1:</strong> Round 1, 9 S-box in the Serpent rotation.' },
  serp2:   { label:'Serpent S2',      cipher:'Serpent (1998)', sideInfo:'<strong>Serpent S2:</strong> Round 2, 10 S-box in the Serpent rotation.' },
  serp3:   { label:'Serpent S3',      cipher:'Serpent (1998)', sideInfo:'<strong>Serpent S3:</strong> Round 3, 11 S-box in the Serpent rotation.' },
  serp4:   { label:'Serpent S4',      cipher:'Serpent (1998)', sideInfo:'<strong>Serpent S4:</strong> Round 4, 12 S-box in the Serpent rotation.' },
  serp5:   { label:'Serpent S5',      cipher:'Serpent (1998)', sideInfo:'<strong>Serpent S5:</strong> Round 5, 13 S-box in the Serpent rotation.' },
  serp6:   { label:'Serpent S6',      cipher:'Serpent (1998)', sideInfo:'<strong>Serpent S6:</strong> Round 6, 14 S-box in the Serpent rotation.' },
  serp7:   { label:'Serpent S7',      cipher:'Serpent (1998)', sideInfo:'<strong>Serpent S7:</strong> Round 7, 15 S-box in the Serpent rotation.' },
  custom:  { label:'Custom 6-bit',    cipher:'Tutorial',       sideInfo:'<strong>Custom 6-bit S-Box:</strong> A bijective 6-bit S-box showing how a non-square table works. Each of the 64 values 0x00–0x3F appears exactly once.' },
  aes:     { label:'AES (Rijndael)',  cipher:'AES (2001)',     sideInfo:'<strong>AES S-Box:</strong> Built from GF(2⁸) multiplicative inverse + affine transform. Designed to have 0 fixed points, 0 opposite fixed points, and maximum non-linearity. The most analysed S-box in history.' },
  sm4:     { label:'SM4',             cipher:'SM4 (2006)',     sideInfo:'<strong>SM4 S-Box:</strong> From the SM4 block cipher, the Chinese national standard (GB/T 32907-2016). Designed by the Chinese State Cryptography Administration. Similar structure to AES but different construction.' },
  s1:      { label:'DES S1',          cipher:'DES (1977)',     sideInfo:'<strong>DES S1:</strong> 6-bit → 4-bit. Row uses the <em>outer</em> bits (b₅, b₀); column uses the <em>inner</em> bits (b₄–b₁). Non-bijective: each 4-bit output appears exactly 4 times across the 64 inputs. Designed (controversially) with NSA involvement.' },
  s2:      { label:'DES S2',          cipher:'DES (1977)',     sideInfo:'<strong>DES S2:</strong> 6-bit → 4-bit, non-bijective. The outer/inner bit addressing is identical across all 8 DES S-boxes — only the table values differ.' },
  s3:      { label:'DES S3',          cipher:'DES (1977)',     sideInfo:'<strong>DES S3:</strong> Each DES S-box row is itself a permutation of 0–15 (row-bijective), but the full 4×16 table is many-to-one.' },
  s4:      { label:'DES S4',          cipher:'DES (1977)',     sideInfo:'<strong>DES S4:</strong> DES S-boxes were designed to resist differential cryptanalysis (then secret), but the criteria were only published decades later.' },
  s5:      { label:'DES S5',          cipher:'DES (1977)',     sideInfo:'<strong>DES S5:</strong> The 8 DES S-boxes are the core of DES security — the rest of the cipher is linear. All non-linearity comes from these tables.' },
  s6:      { label:'DES S6',          cipher:'DES (1977)',     sideInfo:'<strong>DES S6:</strong> Changing any single input bit changes at least 2 output bits in every DES S-box — a design criterion known as the Strict Avalanche Criterion (partial).' },
  s7:      { label:'DES S7',          cipher:'DES (1977)',     sideInfo:'<strong>DES S7:</strong> No DES S-box is a linear or affine function of its input — this was a deliberate defence against linear cryptanalysis.' },
  s8:      { label:'DES S8',          cipher:'DES (1977)',     sideInfo:'<strong>DES S8:</strong> Together, S1–S8 compress 48 bits (six 8-bit inputs) down to 32 bits (eight 4-bit outputs) each DES round.' },
};

// ── Colors ────────────────────────────────────────────────────────────────────
const C = {
  bg:'#06090d', surf:'#0b0f14', surf2:'#0f1520', border:'#1a2535',
  cyan:'#00e5ff', red:'#ff3d6b', gold:'#f5c400', green:'#39ff6a',
  text:'#c8d6e5', dim:'#3d5166', orange:'#ff8c42',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const hx = (v:number,d:number) => v.toString(16).toUpperCase().padStart(d,'0');
const popcount = (x:number) => { let n=x,c=0; while(n){c+=n&1;n>>>=1;} return c; };
function heatColor(v:number,max:number): React.CSSProperties {
  const t=v/max, r=Math.round(15*(1-t)), g=Math.round(21+t*179), b=Math.round(32+t*192);
  return { background:`rgb(${r},${g},${b})`, color:0.299*r+0.587*g+0.114*b>100?'#000d12':C.text };
}

// Input ↔ row/col conversion
function inputFromRC(cfg: TabCfg, r: number, col: number): number {
  if (cfg.des) return (((r>>1)&1)<<5)|(col<<1)|(r&1);
  return (r << cfg.colBits) | col;
}
function rcFromInput(cfg: TabCfg, inp: number): [number,number] {
  if (cfg.des) return [((inp&0x20)>>4)|(inp&1),(inp>>1)&0xF];
  return [inp>>cfg.colBits, inp&((1<<cfg.colBits)-1)];
}

// Active table lookup
function getTable(tab: Tab, variant: string, inv: boolean): number[][] {
  if (tab==='4bit') return inv ? INV4[variant] : make4x4(FLAT4[variant]);
  if (tab==='6bit') return inv ? INV6 : S8;
  if (tab==='8bit') return inv ? INV8[variant] : make16x16(FLAT8[variant]);
  return DES_TABLES[variant]; // DES never inverted
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function SBoxApp() {
  const [tab,         setTab]        = useState<Tab>('4bit');
  const [variant,     setVariant]    = useState('toy');
  const [selR,        setSelR]       = useState(-1);
  const [selC,        setSelC]       = useState(-1);
  const [showInverse, setShowInverse]= useState(false);
  const [heatmap,     setHeatmap]    = useState(false);
  const [searchStr,   setSearchStr]  = useState('');
  const [searchError, setSearchError]= useState(false);

  const cfg         = TAB_CFG[tab];
  const isDES       = cfg.des;
  const activeTable = getTable(tab, variant, showInverse && !isDES);
  const meta        = VMETA[variant] ?? VMETA['toy'];

  const switchTab = (t: Tab) => {
    setTab(t); setVariant(DEFAULT_VARIANT[t]);
    setSelR(-1); setSelC(-1); setShowInverse(false); setSearchStr(''); setSearchError(false);
  };
  const switchVariant = (v: string) => { setVariant(v); setSelR(-1); setSelC(-1); };
  const probe = useCallback((r:number,col:number) => { setSelR(r); setSelC(col); }, []);
  const randomProbe = () => { probe(Math.floor(Math.random()*cfg.rows), Math.floor(Math.random()*cfg.cols)); };

  const handleSearch = () => {
    const raw = searchStr.trim().replace(/^0x/i,'');
    const v   = parseInt(raw, 16);
    if (isNaN(v)||v<0||v>cfg.maxInput) { setSearchError(true); return; }
    setSearchError(false);
    const [r,col] = rcFromInput(cfg, v);
    probe(r, col);
  };

  // Derived probe
  const has      = selR>=0 && selC>=0;
  const probeInV = has ? inputFromRC(cfg, selR, selC) : null;
  const probeOut = has ? activeTable[selR][selC] : null;
  const bitFlips = has && !isDES ? popcount(probeInV!^probeOut!) : null;

  // Fixed points (bijective only, not DES)
  const fixedPts = useMemo(()=>{
    if (isDES) return null;
    let n=0;
    for (let r=0;r<cfg.rows;r++)
      for (let c=0;c<cfg.cols;c++)
        if (activeTable[r][c]===((r<<cfg.colBits)|c)) n++;
    return n;
  }, [tab,variant,showInverse,isDES,cfg,activeTable]);

  // Cell style
  function cellSt(r:number,col:number,v:number): React.CSSProperties {
    const base: React.CSSProperties = {
      borderColor:C.border, fontSize:tab==='8bit'?'10px':'11px',
      padding:tab==='8bit'?'4px 5px':'5px 7px',
    };
    if (r===selR&&col===selC) return {...base,background:C.gold,color:'#000',fontWeight:'bold',boxShadow:'0 0 14px rgba(245,196,0,.5)',transform:'scale(1.08)',zIndex:10,position:'relative'};
    if (r===selR)   return {...base,background:'rgba(0,229,255,0.09)',  color:C.cyan};
    if (col===selC) return {...base,background:'rgba(255,61,107,0.09)',color:C.red};
    if (heatmap)    return {...base,...heatColor(v,cfg.maxOutput)};
    return base;
  }

  const sLabel = showInverse ? 'S⁻¹' : 'S';

  // Tab labels
  const TAB_LABELS: Record<Tab, string> = {
    '4bit':'4-bit  (4×4)', '6bit':'6-bit  (8×8)', '8bit':'8-bit  (16×16)', 'des':'DES  (4×16)',
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{background:C.bg,color:C.text,fontFamily:"'Barlow Condensed',sans-serif"}}>

      {/* Header */}
      <header className="flex-shrink-0 flex items-center gap-5 px-7 py-4 border-b" style={{background:'linear-gradient(90deg,#0b0f14,#080d12)',borderColor:C.border}}>
        <div className="font-mono text-[10px] border px-2 py-1 tracking-[2px] opacity-70" style={{color:C.cyan,borderColor:C.cyan}}>S-BOX</div>
        <h1 className="text-2xl font-black tracking-[4px] uppercase text-white">
          Substitution <span style={{color:C.cyan}}>Lookup</span> Visualizer
        </h1>
        <div className="ml-auto text-right font-mono text-[10px] tracking-[2px] leading-loose" style={{color:C.dim}}>
          CLICK ANY CELL TO PROBE<br/>ROW = {isDES?'OUTER BITS (b₅,b₀)':'HIGH BITS'} &nbsp;|&nbsp; COL = {isDES?'INNER BITS (b₄–b₁)':'LOW BITS'}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <aside className="flex-shrink-0 w-64 flex flex-col gap-4 p-4 overflow-y-auto border-r" style={{background:C.surf,borderColor:C.border}}>

          {/* Tab selector */}
          <div>
            <div className="font-mono text-[9px] tracking-[3px] uppercase mb-2" style={{color:C.dim}}>S-Box Size</div>
            <div className="flex flex-col gap-1">
              {(['4bit','6bit','8bit','des'] as Tab[]).map(t=>{
                const active=tab===t;
                return (
                  <button key={t} onClick={()=>switchTab(t)} className="text-left px-3 py-2 border transition-all"
                    style={{background:active?'rgba(0,229,255,0.05)':'transparent',borderColor:active?C.cyan:C.border}}>
                    <span className="text-[15px] font-bold tracking-[1px]" style={{color:active?C.cyan:C.text}}>{TAB_LABELS[t]}</span>
                    {t==='des'&&<span className="font-mono text-[9px] ml-2" style={{color:active?'rgba(255,61,107,.6)':C.dim}}>NON-BIJECTIVE</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Variant selector */}
          {VARIANTS[tab].length > 1 && (
            <div>
              <div className="font-mono text-[9px] tracking-[3px] uppercase mb-2" style={{color:C.dim}}>
                {tab==='des'?'DES S-Box':'Named Box'}
              </div>
              <div className="flex flex-wrap gap-1">
                {VARIANTS[tab].map(v=>{
                  const active=variant===v;
                  const lbl = VMETA[v]?.label ?? v;
                  // Short label for buttons
                  const short = v.startsWith('serp') ? v.replace('serp','S') :
                                v==='toy'?'Toy':v==='present'?'PRESENT':v==='skinny'?'SKINNY':
                                v==='gift'?'GIFT':v==='aes'?'AES':v==='sm4'?'SM4':
                                v.toUpperCase();
                  return (
                    <button key={v} onClick={()=>switchVariant(v)}
                      className="px-2 py-1 border text-[11px] font-bold tracking-[1px] transition-all"
                      style={{
                        background:active?`rgba(0,229,255,0.08)`:'transparent',
                        borderColor:active?C.cyan:C.border,
                        color:active?C.cyan:C.text,
                      }}>
                      {short}
                    </button>
                  );
                  void lbl;
                })}
              </div>
              {tab==='4bit'&&variant.startsWith('serp')&&(
                <div className="font-mono text-[9px] mt-1" style={{color:C.dim}}>Serpent uses all 8 S-boxes in rotation per round</div>
              )}
            </div>
          )}

          {/* View toggles (no inverse for DES) */}
          <div>
            <div className="font-mono text-[9px] tracking-[3px] uppercase mb-2" style={{color:C.dim}}>View Options</div>
            <div className="flex flex-col gap-1">
              {!isDES && (
                <ToggleBtn active={showInverse} label="Inverse S⁻¹" sublabel={showInverse?'DECRYPTION TABLE ACTIVE':'SHOW DECRYPTION TABLE'}
                  color={C.red} onClick={()=>{setShowInverse(v=>!v);setSelR(-1);setSelC(-1);}} />
              )}
              <ToggleBtn active={heatmap} label="Heatmap" sublabel={heatmap?'VALUES COLORED BY MAGNITUDE':'COLOR CELLS BY OUTPUT VALUE'}
                color={C.gold} onClick={()=>setHeatmap(v=>!v)} />
            </div>
          </div>

          {/* Search */}
          <div>
            <div className="font-mono text-[9px] tracking-[3px] uppercase mb-2" style={{color:C.dim}}>Jump to Input</div>
            <div className="flex gap-1">
              <input value={searchStr} onChange={e=>{setSearchStr(e.target.value);setSearchError(false);}}
                onKeyDown={e=>e.key==='Enter'&&handleSearch()}
                placeholder={`00–${hx(cfg.maxInput,cfg.inHex)}`} maxLength={4}
                className="flex-1 font-mono text-[12px] px-2 py-1.5 border outline-none"
                style={{background:'#000',borderColor:searchError?C.red:C.border,color:C.text}} />
              <button onClick={handleSearch} className="px-2 font-mono text-[10px] border transition-all"
                style={{background:'transparent',borderColor:C.dim,color:C.dim}}
                onMouseEnter={e=>{(e.currentTarget.style.borderColor=C.cyan);(e.currentTarget.style.color=C.cyan);}}
                onMouseLeave={e=>{(e.currentTarget.style.borderColor=C.dim);(e.currentTarget.style.color=C.dim);}}>GO</button>
            </div>
            {searchError&&<div className="font-mono text-[9px] mt-1" style={{color:C.red}}>invalid — hex 00–{hx(cfg.maxInput,cfg.inHex)}</div>}
          </div>

          {/* Probe panel */}
          <div>
            <div className="font-mono text-[9px] tracking-[3px] uppercase mb-2" style={{color:C.dim}}>Active Probe</div>
            <div className="font-mono text-[11px] p-3 border" style={{background:'#000',borderColor:C.border}}>
              {[
                {k:'INPUT',        v:has?`0x${hx(probeInV!,cfg.inHex)}  (${probeInV})`:'—',              col:C.green},
                {k:isDES?'ROW (outer b₅,b₀)':'ROW (hi bits)', v:has?`${hx(selR,1)}  [${selR.toString(2).padStart(cfg.rowBits,'0')}]`:'—', col:C.cyan},
                {k:isDES?'COL (inner b₄–b₁)':'COL (lo bits)', v:has?`${hx(selC,cfg.tblHex)}  [${selC.toString(2).padStart(cfg.colBits,'0')}]`:'—', col:C.red},
                {k:'OUTPUT (hex)', v:has?`0x${hx(probeOut!,cfg.tblHex)}`:'—',                             col:C.gold},
                {k:'OUTPUT (dec)', v:has?String(probeOut):'—',                                             col:C.text},
                {k:'OUTPUT (bin)', v:has?probeOut!.toString(2).padStart(cfg.outBits,'0'):'—',              col:C.text},
                ...(!isDES?[{k:'BIT FLIPS', v:has?`${bitFlips} / ${cfg.inBits} bits`:'—', col:bitFlips!=null&&bitFlips>=cfg.inBits*0.4?C.green:C.gold}]:[]),
              ].map(row=>(
                <div key={row.k} className="flex justify-between py-[3px] border-b last:border-0" style={{borderColor:'#0d1520'}}>
                  <span className="text-[9px] tracking-[1px] self-center" style={{color:C.dim}}>{row.k}</span>
                  <span className="text-[13px]" style={{color:row.col}}>{row.v}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 p-2 border font-mono text-[11px] text-center min-h-[56px] flex items-center justify-center leading-loose"
              style={{borderColor:'rgba(245,196,0,0.2)',background:'rgba(245,196,0,0.03)',color:C.gold}}>
              {has ? (
                <span>
                  IN 0x{hx(probeInV!,cfg.inHex)} → {sLabel}[{hx(selR,1)}][{hx(selC,cfg.tblHex)}]<br/>
                  {isDES
                    ? <><span style={{color:C.cyan}}>{((selR>>1)&1)}</span><span style={{color:C.red}}>{selC.toString(2).padStart(4,'0')}</span><span style={{color:C.cyan}}>{selR&1}</span></>
                    : <><span style={{color:C.cyan}}>{selR.toString(2).padStart(cfg.rowBits,'0')}</span><span style={{color:C.red}}>{selC.toString(2).padStart(cfg.colBits,'0')}</span></>
                  }
                  &nbsp;→&nbsp;<span style={{color:C.gold}}>0x{hx(probeOut!,cfg.tblHex)}</span>
                </span>
              ) : <span style={{color:C.dim}}>[ click a cell ]</span>}
            </div>
          </div>

          <button onClick={randomProbe} className="w-full py-2 font-mono text-[10px] tracking-[2px] border transition-all"
            style={{background:'transparent',borderColor:C.dim,color:C.dim}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=C.green;e.currentTarget.style.color=C.green;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.dim;e.currentTarget.style.color=C.dim;}}>
            ⟳&nbsp;&nbsp;RANDOM PROBE
          </button>

          {/* Legend */}
          <div>
            <div className="font-mono text-[9px] tracking-[3px] uppercase mb-2" style={{color:C.dim}}>Legend</div>
            <div className="flex flex-col gap-1 text-[12px] tracking-[1px]">
              <div className="flex items-center gap-2"><div className="w-3 h-3 flex-shrink-0" style={{background:'rgba(0,229,255,0.15)',border:'1px solid rgba(0,229,255,.4)'}}/>{isDES?'Row — outer bits (b₅,b₀)':'Row highlight — high bits'}</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 flex-shrink-0" style={{background:'rgba(255,61,107,0.15)',border:'1px solid rgba(255,61,107,.4)'}}/>{isDES?'Col — inner bits (b₄–b₁)':'Col highlight — low bits'}</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 flex-shrink-0" style={{background:'rgba(245,196,0,0.7)',border:'1px solid rgba(245,196,0,.9)'}}/>Output — intersection</div>
              {heatmap&&<div className="flex items-center gap-2"><div className="w-3 h-3 flex-shrink-0 border" style={{background:'linear-gradient(90deg,#0f1520,#00c8e0)',borderColor:C.border}}/>Heatmap: 0x00 dark → max bright</div>}
            </div>
          </div>

          {/* Info callout */}
          <div className="border-l-2 border p-3 text-[12px] leading-loose" style={{borderColor:C.border,borderLeftColor:showInverse?C.red:isDES?C.orange:C.cyan}}>
            {showInverse
              ? <span><strong>Inverse S-Box ({sLabel}):</strong> If S(x)=y then {sLabel}(y)=x. Used during AES <em>decryption</em>.</span>
              : <span dangerouslySetInnerHTML={{__html:meta.sideInfo}}/>
            }
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 overflow-auto p-6">

          {/* Banner */}
          <div className="p-3 mb-5 border border-l-[3px] font-mono text-[13px] leading-loose" style={{
            borderColor:C.border,
            borderLeftColor:tab==='4bit'?C.green:tab==='6bit'?C.gold:tab==='8bit'?C.cyan:C.orange,
            background:tab==='4bit'?'rgba(57,255,106,0.03)':tab==='6bit'?'rgba(245,196,0,0.03)':tab==='8bit'?'rgba(0,229,255,0.03)':'rgba(255,140,66,0.03)',
          }}>
            <div className="flex flex-wrap gap-6">
              {[
                {l:'CIPHER',        v:meta.cipher},
                {l:'INPUT BITS',    v:String(cfg.inBits)},
                {l:'OUTPUT BITS',   v:String(cfg.outBits)},
                {l:'TABLE ENTRIES', v:String(cfg.rows*cfg.cols)},
                {l:'BIJECTIVE',     v:isDES?'NO — 4-to-1 (6-bit → 4-bit)':'YES — all values unique'},
                ...(fixedPts!==null?[{l:'FIXED POINTS',v:fixedPts===0?'0 — none (good)':String(fixedPts)}]:[]),
                ...(isDES?[{l:'ROW INDEX',v:'b₅, b₀  (outer bits)'},{l:'COL INDEX',v:'b₄–b₁  (inner bits)'}]:[]),
              ].map(s=>(
                <div key={s.l} className="flex flex-col gap-0.5">
                  <div className="text-[9px] tracking-[2px]" style={{color:C.dim}}>{s.l}</div>
                  <div className="text-[14px]" style={{color:s.l==='BIJECTIVE'&&isDES?C.red:s.l==='FIXED POINTS'&&fixedPts===0?C.green:tab==='4bit'?C.green:tab==='8bit'?C.cyan:tab==='des'?C.orange:C.gold}}>{s.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Grid title */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="text-xl font-black tracking-[3px] uppercase">
              {meta.label}{showInverse?' — Inverse':''}
            </div>
            <div className="font-mono text-[10px]" style={{color:C.dim}}>
              {cfg.rows}×{cfg.cols} table · {cfg.inBits}-bit in → {cfg.outBits}-bit out{isDES?' · outer/inner bit addressing':''}
            </div>
            {(showInverse||heatmap||isDES)&&(
              <div className="ml-auto flex gap-2">
                {showInverse&&<Badge label="S⁻¹ ACTIVE"  color={C.red}/>}
                {heatmap    &&<Badge label="HEATMAP ON" color={C.gold}/>}
                {isDES      &&<Badge label="NON-BIJECTIVE" color={C.orange}/>}
              </div>
            )}
          </div>

          {/* Table */}
          <div className="overflow-auto max-w-full">
            <table style={{borderCollapse:'collapse',fontFamily:'Share Tech Mono, monospace'}}>
              <thead>
                <tr>
                  <td className="border p-1 text-center text-[9px]" style={{background:C.surf2,borderColor:C.border,color:C.dim}}>r\c</td>
                  {Array.from({length:cfg.cols},(_,col)=>(
                    <th key={col} className="border text-center text-[10px] tracking-[1px] min-w-[28px]"
                      style={{background:selC===col?'rgba(255,61,107,0.18)':C.surf2,borderColor:C.border,
                              color:selC===col?'#fff':C.red,padding:tab==='8bit'?'4px 5px':'5px 7px'}}>
                      {hx(col,cfg.tblHex)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({length:cfg.rows},(_,row)=>(
                  <tr key={row}>
                    <th className="border text-right text-[10px] tracking-[1px] whitespace-nowrap"
                      style={{background:selR===row?'rgba(0,229,255,0.18)':C.surf2,borderColor:C.border,
                              color:selR===row?'#fff':C.cyan,padding:tab==='8bit'?'4px 10px':'5px 10px'}}>
                      {hx(row,1)}
                    </th>
                    {Array.from({length:cfg.cols},(_,col)=>{
                      const v=activeTable[row][col];
                      return <td key={col} onClick={()=>probe(row,col)} className="border text-center cursor-pointer transition-colors" style={cellSt(row,col,v)}>{hx(v,cfg.tblHex)}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Flow section */}
          <div className="mt-6 pt-5 border-t" style={{borderColor:C.border}}>
            <div className="font-mono text-[9px] tracking-[3px] mb-4" style={{color:C.dim}}>LOOKUP FLOW — CURRENT PROBE</div>
            {has ? (
              <>
                <div className="flex items-center flex-wrap gap-1 mb-4">
                  <FlowBox label={`${cfg.inBits}-BIT INPUT`} value={`0x${hx(probeInV!,cfg.inHex)}`} color={C.green}/>
                  <FA/>
                  {isDES
                    ? <>
                        <FlowBox label="OUTER BITS (b₅,b₀) → ROW" value={hx(selR,1)} color={C.cyan}/>
                        <span className="font-mono text-[20px] px-1" style={{color:C.dim}}>+</span>
                        <FlowBox label="INNER BITS (b₄–b₁) → COL" value={hx(selC,cfg.tblHex)} color={C.red}/>
                      </>
                    : <>
                        <FlowBox label={`HIGH ${cfg.rowBits} BITS → ROW`} value={hx(selR,1)} color={C.cyan}/>
                        <span className="font-mono text-[20px] px-1" style={{color:C.dim}}>+</span>
                        <FlowBox label={`LOW ${cfg.colBits} BITS → COL`} value={hx(selC,cfg.tblHex)} color={C.red}/>
                      </>
                  }
                  <FA/>
                  <FlowBox label={`${cfg.outBits}-BIT OUTPUT · ${sLabel}[${hx(selR,1)}][${hx(selC,cfg.tblHex)}]`} value={`0x${hx(probeOut!,cfg.tblHex)}`} color={C.gold} large/>
                  {!isDES && (
                    <div className="border p-2 text-center font-mono min-w-[90px]" style={{borderColor:bitFlips!>=cfg.inBits*0.4?C.green:C.gold}}>
                      <div className="text-[8px] tracking-[2px] mb-1" style={{color:C.dim}}>BIT FLIPS</div>
                      <div className="text-[17px] font-bold" style={{color:bitFlips!>=cfg.inBits*0.4?C.green:C.gold}}>{bitFlips} / {cfg.inBits}</div>
                    </div>
                  )}
                </div>

                {/* Input bit strip */}
                <div className="mb-1 font-mono text-[9px] tracking-[2px]" style={{color:C.dim}}>INPUT BITS</div>
                <div className="flex items-center gap-1 flex-wrap mb-3">
                  {Array.from({length:cfg.inBits},(_,i)=>{
                    const bi=cfg.inBits-1-i, bit=(probeInV!>>bi)&1;
                    // DES: outer bits are b5 (idx 5) and b0 (idx 0); inner are b4-b1
                    const isRow = isDES ? (bi===5||bi===0) : bi>=cfg.colBits;
                    return (
                      <React.Fragment key={bi}>
                        {!isDES && bi===cfg.colBits-1 && <div className="w-[2px] h-8 opacity-40 mx-1" style={{background:C.dim}}/>}
                        {isDES && bi===4 && <div className="w-[2px] h-8 opacity-40 mx-1" style={{background:C.dim}}/>}
                        {isDES && bi===0 && <div className="w-[2px] h-8 opacity-40 mx-1" style={{background:C.dim}}/>}
                        <div className="border py-[5px] px-[9px] font-mono text-[13px] min-w-[30px] text-center"
                          style={isRow
                            ?{borderColor:'rgba(0,229,255,.5)',  color:C.cyan, background:'rgba(0,229,255,.05)'}
                            :{borderColor:'rgba(255,61,107,.5)', color:C.red,  background:'rgba(255,61,107,.05)'}}>
                          {bit}
                        </div>
                      </React.Fragment>
                    );
                  })}
                  <div className="font-mono text-[9px] ml-2" style={{color:C.dim}}>
                    <span style={{color:C.cyan}}>■ {isDES?'OUTER (row)':'ROW bits'}</span>&nbsp;&nbsp;
                    <span style={{color:C.red}}>■ {isDES?'INNER (col)':'COL bits'}</span>
                  </div>
                </div>

                {/* Output bit strip */}
                {!isDES && (
                  <>
                    <div className="mb-1 font-mono text-[9px] tracking-[2px]" style={{color:C.dim}}>OUTPUT BITS <span style={{color:C.dim,marginLeft:8}}>gold = changed vs input</span></div>
                    <div className="flex items-center gap-1 flex-wrap">
                      {Array.from({length:cfg.outBits},(_,i)=>{
                        const bi=cfg.outBits-1-i, oBit=(probeOut!>>bi)&1, iBit=(probeInV!>>bi)&1, flipped=oBit!==iBit;
                        return (
                          <div key={bi} className="border py-[5px] px-[9px] font-mono text-[13px] min-w-[30px] text-center"
                            style={flipped?{borderColor:'rgba(245,196,0,.6)',color:C.gold,background:'rgba(245,196,0,.05)'}:{borderColor:C.border,color:C.dim}}>
                            {oBit}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="border p-4 font-mono text-[13px] text-center" style={{borderColor:C.dim,color:C.dim}}>
                WAITING — click a cell to see the lookup flow
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function ToggleBtn({active,label,sublabel,color,onClick}:{active:boolean;label:string;sublabel:string;color:string;onClick:()=>void}) {
  return (
    <button onClick={onClick} className="text-left p-3 border transition-all w-full"
      style={{background:active?`${color}11`:'transparent',borderColor:active?color:C.border}}>
      <div className="flex items-center justify-between">
        <span className="text-[15px] font-bold tracking-[1px]" style={{color:active?color:C.text}}>{label}</span>
        <span className="font-mono text-[9px] px-1.5 py-0.5 border" style={{borderColor:active?color:C.dim,color:active?color:C.dim,background:active?`${color}18`:'transparent'}}>{active?'ON':'OFF'}</span>
      </div>
      <div className="font-mono text-[9px] tracking-[1px] mt-0.5" style={{color:active?`${color}99`:C.dim}}>{sublabel}</div>
    </button>
  );
}
function Badge({label,color}:{label:string;color:string}) {
  return <div className="font-mono text-[9px] px-2 py-1 border" style={{color,borderColor:`${color}50`,background:`${color}08`}}>{label}</div>;
}
function FlowBox({label,value,color,large}:{label:string;value:string;color:string;large?:boolean}) {
  return (
    <div className="border p-2 text-center font-mono min-w-[100px]" style={{borderColor:color}}>
      <div className="text-[8px] tracking-[2px] mb-1" style={{color:C.dim}}>{label}</div>
      <div style={{fontSize:large?'22px':'17px',fontWeight:'bold',color}}>{value}</div>
    </div>
  );
}
function FA() { return <span className="font-mono text-[20px] px-[2px]" style={{color:C.dim}}>→</span>; }
