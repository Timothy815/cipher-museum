import React, { useState, useMemo, useCallback } from 'react';
import { Swords, Info, X, Check, Copy, ChevronRight, Lightbulb, Lock, ShieldQuestion, BookOpen, Shuffle, Dice5, KeyRound, Type } from 'lucide-react';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const ENGLISH_FREQ: number[] = [
  8.167, 1.492, 2.782, 4.253, 12.702, 2.228, 2.015, 6.094, 6.966, 0.153,
  0.772, 4.025, 2.406, 6.749, 7.507, 1.929, 0.095, 5.987, 6.327, 9.056,
  2.758, 0.978, 2.360, 0.150, 1.974, 0.074,
];

const DEMO_PLAINTEXT =
  'THE VIGENERE CIPHER WAS LONG CONSIDERED UNBREAKABLE AND WAS KNOWN AS LE CHIFFRE INDECHIFFRABLE FOR NEARLY THREE HUNDRED YEARS UNTIL CHARLES BABBAGE AND FRIEDRICH KASISKI INDEPENDENTLY DISCOVERED METHODS TO CRACK IT USING REPEATED SEQUENCES AND FREQUENCY ANALYSIS';
const DEMO_KEY = 'KASISKI';

// ── Challenge library ─────────────────────────────────────────────────

interface Challenge {
  id: number;
  title: string;
  source: string;
  difficulty: 'easy' | 'medium' | 'hard';
  text: string;
}

// ── Key pools ─────────────────────────────────────────────────────────
// Real-word keys organised by difficulty / typical length
// Easy  → 3–5 letters; Medium → 5–9 letters; Hard → 7–15 letters

const EASY_KEYS = [
  'LEMON','RIVER','STONE','FLAME','OCEAN','TIGER','EAGLE','MAPLE',
  'BRAVE','CHESS','FLINT','GRACE','HOUND','IVORY','LANCE','MAGIC',
  'NOBLE','ORBIT','PEARL','QUEEN','RAVEN','SWORD','TEMPO','ULTRA',
  'VENOM','WHEAT','YACHT','ZEBRA','BLAZE','CLOAK',
];

const MEDIUM_KEYS = [
  'BABBAGE','ENIGMA','NEWTON','DARWIN','CAESAR','SPHINX','FALCON',
  'DRAGON','EMPIRE','FOREST','GOLDEN','HUNTER','ISLAND','JUNGLE',
  'KNIGHT','LANTERN','MASTER','NATION','ORACLE','PARROT','QUANTUM',
  'ROCKET','SATURN','TUNNEL','VECTOR','WALRUS','YELLOW','ZENITH',
  'BRIDGE','CASTLE','DAGGER','HERALD','MIRROR','PILLAR','SHIELD',
  'THRONE','VOYAGE','WINTER','ANCIENT','CAPTAIN','DISCORD','GALLEON',
];

const HARD_KEYS = [
  'KASISKI','FREQUENCY','BLETCHLEY','POLYMATH','COINCIDE','ALPHABET',
  'BREAKING','CALENDAR','DIPLOMAT','ESCALATE','FAITHFUL','GLORIOUS',
  'HAMILTON','IMPERIAL','JEALOUSY','KNOWLEDGE','LABYRINTH','MECHANISM',
  'NIGHTMARE','OBSCURITY','QUARTERLY','RESILIENT','TELEGRAPH','UNIVERSAL',
  'VIGILANCE','WONDERFUL','ZEALOUSLY','CRYPTOLOGY','DECIPHERMENT',
  'MATHEMATICAL','INTELLIGENCE','SUBSTITUTION','CRYPTANALYST','INDEPENDENT',
  'POLYALPHABETIC','TRANSPOSITION','VIGENEREKEY','FREQUENCY','STEGANOGRAPHY',
  'CONFIDENTIAL','SYSTEMATICAL','CRYPTOGRAPHIC','REVOLUTIONARY','COUNTERINTEL',
];

// Random-key length ranges per difficulty
const RANDOM_LEN: Record<string, number[]> = {
  easy:   [3, 3, 4, 4, 5],
  medium: [5, 6, 6, 7, 8],
  hard:   [7, 8, 9, 10, 11, 12, 13],
};

function generateRandomKey(difficulty: Challenge['difficulty']): string {
  const lengths = RANDOM_LEN[difficulty];
  const len = lengths[Math.floor(Math.random() * lengths.length)];
  return Array.from({ length: len }, () => ALPHABET[Math.floor(Math.random() * 26)]).join('');
}

function pickKey(difficulty: Challenge['difficulty'], keyType: 'word' | 'random'): string {
  if (keyType === 'random') return generateRandomKey(difficulty);
  const pool = difficulty === 'easy' ? EASY_KEYS : difficulty === 'medium' ? MEDIUM_KEYS : HARD_KEYS;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── 35 challenge texts ────────────────────────────────────────────────

const CHALLENGES: Challenge[] = [
  // ── easy ──
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
    id: 7, difficulty: 'easy', title: 'The Raven',
    source: 'Edgar Allan Poe, 1845',
    text: 'ONCE UPON A MIDNIGHT DREARY WHILE I PONDERED WEAK AND WEARY OVER MANY A QUAINT AND CURIOUS VOLUME OF FORGOTTEN LORE WHILE I NODDED NEARLY NAPPING SUDDENLY THERE CAME A TAPPING AS OF SOMEONE GENTLY RAPPING RAPPING AT MY CHAMBER DOOR',
  },
  {
    id: 8, difficulty: 'easy', title: 'Neil Armstrong on the Moon',
    source: 'NASA Apollo 11, July 1969',
    text: 'THAT IS ONE SMALL STEP FOR MAN ONE GIANT LEAP FOR MANKIND THE SURFACE IS FINE AND POWDERY IT ADHERES IN FINE LAYERS LIKE POWDERED CHARCOAL TO THE SOLES AND SIDES OF MY BOOTS I ONLY GO IN A FRACTION OF AN INCH MAYBE AN EIGHTH OF AN INCH BUT I CAN SEE THE FOOTPRINTS',
  },
  // ── medium ──
  {
    id: 9, difficulty: 'medium', title: 'Alan Turing on Intelligence',
    source: 'Alan Turing, Computing Machinery and Intelligence, 1950',
    text: 'I PROPOSE TO CONSIDER THE QUESTION CAN MACHINES THINK THE ORIGINAL QUESTION WHETHER A MACHINE CAN THINK IS TOO MEANINGLESS TO DESERVE DISCUSSION A COMPUTER WOULD DESERVE TO BE CALLED INTELLIGENT IF IT COULD DECEIVE A HUMAN INTO BELIEVING THAT IT WAS HUMAN WE CAN ONLY SEE A SHORT DISTANCE AHEAD BUT WE CAN SEE PLENTY THERE THAT NEEDS TO BE DONE',
  },
  {
    id: 10, difficulty: 'medium', title: 'Kerckhoffs\'s Principle',
    source: 'Auguste Kerckhoffs, La Cryptographie Militaire, 1883',
    text: 'A CRYPTOSYSTEM SHOULD BE SECURE EVEN IF EVERYTHING ABOUT THE SYSTEM EXCEPT THE KEY IS PUBLIC KNOWLEDGE THE ENEMY KNOWS THE SYSTEM SECURITY MUST DEPEND ON THE KEY ALONE A CIPHER IS BROKEN WHEN THE CRYPTANALYST CAN DECIPHER MESSAGES WITHOUT KNOWLEDGE OF THE KEY REGARDLESS OF HOW COMPLEX THE ALGORITHM APPEARS',
  },
  {
    id: 11, difficulty: 'medium', title: 'Shannon on Secrecy',
    source: 'Claude Shannon, Communication Theory of Secrecy Systems, 1949',
    text: 'THE ENEMY KNOWS THE SYSTEM ANY SECRECY MUST RESIDE IN THE KEY A SYSTEM MAY BE CALLED THEORETICALLY UNBREAKABLE WHEN THE ENEMY EVEN WITH UNLIMITED TIME AND RESOURCES CANNOT DECIPHER IT THE AMOUNT OF INFORMATION IN THE KEY MUST BE AT LEAST AS GREAT AS THE AMOUNT OF INFORMATION IN THE MESSAGE',
  },
  {
    id: 12, difficulty: 'medium', title: 'Newton\'s Laws of Motion',
    source: 'Isaac Newton, Principia Mathematica, 1687',
    text: 'EVERY BODY CONTINUES IN ITS STATE OF REST OR UNIFORM MOTION IN A STRAIGHT LINE UNLESS IT IS COMPELLED TO CHANGE THAT STATE BY FORCES IMPRESSED UPON IT THE CHANGE OF MOTION IS PROPORTIONAL TO THE MOTIVE FORCE IMPRESSED AND TAKES PLACE ALONG THE LINE IN WHICH THAT FORCE IS IMPRESSED TO EVERY ACTION THERE IS ALWAYS OPPOSED AN EQUAL REACTION',
  },
  {
    id: 13, difficulty: 'medium', title: 'The Enigma Machine',
    source: 'David Kahn, The Codebreakers, 1967',
    text: 'THE ENIGMA MACHINE COMBINED THREE ROTORS A PLUGBOARD AND A REFLECTOR TO CREATE A CIPHER OF STAGGERING COMPLEXITY THE ROTORS STEPPED WITH EACH KEYSTROKE SO THAT THE SAME LETTER PRESSED TWICE IN SUCCESSION WOULD PRODUCE TWO DIFFERENT CIPHERTEXT LETTERS THE GERMAN HIGH COMMAND BELIEVED THE SYSTEM WAS MATHEMATICALLY UNBREAKABLE',
  },
  {
    id: 14, difficulty: 'medium', title: 'Julius Caesar on the Rubicon',
    source: 'Suetonius, Lives of the Twelve Caesars, ca. 121 CE',
    text: 'CAESAR DROVE ON WITH HIS TROOPS AND WHEN HE REACHED THE RUBICON HE PAUSED FOR HE WELL KNEW THE LAWS OF ROME FORBADE ANY GENERAL TO CROSS THAT RIVER UNDER ARMS THEN LOOKING ACROSS THE STREAM HE SAID THE DIE IS CAST AND HE CROSSED INTO GAUL WITH ALL HIS LEGIONS BEHIND HIM',
  },
  {
    id: 15, difficulty: 'medium', title: 'Mary Queen of Scots',
    source: 'Simon Singh, The Code Book, 1999',
    text: 'MARY QUEEN OF SCOTS COMMUNICATED WITH HER CONSPIRATORS USING A HOMOPHONIC SUBSTITUTION CIPHER THAT REPLACED EACH LETTER WITH A SYMBOL AND INCLUDED NULLS TO CONFUSE CRYPTANALYSTS SHE BELIEVED HER COMMUNICATIONS WERE SECURE BUT THOMAS PHELIPPES BROKE EVERY MESSAGE AND THE DECIPHERED LETTERS PROVED HER GUILT AT TRIAL',
  },
  {
    id: 16, difficulty: 'medium', title: 'The Zimmermann Telegram',
    source: 'Arthur Zimmermann, German Foreign Secretary, January 1917',
    text: 'WE INTEND TO BEGIN UNRESTRICTED SUBMARINE WARFARE ON THE FIRST OF FEBRUARY WE SHALL ENDEAVOR TO KEEP THE UNITED STATES NEUTRAL IN THE EVENT OF THIS NOT SUCCEEDING WE MAKE MEXICO A PROPOSAL OF ALLIANCE ON THE FOLLOWING BASIS MAKE WAR TOGETHER MAKE PEACE TOGETHER GENEROUS FINANCIAL SUPPORT AND UNDERSTANDING THAT MEXICO IS TO RECONQUER THE LOST TERRITORY IN TEXAS',
  },
  {
    id: 17, difficulty: 'medium', title: 'Babbage and the Analytical Engine',
    source: 'Charles Babbage, Passages from the Life of a Philosopher, 1864',
    text: 'ON TWO OCCASIONS I HAVE BEEN ASKED WHETHER I CAN PROGRAM THE ENGINE TO GIVE WRONG ANSWERS HAD MALICE OR STUPIDITY WHISPERED THIS QUESTION I COULD HAVE UNDERSTOOD IT THE ANALYTICAL ENGINE HAS NO POWER OF ORIGINATING ANYTHING IT CAN ONLY DO WHAT WE ORDER IT TO PERFORM',
  },
  {
    id: 18, difficulty: 'medium', title: 'Herodotus on Steganography',
    source: 'Herodotus, Histories, Book VII, ca. 440 BCE',
    text: 'DEMARATUS WANTED TO WARN THE SPARTANS THAT XERXES WAS PLANNING TO INVADE GREECE BUT HE HAD NO SAFE WAY TO SEND THE MESSAGE SO HE SCRAPED THE WAX OFF A WRITING TABLET WROTE HIS MESSAGE ON THE WOOD BENEATH AND THEN COVERED IT WITH WAX AGAIN THE TABLET APPEARED TO BE BLANK AND PASSED THE PERSIAN GUARDS WITHOUT SUSPICION',
  },
  // ── hard ──
  {
    id: 19, difficulty: 'hard', title: 'The Black Chamber',
    source: 'Herbert O. Yardley, The American Black Chamber, 1931',
    text: 'STATESMEN AND DIPLOMATS OF EVERY NATION WERE COMMUNICATING WITH EACH OTHER BY CODE AND CIPHER IN THE BELIEF THAT THEIR SECRETS WERE INVIOLATE THE AMERICAN BLACK CHAMBER HAD PENETRATED THE CODES OF TWENTY COUNTRIES THE JAPANESE DIPLOMATIC CODE WAS BROKEN IN NINETEEN TWENTY AND ITS CONTENTS LAID BEFORE THE AMERICAN DELEGATION AT THE WASHINGTON NAVAL CONFERENCE THE JAPANESE NEVER SUSPECTED THAT THEIR MOST SECRET COMMUNICATIONS HAD BEEN READ BY THEIR ADVERSARIES',
  },
  {
    id: 20, difficulty: 'hard', title: 'Al-Kindi on Cryptanalysis',
    source: 'Al-Kindi, A Manuscript on Deciphering Cryptographic Messages, ca. 850 CE',
    text: 'ONE WAY TO SOLVE AN ENCRYPTED MESSAGE IS TO FIND A PLAINTEXT OF THE SAME LANGUAGE LONG ENOUGH TO FILL ONE SHEET AND THEN COUNT EACH LETTER THE MOST FREQUENT LETTER IS PROBABLY THE MOST COMMON IN THAT TONGUE CALL THIS LETTER THE FIRST AND SO ON UNTIL YOU HAVE ACCOUNTED FOR ALL THE LETTERS IN THE CRYPTOGRAM THEN OBSERVE THE CRYPTOGRAM YOU WISH TO SOLVE AND CLASSIFY ITS SYMBOLS BY FREQUENCY AND REPLACE THE MOST COMMON SYMBOL WITH THE FIRST LETTER OF THE PLAINTEXT ALPHABET',
  },
  {
    id: 21, difficulty: 'hard', title: 'Bletchley Park',
    source: 'F. H. Hinsley, British Intelligence in the Second World War, 1979',
    text: 'THE WORK DONE AT BLETCHLEY PARK SHORTENED THE WAR IN EUROPE BY NOT LESS THAN TWO YEARS AND PROBABLY BY FOUR YEARS WITHOUT IT THE OUTCOME OF THE WAR AGAINST GERMANY WOULD AT LEAST HAVE BEEN IN DOUBT THE TOTAL NUMBER OF MESSAGES DECODED EXCEEDED TWO HUNDRED MILLION BY THE WAR\'S END THE PARK EMPLOYED NEARLY NINE THOUSAND PEOPLE AT ITS PEAK INCLUDING MATHEMATICIANS LINGUISTS CHESS CHAMPIONS AND CROSSWORD ENTHUSIASTS ALL SWORN TO ABSOLUTE SECRECY',
  },
  {
    id: 22, difficulty: 'hard', title: 'Friedman on the Index of Coincidence',
    source: 'William F. Friedman, The Index of Coincidence, 1922',
    text: 'CRYPTANALYSIS IS THE SCIENCE OF RECOVERING THE PLAINTEXT OF A MESSAGE WITHOUT KNOWLEDGE OF THE KEY IT IS FUNDAMENTALLY A PROBLEM IN APPLIED PROBABILITY AND STATISTICS THE CRYPTANALYST MUST EXPLOIT EVERY STRUCTURAL REGULARITY IN LANGUAGE LETTER FREQUENCIES DIGRAPH FREQUENCIES WORD PATTERNS AND GRAMMATICAL CONSTRAINTS THE INDEX OF COINCIDENCE MEASURES HOW UNEVEN THE LETTER DISTRIBUTION IS IN A SAMPLE OF TEXT AND CAN BE USED TO DISTINGUISH A MONOALPHABETIC FROM A POLYALPHABETIC CIPHER',
  },
  {
    id: 23, difficulty: 'hard', title: 'The Venona Project',
    source: 'Robert Louis Benson, The Venona Story, NSA, 1996',
    text: 'THE VENONA PROJECT BEGAN IN NINETEEN FORTY THREE WHEN AMERICAN CRYPTANALYSTS NOTICED THAT SOME SOVIET DIPLOMATIC TRAFFIC WAS ENCIPHERED USING ONE TIME PADS WHOSE PAGES HAD BEEN DUPLICATED IN VIOLATION OF THE FUNDAMENTAL RULE THIS REUSE CREATED STATISTICAL REGULARITIES THAT PERMITTED PARTIAL RECONSTRUCTION OF MORE THAN TWO THOUSAND MESSAGES EXCHANGED BETWEEN MOSCOW AND ITS AGENTS OPERATING INSIDE THE UNITED STATES GOVERNMENT THE PROJECT REMAINED CLASSIFIED UNTIL NINETEEN NINETY FIVE',
  },
  {
    id: 24, difficulty: 'hard', title: 'Babbage and the Vigenère',
    source: 'Simon Singh, The Code Book, 1999',
    text: 'CHARLES BABBAGE CRACKED THE VIGENERE CIPHER AROUND EIGHTEEN FIFTY FOUR BUT NEVER PUBLISHED HIS WORK SOME HISTORIANS BELIEVE HE WAS ASKED TO KEEP HIS METHOD SECRET BY BRITISH MILITARY INTELLIGENCE WHICH WISHED TO EXPLOIT THE TECHNIQUE AGAINST RUSSIAN COMMUNICATIONS DURING THE CRIMEAN WAR NINE YEARS LATER FRIEDRICH KASISKI INDEPENDENTLY PUBLISHED THE SAME ATTACK AND RECEIVED ALL THE CREDIT IN THE SCIENTIFIC LITERATURE',
  },
  {
    id: 25, difficulty: 'hard', title: 'The Voynich Manuscript',
    source: 'Mary E. D\'Imperio, The Voynich Manuscript: An Elegant Enigma, 1978',
    text: 'THE VOYNICH MANUSCRIPT HAS DEFIED EVERY ATTEMPT AT DECIPHERMENT SINCE ITS REDISCOVERY IN NINETEEN TWELVE ITS VELLUM HAS BEEN DATED TO THE EARLY FIFTEENTH CENTURY THE SCRIPT PROCEEDS LEFT TO RIGHT WITH CONSISTENT WORD AND LETTER FREQUENCIES SUGGESTING A GENUINE UNDERLYING LANGUAGE OR CODE RATHER THAN RANDOM INVENTION YET NO CRYPTANALYST HAS EXTRACTED A SINGLE CONFIRMED WORD OF MEANING DESPITE EFFORTS BY THE MOST ACCOMPLISHED CODEBREAKERS OF THE TWENTIETH CENTURY',
  },
  {
    id: 26, difficulty: 'hard', title: 'Ada Lovelace on Computation',
    source: 'Ada Lovelace, Notes on the Analytical Engine, 1843',
    text: 'THE ANALYTICAL ENGINE HAS NO PRETENSIONS TO ORIGINATE ANYTHING IT CAN DO WHATEVER WE KNOW HOW TO ORDER IT TO PERFORM IT CAN FOLLOW ANALYSIS BUT IT HAS NO POWER OF ANTICIPATING ANY ANALYTICAL REVELATIONS OR TRUTHS ITS PROVINCE IS TO ASSIST US IN MAKING AVAILABLE WHAT WE ARE ALREADY ACQUAINTED WITH THIS IT WILL DO WITH EXTRAORDINARY FACILITY AND SPEED THE ENGINE MIGHT ACT UPON OTHER THINGS BESIDES NUMBER WERE OBJECTS FOUND WHOSE MUTUAL FUNDAMENTAL RELATIONS COULD BE EXPRESSED BY THOSE OF THE ABSTRACT SCIENCE OF OPERATIONS',
  },
  {
    id: 27, difficulty: 'hard', title: 'Breaking the Lorenz Cipher',
    source: 'Jack Good, Donald Michie, Geoffrey Tinn, General Report on Tunny, 1945',
    text: 'THE LORENZ CIPHER MACHINE ATTACHED TO THE GERMAN HIGH COMMAND TELEPRINTER NETWORK PRODUCED WHAT BLETCHLEY PARK CALLED FISH TRAFFIC UNLIKE ENIGMA WHICH REQUIRED TRAINED OPERATORS WITH PHYSICAL MACHINES THE LORENZ SYSTEM AUTOMATICALLY ENCRYPTED MESSAGES AT THE POINT OF TRANSMISSION COLOSSUS THE WORLDS FIRST PROGRAMMABLE ELECTRONIC COMPUTER WAS BUILT SPECIFICALLY TO ATTACK THE STATISTICAL PATTERNS IN THE LORENZ KEYSTREAM',
  },
  {
    id: 28, difficulty: 'hard', title: 'Public Key Cryptography',
    source: 'Whitfield Diffie and Martin Hellman, New Directions in Cryptography, 1976',
    text: 'WE STAND TODAY ON THE BRINK OF A REVOLUTION IN CRYPTOGRAPHY THE DEVELOPMENT OF CHEAP DIGITAL HARDWARE HAS FREED IT FROM THE DESIGN LIMITATIONS OF MECHANICAL COMPUTING AND BROUGHT THE COST OF HIGH GRADE CRYPTOGRAPHIC DEVICES DOWN TO WHERE THEY CAN BE USED IN SUCH COMMERCIAL APPLICATIONS AS REMOTE CASH DISPENSERS AND COMPUTER TERMINALS TWO KINDS OF CONTEMPORARY DEVELOPMENTS PRESENT SPECIAL PROMISE FOR SOLVING THE KEY DISTRIBUTION PROBLEM',
  },
  {
    id: 29, difficulty: 'hard', title: 'The Purple Cipher',
    source: 'David Kahn, The Codebreakers, 1967',
    text: 'THE JAPANESE FOREIGN MINISTRY MACHINE KNOWN TO AMERICAN CRYPTANALYSTS AS PURPLE SUBSTITUTED LETTERS USING TELEPHONE STEPPING SWITCHES ARRANGED SO THAT A GIVEN INPUT LETTER COULD PRODUCE ANY OF TWENTY SIX OUTPUT LETTERS DEPENDING ON THE POSITIONS OF FOUR SWITCHES WHICH ADVANCED WITH EACH KEYSTROKE THE ARMY SIGNAL INTELLIGENCE SERVICE LED BY WILLIAM FRIEDMAN BROKE PURPLE IN NINETEEN FORTY WITHOUT EVER SEEING THE ACTUAL MACHINE CONSTRUCTING A WORKING REPLICA PURELY FROM MATHEMATICAL ANALYSIS',
  },
  {
    id: 30, difficulty: 'hard', title: 'The NSA Formation',
    source: 'James Bamford, The Puzzle Palace, 1982',
    text: 'PRESIDENT TRUMAN SIGNED THE MEMORANDUM ESTABLISHING THE NATIONAL SECURITY AGENCY ON FOUR NOVEMBER NINETEEN FIFTY TWO THE DOCUMENT REMAINED CLASSIFIED FOR TWENTY THREE YEARS THE EXISTENCE OF THE AGENCY ITSELF WAS NOT ACKNOWLEDGED BY THE GOVERNMENT FOR MANY YEARS LEADING OBSERVERS TO JOKE THAT NSA STOOD FOR NO SUCH AGENCY THE DIRECTIVE TRANSFERRED ALL SIGNALS INTELLIGENCE FUNCTIONS FROM THE ARMED FORCES SECURITY AGENCY AND PLACED THEM UNDER A SINGLE CIVILIAN CONTROLLED ORGANIZATION REPORTING DIRECTLY TO THE SECRETARY OF DEFENSE',
  },
  {
    id: 31, difficulty: 'hard', title: 'Cold War SIGINT',
    source: 'Matthew Aid, The Secret Sentry, 2009',
    text: 'DURING THE COLD WAR THE NATIONAL SECURITY AGENCY OPERATED A GLOBAL NETWORK OF LISTENING STATIONS THAT INTERCEPTED BILLIONS OF ENCRYPTED COMMUNICATIONS FROM THE SOVIET UNION AND ITS ALLIES RUSSIAN CRYPTOGRAPHIC DISCIPLINE WAS EXCEPTIONAL AND THEIR ONE TIME PAD SYSTEMS WERE ESSENTIALLY UNBREAKABLE BUT HUMAN ERROR PROCEDURAL FAILURES AND THE SHEER VOLUME OF TRAFFIC SOMETIMES CREATED OPPORTUNITIES FOR AMERICAN CRYPTANALYSTS TO EXPLOIT WEAKNESSES IN KEY DISTRIBUTION AND OPERATOR PRACTICES',
  },
  {
    id: 32, difficulty: 'hard', title: 'The One-Time Pad',
    source: 'Claude Shannon, Communication Theory of Secrecy Systems, 1949',
    text: 'THE VERNAM CIPHER WHEN USED WITH A TRULY RANDOM KEY THAT IS AS LONG AS THE MESSAGE AND IS NEVER REUSED PROVIDES PERFECT SECRECY IN A MATHEMATICALLY PROVABLE SENSE GIVEN ANY CIPHERTEXT OF LENGTH N EVERY POSSIBLE PLAINTEXT OF LENGTH N IS EQUALLY PROBABLE AS THE SOURCE PROVIDED THE KEY WAS CHOSEN UNIFORMLY AT RANDOM AND USED ONLY ONCE NO ADVERSARY WITH UNBOUNDED COMPUTATIONAL POWER CAN EXTRACT ANY INFORMATION ABOUT THE PLAINTEXT BEYOND ITS LENGTH THIS PROOF WAS ESTABLISHED BY CLAUDE SHANNON IN NINETEEN FORTY FIVE',
  },
  {
    id: 33, difficulty: 'hard', title: 'The Enigma Bombe',
    source: 'Gordon Welchman, The Hut Six Story, 1982',
    text: 'THE BOMBE WAS AN ELECTROMECHANICAL DEVICE DESIGNED BY ALAN TURING AND IMPROVED BY GORDON WELCHMAN TO SEARCH FOR ENIGMA KEY SETTINGS IT EXPLOITED THE FACT THAT GERMAN OPERATORS FREQUENTLY USED PREDICTABLE MESSAGE OPENINGS CALLED CRIBS SUCH AS WEATHER REPORTS THAT ALWAYS BEGAN WITH THE SAME WORDS BY TESTING EVERY POSSIBLE ROTOR POSITION AGAINST A KNOWN PROBABLE PLAINTEXT THE BOMBE COULD ELIMINATE BILLIONS OF IMPOSSIBLE SETTINGS AND NARROW THE SEARCH TO A MANAGEABLE NUMBER',
  },
  {
    id: 34, difficulty: 'hard', title: 'Diffie-Hellman Key Exchange',
    source: 'Whitfield Diffie and Martin Hellman, New Directions in Cryptography, 1976',
    text: 'THE KEY EXCHANGE PROTOCOL DEPENDS ON THE DIFFICULTY OF COMPUTING DISCRETE LOGARITHMS IN A FINITE FIELD TWO PARTIES CAN AGREE ON A SHARED SECRET OVER AN INSECURE CHANNEL WITHOUT EVER HAVING MET OR SHARED ANY PRIOR SECRET INFORMATION AN EAVESDROPPER WHO OBSERVES THE ENTIRE EXCHANGE OBTAINS ONLY THE PUBLIC VALUES AND CANNOT FEASIBLY COMPUTE THE SHARED SECRET WITHOUT SOLVING THE DISCRETE LOGARITHM PROBLEM WHICH GROWS EXPONENTIALLY HARDER AS THE KEY SIZE INCREASES',
  },
  {
    id: 35, difficulty: 'hard', title: 'The RSA Algorithm',
    source: 'Rivest, Shamir, Adleman, Communications of the ACM, 1978',
    text: 'THE SECURITY OF THE SCHEME RESTS ON THE DIFFICULTY OF FACTORING LARGE COMPOSITE NUMBERS THAT ARE THE PRODUCT OF TWO LARGE PRIMES WHILE IT IS STRAIGHTFORWARD TO MULTIPLY TWO LARGE PRIMES TOGETHER REVERSING THE PROCESS AND FINDING THE ORIGINAL PRIMES FROM THEIR PRODUCT REQUIRES COMPUTATIONAL EFFORT THAT GROWS SUPER-POLYNOMIALLY WITH THE SIZE OF THE NUMBER THE PUBLIC KEY CONSISTS OF THE MODULUS AND AN ENCRYPTION EXPONENT WHILE THE PRIVATE KEY IS THE CORRESPONDING DECRYPTION EXPONENT DERIVED FROM THE PRIME FACTORS',
  },
];

// ── Vigenère helpers ──────────────────────────────────────────────────

function vigenereEncrypt(plain: string, key: string): string {
  const k = key.toUpperCase().replace(/[^A-Z]/g, '');
  if (!k.length) return plain.toUpperCase().replace(/[^A-Z]/g, '');
  let ki = 0;
  return plain.toUpperCase().replace(/[^A-Z]/g, '').split('').map((c) => {
    const shift = k.charCodeAt(ki % k.length) - 65;
    ki++;
    return ALPHABET[(c.charCodeAt(0) - 65 + shift) % 26];
  }).join('');
}

function vigenereDecrypt(cipher: string, key: string): string {
  const k = key.toUpperCase().replace(/[^A-Z]/g, '');
  if (!k.length) return cipher;
  return cipher.toUpperCase().replace(/[^A-Z]/g, '').split('').map((c, i) => {
    const shift = k.charCodeAt(i % k.length) - 65;
    return ALPHABET[(c.charCodeAt(0) - 65 - shift + 26) % 26];
  }).join('');
}

// ── Kasiski helpers ───────────────────────────────────────────────────

function findRepeatedSequences(text: string, minLen: number, maxLen: number) {
  const seen = new Map<string, number[]>();
  for (let len = minLen; len <= maxLen; len++) {
    for (let i = 0; i <= text.length - len; i++) {
      const seq = text.slice(i, i + len);
      if (!seen.has(seq)) {
        const positions: number[] = [];
        let pos = text.indexOf(seq);
        while (pos !== -1) { positions.push(pos); pos = text.indexOf(seq, pos + 1); }
        if (positions.length >= 2) seen.set(seq, positions);
      }
    }
  }
  return [...seen.entries()].filter(([, p]) => p.length >= 2).map(([seq, positions]) => {
    const spacings: number[] = [];
    for (let i = 1; i < positions.length; i++) spacings.push(positions[i] - positions[0]);
    return { seq, positions, spacings };
  }).sort((a, b) => b.seq.length - a.seq.length || b.positions.length - a.positions.length).slice(0, 30);
}

function getFactors(n: number): number[] {
  const f: number[] = [];
  for (let i = 2; i <= 20 && i <= n; i++) if (n % i === 0) f.push(i);
  return f;
}

// ── Frequency / chi-squared ───────────────────────────────────────────

function letterCounts(text: string): number[] {
  const c = new Array(26).fill(0);
  for (const ch of text) { const i = ch.charCodeAt(0) - 65; if (i >= 0 && i < 26) c[i]++; }
  return c;
}

function chiSquared(counts: number[], shift: number): number {
  const N = counts.reduce((a, b) => a + b, 0);
  if (N === 0) return Infinity;
  let chi = 0;
  for (let i = 0; i < 26; i++) {
    const obs = counts[(i + shift) % 26];
    const exp = (ENGLISH_FREQ[i] / 100) * N;
    if (exp > 0) chi += (obs - exp) ** 2 / exp;
  }
  return chi;
}

function bestShift(counts: number[]): number {
  let best = 0, bestChi = Infinity;
  for (let s = 0; s < 26; s++) { const c = chiSquared(counts, s); if (c < bestChi) { bestChi = c; best = s; } }
  return best;
}

// ── UI helpers ────────────────────────────────────────────────────────

const STEPS = ['Input', 'Kasiski', 'Frequency', 'Result'];

const StepIndicator: React.FC<{ current: number }> = ({ current }) => (
  <div className="flex items-center gap-2 mb-8">
    {STEPS.map((label, i) => (
      <React.Fragment key={label}>
        {i > 0 && <ChevronRight size={14} className="text-slate-700" />}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
          i === current ? 'bg-red-950/50 text-red-400 border border-red-700/50'
          : i < current ? 'text-green-400 border border-green-900/40 bg-green-950/20'
          : 'text-slate-600 border border-slate-800'
        }`}>
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

type KeyType = 'word' | 'random';
type Difficulty = 'easy' | 'medium' | 'hard';

// ── Main component ────────────────────────────────────────────────────

const VigenereWorkshopApp: React.FC = () => {
  const [showInfo, setShowInfo] = useState(false);
  const [step, setStep] = useState(0);

  // ── Step 0 state ──
  const [inputMode, setInputMode] = useState<'encrypt' | 'paste' | 'challenge' | 'custom'>('encrypt');

  // Encrypt & Crack
  const [plaintext, setPlaintext] = useState(DEMO_PLAINTEXT);
  const [encryptKey, setEncryptKey] = useState(DEMO_KEY);

  // Paste
  const [pastedCipher, setPastedCipher] = useState('');

  // Challenge & Custom shared
  const [keyType, setKeyType] = useState<KeyType>('word');
  const [secretKey, setSecretKey] = useState('');
  const [revealKey, setRevealKey] = useState(false);

  // Challenge
  const [showChallengePicker, setShowChallengePicker] = useState(false);
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);

  // Custom ("Your Text")
  const [customPlaintext, setCustomPlaintext] = useState('');
  const [customDifficulty, setCustomDifficulty] = useState<Difficulty>('medium');
  const [customCiphertext, setCustomCiphertext] = useState('');
  const [customKeyAssigned, setCustomKeyAssigned] = useState(false);

  // ── Analysis state ──
  const [selectedKeyLen, setSelectedKeyLen] = useState<number | null>(null);
  const [activePos, setActivePos] = useState(0);
  const [shifts, setShifts] = useState<(number | null)[]>([]);
  const [locked, setLocked] = useState<boolean[]>([]);

  // ── Computed ciphertext ──
  const encryptedText = useMemo(
    () => (inputMode === 'encrypt' ? vigenereEncrypt(plaintext, encryptKey) : ''),
    [plaintext, encryptKey, inputMode],
  );

  const challengeCiphertext = useMemo(() => {
    if (inputMode !== 'challenge' || !activeChallenge || !secretKey) return '';
    return vigenereEncrypt(activeChallenge.text, secretKey);
  }, [inputMode, activeChallenge, secretKey]);

  const ciphertext =
    inputMode === 'encrypt'   ? encryptedText
    : inputMode === 'paste'   ? pastedCipher.toUpperCase().replace(/[^A-Z]/g, '')
    : inputMode === 'challenge' ? challengeCiphertext
    : customCiphertext; // 'custom'

  // ── Kasiski analysis ──
  const kasiskiResults = useMemo(() => findRepeatedSequences(ciphertext, 3, 5), [ciphertext]);

  const factorFreq = useMemo(() => {
    const freq: Record<number, number> = {};
    for (let f = 2; f <= 20; f++) freq[f] = 0;
    for (const r of kasiskiResults) for (const sp of r.spacings) for (const f of getFactors(sp)) freq[f]++;
    return freq;
  }, [kasiskiResults]);

  const topFactor = useMemo(() => {
    let bestF = 0, bestC = 0;
    for (const [fStr, c] of Object.entries(factorFreq)) { const f = Number(fStr); if (c > bestC) { bestF = f; bestC = c; } }
    return bestF;
  }, [factorFreq]);

  // ── Column analysis ──
  const columns = useMemo(() => {
    if (!selectedKeyLen) return [];
    const cols: string[] = Array(selectedKeyLen).fill('');
    for (let i = 0; i < ciphertext.length; i++) cols[i % selectedKeyLen] += ciphertext[i];
    return cols;
  }, [ciphertext, selectedKeyLen]);

  const columnCounts = useMemo(() => columns.map(letterCounts), [columns]);

  const recoveredKey = useMemo(
    () => shifts.map((s, i) => (s !== null && locked[i] ? ALPHABET[s] : '?')).join(''),
    [shifts, locked],
  );

  const allLocked = locked.length > 0 && locked.every(Boolean);

  const decryptedText = useMemo(() => {
    if (!allLocked || !selectedKeyLen) return '';
    return vigenereDecrypt(ciphertext, shifts.map((s) => ALPHABET[s!]).join(''));
  }, [allLocked, shifts, ciphertext, selectedKeyLen]);

  const partialDecrypt = useMemo(() => {
    if (!selectedKeyLen) return '';
    return ciphertext.split('').map((c, i) => {
      const pos = i % selectedKeyLen;
      if (locked[pos] && shifts[pos] !== null)
        return ALPHABET[(c.charCodeAt(0) - 65 - shifts[pos]! + 26) % 26];
      return '\u00B7';
    }).join('');
  }, [ciphertext, selectedKeyLen, shifts, locked]);

  const currentChi = useMemo(() => {
    if (!columnCounts[activePos] || shifts[activePos] === null) return null;
    return chiSquared(columnCounts[activePos], shifts[activePos]!);
  }, [columnCounts, activePos, shifts]);

  const matchQuality = currentChi === null ? null
    : currentChi < 30 ? 'great' : currentChi < 60 ? 'good' : currentChi < 120 ? 'fair' : 'poor';

  const activeMaxCount = useMemo(
    () => (!columnCounts[activePos] ? 1 : Math.max(...columnCounts[activePos], 1)),
    [columnCounts, activePos],
  );
  const maxEnglishFreq = Math.max(...ENGLISH_FREQ);

  // ── Actions ──

  const startChallenge = useCallback((challenge: Challenge) => {
    const key = pickKey(challenge.difficulty, keyType);
    setActiveChallenge(challenge);
    setSecretKey(key);
    setRevealKey(false);
    setShowChallengePicker(false);
  }, [keyType]);

  const randomChallenge = useCallback(() => {
    startChallenge(CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)]);
  }, [startChallenge]);

  const assignCustomKey = useCallback(() => {
    const clean = customPlaintext.toUpperCase().replace(/[^A-Z]/g, '');
    if (clean.length < 20) return;
    const key = pickKey(customDifficulty, keyType);
    setSecretKey(key);
    setCustomCiphertext(vigenereEncrypt(clean, key));
    setCustomKeyAssigned(true);
    setRevealKey(false);
  }, [customPlaintext, customDifficulty, keyType]);

  const startCracking = useCallback(() => {
    if (ciphertext.length < 20) return;
    setRevealKey(false);
    setStep(1);
    setSelectedKeyLen(null);
  }, [ciphertext]);

  const confirmKeyLength = useCallback(() => {
    if (!selectedKeyLen) return;
    setShifts(new Array(selectedKeyLen).fill(null));
    setLocked(new Array(selectedKeyLen).fill(false));
    setActivePos(0);
    setStep(2);
  }, [selectedKeyLen]);

  const setShiftAt = useCallback((val: number) => {
    setShifts((prev) => { const n = [...prev]; n[activePos] = val; return n; });
  }, [activePos]);

  const lockPosition = useCallback(() => {
    setLocked((prev) => { const n = [...prev]; n[activePos] = true; return n; });
    if (selectedKeyLen) {
      for (let i = 1; i < selectedKeyLen; i++) {
        const next = (activePos + i) % selectedKeyLen;
        if (!locked[next]) { setActivePos(next); break; }
      }
    }
  }, [activePos, locked, selectedKeyLen]);

  const autoHint = useCallback(() => {
    if (!columnCounts[activePos]) return;
    setShiftAt(bestShift(columnCounts[activePos]));
  }, [activePos, columnCounts, setShiftAt]);

  const [copied, setCopied] = useState(false);
  const copyResult = useCallback(() => {
    navigator.clipboard.writeText(decryptedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [decryptedText]);

  const resetAll = useCallback(() => {
    setStep(0); setSelectedKeyLen(null); setShifts([]); setLocked([]); setRevealKey(false);
    if (inputMode === 'custom') { setCustomKeyAssigned(false); setCustomCiphertext(''); setSecretKey(''); }
  }, [inputMode]);

  const isHiddenMode = inputMode === 'challenge' || inputMode === 'custom';
  const challengeSuccess = isHiddenMode && allLocked && recoveredKey === secretKey;
  const challengePartial = isHiddenMode && allLocked && recoveredKey !== secretKey && recoveredKey.length === secretKey.length;

  // ── Key type selector component ──
  const KeyTypeSelector = (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Key type</span>
      {(['word', 'random'] as const).map((kt) => (
        <button
          key={kt}
          onClick={() => setKeyType(kt)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            keyType === kt
              ? 'bg-red-950/50 text-red-400 border-red-700/50'
              : 'border-slate-700 text-slate-500 hover:text-white hover:border-slate-500'
          }`}
        >
          {kt === 'word' ? <KeyRound size={11} /> : <Dice5 size={11} />}
          {kt === 'word' ? 'Real word' : 'Random letters'}
        </button>
      ))}
    </div>
  );

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
          <button onClick={() => setShowInfo(!showInfo)}
            className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors">
            {showInfo ? <X size={20} /> : <Info size={20} />}
          </button>
        </div>

        {/* Info panel */}
        {showInfo && (
          <div className="mb-8 bg-red-950/20 border border-red-900/40 rounded-xl p-6 text-sm text-slate-300 leading-relaxed">
            <h3 className="text-red-400 font-bold mb-2">Breaking "le chiffre indechiffrable"</h3>
            <p className="mb-3">The Vigenere cipher resisted cryptanalysis for nearly three centuries. Two men independently cracked it: <strong className="text-white">Charles Babbage</strong> (~1854) and <strong className="text-white">Friedrich Kasiski</strong> (1863).</p>
            <p className="mb-3"><strong className="text-white">The Kasiski Examination:</strong> Repeated plaintext fragments encrypted by the same key position produce identical ciphertext. Spacings between repeats are multiples of the key length.</p>
            <p className="mb-3">Once the key length is known, the polyalphabetic cipher collapses into independent Caesar ciphers — each solvable by frequency analysis.</p>
            <p className="text-slate-500 text-xs">Reference: Simon Singh, <em>The Code Book</em>, Chapter 2.</p>
          </div>
        )}

        <StepIndicator current={step} />

        {/* ═══════════ STEP 0 ═══════════ */}
        {step === 0 && (
          <div className="space-y-6">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">

              {/* Mode tabs */}
              <div className="flex flex-wrap items-center gap-2 mb-5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">Mode</label>
                {([
                  { id: 'encrypt',   label: 'Encrypt & Crack', icon: <KeyRound size={11} /> },
                  { id: 'paste',     label: 'Paste Ciphertext', icon: null },
                  { id: 'challenge', label: 'Challenge',        icon: <ShieldQuestion size={11} /> },
                  { id: 'custom',    label: 'Your Text',        icon: <Type size={11} /> },
                ] as const).map(({ id, label, icon }) => (
                  <button key={id} onClick={() => setInputMode(id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      inputMode === id
                        ? 'bg-red-950/50 text-red-400 border-red-700/50'
                        : 'text-slate-500 hover:text-white border-slate-700 hover:border-slate-500'
                    }`}>
                    {icon}{label}
                  </button>
                ))}
                <button onClick={() => { setInputMode('encrypt'); setPlaintext(DEMO_PLAINTEXT); setEncryptKey(DEMO_KEY); }}
                  className="ml-auto text-[10px] px-2 py-1 rounded border border-slate-700 text-slate-500 hover:text-red-400 hover:border-red-700/50 transition-colors">
                  Load Demo
                </button>
              </div>

              {/* ── Encrypt & Crack ── */}
              {inputMode === 'encrypt' && (
                <>
                  <div className="mb-4">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Plaintext <span className="text-slate-600 font-normal normal-case">— type your own or use the demo</span>
                    </label>
                    <textarea value={plaintext} onChange={(e) => setPlaintext(e.target.value)}
                      className="bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-red-700/50 w-full h-24 resize-none"
                      placeholder="Type your own plaintext..." />
                  </div>
                  <div className="flex items-center gap-3 mb-4 flex-wrap">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Key <span className="text-slate-600 font-normal normal-case">— type any word or letters</span>
                    </label>
                    <input value={encryptKey}
                      onChange={(e) => setEncryptKey(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
                      className="bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-2 font-mono text-sm text-white focus:outline-none focus:border-red-700/50 w-48"
                      placeholder="e.g. SECRET" />
                    <div className="flex flex-wrap gap-1">
                      {['LEMON','SECRET','KASISKI','CRYPTO','BABBAGE','ENIGMA','BLETCHLEY','POLYALPHABETIC'].map((k) => (
                        <button key={k} onClick={() => setEncryptKey(k)}
                          className={`px-2 py-1 text-[10px] font-mono rounded border transition-colors ${
                            encryptKey === k ? 'border-red-700/50 text-red-400 bg-red-950/30' : 'border-slate-700 text-slate-500 hover:text-white'
                          }`}>{k}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Ciphertext <span className="text-slate-600 font-normal">(key: &ldquo;{encryptKey}&rdquo;, length {encryptKey.length})</span>
                    </label>
                    <div className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-3 font-mono text-sm text-red-300 min-h-[3rem] break-all leading-relaxed">
                      {encryptedText || <span className="text-slate-600">Encrypted text appears here...</span>}
                    </div>
                    <div className="text-xs text-slate-600 mt-1">{ciphertext.length} letters</div>
                  </div>
                </>
              )}

              {/* ── Paste ── */}
              {inputMode === 'paste' && (
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Ciphertext <span className="text-slate-600 font-normal normal-case">— paste any Vigenère-encrypted text</span>
                  </label>
                  <textarea value={pastedCipher} onChange={(e) => setPastedCipher(e.target.value)}
                    className="bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-red-700/50 w-full h-32 resize-none"
                    placeholder="Paste Vigenère ciphertext here..." />
                  <div className="text-xs text-slate-600 mt-1">{ciphertext.length} letters</div>
                </div>
              )}

              {/* ── Challenge ── */}
              {inputMode === 'challenge' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    {KeyTypeSelector}
                    <div className="ml-auto flex gap-2">
                      <button onClick={() => setShowChallengePicker(!showChallengePicker)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                          showChallengePicker ? 'bg-red-950/50 text-red-400 border-red-700/50' : 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'
                        }`}>
                        <BookOpen size={12} /> Choose Challenge
                      </button>
                      <button onClick={randomChallenge}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors">
                        <Shuffle size={12} /> Random
                      </button>
                    </div>
                  </div>

                  {showChallengePicker && (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-80 overflow-y-auto pr-1">
                      {CHALLENGES.map((c) => (
                        <button key={c.id} onClick={() => startChallenge(c)}
                          className={`text-left px-3 py-2.5 rounded-lg border transition-colors ${
                            activeChallenge?.id === c.id ? 'border-red-700/60 bg-red-950/30' : 'border-slate-700 bg-slate-800/40 hover:border-slate-500 hover:bg-slate-800/70'
                          }`}>
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <span className="text-xs font-bold text-slate-200 leading-tight">{c.title}</span>
                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border shrink-0 ${DIFF_COLOR[c.difficulty]}`}>{c.difficulty}</span>
                          </div>
                          <div className="text-[10px] text-slate-600 font-mono">{c.source}</div>
                        </button>
                      ))}
                    </div>
                  )}

                  {activeChallenge ? (
                    <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-bold text-white">{activeChallenge.title}</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">{activeChallenge.source}</div>
                        </div>
                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded border ${DIFF_COLOR[activeChallenge.difficulty]}`}>{activeChallenge.difficulty}</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/60 rounded-lg border border-slate-700/60">
                        <ShieldQuestion size={14} className="text-amber-400 shrink-0" />
                        <span className="text-xs text-amber-400 font-medium">Key hidden — {keyType === 'word' ? 'real word key' : 'random letter key'}</span>
                        <span className="ml-auto text-[10px] text-slate-600 font-mono">Length: {secretKey.length}</span>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Ciphertext ({challengeCiphertext.length} letters)</label>
                        <div className="font-mono text-xs text-red-300 break-all leading-relaxed max-h-24 overflow-y-auto">{challengeCiphertext}</div>
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

              {/* ── Your Text (custom) ── */}
              {inputMode === 'custom' && (
                <div className="space-y-4">
                  {!customKeyAssigned ? (
                    <>
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Your Plaintext <span className="text-slate-600 font-normal normal-case">— the program will encrypt it with a secret key</span>
                        </label>
                        <textarea value={customPlaintext} onChange={(e) => { setCustomPlaintext(e.target.value); setCustomKeyAssigned(false); }}
                          className="bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-red-700/50 w-full h-28 resize-none"
                          placeholder="Type or paste any text here (minimum ~60 letters for Kasiski to work well)..." />
                        <div className="text-xs text-slate-600 mt-1">
                          {customPlaintext.toUpperCase().replace(/[^A-Z]/g, '').length} letters
                        </div>
                      </div>

                      {/* Difficulty + key type */}
                      <div className="flex flex-wrap gap-4 items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Difficulty</span>
                          {(['easy', 'medium', 'hard'] as const).map((d) => (
                            <button key={d} onClick={() => setCustomDifficulty(d)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold border uppercase transition-colors ${
                                customDifficulty === d ? DIFF_COLOR[d] : 'border-slate-700 text-slate-500 hover:text-white hover:border-slate-500'
                              }`}>{d}</button>
                          ))}
                        </div>
                        {KeyTypeSelector}
                      </div>

                      <div className="text-xs text-slate-500 bg-slate-800/40 rounded-lg px-3 py-2 border border-slate-700/60">
                        {keyType === 'word' ? (
                          <>Key will be a real word: {customDifficulty === 'easy' ? '3–5 letters' : customDifficulty === 'medium' ? '5–9 letters' : '7–15 letters'}</>
                        ) : (
                          <>Key will be random letters: {customDifficulty === 'easy' ? '3–5 letters' : customDifficulty === 'medium' ? '5–8 letters' : '7–13 letters'}</>
                        )}
                      </div>

                      <button onClick={assignCustomKey}
                        disabled={customPlaintext.toUpperCase().replace(/[^A-Z]/g, '').length < 20}
                        className="w-full py-2.5 rounded-xl bg-amber-950/40 border border-amber-700/50 text-amber-400 font-bold text-sm hover:bg-amber-950/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                        <Lock size={14} /> Assign Secret Key &amp; Encrypt
                      </button>
                    </>
                  ) : (
                    <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-white">Your text — encrypted</span>
                        <button onClick={() => { setCustomKeyAssigned(false); setCustomCiphertext(''); setSecretKey(''); }}
                          className="text-[10px] text-slate-500 hover:text-red-400 border border-slate-700 hover:border-red-700/50 px-2 py-1 rounded transition-colors">
                          Change text
                        </button>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/60 rounded-lg border border-slate-700/60">
                        <ShieldQuestion size={14} className="text-amber-400 shrink-0" />
                        <span className="text-xs text-amber-400 font-medium">
                          Secret {keyType === 'word' ? 'word' : 'random'} key assigned — {customDifficulty} difficulty
                        </span>
                        <span className="ml-auto text-[10px] text-slate-600 font-mono">Length: {secretKey.length}</span>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Ciphertext ({customCiphertext.length} letters)</label>
                        <div className="font-mono text-xs text-red-300 break-all leading-relaxed max-h-24 overflow-y-auto">{customCiphertext}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button onClick={startCracking} disabled={ciphertext.length < 20}
              className="w-full py-3 rounded-xl bg-red-950/40 border border-red-700/50 text-red-400 font-bold text-sm hover:bg-red-950/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              Start Cracking <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* ═══════════ STEP 1: KASISKI ═══════════ */}
        {step === 1 && (
          <div className="space-y-6">
            {isHiddenMode && (
              <div className="flex items-center gap-3 px-4 py-3 bg-amber-950/20 border border-amber-800/40 rounded-xl">
                <ShieldQuestion size={16} className="text-amber-400 shrink-0" />
                <span className="text-xs font-bold text-amber-400">
                  {inputMode === 'challenge' && activeChallenge ? activeChallenge.title : 'Your text'} — key is hidden (length: {secretKey.length})
                </span>
                {inputMode === 'challenge' && activeChallenge && (
                  <span className={`ml-auto text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${DIFF_COLOR[activeChallenge.difficulty]}`}>{activeChallenge.difficulty}</span>
                )}
              </div>
            )}

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Ciphertext ({ciphertext.length} letters)</label>
              <div className="font-mono text-xs text-slate-400 break-all leading-relaxed max-h-24 overflow-y-auto">{ciphertext}</div>
            </div>

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
                            {r.spacings.flatMap(getFactors).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b).join(', ')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-bold text-slate-300 mb-4">Factor Frequency — Select Likely Key Length</h3>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 19 }, (_, i) => i + 2).map((f) => {
                  const count = factorFreq[f] || 0;
                  const isTop = f === topFactor && count > 0;
                  const isSelected = f === selectedKeyLen;
                  return (
                    <button key={f} onClick={() => setSelectedKeyLen(f)}
                      className={`relative px-4 py-3 rounded-lg text-sm font-mono font-bold transition-all ${
                        isSelected ? 'bg-red-950/60 text-red-400 border-2 border-red-600 shadow-lg shadow-red-900/30'
                        : isTop ? 'bg-red-950/30 text-red-400 border border-red-800/60 ring-1 ring-red-700/40'
                        : count > 0 ? 'bg-slate-800/60 text-slate-300 border border-slate-700 hover:border-slate-500'
                        : 'bg-slate-900/30 text-slate-600 border border-slate-800'
                      }`}>
                      {f}
                      {count > 0 && (
                        <span className={`absolute -top-2 -right-2 text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isTop ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300'}`}>{count}</span>
                      )}
                    </button>
                  );
                })}
              </div>
              {topFactor > 0 && (
                <p className="text-xs text-slate-500 mt-3">
                  Most common factor: <span className="text-red-400 font-bold">{topFactor}</span> ({factorFreq[topFactor]} times) — most likely key length.
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(0)} className="px-6 py-3 rounded-xl border border-slate-700 text-slate-400 font-bold text-sm hover:border-slate-500 transition-colors">Back</button>
              <button onClick={confirmKeyLength} disabled={!selectedKeyLen}
                className="flex-1 py-3 rounded-xl bg-red-950/40 border border-red-700/50 text-red-400 font-bold text-sm hover:bg-red-950/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                Use Key Length {selectedKeyLen || '?'} <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ═══════════ STEP 2: FREQUENCY ═══════════ */}
        {step === 2 && selectedKeyLen && (
          <div className="space-y-6">
            {isHiddenMode && (
              <div className="flex items-center gap-3 px-4 py-3 bg-amber-950/20 border border-amber-800/40 rounded-xl">
                <ShieldQuestion size={16} className="text-amber-400 shrink-0" />
                <span className="text-xs font-bold text-amber-400">Key still hidden — key length {secretKey.length}</span>
              </div>
            )}

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-bold text-slate-300 mb-3">Key Positions</h3>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: selectedKeyLen }, (_, i) => (
                  <button key={i} onClick={() => setActivePos(i)}
                    className={`px-3 py-2 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                      i === activePos ? 'bg-red-950/60 text-red-400 border-2 border-red-600'
                      : locked[i] ? 'bg-green-950/30 text-green-400 border border-green-800/50'
                      : 'bg-slate-800/60 text-slate-400 border border-slate-700 hover:border-slate-500'
                    }`}>
                    L{i + 1}
                    {locked[i] && <Check size={12} className="text-green-400" />}
                    {locked[i] && shifts[i] !== null && <span className="text-green-300 ml-0.5">{ALPHABET[shifts[i]!]}</span>}
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

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-300">Position {activePos + 1} — Frequency Matcher</h3>
                <div className="flex items-center gap-3">
                  {currentChi !== null && (
                    <span className={`text-xs font-bold px-2 py-1 rounded ${
                      matchQuality === 'great' ? 'bg-green-950/40 text-green-400 border border-green-800/40'
                      : matchQuality === 'good' ? 'bg-green-950/30 text-green-300 border border-green-800/30'
                      : matchQuality === 'fair' ? 'bg-yellow-950/30 text-yellow-400 border border-yellow-800/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {matchQuality === 'great' ? 'Excellent' : matchQuality === 'good' ? 'Good' : matchQuality === 'fair' ? 'Fair' : 'Poor'} (X²={currentChi.toFixed(1)})
                    </span>
                  )}
                  <button onClick={autoHint}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700 text-slate-400 hover:text-yellow-400 hover:border-yellow-700/50 transition-colors">
                    <Lightbulb size={12} /> Best match
                  </button>
                </div>
              </div>

              <div className="flex items-end gap-[2px] h-52 mb-4">
                {ALPHABET.split('').map((letter, i) => {
                  const shift = shifts[activePos] ?? 0;
                  const observedIdx = (i + shift) % 26;
                  const obsCount = columnCounts[activePos]?.[observedIdx] ?? 0;
                  const totalInCol = columnCounts[activePos]?.reduce((a: number, b: number) => a + b, 0) || 1;
                  const obsPct = (obsCount / totalInCol) * 100;
                  const refPct = ENGLISH_FREQ[i];
                  const scale = Math.max(maxEnglishFreq, (activeMaxCount / totalInCol) * 100);
                  return (
                    <div key={letter} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                      <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-[10px] z-10 whitespace-nowrap">
                        <div className="text-red-300">Observed: {obsCount} ({obsPct.toFixed(1)}%)</div>
                        <div className="text-slate-400">English {letter}: {refPct.toFixed(1)}%</div>
                      </div>
                      <div className="w-full bg-slate-700/25 rounded-t-sm absolute bottom-5" style={{ height: `${Math.max((refPct / scale) * 88, 0)}%` }} />
                      <div className="w-full bg-red-500/70 rounded-t-sm relative z-[1] transition-all duration-150"
                        style={{ height: `${Math.max((obsPct / scale) * 88, 0)}%`, minHeight: obsCount > 0 ? '2px' : '0' }} />
                      <div className="text-[9px] mt-0.5 font-mono text-slate-500">{letter}</div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-4 mb-5 text-[10px] text-slate-500">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-red-500/70" /><span>Observed (shifted)</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-slate-700/25" /><span>Expected English</span></div>
              </div>

              <div className="bg-slate-800/40 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Shift Value</label>
                  <div className="text-lg font-mono font-bold">
                    <span className="text-slate-400">Shift: </span>
                    <span className="text-red-400">{shifts[activePos] ?? 0}</span>
                    <span className="text-slate-600 mx-2">&rarr;</span>
                    <span className="text-white">Key letter: {ALPHABET[shifts[activePos] ?? 0]}</span>
                  </div>
                </div>
                <input type="range" min={0} max={25} value={shifts[activePos] ?? 0}
                  onChange={(e) => setShiftAt(Number(e.target.value))}
                  className="w-full accent-red-500 h-2 cursor-pointer" />
                <div className="flex justify-between mt-1">
                  {ALPHABET.split('').map((l, i) => (
                    <span key={l} className={`text-[7px] font-mono ${i === (shifts[activePos] ?? 0) ? 'text-red-400 font-bold' : 'text-slate-700'}`}>{l}</span>
                  ))}
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Position {activePos + 1} column (every {selectedKeyLen}th letter)
                  </label>
                  <div className="font-mono text-xs text-red-300/70 break-all leading-relaxed max-h-16 overflow-y-auto">{columns[activePos]}</div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Decrypted preview (shift={shifts[activePos] ?? 0}, letter={ALPHABET[shifts[activePos] ?? 0]})
                  </label>
                  <div className="font-mono text-xs text-green-300/80 break-all leading-relaxed max-h-16 overflow-y-auto">
                    {columns[activePos]?.split('').map((c) => ALPHABET[(c.charCodeAt(0) - 65 - (shifts[activePos] ?? 0) + 26) % 26]).join('')}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <button onClick={lockPosition} disabled={shifts[activePos] === null}
                  className="w-full py-2.5 rounded-lg bg-green-950/30 border border-green-800/50 text-green-400 font-bold text-sm hover:bg-green-950/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  <Lock size={14} /> Lock Letter {ALPHABET[shifts[activePos] ?? 0]} for Position {activePos + 1}
                </button>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-bold text-slate-300 mb-3">Partial Decryption</h3>
              <div className="font-mono text-xs break-all leading-relaxed">
                {partialDecrypt.split('').map((c, i) => (
                  <span key={i} className={c === '\u00B7' ? 'text-slate-700' : 'text-white'}>{c}</span>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="px-6 py-3 rounded-xl border border-slate-700 text-slate-400 font-bold text-sm hover:border-slate-500 transition-colors">Back</button>
              {allLocked && (
                <button onClick={() => setStep(3)} className="flex-1 py-3 rounded-xl bg-red-950/40 border border-red-700/50 text-red-400 font-bold text-sm hover:bg-red-950/60 transition-colors flex items-center justify-center gap-2">
                  View Result <ChevronRight size={16} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ═══════════ STEP 3: RESULT ═══════════ */}
        {step === 3 && (
          <div className="space-y-6">

            {/* Hidden-mode result banner */}
            {isHiddenMode && (
              <div className={`rounded-xl border p-5 ${challengeSuccess ? 'bg-green-950/30 border-green-700/50' : challengePartial ? 'bg-amber-950/30 border-amber-700/50' : 'bg-slate-900/60 border-slate-800'}`}>
                <div className="flex items-center gap-3 mb-4">
                  {challengeSuccess ? <Check size={20} className="text-green-400" /> : <ShieldQuestion size={20} className="text-amber-400" />}
                  <h3 className={`text-sm font-bold ${challengeSuccess ? 'text-green-400' : 'text-amber-400'}`}>
                    {challengeSuccess ? 'Key cracked! Excellent work.' : challengePartial ? 'Close — some letters differ.' : 'Key comparison'}
                  </h3>
                  {inputMode === 'challenge' && activeChallenge && (
                    <span className={`ml-auto text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${DIFF_COLOR[activeChallenge.difficulty]}`}>{activeChallenge.difficulty}</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono mb-1">You recovered</div>
                    <div className="font-mono font-black text-2xl tracking-[0.3em] text-red-400">{recoveredKey}</div>
                    <div className="text-[10px] text-slate-600 mt-1 font-mono">length {recoveredKey.length}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono mb-1">{revealKey ? `Secret key (${keyType === 'word' ? 'word' : 'random'})` : 'Secret key'}</div>
                    {revealKey ? (
                      <>
                        <div className={`font-mono font-black text-2xl tracking-[0.3em] ${challengeSuccess ? 'text-green-400' : 'text-amber-400'}`}>{secretKey}</div>
                        <div className="text-[10px] text-slate-600 mt-1 font-mono">length {secretKey.length}</div>
                      </>
                    ) : (
                      <button onClick={() => setRevealKey(true)}
                        className="mt-1 flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors text-xs font-medium">
                        <Lock size={12} /> Reveal secret key
                      </button>
                    )}
                  </div>
                </div>
                {revealKey && !challengeSuccess && (
                  <div className="mt-4 flex gap-2 flex-wrap">
                    {Array.from({ length: Math.max(recoveredKey.length, secretKey.length) }).map((_, i) => (
                      <span key={i} className={`font-mono text-sm px-2 py-1 rounded border ${
                        recoveredKey[i] === secretKey[i]
                          ? 'text-green-400 border-green-800/50 bg-green-950/20'
                          : 'text-red-400 border-red-800/50 bg-red-950/20'
                      }`}>
                        {recoveredKey[i] ?? '?'}
                        <span className="text-[9px] block text-center opacity-60">{secretKey[i] ?? '?'}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Visible-mode recovered key */}
            {!isHiddenMode && (
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
                    const q = chi < 30 ? 'great' : chi < 60 ? 'good' : chi < 120 ? 'fair' : 'poor';
                    return (
                      <div key={i} className={`px-3 py-1.5 rounded-lg text-xs font-mono border ${
                        q === 'great' ? 'border-green-800/40 text-green-400 bg-green-950/20'
                        : q === 'good' ? 'border-green-800/30 text-green-300 bg-green-950/10'
                        : q === 'fair' ? 'border-yellow-800/30 text-yellow-400 bg-yellow-950/10'
                        : 'border-slate-700 text-slate-400 bg-slate-800/30'
                      }`}>
                        L{i + 1}={ALPHABET[s]} <span className="text-[10px] opacity-60">(X²={chi.toFixed(0)})</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-300">Decrypted Plaintext</h3>
                <button onClick={copyResult}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors">
                  {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="font-mono text-sm text-white break-all leading-relaxed bg-slate-800/40 rounded-lg p-4">{decryptedText}</div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-bold text-slate-300 mb-3">Original Ciphertext</h3>
              <div className="font-mono text-xs text-slate-500 break-all leading-relaxed">{ciphertext}</div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="px-6 py-3 rounded-xl border border-slate-700 text-slate-400 font-bold text-sm hover:border-slate-500 transition-colors">
                Back to Frequency
              </button>
              <button onClick={resetAll} className="flex-1 py-3 rounded-xl bg-red-950/40 border border-red-700/50 text-red-400 font-bold text-sm hover:bg-red-950/60 transition-colors">
                {isHiddenMode ? 'Try Another Challenge' : 'Crack Another Message'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VigenereWorkshopApp;
