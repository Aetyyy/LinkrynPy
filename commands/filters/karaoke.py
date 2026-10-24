import discord
from discord import app_commands
from discord.ext import commands

class KaraokeCommand(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    def get_manager(self):
        return self.bot.get_cog("MusicManager")

    @app_commands.command(name="karaoke", description="Aktifkan atau matikan mode karaoke (peredam vokal).")
    async def karaoke(self, interaction: discord.Interaction):
        manager = self.get_manager()
        state = manager.get_guild_state(interaction.guild_id)
        if not state.current:
            return await interaction.response.send_message("❌ Tidak ada lagu yang sedang diputar.", ephemeral=True)

        state.karaoke = not state.karaoke
        status = "Aktif (ON)" if state.karaoke else "Mati (OFF)"
        await interaction.response.send_message(f"🎤 Mode **Karaoke** sekarang: `{status}`", ephemeral=False)
        await manager.apply_filter_realtime(interaction.guild, interaction.channel)

async def setup(bot: commands.Bot):
    await bot.add_cog(KaraokeCommand(bot))
