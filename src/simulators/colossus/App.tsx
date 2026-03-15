import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Binary, Info, X, Play, Pause, RotateCcw, Lock } from 'lucide-react';

const ITA2_LETTERS: Record<string, number> = {
  'A': 0b00011, 'B': 0b11001, 'C': 0b01110, 'D': 0b01001, 'E': 0b00001,
  'F': 0b01101, 'G': 0b11010, 'H': 0b10100, 'I': 0b00110, 'J': 0b01011,
  'K': 0b01111, 'L': 0b10010, 'M': 0b11100, 'N': 0b01100, 'O': 0b11000,
  'P': 0b10110, 'Q': 0b10111, 'R': 0b01010, 'S': 0b00101, 'T': 0b10000,
  'U': 0b00111, 'V': 0b11110, 'W': 0b10011, 'X': 0b11101, 'Y': 0b10101,
  'Z': 0b10001, ' ': 0b00100, '/': 0b00000,
};

const ITA2_REVERSE: Record<number, string> = {};
for (const [k, v] of Object.entries(ITA2_LETTERS)) ITA2_REVERSE[v] = k;

const CHI_SIZES = [41, 31, 29, 26, 23];

function generateWheel(size: number, seed: number): number[] {
  const pattern: number[] = [];
  let state = seed;
  for (let i = 0; i < size; i++) {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    pattern.push((state >> 16) & 1); // use high bit — low bit of this LCG has period 2
  }
  return pattern;
}

function generateChiWheels(seed: number = 42): number[][] {
  return CHI_SIZES.map((size, i) => generateWheel(size, seed + i * 7));
}

function lorenzEncrypt(plainBits: number[][], chiWheels: number[][], chiPositions: number[]): number[][] {
  return plainBits.map((charBits, charIdx) => {
    return charBits.map((bit, bitIdx) => {
      const chiPos = (chiPositions[bitIdx] + charIdx) % chiWheels[bitIdx].length;
      return bit ^ chiWheels[bitIdx][chiPos];
    });
  });
}

function textToBits(text: string): number[][] {
  return text.toUpperCase().split('').map(ch => {
    const code = ITA2_LETTERS[ch] ?? 0;
    return [(code >> 4) & 1, (code >> 3) & 1, (code >> 2) & 1, (code >> 1) & 1, code & 1];
  });
}

function bitsToText(bits: number[][]): string {
  return bits.map(charBits => {
    const code = (charBits[0] << 4) | (charBits[1] << 3) | (charBits[2] << 2) | (charBits[3] << 1) | charBits[4];
    return ITA2_REVERSE[code] ?? '?';
  }).join('');
}

function deltaStream(bits: number[][]): number[][] {
  const result: number[][] = [];
  for (let i = 0; i < bits.length - 1; i++) {
    result.push(bits[i].map((b, j) => b ^ bits[i + 1][j]));
  }
  return result;
}

function scoreBitPosition(cipherBits: number[][], chiWheel: number[], chiStart: number, bitPos: number): number {
  const delta = deltaStream(cipherBits);
  let zeros = 0;
  for (let i = 0; i < delta.length; i++) {
    const chiDelta = chiWheel[(chiStart + i) % chiWheel.length] ^ chiWheel[(chiStart + i + 1) % chiWheel.length];
    const result = delta[i][bitPos] ^ chiDelta;
    if (result === 0) zeros++;
  }
  return zeros;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const ColossusApp: React.FC = () => {
  const [showInfo, setShowInfo] = useState(false);
  const [tab, setTab] = useState<'encrypt' | 'attack'>('encrypt');

  // Encrypt state
  const [plaintext, setPlaintext] = useState('THE QUICK BROWN FOX JUMPED OVER THE LAZY DOG AND THEN RESTED BY THE RIVER WAITING FOR THE SIGNAL');
  const [wheelSeed, setWheelSeed] = useState(42);
  const [chiPositions, setChiPositions] = useState<number[]>([7, 13, 5, 19, 2]);

  const chiWheels = useMemo(() => generateChiWheels(wheelSeed), [wheelSeed]);
  const plainBits = useMemo(() => textToBits(plaintext.toUpperCase()), [plaintext]);
  const cipherBits = useMemo(() => lorenzEncrypt(plainBits, chiWheels, chiPositions), [plainBits, chiWheels, chiPositions]);
  const cipherText = useMemo(() => bitsToText(cipherBits), [cipherBits]);

  // Attack state
  const [attackBits, setAttackBits] = useState<number[][]>([]);
  const [attackWheels, setAttackWheels] = useState<number[][]>([]);
  const [attackCorrectPos, setAttackCorrectPos] = useState<number[]>([]);
  const [selectedWheel, setSelectedWheel] = useState(0);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(70);
  const [currentPos, setCurrentPos] = useState(-1);
  const [scores, setScores] = useState<Map<number, number>>(new Map());
  const [bestPos, setBestPos] = useState<number | null>(null);
  const runRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadToAttack = () => {
    setAttackBits([...cipherBits]);
    setAttackWheels(chiWheels.map(w => [...w]));
    setAttackCorrectPos([...chiPositions]);
    setTab('attack');
    resetColossus();
  };

  const activeWheelSize = attackWheels.length > 0 ? attackWheels[selectedWheel]?.length ?? 41 : CHI_SIZES[selectedWheel];
  const correctPos = attackCorrectPos[selectedWheel] ?? 0;

  const runColossus = useCallback(() => {
    if (attackBits.length === 0 || attackWheels.length === 0) return;
    runRef.current = true;
    setRunning(true);
    setScores(new Map());
    setBestPos(null);

    let pos = 0;
    const newScores = new Map<number, number>();
    let best = -1;
    let bestScore = -1;
    const ws = activeWheelSize;

    function step() {
      if (!runRef.current || pos >= ws) {
        setRunning(false);
        runRef.current = false;
        setBestPos(best);
        return;
      }

      const batchSize = speed > 80 ? 5 : 1;
      for (let b = 0; b < batchSize && pos < ws; b++) {
        const score = scoreBitPosition(attackBits, attackWheels[selectedWheel], pos, selectedWheel);
        newScores.set(pos, score);
        if (score > bestScore) { bestScore = score; best = pos; }
        pos++;
      }

      setCurrentPos(pos - 1);
      setScores(new Map(newScores));

      timerRef.current = setTimeout(step, speed > 80 ? 10 : Math.max(10, 400 - speed * 4));
    }
    step();
  }, [attackBits, attackWheels, selectedWheel, speed, activeWheelSize]);

  const stopColossus = useCallback(() => {
    runRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    setRunning(false);
  }, []);

  const resetColossus = useCallback(() => {
    stopColossus();
    setCurrentPos(-1);
    setScores(new Map());
    setBestPos(null);
  }, [stopColossus]);

  useEffect(() => {
    return () => { runRef.current = false; if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  useEffect(() => { resetColossus(); }, [selectedWheel]);

  const maxScore = Math.max(...(scores.size > 0 ? [...scores.values()] : [1]));
  const minScore = Math.min(...(scores.size > 0 ? [...scores.values()] : [0]));
  const expectedBaseline = attackBits.length > 1 ? (attackBits.length - 1) / 2 : 0;

  const randomizePositions = () => {
    setChiPositions(CHI_SIZES.map(size => Math.floor(Math.random() * size)));
  };

  return (
    <div className="flex-1 bg-[#1a1814] text-stone-200 flex flex-col items-center px-6 py-8 sm:px-10 md:px-16">
      <div className="w-full max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-950/60 border border-red-700/50 flex items-center justify-center text-red-400">
              <Binary size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">COLOSSUS</h1>
              <p className="text-sm text-slate-500 font-mono">FIRST ELECTRONIC COMPUTER — BLETCHLEY PARK, 1944</p>
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
            <h3 className="text-red-400 font-bold mb-2">The World's First Electronic Computer</h3>
            <p className="mb-3">
              <strong className="text-white">Tommy Flowers</strong>, a Post Office engineer, designed Colossus in 1943 to break the Lorenz SZ42 cipher used by Hitler's High Command. It used 1,500 vacuum tubes (Colossus Mark II had 2,400) and could process 5,000 characters per second by reading paper tape at 30 mph.
            </p>
            <p className="mb-3">
              The breakthrough came from <strong className="text-white">Bill Tutte</strong>, who deduced the entire structure of the Lorenz machine without ever seeing one — purely from analysis of intercepted traffic. He discovered that XORing adjacent ciphertext characters (the "delta" operation) produced a statistical bias that could reveal the Chi wheel settings.
            </p>
            <p className="mb-3">
              <strong className="text-white">How it worked:</strong> The Lorenz cipher combined plaintext with patterns from 12 rotating wheels using XOR. Colossus tried each possible starting position of the Chi wheels. For the correct position, the delta of the ciphertext XORed with the delta of the Chi pattern would show a measurable deviation from 50/50 — more zeros than ones.
            </p>
            <p>
              After the war, Churchill ordered most Colossus machines destroyed and the project remained secret until the 1970s. Tommy Flowers was forbidden from claiming credit and even had to destroy his blueprints. He spent his life savings on the project and was never adequately reimbursed.
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
            Encrypt with Lorenz
          </button>
          <button
            onClick={() => setTab('attack')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'attack'
                ? 'bg-red-950/50 text-red-400 border border-red-700/50'
                : 'text-slate-500 border border-slate-800 hover:text-white'
            }`}
          >
            <Binary size={14} className="inline mr-2" />
            Run Colossus Attack
          </button>
        </div>

        {/* ═══════════ ENCRYPT TAB ═══════════ */}
        {tab === 'encrypt' && (
          <div className="space-y-6">
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5">
              <p className="text-sm text-slate-400">
                <strong className="text-white">Encrypt a message with a simplified Lorenz</strong> (Chi wheels only). Type any message, set the secret Chi wheel positions, then send the ciphertext to Colossus for statistical attack.
                Longer messages give Colossus stronger statistical signal — try 50+ characters.
              </p>
            </div>

            {/* Plaintext */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Plaintext (letters and spaces, Baudot/ITA2 encoded)</label>
              <textarea
                value={plaintext}
                onChange={e => setPlaintext(e.target.value)}
                className="w-full h-24 bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 font-mono text-sm text-white resize-none focus:outline-none focus:border-amber-700/50"
                placeholder="Type your message..."
              />
              <div className="text-xs text-slate-500 mt-1">{plaintext.length} characters</div>
            </div>

            {/* Chi wheel positions */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white">Chi Wheel Starting Positions (secret key)</h3>
                <button
                  onClick={randomizePositions}
                  className="px-3 py-1 text-xs border border-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                  Randomize
                </button>
              </div>
              <div className="flex gap-4">
                {CHI_SIZES.map((size, i) => (
                  <div key={i} className="text-center">
                    <div className="text-[10px] text-slate-500 mb-1">χ{i + 1} (0-{size - 1})</div>
                    <div className="flex flex-col items-center gap-1">
                      <button
                        onClick={() => { const p = [...chiPositions]; p[i] = (p[i] + 1) % size; setChiPositions(p); }}
                        className="text-slate-500 hover:text-white"
                      >▲</button>
                      <div className="w-12 h-10 rounded-lg bg-slate-800 border border-amber-700/40 flex items-center justify-center font-mono text-lg font-bold text-amber-400">
                        {chiPositions[i]}
                      </div>
                      <button
                        onClick={() => { const p = [...chiPositions]; p[i] = (p[i] - 1 + size) % size; setChiPositions(p); }}
                        className="text-slate-500 hover:text-white"
                      >▼</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Wheel seed */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center gap-4">
                <label className="text-xs font-bold text-slate-400 uppercase">Wheel Pattern Seed</label>
                <input
                  type="number"
                  value={wheelSeed}
                  onChange={e => setWheelSeed(parseInt(e.target.value) || 0)}
                  className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1 font-mono text-sm text-white focus:outline-none"
                />
                <span className="text-xs text-slate-500">Changes the pin pattern on all 5 Chi wheels</span>
              </div>
            </div>

            {/* Ciphertext output */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Lorenz Ciphertext</label>
              <div className="bg-slate-900/80 border border-amber-900/30 rounded-xl px-4 py-3 font-mono text-sm text-amber-400 break-all min-h-[3rem]">
                {cipherText}
              </div>
              <div className="text-xs text-slate-500 mt-1">{cipherText.length} characters</div>
            </div>

            {/* Baudot binary preview */}
            <details>
              <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-300">Show Baudot/ITA2 binary</summary>
              <div className="mt-2 bg-slate-900/40 border border-slate-800 rounded-xl p-4 font-mono text-[10px] max-h-48 overflow-y-auto">
                {cipherBits.slice(0, 30).map((bits, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-red-400 w-4">{cipherText[i]}</span>
                    <span className="text-slate-600">→</span>
                    {bits.map((b, j) => (
                      <span key={j} className={b ? 'text-green-400' : 'text-slate-600'}>{b}</span>
                    ))}
                  </div>
                ))}
                {cipherBits.length > 30 && <div className="text-slate-600">... {cipherBits.length - 30} more</div>}
              </div>
            </details>

            <button
              onClick={loadToAttack}
              className="px-6 py-3 bg-red-950/50 border border-red-700/50 rounded-lg text-red-400 font-medium hover:bg-red-900/40 transition-colors"
            >
              Send to Colossus →
            </button>
          </div>
        )}

        {/* ═══════════ ATTACK TAB ═══════════ */}
        {tab === 'attack' && (
          <div className="space-y-6">
            {attackBits.length === 0 ? (
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-8 text-center">
                <p className="text-slate-400 mb-4">No intercepted message loaded. Encrypt a message first, then send it to Colossus.</p>
                <button
                  onClick={() => setTab('encrypt')}
                  className="px-4 py-2 border border-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                  Go to Encrypt tab
                </button>
              </div>
            ) : (
              <>
                <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5">
                  <p className="text-sm text-slate-400">
                    <strong className="text-white">Colossus attacks one Chi wheel at a time.</strong> For each candidate position, it XORs the cipher delta against the candidate Chi delta and counts the statistical bias. The correct position shows significantly more zeros than random chance (~{expectedBaseline.toFixed(0)}).
                    Message length: <strong className="text-white">{attackBits.length}</strong> characters.
                  </p>
                </div>

                {/* Intercepted message preview */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                  <h3 className="text-sm font-bold text-white mb-2">Intercepted Ciphertext</h3>
                  <div className="font-mono text-xs text-red-400 break-all leading-relaxed">
                    {bitsToText(attackBits)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">{attackBits.length} characters</div>
                </div>

                {/* Chi Wheel Selection */}
                <div>
                  <h3 className="text-sm font-bold text-slate-300 mb-3">Select Chi Wheel to Attack</h3>
                  <div className="flex gap-3">
                    {CHI_SIZES.map((size, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedWheel(i)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          selectedWheel === i
                            ? 'bg-red-950/50 text-red-400 border border-red-700/50'
                            : 'text-slate-500 border border-slate-800 hover:text-white hover:border-slate-600'
                        }`}
                      >
                        χ{i + 1} ({size} pins)
                      </button>
                    ))}
                  </div>
                </div>

                {/* Wheel pattern */}
                <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Chi-{selectedWheel + 1} Pattern ({activeWheelSize} pins)</h4>
                  <div className="flex gap-[2px] flex-wrap">
                    {(attackWheels[selectedWheel] || []).map((bit, i) => (
                      <div
                        key={i}
                        className={`w-4 h-4 rounded-sm text-[8px] flex items-center justify-center font-mono ${
                          bit ? 'bg-green-900/40 text-green-400' : 'bg-slate-800 text-slate-600'
                        }`}
                      >
                        {bit}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-4">
                  {!running ? (
                    <button
                      onClick={runColossus}
                      className="flex items-center gap-2 px-6 py-2 bg-red-950/50 border border-red-700/50 rounded-lg text-red-400 font-medium hover:bg-red-900/40 transition-colors"
                    >
                      <Play size={16} /> Run Colossus ({activeWheelSize} positions)
                    </button>
                  ) : (
                    <button
                      onClick={stopColossus}
                      className="flex items-center gap-2 px-6 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 font-medium hover:bg-slate-700 transition-colors"
                    >
                      <Pause size={16} /> Pause
                    </button>
                  )}
                  <button
                    onClick={resetColossus}
                    className="flex items-center gap-2 px-4 py-2 border border-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                  >
                    <RotateCcw size={16} /> Reset
                  </button>
                  <div className="flex items-center gap-2 ml-auto">
                    <span className="text-xs text-slate-500">Speed</span>
                    <input
                      type="range" min={1} max={100} value={speed}
                      onChange={e => setSpeed(parseInt(e.target.value))}
                      className="w-24 accent-red-500"
                    />
                  </div>
                </div>

                {/* Score chart */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
                  <h3 className="text-sm font-bold text-white mb-2">Chi-{selectedWheel + 1} Position Scores</h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Each bar = count of zeros in delta-XOR. Higher = more bias = more likely correct. Baseline: ~{expectedBaseline.toFixed(0)}.
                  </p>
                  <div className="flex items-end gap-[2px] h-48">
                    {Array.from({ length: activeWheelSize }, (_, i) => {
                      const score = scores.get(i);
                      const isCurrent = i === currentPos && running;
                      const isBest = bestPos !== null && i === bestPos;
                      const barH = score !== undefined
                        ? Math.max(2, ((score - minScore + 1) / (maxScore - minScore + 1)) * 100)
                        : 0;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                          {score !== undefined && (
                            <div className="absolute bottom-full mb-1 hidden group-hover:block bg-slate-700 rounded px-2 py-1 text-[9px] z-10 whitespace-nowrap">
                              Pos {i}: {score} zeros{i === correctPos && ' (CORRECT)'}
                            </div>
                          )}
                          <div
                            className={`w-full rounded-t-sm transition-all ${
                              isCurrent ? 'bg-yellow-500' :
                              isBest ? 'bg-green-500' :
                              score !== undefined && score > expectedBaseline + 3 ? 'bg-red-500/70' :
                              score !== undefined ? 'bg-slate-600/50' : 'bg-slate-800/30'
                            }`}
                            style={{ height: score !== undefined ? `${barH}%` : '0%' }}
                          />
                          {(i % 5 === 0 || isBest) && (
                            <div className={`text-[7px] mt-0.5 ${isBest ? 'text-green-400 font-bold' : 'text-slate-600'}`}>{i}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-[10px] text-slate-500">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-green-500" /><span>Best candidate</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-red-500/70" /><span>Above baseline</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-slate-600/50" /><span>Near baseline</span></div>
                  </div>
                </div>

                {/* Results */}
                {bestPos !== null && !running && (
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4">Colossus Result</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-green-950/30 border border-green-800/40 rounded-lg p-4">
                        <div className="text-xs text-green-400/70 uppercase font-bold mb-1">Best Candidate</div>
                        <div className="text-3xl font-mono font-bold text-green-400">Position {bestPos}</div>
                        <div className="text-sm text-slate-400 mt-1">Score: {scores.get(bestPos)} zeros</div>
                      </div>
                      <div className={`rounded-lg p-4 ${bestPos === correctPos ? 'bg-green-950/30 border border-green-800/40' : 'bg-yellow-950/30 border border-yellow-800/40'}`}>
                        <div className={`text-xs uppercase font-bold mb-1 ${bestPos === correctPos ? 'text-green-400/70' : 'text-yellow-400/70'}`}>
                          {bestPos === correctPos ? 'Correct!' : 'Actual Position'}
                        </div>
                        <div className={`text-3xl font-mono font-bold ${bestPos === correctPos ? 'text-green-400' : 'text-yellow-400'}`}>
                          {bestPos === correctPos ? 'MATCH' : `Position ${correctPos}`}
                        </div>
                        <div className="text-sm text-slate-400 mt-1">
                          {bestPos === correctPos
                            ? 'Colossus found the correct Chi wheel position!'
                            : `Correct position scored: ${scores.get(correctPos) ?? '?'} zeros`}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-800">
                      <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Top 5 Candidates</h4>
                      <div className="flex gap-3 flex-wrap">
                        {[...scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([pos, score]) => (
                          <div key={pos} className={`px-4 py-2 rounded-lg border text-center ${
                            pos === correctPos ? 'bg-green-950/40 border-green-700/50' : 'bg-slate-800/50 border-slate-700'
                          }`}>
                            <div className={`text-lg font-mono font-bold ${pos === correctPos ? 'text-green-400' : 'text-slate-300'}`}>{pos}</div>
                            <div className="text-[10px] text-slate-500">{score} zeros</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 mt-4">
                      The operator would note the top candidates, then attack the remaining 4 Chi wheels, and finally the Psi and Motor wheels.
                    </p>
                  </div>
                )}

                {/* Delta explanation */}
                <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5">
                  <h3 className="text-sm font-bold text-white mb-3">The Delta Operation (Tutte's 1+2 Break)</h3>
                  <div className="font-mono text-xs space-y-2">
                    <div className="text-slate-400">
                      <span className="text-slate-500">Cipher[n]:  </span>
                      {attackBits.slice(0, 8).map((bits, i) => (
                        <span key={i} className="mr-2">{bits.map((b, j) => <span key={j} className={b ? 'text-green-400' : 'text-slate-600'}>{b}</span>)}</span>
                      ))}
                    </div>
                    <div className="text-slate-400">
                      <span className="text-slate-500">Cipher[n+1]:</span>
                      {attackBits.slice(1, 9).map((bits, i) => (
                        <span key={i} className="mr-2">{bits.map((b, j) => <span key={j} className={b ? 'text-green-400' : 'text-slate-600'}>{b}</span>)}</span>
                      ))}
                    </div>
                    <div className="text-red-400">
                      <span className="text-slate-500">Delta (XOR):</span>
                      {deltaStream(attackBits).slice(0, 8).map((bits, i) => (
                        <span key={i} className="mr-2">{bits.map((b, j) => <span key={j} className={b ? 'text-yellow-400' : 'text-slate-600'}>{b}</span>)}</span>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-3">
                    The delta cancels out the Psi contribution (Psi wheels often don't step), leaving a pattern correlated with the Chi wheel delta.
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* ITA2 Reference */}
        <details className="mt-6">
          <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-300">Show Baudot/ITA2 encoding table</summary>
          <div className="mt-2 bg-slate-900/40 border border-slate-800 rounded-xl p-4">
            <div className="grid grid-cols-9 gap-1 font-mono text-[10px]">
              {Object.entries(ITA2_LETTERS).filter(([k]) => k !== '/').map(([letter, code]) => (
                <div key={letter} className="text-center py-1">
                  <div className="text-white font-bold">{letter === ' ' ? '␣' : letter}</div>
                  <div className="text-slate-500">
                    {[4, 3, 2, 1, 0].map(bit => (
                      <span key={bit} className={(code >> bit) & 1 ? 'text-green-500' : 'text-slate-700'}>{(code >> bit) & 1}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </details>
      </div>
    </div>
  );
};

export default ColossusApp;
