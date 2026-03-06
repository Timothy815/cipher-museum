import React, { useEffect, useRef } from 'react';
import { TapeEntry } from '../types';

interface TapeProps {
  entries: TapeEntry[];
}

export const Tape: React.FC<TapeProps> = ({ entries }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  // Group entries into blocks of 5 for authentic look
  // M-209 usually printed in groups of 5 letters
  
  const formatOutput = (text: string) => {
    return text.match(/.{1,5}/g)?.join(' ') || text;
  };

  return (
    <div className="relative w-full h-32 sm:h-40 bg-black/20 rounded-md p-1 backdrop-blur-sm border border-olive-700/50">
        
      {/* The Paper Strip */}
      <div 
        ref={scrollRef}
        className="w-full h-full tape-texture shadow-inner-lg rounded overflow-y-auto tape-scroll p-4 font-mono text-sm sm:text-base text-gray-800 leading-relaxed"
      >
        {entries.length === 0 && (
          <div className="text-center text-gray-400/60 italic mt-8 select-none">
            - TAPE FEED READY -
          </div>
        )}

        <div className="flex flex-wrap gap-x-6 gap-y-2">
           {entries.map((entry, i) => (
             <span key={i} className="flex flex-col items-center min-w-[1.5rem]">
                <span className="text-[10px] text-gray-500 mb-0 leading-none">{entry.input}</span>
                <span className="font-bold text-gray-900">{entry.output}</span>
             </span>
           ))}
           {/* Blinking cursor at the end */}
           <span className="inline-block w-2 h-5 bg-gray-400/50 animate-pulse ml-1 align-bottom"></span>
        </div>
      </div>

      {/* Mechanical Tear Bar Overlay */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-black/20 to-transparent pointer-events-none rounded-t"></div>
      
    </div>
  );
};