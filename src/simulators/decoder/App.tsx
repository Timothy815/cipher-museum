import React, { useState, useCallback, useMemo } from 'react';

// ── Morse tables ───────────────────────────────────────────────────────
const MORSE_ENC: Record<string, string> = {
  A:'.-',B:'-...',C:'-.-.',D:'-..',E:'.',F:'..-.',G:'--.',H:'....',
  I:'..',J:'.---',K:'-.-',L:'.-..',M:'--',N:'-.',O:'---',P:'.--.',
  Q:'--.-',R:'.-.',S:'...',T:'-',U:'..-',V:'...-',W:'.--',X:'-..-',
  Y:'-.--',Z:'--..',
  '0':'-----','1':'.----','2':'..---','3':'...--','4':'....-','5':'.....',
  '6':'-....','7':'--...','8':'---..','9':'----.',
  '.':'.-.-.-',',':'--..--','?':'..--..','!':'-.-.--','/':`-..-.`,
};
const MORSE_DEC: Record<string,string> = Object.fromEntries(Object.entries(MORSE_ENC).map(([k,v])=>[v,k]));

// ── ROT helpers ────────────────────────────────────────────────────────
function rotAlpha(s: string, n: number): string {
  return s.replace(/[A-Za-z]/g, c => {
    const base = c <= 'Z' ? 65 : 97;
    return String.fromCharCode((c.charCodeAt(0) - base + n + 26) % 26 + base);
  });
}
function rot47(s: string): string {
  return s.replace(/[\x21-\x7e]/g, c => String.fromCharCode((c.charCodeAt(0)-33+47)%94+33));
}

// ── Operation definitions ─────────────────────────────────────────────
interface OpResult { output: string; note?: string; error?: string }
interface Op { id: string; label: string; category: string; icon: string; fn: (s: string) => OpResult }

const OPS: Op[] = [
  // Decode
  { id:'b64d', label:'Base64 Decode',    category:'decode',   icon:'⬇',
    fn: s => { try { const r=atob(s.trim().replace(/\s/g,'')); return {output:r,note:`${r.length} bytes`}; } catch { return {output:'',error:'Invalid base64'}; } } },
  { id:'hexd', label:'Hex → Text',       category:'decode',   icon:'⬇',
    fn: s => {
      const h=s.trim().replace(/[\s:]/g,'');
      if (!/^[0-9a-fA-F]+$/.test(h)||h.length%2!==0) return {output:'',error:'Invalid hex'};
      const bytes=new Uint8Array(h.length/2).map((_,i)=>parseInt(h.slice(i*2,i*2+2),16));
      return {output:new TextDecoder().decode(bytes),note:`${bytes.length} bytes`};
    }},
  { id:'urld', label:'URL Decode',       category:'decode',   icon:'⬇',
    fn: s => { try { return {output:decodeURIComponent(s.trim())}; } catch { return {output:'',error:'Invalid URL encoding'}; } } },
  { id:'htmld', label:'HTML Entities',   category:'decode',   icon:'⬇',
    fn: s => { const d=document.createElement('div'); d.innerHTML=s; return {output:d.textContent??''}; } },
  { id:'bind', label:'Binary → Text',   category:'decode',   icon:'⬇',
    fn: s => {
      const chunks=s.trim().replace(/[^01\s]/g,'').trim().split(/\s+/);
      if (!chunks.every(c=>/^[01]{8}$/.test(c))) return {output:'',error:'Expected 8-bit groups'};
      return {output:chunks.map(c=>String.fromCharCode(parseInt(c,2))).join('')};
    }},
  { id:'morsed', label:'Morse → Text', category:'decode',   icon:'⬇',
    fn: s => {
      const words=s.trim().replace(/\|\//g,' / ').split(/\s{2,}|\s*\/\s*/);
      const dec=words.map(w=>w.trim().split(/\s+/).map(c=>MORSE_DEC[c.trim()]??'?').join('')).join(' ');
      return {output:dec};
    }},
  { id:'atoi', label:'Char Codes → Text', category:'decode', icon:'⬇',
    fn: s => {
      const nums=s.trim().split(/[\s,;]+/).map(Number);
      if (nums.some(isNaN)||!nums.length) return {output:'',error:'Expected numbers'};
      return {output:nums.map(n=>String.fromCharCode(n)).join('')};
    }},
  { id:'b64ud', label:'Base64url Decode', category:'decode', icon:'⬇',
    fn: s => {
      try {
        const pad=s.trim().replace(/-/g,'+').replace(/_/g,'/');
        const padded=pad+('='.repeat((4-pad.length%4)%4));
        return {output:atob(padded)};
      } catch { return {output:'',error:'Invalid base64url'}; }
    }},

  // Encode
  { id:'b64e', label:'Text → Base64',  category:'encode', icon:'⬆',
    fn: s => { try { return {output:btoa(unescape(encodeURIComponent(s)))}; } catch { return {output:btoa(s)}; } } },
  { id:'hexe', label:'Text → Hex',     category:'encode', icon:'⬆',
    fn: s => {const b=new TextEncoder().encode(s);return {output:Array.from(b).map(x=>x.toString(16).padStart(2,'0')).join(' ')};} },
  { id:'urle', label:'URL Encode',     category:'encode', icon:'⬆',
    fn: s => ({output:encodeURIComponent(s)}) },
  { id:'bine', label:'Text → Binary',  category:'encode', icon:'⬆',
    fn: s => {const b=new TextEncoder().encode(s);return {output:Array.from(b).map(x=>x.toString(2).padStart(8,'0')).join(' ')};} },
  { id:'morsee', label:'Text → Morse', category:'encode', icon:'⬆',
    fn: s => {
      const enc=s.toUpperCase().split('').map(c=>{if(c===' ')return '/';return MORSE_ENC[c]??'?';}).join(' ');
      return {output:enc};
    }},
  { id:'itoa', label:'Text → Char Codes', category:'encode', icon:'⬆',
    fn: s => ({output:Array.from(s).map(c=>c.charCodeAt(0)).join(' ')}) },

  // Cipher
  { id:'rot13', label:'ROT13',          category:'cipher', icon:'↻', fn: s => ({output:rotAlpha(s,13)}) },
  { id:'rot47', label:'ROT47',          category:'cipher', icon:'↻', fn: s => ({output:rot47(s)}) },
  { id:'rot18', label:'ROT18 (5+13)',   category:'cipher', icon:'↻', fn: s => ({output:rotAlpha(s.replace(/[0-9]/g,c=>String.fromCharCode((c.charCodeAt(0)-48+5)%10+48)),13)}) },
  { id:'atbash', label:'Atbash',        category:'cipher', icon:'↔', fn: s => ({output:s.replace(/[A-Za-z]/g,c=>{const b=c<='Z'?65:97;return String.fromCharCode(b+25-(c.charCodeAt(0)-b));})}) },

  // Transform
  { id:'rev',      label:'Reverse',         category:'transform', icon:'⇄', fn: s => ({output:s.split('').reverse().join('')}) },
  { id:'upper',    label:'UPPERCASE',        category:'transform', icon:'Aa', fn: s => ({output:s.toUpperCase()}) },
  { id:'lower',    label:'lowercase',        category:'transform', icon:'aA', fn: s => ({output:s.toLowerCase()}) },
  { id:'nospace',  label:'Remove Spaces',    category:'transform', icon:'_', fn: s => ({output:s.replace(/\s+/g,'')}) },
  { id:'trim',     label:'Trim',             category:'transform', icon:'◻', fn: s => ({output:s.trim()}) },
  { id:'nobadchars',label:'Letters Only',    category:'transform', icon:'az', fn: s => ({output:s.replace(/[^A-Za-z]/g,'')}) },
  { id:'addspace5', label:'Add Spaces ×5',   category:'transform', icon:'│', fn: s => ({output:s.replace(/[^A-Za-z0-9]/g,'').replace(/(.{5})/g,'$1 ').trim()}) },
];

const OP_MAP = new Map(OPS.map(o=>[o.id,o]));

const CAT_ORDER = ['decode','encode','cipher','transform'];
const CAT_LABELS: Record<string,string> = { decode:'Decode', encode:'Encode', cipher:'Cipher', transform:'Transform' };
const CAT_COLOR: Record<string,string>  = {
  decode:   'bg-cyan-600/20 border-cyan-700/40 text-cyan-300 hover:bg-cyan-600/40',
  encode:   'bg-blue-600/20 border-blue-700/40 text-blue-300 hover:bg-blue-600/40',
  cipher:   'bg-amber-600/20 border-amber-700/40 text-amber-300 hover:bg-amber-600/40',
  transform:'bg-slate-700/40 border-slate-600/40 text-slate-300 hover:bg-slate-600/40',
};

// ── Auto-detect ────────────────────────────────────────────────────────
function autoDetect(s: string): string[] {
  const t=s.trim(); const suggestions: string[]=[];
  const hex=t.replace(/[\s:]/g,'');
  if(/^[0-9a-fA-F]+$/.test(hex)&&hex.length%2===0&&hex.length>=4) suggestions.push('hexd');
  const b64=t.replace(/\s/g,'');
  if(/^[A-Za-z0-9+/=]+$/.test(b64)&&b64.length%4===0&&b64.length>=4) { try{atob(b64);suggestions.push('b64d');}catch{} }
  if(/%[0-9a-fA-F]{2}/.test(t)) suggestions.push('urld');
  if(/&[a-z]+;|&#\d+;/i.test(t)) suggestions.push('htmld');
  if(/^[01\s]+$/.test(t)&&t.trim().split(/\s+/).every(b=>b.length===8)) suggestions.push('bind');
  if(/^[\.\-\/\s]+$/.test(t)&&t.length>2) suggestions.push('morsed');
  if(/^\d+(\s+\d+)+$/.test(t.trim())) suggestions.push('atoi');
  if(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/.test(t)&&t.startsWith('eyJ')) suggestions.push('b64ud');
  return suggestions;
}

// ── Step history entry ─────────────────────────────────────────────────
interface Step { opId: string; input: string; result: OpResult }

// ── Main ──────────────────────────────────────────────────────────────

const SAMPLES: [string, string, string][] = [
  ['Base64','aGVsbG8gd29ybGQ=','Simple text encoded as base64'],
  ['Hex','68 65 6c 6c 6f 20 77 6f 72 6c 64','Same text in hex'],
  ['ROT13','Uryyb, Jbeyq!','Classic Caesar variant'],
  ['Morse','.... . .-.. .-.. ---  .-- --- .-. .-.. -..','Hello World in Morse'],
  ['Char codes','72 101 108 108 111 32 87 111 114 108 100','ASCII decimal values'],
  ['URL encoded','Hello%20World%21','URL-encoded string'],
  ['Binary','01001000 01100101 01101100 01101100 01101111','Binary "Hello"'],
  ['Layered','YUhWc2JHOG=','Base64 of base64'],
];

const DecoderApp: React.FC = () => {
  const [rawInput, setRawInput] = useState('aGVsbG8gd29ybGQ=');
  const [history, setHistory]   = useState<Step[]>([]);

  const currentText = history.length > 0
    ? (history[history.length-1].result.output)
    : rawInput;

  const suggestions = useMemo(() => autoDetect(currentText), [currentText]);

  const apply = useCallback((opId: string) => {
    const op = OP_MAP.get(opId);
    if (!op) return;
    const result = op.fn(currentText);
    if (result.error) return; // don't push error steps
    setHistory(h => [...h, { opId, input: currentText, result }]);
  }, [currentText]);

  const undo = () => setHistory(h => h.slice(0,-1));
  const reset = () => { setHistory([]); };

  const groups = CAT_ORDER.map(cat => ({
    cat, ops: OPS.filter(o => o.category === cat),
  }));

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950 text-slate-200"
         style={{ fontFamily: "'Share Tech Mono', monospace" }}>

      <div className="flex-shrink-0 px-6 pt-5 pb-3 border-b border-slate-800 bg-slate-900/60">
        <h1 className="text-xl font-bold text-white">Encoding Decoder / Stack</h1>
        <p className="text-xs text-slate-400 mt-1">
          Base64 · Hex · URL · Binary · Morse · ROT13/47 · Char codes — stacked transforms, auto-detect
        </p>
      </div>

      <div className="flex-1 overflow-auto flex flex-col lg:flex-row gap-4 p-4">

        {/* Left: I/O */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">

          {/* Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Input</span>
              <button onClick={reset} disabled={history.length===0&&rawInput===''}
                className="text-[10px] text-slate-600 hover:text-slate-300 disabled:opacity-30 transition-colors">
                RESET
              </button>
            </div>
            <textarea
              value={rawInput}
              onChange={e => { setRawInput(e.target.value); setHistory([]); }}
              rows={3}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-300 resize-none outline-none focus:border-amber-700"
              placeholder="Paste encoded / ciphertext here…"
              spellCheck={false}
            />
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] text-amber-400 font-bold">Auto-detected:</span>
              {suggestions.map(id => {
                const op = OP_MAP.get(id)!;
                return (
                  <button key={id} onClick={() => apply(id)}
                    className="px-3 py-1 rounded-lg text-[10px] font-bold bg-amber-600/20 border border-amber-600/40 text-amber-300 hover:bg-amber-600/40 transition-colors">
                    {op.label} →
                  </button>
                );
              })}
            </div>
          )}

          {/* Transform history */}
          {history.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Pipeline ({history.length} step{history.length!==1?'s':''})
                </span>
                <button onClick={undo} className="text-[10px] text-slate-500 hover:text-amber-400 transition-colors">
                  ↩ UNDO
                </button>
              </div>
              {history.map((step, i) => {
                const op = OP_MAP.get(step.opId)!;
                const isLast = i === history.length-1;
                return (
                  <div key={i} className={`rounded-xl border p-3 ${isLast ? 'border-cyan-700/50 bg-cyan-950/10' : 'border-slate-700/50 bg-slate-900/20'}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-[10px] font-bold ${CAT_COLOR[op.category].split(' ')[2]}`}>
                        {op.icon} {op.label}
                      </span>
                      {step.result.note && (
                        <span className="text-[9px] text-slate-500">{step.result.note}</span>
                      )}
                      <span className="text-[9px] text-slate-600 ml-auto">step {i+1}</span>
                    </div>
                    <div className="text-xs font-mono text-slate-200 break-all leading-relaxed bg-slate-950/40 rounded-lg p-2 max-h-24 overflow-y-auto">
                      {step.result.output || <span className="text-slate-600">(empty)</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Current working value */}
          {history.length === 0 && (
            <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-3">
              <div className="text-[10px] text-slate-500 mb-1">Working value</div>
              <div className="text-xs font-mono text-slate-300 break-all">{currentText}</div>
            </div>
          )}

          {/* Samples */}
          <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-3">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Sample inputs</div>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLES.map(([label, val]) => (
                <button key={label}
                  onClick={() => { setRawInput(val); setHistory([]); }}
                  title={val}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] text-slate-400 hover:text-white transition-colors">
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: operations */}
        <div className="w-full lg:w-56 flex-shrink-0 flex flex-col gap-3">
          {groups.map(({cat, ops}) => (
            <div key={cat} className="bg-slate-900/60 rounded-xl border border-slate-700 p-3">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">{CAT_LABELS[cat]}</div>
              <div className="flex flex-col gap-1">
                {ops.map(op => {
                  const res = op.fn(currentText);
                  const disabled = !!res.error || res.output === currentText;
                  return (
                    <button key={op.id}
                      onClick={() => !disabled && apply(op.id)}
                      disabled={disabled}
                      title={res.error ?? (disabled ? 'No change' : undefined)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border text-left transition-colors ${
                        disabled
                          ? 'opacity-30 cursor-not-allowed border-slate-800 text-slate-600'
                          : CAT_COLOR[cat]
                      }`}
                    >
                      {op.icon} {op.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DecoderApp;
