import React, { useState, useEffect } from 'react';
import type { SiteConfig } from '../types/library';
import { getCmsFooterConfig, DEFAULT_FOOTER_CONFIG } from '../lib/firestore/cms';
import type { CmsFooterConfig } from '../types/cms';
import { isValidSafeUrl } from '../lib/security';
import { usePwaInstall } from '../hooks/usePwaInstall';
import { InstallAppModal } from './InstallAppModal';
import {
  Send,
  Film,
  Mail,
  MessageSquare,
  Monitor,
  Instagram,
  ChevronRight,
  Compass,
  ExternalLink,
  ArrowUp,
  Smartphone,
} from 'lucide-react';

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
  'Hentai',
  'Sports',
  'Drama',
  'Mystery',
];

export const Footer: React.FC<FooterProps> = ({
  siteConfig,
  navigate,
  onRequestAnimeClick,
  onOpenLegal,
}) => {
  const [footerConfig, setFooterConfig] = useState<CmsFooterConfig>(DEFAULT_FOOTER_CONFIG);
  const { isInstallable, isInstalled, isModalOpen, closeModal, triggerInstall } = usePwaInstall();

  useEffect(() => {
    let isMounted = true;
    getCmsFooterConfig().then((cfg) => {
      if (isMounted && cfg) {
        setFooterConfig(cfg);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const rawTelegram = footerConfig.telegramUrl || siteConfig.telegramUrl || 'https://t.me/ZynoxAnime';
  const telegram = isValidSafeUrl(rawTelegram) ? rawTelegram : 'https://t.me/ZynoxAnime';
  const rawInstagram = siteConfig.instagramUrl || 'https://www.instagram.com/zairo_xn_7?igsi=cjhpeGF3Mnl0Njhl';
  const instagram = isValidSafeUrl(rawInstagram) ? rawInstagram : 'https://www.instagram.com/';
  const email = footerConfig.contactEmail || siteConfig.contactEmail || 'zairoxmax2.0@gmail.com';
  const rawDiscord = footerConfig.discordUrl || siteConfig.discordUrl || 'https://discord.gg/zynox';
  const discord = isValidSafeUrl(rawDiscord) ? rawDiscord : 'https://discord.gg/zynox';
  const requestsEnabled = siteConfig.enableRequests !== false;

  const handleLegalClick = (tab: 'about' | 'dmca' | 'disclaimer') => {
    if (onOpenLegal) {
      onOpenLegal(tab);
    } else {
      navigate(`/${tab}`);
    }
  };

  const logoSrc =
    siteConfig.logoUrl || '/assets/aistudio/file_000000008b388211975b608afaf247bc_0de18ed0.png';
  const siteName = siteConfig.siteName || 'ZYNOX ANIME';

  return (
    <footer className="border-t border-white/10 bg-[#050A14] text-[#94A3B8] pt-7 md:pt-14 pb-24 sm:pb-28 md:pb-12 mt-8 md:mt-16 relative overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* ========================================================= */}
        {/* MOBILE FOOTER (< md) */}
        {/* ========================================================= */}
        <div className="block md:hidden space-y-6">
          {/* 1. Brand Identity & Tagline */}
          <div className="space-y-2.5 text-center">
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={() => navigate('/')}
                aria-label={`${siteName} home`}
                className="cursor-pointer"
              >
                <img
                  src={logoSrc}
                  alt={siteName}
                  className="h-10 sm:h-12 w-auto object-contain"
                />
              </button>
            </div>

            <p className="text-xs text-[#94A3B8] max-w-sm mx-auto leading-relaxed">
              {siteConfig.tagline ||
                'Watch & download Hindi Dubbed Anime Online in 1080p Full HD. Fast streaming with Indian regional audio.'}
            </p>

            {/* Social Icons Strip */}
            <div className="flex items-center justify-center gap-2.5 pt-1">
              <a
                href={telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl bg-[#0B1324] hover:bg-[#1E88FF]/20 border border-white/10 flex items-center justify-center text-[#CBD5E1] hover:text-[#1E88FF] transition-colors"
                aria-label="Telegram Channel"
                title="Telegram Channel"
              >
                <Send className="w-4 h-4" />
              </a>
              <a
                href={instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl bg-[#0B1324] hover:bg-pink-500/20 border border-white/10 flex items-center justify-center text-[#CBD5E1] hover:text-pink-400 transition-colors"
                aria-label="Instagram"
                title="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href={discord}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl bg-[#0B1324] hover:bg-[#5865F2]/20 border border-white/10 flex items-center justify-center text-[#CBD5E1] hover:text-[#5865F2] transition-colors"
                aria-label="Discord Community"
                title="Discord Server"
              >
                <MessageSquare className="w-4 h-4" />
              </a>
              <a
                href={`mailto:${email}`}
                className="w-9 h-9 rounded-xl bg-[#0B1324] hover:bg-[#1E88FF]/20 border border-white/10 flex items-center justify-center text-[#CBD5E1] hover:text-[#1E88FF] transition-colors"
                aria-label="Email Support"
                title="Email Us"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* 2. Action CTA Buttons (max 1 primary button) */}
          <div className={`grid gap-2.5 pt-1 ${requestsEnabled ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <a
              href={telegram}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 h-11 px-3 bg-[#1E88FF] hover:bg-[#3B9BFF] text-white font-semibold text-xs rounded-xl transition-colors text-center whitespace-nowrap"
            >
              <Send className="w-4 h-4 shrink-0" />
              <span>Join Telegram</span>
            </a>

            {requestsEnabled && (
              <button
                type="button"
                onClick={onRequestAnimeClick}
                className="flex items-center justify-center gap-2 h-11 px-3 bg-[#0B1324] hover:bg-[#101A30] border border-white/10 text-white font-semibold text-xs rounded-xl transition-colors text-center cursor-pointer whitespace-nowrap"
              >
                <Film className="w-4 h-4 text-[#1E88FF] shrink-0" />
                <span>Request Anime</span>
              </button>
            )}
          </div>

          {!isInstalled && (
            <button
              type="button"
              onClick={triggerInstall}
              className="w-full flex items-center justify-center gap-2 h-10 px-3 bg-[#0B1324] hover:bg-[#101A30] border border-white/10 text-[#CBD5E1] hover:text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer whitespace-nowrap"
            >
              <Smartphone className="w-4 h-4 text-[#1E88FF] shrink-0" />
              <span>Install App</span>
            </button>
          )}

          {/* 3. A-Z Directory Strip */}
          <div className="pt-2 pb-1 border-y border-white/10">
            <div className="flex items-center justify-between text-[11px] font-bold text-white mb-2 px-0.5">
              <span className="flex items-center gap-1.5 uppercase tracking-wider text-[#1E88FF]">
                <Compass className="w-3.5 h-3.5" />
                A-Z Directory
              </span>
              <span className="text-[#94A3B8] text-[11px]">Swipe to filter &rarr;</span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 px-0.5">
              {ALPHABETS.map((letter) => (
                <button
                  key={letter}
                  type="button"
                  onClick={() => navigate(`/browse?letter=${letter === '#' ? '0-9' : letter}`)}
                  className="w-8 h-8 shrink-0 rounded-lg bg-[#0B1324] active:bg-[#1E88FF] text-[#CBD5E1] active:text-white border border-white/10 text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer"
                >
                  {letter}
                </button>
              ))}
            </div>
          </div>

          {/* 4. 2-Column Links Grid */}
          <div className="grid grid-cols-2 gap-6 pt-1 text-xs">
            <div className="space-y-3">
              <h5 className="font-bold text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <span className="w-1.5 h-3 bg-[#1E88FF] rounded-full inline-block" />
                Explore
              </h5>
              <ul className="space-y-2 text-[#94A3B8]">
                {[
                  { label: 'Home', path: '/' },
                  { label: 'Browse All', path: '/browse' },
                  { label: 'Anime Movies', path: '/browse?type=Movie' },
                  { label: 'TV Series', path: '/browse?type=TV' },
                  { label: 'Schedule', path: '/schedule' },
                  { label: 'Top Rated', path: '/browse?sort=popular' },
                ].map((nav) => (
                  <li key={nav.label}>
                    <button
                      type="button"
                      onClick={() => navigate(nav.path)}
                      className="hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-3 h-3 text-[#1E88FF]" />
                      <span>{nav.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <h5 className="font-bold text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <span className="w-1.5 h-3 bg-[#1E88FF] rounded-full inline-block" />
                Legal &amp; Info
              </h5>
              <ul className="space-y-2 text-[#94A3B8]">
                <li>
                  <button
                    type="button"
                    onClick={() => handleLegalClick('dmca')}
                    className="hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-3 h-3 text-[#1E88FF]" />
                    <span>DMCA Policy</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => handleLegalClick('disclaimer')}
                    className="hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-3 h-3 text-[#1E88FF]" />
                    <span>Terms &amp; Disclaimer</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => handleLegalClick('about')}
                    className="hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-3 h-3 text-[#1E88FF]" />
                    <span>About Platform</span>
                  </button>
                </li>
                <li>
                  <a
                    href={`mailto:${email}`}
                    className="hover:text-white flex items-center gap-1 transition-colors"
                  >
                    <ChevronRight className="w-3 h-3 text-[#1E88FF]" />
                    <span>Contact Webmaster</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* 5. Popular Genres */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <h5 className="font-bold text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <span className="w-1.5 h-3 bg-[#1E88FF] rounded-full inline-block" />
              Popular Genres
            </h5>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_GENRES.map((genre) => (
                <button
                  key={genre}
                  type="button"
                  onClick={() => navigate(`/browse?genre=${genre}`)}
                  className="py-1 px-2.5 rounded-lg bg-[#0B1324] active:bg-[#1E88FF]/20 border border-white/10 text-[#CBD5E1] text-[11px] transition-colors cursor-pointer"
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          {/* 6. Mobile Bottom Copyright & Legal Disclaimer */}
          <div className="pt-4 border-t border-white/10 text-center space-y-2 text-[11px] text-[#94A3B8]">
            <p>
              {footerConfig.copyrightText || (
                <>
                  &copy; 2026–2027 <span className="text-white font-semibold">{siteName}</span>. All rights reserved.
                </>
              )}
            </p>
            <p className="text-[11px] text-[#64748B] leading-tight px-1">
              {footerConfig.disclaimerText ||
                siteConfig.disclaimerText ||
                'Zynox Anime does not store files on our servers. We index links hosted on third-party services.'}
            </p>
            <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#0B1324] rounded-lg border border-white/10 text-[#94A3B8] text-[11px]">
                <Monitor className="w-3 h-3 text-[#1E88FF]" />
                <span className="font-semibold">ZAIRO X NEOX</span>
              </div>
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="inline-flex items-center gap-1 px-3 py-1 bg-[#0B1324] hover:bg-[#1E88FF] hover:text-white rounded-lg border border-white/10 text-[#CBD5E1] text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                <ArrowUp className="w-3 h-3" />
                <span>Back to Top</span>
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* DESKTOP FOOTER (>= md) */}
        {/* ========================================================= */}
        <div className="hidden md:block space-y-10">
          {/* 1. TOP HERO ROW: Brand + Telegram Join Banner */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6 p-6 sm:p-8 rounded-2xl bg-[#0B1324] border border-white/10">
            <div className="space-y-2 max-w-2xl min-w-0">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  aria-label={`${siteName} home`}
                  className="cursor-pointer"
                >
                  <img
                    src={logoSrc}
                    alt={siteName}
                    className="h-12 sm:h-14 w-auto object-contain"
                  />
                </button>
              </div>
              <p className="text-sm sm:text-base text-[#CBD5E1] leading-relaxed">
                {siteConfig.tagline ||
                  'Watch & download Indian Regional Dubbed Anime Online in Hindi Dub & English Sub in Ultra HD.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <a
                href={telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2.5 h-11 px-5 bg-[#1E88FF] hover:bg-[#3B9BFF] text-white font-semibold text-sm rounded-xl transition-colors cursor-pointer whitespace-nowrap"
              >
                <Send className="w-4 h-4 shrink-0" />
                <span>Join Telegram</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80 shrink-0" />
              </a>

              {requestsEnabled && (
                <button
                  type="button"
                  onClick={onRequestAnimeClick}
                  className="inline-flex items-center justify-center gap-2 h-11 px-5 bg-[#101A30] hover:bg-[#16223D] border border-white/10 text-white font-semibold text-sm rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Film className="w-4 h-4 text-[#1E88FF] shrink-0" />
                  <span>Request Anime</span>
                </button>
              )}

              {!isInstalled && (
                <button
                  type="button"
                  onClick={triggerInstall}
                  className="inline-flex items-center justify-center gap-2 h-11 px-4 bg-[#101A30] hover:bg-[#16223D] border border-white/10 text-[#CBD5E1] hover:text-white font-semibold text-sm rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Smartphone className="w-4 h-4 text-[#1E88FF] shrink-0" />
                  <span>Install App</span>
                </button>
              )}
            </div>
          </div>

          {/* 2. A-Z ANIME DIRECTORY JUMP BAR */}
          <div className="p-4 rounded-xl bg-[#0B1324] border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-white">
              <span className="flex items-center gap-1.5 uppercase tracking-wider text-[#1E88FF]">
                <Compass className="w-3.5 h-3.5" />
                A-Z List
              </span>
              <span className="text-[#94A3B8] text-[11px]">Browse anime by starting letter</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {ALPHABETS.map((letter) => (
                <button
                  key={letter}
                  type="button"
                  onClick={() => navigate(`/browse?letter=${letter === '#' ? '0-9' : letter}`)}
                  className="w-8 h-8 rounded-lg bg-[#101A30] hover:bg-[#1E88FF] text-[#CBD5E1] hover:text-white border border-white/10 hover:border-[#1E88FF] text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer"
                  title={`Filter by ${letter}`}
                >
                  {letter}
                </button>
              ))}
            </div>
          </div>

          {/* 3. DESKTOP 4-COLUMN MAIN FOOTER CONTENT */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10 pt-2">
            {/* Column 1: About Platform */}
            <div className="lg:col-span-4 space-y-4">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-4 bg-[#1E88FF] rounded-full inline-block" />
                About {siteName}
              </h4>
              <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
                {footerConfig.aboutText ||
                  'Zynox Anime is your destination for watching and downloading Indian regional dubbed anime online. Enjoy streaming in Hindi Dub, Tamil, Telugu, and English Sub in HD resolution.'}
              </p>
              <div className="pt-2 flex items-center gap-3 flex-wrap">
                {footerConfig.socialLinks &&
                footerConfig.socialLinks.filter((s) => s.enabled !== false && s.url && isValidSafeUrl(s.url)).length > 0 ? (
                  footerConfig.socialLinks
                    .filter((s) => s.enabled !== false && s.url && isValidSafeUrl(s.url))
                    .map((s, idx) => (
                      <a
                        key={`${s.platform}-${idx}`}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-xl bg-[#0B1324] border border-white/10 hover:border-[#1E88FF] flex items-center justify-center text-[#CBD5E1] hover:text-[#1E88FF] hover:bg-[#1E88FF]/10 transition-colors cursor-pointer"
                        aria-label={s.platform}
                        title={s.platform}
                      >
                        {s.platform.toLowerCase().includes('telegram') ? (
                          <Send className="w-4 h-4" />
                        ) : s.platform.toLowerCase().includes('discord') ? (
                          <MessageSquare className="w-4 h-4" />
                        ) : s.platform.toLowerCase().includes('instagram') ? (
                          <Instagram className="w-4 h-4" />
                        ) : (
                          <ExternalLink className="w-4 h-4" />
                        )}
                      </a>
                    ))
                ) : (
                  <>
                    <a
                      href={telegram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-xl bg-[#0B1324] border border-white/10 hover:border-[#1E88FF] flex items-center justify-center text-[#CBD5E1] hover:text-[#1E88FF] hover:bg-[#1E88FF]/10 transition-colors cursor-pointer"
                      aria-label="Telegram Channel"
                      title="Telegram Channel"
                    >
                      <Send className="w-4 h-4" />
                    </a>
                    <a
                      href={instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-xl bg-[#0B1324] border border-white/10 hover:border-pink-500 flex items-center justify-center text-[#CBD5E1] hover:text-pink-400 hover:bg-pink-500/10 transition-colors cursor-pointer"
                      aria-label="Instagram"
                      title="Instagram"
                    >
                      <Instagram className="w-4 h-4" />
                    </a>
                    <a
                      href={discord}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-xl bg-[#0B1324] border border-white/10 hover:border-[#5865F2] flex items-center justify-center text-[#CBD5E1] hover:text-[#5865F2] hover:bg-[#5865F2]/10 transition-colors cursor-pointer"
                      aria-label="Discord Community"
                      title="Discord Community"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </a>
                  </>
                )}
                <a
                  href={`mailto:${email}`}
                  className="w-10 h-10 rounded-xl bg-[#0B1324] border border-white/10 hover:border-[#1E88FF] flex items-center justify-center text-[#CBD5E1] hover:text-[#1E88FF] hover:bg-[#1E88FF]/10 transition-colors cursor-pointer"
                  aria-label="Email Us"
                  title="Email Us"
                >
                  <Mail className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Dynamic CMS Footer Columns or Default Quick Navigation */}
            {footerConfig.columns && footerConfig.columns.length > 0 ? (
              footerConfig.columns.slice(0, 2).map((col) => (
                <div key={col.id} className="lg:col-span-3 space-y-4">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-[#1E88FF] rounded-full inline-block" />
                    {col.title}
                  </h4>
                  <ul className="space-y-2.5 text-xs sm:text-sm">
                    {col.links.map((link, idx) => (
                      <li key={`${col.id}-${idx}`}>
                        {link.isExternal || link.url.startsWith('http') ? (
                          isValidSafeUrl(link.url) ? (
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer text-[#94A3B8]"
                            >
                              <ChevronRight className="w-3.5 h-3.5 text-[#1E88FF]" />
                              <span>{link.label}</span>
                            </a>
                          ) : null
                        ) : (
                          <button
                            type="button"
                            onClick={() => navigate(link.url)}
                            className="hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer text-[#94A3B8]"
                          >
                            <ChevronRight className="w-3.5 h-3.5 text-[#1E88FF]" />
                            <span>{link.label}</span>
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            ) : (
              <>
                <div className="lg:col-span-3 space-y-4">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-[#1E88FF] rounded-full inline-block" />
                    Quick Navigation
                  </h4>
                  <ul className="space-y-2.5 text-xs sm:text-sm">
                    {[
                      { label: 'Home', path: '/' },
                      { label: 'Browse All Anime', path: '/browse' },
                      { label: 'Anime Movies', path: '/browse?type=Movie' },
                      { label: 'TV Series', path: '/browse?type=TV' },
                      { label: 'Release Schedule', path: '/schedule' },
                      { label: 'Trending & Top Rated', path: '/browse?sort=popular' },
                    ].map((nav) => (
                      <li key={nav.label}>
                        <button
                          type="button"
                          onClick={() => navigate(nav.path)}
                          className="hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer text-[#94A3B8]"
                        >
                          <ChevronRight className="w-3.5 h-3.5 text-[#1E88FF]" />
                          <span>{nav.label}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="lg:col-span-3 space-y-4">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-[#1E88FF] rounded-full inline-block" />
                    Popular Genres
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {POPULAR_GENRES.map((genre) => (
                      <button
                        key={genre}
                        type="button"
                        onClick={() => navigate(`/browse?genre=${genre}`)}
                        className="py-1.5 px-2.5 rounded-lg bg-[#0B1324] hover:bg-[#101A30] border border-white/10 hover:border-[#1E88FF]/40 text-[#94A3B8] hover:text-white transition-colors text-left truncate cursor-pointer text-xs"
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Column 4: Legal & Policy */}
            <div className="lg:col-span-2 space-y-4">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-4 bg-[#1E88FF] rounded-full inline-block" />
                Legal &amp; Policy
              </h4>
              <ul className="space-y-2.5 text-xs sm:text-sm">
                <li>
                  <button
                    type="button"
                    onClick={() => handleLegalClick('dmca')}
                    className="hover:text-white transition-colors cursor-pointer text-[#94A3B8]"
                  >
                    DMCA Policy
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => handleLegalClick('disclaimer')}
                    className="hover:text-white transition-colors cursor-pointer text-[#94A3B8]"
                  >
                    Terms &amp; Disclaimer
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => handleLegalClick('about')}
                    className="hover:text-white transition-colors cursor-pointer text-[#94A3B8]"
                  >
                    About Platform
                  </button>
                </li>
                <li>
                  <a
                    href={`mailto:${email}`}
                    className="hover:text-white transition-colors cursor-pointer text-[#94A3B8]"
                  >
                    Contact Webmaster
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* 4. DESKTOP BOTTOM COPYRIGHT & LEGAL NOTICE */}
          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#94A3B8]">
            <div className="space-y-1 text-center md:text-left">
              <p>
                {footerConfig.copyrightText || (
                  <>
                    &copy; 2026–2027 <span className="text-white font-semibold">{siteName}</span>. All rights reserved.
                  </>
                )}
              </p>
              <p className="text-[11px] text-[#64748B] max-w-2xl">
                {footerConfig.disclaimerText ||
                  siteConfig.disclaimerText ||
                  'Zynox Anime does not store any files on our own server. We only index links from third-party services.'}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0B1324] rounded-lg border border-white/10 text-[#94A3B8] text-xs">
                <Monitor className="w-3.5 h-3.5 text-[#1E88FF]" />
                <span className="font-semibold">ZAIRO X NEOX</span>
              </div>
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0B1324] hover:bg-[#1E88FF] hover:text-white rounded-lg border border-white/10 text-[#CBD5E1] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                <ArrowUp className="w-3.5 h-3.5" />
                <span>Back to Top</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <InstallAppModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onDirectInstall={triggerInstall}
        isInstallable={isInstallable}
        isInstalled={isInstalled}
      />
    </footer>
  );
};
