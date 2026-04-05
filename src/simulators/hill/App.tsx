import React, { useState, useMemo } from 'react';
import { Info } from 'lucide-react';
import ExhibitPanel from '../../components/ExhibitPanel';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

function modInverse(a: number, m: number): number | null {
  const ag = mod(a, m);
  for (let x = 1; x < m; x++) {
    if (mod(ag * x, m) === 1) return x;
  }
  return null;
}

function det2(m: number[][]): number {
  return m[0][0] * m[1][1] - m[0][1] * m[1][0];
}

function det3(m: number[][]): number {
  return (
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
  );
}

function inverse2(m: number[][]): number[][] | null {
  const d = mod(det2(m), 26);
  const di = modInverse(d, 26);
  if (di === null) return null;
  return [
    [mod(m[1][1] * di, 26), mod(-m[0][1] * di, 26)],
    [mod(-m[1][0] * di, 26), mod(m[0][0] * di, 26)],
  ];
}

function inverse3(m: number[][]): number[][] | null {
  const d = mod(det3(m), 26);
  const di = modInverse(d, 26);
  if (di === null) return null;
  const cofactors: number[][] = [];
  for (let i = 0; i < 3; i++) {
    cofactors[i] = [];
    for (let j = 0; j < 3; j++) {
      const minor = m
        .filter((_, ri) => ri !== i)
        .map(row => row.filter((_, ci) => ci !== j));
      const sign = (i + j) % 2 === 0 ? 1 : -1;
      cofactors[i][j] = mod(sign * det2(minor) * di, 26);
    }
  }
  // Transpose cofactor matrix
  const inv: number[][] = [[], [], []];
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      inv[j][i] = cofactors[i][j];
  return inv;
}

function multiply(matrix: number[][], vec: number[]): number[] {
  const n = matrix.length;
  const result: number[] = [];
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < n; j++) sum += matrix[i][j] * vec[j];
    result.push(mod(sum, 26));
  }
  return result;
}

function hillProcess(text: string, matrix: number[][], size: number): { blocks: { input: number[]; output: number[] }[]; result: string } | null {
  const inv = size === 2 ? inverse2(matrix) : inverse3(matrix);
  if (!inv && size > 0) { /* we'll check validity separately */ }

  const clean = text.toUpperCase().replace(/[^A-Z]/g, '');
  if (!clean) return null;

  // Pad with X
  let padded = clean;
  while (padded.length % size !== 0) padded += 'X';

  const blocks: { input: number[]; output: number[] }[] = [];
  let result = '';

  for (let i = 0; i < padded.length; i += size) {
    const input = padded.slice(i, i + size).split('').map(c => ALPHABET.indexOf(c));
    const output = multiply(matrix, input);
    blocks.push({ input, output });
    result += output.map(n => ALPHABET[n]).join('');
  }

  return { blocks, result };
}

const PRESETS: Record<string, { name: string; size: number; matrix: number[][] }> = {
  hill2a: { name: 'Classic 2x2', size: 2, matrix: [[3, 3], [2, 5]] },
  hill2b: { name: 'Example 2x2', size: 2, matrix: [[6, 24], [1, 13]] },
  hill3a: { name: 'Classic 3x3', size: 3, matrix: [[6, 24, 1], [13, 16, 10], [20, 17, 15]] },
  hill3b: { name: 'Example 3x3', size: 3, matrix: [[2, 4, 5], [9, 2, 1], [3, 17, 7]] },
};

function App() {
  const [size, setSize] = useState(2);
  const [matrix, setMatrix] = useState<number[][]>([[3, 3], [2, 5]]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [showInfo, setShowInfo] = useState(false);

  const isValid = useMemo(() => {
    const d = size === 2 ? det2(matrix) : det3(matrix);
    return modInverse(mod(d, 26), 26) !== null;
  }, [matrix, size]);

  const inverseMatrix = useMemo(() => {
    if (!isValid) return null;
    return size === 2 ? inverse2(matrix) : inverse3(matrix);
  }, [matrix, size, isValid]);

  const activeMatrix = mode === 'encrypt' ? matrix : inverseMatrix;
  const processResult = activeMatrix && input ? hillProcess(input, activeMatrix, size) : null;

  const handleSizeChange = (newSize: number) => {
    setSize(newSize);
    if (newSize === 2) setMatrix([[3, 3], [2, 5]]);
    else setMatrix([[6, 24, 1], [13, 16, 10], [20, 17, 15]]);
  };

  const handleCellChange = (r: number, c: number, val: string) => {
    const num = parseInt(val) || 0;
    const newMatrix = matrix.map(row => [...row]);
    newMatrix[r][c] = mod(num, 26);
    setMatrix(newMatrix);
  };

  const handlePreset = (key: string) => {
    const p = PRESETS[key];
    setSize(p.size);
    setMatrix(p.matrix.map(r => [...r]));
  };

  return (
    <div className="flex-1 bg-[#141216] flex flex-col">
      <ExhibitPanel id="hill" />
      <div className="bg-[#141216] flex flex-col items-center justify-start py-10 px-6 text-stone-200">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl sm:text-4xl font-typewriter font-bold text-stone-100 tracking-tighter">
              HILL <span className="text-violet-400">CIPHER</span>
            </h1>
            <span className="text-stone-500 text-xs tracking-[0.3em] font-mono">MATRIX-BASED POLYGRAPHIC CIPHER — 1929</span>
          </div>
          <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-lg hover:bg-stone-800 text-stone-400 border border-stone-700">
            <Info size={20} />
          </button>
        </div>

        {/* Mode + Size */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setMode('encrypt')} className={`px-4 py-2 rounded-lg text-sm font-bold tracking-wider transition-colors ${mode === 'encrypt' ? 'bg-violet-500/20 text-violet-300 border border-violet-600/50' : 'bg-stone-800/50 text-stone-500 border border-stone-700 hover:text-stone-300'}`}>
            ENCRYPT
          </button>
          <button onClick={() => setMode('decrypt')} className={`px-4 py-2 rounded-lg text-sm font-bold tracking-wider transition-colors ${mode === 'decrypt' ? 'bg-violet-500/20 text-violet-300 border border-violet-600/50' : 'bg-stone-800/50 text-stone-500 border border-stone-700 hover:text-stone-300'}`}>
            DECRYPT
          </button>
          <div className="w-px bg-stone-700 mx-2" />
          <button onClick={() => handleSizeChange(2)} className={`px-3 py-2 rounded-lg text-sm font-bold transition-colors ${size === 2 ? 'bg-violet-500/20 text-violet-300 border border-violet-600/50' : 'bg-stone-800/50 text-stone-500 border border-stone-700 hover:text-stone-300'}`}>
            2x2
          </button>
          <button onClick={() => handleSizeChange(3)} className={`px-3 py-2 rounded-lg text-sm font-bold transition-colors ${size === 3 ? 'bg-violet-500/20 text-violet-300 border border-violet-600/50' : 'bg-stone-800/50 text-stone-500 border border-stone-700 hover:text-stone-300'}`}>
            3x3
          </button>
        </div>

        {/* Presets */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <span className="text-[10px] text-stone-500 uppercase tracking-widest font-bold self-center mr-1">Presets:</span>
          {Object.entries(PRESETS).filter(([_, p]) => p.size === size).map(([k, p]) => (
            <button key={k} onClick={() => handlePreset(k)} className="px-3 py-1 rounded text-xs font-mono bg-stone-800 border border-stone-700 text-stone-400 hover:text-white transition-colors">
              {p.name}
            </button>
          ))}
        </div>

        {/* Key Matrix */}
        <div className="bg-stone-900/60 rounded-xl border border-stone-800 p-5 mb-6">
          <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-3">
            Key Matrix (mod 26) {!isValid && <span className="text-red-400 ml-2">- NOT INVERTIBLE (det has no inverse mod 26)</span>}
          </div>
          <div className="flex justify-center">
            <div className="flex items-center gap-2">
              {/* Left bracket */}
              <div className="border-l-2 border-t-2 border-b-2 border-violet-500/50 w-2 rounded-l" style={{ height: size === 2 ? 96 : 140 }} />
              <div className="flex flex-col gap-2">
                {Array.from({ length: size }, (_, r) => (
                  <div key={r} className="flex gap-2">
                    {Array.from({ length: size }, (_, c) => (
                      <input
                        key={c}
                        type="number"
                        min={0}
                        max={25}
                        value={matrix[r][c]}
                        onChange={e => handleCellChange(r, c, e.target.value)}
                        className="w-14 h-10 bg-stone-800 border border-stone-700 rounded text-center font-mono text-lg text-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    ))}
                  </div>
                ))}
              </div>
              {/* Right bracket */}
              <div className="border-r-2 border-t-2 border-b-2 border-violet-500/50 w-2 rounded-r" style={{ height: size === 2 ? 96 : 140 }} />
            </div>
          </div>
          <div className="text-center mt-3 text-xs font-mono text-stone-600">
            det = {mod(size === 2 ? det2(matrix) : det3(matrix), 26)} (mod 26)
          </div>
        </div>

        {/* Inverse Matrix (for reference) */}
        {inverseMatrix && (
          <div className="bg-stone-900/60 rounded-xl border border-stone-800 p-5 mb-6">
            <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-3">Inverse Matrix (mod 26)</div>
            <div className="flex justify-center">
              <div className="flex items-center gap-2">
                <div className="border-l-2 border-t-2 border-b-2 border-stone-600/50 w-2 rounded-l" style={{ height: size === 2 ? 80 : 116 }} />
                <div className="flex flex-col gap-1">
                  {inverseMatrix.map((row, r) => (
                    <div key={r} className="flex gap-1">
                      {row.map((val, c) => (
                        <div key={c} className="w-14 h-8 bg-stone-800/50 border border-stone-700/50 rounded flex items-center justify-center font-mono text-sm text-stone-400">
                          {val}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="border-r-2 border-t-2 border-b-2 border-stone-600/50 w-2 rounded-r" style={{ height: size === 2 ? 80 : 116 }} />
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
              className="w-full h-24 bg-stone-900 border border-stone-700 rounded-xl p-4 font-mono text-lg tracking-wider focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none text-stone-200 placeholder-stone-700"
              spellCheck={false}
            />
          </div>

          {/* Step-by-step blocks */}
          {processResult && (
            <div>
              <label className="block text-xs text-stone-500 font-bold uppercase tracking-wider mb-2">
                Block Multiplication ({size}-letter blocks)
              </label>
              <div className="bg-stone-800/50 border border-stone-700/50 rounded-xl p-4 flex flex-wrap gap-3">
                {processResult.blocks.map((block, i) => (
                  <div key={i} className="flex items-center gap-1 font-mono text-sm">
                    <span className="text-stone-500">[</span>
                    <span className="text-violet-300">{block.input.map(n => ALPHABET[n]).join('')}</span>
                    <span className="text-stone-600">{'\u2192'}</span>
                    <span className="text-amber-300">{block.output.map(n => ALPHABET[n]).join('')}</span>
                    <span className="text-stone-500">]</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Output */}
          <div>
            <label className="block text-xs text-violet-400 font-bold uppercase tracking-wider mb-2">
              {mode === 'encrypt' ? 'Ciphertext' : 'Plaintext'}
            </label>
            <div className="bg-stone-800/50 border border-stone-700/50 rounded-xl p-4 font-mono text-lg tracking-wider text-violet-200 break-all min-h-[3rem]">
              {processResult?.result || (
                !isValid && mode === 'decrypt'
                  ? <span className="text-red-400/60 text-sm">Matrix not invertible — cannot decrypt</span>
                  : <span className="text-stone-700">...</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className={`fixed bottom-0 left-0 right-0 bg-stone-900/95 backdrop-blur border-t border-stone-700 p-6 transform transition-transform duration-300 z-40 ${showInfo ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="max-w-3xl mx-auto relative">
          <button onClick={() => setShowInfo(false)} className="absolute top-0 right-0 p-2 text-stone-500 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <h3 className="text-xl font-bold text-violet-400 mb-2">About the Hill Cipher</h3>
          <p className="text-sm text-stone-300 leading-relaxed">
            Invented by mathematician <strong>Lester S. Hill</strong> in 1929, the Hill cipher was the first
            polygraphic cipher to be practical with more than three symbols at once. It uses
            <strong> matrix multiplication modulo 26</strong> — the plaintext is split into blocks (vectors),
            multiplied by a key matrix, and reduced mod 26. To decrypt, the inverse matrix mod 26 is used.
            The key matrix must have a determinant that is coprime with 26 (not divisible by 2 or 13).
            While vulnerable to known-plaintext attacks, it was a landmark in applying linear algebra to cryptography.
          </p>
        </div>
      </div>
    </div>
    </div>
  );
}

export default App;
