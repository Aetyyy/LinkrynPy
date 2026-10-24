import discord
from discord import app_commands
from discord.ext import commands

class LeaveCommand(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    def get_manager(self):
        return self.bot.get_cog("MusicManager")

    @app_commands.command(name="leave", description="Keluarkan bot dari voice channel dan bersihkan antrean.")
    async def leave(self, interaction: discord.Interaction):
        voice_client = interaction.guild.voice_client
        if not voice_client:
            return await interaction.response.send_message("❌ Bot tidak berada di voice channel.", ephemeral=True)

        manager = self.get_manager()
        state = manager.get_guild_state(interaction.guild_id)
        state.clear()

        await voice_client.disconnect()
        await interaction.response.send_message("👋 Terputus dari voice channel dan antrean telah dibersihkan.", ephemeral=False)

async def setup(bot: commands.Bot):
    await bot.add_cog(LeaveCommand(bot))
