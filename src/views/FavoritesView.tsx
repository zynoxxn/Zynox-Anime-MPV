import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../lib/auth';
import type { FavoriteItem } from '../types/library';
import { getFavorites, removeFavorite } from '../lib/firestore/user-activity';
import { EmptyState, ErrorState } from '../components/common/FeedbackStates';
import { usePageSeo } from '../hooks/usePageSeo';
import { Heart, Play } from 'lucide-react';

interface FavoritesViewProps {
  navigate: (path: string) => void;
  onShowMessage?: (msg: string) => void;
}

const FALLBACK_POSTER =
  'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&auto=format&fit=crop&q=80';

export const FavoritesView: React.FC<FavoritesViewProps> = ({ navigate, onShowMessage }) => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  usePageSeo({
    title: 'Favorite Anime | ZYNOX ANIME',
    description: 'Your personal collection of favorite anime series and movies.',
  });

  const fetchFavorites = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const items = await getFavorites(user?.uid || null);
      setFavorites(items);
    } catch (err) {
      console.error('Favorites fetch error:', err);
      setError('Failed to load your favorite anime collection. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const handleRemove = async (animeId: string, title: string) => {
    await removeFavorite(user?.uid || null, animeId);
    setFavorites((prev) => prev.filter((f) => f.animeId !== animeId));
    onShowMessage?.(`Removed "${title}" from favorites.`);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-5">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5 tracking-tight">
            <Heart className="w-6 h-6 sm:w-7 sm:h-7 text-rose-500 fill-rose-500 shrink-0" />
            <span className="truncate">Favorite Anime</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#94A3B8] mt-1">
            Your personal collection of favorite anime titles.
          </p>
        </div>

        {!loading && favorites.length > 0 && (
          <span className="text-xs font-medium text-[#94A3B8] shrink-0">
            {favorites.length} {favorites.length === 1 ? 'title' : 'titles'}
          </span>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-[10px] sm:gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="aspect-[2/3] rounded-xl bg-[#0B1324] border border-white/10 animate-pulse" />
              <div className="h-3.5 w-3/4 rounded bg-white/5 animate-pulse" />
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title="Could Not Load Favorites"
          message={error}
          onRetry={fetchFavorites}
        />
      ) : favorites.length === 0 ? (
        <EmptyState
          icon={<Heart className="w-7 h-7 text-rose-400" />}
          title="No favorites yet"
          description="Tap the heart icon on any anime detail page to save it to your favorites."
          actionLabel="Browse Anime"
          onAction={() => navigate('/browse')}
        />
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-[10px] sm:gap-3">
          {favorites.map((item) => (
            <div
              key={item.animeId}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/anime/${item.animeSlug}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(`/anime/${item.animeSlug}`);
                }
              }}
              className="group relative cursor-pointer flex flex-col select-none min-w-0"
            >
              <div className="relative aspect-[2/3] bg-[#0B1324] rounded-xl overflow-hidden border border-white/10 group-hover:border-[#1E88FF]/50 transition-colors">
                <img
                  src={item.animePoster || FALLBACK_POSTER}
                  alt={item.animeTitle}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (target.src !== FALLBACK_POSTER) target.src = FALLBACK_POSTER;
                  }}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(item.animeId, item.animeTitle);
                  }}
                  className="absolute top-2 right-2 z-10 w-8 h-8 bg-black/70 hover:bg-rose-600 text-rose-400 hover:text-white rounded-full flex items-center justify-center transition-colors cursor-pointer border border-white/10"
                  aria-label={`Remove ${item.animeTitle} from favorites`}
                >
                  <Heart className="w-3.5 h-3.5 fill-current" />
                </button>

                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <div className="w-9 h-9 rounded-full bg-[#1E88FF] text-white flex items-center justify-center shadow-lg">
                    <Play className="w-4 h-4 fill-white ml-0.5" />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-0.5 min-w-0">
                <h4 className="font-semibold text-xs text-white group-hover:text-[#1E88FF] transition-colors truncate leading-tight">
                  {item.animeTitle}
                </h4>

                {item.genres && item.genres.length > 0 && (
                  <p className="text-[11px] text-[#94A3B8] truncate">
                    {item.genres.slice(0, 2).join(' • ')}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
