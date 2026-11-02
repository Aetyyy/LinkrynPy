import React from 'react';
import { Folder, Plus, Play, Trash2, ArrowLeft, Music, Clock } from 'lucide-react';
import { Playlist, Track } from '../types/music';

interface PlaylistsViewProps {
  playlists: Playlist[];
  selectedPlaylist: Playlist | null;
  playlistSongs: Track[];
  onSelectPlaylist: (pl: Playlist) => void;
  onBackToPlaylists: () => void;
  onOpenCreateModal: () => void;
  onPlayPlaylist: (playlistId: string) => void;
  onDeletePlaylist: (playlistId: string) => void;
  onPlaySong: (track: Track) => void;
  onRemoveSongFromPlaylist: (playlistId: string, songId: string | number) => void;
  onContextMenu: (e: React.MouseEvent, track: Track) => void;
}

export const PlaylistsView: React.FC<PlaylistsViewProps> = ({
  playlists,
  selectedPlaylist,
  playlistSongs,
  onSelectPlaylist,
  onBackToPlaylists,
  onOpenCreateModal,
  onPlayPlaylist,
  onDeletePlaylist,
  onPlaySong,
  onRemoveSongFromPlaylist,
  onContextMenu,
}) => {
  // If a playlist is selected, show detail view
  if (selectedPlaylist) {
    return (
      <div className="max-w-[1100px] mx-auto animate-fade-in">
        {/* Back and Header */}
        <button
          onClick={onBackToPlaylists}
          className="inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-100 text-[13px] font-semibold cursor-pointer mb-4 py-1 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Kembali ke Koleksi Playlist</span>
        </button>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-[#1A263B] border border-slate-700/40 flex items-center justify-center shadow-md">
              <Folder size={32} className="text-blue-500" />
            </div>
            <div>
              <span className="text-[11px] uppercase text-slate-400 font-bold tracking-wider">
                Playlist Kustom
              </span>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-100 mt-0.5">
                {selectedPlaylist.name}
              </h1>
              <p className="text-[12.5px] text-slate-400 mt-0.5">
                {playlistSongs.length} lagu tersimpan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {playlistSongs.length > 0 && (
              <button
                onClick={() => onPlayPlaylist(selectedPlaylist.id)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-semibold cursor-pointer shadow-lg shadow-blue-600/25 transition-all"
              >
                <Play size={15} className="fill-white" />
                <span>Putar Playlist</span>
              </button>
            )}

            <button
              onClick={() => onDeletePlaylist(selectedPlaylist.id)}
              title="Hapus Playlist"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-[12.5px] font-semibold cursor-pointer transition-colors"
            >
              <Trash2 size={15} />
              <span>Hapus</span>
            </button>
          </div>
        </div>

        {/* Songs List */}
        {playlistSongs.length === 0 ? (
          <div className="py-16 px-5 text-center bg-[#131E30] rounded-xl border border-slate-700/30">
            <Music size={36} className="text-slate-500 mx-auto mb-3" />
            <h3 className="text-[15px] font-semibold text-slate-200 mb-1">
              Playlist ini masih kosong
            </h3>
            <p className="text-[12.5px] text-slate-400">
              Tambahkan lagu ke playlist ini dari menu rekomendasi atau hasil pencarian.
            </p>
          </div>
        ) : (
          <div className="bg-[#131E30] rounded-xl border border-slate-700/30 overflow-hidden">
            <div className="grid grid-cols-[40px_1fr_140px_80px] px-4.5 py-3 border-b border-slate-700/30 text-[11px] uppercase font-bold text-slate-400 tracking-wider">
              <span>#</span>
              <span>Judul & Artis</span>
              <span className="text-right flex items-center justify-end gap-1">
                <Clock size={12} /> Durasi
              </span>
              <span className="text-right">Aksi</span>
            </div>

            {playlistSongs.map((track, idx) => (
              <div
                key={track.id || track.url || idx}
                onContextMenu={(e) => onContextMenu(e, track)}
                className={`grid grid-cols-[40px_1fr_140px_80px] items-center px-4.5 py-2.5 cursor-pointer transition-colors hover:bg-[#1A263B] ${
                  idx < playlistSongs.length - 1 ? 'border-b border-slate-700/20' : ''
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

                <div className="flex items-center justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (track.id) onRemoveSongFromPlaylist(selectedPlaylist.id, track.id);
                    }}
                    title="Hapus dari playlist"
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
  }

  // Playlist Grid View
  return (
    <div className="max-w-[1100px] mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
              <Folder size={20} className="text-blue-500" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-100">
              Koleksi Playlist
            </h1>
          </div>
          <p className="text-[13px] text-slate-400 mt-1">
            Kelola daftar putar musik kustom Anda untuk server Discord.
          </p>
        </div>

        <button
          onClick={onOpenCreateModal}
          className="flex items-center gap-2 px-4.5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-semibold cursor-pointer shadow-lg shadow-blue-600/25 transition-all"
        >
          <Plus size={16} />
          <span>Buat Playlist Baru</span>
        </button>
      </div>

      {playlists.length === 0 ? (
        <div className="py-16 px-5 text-center bg-[#131E30] rounded-xl border border-slate-700/30">
          <Folder size={44} className="text-slate-500 mx-auto mb-3.5" />
          <h3 className="text-base font-semibold text-slate-200 mb-1.5">
            Belum ada playlist
          </h3>
          <p className="text-[13px] text-slate-400 mb-4">
            Buat playlist pertama Anda untuk mengelompokkan lagu favorit.
          </p>
          <button
            onClick={onOpenCreateModal}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-semibold cursor-pointer transition-colors"
          >
            Buat Sekarang
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4.5">
          {playlists.map((pl) => (
            <div
              key={pl.id}
              onClick={() => onSelectPlaylist(pl)}
              className="group bg-[#131E30] hover:bg-[#1A263B] rounded-xl p-4 border border-slate-700/30 flex flex-col cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/30"
            >
              <div className="w-full aspect-square rounded-lg bg-[#1A263B] group-hover:bg-[#202E46] flex items-center justify-center mb-3 transition-colors">
                <Folder size={48} className="text-blue-500 group-hover:scale-105 transition-transform" />
              </div>
              <p className="text-[15px] font-bold text-slate-100 truncate" title={pl.name}>
                {pl.name}
              </p>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-xs text-slate-400">
                  {pl.song_count || 0} lagu
                </span>
                <span className="text-[11px] text-blue-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                  Buka ➔
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
