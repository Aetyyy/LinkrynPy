import React from 'react';
import { Play, ListPlus, FolderPlus, Heart, ExternalLink } from 'lucide-react';
import { ContextMenuState, Track } from '../types/music';

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
        position: 'fixed',
        left: `${contextMenu.x}px`,
        top: `${contextMenu.y}px`,
        width: '210px',
        backgroundColor: 'var(--bg-surface-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '10px',
        boxShadow: 'var(--shadow-lg)',
        padding: '6px',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
      }}
      className="animate-fade-in"
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '4px' }}>
        <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {song.title}
        </p>
      </div>

      <button
        onClick={() => {
          onPlaySong(song);
          onClose();
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 10px',
          borderRadius: '6px',
          border: 'none',
          backgroundColor: 'transparent',
          color: 'var(--text-primary)',
          fontSize: '12.5px',
          fontWeight: '500',
          cursor: 'pointer',
          textAlign: 'left',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <Play size={14} color="var(--primary-blue)" />
        <span>Putar Sekarang</span>
      </button>

      <button
        onClick={() => {
          onAddToQueue(song);
          onClose();
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 10px',
          borderRadius: '6px',
          border: 'none',
          backgroundColor: 'transparent',
          color: 'var(--text-primary)',
          fontSize: '12.5px',
          fontWeight: '500',
          cursor: 'pointer',
          textAlign: 'left',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <ListPlus size={14} color="var(--text-secondary)" />
        <span>Tambah ke Antrean</span>
      </button>

      <button
        onClick={() => {
          onOpenAddToPlaylist(song);
          onClose();
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 10px',
          borderRadius: '6px',
          border: 'none',
          backgroundColor: 'transparent',
          color: 'var(--text-primary)',
          fontSize: '12.5px',
          fontWeight: '500',
          cursor: 'pointer',
          textAlign: 'left',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <FolderPlus size={14} color="var(--text-secondary)" />
        <span>Tambah ke Playlist</span>
      </button>

      <button
        onClick={() => {
          onToggleLike(song);
          onClose();
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 10px',
          borderRadius: '6px',
          border: 'none',
          backgroundColor: 'transparent',
          color: liked ? 'var(--primary-blue)' : 'var(--text-primary)',
          fontSize: '12.5px',
          fontWeight: '500',
          cursor: 'pointer',
          textAlign: 'left',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <Heart size={14} fill={liked ? 'var(--primary-blue)' : 'none'} color={liked ? 'var(--primary-blue)' : 'currentColor'} />
        <span>{liked ? 'Hapus dari Disukai' : 'Sukai Lagu'}</span>
      </button>

      {song.url && (
        <a
          href={song.url}
          target="_blank"
          rel="noreferrer"
          onClick={onClose}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 10px',
            borderRadius: '6px',
            color: 'var(--text-muted)',
            fontSize: '12px',
            textDecoration: 'none',
            borderTop: '1px solid var(--border-subtle)',
            marginTop: '4px',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          <ExternalLink size={13} />
          <span>Buka di YouTube</span>
        </a>
      )}
    </div>
  );
};

