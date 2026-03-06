import React, { useState, useMemo } from 'react';
import { MachineState, LugSetting } from '../types';
import { WHEEL_ALPHABETS } from '../constants';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface InternalViewProps {
  state: MachineState;
  onUpdateState: (newState: MachineState) => void;
}

const WHEEL_LABELS = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'];

const PinEditor: React.FC<{
  wheel: MachineState['wheels'][0];
  onTogglePin: (wheelId: number, pinIndex: number) => void;
}> = ({ wheel, onTogglePin }) => {
  const alphabet = WHEEL_ALPHABETS[wheel.id];
  const activePins = wheel.pins.filter(p => p).length;

  return (
    <div className="bg-stone-800/50 rounded-lg p-4 border border-olive-700/30">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-amber-500 font-mono font-bold text-sm">
            {WHEEL_LABELS[wheel.id]}
          </span>
          <span className="text-olive-400 text-xs">
            ({wheel.size} positions)
          </span>
        </div>
        <span className="text-xs text-olive-500 font-mono">
          {activePins}/{wheel.size} active
        </span>
      </div>

      <div className="flex flex-wrap gap-1">
        {wheel.pins.map((active, idx) => {
          const isCurrent = idx === wheel.position;
          return (
            <button
              key={idx}
              onClick={() => onTogglePin(wheel.id, idx)}
              className={`
                w-7 h-9 rounded text-[10px] font-mono font-bold flex flex-col items-center justify-center gap-0.5 transition-all border
                ${active
                  ? 'bg-amber-600/80 border-amber-500 text-white shadow-[0_0_6px_rgba(245,158,11,0.3)]'
                  : 'bg-stone-900 border-stone-700 text-stone-500 hover:border-stone-500'
                }
                ${isCurrent ? 'ring-2 ring-amber-300 ring-offset-1 ring-offset-stone-900' : ''}
              `}
              title={`${alphabet[idx]}: ${active ? 'Active' : 'Inactive'}${isCurrent ? ' (current)' : ''}`}
            >
              <span className="text-[9px] leading-none opacity-70">{alphabet[idx]}</span>
              <span className="leading-none">{active ? '1' : '0'}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const LugSelector: React.FC<{
  value: number | null;
  onChange: (val: number | null) => void;
  otherLug: number | null;
}> = ({ value, onChange, otherLug }) => {
  const cycle = () => {
    // Cycle: null -> 0 -> 1 -> 2 -> 3 -> 4 -> 5 -> null
    // Skip the value used by the other lug
    let next: number | null = value === null ? 0 : value + 1;
    if (next > 5) next = null;
    if (next === otherLug) {
      next = next === null ? 0 : next + 1;
      if (next > 5) next = null;
    }
    onChange(next);
  };

  return (
    <button
      onClick={cycle}
      className={`
        w-8 h-6 rounded text-[10px] font-mono font-bold flex items-center justify-center transition-all border
        ${value !== null
          ? 'bg-amber-700/60 border-amber-600/60 text-amber-200'
          : 'bg-stone-900 border-stone-700 text-stone-600'
        }
      `}
      title={value !== null ? `Wheel ${value + 1}` : 'None'}
    >
      {value !== null ? WHEEL_LABELS[value] : '—'}
    </button>
  );
};

const InternalView: React.FC<InternalViewProps> = ({ state, onUpdateState }) => {
  const [pinsExpanded, setPinsExpanded] = useState(true);
  const [lugsExpanded, setLugsExpanded] = useState(true);

  const handleTogglePin = (wheelId: number, pinIndex: number) => {
    const newWheels = state.wheels.map(w => {
      if (w.id !== wheelId) return w;
      const newPins = [...w.pins];
      newPins[pinIndex] = !newPins[pinIndex];
      return { ...w, pins: newPins };
    });
    onUpdateState({ ...state, wheels: newWheels });
  };

  const handleLugChange = (barIndex: number, lugNum: 1 | 2, value: number | null) => {
    const newBars = [...state.bars];
    newBars[barIndex] = {
      ...newBars[barIndex],
      [lugNum === 1 ? 'lug1' : 'lug2']: value
    };
    onUpdateState({ ...state, bars: newBars });
  };

  // Calculate live cipher breakdown
  const breakdown = useMemo(() => {
    const barResults = state.bars.map((bar, i) => {
      let active = false;
      let triggeredBy: string[] = [];

      if (bar.lug1 !== null) {
        const w = state.wheels[bar.lug1];
        if (w.pins[w.position]) {
          active = true;
          triggeredBy.push(WHEEL_LABELS[bar.lug1]);
        }
      }
      if (!active && bar.lug2 !== null) {
        const w = state.wheels[bar.lug2];
        if (w.pins[w.position]) {
          active = true;
          triggeredBy.push(WHEEL_LABELS[bar.lug2]);
        }
      }

      return { index: i, active, triggeredBy, lug1: bar.lug1, lug2: bar.lug2 };
    });

    const shift = barResults.filter(b => b.active).length;
    return { barResults, shift };
  }, [state]);

  return (
    <div className="w-full max-w-5xl space-y-6">

      {/* Live Cipher Breakdown */}
      <div className="bg-stone-800/60 rounded-xl p-5 border border-olive-700/30">
        <h3 className="text-sm font-bold text-amber-500 uppercase tracking-wider mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
          Live Cipher State
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Active Pins per Wheel */}
          <div className="bg-stone-900/50 rounded-lg p-3 border border-stone-700/50">
            <div className="text-[10px] text-olive-500 uppercase tracking-wider mb-2">Active Pins at Current Position</div>
            <div className="flex gap-2">
              {state.wheels.map(w => (
                <div key={w.id} className="flex flex-col items-center">
                  <span className="text-[10px] text-olive-400 font-mono">{WHEEL_LABELS[w.id]}</span>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${
                    w.pins[w.position]
                      ? 'bg-amber-600/80 border-amber-500 text-white'
                      : 'bg-stone-800 border-stone-600 text-stone-500'
                  }`}>
                    {w.pins[w.position] ? '1' : '0'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bars Fired */}
          <div className="bg-stone-900/50 rounded-lg p-3 border border-stone-700/50">
            <div className="text-[10px] text-olive-500 uppercase tracking-wider mb-2">Bars Engaged</div>
            <div className="flex flex-wrap gap-1">
              {breakdown.barResults.map(b => (
                <div
                  key={b.index}
                  className={`w-4 h-4 rounded-sm text-[8px] font-mono flex items-center justify-center ${
                    b.active
                      ? 'bg-amber-600 text-white'
                      : 'bg-stone-800 text-stone-600'
                  }`}
                  title={`Bar ${b.index + 1}: ${b.active ? `Active (${b.triggeredBy.join(', ')})` : 'Inactive'}`}
                >
                </div>
              ))}
            </div>
          </div>

          {/* Shift Value */}
          <div className="bg-stone-900/50 rounded-lg p-3 border border-stone-700/50 flex flex-col items-center justify-center">
            <div className="text-[10px] text-olive-500 uppercase tracking-wider mb-1">Shift (K)</div>
            <div className="text-3xl font-mono font-bold text-amber-400">
              {breakdown.shift}
            </div>
            <div className="text-[10px] text-olive-600 mt-1">
              C = (25 − P − {breakdown.shift}) mod 26
            </div>
          </div>
        </div>
      </div>

      {/* Pin Settings */}
      <div className="bg-stone-800/40 rounded-xl border border-olive-700/30 overflow-hidden">
        <button
          onClick={() => setPinsExpanded(!pinsExpanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-stone-800/60 transition-colors"
        >
          <h3 className="text-sm font-bold text-olive-300 uppercase tracking-wider flex items-center gap-2">
            Wheel Pins
            <span className="text-olive-600 font-normal normal-case tracking-normal text-xs">
              — click pins to toggle active/inactive
            </span>
          </h3>
          {pinsExpanded ? <ChevronUp size={16} className="text-olive-500" /> : <ChevronDown size={16} className="text-olive-500" />}
        </button>

        {pinsExpanded && (
          <div className="px-4 pb-4 space-y-3">
            {state.wheels.map(w => (
              <PinEditor key={w.id} wheel={w} onTogglePin={handleTogglePin} />
            ))}
          </div>
        )}
      </div>

      {/* Lug/Drum Settings */}
      <div className="bg-stone-800/40 rounded-xl border border-olive-700/30 overflow-hidden">
        <button
          onClick={() => setLugsExpanded(!lugsExpanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-stone-800/60 transition-colors"
        >
          <h3 className="text-sm font-bold text-olive-300 uppercase tracking-wider flex items-center gap-2">
            Drum Bars &amp; Lugs
            <span className="text-olive-600 font-normal normal-case tracking-normal text-xs">
              — 27 bars, 2 lugs each — click to cycle wheel assignment
            </span>
          </h3>
          {lugsExpanded ? <ChevronUp size={16} className="text-olive-500" /> : <ChevronDown size={16} className="text-olive-500" />}
        </button>

        {lugsExpanded && (
          <div className="px-4 pb-4">
            {/* Legend */}
            <div className="flex gap-4 mb-3 text-[10px] text-olive-500 font-mono">
              <span>— = no wheel</span>
              {WHEEL_LABELS.map((l, i) => (
                <span key={i}>{l} = Wheel {i + 1}</span>
              ))}
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-9 gap-2">
              {state.bars.map((bar, i) => {
                const isActive = breakdown.barResults[i].active;
                return (
                  <div
                    key={i}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                      isActive
                        ? 'bg-amber-900/30 border-amber-700/50'
                        : 'bg-stone-900/50 border-stone-700/30'
                    }`}
                  >
                    <span className={`text-[9px] font-mono ${isActive ? 'text-amber-400' : 'text-stone-500'}`}>
                      Bar {i + 1}
                    </span>
                    <div className="flex gap-1">
                      <LugSelector
                        value={bar.lug1}
                        onChange={(val) => handleLugChange(i, 1, val)}
                        otherLug={bar.lug2}
                      />
                      <LugSelector
                        value={bar.lug2}
                        onChange={(val) => handleLugChange(i, 2, val)}
                        otherLug={bar.lug1}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InternalView;
