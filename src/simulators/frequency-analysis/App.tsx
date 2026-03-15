import React, { useState, useMemo } from 'react';
import { BarChart3, Info, X } from 'lucide-react';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

interface LangProfile {
  label: string;
  flag: string;
  freq: Record<string, number>;
  bigrams: string[];
  trigrams: string[];
  ioc: number; // expected IoC
}

const LANGUAGES: Record<string, LangProfile> = {
  english: {
    label: 'English', flag: 'EN',
    freq: { A:8.167,B:1.492,C:2.782,D:4.253,E:12.702,F:2.228,G:2.015,H:6.094,I:6.966,J:0.153,K:0.772,L:4.025,M:2.406,N:6.749,O:7.507,P:1.929,Q:0.095,R:5.987,S:6.327,T:9.056,U:2.758,V:0.978,W:2.360,X:0.150,Y:1.974,Z:0.074 },
    bigrams: ['TH','HE','IN','ER','AN','RE','ON','AT','EN','ND','TI','ES','OR','TE','OF','ED','IS','IT','AL','AR'],
    trigrams: ['THE','AND','ING','HER','HAT','HIS','THA','ERE','FOR','ENT','ION','TER','WAS','YOU','ITH'],
    ioc: 0.0667,
  },
  german: {
    label: 'German', flag: 'DE',
    freq: { A:6.516,B:1.886,C:2.732,D:5.076,E:16.396,F:1.656,G:3.009,H:4.577,I:6.550,J:0.268,K:1.417,L:3.437,M:2.534,N:9.776,O:2.594,P:0.670,Q:0.018,R:7.003,S:7.270,T:6.154,U:4.166,V:0.846,W:1.921,X:0.034,Y:0.039,Z:1.134 },
    bigrams: ['EN','ER','CH','DE','EI','ND','TE','IN','IE','GE','ES','NE','UN','ST','RE','AN','HE','BE','SE','AU'],
    trigrams: ['EIN','ICH','DER','DIE','UND','DEN','SCH','CHE','END','GEN','CHT','NDE','TEN','VER','BER'],
    ioc: 0.0762,
  },
  french: {
    label: 'French', flag: 'FR',
    freq: { A:7.636,B:0.901,C:3.260,D:3.669,E:14.715,F:1.066,G:0.866,H:0.737,I:7.529,J:0.613,K:0.049,L:5.456,M:2.968,N:7.095,O:5.378,P:2.521,Q:1.362,R:6.553,S:7.948,T:7.244,U:6.311,V:1.838,W:0.074,X:0.427,Y:0.128,Z:0.326 },
    bigrams: ['ES','LE','DE','EN','RE','NT','ON','ER','TE','EL','AN','SE','LA','AI','NE','OU','ET','ME','IT','CE'],
    trigrams: ['LES','ENT','DES','QUE','ION','EST','ANT','PAR','ONT','AIT','OUR','AIS','CON','MEN','UNE'],
    ioc: 0.0778,
  },
  spanish: {
    label: 'Spanish', flag: 'ES',
    freq: { A:11.525,B:2.215,C:4.019,D:5.010,E:12.181,F:0.692,G:1.768,H:0.703,I:6.247,J:0.493,K:0.011,L:4.967,M:3.157,N:6.712,O:8.683,P:2.510,Q:0.877,R:6.871,S:7.977,T:4.632,U:2.927,V:1.138,W:0.017,X:0.215,Y:1.008,Z:0.467 },
    bigrams: ['DE','EN','ES','EL','LA','OS','AS','ER','AL','RE','ON','AR','RA','AN','AD','NT','DO','CO','SE','TA'],
    trigrams: ['QUE','DEL','ENT','LOS','ADE','EST','ION','LAS','CON','RES','ARA','ERA','DOS','ADO','TRA'],
    ioc: 0.0775,
  },
  italian: {
    label: 'Italian', flag: 'IT',
    freq: { A:11.745,B:0.927,C:4.501,D:3.736,E:11.792,F:1.153,G:1.644,H:0.636,I:10.143,J:0.011,K:0.009,L:6.510,M:2.512,N:6.883,O:9.832,P:3.056,Q:0.505,R:6.367,S:4.981,T:5.623,U:3.011,V:2.097,W:0.033,X:0.003,Y:0.020,Z:1.181 },
    bigrams: ['CH','DI','RE','ER','IN','DE','EL','LE','LA','AL','NO','ON','NE','CO','TO','EN','TA','RI','NT','AN'],
    trigrams: ['CHE','DEL','ATO','PER','ION','CON','ONE','ARE','ENT','TTO','ANO','ALE','ELL','NTE','INO'],
    ioc: 0.0738,
  },
  portuguese: {
    label: 'Portuguese', flag: 'PT',
    freq: { A:14.634,B:1.043,C:3.882,D:4.992,E:12.570,F:1.023,G:1.303,H:0.781,I:6.186,J:0.397,K:0.015,L:2.779,M:4.738,N:4.446,O:9.735,P:2.523,Q:1.204,R:6.530,S:6.805,T:4.336,U:3.639,V:1.665,W:0.037,X:0.253,Y:0.006,Z:0.470 },
    bigrams: ['DE','OS','AS','ES','DO','DA','EM','RE','EN','SE','NO','RA','CO','QU','AR','AL','ER','AN','OR','NT'],
    trigrams: ['QUE','ENT','ADE','DOS','EST','DAS','PAR','RES','CON','COM','STA','MEN','ARA','ERA','ANT'],
    ioc: 0.0745,
  },
  dutch: {
    label: 'Dutch', flag: 'NL',
    freq: { A:7.486,B:1.584,C:1.242,D:5.933,E:18.914,F:0.805,G:3.403,H:2.380,I:6.499,J:1.461,K:2.248,L:3.568,M:2.213,N:10.032,O:6.063,P:1.570,Q:0.009,R:6.411,S:3.730,T:6.790,U:1.990,V:2.850,W:1.520,X:0.036,Y:0.035,Z:1.390 },
    bigrams: ['EN','DE','AN','ET','ER','EE','HE','ND','VE','TE','IN','GE','EL','AA','ST','VA','ON','IJ','BE','RE'],
    trigrams: ['EEN','VAN','HET','DEN','AAR','DER','TEN','AND','VER','ING','DAT','ERE','OOR','EDE','NDE'],
    ioc: 0.0798,
  },
  polish: {
    label: 'Polish', flag: 'PL',
    freq: { A:8.910,B:1.470,C:3.960,D:3.250,E:7.660,F:0.300,G:1.420,H:1.080,I:8.210,J:2.280,K:3.510,L:2.100,M:2.800,N:5.520,O:7.750,P:3.130,Q:0.003,R:4.690,S:4.320,T:3.980,U:2.500,V:0.040,W:4.650,X:0.020,Y:3.760,Z:5.640 },
    bigrams: ['NI','IE','CZ','RZ','PO','PR','NA','ST','OW','ZE','WI','KO','AN','DO','NO','RA','OD','RO','JE','MI'],
    trigrams: ['NIE','PRZ','CZY','POW','STA','OWA','KON','ANI','NIA','TER','ZNA','POD','NAD','WIE','ROZ'],
    ioc: 0.0607,
  },
  latin: {
    label: 'Latin', flag: 'LA',
    freq: { A:7.680,B:1.480,C:3.980,D:3.460,E:11.490,F:1.040,G:1.290,H:0.890,I:10.420,J:0.010,K:0.010,L:2.170,M:5.300,N:6.740,O:5.290,P:2.770,Q:1.490,R:6.280,S:7.430,T:8.510,U:8.340,V:0.930,W:0.000,X:0.590,Y:0.060,Z:0.020 },
    bigrams: ['IS','UM','US','ER','AM','UT','IN','EM','IT','ES','ET','EN','NT','AT','TI','TE','RE','RI','TU','TA'],
    trigrams: ['QUE','TUR','TIS','EST','TEM','ENT','NTI','ION','BUS','RUM','ATE','TIO','ITA','URE','NTE'],
    ioc: 0.0700,
  },
  russian: {
    label: 'Russian (transliterated)', flag: 'RU',
    freq: { A:8.010,B:1.590,C:0.940,D:2.980,E:8.450,F:0.260,G:1.700,H:2.650,I:7.350,J:0.350,K:3.490,L:4.400,M:3.210,N:6.700,O:10.970,P:2.810,Q:0.040,R:4.730,S:5.470,T:6.260,U:2.620,V:4.640,W:0.180,X:0.030,Y:1.900,Z:0.940 },
    bigrams: ['ST','NO','NA','EN','TO','OV','NI','RA','KO','PO','ET','RE','PR','OS','TA','GO','NE','OB','DA','ER'],
    trigrams: ['STO','OST','ENI','PRO','OVA','NOT','PRI','TSI','ETS','NOS','TOR','KON','OGO','RED','ONA'],
    ioc: 0.0529,
  },
};

const SAMPLE_PRESETS = [
  {
    name: 'Monoalphabetic',
    text: 'XKJR JT QAX RQAYBK XKZX ZQ JQXRCCJBRQX DZQ SAQQJQB ZQH FJHH TRDO TRQTR AE OQAVCRHBR VJCC URDJQ XA EJX XABHXKRO ZCC XKR UJXT ZQH SJRDRT AE JQEAODZXJAQ KR KZT ZDMYJORH',
  },
];

function caesarEncrypt(text: string, shift: number): string {
  return text.toUpperCase().split('').map(c => {
    if (c >= 'A' && c <= 'Z') {
      return String.fromCharCode(((c.charCodeAt(0) - 65 + shift) % 26 + 26) % 26 + 65);
    }
    return c;
  }).join('');
}

function vigenereEncrypt(text: string, key: string): string {
  const k = key.toUpperCase().replace(/[^A-Z]/g, '');
  if (k.length === 0) return text.toUpperCase();
  let ki = 0;
  return text.toUpperCase().split('').map(c => {
    if (c >= 'A' && c <= 'Z') {
      const shift = k.charCodeAt(ki % k.length) - 65;
      ki++;
      return String.fromCharCode(((c.charCodeAt(0) - 65 + shift) % 26) + 65);
    }
    return c;
  }).join('');
}

function countLetters(text: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const c of ALPHABET) counts[c] = 0;
  for (const c of text.toUpperCase()) {
    if (ALPHABET.includes(c)) counts[c]++;
  }
  return counts;
}

function countNgrams(text: string, n: number): Map<string, number> {
  const clean = text.toUpperCase().replace(/[^A-Z]/g, '');
  const counts = new Map<string, number>();
  for (let i = 0; i <= clean.length - n; i++) {
    const gram = clean.slice(i, i + n);
    counts.set(gram, (counts.get(gram) || 0) + 1);
  }
  return counts;
}

function calcIoC(text: string): number {
  const clean = text.toUpperCase().replace(/[^A-Z]/g, '');
  const N = clean.length;
  if (N <= 1) return 0;
  const counts = countLetters(clean);
  let sum = 0;
  for (const c of ALPHABET) {
    sum += counts[c] * (counts[c] - 1);
  }
  return sum / (N * (N - 1));
}

function calcChiSquared(text: string, freqTable: Record<string, number>): number {
  const clean = text.toUpperCase().replace(/[^A-Z]/g, '');
  const N = clean.length;
  if (N === 0) return 0;
  const counts = countLetters(clean);
  let chi = 0;
  for (const c of ALPHABET) {
    const expected = ((freqTable[c] || 0) / 100) * N;
    if (expected > 0) chi += Math.pow(counts[c] - expected, 2) / expected;
  }
  return chi;
}

const DEFAULT_PLAINTEXT = 'THERE IS NO DANGER THAT A STRONG MAN WILL BE UNABLE TO MAKE UP HIS MIND IN A CRISIS BUT THERE IS AN ENORMOUS DANGER THAT A WEAK ONE WILL';

const FrequencyAnalysisApp: React.FC = () => {
  const [input, setInput] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  const [tab, setTab] = useState<'letters' | 'bigrams' | 'trigrams'>('letters');
  const [encryptMode, setEncryptMode] = useState<'caesar' | 'vigenere' | 'custom'>('caesar');
  const [plaintext, setPlaintext] = useState(DEFAULT_PLAINTEXT);
  const [caesarShift, setCaesarShift] = useState(3);
  const [vigKey, setVigKey] = useState('SECRET');
  const [lang, setLang] = useState('english');
  const langProfile = LANGUAGES[lang];

  // Auto-encrypt when parameters change
  const encryptedText = useMemo(() => {
    if (encryptMode === 'caesar') return caesarEncrypt(plaintext, caesarShift);
    if (encryptMode === 'vigenere') return vigenereEncrypt(plaintext, vigKey);
    return input;
  }, [encryptMode, plaintext, caesarShift, vigKey, input]);

  // Keep analysis input in sync for caesar/vigenere modes
  const analysisText = encryptMode === 'custom' ? input : encryptedText;

  const letterCounts = useMemo(() => countLetters(analysisText), [analysisText]);
  const totalLetters = useMemo(() => Object.values(letterCounts).reduce((a, b) => a + b, 0), [letterCounts]);
  const ioc = useMemo(() => calcIoC(analysisText), [analysisText]);
  const chiSq = useMemo(() => calcChiSquared(analysisText, langProfile.freq), [analysisText, langProfile]);

  const bigrams = useMemo(() => {
    const map = countNgrams(analysisText, 2);
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
  }, [analysisText]);

  const trigrams = useMemo(() => {
    const map = countNgrams(analysisText, 3);
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
  }, [analysisText]);

  const maxCount = Math.max(...Object.values(letterCounts), 1);
  const maxRefFreq = Math.max(...Object.values(langProfile.freq));
  const sortedRefOrder = [...ALPHABET].sort((a, b) => (langProfile.freq[b] || 0) - (langProfile.freq[a] || 0));

  // Sort letters by frequency for ranking
  const sortedByFreq = [...ALPHABET].sort((a, b) => letterCounts[b] - letterCounts[a]);
  const top5 = new Set(sortedByFreq.slice(0, 5));

  return (
    <div className="flex-1 bg-[#1a1814] text-stone-200 flex flex-col items-center px-6 py-8 sm:px-10 md:px-16">
      <div className="w-full max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-950/60 border border-red-700/50 flex items-center justify-center text-red-400">
              <BarChart3 size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">FREQUENCY ANALYSIS</h1>
              <p className="text-sm text-slate-500 font-mono">STATISTICAL CODEBREAKING — AL-KINDI, ~850 AD</p>
            </div>
          </div>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
          >
            {showInfo ? <X size={20} /> : <Info size={20} />}
          </button>
        </div>

        {/* Info Panel */}
        {showInfo && (
          <div className="mb-8 bg-red-950/20 border border-red-900/40 rounded-xl p-6 text-sm text-slate-300 leading-relaxed">
            <h3 className="text-red-400 font-bold mb-2">The First Cryptanalysis</h3>
            <p className="mb-3">
              Around 850 AD, the Arab polymath <strong className="text-white">Al-Kindi</strong> wrote <em>A Manuscript on Deciphering Cryptographic Messages</em> — the oldest known description of frequency analysis. He realized that in any language, certain letters appear more often than others, and this pattern survives encryption by simple substitution.
            </p>
            <p className="mb-3">
              In English, <strong className="text-white">E</strong> is the most common letter (~12.7%), followed by <strong className="text-white">T</strong> (~9.1%) and <strong className="text-white">A</strong> (~8.2%). If a ciphertext's most common letter is 'X', it likely represents 'E'.
            </p>
            <p>
              The <strong className="text-white">Index of Coincidence</strong> (IoC), developed by William Friedman in 1922, measures how "structured" a text is. English text has an IoC of ~0.0667, while random text has ~0.0385. This tells you whether you're dealing with a monoalphabetic or polyalphabetic cipher.
            </p>
          </div>
        )}

        {/* Encrypt Panel */}
        <div className="mb-6 bg-slate-900/60 border border-slate-800 rounded-xl p-5">
          {/* Mode selector */}
          <div className="flex items-center gap-2 mb-4">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">Cipher</label>
            {(['caesar', 'vigenere', 'custom'] as const).map(m => (
              <button
                key={m}
                onClick={() => setEncryptMode(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  encryptMode === m
                    ? 'bg-red-950/50 text-red-400 border border-red-700/50'
                    : 'text-slate-500 hover:text-white border border-slate-700 hover:border-slate-500'
                }`}
              >
                {m === 'caesar' ? 'Caesar' : m === 'vigenere' ? 'Vigenère' : 'Paste Ciphertext'}
              </button>
            ))}
            {SAMPLE_PRESETS.map(p => (
              <button
                key={p.name}
                onClick={() => { setEncryptMode('custom'); setInput(p.text); }}
                className="text-[10px] px-2 py-1 rounded border border-slate-700 text-slate-500 hover:text-red-400 hover:border-red-700/50 transition-colors ml-auto"
              >
                {p.name}
              </button>
            ))}
          </div>

          {encryptMode !== 'custom' && (
            <>
              {/* Plaintext input */}
              <div className="mb-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Plaintext</label>
                <textarea
                  value={plaintext}
                  onChange={e => setPlaintext(e.target.value)}
                  className="w-full h-20 bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 font-mono text-sm text-white resize-none focus:outline-none focus:border-red-700/50"
                  placeholder="Type plaintext to encrypt..."
                />
              </div>

              {/* Cipher parameters */}
              {encryptMode === 'caesar' && (
                <div className="flex items-center gap-4 mb-3">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Shift</label>
                  <input
                    type="range"
                    min={1}
                    max={25}
                    value={caesarShift}
                    onChange={e => setCaesarShift(Number(e.target.value))}
                    className="flex-1 accent-red-500 max-w-xs"
                  />
                  <span className="text-lg font-mono font-bold text-red-400 w-8 text-center">{caesarShift}</span>
                  <div className="flex gap-1">
                    {[3, 7, 13, 19].map(s => (
                      <button
                        key={s}
                        onClick={() => setCaesarShift(s)}
                        className={`px-2 py-1 text-[10px] font-mono rounded border transition-colors ${
                          caesarShift === s
                            ? 'border-red-700/50 text-red-400 bg-red-950/30'
                            : 'border-slate-700 text-slate-500 hover:text-white'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {encryptMode === 'vigenere' && (
                <div className="flex items-center gap-4 mb-3">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Key</label>
                  <input
                    value={vigKey}
                    onChange={e => setVigKey(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
                    className="bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-2 font-mono text-sm text-white focus:outline-none focus:border-red-700/50 w-48"
                    placeholder="e.g. SECRET"
                  />
                  <div className="flex gap-1">
                    {['KEY', 'SECRET', 'LEMON', 'CRYPTOGRAPHY'].map(k => (
                      <button
                        key={k}
                        onClick={() => setVigKey(k)}
                        className={`px-2 py-1 text-[10px] font-mono rounded border transition-colors ${
                          vigKey === k
                            ? 'border-red-700/50 text-red-400 bg-red-950/30'
                            : 'border-slate-700 text-slate-500 hover:text-white'
                        }`}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Ciphertext output */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Ciphertext
                  <span className="text-slate-600 font-normal ml-2">
                    ({encryptMode === 'caesar' ? `Caesar shift ${caesarShift}` : `Vigenère key "${vigKey}"`})
                  </span>
                </label>
                <div className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-3 font-mono text-sm text-red-300 min-h-[3rem] break-all">
                  {encryptedText || <span className="text-slate-600">Encrypted text will appear here...</span>}
                </div>
              </div>
            </>
          )}

          {encryptMode === 'custom' && (
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Ciphertext</label>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                className="w-full h-28 bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 font-mono text-sm text-white resize-none focus:outline-none focus:border-red-700/50"
                placeholder="Paste ciphertext here..."
              />
            </div>
          )}

          <div className="flex gap-6 mt-3 text-xs text-slate-500">
            <span>{totalLetters} letters</span>
            <span>Chi-squared: <span className={chiSq < 50 ? 'text-green-400' : chiSq < 200 ? 'text-yellow-400' : 'text-red-400'}>{chiSq.toFixed(1)}</span></span>
          </div>
        </div>

        {/* Language selector */}
        <div className="mb-4 flex items-center gap-3 flex-wrap">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reference Language</label>
          {Object.entries(LANGUAGES).map(([key, lp]) => (
            <button
              key={key}
              onClick={() => setLang(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                lang === key
                  ? 'bg-red-950/50 text-red-400 border border-red-700/50'
                  : 'text-slate-500 hover:text-white border border-slate-700 hover:border-slate-500'
              }`}
            >
              <span className="font-bold mr-1">{lp.flag}</span> {lp.label}
            </button>
          ))}
        </div>

        {/* IoC Display */}
        <div className="mb-8 bg-slate-900/60 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-300">Index of Coincidence</h3>
            <span className="text-lg font-mono font-bold text-white">{ioc.toFixed(4)}</span>
          </div>
          <div className="relative h-8 bg-slate-800 rounded-full overflow-hidden">
            {/* Gradient bar */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/40 via-yellow-600/40 to-green-600/40" />
            {/* Random marker */}
            <div className="absolute top-0 bottom-0 w-0.5 bg-blue-400" style={{ left: `${((0.0385 - 0.03) / (0.08 - 0.03)) * 100}%` }}>
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] text-blue-400 whitespace-nowrap">Random 0.038</div>
            </div>
            {/* Language IoC marker */}
            <div className="absolute top-0 bottom-0 w-0.5 bg-green-400" style={{ left: `${((langProfile.ioc - 0.03) / (0.08 - 0.03)) * 100}%` }}>
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] text-green-400 whitespace-nowrap">{langProfile.label} {langProfile.ioc.toFixed(3)}</div>
            </div>
            {/* Current value */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-red-400 shadow-lg shadow-red-500/50"
              style={{ left: `${Math.max(0, Math.min(100, ((ioc - 0.03) / (0.08 - 0.03)) * 100))}%` }}
            >
              <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] text-red-400 font-bold whitespace-nowrap">{ioc.toFixed(4)}</div>
            </div>
          </div>
          <div className="flex justify-between mt-6 text-[10px] text-slate-500">
            <span>Polyalphabetic / Random</span>
            <span>Monoalphabetic / {langProfile.label}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['letters', 'bigrams', 'trigrams'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t
                  ? 'bg-red-950/50 text-red-400 border border-red-700/50'
                  : 'text-slate-500 hover:text-white border border-slate-800 hover:border-slate-600'
              }`}
            >
              {t === 'letters' ? 'Letter Frequency' : t === 'bigrams' ? 'Bigrams' : 'Trigrams'}
            </button>
          ))}
        </div>

        {/* Letter Frequency Chart */}
        {tab === 'letters' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
            <div className="flex items-end gap-[3px] h-64">
              {ALPHABET.split('').map(letter => {
                const count = letterCounts[letter];
                const pct = totalLetters > 0 ? (count / totalLetters) * 100 : 0;
                const refPct = langProfile.freq[letter] || 0;
                const barH = totalLetters > 0 ? (count / maxCount) * 100 : 0;
                const refBarH = (refPct / maxRefFreq) * 100;
                const isTop = top5.has(letter);

                return (
                  <div key={letter} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs z-10 whitespace-nowrap">
                      <div className="font-bold text-white">{letter}: {count} ({pct.toFixed(1)}%)</div>
                      <div className="text-slate-400">{langProfile.label}: {refPct.toFixed(1)}%</div>
                    </div>
                    {/* Reference language bar */}
                    <div
                      className="w-full bg-slate-700/30 rounded-t-sm absolute bottom-6"
                      style={{ height: `${refBarH * 0.85}%` }}
                    />
                    {/* Observed bar */}
                    <div
                      className={`w-full rounded-t-sm relative z-[1] transition-all ${
                        isTop ? 'bg-red-500/80' : 'bg-slate-500/60'
                      }`}
                      style={{ height: `${barH * 0.85}%`, minHeight: count > 0 ? '2px' : '0' }}
                    />
                    <div className={`text-[10px] mt-1 font-mono ${isTop ? 'text-red-400 font-bold' : 'text-slate-500'}`}>
                      {letter}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-4 text-[10px] text-slate-500">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-red-500/80" />
                <span>Top 5 observed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-slate-500/60" />
                <span>Observed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-slate-700/30" />
                <span>Expected {langProfile.label}</span>
              </div>
            </div>
            {/* Frequency ranking */}
            <div className="mt-6 pt-4 border-t border-slate-800">
              <div className="text-xs text-slate-400 mb-2">
                <span className="font-bold text-slate-300">Observed order: </span>
                <span className="font-mono text-red-400">{sortedByFreq.filter(l => letterCounts[l] > 0).join(' ')}</span>
              </div>
              <div className="text-xs text-slate-400">
                <span className="font-bold text-slate-300">{langProfile.label} order: </span>
                <span className="font-mono text-slate-500">{sortedRefOrder.filter(l => (langProfile.freq[l] || 0) > 0).join(' ')}</span>
              </div>
            </div>
          </div>
        )}

        {/* Bigrams */}
        {tab === 'bigrams' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Observed Bigrams</h4>
                <div className="space-y-1">
                  {bigrams.map(([gram, count], i) => (
                    <div key={gram} className="flex items-center gap-3">
                      <span className="text-xs text-slate-600 w-5 text-right">{i + 1}.</span>
                      <span className="font-mono text-sm font-bold text-white w-8">{gram}</span>
                      <div className="flex-1 h-4 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500/60 rounded-full"
                          style={{ width: `${(count / bigrams[0][1]) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 w-8 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Expected {langProfile.label} Bigrams</h4>
                <div className="space-y-1">
                  {langProfile.bigrams.map((gram, i) => (
                    <div key={gram} className="flex items-center gap-3">
                      <span className="text-xs text-slate-600 w-5 text-right">{i + 1}.</span>
                      <span className="font-mono text-sm text-slate-400 w-8">{gram}</span>
                      <div className="text-[10px] text-slate-600">
                        {bigrams.find(b => b[0] === gram) ? (
                          <span className="text-green-400">found ({bigrams.find(b => b[0] === gram)![1]}×)</span>
                        ) : (
                          <span>not found</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Trigrams */}
        {tab === 'trigrams' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Observed Trigrams</h4>
                <div className="space-y-1">
                  {trigrams.map(([gram, count], i) => (
                    <div key={gram} className="flex items-center gap-3">
                      <span className="text-xs text-slate-600 w-5 text-right">{i + 1}.</span>
                      <span className="font-mono text-sm font-bold text-white w-10">{gram}</span>
                      <div className="flex-1 h-4 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500/60 rounded-full"
                          style={{ width: `${(count / trigrams[0][1]) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 w-8 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Expected {langProfile.label} Trigrams</h4>
                <div className="space-y-1">
                  {langProfile.trigrams.map((gram, i) => (
                    <div key={gram} className="flex items-center gap-3">
                      <span className="text-xs text-slate-600 w-5 text-right">{i + 1}.</span>
                      <span className="font-mono text-sm text-slate-400 w-10">{gram}</span>
                      <div className="text-[10px] text-slate-600">
                        {trigrams.find(b => b[0] === gram) ? (
                          <span className="text-green-400">found ({trigrams.find(b => b[0] === gram)![1]}×)</span>
                        ) : (
                          <span>not found</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FrequencyAnalysisApp;
