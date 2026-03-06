import React from 'react';
import { MachineState } from '../types';
import { ALPHABET, ROTOR_DATA, REFLECTOR_DATA } from '../constants';

interface SignalPathProps {
  state: MachineState;
  lastInput: string | null;
  lastOutput: string | null;
}

const toIndex = (char: string) => char.charCodeAt(0) - 65;
const toChar = (idx: number) => String.fromCharCode(((idx % 26) + 26) % 26 + 65);

const passRotor = (index: number, rotor: { type: string; position: number; ringSetting: number }, forward: boolean): number => {
  const shift = rotor.position - rotor.ringSetting;
  let pin = (index + shift + 26) % 26;
  let contact: number;
  if (forward) {
    const wiredChar = ROTOR_DATA[rotor.type as keyof typeof ROTOR_DATA].wiring[pin];
    contact = toIndex(wiredChar);
  } else {
    const targetChar = toChar(pin);
    const wiringStr = ROTOR_DATA[rotor.type as keyof typeof ROTOR_DATA].wiring;
    contact = wiringStr.indexOf(targetChar);
  }
  return (contact - shift + 26) % 26;
};

function traceSignal(char: string, state: MachineState): { steps: { label: string; letter: string; color: string }[] } {
  const steps: { label: string; letter: string; color: string }[] = [];

  let current = char.toUpperCase();
  steps.push({ label: 'Input', letter: current, color: 'text-slate-200' });

  // Plugboard in
  if (state.plugboard[current]) {
    current = state.plugboard[current];
    steps.push({ label: 'Plugboard', letter: current, color: 'text-pink-400' });
  } else {
    steps.push({ label: 'Plugboard', letter: current, color: 'text-slate-500' });
  }

  let signal = toIndex(current);

  // Forward: Right(3) → Mid(2) → Left(1) → Greek(0)
  const labels = ['Right', 'Mid', 'Left', 'Greek'];
  for (let i = 3; i >= 0; i--) {
    signal = passRotor(signal, state.rotors[i], true);
    steps.push({ label: labels[3 - i], letter: toChar(signal), color: 'text-amber-400' });
  }

  // Reflector
  const reflectorWiring = REFLECTOR_DATA[state.reflector];
  const reflectedChar = reflectorWiring[signal];
  signal = toIndex(reflectedChar);
  steps.push({ label: 'Reflector', letter: toChar(signal), color: 'text-cyan-400' });

  // Backward: Greek(0) → Left(1) → Mid(2) → Right(3)
  const backLabels = ['Greek', 'Left', 'Mid', 'Right'];
  for (let i = 0; i < 4; i++) {
    signal = passRotor(signal, state.rotors[i], false);
    steps.push({ label: backLabels[i], letter: toChar(signal), color: 'text-amber-400' });
  }

  // Plugboard out
  let outChar = toChar(signal);
  if (state.plugboard[outChar]) {
    outChar = state.plugboard[outChar];
    steps.push({ label: 'Plugboard', letter: outChar, color: 'text-pink-400' });
  } else {
    steps.push({ label: 'Plugboard', letter: outChar, color: 'text-slate-500' });
  }

  steps.push({ label: 'Output', letter: outChar, color: 'text-emerald-400' });

  return { steps };
}

export const SignalPath: React.FC<SignalPathProps> = ({ state, lastInput, lastOutput }) => {
  const trace = lastInput ? traceSignal(lastInput, state) : null;

  return (
    <div className="w-full max-w-3xl bg-slate-900/80 rounded-xl border border-slate-800 p-5">
      <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3 flex items-center gap-2">
        <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
        Signal Path
      </div>

      {trace ? (
        <div className="flex flex-wrap items-center gap-1">
          {trace.steps.map((step, i) => (
            <React.Fragment key={i}>
              <div className="flex flex-col items-center">
                <span className="text-[9px] text-slate-600 font-mono">{step.label}</span>
                <span className={`font-mono text-lg font-bold ${step.color}`}>{step.letter}</span>
              </div>
              {i < trace.steps.length - 1 && (
                <span className="text-slate-700 text-xs mx-0.5">→</span>
              )}
            </React.Fragment>
          ))}
        </div>
      ) : (
        <div className="text-sm text-slate-600 font-mono">
          Press a key to see the signal path through the machine...
        </div>
      )}

      <div className="mt-3 pt-2 border-t border-slate-800 flex gap-4 text-[10px] font-mono text-slate-600">
        <span><span className="text-pink-400">Pink</span> = Plugboard swap</span>
        <span><span className="text-amber-400">Amber</span> = Rotor</span>
        <span><span className="text-cyan-400">Cyan</span> = Reflector</span>
      </div>
    </div>
  );
};
