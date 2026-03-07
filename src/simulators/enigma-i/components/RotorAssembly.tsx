import React from 'react';
import { RotorConfig } from '../types';
import { ALPHABET } from '../constants';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface RotorAssemblyProps {
  rotors: [RotorConfig, RotorConfig, RotorConfig];
  onChange: (index: number, newConfig: Partial<RotorConfig>) => void;
}

const LABELS = ['Left', 'Mid', 'Right'];

const RotorUnit: React.FC<{
  rotor: RotorConfig;
  label: string;
  onChange: (newConfig: Partial<RotorConfig>) => void;
}> = ({ rotor, label, onChange }) => {
  const currentLetter = ALPHABET[rotor.position];
  const prevLetter = ALPHABET[(rotor.position - 1 + 26) % 26];
  const nextLetter = ALPHABET[(rotor.position + 1) % 26];

  const handleStep = (dir: 1 | -1) => {
    onChange({ position: (rotor.position + dir + 26) % 26 });
  };

  const handleType = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().slice(-1);
    if (ALPHABET.includes(val)) {
      onChange({ position: ALPHABET.indexOf(val) });
    }
  };

  return (
    <div className="flex flex-col items-center mx-2 sm:mx-3">
      <div className="text-[10px] text-stone-400 font-mono mb-1 tracking-widest uppercase">{label}</div>
      <div className="text-xs text-yellow-600/80 font-bold mb-2 font-mono border border-yellow-900/50 px-1.5 rounded bg-black/40">
        {rotor.type}
      </div>

      <button onClick={() => handleStep(1)} className="text-stone-500 hover:text-yellow-400 transition-colors p-1">
        <ChevronUp size={20} />
      </button>

      <div className="bg-gradient-to-r from-stone-700 via-stone-600 to-stone-700 rounded-lg p-1 border-x-4 border-stone-800 shadow-2xl w-14 sm:w-16">
        <div className="h-24 overflow-hidden relative rounded bg-stone-900/50 flex flex-col items-center justify-center">
          <div className="text-stone-600 font-mono text-lg opacity-50 select-none blur-[1px] transform scale-75 translate-y-[-100%] absolute top-2">
            {prevLetter}
          </div>
          <div className="text-yellow-100 font-typewriter text-3xl font-bold select-none z-10 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]">
            {currentLetter}
          </div>
          <div className="text-stone-600 font-mono text-lg opacity-50 select-none blur-[1px] transform scale-75 translate-y-[100%] absolute bottom-2">
            {nextLetter}
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none rounded"></div>
        </div>
      </div>

      <button onClick={() => handleStep(-1)} className="text-stone-500 hover:text-yellow-400 transition-colors p-1">
        <ChevronDown size={20} />
      </button>

      <input
        className="mt-2 w-10 text-center bg-transparent border-b border-stone-600 text-yellow-100 focus:outline-none focus:border-yellow-400 font-mono uppercase transition-colors"
        value={currentLetter}
        onChange={handleType}
        onFocus={(e) => e.target.select()}
        aria-label={`Set ${label} rotor position`}
      />
      <div className="mt-1 text-[10px] text-stone-500 font-mono" title={`Ring: ${ALPHABET[rotor.ringSetting]}`}>
        R:{ALPHABET[rotor.ringSetting]}
      </div>
    </div>
  );
};

export const RotorAssembly: React.FC<RotorAssemblyProps> = ({ rotors, onChange }) => {
  return (
    <div className="flex justify-center items-end bg-stone-950 p-6 rounded-xl border border-stone-800 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] relative">
      <div className="absolute top-2 left-4 text-stone-700 text-xs font-mono tracking-widest opacity-50">ENIGMA I</div>
      <div className="absolute top-2 right-4 text-stone-700 text-xs font-mono tracking-widest opacity-50">WEHRMACHT</div>
      {rotors.map((rotor, i) => (
        <RotorUnit key={i} rotor={rotor} label={LABELS[i]} onChange={(cfg) => onChange(i, cfg)} />
      ))}
    </div>
  );
};
