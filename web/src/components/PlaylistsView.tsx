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
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Back and Header */}
        <button
          onClick={onBackToPlaylists}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            marginBottom: '16px',
            padding: '4px 0',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
        >
          <ArrowLeft size={16} />
          <span>Kembali ke Koleksi Playlist</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '12px',
                backgroundColor: 'var(--bg-surface-secondary)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <Folder size={32} color="var(--primary-blue)" />
            </div>
            <div>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.5px' }}>
                Playlist Kustom
              </span>
              <h1 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px', color: 'var(--text-primary)', margin: '2px 0 0 0' }}>
                {selectedPlaylist.name}
              </h1>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {playlistSongs.length} lagu tersimpan
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {playlistSongs.length > 0 && (
              <button
                onClick={() => onPlayPlaylist(selectedPlaylist.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: '999px',
                  backgroundColor: 'var(--primary-blue)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(57, 120, 246, 0.35)',
                  transition: 'background 0.18s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--hover-blue)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--primary-blue)')}
              >
                <Play size={15} fill="#FFFFFF" />
                <span>Putar Playlist</span>
              </button>
            )}

            <button
              onClick={() => onDeletePlaylist(selectedPlaylist.id)}
              title="Hapus Playlist"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--status-danger)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                fontSize: '12.5px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              <Trash2 size={15} />
              <span>Hapus</span>
            </button>
          </div>
        </div>

        {/* Songs List */}
        {playlistSongs.length === 0 ? (
          <div
            style={{
              padding: '60px 20px',
              textAlign: 'center',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <Music size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
              Playlist ini masih kosong
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Tambahkan lagu ke playlist ini dari menu rekomendasi atau hasil pencarian.
            </p>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '40px 1fr 140px 80px',
                padding: '12px 18px',
                borderBottom: '1px solid var(--border-subtle)',
                fontSize: '11px',
                textTransform: 'uppercase',
                fontWeight: '700',
                color: 'var(--text-muted)',
              }}
            >
              <span>#</span>
              <span>Judul & Artis</span>
              <span style={{ textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                <Clock size={12} /> Durasi
              </span>
              <span style={{ textAlign: 'right' }}>Aksi</span>
            </div>

            {playlistSongs.map((track, idx) => (
              <div
                key={track.id || track.url || idx}
                onContextMenu={(e) => onContextMenu(e, track)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 1fr 140px 80px',
                  alignItems: 'center',
                  padding: '10px 18px',
                  borderBottom: idx < playlistSongs.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-elevated)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>
                  {idx + 1}
                </span>

                <div
                  onClick={() => onPlaySong(track)}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, paddingRight: '12px' }}
                >
                  <img
                    src={track.thumbnail || 'https://via.placeholder.com/40'}
                    alt=""
                    style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: '13.5px', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
                      {track.title}
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                      {track.uploader || track.artist || 'Artis'}
                    </p>
                  </div>
                </div>

                <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', textAlign: 'right' }}>
                  {track.duration_str || '--:--'}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (track.id) onRemoveSongFromPlaylist(selectedPlaylist.id, track.id);
                    }}
                    title="Hapus dari playlist"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '6px',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--status-danger)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
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
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'var(--active-blue-bg)',
                border: '1px solid var(--active-blue-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Folder size={20} color="var(--primary-blue)" />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>
              Koleksi Playlist
            </h1>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Kelola daftar putar musik kustom Anda untuk server Discord.
          </p>
        </div>

        <button
          onClick={onOpenCreateModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '8px',
            backgroundColor: 'var(--primary-blue)',
            color: '#FFFFFF',
            border: 'none',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(57, 120, 246, 0.35)',
            transition: 'background 0.18s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--hover-blue)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--primary-blue)')}
        >
          <Plus size={16} />
          <span>Buat Playlist Baru</span>
        </button>
      </div>

      {playlists.length === 0 ? (
        <div
          style={{
            padding: '60px 20px',
            textAlign: 'center',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <Folder size={44} color="var(--text-muted)" style={{ margin: '0 auto 14px auto' }} />
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>
            Belum ada playlist
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Buat playlist pertama Anda untuk mengelompokkan lagu favorit.
          </p>
          <button
            onClick={onOpenCreateModal}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              backgroundColor: 'var(--primary-blue)',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Buat Sekarang
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '18px',
          }}
        >
          {playlists.map((pl) => (
            <div
              key={pl.id}
              onClick={() => onSelectPlaylist(pl)}
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderRadius: '12px',
                padding: '16px',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                transition: 'transform 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-surface-elevated)';
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div
                style={{
                  width: '100%',
                  aspectRatio: '1/1',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-surface-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px',
                }}
              >
                <Folder size={48} color="var(--primary-blue)" />
              </div>
              <p
                style={{
                  fontSize: '15px',
                  fontWeight: '700',
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  margin: 0,
                }}
              >
                {pl.name}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {pl.song_count || 0} lagu
                </span>
                <span style={{ fontSize: '11px', color: 'var(--soft-blue)', fontWeight: '600' }}>
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

