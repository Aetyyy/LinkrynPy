import discord
from discord import app_commands
from discord.ext import commands

class SkipToCommand(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    def get_manager(self):
        return self.bot.get_cog("MusicManager")

    @app_commands.command(name="skipto", description="Lompat langsung ke nomor antrean lagu tertentu")
    @app_commands.describe(index="Nomor antrean yang dituju")
    async def skipto(self, interaction: discord.Interaction, index: int):
        manager = self.get_manager()
        state = manager.get_guild_state(interaction.guild_id)
        vc = interaction.guild.voice_client
        if index < 1 or index > len(state.queue):
            return await interaction.response.send_message(f"❌ Nomor tidak valid (Antrean saat ini 1 - {len(state.queue)}).", ephemeral=True)

        for _ in range(index - 1):
            state.queue.popleft()

        if vc and vc.is_playing():
            vc.stop()
        await interaction.response.send_message(f"⏭️ Melompat ke nomor antrean #{index}...")

async def setup(bot: commands.Bot):
    await bot.add_cog(SkipToCommand(bot))
