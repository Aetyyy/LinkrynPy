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

  const introOffsetVal = lyricsInfo.introOffset ?? lyricsInfo.suggestedOffset ?? 0;
  const hasIntroOffset = Math.abs(introOffsetVal) >= 1.0;
  const isIntroApplied = Boolean(hasIntroOffset && Math.abs(lyricsOffset - introOffsetVal) < 0.4);

  return (
    <div className="w-[380px] bg-[#0E1726] border-l border-slate-700/30 flex flex-col h-full z-20 relative animate-slide-right">
      {/* Header */}
      <div className="p-4 px-5 border-b border-slate-700/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mic2 size={18} className="text-blue-500" />
          <div>
            <h2 className="text-[15px] font-bold text-slate-100">
              Lirik Lagu
            </h2>
            <span className={`text-[10.5px] font-medium ${lyricsInfo.isSynced ? 'text-emerald-400' : 'text-slate-400'}`}>
              {lyricsInfo.isSynced ? '● Karaoke Sinkron' : 'Mode Baca'}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-md hover:bg-slate-800"
          title="Tutup Lirik"
        >
          <X size={18} />
        </button>
      </div>

      {/* Manual Lyrics Search Input */}
      <div className="p-2.5 px-4 border-b border-slate-700/30">
        <form onSubmit={handleSearchSubmit} className="flex gap-1.5">
          <input
            type="text"
            placeholder={currentSongTitle ? `Lirik "${currentSongTitle.slice(0, 20)}..."` : 'Cari judul lagu...'}
            value={customSearch}
            onChange={(e) => setCustomSearch(e.target.value)}
            className="flex-1 px-2.5 py-1.5 bg-[#172234] border border-slate-700/40 rounded-md text-slate-100 text-xs focus:outline-none focus:border-blue-500 transition-colors"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-semibold cursor-pointer transition-colors shadow-xs"
          >
            Cari
          </button>
        </form>
      </div>

      {/* Timing & Cutscene Synchronization Toolbar */}
      {lyricsInfo.isSynced && (
        <div className="p-2 px-4 bg-[#131E30] border-b border-slate-700/30 flex flex-col gap-2">
          {/* Smart Cutscene / SponsorBlock Detection Prompt */}
          {hasIntroOffset && (
            <div
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-[11px] transition-colors ${
                isIntroApplied
                  ? 'bg-blue-950/40 border border-blue-500/30 text-blue-300'
                  : 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Clock size={12} className={isIntroApplied ? 'text-blue-400' : 'text-amber-400'} />
                <span>
                  {isIntroApplied
                    ? `Intro offset aktif (+${introOffsetVal}s)`
                    : `Terdeteksi intro MV (+${introOffsetVal}s)`}
                </span>
              </div>
              <button
                onClick={() => onLyricsOffsetChange(isIntroApplied ? 0 : introOffsetVal)}
                className={`px-2 py-0.5 rounded text-[10.5px] font-semibold cursor-pointer transition-colors ${
                  isIntroApplied
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-xs'
                }`}
              >
                {isIntroApplied ? 'Reset' : 'Terapkan'}
              </button>
            </div>
          )}

          {/* Precision Offset Fine-Tuning */}
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400 flex items-center gap-1">
              <span>Sinkron:</span>
              <strong className={`font-semibold ${lyricsOffset !== 0 ? 'text-blue-400' : 'text-slate-200'}`}>
                {lyricsOffset > 0 ? `+${lyricsOffset.toFixed(1)}s` : `${lyricsOffset.toFixed(1)}s`}
              </strong>
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => adjustOffset(-0.5)}
                title="Mundurkan lirik 0.5 detik (-0.5s)"
                className="px-2 py-0.5 rounded border border-slate-700/40 bg-[#172234] hover:bg-slate-800 text-slate-200 cursor-pointer text-[10.5px] font-medium transition-colors"
              >
                -0.5s
              </button>
              <button
                onClick={() => onLyricsOffsetChange(0)}
                title="Reset offset ke 0s"
                className="px-1.5 py-0.5 rounded border border-slate-700/40 bg-[#172234] hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer text-[10.5px] flex items-center transition-colors"
              >
                <RotateCcw size={11} />
              </button>
              <button
                onClick={() => adjustOffset(0.5)}
                title="Majukan lirik 0.5 detik (+0.5s)"
                className="px-2 py-0.5 rounded border border-slate-700/40 bg-[#172234] hover:bg-slate-800 text-slate-200 cursor-pointer text-[10.5px] font-medium transition-colors"
              >
                +0.5s
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lyrics Content */}
      <div
        ref={scrollContainerRef}
        onScroll={handleContainerScroll}
        className="flex-1 overflow-y-auto p-6 px-5 flex flex-col gap-3.5 text-center relative scrollbar-thin scrollbar-thumb-slate-700"
      >
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <Mic2 size={32} className="text-blue-500 mx-auto mb-3 animate-spin-slow" />
            <p className="text-[13px]">Mencari lirik otomatis...</p>
          </div>
        ) : lyricsInfo.lines.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <p className="text-sm font-semibold text-slate-200">
              Lirik belum tersedia
            </p>
            <p className="text-xs mt-1.5 text-slate-400">
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
                className={`py-1 leading-relaxed transition-all duration-200 ${
                  isActive
                    ? 'text-[17px] font-bold text-blue-400 scale-[1.04]'
                    : 'text-[13.5px] font-normal text-slate-400 hover:text-slate-300'
                }`}
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
          className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-blue-600 hover:bg-blue-500 text-white rounded-full px-3.5 py-1.5 text-[11.5px] font-semibold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-black/40 z-30 transition-all animate-fade-in"
        >
          <ArrowDown size={13} />
          <span>Kembali ke lirik aktif</span>
        </button>
      )}
    </div>
  );
};
