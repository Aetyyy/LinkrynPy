import random
import re
import time
from database import db

class LibraryHandlerMixin:
    """Modul penanganan pencarian, rekomendasi musik, lirik sinkron, riwayat, likes, dan izin DJ."""

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

    async def get_recommendations(self, request):
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
                            try:
                                dur = int(e.get("duration") or 0)
                            except (ValueError, TypeError):
                                dur = 0
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
            try:
                dur = int(e.get("duration") or 0)
            except (ValueError, TypeError):
                dur = 0
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
        for record in records:
            if not record.get("thumbnail"):
                match = re.search(r"(?:youtu\.be/|youtube\.com/(?:watch\?v=|embed/|shorts/))([A-Za-z0-9_-]{11})", record.get("url") or "")
                if match:
                    record["thumbnail"] = f"https://i.ytimg.com/vi/{match.group(1)}/hqdefault.jpg"
        return self.json_response({"history": records})

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

    async def post_lyrics(self, request):
        user = await self.get_current_user(request)
        guild = self.get_selected_guild(request, user)
        manager = self.get_manager()
        body = await request.json() if request.can_read_body else {}
        query = body.get("query")
        state = manager.get_guild_state(guild.id) if guild else None
        curr = state.current if state and not query else None

        cache_key = f"song:{curr.url}" if curr else f"query:{(query or '').strip().casefold()}"
        cache = getattr(self, "lyrics_cache", {})
        cached = cache.get(cache_key)
        if cached and cached[0] > time.monotonic():
            data = cached[1]
        else:
            data = await manager.fetch_lyrics_data(song=curr, query=query)
            if data.get("plain_lyrics") or data.get("synced_lyrics"):
                cache[cache_key] = (time.monotonic() + 6 * 60 * 60, data)
                self.lyrics_cache = cache
        return self.json_response({
            "title": data.get("title") or (curr.title if curr else "Lirik Lagu"),
            "lyrics": data.get("plain_lyrics"),
            "synced_lyrics": data.get("synced_lyrics"),
            "is_synced": bool(data.get("is_synced")),
            "lrc_duration": data.get("lrc_duration"),
            "video_duration": curr.duration if curr else None,
            "suggested_offset": data.get("suggested_offset", 0.0),
            "intro_offset": data.get("intro_offset", data.get("suggested_offset", 0.0))
        })

    async def post_play_likes(self, request):
        user = await self.get_current_user(request)
        if not user:
            return self.json_response({"error": "Login required"}, 401)
        songs = await db.get_liked_songs(user["id"])
        songs = [song for song in songs if song.get("url")]
        if not songs:
            return self.json_response({"error": "Belum ada lagu yang disukai untuk diputar"}, 400)

        guild = None
        user_channel = None
        target_guild_id = request.query.get("guild_id")
        if target_guild_id and str(target_guild_id).isdigit():
            guild = self.bot.get_guild(int(target_guild_id))
            if guild and str(user.get("id", "")).isdigit():
                member = guild.get_member(int(user["id"]))
                if member and member.voice:
                    user_channel = member.voice.channel
            if guild and not user_channel and guild.voice_client:
                user_channel = guild.voice_client.channel
        if not guild or not user_channel:
            guild, user_channel = self.find_user_presence(user["id"])
        if not guild or not user_channel:
            return self.json_response({"error": "Masuk ke voice channel Discord sebelum memutar lagu"}, 400)

        manager = self.get_manager()
        try:
            voice_client = await manager.join_or_move(user_channel, int(user["id"]) if str(user.get("id", "")).isdigit() else None)
        except Exception as error:
            return self.json_response({"error": f"Gagal menghubungkan ke voice channel: {error}"}, 400)

        from music_queue import Song
        requester = guild.get_member(int(user["id"])) if str(user.get("id", "")).isdigit() else guild.me
        state = manager.get_guild_state(guild.id)
        for song_data in songs:
            state.add(Song(song_data, requester))
        if voice_client and not voice_client.is_playing() and not voice_client.is_paused():
            channel = manager.get_safe_text_channel(guild, preferred_channel=user_channel)
            manager.play_next(guild, channel)
        await self.broadcast_status()
        return self.json_response({"success": True, "count": len(songs)})

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

