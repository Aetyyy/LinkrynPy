import discord
from discord import app_commands
from discord.ext import commands
from database import db

class LikeCommand(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    def get_manager(self):
        return self.bot.get_cog("MusicManager")

    @app_commands.command(name="like", description="Sukai (Like) lagu yang sedang diputar dan simpan ke koleksi pribadi Anda")
    async def like(self, interaction: discord.Interaction):
        manager = self.get_manager()
        state = manager.get_guild_state(interaction.guild_id)
        if not state.current:
            return await interaction.response.send_message("❌ Tidak ada lagu yang sedang diputar.", ephemeral=True)

        song = state.current
        user_id = str(interaction.user.id)
        song_dict = {
            "title": song.title,
            "url": song.url,
            "duration": song.duration,
            "thumbnail": song.thumbnail,
            "uploader": song.uploader
        }

        is_already = await db.is_song_liked(user_id, song.url)
        if is_already:
            await db.remove_liked_song(user_id, song.url)
            await interaction.response.send_message(f"💔 Menghapus **{song.title}** dari daftar lagu yang disukai.", ephemeral=True)
        else:
            await db.add_liked_song(user_id, song_dict)
            await interaction.response.send_message(f"❤️ Berhasil menambahkan **{song.title}** ke koleksi lagu yang disukai!", ephemeral=True)

async def setup(bot: commands.Bot):
    await bot.add_cog(LikeCommand(bot))
