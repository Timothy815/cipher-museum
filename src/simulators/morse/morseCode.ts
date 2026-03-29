// International Morse Code lookup tables

export const CHAR_TO_MORSE: Record<string, string> = {
  'A': '.-',    'B': '-...',  'C': '-.-.',  'D': '-..',   'E': '.',
  'F': '..-.',  'G': '--.',   'H': '....',  'I': '..',    'J': '.---',
  'K': '-.-',   'L': '.-..',  'M': '--',    'N': '-.',    'O': '---',
  'P': '.--.',  'Q': '--.-',  'R': '.-.',   'S': '...',   'T': '-',
  'U': '..-',   'V': '...-',  'W': '.--',   'X': '-..-',  'Y': '-.--',
  'Z': '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
  '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', '!': '-.-.--',
  '/': '-..-.', '(': '-.--.', ')': '-.--.-', '&': '.-...',
  ':': '---...', ';': '-.-.-.', '=': '-...-', '+': '.-.-.',
  '-': '-....-', '_': '..--.-', '"': '.-..-.', '$': '...-..-',
  '@': '.--.-.', "'": '.----.', ' ': '/',
};

export const MORSE_TO_CHAR: Record<string, string> = {};
for (const [char, morse] of Object.entries(CHAR_TO_MORSE)) {
  if (char !== ' ') MORSE_TO_CHAR[morse] = char;
}

export function textToMorse(text: string): string {
  return text.toUpperCase().split('').map(c => {
    if (c === ' ') return '/';
    return CHAR_TO_MORSE[c] || '';
  }).filter(Boolean).join(' ');
}

export function morseToText(morse: string): string {
  return morse.split(/\s+/).map(code => {
    if (code === '/' || code === '') return ' ';
    return MORSE_TO_CHAR[code] || '?';
  }).join('').replace(/\s+/g, ' ').trim();
}

// Prosigns
export const PROSIGNS: Record<string, string> = {
  'AR': '.-.-.',    // End of message
  'AS': '.-...',    // Wait
  'BT': '-...-',    // Break
  'SK': '...-.-',   // End of contact
  'SOS': '...---...', // Distress
};
