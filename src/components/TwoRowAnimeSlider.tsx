import React, { useRef, useState, useEffect } from 'react';
import type { Anime } from '../types/anime';
import { AnimeCard } from './AnimeCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TwoRowAnimeSliderProps {
  title: string;
  icon?: React.ReactNode;
  animes: Anime[];
  navigate: (path: string) => void;
  onShowMessage?: (msg: string) => void;
  viewAllPath?: string;
  showRankingBadge?: boolean;
}

export const TwoRowAnimeSlider: React.FC<TwoRowAnimeSliderProps> = ({
  title,
  icon,
  animes,
  navigate,
  onShowMessage,
  viewAllPath,
  showRankingBadge = false,
}) => {
  const row1Ref = useRef<HTMLDivElement>(null);
  const row2Ref = useRef<HTMLDivElement>(null);

  // Mouse Drag state for Row 1
  const [isDraggingR1, setIsDraggingR1] = useState(false);
  const [startX1, setStartX1] = useState(0);
  const [scrollLeft1, setScrollLeft1] = useState(0);

  // Mouse Drag state for Row 2
  const [isDraggingR2, setIsDraggingR2] = useState(false);
  const [startX2, setStartX2] = useState(0);
  const [scrollLeft2, setScrollLeft2] = useState(0);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDraggingR1(false);
      setIsDraggingR2(false);
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  if (!animes || animes.length === 0) return null;

  // Split into 2 independent rows (alternating items so ranking/order stays natural)
  const row1Items = animes
    .map((anime, origIndex) => ({ anime, origIndex }))
    .filter((_, i) => i % 2 === 0);

  const row2Items = animes
    .map((anime, origIndex) => ({ anime, origIndex }))
    .filter((_, i) => i % 2 !== 0);

  const scrollRow = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = direction === 'left' ? -340 : 340;
      ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Row 1 Drag Handlers
  const handleMouseDownR1 = (e: React.MouseEvent) => {
    if (!row1Ref.current) return;
    setIsDraggingR1(true);
    setStartX1(e.pageX - row1Ref.current.offsetLeft);
    setScrollLeft1(row1Ref.current.scrollLeft);
  };

  const handleMouseMoveR1 = (e: React.MouseEvent) => {
    if (!isDraggingR1 || !row1Ref.current) return;
    const x = e.pageX - row1Ref.current.offsetLeft;
    const walk = (x - startX1) * 1.5;
    if (Math.abs(walk) > 4) {
      row1Ref.current.scrollLeft = scrollLeft1 - walk;
    }
  };

  const handleMouseUpOrLeaveR1 = () => {
    setIsDraggingR1(false);
  };

  // Row 2 Drag Handlers
  const handleMouseDownR2 = (e: React.MouseEvent) => {
    if (!row2Ref.current) return;
    setIsDraggingR2(true);
    setStartX2(e.pageX - row2Ref.current.offsetLeft);
    setScrollLeft2(row2Ref.current.scrollLeft);
  };

  const handleMouseMoveR2 = (e: React.MouseEvent) => {
    if (!isDraggingR2 || !row2Ref.current) return;
    const x = e.pageX - row2Ref.current.offsetLeft;
    const walk = (x - startX2) * 1.5;
    if (Math.abs(walk) > 4) {
      row2Ref.current.scrollLeft = scrollLeft2 - walk;
    }
  };

  const handleMouseUpOrLeaveR2 = () => {
    setIsDraggingR2(false);
  };

  return (
    <section className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-base sm:text-lg font-black text-[#F5F9FF] tracking-tight">{title}</h2>
        </div>

        {viewAllPath && (
          <button
            type="button"
            onClick={() => navigate(viewAllPath)}
            className="text-xs font-bold text-[#00A8FF] hover:text-[#00D9FF] flex items-center gap-0.5 transition-colors"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 2 Independent Scrolling Rows */}
      <div className="space-y-2.5 sm:space-y-3.5 select-none">
        {/* ROW 1 */}
        <div className="relative group/row1">
          {/* Desktop Left Button */}
          <button
            type="button"
            onClick={() => scrollRow(row1Ref, 'left')}
            className="hidden md:flex absolute left-1 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/70 hover:bg-[#00A8FF] text-white hover:text-black border border-white/10 items-center justify-center transition-all opacity-0 group-hover/row1:opacity-100 shadow-xl backdrop-blur-sm"
            title="Slide Row 1 Left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Row 1 Scroll Track */}
          <div
            ref={row1Ref}
            onMouseDown={handleMouseDownR1}
            onMouseMove={handleMouseMoveR1}
            onMouseUp={handleMouseUpOrLeaveR1}
            onMouseLeave={handleMouseUpOrLeaveR1}
            style={{ touchAction: 'pan-y' }}
            className={`flex items-center gap-2.5 sm:gap-3.5 overflow-x-auto no-scrollbar scroll-smooth pb-1 cursor-grab active:cursor-grabbing ${
              isDraggingR1 ? 'scroll-auto' : ''
            }`}
          >
            {row1Items.map(({ anime, origIndex }) => (
              <div
                key={`slider-r1-${anime.id || anime.slug}-${origIndex}`}
                className="w-[105px] sm:w-[125px] md:w-[140px] lg:w-[155px] shrink-0 pointer-events-auto"
              >
                <AnimeCard
                  anime={anime}
                  showRankingBadge={showRankingBadge ? origIndex + 1 : undefined}
                  navigate={navigate}
                  onShowMessage={onShowMessage}
                />
              </div>
            ))}
          </div>

          {/* Desktop Right Button */}
          <button
            type="button"
            onClick={() => scrollRow(row1Ref, 'right')}
            className="hidden md:flex absolute right-1 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/70 hover:bg-[#00A8FF] text-white hover:text-black border border-white/10 items-center justify-center transition-all opacity-0 group-hover/row1:opacity-100 shadow-xl backdrop-blur-sm"
            title="Slide Row 1 Right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* ROW 2 (Independent) */}
        {row2Items.length > 0 && (
          <div className="relative group/row2">
            {/* Desktop Left Button */}
            <button
              type="button"
              onClick={() => scrollRow(row2Ref, 'left')}
              className="hidden md:flex absolute left-1 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/70 hover:bg-[#00A8FF] text-white hover:text-black border border-white/10 items-center justify-center transition-all opacity-0 group-hover/row2:opacity-100 shadow-xl backdrop-blur-sm"
              title="Slide Row 2 Left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Row 2 Scroll Track */}
            <div
              ref={row2Ref}
              onMouseDown={handleMouseDownR2}
              onMouseMove={handleMouseMoveR2}
              onMouseUp={handleMouseUpOrLeaveR2}
              onMouseLeave={handleMouseUpOrLeaveR2}
              style={{ touchAction: 'pan-y' }}
              className={`flex items-center gap-2.5 sm:gap-3.5 overflow-x-auto no-scrollbar scroll-smooth pb-1 cursor-grab active:cursor-grabbing ${
                isDraggingR2 ? 'scroll-auto' : ''
              }`}
            >
              {row2Items.map(({ anime, origIndex }) => (
                <div
                  key={`slider-r2-${anime.id || anime.slug}-${origIndex}`}
                  className="w-[105px] sm:w-[125px] md:w-[140px] lg:w-[155px] shrink-0 pointer-events-auto"
                >
                  <AnimeCard
                    anime={anime}
                    showRankingBadge={showRankingBadge ? origIndex + 1 : undefined}
                    navigate={navigate}
                    onShowMessage={onShowMessage}
                  />
                </div>
              ))}
            </div>

            {/* Desktop Right Button */}
            <button
              type="button"
              onClick={() => scrollRow(row2Ref, 'right')}
              className="hidden md:flex absolute right-1 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/70 hover:bg-[#00A8FF] text-white hover:text-black border border-white/10 items-center justify-center transition-all opacity-0 group-hover/row2:opacity-100 shadow-xl backdrop-blur-sm"
              title="Slide Row 2 Right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
