import React, { useState, useMemo } from 'react';
import { Info, X, RefreshCw, Eye, EyeOff } from 'lucide-react';

// ── Modular arithmetic ──────────────────────────────────────────────

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = 1n;
  base = ((base % mod) + mod) % mod;
  while (exp > 0n) {
    if (exp & 1n) result = (result * base) % mod;
    exp >>= 1n;
    base = (base * base) % mod;
  }
  return result;
}

// ── Color mixing helpers (HSL) ──────────────────────────────────────

function hslToString(h: number, s: number, l: number): string {
  return `hsl(${h}, ${s}%, ${l}%)`;
}

function mixColors(h1: number, h2: number): number {
  // Blend hues on the color wheel (shortest path)
  let diff = h2 - h1;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return ((h1 + diff / 2) + 360) % 360;
}

function mixThreeColors(h1: number, h2: number, h3: number): number {
  // Average three hues on the color wheel using circular mean
  const toRad = (d: number) => (d * Math.PI) / 180;
  const sinSum = Math.sin(toRad(h1)) + Math.sin(toRad(h2)) + Math.sin(toRad(h3));
  const cosSum = Math.cos(toRad(h1)) + Math.cos(toRad(h2)) + Math.cos(toRad(h3));
  return ((Math.atan2(sinSum, cosSum) * 180) / Math.PI + 360) % 360;
}

// ── Presets ──────────────────────────────────────────────────────────

const PRESETS = [
  { label: 'Small (p=23, g=5)', p: '23', g: '5' },
  { label: 'Medium (p=97, g=5)', p: '97', g: '5' },
  { label: 'Larger (p=7919, g=7)', p: '7919', g: '7' },
  { label: 'p=104729, g=3', p: '104729', g: '3' },
];

const COLOR_PRESETS = [
  { label: 'Yellow', hue: 50 },
  { label: 'Cyan', hue: 180 },
  { label: 'Magenta', hue: 300 },
  { label: 'Green', hue: 120 },
];

// ── Component ───────────────────────────────────────────────────────

const App: React.FC = () => {
  const [showInfo, setShowInfo] = useState(false);
  const [showEve, setShowEve] = useState(true);
  const [pStr, setPStr] = useState('23');
  const [gStr, setGStr] = useState('5');
  const [aStr, setAStr] = useState('6');
  const [bStr, setBStr] = useState('15');

  // Color analogy state
  const [publicHue, setPublicHue] = useState(50); // yellow
  const [aliceSecretHue, setAliceSecretHue] = useState(0); // red
  const [bobSecretHue, setBobSecretHue] = useState(220); // blue

  const p = useMemo(() => { try { return BigInt(pStr); } catch { return 23n; } }, [pStr]);
  const g = useMemo(() => { try { return BigInt(gStr); } catch { return 5n; } }, [gStr]);
  const a = useMemo(() => { try { return BigInt(aStr); } catch { return 6n; } }, [aStr]);
  const b = useMemo(() => { try { return BigInt(bStr); } catch { return 15n; } }, [bStr]);

  const A = useMemo(() => modPow(g, a, p), [g, a, p]);
  const B = useMemo(() => modPow(g, b, p), [g, b, p]);
  const sharedAlice = useMemo(() => modPow(B, a, p), [B, a, p]);
  const sharedBob = useMemo(() => modPow(A, b, p), [A, b, p]);
  const keysMatch = sharedAlice === sharedBob;

  // Color mixing
  const aliceMixed = mixColors(publicHue, aliceSecretHue);
  const bobMixed = mixColors(publicHue, bobSecretHue);
  const sharedHue = mixThreeColors(publicHue, aliceSecretHue, bobSecretHue);

  const S = 70, L = 55;
  const publicColor = hslToString(publicHue, S, L);
  const aliceSecretColor = hslToString(aliceSecretHue, S, L);
  const bobSecretColor = hslToString(bobSecretHue, S, L);
  const aliceMixedColor = hslToString(aliceMixed, S, L);
  const bobMixedColor = hslToString(bobMixed, S, L);
  const sharedColor = hslToString(sharedHue, S, L);

  const inputClass = 'bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-violet-700/50 w-full';
  const labelClass = 'text-xs font-bold text-slate-400 uppercase tracking-wider';
  const panelClass = 'bg-slate-900/60 border border-slate-800 rounded-xl p-5';

  const randomSecret = () => {
    const max = Number(p) - 2;
    return String(Math.floor(Math.random() * max) + 2);
  };

  return (
    <div className="min-h-screen bg-[#1a1814] text-white px-6 py-4 sm:px-10 md:px-16 md:py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-violet-400">Diffie-Hellman Key Exchange</h1>
            <p className="text-sm text-slate-400 mt-1">Two parties agree on a shared secret over a public channel</p>
          </div>
          <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-violet-700/50 transition-colors">
            {showInfo ? <X size={20} className="text-violet-400" /> : <Info size={20} className="text-violet-400" />}
          </button>
        </div>

        {showInfo && (
          <div className="bg-violet-950/20 border border-violet-900/40 rounded-xl p-6 space-y-3 text-sm text-slate-300 leading-relaxed">
            <h2 className="text-base font-bold text-violet-400">About Diffie-Hellman</h2>
            <p>Published in 1976 by <strong className="text-white">Whitfield Diffie</strong> and <strong className="text-white">Martin Hellman</strong> (with contributions from <strong className="text-white">Ralph Merkle</strong>), this was the first practical method for establishing a shared secret over an insecure channel. It was later revealed that <strong className="text-white">GCHQ</strong> cryptographers James Ellis, Clifford Cocks, and Malcolm Williamson had discovered it earlier but kept it classified.</p>
            <p>The security relies on the <strong className="text-white">Discrete Logarithm Problem</strong>: given <code className="text-violet-300">g, p,</code> and <code className="text-violet-300">g^a mod p</code>, finding <code className="text-violet-300">a</code> is computationally infeasible for large primes.</p>
            <p><strong className="text-white">Used in:</strong> TLS/HTTPS handshake (DHE, ECDHE), SSH key exchange, VPN tunnels (IKE/IPsec), Signal Protocol (X3DH). Note: DH alone doesn't authenticate — it must be combined with certificates or signatures to prevent man-in-the-middle attacks.</p>
          </div>
        )}

        {/* ── COLOR MIXING ANALOGY ─────────────────────────────── */}
        <div className={panelClass}>
          <h2 className="text-sm font-bold text-violet-400 uppercase tracking-wider mb-4">Color Mixing Analogy</h2>
          <p className="text-xs text-slate-400 mb-4">Mixing paint is easy. <strong className="text-white">Unmixing</strong> it is nearly impossible — just like the discrete logarithm problem.</p>

          {/* Color pickers */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <label className={`${labelClass} block mb-2`}>Public Color</label>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg border border-slate-700" style={{ backgroundColor: publicColor }} />
                <input type="range" min={0} max={359} value={publicHue} onChange={e => setPublicHue(Number(e.target.value))} className="flex-1 accent-violet-500" />
              </div>
              <div className="flex gap-1 mt-1">
                {COLOR_PRESETS.map(c => (
                  <button key={c.label} onClick={() => setPublicHue(c.hue)} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700 hover:text-white">{c.label}</button>
                ))}
              </div>
            </div>
            <div>
              <label className={`${labelClass} block mb-2`}>Alice's Secret</label>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg border border-slate-700" style={{ backgroundColor: aliceSecretColor }} />
                <input type="range" min={0} max={359} value={aliceSecretHue} onChange={e => setAliceSecretHue(Number(e.target.value))} className="flex-1 accent-violet-500" />
              </div>
            </div>
            <div>
              <label className={`${labelClass} block mb-2`}>Bob's Secret</label>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg border border-slate-700" style={{ backgroundColor: bobSecretColor }} />
                <input type="range" min={0} max={359} value={bobSecretHue} onChange={e => setBobSecretHue(Number(e.target.value))} className="flex-1 accent-violet-500" />
              </div>
            </div>
          </div>

          {/* Color exchange visualization */}
          <div className="grid grid-cols-3 gap-6">
            {/* Alice */}
            <div className="space-y-3 text-center">
              <div className="text-sm font-bold text-violet-300">Alice</div>
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-8 h-8 rounded" style={{ backgroundColor: publicColor }} />
                  <span className="text-slate-600 text-xs">+</span>
                  <div className="w-8 h-8 rounded" style={{ backgroundColor: aliceSecretColor }} />
                  <span className="text-slate-600 text-xs">=</span>
                  <div className="w-8 h-8 rounded border-2 border-slate-600" style={{ backgroundColor: aliceMixedColor }} />
                </div>
                <div className="text-[10px] text-slate-500">public + secret → sends mix →</div>
              </div>
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="text-[10px] text-slate-500">← receives Bob's mix</div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-8 h-8 rounded border-2 border-slate-600" style={{ backgroundColor: bobMixedColor }} />
                  <span className="text-slate-600 text-xs">+</span>
                  <div className="w-8 h-8 rounded" style={{ backgroundColor: aliceSecretColor }} />
                  <span className="text-slate-600 text-xs">=</span>
                  <div className="w-10 h-10 rounded-lg border-2 border-violet-500 shadow-lg shadow-violet-500/20" style={{ backgroundColor: sharedColor }} />
                </div>
                <div className="text-xs font-bold text-violet-400">Shared Secret</div>
              </div>
            </div>

            {/* Public Channel / Eve */}
            <div className="space-y-3 text-center flex flex-col items-center justify-center">
              <div className="text-sm font-bold text-slate-500">Public Channel</div>
              <div className="border border-dashed border-slate-700 rounded-xl p-4 space-y-3">
                <div className="text-[10px] text-slate-600 uppercase tracking-wider">Eve can see:</div>
                <div className="flex items-center justify-center gap-3">
                  <div>
                    <div className="w-8 h-8 rounded mx-auto" style={{ backgroundColor: publicColor }} />
                    <div className="text-[10px] text-slate-600 mt-1">Public</div>
                  </div>
                  <div>
                    <div className="w-8 h-8 rounded mx-auto border-2 border-slate-600" style={{ backgroundColor: aliceMixedColor }} />
                    <div className="text-[10px] text-slate-600 mt-1">A's mix</div>
                  </div>
                  <div>
                    <div className="w-8 h-8 rounded mx-auto border-2 border-slate-600" style={{ backgroundColor: bobMixedColor }} />
                    <div className="text-[10px] text-slate-600 mt-1">B's mix</div>
                  </div>
                </div>
                <div className="text-[10px] text-red-400">Cannot unmix to find secrets!</div>
              </div>
            </div>

            {/* Bob */}
            <div className="space-y-3 text-center">
              <div className="text-sm font-bold text-violet-300">Bob</div>
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-8 h-8 rounded" style={{ backgroundColor: publicColor }} />
                  <span className="text-slate-600 text-xs">+</span>
                  <div className="w-8 h-8 rounded" style={{ backgroundColor: bobSecretColor }} />
                  <span className="text-slate-600 text-xs">=</span>
                  <div className="w-8 h-8 rounded border-2 border-slate-600" style={{ backgroundColor: bobMixedColor }} />
                </div>
                <div className="text-[10px] text-slate-500">← sends mix ← public + secret</div>
              </div>
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="text-[10px] text-slate-500">receives Alice's mix →</div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-8 h-8 rounded border-2 border-slate-600" style={{ backgroundColor: aliceMixedColor }} />
                  <span className="text-slate-600 text-xs">+</span>
                  <div className="w-8 h-8 rounded" style={{ backgroundColor: bobSecretColor }} />
                  <span className="text-slate-600 text-xs">=</span>
                  <div className="w-10 h-10 rounded-lg border-2 border-violet-500 shadow-lg shadow-violet-500/20" style={{ backgroundColor: sharedColor }} />
                </div>
                <div className="text-xs font-bold text-violet-400">Shared Secret</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── NUMERIC COMPUTATION ─────────────────────────────── */}
        <div className={panelClass}>
          <h2 className="text-sm font-bold text-violet-400 uppercase tracking-wider mb-4">Numeric Computation</h2>

          {/* Parameters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div>
              <label className={`${labelClass} block mb-1`}>Prime p</label>
              <input value={pStr} onChange={e => setPStr(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={`${labelClass} block mb-1`}>Generator g</label>
              <input value={gStr} onChange={e => setGStr(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={`${labelClass} block mb-1`}>Alice's secret a</label>
              <div className="flex gap-1">
                <input value={aStr} onChange={e => setAStr(e.target.value)} className={inputClass} />
                <button onClick={() => setAStr(randomSecret())} className="px-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-violet-400"><RefreshCw size={14} /></button>
              </div>
            </div>
            <div>
              <label className={`${labelClass} block mb-1`}>Bob's secret b</label>
              <div className="flex gap-1">
                <input value={bStr} onChange={e => setBStr(e.target.value)} className={inputClass} />
                <button onClick={() => setBStr(randomSecret())} className="px-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-violet-400"><RefreshCw size={14} /></button>
              </div>
            </div>
          </div>

          {/* Presets */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {PRESETS.map(pr => (
              <button key={pr.label} onClick={() => { setPStr(pr.p); setGStr(pr.g); setAStr(randomSecret()); setBStr(randomSecret()); }}
                className="px-3 py-1.5 text-xs font-mono bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:border-violet-700/50 hover:text-violet-400 transition-colors">
                {pr.label}
              </button>
            ))}
          </div>

          {/* Exchange visualization */}
          <div className="grid grid-cols-3 gap-4">
            {/* Alice's side */}
            <div className="bg-violet-950/20 border border-violet-900/30 rounded-xl p-4 space-y-3">
              <div className="text-sm font-bold text-violet-300 text-center">Alice</div>
              <div className="space-y-2 font-mono text-xs">
                <div className="text-slate-500">Secret: <span className="text-violet-400 font-bold">a = {aStr}</span></div>
                <div className="bg-slate-900/80 rounded-lg p-2">
                  <div className="text-slate-500">Computes:</div>
                  <div className="text-white">A = g<sup>a</sup> mod p</div>
                  <div className="text-white">A = {gStr}<sup>{aStr}</sup> mod {pStr}</div>
                  <div className="text-violet-300 font-bold">A = {A.toString()}</div>
                </div>
                <div className="text-slate-600 text-center text-[10px]">→ sends A to Bob →</div>
                <div className="bg-slate-900/80 rounded-lg p-2 border-t border-slate-800">
                  <div className="text-slate-500">Receives B = {B.toString()}</div>
                  <div className="text-white">s = B<sup>a</sup> mod p</div>
                  <div className="text-white">s = {B.toString()}<sup>{aStr}</sup> mod {pStr}</div>
                  <div className="text-emerald-400 font-bold text-base">s = {sharedAlice.toString()}</div>
                </div>
              </div>
            </div>

            {/* Public channel / Eve */}
            <div className="flex flex-col items-center justify-center space-y-4">
              <button onClick={() => setShowEve(!showEve)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-bold text-slate-400 hover:text-red-400 transition-colors">
                {showEve ? <Eye size={14} /> : <EyeOff size={14} />}
                Eve's View
              </button>
              {showEve && (
                <div className="border border-dashed border-red-900/50 bg-red-950/10 rounded-xl p-4 space-y-2 text-center w-full">
                  <div className="text-xs font-bold text-red-400 uppercase tracking-wider">Eavesdropper Sees</div>
                  <div className="font-mono text-xs space-y-1">
                    <div className="text-slate-400">p = <span className="text-white">{pStr}</span></div>
                    <div className="text-slate-400">g = <span className="text-white">{gStr}</span></div>
                    <div className="text-slate-400">A = <span className="text-white">{A.toString()}</span></div>
                    <div className="text-slate-400">B = <span className="text-white">{B.toString()}</span></div>
                  </div>
                  <div className="border-t border-red-900/30 pt-2 mt-2">
                    <div className="text-[10px] text-red-400">Must solve: find a such that</div>
                    <div className="font-mono text-xs text-red-300">{gStr}<sup>a</sup> ≡ {A.toString()} (mod {pStr})</div>
                    <div className="text-[10px] text-slate-600 mt-1">Discrete Log Problem — infeasible for large p</div>
                  </div>
                  {/* Brute force for small p */}
                  {p <= 1000n && (
                    <div className="border-t border-red-900/30 pt-2 mt-2">
                      <div className="text-[10px] text-amber-400">Small p — brute force possible!</div>
                      <div className="font-mono text-[10px] text-slate-500">
                        {(() => {
                          for (let i = 1n; i < p; i++) {
                            if (modPow(g, i, p) === A) return `a = ${i} (found by trying all values)`;
                          }
                          return 'no solution found';
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bob's side */}
            <div className="bg-violet-950/20 border border-violet-900/30 rounded-xl p-4 space-y-3">
              <div className="text-sm font-bold text-violet-300 text-center">Bob</div>
              <div className="space-y-2 font-mono text-xs">
                <div className="text-slate-500">Secret: <span className="text-violet-400 font-bold">b = {bStr}</span></div>
                <div className="bg-slate-900/80 rounded-lg p-2">
                  <div className="text-slate-500">Computes:</div>
                  <div className="text-white">B = g<sup>b</sup> mod p</div>
                  <div className="text-white">B = {gStr}<sup>{bStr}</sup> mod {pStr}</div>
                  <div className="text-violet-300 font-bold">B = {B.toString()}</div>
                </div>
                <div className="text-slate-600 text-center text-[10px]">← sends B to Alice ←</div>
                <div className="bg-slate-900/80 rounded-lg p-2 border-t border-slate-800">
                  <div className="text-slate-500">Receives A = {A.toString()}</div>
                  <div className="text-white">s = A<sup>b</sup> mod p</div>
                  <div className="text-white">s = {A.toString()}<sup>{bStr}</sup> mod {pStr}</div>
                  <div className="text-emerald-400 font-bold text-base">s = {sharedBob.toString()}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Result */}
          <div className={`mt-4 rounded-xl p-4 text-center ${keysMatch ? 'bg-emerald-950/30 border border-emerald-700/40' : 'bg-red-950/30 border border-red-700/40'}`}>
            <div className={`text-lg font-bold font-mono ${keysMatch ? 'text-emerald-400' : 'text-red-400'}`}>
              {keysMatch ? `Shared Secret: ${sharedAlice.toString()}` : 'Keys do not match — check inputs'}
            </div>
            {keysMatch && (
              <div className="text-xs text-slate-400 mt-1">
                B<sup>a</sup> mod p = A<sup>b</sup> mod p = g<sup>ab</sup> mod p = {sharedAlice.toString()}
              </div>
            )}
          </div>
        </div>

        {/* ── STEP-BY-STEP PROTOCOL ─────────────────────────── */}
        <div className={panelClass}>
          <h2 className="text-sm font-bold text-violet-400 uppercase tracking-wider mb-4">Protocol Steps</h2>
          <div className="space-y-3">
            {[
              { step: 1, label: 'Agree on public parameters', detail: `Alice and Bob publicly agree on prime p = ${pStr} and generator g = ${gStr}`, public: true },
              { step: 2, label: 'Alice picks secret', detail: `Alice randomly chooses secret a = ${aStr} (keeps this private)`, public: false },
              { step: 3, label: 'Bob picks secret', detail: `Bob randomly chooses secret b = ${bStr} (keeps this private)`, public: false },
              { step: 4, label: 'Alice sends public value', detail: `Alice computes A = ${gStr}^${aStr} mod ${pStr} = ${A.toString()} and sends it to Bob`, public: true },
              { step: 5, label: 'Bob sends public value', detail: `Bob computes B = ${gStr}^${bStr} mod ${pStr} = ${B.toString()} and sends it to Alice`, public: true },
              { step: 6, label: 'Alice computes shared secret', detail: `Alice computes s = ${B.toString()}^${aStr} mod ${pStr} = ${sharedAlice.toString()}`, public: false },
              { step: 7, label: 'Bob computes shared secret', detail: `Bob computes s = ${A.toString()}^${bStr} mod ${pStr} = ${sharedBob.toString()}`, public: false },
            ].map(s => (
              <div key={s.step} className="flex items-start gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${s.public ? 'bg-violet-950/50 text-violet-400 border border-violet-800' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                  {s.step}
                </div>
                <div>
                  <div className="text-sm font-medium text-white flex items-center gap-2">
                    {s.label}
                    {s.public ? <span className="text-[10px] text-violet-400 bg-violet-950/50 px-1.5 py-0.5 rounded border border-violet-800/50">PUBLIC</span>
                      : <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">SECRET</span>}
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">{s.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
