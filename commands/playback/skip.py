import discord
from discord import app_commands
from discord.ext import commands
from ui_views import SkipApprovalView

class SkipCommand(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    def get_manager(self):
        return self.bot.get_cog("MusicManager")

    @app_commands.command(name="skip", description="Lewati lagu yang sedang aktif diputar (memerlukan persetujuan jika bukan pemilik lagu)")
    async def skip(self, interaction: discord.Interaction):
        vc = interaction.guild.voice_client
        if not vc or not (vc.is_playing() or vc.is_paused()):
            return await interaction.response.send_message("❌ Tidak ada lagu yang sedang diputar.", ephemeral=True)

        if not interaction.user.voice or interaction.user.voice.channel != vc.channel:
            return await interaction.response.send_message("❌ Kamu harus berada di voice channel yang sama dengan bot.", ephemeral=True)

        manager = self.get_manager()
        state = manager.get_guild_state(interaction.guild_id)

        can_skip, reason = state.has_skip_permission(interaction.user, vc)
        if can_skip:
            vc.stop()
            return await interaction.response.send_message(f"⏭️ **{interaction.user.display_name}** melewati lagu (`{reason}`).")

        listeners = [m for m in vc.channel.members if not m.bot]
        required_votes = max(1, (len(listeners) + 1) // 2)

        owner_name = "Pengguna Utama"
        if state.session_owner_id:
            m = interaction.guild.get_member(state.session_owner_id)
            if m:
                owner_name = m.display_name
        elif state.current and state.current.requester:
            owner_name = getattr(state.current.requester, "display_name", "Pemutar Lagu")

        embed = discord.Embed(
            title="🔔 Permintaan Melewati Lagu",
            description=(
                f"**{interaction.user.display_name}** ingin melewati lagu **{state.current.title if state.current else 'saat ini'}**.\n\n"
                f"📌 *Diperlukan persetujuan dari pemutar lagu utama (**{owner_name}**), Admin/DJ, atau voting minimal **{required_votes} suara**.*"
            ),
            color=discord.Color.gold()
        )
        view = SkipApprovalView(self.bot, interaction.guild_id, interaction.user, required_votes)
        await interaction.response.send_message(embed=embed, view=view)

async def setup(bot: commands.Bot):
    await bot.add_cog(SkipCommand(bot))
