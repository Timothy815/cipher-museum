import React from 'react';
import { X, RefreshCw } from 'lucide-react';
import { MachineState } from '../types';
import { ALPHABET, ROTOR_WIRINGS } from '../constants';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  state: MachineState;
  onUpdateState: (state: MachineState) => void;
  onReset: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose, state, onUpdateState, onReset }) => {
  if (!isOpen) return null;

  const handleRotorType = (index: number, id: number) => {
    const newRotors = [...state.rotors] as MachineState['rotors'];
    const data = ROTOR_WIRINGS[id];
    newRotors[index] = { ...newRotors[index], id, wiring: data.wiring, notchRing: data.notches };
    onUpdateState({ ...state, rotors: newRotors });
  };

  const handleRing = (index: number, val: number) => {
    const newRotors = [...state.rotors] as MachineState['rotors'];
    newRotors[index] = { ...newRotors[index], ringSetting: val };
    onUpdateState({ ...state, rotors: newRotors });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-neutral-900 w-full max-w-3xl max-h-[90vh] rounded-2xl border border-neutral-700 shadow-2xl overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-neutral-800 bg-neutral-950">
          <h2 className="text-xl font-bold text-sky-400">NEMA Configuration</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-white"><X size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Rotors */}
          <section>
            <h3 className="text-neutral-200 text-lg font-bold mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-sky-500 rounded-full"></span>
              Rotor Selection & Ring Settings
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {state.rotors.map((rotor, i) => (
                <div key={i} className="bg-neutral-800/50 p-4 rounded-lg border border-neutral-700">
                  <div className="text-xs text-sky-400 uppercase font-bold mb-2">
                    {['Slow', 'Mid-Left', 'Mid-Right', 'Fast'][i]}
                  </div>
                  <div className="mb-3">
                    <label className="block text-xs text-neutral-400 mb-1">Rotor</label>
                    <select
                      className="w-full bg-neutral-900 border border-neutral-600 rounded px-2 py-1 text-sm text-neutral-200"
                      value={rotor.id}
                      onChange={e => handleRotorType(i, Number(e.target.value))}
                    >
                      {Object.keys(ROTOR_WIRINGS).map(k => (
                        <option key={k} value={k}>Rotor {k}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Ring Setting</label>
                    <select
                      className="w-full bg-neutral-900 border border-neutral-600 rounded px-2 py-1 text-sm text-neutral-200 font-mono"
                      value={rotor.ringSetting}
                      onChange={e => handleRing(i, Number(e.target.value))}
                    >
                      {ALPHABET.split('').map((c, ci) => (
                        <option key={ci} value={ci}>{c} ({ci + 1})</option>
                      ))}
                    </select>
                  </div>
                  <div className="mt-2 text-[10px] text-neutral-500 font-mono">
                    Notches: {rotor.notchRing.map(n => ALPHABET[n]).join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Drive Wheel Info */}
          <section>
            <h3 className="text-neutral-200 text-lg font-bold mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
              Drive Wheel (Triebrad)
            </h3>
            <p className="text-sm text-neutral-400 mb-2">
              The drive wheel has a fixed irregular notch pattern that controls stepping of the slowest rotor.
              Its position can be set from the main interface.
            </p>
            <div className="text-xs text-neutral-500 font-mono">
              Notch positions: {state.driveWheel.notches.map(n => ALPHABET[n]).join(', ')}
            </div>
          </section>
        </div>

        <div className="p-4 border-t border-neutral-800 bg-neutral-950 flex justify-end">
          <button onClick={() => { onReset(); onClose(); }} className="flex items-center gap-2 px-6 py-2 bg-red-900/50 hover:bg-red-900 text-red-200 rounded border border-red-800 transition-colors mr-auto">
            <RefreshCw size={16} /> Reset
          </button>
          <button onClick={onClose} className="px-8 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded shadow-lg transition-colors">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
