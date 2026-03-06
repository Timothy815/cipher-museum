import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';

interface TapeDisplayProps {
  logs: LogEntry[];
  title: string;
}

const TapeDisplay: React.FC<TapeDisplayProps> = ({ logs, title }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex flex-col h-32 sm:h-40 bg-[#e3dac9] text-neutral-900 rounded-md border-y-4 border-neutral-600 shadow-inner overflow-hidden font-mono-display relative">
      <div className="absolute top-0 left-0 bg-neutral-800 text-white text-[10px] px-2 py-0.5 rounded-br uppercase tracking-wider z-10">
        {title}
      </div>
      
      {/* Tape Holes */}
      <div className="absolute top-0 bottom-0 left-2 w-4 border-r border-dashed border-neutral-400 flex flex-col justify-between py-2 pointer-events-none opacity-50">
         {[...Array(10)].map((_, i) => (
             <div key={i} className="w-2 h-2 rounded-full bg-neutral-400/30 mx-auto"></div>
         ))}
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-x-hidden overflow-y-auto p-4 pl-10 text-lg sm:text-xl tracking-[0.2em] leading-relaxed whitespace-pre-wrap break-all"
        style={{ fontFamily: '"Typewriter", "Courier New", monospace' }}
      >
        {logs.map((log) => (
            <span key={log.index} className="transition-opacity animate-[fadeIn_0.1s_ease-out]">
                {log.output}
                {(log.index + 1) % 5 === 0 && (log.index + 1) !== 0 ? ' ' : ''}
            </span>
        ))}
        {logs.length === 0 && <span className="opacity-30">READY...</span>}
        
        {/* Cursor/Carriage */}
        <span className="animate-pulse inline-block w-3 h-5 bg-neutral-800 align-middle ml-1"></span>
      </div>
    </div>
  );
};

export default TapeDisplay;
