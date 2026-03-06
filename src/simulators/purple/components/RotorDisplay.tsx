import React from 'react';
import { MachineState } from '../types';

interface RotorDisplayProps {
  state: MachineState;
  activePath: 'sixes' | 'twenties' | null;
}

const RotorUnit: React.FC<{ label: string; value: number; max: number; isActive: boolean; color: string }> = ({ label, value, max, isActive, color }) => {
  // Calculate rotation for visual effect
  const rotation = (value / max) * 360;

  return (
    <div className={`flex flex-col items-center p-2 rounded-lg transition-colors duration-300 ${isActive ? 'bg-opacity-20 bg-white' : ''}`}>
      <span className={`text-xs uppercase font-bold mb-2 ${isActive ? 'text-white' : 'text-neutral-500'}`}>{label}</span>
      <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-neutral-800 rounded-full border-4 border-neutral-700 flex items-center justify-center shadow-lg overflow-hidden">
        {/* Decorative markers */}
        <div className="absolute inset-0" style={{ transform: `rotate(-${rotation}deg)`, transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
           {[...Array(8)].map((_, i) => (
             <div key={i} className="absolute top-0 left-1/2 w-0.5 h-2 bg-neutral-600 -translate-x-1/2 origin-[50%_40px]"></div>
           ))}
        </div>
        
        {/* Current Value Display */}
        <div className={`relative z-10 w-10 h-10 rounded bg-neutral-900 flex items-center justify-center border ${isActive ? `border-${color}-500 text-${color}-400 shadow-[0_0_10px_rgba(255,255,255,0.2)]` : 'border-neutral-600 text-neutral-600'}`}>
           <span className="font-mono text-xl">{value.toString().padStart(2, '0')}</span>
        </div>

        {/* Indicator triangle */}
        <div className="absolute top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-red-500 z-20"></div>
      </div>
    </div>
  );
};

const RotorDisplay: React.FC<RotorDisplayProps> = ({ state, activePath }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_3fr] gap-6 w-full max-w-4xl mx-auto mb-6">
      
      {/* Sixes Path */}
      <div className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-4 transition-all duration-500 ${activePath === 'sixes' ? 'border-purple-500 bg-purple-900/10 shadow-[0_0_30px_rgba(168,85,247,0.1)]' : 'border-neutral-700 opacity-60'}`}>
        <h3 className="absolute -top-3 left-4 bg-[#1a1a1a] px-2 text-sm font-bold text-purple-400">SIXES PATH</h3>
        <RotorUnit 
          label="S-Rotor" 
          value={state.sixesPosition} 
          max={6} 
          isActive={activePath === 'sixes'}
          color="purple" 
        />
        <div className="mt-2 text-xs text-center text-neutral-500">Processing Vowels</div>
      </div>

      {/* Twenties Path */}
      <div className={`relative flex flex-col justify-center border-2 border-dashed rounded-xl p-4 transition-all duration-500 ${activePath === 'twenties' ? 'border-emerald-500 bg-emerald-900/10 shadow-[0_0_30px_rgba(16,185,129,0.1)]' : 'border-neutral-700 opacity-60'}`}>
        <h3 className="absolute -top-3 left-4 bg-[#1a1a1a] px-2 text-sm font-bold text-emerald-400">TWENTIES PATH</h3>
        <div className="flex justify-around items-center">
            <RotorUnit 
              label="SLOW" 
              value={state.twentiesSlow} 
              max={20} 
              isActive={activePath === 'twenties'}
              color="emerald" 
            />
            <div className={`h-1 flex-1 mx-2 ${activePath === 'twenties' ? 'bg-emerald-500/50 animate-pulse' : 'bg-neutral-800'}`}></div>
            <RotorUnit 
              label="MEDIUM" 
              value={state.twentiesMedium} 
              max={20} 
              isActive={activePath === 'twenties'}
              color="emerald" 
            />
            <div className={`h-1 flex-1 mx-2 ${activePath === 'twenties' ? 'bg-emerald-500/50 animate-pulse' : 'bg-neutral-800'}`}></div>
            <RotorUnit 
              label="FAST" 
              value={state.twentiesFast} 
              max={20} 
              isActive={activePath === 'twenties'}
              color="emerald" 
            />
        </div>
        <div className="mt-2 text-xs text-center text-neutral-500">Processing Consonants</div>
      </div>

    </div>
  );
};

export default RotorDisplay;
