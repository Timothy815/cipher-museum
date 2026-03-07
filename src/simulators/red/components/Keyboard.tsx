import React from 'react';
import { ALPHABET, SIXES_CHARS } from '../constants';

interface KeyboardProps {
  onMouseDown: (char: string) => void;
  onMouseUp: (char: string) => void;
  isPressed: (char: string) => boolean;
}

const ROWS = [ALPHABET.slice(0, 9), ALPHABET.slice(9, 18), ALPHABET.slice(18, 26)];

export const Keyboard: React.FC<KeyboardProps> = ({ onMouseDown, onMouseUp, isPressed }) => (
  <div className="flex flex-col items-center gap-2">
    {ROWS.map((row, ri) => (
      <div key={ri} className="flex gap-1.5 sm:gap-2">
        {row.split('').map(char => {
          const isSixes = SIXES_CHARS.includes(char);
          return (
            <button
              key={char}
              onMouseDown={() => onMouseDown(char)}
              onMouseUp={() => onMouseUp(char)}
              onMouseLeave={() => onMouseUp(char)}
              className={`w-9 h-9 sm:w-11 sm:h-11 rounded-lg text-sm sm:text-base font-bold font-mono transition-all border select-none ${
                isPressed(char)
                  ? 'bg-rose-700 border-rose-500 text-white scale-95 shadow-inner'
                  : isSixes
                    ? 'bg-rose-950/30 border-rose-900/50 text-rose-300 hover:bg-rose-900/40 active:scale-95 shadow-md'
                    : 'bg-neutral-800 border-neutral-600 text-neutral-200 hover:bg-neutral-700 active:scale-95 shadow-md'
              }`}
            >
              {char}
            </button>
          );
        })}
      </div>
    ))}
    <div className="mt-1 flex gap-4 text-[9px] font-mono text-neutral-600">
      <span><span className="text-rose-400">Tinted</span> = Sixes (vowels)</span>
      <span>Plain = Twenties (consonants)</span>
    </div>
  </div>
);
