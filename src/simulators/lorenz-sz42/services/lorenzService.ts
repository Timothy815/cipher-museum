import { WheelConfig, LorenzState } from "../types";
import { BAUDOT_MAP, REVERSE_BAUDOT_MAP } from "../constants";

export class LorenzMachine {
  private wheels: WheelConfig[];

  constructor(initialWheels: WheelConfig[]) {
    // Deep copy to avoid mutating initial constants
    this.wheels = JSON.parse(JSON.stringify(initialWheels));
  }

  // Get current bit for a specific wheel
  private getBit(wheelId: string): number {
    const wheel = this.wheels.find(w => w.id === wheelId);
    if (!wheel) return 0;
    return wheel.pattern[wheel.position];
  }

  // Advance wheels based on Lorenz logic
  private step() {
    const mu61 = this.wheels.find(w => w.id === 'mu61')!;
    const mu37 = this.wheels.find(w => w.id === 'mu37')!;

    // 1. All Chi wheels step every time
    this.wheels.filter(w => w.type === 'Chi').forEach(w => {
      w.position = (w.position + 1) % w.size;
    });

    // 2. Mu61 steps every time
    const mu61Bit = mu61.pattern[mu61.position];
    mu61.position = (mu61.position + 1) % mu61.size;

    // 3. Mu37 steps if Mu61 bit is 1 (Mark)
    const mu37Bit = mu37.pattern[mu37.position];
    if (mu61Bit === 1) {
      mu37.position = (mu37.position + 1) % mu37.size;
    }

    // 4. All Psi wheels step if Mu37 bit is 1 (Mark)
    if (mu37Bit === 1) {
      this.wheels.filter(w => w.type === 'Psi').forEach(w => {
        w.position = (w.position + 1) % w.size;
      });
    }
  }

  public processCharacter(char: string): { outputChar: string | null, keystream: number[] } {
    const upperChar = char.toUpperCase();
    const inputBits = BAUDOT_MAP[upperChar];

    // If character is not in our map (e.g. invalid punctuation or newlines), ignore it completely.
    // Do NOT step the machine. This ensures synchronization is not broken by typos.
    if (!inputBits) {
        return { outputChar: null, keystream: [] };
    }

    // Calculate Keystream K = Chi XOR Psi
    const kBits: number[] = [];
    for (let i = 1; i <= 5; i++) {
      const chiBit = this.getBit(`chi${i}`);
      const psiBit = this.getBit(`psi${i}`);
      kBits.push(chiBit ^ psiBit);
    }

    // Encrypt/Decrypt: Output = Input XOR Keystream
    const outputBits = inputBits.map((bit, idx) => bit ^ kBits[idx]);
    
    // Convert back to char
    const outputKey = outputBits.join('');
    // With a complete 32-entry map, this should never default to '?', but we keep fallback just in case.
    const outputChar = REVERSE_BAUDOT_MAP[outputKey] || '?';

    // Advance the machine
    this.step();

    return { outputChar, keystream: kBits };
  }

  public getCurrentState(): WheelConfig[] {
    return this.wheels;
  }

  public resetTo(wheels: WheelConfig[]) {
    this.wheels = JSON.parse(JSON.stringify(wheels));
  }
}