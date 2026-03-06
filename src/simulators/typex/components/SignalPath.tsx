import React from 'react';
import { MachineState } from '../types';
import { ALPHABET, REFLECTOR_WIRING } from '../constants';

interface SignalPathProps {
  state: MachineState;
  lastInput: string | null;
}

function forwardThroughRotor(charIndex: number, rotor: { wiring: string; position: number; ringSetting: number }): number {
  const shifted = (charIndex + rotor.position - rotor.ringSetting + 26) % 26;
  const outChar = rotor.wiring[shifted];
  const outIndex = ALPHABET.indexOf(outChar);
  return (outIndex - rotor.position + rotor.ringSetting + 26) % 26;
}

function reverseThroughRotor(charIndex: number, rotor: { wiring: string; position: number; ringSetting: number }): number {
  const shifted = (charIndex + rotor.position - rotor.ringSetting + 26) % 26;
  const outChar = ALPHABET[shifted];
  const outIndex = rotor.wiring.indexOf(outChar);
  return (outIndex - rotor.position + rotor.ringSetting + 26) % 26;
}

const ROTOR_LABELS = ['Stator 1', 'Stator 2', 'Slow', 'Medium', 'Fast'];

function traceSignal(char: string, state: MachineState) {
  const steps: { label: string; letter: string; color: string }[] = [];

  let charIndex = ALPHABET.indexOf(char.toUpperCase());
  steps.push({ label: 'Input', letter: ALPHABET[charIndex], color: 'text-stone-200' });

  // Forward through 5 rotors
  for (let i = 0; i < 5; i++) {
    charIndex = forwardThroughRotor(charIndex, state.rotors[i]);
    steps.push({
      label: ROTOR_LABELS[i],
      letter: ALPHABET[charIndex],
      color: i < 2 ? 'text-cyan-400' : 'text-emerald-400'
    });
  }

  // Reflector
  charIndex = ALPHABET.indexOf(REFLECTOR_WIRING[charIndex]);
  steps.push({ label: 'Reflector', letter: ALPHABET[charIndex], color: 'text-amber-400' });

  // Reverse through 5 rotors
  for (let i = 4; i >= 0; i--) {
    charIndex = reverseThroughRotor(charIndex, state.rotors[i]);
    steps.push({
      label: ROTOR_LABELS[i],
      letter: ALPHABET[charIndex],
      color: i < 2 ? 'text-cyan-400' : 'text-emerald-400'
    });
  }

  steps.push({ label: 'Output', letter: ALPHABET[charIndex], color: 'text-amber-300' });

  return { steps };
}

export const SignalPath: React.FC<SignalPathProps> = ({ state, lastInput }) => {
  const trace = lastInput ? traceSignal(lastInput, state) : null;

  return (
    <div className="w-full max-w-3xl bg-stone-900/80 rounded-xl border border-stone-800 p-5">
      <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-3 flex items-center gap-2">
        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
        Signal Path
      </div>

      {trace ? (
        <div className="flex flex-wrap items-center gap-1">
          {trace.steps.map((step, i) => (
            <React.Fragment key={i}>
              <div className="flex flex-col items-center">
                <span className="text-[9px] text-stone-600 font-mono">{step.label}</span>
                <span className={`font-mono text-lg font-bold ${step.color}`}>{step.letter}</span>
              </div>
              {i < trace.steps.length - 1 && (
                <span className="text-stone-700 text-xs mx-0.5">→</span>
              )}
            </React.Fragment>
          ))}
        </div>
      ) : (
        <div className="text-sm text-stone-600 font-mono">
          Press a key to see the signal path through the machine...
        </div>
      )}

      <div className="mt-3 pt-2 border-t border-stone-800 flex gap-4 text-[10px] font-mono text-stone-600">
        <span><span className="text-cyan-400">Cyan</span> = Stator rotor</span>
        <span><span className="text-emerald-400">Green</span> = Stepping rotor</span>
        <span><span className="text-amber-400">Amber</span> = Reflector</span>
      </div>
    </div>
  );
};
