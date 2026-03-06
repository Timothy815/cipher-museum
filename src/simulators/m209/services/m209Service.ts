import { MachineState, WheelConfig } from '../types';

export class M209Service {
  
  /**
   * Encrypts a single character and advances the machine state.
   * Returns the encrypted char and the NEW machine state.
   */
  static processCharacter(
    char: string, 
    currentState: MachineState
  ): { result: string, newState: MachineState } {
    
    const upperChar = char.toUpperCase();
    if (!/^[A-Z]$/.test(upperChar)) {
      // Pass through non-alpha characters without advancing
      return { result: char, newState: currentState };
    }

    const inputIndex = upperChar.charCodeAt(0) - 65; // A=0, Z=25
    
    // 1. Calculate Shift (K)
    let shift = 0;
    
    // For each bar on the drum
    for (const bar of currentState.bars) {
      let active = false;
      
      // Check lug 1
      if (bar.lug1 !== null) {
        const w = currentState.wheels[bar.lug1];
        // The effective pin is the one currently at the "active" position relative to the drum.
        // In M-209, the reading window shows one letter, but the active pin might be offset.
        // We assume the active pin is at the current index for simplicity of simulation.
        if (w.pins[w.position]) {
          active = true;
        }
      }

      // Check lug 2 (OR logic)
      if (!active && bar.lug2 !== null) {
        const w = currentState.wheels[bar.lug2];
        if (w.pins[w.position]) {
          active = true;
        }
      }

      if (active) {
        shift++;
      }
    }

    // 2. Apply Cipher Formula
    // M-209 Reciprocal: C = (25 - P - K) mod 26
    // Or equivalently: C = (25 - (P + K)) mod 26
    // We need to handle JS modulo of negative numbers correctly.
    
    let cipherIndex = (25 - inputIndex - shift) % 26;
    if (cipherIndex < 0) cipherIndex += 26;

    const result = String.fromCharCode(65 + cipherIndex);

    // 3. Advance Wheels
    const newWheels = currentState.wheels.map(w => ({
      ...w,
      position: (w.position + 1) % w.size
    }));

    return {
      result,
      newState: {
        ...currentState,
        wheels: newWheels
      }
    };
  }

  /**
   * Calculate what the letter would be just by rotating the wheel manually
   * Used for the UI interactions
   */
  static rotateWheel(wheel: WheelConfig, direction: 'up' | 'down'): WheelConfig {
    let newPos = direction === 'up' ? wheel.position - 1 : wheel.position + 1;
    if (newPos < 0) newPos = wheel.size - 1;
    if (newPos >= wheel.size) newPos = 0;
    
    return { ...wheel, position: newPos };
  }
}