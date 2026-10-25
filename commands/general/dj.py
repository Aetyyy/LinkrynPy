import discord
from discord import app_commands
from discord.ext import commands

class DJCommand(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    def get_manager(self):
        return self.bot.get_cog("MusicManager")

    dj_group = app_commands.Group(name="dj", description="Kelola hak akses skip khusus bot musik")

    @dj_group.command(name="grant", description="Berikan akses khusus kepada seseorang agar dapat skip lagu tanpa persetujuan")
    @app_commands.describe(member="Member Discord yang ingin diberikan izin skip")
    async def grant(self, interaction: discord.Interaction, member: discord.Member):
        manager = self.get_manager()
        state = manager.get_guild_state(interaction.guild_id)

        # Hanya pengguna utama (pemilik sesi) atau Admin yang bisa memberikan hak
        is_admin = interaction.user.guild_permissions.administrator or interaction.user.guild_permissions.manage_guild
        is_owner = state.session_owner_id and state.session_owner_id == interaction.user.id

        if not is_admin and not is_owner:
            return await interaction.response.send_message(
                "❌ Hanya pemutar lagu utama (pemilik sesi) atau Administrator yang dapat memberikan akses DJ/Skip!",
                ephemeral=True
            )

        state.trusted_skip_users.add(member.id)
        await interaction.response.send_message(
            f"✨ **{member.display_name}** telah diberikan izin khusus! Sekarang dia dapat melewati (skip) lagu kapan saja tanpa memerlukan persetujuan."
        )

    @dj_group.command(name="revoke", description="Cabut izin skip khusus dari seseorang")
    @app_commands.describe(member="Member Discord yang ingin dicabut izin skip-nya")
    async def revoke(self, interaction: discord.Interaction, member: discord.Member):
        manager = self.get_manager()
        state = manager.get_guild_state(interaction.guild_id)

        is_admin = interaction.user.guild_permissions.administrator or interaction.user.guild_permissions.manage_guild
        is_owner = state.session_owner_id and state.session_owner_id == interaction.user.id

        if not is_admin and not is_owner:
            return await interaction.response.send_message(
                "❌ Hanya pemutar lagu utama atau Administrator yang dapat mencabut akses DJ/Skip!",
                ephemeral=True
            )

        if member.id in state.trusted_skip_users:
            state.trusted_skip_users.remove(member.id)
            await interaction.response.send_message(f"🔒 Izin skip khusus untuk **{member.display_name}** telah dicabut.")
        else:
            await interaction.response.send_message(f"⚠️ **{member.display_name}** tidak memiliki izin khusus sebelumnya.", ephemeral=True)

    @dj_group.command(name="list", description="Lihat pengguna utama sesi dan daftar member dengan izin skip khusus")
    async def list_dj(self, interaction: discord.Interaction):
        manager = self.get_manager()
        state = manager.get_guild_state(interaction.guild_id)

        owner_name = "Belum ada sesi aktif"
        if state.session_owner_id:
            m = interaction.guild.get_member(state.session_owner_id)
            owner_name = m.mention if m else f"ID: {state.session_owner_id}"

        trusted = []
        for uid in state.trusted_skip_users:
            m = interaction.guild.get_member(uid)
            trusted.append(m.mention if m else f"ID: {uid}")

        embed = discord.Embed(title="🎧 Daftar Akses DJ & Skip Bot", color=discord.Color.blue())
        embed.add_field(name="👑 Pengguna Utama (Pemilik Sesi)", value=owner_name, inline=False)
        embed.add_field(
            name="⭐ Member dengan Izin Skip Khusus",
            value="\n".join(trusted) if trusted else "*Tidak ada member tambahan*",
            inline=False
        )
        embed.set_footer(text="Pengguna utama & member dengan izin khusus dapat melewati lagu tanpa voting.")
        await interaction.response.send_message(embed=embed)

async def setup(bot: commands.Bot):
    await bot.add_cog(DJCommand(bot))
