import asyncio
import os
import json
import time
import urllib.parse
import aiohttp
from aiohttp import web
from database import db

DISCORD_CLIENT_ID = os.getenv("DISCORD_CLIENT_ID", "").strip()
DISCORD_CLIENT_SECRET = os.getenv("DISCORD_CLIENT_SECRET", "").strip()

class WebDashboard:
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

        # WebSocket for instant real-time sync
        self.app.router.add_get("/ws", self.websocket_handler)

        # Auth & User Auto-detection
        self.app.router.add_get("/api/auth/me", self.get_auth_me)
        self.app.router.add_get("/api/auth/config", self.get_auth_config)
        self.app.router.add_get("/api/auth/discord", self.discord_login_redirect)
        self.app.router.add_get("/api/auth/callback", self.discord_oauth_callback)
        self.app.router.add_post("/api/auth/token_exchange", self.post_token_exchange)

        # Discord State & Controls
        self.app.router.add_get("/api/guilds", self.get_guilds)
        self.app.router.add_get("/api/status", self.get_status)
        self.app.router.add_get("/api/search", self.get_search)
        self.app.router.add_post("/api/play", self.post_play)
        self.app.router.add_post("/api/pause", self.post_pause)
        self.app.router.add_post("/api/resume", self.post_resume)
        self.app.router.add_post("/api/skip", self.post_skip)
        self.app.router.add_post("/api/stop", self.post_stop)
        self.app.router.add_post("/api/shuffle", self.post_shuffle)
        self.app.router.add_post("/api/loop", self.post_loop)
        self.app.router.add_post("/api/volume", self.post_volume)
        self.app.router.add_post("/api/seek", self.post_seek)
        self.app.router.add_post("/api/filter", self.post_filter)
        self.app.router.add_post("/api/remove", self.post_remove)
        self.app.router.add_post("/api/lyrics", self.post_lyrics)
        self.app.router.add_post("/api/dj/grant", self.post_dj_grant)
        self.app.router.add_post("/api/dj/revoke", self.post_dj_revoke)

        # Recommendations & History
        self.app.router.add_get("/api/recommendations", self.get_recommendations)
        self.app.router.add_get("/api/history", self.get_history)

        # Likes & Custom Playlists
        self.app.router.add_get("/api/likes", self.get_likes)
        self.app.router.add_post("/api/likes", self.post_like)
        self.app.router.add_delete("/api/likes", self.delete_like)

        self.app.router.add_get("/api/playlists", self.get_playlists)
        self.app.router.add_post("/api/playlists", self.post_create_playlist)
        self.app.router.add_delete("/api/playlists/{id}", self.delete_playlist)
        self.app.router.add_get("/api/playlists/{id}/songs", self.get_playlist_songs)
        self.app.router.add_post("/api/playlists/{id}/songs", self.post_add_to_playlist)
        self.app.router.add_delete("/api/playlists/{id}/songs/{song_id}", self.delete_playlist_song)
        self.app.router.add_post("/api/playlists/{id}/play", self.post_play_playlist)

        # Static build
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

    # ==========================
    # USER & VOICE AUTO-DETECTION
    # ==========================
    async def get_current_user(self, request):
        if not request:
            return None
        auth_header = request.headers.get("Authorization", "")
        token = auth_header.replace("Bearer ", "").strip() if auth_header else request.query.get("token")
        if not token:
            return None
        if token in self.user_sessions:
            return self.user_sessions[token]

        # Pulihkan sesi dari database users jika bot sempat restart
        user = await db.get_user_by_token(token)
        if user:
            self.user_sessions[token] = user
            return user
        return None

    def find_user_presence(self, user_id: str):
        """Mencari guild dan voice channel tempat user saat ini sedang aktif di server Discord."""
        try:
            uid = int(user_id)
        except (ValueError, TypeError):
            return None, None

        # Prioritas 1: Cari user yang sedang aktif berada di dalam Voice Channel mana pun
        for guild in self.bot.guilds:
            for vc in guild.voice_channels:
                for member in vc.members:
                    if member.id == uid:
                        return guild, vc
            for sc in guild.stage_channels:
                for member in sc.members:
                    if member.id == uid:
                        return guild, sc

        # Prioritas 2: Jika tidak di voice channel, cari guild tempat user terdaftar
        for guild in self.bot.guilds:
            member = guild.get_member(uid)
            if member:
                return guild, None

        return None, None

    def get_selected_guild(self, request, user=None):
        # 1. Jika ada user login, utamakan server tempat user sedang berada di Voice Channel
        if user and user.get("id"):
            u_guild, u_channel = self.find_user_presence(user["id"])
            if u_channel and u_guild:
                return u_guild

        # 2. Cek query parameter guild_id
        if request:
            guild_id_str = request.query.get("guild_id")
            if guild_id_str:
                try:
                    g = self.bot.get_guild(int(guild_id_str))
                    if g:
                        return g
                except ValueError:
                    pass

        # 3. Jika user login, gunakan server tempat user terdaftar
        if user and user.get("id"):
            u_guild, _ = self.find_user_presence(user["id"])
            if u_guild:
                return u_guild

        # 4. Default fallback: guild pertama yang bot sedang ada di voice client
        for g in self.bot.guilds:
            if g.voice_client and g.voice_client.is_connected():
                return g

        return self.bot.guilds[0] if self.bot.guilds else None

    # ==========================
    # WEBSOCKET REALTIME
    # ==========================
    async def websocket_handler(self, request):
        ws = web.WebSocketResponse()
        await ws.prepare(request)
        self.ws_clients.add(ws)

        try:
            user = await self.get_current_user(request)
            ws.user = user
            guild = self.get_selected_guild(request, user)
            data = await self._build_status_data(guild, user)
            await ws.send_str(json.dumps({"type": "STATUS_UPDATE", "data": data}))

            async for msg in ws:
                if msg.type == web.WSMsgType.TEXT:
                    try:
                        payload = json.loads(msg.data)
                        if payload.get("action") == "PING":
                            await ws.send_str(json.dumps({"type": "PONG"}))
                    except Exception:
                        pass
        finally:
            self.ws_clients.discard(ws)

        return ws

    async def broadcast_status(self):
        if not self.ws_clients:
            return
        for ws in list(self.ws_clients):
            try:
                if not ws.closed:
                    ws_user = getattr(ws, "user", None)
                    guild = self.get_selected_guild(None, ws_user)
                    data = await self._build_status_data(guild, ws_user)
                    await ws.send_str(json.dumps({"type": "STATUS_UPDATE", "data": data}))
            except Exception:
                pass

    async def _build_status_data(self, guild, user=None):
        if not guild:
            return {"connected": False}

        manager = self.get_manager()
        state = manager.get_guild_state(guild.id) if manager else None
        vc = guild.voice_client

        curr_song = None
        is_liked = False
        if state and state.current:
            elapsed, _ = state.current.get_progress()
            if user and user.get("id"):
                is_liked = await db.is_song_liked(user["id"], state.current.url)

            curr_song = {
                "title": state.current.title,
                "url": state.current.url,
                "duration": state.current.duration,
                "duration_str": state.current.format_duration(),
                "elapsed": elapsed,
                "elapsed_str": state.current.format_duration(elapsed),
                "thumbnail": state.current.thumbnail,
                "uploader": state.current.uploader,
                "requester": state.current.requester.display_name if hasattr(state.current.requester, "display_name") else "User",
                "is_liked": is_liked
            }

        queue_data = []
        if state:
            for idx, song in enumerate(state.queue):
                queue_data.append({
                    "index": idx + 1,
                    "title": song.title,
                    "url": song.url,
                    "duration": song.duration,
                    "duration_str": song.format_duration(),
                    "thumbnail": song.thumbnail,
                    "uploader": song.uploader,
                    "requester": song.requester.display_name if hasattr(song.requester, "display_name") else "User"
                })

        # User voice info & skip permission
        user_voice = None
        can_skip = False
        member_obj = None
        if user and user.get("id"):
            u_guild, u_channel = self.find_user_presence(user["id"])
            if u_channel:
                user_voice = {
                    "guild_id": str(u_guild.id),
                    "channel_id": str(u_channel.id),
                    "channel_name": u_channel.name
                }
            if user["id"].isdigit():
                member_obj = guild.get_member(int(user["id"]))
                if member_obj and state:
                    can_skip, _ = state.has_skip_permission(member_obj, vc)

        return {
            "connected": bool(vc and vc.is_connected()),
            "voice_channel": vc.channel.name if vc and vc.channel else None,
            "user_voice": user_voice,
            "session_owner_id": str(state.session_owner_id) if state and state.session_owner_id else None,
            "is_session_owner": bool(state and state.session_owner_id and user and str(state.session_owner_id) == str(user.get("id"))),
            "can_skip": can_skip,
            "guild": {
                "id": str(guild.id),
                "name": guild.name,
                "icon": str(guild.icon.url) if guild.icon else None
            },
            "is_playing": bool(vc and vc.is_playing()),
            "is_paused": bool(vc and vc.is_paused()),
            "volume": int(state.volume * 100) if state else 50,
            "loop_mode": state.loop_mode if state else "off",
            "autoplay": state.autoplay if state else True,
            "filters": {
                "bass_boost": state.bass_boost if state else "off",
                "equalizer": state.equalizer if state else "off",
                "nightcore": state.nightcore if state else False,
                "vaporwave": state.vaporwave if state else False,
                "speed": state.speed if state else 1.0,
                "treble": state.treble if state else 0,
                "karaoke": state.karaoke if state else False
            },
            "current": curr_song,
            "queue": queue_data
        }

    # ==========================
    # AUTH HANDLERS
    # ==========================
    def extract_token(self, request):
        if not request:
            return ""
        auth_header = request.headers.get("Authorization", "")
        if auth_header and "Bearer " in auth_header:
            return auth_header.replace("Bearer ", "").strip()
        return request.query.get("token") or ""

    async def get_auth_me(self, request):
        token = self.extract_token(request)
        user = self.user_sessions.get(token) if token else None

        # Jika belum ada di memory session, pulihkan dari SQLite/Supabase database users
        if not user and token:
            user = await db.get_user_by_token(token)
            if user:
                self.user_sessions[token] = user

        if not user:
            return self.json_response({"authenticated": False})

        u_guild, u_channel = self.find_user_presence(user["id"])
        user_data = dict(user)
        user_data["current_guild_id"] = str(u_guild.id) if u_guild else None
        user_data["current_voice_channel"] = u_channel.name if u_channel else None
        return self.json_response({"authenticated": True, "user": user_data})

    async def get_auth_config(self, request):
        client_id = DISCORD_CLIENT_ID or (str(self.bot.user.id) if self.bot.user else "")
        has_secret = bool(DISCORD_CLIENT_SECRET)
        redirect_uri = f"http://{request.host}/api/auth/callback"
        return self.json_response({
            "has_discord_oauth": bool(client_id),
            "has_secret": has_secret,
            "client_id": client_id,
            "redirect_uri": redirect_uri
        })

    async def discord_login_redirect(self, request):
        client_id = DISCORD_CLIENT_ID or (str(self.bot.user.id) if self.bot.user else "")
        if not client_id:
            return web.HTTPFound("/?auth_error=no_client_id")
        
        redirect_uri = urllib.parse.quote(f"http://{request.host}/api/auth/callback")
        
        # Jika client secret ada, gunakan Authorization Code flow standar. Jika tidak, gunakan Implicit Grant
        if DISCORD_CLIENT_SECRET:
            discord_url = f"https://discord.com/api/oauth2/authorize?client_id={client_id}&redirect_uri={redirect_uri}&response_type=code&scope=identify"
        else:
            discord_url = f"https://discord.com/api/oauth2/authorize?client_id={client_id}&redirect_uri={redirect_uri}&response_type=token&scope=identify"
            
        return web.HTTPFound(discord_url)

    async def discord_oauth_callback(self, request):
        code = request.query.get("code")
        client_id = DISCORD_CLIENT_ID or (str(self.bot.user.id) if self.bot.user else "")

        # 1. Flow dengan Authorization Code (jika secret tersedia)
        if code and DISCORD_CLIENT_SECRET and client_id:
            redirect_uri = f"http://{request.host}/api/auth/callback"
            token_url = "https://discord.com/api/oauth2/token"
            data = {
                "client_id": client_id,
                "client_secret": DISCORD_CLIENT_SECRET,
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": redirect_uri
            }

            async with aiohttp.ClientSession() as session:
                async with session.post(token_url, data=data) as resp:
                    if resp.status != 200:
                        return web.HTTPFound("/?auth_error=token_failed")
                    token_data = await resp.json()
                    access_token = token_data.get("access_token")

                # Ambil data user dari Discord API
                headers = {"Authorization": f"Bearer {access_token}"}
                async with session.get("https://discord.com/api/users/@me", headers=headers) as user_resp:
                    if user_resp.status != 200:
                        return web.HTTPFound("/?auth_error=user_failed")
                    user_info = await user_resp.json()

            token = f"oauth_{user_info['id']}_{int(time.time())}"
            avatar_url = f"https://cdn.discordapp.com/avatars/{user_info['id']}/{user_info['avatar']}.png" if user_info.get("avatar") else "https://cdn.discordapp.com/embed/avatars/0.png"
            user_data = {
                "id": str(user_info["id"]),
                "username": user_info["username"],
                "display_name": user_info.get("global_name") or user_info["username"],
                "avatar": avatar_url,
                "access_token": access_token,
                "token": token
            }
            self.user_sessions[token] = user_data
            await db.save_user(user_data)
            return web.HTTPFound(f"/?token={token}")

        # 2. Flow Implicit Grant (token diteruskan di browser fragment #access_token=...)
        bridge_html = """<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Menghubungkan Linkryn...</title>
</head>
<body style="background:#0c0c0c;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
  <div style="text-align:center;">
    <p style="font-size:18px;font-weight:bold;">Menghubungkan Akun Discord Anda...</p>
    <p style="font-size:13px;color:#888;">Mohon tunggu sebentar...</p>
  </div>
  <script>
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    if (accessToken) {
      fetch('/api/auth/token_exchange', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ access_token: accessToken })
      })
      .then(res => res.json())
      .then(data => {
        if (data.token) {
          localStorage.setItem('linkryn_token', data.token);
          window.location.href = '/';
        } else {
          window.location.href = '/?auth_error=' + encodeURIComponent(data.error || 'failed');
        }
      })
      .catch(function(err) {
        window.location.href = '/?auth_error=network';
      });
    } else {
      window.location.href = '/?auth_error=no_token';
    }
  </script>
</body>
</html>"""
        return web.Response(text=bridge_html, content_type="text/html")

    async def post_token_exchange(self, request):
        """Menerima access_token dari Implicit Grant OAuth2 dan menyimpan user ke database."""
        try:
            body = await request.json()
        except Exception:
            return self.json_response({"error": "Invalid JSON"}, 400)
            
        access_token = body.get("access_token")
        if not access_token:
            return self.json_response({"error": "Missing access_token"}, 400)

        async with aiohttp.ClientSession() as session:
            headers = {"Authorization": f"Bearer {access_token}"}
            async with session.get("https://discord.com/api/users/@me", headers=headers) as user_resp:
                if user_resp.status != 200:
                    return self.json_response({"error": "Failed to fetch user from Discord"}, 400)
                user_info = await user_resp.json()

        token = f"oauth_{user_info['id']}_{int(time.time())}"
        avatar_url = f"https://cdn.discordapp.com/avatars/{user_info['id']}/{user_info['avatar']}.png" if user_info.get("avatar") else "https://cdn.discordapp.com/embed/avatars/0.png"
        user_data = {
            "id": str(user_info["id"]),
            "username": user_info["username"],
            "display_name": user_info.get("global_name") or user_info["username"],
            "avatar": avatar_url,
            "access_token": access_token,
            "token": token
        }
        self.user_sessions[token] = user_data
        await db.save_user(user_data)
        return self.json_response({"success": True, "token": token, "user": user_data})

    async def get_search(self, request):
        query = request.query.get("q", "").strip()
        limit = min(int(request.query.get("limit", 10)), 25)
        if not query:
            return self.json_response({"results": []})

        from audio_source import YTDLSource
        entries = await YTDLSource.extract_search_list(query, max_results=limit, loop=self.bot.loop)
        results = []
        for e in entries:
            dur = e.get("duration", 0)
            results.append({
                "title": e.get("title"),
                "url": e.get("webpage_url") or e.get("url"),
                "duration": dur,
                "duration_str": f"{dur // 60}:{dur % 60:02d}" if dur else "--:--",
                "uploader": e.get("uploader") or e.get("channel") or "Artis",
                "artist": e.get("uploader") or e.get("channel") or "Artis",
                "thumbnail": e.get("thumbnail") or (e.get("thumbnails", [{}])[-1].get("url") if e.get("thumbnails") else None)
            })
        return self.json_response({"results": results})

    # ==========================
    # GUILDS & STATUS API
    # ==========================
    async def get_guilds(self, request):
        user = await self.get_current_user(request)
        data = []
        for g in self.bot.guilds:
            is_user_in = False
            user_in_vc = False
            user_vc_name = None
            if user and user.get("id") and str(user["id"]).isdigit():
                uid = int(user["id"])
                # Cek langsung di voice channel agar akurat 100%
                for vc in g.voice_channels:
                    for m in vc.members:
                        if m.id == uid:
                            is_user_in = True
                            user_in_vc = True
                            user_vc_name = vc.name
                            break
                    if user_in_vc:
                        break

                if not user_in_vc:
                    for sc in g.stage_channels:
                        for m in sc.members:
                            if m.id == uid:
                                is_user_in = True
                                user_in_vc = True
                                user_vc_name = sc.name
                                break
                        if user_in_vc:
                            break

                if not is_user_in:
                    m = g.get_member(uid)
                    if m:
                        is_user_in = True

            data.append({
                "id": str(g.id),
                "name": g.name,
                "icon": str(g.icon.url) if g.icon else None,
                "has_voice": bool(g.voice_client and g.voice_client.is_connected()),
                "user_is_member": is_user_in,
                "user_in_voice": user_in_vc,
                "user_voice_name": user_vc_name
            })
        return self.json_response({"guilds": data})

    async def get_status(self, request):
        user = await self.get_current_user(request)
        guild = self.get_selected_guild(request, user)
        data = await self._build_status_data(guild, user)
        return self.json_response(data)

    # ==========================
    # PLAYBACK CONTROL API
    # ==========================
    async def post_play(self, request):
        user = await self.get_current_user(request)
        body = await request.json()
        query = body.get("query", "").strip()
        if not query:
            return self.json_response({"error": "Query cannot be empty"}, 400)

        # Cari voice channel tempat user aktif berada
        u_guild, user_channel = self.find_user_presence(user["id"]) if user else (None, None)
        if not user_channel or not u_guild:
            return self.json_response({
                "error": "Kamu belum berada di Voice Channel Discord mana pun. Bergabunglah ke Voice Channel di Discord terlebih dahulu!"
            }, 400)

        guild = u_guild
        manager = self.get_manager()
        state = manager.get_guild_state(guild.id)
        user_uid = int(user["id"]) if (user and user.get("id") and str(user["id"]).isdigit()) else None

        from music_manager import VoiceChannelProtectedError
        try:
            vc = await manager.join_or_move(user_channel, user_uid)
        except VoiceChannelProtectedError as e:
            return self.json_response({
                "error": f"Bot sedang digunakan di voice channel #{e.channel_name} bersama pendengar lain di server ini. Kamu harus bergabung ke channel tersebut!"
            }, 403)
        except Exception as e:
            return self.json_response({"error": f"Gagal menghubungkan ke Voice Channel: {str(e)}"}, 500)

        from audio_source import YTDLSource
        from music_queue import Song
        from spotify_helper import SpotifyHelper

        requester = guild.get_member(int(user["id"])) if user and user.get("id") and user["id"].isdigit() else guild.me

        if SpotifyHelper.is_spotify_url(query):
            queries = await SpotifyHelper.extract_spotify_queries(query)
            if not queries:
                return self.json_response({"error": "Gagal membaca playlist Spotify"}, 400)

            first_info = await YTDLSource.extract_info(queries[0], loop=self.bot.loop)
            if first_info:
                entry = first_info['entries'][0] if 'entries' in first_info else first_info
                song = Song(entry, requester)
                state.add(song)
                cat, kws = manager.detect_genre_keywords(song.title, song.uploader)
                state.preferred_genre_category = cat
                state.preferred_genre_keywords = kws

            async def load_rest():
                for q in queries[1:]:
                    try:
                        inf = await YTDLSource.extract_info(q, loop=self.bot.loop)
                        if inf:
                            e = inf['entries'][0] if 'entries' in inf else inf
                            state.add(Song(e, requester))
                    except Exception:
                        pass
            self.bot.loop.create_task(load_rest())
        else:
            info = await YTDLSource.extract_info(query, loop=self.bot.loop)
            if not info:
                return self.json_response({"error": "Lagu tidak ditemukan"}, 404)

            is_playlist = 'entries' in info and (info.get('_type') == 'playlist' or isinstance(info.get('entries'), (list, tuple)))
            if is_playlist:
                raw_entries = info.get('entries', [])
                entries = [e for e in raw_entries if e and not e.get('is_unavailable')]
                for i, entry in enumerate(entries):
                    song = Song(entry, requester)
                    state.add(song)
                    if i == 0:
                        cat, kws = manager.detect_genre_keywords(song.title, song.uploader)
                        state.preferred_genre_category = cat
                        state.preferred_genre_keywords = kws
            else:
                entry = info['entries'][0] if 'entries' in info else info
                song = Song(entry, requester)
                state.add(song)
                cat, kws = manager.detect_genre_keywords(song.title, song.uploader)
                state.preferred_genre_category = cat
                state.preferred_genre_keywords = kws

        safe_text_channel = manager.get_safe_text_channel(guild, preferred_channel=user_channel)
        if not vc.is_playing() and not vc.is_paused():
            manager.play_next(guild, safe_text_channel)

        return self.json_response({"success": True})

    async def post_pause(self, request):
        user = await self.get_current_user(request)
        guild = self.get_selected_guild(request, user)
        if guild and guild.voice_client and guild.voice_client.is_playing():
            guild.voice_client.pause()
            manager = self.get_manager()
            state = manager.get_guild_state(guild.id)
            if state and state.current:
                state.current.pause()
            await manager.update_nowplaying_card(guild)
            return self.json_response({"success": True})
        return self.json_response({"error": "Cannot pause"}, 400)

    async def post_resume(self, request):
        user = await self.get_current_user(request)
        guild = self.get_selected_guild(request, user)
        if guild and guild.voice_client and guild.voice_client.is_paused():
            guild.voice_client.resume()
            manager = self.get_manager()
            state = manager.get_guild_state(guild.id)
            if state and state.current:
                state.current.resume()
            await manager.update_nowplaying_card(guild)
            return self.json_response({"success": True})
        return self.json_response({"error": "Cannot resume"}, 400)

    async def post_skip(self, request):
        user = await self.get_current_user(request)
        guild = self.get_selected_guild(request, user)
        if not guild or not guild.voice_client:
            return self.json_response({"error": "Bot tidak terhubung ke voice channel."}, 400)

        vc = guild.voice_client
        if not (vc.is_playing() or vc.is_paused()):
            return self.json_response({"error": "Tidak ada lagu yang sedang aktif diputar."}, 400)

        manager = self.get_manager()
        state = manager.get_guild_state(guild.id)

        # Cek apakah user berada di voice channel yang sama
        user_channel = None
        member = None
        if user and user.get("id"):
            _, user_channel = self.find_user_presence(user["id"])
            if user["id"].isdigit():
                member = guild.get_member(int(user["id"]))

        if not user_channel or user_channel != vc.channel:
            return self.json_response({
                "error": f"Kamu harus berada di voice channel #{vc.channel.name} bersama bot untuk melewati lagu!"
            }, 403)

        can_skip, reason = state.has_skip_permission(member, vc)
        if not can_skip:
            owner_name = "Pengguna Utama"
            if state.session_owner_id:
                m = guild.get_member(state.session_owner_id)
                if m:
                    owner_name = m.display_name
            elif state.current and state.current.requester:
                owner_name = getattr(state.current.requester, "display_name", "Pemutar Lagu")
            return self.json_response({
                "error": f"Dibutuhkan persetujuan dari pemutar lagu utama ({owner_name}) atau role DJ untuk melewati lagu ini.",
                "requires_permission": True
            }, 403)

        vc.stop()
        return self.json_response({"success": True, "reason": reason})

    async def post_stop(self, request):
        user = await self.get_current_user(request)
        guild = self.get_selected_guild(request, user)
        if guild and guild.voice_client:
            manager = self.get_manager()
            state = manager.get_guild_state(guild.id)
            state.clear()
            state.current = None
            guild.voice_client.stop()
            await guild.voice_client.disconnect()
            return self.json_response({"success": True})
        return self.json_response({"error": "Cannot stop"}, 400)

    async def post_shuffle(self, request):
        user = await self.get_current_user(request)
        guild = self.get_selected_guild(request, user)
        if guild:
            manager = self.get_manager()
            state = manager.get_guild_state(guild.id)
            state.shuffle()
            return self.json_response({"success": True})
        return self.json_response({"error": "Guild not found"}, 404)

    async def post_loop(self, request):
        body = await request.json()
        mode = body.get("mode", "off")
        user = await self.get_current_user(request)
        guild = self.get_selected_guild(request, user)
        if guild:
            manager = self.get_manager()
            state = manager.get_guild_state(guild.id)
            state.loop_mode = mode
            await manager.update_nowplaying_card(guild)
            return self.json_response({"success": True, "mode": mode})
        return self.json_response({"error": "Guild not found"}, 404)

    async def post_volume(self, request):
        body = await request.json()
        level = int(body.get("level", 50))
        user = await self.get_current_user(request)
        guild = self.get_selected_guild(request, user)
        if guild:
            manager = self.get_manager()
            state = manager.get_guild_state(guild.id)
            state.volume = max(0.01, min(level / 100.0, 2.0))
            vc = guild.voice_client
            if vc and vc.source:
                if hasattr(vc.source, "volume"):
                    vc.source.volume = state.volume
                elif hasattr(vc.source, "original") and hasattr(vc.source.original, "volume"):
                    vc.source.original.volume = state.volume
            await manager.update_nowplaying_card(guild)
            return self.json_response({"success": True, "volume": int(state.volume * 100)})
        return self.json_response({"error": "Guild not found"}, 404)

    async def post_seek(self, request):
        body = await request.json()
        target_seconds = int(body.get("seconds", 0))
        user = await self.get_current_user(request)
        guild = self.get_selected_guild(request, user)
        if guild and guild.voice_client:
            manager = self.get_manager()
            safe_text_channel = manager.get_safe_text_channel(guild)
            await manager.apply_filter_realtime(guild, safe_text_channel, seek_to=target_seconds)
            return self.json_response({"success": True, "seconds": target_seconds})
        return self.json_response({"error": "Cannot seek"}, 400)

    async def post_filter(self, request):
        body = await request.json()
        filter_name = body.get("filter")
        value = body.get("value")
        user = await self.get_current_user(request)
        guild = self.get_selected_guild(request, user)
        if guild:
            manager = self.get_manager()
            state = manager.get_guild_state(guild.id)
            if filter_name == "bass_boost":
                state.bass_boost = value
            elif filter_name == "equalizer":
                state.equalizer = value
            elif filter_name == "nightcore":
                state.nightcore = not state.nightcore
                if state.nightcore:
                    state.vaporwave = False
            elif filter_name == "vaporwave":
                state.vaporwave = not state.vaporwave
                if state.vaporwave:
                    state.nightcore = False
            elif filter_name == "speed":
                state.speed = float(value)
            elif filter_name == "treble":
                state.treble = int(value)
            elif filter_name == "karaoke":
                state.karaoke = not state.karaoke
            elif filter_name == "autoplay":
                state.autoplay = not state.autoplay
            elif filter_name == "reset":
                state.bass_boost = "off"
                state.nightcore = False
                state.vaporwave = False
                state.speed = 1.0
                state.equalizer = "off"
                state.treble = 0
                state.karaoke = False

            if filter_name != "autoplay":
                safe_text_channel = manager.get_safe_text_channel(guild)
                await manager.apply_filter_realtime(guild, safe_text_channel)
            else:
                await manager.update_nowplaying_card(guild)
            return self.json_response({"success": True})
        return self.json_response({"error": "Guild not found"}, 404)

    async def post_remove(self, request):
        body = await request.json()
        index = int(body.get("index", 1)) - 1
        user = await self.get_current_user(request)
        guild = self.get_selected_guild(request, user)
        if guild:
            manager = self.get_manager()
            state = manager.get_guild_state(guild.id)
            removed = state.remove(index)
            if removed:
                return self.json_response({"success": True, "removed": removed.title})
        return self.json_response({"error": "Cannot remove"}, 400)

    async def post_lyrics(self, request):
        user = await self.get_current_user(request)
        guild = self.get_selected_guild(request, user)
        manager = self.get_manager()
        body = await request.json() if request.can_read_body else {}
        query = body.get("query")
        state = manager.get_guild_state(guild.id) if guild else None
        curr = state.current if state and not query else None

        data = await manager.fetch_lyrics_data(song=curr, query=query)
        return self.json_response({
            "title": data.get("title") or (curr.title if curr else "Lirik Lagu"),
            "lyrics": data.get("plain_lyrics"),
            "synced_lyrics": data.get("synced_lyrics"),
            "is_synced": bool(data.get("is_synced"))
        })

    async def post_dj_grant(self, request):
        user = await self.get_current_user(request)
        guild = self.get_selected_guild(request, user)
        if not user or not guild:
            return self.json_response({"error": "Unauthorized"}, 401)
        body = await request.json()
        target_id = body.get("user_id")
        if not target_id:
            return self.json_response({"error": "User ID required"}, 400)
        manager = self.get_manager()
        state = manager.get_guild_state(guild.id)
        caller_member = guild.get_member(int(user["id"])) if user["id"].isdigit() else None
        is_admin = caller_member and (caller_member.guild_permissions.administrator or caller_member.guild_permissions.manage_guild)
        is_owner = state.session_owner_id and str(state.session_owner_id) == str(user["id"])
        if not is_admin and not is_owner:
            return self.json_response({"error": "Hanya pemilik sesi atau admin yang dapat memberikan izin khusus skip"}, 403)
        state.trusted_skip_users.add(int(target_id))
        return self.json_response({"success": True})

    async def post_dj_revoke(self, request):
        user = await self.get_current_user(request)
        guild = self.get_selected_guild(request, user)
        if not user or not guild:
            return self.json_response({"error": "Unauthorized"}, 401)
        body = await request.json()
        target_id = body.get("user_id")
        if not target_id:
            return self.json_response({"error": "User ID required"}, 400)
        manager = self.get_manager()
        state = manager.get_guild_state(guild.id)
        caller_member = guild.get_member(int(user["id"])) if user["id"].isdigit() else None
        is_admin = caller_member and (caller_member.guild_permissions.administrator or caller_member.guild_permissions.manage_guild)
        is_owner = state.session_owner_id and str(state.session_owner_id) == str(user["id"])
        if not is_admin and not is_owner:
            return self.json_response({"error": "Hanya pemilik sesi atau admin yang dapat mencabut izin khusus skip"}, 403)
        if int(target_id) in state.trusted_skip_users:
            state.trusted_skip_users.remove(int(target_id))
        return self.json_response({"success": True})

    # ==========================
    # RECOMMENDATIONS & HISTORY
    # ==========================
    async def get_recommendations(self, request):
        import random
        user = await self.get_current_user(request)
        guild = self.get_selected_guild(request, user)
        manager = self.get_manager()
        state = manager.get_guild_state(guild.id) if guild else None

        from audio_source import YTDLSource
        genre_param = request.query.get("genre", "").lower().strip()
        cat = state.preferred_genre_category if state and state.preferred_genre_category != "general" else "pop_indo"
        if genre_param and genre_param not in ["semua", "all"]:
            if "jawa" in genre_param or "koplo" in genre_param:
                cat = "jawa_koplo"
            elif "akustik" in genre_param:
                cat = "akustik_indo"
            elif "jpop" in genre_param or "anime" in genre_param:
                cat = "jpop_anime"
            elif "kpop" in genre_param:
                cat = "kpop"
            elif "rock" in genre_param:
                cat = "rock"
            elif "indo" in genre_param or "pop" in genre_param:
                cat = "pop_indo"

        query_pools = {
            "pop_indo": [
                "lagu pop indonesia terpopuler viral official",
                "top hits indonesia 2026 official music video",
                "lagu galau indonesia terbaru official video",
                "lagu indonesia trending official audio",
                "Mahalini Tiara Andini Bernadya hits single",
                "Tulus Nadin Amizah Juicy Luicy hits",
                "lagu pop indonesia santai enak didengar",
                "lagu hits viral tiktok indonesia official audio",
                "Yura Yunita Raisa Afgan hits official audio",
                "lagu pop indonesia terbaik sepanjang masa"
            ],
            "jawa_koplo": [
                "lagu dangdut koplo jawa hits official music video",
                "Denny Caknan official music video",
                "Guyon Waton hits single official audio",
                "Niken Salindry Difarina Indra dangdut",
                "Gilga Sahid Happy Asmara hits",
                "dangdut koplo viral terbaru official",
                "lagu pop jawa akustik santai hits",
                "campursari koplo terpopuler official",
                "NDX AKA official music audio hits",
                "Lavora Damara De lagu jawa official"
            ],
            "akustik_indo": [
                "lagu akustik indonesia santai cafe hits",
                "Feby Putri Fiersa Besari Sal Priadi hits",
                "Nadhif Basalamah Bernadya akustik",
                "akustik cafe senja indonesia official audio",
                "Fourtwnty Payung Teduh Daun Jatuh hits",
                "lagu indie akustik indonesia terbaru",
                "petikan gitar akustik indonesia santai",
                "Batas Senja Idgitaf akustik cafe hits",
                "Ardhito Pramono Danilla akustik santai"
            ],
            "jpop_anime": [
                "jpop popular anime hits songs official",
                "Yoasobi Ado Eve Aimer official music video",
                "Kenshi Yonezu Vaundy King Gnu official",
                "popular anime ost hits official audio",
                "japan top hits j-pop songs official",
                "Radwimps Official Hige Dandism hits",
                "milet Yuuri J-pop hits official"
            ],
            "kpop": [
                "kpop top hits official music video",
                "NewJeans IVE aespa LE SSERAFIM official",
                "BTS BLACKPINK popular hits official audio",
                "k-pop trending music video choreography",
                "TWICE Stray Kids popular kpop hits",
                "SEVENTEEN ENHYPEN k-pop hits video"
            ],
            "rock": [
                "rock hits popular official music video",
                "Linkin Park Avenged Sevenfold Muse rock",
                "modern rock alternative hits official audio",
                "classic rock greatest hits official video",
                "Bring Me The Horizon Paramore rock hits",
                "Green Day Foo Fighters rock official"
            ]
        }

        # Jika genre tidak dispesifikasikan khusus, pilih acak antara pop, koplo, akustik
        if not genre_param or genre_param in ["semua", "all"]:
            active_cat = random.choice(["pop_indo", "jawa_koplo", "akustik_indo"])
        else:
            active_cat = cat if cat in query_pools else "pop_indo"

        pool = query_pools.get(active_cat, query_pools["pop_indo"])
        chosen_query = random.choice(pool)

        # High-speed cached pool for instant, consistent, and varied recommendations
        cached = self.recs_cache.get(active_cat, [])
        if len(cached) >= 16:
            sample_size = min(len(cached), 24)
            selected = random.sample(cached, sample_size)
            if len(cached) < 45:
                async def replenish():
                    try:
                        q = random.choice(pool)
                        new_entries = await YTDLSource.extract_search_list(q, max_results=20, loop=self.bot.loop)
                        existing_urls = {s["url"] for s in self.recs_cache.get(active_cat, [])}
                        for e in new_entries:
                            u = e.get("webpage_url") or e.get("url")
                            dur = e.get("duration", 0)
                            if u and u not in existing_urls and dur <= 720:
                                self.recs_cache[active_cat].append({
                                    "title": e.get("title"),
                                    "url": u,
                                    "duration": dur,
                                    "uploader": e.get("uploader") or e.get("channel") or "Artis",
                                    "artist": e.get("uploader") or e.get("channel") or "Artis",
                                    "thumbnail": e.get("thumbnail") or (e.get("thumbnails", [{}])[-1].get("url") if e.get("thumbnails") else None)
                                })
                    except Exception:
                        pass
                self.bot.loop.create_task(replenish())
            return self.json_response({"recommendations": selected})

        # Fetch up to 30 results on first run
        entries = await YTDLSource.extract_search_list(chosen_query, max_results=30, loop=self.bot.loop)
        if not entries:
            fallback_q = random.choice(pool)
            entries = await YTDLSource.extract_search_list(fallback_q, max_results=30, loop=self.bot.loop)

        results = []
        for e in entries:
            dur = e.get("duration", 0)
            if dur > 720:  # Skip kompilasi lebih dari 12 menit
                continue
            u = e.get("webpage_url") or e.get("url")
            if not u:
                continue
            results.append({
                "title": e.get("title"),
                "url": u,
                "duration": dur,
                "uploader": e.get("uploader") or e.get("channel") or "Artis",
                "artist": e.get("uploader") or e.get("channel") or "Artis",
                "thumbnail": e.get("thumbnail") or (e.get("thumbnails", [{}])[-1].get("url") if e.get("thumbnails") else None)
            })

        self.recs_cache[active_cat] = list(results)
        random.shuffle(results)
        return self.json_response({"recommendations": results[:24]})

    async def get_history(self, request):
        user = await self.get_current_user(request)
        guild = self.get_selected_guild(request, user)
        if not guild:
            return self.json_response({"history": []})
        records = await db.get_history(str(guild.id), limit=20)
        return self.json_response({"history": records})

    # ==========================
    # LIKED SONGS API
    # ==========================
    async def get_likes(self, request):
        user = await self.get_current_user(request)
        if not user:
            return self.json_response({"liked_songs": []})
        likes = await db.get_liked_songs(user["id"])
        return self.json_response({"liked_songs": likes})

    async def post_like(self, request):
        user = await self.get_current_user(request)
        if not user:
            return self.json_response({"error": "Login required"}, 401)
        body = await request.json()
        song = body.get("song")
        if not song or not song.get("url"):
            return self.json_response({"error": "Invalid song"}, 400)
        await db.add_liked_song(user["id"], song)
        return self.json_response({"success": True})

    async def delete_like(self, request):
        user = await self.get_current_user(request)
        if not user:
            return self.json_response({"error": "Login required"}, 401)
        url = request.query.get("url")
        if not url:
            return self.json_response({"error": "Missing url"}, 400)
        await db.remove_liked_song(user["id"], url)
        return self.json_response({"success": True})

    # ==========================
    # CUSTOM PLAYLISTS API
    # ==========================
    async def get_playlists(self, request):
        user = await self.get_current_user(request)
        if not user:
            return self.json_response({"playlists": []})
        playlists = await db.get_user_playlists(user["id"])
        return self.json_response({"playlists": playlists})

    async def post_create_playlist(self, request):
        user = await self.get_current_user(request)
        if not user:
            return self.json_response({"error": "Login required"}, 401)
        body = await request.json()
        name = body.get("name")
        if not name:
            return self.json_response({"error": "Name required"}, 400)
        res = await db.create_playlist(user["id"], name)
        return self.json_response({"success": True, "playlist": res})

    async def delete_playlist(self, request):
        user = await self.get_current_user(request)
        if not user:
            return self.json_response({"error": "Login required"}, 401)
        playlist_id = int(request.match_info["id"])
        await db.delete_playlist(user["id"], playlist_id)
        return self.json_response({"success": True})

    async def get_playlist_songs(self, request):
        user = await self.get_current_user(request)
        if not user:
            return self.json_response({"error": "Login required"}, 401)
        playlist_id = int(request.match_info["id"])
        songs = await db.get_playlist_songs(playlist_id, user_id=user["id"])
        return self.json_response({"songs": songs})

    async def post_add_to_playlist(self, request):
        user = await self.get_current_user(request)
        if not user:
            return self.json_response({"error": "Login required"}, 401)
        playlist_id = int(request.match_info["id"])
        body = await request.json()
        song = body.get("song")
        if not song or not song.get("url"):
            return self.json_response({"error": "Invalid song"}, 400)
        success = await db.add_to_playlist(playlist_id, song, user_id=user["id"])
        if not success:
            return self.json_response({"error": "Gagal menambahkan atau playlist bukan milik Anda"}, 403)
        return self.json_response({"success": True})

    async def delete_playlist_song(self, request):
        user = await self.get_current_user(request)
        if not user:
            return self.json_response({"error": "Login required"}, 401)
        playlist_id = int(request.match_info["id"])
        song_id = int(request.match_info["song_id"])
        success = await db.remove_from_playlist(playlist_id, song_id, user_id=user["id"])
        if not success:
            return self.json_response({"error": "Gagal menghapus lagu dari playlist"}, 400)
        return self.json_response({"success": True})

    async def post_play_playlist(self, request):
        user = await self.get_current_user(request)
        if not user:
            return self.json_response({"error": "Login required"}, 401)

        u_guild, user_channel = self.find_user_presence(user["id"])
        if not user_channel or not u_guild:
            return self.json_response({
                "error": "Kamu belum berada di Voice Channel Discord mana pun. Masuklah ke Voice Channel di server tujuan terlebih dahulu!"
            }, 400)

        guild = u_guild
        playlist_id = int(request.match_info["id"])
        songs = await db.get_playlist_songs(playlist_id, user_id=user["id"])
        if not songs:
            return self.json_response({"error": "Playlist kosong atau bukan milik Anda"}, 400)

        manager = self.get_manager()
        state = manager.get_guild_state(guild.id)
        user_uid = int(user["id"]) if (user and user.get("id") and str(user["id"]).isdigit()) else None

        from music_manager import VoiceChannelProtectedError
        try:
            vc = await manager.join_or_move(user_channel, user_uid)
        except VoiceChannelProtectedError as e:
            return self.json_response({
                "error": f"Bot sedang digunakan di voice channel #{e.channel_name} bersama pendengar lain di server ini. Kamu harus bergabung ke channel tersebut!"
            }, 403)
        except Exception as e:
            return self.json_response({"error": f"Gagal menghubungkan ke Voice Channel: {str(e)}"}, 500)

        from music_queue import Song
        requester = guild.get_member(int(user["id"])) if user and user.get("id") and str(user["id"]).isdigit() else guild.me

        for s in songs:
            state.add(Song(s, requester))

        if vc and not vc.is_playing() and not vc.is_paused():
            safe_channel = manager.get_safe_text_channel(guild, preferred_channel=user_channel)
            manager.play_next(guild, safe_channel)

        return self.json_response({"success": True, "count": len(songs)})

    # ==========================
    # LIFECYCLE
    # ==========================
    async def start(self):
        self.runner = web.AppRunner(self.app)
        await self.runner.setup()
        self.site = web.TCPSite(self.runner, self.host, self.port)
        await self.site.start()
        print(f"🌐 Spotify-Style Web Dashboard aktif di http://localhost:{self.port}")

    async def stop(self):
        if self.runner:
            await self.runner.cleanup()
