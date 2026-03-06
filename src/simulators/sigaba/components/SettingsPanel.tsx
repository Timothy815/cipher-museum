import React from 'react';
import { MachineState, RotorConfig } from '../types';
import { X, RotateCcw } from 'lucide-react';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const ROTOR_WIRINGS = [
  "EKMFLGDQVZNTOWYHXUSPAIBRCJ",
  "AJDKSIRUXBLHWTMCQGZNPYFVOE",
  "BDFHJLCPRTXVZNYEIWGAKMUSQO",
  "ESOVPZJAYQUIRHXLNFTGKDCMWB",
  "VZBRGITYUPSDNHLXAWMJQOFECK",
  "JPGVOUMFYQBENHZRDKASXLICTW",
  "NZJHGRCXMYSWBOUFAIVLPEKQDT",
  "FKQHTLXOCBJSPDZRAMEWNIUYGV",
  "LEYJVCNIXWPBQMDRTAKZGFUHOS",
  "FSOKANUERHMBTIYCWLQPZXVGJD",
];

const ROTOR_NAMES = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  state: MachineState;
  onUpdateState: (state: MachineState) => void;
  onReset: () => void;
}

const BankEditor: React.FC<{
  label: string;
  color: string;
  rotors: RotorConfig[];
  bankKey: 'cipherBank' | 'controlBank' | 'indexBank';
  state: MachineState;
  onUpdateState: (state: MachineState) => void;
  rotorPrefix: string;
}> = ({ label, color, rotors, bankKey, state, onUpdateState, rotorPrefix }) => {

  const handleWiringChange = (rotorId: number, wiringIndex: number) => {
    const newBank = state[bankKey].map(r =>
      r.id === rotorId ? { ...r, wiring: ROTOR_WIRINGS[wiringIndex] } : r
    );
    onUpdateState({ ...state, [bankKey]: newBank });
  };

  const handleReverse = (rotorId: number) => {
    const newBank = state[bankKey].map(r =>
      r.id === rotorId ? { ...r, reversed: !r.reversed } : r
    );
    onUpdateState({ ...state, [bankKey]: newBank });
  };

  const handlePositionChange = (rotorId: number, newPos: number) => {
    const newBank = state[bankKey].map(r =>
      r.id === rotorId ? { ...r, currentPos: newPos } : r
    );
    onUpdateState({ ...state, [bankKey]: newBank });
  };

  return (
    <div className={`p-4 rounded-lg border ${color}`}>
      <h4 className="text-xs font-bold uppercase tracking-widest mb-3">{label}</h4>
      <div className="space-y-3">
        {rotors.map((rotor, idx) => {
          const currentWiringIdx = ROTOR_WIRINGS.indexOf(rotor.wiring);
          return (
            <div key={rotor.id} className="flex flex-wrap items-center gap-3 bg-black/20 p-2 rounded">
              <span className="text-xs font-mono text-gray-400 w-10">{rotorPrefix}{idx + 1}</span>

              {/* Wiring select */}
              <div className="flex flex-col gap-0.5">
                <label className="text-[9px] text-gray-600 uppercase">Wiring</label>
                <select
                  value={currentWiringIdx >= 0 ? currentWiringIdx : 0}
                  onChange={(e) => handleWiringChange(rotor.id, parseInt(e.target.value))}
                  className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs font-mono text-gray-200 focus:outline-none focus:border-amber-500"
                >
                  {ROTOR_NAMES.map((name, i) => (
                    <option key={i} value={i}>{name}</option>
                  ))}
                </select>
              </div>

              {/* Position */}
              <div className="flex flex-col gap-0.5">
                <label className="text-[9px] text-gray-600 uppercase">Position</label>
                <select
                  value={rotor.currentPos}
                  onChange={(e) => handlePositionChange(rotor.id, parseInt(e.target.value))}
                  className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs font-mono text-gray-200 focus:outline-none focus:border-amber-500"
                >
                  {ALPHABET.split('').map((letter, i) => (
                    <option key={i} value={i}>{letter} ({i})</option>
                  ))}
                </select>
              </div>

              {/* Reverse toggle */}
              <div className="flex flex-col gap-0.5">
                <label className="text-[9px] text-gray-600 uppercase">Reversed</label>
                <button
                  onClick={() => handleReverse(rotor.id)}
                  className={`px-3 py-1 rounded text-xs font-bold border transition-colors ${
                    rotor.reversed
                      ? 'bg-amber-900/50 border-amber-700 text-amber-300'
                      : 'bg-gray-800 border-gray-600 text-gray-500'
                  }`}
                >
                  {rotor.reversed ? 'REV' : 'FWD'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen, onClose, state, onUpdateState, onReset
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#1a1c23] border border-gray-700 rounded-2xl p-6 sm:p-8 max-w-3xl w-full mx-4 max-h-[85vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-amber-400 tracking-widest font-mono">SIGABA CONFIGURATION</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          <BankEditor
            label="Cipher Bank (Main Encryption)"
            color="bg-amber-950/20 border-amber-800/30 text-amber-400"
            rotors={state.cipherBank}
            bankKey="cipherBank"
            state={state}
            onUpdateState={onUpdateState}
            rotorPrefix="M-"
          />
          <BankEditor
            label="Control Bank (Stepping Logic)"
            color="bg-blue-950/20 border-blue-800/30 text-blue-400"
            rotors={state.controlBank}
            bankKey="controlBank"
            state={state}
            onUpdateState={onUpdateState}
            rotorPrefix="C-"
          />
          <BankEditor
            label="Index Bank (Signal Permutation)"
            color="bg-green-950/20 border-green-800/30 text-green-400"
            rotors={state.indexBank}
            bankKey="indexBank"
            state={state}
            onUpdateState={onUpdateState}
            rotorPrefix="I-"
          />
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-4 py-2 bg-red-900/40 hover:bg-red-900/60 text-red-300 border border-red-800/50 rounded-lg text-sm font-bold transition-colors"
          >
            <RotateCcw size={16} /> RESET ALL
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-amber-900/40 hover:bg-amber-900/60 text-amber-300 border border-amber-800/50 rounded-lg text-sm font-bold transition-colors ml-auto"
          >
            DONE
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
