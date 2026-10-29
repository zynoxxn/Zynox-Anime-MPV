import React, { useEffect, useState, useMemo } from 'react';
import type { Anime } from '../types/anime';
import type { Episode } from '../types/episode';
import type { WatchlistStatus } from '../types/library';
import { useAuth } from '../lib/auth';
import { getAnimeBySlug, getAnimeById, getPublishedAnimes, incrementAnimeViews, cleanAnimeTitle } from '../lib/firestore/anime';
import { getPublishedEpisodesByAnimeId } from '../lib/firestore/episodes';
import {
  toggleFavorite,
  isFavorite,
  setWatchlistStatus,
  removeFromWatchlist,
  getAnimeWatchlistStatus,
  getWatchedEpisodes,
} from '../lib/firestore/user-activity';
import { ShareModal } from '../components/ShareModal';
import { openSystemShare } from '../lib/share';
import { DownloadModal } from '../components/DownloadModal';
import { EpisodeSelector } from '../components/EpisodeSelector';
import { AnimeCard } from '../components/AnimeCard';
import { AnimeDetailSkeleton } from '../components/SkeletonLoader';
import { FollowButton } from '../components/FollowButton';
import { CommentSection } from '../components/community/CommentSection';
import {
  resolveEpisodeDownloadUrl,
  executeDownloadRedirect,
  getAllEpisodeDownloadMirrors,
  type DownloadMirror,
} from '../lib/downloadRedirect';
import { generateAnimeSeoMetadata } from '../lib/seo';
import { usePageSeo } from '../hooks/usePageSeo';
import {
  ArrowLeft,
  Play,
  Film,
  Star,
  Heart,
  Bookmark,
  Share2,
  AlertCircle,
  Loader2,
  Check,
  Clock,
  Layers,
  Mic,
  Download,
  Info,
  Sparkles,
  ChevronRight,
  Eye,
  Tv,
} from 'lucide-react';

interface AnimeDetailViewProps {
  slug: string;
  initialSeason?: number | 'all';
  navigate: (path: string) => void;
  onShowMessage?: (msg: string) => void;
}

export const AnimeDetailView: React.FC<AnimeDetailViewProps> = ({
  slug,
  initialSeason,
  navigate,
  onShowMessage,
}) => {
  const { user, isAdmin } = useAuth();
  const [anime, setAnime] = useState<Anime | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [relatedAnimes, setRelatedAnimes] = useState<Anime[]>([]);
  const [watchedEpNumbers, setWatchedEpNumbers] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFullSynopsis, setShowFullSynopsis] = useState(false);

  // Active season selection (Crunchyroll-style dynamic asset switching)
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<number | 'all'>(() => {
    if (initialSeason !== undefined) return initialSeason;
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('season');
      if (p) {
        const num = parseInt(p, 10);
        if (!isNaN(num)) return num;
      }
    }
    return 'all';
  });

  // Keep season in sync if initialSeason prop updates
  useEffect(() => {
    if (initialSeason !== undefined) {
      setSelectedSeasonNumber(initialSeason);
    }
  }, [initialSeason]);

  // User state
  const [fav, setFav] = useState(false);
  const [watchlistStatus, setWatchStatus] = useState<WatchlistStatus | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [downloadMirrors, setDownloadMirrors] = useState<DownloadMirror[]>([]);
  const [downloadModalSubtitle, setDownloadModalSubtitle] = useState('');

  const handleShare = () => {
    const shareTitle = anime?.title || 'Anime';
    const shareText = `Watch ${shareTitle} in Hindi Dub & English Sub on ZYNOX ANIME`;
    openSystemShare({
      title: shareTitle,
      text: shareText,
      url: typeof window !== 'undefined' ? window.location.href : '',
      onShowMessage,
      onFallback: () => setShareOpen(true),
    });
  };

  // Dynamic Google SEO & Schema.org Structured Data
  const seoMetadata = useMemo(() => {
    if (!anime) return null;
    return generateAnimeSeoMetadata(anime, {
      siteName: 'ZYNOX ANIME',
    });
  }, [anime]);

  usePageSeo(seoMetadata);

  // Active season metadata if a specific season is chosen (Crunchyroll style) - Must be declared before any conditional returns
  const activeSeasonEntry = useMemo(() => {
    if (selectedSeasonNumber === 'all' || !anime?.seasonsList) return null;
    return anime.seasonsList.find((s) => Number(s.seasonNumber) === Number(selectedSeasonNumber)) || null;
  }, [anime?.seasonsList, selectedSeasonNumber]);

  // First episode of the selected season (for the main play button) - Must be declared before any conditional returns
  const firstSeasonEpisode = useMemo(() => {
    if (selectedSeasonNumber === 'all') return episodes[0] || null;
    return (
      episodes.find(
        (e) => Number(e.seasonNumber || e.season || 1) === Number(selectedSeasonNumber)
      ) || episodes[0] || null
    );
  }, [episodes, selectedSeasonNumber]);

  useEffect(() => {
    let isMounted = true;

    const fetchDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        let animeData = await getAnimeBySlug(slug);
        if (!animeData) {
          animeData = await getAnimeById(slug);
        }
        if (!animeData) {
          if (isMounted) setError('Anime not found or not published.');
          return;
        }

        if (animeData.published === false && !isAdmin) {
          if (isMounted) setError('This anime is currently not published.');
          return;
        }

        if (isMounted) {
          setAnime(animeData);
        }

        if (animeData.id) {
          incrementAnimeViews(animeData.id);

          const [epList, allAnimes, isFav, wStatus, watchedList] = await Promise.all([
            getPublishedEpisodesByAnimeId(animeData.id),
            getPublishedAnimes(),
            isFavorite(user?.uid || null, animeData.id),
            getAnimeWatchlistStatus(user?.uid || null, animeData.id),
            getWatchedEpisodes(user?.uid || null, animeData.id),
          ]);

          if (isMounted) {
            setEpisodes(epList);
            setFav(isFav);
            setWatchStatus(wStatus);
            setWatchedEpNumbers(watchedList);

            // Filter related anime with shared genres
            const related = allAnimes.filter((a) => {
              if (a.id === animeData.id) return false;
              if (!animeData.genres || !a.genres) return true;
              return a.genres.some((g) => animeData.genres?.includes(g));
            });
            setRelatedAnimes(related.slice(0, 6));
          }
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Error fetching anime details:', err);
          setError('Failed to load anime details.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDetails();
    return () => {
      isMounted = false;
    };
  }, [slug, user?.uid]);

  const handleFavoriteClick = async () => {
    if (!anime?.id) return;
    const newFav = await toggleFavorite(
      user?.uid || null,
      anime.id,
      anime.slug,
      anime.title,
      anime.poster,
      anime.genres
    );
    setFav(newFav);
    onShowMessage?.(newFav ? `Added "${anime.title}" to favorites.` : `Removed from favorites.`);
  };

  const handleWatchlistToggle = async () => {
    if (!anime?.id) return;
    if (watchlistStatus) {
      setWatchStatus(null);
      await removeFromWatchlist(user?.uid || null, anime.id);
      onShowMessage?.(`Removed "${anime.title}" from Watchlist.`);
    } else {
      const newStatus: WatchlistStatus = 'watching';
      setWatchStatus(newStatus);
      await setWatchlistStatus(
        user?.uid || null,
        anime.id,
        anime.slug,
        anime.title,
        anime.poster,
        newStatus,
        anime.genres,
        anime.rating
      );
      onShowMessage?.(`Added "${anime.title}" to Watchlist!`);
    }
  };

  const handleDownloadClick = (ep?: Episode) => {
    if (anime?.slug || anime?.id) {
      const slug = anime.slug || anime.id;
      const sParam = selectedSeasonNumber !== 'all' ? `?season=${selectedSeasonNumber}` : '';
      const epParam = ep ? (sParam ? `&episode=${ep.episodeNumber}` : `?episode=${ep.episodeNumber}`) : '';
      navigate(`/anime/${slug}/download${sParam}${epParam}`);
      return;
    }

    const targetEp = ep || episodes[0];
    const mirrors = getAllEpisodeDownloadMirrors(targetEp, anime);
    if (mirrors.length > 1) {
      setDownloadMirrors(mirrors);
      setDownloadModalSubtitle(
        targetEp ? `Select quality to download Episode ${targetEp.episodeNumber}` : 'Select download mirror'
      );
      setDownloadModalOpen(true);
      return;
    }

    const dlUrl = mirrors.length === 1 ? mirrors[0].url : resolveEpisodeDownloadUrl(targetEp, anime);
    if (!dlUrl) {
      onShowMessage?.('Download link for this anime/episode has not been added yet.');
      return;
    }

    executeDownloadRedirect(
      dlUrl,
      targetEp ? `${anime?.title || 'Anime'} - Episode ${targetEp.episodeNumber}` : anime?.title,
      onShowMessage
    );
  };

  const handleOpenMirrors = (ep?: Episode) => {
    const targetEp = ep || episodes[0];
    const mirrors = getAllEpisodeDownloadMirrors(targetEp, anime);
    setDownloadMirrors(mirrors);
    setDownloadModalSubtitle(
      targetEp ? `Select quality to download Episode ${targetEp.episodeNumber}` : 'Select download mirror'
    );
    setDownloadModalOpen(true);
  };

  if (loading) {
    return <AnimeDetailSkeleton />;
  }

  if (error || !anime) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="bg-[#07111F] border border-rose-500/30 text-rose-300 p-8 rounded-3xl shadow-2xl space-y-4">
          <AlertCircle className="w-10 h-10 mx-auto text-rose-400" />
          <h2 className="text-xl font-bold text-[#F8FAFC]">{error || 'Anime Not Found'}</h2>
          <p className="text-xs text-[#94A3B8] leading-relaxed">
            The requested title does not exist or has not been published to the catalog.
          </p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-5 py-2.5 bg-[#081426] hover:bg-[#0B1B32] text-white text-xs font-bold rounded-xl border border-white/10 transition-colors inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Catalog
          </button>
        </div>
      </div>
    );
  }

  const altTitle =
    anime.altTitles && anime.altTitles.length > 0
      ? anime.altTitles[0]
      : anime.alternateTitles && anime.alternateTitles.length > 0
      ? anime.alternateTitles[0]
      : anime.japaneseTitle || '';

  // Dynamic visual assets and metadata
  const currentPoster = activeSeasonEntry?.poster || anime.poster;
  const currentBanner = activeSeasonEntry?.banner || anime.banner || currentPoster;
  const currentDescription = activeSeasonEntry?.description || anime.description;
  const currentSeasonNumber =
    activeSeasonEntry?.seasonNumber ||
    (selectedSeasonNumber !== 'all' ? selectedSeasonNumber : 1);
  const currentSeasonTitle = `Season ${currentSeasonNumber}`;
  const isAnimeUpcoming =
    anime.status === 'upcoming' ||
    Boolean(anime.isUpcoming) ||
    episodes.some((ep) => ep.status === 'upcoming' || Boolean(ep.isUpcoming));

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6 sm:space-y-8">
      {/* Top Breadcrumb Navigation */}
      <div className="flex items-center justify-between gap-2 text-xs text-[#94A3B8]">
        <button
          id="btn-back-home"
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 font-bold hover:text-[#00CFFF] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Catalog</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="p-2 bg-[#07111F] hover:bg-[#081426] text-[#94A3B8] hover:text-[#00CFFF] rounded-xl border border-white/10 transition-colors cursor-pointer"
            title="Share anime"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 1. TOP SECTION */}
      <div className="bg-[#07111F] border border-white/[0.06] hover:border-[#1683FF]/20 rounded-3xl p-5 sm:p-8 md:p-10 shadow-2xl relative overflow-hidden transition-all">
        {/* Dynamic Season Backdrop Banner (Crunchyroll Style) */}
        {currentBanner && (
          <div className="absolute inset-0 opacity-20 overflow-hidden pointer-events-none transition-opacity duration-500">
            <img
              key={currentBanner}
              src={currentBanner}
              alt=""
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover blur-2xl scale-125 transition-all duration-500 animate-in fade-in"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#07111F] via-[#07111F]/90 to-transparent" />
          </div>
        )}

        <div className="relative flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8">
          {/* Centered Large Poster Container - Updates dynamically per season */}
          <div className="relative w-44 sm:w-56 md:w-64 aspect-[2/3] shrink-0 rounded-2xl overflow-hidden border border-[#1683FF]/30 shadow-2xl shadow-[#1683FF]/15 group bg-[#050A14]">
            {currentPoster ? (
              <img
                key={currentPoster}
                src={currentPoster}
                alt={anime.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-all duration-500 animate-in fade-in"
              />
            ) : (
              <div className="w-full h-full bg-[#050A14] flex items-center justify-center text-[#64748B]">
                <Film className="w-12 h-12 opacity-30" />
              </div>
            )}

            {/* Active Season Badge on Poster */}
            {selectedSeasonNumber !== 'all' && (
              <div className="absolute top-2 right-2 px-2.5 py-1 bg-[#1683FF] text-white text-[10px] font-black uppercase rounded-lg shadow-lg flex items-center gap-1 border border-white/20">
                <Layers className="w-3 h-3" />
                <span>Season {selectedSeasonNumber}</span>
              </div>
            )}

            {/* Upcoming Release Badge on Poster */}
            {isAnimeUpcoming && (
              <div className="absolute top-2 left-2 px-2.5 py-1 bg-amber-500 text-black text-[10px] font-black uppercase rounded shadow-lg flex items-center gap-1 z-10">
                <Clock className="w-3 h-3" />
                <span>Upcoming</span>
              </div>
            )}

            {/* Optional Rank Badge if explicitly defined */}
            {anime.badge && !isAnimeUpcoming && (
              <div className="absolute top-2 left-2 px-2.5 py-1 bg-[#1683FF] text-white text-[10px] font-black uppercase rounded shadow-md flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>{anime.badge}</span>
              </div>
            )}
          </div>

          {/* Anime Details Info */}
          <div className="flex-1 text-center md:text-left space-y-3.5">
            {/* Metadata Tags Row */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <span className="px-2.5 py-1 bg-[#050A14] border border-white/10 rounded-lg text-xs font-bold text-[#F8FAFC]">
                {anime.type || 'TV'}
              </span>
              {anime.year && (
                <span className="px-2.5 py-1 bg-[#050A14] border border-white/10 rounded-lg text-xs font-bold text-[#94A3B8]">
                  {anime.year}
                </span>
              )}
              <span className="px-2.5 py-1 bg-[#050A14] border border-white/10 rounded-lg text-xs font-bold text-[#94A3B8]">
                {episodes.length > 0 ? `${episodes.length} Eps` : anime.totalEpisodes ? `${anime.totalEpisodes} Eps` : 'TBA'}
              </span>
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold capitalize border bg-[#050A14] text-[#CBD5E1] border-white/10">
                {anime.status || 'Ongoing'}
              </span>
              {anime.audioLanguage && (
                <span className="px-2.5 py-1 bg-[#1683FF]/15 text-[#00CFFF] border border-[#1683FF]/30 rounded-lg text-xs font-bold flex items-center gap-1">
                  <Mic className="w-3 h-3" />
                  <span>{anime.audioLanguage}</span>
                </span>
              )}
            </div>

            {/* Title & Season Indicator */}
            <div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-[#F8FAFC] tracking-tight uppercase">
                  {cleanAnimeTitle(anime.title)}
                </h1>
                {currentSeasonTitle && (
                  <span className="px-3 py-1 bg-[#1683FF]/20 text-[#00CFFF] border border-[#1683FF]/40 rounded-xl text-xs sm:text-sm font-black flex items-center gap-1.5 shadow-sm">
                    <Layers className="w-3.5 h-3.5" />
                    <span>{currentSeasonTitle}</span>
                  </span>
                )}
              </div>
              {altTitle && (
                <p className="text-xs sm:text-sm text-[#94A3B8] mt-1 font-medium italic">
                  {altTitle}
                </p>
              )}
            </div>

            {/* Rating & Studio Line */}
            {(anime.rating || anime.studio) && (
              <div className="flex items-center justify-center md:justify-start gap-3 text-xs sm:text-sm text-[#94A3B8]">
                {anime.rating && (
                  <span className="flex items-center gap-1 text-amber-400 font-bold">
                    <Star className="w-4 h-4 fill-amber-400" />
                    <span>{anime.rating}</span>
                  </span>
                )}
                {anime.rating && anime.studio && <span>•</span>}
                {anime.studio && (
                  <span className="text-[#94A3B8]">
                    Studio: <strong className="text-[#F8FAFC] font-bold">{anime.studio}</strong>
                  </span>
                )}
              </div>
            )}

            {/* Synopsis Description (Dynamic per selected season) */}
            <div className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed max-w-3xl">
              <p className={showFullSynopsis ? '' : 'line-clamp-3'}>
                {currentDescription || 'No synopsis has been provided for this series.'}
              </p>
              {currentDescription && currentDescription.length > 180 && (
                <button
                  type="button"
                  onClick={() => setShowFullSynopsis((prev) => !prev)}
                  className="text-xs font-bold text-[#00CFFF] hover:underline mt-1 inline-block"
                >
                  {showFullSynopsis ? 'Show Less' : 'Read More'}
                </button>
              )}
            </div>

            {/* Genre Chips */}
            {anime.genres && anime.genres.length > 0 && (
              <div className="flex flex-wrap justify-center md:justify-start gap-2 pt-1">
                {anime.genres.map((genre, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-3 py-1 rounded-xl bg-[#050A14] text-[#00CFFF] border border-[#1683FF]/20 font-bold"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}

            {/* Primary Action Buttons: [▶ Watch Ep 1] [⬇ Download] */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-3">
              {firstSeasonEpisode ? (
                <button
                  id="btn-watch-first-episode"
                  type="button"
                  onClick={() =>
                    navigate(`/anime/${anime.slug}/episode/${firstSeasonEpisode.episodeNumber}`)
                  }
                  className="px-7 py-3 bg-[#1683FF] hover:bg-[#2196FF] text-white font-black text-xs sm:text-sm rounded-xl transition-all inline-flex items-center gap-2 shadow-lg shadow-[#1683FF]/30 hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>
                    Watch Ep {firstSeasonEpisode.episodeNumber}
                    {selectedSeasonNumber !== 'all' ? ` (S${selectedSeasonNumber})` : ''}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="px-7 py-3 bg-[#1683FF]/30 text-white/50 font-black text-xs sm:text-sm rounded-xl"
                >
                  Episodes Coming Soon
                </button>
              )}

              <button
                type="button"
                onClick={() => handleDownloadClick()}
                className="px-6 py-3 bg-[#081426] hover:bg-emerald-600/20 text-emerald-400 hover:text-emerald-300 font-bold text-xs sm:text-sm rounded-xl border border-emerald-500/30 hover:border-emerald-500/60 transition-all inline-flex items-center gap-2 hover:scale-[1.02] cursor-pointer"
                title="Download Anime (Redirect)"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>

              {/* Watchlist Toggle */}
              <button
                id="btn-watchlist-toggle"
                type="button"
                onClick={handleWatchlistToggle}
                className={`px-4 py-3 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer ${
                  watchlistStatus
                    ? 'bg-[#1683FF] text-white border-[#1683FF] shadow-md shadow-[#1683FF]/25'
                    : 'bg-[#081426] hover:bg-[#0B1B32] text-[#94A3B8] border-white/10 hover:text-white'
                }`}
                title={watchlistStatus ? 'Remove from Watchlist' : 'Add to Watchlist'}
              >
                {watchlistStatus ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                <span>{watchlistStatus ? 'In Watchlist' : '+ Watchlist'}</span>
              </button>

              {/* Favorite Toggle */}
              <button
                type="button"
                onClick={handleFavoriteClick}
                className={`p-3 rounded-xl border transition-all flex items-center justify-center cursor-pointer ${
                  fav
                    ? 'bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-500/25'
                    : 'bg-[#081426] hover:bg-[#0B1B32] text-[#94A3B8] border-white/10 hover:text-white'
                }`}
                title={fav ? 'Favorited' : 'Add to favorites'}
              >
                <Heart className={`w-4 h-4 ${fav ? 'fill-current' : ''}`} />
              </button>

              {/* Share */}
              <button
                type="button"
                onClick={handleShare}
                className="p-3 rounded-xl bg-[#081426] hover:bg-[#0B1B32] text-[#94A3B8] border border-white/10 hover:text-[#00CFFF] transition-colors cursor-pointer"
                title="Share"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. EPISODES DIRECT SELECTOR */}
      <EpisodeSelector
        episodes={episodes}
        animeTitle={anime.title}
        animePoster={currentPoster}
        animeBanner={currentBanner}
        seasonsList={anime.seasonsList}
        selectedSeason={selectedSeasonNumber}
        isAnimeUpcoming={isAnimeUpcoming}
        onSeasonChange={(s) => setSelectedSeasonNumber(s)}
        watchedEpisodeNumbers={watchedEpNumbers}
        onSelectEpisode={(epNum) => navigate(`/anime/${anime.slug}/episode/${epNum}`)}
        onDownloadEpisode={handleDownloadClick}
        onNavigateSeasonAnime={(seasonSlug) => navigate(`/anime/${seasonSlug}`)}
      />

      {/* 3. COMMUNITY COMMENTS */}
      <div className="bg-[#07111F] border border-white/[0.06] rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-xl">
        <CommentSection
          targetType="anime"
          animeId={anime.id!}
          animeSlug={anime.slug}
          animeTitle={anime.title}
          onShowMessage={onShowMessage || (() => {})}
          navigate={navigate}
        />
      </div>

      {/* 5. RELATED ANIME (3 columns on mobile matching screenshot) */}
      {relatedAnimes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Layers className="w-4 h-4 text-[#1683FF]" />
            <h3 className="font-black text-[#F8FAFC] text-lg">Related Anime</h3>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
            {relatedAnimes.map((rel, idx) => (
              <AnimeCard
                key={`detail-rel-${rel.id || rel.slug}-${idx}`}
                anime={rel}
                navigate={navigate}
                onShowMessage={onShowMessage}
              />
            ))}
          </div>
        </div>
      )}

      {/* Download Modal */}
      {anime && (
        <DownloadModal
          isOpen={downloadModalOpen}
          onClose={() => setDownloadModalOpen(false)}
          title={anime.title}
          subtitle={downloadModalSubtitle}
          mirrors={downloadMirrors}
          onShowMessage={onShowMessage}
        />
      )}

      {/* Share Modal */}
      <ShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        title={anime.title}
        url={`/anime/${anime.slug}`}
      />
    </div>
  );
};
