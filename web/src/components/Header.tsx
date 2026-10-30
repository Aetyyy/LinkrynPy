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
import { Track, User, PlayerStatus } from '../types/music';

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
    <header
      style={{
        height: '64px',
        backgroundColor: 'var(--bg-main)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        gap: '20px',
        zIndex: 15,
      }}
    >
      {/* Search Input Bar */}
      <div ref={searchContainerRef} style={{ flex: 1, maxWidth: '440px', position: 'relative' }}>
        <form onSubmit={onSearchSubmit} style={{ display: 'flex', alignItems: 'center', position: 'relative', width: '100%' }}>
          <Search
            size={16}
            color="var(--text-muted)"
            style={{ position: 'absolute', left: '14px', pointerEvents: 'none' }}
          />
          <input
            type="text"
            placeholder="Cari lagu, artis, playlist, atau tempel link..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (searchSuggestions.length > 0) setShowSearchDropdown(true);
            }}
            style={{
              width: '100%',
              padding: '9px 36px 9px 38px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontSize: '13px',
              outline: 'none',
              transition: 'border-color 0.18s ease, background 0.18s ease',
            }}
            onFocusCapture={(e) => {
              e.currentTarget.style.borderColor = 'var(--primary-blue)';
              e.currentTarget.style.backgroundColor = 'var(--bg-surface-elevated)';
            }}
            onBlurCapture={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
              e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setShowSearchDropdown(false);
              }}
              style={{
                position: 'absolute',
                right: '10px',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px',
              }}
            >
              <X size={14} />
            </button>
          )}
        </form>

        {/* Live Search Suggestions Dropdown */}
        {showSearchDropdown && searchSuggestions.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '46px',
              left: 0,
              right: 0,
              backgroundColor: 'var(--bg-surface-elevated)',
              borderRadius: '10px',
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid var(--border-subtle)',
              zIndex: 999,
              overflow: 'hidden',
              maxHeight: '360px',
              overflowY: 'auto',
            }}
            className="animate-fade-in"
          >
            <div
              style={{
                padding: '8px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>
                Hasil Cepat
              </span>
              <span
                onClick={onSearchSubmit}
                style={{ fontSize: '11px', color: 'var(--primary-blue)', cursor: 'pointer', fontWeight: '600' }}
              >
                Enter untuk hasil lengkap ↵
              </span>
            </div>

            {searchSuggestions.map((item, idx) => (
              <div
                key={item.url || idx}
                onContextMenu={(e) => onContextMenuTrack(e, item)}
                onClick={() => onSelectSuggestion(item)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '9px 14px',
                  cursor: 'pointer',
                  borderBottom: idx < searchSuggestions.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <img
                  src={item.thumbnail || 'https://via.placeholder.com/40'}
                  alt=""
                  style={{ width: '38px', height: '38px', borderRadius: '6px', objectFit: 'cover' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.title}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.artist || item.uploader || 'Artis'}
                  </p>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', paddingRight: '4px' }}>
                  {item.duration_str}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleLike(item);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    color: isSongLiked(item.url) ? 'var(--primary-blue)' : 'var(--text-muted)',
                  }}
                  title={isSongLiked(item.url) ? 'Hapus dari disukai' : 'Sukai lagu'}
                >
                  <Heart size={15} fill={isSongLiked(item.url) ? 'var(--primary-blue)' : 'none'} />
                </button>
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--primary-blue)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Play size={12} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: '1px' }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Voice Status & Top Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        
        {/* Discord Voice Presence Badge */}
        {status?.user_voice ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--active-blue-bg)',
              border: '1px solid var(--active-blue-border)',
              borderRadius: '20px',
              padding: '5px 12px',
              fontSize: '12px',
              color: 'var(--soft-blue)',
              fontWeight: '600',
            }}
          >
            <Headphones size={13} color="var(--primary-blue)" />
            <span>#{status.user_voice.channel_name}</span>
          </div>
        ) : status?.voice_channel ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '20px',
              padding: '5px 12px',
              fontSize: '12px',
              color: 'var(--text-secondary)',
            }}
          >
            <Headphones size={13} color="var(--text-muted)" />
            <span>Bot: #{status.voice_channel}</span>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              borderRadius: '20px',
              padding: '5px 12px',
              fontSize: '11.5px',
              color: 'var(--status-warning)',
              fontWeight: '500',
            }}
          >
            <AlertCircle size={13} />
            <span>Belum masuk Voice Channel</span>
          </div>
        )}

        {/* User Account Login / Logout (Top Right) */}
        {currentUser ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '4px 8px 4px 6px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '24px',
            }}
          >
            <div style={{ position: 'relative', width: '28px', height: '28px', flexShrink: 0 }}>
              <img
                src={currentUser.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                alt={currentUser.username}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  bottom: '-1px',
                  right: '-1px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--status-success)',
                  border: '1.5px solid var(--bg-surface)',
                }}
              />
            </div>
            <span
              style={{
                fontSize: '12.5px',
                fontWeight: '600',
                color: 'var(--text-primary)',
                maxWidth: '120px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={currentUser.display_name || currentUser.username}
            >
              {currentUser.display_name || currentUser.username}
            </span>
            <button
              onClick={onLogout}
              title="Keluar dari akun Discord (Logout)"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '5px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.18s ease, background-color 0.18s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--status-danger)';
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-muted)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <LogOut size={15} />
            </button>
          </div>
        ) : (
          <button
            onClick={onLogin}
            title="Masuk dengan Akun Discord"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              padding: '7px 14px',
              borderRadius: '20px',
              backgroundColor: 'var(--primary-blue)',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '12.5px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(57, 120, 246, 0.3)',
              transition: 'all 0.18s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--hover-blue)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--primary-blue)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <LogIn size={14} />
            <span>Masuk Akun</span>
          </button>
        )}
      </div>
    </header>
  );
};
