import React, { useRef, useEffect } from 'react';

interface TapeProps { text: string; }

export const Tape: React.FC<TapeProps> = ({ text }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current) ref.current.scrollLeft = ref.current.scrollWidth; }, [text]);
  return (
    <div className="bg-neutral-900/60 rounded-xl border border-neutral-800 p-4">
      <div className="text-[10px] text-neutral-600 uppercase tracking-widest font-bold mb-2">Output Tape</div>
      <div ref={ref} className="overflow-x-auto whitespace-nowrap font-mono text-xl tracking-[0.3em] text-teal-200 min-h-[2rem]">
        {text || <span className="text-neutral-700 tracking-normal text-sm">...</span>}
      </div>
    </div>
  );
};
