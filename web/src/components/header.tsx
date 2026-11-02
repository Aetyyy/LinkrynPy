import React, { useRef, useEffect } from 'react';
import { 
  Search, 
  X, 
  Play, 
  Headphones, 
  AlertCircle, 
  Heart,
  LogIn,
  LogOut
} from 'lucide-react';
import type { Track, User, PlayerStatus } from '../types/musicTypes';

interface HeaderProps {
  query: string;
  setQuery: (q: string) => void;
  onSearchSubmit: (e?: React.FormEvent) => void;
  searchSuggestions: Track[];
  showSearchDropdown: boolean;
  setShowSearchDropdown: (show: boolean) => void;
  onSelectSuggestion: (track: Track) => void;
  onContextMenuTrack: (e: React.MouseEvent, track: Track) => void;
  onToggleLike: (track: Track) => void;
  isSongLiked: (url: string) => boolean;
  status: PlayerStatus | null;
  currentUser: User | null;
  onLogin: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  query,
  setQuery,
  onSearchSubmit,
  searchSuggestions,
  showSearchDropdown,
  setShowSearchDropdown,
  onSelectSuggestion,
  onContextMenuTrack,
  onToggleLike,
  isSongLiked,
  status,
  currentUser,
  onLogin,
  onLogout,
}) => {
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setShowSearchDropdown]);

  return (
    <header className="h-16 bg-[#0B1220] border-b border-slate-700/20 flex items-center justify-between px-7 gap-5 z-15">
      {/* Search Input Bar */}
      <div ref={searchContainerRef} className="flex-1 max-w-[440px] relative">
        <form onSubmit={onSearchSubmit} className="flex items-center relative w-full">
          <Search
            size={16}
            className="absolute left-3.5 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Cari lagu, artis, playlist, atau tempel link..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (searchSuggestions.length > 0) setShowSearchDropdown(true);
            }}
            className="w-full py-2.5 pl-10 pr-9 bg-[#111B2D] border border-slate-700/30 rounded-xl text-slate-100 text-[13px] placeholder:text-slate-500 focus:outline-none focus:border-[#3978F6] focus:bg-[#152238] transition-all"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setShowSearchDropdown(false);
              }}
              className="absolute right-2.5 text-slate-400 hover:text-slate-100 p-1 cursor-pointer transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </form>

        {/* Live Search Suggestions Dropdown */}
        {showSearchDropdown && searchSuggestions.length > 0 && (
          <div className="absolute top-12 left-0 right-0 bg-[#152238] rounded-xl shadow-2xl border border-slate-700/30 z-[999] overflow-hidden max-h-[360px] overflow-y-auto animate-fade-in">
            <div className="p-3 px-3.5 flex justify-between items-center border-b border-slate-700/30">
              <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">
                Hasil Cepat
              </span>
              <button
                type="button"
                onClick={() => onSearchSubmit()}
                className="text-[11px] text-[#3978F6] hover:text-[#528CFF] cursor-pointer font-semibold bg-transparent border-none"
              >
                Enter untuk hasil lengkap ↵
              </button>
            </div>

            {searchSuggestions.map((item, idx) => (
              <div
                key={item.url || idx}
                onContextMenu={(e) => onContextMenuTrack(e, item)}
                onClick={() => onSelectSuggestion(item)}
                className={`flex items-center gap-3 p-2.5 px-3.5 cursor-pointer hover:bg-[#1E2D47] transition-colors ${
                  idx < searchSuggestions.length - 1 ? 'border-b border-slate-700/20' : ''
                }`}
              >
                <img
                  src={item.thumbnail || 'https://via.placeholder.com/40'}
                  alt=""
                  className="w-9.5 h-9.5 rounded-lg object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-semibold text-slate-100 truncate m-0">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate m-0">
                    {item.artist || item.uploader || 'Artis'}
                  </p>
                </div>
                <span className="text-[11px] text-slate-400 pr-1 shrink-0">
                  {item.duration_str}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleLike(item);
                  }}
                  className={`p-1 cursor-pointer transition-colors ${
                    isSongLiked(item.url) ? 'text-[#3978F6]' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title={isSongLiked(item.url) ? 'Hapus dari disukai' : 'Sukai lagu'}
                >
                  <Heart size={15} fill={isSongLiked(item.url) ? '#3978F6' : 'none'} />
                </button>
                <div className="w-6.5 h-6.5 rounded-full bg-[#2563EB] flex items-center justify-center shrink-0 shadow-sm">
                  <Play size={11} className="text-white fill-white ml-0.5" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Voice Status & Top Controls */}
      <div className="flex items-center gap-3.5">
        {/* Discord Voice Presence Badge */}
        {status?.user_voice ? (
          <div className="flex items-center gap-1.5 bg-[#3978F6]/15 border border-[#3978F6]/30 rounded-full py-1.5 px-3 text-xs text-[#8BB4FF] font-semibold">
            <Headphones size={13} className="text-[#3978F6]" />
            <span>#{status.user_voice.channel_name}</span>
          </div>
        ) : status?.voice_channel ? (
          <div className="flex items-center gap-1.5 bg-[#111B2D] border border-slate-700/30 rounded-full py-1.5 px-3 text-xs text-slate-300">
            <Headphones size={13} className="text-slate-400" />
            <span>Bot: #{status.voice_channel}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/25 rounded-full py-1.5 px-3 text-[11.5px] text-amber-400 font-medium">
            <AlertCircle size={13} />
            <span>Belum masuk Voice Channel</span>
          </div>
        )}

        {/* User Account Login / Logout (Top Right) */}
        {currentUser ? (
          <div className="flex items-center gap-2.5 py-1 pr-2 pl-1.5 bg-[#111B2D] border border-slate-700/30 rounded-full">
            <div className="relative w-7 h-7 shrink-0">
              <img
                src={currentUser.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                alt={currentUser.username}
                className="w-full h-full rounded-full object-cover border border-white/10"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-[#111B2D]" />
            </div>
            <span
              className="text-[12.5px] font-semibold text-slate-100 max-w-[120px] truncate"
              title={currentUser.display_name || currentUser.username}
            >
              {currentUser.display_name || currentUser.username}
            </span>
            <button
              type="button"
              onClick={onLogout}
              title="Keluar dari akun Discord (Logout)"
              className="p-1 rounded-full text-slate-400 hover:text-red-400 hover:bg-red-500/15 cursor-pointer transition-colors"
            >
              <LogOut size={15} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onLogin}
            title="Masuk dengan Akun Discord"
            className="flex items-center gap-2 py-1.5 px-3.5 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[12.5px] font-semibold cursor-pointer shadow-md transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            <LogIn size={14} />
            <span>Masuk Akun</span>
          </button>
        )}
      </div>
    </header>
  );
};
