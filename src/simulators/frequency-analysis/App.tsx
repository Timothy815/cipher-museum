import React, { useState, useMemo } from 'react';
import { BarChart3, Info, X } from 'lucide-react';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Expected English letter frequencies (%)
const ENGLISH_FREQ: Record<string, number> = {
  A: 8.167, B: 1.492, C: 2.782, D: 4.253, E: 12.702, F: 2.228,
  G: 2.015, H: 6.094, I: 6.966, J: 0.153, K: 0.772, L: 4.025,
  M: 2.406, N: 6.749, O: 7.507, P: 1.929, Q: 0.095, R: 5.987,
  S: 6.327, T: 9.056, U: 2.758, V: 0.978, W: 2.360, X: 0.150,
  Y: 1.974, Z: 0.074,
};

const ENGLISH_BIGRAMS = ['TH', 'HE', 'IN', 'ER', 'AN', 'RE', 'ON', 'AT', 'EN', 'ND', 'TI', 'ES', 'OR', 'TE', 'OF', 'ED', 'IS', 'IT', 'AL', 'AR'];
const ENGLISH_TRIGRAMS = ['THE', 'AND', 'ING', 'HER', 'HAT', 'HIS', 'THA', 'ERE', 'FOR', 'ENT', 'ION', 'TER', 'WAS', 'YOU', 'ITH'];

const SAMPLE_PRESETS = [
  {
    name: 'Monoalphabetic',
    text: 'XKJR JT QAX RQAYBK XKZX ZQ JQXRCCJBRQX DZQ SAQQJQB ZQH FJHH TRDO TRQTR AE OQAVCRHBR VJCC URDJQ XA EJX XABHXKRO ZCC XKR UJXT ZQH SJRDRT AE JQEAODZXJAQ KR KZT ZDMYJORH',
  },
];

function caesarEncrypt(text: string, shift: number): string {
  return text.toUpperCase().split('').map(c => {
    if (c >= 'A' && c <= 'Z') {
      return String.fromCharCode(((c.charCodeAt(0) - 65 + shift) % 26 + 26) % 26 + 65);
    }
    return c;
  }).join('');
}

function vigenereEncrypt(text: string, key: string): string {
  const k = key.toUpperCase().replace(/[^A-Z]/g, '');
  if (k.length === 0) return text.toUpperCase();
  let ki = 0;
  return text.toUpperCase().split('').map(c => {
    if (c >= 'A' && c <= 'Z') {
      const shift = k.charCodeAt(ki % k.length) - 65;
      ki++;
      return String.fromCharCode(((c.charCodeAt(0) - 65 + shift) % 26) + 65);
    }
    return c;
  }).join('');
}

function countLetters(text: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const c of ALPHABET) counts[c] = 0;
  for (const c of text.toUpperCase()) {
    if (ALPHABET.includes(c)) counts[c]++;
  }
  return counts;
}

function countNgrams(text: string, n: number): Map<string, number> {
  const clean = text.toUpperCase().replace(/[^A-Z]/g, '');
  const counts = new Map<string, number>();
  for (let i = 0; i <= clean.length - n; i++) {
    const gram = clean.slice(i, i + n);
    counts.set(gram, (counts.get(gram) || 0) + 1);
  }
  return counts;
}

function calcIoC(text: string): number {
  const clean = text.toUpperCase().replace(/[^A-Z]/g, '');
  const N = clean.length;
  if (N <= 1) return 0;
  const counts = countLetters(clean);
  let sum = 0;
  for (const c of ALPHABET) {
    sum += counts[c] * (counts[c] - 1);
  }
  return sum / (N * (N - 1));
}

function calcChiSquared(text: string): number {
  const clean = text.toUpperCase().replace(/[^A-Z]/g, '');
  const N = clean.length;
  if (N === 0) return 0;
  const counts = countLetters(clean);
  let chi = 0;
  for (const c of ALPHABET) {
    const expected = (ENGLISH_FREQ[c] / 100) * N;
    chi += Math.pow(counts[c] - expected, 2) / expected;
  }
  return chi;
}

const DEFAULT_PLAINTEXT = 'THERE IS NO DANGER THAT A STRONG MAN WILL BE UNABLE TO MAKE UP HIS MIND IN A CRISIS BUT THERE IS AN ENORMOUS DANGER THAT A WEAK ONE WILL';

const FrequencyAnalysisApp: React.FC = () => {
  const [input, setInput] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  const [tab, setTab] = useState<'letters' | 'bigrams' | 'trigrams'>('letters');
  const [encryptMode, setEncryptMode] = useState<'caesar' | 'vigenere' | 'custom'>('caesar');
  const [plaintext, setPlaintext] = useState(DEFAULT_PLAINTEXT);
  const [caesarShift, setCaesarShift] = useState(3);
  const [vigKey, setVigKey] = useState('SECRET');

  // Auto-encrypt when parameters change
  const encryptedText = useMemo(() => {
    if (encryptMode === 'caesar') return caesarEncrypt(plaintext, caesarShift);
    if (encryptMode === 'vigenere') return vigenereEncrypt(plaintext, vigKey);
    return input;
  }, [encryptMode, plaintext, caesarShift, vigKey, input]);

  // Keep analysis input in sync for caesar/vigenere modes
  const analysisText = encryptMode === 'custom' ? input : encryptedText;

  const letterCounts = useMemo(() => countLetters(analysisText), [analysisText]);
  const totalLetters = useMemo(() => Object.values(letterCounts).reduce((a, b) => a + b, 0), [letterCounts]);
  const ioc = useMemo(() => calcIoC(analysisText), [analysisText]);
  const chiSq = useMemo(() => calcChiSquared(analysisText), [analysisText]);

  const bigrams = useMemo(() => {
    const map = countNgrams(analysisText, 2);
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
  }, [analysisText]);

  const trigrams = useMemo(() => {
    const map = countNgrams(analysisText, 3);
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
  }, [analysisText]);

  const maxCount = Math.max(...Object.values(letterCounts), 1);
  const maxEnglishFreq = Math.max(...Object.values(ENGLISH_FREQ));

  // Sort letters by frequency for ranking
  const sortedByFreq = [...ALPHABET].sort((a, b) => letterCounts[b] - letterCounts[a]);
  const top5 = new Set(sortedByFreq.slice(0, 5));

  return (
    <div className="flex-1 bg-[#1a1814] text-stone-200 flex flex-col items-center px-6 py-8 sm:px-10 md:px-16">
      <div className="w-full max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-950/60 border border-red-700/50 flex items-center justify-center text-red-400">
              <BarChart3 size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">FREQUENCY ANALYSIS</h1>
              <p className="text-sm text-slate-500 font-mono">STATISTICAL CODEBREAKING — AL-KINDI, ~850 AD</p>
            </div>
          </div>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
          >
            {showInfo ? <X size={20} /> : <Info size={20} />}
          </button>
        </div>

        {/* Info Panel */}
        {showInfo && (
          <div className="mb-8 bg-red-950/20 border border-red-900/40 rounded-xl p-6 text-sm text-slate-300 leading-relaxed">
            <h3 className="text-red-400 font-bold mb-2">The First Cryptanalysis</h3>
            <p className="mb-3">
              Around 850 AD, the Arab polymath <strong className="text-white">Al-Kindi</strong> wrote <em>A Manuscript on Deciphering Cryptographic Messages</em> — the oldest known description of frequency analysis. He realized that in any language, certain letters appear more often than others, and this pattern survives encryption by simple substitution.
            </p>
            <p className="mb-3">
              In English, <strong className="text-white">E</strong> is the most common letter (~12.7%), followed by <strong className="text-white">T</strong> (~9.1%) and <strong className="text-white">A</strong> (~8.2%). If a ciphertext's most common letter is 'X', it likely represents 'E'.
            </p>
            <p>
              The <strong className="text-white">Index of Coincidence</strong> (IoC), developed by William Friedman in 1922, measures how "structured" a text is. English text has an IoC of ~0.0667, while random text has ~0.0385. This tells you whether you're dealing with a monoalphabetic or polyalphabetic cipher.
            </p>
          </div>
        )}

        {/* Encrypt Panel */}
        <div className="mb-6 bg-slate-900/60 border border-slate-800 rounded-xl p-5">
          {/* Mode selector */}
          <div className="flex items-center gap-2 mb-4">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">Cipher</label>
            {(['caesar', 'vigenere', 'custom'] as const).map(m => (
              <button
                key={m}
                onClick={() => setEncryptMode(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  encryptMode === m
                    ? 'bg-red-950/50 text-red-400 border border-red-700/50'
                    : 'text-slate-500 hover:text-white border border-slate-700 hover:border-slate-500'
                }`}
              >
                {m === 'caesar' ? 'Caesar' : m === 'vigenere' ? 'Vigenère' : 'Paste Ciphertext'}
              </button>
            ))}
            {SAMPLE_PRESETS.map(p => (
              <button
                key={p.name}
                onClick={() => { setEncryptMode('custom'); setInput(p.text); }}
                className="text-[10px] px-2 py-1 rounded border border-slate-700 text-slate-500 hover:text-red-400 hover:border-red-700/50 transition-colors ml-auto"
              >
                {p.name}
              </button>
            ))}
          </div>

          {encryptMode !== 'custom' && (
            <>
              {/* Plaintext input */}
              <div className="mb-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Plaintext</label>
                <textarea
                  value={plaintext}
                  onChange={e => setPlaintext(e.target.value)}
                  className="w-full h-20 bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 font-mono text-sm text-white resize-none focus:outline-none focus:border-red-700/50"
                  placeholder="Type plaintext to encrypt..."
                />
              </div>

              {/* Cipher parameters */}
              {encryptMode === 'caesar' && (
                <div className="flex items-center gap-4 mb-3">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Shift</label>
                  <input
                    type="range"
                    min={1}
                    max={25}
                    value={caesarShift}
                    onChange={e => setCaesarShift(Number(e.target.value))}
                    className="flex-1 accent-red-500 max-w-xs"
                  />
                  <span className="text-lg font-mono font-bold text-red-400 w-8 text-center">{caesarShift}</span>
                  <div className="flex gap-1">
                    {[3, 7, 13, 19].map(s => (
                      <button
                        key={s}
                        onClick={() => setCaesarShift(s)}
                        className={`px-2 py-1 text-[10px] font-mono rounded border transition-colors ${
                          caesarShift === s
                            ? 'border-red-700/50 text-red-400 bg-red-950/30'
                            : 'border-slate-700 text-slate-500 hover:text-white'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {encryptMode === 'vigenere' && (
                <div className="flex items-center gap-4 mb-3">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Key</label>
                  <input
                    value={vigKey}
                    onChange={e => setVigKey(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
                    className="bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-2 font-mono text-sm text-white focus:outline-none focus:border-red-700/50 w-48"
                    placeholder="e.g. SECRET"
                  />
                  <div className="flex gap-1">
                    {['KEY', 'SECRET', 'LEMON', 'CRYPTOGRAPHY'].map(k => (
                      <button
                        key={k}
                        onClick={() => setVigKey(k)}
                        className={`px-2 py-1 text-[10px] font-mono rounded border transition-colors ${
                          vigKey === k
                            ? 'border-red-700/50 text-red-400 bg-red-950/30'
                            : 'border-slate-700 text-slate-500 hover:text-white'
                        }`}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Ciphertext output */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Ciphertext
                  <span className="text-slate-600 font-normal ml-2">
                    ({encryptMode === 'caesar' ? `Caesar shift ${caesarShift}` : `Vigenère key "${vigKey}"`})
                  </span>
                </label>
                <div className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-3 font-mono text-sm text-red-300 min-h-[3rem] break-all">
                  {encryptedText || <span className="text-slate-600">Encrypted text will appear here...</span>}
                </div>
              </div>
            </>
          )}

          {encryptMode === 'custom' && (
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Ciphertext</label>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                className="w-full h-28 bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 font-mono text-sm text-white resize-none focus:outline-none focus:border-red-700/50"
                placeholder="Paste ciphertext here..."
              />
            </div>
          )}

          <div className="flex gap-6 mt-3 text-xs text-slate-500">
            <span>{totalLetters} letters</span>
            <span>Chi-squared: <span className={chiSq < 50 ? 'text-green-400' : chiSq < 200 ? 'text-yellow-400' : 'text-red-400'}>{chiSq.toFixed(1)}</span></span>
          </div>
        </div>

        {/* IoC Display */}
        <div className="mb-8 bg-slate-900/60 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-300">Index of Coincidence</h3>
            <span className="text-lg font-mono font-bold text-white">{ioc.toFixed(4)}</span>
          </div>
          <div className="relative h-8 bg-slate-800 rounded-full overflow-hidden">
            {/* Gradient bar */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/40 via-yellow-600/40 to-green-600/40" />
            {/* Random marker */}
            <div className="absolute top-0 bottom-0 w-0.5 bg-blue-400" style={{ left: `${((0.0385 - 0.03) / (0.08 - 0.03)) * 100}%` }}>
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] text-blue-400 whitespace-nowrap">Random 0.038</div>
            </div>
            {/* English marker */}
            <div className="absolute top-0 bottom-0 w-0.5 bg-green-400" style={{ left: `${((0.0667 - 0.03) / (0.08 - 0.03)) * 100}%` }}>
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] text-green-400 whitespace-nowrap">English 0.067</div>
            </div>
            {/* Current value */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-red-400 shadow-lg shadow-red-500/50"
              style={{ left: `${Math.max(0, Math.min(100, ((ioc - 0.03) / (0.08 - 0.03)) * 100))}%` }}
            >
              <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] text-red-400 font-bold whitespace-nowrap">{ioc.toFixed(4)}</div>
            </div>
          </div>
          <div className="flex justify-between mt-6 text-[10px] text-slate-500">
            <span>Polyalphabetic / Random</span>
            <span>Monoalphabetic / English</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['letters', 'bigrams', 'trigrams'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t
                  ? 'bg-red-950/50 text-red-400 border border-red-700/50'
                  : 'text-slate-500 hover:text-white border border-slate-800 hover:border-slate-600'
              }`}
            >
              {t === 'letters' ? 'Letter Frequency' : t === 'bigrams' ? 'Bigrams' : 'Trigrams'}
            </button>
          ))}
        </div>

        {/* Letter Frequency Chart */}
        {tab === 'letters' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
            <div className="flex items-end gap-[3px] h-64">
              {ALPHABET.split('').map(letter => {
                const count = letterCounts[letter];
                const pct = totalLetters > 0 ? (count / totalLetters) * 100 : 0;
                const engPct = ENGLISH_FREQ[letter];
                const barH = totalLetters > 0 ? (count / maxCount) * 100 : 0;
                const engBarH = (engPct / maxEnglishFreq) * 100;
                const isTop = top5.has(letter);

                return (
                  <div key={letter} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs z-10 whitespace-nowrap">
                      <div className="font-bold text-white">{letter}: {count} ({pct.toFixed(1)}%)</div>
                      <div className="text-slate-400">English: {engPct.toFixed(1)}%</div>
                    </div>
                    {/* English reference bar */}
                    <div
                      className="w-full bg-slate-700/30 rounded-t-sm absolute bottom-6"
                      style={{ height: `${engBarH * 0.85}%` }}
                    />
                    {/* Observed bar */}
                    <div
                      className={`w-full rounded-t-sm relative z-[1] transition-all ${
                        isTop ? 'bg-red-500/80' : 'bg-slate-500/60'
                      }`}
                      style={{ height: `${barH * 0.85}%`, minHeight: count > 0 ? '2px' : '0' }}
                    />
                    <div className={`text-[10px] mt-1 font-mono ${isTop ? 'text-red-400 font-bold' : 'text-slate-500'}`}>
                      {letter}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-4 text-[10px] text-slate-500">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-red-500/80" />
                <span>Top 5 observed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-slate-500/60" />
                <span>Observed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-slate-700/30" />
                <span>Expected English</span>
              </div>
            </div>
            {/* Frequency ranking */}
            <div className="mt-6 pt-4 border-t border-slate-800">
              <div className="text-xs text-slate-400 mb-2">
                <span className="font-bold text-slate-300">Observed order: </span>
                <span className="font-mono text-red-400">{sortedByFreq.filter(l => letterCounts[l] > 0).join(' ')}</span>
              </div>
              <div className="text-xs text-slate-400">
                <span className="font-bold text-slate-300">English order: </span>
                <span className="font-mono text-slate-500">E T A O I N S H R D L C U M W F G Y P B V K J X Q Z</span>
              </div>
            </div>
          </div>
        )}

        {/* Bigrams */}
        {tab === 'bigrams' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Observed Bigrams</h4>
                <div className="space-y-1">
                  {bigrams.map(([gram, count], i) => (
                    <div key={gram} className="flex items-center gap-3">
                      <span className="text-xs text-slate-600 w-5 text-right">{i + 1}.</span>
                      <span className="font-mono text-sm font-bold text-white w-8">{gram}</span>
                      <div className="flex-1 h-4 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500/60 rounded-full"
                          style={{ width: `${(count / bigrams[0][1]) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 w-8 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Expected English Bigrams</h4>
                <div className="space-y-1">
                  {ENGLISH_BIGRAMS.map((gram, i) => (
                    <div key={gram} className="flex items-center gap-3">
                      <span className="text-xs text-slate-600 w-5 text-right">{i + 1}.</span>
                      <span className="font-mono text-sm text-slate-400 w-8">{gram}</span>
                      <div className="text-[10px] text-slate-600">
                        {bigrams.find(b => b[0] === gram) ? (
                          <span className="text-green-400">found ({bigrams.find(b => b[0] === gram)![1]}×)</span>
                        ) : (
                          <span>not found</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Trigrams */}
        {tab === 'trigrams' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Observed Trigrams</h4>
                <div className="space-y-1">
                  {trigrams.map(([gram, count], i) => (
                    <div key={gram} className="flex items-center gap-3">
                      <span className="text-xs text-slate-600 w-5 text-right">{i + 1}.</span>
                      <span className="font-mono text-sm font-bold text-white w-10">{gram}</span>
                      <div className="flex-1 h-4 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500/60 rounded-full"
                          style={{ width: `${(count / trigrams[0][1]) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 w-8 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Expected English Trigrams</h4>
                <div className="space-y-1">
                  {ENGLISH_TRIGRAMS.map((gram, i) => (
                    <div key={gram} className="flex items-center gap-3">
                      <span className="text-xs text-slate-600 w-5 text-right">{i + 1}.</span>
                      <span className="font-mono text-sm text-slate-400 w-10">{gram}</span>
                      <div className="text-[10px] text-slate-600">
                        {trigrams.find(b => b[0] === gram) ? (
                          <span className="text-green-400">found ({trigrams.find(b => b[0] === gram)![1]}×)</span>
                        ) : (
                          <span>not found</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FrequencyAnalysisApp;
