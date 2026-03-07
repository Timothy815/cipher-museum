import React, { useState } from 'react';
import { X, RotateCcw, Shuffle } from 'lucide-react';
import { MachineState, RotorConfig } from '../types';
import { ALPHABET, ROTOR_WIRINGS, DEFAULT_CARD } from '../constants';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  state: MachineState;
  onUpdateState: (state: MachineState) => void;
  onReset: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose, state, onUpdateState, onReset }) => {
  const [cardInput, setCardInput] = useState('');

  if (!isOpen) return null;

  const handleRotorPosition = (index: number, pos: number) => {
    const newRotors = [...state.rotors];
    newRotors[index] = { ...newRotors[index], position: pos };
    onUpdateState({ ...state, rotors: newRotors });
  };

  const handleRotorRing = (index: number, ring: number) => {
    const newRotors = [...state.rotors];
    newRotors[index] = { ...newRotors[index], ringSetting: ring };
    onUpdateState({ ...state, rotors: newRotors });
  };

  const handleRotorReverse = (index: number) => {
    const newRotors = [...state.rotors];
    newRotors[index] = { ...newRotors[index], reversed: !newRotors[index].reversed };
    onUpdateState({ ...state, rotors: newRotors });
  };

  const handleRandomCard = () => {
    const shuffled = ALPHABET.split('');
    // Fisher-Yates but ensure no fixed points (derangement) for pairs
    const card: Record<string, string> = {};
    const available = [...shuffled];
    // Simple pair-swap approach
    for (let i = available.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * i); // never swap with self
      [available[i], available[j]] = [available[j], available[i]];
    }
    // If any letter maps to itself, swap with neighbor
    for (let i = 0; i < 26; i++) {
      if (available[i] === ALPHABET[i]) {
        const swapIdx = i === 25 ? 0 : i + 1;
        [available[i], available[swapIdx]] = [available[swapIdx], available[i]];
      }
    }
    ALPHABET.split('').forEach((c, i) => { card[c] = available[i]; });
    onUpdateState({ ...state, cardSubstitution: card });
  };

  const handleClearCard = () => {
    onUpdateState({ ...state, cardSubstitution: { ...DEFAULT_CARD } });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto m-4">
        <div className="flex items-center justify-between p-6 border-b border-stone-800">
          <h2 className="text-xl font-bold text-red-400">Fialka Configuration</h2>
          <button onClick={onClose} className="text-stone-500 hover:text-white p-1">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Rotor Settings */}
          <div>
            <h3 className="text-sm font-bold text-stone-300 uppercase tracking-wider mb-4">Rotor Positions & Ring Settings</h3>
            <div className="grid grid-cols-5 gap-3">
              {state.rotors.map((rotor, i) => (
                <div key={i} className="bg-stone-800/50 rounded-lg p-3 border border-stone-700 flex flex-col items-center gap-2">
                  <span className="text-[10px] text-stone-500 font-mono">Rotor {rotor.id}</span>
                  <select
                    value={rotor.position}
                    onChange={e => handleRotorPosition(i, parseInt(e.target.value))}
                    className="bg-stone-800 border border-stone-600 rounded px-2 py-1 text-sm text-center w-full"
                  >
                    {ALPHABET.split('').map((c, ci) => (
                      <option key={ci} value={ci}>{c}</option>
                    ))}
                  </select>
                  <select
                    value={rotor.ringSetting}
                    onChange={e => handleRotorRing(i, parseInt(e.target.value))}
                    className="bg-stone-800 border border-stone-600 rounded px-2 py-1 text-[10px] text-center w-full text-stone-400"
                  >
                    {ALPHABET.split('').map((c, ci) => (
                      <option key={ci} value={ci}>Ring {c}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleRotorReverse(i)}
                    className={`text-[10px] font-bold px-2 py-1 rounded w-full transition-colors ${
                      rotor.reversed
                        ? 'bg-red-900/50 text-red-300 border border-red-700'
                        : 'bg-stone-700 text-stone-400 border border-stone-600'
                    }`}
                  >
                    {rotor.reversed ? 'REVERSED' : 'FORWARD'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Card Substitution */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-stone-300 uppercase tracking-wider">Punch Card (Substitution)</h3>
              <div className="flex gap-2">
                <button
                  onClick={handleRandomCard}
                  className="flex items-center gap-1 px-3 py-1.5 rounded bg-stone-800 border border-stone-700 text-xs text-stone-300 hover:text-white transition-colors"
                >
                  <Shuffle size={12} /> Random
                </button>
                <button
                  onClick={handleClearCard}
                  className="flex items-center gap-1 px-3 py-1.5 rounded bg-stone-800 border border-stone-700 text-xs text-stone-300 hover:text-white transition-colors"
                >
                  <RotateCcw size={12} /> Identity
                </button>
              </div>
            </div>
            <div className="bg-stone-800/50 rounded-lg p-4 border border-stone-700 font-mono text-sm">
              <div className="flex flex-wrap gap-1">
                {ALPHABET.split('').map(c => {
                  const mapped = state.cardSubstitution[c] || c;
                  const isSwapped = mapped !== c;
                  return (
                    <div key={c} className={`flex flex-col items-center px-1.5 py-1 rounded ${isSwapped ? 'bg-pink-900/30 border border-pink-800/50' : ''}`}>
                      <span className="text-stone-500 text-[10px]">{c}</span>
                      <span className="text-[10px] text-stone-700">&darr;</span>
                      <span className={`text-xs font-bold ${isSwapped ? 'text-pink-400' : 'text-stone-500'}`}>{mapped}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-stone-800">
            <button
              onClick={() => { onReset(); onClose(); }}
              className="px-6 py-2 bg-red-900/50 border border-red-700 text-red-300 rounded-lg font-bold text-sm hover:bg-red-900/70 transition-colors"
            >
              Reset All
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-stone-800 border border-stone-700 text-stone-300 rounded-lg font-bold text-sm hover:bg-stone-700 transition-colors ml-auto"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
