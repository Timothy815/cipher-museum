import React, { useState } from 'react';
import { ALPHABET } from '../constants';

interface PlugboardProps {
  connections: Record<string, string>;
  onConnect: (a: string, b: string) => void;
  onDisconnect: (a: string) => void;
}

export const Plugboard: React.FC<PlugboardProps> = ({ connections, onConnect, onDisconnect }) => {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (char: string) => {
    // If clicking an already connected char, disconnect it (and its pair)
    if (connections[char]) {
      onDisconnect(char);
      setSelected(null);
      return;
    }

    // If first selection
    if (!selected) {
      setSelected(char);
      return;
    }

    // If clicking self, deselect
    if (selected === char) {
      setSelected(null);
      return;
    }

    // Connect pair
    onConnect(selected, char);
    setSelected(null);
  };

  return (
    <div className="p-4 bg-slate-900 rounded-lg border border-slate-700">
      <h3 className="text-slate-400 text-sm font-mono uppercase mb-4 text-center">Steckerbrett (Plugboard)</h3>
      <div className="grid grid-cols-9 gap-2 max-w-lg mx-auto">
        {ALPHABET.split('').map((char) => {
          const isConnected = !!connections[char];
          const isSelected = selected === char;
          const pair = connections[char];

          return (
            <div key={char} className="relative group">
              <button
                onClick={() => handleSelect(char)}
                className={`
                  w-8 h-8 sm:w-10 sm:h-10 text-sm font-bold rounded-full border-2 flex items-center justify-center transition-all
                  ${isSelected ? 'bg-amber-600 border-amber-400 text-white animate-pulse' : ''}
                  ${isConnected && !isSelected ? 'bg-slate-700 border-slate-500 text-slate-300' : ''}
                  ${!isConnected && !isSelected ? 'bg-slate-950 border-slate-800 text-slate-600 hover:border-slate-500' : ''}
                `}
              >
                {char}
              </button>
              {isConnected && (
                <div className="absolute -bottom-2 right-0 bg-amber-900 text-[8px] px-1 rounded text-amber-100 z-10 pointer-events-none border border-amber-700">
                  {pair}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="text-center mt-4 text-xs text-slate-500">
        {Object.keys(connections).length / 2} cables used (Max 13)
      </div>
    </div>
  );
};
