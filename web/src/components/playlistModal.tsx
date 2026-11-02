import React, { useState } from 'react';
import { X, Folder, FolderPlus } from 'lucide-react';
import type { Playlist, Track } from '../types/musicTypes';

interface PlaylistModalProps {
  song: Track | null;
  playlists: Playlist[];
  onClose: () => void;
  onAddToPlaylist: (playlistId: string, song: Track) => void;
  onCreateAndAdd: (song: Track, playlistName: string) => void;
  onCreateOnly?: (playlistName: string) => void;
  isCreateOnly?: boolean;
}

export const PlaylistModal: React.FC<PlaylistModalProps> = ({
  song,
  playlists,
  onClose,
  onAddToPlaylist,
  onCreateAndAdd,
  onCreateOnly,
  isCreateOnly = false,
}) => {
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    if (isCreateOnly && onCreateOnly) {
      onCreateOnly(newPlaylistName.trim());
    } else if (song) {
      onCreateAndAdd(song, newPlaylistName.trim());
    }
    setNewPlaylistName('');
  };

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-5 bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[420px] bg-[#152238] rounded-2xl border border-slate-700/30 p-6 shadow-2xl flex flex-col gap-4.5 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderPlus size={20} className="text-[#3978F6]" />
            <h2 className="text-[17px] font-bold text-slate-100">
              {isCreateOnly ? 'Buat Playlist Baru' : 'Simpan ke Playlist'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 p-1 cursor-pointer transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {song && !isCreateOnly && (
          <div className="flex items-center gap-2.5 p-2.5 bg-[#111B2D] rounded-xl border border-slate-700/30">
            <img
              src={song.thumbnail || 'https://via.placeholder.com/40'}
              alt=""
              className="w-10 h-10 rounded-lg object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-slate-100 truncate m-0">
                {song.title}
              </p>
              <p className="text-[11.5px] text-slate-400 truncate m-0">
                {song.uploader || song.artist || 'Artis'}
              </p>
            </div>
          </div>
        )}

        {/* Existing Playlists List */}
        {!isCreateOnly && (
          <div>
            <p className="text-[11px] uppercase text-slate-400 font-bold tracking-wider mb-2">
              Pilih Playlist Tersedia
            </p>
            {playlists.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">
                Belum ada playlist. Buat playlist baru di bawah.
              </p>
            ) : (
              <div className="max-h-[180px] overflow-y-auto flex flex-col gap-1.5 pr-1">
                {playlists.map((pl) => (
                  <button
                    key={pl.id}
                    type="button"
                    onClick={() => {
                      if (song) onAddToPlaylist(pl.id, song);
                    }}
                    className="flex items-center justify-between p-2.5 bg-[#111B2D] hover:bg-[#1E2D47] border border-slate-700/30 rounded-xl text-slate-100 text-[13px] font-semibold cursor-pointer text-left transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Folder size={16} className="text-[#3978F6] shrink-0" />
                      <span className="truncate">{pl.name}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 shrink-0 ml-2">
                      {pl.song_count || 0} lagu
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create New Playlist Form */}
        <form
          onSubmit={handleCreate}
          className={`flex flex-col gap-2.5 ${isCreateOnly ? 'pt-0' : 'pt-2 border-t border-slate-700/30'}`}
        >
          <label className="text-xs font-semibold text-slate-300">
            {isCreateOnly ? 'Nama Playlist Baru' : 'Atau Buat Playlist Baru'}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Contoh: Lagu Santai Malam, Party..."
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              className="flex-1 py-2 px-3 rounded-xl bg-[#111B2D] border border-slate-700/30 text-slate-100 text-[13px] placeholder:text-slate-500 focus:outline-none focus:border-[#3978F6]"
            />
            <button
              type="submit"
              disabled={!newPlaylistName.trim()}
              className="py-2 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 disabled:cursor-not-allowed text-white text-[13px] font-semibold cursor-pointer transition-colors shadow-sm"
            >
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
