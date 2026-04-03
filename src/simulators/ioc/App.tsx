import React, { useState, useMemo } from 'react';
import { Info, RotateCcw } from 'lucide-react';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Expected IoC values for common languages
const LANG_IOC: { label: string; ioc: number; color: string }[] = [
  { label: 'English', ioc: 0.0667, color: 'text-emerald-400' },
  { label: 'German', ioc: 0.0762, color: 'text-amber-400' },
  { label: 'French', ioc: 0.0778, color: 'text-blue-400' },
  { label: 'Spanish', ioc: 0.0775, color: 'text-orange-400' },
  { label: 'Italian', ioc: 0.0738, color: 'text-red-400' },
  { label: 'Random', ioc: 0.0385, color: 'text-slate-500' },
];

function computeIoC(text: string): number {
  const letters = text.toUpperCase().split('').filter(c => ALPHABET.includes(c));
  const n = letters.length;
  if (n < 2) return 0;
  const counts = new Array(26).fill(0);
  for (const c of letters) counts[ALPHABET.indexOf(c)]++;
  const sum = counts.reduce((acc, f) => acc + f * (f - 1), 0);
  return sum / (n * (n - 1));
}

function splitIntoStreams(text: string, keyLen: number): string[] {
  const letters = text.toUpperCase().split('').filter(c => ALPHABET.includes(c));
  const streams: string[] = Array.from({ length: keyLen }, () => '');
  for (let i = 0; i < letters.length; i++) {
    streams[i % keyLen] += letters[i];
  }
  return streams;
}

function getLetterCounts(text: string): number[] {
  const counts = new Array(26).fill(0);
  for (const c of text.toUpperCase()) {
    const idx = ALPHABET.indexOf(c);
    if (idx >= 0) counts[idx]++;
  }
  return counts;
}

function App() {
  const [input, setInput] = useState('');
  const [maxKeyLen, setMaxKeyLen] = useState(20);
  const [showInfo, setShowInfo] = useState(false);

  const letters = useMemo(() => input.toUpperCase().split('').filter(c => ALPHABET.includes(c)).join(''), [input]);
  const overallIoC = useMemo(() => computeIoC(letters), [letters]);
  const letterCounts = useMemo(() => getLetterCounts(letters), [letters]);

  // IoC for each candidate key length
  const keyLengthAnalysis = useMemo(() => {
    if (letters.length < 4) return [];
    const results: { keyLen: number; avgIoC: number; streamIoCs: number[] }[] = [];
    for (let k = 1; k <= Math.min(maxKeyLen, Math.floor(letters.length / 2)); k++) {
      const streams = splitIntoStreams(letters, k);
      const iocs = streams.map(s => computeIoC(s));
      const avg = iocs.reduce((a, b) => a + b, 0) / iocs.length;
      results.push({ keyLen: k, avgIoC: avg, streamIoCs: iocs });
    }
    return results;
  }, [letters, maxKeyLen]);

  // Find best candidate
  const bestKey = useMemo(() => {
    if (keyLengthAnalysis.length < 2) return null;
    // Skip keyLen=1, find highest IoC
    const candidates = keyLengthAnalysis.slice(1);
    return candidates.reduce((best, cur) => cur.avgIoC > best.avgIoC ? cur : best);
  }, [keyLengthAnalysis]);

  const maxIoC = Math.max(0.08, ...keyLengthAnalysis.map(r => r.avgIoC));

  return (
    <div className="flex-1 bg-[#12100f] flex flex-col items-center justify-start py-10 px-6 text-slate-200">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl sm:text-4xl font-typewriter font-bold text-slate-100 tracking-tighter">
              INDEX OF <span className="text-rose-400">COINCIDENCE</span>
            </h1>
            <span className="text-slate-500 text-xs tracking-[0.3em] font-mono">FRIEDMAN'S METHOD — 1922</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 border border-slate-700">
              <Info size={20} />
            </button>
            <button onClick={() => setInput('')} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 border border-slate-700">
              <RotateCcw size={20} />
            </button>
          </div>
        </div>

        {/* Input */}
        <div className="mb-8">
          <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">
            Ciphertext (paste intercepted text here)
          </label>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value.toUpperCase())}
            placeholder="PASTE CIPHERTEXT HERE..."
            className="w-full h-40 bg-slate-900 border border-slate-700 rounded-xl p-4 font-mono text-sm tracking-wider focus:outline-none focus:ring-2 focus:ring-rose-500/50 resize-none text-slate-200 placeholder-slate-700"
            spellCheck={false}
          />
          <div className="text-[10px] text-slate-600 mt-1 font-mono">
            {letters.length} letters extracted
          </div>
        </div>

        {/* Overall IoC + Language comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">Overall Index of Coincidence</div>
            <div className="text-5xl font-typewriter font-bold text-rose-400">
              {letters.length >= 2 ? overallIoC.toFixed(4) : '—'}
            </div>
            <div className="text-xs text-slate-500 mt-2 font-mono">
              IC = Σ f<sub>i</sub>(f<sub>i</sub>−1) / N(N−1)
            </div>
            {letters.length >= 2 && (
              <div className="mt-3 text-xs">
                {overallIoC > 0.06 ? (
                  <span className="text-emerald-400">Suggests monoalphabetic substitution or natural language</span>
                ) : overallIoC > 0.045 ? (
                  <span className="text-amber-400">Suggests polyalphabetic cipher with short key</span>
                ) : (
                  <span className="text-rose-400">Near-random distribution — polyalphabetic or strong cipher</span>
                )}
              </div>
            )}
          </div>

          <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">Expected IoC by Language</div>
            <div className="space-y-2">
              {LANG_IOC.map(lang => (
                <div key={lang.label} className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 w-16">{lang.label}</span>
                  <div className="flex-1 h-4 bg-slate-800 rounded overflow-hidden relative">
                    <div
                      className="h-full bg-rose-900/60 rounded"
                      style={{ width: `${(lang.ioc / 0.08) * 100}%` }}
                    />
                    {letters.length >= 2 && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-rose-400"
                        style={{ left: `${(overallIoC / 0.08) * 100}%` }}
                        title={`Your text: ${overallIoC.toFixed(4)}`}
                      />
                    )}
                  </div>
                  <span className={`text-xs font-mono w-14 text-right ${lang.color}`}>{lang.ioc.toFixed(4)}</span>
                </div>
              ))}
            </div>
            {letters.length >= 2 && (
              <div className="text-[10px] text-slate-600 mt-2 font-mono">
                Red line = your text ({overallIoC.toFixed(4)})
              </div>
            )}
          </div>
        </div>

        {/* Key Length Analysis */}
        {letters.length >= 4 && (
          <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-5 mb-8">
            <div className="flex justify-between items-center mb-4">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                Key Length Estimation (Average IoC per stream)
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-600">Max length:</span>
                <input
                  type="number" min={5} max={40} value={maxKeyLen}
                  onChange={e => setMaxKeyLen(Math.max(5, Math.min(40, parseInt(e.target.value) || 20)))}
                  className="w-12 bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-xs text-slate-200 font-mono text-center"
                />
              </div>
            </div>

            {/* Bar chart */}
            <div className="flex items-end gap-1 h-48 mb-2">
              {keyLengthAnalysis.map(({ keyLen, avgIoC }) => {
                const height = (avgIoC / maxIoC) * 100;
                const isBest = bestKey && keyLen === bestKey.keyLen;
                const isAboveThreshold = avgIoC > 0.06;
                return (
                  <div key={keyLen} className="flex-1 flex flex-col items-center gap-1 min-w-0" title={`Key length ${keyLen}: IoC = ${avgIoC.toFixed(4)}`}>
                    <div className="text-[8px] font-mono text-slate-500">{avgIoC.toFixed(3)}</div>
                    <div className="w-full relative" style={{ height: '140px' }}>
                      <div
                        className={`absolute bottom-0 left-0 right-0 rounded-t transition-all ${
                          isBest ? 'bg-rose-500' :
                          isAboveThreshold ? 'bg-rose-700/80' :
                          'bg-slate-700'
                        }`}
                        style={{ height: `${height}%` }}
                      />
                    </div>
                    <div className={`text-[10px] font-mono font-bold ${isBest ? 'text-rose-400' : 'text-slate-500'}`}>
                      {keyLen}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reference lines */}
            <div className="flex items-center gap-4 text-[10px] font-mono text-slate-600">
              <span>English IoC ≈ 0.0667</span>
              <span>Random IoC ≈ 0.0385</span>
            </div>

            {bestKey && (
              <div className="mt-4 bg-rose-950/30 border border-rose-900/40 rounded-lg p-3">
                <div className="text-xs font-mono">
                  <span className="text-rose-400 font-bold">Best candidate: key length = {bestKey.keyLen}</span>
                  <span className="text-slate-500 ml-2">(average IoC = {bestKey.avgIoC.toFixed(4)})</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Stream IoCs: {bestKey.streamIoCs.map(ic => ic.toFixed(4)).join(', ')}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Letter Frequency */}
        {letters.length > 0 && (
          <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-5 mb-8">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">
              Letter Frequency Distribution
            </div>
            <div className="flex items-end gap-[2px] h-32">
              {letterCounts.map((count, i) => {
                const maxCount = Math.max(1, ...letterCounts);
                const height = (count / maxCount) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
                    <div
                      className="w-full bg-rose-700/60 rounded-t transition-all"
                      style={{ height: `${height}%`, minHeight: count > 0 ? '2px' : '0px' }}
                    />
                    <div className="text-[8px] font-mono text-slate-500">{ALPHABET[i]}</div>
                  </div>
                );
              })}
            </div>
            <div className="text-[10px] text-slate-600 mt-2 font-mono">
              {overallIoC > 0.06
                ? 'Uneven distribution — characteristic of substitution ciphers or plaintext'
                : 'Relatively flat distribution — suggests polyalphabetic encryption'}
            </div>
          </div>
        )}
      </div>

      {/* Info Panel */}
      <div className={`fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-700 p-6 transform transition-transform duration-300 z-40 ${showInfo ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="max-w-3xl mx-auto relative">
          <button onClick={() => setShowInfo(false)} className="absolute top-0 right-0 p-2 text-slate-500 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <h3 className="text-xl font-bold text-rose-400 mb-2">About the Index of Coincidence</h3>
          <div className="text-sm text-slate-300 leading-relaxed space-y-2">
            <p>
              The <strong>Index of Coincidence</strong> (IC or IoC) was introduced by <strong>William F. Friedman</strong>
              in 1922. It measures the probability that two randomly chosen letters from a text are the same — a
              statistical fingerprint of the text's structure.
            </p>
            <p>
              <strong>Natural language</strong> has a high IoC (English ≈ 0.067) because letter frequencies are uneven
              (E, T, A appear often; Q, Z rarely). <strong>Random text</strong> has IoC ≈ 0.038 (1/26).
              A <strong>polyalphabetic cipher</strong> like Vigenère flattens frequencies, pushing IoC toward random.
            </p>
            <p>
              <strong>Key length estimation:</strong> Split the ciphertext into streams by taking every k-th letter.
              If k matches the actual key length, each stream was encrypted with a single shift, so its IoC should
              be near the language's natural value. The key length that produces the highest average IoC across
              streams is the most likely candidate.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
