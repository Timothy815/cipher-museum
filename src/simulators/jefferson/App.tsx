import React, { useState, useMemo } from 'react';
import { Info, Shuffle } from 'lucide-react';
import ExhibitPanel from '../../components/ExhibitPanel';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// 36 disk wirings (historically, Jefferson used 36 disks)
function generateDisks(seed: number = 42): string[] {
  const disks: string[] = [];
  let s = seed;
  for (let d = 0; d < 36; d++) {
    const arr = ALPHABET.split('');
    // Fisher-Yates with deterministic seed
    for (let i = arr.length - 1; i > 0; i--) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const j = s % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    disks.push(arr.join(''));
  }
  return disks;
}

const DISKS = generateDisks();

function App() {
  const [input, setInput] = useState('');
  const [readRow, setReadRow] = useState(3); // which row to read ciphertext from (1-25)
  const [showInfo, setShowInfo] = useState(false);
  const [numDisks, setNumDisks] = useState(12); // using 12 of the 36 disks

  // Compute the cylinder display
  const lines = useMemo(() => {
    const clean = input.toUpperCase().replace(/[^A-Z]/g, '').slice(0, numDisks);
    if (!clean) return null;

    // For each disk, rotate so the plaintext letter is at position 0
    const rows: string[][] = [];
    for (let row = 0; row < 26; row++) {
      const line: string[] = [];
      for (let d = 0; d < clean.length; d++) {
        const disk = DISKS[d];
        const offset = disk.indexOf(clean[d]);
        line.push(disk[(offset + row) % 26]);
      }
      rows.push(line);
    }
    return rows;
  }, [input, numDisks]);

  const ciphertext = lines ? lines[readRow]?.join('') || '' : '';

  return (
    <div className="flex-1 bg-[#0e1416] flex flex-col">
      <ExhibitPanel id="jefferson" />
      <div className="bg-[#0e1416] flex flex-col items-center justify-start py-10 px-6 text-stone-200">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl sm:text-4xl font-typewriter font-bold text-stone-100 tracking-tighter">
              JEFFERSON <span className="text-cyan-400">WHEEL</span>
            </h1>
            <span className="text-stone-500 text-xs tracking-[0.3em] font-mono">MULTI-DISK CIPHER — 1795</span>
          </div>
          <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-lg hover:bg-stone-800 text-stone-400 border border-stone-700">
            <Info size={20} />
          </button>
        </div>

        {/* Controls */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <div className="bg-stone-900/60 rounded-xl border border-stone-800 p-5">
            <label className="block text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-2">
              Plaintext (max {numDisks} chars)
            </label>
            <input
              value={input}
              onChange={e => setInput(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, numDisks))}
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 font-mono text-xl tracking-[0.4em] text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-center"
              placeholder="TYPE HERE"
              maxLength={numDisks}
            />
          </div>
          <div className="bg-stone-900/60 rounded-xl border border-stone-800 p-5">
            <div className="flex justify-between items-end mb-2">
              <label className="text-[10px] text-stone-500 uppercase tracking-widest font-bold">Read Row: {readRow}</label>
              <label className="text-[10px] text-stone-500 uppercase tracking-widest font-bold">Disks: {numDisks}</label>
            </div>
            <input type="range" min="1" max="25" value={readRow} onChange={e => setReadRow(Number(e.target.value))} className="w-full accent-cyan-500 mb-3" />
            <input type="range" min="4" max="36" value={numDisks} onChange={e => setNumDisks(Number(e.target.value))} className="w-full accent-cyan-500" />
          </div>
        </div>

        {/* Cylinder visualization */}
        {lines && (
          <div className="bg-stone-900/60 rounded-2xl border border-stone-800 p-5 mb-8 overflow-x-auto">
            <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-3">Cipher Cylinder</div>
            <div className="inline-block min-w-full">
              {lines.map((row, ri) => (
                <div
                  key={ri}
                  className={`flex gap-px mb-px transition-colors ${
                    ri === 0
                      ? 'bg-cyan-950/40'
                      : ri === readRow
                        ? 'bg-orange-950/40'
                        : ''
                  }`}
                >
                  <div className={`w-6 shrink-0 flex items-center justify-center text-[9px] font-mono ${
                    ri === 0 ? 'text-cyan-400 font-bold' : ri === readRow ? 'text-orange-400 font-bold' : 'text-stone-700'
                  }`}>
                    {ri}
                  </div>
                  {row.map((c, ci) => (
                    <div
                      key={ci}
                      className={`w-7 h-6 flex items-center justify-center text-[11px] font-mono rounded-sm ${
                        ri === 0
                          ? 'text-cyan-300 font-bold bg-cyan-900/30'
                          : ri === readRow
                            ? 'text-orange-300 font-bold bg-orange-900/20'
                            : 'text-stone-600 bg-stone-800/20'
                      }`}
                    >
                      {c}
                    </div>
                  ))}
                  {ri === 0 && <span className="ml-2 text-[9px] text-cyan-500 font-mono self-center">&larr; plaintext</span>}
                  {ri === readRow && <span className="ml-2 text-[9px] text-orange-400 font-mono self-center">&larr; ciphertext</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Output */}
        <div className="bg-stone-900/60 rounded-xl border border-stone-800 p-5">
          <label className="block text-xs text-orange-400 font-bold uppercase tracking-wider mb-2">Ciphertext (Row {readRow})</label>
          <div className="font-mono text-2xl tracking-[0.4em] text-orange-200 min-h-[2rem]">
            {ciphertext || <span className="text-stone-700 text-base tracking-normal">Type plaintext above...</span>}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className={`fixed bottom-0 left-0 right-0 bg-stone-900/95 backdrop-blur border-t border-stone-700 p-6 transform transition-transform duration-300 z-40 ${showInfo ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="max-w-3xl mx-auto relative">
          <button onClick={() => setShowInfo(false)} className="absolute top-0 right-0 p-2 text-stone-500 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <h3 className="text-xl font-bold text-cyan-400 mb-2">About the Jefferson Wheel Cipher</h3>
          <p className="text-sm text-stone-300 leading-relaxed">
            Invented by <strong>Thomas Jefferson</strong> around 1795. A cylinder of wooden disks, each with a
            scrambled alphabet around its rim. To encrypt, align the plaintext along one row, then read any other
            row as the ciphertext. The recipient with an identical set of disks aligns the ciphertext and looks
            for the readable row. Independently reinvented as the <strong>M-94</strong> by the US Army in 1922
            and used through WWII. Remarkably secure for its era — a concept 125 years ahead of its time.
          </p>
        </div>
      </div>
    </div>
    </div>
  );
}

export default App;
