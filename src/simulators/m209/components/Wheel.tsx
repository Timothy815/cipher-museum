import React, { useMemo } from 'react';
import { WheelConfig } from '../types';
import { WHEEL_ALPHABETS } from '../constants';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface WheelProps {
  wheel: WheelConfig;
  onRotate: (id: number, dir: 'up' | 'down') => void;
}

export const Wheel: React.FC<WheelProps> = ({ wheel, onRotate }) => {
  
  const alphabet = WHEEL_ALPHABETS[wheel.id];
  
  // Calculate visible letters (Current, Previous, Next) for 3D effect
  const currentLetter = alphabet[wheel.position];
  
  const prevIndex = (wheel.position - 1 + wheel.size) % wheel.size;
  const nextIndex = (wheel.position + 1) % wheel.size;
  
  const prevLetter = alphabet[prevIndex];
  const nextLetter = alphabet[nextIndex];

  // Helper to show pin state subtly
  const activePinsCount = useMemo(() => wheel.pins.filter(p => p).length, [wheel.pins]);

  return (
    <div className="flex flex-col items-center mx-1 sm:mx-2">
      <div className="text-[10px] text-olive-300 mb-1 font-mono tracking-tighter">
        W{wheel.id + 1} ({wheel.size})
      </div>
      
      {/* Up Button */}
      <button 
        onClick={() => onRotate(wheel.id, 'up')}
        className="text-olive-400 hover:text-amber-200 active:text-amber-100 transition-colors p-1"
        aria-label={`Rotate Wheel ${wheel.id + 1} Up`}
      >
        <ChevronUp size={20} />
      </button>

      {/* Wheel Body */}
      <div className="relative w-10 h-24 sm:w-12 sm:h-28 bg-black rounded-lg border-2 border-olive-900 shadow-xl overflow-hidden group">
        
        {/* Shine/Reflection Overlay */}
        <div className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-r from-black/60 via-transparent to-black/60"></div>
        <div className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-b from-black/80 via-transparent to-black/80"></div>

        {/* The Drum Gradient */}
        <div className="absolute inset-0 bg-stone-800 flex flex-col items-center justify-center wheel-gradient">
          
          {/* Previous Letter (Blurred, Dark) */}
          <div className="transform -translate-y-8 scale-75 opacity-40 text-amber-100 font-mono font-bold text-xl blur-[1px]">
            {prevLetter}
          </div>

          {/* Current Letter (Bright, Sharp) */}
          <div className="z-10 text-amber-50 font-mono font-bold text-3xl sm:text-4xl drop-shadow-md">
            {currentLetter}
          </div>

          {/* Next Letter (Blurred, Dark) */}
          <div className="transform translate-y-8 scale-75 opacity-40 text-amber-100 font-mono font-bold text-xl blur-[1px]">
            {nextLetter}
          </div>

        </div>

        {/* Pin Indicator (Visual Flair) */}
        <div className="absolute bottom-1 right-1 z-30">
           <div className={`w-2 h-2 rounded-full ${wheel.pins[wheel.position] ? 'bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.8)]' : 'bg-olive-900 border border-olive-700'}`} title="Active Pin at current pos"></div>
        </div>
      </div>

      {/* Down Button */}
      <button 
        onClick={() => onRotate(wheel.id, 'down')}
        className="text-olive-400 hover:text-amber-200 active:text-amber-100 transition-colors p-1"
        aria-label={`Rotate Wheel ${wheel.id + 1} Down`}
      >
        <ChevronDown size={20} />
      </button>

      {/* Stats/Info */}
      <div className="text-[9px] text-olive-500 mt-1">
        {activePinsCount} pins
      </div>
    </div>
  );
};