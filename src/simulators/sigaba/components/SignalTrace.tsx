import React, { useMemo } from 'react';
import { MachineState, RotorConfig } from '../types';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const mod = (n: number, m: number) => ((n % m) + m) % m;

const mapThroughRotor = (
  charIndex: number,
  rotor: RotorConfig,
  direction: 'FORWARD' | 'BACKWARD'
): number => {
  const offset = rotor.currentPos;
  if (direction === 'FORWARD') {
    const entryContact = mod(charIndex + offset, 26);
    const wiringChar = rotor.wiring[entryContact];
    const wiringOffset = ALPHABET.indexOf(wiringChar);
    return mod(wiringOffset - offset, 26);
  } else {
    const entryContact = mod(charIndex + offset, 26);
    const wiringChar = ALPHABET[entryContact];
    const wiringIndex = rotor.wiring.indexOf(wiringChar);
    return mod(wiringIndex - offset, 26);
  }
};

interface SignalTraceProps {
  state: MachineState;
}

const SignalTrace: React.FC<SignalTraceProps> = ({ state }) => {
  const trace = useMemo(() => {
    // Trace the stepping logic without actually stepping
    const inputs = [5, 6, 7, 8]; // F, G, H, I
    const controlOutputs: { input: number; output: number }[] = [];

    inputs.forEach(input => {
      let signal = input;
      for (let i = 0; i < 5; i++) {
        signal = mapThroughRotor(signal, state.controlBank[i], 'FORWARD');
      }
      controlOutputs.push({ input, output: signal });
    });

    // Pass through index bank
    const indexOutputs: { input: number; output: number; targetRotor: number }[] = [];
    const cipherStepMask = [false, false, false, false, false];

    controlOutputs.forEach(co => {
      let signal = co.output;
      for (let i = 0; i < 5; i++) {
        signal = mapThroughRotor(signal, state.indexBank[i], 'FORWARD');
      }
      const targetRotor = Math.floor(signal / 5);
      if (targetRotor >= 0 && targetRotor < 5) {
        cipherStepMask[targetRotor] = true;
      }
      indexOutputs.push({ input: co.output, output: signal, targetRotor: Math.min(targetRotor, 4) });
    });

    return { controlOutputs, indexOutputs, cipherStepMask };
  }, [state]);

  return (
    <div className="w-full bg-[#1a1c23] rounded-xl border border-gray-700 p-5 space-y-5">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
        <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
        Stepping Signal Trace
      </h3>

      {/* Flow diagram */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Control Bank Output */}
        <div className="bg-black/30 rounded-lg p-4 border border-gray-700/50">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-3 font-bold">
            1. Control Bank Output
          </div>
          <div className="text-[10px] text-gray-600 mb-2">
            Inputs F, G, H, I pass through 5 control rotors
          </div>
          <div className="space-y-1.5">
            {trace.controlOutputs.map((co, i) => (
              <div key={i} className="flex items-center gap-2 font-mono text-xs">
                <span className="text-blue-400 w-4">{ALPHABET[co.input]}</span>
                <span className="text-gray-600">→</span>
                <div className="flex-1 h-px bg-gray-700"></div>
                <span className="text-gray-600">→</span>
                <span className="text-amber-400 w-4">{ALPHABET[co.output]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Index Bank Permutation */}
        <div className="bg-black/30 rounded-lg p-4 border border-gray-700/50">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-3 font-bold">
            2. Index Bank Permutation
          </div>
          <div className="text-[10px] text-gray-600 mb-2">
            Control outputs pass through 5 index rotors
          </div>
          <div className="space-y-1.5">
            {trace.indexOutputs.map((io, i) => (
              <div key={i} className="flex items-center gap-2 font-mono text-xs">
                <span className="text-amber-400 w-4">{ALPHABET[io.input]}</span>
                <span className="text-gray-600">→</span>
                <div className="flex-1 h-px bg-gray-700"></div>
                <span className="text-gray-600">→</span>
                <span className="text-green-400 w-6">{io.output}</span>
                <span className="text-gray-600 text-[10px]">→M{io.targetRotor + 1}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cipher Rotors Step Mask */}
        <div className="bg-black/30 rounded-lg p-4 border border-gray-700/50">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-3 font-bold">
            3. Cipher Rotors Step
          </div>
          <div className="text-[10px] text-gray-600 mb-2">
            Index output determines which cipher rotors advance
          </div>
          <div className="flex gap-2 mt-3">
            {trace.cipherStepMask.map((willStep, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-gray-500 font-mono">M-{i + 1}</span>
                <div className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center font-mono text-sm font-bold transition-all ${
                  willStep
                    ? 'bg-amber-600/30 border-amber-500 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                    : 'bg-gray-900 border-gray-700 text-gray-600'
                }`}>
                  {willStep ? 'STEP' : '—'}
                </div>
                <span className="text-[10px] font-mono text-gray-500">
                  {ALPHABET[state.cipherBank[i].currentPos]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Current rotor positions summary */}
      <div className="flex flex-wrap gap-6 text-[10px] font-mono text-gray-500 pt-2 border-t border-gray-800">
        <div>
          <span className="text-gray-600">CIPHER:</span>{' '}
          <span className="text-amber-400">{state.cipherBank.map(r => ALPHABET[r.currentPos]).join(' ')}</span>
        </div>
        <div>
          <span className="text-gray-600">CONTROL:</span>{' '}
          <span className="text-blue-400">{state.controlBank.map(r => ALPHABET[r.currentPos]).join(' ')}</span>
        </div>
        <div>
          <span className="text-gray-600">INDEX:</span>{' '}
          <span className="text-green-400">{state.indexBank.map(r => ALPHABET[r.currentPos]).join(' ')}</span>
        </div>
      </div>
    </div>
  );
};

export default SignalTrace;
