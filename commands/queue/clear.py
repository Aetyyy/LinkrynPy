import discord
from discord import app_commands
from discord.ext import commands

class ClearCommand(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    def get_manager(self):
        return self.bot.get_cog("MusicManager")

    @app_commands.command(name="clear", description="Kosongkan seluruh antrean lagu")
    async def clear(self, interaction: discord.Interaction):
        manager = self.get_manager()
        state = manager.get_guild_state(interaction.guild_id)
        count = len(state.queue)
        state.clear()
        await interaction.response.send_message(f"🧹 Sebanyak **{count}** lagu dibersihkan dari antrean.")

async def setup(bot: commands.Bot):
    await bot.add_cog(ClearCommand(bot))
