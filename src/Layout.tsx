import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, ChevronRight } from 'lucide-react';

const SIMULATORS = [
  { path: '/enigma-m4', label: 'Enigma M4' },
  { path: '/lorenz-sz42', label: 'Lorenz SZ42' },
  { path: '/m209', label: 'M-209' },
  { path: '/purple', label: 'Purple' },
  { path: '/sigaba', label: 'SIGABA' },
];

const Layout: React.FC = () => {
  const location = useLocation();
  const isHub = location.pathname === '/';
  const current = SIMULATORS.find(s => s.path === location.pathname);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col">
      {/* Top Navigation */}
      <nav className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
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

          {!isHub && (
            <div className="ml-auto hidden md:flex gap-1">
              {SIMULATORS.map(s => (
                <Link
                  key={s.path}
                  to={s.path}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    s.path === location.pathname
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {s.label}
                </Link>
              ))}
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
