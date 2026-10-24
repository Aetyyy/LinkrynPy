import discord
from discord import app_commands
from discord.ext import commands

class VolumeCommand(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    def get_manager(self):
        return self.bot.get_cog("MusicManager")

    @app_commands.command(name="volume", description="Atur volume pemutaran musik (1 - 200%).")
    @app_commands.describe(level="Persentase volume (1 - 200)")
    async def volume(self, interaction: discord.Interaction, level: int):
        voice_client = interaction.guild.voice_client
        if not voice_client:
            return await interaction.response.send_message("❌ Bot tidak terhubung ke voice channel.", ephemeral=True)

        if not 1 <= level <= 200:
            return await interaction.response.send_message("❌ Volume harus antara 1 sampai 200.", ephemeral=True)

        manager = self.get_manager()
        state = manager.get_guild_state(interaction.guild_id)
        state.volume = level / 100.0

        if voice_client.source:
            if hasattr(voice_client.source, "volume"):
                voice_client.source.volume = state.volume
            elif hasattr(voice_client.source, "original") and hasattr(voice_client.source.original, "volume"):
                voice_client.source.original.volume = state.volume

        await interaction.response.send_message(f"🔊 Volume diatur ke `{level}%`.", ephemeral=False)
        await manager.update_nowplaying_card(interaction.guild, interaction.channel)

async def setup(bot: commands.Bot):
    await bot.add_cog(VolumeCommand(bot))
