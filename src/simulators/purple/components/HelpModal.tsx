import React from 'react';
import { X } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-neutral-800">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-purple-500">TYPE 97</span> "PURPLE" MANUAL
          </h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 space-y-6 text-neutral-300 leading-relaxed">
          <section>
            <h3 className="text-lg font-bold text-white mb-2">The Machine</h3>
            <p className="text-sm">
              The "Purple" (Type 97) was a Japanese diplomatic cipher machine used during WWII. Unlike the German Enigma which used rotors, Purple used stepping switches (like those in telephone exchanges).
            </p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white mb-2">How It Works</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="bg-neutral-800 p-3 rounded border border-neutral-700">
                    <strong className="text-purple-400 block mb-1">1. The Split</strong>
                    The 26 letters are split into two groups: <strong>Sixes</strong> (Vowels + Y) and <strong>Twenties</strong> (Consonants). They are encrypted separately.
                </div>
                <div className="bg-neutral-800 p-3 rounded border border-neutral-700">
                    <strong className="text-emerald-400 block mb-1">2. The Path</strong>
                    Sixes pass through 1 switch. Twenties pass through 3 switches (Fast, Medium, Slow) for stronger encryption.
                </div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white mb-2">Instructions</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm">
                <li><strong className="text-white">Set Mode:</strong> Choose Encrypt or Decrypt.</li>
                <li><strong className="text-white">Configure:</strong> (Optional) Adjust the starting positions of the switches using the +/- buttons in the Settings area.</li>
                <li><strong className="text-white">Type:</strong> Use the virtual keyboard or your physical keyboard. Watch the "Split" indicators light up.</li>
                <li><strong className="text-white">Observe:</strong> Notice how vowels only spin the Purple rotor, while consonants spin the Green rotors.</li>
            </ol>
          </section>

          <section className="bg-blue-900/20 p-4 rounded-lg border border-blue-800/50">
              <h4 className="text-blue-400 font-bold mb-1">Demo Tip</h4>
              <p className="text-xs text-blue-200">
                  Try encrypting the word <strong className="text-white">"JAPAN"</strong>. 
                  Notice how 'J', 'P', 'N' use the green Twenties path, while 'A' uses the purple Sixes path. 
                  Then, switch to DECRYPT, reset the keys to their start positions, and type the output to get "JAPAN" back.
              </p>
          </section>
        </div>
        
        <div className="p-6 border-t border-neutral-800 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-neutral-100 text-neutral-900 font-bold rounded hover:bg-white transition-colors"
          >
            ACKNOWLEDGE
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
