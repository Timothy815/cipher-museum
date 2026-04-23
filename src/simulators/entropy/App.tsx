import React, { useState, useMemo } from 'react';
import { shannonEntropy, chiSquared, ioc, hexToBytes, b64ToBytes } from '../../lib/englishScore';

// ── Parsing ────────────────────────────────────────────────────────────

function parseInput(raw: string): { bytes: Uint8Array; format: string } | null {
  const t = raw.trim();
  const hexClean = t.replace(/\s/g, '');
  if (hexClean.length >= 4 && hexClean.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(hexClean)) {
    const b = hexToBytes(hexClean);
    if (b) return { bytes: b, format: 'hex' };
  }
  const b64 = t.replace(/\s/g,'');
  if (b64.length >= 4 && b64.length % 4 === 0 && /^[A-Za-z0-9+/=]+$/.test(b64)) {
    const b = b64ToBytes(b64);
    if (b && b.length > 2) return { bytes: b, format: 'base64' };
  }
  if (t.length > 0) return { bytes: new TextEncoder().encode(t), format: 'text' };
  return null;
}

// ── Classification ────────────────────────────────────────────────────

interface Classification {
  label: string;
  color: string;
  description: string;
}

function classify(H: number, chi: number, ioC: number, frac0x20_7e: number): Classification {
  if (H < 3.0 && ioC > 0.060) return {
    label: 'Natural language (plaintext)',
    color: 'text-green-400',
    description: 'Low entropy and high IoC — consistent with unencrypted English text.',
  };
  if (H < 3.5 && ioC > 0.050) return {
    label: 'Structured / encoded text',
    color: 'text-green-300',
    description: 'Low-to-medium entropy. May be natural language, hex-encoded text, or simple encoding.',
  };
  if (H > 7.8) return {
    label: 'Encrypted or compressed data',
    color: 'text-red-400',
    description: 'Near-maximum entropy — consistent with modern encryption (AES, ChaCha20) or compressed data. Cannot distinguish the two from entropy alone.',
  };
  if (H > 7.0) return {
    label: 'High-entropy binary',
    color: 'text-orange-400',
    description: 'High entropy but not quite maximal. Could be encrypted, compressed, or random binary data.',
  };
  if (frac0x20_7e > 0.90) return {
    label: 'ASCII / printable text',
    color: 'text-cyan-400',
    description: 'Mostly printable characters — likely plaintext, source code, markup, or structured data.',
  };
  if (H > 5.0 && ioC < 0.045) return {
    label: 'Classical cipher (poly-alphabetic)',
    color: 'text-amber-400',
    description: 'Elevated entropy and low IoC — consistent with Vigenère, Autokey, or other polyalphabetic ciphers.',
  };
  if (chi < 50 && ioC > 0.055) return {
    label: 'Classical cipher (mono-alphabetic)',
    color: 'text-amber-300',
    description: 'Letter frequencies close to English but shuffled — consistent with a substitution cipher.',
  };
  return {
    label: 'Binary / mixed data',
    color: 'text-slate-300',
    description: 'Mixed entropy characteristics — binary file, protocol data, or partial encoding.',
  };
}

// ── Byte Histogram ─────────────────────────────────────────────────────

function ByteHistogram({ bytes }: { bytes: Uint8Array }) {
  const counts = useMemo(() => {
    const c = new Array(256).fill(0);
    for (const b of bytes) c[b]++;
    return c;
  }, [bytes]);
  const maxC = Math.max(...counts);

  // Show 256 bars in 16 groups of 16
  return (
    <div>
      <div className="flex items-end gap-px" style={{ height: 60 }}>
        {counts.map((c, i) => {
          const h = maxC > 0 ? (c / maxC) * 58 : 0;
          const isPrint = i >= 0x20 && i < 0x7F;
          return (
            <div key={i} title={`0x${i.toString(16).padStart(2,'0')} (${i}): ${c}`}
              style={{ height: Math.max(h, c > 0 ? 1 : 0), width: 2 }}
              className={`flex-shrink-0 rounded-t ${isPrint ? 'bg-cyan-500' : 'bg-slate-600'}`}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-[9px] text-slate-600 font-mono mt-1">
        <span>0x00</span><span>0x40</span><span>0x80</span><span>0xC0</span><span>0xFF</span>
      </div>
      <div className="flex gap-3 mt-2 text-[10px]">
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-cyan-500"/><span className="text-slate-400">Printable ASCII</span></div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-slate-600"/><span className="text-slate-400">Non-printable</span></div>
      </div>
    </div>
  );
}

// ── Entropy gauge ──────────────────────────────────────────────────────

function EntropyGauge({ H }: { H: number }) {
  const pct = (H / 8) * 100;
  const color = H > 7.8 ? 'bg-red-500' : H > 6.0 ? 'bg-orange-500' : H > 4.0 ? 'bg-amber-500' : 'bg-green-500';
  const labels = [
    { x: 0,   label: '0' },
    { x: 12.5, label: '1' },
    { x: 43.75, label: '3.5\nEng' },
    { x: 62.5, label: '5' },
    { x: 87.5, label: '7' },
    { x: 100,  label: '8' },
  ];

  return (
    <div>
      <div className="relative h-5 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-white font-mono">{H.toFixed(3)} bits/byte</span>
        </div>
      </div>
      <div className="relative mt-1" style={{ height: 16 }}>
        {labels.map(({ x, label }) => (
          <span key={x} className="absolute text-[9px] text-slate-600 font-mono transform -translate-x-1/2"
            style={{ left: `${x}%` }}
          >{label}</span>
        ))}
        {/* Marker at English text position (~3.5) */}
        <div className="absolute top-0 bottom-0 border-l border-green-700/50" style={{ left: `${(3.5/8)*100}%` }}/>
      </div>
    </div>
  );
}

// ── Stat card ──────────────────────────────────────────────────────────

function Stat({ label, value, note, color = 'text-cyan-400' }: {
  label: string; value: string; note?: string; color?: string;
}) {
  return (
    <div className="bg-slate-800/60 rounded-lg px-3 py-2">
      <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-0.5">{label}</div>
      <div className={`text-base font-bold font-mono ${color}`}>{value}</div>
      {note && <div className="text-[9px] text-slate-500 mt-0.5">{note}</div>}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────

const SAMPLE = `This is a sample of English plaintext. It contains regular words and sentences.
The quick brown fox jumps over the lazy dog. Cryptography is the science of
secret communication, and the study of breaking such codes is called cryptanalysis.`;

const EntropyApp: React.FC = () => {
  const [input,   setInput]   = useState(SAMPLE);
  const [tabView, setTabView] = useState<'text'|'hex'|'b64'>('text');

  const parsed = useMemo(() => parseInput(input), [input]);

  const stats = useMemo(() => {
    if (!parsed) return null;
    const { bytes } = parsed;
    const n = bytes.length;
    const H = shannonEntropy(bytes);
    const printable = Array.from(bytes).filter(b => b >= 0x20 && b < 0x7F).length;
    const frac = printable / n;
    const asText = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    const chi = chiSquared(asText);
    const ioC = ioc(asText);

    // Unique bytes
    const unique = new Set(bytes).size;

    // Kolmogorov estimate via simple run-length count
    let runs = 1;
    for (let i = 1; i < bytes.length; i++) if (bytes[i] !== bytes[i-1]) runs++;
    const compressibility = 1 - runs / n;

    return { H, n, frac, chi, ioC, unique, compressibility, bytes };
  }, [parsed]);

  const cls = stats ? classify(stats.H, stats.chi, stats.ioC, stats.frac) : null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950 text-slate-200"
         style={{ fontFamily: "'Share Tech Mono', monospace" }}>

      <div className="flex-shrink-0 px-6 pt-5 pb-3 border-b border-slate-800 bg-slate-900/60">
        <h1 className="text-xl font-bold text-white">Entropy Analyzer</h1>
        <p className="text-xs text-slate-400 mt-1">
          Shannon entropy, byte distribution, and cipher-type classification
        </p>
      </div>

      <div className="flex-1 overflow-auto flex flex-col lg:flex-row gap-4 p-4">

        {/* Left: input */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">

          <div className="flex gap-2">
            {(['text','hex','b64'] as const).map(t => (
              <button key={t}
                onClick={() => setTabView(t)}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                  tabView === t
                    ? 'bg-amber-600 border-amber-500 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                {t === 'text' ? 'Text / ASCII' : t === 'hex' ? 'Hex bytes' : 'Base64'}
              </button>
            ))}
          </div>

          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-300 resize-none outline-none focus:border-amber-700 h-40"
            placeholder={
              tabView === 'hex' ? 'Paste hex bytes (e.g. 4865 6c6c 6f…)' :
              tabView === 'b64' ? 'Paste base64-encoded data…' :
              'Paste any text, ciphertext, or binary data…'
            }
            spellCheck={false}
          />

          {stats && (
            <>
              {/* Entropy gauge */}
              <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4 flex flex-col gap-3">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Shannon Entropy</div>
                <EntropyGauge H={stats.H} />
              </div>

              {/* Classification */}
              {cls && (
                <div className={`rounded-xl border p-4 ${
                  cls.color.includes('green') ? 'border-green-800/50 bg-green-950/20' :
                  cls.color.includes('red')   ? 'border-red-800/50   bg-red-950/20' :
                  cls.color.includes('amber') ? 'border-amber-800/50 bg-amber-950/20' :
                  cls.color.includes('cyan')  ? 'border-cyan-800/50  bg-cyan-950/20' :
                  'border-slate-700 bg-slate-900/40'
                }`}>
                  <div className={`text-sm font-bold mb-1 ${cls.color}`}>{cls.label}</div>
                  <p className="text-xs text-slate-400">{cls.description}</p>
                </div>
              )}

              {/* Stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <Stat label="Entropy" value={`${stats.H.toFixed(3)}`} note="bits / byte" color={
                  stats.H > 7.8 ? 'text-red-400' : stats.H < 4 ? 'text-green-400' : 'text-amber-400'
                }/>
                <Stat label="Size" value={stats.n < 1024 ? `${stats.n} B` : `${(stats.n/1024).toFixed(1)} KB`} />
                <Stat label="Unique bytes" value={String(stats.unique)} note="/ 256 possible" />
                <Stat label="Printable ASCII" value={`${(stats.frac*100).toFixed(1)}%`} />
                <Stat label="Chi-squared" value={stats.chi.toFixed(1)} note="vs English" color={
                  stats.chi < 30 ? 'text-amber-400' : 'text-slate-400'
                }/>
                <Stat label="IoC" value={stats.ioC.toFixed(4)} note="English≈0.0667" color={
                  stats.ioC > 0.060 ? 'text-green-400' : 'text-slate-400'
                }/>
              </div>

              {/* Byte histogram */}
              <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Byte Distribution</div>
                <ByteHistogram bytes={stats.bytes} />
              </div>
            </>
          )}
        </div>

        {/* Right: reference */}
        <div className="w-full lg:w-64 flex-shrink-0 flex flex-col gap-3">
          <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4">
            <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-3">Entropy Reference</div>
            <div className="space-y-2 text-xs">
              {[
                ['~1.0', 'Simple run-length data', 'text-green-400'],
                ['~3.5', 'English text', 'text-green-400'],
                ['~4.5', 'UTF-8 mixed content', 'text-cyan-400'],
                ['~5.5', 'Base64-encoded data', 'text-cyan-400'],
                ['~6.0', 'Classical cipher (Vigenère)', 'text-amber-400'],
                ['~6.5', 'DES/3DES ciphertext', 'text-amber-400'],
                ['~7.9', 'AES / ChaCha20', 'text-red-400'],
                ['~7.9', 'gzip / zstd output', 'text-red-400'],
                ['~8.0', 'True random bytes', 'text-red-400'],
              ].map(([val, label, color]) => (
                <div key={label} className="flex items-center gap-2">
                  <span className={`font-mono font-bold w-10 ${color}`}>{val}</span>
                  <span className="text-slate-400">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">IoC Reference</div>
            <div className="space-y-1.5 text-xs">
              {[
                ['0.0385', 'Uniform random', 'text-slate-400'],
                ['0.0450', 'Vigenère (key≥5)', 'text-amber-400'],
                ['0.0550', 'Vigenère (key=2)', 'text-amber-300'],
                ['0.0667', 'English plaintext', 'text-green-400'],
              ].map(([val, label, color]) => (
                <div key={label} className="flex items-center gap-2">
                  <span className={`font-mono font-bold w-16 ${color}`}>{val}</span>
                  <span className="text-slate-400">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Try These</div>
            <div className="space-y-1.5">
              {[
                ['English text', SAMPLE.slice(0, 80)],
                ['Hex random', Array.from({length:32},()=>Math.floor(Math.random()*256).toString(16).padStart(2,'0')).join('')],
                ['Repeated', 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'],
              ].map(([label, val]) => (
                <button key={label}
                  onClick={() => setInput(val)}
                  className="w-full text-left px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-400 hover:text-white transition-colors border border-slate-700"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EntropyApp;
