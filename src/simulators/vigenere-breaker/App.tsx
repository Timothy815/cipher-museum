import React, { useState, useMemo } from 'react';
import { KeySquare, Info, X, ChevronRight, Lock } from 'lucide-react';
import ExhibitPanel from '../../components/ExhibitPanel';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const ENGLISH_FREQ: Record<string, number> = {
  A: 8.167, B: 1.492, C: 2.782, D: 4.253, E: 12.702, F: 2.228,
  G: 2.015, H: 6.094, I: 6.966, J: 0.153, K: 0.772, L: 4.025,
  M: 2.406, N: 6.749, O: 7.507, P: 1.929, Q: 0.095, R: 5.987,
  S: 6.327, T: 9.056, U: 2.758, V: 0.978, W: 2.360, X: 0.150,
  Y: 1.974, Z: 0.074,
};

const PRESETS = [
  {
    name: 'Key: LEMON',
    key: 'LEMON',
    plain: 'ATTACK AT DAWN THE ENEMY IS APPROACHING FROM THE NORTH WE MUST PREPARE OUR DEFENSES AND HOLD THE LINE AT ALL COSTS',
  },
  {
    name: 'Key: SECRET',
    key: 'SECRET',
    plain: 'FREQUENCY ANALYSIS IS POWERLESS AGAINST THIS CIPHER BECAUSE EACH LETTER IS ENCRYPTED WITH A DIFFERENT SHIFT THAT CHANGES WITH EVERY POSITION IN THE MESSAGE',
  },
  {
    name: 'Key: CRYPTO',
    key: 'CRYPTO',
    plain: 'THE VIGENERE CIPHER WAS CONSIDERED UNBREAKABLE FOR THREE HUNDRED YEARS UNTIL CHARLES BABBAGE AND FRIEDRICH KASISKI INDEPENDENTLY DISCOVERED HOW TO CRACK IT USING STATISTICAL METHODS',
  },
];

function vigenereEncrypt(plain: string, key: string): string {
  const cleanPlain = plain.toUpperCase().replace(/[^A-Z]/g, '');
  const cleanKey = key.toUpperCase().replace(/[^A-Z]/g, '');
  if (!cleanKey) return cleanPlain;
  return cleanPlain.split('').map((c, i) => {
    const shift = cleanKey.charCodeAt(i % cleanKey.length) - 65;
    return ALPHABET[(c.charCodeAt(0) - 65 + shift) % 26];
  }).join('');
}

function vigenereDecrypt(cipher: string, key: string): string {
  const cleanCipher = cipher.toUpperCase().replace(/[^A-Z]/g, '');
  const cleanKey = key.toUpperCase().replace(/[^A-Z]/g, '');
  if (!cleanKey) return cleanCipher;
  return cleanCipher.split('').map((c, i) => {
    const shift = cleanKey.charCodeAt(i % cleanKey.length) - 65;
    return ALPHABET[(c.charCodeAt(0) - 65 - shift + 26) % 26];
  }).join('');
}

// Find repeated sequences and their positions
function findRepeatedSequences(text: string, minLen: number = 3): Map<string, number[]> {
  const seqs = new Map<string, number[]>();
  for (let len = minLen; len <= Math.min(6, text.length / 2); len++) {
    for (let i = 0; i <= text.length - len; i++) {
      const seq = text.slice(i, i + len);
      if (!seqs.has(seq)) {
        const positions: number[] = [];
        let pos = text.indexOf(seq);
        while (pos !== -1) {
          positions.push(pos);
          pos = text.indexOf(seq, pos + 1);
        }
        if (positions.length >= 2) {
          seqs.set(seq, positions);
        }
      }
    }
  }
  // Filter to only sequences that appear 2+ times, sort by length desc
  const result = new Map<string, number[]>();
  [...seqs.entries()]
    .filter(([, pos]) => pos.length >= 2)
    .sort((a, b) => b[0].length - a[0].length || b[1].length - a[1].length)
    .slice(0, 15)
    .forEach(([seq, pos]) => result.set(seq, pos));
  return result;
}

function gcd(a: number, b: number): number {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

function gcdArray(nums: number[]): number {
  return nums.reduce((a, b) => gcd(a, b));
}

// Calculate IoC for a string
function calcIoC(text: string): number {
  const N = text.length;
  if (N <= 1) return 0;
  const counts: Record<string, number> = {};
  for (const c of ALPHABET) counts[c] = 0;
  for (const c of text) if (ALPHABET.includes(c)) counts[c]++;
  let sum = 0;
  for (const c of ALPHABET) sum += counts[c] * (counts[c] - 1);
  return sum / (N * (N - 1));
}

// Split text into columns for a given key length
function splitColumns(text: string, keyLen: number): string[] {
  const cols: string[] = Array(keyLen).fill('');
  for (let i = 0; i < text.length; i++) {
    cols[i % keyLen] += text[i];
  }
  return cols;
}

// Chi-squared score for a shift applied to a column
function chiSquaredForShift(col: string, shift: number): number {
  const N = col.length;
  if (N === 0) return Infinity;
  const counts: Record<string, number> = {};
  for (const c of ALPHABET) counts[c] = 0;
  for (const c of col) {
    const decrypted = ALPHABET[(c.charCodeAt(0) - 65 - shift + 26) % 26];
    counts[decrypted]++;
  }
  let chi = 0;
  for (const c of ALPHABET) {
    const expected = (ENGLISH_FREQ[c] / 100) * N;
    if (expected > 0) chi += Math.pow(counts[c] - expected, 2) / expected;
  }
  return chi;
}

// Find the best shift for a column
function findBestShift(col: string): { shift: number; chi: number; allShifts: { shift: number; chi: number }[] } {
  const allShifts = Array.from({ length: 26 }, (_, i) => ({
    shift: i,
    chi: chiSquaredForShift(col, i),
  })).sort((a, b) => a.chi - b.chi);
  return { shift: allShifts[0].shift, chi: allShifts[0].chi, allShifts };
}

const VigenereBreakerApp: React.FC = () => {
  const [showInfo, setShowInfo] = useState(false);
  const [tab, setTab] = useState<'encrypt' | 'break'>('encrypt');

  // Encrypt tab state
  const [encryptPlain, setEncryptPlain] = useState('THE VIGENERE CIPHER WAS CONSIDERED UNBREAKABLE FOR THREE HUNDRED YEARS UNTIL CHARLES BABBAGE AND FRIEDRICH KASISKI INDEPENDENTLY DISCOVERED HOW TO CRACK IT USING STATISTICAL METHODS');
  const [encryptKey, setEncryptKey] = useState('LEMON');

  const encryptedOutput = useMemo(() => {
    const cleanKey = encryptKey.toUpperCase().replace(/[^A-Z]/g, '');
    if (!cleanKey) return '';
    return vigenereEncrypt(encryptPlain, cleanKey);
  }, [encryptPlain, encryptKey]);

  // Break tab state
  const [ciphertext, setCiphertext] = useState('');
  const [step, setStep] = useState(1);
  const [selectedKeyLen, setSelectedKeyLen] = useState<number | null>(null);
  const [manualKey, setManualKey] = useState('');

  const loadPreset = (preset: typeof PRESETS[0]) => {
    const encrypted = vigenereEncrypt(preset.plain, preset.key);
    setCiphertext(encrypted);
    setStep(1);
    setSelectedKeyLen(null);
    setManualKey('');
    setTab('break');
  };

  const loadFromEncrypt = () => {
    setCiphertext(encryptedOutput);
    setStep(1);
    setSelectedKeyLen(null);
    setManualKey('');
    setTab('break');
  };

  // Auto-load first preset on mount
  const [initialized, setInitialized] = useState(false);
  if (!initialized) {
    setCiphertext(vigenereEncrypt(PRESETS[0].plain, PRESETS[0].key));
    setInitialized(true);
  }

  const clean = useMemo(() => ciphertext.toUpperCase().replace(/[^A-Z]/g, ''), [ciphertext]);

  // Step 1: Kasiski
  const repeatedSeqs = useMemo(() => findRepeatedSequences(clean), [clean]);
  const kasiskiDistances = useMemo(() => {
    const distances: number[] = [];
    repeatedSeqs.forEach(positions => {
      for (let i = 1; i < positions.length; i++) {
        distances.push(positions[i] - positions[0]);
      }
    });
    return distances;
  }, [repeatedSeqs]);

  const kasiskiFactors = useMemo(() => {
    if (kasiskiDistances.length === 0) return [];
    const factorCount: Record<number, number> = {};
    for (const d of kasiskiDistances) {
      for (let f = 2; f <= Math.min(d, 20); f++) {
        if (d % f === 0) factorCount[f] = (factorCount[f] || 0) + 1;
      }
    }
    return Object.entries(factorCount)
      .map(([f, count]) => ({ factor: parseInt(f), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [kasiskiDistances]);

  // Step 2: IoC for key lengths
  const iocByKeyLen = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => {
      const keyLen = i + 1;
      const cols = splitColumns(clean, keyLen);
      const avgIoC = cols.reduce((sum, col) => sum + calcIoC(col), 0) / cols.length;
      return { keyLen, avgIoC };
    });
  }, [clean]);

  const bestKeyLen = useMemo(() => {
    if (iocByKeyLen.length === 0) return 1;
    // Find key length with highest IoC (excluding 1)
    const candidates = iocByKeyLen.filter(k => k.keyLen >= 2);
    return candidates.reduce((best, curr) => curr.avgIoC > best.avgIoC ? curr : best, candidates[0]).keyLen;
  }, [iocByKeyLen]);

  const activeKeyLen = selectedKeyLen || bestKeyLen;

  // Step 3: Per-column analysis
  const columnAnalysis = useMemo(() => {
    const cols = splitColumns(clean, activeKeyLen);
    return cols.map(col => findBestShift(col));
  }, [clean, activeKeyLen]);

  const recoveredKey = useMemo(() => {
    return columnAnalysis.map(c => ALPHABET[c.shift]).join('');
  }, [columnAnalysis]);

  const activeKey = manualKey.toUpperCase().replace(/[^A-Z]/g, '') || recoveredKey;
  const decryptedText = useMemo(() => vigenereDecrypt(clean, activeKey), [clean, activeKey]);

  return (
    <div className="flex-1 bg-[#1a1814] flex flex-col">
      <ExhibitPanel id="vigenere-breaker" />
      <div className="bg-[#1a1814] text-stone-200 flex flex-col items-center px-6 py-8 sm:px-10 md:px-16">
      <div className="w-full max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-950/60 border border-red-700/50 flex items-center justify-center text-red-400">
              <KeySquare size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">VIGENÈRE BREAKER</h1>
              <p className="text-sm text-slate-500 font-mono">KASISKI + INDEX OF COINCIDENCE</p>
            </div>
          </div>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
          >
            {showInfo ? <X size={20} /> : <Info size={20} />}
          </button>
        </div>

        {showInfo && (
          <div className="mb-8 bg-red-950/20 border border-red-900/40 rounded-xl p-6 text-sm text-slate-300 leading-relaxed">
            <h3 className="text-red-400 font-bold mb-2">Breaking the "Unbreakable" Cipher</h3>
            <p className="mb-3">
              The Vigenère cipher was called <em>le chiffre indéchiffrable</em> for 300 years. Then in 1863, <strong className="text-white">Friedrich Kasiski</strong> published his examination method. (Charles Babbage had independently discovered it earlier but never published.)
            </p>
            <p className="mb-3">
              <strong className="text-white">Step 1 — Find the key length:</strong> Repeated sequences in the ciphertext likely correspond to the same plaintext encrypted with the same part of the key. The distances between repetitions are multiples of the key length.
            </p>
            <p className="mb-3">
              <strong className="text-white">Step 2 — Confirm with Index of Coincidence:</strong> Split the text into columns (one per key letter). If the key length is correct, each column is a simple Caesar cipher and will have an IoC near 0.0667 (English).
            </p>
            <p>
              <strong className="text-white">Step 3 — Recover each key letter:</strong> Each column can be attacked with frequency analysis. Try all 26 shifts and pick the one that best matches English letter frequencies (lowest chi-squared score).
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('encrypt')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'encrypt'
                ? 'bg-amber-950/50 text-amber-400 border border-amber-700/50'
                : 'text-slate-500 border border-slate-800 hover:text-white'
            }`}
          >
            <Lock size={14} className="inline mr-2" />
            Encrypt with Vigenère
          </button>
          <button
            onClick={() => setTab('break')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'break'
                ? 'bg-red-950/50 text-red-400 border border-red-700/50'
                : 'text-slate-500 border border-slate-800 hover:text-white'
            }`}
          >
            <KeySquare size={14} className="inline mr-2" />
            Break Ciphertext
          </button>
        </div>

        {/* ═══════════ ENCRYPT TAB ═══════════ */}
        {tab === 'encrypt' && (
          <div className="space-y-6">
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5">
              <p className="text-sm text-slate-400">
                <strong className="text-white">Encrypt any message with any keyword.</strong> Then send the ciphertext to the breaker and watch it recover your key using Kasiski examination and frequency analysis. Longer messages with shorter keys are easier to break.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Plaintext</label>
              <textarea
                value={encryptPlain}
                onChange={e => setEncryptPlain(e.target.value)}
                className="w-full h-28 bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 font-mono text-sm text-white resize-none focus:outline-none focus:border-amber-700/50"
                placeholder="Type your message..."
              />
              <div className="text-xs text-slate-500 mt-1">{encryptPlain.toUpperCase().replace(/[^A-Z]/g, '').length} letters</div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Key</label>
              <input
                type="text"
                value={encryptKey}
                onChange={e => setEncryptKey(e.target.value.toUpperCase())}
                className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 font-mono text-lg text-amber-400 tracking-[0.3em] focus:outline-none focus:border-amber-700/50"
                placeholder="KEYWORD"
              />
              <div className="text-xs text-slate-500 mt-1">
                Key length: {encryptKey.toUpperCase().replace(/[^A-Z]/g, '').length}
                {encryptKey.toUpperCase().replace(/[^A-Z]/g, '').length < 2 && <span className="text-yellow-400 ml-2">— enter at least 2 letters</span>}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Ciphertext</label>
              <div className="bg-slate-900/80 border border-amber-900/30 rounded-xl px-4 py-3 font-mono text-sm text-amber-400 break-all min-h-[3rem]">
                {encryptedOutput || <span className="text-slate-700">Enter a key to encrypt...</span>}
              </div>
            </div>

            {/* Key alignment preview */}
            {encryptedOutput && (
              <div className="bg-slate-800/40 rounded-lg p-4 font-mono text-xs overflow-x-auto">
                <div className="text-amber-400/50 mb-1">
                  Key:    {encryptPlain.toUpperCase().replace(/[^A-Z]/g, '').split('').map((_, i) => encryptKey.toUpperCase().replace(/[^A-Z]/g, '')[(i) % encryptKey.toUpperCase().replace(/[^A-Z]/g, '').length] || '?').join('').slice(0, 60)}{encryptedOutput.length > 60 ? '...' : ''}
                </div>
                <div className="text-slate-400 mb-1">
                  Plain:  {encryptPlain.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 60)}{encryptedOutput.length > 60 ? '...' : ''}
                </div>
                <div className="text-amber-400">
                  Cipher: {encryptedOutput.slice(0, 60)}{encryptedOutput.length > 60 ? '...' : ''}
                </div>
              </div>
            )}

            <button
              onClick={loadFromEncrypt}
              disabled={!encryptedOutput}
              className="px-6 py-3 bg-red-950/50 border border-red-700/50 rounded-lg text-red-400 font-medium hover:bg-red-900/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Send to Breaker →
            </button>
          </div>
        )}

        {/* ═══════════ BREAK TAB ═══════════ */}
        {tab === 'break' && (<div className="space-y-6">

        {/* Input */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ciphertext</label>
            <div className="flex gap-2">
              {PRESETS.map(p => (
                <button
                  key={p.name}
                  onClick={() => loadPreset(p)}
                  className="text-[10px] px-2 py-1 rounded border border-slate-700 text-slate-500 hover:text-red-400 hover:border-red-700/50 transition-colors"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={ciphertext}
            onChange={e => { setCiphertext(e.target.value); setStep(1); setSelectedKeyLen(null); setManualKey(''); }}
            className="w-full h-28 bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 font-mono text-sm text-white resize-none focus:outline-none focus:border-red-700/50"
            placeholder="Paste Vigenère ciphertext here..."
          />
          <div className="text-xs text-slate-500 mt-1">{clean.length} letters</div>
        </div>

        {/* Step Navigation */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3, 4].map(s => (
            <React.Fragment key={s}>
              <button
                onClick={() => setStep(s)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  step === s
                    ? 'bg-red-950/50 text-red-400 border border-red-700/50'
                    : step > s
                      ? 'text-green-400 border border-green-900/50 bg-green-950/20'
                      : 'text-slate-500 border border-slate-800'
                }`}
              >
                {s === 1 ? 'Kasiski' : s === 2 ? 'IoC Analysis' : s === 3 ? 'Key Recovery' : 'Decrypt'}
              </button>
              {s < 4 && <ChevronRight size={14} className="text-slate-700" />}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Kasiski Examination */}
        {step === 1 && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Kasiski Examination</h3>
            <p className="text-sm text-slate-400 mb-6">
              Find repeated sequences in the ciphertext. The distances between repetitions are likely multiples of the key length.
            </p>

            {repeatedSeqs.size === 0 ? (
              <p className="text-slate-500 text-sm">No repeated sequences found. The text may be too short.</p>
            ) : (
              <>
                <div className="overflow-x-auto mb-6">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-800">
                        <th className="text-left py-2 px-3">Sequence</th>
                        <th className="text-left py-2 px-3">Count</th>
                        <th className="text-left py-2 px-3">Positions</th>
                        <th className="text-left py-2 px-3">Distances</th>
                        <th className="text-left py-2 px-3">Factors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...repeatedSeqs.entries()].map(([seq, positions]) => {
                        const dists = positions.slice(1).map(p => p - positions[0]);
                        const factors = dists.length > 0 ? Array.from(new Set(
                          dists.flatMap(d => {
                            const f: number[] = [];
                            for (let i = 2; i <= Math.min(d, 15); i++) if (d % i === 0) f.push(i);
                            return f;
                          })
                        )).sort((a, b) => a - b) : [];
                        return (
                          <tr key={seq} className="border-b border-slate-800/50">
                            <td className="py-2 px-3 font-mono font-bold text-red-400">{seq}</td>
                            <td className="py-2 px-3 text-slate-300">{positions.length}</td>
                            <td className="py-2 px-3 font-mono text-slate-400">{positions.join(', ')}</td>
                            <td className="py-2 px-3 font-mono text-slate-300">{dists.join(', ')}</td>
                            <td className="py-2 px-3 font-mono text-yellow-400">{factors.join(', ')}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {kasiskiFactors.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-slate-300 mb-3">Most Common Factors (Likely Key Lengths)</h4>
                    <div className="flex gap-3 flex-wrap">
                      {kasiskiFactors.slice(0, 6).map(({ factor, count }) => (
                        <div
                          key={factor}
                          className={`px-4 py-2 rounded-lg border text-center ${
                            factor === bestKeyLen
                              ? 'bg-red-950/40 border-red-700/50 text-red-400'
                              : 'bg-slate-800/50 border-slate-700 text-slate-300'
                          }`}
                        >
                          <div className="text-lg font-bold">{factor}</div>
                          <div className="text-[10px] text-slate-500">{count} hits</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <button
              onClick={() => setStep(2)}
              className="mt-6 px-6 py-2 bg-red-950/50 border border-red-700/50 rounded-lg text-red-400 text-sm font-medium hover:bg-red-900/40 transition-colors"
            >
              Next: IoC Analysis →
            </button>
          </div>
        )}

        {/* Step 2: IoC Analysis */}
        {step === 2 && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Index of Coincidence Analysis</h3>
            <p className="text-sm text-slate-400 mb-6">
              For each candidate key length, split the ciphertext into columns and calculate the average IoC. The correct key length produces columns that look like English (IoC ≈ 0.067).
            </p>

            <div className="space-y-2 mb-6">
              {iocByKeyLen.map(({ keyLen, avgIoC }) => {
                const isGood = avgIoC > 0.06;
                const isBest = keyLen === bestKeyLen;
                return (
                  <button
                    key={keyLen}
                    onClick={() => { setSelectedKeyLen(keyLen); setManualKey(''); }}
                    className={`w-full flex items-center gap-4 px-4 py-2 rounded-lg transition-colors ${
                      selectedKeyLen === keyLen
                        ? 'bg-red-950/40 border border-red-700/50'
                        : 'hover:bg-slate-800/50 border border-transparent'
                    }`}
                  >
                    <span className={`text-sm font-mono w-6 text-right ${isBest ? 'text-red-400 font-bold' : 'text-slate-500'}`}>
                      {keyLen}
                    </span>
                    <div className="flex-1 h-5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isGood ? 'bg-green-500/60' : 'bg-slate-600/60'
                        }`}
                        style={{ width: `${Math.min(100, (avgIoC / 0.08) * 100)}%` }}
                      />
                    </div>
                    <span className={`text-sm font-mono w-16 text-right ${isGood ? 'text-green-400' : 'text-slate-500'}`}>
                      {avgIoC.toFixed(4)}
                    </span>
                    {isBest && <span className="text-[10px] text-red-400 font-bold">BEST</span>}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <div className="w-8 h-2 bg-green-500/60 rounded" />
                <span>English-like (IoC &gt; 0.06)</span>
              </div>
              <span>|</span>
              <span>English: 0.0667 — Random: 0.0385</span>
            </div>

            <button
              onClick={() => setStep(3)}
              className="mt-6 px-6 py-2 bg-red-950/50 border border-red-700/50 rounded-lg text-red-400 text-sm font-medium hover:bg-red-900/40 transition-colors"
            >
              Next: Key Recovery →
            </button>
          </div>
        )}

        {/* Step 3: Key Recovery */}
        {step === 3 && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-2">Key Recovery — Key Length: {activeKeyLen}</h3>
            <p className="text-sm text-slate-400 mb-6">
              Each column is a Caesar cipher. Find the shift (key letter) that produces the best English-like frequency distribution.
            </p>

            <div className="space-y-4 mb-6">
              {columnAnalysis.map((col, i) => {
                const top3 = col.allShifts.slice(0, 3);
                const maxChi = col.allShifts[col.allShifts.length - 1].chi;
                return (
                  <div key={i} className="bg-slate-800/40 rounded-lg p-4">
                    <div className="flex items-center gap-4 mb-3">
                      <span className="text-xs text-slate-500">Column {i + 1}</span>
                      <span className="text-lg font-mono font-bold text-red-400">{ALPHABET[col.shift]}</span>
                      <span className="text-xs text-slate-500">(shift {col.shift}, χ² = {col.chi.toFixed(1)})</span>
                    </div>
                    {/* Mini chi-squared chart for all 26 shifts */}
                    <div className="flex items-end gap-[2px] h-16">
                      {col.allShifts.sort((a, b) => a.shift - b.shift).map(s => {
                        const h = Math.max(2, (1 - s.chi / maxChi) * 100);
                        const isBest = s.shift === col.shift;
                        return (
                          <div
                            key={s.shift}
                            className="flex-1 flex flex-col items-center justify-end h-full group relative"
                          >
                            <div className="absolute bottom-full mb-1 hidden group-hover:block bg-slate-700 rounded px-2 py-1 text-[9px] whitespace-nowrap z-10">
                              {ALPHABET[s.shift]}: χ²={s.chi.toFixed(1)}
                            </div>
                            <div
                              className={`w-full rounded-t-sm ${isBest ? 'bg-red-500' : 'bg-slate-600/50'}`}
                              style={{ height: `${h}%` }}
                            />
                            <div className={`text-[8px] mt-0.5 ${isBest ? 'text-red-400 font-bold' : 'text-slate-600'}`}>
                              {ALPHABET[s.shift]}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-slate-800/60 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-400">Recovered Key:</span>
                <span className="text-2xl font-mono font-bold text-red-400 tracking-wider">{recoveredKey}</span>
              </div>
            </div>

            <button
              onClick={() => setStep(4)}
              className="px-6 py-2 bg-red-950/50 border border-red-700/50 rounded-lg text-red-400 text-sm font-medium hover:bg-red-900/40 transition-colors"
            >
              Next: Decrypt →
            </button>
          </div>
        )}

        {/* Step 4: Decryption */}
        {step === 4 && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Decryption</h3>

            <div className="mb-6">
              <div className="flex items-center gap-4 mb-2">
                <label className="text-xs font-bold text-slate-400 uppercase">Active Key</label>
                <span className="text-xs text-slate-500">(edit to try different keys)</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={manualKey || recoveredKey}
                  onChange={e => setManualKey(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 font-mono text-lg text-red-400 tracking-wider focus:outline-none focus:border-red-700/50 w-48"
                />
                {manualKey && (
                  <button
                    onClick={() => setManualKey('')}
                    className="text-xs text-slate-500 hover:text-red-400"
                  >
                    Reset to auto-detected
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Ciphertext</label>
                <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4 font-mono text-sm text-slate-400 break-all max-h-64 overflow-y-auto">
                  {clean}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Decrypted Plaintext</label>
                <div className="bg-slate-800/60 border border-green-900/30 rounded-lg p-4 font-mono text-sm text-green-400 break-all max-h-64 overflow-y-auto">
                  {decryptedText}
                </div>
              </div>
            </div>

            {/* Key alignment visualization */}
            <div className="mt-6">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Key Alignment</label>
              <div className="bg-slate-800/40 rounded-lg p-4 font-mono text-xs overflow-x-auto">
                <div className="text-slate-500 mb-1">
                  Key: {clean.split('').map((_, i) => activeKey[i % activeKey.length]).join('')}
                </div>
                <div className="text-slate-400 mb-1">
                  Cipher: {clean.slice(0, 60)}{clean.length > 60 ? '...' : ''}
                </div>
                <div className="text-green-400">
                  Plain: {decryptedText.slice(0, 60)}{decryptedText.length > 60 ? '...' : ''}
                </div>
              </div>
            </div>
          </div>
        )}

        </div>)}
      </div>
    </div>
    </div>
  );
};

export default VigenereBreakerApp;
