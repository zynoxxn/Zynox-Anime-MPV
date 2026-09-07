import React from 'react';
import type { SiteConfig } from '../types/library';
import { Send, Film, Mail, MessageSquare, Monitor, ShieldAlert, Youtube, Instagram } from 'lucide-react';

interface FooterProps {
  siteConfig: SiteConfig;
  navigate: (path: string) => void;
  onRequestAnimeClick: () => void;
  onOpenLegal?: (tab: 'about' | 'dmca' | 'disclaimer') => void;
}

export const Footer: React.FC<FooterProps> = ({
  siteConfig,
  navigate,
  onRequestAnimeClick,
  onOpenLegal,
}) => {
  const telegram = siteConfig.telegramUrl || 'https://t.me/ZynoxAnime';
  const youtube = siteConfig.youtubeUrl || 'https://youtube.com/@neox_xn?si=qUlnuIAFmgaCgtv0';
  const instagram = siteConfig.instagramUrl || 'https://www.instagram.com/zairo_xn_7?igsi=cjhpeGF3Mnl0Njhl';
  const email = siteConfig.contactEmail || 'zairoxmax2.0@gmail.com';

  const handleLegalClick = (tab: 'about' | 'dmca' | 'disclaimer') => {
    if (onOpenLegal) {
      onOpenLegal(tab);
    } else {
      navigate(`/${tab}`);
    }
  };

  return (
    <footer className="border-t border-white/5 bg-[#030712] text-[#A9B8CC] pt-10 pb-8 mt-16">
      <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
        {/* Brand Logo */}
        <div className="flex items-center justify-center gap-2">
          <span className="font-extrabold text-2xl tracking-wider text-white uppercase">
            {siteConfig.logoText || 'ZYNOX'}
          </span>
          <span className="text-[#1683FF] font-extrabold text-2xl tracking-wider uppercase">
            ANIME
          </span>
        </div>

        {/* Disclaimer Note */}
        <p className="text-xs text-[#94A3B8] max-w-xl mx-auto leading-relaxed">
          {siteConfig.disclaimerText ||
            'ZYNOX ANIME does not store any files on own server, We only index links from internet which are hosted on third-party services. We Index Links Just Like Google.'}
        </p>

        {/* Join Telegram CTA Button */}
        <div>
          <a
            href={telegram}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 w-full max-w-sm px-6 py-3.5 bg-[#1683FF] hover:bg-[#2196FF] text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-[#1683FF]/25 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <Send className="w-4 h-4 fill-white text-white" />
            <span>Join Telegram Channel ↗</span>
          </a>
        </div>

        {/* Social Icons */}
        <div className="flex items-center justify-center gap-3">
          <a
            href={telegram}
            target="_blank"
            rel="noopener noreferrer"
            className="w-9 h-9 rounded-xl bg-[#0A1628] border border-white/10 hover:border-[#00A8FF] flex items-center justify-center text-[#A9B8CC] hover:text-[#00A8FF] transition-colors"
            title="Telegram Channel"
          >
            <Send className="w-4 h-4" />
          </a>
          <a
            href={youtube}
            target="_blank"
            rel="noopener noreferrer"
            className="w-9 h-9 rounded-xl bg-[#0A1628] border border-white/10 hover:border-red-500 flex items-center justify-center text-[#A9B8CC] hover:text-red-400 transition-colors"
            title="YouTube Channel"
          >
            <Youtube className="w-4 h-4" />
          </a>
          <a
            href={instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="w-9 h-9 rounded-xl bg-[#0A1628] border border-white/10 hover:border-pink-500 flex items-center justify-center text-[#A9B8CC] hover:text-pink-400 transition-colors"
            title="Instagram Profile"
          >
            <Instagram className="w-4 h-4" />
          </a>
          <a
            href={siteConfig.discordUrl || 'https://discord.gg/zynox'}
            target="_blank"
            rel="noopener noreferrer"
            className="w-9 h-9 rounded-xl bg-[#0A1628] border border-white/10 hover:border-[#5865F2] flex items-center justify-center text-[#A9B8CC] hover:text-[#5865F2] transition-colors"
            title="Community"
          >
            <MessageSquare className="w-4 h-4" />
          </a>
          <a
            href={`mailto:${email}`}
            className="w-9 h-9 rounded-xl bg-[#0A1628] border border-white/10 hover:border-[#00A8FF] flex items-center justify-center text-[#A9B8CC] hover:text-[#00A8FF] transition-colors"
            title="Email Us"
          >
            <Mail className="w-4 h-4" />
          </a>
        </div>

        {/* Request Anime & Contact Us Buttons */}
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onRequestAnimeClick}
            className="px-4 py-2 bg-[#0A1628] hover:bg-[#0D1B2E] border border-white/10 hover:border-[#00A8FF]/40 text-[#F5F9FF] text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <Film className="w-3.5 h-3.5 text-[#00A8FF]" />
            <span>Request Anime</span>
          </button>

          <a
            href={`mailto:${email}`}
            className="px-4 py-2 bg-[#0A1628] hover:bg-[#0D1B2E] border border-white/10 hover:border-[#00A8FF]/40 text-[#F5F9FF] text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <Mail className="w-3.5 h-3.5 text-[#00A8FF]" />
            <span>Contact Us</span>
          </a>
        </div>

        {/* Navigation & Legal Links */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-[#A9B8CC]">
          <button
            type="button"
            onClick={() => handleLegalClick('about')}
            className="hover:text-[#00A8FF] transition-colors cursor-pointer"
          >
            About Us
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => handleLegalClick('dmca')}
            className="hover:text-[#00A8FF] transition-colors cursor-pointer"
          >
            DMCA
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => handleLegalClick('disclaimer')}
            className="hover:text-[#00A8FF] transition-colors cursor-pointer"
          >
            Disclaimer
          </button>
        </div>

        {/* Copyright & ZAIRO X NEOX Badge */}
        <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#6E7F95]">
          <div>
            &copy; 2026–2027 {siteConfig.siteName || 'ZYNOX ANIME'}. All rights reserved.
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#06101F] rounded-lg border border-white/5 text-[#A9B8CC]">
            <Monitor className="w-3.5 h-3.5 text-[#00A8FF]" />
            <span className="font-semibold">ZAIRO X NEOX</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

