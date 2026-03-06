import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { WheelConfig } from '../types';

interface WheelControlProps {
  wheel: WheelConfig;
  onIncrement: (id: string) => void;
  onDecrement: (id: string) => void;
}

const WheelControl: React.FC<WheelControlProps> = ({ wheel, onIncrement, onDecrement }) => {
  // Determine color based on wheel type
  const getColor = () => {
    if (wheel.type === 'Chi') return 'text-blue-400 border-blue-800 bg-blue-950/40 shadow-[0_0_15px_-3px_rgba(59,130,246,0.3)]';
    if (wheel.type === 'Psi') return 'text-emerald-400 border-emerald-800 bg-emerald-950/40 shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)]';
    return 'text-amber-400 border-amber-800 bg-amber-950/40 shadow-[0_0_15px_-3px_rgba(245,158,11,0.3)]';
  };

  const getLabelColor = () => {
     if (wheel.type === 'Chi') return 'text-blue-300';
     if (wheel.type === 'Psi') return 'text-emerald-300';
     return 'text-amber-300';
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <span className={`text-sm font-bold tracking-wider ${getLabelColor()}`}>{wheel.label}</span>
      <div className={`relative w-20 h-32 rounded-lg border-2 flex flex-col items-center justify-between py-2 transition-all hover:scale-105 ${getColor()}`}>
        <button 
          onClick={() => onDecrement(wheel.id)}
          className="hover:bg-white/10 rounded-md p-1 transition-colors active:scale-90"
        >
          <ChevronUp size={24} strokeWidth={3} />
        </button>
        
        <div className="font-mono text-4xl font-bold select-none relative overflow-hidden h-12 w-full text-center flex items-center justify-center">
            {/* Number display */}
            <span className="z-10 relative drop-shadow-lg">{(wheel.position + 1).toString().padStart(2, '0')}</span>
        </div>

        <button 
          onClick={() => onIncrement(wheel.id)}
          className="hover:bg-white/10 rounded-md p-1 transition-colors active:scale-90"
        >
          <ChevronDown size={24} strokeWidth={3} />
        </button>
      </div>
      <span className="text-xs font-mono text-gray-500 bg-slate-900/50 px-2 py-0.5 rounded border border-slate-800">Max {wheel.size}</span>
    </div>
  );
};

export default WheelControl;