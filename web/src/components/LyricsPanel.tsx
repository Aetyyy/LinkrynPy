import React, { useRef, useEffect, useState } from 'react';
import { X, Mic2, Clock, RotateCcw, ArrowDown } from 'lucide-react';
import { LyricsInfo } from '../types/music';

interface LyricsPanelProps {
  currentSongTitle: string | undefined;
  lyricsInfo: LyricsInfo;
  activeLineIndex: number;
  loading: boolean;
  onClose: () => void;
  onSearchLyrics: (customQuery: string) => void;
  lyricsOffset: number;
  onLyricsOffsetChange: (offset: number) => void;
}

export const LyricsPanel: React.FC<LyricsPanelProps> = ({
  currentSongTitle,
  lyricsInfo,
  activeLineIndex,
  loading,
  onClose,
  onSearchLyrics,
  lyricsOffset,
  onLyricsOffsetChange,
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

  const adjustOffset = (delta: number) => {
    const nextVal = Math.round((lyricsOffset + delta) * 10) / 10;
    onLyricsOffsetChange(nextVal);
  };

  const hasSuggestedOffset = Boolean(
    lyricsInfo.suggestedOffset && Math.abs(lyricsInfo.suggestedOffset) >= 2.5
  );
  const isSuggestedApplied = Boolean(
    hasSuggestedOffset && Math.abs(lyricsOffset - (lyricsInfo.suggestedOffset || 0)) < 0.5
  );

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
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '6px' }}>
          <input
            type="text"
            placeholder={currentSongTitle ? `Lirik untuk "${currentSongTitle.slice(0, 20)}..."` : 'Cari judul lagu...'}
            value={customSearch}
            onChange={(e) => setCustomSearch(e.target.value)}
            style={{
              flex: 1,
              padding: '6px 10px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: '12px',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '6px 12px',
              backgroundColor: 'var(--primary-blue)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Cari
          </button>
        </form>
      </div>

      {/* Timing & Cutscene Synchronization Toolbar */}
      {lyricsInfo.isSynced && (
        <div
          style={{
            padding: '8px 16px',
            backgroundColor: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {/* Smart Cutscene Detection Prompt */}
          {hasSuggestedOffset && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                borderRadius: '6px',
                backgroundColor: isSuggestedApplied ? 'var(--active-blue-bg)' : 'rgba(245, 158, 11, 0.1)',
                border: isSuggestedApplied ? '1px solid var(--active-blue-border)' : '1px solid rgba(245, 158, 11, 0.25)',
                fontSize: '11px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isSuggestedApplied ? 'var(--soft-blue)' : 'var(--status-warning)' }}>
                <Clock size={12} />
                <span>
                  {isSuggestedApplied
                    ? `Offset cutscene aktif (+${lyricsInfo.suggestedOffset}s)`
                    : `Terdeteksi cutscene MV (+${lyricsInfo.suggestedOffset}s)`}
                </span>
              </div>
              <button
                onClick={() => onLyricsOffsetChange(isSuggestedApplied ? 0 : (lyricsInfo.suggestedOffset || 0))}
                style={{
                  border: 'none',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  fontSize: '10.5px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  backgroundColor: isSuggestedApplied ? 'var(--bg-surface-secondary)' : 'var(--primary-blue)',
                  color: isSuggestedApplied ? 'var(--text-secondary)' : '#FFFFFF',
                }}
              >
                {isSuggestedApplied ? 'Reset' : 'Terapkan'}
              </button>
            </div>
          )}

          {/* Precision Offset Fine-Tuning */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
            <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>Sinkron:</span>
              <strong style={{ color: lyricsOffset !== 0 ? 'var(--primary-blue)' : 'var(--text-secondary)' }}>
                {lyricsOffset > 0 ? `+${lyricsOffset.toFixed(1)}s` : `${lyricsOffset.toFixed(1)}s`}
              </strong>
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                onClick={() => adjustOffset(-1.0)}
                title="Mundurkan lirik 1 detik (-1s)"
                style={{
                  padding: '2px 6px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-main)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '10.5px',
                }}
              >
                -1s
              </button>
              <button
                onClick={() => adjustOffset(-0.5)}
                title="Mundurkan lirik 0.5 detik (-0.5s)"
                style={{
                  padding: '2px 6px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-main)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '10.5px',
                }}
              >
                -0.5s
              </button>
              <button
                onClick={() => onLyricsOffsetChange(0)}
                title="Reset offset ke 0s"
                style={{
                  padding: '2px 6px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-main)',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '10.5px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <RotateCcw size={10} />
              </button>
              <button
                onClick={() => adjustOffset(0.5)}
                title="Majukan lirik 0.5 detik (+0.5s)"
                style={{
                  padding: '2px 6px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-main)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '10.5px',
                }}
              >
                +0.5s
              </button>
              <button
                onClick={() => adjustOffset(1.0)}
                title="Majukan lirik 1 detik (+1s)"
                style={{
                  padding: '2px 6px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-main)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '10.5px',
                }}
              >
                +1s
              </button>
            </div>
          </div>
        </div>
      )}

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
              Coba cari manual dengan form di atas jika judul lagu mengandung teks ekstra.
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
