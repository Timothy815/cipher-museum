import React from 'react';
import { MachineState, RotorConfig } from '../types';
import { ROTOR_DATA, STEPPING_ROTOR_TYPES, STATOR_ROTOR_TYPES, ALPHABET } from '../constants';
import { X } from 'lucide-react';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  state: MachineState;
  onUpdateState: (state: MachineState) => void;
  onReset: () => void;
}

const POSITION_LABELS = ['Stator 1', 'Stator 2', 'Slow', 'Medium', 'Fast'];

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen, onClose, state, onUpdateState, onReset
}) => {
  if (!isOpen) return null;

  const handleRotorTypeChange = (index: number, newType: string) => {
    const data = ROTOR_DATA[newType];
    const newRotors = [...state.rotors] as MachineState['rotors'];
    newRotors[index] = {
      ...newRotors[index],
      type: newType,
      wiring: data.wiring,
      notches: data.notches,
    };
    onUpdateState({ ...state, rotors: newRotors });
  };

  const handleRingChange = (index: number, val: number) => {
    const newRotors = [...state.rotors] as MachineState['rotors'];
    newRotors[index] = { ...newRotors[index], ringSetting: val };
    onUpdateState({ ...state, rotors: newRotors });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-stone-900 border border-stone-700 rounded-2xl p-6 sm:p-8 max-w-2xl w-full mx-4 max-h-[85vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-emerald-400 font-mono tracking-wider">MACHINE CONFIGURATION</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-white p-1">
            <X size={24} />
          </button>
        </div>

        {/* Rotor Configuration */}
        <div className="space-y-4">
          {state.rotors.map((rotor, i) => {
            const isStator = i < 2;
            const availableTypes = isStator ? STATOR_ROTOR_TYPES : STEPPING_ROTOR_TYPES;

            return (
              <div key={i} className={`p-4 rounded-lg border ${
                isStator ? 'bg-cyan-950/20 border-cyan-800/30' : 'bg-emerald-950/20 border-emerald-800/30'
              }`}>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="min-w-[80px]">
                    <span className={`text-xs font-bold font-mono ${isStator ? 'text-cyan-400' : 'text-emerald-400'}`}>
                      {POSITION_LABELS[i]}
                    </span>
                  </div>

                  {/* Rotor Type */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-stone-500 uppercase">Rotor</label>
                    <select
                      value={rotor.type}
                      onChange={(e) => handleRotorTypeChange(i, e.target.value)}
                      className="bg-stone-800 border border-stone-600 rounded px-2 py-1 text-sm font-mono text-stone-200 focus:outline-none focus:border-emerald-500"
                    >
                      {availableTypes.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  {/* Ring Setting */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-stone-500 uppercase">Ring</label>
                    <select
                      value={rotor.ringSetting}
                      onChange={(e) => handleRingChange(i, parseInt(e.target.value))}
                      className="bg-stone-800 border border-stone-600 rounded px-2 py-1 text-sm font-mono text-stone-200 focus:outline-none focus:border-emerald-500"
                    >
                      {ALPHABET.split('').map((letter, li) => (
                        <option key={li} value={li}>{letter} ({li + 1})</option>
                      ))}
                    </select>
                  </div>

                  {/* Notch info */}
                  {!isStator && (
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-stone-500 uppercase">Notches</label>
                      <div className="text-xs font-mono text-stone-400">
                        {rotor.notches.map(n => ALPHABET[n]).join(', ')}
                      </div>
                    </div>
                  )}

                  {isStator && (
                    <div className="text-[10px] text-cyan-600 font-mono ml-auto">
                      FIXED — DOES NOT STEP
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={onReset}
            className="px-4 py-2 bg-red-900/40 hover:bg-red-900/60 text-red-300 border border-red-800/50 rounded-lg text-sm font-bold transition-colors"
          >
            RESET ALL
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-emerald-900/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/50 rounded-lg text-sm font-bold transition-colors ml-auto"
          >
            DONE
          </button>
        </div>
      </div>
    </div>
  );
};
