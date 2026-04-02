import React, { useState, useCallback, useMemo } from 'react';
import { Info, RotateCcw, ChevronRight, Lock, Unlock } from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────
const ENGLISH_FREQ = 'ESIANRTOLCDUGPMHBYFVKWZXJQ'; // by frequency
const DEFAULT_KEYWORD = 'SNOWFALL';
const DEFAULT_DATE = '391945';
const DEFAULT_PERSONAL = 6;

// ── Utility ───────────────────────────────────────────────────────────
function sequentialize(digits: number[]): number[] {
  const indexed = digits.map((d, i) => ({ val: d, idx: i }));
  indexed.sort((a, b) => a.val - b.val || a.idx - b.idx);
  const result = new Array(digits.length);
  indexed.forEach((item, rank) => { result[item.idx] = rank; });
  return result;
}

function chainAdd(digits: number[], targetLength: number): number[] {
  const result = [...digits];
  while (result.length < targetLength) {
    const len = result.length;
    result.push((result[len - digits.length] + result[len - digits.length + 1]) % 10);
  }
  return result;
}

function keywordToDigits(keyword: string): number[] {
  return sequentialize(keyword.split('').map(c => c.charCodeAt(0) - 65));
}

function mod10Sub(a: number[], b: number[]): number[] {
  return a.map((v, i) => (v - b[i % b.length] + 10) % 10);
}

function mod10Add(a: number[], b: number[]): number[] {
  return a.map((v, i) => (v + b[i % b.length]) % 10);
}

function columnarTranspose(digits: number[], key: number[]): number[] {
  const cols = key.length;
  const rows = Math.ceil(digits.length / cols);
  const grid: (number | null)[][] = [];
  let idx = 0;
  for (let r = 0; r < rows; r++) {
    grid[r] = [];
    for (let c = 0; c < cols; c++) {
      grid[r][c] = idx < digits.length ? digits[idx++] : null;
    }
  }
  const order = key.map((_, i) => i).sort((a, b) => key[a] - key[b]);
  const result: number[] = [];
  for (const col of order) {
    for (let r = 0; r < rows; r++) {
      if (grid[r][col] !== null) result.push(grid[r][col]!);
    }
  }
  return result;
}

function reverseColumnarTranspose(digits: number[], key: number[]): number[] {
  const cols = key.length;
  const rows = Math.ceil(digits.length / cols);
  const fullCells = digits.length;
  const lastRowCols = fullCells % cols || cols;

  const order = key.map((_, i) => i).sort((a, b) => key[a] - key[b]);

  // Calculate column lengths
  const colLengths = new Array(cols).fill(rows);
  if (fullCells < rows * cols) {
    // Some columns in last row are empty
    const sortedOrder = [...order];
    for (let i = lastRowCols; i < cols; i++) {
      colLengths[sortedOrder[i]] = rows - 1;
    }
  }

  // Split digits into columns (in key order)
  const columns: number[][] = new Array(cols).fill(null).map(() => []);
  let pos = 0;
  for (const col of order) {
    for (let r = 0; r < colLengths[col]; r++) {
      if (pos < digits.length) columns[col].push(digits[pos++]);
    }
  }

  // Read off row by row
  const result: number[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r < columns[c].length) result.push(columns[c][r]);
    }
  }
  return result;
}

// ── Straddling Checkerboard ───────────────────────────────────────────
interface Checkerboard {
  topRow: (string | null)[];  // 10 positions, 8 letters + 2 nulls
  midRow: string[];           // 10 letters
  botRow: string[];           // 10 chars (8 letters + . + /)
  blankCols: [number, number]; // which columns are blank in top row
  colOrder: number[];          // column header digits
}

function buildCheckerboard(headerDigits: number[]): Checkerboard {
  const colOrder = headerDigits.slice(0, 10);
  const seq = sequentialize(colOrder);

  // The two highest-ranked positions become blanks (row indicators)
  const blankCols: [number, number] = [seq.indexOf(8), seq.indexOf(9)];
  if (blankCols[0] > blankCols[1]) {
    const tmp = blankCols[0];
    blankCols[0] = blankCols[1];
    blankCols[1] = tmp;
  }

  const letters = ENGLISH_FREQ.split('');
  const topRow: (string | null)[] = new Array(10).fill(null);
  let letterIdx = 0;
  for (let i = 0; i < 10; i++) {
    if (i === blankCols[0] || i === blankCols[1]) continue;
    topRow[i] = letters[letterIdx++];
  }

  const midRow: string[] = [];
  for (let i = 0; i < 10; i++) midRow.push(letters[letterIdx++]);

  const botRow: string[] = [];
  for (let i = 0; i < 8; i++) botRow.push(letters[letterIdx++]);
  botRow.push('.', '/');

  return { topRow, midRow, botRow, blankCols, colOrder };
}

function encodeCheckerboard(text: string, cb: Checkerboard): number[] {
  const digits: number[] = [];
  for (const ch of text.toUpperCase()) {
    if (ch === ' ') continue;
    // Check top row
    const topIdx = cb.topRow.indexOf(ch);
    if (topIdx !== -1) { digits.push(topIdx); continue; }
    // Check mid row
    const midIdx = cb.midRow.indexOf(ch);
    if (midIdx !== -1) { digits.push(cb.blankCols[0], midIdx); continue; }
    // Check bottom row
    const botIdx = cb.botRow.indexOf(ch);
    if (botIdx !== -1) { digits.push(cb.blankCols[1], botIdx); continue; }
    // Check for period and slash
    if (ch === '.') { const pi = cb.botRow.indexOf('.'); if (pi !== -1) digits.push(cb.blankCols[1], pi); }
    if (ch === '/') { const si = cb.botRow.indexOf('/'); if (si !== -1) digits.push(cb.blankCols[1], si); }
  }
  return digits;
}

function decodeCheckerboard(digits: number[], cb: Checkerboard): string {
  let result = '';
  let i = 0;
  while (i < digits.length) {
    const d = digits[i];
    if (d === cb.blankCols[0]) {
      if (i + 1 < digits.length) result += cb.midRow[digits[i + 1]];
      i += 2;
    } else if (d === cb.blankCols[1]) {
      if (i + 1 < digits.length) result += cb.botRow[digits[i + 1]];
      i += 2;
    } else {
      const ch = cb.topRow[d];
      if (ch) result += ch;
      i++;
    }
  }
  return result;
}

// ── Full VIC Pipeline ─────────────────────────────────────────────────
interface VICState {
  keyDigits: number[];
  expandedKey: number[];
  checkerboardHeader: number[];
  checkerboard: Checkerboard;
  transpKey1: number[];
  transpKey2: number[];
  encoded: number[];
  transposed1: number[];
  transposed2: number[];
  output: string;
}

function vicEncrypt(plaintext: string, keyword: string, date: string, personalNum: number): VICState {
  // Step 1: keyword → digits
  const kwDigits = keywordToDigits(keyword.toUpperCase().slice(0, 10).padEnd(5, 'A'));
  const dateDigits = date.split('').map(Number).slice(0, 5);

  // Step 2: subtract date from keyword digits (mod 10)
  const subtracted = mod10Sub(kwDigits.slice(0, 5), dateDigits);

  // Step 3: chain-add to 10 digits
  const expanded10 = chainAdd(subtracted, 10);

  // Step 4: add personal number, expand to 50 via chain addition
  const withPersonal = expanded10.map(d => (d + personalNum) % 10);
  const expanded50 = chainAdd(withPersonal, 50);

  // Step 5: sequentialize first 10 of expanded50 → transposition key
  const transpKey0 = sequentialize(expanded50.slice(0, 10));

  // Step 6: transpose the 50 digits
  const transposed50 = columnarTranspose(expanded50, transpKey0);

  // Step 7: first 10 → checkerboard header, next sets → transposition keys
  const checkerboardHeader = transposed50.slice(0, 10);
  const transpKey1 = sequentialize(transposed50.slice(10, 20));
  const transpKey2 = sequentialize(transposed50.slice(20, 29));

  // Step 8: build checkerboard
  const checkerboard = buildCheckerboard(checkerboardHeader);

  // Step 9: encode plaintext
  const encoded = encodeCheckerboard(plaintext, checkerboard);

  // Step 10: double columnar transposition
  const transposed1 = columnarTranspose(encoded, transpKey1);
  const transposed2 = columnarTranspose(transposed1, transpKey2);

  // Step 11: format output as 5-digit groups
  const output = transposed2.join('').match(/.{1,5}/g)?.join(' ') || '';

  return {
    keyDigits: kwDigits,
    expandedKey: expanded50,
    checkerboardHeader,
    checkerboard,
    transpKey1,
    transpKey2,
    encoded,
    transposed1,
    transposed2,
    output,
  };
}

function vicDecrypt(cipherDigits: string, keyword: string, date: string, personalNum: number): { plaintext: string; state: VICState } {
  const kwDigits = keywordToDigits(keyword.toUpperCase().slice(0, 10).padEnd(5, 'A'));
  const dateDigits = date.split('').map(Number).slice(0, 5);
  const subtracted = mod10Sub(kwDigits.slice(0, 5), dateDigits);
  const expanded10 = chainAdd(subtracted, 10);
  const withPersonal = expanded10.map(d => (d + personalNum) % 10);
  const expanded50 = chainAdd(withPersonal, 50);
  const transpKey0 = sequentialize(expanded50.slice(0, 10));
  const transposed50 = columnarTranspose(expanded50, transpKey0);
  const checkerboardHeader = transposed50.slice(0, 10);
  const transpKey1 = sequentialize(transposed50.slice(10, 20));
  const transpKey2 = sequentialize(transposed50.slice(20, 29));
  const checkerboard = buildCheckerboard(checkerboardHeader);

  const digits = cipherDigits.replace(/\s/g, '').split('').map(Number);
  const unTransposed2 = reverseColumnarTranspose(digits, transpKey2);
  const unTransposed1 = reverseColumnarTranspose(unTransposed2, transpKey1);
  const plaintext = decodeCheckerboard(unTransposed1, checkerboard);

  return {
    plaintext,
    state: {
      keyDigits: kwDigits,
      expandedKey: expanded50,
      checkerboardHeader,
      checkerboard,
      transpKey1,
      transpKey2,
      encoded: unTransposed1,
      transposed1: unTransposed2,
      transposed2: digits,
      output: cipherDigits,
    },
  };
}

// ── Grid Display ──────────────────────────────────────────────────────
const TranspositionGrid: React.FC<{
  digits: number[];
  transpKey: number[];
  label: string;
}> = ({ digits, transpKey, label }) => {
  const cols = transpKey.length;
  const rows = Math.ceil(digits.length / cols);
  const order = transpKey.map((_, i) => i).sort((a, b) => transpKey[a] - transpKey[b]);

  return (
    <div>
      <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">{label}</div>
      <div className="overflow-x-auto">
        <table className="border-collapse text-xs font-mono">
          <thead>
            <tr>
              {transpKey.map((k, i) => (
                <th key={i} className="w-7 h-7 text-center border border-slate-700 bg-slate-800 text-sky-400 font-bold">
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, r) => (
              <tr key={r}>
                {Array.from({ length: cols }, (_, c) => {
                  const idx = r * cols + c;
                  return (
                    <td key={c} className={`w-7 h-7 text-center border border-slate-800 ${idx < digits.length ? 'text-slate-300' : 'text-slate-700'}`}>
                      {idx < digits.length ? digits[idx] : '·'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-1 text-[9px] text-slate-600 font-mono">
          Read order: {order.map(i => transpKey[i]).join(' ')}
        </div>
      </div>
    </div>
  );
};

// ── Checkerboard Display ──────────────────────────────────────────────
const CheckerboardDisplay: React.FC<{ cb: Checkerboard; highlightChar?: string }> = ({ cb, highlightChar }) => {
  const hl = highlightChar?.toUpperCase();
  const cellClass = (ch: string | null, isBlank: boolean = false) => {
    if (isBlank) return 'bg-slate-800 text-slate-600';
    if (ch && ch === hl) return 'bg-sky-500/20 text-sky-300 font-bold';
    return 'text-slate-300';
  };

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-xs font-mono w-full">
        <thead>
          <tr>
            <th className="w-8 h-7 border border-slate-700 bg-slate-800 text-slate-600"></th>
            {Array.from({ length: 10 }, (_, i) => (
              <th key={i} className="w-8 h-7 text-center border border-slate-700 bg-slate-800 text-sky-400 font-bold">{i}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="text-center border border-slate-700 bg-slate-800 text-slate-600">—</td>
            {cb.topRow.map((ch, i) => (
              <td key={i} className={`text-center border border-slate-700 h-7 ${cellClass(ch, ch === null)}`}>
                {ch || '·'}
              </td>
            ))}
          </tr>
          <tr>
            <td className="text-center border border-slate-700 bg-slate-800 text-amber-400 font-bold">{cb.blankCols[0]}</td>
            {cb.midRow.map((ch, i) => (
              <td key={i} className={`text-center border border-slate-700 h-7 ${cellClass(ch)}`}>{ch}</td>
            ))}
          </tr>
          <tr>
            <td className="text-center border border-slate-700 bg-slate-800 text-amber-400 font-bold">{cb.blankCols[1]}</td>
            {cb.botRow.map((ch, i) => (
              <td key={i} className={`text-center border border-slate-700 h-7 ${cellClass(ch)}`}>{ch}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════
const App: React.FC = () => {
  const [keyword, setKeyword] = useState(DEFAULT_KEYWORD);
  const [date, setDate] = useState(DEFAULT_DATE);
  const [personalNum, setPersonalNum] = useState(DEFAULT_PERSONAL);
  const [plaintext, setPlaintext] = useState('ATTACK AT DAWN');
  const [cipherInput, setCipherInput] = useState('');
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [showSteps, setShowSteps] = useState(true);
  const [showInfo, setShowInfo] = useState(false);

  const result = useMemo(() => {
    if (mode === 'encrypt') {
      if (!plaintext.trim()) return null;
      return vicEncrypt(plaintext, keyword, date, personalNum);
    } else {
      if (!cipherInput.trim()) return null;
      const { plaintext: pt, state } = vicDecrypt(cipherInput, keyword, date, personalNum);
      return { ...state, decrypted: pt };
    }
  }, [mode, plaintext, cipherInput, keyword, date, personalNum]);

  const handleReset = () => {
    setKeyword(DEFAULT_KEYWORD);
    setDate(DEFAULT_DATE);
    setPersonalNum(DEFAULT_PERSONAL);
    setPlaintext('ATTACK AT DAWN');
    setCipherInput('');
  };

  return (
    <div className="flex-1 bg-slate-950 flex flex-col items-center justify-start py-10 px-6 text-slate-200">
      <div className="w-full max-w-5xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex flex-col">
            <h1 className="text-3xl sm:text-4xl font-typewriter font-bold text-slate-100 tracking-tighter">
              VIC <span className="text-sky-400">CIPHER</span>
            </h1>
            <span className="text-slate-500 text-xs tracking-[0.3em] font-mono">COLD WAR KGB HAND CIPHER — c. 1950</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 border border-slate-700">
              <Info size={20} />
            </button>
            <button onClick={handleReset} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 border border-slate-700">
              <RotateCcw size={20} />
            </button>
          </div>
        </div>

        {/* Mode toggle + Key inputs */}
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 mb-6">
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <button onClick={() => setMode(m => m === 'encrypt' ? 'decrypt' : 'encrypt')}
              className={`px-4 py-2 rounded-lg text-xs font-mono font-bold border transition-colors ${
                mode === 'decrypt' ? 'bg-amber-900/50 border-amber-700 text-amber-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              {mode === 'decrypt' ? <><Unlock size={12} className="inline mr-1" />DECRYPT</> : <><Lock size={12} className="inline mr-1" />ENCRYPT</>}
            </button>
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
              <input type="checkbox" checked={showSteps} onChange={e => setShowSteps(e.target.checked)}
                className="rounded border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500" />
              Show intermediate steps
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Keyword</label>
              <input value={keyword} onChange={e => setKeyword(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 10))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-white" placeholder="SNOWFALL" />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Date Key (digits)</label>
              <input value={date} onChange={e => setDate(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-white" placeholder="391945" />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Personal Number</label>
              <input type="number" min={0} max={9} value={personalNum} onChange={e => setPersonalNum(Math.max(0, Math.min(9, parseInt(e.target.value) || 0)))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-white" />
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 mb-6">
          <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">
            {mode === 'encrypt' ? 'Plaintext' : 'Ciphertext (digit groups)'}
          </label>
          {mode === 'encrypt' ? (
            <textarea value={plaintext} onChange={e => setPlaintext(e.target.value.toUpperCase())}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm font-mono text-white resize-none h-20"
              placeholder="ATTACK AT DAWN" />
          ) : (
            <textarea value={cipherInput} onChange={e => setCipherInput(e.target.value.replace(/[^0-9\s]/g, ''))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm font-mono text-white resize-none h-20"
              placeholder="14573 29806 71435..." />
          )}
        </div>

        {/* Result */}
        {result && (
          <>
            {/* Output */}
            <div className="bg-sky-950/30 rounded-2xl border border-sky-800/40 p-6 mb-6">
              <div className="text-[10px] text-sky-400 uppercase tracking-widest font-bold mb-2">
                {mode === 'encrypt' ? 'Ciphertext Output' : 'Decrypted Plaintext'}
              </div>
              <div className="font-mono text-lg tracking-widest text-sky-300 break-all">
                {mode === 'encrypt' ? result.output : (result as any).decrypted}
              </div>
            </div>

            {/* Intermediate Steps */}
            {showSteps && (
              <div className="space-y-6">
                {/* Key Derivation */}
                <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-5">
                  <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-3 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-[10px] font-bold">1</span>
                    Key Derivation
                  </div>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex flex-wrap gap-4">
                      <div>
                        <span className="text-slate-500">Keyword digits:</span>{' '}
                        <span className="text-slate-300">{result.keyDigits.join(' ')}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Date digits:</span>{' '}
                        <span className="text-slate-300">{date.split('').slice(0, 5).join(' ')}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500">Expanded key (50 digits):</span>
                      <div className="text-slate-400 mt-1 break-all leading-relaxed">
                        {result.expandedKey.map((d, i) => (
                          <span key={i} className={i < 10 ? 'text-sky-400' : ''}>{d}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Checkerboard */}
                <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-5">
                  <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-3 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-[10px] font-bold">2</span>
                    Straddling Checkerboard
                  </div>
                  <p className="text-[10px] text-slate-500 mb-3">
                    High-frequency letters (top row) encode to 1 digit. Others encode to 2 digits (row prefix + column).
                  </p>
                  <CheckerboardDisplay cb={result.checkerboard} />
                  <div className="mt-3 text-xs font-mono">
                    <span className="text-slate-500">Encoded digits:</span>
                    <div className="text-slate-300 mt-1 break-all">{result.encoded.join('')}</div>
                  </div>
                </div>

                {/* Transposition 1 */}
                <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-5">
                  <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-3 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-[10px] font-bold">3</span>
                    First Columnar Transposition
                  </div>
                  <TranspositionGrid digits={result.encoded} transpKey={result.transpKey1} label="Input Grid" />
                  <div className="mt-3 text-xs font-mono">
                    <span className="text-slate-500">Output:</span>{' '}
                    <span className="text-slate-300">{result.transposed1.join('')}</span>
                  </div>
                </div>

                {/* Transposition 2 */}
                <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-5">
                  <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-3 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-[10px] font-bold">4</span>
                    Second Columnar Transposition
                  </div>
                  <TranspositionGrid digits={result.transposed1} transpKey={result.transpKey2} label="Input Grid" />
                  <div className="mt-3 text-xs font-mono">
                    <span className="text-slate-500">Final output:</span>{' '}
                    <span className="text-sky-300 font-bold">{result.transposed2.join('')}</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Info Panel */}
        <div className={`mt-6 bg-slate-900/30 border border-slate-800 rounded-xl overflow-hidden transition-all duration-300 ${showInfo ? 'max-h-[800px] p-5' : 'max-h-0 p-0 border-0'}`}>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">About the VIC Cipher</div>
          <div className="text-xs text-slate-500 space-y-3">
            <p>
              The <span className="text-slate-200">VIC cipher</span> is widely considered the <span className="text-sky-400">most complex hand cipher ever used operationally</span>.
              It was employed by the KGB during the Cold War and came to light through one of espionage history's most
              dramatic incidents.
            </p>
            <p>
              In <span className="text-slate-200">1953</span>, a Brooklyn newspaper boy received a hollow nickel containing a microfilm
              with a VIC-enciphered message. The FBI could not break it until <span className="text-slate-200">1957</span>, when Soviet agent
              <span className="text-sky-400"> Reino Hayhanen</span> defected and revealed the cipher system. This led to the arrest of
              master spy <span className="text-slate-200">Rudolf Abel</span>, later exchanged for U-2 pilot Francis Gary Powers in 1962.
            </p>
            <p>
              The cipher combines three powerful techniques:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><span className="text-slate-300">Chain addition</span> — expands a short key into a long pseudorandom sequence (mod 10 Fibonacci-like generation)</li>
              <li><span className="text-slate-300">Straddling checkerboard</span> — variable-length substitution where common letters get 1 digit and rare letters get 2 (like Huffman coding)</li>
              <li><span className="text-slate-300">Double columnar transposition</span> — two passes of columnar rearrangement with different keys, providing strong diffusion</li>
            </ul>
            <p>
              The NSA reportedly considered it one of the most sophisticated pencil-and-paper ciphers they had encountered.
              All operations use only mod-10 arithmetic, making it feasible to execute by hand — yet the combination of
              substitution and double transposition made it extremely difficult to cryptanalyze without knowing the key.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
