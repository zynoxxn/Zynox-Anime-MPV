import React, { useState } from 'react';
import {
  X,
  Download,
  Laptop,
  Smartphone,
  Apple,
  CheckCircle2,
  Copy,
  ExternalLink,
  Sparkles,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#07111F] border border-[#00A8FF]/30 rounded-3xl w-full max-w-lg p-5 sm:p-7 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-[#00A8FF]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#94A3B8] hover:text-white rounded-xl hover:bg-white/5 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#00A8FF] to-[#0055FF] p-0.5 shadow-lg shadow-[#00A8FF]/25 shrink-0 flex items-center justify-center">
            <div className="w-full h-full bg-[#050A14] rounded-[14px] flex items-center justify-center">
              <Download className="w-7 h-7 text-[#00CFFF]" />
            </div>
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#00A8FF]/15 text-[#00CFFF] text-[11px] font-extrabold border border-[#00A8FF]/30 mb-1">
              <Sparkles className="w-3 h-3" />
              <span>Web App &amp; Desktop Widget</span>
            </div>
            <h3 className="text-xl font-black text-[#F5F9FF] tracking-tight">
              Download ZYNOX ANIME
            </h3>
            <p className="text-xs text-[#94A3B8]">
              Add to Home Screen or Laptop Desktop for 1-click streaming
            </p>
          </div>
        </div>

        {/* If installed or prompt available */}
        {isInstalled ? (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>ZYNOX ANIME is already installed as a desktop / home screen widget on your device!</span>
          </div>
        ) : isInstallable ? (
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleInstallClick}
              className="w-full py-3.5 bg-gradient-to-r from-[#00A8FF] to-[#0066FF] hover:from-[#00B4FF] hover:to-[#1A75FF] text-white font-black text-sm rounded-xl shadow-lg shadow-[#00A8FF]/30 transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-98"
            >
              <Download className="w-4 h-4" />
              <span>Click Here to Install App Widget Now</span>
            </button>
            <p className="text-[11px] text-center text-[#6E7F95]">
              Creates a direct shortcut widget on your desktop or phone home screen.
            </p>
          </div>
        ) : null}

        {/* Feature Pills */}
        <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-semibold text-[#A9B8CC]">
          <div className="bg-[#0A1628] border border-white/5 rounded-xl p-2.5 flex flex-col items-center gap-1">
            <Zap className="w-4 h-4 text-[#00CFFF]" />
            <span>1-Click Launch</span>
          </div>
          <div className="bg-[#0A1628] border border-white/5 rounded-xl p-2.5 flex flex-col items-center gap-1">
            <Laptop className="w-4 h-4 text-[#00CFFF]" />
            <span>Desktop Widget</span>
          </div>
          <div className="bg-[#0A1628] border border-white/5 rounded-xl p-2.5 flex flex-col items-center gap-1">
            <Smartphone className="w-4 h-4 text-[#00CFFF]" />
            <span>Mobile Home Screen</span>
          </div>
        </div>

        {/* Platform Selection Tabs */}
        <div className="space-y-3">
          <div className="flex rounded-xl bg-[#050A14] p-1 border border-white/10">
            <button
              type="button"
              onClick={() => setActiveTab('desktop')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'desktop'
                  ? 'bg-[#1683FF] text-white shadow-md'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>Laptop / PC</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('android')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'android'
                  ? 'bg-[#1683FF] text-white shadow-md'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Android</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ios')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'ios'
                  ? 'bg-[#1683FF] text-white shadow-md'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <Apple className="w-3.5 h-3.5" />
              <span>iPhone / iOS</span>
            </button>
          </div>

          {/* Tab Content Instructions */}
          <div className="bg-[#050A14] border border-white/5 rounded-2xl p-4 text-xs text-[#CBD5E1] space-y-3">
            {activeTab === 'desktop' && (
              <div className="space-y-2">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Laptop className="w-4 h-4 text-[#00CFFF]" />
                  <span>How to add to Laptop / PC Desktop:</span>
                </div>
                <ol className="list-decimal list-inside space-y-2 text-[#94A3B8] pl-1 leading-relaxed">
                  <li>
                    In <strong className="text-white">Google Chrome</strong> or <strong className="text-white">Microsoft Edge</strong>, look at the right side of the address/URL bar for the <strong className="text-[#00CFFF]">Install (📥 or ⊞)</strong> icon.
                  </li>
                  <li>
                    Alternatively, click the browser menu <strong className="text-white">(⋮)</strong> &gt; select <strong className="text-white">&ldquo;Save and share&rdquo;</strong> or <strong className="text-white">&ldquo;Install ZYNOX ANIME&rdquo;</strong>.
                  </li>
                  <li>
                    Click <strong className="text-white">&ldquo;Install&rdquo;</strong>. A desktop shortcut widget will appear on your desktop and taskbar.
                  </li>
                </ol>
              </div>
            )}

            {activeTab === 'android' && (
              <div className="space-y-2">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-[#00CFFF]" />
                  <span>How to add to Android Home Screen:</span>
                </div>
                <ol className="list-decimal list-inside space-y-2 text-[#94A3B8] pl-1 leading-relaxed">
                  <li>
                    Open ZYNOX ANIME in <strong className="text-white">Chrome</strong> on your phone.
                  </li>
                  <li>
                    Tap the three dots menu <strong className="text-white">(⋮)</strong> at the top-right corner.
                  </li>
                  <li>
                    Select <strong className="text-white">&ldquo;Add to Home screen&rdquo;</strong> or <strong className="text-white">&ldquo;Install app&rdquo;</strong>.
                  </li>
                  <li>
                    Tap <strong className="text-white">&ldquo;Install&rdquo;</strong> or <strong className="text-white">&ldquo;Add&rdquo;</strong>. The ZYNOX ANIME icon widget will now sit on your home screen!
                  </li>
                </ol>
              </div>
            )}

            {activeTab === 'ios' && (
              <div className="space-y-2">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Apple className="w-4 h-4 text-[#00CFFF]" />
                  <span>How to add to iPhone / iPad Home Screen:</span>
                </div>
                <ol className="list-decimal list-inside space-y-2 text-[#94A3B8] pl-1 leading-relaxed">
                  <li>
                    Open ZYNOX ANIME in the <strong className="text-white">Safari</strong> browser.
                  </li>
                  <li>
                    Tap the <strong className="text-white">Share</strong> button (square icon with an upward arrow at the bottom of the screen).
                  </li>
                  <li>
                    Scroll down and tap <strong className="text-white">&ldquo;Add to Home Screen&rdquo;</strong>.
                  </li>
                  <li>
                    Tap <strong className="text-white">&ldquo;Add&rdquo;</strong> at the top right.
                  </li>
                </ol>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-1 border-t border-white/5 text-xs">
          <button
            type="button"
            onClick={handleCopyUrl}
            className="text-[#94A3B8] hover:text-white flex items-center gap-1.5 transition-colors font-medium"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copied ? 'Link Copied!' : 'Copy Website URL'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#0D1B2E] hover:bg-[#11243C] text-[#F5F9FF] font-bold rounded-xl transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
