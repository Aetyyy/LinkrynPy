from database import db
from audio_filter_utils import EQ_BAND_COUNT, normalize_custom_eq

class FilterHandlerMixin:
    """Modul penanganan filter audio, equalizer presets, custom EQ, dan persistensi per-user."""

    async def post_filter(self, request):
        body = await request.json()
        filter_name = body.get("filter")
        value = body.get("value")
        user = await self.get_current_user(request)
        guild = self.get_selected_guild(request, user)

        # 1. Simpan selalu per-user ke database
        user_filters = None
        if user and user.get("id") and filter_name != "autoplay":
            user_filters = await db.update_user_filter(user["id"], filter_name, value)

        if guild:
            manager = self.get_manager()
            state = manager.get_guild_state(guild.id)
            if filter_name == "bass_boost":
                state.bass_boost = value
            elif filter_name == "equalizer":
                state.equalizer = value
            elif filter_name == "custom_eq":
                if isinstance(value, list) and len(value) in (5, EQ_BAND_COUNT):
                    state.custom_eq = normalize_custom_eq(value)
                    state.equalizer = "custom"
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
                state.custom_eq = [0] * EQ_BAND_COUNT
                state.treble = 0
                state.karaoke = False

            if filter_name != "autoplay":
                safe_text_channel = manager.get_safe_text_channel(guild)
                self.bot.loop.create_task(manager.apply_filter_realtime(guild, safe_text_channel))
            else:
                await manager.update_nowplaying_card(guild)
            await self.broadcast_status()
            return self.json_response({"success": True, "user_filters": user_filters})

        if user_filters:
            return self.json_response({"success": True, "user_filters": user_filters})

        return self.json_response({"error": "Guild not found"}, 404)

    async def get_user_filters(self, request):
        user = await self.get_current_user(request)
        if not user or not user.get("id"):
            return self.json_response({"filters": db.get_default_filters()})
        filters = await db.get_user_filters(user["id"])
        return self.json_response({"filters": filters})

    async def post_user_filters(self, request):
        user = await self.get_current_user(request)
        if not user or not user.get("id"):
            return self.json_response({"error": "Login required"}, 401)
        body = await request.json()
        if "filters" in body and isinstance(body["filters"], dict):
            await db.save_user_filters(user["id"], body["filters"])
            filters = await db.get_user_filters(user["id"])
        elif "filter" in body:
            filters = await db.update_user_filter(user["id"], body.get("filter"), body.get("value"))
        else:
            filters = await db.get_user_filters(user["id"])
        return self.json_response({"success": True, "filters": filters})

