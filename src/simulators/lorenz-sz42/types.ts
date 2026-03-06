export interface WheelConfig {
  id: string; // e.g., "Chi1", "Psi1", "Mu37"
  size: number;
  pattern: number[]; // Array of 0s and 1s
  position: number; // Current index (0 to size-1)
  type: 'Chi' | 'Psi' | 'Mu';
  label: string;
}

export interface LorenzState {
  wheels: WheelConfig[];
  processedText: string;
  baudotStream: string[]; // Visual representation of bits
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
}
