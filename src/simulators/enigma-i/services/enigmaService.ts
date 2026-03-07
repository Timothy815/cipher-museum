import { ROTOR_DATA, REFLECTOR_DATA } from '../constants';
import { MachineState, RotorConfig } from '../types';

const toIndex = (char: string) => char.charCodeAt(0) - 65;
const toChar = (idx: number) => String.fromCharCode(((idx % 26) + 26) % 26 + 65);

const cloneState = (state: MachineState): MachineState => ({
  ...state,
  rotors: state.rotors.map(r => ({ ...r })) as [RotorConfig, RotorConfig, RotorConfig],
  plugboard: { ...state.plugboard },
});

// Classic 3-rotor stepping with double-step anomaly
const stepRotors = (rotors: MachineState['rotors']): void => {
  const [left, mid, right] = rotors;

  const rightAtNotch = ROTOR_DATA[right.type].notch.includes(toChar(right.position));
  const midAtNotch = ROTOR_DATA[mid.type].notch.includes(toChar(mid.position));

  // Double stepping: mid steps if right is at notch OR if mid itself is at notch
  const rotateMid = rightAtNotch || midAtNotch;
  const rotateLeft = midAtNotch;

  // Right always steps
  right.position = (right.position + 1) % 26;
  if (rotateMid) mid.position = (mid.position + 1) % 26;
  if (rotateLeft) left.position = (left.position + 1) % 26;
};

const passRotor = (index: number, rotor: RotorConfig, forward: boolean): number => {
  const shift = rotor.position - rotor.ringSetting;
  let pin = (index + shift + 26) % 26;

  let contact: number;
  if (forward) {
    const wiredChar = ROTOR_DATA[rotor.type].wiring[pin];
    contact = toIndex(wiredChar);
  } else {
    const targetChar = toChar(pin);
    contact = ROTOR_DATA[rotor.type].wiring.indexOf(targetChar);
  }

  return (contact - shift + 26) % 26;
};

export const encryptCharacter = (char: string, state: MachineState): { result: string; newState: MachineState } => {
  const newState = cloneState(state);

  stepRotors(newState.rotors);

  // Plugboard in
  let current = char.toUpperCase();
  if (newState.plugboard[current]) current = newState.plugboard[current];
  let signal = toIndex(current);

  // Forward: Right(2) → Mid(1) → Left(0)
  signal = passRotor(signal, newState.rotors[2], true);
  signal = passRotor(signal, newState.rotors[1], true);
  signal = passRotor(signal, newState.rotors[0], true);

  // Reflector
  const reflectedChar = REFLECTOR_DATA[newState.reflector][signal];
  signal = toIndex(reflectedChar);

  // Reverse: Left(0) → Mid(1) → Right(2)
  signal = passRotor(signal, newState.rotors[0], false);
  signal = passRotor(signal, newState.rotors[1], false);
  signal = passRotor(signal, newState.rotors[2], false);

  // Plugboard out
  let outChar = toChar(signal);
  if (newState.plugboard[outChar]) outChar = newState.plugboard[outChar];

  return { result: outChar, newState };
};
