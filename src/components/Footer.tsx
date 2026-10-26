import React from 'react';
import type { SiteConfig } from '../types/library';
import { Send, Film, Mail, MessageSquare, Monitor, ShieldCheck, Instagram, ChevronRight, Compass, Sparkles, ExternalLink } from 'lucide-react';

interface FooterProps {
  siteConfig: SiteConfig;
  navigate: (path: string) => void;
  onRequestAnimeClick: () => void;
  onOpenLegal?: (tab: 'about' | 'dmca' | 'disclaimer') => void;
}

const ALPHABETS = ['#', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

const POPULAR_GENRES = [
  'Action',
  'Adventure',
  'Romance',
  'Fantasy',
  'Comedy',
  'Sci-Fi',
  'Shounen',
  'Supernatural',
  'Drama',
  'Mystery',
];

export const Footer: React.FC<FooterProps> = ({
  siteConfig,
  navigate,
  onRequestAnimeClick,
  onOpenLegal,
}) => {
  const telegram = siteConfig.telegramUrl || 'https://t.me/ZynoxAnime';
  const instagram = siteConfig.instagramUrl || 'https://www.instagram.com/zairo_xn_7?igsi=cjhpeGF3Mnl0Njhl';
  const email = siteConfig.contactEmail || 'zairoxmax2.0@gmail.com';
  const discord = siteConfig.discordUrl || 'https://discord.gg/zynox';

  const handleLegalClick = (tab: 'about' | 'dmca' | 'disclaimer') => {
    if (onOpenLegal) {
      onOpenLegal(tab);
    } else {
      navigate(`/${tab}`);
    }
  };

  return (
    <footer className="border-t border-white/10 bg-[#030712] text-[#94A3B8] pt-12 md:pt-16 pb-10 mt-20 relative overflow-hidden">
      {/* Subtle background ambient glow for high-end cinematic feel */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#1683FF]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#00CFFF]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-12">
        {/* 1. TOP HERO ROW: Brand + Telegram Join Banner */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6 p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-[#071324] via-[#08172c] to-[#050e1c] border border-white/10 shadow-2xl">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-2xl sm:text-3xl tracking-wider text-white uppercase">
                {siteConfig.logoText || 'ZYNOX'}
              </span>
              <span className="text-[#1683FF] font-extrabold text-2xl sm:text-3xl tracking-wider uppercase">
                ANIME
              </span>
              <span className="px-2 py-0.5 ml-2 text-[10px] font-bold uppercase rounded-md bg-[#1683FF]/20 text-[#00CFFF] border border-[#1683FF]/30">
                Official
              </span>
            </div>
            <p className="text-sm sm:text-base text-[#CBD5E1] leading-relaxed">
              {siteConfig.tagline || 'Watch & download Indian Regional Dubbed Anime Online in Hindi Dub & English Sub in Ultra HD.'}
            </p>
          </div>

          {/* Prominent Telegram CTA */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <a
              href={telegram}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-[#1683FF] to-[#00A8FF] hover:from-[#1b8aff] hover:to-[#17b5ff] text-white font-bold text-sm rounded-xl shadow-xl shadow-[#1683FF]/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Send className="w-4.5 h-4.5 fill-white text-white" />
              <span>Join Telegram Channel</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>

            <button
              type="button"
              onClick={onRequestAnimeClick}
              className="inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-sm rounded-xl transition-all cursor-pointer hover:border-[#1683FF]/50"
            >
              <Film className="w-4 h-4 text-[#1683FF]" />
              <span>Request Anime</span>
            </button>
          </div>
        </div>

        {/* 2. A-Z ANIME DIRECTORY JUMP BAR (Desktop optimized) */}
        <div className="p-4 rounded-xl bg-[#06101E]/80 border border-white/5 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-[#E2E8F0]">
            <span className="flex items-center gap-1.5 uppercase tracking-wider text-[#1683FF]">
              <Compass className="w-3.5 h-3.5" />
              A-Z List
            </span>
            <span className="text-[#64748B] text-[11px] hidden sm:inline">Browse anime by starting letter</span>
          </div>

          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
            {ALPHABETS.map((letter) => (
              <button
                key={letter}
                type="button"
                onClick={() => navigate(`/browse?letter=${letter === '#' ? '0-9' : letter}`)}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#081528] hover:bg-[#1683FF] text-[#CBD5E1] hover:text-white border border-white/5 hover:border-[#1683FF] text-xs font-semibold flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95"
                title={`Filter by ${letter}`}
              >
                {letter}
              </button>
            ))}
          </div>
        </div>

        {/* 3. DESKTOP 4-COLUMN MAIN FOOTER CONTENT */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10 pt-4">
          
          {/* Column 1: About Platform (Span 4) */}
          <div className="lg:col-span-4 space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-4 bg-[#1683FF] rounded-full inline-block" />
              About Zynox Anime
            </h4>
            <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
              Zynox Anime is your premier destination for watching and downloading Indian regional dubbed anime online. Enjoy free streaming in Hindi Dub, Tamil, Telugu, and English Sub with ultra-fast servers and full HD resolution.
            </p>
            <div className="pt-2 flex items-center gap-3">
              <a
                href={telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl bg-[#081528] border border-white/10 hover:border-[#1683FF] flex items-center justify-center text-[#CBD5E1] hover:text-[#1683FF] hover:bg-[#1683FF]/10 transition-all cursor-pointer"
                title="Telegram Channel"
              >
                <Send className="w-4.5 h-4.5" />
              </a>
              <a
                href={instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl bg-[#081528] border border-white/10 hover:border-pink-500 flex items-center justify-center text-[#CBD5E1] hover:text-pink-400 hover:bg-pink-500/10 transition-all cursor-pointer"
                title="Instagram"
              >
                <Instagram className="w-4.5 h-4.5" />
              </a>
              <a
                href={discord}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl bg-[#081528] border border-white/10 hover:border-[#5865F2] flex items-center justify-center text-[#CBD5E1] hover:text-[#5865F2] hover:bg-[#5865F2]/10 transition-all cursor-pointer"
                title="Discord Community"
              >
                <MessageSquare className="w-4.5 h-4.5" />
              </a>
              <a
                href={`mailto:${email}`}
                className="w-10 h-10 rounded-xl bg-[#081528] border border-white/10 hover:border-[#1683FF] flex items-center justify-center text-[#CBD5E1] hover:text-[#1683FF] hover:bg-[#1683FF]/10 transition-all cursor-pointer"
                title="Email Us"
              >
                <Mail className="w-4.5 h-4.5" />
              </a>
            </div>
          </div>

          {/* Column 2: Quick Navigation (Span 3) */}
          <div className="lg:col-span-3 space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-4 bg-[#1683FF] rounded-full inline-block" />
              Quick Navigation
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="hover:text-white hover:translate-x-1 transition-all flex items-center gap-1.5 cursor-pointer text-[#94A3B8]"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-[#1683FF]" />
                  <span>Home</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/browse')}
                  className="hover:text-white hover:translate-x-1 transition-all flex items-center gap-1.5 cursor-pointer text-[#94A3B8]"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-[#1683FF]" />
                  <span>Browse All Anime</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/browse?type=Movie')}
                  className="hover:text-white hover:translate-x-1 transition-all flex items-center gap-1.5 cursor-pointer text-[#94A3B8]"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-[#1683FF]" />
                  <span>Anime Movies</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/browse?type=TV')}
                  className="hover:text-white hover:translate-x-1 transition-all flex items-center gap-1.5 cursor-pointer text-[#94A3B8]"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-[#1683FF]" />
                  <span>TV Series</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/schedule')}
                  className="hover:text-white hover:translate-x-1 transition-all flex items-center gap-1.5 cursor-pointer text-[#94A3B8]"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-[#1683FF]" />
                  <span>Release Schedule</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/browse?sort=popular')}
                  className="hover:text-white hover:translate-x-1 transition-all flex items-center gap-1.5 cursor-pointer text-[#94A3B8]"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-[#1683FF]" />
                  <span>Trending &amp; Top Rated</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Popular Genres (Span 3) */}
          <div className="lg:col-span-3 space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-4 bg-[#1683FF] rounded-full inline-block" />
              Popular Genres
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
              {POPULAR_GENRES.map((genre) => (
                <button
                  key={genre}
                  type="button"
                  onClick={() => navigate(`/browse?genre=${genre}`)}
                  className="py-1.5 px-2.5 rounded-lg bg-[#081528] hover:bg-[#1683FF]/20 border border-white/5 hover:border-[#1683FF]/40 text-[#94A3B8] hover:text-[#00CFFF] transition-all text-left truncate cursor-pointer text-xs"
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          {/* Column 4: Legal & Policy (Span 2) */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-4 bg-[#1683FF] rounded-full inline-block" />
              Legal &amp; Policy
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => handleLegalClick('dmca')}
                  className="hover:text-[#00CFFF] transition-colors cursor-pointer text-[#94A3B8]"
                >
                  DMCA Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleLegalClick('disclaimer')}
                  className="hover:text-[#00CFFF] transition-colors cursor-pointer text-[#94A3B8]"
                >
                  Terms &amp; Disclaimer
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleLegalClick('about')}
                  className="hover:text-[#00CFFF] transition-colors cursor-pointer text-[#94A3B8]"
                >
                  About Platform
                </button>
              </li>
              <li>
                <a
                  href={`mailto:${email}`}
                  className="hover:text-[#00CFFF] transition-colors cursor-pointer text-[#94A3B8]"
                >
                  Contact Webmaster
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* 4. BOTTOM COPYRIGHT & LEGAL NOTICE (Full Width) */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#64748B]">
          <div className="space-y-1 text-center md:text-left">
            <p>
              &copy; 2026–2027 <span className="text-[#CBD5E1] font-semibold">{siteConfig.siteName || 'Zynox Anime'}</span>. All rights reserved.
            </p>
            <p className="text-[11px] text-[#475569] max-w-2xl">
              {siteConfig.disclaimerText ||
                'Zynox Anime does not store any files on our own server. We only index links from internet which are hosted on third-party services. We index links just like Google.'}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#06101F] rounded-lg border border-white/5 text-[#94A3B8] text-xs">
              <Monitor className="w-3.5 h-3.5 text-[#1683FF]" />
              <span className="font-semibold">ZAIRO X NEOX</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
