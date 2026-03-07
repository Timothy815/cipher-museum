import React from 'react';
import { MachineState, RotorConfig } from '../types';
import { ALPHABET, REFLECTOR_WIRING } from '../constants';

interface SignalPathProps {
  state: MachineState;
  lastInput: string | null;
}

function getEffectiveWiring(rotor: RotorConfig): string {
  if (!rotor.reversed) return rotor.wiring;
  const inv = new Array(26);
  for (let i = 0; i < 26; i++) {
    inv[ALPHABET.indexOf(rotor.wiring[i])] = ALPHABET[i];
  }
  return inv.join('');
}

function forwardThrough(charIndex: number, rotor: RotorConfig): number {
  const wiring = getEffectiveWiring(rotor);
  const shifted = (charIndex + rotor.position - rotor.ringSetting + 26) % 26;
  const outChar = wiring[shifted];
  const outIndex = ALPHABET.indexOf(outChar);
  return (outIndex - rotor.position + rotor.ringSetting + 26) % 26;
}

function reverseThrough(charIndex: number, rotor: RotorConfig): number {
  const wiring = getEffectiveWiring(rotor);
  const shifted = (charIndex + rotor.position - rotor.ringSetting + 26) % 26;
  const outChar = ALPHABET[shifted];
  const outIndex = wiring.indexOf(outChar);
  return (outIndex - rotor.position + rotor.ringSetting + 26) % 26;
}

function traceSignal(char: string, state: MachineState) {
  const steps: { label: string; letter: string; color: string }[] = [];

  let current = state.cardSubstitution[char] || char;
  let charIndex = ALPHABET.indexOf(current);
  steps.push({ label: 'Input', letter: char, color: 'text-stone-200' });

  if (current !== char) {
    steps.push({ label: 'Card', letter: current, color: 'text-pink-400' });
  } else {
    steps.push({ label: 'Card', letter: current, color: 'text-stone-500' });
  }

  // Forward through rotors 9 → 0
  for (let i = 9; i >= 0; i--) {
    charIndex = forwardThrough(charIndex, state.rotors[i]);
    steps.push({
      label: `R${state.rotors[i].id}`,
      letter: ALPHABET[charIndex],
      color: state.rotors[i].reversed ? 'text-red-400' : 'text-amber-400',
    });
  }

  // Reflector
  charIndex = ALPHABET.indexOf(REFLECTOR_WIRING[charIndex]);
  steps.push({ label: 'Refl', letter: ALPHABET[charIndex], color: 'text-cyan-400' });

  // Reverse through rotors 0 → 9
  for (let i = 0; i <= 9; i++) {
    charIndex = reverseThrough(charIndex, state.rotors[i]);
    steps.push({
      label: `R${state.rotors[i].id}`,
      letter: ALPHABET[charIndex],
      color: state.rotors[i].reversed ? 'text-red-400' : 'text-amber-400',
    });
  }

  // Card exit
  let outChar = ALPHABET[charIndex];
  for (const [from, to] of Object.entries(state.cardSubstitution)) {
    if (to === outChar) { outChar = from; break; }
  }
  steps.push({ label: 'Card', letter: outChar, color: outChar !== ALPHABET[charIndex] ? 'text-pink-400' : 'text-stone-500' });
  steps.push({ label: 'Output', letter: outChar, color: 'text-red-300' });

  return { steps };
}

export const SignalPath: React.FC<SignalPathProps> = ({ state, lastInput }) => {
  const trace = lastInput ? traceSignal(lastInput, state) : null;

  return (
    <div className="w-full bg-stone-900/80 rounded-xl border border-stone-800 p-5">
      <div className="text-[10px] text-stone-500 uppercase tracking-widest font-bold mb-3 flex items-center gap-2">
        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
        Signal Path (through 10 rotors)
      </div>

      {trace ? (
        <div className="flex flex-wrap items-center gap-1">
          {trace.steps.map((step, i) => (
            <React.Fragment key={i}>
              <div className="flex flex-col items-center">
                <span className="text-[8px] text-stone-600 font-mono">{step.label}</span>
                <span className={`font-mono text-base sm:text-lg font-bold ${step.color}`}>{step.letter}</span>
              </div>
              {i < trace.steps.length - 1 && (
                <span className="text-stone-700 text-xs mx-0.5">&rarr;</span>
              )}
            </React.Fragment>
          ))}
        </div>
      ) : (
        <div className="text-sm text-stone-600 font-mono">
          Press a key to trace the signal through all 10 rotors...
        </div>
      )}

      <div className="mt-3 pt-2 border-t border-stone-800 flex flex-wrap gap-4 text-[10px] font-mono text-stone-600">
        <span><span className="text-amber-400">Amber</span> = Rotor (fwd)</span>
        <span><span className="text-red-400">Red</span> = Reversed rotor</span>
        <span><span className="text-cyan-400">Cyan</span> = Reflector</span>
        <span><span className="text-pink-400">Pink</span> = Card swap</span>
      </div>
    </div>
  );
};
