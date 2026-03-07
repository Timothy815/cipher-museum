import React, { useRef, useEffect } from 'react';

interface TapeProps {
  text: string;
}

export const Tape: React.FC<TapeProps> = ({ text }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [text]);

  return (
    <div className="bg-stone-900/60 rounded-xl border border-stone-800 p-4">
      <div className="text-[10px] text-stone-600 uppercase tracking-widest font-bold mb-2">
        Output Tape
      </div>
      <div
        ref={scrollRef}
        className="overflow-x-auto whitespace-nowrap font-mono text-xl tracking-[0.3em] text-yellow-200 min-h-[2rem] scrollbar-thin"
      >
        {text || <span className="text-stone-700 tracking-normal text-sm">...</span>}
      </div>
    </div>
  );
};
