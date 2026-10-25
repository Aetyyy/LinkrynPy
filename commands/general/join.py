import discord
from discord import app_commands
from discord.ext import commands

class JoinCommand(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(name="join", description="Hubungkan bot ke voice channel Anda.")
    async def join(self, interaction: discord.Interaction):
        if not interaction.user.voice or not interaction.user.voice.channel:
            return await interaction.response.send_message("❌ Anda harus berada di voice channel terlebih dahulu!", ephemeral=True)

        channel = interaction.user.voice.channel
        manager = self.bot.get_cog("MusicManager")
        if not manager:
            return await interaction.response.send_message("❌ MusicManager tidak aktif.", ephemeral=True)

        from music_manager import VoiceChannelProtectedError
        try:
            vc = await manager.join_or_move(channel, interaction.user.id)
            await interaction.response.send_message(f"🔊 Terhubung ke {channel.mention}!")
        except VoiceChannelProtectedError as e:
            return await interaction.response.send_message(
                f"❌ Bot sedang aktif digunakan di **#{e.channel_name}**. Anda harus bergabung ke channel tersebut!",
                ephemeral=True
            )
        except Exception as e:
            return await interaction.response.send_message(
                f"❌ Gagal bergabung ke voice channel: {str(e)}",
                ephemeral=True
            )

async def setup(bot: commands.Bot):
    await bot.add_cog(JoinCommand(bot))
