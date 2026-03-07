import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { RotorConfig } from '../types';
import { ALPHABET } from '../constants';

interface RotorAssemblyProps {
  rotors: [RotorConfig, RotorConfig, RotorConfig, RotorConfig];
  driveWheel: { position: number; notches: number[] };
  onChange: (index: number, config: Partial<RotorConfig>) => void;
  onDriveChange: (position: number) => void;
}

const LABELS = ['Slow', 'Mid-L', 'Mid-R', 'Fast'];

export const RotorAssembly: React.FC<RotorAssemblyProps> = ({ rotors, driveWheel, onChange, onDriveChange }) => {
  return (
    <div className="bg-neutral-950 rounded-xl border border-neutral-800 p-6 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] relative">
      <div className="absolute top-2 left-4 text-neutral-700 text-xs font-mono tracking-widest opacity-50">NEMA</div>
      <div className="absolute top-2 right-4 text-neutral-700 text-xs font-mono tracking-widest opacity-50">TD / SCHWEIZ</div>

      <div className="flex justify-center items-end gap-3 sm:gap-5">
        {/* Drive Wheel */}
        <div className="flex flex-col items-center mx-1">
          <span className="text-[9px] text-neutral-500 font-mono mb-1">Drive</span>
          <div className="text-[10px] text-orange-500/80 font-bold mb-2 font-mono border border-orange-900/50 px-1 rounded bg-black/40">
            TR
          </div>
          <button onClick={() => onDriveChange((driveWheel.position + 1) % 26)} className="text-neutral-500 hover:text-orange-400 transition-colors p-0.5">
            <ChevronUp size={16} />
          </button>
          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg border-2 flex items-center justify-center font-mono text-lg font-bold shadow-inner ${
            driveWheel.notches.includes(driveWheel.position)
              ? 'bg-orange-950/50 border-orange-700 text-orange-300'
              : 'bg-neutral-800 border-neutral-600 text-neutral-300'
          }`}>
            {ALPHABET[driveWheel.position]}
          </div>
          <button onClick={() => onDriveChange((driveWheel.position - 1 + 26) % 26)} className="text-neutral-500 hover:text-orange-400 transition-colors p-0.5">
            <ChevronDown size={16} />
          </button>
        </div>

        <div className="w-px h-20 bg-neutral-800 mx-1"></div>

        {/* 4 Cipher Rotors */}
        {rotors.map((rotor, i) => {
          const letter = ALPHABET[rotor.position];
          const prevLetter = ALPHABET[(rotor.position - 1 + 26) % 26];
          const nextLetter = ALPHABET[(rotor.position + 1) % 26];
          const atNotch = rotor.notchRing.includes(rotor.position);

          return (
            <div key={i} className="flex flex-col items-center">
              <span className="text-[9px] text-neutral-500 font-mono mb-1">{LABELS[i]}</span>
              <div className="text-[10px] text-sky-500/80 font-bold mb-2 font-mono border border-sky-900/50 px-1 rounded bg-black/40">
                {rotor.id}
              </div>
              <button
                onClick={() => onChange(i, { position: (rotor.position + 1) % 26 })}
                className="text-neutral-500 hover:text-sky-400 transition-colors p-1"
              >
                <ChevronUp size={18} />
              </button>
              <div className="bg-gradient-to-r from-neutral-700 via-neutral-600 to-neutral-700 rounded-lg p-1 border-x-4 border-neutral-800 shadow-2xl w-13 sm:w-16">
                <div className="h-24 overflow-hidden relative rounded bg-neutral-900/50 flex flex-col items-center justify-center">
                  <div className="text-neutral-600 font-mono text-lg opacity-50 select-none blur-[1px] scale-75 absolute top-2">
                    {prevLetter}
                  </div>
                  <div className={`font-typewriter text-3xl font-bold select-none z-10 drop-shadow-[0_0_5px_rgba(56,189,248,0.4)] ${
                    atNotch ? 'text-orange-300' : 'text-sky-100'
                  }`}>
                    {letter}
                  </div>
                  <div className="text-neutral-600 font-mono text-lg opacity-50 select-none blur-[1px] scale-75 absolute bottom-2">
                    {nextLetter}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none rounded"></div>
                </div>
              </div>
              <button
                onClick={() => onChange(i, { position: (rotor.position - 1 + 26) % 26 })}
                className="text-neutral-500 hover:text-sky-400 transition-colors p-1"
              >
                <ChevronDown size={18} />
              </button>
              <input
                className="mt-1 w-10 text-center bg-transparent border-b border-neutral-600 text-sky-100 focus:outline-none focus:border-sky-400 font-mono uppercase text-sm"
                value={letter}
                onChange={e => {
                  const v = e.target.value.toUpperCase().slice(-1);
                  if (ALPHABET.includes(v)) onChange(i, { position: ALPHABET.indexOf(v) });
                }}
                onFocus={e => e.target.select()}
              />
              <div className="mt-1 text-[9px] text-neutral-600 font-mono">R:{ALPHABET[rotor.ringSetting]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
