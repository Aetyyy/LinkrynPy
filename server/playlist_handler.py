from database import db
from audio_filter_utils import normalize_custom_eq

class PlaylistHandlerMixin:
    """Modul penanganan manajemen playlist kustom dan pemutaran playlist antrean."""

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

        target_guild_id = request.query.get("guild_id")
        guild = None
        user_channel = None

        if target_guild_id and str(target_guild_id).isdigit():
            g = self.bot.get_guild(int(target_guild_id))
            if g:
                if user and user.get("id") and str(user["id"]).isdigit():
                    m = g.get_member(int(user["id"]))
                    if m and m.voice and m.voice.channel:
                        guild = g
                        user_channel = m.voice.channel
                if not user_channel and g.voice_client and g.voice_client.channel:
                    guild = g
                    user_channel = g.voice_client.channel

        if not guild or not user_channel:
            u_guild, u_channel = self.find_user_presence(user["id"])
            if u_guild and u_channel:
                guild = u_guild
                user_channel = u_channel

        if not user_channel or not guild:
            return self.json_response({
                "error": "Kamu belum berada di Voice Channel Discord mana pun. Masuklah ke Voice Channel di server tujuan terlebih dahulu!"
            }, 400)

        playlist_id = int(request.match_info["id"])
        songs = await db.get_playlist_songs(playlist_id, user_id=user["id"])
        if not songs:
            return self.json_response({"error": "Playlist kosong atau bukan milik Anda"}, 400)

        manager = self.get_manager()
        state = manager.get_guild_state(guild.id)
        user_uid = int(user["id"]) if (user and user.get("id") and str(user["id"]).isdigit()) else None

        # Sinkronkan filter preferensi user jika bot di guild masih dalam mode default
        if user and user.get("id"):
            u_filters = await db.get_user_filters(user["id"])
            if u_filters and state.bass_boost == "off" and state.equalizer == "off" and not state.nightcore and not state.vaporwave:
                state.bass_boost = u_filters.get("bass_boost", "off")
                state.equalizer = u_filters.get("equalizer", "off")
                state.custom_eq = normalize_custom_eq(u_filters.get("custom_eq"))
                state.speed = u_filters.get("speed", 1.0)
                state.treble = u_filters.get("treble", 0)
                state.nightcore = u_filters.get("nightcore", False)
                state.vaporwave = u_filters.get("vaporwave", False)
                state.karaoke = u_filters.get("karaoke", False)

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

