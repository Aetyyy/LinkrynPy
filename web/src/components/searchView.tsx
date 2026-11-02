import React from 'react';
import { Search, Heart, FolderPlus, Clock } from 'lucide-react';
import { Track } from '../types/music';

interface SearchViewProps {
  currentSearchQuery: string;
  searchResults: Track[];
  loadingSearch: boolean;
  onPlaySong: (track: Track) => void;
  onContextMenu: (e: React.MouseEvent, track: Track) => void;
  onToggleLike: (track: Track) => void;
  isSongLiked: (url: string) => boolean;
  onOpenAddToPlaylist: (track: Track) => void;
}

export const SearchView: React.FC<SearchViewProps> = ({
  currentSearchQuery,
  searchResults,
  loadingSearch,
  onPlaySong,
  onContextMenu,
  onToggleLike,
  isSongLiked,
  onOpenAddToPlaylist,
}) => {
  return (
    <div className="max-w-[1100px] mx-auto animate-fade-in">
      <div className="flex items-center gap-2.5 mb-6">
        <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
          <Search size={20} className="text-blue-500" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-100">
            Hasil Pencarian: &ldquo;{currentSearchQuery}&rdquo;
          </h1>
          <p className="text-[13px] text-slate-400 mt-0.5">
            Menampilkan {searchResults.length} hasil yang ditemukan.
          </p>
        </div>
      </div>

      {loadingSearch ? (
        <div className="py-16 px-5 text-center bg-[#131E30] rounded-xl border border-slate-700/30">
          <Search size={36} className="text-blue-500 mx-auto mb-3 animate-spin-slow" />
          <p className="text-sm text-slate-300">Mencari trek di database & YouTube...</p>
        </div>
      ) : searchResults.length === 0 ? (
        <div className="py-16 px-5 text-center bg-[#131E30] rounded-xl border border-slate-700/30">
          <Search size={40} className="text-slate-500 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-200 mb-1">
            Tidak ditemukan lagu untuk &ldquo;{currentSearchQuery}&rdquo;
          </h3>
          <p className="text-[13px] text-slate-400">
            Coba kata kunci lain atau masukkan link YouTube/Spotify langsung.
          </p>
        </div>
      ) : (
        <div className="bg-[#131E30] rounded-xl border border-slate-700/30 overflow-hidden">
          <div className="grid grid-cols-[40px_1fr_140px_100px] px-4.5 py-3 border-b border-slate-700/30 text-[11px] uppercase font-bold text-slate-400 tracking-wider">
            <span>#</span>
            <span>Judul & Artis</span>
            <span className="text-right flex items-center justify-end gap-1">
              <Clock size={12} /> Durasi
            </span>
            <span className="text-right">Aksi</span>
          </div>

          {searchResults.map((track, idx) => {
            const liked = isSongLiked(track.url);
            return (
              <div
                key={track.url || idx}
                onContextMenu={(e) => onContextMenu(e, track)}
                className={`grid grid-cols-[40px_1fr_140px_100px] items-center px-4.5 py-2.5 cursor-pointer transition-colors hover:bg-[#1A263B] ${
                  idx < searchResults.length - 1 ? 'border-b border-slate-700/20' : ''
                }`}
              >
                <span className="text-xs text-slate-400 font-medium">
                  {idx + 1}
                </span>

                <div
                  onClick={() => onPlaySong(track)}
                  className="flex items-center gap-3 min-w-0 pr-3"
                >
                  <img
                    src={track.thumbnail || 'https://via.placeholder.com/40'}
                    alt=""
                    className="w-10 h-10 rounded-md object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold text-slate-100 truncate" title={track.title}>
                      {track.title}
                    </p>
                    <p className="text-xs text-slate-400 truncate mt-0.5" title={track.uploader || track.artist || 'Artis'}>
                      {track.uploader || track.artist || 'Artis'}
                    </p>
                  </div>
                </div>

                <span className="text-[12.5px] text-slate-400 text-right">
                  {track.duration_str || '--:--'}
                </span>

                <div className="flex items-center justify-end gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenAddToPlaylist(track);
                    }}
                    title="Tambah ke Playlist"
                    className="text-slate-400 hover:text-slate-200 p-1.5 rounded-md hover:bg-slate-800 transition-colors"
                  >
                    <FolderPlus size={16} />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleLike(track);
                    }}
                    title={liked ? 'Hapus dari Disukai' : 'Sukai Lagu'}
                    className="p-1.5 rounded-md hover:bg-slate-800 transition-colors"
                  >
                    <Heart
                      size={16}
                      className={liked ? 'text-blue-500 fill-blue-500' : 'text-slate-400 hover:text-slate-200'}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
