from database import db
from audio_filter_utils import EQ_BAND_COUNT, normalize_custom_eq

class PlaybackHandlerMixin:
    """Modul penanganan pemutaran lagu, antrean (queue), volume, dan kontrol playback."""

    async def post_play(self, request):
        user = await self.get_current_user(request)
        body = await request.json()
        query = body.get("query", "").strip()
        if not query:
            return self.json_response({"error": "Query cannot be empty"}, 400)

        if not user:
            return self.json_response({
                "error": "Kamu belum login dengan akun Discord di website. Silakan masuk terlebih dahulu dengan klik tombol 'Masuk Akun Discord' di pojok kiri bawah agar bot dapat mengenali kamu!"
            }, 401)

        # Cari voice channel: periksa guild yang diminta atau kehadiran aktif user
        target_guild_id = body.get("guild_id") or request.query.get("guild_id")
        guild = None
        user_channel = None

        if target_guild_id and str(target_guild_id).isdigit():
            g = self.bot.get_guild(int(target_guild_id))
            if g:
                guild = g
                if user.get("id") and str(user["id"]).isdigit():
                    uid = int(user["id"])
                    # Cari langsung di seluruh voice channel guild yang ditargetkan
                    for vc in g.voice_channels:
                        if any(m.id == uid for m in vc.members):
                            user_channel = vc
                            break
                    if not user_channel:
                        for sc in g.stage_channels:
                            if any(m.id == uid for m in sc.members):
                                user_channel = sc
                                break

                # Fallback: jika bot sudah berada di voice client channel
                if not user_channel and g.voice_client and g.voice_client.channel:
                    user_channel = g.voice_client.channel

        if not user_channel:
            u_guild, u_channel = self.find_user_presence(user["id"])
            if u_guild and u_channel:
                guild = u_guild
                user_channel = u_channel

        if not user_channel or not guild:
            return self.json_response({
                "error": "Kamu belum berada di Voice Channel Discord mana pun. Masuklah ke Voice Channel di server Discord terlebih dahulu!"
            }, 400)

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
        if not vc.is_playing() and not vc.is_paused() and not getattr(state, "is_loading", False):
            manager.play_next(guild, safe_text_channel)

        await self.broadcast_status()
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
            await self.broadcast_status()
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
            await self.broadcast_status()
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

        if getattr(state, "is_loading", False):
            return self.json_response({"error": "Lagu berikutnya sedang dimuat, mohon tunggu sebentar..."}, 400)

        import time
        now = time.time()
        if hasattr(state, "last_skip_time") and now - state.last_skip_time < 0.6:
            return self.json_response({"error": "Permintaan skip sedang diproses..."}, 400)
        state.last_skip_time = now

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
        await self.broadcast_status()
        return self.json_response({"success": True, "reason": reason})

    async def post_stop(self, request):
        user = await self.get_current_user(request)
        guild = self.get_selected_guild(request, user)
        if guild and guild.voice_client:
            manager = self.get_manager()
            state = manager.get_guild_state(guild.id)
            state.clear()
            state.current = None
            if hasattr(manager, "set_voice_channel_status") and guild.voice_client.channel:
                await manager.set_voice_channel_status(guild.voice_client.channel, "")
            guild.voice_client.stop()
            await guild.voice_client.disconnect()
            await self.broadcast_status()
            return self.json_response({"success": True})
        return self.json_response({"error": "Cannot stop"}, 400)

    async def post_shuffle(self, request):
        user = await self.get_current_user(request)
        guild = self.get_selected_guild(request, user)
        if guild:
            manager = self.get_manager()
            state = manager.get_guild_state(guild.id)
            state.shuffle()
            await self.broadcast_status()
            return self.json_response({"success": True})
        return self.json_response({"error": "Guild not found"}, 404)

    async def post_loop(self, request):
        try:
            body = await request.json()
        except Exception:
            body = {}
        user = await self.get_current_user(request)
        guild = self.get_selected_guild(request, user)
        if guild:
            manager = self.get_manager()
            state = manager.get_guild_state(guild.id)
            mode = body.get("mode") if isinstance(body, dict) else None
            # Jika mode tidak dikirim atau tidak valid, lakukan auto-toggle berurutan: off -> track -> queue -> off
            if not mode or mode not in ("off", "track", "queue"):
                cycle = {"off": "track", "track": "queue", "queue": "off"}
                mode = cycle.get(state.loop_mode, "track")
            state.loop_mode = mode
            await manager.update_nowplaying_card(guild)
            await self.broadcast_status()
            return self.json_response({"success": True, "mode": mode})
        return self.json_response({"error": "Guild not found"}, 404)

    async def post_volume(self, request):
        body = await request.json()
        raw = body.get("level") if body.get("level") is not None else body.get("volume", 100)
        try:
            level = int(raw)
        except (ValueError, TypeError):
            level = 100
        level = max(1, min(level, 200))
        user = await self.get_current_user(request)
        guild = self.get_selected_guild(request, user)
        if guild:
            manager = self.get_manager()
            state = manager.get_guild_state(guild.id)
            state.volume = level / 100.0
            vc = guild.voice_client
            if vc and vc.source:
                if hasattr(vc.source, "volume"):
                    vc.source.volume = state.volume
                elif hasattr(vc.source, "original") and hasattr(vc.source.original, "volume"):
                    vc.source.original.volume = state.volume
            await manager.update_nowplaying_card(guild)
            await self.broadcast_status()
            return self.json_response({"success": True, "volume": level})
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
            await self.broadcast_status()
            return self.json_response({"success": True, "seconds": target_seconds})
        return self.json_response({"error": "Cannot seek"}, 400)

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
                await self.broadcast_status()
                return self.json_response({"success": True, "removed": removed.title})
        return self.json_response({"error": "Cannot remove"}, 400)

