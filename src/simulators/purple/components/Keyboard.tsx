import React, { useEffect, useState } from 'react';
import { FULL_ALPHABET, SIXES_ALPHABET } from '../types';

interface KeyboardProps {
  onKeyPress: (char: string) => void;
  lastPressed: string | null;
  disabled?: boolean;
}

const Keyboard: React.FC<KeyboardProps> = ({ onKeyPress, lastPressed, disabled }) => {
  const [activeKey, setActiveKey] = useState<string | null>(null);

  useEffect(() => {
    if (lastPressed) {
      setActiveKey(lastPressed);
      const timer = setTimeout(() => setActiveKey(null), 200);
      return () => clearTimeout(timer);
    }
  }, [lastPressed]);

  const handleMouseDown = (char: string) => {
    if (disabled) return;
    onKeyPress(char);
    setActiveKey(char);
    // Auto clear active state after animation
    setTimeout(() => setActiveKey(null), 200);
  };

  // Standard QWERTY Layout
  const rows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
  ];

  return (
    <div className="flex flex-col gap-2 p-4 bg-neutral-900 rounded-lg shadow-inner border border-neutral-700">
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="flex justify-center gap-2">
          {row.map((char) => {
            const isSix = SIXES_ALPHABET.includes(char);
            const isActive = activeKey === char;
            
            return (
              <button
                key={char}
                onMouseDown={() => handleMouseDown(char)}
                disabled={disabled}
                className={`
                  relative w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-full font-bold text-lg sm:text-xl transition-all duration-75 select-none
                  shadow-[0_4px_0_rgb(0,0,0)] active:shadow-[0_1px_0_rgb(0,0,0)] active:translate-y-[3px]
                  border-2
                  ${isActive ? 'bg-amber-100 text-neutral-900 border-amber-300' : 'bg-neutral-800 text-neutral-300 border-neutral-600 hover:bg-neutral-700'}
                  ${isSix ? 'ring-1 ring-purple-500/50' : ''}
                `}
              >
                {char}
                {isSix && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full shadow-glow" title="Sixes Group"></span>
                )}
              </button>
            );
          })}
        </div>
      ))}
      <div className="text-center text-xs text-neutral-500 mt-2">
        <span className="inline-block w-3 h-3 bg-purple-500 rounded-full mr-2 align-middle"></span>
        Indicates "Sixes" Alphabet (Vowels + Y)
      </div>
    </div>
  );
};

export default Keyboard;
