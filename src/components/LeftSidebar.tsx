import React, { useState } from 'react';
import {
  Home,
  Compass,
  Flame,
  TrendingUp,
  Bookmark,
  Calendar,
  Clock,
  Settings,
  HelpCircle,
  ShieldCheck,
  Tag,
  ChevronDown,
} from 'lucide-react';
import { DEFAULT_GENRES } from '../lib/firestore/cms';

interface LeftSidebarProps {
  currentPath: string;
  navigate: (path: string) => void;
  isAdmin?: boolean;
  onOpenLegal?: (tab: 'about' | 'dmca' | 'disclaimer') => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  currentPath,
  navigate,
  isAdmin,
  onOpenLegal,
}) => {
  const [genresExpanded, setGenresExpanded] = useState(false);

  const navItems = [
    { label: 'Home', path: '/', icon: Home, isActive: currentPath === '/' },
    { label: 'Explore', path: '/browse', icon: Compass, isActive: currentPath === '/browse' && !window.location.search },
    { label: 'Trending', path: '/browse?sort=popular', icon: Flame, isActive: currentPath.includes('sort=popular') || currentPath.includes('trending') },
    { label: 'Popular', path: '/browse?sort=rating', icon: TrendingUp, isActive: currentPath.includes('sort=rating') },
    { label: 'Watchlist', path: '/watchlist', icon: Bookmark, isActive: currentPath === '/watchlist' },
    { label: 'Calendar', path: '/schedule', icon: Calendar, isActive: currentPath === '/schedule' },
    { label: 'History', path: '/history', icon: Clock, isActive: currentPath === '/history' },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-[160px] xl:w-[175px] shrink-0 sticky top-20 max-h-[calc(100vh-5.5rem)] overflow-y-auto no-scrollbar justify-between py-2 select-none">
      {/* Primary Navigation Menu */}
      <nav className="space-y-1.5">
        {navItems.slice(0, 2).map((item) => {
          const Icon = item.icon;
          const active = item.isActive;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 text-left ${
                active
                  ? 'bg-[#1683FF] text-white shadow-lg shadow-[#1683FF]/30 font-bold translate-x-0.5'
                  : 'text-[#94A3B8] hover:text-white hover:bg-[#07111F] hover:translate-x-0.5'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-[#94A3B8]'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}

        {/* Expandable Genres Section in Sidebar */}
        <div>
          <button
            type="button"
            onClick={() => setGenresExpanded((prev) => !prev)}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 text-left ${
              genresExpanded || currentPath.toLowerCase().includes('genre')
                ? 'bg-[#1683FF]/15 text-[#1683FF] font-bold'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#07111F]'
            }`}
          >
            <div className="flex items-center gap-3">
              <Tag className="w-4 h-4 shrink-0" />
              <span>Genres</span>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                genresExpanded ? 'rotate-180 text-[#1683FF]' : 'text-[#94A3B8]'
              }`}
            />
          </button>

          {genresExpanded && (
            <div className="mt-1 pl-2 pr-1 py-1 space-y-0.5 max-h-48 overflow-y-auto no-scrollbar rounded-xl bg-[#081222]/80 border border-white/5 animate-in slide-in-from-top-1 duration-150">
              {DEFAULT_GENRES.map((g) => {
                const isSelected =
                  currentPath.toLowerCase().includes(encodeURIComponent(g.name.toLowerCase())) ||
                  currentPath.toLowerCase().includes(g.name.toLowerCase());
                return (
                  <button
                    key={g.id || g.name}
                    type="button"
                    onClick={() => navigate(`/browse?genre=${encodeURIComponent(g.name)}`)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-left transition-colors ${
                      isSelected
                        ? 'text-[#1683FF] font-bold bg-[#1683FF]/10'
                        : 'text-[#CBD5E1] hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span className="truncate">{g.name}</span>
                    <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-[#1683FF]' : 'bg-white/20'}`} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {navItems.slice(2).map((item) => {
          const Icon = item.icon;
          const active = item.isActive;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 text-left ${
                active
                  ? 'bg-[#1683FF] text-white shadow-lg shadow-[#1683FF]/30 font-bold translate-x-0.5'
                  : 'text-[#94A3B8] hover:text-white hover:bg-[#07111F] hover:translate-x-0.5'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-[#94A3B8]'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom utility icons */}
      <div className="pt-4 border-t border-white/5 space-y-1">
        <button
          type="button"
          onClick={() => navigate('/profile?tab=settings')}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
            currentPath.startsWith('/profile')
              ? 'bg-[#1683FF] text-white shadow-lg shadow-[#1683FF]/30 font-bold'
              : 'text-[#94A3B8] hover:text-white hover:bg-[#07111F]'
          }`}
          title="Profile & Settings"
        >
          <Settings className="w-4 h-4 shrink-0" />
          <span>Settings</span>
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
              currentPath === '/admin'
                ? 'bg-[#1683FF] text-white'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#07111F]'
            }`}
            title="Admin Dashboard"
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Admin</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => onOpenLegal ? onOpenLegal('about') : navigate('/about')}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#94A3B8] hover:text-white hover:bg-[#07111F] transition-all text-left"
          title="About & Help"
        >
          <HelpCircle className="w-4 h-4 shrink-0" />
          <span>Help</span>
        </button>
      </div>
    </aside>
  );
};
