import discord
from discord import app_commands
from discord.ext import commands

class NightcoreCommand(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    def get_manager(self):
        return self.bot.get_cog("MusicManager")

    @app_commands.command(name="nightcore", description="Aktifkan atau matikan efek Nightcore (pitch & speed up).")
    async def nightcore(self, interaction: discord.Interaction):
        manager = self.get_manager()
        state = manager.get_guild_state(interaction.guild_id)
        if not state.current:
            return await interaction.response.send_message("❌ Tidak ada lagu yang sedang diputar.", ephemeral=True)

        state.nightcore = not state.nightcore
        if state.nightcore:
            state.vaporwave = False
        status = "Aktif (ON)" if state.nightcore else "Mati (OFF)"
        await interaction.response.send_message(f"🎧 Efek **Nightcore** sekarang: `{status}`", ephemeral=False)
        await manager.apply_filter_realtime(interaction.guild, interaction.channel)

async def setup(bot: commands.Bot):
    await bot.add_cog(NightcoreCommand(bot))
