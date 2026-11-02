import os
from aiohttp import web
from server import (
    AuthHandlerMixin,
    StatusHandlerMixin,
    PlaybackHandlerMixin,
    FilterHandlerMixin,
    LibraryHandlerMixin,
    PlaylistHandlerMixin,
)

class WebDashboard(
    AuthHandlerMixin,
    StatusHandlerMixin,
    PlaybackHandlerMixin,
    FilterHandlerMixin,
    LibraryHandlerMixin,
    PlaylistHandlerMixin,
):
    """
    Modular Web Dashboard Server untuk Linkryn Bot.
    Menghubungkan arsitektur modular backend (Auth, Status, Playback, Filter, Library, Playlist).
    """

    def __init__(self, bot, host: str = "0.0.0.0", port: int = 5000):
        self.bot = bot
        self.host = host
        self.port = port
        self.app = web.Application()
        self.runner = None
        self.site = None
        self.ws_clients: set[web.WebSocketResponse] = set()
        self.user_sessions: dict[str, dict] = {} # token -> user_dict
        self.recs_cache: dict[str, list[dict]] = {} # cat -> list of songs
        self.lyrics_cache: dict[str, tuple[float, dict]] = {}
        self.setup_routes()

    def get_manager(self):
        return self.bot.get_cog("MusicManager")

    def _cors_headers(self):
        return {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        }

    def json_response(self, data, status: int = 200):
        return web.json_response(data, status=status, headers=self._cors_headers())

    def setup_routes(self):
        self.app.router.add_route("OPTIONS", "/{tail:.*}", self.handle_options)

        # 1. WebSocket Realtime Sync
        self.app.router.add_get("/ws", self.websocket_handler)

        # 2. Autentikasi & Pengguna (server/auth_handler.py)
        self.app.router.add_get("/api/auth/me", self.get_auth_me)
        self.app.router.add_get("/api/auth/config", self.get_auth_config)
        self.app.router.add_get("/api/auth/discord", self.discord_login_redirect)
        self.app.router.add_get("/api/auth/callback", self.discord_oauth_callback)
        self.app.router.add_post("/api/auth/token_exchange", self.post_token_exchange)

        # 3. Status Server & Discord Presence (server/status_handler.py)
        self.app.router.add_get("/api/guilds", self.get_guilds)
        self.app.router.add_get("/api/status", self.get_status)

        # 4. Playback Controls & Queue (server/playback_handler.py)
        self.app.router.add_post("/api/play", self.post_play)
        self.app.router.add_post("/api/pause", self.post_pause)
        self.app.router.add_post("/api/resume", self.post_resume)
        self.app.router.add_post("/api/skip", self.post_skip)
        self.app.router.add_post("/api/stop", self.post_stop)
        self.app.router.add_post("/api/shuffle", self.post_shuffle)
        self.app.router.add_post("/api/loop", self.post_loop)
        self.app.router.add_post("/api/volume", self.post_volume)
        self.app.router.add_post("/api/seek", self.post_seek)
        self.app.router.add_post("/api/remove", self.post_remove)

        # 5. Audio Filters & Equalizer (server/filter_handler.py)
        self.app.router.add_post("/api/filter", self.post_filter)
        self.app.router.add_get("/api/user/filters", self.get_user_filters)
        self.app.router.add_post("/api/user/filters", self.post_user_filters)

        # 6. Library, Search, Recs & Lyrics (server/library_handler.py)
        self.app.router.add_get("/api/search", self.get_search)
        self.app.router.add_get("/api/recommendations", self.get_recommendations)
        self.app.router.add_get("/api/history", self.get_history)
        self.app.router.add_get("/api/likes", self.get_likes)
        self.app.router.add_post("/api/likes", self.post_like)
        self.app.router.add_delete("/api/likes", self.delete_like)
        self.app.router.add_post("/api/likes/play", self.post_play_likes)
        self.app.router.add_post("/api/lyrics", self.post_lyrics)
        self.app.router.add_post("/api/dj/grant", self.post_dj_grant)
        self.app.router.add_post("/api/dj/revoke", self.post_dj_revoke)

        # 7. Custom Playlists (server/playlist_handler.py)
        self.app.router.add_get("/api/playlists", self.get_playlists)
        self.app.router.add_post("/api/playlists", self.post_create_playlist)
        self.app.router.add_delete("/api/playlists/{id}", self.delete_playlist)
        self.app.router.add_get("/api/playlists/{id}/songs", self.get_playlist_songs)
        self.app.router.add_post("/api/playlists/{id}/songs", self.post_add_to_playlist)
        self.app.router.add_delete("/api/playlists/{id}/songs/{song_id}", self.delete_playlist_song)
        self.app.router.add_post("/api/playlists/{id}/play", self.post_play_playlist)

        # 8. Frontend Static SPA build
        dist_dir = os.path.join(os.path.dirname(__file__), "web", "dist")
        if os.path.exists(dist_dir):
            self.app.router.add_static("/assets", os.path.join(dist_dir, "assets"))
            self.app.router.add_get("/", self.serve_index)
            self.app.router.add_get("/{tail:(?!api|ws).*}", self.serve_index)

    async def serve_index(self, request):
        dist_dir = os.path.join(os.path.dirname(__file__), "web", "dist")
        index_file = os.path.join(dist_dir, "index.html")
        if os.path.exists(index_file):
            return web.FileResponse(index_file)
        return web.Response(text="Dashboard build not found.", status=404)

    async def handle_options(self, request):
        return web.Response(headers=self._cors_headers())

    async def start(self):
        self.runner = web.AppRunner(self.app)
        await self.runner.setup()
        self.site = web.TCPSite(self.runner, self.host, self.port)
        await self.site.start()
        print(f"🌐 Spotify-Style Web Dashboard aktif di http://localhost:{self.port}")

    async def stop(self):
        if self.runner:
            await self.runner.cleanup()
