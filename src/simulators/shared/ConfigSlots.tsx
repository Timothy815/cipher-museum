import React, { useState, useEffect, useCallback } from 'react';
import { Save, Download, X } from 'lucide-react';

interface SlotData {
  state: unknown;
  savedAt: string;
  label?: string;
}

interface ConfigSlotsProps {
  machineId: string;
  currentState: unknown;
  onLoadState: (state: any) => void;
  accentColor?: string; // tailwind color like "yellow", "purple", "blue"
}

const SLOT_COUNT = 10;

function getSlotKey(machineId: string, index: number): string {
  return `cipher-museum:${machineId}:slot:${index}`;
}

const ACCENT_CLASSES: Record<string, { occupied: string; hover: string; active: string; text: string }> = {
  yellow:  { occupied: 'border-yellow-700/60', hover: 'hover:border-yellow-600', active: 'bg-yellow-900/40 border-yellow-500 text-yellow-300', text: 'text-yellow-400' },
  amber:   { occupied: 'border-amber-700/60', hover: 'hover:border-amber-600', active: 'bg-amber-900/40 border-amber-500 text-amber-300', text: 'text-amber-400' },
  purple:  { occupied: 'border-purple-700/60', hover: 'hover:border-purple-600', active: 'bg-purple-900/40 border-purple-500 text-purple-300', text: 'text-purple-400' },
  blue:    { occupied: 'border-blue-700/60', hover: 'hover:border-blue-600', active: 'bg-blue-900/40 border-blue-500 text-blue-300', text: 'text-blue-400' },
  emerald: { occupied: 'border-emerald-700/60', hover: 'hover:border-emerald-600', active: 'bg-emerald-900/40 border-emerald-500 text-emerald-300', text: 'text-emerald-400' },
  sky:     { occupied: 'border-sky-700/60', hover: 'hover:border-sky-600', active: 'bg-sky-900/40 border-sky-500 text-sky-300', text: 'text-sky-400' },
  red:     { occupied: 'border-red-700/60', hover: 'hover:border-red-600', active: 'bg-red-900/40 border-red-500 text-red-300', text: 'text-red-400' },
  teal:    { occupied: 'border-teal-700/60', hover: 'hover:border-teal-600', active: 'bg-teal-900/40 border-teal-500 text-teal-300', text: 'text-teal-400' },
  rose:    { occupied: 'border-rose-700/60', hover: 'hover:border-rose-600', active: 'bg-rose-900/40 border-rose-500 text-rose-300', text: 'text-rose-400' },
};

export default function ConfigSlots({ machineId, currentState, onLoadState, accentColor = 'blue' }: ConfigSlotsProps) {
  const [slots, setSlots] = useState<(SlotData | null)[]>(Array(SLOT_COUNT).fill(null));
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const accent = ACCENT_CLASSES[accentColor] || ACCENT_CLASSES.blue;

  const loadSlots = useCallback(() => {
    const loaded: (SlotData | null)[] = [];
    for (let i = 0; i < SLOT_COUNT; i++) {
      try {
        const raw = localStorage.getItem(getSlotKey(machineId, i));
        loaded.push(raw ? JSON.parse(raw) : null);
      } catch {
        loaded.push(null);
      }
    }
    setSlots(loaded);
  }, [machineId]);

  useEffect(() => { loadSlots(); }, [loadSlots]);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 1500);
  };

  const handleSave = (index: number) => {
    const data: SlotData = {
      state: currentState,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(getSlotKey(machineId, index), JSON.stringify(data));
    loadSlots();
    setSelectedSlot(null);
    showFeedback(`Saved to slot ${index + 1}`);
  };

  const handleLoad = (index: number) => {
    const slot = slots[index];
    if (!slot) return;
    try {
      onLoadState(slot.state);
      setSelectedSlot(null);
      showFeedback(`Loaded slot ${index + 1}`);
    } catch {
      showFeedback('Failed to load — incompatible save');
    }
  };

  const handleDelete = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.removeItem(getSlotKey(machineId, index));
    loadSlots();
    if (selectedSlot === index) setSelectedSlot(null);
    showFeedback(`Cleared slot ${index + 1}`);
  };

  const handleSlotClick = (index: number) => {
    if (selectedSlot === index) {
      setSelectedSlot(null);
      return;
    }
    setSelectedSlot(index);
  };

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' +
             d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mr-1">Slots</span>
      <div className="flex gap-1">
        {slots.map((slot, i) => {
          const isSelected = selectedSlot === i;
          const isOccupied = slot !== null;

          return (
            <div key={i} className="relative group/slot">
              <button
                onClick={() => handleSlotClick(i)}
                title={isOccupied ? `Slot ${i + 1} — saved ${formatTime(slot!.savedAt)}` : `Slot ${i + 1} — empty`}
                className={`w-7 h-7 rounded font-mono text-xs font-bold transition-all border ${
                  isSelected
                    ? accent.active
                    : isOccupied
                      ? `bg-slate-800/60 ${accent.occupied} text-slate-400 ${accent.hover}`
                      : 'bg-slate-900/40 border-slate-800 text-slate-700 hover:border-slate-600 hover:text-slate-500'
                }`}
              >
                {i + 1}
                {isOccupied && !isSelected && (
                  <span className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${accent.text.replace('text-', 'bg-')} opacity-70`} />
                )}
              </button>
              {/* Delete button on hover for occupied slots */}
              {isOccupied && (
                <button
                  onClick={(e) => handleDelete(i, e)}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-slate-700 text-slate-400 hover:bg-red-800 hover:text-red-200 items-center justify-center text-[8px] transition-all opacity-0 group-hover/slot:opacity-100 hidden group-hover/slot:flex z-10"
                  title="Clear slot"
                >
                  <X size={8} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Action buttons when a slot is selected */}
      {selectedSlot !== null && (
        <div className="flex gap-1 ml-1 animate-in fade-in duration-150">
          <button
            onClick={() => handleSave(selectedSlot)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border transition-all bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:border-slate-500`}
            title={slots[selectedSlot] ? 'Overwrite this slot' : 'Save to this slot'}
          >
            <Save size={10} /> Save
          </button>
          {slots[selectedSlot] && (
            <button
              onClick={() => handleLoad(selectedSlot)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border transition-all bg-slate-800 border-slate-700 ${accent.text} hover:brightness-125 hover:border-slate-500`}
              title="Load this configuration"
            >
              <Download size={10} /> Load
            </button>
          )}
        </div>
      )}

      {/* Feedback toast */}
      {feedback && (
        <span className={`text-[10px] font-bold ${accent.text} animate-in fade-in duration-100 ml-1`}>
          {feedback}
        </span>
      )}
    </div>
  );
}
