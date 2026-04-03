import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, BookOpen } from 'lucide-react';
import exhibits from '../exhibits/content';

interface Props {
  id: string;
}

export default function ExhibitPanel({ id }: Props) {
  const exhibit = exhibits[id];
  const [open, setOpen] = useState(true);

  if (!exhibit) return null;

  return (
    <div className="w-full border-b border-slate-800 bg-slate-950">
      {/* Collapsed bar */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-6 sm:px-10 py-3 hover:bg-slate-900/50 transition-colors group"
      >
        <BookOpen size={14} className="text-amber-500 shrink-0" />
        <span className="text-[10px] font-bold text-amber-500 uppercase tracking-[0.25em]">Museum Exhibit</span>
        <span className="text-[10px] text-slate-600 font-mono mx-1">·</span>
        <span className="text-[10px] text-slate-500 font-mono">{exhibit.era}</span>
        <span className="text-[10px] text-slate-600 font-mono mx-1">·</span>
        <span className="text-[10px] text-slate-500 font-mono">{exhibit.origin}</span>
        <ChevronDown
          size={14}
          className={`ml-auto text-slate-600 group-hover:text-slate-400 transition-all duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Expanded article */}
      {open && (
        <div className="px-6 sm:px-10 pb-10 pt-2">
          <div className="max-w-5xl mx-auto">

            {/* Headline + category */}
            <div className="mb-8">
              <div className="text-[10px] font-bold text-amber-600 uppercase tracking-[0.3em] font-mono mb-3">
                {exhibit.category}
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight tracking-tight mb-1">
                {exhibit.headline}
              </h2>
            </div>

            <div className="grid lg:grid-cols-[1fr_280px] gap-8">
              {/* Article body */}
              <div>
                {/* Lead paragraph */}
                <p className="text-base text-slate-200 leading-relaxed font-medium mb-5 border-l-2 border-amber-600 pl-4">
                  {exhibit.lead}
                </p>

                {/* Body paragraphs */}
                <div className="space-y-4">
                  {exhibit.body.map((para, i) => (
                    <p key={i} className="text-sm text-slate-400 leading-relaxed">
                      {para}
                    </p>
                  ))}
                </div>

                {/* Related exhibits */}
                {exhibit.connections.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-slate-800">
                    <span className="text-[10px] text-slate-600 uppercase tracking-widest font-bold font-mono mr-3">
                      Also see:
                    </span>
                    {exhibit.connections.map((c, i) => (
                      <React.Fragment key={c.path}>
                        <Link
                          to={c.path}
                          className="text-xs text-amber-500 hover:text-amber-300 transition-colors"
                        >
                          {c.label}
                        </Link>
                        {i < exhibit.connections.length - 1 && (
                          <span className="text-slate-700 mx-2">·</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>

              {/* Sidebar: key facts + quote */}
              <div className="space-y-5 lg:border-l lg:border-slate-800 lg:pl-8">
                {/* Key facts */}
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.25em] font-mono mb-3">
                    Key Facts
                  </div>
                  <div className="space-y-2">
                    {exhibit.keyFacts.map(({ label, value }) => (
                      <div key={label} className="border-b border-slate-800/60 pb-2">
                        <div className="text-[9px] text-slate-600 uppercase tracking-wider font-mono">{label}</div>
                        <div className="text-xs text-slate-300 mt-0.5 leading-snug">{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pull quote */}
                {exhibit.quote && (
                  <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-4">
                    <div className="text-amber-500/40 text-4xl leading-none font-serif mb-2">"</div>
                    <p className="text-sm text-slate-300 leading-relaxed italic">
                      {exhibit.quote.text}
                    </p>
                    <div className="mt-3 text-[10px] text-slate-600 font-mono">
                      — {exhibit.quote.attribution}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
