import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AuthProvider } from './context/AuthContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { RequestAnimeModal } from './components/RequestAnimeModal';
import { LegalModal, type LegalTab } from './components/LegalModal';
import { LegalView } from './views/LegalView';
import { HomeView } from './views/HomeView';

import { BrowseView } from './views/BrowseView';
import { WatchlistView } from './views/WatchlistView';
import { HistoryView } from './views/HistoryView';
import { FavoritesView } from './views/FavoritesView';
import { NotificationsView } from './views/NotificationsView';
import { LoginView } from './views/LoginView';
import { SignupView } from './views/SignupView';
import { ProfileView } from './views/ProfileView';
import { AnimeDetailView } from './views/AnimeDetailView';
import { WatchEpisodeView } from './views/WatchEpisodeView';
import { ScheduleView } from './views/ScheduleView';
import { AnimeRequestsView } from './views/AnimeRequestsView';
import { PublicProfileView } from './views/PublicProfileView';
import { AdminDashboardView } from './views/admin/AdminDashboardView';
import { AdminAnimeListView } from './views/admin/AdminAnimeListView';
import { AdminAnimeFormView } from './views/admin/AdminAnimeFormView';
import { AdminEpisodeListView } from './views/admin/AdminEpisodeListView';
import { AdminEpisodeFormView } from './views/admin/AdminEpisodeFormView';
import { AdminScheduleView } from './views/admin/AdminScheduleView';
import { AdminTaxonomyView } from './views/admin/AdminTaxonomyView';
import { AdminHomepageView } from './views/admin/AdminHomepageView';
import { AdminHeroBannersView } from './views/admin/AdminHeroBannersView';
import { AdminSeasonsView } from './views/admin/AdminSeasonsView';
import { AdminNavigationFooterView } from './views/admin/AdminNavigationFooterView';
import { AdminAnnouncementsView } from './views/admin/AdminAnnouncementsView';
import { AdminNoticeView } from './views/admin/AdminNoticeView';
import { AdminSeoSettingsView } from './views/admin/AdminSeoSettingsView';
import { AdminLegalPagesView } from './views/admin/AdminLegalPagesView';
import { AdminActivityLogsView } from './views/admin/AdminActivityLogsView';
import { AdminUsersView } from './views/admin/AdminUsersView';
import { AdminRequestsView } from './views/admin/AdminRequestsView';
import { AdminReportsView } from './views/admin/AdminReportsView';
import { AdminSettingsView } from './views/admin/AdminSettingsView';
import { AdminAvatarsView } from './views/admin/AdminAvatarsView';
import { AdminDownloadsView } from './views/admin/AdminDownloadsView';
import { AdminBulkEpisodeView } from './views/admin/AdminBulkEpisodeView';
import { AnimeDownloadView } from './views/AnimeDownloadView';
import { getSiteSettings, DEFAULT_SITE_CONFIG } from './lib/firestore/site-settings';
import { getCmsPopupNotice, subscribeToCmsPopupNotice, DEFAULT_POPUP_NOTICE } from './lib/firestore/cms';
import { SiteNoticeModal } from './components/SiteNoticeModal';
import type { SitePopupNotice } from './types/cms';
import type { SiteConfig } from './types/library';
import { CheckCircle2, X } from 'lucide-react';

interface ToastMessage {
  id: string;
  text: string;
}

const AppContent: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<string>(
    typeof window !== 'undefined'
      ? `${window.location.pathname}${window.location.search}` || '/'
      : '/'
  );
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(DEFAULT_SITE_CONFIG);
  const [requestModalOpen, setRequestModalOpen] = useState<boolean>(false);
  const [legalModalOpen, setLegalModalOpen] = useState<boolean>(false);
  const [legalModalTab, setLegalModalTab] = useState<LegalTab>('about');
  const [popupNotice, setPopupNotice] = useState<SitePopupNotice>(DEFAULT_POPUP_NOTICE);
  const [popupNoticeOpen, setPopupNoticeOpen] = useState<boolean>(false);

  // Sync route changes with browser history
  const navigate = useCallback((path: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(`${window.location.pathname}${window.location.search}` || '/');
    };

    // Remove any historical search items from storage
    try {
      localStorage.removeItem('search_history');
      localStorage.removeItem('zynox_search_history');
      localStorage.removeItem('recent_searches');
      localStorage.removeItem('zynox_recent_searches');
    } catch {}

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Fetch site configuration
  useEffect(() => {
    getSiteSettings().then((cfg) => setSiteConfig(cfg));
  }, []);

  // Tracks whether the user dismissed the notice during this active tab browsing session
  const hasDismissedThisVisitRef = useRef(false);
  // Tracks whether the entrance popup has already been shown
  const hasShownEntrancePopupRef = useRef(false);
  // Records the exact timestamp when user entered the website
  const siteEntryTimeRef = useRef<number>(Date.now());
  // Tracks current route path in a ref so navigation doesn't disrupt the entrance timer
  const currentPathRef = useRef(currentPath);
  useEffect(() => {
    currentPathRef.current = currentPath;
  }, [currentPath]);

  // Helper to check if a notice version was explicitly dismissed for 24h via "Don't show again today"
  const isNoticeDismissedForToday = useCallback((noticeData: SitePopupNotice): boolean => {
    try {
      const dismissedVer = localStorage.getItem('zynox_popup_notice_ver');
      const dismissedTimeStr = localStorage.getItem('zynox_popup_notice_time');
      const currentVer = noticeData.version || '1.0';

      if (dismissedVer === currentVer && dismissedTimeStr) {
        const dismissedTime = parseInt(dismissedTimeStr, 10);
        const now = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;
        if (now - dismissedTime < oneDayMs) {
          return true;
        }
      }
    } catch {
      // ignore
    }
    return false;
  }, []);

  // Real-time synchronization and display of Website Entrance Pop-up Card Notice (5 to 7 seconds after entering)
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    const checkAndDisplayNotice = (noticeData: SitePopupNotice, isImmediate = false) => {
      setPopupNotice(noticeData);

      // If disabled by admin, don't show
      if (!noticeData.enabled) {
        setPopupNoticeOpen(false);
        return;
      }

      // If user closed it in this active session, don't keep popping up on every internal link click
      if (hasDismissedThisVisitRef.current) {
        return;
      }

      // If user checked "Don't show again today", honor the 24h suppression
      if (isNoticeDismissedForToday(noticeData)) {
        return;
      }

      // If entrance popup was already displayed in this visit and this is not a manual/admin trigger, do not show again
      if (hasShownEntrancePopupRef.current && !isImmediate) {
        return;
      }

      // Calculate delay based on website entrance timestamp (defaults to 6s, i.e. 5-7 seconds after website entry)
      const targetDelaySec = noticeData.displayDelaySeconds ?? 6;
      const targetDelayMs = targetDelaySec * 1000;
      const elapsed = Date.now() - siteEntryTimeRef.current;
      const remainingDelay = isImmediate ? 0 : Math.max(0, targetDelayMs - elapsed);

      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const [rawPath] = (currentPathRef.current || '').split('?');
        // Do NOT pop up over the admin dashboard
        if (rawPath.startsWith('/admin')) {
          return;
        }
        if (hasDismissedThisVisitRef.current || isNoticeDismissedForToday(noticeData)) {
          return;
        }
        hasShownEntrancePopupRef.current = true;
        setPopupNoticeOpen(true);
      }, remainingDelay);
    };

    // 1. Subscribe to real-time Firestore notice configuration
    const unsubscribe = subscribeToCmsPopupNotice((liveNotice) => {
      checkAndDisplayNotice(liveNotice, false);
    });

    // 2. Listen for broadcast events when Admin saves or updates in same window
    const handleBroadcastUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<SitePopupNotice>;
      if (customEvent.detail) {
        hasDismissedThisVisitRef.current = false;
        hasShownEntrancePopupRef.current = false;
        checkAndDisplayNotice(customEvent.detail, true);
      }
    };

    // 3. Listen for manual open trigger (e.g. from Admin Test button)
    const handleManualOpen = () => {
      hasDismissedThisVisitRef.current = false;
      hasShownEntrancePopupRef.current = true;
      setPopupNoticeOpen(true);
    };

    window.addEventListener('zynox:notice-updated', handleBroadcastUpdate);
    window.addEventListener('zynox:open-notice', handleManualOpen);

    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
      window.removeEventListener('zynox:notice-updated', handleBroadcastUpdate);
      window.removeEventListener('zynox:open-notice', handleManualOpen);
    };
  }, [isNoticeDismissedForToday]);

  // If user navigated away from /admin back to site and entrance popup hasn't been shown yet
  useEffect(() => {
    const [rawPath] = currentPath.split('?');
    if (
      !rawPath.startsWith('/admin') &&
      !hasShownEntrancePopupRef.current &&
      !hasDismissedThisVisitRef.current &&
      popupNotice.enabled &&
      !isNoticeDismissedForToday(popupNotice)
    ) {
      const targetDelayMs = (popupNotice.displayDelaySeconds ?? 6) * 1000;
      const elapsed = Date.now() - siteEntryTimeRef.current;
      if (elapsed >= targetDelayMs) {
        hasShownEntrancePopupRef.current = true;
        setPopupNoticeOpen(true);
      }
    }
  }, [currentPath, popupNotice, isNoticeDismissedForToday]);

  const handleClosePopupNotice = useCallback(
    (dontShowAgainToday?: boolean) => {
      setPopupNoticeOpen(false);
      hasDismissedThisVisitRef.current = true;
      try {
        if (dontShowAgainToday) {
          localStorage.setItem('zynox_popup_notice_ver', popupNotice.version || '1.0');
          localStorage.setItem('zynox_popup_notice_time', Date.now().toString());
        }
      } catch {}
    },
    [popupNotice.version]
  );

  const showToast = useCallback((msg: string) => {
    const id = Date.now().toString();
    setToast({ id, text: msg });
    setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, 4000);
  }, []);

  // Router matcher logic
  const renderRoute = () => {
    // Separate pathname from search query parameters cleanly
    const [rawPath, rawQuery] = currentPath.split('?');
    const path = rawPath || '/';
    const searchParams = new URLSearchParams(
      rawQuery !== undefined
        ? rawQuery
        : typeof window !== 'undefined'
        ? window.location.search
        : ''
    );

    // Static routes
    if (path === '/' || path === '') {
      return <HomeView navigate={navigate} onShowMessage={showToast} />;
    }
    if (path === '/schedule' || (path === '/browse' && searchParams.get('sort') === 'schedule')) {
      return <ScheduleView key="schedule-view" navigate={navigate} onShowMessage={showToast} />;
    }
    if (path === '/browse' || path === '/search' || path === '/genres' || path.startsWith('/genre/')) {
      const genreFromPath = path.startsWith('/genre/') ? decodeURIComponent(path.replace('/genre/', '')) : '';
      return (
        <BrowseView
          key={`browse-${genreFromPath || searchParams.toString()}`}
          navigate={navigate}
          onShowMessage={showToast}
          initialQuery={searchParams.get('q') || ''}
          initialGenre={genreFromPath || searchParams.get('genre') || 'all'}
          initialType={searchParams.get('type') || 'all'}
          initialStatus={searchParams.get('status') || 'all'}
          initialYear={searchParams.get('year') || 'all'}
          initialLanguage={searchParams.get('language') || 'all'}
          initialLetter={searchParams.get('letter') || 'all'}
          initialSort={searchParams.get('sort') || 'latest'}
        />
      );
    }
    if (path === '/schedule') {
      return <ScheduleView key="schedule-view" navigate={navigate} onShowMessage={showToast} />;
    }
    if (path === '/watchlist') {
      return <WatchlistView navigate={navigate} onShowMessage={showToast} />;
    }
    if (path === '/history') {
      return <HistoryView navigate={navigate} onShowMessage={showToast} />;
    }
    if (path === '/favorites') {
      return <FavoritesView navigate={navigate} onShowMessage={showToast} />;
    }
    if (path === '/notifications') {
      return <NotificationsView navigate={navigate} onShowMessage={showToast} />;
    }
    if (path === '/login') {
      return <LoginView navigate={navigate} onShowMessage={showToast} />;
    }
    if (path === '/signup') {
      return <SignupView navigate={navigate} onShowMessage={showToast} />;
    }
    if (path === '/profile') {
      return <ProfileView navigate={navigate} onShowMessage={showToast} />;
    }
    if (path === '/requests') {
      return <AnimeRequestsView navigate={navigate} onShowMessage={showToast} />;
    }
    if (path.startsWith('/user/')) {
      const targetUserId = path.replace('/user/', '').split('/')[0];
      if (targetUserId) {
        return (
          <PublicProfileView
            userId={targetUserId}
            navigate={navigate}
            onShowMessage={showToast}
          />
        );
      }
    }

    // Admin routes
    if (path === '/admin') {
      return <AdminDashboardView key="admin-dashboard" navigate={navigate} onShowMessage={showToast} />;
    }
    if (path === '/admin/anime') {
      return <AdminAnimeListView key="admin-anime-list" navigate={navigate} onShowMessage={showToast} />;
    }
    if (path === '/admin/anime/new') {
      return <AdminAnimeFormView key="admin-anime-new" navigate={navigate} onShowMessage={showToast} />;
    }
    if (path.startsWith('/admin/anime/edit/')) {
      const animeId = path.replace('/admin/anime/edit/', '');
      return <AdminAnimeFormView key={`admin-anime-edit-${animeId}`} animeId={animeId} navigate={navigate} onShowMessage={showToast} />;
    }
    if (path === '/admin/episodes') {
      return <AdminEpisodeListView key="admin-episodes-list" navigate={navigate} onShowMessage={showToast} />;
    }
    if (path === '/admin/episodes/bulk' || path === '/admin/episodes/bulk-add') {
      return <AdminBulkEpisodeView key="admin-episodes-bulk" navigate={navigate} onShowMessage={showToast} />;
    }
    if (path.startsWith('/admin/anime/') && path.endsWith('/episodes')) {
      const animeId = path.replace('/admin/anime/', '').replace('/episodes', '');
      return <AdminEpisodeListView key={`admin-anime-episodes-${animeId}`} animeId={animeId} navigate={navigate} onShowMessage={showToast} />;
    }
    if (path === '/admin/episodes/new') {
      return <AdminEpisodeFormView key="admin-episodes-new" navigate={navigate} onShowMessage={showToast} />;
    }
    if (path.startsWith('/admin/episodes/edit/')) {
      const episodeId = path.replace('/admin/episodes/edit/', '');
      return <AdminEpisodeFormView key={`admin-episodes-edit-${episodeId}`} episodeId={episodeId} navigate={navigate} onShowMessage={showToast} />;
    }
    if (path === '/admin/schedule') {
      return <AdminScheduleView key="admin-schedule" navigate={navigate} onShowMessage={showToast} />;
    }
    if (path === '/admin/taxonomy') {
      return <AdminTaxonomyView key="admin-taxonomy" navigate={navigate} onShowMessage={showToast} />;
    }
    if (path === '/admin/homepage') {
      return <AdminHomepageView key="admin-homepage" navigate={navigate} onShowMessage={showToast} />;
    }
    if (path === '/admin/hero' || path === '/admin/hero-banners') {
      return <AdminHeroBannersView key="admin-hero" navigate={navigate} onShowMessage={showToast} />;
    }
    if (path === '/admin/seasons') {
      return <AdminSeasonsView key="admin-seasons" navigate={navigate} onShowMessage={showToast} />;
    }
    if (path === '/admin/navigation' || path === '/admin/navigation-footer') {
      return <AdminNavigationFooterView key="admin-navigation" initialTab="navigation" navigate={navigate} onShowMessage={showToast} />;
    }
    if (path === '/admin/footer') {
      return <AdminNavigationFooterView key="admin-footer" initialTab="footer" navigate={navigate} onShowMessage={showToast} />;
    }
    if (path === '/admin/announcements' || path === '/admin/announcement') {
      return <AdminAnnouncementsView key="admin-announcements" navigate={navigate} onShowMessage={showToast} />;
    }
    if (path === '/admin/notice' || path === '/admin/popup-notice') {
      return <AdminNoticeView key="admin-notice" navigate={navigate} onShowMessage={showToast} />;
    }
    if (path === '/admin/avatars' || path === '/admin/avatar') {
      return <AdminAvatarsView key="admin-avatars" navigate={navigate} onShowMessage={showToast} />;
    }
    if (path === '/admin/seo') {
      return <AdminSeoSettingsView key="admin-seo" navigate={navigate} onShowMessage={showToast} />;
    }
    if (path === '/admin/legal' || path === '/admin/legal-pages') {
      return <AdminLegalPagesView key="admin-legal" navigate={navigate} onShowMessage={showToast} />;
    }
    if (path === '/admin/comments') {
      return <AdminReportsView key="admin-comments" navigate={navigate} onShowMessage={showToast} />;
    }
    if (path === '/admin/logs') {
      return <AdminActivityLogsView key="admin-logs" navigate={navigate} onShowMessage={showToast} />;
    }
    if (path === '/admin/users') {
      return <AdminUsersView key="admin-users" navigate={navigate} onShowMessage={showToast} />;
    }
    if (path === '/admin/requests') {
      return <AdminRequestsView key="admin-requests" navigate={navigate} onShowMessage={showToast} />;
    }
    if (path === '/admin/reports') {
      return <AdminReportsView key="admin-reports" navigate={navigate} onShowMessage={showToast} />;
    }
    if (path === '/admin/settings') {
      return <AdminSettingsView key="admin-settings" navigate={navigate} onShowMessage={showToast} />;
    }
    if (path === '/admin/downloads' || path.startsWith('/admin/downloads')) {
      return <AdminDownloadsView key="admin-downloads" navigate={navigate} onShowMessage={showToast} />;
    }

    if (path === '/about') {
      return <LegalView key="legal-about" tab="about" navigate={navigate} onShowMessage={showToast} />;
    }
    if (path === '/dmca') {
      return <LegalView key="legal-dmca" tab="dmca" navigate={navigate} onShowMessage={showToast} />;
    }
    if (path === '/disclaimer') {
      return <LegalView key="legal-disclaimer" tab="disclaimer" navigate={navigate} onShowMessage={showToast} />;
    }

    // Dynamic episode player route: /anime/:animeSlug/episode/:episodeNumber
    if (path.startsWith('/anime/') && path.includes('/episode/')) {
      const parts = path.split('/').filter(Boolean);
      // parts[0] === 'anime', parts[1] === animeSlug, parts[2] === 'episode', parts[3] === episodeNumber
      if (parts.length >= 4 && parts[2] === 'episode') {
        return (
          <WatchEpisodeView
            key={`watch-anime-${parts[1]}-ep-${parts[3]}`}
            animeSlug={parts[1]}
            episodeNumberOrId={parts[3]}
            navigate={navigate}
            onShowMessage={showToast}
          />
        );
      }
    }

    // Dynamic watch route: /watch/:animeSlug/:episodeId
    if (path.startsWith('/watch/')) {
      const parts = path.split('/').filter(Boolean);
      // parts[0] === 'watch', parts[1] === animeSlug, parts[2] === episodeId
      if (parts.length >= 3) {
        return (
          <WatchEpisodeView
            key={`watch-direct-${parts[1]}-${parts[2]}`}
            animeSlug={parts[1]}
            episodeNumberOrId={parts[2]}
            navigate={navigate}
            onShowMessage={showToast}
          />
        );
      }
    }

    // Dynamic anime download route: /anime/:slug/download
    if (path.startsWith('/anime/') && path.includes('/download')) {
      const parts = path.split('?')[0].split('/').filter(Boolean);
      // parts[0] === 'anime', parts[1] === animeSlug, parts[2] === 'download'
      const rawSlug = parts[1];
      const slug = rawSlug ? decodeURIComponent(rawSlug) : '';
      const seasonParam = searchParams.get('season');
      const epParam = searchParams.get('episode');
      const initialSeason = seasonParam ? parseInt(seasonParam, 10) : undefined;
      const initialEpisode = epParam ? parseInt(epParam, 10) : undefined;
      if (slug) {
        return (
          <AnimeDownloadView
            key={`anime-download-${slug}-${seasonParam || 'all'}-${epParam || 'all'}`}
            slug={slug}
            initialSeason={initialSeason}
            initialEpisode={initialEpisode}
            navigate={navigate}
            onShowMessage={showToast}
          />
        );
      }
    }

    // Direct download route: /download/:slug
    if (path.startsWith('/download/')) {
      const rawSlug = path.split('?')[0].replace('/download/', '').split('/')[0];
      const slug = rawSlug ? decodeURIComponent(rawSlug) : '';
      const seasonParam = searchParams.get('season');
      const epParam = searchParams.get('episode');
      const initialSeason = seasonParam ? parseInt(seasonParam, 10) : undefined;
      const initialEpisode = epParam ? parseInt(epParam, 10) : undefined;
      if (slug) {
        return (
          <AnimeDownloadView
            key={`download-direct-${slug}-${seasonParam || 'all'}-${epParam || 'all'}`}
            slug={slug}
            initialSeason={initialSeason}
            initialEpisode={initialEpisode}
            navigate={navigate}
            onShowMessage={showToast}
          />
        );
      }
    }

    // Dynamic anime detail route: /anime/:slug
    if (path.startsWith('/anime/')) {
      const slug = path.replace('/anime/', '').split('/')[0];
      const seasonParam = searchParams.get('season');
      const initialSeason = seasonParam ? parseInt(seasonParam, 10) : undefined;
      if (slug) {
        return (
          <AnimeDetailView
            key={`anime-detail-${slug}-${seasonParam || 'all'}`}
            slug={slug}
            initialSeason={initialSeason}
            navigate={navigate}
            onShowMessage={showToast}
          />
        );
      }
    }

    // Fallback -> Home
    return <HomeView navigate={navigate} onShowMessage={showToast} />;
  };

  const [rawPath] = (currentPath || '').split('?');
  const isAdminRoute = (rawPath || '').startsWith('/admin');

  return (
    <div className="min-h-screen bg-[#030712] text-[#F5F9FF] flex flex-col font-sans relative selection:bg-[#00A8FF]/30 selection:text-white">
      {/* Hardware-Accelerated Ambient Glow Background */}
      <div className="bg-ambient-layer" aria-hidden="true" />

      {/* Toast Notification Banner */}
      {toast && (
        <div
          id="toast-notification-banner"
          className="fixed top-20 right-4 z-50 bg-[#111827] border border-[#6366F1]/50 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-200"
        >
          <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0" />
          <span className="text-xs font-semibold">{toast.text}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* When on Admin routes, render Admin Layout directly without double headers and public footer */}
      {isAdminRoute ? (
        <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#050A14]">
          {renderRoute()}
        </div>
      ) : (
        /* Main Public Page Layout Wrapper (Applies smooth glass blur when popup notice is open) */
        <div
          className={`flex flex-col flex-1 transition-[filter] duration-300 ${
            popupNoticeOpen ? 'filter blur-[6px] pointer-events-none select-none' : ''
          }`}
        >
          {/* Persistent App Header */}
          <Header
            currentPath={currentPath}
            navigate={navigate}
            onShowMessage={showToast}
          />

          {/* Main Viewport */}
          <main className="flex-1 pt-16 md:pt-[72px]">
            {renderRoute()}
          </main>

          {/* Upgraded Footer */}
          <Footer
            siteConfig={siteConfig}
            navigate={navigate}
            onRequestAnimeClick={() => setRequestModalOpen(true)}
            onOpenLegal={(tab) => {
              setLegalModalTab(tab);
              setLegalModalOpen(true);
            }}
          />
        </div>
      )}

      {/* Website Open Notice Pop-up Card */}
      <SiteNoticeModal
        isOpen={popupNoticeOpen}
        onClose={handleClosePopupNotice}
        notice={popupNotice}
        onNavigate={navigate}
      />

      {/* Legal & About Modal */}
      <LegalModal
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        initialTab={legalModalTab}
      />

      {/* Community Anime Request Modal */}
      <RequestAnimeModal
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        onSuccessToast={showToast}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
