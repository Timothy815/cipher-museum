import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Info, Play, RotateCcw, Zap, Plus, ArrowRight, BarChart3 } from 'lucide-react';
import {
  createFortunaState, addEntropy, reseed, generateBytes, getReseedPools,
  byteFrequency, bitBalance, chiSquared, runsTest, monteCarloPi, toHex,
  NUM_POOLS,
  type FortunaState, type FortunaEvent,
} from './engine';

type Tab = 'architecture' | 'generate' | 'analysis';

// ─── Deep clone helper for immutable state snapshots ────────────────────
function cloneState(s: FortunaState): FortunaState {
  return {
    pools: s.pools.map(p => ({
      data: new Uint8Array(p.data),
      length: p.length,
    })),
    generator: {
      key: new Uint8Array(s.generator.key),
      counter: new Uint8Array(s.generator.counter),
    },
    reseedCount: s.reseedCount,
    totalGenerated: s.totalGenerated,
    lastReseedTime: s.lastReseedTime,
  };
}

function App() {
  const [tab, setTab] = useState<Tab>('architecture');
  const [showInfo, setShowInfo] = useState(false);

  // Core Fortuna state (mutable reference — cloned for display)
  const fortunaRef = useRef(createFortunaState());
  const [displayState, setDisplayState] = useState<FortunaState>(() => cloneState(fortunaRef.current));
  const [eventLog, setEventLog] = useState<FortunaEvent[]>([]);
  const [entropySourceCounter, setEntropySourceCounter] = useState(0);

  // Generated output
  const [outputBytes, setOutputBytes] = useState<Uint8Array>(new Uint8Array(0));
  const [generateSize, setGenerateSize] = useState(256);

  // Analysis data (accumulated)
  const [analysisData, setAnalysisData] = useState<Uint8Array>(new Uint8Array(0));

  const refreshDisplay = useCallback(() => {
    setDisplayState(cloneState(fortunaRef.current));
  }, []);

  const pushEvent = useCallback((e: FortunaEvent) => {
    setEventLog(prev => [e, ...prev].slice(0, 50));
  }, []);

  // ─── Actions ────────────────────────────────────────────────────────
  const handleAddEntropy = useCallback((sourceId?: number) => {
    const sid = sourceId ?? entropySourceCounter;
    // Generate some "entropy" (simulated from various sources)
    const len = 8 + Math.floor(Math.random() * 24);
    const data = new Uint8Array(len);
    crypto.getRandomValues(data);

    const event = addEntropy(fortunaRef.current, sid, data);
    pushEvent(event);
    setEntropySourceCounter(prev => prev + 1);
    refreshDisplay();
  }, [entropySourceCounter, pushEvent, refreshDisplay]);

  const handleReseed = useCallback(() => {
    const event = reseed(fortunaRef.current);
    if (event) {
      pushEvent(event);
    } else {
      pushEvent({
        type: 'reseed',
        detail: 'Reseed failed — pool 0 has insufficient entropy (need ≥2 bytes)',
      });
    }
    refreshDisplay();
  }, [pushEvent, refreshDisplay]);

  const handleGenerate = useCallback(() => {
    const { bytes, events } = generateBytes(fortunaRef.current, generateSize);
    events.forEach(pushEvent);
    setOutputBytes(bytes);
    setAnalysisData(prev => {
      const combined = new Uint8Array(prev.length + bytes.length);
      combined.set(prev);
      combined.set(bytes, prev.length);
      return combined;
    });
    refreshDisplay();
  }, [generateSize, pushEvent, refreshDisplay]);

  const handleReset = useCallback(() => {
    fortunaRef.current = createFortunaState();
    setDisplayState(cloneState(fortunaRef.current));
    setEventLog([]);
    setOutputBytes(new Uint8Array(0));
    setAnalysisData(new Uint8Array(0));
    setEntropySourceCounter(0);
  }, []);

  const handleSeedAndGenerate = useCallback(() => {
    // Quick demo: add entropy to several pools, reseed, then generate
    for (let i = 0; i < 8; i++) {
      const data = new Uint8Array(16);
      crypto.getRandomValues(data);
      addEntropy(fortunaRef.current, i, data);
    }
    pushEvent({ type: 'add_entropy', detail: 'Bulk seeded 8 pools with 16 bytes each' });
    const reseedEvent = reseed(fortunaRef.current);
    if (reseedEvent) pushEvent(reseedEvent);
    const { bytes, events } = generateBytes(fortunaRef.current, generateSize);
    events.forEach(pushEvent);
    setOutputBytes(bytes);
    setAnalysisData(prev => {
      const combined = new Uint8Array(prev.length + bytes.length);
      combined.set(prev);
      combined.set(bytes, prev.length);
      return combined;
    });
    refreshDisplay();
  }, [generateSize, pushEvent, refreshDisplay]);

  // ─── Analysis computations ──────────────────────────────────────────
  const analysis = useMemo(() => {
    if (analysisData.length === 0) return null;
    return {
      freq: byteFrequency(analysisData),
      bits: bitBalance(analysisData),
      chi2: chiSquared(analysisData),
      runs: runsTest(analysisData),
      pi: monteCarloPi(analysisData),
      totalBytes: analysisData.length,
    };
  }, [analysisData]);

  // ─── Reseed pool participation preview ──────────────────────────────
  const nextReseedPools = useMemo(() => {
    return getReseedPools(displayState.reseedCount + 1);
  }, [displayState.reseedCount]);

  const tabActive = 'bg-indigo-900/50 border-indigo-700 text-indigo-300';
  const tabInactive = 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200';

  // Pool fill bar — max height proportional to bytes accumulated
  const maxPoolLen = Math.max(1, ...displayState.pools.map(p => p.length));

  return (
    <div className="flex-1 bg-[#0d1117] flex flex-col items-center justify-start py-10 px-6 text-slate-200">
      <div className="w-full max-w-5xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl sm:text-4xl font-typewriter font-bold text-slate-100 tracking-tighter">
              FORTUNA <span className="text-indigo-500">CSPRNG</span>
            </h1>
            <span className="text-slate-500 text-xs tracking-[0.3em] font-mono">FERGUSON &amp; SCHNEIER — 2003</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleReset} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 border border-slate-700" title="Reset">
              <RotateCcw size={20} />
            </button>
            <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 border border-slate-700">
              <Info size={20} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-2 mb-8">
          <button onClick={() => setTab('architecture')} className={`px-5 py-2 rounded-lg font-bold text-sm border transition-colors ${tab === 'architecture' ? tabActive : tabInactive}`}>
            ARCHITECTURE
          </button>
          <button onClick={() => setTab('generate')} className={`px-5 py-2 rounded-lg font-bold text-sm border transition-colors ${tab === 'generate' ? tabActive : tabInactive}`}>
            GENERATE
          </button>
          <button onClick={() => setTab('analysis')} className={`px-5 py-2 rounded-lg font-bold text-sm border transition-colors ${tab === 'analysis' ? tabActive : tabInactive}`}>
            ANALYSIS
          </button>
        </div>

        {/* ═══════════════ ARCHITECTURE TAB ═══════════════ */}
        {tab === 'architecture' && (
          <>
            {/* System Overview Diagram */}
            <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 mb-6">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-4">System Overview</div>

              {/* Entropy Sources → Pools */}
              <div className="flex items-start gap-4 mb-6">
                {/* Entropy Sources */}
                <div className="flex-shrink-0 w-32">
                  <div className="text-[10px] text-amber-400 uppercase tracking-widest font-bold mb-2 text-center">Entropy Sources</div>
                  <div className="space-y-1">
                    {['Keyboard', 'Mouse', 'Disk I/O', 'Network', 'Timer'].map((src, i) => (
                      <button
                        key={src}
                        onClick={() => handleAddEntropy(i)}
                        className="w-full px-2 py-1.5 rounded text-[10px] font-bold bg-amber-950/40 border border-amber-800/50 text-amber-400 hover:bg-amber-900/50 hover:border-amber-600 transition-colors text-left"
                      >
                        {src} →
                      </button>
                    ))}
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex-shrink-0 flex items-center pt-8">
                  <ArrowRight size={16} className="text-slate-600" />
                </div>

                {/* 32 Entropy Pools */}
                <div className="flex-1">
                  <div className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold mb-2 text-center">
                    32 Entropy Pools (click source to fill)
                  </div>
                  <div className="flex gap-[2px] items-end h-24 bg-slate-950/50 rounded-lg p-2 border border-slate-800">
                    {displayState.pools.map((pool, i) => {
                      const height = maxPoolLen > 0 ? Math.max(4, (pool.length / maxPoolLen) * 100) : 4;
                      const isNextReseed = nextReseedPools.includes(i);
                      return (
                        <div
                          key={i}
                          className="flex-1 flex flex-col items-center justify-end h-full"
                          title={`Pool ${i}: ${pool.length} bytes${isNextReseed ? ' (used in next reseed)' : ''}`}
                        >
                          <div
                            className={`w-full rounded-t transition-all duration-300 ${
                              pool.length > 0
                                ? isNextReseed ? 'bg-emerald-500' : 'bg-emerald-700'
                                : 'bg-slate-800'
                            }`}
                            style={{ height: `${pool.length > 0 ? height : 4}%`, minHeight: '2px' }}
                          />
                          {i % 4 === 0 && (
                            <span className="text-[7px] text-slate-600 mt-0.5">{i}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-1 text-[8px] text-slate-600">
                    <span>P0 (every reseed)</span>
                    <span>P31 (every 2³¹ reseeds)</span>
                  </div>
                </div>
              </div>

              {/* Reseed Arrow */}
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="h-px flex-1 bg-slate-800" />
                <button
                  onClick={handleReseed}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border bg-violet-950/40 border-violet-800/50 text-violet-400 hover:bg-violet-900/50 hover:border-violet-600 transition-colors"
                >
                  <Zap size={12} /> RESEED (SHA-256)
                </button>
                <div className="h-px flex-1 bg-slate-800" />
              </div>

              {/* Generator State */}
              <div className="bg-slate-950/50 rounded-xl border border-slate-800 p-5">
                <div className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold mb-3 text-center">
                  AES-256 CTR Generator
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">Key (256 bits)</div>
                    <div className="font-mono text-[10px] text-cyan-300/80 bg-slate-900 rounded-lg p-2 border border-slate-800 break-all leading-relaxed">
                      {toHex(displayState.generator.key)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">Counter (128 bits)</div>
                    <div className="font-mono text-[10px] text-cyan-300/80 bg-slate-900 rounded-lg p-2 border border-slate-800 break-all">
                      {toHex(displayState.generator.counter)}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3 text-center">
                  <div className="bg-slate-900 rounded-lg p-2 border border-slate-800">
                    <div className="text-[9px] text-slate-500 uppercase font-bold">Reseed Count</div>
                    <div className="text-lg font-mono font-bold text-indigo-400">{displayState.reseedCount}</div>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-2 border border-slate-800">
                    <div className="text-[9px] text-slate-500 uppercase font-bold">Generated</div>
                    <div className="text-lg font-mono font-bold text-indigo-400">{displayState.totalGenerated}B</div>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-2 border border-slate-800">
                    <div className="text-[9px] text-slate-500 uppercase font-bold">Next Reseed Pools</div>
                    <div className="text-sm font-mono font-bold text-violet-400">
                      {nextReseedPools.length <= 6
                        ? nextReseedPools.join(', ')
                        : `${nextReseedPools.slice(0, 5).join(', ')}… (${nextReseedPools.length})`}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Reseed Schedule */}
            <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-5 mb-6">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">
                Reseed Pool Schedule — Pool i used every 2<sup>i</sup> reseeds
              </div>
              <div className="overflow-x-auto">
                <div className="flex gap-1 min-w-[600px]">
                  {Array.from({ length: Math.min(16, NUM_POOLS) }, (_, i) => (
                    <div key={i} className="flex-1 text-center">
                      <div className="text-[9px] font-mono text-slate-500 mb-1">P{i}</div>
                      <div className={`text-[9px] font-mono px-1 py-0.5 rounded ${
                        nextReseedPools.includes(i)
                          ? 'bg-violet-900/50 text-violet-300 border border-violet-700'
                          : 'bg-slate-800/50 text-slate-600 border border-slate-700'
                      }`}>
                        2<sup>{i}</sup>
                      </div>
                      <div className="text-[8px] text-slate-600 mt-0.5">
                        {i === 0 ? 'every' : i <= 3 ? `every ${1 << i}` : `${1 << i}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Event Log */}
            <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-5">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">Event Log</div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {eventLog.length === 0 ? (
                  <div className="text-xs text-slate-600 font-mono">Click an entropy source to begin...</div>
                ) : eventLog.map((e, i) => (
                  <div key={i} className={`text-xs font-mono px-2 py-1 rounded ${
                    e.type === 'add_entropy' ? 'text-amber-400/80 bg-amber-950/20' :
                    e.type === 'reseed' ? 'text-violet-400/80 bg-violet-950/20' :
                    e.type === 'generate' ? 'text-cyan-400/80 bg-cyan-950/20' :
                    'text-indigo-400/80 bg-indigo-950/20'
                  }`}>
                    <span className="text-slate-600 mr-2">[{e.type}]</span>
                    {e.detail}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ═══════════════ GENERATE TAB ═══════════════ */}
        {tab === 'generate' && (
          <>
            {/* Controls */}
            <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 mb-6">
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">
                    Bytes to Generate
                  </label>
                  <select
                    value={generateSize}
                    onChange={e => setGenerateSize(Number(e.target.value))}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-indigo-700/50"
                  >
                    {[16, 32, 64, 128, 256, 512, 1024].map(n => (
                      <option key={n} value={n}>{n} bytes</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleGenerate}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold border bg-cyan-950/40 border-cyan-800/50 text-cyan-400 hover:bg-cyan-900/50 hover:border-cyan-600 transition-colors"
                >
                  <Play size={14} /> Generate
                </button>
                <button
                  onClick={handleSeedAndGenerate}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold border bg-indigo-950/40 border-indigo-800/50 text-indigo-400 hover:bg-indigo-900/50 hover:border-indigo-600 transition-colors"
                >
                  <Zap size={14} /> Seed &amp; Generate
                </button>
                <button
                  onClick={() => handleAddEntropy()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border bg-amber-950/40 border-amber-800/50 text-amber-400 hover:bg-amber-900/50 hover:border-amber-600 transition-colors"
                >
                  <Plus size={14} /> Add Entropy
                </button>
              </div>
            </div>

            {/* Generator Flow */}
            <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 mb-6">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-4">Generator Pipeline</div>
              <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {/* Counter */}
                <div className="flex-shrink-0 bg-slate-950 rounded-xl border border-slate-700 p-3 text-center min-w-[140px]">
                  <div className="text-[9px] text-slate-500 uppercase font-bold mb-1">Counter</div>
                  <div className="font-mono text-[9px] text-cyan-300/70 break-all">{toHex(displayState.generator.counter)}</div>
                </div>
                <ArrowRight size={16} className="text-slate-600 flex-shrink-0" />
                {/* AES-256 */}
                <div className="flex-shrink-0 bg-cyan-950/30 rounded-xl border border-cyan-800/50 p-3 text-center min-w-[120px]">
                  <div className="text-[9px] text-cyan-400 uppercase font-bold mb-1">AES-256</div>
                  <div className="text-[9px] text-slate-500">E(key, counter)</div>
                </div>
                <ArrowRight size={16} className="text-slate-600 flex-shrink-0" />
                {/* Output */}
                <div className="flex-shrink-0 bg-emerald-950/30 rounded-xl border border-emerald-800/50 p-3 text-center min-w-[120px]">
                  <div className="text-[9px] text-emerald-400 uppercase font-bold mb-1">Output Block</div>
                  <div className="text-[9px] text-slate-500">16 bytes</div>
                </div>
                <ArrowRight size={16} className="text-slate-600 flex-shrink-0" />
                {/* Rekey */}
                <div className="flex-shrink-0 bg-violet-950/30 rounded-xl border border-violet-800/50 p-3 text-center min-w-[140px]">
                  <div className="text-[9px] text-violet-400 uppercase font-bold mb-1">Rekey</div>
                  <div className="text-[9px] text-slate-500">2 extra blocks → new key</div>
                </div>
              </div>
            </div>

            {/* Key State */}
            <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 mb-6">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">Current Key</div>
              <div className="font-mono text-xs text-cyan-300/80 bg-slate-950 rounded-lg p-3 border border-slate-800 break-all leading-relaxed">
                {toHex(displayState.generator.key)}
              </div>
            </div>

            {/* Output Hex Dump */}
            <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold">
                  Output ({outputBytes.length} bytes)
                </div>
              </div>
              <div className="font-mono text-[10px] text-emerald-300/70 bg-slate-950 rounded-lg p-3 border border-slate-800 break-all leading-relaxed max-h-48 overflow-y-auto">
                {outputBytes.length > 0
                  ? toHex(outputBytes)
                  : <span className="text-slate-600">No output yet — click Generate</span>
                }
              </div>
            </div>

            {/* Bit Visualization */}
            {outputBytes.length > 0 && (
              <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-5">
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">
                  Bit Stream (first {Math.min(outputBytes.length, 64)} bytes)
                </div>
                <div className="font-mono text-[8px] leading-tight tracking-[1px] break-all">
                  {Array.from(outputBytes.slice(0, 64)).map((byte, bi) => (
                    <span key={bi} className="inline-block mr-1 mb-0.5">
                      {Array.from({ length: 8 }, (_, i) => {
                        const bit = (byte >> (7 - i)) & 1;
                        return (
                          <span key={i} className={bit ? 'text-cyan-400' : 'text-slate-700'}>
                            {bit}
                          </span>
                        );
                      })}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══════════════ ANALYSIS TAB ═══════════════ */}
        {tab === 'analysis' && (
          <>
            {/* Quick generate controls */}
            <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 mb-6">
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-xs text-slate-400">
                  Accumulated: <span className="font-mono text-indigo-400 font-bold">{analysisData.length}</span> bytes
                </span>
                <button
                  onClick={handleSeedAndGenerate}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border bg-indigo-950/40 border-indigo-800/50 text-indigo-400 hover:bg-indigo-900/50 transition-colors"
                >
                  <Plus size={14} /> Generate More
                </button>
                <button
                  onClick={() => setAnalysisData(new Uint8Array(0))}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <RotateCcw size={14} /> Clear
                </button>
              </div>
            </div>

            {analysis ? (
              <>
                {/* Statistical Tests */}
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  {/* Bit Balance */}
                  <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-5">
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">Bit Balance</div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-1">
                        <div className="flex justify-between text-[9px] text-slate-500 mb-1">
                          <span>0s: {analysis.bits.zeros}</span>
                          <span>1s: {analysis.bits.ones}</span>
                        </div>
                        <div className="flex h-4 rounded overflow-hidden">
                          <div
                            className="bg-slate-600 transition-all"
                            style={{ width: `${(analysis.bits.zeros / (analysis.bits.zeros + analysis.bits.ones)) * 100}%` }}
                          />
                          <div className="bg-cyan-500 flex-1" />
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-400">
                      Ratio: <span className="font-mono text-cyan-400">
                        {(analysis.bits.ones / (analysis.bits.zeros + analysis.bits.ones) * 100).toFixed(2)}%
                      </span> ones
                      <span className="text-slate-600 ml-1">(ideal: 50.00%)</span>
                    </div>
                  </div>

                  {/* Chi-Squared */}
                  <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-5">
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">Chi-Squared Test (byte distribution)</div>
                    <div className="text-2xl font-mono font-bold text-indigo-400 mb-1">{analysis.chi2.toFixed(2)}</div>
                    <div className="text-xs text-slate-400">
                      Expected range for uniform: <span className="font-mono text-slate-500">~209–303</span> (df=255, p=0.05)
                    </div>
                    <div className={`text-xs font-bold mt-1 ${
                      analysis.chi2 > 150 && analysis.chi2 < 350 ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {analysis.totalBytes < 256 ? 'Need more data for reliable test' :
                       analysis.chi2 > 150 && analysis.chi2 < 350 ? 'PASS — appears uniform' : 'Outside typical range'}
                    </div>
                  </div>

                  {/* Runs Test */}
                  <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-5">
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">Runs Test</div>
                    <div className="text-xs text-slate-400">
                      Runs: <span className="font-mono text-cyan-400">{analysis.runs.runs}</span>
                      <span className="text-slate-600 ml-2">Expected: {analysis.runs.expected.toFixed(0)}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      Deviation: <span className="font-mono text-indigo-400">
                        {analysis.runs.expected > 0
                          ? ((analysis.runs.runs - analysis.runs.expected) / analysis.runs.expected * 100).toFixed(2)
                          : '0'}%
                      </span>
                    </div>
                  </div>

                  {/* Monte Carlo Pi */}
                  <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-5">
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">Monte Carlo Pi Estimate</div>
                    <div className="text-2xl font-mono font-bold text-indigo-400 mb-1">{analysis.pi.toFixed(6)}</div>
                    <div className="text-xs text-slate-400">
                      Actual Pi: <span className="font-mono text-slate-500">3.141593</span>
                      <span className="text-slate-600 ml-2">Error: {Math.abs(analysis.pi - Math.PI).toFixed(6)}</span>
                    </div>
                  </div>
                </div>

                {/* Byte Frequency Histogram */}
                <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-5 mb-6">
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">
                    Byte Frequency Distribution (256 values)
                  </div>
                  <div className="flex items-end gap-[1px] h-32 bg-slate-950/50 rounded-lg p-2 border border-slate-800">
                    {analysis.freq.map((count, i) => {
                      const maxCount = Math.max(1, ...analysis.freq);
                      const height = (count / maxCount) * 100;
                      const expected = analysis.totalBytes / 256;
                      const deviation = expected > 0 ? Math.abs(count - expected) / expected : 0;
                      return (
                        <div
                          key={i}
                          className="flex-1 min-w-0 rounded-t transition-all"
                          style={{
                            height: `${Math.max(1, height)}%`,
                            backgroundColor: deviation > 0.5 ? 'rgb(251,146,60)' : 'rgb(99,102,241)',
                            opacity: 0.7 + (count / maxCount) * 0.3,
                          }}
                          title={`Byte ${i} (0x${i.toString(16).padStart(2, '0')}): ${count} occurrences`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-1 text-[8px] text-slate-600">
                    <span>0x00</span>
                    <span>0x40</span>
                    <span>0x80</span>
                    <span>0xC0</span>
                    <span>0xFF</span>
                  </div>
                </div>

                {/* Byte Heatmap */}
                <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-5">
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">
                    Byte Value Heatmap (16x16)
                  </div>
                  <div className="grid grid-cols-16 gap-[1px] max-w-md mx-auto" style={{ gridTemplateColumns: 'repeat(16, 1fr)' }}>
                    {analysis.freq.map((count, i) => {
                      const maxCount = Math.max(1, ...analysis.freq);
                      const intensity = count / maxCount;
                      return (
                        <div
                          key={i}
                          className="aspect-square rounded-sm"
                          style={{
                            backgroundColor: `rgba(99, 102, 241, ${0.1 + intensity * 0.9})`,
                          }}
                          title={`0x${i.toString(16).padStart(2, '0')}: ${count}`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-2 text-[8px] text-slate-600 max-w-md mx-auto">
                    <span>Low frequency</span>
                    <span>High frequency</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-12 text-center">
                <BarChart3 size={48} className="text-slate-700 mx-auto mb-4" />
                <div className="text-slate-500 text-sm">Generate random bytes to see analysis</div>
                <button
                  onClick={handleSeedAndGenerate}
                  className="mt-4 flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold border bg-indigo-950/40 border-indigo-800/50 text-indigo-400 hover:bg-indigo-900/50 transition-colors mx-auto"
                >
                  <Zap size={14} /> Seed &amp; Generate {generateSize} Bytes
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Info Panel */}
      <div className={`fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-700 p-6 transform transition-transform duration-300 z-40 ${showInfo ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="max-w-3xl mx-auto relative">
          <button onClick={() => setShowInfo(false)} className="absolute top-0 right-0 p-2 text-slate-500 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <h3 className="text-xl font-bold text-indigo-400 mb-2">About Fortuna</h3>
          <p className="text-sm text-slate-300 leading-relaxed mb-3">
            <strong>Fortuna</strong> is a cryptographically secure pseudorandom number generator (CSPRNG) designed by
            <strong> Niels Ferguson</strong> and <strong>Bruce Schneier</strong>, published in <em>Practical Cryptography</em> (2003).
            It was designed to be resilient against entropy source compromise and is used in FreeBSD, macOS, and Windows CNG.
          </p>
          <p className="text-sm text-slate-300 leading-relaxed mb-3">
            <strong>Architecture:</strong> Fortuna has three components: (1) an <strong>entropy accumulator</strong> with 32 pools
            that collect randomness from multiple sources, (2) a <strong>reseed mechanism</strong> that uses SHA-256 to derive new
            keys — pool <em>i</em> participates every 2<sup>i</sup> reseeds, ensuring recovery from compromise, and (3) an
            <strong> AES-256-CTR generator</strong> that produces output blocks. After each request, the generator <strong>rekeys</strong>
            itself with 2 extra blocks, ensuring forward secrecy.
          </p>
          <p className="text-sm text-slate-300 leading-relaxed">
            <strong>Why 32 pools?</strong> If an attacker compromises the generator state, pool 0 is used in every reseed for quick
            recovery. But pool 31 accumulates entropy for 2<sup>31</sup> reseeds, guaranteeing massive entropy accumulation
            even against persistent adversaries. This graduated schedule is Fortuna's key innovation over earlier designs like Yarrow.
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
