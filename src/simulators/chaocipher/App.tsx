import React, { useState, useMemo } from 'react';
import { Info } from 'lucide-react';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

interface ChaocipherState {
  left: string;   // ciphertext alphabet (left disk)
  right: string;  // plaintext alphabet (right disk)
}

function chaocipherStep(state: ChaocipherState, plainChar: string, decrypt: boolean): { result: string; newState: ChaocipherState } {
  let left = state.left.split('');
  let right = state.right.split('');

  let result: string;
  let leftIndex: number;
  let rightIndex: number;

  if (!decrypt) {
    // Encrypt: find plainChar in right (plaintext) alphabet, output same-position from left (ciphertext)
    rightIndex = right.indexOf(plainChar);
    result = left[rightIndex];
    leftIndex = rightIndex;
  } else {
    // Decrypt: find cipherChar in left (ciphertext) alphabet, output same-position from right (plaintext)
    leftIndex = left.indexOf(plainChar);
    result = right[leftIndex];
    rightIndex = leftIndex;
  }

  // Permute LEFT alphabet:
  // 1. Rotate left alphabet so the output position is at index 0, then shift one more
  const leftShift = leftIndex + 1;
  left = [...left.slice(leftShift), ...left.slice(0, leftShift)];
  // 2. Extract element at index 1, insert it after index 13 (between positions 13 and 14)
  const extracted = left.splice(1, 1)[0];
  left.splice(13, 0, extracted);

  // Permute RIGHT alphabet:
  // 1. Rotate right alphabet so the input position is at index 0
  const rightShift = rightIndex;
  right = [...right.slice(rightShift), ...right.slice(0, rightShift)];
  // 2. Shift one more position
  right = [...right.slice(1), right[0]];
  // 3. Extract element at index 2, insert it after index 13
  const extracted2 = right.splice(2, 1)[0];
  right.splice(13, 0, extracted2);

  return {
    result,
    newState: { left: left.join(''), right: right.join('') },
  };
}

function processText(text: string, initialState: ChaocipherState, decrypt: boolean): {
  steps: { char: string; result: string; left: string; right: string }[];
  output: string;
} {
  const clean = text.toUpperCase().replace(/[^A-Z]/g, '');
  let state = { ...initialState };
  const steps: { char: string; result: string; left: string; right: string }[] = [];
  let output = '';

  for (const c of clean) {
    const { result, newState } = chaocipherStep(state, c, decrypt);
    steps.push({ char: c, result, left: newState.left, right: newState.right });
    output += result;
    state = newState;
  }

  return { steps, output };
}

// Shuffle alphabet with a keyword
function keyedAlphabet(keyword: string): string {
  const seen = new Set<string>();
  let result = '';
  for (const c of keyword.toUpperCase().replace(/[^A-Z]/g, '')) {
    if (!seen.has(c)) { result += c; seen.add(c); }
  }
  for (const c of ALPHABET) {
    if (!seen.has(c)) { result += c; seen.add(c); }
  }
  return result;
}

function App() {
  const [leftKey, setLeftKey] = useState('HXUCZVAMDSLKPEFJRIGTWOBNYQ');
  const [rightKey, setRightKey] = useState('PTLNBQDEOYSFAVZKGJRIHWXUMC');
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [showInfo, setShowInfo] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  const initialState: ChaocipherState = {
    left: leftKey.toUpperCase().replace(/[^A-Z]/g, '').padEnd(26, '?').slice(0, 26),
    right: rightKey.toUpperCase().replace(/[^A-Z]/g, '').padEnd(26, '?').slice(0, 26),
  };

  // Validate: both must be valid permutations
  const isValidAlphabet = (s: string) => {
    const clean = s.toUpperCase().replace(/[^A-Z]/g, '');
    return clean.length === 26 && new Set(clean).size === 26;
  };
  const leftValid = isValidAlphabet(leftKey);
  const rightValid = isValidAlphabet(rightKey);
  const isValid = leftValid && rightValid;

  const result = useMemo(() => {
    if (!isValid || !input) return null;
    return processText(input, initialState, mode === 'decrypt');
  }, [input, leftKey, rightKey, mode, isValid]);

  const handlePreset = () => {
    setLeftKey('HXUCZVAMDSLKPEFJRIGTWOBNYQ');
    setRightKey('PTLNBQDEOYSFAVZKGJRIHWXUMC');
  };

  const handleRandomize = () => {
    const shuffle = () => {
      const arr = ALPHABET.split('');
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr.join('');
    };
    setLeftKey(shuffle());
    setRightKey(shuffle());
  };

  return (
    <div className="flex-1 bg-[#141010] flex flex-col items-center justify-start py-10 px-6 text-stone-200">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl sm:text-4xl font-typewriter font-bold text-stone-100 tracking-tighter">
              CHAO<span className="text-red-400">CIPHER</span>
            </h1>
            <span className="text-stone-500 text-xs tracking-[0.3em] font-mono">MUTATING ALPHABET CIPHER — 1918</span>
          </div>
          <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-lg hover:bg-stone-800 text-stone-400 border border-stone-700">
            <Info size={20} />
          </button>
        </div>

        {/* Mode */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setMode('encrypt')} className={`px-4 py-2 rounded-lg text-sm font-bold tracking-wider transition-colors ${mode === 'encrypt' ? 'bg-red-500/20 text-red-300 border border-red-600/50' : 'bg-stone-800/50 text-stone-500 border border-stone-700 hover:text-stone-300'}`}>
            ENCRYPT
          </button>
          <button onClick={() => setMode('decrypt')} className={`px-4 py-2 rounded-lg text-sm font-bold tracking-wider transition-colors ${mode === 'decrypt' ? 'bg-red-500/20 text-red-300 border border-red-600/50' : 'bg-stone-800/50 text-stone-500 border border-stone-700 hover:text-stone-300'}`}>
            DECRYPT
          </button>
          <div className="w-px bg-stone-700 mx-1" />
          <button onClick={handlePreset} className="px-3 py-2 rounded-lg text-xs font-bold bg-stone-800/50 text-stone-500 border border-stone-700 hover:text-stone-300">
            Default
          </button>
          <button onClick={handleRandomize} className="px-3 py-2 rounded-lg text-xs font-bold bg-stone-800/50 text-stone-500 border border-stone-700 hover:text-stone-300">
            Random
          </button>
        </div>

        {/* Alphabet rings */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="bg-stone-900/60 rounded-xl border border-stone-800 p-5">
            <label className="block text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-2">
              Left Alphabet (Ciphertext) {!leftValid && <span className="text-red-400">— must be 26 unique letters</span>}
            </label>
            <input
              value={leftKey}
              onChange={e => setLeftKey(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
              maxLength={26}
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 font-mono text-sm tracking-widest text-red-300 focus:outline-none focus:ring-2 focus:ring-red-500/50 text-center"
            />
          </div>
          <div className="bg-stone-900/60 rounded-xl border border-stone-800 p-5">
            <label className="block text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-2">
              Right Alphabet (Plaintext) {!rightValid && <span className="text-red-400">— must be 26 unique letters</span>}
            </label>
            <input
              value={rightKey}
              onChange={e => setRightKey(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
              maxLength={26}
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 font-mono text-sm tracking-widest text-red-300 focus:outline-none focus:ring-2 focus:ring-red-500/50 text-center"
            />
          </div>
        </div>

        {/* Current alphabet state visualization */}
        {isValid && (
          <div className="bg-stone-900/60 rounded-xl border border-stone-800 p-5 mb-6">
            <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-3">Alphabet Disks (Initial State)</div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-stone-500 w-10 shrink-0">Left</span>
                <div className="flex gap-px flex-wrap">
                  {initialState.left.split('').map((c, i) => (
                    <div key={i} className="w-7 h-7 flex items-center justify-center font-mono text-[11px] rounded-sm bg-red-900/20 border border-red-900/30 text-red-300/80">
                      {c}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-stone-500 w-10 shrink-0">Right</span>
                <div className="flex gap-px flex-wrap">
                  {initialState.right.split('').map((c, i) => (
                    <div key={i} className="w-7 h-7 flex items-center justify-center font-mono text-[11px] rounded-sm bg-stone-800/40 border border-stone-700/50 text-stone-400">
                      {c}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="space-y-4 mb-8">
          <div>
            <label className="block text-xs text-stone-400 font-bold uppercase tracking-wider mb-2">
              {mode === 'encrypt' ? 'Plaintext' : 'Ciphertext'}
            </label>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value.toUpperCase())}
              placeholder={mode === 'encrypt' ? 'TYPE YOUR MESSAGE...' : 'PASTE CIPHERTEXT...'}
              className="w-full h-24 bg-stone-900 border border-stone-700 rounded-xl p-4 font-mono text-lg tracking-wider focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none text-stone-200 placeholder-stone-700"
              spellCheck={false}
            />
          </div>

          {/* Step-by-step toggle */}
          {result && result.steps.length > 0 && (
            <div>
              <button
                onClick={() => setShowSteps(!showSteps)}
                className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-2 hover:text-stone-300 transition-colors"
              >
                {showSteps ? '\u25BC' : '\u25B6'} Step-by-step alphabet mutation ({result.steps.length} steps)
              </button>
              {showSteps && (
                <div className="bg-stone-800/50 border border-stone-700/50 rounded-xl p-4 max-h-80 overflow-y-auto space-y-2">
                  {result.steps.map((step, i) => (
                    <div key={i} className="flex items-center gap-3 text-xs font-mono">
                      <span className="text-stone-600 w-6">{i + 1}.</span>
                      <span className="text-stone-400">{step.char}</span>
                      <span className="text-stone-600">{'\u2192'}</span>
                      <span className="text-red-300 font-bold">{step.result}</span>
                      <span className="text-stone-700 ml-2 hidden sm:inline">L: {step.left.slice(0, 10)}... R: {step.right.slice(0, 10)}...</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Output */}
          <div>
            <label className="block text-xs text-red-400 font-bold uppercase tracking-wider mb-2">
              {mode === 'encrypt' ? 'Ciphertext' : 'Recovered Plaintext'}
            </label>
            <div className="bg-stone-800/50 border border-stone-700/50 rounded-xl p-4 font-mono text-lg tracking-wider text-red-200 break-all min-h-[3rem]">
              {result?.output || <span className="text-stone-700">...</span>}
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="bg-red-950/20 rounded-xl border border-red-900/30 p-5">
          <div className="text-[10px] text-red-400 uppercase tracking-widest font-bold mb-3">How the Alphabets Mutate</div>
          <div className="text-xs text-stone-400 space-y-1">
            <p>After each letter, <strong>both</strong> alphabets are permuted:</p>
            <p className="text-stone-500">1. Left (cipher) alphabet: rotate to output position+1, then move index 1 to after index 13</p>
            <p className="text-stone-500">2. Right (plain) alphabet: rotate to input position+1, then move index 2 to after index 13</p>
            <p>This means the same letter encrypts differently every time — the alphabets are constantly changing.</p>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className={`fixed bottom-0 left-0 right-0 bg-stone-900/95 backdrop-blur border-t border-stone-700 p-6 transform transition-transform duration-300 z-40 ${showInfo ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="max-w-3xl mx-auto relative">
          <button onClick={() => setShowInfo(false)} className="absolute top-0 right-0 p-2 text-stone-500 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <h3 className="text-xl font-bold text-red-400 mb-2">About Chaocipher</h3>
          <p className="text-sm text-stone-300 leading-relaxed">
            Invented by <strong>John F. Byrne</strong> in 1918, Chaocipher uses two dynamically mutating alphabets —
            imagine two disks, each with the 26 letters arranged differently. To encrypt a letter, find it on the
            right (plaintext) disk and read the corresponding position on the left (ciphertext) disk. Then
            <strong> both disks are permuted</strong> according to specific rules, so the cipher changes with every
            single letter. Byrne spent his entire life trying to get the US government to adopt his cipher, even
            offering it for free — they never did. The algorithm remained <strong>secret until 2010</strong> when
            Byrne's family donated his papers to the National Cryptologic Museum. Despite its simplicity, no one
            has found an efficient cryptanalytic attack against it with a ciphertext-only scenario.
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
