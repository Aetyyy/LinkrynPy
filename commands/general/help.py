import discord
from discord import app_commands
from discord.ext import commands

class HelpCommand(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(name="help", description="Lihat daftar lengkap perintah slash bot musik Linkryn.")
    async def help(self, interaction: discord.Interaction):
        embed = discord.Embed(
            title="📖 Daftar Perintah Bot Musik Linkryn",
            description="Semua perintah menggunakan format Slash Command (`/`). Berikut panduannya:",
            color=discord.Color.blurple()
        )
        embed.add_field(
            name="🎵 Playback",
            value=(
                "`/play` - Putar musik dari YouTube/Spotify/link\n"
                "`/playnext` - Sisipkan lagu di urutan teratas antrean\n"
                "`/search` - Cari 5 opsi lagu dan pilih dengan tombol\n"
                "`/pause` / `/resume` - Jeda atau lanjutkan pemutaran\n"
                "`/skip` / `/voteskip` - Lewati lagu yang sedang diputar\n"
                "`/stop` - Hentikan musik dan hapus antrean\n"
                "`/autoplay` - Putar lagu otomatis sesuai genre yang sama"
            ),
            inline=False
        )
        embed.add_field(
            name="📜 Queue & History",
            value=(
                "`/nowplaying` - Tampilkan info lagu saat ini\n"
                "`/queue` - Tampilkan daftar antrean lagu\n"
                "`/loop` - Atur pengulangan (off / single / all)\n"
                "`/shuffle` - Acak susunan antrean lagu\n"
                "`/remove` - Hapus lagu tertentu dari antrean\n"
                "`/skipto` - Lompat langsung ke nomor antrean tertentu\n"
                "`/clear` - Bersihkan seluruh antrean\n"
                "`/history` - Tampilkan riwayat lagu yang telah diputar\n"
                "`/replay` - Putar ulang lagu terakhir di riwayat"
            ),
            inline=False
        )
        embed.add_field(
            name="🎛️ Filter & Equalizer Audio",
            value=(
                "`/bassboost` - Atur kekuatan bassboost\n"
                "`/equalizer` - Pilih preset EQ (pop, rock, electronic, dll)\n"
                "`/nightcore` - Efek nightcore pitch & speed\n"
                "`/vaporwave` - Efek slowed & chill\n"
                "`/treble` - Atur penguatan vokal & treble\n"
                "`/karaoke` - Redam vokal untuk berkaraoke\n"
                "`/speed` - Atur kecepatan tempo lagu (0.5x - 2.0x)\n"
                "`/seek` - Lompat ke detik/menit tertentu secara instan\n"
                "`/volume` - Atur volume pemutaran musik\n"
                "`/resetfilters` - Reset semua efek ke kondisi normal"
            ),
            inline=False
        )
        embed.add_field(
            name="⚙️ Utilitas & Voice",
            value=(
                "`/join` - Sambungkan bot ke voice channel\n"
                "`/leave` - Putuskan bot dari voice channel\n"
                "`/lyrics` - Cari lirik lagu otomatis\n"
                "`/ping` - Cek latensi bot"
            ),
            inline=False
        )
        embed.set_footer(text="Linkryn Music Bot • 1 Perintah 1 File Architecture")
        await interaction.response.send_message(embed=embed)

async def setup(bot: commands.Bot):
    await bot.add_cog(HelpCommand(bot))
