import discord
from discord import app_commands
from discord.ext import commands

from audio_source import YTDLSource
from ui_views import SongSearchView

class SearchCommand(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    def get_manager(self):
        return self.bot.get_cog("MusicManager")

    @app_commands.command(name="search", description="Cari hingga 5 pilihan lagu lalu pilih lewat dropdown")
    @app_commands.describe(query="Kata kunci pencarian lagu")
    async def search(self, interaction: discord.Interaction, query: str):
        manager = self.get_manager()
        await interaction.response.defer()
        try:
            entries = await YTDLSource.extract_search_list(query, max_results=5, loop=self.bot.loop)
        except Exception as e:
            return await interaction.followup.send(f"❌ Gagal mencari lagu: `{e}`")

        if not entries:
            return await interaction.followup.send("❌ Tidak ada hasil yang ditemukan untuk kata kunci tersebut.")

        desc = ""
        for i, entry in enumerate(entries, 1):
            dur = int(entry.get('duration', 0))
            mins, secs = divmod(dur, 60)
            desc += f"**{i}.** [{entry.get('title')}]({entry.get('webpage_url')}) (`{mins}:{secs:02d}`)\n"

        embed = discord.Embed(
            title=f"🔍 Hasil Pencarian: {query}",
            description=desc + "\n*Pilih lagu pada menu dropdown di bawah:*",
            color=discord.Color.purple()
        )
        view = SongSearchView(entries, interaction.user, manager)
        await interaction.followup.send(embed=embed, view=view)

async def setup(bot: commands.Bot):
    await bot.add_cog(SearchCommand(bot))
