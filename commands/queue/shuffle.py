import discord
from discord import app_commands
from discord.ext import commands

class ShuffleCommand(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    def get_manager(self):
        return self.bot.get_cog("MusicManager")

    @app_commands.command(name="shuffle", description="Acak susunan lagu di dalam antrean")
    async def shuffle(self, interaction: discord.Interaction):
        manager = self.get_manager()
        state = manager.get_guild_state(interaction.guild_id)
        if len(state.queue) < 2:
            return await interaction.response.send_message("❌ Memerlukan minimal 2 lagu di antrean untuk mengacak.", ephemeral=True)
        state.shuffle()
        await interaction.response.send_message(f"🔀 Berhasil mengacak **{len(state.queue)}** lagu di antrean!")

async def setup(bot: commands.Bot):
    await bot.add_cog(ShuffleCommand(bot))
