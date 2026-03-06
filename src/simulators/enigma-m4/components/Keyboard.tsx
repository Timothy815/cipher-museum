import React from 'react';
import { KEYBOARD_LAYOUT } from '../constants';

interface KeyboardProps {
  onMouseDown: (char: string) => void;
  onMouseUp: (char: string) => void;
  isPressed: (char: string) => boolean;
}

export const Keyboard: React.FC<KeyboardProps> = ({ onMouseDown, onMouseUp, isPressed }) => {
  return (
    <div className="flex flex-col items-center gap-3 pb-6 select-none">
      {KEYBOARD_LAYOUT.map((row, rIdx) => (
        <div key={rIdx} className="flex justify-center gap-2 sm:gap-3">
          {row.split('').map((char) => {
            const active = isPressed(char);
            return (
              <button
                key={char}
                onMouseDown={(e) => { e.preventDefault(); onMouseDown(char); }}
                onMouseUp={(e) => { e.preventDefault(); onMouseUp(char); }}
                onMouseLeave={(e) => { 
                  e.preventDefault(); 
                  // Only trigger release if the key was actually pressed to avoid clearing others
                  if (active) {
                    onMouseUp(char); 
                  }
                }}
                onTouchStart={(e) => { e.preventDefault(); onMouseDown(char); }}
                onTouchEnd={(e) => { e.preventDefault(); onMouseUp(char); }}
                className={`
                  w-12 h-12 sm:w-14 sm:h-14 rounded-full border-4 flex items-center justify-center
                  text-xl font-typewriter font-bold transition-all duration-75 active:scale-95
                  ${active
                    ? 'bg-slate-800 border-slate-600 text-slate-400 shadow-inner translate-y-1' 
                    : 'bg-slate-200 border-slate-400 text-slate-900 shadow-[0_4px_0_rgb(71,85,105)] hover:bg-white'
                  }
                `}
              >
                {char}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
};