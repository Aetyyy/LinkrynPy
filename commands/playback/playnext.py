import discord
from discord import app_commands
from discord.ext import commands

from audio_source import YTDLSource
from music_queue import Song
from spotify_helper import SpotifyHelper

class PlayNextCommand(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    def get_manager(self):
        return self.bot.get_cog("MusicManager")

    @app_commands.command(name="playnext", description="Sisipkan lagu langsung ke urutan pertama antrean berikutnya")
    @app_commands.describe(query="Judul lagu, link YouTube, atau link Spotify")
    async def playnext(self, interaction: discord.Interaction, query: str):
        manager = self.get_manager()
        voice_client = await manager.ensure_voice(interaction)
        if not voice_client:
            return await interaction.response.send_message("❌ Kamu harus berada di voice channel terlebih dahulu!", ephemeral=True)

        await interaction.response.defer()
        state = manager.get_guild_state(interaction.guild_id)

        if SpotifyHelper.is_spotify_url(query):
            queries = await SpotifyHelper.extract_spotify_queries(query)
            if queries:
                query = queries[0]

        try:
            info = await YTDLSource.extract_info(query, loop=self.bot.loop)
        except Exception as e:
            return await interaction.followup.send(f"❌ Gagal memuat audio: `{e}`")

        entry = info['entries'][0] if 'entries' in info else info
        song = Song(entry, interaction.user)
        state.add(song, top=True)
        cat, kws = manager.detect_genre_keywords(song.title, song.uploader)
        state.preferred_genre_category = cat
        state.preferred_genre_keywords = kws
        state.prefetched_autoplay_song = None

        await interaction.followup.send(f"⏩ **{song.title}** disisipkan ke nomor #1 antrean berikutnya!")
        if not voice_client.is_playing() and not voice_client.is_paused():
            manager.play_next(interaction.guild, interaction.channel)

async def setup(bot: commands.Bot):
    await bot.add_cog(PlayNextCommand(bot))
