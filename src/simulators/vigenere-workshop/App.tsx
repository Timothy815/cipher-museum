import React, { useState, useMemo, useCallback } from 'react';
import { Swords, Info, X, Check, Copy, ChevronRight, Lightbulb, Lock, ShieldQuestion, BookOpen, Shuffle } from 'lucide-react';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const ENGLISH_FREQ: number[] = [
  8.167, 1.492, 2.782, 4.253, 12.702, 2.228, 2.015, 6.094, 6.966, 0.153,
  0.772, 4.025, 2.406, 6.749, 7.507, 1.929, 0.095, 5.987, 6.327, 9.056,
  2.758, 0.978, 2.360, 0.150, 1.974, 0.074,
];

const DEMO_PLAINTEXT =
  'THE VIGENERE CIPHER WAS LONG CONSIDERED UNBREAKABLE AND WAS KNOWN AS LE CHIFFRE INDECHIFFRABLE FOR NEARLY THREE HUNDRED YEARS UNTIL CHARLES BABBAGE AND FRIEDRICH KASISKI INDEPENDENTLY DISCOVERED METHODS TO CRACK IT USING REPEATED SEQUENCES AND FREQUENCY ANALYSIS';
const DEMO_KEY = 'KASISKI';

// ── Challenge library ────────────────────────────────────────────────

interface Challenge {
  id: number;
  title: string;
  source: string;
  difficulty: 'easy' | 'medium' | 'hard';
  text: string;
}

// Word keys by difficulty — chosen so that key length is discoverable via Kasiski
const EASY_KEYS   = ['LEMON', 'RIVER', 'STONE', 'FLAME', 'OCEAN'];
const MEDIUM_KEYS = ['BABBAGE', 'ENIGMA', 'NEWTON', 'DARWIN', 'CAESAR'];
const HARD_KEYS   = ['KASISKI', 'FREQUENCY', 'BLETCHLEY', 'POLYMATH', 'COINCIDE'];

const CHALLENGES: Challenge[] = [
  {
    id: 1, difficulty: 'easy', title: 'The Gettysburg Address',
    source: 'Abraham Lincoln, 1863',
    text: 'FOUR SCORE AND SEVEN YEARS AGO OUR FATHERS BROUGHT FORTH ON THIS CONTINENT A NEW NATION CONCEIVED IN LIBERTY AND DEDICATED TO THE PROPOSITION THAT ALL MEN ARE CREATED EQUAL NOW WE ARE ENGAGED IN A GREAT CIVIL WAR TESTING WHETHER THAT NATION OR ANY NATION SO CONCEIVED AND SO DEDICATED CAN LONG ENDURE',
  },
  {
    id: 2, difficulty: 'easy', title: 'Sherlock Holmes',
    source: 'Arthur Conan Doyle, A Study in Scarlet, 1887',
    text: 'WHEN YOU HAVE ELIMINATED THE IMPOSSIBLE WHATEVER REMAINS HOWEVER IMPROBABLE MUST BE THE TRUTH THE WORLD IS FULL OF OBVIOUS THINGS WHICH NOBODY BY ANY CHANCE EVER OBSERVES IT IS A CAPITAL MISTAKE TO THEORIZE BEFORE ONE HAS DATA',
  },
  {
    id: 3, difficulty: 'easy', title: 'Declaration of Independence',
    source: 'Thomas Jefferson, 1776',
    text: 'WE HOLD THESE TRUTHS TO BE SELF EVIDENT THAT ALL MEN ARE CREATED EQUAL THAT THEY ARE ENDOWED BY THEIR CREATOR WITH CERTAIN UNALIENABLE RIGHTS THAT AMONG THESE ARE LIFE LIBERTY AND THE PURSUIT OF HAPPINESS THAT TO SECURE THESE RIGHTS GOVERNMENTS ARE INSTITUTED AMONG MEN',
  },
  {
    id: 4, difficulty: 'easy', title: 'The Art of War',
    source: 'Sun Tzu, ca. 500 BCE',
    text: 'IF YOU KNOW THE ENEMY AND KNOW YOURSELF YOU NEED NOT FEAR THE RESULT OF A HUNDRED BATTLES IF YOU KNOW YOURSELF BUT NOT THE ENEMY FOR EVERY VICTORY GAINED YOU WILL ALSO SUFFER A DEFEAT IF YOU KNOW NEITHER THE ENEMY NOR YOURSELF YOU WILL SUCCUMB IN EVERY BATTLE',
  },
  {
    id: 5, difficulty: 'easy', title: 'Benjamin Franklin on Secrets',
    source: 'Benjamin Franklin, Poor Richard\'s Almanack, 1735',
    text: 'THREE MAY KEEP A SECRET IF TWO OF THEM ARE DEAD A SECRET BETWEEN TWO PEOPLE IS NO LONGER A SECRET BETWEEN THREE IT IS A RUMOUR BETWEEN MORE IT IS COMMON KNOWLEDGE THE ONLY SECRET A MAN CAN KEEP IS THE ONE HE KNOWS ALONE',
  },
  {
    id: 6, difficulty: 'easy', title: 'To Be or Not to Be',
    source: 'William Shakespeare, Hamlet, 1603',
    text: 'TO BE OR NOT TO BE THAT IS THE QUESTION WHETHER IT IS NOBLER IN THE MIND TO SUFFER THE SLINGS AND ARROWS OF OUTRAGEOUS FORTUNE OR TO TAKE ARMS AGAINST A SEA OF TROUBLES AND BY OPPOSING END THEM TO DIE TO SLEEP NO MORE',
  },
  {
    id: 7, difficulty: 'medium', title: 'Alan Turing on Intelligence',
    source: 'Alan Turing, Computing Machinery and Intelligence, 1950',
    text: 'I PROPOSE TO CONSIDER THE QUESTION CAN MACHINES THINK THE ORIGINAL QUESTION WHETHER A MACHINE CAN THINK IS TOO MEANINGLESS TO DESERVE DISCUSSION A COMPUTER WOULD DESERVE TO BE CALLED INTELLIGENT IF IT COULD DECEIVE A HUMAN INTO BELIEVING THAT IT WAS HUMAN WE CAN ONLY SEE A SHORT DISTANCE AHEAD BUT WE CAN SEE PLENTY THERE THAT NEEDS TO BE DONE',
  },
  {
    id: 8, difficulty: 'medium', title: 'Kerckhoffs\'s Principle',
    source: 'Auguste Kerckhoffs, La Cryptographie Militaire, 1883',
    text: 'A CRYPTOSYSTEM SHOULD BE SECURE EVEN IF EVERYTHING ABOUT THE SYSTEM EXCEPT THE KEY IS PUBLIC KNOWLEDGE THE ENEMY KNOWS THE SYSTEM SECURITY MUST DEPEND ON THE KEY ALONE A CIPHER IS BROKEN WHEN THE CRYPTANALYST CAN DECIPHER MESSAGES WITHOUT KNOWLEDGE OF THE KEY REGARDLESS OF HOW COMPLEX THE ALGORITHM APPEARS',
  },
  {
    id: 9, difficulty: 'medium', title: 'Shannon on Secrecy',
    source: 'Claude Shannon, Communication Theory of Secrecy Systems, 1949',
    text: 'THE ENEMY KNOWS THE SYSTEM ANY SECRECY MUST RESIDE IN THE KEY A SYSTEM MAY BE CALLED THEORETICALLY UNBREAKABLE WHEN THE ENEMY EVEN WITH UNLIMITED TIME AND RESOURCES CANNOT DECIPHER IT THE AMOUNT OF INFORMATION IN THE KEY MUST BE AT LEAST AS GREAT AS THE AMOUNT OF INFORMATION IN THE MESSAGE',
  },
  {
    id: 10, difficulty: 'medium', title: 'Newton\'s Laws of Motion',
    source: 'Isaac Newton, Principia Mathematica, 1687',
    text: 'EVERY BODY CONTINUES IN ITS STATE OF REST OR UNIFORM MOTION IN A STRAIGHT LINE UNLESS IT IS COMPELLED TO CHANGE THAT STATE BY FORCES IMPRESSED UPON IT THE CHANGE OF MOTION IS PROPORTIONAL TO THE MOTIVE FORCE IMPRESSED AND TAKES PLACE ALONG THE LINE IN WHICH THAT FORCE IS IMPRESSED TO EVERY ACTION THERE IS ALWAYS OPPOSED AN EQUAL REACTION',
  },
  {
    id: 11, difficulty: 'medium', title: 'The Enigma Machine',
    source: 'David Kahn, The Codebreakers, 1967',
    text: 'THE ENIGMA MACHINE COMBINED THREE ROTORS A PLUGBOARD AND A REFLECTOR TO CREATE A CIPHER OF STAGGERING COMPLEXITY THE ROTORS STEPPED WITH EACH KEYSTROKE SO THAT THE SAME LETTER PRESSED TWICE IN SUCCESSION WOULD PRODUCE TWO DIFFERENT CIPHERTEXT LETTERS THE GERMAN HIGH COMMAND BELIEVED THE SYSTEM WAS MATHEMATICALLY UNBREAKABLE',
  },
  {
    id: 12, difficulty: 'medium', title: 'Julius Caesar on the Rubicon',
    source: 'Suetonius, Lives of the Twelve Caesars, ca. 121 CE',
    text: 'CAESAR DROVE ON WITH HIS TROOPS AND WHEN HE REACHED THE RUBICON HE PAUSED FOR HE WELL KNEW THE LAWS OF ROME FORBADE ANY GENERAL TO CROSS THAT RIVER UNDER ARMS THEN LOOKING ACROSS THE STREAM HE SAID THE DIE IS CAST AND HE CROSSED INTO GAUL WITH ALL HIS LEGIONS BEHIND HIM',
  },
  {
    id: 13, difficulty: 'hard', title: 'The Black Chamber',
    source: 'Herbert O. Yardley, The American Black Chamber, 1931',
    text: 'STATESMEN AND DIPLOMATS OF EVERY NATION WERE COMMUNICATING WITH EACH OTHER BY CODE AND CIPHER IN THE BELIEF THAT THEIR SECRETS WERE INVIOLATE THE AMERICAN BLACK CHAMBER HAD PENETRATED THE CODES OF TWENTY COUNTRIES THE JAPANESE DIPLOMATIC CODE WAS BROKEN IN NINETEEN TWENTY AND ITS CONTENTS LAID BEFORE THE AMERICAN DELEGATION AT THE WASHINGTON NAVAL CONFERENCE THE JAPANESE NEVER SUSPECTED THAT THEIR MOST SECRET COMMUNICATIONS HAD BEEN READ BY THEIR ADVERSARIES',
  },
  {
    id: 14, difficulty: 'hard', title: 'Al-Kindi on Cryptanalysis',
    source: 'Al-Kindi, A Manuscript on Deciphering Cryptographic Messages, ca. 850 CE',
    text: 'ONE WAY TO SOLVE AN ENCRYPTED MESSAGE IS TO FIND A PLAINTEXT OF THE SAME LANGUAGE LONG ENOUGH TO FILL ONE SHEET AND THEN COUNT EACH LETTER THE MOST FREQUENT LETTER IS PROBABLY THE MOST COMMON IN THAT TONGUE CALL THIS LETTER THE FIRST AND SO ON UNTIL YOU HAVE ACCOUNTED FOR ALL THE LETTERS IN THE CRYPTOGRAM THEN OBSERVE THE CRYPTOGRAM YOU WISH TO SOLVE AND CLASSIFY ITS SYMBOLS BY FREQUENCY AND REPLACE THE MOST COMMON SYMBOL WITH THE FIRST LETTER OF THE PLAINTEXT ALPHABET',
  },
  {
    id: 15, difficulty: 'hard', title: 'Bletchley Park',
    source: 'F. H. Hinsley, British Intelligence in the Second World War, 1979',
    text: 'THE WORK DONE AT BLETCHLEY PARK SHORTENED THE WAR IN EUROPE BY NOT LESS THAN TWO YEARS AND PROBABLY BY FOUR YEARS WITHOUT IT THE OUTCOME OF THE WAR AGAINST GERMANY WOULD AT LEAST HAVE BEEN IN DOUBT THE TOTAL NUMBER OF MESSAGES DECODED EXCEEDED TWO HUNDRED MILLION BY THE WAR\'S END THE PARK EMPLOYED NEARLY NINE THOUSAND PEOPLE AT ITS PEAK INCLUDING MATHEMATICIANS LINGUISTS CHESS CHAMPIONS AND CROSSWORD ENTHUSIASTS ALL SWORN TO ABSOLUTE SECRECY',
  },
  {
    id: 16, difficulty: 'hard', title: 'Friedman on the Index of Coincidence',
    source: 'William F. Friedman, The Index of Coincidence, 1922',
    text: 'CRYPTANALYSIS IS THE SCIENCE OF RECOVERING THE PLAINTEXT OF A MESSAGE WITHOUT KNOWLEDGE OF THE KEY IT IS FUNDAMENTALLY A PROBLEM IN APPLIED PROBABILITY AND STATISTICS THE CRYPTANALYST MUST EXPLOIT EVERY STRUCTURAL REGULARITY IN LANGUAGE LETTER FREQUENCIES DIGRAPH FREQUENCIES WORD PATTERNS AND GRAMMATICAL CONSTRAINTS THE INDEX OF COINCIDENCE MEASURES HOW UNEVEN THE LETTER DISTRIBUTION IS IN A SAMPLE OF TEXT AND CAN BE USED TO DISTINGUISH A MONOALPHABETIC FROM A POLYALPHABETIC CIPHER',
  },
  {
    id: 17, difficulty: 'hard', title: 'The Venona Project',
    source: 'Robert Louis Benson, The Venona Story, NSA, 1996',
    text: 'THE VENONA PROJECT BEGAN IN NINETEEN FORTY THREE WHEN AMERICAN CRYPTANALYSTS NOTICED THAT SOME SOVIET DIPLOMATIC TRAFFIC WAS ENCIPHERED USING ONE TIME PADS WHOSE PAGES HAD BEEN DUPLICATED IN VIOLATION OF THE FUNDAMENTAL RULE THIS REUSE CREATED STATISTICAL REGULARITIES THAT PERMITTED PARTIAL RECONSTRUCTION OF MORE THAN TWO THOUSAND MESSAGES EXCHANGED BETWEEN MOSCOW AND ITS AGENTS OPERATING INSIDE THE UNITED STATES GOVERNMENT THE PROJECT REMAINED CLASSIFIED UNTIL NINETEEN NINETY FIVE',
  },
  {
    id: 18, difficulty: 'hard', title: 'Babbage and the Vigenère',
    source: 'Simon Singh, The Code Book, 1999',
    text: 'CHARLES BABBAGE CRACKED THE VIGENERE CIPHER AROUND EIGHTEEN FIFTY FOUR BUT NEVER PUBLISHED HIS WORK SOME HISTORIANS BELIEVE HE WAS ASKED TO KEEP HIS METHOD SECRET BY BRITISH MILITARY INTELLIGENCE WHICH WISHED TO EXPLOIT THE TECHNIQUE AGAINST RUSSIAN COMMUNICATIONS DURING THE CRIMEAN WAR NINE YEARS LATER FRIEDRICH KASISKI INDEPENDENTLY PUBLISHED THE SAME ATTACK AND RECEIVED ALL THE CREDIT IN THE SCIENTIFIC LITERATURE THE KEY INSIGHT WAS THAT REPEATED PLAINTEXT FRAGMENTS ENCRYPTED BY THE SAME PORTION OF THE KEY PRODUCE IDENTICAL CIPHERTEXT TRIGRAMS',
  },
  {
    id: 19, difficulty: 'hard', title: 'The Voynich Manuscript',
    source: 'Mary E. D\'Imperio, The Voynich Manuscript: An Elegant Enigma, 1978',
    text: 'THE VOYNICH MANUSCRIPT HAS DEFIED EVERY ATTEMPT AT DECIPHERMENT SINCE ITS REDISCOVERY IN NINETEEN TWELVE ITS VELLUM HAS BEEN DATED TO THE EARLY FIFTEENTH CENTURY THE SCRIPT PROCEEDS LEFT TO RIGHT WITH CONSISTENT WORD AND LETTER FREQUENCIES SUGGESTING A GENUINE UNDERLYING LANGUAGE OR CODE RATHER THAN RANDOM INVENTION YET NO CRYPTANALYST HAS EXTRACTED A SINGLE CONFIRMED WORD OF MEANING DESPITE EFFORTS BY THE MOST ACCOMPLISHED CODEBREAKERS OF THE TWENTIETH CENTURY INCLUDING VETERANS OF BLETCHLEY PARK AND THE NATIONAL SECURITY AGENCY',
  },
  {
    id: 20, difficulty: 'hard', title: 'Ada Lovelace on Computation',
    source: 'Ada Lovelace, Notes on the Analytical Engine, 1843',
    text: 'THE ANALYTICAL ENGINE HAS NO PRETENSIONS TO ORIGINATE ANYTHING IT CAN DO WHATEVER WE KNOW HOW TO ORDER IT TO PERFORM IT CAN FOLLOW ANALYSIS BUT IT HAS NO POWER OF ANTICIPATING ANY ANALYTICAL REVELATIONS OR TRUTHS ITS PROVINCE IS TO ASSIST US IN MAKING AVAILABLE WHAT WE ARE ALREADY ACQUAINTED WITH THIS IT WILL DO WITH EXTRAORDINARY FACILITY AND SPEED THE ENGINE MIGHT ACT UPON OTHER THINGS BESIDES NUMBER WERE OBJECTS FOUND WHOSE MUTUAL FUNDAMENTAL RELATIONS COULD BE EXPRESSED BY THOSE OF THE ABSTRACT SCIENCE OF OPERATIONS',
  },
];

// ── Vigenère helpers ─────────────────────────────────────────────────

function vigenereEncrypt(plain: string, key: string): string {
  const k = key.toUpperCase().replace(/[^A-Z]/g, '');
  if (!k.length) return plain.toUpperCase().replace(/[^A-Z]/g, '');
  let ki = 0;
  return plain
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .split('')
    .map((c) => {
      const shift = k.charCodeAt(ki % k.length) - 65;
      ki++;
      return ALPHABET[(c.charCodeAt(0) - 65 + shift) % 26];
    })
    .join('');
}

function vigenereDecrypt(cipher: string, key: string): string {
  const k = key.toUpperCase().replace(/[^A-Z]/g, '');
  if (!k.length) return cipher;
  return cipher
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .split('')
    .map((c, i) => {
      const shift = k.charCodeAt(i % k.length) - 65;
      return ALPHABET[(c.charCodeAt(0) - 65 - shift + 26) % 26];
    })
    .join('');
}

// ── Kasiski helpers ──────────────────────────────────────────────────

function findRepeatedSequences(
  text: string,
  minLen: number,
  maxLen: number,
): { seq: string; positions: number[]; spacings: number[] }[] {
  const seen = new Map<string, number[]>();
  for (let len = minLen; len <= maxLen; len++) {
    for (let i = 0; i <= text.length - len; i++) {
      const seq = text.slice(i, i + len);
      if (!seen.has(seq)) {
        const positions: number[] = [];
        let pos = text.indexOf(seq);
        while (pos !== -1) {
          positions.push(pos);
          pos = text.indexOf(seq, pos + 1);
        }
        if (positions.length >= 2) seen.set(seq, positions);
      }
    }
  }
  return [...seen.entries()]
    .filter(([, p]) => p.length >= 2)
    .map(([seq, positions]) => {
      const spacings: number[] = [];
      for (let i = 1; i < positions.length; i++) spacings.push(positions[i] - positions[0]);
      return { seq, positions, spacings };
    })
    .sort((a, b) => b.seq.length - a.seq.length || b.positions.length - a.positions.length)
    .slice(0, 30);
}

function getFactors(n: number): number[] {
  const factors: number[] = [];
  for (let f = 2; f <= 20 && f <= n; f++) {
    if (n % f === 0) factors.push(f);
  }
  return factors;
}

// ── Frequency / chi-squared ──────────────────────────────────────────

function letterCounts(text: string): number[] {
  const counts = new Array(26).fill(0);
  for (const c of text) {
    const idx = c.charCodeAt(0) - 65;
    if (idx >= 0 && idx < 26) counts[idx]++;
  }
  return counts;
}

function chiSquared(counts: number[], shift: number): number {
  const N = counts.reduce((a, b) => a + b, 0);
  if (N === 0) return Infinity;
  let chi = 0;
  for (let i = 0; i < 26; i++) {
    const observed = counts[(i + shift) % 26];
    const expected = (ENGLISH_FREQ[i] / 100) * N;
    if (expected > 0) chi += Math.pow(observed - expected, 2) / expected;
  }
  return chi;
}

function bestShift(counts: number[]): number {
  let best = 0;
  let bestChi = Infinity;
  for (let s = 0; s < 26; s++) {
    const c = chiSquared(counts, s);
    if (c < bestChi) {
      bestChi = c;
      best = s;
    }
  }
  return best;
}

function pickRandomKey(difficulty: Challenge['difficulty']): string {
  const pool = difficulty === 'easy' ? EASY_KEYS : difficulty === 'medium' ? MEDIUM_KEYS : HARD_KEYS;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── Step indicator ───────────────────────────────────────────────────

const STEPS = ['Input', 'Kasiski', 'Frequency', 'Result'];

const StepIndicator: React.FC<{ current: number }> = ({ current }) => (
  <div className="flex items-center gap-2 mb-8">
    {STEPS.map((label, i) => (
      <React.Fragment key={label}>
        {i > 0 && <ChevronRight size={14} className="text-slate-700" />}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            i === current
              ? 'bg-red-950/50 text-red-400 border border-red-700/50'
              : i < current
                ? 'text-green-400 border border-green-900/40 bg-green-950/20'
                : 'text-slate-600 border border-slate-800'
          }`}
        >
          {i < current && <Check size={12} />}
          <span>{label}</span>
        </div>
      </React.Fragment>
    ))}
  </div>
);

const DIFF_COLOR = {
  easy:   'text-green-400 border-green-800/50 bg-green-950/20',
  medium: 'text-amber-400 border-amber-800/50 bg-amber-950/20',
  hard:   'text-red-400 border-red-800/50 bg-red-950/20',
};

// ── Main component ───────────────────────────────────────────────────

const VigenereWorkshopApp: React.FC = () => {
  const [showInfo, setShowInfo] = useState(false);
  const [step, setStep] = useState(0);

  // Step 0 state
  const [inputMode, setInputMode] = useState<'encrypt' | 'paste' | 'challenge'>('encrypt');
  const [plaintext, setPlaintext] = useState(DEMO_PLAINTEXT);
  const [encryptKey, setEncryptKey] = useState(DEMO_KEY);
  const [pastedCipher, setPastedCipher] = useState('');

  // Challenge mode state
  const [showChallengePicker, setShowChallengePicker] = useState(false);
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [secretKey, setSecretKey] = useState('');
  const [revealKey, setRevealKey] = useState(false);

  // Step 1 state
  const [selectedKeyLen, setSelectedKeyLen] = useState<number | null>(null);

  // Step 2 state
  const [activePos, setActivePos] = useState(0);
  const [shifts, setShifts] = useState<(number | null)[]>([]);
  const [locked, setLocked] = useState<boolean[]>([]);

  const encryptedText = useMemo(
    () => (inputMode === 'encrypt' ? vigenereEncrypt(plaintext, encryptKey) : ''),
    [plaintext, encryptKey, inputMode],
  );

  const challengeCiphertext = useMemo(() => {
    if (inputMode !== 'challenge' || !activeChallenge || !secretKey) return '';
    return vigenereEncrypt(activeChallenge.text, secretKey);
  }, [inputMode, activeChallenge, secretKey]);

  const ciphertext =
    inputMode === 'encrypt' ? encryptedText
    : inputMode === 'challenge' ? challengeCiphertext
    : pastedCipher.toUpperCase().replace(/[^A-Z]/g, '');

  // Kasiski analysis
  const kasiskiResults = useMemo(() => findRepeatedSequences(ciphertext, 3, 5), [ciphertext]);

  const factorFreq = useMemo(() => {
    const freq: Record<number, number> = {};
    for (let f = 2; f <= 20; f++) freq[f] = 0;
    for (const r of kasiskiResults) {
      for (const sp of r.spacings) {
        for (const f of getFactors(sp)) freq[f]++;
      }
    }
    return freq;
  }, [kasiskiResults]);

  const maxFactorCount = Math.max(...Object.values(factorFreq), 1);
  const topFactor = useMemo(() => {
    let bestF = 0;
    let bestC = 0;
    for (const [fStr, c] of Object.entries(factorFreq)) {
      const f = Number(fStr);
      if (c > bestC) { bestF = f; bestC = c; }
    }
    return bestF;
  }, [factorFreq]);

  // Column splitting for step 2
  const columns = useMemo(() => {
    if (!selectedKeyLen) return [];
    const cols: string[] = Array(selectedKeyLen).fill('');
    for (let i = 0; i < ciphertext.length; i++) {
      cols[i % selectedKeyLen] += ciphertext[i];
    }
    return cols;
  }, [ciphertext, selectedKeyLen]);

  const columnCounts = useMemo(() => columns.map((col) => letterCounts(col)), [columns]);

  // Recovered key
  const recoveredKey = useMemo(
    () => shifts.map((s, i) => (s !== null && locked[i] ? ALPHABET[s] : '?')).join(''),
    [shifts, locked],
  );

  const allLocked = locked.length > 0 && locked.every(Boolean);

  // Decrypted text
  const decryptedText = useMemo(() => {
    if (!allLocked || !selectedKeyLen) return '';
    const key = shifts.map((s) => ALPHABET[s!]).join('');
    return vigenereDecrypt(ciphertext, key);
  }, [allLocked, shifts, ciphertext, selectedKeyLen]);

  // Partial decrypt for preview
  const partialDecrypt = useMemo(() => {
    if (!selectedKeyLen) return '';
    return ciphertext
      .split('')
      .map((c, i) => {
        const pos = i % selectedKeyLen;
        if (locked[pos] && shifts[pos] !== null) {
          return ALPHABET[(c.charCodeAt(0) - 65 - shifts[pos]! + 26) % 26];
        }
        return '\u00B7';
      })
      .join('');
  }, [ciphertext, selectedKeyLen, shifts, locked]);

  // Challenge: start with a specific challenge
  const startChallenge = useCallback((challenge: Challenge) => {
    const key = pickRandomKey(challenge.difficulty);
    setActiveChallenge(challenge);
    setSecretKey(key);
    setRevealKey(false);
    setShowChallengePicker(false);
  }, []);

  const randomChallenge = useCallback(() => {
    const c = CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)];
    startChallenge(c);
  }, [startChallenge]);

  // Transition to step 1
  const startCracking = useCallback(() => {
    if (ciphertext.length < 20) return;
    setRevealKey(false);
    setStep(1);
    setSelectedKeyLen(null);
  }, [ciphertext]);

  // Transition to step 2
  const confirmKeyLength = useCallback(() => {
    if (!selectedKeyLen) return;
    setShifts(new Array(selectedKeyLen).fill(null));
    setLocked(new Array(selectedKeyLen).fill(false));
    setActivePos(0);
    setStep(2);
  }, [selectedKeyLen]);

  // Set shift for active position
  const setShiftAt = useCallback(
    (val: number) => {
      setShifts((prev) => {
        const next = [...prev];
        next[activePos] = val;
        return next;
      });
    },
    [activePos],
  );

  const lockPosition = useCallback(() => {
    setLocked((prev) => {
      const next = [...prev];
      next[activePos] = true;
      return next;
    });
    if (selectedKeyLen) {
      for (let i = 1; i < selectedKeyLen; i++) {
        const nextPos = (activePos + i) % selectedKeyLen;
        if (!locked[nextPos]) {
          setActivePos(nextPos);
          break;
        }
      }
    }
  }, [activePos, locked, selectedKeyLen]);

  const autoHint = useCallback(() => {
    if (!columnCounts[activePos]) return;
    const best = bestShift(columnCounts[activePos]);
    setShiftAt(best);
  }, [activePos, columnCounts, setShiftAt]);

  const [copied, setCopied] = useState(false);
  const copyResult = useCallback(() => {
    navigator.clipboard.writeText(decryptedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [decryptedText]);

  // Current shift chi-squared for active position
  const currentChi = useMemo(() => {
    if (!columnCounts[activePos] || shifts[activePos] === null) return null;
    return chiSquared(columnCounts[activePos], shifts[activePos]!);
  }, [columnCounts, activePos, shifts]);

  const matchQuality = currentChi === null ? null : currentChi < 30 ? 'great' : currentChi < 60 ? 'good' : currentChi < 120 ? 'fair' : 'poor';

  const activeMaxCount = useMemo(() => {
    if (!columnCounts[activePos]) return 1;
    return Math.max(...columnCounts[activePos], 1);
  }, [columnCounts, activePos]);

  const maxEnglishFreq = Math.max(...ENGLISH_FREQ);

  // Challenge result comparison
  const challengeSuccess = inputMode === 'challenge' && allLocked && recoveredKey === secretKey;
  const challengePartial = inputMode === 'challenge' && allLocked && recoveredKey !== secretKey && recoveredKey.length === secretKey.length;

  const resetAll = useCallback(() => {
    setStep(0);
    setSelectedKeyLen(null);
    setShifts([]);
    setLocked([]);
    setRevealKey(false);
  }, []);

  return (
    <div className="flex-1 bg-[#1a1814] text-stone-200 flex flex-col items-center px-6 py-8 sm:px-10 md:px-16">
      <div className="w-full max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-950/60 border border-red-700/50 flex items-center justify-center text-red-400">
              <Swords size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">VIGENERE CRACKING WORKSHOP</h1>
              <p className="text-sm text-slate-500 font-mono">KASISKI EXAMINATION &amp; FREQUENCY MATCHING</p>
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
            <h3 className="text-red-400 font-bold mb-2">Breaking "le chiffre indechiffrable"</h3>
            <p className="mb-3">
              The Vigenere cipher resisted cryptanalysis for nearly three centuries, earning its reputation as "the
              indecipherable cipher." Two men independently cracked it:{' '}
              <strong className="text-white">Charles Babbage</strong> (~1854, unpublished) and{' '}
              <strong className="text-white">Friedrich Kasiski</strong> (1863, published in{' '}
              <em>Die Geheimschriften und die Dechiffrir-Kunst</em>).
            </p>
            <p className="mb-3">
              <strong className="text-white">The Kasiski Examination:</strong> When the same plaintext fragment is
              encrypted by the same portion of the key, it produces identical ciphertext. By finding repeated sequences
              and measuring spacings between them, we can deduce the key length — the spacings will all be multiples of
              the key length.
            </p>
            <p className="mb-3">
              Once the key length is known, the polyalphabetic cipher collapses into several independent Caesar ciphers,
              each solvable by frequency analysis. This workshop lets you perform both steps interactively.
            </p>
            <p className="text-slate-500 text-xs">
              Reference: Simon Singh, <em>The Code Book</em>, Chapter 2: "Le Chiffre Indechiffrable"
            </p>
          </div>
        )}

        <StepIndicator current={step} />

        {/* ═══════════ STEP 0: INPUT ═══════════ */}
        {step === 0 && (
          <div className="space-y-6">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              {/* Mode tabs */}
              <div className="flex items-center gap-2 mb-5 flex-wrap">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">Mode</label>
                {([
                  { id: 'encrypt',   label: 'Encrypt & Crack',  icon: null },
                  { id: 'paste',     label: 'Paste Ciphertext', icon: null },
                  { id: 'challenge', label: 'Challenge Mode',   icon: <ShieldQuestion size={12} /> },
                ] as const).map(({ id, label, icon }) => (
                  <button
                    key={id}
                    onClick={() => setInputMode(id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                      inputMode === id
                        ? 'bg-red-950/50 text-red-400 border border-red-700/50'
                        : 'text-slate-500 hover:text-white border border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    {icon}
                    {label}
                  </button>
                ))}
                <button
                  onClick={() => {
                    setInputMode('encrypt');
                    setPlaintext(DEMO_PLAINTEXT);
                    setEncryptKey(DEMO_KEY);
                  }}
                  className="text-[10px] px-2 py-1 rounded border border-slate-700 text-slate-500 hover:text-red-400 hover:border-red-700/50 transition-colors ml-auto"
                >
                  Load Demo
                </button>
              </div>

              {/* ── Encrypt & Crack mode ── */}
              {inputMode === 'encrypt' && (
                <>
                  <div className="mb-4">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Plaintext <span className="text-slate-600 font-normal normal-case">— type your own or use the demo</span>
                    </label>
                    <textarea
                      value={plaintext}
                      onChange={(e) => setPlaintext(e.target.value)}
                      className="bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-red-700/50 w-full h-24 resize-none"
                      placeholder="Type your own plaintext message here..."
                    />
                  </div>
                  <div className="flex items-center gap-4 mb-4 flex-wrap">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Key <span className="text-slate-600 font-normal normal-case">— type any word</span>
                    </label>
                    <input
                      value={encryptKey}
                      onChange={(e) => setEncryptKey(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
                      className="bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-2 font-mono text-sm text-white focus:outline-none focus:border-red-700/50 w-48"
                      placeholder="e.g. SECRET"
                    />
                    <div className="flex flex-wrap gap-1">
                      {['LEMON', 'SECRET', 'KASISKI', 'CRYPTO', 'BABBAGE', 'ENIGMA'].map((k) => (
                        <button
                          key={k}
                          onClick={() => setEncryptKey(k)}
                          className={`px-2 py-1 text-[10px] font-mono rounded border transition-colors ${
                            encryptKey === k
                              ? 'border-red-700/50 text-red-400 bg-red-950/30'
                              : 'border-slate-700 text-slate-500 hover:text-white'
                          }`}
                        >
                          {k}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Ciphertext{' '}
                      <span className="text-slate-600 font-normal">
                        (key: &ldquo;{encryptKey}&rdquo;)
                      </span>
                    </label>
                    <div className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-3 font-mono text-sm text-red-300 min-h-[3rem] break-all leading-relaxed">
                      {encryptedText || (
                        <span className="text-slate-600">Encrypted text appears here...</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-600 mt-1">{ciphertext.length} letters</div>
                  </div>
                </>
              )}

              {/* ── Paste mode ── */}
              {inputMode === 'paste' && (
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Ciphertext <span className="text-slate-600 font-normal normal-case">— paste any Vigenère-encrypted text</span>
                  </label>
                  <textarea
                    value={pastedCipher}
                    onChange={(e) => setPastedCipher(e.target.value)}
                    className="bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-red-700/50 w-full h-32 resize-none"
                    placeholder="Paste Vigenere ciphertext here..."
                  />
                  <div className="text-xs text-slate-600 mt-1">{ciphertext.length} letters</div>
                </div>
              )}

              {/* ── Challenge mode ── */}
              {inputMode === 'challenge' && (
                <div className="space-y-4">
                  {/* Picker toggle + random */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      onClick={() => setShowChallengePicker(!showChallengePicker)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                        showChallengePicker
                          ? 'bg-red-950/50 text-red-400 border-red-700/50'
                          : 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'
                      }`}
                    >
                      <BookOpen size={13} /> Choose Challenge
                    </button>
                    <button
                      onClick={randomChallenge}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
                    >
                      <Shuffle size={13} /> Random Challenge
                    </button>
                  </div>

                  {/* Challenge picker grid */}
                  {showChallengePicker && (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-80 overflow-y-auto pr-1">
                      {CHALLENGES.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => startChallenge(c)}
                          className={`text-left px-3 py-2.5 rounded-lg border transition-colors ${
                            activeChallenge?.id === c.id
                              ? 'border-red-700/60 bg-red-950/30'
                              : 'border-slate-700 bg-slate-800/40 hover:border-slate-500 hover:bg-slate-800/70'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <span className="text-xs font-bold text-slate-200 leading-tight">{c.title}</span>
                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border shrink-0 ${DIFF_COLOR[c.difficulty]}`}>
                              {c.difficulty}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-600 font-mono">{c.source}</div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Active challenge display */}
                  {activeChallenge ? (
                    <div className="space-y-3">
                      <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="text-sm font-bold text-white">{activeChallenge.title}</div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">{activeChallenge.source}</div>
                          </div>
                          <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded border ${DIFF_COLOR[activeChallenge.difficulty]}`}>
                            {activeChallenge.difficulty}
                          </span>
                        </div>
                        {/* Hidden key indicator */}
                        <div className="flex items-center gap-2 mt-3 mb-3 px-3 py-2 bg-slate-900/60 rounded-lg border border-slate-700/60">
                          <ShieldQuestion size={14} className="text-amber-400 shrink-0" />
                          <span className="text-xs text-amber-400 font-medium">Key hidden — find it using Kasiski examination</span>
                          <span className="ml-auto text-[10px] text-slate-600 font-mono">
                            Key length: {secretKey.length} letters
                          </span>
                        </div>
                        {/* Ciphertext */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                            Ciphertext ({challengeCiphertext.length} letters)
                          </label>
                          <div className="font-mono text-xs text-red-300 break-all leading-relaxed max-h-24 overflow-y-auto">
                            {challengeCiphertext}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-10 border border-dashed border-slate-700 rounded-xl">
                      <ShieldQuestion size={32} className="text-slate-700 mx-auto mb-3" />
                      <p className="text-sm text-slate-600">Choose a challenge or click Random to begin</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={startCracking}
              disabled={ciphertext.length < 20}
              className="w-full py-3 rounded-xl bg-red-950/40 border border-red-700/50 text-red-400 font-bold text-sm hover:bg-red-950/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              Start Cracking <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* ═══════════ STEP 1: KASISKI ═══════════ */}
        {step === 1 && (
          <div className="space-y-6">
            {/* Challenge banner */}
            {inputMode === 'challenge' && activeChallenge && (
              <div className="flex items-center gap-3 px-4 py-3 bg-amber-950/20 border border-amber-800/40 rounded-xl">
                <ShieldQuestion size={16} className="text-amber-400 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-amber-400">{activeChallenge.title}</span>
                  <span className="text-xs text-slate-500 ml-2">— key is hidden</span>
                </div>
                <span className={`ml-auto text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${DIFF_COLOR[activeChallenge.difficulty]}`}>
                  {activeChallenge.difficulty}
                </span>
              </div>
            )}

            {/* Ciphertext display */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Ciphertext ({ciphertext.length} letters)
              </label>
              <div className="font-mono text-xs text-slate-400 break-all leading-relaxed max-h-24 overflow-y-auto">
                {ciphertext}
              </div>
            </div>

            {/* Repeated sequences */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-bold text-slate-300 mb-4">Repeated Sequences</h3>
              {kasiskiResults.length === 0 ? (
                <p className="text-sm text-slate-500">No repeated sequences found. The ciphertext may be too short.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-800">
                        <th className="text-left py-2 pr-4 font-medium">Sequence</th>
                        <th className="text-left py-2 pr-4 font-medium">Count</th>
                        <th className="text-left py-2 pr-4 font-medium">Positions</th>
                        <th className="text-left py-2 pr-4 font-medium">Spacings</th>
                        <th className="text-left py-2 font-medium">Factors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kasiskiResults.map((r) => (
                        <tr key={r.seq} className="border-b border-slate-800/50">
                          <td className="py-2 pr-4 font-mono font-bold text-red-400">{r.seq}</td>
                          <td className="py-2 pr-4 text-slate-400">{r.positions.length}</td>
                          <td className="py-2 pr-4 font-mono text-slate-500">{r.positions.join(', ')}</td>
                          <td className="py-2 pr-4 font-mono text-slate-400">{r.spacings.join(', ')}</td>
                          <td className="py-2 font-mono text-slate-500">
                            {r.spacings
                              .flatMap(getFactors)
                              .filter((v, i, a) => a.indexOf(v) === i)
                              .sort((a, b) => a - b)
                              .join(', ')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Factor frequency grid */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-bold text-slate-300 mb-4">
                Factor Frequency — Select Likely Key Length
              </h3>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 19 }, (_, i) => i + 2).map((f) => {
                  const count = factorFreq[f] || 0;
                  const isTop = f === topFactor && count > 0;
                  const isSelected = f === selectedKeyLen;
                  return (
                    <button
                      key={f}
                      onClick={() => setSelectedKeyLen(f)}
                      className={`relative px-4 py-3 rounded-lg text-sm font-mono font-bold transition-all ${
                        isSelected
                          ? 'bg-red-950/60 text-red-400 border-2 border-red-600 shadow-lg shadow-red-900/30'
                          : isTop
                            ? 'bg-red-950/30 text-red-400 border border-red-800/60 ring-1 ring-red-700/40'
                            : count > 0
                              ? 'bg-slate-800/60 text-slate-300 border border-slate-700 hover:border-slate-500'
                              : 'bg-slate-900/30 text-slate-600 border border-slate-800'
                      }`}
                    >
                      {f}
                      {count > 0 && (
                        <span
                          className={`absolute -top-2 -right-2 text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                            isTop ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {topFactor > 0 && (
                <p className="text-xs text-slate-500 mt-3">
                  Most common factor: <span className="text-red-400 font-bold">{topFactor}</span> (appears{' '}
                  {factorFreq[topFactor]} times). This is the most likely key length.
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(0)}
                className="px-6 py-3 rounded-xl border border-slate-700 text-slate-400 font-bold text-sm hover:border-slate-500 transition-colors"
              >
                Back
              </button>
              <button
                onClick={confirmKeyLength}
                disabled={!selectedKeyLen}
                className="flex-1 py-3 rounded-xl bg-red-950/40 border border-red-700/50 text-red-400 font-bold text-sm hover:bg-red-950/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Use Key Length {selectedKeyLen || '?'} <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ═══════════ STEP 2: FREQUENCY MATCHING ═══════════ */}
        {step === 2 && selectedKeyLen && (
          <div className="space-y-6">
            {/* Challenge banner */}
            {inputMode === 'challenge' && activeChallenge && (
              <div className="flex items-center gap-3 px-4 py-3 bg-amber-950/20 border border-amber-800/40 rounded-xl">
                <ShieldQuestion size={16} className="text-amber-400 shrink-0" />
                <span className="text-xs font-bold text-amber-400">{activeChallenge.title} — key is still hidden</span>
              </div>
            )}

            {/* Position tabs */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-bold text-slate-300 mb-3">Key Positions</h3>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: selectedKeyLen }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setActivePos(i)}
                    className={`px-3 py-2 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                      i === activePos
                        ? 'bg-red-950/60 text-red-400 border-2 border-red-600'
                        : locked[i]
                          ? 'bg-green-950/30 text-green-400 border border-green-800/50'
                          : 'bg-slate-800/60 text-slate-400 border border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    L{i + 1}
                    {locked[i] && <Check size={12} className="text-green-400" />}
                    {locked[i] && shifts[i] !== null && (
                      <span className="text-green-300 ml-0.5">{ALPHABET[shifts[i]!]}</span>
                    )}
                  </button>
                ))}
              </div>
              <div className="mt-3 text-xs text-slate-500">
                Recovered key:{' '}
                <span className="font-mono font-bold text-lg tracking-widest">
                  {recoveredKey.split('').map((c, i) => (
                    <span key={i} className={c === '?' ? 'text-slate-600' : 'text-red-400'}>{c}</span>
                  ))}
                </span>
              </div>
            </div>

            {/* Frequency chart with slider */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-300">
                  Position {activePos + 1} — Frequency Matcher
                </h3>
                <div className="flex items-center gap-3">
                  {currentChi !== null && (
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded ${
                        matchQuality === 'great'
                          ? 'bg-green-950/40 text-green-400 border border-green-800/40'
                          : matchQuality === 'good'
                            ? 'bg-green-950/30 text-green-300 border border-green-800/30'
                            : matchQuality === 'fair'
                              ? 'bg-yellow-950/30 text-yellow-400 border border-yellow-800/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {matchQuality === 'great'
                        ? 'Excellent match'
                        : matchQuality === 'good'
                          ? 'Good match'
                          : matchQuality === 'fair'
                            ? 'Fair match'
                            : 'Poor match'}
                      {' '}(X²={currentChi.toFixed(1)})
                    </span>
                  )}
                  <button
                    onClick={autoHint}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700 text-slate-400 hover:text-yellow-400 hover:border-yellow-700/50 transition-colors"
                  >
                    <Lightbulb size={12} /> Best match
                  </button>
                </div>
              </div>

              {/* Bar chart */}
              <div className="flex items-end gap-[2px] h-52 mb-4">
                {ALPHABET.split('').map((letter, i) => {
                  const shift = shifts[activePos] ?? 0;
                  const observedIdx = (i + shift) % 26;
                  const obsCount = columnCounts[activePos]?.[observedIdx] ?? 0;
                  const totalInCol = columnCounts[activePos]?.reduce((a: number, b: number) => a + b, 0) || 1;
                  const obsPct = (obsCount / totalInCol) * 100;
                  const refPct = ENGLISH_FREQ[i];
                  const obsBarH = (obsPct / Math.max(maxEnglishFreq, (activeMaxCount / totalInCol) * 100)) * 100;
                  const refBarH = (refPct / Math.max(maxEnglishFreq, (activeMaxCount / totalInCol) * 100)) * 100;

                  return (
                    <div key={letter} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                      <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-[10px] z-10 whitespace-nowrap">
                        <div className="text-red-300">Observed: {obsCount} ({obsPct.toFixed(1)}%)</div>
                        <div className="text-slate-400">English {letter}: {refPct.toFixed(1)}%</div>
                      </div>
                      <div
                        className="w-full bg-slate-700/25 rounded-t-sm absolute bottom-5"
                        style={{ height: `${Math.max(refBarH * 0.88, 0)}%` }}
                      />
                      <div
                        className="w-full bg-red-500/70 rounded-t-sm relative z-[1] transition-all duration-150"
                        style={{ height: `${Math.max(obsBarH * 0.88, 0)}%`, minHeight: obsCount > 0 ? '2px' : '0' }}
                      />
                      <div className="text-[9px] mt-0.5 font-mono text-slate-500">{letter}</div>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mb-5 text-[10px] text-slate-500">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-red-500/70" />
                  <span>Observed (shifted)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-slate-700/25" />
                  <span>Expected English</span>
                </div>
              </div>

              {/* Slider */}
              <div className="bg-slate-800/40 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Shift Value
                  </label>
                  <div className="text-lg font-mono font-bold">
                    <span className="text-slate-400">Shift: </span>
                    <span className="text-red-400">{shifts[activePos] ?? 0}</span>
                    <span className="text-slate-600 mx-2">&rarr;</span>
                    <span className="text-white">Key letter: {ALPHABET[shifts[activePos] ?? 0]}</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={25}
                  value={shifts[activePos] ?? 0}
                  onChange={(e) => setShiftAt(Number(e.target.value))}
                  className="w-full accent-red-500 h-2 cursor-pointer"
                />
                <div className="flex justify-between mt-1">
                  {ALPHABET.split('').map((l, i) => (
                    <span
                      key={l}
                      className={`text-[7px] font-mono ${
                        i === (shifts[activePos] ?? 0) ? 'text-red-400 font-bold' : 'text-slate-700'
                      }`}
                    >
                      {l}
                    </span>
                  ))}
                </div>
              </div>

              {/* Subset preview */}
              <div className="mt-5 space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Ciphertext at position {activePos + 1} (every {selectedKeyLen}th letter)
                  </label>
                  <div className="font-mono text-xs text-red-300/70 break-all leading-relaxed max-h-16 overflow-y-auto">
                    {columns[activePos]}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Decrypted preview (shift={shifts[activePos] ?? 0}, letter={ALPHABET[shifts[activePos] ?? 0]})
                  </label>
                  <div className="font-mono text-xs text-green-300/80 break-all leading-relaxed max-h-16 overflow-y-auto">
                    {columns[activePos]
                      ?.split('')
                      .map((c) =>
                        ALPHABET[(c.charCodeAt(0) - 65 - (shifts[activePos] ?? 0) + 26) % 26],
                      )
                      .join('')}
                  </div>
                </div>
              </div>

              {/* Lock button */}
              <div className="mt-4 flex gap-3">
                <button
                  onClick={lockPosition}
                  disabled={shifts[activePos] === null}
                  className="flex-1 py-2.5 rounded-lg bg-green-950/30 border border-green-800/50 text-green-400 font-bold text-sm hover:bg-green-950/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Lock size={14} /> Lock Letter {ALPHABET[shifts[activePos] ?? 0]} for Position {activePos + 1}
                </button>
              </div>
            </div>

            {/* Partial decrypt preview */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-bold text-slate-300 mb-3">Partial Decryption</h3>
              <div className="font-mono text-xs break-all leading-relaxed">
                {partialDecrypt.split('').map((c, i) => (
                  <span key={i} className={c === '\u00B7' ? 'text-slate-700' : 'text-white'}>{c}</span>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-3 rounded-xl border border-slate-700 text-slate-400 font-bold text-sm hover:border-slate-500 transition-colors"
              >
                Back
              </button>
              {allLocked && (
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 py-3 rounded-xl bg-red-950/40 border border-red-700/50 text-red-400 font-bold text-sm hover:bg-red-950/60 transition-colors flex items-center justify-center gap-2"
                >
                  View Result <ChevronRight size={16} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ═══════════ STEP 3: RESULT ═══════════ */}
        {step === 3 && (
          <div className="space-y-6">

            {/* Challenge result banner */}
            {inputMode === 'challenge' && activeChallenge && (
              <div className={`rounded-xl border p-5 ${
                challengeSuccess
                  ? 'bg-green-950/30 border-green-700/50'
                  : challengePartial
                    ? 'bg-amber-950/30 border-amber-700/50'
                    : 'bg-slate-900/60 border-slate-800'
              }`}>
                <div className="flex items-center gap-3 mb-3">
                  {challengeSuccess ? (
                    <Check size={20} className="text-green-400" />
                  ) : (
                    <ShieldQuestion size={20} className="text-amber-400" />
                  )}
                  <h3 className={`text-sm font-bold ${challengeSuccess ? 'text-green-400' : 'text-amber-400'}`}>
                    {challengeSuccess ? 'Key Cracked! Excellent work.' : challengePartial ? 'Close — some letters differ.' : 'Key comparison'}
                  </h3>
                  <span className={`ml-auto text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${DIFF_COLOR[activeChallenge.difficulty]}`}>
                    {activeChallenge.difficulty}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono mb-1">You recovered</div>
                    <div className="font-mono font-black text-2xl tracking-[0.3em] text-red-400">{recoveredKey}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono mb-1">
                      {revealKey ? 'Secret key' : 'Secret key (hidden)'}
                    </div>
                    {revealKey ? (
                      <div className={`font-mono font-black text-2xl tracking-[0.3em] ${challengeSuccess ? 'text-green-400' : 'text-amber-400'}`}>
                        {secretKey}
                      </div>
                    ) : (
                      <button
                        onClick={() => setRevealKey(true)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors text-xs font-medium"
                      >
                        <Lock size={12} /> Reveal secret key
                      </button>
                    )}
                  </div>
                </div>
                {revealKey && !challengeSuccess && (
                  <div className="mt-3 flex gap-2 flex-wrap">
                    {recoveredKey.split('').map((c, i) => (
                      <span key={i} className={`font-mono text-sm px-2 py-1 rounded border ${
                        c === secretKey[i]
                          ? 'text-green-400 border-green-800/50 bg-green-950/20'
                          : 'text-red-400 border-red-800/50 bg-red-950/20'
                      }`}>
                        {c}
                        <span className="text-[9px] block text-center opacity-60">{secretKey[i]}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Recovered key (non-challenge) */}
            {inputMode !== 'challenge' && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-bold text-slate-300 mb-3">Recovered Key</h3>
                <div className="flex items-center gap-4">
                  <div className="text-4xl font-mono font-black tracking-[0.3em] text-red-400">{recoveredKey}</div>
                  <div className="text-xs text-slate-500">Length: {selectedKeyLen}</div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {shifts.map((s, i) => {
                    if (s === null) return null;
                    const chi = chiSquared(columnCounts[i], s);
                    const qual = chi < 30 ? 'great' : chi < 60 ? 'good' : chi < 120 ? 'fair' : 'poor';
                    return (
                      <div
                        key={i}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono border ${
                          qual === 'great'
                            ? 'border-green-800/40 text-green-400 bg-green-950/20'
                            : qual === 'good'
                              ? 'border-green-800/30 text-green-300 bg-green-950/10'
                              : qual === 'fair'
                                ? 'border-yellow-800/30 text-yellow-400 bg-yellow-950/10'
                                : 'border-slate-700 text-slate-400 bg-slate-800/30'
                        }`}
                      >
                        L{i + 1}={ALPHABET[s]} <span className="text-[10px] opacity-60">(X²={chi.toFixed(0)})</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Decrypted plaintext */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-300">Decrypted Plaintext</h3>
                <button
                  onClick={copyResult}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
                >
                  {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="font-mono text-sm text-white break-all leading-relaxed bg-slate-800/40 rounded-lg p-4">
                {decryptedText}
              </div>
            </div>

            {/* Original ciphertext */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-bold text-slate-300 mb-3">Original Ciphertext</h3>
              <div className="font-mono text-xs text-slate-500 break-all leading-relaxed">{ciphertext}</div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-3 rounded-xl border border-slate-700 text-slate-400 font-bold text-sm hover:border-slate-500 transition-colors"
              >
                Back to Frequency
              </button>
              <button
                onClick={resetAll}
                className="flex-1 py-3 rounded-xl bg-red-950/40 border border-red-700/50 text-red-400 font-bold text-sm hover:bg-red-950/60 transition-colors"
              >
                {inputMode === 'challenge' ? 'Try Another Challenge' : 'Crack Another Message'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VigenereWorkshopApp;
