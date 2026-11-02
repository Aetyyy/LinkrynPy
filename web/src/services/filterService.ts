import type { AudioFilters } from '../types/musicTypes';

export const DEFAULT_AUDIO_FILTERS: AudioFilters = {
  bass_boost: 'off',
  equalizer: 'off',
  custom_eq: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  nightcore: false,
  vaporwave: false,
  speed: 1.0,
  treble: 0,
  karaoke: false,
};

export function normalizeCustomEq(value: unknown): number[] {
  if (!Array.isArray(value)) return DEFAULT_AUDIO_FILTERS.custom_eq || [];
  const bands = value.map((gain) => {
    const numericGain = Number(gain);
    return Number.isFinite(numericGain) ? Math.max(-12, Math.min(12, Math.round(numericGain))) : 0;
  });
  if (bands.length === 10) return bands;
  if (bands.length === 5) {
    return [bands[0], bands[0], bands[1], bands[1], bands[2], bands[2], bands[3], bands[3], bands[4], bands[4]];
  }
  return DEFAULT_AUDIO_FILTERS.custom_eq || [];
}

function getStorageKey(userId?: string): string {
  if (userId) {
    return `linkryn_filters_user_${userId}`;
  }
  return 'linkryn_filters_guest';
}

/**
 * Membaca filter audio tersimpan dari localStorage secara sinkron untuk mencegah reset visual saat refresh.
 */
export function loadFiltersFromStorage(userId?: string): AudioFilters {
  try {
    const key = getStorageKey(userId);
    const raw = localStorage.getItem(key) || localStorage.getItem('linkryn_filters_last');
    if (!raw) return DEFAULT_AUDIO_FILTERS;
    const parsed = JSON.parse(raw) as Partial<AudioFilters>;
    return {
      bass_boost: parsed.bass_boost || 'off',
      equalizer: parsed.equalizer || 'off',
      custom_eq: normalizeCustomEq(parsed.custom_eq),
      nightcore: Boolean(parsed.nightcore),
      vaporwave: Boolean(parsed.vaporwave),
      speed: typeof parsed.speed === 'number' ? parsed.speed : 1.0,
      treble: typeof parsed.treble === 'number' ? parsed.treble : 0,
      karaoke: Boolean(parsed.karaoke),
    };
  } catch {
    return DEFAULT_AUDIO_FILTERS;
  }
}

/**
 * Menyimpan filter audio ke localStorage per user agar tidak pernah tereset saat refresh.
 */
export function saveFiltersToStorage(filters: AudioFilters, userId?: string): void {
  try {
    const key = getStorageKey(userId);
    const json = JSON.stringify(filters);
    localStorage.setItem(key, json);
    localStorage.setItem('linkryn_filters_last', json);
  } catch (err) {
    console.error('Failed to save filters to localStorage:', err);
  }
}

/**
 * Mengambil filter audio permanen user dari server database.
 */
export async function fetchUserFiltersApi(apiBase: string, token?: string): Promise<AudioFilters | null> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${apiBase}/api/user/filters`, { headers });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.filters) {
      return data.filters as AudioFilters;
    }
    return null;
  } catch (err) {
    console.error('Failed to fetch user filters from API:', err);
    return null;
  }
}

/**
 * Menyimpan seluruh filter user ke server database.
 */
export async function saveUserFiltersApi(apiBase: string, filters: AudioFilters, token?: string): Promise<boolean> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${apiBase}/api/user/filters`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ filters }),
    });
    return res.ok;
  } catch (err) {
    console.error('Failed to save user filters to API:', err);
    return false;
  }
}

/**
 * Mengirim perubahan filter individual ke bot Discord & server backend.
 */
export async function applySingleFilterApi(
  apiBase: string,
  key: string,
  value: unknown,
  guildId?: string,
  token?: string
): Promise<boolean> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const q = guildId ? `?guild_id=${encodeURIComponent(guildId)}` : '';
    const res = await fetch(`${apiBase}/api/filter${q}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ filter: key, value, guild_id: guildId }),
    });
    return res.ok;
  } catch (err) {
    console.error('Failed to apply filter:', err);
    return false;
  }
}

