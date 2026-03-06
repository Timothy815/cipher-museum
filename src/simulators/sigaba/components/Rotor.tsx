import React from 'react';
import { RotorConfig } from '../types';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface RotorProps {
  rotor: RotorConfig;
  onChange: (id: number, newPos: number) => void;
  label?: string;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const Rotor: React.FC<RotorProps> = ({ rotor, onChange, label }) => {
  const handleNext = () => onChange(rotor.id, (rotor.currentPos + 1) % 26);
  const handlePrev = () => onChange(rotor.id, (rotor.currentPos - 1 + 26) % 26);

  const prevChar = ALPHABET[(rotor.currentPos - 1 + 26) % 26];
  const currentChar = ALPHABET[rotor.currentPos];
  const nextChar = ALPHABET[(rotor.currentPos + 1) % 26];

  return (
    <div className="flex flex-col items-center mx-1">
      {label && <span className="text-[10px] text-gray-400 mb-1 font-mono tracking-widest uppercase">{label}</span>}
      <div className="bg-gradient-to-b from-gray-700 to-gray-900 p-2 rounded-lg border-2 border-gray-600 shadow-xl flex flex-col items-center w-12">
        <button onClick={handleNext} className="text-gray-400 hover:text-amber-500 transition-colors p-1">
          <ChevronUp size={16} />
        </button>
        
        <div className="h-20 w-full bg-black/50 rounded border border-gray-700 my-1 flex flex-col items-center justify-center overflow-hidden relative shadow-inner">
          <div className="absolute top-0 w-full h-8 bg-gradient-to-b from-black to-transparent opacity-50 pointer-events-none"></div>
          
          <div className="text-gray-600 text-xs transform -translate-y-4 blur-[1px] select-none">{nextChar}</div>
          <div className="text-amber-500 font-bold font-mono text-xl z-10 select-none bg-gray-800/80 w-full text-center py-1 border-y border-gray-600/50 shadow-lg backdrop-blur-sm">
            {currentChar}
          </div>
          <div className="text-gray-600 text-xs transform translate-y-4 blur-[1px] select-none">{prevChar}</div>

          <div className="absolute bottom-0 w-full h-8 bg-gradient-to-t from-black to-transparent opacity-50 pointer-events-none"></div>
        </div>

        <button onClick={handlePrev} className="text-gray-400 hover:text-amber-500 transition-colors p-1">
          <ChevronDown size={16} />
        </button>
      </div>
    </div>
  );
};

export default Rotor;