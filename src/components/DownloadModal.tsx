import React from 'react';
import { X, Download, ExternalLink, HardDrive, ShieldCheck, Zap } from 'lucide-react';
import type { DownloadMirror } from '../lib/downloadRedirect';
import { executeDownloadRedirect } from '../lib/downloadRedirect';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  mirrors: DownloadMirror[];
  onShowMessage?: (msg: string) => void;
}

export const DownloadModal: React.FC<DownloadModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  mirrors,
  onShowMessage,
}) => {
  if (!isOpen) return null;

  const handleDownloadClick = (url: string, quality: string) => {
    executeDownloadRedirect(url, `${title} (${quality})`, onShowMessage);
    onClose();
  };

  const filteredMirrors = mirrors.filter((m) => {
    if (m.isEmbedPlayer) return false;
    const q = (m.quality || '').toLowerCase();
    if (q.includes('360') || q.includes('480')) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#07111F] border border-white/10 rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0E2444] text-[#3B9BFF] flex items-center justify-center">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white leading-snug">{title}</h3>
              <p className="text-[11px] text-[#94A3B8]">{subtitle || 'Direct Download (720p & 1080p)'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#94A3B8] hover:text-white rounded-lg hover:bg-[#16233D] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Download Mirrors List */}
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {filteredMirrors.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#94A3B8] bg-[#050A14] rounded-xl border border-white/5">
              No direct download links found.
            </div>
          ) : (
            filteredMirrors.map((mirror, idx) => {
              const is720 = (mirror.quality || '').toLowerCase().includes('720');
              return (
                <a
                  key={idx}
                  href={mirror.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    e.preventDefault();
                    handleDownloadClick(mirror.url, mirror.quality);
                  }}
                  className={`group flex items-center justify-between p-3 rounded-xl bg-[#0B1728] hover:bg-[#10243E] border border-[#1B2B45] ${
                    is720 ? 'hover:border-[#145349]' : 'hover:border-[#1E4B8A]'
                  } transition-colors cursor-pointer`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        is720
                          ? 'bg-[#0B2A28] text-emerald-400'
                          : 'bg-[#0E2444] text-[#3B9BFF]'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div
                        className={`text-xs sm:text-sm font-bold text-white transition-colors flex items-center gap-1.5 ${
                          is720 ? 'group-hover:text-emerald-300' : 'group-hover:text-[#3B9BFF]'
                        }`}
                      >
                        <span className="truncate">{mirror.quality}</span>
                        {mirror.host && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[#16233D] text-[#94A3B8] shrink-0">
                            {mirror.host}
                          </span>
                        )}
                      </div>
                      {mirror.size && (
                        <div className="text-[10px] text-[#94A3B8] flex items-center gap-1 mt-0.5">
                          <HardDrive className="w-2.5 h-2.5" />
                          <span>{mirror.size}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors shrink-0 ${
                      is720
                        ? 'text-emerald-400 bg-[#0B2A28] border-[#145349] group-hover:bg-[#103D37]'
                        : 'text-[#3B9BFF] bg-[#0E2444] border-[#1E4B8A] group-hover:bg-[#143360]'
                    }`}
                  >
                    <span>Download</span>
                    <ExternalLink className="w-3 h-3" />
                  </div>
                </a>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="text-white hover:underline text-xs font-semibold px-2 py-1"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
