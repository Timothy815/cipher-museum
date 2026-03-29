import React, { useState, useMemo, useCallback } from 'react';
import { Info, RotateCcw, Shuffle, Lock, Unlock, Undo2 } from 'lucide-react';

// ─── English reference data ──────────────────────────────────────────────
const ENGLISH_FREQ: Record<string, number> = {
  E:12.7,T:9.06,A:8.17,O:7.51,I:6.97,N:6.75,S:6.33,H:6.09,R:5.99,
  D:4.25,L:4.03,C:2.78,U:2.76,M:2.41,W:2.36,F:2.23,G:2.02,Y:1.97,
  P:1.93,B:1.29,V:0.98,K:0.77,J:0.15,X:0.15,Q:0.10,Z:0.07,
};

const COMMON_BIGRAMS = ['TH','HE','IN','ER','AN','RE','ON','AT','EN','ND','TI','ES','OR','TE','OF','ED','IS','IT','AL','AR','ST','TO','NT','NG','SE','HA','AS','OU','IO','LE','VE','CO','ME','DE','HI','RI','RO','IC','NE','EA','RA','CE'];
const COMMON_TRIGRAMS = ['THE','AND','ING','HER','HAT','HIS','THA','ERE','FOR','ENT','ION','TER','WAS','YOU','ITH','VER','ALL','WIT','THI','TIO'];

const SAMPLE_TEXTS = [
  "It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness.",
  "The quick brown fox jumps over the lazy dog near the old stone bridge by the river.",
  "To be or not to be, that is the question. Whether it is nobler in the mind to suffer the slings and arrows of outrageous fortune.",
  "In the beginning was the word, and the word was with power, and the word held the light of understanding.",
  "Cryptography is the practice and study of techniques for secure communication in the presence of adversaries.",
  "The Enigma machine was used by the German military during World War Two to encrypt and decrypt secret messages.",
];

// ─── Cipher logic ────────────────────────────────────────────────────────
const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function generateRandomKey(): Record<string, string> {
  const shuffled = [...ALPHA].sort(() => Math.random() - 0.5);
  const key: Record<string, string> = {};
  for (let i = 0; i < 26; i++) key[ALPHA[i]] = shuffled[i];
  return key;
}

function encryptWithKey(plain: string, key: Record<string, string>): string {
  return plain.split('').map(ch => {
    const u = ch.toUpperCase();
    if (key[u]) {
      return ch === u ? key[u] : key[u].toLowerCase();
    }
    return ch;
  }).join('');
}

function countLetters(text: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const ch of text.toUpperCase()) {
    if (ch >= 'A' && ch <= 'Z') counts[ch] = (counts[ch] || 0) + 1;
  }
  return counts;
}

function getFreqs(text: string): Record<string, number> {
  const counts = countLetters(text);
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  const freqs: Record<string, number> = {};
  for (const ch of ALPHA) freqs[ch] = ((counts[ch] || 0) / total) * 100;
  return freqs;
}

function getNgrams(text: string, n: number): [string, number][] {
  const clean = text.toUpperCase().replace(/[^A-Z]/g, '');
  const counts: Record<string, number> = {};
  for (let i = 0; i <= clean.length - n; i++) {
    const ng = clean.substring(i, i + n);
    counts[ng] = (counts[ng] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 20);
}

// ─── Types ───────────────────────────────────────────────────────────────
type MappingEntry = { plainLetter: string; locked: boolean };
type HistoryEntry = { cipherLetter: string; oldPlain: string; newPlain: string };

// ─── Component ───────────────────────────────────────────────────────────
function App() {
  const [ciphertext, setCiphertext] = useState('');
  const [trueKey, setTrueKey] = useState<Record<string, string>>({});
  const [mapping, setMapping] = useState<Record<string, MappingEntry>>({});
  const [selectedCipher, setSelectedCipher] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showInfo, setShowInfo] = useState(false);
  const [showHints, setShowHints] = useState(false);

  // Generate a new puzzle
  const generatePuzzle = useCallback(() => {
    const plaintext = SAMPLE_TEXTS[Math.floor(Math.random() * SAMPLE_TEXTS.length)];
    const key = generateRandomKey();
    const ct = encryptWithKey(plaintext, key);
    setCiphertext(ct);
    setTrueKey(key);
    setMapping({});
    setSelectedCipher(null);
    setHistory([]);
  }, []);

  // Use custom ciphertext
  const useCustom = useCallback((text: string) => {
    setCiphertext(text);
    setTrueKey({});
    setMapping({});
    setSelectedCipher(null);
    setHistory([]);
  }, []);

  // Assign a plaintext letter to a cipher letter
  const assignLetter = useCallback((cipherLetter: string, plainLetter: string) => {
    const existing = mapping[cipherLetter];
    if (existing?.locked) return;

    // Record history
    setHistory(prev => [...prev, { cipherLetter, oldPlain: existing?.plainLetter || '', newPlain: plainLetter }]);

    setMapping(prev => {
      const next = { ...prev };
      // Remove any existing assignment of this plainLetter to another cipher letter
      if (plainLetter) {
        for (const k of Object.keys(next)) {
          if (next[k].plainLetter === plainLetter && k !== cipherLetter) {
            next[k] = { ...next[k], plainLetter: '' };
          }
        }
      }
      next[cipherLetter] = { plainLetter, locked: false };
      return next;
    });
    setSelectedCipher(null);
  }, [mapping]);

  // Toggle lock
  const toggleLock = useCallback((cipherLetter: string) => {
    setMapping(prev => {
      if (!prev[cipherLetter]?.plainLetter) return prev;
      return { ...prev, [cipherLetter]: { ...prev[cipherLetter], locked: !prev[cipherLetter].locked } };
    });
  }, []);

  // Undo
  const undo = useCallback(() => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setMapping(prev => {
      const next = { ...prev };
      if (last.oldPlain) {
        next[last.cipherLetter] = { plainLetter: last.oldPlain, locked: false };
      } else {
        delete next[last.cipherLetter];
      }
      return next;
    });
  }, [history]);

  // Frequency data
  const cipherFreqs = useMemo(() => getFreqs(ciphertext), [ciphertext]);
  const topBigrams = useMemo(() => getNgrams(ciphertext, 2), [ciphertext]);
  const topTrigrams = useMemo(() => getNgrams(ciphertext, 3), [ciphertext]);
  const maxFreq = useMemo(() => Math.max(...Object.values(cipherFreqs), 13), [cipherFreqs]);

  // Sorted cipher letters by frequency
  const sortedByFreq = useMemo(() =>
    [...ALPHA].sort((a, b) => (cipherFreqs[b] || 0) - (cipherFreqs[a] || 0)).filter(ch => (cipherFreqs[ch] || 0) > 0),
    [cipherFreqs]
  );

  // Build decoded text
  const decodedText = useMemo(() => {
    if (!ciphertext) return '';
    return ciphertext.split('').map(ch => {
      const u = ch.toUpperCase();
      if (u >= 'A' && u <= 'Z') {
        const m = mapping[u];
        if (m?.plainLetter) return ch === u ? m.plainLetter : m.plainLetter.toLowerCase();
        return '_';
      }
      return ch;
    }).join('');
  }, [ciphertext, mapping]);

  // Check correctness (only if we have the true key)
  const correctCount = useMemo(() => {
    if (!trueKey || Object.keys(trueKey).length === 0) return null;
    let correct = 0;
    const inverseKey: Record<string, string> = {};
    for (const [p, c] of Object.entries(trueKey)) inverseKey[c] = p;
    for (const [cipher, entry] of Object.entries(mapping)) {
      if (entry.plainLetter && inverseKey[cipher] === entry.plainLetter) correct++;
    }
    const total = Object.keys(mapping).filter(k => mapping[k].plainLetter).length;
    return { correct, total };
  }, [mapping, trueKey]);

  // Which plain letters are already used
  const usedPlain = useMemo(() => {
    const s = new Set<string>();
    for (const e of Object.values(mapping)) {
      if (e.plainLetter) s.add(e.plainLetter);
    }
    return s;
  }, [mapping]);

  return (
    <div className="flex-1 bg-[#130f0f] flex flex-col items-center justify-start py-10 px-4 text-stone-200">
      <div className="w-full max-w-5xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-typewriter font-bold text-stone-100 tracking-tighter">
              SUBSTITUTION <span className="text-red-400">SOLVER</span>
            </h1>
            <span className="text-stone-500 text-xs tracking-[0.3em] font-mono">INTERACTIVE CRYPTANALYSIS — FREQUENCY ATTACK</span>
          </div>
          <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-lg hover:bg-stone-800 text-stone-400 border border-stone-700">
            <Info size={20} />
          </button>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <button
            onClick={generatePuzzle}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-red-900/40 border border-red-700/60 text-red-300 hover:bg-red-800/40 transition-colors"
          >
            <Shuffle size={14} /> New Puzzle
          </button>
          <button
            onClick={undo}
            disabled={history.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-stone-800 border border-stone-700 text-stone-400 hover:text-stone-200 transition-colors disabled:opacity-30"
          >
            <Undo2 size={14} /> Undo
          </button>
          <button
            onClick={() => { setMapping({}); setHistory([]); setSelectedCipher(null); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-stone-800 border border-stone-700 text-stone-400 hover:text-stone-200 transition-colors"
          >
            <RotateCcw size={14} /> Clear Map
          </button>
          <button
            onClick={() => setShowHints(!showHints)}
            className={`px-4 py-2 rounded-lg font-bold text-sm border transition-colors ${
              showHints ? 'bg-red-900/40 border-red-700/60 text-red-300' : 'bg-stone-800 border-stone-700 text-stone-400'
            }`}
          >
            {showHints ? 'Hide' : 'Show'} N-gram Hints
          </button>
          {correctCount && (
            <span className={`ml-auto text-sm font-mono font-bold ${
              correctCount.correct === correctCount.total && correctCount.total === 26
                ? 'text-green-400' : correctCount.correct === correctCount.total && correctCount.total > 0
                ? 'text-yellow-400' : 'text-stone-500'
            }`}>
              {correctCount.correct}/{correctCount.total} correct
            </span>
          )}
        </div>

        {!ciphertext ? (
          /* Empty state */
          <div className="text-center py-20">
            <p className="text-stone-500 text-lg mb-6">Generate a random substitution cipher puzzle, or paste your own ciphertext below.</p>
            <button
              onClick={generatePuzzle}
              className="px-8 py-4 rounded-xl font-bold text-lg bg-red-900/40 border border-red-700/60 text-red-300 hover:bg-red-800/40 transition-colors mb-8"
            >
              <Shuffle size={18} className="inline mr-2" /> Generate Random Puzzle
            </button>
            <div className="max-w-xl mx-auto">
              <textarea
                placeholder="Or paste ciphertext here..."
                onChange={e => { if (e.target.value.trim()) useCustom(e.target.value.trim()); }}
                className="w-full h-28 bg-stone-900 border border-stone-700 rounded-xl p-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none text-stone-300 placeholder-stone-700"
                spellCheck={false}
              />
            </div>
          </div>
        ) : (
          <>
            {/* Ciphertext display with interactive letters */}
            <div className="bg-stone-900/60 rounded-2xl border border-stone-800 p-5 mb-6">
              <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-3">
                Ciphertext — click a letter to assign its plaintext value
              </div>
              <div className="font-mono text-base leading-[2.2] tracking-wide flex flex-wrap">
                {ciphertext.split('').map((ch, i) => {
                  const u = ch.toUpperCase();
                  const isLetter = u >= 'A' && u <= 'Z';
                  const m = isLetter ? mapping[u] : undefined;
                  const isSelected = selectedCipher === u;
                  const isDecoded = m?.plainLetter;
                  const isLocked = m?.locked;

                  if (!isLetter) {
                    return <span key={i} className="text-stone-600">{ch === ' ' ? '\u00A0' : ch}</span>;
                  }

                  return (
                    <span
                      key={i}
                      onClick={() => !isLocked && setSelectedCipher(isSelected ? null : u)}
                      className={`inline-flex flex-col items-center cursor-pointer px-[2px] rounded transition-all ${
                        isSelected
                          ? 'bg-red-800/50 ring-1 ring-red-500'
                          : isLocked
                          ? 'bg-green-900/30'
                          : isDecoded
                          ? 'bg-stone-800/60 hover:bg-stone-700/60'
                          : 'hover:bg-stone-800/60'
                      }`}
                    >
                      <span className={`text-[10px] leading-tight ${isDecoded ? 'text-stone-600' : 'text-red-400'}`}>
                        {ch}
                      </span>
                      <span className={`text-sm leading-tight font-bold ${
                        isLocked ? 'text-green-400' : isDecoded ? 'text-amber-300' : 'text-stone-700'
                      }`}>
                        {isDecoded ? m!.plainLetter : '_'}
                      </span>
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Assignment palette (shown when a cipher letter is selected) */}
            {selectedCipher && (
              <div className="bg-stone-900/80 rounded-2xl border border-red-800/50 p-5 mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-[10px] text-stone-500 uppercase tracking-widest font-bold">
                    Assign plaintext for cipher letter
                  </span>
                  <span className="text-lg font-mono font-bold text-red-400">{selectedCipher}</span>
                  <span className="text-stone-600 text-xs">(freq: {cipherFreqs[selectedCipher]?.toFixed(1)}%)</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {ALPHA.split('').map(pl => {
                    const isUsed = usedPlain.has(pl) && mapping[selectedCipher]?.plainLetter !== pl;
                    const isCurrent = mapping[selectedCipher]?.plainLetter === pl;
                    return (
                      <button
                        key={pl}
                        onClick={() => assignLetter(selectedCipher, isCurrent ? '' : pl)}
                        className={`w-9 h-9 rounded text-sm font-mono font-bold border transition-all ${
                          isCurrent
                            ? 'bg-amber-700/50 border-amber-500 text-amber-200'
                            : isUsed
                            ? 'bg-stone-900 border-stone-800 text-stone-700 opacity-40'
                            : 'bg-stone-800 border-stone-700 text-stone-300 hover:bg-stone-700 hover:text-white'
                        }`}
                      >
                        {pl}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => assignLetter(selectedCipher, '')}
                    className="px-3 h-9 rounded text-xs font-bold border bg-stone-800 border-stone-700 text-stone-500 hover:text-red-300 ml-2"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {/* Decoded plaintext */}
            <div className="bg-stone-900/40 rounded-2xl border border-stone-800 p-5 mb-6">
              <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-3">
                Decoded Plaintext
              </div>
              <div className="font-mono text-lg tracking-wide text-amber-200/90 break-all leading-relaxed">
                {decodedText.split('').map((ch, i) => (
                  <span key={i} className={ch === '_' ? 'text-stone-700' : /[a-zA-Z]/.test(ch) ? 'text-amber-200' : 'text-stone-600'}>
                    {ch}
                  </span>
                ))}
              </div>
            </div>

            {/* Frequency Analysis + Mapping Table */}
            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              {/* Frequency bars */}
              <div className="bg-stone-900/60 rounded-2xl border border-stone-800 p-5">
                <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-3">
                  Frequency Comparison
                </div>
                <div className="space-y-[3px] max-h-[480px] overflow-y-auto">
                  {sortedByFreq.map(ch => {
                    const cFreq = cipherFreqs[ch] || 0;
                    const mapped = mapping[ch]?.plainLetter;
                    const eFreq = mapped ? (ENGLISH_FREQ[mapped] || 0) : 0;
                    return (
                      <div
                        key={ch}
                        className={`flex items-center gap-2 cursor-pointer rounded px-1 py-[2px] transition-colors ${
                          selectedCipher === ch ? 'bg-red-900/30' : 'hover:bg-stone-800/60'
                        }`}
                        onClick={() => setSelectedCipher(selectedCipher === ch ? null : ch)}
                      >
                        <span className="w-5 text-[11px] font-mono font-bold text-red-400 text-center">{ch}</span>
                        <span className="text-stone-700 text-[10px]">→</span>
                        <span className="w-5 text-[11px] font-mono font-bold text-amber-300 text-center">{mapped || '·'}</span>
                        <div className="flex-1 h-3 relative">
                          {/* English expected (if mapped) */}
                          {mapped && (
                            <div
                              className="absolute top-0 h-3 bg-green-900/40 border-r border-green-600/50 rounded-sm"
                              style={{ width: `${(eFreq / maxFreq) * 100}%` }}
                            />
                          )}
                          {/* Cipher frequency */}
                          <div
                            className="absolute top-0 h-3 bg-red-700/60 rounded-sm"
                            style={{ width: `${(cFreq / maxFreq) * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-stone-600 w-10 text-right">{cFreq.toFixed(1)}%</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-4 mt-3 text-[10px] text-stone-600">
                  <span className="flex items-center gap-1"><span className="w-3 h-2 bg-red-700/60 rounded-sm inline-block" /> Cipher</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-2 bg-green-900/40 border border-green-600/50 rounded-sm inline-block" /> English expected</span>
                </div>
              </div>

              {/* Mapping table */}
              <div className="bg-stone-900/60 rounded-2xl border border-stone-800 p-5">
                <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-3">
                  Current Mapping
                </div>
                <div className="grid grid-cols-13 gap-[2px]">
                  {/* First row: A-M */}
                  {ALPHA.slice(0, 13).split('').map(ch => {
                    const m = mapping[ch];
                    return (
                      <div key={ch} className="flex flex-col items-center">
                        <button
                          onClick={() => setSelectedCipher(selectedCipher === ch ? null : ch)}
                          className={`w-full aspect-square rounded text-[11px] font-mono font-bold border transition-all flex items-center justify-center ${
                            selectedCipher === ch
                              ? 'bg-red-800/50 border-red-500 text-red-300'
                              : (cipherFreqs[ch] || 0) > 0
                              ? 'bg-stone-800 border-stone-700 text-red-400 hover:border-red-700'
                              : 'bg-stone-900 border-stone-800 text-stone-700'
                          }`}
                        >
                          {ch}
                        </button>
                        <div className="text-[9px] text-stone-700 my-[1px]">↓</div>
                        <div className={`w-full aspect-square rounded text-[11px] font-mono font-bold border flex items-center justify-center ${
                          m?.locked
                            ? 'bg-green-900/40 border-green-700/50 text-green-400'
                            : m?.plainLetter
                            ? 'bg-amber-900/30 border-amber-700/50 text-amber-300'
                            : 'bg-stone-900 border-stone-800 text-stone-700'
                        }`}>
                          {m?.plainLetter || '·'}
                        </div>
                        {m?.plainLetter && (
                          <button
                            onClick={() => toggleLock(ch)}
                            className="mt-[2px] text-stone-600 hover:text-green-400 transition-colors"
                          >
                            {m.locked ? <Lock size={10} /> : <Unlock size={10} />}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="grid grid-cols-13 gap-[2px] mt-2">
                  {/* Second row: N-Z */}
                  {ALPHA.slice(13).split('').map(ch => {
                    const m = mapping[ch];
                    return (
                      <div key={ch} className="flex flex-col items-center">
                        <button
                          onClick={() => setSelectedCipher(selectedCipher === ch ? null : ch)}
                          className={`w-full aspect-square rounded text-[11px] font-mono font-bold border transition-all flex items-center justify-center ${
                            selectedCipher === ch
                              ? 'bg-red-800/50 border-red-500 text-red-300'
                              : (cipherFreqs[ch] || 0) > 0
                              ? 'bg-stone-800 border-stone-700 text-red-400 hover:border-red-700'
                              : 'bg-stone-900 border-stone-800 text-stone-700'
                          }`}
                        >
                          {ch}
                        </button>
                        <div className="text-[9px] text-stone-700 my-[1px]">↓</div>
                        <div className={`w-full aspect-square rounded text-[11px] font-mono font-bold border flex items-center justify-center ${
                          m?.locked
                            ? 'bg-green-900/40 border-green-700/50 text-green-400'
                            : m?.plainLetter
                            ? 'bg-amber-900/30 border-amber-700/50 text-amber-300'
                            : 'bg-stone-900 border-stone-800 text-stone-700'
                        }`}>
                          {m?.plainLetter || '·'}
                        </div>
                        {m?.plainLetter && (
                          <button
                            onClick={() => toggleLock(ch)}
                            className="mt-[2px] text-stone-600 hover:text-green-400 transition-colors"
                          >
                            {m.locked ? <Lock size={10} /> : <Unlock size={10} />}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* N-gram hints */}
            {showHints && (
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="bg-stone-900/60 rounded-2xl border border-stone-800 p-5">
                  <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-3">
                    Top Bigrams in Ciphertext
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {topBigrams.slice(0, 15).map(([bg, count]) => (
                      <span key={bg} className="px-2 py-1 rounded text-xs font-mono font-bold bg-stone-800 border border-stone-700 text-red-300">
                        {bg} <span className="text-stone-600">×{count}</span>
                      </span>
                    ))}
                  </div>
                  <div className="text-[10px] text-stone-600 font-bold mb-1">Common English Bigrams</div>
                  <div className="flex flex-wrap gap-1">
                    {COMMON_BIGRAMS.slice(0, 15).map(bg => (
                      <span key={bg} className="px-2 py-0.5 rounded text-[10px] font-mono bg-green-950/40 border border-green-800/40 text-green-400/70">
                        {bg}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="bg-stone-900/60 rounded-2xl border border-stone-800 p-5">
                  <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-3">
                    Top Trigrams in Ciphertext
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {topTrigrams.slice(0, 12).map(([tg, count]) => (
                      <span key={tg} className="px-2 py-1 rounded text-xs font-mono font-bold bg-stone-800 border border-stone-700 text-red-300">
                        {tg} <span className="text-stone-600">×{count}</span>
                      </span>
                    ))}
                  </div>
                  <div className="text-[10px] text-stone-600 font-bold mb-1">Common English Trigrams</div>
                  <div className="flex flex-wrap gap-1">
                    {COMMON_TRIGRAMS.slice(0, 12).map(tg => (
                      <span key={tg} className="px-2 py-0.5 rounded text-[10px] font-mono bg-green-950/40 border border-green-800/40 text-green-400/70">
                        {tg}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* How It Works */}
            <div className="bg-stone-900/40 rounded-xl border border-stone-800 p-5">
              <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-3">How to Solve</div>
              <div className="grid sm:grid-cols-4 gap-4 text-xs text-stone-400">
                <div>
                  <div className="font-bold text-red-400 mb-1">1. Frequency</div>
                  <p>The most common cipher letter likely maps to E (12.7%), then T (9.1%), A (8.2%). Match the frequency bars.</p>
                </div>
                <div>
                  <div className="font-bold text-red-400 mb-1">2. Patterns</div>
                  <p>Short words reveal structure: 1-letter = "A" or "I", 3-letter = "THE", "AND". Double letters suggest SS, LL, EE, OO.</p>
                </div>
                <div>
                  <div className="font-bold text-red-400 mb-1">3. N-grams</div>
                  <p>The most common bigram is TH, trigram is THE. Match your ciphertext's top n-grams against these.</p>
                </div>
                <div>
                  <div className="font-bold text-red-400 mb-1">4. Lock & Iterate</div>
                  <p>When confident, lock a mapping. Each solved letter makes the remaining ones easier. Use undo to backtrack.</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Info Panel */}
      <div className={`fixed bottom-0 left-0 right-0 bg-stone-900/95 backdrop-blur border-t border-stone-700 p-6 transform transition-transform duration-300 z-40 ${showInfo ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="max-w-3xl mx-auto relative">
          <button onClick={() => setShowInfo(false)} className="absolute top-0 right-0 p-2 text-stone-500 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <h3 className="text-xl font-bold text-red-400 mb-2">About Substitution Cipher Cryptanalysis</h3>
          <p className="text-sm text-stone-300 leading-relaxed mb-3">
            A <strong>simple substitution cipher</strong> replaces each letter with exactly one other letter. With 26! (≈ 4 × 10²⁶) possible
            keys, brute force is impossible — but <strong>frequency analysis</strong>, first described by <strong>Al-Kindi</strong> around
            <strong>850 AD</strong>, makes them solvable by hand.
          </p>
          <p className="text-sm text-stone-300 leading-relaxed mb-3">
            The key insight: letter frequencies are preserved through substitution. In English, E appears ~12.7% of the time. If cipher
            letter "X" appears 12.5% of the time, it likely maps to E. Combined with bigram/trigram analysis and pattern recognition
            (word lengths, doubled letters), most substitution ciphers can be broken in minutes.
          </p>
          <p className="text-sm text-stone-300 leading-relaxed">
            This tool lets you practice the technique interactively. Generate a random cipher, analyze the frequencies, propose letter
            mappings, and watch the plaintext emerge character by character — just as codebreakers have done for over a thousand years.
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
