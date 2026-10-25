import discord
from discord import app_commands
from discord.ext import commands

class PauseCommand(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    def get_manager(self):
        return self.bot.get_cog("MusicManager")

    @app_commands.command(name="pause", description="Jeda pemutaran musik saat ini")
    async def pause(self, interaction: discord.Interaction):
        vc = interaction.guild.voice_client
        if not vc or not vc.is_playing():
            return await interaction.response.send_message("❌ Tidak ada musik yang sedang diputar.", ephemeral=True)
        vc.pause()
        manager = self.get_manager()
        state = manager.get_guild_state(interaction.guild_id)
        if state and state.current:
            state.current.pause()
        await interaction.response.send_message("⏸️ Musik dijeda.")
        await manager.update_nowplaying_card(interaction.guild, interaction.channel)

async def setup(bot: commands.Bot):
    await bot.add_cog(PauseCommand(bot))
