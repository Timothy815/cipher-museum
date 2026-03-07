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
    if (connections[char]) {
      onDisconnect(char);
      setSelected(null);
      return;
    }
    if (!selected) {
      setSelected(char);
      return;
    }
    if (selected === char) {
      setSelected(null);
      return;
    }
    onConnect(selected, char);
    setSelected(null);
  };

  return (
    <div className="p-4 bg-stone-900 rounded-lg border border-stone-700">
      <h3 className="text-stone-400 text-sm font-mono uppercase mb-4 text-center">Steckerbrett (Plugboard)</h3>
      <div className="grid grid-cols-9 gap-2 max-w-lg mx-auto">
        {ALPHABET.split('').map(char => {
          const isConnected = !!connections[char];
          const isSelected = selected === char;
          const pair = connections[char];
          return (
            <div key={char} className="relative group">
              <button
                onClick={() => handleSelect(char)}
                className={`w-8 h-8 sm:w-10 sm:h-10 text-sm font-bold rounded-full border-2 flex items-center justify-center transition-all
                  ${isSelected ? 'bg-yellow-600 border-yellow-400 text-white animate-pulse' : ''}
                  ${isConnected && !isSelected ? 'bg-stone-700 border-stone-500 text-stone-300' : ''}
                  ${!isConnected && !isSelected ? 'bg-stone-950 border-stone-800 text-stone-600 hover:border-stone-500' : ''}
                `}
              >
                {char}
              </button>
              {isConnected && (
                <div className="absolute -bottom-2 right-0 bg-yellow-900 text-[8px] px-1 rounded text-yellow-100 z-10 pointer-events-none border border-yellow-700">
                  {pair}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="text-center mt-4 text-xs text-stone-500">
        {Object.keys(connections).length / 2} cables used (Max 13)
      </div>
    </div>
  );
};
