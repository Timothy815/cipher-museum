import { MachineState, CipherMode, SIXES_ALPHABET, TWENTIES_ALPHABET, EncryptionResult } from '../types';

// Hardcoded permutations to simulate wiring. 
// In a real machine, these are physical wire connections.
const PERM_SIXES = [4, 2, 5, 0, 1, 3]; // Scrambles the 6 indices
const PERM_TWENTIES_1 = [19, 4, 18, 1, 17, 2, 16, 3, 15, 8, 14, 9, 13, 5, 12, 6, 11, 7, 10, 0];
const PERM_TWENTIES_2 = [1, 18, 4, 17, 2, 16, 19, 10, 5, 15, 6, 14, 7, 13, 8, 12, 9, 11, 3, 0];
const PERM_TWENTIES_3 = [5, 19, 1, 14, 2, 18, 3, 17, 4, 16, 0, 15, 6, 12, 7, 11, 8, 13, 9, 10];

export class PurpleMachine {
  private state: MachineState;

  constructor(initialState?: MachineState) {
    this.state = initialState || {
      sixesPosition: 0,
      twentiesFast: 0,
      twentiesMedium: 0,
      twentiesSlow: 0,
    };
  }

  public getState(): MachineState {
    return { ...this.state };
  }

  public setState(state: MachineState) {
    this.state = { ...state };
  }

  public reset() {
    this.state = {
      sixesPosition: 0,
      twentiesFast: 0,
      twentiesMedium: 0,
      twentiesSlow: 0,
    };
  }

  // Modulo helper that handles negative numbers correctly
  private mod(n: number, m: number): number {
    return ((n % m) + m) % m;
  }

  // Step the rotors. 
  // Purple motion logic:
  // Sixes steps every character.
  // Twenties: Fast steps every char. Medium steps when Fast wraps. Slow steps when Medium wraps.
  // (Simplified odometer stepping for demo clarity).
  private step() {
    // Step Sixes
    this.state.sixesPosition = (this.state.sixesPosition + 1) % 6; // simplified to mod 6 for the demo array size

    // Step Twenties (Odometer style)
    this.state.twentiesFast = (this.state.twentiesFast + 1) % 20;
    if (this.state.twentiesFast === 0) {
      this.state.twentiesMedium = (this.state.twentiesMedium + 1) % 20;
      if (this.state.twentiesMedium === 0) {
        this.state.twentiesSlow = (this.state.twentiesSlow + 1) % 20;
      }
    }
  }

  // Reverse Step for backspace/correction? (Not implemented for this simplified demo)

  public processChar(char: string, mode: CipherMode): EncryptionResult {
    const upper = char.toUpperCase();
    
    // 1. Identify Path
    const isSixes = SIXES_ALPHABET.includes(upper);
    const isTwenties = TWENTIES_ALPHABET.includes(upper);

    if (!isSixes && !isTwenties) {
      // Non-alphabetic character, pass through
      return {
        inputChar: char,
        outputChar: char,
        isSixes: false,
        machineStateAfter: { ...this.state },
      };
    }

    let outputChar = '';

    if (isSixes) {
      const idx = SIXES_ALPHABET.indexOf(upper);
      const offset = this.state.sixesPosition;
      
      if (mode === CipherMode.ENCRYPT) {
        // (Index + Offset) -> Permutation -> (Result - Offset)
        const shifted = this.mod(idx + offset, 6);
        const permuted = PERM_SIXES[shifted];
        const finalIdx = this.mod(permuted - offset, 6);
        outputChar = SIXES_ALPHABET[finalIdx];
      } else {
        // Reverse: (Index + Offset) -> Inverse Permutation -> (Result - Offset)
        const shifted = this.mod(idx + offset, 6);
        const permuted = PERM_SIXES.indexOf(shifted); // Inverse lookup
        const finalIdx = this.mod(permuted - offset, 6);
        outputChar = SIXES_ALPHABET[finalIdx];
      }
    } else {
      // Twenties Path (3 Switches in Series)
      const idx = TWENTIES_ALPHABET.indexOf(upper);
      const { twentiesFast, twentiesMedium, twentiesSlow } = this.state;
      
      if (mode === CipherMode.ENCRYPT) {
        // Pass 1: Slow
        let val = this.mod(idx + twentiesSlow, 20);
        val = PERM_TWENTIES_3[val];
        val = this.mod(val - twentiesSlow, 20);

        // Pass 2: Medium
        val = this.mod(val + twentiesMedium, 20);
        val = PERM_TWENTIES_2[val];
        val = this.mod(val - twentiesMedium, 20);

        // Pass 3: Fast
        val = this.mod(val + twentiesFast, 20);
        val = PERM_TWENTIES_1[val];
        val = this.mod(val - twentiesFast, 20);

        outputChar = TWENTIES_ALPHABET[val];
      } else {
        // DECRYPT: Reverse Order (Fast -> Medium -> Slow)
        
        // Pass 1: Fast (Inverse)
        let val = this.mod(idx + twentiesFast, 20);
        val = PERM_TWENTIES_1.indexOf(val);
        val = this.mod(val - twentiesFast, 20);

        // Pass 2: Medium (Inverse)
        val = this.mod(val + twentiesMedium, 20);
        val = PERM_TWENTIES_2.indexOf(val);
        val = this.mod(val - twentiesMedium, 20);

        // Pass 3: Slow (Inverse)
        val = this.mod(val + twentiesSlow, 20);
        val = PERM_TWENTIES_3.indexOf(val);
        val = this.mod(val - twentiesSlow, 20);

        outputChar = TWENTIES_ALPHABET[val];
      }
    }

    // Step the machine *after* processing (or before, depending on specific model version, we'll do post-step for demo logic)
    this.step();

    return {
      inputChar: upper,
      outputChar,
      isSixes,
      machineStateAfter: { ...this.state },
    };
  }
}
