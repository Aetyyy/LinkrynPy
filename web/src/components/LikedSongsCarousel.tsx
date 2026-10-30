import React, { useRef } from 'react';
import { Heart, Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { Track } from '../types/music';

interface LikedSongsCarouselProps {
  likedSongs: Track[];
  onPlaySong: (track: Track) => void;
  onContextMenu: (e: React.MouseEvent, track: Track) => void;
  onToggleLike: (track: Track) => void;
  onViewAll: () => void;
}

export const LikedSongsCarousel: React.FC<LikedSongsCarouselProps> = ({
  likedSongs,
  onPlaySong,
  onContextMenu,
  onToggleLike,
  onViewAll,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!likedSongs || likedSongs.length === 0) {
    return null;
  }

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const offset = direction === 'left' ? -360 : 360;
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <section style={{ marginBottom: '32px' }}>
      {/* Section Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Heart size={18} color="var(--primary-blue)" fill="var(--primary-blue)" />
          <h2 style={{ fontSize: '18px', fontWeight: '700', letterSpacing: '-0.3px', color: 'var(--text-primary)' }}>
            Lagu yang Disukai
          </h2>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>
            ({likedSongs.length})
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => scroll('left')}
            title="Gulir ke kiri"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => scroll('right')}
            title="Gulir ke kanan"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <ChevronRight size={16} />
          </button>
          <button
            onClick={onViewAll}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary-blue)',
              fontSize: '12.5px',
              fontWeight: '600',
              cursor: 'pointer',
              marginLeft: '4px',
            }}
          >
            Lihat Semua →
          </button>
        </div>
      </div>

      {/* Horizontal Carousel */}
      <div
        ref={scrollRef}
        style={{
          display: 'grid',
          gridAutoFlow: 'column',
          gridAutoColumns: '168px',
          gap: '14px',
          overflowX: 'auto',
          alignItems: 'stretch',
          paddingBottom: '8px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {likedSongs.map((track, idx) => (
          <div
            key={track.url || idx}
            onContextMenu={(e) => onContextMenu(e, track)}
            onClick={() => onPlaySong(track)}
            style={{
              backgroundColor: 'var(--bg-surface)',
              padding: '12px',
              borderRadius: '10px',
              display: 'flex',
              flexDirection: 'column',
              cursor: 'pointer',
              transition: 'transform 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease',
              border: '1px solid var(--border-subtle)',
              position: 'relative',
            }}
            className="group"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-surface-elevated)';
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              const playBtn = e.currentTarget.querySelector('.play-overlay') as HTMLElement;
              if (playBtn) playBtn.style.opacity = '1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
              const playBtn = e.currentTarget.querySelector('.play-overlay') as HTMLElement;
              if (playBtn) playBtn.style.opacity = '0';
            }}
          >
            {/* Artwork Container */}
            <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', marginBottom: '10px' }}>
              <img
                src={track.thumbnail || 'https://via.placeholder.com/150'}
                alt={track.title}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '6px',
                  objectFit: 'cover',
                }}
              />

              {/* Discreet Favorite Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLike(track);
                }}
                title="Hapus dari disukai"
                style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(11, 18, 32, 0.75)',
                  border: 'none',
                  color: 'var(--primary-blue)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  backdropFilter: 'blur(4px)',
                }}
              >
                <Heart size={14} fill="var(--primary-blue)" />
              </button>

              {/* Play Button Overlay on Hover */}
              <div
                className="play-overlay"
                style={{
                  position: 'absolute',
                  bottom: '8px',
                  right: '8px',
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary-blue)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0,
                  transition: 'opacity 0.18s ease, transform 0.15s ease',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                }}
              >
                <Play size={15} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: '1px' }} />
              </div>
            </div>

            {/* Metadata */}
            <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
              <p
                style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  margin: 0,
                }}
                title={track.title}
              >
                {track.title}
              </p>
              <p
                style={{
                  fontSize: '11.5px',
                  color: 'var(--text-secondary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  marginTop: '3px',
                }}
                title={track.uploader || track.artist || 'Artis'}
              >
                {track.uploader || track.artist || 'Artis'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

