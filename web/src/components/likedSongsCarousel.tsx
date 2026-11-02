import React, { useRef } from 'react';
import { Heart, Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { Track } from '../types/music';

interface LikedSongsCarouselProps {
  likedSongs: Track[];
  onPlaySong: (track: Track) => void;
  onContextMenu: (e: React.MouseEvent, track: Track) => void;
  onToggleLike: (track: Track) => void;
  onViewAll: () => void;
}

export const LikedSongsCarousel: React.FC<LikedSongsCarouselProps> = ({
  likedSongs,
  onPlaySong,
  onContextMenu,
  onToggleLike,
  onViewAll,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!likedSongs || likedSongs.length === 0) {
    return null;
  }

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const offset = direction === 'left' ? -360 : 360;
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <section className="mb-8">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Heart size={18} className="text-blue-500 fill-blue-500" />
          <h2 className="text-lg font-bold tracking-tight text-slate-100">
            Lagu yang Disukai
          </h2>
          <span className="text-xs text-slate-400 font-medium">
            ({likedSongs.length})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => scroll('left')}
            title="Gulir ke kiri"
            className="w-7 h-7 rounded-full bg-[#131E30] hover:bg-[#1A263B] border border-slate-700/40 text-slate-300 hover:text-slate-100 flex items-center justify-center cursor-pointer transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => scroll('right')}
            title="Gulir ke kanan"
            className="w-7 h-7 rounded-full bg-[#131E30] hover:bg-[#1A263B] border border-slate-700/40 text-slate-300 hover:text-slate-100 flex items-center justify-center cursor-pointer transition-colors"
          >
            <ChevronRight size={16} />
          </button>
          <button
            onClick={onViewAll}
            className="text-blue-400 hover:text-blue-300 text-[12.5px] font-semibold cursor-pointer ml-1 transition-colors"
          >
            Lihat Semua →
          </button>
        </div>
      </div>

      {/* Horizontal Carousel */}
      <div
        ref={scrollRef}
        className="grid grid-flow-col auto-cols-[168px] gap-3.5 overflow-x-auto items-stretch pb-2 scrollbar-none"
      >
        {likedSongs.map((track, idx) => (
          <div
            key={track.url || idx}
            onContextMenu={(e) => onContextMenu(e, track)}
            onClick={() => onPlaySong(track)}
            className="group bg-[#131E30] hover:bg-[#1A263B] p-3 rounded-xl flex flex-col cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/30 border border-slate-700/30 relative"
          >
            {/* Artwork Container */}
            <div className="relative w-full aspect-square mb-2.5">
              <img
                src={track.thumbnail || 'https://via.placeholder.com/150'}
                alt={track.title}
                className="w-full h-full rounded-lg object-cover"
              />

              {/* Discreet Favorite Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLike(track);
                }}
                title="Hapus dari disukai"
                className="absolute top-1.5 right-1.5 w-6.5 h-6.5 rounded-full bg-slate-950/75 border border-slate-700/40 text-blue-400 flex items-center justify-center cursor-pointer backdrop-blur-xs hover:scale-110 transition-transform"
              >
                <Heart size={14} className="fill-blue-400 text-blue-400" />
              </button>

              {/* Play Button Overlay on Hover */}
              <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-md shadow-black/50">
                <Play size={15} className="text-white fill-white ml-0.5" />
              </div>
            </div>

            {/* Metadata */}
            <div className="min-w-0 flex-1 flex flex-col">
              <p className="text-[13px] font-semibold text-slate-100 truncate" title={track.title}>
                {track.title}
              </p>
              <p
                className="text-[11.5px] text-slate-400 truncate mt-0.5"
                title={track.uploader || track.artist || 'Artis'}
              >
                {track.uploader || track.artist || 'Artis'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
