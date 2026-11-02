import React from 'react';
import { Heart, Play, Trash2, FolderPlus, Clock } from 'lucide-react';
import { Track } from '../types/music';

interface LikedSongsViewProps {
  likedSongs: Track[];
  onPlaySong: (track: Track) => void;
  onRemoveLiked: (url: string) => void;
  onContextMenu: (e: React.MouseEvent, track: Track) => void;
  onOpenAddToPlaylist: (track: Track) => void;
}

export const LikedSongsView: React.FC<LikedSongsViewProps> = ({
  likedSongs,
  onPlaySong,
  onRemoveLiked,
  onContextMenu,
  onOpenAddToPlaylist,
}) => {
  return (
    <div className="max-w-[1100px] mx-auto animate-fade-in">
      {/* View Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
              <Heart size={20} className="text-blue-500 fill-blue-500" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-100">
              Lagu yang Disukai
            </h1>
          </div>
          <p className="text-[13px] text-slate-400 mt-1">
            Koleksi {likedSongs.length} lagu favorit yang telah Anda simpan.
          </p>
        </div>

        {likedSongs.length > 0 && (
          <button
            onClick={() => onPlaySong(likedSongs[0])}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-semibold cursor-pointer shadow-lg shadow-blue-600/25 transition-all"
          >
            <Play size={15} className="fill-white" />
            <span>Putar Semua</span>
          </button>
        )}
      </div>

      {likedSongs.length === 0 ? (
        <div className="py-16 px-5 text-center bg-[#131E30] rounded-xl border border-slate-700/30">
          <Heart size={40} className="text-slate-500 mx-auto mb-3.5" />
          <h3 className="text-base font-semibold text-slate-200 mb-1.5">
            Belum ada lagu yang disukai
          </h3>
          <p className="text-[13px] text-slate-400">
            Klik ikon hati pada lagu apa pun untuk menyimpannya ke koleksi ini.
          </p>
        </div>
      ) : (
        <div className="bg-[#131E30] rounded-xl border border-slate-700/30 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[40px_1fr_140px_100px] px-4.5 py-3 border-b border-slate-700/30 text-[11px] uppercase font-bold text-slate-400 tracking-wider">
            <span>#</span>
            <span>Judul & Artis</span>
            <span className="text-right flex items-center justify-end gap-1">
              <Clock size={12} /> Durasi
            </span>
            <span className="text-right">Aksi</span>
          </div>

          {/* Song Rows */}
          {likedSongs.map((track, index) => (
            <div
              key={track.url || index}
              onContextMenu={(e) => onContextMenu(e, track)}
              className={`grid grid-cols-[40px_1fr_140px_100px] items-center px-4.5 py-2.5 transition-colors cursor-pointer hover:bg-[#1A263B] ${
                index < likedSongs.length - 1 ? 'border-b border-slate-700/20' : ''
              }`}
            >
              <span className="text-[12.5px] text-slate-400 font-medium">
                {index + 1}
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

              <div className="flex items-center justify-end gap-2">
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
                    onRemoveLiked(track.url);
                  }}
                  title="Hapus dari Disukai"
                  className="text-slate-400 hover:text-red-400 p-1.5 rounded-md hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
