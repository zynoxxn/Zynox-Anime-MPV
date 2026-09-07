import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import type { FavoriteItem } from '../types/library';
import { getFavorites, removeFavorite } from '../lib/firestore/user-activity';
import { Heart, Trash2, Play, Film } from 'lucide-react';

interface FavoritesViewProps {
  navigate: (path: string) => void;
  onShowMessage?: (msg: string) => void;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({ navigate, onShowMessage }) => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      const items = await getFavorites(user?.uid || null);
      setFavorites(items);
    } catch (err) {
      console.error('Favorites fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, [user?.uid]);

  const handleRemove = async (animeId: string, title: string) => {
    await removeFavorite(user?.uid || null, animeId);
    setFavorites((prev) => prev.filter((f) => f.animeId !== animeId));
    onShowMessage?.(`Removed "${title}" from favorites.`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-6">
        <div>
          <h1 className="text-2xl sm:text-4xl font-black text-[#F5F9FF] flex items-center gap-3 tracking-tight">
            <Heart className="w-7 h-7 text-rose-500 fill-rose-500" />
            <span>Favorite Anime</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#A9B8CC] mt-1">
            Your personal collection of top rated and loved anime titles
          </p>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-24 text-center text-xs text-[#A9B8CC]">Loading favorites...</div>
      ) : favorites.length === 0 ? (
        <div className="text-center py-20 bg-[#0A1628] border border-[#00A8FF]/20 rounded-3xl p-8 max-w-md mx-auto space-y-4 shadow-xl">
          <Heart className="w-12 h-12 mx-auto text-[#6E7F95]" />
          <h3 className="text-lg font-bold text-[#F5F9FF]">No favorites yet</h3>
          <p className="text-xs text-[#A9B8CC] leading-relaxed">
            Click the heart icon on any anime card or detail page to add it to your favorite collection.
          </p>
          <button
            type="button"
            onClick={() => navigate('/browse')}
            className="px-5 py-2.5 bg-[#0066FF] hover:bg-[#0052cc] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-[#0066FF]/30"
          >
            Browse Anime
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-3">
          {favorites.map((item) => (
            <div
              key={item.animeId}
              onClick={() => navigate(`/anime/${item.animeSlug}`)}
              className="group relative cursor-pointer flex flex-col transition-transform duration-200 hover:-translate-y-1 select-none"
            >
              <div className="relative aspect-[2/3] bg-[#081426] rounded-lg sm:rounded-xl overflow-hidden border border-white/5 group-hover:border-[#1683FF]/40 transition-colors shadow-sm">
                {item.animePoster ? (
                  <img
                    src={item.animePoster}
                    alt={item.animeTitle}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <Film className="w-8 h-8 m-auto mt-14 text-[#6E7F95]" />
                )}

                <div className="absolute top-1.5 right-1.5 z-10">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(item.animeId, item.animeTitle);
                    }}
                    className="p-1 bg-rose-500 text-white rounded-md shadow-md transition-transform hover:scale-110"
                    title="Remove from favorites"
                  >
                    <Heart className="w-2.5 h-2.5 fill-white" />
                  </button>
                </div>

                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <div className="w-7 h-7 rounded-full bg-[#1683FF] text-white flex items-center justify-center shadow-lg">
                    <Play className="w-3 h-3 fill-white ml-0.5" />
                  </div>
                </div>
              </div>

              <div className="pt-1.5 flex flex-col gap-0.5">
                <h4 className="font-bold text-[11px] sm:text-xs text-white group-hover:text-[#00CFFF] transition-colors truncate leading-tight">
                  {item.animeTitle}
                </h4>

                {item.genres && (
                  <p className="text-[10px] text-[#94A3B8] truncate">
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
