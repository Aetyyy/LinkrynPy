import React from 'react';
import { Play, Heart, Sparkles } from 'lucide-react';
import { Track } from '../types/music';

interface RecommendationsViewProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  recommendations: Track[];
  loading: boolean;
  onPlaySong: (track: Track) => void;
  onContextMenu: (e: React.MouseEvent, track: Track) => void;
  onToggleLike: (track: Track) => void;
  isSongLiked: (url: string) => boolean;
}

export const RecommendationsView: React.FC<RecommendationsViewProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  recommendations,
  loading,
  onPlaySong,
  onContextMenu,
  onToggleLike,
  isSongLiked,
}) => {
  return (
    <section>
      {/* Category Pills Filter */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '16px',
          marginBottom: '20px',
          scrollbarWidth: 'none',
        }}
      >
        {categories.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              style={{
                padding: '7px 16px',
                borderRadius: '999px',
                fontSize: '12.5px',
                fontWeight: isActive ? '600' : '500',
                border: isActive ? '1px solid var(--primary-blue)' : '1px solid var(--border-subtle)',
                backgroundColor: isActive ? 'var(--active-blue-bg)' : 'var(--bg-surface)',
                color: isActive ? 'var(--soft-blue)' : 'var(--text-secondary)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.18s ease',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Grid of Recommendations */}
      {loading ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '18px',
          }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderRadius: '12px',
                padding: '14px',
                border: '1px solid var(--border-subtle)',
              }}
              className="animate-pulse"
            >
              <div
                style={{
                  width: '100%',
                  aspectRatio: '1/1',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-surface-secondary)',
                  marginBottom: '12px',
                }}
              />
              <div
                style={{
                  height: '14px',
                  borderRadius: '4px',
                  backgroundColor: 'var(--bg-surface-secondary)',
                  width: '80%',
                  marginBottom: '8px',
                }}
              />
              <div
                style={{
                  height: '12px',
                  borderRadius: '4px',
                  backgroundColor: 'var(--bg-surface-secondary)',
                  width: '50%',
                }}
              />
            </div>
          ))}
        </div>
      ) : recommendations.length === 0 ? (
        <div
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <Sparkles size={32} color="var(--primary-blue)" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
            Belum ada rekomendasi
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Ganti kategori atau lakukan pencarian lagu untuk memulai.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '18px',
          }}
        >
          {recommendations.map((track, idx) => {
            const liked = isSongLiked(track.url);
            return (
              <div
                key={track.url || idx}
                onContextMenu={(e) => onContextMenu(e, track)}
                onClick={() => onPlaySong(track)}
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  padding: '14px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'transform 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-surface-elevated)';
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  const playOverlay = e.currentTarget.querySelector('.rec-play-overlay') as HTMLElement;
                  if (playOverlay) playOverlay.style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                  const playOverlay = e.currentTarget.querySelector('.rec-play-overlay') as HTMLElement;
                  if (playOverlay) playOverlay.style.opacity = '0';
                }}
              >
                {/* 1:1 Aspect Ratio Artwork */}
                <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', marginBottom: '12px' }}>
                  <img
                    src={track.thumbnail || 'https://via.placeholder.com/180'}
                    alt={track.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '8px',
                      objectFit: 'cover',
                    }}
                  />

                  {/* Discreet Like Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleLike(track);
                    }}
                    title={liked ? 'Hapus dari disukai' : 'Sukai lagu ini'}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(11, 18, 32, 0.7)',
                      border: 'none',
                      color: liked ? 'var(--primary-blue)' : '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      backdropFilter: 'blur(4px)',
                      transition: 'transform 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    <Heart size={14} fill={liked ? 'var(--primary-blue)' : 'none'} />
                  </button>

                  {/* Play Button Overlay on Card */}
                  <div
                    className="rec-play-overlay"
                    style={{
                      position: 'absolute',
                      bottom: '10px',
                      right: '10px',
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--primary-blue)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0,
                      transition: 'opacity 0.18s ease, transform 0.15s ease',
                      boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
                    }}
                  >
                    <Play size={16} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: '2px' }} />
                  </div>
                </div>

                {/* Track Information */}
                <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
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
                    title={track.title}
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
                      marginTop: '3px',
                      marginBottom: '6px',
                    }}
                    title={track.uploader || track.artist || 'Artis'}
                  >
                    {track.uploader || track.artist || 'Artis'}
                  </p>

                  <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {track.duration_str || '--:--'}
                    </span>
                    <span style={{ fontSize: '10.5px', color: 'var(--soft-blue)', fontWeight: '600' }}>
                      Putar ➔
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
