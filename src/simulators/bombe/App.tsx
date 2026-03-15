import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { CircuitBoard, Info, X, Play, Pause, RotateCcw, Lock } from 'lucide-react';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Actual Enigma I rotor wirings
const ROTORS = [
  'EKMFLGDQVZNTOWYHXUSPAIBRCJ', // I
  'AJDKSIRUXBLHWTMCQGZNPYFVOE', // II
  'BDFHJLCPRTXVZNYEIWGAKMUSQO', // III
];
const REFLECTOR = 'YRUHQSLDPXNGOKMIEBFZCWVJAT'; // UKW-B

function enigmaEncrypt(ch: string, positions: [number, number, number]): string {
  let idx = ALPHABET.indexOf(ch);
  if (idx === -1) return ch;
  for (let r = 2; r >= 0; r--) {
    idx = (idx + positions[r]) % 26;
    idx = ALPHABET.indexOf(ROTORS[r][idx]);
    idx = (idx - positions[r] + 26) % 26;
  }
  idx = ALPHABET.indexOf(REFLECTOR[idx]);
  for (let r = 0; r < 3; r++) {
    idx = (idx + positions[r]) % 26;
    idx = ROTORS[r].indexOf(ALPHABET[idx]);
    idx = (idx - positions[r] + 26) % 26;
  }
  return ALPHABET[idx];
}

function stepRotors(pos: [number, number, number]): [number, number, number] {
  const newPos: [number, number, number] = [...pos];
  newPos[2] = (newPos[2] + 1) % 26;
  if (newPos[2] === 0) {
    newPos[1] = (newPos[1] + 1) % 26;
    if (newPos[1] === 0) {
      newPos[0] = (newPos[0] + 1) % 26;
    }
  }
  return newPos;
}

function enigmaEncryptString(text: string, startPos: [number, number, number]): string {
  let pos: [number, number, number] = [...startPos];
  let result = '';
  for (const ch of text.toUpperCase().replace(/[^A-Z]/g, '')) {
    result += enigmaEncrypt(ch, pos);
    pos = stepRotors(pos);
  }
  return result;
}

function buildMenu(ciphertext: string, crib: string): { from: string; to: string; pos: number }[] {
  const links: { from: string; to: string; pos: number }[] = [];
  const len = Math.min(ciphertext.length, crib.length);
  for (let i = 0; i < len; i++) {
    if (ALPHABET.includes(ciphertext[i]) && ALPHABET.includes(crib[i])) {
      links.push({ from: crib[i], to: ciphertext[i], pos: i });
    }
  }
  return links;
}

function findLoops(links: { from: string; to: string; pos: number }[]): string[][] {
  const adj: Record<string, { letter: string; pos: number }[]> = {};
  for (const l of links) {
    if (!adj[l.from]) adj[l.from] = [];
    if (!adj[l.to]) adj[l.to] = [];
    adj[l.from].push({ letter: l.to, pos: l.pos });
    adj[l.to].push({ letter: l.from, pos: l.pos });
  }
  const loops: string[][] = [];
  const visited = new Set<string>();
  function dfs(start: string, current: string, path: string[], depth: number) {
    if (depth > 6) return;
    for (const next of (adj[current] || [])) {
      if (next.letter === start && path.length >= 3) {
        loops.push([...path, start]);
        return;
      }
      if (!path.includes(next.letter) && !visited.has(next.letter)) {
        dfs(start, next.letter, [...path, next.letter], depth + 1);
      }
    }
  }
  for (const letter of Object.keys(adj)) {
    dfs(letter, letter, [letter], 0);
    visited.add(letter);
  }
  return loops.slice(0, 5);
}

function testPosition(
  ciphertext: string,
  crib: string,
  startPos: [number, number, number]
): { valid: boolean; contradictions: string[] } {
  const contradictions: string[] = [];
  let pos: [number, number, number] = [...startPos];
  for (let i = 0; i < Math.min(ciphertext.length, crib.length); i++) {
    const encrypted = enigmaEncrypt(crib[i], pos);
    if (encrypted !== ciphertext[i]) {
      contradictions.push(`Pos ${i}: ${crib[i]}→${encrypted} (expected ${ciphertext[i]})`);
      if (contradictions.length >= 2) break;
    }
    pos = stepRotors(pos);
  }
  return { valid: contradictions.length === 0, contradictions };
}

const BombeApp: React.FC = () => {
  const [showInfo, setShowInfo] = useState(false);
  const [tab, setTab] = useState<'encrypt' | 'attack'>('encrypt');

  // Encrypt tab state
  const [plaintext, setPlaintext] = useState('WETTERVORHERSAGEBISKAYA');
  const [rotorPos, setRotorPos] = useState<[number, number, number]>([3, 15, 7]); // D-P-H

  const ciphertext = useMemo(() => {
    const clean = plaintext.toUpperCase().replace(/[^A-Z]/g, '');
    return enigmaEncryptString(clean, rotorPos);
  }, [plaintext, rotorPos]);

  // Attack tab state
  const [attackCipher, setAttackCipher] = useState('');
  const [attackCrib, setAttackCrib] = useState('');
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(70);
  const [currentTest, setCurrentTest] = useState<[number, number, number] | null>(null);
  const [results, setResults] = useState<Map<string, { valid: boolean; contradictions: string[] }>>(new Map());
  const [stops, setStops] = useState<[number, number, number][]>([]);
  const [progress, setProgress] = useState(0);
  const [totalTests, setTotalTests] = useState(0);
  const runRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load encrypted message into attack
  const loadToAttack = () => {
    setAttackCipher(ciphertext);
    setAttackCrib(plaintext.toUpperCase().replace(/[^A-Z]/g, ''));
    setTab('attack');
    resetBombe();
  };

  const menu = useMemo(() => buildMenu(attackCipher, attackCrib), [attackCipher, attackCrib]);
  const loops = useMemo(() => findLoops(menu), [menu]);

  const runBombe = useCallback(() => {
    runRef.current = true;
    setRunning(true);
    setResults(new Map());
    setStops([]);
    setProgress(0);
    const total = 26 * 26 * 26;
    setTotalTests(total);

    const newResults = new Map<string, { valid: boolean; contradictions: string[] }>();
    const newStops: [number, number, number][] = [];
    let r1 = 0, r2 = 0, r3 = 0;
    let count = 0;

    function step() {
      if (!runRef.current || r1 >= 26) {
        setRunning(false);
        runRef.current = false;
        return;
      }

      // Test a batch per frame for speed
      const batchSize = speed > 80 ? 100 : speed > 50 ? 20 : 1;
      for (let b = 0; b < batchSize && r1 < 26; b++) {
        const pos: [number, number, number] = [r1, r2, r3];
        const result = testPosition(attackCipher, attackCrib, pos);
        const key = `${r1}-${r2}-${r3}`;
        newResults.set(key, result);
        if (result.valid) newStops.push([...pos]);
        count++;

        r3++;
        if (r3 >= 26) { r3 = 0; r2++; }
        if (r2 >= 26) { r2 = 0; r1++; }
      }

      setCurrentTest([Math.min(r1, 25), r2, r3]);
      setProgress(count);
      setResults(new Map(newResults));
      setStops([...newStops]);

      timerRef.current = setTimeout(step, speed > 80 ? 5 : speed > 50 ? 20 : 80);
    }

    step();
  }, [attackCipher, attackCrib, speed]);

  const stopBombe = useCallback(() => {
    runRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    setRunning(false);
  }, []);

  const resetBombe = useCallback(() => {
    stopBombe();
    setCurrentTest(null);
    setResults(new Map());
    setStops([]);
    setProgress(0);
  }, [stopBombe]);

  useEffect(() => {
    return () => { runRef.current = false; if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const posLabel = (p: [number, number, number]) => `${ALPHABET[p[0]]}-${ALPHABET[p[1]]}-${ALPHABET[p[2]]}`;

  return (
    <div className="flex-1 bg-[#1a1814] text-stone-200 px-6 py-8 sm:px-10 md:px-16">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-950/60 border border-red-700/50 flex items-center justify-center text-red-400">
              <CircuitBoard size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">BOMBE</h1>
              <p className="text-sm text-slate-500 font-mono">TURING'S ENIGMA BREAKER — BLETCHLEY PARK, 1940</p>
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
            <h3 className="text-red-400 font-bold mb-2">How the Bombe Worked</h3>
            <p className="mb-3">
              <strong className="text-white">Alan Turing</strong> designed the Bombe in 1939, building on the Polish <em>Bomba</em> by Marian Rejewski. <strong className="text-white">Gordon Welchman</strong> added the diagonal board, making it vastly more efficient.
            </p>
            <p className="mb-3">
              The Bombe exploited <strong className="text-white">cribs</strong> — guessed plaintext. German messages often contained predictable phrases: "WETTERVORHERSAGE" (weather forecast), "KEINE BESONDEREN EREIGNISSE" (nothing to report). By matching crib letters against ciphertext, the Bombe built a "menu" of electrical connections.
            </p>
            <p className="mb-3">
              The key insight: if a guess leads to a <strong className="text-white">contradiction</strong> (a letter encrypting to itself, or a wire carrying two voltages), that rotor position is eliminated. The Bombe tested all 17,576 positions for the three right-hand rotors, looking for "stops" — positions without contradictions.
            </p>
            <p>
              Each stop was then tested by hand on a checking machine. By 1945, over 200 Bombes ran at Bletchley Park and its outstations, cracking thousands of messages daily.
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
            Encrypt with Enigma
          </button>
          <button
            onClick={() => setTab('attack')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'attack'
                ? 'bg-red-950/50 text-red-400 border border-red-700/50'
                : 'text-slate-500 border border-slate-800 hover:text-white'
            }`}
          >
            <CircuitBoard size={14} className="inline mr-2" />
            Run Bombe Attack
          </button>
        </div>

        {/* ═══════════ ENCRYPT TAB ═══════════ */}
        {tab === 'encrypt' && (
          <div className="space-y-6">
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5">
              <p className="text-sm text-slate-400">
                <strong className="text-white">Encrypt a message with Enigma</strong> (Rotors I-II-III, Reflector UKW-B, no plugboard), then send the ciphertext and a crib to the Bombe to crack it.
              </p>
            </div>

            {/* Rotor positions */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-bold text-white mb-4">Rotor Starting Positions</h3>
              <div className="flex gap-6 items-center">
                {(['I', 'II', 'III'] as const).map((label, i) => (
                  <div key={i} className="text-center">
                    <div className="text-[10px] text-slate-500 uppercase mb-1">Rotor {label}</div>
                    <div className="flex flex-col items-center gap-1">
                      <button
                        onClick={() => {
                          const newPos = [...rotorPos] as [number, number, number];
                          newPos[i] = (newPos[i] + 1) % 26;
                          setRotorPos(newPos);
                        }}
                        className="text-slate-500 hover:text-white transition-colors"
                      >▲</button>
                      <div className="w-12 h-12 rounded-lg bg-slate-800 border border-amber-700/40 flex items-center justify-center font-mono text-xl font-bold text-amber-400">
                        {ALPHABET[rotorPos[i]]}
                      </div>
                      <button
                        onClick={() => {
                          const newPos = [...rotorPos] as [number, number, number];
                          newPos[i] = (newPos[i] - 1 + 26) % 26;
                          setRotorPos(newPos);
                        }}
                        className="text-slate-500 hover:text-white transition-colors"
                      >▼</button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => setRotorPos([
                    Math.floor(Math.random() * 26),
                    Math.floor(Math.random() * 26),
                    Math.floor(Math.random() * 26),
                  ])}
                  className="ml-4 px-3 py-2 text-xs border border-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                  Randomize
                </button>
              </div>
            </div>

            {/* Plaintext input */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Plaintext</label>
              <textarea
                value={plaintext}
                onChange={e => setPlaintext(e.target.value)}
                className="w-full h-24 bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 font-mono text-sm text-white resize-none focus:outline-none focus:border-amber-700/50"
                placeholder="Type your message..."
              />
            </div>

            {/* Ciphertext output */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Enigma Ciphertext</label>
              <div className="bg-slate-900/80 border border-amber-900/30 rounded-xl px-4 py-3 font-mono text-sm text-amber-400 break-all min-h-[3rem]">
                {ciphertext || <span className="text-slate-700">...</span>}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Encrypted at {posLabel(rotorPos)} — {ciphertext.length} characters
              </div>
            </div>

            {/* Send to Bombe */}
            <button
              onClick={loadToAttack}
              className="px-6 py-3 bg-red-950/50 border border-red-700/50 rounded-lg text-red-400 font-medium hover:bg-red-900/40 transition-colors"
            >
              Send to Bombe →
            </button>
          </div>
        )}

        {/* ═══════════ ATTACK TAB ═══════════ */}
        {tab === 'attack' && (
          <div className="space-y-6">
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5">
              <p className="text-sm text-slate-400">
                <strong className="text-white">The Bombe tests all 17,576 rotor positions</strong> (26³) against your crib. For each position, it checks: does encrypting the crib with this setting produce the observed ciphertext? Positions that match are "stops" — candidates for the real key.
              </p>
            </div>

            {/* Input */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Intercepted Ciphertext</label>
                <textarea
                  value={attackCipher}
                  onChange={e => { setAttackCipher(e.target.value.toUpperCase().replace(/[^A-Z]/g, '')); resetBombe(); }}
                  className="w-full h-24 bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 font-mono text-sm text-white resize-none focus:outline-none focus:border-red-700/50"
                  placeholder="Paste ciphertext..."
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Crib (known/guessed plaintext)</label>
                <textarea
                  value={attackCrib}
                  onChange={e => { setAttackCrib(e.target.value.toUpperCase().replace(/[^A-Z]/g, '')); resetBombe(); }}
                  className="w-full h-24 bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 font-mono text-sm text-white resize-none focus:outline-none focus:border-red-700/50"
                  placeholder="Known plaintext (full or partial)..."
                />
              </div>
            </div>

            {/* Crib alignment */}
            {attackCipher && attackCrib && (
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 font-mono text-xs overflow-x-auto">
                <div className="text-slate-500 mb-1">Pos:    {attackCipher.split('').map((_, i) => String(i).padStart(3)).join('')}</div>
                <div className="text-red-400 mb-1">Cipher: {attackCipher.split('').map(c => `  ${c}`).join('')}</div>
                <div className="text-green-400">Crib:   {attackCrib.split('').map(c => `  ${c}`).join('')}{attackCipher.length > attackCrib.length ? ' '.repeat((attackCipher.length - attackCrib.length) * 3) : ''}</div>
              </div>
            )}

            {/* Menu and Loops */}
            {menu.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                  <h3 className="text-sm font-bold text-white mb-4">Menu ({menu.length} connections)</h3>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {menu.map((link, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="text-xs text-slate-600 w-8">@{link.pos}</span>
                        <span className="font-mono text-green-400 w-4">{link.from}</span>
                        <span className="text-slate-600">→</span>
                        <span className="font-mono text-red-400 w-4">{link.to}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                  <h3 className="text-sm font-bold text-white mb-4">Loops Found</h3>
                  {loops.length === 0 ? (
                    <p className="text-sm text-slate-500">No loops found. Loops improve efficiency but aren't required.</p>
                  ) : (
                    <div className="space-y-2">
                      {loops.map((loop, i) => (
                        <div key={i} className="flex items-center gap-1 text-sm font-mono">
                          {loop.map((letter, j) => (
                            <React.Fragment key={j}>
                              <span className="text-yellow-400">{letter}</span>
                              {j < loop.length - 1 && <span className="text-slate-600">→</span>}
                            </React.Fragment>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center gap-4">
              {!running ? (
                <button
                  onClick={runBombe}
                  disabled={!attackCipher || !attackCrib}
                  className="flex items-center gap-2 px-6 py-2 bg-red-950/50 border border-red-700/50 rounded-lg text-red-400 font-medium hover:bg-red-900/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Play size={16} /> Run Bombe (17,576 positions)
                </button>
              ) : (
                <button
                  onClick={stopBombe}
                  className="flex items-center gap-2 px-6 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 font-medium hover:bg-slate-700 transition-colors"
                >
                  <Pause size={16} /> Pause
                </button>
              )}
              <button
                onClick={resetBombe}
                className="flex items-center gap-2 px-4 py-2 border border-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <RotateCcw size={16} /> Reset
              </button>
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-slate-500">Speed</span>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={speed}
                  onChange={e => setSpeed(parseInt(e.target.value))}
                  className="w-24 accent-red-500"
                />
              </div>
            </div>

            {/* Progress */}
            {(running || progress > 0) && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-white">
                    Bombe Running... {currentTest && <span className="text-yellow-400 font-mono ml-2">{posLabel(currentTest)}</span>}
                  </h3>
                  <span className="text-xs text-slate-500">
                    {progress.toLocaleString()} / {totalTests.toLocaleString()} ({((progress / totalTests) * 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500/60 rounded-full transition-all"
                    style={{ width: `${(progress / totalTests) * 100}%` }}
                  />
                </div>

                {/* Rotor I breakdown */}
                <div className="mt-4">
                  <div className="text-[10px] text-slate-500 mb-2">Rotor I progress</div>
                  <div className="flex gap-1">
                    {Array.from({ length: 26 }, (_, i) => {
                      const tested = currentTest ? i < currentTest[0] || (i === currentTest[0]) : false;
                      const isCurrent = currentTest ? i === currentTest[0] : false;
                      const hasStop = stops.some(s => s[0] === i);
                      return (
                        <div
                          key={i}
                          className={`flex-1 h-6 rounded-sm flex items-center justify-center text-[8px] font-mono transition-all ${
                            hasStop ? 'bg-green-900/60 text-green-400 border border-green-700/40' :
                            isCurrent ? 'bg-yellow-900/60 text-yellow-400 border border-yellow-700/40' :
                            tested ? 'bg-red-950/40 text-red-900 border border-red-900/20' :
                            'bg-slate-800/50 text-slate-600 border border-slate-800'
                          }`}
                        >
                          {ALPHABET[i]}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Results */}
            {stops.length > 0 && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">
                  {running ? 'Stops Found So Far' : 'Bombe Results'}: {stops.length} stop{stops.length !== 1 ? 's' : ''}
                </h3>
                <div className="space-y-3">
                  {stops.map((pos, i) => {
                    const decrypted = enigmaEncryptString(attackCipher, pos);
                    return (
                      <div key={i} className="bg-green-950/30 border border-green-800/40 rounded-lg p-4">
                        <div className="flex items-center gap-4 mb-2">
                          <span className="text-xl font-mono font-bold text-green-400">{posLabel(pos)}</span>
                          <span className="text-xs text-slate-500">(Rotor I={ALPHABET[pos[0]]}, II={ALPHABET[pos[1]]}, III={ALPHABET[pos[2]]})</span>
                        </div>
                        <div className="font-mono text-xs text-green-400/80 break-all">
                          Decrypted: {decrypted}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {!running && (
                  <p className="text-xs text-slate-500 mt-4">
                    In practice, each stop would be tested on a checking machine (a modified Enigma) to verify the full decryption and recover the day's settings.
                  </p>
                )}
              </div>
            )}

            {!running && progress >= totalTests && stops.length === 0 && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
                <p className="text-sm text-slate-400">
                  No stops found. This could mean the crib is incorrect, misaligned, or the message wasn't encrypted with Rotors I-II-III / UKW-B.
                </p>
              </div>
            )}

            {/* Contradiction samples */}
            {results.size > 0 && stops.length === 0 && !running && (
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5">
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Sample Contradictions</h4>
                <div className="space-y-1">
                  {[...results.entries()]
                    .filter(([, r]) => !r.valid)
                    .slice(0, 5)
                    .map(([key, r]) => (
                      <div key={key} className="text-xs font-mono text-slate-500">
                        <span className="text-red-400">{key.split('-').map(n => ALPHABET[parseInt(n)]).join('-')}</span>: {r.contradictions[0]}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BombeApp;
