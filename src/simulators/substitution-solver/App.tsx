import React, { useState, useMemo, useCallback } from 'react';
import { Info, RotateCcw, Shuffle, Lock, Unlock, Undo2, ChevronDown, ChevronUp } from 'lucide-react';

// ─── English reference data ───────────────────────────────────────────────────
const ENGLISH_FREQ: Record<string, number> = {
  E:12.70, T:9.06, A:8.17, O:7.51, I:6.97, N:6.75, S:6.33, H:6.09, R:5.99,
  D:4.25,  L:4.03, C:2.78, U:2.76, M:2.41, W:2.36, F:2.23, G:2.02, Y:1.97,
  P:1.93,  B:1.29, V:0.98, K:0.77, J:0.15, X:0.15, Q:0.10, Z:0.07,
};
// English letters sorted by frequency (rank order)
const ENGLISH_BY_RANK = Object.entries(ENGLISH_FREQ).sort((a, b) => b[1] - a[1]).map(([l]) => l);

const COMMON_BIGRAMS  = ['TH','HE','IN','ER','AN','RE','ON','AT','EN','ND','TI','ES','OR','TE','OF','ED','IS','IT','AL','AR'];
const COMMON_TRIGRAMS = ['THE','AND','ING','HER','HAT','HIS','THA','ERE','FOR','ENT','ION','TER','WAS','YOU','ITH'];

// ─── Puzzle library ───────────────────────────────────────────────────────────
interface Puzzle { id: number; title: string; source: string; difficulty: 'easy' | 'medium' | 'hard'; text: string; }

const PUZZLES: Puzzle[] = [
  {
    id: 1, difficulty: 'easy', title: 'A Tale of Two Cities',
    source: 'Charles Dickens, 1859',
    text: 'It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness, it was the epoch of belief, it was the epoch of incredulity.',
  },
  {
    id: 2, difficulty: 'easy', title: 'The Gettysburg Address',
    source: 'Abraham Lincoln, 1863',
    text: 'Four score and seven years ago our fathers brought forth on this continent a new nation, conceived in liberty and dedicated to the proposition that all men are created equal.',
  },
  {
    id: 3, difficulty: 'easy', title: 'Declaration of Independence',
    source: 'Thomas Jefferson, 1776',
    text: 'We hold these truths to be self-evident, that all men are created equal, that they are endowed by their Creator with certain unalienable Rights, that among these are Life, Liberty and the pursuit of Happiness.',
  },
  {
    id: 4, difficulty: 'easy', title: 'Churchill on the Enigma',
    source: 'Winston Churchill to King George VI, 1941',
    text: 'The geese that laid the golden eggs and never cackled. The intelligence gathered at Bletchley Park was the secret that could not be named, distributed only to those who absolutely required it.',
  },
  {
    id: 5, difficulty: 'easy', title: 'Sherlock Holmes',
    source: 'Arthur Conan Doyle, The Adventure of the Dancing Men, 1903',
    text: 'When you have eliminated the impossible, whatever remains, however improbable, must be the truth. The world is full of obvious things which nobody by any chance ever observes.',
  },
  {
    id: 6, difficulty: 'easy', title: 'To Be or Not to Be',
    source: 'William Shakespeare, Hamlet, 1603',
    text: 'To be or not to be, that is the question. Whether it is nobler in the mind to suffer the slings and arrows of outrageous fortune, or to take arms against a sea of troubles.',
  },
  {
    id: 7, difficulty: 'easy', title: 'The Art of War',
    source: 'Sun Tzu, ca. 500 BCE',
    text: 'If you know the enemy and know yourself, you need not fear the result of a hundred battles. If you know yourself but not the enemy, for every victory gained you will also suffer a defeat.',
  },
  {
    id: 8, difficulty: 'easy', title: 'On the Origin of Species',
    source: 'Charles Darwin, 1859',
    text: 'It is not the strongest of the species that survives, nor the most intelligent that survives. It is the one that is most adaptable to change that survives in the long run of nature.',
  },
  {
    id: 9, difficulty: 'easy', title: 'Benjamin Franklin on Secrets',
    source: 'Benjamin Franklin, Poor Richard\'s Almanack, 1735',
    text: 'Three may keep a secret if two of them are dead. A secret between two people is no longer a secret. Between three, it is a rumour. Between more, it is common knowledge.',
  },
  {
    id: 10, difficulty: 'easy', title: 'Einstein on Imagination',
    source: 'Albert Einstein, ca. 1920',
    text: 'Imagination is more important than knowledge. For knowledge is limited, whereas imagination embraces the entire world, stimulating progress, giving birth to evolution. Logic will get you from A to B. Imagination will take you everywhere.',
  },
  {
    id: 11, difficulty: 'medium', title: 'Kerckhoffs\'s Principle',
    source: 'Auguste Kerckhoffs, La Cryptographie Militaire, 1883',
    text: 'A cryptosystem should be secure even if everything about the system, except the key, is public knowledge. The enemy knows the system. Security must depend on the key alone.',
  },
  {
    id: 12, difficulty: 'medium', title: 'The Raven',
    source: 'Edgar Allan Poe, 1845',
    text: 'Once upon a midnight dreary, while I pondered, weak and weary, over many a quaint and curious volume of forgotten lore, while I nodded, nearly napping, suddenly there came a tapping.',
  },
  {
    id: 13, difficulty: 'medium', title: 'Alan Turing on Machines',
    source: 'Alan Turing, Computing Machinery and Intelligence, 1950',
    text: 'I propose to consider the question: can machines think? The original question, whether a machine can think, is too meaningless to deserve discussion. A computer would deserve to be called intelligent if it could deceive a human into believing that it was human.',
  },
  {
    id: 14, difficulty: 'medium', title: 'Mark Twain on Truth',
    source: 'Mark Twain, ca. 1900',
    text: 'A lie can travel halfway around the world while the truth is still putting on its shoes. Never tell the truth to people who are not worthy of it. The truth is stranger than fiction.',
  },
  {
    id: 15, difficulty: 'medium', title: 'Newton on Standing on Shoulders',
    source: 'Isaac Newton, letter to Robert Hooke, 1675',
    text: 'If I have seen further it is by standing on the shoulders of giants. What we know is a drop, what we do not know is an ocean. Nature is pleased with simplicity and affects not the pomp of superfluous causes.',
  },
  {
    id: 16, difficulty: 'medium', title: 'Shannon on Secrecy',
    source: 'Claude Shannon, Communication Theory of Secrecy Systems, 1949',
    text: 'The enemy knows the system. Any secrecy must reside in the key. A system may be called theoretically unbreakable when the enemy, even with unlimited time and resources, cannot decipher it.',
  },
  {
    id: 17, difficulty: 'medium', title: 'Julius Caesar Crosses the Rubicon',
    source: 'Suetonius, Lives of the Twelve Caesars, ca. 121 CE',
    text: 'Caesar drove on with his troops, and when he reached the Rubicon he paused, for he well knew the laws of Rome. Then looking across he said: the die is cast. And he crossed.',
  },
  {
    id: 18, difficulty: 'medium', title: 'The Enigma Machine',
    source: 'Cipher Museum Educational Text',
    text: 'The Enigma machine combined three rotors, a plugboard, and a reflector to create a cipher of staggering complexity. The Germans believed it was unbreakable. The Poles proved them wrong in nineteen thirty-two.',
  },
  {
    id: 19, difficulty: 'hard', title: 'Al-Kindi on Frequency',
    source: 'Al-Kindi, A Manuscript on Deciphering Cryptographic Messages, ca. 850 CE',
    text: 'One way to solve an encrypted message is to find a plaintext of the same language, long enough to fill one sheet, and then count each letter. The most frequent letter is probably the most common in that tongue.',
  },
  {
    id: 20, difficulty: 'hard', title: 'Heraclitus on Change',
    source: 'Heraclitus of Ephesus, ca. 500 BCE',
    text: 'You cannot step into the same river twice, for new waters are always flowing. Everything changes and nothing stands still. The only constant in the universe is change itself.',
  },
  {
    id: 21, difficulty: 'hard', title: 'Bletchley Park',
    source: 'F. H. Hinsley, British Intelligence in the Second World War, 1979',
    text: 'The work done at Bletchley Park shortened the war in Europe by not less than two years and probably by four years. Without it the outcome might have been different.',
  },
  {
    id: 22, difficulty: 'hard', title: 'The Vigenère Boast',
    source: 'Encyclopédie Britannique, 19th century',
    text: 'The Vigenère cipher is the acme of human art. It has defeated every attempt at analysis. No cryptanalyst has yet discovered a method of solving it without the key.',
  },
];

// ─── Cipher logic ─────────────────────────────────────────────────────────────
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
    return key[u] ? (ch === u ? key[u] : key[u].toLowerCase()) : ch;
  }).join('');
}

function getFreqs(text: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const ch of text.toUpperCase()) if (ch >= 'A' && ch <= 'Z') counts[ch] = (counts[ch] || 0) + 1;
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

// ─── Types ────────────────────────────────────────────────────────────────────
type MappingEntry  = { plainLetter: string; locked: boolean };
type HistoryEntry  = { cipherLetter: string; oldPlain: string; newPlain: string };

const DIFF_COLOR: Record<string, string> = {
  easy:   'text-green-400 border-green-800/50 bg-green-950/30',
  medium: 'text-amber-400 border-amber-800/50 bg-amber-950/30',
  hard:   'text-red-400   border-red-800/50   bg-red-950/30',
};

// ─── Component ────────────────────────────────────────────────────────────────
function App() {
  const [ciphertext,     setCiphertext]     = useState('');
  const [trueKey,        setTrueKey]        = useState<Record<string, string>>({});
  const [mapping,        setMapping]        = useState<Record<string, MappingEntry>>({});
  const [selectedCipher, setSelectedCipher] = useState<string | null>(null);
  const [history,        setHistory]        = useState<HistoryEntry[]>([]);
  const [showInfo,       setShowInfo]       = useState(false);
  const [showHints,      setShowHints]      = useState(false);
  const [showPuzzles,    setShowPuzzles]    = useState(false);
  const [activePuzzle,   setActivePuzzle]   = useState<Puzzle | null>(null);

  const startPuzzle = useCallback((puzzle: Puzzle) => {
    const key = generateRandomKey();
    setCiphertext(encryptWithKey(puzzle.text, key));
    setTrueKey(key);
    setMapping({});
    setSelectedCipher(null);
    setHistory([]);
    setActivePuzzle(puzzle);
    setShowPuzzles(false);
  }, []);

  const randomPuzzle = useCallback(() => {
    startPuzzle(PUZZLES[Math.floor(Math.random() * PUZZLES.length)]);
  }, [startPuzzle]);

  const useCustom = useCallback((text: string) => {
    setCiphertext(text); setTrueKey({}); setMapping({});
    setSelectedCipher(null); setHistory([]); setActivePuzzle(null);
  }, []);

  const assignLetter = useCallback((cipherLetter: string, plainLetter: string) => {
    const existing = mapping[cipherLetter];
    if (existing?.locked) return;
    setHistory(prev => [...prev, { cipherLetter, oldPlain: existing?.plainLetter || '', newPlain: plainLetter }]);
    setMapping(prev => {
      const next = { ...prev };
      if (plainLetter) {
        for (const k of Object.keys(next)) {
          if (next[k].plainLetter === plainLetter && k !== cipherLetter) next[k] = { ...next[k], plainLetter: '' };
        }
      }
      next[cipherLetter] = { plainLetter, locked: false };
      return next;
    });
    setSelectedCipher(null);
  }, [mapping]);

  const toggleLock = useCallback((cipherLetter: string) => {
    setMapping(prev => {
      if (!prev[cipherLetter]?.plainLetter) return prev;
      return { ...prev, [cipherLetter]: { ...prev[cipherLetter], locked: !prev[cipherLetter].locked } };
    });
  }, []);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setMapping(prev => {
      const next = { ...prev };
      if (last.oldPlain) next[last.cipherLetter] = { plainLetter: last.oldPlain, locked: false };
      else delete next[last.cipherLetter];
      return next;
    });
  }, [history]);

  const cipherFreqs   = useMemo(() => getFreqs(ciphertext), [ciphertext]);
  const topBigrams    = useMemo(() => getNgrams(ciphertext, 2), [ciphertext]);
  const topTrigrams   = useMemo(() => getNgrams(ciphertext, 3), [ciphertext]);

  // Cipher letters sorted by frequency (descending), only those that appear
  const cipherByRank = useMemo(() =>
    [...ALPHA].sort((a, b) => (cipherFreqs[b] || 0) - (cipherFreqs[a] || 0)).filter(ch => (cipherFreqs[ch] || 0) > 0),
    [cipherFreqs]
  );

  // Scale for bars: max across both cipher and English frequencies
  const maxFreq = useMemo(() => Math.max(...Object.values(cipherFreqs), 13), [cipherFreqs]);

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

  const correctCount = useMemo(() => {
    if (!trueKey || Object.keys(trueKey).length === 0) return null;
    const inverseKey: Record<string, string> = {};
    for (const [p, c] of Object.entries(trueKey)) inverseKey[c] = p;
    let correct = 0;
    for (const [cipher, entry] of Object.entries(mapping)) {
      if (entry.plainLetter && inverseKey[cipher] === entry.plainLetter) correct++;
    }
    const total = Object.keys(mapping).filter(k => mapping[k].plainLetter).length;
    return { correct, total };
  }, [mapping, trueKey]);

  const usedPlain = useMemo(() => {
    const s = new Set<string>();
    for (const e of Object.values(mapping)) if (e.plainLetter) s.add(e.plainLetter);
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
          <button onClick={randomPuzzle}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-red-900/40 border border-red-700/60 text-red-300 hover:bg-red-800/40 transition-colors">
            <Shuffle size={14} /> Random Puzzle
          </button>
          <button onClick={() => setShowPuzzles(!showPuzzles)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm border transition-colors ${
              showPuzzles ? 'bg-red-900/40 border-red-700/60 text-red-300' : 'bg-stone-800 border-stone-700 text-stone-400 hover:text-stone-200'
            }`}>
            Choose Puzzle {showPuzzles ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button onClick={undo} disabled={history.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-stone-800 border border-stone-700 text-stone-400 hover:text-stone-200 transition-colors disabled:opacity-30">
            <Undo2 size={14} /> Undo
          </button>
          <button onClick={() => { setMapping({}); setHistory([]); setSelectedCipher(null); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-stone-800 border border-stone-700 text-stone-400 hover:text-stone-200 transition-colors">
            <RotateCcw size={14} /> Clear Map
          </button>
          <button onClick={() => setShowHints(!showHints)}
            className={`px-4 py-2 rounded-lg font-bold text-sm border transition-colors ${
              showHints ? 'bg-red-900/40 border-red-700/60 text-red-300' : 'bg-stone-800 border-stone-700 text-stone-400'
            }`}>
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

        {/* Puzzle picker panel */}
        {showPuzzles && (
          <div className="bg-stone-900/80 rounded-2xl border border-stone-700 p-5 mb-6">
            <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-4">
              Select a Puzzle — {PUZZLES.length} available
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {PUZZLES.map(p => (
                <button key={p.id} onClick={() => startPuzzle(p)}
                  className={`text-left px-3 py-2.5 rounded-lg border transition-colors hover:bg-stone-700/60 ${
                    activePuzzle?.id === p.id ? 'border-red-600 bg-red-900/20' : 'border-stone-700 bg-stone-800/40'
                  }`}>
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-xs font-bold text-stone-200 truncate">{p.title}</span>
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border shrink-0 ${DIFF_COLOR[p.difficulty]}`}>
                      {p.difficulty}
                    </span>
                  </div>
                  <div className="text-[10px] text-stone-600 font-mono truncate">{p.source}</div>
                </button>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-stone-800">
              <p className="text-[10px] text-stone-600 font-mono">
                Easy = longer text (more frequency data). Hard = shorter text (pattern recognition required).
              </p>
            </div>
          </div>
        )}

        {!ciphertext ? (
          <div className="text-center py-20">
            <p className="text-stone-500 text-lg mb-6">Choose a puzzle or paste your own ciphertext below.</p>
            <div className="flex justify-center gap-3 mb-8">
              <button onClick={randomPuzzle}
                className="px-8 py-4 rounded-xl font-bold text-lg bg-red-900/40 border border-red-700/60 text-red-300 hover:bg-red-800/40 transition-colors">
                <Shuffle size={18} className="inline mr-2" />Random Puzzle
              </button>
              <button onClick={() => setShowPuzzles(true)}
                className="px-8 py-4 rounded-xl font-bold text-lg bg-stone-800 border border-stone-700 text-stone-300 hover:bg-stone-700 transition-colors">
                Choose Puzzle
              </button>
            </div>
            <div className="max-w-xl mx-auto">
              <textarea
                placeholder="Or paste your own ciphertext here..."
                onChange={e => { if (e.target.value.trim()) useCustom(e.target.value.trim()); }}
                className="w-full h-28 bg-stone-900 border border-stone-700 rounded-xl p-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none text-stone-300 placeholder-stone-700"
                spellCheck={false}
              />
            </div>
          </div>
        ) : (
          <>
            {/* Active puzzle label */}
            {activePuzzle && (
              <div className="flex items-center gap-3 mb-4 px-1">
                <span className="text-[10px] text-stone-600 uppercase tracking-widest font-bold font-mono">Puzzle:</span>
                <span className="text-sm text-stone-300 font-bold">{activePuzzle.title}</span>
                <span className="text-[10px] text-stone-600 font-mono">— {activePuzzle.source}</span>
                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ml-auto shrink-0 ${DIFF_COLOR[activePuzzle.difficulty]}`}>
                  {activePuzzle.difficulty}
                </span>
              </div>
            )}

            {/* Ciphertext display */}
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
                  if (!isLetter) return <span key={i} className="text-stone-600">{ch === ' ' ? '\u00A0' : ch}</span>;
                  return (
                    <span key={i} onClick={() => !m?.locked && setSelectedCipher(isSelected ? null : u)}
                      className={`inline-flex flex-col items-center cursor-pointer px-[2px] rounded transition-all ${
                        isSelected ? 'bg-red-800/50 ring-1 ring-red-500'
                        : m?.locked ? 'bg-green-900/30'
                        : m?.plainLetter ? 'bg-stone-800/60 hover:bg-stone-700/60'
                        : 'hover:bg-stone-800/60'
                      }`}>
                      <span className={`text-[10px] leading-tight ${m?.plainLetter ? 'text-stone-600' : 'text-red-400'}`}>{ch}</span>
                      <span className={`text-sm leading-tight font-bold ${
                        m?.locked ? 'text-green-400' : m?.plainLetter ? 'text-amber-300' : 'text-stone-700'
                      }`}>{m?.plainLetter || '_'}</span>
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Assignment palette */}
            {selectedCipher && (
              <div className="bg-stone-900/80 rounded-2xl border border-red-800/50 p-5 mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-[10px] text-stone-500 uppercase tracking-widest font-bold">Assign plaintext for cipher letter</span>
                  <span className="text-lg font-mono font-bold text-red-400">{selectedCipher}</span>
                  <span className="text-stone-600 text-xs font-mono">
                    freq: {cipherFreqs[selectedCipher]?.toFixed(1)}%
                    (rank #{cipherByRank.indexOf(selectedCipher) + 1} → English rank #{cipherByRank.indexOf(selectedCipher) + 1} = {ENGLISH_BY_RANK[cipherByRank.indexOf(selectedCipher)] ?? '?'})
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {ALPHA.split('').map(pl => {
                    const isUsed    = usedPlain.has(pl) && mapping[selectedCipher]?.plainLetter !== pl;
                    const isCurrent = mapping[selectedCipher]?.plainLetter === pl;
                    return (
                      <button key={pl} onClick={() => assignLetter(selectedCipher, isCurrent ? '' : pl)}
                        className={`w-9 h-9 rounded text-sm font-mono font-bold border transition-all ${
                          isCurrent  ? 'bg-amber-700/50 border-amber-500 text-amber-200'
                          : isUsed   ? 'bg-stone-900 border-stone-800 text-stone-700 opacity-40'
                          : 'bg-stone-800 border-stone-700 text-stone-300 hover:bg-stone-700 hover:text-white'
                        }`}>
                        {pl}
                      </button>
                    );
                  })}
                  <button onClick={() => assignLetter(selectedCipher, '')}
                    className="px-3 h-9 rounded text-xs font-bold border bg-stone-800 border-stone-700 text-stone-500 hover:text-red-300 ml-2">
                    Clear
                  </button>
                </div>
              </div>
            )}

            {/* Decoded plaintext */}
            <div className="bg-stone-900/40 rounded-2xl border border-stone-800 p-5 mb-6">
              <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-3">Decoded Plaintext</div>
              <div className="font-mono text-lg tracking-wide text-amber-200/90 break-all leading-relaxed">
                {decodedText.split('').map((ch, i) => (
                  <span key={i} className={ch === '_' ? 'text-stone-700' : /[a-zA-Z]/.test(ch) ? 'text-amber-200' : 'text-stone-600'}>
                    {ch}
                  </span>
                ))}
              </div>
            </div>

            {/* ── Frequency Comparison (redesigned) ── */}
            <div className="bg-stone-900/60 rounded-2xl border border-stone-800 p-5 mb-6">
              <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-1">
                Frequency Comparison — Rank by Rank
              </div>
              <p className="text-[10px] text-stone-600 font-mono mb-4">
                Each row shows the cipher letter at that frequency rank alongside the English letter at the same rank.
                The most common cipher letter is probably <span className="text-green-400">E</span>, the second probably <span className="text-green-400">T</span>, and so on.
              </p>

              {/* Column headers */}
              <div className="grid grid-cols-[24px_1fr_52px_16px_24px_1fr_52px_80px] gap-x-2 items-center mb-2 px-1">
                <span className="text-[9px] text-red-400 font-bold font-mono uppercase text-center">Ciph.</span>
                <span className="text-[9px] text-red-400 font-bold font-mono uppercase">Ciphertext frequency</span>
                <span className="text-[9px] text-red-400 font-bold font-mono uppercase text-right">%</span>
                <span />
                <span className="text-[9px] text-green-400 font-bold font-mono uppercase text-center">Eng.</span>
                <span className="text-[9px] text-green-400 font-bold font-mono uppercase">English frequency</span>
                <span className="text-[9px] text-green-400 font-bold font-mono uppercase text-right">%</span>
                <span className="text-[9px] text-stone-600 font-bold font-mono uppercase text-center">Your guess</span>
              </div>

              <div className="space-y-[3px] max-h-[520px] overflow-y-auto pr-1">
                {cipherByRank.map((cipherLetter, rank) => {
                  const cFreq      = cipherFreqs[cipherLetter] || 0;
                  const engLetter  = ENGLISH_BY_RANK[rank] ?? '—';
                  const eFreq      = ENGLISH_FREQ[engLetter] || 0;
                  const mapped     = mapping[cipherLetter]?.plainLetter || '';
                  const isSelected = selectedCipher === cipherLetter;
                  const isLocked   = mapping[cipherLetter]?.locked;

                  return (
                    <div key={cipherLetter}
                      onClick={() => !isLocked && setSelectedCipher(isSelected ? null : cipherLetter)}
                      className={`grid grid-cols-[24px_1fr_52px_16px_24px_1fr_52px_80px] gap-x-2 items-center cursor-pointer rounded px-1 py-[3px] transition-colors ${
                        isSelected ? 'bg-red-900/30 ring-1 ring-red-800/60' : 'hover:bg-stone-800/50'
                      }`}>

                      {/* Cipher letter */}
                      <span className={`text-[12px] font-mono font-bold text-center ${
                        isSelected ? 'text-red-300' : 'text-red-400'
                      }`}>{cipherLetter}</span>

                      {/* Cipher bar */}
                      <div className="relative h-4 rounded overflow-hidden bg-stone-800/30">
                        <div className="absolute inset-y-0 left-0 bg-red-700/70 rounded transition-all"
                          style={{ width: `${(cFreq / maxFreq) * 100}%` }} />
                      </div>

                      {/* Cipher % */}
                      <span className="text-[10px] font-mono text-stone-500 text-right">{cFreq.toFixed(1)}%</span>

                      {/* Divider */}
                      <span className="text-stone-700 text-center font-mono text-xs">↔</span>

                      {/* English letter */}
                      <span className="text-[12px] font-mono font-bold text-green-400 text-center">{engLetter}</span>

                      {/* English bar */}
                      <div className="relative h-4 rounded overflow-hidden bg-stone-800/30">
                        <div className="absolute inset-y-0 left-0 bg-green-700/50 rounded transition-all"
                          style={{ width: `${(eFreq / maxFreq) * 100}%` }} />
                      </div>

                      {/* English % */}
                      <span className="text-[10px] font-mono text-stone-500 text-right">{eFreq.toFixed(1)}%</span>

                      {/* Current mapping */}
                      <div className="flex items-center justify-center gap-1">
                        {mapped ? (
                          <>
                            <span className={`text-[11px] font-mono font-bold ${isLocked ? 'text-green-400' : 'text-amber-300'}`}>
                              {cipherLetter}={mapped}
                            </span>
                            <button onClick={e => { e.stopPropagation(); toggleLock(cipherLetter); }}
                              className="text-stone-600 hover:text-green-400 transition-colors">
                              {isLocked ? <Lock size={9} /> : <Unlock size={9} />}
                            </button>
                          </>
                        ) : (
                          <span className="text-[10px] text-stone-700 font-mono">—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex gap-6 mt-3 pt-3 border-t border-stone-800/60 text-[10px] text-stone-600 font-mono">
                <span className="flex items-center gap-1.5"><span className="w-4 h-2.5 rounded bg-red-700/70 inline-block" />Ciphertext frequency</span>
                <span className="flex items-center gap-1.5"><span className="w-4 h-2.5 rounded bg-green-700/50 inline-block" />English expected frequency</span>
                <span className="flex items-center gap-1.5"><span className="text-amber-300 font-bold">X=Y</span> Your current mapping</span>
                <span className="flex items-center gap-1.5"><Lock size={9} className="text-green-400" /> Locked</span>
              </div>
            </div>

            {/* Mapping table */}
            <div className="bg-stone-900/60 rounded-2xl border border-stone-800 p-5 mb-6">
              <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-3">Current Mapping (A–Z)</div>
              {[ALPHA.slice(0, 13), ALPHA.slice(13)].map((half, row) => (
                <div key={row} className={`grid grid-cols-13 gap-[2px] ${row === 1 ? 'mt-2' : ''}`}>
                  {half.split('').map(ch => {
                    const m = mapping[ch];
                    return (
                      <div key={ch} className="flex flex-col items-center">
                        <button onClick={() => setSelectedCipher(selectedCipher === ch ? null : ch)}
                          className={`w-full aspect-square rounded text-[11px] font-mono font-bold border transition-all flex items-center justify-center ${
                            selectedCipher === ch ? 'bg-red-800/50 border-red-500 text-red-300'
                            : (cipherFreqs[ch] || 0) > 0 ? 'bg-stone-800 border-stone-700 text-red-400 hover:border-red-700'
                            : 'bg-stone-900 border-stone-800 text-stone-700'
                          }`}>{ch}</button>
                        <div className="text-[9px] text-stone-700 my-[1px]">↓</div>
                        <div className={`w-full aspect-square rounded text-[11px] font-mono font-bold border flex items-center justify-center ${
                          m?.locked ? 'bg-green-900/40 border-green-700/50 text-green-400'
                          : m?.plainLetter ? 'bg-amber-900/30 border-amber-700/50 text-amber-300'
                          : 'bg-stone-900 border-stone-800 text-stone-700'
                        }`}>{m?.plainLetter || '·'}</div>
                        {m?.plainLetter && (
                          <button onClick={() => toggleLock(ch)} className="mt-[2px] text-stone-600 hover:text-green-400 transition-colors">
                            {m.locked ? <Lock size={10} /> : <Unlock size={10} />}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* N-gram hints */}
            {showHints && (
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                {[
                  { label: 'Top Bigrams in Ciphertext', grams: topBigrams.slice(0, 15), ref: COMMON_BIGRAMS.slice(0, 15), refLabel: 'Common English Bigrams' },
                  { label: 'Top Trigrams in Ciphertext', grams: topTrigrams.slice(0, 12), ref: COMMON_TRIGRAMS.slice(0, 12), refLabel: 'Common English Trigrams' },
                ].map(({ label, grams, ref, refLabel }) => (
                  <div key={label} className="bg-stone-900/60 rounded-2xl border border-stone-800 p-5">
                    <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-3">{label}</div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {grams.map(([g, count]) => (
                        <span key={g} className="px-2 py-1 rounded text-xs font-mono font-bold bg-stone-800 border border-stone-700 text-red-300">
                          {g} <span className="text-stone-600">×{count}</span>
                        </span>
                      ))}
                    </div>
                    <div className="text-[10px] text-stone-600 font-bold mb-1">{refLabel}</div>
                    <div className="flex flex-wrap gap-1">
                      {ref.map(g => (
                        <span key={g} className="px-2 py-0.5 rounded text-[10px] font-mono bg-green-950/40 border border-green-800/40 text-green-400/70">{g}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* How to solve */}
            <div className="bg-stone-900/40 rounded-xl border border-stone-800 p-5">
              <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-3">How to Solve</div>
              <div className="grid sm:grid-cols-4 gap-4 text-xs text-stone-400">
                <div><div className="font-bold text-red-400 mb-1">1. Frequency Rank</div>
                  <p>The frequency chart shows each cipher letter aligned with the English letter at the same rank. Rank 1 cipher letter → probably E (12.7%). Use the ↔ comparison directly.</p></div>
                <div><div className="font-bold text-red-400 mb-1">2. Short Words</div>
                  <p>One-letter words = A or I. Three-letter = THE, AND, FOR. Double letters suggest SS, LL, EE, OO, TT. Look for common word patterns in the decoded text.</p></div>
                <div><div className="font-bold text-red-400 mb-1">3. N-grams</div>
                  <p>Enable N-gram Hints. The most common bigram is TH, trigram is THE. Match the top ciphertext n-grams against English norms to confirm letter guesses.</p></div>
                <div><div className="font-bold text-red-400 mb-1">4. Lock & Iterate</div>
                  <p>Lock confirmed mappings so they stay fixed. Each correct letter narrows the remaining choices. Use Undo to backtrack from wrong guesses without losing progress.</p></div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Info panel */}
      <div className={`fixed bottom-0 left-0 right-0 bg-stone-900/95 backdrop-blur border-t border-stone-700 p-6 transform transition-transform duration-300 z-40 ${showInfo ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="max-w-3xl mx-auto relative">
          <button onClick={() => setShowInfo(false)} className="absolute top-0 right-0 p-2 text-stone-500 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <h3 className="text-xl font-bold text-red-400 mb-2">About Substitution Cipher Cryptanalysis</h3>
          <p className="text-sm text-stone-300 leading-relaxed mb-3">
            A <strong>simple substitution cipher</strong> replaces each letter with exactly one other letter consistently throughout the message.
            With 26! (≈ 4 × 10²⁶) possible keys, brute force is impossible — but <strong>frequency analysis</strong>, first described by
            <strong> Al-Kindi</strong> around <strong>850 AD</strong>, makes them solvable by hand in minutes.
          </p>
          <p className="text-sm text-stone-300 leading-relaxed mb-3">
            The key insight: letter frequencies are preserved through substitution. In English, E appears ~12.7% of the time.
            If cipher letter X appears 12.5% of the time, it likely maps to E. The frequency chart on this page aligns each
            cipher letter with the English letter at the same rank, making this matching process direct and visual.
          </p>
          <p className="text-sm text-stone-300 leading-relaxed">
            Combined with bigram/trigram analysis and pattern recognition, most substitution ciphers can be broken in under
            ten minutes. This technique was used by codebreakers for over a thousand years before polyalphabetic ciphers
            (like the Vigenère) temporarily defeated it in the 16th century.
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
