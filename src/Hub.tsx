import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, KeyRound, Cog, Cpu, Crown, Flower2, Plus, Radio, Zap, ArrowRightLeft, BookOpen, Grid3X3, Hash, Disc, Grid2X2, ShieldCheck, Settings, Layers, Shuffle, BarChart3, KeySquare, CircuitBoard, Binary, Waves, Box, Grid3x3 as Grid3x3Icon, Droplets, Wind, GitBranch, Key, UserCheck, Circle, SlidersHorizontal, Route, Activity, Fingerprint, Dice6, Fence, Columns3, Hexagon, Cylinder, FileScan, Table2, SearchCode, Scissors, CircleDot, Snowflake, FunctionSquare, Infinity, Split, Boxes, Equal, Flame, Stamp, Search, X } from 'lucide-react';

// ── Data ────────────────────────────────────────────────────────────

type Category = 'wwii-rotor' | 'cold-war' | 'classical' | 'transposition' | 'wiring' | 'educational';

interface MachineEntry {
  path: string;
  name: string;
  subtitle: string;
  country: string;
  era: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  category: Category;
}

const CATEGORY_META: Record<Category, { label: string; description: string }> = {
  'wwii-rotor': { label: 'WWII Rotor Machines', description: 'Electromechanical rotor ciphers from the world wars' },
  'cold-war': { label: 'Cold War & Military', description: 'Post-war military cipher machines and systems' },
  'classical': { label: 'Classical Ciphers', description: 'Pen-and-paper ciphers from antiquity through the early 20th century' },
  'transposition': { label: 'Transposition & Encoding', description: 'Ciphers that rearrange or re-encode without substitution' },
  'wiring': { label: 'Wiring Explorers', description: 'Interactive signal-path visualizations for rotor machines' },
  'educational': { label: 'Educational & DIY', description: 'Hands-on learning tools and physical builds' },
};

const machines: MachineEntry[] = [
  // ── WWII Rotor Machines ──
  { path: '/enigma-m4', name: 'Enigma M4', subtitle: 'Kriegsmarine Naval Cipher', country: 'Germany', era: '1942–1945', icon: <Cog size={32} />, color: 'amber', category: 'wwii-rotor',
    description: 'The 4-rotor Enigma used by the German Navy. Features plugboard, double-stepping, and thin reflectors.' },
  { path: '/enigma-i', name: 'Enigma I', subtitle: 'Wehrmacht Standard Cipher', country: 'Germany', era: '1930–1945', icon: <Cog size={32} />, color: 'yellow', category: 'wwii-rotor',
    description: 'The iconic 3-rotor Enigma. Broken by Polish mathematicians and Alan Turing at Bletchley Park. The most famous cipher machine in history.' },
  { path: '/lorenz-sz42', name: 'Lorenz SZ42', subtitle: 'Tunny — High Command Cipher', country: 'Germany', era: '1941–1945', icon: <Cpu size={32} />, color: 'blue', category: 'wwii-rotor',
    description: '12-wheel teleprinter cipher used for strategic communications. Broken by Colossus at Bletchley Park.' },
  { path: '/typex', name: 'Typex', subtitle: 'Type X Mk II — British Cipher Machine', country: 'Britain', era: '1937–1960s', icon: <Crown size={32} />, color: 'emerald', category: 'wwii-rotor',
    description: '5-rotor machine based on Enigma with critical improvements. 2 stator rotors, multiple notches. Never broken.' },
  { path: '/m209', name: 'M-209', subtitle: 'Hagelin Converter M-209-B', country: 'United States', era: '1943–1945', icon: <KeyRound size={32} />, color: 'green', category: 'wwii-rotor',
    description: 'Compact mechanical cipher used by the US Army for tactical field communications.' },
  { path: '/purple', name: 'Purple', subtitle: 'Type 97 Diplomatic Cipher', country: 'Japan', era: '1939–1945', icon: <Lock size={32} />, color: 'purple', category: 'wwii-rotor',
    description: 'Japanese diplomatic cipher machine using stepping switches instead of rotors. Broken by the SIS.' },
  { path: '/sigaba', name: 'SIGABA', subtitle: 'ECM Mark II', country: 'United States', era: '1941–1959', icon: <Shield size={32} />, color: 'red', category: 'wwii-rotor',
    description: '15-rotor cipher machine. The only major WWII cipher device never broken by an adversary.' },
  { path: '/red', name: 'RED (Type 91)', subtitle: 'Japanese Diplomatic Cipher', country: 'Japan', era: '1931–1939', icon: <Radio size={32} />, color: 'red', category: 'wwii-rotor',
    description: 'Japan\'s first cipher machine. Split alphabet into "sixes" and "twenties" using telephone stepping switches. Predecessor to Purple.' },
  { path: '/hebern', name: 'Hebern Electric', subtitle: 'First Rotor Cipher Machine', country: 'United States', era: '1918–1920s', icon: <Zap size={32} />, color: 'teal', category: 'wwii-rotor',
    description: 'The world\'s first rotor cipher machine. Single-rotor design that pioneered the concept behind Enigma, SIGABA, and all rotor ciphers.' },

  // ── Cold War & Military ──
  { path: '/fialka', name: 'Fialka M-125', subtitle: 'Soviet Electromechanical Cipher', country: 'Soviet Union', era: '1956–1990s', icon: <Flower2 size={32} />, color: 'rose', category: 'cold-war',
    description: '10-rotor Soviet cipher with reversible rotors, punch card keying, and irregular stepping. Used by all Warsaw Pact nations.' },
  { path: '/nema', name: 'NEMA', subtitle: 'NEue MAschine — Swiss Cipher', country: 'Switzerland', era: '1947–1970s', icon: <Plus size={32} />, color: 'sky', category: 'cold-war',
    description: '4-rotor Swiss improvement over Enigma. Drive wheel and multiple notches per rotor create highly irregular stepping.' },
  { path: '/cx52', name: 'CX-52 (Hagelin)', subtitle: 'Crypto AG — Operation Rubicon', country: 'Switzerland', era: '1952', icon: <Settings size={32} />, color: 'amber', category: 'cold-war',
    description: 'Successor to the M-209. Sold to 60+ countries — secretly owned by the CIA, who backdoored the machines for decades in Operation Rubicon.' },
  { path: '/kl7', name: 'KL-7 (ADONIS)', subtitle: 'NATO Cipher Machine', country: 'NATO', era: '1952–1983', icon: <Layers size={32} />, color: 'blue', category: 'cold-war',
    description: 'NATO\'s primary cipher machine for 30 years. 8 rotors from a set of 12 with irregular notch-driven stepping. Compromised by the Walker spy ring.' },
  { path: '/vic-cipher', name: 'VIC Cipher', subtitle: 'Cold War KGB Hand Cipher', country: 'Soviet Union', era: 'c. 1950', icon: <Snowflake size={32} />, color: 'sky', category: 'cold-war',
    description: 'The most complex hand cipher ever used operationally. Combines straddling checkerboard substitution, chain addition key expansion, and double columnar transposition.' },

  // ── Classical Ciphers ──
  { path: '/caesar', name: 'Caesar Cipher', subtitle: 'Shift Cipher — ~50 BC', country: 'Rome', era: '~50 BC', icon: <ArrowRightLeft size={32} />, color: 'yellow', category: 'classical',
    description: 'The simplest substitution cipher. Shift each letter by a fixed amount. Used by Julius Caesar. Includes brute-force breaker.' },
  { path: '/affine', name: 'Affine Cipher', subtitle: 'Mathematical Substitution', country: 'International', era: 'Classical', icon: <FunctionSquare size={32} />, color: 'teal', category: 'classical',
    description: 'Encrypts with E(x) = (ax + b) mod 26. Generalizes Caesar and Atbash. Introduces modular arithmetic and multiplicative inverses — concepts foundational to RSA.' },
  { path: '/alberti', name: 'Alberti Cipher Disk', subtitle: 'First Polyalphabetic Cipher', country: 'Italy', era: 'c. 1467', icon: <CircleDot size={32} />, color: 'amber', category: 'classical',
    description: 'Leon Battista Alberti\'s rotating cipher disk — the world\'s first polyalphabetic cipher. Two concentric disks with an index letter mechanic.' },
  { path: '/vigenere', name: 'Vigenere', subtitle: 'Le Chiffre Indechiffrable', country: 'France', era: '1553', icon: <BookOpen size={32} />, color: 'purple', category: 'classical',
    description: 'Polyalphabetic cipher using a keyword. Considered unbreakable for 300 years. Includes Tabula Recta visualization.' },
  { path: '/autokey', name: 'Autokey Cipher', subtitle: 'Self-Keying Vigenère', country: 'France', era: '1553', icon: <Infinity size={32} />, color: 'emerald', category: 'classical',
    description: 'Vigenère\'s actual invention — the plaintext extends the keyword into a non-repeating key stream. Resists Kasiski examination.' },
  { path: '/playfair', name: 'Playfair', subtitle: 'Digraph Substitution', country: 'Britain', era: '1854', icon: <Grid3X3 size={32} />, color: 'emerald', category: 'classical',
    description: 'First practical digraph cipher using a 5x5 grid. Encrypts pairs of letters. Used in the Boer War and WWI.' },
  { path: '/hill', name: 'Hill Cipher', subtitle: 'Matrix Polygraphic Cipher', country: 'United States', era: '1929', icon: <Grid2X2 size={32} />, color: 'purple', category: 'classical',
    description: 'First practical polygraphic cipher using matrix multiplication mod 26. Encrypts blocks of letters using linear algebra.' },
  { path: '/polybius', name: 'Polybius Square', subtitle: 'Coordinate Substitution', country: 'Greece', era: '~150 BC', icon: <Table2 size={32} />, color: 'lime', category: 'classical',
    description: 'Ancient Greek system that encodes each letter as a pair of coordinates on a 5×5 grid. Ancestor of ADFGVX and all fractionation ciphers.' },
  { path: '/bifid', name: 'Bifid Cipher', subtitle: 'Fractionation Cipher', country: 'France', era: '1901', icon: <Split size={32} />, color: 'fuchsia', category: 'classical',
    description: 'Delastelle\'s fractionation cipher — splits letters into Polybius coordinates, interleaves rows and columns, then recombines.' },
  { path: '/trifid', name: 'Trifid Cipher', subtitle: '3D Fractionation', country: 'France', era: '1901', icon: <Boxes size={32} />, color: 'indigo', category: 'classical',
    description: 'Extends Bifid into 3D with a 3×3×3 cube. Each letter splits into three coordinates, creating even more diffusion.' },
  { path: '/adfgvx', name: 'ADFGVX', subtitle: 'WWI German Field Cipher', country: 'Germany', era: '1918', icon: <Hash size={32} />, color: 'amber', category: 'classical',
    description: 'Combines Polybius square fractionation with columnar transposition. Nearly changed the outcome of WWI.' },
  { path: '/otp', name: 'One-Time Pad', subtitle: 'Theoretically Unbreakable', country: 'International', era: '1882', icon: <ShieldCheck size={32} />, color: 'emerald', category: 'classical',
    description: 'The only cipher proven to be perfectly secure. Uses a random key as long as the message. Used on the Moscow-Washington hotline.' },
  { path: '/chaocipher', name: 'Chaocipher', subtitle: 'Mutating Alphabet Cipher', country: 'United States', era: '1918', icon: <Shuffle size={32} />, color: 'red', category: 'classical',
    description: 'Two dynamically mutating alphabets that change after every letter. Algorithm kept secret until 2010. Never adopted, never broken.' },
  { path: '/jefferson', name: 'Jefferson Wheel', subtitle: 'Multi-Disk Cipher', country: 'United States', era: '1795', icon: <Disc size={32} />, color: 'sky', category: 'classical',
    description: 'Thomas Jefferson\'s cylinder cipher — 125 years ahead of its time. Reinvented as the US Army M-94 in 1922.' },
  { path: '/pollux', name: 'Pollux Cipher', subtitle: 'Morse-Numeric Substitution', country: 'France', era: 'WWII', icon: <Fingerprint size={32} />, color: 'teal', category: 'classical',
    description: 'Tomographic cipher that encodes via Morse, then substitutes each dot/dash/separator with digits. Homophonic substitution defeats frequency analysis.' },
  { path: '/pigpen', name: 'Pigpen Cipher', subtitle: 'Masonic Geometric Substitution', country: 'International', era: '18th Century', icon: <Hexagon size={32} />, color: 'amber', category: 'classical',
    description: 'The Freemason\'s cipher — each letter is replaced by a geometric symbol from a tic-tac-toe grid or X pattern.' },

  // ── Transposition & Encoding ──
  { path: '/scytale', name: 'Scytale', subtitle: 'Spartan Rod Cipher', country: 'Sparta', era: '~700 BC', icon: <Cylinder size={32} />, color: 'emerald', category: 'transposition',
    description: 'The oldest known military cipher device. Wrap a strip around a rod, write across the faces, and unwrap.' },
  { path: '/rail-fence', name: 'Rail Fence', subtitle: 'Zigzag Transposition', country: 'Ancient', era: 'Classical', icon: <Fence size={32} />, color: 'rose', category: 'transposition',
    description: 'The simplest transposition cipher. Write plaintext in a zigzag across rails, then read off row by row.' },
  { path: '/columnar', name: 'Columnar Transposition', subtitle: 'Keyword Column Reorder', country: 'International', era: 'WWI–WWII', icon: <Columns3 size={32} />, color: 'sky', category: 'transposition',
    description: 'Write plaintext into a grid, then read columns in alphabetical keyword order. Used in ADFGVX and SOE field ciphers.' },
  { path: '/morse', name: 'Morse Code', subtitle: 'Telegraphic Communication', country: 'International', era: '1837', icon: <Activity size={32} />, color: 'orange', category: 'transposition',
    description: 'Interactive Morse code keyer with straight key, single paddle, and dual paddle modes. Audio feedback and real-time decoding.' },

  // ── Wiring Explorers ──
  { path: '/enigma-i-wiring', name: 'Enigma I Wiring', subtitle: '3-Rotor Signal Tracer', country: 'Educational', era: '1930', icon: <Route size={32} />, color: 'amber', category: 'wiring',
    description: 'Trace the electrical signal through the 3-rotor Enigma I — forward through rotors, reflector bounce, and return path.' },
  { path: '/enigma-wiring', name: 'Enigma M4 Wiring', subtitle: 'Interactive Signal Tracer', country: 'Educational', era: 'M4', icon: <Route size={32} />, color: 'amber', category: 'wiring',
    description: 'See the Enigma\'s electrical pathway in real time — an "unrolled" M4 showing colored wires through all 4 rotors and reflector.' },
  { path: '/lorenz-wiring', name: 'Lorenz Visualizer', subtitle: 'XOR Signal Flow — 12 Wheels', country: 'Educational', era: 'Visualization', icon: <Route size={32} />, color: 'blue', category: 'wiring',
    description: 'Watch the Lorenz SZ42\'s 5-bit signal flow. See how Chi and Psi wheels produce keystream, and Motor wheels control stepping.' },
  { path: '/typex-wiring', name: 'Typex Wiring', subtitle: '5-Rotor Signal Tracer', country: 'Educational', era: '1937', icon: <Route size={32} />, color: 'emerald', category: 'wiring',
    description: 'Trace the signal through all 5 Typex rotors — 2 fixed stators plus 3 stepping rotors — and the reflector.' },
  { path: '/purple-wiring', name: 'Purple Wiring', subtitle: 'Split-Alphabet Signal Tracer', country: 'Educational', era: '1939', icon: <Route size={32} />, color: 'purple', category: 'wiring',
    description: 'Visualize Purple\'s fatal flaw: vowels and consonants encrypted separately through stepping switches.' },
  { path: '/sigaba-wiring', name: 'SIGABA Wiring', subtitle: '3-Bank Signal Tracer', country: 'Educational', era: '1941', icon: <Route size={32} />, color: 'red', category: 'wiring',
    description: 'Visualize SIGABA\'s three rotor banks: cipher, control, and index. See why it was never broken.' },
  { path: '/fialka-wiring', name: 'Fialka Wiring', subtitle: '10-Rotor Signal Tracer', country: 'Educational', era: '1956', icon: <Route size={32} />, color: 'rose', category: 'wiring',
    description: 'Trace the signal through all 10 Fialka rotors and reflector. Reversible rotors and irregular stepping.' },
  { path: '/nema-wiring', name: 'NEMA Wiring', subtitle: '4-Rotor Signal Tracer', country: 'Educational', era: '1947', icon: <Route size={32} />, color: 'sky', category: 'wiring',
    description: 'Trace the signal through NEMA\'s 4 rotors. See the drive wheel stepping mechanism.' },
  { path: '/kl7-wiring', name: 'KL-7 Wiring', subtitle: '8-Rotor Signal Tracer', country: 'Educational', era: '1952', icon: <Route size={32} />, color: 'blue', category: 'wiring',
    description: 'Trace the signal through all 8 KL-7 rotors. No reflector — non-reciprocal cipher with notch-driven stepping.' },
  { path: '/red-wiring', name: 'RED Wiring', subtitle: 'Split-Alphabet Signal Tracer', country: 'Educational', era: '1931', icon: <Route size={32} />, color: 'red', category: 'wiring',
    description: 'Trace RED\'s simpler split-alphabet design. Single switch per group — the vulnerability that let SIS break it.' },
  { path: '/hebern-wiring', name: 'Hebern Wiring', subtitle: 'Single Rotor Signal Tracer', country: 'Educational', era: '1918', icon: <Route size={32} />, color: 'teal', category: 'wiring',
    description: 'The simplest wiring visualization — trace the signal through one rotor that steps with each keypress.' },

  // ── Educational & DIY ──
  { path: '/pringles-enigma', name: 'Pringles Can Enigma', subtitle: 'Printable Paper Enigma', country: 'Educational', era: 'DIY', icon: <Scissors size={32} />, color: 'amber', category: 'educational',
    description: 'Generate printable paper strips that wrap around a Pringles can to create a working Enigma machine. PDF export.' },
];

const cryptanalysisTools = [
  { path: '/frequency-analysis', name: 'Frequency Analysis', subtitle: 'Statistical Codebreaking', country: 'Arabia', era: '~850 AD', icon: <BarChart3 size={32} />, color: 'crimson',
    description: 'The first known cryptanalysis technique. Letter frequency, bigrams, trigrams. Pioneered by Al-Kindi.' },
  { path: '/vigenere-breaker', name: 'Vigenère Breaker', subtitle: 'Kasiski + Index of Coincidence', country: 'Britain / Prussia', era: '1863', icon: <KeySquare size={32} />, color: 'crimson',
    description: 'Break the "unbreakable cipher" step by step. Kasiski examination finds key length, then frequency analysis recovers each key letter.' },
  { path: '/bombe', name: 'Bombe', subtitle: 'Turing\'s Enigma Breaker', country: 'Britain', era: '1940', icon: <CircuitBoard size={32} />, color: 'crimson',
    description: 'Alan Turing\'s electromechanical machine that broke Enigma by testing rotor positions against known-plaintext cribs.' },
  { path: '/colossus', name: 'Colossus', subtitle: 'First Electronic Computer', country: 'Britain', era: '1944', icon: <Binary size={32} />, color: 'crimson',
    description: 'Tommy Flowers\' electronic marvel that broke the Lorenz cipher. The world\'s first programmable electronic computer.' },
  { path: '/vigenere-workshop', name: 'Vigenère Workshop', subtitle: 'Hands-On Codebreaking', country: 'Interactive', era: '1863', icon: <SlidersHorizontal size={32} />, color: 'crimson',
    description: 'Crack the Vigenère cipher yourself. Kasiski examination, frequency sliding, and key letter recovery.' },
  { path: '/substitution-solver', name: 'Substitution Solver', subtitle: 'Interactive Frequency Attack', country: 'Interactive', era: '~850 AD', icon: <SearchCode size={32} />, color: 'crimson',
    description: 'Break a random substitution cipher by hand. Live frequency bars, bigram hints, click-to-assign mappings.' },
  { path: '/ioc', name: 'Index of Coincidence', subtitle: 'Friedman\'s Key Length Estimator', country: 'Cryptanalysis', era: '1922', icon: <Equal size={32} />, color: 'rose',
    description: 'Friedman\'s statistical method for estimating polyalphabetic cipher key lengths via stream splitting.' },
];

const modernCrypto = [
  { path: '/lfsr', name: 'LFSR', subtitle: 'Linear Feedback Shift Register', country: 'International', era: '1960s', icon: <Waves size={32} />, color: 'cyan',
    description: 'The building block of stream ciphers. A shift register whose input is a linear function of its previous state.' },
  { path: '/des', name: 'DES', subtitle: 'Data Encryption Standard', country: 'United States', era: '1977', icon: <Box size={32} />, color: 'cyan',
    description: 'The first federal encryption standard. 16-round Feistel network with 56-bit key. Visualize S-boxes and permutations.' },
  { path: '/aes', name: 'AES', subtitle: 'Advanced Encryption Standard', country: 'Belgium', era: '2001', icon: <Grid3x3Icon size={32} />, color: 'cyan',
    description: 'The world\'s most widely used cipher. SubBytes, ShiftRows, MixColumns, and AddRoundKey through 10 rounds.' },
  { path: '/salsa20', name: 'Salsa20', subtitle: 'ARX Stream Cipher', country: 'United States', era: '2005', icon: <Droplets size={32} />, color: 'cyan',
    description: 'Bernstein\'s elegant stream cipher using only Add, Rotate, XOR. eSTREAM finalist.' },
  { path: '/chacha20', name: 'ChaCha20', subtitle: 'TLS 1.3 Stream Cipher', country: 'United States', era: '2008', icon: <Wind size={32} />, color: 'cyan',
    description: 'Salsa20\'s successor with improved diffusion. Default cipher in TLS 1.3 and WireGuard.' },
  { path: '/trivium', name: 'Trivium', subtitle: 'eSTREAM Lightweight Cipher', country: 'Belgium', era: '2005', icon: <GitBranch size={32} />, color: 'cyan',
    description: 'Three coupled nonlinear feedback shift registers in just 288 bits. eSTREAM Profile 2 winner.' },
  { path: '/fortuna', name: 'Fortuna', subtitle: 'Cryptographic PRNG', country: 'International', era: '2003', icon: <Dice6 size={32} />, color: 'cyan',
    description: 'Ferguson & Schneier\'s CSPRNG with 32 entropy pools and AES-256-CTR generator. Used in FreeBSD, macOS, Windows.' },
  { path: '/sha256', name: 'SHA-256', subtitle: 'Secure Hash Algorithm', country: 'United States', era: '2001', icon: <FileScan size={32} />, color: 'cyan',
    description: 'The backbone of digital integrity — from Bitcoin to TLS. 64 compression rounds with avalanche effect.' },
  { path: '/rc4', name: 'RC4', subtitle: 'Rivest Cipher 4 (Broken)', country: 'United States', era: '1987', icon: <Flame size={32} />, color: 'orange',
    description: 'Once the most widely deployed stream cipher (SSL, WEP). Now cryptographically broken and banned from TLS.' },
  { path: '/hmac', name: 'HMAC-SHA256', subtitle: 'Message Authentication Code', country: 'International', era: '1997', icon: <Stamp size={32} />, color: 'sky',
    description: 'The standard for message authentication. Two-pass SHA-256 with ipad/opad. Used in TLS, JWT, and 2FA.' },
];

const publicKeyCrypto = [
  { path: '/diffie-hellman', name: 'Diffie-Hellman', subtitle: 'Key Exchange Protocol', country: 'United States', era: '1976', icon: <GitBranch size={32} />, color: 'violet',
    description: 'The first practical method for two parties to establish a shared secret over a public channel.' },
  { path: '/rsa', name: 'RSA', subtitle: 'Asymmetric Encryption', country: 'United States', era: '1977', icon: <Key size={32} />, color: 'violet',
    description: 'The most famous public key algorithm. Generate keys from primes, encrypt with modular exponentiation.' },
  { path: '/elgamal', name: 'ElGamal', subtitle: 'Probabilistic Encryption', country: 'United States', era: '1985', icon: <UserCheck size={32} />, color: 'violet',
    description: 'Public key encryption built on Diffie-Hellman. Same plaintext encrypts differently each time.' },
  { path: '/ecc', name: 'Elliptic Curve', subtitle: 'ECC / ECDH', country: 'International', era: '1985', icon: <Circle size={32} />, color: 'violet',
    description: 'Cryptography on elliptic curves — same security as RSA with far smaller keys.' },
];

// ── Color Map ───────────────────────────────────────────────────────

const colorMap: Record<string, { card: string; icon: string; badge: string; glow: string }> = {
  yellow: { card: 'hover:border-yellow-700/60', icon: 'text-yellow-400 bg-yellow-950/50 border-yellow-800/50', badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-700/50', glow: 'group-hover:shadow-yellow-900/30' },
  amber: { card: 'hover:border-amber-700/60', icon: 'text-amber-400 bg-amber-950/50 border-amber-800/50', badge: 'bg-amber-500/20 text-amber-300 border-amber-700/50', glow: 'group-hover:shadow-amber-900/30' },
  blue: { card: 'hover:border-blue-700/60', icon: 'text-blue-400 bg-blue-950/50 border-blue-800/50', badge: 'bg-blue-500/20 text-blue-300 border-blue-700/50', glow: 'group-hover:shadow-blue-900/30' },
  green: { card: 'hover:border-green-700/60', icon: 'text-green-400 bg-green-950/50 border-green-800/50', badge: 'bg-green-500/20 text-green-300 border-green-700/50', glow: 'group-hover:shadow-green-900/30' },
  emerald: { card: 'hover:border-emerald-700/60', icon: 'text-emerald-400 bg-emerald-950/50 border-emerald-800/50', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-700/50', glow: 'group-hover:shadow-emerald-900/30' },
  purple: { card: 'hover:border-purple-700/60', icon: 'text-purple-400 bg-purple-950/50 border-purple-800/50', badge: 'bg-purple-500/20 text-purple-300 border-purple-700/50', glow: 'group-hover:shadow-purple-900/30' },
  red: { card: 'hover:border-red-700/60', icon: 'text-red-400 bg-red-950/50 border-red-800/50', badge: 'bg-red-500/20 text-red-300 border-red-700/50', glow: 'group-hover:shadow-red-900/30' },
  rose: { card: 'hover:border-rose-700/60', icon: 'text-rose-400 bg-rose-950/50 border-rose-800/50', badge: 'bg-rose-500/20 text-rose-300 border-rose-700/50', glow: 'group-hover:shadow-rose-900/30' },
  teal: { card: 'hover:border-teal-700/60', icon: 'text-teal-400 bg-teal-950/50 border-teal-800/50', badge: 'bg-teal-500/20 text-teal-300 border-teal-700/50', glow: 'group-hover:shadow-teal-900/30' },
  sky: { card: 'hover:border-sky-700/60', icon: 'text-sky-400 bg-sky-950/50 border-sky-800/50', badge: 'bg-sky-500/20 text-sky-300 border-sky-700/50', glow: 'group-hover:shadow-sky-900/30' },
  orange: { card: 'hover:border-orange-700/60', icon: 'text-orange-400 bg-orange-950/50 border-orange-800/50', badge: 'bg-orange-500/20 text-orange-300 border-orange-700/50', glow: 'group-hover:shadow-orange-900/30' },
  crimson: { card: 'hover:border-red-600/60', icon: 'text-red-400 bg-red-950/60 border-red-700/50', badge: 'bg-red-500/20 text-red-300 border-red-600/50', glow: 'group-hover:shadow-red-800/40' },
  cyan: { card: 'hover:border-cyan-700/60', icon: 'text-cyan-400 bg-cyan-950/50 border-cyan-800/50', badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-700/50', glow: 'group-hover:shadow-cyan-900/30' },
  violet: { card: 'hover:border-violet-700/60', icon: 'text-violet-400 bg-violet-950/50 border-violet-800/50', badge: 'bg-violet-500/20 text-violet-300 border-violet-700/50', glow: 'group-hover:shadow-violet-900/30' },
  lime: { card: 'hover:border-lime-700/60', icon: 'text-lime-400 bg-lime-950/50 border-lime-800/50', badge: 'bg-lime-500/20 text-lime-300 border-lime-700/50', glow: 'group-hover:shadow-lime-900/30' },
  fuchsia: { card: 'hover:border-fuchsia-700/60', icon: 'text-fuchsia-400 bg-fuchsia-950/50 border-fuchsia-800/50', badge: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-700/50', glow: 'group-hover:shadow-fuchsia-900/30' },
  indigo: { card: 'hover:border-indigo-700/60', icon: 'text-indigo-400 bg-indigo-950/50 border-indigo-800/50', badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-700/50', glow: 'group-hover:shadow-indigo-900/30' },
};

// ── Reusable Card Component ─────────────────────────────────────────

const Card: React.FC<{ item: { path: string; name: string; subtitle: string; country: string; era: string; icon: React.ReactNode; color: string; description: string }; hoverColor?: string; cta?: string }> = ({ item, hoverColor = 'text-amber-200', cta = 'LAUNCH SIMULATOR' }) => {
  const c = colorMap[item.color] || colorMap.amber;
  return (
    <Link
      to={item.path}
      className={`group block bg-slate-900/70 border border-slate-800 rounded-2xl p-8 sm:p-10 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${c.card} ${c.glow}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${c.icon}`}>
          {item.icon}
        </div>
        <div className="flex gap-2">
          <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${c.badge}`}>{item.country}</span>
          <span className="text-[10px] font-bold px-2 py-1 rounded-full border bg-slate-800/50 text-slate-400 border-slate-700/50">{item.era}</span>
        </div>
      </div>
      <h2 className={`text-xl font-bold text-white mb-1 group-hover:${hoverColor} transition-colors`}>{item.name}</h2>
      <p className="text-[10px] font-mono text-slate-500 mb-3 uppercase tracking-wider">{item.subtitle}</p>
      <p className="text-sm text-slate-400 leading-relaxed">{item.description}</p>
      <div className="mt-6 text-xs font-semibold text-slate-600 group-hover:text-slate-400 transition-colors">{cta} &rarr;</div>
    </Link>
  );
};

// ── Hub Component ───────────────────────────────────────────────────

const ALL_CATEGORIES: Category[] = ['wwii-rotor', 'cold-war', 'classical', 'transposition', 'wiring', 'educational'];

const totalCount = machines.length + cryptanalysisTools.length + modernCrypto.length + publicKeyCrypto.length;

const Hub: React.FC = () => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');

  const matchesSearch = (item: { name: string; subtitle: string; country: string; description: string }) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return item.name.toLowerCase().includes(q) || item.subtitle.toLowerCase().includes(q) || item.country.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
  };

  // Filter machines by category and search
  const filteredMachines = useMemo(() => {
    return machines.filter(m => {
      if (activeCategory !== 'all' && m.category !== activeCategory) return false;
      return matchesSearch(m);
    });
  }, [search, activeCategory]);

  // Group filtered machines by category (preserving order)
  const groupedMachines = useMemo(() => {
    const groups: { category: Category; items: MachineEntry[] }[] = [];
    for (const cat of ALL_CATEGORIES) {
      const items = filteredMachines.filter(m => m.category === cat);
      if (items.length > 0) groups.push({ category: cat, items });
    }
    return groups;
  }, [filteredMachines]);

  const filteredCryptanalysis = useMemo(() => cryptanalysisTools.filter(matchesSearch), [search]);
  const filteredModern = useMemo(() => modernCrypto.filter(matchesSearch), [search]);
  const filteredPublicKey = useMemo(() => publicKeyCrypto.filter(matchesSearch), [search]);

  const isSearching = search.length > 0;
  const totalResults = filteredMachines.length + filteredCryptanalysis.length + filteredModern.length + filteredPublicKey.length;

  return (
    <div className="w-full flex-1 flex flex-col items-center px-6 sm:px-16 pt-20 pb-20">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-5xl sm:text-6xl font-black tracking-tight text-white mb-4">
          CIPHER <span className="text-amber-500">MUSEUM</span>
        </h1>
        <p className="text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Interactive simulations of history's most significant ciphers and cryptographic algorithms —
          from ancient Sparta to modern TLS.
        </p>
        <div className="text-xs text-slate-600 mt-3 font-mono">
          {totalCount} interactive simulators & tools
        </div>
      </div>

      {/* Search Bar */}
      <div className="w-full max-w-2xl mb-10">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search ciphers, machines, countries..."
            className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-11 pr-10 py-3 text-sm font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-700/50"
            spellCheck={false}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
              <X size={16} />
            </button>
          )}
        </div>
        {isSearching && (
          <div className="text-xs text-slate-500 mt-2 text-center font-mono">
            {totalResults} result{totalResults !== 1 ? 's' : ''} for "{search}"
          </div>
        )}
      </div>

      {/* Category Filters (only for machines section when not searching) */}
      {!isSearching && (
        <div className="w-full max-w-6xl mb-10 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-4 py-2 rounded-lg text-xs font-bold border transition-colors ${
              activeCategory === 'all'
                ? 'bg-amber-600 border-amber-500 text-white'
                : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
            }`}
          >
            All ({machines.length})
          </button>
          {ALL_CATEGORIES.map(cat => {
            const count = machines.filter(m => m.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? 'all' : cat)}
                className={`px-4 py-2 rounded-lg text-xs font-bold border transition-colors ${
                  activeCategory === cat
                    ? 'bg-amber-600 border-amber-500 text-white'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                }`}
              >
                {CATEGORY_META[cat].label.replace(/ &.*/, '')} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Machine Cards — grouped by category */}
      {groupedMachines.length > 0 && (
        <div className="w-full max-w-6xl">
          {groupedMachines.map(({ category, items }) => (
            <div key={category} className="mb-12">
              {/* Category header (hidden when only one category selected and not searching) */}
              {(activeCategory === 'all' || isSearching) && (
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-white">{CATEGORY_META[category].label}</h2>
                  <p className="text-xs text-slate-500 mt-1">{CATEGORY_META[category].description}</p>
                </div>
              )}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {items.map(m => <Card key={m.path} item={m} />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cryptanalysis Section */}
      {filteredCryptanalysis.length > 0 && (
        <div className="w-full max-w-6xl mt-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-3">
              CRYPTANALYSIS <span className="text-red-500">TOOLS</span>
            </h2>
            <p className="text-sm text-slate-400 max-w-xl mx-auto">
              The codebreaker's workbench — statistical analysis, automated attacks, and the legendary machines that cracked the "unbreakable."
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredCryptanalysis.map(m => <Card key={m.path} item={m} hoverColor="text-red-300" cta="LAUNCH TOOL" />)}
          </div>
        </div>
      )}

      {/* Modern Cryptography Section */}
      {filteredModern.length > 0 && (
        <div className="w-full max-w-6xl mt-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-3">
              MODERN <span className="text-cyan-500">CRYPTOGRAPHY</span>
            </h2>
            <p className="text-sm text-slate-400 max-w-xl mx-auto">
              Step inside the algorithms that protect the modern internet — from shift registers to the ciphers in your browser right now.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredModern.map(m => <Card key={m.path} item={m} hoverColor="text-cyan-300" cta="LAUNCH VISUALIZER" />)}
          </div>
        </div>
      )}

      {/* Public Key Section */}
      {filteredPublicKey.length > 0 && (
        <div className="w-full max-w-6xl mt-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-3">
              PUBLIC KEY <span className="text-violet-500">CRYPTOGRAPHY</span>
            </h2>
            <p className="text-sm text-slate-400 max-w-xl mx-auto">
              The mathematics of trust — key exchange, digital signatures, and the asymmetric algorithms that secure every connection.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {filteredPublicKey.map(m => <Card key={m.path} item={m} hoverColor="text-violet-300" cta="LAUNCH VISUALIZER" />)}
          </div>
        </div>
      )}

      {/* No results */}
      {totalResults === 0 && isSearching && (
        <div className="text-center text-slate-500 mt-20">
          <div className="text-4xl mb-4">🔍</div>
          <p className="text-lg">No matches for "{search}"</p>
          <p className="text-sm mt-1">Try a different search term</p>
        </div>
      )}

      {/* Sister Project */}
      <div className="w-full max-w-6xl mt-20">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-4">
            SISTER <span className="text-emerald-500">PROJECT</span>
          </h2>
        </div>
        <a
          href="https://timothy815.github.io/Modular_crypto_worksbench/"
          target="_blank"
          rel="noopener noreferrer"
          className="group block bg-slate-900/70 border border-slate-800 rounded-2xl p-10 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:border-emerald-700/60 max-w-2xl mx-auto"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl border flex items-center justify-center text-emerald-400 bg-emerald-950/50 border-emerald-800/50">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h4"/><path d="M14 12h4"/><path d="M12 6v12"/></svg>
            </div>
            <span className="text-[10px] font-bold px-2 py-1 rounded-full border bg-emerald-500/20 text-emerald-300 border-emerald-700/50">External</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-1 group-hover:text-emerald-200 transition-colors">Modular Crypto Workbench</h2>
          <p className="text-[10px] font-mono text-slate-500 mb-3 uppercase tracking-wider">Hands-On Cryptographic Toolkit</p>
          <p className="text-sm text-slate-400 leading-relaxed">
            A companion workbench for modular cryptographic experimentation. Build, combine, and test cryptographic primitives.
          </p>
          <div className="mt-6 text-xs font-semibold text-slate-600 group-hover:text-slate-400 transition-colors">VISIT WORKBENCH &rarr;</div>
        </a>
      </div>

      {/* Footer */}
      <div className="mt-16 text-center text-xs text-slate-600 w-full max-w-6xl">
        <p>Educational cipher machine simulations for classroom use.</p>
      </div>
    </div>
  );
};

export default Hub;
