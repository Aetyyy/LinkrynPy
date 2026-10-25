import discord
from discord import app_commands
from discord.ext import commands
from database import db
from music_queue import Song

class LikedCommand(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    def get_manager(self):
        return self.bot.get_cog("MusicManager")

    @app_commands.command(name="liked", description="Lihat atau putar koleksi lagu yang Anda sukai (Liked Songs)")
    @app_commands.describe(action="Pilih untuk melihat daftar atau langsung memutar seluruh lagu")
    @app_commands.choices(action=[
        app_commands.Choice(name="Lihat Daftar Lagu Disukai", value="view"),
        app_commands.Choice(name="Putar Semua Lagu Disukai", value="play")
    ])
    async def liked(self, interaction: discord.Interaction, action: app_commands.Choice[str]):
        user_id = str(interaction.user.id)
        likes = await db.get_liked_songs(user_id)
        if not likes:
            return await interaction.response.send_message("🤍 Anda belum memiliki lagu yang disukai. Gunakan `/like` saat lagu diputar!", ephemeral=True)

        manager = self.get_manager()

        if action.value == "play":
            voice_client = await manager.ensure_voice(interaction)
            if not voice_client:
                return await interaction.response.send_message("❌ Anda harus berada di voice channel terlebih dahulu!", ephemeral=True)

            state = manager.get_guild_state(interaction.guild_id)
            for item in likes:
                state.add(Song(item, interaction.user))

            await interaction.response.send_message(f"❤️ Memuat **{len(likes)}** lagu yang Anda sukai ke dalam antrean!")
            if not voice_client.is_playing() and not voice_client.is_paused():
                safe_channel = manager.get_safe_text_channel(interaction.guild, interaction.channel)
                manager.play_next(interaction.guild, safe_channel)
        else:
            embed = discord.Embed(
                title=f"❤️ Koleksi Lagu Disukai ({len(likes)} lagu)",
                description=f"Daftar lagu favorit **{interaction.user.display_name}**:\n\n",
                color=discord.Color.magenta()
            )
            for i, s in enumerate(likes[:15], 1):
                embed.description += f"`{i}.` **[{s['title'][:50]}]({s['url']})** • `{s.get('uploader', 'Artis')}`\n"
            if len(likes) > 15:
                embed.description += f"\n*...dan {len(likes) - 15} lagu lainnya.*"
            embed.set_footer(text="Gunakan /liked action:Putar Semua Lagu Disukai untuk memutar")
            await interaction.response.send_message(embed=embed, ephemeral=True)

async def setup(bot: commands.Bot):
    await bot.add_cog(LikedCommand(bot))
