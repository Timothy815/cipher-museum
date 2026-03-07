import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { SwitchState } from '../types';

interface SwitchDisplayProps {
  label: string;
  chars: string;
  switchState: SwitchState;
  color: string;
  onStep: (delta: number) => void;
}

export const SwitchDisplay: React.FC<SwitchDisplayProps> = ({ label, chars, switchState, color, onStep }) => {
  const wiring = switchState.wiring[switchState.position];

  return (
    <div className="bg-neutral-900/60 rounded-xl border border-neutral-800 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`text-xs font-bold uppercase tracking-wider ${color}`}>
          {label}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onStep(-1)} className="text-neutral-500 hover:text-white p-0.5"><ChevronDown size={16} /></button>
          <div className={`font-mono text-lg font-bold px-3 py-1 rounded border ${color} bg-black/30 border-current`}>
            {switchState.position + 1}
          </div>
          <button onClick={() => onStep(1)} className="text-neutral-500 hover:text-white p-0.5"><ChevronUp size={16} /></button>
        </div>
      </div>

      {/* Wiring visualization */}
      <div className="flex justify-center gap-1">
        {chars.split('').map((c, i) => (
          <div key={c} className="flex flex-col items-center">
            <span className="text-xs font-mono text-neutral-500 mb-1">{c}</span>
            <div className="w-px h-4 bg-neutral-700"></div>
            <span className={`text-sm font-mono font-bold ${color}`}>{wiring[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
