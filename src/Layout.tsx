import React, { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, ChevronRight, ChevronDown, Cog, Cpu, KeyRound, Lock, Shield, Crown, Flower2, Plus, Radio, Zap, ArrowRightLeft, BookOpen, Grid3X3, Hash, Disc, Grid2X2, ShieldCheck } from 'lucide-react';

const SIMULATORS = [
  { path: '/enigma-i', label: 'Enigma I', country: 'Germany', icon: <Cog size={14} /> },
  { path: '/enigma-m4', label: 'Enigma M4', country: 'Germany', icon: <Cog size={14} /> },
  { path: '/lorenz-sz42', label: 'Lorenz SZ42', country: 'Germany', icon: <Cpu size={14} /> },
  { path: '/typex', label: 'Typex', country: 'Britain', icon: <Crown size={14} /> },
  { path: '/m209', label: 'M-209', country: 'United States', icon: <KeyRound size={14} /> },
  { path: '/purple', label: 'Purple', country: 'Japan', icon: <Lock size={14} /> },
  { path: '/sigaba', label: 'SIGABA', country: 'United States', icon: <Shield size={14} /> },
  { path: '/fialka', label: 'Fialka M-125', country: 'Soviet Union', icon: <Flower2 size={14} /> },
  { path: '/nema', label: 'NEMA', country: 'Switzerland', icon: <Plus size={14} /> },
  { path: '/red', label: 'RED (Type 91)', country: 'Japan', icon: <Radio size={14} /> },
  { path: '/hebern', label: 'Hebern Electric', country: 'United States', icon: <Zap size={14} /> },
  { path: '/caesar', label: 'Caesar Cipher', country: 'Rome', icon: <ArrowRightLeft size={14} /> },
  { path: '/vigenere', label: 'Vigenere', country: 'France', icon: <BookOpen size={14} /> },
  { path: '/playfair', label: 'Playfair', country: 'Britain', icon: <Grid3X3 size={14} /> },
  { path: '/adfgvx', label: 'ADFGVX', country: 'Germany', icon: <Hash size={14} /> },
  { path: '/jefferson', label: 'Jefferson Wheel', country: 'United States', icon: <Disc size={14} /> },
  { path: '/hill', label: 'Hill Cipher', country: 'United States', icon: <Grid2X2 size={14} /> },
  { path: '/otp', label: 'One-Time Pad', country: 'International', icon: <ShieldCheck size={14} /> },
];

const Layout: React.FC = () => {
  const location = useLocation();
  const isHub = location.pathname === '/';
  const current = SIMULATORS.find(s => s.path === location.pathname);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Close dropdown on navigation
  useEffect(() => {
    setDropdownOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col">
      {/* Top Navigation */}
      <nav className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 h-14 flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
          >
            <Home size={18} />
            <span className="font-bold text-sm tracking-wide">CIPHER MUSEUM</span>
          </Link>

          {current && (
            <>
              <ChevronRight size={14} className="text-slate-600" />
              <span className="text-sm font-medium text-amber-400">{current.label}</span>
            </>
          )}

          {/* Simulator Dropdown */}
          {!isHub && (
            <div className="ml-auto relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors border border-slate-800"
              >
                Switch Machine
                <ChevronDown size={14} className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
                  {SIMULATORS.map(s => (
                    <Link
                      key={s.path}
                      to={s.path}
                      className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                        s.path === location.pathname
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <span className="text-slate-500">{s.icon}</span>
                      <div className="flex flex-col">
                        <span className="font-medium">{s.label}</span>
                        <span className="text-[10px] text-slate-500">{s.country}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Page Content */}
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
