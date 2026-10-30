import React, { useState } from 'react';
import { X, Folder, FolderPlus } from 'lucide-react';
import { Playlist, Track } from '../types/music';

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
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '420px',
          maxWidth: '100%',
          backgroundColor: 'var(--bg-surface-elevated)',
          borderRadius: '16px',
          border: '1px solid var(--border-subtle)',
          padding: '24px',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}
        className="animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FolderPlus size={20} color="var(--primary-blue)" />
            <h2 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)' }}>
              {isCreateOnly ? 'Buat Playlist Baru' : 'Simpan ke Playlist'}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {song && !isCreateOnly && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <img
              src={song.thumbnail || 'https://via.placeholder.com/40'}
              alt=""
              style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }}
            />
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
                {song.title}
              </p>
              <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {song.uploader || song.artist || 'Artis'}
              </p>
            </div>
          </div>
        )}

        {/* Existing Playlists List */}
        {!isCreateOnly && (
          <div>
            <p style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.5px', marginBottom: '8px' }}>
              Pilih Playlist Tersedia
            </p>
            {playlists.length === 0 ? (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '12px 0' }}>
                Belum ada playlist. Buat playlist baru di bawah.
              </p>
            ) : (
              <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {playlists.map((pl) => (
                  <button
                    key={pl.id}
                    onClick={() => {
                      if (song) onAddToPlaylist(pl.id, song);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Folder size={16} color="var(--primary-blue)" />
                      <span>{pl.name}</span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {pl.song_count || 0} lagu
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create New Playlist Form */}
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: isCreateOnly ? '0' : '8px', borderTop: isCreateOnly ? 'none' : '1px solid var(--border-subtle)' }}>
          <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>
            {isCreateOnly ? 'Nama Playlist Baru' : 'Atau Buat Playlist Baru'}
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Contoh: Lagu Santai Malam, Party..."
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={!newPlaylistName.trim()}
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                backgroundColor: 'var(--primary-blue)',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '13px',
                fontWeight: '600',
                cursor: newPlaylistName.trim() ? 'pointer' : 'not-allowed',
                opacity: newPlaylistName.trim() ? 1 : 0.5,
              }}
            >
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
