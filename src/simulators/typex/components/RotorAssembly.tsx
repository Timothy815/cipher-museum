import React from 'react';
import { RotorConfig } from '../types';
import { ALPHABET } from '../constants';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface RotorAssemblyProps {
  rotors: [RotorConfig, RotorConfig, RotorConfig, RotorConfig, RotorConfig];
  onChange: (index: number, newConfig: Partial<RotorConfig>) => void;
}

const POSITION_LABELS = ['Stator 1', 'Stator 2', 'Slow', 'Medium', 'Fast'];

const RotorUnit: React.FC<{
  rotor: RotorConfig;
  index: number;
  onChange: (cfg: Partial<RotorConfig>) => void;
}> = ({ rotor, index, onChange }) => {
  const currentLetter = ALPHABET[rotor.position];
  const prevLetter = ALPHABET[(rotor.position - 1 + 26) % 26];
  const nextLetter = ALPHABET[(rotor.position + 1) % 26];
  const isStator = rotor.isStator;

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
      {/* Position label */}
      <div className={`text-[10px] font-mono mb-1 tracking-widest uppercase ${isStator ? 'text-cyan-400/70' : 'text-emerald-400/70'}`}>
        {POSITION_LABELS[index]}
      </div>

      {/* Rotor type badge */}
      <div className={`text-xs font-bold mb-2 font-mono border px-1.5 rounded ${
        isStator
          ? 'text-cyan-400/80 border-cyan-800/50 bg-black/40'
          : 'text-emerald-400/80 border-emerald-800/50 bg-black/40'
      }`}>
        {rotor.type}
      </div>

      {/* Step Up */}
      <button
        onClick={() => handleStep(1)}
        className="text-stone-500 hover:text-amber-300 transition-colors p-1"
      >
        <ChevronUp size={20} />
      </button>

      {/* Wheel Window */}
      <div className={`bg-gradient-to-r from-stone-800 via-stone-700 to-stone-800 rounded-lg p-1 shadow-2xl w-14 sm:w-16 ${
        isStator ? 'border-x-4 border-cyan-900/60' : 'border-x-4 border-emerald-900/60'
      }`}>
        <div className="h-24 overflow-hidden relative rounded bg-stone-900/50 flex flex-col items-center justify-center">
          <div className="text-stone-600 font-mono text-lg opacity-50 select-none blur-[1px] transform scale-75 translate-y-[-100%] absolute top-2">
            {prevLetter}
          </div>
          <div className={`font-mono text-3xl font-bold select-none z-10 drop-shadow-md ${
            isStator ? 'text-cyan-100' : 'text-emerald-100'
          }`}>
            {currentLetter}
          </div>
          <div className="text-stone-600 font-mono text-lg opacity-50 select-none blur-[1px] transform scale-75 translate-y-[100%] absolute bottom-2">
            {nextLetter}
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none rounded"></div>
        </div>
      </div>

      {/* Step Down */}
      <button
        onClick={() => handleStep(-1)}
        className="text-stone-500 hover:text-amber-300 transition-colors p-1"
      >
        <ChevronDown size={20} />
      </button>

      {/* Manual input */}
      <input
        className={`mt-2 w-10 text-center bg-transparent border-b focus:outline-none font-mono uppercase transition-colors ${
          isStator
            ? 'border-cyan-800/60 text-cyan-100 focus:border-cyan-400'
            : 'border-emerald-800/60 text-emerald-100 focus:border-emerald-400'
        }`}
        value={currentLetter}
        onChange={handleType}
        onFocus={(e) => e.target.select()}
        aria-label={`Set ${POSITION_LABELS[index]} position`}
      />

      {/* Ring setting */}
      <div className="mt-1 text-[10px] text-stone-500 font-mono" title={`Ring: ${ALPHABET[rotor.ringSetting]}`}>
        R:{ALPHABET[rotor.ringSetting]}
      </div>
    </div>
  );
};

export const RotorAssembly: React.FC<RotorAssemblyProps> = ({ rotors, onChange }) => {
  return (
    <div className="flex justify-center items-end bg-stone-950 p-6 rounded-xl border border-stone-800 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] relative">
      <div className="absolute top-2 left-4 text-stone-700 text-xs font-mono tracking-widest opacity-50">TYPEX MK II</div>
      <div className="absolute top-2 right-4 text-stone-700 text-xs font-mono tracking-widest opacity-50">SER. 4471</div>

      {/* Stator / Stepping divider */}
      <div className="flex items-end gap-1">
        {/* Stators */}
        <div className="flex">
          {rotors.slice(0, 2).map((rotor, i) => (
            <RotorUnit
              key={i}
              index={i}
              rotor={rotor}
              onChange={(cfg) => onChange(i, cfg)}
            />
          ))}
        </div>

        <div className="w-px h-32 bg-stone-700 mx-2 self-center"></div>

        {/* Stepping rotors */}
        <div className="flex">
          {rotors.slice(2).map((rotor, i) => (
            <RotorUnit
              key={i + 2}
              index={i + 2}
              rotor={rotor}
              onChange={(cfg) => onChange(i + 2, cfg)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
