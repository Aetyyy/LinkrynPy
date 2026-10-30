import React from 'react';
import { History, Heart, Clock, FolderPlus } from 'lucide-react';
import { Track } from '../types/music';

interface HistoryViewProps {
  historyList: Track[];
  onPlaySong: (track: Track) => void;
  onContextMenu: (e: React.MouseEvent, track: Track) => void;
  onToggleLike: (track: Track) => void;
  isSongLiked: (url: string) => boolean;
  onOpenAddToPlaylist: (track: Track) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  historyList,
  onPlaySong,
  onContextMenu,
  onToggleLike,
  isSongLiked,
  onOpenAddToPlaylist,
}) => {
  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
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
          <History size={20} color="var(--primary-blue)" />
        </div>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>
            Riwayat Pemutaran
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Daftar trek yang baru-baru ini diputar di bot musik server ini.
          </p>
        </div>
      </div>

      {historyList.length === 0 ? (
        <div
          style={{
            padding: '60px 20px',
            textAlign: 'center',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <History size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
            Belum ada riwayat pemutaran
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Lagu yang selesai diputar akan otomatis tercatat di halaman ini.
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
              gridTemplateColumns: '40px 1fr 140px 100px',
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

          {historyList.map((track, idx) => {
            const liked = isSongLiked(track.url);
            return (
              <div
                key={track.url || idx}
                onContextMenu={(e) => onContextMenu(e, track)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 1fr 140px 100px',
                  alignItems: 'center',
                  padding: '10px 18px',
                  borderBottom: idx < historyList.length - 1 ? '1px solid var(--border-subtle)' : 'none',
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

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
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
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                  >
                    <FolderPlus size={16} />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleLike(track);
                    }}
                    title={liked ? 'Hapus dari Disukai' : 'Sukai Lagu'}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: liked ? 'var(--primary-blue)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '6px',
                    }}
                  >
                    <Heart size={16} fill={liked ? 'var(--primary-blue)' : 'none'} />
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
