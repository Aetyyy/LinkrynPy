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
    <div className="w-[320px] bg-[#0E1726] border-l border-slate-700/30 flex flex-col h-full z-20 animate-slide-right">
      {/* Header */}
      <div className="p-4 px-5 border-b border-slate-700/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListMusic size={18} className="text-blue-500" />
          <h2 className="text-[15px] font-bold text-slate-100">
            Antrean Putar
          </h2>
          <span className="text-xs text-slate-400 font-medium">
            ({queue.length})
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {queue.length > 0 && (
            <button
              onClick={onClearQueue}
              title="Bersihkan seluruh antrean"
              className="text-red-400 hover:text-red-300 text-[11.5px] font-semibold cursor-pointer px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
            >
              Bersihkan
            </button>
          )}

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-md hover:bg-slate-800 transition-colors"
            title="Tutup Antrean"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 px-5 flex flex-col gap-4 scrollbar-thin scrollbar-thumb-slate-700">
        {/* Currently Playing Card */}
        {currentSong && (
          <div>
            <p className="text-[11px] uppercase text-slate-400 font-bold tracking-wider mb-2">
              Sedang Diputar
            </p>
            <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <img
                src={currentSong.thumbnail || 'https://via.placeholder.com/40'}
                alt=""
                className="w-10 h-10 rounded-md object-cover shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-blue-300 truncate" title={currentSong.title}>
                  {currentSong.title}
                </p>
                <p className="text-[11px] text-slate-400 truncate mt-0.5" title={currentSong.uploader || currentSong.artist}>
                  {currentSong.uploader || currentSong.artist}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Up Next List */}
        <div className="flex-1">
          <p className="text-[11px] uppercase text-slate-400 font-bold tracking-wider mb-2">
            Berikutnya ({queue.length})
          </p>

          {queue.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <p className="text-[13px]">Antrean kosong.</p>
              <p className="text-[11.5px] mt-1 text-slate-500">Cari lagu atau putar dari rekomendasi.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {queue.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2.5 p-2 px-2.5 rounded-lg bg-[#131E30] hover:bg-[#1A263B] border border-slate-700/30 transition-colors"
                >
                  <span className="text-[11px] text-slate-400 min-w-[16px] font-medium">
                    {idx + 1}
                  </span>
                  <img
                    src={item.thumbnail || 'https://via.placeholder.com/36'}
                    alt=""
                    className="w-9 h-9 rounded-md object-cover shrink-0"
                  />
                  <div
                    onClick={() => onPlaySong(item)}
                    className="min-w-0 flex-1 cursor-pointer"
                  >
                    <p className="text-[12.5px] font-semibold text-slate-100 truncate" title={item.title}>
                      {item.title}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate" title={item.uploader || item.artist}>
                      {item.uploader || item.artist}
                    </p>
                  </div>
                  <button
                    onClick={() => onRemoveItem(idx + 1)}
                    title="Hapus dari antrean"
                    className="text-slate-400 hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition-colors"
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
