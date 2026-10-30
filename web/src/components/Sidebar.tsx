import React from 'react';
import { 
  Home, 
  Heart, 
  Folder, 
  History, 
  Sliders, 
  Disc3,
  Headphones,
  AlertCircle
} from 'lucide-react';
import { ActiveTab, PlayerStatus, User } from '../types/music';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  status: PlayerStatus | null;
  likedCount: number;
  currentUser?: User | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  status,
  likedCount,
}) => {
  const navItems = [
    { id: 'home' as ActiveTab, label: 'Beranda & Rekomendasi', icon: Home },
    { id: 'likes' as ActiveTab, label: 'Lagu yang Disukai', icon: Heart, badge: likedCount > 0 ? likedCount : undefined },
    { id: 'playlists' as ActiveTab, label: 'Koleksi Playlist', icon: Folder },
    { id: 'history' as ActiveTab, label: 'Riwayat Pemutaran', icon: History },
    { id: 'filters' as ActiveTab, label: 'Audio Filter & EQ', icon: Sliders },
  ];

  // Auto-detected server & voice channel directly from live status
  const serverName = status?.guild?.name || status?.guild_name || 'Menghubungkan Server...';
  const userVoiceChannel = status?.user_voice?.channel_name;
  const botVoiceChannel = status?.voice_channel;
  const isUserInVoice = Boolean(userVoiceChannel);

  return (
    <aside
      style={{
        width: '260px',
        backgroundColor: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px 20px 16px',
        flexShrink: 0,
        zIndex: 20,
      }}
    >
      {/* Brand & Emblem */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 8px', marginBottom: '22px' }}>
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            backgroundColor: 'var(--primary-blue)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(57, 120, 246, 0.35)',
          }}
        >
          <Disc3 size={22} color="#FFFFFF" className="animate-spin-slow" />
        </div>
        <div>
          <h1 style={{ fontSize: '17px', fontWeight: '700', letterSpacing: '-0.3px', color: 'var(--text-primary)' }}>
            Linkryn
          </h1>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' }}>
            Discord Music Player
          </p>
        </div>
      </div>

      {/* Auto-detected Discord Server & Voice Channel Card (No manual selector) */}
      <div
        style={{
          padding: '12px 14px',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: '10px',
          border: '1px solid var(--border-subtle)',
          marginBottom: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isUserInVoice ? 'var(--status-success)' : 'var(--primary-blue)',
              boxShadow: isUserInVoice ? '0 0 8px rgba(16, 185, 129, 0.7)' : '0 0 8px rgba(57, 120, 246, 0.5)',
              flexShrink: 0,
            }}
          />
          <p
            style={{
              fontSize: '13px',
              fontWeight: '700',
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              margin: 0,
            }}
            title={serverName}
          >
            {serverName}
          </p>
        </div>

        {/* Live Voice Channel Status */}
        {userVoiceChannel ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--active-blue-bg)',
              border: '1px solid var(--active-blue-border)',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '11.5px',
              color: 'var(--soft-blue)',
              fontWeight: '600',
            }}
          >
            <Headphones size={13} color="var(--primary-blue)" />
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              #{userVoiceChannel}
            </span>
          </div>
        ) : botVoiceChannel ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--bg-surface-secondary)',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '11.5px',
              color: 'var(--text-secondary)',
            }}
          >
            <Headphones size={13} color="var(--text-muted)" />
            <span>Bot: #{botVoiceChannel}</span>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '2px 0',
              fontSize: '11px',
              color: 'var(--status-warning)',
            }}
          >
            <AlertCircle size={12} />
            <span>Belum masuk Voice Channel</span>
          </div>
        )}
      </div>

      {/* Navigation List */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflowY: 'auto' }}>
        <p style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', padding: '0 10px 6px 10px', letterSpacing: '0.6px' }}>
          Menu Utama
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isActive ? 'var(--active-blue-bg)' : 'transparent',
                color: isActive ? 'var(--soft-blue)' : 'var(--text-secondary)',
                fontWeight: isActive ? '600' : '500',
                fontSize: '13.5px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.18s ease',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              <Icon size={18} color={isActive ? 'var(--primary-blue)' : 'currentColor'} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge !== undefined && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    backgroundColor: isActive ? 'var(--primary-blue)' : 'var(--bg-surface-secondary)',
                    color: isActive ? '#FFFFFF' : 'var(--text-muted)',
                    padding: '2px 7px',
                    borderRadius: '10px',
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer: System Status */}
      <div
        style={{
          marginTop: 'auto',
          paddingTop: '16px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: 'var(--text-muted)',
            fontWeight: '500',
            padding: '0 4px',
          }}
        >
          <span>Linkryn Engine</span>
          <span style={{ color: 'var(--primary-blue)', fontWeight: '600' }}>v2.0 Pro</span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '11px',
            color: 'var(--text-secondary)',
            padding: '7px 10px',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: status?.connected ? 'var(--status-success)' : 'var(--text-muted)',
              boxShadow: status?.connected ? '0 0 6px rgba(16, 185, 129, 0.6)' : 'none',
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: '11px', fontWeight: '500' }}>
            {status?.connected ? 'Audio Gateway Active' : 'Audio Gateway Idle'}
          </span>
        </div>
      </div>
    </aside>
  );
};
