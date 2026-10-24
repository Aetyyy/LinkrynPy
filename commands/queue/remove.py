import discord
from discord import app_commands
from discord.ext import commands

class RemoveCommand(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    def get_manager(self):
        return self.bot.get_cog("MusicManager")

    @app_commands.command(name="remove", description="Hapus nomor lagu tertentu dari antrean")
    @app_commands.describe(index="Nomor lagu dalam antrean")
    async def remove(self, interaction: discord.Interaction, index: int):
        manager = self.get_manager()
        state = manager.get_guild_state(interaction.guild_id)
        removed_song = state.remove(index - 1)
        if not removed_song:
            return await interaction.response.send_message(f"❌ Nomor antrean #{index} tidak ditemukan.", ephemeral=True)
        await interaction.response.send_message(f"🗑️ Menghapus **{removed_song.title}** dari antrean.")

async def setup(bot: commands.Bot):
    await bot.add_cog(RemoveCommand(bot))
