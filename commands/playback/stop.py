import discord
from discord import app_commands
from discord.ext import commands

class StopCommand(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    def get_manager(self):
        return self.bot.get_cog("MusicManager")

    @app_commands.command(name="stop", description="Hentikan musik, bersihkan antrean, dan keluar dari voice")
    async def stop(self, interaction: discord.Interaction):
        vc = interaction.guild.voice_client
        if not vc:
            return await interaction.response.send_message("❌ Bot tidak berada di voice channel.", ephemeral=True)
        manager = self.get_manager()
        state = manager.get_guild_state(interaction.guild_id)
        if state.last_nowplaying_msg:
            try:
                await state.last_nowplaying_msg.delete()
            except Exception:
                pass
            state.last_nowplaying_msg = None
        state.clear()
        state.current = None
        if hasattr(manager, "set_voice_channel_status") and vc.channel:
            await manager.set_voice_channel_status(vc.channel, "")
        vc.stop()
        await vc.disconnect()
        await interaction.response.send_message("⏹️ Musik dihentikan dan antrean dibersihkan.")

async def setup(bot: commands.Bot):
    await bot.add_cog(StopCommand(bot))
