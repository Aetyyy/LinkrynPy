import discord
from discord import app_commands
from discord.ext import commands

class LoopCommand(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    def get_manager(self):
        return self.bot.get_cog("MusicManager")

    @app_commands.command(name="loop", description="Atur mode perulangan pemutaran lagu")
    @app_commands.describe(mode="Pilihan mode loop")
    @app_commands.choices(mode=[
        app_commands.Choice(name="Mati (Off)", value="off"),
        app_commands.Choice(name="Ulang Lagu Ini (Track)", value="track"),
        app_commands.Choice(name="Ulang Seluruh Antrean (Queue)", value="queue")
    ])
    async def loop(self, interaction: discord.Interaction, mode: str):
        manager = self.get_manager()
        state = manager.get_guild_state(interaction.guild_id)
        mode_val = mode.value if hasattr(mode, 'value') else mode
        state.loop_mode = mode_val
        await interaction.response.send_message(f"🔁 Mode loop diatur ke: **{mode_val.upper()}**")
        await manager.update_nowplaying_card(interaction.guild, interaction.channel)

async def setup(bot: commands.Bot):
    await bot.add_cog(LoopCommand(bot))
