import discord
from discord import app_commands
from discord.ext import commands

class ResumeCommand(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    def get_manager(self):
        return self.bot.get_cog("MusicManager")

    @app_commands.command(name="resume", description="Lanjutkan lagu yang sedang dijeda")
    async def resume(self, interaction: discord.Interaction):
        vc = interaction.guild.voice_client
        if not vc or not vc.is_paused():
            return await interaction.response.send_message("❌ Musik tidak sedang dalam kondisi jeda.", ephemeral=True)
        vc.resume()
        manager = self.get_manager()
        state = manager.get_guild_state(interaction.guild_id)
        if state and state.current:
            state.current.resume()
        await interaction.response.send_message("▶️ Musik dilanjutkan.")
        await manager.update_nowplaying_card(interaction.guild, interaction.channel)

async def setup(bot: commands.Bot):
    await bot.add_cog(ResumeCommand(bot))
