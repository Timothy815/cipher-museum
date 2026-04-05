import React, { useState, useMemo } from 'react';
import { Info, RotateCcw } from 'lucide-react';
import ExhibitPanel from '../../components/ExhibitPanel';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function autokeyEncrypt(text: string, keyword: string): { output: string; keyStream: string } {
  const k = keyword.toUpperCase().replace(/[^A-Z]/g, '');
  if (!k) return { output: text, keyStream: '' };

  const plain = text.toUpperCase().split('').filter(c => ALPHABET.includes(c));
  const keyStream: string[] = [];
  const result: string[] = [];

  for (let i = 0; i < plain.length; i++) {
    const keyChar = i < k.length ? k[i] : plain[i - k.length];
    keyStream.push(keyChar);
    const shift = ALPHABET.indexOf(keyChar);
    const pi = ALPHABET.indexOf(plain[i]);
    result.push(ALPHABET[(pi + shift) % 26]);
  }

  return { output: result.join(''), keyStream: keyStream.join('') };
}

function autokeyDecrypt(text: string, keyword: string): { output: string; keyStream: string } {
  const k = keyword.toUpperCase().replace(/[^A-Z]/g, '');
  if (!k) return { output: text, keyStream: '' };

  const cipher = text.toUpperCase().split('').filter(c => ALPHABET.includes(c));
  const keyStream: string[] = [];
  const result: string[] = [];

  for (let i = 0; i < cipher.length; i++) {
    const keyChar = i < k.length ? k[i] : result[i - k.length];
    keyStream.push(keyChar);
    const shift = ALPHABET.indexOf(keyChar);
    const ci = ALPHABET.indexOf(cipher[i]);
    result.push(ALPHABET[(ci - shift + 26) % 26]);
  }

  return { output: result.join(''), keyStream: keyStream.join('') };
}

function App() {
  const [keyword, setKeyword] = useState('LEMON');
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [showInfo, setShowInfo] = useState(false);
  const [showTabula, setShowTabula] = useState(false);

  const { output, keyStream } = useMemo(() => {
    if (!input || !keyword) return { output: '', keyStream: '' };
    return mode === 'encrypt' ? autokeyEncrypt(input, keyword) : autokeyDecrypt(input, keyword);
  }, [input, keyword, mode]);

  const plainLetters = input.toUpperCase().split('').filter(c => ALPHABET.includes(c));

  // Vigenère comparison
  const vigenereOutput = useMemo(() => {
    if (!input || !keyword) return '';
    const k = keyword.toUpperCase().replace(/[^A-Z]/g, '');
    if (!k) return '';
    const plain = input.toUpperCase().split('').filter(c => ALPHABET.includes(c));
    return plain.map((c, i) => {
      const shift = ALPHABET.indexOf(k[i % k.length]);
      const pi = ALPHABET.indexOf(c);
      if (mode === 'encrypt') return ALPHABET[(pi + shift) % 26];
      return ALPHABET[(pi - shift + 26) % 26];
    }).join('');
  }, [input, keyword, mode]);

  return (
    <div className="flex-1 bg-[#12161a] flex flex-col">
      <ExhibitPanel id="autokey" />
      <div className="bg-[#12161a] flex flex-col items-center justify-start py-10 px-6 text-slate-200">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl sm:text-4xl font-typewriter font-bold text-slate-100 tracking-tighter">
              AUTOKEY <span className="text-emerald-400">CIPHER</span>
            </h1>
            <span className="text-slate-500 text-xs tracking-[0.3em] font-mono">SELF-KEYING VIGEN&Egrave;RE — 1553</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowTabula(!showTabula)}
              className={`px-3 py-2 rounded-lg font-bold text-xs border transition-all ${
                showTabula ? 'bg-emerald-900/50 border-emerald-700 text-emerald-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >Tabula</button>
            <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 border border-slate-700">
              <Info size={20} />
            </button>
            <button onClick={() => { setInput(''); }} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 border border-slate-700">
              <RotateCcw size={20} />
            </button>
          </div>
        </div>

        {/* Keyword */}
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 mb-8">
          <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">Keyword (Primer)</label>
          <input
            value={keyword}
            onChange={e => setKeyword(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 font-mono text-2xl tracking-[0.5em] text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-center"
            placeholder="KEYWORD"
            spellCheck={false}
          />
          <div className="text-[10px] text-slate-600 text-center mt-2 font-mono">
            Primer length: {keyword.replace(/[^A-Z]/gi, '').length} letters — after these, the plaintext becomes the key
          </div>
        </div>

        {/* Key stream visualization */}
        {input && keyStream && (
          <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-5 mb-6 overflow-x-auto">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">
              Key Stream Construction
            </div>
            <div className="space-y-2 font-mono text-xs">
              {/* Plaintext row */}
              <div className="flex items-center gap-0.5">
                <span className="text-slate-600 w-20 shrink-0 text-right pr-2">{mode === 'encrypt' ? 'Plain:' : 'Cipher:'}</span>
                {plainLetters.slice(0, 32).map((ch, i) => (
                  <div key={i} className="w-7 h-7 flex items-center justify-center rounded bg-slate-800/60 text-slate-300">
                    {ch}
                  </div>
                ))}
              </div>
              {/* Key stream row */}
              <div className="flex items-center gap-0.5">
                <span className="text-slate-600 w-20 shrink-0 text-right pr-2">Key:</span>
                {keyStream.split('').slice(0, 32).map((ch, i) => {
                  const kLen = keyword.replace(/[^A-Z]/gi, '').length;
                  const isKeyword = i < kLen;
                  return (
                    <div key={i} className={`w-7 h-7 flex items-center justify-center rounded font-bold ${
                      isKeyword
                        ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-800/60'
                        : 'bg-amber-900/30 text-amber-400 border border-amber-800/40'
                    }`}>
                      {ch}
                    </div>
                  );
                })}
              </div>
              {/* Arrow row */}
              <div className="flex items-center gap-0.5">
                <span className="w-20 shrink-0" />
                {keyStream.split('').slice(0, 32).map((_, i) => (
                  <div key={i} className="w-7 h-4 flex items-center justify-center text-slate-700 text-[10px]">↓</div>
                ))}
              </div>
              {/* Output row */}
              <div className="flex items-center gap-0.5">
                <span className="text-slate-600 w-20 shrink-0 text-right pr-2">{mode === 'encrypt' ? 'Cipher:' : 'Plain:'}</span>
                {output.split('').slice(0, 32).map((ch, i) => (
                  <div key={i} className="w-7 h-7 flex items-center justify-center rounded bg-emerald-900/30 text-emerald-300 font-bold">
                    {ch}
                  </div>
                ))}
              </div>
            </div>
            {/* Legend */}
            <div className="flex gap-4 mt-3 text-[10px]">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-emerald-900/40 border border-emerald-800/60" />
                <span className="text-slate-500">Keyword (primer)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-amber-900/30 border border-amber-800/40" />
                <span className="text-slate-500">Plaintext as key (autokey)</span>
              </div>
            </div>
            {plainLetters.length > 32 && (
              <div className="text-[10px] text-slate-600 mt-2">... showing first 32 of {plainLetters.length}</div>
            )}
          </div>
        )}

        {/* Mode toggle */}
        <div className="flex justify-center gap-2 mb-6">
          <button onClick={() => setMode('encrypt')}
            className={`px-6 py-2 rounded-lg font-bold text-sm border transition-colors ${
              mode === 'encrypt' ? 'bg-emerald-900/50 border-emerald-700 text-emerald-300' : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >ENCRYPT</button>
          <button onClick={() => setMode('decrypt')}
            className={`px-6 py-2 rounded-lg font-bold text-sm border transition-colors ${
              mode === 'decrypt' ? 'bg-emerald-900/50 border-emerald-700 text-emerald-300' : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >DECRYPT</button>
        </div>

        {/* Input / Output */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">
              {mode === 'encrypt' ? 'Plaintext' : 'Ciphertext'}
            </label>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value.toUpperCase())}
              placeholder="TYPE YOUR MESSAGE..."
              className="w-full h-40 bg-slate-900 border border-slate-700 rounded-xl p-4 font-mono text-lg tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none text-slate-200 placeholder-slate-700"
              spellCheck={false}
            />
          </div>
          <div>
            <label className="block text-xs text-emerald-400 font-bold uppercase tracking-wider mb-2">
              {mode === 'encrypt' ? 'Ciphertext' : 'Plaintext'}
            </label>
            <div className="w-full h-40 bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 font-mono text-lg tracking-wider text-emerald-200 overflow-y-auto break-all">
              {output ? output.match(/.{1,5}/g)?.join(' ') : <span className="text-slate-700">...</span>}
            </div>
          </div>
        </div>

        {/* Vigenère comparison */}
        {input && output && (
          <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-5 mb-8">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">
              Autokey vs Standard Vigen&egrave;re
            </div>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-start gap-3">
                <span className="text-slate-600 w-20 shrink-0 text-right">Vigen&egrave;re:</span>
                <span className="text-violet-400 break-all">{vigenereOutput.match(/.{1,5}/g)?.join(' ')}</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-slate-600 w-20 shrink-0 text-right">Autokey:</span>
                <span className="text-emerald-400 break-all">{output.match(/.{1,5}/g)?.join(' ')}</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-slate-600 w-20 shrink-0 text-right">Vig key:</span>
                <span className="text-violet-400/50 break-all tracking-wider">
                  {plainLetters.map((_, i) => keyword.replace(/[^A-Z]/gi, '').charAt(i % keyword.replace(/[^A-Z]/gi, '').length)).join('').match(/.{1,5}/g)?.join(' ')}
                </span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-slate-600 w-20 shrink-0 text-right">Auto key:</span>
                <span className="text-emerald-400/50 break-all tracking-wider">
                  {keyStream.match(/.{1,5}/g)?.join(' ')}
                </span>
              </div>
            </div>
            <div className="text-[10px] text-slate-600 mt-3">
              Notice how Vigen&egrave;re's key repeats every {keyword.replace(/[^A-Z]/gi, '').length} characters (exploitable via Kasiski examination),
              while Autokey's key never repeats — it grows with the message.
            </div>
          </div>
        )}

        {/* Tabula Recta */}
        {showTabula && (
          <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-4 mb-8 overflow-x-auto">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold text-center mb-3">
              Tabula Recta
            </div>
            <div className="inline-block">
              {/* Header row */}
              <div className="flex">
                <div className="w-6 h-6 flex items-center justify-center text-[9px] text-slate-700" />
                {ALPHABET.split('').map(c => (
                  <div key={c} className="w-6 h-6 flex items-center justify-center text-[9px] font-mono font-bold text-slate-400">
                    {c}
                  </div>
                ))}
              </div>
              {/* Rows */}
              {ALPHABET.split('').map((rowChar, r) => (
                <div key={r} className="flex">
                  <div className="w-6 h-6 flex items-center justify-center text-[9px] font-mono font-bold text-slate-400">
                    {rowChar}
                  </div>
                  {ALPHABET.split('').map((_, c) => {
                    const ch = ALPHABET[(r + c) % 26];
                    return (
                      <div key={c} className="w-6 h-6 flex items-center justify-center text-[9px] font-mono text-slate-600 hover:bg-emerald-900/30 hover:text-emerald-300 transition-colors">
                        {ch}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Info Panel */}
      <div className={`fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-700 p-6 transform transition-transform duration-300 z-40 ${showInfo ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="max-w-3xl mx-auto relative">
          <button onClick={() => setShowInfo(false)} className="absolute top-0 right-0 p-2 text-slate-500 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <h3 className="text-xl font-bold text-emerald-400 mb-2">About the Autokey Cipher</h3>
          <div className="text-sm text-slate-300 leading-relaxed space-y-2">
            <p>
              The Autokey cipher was described by <strong>Blaise de Vigen&egrave;re</strong> in 1553 — ironically,
              it's what Vigen&egrave;re actually proposed, while the simpler repeating-key cipher that bears his name
              was invented by <strong>Giovan Battista Bellaso</strong>.
            </p>
            <p>
              The key innovation: after the short keyword (called the <strong>primer</strong>) is exhausted, the
              <strong> plaintext itself</strong> becomes the key. This means the key stream never repeats, making
              the <strong>Kasiski examination</strong> and <strong>index of coincidence</strong> attacks ineffective —
              there's no repeating period to detect.
            </p>
            <p>
              However, it's not unbreakable. Since the key is derived from plaintext, the statistical properties
              of the language leak into the key stream. Attackers can use <strong>probable-word attacks</strong> to
              recover the primer and decrypt the message.
            </p>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

export default App;
