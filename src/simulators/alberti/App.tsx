import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Info, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import ConfigSlots from '../shared/ConfigSlots';
import TapeActions from '../shared/TapeActions';
import ExhibitPanel from '../../components/ExhibitPanel';

// ── Constants ─────────────────────────────────────────────────────────
const OUTER_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DEFAULT_INNER = 'gklnprtzvxysawomebdfhijcqu';
const KEYBOARD_LAYOUT = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
const INDEX_LETTER = 'k';

function shuffleAlphabet(): string {
  const arr = 'abcdefghijklmnopqrstuvwxyz'.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join('');
}

// ── Encryption / Decryption ──────────────────────────────────────────
function encryptChar(ch: string, innerAlpha: string, offset: number): string {
  const outerIdx = OUTER_ALPHABET.indexOf(ch.toUpperCase());
  if (outerIdx === -1) return ch;
  const innerIdx = (outerIdx + offset) % 26;
  return innerAlpha[innerIdx];
}

function decryptChar(ch: string, innerAlpha: string, offset: number): string {
  const innerIdx = innerAlpha.indexOf(ch.toLowerCase());
  if (innerIdx === -1) return ch;
  const outerIdx = (innerIdx - offset + 26) % 26;
  return OUTER_ALPHABET[outerIdx];
}

// ── SVG Disk Component ───────────────────────────────────────────────
const CipherDisk: React.FC<{
  offset: number;
  innerAlpha: string;
  activeOuter: number | null;
  activeInner: number | null;
  onRotate: (delta: number) => void;
}> = ({ offset, innerAlpha, activeOuter, activeInner, onRotate }) => {
  const cx = 200, cy = 200;
  const outerR = 175, outerTextR = 158;
  const innerR = 130, innerTextR = 113;
  const dividerR = 148;

  const outerLetters = OUTER_ALPHABET.split('');
  const innerLetters = innerAlpha.split('');

  return (
    <svg viewBox="0 0 400 400" className="w-full max-w-sm mx-auto select-none">
      {/* Outer ring background */}
      <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="#78716c" strokeWidth="1.5" />
      <circle cx={cx} cy={cy} r={dividerR} fill="none" stroke="#57534e" strokeWidth="1" />

      {/* Outer letters (fixed) */}
      {outerLetters.map((ch, i) => {
        const angle = (i * 360 / 26) - 90;
        const rad = angle * Math.PI / 180;
        const x = cx + outerTextR * Math.cos(rad);
        const y = cy + outerTextR * Math.sin(rad);
        const isActive = activeOuter === i;
        return (
          <text key={`o-${i}`} x={x} y={y} textAnchor="middle" dominantBaseline="central"
            className="font-mono font-bold" fontSize={isActive ? 16 : 13}
            fill={isActive ? '#fbbf24' : '#d6d3d1'}
          >
            {ch}
          </text>
        );
      })}

      {/* Inner disk background */}
      <circle cx={cx} cy={cy} r={innerR} fill="#1c1917" stroke="#78716c" strokeWidth="1.5" />

      {/* Inner letters (rotate with offset) */}
      {innerLetters.map((ch, i) => {
        const angle = ((i - offset) * 360 / 26) - 90;
        const rad = angle * Math.PI / 180;
        const x = cx + innerTextR * Math.cos(rad);
        const y = cy + innerTextR * Math.sin(rad);
        const isActive = activeInner === i;
        const isIndex = ch === INDEX_LETTER;
        return (
          <text key={`i-${i}`} x={x} y={y} textAnchor="middle" dominantBaseline="central"
            className="font-mono" fontSize={isActive ? 16 : 12}
            fontWeight={isIndex ? 'bold' : 'normal'}
            fill={isActive ? '#34d399' : isIndex ? '#f59e0b' : '#a8a29e'}
          >
            {ch}
          </text>
        );
      })}

      {/* Center hub */}
      <circle cx={cx} cy={cy} r={24} fill="#292524" stroke="#57534e" strokeWidth="1" />
      <circle cx={cx} cy={cy} r={4} fill="#78716c" />

      {/* Pointer at top */}
      <polygon points={`${cx},${cy - outerR - 8} ${cx - 6},${cy - outerR + 4} ${cx + 6},${cy - outerR + 4}`}
        fill="#fbbf24" />

      {/* Rotation buttons */}
      <g onClick={() => onRotate(-1)} className="cursor-pointer">
        <circle cx={cx - 60} cy={cy} r={18} fill="#292524" stroke="#57534e" strokeWidth="1" />
        <text x={cx - 60} y={cy} textAnchor="middle" dominantBaseline="central" fill="#a8a29e" fontSize="18">◀</text>
      </g>
      <g onClick={() => onRotate(1)} className="cursor-pointer">
        <circle cx={cx + 60} cy={cy} r={18} fill="#292524" stroke="#57534e" strokeWidth="1" />
        <text x={cx + 60} y={cy} textAnchor="middle" dominantBaseline="central" fill="#a8a29e" fontSize="18">▶</text>
      </g>

      {/* Index letter label */}
      <text x={cx} y={cy + 8} textAnchor="middle" fontSize="8" fill="#78716c" className="font-mono">
        INDEX: {INDEX_LETTER.toUpperCase()}
      </text>
    </svg>
  );
};

// ══════════════════════════════════════════════════════════════════════
type RotateMode = 'manual' | 'random' | 'keyword';

const App: React.FC = () => {
  const [innerAlpha, setInnerAlpha] = useState(DEFAULT_INNER);
  const [offset, setOffset] = useState(0);
  const [decrypt, setDecrypt] = useState(false);
  const [rotateMode, setRotateMode] = useState<RotateMode>('manual');
  const [keyword, setKeyword] = useState('');
  const [keyIndex, setKeyIndex] = useState(0);
  const [rotateEvery, setRotateEvery] = useState(4);
  const [charsSinceRotate, setCharsSinceRotate] = useState(0);
  const [tape, setTape] = useState('');
  const [inputTape, setInputTape] = useState('');
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const [activeOuter, setActiveOuter] = useState<number | null>(null);
  const [activeInner, setActiveInner] = useState<number | null>(null);
  const [history, setHistory] = useState<{ offset: number; charsSinceRotate: number; keyIndex: number }[]>([]);
  const [showInfo, setShowInfo] = useState(false);

  // Current substitution table for display
  const substitutionTable = useMemo(() => {
    return OUTER_ALPHABET.split('').map((ch, i) => {
      const innerIdx = (i + offset) % 26;
      return { plain: ch, cipher: innerAlpha[innerIdx] };
    });
  }, [innerAlpha, offset]);

  // Index letter's current outer position
  const indexOuterChar = useMemo(() => {
    const indexPos = innerAlpha.indexOf(INDEX_LETTER);
    const outerIdx = (indexPos - offset + 26) % 26;
    return OUTER_ALPHABET[outerIdx];
  }, [innerAlpha, offset]);

  const handleRotate = useCallback((delta: number) => {
    setOffset(prev => (prev + delta + 26) % 26);
    setActiveOuter(null);
    setActiveInner(null);
  }, []);

  // Compute rotation amount and whether to rotate
  const getRotation = useCallback((mode: RotateMode, curKeyIndex: number): { amount: number; nextKeyIndex: number } | null => {
    if (mode === 'random') {
      return { amount: Math.floor(Math.random() * 25) + 1, nextKeyIndex: curKeyIndex };
    }
    if (mode === 'keyword' && keyword.length > 0) {
      const letter = keyword[curKeyIndex % keyword.length].toUpperCase();
      const amount = OUTER_ALPHABET.indexOf(letter);
      if (amount < 0) return null;
      return { amount, nextKeyIndex: curKeyIndex + 1 };
    }
    return null;
  }, [keyword]);

  const processChar = useCallback((ch: string) => {
    const upper = ch.toUpperCase();
    if (!/^[A-Z]$/.test(upper)) return;

    setHistory(prev => [...prev, { offset, charsSinceRotate, keyIndex }]);

    let newOffset = offset;
    let newCharCount = charsSinceRotate;
    let newKeyIndex = keyIndex;
    let outputPrefix = '';

    // Auto-rotate check: random only in encrypt; keyword in both modes (deterministic)
    const shouldRotate = rotateMode !== 'manual' && newCharCount >= rotateEvery && rotateEvery > 0
      && (rotateMode === 'keyword' || !decrypt);

    if (shouldRotate) {
      const rot = getRotation(rotateMode, newKeyIndex);
      if (rot && rot.amount > 0) {
        newOffset = (newOffset + rot.amount) % 26;
        newKeyIndex = rot.nextKeyIndex;
        // Insert uppercase indicator: outer letter aligned with index
        if (!decrypt) {
          const indexPos = innerAlpha.indexOf(INDEX_LETTER);
          const outerIdx = (indexPos - newOffset + 26) % 26;
          outputPrefix = OUTER_ALPHABET[outerIdx];
        }
      }
      newCharCount = 0;
    }

    let result: string;
    let outerHighlight: number;
    let innerHighlight: number;

    if (!decrypt) {
      result = encryptChar(upper, innerAlpha, newOffset);
      outerHighlight = OUTER_ALPHABET.indexOf(upper);
      innerHighlight = innerAlpha.indexOf(result);
    } else {
      result = decryptChar(ch.toLowerCase(), innerAlpha, newOffset);
      innerHighlight = innerAlpha.indexOf(ch.toLowerCase());
      outerHighlight = OUTER_ALPHABET.indexOf(result);
    }

    setOffset(newOffset);
    setCharsSinceRotate(newCharCount + 1);
    setKeyIndex(newKeyIndex);
    setActiveOuter(outerHighlight);
    setActiveInner(innerHighlight);
    setTape(prev => prev + outputPrefix + result);
    setInputTape(prev => prev + upper);
  }, [offset, innerAlpha, decrypt, rotateMode, rotateEvery, charsSinceRotate, keyIndex, getRotation]);

  const handleKeyDown = useCallback((char: string) => {
    if (pressedKey) return;
    setPressedKey(char);
    processChar(char);
  }, [pressedKey, processChar]);

  const handleKeyUp = useCallback(() => {
    setPressedKey(null);
  }, []);

  const handleBackspace = useCallback(() => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setOffset(prev.offset);
    setCharsSinceRotate(prev.charsSinceRotate);
    setKeyIndex(prev.keyIndex);
    setHistory(h => h.slice(0, -1));
    setTape(t => t.slice(0, -1));
    setInputTape(t => t.slice(0, -1));
    setActiveOuter(null);
    setActiveInner(null);
  }, [history]);

  const handlePasteInput = useCallback((chars: string[]) => {
    let curOffset = offset;
    let curCharCount = charsSinceRotate;
    let curKeyIndex = keyIndex;
    const results: string[] = [];
    const histBatch: { offset: number; charsSinceRotate: number; keyIndex: number }[] = [];

    for (const ch of chars) {
      histBatch.push({ offset: curOffset, charsSinceRotate: curCharCount, keyIndex: curKeyIndex });

      const shouldRotate = rotateMode !== 'manual' && curCharCount >= rotateEvery && rotateEvery > 0
        && (rotateMode === 'keyword' || !decrypt);

      if (shouldRotate) {
        const rot = getRotation(rotateMode, curKeyIndex);
        if (rot && rot.amount > 0) {
          curOffset = (curOffset + rot.amount) % 26;
          curKeyIndex = rot.nextKeyIndex;
          if (!decrypt) {
            const indexPos = innerAlpha.indexOf(INDEX_LETTER);
            const outerIdx = (indexPos - curOffset + 26) % 26;
            results.push(OUTER_ALPHABET[outerIdx]);
          }
        }
        curCharCount = 0;
      }

      if (!decrypt) {
        results.push(encryptChar(ch, innerAlpha, curOffset));
      } else {
        results.push(decryptChar(ch.toLowerCase(), innerAlpha, curOffset));
      }
      curCharCount++;
    }

    setHistory(prev => [...prev, ...histBatch]);
    setOffset(curOffset);
    setCharsSinceRotate(curCharCount);
    setKeyIndex(curKeyIndex);
    setTape(prev => prev + results.join(''));
    setInputTape(prev => prev + chars.join(''));
    setActiveOuter(null);
    setActiveInner(null);
  }, [offset, innerAlpha, decrypt, rotateMode, rotateEvery, charsSinceRotate, keyIndex, getRotation]);

  // Physical keyboard
  useEffect(() => {
    const isInput = () => {
      const t = document.activeElement?.tagName;
      return t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT';
    };
    const down = (e: KeyboardEvent) => {
      if (isInput()) return;
      const ch = e.key.toUpperCase();
      if (/^[A-Z]$/.test(ch) && !e.repeat && !e.metaKey && !e.ctrlKey && !e.altKey) handleKeyDown(ch);
      if (e.key === 'Backspace') handleBackspace();
    };
    const up = (e: KeyboardEvent) => {
      if (isInput()) return;
      if (/^[A-Z]$/.test(e.key.toUpperCase())) handleKeyUp();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [handleKeyDown, handleKeyUp, handleBackspace]);

  const handleReset = () => {
    setOffset(0);
    setTape('');
    setInputTape('');
    setHistory([]);
    setCharsSinceRotate(0);
    setKeyIndex(0);
    setActiveOuter(null);
    setActiveInner(null);
    setPressedKey(null);
  };

  const handleLoadConfig = useCallback((state: any) => {
    setInnerAlpha(state.innerAlpha || DEFAULT_INNER);
    setOffset(state.offset || 0);
    setDecrypt(state.decrypt || false);
    setRotateMode(state.rotateMode || (state.autoRotate ? 'random' : 'manual'));
    setKeyword(state.keyword || '');
    setRotateEvery(state.rotateEvery || 4);
    handleReset();
  }, []);

  // Format output based on mode
  const formatOutput = (text: string) => {
    if (!text) return <span className="text-stone-700 text-sm tracking-normal">Type or paste to begin...</span>;
    if (decrypt) {
      // Decrypt mode: output is uppercase plaintext, show in a single style
      const grouped = text.match(/.{1,5}/g)?.join(' ') || text;
      return <span className="text-amber-300">{grouped}</span>;
    }
    // Encrypt mode: lowercase = cipher chars, uppercase = rotation indicators
    const hasIndicators = /[A-Z]/.test(text);
    return (
      <>
        {text.split('').map((ch, i) => {
          const isIndicator = ch === ch.toUpperCase() && /[A-Z]/.test(ch);
          return isIndicator ? (
            <span key={i} className="text-amber-400 font-bold text-sm" title="Disk rotation indicator">
              [{ch}]
            </span>
          ) : (
            <span key={i} className="text-emerald-400">{ch}</span>
          );
        })}
        {hasIndicators && (
          <div className="text-[10px] text-stone-600 mt-2 font-normal tracking-normal">
            <span className="text-amber-400">[X]</span> = disk rotation indicator (tells recipient to realign disk)
          </div>
        )}
      </>
    );
  };

  return (
    <div className="flex-1 bg-[#1a1814] flex flex-col">
      <ExhibitPanel id="alberti" />
      <div className="bg-[#1a1814] flex flex-col items-center justify-start py-10 px-6 text-stone-200">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex flex-col">
            <h1 className="text-3xl sm:text-4xl font-typewriter font-bold text-stone-100 tracking-tighter">
              ALBERTI <span className="text-amber-400">CIPHER DISK</span>
            </h1>
            <span className="text-stone-500 text-xs tracking-[0.3em] font-mono">FIRST POLYALPHABETIC CIPHER — c. 1467</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-lg hover:bg-stone-800 text-stone-400 border border-stone-700">
              <Info size={20} />
            </button>
            <button onClick={handleReset} className="p-2 rounded-lg hover:bg-stone-800 text-stone-400 border border-stone-700">
              <RotateCcw size={20} />
            </button>
          </div>
        </div>

        {/* Config Slots */}
        <div className="mb-6">
          <ConfigSlots machineId="alberti" currentState={{ innerAlpha, offset, decrypt, rotateMode, keyword, rotateEvery }} onLoadState={handleLoadConfig} accentColor="amber" />
        </div>

        {/* Controls row */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
          <button onClick={() => { setDecrypt(d => !d); setActiveOuter(null); setActiveInner(null); }}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold border transition-colors ${
              decrypt ? 'bg-amber-900/50 border-amber-700 text-amber-300' : 'bg-stone-800 border-stone-700 text-stone-400 hover:text-white'
            }`}
          >
            {decrypt ? 'DECRYPT' : 'ENCRYPT'}
          </button>

          <div className="w-px h-6 bg-stone-700" />

          {/* Rotation mode selector */}
          <div className="flex items-center gap-1 bg-stone-800 border border-stone-700 rounded-lg p-0.5">
            {(['manual', 'random', 'keyword'] as RotateMode[]).map(mode => (
              <button key={mode} onClick={() => setRotateMode(mode)}
                className={`px-3 py-1.5 rounded-md text-[11px] font-mono font-bold transition-colors ${
                  rotateMode === mode
                    ? 'bg-amber-600 text-white'
                    : 'text-stone-500 hover:text-stone-300'
                }`}
              >
                {mode === 'manual' ? 'Manual' : mode === 'random' ? 'Random' : 'Keyword'}
              </button>
            ))}
          </div>

          {/* Rotate interval (shown for random & keyword) */}
          {rotateMode !== 'manual' && (
            <>
              <span className="text-xs text-stone-500">every</span>
              <input type="number" min={1} max={26} value={rotateEvery}
                onChange={e => setRotateEvery(Math.max(1, Math.min(26, parseInt(e.target.value) || 4)))}
                className="w-12 bg-stone-800 border border-stone-700 rounded px-2 py-1 text-xs text-stone-200 font-mono text-center"
              />
              <span className="text-xs text-stone-500">letters</span>
            </>
          )}

          {/* Keyword input (shown for keyword mode) */}
          {rotateMode === 'keyword' && (
            <>
              <div className="w-px h-6 bg-stone-700" />
              <label className="text-xs text-stone-500 font-mono">KEY:</label>
              <input
                type="text"
                value={keyword}
                onChange={e => { setKeyword(e.target.value.toUpperCase().replace(/[^A-Z]/g, '')); }}
                placeholder="ALBERTI"
                className="w-32 bg-stone-800 border border-stone-700 rounded px-2 py-1 text-xs text-amber-300 font-mono tracking-wider placeholder:text-stone-700 focus:outline-none focus:border-amber-600"
              />
            </>
          )}

          <div className="w-px h-6 bg-stone-700" />

          <button onClick={() => { setInnerAlpha(shuffleAlphabet()); setActiveOuter(null); setActiveInner(null); }}
            className="px-3 py-2 rounded-lg text-xs font-mono border border-stone-700 bg-stone-800 text-stone-400 hover:text-white transition-colors"
          >
            Shuffle Inner Disk
          </button>
        </div>

        {/* Keyword visualization (shown when keyword mode active with a keyword) */}
        {rotateMode === 'keyword' && keyword.length > 0 && (
          <div className="flex items-center justify-center gap-1 mb-6">
            <span className="text-[10px] text-stone-600 font-mono mr-2">KEY SEQUENCE:</span>
            {keyword.split('').map((ch, i) => {
              const isCurrent = i === (keyIndex % keyword.length);
              return (
                <span key={i} className={`w-6 h-6 flex items-center justify-center rounded text-xs font-mono font-bold border ${
                  isCurrent
                    ? 'bg-amber-600/30 border-amber-500 text-amber-300'
                    : i < (keyIndex % keyword.length) || (keyIndex >= keyword.length && i <= (keyIndex % keyword.length))
                      ? 'bg-stone-800/50 border-stone-700 text-stone-600'
                      : 'bg-stone-800 border-stone-700 text-stone-400'
                }`}>
                  {ch}
                </span>
              );
            })}
            <span className="text-[10px] text-stone-600 font-mono ml-2">
              shift +{OUTER_ALPHABET.indexOf(keyword[keyIndex % keyword.length] || 'A')}
            </span>
          </div>
        )}

        {/* Disk + Substitution Table side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Cipher Disk */}
          <div className="bg-stone-900/60 rounded-2xl border border-stone-800 p-4">
            <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold text-center mb-2">
              Cipher Disk — Index <span className="text-amber-400">{INDEX_LETTER.toUpperCase()}</span> → <span className="text-amber-400">{indexOuterChar}</span>
            </div>
            <CipherDisk
              offset={offset}
              innerAlpha={innerAlpha}
              activeOuter={activeOuter}
              activeInner={activeInner}
              onRotate={handleRotate}
            />
            <div className="text-center mt-2">
              <div className="text-[10px] text-stone-600 font-mono">Offset: {offset} ({OUTER_ALPHABET[offset]})</div>
            </div>
          </div>

          {/* Current Substitution Table */}
          <div className="bg-stone-900/60 rounded-2xl border border-stone-800 p-4">
            <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold text-center mb-3">
              Current Substitution
            </div>
            <div className="grid grid-cols-13 gap-px text-center">
              {/* First half */}
              <div className="col-span-13 grid grid-cols-13 gap-px mb-1">
                {substitutionTable.slice(0, 13).map(({ plain, cipher }, i) => (
                  <div key={i} className="flex flex-col">
                    <div className={`text-xs font-mono font-bold py-1 rounded-t ${activeOuter === i ? 'bg-amber-500/20 text-amber-300' : 'text-stone-400'}`}>
                      {plain}
                    </div>
                    <div className="text-stone-700 text-[8px]">↓</div>
                    <div className={`text-xs font-mono py-1 rounded-b ${activeInner !== null && innerAlpha.indexOf(cipher) === activeInner ? 'bg-emerald-500/20 text-emerald-300' : 'text-stone-500'}`}>
                      {cipher}
                    </div>
                  </div>
                ))}
              </div>
              {/* Second half */}
              <div className="col-span-13 grid grid-cols-13 gap-px">
                {substitutionTable.slice(13).map(({ plain, cipher }, i) => (
                  <div key={i + 13} className="flex flex-col">
                    <div className={`text-xs font-mono font-bold py-1 rounded-t ${activeOuter === i + 13 ? 'bg-amber-500/20 text-amber-300' : 'text-stone-400'}`}>
                      {plain}
                    </div>
                    <div className="text-stone-700 text-[8px]">↓</div>
                    <div className={`text-xs font-mono py-1 rounded-b ${activeInner !== null && innerAlpha.indexOf(cipher) === activeInner ? 'bg-emerald-500/20 text-emerald-300' : 'text-stone-500'}`}>
                      {cipher}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Signal path */}
            {activeOuter !== null && activeInner !== null && (
              <div className="mt-4 bg-stone-900 rounded-lg p-3 border border-stone-800">
                <div className="flex items-center gap-2 font-mono text-sm justify-center">
                  <span className="text-amber-400 font-bold">{OUTER_ALPHABET[activeOuter]}</span>
                  <span className="text-stone-600">→</span>
                  <span className="text-stone-500 text-[10px]">[offset {offset}]</span>
                  <span className="text-stone-600">→</span>
                  <span className="text-emerald-400 font-bold text-lg">{innerAlpha[activeInner]}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Keyboard */}
        <div className="flex flex-col items-center gap-2 mb-6 select-none">
          {KEYBOARD_LAYOUT.map((row, rIdx) => (
            <div key={rIdx} className="flex gap-1.5 sm:gap-2">
              {row.split('').map(char => {
                const isActive = pressedKey === char;
                return (
                  <button key={char}
                    onMouseDown={e => { e.preventDefault(); handleKeyDown(char); }}
                    onMouseUp={e => { e.preventDefault(); handleKeyUp(); }}
                    onMouseLeave={() => { if (isActive) handleKeyUp(); }}
                    onTouchStart={e => { e.preventDefault(); handleKeyDown(char); }}
                    onTouchEnd={e => { e.preventDefault(); handleKeyUp(); }}
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg border-2 flex items-center justify-center
                      text-base sm:text-lg font-mono font-bold transition-all ${
                      isActive ? 'bg-amber-600 border-amber-500 text-white scale-95' :
                      'bg-stone-800 border-stone-600 text-stone-300 hover:bg-stone-700 hover:text-white'
                    }`}>
                    {char}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Output Tape */}
        <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <div className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">Output</div>
            <div className="flex items-center gap-2">
              <TapeActions outputText={tape} onProcessInput={handlePasteInput} accentColor="amber" />
              <button onClick={() => { setTape(''); setInputTape(''); setHistory([]); setCharsSinceRotate(0); }}
                className="text-xs text-stone-500 hover:text-red-400 transition-colors">Clear</button>
            </div>
          </div>
          <div className="font-mono text-lg tracking-widest break-all">
            {formatOutput(tape)}
          </div>
          {inputTape && (
            <div className="mt-2 pt-2 border-t border-stone-800">
              <div className="text-[10px] text-stone-600 font-bold uppercase tracking-wider mb-1">Input</div>
              <div className="font-mono text-sm tracking-widest text-stone-500 break-all">
                {inputTape.match(/.{1,5}/g)?.join(' ')}
              </div>
            </div>
          )}
        </div>

        {/* Info Panel */}
        <div className={`bg-stone-900/30 border border-stone-800 rounded-xl overflow-hidden transition-all duration-300 ${showInfo ? 'max-h-[800px] p-5' : 'max-h-0 p-0 border-0'}`}>
          <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-3">About the Alberti Cipher Disk</div>
          <div className="text-xs text-stone-500 space-y-3">
            <p>
              <span className="text-stone-200">Leon Battista Alberti</span> invented the cipher disk around <span className="text-amber-400">1467</span>,
              making it the <span className="text-stone-200">world's first polyalphabetic cipher</span>. Before Alberti, all European ciphers
              used a single fixed alphabet, making them vulnerable to frequency analysis.
            </p>
            <p>
              The device consists of two concentric disks. The <span className="text-stone-200">outer (fixed) disk</span> carries the
              plaintext alphabet, while the <span className="text-stone-200">inner (mobile) disk</span> carries a scrambled cipher
              alphabet. Rotating the inner disk changes the entire substitution.
            </p>
            <p>
              The key innovation is the <span className="text-amber-400">index letter</span> (marked in gold on the inner disk).
              When the disk is rotated mid-message, the outer letter aligned with the index letter is inserted into
              the ciphertext as an uppercase indicator — telling the recipient to rotate their disk to match.
            </p>
            <p>
              Three rotation modes are available: <span className="text-stone-200">Manual</span> (you rotate the disk yourself),{' '}
              <span className="text-stone-200">Random</span> (random rotation every N characters — indicators appear in ciphertext),
              and <span className="text-stone-200">Keyword</span> (like Vigenère — each letter of your keyword determines the rotation
              amount: A=0, B=1, ... Z=25). Keyword mode is deterministic, so encrypt and decrypt use the same key.
            </p>
            <p>
              Alberti's concept directly inspired the <span className="text-stone-200">Vigenère cipher</span> (1553) and ultimately
              all polyalphabetic and rotor-based cipher machines that followed.
            </p>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default App;
