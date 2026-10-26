import React from 'react';
import type { Anime } from '../types/anime';
import { AnimeCard } from './AnimeCard';
import { AnimeGridSkeleton } from './SkeletonLoader';

export interface AnimeGridProps {
  animes: Anime[];
  loading?: boolean;
  skeletonCount?: number;
  navigate: (path: string) => void;
  onShowMessage?: (msg: string) => void;
  columns?: 'home' | 'browse' | 'default';
  className?: string;
  emptyState?: React.ReactNode;
  id?: string;
}

/**
 * Standardized Anime Grid Component
 * Features seamless skeleton loading animations during initial fetches and filter transitions.
 */
export const AnimeGrid: React.FC<AnimeGridProps> = ({
  animes,
  loading = false,
  skeletonCount,
  navigate,
  onShowMessage,
  columns = 'default',
  className = '',
  emptyState,
  id,
}) => {
  const defaultCount = columns === 'home' ? 14 : 12;
  const count = skeletonCount ?? defaultCount;

  const gridColsClass =
    className ||
    (columns === 'home'
      ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5'
      : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5');

  if (loading) {
    return (
      <div id={id ? `${id}-loading` : undefined} className="w-full transition-opacity duration-200">
        <AnimeGridSkeleton count={count} columns={columns} className={gridColsClass} />
      </div>
    );
  }

  if (animes.length === 0) {
    if (emptyState) {
      return <div id={id ? `${id}-empty` : undefined}>{emptyState}</div>;
    }
    return null;
  }

  return (
    <div id={id} className={`${gridColsClass} transition-opacity duration-200`}>
      {animes.map((anime, idx) => (
        <AnimeCard
          key={anime.id || anime.slug || `anime-card-${idx}`}
          anime={anime}
          navigate={navigate}
          onShowMessage={onShowMessage}
        />
      ))}
    </div>
  );
};
