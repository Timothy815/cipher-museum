import React, { useState, useEffect, useCallback, useRef } from 'react';

// ── Crypto helpers ─────────────────────────────────────────────────────

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const buf = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(buf);
}

const AES_KEY_BYTES = new Uint8Array([
  0x2b,0x7e,0x15,0x16,0x28,0xae,0xd2,0xa6,0xab,0xf7,0x15,0x88,0x09,0xcf,0x4f,0x3c
]);
let _aesKey: CryptoKey | null = null;
async function getAesKey(): Promise<CryptoKey> {
  if (!_aesKey) _aesKey = await crypto.subtle.importKey('raw', AES_KEY_BYTES, 'AES-CBC', false, ['encrypt']);
  return _aesKey;
}
async function aes128(data: Uint8Array): Promise<Uint8Array> {
  const key = await getAesKey();
  const padded = new Uint8Array(16);
  padded.set(data.slice(0, 16));
  const iv = new Uint8Array(16); // fixed zero IV → equivalent to ECB for single block
  const enc = await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, key, padded);
  return new Uint8Array(enc).slice(0, 16);
}

// Simple XOR stream — no avalanche reference
function xorStream(data: Uint8Array): Uint8Array {
  const key = new Uint8Array([0x5A,0x3F,0x71,0xA3,0x2C,0x8E,0x17,0x4B,0xCC,0x09,0xF2,0x6D,0xB8,0x35,0x9A,0xE1]);
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) out[i] = data[i] ^ key[i % key.length];
  return out;
}

function countDiffBits(a: Uint8Array, b: Uint8Array): number {
  let d = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    let x = a[i] ^ b[i];
    while (x) { d += x & 1; x >>>= 1; }
  }
  return d;
}

function diffMask(a: Uint8Array, b: Uint8Array): boolean[] {
  const mask: boolean[] = [];
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const x = a[i] ^ b[i];
    for (let bit = 7; bit >= 0; bit--) mask.push(!!((x >> bit) & 1));
  }
  return mask;
}

// ── Components ─────────────────────────────────────────────────────────

function OutputGrid({ original, modified, label, accent }: {
  original: Uint8Array | null;
  modified: Uint8Array | null;
  label: string;
  accent: string;
}) {
  if (!original) return (
    <div className="flex-1 rounded-xl border border-slate-800 p-4 bg-slate-900/40">
      <div className={`text-[10px] font-bold ${accent} uppercase tracking-widest mb-2`}>{label}</div>
      <div className="text-[10px] text-slate-600">Computing…</div>
    </div>
  );

  const diff = modified ? diffMask(original, modified) : null;
  const changed = diff ? diff.filter(Boolean).length : 0;
  const total = original.length * 8;
  const pct = diff ? (changed / total) * 100 : 0;

  return (
    <div className="flex-1 rounded-xl border border-slate-800 p-4 bg-slate-900/40 min-w-0">
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[10px] font-bold ${accent} uppercase tracking-widest`}>{label}</span>
        {diff && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
            pct > 40 ? 'text-green-400 border-green-700/50 bg-green-950/20' :
            pct > 10 ? 'text-amber-400 border-amber-700/50 bg-amber-950/20' :
            'text-red-400 border-red-700/50 bg-red-950/20'
          }`}>{changed}/{total} bits changed ({pct.toFixed(1)}%)</span>
        )}
      </div>

      {/* Bit grid: rows = bytes, cols = 8 bits */}
      <div className="flex flex-col gap-px">
        {Array.from({ length: original.length }, (_, byteIdx) => (
          <div key={byteIdx} className="flex items-center gap-1">
            <span className="text-[8px] text-slate-700 font-mono w-5 flex-shrink-0">
              {byteIdx.toString(16).padStart(2, '0')}
            </span>
            <div className="flex gap-px flex-1">
              {Array.from({ length: 8 }, (_, bitIdx) => {
                const flatIdx = byteIdx * 8 + (7 - bitIdx);
                const origBit = (original[byteIdx] >> (7 - bitIdx)) & 1;
                const diffed = diff?.[byteIdx * 8 + bitIdx];
                return (
                  <div key={bitIdx}
                    className={`flex-1 h-3 rounded-sm text-[7px] flex items-center justify-center font-mono
                      ${diffed ? 'bg-red-500 text-white' : origBit ? 'bg-cyan-800 text-cyan-300' : 'bg-slate-800 text-slate-600'}`}
                    title={`byte[${byteIdx}] bit ${7-bitIdx} = ${origBit}${diffed ? ' (changed)' : ''}`}
                  >
                    {origBit}
                  </div>
                );
              })}
            </div>
            <span className="text-[8px] font-mono text-slate-700 w-5 text-right flex-shrink-0">
              {original[byteIdx].toString(16).padStart(2,'0')}
            </span>
          </div>
        ))}
      </div>

      {diff && (
        <div className="mt-3 h-3 rounded-full overflow-hidden bg-slate-800">
          <div className="h-full rounded-full bg-red-500/80 transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

// Input bit grid with click-to-flip
function InputGrid({ bytes, flippedBit, onFlip }: {
  bytes: Uint8Array;
  flippedBit: number | null;
  onFlip: (i: number) => void;
}) {
  return (
    <div className="flex flex-col gap-px">
      {Array.from({ length: bytes.length }, (_, byteIdx) => (
        <div key={byteIdx} className="flex items-center gap-1">
          <span className="text-[8px] text-slate-700 font-mono w-5 flex-shrink-0">
            {byteIdx.toString(16).padStart(2, '0')}
          </span>
          <div className="flex gap-px flex-1">
            {Array.from({ length: 8 }, (_, bitIdx) => {
              const flatIdx = byteIdx * 8 + bitIdx;
              const bit = (bytes[byteIdx] >> (7 - bitIdx)) & 1;
              const isFlipped = flippedBit === flatIdx;
              return (
                <button key={bitIdx} onClick={() => onFlip(isFlipped ? -1 : flatIdx)}
                  className={`flex-1 h-4 rounded-sm text-[7px] flex items-center justify-center font-mono font-bold transition-colors
                    ${isFlipped ? 'bg-amber-500 text-black ring-1 ring-amber-300' :
                      bit ? 'bg-slate-600 hover:bg-slate-500 text-slate-300' : 'bg-slate-900 hover:bg-slate-800 text-slate-600'}`}
                  title={`Flip byte[${byteIdx}] bit ${7-bitIdx}`}
                >{bit}</button>
              );
            })}
          </div>
          <span className="text-[8px] font-mono text-slate-600 w-14 text-right flex-shrink-0">
            '{String.fromCharCode(bytes[byteIdx] >= 0x20 && bytes[byteIdx] < 0x7f ? bytes[byteIdx] : 0x2E)}'
            {' '}{bytes[byteIdx].toString(16).padStart(2,'0')}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────

type Mode = 'sha256' | 'aes';

const SAMPLES: Record<string, string> = {
  'Hello, World!': 'Hello, World!',
  'CRYPTO KEY A':  'CRYPTO KEY A  ', // padded to 14 chars
  'AES test block': 'AES test block!',
};

const AvalancheApp: React.FC = () => {
  const [mode, setMode] = useState<Mode>('sha256');
  const [inputText, setInputText] = useState('Hello, World!');
  const [flippedBit, setFlippedBit] = useState<number | null>(null);

  const [origOut, setOrigOut] = useState<Uint8Array | null>(null);
  const [modOut, setModOut] = useState<Uint8Array | null>(null);
  const [origXor, setOrigXor] = useState<Uint8Array | null>(null);
  const [modXor, setModXor] = useState<Uint8Array | null>(null);

  // Encode input to exactly 16 bytes for display
  const inputBytes = (() => {
    const enc = new TextEncoder().encode(inputText.slice(0, 16));
    const b = new Uint8Array(16);
    b.set(enc);
    return b;
  })();

  const flippedBytes = (() => {
    if (flippedBit === null || flippedBit < 0) return null;
    const b = new Uint8Array(inputBytes);
    const byteIdx = Math.floor(flippedBit / 8);
    const bitPos = 7 - (flippedBit % 8);
    b[byteIdx] ^= (1 << bitPos);
    return b;
  })();

  // Compute outputs
  useEffect(() => {
    setOrigOut(null); setModOut(null); setOrigXor(null); setModXor(null);
    const hashFn = mode === 'sha256' ? sha256 : aes128;
    hashFn(inputBytes).then(setOrigOut);
    setOrigXor(mode === 'sha256' ? xorStream(inputBytes.slice(0, 16)) : xorStream(inputBytes.slice(0, 16)));
    if (flippedBytes) {
      hashFn(flippedBytes).then(setModOut);
      setModXor(xorStream(flippedBytes.slice(0, 16)));
    } else {
      setModOut(null); setModXor(null);
    }
  }, [mode, inputText, flippedBit]);

  const handleFlip = (i: number) => setFlippedBit(i < 0 ? null : i);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950 text-slate-200"
         style={{ fontFamily: "'Share Tech Mono', monospace" }}>

      <div className="flex-shrink-0 px-6 pt-5 pb-3 border-b border-slate-800 bg-slate-900/60">
        <h1 className="text-xl font-bold text-white">Avalanche Effect Visualizer</h1>
        <p className="text-xs text-slate-400 mt-1">
          Flip one input bit — good crypto should flip ~50% of output bits. Bad crypto barely moves.
        </p>
      </div>

      <div className="flex-1 overflow-auto flex flex-col lg:flex-row gap-4 p-4">

        <div className="flex-1 flex flex-col gap-3 min-w-0">

          {/* Mode + input */}
          <div className="flex gap-2">
            {(['sha256', 'aes'] as Mode[]).map(m => (
              <button key={m} onClick={() => { setMode(m); setFlippedBit(null); }}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                  mode === m ? 'bg-amber-600 border-amber-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}>{m === 'sha256' ? 'SHA-256 (256-bit output)' : 'AES-128 (fixed key)'}</button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {Object.keys(SAMPLES).map(k => (
              <button key={k} onClick={() => { setInputText(SAMPLES[k]); setFlippedBit(null); }}
                className="px-2 py-0.5 rounded text-[10px] border border-slate-700 text-slate-500 hover:text-slate-300">{k}</button>
            ))}
          </div>

          <input value={inputText} onChange={e => { setInputText(e.target.value); setFlippedBit(null); }}
            maxLength={16}
            className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm font-mono text-slate-300 outline-none focus:border-amber-700"
            placeholder="Up to 16 characters…" spellCheck={false} />

          <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4">
            <div className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-2">
              Input (click any bit to flip it)
              {flippedBit !== null && (
                <button onClick={() => setFlippedBit(null)}
                  className="ml-3 text-[9px] text-slate-500 hover:text-slate-300 normal-case font-normal">
                  [clear flip]
                </button>
              )}
            </div>
            <InputGrid bytes={inputBytes} flippedBit={flippedBit} onFlip={handleFlip} />
          </div>

          {/* Outputs comparison */}
          <div className="flex gap-3 flex-col xl:flex-row">
            <div className="flex-1 flex flex-col gap-2">
              <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">
                {mode === 'sha256' ? 'SHA-256' : 'AES-128'} output
                <span className="font-normal text-slate-600 ml-1">— strong avalanche</span>
              </div>
              <OutputGrid original={origOut} modified={flippedBit !== null ? modOut : null} label="Cryptographic" accent="text-cyan-400" />
            </div>
            <div className="flex-1 flex flex-col gap-2">
              <div className="text-[10px] font-bold text-red-400 uppercase tracking-widest">
                XOR stream output
                <span className="font-normal text-slate-600 ml-1">— no avalanche</span>
              </div>
              <OutputGrid original={origXor} modified={flippedBit !== null ? modXor : null} label="XOR Stream" accent="text-red-400" />
            </div>
          </div>

          {!flippedBit && flippedBit !== 0 && (
            <p className="text-xs text-slate-500 text-center">← Click any bit in the input grid to flip it and see the avalanche</p>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-64 flex-shrink-0 flex flex-col gap-3">

          <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4">
            <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2">The Avalanche Effect</div>
            <div className="text-xs text-slate-400 leading-relaxed space-y-2">
              <p>Horst Feistel defined it in 1973: a cryptographic algorithm should cause each input bit to influence every output bit.</p>
              <p>Flip 1 bit → expect ~50% of output bits to change. If fewer bits change, an attacker can build a differential relationship between inputs and outputs.</p>
              <p>SHA-256 achieves this through 64 rounds of mixing. AES achieves it through ShiftRows + MixColumns providing full diffusion in 2 rounds.</p>
            </div>
          </div>

          <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4">
            <div className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-2">Why XOR Fails</div>
            <div className="text-xs text-slate-400 leading-relaxed space-y-2">
              <p>XOR encryption is linear: C = P ⊕ K. Flipping bit i of P flips exactly bit i of C — and nothing else.</p>
              <p>This means an attacker who knows the position of one changed bit in the plaintext immediately knows the position of the changed bit in the ciphertext. Zero diffusion.</p>
              <p>Differential cryptanalysis exploits exactly this kind of linearity in poorly designed ciphers.</p>
            </div>
          </div>

          <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Color Key</div>
            <div className="space-y-1 text-[10px]">
              {[
                ['bg-amber-500', 'Flipped input bit'],
                ['bg-red-500', 'Changed output bit'],
                ['bg-cyan-800', '1-bit (unchanged)'],
                ['bg-slate-800', '0-bit (unchanged)'],
              ].map(([cls, label]) => (
                <div key={label} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded ${cls} flex-shrink-0`} />
                  <span className="text-slate-400">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvalancheApp;
