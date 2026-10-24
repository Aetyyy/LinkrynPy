import re
import json
import urllib.parse
import aiohttp

SPOTIFY_TRACK_RE = re.compile(r'https?://open\.spotify\.com/(?:intl-[a-z]+/)?track/([a-zA-Z0-9]+)')
SPOTIFY_PLAYLIST_RE = re.compile(r'https?://open\.spotify\.com/(?:intl-[a-z]+/)?playlist/([a-zA-Z0-9]+)')
SPOTIFY_ALBUM_RE = re.compile(r'https?://open\.spotify\.com/(?:intl-[a-z]+/)?album/([a-zA-Z0-9]+)')

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

class SpotifyHelper:
    @staticmethod
    def is_spotify_url(url: str) -> bool:
        return 'spotify.com' in url

    @classmethod
    async def extract_spotify_queries(cls, url: str) -> list[str]:
        """
        Mengekstrak judul lagu + artis dari Spotify (Track, Playlist, atau Album)
        tanpa memerlukan Client ID / Secret API key.
        Mengembalikan list kata kunci yang siap dicari ke YouTube.
        """
        track_match = SPOTIFY_TRACK_RE.search(url)
        playlist_match = SPOTIFY_PLAYLIST_RE.search(url)
        album_match = SPOTIFY_ALBUM_RE.search(url)

        if track_match:
            track_id = track_match.group(1)
            embed_url = f"https://open.spotify.com/embed/track/{track_id}"
            async with aiohttp.ClientSession(headers=HEADERS) as session:
                async with session.get(embed_url) as resp:
                    if resp.status == 200:
                        html = await resp.text()
                        matches = re.findall(r'<script id=.__NEXT_DATA__. type=.application/json.>(.*?)</script>', html)
                        if matches:
                            data = json.loads(matches[0])
                            ent = data.get('props', {}).get('pageProps', {}).get('state', {}).get('data', {}).get('entity', {})
                            title = ent.get('title') or ent.get('name')
                            artists = ent.get('artists', [])
                            artist_name = artists[0].get('name') if artists else ent.get('subtitle', '')
                            if title:
                                query = f"{artist_name} - {title}" if artist_name else title
                                return [query]

        elif playlist_match or album_match:
            entity_type = "playlist" if playlist_match else "album"
            entity_id = playlist_match.group(1) if playlist_match else album_match.group(1)
            embed_url = f"https://open.spotify.com/embed/{entity_type}/{entity_id}"
            
            async with aiohttp.ClientSession(headers=HEADERS) as session:
                async with session.get(embed_url) as resp:
                    if resp.status == 200:
                        html = await resp.text()
                        matches = re.findall(r'<script id=.__NEXT_DATA__. type=.application/json.>(.*?)</script>', html)
                        if matches:
                            data = json.loads(matches[0])
                            track_list = data.get('props', {}).get('pageProps', {}).get('state', {}).get('data', {}).get('entity', {}).get('trackList', [])
                            queries = []
                            for track in track_list:
                                title = track.get('title')
                                subtitle = track.get('subtitle', '')
                                if title:
                                    queries.append(f"{subtitle} - {title}" if subtitle else title)
                            return queries

        return []
