import React, { useState, useMemo, useCallback } from 'react';
import { Info, X, Play, RotateCcw } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────
type Point = { x: bigint; y: bigint } | 'infinity';
type RealPoint = { x: number; y: number };

// ── Finite‑field arithmetic ──────────────────────────────────────────
function mod(a: bigint, p: bigint): bigint { return ((a % p) + p) % p; }

function modInverse(a: bigint, p: bigint): bigint {
  let [old_r, r] = [a, p];
  let [old_s, s] = [1n, 0n];
  while (r !== 0n) {
    const q = old_r / r;
    [old_r, r] = [r, old_r - q * r];
    [old_s, s] = [s, old_s - q * s];
  }
  return mod(old_s, p);
}

function pointAdd(P: Point, Q: Point, a: bigint, p: bigint): Point {
  if (P === 'infinity') return Q;
  if (Q === 'infinity') return P;
  if (P.x === Q.x && mod(P.y + Q.y, p) === 0n) return 'infinity';
  let lam: bigint;
  if (P.x === Q.x && P.y === Q.y) {
    lam = mod((3n * P.x * P.x + a) * modInverse(2n * P.y, p), p);
  } else {
    lam = mod((Q.y - P.y) * modInverse(mod(Q.x - P.x, p), p), p);
  }
  const xr = mod(lam * lam - P.x - Q.x, p);
  const yr = mod(lam * (P.x - xr) - P.y, p);
  return { x: xr, y: yr };
}

function scalarMul(k: bigint, P: Point, a: bigint, p: bigint): Point {
  let result: Point = 'infinity';
  let addend: Point = P;
  let n = k;
  while (n > 0n) {
    if (n & 1n) result = pointAdd(result, addend, a, p);
    addend = pointAdd(addend, addend, a, p);
    n >>= 1n;
  }
  return result;
}

function scalarMulSteps(k: number, P: Point, a: bigint, p: bigint): Point[] {
  const steps: Point[] = [];
  let current: Point = 'infinity';
  for (let i = 0; i < k; i++) {
    current = pointAdd(current, P, a, p);
    steps.push(current);
  }
  return steps;
}

function findAllPoints(a: bigint, b: bigint, p: bigint): { x: bigint; y: bigint }[] {
  const pts: { x: bigint; y: bigint }[] = [];
  for (let x = 0n; x < p; x++) {
    const rhs = mod(x * x * x + a * x + b, p);
    for (let y = 0n; y < p; y++) {
      if (mod(y * y, p) === rhs) pts.push({ x, y });
    }
  }
  return pts;
}

function findGenerator(pts: { x: bigint; y: bigint }[], a: bigint, p: bigint): { x: bigint; y: bigint } | null {
  const order = pts.length + 1; // +1 for infinity
  for (const g of pts) {
    const result = scalarMul(BigInt(order), g, a, p);
    if (result === 'infinity') return g;
  }
  return pts[0] || null;
}

// ── Real‑number curve helpers ────────────────────────────────────────
function curveY(x: number, a: number, b: number): number | null {
  const v = x * x * x + a * x + b;
  return v >= 0 ? Math.sqrt(v) : null;
}

function sampleCurve(a: number, b: number, xMin: number, xMax: number, steps: number): RealPoint[][] {
  const segments: RealPoint[][] = [];
  let seg: RealPoint[] = [];
  const dx = (xMax - xMin) / steps;
  for (let i = 0; i <= steps; i++) {
    const x = xMin + i * dx;
    const y = curveY(x, a, b);
    if (y !== null && isFinite(y)) {
      seg.push({ x, y });
    } else {
      if (seg.length > 1) segments.push(seg);
      seg = [];
    }
  }
  if (seg.length > 1) segments.push(seg);
  return segments;
}

function realPointAdd(P: RealPoint, Q: RealPoint, a: number): RealPoint | null {
  let lam: number;
  if (Math.abs(P.x - Q.x) < 1e-10) {
    if (Math.abs(P.y - Q.y) < 1e-10) {
      if (Math.abs(P.y) < 1e-10) return null;
      lam = (3 * P.x * P.x + a) / (2 * P.y);
    } else return null;
  } else {
    lam = (Q.y - P.y) / (Q.x - P.x);
  }
  const xr = lam * lam - P.x - Q.x;
  const yr = lam * (P.x - xr) - P.y;
  return { x: xr, y: yr };
}

// ── Presets ──────────────────────────────────────────────────────────
const REAL_PRESETS = [
  { label: 'y²=x³−x+1', a: -1, b: 1 },
  { label: 'y²=x³−3x+5', a: -3, b: 5 },
  { label: 'y²=x³+1', a: 0, b: 1 },
  { label: 'y²=x³−2x+2', a: -2, b: 2 },
];

const FIELD_PRESETS = [
  { label: 'p=23, a=1, b=1', p: 23, a: 1, b: 1 },
  { label: 'p=37, a=2, b=3', p: 37, a: 2, b: 3 },
  { label: 'p=97, a=2, b=3', p: 97, a: 2, b: 3 },
];

type Tab = 'curve' | 'field' | 'ecdh';

// ── Component ────────────────────────────────────────────────────────
const App: React.FC = () => {
  const [showInfo, setShowInfo] = useState(false);
  const [tab, setTab] = useState<Tab>('curve');

  // Real curve state
  const [rA, setRA] = useState(-1);
  const [rB, setRB] = useState(1);
  const [clickedPoints, setClickedPoints] = useState<RealPoint[]>([]);
  const [scalarK, setScalarK] = useState(1);
  const [animStep, setAnimStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Finite field state
  const [fp, setFp] = useState(23);
  const [fa, setFa] = useState(1);
  const [fb, setFb] = useState(1);
  const [showCyclic, setShowCyclic] = useState(false);

  // ECDH state
  const [ecdhSecret, setEcdhSecret] = useState({ a: 7, b: 11 });

  const inputClass = 'bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-3 font-mono text-sm text-white focus:outline-none focus:border-violet-700/50 w-full';
  const panelClass = 'bg-slate-900/60 border border-slate-800 rounded-xl p-5';
  const labelClass = 'text-xs font-bold text-slate-400 uppercase tracking-wider';

  // ── Real curve SVG ─────────────────────────────────────────────────
  const svgW = 500, svgH = 400;
  const xRange = [-4, 4] as const, yRange = [-5, 5] as const;
  const toSvgX = (x: number) => ((x - xRange[0]) / (xRange[1] - xRange[0])) * svgW;
  const toSvgY = (y: number) => svgH - ((y - yRange[0]) / (yRange[1] - yRange[0])) * svgH;
  const fromSvgX = (sx: number) => xRange[0] + (sx / svgW) * (xRange[1] - xRange[0]);
  const fromSvgY = (sy: number) => yRange[1] - (sy / svgH) * (yRange[1] - yRange[0]);

  const segments = useMemo(() => sampleCurve(rA, rB, xRange[0], xRange[1], 800), [rA, rB]);

  const addResult = useMemo(() => {
    if (clickedPoints.length < 2) return null;
    const [P, Q] = clickedPoints;
    return realPointAdd(P, Q, rA);
  }, [clickedPoints, rA]);

  const basePoint: RealPoint | null = useMemo(() => {
    for (const seg of segments) {
      for (const pt of seg) if (pt.y > 0.3) return pt;
    }
    return segments[0]?.[Math.floor(segments[0].length / 2)] ?? null;
  }, [segments]);

  const scalarPoints = useMemo(() => {
    if (!basePoint) return [];
    const pts: RealPoint[] = [basePoint];
    let current = basePoint;
    for (let i = 1; i < scalarK; i++) {
      const next = realPointAdd(current, basePoint, rA);
      if (!next || !isFinite(next.x) || !isFinite(next.y)) break;
      pts.push(next);
      current = next;
    }
    return pts;
  }, [basePoint, scalarK, rA]);

  const handleSvgClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const mx = fromSvgX(sx * (svgW / rect.width));
    const my = fromSvgY(sy * (svgH / rect.height));
    const yVal = curveY(mx, rA, rB);
    if (yVal === null) return;
    const snapY = Math.abs(my - yVal) < Math.abs(my + yVal) ? yVal : -yVal;
    const pt: RealPoint = { x: mx, y: snapY };
    setClickedPoints(prev => prev.length >= 2 ? [pt] : [...prev, pt]);
  }, [rA, rB]);

  const animateScalar = useCallback(() => {
    setIsAnimating(true);
    setAnimStep(0);
    let step = 0;
    const iv = setInterval(() => {
      step++;
      setAnimStep(step);
      if (step >= scalarK) { clearInterval(iv); setIsAnimating(false); }
    }, 500);
  }, [scalarK]);

  // ── Finite field computed ──────────────────────────────────────────
  const fieldPoints = useMemo(() => findAllPoints(BigInt(fa), BigInt(fb), BigInt(fp)), [fa, fb, fp]);
  const generator = useMemo(() => findGenerator(fieldPoints, BigInt(fa), BigInt(fp)), [fieldPoints, fa, fp]);
  const cyclicPath = useMemo(() => {
    if (!generator || !showCyclic) return [];
    return scalarMulSteps(fieldPoints.length + 1, generator, BigInt(fa), BigInt(fp));
  }, [generator, showCyclic, fieldPoints.length, fa, fp]);

  // ── ECDH computed ──────────────────────────────────────────────────
  const ecdhG = generator;
  const ecdhAPublic = useMemo(() => ecdhG ? scalarMul(BigInt(ecdhSecret.a), ecdhG, BigInt(fa), BigInt(fp)) : 'infinity' as Point, [ecdhG, ecdhSecret.a, fa, fp]);
  const ecdhBPublic = useMemo(() => ecdhG ? scalarMul(BigInt(ecdhSecret.b), ecdhG, BigInt(fa), BigInt(fp)) : 'infinity' as Point, [ecdhG, ecdhSecret.b, fa, fp]);
  const ecdhSharedA = useMemo(() => ecdhBPublic !== 'infinity' ? scalarMul(BigInt(ecdhSecret.a), ecdhBPublic, BigInt(fa), BigInt(fp)) : 'infinity' as Point, [ecdhBPublic, ecdhSecret.a, fa, fp]);
  const ecdhSharedB = useMemo(() => ecdhAPublic !== 'infinity' ? scalarMul(BigInt(ecdhSecret.b), ecdhAPublic, BigInt(fa), BigInt(fp)) : 'infinity' as Point, [ecdhAPublic, ecdhSecret.b, fa, fp]);
  const ecdhStepsA = useMemo(() => ecdhG ? scalarMulSteps(ecdhSecret.a, ecdhG, BigInt(fa), BigInt(fp)) : [], [ecdhG, ecdhSecret.a, fa, fp]);

  const fmtPt = (p: Point) => p === 'infinity' ? 'O (infinity)' : `(${p.x}, ${p.y})`;

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="flex-1 bg-[#1a1814] text-white flex flex-col items-center px-6 py-4 sm:px-10 md:px-16 md:py-8">
      <div className="w-full max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-violet-400">Elliptic Curve Cryptography</h1>
            <p className="text-sm text-slate-400 mt-1">Point addition on elliptic curves — the foundation of modern key exchange</p>
          </div>
          <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-violet-700/50 transition-colors">
            {showInfo ? <X size={20} className="text-violet-400" /> : <Info size={20} className="text-violet-400" />}
          </button>
        </div>

        {showInfo && (
          <div className="bg-violet-950/20 border border-violet-900/40 rounded-xl p-6 space-y-3 text-sm text-slate-300 leading-relaxed">
            <h2 className="text-base font-bold text-violet-400">About Elliptic Curve Cryptography</h2>
            <p>Independently proposed by <strong className="text-white">Neal Koblitz</strong> and <strong className="text-white">Victor Miller</strong> in 1985, ECC uses the algebraic structure of elliptic curves over finite fields for cryptography. The key insight: point addition on an elliptic curve forms a group, and the <strong className="text-white">Elliptic Curve Discrete Logarithm Problem</strong> (ECDLP) — given points P and Q = kP, finding k — is computationally infeasible.</p>
            <p><strong className="text-white">Why ECC?</strong> A 256-bit ECC key provides security equivalent to a 3072-bit RSA key, enabling much smaller keys, faster computation, and lower bandwidth — critical for mobile and IoT devices.</p>
            <p><strong className="text-white">Used in:</strong> Bitcoin &amp; Ethereum (secp256k1), TLS 1.3 (X25519, P-256), Signal Protocol (Curve25519), SSH (Ed25519), Apple iMessage, WhatsApp.</p>
            <p><strong className="text-white">Curve25519</strong> by <strong className="text-white">Daniel J. Bernstein</strong> (2006) was designed for high performance and resistance to side-channel attacks, and is now the most widely deployed ECC curve.</p>
            <div className="bg-slate-900/60 rounded-lg p-3 font-mono text-xs">
              <div className="text-violet-400 mb-1">Key size comparison (equivalent security):</div>
              <div className="text-slate-400">ECC 256-bit &asymp; RSA 3072-bit &asymp; AES 128-bit</div>
              <div className="text-slate-400">ECC 384-bit &asymp; RSA 7680-bit &asymp; AES 192-bit</div>
              <div className="text-slate-400">ECC 521-bit &asymp; RSA 15360-bit &asymp; AES 256-bit</div>
            </div>
          </div>
        )}

        {/* Tab bar */}
        <div className="flex gap-2">
          {([['curve', 'Real Curve'], ['field', 'Finite Field'], ['ecdh', 'ECDH Exchange']] as [Tab, string][]).map(([t, l]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${tab === t ? 'bg-violet-950/40 text-violet-400 border border-violet-800' : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:border-violet-700/50'}`}>
              {l}
            </button>
          ))}
        </div>

        {/* ═══ TAB A: Real Curve ═══ */}
        {tab === 'curve' && (
          <>
            <div className={panelClass}>
              <h2 className="text-sm font-bold text-violet-400 uppercase tracking-wider mb-4">Curve Parameters: y&sup2; = x&sup3; + ax + b</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div>
                  <label className={`${labelClass} block mb-1`}>a = {rA}</label>
                  <input type="range" min={-5} max={5} step={0.5} value={rA} onChange={e => { setRA(Number(e.target.value)); setClickedPoints([]); }} className="w-full accent-violet-500" />
                </div>
                <div>
                  <label className={`${labelClass} block mb-1`}>b = {rB}</label>
                  <input type="range" min={-5} max={10} step={0.5} value={rB} onChange={e => { setRB(Number(e.target.value)); setClickedPoints([]); }} className="w-full accent-violet-500" />
                </div>
                <div className="col-span-2">
                  <label className={`${labelClass} block mb-1`}>Presets</label>
                  <div className="flex gap-2 flex-wrap">
                    {REAL_PRESETS.map(pr => (
                      <button key={pr.label} onClick={() => { setRA(pr.a); setRB(pr.b); setClickedPoints([]); }}
                        className="px-3 py-1.5 text-xs font-mono bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:border-violet-700/50 hover:text-violet-400 transition-colors">
                        {pr.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {4 * rA * rA * rA + 27 * rB * rB === 0 && (
                <div className="text-xs text-amber-400 mb-3">Singular curve (4a&sup3;+27b&sup2;=0) — not suitable for cryptography.</div>
              )}

              {/* SVG */}
              <div className="bg-slate-950/60 rounded-xl p-2 border border-slate-800 overflow-hidden">
                <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" style={{ maxHeight: 440 }} onClick={handleSvgClick}>
                  <defs>
                    <linearGradient id="curveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#a78bfa" />
                      <stop offset="100%" stopColor="#7c3aed" />
                    </linearGradient>
                  </defs>
                  {/* Grid */}
                  {Array.from({ length: 9 }, (_, i) => i - 4).map(v => (
                    <React.Fragment key={`g${v}`}>
                      <line x1={toSvgX(v)} y1={0} x2={toSvgX(v)} y2={svgH} stroke="#334155" strokeWidth={v === 0 ? 1.5 : 0.5} />
                      {v >= yRange[0] && v <= yRange[1] && (
                        <line x1={0} y1={toSvgY(v)} x2={svgW} y2={toSvgY(v)} stroke="#334155" strokeWidth={v === 0 ? 1.5 : 0.5} />
                      )}
                    </React.Fragment>
                  ))}
                  {/* Axis labels */}
                  {[-3, -2, -1, 1, 2, 3].map(v => (
                    <React.Fragment key={`lbl${v}`}>
                      <text x={toSvgX(v)} y={toSvgY(0) + 14} textAnchor="middle" fill="#64748b" fontSize={10}>{v}</text>
                      {v >= -4 && v <= 4 && <text x={toSvgX(0) - 10} y={toSvgY(v) + 4} textAnchor="end" fill="#64748b" fontSize={10}>{v}</text>}
                    </React.Fragment>
                  ))}
                  {/* Curve (upper + lower) */}
                  {segments.map((seg, si) => (
                    <React.Fragment key={`seg${si}`}>
                      <polyline fill="none" stroke="url(#curveGrad)" strokeWidth={2.5} strokeLinecap="round"
                        points={seg.map(p => `${toSvgX(p.x)},${toSvgY(p.y)}`).join(' ')} />
                      <polyline fill="none" stroke="url(#curveGrad)" strokeWidth={2.5} strokeLinecap="round"
                        points={seg.map(p => `${toSvgX(p.x)},${toSvgY(-p.y)}`).join(' ')} />
                    </React.Fragment>
                  ))}
                  {/* Point addition visualization */}
                  {clickedPoints.map((pt, i) => (
                    <React.Fragment key={`cp${i}`}>
                      <circle cx={toSvgX(pt.x)} cy={toSvgY(pt.y)} r={6} fill={i === 0 ? '#f59e0b' : '#3b82f6'} stroke="white" strokeWidth={2} />
                      <text x={toSvgX(pt.x) + 10} y={toSvgY(pt.y) - 8} fill={i === 0 ? '#f59e0b' : '#3b82f6'} fontSize={12} fontWeight="bold">{i === 0 ? 'P' : 'Q'}</text>
                    </React.Fragment>
                  ))}
                  {clickedPoints.length === 2 && addResult && (
                    <>
                      {/* Line through P and Q */}
                      <line x1={toSvgX(clickedPoints[0].x - 5)} y1={toSvgY(clickedPoints[0].y - 5 * ((clickedPoints[1].y - clickedPoints[0].y) / (clickedPoints[1].x - clickedPoints[0].x || 1e-10)))}
                        x2={toSvgX(clickedPoints[1].x + 5)} y2={toSvgY(clickedPoints[1].y + 5 * ((clickedPoints[1].y - clickedPoints[0].y) / (clickedPoints[1].x - clickedPoints[0].x || 1e-10)))}
                        stroke="#ef4444" strokeWidth={1} strokeDasharray="6,3" opacity={0.7} />
                      {/* R' (unreflected) */}
                      <circle cx={toSvgX(addResult.x)} cy={toSvgY(-addResult.y)} r={5} fill="none" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="3,2" />
                      <text x={toSvgX(addResult.x) + 10} y={toSvgY(-addResult.y) - 8} fill="#ef4444" fontSize={11}>R'</text>
                      {/* Reflection line */}
                      <line x1={toSvgX(addResult.x)} y1={toSvgY(-addResult.y)} x2={toSvgX(addResult.x)} y2={toSvgY(addResult.y)} stroke="#10b981" strokeWidth={1.5} strokeDasharray="4,3" />
                      {/* R = P+Q */}
                      <circle cx={toSvgX(addResult.x)} cy={toSvgY(addResult.y)} r={7} fill="#10b981" stroke="white" strokeWidth={2} />
                      <text x={toSvgX(addResult.x) + 10} y={toSvgY(addResult.y) - 8} fill="#10b981" fontSize={12} fontWeight="bold">P+Q</text>
                    </>
                  )}
                  {clickedPoints.length === 2 && clickedPoints[0].x === clickedPoints[1].x && clickedPoints[0].y === clickedPoints[1].y && addResult && (
                    <text x={toSvgX(clickedPoints[0].x) + 10} y={toSvgY(clickedPoints[0].y) + 18} fill="#f59e0b" fontSize={10}>tangent (doubling)</text>
                  )}
                  {/* Scalar multiplication points */}
                  {scalarPoints.slice(0, animStep || scalarPoints.length).map((pt, i) => (
                    <React.Fragment key={`sm${i}`}>
                      <circle cx={toSvgX(pt.x)} cy={toSvgY(pt.y)} r={5} fill="#c084fc" stroke="white" strokeWidth={1.5} opacity={0.7 + 0.3 * (i / scalarPoints.length)} />
                      <text x={toSvgX(pt.x) + 8} y={toSvgY(pt.y) - 6} fill="#c084fc" fontSize={9} opacity={0.8}>{i + 1}P</text>
                    </React.Fragment>
                  ))}
                </svg>
              </div>
              <p className="text-xs text-slate-500 mt-2">Click on the curve to place points P and Q. The geometric addition P+Q is shown automatically.</p>
            </div>

            {/* Scalar multiplication controls */}
            <div className={panelClass}>
              <h2 className="text-sm font-bold text-violet-400 uppercase tracking-wider mb-3">Scalar Multiplication (kP)</h2>
              <p className="text-xs text-slate-400 mb-3">Repeated point addition: 3P = P + P + P. This is the "trapdoor" — easy to compute kP, hard to find k given P and kP.</p>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className={`${labelClass} block mb-1`}>k = {scalarK}</label>
                  <input type="range" min={1} max={20} value={scalarK} onChange={e => { setScalarK(Number(e.target.value)); setAnimStep(0); }} className="w-full accent-violet-500" />
                </div>
                <button onClick={animateScalar} disabled={isAnimating}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-950/40 border border-violet-800 text-violet-400 text-sm font-bold hover:bg-violet-900/40 transition-colors disabled:opacity-40">
                  <Play size={14} /> Animate
                </button>
                <button onClick={() => setAnimStep(0)}
                  className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-violet-400 transition-colors">
                  <RotateCcw size={14} />
                </button>
              </div>
              {basePoint && (
                <div className="text-xs text-slate-500 mt-2 font-mono">
                  Base point P = ({basePoint.x.toFixed(2)}, {basePoint.y.toFixed(2)}) &mdash; showing {animStep || scalarPoints.length} of {scalarK} multiples
                </div>
              )}
            </div>
          </>
        )}

        {/* ═══ TAB B: Finite Field ═══ */}
        {tab === 'field' && (
          <>
            <div className={panelClass}>
              <h2 className="text-sm font-bold text-violet-400 uppercase tracking-wider mb-4">Curve over GF(p): y&sup2; &equiv; x&sup3; + ax + b (mod p)</h2>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4">
                <div>
                  <label className={`${labelClass} block mb-1`}>Prime p</label>
                  <input value={fp} onChange={e => setFp(Math.max(3, Number(e.target.value) || 3))} className={inputClass} type="number" />
                </div>
                <div>
                  <label className={`${labelClass} block mb-1`}>a</label>
                  <input value={fa} onChange={e => setFa(Number(e.target.value) || 0)} className={inputClass} type="number" />
                </div>
                <div>
                  <label className={`${labelClass} block mb-1`}>b</label>
                  <input value={fb} onChange={e => setFb(Number(e.target.value) || 0)} className={inputClass} type="number" />
                </div>
                <div className="col-span-3">
                  <label className={`${labelClass} block mb-1`}>Presets</label>
                  <div className="flex gap-2 flex-wrap">
                    {FIELD_PRESETS.map(pr => (
                      <button key={pr.label} onClick={() => { setFp(pr.p); setFa(pr.a); setFb(pr.b); setShowCyclic(false); }}
                        className="px-3 py-1.5 text-xs font-mono bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:border-violet-700/50 hover:text-violet-400 transition-colors">
                        {pr.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Scatter plot */}
              <div className="bg-slate-950/60 rounded-xl p-2 border border-slate-800 overflow-hidden">
                <svg viewBox={`0 0 ${fp * 6 + 40} ${fp * 6 + 40}`} className="w-full" style={{ maxHeight: 440 }}>
                  {/* Grid lines */}
                  {Array.from({ length: fp }, (_, i) => (
                    <React.Fragment key={`fg${i}`}>
                      <line x1={30} y1={i * 6 + 20} x2={fp * 6 + 30} y2={i * 6 + 20} stroke="#1e293b" strokeWidth={0.5} />
                      <line x1={i * 6 + 30} y1={10} x2={i * 6 + 30} y2={fp * 6 + 20} stroke="#1e293b" strokeWidth={0.5} />
                    </React.Fragment>
                  ))}
                  {/* Axis labels (every 5) */}
                  {Array.from({ length: Math.ceil(fp / 5) }, (_, i) => i * 5).map(v => (
                    <React.Fragment key={`flbl${v}`}>
                      <text x={v * 6 + 30} y={fp * 6 + 35} textAnchor="middle" fill="#64748b" fontSize={8}>{v}</text>
                      <text x={22} y={(fp - v) * 6 + 22} textAnchor="end" fill="#64748b" fontSize={8}>{v}</text>
                    </React.Fragment>
                  ))}
                  {/* Points */}
                  {fieldPoints.map((pt, i) => {
                    const isCyclicPt = showCyclic && cyclicPath.some(cp => cp !== 'infinity' && (cp as {x:bigint;y:bigint}).x === pt.x && (cp as {x:bigint;y:bigint}).y === pt.y);
                    return (
                      <circle key={`fp${i}`} cx={Number(pt.x) * 6 + 30} cy={(fp - Number(pt.y)) * 6 + 20} r={fp > 50 ? 2 : 3}
                        fill={isCyclicPt ? '#c084fc' : '#7c3aed'} opacity={isCyclicPt ? 1 : 0.6} />
                    );
                  })}
                  {/* Cyclic path lines */}
                  {showCyclic && cyclicPath.length > 1 && cyclicPath.filter(p => p !== 'infinity').map((pt, i, arr) => {
                    if (i === 0) return null;
                    const prev = arr[i - 1] as { x: bigint; y: bigint };
                    const cur = pt as { x: bigint; y: bigint };
                    return (
                      <line key={`cl${i}`}
                        x1={Number(prev.x) * 6 + 30} y1={(fp - Number(prev.y)) * 6 + 20}
                        x2={Number(cur.x) * 6 + 30} y2={(fp - Number(cur.y)) * 6 + 20}
                        stroke="#c084fc" strokeWidth={0.8} opacity={0.4} />
                    );
                  })}
                  {/* Generator highlight */}
                  {showCyclic && generator && (
                    <circle cx={Number(generator.x) * 6 + 30} cy={(fp - Number(generator.y)) * 6 + 20} r={fp > 50 ? 4 : 6}
                      fill="none" stroke="#f59e0b" strokeWidth={2} />
                  )}
                </svg>
              </div>

              <div className="flex items-center justify-between mt-3">
                <div className="text-xs text-slate-400 font-mono">
                  {fieldPoints.length} points + point at infinity = group order {fieldPoints.length + 1}
                </div>
                <button onClick={() => setShowCyclic(!showCyclic)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${showCyclic ? 'bg-violet-950/40 text-violet-400 border-violet-800' : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-violet-700/50'}`}>
                  {showCyclic ? 'Hide' : 'Show'} Cyclic Group
                </button>
              </div>
              {showCyclic && generator && (
                <div className="mt-3 bg-slate-900/80 rounded-lg p-3 text-xs font-mono text-slate-400 max-h-32 overflow-y-auto">
                  <span className="text-violet-400">Generator G = ({generator.x.toString()}, {generator.y.toString()})</span>
                  <div className="mt-1 space-y-0.5">
                    {cyclicPath.map((pt, i) => (
                      <span key={i} className="inline-block mr-3">
                        <span className="text-slate-500">{i + 1}G=</span>
                        <span className="text-white">{fmtPt(pt)}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Finite field point addition */}
            <div className={panelClass}>
              <h2 className="text-sm font-bold text-violet-400 uppercase tracking-wider mb-3">Point Addition over GF({fp})</h2>
              <p className="text-xs text-slate-400 mb-3">All arithmetic is modular: division uses the modular inverse (extended Euclidean algorithm).</p>
              {fieldPoints.length >= 2 && (() => {
                const P = fieldPoints[0], Q = fieldPoints[Math.min(1, fieldPoints.length - 1)];
                const R = pointAdd(P, Q, BigInt(fa), BigInt(fp));
                const dx = mod(Q.x - P.x, BigInt(fp));
                const dy = mod(Q.y - P.y, BigInt(fp));
                const inv = dx !== 0n ? modInverse(dx, BigInt(fp)) : 0n;
                const lam = dx !== 0n ? mod(dy * inv, BigInt(fp)) : 0n;
                return (
                  <div className="bg-slate-900/80 rounded-lg p-4 font-mono text-xs space-y-2">
                    <div><span className="text-slate-500">P = </span><span className="text-amber-400">({P.x.toString()}, {P.y.toString()})</span></div>
                    <div><span className="text-slate-500">Q = </span><span className="text-blue-400">({Q.x.toString()}, {Q.y.toString()})</span></div>
                    <div className="border-t border-slate-800 pt-2">
                      <div className="text-slate-500">&lambda; = (y&sub2;-y&sub1;) &middot; (x&sub2;-x&sub1;)&sup-;&sup1; mod p</div>
                      <div className="text-white">&lambda; = {dy.toString()} &middot; {dx.toString()}&sup-;&sup1; mod {fp} = {dy.toString()} &middot; {inv.toString()} mod {fp} = <span className="text-violet-400">{lam.toString()}</span></div>
                    </div>
                    <div className="border-t border-slate-800 pt-2">
                      <div className="text-slate-500">x&sub3; = &lambda;&sup2; - x&sub1; - x&sub2; mod p</div>
                      <div className="text-slate-500">y&sub3; = &lambda;(x&sub1; - x&sub3;) - y&sub1; mod p</div>
                      <div className="text-emerald-400 font-bold">P + Q = {fmtPt(R)}</div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </>
        )}

        {/* ═══ TAB C: ECDH ═══ */}
        {tab === 'ecdh' && (
          <>
            <div className={panelClass}>
              <h2 className="text-sm font-bold text-violet-400 uppercase tracking-wider mb-4">ECDH Key Exchange</h2>
              <p className="text-xs text-slate-400 mb-4">
                Elliptic Curve Diffie-Hellman: Alice and Bob agree on a curve and base point G, then use scalar multiplication to establish a shared secret — just like classic DH, but with elliptic curve points instead of modular exponentiation.
              </p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className={`${labelClass} block mb-1`}>Curve (same as Finite Field tab)</label>
                  <div className="text-xs font-mono text-slate-400">y&sup2; &equiv; x&sup3; + {fa}x + {fb} mod {fp}</div>
                </div>
                <div>
                  <label className={`${labelClass} block mb-1`}>Base Point G</label>
                  <div className="text-xs font-mono text-violet-400">{generator ? `(${generator.x}, ${generator.y})` : 'none found'}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div>
                  <label className={`${labelClass} block mb-1`}>Alice's secret (a)</label>
                  <input type="number" min={1} max={fieldPoints.length} value={ecdhSecret.a} onChange={e => setEcdhSecret(s => ({ ...s, a: Math.max(1, Number(e.target.value) || 1) }))} className={inputClass} />
                </div>
                <div>
                  <label className={`${labelClass} block mb-1`}>Bob's secret (b)</label>
                  <input type="number" min={1} max={fieldPoints.length} value={ecdhSecret.b} onChange={e => setEcdhSecret(s => ({ ...s, b: Math.max(1, Number(e.target.value) || 1) }))} className={inputClass} />
                </div>
              </div>

              {/* Exchange visualization */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-violet-950/20 border border-violet-900/30 rounded-xl p-4 space-y-3">
                  <div className="text-sm font-bold text-violet-300 text-center">Alice</div>
                  <div className="space-y-2 font-mono text-xs">
                    <div className="text-slate-500">Secret: <span className="text-violet-400 font-bold">a = {ecdhSecret.a}</span></div>
                    <div className="bg-slate-900/80 rounded-lg p-2">
                      <div className="text-slate-500">Computes aG:</div>
                      <div className="text-white">{ecdhSecret.a} &times; G = {ecdhSecret.a} &times; {generator ? `(${generator.x}, ${generator.y})` : '?'}</div>
                      <div className="text-violet-300 font-bold">A = {fmtPt(ecdhAPublic)}</div>
                    </div>
                    <div className="text-slate-600 text-center text-[10px]">sends A to Bob</div>
                    <div className="bg-slate-900/80 rounded-lg p-2 border-t border-slate-800">
                      <div className="text-slate-500">Receives B = {fmtPt(ecdhBPublic)}</div>
                      <div className="text-white">a &times; B = {ecdhSecret.a} &times; {fmtPt(ecdhBPublic)}</div>
                      <div className="text-emerald-400 font-bold text-sm">s = {fmtPt(ecdhSharedA)}</div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="text-sm font-bold text-slate-500">Public Channel</div>
                  <div className="border border-dashed border-slate-700 rounded-xl p-4 space-y-2 text-center w-full">
                    <div className="text-[10px] text-slate-600 uppercase tracking-wider">Eve can see:</div>
                    <div className="font-mono text-xs space-y-1">
                      <div className="text-slate-400">Curve: y&sup2;=x&sup3;+{fa}x+{fb} mod {fp}</div>
                      <div className="text-slate-400">G = {generator ? `(${generator.x}, ${generator.y})` : '?'}</div>
                      <div className="text-slate-400">A = {fmtPt(ecdhAPublic)}</div>
                      <div className="text-slate-400">B = {fmtPt(ecdhBPublic)}</div>
                    </div>
                    <div className="border-t border-slate-800 pt-2 mt-2">
                      <div className="text-[10px] text-red-400">Must solve ECDLP:</div>
                      <div className="font-mono text-[10px] text-red-300">find a such that aG = A</div>
                    </div>
                  </div>
                </div>

                <div className="bg-violet-950/20 border border-violet-900/30 rounded-xl p-4 space-y-3">
                  <div className="text-sm font-bold text-violet-300 text-center">Bob</div>
                  <div className="space-y-2 font-mono text-xs">
                    <div className="text-slate-500">Secret: <span className="text-violet-400 font-bold">b = {ecdhSecret.b}</span></div>
                    <div className="bg-slate-900/80 rounded-lg p-2">
                      <div className="text-slate-500">Computes bG:</div>
                      <div className="text-white">{ecdhSecret.b} &times; G = {ecdhSecret.b} &times; {generator ? `(${generator.x}, ${generator.y})` : '?'}</div>
                      <div className="text-violet-300 font-bold">B = {fmtPt(ecdhBPublic)}</div>
                    </div>
                    <div className="text-slate-600 text-center text-[10px]">sends B to Alice</div>
                    <div className="bg-slate-900/80 rounded-lg p-2 border-t border-slate-800">
                      <div className="text-slate-500">Receives A = {fmtPt(ecdhAPublic)}</div>
                      <div className="text-white">b &times; A = {ecdhSecret.b} &times; {fmtPt(ecdhAPublic)}</div>
                      <div className="text-emerald-400 font-bold text-sm">s = {fmtPt(ecdhSharedB)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Result */}
              {(() => {
                const match = ecdhSharedA !== 'infinity' && ecdhSharedB !== 'infinity' &&
                  (ecdhSharedA as {x:bigint;y:bigint}).x === (ecdhSharedB as {x:bigint;y:bigint}).x &&
                  (ecdhSharedA as {x:bigint;y:bigint}).y === (ecdhSharedB as {x:bigint;y:bigint}).y;
                return (
                  <div className={`mt-4 rounded-xl p-4 text-center ${match ? 'bg-emerald-950/30 border border-emerald-700/40' : 'bg-red-950/30 border border-red-700/40'}`}>
                    <div className={`text-lg font-bold font-mono ${match ? 'text-emerald-400' : 'text-red-400'}`}>
                      {match ? `Shared Secret: ${fmtPt(ecdhSharedA)}` : 'Keys do not match'}
                    </div>
                    {match && <div className="text-xs text-slate-400 mt-1">a(bG) = b(aG) = abG = {fmtPt(ecdhSharedA)}</div>}
                  </div>
                );
              })()}
            </div>

            {/* Scalar multiplication trace */}
            <div className={panelClass}>
              <h2 className="text-sm font-bold text-violet-400 uppercase tracking-wider mb-3">Alice's Scalar Multiplication Trace</h2>
              <p className="text-xs text-slate-400 mb-3">Computing {ecdhSecret.a}G as repeated point additions:</p>
              <div className="bg-slate-900/80 rounded-lg p-3 font-mono text-xs space-y-1 max-h-48 overflow-y-auto">
                {ecdhStepsA.map((pt, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-slate-500 w-12 text-right">{i + 1}G =</span>
                    <span className={i === ecdhStepsA.length - 1 ? 'text-violet-400 font-bold' : 'text-white'}>{fmtPt(pt)}</span>
                    {i > 0 && <span className="text-slate-600">= {i}G + G</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Key size comparison */}
            <div className={panelClass}>
              <h2 className="text-sm font-bold text-violet-400 uppercase tracking-wider mb-3">Why ECC? Key Size Comparison</h2>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { ecc: 256, rsa: 3072, sym: 128 },
                  { ecc: 384, rsa: 7680, sym: 192 },
                  { ecc: 521, rsa: 15360, sym: 256 },
                ].map(row => (
                  <div key={row.ecc} className="bg-slate-900/80 rounded-lg p-3 text-center">
                    <div className="text-violet-400 font-bold text-lg font-mono">{row.ecc}-bit</div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">ECC</div>
                    <div className="text-xs text-slate-400 mt-2">&asymp; RSA <span className="text-white font-bold">{row.rsa}</span>-bit</div>
                    <div className="text-xs text-slate-400">&asymp; AES <span className="text-white font-bold">{row.sym}</span>-bit</div>
                    <div className="mt-2 flex justify-center gap-1">
                      <div className="bg-violet-500 rounded-sm" style={{ width: 4, height: Math.round(row.ecc / 20) }} title={`ECC ${row.ecc}`} />
                      <div className="bg-amber-500 rounded-sm" style={{ width: 4, height: Math.round(row.rsa / 60) }} title={`RSA ${row.rsa}`} />
                    </div>
                    <div className="flex justify-center gap-2 mt-1 text-[9px]">
                      <span className="text-violet-400">ECC</span>
                      <span className="text-amber-400">RSA</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default App;
