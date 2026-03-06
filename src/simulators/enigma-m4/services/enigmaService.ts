import { ALPHABET, ROTOR_DATA, REFLECTOR_DATA } from '../constants';
import { MachineState, RotorConfig, RotorType, ReflectorType } from '../types';

// Helper: Convert char to 0-25 index
const toIndex = (char: string) => char.charCodeAt(0) - 65;
// Helper: Convert index to char
const toChar = (idx: number) => String.fromCharCode(((idx % 26) + 26) % 26 + 65);

// Deep clone state to avoid mutation issues
export const cloneState = (state: MachineState): MachineState => ({
  ...state,
  rotors: state.rotors.map(r => ({ ...r })) as [RotorConfig, RotorConfig, RotorConfig, RotorConfig],
  plugboard: { ...state.plugboard },
});

// Step the rotors according to mechanical rules
// M4: Greek (index 0) never steps. Left (1), Mid (2), Right (3) logic.
export const stepRotors = (rotors: MachineState['rotors']): void => {
  const [greek, left, mid, right] = rotors;
  
  // Identify notches (letter displayed at top window when notch engages pawl)
  // For standard rotors, the notch character is the position where the turnover occurs.
  // The turnover happens as the rotor moves FROM the notch character TO the next.
  
  // Right rotor always steps
  const rightSteps = true;
  
  // Mid rotor steps if Right is at notch
  const rightIsAtNotch = ROTOR_DATA[right.type].notch.includes(toChar(right.position));
  const midSteps = rightIsAtNotch;
  
  // Left rotor steps if Mid is at notch (Double step behavior logic)
  // Double Stepping: If the middle rotor is in its notch position, it will step on the next keypress,
  // pushing the left rotor with it. This happens even if the right rotor isn't at its notch.
  const midIsAtNotch = ROTOR_DATA[mid.type].notch.includes(toChar(mid.position));
  const leftSteps = midIsAtNotch;

  // HOWEVER, due to the pawl mechanics:
  // 1. Right always moves.
  // 2. If Right is at notch, Mid moves.
  // 3. If Mid is at notch, Mid moves (double step) AND Left moves.
  
  const rotateRight = true;
  const rotateMid = rightIsAtNotch || midIsAtNotch;
  const rotateLeft = midIsAtNotch;
  
  // Apply rotations
  if (rotateRight) right.position = (right.position + 1) % 26;
  if (rotateMid)   mid.position = (mid.position + 1) % 26;
  if (rotateLeft)  left.position = (left.position + 1) % 26;
  // Greek never rotates in M4
};

// Pass signal through a single rotor
const passRotor = (index: number, rotor: RotorConfig, forward: boolean): number => {
  const { wiring, position, ringSetting } = rotor;
  const shift = position - ringSetting;
  
  // Enter rotor: adjust for relative position
  let pin = (index + shift + 26) % 26;
  
  let contact: number;
  if (forward) {
    // Wiring input -> output
    const char = toChar(pin);
    const wiredChar = ROTOR_DATA[rotor.type].wiring[toIndex(char)];
    contact = toIndex(wiredChar);
  } else {
    // Wiring output -> input (Inverse)
    // We need to find which Input maps to the current Pin character in the wiring string
    const targetChar = toChar(pin);
    const wiringStr = ROTOR_DATA[rotor.type].wiring;
    const inputIdx = wiringStr.indexOf(targetChar);
    contact = inputIdx;
  }
  
  // Exit rotor: adjust back for relative position
  return (contact - shift + 26) % 26;
};

export const encryptCharacter = (char: string, state: MachineState): { result: string; newState: MachineState } => {
  // 1. Clone state
  const newState = cloneState(state);
  
  // 2. Step rotors
  stepRotors(newState.rotors);
  
  // 3. Plugboard In
  let current = char.toUpperCase();
  if (newState.plugboard[current]) {
    current = newState.plugboard[current];
  }
  let signal = toIndex(current);
  
  // 4. Forward through Rotors (Right to Greek)
  // Index 3 (Right) -> 2 (Mid) -> 1 (Left) -> 0 (Greek)
  signal = passRotor(signal, newState.rotors[3], true);
  signal = passRotor(signal, newState.rotors[2], true);
  signal = passRotor(signal, newState.rotors[1], true);
  signal = passRotor(signal, newState.rotors[0], true);
  
  // 5. Reflector
  const reflectorWiring = REFLECTOR_DATA[newState.reflector];
  const reflectedChar = reflectorWiring[signal];
  signal = toIndex(reflectedChar);
  
  // 6. Backward through Rotors (Greek to Right)
  signal = passRotor(signal, newState.rotors[0], false);
  signal = passRotor(signal, newState.rotors[1], false);
  signal = passRotor(signal, newState.rotors[2], false);
  signal = passRotor(signal, newState.rotors[3], false);
  
  // 7. Plugboard Out
  let outChar = toChar(signal);
  if (newState.plugboard[outChar]) {
    outChar = newState.plugboard[outChar];
  }
  
  return {
    result: outChar,
    newState
  };
};
