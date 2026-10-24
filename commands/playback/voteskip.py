import discord
from discord import app_commands
from discord.ext import commands

class VoteSkipCommand(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    def get_manager(self):
        return self.bot.get_cog("MusicManager")

    @app_commands.command(name="voteskip", description="Ajukan voting bersama anggota voice channel untuk melewati lagu")
    async def voteskip(self, interaction: discord.Interaction):
        vc = interaction.guild.voice_client
        if not vc or not vc.is_playing():
            return await interaction.response.send_message("❌ Tidak ada lagu yang sedang diputar.", ephemeral=True)

        if not interaction.user.voice or interaction.user.voice.channel != vc.channel:
            return await interaction.response.send_message("❌ Kamu harus berada di voice channel yang sama dengan bot.", ephemeral=True)

        listeners = [m for m in vc.channel.members if not m.bot]
        required_votes = max(1, (len(listeners) + 1) // 2)

        manager = self.get_manager()
        state = manager.get_guild_state(interaction.guild_id)
        if interaction.user.id in state.votes:
            return await interaction.response.send_message("⚠️ Kamu sudah memberikan vote skip sebelumnya.", ephemeral=True)

        state.votes.add(interaction.user.id)
        current_votes = len(state.votes)

        if current_votes >= required_votes:
            state.votes.clear()
            vc.stop()
            await interaction.response.send_message(f"🗳️ Voting skip tercapai (**{current_votes}/{required_votes}**)! Melewati lagu...")
        else:
            await interaction.response.send_message(f"🗳️ **{interaction.user.display_name}** melakukan vote skip. ({current_votes}/{required_votes} suara)")

async def setup(bot: commands.Bot):
    await bot.add_cog(VoteSkipCommand(bot))
