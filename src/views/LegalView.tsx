import React from 'react';
import { ShieldAlert, FileText, Info, Send, Mail, Check, Copy, ArrowLeft } from 'lucide-react';

interface LegalViewProps {
  tab: 'about' | 'dmca' | 'disclaimer';
  navigate: (path: string) => void;
  onShowMessage?: (msg: string) => void;
}

export const LegalView: React.FC<LegalViewProps> = ({ tab, navigate, onShowMessage }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopied(true);
    onShowMessage?.('Email copied to clipboard!');
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-xs text-[#A9B8CC] hover:text-[#00D9FF] font-bold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-[#0A1628] p-1 rounded-xl border border-white/10">
          <button
            type="button"
            onClick={() => navigate('/about')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              tab === 'about' ? 'bg-[#00A8FF] text-black' : 'text-[#A9B8CC] hover:text-white'
            }`}
          >
            About Us
          </button>
          <button
            type="button"
            onClick={() => navigate('/dmca')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              tab === 'dmca' ? 'bg-[#00A8FF] text-black' : 'text-[#A9B8CC] hover:text-white'
            }`}
          >
            DMCA
          </button>
          <button
            type="button"
            onClick={() => navigate('/disclaimer')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              tab === 'disclaimer' ? 'bg-[#00A8FF] text-black' : 'text-[#A9B8CC] hover:text-white'
            }`}
          >
            Disclaimer
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-[#0A1628] border border-[#00A8FF]/30 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6 text-[#A9B8CC]">
        {tab === 'about' && (
          <div className="space-y-6 leading-relaxed">
            <div className="border-b border-white/10 pb-4">
              <h1 className="text-2xl sm:text-3xl font-black text-[#F5F9FF] flex items-center gap-3">
                <Info className="w-7 h-7 text-[#00A8FF]" />
                <span>About Us — About ZYNOX ANIME</span>
              </h1>
              <p className="text-sm text-[#00D9FF] font-semibold mt-1">
                Welcome to ZYNOX ANIME — Your #1 destination for free anime in Hindi, English, Tamil,
                Telugu, and Multi Audio.
              </p>
            </div>

            <p className="text-sm sm:text-base text-[#F5F9FF]">
              Welcome to ZYNOX ANIME — Your #1 destination for free anime downloads in Hindi, English,
              Tamil, Telugu, and Japanese (Multi Audio).
            </p>

            <p className="text-sm">
              ZYNOX ANIME is an Indian anime fan site dedicated to bringing you the latest and best
              anime series, movies, and OVAs — completely free of charge.
            </p>

            <p className="text-sm">
              We provide download links for anime in multiple audio tracks including Hindi Dubbed,
              English Dubbed, Japanese with subtitles, and Multi Audio versions in 480p, 720p, and
              1080p quality.
            </p>

            <div className="space-y-3 bg-[#06101F] p-5 sm:p-6 rounded-2xl border border-white/5">
              <h2 className="text-lg font-black text-[#F5F9FF]">Our Mission</h2>
              <p className="text-sm">
                We believe every anime fan in India deserves access to high-quality anime content in
                their preferred language. Our mission is to make anime accessible to everyone.
              </p>
            </div>

            <div className="space-y-3 bg-[#06101F] p-5 sm:p-6 rounded-2xl border border-white/5">
              <h2 className="text-lg font-black text-[#F5F9FF]">What We Offer</h2>
              <ul className="list-disc list-inside space-y-1.5 text-sm">
                <li>Hindi Dubbed Anime Episodes &amp; Movies</li>
                <li>Multi Audio Anime (Hindi + English + Japanese)</li>
                <li>Quality Downloads (480p | 720p | 1080p Options)</li>
                <li>Latest Seasonal Anime Updates</li>
                <li>Regular Upload Schedule</li>
              </ul>
            </div>

            <div className="space-y-4 bg-[#06101F] p-5 sm:p-6 rounded-2xl border border-[#00A8FF]/20">
              <h2 className="text-lg font-black text-[#F5F9FF] flex items-center gap-2">
                <Send className="w-5 h-5 text-[#00A8FF]" />
                <span>Join Our Community &amp; Follow Us</span>
              </h2>
              <p className="text-sm">
                Stay updated with latest anime releases by joining our Telegram and Instagram.
              </p>

              <div className="flex flex-wrap gap-3 pt-1">
                <a
                  href="https://t.me/ZynoxAnime"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 bg-[#00A8FF] hover:bg-[#0092dd] text-black font-black text-xs sm:text-sm rounded-xl inline-flex items-center justify-center gap-2 shadow-lg shadow-[#00A8FF]/20 transition-all hover:scale-105"
                >
                  <Send className="w-4 h-4 fill-black" />
                  <span>Telegram</span>
                </a>

                <a
                  href="https://www.instagram.com/zairo_xn_7?igsi=cjhpeGF3Mnl0Njhl"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-black text-xs sm:text-sm rounded-xl inline-flex items-center justify-center gap-2 shadow-lg shadow-pink-500/20 transition-all hover:scale-105"
                >
                  <span>Instagram</span>
                </a>

                <button
                  type="button"
                  onClick={() => handleCopyEmail('zairoxmax2.0@gmail.com')}
                  className="px-5 py-2.5 bg-[#0D1B2E] hover:bg-[#11243C] text-[#F5F9FF] border border-white/10 text-xs sm:text-sm font-bold rounded-xl inline-flex items-center justify-center gap-2 transition-colors"
                >
                  <Mail className="w-4 h-4 text-[#00A8FF]" />
                  <span>{copied ? 'Copied Email!' : 'zairoxmax2.0@gmail.com'}</span>
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-[#6E7F95]" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === 'dmca' && (
          <div className="space-y-6 leading-relaxed">
            <div className="border-b border-white/10 pb-4">
              <h1 className="text-2xl sm:text-3xl font-black text-[#F5F9FF] flex items-center gap-3">
                <FileText className="w-7 h-7 text-[#00A8FF]" />
                <span>DMCA Policy &amp; Copyright Notice</span>
              </h1>
              <p className="text-sm text-amber-300 font-semibold mt-1">
                ZYNOX ANIME respects the intellectual property rights of all content creators and
                copyright holders.
              </p>
            </div>

            <div className="space-y-3 bg-[#06101F] p-5 sm:p-6 rounded-2xl border border-white/5">
              <h2 className="text-lg font-black text-[#F5F9FF]">Our Policy</h2>
              <p className="text-sm">
                ZYNOX ANIME does NOT host any video files, anime episodes, or movie files on its
                own servers. We only index and link to content that is already publicly available on
                third-party file hosting websites on the internet.
              </p>
              <p className="text-sm">
                We act as a search engine / index for content available online. All copyright
                belongs to their respective owners including anime studios, distributors, and
                licensors.
              </p>
            </div>

            <div className="space-y-3 bg-[#06101F] p-5 sm:p-6 rounded-2xl border border-white/5">
              <h2 className="text-lg font-black text-[#F5F9FF]">DMCA Takedown Request</h2>
              <p className="text-sm">
                If you are a copyright owner or authorized representative and believe that any
                content linked on ZYNOX ANIME infringes your copyright, please send us a DMCA
                takedown notice with the following details:
              </p>

              <ol className="list-decimal list-inside space-y-1.5 text-sm bg-[#0A1628] p-4 rounded-xl border border-white/5">
                <li>Your full name and contact information</li>
                <li>Description of the copyrighted work</li>
                <li>The specific URL on ZYNOX ANIME that links to the infringing content</li>
                <li>A statement that you have a good faith belief that the use is not authorized</li>
                <li>Your digital signature</li>
              </ol>
            </div>

            <div className="bg-[#06101F] p-5 sm:p-6 rounded-2xl border border-[#00A8FF]/30 space-y-3">
              <div className="text-xs text-[#A9B8CC]">Send DMCA requests to:</div>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className="font-bold text-[#00D9FF] text-base font-mono">
                  Email: zairoxmax2.0@gmail.com
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyEmail('zairoxmax2.0@gmail.com')}
                  className="px-4 py-2 bg-[#00A8FF] text-black font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-[#00A8FF]/20"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy Email Address'}</span>
                </button>
              </div>
              <p className="text-xs text-[#6E7F95]">
                We will review and process all valid DMCA requests within 48-72 hours and remove the
                relevant links if required.
              </p>
            </div>

            <p className="text-xs text-[#6E7F95] italic">
              Note: We are not responsible for content hosted on third-party servers. Please also
              contact the respective hosting platform directly for faster removal.
            </p>
          </div>
        )}

        {tab === 'disclaimer' && (
          <div className="space-y-6 leading-relaxed">
            <div className="border-b border-white/10 pb-4">
              <h1 className="text-2xl sm:text-3xl font-black text-[#F5F9FF] flex items-center gap-3">
                <ShieldAlert className="w-7 h-7 text-[#00A8FF]" />
                <span>Disclaimer</span>
              </h1>
            </div>

            <div className="bg-[#06101F] border border-[#00A8FF]/30 p-6 rounded-2xl space-y-3 shadow-lg">
              <p className="text-base sm:text-lg font-bold text-[#F5F9FF] leading-relaxed">
                ZYNOX ANIME does not store any files on own server, We only index links from
                internet which are hosted on third-party services. We Index Links Just Like Google.
              </p>
            </div>

            <div className="space-y-3 text-sm text-[#A9B8CC]">
              <p>
                For copyright queries or removal requests, please refer to our DMCA policy or email{' '}
                <strong className="text-[#00D9FF]">zairoxmax2.0@gmail.com</strong>.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
