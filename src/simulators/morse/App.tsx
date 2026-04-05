import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Info, Play, Square, Trash2, Volume2, VolumeX } from 'lucide-react';
import { CHAR_TO_MORSE, MORSE_TO_CHAR, textToMorse, morseToText } from './morseCode';
import { startTone, stopTone, playMorseString, getUnitMs } from './audioEngine';
import ExhibitPanel from '../../components/ExhibitPanel';

type KeyType = 'straight' | 'single-paddle' | 'dual-paddle';
type Tab = 'keyer' | 'text';

// ─── Straight key decoder ───────────────────────────────────────────────
// Tracks press/release durations and decodes based on timing thresholds

function App() {
  const [tab, setTab] = useState<Tab>('keyer');
  const [wpm, setWpm] = useState(15);
  const [frequency, setFrequency] = useState(700);
  const [keyType, setKeyType] = useState<KeyType>('straight');
  const [showInfo, setShowInfo] = useState(false);
  const [muted, setMuted] = useState(false);

  // Keyer state
  const [currentMorse, setCurrentMorse] = useState(''); // dots/dashes for current char
  const [decodedText, setDecodedText] = useState('');
  const [morseDisplay, setMorseDisplay] = useState(''); // full morse output
  const [isKeyDown, setIsKeyDown] = useState(false);
  const [isDitDown, setIsDitDown] = useState(false);
  const [isDahDown, setIsDahDown] = useState(false);

  // Text-to-morse state
  const [textInput, setTextInput] = useState('');
  const [morseInput, setMorseInput] = useState(''); // for morse→text decode
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackHighlight, setPlaybackHighlight] = useState(-1);
  const abortRef = useRef({ aborted: false });

  // Timing refs
  const keyDownTimeRef = useRef(0);
  const charTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wordTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const paddleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const iambicStateRef = useRef<'idle' | 'dit' | 'dah'>('idle');
  const pendingElementRef = useRef<'dit' | 'dah' | null>(null);
  const iambicTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const unitMs = useMemo(() => getUnitMs(wpm), [wpm]);

  // ─── Decode accumulated morse into a character ──────────────────────
  const flushChar = useCallback((morse: string) => {
    if (!morse) return;
    const char = MORSE_TO_CHAR[morse];
    setDecodedText(prev => prev + (char || '?'));
    setMorseDisplay(prev => (prev ? prev + ' ' : '') + morse);
    setCurrentMorse('');
  }, []);

  const addWordGap = useCallback(() => {
    setDecodedText(prev => {
      if (prev.endsWith(' ')) return prev;
      return prev + ' ';
    });
    setMorseDisplay(prev => prev + ' / ');
  }, []);

  // ─── Reset timers for character/word gaps ───────────────────────────
  const resetGapTimers = useCallback(() => {
    if (charTimeoutRef.current) clearTimeout(charTimeoutRef.current);
    if (wordTimeoutRef.current) clearTimeout(wordTimeoutRef.current);
  }, []);

  const startGapTimers = useCallback((morse: string) => {
    resetGapTimers();
    charTimeoutRef.current = setTimeout(() => {
      flushChar(morse);
      wordTimeoutRef.current = setTimeout(() => {
        addWordGap();
      }, unitMs * 4); // additional 4 units after the 3-unit char gap
    }, unitMs * 3);
  }, [unitMs, flushChar, addWordGap, resetGapTimers]);

  // ─── STRAIGHT KEY ───────────────────────────────────────────────────
  const straightKeyDown = useCallback(() => {
    if (isKeyDown) return;
    setIsKeyDown(true);
    resetGapTimers();
    keyDownTimeRef.current = Date.now();
    if (!muted) startTone(frequency);
  }, [isKeyDown, resetGapTimers, muted, frequency]);

  const straightKeyUp = useCallback(() => {
    if (!isKeyDown) return;
    setIsKeyDown(false);
    stopTone();
    const duration = Date.now() - keyDownTimeRef.current;
    const threshold = unitMs * 2; // < 2 units = dot, >= 2 units = dash
    const element = duration < threshold ? '.' : '-';

    setCurrentMorse(prev => {
      const next = prev + element;
      startGapTimers(next);
      return next;
    });
  }, [isKeyDown, unitMs, startGapTimers]);

  // ─── SINGLE PADDLE ─────────────────────────────────────────────────
  const startPaddleRepeat = useCallback((element: 'dit' | 'dah') => {
    if (paddleIntervalRef.current) clearInterval(paddleIntervalRef.current);
    resetGapTimers();

    const addElement = () => {
      const el = element === 'dit' ? '.' : '-';
      if (!muted) {
        startTone(frequency);
        setTimeout(() => stopTone(), element === 'dit' ? unitMs : unitMs * 3);
      }
      setCurrentMorse(prev => prev + el);
    };

    addElement();
    const interval = element === 'dit' ? unitMs * 2 : unitMs * 4; // element + gap
    paddleIntervalRef.current = setInterval(addElement, interval);
  }, [unitMs, resetGapTimers, muted, frequency]);

  const stopPaddle = useCallback(() => {
    if (paddleIntervalRef.current) {
      clearInterval(paddleIntervalRef.current);
      paddleIntervalRef.current = null;
    }
    stopTone();
    // Use a ref to get current morse value
    setCurrentMorse(prev => {
      if (prev) startGapTimers(prev);
      return prev;
    });
  }, [startGapTimers]);

  // ─── DUAL PADDLE (IAMBIC-A) ────────────────────────────────────────
  const playIambicElement = useCallback((element: 'dit' | 'dah') => {
    if (iambicStateRef.current !== 'idle') return;
    iambicStateRef.current = element;
    resetGapTimers();

    const el = element === 'dit' ? '.' : '-';
    const duration = element === 'dit' ? unitMs : unitMs * 3;

    if (!muted) startTone(frequency);
    setCurrentMorse(prev => prev + el);

    iambicTimeoutRef.current = setTimeout(() => {
      stopTone();
      iambicStateRef.current = 'idle';

      // Check if the opposite paddle is still held (squeeze)
      const pending = pendingElementRef.current;
      if (pending && pending !== element) {
        pendingElementRef.current = null;
        setTimeout(() => playIambicElement(pending), unitMs);
      } else {
        // Start gap timers
        setCurrentMorse(prev => {
          startGapTimers(prev);
          return prev;
        });
      }
    }, duration);
  }, [unitMs, muted, frequency, resetGapTimers, startGapTimers]);

  // ─── Key event handlers ─────────────────────────────────────────────
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (tab !== 'keyer') return;
    if (e.repeat) return;
    // Don't capture if user is typing in an input/textarea
    if ((e.target as HTMLElement)?.tagName === 'TEXTAREA' || (e.target as HTMLElement)?.tagName === 'INPUT') return;

    if (keyType === 'straight') {
      if (e.code === 'Space' || e.code === 'KeyZ') {
        e.preventDefault();
        straightKeyDown();
      }
    } else if (keyType === 'single-paddle') {
      if (e.code === 'KeyZ' || e.code === 'ArrowLeft') {
        e.preventDefault();
        setIsDitDown(true);
        startPaddleRepeat('dit');
      } else if (e.code === 'KeyX' || e.code === 'ArrowRight') {
        e.preventDefault();
        setIsDahDown(true);
        startPaddleRepeat('dah');
      }
    } else if (keyType === 'dual-paddle') {
      if (e.code === 'KeyZ' || e.code === 'ArrowLeft') {
        e.preventDefault();
        setIsDitDown(true);
        if (iambicStateRef.current !== 'idle') {
          pendingElementRef.current = 'dit';
        } else {
          playIambicElement('dit');
        }
      } else if (e.code === 'KeyX' || e.code === 'ArrowRight') {
        e.preventDefault();
        setIsDahDown(true);
        if (iambicStateRef.current !== 'idle') {
          pendingElementRef.current = 'dah';
        } else {
          playIambicElement('dah');
        }
      }
    }
  }, [tab, keyType, straightKeyDown, startPaddleRepeat, playIambicElement]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (tab !== 'keyer') return;

    if (keyType === 'straight') {
      if (e.code === 'Space' || e.code === 'KeyZ') {
        e.preventDefault();
        straightKeyUp();
      }
    } else if (keyType === 'single-paddle') {
      if (e.code === 'KeyZ' || e.code === 'ArrowLeft') {
        setIsDitDown(false);
        stopPaddle();
      } else if (e.code === 'KeyX' || e.code === 'ArrowRight') {
        setIsDahDown(false);
        stopPaddle();
      }
    } else if (keyType === 'dual-paddle') {
      if (e.code === 'KeyZ' || e.code === 'ArrowLeft') {
        setIsDitDown(false);
        pendingElementRef.current = null;
      } else if (e.code === 'KeyX' || e.code === 'ArrowRight') {
        setIsDahDown(false);
        pendingElementRef.current = null;
      }
    }
  }, [tab, keyType, straightKeyUp, stopPaddle]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      resetGapTimers();
      if (paddleIntervalRef.current) clearInterval(paddleIntervalRef.current);
      if (iambicTimeoutRef.current) clearTimeout(iambicTimeoutRef.current);
      stopTone();
    };
  }, [resetGapTimers]);

  // ─── Text-to-Morse playback ─────────────────────────────────────────
  const morseOutput = useMemo(() => textToMorse(textInput), [textInput]);

  const handlePlay = useCallback(async () => {
    if (isPlaying) {
      abortRef.current.aborted = true;
      stopTone();
      setIsPlaying(false);
      setPlaybackHighlight(-1);
      return;
    }

    abortRef.current = { aborted: false };
    setIsPlaying(true);
    setPlaybackHighlight(0);

    await playMorseString(
      morseOutput,
      unitMs,
      muted ? 0 : frequency,
      (_type, idx) => setPlaybackHighlight(idx),
      abortRef.current,
    );

    setIsPlaying(false);
    setPlaybackHighlight(-1);
  }, [isPlaying, morseOutput, unitMs, frequency, muted]);

  // ─── Clear keyer output ─────────────────────────────────────────────
  const clearKeyer = useCallback(() => {
    setCurrentMorse('');
    setDecodedText('');
    setMorseDisplay('');
    resetGapTimers();
    if (paddleIntervalRef.current) clearInterval(paddleIntervalRef.current);
    stopTone();
  }, [resetGapTimers]);

  // ─── Morse reference table ──────────────────────────────────────────
  const morseTable = useMemo(() => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(c => ({ char: c, morse: CHAR_TO_MORSE[c] }));
    const numbers = '0123456789'.split('').map(c => ({ char: c, morse: CHAR_TO_MORSE[c] }));
    return { letters, numbers };
  }, []);

  const tabActive = 'bg-orange-900/50 border-orange-700 text-orange-300';
  const tabInactive = 'bg-stone-800 border-stone-700 text-stone-400 hover:text-stone-200';

  return (
    <div className="flex-1 bg-[#17150f] flex flex-col">
      <ExhibitPanel id="morse" />
      <div className="bg-[#17150f] flex flex-col items-center justify-start py-10 px-6 text-stone-200">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl sm:text-4xl font-typewriter font-bold text-stone-100 tracking-tighter">
              MORSE <span className="text-orange-500">CODE</span>
            </h1>
            <span className="text-stone-500 text-xs tracking-[0.3em] font-mono">TELEGRAPHIC COMMUNICATION — 1837</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMuted(!muted)}
              className="p-2 rounded-lg hover:bg-stone-800 text-stone-400 border border-stone-700"
              title={muted ? 'Unmute' : 'Mute'}
            >
              {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-lg hover:bg-stone-800 text-stone-400 border border-stone-700">
              <Info size={20} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-2 mb-8">
          <button
            onClick={() => setTab('keyer')}
            className={`px-6 py-2 rounded-lg font-bold text-sm border transition-colors ${tab === 'keyer' ? tabActive : tabInactive}`}
          >KEYER</button>
          <button
            onClick={() => setTab('text')}
            className={`px-6 py-2 rounded-lg font-bold text-sm border transition-colors ${tab === 'text' ? tabActive : tabInactive}`}
          >TEXT &harr; MORSE</button>
        </div>

        {/* ─── Controls (shared) ──────────────────────────────────────── */}
        <div className="bg-stone-900/60 rounded-2xl border border-stone-800 p-6 mb-6">
          <div className="grid sm:grid-cols-3 gap-6">
            {/* Speed */}
            <div>
              <label className="block text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-2">
                Speed (WPM)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range" min="5" max="40" value={wpm}
                  onChange={e => setWpm(Number(e.target.value))}
                  className="flex-1 accent-orange-500"
                />
                <span className="text-orange-400 font-mono text-lg font-bold w-8 text-right">{wpm}</span>
              </div>
            </div>
            {/* Frequency */}
            <div>
              <label className="block text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-2">
                Tone (Hz)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range" min="400" max="1000" step="50" value={frequency}
                  onChange={e => setFrequency(Number(e.target.value))}
                  className="flex-1 accent-orange-500"
                />
                <span className="text-orange-400 font-mono text-lg font-bold w-12 text-right">{frequency}</span>
              </div>
            </div>
            {/* Key Type (keyer tab only) */}
            {tab === 'keyer' && (
              <div>
                <label className="block text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-2">
                  Key Type
                </label>
                <div className="flex flex-col gap-1">
                  {(['straight', 'single-paddle', 'dual-paddle'] as KeyType[]).map(kt => (
                    <button
                      key={kt}
                      onClick={() => { setKeyType(kt); clearKeyer(); }}
                      className={`px-3 py-1 rounded text-xs font-bold border transition-colors text-left ${
                        keyType === kt
                          ? 'bg-orange-900/50 border-orange-700 text-orange-300'
                          : 'bg-stone-800 border-stone-700 text-stone-500 hover:text-stone-300'
                      }`}
                    >
                      {kt === 'straight' ? 'Straight Key' : kt === 'single-paddle' ? 'Single Paddle' : 'Dual Paddle (Iambic)'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── KEYER TAB ──────────────────────────────────────────────── */}
        {tab === 'keyer' && (
          <>
            {/* Key Visual */}
            <div className="bg-stone-900/60 rounded-2xl border border-stone-800 p-8 mb-6">
              <div className="text-center mb-4">
                <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-1">
                  {keyType === 'straight' ? 'Straight Key' : keyType === 'single-paddle' ? 'Single Paddle' : 'Dual Paddle (Iambic A)'}
                </div>
                <div className="text-[10px] text-stone-600 font-mono">
                  {keyType === 'straight'
                    ? 'Press & hold SPACE or Z — or click the key'
                    : keyType === 'single-paddle'
                    ? 'Z / ← = Dits   |   X / → = Dahs   |   or click buttons'
                    : 'Z / ← = Dit paddle   |   X / → = Dah paddle   |   Squeeze both for iambic'}
                </div>
              </div>

              {keyType === 'straight' ? (
                /* Straight key — single big button */
                <div className="flex justify-center">
                  <button
                    onMouseDown={e => { e.preventDefault(); straightKeyDown(); }}
                    onMouseUp={straightKeyUp}
                    onMouseLeave={() => { if (isKeyDown) straightKeyUp(); }}
                    onTouchStart={e => { e.preventDefault(); straightKeyDown(); }}
                    onTouchEnd={straightKeyUp}
                    className={`select-none w-48 h-24 rounded-2xl border-2 font-bold text-lg transition-all duration-75 ${
                      isKeyDown
                        ? 'bg-orange-600 border-orange-400 text-white shadow-lg shadow-orange-500/30 translate-y-1'
                        : 'bg-stone-800 border-stone-600 text-stone-400 hover:border-orange-700 shadow-md'
                    }`}
                  >
                    <div className={`text-3xl mb-1 ${isKeyDown ? 'text-white' : 'text-stone-500'}`}>
                      {isKeyDown ? '●' : '○'}
                    </div>
                    <div className="text-[10px] tracking-widest uppercase">
                      {isKeyDown ? 'CONTACT' : 'KEY'}
                    </div>
                  </button>
                </div>
              ) : (
                /* Paddle keys — two buttons */
                <div className="flex justify-center gap-6">
                  <button
                    onMouseDown={e => {
                      e.preventDefault();
                      setIsDitDown(true);
                      if (keyType === 'single-paddle') startPaddleRepeat('dit');
                      else {
                        if (iambicStateRef.current !== 'idle') pendingElementRef.current = 'dit';
                        else playIambicElement('dit');
                      }
                    }}
                    onMouseUp={() => {
                      setIsDitDown(false);
                      if (keyType === 'single-paddle') stopPaddle();
                      else pendingElementRef.current = null;
                    }}
                    onMouseLeave={() => {
                      if (isDitDown) {
                        setIsDitDown(false);
                        if (keyType === 'single-paddle') stopPaddle();
                        else pendingElementRef.current = null;
                      }
                    }}
                    onTouchStart={e => {
                      e.preventDefault();
                      setIsDitDown(true);
                      if (keyType === 'single-paddle') startPaddleRepeat('dit');
                      else {
                        if (iambicStateRef.current !== 'idle') pendingElementRef.current = 'dit';
                        else playIambicElement('dit');
                      }
                    }}
                    onTouchEnd={() => {
                      setIsDitDown(false);
                      if (keyType === 'single-paddle') stopPaddle();
                      else pendingElementRef.current = null;
                    }}
                    className={`select-none w-36 h-24 rounded-2xl border-2 font-bold transition-all duration-75 ${
                      isDitDown
                        ? 'bg-orange-600 border-orange-400 text-white shadow-lg shadow-orange-500/30 translate-y-1'
                        : 'bg-stone-800 border-stone-600 text-stone-400 hover:border-orange-700 shadow-md'
                    }`}
                  >
                    <div className="text-4xl mb-1">·</div>
                    <div className="text-[10px] tracking-widest uppercase">DIT</div>
                    <div className="text-[9px] text-stone-600 mt-1">Z / ←</div>
                  </button>
                  <button
                    onMouseDown={e => {
                      e.preventDefault();
                      setIsDahDown(true);
                      if (keyType === 'single-paddle') startPaddleRepeat('dah');
                      else {
                        if (iambicStateRef.current !== 'idle') pendingElementRef.current = 'dah';
                        else playIambicElement('dah');
                      }
                    }}
                    onMouseUp={() => {
                      setIsDahDown(false);
                      if (keyType === 'single-paddle') stopPaddle();
                      else pendingElementRef.current = null;
                    }}
                    onMouseLeave={() => {
                      if (isDahDown) {
                        setIsDahDown(false);
                        if (keyType === 'single-paddle') stopPaddle();
                        else pendingElementRef.current = null;
                      }
                    }}
                    onTouchStart={e => {
                      e.preventDefault();
                      setIsDahDown(true);
                      if (keyType === 'single-paddle') startPaddleRepeat('dah');
                      else {
                        if (iambicStateRef.current !== 'idle') pendingElementRef.current = 'dah';
                        else playIambicElement('dah');
                      }
                    }}
                    onTouchEnd={() => {
                      setIsDahDown(false);
                      if (keyType === 'single-paddle') stopPaddle();
                      else pendingElementRef.current = null;
                    }}
                    className={`select-none w-36 h-24 rounded-2xl border-2 font-bold transition-all duration-75 ${
                      isDahDown
                        ? 'bg-orange-600 border-orange-400 text-white shadow-lg shadow-orange-500/30 translate-y-1'
                        : 'bg-stone-800 border-stone-600 text-stone-400 hover:border-orange-700 shadow-md'
                    }`}
                  >
                    <div className="text-4xl mb-1">—</div>
                    <div className="text-[10px] tracking-widest uppercase">DAH</div>
                    <div className="text-[9px] text-stone-600 mt-1">X / →</div>
                  </button>
                </div>
              )}

              {/* Live element indicator */}
              <div className="mt-6 text-center">
                <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-2">Current Character</div>
                <div className="text-3xl font-mono text-orange-400 tracking-[0.5em] min-h-[2.5rem]">
                  {currentMorse || <span className="text-stone-700">···</span>}
                </div>
              </div>
            </div>

            {/* Decoded Output */}
            <div className="bg-stone-900/60 rounded-2xl border border-stone-800 p-6 mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="text-[10px] text-stone-500 uppercase tracking-widest font-bold">Morse Output</label>
                <button onClick={clearKeyer} className="text-stone-600 hover:text-orange-400 p-1" title="Clear">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="w-full min-h-[3rem] bg-stone-800/50 border border-stone-700/50 rounded-xl p-4 font-mono text-sm tracking-wider text-orange-300/80 break-all mb-4">
                {morseDisplay || <span className="text-stone-700">Tap the key to begin...</span>}
              </div>
              <label className="text-[10px] text-orange-400 uppercase tracking-widest font-bold mb-2 block">Decoded Text</label>
              <div className="w-full min-h-[3rem] bg-stone-800/50 border border-orange-900/30 rounded-xl p-4 font-mono text-lg tracking-wider text-orange-200 break-all">
                {decodedText || <span className="text-stone-700">...</span>}
              </div>
            </div>
          </>
        )}

        {/* ─── TEXT TAB ───────────────────────────────────────────────── */}
        {tab === 'text' && (
          <>
            {/* Text → Morse */}
            <div className="bg-stone-900/60 rounded-2xl border border-stone-800 p-6 mb-6">
              <label className="block text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-2">
                Plaintext
              </label>
              <textarea
                value={textInput}
                onChange={e => setTextInput(e.target.value.toUpperCase())}
                placeholder="TYPE YOUR MESSAGE..."
                className="w-full h-28 bg-stone-900 border border-stone-700 rounded-xl p-4 font-mono text-lg tracking-wider focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none text-stone-200 placeholder-stone-700"
                spellCheck={false}
              />

              <div className="flex items-center justify-between mt-4 mb-2">
                <label className="text-[10px] text-orange-400 uppercase tracking-widest font-bold">Morse Code</label>
                <button
                  onClick={handlePlay}
                  disabled={!morseOutput}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border transition-colors ${
                    isPlaying
                      ? 'bg-red-900/50 border-red-700 text-red-300'
                      : 'bg-orange-900/40 border-orange-700 text-orange-300 hover:bg-orange-900/60 disabled:opacity-30 disabled:cursor-not-allowed'
                  }`}
                >
                  {isPlaying ? <><Square size={12} /> STOP</> : <><Play size={12} /> PLAY</>}
                </button>
              </div>
              <div className="w-full min-h-[4rem] bg-stone-800/50 border border-stone-700/50 rounded-xl p-4 font-mono text-lg tracking-wider text-orange-200 break-all">
                {morseOutput ? (
                  morseOutput.split('').map((c, i) => (
                    <span key={i} className={i === playbackHighlight ? 'bg-orange-500/40 rounded px-0.5' : ''}>
                      {c}
                    </span>
                  ))
                ) : (
                  <span className="text-stone-700">...</span>
                )}
              </div>
            </div>

            {/* Morse → Text */}
            <div className="bg-stone-900/60 rounded-2xl border border-stone-800 p-6 mb-6">
              <label className="block text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-2">
                Morse Input (use . and - separated by spaces, / for word gaps)
              </label>
              <textarea
                value={morseInput}
                onChange={e => setMorseInput(e.target.value)}
                placeholder=".- -... -.-. / ...."
                className="w-full h-20 bg-stone-900 border border-stone-700 rounded-xl p-4 font-mono text-lg tracking-wider focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none text-stone-200 placeholder-stone-700"
                spellCheck={false}
              />
              <label className="block text-[10px] text-orange-400 uppercase tracking-widest font-bold mb-2 mt-4">Decoded Text</label>
              <div className="w-full min-h-[2.5rem] bg-stone-800/50 border border-orange-900/30 rounded-xl p-4 font-mono text-lg tracking-wider text-orange-200 break-all">
                {morseInput ? morseToText(morseInput) : <span className="text-stone-700">...</span>}
              </div>
            </div>
          </>
        )}

        {/* ─── Reference Table ────────────────────────────────────────── */}
        <div className="bg-stone-900/40 rounded-xl border border-stone-800 p-5">
          <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-3">
            International Morse Code
          </div>
          <div className="grid grid-cols-6 sm:grid-cols-9 gap-1 mb-3">
            {morseTable.letters.map(({ char, morse }) => (
              <div key={char} className="flex flex-col items-center py-2 px-1 rounded bg-stone-800/40 hover:bg-stone-800 transition-colors">
                <span className="text-sm font-bold text-orange-300">{char}</span>
                <span className="text-[10px] font-mono text-stone-500 tracking-wider">{morse}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-1">
            {morseTable.numbers.map(({ char, morse }) => (
              <div key={char} className="flex flex-col items-center py-2 px-1 rounded bg-stone-800/40 hover:bg-stone-800 transition-colors">
                <span className="text-sm font-bold text-orange-300">{char}</span>
                <span className="text-[10px] font-mono text-stone-500 tracking-wider">{morse}</span>
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
          <h3 className="text-xl font-bold text-orange-400 mb-2">About Morse Code</h3>
          <p className="text-sm text-stone-300 leading-relaxed mb-3">
            Developed by <strong>Samuel Morse</strong> and <strong>Alfred Vail</strong> in the 1830s for use with the electric telegraph.
            Characters are encoded as sequences of short signals (<strong>dits/dots</strong>) and long signals (<strong>dahs/dashes</strong>).
            A dash is three times the length of a dot. The standard word "PARIS" takes 50 units, defining Words Per Minute (WPM).
          </p>
          <p className="text-sm text-stone-300 leading-relaxed mb-3">
            <strong>Straight Key:</strong> A simple on/off switch. Press and hold — short press = dot, long press = dash. The original telegraph key.
          </p>
          <p className="text-sm text-stone-300 leading-relaxed mb-3">
            <strong>Single Paddle:</strong> Push one direction for auto-repeating dots, the other for auto-repeating dashes. Also called a "sideswiper" or "cootie key."
          </p>
          <p className="text-sm text-stone-300 leading-relaxed">
            <strong>Dual Paddle (Iambic):</strong> Separate paddles for dots and dashes. Squeezing both together alternates between them automatically (iambic keying),
            allowing experienced operators to send at very high speeds. Standard for modern CW operation.
          </p>
        </div>
      </div>
    </div>
    </div>
  );
}

export default App;
