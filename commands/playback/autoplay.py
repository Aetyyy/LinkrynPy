import discord
from discord import app_commands
from discord.ext import commands

class AutoplayCommand(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    def get_manager(self):
        return self.bot.get_cog("MusicManager")

    @app_commands.command(name="autoplay", description="Aktifkan atau nonaktifkan fitur Autoplay (rekomendasi otomatis sejenis)")
    @app_commands.describe(enable="Aktifkan Autoplay?")
    async def autoplay(self, interaction: discord.Interaction, enable: bool):
        manager = self.get_manager()
        state = manager.get_guild_state(interaction.guild_id)
        state.autoplay = enable
        status_text = "DIAKTIFKAN 📻" if enable else "DINONAKTIFKAN 📴"
        await interaction.response.send_message(f"📻 Fitur Autoplay telah **{status_text}**.")
        await manager.update_nowplaying_card(interaction.guild, interaction.channel)

async def setup(bot: commands.Bot):
    await bot.add_cog(AutoplayCommand(bot))
