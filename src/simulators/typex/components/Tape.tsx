import React, { useEffect, useRef } from 'react';

interface TapeProps {
  text: string;
}

export const Tape: React.FC<TapeProps> = ({ text }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = containerRef.current.scrollWidth;
    }
  }, [text]);

  const formattedText = text.replace(/(.{4})/g, '$1 ').trim();

  return (
    <div className="w-full max-w-3xl mx-auto my-4 relative">
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#1a2e1a] to-transparent z-10 pointer-events-none"></div>
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#1a2e1a] to-transparent z-10 pointer-events-none"></div>

      <div
        ref={containerRef}
        className="bg-[#f0e6d2] text-stone-900 font-typewriter text-xl p-3 overflow-x-auto whitespace-nowrap shadow-inner border-y-4 border-dashed border-stone-800/20 h-16 flex items-center"
        style={{ scrollBehavior: 'smooth' }}
      >
        <span className="opacity-50 select-none mr-4">OUTPUT:</span>
        <span className="tracking-widest font-bold">{formattedText}</span>
        <span className="w-4 inline-block animate-pulse bg-stone-900/50 h-5 ml-1 align-middle"></span>
      </div>
    </div>
  );
};
