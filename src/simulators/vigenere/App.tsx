import React, { useState } from 'react';
import { Info } from 'lucide-react';
import ExhibitPanel from '../../components/ExhibitPanel';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function vigenereProcess(text: string, key: string, decrypt: boolean): string {
  if (!key) return text;
  const k = key.toUpperCase().replace(/[^A-Z]/g, '');
  if (!k) return text;

  let ki = 0;
  return text.toUpperCase().split('').map(c => {
    const i = ALPHABET.indexOf(c);
    if (i === -1) return c;
    const shift = ALPHABET.indexOf(k[ki % k.length]);
    ki++;
    return ALPHABET[(i + (decrypt ? 26 - shift : shift)) % 26];
  }).join('');
}

function App() {
  const [key, setKey] = useState('LEMON');
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [showInfo, setShowInfo] = useState(false);
  const [showTabula, setShowTabula] = useState(false);

  const output = vigenereProcess(input, key, mode === 'decrypt');

  return (
    <div className="flex-1 bg-[#12161a] flex flex-col">
      <ExhibitPanel id="vigenere" />
      <div className="bg-[#12161a] flex flex-col items-center justify-start py-10 px-6 text-slate-200">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl sm:text-4xl font-typewriter font-bold text-slate-100 tracking-tighter">
              VIGEN&Egrave;RE <span className="text-violet-400">CIPHER</span>
            </h1>
            <span className="text-slate-500 text-xs tracking-[0.3em] font-mono">POLYALPHABETIC — 16TH CENTURY</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowTabula(!showTabula)}
              className={`px-3 py-2 rounded-lg font-bold text-xs border transition-all ${
                showTabula ? 'bg-violet-900/50 border-violet-700 text-violet-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >Tabula</button>
            <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 border border-slate-700">
              <Info size={20} />
            </button>
          </div>
        </div>

        {/* Key Input */}
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 mb-8">
          <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">Keyword</label>
          <input
            value={key}
            onChange={e => setKey(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 font-mono text-2xl tracking-[0.5em] text-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500/50 text-center"
            placeholder="KEYWORD"
            spellCheck={false}
          />
          {key && input && (
            <div className="mt-4 font-mono text-sm tracking-[0.3em] text-center">
              <div className="text-slate-500">
                {input.toUpperCase().split('').map((c, i) => {
                  if (ALPHABET.indexOf(c) === -1) return c;
                  const ki = input.toUpperCase().slice(0, i + 1).replace(/[^A-Z]/g, '').length - 1;
                  return key[ki % key.length];
                }).join('')}
              </div>
            </div>
          )}
        </div>

        {/* Mode */}
        <div className="flex justify-center gap-2 mb-6">
          <button onClick={() => setMode('encrypt')} className={`px-6 py-2 rounded-lg font-bold text-sm border transition-colors ${mode === 'encrypt' ? 'bg-violet-900/50 border-violet-700 text-violet-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>ENCRYPT</button>
          <button onClick={() => setMode('decrypt')} className={`px-6 py-2 rounded-lg font-bold text-sm border transition-colors ${mode === 'decrypt' ? 'bg-violet-900/50 border-violet-700 text-violet-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>DECRYPT</button>
        </div>

        {/* I/O */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">{mode === 'encrypt' ? 'Plaintext' : 'Ciphertext'}</label>
            <textarea value={input} onChange={e => setInput(e.target.value.toUpperCase())} placeholder="TYPE YOUR MESSAGE..." className="w-full h-40 bg-slate-900 border border-slate-700 rounded-xl p-4 font-mono text-lg tracking-wider focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none text-slate-200 placeholder-slate-700" spellCheck={false} />
          </div>
          <div>
            <label className="block text-xs text-violet-400 font-bold uppercase tracking-wider mb-2">{mode === 'encrypt' ? 'Ciphertext' : 'Plaintext'}</label>
            <div className="w-full h-40 bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 font-mono text-lg tracking-wider text-violet-200 overflow-y-auto break-all">
              {output || <span className="text-slate-700">...</span>}
            </div>
          </div>
        </div>

        {/* Tabula Recta */}
        {showTabula && (
          <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-4 overflow-x-auto">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">Tabula Recta</div>
            <div className="inline-block">
              <div className="flex gap-px mb-px">
                <div className="w-6 h-6"></div>
                {ALPHABET.split('').map(c => (
                  <div key={c} className="w-6 h-6 flex items-center justify-center text-[9px] font-mono font-bold text-violet-400">{c}</div>
                ))}
              </div>
              {ALPHABET.split('').map((rowChar, ri) => (
                <div key={rowChar} className="flex gap-px">
                  <div className="w-6 h-6 flex items-center justify-center text-[9px] font-mono font-bold text-violet-400">{rowChar}</div>
                  {ALPHABET.split('').map((_, ci) => {
                    const c = ALPHABET[(ri + ci) % 26];
                    const isKeyRow = key && key.includes(rowChar);
                    return (
                      <div key={ci} className={`w-6 h-6 flex items-center justify-center text-[8px] font-mono ${isKeyRow ? 'bg-violet-950/40 text-violet-300' : 'bg-slate-800/30 text-slate-600'}`}>
                        {c}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className={`fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-700 p-6 transform transition-transform duration-300 z-40 ${showInfo ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="max-w-3xl mx-auto relative">
          <button onClick={() => setShowInfo(false)} className="absolute top-0 right-0 p-2 text-slate-500 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <h3 className="text-xl font-bold text-violet-400 mb-2">About the Vigen&egrave;re Cipher</h3>
          <p className="text-sm text-slate-300 leading-relaxed">
            First described by <strong>Giovan Battista Bellaso</strong> in 1553 and later misattributed to Blaise de Vigen&egrave;re.
            Called <strong>"le chiffre ind&eacute;chiffrable"</strong> (the indecipherable cipher) for 300 years.
            Each letter of the keyword specifies a different Caesar shift — making it polyalphabetic.
            Finally broken by <strong>Charles Babbage</strong> and <strong>Friedrich Kasiski</strong> in the 1860s
            using repeating pattern analysis. The <strong>Tabula Recta</strong> above shows all 26 shifted alphabets.
          </p>
        </div>
      </div>
    </div>
    </div>
  );
}

export default App;
