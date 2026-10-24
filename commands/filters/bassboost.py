import discord
from discord import app_commands
from discord.ext import commands

class BassboostCommand(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    def get_manager(self):
        return self.bot.get_cog("MusicManager")

    @app_commands.command(name="bassboost", description="Atur kekuatan bassboost audio secara instan.")
    @app_commands.describe(level="Tingkat bassboost: off, low, medium, high, extreme")
    @app_commands.choices(level=[
        app_commands.Choice(name="Off (Normal)", value="off"),
        app_commands.Choice(name="Low (+6dB)", value="low"),
        app_commands.Choice(name="Medium (+10dB)", value="medium"),
        app_commands.Choice(name="High (+15dB)", value="high"),
        app_commands.Choice(name="Extreme (+20dB Earrape)", value="extreme")
    ])
    async def bassboost(self, interaction: discord.Interaction, level: app_commands.Choice[str]):
        manager = self.get_manager()
        state = manager.get_guild_state(interaction.guild_id)
        if not state.current:
            return await interaction.response.send_message("❌ Tidak ada lagu yang sedang diputar.", ephemeral=True)

        level_val = level.value if hasattr(level, 'value') else level
        state.bass_boost = level_val
        await interaction.response.send_message(f"🎛️ Mengatur **Bassboost** ke `{level_val.upper()}`...", ephemeral=False)
        await manager.apply_filter_realtime(interaction.guild, interaction.channel)

async def setup(bot: commands.Bot):
    await bot.add_cog(BassboostCommand(bot))
