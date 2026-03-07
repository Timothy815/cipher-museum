import React from 'react';
import { ChevronUp, ChevronDown, RotateCcw } from 'lucide-react';
import { RotorConfig } from '../types';
import { ALPHABET } from '../constants';

interface RotorAssemblyProps {
  rotors: RotorConfig[];
  onChange: (index: number, config: Partial<RotorConfig>) => void;
}

export const RotorAssembly: React.FC<RotorAssemblyProps> = ({ rotors, onChange }) => {
  return (
    <div className="bg-stone-900/60 rounded-2xl border border-stone-800 p-6 shadow-xl">
      <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-4 text-center">
        10-Rotor Assembly
      </div>
      <div className="flex justify-center gap-2 sm:gap-3 flex-wrap">
        {rotors.map((rotor, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            {/* Rotor number */}
            <span className="text-[9px] font-mono text-stone-600">{rotor.id}</span>

            {/* Up button */}
            <button
              onClick={() => onChange(i, { position: (rotor.position + 1) % 26 })}
              className="text-stone-500 hover:text-red-400 transition-colors p-0.5"
            >
              <ChevronUp size={14} />
            </button>

            {/* Rotor display */}
            <div className={`w-10 h-12 sm:w-12 sm:h-14 rounded-lg border-2 flex items-center justify-center font-mono text-lg sm:text-xl font-bold shadow-inner transition-colors ${
              rotor.reversed
                ? 'bg-red-950/40 border-red-800/60 text-red-300'
                : 'bg-stone-800 border-stone-600 text-stone-100'
            }`}>
              {ALPHABET[rotor.position]}
            </div>

            {/* Down button */}
            <button
              onClick={() => onChange(i, { position: (rotor.position - 1 + 26) % 26 })}
              className="text-stone-500 hover:text-red-400 transition-colors p-0.5"
            >
              <ChevronDown size={14} />
            </button>

            {/* Reverse toggle */}
            <button
              onClick={() => onChange(i, { reversed: !rotor.reversed })}
              className={`p-1 rounded transition-colors ${
                rotor.reversed
                  ? 'text-red-400 bg-red-950/30'
                  : 'text-stone-600 hover:text-stone-400'
              }`}
              title={rotor.reversed ? 'Reversed' : 'Forward'}
            >
              <RotateCcw size={12} />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-center gap-4 text-[9px] font-mono text-stone-600">
        <span>Normal = white</span>
        <span className="text-red-400">Reversed = red</span>
      </div>
    </div>
  );
};
