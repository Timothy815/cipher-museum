import React from 'react';
import { RotorConfig, RotorType } from '../types';
import { ALPHABET } from '../constants';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface RotorAssemblyProps {
  rotors: [RotorConfig, RotorConfig, RotorConfig, RotorConfig];
  onChange: (index: number, newConfig: Partial<RotorConfig>) => void;
}

const RotorUnit: React.FC<{
  rotor: RotorConfig;
  index: number;
  isGreek?: boolean;
  onChange: (newConfig: Partial<RotorConfig>) => void;
}> = ({ rotor, index, isGreek, onChange }) => {
  const currentLetter = ALPHABET[rotor.position];
  
  // We calculate prev/next letters for visual context (the wheel effect)
  const prevLetter = ALPHABET[(rotor.position - 1 + 26) % 26];
  const nextLetter = ALPHABET[(rotor.position + 1) % 26];

  const handleStep = (dir: 1 | -1) => {
    const newPos = (rotor.position + dir + 26) % 26;
    onChange({ position: newPos });
  };

  const handleType = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().slice(-1);
    if (ALPHABET.includes(val)) {
      onChange({ position: ALPHABET.indexOf(val) });
    }
  };

  return (
    <div className="flex flex-col items-center mx-1 sm:mx-2 group">
      <div className="text-[10px] text-slate-400 font-mono mb-1 tracking-widest uppercase">
         {isGreek ? 'Gr' : index === 1 ? 'Left' : index === 2 ? 'Mid' : 'Right'}
      </div>
      
      {/* Type Label */}
      <div className="text-xs text-amber-500/80 font-bold mb-2 font-mono border border-amber-900/50 px-1 rounded bg-black/40">
        {rotor.type}
      </div>

      {/* Step Up Button */}
      <button
        onClick={() => handleStep(1)}
        className="text-slate-500 hover:text-amber-400 transition-colors z-10 p-1"
      >
        <ChevronUp size={20} />
      </button>

      {/* The Mechanical Wheel Visual */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 rounded-lg p-1 border-x-4 border-slate-900 shadow-2xl w-14 sm:w-16">

        {/* Window */}
        <div className="h-24 overflow-hidden relative rounded bg-slate-900/50 inner-shadow flex flex-col items-center justify-center mask-image-gradient">
          <div className="text-slate-600 font-mono text-lg opacity-50 select-none blur-[1px] transform scale-75 translate-y-[-100%] absolute top-2">
            {prevLetter}
          </div>

          <div className="text-amber-100 font-typewriter text-3xl font-bold select-none z-10 drop-shadow-[0_0_5px_rgba(251,191,36,0.5)]">
            {currentLetter}
          </div>

          <div className="text-slate-600 font-mono text-lg opacity-50 select-none blur-[1px] transform scale-75 translate-y-[100%] absolute bottom-2">
            {nextLetter}
          </div>

          {/* Glass glare effect */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none rounded"></div>
        </div>
      </div>

      {/* Step Down Button */}
      <button
        onClick={() => handleStep(-1)}
        className="text-slate-500 hover:text-amber-400 transition-colors z-10 p-1"
      >
        <ChevronDown size={20} />
      </button>

      {/* Manual Input */}
      <input
        className="mt-2 w-10 text-center bg-transparent border-b border-slate-600 text-amber-100 focus:outline-none focus:border-amber-400 font-mono uppercase transition-colors"
        value={currentLetter}
        onChange={handleType}
        onFocus={(e) => e.target.select()}
        aria-label={`Set rotor ${index + 1} position`}
      />
      
      {/* Ring Setting Indicator (Small) */}
      <div className="mt-1 text-[10px] text-slate-500 font-mono" title={`Ring Setting: ${ALPHABET[rotor.ringSetting]}`}>
        R:{ALPHABET[rotor.ringSetting]}
      </div>
    </div>
  );
};

export const RotorAssembly: React.FC<RotorAssemblyProps> = ({ rotors, onChange }) => {
  return (
    <div className="flex justify-center items-end bg-slate-950 p-6 rounded-xl border border-slate-800 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] relative">
      {/* Metallic/Wooden chassis details */}
      <div className="absolute top-2 left-4 text-slate-700 text-xs font-mono tracking-widest opacity-50">CHIPREMASCHINE M4</div>
      <div className="absolute top-2 right-4 text-slate-700 text-xs font-mono tracking-widest opacity-50">SER. 8129</div>

      {rotors.map((rotor, i) => (
        <RotorUnit 
          key={i} 
          index={i} 
          rotor={rotor} 
          isGreek={i === 0}
          onChange={(cfg) => onChange(i, cfg)} 
        />
      ))}
    </div>
  );
};
