import React from 'react';
import { KEYBOARD_LAYOUT } from '../constants';

interface LampboardProps {
  litChar: string | null;
}

export const Lampboard: React.FC<LampboardProps> = ({ litChar }) => {
  return (
    <div className="flex flex-col items-center gap-2">
      {KEYBOARD_LAYOUT.map((row, ri) => (
        <div key={ri} className="flex gap-1.5 sm:gap-2">
          {row.split('').map(char => {
            const isLit = litChar === char;
            return (
              <div
                key={char}
                className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-sm sm:text-base font-bold font-mono transition-all duration-100 border ${
                  isLit
                    ? 'bg-yellow-400 text-yellow-950 border-yellow-300 shadow-[0_0_20px_rgba(234,179,8,0.7)]'
                    : 'bg-stone-900 text-stone-500 border-stone-700'
                }`}
              >
                {char}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};
