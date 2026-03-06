import React from 'react';
import { RotorConfig, RotorType, ReflectorType, MachineState } from '../types';
import { ALPHABET, ROTOR_DATA } from '../constants';
import { X, RefreshCw } from 'lucide-react';
import { Plugboard } from './Plugboard';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  state: MachineState;
  onUpdateState: (newState: MachineState) => void;
  onReset: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose, state, onUpdateState, onReset }) => {
  if (!isOpen) return null;

  const handleRotorTypeChange = (index: number, type: RotorType) => {
    const newRotors = [...state.rotors] as MachineState['rotors'];
    // Preserve position and ring setting, just change core
    newRotors[index] = { 
        ...newRotors[index], 
        type, 
        wiring: ROTOR_DATA[type].wiring, 
        notch: ROTOR_DATA[type].notch 
    };
    onUpdateState({ ...state, rotors: newRotors });
  };

  const handleRingChange = (index: number, val: number) => {
    const newRotors = [...state.rotors] as MachineState['rotors'];
    newRotors[index] = { ...newRotors[index], ringSetting: val };
    onUpdateState({ ...state, rotors: newRotors });
  };

  const handleReflectorChange = (type: ReflectorType) => {
    onUpdateState({ ...state, reflector: type });
  };

  const handlePlugConnect = (a: string, b: string) => {
    const newPlug = { ...state.plugboard };
    // Remove old connections if any
    if (newPlug[a]) delete newPlug[newPlug[a]];
    if (newPlug[b]) delete newPlug[newPlug[b]];
    delete newPlug[a];
    delete newPlug[b];

    // Add new
    newPlug[a] = b;
    newPlug[b] = a;
    onUpdateState({ ...state, plugboard: newPlug });
  };

  const handlePlugDisconnect = (a: string) => {
    const newPlug = { ...state.plugboard };
    const b = newPlug[a];
    delete newPlug[a];
    if (b) delete newPlug[b];
    onUpdateState({ ...state, plugboard: newPlug });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 w-full max-w-4xl h-[90vh] rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-950">
          <h2 className="text-2xl font-typewriter text-amber-500">Machine Configuration</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Section: Reflector */}
          <section>
             <h3 className="text-slate-200 text-lg font-bold mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                Reflector (Umkehrwalze)
             </h3>
             <div className="flex gap-4">
                {Object.values(ReflectorType).map((t) => (
                    <button
                        key={t}
                        onClick={() => handleReflectorChange(t)}
                        className={`px-4 py-2 rounded font-mono border ${state.reflector === t ? 'bg-amber-600 border-amber-400 text-white' : 'bg-slate-800 border-slate-600 text-slate-400'}`}
                    >
                        {t.replace('_', ' ')}
                    </button>
                ))}
             </div>
          </section>

          {/* Section: Rotors */}
          <section>
            <h3 className="text-slate-200 text-lg font-bold mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                Rotors (Walzen) & Ring Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {state.rotors.map((rotor, i) => (
                    <div key={i} className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                        <div className="text-xs text-amber-500 uppercase font-bold mb-2">
                             {i === 0 ? 'Greek (4th)' : i === 1 ? 'Left (3rd)' : i === 2 ? 'Mid (2nd)' : 'Right (1st)'}
                        </div>
                        
                        <div className="mb-3">
                            <label className="block text-xs text-slate-400 mb-1">Model</label>
                            <select 
                                className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200"
                                value={rotor.type}
                                onChange={(e) => handleRotorTypeChange(i, e.target.value as RotorType)}
                            >
                                {i === 0 
                                    ? [RotorType.Beta, RotorType.Gamma].map(t => <option key={t} value={t}>{t}</option>)
                                    : [RotorType.I, RotorType.II, RotorType.III, RotorType.IV, RotorType.V, RotorType.VI, RotorType.VII, RotorType.VIII].map(t => <option key={t} value={t}>{t}</option>)
                                }
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Ring Setting (A-Z)</label>
                            <select 
                                className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200 font-mono"
                                value={rotor.ringSetting}
                                onChange={(e) => handleRingChange(i, Number(e.target.value))}
                            >
                                {ALPHABET.split('').map((char, idx) => (
                                    <option key={idx} value={idx}>{char} ({idx + 1})</option>
                                ))}
                            </select>
                        </div>
                    </div>
                ))}
            </div>
          </section>

          {/* Section: Plugboard */}
          <section>
             <h3 className="text-slate-200 text-lg font-bold mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                Plugboard Configuration
             </h3>
             <Plugboard 
                connections={state.plugboard} 
                onConnect={handlePlugConnect} 
                onDisconnect={handlePlugDisconnect} 
            />
          </section>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
             <button 
                onClick={onReset}
                className="flex items-center gap-2 px-6 py-2 bg-red-900/50 hover:bg-red-900 text-red-200 rounded border border-red-800 transition-colors mr-auto"
             >
                <RefreshCw size={16} /> Reset Machine
             </button>
             <button 
                onClick={onClose}
                className="px-8 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded shadow-lg transition-colors"
             >
                Done
             </button>
        </div>
      </div>
    </div>
  );
};
