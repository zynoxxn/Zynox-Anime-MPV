import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Laptop,
  Smartphone,
  Apple,
  CheckCircle2,
  Copy,
  Zap,
} from 'lucide-react';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDirectInstall?: () => Promise<boolean>;
  isInstallable?: boolean;
  isInstalled?: boolean;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  isOpen,
  onClose,
  onDirectInstall,
  isInstallable = false,
  isInstalled = false,
}) => {
  const [activeTab, setActiveTab] = useState<'desktop' | 'android' | 'ios'>('desktop');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyUrl = () => {
    try {
      navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore
    }
  };

  const handleInstallClick = async () => {
    if (onDirectInstall) {
      const installed = await onDirectInstall();
      if (installed) {
        onClose();
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="bg-[#0B1324] border border-white/10 rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl space-y-5 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close install dialog"
          className="absolute top-4 right-4 w-8 h-8 rounded-lg text-[#94A3B8] hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3.5 pr-8">
          <div className="w-12 h-12 rounded-xl bg-[#1E88FF]/15 border border-[#1E88FF]/30 shrink-0 flex items-center justify-center text-[#1E88FF]">
            <Download className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-black text-white tracking-tight truncate">
              Install ZYNOX ANIME
            </h3>
            <p className="text-xs text-[#94A3B8]">
              Add to your home screen or desktop for 1-click streaming.
            </p>
          </div>
        </div>

        {isInstalled ? (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>ZYNOX ANIME is already installed on this device.</span>
          </div>
        ) : isInstallable ? (
          <button
            type="button"
            onClick={handleInstallClick}
            className="w-full h-11 bg-[#1E88FF] hover:bg-[#3B9BFF] text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Install App Now</span>
          </button>
        ) : null}

        <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-semibold text-[#CBD5E1]">
          <div className="bg-[#101A30] border border-white/5 rounded-xl p-2.5 flex flex-col items-center gap-1">
            <Zap className="w-4 h-4 text-[#1E88FF]" />
            <span>Instant Launch</span>
          </div>
          <div className="bg-[#101A30] border border-white/5 rounded-xl p-2.5 flex flex-col items-center gap-1">
            <Laptop className="w-4 h-4 text-[#1E88FF]" />
            <span>Desktop App</span>
          </div>
          <div className="bg-[#101A30] border border-white/5 rounded-xl p-2.5 flex flex-col items-center gap-1">
            <Smartphone className="w-4 h-4 text-[#1E88FF]" />
            <span>Home Screen</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex rounded-xl bg-[#050A14] p-1 border border-white/10">
            <button
              type="button"
              onClick={() => setActiveTab('desktop')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'desktop'
                  ? 'bg-[#1E88FF] text-white'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>Desktop</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('android')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'android'
                  ? 'bg-[#1E88FF] text-white'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Android</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ios')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'ios'
                  ? 'bg-[#1E88FF] text-white'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <Apple className="w-3.5 h-3.5" />
              <span>iOS</span>
            </button>
          </div>

          <div className="bg-[#101A30] border border-white/10 rounded-xl p-4 text-xs text-[#CBD5E1] space-y-2">
            {activeTab === 'desktop' && (
              <ol className="list-decimal list-inside space-y-1.5 text-[#94A3B8] leading-relaxed">
                <li>
                  In <strong className="text-white">Chrome</strong> or <strong className="text-white">Edge</strong>, click the <strong className="text-white">Install</strong> icon on the right side of the address bar.
                </li>
                <li>
                  Or open browser menu <strong className="text-white">(⋮)</strong> &rarr; <strong className="text-white">Save and share</strong> &rarr; <strong className="text-white">Install ZYNOX ANIME</strong>.
                </li>
              </ol>
            )}

            {activeTab === 'android' && (
              <ol className="list-decimal list-inside space-y-1.5 text-[#94A3B8] leading-relaxed">
                <li>Open ZYNOX ANIME in <strong className="text-white">Chrome</strong>.</li>
                <li>Tap the <strong className="text-white">(⋮)</strong> menu in the top-right corner.</li>
                <li>Tap <strong className="text-white">Add to Home screen</strong> or <strong className="text-white">Install app</strong>.</li>
              </ol>
            )}

            {activeTab === 'ios' && (
              <ol className="list-decimal list-inside space-y-1.5 text-[#94A3B8] leading-relaxed">
                <li>Open ZYNOX ANIME in <strong className="text-white">Safari</strong>.</li>
                <li>Tap the <strong className="text-white">Share</strong> button at the bottom bar.</li>
                <li>Scroll down and tap <strong className="text-white">Add to Home Screen</strong>.</li>
              </ol>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
          <button
            type="button"
            onClick={handleCopyUrl}
            className="text-[#94A3B8] hover:text-white flex items-center gap-1.5 transition-colors font-medium cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copied ? 'Link Copied!' : 'Copy Website URL'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 bg-[#101A30] hover:bg-[#16223D] border border-white/10 text-white font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
