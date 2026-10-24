import time
import random
from collections import deque
import discord

class Song:
    def __init__(self, data: dict, requester: discord.Member):
        self.data = data
        self.title = data.get('title', 'Unknown Title')
        self.url = data.get('webpage_url', '')
        self.duration = data.get('duration', 0)
        self.thumbnail = data.get('thumbnail', None)
        self.uploader = data.get('uploader', 'Unknown Artist')
        self.requester = requester
        self.start_time: float | None = None
        self.is_autoplay: bool = False

    def format_duration(self, seconds: int | float | None = None) -> str:
        sec_val = self.duration if seconds is None else seconds
        if not sec_val:
            return "Livestream / Tidak diketahui"
        mins, secs = divmod(int(sec_val), 60)
        hrs, mins = divmod(mins, 60)
        if hrs > 0:
            return f"{hrs:02d}:{mins:02d}:{secs:02d}"
        return f"{mins:02d}:{secs:02d}"

    def get_progress(self) -> tuple[int, str]:
        """Menghitung waktu berjalan dan progress bar audio."""
        if not self.start_time or not self.duration:
            return 0, "🔘" + "▬" * 15
        elapsed = int(time.time() - self.start_time)
        elapsed = min(elapsed, int(self.duration))
        progress = elapsed / self.duration
        total_bars = 16
        filled = min(int(progress * total_bars), total_bars)
        bar = "▬" * filled + "🔘" + "▬" * (total_bars - filled)
        return elapsed, bar

class MusicQueue:
    def __init__(self):
        self.queue: deque[Song] = deque()
        self.history: list[Song] = []
        self.current: Song | None = None
        self.loop_mode: str = "off"  # "off", "track", "queue"
        self.volume: float = 0.5
        
        # Audio Filters
        self.bass_boost: str = "off"  # "off", "low", "medium", "high"
        self.speed: float = 1.0
        self.nightcore: bool = False
        self.equalizer: str = "off"   # "off", "flat", "pop", "rock", "classical", "electronic", "vocal"
        self.vaporwave: bool = False
        self.treble: int = 0          # -10 sampai 10 dB
        self.karaoke: bool = False
        
        # Fitur Baru: Autoplay & Dynamic Message
        self.autoplay: bool = True           # Default ON
        self.last_nowplaying_msg: discord.Message | None = None
        self.played_titles: set[str] = set() # Mencegah rekomendasi lagu yang sama berulang
        self.preferred_genre_keywords: list[str] = [] # Mengunci kata kunci pencarian rekomendasi
        self.preferred_genre_category: str = "general" # Kategori genre terkunci (akustik_indo, jawa_koplo, dll.)
        self.prefetched_autoplay_song: Song | None = None # Pre-fetch lagu autoplay agar instan tanpa mikir lama
        
        self.is_restarting: bool = False  # Flag mencegah after_playback memajukan antrean saat restart stream
        self.auto_leave_task = None
        self.votes: set[int] = set()

    @property
    def filters(self):
        class FilterProxy(dict):
            def __init__(self, mq):
                super().__init__()
                self.mq = mq
            def __getitem__(self, item):
                attr_map = {
                    "bassboost": "bass_boost",
                    "bass_boost": "bass_boost",
                    "equalizer": "equalizer",
                    "nightcore": "nightcore",
                    "vaporwave": "vaporwave",
                    "speed": "speed",
                    "treble": "treble",
                    "karaoke": "karaoke"
                }
                attr = attr_map.get(item, item)
                return getattr(self.mq, attr, None)
            def __setitem__(self, item, value):
                attr_map = {
                    "bassboost": "bass_boost",
                    "bass_boost": "bass_boost",
                    "equalizer": "equalizer",
                    "nightcore": "nightcore",
                    "vaporwave": "vaporwave",
                    "speed": "speed",
                    "treble": "treble",
                    "karaoke": "karaoke"
                }
                attr = attr_map.get(item, item)
                if attr == "treble" and isinstance(value, str):
                    treble_map = {"off": 0, "low": 4, "medium": 8, "high": 12}
                    value = treble_map.get(value, 0)
                setattr(self.mq, attr, value)
            def get(self, item, default=None):
                val = self[item]
                return val if val is not None else default
        return FilterProxy(self)

    @filters.setter
    def filters(self, val):
        if isinstance(val, dict):
            for k, v in val.items():
                self.filters[k] = v

    def add(self, song: Song, top: bool = False):
        if top:
            self.queue.appendleft(song)
        else:
            self.queue.append(song)

    def next(self) -> Song | None:
        self.votes.clear()
        if self.loop_mode == "track" and self.current:
            self.current.start_time = time.time()
            return self.current

        if self.current:
            self.history.append(self.current)
            if self.loop_mode == "queue":
                self.queue.append(self.current)

        if len(self.queue) > 0:
            self.current = self.queue.popleft()
            self.current.start_time = time.time()
            if self.current:
                self.played_titles.add(self.current.title.lower().strip())
            return self.current

        self.current = None
        return None

    def shuffle(self):
        temp = list(self.queue)
        random.shuffle(temp)
        self.queue = deque(temp)

    def clear(self):
        self.queue.clear()
        self.prefetched_autoplay_song = None
        self.preferred_genre_keywords = []
        self.preferred_genre_category = "general"

    def remove(self, index: int) -> Song | None:
        if 0 <= index < len(self.queue):
            song = self.queue[index]
            del self.queue[index]
            return song
        return None

    def move(self, from_idx: int, to_idx: int) -> Song | None:
        if 0 <= from_idx < len(self.queue) and 0 <= to_idx < len(self.queue):
            song = self.queue[from_idx]
            del self.queue[from_idx]
            self.queue.insert(to_idx, song)
            return song
        return None
