import discord
from discord import app_commands
from discord.ext import commands

class MoveCommand(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    def get_manager(self):
        return self.bot.get_cog("MusicManager")

    @app_commands.command(name="move", description="Pindahkan posisi lagu di antrean ke nomor posisi lain")
    @app_commands.describe(from_position="Nomor urut asal", to_position="Nomor urut tujuan")
    async def move(self, interaction: discord.Interaction, from_position: int, to_position: int):
        manager = self.get_manager()
        state = manager.get_guild_state(interaction.guild_id)
        moved_song = state.move(from_position - 1, to_position - 1)
        if not moved_song:
            return await interaction.response.send_message("❌ Posisi tidak valid.", ephemeral=True)
        await interaction.response.send_message(f"📦 Lagu **{moved_song.title}** dipindahkan dari posisi #{from_position} ke #{to_position}.")

async def setup(bot: commands.Bot):
    await bot.add_cog(MoveCommand(bot))
