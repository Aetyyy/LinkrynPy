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
    <footer className="h-[84px] bg-[#10192A] border-t border-slate-700/30 flex items-center justify-between px-7 z-25 relative shadow-2xl">
      {/* LEFT: Current Track Metadata */}
      <div className="flex items-center gap-3.5 w-[280px] min-w-0">
        {currentSong ? (
          <>
            <div className="relative w-12.5 h-12.5 shrink-0">
              <img
                src={currentSong.thumbnail || 'https://via.placeholder.com/50'}
                alt={currentSong.title}
                className="w-full h-full rounded-lg object-cover shadow-sm"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold text-slate-100 truncate" title={currentSong.title}>
                {currentSong.title}
              </p>
              <p className="text-[11.5px] text-slate-400 truncate mt-0.5" title={currentSong.uploader || currentSong.artist || 'Artis'}>
                {currentSong.uploader || currentSong.artist || 'Artis'}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={onToggleLikeCurrent}
                title={isCurrentLiked ? 'Hapus dari Lagu yang Disukai' : 'Sukai Lagu'}
                className="p-1.5 rounded-full hover:bg-slate-800 transition-colors"
              >
                <Heart size={18} className={isCurrentLiked ? 'text-blue-500 fill-blue-500' : 'text-slate-400 hover:text-slate-200'} />
              </button>
              <button
                onClick={() => onOpenAddToPlaylist(currentSong)}
                title="Tambah ke Playlist"
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <FolderPlus size={16} />
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2.5">
            <div className="w-11 h-11 rounded-lg bg-[#172234] flex items-center justify-center text-slate-500">
              <Music2 size={20} />
            </div>
            <div>
              <p className="text-[13px] font-medium text-slate-300">
                Tidak ada lagu aktif
              </p>
              <p className="text-[11px] text-slate-500">
                Pilih dari rekomendasi atau cari
              </p>
            </div>
          </div>
        )}
      </div>

      {/* CENTER: Playback Controls & Progress Timeline */}
      <div className="flex flex-col items-center gap-1.5 w-[45%] max-w-[560px]">
        {/* Buttons Row: Shuffle, Previous, Play/Pause, Next, Loop, Autoplay, Stop */}
        <div className="flex items-center gap-3.5">
          {/* Shuffle Toggle */}
          <button
            onClick={onShuffle}
            title={isShuffle ? 'Acak Antrean: Aktif' : 'Acak Antrean: Nonaktif'}
            disabled={!currentSong}
            className={`p-1.5 rounded-md transition-colors ${
              !currentSong ? 'opacity-40 cursor-not-allowed text-slate-500' : isShuffle ? 'text-blue-400 hover:text-blue-300' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shuffle size={16} />
          </button>

          {/* Previous / Rewind */}
          <button
            onClick={onPrevious}
            disabled={!currentSong}
            title="Putar Ulang / Sebelumnya"
            className={`p-1.5 rounded-md transition-colors ${
              !currentSong ? 'opacity-40 cursor-not-allowed text-slate-500' : 'text-slate-300 hover:text-slate-100'
            }`}
          >
            <RotateCcw size={17} />
          </button>

          {/* Primary Play/Pause Button */}
          <button
            onClick={onPlayPause}
            disabled={!currentSong}
            title={isPlaying ? 'Jeda' : 'Putar'}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              currentSong
                ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow-lg shadow-blue-600/30 hover:scale-105'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            {isPlaying ? (
              <Pause size={18} className="fill-white text-white" />
            ) : (
              <Play size={18} className="fill-white text-white ml-0.5" />
            )}
          </button>

          {/* Next Track */}
          <button
            onClick={onSkip}
            disabled={!currentSong}
            title="Lewati Lagu (Next)"
            className={`p-1.5 rounded-md transition-colors ${
              !currentSong ? 'opacity-40 cursor-not-allowed text-slate-500' : 'text-slate-300 hover:text-slate-100'
            }`}
          >
            <SkipForward size={18} />
          </button>

          {/* Repeat / Loop Toggle */}
          <button
            onClick={onLoop}
            title={`Mode Ulang: ${loopMode === 'track' ? 'Lagu Ini (Track)' : loopMode === 'queue' ? 'Seluruh Antrean (Queue)' : 'Mati (Off)'}`}
            className={`p-1.5 rounded-md relative transition-colors ${
              loopMode !== 'off' ? 'text-blue-400 hover:text-blue-300' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {loopMode === 'track' ? <Repeat1 size={17} /> : <Repeat size={17} />}
            {loopMode !== 'off' && (
              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-500" />
            )}
          </button>

          {/* Autoplay Toggle */}
          <button
            onClick={onToggleAutoplay}
            title={autoplay ? 'Autoplay: Aktif' : 'Autoplay: Nonaktif'}
            className={`p-1.5 rounded-md relative transition-colors ${
              autoplay ? 'text-blue-400 hover:text-blue-300' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio size={16} />
            {autoplay && (
              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-500" />
            )}
          </button>

          {/* Stop Button */}
          <button
            onClick={onStop}
            disabled={!currentSong}
            title="Hentikan pemutaran bot & keluar voice"
            className={`p-1.5 rounded-md transition-all ${
              currentSong ? 'text-red-400 hover:text-red-300 hover:scale-105 cursor-pointer' : 'text-slate-600 cursor-not-allowed'
            }`}
          >
            <Square size={14} className="fill-current" />
          </button>
        </div>

        {/* Progress Bar & Time */}
        <div className="flex items-center gap-2.5 w-full">
          <span className="text-[11px] text-slate-400 min-w-[32px] text-right font-medium">
            {formatTime(activeElapsed)}
          </span>
          <div className="flex-1 relative h-1 bg-slate-700/40 rounded-full cursor-pointer">
            <div
              className="absolute left-0 top-0 h-full bg-blue-500 rounded-full transition-all"
              style={{
                width: `${progressPercent}%`,
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
              className="absolute -top-1.5 left-0 w-full h-4 opacity-0 cursor-pointer m-0"
            />
          </div>
          <span className="text-[11px] text-slate-400 min-w-[32px] font-medium">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* RIGHT: Volume & Panel Shortcuts */}
      <div className="flex items-center gap-3.5 w-[280px] justify-end">
        {/* Lyrics Panel Toggle */}
        <button
          onClick={() => setRightPanel(prev => prev === 'lyrics' ? null : 'lyrics')}
          title="Lirik Lagu (Karaoke)"
          className={`px-2 py-1.5 rounded-md flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors ${
            rightPanel === 'lyrics'
              ? 'bg-blue-500/15 border border-blue-500/30 text-blue-300'
              : 'border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Mic2 size={16} className={rightPanel === 'lyrics' ? 'text-blue-400' : 'text-slate-400'} />
          <span className="text-[11.5px]">Lirik</span>
        </button>

        {/* Queue Panel Toggle */}
        <button
          onClick={() => setRightPanel(prev => prev === 'queue' ? null : 'queue')}
          title="Daftar Antrean Lagu"
          className={`px-2 py-1.5 rounded-md flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors ${
            rightPanel === 'queue'
              ? 'bg-blue-500/15 border border-blue-500/30 text-blue-300'
              : 'border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <ListMusic size={16} className={rightPanel === 'queue' ? 'text-blue-400' : 'text-slate-400'} />
          <span className="text-[11.5px]">Antrean</span>
          {queueCount > 0 && (
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                rightPanel === 'queue' ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {queueCount}
            </span>
          )}
        </button>

        {/* Audio Equalizer Shortcut */}
        <button
          onClick={onToggleFilterModal}
          title="Audio Filter & Equalizer"
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Sliders size={16} />
        </button>

        {/* Volume Slider Group (1 - 200%) */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleMute}
            title={localVolume === 0 ? 'Batal Bisukan' : 'Bisukan Suara'}
            className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
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
            className="w-19 h-1 bg-slate-700/50 rounded-full cursor-pointer accent-blue-500"
          />
          <span
            className={`text-[10.5px] font-semibold min-w-[32px] text-left ${
              localVolume > 100 ? 'text-blue-400' : 'text-slate-400'
            }`}
          >
            {localVolume}%
          </span>
        </div>
      </div>
    </footer>
  );
};
