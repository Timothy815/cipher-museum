import React from 'react';
import { SIXES_CHARS, TWENTIES_CHARS } from '../constants';

interface LampboardProps {
  litChar: string | null;
}

export const Lampboard: React.FC<LampboardProps> = ({ litChar }) => (
  <div className="flex flex-col items-center gap-3">
    {/* Sixes row */}
    <div className="flex gap-1.5">
      {SIXES_CHARS.split('').map(c => (
        <div key={c} className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-sm font-bold font-mono transition-all border ${
          litChar === c
            ? 'bg-rose-500 text-white border-rose-400 shadow-[0_0_18px_rgba(244,63,94,0.7)]'
            : 'bg-neutral-900 text-neutral-500 border-neutral-700'
        }`}>{c}</div>
      ))}
    </div>
    {/* Twenties rows */}
    {[TWENTIES_CHARS.slice(0, 10), TWENTIES_CHARS.slice(10)].map((row, ri) => (
      <div key={ri} className="flex gap-1.5">
        {row.split('').map(c => (
          <div key={c} className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-sm font-bold font-mono transition-all border ${
            litChar === c
              ? 'bg-indigo-500 text-white border-indigo-400 shadow-[0_0_18px_rgba(99,102,241,0.7)]'
              : 'bg-neutral-900 text-neutral-500 border-neutral-700'
          }`}>{c}</div>
        ))}
      </div>
    ))}
  </div>
);
