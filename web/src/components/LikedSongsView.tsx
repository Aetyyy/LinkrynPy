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
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* View Header */}
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
              <Heart size={20} color="var(--primary-blue)" fill="var(--primary-blue)" />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>
              Lagu yang Disukai
            </h1>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Koleksi {likedSongs.length} lagu favorit yang telah Anda simpan.
          </p>
        </div>

        {likedSongs.length > 0 && (
          <button
            onClick={() => onPlaySong(likedSongs[0])}
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
            <span>Putar Semua</span>
          </button>
        )}
      </div>

      {likedSongs.length === 0 ? (
        <div
          style={{
            padding: '60px 20px',
            textAlign: 'center',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <Heart size={40} color="var(--text-muted)" style={{ margin: '0 auto 14px auto' }} />
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>
            Belum ada lagu yang disukai
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Klik ikon hati pada lagu apa pun untuk menyimpannya ke koleksi ini.
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
          {/* Table Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '40px 1fr 140px 100px',
              padding: '12px 18px',
              borderBottom: '1px solid var(--border-subtle)',
              fontSize: '11px',
              textTransform: 'uppercase',
              fontWeight: '700',
              color: 'var(--text-muted)',
              letterSpacing: '0.5px',
            }}
          >
            <span>#</span>
            <span>Judul & Artis</span>
            <span style={{ textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
              <Clock size={12} /> Durasi
            </span>
            <span style={{ textAlign: 'right' }}>Aksi</span>
          </div>

          {/* Song Rows */}
          {likedSongs.map((track, index) => (
            <div
              key={track.url || index}
              onContextMenu={(e) => onContextMenu(e, track)}
              style={{
                display: 'grid',
                gridTemplateColumns: '40px 1fr 140px 100px',
                alignItems: 'center',
                padding: '10px 18px',
                borderBottom: index < likedSongs.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                transition: 'background-color 0.15s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-elevated)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: '500' }}>
                {index + 1}
              </span>

              <div
                onClick={() => onPlaySong(track)}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, paddingRight: '12px' }}
              >
                <img
                  src={track.thumbnail || 'https://via.placeholder.com/40'}
                  alt=""
                  style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }}
                />
                <div style={{ minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: '13.5px',
                      fontWeight: '600',
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      margin: 0,
                    }}
                  >
                    {track.title}
                  </p>
                  <p
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      marginTop: '2px',
                    }}
                  >
                    {track.uploader || track.artist || 'Artis'}
                  </p>
                </div>
              </div>

              <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', textAlign: 'right' }}>
                {track.duration_str || '--:--'}
              </span>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenAddToPlaylist(track);
                  }}
                  title="Tambah ke Playlist"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '6px',
                    borderRadius: '4px',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  <FolderPlus size={16} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveLiked(track.url);
                  }}
                  title="Hapus dari Disukai"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '6px',
                    borderRadius: '4px',
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
};

