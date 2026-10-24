import discord
from discord import app_commands
from discord.ext import commands

class SkipCommand(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(name="skip", description="Lewati lagu yang sedang aktif diputar")
    async def skip(self, interaction: discord.Interaction):
        vc = interaction.guild.voice_client
        if not vc or not vc.is_playing():
            return await interaction.response.send_message("❌ Tidak ada lagu yang sedang diputar.", ephemeral=True)
        vc.stop()
        await interaction.response.send_message("⏭️ Lagu dilewati!")

async def setup(bot: commands.Bot):
    await bot.add_cog(SkipCommand(bot))
