import React, { useState, useCallback, useRef, useEffect } from 'react';
import { CircuitBoard, Info, X, Play, Pause, RotateCcw } from 'lucide-react';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Simplified rotor wirings (actual Enigma I rotors)
const ROTORS = [
  'EKMFLGDQVZNTOWYHXUSPAIBRCJ', // Rotor I
  'AJDKSIRUXBLHWTMCQGZNPYFVOE', // Rotor II
  'BDFHJLCPRTXVZNYEIWGAKMUSQO', // Rotor III
];
const REFLECTOR = 'YRUHQSLDPXNGOKMIEBFZCWVJAT'; // UKW-B

// Simple Enigma with 3 rotors, no plugboard, positions [r1, r2, r3]
function enigmaEncrypt(ch: string, positions: [number, number, number]): string {
  let idx = ALPHABET.indexOf(ch);
  if (idx === -1) return ch;

  // Forward through rotors (right to left: III, II, I)
  for (let r = 2; r >= 0; r--) {
    idx = (idx + positions[r]) % 26;
    idx = ALPHABET.indexOf(ROTORS[r][idx]);
    idx = (idx - positions[r] + 26) % 26;
  }

  // Reflector
  idx = ALPHABET.indexOf(REFLECTOR[idx]);

  // Backward through rotors (left to right: I, II, III)
  for (let r = 0; r < 3; r++) {
    idx = (idx + positions[r]) % 26;
    idx = ROTORS[r].indexOf(ALPHABET[idx]);
    idx = (idx - positions[r] + 26) % 26;
  }

  return ALPHABET[idx];
}

// Step rotors (simplified: just rightmost rotor)
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

// Build menu (graph of letter connections from crib)
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

// Find loops in the menu graph
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

// Test if a rotor starting position is consistent with the crib
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

// Default crib scenario
const DEFAULT_CIPHER = 'OZQBHNCWKJSL';
// We'll generate this from a known position so the demo works
function generateDemo(): { ciphertext: string; crib: string; correctPos: [number, number, number] } {
  const crib = 'WETTERVORHERSAGE'.slice(0, 12); // Weather report (common crib)
  const correctPos: [number, number, number] = [0, 0, 7]; // A-A-H
  let pos: [number, number, number] = [...correctPos];
  let cipher = '';
  for (const ch of crib) {
    cipher += enigmaEncrypt(ch, pos);
    pos = stepRotors(pos);
  }
  return { ciphertext: cipher, crib, correctPos };
}

const BombeApp: React.FC = () => {
  const [showInfo, setShowInfo] = useState(false);
  const [demo] = useState(generateDemo);
  const [ciphertext, setCiphertext] = useState(demo.ciphertext);
  const [crib, setCrib] = useState(demo.crib);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(50);
  const [currentTest, setCurrentTest] = useState<number>(-1);
  const [results, setResults] = useState<Map<number, { valid: boolean; contradictions: string[] }>>(new Map());
  const [stops, setStops] = useState<number[]>([]);
  const runRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const menu = buildMenu(ciphertext, crib);
  const loops = findLoops(menu);

  // Get unique letters in the menu
  const menuLetters = new Set<string>();
  menu.forEach(l => { menuLetters.add(l.from); menuLetters.add(l.to); });

  const runBombe = useCallback(() => {
    runRef.current = true;
    setRunning(true);
    setResults(new Map());
    setStops([]);

    let pos = 0;
    const newResults = new Map<number, { valid: boolean; contradictions: string[] }>();
    const newStops: number[] = [];

    function step() {
      if (!runRef.current || pos >= 26) {
        setRunning(false);
        runRef.current = false;
        return;
      }

      const testPos: [number, number, number] = [0, 0, pos];
      const result = testPosition(ciphertext, crib, testPos);
      newResults.set(pos, result);
      if (result.valid) newStops.push(pos);

      setCurrentTest(pos);
      setResults(new Map(newResults));
      setStops([...newStops]);

      pos++;
      timerRef.current = setTimeout(step, Math.max(10, 500 - speed * 5));
    }

    step();
  }, [ciphertext, crib, speed]);

  const stopBombe = useCallback(() => {
    runRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    setRunning(false);
  }, []);

  const resetBombe = useCallback(() => {
    stopBombe();
    setCurrentTest(-1);
    setResults(new Map());
    setStops([]);
  }, [stopBombe]);

  useEffect(() => {
    return () => { runRef.current = false; if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return (
    <div className="flex-1 bg-[#1a1814] text-stone-200 px-4 py-8 sm:px-8">
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

        {/* Concept */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 mb-6">
          <p className="text-sm text-slate-400">
            <strong className="text-white">The Bombe tests Enigma settings using a crib.</strong> For each rotor position, it checks: "If the plaintext is this crib, does the Enigma produce the observed ciphertext?" If not, that position is eliminated.
            This demo tests the 26 positions of the right rotor (rotor III) with rotors I and II fixed at A-A.
          </p>
        </div>

        {/* Setup */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Ciphertext (intercepted)</label>
            <input
              type="text"
              value={ciphertext}
              onChange={e => { setCiphertext(e.target.value.toUpperCase().replace(/[^A-Z]/g, '')); resetBombe(); }}
              className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-red-700/50"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Crib (guessed plaintext)</label>
            <input
              type="text"
              value={crib}
              onChange={e => { setCrib(e.target.value.toUpperCase().replace(/[^A-Z]/g, '')); resetBombe(); }}
              className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-red-700/50"
            />
          </div>
        </div>

        {/* Crib alignment */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 mb-6 font-mono text-sm">
          <div className="text-slate-500 mb-1">Pos:    {ciphertext.split('').map((_, i) => String(i).padStart(2)).join(' ')}</div>
          <div className="text-red-400 mb-1">Cipher: {ciphertext.split('').map(c => ` ${c}`).join(' ')}</div>
          <div className="text-green-400">Crib:   {crib.split('').map(c => ` ${c}`).join(' ')}</div>
        </div>

        {/* Menu */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-bold text-white mb-4">Menu (Letter Connections)</h3>
            <div className="space-y-1">
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
              <p className="text-sm text-slate-500">No loops found in menu. Loops make the Bombe more efficient but aren't required.</p>
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
                    <span className="text-xs text-slate-500 ml-2">(closed chain)</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mb-6">
          {!running ? (
            <button
              onClick={runBombe}
              className="flex items-center gap-2 px-6 py-2 bg-red-950/50 border border-red-700/50 rounded-lg text-red-400 font-medium hover:bg-red-900/40 transition-colors"
            >
              <Play size={16} /> Run Bombe
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

        {/* Rotor Position Grid */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 mb-6">
          <h3 className="text-sm font-bold text-white mb-4">Rotor III Position Test (A-A-?)</h3>
          <div className="grid grid-cols-13 gap-2">
            {Array.from({ length: 26 }, (_, i) => {
              const result = results.get(i);
              const isCurrent = i === currentTest;
              let bgClass = 'bg-slate-800/50 border-slate-700';
              if (result) {
                bgClass = result.valid
                  ? 'bg-green-950/60 border-green-600/50 shadow-lg shadow-green-500/10'
                  : 'bg-red-950/40 border-red-900/40';
              }
              if (isCurrent && running) {
                bgClass = 'bg-yellow-950/60 border-yellow-500/50 shadow-lg shadow-yellow-500/20';
              }

              return (
                <div
                  key={i}
                  className={`border rounded-lg p-3 text-center transition-all ${bgClass}`}
                >
                  <div className={`text-lg font-mono font-bold ${
                    result?.valid ? 'text-green-400' : isCurrent && running ? 'text-yellow-400' : result ? 'text-red-800' : 'text-slate-500'
                  }`}>
                    {ALPHABET[i]}
                  </div>
                  <div className="text-[9px] text-slate-600 mt-1">
                    {result ? (result.valid ? 'STOP' : '✗') : '—'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Results */}
        {results.size > 0 && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
            <h3 className="text-sm font-bold text-white mb-4">
              Results: {stops.length} stop{stops.length !== 1 ? 's' : ''} found out of {results.size} tested
            </h3>

            {stops.length > 0 ? (
              <div className="space-y-3">
                {stops.map(pos => (
                  <div key={pos} className="bg-green-950/30 border border-green-800/40 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-mono font-bold text-green-400">A-A-{ALPHABET[pos]}</span>
                      <span className="text-sm text-green-400/70">— Position survives all tests! This is a candidate.</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      In practice, an operator would test this position on a checking machine (a modified Enigma) to verify the full decryption.
                    </p>
                  </div>
                ))}
              </div>
            ) : results.size >= 26 ? (
              <p className="text-sm text-slate-400">
                No stops found for rotors I-II at A-A. In a full Bombe run, all 17,576 combinations of rotor I, II, and III positions would be tested.
              </p>
            ) : null}

            {/* Show some contradiction examples */}
            {results.size > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-800">
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Sample Contradictions</h4>
                <div className="space-y-1">
                  {[...results.entries()]
                    .filter(([, r]) => !r.valid)
                    .slice(0, 4)
                    .map(([pos, r]) => (
                      <div key={pos} className="text-xs font-mono text-slate-500">
                        <span className="text-red-400">A-A-{ALPHABET[pos]}</span>: {r.contradictions[0]}
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
