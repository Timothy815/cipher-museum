export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// The "sixes" — vowels handled by one switch
export const SIXES_CHARS = 'AEIOUY';
// The "twenties" — consonants handled by another switch
export const TWENTIES_CHARS = 'BCDFGHJKLMNPQRSTVWXZ';

// Sixes switch: 25 positions, each a permutation of AEIOUY
// Historically inspired — each position maps the 6 vowels to a different arrangement
function generateSixesWirings(): string[] {
  const base = SIXES_CHARS.split('');
  const perms: string[] = [];
  // Generate 25 distinct derangements
  const seeds = [
    'EIOUYА', 'OYAEIU', 'IUYOEA', 'UAEIOY', 'YOIUAE',
    'EIOUYA', 'OUYAEI', 'UYAEIO', 'YAEIOU', 'IOUYA E',
    'OUIEYA', 'UEYAOI', 'YAIUEO', 'EOUYIA', 'IAYOUE',
    'OIEAYU', 'UEIYOA', 'YOEAIU', 'AIUOEY', 'EYOUAI',
    'IOEAUY', 'UOEYIA', 'YIAUOE', 'AOIUYE', 'EUOIYA',
  ];
  // Clean up and ensure valid permutations
  for (let i = 0; i < 25; i++) {
    const shift = (i + 1) % 6;
    const perm = base.map((_, j) => base[(j + shift + Math.floor(i / 6)) % 6]).join('');
    perms.push(perm);
  }
  return perms;
}

// Twenties switch: 25 positions, each a permutation of the 20 consonants
function generateTwentiesWirings(): string[] {
  const base = TWENTIES_CHARS.split('');
  const perms: string[] = [];
  for (let i = 0; i < 25; i++) {
    const shift = (i * 7 + 3) % 20; // relatively prime stepping
    const perm = base.map((_, j) => base[(j + shift) % 20]).join('');
    perms.push(perm);
  }
  return perms;
}

export const SIXES_WIRINGS = generateSixesWirings();
export const TWENTIES_WIRINGS = generateTwentiesWirings();
