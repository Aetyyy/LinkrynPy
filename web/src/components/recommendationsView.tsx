import React from 'react';
import { Play, Heart, Sparkles } from 'lucide-react';
import { Track } from '../types/music';

interface RecommendationsViewProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  recommendations: Track[];
  loading: boolean;
  onPlaySong: (track: Track) => void;
  onContextMenu: (e: React.MouseEvent, track: Track) => void;
  onToggleLike: (track: Track) => void;
  isSongLiked: (url: string) => boolean;
}

export const RecommendationsView: React.FC<RecommendationsViewProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  recommendations,
  loading,
  onPlaySong,
  onContextMenu,
  onToggleLike,
  isSongLiked,
}) => {
  return (
    <section className="animate-fade-in">
      {/* Category Pills Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-5 scrollbar-none">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-[12.5px] cursor-pointer whitespace-nowrap transition-all font-medium ${
                isActive
                  ? 'border border-blue-500 bg-blue-500/15 text-blue-300 font-semibold'
                  : 'border border-slate-700/40 bg-[#131E30] text-slate-300 hover:bg-[#1A263B] hover:text-slate-100'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Grid of Recommendations */}
      {loading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-[#131E30] rounded-xl p-3.5 border border-slate-700/30 animate-pulse"
            >
              <div className="w-full aspect-square rounded-lg bg-slate-800/80 mb-3" />
              <div className="h-3.5 rounded-sm bg-slate-800/80 w-4/5 mb-2" />
              <div className="h-3 rounded-sm bg-slate-800/80 w-1/2" />
            </div>
          ))}
        </div>
      ) : recommendations.length === 0 ? (
        <div className="py-12 px-6 text-center bg-[#131E30] rounded-xl border border-slate-700/30">
          <Sparkles size={32} className="text-blue-500 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-200 mb-1">
            Belum ada rekomendasi
          </h3>
          <p className="text-[13px] text-slate-400">
            Ganti kategori atau lakukan pencarian lagu untuk memulai.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4.5">
          {recommendations.map((track, idx) => {
            const liked = isSongLiked(track.url);
            return (
              <div
                key={track.url || idx}
                onContextMenu={(e) => onContextMenu(e, track)}
                onClick={() => onPlaySong(track)}
                className="group bg-[#131E30] hover:bg-[#1A263B] p-3.5 rounded-xl border border-slate-700/30 flex flex-col cursor-pointer relative transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/30"
              >
                {/* 1:1 Aspect Ratio Artwork */}
                <div className="relative w-full aspect-square mb-3">
                  <img
                    src={track.thumbnail || 'https://via.placeholder.com/180'}
                    alt={track.title}
                    className="w-full h-full rounded-lg object-cover"
                  />

                  {/* Discreet Like Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleLike(track);
                    }}
                    title={liked ? 'Hapus dari disukai' : 'Sukai lagu ini'}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-slate-950/70 border border-slate-700/40 text-white flex items-center justify-center cursor-pointer backdrop-blur-xs hover:scale-110 transition-transform"
                  >
                    <Heart
                      size={14}
                      className={liked ? 'text-blue-400 fill-blue-400' : 'text-slate-200'}
                    />
                  </button>

                  {/* Play Button Overlay on Card */}
                  <div className="absolute bottom-2.5 right-2.5 w-9.5 h-9.5 rounded-full bg-blue-600 hover:bg-blue-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-md shadow-black/50">
                    <Play size={16} className="text-white fill-white ml-0.5" />
                  </div>
                </div>

                {/* Track Information */}
                <div className="min-w-0 flex-1 flex flex-col">
                  <p className="text-[13.5px] font-semibold text-slate-100 truncate" title={track.title}>
                    {track.title}
                  </p>
                  <p
                    className="text-xs text-slate-400 truncate mt-0.5 mb-1.5"
                    title={track.uploader || track.artist || 'Artis'}
                  >
                    {track.uploader || track.artist || 'Artis'}
                  </p>

                  <div className="mt-auto flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400">
                      {track.duration_str || '--:--'}
                    </span>
                    <span className="text-[10.5px] text-blue-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                      Putar ➔
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
