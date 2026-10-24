import discord
from discord import app_commands
from discord.ext import commands

class SeekCommand(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    def get_manager(self):
        return self.bot.get_cog("MusicManager")

    @app_commands.command(name="seek", description="Lompat ke durasi tertentu dalam lagu (format mm:ss atau detik).")
    @app_commands.describe(timestamp="Posisi durasi (contoh: 1:30 atau 90)")
    async def seek(self, interaction: discord.Interaction, timestamp: str):
        manager = self.get_manager()
        state = manager.get_guild_state(interaction.guild_id)
        if not state.current:
            return await interaction.response.send_message("❌ Tidak ada lagu yang sedang diputar.", ephemeral=True)

        try:
            if ":" in timestamp:
                parts = timestamp.split(":")
                if len(parts) == 2:
                    target_seconds = int(parts[0]) * 60 + int(parts[1])
                elif len(parts) == 3:
                    target_seconds = int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
                else:
                    raise ValueError
            else:
                target_seconds = int(timestamp)
        except ValueError:
            return await interaction.response.send_message("❌ Format waktu tidak valid! Gunakan format `mm:ss` atau jumlah detik.", ephemeral=True)

        if state.current.duration and target_seconds > state.current.duration:
            return await interaction.response.send_message("❌ Durasi yang diminta melebihi panjang lagu.", ephemeral=True)

        await interaction.response.send_message(f"⏩ Melompat ke `{state.current.format_duration(target_seconds)}`...", ephemeral=False)
        await manager.apply_filter_realtime(interaction.guild, interaction.channel, seek_to=target_seconds)

async def setup(bot: commands.Bot):
    await bot.add_cog(SeekCommand(bot))
