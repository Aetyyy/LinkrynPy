import discord
from discord import app_commands
from discord.ext import commands

from ui_views import QueuePageView

class QueueCommand(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    def get_manager(self):
        return self.bot.get_cog("MusicManager")

    @app_commands.command(name="queue", description="Tampilkan daftar antrean lagu saat ini dengan tombol interaktif")
    async def queue(self, interaction: discord.Interaction):
        manager = self.get_manager()
        state = manager.get_guild_state(interaction.guild_id)
        if not state.current and not state.queue:
            return await interaction.response.send_message("📭 Antrean musik sedang kosong.", ephemeral=True)

        view = QueuePageView(manager, interaction.guild_id, current_page=1)
        await interaction.response.send_message(embed=view.get_embed(), view=view)

async def setup(bot: commands.Bot):
    await bot.add_cog(QueueCommand(bot))
