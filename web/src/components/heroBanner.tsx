import React from 'react';
import { 
  Heart, 
  FolderPlus, 
  ExternalLink, 
  Radio, 
  Headphones,
  Sparkles
} from 'lucide-react';
import type { CurrentTrack, Track } from '../types/musicTypes';

interface HeroBannerProps {
  currentSong: CurrentTrack | null | undefined;
  isLiked: boolean;
  onToggleLike: () => void;
  onOpenAddToPlaylist: (track: Track) => void;
  onContextMenu: (e: React.MouseEvent, track: Track) => void;
  voiceChannelName?: string | null;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  currentSong,
  isLiked,
  onToggleLike,
  onOpenAddToPlaylist,
  onContextMenu,
  voiceChannelName,
}) => {
  if (currentSong) {
    return (
      <div
        onContextMenu={(e) => onContextMenu(e, currentSong)}
        className="relative rounded-2xl overflow-hidden bg-[#111B2D] border border-slate-700/30 p-6 sm:p-7 flex flex-col sm:flex-row items-center gap-6 mb-8 shadow-xl"
      >
        {/* Subtle Ambient Background Glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#3978F6]/10 via-[#111B2D]/95 to-[#111B2D] pointer-events-none" />

        {/* Artwork */}
        <div className="relative w-32 h-32 shrink-0 rounded-xl overflow-hidden shadow-2xl">
          <img
            src={currentSong.thumbnail || 'https://via.placeholder.com/130'}
            alt={currentSong.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Content Details */}
        <div className="relative flex-1 min-w-0 flex flex-col gap-1.5 w-full">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-[#3978F6]/15 border border-[#3978F6]/30 text-[#8BB4FF] text-[11px] font-bold tracking-wider uppercase">
              <Headphones size={12} className="text-[#3978F6]" />
              <span>Sedang Diputar {voiceChannelName ? `di #${voiceChannelName}` : 'di Discord'}</span>
            </div>

            <button
              type="button"
              onClick={onToggleLike}
              title={isLiked ? 'Hapus dari disukai' : 'Sukai lagu ini'}
              className={`p-1.5 cursor-pointer transition-colors ${
                isLiked ? 'text-[#3978F6]' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Heart size={22} fill={isLiked ? '#3978F6' : 'none'} />
            </button>
          </div>

          <h2
            className="text-2xl font-bold tracking-tight text-slate-100 truncate m-0 mt-0.5"
            title={currentSong.title}
          >
            {currentSong.title}
          </h2>

          <p className="text-[13.5px] text-slate-300 m-0 truncate">
            {currentSong.uploader || currentSong.artist || 'Artis'}
            {currentSong.requester && (
              <span className="text-slate-400">
                {' '}• Diminta oleh <strong className="text-slate-100">{currentSong.requester}</strong>
              </span>
            )}
          </p>

          {/* Action Links */}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {currentSong.url && (
              <a
                href={currentSong.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8BB4FF] hover:text-[#528CFF] no-underline transition-colors"
              >
                <span>Buka Sumber</span>
                <ExternalLink size={12} />
              </a>
            )}

            <button
              type="button"
              onClick={() => onOpenAddToPlaylist(currentSong)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-100 bg-white/10 hover:bg-white/15 border border-slate-700/30 py-1.5 px-3 rounded-lg cursor-pointer transition-colors"
            >
              <FolderPlus size={14} className="text-[#3978F6]" />
              <span>Simpan ke Playlist</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Fallback Welcome / Discovery Hero
  return (
    <div className="relative rounded-2xl overflow-hidden bg-[#111B2D] border border-slate-700/30 p-7 sm:p-8 mb-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
      <div className="absolute inset-0 bg-gradient-to-br from-[#3978F6]/15 via-transparent to-transparent pointer-events-none" />
      <div className="relative z-1 max-w-[540px]">
        <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#8BB4FF] mb-2">
          <Sparkles size={13} className="text-[#3978F6]" />
          <span>Pengalaman Audio Premium</span>
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-100 mb-2">
          Jelajahi Musik & Rekomendasi
        </h2>
        <p className="text-[13.5px] text-slate-300 leading-relaxed m-0">
          Pilih dari koleksi lagu populer di bawah atau cari trek apa saja untuk langsung diputar ke voice channel server Discord Anda secara real-time.
        </p>
      </div>

      <div className="relative z-1 flex items-center gap-2.5 shrink-0">
        <div className="py-3 px-4.5 rounded-xl bg-[#152238] border border-slate-700/30 text-center shadow-sm">
          <Radio size={20} className="text-[#3978F6] mx-auto mb-1" />
          <p className="text-[11px] text-slate-400 m-0">Status Bot</p>
          <p className="text-[13px] font-bold text-emerald-400 m-0">Siap Memutar</p>
        </div>
      </div>
    </div>
  );
};
