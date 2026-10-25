import discord
from discord import app_commands
from discord.ext import commands
from database import db
from music_queue import Song

class PlaylistCommand(commands.GroupCog, name="playlist"):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        super().__init__()

    def get_manager(self):
        return self.bot.get_cog("MusicManager")

    @app_commands.command(name="create", description="Buat playlist kustom baru di Linkryn")
    @app_commands.describe(name="Nama playlist yang ingin dibuat")
    async def create(self, interaction: discord.Interaction, name: str):
        user_id = str(interaction.user.id)
        res = await db.create_playlist(user_id, name)
        if res:
            await interaction.response.send_message(f"📁 Playlist **{name}** berhasil dibuat!", ephemeral=True)
        else:
            await interaction.response.send_message(f"⚠️ Playlist dengan nama **{name}** sudah ada atau tidak valid.", ephemeral=True)

    @app_commands.command(name="add", description="Tambahkan lagu yang sedang diputar ke playlist kustom Anda")
    @app_commands.describe(name="Nama playlist tujuan")
    async def add(self, interaction: discord.Interaction, name: str):
        manager = self.get_manager()
        state = manager.get_guild_state(interaction.guild_id)
        if not state.current:
            return await interaction.response.send_message("❌ Tidak ada lagu yang sedang diputar saat ini.", ephemeral=True)

        user_id = str(interaction.user.id)
        playlists = await db.get_user_playlists(user_id)
        matched = next((p for p in playlists if p["name"].lower() == name.lower()), None)
        if not matched:
            return await interaction.response.send_message(f"❌ Playlist **{name}** tidak ditemukan. Buat dulu dengan `/playlist create`.", ephemeral=True)

        song_dict = {
            "title": state.current.title,
            "url": state.current.url,
            "duration": state.current.duration,
            "thumbnail": state.current.thumbnail,
            "uploader": state.current.uploader
        }
        await db.add_to_playlist(matched["id"], song_dict, user_id=user_id)
        await interaction.response.send_message(f"✅ **{state.current.title}** berhasil ditambahkan ke playlist **{matched['name']}**!", ephemeral=True)

    @app_commands.command(name="list", description="Lihat semua playlist kustom milik Anda")
    async def list_playlists(self, interaction: discord.Interaction):
        user_id = str(interaction.user.id)
        playlists = await db.get_user_playlists(user_id)
        if not playlists:
            return await interaction.response.send_message("📁 Anda belum memiliki playlist kustom. Buat dengan `/playlist create`!", ephemeral=True)

        embed = discord.Embed(title=f"📁 Koleksi Playlist Kustom ({len(playlists)})", color=discord.Color.green())
        for p in playlists:
            embed.add_field(name=f"🎵 {p['name']}", value=f"Total: {p.get('song_count', 0)} lagu", inline=True)
        embed.set_footer(text="Gunakan /playlist play <nama> untuk memutar playlist")
        await interaction.response.send_message(embed=embed, ephemeral=True)

    @app_commands.command(name="play", description="Putar seluruh lagu dari playlist kustom Anda ke dalam antrean")
    @app_commands.describe(name="Nama playlist yang ingin diputar")
    async def play_playlist(self, interaction: discord.Interaction, name: str):
        user_id = str(interaction.user.id)
        playlists = await db.get_user_playlists(user_id)
        matched = next((p for p in playlists if p["name"].lower() == name.lower()), None)
        if not matched:
            return await interaction.response.send_message(f"❌ Playlist **{name}** tidak ditemukan.", ephemeral=True)

        songs = await db.get_playlist_songs(matched["id"], user_id=user_id)
        if not songs:
            return await interaction.response.send_message(f"⚠️ Playlist **{matched['name']}** masih kosong. Tambahkan lagu dengan `/playlist add`.", ephemeral=True)

        manager = self.get_manager()
        voice_client = await manager.ensure_voice(interaction)
        if not voice_client:
            return await interaction.response.send_message("❌ Anda harus berada di voice channel terlebih dahulu!", ephemeral=True)

        state = manager.get_guild_state(interaction.guild_id)
        for s in songs:
            state.add(Song(s, interaction.user))

        await interaction.response.send_message(f"🎶 Berhasil memuat **{len(songs)}** lagu dari playlist **{matched['name']}** ke antrean!")
        if not voice_client.is_playing() and not voice_client.is_paused():
            safe_channel = manager.get_safe_text_channel(interaction.guild, interaction.channel)
            manager.play_next(interaction.guild, safe_channel)

async def setup(bot: commands.Bot):
    await bot.add_cog(PlaylistCommand(bot))
