import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, SkipForward, RotateCcw, Volume2, VolumeX, Shuffle, 
  Repeat, ListMusic, Sparkles, Mic2, Disc, Sliders, Trash2,
  Radio, Search, Music, ExternalLink, Zap, Heart, FolderPlus, 
  History, User, LogOut, Plus, Headphones, Folder, Check, ArrowRight,
  X, Home, AlertCircle, ShieldCheck, LogIn
} from 'lucide-react';

const API_BASE = window.location.port === '5173' ? 'http://localhost:5000' : '';

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Helper untuk parsing lirik timestamp LRC yang presisi & mendukung semua format
function parseLrc(lrcText) {
  if (!lrcText) return [];
  const lines = lrcText.split('\n');
  const result = [];
  const tagRegex = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const matches = [...line.matchAll(tagRegex)];
    if (matches.length > 0) {
      const text = line.replace(tagRegex, '').trim();
      for (const match of matches) {
        const mins = parseInt(match[1], 10);
        const secs = parseInt(match[2], 10);
        let ms = 0;
        if (match[3]) {
          const rawMs = match[3];
          ms = rawMs.length === 1 ? parseInt(rawMs, 10) * 100 : (rawMs.length === 2 ? parseInt(rawMs, 10) * 10 : parseInt(rawMs, 10));
        }
        const time = mins * 60 + secs + ms / 1000;
        result.push({ time, text });
      }
    }
  }
  result.sort((a, b) => a.time - b.time);
  return result;
}

// Fallback untuk lirik biasa tanpa timestamp
function parsePlainLyrics(plainText, duration = 180) {
  if (!plainText) return [];
  const rawLines = plainText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (rawLines.length === 0) return [];
  const step = Math.max(2, (duration * 0.95) / rawLines.length);
  return rawLines.map((text, i) => ({
    time: Math.floor(i * step),
    text
  }));
}

export default function App() {
  // Navigation & State (Default: 'home' / Rekomendasi Lagu Langsung!)
  const [activeTab, setActiveTab] = useState('home'); 
  const [rightPanel, setRightPanel] = useState(null); // null, 'queue', 'lyrics'
  const [status, setStatus] = useState(null);
  const [guilds, setGuilds] = useState([]);
  const [selectedGuild, setSelectedGuild] = useState('');
  const [query, setQuery] = useState('');
  const [localElapsed, setLocalElapsed] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Search Engine & Live Suggestions
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);
  const [currentSearchQuery, setCurrentSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  // User Auth & Voice Presence
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [userToken, setUserToken] = useState(() => localStorage.getItem('linkryn_token') || '');

  // Liked Songs & Playlists
  const [likedSongs, setLikedSongs] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [playlistSongs, setPlaylistSongs] = useState([]);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showNewPlaylistModal, setShowNewPlaylistModal] = useState(false);
  const [playlistModalSong, setPlaylistModalSong] = useState(null);
  const [modalNewPlaylistName, setModalNewPlaylistName] = useState('');
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    song: null
  });

  // Recommendations & History
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [selectedGenreChip, setSelectedGenreChip] = useState('Semua');

  // Lyrics
  const [lyricsData, setLyricsData] = useState(null);
  const [loadingLyrics, setLoadingLyrics] = useState(false);
  const [lyricsSearch, setLyricsSearch] = useState('');
  const activeLineRef = useRef(null);
  const lastFetchedSongRef = useRef('');

  // WebSocket reference
  const wsRef = useRef(null);

  const showToast = (msg, isError = false) => {
    setToastMessage({ text: msg, isError });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const getHeaders = () => {
    const headers = { 'Content-Type': 'application/json' };
    if (userToken) headers['Authorization'] = `Bearer ${userToken}`;
    return headers;
  };

  // 1. Initial OAuth Token check (Code Callback & Discord Implicit Grant Hash)
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

    // 1b. Implicit Grant Hash Fragment (#access_token=... from Discord OAuth)
    if (window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      if (accessToken) {
        window.history.replaceState({}, document.title, window.location.pathname);
        fetch(`${API_BASE}/api/auth/token_exchange`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: accessToken })
        })
          .then(res => res.json())
          .then(data => {
            if (data.token) {
              localStorage.setItem('linkryn_token', data.token);
              setUserToken(data.token);
              setCurrentUser(data.user);
              showToast(`Selamat datang, ${data.user.display_name || data.user.username}!`);
            } else {
              showToast('Gagal memproses autentikasi Discord.', true);
            }
          })
          .catch(err => {
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
    } finally {
      setAuthLoaded(true);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, [userToken]);

  // 3. Fetch Guilds & Auto-select where user is located
  const fetchGuilds = () => {
    fetch(`${API_BASE}/api/guilds`, { headers: getHeaders() })
      .then(res => res.json())
      .then(data => {
        const gList = data.guilds || [];
        setGuilds(gList);
        if (gList.length > 0) {
          // Otomatis pilih server di mana user berada
          const active = gList.find(g => g.user_in_voice) || gList.find(g => g.user_is_member) || gList[0];
          if (active) {
            setSelectedGuild(active.id);
          }
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    if (currentUser) {
      fetchGuilds();
    }
  }, [currentUser]);

  // 4. WebSocket Real-time Connection
  useEffect(() => {
    if (!currentUser) return;
    let isMounted = true;
    let ws = null;
    let fallbackInterval = null;

    const connectWS = () => {
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
              if (!isSeeking && data?.current) {
                setLocalElapsed(data.current.elapsed || 0);
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
        .then(res => res.json())
        .then(data => {
          if (isMounted) {
            setStatus(data);
            if (!isSeeking && data?.current) {
              setLocalElapsed(data.current.elapsed || 0);
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
  }, [selectedGuild, userToken, isSeeking, currentUser]);

  // 5. Client-Side Playing Time Progress Tick
  useEffect(() => {
    if (!status?.is_playing || isSeeking) return;
    const timer = setInterval(() => {
      setLocalElapsed(prev => {
        const dur = status?.current?.duration || 0;
        if (dur > 0 && prev >= dur) return dur;
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [status?.is_playing, isSeeking, status?.current?.duration]);

  // 6. Generic API Call Helper with Protected Response Handling
  const apiCall = async (endpoint, body = {}) => {
    try {
      const res = await fetch(`${API_BASE}/api/${endpoint}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ ...body, guild_id: selectedGuild })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        showToast(data.error || 'Terjadi kesalahan.', true);
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

  // 6. Live Search Debounced Suggestions & Form Handling
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2 || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      setSearchSuggestions([]);
      setShowSearchDropdown(false);
      return;
    }
    const timeout = setTimeout(async () => {
      setIsSearchingSuggestions(true);
      try {
        const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(trimmed)}&limit=6`, { headers: getHeaders() });
        const data = await res.json();
        setSearchSuggestions(data.results || []);
        setShowSearchDropdown(true);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearchingSuggestions(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const handlePlaySubmit = async (e) => {
    if (e) e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setShowSearchDropdown(false);

    // Jika berupa direct link/URL, langsung putar
    if (q.startsWith('http://') || q.startsWith('https://') || q.startsWith('spotify:')) {
      apiCall('play', { query: q });
      setQuery('');
      return;
    }

    // Jika berupa kosa kata / judul lagu, tampilkan halaman rekomendasi pencarian penuh
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

  const handleSeekCommit = (e) => {
    const val = Number(e.target.value);
    setIsSeeking(false);
    setLocalElapsed(val);
    apiCall('seek', { seconds: val });
  };

  // 7. Liked Songs Management (Universal for all cards & player)
  const isSongLiked = (songUrl) => {
    if (!songUrl) return false;
    return likedSongs.some(s => s.url === songUrl || (s.url && songUrl && (s.url.includes(songUrl) || songUrl.includes(s.url))));
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

  const toggleLikeSong = async (song) => {
    if (!song || !song.url) return;
    const isLiked = isSongLiked(song.url);
    if (isLiked) {
      await fetch(`${API_BASE}/api/likes?url=${encodeURIComponent(song.url)}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      setLikedSongs(prev => prev.filter(s => s.url !== song.url));
      showToast('Dihapus dari Lagu yang Disukai.');
      if (status?.current?.url === song.url) {
        setStatus(prev => ({
          ...prev,
          current: { ...prev.current, is_liked: false }
        }));
      }
    } else {
      const songPayload = {
        title: song.title || 'Unknown Title',
        url: song.url,
        artist: song.uploader || song.artist || 'Artis',
        uploader: song.uploader || song.artist || 'Artis',
        duration: song.duration || 0,
        thumbnail: song.thumbnail || null
      };
      await fetch(`${API_BASE}/api/likes`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ song: songPayload })
      });
      showToast('❤️ Ditambahkan ke Lagu yang Disukai!');
      loadLikedSongs();
      if (status?.current?.url === song.url) {
        setStatus(prev => ({
          ...prev,
          current: { ...prev.current, is_liked: true }
        }));
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
      thumbnail: status.current.thumbnail
    });
  };

  const removeLikedSong = async (url) => {
    try {
      await fetch(`${API_BASE}/api/likes?url=${encodeURIComponent(url)}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      setLikedSongs(prev => prev.filter(s => s.url !== url));
      if (status?.current?.url === url) {
        setStatus(prev => ({
          ...prev,
          current: { ...prev.current, is_liked: false }
        }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 8. Custom Playlists Management
  const loadPlaylists = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/playlists`, { headers: getHeaders() });
      const data = await res.json();
      setPlaylists(data.playlists || []);
    } catch (e) {
      console.error(e);
    }
  };

  const createPlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    try {
      await fetch(`${API_BASE}/api/playlists`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ name: newPlaylistName.trim() })
      });
      setNewPlaylistName('');
      setShowNewPlaylistModal(false);
      loadPlaylists();
      showToast('Playlist baru berhasil dibuat!');
    } catch (e) {
      console.error(e);
    }
  };

  const deletePlaylist = async (id) => {
    if (!confirm('Yakin ingin menghapus playlist ini?')) return;
    try {
      await fetch(`${API_BASE}/api/playlists/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (selectedPlaylist?.id === id) setSelectedPlaylist(null);
      loadPlaylists();
      showToast('Playlist dihapus.');
    } catch (e) {
      console.error(e);
    }
  };

  const viewPlaylistSongs = async (pl) => {
    setSelectedPlaylist(pl);
    try {
      const res = await fetch(`${API_BASE}/api/playlists/${pl.id}/songs`, { headers: getHeaders() });
      const data = await res.json();
      setPlaylistSongs(data.songs || []);
    } catch (e) {
      console.error(e);
    }
  };

  const removeSongFromPlaylist = async (playlistId, songId) => {
    try {
      const res = await fetch(`${API_BASE}/api/playlists/${playlistId}/songs/${songId}`, {
        method: 'DELETE',
        headers: getHeaders()
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

  const openAddToPlaylistModal = (song) => {
    if (!song) return;
    loadPlaylists();
    setPlaylistModalSong(song);
    setContextMenu({ visible: false, x: 0, y: 0, song: null });
  };

  const addSongToSpecificPlaylist = async (playlistId, song) => {
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
            uploader: song.uploader || song.artist || 'Artis'
          }
        })
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

  const createAndAddSongToPlaylist = async (song) => {
    const name = modalNewPlaylistName.trim();
    if (!name) return;
    try {
      const res = await fetch(`${API_BASE}/api/playlists`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      if (res.ok && data.playlist_id) {
        await addSongToSpecificPlaylist(data.playlist_id, song);
        setModalNewPlaylistName('');
      } else {
        showToast(data.error || 'Gagal membuat playlist', true);
      }
    } catch (err) {
      showToast('Terjadi kesalahan jaringan', true);
    }
  };

  const handleContextMenu = (e, song) => {
    if (!song || !song.url) return;
    e.preventDefault();
    e.stopPropagation();
    const menuWidth = 220;
    const menuHeight = 220;
    const x = Math.max(10, Math.min(e.clientX, window.innerWidth - menuWidth - 10));
    const y = Math.max(10, Math.min(e.clientY, window.innerHeight - menuHeight - 10));
    setContextMenu({
      visible: true,
      x,
      y,
      song
    });
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
    window.addEventListener('scroll', handleDismiss, true);
    return () => {
      window.removeEventListener('click', handleDismiss);
      window.removeEventListener('contextmenu', handleDismiss);
      window.removeEventListener('scroll', handleDismiss, true);
    };
  }, [contextMenu.visible]);

  // 9. Recommendations & History (Selalu Update & Bervariasi)
  const loadRecommendations = async (genre = null) => {
    setLoadingRecs(true);
    const targetGenre = genre !== null ? genre : selectedGenreChip;
    try {
      const gParam = targetGenre && targetGenre !== 'Semua' ? `&genre=${encodeURIComponent(targetGenre)}` : '';
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

  // 10. Automatic Real-time Lyrics Synchronization
  const loadLyrics = async (customQuery = null) => {
    setLoadingLyrics(true);
    try {
      const res = await fetch(`${API_BASE}/api/lyrics`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ guild_id: selectedGuild, query: customQuery || null })
      });
      const data = await res.json();
      setLyricsData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLyrics(false);
    }
  };

  // Otomatis fetch lirik di latar belakang setiap kali lagu berganti!
  useEffect(() => {
    if (!currentUser) return;
    const currTitle = status?.current?.title;
    if (currTitle && currTitle !== lastFetchedSongRef.current) {
      lastFetchedSongRef.current = currTitle;
      loadLyrics(currTitle);
    }
  }, [status?.current?.title, currentUser]);

  const logoutUser = () => {
    localStorage.removeItem('linkryn_token');
    setUserToken('');
    setCurrentUser(null);
    setStatus(null);
    showToast('Telah keluar.');
  };

  // Initial Loaders
  useEffect(() => {
    if (currentUser && selectedGuild) {
      loadRecommendations();
      loadLikedSongs();
      loadHistory();
    }
  }, [selectedGuild, currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    if (activeTab === 'likes') loadLikedSongs();
    if (activeTab === 'playlists') loadPlaylists();
    if (activeTab === 'history') loadHistory();
  }, [activeTab, currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    if (rightPanel === 'lyrics') {
      if (!lyricsData || lyricsData.title !== status?.current?.title) {
        loadLyrics();
      }
    }
  }, [rightPanel, status?.current?.title, currentUser]);

  const currentSong = status?.current;
  const duration = currentSong?.duration || 1;
  const progressPercent = Math.min(100, Math.max(0, (localElapsed / duration) * 100));

  // Parsed Synced Karaoke Lyrics & Mode Baca
  const lyricsInfo = React.useMemo(() => {
    if (!lyricsData) return { isSynced: false, lines: [] };
    if (lyricsData.synced_lyrics) {
      const parsed = parseLrc(lyricsData.synced_lyrics);
      if (parsed.length > 0) {
        return { isSynced: true, lines: parsed };
      }
    }
    if (lyricsData.lyrics) {
      const rawLines = lyricsData.lyrics.split('\n').map(l => l.trim()).filter(Boolean);
      return { isSynced: false, lines: rawLines.map(t => ({ text: t })) };
    }
    return { isSynced: false, lines: [] };
  }, [lyricsData]);

  // Active singing line index (hanya aktif jika isSynced bernilai true)
  const activeLineIndex = React.useMemo(() => {
    if (!lyricsInfo.isSynced || !lyricsInfo.lines.length) return -1;
    let found = -1;
    for (let i = 0; i < lyricsInfo.lines.length; i++) {
      if (lyricsInfo.lines[i].time !== undefined && localElapsed >= lyricsInfo.lines[i].time) {
        found = i;
      } else {
        break;
      }
    }
    return found;
  }, [lyricsInfo, localElapsed]);

  // Auto-scroll active line into center
  useEffect(() => {
    if (activeLineRef.current && rightPanel === 'lyrics' && lyricsInfo.isSynced) {
      activeLineRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeLineIndex, rightPanel, lyricsInfo.isSynced]);

  const genreChips = ['Semua', 'Pop Indonesia', 'Dangdut Koplo', 'Akustik Santai', 'J-Pop / Anime', 'K-Pop', 'Rock / Metal'];

  // ==========================================
  // MANDATORY LOGIN GATE SCREEN
  // ==========================================
  if (!currentUser) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        backgroundColor: '#0c0c0c',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        color: '#fff',
        fontFamily: 'sans-serif'
      }}>
        {/* Subtle Background Glow */}
        <div style={{
          position: 'absolute',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(29, 185, 84, 0.12) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{
          width: '460px',
          maxWidth: '90%',
          backgroundColor: '#161616',
          borderRadius: '20px',
          padding: '44px 36px',
          border: '1px solid #282828',
          boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
          textAlign: 'center',
          zIndex: 1
        }}>
          {/* Logo */}
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#1db954',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px auto',
            boxShadow: '0 0 24px rgba(29, 185, 84, 0.4)'
          }}>
            <Zap size={34} color="#000" fill="#000" />
          </div>

          <h1 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '8px', letterSpacing: '-0.5px' }}>
            Linkryn Web Player
          </h1>
          <p style={{ fontSize: '14px', color: '#888', lineHeight: '1.6', marginBottom: '32px' }}>
            Masuk dengan akun Discord Anda untuk mulai memutar lagu ke Voice Channel, melihat rekomendasi musik terupdate, dan mengontrol bot.
          </p>

          {/* Discord Login Button */}
          <a
            href={`${API_BASE}/api/auth/discord`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              width: '100%',
              padding: '14px 20px',
              backgroundColor: '#5865F2',
              color: '#fff',
              borderRadius: '500px',
              fontSize: '15px',
              fontWeight: 'bold',
              textDecoration: 'none',
              marginBottom: '16px',
              boxShadow: '0 6px 18px rgba(88, 101, 242, 0.35)',
              transition: 'transform 0.2s, background 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <LogIn size={20} />
            <span>Masuk dengan Akun Discord</span>
          </a>

          <p style={{ fontSize: '12px', color: '#666', marginTop: '20px' }}>
            🔒 Masuk menggunakan OAuth2 resmi Discord. Server & Voice Channel Anda akan otomatis terdeteksi.
          </p>
        </div>
      </div>
    );
  }

  // ==========================================
  // MAIN AUTHENTICATED SPOTIFY DASHBOARD
  // ==========================================
  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', flexDirection: 'column', backgroundColor: '#121212', color: '#fff', position: 'relative' }}>
      
      {/* FLOATING TOAST NOTIFICATION */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '24px',
          backgroundColor: toastMessage.isError ? '#e91429' : '#1db954',
          color: toastMessage.isError ? '#fff' : '#000',
          padding: '12px 20px',
          borderRadius: '500px',
          fontWeight: 'bold',
          fontSize: '13px',
          zIndex: 9999,
          boxShadow: '0 6px 20px rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'fadeIn 0.2s ease-in-out'
        }}>
          {toastMessage.isError ? <AlertCircle size={18} /> : <Check size={18} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* SIDEBAR (Spotify Aesthetic) */}
        <div style={{
          width: '260px',
          backgroundColor: '#000000',
          padding: '20px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          borderRight: '1px solid #1f1f1f',
          flexShrink: 0
        }}>
          {/* Logo & Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              backgroundColor: '#1db954',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 12px rgba(29, 185, 84, 0.4)'
            }}>
              <Zap size={22} color="#000" fill="#000" />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '-0.5px' }}>Linkryn Web</h2>
              <span style={{ fontSize: '11px', color: '#888' }}>Spotify Music Player</span>
            </div>
          </div>

          {/* Auto-connected Server Discord (Tanpa Dropdown) */}
          <div style={{
            padding: '10px 14px',
            backgroundColor: '#181818',
            borderRadius: '8px',
            border: '1px solid #262626',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#1db954',
              boxShadow: '0 0 8px #1db954',
              flexShrink: 0
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', fontWeight: 'bold', margin: 0 }}>
                Server Terhubung Otomatis
              </p>
              <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: '2px 0 0 0' }}>
                {guilds.find(g => g.id === selectedGuild)?.name || (guilds[0]?.name || 'Server Discord')}
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
            
            <button 
              onClick={() => setActiveTab('home')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: '6px',
                backgroundColor: activeTab === 'home' ? '#242424' : 'transparent',
                color: activeTab === 'home' ? '#fff' : '#b3b3b3',
                fontWeight: activeTab === 'home' ? 'bold' : '500',
                fontSize: '14px',
                textAlign: 'left'
              }}
            >
              <Home size={20} color={activeTab === 'home' ? '#1db954' : '#b3b3b3'} />
              Beranda & Rekomendasi
            </button>

            <button 
              onClick={() => setActiveTab('likes')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: '6px',
                backgroundColor: activeTab === 'likes' ? '#242424' : 'transparent',
                color: activeTab === 'likes' ? '#fff' : '#b3b3b3',
                fontWeight: activeTab === 'likes' ? 'bold' : '500',
                fontSize: '14px',
                textAlign: 'left'
              }}
            >
              <Heart size={20} color={activeTab === 'likes' ? '#1db954' : '#b3b3b3'} fill={activeTab === 'likes' ? '#1db954' : 'none'} />
              Lagu yang Disukai
            </button>

            <button 
              onClick={() => { setActiveTab('playlists'); setSelectedPlaylist(null); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: '6px',
                backgroundColor: activeTab === 'playlists' ? '#242424' : 'transparent',
                color: activeTab === 'playlists' ? '#fff' : '#b3b3b3',
                fontWeight: activeTab === 'playlists' ? 'bold' : '500',
                fontSize: '14px',
                textAlign: 'left'
              }}
            >
              <Folder size={20} color={activeTab === 'playlists' ? '#1db954' : '#b3b3b3'} />
              Koleksi Playlist
            </button>

            <button 
              onClick={() => setActiveTab('history')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: '6px',
                backgroundColor: activeTab === 'history' ? '#242424' : 'transparent',
                color: activeTab === 'history' ? '#fff' : '#b3b3b3',
                fontWeight: activeTab === 'history' ? 'bold' : '500',
                fontSize: '14px',
                textAlign: 'left'
              }}
            >
              <History size={20} color={activeTab === 'history' ? '#1db954' : '#b3b3b3'} />
              Riwayat Pemutaran
            </button>

            <button 
              onClick={() => setActiveTab('filters')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: '6px',
                backgroundColor: activeTab === 'filters' ? '#242424' : 'transparent',
                color: activeTab === 'filters' ? '#fff' : '#b3b3b3',
                fontWeight: activeTab === 'filters' ? 'bold' : '500',
                fontSize: '14px',
                textAlign: 'left'
              }}
            >
              <Sliders size={20} color={activeTab === 'filters' ? '#1db954' : '#b3b3b3'} />
              Audio Filter & EQ
            </button>
          </div>

          {/* Autoplay & Quick Mode */}
          <div style={{
            marginTop: 'auto',
            padding: '12px',
            backgroundColor: '#181818',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Radio size={16} color={status?.autoplay ? '#1db954' : '#666'} />
              <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Autoplay</span>
            </div>
            <button
              onClick={() => apiCall('filter', { filter: 'autoplay' })}
              style={{
                fontSize: '11px',
                padding: '4px 10px',
                borderRadius: '12px',
                backgroundColor: status?.autoplay ? '#1db954' : '#333',
                color: status?.autoplay ? '#000' : '#fff',
                fontWeight: 'bold'
              }}
            >
              {status?.autoplay ? 'AKTIF' : 'NONAKTIF'}
            </button>
          </div>

        </div>

        {/* MAIN CONTENT AREA */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#121212', overflow: 'hidden' }}>
          
          {/* TOP BAR: Search Query + User Presence Status */}
          <div style={{
            height: '68px',
            padding: '0 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#101010',
            borderBottom: '1px solid #202020',
            gap: '16px'
          }}>
            {/* Search Box with Real-time Suggestions Dropdown */}
            <div style={{ flex: 1, maxWidth: '480px', position: 'relative' }}>
              <form onSubmit={handlePlaySubmit} style={{ display: 'flex', alignItems: 'center', width: '100%', position: 'relative' }}>
                <Search size={18} color="#888" style={{ position: 'absolute', left: '14px', zIndex: 2 }} />
                <input
                  type="text"
                  placeholder="Cari lagu, musisi, YouTube, atau paste link..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onFocus={() => { if (searchSuggestions.length > 0) setShowSearchDropdown(true); }}
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 42px',
                    backgroundColor: '#242424',
                    border: '1px solid #333',
                    borderRadius: '500px',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border 0.2s'
                  }}
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => { setQuery(''); setShowSearchDropdown(false); }}
                    style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', color: '#888', cursor: 'pointer', zIndex: 2 }}
                  >
                    <X size={16} />
                  </button>
                )}
              </form>

              {/* Instant Search Suggestions Overlay */}
              {showSearchDropdown && searchSuggestions.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '46px',
                  left: 0,
                  right: 0,
                  backgroundColor: '#1c1c1c',
                  borderRadius: '12px',
                  boxShadow: '0 12px 30px rgba(0,0,0,0.85)',
                  border: '1px solid #333',
                  zIndex: 9999,
                  overflow: 'hidden',
                  maxHeight: '380px',
                  overflowY: 'auto'
                }}>
                  <div style={{ padding: '8px 14px 4px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', fontWeight: 'bold' }}>Rekomendasi Pencarian Cepat</span>
                    <span style={{ fontSize: '11px', color: '#1db954', cursor: 'pointer' }} onClick={handlePlaySubmit}>Tekan Enter untuk hasil lengkap ↵</span>
                  </div>
                  {searchSuggestions.map((item, idx) => (
                    <div
                      key={idx}
                      onContextMenu={(e) => handleContextMenu(e, item)}
                      onClick={() => {
                        apiCall('play', { query: item.url });
                        setShowSearchDropdown(false);
                        setQuery('');
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 14px',
                        cursor: 'pointer',
                        borderBottom: idx < searchSuggestions.length - 1 ? '1px solid #262626' : 'none',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#2a2a2a'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <img src={item.thumbnail || 'https://via.placeholder.com/40'} alt="" style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '13px', fontWeight: '600', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</p>
                        <p style={{ fontSize: '11px', color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.artist || item.uploader}</p>
                      </div>
                      <span style={{ fontSize: '11px', color: '#777', marginRight: '6px' }}>{item.duration_str}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLikeSong(item);
                        }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', marginRight: '4px' }}
                        title={isSongLiked(item.url) ? "Hapus dari Favorit" : "Sukai Lagu"}
                      >
                        <Heart size={16} color={isSongLiked(item.url) ? "#1db954" : "#666"} fill={isSongLiked(item.url) ? "#1db954" : "none"} />
                      </button>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#1db954', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Play size={13} color="#000" fill="#000" style={{ marginLeft: '1px' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* User Presence & Account Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              
              {/* Voice Channel Presence Badge */}
              {status?.user_voice ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'rgba(29, 185, 84, 0.15)',
                  border: '1px solid #1db954',
                  borderRadius: '20px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  color: '#1db954',
                  fontWeight: '600'
                }}>
                  <Headphones size={14} />
                  <span>🔊 #{status.user_voice.channel_name}</span>
                </div>
              ) : status?.voice_channel ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#1f1f1f',
                  borderRadius: '20px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  color: '#888'
                }}>
                  <Headphones size={14} />
                  <span>Bot di #{status.voice_channel}</span>
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'rgba(255, 170, 0, 0.15)',
                  borderRadius: '20px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  color: '#ffaa00'
                }}>
                  <AlertCircle size={14} />
                  <span>Belum masuk Voice Channel</span>
                </div>
              )}

              {/* User Discord Profile Badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: '#242424',
                    padding: '4px 12px 4px 6px',
                    borderRadius: '500px',
                    border: '1px solid #333'
                  }}
                  title={`Terhubung sebagai ${currentUser.display_name || currentUser.username}`}
                >
                  <img 
                    src={currentUser.avatar} 
                    alt="" 
                    style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <span style={{ fontSize: '13px', fontWeight: '600' }}>{currentUser.display_name || currentUser.username}</span>
                </div>
                <button 
                  onClick={logoutUser} 
                  title="Logout Akun" 
                  style={{ color: '#888', padding: '6px', cursor: 'pointer', background: 'none', border: 'none' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                  onMouseLeave={e => e.currentTarget.style.color = '#888'}
                >
                  <LogOut size={16} />
                </button>
              </div>

              {/* Quick Actions */}
              <button 
                onClick={() => apiCall('shuffle')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  backgroundColor: '#242424',
                  borderRadius: '500px',
                  fontSize: '13px',
                  color: '#fff'
                }}
              >
                <Shuffle size={14} /> Shuffle
              </button>
              <button 
                onClick={() => apiCall('stop')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  backgroundColor: '#e91429',
                  borderRadius: '500px',
                  fontSize: '13px',
                  color: '#fff',
                  fontWeight: 'bold'
                }}
              >
                Stop
              </button>
            </div>
          </div>

          {/* VIEW TAB BODY */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
            
            {/* HERO NOW PLAYING BANNER */}
            {currentSong ? (
              <div 
                onContextMenu={(e) => handleContextMenu(e, currentSong)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '24px',
                  padding: '24px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #1b3821 0%, #111a14 100%)',
                  marginBottom: '28px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  border: '1px solid #23442a'
                }}
              >
                <img 
                  src={currentSong.thumbnail || 'https://via.placeholder.com/150'} 
                  alt={currentSong.title}
                  style={{ width: '130px', height: '130px', borderRadius: '8px', objectFit: 'cover', boxShadow: '0 4px 14px rgba(0,0,0,0.7)' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#1db954', fontWeight: 'bold' }}>
                      Sedang Diputar di Discord
                    </span>
                    <button 
                      onClick={toggleLikeCurrent}
                      title={currentSong.is_liked ? "Hapus dari Lagu yang Disukai" : "Tambahkan ke Lagu yang Disukai"}
                      style={{ color: currentSong.is_liked ? '#1db954' : '#888' }}
                    >
                      <Heart size={22} fill={currentSong.is_liked ? '#1db954' : 'none'} />
                    </button>
                  </div>
                  
                  <h1 style={{
                    fontSize: '28px',
                    fontWeight: '800',
                    color: '#fff',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {currentSong.title}
                  </h1>
                  <p style={{ fontSize: '15px', color: '#b3b3b3' }}>
                    {currentSong.uploader} • Diminta oleh <strong style={{ color: '#fff' }}>{currentSong.requester}</strong>
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
                    <a 
                      href={currentSong.url} 
                      target="_blank" 
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        color: '#1db954',
                        textDecoration: 'none'
                      }}
                    >
                      Buka di YouTube <ExternalLink size={12} />
                    </a>
                    <button
                      onClick={() => openAddToPlaylistModal(currentSong)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        color: '#fff',
                        background: 'rgba(255,255,255,0.1)',
                        padding: '5px 14px',
                        borderRadius: '16px',
                        border: '1px solid rgba(255,255,255,0.2)',
                        cursor: 'pointer',
                        fontWeight: '600'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    >
                      <FolderPlus size={14} color="#1db954" /> Tambah ke Playlist
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {/* TAB: BERANDA & REKOMENDASI (DEFAULT HOMEPAGE LANGSUNG) */}
            {activeTab === 'home' && (
              <div>
                {/* 1-ROW DEDICATED LIKED SONGS CAROUSEL */}
                <div style={{ marginBottom: '28px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Heart size={18} color="#1db954" fill="#1db954" />
                      <h3 style={{ fontSize: '17px', fontWeight: 'bold' }}>Lagu yang Disukai</h3>
                      <span style={{ fontSize: '12px', color: '#888' }}>({likedSongs.length})</span>
                    </div>
                    {likedSongs.length > 0 && (
                      <button
                        onClick={() => setActiveTab('likes')}
                        style={{ fontSize: '12px', color: '#1db954', fontWeight: 'bold', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        Lihat Semua →
                      </button>
                    )}
                  </div>

                  {likedSongs.length > 0 ? (
                    <div style={{
                      display: 'grid',
                      gridAutoFlow: 'column',
                      gridAutoColumns: '190px',
                      gap: '16px',
                      overflowX: 'auto',
                      alignItems: 'stretch',
                      paddingBottom: '12px',
                      scrollbarWidth: 'thin'
                    }}>
                      {likedSongs.map((s, i) => (
                        <div
                          key={s.id || s.url || i}
                          onContextMenu={(e) => handleContextMenu(e, s)}
                          onClick={() => apiCall('play', { query: s.url })}
                          style={{
                            backgroundColor: '#181818',
                            padding: '14px',
                            borderRadius: '8px',
                            display: 'flex',
                            flexDirection: 'column',
                            cursor: 'pointer',
                            transition: 'all 0.25s ease',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            boxSizing: 'border-box'
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.backgroundColor = '#252525';
                            e.currentTarget.style.transform = 'translateY(-3px)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.backgroundColor = '#181818';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                        >
                          {/* Thumbnail dengan Aspect Ratio 1:1 Presisi */}
                          <div style={{
                            position: 'relative',
                            width: '100%',
                            aspectRatio: '1 / 1',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            marginBottom: '12px',
                            backgroundColor: '#282828',
                            boxShadow: '0 6px 14px rgba(0,0,0,0.4)'
                          }}>
                            <img
                              src={s.thumbnail || 'https://via.placeholder.com/180'}
                              alt=""
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                display: 'block'
                              }}
                            />
                            {/* Tombol Hati (Top Right) */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleLikeSong(s);
                              }}
                              style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                backgroundColor: 'rgba(0,0,0,0.65)',
                                border: 'none',
                                borderRadius: '50%',
                                width: '28px',
                                height: '28px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'transform 0.15s',
                                zIndex: 2
                              }}
                              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.15)'}
                              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                              title="Hapus dari Lagu Disukai"
                            >
                              <Heart size={14} color="#1db954" fill="#1db954" />
                            </button>

                            {/* Tombol Putar Hijau (Bottom Right - Posisi Identik & Sejajar) */}
                            <div 
                              style={{
                                position: 'absolute',
                                bottom: '8px',
                                right: '8px',
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                backgroundColor: '#1db954',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                                transition: 'transform 0.15s'
                              }}
                              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                            >
                              <Play size={16} fill="#000" color="#000" style={{ marginLeft: '2px' }} />
                            </div>
                          </div>

                          {/* Judul: Tinggi tetap 36px (2-baris clamp), menjamin kartu sejajar simetris */}
                          <h4 
                            title={s.title}
                            style={{
                              fontSize: '13px',
                              fontWeight: 'bold',
                              color: '#fff',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              lineHeight: '1.3',
                              height: '34px',
                              marginBottom: '6px'
                            }}
                          >
                            {s.title}
                          </h4>

                          {/* Artis: 1 baris ellipsis dengan tinggi tetap 16px */}
                          <span 
                            title={s.artist || s.uploader}
                            style={{
                              fontSize: '11px',
                              color: '#999',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              height: '16px',
                              display: 'block'
                            }}
                          >
                            {s.artist || s.uploader || 'Artis'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{
                      padding: '16px 20px',
                      backgroundColor: '#181818',
                      borderRadius: '8px',
                      border: '1px dashed #333',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <Heart size={20} color="#555" />
                      <span style={{ fontSize: '13px', color: '#888' }}>
                        Belum ada lagu yang disukai. Klik ikon ❤️ pada lagu rekomendasi atau saat memutar untuk menyimpannya di sini!
                      </span>
                    </div>
                  )}
                </div>

                {/* Header Rekomendasi & Filter Genre Chips */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div>
                      <h2 style={{ fontSize: '24px', fontWeight: '800' }}>Rekomendasi Pilihan untuk Anda</h2>
                      <p style={{ fontSize: '13px', color: '#888', marginTop: '2px' }}>
                        Daftar lagu diperbarui setiap kali disinkronkan, diambil dari musik yang paling sering diputar.
                      </p>
                    </div>
                    <button 
                      onClick={() => loadRecommendations(selectedGenreChip)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        backgroundColor: '#242424',
                        borderRadius: '500px',
                        fontSize: '12px',
                        color: '#fff',
                        border: '1px solid #333',
                        cursor: 'pointer'
                      }}
                    >
                      <Sparkles size={14} color="#1db954" /> Segarkan Lagu
                    </button>
                  </div>

                  {/* Genre Quick Filter Chips */}
                  <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px' }}>
                    {genreChips.map(chip => (
                      <button
                        key={chip}
                        onClick={() => {
                          setSelectedGenreChip(chip);
                          loadRecommendations(chip);
                        }}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '500px',
                          fontSize: '12px',
                          fontWeight: '600',
                          backgroundColor: selectedGenreChip === chip ? '#1db954' : '#202020',
                          color: selectedGenreChip === chip ? '#000' : '#fff',
                          border: '1px solid',
                          borderColor: selectedGenreChip === chip ? '#1db954' : '#333',
                          whiteSpace: 'nowrap',
                          cursor: 'pointer'
                        }}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Grid Card Rekomendasi Lagu */}
                {loadingRecs ? (
                  <p style={{ color: '#888', fontSize: '14px' }}>Memuat daftar rekomendasi musik...</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '18px', marginBottom: '36px' }}>
                    {recommendations.map((rec, idx) => {
                      const liked = isSongLiked(rec.url);
                      return (
                        <div 
                          key={idx}
                          onContextMenu={(e) => handleContextMenu(e, rec)}
                          style={{
                            backgroundColor: '#181818',
                            padding: '14px',
                            borderRadius: '8px',
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative',
                            transition: 'background 0.2s',
                            cursor: 'pointer'
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#282828'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#181818'}
                          onClick={() => apiCall('play', { query: rec.url })}
                        >
                          <div style={{ position: 'relative', width: '100%', paddingBottom: '100%', marginBottom: '12px' }}>
                            <img 
                              src={rec.thumbnail || 'https://via.placeholder.com/160'} 
                              alt="" 
                              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', borderRadius: '6px', objectFit: 'cover' }}
                            />
                            {/* Like Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleLikeSong(rec);
                              }}
                              style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                background: 'rgba(0,0,0,0.65)',
                                border: 'none',
                                borderRadius: '50%',
                                width: '30px',
                                height: '30px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                zIndex: 2
                              }}
                              title={liked ? "Hapus dari Favorit" : "Sukai Lagu"}
                            >
                              <Heart size={15} color={liked ? "#1db954" : "#ccc"} fill={liked ? "#1db954" : "none"} />
                            </button>
                            <div style={{
                              position: 'absolute',
                              bottom: '8px',
                              right: '8px',
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              backgroundColor: '#1db954',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
                            }}>
                              <Play size={18} fill="#000" color="#000" style={{ marginLeft: '2px' }} />
                            </div>
                          </div>
                          <h4 style={{
                            fontSize: '14px',
                            fontWeight: 'bold',
                            color: '#fff',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            marginBottom: '4px'
                          }}>
                            {rec.title}
                          </h4>
                          <span style={{ fontSize: '12px', color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {rec.uploader || rec.artist}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB: SEARCH RESULTS */}
            {activeTab === 'search' && (
              <div style={{ paddingBottom: '40px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <div>
                    <h2 style={{ fontSize: '24px', fontWeight: '800' }}>Hasil Pencarian</h2>
                    <p style={{ fontSize: '14px', color: '#888' }}>
                      Menampilkan rekomendasi lagu untuk: <span style={{ color: '#1db954', fontWeight: 'bold' }}>"{currentSearchQuery}"</span>
                    </p>
                  </div>
                  {searchResults.length > 0 && (
                    <button
                      onClick={() => apiCall('play', { query: searchResults[0].url })}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 20px',
                        backgroundColor: '#1db954',
                        color: '#000',
                        borderRadius: '500px',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        border: 'none'
                      }}
                    >
                      <Play size={16} fill="#000" /> Putar Lagu Teratas
                    </button>
                  )}
                </div>

                {loadingSearch ? (
                  <div style={{ textAlign: 'center', padding: '60px 0', color: '#888' }}>
                    <Sparkles size={32} color="#1db954" style={{ marginBottom: '12px' }} />
                    <p style={{ fontSize: '15px' }}>Sedang mencari dan menyinkronkan lagu...</p>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {searchResults.map((song, idx) => {
                      const liked = isSongLiked(song.url);
                      return (
                        <div
                          key={idx}
                          onContextMenu={(e) => handleContextMenu(e, song)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '10px 16px',
                            backgroundColor: '#181818',
                            borderRadius: '8px',
                            gap: '16px',
                            transition: 'background 0.2s',
                            cursor: 'pointer'
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#242424'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#181818'}
                          onClick={() => apiCall('play', { query: song.url })}
                        >
                          <span style={{ width: '24px', fontSize: '13px', color: '#666', textAlign: 'center' }}>{idx + 1}</span>
                          <img
                            src={song.thumbnail || 'https://via.placeholder.com/48'}
                            alt=""
                            style={{ width: '48px', height: '48px', borderRadius: '4px', objectFit: 'cover' }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {song.title}
                            </p>
                            <p style={{ fontSize: '12px', color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {song.artist || song.uploader}
                            </p>
                          </div>
                          <span style={{ fontSize: '12px', color: '#888', marginRight: '8px' }}>{song.duration_str}</span>
                          
                          {/* Like Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLikeSong(song);
                            }}
                            title={liked ? "Hapus dari Favorit" : "Sukai Lagu"}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px' }}
                          >
                            <Heart size={18} color={liked ? "#1db954" : "#666"} fill={liked ? "#1db954" : "none"} />
                          </button>

                          {/* Play Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              apiCall('play', { query: song.url });
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '8px 16px',
                              backgroundColor: '#1db954',
                              color: '#000',
                              borderRadius: '500px',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              border: 'none'
                            }}
                          >
                            <Play size={14} fill="#000" /> Putar
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '60px 0', color: '#888' }}>
                    <Search size={36} color="#444" style={{ marginBottom: '12px' }} />
                    <p style={{ fontSize: '15px' }}>Tidak ada lagu yang cocok dengan kata kunci "{currentSearchQuery}".</p>
                    <p style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>Coba gunakan judul lagu atau nama penyanyi yang lebih spesifik.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB: LIKED SONGS */}
            {activeTab === 'likes' && (
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '24px',
                  padding: '24px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #4d1d80 0%, #1e1130 100%)',
                  marginBottom: '24px'
                }}>
                  <div style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '8px',
                    backgroundColor: '#1db954',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 6px 16px rgba(0,0,0,0.6)'
                  }}>
                    <Heart size={54} fill="#fff" color="#fff" />
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>Daftar Putar</span>
                    <h1 style={{ fontSize: '32px', fontWeight: '900', margin: '4px 0' }}>Lagu yang Disukai</h1>
                    <p style={{ fontSize: '14px', color: '#b3b3b3' }}>
                      {currentUser?.display_name || 'Kamu'} • {likedSongs.length} lagu tersimpan di database
                    </p>
                  </div>
                </div>

                {likedSongs.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {likedSongs.map((song, i) => (
                      <div 
                        key={i}
                        onContextMenu={(e) => handleContextMenu(e, song)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '10px 14px',
                          borderRadius: '6px',
                          backgroundColor: '#181818',
                          transition: 'background 0.2s',
                          gap: '16px'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#242424'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = '#181818'}
                      >
                        <span style={{ width: '24px', fontSize: '14px', color: '#888', textAlign: 'center' }}>{i + 1}</span>
                        <img 
                          src={song.thumbnail || 'https://via.placeholder.com/40'} 
                          alt="" 
                          style={{ width: '42px', height: '42px', borderRadius: '4px', objectFit: 'cover' }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {song.title}
                          </p>
                          <p style={{ fontSize: '12px', color: '#888' }}>{song.artist}</p>
                        </div>
                        <button 
                          onClick={() => apiCall('play', { query: song.url })}
                          title="Putar lagu ini"
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#1db954',
                            borderRadius: '500px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            color: '#000',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Play size={12} fill="#000" /> Putar
                        </button>
                        <button 
                          onClick={() => removeLikedSong(song.url)}
                          title="Hapus dari disukai"
                          style={{ color: '#1db954', padding: '6px' }}
                          onMouseEnter={e => e.currentTarget.style.color = '#e91429'}
                          onMouseLeave={e => e.currentTarget.style.color = '#1db954'}
                        >
                          <Heart size={18} fill="currentColor" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#666', fontSize: '14px' }}>Belum ada lagu yang disukai. Klik ikon hati ❤️ di player untuk menambahkan!</p>
                )}
              </div>
            )}

            {/* TAB: CUSTOM PLAYLISTS */}
            {activeTab === 'playlists' && (
              <div>
                {!selectedPlaylist ? (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h3 style={{ fontSize: '20px', fontWeight: 'bold' }}>Koleksi Playlist Saya</h3>
                      <button 
                        onClick={() => setShowNewPlaylistModal(true)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 16px',
                          backgroundColor: '#1db954',
                          color: '#000',
                          borderRadius: '500px',
                          fontSize: '13px',
                          fontWeight: 'bold'
                        }}
                      >
                        <Plus size={16} /> Buat Playlist Baru
                      </button>
                    </div>

                    {playlists.length > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '18px' }}>
                        {playlists.map(pl => (
                          <div 
                            key={pl.id}
                            style={{
                              backgroundColor: '#181818',
                              padding: '16px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              display: 'flex',
                              flexDirection: 'column'
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.backgroundColor = '#282828';
                              e.currentTarget.style.transform = 'translateY(-3px)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.backgroundColor = '#181818';
                              e.currentTarget.style.transform = 'translateY(0)';
                            }}
                            onClick={() => viewPlaylistSongs(pl)}
                          >
                            <div style={{
                              width: '100%',
                              aspectRatio: '1 / 1',
                              backgroundColor: '#282828',
                              borderRadius: '6px',
                              position: 'relative',
                              marginBottom: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                            }}>
                              <Folder size={48} color="#1db954" />
                            </div>
                            <h4 style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pl.name}</h4>
                            <span style={{ fontSize: '12px', color: '#888' }}>{pl.song_count || pl.songs_count || 0} lagu</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ padding: '40px 20px', textAlign: 'center', backgroundColor: '#181818', borderRadius: '8px', border: '1px dashed #333' }}>
                        <Folder size={40} color="#666" style={{ marginBottom: '12px' }} />
                        <p style={{ color: '#fff', fontWeight: 'bold', fontSize: '15px' }}>Anda belum memiliki playlist.</p>
                        <p style={{ color: '#888', fontSize: '13px', marginTop: '4px', marginBottom: '16px' }}>Buat playlist kustom pertama Anda untuk menyimpan koleksi lagu favorit!</p>
                        <button 
                          onClick={() => setShowNewPlaylistModal(true)}
                          style={{
                            padding: '8px 20px',
                            backgroundColor: '#1db954',
                            color: '#000',
                            borderRadius: '500px',
                            fontWeight: 'bold',
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <Plus size={16} /> Buat Playlist Baru
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                      <button 
                        onClick={() => setSelectedPlaylist(null)}
                        style={{ padding: '6px 12px', backgroundColor: '#242424', borderRadius: '4px', fontSize: '13px' }}
                      >
                        ← Kembali ke Koleksi
                      </button>
                      <h3 style={{ fontSize: '20px', fontWeight: 'bold' }}>{selectedPlaylist.name}</h3>
                      <button 
                        onClick={() => apiCall(`playlists/${selectedPlaylist.id}/play`)}
                        style={{
                          marginLeft: 'auto',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 18px',
                          backgroundColor: '#1db954',
                          color: '#000',
                          borderRadius: '500px',
                          fontSize: '13px',
                          fontWeight: 'bold'
                        }}
                      >
                        <Play size={14} fill="#000" /> Putar Semua ke Discord
                      </button>
                      {status?.current && (
                        <button
                          onClick={async () => {
                            await fetch(`${API_BASE}/api/playlists/${selectedPlaylist.id}/songs`, {
                              method: 'POST',
                              headers: getHeaders(),
                              body: JSON.stringify({
                                song: {
                                  title: status.current.title,
                                  url: status.current.url,
                                  artist: status.current.uploader,
                                  duration: status.current.duration,
                                  thumbnail: status.current.thumbnail
                                }
                              })
                            });
                            showToast(`Berhasil menambahkan "${status.current.title}" ke playlist!`);
                            viewPlaylistSongs(selectedPlaylist);
                            loadPlaylists();
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            backgroundColor: '#242424',
                            border: '1px solid #333',
                            borderRadius: '500px',
                            fontSize: '12px',
                            color: '#1db954',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                          }}
                        >
                          <Plus size={14} /> Tambah Lagu Aktif
                        </button>
                      )}
                      <button 
                        onClick={() => deletePlaylist(selectedPlaylist.id)}
                        style={{ padding: '8px', color: '#888', background: 'none', border: 'none', cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#e91429'}
                        onMouseLeave={e => e.currentTarget.style.color = '#888'}
                        title="Hapus Playlist"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    {playlistSongs.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {playlistSongs.map((song, i) => (
                          <div 
                            key={i}
                            onContextMenu={(e) => handleContextMenu(e, song)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              padding: '10px 14px',
                              borderRadius: '6px',
                              backgroundColor: '#181818',
                              gap: '16px'
                            }}
                          >
                            <span style={{ width: '24px', fontSize: '14px', color: '#888', textAlign: 'center' }}>{i + 1}</span>
                            <img src={song.thumbnail || 'https://via.placeholder.com/40'} alt="" style={{ width: '42px', height: '42px', borderRadius: '4px', objectFit: 'cover' }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</p>
                              <p style={{ fontSize: '12px', color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.artist}</p>
                            </div>
                            <button 
                              onClick={() => apiCall('play', { query: song.url })}
                              style={{
                                padding: '6px 14px',
                                backgroundColor: '#1db954',
                                color: '#000',
                                borderRadius: '500px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Play size={12} fill="#000" /> Putar
                            </button>
                            <button 
                              onClick={() => removeSongFromPlaylist(selectedPlaylist.id, song.id)}
                              title="Hapus dari playlist"
                              style={{ padding: '6px', color: '#888', background: 'none', border: 'none', cursor: 'pointer' }}
                              onMouseEnter={e => e.currentTarget.style.color = '#e91429'}
                              onMouseLeave={e => e.currentTarget.style.color = '#888'}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ padding: '30px 20px', textAlign: 'center', backgroundColor: '#181818', borderRadius: '8px' }}>
                        <p style={{ color: '#888', fontSize: '14px', marginBottom: '8px' }}>Playlist ini masih kosong.</p>
                        {status?.current && (
                          <p style={{ color: '#aaa', fontSize: '13px' }}>Klik tombol <strong>"Tambah Lagu Aktif"</strong> di atas atau gunakan slash command Discord <code>/playlist add</code> untuk menambahkan lagu.</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB: HISTORY */}
            {activeTab === 'history' && (
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>Riwayat Lagu Diputar</h3>
                {historyList.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {historyList.map((item, idx) => (
                      <div 
                        key={idx}
                        onContextMenu={(e) => handleContextMenu(e, item)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '10px 14px',
                          borderRadius: '6px',
                          backgroundColor: '#181818',
                          gap: '16px'
                        }}
                      >
                        <span style={{ width: '24px', fontSize: '13px', color: '#888', textAlign: 'center' }}>{idx + 1}</span>
                        <img src={item.thumbnail || 'https://via.placeholder.com/40'} alt="" style={{ width: '42px', height: '42px', borderRadius: '4px', objectFit: 'cover' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>{item.title}</p>
                          <p style={{ fontSize: '12px', color: '#888' }}>{item.artist} • Oleh {item.requester || 'User'}</p>
                        </div>
                        <button 
                          onClick={() => apiCall('play', { query: item.url })}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 12px',
                            backgroundColor: '#242424',
                            borderRadius: '500px',
                            fontSize: '12px',
                            color: '#1db954'
                          }}
                        >
                          <RotateCcw size={12} /> Putar Lagi
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#888', fontSize: '14px' }}>Belum ada riwayat pemutaran.</p>
                )}
              </div>
            )}

            {/* TAB: FILTERS & EQUALIZER */}
            {activeTab === 'filters' && (
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>Pengaturan Audio Filter & FX</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                  
                  {/* Bass Boost */}
                  <div style={{ padding: '18px', backgroundColor: '#181818', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <Zap size={18} color="#1db954" />
                      <strong style={{ fontSize: '15px' }}>Bass Boost</strong>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {['off', 'low', 'medium', 'high'].map(b => (
                        <button
                          key={b}
                          onClick={() => apiCall('filter', { filter: 'bass_boost', value: b })}
                          style={{
                            flex: 1,
                            padding: '8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            backgroundColor: status?.filters?.bass_boost === b ? '#1db954' : '#282828',
                            color: status?.filters?.bass_boost === b ? '#000' : '#fff'
                          }}
                        >
                          {b.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Equalizer */}
                  <div style={{ padding: '18px', backgroundColor: '#181818', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <Sliders size={18} color="#1db954" />
                      <strong style={{ fontSize: '15px' }}>Equalizer Preset</strong>
                    </div>
                    <select
                      value={status?.filters?.equalizer || 'off'}
                      onChange={e => apiCall('filter', { filter: 'equalizer', value: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px',
                        backgroundColor: '#282828',
                        color: '#fff',
                        border: '1px solid #3e3e3e',
                        borderRadius: '6px',
                        fontSize: '13px'
                      }}
                    >
                      <option value="off">Off (Default)</option>
                      <option value="flat">Flat</option>
                      <option value="bass">Bass Heavy</option>
                      <option value="vocal">Vocal Boost</option>
                      <option value="rock">Rock</option>
                      <option value="pop">Pop</option>
                      <option value="electronic">Electronic</option>
                    </select>
                  </div>

                  {/* Speed Multiplier */}
                  <div style={{ padding: '18px', backgroundColor: '#181818', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <strong style={{ fontSize: '15px' }}>Kecepatan Lagu</strong>
                      <span style={{ fontSize: '13px', color: '#1db954', fontWeight: 'bold' }}>{status?.filters?.speed || 1.0}x</span>
                    </div>
                    <input 
                      type="range"
                      min={0.5}
                      max={2.0}
                      step={0.1}
                      value={status?.filters?.speed || 1.0}
                      onChange={e => apiCall('filter', { filter: 'speed', value: Number(e.target.value) })}
                      style={{ width: '100%' }}
                    />
                  </div>

                  {/* Treble Slider */}
                  <div style={{ padding: '18px', backgroundColor: '#181818', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <strong style={{ fontSize: '15px' }}>Treble Balance</strong>
                      <span style={{ fontSize: '13px', color: '#1db954', fontWeight: 'bold' }}>{status?.filters?.treble || 0} dB</span>
                    </div>
                    <input 
                      type="range"
                      min={-10}
                      max={10}
                      value={status?.filters?.treble || 0}
                      onChange={e => apiCall('filter', { filter: 'treble', value: Number(e.target.value) })}
                      style={{ width: '100%' }}
                    />
                  </div>

                </div>

                {/* FX Toggles */}
                <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '14px' }}>Efek Spesial</h4>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
                  <button
                    onClick={() => apiCall('filter', { filter: 'nightcore' })}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '500px',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      backgroundColor: status?.filters?.nightcore ? '#1db954' : '#282828',
                      color: status?.filters?.nightcore ? '#000' : '#fff'
                    }}
                  >
                    ✨ Nightcore {status?.filters?.nightcore ? 'ON' : 'OFF'}
                  </button>

                  <button
                    onClick={() => apiCall('filter', { filter: 'vaporwave' })}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '500px',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      backgroundColor: status?.filters?.vaporwave ? '#1db954' : '#282828',
                      color: status?.filters?.vaporwave ? '#000' : '#fff'
                    }}
                  >
                    🌊 Vaporwave {status?.filters?.vaporwave ? 'ON' : 'OFF'}
                  </button>

                  <button
                    onClick={() => apiCall('filter', { filter: 'karaoke' })}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '500px',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      backgroundColor: status?.filters?.karaoke ? '#1db954' : '#282828',
                      color: status?.filters?.karaoke ? '#000' : '#fff'
                    }}
                  >
                    🎤 Karaoke (Vocal Remover) {status?.filters?.karaoke ? 'ON' : 'OFF'}
                  </button>
                </div>

                <button
                  onClick={() => apiCall('filter', { filter: 'reset' })}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '6px',
                    backgroundColor: '#e91429',
                    color: '#fff',
                    fontWeight: 'bold',
                    fontSize: '13px'
                  }}
                >
                  Reset Semua Filter ke Normal
                </button>
              </div>
            )}

          </div>

        </div>

        {/* RIGHT COLLAPSIBLE SIDEBAR PANEL (QUEUE & SYNCHRONIZED KARAOKE LYRICS) */}
        {rightPanel && (
          <div style={{
            width: '360px',
            backgroundColor: '#121212',
            borderLeft: '1px solid #242424',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            overflow: 'hidden',
            boxShadow: '-4px 0 20px rgba(0,0,0,0.5)'
          }}>
            {/* Header Right Panel */}
            <div style={{
              height: '60px',
              padding: '0 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #202020',
              backgroundColor: '#161616'
            }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setRightPanel('queue')}
                  style={{
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: rightPanel === 'queue' ? '#1db954' : '#888',
                    borderBottom: rightPanel === 'queue' ? '2px solid #1db954' : 'none',
                    paddingBottom: '4px'
                  }}
                >
                  Antrean ({status?.queue?.length || 0})
                </button>
                <button
                  onClick={() => { setRightPanel('lyrics'); loadLyrics(); }}
                  style={{
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: rightPanel === 'lyrics' ? '#1db954' : '#888',
                    borderBottom: rightPanel === 'lyrics' ? '2px solid #1db954' : 'none',
                    paddingBottom: '4px'
                  }}
                >
                  Lirik Realtime
                </button>
              </div>

              <button 
                onClick={() => setRightPanel(null)}
                style={{ color: '#888', padding: '6px' }}
                onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                onMouseLeave={e => e.currentTarget.style.color = '#888'}
                title="Tutup Panel"
              >
                <X size={18} />
              </button>
            </div>

            {/* BODY: QUEUE PANEL */}
            {rightPanel === 'queue' && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                <h4 style={{ fontSize: '13px', color: '#888', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '10px' }}>
                  Sedang Diputar
                </h4>
                {currentSong ? (
                  <div 
                    onContextMenu={(e) => handleContextMenu(e, currentSong)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px',
                      backgroundColor: '#181818',
                      borderRadius: '8px',
                      marginBottom: '20px',
                      cursor: 'pointer'
                    }}
                  >
                    <img src={currentSong.thumbnail || 'https://via.placeholder.com/48'} alt="" style={{ width: '48px', height: '48px', borderRadius: '4px', objectFit: 'cover' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#1db954', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {currentSong.title}
                      </p>
                      <p style={{ fontSize: '11px', color: '#888' }}>{currentSong.uploader}</p>
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>Tidak ada pemutaran aktif.</p>
                )}

                <h4 style={{ fontSize: '13px', color: '#888', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '10px' }}>
                  Selanjutnya di Antrean
                </h4>
                {status?.queue && status.queue.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {status.queue.map((song, i) => (
                      <div 
                        key={i}
                        onContextMenu={(e) => handleContextMenu(e, song)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px',
                          borderRadius: '6px',
                          backgroundColor: '#181818'
                        }}
                      >
                        <span style={{ fontSize: '12px', color: '#666', width: '20px', textAlign: 'center' }}>{i + 1}</span>
                        <img src={song.thumbnail || 'https://via.placeholder.com/38'} alt="" style={{ width: '38px', height: '38px', borderRadius: '4px', objectFit: 'cover' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {song.title}
                          </p>
                          <p style={{ fontSize: '11px', color: '#888' }}>{song.uploader}</p>
                        </div>
                        <button 
                          onClick={() => apiCall('remove', { index: i + 1 })}
                          style={{ color: '#666', padding: '4px' }}
                          onMouseEnter={e => e.currentTarget.style.color = '#e91429'}
                          onMouseLeave={e => e.currentTarget.style.color = '#666'}
                          title="Hapus"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '13px', color: '#666' }}>Antrean lagu berikutnya kosong.</p>
                )}
              </div>
            )}

            {/* BODY: SYNCHRONIZED KARAOKE LYRICS PANEL (100% OTOMATIS) */}
            {rightPanel === 'lyrics' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Track Info in Lyrics Panel */}
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #202020', backgroundColor: '#141414' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <p style={{ fontSize: '11px', color: '#1db954', fontWeight: 'bold', textTransform: 'uppercase' }}>
                      🎤 Lirik Musik
                    </p>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 'bold',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      backgroundColor: lyricsInfo.isSynced ? 'rgba(29, 185, 84, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                      color: lyricsInfo.isSynced ? '#1db954' : '#b3b3b3'
                    }}>
                      {lyricsInfo.isSynced ? '🟢 Karaoke Tersinkron' : '📖 Mode Baca'}
                    </span>
                  </div>
                  <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {lyricsData?.title || currentSong?.title || "Memuat Lirik..."}
                  </p>
                </div>

                {/* Lyrics Container with Karaoke Highlight Effect */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>
                  {loadingLyrics ? (
                    <div style={{ textAlign: 'center', marginTop: '60px', color: '#888' }}>
                      <Sparkles size={32} color="#1db954" style={{ marginBottom: '12px' }} />
                      <p style={{ fontSize: '14px', color: '#fff', fontWeight: 'bold' }}>Sedang mencari & menyinkronkan lirik otomatis...</p>
                      <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Mencocokkan database LRC dan lirik lagu</p>
                    </div>
                  ) : lyricsInfo.lines.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: lyricsInfo.isSynced ? '16px' : '10px' }}>
                      {lyricsInfo.isSynced ? (
                        <>
                          <p style={{ fontSize: '12px', color: '#888', textAlign: 'center', marginBottom: '8px' }}>
                            💡 <em>Klik pada baris lirik untuk melompat langsung ke bait tersebut.</em>
                          </p>
                          {lyricsInfo.lines.map((line, idx) => {
                            const isActive = idx === activeLineIndex;
                            const isPast = idx < activeLineIndex;
                            return (
                              <p 
                                key={idx}
                                ref={isActive ? activeLineRef : null}
                                onClick={() => line.time !== undefined && apiCall('seek', { seconds: Math.floor(line.time) })}
                                style={{
                                  fontSize: isActive ? '20px' : '15px',
                                  fontWeight: isActive ? '800' : '500',
                                  color: isActive ? '#1db954' : (isPast ? '#666' : '#3c3c3c'),
                                  lineHeight: '1.6',
                                  transition: 'all 0.3s ease',
                                  cursor: 'pointer',
                                  textShadow: isActive ? '0 0 18px rgba(29, 185, 84, 0.6)' : 'none',
                                  transform: isActive ? 'scale(1.03)' : 'scale(1)',
                                  transformOrigin: 'left center'
                                }}
                              >
                                {line.text}
                              </p>
                            );
                          })}
                        </>
                      ) : (
                        <>
                          <p style={{ fontSize: '12px', color: '#888', textAlign: 'center', marginBottom: '12px' }}>
                            📖 <em>Teks lirik lengkap (Mode Baca).</em>
                          </p>
                          {lyricsInfo.lines.map((line, idx) => (
                            <p 
                              key={idx}
                              style={{
                                fontSize: '15px',
                                color: '#d1d1d1',
                                lineHeight: '1.8',
                                margin: 0
                              }}
                            >
                              {line.text}
                            </p>
                          ))}
                        </>
                      )}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', marginTop: '60px', color: '#888' }}>
                      <Mic2 size={36} color="#444" style={{ marginBottom: '10px' }} />
                      <p style={{ fontSize: '14px', color: '#fff', fontWeight: 'bold' }}>Lirik lagu belum ditemukan.</p>
                      <p style={{ fontSize: '12px', color: '#666', marginTop: '4px', marginBottom: '16px' }}>Sistem akan mencoba mencocokkan lirik dari sumber online lain.</p>
                      {currentSong && (
                        <button
                          onClick={() => loadLyrics(currentSong.title)}
                          style={{
                            padding: '8px 18px',
                            backgroundColor: '#242424',
                            color: '#1db954',
                            border: '1px solid #333',
                            borderRadius: '500px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                          }}
                        >
                          🔄 Cari Ulang Otomatis
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        )}

      </div>

      {/* BOTTOM PLAYBAR (Spotify Style) */}
      <div style={{
        height: '90px',
        backgroundColor: '#181818',
        borderTop: '1px solid #282828',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        justifyContent: 'space-between',
        zIndex: 10
      }}>
        
        {/* LEFT: Currently Playing Track Info & Interactive Heart */}
        <div 
          onContextMenu={(e) => currentSong && handleContextMenu(e, currentSong)}
          style={{ display: 'flex', alignItems: 'center', gap: '14px', width: '30%', minWidth: '180px', cursor: currentSong ? 'pointer' : 'default' }}
        >
          {currentSong ? (
            <>
              <img 
                src={currentSong.thumbnail || 'https://via.placeholder.com/56'} 
                alt="" 
                style={{ width: '56px', height: '56px', borderRadius: '4px', objectFit: 'cover' }}
              />
              <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {currentSong.title}
                </p>
                <p style={{ fontSize: '12px', color: '#b3b3b3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {currentSong.uploader}
                </p>
              </div>
              <button 
                onClick={toggleLikeCurrent}
                title={currentSong.is_liked ? "Hapus dari Favorit" : "Sukai Lagu"}
                style={{ color: currentSong.is_liked ? '#1db954' : '#888', padding: '6px' }}
              >
                <Heart size={20} fill={currentSong.is_liked ? '#1db954' : 'none'} />
              </button>
              <button
                onClick={() => openAddToPlaylistModal(currentSong)}
                title="Tambahkan ke Playlist"
                style={{
                  color: '#888',
                  padding: '6px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                onMouseLeave={e => e.currentTarget.style.color = '#888'}
              >
                <FolderPlus size={20} />
              </button>
            </>
          ) : (
            <span style={{ fontSize: '13px', color: '#666' }}>Tidak ada lagu yang sedang diputar</span>
          )}
        </div>

        {/* CENTER: Player Controls & Playing Time Progress Bar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '40%' }}>
          
          {/* Controls Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <button 
              onClick={() => {
                const nextMode = status?.loop_mode === 'off' ? 'track' : (status?.loop_mode === 'track' ? 'queue' : 'off');
                apiCall('loop', { mode: nextMode });
              }}
              title={`Loop Mode: ${status?.loop_mode || 'off'}`}
              style={{ color: status?.loop_mode !== 'off' ? '#1db954' : '#b3b3b3' }}
            >
              <Repeat size={18} />
            </button>

            <button 
              onClick={() => apiCall('seek', { seconds: 0 })}
              title="Putar Ulang dari Awal"
              style={{ color: '#b3b3b3' }}
            >
              <RotateCcw size={18} />
            </button>

            <button 
              onClick={() => {
                if (status?.is_paused) apiCall('resume');
                else if (status?.is_playing) apiCall('pause');
              }}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#000'
              }}
            >
              {status?.is_paused ? <Play size={20} fill="#000" /> : <Pause size={20} fill="#000" />}
            </button>

            <button 
              onClick={() => apiCall('skip')}
              title="Lewati Lagu"
              style={{ color: '#b3b3b3' }}
            >
              <SkipForward size={20} fill="#b3b3b3" />
            </button>
          </div>

          {/* Playing Time Slider Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', maxWidth: '500px' }}>
            <span style={{ fontSize: '11px', color: '#b3b3b3', width: '35px', textAlign: 'right' }}>
              {formatTime(localElapsed)}
            </span>
            <input 
              type="range"
              min={0}
              max={duration}
              value={localElapsed}
              onChange={e => {
                setIsSeeking(true);
                setLocalElapsed(Number(e.target.value));
              }}
              onMouseUp={handleSeekCommit}
              onTouchEnd={handleSeekCommit}
              style={{
                flex: 1,
                background: `linear-gradient(to right, #1db954 0%, #1db954 ${progressPercent}%, #4d4d4d ${progressPercent}%, #4d4d4d 100%)`
              }}
            />
            <span style={{ fontSize: '11px', color: '#b3b3b3', width: '35px' }}>
              {formatTime(duration)}
            </span>
          </div>

        </div>

        {/* RIGHT: Right Sidebar Toggles & Volume */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '14px', width: '30%' }}>
          
          {/* Toggle Lirik Button */}
          <button 
            onClick={() => {
              setRightPanel(prev => prev === 'lyrics' ? null : 'lyrics');
            }}
            title="Tampilkan / Sembunyikan Lirik"
            style={{ 
              color: rightPanel === 'lyrics' ? '#1db954' : '#b3b3b3',
              padding: '6px'
            }}
          >
            <Mic2 size={18} />
          </button>

          {/* Toggle Antrean Button */}
          <button 
            onClick={() => {
              setRightPanel(prev => prev === 'queue' ? null : 'queue');
            }}
            title="Tampilkan / Sembunyikan Antrean"
            style={{ 
              color: rightPanel === 'queue' ? '#1db954' : '#b3b3b3',
              padding: '6px'
            }}
          >
            <ListMusic size={18} />
          </button>

          {/* Volume Control */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {status?.volume === 0 ? <VolumeX size={18} color="#b3b3b3" /> : <Volume2 size={18} color="#b3b3b3" />}
            <input 
              type="range"
              min={0}
              max={150}
              value={status?.volume || 50}
              onChange={e => apiCall('volume', { level: Number(e.target.value) })}
              style={{
                width: '90px',
                background: `linear-gradient(to right, #1db954 0%, #1db954 ${(status?.volume || 50) / 1.5}%, #4d4d4d ${(status?.volume || 50) / 1.5}%, #4d4d4d 100%)`
              }}
            />
            <span style={{ fontSize: '11px', color: '#b3b3b3', width: '30px' }}>{status?.volume || 50}%</span>
          </div>
        </div>

      </div>



      {/* MODAL: NEW PLAYLIST */}
      {showNewPlaylistModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999
        }}>
          <div style={{
            width: '380px',
            backgroundColor: '#202020',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #333'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>Buat Playlist Baru</h3>
            <input 
              type="text" 
              placeholder="Nama playlist (contoh: Santai Sore)" 
              value={newPlaylistName}
              onChange={e => setNewPlaylistName(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                backgroundColor: '#181818',
                border: '1px solid #444',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
                marginBottom: '18px'
              }}
              onKeyDown={e => e.key === 'Enter' && createPlaylist()}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                onClick={() => setShowNewPlaylistModal(false)}
                style={{ padding: '8px 16px', backgroundColor: '#333', borderRadius: '6px', fontSize: '13px' }}
              >
                Batal
              </button>
              <button 
                onClick={createPlaylist}
                style={{ padding: '8px 16px', backgroundColor: '#1db954', color: '#000', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px' }}
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RIGHT-CLICK CONTEXT MENU */}
      {contextMenu.visible && contextMenu.song && (
        <div
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
          style={{
            position: 'fixed',
            top: `${contextMenu.y}px`,
            left: `${contextMenu.x}px`,
            zIndex: 99999,
            backgroundColor: '#282828',
            borderRadius: '8px',
            padding: '6px',
            boxShadow: '0 12px 32px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.1)',
            minWidth: '220px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px'
          }}
        >
          {/* Song Mini Preview Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 8px',
            borderBottom: '1px solid #383838',
            marginBottom: '4px'
          }}>
            <img
              src={contextMenu.song.thumbnail || 'https://via.placeholder.com/32'}
              alt=""
              style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover' }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#fff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                margin: 0
              }}>
                {contextMenu.song.title}
              </p>
              <p style={{
                fontSize: '11px',
                color: '#aaa',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                margin: '2px 0 0 0'
              }}>
                {contextMenu.song.artist || contextMenu.song.uploader || 'Artis'}
              </p>
            </div>
          </div>

          {/* Action 1: Putar Sekarang */}
          <button
            onClick={() => {
              apiCall('play', { query: contextMenu.song.url });
              showToast(`Memutar: ${contextMenu.song.title}`);
              closeContextMenu();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 12px',
              background: 'transparent',
              border: 'none',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '13px',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'background 0.12s'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#383838'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Play size={15} color="#1db954" fill="#1db954" />
            <span>Putar Sekarang</span>
          </button>

          {/* Action 2: Tambahkan ke Antrean */}
          <button
            onClick={() => {
              apiCall('play', { query: contextMenu.song.url });
              showToast(`Ditambahkan ke antrean: ${contextMenu.song.title}`);
              closeContextMenu();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 12px',
              background: 'transparent',
              border: 'none',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '13px',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'background 0.12s'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#383838'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <ListMusic size={15} color="#1db954" />
            <span>Tambahkan ke Antrean</span>
          </button>

          {/* Action 3: Tambahkan ke Playlist... */}
          <button
            onClick={() => {
              const s = contextMenu.song;
              closeContextMenu();
              openAddToPlaylistModal(s);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 12px',
              background: 'transparent',
              border: 'none',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '13px',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'background 0.12s'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#383838'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <FolderPlus size={15} color="#1db954" />
            <span>Tambahkan ke Playlist...</span>
          </button>

          <div style={{ height: '1px', backgroundColor: '#383838', margin: '4px 0' }} />

          {/* Action 4: Sukai / Hapus dari Favorit */}
          <button
            onClick={() => {
              toggleLikeSong(contextMenu.song);
              closeContextMenu();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 12px',
              background: 'transparent',
              border: 'none',
              borderRadius: '4px',
              color: isSongLiked(contextMenu.song.url) ? '#1db954' : '#fff',
              fontSize: '13px',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'background 0.12s'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#383838'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Heart
              size={15}
              color={isSongLiked(contextMenu.song.url) ? "#1db954" : "#b3b3b3"}
              fill={isSongLiked(contextMenu.song.url) ? "#1db954" : "none"}
            />
            <span>{isSongLiked(contextMenu.song.url) ? "Hapus dari Favorit" : "Sukai Lagu"}</span>
          </button>
        </div>
      )}

      {/* MODAL: TAMBAH KE PLAYLIST */}
      {playlistModalSong && (
        <div 
          onClick={() => setPlaylistModalSong(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99998,
            backdropFilter: 'blur(4px)'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#181818',
              padding: '24px',
              borderRadius: '12px',
              width: '420px',
              maxWidth: '92vw',
              border: '1px solid #333',
              boxShadow: '0 16px 40px rgba(0,0,0,0.85)'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FolderPlus size={20} color="#1db954" />
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', margin: 0 }}>
                  Tambahkan ke Playlist
                </h3>
              </div>
              <button 
                onClick={() => setPlaylistModalSong(null)}
                style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '4px' }}
                onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                onMouseLeave={e => e.currentTarget.style.color = '#888'}
              >
                <X size={18} />
              </button>
            </div>

            {/* Song Card Info */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px',
              backgroundColor: '#242424',
              borderRadius: '8px',
              marginBottom: '18px'
            }}>
              <img 
                src={playlistModalSong.thumbnail || 'https://via.placeholder.com/48'} 
                alt="" 
                style={{ width: '48px', height: '48px', borderRadius: '4px', objectFit: 'cover' }} 
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
                  {playlistModalSong.title}
                </p>
                <p style={{ fontSize: '12px', color: '#888', margin: '2px 0 0 0' }}>
                  {playlistModalSong.uploader || playlistModalSong.artist || 'Artis'}
                </p>
              </div>
            </div>

            {/* Playlists List */}
            <p style={{ fontSize: '12px', color: '#aaa', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '8px' }}>
              Pilih Playlist Anda
            </p>
            <div style={{
              maxHeight: '220px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              marginBottom: '18px',
              paddingRight: '4px'
            }}>
              {playlists.length > 0 ? (
                playlists.map(pl => (
                  <div
                    key={pl.id}
                    onClick={() => addSongToSpecificPlaylist(pl.id, playlistModalSong)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      backgroundColor: '#242424',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#2f2f2f'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#242424'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Folder size={18} color="#1db954" />
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: '600', color: '#fff', margin: 0 }}>{pl.name}</p>
                        <p style={{ fontSize: '11px', color: '#888', margin: 0 }}>{pl.song_count || 0} lagu</p>
                      </div>
                    </div>
                    <Plus size={16} color="#888" />
                  </div>
                ))
              ) : (
                <p style={{ fontSize: '13px', color: '#666', fontStyle: 'italic', padding: '8px 0' }}>
                  Anda belum memiliki playlist. Buat playlist baru di bawah:
                </p>
              )}
            </div>

            {/* Create New Playlist & Add Section */}
            <div style={{ borderTop: '1px solid #282828', paddingTop: '14px' }}>
              <p style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>
                Atau buat playlist baru:
              </p>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  createAndAddSongToPlaylist(playlistModalSong);
                }}
                style={{ display: 'flex', gap: '8px' }}
              >
                <input
                  type="text"
                  placeholder="Nama playlist baru..."
                  value={modalNewPlaylistName}
                  onChange={e => setModalNewPlaylistName(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    backgroundColor: '#121212',
                    border: '1px solid #333',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
                <button
                  type="submit"
                  disabled={!modalNewPlaylistName.trim()}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: modalNewPlaylistName.trim() ? '#1db954' : '#333',
                    color: modalNewPlaylistName.trim() ? '#000' : '#888',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: modalNewPlaylistName.trim() ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Plus size={14} /> Simpan
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
