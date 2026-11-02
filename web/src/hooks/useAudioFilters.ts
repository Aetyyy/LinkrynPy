import { useState, useEffect, useCallback, useRef } from 'react';
import type { AudioFilters, EqualizerPreset, BassBoostLevel } from '../types/musicTypes';
import {
  DEFAULT_AUDIO_FILTERS,
  loadFiltersFromStorage,
  saveFiltersToStorage,
  fetchUserFiltersApi,
  applySingleFilterApi,
  normalizeCustomEq,
} from '../services/filterService';

interface UseAudioFiltersOptions {
  apiBase: string;
  userId?: string;
  token?: string;
  selectedGuildId?: string;
  serverFilters?: AudioFilters;
  serverUserFilters?: AudioFilters;
  onShowToast?: (message: string, isError?: boolean) => void;
}

export function useAudioFilters({
  apiBase,
  userId,
  token,
  selectedGuildId,
  serverFilters,
  serverUserFilters,
  onShowToast,
}: UseAudioFiltersOptions) {
  // 1. Inisialisasi sinkron dari localStorage: tidak pernah reset saat refresh
  const [filters, setFilters] = useState<AudioFilters>(() => {
    return loadFiltersFromStorage(userId);
  });

  const isUserInteractingRef = useRef<boolean>(false);

  // 2. Saat user login/berubah ID, muat filter spesifik milik user tersebut
  useEffect(() => {
    const saved = loadFiltersFromStorage(userId);
    setFilters(saved);

    // Ambil dari API jika token tersedia
    if (token) {
      fetchUserFiltersApi(apiBase, token).then((remoteFilters) => {
        if (remoteFilters) {
          setFilters(remoteFilters);
          saveFiltersToStorage(remoteFilters, userId);
        }
      });
    }
  }, [userId, token, apiBase]);

  // 3. Sinkronisasi dengan status server bot jika ada data baru dari websocket/status poll
  useEffect(() => {
    if (isUserInteractingRef.current) return;

    const candidate = serverUserFilters || serverFilters;
    if (candidate) {
      setFilters((prev) => {
        // Hanya update jika berbeda untuk mencegah re-render konstan
        const isDifferent =
          candidate.bass_boost !== prev.bass_boost ||
          candidate.equalizer !== prev.equalizer ||
          candidate.nightcore !== prev.nightcore ||
          candidate.vaporwave !== prev.vaporwave ||
          candidate.karaoke !== prev.karaoke ||
          Math.abs(candidate.speed - prev.speed) > 0.01 ||
          candidate.treble !== prev.treble ||
          (candidate.custom_eq && JSON.stringify(candidate.custom_eq) !== JSON.stringify(prev.custom_eq));

        if (isDifferent) {
          saveFiltersToStorage(candidate, userId);
          return candidate;
        }
        return prev;
      });
    }
  }, [serverUserFilters, serverFilters, userId]);

  // 4. Menerapkan perubahan filter (baik individual maupun custom_eq)
  const applyFilter = useCallback(
    async (key: string, value: unknown) => {
      isUserInteractingRef.current = true;

      setFilters((prev) => {
        const next: AudioFilters = { ...prev };
        if (key === 'bass_boost') {
          next.bass_boost = value as BassBoostLevel;
        } else if (key === 'equalizer') {
          next.equalizer = value as EqualizerPreset;
        } else if (key === 'custom_eq') {
          if (Array.isArray(value) && (value.length === 5 || value.length === 10)) {
            next.custom_eq = normalizeCustomEq(value);
            next.equalizer = 'custom';
          }
        } else if (key === 'nightcore') {
          next.nightcore = Boolean(value);
          if (next.nightcore) next.vaporwave = false;
        } else if (key === 'vaporwave') {
          next.vaporwave = Boolean(value);
          if (next.vaporwave) next.nightcore = false;
        } else if (key === 'speed') {
          next.speed = Math.max(0.5, Math.min(2.0, Number(value)));
        } else if (key === 'treble') {
          next.treble = Math.max(-10, Math.min(10, Number(value)));
        } else if (key === 'karaoke') {
          next.karaoke = Boolean(value);
        }

        saveFiltersToStorage(next, userId);
        return next;
      });

      // Kirim ke backend
      await applySingleFilterApi(apiBase, key, value, selectedGuildId, token);

      setTimeout(() => {
        isUserInteractingRef.current = false;
      }, 500);
    },
    [apiBase, selectedGuildId, token, userId]
  );

  // 5. Reset semua filter ke default normal
  const resetFilters = useCallback(async () => {
    isUserInteractingRef.current = true;
    setFilters(DEFAULT_AUDIO_FILTERS);
    saveFiltersToStorage(DEFAULT_AUDIO_FILTERS, userId);

    await applySingleFilterApi(apiBase, 'reset', null, selectedGuildId, token);
    if (onShowToast) {
      onShowToast('Seluruh filter audio di-reset ke normal.');
    }

    setTimeout(() => {
      isUserInteractingRef.current = false;
    }, 500);
  }, [apiBase, selectedGuildId, token, userId, onShowToast]);

  return {
    filters,
    applyFilter,
    resetFilters,
  };
}

