import discord
from discord import app_commands
from discord.ext import commands

from audio_source import YTDLSource
from music_queue import Song
from spotify_helper import SpotifyHelper

class PlayCommand(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    def get_manager(self):
        return self.bot.get_cog("MusicManager")

    @app_commands.command(name="play", description="Putar musik dari YouTube, SoundCloud, atau Link Spotify (Track, Playlist, Album)")
    @app_commands.describe(query="Judul lagu, link YouTube, atau link Spotify")
    async def play(self, interaction: discord.Interaction, query: str):
        manager = self.get_manager()
        voice_client = await manager.ensure_voice(interaction)
        if not voice_client:
            return await interaction.response.send_message("❌ Kamu harus berada di voice channel terlebih dahulu!", ephemeral=True)

        await interaction.response.defer()
        state = manager.get_guild_state(interaction.guild_id)

        # 1. DUKUNGAN LINK SPOTIFY
        if SpotifyHelper.is_spotify_url(query):
            queries = await SpotifyHelper.extract_spotify_queries(query)
            if not queries:
                return await interaction.followup.send("❌ Gagal membaca link Spotify. Pastikan link Spotify publik dan valid.")

            if len(queries) == 1:
                query = queries[0]
            else:
                first_song_query = queries[0]
                first_info = await YTDLSource.extract_info(first_song_query, loop=self.bot.loop)
                if first_info:
                    f_entry = first_info['entries'][0] if 'entries' in first_info else first_info
                    song = Song(f_entry, interaction.user)
                    state.add(song)
                    cat, kws = manager.detect_genre_keywords(song.title, song.uploader)
                    state.preferred_genre_category = cat
                    state.preferred_genre_keywords = kws
                    state.prefetched_autoplay_song = None

                await interaction.followup.send(f"🟢 **Spotify**: Memuat **{len(queries)}** lagu ke antrean...")

                async def load_remaining_spotify():
                    for q in queries[1:]:
                        try:
                            inf = await YTDLSource.extract_info(q, loop=self.bot.loop)
                            if inf:
                                ent = inf['entries'][0] if 'entries' in inf else inf
                                state.add(Song(ent, interaction.user))
                        except Exception:
                            continue

                self.bot.loop.create_task(load_remaining_spotify())

                if not voice_client.is_playing() and not voice_client.is_paused():
                    manager.play_next(interaction.guild, interaction.channel)
                return

        # 2. QUERY STANDARD (YOUTUBE / SOUNDCLOUD)
        try:
            info = await YTDLSource.extract_info(query, loop=self.bot.loop)
        except Exception as e:
            return await interaction.followup.send(f"❌ Gagal mengambil audio: `{e}`")

        if not info:
            return await interaction.followup.send("❌ Lagu tidak ditemukan.")

        raw_title = info.get('title', '')
        uploader = info.get('uploader', '')
        cat, kws = manager.detect_genre_keywords(raw_title, uploader)
        state.preferred_genre_category = cat
        state.preferred_genre_keywords = kws
        state.prefetched_autoplay_song = None

        if 'entries' in info and info.get('_type') == 'playlist':
            entries = [e for e in info['entries'] if e]
            for entry in entries:
                song = Song(entry, interaction.user)
                state.add(song)
            await interaction.followup.send(f"✅ Berhasil menambahkan **{len(entries)}** lagu dari playlist ke antrean.")
        else:
            entry = info['entries'][0] if 'entries' in info else info
            song = Song(entry, interaction.user)
            state.add(song)

            if voice_client.is_playing() or voice_client.is_paused():
                embed = discord.Embed(
                    title="📝 Ditambahkan ke Antrean",
                    description=f"[{song.title}]({song.url})",
                    color=discord.Color.blue()
                )
                embed.add_field(name="Durasi", value=song.format_duration(), inline=True)
                embed.add_field(name="Posisi di Antrean", value=f"#{len(state.queue)}", inline=True)
                if song.thumbnail:
                    embed.set_thumbnail(url=song.thumbnail)
                return await interaction.followup.send(embed=embed)

        if not voice_client.is_playing() and not voice_client.is_paused():
            manager.play_next(interaction.guild, interaction.channel)
            await interaction.followup.send("🔍 Memuat dan memutar lagu...", ephemeral=True)

async def setup(bot: commands.Bot):
    await bot.add_cog(PlayCommand(bot))
