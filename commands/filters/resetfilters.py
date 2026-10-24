import discord
from discord import app_commands
from discord.ext import commands

class ResetfiltersCommand(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    def get_manager(self):
        return self.bot.get_cog("MusicManager")

    @app_commands.command(name="resetfilters", description="Reset semua efek audio dan filter ke kondisi default.")
    async def resetfilters(self, interaction: discord.Interaction):
        manager = self.get_manager()
        state = manager.get_guild_state(interaction.guild_id)
        if not state.current:
            return await interaction.response.send_message("❌ Tidak ada lagu yang sedang diputar.", ephemeral=True)

        state.bass_boost = "off"
        state.nightcore = False
        state.vaporwave = False
        state.speed = 1.0
        state.equalizer = "off"
        state.treble = 0
        state.karaoke = False
        await interaction.response.send_message("🔄 Semua filter audio telah direset ke default.", ephemeral=False)
        await manager.apply_filter_realtime(interaction.guild, interaction.channel)

async def setup(bot: commands.Bot):
    await bot.add_cog(ResetfiltersCommand(bot))
