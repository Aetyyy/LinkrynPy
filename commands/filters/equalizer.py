import discord
from discord import app_commands
from discord.ext import commands

class EqualizerCommand(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    def get_manager(self):
        return self.bot.get_cog("MusicManager")

    @app_commands.command(name="equalizer", description="Pilih preset equalizer audio.")
    @app_commands.describe(preset="Pilihan preset EQ")
    @app_commands.choices(preset=[
        app_commands.Choice(name="Flat (Default)", value="flat"),
        app_commands.Choice(name="Pop", value="pop"),
        app_commands.Choice(name="Rock", value="rock"),
        app_commands.Choice(name="Electronic", value="electronic"),
        app_commands.Choice(name="Classical", value="classical")
    ])
    async def equalizer(self, interaction: discord.Interaction, preset: app_commands.Choice[str]):
        manager = self.get_manager()
        state = manager.get_guild_state(interaction.guild_id)
        if not state.current:
            return await interaction.response.send_message("❌ Tidak ada lagu yang sedang diputar.", ephemeral=True)

        preset_val = preset.value if hasattr(preset, 'value') else preset
        state.equalizer = preset_val
        await interaction.response.send_message(f"🎚️ Mengatur Equalizer ke preset `{preset_val.upper()}`...", ephemeral=False)
        await manager.apply_filter_realtime(interaction.guild, interaction.channel)

async def setup(bot: commands.Bot):
    await bot.add_cog(EqualizerCommand(bot))
