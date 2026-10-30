export interface User {
  id: string;
  username: string;
  display_name?: string;
  avatar: string;
  token?: string;
  access_token?: string;
  current_guild_id?: string | null;
  current_voice_channel?: string | null;
}

export interface Guild {
  id: string;
  name: string;
  icon?: string | null;
  member_count?: number;
  is_connected?: boolean;
  user_is_member?: boolean;
  user_in_voice?: boolean;
  user_vc_name?: string | null;
  bot_voice_channel?: string | null;
}

export interface Track {
  id?: string | number;
  title: string;
  url: string;
  duration: number;
  duration_str?: string;
  thumbnail?: string | null;
  uploader?: string;
  artist?: string;
  is_liked?: boolean;
}

export interface CurrentTrack extends Track {
  elapsed: number;
  elapsed_str?: string;
  requester?: string;
}

export interface QueueItem extends Track {
  index: number;
  requester?: string;
}

export type BassBoostLevel = 'off' | 'soft' | 'medium' | 'hard';
export type EqualizerPreset = 'off' | 'pop' | 'rock' | 'classical' | 'jazz' | 'electronic' | 'vocal' | 'custom';
export type LoopMode = 'off' | 'track' | 'queue';

export interface AudioFilters {
  bass_boost: BassBoostLevel;
  equalizer: EqualizerPreset;
  custom_eq?: number[];
  nightcore: boolean;
  vaporwave: boolean;
  speed: number;
  treble: number;
  karaoke: boolean;
}

export interface UserVoicePresence {
  guild_id: string;
  channel_id: string;
  channel_name: string;
}

export interface PlayerStatus {
  connected: boolean;
  is_playing?: boolean;
  is_paused?: boolean;
  volume?: number;
  loop_mode?: LoopMode;
  shuffle?: boolean;
  autoplay?: boolean;
  current?: CurrentTrack | null;
  queue?: QueueItem[];
  guild_id?: string;
  guild_name?: string;
  guild?: {
    id: string;
    name: string;
    icon?: string | null;
  };
  voice_channel?: string | null;
  filters?: AudioFilters;
  user_voice?: UserVoicePresence | null;
  can_skip?: boolean;
}

export interface Playlist {
  id: string;
  name: string;
  song_count?: number;
  created_at?: string;
  thumbnail?: string | null;
}

export interface LyricLine {
  time?: number;
  text: string;
}

export interface LyricsInfo {
  isSynced: boolean;
  lines: LyricLine[];
  suggestedOffset?: number;
  lrcDuration?: number;
  videoDuration?: number;
}

export interface LyricsResponse {
  lyrics?: string;
  synced_lyrics?: string;
  title?: string;
  artist?: string;
  is_synced?: boolean;
  lrc_duration?: number;
  video_duration?: number;
  suggested_offset?: number;
}

export interface ToastMessage {
  text: string;
  isError?: boolean;
}

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  song: Track | null;
}

export type ActiveTab = 'home' | 'likes' | 'playlists' | 'history' | 'filters' | 'search';
export type RightPanelType = null | 'queue' | 'lyrics';

