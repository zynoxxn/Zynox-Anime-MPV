import React, { useState } from 'react';
import { X, ShieldAlert, FileText, Info, Send, Mail, Check, Copy } from 'lucide-react';

export type LegalTab = 'about' | 'dmca' | 'disclaimer';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: LegalTab;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'about',
}) => {
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);
  const [copied, setCopied] = useState(false);

  // Sync tab if initialTab changes
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="bg-[#0A1628] border border-[#00A8FF]/30 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-[#A9B8CC] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#06101F]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#00A8FF]/15 text-[#00A8FF] flex items-center justify-center">
              {activeTab === 'about' ? (
                <Info className="w-4 h-4" />
              ) : activeTab === 'dmca' ? (
                <FileText className="w-4 h-4" />
              ) : (
                <ShieldAlert className="w-4 h-4" />
              )}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-[#F5F9FF]">
                {activeTab === 'about'
                  ? 'About ZYNOX ANIME'
                  : activeTab === 'dmca'
                  ? 'DMCA Policy & Takedown'
                  : 'Disclaimer'}
              </h2>
              <p className="text-[11px] text-[#6E7F95]">Official terms and platform information</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#A9B8CC] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-1 p-2 bg-[#06101F]/60 border-b border-white/5">
          <button
            type="button"
            onClick={() => setActiveTab('about')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'about'
                ? 'bg-[#00A8FF] text-black shadow-md shadow-[#00A8FF]/20'
                : 'text-[#A9B8CC] hover:text-white hover:bg-white/5'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>About Us</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('dmca')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'dmca'
                ? 'bg-[#00A8FF] text-black shadow-md shadow-[#00A8FF]/20'
                : 'text-[#A9B8CC] hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>DMCA</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('disclaimer')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'disclaimer'
                ? 'bg-[#00A8FF] text-black shadow-md shadow-[#00A8FF]/20'
                : 'text-[#A9B8CC] hover:text-white hover:bg-white/5'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Disclaimer</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm leading-relaxed">
          {activeTab === 'about' && (
            <div className="space-y-4 text-[#A9B8CC]">
              <div className="bg-[#06101F] p-4 rounded-2xl border border-[#00A8FF]/20 text-[#F5F9FF]">
                <h3 className="font-black text-sm sm:text-base text-[#00D9FF] mb-1">
                  About Us — About ZYNOX ANIME
                </h3>
                <p className="text-xs text-[#A9B8CC] leading-relaxed">
                  Welcome to ZYNOX ANIME — Your #1 destination for free anime in Hindi, English,
                  Tamil, Telugu, and Multi Audio.
                </p>
              </div>

              <p>
                Welcome to ZYNOX ANIME — Your #1 destination for free anime downloads in Hindi,
                English, Tamil, Telugu, and Japanese (Multi Audio).
              </p>

              <p>
                ZYNOX ANIME is an Indian anime fan site dedicated to bringing you the latest and
                best anime series, movies, and OVAs — completely free of charge.
              </p>

              <p>
                We provide download links for anime in multiple audio tracks including Hindi
                Dubbed, English Dubbed, Japanese with subtitles, and Multi Audio versions in 480p,
                720p, and 1080p quality.
              </p>

              <div className="space-y-2 pt-2 border-t border-white/5">
                <h4 className="font-bold text-[#F5F9FF] text-sm">Our Mission</h4>
                <p>
                  We believe every anime fan in India deserves access to high-quality anime content
                  in their preferred language. Our mission is to make anime accessible to everyone.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-white/5">
                <h4 className="font-bold text-[#F5F9FF] text-sm">What We Offer</h4>
                <ul className="list-disc list-inside space-y-1 text-xs text-[#A9B8CC]">
                  <li>Hindi Dubbed Anime Episodes &amp; Movies</li>
                  <li>Multi Audio Anime (Hindi + English + Japanese)</li>
                  <li>Quality Downloads (480p | 720p | 1080p Options)</li>
                  <li>Latest Seasonal Anime Updates</li>
                  <li>Regular Upload Schedule</li>
                </ul>
              </div>

              <div className="bg-[#06101F] p-4 rounded-2xl border border-white/5 space-y-3 pt-3">
                <h4 className="font-bold text-[#F5F9FF] text-sm flex items-center gap-2">
                  <Send className="w-4 h-4 text-[#00A8FF]" />
                  <span>Join Our Community &amp; Follow Us</span>
                </h4>
                <p className="text-xs">
                  Stay updated with latest anime releases by joining our Telegram, YouTube, and Instagram.
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  <a
                    href="https://t.me/ZynoxAnime"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 bg-[#00A8FF] hover:bg-[#0092dd] text-black font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-[#00A8FF]/20"
                  >
                    <Send className="w-3.5 h-3.5 fill-black" />
                    <span>Telegram</span>
                  </a>

                  <a
                    href="https://youtube.com/@neox_xn?si=qUlnuIAFmgaCgtv0"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-red-600/20"
                  >
                    <span>YouTube</span>
                  </a>

                  <a
                    href="https://www.instagram.com/zairo_xn_7?igsi=cjhpeGF3Mnl0Njhl"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-pink-500/20"
                  >
                    <span>Instagram</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => handleCopyEmail('zairoxmax2.0@gmail.com')}
                    className="px-3.5 py-2 bg-[#0D1B2E] hover:bg-[#11243C] text-[#F5F9FF] border border-white/10 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#00A8FF]" />
                    <span>{copied ? 'Copied Email!' : 'zairoxmax2.0@gmail.com'}</span>
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-[#6E7F95]" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'dmca' && (
            <div className="space-y-4 text-[#A9B8CC]">
              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl text-amber-200">
                <p className="font-bold text-xs sm:text-sm">
                  ZYNOX ANIME respects the intellectual property rights of all content creators and
                  copyright holders.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-[#F5F9FF] text-sm">Our Policy</h4>
                <p>
                  ZYNOX ANIME does NOT host any video files, anime episodes, or movie files on its
                  own servers. We only index and link to content that is already publicly available on
                  third-party file hosting websites on the internet.
                </p>
                <p>
                  We act as a search engine / index for content available online. All copyright
                  belongs to their respective owners including anime studios, distributors, and
                  licensors.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-white/5">
                <h4 className="font-bold text-[#F5F9FF] text-sm">DMCA Takedown Request</h4>
                <p>
                  If you are a copyright owner or authorized representative and believe that any
                  content linked on ZYNOX ANIME infringes your copyright, please send us a DMCA
                  takedown notice with the following details:
                </p>

                <ol className="list-decimal list-inside space-y-1 text-xs text-[#A9B8CC] bg-[#06101F] p-4 rounded-2xl border border-white/5">
                  <li>Your full name and contact information</li>
                  <li>Description of the copyrighted work</li>
                  <li>The specific URL on ZYNOX ANIME that links to the infringing content</li>
                  <li>A statement that you have a good faith belief that the use is not authorized</li>
                  <li>Your digital signature</li>
                </ol>
              </div>

              <div className="bg-[#06101F] p-4 rounded-2xl border border-[#00A8FF]/20 space-y-2">
                <div className="text-xs text-[#A9B8CC]">Send DMCA requests to:</div>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-bold text-[#00D9FF] text-sm font-mono">
                    Email: zairoxmax2.0@gmail.com
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyEmail('zairoxmax2.0@gmail.com')}
                    className="px-3 py-1.5 bg-[#00A8FF] text-black font-bold text-xs rounded-lg flex items-center gap-1"
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy Email'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-[#6E7F95]">
                  We will review and process all valid DMCA requests within 48-72 hours and remove
                  the relevant links if required.
                </p>
              </div>

              <p className="text-[11px] text-[#6E7F95] italic">
                Note: We are not responsible for content hosted on third-party servers. Please also
                contact the respective hosting platform directly for faster removal.
              </p>
            </div>
          )}

          {activeTab === 'disclaimer' && (
            <div className="space-y-4 text-[#A9B8CC]">
              <div className="bg-[#06101F] border border-[#00A8FF]/30 p-5 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-[#00D9FF] font-bold text-sm">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Platform Disclaimer</span>
                </div>
                <p className="text-sm font-bold text-[#F5F9FF] leading-relaxed">
                  ZYNOX ANIME does not store any files on own server, We only index links from
                  internet which are hosted on third-party services. We Index Links Just Like Google.
                </p>
              </div>

              <div className="space-y-2 text-xs text-[#A9B8CC] leading-relaxed">
                <p>
                  For copyright queries or removal requests, refer to our DMCA policy or email{' '}
                  <strong className="text-[#00D9FF]">zairoxmax2.0@gmail.com</strong>.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#06101F] border-t border-white/5 flex items-center justify-between text-xs">
          <span className="text-[#6E7F95]">&copy; 2026–2027 ZYNOX ANIME</span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#00A8FF] hover:bg-[#0092dd] text-black font-extrabold rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
