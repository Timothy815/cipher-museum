import React, { useState, useRef, useCallback } from 'react';
import { Copy, ClipboardPaste, Check } from 'lucide-react';

interface TapeActionsProps {
  outputText: string;
  onProcessInput: (chars: string[]) => void;
  accentColor?: string; // tailwind color like "yellow", "purple"
  validPattern?: RegExp; // chars to keep from pasted text, default /[A-Z]/
}

const ACCENT_BTN: Record<string, string> = {
  yellow:  'hover:text-yellow-400 hover:border-yellow-800',
  amber:   'hover:text-amber-400 hover:border-amber-800',
  purple:  'hover:text-purple-400 hover:border-purple-800',
  blue:    'hover:text-blue-400 hover:border-blue-800',
  emerald: 'hover:text-emerald-400 hover:border-emerald-800',
  sky:     'hover:text-sky-400 hover:border-sky-800',
  red:     'hover:text-red-400 hover:border-red-800',
  teal:    'hover:text-teal-400 hover:border-teal-800',
  rose:    'hover:text-rose-400 hover:border-rose-800',
};

export default function TapeActions({ outputText, onProcessInput, accentColor = 'blue', validPattern = /[A-Z]/ }: TapeActionsProps) {
  const [copied, setCopied] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const accent = ACCENT_BTN[accentColor] || ACCENT_BTN.blue;

  const handleCopy = useCallback(async () => {
    if (!outputText) return;
    try {
      await navigator.clipboard.writeText(outputText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = outputText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }, [outputText]);

  const handlePasteSubmit = useCallback(() => {
    const upper = pasteText.toUpperCase();
    const chars = upper.split('').filter(c => validPattern.test(c));
    if (chars.length > 0) {
      onProcessInput(chars);
    }
    setPasteText('');
    setShowPaste(false);
  }, [pasteText, validPattern, onProcessInput]);

  const handlePasteKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handlePasteSubmit();
    }
    if (e.key === 'Escape') {
      setShowPaste(false);
      setPasteText('');
    }
  };

  const btnBase = `p-1.5 rounded border border-slate-800 text-slate-600 transition-all ${accent}`;

  return (
    <div className="flex items-center gap-1">
      {/* Copy output */}
      <button
        onClick={handleCopy}
        disabled={!outputText}
        className={`${btnBase} disabled:opacity-20 disabled:cursor-not-allowed`}
        title="Copy output to clipboard"
      >
        {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
      </button>

      {/* Paste input toggle */}
      <div className="relative">
        <button
          onClick={() => { setShowPaste(!showPaste); setTimeout(() => textareaRef.current?.focus(), 50); }}
          className={`${btnBase} ${showPaste ? 'text-white border-slate-600 bg-slate-800' : ''}`}
          title="Paste text input"
        >
          <ClipboardPaste size={14} />
        </button>

        {/* Paste popover */}
        {showPaste && (
          <div className="absolute top-full mt-2 right-0 z-50 bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl min-w-[260px] animate-in fade-in slide-in-from-top-1 duration-150">
            <textarea
              ref={textareaRef}
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              onKeyDown={handlePasteKeyDown}
              placeholder="Paste or type text here..."
              rows={3}
              className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm font-mono text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:border-slate-500"
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-[10px] text-slate-600">Enter to process, Esc to cancel</span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => { setShowPaste(false); setPasteText(''); }}
                  className="px-2 py-1 text-[10px] font-bold text-slate-500 hover:text-slate-300 transition-colors"
                >
                  CANCEL
                </button>
                <button
                  onClick={handlePasteSubmit}
                  disabled={!pasteText.trim()}
                  className="px-3 py-1 text-[10px] font-bold bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-all disabled:opacity-30"
                >
                  PROCESS
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
