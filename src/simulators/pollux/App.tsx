import React, { useState, useMemo } from 'react';
import { Info, RotateCcw, Shuffle } from 'lucide-react';

// ─── Morse code tables ──────────────────────────────────────────────────
const CHAR_TO_MORSE: Record<string, string> = {
  'A': '.-',    'B': '-...',  'C': '-.-.',  'D': '-..',   'E': '.',
  'F': '..-.',  'G': '--.',   'H': '....',  'I': '..',    'J': '.---',
  'K': '-.-',   'L': '.-..',  'M': '--',    'N': '-.',    'O': '---',
  'P': '.--.',  'Q': '--.-',  'R': '.-.',   'S': '...',   'T': '-',
  'U': '..-',   'V': '...-',  'W': '.--',   'X': '-..-',  'Y': '-.--',
  'Z': '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
  '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
};
const MORSE_TO_CHAR: Record<string, string> = {};
for (const [c, m] of Object.entries(CHAR_TO_MORSE)) MORSE_TO_CHAR[m] = c;

type PolluxElement = 'dot' | 'dash' | 'separator';

interface PolluxKey {
  // Each digit 0-9 maps to dot, dash, or separator
  mapping: Record<string, PolluxElement>;
}

const DEFAULT_KEY: PolluxKey = {
  mapping: {
    '0': 'dot',
    '1': 'dash',
    '2': 'separator',
    '3': 'dot',
    '4': 'dash',
    '5': 'separator',
    '6': 'dot',
    '7': 'dash',
    '8': 'separator',
    '9': 'dot',
  },
};

function randomizeKey(): PolluxKey {
  const digits = ['0','1','2','3','4','5','6','7','8','9'];
  const shuffled = [...digits].sort(() => Math.random() - 0.5);
  const mapping: Record<string, PolluxElement> = {};
  // Ensure at least 2 of each type
  const types: PolluxElement[] = ['dot', 'dot', 'dot', 'dash', 'dash', 'dash', 'separator', 'separator', 'separator'];
  // 10th digit gets a random assignment
  types.push(['dot', 'dash', 'separator'][Math.floor(Math.random() * 3)] as PolluxElement);
  // Shuffle types
  types.sort(() => Math.random() - 0.5);
  shuffled.forEach((d, i) => { mapping[d] = types[i]; });
  return { mapping };
}

function getDigitsForElement(key: PolluxKey, element: PolluxElement): string[] {
  return Object.entries(key.mapping)
    .filter(([, el]) => el === element)
    .map(([digit]) => digit);
}

function polluxEncrypt(plaintext: string, key: PolluxKey): { ciphertext: string; morseIntermediate: string } {
  const clean = plaintext.toUpperCase().replace(/[^A-Z0-9 ]/g, '');
  const words = clean.split(/\s+/).filter(Boolean);
  const morseWords: string[] = [];
  const cipherDigits: string[] = [];

  for (let w = 0; w < words.length; w++) {
    const word = words[w];
    const morseParts: string[] = [];

    for (let c = 0; c < word.length; c++) {
      const morse = CHAR_TO_MORSE[word[c]];
      if (!morse) continue;
      morseParts.push(morse);

      // Encode each dot/dash
      for (const element of morse) {
        const type: PolluxElement = element === '.' ? 'dot' : 'dash';
        const options = getDigitsForElement(key, type);
        cipherDigits.push(options[Math.floor(Math.random() * options.length)]);
      }

      // Letter separator (between characters within a word)
      if (c < word.length - 1) {
        const sepOptions = getDigitsForElement(key, 'separator');
        cipherDigits.push(sepOptions[Math.floor(Math.random() * sepOptions.length)]);
      }
    }

    morseWords.push(morseParts.join(' '));

    // Word separator = two separator digits
    if (w < words.length - 1) {
      const sepOptions = getDigitsForElement(key, 'separator');
      cipherDigits.push(sepOptions[Math.floor(Math.random() * sepOptions.length)]);
      cipherDigits.push(sepOptions[Math.floor(Math.random() * sepOptions.length)]);
    }
  }

  return {
    ciphertext: cipherDigits.join(''),
    morseIntermediate: morseWords.join(' / '),
  };
}

function polluxDecrypt(ciphertext: string, key: PolluxKey): { plaintext: string; morseIntermediate: string } {
  const digits = ciphertext.replace(/[^0-9]/g, '').split('');
  let morseStr = '';
  let consecutiveSeps = 0;

  for (const d of digits) {
    const element = key.mapping[d];
    if (!element) continue;

    if (element === 'dot') {
      if (consecutiveSeps >= 2) morseStr += ' / ';
      else if (consecutiveSeps === 1) morseStr += ' ';
      consecutiveSeps = 0;
      morseStr += '.';
    } else if (element === 'dash') {
      if (consecutiveSeps >= 2) morseStr += ' / ';
      else if (consecutiveSeps === 1) morseStr += ' ';
      consecutiveSeps = 0;
      morseStr += '-';
    } else {
      consecutiveSeps++;
    }
  }

  // Decode morse to text
  const parts = morseStr.split(' ');
  let plaintext = '';
  for (const part of parts) {
    if (part === '/') {
      plaintext += ' ';
    } else if (part) {
      plaintext += MORSE_TO_CHAR[part] || '?';
    }
  }

  return { plaintext: plaintext.trim(), morseIntermediate: morseStr };
}

function App() {
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [input, setInput] = useState('');
  const [key, setKey] = useState<PolluxKey>(DEFAULT_KEY);
  const [showInfo, setShowInfo] = useState(false);
  const [encryptTrigger, setEncryptTrigger] = useState(0); // force re-encryption for randomness

  const result = useMemo(() => {
    if (!input) return null;
    if (mode === 'encrypt') {
      void encryptTrigger; // dependency for re-randomizing digit choices
      return polluxEncrypt(input, key);
    } else {
      return polluxDecrypt(input, key);
    }
  }, [input, key, mode, encryptTrigger]);

  const elementColor = (el: PolluxElement) => {
    if (el === 'dot') return 'bg-teal-900/60 border-teal-700 text-teal-300';
    if (el === 'dash') return 'bg-amber-900/60 border-amber-700 text-amber-300';
    return 'bg-pink-900/60 border-pink-700 text-pink-300';
  };

  const elementLabel = (el: PolluxElement) => {
    if (el === 'dot') return '·';
    if (el === 'dash') return '—';
    return '×';
  };

  const cycleMapping = (digit: string) => {
    const order: PolluxElement[] = ['dot', 'dash', 'separator'];
    const current = key.mapping[digit];
    const next = order[(order.indexOf(current) + 1) % 3];
    setKey({ mapping: { ...key.mapping, [digit]: next } });
  };

  // Count of each element type
  const counts = useMemo(() => {
    const c = { dot: 0, dash: 0, separator: 0 };
    Object.values(key.mapping).forEach(el => c[el]++);
    return c;
  }, [key]);

  const isValidKey = counts.dot >= 1 && counts.dash >= 1 && counts.separator >= 1;

  return (
    <div className="flex-1 bg-[#0f1418] flex flex-col items-center justify-start py-10 px-6 text-stone-200">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl sm:text-4xl font-typewriter font-bold text-stone-100 tracking-tighter">
              POLLUX <span className="text-teal-500">CIPHER</span>
            </h1>
            <span className="text-stone-500 text-xs tracking-[0.3em] font-mono">MORSE-NUMERIC SUBSTITUTION — WWII ERA</span>
          </div>
          <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-lg hover:bg-stone-800 text-stone-400 border border-stone-700">
            <Info size={20} />
          </button>
        </div>

        {/* Key Configuration */}
        <div className="bg-stone-900/60 rounded-2xl border border-stone-800 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold">
              Pollux Key — Click digits to cycle assignment
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setKey(randomizeKey())}
                className="flex items-center gap-1 px-3 py-1 rounded text-xs font-bold border bg-stone-800 border-stone-700 text-stone-400 hover:text-teal-300 hover:border-teal-700 transition-colors"
              >
                <Shuffle size={12} /> Randomize
              </button>
              <button
                onClick={() => setKey(DEFAULT_KEY)}
                className="flex items-center gap-1 px-3 py-1 rounded text-xs font-bold border bg-stone-800 border-stone-700 text-stone-400 hover:text-teal-300 transition-colors"
              >
                <RotateCcw size={12} /> Reset
              </button>
            </div>
          </div>

          {/* Digit → Element mapping grid */}
          <div className="flex justify-center gap-2 mb-4">
            {['0','1','2','3','4','5','6','7','8','9'].map(d => (
              <button
                key={d}
                onClick={() => cycleMapping(d)}
                className={`w-14 h-20 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all hover:scale-105 cursor-pointer ${elementColor(key.mapping[d])}`}
              >
                <span className="text-xl font-mono font-bold">{d}</span>
                <span className="text-lg">{elementLabel(key.mapping[d])}</span>
              </button>
            ))}
          </div>

          {/* Legend */}
          <div className="flex justify-center gap-6 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-teal-800 border border-teal-600 inline-block" />
              <span className="text-teal-400 font-bold">· Dot</span>
              <span className="text-stone-600">({counts.dot})</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-amber-800 border border-amber-600 inline-block" />
              <span className="text-amber-400 font-bold">— Dash</span>
              <span className="text-stone-600">({counts.dash})</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-pink-800 border border-pink-600 inline-block" />
              <span className="text-pink-400 font-bold">× Separator</span>
              <span className="text-stone-600">({counts.separator})</span>
            </span>
          </div>

          {!isValidKey && (
            <div className="mt-3 text-center text-xs text-red-400 font-bold">
              Key must have at least 1 digit assigned to each type (dot, dash, separator)
            </div>
          )}
        </div>

        {/* Mode toggle */}
        <div className="flex justify-center gap-2 mb-6">
          <button
            onClick={() => { setMode('encrypt'); setInput(''); }}
            className={`px-6 py-2 rounded-lg font-bold text-sm border transition-colors ${
              mode === 'encrypt' ? 'bg-teal-900/50 border-teal-700 text-teal-300' : 'bg-stone-800 border-stone-700 text-stone-400'
            }`}
          >ENCRYPT</button>
          <button
            onClick={() => { setMode('decrypt'); setInput(''); }}
            className={`px-6 py-2 rounded-lg font-bold text-sm border transition-colors ${
              mode === 'decrypt' ? 'bg-teal-900/50 border-teal-700 text-teal-300' : 'bg-stone-800 border-stone-700 text-stone-400'
            }`}
          >DECRYPT</button>
        </div>

        {/* Input */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-stone-400 font-bold uppercase tracking-wider">
              {mode === 'encrypt' ? 'Plaintext' : 'Ciphertext (digits)'}
            </label>
            {mode === 'encrypt' && input && (
              <button
                onClick={() => setEncryptTrigger(t => t + 1)}
                className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold border bg-stone-800 border-stone-700 text-stone-500 hover:text-teal-300 transition-colors"
                title="Re-encrypt with different random digit choices"
              >
                <Shuffle size={10} /> Re-roll
              </button>
            )}
          </div>
          <textarea
            value={input}
            onChange={e => setInput(mode === 'encrypt' ? e.target.value.toUpperCase() : e.target.value.replace(/[^0-9\s]/g, ''))}
            placeholder={mode === 'encrypt' ? 'TYPE YOUR MESSAGE...' : 'ENTER DIGIT SEQUENCE...'}
            className="w-full h-28 bg-stone-900 border border-stone-700 rounded-xl p-4 font-mono text-lg tracking-wider focus:outline-none focus:ring-2 focus:ring-teal-500/50 resize-none text-stone-200 placeholder-stone-700"
            spellCheck={false}
          />
        </div>

        {/* Morse intermediate */}
        {result && (
          <div className="mb-6">
            <label className="block text-xs text-stone-500 font-bold uppercase tracking-wider mb-2">
              Morse Intermediate
            </label>
            <div className="w-full min-h-[3rem] bg-stone-800/50 border border-stone-700/50 rounded-xl p-4 font-mono text-base tracking-wider text-stone-400 break-all">
              {result.morseIntermediate || <span className="text-stone-700">...</span>}
            </div>
          </div>
        )}

        {/* Output */}
        <div className="mb-8">
          <label className="block text-xs text-teal-400 font-bold uppercase tracking-wider mb-2">
            {mode === 'encrypt' ? 'Ciphertext' : 'Plaintext'}
          </label>
          <div className="w-full min-h-[3rem] bg-stone-800/50 border border-teal-900/30 rounded-xl p-4 font-mono text-lg tracking-[0.3em] text-teal-200 break-all">
            {result ? (mode === 'encrypt' ? (result as any).ciphertext : (result as any).plaintext) : <span className="text-stone-700">...</span>}
          </div>
        </div>

        {/* Step-by-step breakdown for encrypt */}
        {mode === 'encrypt' && result && input && (
          <div className="bg-stone-900/40 rounded-xl border border-stone-800 p-5 mb-6">
            <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-3">
              Encryption Breakdown
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="text-stone-500 border-b border-stone-800">
                    <th className="text-left py-1 pr-4">Letter</th>
                    <th className="text-left py-1 pr-4">Morse</th>
                    <th className="text-left py-1">Digits</th>
                  </tr>
                </thead>
                <tbody>
                  {input.toUpperCase().replace(/[^A-Z0-9 ]/g, '').split('').filter(c => CHAR_TO_MORSE[c]).map((char, i) => {
                    const morse = CHAR_TO_MORSE[char];
                    return (
                      <tr key={i} className="border-b border-stone-800/50">
                        <td className="py-1.5 pr-4 text-teal-300 font-bold">{char}</td>
                        <td className="py-1.5 pr-4 text-stone-400 tracking-wider">{morse}</td>
                        <td className="py-1.5 text-stone-300">
                          {morse.split('').map((el, j) => {
                            const type: PolluxElement = el === '.' ? 'dot' : 'dash';
                            const options = getDigitsForElement(key, type);
                            return (
                              <span key={j} className={`inline-block px-1 rounded mr-0.5 ${el === '.' ? 'text-teal-400' : 'text-amber-400'}`}>
                                [{options.join(',')}]
                              </span>
                            );
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Morse Reference */}
        <div className="bg-stone-900/40 rounded-xl border border-stone-800 p-5">
          <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-3">
            Morse Code Reference
          </div>
          <div className="grid grid-cols-6 sm:grid-cols-9 gap-1 mb-3">
            {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(c => (
              <div key={c} className="flex flex-col items-center py-2 px-1 rounded bg-stone-800/40 hover:bg-stone-800 transition-colors">
                <span className="text-sm font-bold text-teal-300">{c}</span>
                <span className="text-[10px] font-mono text-stone-500 tracking-wider">{CHAR_TO_MORSE[c]}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-1">
            {'0123456789'.split('').map(c => (
              <div key={c} className="flex flex-col items-center py-2 px-1 rounded bg-stone-800/40 hover:bg-stone-800 transition-colors">
                <span className="text-sm font-bold text-teal-300">{c}</span>
                <span className="text-[10px] font-mono text-stone-500 tracking-wider">{CHAR_TO_MORSE[c]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Info Panel */}
      <div className={`fixed bottom-0 left-0 right-0 bg-stone-900/95 backdrop-blur border-t border-stone-700 p-6 transform transition-transform duration-300 z-40 ${showInfo ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="max-w-3xl mx-auto relative">
          <button onClick={() => setShowInfo(false)} className="absolute top-0 right-0 p-2 text-stone-500 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <h3 className="text-xl font-bold text-teal-400 mb-2">About the Pollux Cipher</h3>
          <p className="text-sm text-stone-300 leading-relaxed mb-3">
            The <strong>Pollux cipher</strong> is a tomographic cipher that uses Morse code as an intermediate encoding step.
            Each digit (0–9) is assigned to represent either a <strong>dot</strong>, a <strong>dash</strong>, or a <strong>letter separator</strong>.
            Multiple digits can map to the same element, providing a form of homophonic substitution that frustrates frequency analysis.
          </p>
          <p className="text-sm text-stone-300 leading-relaxed mb-3">
            <strong>To encrypt:</strong> Convert plaintext to Morse, then replace each dot, dash, and separator with a randomly
            chosen digit from the assigned set. The result is a stream of digits. Because multiple digits can represent the same
            element, the same plaintext produces different ciphertexts each time.
          </p>
          <p className="text-sm text-stone-300 leading-relaxed">
            <strong>To decrypt:</strong> Look up each digit in the key to recover dots, dashes, and separators, then decode the
            Morse back to text. The key must be shared between sender and receiver. Named alongside its companion cipher
            <strong> Castor</strong>, both were used by resistance networks in WWII.
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
