import { MachineState } from '../types';
import { SIXES_CHARS, TWENTIES_CHARS } from '../constants';

export function encryptCharacter(char: string, state: MachineState): { result: string; newState: MachineState } {
  const upper = char.toUpperCase();

  const isSixes = SIXES_CHARS.includes(upper);
  const isTwenties = TWENTIES_CHARS.includes(upper);

  if (!isSixes && !isTwenties) {
    return { result: char, newState: state };
  }

  // Step both switches before encryption
  const newSixes = { ...state.sixes, position: (state.sixes.position + 1) % state.sixes.size };
  const newTwenties = { ...state.twenties, position: (state.twenties.position + 1) % state.twenties.size };

  let result: string;

  if (isSixes) {
    const inputIndex = SIXES_CHARS.indexOf(upper);
    const wiring = newSixes.wiring[newSixes.position];
    result = wiring[inputIndex];
  } else {
    const inputIndex = TWENTIES_CHARS.indexOf(upper);
    const wiring = newTwenties.wiring[newTwenties.position];
    result = wiring[inputIndex];
  }

  return {
    result,
    newState: { ...state, sixes: newSixes, twenties: newTwenties },
  };
}

export function decryptCharacter(char: string, state: MachineState): { result: string; newState: MachineState } {
  const upper = char.toUpperCase();

  const isSixes = SIXES_CHARS.includes(upper);
  const isTwenties = TWENTIES_CHARS.includes(upper);

  if (!isSixes && !isTwenties) {
    return { result: char, newState: state };
  }

  const newSixes = { ...state.sixes, position: (state.sixes.position + 1) % state.sixes.size };
  const newTwenties = { ...state.twenties, position: (state.twenties.position + 1) % state.twenties.size };

  let result: string;

  if (isSixes) {
    const wiring = newSixes.wiring[newSixes.position];
    const outputIndex = wiring.indexOf(upper);
    result = SIXES_CHARS[outputIndex];
  } else {
    const wiring = newTwenties.wiring[newTwenties.position];
    const outputIndex = wiring.indexOf(upper);
    result = TWENTIES_CHARS[outputIndex];
  }

  return {
    result,
    newState: { ...state, sixes: newSixes, twenties: newTwenties },
  };
}
