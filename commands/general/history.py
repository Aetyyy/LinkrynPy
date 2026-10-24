import discord
from discord import app_commands
from discord.ext import commands

class HistoryCommand(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    def get_manager(self):
        return self.bot.get_cog("MusicManager")

    @app_commands.command(name="history", description="Tampilkan daftar riwayat lagu yang telah diputar sebelumnya.")
    async def history(self, interaction: discord.Interaction):
        manager = self.get_manager()
        state = manager.get_guild_state(interaction.guild_id)
        if not state.history:
            return await interaction.response.send_message("📜 Belum ada riwayat lagu yang diputar di server ini.", ephemeral=True)

        embed = discord.Embed(title="📜 Riwayat Lagu yang Telah Diputar", color=discord.Color.dark_purple())
        desc = []
        for i, song in enumerate(reversed(state.history[-15:]), 1):
            desc.append(f"`{i}.` **[{song.title}]({song.url})** | `{song.format_duration()}`")

        embed.description = "\n".join(desc)
        await interaction.response.send_message(embed=embed)

async def setup(bot: commands.Bot):
    await bot.add_cog(HistoryCommand(bot))
