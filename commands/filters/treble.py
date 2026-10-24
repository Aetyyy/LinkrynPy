import discord
from discord import app_commands
from discord.ext import commands

class TrebleCommand(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    def get_manager(self):
        return self.bot.get_cog("MusicManager")

    @app_commands.command(name="treble", description="Atur booster frekuensi treble/vokal.")
    @app_commands.describe(level="Tingkat treble: off, low, medium, high")
    @app_commands.choices(level=[
        app_commands.Choice(name="Off (Normal)", value="off"),
        app_commands.Choice(name="Low (+4dB)", value="low"),
        app_commands.Choice(name="Medium (+8dB)", value="medium"),
        app_commands.Choice(name="High (+12dB)", value="high")
    ])
    async def treble(self, interaction: discord.Interaction, level: app_commands.Choice[str]):
        manager = self.get_manager()
        state = manager.get_guild_state(interaction.guild_id)
        if not state.current:
            return await interaction.response.send_message("❌ Tidak ada lagu yang sedang diputar.", ephemeral=True)

        level_val = level.value if hasattr(level, 'value') else level
        treble_map = {"off": 0, "low": 4, "medium": 8, "high": 12}
        state.treble = treble_map.get(level_val, 0)
        await interaction.response.send_message(f"✨ Mengatur Treble ke `{level_val.upper()}`...", ephemeral=False)
        await manager.apply_filter_realtime(interaction.guild, interaction.channel)

async def setup(bot: commands.Bot):
    await bot.add_cog(TrebleCommand(bot))
