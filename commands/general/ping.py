import discord
from discord import app_commands
from discord.ext import commands

class PingCommand(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(name="ping", description="Cek latensi bot dan koneksi Discord WebSocket.")
    async def ping(self, interaction: discord.Interaction):
        latency = round(self.bot.latency * 1000)
        await interaction.response.send_message(f"🏓 Pong! Latensi Bot: `{latency}ms`", ephemeral=True)

async def setup(bot: commands.Bot):
    await bot.add_cog(PingCommand(bot))
