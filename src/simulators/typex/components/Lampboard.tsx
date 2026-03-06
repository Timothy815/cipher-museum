import React from 'react';

interface LampboardProps {
  litChar: string | null;
}

const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

export const Lampboard: React.FC<LampboardProps> = ({ litChar }) => {
  return (
    <div className="flex flex-col items-center gap-2 bg-stone-950 p-5 rounded-xl border border-stone-800 shadow-[inset_0_0_15px_rgba(0,0,0,0.6)]">
      <div className="text-stone-600 text-[10px] font-mono tracking-widest mb-1">LAMP PANEL</div>
      {ROWS.map((row, ri) => (
        <div key={ri} className="flex gap-2 sm:gap-3">
          {row.split('').map(char => {
            const isLit = litChar === char;
            return (
              <div
                key={char}
                className={`
                  w-9 h-9 sm:w-11 sm:h-11 rounded-full font-mono text-sm sm:text-base font-bold
                  flex items-center justify-center border-2 transition-all duration-100 relative
                  ${isLit
                    ? 'bg-amber-300 border-amber-200 text-stone-900 shadow-[0_0_20px_rgba(251,191,36,0.7),inset_0_0_8px_rgba(255,255,255,0.4)] scale-105'
                    : 'bg-stone-900 border-stone-700 text-stone-700 shadow-inner'
                  }
                `}
              >
                {char}
                {isLit && <div className="absolute inset-0 rounded-full bg-amber-300 blur-md opacity-40"></div>}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};
