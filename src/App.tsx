import React, { useState, useEffect, useCallback, useRef, Suspense, lazy } from 'react';
import { AuthProvider } from './context/AuthContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { RequestAnimeModal } from './components/RequestAnimeModal';
import { LegalModal, type LegalTab } from './components/LegalModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SiteNoticeModal } from './components/SiteNoticeModal';
import {
  getSiteSettings,
  DEFAULT_SITE_CONFIG,
  applyThemeBranding,
} from './lib/firestore/site-settings';
import { subscribeToCmsPopupNotice, DEFAULT_POPUP_NOTICE } from './lib/firestore/cms';
import { useAuth } from './lib/auth';
import { isValidSafeUrl } from './lib/security';
import type { SitePopupNotice } from './types/cms';
import type { SiteConfig } from './types/library';
import { CheckCircle2, X, Send, ArrowUp, Wrench } from 'lucide-react';

function lazyWithRetry<T extends React.ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
  retries = 2
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await importer();
      } catch (err) {
        lastError = err;
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
        }
      }
    }
    throw lastError;
  });
}

// Route-level code splitting: public views
const HomeView = lazyWithRetry(() => import('./views/HomeView').then((m) => ({ default: m.HomeView })));
const BrowseView = lazyWithRetry(() => import('./views/BrowseView').then((m) => ({ default: m.BrowseView })));
const ScheduleView = lazyWithRetry(() => import('./views/ScheduleView').then((m) => ({ default: m.ScheduleView })));
const WatchlistView = lazyWithRetry(() => import('./views/WatchlistView').then((m) => ({ default: m.WatchlistView })));
const HistoryView = lazyWithRetry(() => import('./views/HistoryView').then((m) => ({ default: m.HistoryView })));
const FavoritesView = lazyWithRetry(() => import('./views/FavoritesView').then((m) => ({ default: m.FavoritesView })));
const NotificationsView = lazyWithRetry(() => import('./views/NotificationsView').then((m) => ({ default: m.NotificationsView })));
const LoginView = lazyWithRetry(() => import('./views/LoginView').then((m) => ({ default: m.LoginView })));
const SignupView = lazyWithRetry(() => import('./views/SignupView').then((m) => ({ default: m.SignupView })));
const ProfileView = lazyWithRetry(() => import('./views/ProfileView').then((m) => ({ default: m.ProfileView })));
const PublicProfileView = lazyWithRetry(() => import('./views/PublicProfileView').then((m) => ({ default: m.PublicProfileView })));
const AnimeRequestsView = lazyWithRetry(() => import('./views/AnimeRequestsView').then((m) => ({ default: m.AnimeRequestsView })));
const AnimeDetailView = lazyWithRetry(() => import('./views/AnimeDetailView').then((m) => ({ default: m.AnimeDetailView })));
const WatchEpisodeView = lazyWithRetry(() => import('./views/WatchEpisodeView').then((m) => ({ default: m.WatchEpisodeView })));
const AnimeDownloadView = lazyWithRetry(() => import('./views/AnimeDownloadView').then((m) => ({ default: m.AnimeDownloadView })));
const LegalView = lazyWithRetry(() => import('./views/LegalView').then((m) => ({ default: m.LegalView })));
const NotFoundView = lazyWithRetry(() => import('./views/NotFoundView').then((m) => ({ default: m.NotFoundView })));

// Route-level code splitting: admin views (never loaded for public visitors)
const AdminDashboardView = lazyWithRetry(() => import('./views/admin/AdminDashboardView').then((m) => ({ default: m.AdminDashboardView })));
const AdminAnimeListView = lazyWithRetry(() => import('./views/admin/AdminAnimeListView').then((m) => ({ default: m.AdminAnimeListView })));
const AdminAnimeFormView = lazyWithRetry(() => import('./views/admin/AdminAnimeFormView').then((m) => ({ default: m.AdminAnimeFormView })));
const AdminEpisodeListView = lazyWithRetry(() => import('./views/admin/AdminEpisodeListView').then((m) => ({ default: m.AdminEpisodeListView })));
const AdminEpisodeFormView = lazyWithRetry(() => import('./views/admin/AdminEpisodeFormView').then((m) => ({ default: m.AdminEpisodeFormView })));
const AdminBulkEpisodeView = lazyWithRetry(() => import('./views/admin/AdminBulkEpisodeView').then((m) => ({ default: m.AdminBulkEpisodeView })));
const AdminScheduleView = lazyWithRetry(() => import('./views/admin/AdminScheduleView').then((m) => ({ default: m.AdminScheduleView })));
const AdminTaxonomyView = lazyWithRetry(() => import('./views/admin/AdminTaxonomyView').then((m) => ({ default: m.AdminTaxonomyView })));
const AdminHomepageView = lazyWithRetry(() => import('./views/admin/AdminHomepageView').then((m) => ({ default: m.AdminHomepageView })));
const AdminHeroBannersView = lazyWithRetry(() => import('./views/admin/AdminHeroBannersView').then((m) => ({ default: m.AdminHeroBannersView })));
const AdminSeasonsView = lazyWithRetry(() => import('./views/admin/AdminSeasonsView').then((m) => ({ default: m.AdminSeasonsView })));
const AdminNavigationFooterView = lazyWithRetry(() => import('./views/admin/AdminNavigationFooterView').then((m) => ({ default: m.AdminNavigationFooterView })));
const AdminNoticeView = lazyWithRetry(() => import('./views/admin/AdminNoticeView').then((m) => ({ default: m.AdminNoticeView })));
const AdminSeoSettingsView = lazyWithRetry(() => import('./views/admin/AdminSeoSettingsView').then((m) => ({ default: m.AdminSeoSettingsView })));
const AdminLegalPagesView = lazyWithRetry(() => import('./views/admin/AdminLegalPagesView').then((m) => ({ default: m.AdminLegalPagesView })));
const AdminActivityLogsView = lazyWithRetry(() => import('./views/admin/AdminActivityLogsView').then((m) => ({ default: m.AdminActivityLogsView })));
const AdminUsersView = lazyWithRetry(() => import('./views/admin/AdminUsersView').then((m) => ({ default: m.AdminUsersView })));
const AdminRequestsView = lazyWithRetry(() => import('./views/admin/AdminRequestsView').then((m) => ({ default: m.AdminRequestsView })));
const AdminReportsView = lazyWithRetry(() => import('./views/admin/AdminReportsView').then((m) => ({ default: m.AdminReportsView })));
const AdminSettingsView = lazyWithRetry(() => import('./views/admin/AdminSettingsView').then((m) => ({ default: m.AdminSettingsView })));
const AdminAvatarsView = lazyWithRetry(() => import('./views/admin/AdminAvatarsView').then((m) => ({ default: m.AdminAvatarsView })));
const AdminDownloadsView = lazyWithRetry(() => import('./views/admin/AdminDownloadsView').then((m) => ({ default: m.AdminDownloadsView })));

interface ToastMessage {
  id: string;
  text: string;
}

const RouteFallback: React.FC = () => {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 6000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 gap-4 text-center">
      <div className="w-8 h-8 border-2 border-[#1E88FF] border-t-transparent rounded-full animate-spin" aria-label="Loading page" />
      {slow && (
        <div className="space-y-2">
          <p className="text-xs text-[#94A3B8]">Taking longer than expected to load.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="h-9 px-4 rounded-xl bg-[#1E88FF] hover:bg-[#1570d8] text-white text-xs font-semibold cursor-pointer transition-colors"
          >
            Reload Page
          </button>
        </div>
      )}
    </div>
  );
};

const AppContent: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const isSuperAdmin = Boolean(
    isAdmin || (user?.email && user.email.toLowerCase().trim() === 'zairoxmax2.0@gmail.com')
  );
  const [currentPath, setCurrentPath] = useState<string>(
    typeof window !== 'undefined'
      ? `${window.location.pathname}${window.location.search}` || '/'
      : '/'
  );
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [hasSaveBar, setHasSaveBar] = useState<boolean>(false);
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(DEFAULT_SITE_CONFIG);
  const [requestModalOpen, setRequestModalOpen] = useState<boolean>(false);
  const [legalModalOpen, setLegalModalOpen] = useState<boolean>(false);
  const [legalModalTab, setLegalModalTab] = useState<LegalTab>('about');
  const [popupNotice, setPopupNotice] = useState<SitePopupNotice>(DEFAULT_POPUP_NOTICE);
  const [popupNoticeOpen, setPopupNoticeOpen] = useState<boolean>(false);
  const [isFooterVisible, setIsFooterVisible] = useState<boolean>(false);
  const [showBackToTop, setShowBackToTop] = useState<boolean>(false);

  // Sync active save-bar status from document body attribute
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const updateSaveBar = () => {
      setHasSaveBar(document.body.getAttribute('data-has-save-bar') === 'true');
    };
    updateSaveBar();
    const observer = new MutationObserver(updateSaveBar);
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-has-save-bar'] });
    return () => observer.disconnect();
  }, []);

  // Sync route changes with browser history
  const navigate = useCallback((path: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  // Monitor scroll for Back-To-Top button and Footer intersection
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);

      const footer = document.querySelector('footer');
      if (footer) {
        const rect = footer.getBoundingClientRect();
        setIsFooterVisible(rect.top <= window.innerHeight);
      } else {
        setIsFooterVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
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

  // Fetch site configuration & sync with live broadcasts + CSS branding vars
  useEffect(() => {
    getSiteSettings().then((cfg) => {
      setSiteConfig(cfg);
      applyThemeBranding(cfg);
    });
    const handleSettingsUpdate = (e: Event) => {
      const custom = e as CustomEvent<Partial<SiteConfig>>;
      if (custom.detail) {
        setSiteConfig((prev) => {
          const next = { ...prev, ...custom.detail };
          applyThemeBranding(next);
          return next;
        });
      }
    };
    window.addEventListener('zynox:settings-updated', handleSettingsUpdate);
    return () => window.removeEventListener('zynox:settings-updated', handleSettingsUpdate);
  }, []);

  // Update page title when public site is in maintenance mode
  const [rawPath] = (currentPath || '').split('?');
  const isAdminRoute = (rawPath || '').startsWith('/admin');
  const inMaintenance = Boolean(siteConfig.maintenanceMode && !isSuperAdmin && !isAdminRoute);

  useEffect(() => {
    if (inMaintenance && typeof document !== 'undefined') {
      document.title = `Maintenance — ${siteConfig.siteName || 'ZYNOX ANIME'}`;
    }
  }, [inMaintenance, siteConfig.siteName]);

  // Tracks whether the user dismissed the notice during this active tab browsing session
  const hasDismissedThisVisitRef = useRef(false);
  const hasShownEntrancePopupRef = useRef(false);
  const siteEntryTimeRef = useRef<number>(Date.now());
  const currentPathRef = useRef(currentPath);
  useEffect(() => {
    currentPathRef.current = currentPath;
  }, [currentPath]);

  const isNoticeDismissedForToday = useCallback((noticeData: SitePopupNotice): boolean => {
    try {
      if ((noticeData as any).expiresAt) {
        const exp = new Date((noticeData as any).expiresAt).getTime();
        if (!isNaN(exp) && Date.now() > exp) return true;
      }
      if ((noticeData as any).endDate) {
        const exp = new Date((noticeData as any).endDate).getTime();
        if (!isNaN(exp) && Date.now() > exp) return true;
      }

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

  // Real-time synchronization and display of Website Entrance Pop-up Card Notice
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const checkAndDisplayNotice = (noticeData: SitePopupNotice, isImmediate = false) => {
      setPopupNotice(noticeData);

      if (!noticeData.enabled) {
        setPopupNoticeOpen(false);
        return;
      }

      if (hasDismissedThisVisitRef.current) {
        return;
      }

      if (isNoticeDismissedForToday(noticeData)) {
        return;
      }

      if (hasShownEntrancePopupRef.current && !isImmediate) {
        return;
      }

      const targetDelaySec = noticeData.displayDelaySeconds ?? 6;
      const targetDelayMs = targetDelaySec * 1000;
      const elapsed = Date.now() - siteEntryTimeRef.current;
      const remainingDelay = isImmediate ? 0 : Math.max(0, targetDelayMs - elapsed);

      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const [p] = (currentPathRef.current || '').split('?');
        if (p.startsWith('/admin')) {
          return;
        }
        if (hasDismissedThisVisitRef.current || isNoticeDismissedForToday(noticeData)) {
          return;
        }
        hasShownEntrancePopupRef.current = true;
        setPopupNoticeOpen(true);
      }, remainingDelay);
    };

    const unsubscribe = subscribeToCmsPopupNotice((liveNotice) => {
      checkAndDisplayNotice(liveNotice, false);
    });

    const handleBroadcastUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<SitePopupNotice>;
      if (customEvent.detail) {
        hasDismissedThisVisitRef.current = false;
        hasShownEntrancePopupRef.current = false;
        checkAndDisplayNotice(customEvent.detail, true);
      }
    };

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

  useEffect(() => {
    const [p] = currentPath.split('?');
    if (
      !p.startsWith('/admin') &&
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
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, text: msg }].slice(-3));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  // Router matcher logic
  const renderRoute = () => {
    const [routePath, rawQuery] = currentPath.split('?');
    const path = routePath || '/';
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
      return <AdminNoticeView key="admin-announcements" initialTab="announcements" navigate={navigate} onShowMessage={showToast} />;
    }
    if (path === '/admin/notice' || path === '/admin/popup-notice') {
      return <AdminNoticeView key="admin-notice" initialTab="popup" navigate={navigate} onShowMessage={showToast} />;
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
      return <AdminSettingsView key="admin-settings" initialTab="settings" navigate={navigate} onShowMessage={showToast} />;
    }
    if (path === '/admin/branding') {
      return <AdminSettingsView key="admin-branding" initialTab="branding" navigate={navigate} onShowMessage={showToast} />;
    }
    if (path === '/admin/downloads' || path.startsWith('/admin/downloads')) {
      return <AdminDownloadsView key="admin-downloads" navigate={navigate} onShowMessage={showToast} />;
    }

    // Legal routes
    if (path === '/about') {
      return <LegalView key="legal-about" tab="about" navigate={navigate} onShowMessage={showToast} />;
    }
    if (path === '/dmca') {
      return <LegalView key="legal-dmca" tab="dmca" navigate={navigate} onShowMessage={showToast} />;
    }
    if (path === '/disclaimer') {
      return <LegalView key="legal-disclaimer" tab="disclaimer" navigate={navigate} onShowMessage={showToast} />;
    }
    if (path === '/terms' || path === '/terms-of-service') {
      return <LegalView key="legal-terms" tab="terms" navigate={navigate} onShowMessage={showToast} />;
    }
    if (path === '/privacy' || path === '/privacy-policy') {
      return <LegalView key="legal-privacy" tab="privacy" navigate={navigate} onShowMessage={showToast} />;
    }
    if (path === '/contact') {
      return <LegalView key="legal-contact" tab="contact" navigate={navigate} onShowMessage={showToast} />;
    }

    // Dynamic episode player route: /anime/:animeSlug/episode/:episodeNumber
    if (path.startsWith('/anime/') && path.includes('/episode/')) {
      const parts = path.split('/').filter(Boolean);
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

    // Unmatched route -> 404 Not Found
    return <NotFoundView navigate={navigate} />;
  };

  const safeTelegramUrl =
    siteConfig.telegramUrl && isValidSafeUrl(siteConfig.telegramUrl)
      ? siteConfig.telegramUrl
      : 'https://t.me/ZynoxAnime';

  return (
    <div className="min-h-screen bg-[#050A14] text-white flex flex-col font-sans relative selection:bg-[#1E88FF]/30 selection:text-white">
      <div className="bg-ambient-layer" aria-hidden="true" />

      {/* Bottom Toast Notification Stack */}
      {toasts.length > 0 && (
        <div
          id="toast-notification-container"
          style={{
            bottom: hasSaveBar
              ? 'calc(128px + env(safe-area-inset-bottom, 0px) + 12px)'
              : 'calc(64px + env(safe-area-inset-bottom, 0px) + 12px)',
          }}
          className="fixed left-1/2 -translate-x-1/2 md:left-auto md:right-6 md:translate-x-0 md:!bottom-6 z-[60] w-[min(92vw,420px)] md:w-auto md:max-w-md pointer-events-none flex flex-col gap-2 items-center md:items-end transition-all duration-200"
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              className="pointer-events-auto w-full bg-[#0B1324] border border-white/10 text-white px-3.5 py-2.5 rounded-xl shadow-2xl shadow-black/80 flex items-center justify-between gap-3 backdrop-blur-md"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-[#1E88FF] shrink-0" />
                <span className="text-xs font-semibold truncate leading-tight">{t.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
                className="w-6 h-6 rounded-md hover:bg-white/10 text-[#94A3B8] hover:text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Admin routes */}
      {isAdminRoute ? (
        <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#050A14]">
          <Suspense fallback={<RouteFallback />}>{renderRoute()}</Suspense>
        </div>
      ) : inMaintenance ? (
        /* Clean Public Maintenance Mode Screen (Admins bypass automatically) */
        <div className="min-h-screen bg-[#050A14] text-white flex flex-col items-center justify-center p-4 sm:p-6 text-center">
          <div className="max-w-md w-full bg-[#0B1324] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="w-14 h-14 rounded-2xl bg-[#1E88FF]/15 border border-[#1E88FF]/30 flex items-center justify-center mx-auto text-[#1E88FF]">
              <Wrench className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                Scheduled Maintenance
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                {siteConfig.siteName || 'ZYNOX ANIME'} is Updating
              </h1>
              <p className="text-sm text-[#94A3B8] leading-relaxed">
                {siteConfig.maintenanceMessage ||
                  'We are currently upgrading our streaming servers to deliver a faster experience. Please check back shortly.'}
              </p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="h-11 px-5 rounded-xl bg-[#1E88FF] hover:bg-[#3B9BFF] text-white text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors whitespace-nowrap"
              >
                <span>Refresh Page</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="h-11 px-5 rounded-xl bg-[#101A30] hover:bg-[#16223D] border border-white/10 text-[#CBD5E1] hover:text-white text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors whitespace-nowrap"
              >
                <span>Admin Sign In</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Main Public Page Layout Wrapper */
        <div
          className={`flex flex-col flex-1 transition-[filter] duration-300 ${
            popupNoticeOpen ? 'filter blur-[6px] pointer-events-none select-none' : ''
          }`}
        >
          <Header currentPath={currentPath} navigate={navigate} onShowMessage={showToast} />

          <main className="flex-1 pt-16 md:pt-[72px]">
            <Suspense fallback={<RouteFallback />}>{renderRoute()}</Suspense>
          </main>

          <Footer
            siteConfig={siteConfig}
            navigate={navigate}
            onRequestAnimeClick={() => setRequestModalOpen(true)}
            onOpenLegal={(tab) => {
              setLegalModalTab(tab);
              setLegalModalOpen(true);
            }}
          />

          {/* Floating Actions on md+ */}
          <div
            className={`hidden md:flex flex-col items-center gap-3 fixed bottom-[20px] right-[20px] z-30 transition-all duration-300 ${
              isFooterVisible ? 'opacity-0 pointer-events-none translate-y-4' : 'opacity-100'
            }`}
          >
            {showBackToTop && (
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="w-11 h-11 rounded-full bg-[#0B1324]/90 hover:bg-[#1E88FF] text-[#CBD5E1] hover:text-white border border-white/15 backdrop-blur-md shadow-xl flex items-center justify-center transition-colors cursor-pointer"
                title="Back to Top"
                aria-label="Back to top"
              >
                <ArrowUp className="w-5 h-5" />
              </button>
            )}

            <a
              href={safeTelegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-11 h-11 rounded-full bg-[#1E88FF] hover:bg-[#3B9BFF] text-white shadow-xl border border-white/15 flex items-center justify-center transition-colors cursor-pointer relative"
              title="Join Telegram Channel"
              aria-label="Join our Telegram Channel"
            >
              <Send className="w-4 h-4 fill-white text-white" />
            </a>
          </div>
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
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <ErrorBoundary>
      {isOffline && (
        <div
          role="status"
          className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-black text-xs font-bold py-1.5 px-4 text-center shadow-md flex items-center justify-center gap-1.5"
        >
          <span>You are currently browsing in offline mode. Cached pages remain available.</span>
        </div>
      )}
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
