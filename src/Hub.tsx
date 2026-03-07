import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, KeyRound, Cog, Cpu, Crown } from 'lucide-react';

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
];

const colorMap: Record<string, { card: string; icon: string; badge: string; glow: string }> = {
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
};

const Hub: React.FC = () => {
  return (
    <div className="w-full flex-1 flex flex-col items-center px-8 sm:px-16 pt-24 pb-20">
      {/* Header */}
      <div className="text-center mb-20">
        <h1 className="text-5xl sm:text-6xl font-black tracking-tight text-white mb-6">
          CIPHER <span className="text-amber-500">MUSEUM</span>
        </h1>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed mt-4">
          Interactive simulations of the most significant cipher machines of World War II.
          Explore the mechanics of encryption that shaped the course of history.
        </p>
      </div>

      {/* Machine Cards */}
      <div className="w-full max-w-5xl grid gap-8 md:grid-cols-2 lg:grid-cols-3">
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

      {/* Footer */}
      <div className="mt-20 text-center text-xs text-slate-600 w-full max-w-5xl">
        <p>Educational cipher machine simulations for classroom use.</p>
      </div>
    </div>
  );
};

export default Hub;
