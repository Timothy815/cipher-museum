import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, KeyRound, Cog, Cpu, Crown, Flower2, Plus, Radio, Zap, ArrowRightLeft, BookOpen, Grid3X3, Hash, Disc, Grid2X2, ShieldCheck, Settings, Layers, Shuffle, BarChart3, KeySquare, CircuitBoard, Binary } from 'lucide-react';

const machines = [
  {
    path: '/enigma-m4',
    name: 'Enigma M4',
    subtitle: 'Kriegsmarine Naval Cipher',
    country: 'Germany',
    era: '1942–1945',
    icon: <Cog size={32} />,
    color: 'amber',
    description: 'The 4-rotor Enigma used by the German Navy. Features plugboard, double-stepping, and thin reflectors.',
  },
  {
    path: '/enigma-i',
    name: 'Enigma I',
    subtitle: 'Wehrmacht Standard Cipher',
    country: 'Germany',
    era: '1930–1945',
    icon: <Cog size={32} />,
    color: 'yellow',
    description: 'The iconic 3-rotor Enigma. Broken by Polish mathematicians and Alan Turing at Bletchley Park. The most famous cipher machine in history.',
  },
  {
    path: '/lorenz-sz42',
    name: 'Lorenz SZ42',
    subtitle: 'Tunny — High Command Cipher',
    country: 'Germany',
    era: '1941–1945',
    icon: <Cpu size={32} />,
    color: 'blue',
    description: '12-wheel teleprinter cipher used for strategic communications. Broken by Colossus at Bletchley Park.',
  },
  {
    path: '/typex',
    name: 'Typex',
    subtitle: 'Type X Mk II — British Cipher Machine',
    country: 'Britain',
    era: '1937–1960s',
    icon: <Crown size={32} />,
    color: 'emerald',
    description: '5-rotor machine based on Enigma with critical improvements. 2 stator rotors, multiple notches. Never broken.',
  },
  {
    path: '/m209',
    name: 'M-209',
    subtitle: 'Hagelin Converter M-209-B',
    country: 'United States',
    era: '1943–1945',
    icon: <KeyRound size={32} />,
    color: 'green',
    description: 'Compact mechanical cipher used by the US Army for tactical field communications.',
  },
  {
    path: '/purple',
    name: 'Purple',
    subtitle: 'Type 97 Diplomatic Cipher',
    country: 'Japan',
    era: '1939–1945',
    icon: <Lock size={32} />,
    color: 'purple',
    description: 'Japanese diplomatic cipher machine using stepping switches instead of rotors. Broken by the SIS.',
  },
  {
    path: '/sigaba',
    name: 'SIGABA',
    subtitle: 'ECM Mark II',
    country: 'United States',
    era: '1941–1959',
    icon: <Shield size={32} />,
    color: 'red',
    description: '15-rotor cipher machine. The only major WWII cipher device never broken by an adversary.',
  },
  {
    path: '/fialka',
    name: 'Fialka M-125',
    subtitle: 'Soviet Electromechanical Cipher',
    country: 'Soviet Union',
    era: '1956–1990s',
    icon: <Flower2 size={32} />,
    color: 'rose',
    description: '10-rotor Soviet cipher with reversible rotors, punch card keying, and irregular stepping. Used by all Warsaw Pact nations.',
  },
  {
    path: '/nema',
    name: 'NEMA',
    subtitle: 'NEue MAschine — Swiss Cipher',
    country: 'Switzerland',
    era: '1947–1970s',
    icon: <Plus size={32} />,
    color: 'sky',
    description: '4-rotor Swiss improvement over Enigma. Drive wheel and multiple notches per rotor create highly irregular stepping.',
  },
  {
    path: '/red',
    name: 'RED (Type 91)',
    subtitle: 'Japanese Diplomatic Cipher',
    country: 'Japan',
    era: '1931–1939',
    icon: <Radio size={32} />,
    color: 'red',
    description: 'Japan\'s first cipher machine. Split alphabet into "sixes" and "twenties" using telephone stepping switches. Predecessor to Purple.',
  },
  {
    path: '/hebern',
    name: 'Hebern Electric',
    subtitle: 'First Rotor Cipher Machine',
    country: 'United States',
    era: '1918–1920s',
    icon: <Zap size={32} />,
    color: 'teal',
    description: 'The world\'s first rotor cipher machine. Single-rotor design that pioneered the concept behind Enigma, SIGABA, and all rotor ciphers.',
  },
  {
    path: '/caesar',
    name: 'Caesar Cipher',
    subtitle: 'Shift Cipher — ~50 BC',
    country: 'Rome',
    era: '~50 BC',
    icon: <ArrowRightLeft size={32} />,
    color: 'yellow',
    description: 'The simplest substitution cipher. Shift each letter by a fixed amount. Used by Julius Caesar. Includes brute-force breaker.',
  },
  {
    path: '/vigenere',
    name: 'Vigenere',
    subtitle: 'Le Chiffre Indechiffrable',
    country: 'France',
    era: '1553',
    icon: <BookOpen size={32} />,
    color: 'purple',
    description: 'Polyalphabetic cipher using a keyword. Considered unbreakable for 300 years. Includes Tabula Recta visualization.',
  },
  {
    path: '/playfair',
    name: 'Playfair',
    subtitle: 'Digraph Substitution',
    country: 'Britain',
    era: '1854',
    icon: <Grid3X3 size={32} />,
    color: 'emerald',
    description: 'First practical digraph cipher using a 5x5 grid. Encrypts pairs of letters. Used in the Boer War and WWI.',
  },
  {
    path: '/adfgvx',
    name: 'ADFGVX',
    subtitle: 'WWI German Field Cipher',
    country: 'Germany',
    era: '1918',
    icon: <Hash size={32} />,
    color: 'amber',
    description: 'Combines Polybius square fractionation with columnar transposition. Nearly changed the outcome of WWI.',
  },
  {
    path: '/jefferson',
    name: 'Jefferson Wheel',
    subtitle: 'Multi-Disk Cipher',
    country: 'United States',
    era: '1795',
    icon: <Disc size={32} />,
    color: 'sky',
    description: 'Thomas Jefferson\'s cylinder cipher — 125 years ahead of its time. Reinvented as the US Army M-94 in 1922.',
  },
  {
    path: '/hill',
    name: 'Hill Cipher',
    subtitle: 'Matrix Polygraphic Cipher',
    country: 'United States',
    era: '1929',
    icon: <Grid2X2 size={32} />,
    color: 'purple',
    description: 'First practical polygraphic cipher using matrix multiplication mod 26. Encrypts blocks of letters simultaneously using linear algebra.',
  },
  {
    path: '/otp',
    name: 'One-Time Pad',
    subtitle: 'Theoretically Unbreakable',
    country: 'International',
    era: '1882',
    icon: <ShieldCheck size={32} />,
    color: 'emerald',
    description: 'The only cipher proven to be perfectly secure. Uses a random key as long as the message. Used on the Moscow-Washington hotline.',
  },
  {
    path: '/cx52',
    name: 'CX-52 (Hagelin)',
    subtitle: 'Crypto AG — Operation Rubicon',
    country: 'Switzerland',
    era: '1952',
    icon: <Settings size={32} />,
    color: 'amber',
    description: 'Successor to the M-209. Sold to 60+ countries — secretly owned by the CIA, who backdoored the machines for decades in Operation Rubicon.',
  },
  {
    path: '/kl7',
    name: 'KL-7 (ADONIS)',
    subtitle: 'NATO Cipher Machine',
    country: 'NATO',
    era: '1952–1983',
    icon: <Layers size={32} />,
    color: 'blue',
    description: 'NATO\'s primary cipher machine for 30 years. 8 rotors from a set of 12 with irregular notch-driven stepping. Compromised by the Walker spy ring.',
  },
  {
    path: '/chaocipher',
    name: 'Chaocipher',
    subtitle: 'Mutating Alphabet Cipher',
    country: 'United States',
    era: '1918',
    icon: <Shuffle size={32} />,
    color: 'red',
    description: 'Two dynamically mutating alphabets that change after every letter. Algorithm kept secret until 2010. Never adopted, never broken.',
  },
];

const colorMap: Record<string, { card: string; icon: string; badge: string; glow: string }> = {
  yellow: {
    card: 'hover:border-yellow-700/60',
    icon: 'text-yellow-400 bg-yellow-950/50 border-yellow-800/50',
    badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-700/50',
    glow: 'group-hover:shadow-yellow-900/30',
  },
  amber: {
    card: 'hover:border-amber-700/60',
    icon: 'text-amber-400 bg-amber-950/50 border-amber-800/50',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-700/50',
    glow: 'group-hover:shadow-amber-900/30',
  },
  blue: {
    card: 'hover:border-blue-700/60',
    icon: 'text-blue-400 bg-blue-950/50 border-blue-800/50',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-700/50',
    glow: 'group-hover:shadow-blue-900/30',
  },
  emerald: {
    card: 'hover:border-emerald-700/60',
    icon: 'text-emerald-400 bg-emerald-950/50 border-emerald-800/50',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-700/50',
    glow: 'group-hover:shadow-emerald-900/30',
  },
  green: {
    card: 'hover:border-green-700/60',
    icon: 'text-green-400 bg-green-950/50 border-green-800/50',
    badge: 'bg-green-500/20 text-green-300 border-green-700/50',
    glow: 'group-hover:shadow-green-900/30',
  },
  purple: {
    card: 'hover:border-purple-700/60',
    icon: 'text-purple-400 bg-purple-950/50 border-purple-800/50',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-700/50',
    glow: 'group-hover:shadow-purple-900/30',
  },
  red: {
    card: 'hover:border-red-700/60',
    icon: 'text-red-400 bg-red-950/50 border-red-800/50',
    badge: 'bg-red-500/20 text-red-300 border-red-700/50',
    glow: 'group-hover:shadow-red-900/30',
  },
  teal: {
    card: 'hover:border-teal-700/60',
    icon: 'text-teal-400 bg-teal-950/50 border-teal-800/50',
    badge: 'bg-teal-500/20 text-teal-300 border-teal-700/50',
    glow: 'group-hover:shadow-teal-900/30',
  },
  sky: {
    card: 'hover:border-sky-700/60',
    icon: 'text-sky-400 bg-sky-950/50 border-sky-800/50',
    badge: 'bg-sky-500/20 text-sky-300 border-sky-700/50',
    glow: 'group-hover:shadow-sky-900/30',
  },
  rose: {
    card: 'hover:border-rose-700/60',
    icon: 'text-rose-400 bg-rose-950/50 border-rose-800/50',
    badge: 'bg-rose-500/20 text-rose-300 border-rose-700/50',
    glow: 'group-hover:shadow-rose-900/30',
  },
  crimson: {
    card: 'hover:border-red-600/60',
    icon: 'text-red-400 bg-red-950/60 border-red-700/50',
    badge: 'bg-red-500/20 text-red-300 border-red-600/50',
    glow: 'group-hover:shadow-red-800/40',
  },
};

const cryptanalysisTools = [
  {
    path: '/frequency-analysis',
    name: 'Frequency Analysis',
    subtitle: 'Statistical Codebreaking',
    country: 'Arabia',
    era: '~850 AD',
    icon: <BarChart3 size={32} />,
    color: 'crimson',
    description: 'The first known cryptanalysis technique. Letter frequency, bigrams, trigrams, and Index of Coincidence. Pioneered by Al-Kindi.',
  },
  {
    path: '/vigenere-breaker',
    name: 'Vigenère Breaker',
    subtitle: 'Kasiski + Index of Coincidence',
    country: 'Britain / Prussia',
    era: '1863',
    icon: <KeySquare size={32} />,
    color: 'crimson',
    description: 'Break the "unbreakable cipher" step by step. Kasiski examination finds the key length, then frequency analysis recovers each key letter.',
  },
  {
    path: '/bombe',
    name: 'Bombe',
    subtitle: 'Turing\'s Enigma Breaker',
    country: 'Britain',
    era: '1940',
    icon: <CircuitBoard size={32} />,
    color: 'crimson',
    description: 'Alan Turing\'s electromechanical machine that broke Enigma by testing rotor positions against known-plaintext cribs. The tool that won the Battle of the Atlantic.',
  },
  {
    path: '/colossus',
    name: 'Colossus',
    subtitle: 'First Electronic Computer',
    country: 'Britain',
    era: '1944',
    icon: <Binary size={32} />,
    color: 'crimson',
    description: 'Tommy Flowers\' electronic marvel that broke the Lorenz cipher by statistical analysis. The world\'s first programmable electronic computer, kept secret for 30 years.',
  },
];

const Hub: React.FC = () => {
  return (
    <div className="w-full flex-1 flex flex-col items-center px-8 sm:px-16 pt-24 pb-20">
      {/* Header */}
      <div className="text-center mb-20">
        <h1 className="text-5xl sm:text-6xl font-black tracking-tight text-white mb-6">
          CIPHER <span className="text-amber-500">MUSEUM</span>
        </h1>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed mt-4">
          Interactive simulations of history's most significant ciphers — from ancient Rome to the Cold War.
          Explore the mechanics of encryption that shaped the course of history.
        </p>
      </div>

      {/* Machine Cards */}
      <div className="w-full max-w-6xl grid gap-10 md:grid-cols-2 lg:grid-cols-3">
        {machines.map(m => {
          const c = colorMap[m.color];
          return (
            <Link
              key={m.path}
              to={m.path}
              className={`group block bg-slate-900/70 border border-slate-800 rounded-2xl p-12 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${c.card} ${c.glow}`}
            >
              {/* Icon + Country */}
              <div className="flex items-start justify-between mb-6">
                <div className={`w-14 h-14 rounded-xl border flex items-center justify-center ${c.icon}`}>
                  {m.icon}
                </div>
                <div className="flex gap-2">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${c.badge}`}>
                    {m.country}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full border bg-slate-800/50 text-slate-400 border-slate-700/50">
                    {m.era}
                  </span>
                </div>
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-amber-200 transition-colors">
                {m.name}
              </h2>
              <p className="text-xs font-mono text-slate-500 mb-5 uppercase tracking-wider">
                {m.subtitle}
              </p>

              {/* Description */}
              <p className="text-sm text-slate-400 leading-relaxed">
                {m.description}
              </p>

              {/* Launch hint */}
              <div className="mt-8 text-xs font-semibold text-slate-600 group-hover:text-slate-400 transition-colors">
                LAUNCH SIMULATOR &rarr;
              </div>
            </Link>
          );
        })}
      </div>

      {/* Cryptanalysis Section */}
      <div className="w-full max-w-6xl mt-28">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-4">
            CRYPTANALYSIS <span className="text-red-500">TOOLS</span>
          </h2>
          <p className="text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
            The codebreaker's workbench — statistical analysis, automated attacks, and the legendary machines that cracked the "unbreakable."
          </p>
        </div>

        <div className="grid gap-10 md:grid-cols-2">
          {cryptanalysisTools.map(m => {
            const c = colorMap[m.color];
            return (
              <Link
                key={m.path}
                to={m.path}
                className={`group block bg-slate-900/70 border border-slate-800 rounded-2xl p-12 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${c.card} ${c.glow}`}
              >
                <div className="flex items-start justify-between mb-6">
                  <div className={`w-14 h-14 rounded-xl border flex items-center justify-center ${c.icon}`}>
                    {m.icon}
                  </div>
                  <div className="flex gap-2">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${c.badge}`}>
                      {m.country}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full border bg-slate-800/50 text-slate-400 border-slate-700/50">
                      {m.era}
                    </span>
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-red-300 transition-colors">
                  {m.name}
                </h2>
                <p className="text-xs font-mono text-slate-500 mb-5 uppercase tracking-wider">
                  {m.subtitle}
                </p>

                <p className="text-sm text-slate-400 leading-relaxed">
                  {m.description}
                </p>

                <div className="mt-8 text-xs font-semibold text-slate-600 group-hover:text-slate-400 transition-colors">
                  LAUNCH TOOL &rarr;
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-20 text-center text-xs text-slate-600 w-full max-w-6xl">
        <p>Educational cipher machine simulations for classroom use.</p>
      </div>
    </div>
  );
};

export default Hub;
