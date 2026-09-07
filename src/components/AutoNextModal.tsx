import React, { useEffect, useState } from 'react';
import { Play, X, FastForward } from 'lucide-react';

interface AutoNextModalProps {
  isOpen: boolean;
  nextEpisodeNumber: number;
  onPlayNext: () => void;
  onCancel: () => void;
}

export const AutoNextModal: React.FC<AutoNextModalProps> = ({
  isOpen,
  nextEpisodeNumber,
  onPlayNext,
  onCancel,
}) => {
  const [countdown, setCountdown] = useState<number>(5);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(5);
      return;
    }

    setCountdown(5);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onPlayNext();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, onPlayNext]);

  if (!isOpen) return null;

  return (
    <div className="absolute bottom-6 right-6 z-30 bg-[#07111F]/95 border border-[#1683FF]/50 rounded-2xl p-4 shadow-2xl backdrop-blur-md max-w-xs animate-in slide-in-from-bottom-4 duration-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-white text-xs font-bold uppercase tracking-wider">
          <FastForward className="w-4 h-4 text-[#00CFFF]" />
          <span>Auto Next Episode</span>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-[#94A3B8] hover:text-white p-1 rounded-lg"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <p className="text-sm font-semibold text-white mb-3">
        Playing Episode {nextEpisodeNumber} in <span className="text-[#00CFFF] font-mono text-base">{countdown}s</span>
      </p>

      {/* Countdown Progress Bar */}
      <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mb-3">
        <div
          className="bg-[#1683FF] h-full transition-all duration-1000 ease-linear"
          style={{ width: `${(countdown / 5) * 100}%` }}
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPlayNext}
          className="flex-1 py-1.5 bg-[#1683FF] hover:bg-[#2196FF] text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-[#1683FF]/30"
        >
          <Play className="w-3.5 h-3.5 fill-white" />
          <span>Play Now</span>
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-[#94A3B8] hover:text-white text-xs font-semibold rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
