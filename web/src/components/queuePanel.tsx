import React from 'react';
import { X, Trash2, ListMusic } from 'lucide-react';
import { CurrentTrack, QueueItem, Track } from '../types/music';

interface QueuePanelProps {
  currentSong: CurrentTrack | null | undefined;
  queue: QueueItem[];
  onClose: () => void;
  onRemoveItem: (index: number) => void;
  onClearQueue: () => void;
  onPlaySong: (track: Track) => void;
}

export const QueuePanel: React.FC<QueuePanelProps> = ({
  currentSong,
  queue,
  onClose,
  onRemoveItem,
  onClearQueue,
  onPlaySong,
}) => {
  return (
    <div
      style={{
        width: '320px',
        backgroundColor: 'var(--bg-sidebar)',
        borderLeft: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        zIndex: 20,
      }}
      className="animate-slide-right"
    >
      {/* Header */}
      <div
        style={{
          padding: '18px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ListMusic size={18} color="var(--primary-blue)" />
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
            Antrean Putar
          </h2>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            ({queue.length})
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {queue.length > 0 && (
            <button
              onClick={onClearQueue}
              title="Bersihkan seluruh antrean"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--status-danger)',
                fontSize: '11.5px',
                fontWeight: '600',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '4px',
              }}
            >
              Bersihkan
            </button>
          )}

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Currently Playing Card */}
        {currentSong && (
          <div>
            <p style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.5px', marginBottom: '8px' }}>
              Sedang Diputar
            </p>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px',
                borderRadius: '8px',
                backgroundColor: 'var(--active-blue-bg)',
                border: '1px solid var(--active-blue-border)',
              }}
            >
              <img
                src={currentSong.thumbnail || 'https://via.placeholder.com/40'}
                alt=""
                style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }}
              />
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--soft-blue)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
                  {currentSong.title}
                </p>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                  {currentSong.uploader || currentSong.artist}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Up Next List */}
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.5px', marginBottom: '8px' }}>
            Berikutnya ({queue.length})
          </p>

          {queue.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '13px' }}>Antrean kosong.</p>
              <p style={{ fontSize: '11.5px', marginTop: '4px' }}>Cari lagu atau putar dari rekomendasi.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {queue.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-elevated)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}
                >
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', minWidth: '16px' }}>
                    {idx + 1}
                  </span>
                  <img
                    src={item.thumbnail || 'https://via.placeholder.com/36'}
                    alt=""
                    style={{ width: '36px', height: '36px', borderRadius: '4px', objectFit: 'cover' }}
                  />
                  <div
                    onClick={() => onPlaySong(item)}
                    style={{ minWidth: 0, flex: 1, cursor: 'pointer' }}
                  >
                    <p style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
                      {item.title}
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.uploader || item.artist}
                    </p>
                  </div>
                  <button
                    onClick={() => onRemoveItem(idx + 1)}
                    title="Hapus dari antrean"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '4px',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--status-danger)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
