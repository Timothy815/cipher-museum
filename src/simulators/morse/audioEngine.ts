// Web Audio API tone generator for Morse code

let audioCtx: AudioContext | null = null;
let oscillator: OscillatorNode | null = null;
let gainNode: GainNode | null = null;

function ensureContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function startTone(frequency: number = 700) {
  const ctx = ensureContext();
  if (oscillator) return; // already playing

  oscillator = ctx.createOscillator();
  gainNode = ctx.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

  // Smooth attack to avoid click
  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.005);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  oscillator.start();
}

export function stopTone() {
  if (!gainNode || !oscillator || !audioCtx) return;

  // Smooth release to avoid click
  gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.005);

  const osc = oscillator;
  setTimeout(() => {
    try { osc.stop(); } catch {}
    try { osc.disconnect(); } catch {}
  }, 10);

  oscillator = null;
  gainNode = null;
}

// Play a dot or dash with precise timing
export function playElement(
  type: 'dot' | 'dash',
  unitMs: number,
  frequency: number = 700,
): Promise<void> {
  const duration = type === 'dot' ? unitMs : unitMs * 3;
  return new Promise(resolve => {
    startTone(frequency);
    setTimeout(() => {
      stopTone();
      resolve();
    }, duration);
  });
}

// Play a full Morse string with proper timing
export async function playMorseString(
  morse: string,
  unitMs: number,
  frequency: number = 700,
  onElement?: (type: 'dot' | 'dash' | 'charGap' | 'wordGap', index: number) => void,
  abortSignal?: { aborted: boolean },
): Promise<void> {
  let idx = 0;
  const tokens = morse.split('');

  for (let i = 0; i < tokens.length; i++) {
    if (abortSignal?.aborted) return;
    const token = tokens[i];

    if (token === '.') {
      onElement?.('dot', idx++);
      await playElement('dot', unitMs, frequency);
      // Intra-character gap (1 unit) — but only if next token is dot or dash
      if (i + 1 < tokens.length && (tokens[i + 1] === '.' || tokens[i + 1] === '-')) {
        await delay(unitMs);
      }
    } else if (token === '-') {
      onElement?.('dash', idx++);
      await playElement('dash', unitMs, frequency);
      if (i + 1 < tokens.length && (tokens[i + 1] === '.' || tokens[i + 1] === '-')) {
        await delay(unitMs);
      }
    } else if (token === ' ') {
      // Inter-character gap = 3 units (already 1 from intra, so add 2 more)
      onElement?.('charGap', idx++);
      await delay(unitMs * 3);
    } else if (token === '/') {
      // Word gap = 7 units
      onElement?.('wordGap', idx++);
      await delay(unitMs * 7);
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function getUnitMs(wpm: number): number {
  // PARIS standard: 50 units per word
  return 1200 / wpm;
}
