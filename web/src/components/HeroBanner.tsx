import React from 'react';
import { 
  Play, 
  Heart, 
  FolderPlus, 
  ExternalLink, 
  Radio, 
  Headphones,
  Sparkles
} from 'lucide-react';
import { CurrentTrack, Track } from '../types/music';

interface HeroBannerProps {
  currentSong: CurrentTrack | null | undefined;
  isLiked: boolean;
  onToggleLike: () => void;
  onOpenAddToPlaylist: (track: Track) => void;
  onContextMenu: (e: React.MouseEvent, track: Track) => void;
  voiceChannelName?: string | null;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  currentSong,
  isLiked,
  onToggleLike,
  onOpenAddToPlaylist,
  onContextMenu,
  voiceChannelName,
}) => {
  if (currentSong) {
    return (
      <div
        onContextMenu={(e) => onContextMenu(e, currentSong)}
        style={{
          position: 'relative',
          borderRadius: '16px',
          overflow: 'hidden',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          padding: '24px 28px',
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          marginBottom: '32px',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        {/* Subtle Ambient Background Glow */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(100deg, rgba(57, 120, 246, 0.08) 0%, rgba(17, 27, 45, 0.95) 75%)',
            pointerEvents: 'none',
          }}
        />

        {/* Artwork */}
        <div
          style={{
            position: 'relative',
            width: '130px',
            height: '130px',
            flexShrink: 0,
            borderRadius: '10px',
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
          }}
        >
          <img
            src={currentSong.thumbnail || 'https://via.placeholder.com/130'}
            alt={currentSong.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>

        {/* Content Details */}
        <div style={{ position: 'relative', flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '20px',
                backgroundColor: 'var(--active-blue-bg)',
                border: '1px solid var(--active-blue-border)',
                color: 'var(--soft-blue)',
                fontSize: '11px',
                fontWeight: '700',
                letterSpacing: '0.4px',
                textTransform: 'uppercase',
              }}
            >
              <Headphones size={12} color="var(--primary-blue)" />
              <span>Sedang Diputar {voiceChannelName ? `di #${voiceChannelName}` : 'di Discord'}</span>
            </div>

            <button
              onClick={onToggleLike}
              title={isLiked ? 'Hapus dari disukai' : 'Sukai lagu ini'}
              style={{
                background: 'none',
                border: 'none',
                color: isLiked ? 'var(--primary-blue)' : 'var(--text-muted)',
                cursor: 'pointer',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Heart size={22} fill={isLiked ? 'var(--primary-blue)' : 'none'} />
            </button>
          </div>

          <h2
            style={{
              fontSize: '24px',
              fontWeight: '700',
              letterSpacing: '-0.5px',
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              margin: '2px 0 0 0',
            }}
            title={currentSong.title}
          >
            {currentSong.title}
          </h2>

          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', margin: 0 }}>
            {currentSong.uploader || currentSong.artist || 'Artis'}
            {currentSong.requester && (
              <span style={{ color: 'var(--text-muted)' }}>
                {' '}• Diminta oleh <strong style={{ color: 'var(--text-primary)' }}>{currentSong.requester}</strong>
              </span>
            )}
          </p>

          {/* Action Links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
            {currentSong.url && (
              <a
                href={currentSong.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: 'var(--soft-blue)',
                  textDecoration: 'none',
                }}
              >
                <span>Buka Sumber</span>
                <ExternalLink size={12} />
              </a>
            )}

            <button
              onClick={() => onOpenAddToPlaylist(currentSong)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: '600',
                color: 'var(--text-primary)',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid var(--border-subtle)',
                padding: '5px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.14)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)')}
            >
              <FolderPlus size={14} color="var(--primary-blue)" />
              <span>Simpan ke Playlist</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Fallback Welcome / Discovery Hero
  return (
    <div
      style={{
        position: 'relative',
        borderRadius: '16px',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        padding: '28px 32px',
        marginBottom: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, rgba(57, 120, 246, 0.12) 0%, transparent 60%)',
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '540px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            color: 'var(--soft-blue)',
            marginBottom: '8px',
          }}
        >
          <Sparkles size={13} color="var(--primary-blue)" />
          <span>Pengalaman Audio Premium</span>
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px', color: 'var(--text-primary)', marginBottom: '8px' }}>
          Jelajahi Musik & Rekomendasi
        </h2>
        <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
          Pilih dari koleksi lagu populer di bawah atau cari trek apa saja untuk langsung diputar ke voice channel server Discord Anda secara real-time.
        </p>
      </div>

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '12px',
            backgroundColor: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            textAlign: 'center',
          }}
        >
          <Radio size={20} color="var(--primary-blue)" style={{ margin: '0 auto 4px auto' }} />
          <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Status Bot</p>
          <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--status-success)' }}>Siap Memutar</p>
        </div>
      </div>
    </div>
  );
};

