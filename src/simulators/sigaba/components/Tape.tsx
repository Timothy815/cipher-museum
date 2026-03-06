import React, { useRef, useEffect } from 'react';

interface TapeProps {
  text: string;
}

const Tape: React.FC<TapeProps> = ({ text }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = containerRef.current.scrollWidth;
    }
  }, [text]);

  return (
    <div className="relative w-full h-16 bg-[#eaddcf] overflow-hidden border-y-4 border-gray-400 shadow-inner flex items-center">
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-gray-900/20 to-transparent z-10 pointer-events-none"></div>
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-900/20 to-transparent z-10 pointer-events-none"></div>
      
      {/* Paper texture noise */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`}}></div>

      <div 
        ref={containerRef}
        className="flex items-center px-4 overflow-x-auto whitespace-nowrap font-vintage text-2xl text-gray-800 tracking-widest w-full h-full no-scrollbar"
        style={{ scrollBehavior: 'smooth' }}
      >
        {text.split('').map((char, i) => (
           <span key={i} className={`inline-block mx-1 ${i === text.length -1 ? 'animate-pulse font-bold' : ''}`}>{char}</span>
        ))}
      </div>
    </div>
  );
};

export default Tape;