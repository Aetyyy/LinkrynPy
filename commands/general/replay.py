import discord
from discord import app_commands
from discord.ext import commands
import copy

class ReplayCommand(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    def get_manager(self):
        return self.bot.get_cog("MusicManager")

    @app_commands.command(name="replay", description="Putar ulang lagu sebelumnya yang ada di riwayat.")
    async def replay(self, interaction: discord.Interaction):
        manager = self.get_manager()
        state = manager.get_guild_state(interaction.guild_id)
        if not state.history:
            return await interaction.response.send_message("❌ Tidak ada riwayat lagu untuk diputar ulang.", ephemeral=True)

        last_song = state.history[-1]
        song_clone = copy.copy(last_song)
        song_clone.start_time = None
        song_clone.pause_time = None
        song_clone.total_paused_duration = 0

        state.add(song_clone, top=True)
        voice_client = interaction.guild.voice_client
        if voice_client and (voice_client.is_playing() or voice_client.is_paused()):
            voice_client.stop()
        else:
            manager.play_next(interaction.guild, interaction.channel)

        await interaction.response.send_message(f"🔁 Memutar ulang lagu sebelumnya: **{song_clone.title}**")

async def setup(bot: commands.Bot):
    await bot.add_cog(ReplayCommand(bot))
