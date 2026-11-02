import React, { useRef, useEffect, useState } from 'react';
import { X, Mic2, ArrowDown } from 'lucide-react';
import { LyricsInfo } from '../types/music';

interface LyricsPanelProps {
  currentSongTitle: string | undefined;
  lyricsInfo: LyricsInfo;
  activeLineIndex: number;
  loading: boolean;
  onClose: () => void;
  onSearchLyrics: (customQuery: string) => void;
}

export const LyricsPanel: React.FC<LyricsPanelProps> = ({
  currentSongTitle,
  lyricsInfo,
  activeLineIndex,
  loading,
  onClose,
  onSearchLyrics,
}) => {
  const [customSearch, setCustomSearch] = useState('');
  const activeLineRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // User manual scroll detection so auto-scroll doesn't fight the user
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const userScrollTimeoutRef = useRef<number | null>(null);

  const handleContainerScroll = () => {
    setIsUserScrolling(true);
    if (userScrollTimeoutRef.current !== null) {
      window.clearTimeout(userScrollTimeoutRef.current);
    }
    userScrollTimeoutRef.current = window.setTimeout(() => {
      setIsUserScrolling(false);
    }, 4000);
  };

  const scrollToActiveLine = (smooth = true) => {
    setIsUserScrolling(false);
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'center',
      });
    }
  };

  // Auto-scroll to active karaoke line only if user is not actively browsing
  useEffect(() => {
    if (!isUserScrolling && activeLineRef.current && lyricsInfo.isSynced && activeLineIndex >= 0) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeLineIndex, lyricsInfo.isSynced, isUserScrolling]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customSearch.trim()) {
      onSearchLyrics(customSearch.trim());
    }
  };

  return (
    <div
      style={{
        width: '380px',
        backgroundColor: 'var(--bg-sidebar)',
        borderLeft: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        zIndex: 20,
        position: 'relative',
      }}
      className="animate-slide-right"
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Mic2 size={18} color="var(--primary-blue)" />
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
              Lirik Lagu
            </h2>
            <span style={{ fontSize: '10.5px', color: lyricsInfo.isSynced ? 'var(--status-success)' : 'var(--text-muted)' }}>
              {lyricsInfo.isSynced ? '● Karaoke Sinkron' : 'Mode Baca'}
            </span>
          </div>
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

      {/* Manual Lyrics Search Input */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
        <form onSubmit={handleSearchSubmit}>
          <input
            type="text"
            aria-label="Cari lirik alternatif"
            placeholder={currentSongTitle ? `Lirik untuk "${currentSongTitle.slice(0, 20)}..."` : 'Cari judul lagu...'}
            value={customSearch}
            onChange={(e) => setCustomSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: '12px',
              outline: 'none',
            }}
          />
        </form>
      </div>

      {/* Lyrics Content */}
      <div
        ref={scrollContainerRef}
        onScroll={handleContainerScroll}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Mic2 size={32} color="var(--primary-blue)" style={{ margin: '0 auto 12px auto' }} className="animate-spin-slow" />
            <p style={{ fontSize: '13px' }}>Mencari lirik otomatis...</p>
          </div>
        ) : lyricsInfo.lines.length === 0 ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
              Lirik belum tersedia
            </p>
            <p style={{ fontSize: '12px', marginTop: '6px' }}>
              Coba ubah judul di kolom atas lalu tekan Enter untuk mencari lagi.
            </p>
          </div>
        ) : (
          lyricsInfo.lines.map((line, idx) => {
            const isActive = lyricsInfo.isSynced && idx === activeLineIndex;
            return (
              <div
                key={idx}
                ref={isActive ? activeLineRef : null}
                style={{
                  fontSize: isActive ? '17px' : '13.5px',
                  fontWeight: isActive ? '700' : '400',
                  color: isActive ? 'var(--soft-blue)' : 'var(--text-muted)',
                  lineHeight: '1.6',
                  transition: 'all 0.22s ease',
                  transform: isActive ? 'scale(1.04)' : 'scale(1)',
                  padding: '4px 0',
                }}
              >
                {line.text}
              </div>
            );
          })
        )}
      </div>

      {/* Floating Button to Re-center on Active Line when User Has Scrolled */}
      {isUserScrolling && lyricsInfo.isSynced && activeLineIndex >= 0 && (
        <button
          onClick={() => scrollToActiveLine(true)}
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'var(--primary-blue)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '20px',
            padding: '6px 14px',
            fontSize: '11.5px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
            zIndex: 30,
            transition: 'all 0.18s ease',
          }}
          className="animate-fade-in"
        >
          <ArrowDown size={13} />
          <span>Kembali ke lirik aktif</span>
        </button>
      )}
    </div>
  );
};
