import asyncio
import functools
import os
import shutil
import discord
import yt_dlp

def find_ffmpeg_executable() -> str:
    """Cari ffmpeg di PATH sistem atau lokasi instalasi WinGet secara otomatis."""
    which_ffmpeg = shutil.which("ffmpeg")
    if which_ffmpeg:
        return which_ffmpeg

    # Cek lokasi WinGet default di Windows
    localappdata = os.environ.get("LOCALAPPDATA", "")
    if localappdata:
        winget_path = os.path.join(localappdata, "Microsoft", "WinGet", "Packages")
        if os.path.exists(winget_path):
            for root, dirs, files in os.walk(winget_path):
                if "ffmpeg.exe" in files:
                    return os.path.join(root, "ffmpeg.exe")

    return "ffmpeg"

FFMPEG_EXECUTABLE = find_ffmpeg_executable()

class YTDLLogger:
    def debug(self, msg):
        pass
    def warning(self, msg):
        pass
    def error(self, msg):
        pass

# Konfigurasi yt-dlp untuk stabilitas streaming audio tinggi dan dukungan playlist
YTDL_OPTIONS = {
    'format': 'bestaudio/best',
    'extractaudio': True,
    'audioformat': 'mp3',
    'outtmpl': '%(extractor)s-%(id)s-%(title)s.%(ext)s',
    'restrictfilenames': True,
    'noplaylist': False,
    'extract_flat': 'in_playlist',
    'ignoreerrors': True,
    'nocheckcertificate': True,
    'logtostderr': False,
    'quiet': True,
    'no_warnings': True,
    'default_search': 'ytsearch',
    'source_address': '0.0.0.0',
    'logger': YTDLLogger(),
}

def build_ffmpeg_options(
    seek_seconds: int = 0,
    bass_boost: str = "off",
    nightcore: bool = False,
    speed: float = 1.0,
    equalizer: str = "off",
    custom_eq: list[int] | None = None,
    vaporwave: bool = False,
    treble: int = 0,
    karaoke: bool = False
) -> tuple[str, str]:
    """Menyusun parameter FFmpeg sebelum dan filter audio (bass boost, nightcore, speed, equalizer, custom EQ, dll.)."""
    before = "-reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 5"
    if seek_seconds > 0:
        before += f" -ss {seek_seconds}"

    filters = []

    # 1. Bass Boost (Dukung penamaan low/soft, medium, high/hard, dan extreme)
    if bass_boost in ("low", "soft"):
        filters.append("bass=g=6:f=110:w=0.6")
    elif bass_boost == "medium":
        filters.append("bass=g=11:f=110:w=0.6")
    elif bass_boost in ("high", "hard"):
        filters.append("bass=g=16:f=110:w=0.6")
    elif bass_boost == "extreme":
        filters.append("bass=g=22:f=110:w=0.6")

    # 2. Equalizer Presets & Custom Multi-Band EQ
    if equalizer == "custom" and custom_eq and len(custom_eq) == 5:
        b0, b1, b2, b3, b4 = [max(-12, min(12, int(v))) for v in custom_eq]
        filters.append(f"equalizer=f=60:t=q:w=1:g={b0},equalizer=f=230:t=q:w=1:g={b1},equalizer=f=910:t=q:w=1:g={b2},equalizer=f=3600:t=q:w=1:g={b3},equalizer=f=14000:t=q:w=1:g={b4}")
    elif equalizer == "pop":
        filters.append("equalizer=f=64:t=q:w=1:g=2,equalizer=f=250:t=q:w=1:g=3,equalizer=f=1000:t=q:w=1:g=4,equalizer=f=4000:t=q:w=1:g=3,equalizer=f=12000:t=q:w=1:g=2")
    elif equalizer == "rock":
        filters.append("equalizer=f=64:t=q:w=1:g=5,equalizer=f=250:t=q:w=1:g=3,equalizer=f=1000:t=q:w=1:g=-2,equalizer=f=4000:t=q:w=1:g=4,equalizer=f=12000:t=q:w=1:g=5")
    elif equalizer == "electronic":
        filters.append("equalizer=f=64:t=q:w=1:g=6,equalizer=f=250:t=q:w=1:g=4,equalizer=f=1000:t=q:w=1:g=0,equalizer=f=4000:t=q:w=1:g=3,equalizer=f=12000:t=q:w=1:g=5")
    elif equalizer == "classical":
        filters.append("equalizer=f=64:t=q:w=1:g=4,equalizer=f=250:t=q:w=1:g=2,equalizer=f=1000:t=q:w=1:g=-1,equalizer=f=4000:t=q:w=1:g=3,equalizer=f=12000:t=q:w=1:g=4")
    elif equalizer == "jazz":
        filters.append("equalizer=f=64:t=q:w=1:g=3,equalizer=f=250:t=q:w=1:g=2,equalizer=f=1000:t=q:w=1:g=1,equalizer=f=4000:t=q:w=1:g=2,equalizer=f=12000:t=q:w=1:g=4")
    elif equalizer == "vocal":
        filters.append("equalizer=f=64:t=q:w=1:g=-3,equalizer=f=250:t=q:w=1:g=-1,equalizer=f=1000:t=q:w=1:g=5,equalizer=f=4000:t=q:w=1:g=4,equalizer=f=12000:t=q:w=1:g=1")

    # 3. Treble Booster / Reducer
    if treble != 0:
        filters.append(f"treble=g={treble}:f=3000:w=0.5")

    # 4. Karaoke (Vocal Remover dengan peredaman center mono phase yang aman di FFmpeg)
    if karaoke:
        filters.append("stereotools=mlev=0.03:slev=1.4")

    # 5. Pitch & Tempo (Nightcore / Vaporwave / Speed)
    if vaporwave:
        filters.append("aresample=48000,asetrate=48000*0.8,atempo=1.0")
    elif nightcore:
        filters.append("asetrate=48000*1.25,aresample=48000,atempo=1.05")
    elif speed != 1.0:
        clamped_speed = max(0.5, min(speed, 2.0))
        filters.append(f"atempo={clamped_speed}")

    options = "-vn"
    if filters:
        options += f' -af "{",".join(filters)}"'

    return before, options

ytdl = yt_dlp.YoutubeDL(YTDL_OPTIONS)

class YTDLSource(discord.PCMVolumeTransformer):
    """
    Wrapper untuk audio streaming dari YouTube / URL lain menggunakan yt-dlp & FFmpeg.
    """
    def __init__(self, source: discord.AudioSource, *, data: dict, volume: float = 0.5):
        super().__init__(source, volume)
        self.data = data
        self.title = data.get('title', 'Unknown Title')
        self.url = data.get('webpage_url', '')
        self.duration = data.get('duration', 0)
        self.thumbnail = data.get('thumbnail', None)
        self.uploader = data.get('uploader', 'Unknown Artist')

    @classmethod
    async def get_streamable_data(cls, webpage_or_id: str, *, loop: asyncio.AbstractEventLoop = None):
        """Mengekstrak stream URL langsung (audio direct URL) saat lagu akan diputar."""
        loop = loop or asyncio.get_event_loop()
        target_url = webpage_or_id
        if "music.youtube.com" in target_url:
            target_url = target_url.replace("music.youtube.com", "www.youtube.com")

        def _fetch():
            stream_opts = {
                'format': 'bestaudio/best',
                'extractaudio': True,
                'audioformat': 'mp3',
                'noplaylist': True,
                'ignoreerrors': True,
                'quiet': True,
                'no_warnings': True,
                'nocheckcertificate': True,
                'logger': YTDLLogger(),
            }
            with yt_dlp.YoutubeDL(stream_opts) as ydl:
                try:
                    data = ydl.extract_info(target_url, download=False)
                    if data and 'entries' in data:
                        valid = [e for e in data['entries'] if e]
                        return valid[0] if valid else None
                    return data
                except Exception:
                    return None

        return await loop.run_in_executor(None, _fetch)

    @classmethod
    async def create_source(cls, search: str, *, loop: asyncio.AbstractEventLoop = None, volume: float = 0.5):
        loop = loop or asyncio.get_event_loop()
        
        # Eksekusi yt-dlp di executor agar tidak memblokir event loop Discord
        partial_extract = functools.partial(ytdl.extract_info, search, download=False)
        data = await loop.run_in_executor(None, partial_extract)

        if data is None:
            return None

        # Jika hasil adalah search query (ytsearch) atau playlist
        if 'entries' in data:
            entries = [e for e in data['entries'] if e is not None]
            if not entries:
                return None
            data = entries[0]

        audio_url = data.get('url')
        before_opts, filter_opts = build_ffmpeg_options()
        return cls(
            discord.FFmpegPCMAudio(
                audio_url,
                executable=FFMPEG_EXECUTABLE,
                before_options=before_opts,
                options=filter_opts
            ),
            data=data,
            volume=volume
        )

    @classmethod
    async def extract_search_list(cls, search: str, max_results: int = 5, *, loop: asyncio.AbstractEventLoop = None):
        """Mencari hingga N lagu untuk fitur search & selection."""
        loop = loop or asyncio.get_event_loop()
        query = f"ytsearch{max_results}:{search}"
        
        def _fetch():
            search_opts = {
                'format': 'bestaudio/best',
                'extract_flat': True,
                'ignoreerrors': True,
                'quiet': True,
                'no_warnings': True,
                'nocheckcertificate': True,
                'logger': YTDLLogger(),
            }
            with yt_dlp.YoutubeDL(search_opts) as ydl:
                try:
                    data = ydl.extract_info(query, download=False)
                    if not data or 'entries' not in data:
                        return []
                    return [e for e in data['entries'] if e is not None]
                except Exception:
                    return []

        return await loop.run_in_executor(None, _fetch)

    @classmethod
    async def extract_info(cls, search: str, *, loop: asyncio.AbstractEventLoop = None):
        """Mengekstrak informasi lagu atau playlist tanpa membuat AudioSource langsung."""
        loop = loop or asyncio.get_event_loop()
        target = search
        if "music.youtube.com" in target:
            target = target.replace("music.youtube.com", "www.youtube.com")

        def _fetch():
            try:
                return ytdl.extract_info(target, download=False)
            except Exception:
                try:
                    fallback_opts = dict(YTDL_OPTIONS)
                    fallback_opts['extract_flat'] = True
                    with yt_dlp.YoutubeDL(fallback_opts) as ydl:
                        return ydl.extract_info(target, download=False)
                except Exception:
                    return None

        return await loop.run_in_executor(None, _fetch)
