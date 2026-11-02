import json
import time
from aiohttp import web, client_exceptions
from database import db
from audio_filter_utils import EQ_BAND_COUNT

class StatusHandlerMixin:
    """Modul penanganan status guild Discord, voice presence, dan WebSocket realtime."""

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

    def get_selected_guild(self, request, user=None, body_guild_id=None):
        # 1. Prioritas TERTINGGI: Server tempat user sedang aktif berada di Voice Channel saat ini!
        if user and user.get("id"):
            u_guild, u_channel = self.find_user_presence(user["id"])
            if u_channel and u_guild:
                return u_guild

        # 2. Guild spesifik yang diminta (jika user tidak sedang di voice channel)
        target_gid = body_guild_id
        if not target_gid and request:
            target_gid = request.query.get("guild_id")

        if target_gid:
            try:
                g = self.bot.get_guild(int(target_gid))
                if g:
                    return g
            except (ValueError, TypeError):
                pass

        # 3. Server tempat user terdaftar
        if user and user.get("id"):
            u_guild, _ = self.find_user_presence(user["id"])
            if u_guild:
                return u_guild

        # 4. Default fallback: guild pertama yang bot sedang ada di voice client
        for g in self.bot.guilds:
            if g.voice_client and g.voice_client.is_connected():
                return g

        return self.bot.guilds[0] if self.bot.guilds else None

    async def _build_status_data(self, guild, user=None):
        if not guild:
            return {"connected": False}

        manager = self.get_manager()
        state = manager.get_guild_state(guild.id) if manager else None
        vc = guild.voice_client

        server_timestamp = int(time.time() * 1000)
        track_position_ms = 0
        curr_song = None
        is_liked = False
        if state and state.current:
            elapsed, _ = state.current.get_progress()
            track_position_ms = int(elapsed * 1000)
            if user and user.get("id"):
                is_liked = await db.is_song_liked(user["id"], state.current.url)

            curr_song = {
                "title": state.current.title,
                "url": state.current.url,
                "duration": state.current.duration,
                "duration_str": state.current.format_duration(),
                "duration_ms": int((state.current.duration or 0) * 1000),
                "elapsed": elapsed,
                "elapsed_str": state.current.format_duration(elapsed),
                "track_position_ms": track_position_ms,
                "server_timestamp": server_timestamp,
                "thumbnail": state.current.thumbnail,
                "uploader": state.current.uploader,
                "requester": state.current.requester.display_name if hasattr(state.current.requester, "display_name") else "User",
                "is_liked": is_liked,
                "intro_offset": getattr(state.current, "intro_offset", 0.0),
                "official_duration": getattr(state.current, "official_duration", None)
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

        user_filters = None
        if user and user.get("id"):
            user_filters = await db.get_user_filters(user["id"])

        return {
            "server_timestamp": server_timestamp,
            "track_position_ms": track_position_ms,
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
            "is_playing": bool(vc and vc.is_playing() and not vc.is_paused()),
            "is_paused": bool(vc and vc.is_paused()),
            "volume": int(state.volume * 100) if state else 50,
            "loop_mode": state.loop_mode if state else "off",
            "autoplay": state.autoplay if state else True,
            "filters": {
                "bass_boost": state.bass_boost if state else "off",
                "equalizer": state.equalizer if state else "off",
                "custom_eq": getattr(state, "custom_eq", [0] * EQ_BAND_COUNT) if state else [0] * EQ_BAND_COUNT,
                "nightcore": state.nightcore if state else False,
                "vaporwave": state.vaporwave if state else False,
                "speed": state.speed if state else 1.0,
                "treble": state.treble if state else 0,
                "karaoke": state.karaoke if state else False
            },
            "user_filters": user_filters,
            "current": curr_song,
            "queue": queue_data
        }

    async def websocket_handler(self, request):
        ws = web.WebSocketResponse()
        await ws.prepare(request)
        self.ws_clients.add(ws)

        try:
            user = await self.get_current_user(request)
            ws._user = user
            ws._guild_id = request.query.get("guild_id")
            guild = self.get_selected_guild(request, user, body_guild_id=ws._guild_id)
            data = await self._build_status_data(guild, user)
            try:
                await ws.send_str(json.dumps({"type": "STATUS_UPDATE", "data": data}))
            except (ConnectionResetError, client_exceptions.ClientError, Exception):
                return ws

            async for msg in ws:
                if msg.type == web.WSMsgType.TEXT:
                    try:
                        payload = json.loads(msg.data)
                        if payload.get("action") == "PING":
                            await ws.send_str(json.dumps({"type": "PONG"}))
                        elif payload.get("action") == "SWITCH_GUILD":
                            new_gid = payload.get("guild_id")
                            if new_gid:
                                ws._guild_id = str(new_gid)
                                guild = self.get_selected_guild(None, getattr(ws, "_user", None), body_guild_id=ws._guild_id)
                                data = await self._build_status_data(guild, getattr(ws, "_user", None))
                                await ws.send_str(json.dumps({"type": "STATUS_UPDATE", "data": data}))
                    except Exception:
                        pass
                elif msg.type in (web.WSMsgType.CLOSE, web.WSMsgType.CLOSING, web.WSMsgType.CLOSED, web.WSMsgType.ERROR):
                    break
        except (ConnectionResetError, client_exceptions.ClientError, Exception):
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
                    ws_user = getattr(ws, "_user", None)
                    ws_gid = getattr(ws, "_guild_id", None)
                    guild = self.get_selected_guild(None, ws_user, body_guild_id=ws_gid)
                    data = await self._build_status_data(guild, ws_user)
                    await ws.send_str(json.dumps({"type": "STATUS_UPDATE", "data": data}))
            except Exception:
                pass

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

