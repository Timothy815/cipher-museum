import React from 'react';

interface KeyboardProps {
  onMouseDown: (char: string) => void;
  onMouseUp: (char: string) => void;
  isPressed: (char: string) => boolean;
}

const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

export const Keyboard: React.FC<KeyboardProps> = ({ onMouseDown, onMouseUp, isPressed }) => {
  return (
    <div className="flex flex-col items-center gap-2">
      {ROWS.map((row, ri) => (
        <div key={ri} className="flex gap-1.5">
          {row.split('').map(char => (
            <button
              key={char}
              onMouseDown={() => onMouseDown(char)}
              onMouseUp={() => onMouseUp(char)}
              onMouseLeave={() => onMouseUp(char)}
              className={`
                w-9 h-10 sm:w-11 sm:h-12 rounded-lg font-mono text-sm font-bold
                transition-all duration-75 border select-none
                ${isPressed(char)
                  ? 'bg-emerald-700 border-emerald-500 text-white translate-y-0.5 shadow-none'
                  : 'bg-stone-800 border-stone-600 text-stone-300 shadow-[0_3px_0_0_#1c1917] hover:bg-stone-700 active:translate-y-0.5 active:shadow-none'
                }
              `}
            >
              {char}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
};
