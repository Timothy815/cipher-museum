import React from 'react';
import { ALPHABET } from '../constants';

interface KeyboardProps {
  onMouseDown: (char: string) => void;
  onMouseUp: (char: string) => void;
  isPressed: (char: string) => boolean;
}

const ROWS = [
  ALPHABET.slice(0, 9),
  ALPHABET.slice(9, 18),
  ALPHABET.slice(18, 26),
];

export const Keyboard: React.FC<KeyboardProps> = ({ onMouseDown, onMouseUp, isPressed }) => {
  return (
    <div className="flex flex-col items-center gap-2">
      {ROWS.map((row, ri) => (
        <div key={ri} className="flex gap-1.5 sm:gap-2">
          {row.split('').map(char => (
            <button
              key={char}
              onMouseDown={() => onMouseDown(char)}
              onMouseUp={() => onMouseUp(char)}
              onMouseLeave={() => onMouseUp(char)}
              className={`w-9 h-9 sm:w-11 sm:h-11 rounded-lg text-sm sm:text-base font-bold font-mono transition-all border select-none ${
                isPressed(char)
                  ? 'bg-red-700 border-red-500 text-white scale-95 shadow-inner'
                  : 'bg-stone-800 border-stone-600 text-stone-200 hover:bg-stone-700 active:scale-95 shadow-md'
              }`}
            >
              {char}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
};
