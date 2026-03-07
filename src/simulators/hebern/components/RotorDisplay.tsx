import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { ALPHABET } from '../constants';

interface RotorDisplayProps {
  position: number;
  rotorId: number;
  onStep: (delta: number) => void;
  onChange: (position: number) => void;
}

export const RotorDisplay: React.FC<RotorDisplayProps> = ({ position, rotorId, onStep, onChange }) => {
  const letter = ALPHABET[position];
  const prev = ALPHABET[(position - 1 + 26) % 26];
  const next = ALPHABET[(position + 1) % 26];

  return (
    <div className="flex flex-col items-center">
      <span className="text-[10px] text-neutral-500 font-mono mb-1">Rotor</span>
      <div className="text-xs text-teal-500/80 font-bold mb-2 font-mono border border-teal-900/50 px-2 rounded bg-black/40">
        #{rotorId}
      </div>
      <button onClick={() => onStep(1)} className="text-neutral-500 hover:text-teal-400 transition-colors p-1">
        <ChevronUp size={22} />
      </button>
      <div className="bg-gradient-to-r from-neutral-700 via-neutral-600 to-neutral-700 rounded-lg p-1.5 border-x-4 border-neutral-800 shadow-2xl w-20">
        <div className="h-28 overflow-hidden relative rounded bg-neutral-900/50 flex flex-col items-center justify-center">
          <div className="text-neutral-600 font-mono text-xl opacity-50 select-none blur-[1px] scale-75 absolute top-3">{prev}</div>
          <div className="text-teal-100 font-typewriter text-4xl font-bold select-none z-10 drop-shadow-[0_0_8px_rgba(20,184,166,0.5)]">{letter}</div>
          <div className="text-neutral-600 font-mono text-xl opacity-50 select-none blur-[1px] scale-75 absolute bottom-3">{next}</div>
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none rounded"></div>
        </div>
      </div>
      <button onClick={() => onStep(-1)} className="text-neutral-500 hover:text-teal-400 transition-colors p-1">
        <ChevronDown size={22} />
      </button>
      <input
        className="mt-2 w-12 text-center bg-transparent border-b border-neutral-600 text-teal-100 focus:outline-none focus:border-teal-400 font-mono uppercase text-lg"
        value={letter}
        onChange={e => {
          const v = e.target.value.toUpperCase().slice(-1);
          if (ALPHABET.includes(v)) onChange(ALPHABET.indexOf(v));
        }}
        onFocus={e => e.target.select()}
      />
    </div>
  );
};
