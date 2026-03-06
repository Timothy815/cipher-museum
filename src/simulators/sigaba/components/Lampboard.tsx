import React from 'react';

interface LampboardProps {
  litChar: string | null;
}

const ROWS = [
  'QWERTYUIOP',
  'ASDFGHJKL',
  'ZXCVBNM'
];

const Lampboard: React.FC<LampboardProps> = ({ litChar }) => {
  return (
    <div className="flex flex-col items-center gap-3 bg-[#0a0a0f] p-6 rounded-xl border-b-4 border-gray-800 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] mb-4">
      <div className="text-amber-900/50 text-xs font-mono tracking-widest mb-2 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-red-900 animate-pulse"></div>
        OUTPUT DISPLAY
      </div>
      {ROWS.map((row, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {row.split('').map((char) => {
            const isLit = litChar === char;
            return (
              <div
                key={char}
                className={`
                  w-12 h-12 md:w-14 md:h-14 rounded-full font-mono text-xl font-bold flex items-center justify-center border-2 transition-all duration-100 relative
                  ${isLit 
                    ? 'bg-amber-400 border-amber-200 text-amber-950 shadow-[0_0_25px_rgba(251,191,36,0.8),inset_0_0_10px_rgba(255,255,255,0.5)] z-10 scale-105' 
                    : 'bg-[#1a1a1a] border-gray-800 text-gray-800 shadow-inner'
                  }
                `}
              >
                {char}
                {/* Glow Effect Layer */}
                {isLit && <div className="absolute inset-0 rounded-full bg-amber-400 blur-md opacity-50"></div>}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default Lampboard;