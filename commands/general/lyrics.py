import discord
from discord import app_commands
from discord.ext import commands

class LyricsCommand(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    def get_manager(self):
        return self.bot.get_cog("MusicManager")

    @app_commands.command(name="lyrics", description="Cari lirik lagu yang sedang diputar atau judul tertentu.")
    @app_commands.describe(query="Judul lagu (opsional, default: lagu saat ini)")
    async def lyrics(self, interaction: discord.Interaction, query: str = None):
        await interaction.response.defer()
        manager = self.get_manager()
        state = manager.get_guild_state(interaction.guild_id)
        current_song = state.current if not query else None

        if not query and not current_song:
            return await interaction.followup.send("❌ Tidak ada lagu yang sedang diputar. Berikan judul lagu yang ingin dicari.")

        embed = await manager.fetch_lyrics_embed(song=current_song, query=query)
        await interaction.followup.send(embed=embed)

async def setup(bot: commands.Bot):
    await bot.add_cog(LyricsCommand(bot))
