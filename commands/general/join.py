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
        voice_client = interaction.guild.voice_client

        if voice_client:
            if voice_client.channel.id != channel.id:
                await voice_client.move_to(channel)
                await interaction.response.send_message(f"🔊 Berpindah ke {channel.mention}.")
            else:
                await interaction.response.send_message(f"🔊 Sudah berada di {channel.mention}.", ephemeral=True)
        else:
            await channel.connect()
            await interaction.response.send_message(f"🔊 Bergabung ke {channel.mention}!")

async def setup(bot: commands.Bot):
    await bot.add_cog(JoinCommand(bot))
