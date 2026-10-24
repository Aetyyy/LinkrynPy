import discord
from discord import app_commands
from discord.ext import commands

class SpeedCommand(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    def get_manager(self):
        return self.bot.get_cog("MusicManager")

    @app_commands.command(name="speed", description="Atur kecepatan putar lagu (0.5x - 2.0x).")
    @app_commands.describe(value="Kecepatan putar (contoh: 1.25)")
    async def speed(self, interaction: discord.Interaction, value: float):
        if value < 0.5 or value > 2.0:
            return await interaction.response.send_message("❌ Kecepatan harus antara `0.5` dan `2.0`.", ephemeral=True)

        manager = self.get_manager()
        state = manager.get_guild_state(interaction.guild_id)
        if not state.current:
            return await interaction.response.send_message("❌ Tidak ada lagu yang sedang diputar.", ephemeral=True)

        state.speed = value
        await interaction.response.send_message(f"⏩ Kecepatan lagu diatur ke `{value}x`", ephemeral=False)
        await manager.apply_filter_realtime(interaction.guild, interaction.channel)

async def setup(bot: commands.Bot):
    await bot.add_cog(SpeedCommand(bot))
