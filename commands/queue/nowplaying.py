import discord
from discord import app_commands
from discord.ext import commands

class NowPlayingCommand(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    def get_manager(self):
        return self.bot.get_cog("MusicManager")

    @app_commands.command(name="nowplaying", description="Tampilkan info detail lagu lengkap dengan tombol kontrol")
    async def nowplaying(self, interaction: discord.Interaction):
        manager = self.get_manager()
        state = manager.get_guild_state(interaction.guild_id)
        if not state.current:
            return await interaction.response.send_message("❌ Tidak ada lagu yang sedang diputar.", ephemeral=True)

        embed = manager.create_nowplaying_embed(state, state.current)
        from ui_views import MusicControlView
        view = MusicControlView(self.bot, interaction.guild_id)
        await interaction.response.send_message(embed=embed, view=view)
        
        try:
            fetched_msg = await interaction.original_response()
            state.last_nowplaying_msg = fetched_msg
        except Exception:
            pass

async def setup(bot: commands.Bot):
    await bot.add_cog(NowPlayingCommand(bot))
