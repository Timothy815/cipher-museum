import React from 'react';
import { KEYBOARD_LAYOUT } from '../constants';

interface LampboardProps {
  litChar: string | null;
}

export const Lampboard: React.FC<LampboardProps> = ({ litChar }) => {
  return (
    <div className="flex flex-col items-center gap-2 my-6 p-4 bg-black/20 rounded-xl">
      {KEYBOARD_LAYOUT.map((row, rIdx) => (
        <div key={rIdx} className="flex justify-center gap-3 sm:gap-4">
          {row.split('').map((char) => {
            const isLit = litChar === char;
            return (
              <div 
                key={char} 
                className={`
                  w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 flex items-center justify-center
                  text-lg font-bold transition-all duration-75
                  ${isLit 
                    ? 'bg-yellow-400 border-yellow-200 text-yellow-900 shadow-[0_0_25px_5px_rgba(250,204,21,0.8)] scale-105 z-10' 
                    : 'bg-slate-900 border-slate-700 text-slate-600 shadow-inner'
                  }
                `}
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
