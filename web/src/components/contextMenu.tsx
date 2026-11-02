import React from 'react';
import { Play, ListPlus, FolderPlus, Heart, ExternalLink } from 'lucide-react';
import type { ContextMenuState, Track } from '../types/musicTypes';

interface ContextMenuProps {
  contextMenu: ContextMenuState;
  onClose: () => void;
  onPlaySong: (track: Track) => void;
  onAddToQueue: (track: Track) => void;
  onOpenAddToPlaylist: (track: Track) => void;
  onToggleLike: (track: Track) => void;
  isSongLiked: (url: string) => boolean;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  contextMenu,
  onClose,
  onPlaySong,
  onAddToQueue,
  onOpenAddToPlaylist,
  onToggleLike,
  isSongLiked,
}) => {
  if (!contextMenu.visible || !contextMenu.song) return null;

  const song = contextMenu.song;
  const liked = isSongLiked(song.url);

  return (
    <div
      style={{
        left: `${contextMenu.x}px`,
        top: `${contextMenu.y}px`,
      }}
      className="fixed w-[210px] bg-[#152238] border border-slate-700/30 rounded-xl shadow-2xl p-1.5 z-[99999] flex flex-col gap-0.5 animate-fade-in"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-2 py-1.5 border-b border-slate-700/30 mb-1">
        <p className="text-xs font-bold text-slate-100 truncate">
          {song.title}
        </p>
      </div>

      <button
        type="button"
        onClick={() => {
          onPlaySong(song);
          onClose();
        }}
        className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12.5px] font-medium text-slate-200 hover:bg-[#1E2D47] text-left cursor-pointer transition-colors"
      >
        <Play size={14} className="text-[#3978F6]" />
        <span>Putar Sekarang</span>
      </button>

      <button
        type="button"
        onClick={() => {
          onAddToQueue(song);
          onClose();
        }}
        className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12.5px] font-medium text-slate-200 hover:bg-[#1E2D47] text-left cursor-pointer transition-colors"
      >
        <ListPlus size={14} className="text-slate-400" />
        <span>Tambah ke Antrean</span>
      </button>

      <button
        type="button"
        onClick={() => {
          onOpenAddToPlaylist(song);
          onClose();
        }}
        className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12.5px] font-medium text-slate-200 hover:bg-[#1E2D47] text-left cursor-pointer transition-colors"
      >
        <FolderPlus size={14} className="text-slate-400" />
        <span>Tambah ke Playlist</span>
      </button>

      <button
        type="button"
        onClick={() => {
          onToggleLike(song);
          onClose();
        }}
        className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12.5px] font-medium hover:bg-[#1E2D47] text-left cursor-pointer transition-colors ${
          liked ? 'text-[#3978F6]' : 'text-slate-200'
        }`}
      >
        <Heart size={14} fill={liked ? '#3978F6' : 'none'} className={liked ? 'text-[#3978F6]' : 'text-slate-400'} />
        <span>{liked ? 'Hapus dari Disukai' : 'Sukai Lagu'}</span>
      </button>

      {song.url && (
        <a
          href={song.url}
          target="_blank"
          rel="noreferrer"
          onClick={onClose}
          className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-100 border-t border-slate-700/30 mt-1 transition-colors"
        >
          <ExternalLink size={13} />
          <span>Buka di YouTube</span>
        </a>
      )}
    </div>
  );
};
