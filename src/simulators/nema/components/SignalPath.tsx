import React from 'react';
import { MachineState } from '../types';
import { ALPHABET, REFLECTOR_WIRING } from '../constants';

interface SignalPathProps {
  state: MachineState;
  lastInput: string | null;
}

function forwardThrough(charIndex: number, rotor: { wiring: string; position: number; ringSetting: number }): number {
  const shifted = (charIndex + rotor.position - rotor.ringSetting + 26) % 26;
  const outChar = rotor.wiring[shifted];
  return (ALPHABET.indexOf(outChar) - rotor.position + rotor.ringSetting + 26) % 26;
}

function reverseThrough(charIndex: number, rotor: { wiring: string; position: number; ringSetting: number }): number {
  const shifted = (charIndex + rotor.position - rotor.ringSetting + 26) % 26;
  const outChar = ALPHABET[shifted];
  return (rotor.wiring.indexOf(outChar) - rotor.position + rotor.ringSetting + 26) % 26;
}

const LABELS = ['Slow', 'Mid-L', 'Mid-R', 'Fast'];

function traceSignal(char: string, state: MachineState) {
  const steps: { label: string; letter: string; color: string }[] = [];
  let charIndex = ALPHABET.indexOf(char.toUpperCase());
  steps.push({ label: 'Input', letter: ALPHABET[charIndex], color: 'text-neutral-200' });

  for (let i = 3; i >= 0; i--) {
    charIndex = forwardThrough(charIndex, state.rotors[i]);
    steps.push({ label: LABELS[i], letter: ALPHABET[charIndex], color: 'text-sky-400' });
  }

  charIndex = ALPHABET.indexOf(REFLECTOR_WIRING[charIndex]);
  steps.push({ label: 'Reflector', letter: ALPHABET[charIndex], color: 'text-orange-400' });

  for (let i = 0; i <= 3; i++) {
    charIndex = reverseThrough(charIndex, state.rotors[i]);
    steps.push({ label: LABELS[i], letter: ALPHABET[charIndex], color: 'text-sky-400' });
  }

  steps.push({ label: 'Output', letter: ALPHABET[charIndex], color: 'text-emerald-400' });
  return { steps };
}

export const SignalPath: React.FC<SignalPathProps> = ({ state, lastInput }) => {
  const trace = lastInput ? traceSignal(lastInput, state) : null;

  return (
    <div className="w-full bg-neutral-900/80 rounded-xl border border-neutral-800 p-5">
      <div className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-3 flex items-center gap-2">
        <span className="w-2 h-2 bg-sky-500 rounded-full animate-pulse"></span>
        Signal Path
      </div>
      {trace ? (
        <div className="flex flex-wrap items-center gap-1">
          {trace.steps.map((step, i) => (
            <React.Fragment key={i}>
              <div className="flex flex-col items-center">
                <span className="text-[9px] text-neutral-600 font-mono">{step.label}</span>
                <span className={`font-mono text-lg font-bold ${step.color}`}>{step.letter}</span>
              </div>
              {i < trace.steps.length - 1 && <span className="text-neutral-700 text-xs mx-0.5">&rarr;</span>}
            </React.Fragment>
          ))}
        </div>
      ) : (
        <div className="text-sm text-neutral-600 font-mono">Press a key to trace the signal...</div>
      )}
      <div className="mt-3 pt-2 border-t border-neutral-800 flex gap-4 text-[10px] font-mono text-neutral-600">
        <span><span className="text-sky-400">Blue</span> = Rotor</span>
        <span><span className="text-orange-400">Orange</span> = Reflector</span>
      </div>
    </div>
  );
};
