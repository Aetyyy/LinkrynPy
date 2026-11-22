import asyncio
import functools
import os
import shutil
import discord
from audio_filter_utils import EQ_BAND_FREQUENCIES, normalize_custom_eq
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

# Deteksi otomatis cookies.txt di direktori kerja atau direktori file ini
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
COOKIE_FILE = next(
    (p for p in [os.path.join(os.getcwd(), "cookies.txt"), os.path.join(BASE_DIR, "cookies.txt")] if os.path.exists(p)),
    None
)

# Daftar player client YouTube yang dicoba secara berurutan.
# 'ios' dan 'android_music' tidak memerlukan PO token / BotGuard — aman dipakai di VPS/datacenter IP.
# 'mweb' dan 'web' memerlukan PO token dari browser nyata, dihindari.
_YT_PLAYER_CLIENTS = ["ios", "android_music", "tv_embedded"]


class YTDLLogger:
    def debug(self, msg):
        pass

    def warning(self, msg):
        print(f"[yt-dlp warning] {msg}")

    def error(self, msg):
        print(f"[yt-dlp error] {msg}")


# Konfigurasi yt-dlp untuk stabilitas streaming audio tinggi dan dukungan playlist
YTDL_OPTIONS = {
    'format': 'bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio/best',
    'outtmpl': '%(extractor)s-%(id)s-%(title)s.%(ext)s',
    'restrictfilenames': True,
    'noplaylist': False,
    'extract_flat': False,
    'ignoreerrors': True,
    'nocheckcertificate': True,
    'logtostderr': False,
    'quiet': False,
    'no_warnings': False,
    'default_search': 'ytsearch',
    'source_address': '0.0.0.0',
    'extractor_args': {'youtube': {'player_client': _YT_PLAYER_CLIENTS}},
    **({'cookiefile': COOKIE_FILE} if COOKIE_FILE else {}),
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
    karaoke: bool = False,
    http_headers: dict | None = None
) -> tuple[str, str]:
    """Menyusun parameter FFmpeg sebelum dan filter audio (bass boost, nightcore, speed, equalizer, custom EQ, dll.)."""
    before = "-reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 5"
    if http_headers:
        header_str = "".join(f"{k}: {v}\r\n" for k, v in http_headers.items())
        before += f' -headers "{header_str}"'
    if seek_seconds > 0:
        before += f" -ss {seek_seconds}"

    filters = []

    # 1. Bass Boost (Dukung penamaan low/soft, medium, high/hard, dan extreme)
    if bass_boost in ("low", "soft"):
        filters.append("bass=g=3:f=110:w=0.6")
    elif bass_boost == "medium":
        filters.append("bass=g=6:f=110:w=0.6")
    elif bass_boost in ("high", "hard"):
        filters.append("bass=g=9:f=110:w=0.6")
    elif bass_boost == "extreme":
        filters.append("bass=g=12:f=110:w=0.6")

    # 2. Ten-band EQ, with careful presets and support for old five-band settings.
    preset_bands = {
        "off": [0] * 10,
        "pop": [2, 1, 0, 2, 3, 3, 1, 2, 2, 1],
        "rock": [4, 3, 2, -1, -2, 0, 2, 4, 4, 3],
        "classical": [3, 2, 0, -2, -1, 1, 2, 3, 3, 2],
        "jazz": [3, 2, 1, 0, -1, 1, 2, 3, 3, 2],
        "electronic": [5, 4, 2, 0, -1, 1, 2, 3, 4, 4],
        "vocal": [-2, -1, 0, 2, 3, 4, 3, 1, 0, -1],
    }
    eq_bands = normalize_custom_eq(custom_eq) if equalizer == "custom" else preset_bands.get(equalizer, [0] * 10)
    for frequency, gain in zip(EQ_BAND_FREQUENCIES, eq_bands):
        if gain:
            filters.append(f"equalizer=f={frequency}:t=q:w=1:g={gain}")

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

    # Keep EQ boosts from clipping while preserving the source's dynamics.
    filters.append("alimiter=limit=0.95:attack=5:release=50:level=0:latency=1")

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
                'format': 'bestaudio[ext=m4a]/bestaudio/best',
                'noplaylist': True,
                'ignoreerrors': True,
                'quiet': False,
                'no_warnings': False,
                'nocheckcertificate': True,
                'source_address': '0.0.0.0',
                'extractor_args': {'youtube': {'player_client': _YT_PLAYER_CLIENTS}},
                **({'cookiefile': COOKIE_FILE} if COOKIE_FILE else {}),
                'logger': YTDLLogger(),
            }
            with yt_dlp.YoutubeDL(stream_opts) as ydl:
                try:
                    data = ydl.extract_info(target_url, download=False)
                    if data and 'entries' in data:
                        valid = [e for e in data['entries'] if e]
                        return valid[0] if valid else None
                    return data
                except Exception as e:
                    print(f"[get_streamable_data error] {e}")
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
        before_opts, filter_opts = build_ffmpeg_options(http_headers=data.get('http_headers'))
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
    async def fetch_music_metadata(cls, query: str) -> dict | None:
        """Mengambil metadata resmi lagu (Title, Artist, Album, Duration) dari iTunes Search API,
        fallback ke LRCLIB dan Deezer API tanpa auth kompleks."""
        import urllib.parse
        import re
        try:
            import aiohttp
            # Bersihkan query dari noise kata-kata video/audio ekstra
            clean_q = re.sub(r'[\(\[\{][^\)\]\}]*[\)\]\}]', '', query)
            clean_q = re.sub(r'(?i)\b(official|music\s+video|video|audio|lyrics?|lyric\s+video|mv|4k|hd|remastered)\b', '', clean_q)
            clean_q = re.sub(r'\s+', ' ', clean_q).strip(' -•|')
            search_term = clean_q or query.strip()
            headers = {'User-Agent': 'LinkrynMusicBot/2.0 (Mozilla/5.0)'}

            async with aiohttp.ClientSession(headers=headers) as session:
                # 1. Prioritas Utama: iTunes Search API (cepat, CDN global, akurat milidetik)
                try:
                    itunes_url = f"https://itunes.apple.com/search?term={urllib.parse.quote(search_term)}&media=music&entity=song&limit=4"
                    async with session.get(itunes_url, timeout=aiohttp.ClientTimeout(total=2.5)) as r:
                        if r.status == 200:
                            data = await r.json(content_type=None)
                            results = data.get("results") or []
                            if results:
                                top = results[0]
                                dur = float(top.get("trackTimeMillis") or 0.0) / 1000.0
                                if dur > 30.0:
                                    return {
                                        "title": top.get("trackName"),
                                        "artist": top.get("artistName"),
                                        "album": top.get("collectionName", ""),
                                        "duration": round(dur, 2),
                                        "source": "itunes"
                                    }
                except Exception:
                    pass

                # 2. Fallback: LRCLIB API (/api/get jika ada ' - ', lalu /api/search)
                try:
                    if ' - ' in search_term:
                        parts = search_term.split(' - ', 1)
                        p0, p1 = parts[0].strip(), parts[1].strip()
                        for art, trk in [(p0, p1), (p1, p0)]:
                            params = urllib.parse.urlencode({"artist_name": art, "track_name": trk})
                            try:
                                async with session.get(f"https://lrclib.net/api/get?{params}", timeout=aiohttp.ClientTimeout(total=2.0)) as resp:
                                    if resp.status == 200:
                                        item = await resp.json()
                                        dur = float(item.get("duration") or 0.0)
                                        if dur > 30.0:
                                            return {
                                                "title": item.get("trackName"),
                                                "artist": item.get("artistName"),
                                                "album": item.get("albumName", ""),
                                                "duration": round(dur, 2),
                                                "source": "lrclib"
                                            }
                            except Exception:
                                pass

                    async with session.get(f"https://lrclib.net/api/search?q={urllib.parse.quote(search_term)}", timeout=aiohttp.ClientTimeout(total=2.5)) as resp:
                        if resp.status == 200:
                            results = await resp.json()
                            if results and isinstance(results, list):
                                for item in results:
                                    dur = float(item.get("duration") or 0.0)
                                    if dur > 30.0:
                                        return {
                                            "title": item.get("trackName"),
                                            "artist": item.get("artistName"),
                                            "album": item.get("albumName", ""),
                                            "duration": round(dur, 2),
                                            "source": "lrclib"
                                        }
                except Exception:
                    pass

                # 3. Fallback: Deezer API
                try:
                    deezer_url = f"https://api.deezer.com/search?q={urllib.parse.quote(search_term)}&limit=3"
                    async with session.get(deezer_url, timeout=aiohttp.ClientTimeout(total=2.5)) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            results = data.get("data") or []
                            if results:
                                top = results[0]
                                dur = float(top.get("duration") or 0.0)
                                if dur > 30.0:
                                    return {
                                        "title": top.get("title"),
                                        "artist": (top.get("artist") or {}).get("name"),
                                        "album": (top.get("album") or {}).get("title", ""),
                                        "duration": round(dur, 2),
                                        "source": "deezer"
                                    }
                except Exception:
                    pass
        except Exception:
            pass
        return None

    @classmethod
    async def fetch_lrclib_info(cls, query: str) -> dict | None:
        """Mengambil metadata lagu studio asli dan durasi dari LRCLIB API (backward-compatible)."""
        meta = await cls.fetch_music_metadata(query)
        if meta:
            return {
                "trackName": meta.get("title"),
                "artistName": meta.get("artist"),
                "albumName": meta.get("album"),
                "duration": meta.get("duration")
            }
        return None

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
                'extractor_args': {'youtube': {'player_client': _YT_PLAYER_CLIENTS}},
                **({'cookiefile': COOKIE_FILE} if COOKIE_FILE else {}),
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
        """Mengekstrak informasi lagu atau playlist tanpa membuat AudioSource langsung.
        Memprioritaskan audio studio murni (Topic / Official Audio) dan sinkronisasi durasi LRCLIB (selisih <= 2s).
        """
        loop = loop or asyncio.get_event_loop()
        target = search
        if "music.youtube.com" in target:
            target = target.replace("music.youtube.com", "www.youtube.com")

        # Jika input adalah URL langsung (YouTube/SoundCloud/Spotify dll.)
        is_direct_url = target.startswith("http://") or target.startswith("https://")
        if is_direct_url:
            def _fetch_direct():
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
            return await loop.run_in_executor(None, _fetch_direct)

        # Jika input adalah kata kunci pencarian (search query):
        # 1. Cek metadata resmi (Title, Artist, Album, Duration) dari iTunes / LRCLIB / Deezer API
        meta = await cls.fetch_music_metadata(target)
        meta_dur = float(meta.get("duration") or 0.0) if meta else None
        meta_artist = meta.get("artist") if meta else None
        meta_title = meta.get("title") if meta else None

        def _fetch_search():
            # Bentuk beberapa kandidat query pencarian dengan prioritas studio audio / Auto-generated / Topic
            query_candidates = []
            if meta_artist and meta_title:
                query_candidates.append(f"ytsearch5:{meta_artist} - {meta_title} Auto-generated by YouTube")
                query_candidates.append(f"ytsearch5:{meta_artist} - {meta_title} Topic")
                query_candidates.append(f"ytsearch5:{meta_artist} - {meta_title} Official Audio")

            lower_target = target.lower()
            if "topic" not in lower_target and "official audio" not in lower_target and "auto-generated" not in lower_target:
                query_candidates.append(f"ytsearch5:{target} Official Audio")
                query_candidates.append(f"ytsearch5:{target} Topic")
            query_candidates.append(f"ytsearch5:{target}")

            search_opts = dict(YTDL_OPTIONS)
            search_opts['noplaylist'] = True

            with yt_dlp.YoutubeDL(search_opts) as ydl:
                collected_entries = []
                for q in query_candidates:
                    try:
                        res = ydl.extract_info(q, download=False)
                        if res and 'entries' in res:
                            for ent in res['entries']:
                                if ent and ent.get('id') and ent not in collected_entries:
                                    collected_entries.append(ent)
                                    # Cek langsung: jika selisih durasi kurang dari 2 detik dari metadata resmi
                                    if meta_dur and meta_dur > 0:
                                        ent_dur = float(ent.get('duration') or 0.0)
                                        if ent_dur > 0 and abs(ent_dur - meta_dur) < 2.0:
                                            ent['official_metadata'] = meta
                                            ent['official_duration'] = meta_dur
                                            ent['lrclib_duration'] = meta_dur
                                            return ent
                        # Jika sudah mengumpulkan cukup entri, hentikan iterasi query
                        if len(collected_entries) >= 6:
                            break
                    except Exception:
                        continue

                if not collected_entries:
                    # Fallback ke default extract_info target biasa
                    try:
                        res = ydl.extract_info(target, download=False)
                        if res and meta:
                            if 'entries' in res and res['entries']:
                                for e in res['entries']:
                                    if e:
                                        e['official_metadata'] = meta
                                        e['official_duration'] = meta_dur
                                        e['lrclib_duration'] = meta_dur
                            else:
                                res['official_metadata'] = meta
                                res['official_duration'] = meta_dur
                                res['lrclib_duration'] = meta_dur
                        return res
                    except Exception:
                        return None

                # Prioritas 1: Selisih durasi kurang dari 2 detik dari durasi metadata resmi
                if meta_dur and meta_dur > 0:
                    for ent in collected_entries:
                        ent_dur = float(ent.get('duration') or 0.0)
                        if ent_dur > 0 and abs(ent_dur - meta_dur) < 2.0:
                            ent['official_metadata'] = meta
                            ent['official_duration'] = meta_dur
                            ent['lrclib_duration'] = meta_dur
                            return ent

                # Prioritas 2: Cari entri dengan channel '- Topic' atau judul ber-keyword 'Official Audio'
                for ent in collected_entries:
                    uploader = str(ent.get('uploader') or ent.get('channel') or '').lower()
                    title = str(ent.get('title') or '').lower()
                    if 'topic' in uploader or 'official audio' in title or 'auto-generated' in title:
                        if meta:
                            ent['official_metadata'] = meta
                            ent['official_duration'] = meta_dur
                            ent['lrclib_duration'] = meta_dur
                        return ent

                # Prioritas 3: Kembalikan entri valid teratas
                best_ent = collected_entries[0]
                if meta:
                    best_ent['official_metadata'] = meta
                    best_ent['official_duration'] = meta_dur
                    best_ent['lrclib_duration'] = meta_dur
                return best_ent

        return await loop.run_in_executor(None, _fetch_search)