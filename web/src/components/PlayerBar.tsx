import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Volume2,
  VolumeX,
  Volume1,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  ListMusic,
  Mic2,
  Sliders,
  Music2,
  FolderPlus,
  Radio,
  Square
} from 'lucide-react';
import { PlayerStatus, RightPanelType, Track } from '../types/music';
import { formatTime } from '../utils/format';

interface PlayerBarProps {
  status: PlayerStatus | null;
  localElapsed: number;
  isSeeking: boolean;
  onSeekChange: (val: number) => void;
  onSeekCommit: (val: number) => void;
  onPlayPause: () => void;
  onSkip: () => void;
  onPrevious: () => void;
  onShuffle: () => void;
  onLoop: () => void;
  onStop: () => void;
  autoplay: boolean;
  onToggleAutoplay: () => void;
  onVolumeChange: (vol: number) => void;
  rightPanel: RightPanelType;
  setRightPanel: React.Dispatch<React.SetStateAction<RightPanelType>>;
  onToggleFilterModal: () => void;
  onToggleLikeCurrent: () => void;
  onOpenAddToPlaylist: (song: Track) => void;
  isCurrentLiked: boolean;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({
  status,
  localElapsed,
  isSeeking: _isSeeking,
  onSeekChange,
  onSeekCommit,
  onPlayPause,
  onSkip,
  onPrevious,
  onShuffle,
  onLoop,
  onStop,
  autoplay,
  onToggleAutoplay,
  onVolumeChange,
  rightPanel,
  setRightPanel,
  onToggleFilterModal,
  onToggleLikeCurrent,
  onOpenAddToPlaylist,
  isCurrentLiked,
}) => {
  const currentSong = status?.current;
  const isPlaying = status?.is_playing || false;
  const duration = currentSong?.duration || 0;
  const queueCount = status?.queue?.length || 0;
  const loopMode = status?.loop_mode || 'off';
  const isShuffle = status?.shuffle || false;

  // --- Smooth Seek State ---
  const [dragElapsed, setDragElapsed] = useState<number>(0);
  const [isDraggingSeek, setIsDraggingSeek] = useState<boolean>(false);

  useEffect(() => {
    if (!isDraggingSeek) {
      setDragElapsed(localElapsed);
    }
  }, [localElapsed, isDraggingSeek]);

  const activeElapsed = isDraggingSeek ? dragElapsed : localElapsed;
  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (activeElapsed / duration) * 100)) : 0;

  const handleSeekInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsDraggingSeek(true);
    const val = Number(e.target.value);
    setDragElapsed(val);
    onSeekChange(val);
  };

  const handleSeekRelease = () => {
    setIsDraggingSeek(false);
    onSeekCommit(dragElapsed);
  };

  // --- Smooth Volume State (1 - 200%) ---
  const serverVolume = status?.volume !== undefined ? status.volume : 100;
  const [localVolume, setLocalVolume] = useState<number>(serverVolume);
  const [isSlidingVolume, setIsSlidingVolume] = useState<boolean>(false);
  const [savedVolume, setSavedVolume] = useState<number>(serverVolume > 0 ? serverVolume : 100);

  useEffect(() => {
    if (!isSlidingVolume) {
      setLocalVolume(serverVolume);
    }
  }, [serverVolume, isSlidingVolume]);

  const handleVolumeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSlidingVolume(true);
    setLocalVolume(Number(e.target.value));
  };

  const handleVolumeRelease = () => {
    setIsSlidingVolume(false);
    onVolumeChange(localVolume);
  };

  const toggleMute = () => {
    if (localVolume > 0) {
      setSavedVolume(localVolume);
      setLocalVolume(0);
      onVolumeChange(0);
    } else {
      const restored = savedVolume || 100;
      setLocalVolume(restored);
      onVolumeChange(restored);
    }
  };

  const VolumeIcon = localVolume === 0 ? VolumeX : localVolume < 100 ? Volume1 : Volume2;

  return (
    <footer
      style={{
        height: '84px',
        backgroundColor: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        zIndex: 25,
        position: 'relative',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* LEFT: Current Track Metadata */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', width: '280px', minWidth: 0 }}>
        {currentSong ? (
          <>
            <div style={{ position: 'relative', width: '50px', height: '50px', flexShrink: 0 }}>
              <img
                src={currentSong.thumbnail || 'https://via.placeholder.com/50'}
                alt={currentSong.title}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '8px',
                  objectFit: 'cover',
                  boxShadow: 'var(--shadow-sm)',
                }}
              />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
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
                title={currentSong.title}
              >
                {currentSong.title}
              </p>
              <p
                style={{
                  fontSize: '11.5px',
                  color: 'var(--text-secondary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  marginTop: '2px',
                }}
                title={currentSong.uploader || currentSong.artist || 'Artis'}
              >
                {currentSong.uploader || currentSong.artist || 'Artis'}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                onClick={onToggleLikeCurrent}
                title={isCurrentLiked ? 'Hapus dari Lagu yang Disukai' : 'Sukai Lagu'}
                style={{
                  background: 'none',
                  border: 'none',
                  color: isCurrentLiked ? 'var(--primary-blue)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  transition: 'color 0.18s ease',
                }}
              >
                <Heart size={18} fill={isCurrentLiked ? 'var(--primary-blue)' : 'none'} />
              </button>
              <button
                onClick={() => onOpenAddToPlaylist(currentSong)}
                title="Tambah ke Playlist"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                <FolderPlus size={16} />
              </button>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-surface-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
              }}
            >
              <Music2 size={20} />
            </div>
            <div>
              <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                Tidak ada lagu aktif
              </p>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Pilih dari rekomendasi atau cari
              </p>
            </div>
          </div>
        )}
      </div>

      {/* CENTER: Playback Controls & Progress Timeline */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          width: '45%',
          maxWidth: '560px',
        }}
      >
        {/* Buttons Row: Shuffle, Previous, Play/Pause, Next, Loop, Autoplay, Stop */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Shuffle Toggle */}
          <button
            onClick={onShuffle}
            title={isShuffle ? 'Acak Antrean: Aktif' : 'Acak Antrean: Nonaktif'}
            style={{
              background: 'none',
              border: 'none',
              color: isShuffle ? 'var(--primary-blue)' : 'var(--text-muted)',
              cursor: currentSong ? 'pointer' : 'not-allowed',
              opacity: currentSong ? 1 : 0.4,
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '6px',
              transition: 'color 0.18s ease, transform 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (currentSong) e.currentTarget.style.color = isShuffle ? 'var(--hover-blue)' : 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              if (currentSong) e.currentTarget.style.color = isShuffle ? 'var(--primary-blue)' : 'var(--text-muted)';
            }}
          >
            <Shuffle size={16} />
          </button>

          {/* Previous / Rewind */}
          <button
            onClick={onPrevious}
            title="Putar Ulang / Sebelumnya"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: currentSong ? 'pointer' : 'not-allowed',
              opacity: currentSong ? 1 : 0.4,
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '6px',
              transition: 'color 0.18s ease',
            }}
            onMouseEnter={(e) => {
              if (currentSong) e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              if (currentSong) e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <RotateCcw size={17} />
          </button>

          {/* Primary Play/Pause Button */}
          <button
            onClick={onPlayPause}
            disabled={!currentSong}
            title={isPlaying ? 'Jeda' : 'Putar'}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: currentSong ? 'var(--primary-blue)' : 'var(--bg-surface-secondary)',
              color: '#FFFFFF',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: currentSong ? 'pointer' : 'not-allowed',
              boxShadow: currentSong ? '0 4px 14px rgba(57, 120, 246, 0.4)' : 'none',
              transition: 'transform 0.15s ease, background-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (currentSong) {
                e.currentTarget.style.backgroundColor = 'var(--hover-blue)';
                e.currentTarget.style.transform = 'scale(1.05)';
              }
            }}
            onMouseLeave={(e) => {
              if (currentSong) {
                e.currentTarget.style.backgroundColor = 'var(--primary-blue)';
                e.currentTarget.style.transform = 'scale(1)';
              }
            }}
          >
            {isPlaying ? (
              <Pause size={18} fill="#FFFFFF" />
            ) : (
              <Play size={18} fill="#FFFFFF" style={{ marginLeft: '2px' }} />
            )}
          </button>

          {/* Next Track */}
          <button
            onClick={onSkip}
            title="Lewati Lagu (Next)"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: currentSong ? 'pointer' : 'not-allowed',
              opacity: currentSong ? 1 : 0.4,
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '6px',
              transition: 'color 0.18s ease',
            }}
            onMouseEnter={(e) => {
              if (currentSong) e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              if (currentSong) e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <SkipForward size={18} />
          </button>

          {/* Repeat / Loop Toggle */}
          <button
            onClick={onLoop}
            title={`Mode Ulang: ${loopMode === 'track' ? 'Lagu Ini (Track)' : loopMode === 'queue' ? 'Seluruh Antrean (Queue)' : 'Mati (Off)'}`}
            style={{
              background: 'none',
              border: 'none',
              color: loopMode !== 'off' ? 'var(--primary-blue)' : 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              position: 'relative',
              borderRadius: '6px',
              transition: 'color 0.18s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = loopMode !== 'off' ? 'var(--hover-blue)' : 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = loopMode !== 'off' ? 'var(--primary-blue)' : 'var(--text-muted)';
            }}
          >
            {loopMode === 'track' ? <Repeat1 size={17} /> : <Repeat size={17} />}
            {loopMode !== 'off' && (
              <span
                style={{
                  position: 'absolute',
                  bottom: '2px',
                  width: '4px',
                  height: '4px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary-blue)',
                  left: '50%',
                  transform: 'translateX(-50%)',
                }}
              />
            )}
          </button>

          {/* Autoplay Toggle */}
          <button
            onClick={onToggleAutoplay}
            title={autoplay ? 'Autoplay: Aktif (Otomatis memutar rekomendasi jika antrean habis)' : 'Autoplay: Nonaktif'}
            style={{
              background: 'none',
              border: 'none',
              color: autoplay ? 'var(--primary-blue)' : 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              position: 'relative',
              borderRadius: '6px',
              transition: 'color 0.18s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = autoplay ? 'var(--hover-blue)' : 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = autoplay ? 'var(--primary-blue)' : 'var(--text-muted)';
            }}
          >
            <Radio size={16} />
            {autoplay && (
              <span
                style={{
                  position: 'absolute',
                  bottom: '2px',
                  width: '4px',
                  height: '4px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary-blue)',
                  left: '50%',
                  transform: 'translateX(-50%)',
                }}
              />
            )}
          </button>

          {/* Stop Button */}
          <button
            onClick={onStop}
            title="Hentikan pemutaran bot & keluar voice"
            style={{
              background: 'none',
              border: 'none',
              color: currentSong ? 'var(--status-danger)' : 'var(--text-muted)',
              cursor: currentSong ? 'pointer' : 'not-allowed',
              opacity: currentSong ? 0.85 : 0.35,
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '6px',
              transition: 'all 0.18s ease',
            }}
            onMouseEnter={(e) => {
              if (currentSong) {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.transform = 'scale(1.08)';
              }
            }}
            onMouseLeave={(e) => {
              if (currentSong) {
                e.currentTarget.style.opacity = '0.85';
                e.currentTarget.style.transform = 'scale(1)';
              }
            }}
          >
            <Square size={14} fill="currentColor" />
          </button>
        </div>

        {/* Progress Bar & Time */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', minWidth: '32px', textAlign: 'right' }}>
            {formatTime(activeElapsed)}
          </span>
          <div
            style={{
              flex: 1,
              position: 'relative',
              height: '4px',
              backgroundColor: 'rgba(148, 163, 184, 0.2)',
              borderRadius: '999px',
              cursor: currentSong ? 'pointer' : 'default',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: `${progressPercent}%`,
                backgroundColor: 'var(--primary-blue)',
                borderRadius: '999px',
                transition: isDraggingSeek ? 'none' : 'width 0.15s linear',
              }}
            />
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={activeElapsed}
              disabled={!currentSong}
              onChange={handleSeekInput}
              onMouseUp={handleSeekRelease}
              onTouchEnd={handleSeekRelease}
              style={{
                position: 'absolute',
                top: '-6px',
                left: 0,
                width: '100%',
                height: '16px',
                opacity: 0,
                cursor: currentSong ? 'pointer' : 'default',
                margin: 0,
              }}
            />
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', minWidth: '32px' }}>
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* RIGHT: Volume & Panel Shortcuts */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', width: '280px', justifyContent: 'flex-end' }}>
        
        {/* Lyrics Panel Toggle */}
        <button
          onClick={() => setRightPanel(prev => prev === 'lyrics' ? null : 'lyrics')}
          title="Lirik Lagu (Karaoke)"
          style={{
            background: rightPanel === 'lyrics' ? 'var(--active-blue-bg)' : 'none',
            border: rightPanel === 'lyrics' ? '1px solid var(--active-blue-border)' : '1px solid transparent',
            color: rightPanel === 'lyrics' ? 'var(--soft-blue)' : 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '6px 8px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '12px',
            fontWeight: '600',
            transition: 'all 0.15s ease',
          }}
        >
          <Mic2 size={16} color={rightPanel === 'lyrics' ? 'var(--primary-blue)' : 'currentColor'} />
          <span style={{ fontSize: '11.5px' }}>Lirik</span>
        </button>

        {/* Queue Panel Toggle */}
        <button
          onClick={() => setRightPanel(prev => prev === 'queue' ? null : 'queue')}
          title="Daftar Antrean Lagu"
          style={{
            background: rightPanel === 'queue' ? 'var(--active-blue-bg)' : 'none',
            border: rightPanel === 'queue' ? '1px solid var(--active-blue-border)' : '1px solid transparent',
            color: rightPanel === 'queue' ? 'var(--soft-blue)' : 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '6px 8px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '12px',
            fontWeight: '600',
            transition: 'all 0.15s ease',
          }}
        >
          <ListMusic size={16} color={rightPanel === 'queue' ? 'var(--primary-blue)' : 'currentColor'} />
          <span style={{ fontSize: '11.5px' }}>Antrean</span>
          {queueCount > 0 && (
            <span
              style={{
                fontSize: '10px',
                fontWeight: '700',
                backgroundColor: rightPanel === 'queue' ? 'var(--primary-blue)' : 'var(--bg-surface-secondary)',
                color: rightPanel === 'queue' ? '#FFFFFF' : 'var(--text-muted)',
                padding: '1px 5px',
                borderRadius: '8px',
              }}
            >
              {queueCount}
            </span>
          )}
        </button>

        {/* Audio Equalizer Shortcut */}
        <button
          onClick={onToggleFilterModal}
          title="Audio Filter & Equalizer"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
        >
          <Sliders size={16} />
        </button>

        {/* Volume Slider Group (1 - 200%) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={toggleMute}
            title={localVolume === 0 ? 'Batal Bisukan' : 'Bisukan Suara'}
            style={{
              background: 'none',
              border: 'none',
              color: localVolume === 0 ? 'var(--text-muted)' : 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <VolumeIcon size={17} />
          </button>
          <input
            type="range"
            min={1}
            max={200}
            value={localVolume}
            onChange={handleVolumeInput}
            onMouseUp={handleVolumeRelease}
            onTouchEnd={handleVolumeRelease}
            style={{
              width: '76px',
              height: '4px',
              cursor: 'pointer',
            }}
          />
          <span
            style={{
              fontSize: '10.5px',
              fontWeight: '600',
              color: localVolume > 100 ? 'var(--soft-blue)' : 'var(--text-muted)',
              minWidth: '32px',
              textAlign: 'left',
            }}
          >
            {localVolume}%
          </span>
        </div>
      </div>
    </footer>
  );
};
