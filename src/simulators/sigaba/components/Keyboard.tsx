import React, { useEffect } from 'react';

interface KeyboardProps {
  onPress: (char: string) => void;
  onRelease: () => void;
  onBackspace: () => void;
  activeKey: string | null;
}

const ROWS = [
  'QWERTYUIOP',
  'ASDFGHJKL',
  'ZXCVBNM'
];

const Keyboard: React.FC<KeyboardProps> = ({ onPress, onRelease, onBackspace, activeKey }) => {
  
  // Physical keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      
      if (e.key === 'Backspace') {
        onBackspace();
        return;
      }

      const char = e.key.toUpperCase();
      if (/^[A-Z]$/.test(char)) {
        onPress(char);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Only release for character keys
      if (/^[a-zA-Z]$/.test(e.key)) {
        onRelease();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onPress, onRelease, onBackspace]);

  return (
    <div className="flex flex-col items-center gap-3 bg-[#111] p-6 rounded-xl border-t-4 border-gray-700 shadow-2xl">
      <div className="text-gray-500 text-xs font-mono tracking-widest mb-2">INPUT TYPEWRITER</div>
      {ROWS.map((row, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {row.split('').map((char) => {
            const isActive = activeKey === char;
            return (
              <button
                key={char}
                onMouseDown={() => onPress(char)}
                onMouseUp={onRelease}
                onMouseLeave={onRelease}
                onTouchStart={(e) => { e.preventDefault(); onPress(char); }}
                onTouchEnd={(e) => { e.preventDefault(); onRelease(); }}
                className={`
                  w-12 h-12 md:w-14 md:h-14 rounded-full font-vintage text-xl font-bold transition-all duration-75
                  flex items-center justify-center border-4 select-none
                  ${isActive 
                    ? 'bg-gray-800 border-gray-900 text-gray-400 shadow-[inset_0px_4px_8px_rgba(0,0,0,0.8)] translate-y-1' 
                    : 'bg-gray-200 border-[#888] text-gray-800 shadow-[0px_6px_0px_#555,0px_6px_8px_rgba(0,0,0,0.5)] hover:bg-white active:translate-y-1 active:shadow-none'
                  }
                `}
              >
                {char}
              </button>
            );
          })}
          {/* Backspace Button on last row */}
          {rowIndex === 2 && (
             <button
               onMouseDown={onBackspace}
               className={`
                 w-14 h-12 md:w-20 md:h-14 rounded-lg font-vintage text-2xl font-bold transition-all duration-75
                 flex items-center justify-center border-4 select-none ml-2
                 ${activeKey === 'BACKSPACE'
                   ? 'bg-red-900 border-red-950 text-red-500 shadow-[inset_0px_4px_8px_rgba(0,0,0,0.8)] translate-y-1' 
                   : 'bg-red-800 border-red-900 text-red-100 shadow-[0px_6px_0px_#450a0a,0px_6px_8px_rgba(0,0,0,0.5)] hover:bg-red-700 active:translate-y-1 active:shadow-none'
                 }
               `}
               title="Backspace / Undo"
             >
               ←
             </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default Keyboard;