import React, { useState, useRef, useEffect, Suspense } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, ChevronRight, ChevronDown, Cog, Cpu, KeyRound, Lock, Shield, Crown, Flower2, Plus, Radio, Zap, ArrowRightLeft, BookOpen, Grid3X3, Hash, Disc, Grid2X2, ShieldCheck, Settings, Layers, Shuffle, BarChart3, KeySquare, CircuitBoard, Binary, Waves, Box, Grid3x3 as Grid3x3Icon, Droplets, Wind, GitBranch, Key, UserCheck, Circle, SlidersHorizontal, Route, Activity, Fingerprint, Dice6, Fence, Columns3, Hexagon, Cylinder, FileScan, Table2, SearchCode, Scissors, CircleDot, Snowflake, FunctionSquare, Infinity, Split, Boxes, Equal, Flame, Stamp, Blocks, PenLine, LockKeyhole } from 'lucide-react';

const SIMULATORS = [
  { path: '/enigma-i', label: 'Enigma I', country: 'Germany', icon: <Cog size={14} /> },
  { path: '/enigma-m4', label: 'Enigma M4', country: 'Germany', icon: <Cog size={14} /> },
  { path: '/enigma-wiring', label: 'Enigma M4 Wiring Explorer', country: 'Educational', icon: <Route size={14} /> },
  { path: '/enigma-i-wiring', label: 'Enigma I Wiring Explorer', country: 'Educational', icon: <Route size={14} /> },
  { path: '/lorenz-sz42', label: 'Lorenz SZ42', country: 'Germany', icon: <Cpu size={14} /> },
  { path: '/lorenz-wiring', label: 'Lorenz Visualizer', country: 'Educational', icon: <Route size={14} /> },
  { path: '/typex', label: 'Typex', country: 'Britain', icon: <Crown size={14} /> },
  { path: '/typex-wiring', label: 'Typex Wiring Explorer', country: 'Educational', icon: <Route size={14} /> },
  { path: '/nema-wiring', label: 'NEMA Wiring Explorer', country: 'Educational', icon: <Route size={14} /> },
  { path: '/m209', label: 'M-209', country: 'United States', icon: <KeyRound size={14} /> },
  { path: '/purple', label: 'Purple', country: 'Japan', icon: <Lock size={14} /> },
  { path: '/purple-wiring', label: 'Purple Wiring Explorer', country: 'Educational', icon: <Route size={14} /> },
  { path: '/sigaba', label: 'SIGABA', country: 'United States', icon: <Shield size={14} /> },
  { path: '/fialka', label: 'Fialka M-125', country: 'Soviet Union', icon: <Flower2 size={14} /> },
  { path: '/fialka-wiring', label: 'Fialka Wiring Explorer', country: 'Educational', icon: <Route size={14} /> },
  { path: '/nema', label: 'NEMA', country: 'Switzerland', icon: <Plus size={14} /> },
  { path: '/red', label: 'RED (Type 91)', country: 'Japan', icon: <Radio size={14} /> },
  { path: '/red-wiring', label: 'RED Wiring Explorer', country: 'Educational', icon: <Route size={14} /> },
  { path: '/hebern', label: 'Hebern Electric', country: 'United States', icon: <Zap size={14} /> },
  { path: '/hebern-wiring', label: 'Hebern Wiring Explorer', country: 'Educational', icon: <Route size={14} /> },
  { path: '/caesar', label: 'Caesar Cipher', country: 'Rome', icon: <ArrowRightLeft size={14} /> },
  { path: '/vigenere', label: 'Vigenere', country: 'France', icon: <BookOpen size={14} /> },
  { path: '/playfair', label: 'Playfair', country: 'Britain', icon: <Grid3X3 size={14} /> },
  { path: '/adfgvx', label: 'ADFGVX', country: 'Germany', icon: <Hash size={14} /> },
  { path: '/jefferson', label: 'Jefferson Wheel', country: 'United States', icon: <Disc size={14} /> },
  { path: '/hill', label: 'Hill Cipher', country: 'United States', icon: <Grid2X2 size={14} /> },
  { path: '/otp', label: 'One-Time Pad', country: 'International', icon: <ShieldCheck size={14} /> },
  { path: '/cx52', label: 'CX-52 (Hagelin)', country: 'Switzerland', icon: <Settings size={14} /> },
  { path: '/kl7', label: 'KL-7 (ADONIS)', country: 'NATO', icon: <Layers size={14} /> },
  { path: '/kl7-wiring', label: 'KL-7 Wiring Explorer', country: 'Educational', icon: <Route size={14} /> },
  { path: '/sigaba-wiring', label: 'SIGABA Wiring Explorer', country: 'Educational', icon: <Route size={14} /> },
  { path: '/chaocipher', label: 'Chaocipher', country: 'United States', icon: <Shuffle size={14} /> },
  { path: '/morse', label: 'Morse Code', country: 'International', icon: <Activity size={14} /> },
  { path: '/pollux', label: 'Pollux Cipher', country: 'France', icon: <Fingerprint size={14} /> },
  { path: '/rail-fence', label: 'Rail Fence', country: 'Ancient', icon: <Fence size={14} /> },
  { path: '/columnar', label: 'Columnar Transposition', country: 'International', icon: <Columns3 size={14} /> },
  { path: '/pigpen', label: 'Pigpen Cipher', country: 'International', icon: <Hexagon size={14} /> },
  { path: '/scytale', label: 'Scytale', country: 'Sparta', icon: <Cylinder size={14} /> },
  { path: '/polybius', label: 'Polybius Square', country: 'Greece', icon: <Table2 size={14} /> },
  { path: '/pringles-enigma', label: 'Pringles Can Enigma', country: 'Educational', icon: <Scissors size={14} /> },
  { path: '/alberti', label: 'Alberti Cipher Disk', country: 'Italy', icon: <CircleDot size={14} /> },
  { path: '/vic-cipher', label: 'VIC Cipher', country: 'Soviet Union', icon: <Snowflake size={14} /> },
  { path: '/affine', label: 'Affine Cipher', country: 'International', icon: <FunctionSquare size={14} /> },
  { path: '/autokey', label: 'Autokey Cipher', country: 'France', icon: <Infinity size={14} /> },
  { path: '/bifid', label: 'Bifid Cipher', country: 'France', icon: <Split size={14} /> },
  { path: '/trifid', label: 'Trifid Cipher', country: 'France', icon: <Boxes size={14} /> },
];

const CRYPTANALYSIS = [
  { path: '/frequency-analysis', label: 'Frequency Analysis', country: 'Cryptanalysis', icon: <BarChart3 size={14} /> },
  { path: '/vigenere-breaker', label: 'Vigenère Breaker', country: 'Cryptanalysis', icon: <KeySquare size={14} /> },
  { path: '/bombe', label: 'Bombe', country: 'Cryptanalysis', icon: <CircuitBoard size={14} /> },
  { path: '/colossus', label: 'Colossus', country: 'Cryptanalysis', icon: <Binary size={14} /> },
  { path: '/vigenere-workshop', label: 'Vigenère Workshop', country: 'Cryptanalysis', icon: <SlidersHorizontal size={14} /> },
  { path: '/substitution-solver', label: 'Substitution Solver', country: 'Cryptanalysis', icon: <SearchCode size={14} /> },
  { path: '/ioc', label: 'Index of Coincidence', country: 'Cryptanalysis', icon: <Equal size={14} /> },
];

const MODERN_CRYPTO = [
  { path: '/lfsr', label: 'LFSR', country: 'Modern Crypto', icon: <Waves size={14} /> },
  { path: '/des', label: 'DES', country: 'Modern Crypto', icon: <Box size={14} /> },
  { path: '/aes', label: 'AES', country: 'Modern Crypto', icon: <Grid3x3Icon size={14} /> },
  { path: '/salsa20', label: 'Salsa20', country: 'Modern Crypto', icon: <Droplets size={14} /> },
  { path: '/chacha20', label: 'ChaCha20', country: 'Modern Crypto', icon: <Wind size={14} /> },
  { path: '/trivium', label: 'Trivium', country: 'Modern Crypto', icon: <GitBranch size={14} /> },
  { path: '/fortuna', label: 'Fortuna CSPRNG', country: 'Modern Crypto', icon: <Dice6 size={14} /> },
  { path: '/sha256', label: 'SHA-256', country: 'Modern Crypto', icon: <FileScan size={14} /> },
  { path: '/rc4', label: 'RC4', country: 'Modern Crypto', icon: <Flame size={14} /> },
  { path: '/hmac', label: 'HMAC-SHA256', country: 'Modern Crypto', icon: <Stamp size={14} /> },
  { path: '/block-modes', label: 'Block Cipher Modes', country: 'Modern Crypto', icon: <Blocks size={14} /> },
  { path: '/digital-signature', label: 'Digital Signatures', country: 'Public Key', icon: <PenLine size={14} /> },
  { path: '/password-hashing', label: 'Password Hashing', country: 'Modern Crypto', icon: <LockKeyhole size={14} /> },
  { path: '/aes-round', label: 'AES Round Visualizer', country: 'Modern Crypto', icon: <Layers size={14} /> },
  { path: '/sha256-round', label: 'SHA-256 Round Visualizer', country: 'Modern Crypto', icon: <Hash size={14} /> },
  { path: '/sbox',        label: 'S-Box Visualizer',         country: 'Modern Crypto', icon: <Table2 size={14} /> },
  { path: '/gf28',        label: 'GF(2⁸) Arithmetic',        country: 'Modern Crypto', icon: <Binary size={14} /> },
];

const PUBLIC_KEY = [
  { path: '/diffie-hellman', label: 'Diffie-Hellman', country: 'Public Key', icon: <GitBranch size={14} /> },
  { path: '/rsa', label: 'RSA', country: 'Public Key', icon: <Key size={14} /> },
  { path: '/elgamal', label: 'ElGamal', country: 'Public Key', icon: <UserCheck size={14} /> },
  { path: '/ecc', label: 'Elliptic Curve', country: 'Public Key', icon: <Circle size={14} /> },
];

const ALL_ITEMS = [...SIMULATORS, ...CRYPTANALYSIS, ...MODERN_CRYPTO, ...PUBLIC_KEY];

const Layout: React.FC = () => {
  const location = useLocation();
  const isHub = location.pathname === '/';
  const current = ALL_ITEMS.find(s => s.path === location.pathname);
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
              <span className={`text-sm font-medium ${CRYPTANALYSIS.some(c => c.path === current.path) ? 'text-red-400' : MODERN_CRYPTO.some(c => c.path === current.path) ? 'text-cyan-400' : PUBLIC_KEY.some(c => c.path === current.path) ? 'text-violet-400' : 'text-amber-400'}`}>{current.label}</span>
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
                <div className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-[70vh] overflow-y-auto">
                  <div className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800">Cipher Machines</div>
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
                  <div className="px-4 py-2 text-[10px] font-bold text-red-400 uppercase tracking-wider border-b border-t border-slate-800">Cryptanalysis Tools</div>
                  {CRYPTANALYSIS.map(s => (
                    <Link
                      key={s.path}
                      to={s.path}
                      className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                        s.path === location.pathname
                          ? 'bg-red-500/10 text-red-400'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <span className="text-red-500/70">{s.icon}</span>
                      <div className="flex flex-col">
                        <span className="font-medium">{s.label}</span>
                        <span className="text-[10px] text-slate-500">{s.country}</span>
                      </div>
                    </Link>
                  ))}
                  <div className="px-4 py-2 text-[10px] font-bold text-cyan-400 uppercase tracking-wider border-b border-t border-slate-800">Modern Cryptography</div>
                  {MODERN_CRYPTO.map(s => (
                    <Link
                      key={s.path}
                      to={s.path}
                      className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                        s.path === location.pathname
                          ? 'bg-cyan-500/10 text-cyan-400'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <span className="text-cyan-500/70">{s.icon}</span>
                      <div className="flex flex-col">
                        <span className="font-medium">{s.label}</span>
                        <span className="text-[10px] text-slate-500">{s.country}</span>
                      </div>
                    </Link>
                  ))}
                  <div className="px-4 py-2 text-[10px] font-bold text-violet-400 uppercase tracking-wider border-b border-t border-slate-800">Public Key Cryptography</div>
                  {PUBLIC_KEY.map(s => (
                    <Link
                      key={s.path}
                      to={s.path}
                      className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                        s.path === location.pathname
                          ? 'bg-violet-500/10 text-violet-400'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <span className="text-violet-500/70">{s.icon}</span>
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
        <Suspense fallback={
          <div className="flex-1 flex items-center justify-center bg-[#0d1117]">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-slate-600 text-xs font-mono tracking-widest">LOADING</p>
            </div>
          </div>
        }>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
};

export default Layout;
