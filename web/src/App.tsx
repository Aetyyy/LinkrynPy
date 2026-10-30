import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { PlayerBar } from './components/PlayerBar';
import { HeroBanner } from './components/HeroBanner';
import { LikedSongsCarousel } from './components/LikedSongsCarousel';
import { RecommendationsView } from './components/RecommendationsView';
import { LikedSongsView } from './components/LikedSongsView';
import { PlaylistsView } from './components/PlaylistsView';
import { HistoryView } from './components/HistoryView';
import { SearchView } from './components/SearchView';
import { FilterEqualizerView } from './components/FilterEqualizerView';
import { QueuePanel } from './components/QueuePanel';
import { LyricsPanel } from './components/LyricsPanel';
import { ContextMenu } from './components/ContextMenu';
import { PlaylistModal } from './components/PlaylistModal';
import { LoginModal } from './components/LoginModal';
import { Toast } from './components/Toast';

import { 
  ActiveTab, 
  RightPanelType, 
  PlayerStatus, 
  Guild, 
  User, 
  Track, 
  Playlist, 
  LyricsResponse, 
  LyricsInfo,
  ToastMessage, 
  ContextMenuState,
  AudioFilters
} from './types/music';
import { parseLrc, parsePlainLyrics } from './utils/lrc';

const API_BASE = window.location.port === '5173' ? 'http://localhost:5000' : '';

const GENRE_CATEGORIES = [
  'Semua',
  'Pop Indonesia',
  'Dangdut Koplo',
  'Akustik Santai',
  'J-Pop / Anime',
  'K-Pop',
  'Rock / Metal'
];

export default function App() {
  // Navigation & View States
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [rightPanel, setRightPanel] = useState<RightPanelType>(null);
  const [toastMessage, setToastMessage] = useState<ToastMessage | null>(null);

  // Bot & Player State
  const [status, setStatus] = useState<PlayerStatus | null>(null);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [selectedGuild, setSelectedGuild] = useState<string>('');
  const [localElapsed, setLocalElapsed] = useState<number>(0);
  const [isSeeking, setIsSeeking] = useState<boolean>(false);

  // Search States
  const [query, setQuery] = useState<string>('');
  const [searchSuggestions, setSearchSuggestions] = useState<Track[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState<boolean>(false);
  const [currentSearchQuery, setCurrentSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [loadingSearch, setLoadingSearch] = useState<boolean>(false);

  // User & Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userToken, setUserToken] = useState<string>(() => localStorage.getItem('linkryn_token') || '');
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);

  // Liked Songs & Playlists
  const [likedSongs, setLikedSongs] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [playlistSongs, setPlaylistSongs] = useState<Track[]>([]);
  const [playlistModalSong, setPlaylistModalSong] = useState<Track | null>(null);
  const [isCreatePlaylistOnly, setIsCreatePlaylistOnly] = useState<boolean>(false);

  // Context Menu
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    song: null,
  });

  // Recommendations & History
  const [recommendations, setRecommendations] = useState<Track[]>([]);
  const [loadingRecs, setLoadingRecs] = useState<boolean>(false);
  const [selectedGenreCategory, setSelectedGenreCategory] = useState<string>('Semua');
  const [historyList, setHistoryList] = useState<Track[]>([]);

  // Lyrics
  const [lyricsData, setLyricsData] = useState<LyricsResponse | null>(null);
  const [loadingLyrics, setLoadingLyrics] = useState<boolean>(false);
  const [lyricsOffset, setLyricsOffset] = useState<number>(0);
  const lastFetchedSongRef = useRef<string>('');
  const lastTrackUrlRef = useRef<string>('');
  const wsRef = useRef<WebSocket | null>(null);

  const showToast = (text: string, isError = false) => {
    setToastMessage({ text, isError });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const getHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (userToken) headers['Authorization'] = `Bearer ${userToken}`;
    return headers;
  };

  // 1. Initial OAuth Token check
  useEffect(() => {
    // 1a. Code Callback Query Param (?token=...)
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    if (tokenParam) {
      localStorage.setItem('linkryn_token', tokenParam);
      setUserToken(tokenParam);
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    // 1b. Implicit Grant Hash Fragment (#access_token=...)
    if (window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      if (accessToken) {
        window.history.replaceState({}, document.title, window.location.pathname);
        fetch(`${API_BASE}/api/auth/token_exchange`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: accessToken }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.token) {
              localStorage.setItem('linkryn_token', data.token);
              setUserToken(data.token);
              setCurrentUser(data.user);
              showToast(`Selamat datang, ${data.user.display_name || data.user.username}!`);
            } else {
              showToast('Gagal memproses autentikasi Discord.', true);
            }
          })
          .catch((err) => {
            console.error('OAuth token exchange error:', err);
            showToast('Gagal memproses login Discord.', true);
          });
      }
    }
  }, []);

  // 2. Fetch Current User
  const fetchCurrentUser = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, { headers: getHeaders() });
      const data = await res.json();
      if (data && data.user) {
        setCurrentUser(data.user);
        if (data.user.current_guild_id) {
          setSelectedGuild(data.user.current_guild_id);
        }
      } else {
        setCurrentUser(null);
      }
    } catch (err) {
      console.error('Failed to fetch user:', err);
      setCurrentUser(null);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, [userToken]);

  // 3. Fetch Guilds
  const fetchGuilds = () => {
    fetch(`${API_BASE}/api/guilds`, { headers: getHeaders() })
      .then((res) => res.json())
      .then((data) => {
        const gList: Guild[] = data.guilds || [];
        setGuilds(gList);
        if (gList.length > 0 && !selectedGuild) {
          const active = gList.find((g) => g.user_in_voice) || gList.find((g) => g.user_is_member) || gList[0];
          if (active) setSelectedGuild(active.id);
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchGuilds();
  }, [currentUser]);

  // Monotonic time synchronization to eliminate backward jumps ("maju mundur")
  const syncElapsed = (serverElapsed: number, trackUrl?: string, isPaused?: boolean) => {
    if (isSeeking) return;

    if (trackUrl && trackUrl !== lastTrackUrlRef.current) {
      lastTrackUrlRef.current = trackUrl;
      setLocalElapsed(serverElapsed);
      return;
    }

    if (isPaused) {
      setLocalElapsed(serverElapsed);
      return;
    }

    setLocalElapsed((currentLocal) => {
      const diff = serverElapsed - currentLocal;
      // Jika selisih besar (> 2.0 detik), pengguna melakukan seek atau skip di Discord
      if (Math.abs(diff) > 2.0) {
        return serverElapsed;
      }
      // Jika waktu lokal tertinggal dari server > 0.6s, sesuaikan maju ke server
      if (diff > 0.6) {
        return serverElapsed;
      }
      // Jika serverElapsed sedikit lebih kecil akibat latensi jaringan, JANGAN PERNAH MUNDUR
      return currentLocal;
    });
  };

  // 4. WebSocket & Status Polling
  useEffect(() => {
    let ws: WebSocket | null = null;
    let fallbackInterval: ReturnType<typeof setInterval> | null = null;
    let isMounted = true;

    const connectWS = () => {
      if (!isMounted) return;
      try {
        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.port === '5173' ? 'localhost:5000' : window.location.host;
        const wsUrl = `${proto}//${host}/ws?token=${userToken || ''}${selectedGuild ? `&guild_id=${selectedGuild}` : ''}`;

        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'STATUS_UPDATE' && isMounted) {
              const data = msg.data;
              setStatus(data);
              if (data?.current) {
                syncElapsed(data.current.elapsed || 0, data.current.url, Boolean(data.is_paused));
              }
            }
          } catch (e) {
            console.error('WS Parse Error', e);
          }
        };

        ws.onclose = () => {
          if (isMounted) setTimeout(connectWS, 3000);
        };
      } catch (e) {
        console.error('WS Connection Error', e);
      }
    };

    connectWS();

    fallbackInterval = setInterval(() => {
      const url = selectedGuild ? `${API_BASE}/api/status?guild_id=${selectedGuild}` : `${API_BASE}/api/status`;
      fetch(url, { headers: getHeaders() })
        .then((res) => res.json())
        .then((data) => {
          if (isMounted) {
            setStatus(data);
            if (data?.current) {
              syncElapsed(data.current.elapsed || 0, data.current.url, Boolean(data.is_paused));
            }
          }
        })
        .catch(() => {});
    }, 2500);

    return () => {
      isMounted = false;
      if (ws) ws.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, [selectedGuild, userToken, isSeeking]);

  // 5. Playing Progress Tick (High-Resolution 200ms monotonic clock)
  useEffect(() => {
    if (!status?.is_playing || status?.is_paused || isSeeking) return;
    let lastTime = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      const deltaSec = (now - lastTime) / 1000;
      lastTime = now;
      setLocalElapsed((prev) => {
        const dur = status?.current?.duration || 0;
        const nextVal = prev + deltaSec;
        if (dur > 0 && nextVal >= dur) return dur;
        return nextVal;
      });
    }, 200);
    return () => clearInterval(timer);
  }, [status?.is_playing, status?.is_paused, isSeeking, status?.current?.duration]);

  // 6. Generic API Call Handler
  const apiCall = async (endpoint: string, body: Record<string, unknown> = {}): Promise<boolean> => {
    try {
      const q = selectedGuild ? `?guild_id=${encodeURIComponent(selectedGuild)}` : '';
      const res = await fetch(`${API_BASE}/api/${endpoint}${q}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ ...body, guild_id: selectedGuild }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        showToast(data.error || 'Terjadi kesalahan.', true);
        if (res.status === 401 && !currentUser) {
          setShowLoginModal(true);
        }
        return false;
      }
      if (endpoint === 'skip') {
        showToast(`⏭️ Lagu dilewati! (${data.reason || 'Sukses'})`);
      }
      // Quick refresh
      const url = selectedGuild ? `${API_BASE}/api/status?guild_id=${selectedGuild}` : `${API_BASE}/api/status`;
      const sRes = await fetch(url, { headers: getHeaders() });
      const sData = await sRes.json();
      setStatus(sData);
      return true;
    } catch (err) {
      console.error(err);
      showToast('Gagal menghubungi server bot.', true);
      return false;
    }
  };

  // 7. Search Debounce
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2 || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      setSearchSuggestions([]);
      setShowSearchDropdown(false);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(trimmed)}&limit=6`, { headers: getHeaders() });
        const data = await res.json();
        setSearchSuggestions(data.results || []);
        setShowSearchDropdown(true);
      } catch (e) {
        console.error(e);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setShowSearchDropdown(false);

    // Direct stream link
    if (q.startsWith('http://') || q.startsWith('https://') || q.startsWith('spotify:')) {
      apiCall('play', { query: q });
      setQuery('');
      return;
    }

    setCurrentSearchQuery(q);
    setActiveTab('search');
    setLoadingSearch(true);
    try {
      const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(q)}&limit=16`, { headers: getHeaders() });
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (err) {
      console.error(err);
      showToast('Gagal mencari lagu.', true);
    } finally {
      setLoadingSearch(false);
    }
  };

  // 8. Liked Songs Management
  const isSongLiked = (songUrl: string): boolean => {
    if (!songUrl) return false;
    return likedSongs.some((s) => s.url === songUrl || (s.url && songUrl && (s.url.includes(songUrl) || songUrl.includes(s.url))));
  };

  const loadLikedSongs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/likes`, { headers: getHeaders() });
      const data = await res.json();
      setLikedSongs(data.liked_songs || []);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleLikeSong = async (song: Track) => {
    if (!song || !song.url) return;
    const isLiked = isSongLiked(song.url);
    if (isLiked) {
      await fetch(`${API_BASE}/api/likes?url=${encodeURIComponent(song.url)}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      setLikedSongs((prev) => prev.filter((s) => s.url !== song.url));
      showToast('Dihapus dari Lagu yang Disukai.');
      if (status?.current?.url === song.url) {
        setStatus((prev) => (prev ? { ...prev, current: prev.current ? { ...prev.current, is_liked: false } : null } : null));
      }
    } else {
      const songPayload = {
        title: song.title || 'Unknown Title',
        url: song.url,
        artist: song.uploader || song.artist || 'Artis',
        uploader: song.uploader || song.artist || 'Artis',
        duration: song.duration || 0,
        thumbnail: song.thumbnail || null,
      };
      await fetch(`${API_BASE}/api/likes`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ song: songPayload }),
      });
      showToast('💙 Ditambahkan ke Lagu yang Disukai!');
      loadLikedSongs();
      if (status?.current?.url === song.url) {
        setStatus((prev) => (prev ? { ...prev, current: prev.current ? { ...prev.current, is_liked: true } : null } : null));
      }
    }
  };

  const toggleLikeCurrent = async () => {
    if (!status?.current) return;
    await toggleLikeSong({
      title: status.current.title,
      url: status.current.url,
      artist: status.current.uploader,
      uploader: status.current.uploader,
      duration: status.current.duration,
      thumbnail: status.current.thumbnail,
    });
  };

  const removeLikedSong = async (url: string) => {
    try {
      await fetch(`${API_BASE}/api/likes?url=${encodeURIComponent(url)}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      setLikedSongs((prev) => prev.filter((s) => s.url !== url));
      if (status?.current?.url === url) {
        setStatus((prev) => (prev ? { ...prev, current: prev.current ? { ...prev.current, is_liked: false } : null } : null));
      }
      showToast('Lagu dihapus dari koleksi.');
    } catch (e) {
      console.error(e);
    }
  };

  // 9. Playlists Management
  const loadPlaylists = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/playlists`, { headers: getHeaders() });
      const data = await res.json();
      setPlaylists(data.playlists || []);
    } catch (e) {
      console.error(e);
    }
  };

  const createPlaylist = async (name: string) => {
    if (!name.trim()) return;
    try {
      await fetch(`${API_BASE}/api/playlists`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ name: name.trim() }),
      });
      loadPlaylists();
      setPlaylistModalSong(null);
      setIsCreatePlaylistOnly(false);
      showToast('Playlist baru berhasil dibuat!');
    } catch (e) {
      console.error(e);
    }
  };

  const deletePlaylist = async (id: string) => {
    if (!window.confirm('Yakin ingin menghapus playlist ini?')) return;
    try {
      await fetch(`${API_BASE}/api/playlists/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (selectedPlaylist?.id === id) setSelectedPlaylist(null);
      loadPlaylists();
      showToast('Playlist dihapus.');
    } catch (e) {
      console.error(e);
    }
  };

  const viewPlaylistSongs = async (pl: Playlist) => {
    setSelectedPlaylist(pl);
    try {
      const res = await fetch(`${API_BASE}/api/playlists/${pl.id}/songs`, { headers: getHeaders() });
      const data = await res.json();
      setPlaylistSongs(data.songs || []);
    } catch (e) {
      console.error(e);
    }
  };

  const removeSongFromPlaylist = async (playlistId: string, songId: string | number) => {
    try {
      const res = await fetch(`${API_BASE}/api/playlists/${playlistId}/songs/${songId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (res.ok) {
        showToast('Lagu dihapus dari playlist.');
        if (selectedPlaylist) viewPlaylistSongs(selectedPlaylist);
        loadPlaylists();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const addSongToPlaylist = async (playlistId: string, song: Track) => {
    if (!song || !playlistId) return;
    try {
      const res = await fetch(`${API_BASE}/api/playlists/${playlistId}/songs`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          song: {
            title: song.title || 'Unknown Title',
            url: song.url,
            thumbnail: song.thumbnail || '',
            duration: song.duration || 0,
            uploader: song.uploader || song.artist || 'Artis',
          },
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Lagu berhasil ditambahkan ke playlist!');
        setPlaylistModalSong(null);
        loadPlaylists();
        if (selectedPlaylist && selectedPlaylist.id === playlistId) {
          viewPlaylistSongs(selectedPlaylist);
        }
      } else {
        showToast(data.error || 'Gagal menambahkan lagu', true);
      }
    } catch (err) {
      showToast('Terjadi kesalahan jaringan', true);
    }
  };

  const createAndAddSongToPlaylist = async (song: Track, playlistName: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/playlists`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ name: playlistName }),
      });
      const data = await res.json();
      if (res.ok && data.playlist_id) {
        await addSongToPlaylist(data.playlist_id, song);
      } else {
        showToast(data.error || 'Gagal membuat playlist', true);
      }
    } catch (err) {
      showToast('Terjadi kesalahan jaringan', true);
    }
  };

  const playPlaylist = async (playlistId: string) => {
    apiCall(`playlists/${playlistId}/play`);
    showToast('Memulai pemutaran playlist...');
  };

  // 10. Recommendations & History
  const loadRecommendations = async (genre: string = selectedGenreCategory) => {
    setLoadingRecs(true);
    try {
      const gParam = genre && genre !== 'Semua' ? `&genre=${encodeURIComponent(genre)}` : '';
      const res = await fetch(`${API_BASE}/api/recommendations?guild_id=${selectedGuild}${gParam}`, { headers: getHeaders() });
      const data = await res.json();
      setRecommendations(data.recommendations || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRecs(false);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/history?guild_id=${selectedGuild}`, { headers: getHeaders() });
      const data = await res.json();
      setHistoryList(data.history || []);
    } catch (e) {
      console.error(e);
    }
  };

  // 11. Lyrics Synchronization
  const loadLyrics = async (customQuery: string | null = null) => {
    setLoadingLyrics(true);
    try {
      const res = await fetch(`${API_BASE}/api/lyrics`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ guild_id: selectedGuild, query: customQuery || null }),
      });
      const data = await res.json();
      setLyricsData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLyrics(false);
    }
  };

  // Auto fetch lyrics when playing song changes
  useEffect(() => {
    const currTitle = status?.current?.title;
    if (currTitle && currTitle !== lastFetchedSongRef.current) {
      lastFetchedSongRef.current = currTitle;
      loadLyrics(currTitle);
    }
  }, [status?.current?.title]);

  // Initial Loaders
  useEffect(() => {
    loadRecommendations(selectedGenreCategory);
    loadLikedSongs();
    loadHistory();
    loadPlaylists();
  }, [selectedGuild]);

  useEffect(() => {
    if (activeTab === 'likes') loadLikedSongs();
    if (activeTab === 'playlists') loadPlaylists();
    if (activeTab === 'history') loadHistory();
  }, [activeTab]);

  // Auto load / set offset whenever current song changes or suggested offset arrives
  useEffect(() => {
    const currUrl = status?.current?.url;
    if (!currUrl) {
      setLyricsOffset(0);
      return;
    }
    const saved = localStorage.getItem(`linkryn_offset_${currUrl}`);
    if (saved !== null) {
      setLyricsOffset(parseFloat(saved) || 0);
    } else if (lyricsData?.suggested_offset && lyricsData.suggested_offset >= 2.5) {
      setLyricsOffset(lyricsData.suggested_offset);
    } else {
      setLyricsOffset(0);
    }
  }, [status?.current?.url, lyricsData?.suggested_offset]);

  const handleLyricsOffsetChange = (newOffset: number) => {
    setLyricsOffset(newOffset);
    const currUrl = status?.current?.url;
    if (currUrl) {
      localStorage.setItem(`linkryn_offset_${currUrl}`, newOffset.toString());
    }
  };

  // Parse lyrics
  const lyricsInfo = useMemo<LyricsInfo>(() => {
    if (!lyricsData) return { isSynced: false, lines: [] };
    if (lyricsData.synced_lyrics) {
      const parsed = parseLrc(lyricsData.synced_lyrics);
      if (parsed.length > 0) {
        return {
          isSynced: true,
          lines: parsed,
          suggestedOffset: lyricsData.suggested_offset,
          lrcDuration: lyricsData.lrc_duration,
          videoDuration: lyricsData.video_duration || status?.current?.duration,
        };
      }
    }
    if (lyricsData.lyrics) {
      const plain = parsePlainLyrics(lyricsData.lyrics, status?.current?.duration || 180);
      return {
        isSynced: false,
        lines: plain,
        suggestedOffset: lyricsData.suggested_offset,
        lrcDuration: lyricsData.lrc_duration,
        videoDuration: lyricsData.video_duration || status?.current?.duration,
      };
    }
    return { isSynced: false, lines: [] };
  }, [lyricsData, status?.current?.duration]);

  const activeLineIndex = useMemo(() => {
    if (!lyricsInfo.isSynced || !lyricsInfo.lines.length) return -1;
    const effectiveTime = Math.max(0, localElapsed - lyricsOffset);
    let found = -1;
    for (let i = 0; i < lyricsInfo.lines.length; i++) {
      const t = lyricsInfo.lines[i].time;
      if (t !== undefined && effectiveTime >= t) {
        found = i;
      } else {
        break;
      }
    }
    return found;
  }, [lyricsInfo, localElapsed, lyricsOffset]);

  // Context Menu Helpers
  const handleContextMenu = (e: React.MouseEvent, track: Track) => {
    e.preventDefault();
    e.stopPropagation();
    const menuWidth = 220;
    const menuHeight = 220;
    const x = Math.max(10, Math.min(e.clientX, window.innerWidth - menuWidth - 10));
    const y = Math.max(10, Math.min(e.clientY, window.innerHeight - menuHeight - 10));
    setContextMenu({ visible: true, x, y, song: track });
  };

  const closeContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, song: null });
  };

  useEffect(() => {
    const handleDismiss = () => {
      if (contextMenu.visible) closeContextMenu();
    };
    window.addEventListener('click', handleDismiss);
    window.addEventListener('contextmenu', handleDismiss);
    return () => {
      window.removeEventListener('click', handleDismiss);
      window.removeEventListener('contextmenu', handleDismiss);
    };
  }, [contextMenu.visible]);

  // Playback Control Handlers
  const handlePlayPause = () => {
    if (status?.is_playing) {
      apiCall('pause');
    } else {
      apiCall('resume');
    }
  };

  const handleSkip = () => {
    apiCall('skip');
  };

  const handlePrevious = () => {
    apiCall('seek', { seconds: 0 });
    setLocalElapsed(0);
  };

  const handleShuffle = () => {
    apiCall('shuffle');
  };

  const handleLoop = () => {
    const current = status?.loop_mode || 'off';
    const nextMode = current === 'off' ? 'track' : current === 'track' ? 'queue' : 'off';
    apiCall('loop', { mode: nextMode });
  };

  const handleVolumeChange = (vol: number) => {
    apiCall('volume', { level: vol, volume: vol });
  };

  const handleSeekChange = (seconds: number) => {
    setIsSeeking(true);
    setLocalElapsed(seconds);
  };

  // Auto-switch selected guild whenever user moves in Discord
  useEffect(() => {
    const activeGid = status?.user_voice?.guild_id || status?.guild?.id;
    if (activeGid && activeGid !== selectedGuild) {
      setSelectedGuild(activeGid);
    }
  }, [status?.user_voice?.guild_id, status?.guild?.id, selectedGuild]);

  const handleSeekCommit = (seconds: number) => {
    setIsSeeking(false);
    setLocalElapsed(seconds);
    apiCall('seek', { seconds });
  };

  const handlePlayTrack = (track: Track) => {
    if (!track.url) return;
    apiCall('play', { query: track.url });
    showToast(`Memutar: ${track.title}`);
  };

  const handleAddToQueue = (track: Track) => {
    if (!track.url) return;
    apiCall('play', { query: track.url });
    showToast(`Ditambahkan ke antrean: ${track.title}`);
  };

  const handleApplyFilter = (key: string, value: unknown) => {
    apiCall('filter', { filter: key, value });
  };

  const handleResetFilters = () => {
    apiCall('filter', { filter: 'reset' });
    showToast('Seluruh filter audio di-reset ke normal.');
  };

  const handleToggleAutoplay = () => {
    apiCall('filter', { filter: 'autoplay' });
  };

  const handleRemoveQueueItem = (index: number) => {
    apiCall('remove', { index });
  };

  const handleClearQueue = () => {
    apiCall('stop');
    showToast('Antrean dibersihkan.');
  };

  const logoutUser = () => {
    localStorage.removeItem('linkryn_token');
    setUserToken('');
    setCurrentUser(null);
    showToast('Telah keluar dari akun Discord.');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', backgroundColor: 'var(--bg-main)' }}>
      
      {/* Toast Notification */}
      <Toast toast={toastMessage} />

      {/* Main Workspace Frame */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        
        {/* Left Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            if (tab === 'playlists') setSelectedPlaylist(null);
          }}
          status={status}
          likedCount={likedSongs.length}
        />

        {/* Central Workspace */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, overflow: 'hidden' }}>
          
          {/* Top Header */}
          <Header
            query={query}
            setQuery={setQuery}
            onSearchSubmit={handleSearchSubmit}
            searchSuggestions={searchSuggestions}
            showSearchDropdown={showSearchDropdown}
            setShowSearchDropdown={setShowSearchDropdown}
            onSelectSuggestion={(track) => {
              handlePlayTrack(track);
              setShowSearchDropdown(false);
              setQuery('');
            }}
            onContextMenuTrack={handleContextMenu}
            onToggleLike={toggleLikeSong}
            isSongLiked={isSongLiked}
            status={status}
            currentUser={currentUser}
            onLogin={() => setShowLoginModal(true)}
            onLogout={logoutUser}
          />

          {/* Scrollable View Content */}
          <main style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
            
            {/* View: Home / Recommendations */}
            {activeTab === 'home' && (
              <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <HeroBanner
                  currentSong={status?.current}
                  isLiked={isSongLiked(status?.current?.url || '')}
                  onToggleLike={toggleLikeCurrent}
                  onOpenAddToPlaylist={(track) => {
                    setPlaylistModalSong(track);
                    setIsCreatePlaylistOnly(false);
                  }}
                  onContextMenu={handleContextMenu}
                  voiceChannelName={status?.user_voice?.channel_name || status?.voice_channel}
                />

                <LikedSongsCarousel
                  likedSongs={likedSongs}
                  onPlaySong={handlePlayTrack}
                  onContextMenu={handleContextMenu}
                  onToggleLike={toggleLikeSong}
                  onViewAll={() => setActiveTab('likes')}
                />

                <div style={{ marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: '700', letterSpacing: '-0.3px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Rekomendasi Musik
                  </h2>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    Pilih genre atau eksplorasi trek yang dikurasi khusus untuk Anda.
                  </p>
                </div>

                <RecommendationsView
                  categories={GENRE_CATEGORIES}
                  selectedCategory={selectedGenreCategory}
                  onSelectCategory={(cat) => {
                    setSelectedGenreCategory(cat);
                    loadRecommendations(cat);
                  }}
                  recommendations={recommendations}
                  loading={loadingRecs}
                  onPlaySong={handlePlayTrack}
                  onContextMenu={handleContextMenu}
                  onToggleLike={toggleLikeSong}
                  isSongLiked={isSongLiked}
                />
              </div>
            )}

            {/* View: Liked Songs */}
            {activeTab === 'likes' && (
              <LikedSongsView
                likedSongs={likedSongs}
                onPlaySong={handlePlayTrack}
                onRemoveLiked={removeLikedSong}
                onContextMenu={handleContextMenu}
                onOpenAddToPlaylist={(track) => {
                  setPlaylistModalSong(track);
                  setIsCreatePlaylistOnly(false);
                }}
              />
            )}

            {/* View: Playlists */}
            {activeTab === 'playlists' && (
              <PlaylistsView
                playlists={playlists}
                selectedPlaylist={selectedPlaylist}
                playlistSongs={playlistSongs}
                onSelectPlaylist={(pl) => viewPlaylistSongs(pl)}
                onBackToPlaylists={() => setSelectedPlaylist(null)}
                onOpenCreateModal={() => {
                  setPlaylistModalSong(null);
                  setIsCreatePlaylistOnly(true);
                }}
                onPlayPlaylist={playPlaylist}
                onDeletePlaylist={deletePlaylist}
                onPlaySong={handlePlayTrack}
                onRemoveSongFromPlaylist={removeSongFromPlaylist}
                onContextMenu={handleContextMenu}
              />
            )}

            {/* View: History */}
            {activeTab === 'history' && (
              <HistoryView
                historyList={historyList}
                onPlaySong={handlePlayTrack}
                onContextMenu={handleContextMenu}
                onToggleLike={toggleLikeSong}
                isSongLiked={isSongLiked}
                onOpenAddToPlaylist={(track) => {
                  setPlaylistModalSong(track);
                  setIsCreatePlaylistOnly(false);
                }}
              />
            )}

            {/* View: Search Results */}
            {activeTab === 'search' && (
              <SearchView
                currentSearchQuery={currentSearchQuery}
                searchResults={searchResults}
                loadingSearch={loadingSearch}
                onPlaySong={handlePlayTrack}
                onContextMenu={handleContextMenu}
                onToggleLike={toggleLikeSong}
                isSongLiked={isSongLiked}
                onOpenAddToPlaylist={(track) => {
                  setPlaylistModalSong(track);
                  setIsCreatePlaylistOnly(false);
                }}
              />
            )}

            {/* View: Audio Filter & Equalizer */}
            {activeTab === 'filters' && (
              <FilterEqualizerView
                filters={status?.filters}
                onApplyFilter={handleApplyFilter}
                onResetFilters={handleResetFilters}
              />
            )}

          </main>
        </div>

        {/* Sliding Right Panels */}
        {rightPanel === 'queue' && (
          <QueuePanel
            currentSong={status?.current}
            queue={status?.queue || []}
            onClose={() => setRightPanel(null)}
            onRemoveItem={handleRemoveQueueItem}
            onClearQueue={handleClearQueue}
            onPlaySong={handlePlayTrack}
          />
        )}

        {rightPanel === 'lyrics' && (
          <LyricsPanel
            currentSongTitle={status?.current?.title}
            lyricsInfo={lyricsInfo}
            activeLineIndex={activeLineIndex}
            loading={loadingLyrics}
            onClose={() => setRightPanel(null)}
            onSearchLyrics={(q) => loadLyrics(q)}
            lyricsOffset={lyricsOffset}
            onLyricsOffsetChange={handleLyricsOffsetChange}
          />
        )}

      </div>

      {/* Persistent Bottom Player Bar */}
      <PlayerBar
        status={status}
        localElapsed={localElapsed}
        isSeeking={isSeeking}
        onSeekChange={handleSeekChange}
        onSeekCommit={handleSeekCommit}
        onPlayPause={handlePlayPause}
        onSkip={handleSkip}
        onPrevious={handlePrevious}
        onShuffle={handleShuffle}
        onLoop={handleLoop}
        onStop={() => apiCall('stop')}
        autoplay={status?.autoplay || false}
        onToggleAutoplay={handleToggleAutoplay}
        onVolumeChange={handleVolumeChange}
        rightPanel={rightPanel}
        setRightPanel={setRightPanel}
        onToggleFilterModal={() => setActiveTab('filters')}
        onToggleLikeCurrent={toggleLikeCurrent}
        onOpenAddToPlaylist={(song) => {
          setPlaylistModalSong(song);
          setIsCreatePlaylistOnly(false);
        }}
        isCurrentLiked={isSongLiked(status?.current?.url || '')}
      />

      {/* Context Menu */}
      <ContextMenu
        contextMenu={contextMenu}
        onClose={closeContextMenu}
        onPlaySong={handlePlayTrack}
        onAddToQueue={handleAddToQueue}
        onOpenAddToPlaylist={(track) => {
          setPlaylistModalSong(track);
          setIsCreatePlaylistOnly(false);
        }}
        onToggleLike={toggleLikeSong}
        isSongLiked={isSongLiked}
      />

      {/* Playlist Modal */}
      {(playlistModalSong || isCreatePlaylistOnly) && (
        <PlaylistModal
          song={playlistModalSong}
          playlists={playlists}
          onClose={() => {
            setPlaylistModalSong(null);
            setIsCreatePlaylistOnly(false);
          }}
          onAddToPlaylist={addSongToPlaylist}
          onCreateAndAdd={createAndAddSongToPlaylist}
          onCreateOnly={createPlaylist}
          isCreateOnly={isCreatePlaylistOnly}
        />
      )}

      {/* Discord Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        apiBase={API_BASE}
      />

    </div>
  );
}

