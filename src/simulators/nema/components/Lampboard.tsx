import React from 'react';
import { ALPHABET } from '../constants';

interface LampboardProps {
  litChar: string | null;
}

const ROWS = [ALPHABET.slice(0, 9), ALPHABET.slice(9, 18), ALPHABET.slice(18, 26)];

export const Lampboard: React.FC<LampboardProps> = ({ litChar }) => (
  <div className="flex flex-col items-center gap-2">
    {ROWS.map((row, ri) => (
      <div key={ri} className="flex gap-1.5 sm:gap-2">
        {row.split('').map(char => (
          <div
            key={char}
            className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-sm sm:text-base font-bold font-mono transition-all duration-100 border ${
              litChar === char
                ? 'bg-sky-400 text-sky-950 border-sky-300 shadow-[0_0_20px_rgba(56,189,248,0.7)]'
                : 'bg-neutral-900 text-neutral-500 border-neutral-700'
            }`}
          >
            {char}
          </div>
        ))}
      </div>
    ))}
  </div>
);
