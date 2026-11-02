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
import type { ActiveTab, PlayerStatus, User } from '../types/musicTypes';

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
    <aside className="w-65 bg-[#0A101C] border-r border-slate-700/20 flex flex-col p-6 pt-6 pb-5 shrink-0 z-20">
      {/* Brand & Emblem */}
      <div className="flex items-center gap-3 px-2 mb-5.5">
        <div className="w-9.5 h-9.5 rounded-xl bg-[#2563EB] flex items-center justify-center shadow-[0_4px_14px_rgba(37,99,235,0.35)] shrink-0">
          <Disc3 size={22} className="text-white animate-spin-slow" />
        </div>
        <div>
          <h1 className="text-[17px] font-bold tracking-tight text-slate-100 m-0">
            Linkryn
          </h1>
          <p className="text-[11px] text-slate-400 font-medium m-0">
            Discord Music Player
          </p>
        </div>
      </div>

      {/* Auto-detected Discord Server & Voice Channel Card */}
      <div className="p-3.5 bg-[#111B2D] rounded-xl border border-slate-700/30 mb-5 flex flex-col gap-1.5 shadow-sm">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              isUserInVoice ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]' : 'bg-[#3978F6] shadow-[0_0_8px_rgba(57,120,246,0.5)]'
            }`}
          />
          <p className="text-[13px] font-bold text-slate-100 truncate m-0" title={serverName}>
            {serverName}
          </p>
        </div>

        {/* Live Voice Channel Status */}
        {userVoiceChannel ? (
          <div className="flex items-center gap-1.5 bg-[#3978F6]/15 border border-[#3978F6]/30 rounded-md py-1 px-2 text-[11.5px] text-[#8BB4FF] font-semibold truncate">
            <Headphones size={13} className="text-[#3978F6] shrink-0" />
            <span className="truncate">#{userVoiceChannel}</span>
          </div>
        ) : botVoiceChannel ? (
          <div className="flex items-center gap-1.5 bg-[#17243A] rounded-md py-1 px-2 text-[11.5px] text-slate-300 truncate">
            <Headphones size={13} className="text-slate-400 shrink-0" />
            <span className="truncate">Bot: #{botVoiceChannel}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 py-0.5 text-[11px] text-amber-400 font-medium">
            <AlertCircle size={12} className="shrink-0" />
            <span className="truncate">Belum masuk Voice Channel</span>
          </div>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex flex-col gap-1 flex-1 overflow-y-auto">
        <p className="text-[10px] text-slate-400 uppercase font-bold px-2.5 pb-1.5 tracking-wider">
          Menu Utama
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-3 py-2.5 px-3 rounded-xl text-[13.5px] cursor-pointer text-left transition-colors border-none relative ${
                isActive
                  ? 'bg-[#3978F6]/15 text-[#8BB4FF] font-semibold'
                  : 'text-slate-300 font-medium hover:bg-[#1E2D47] hover:text-slate-100'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-[#3978F6]' : 'currentColor'} />
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge !== undefined && (
                <span
                  className={`text-[11px] font-bold py-0.5 px-2 rounded-full shrink-0 ${
                    isActive ? 'bg-[#2563EB] text-white' : 'bg-[#17243A] text-slate-400'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer: System Status */}
      <div className="mt-auto pt-4 border-t border-slate-700/20 flex flex-col gap-2">
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium px-1">
          <span>Linkryn Engine</span>
          <span className="text-[#3978F6] font-semibold">v2.0 Pro</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-300 py-1.5 px-2.5 bg-[#111B2D] rounded-lg border border-slate-700/30">
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              status?.connected ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]' : 'bg-slate-400'
            }`}
          />
          <span className="text-[11px] font-medium">
            {status?.connected ? 'Audio Gateway Active' : 'Audio Gateway Idle'}
          </span>
        </div>
      </div>
    </aside>
  );
};
