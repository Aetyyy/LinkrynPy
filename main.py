import asyncio
import os
import sys
import glob
import discord
from discord.ext import commands
from dotenv import load_dotenv

# Muat environment variable dari .env
load_dotenv()

TOKEN = os.getenv("DISCORD_TOKEN")
PREFIX = os.getenv("COMMAND_PREFIX", "!")

# Konfigurasi Intents Discord
intents = discord.Intents.default()
intents.message_content = True  # Diperlukan untuk on_message event embed tracker
intents.voice_states = True     # Diperlukan untuk mendeteksi event voice channel

class MusicBot(commands.Bot):
    def __init__(self):
        super().__init__(command_prefix=PREFIX, intents=intents, help_command=None)

    async def setup_hook(self):
        # 1. Load MusicManager core engine
        await self.load_extension("music_manager")
        print("📦 Core Engine 'music_manager' berhasil dimuat.")

        # 2. Load semua modular command cogs (1 perintah 1 file)
        command_categories = ["playback", "queue", "filters", "general"]
        total_loaded = 0
        
        for category in command_categories:
            cat_dir = os.path.join(os.path.dirname(__file__), "commands", category)
            if not os.path.isdir(cat_dir):
                continue
            for file in os.listdir(cat_dir):
                if file.endswith(".py") and not file.startswith("__"):
                    module_name = f"commands.{category}.{file[:-3]}"
                    try:
                        await self.load_extension(module_name)
                        total_loaded += 1
                    except Exception as e:
                        print(f"⚠️ Gagal memuat command '{module_name}': {e}")

        print(f"✨ Berhasil memuat {total_loaded} modular command cogs.")

        # 3. Sinkronkan Slash Command secara global
        print("🔄 Mendaftarkan Slash Commands ke Discord...")
        try:
            synced = await self.tree.sync()
            print(f"✨ Berhasil menyinkronkan {len(synced)} slash commands secara global!")
        except Exception as e:
            print(f"⚠️ Gagal menyinkronkan slash commands: {e}")

bot = MusicBot()

@bot.event
async def on_command_error(ctx: commands.Context, error: Exception):
    import traceback
    print(f"\n[Command Error in '{ctx.command}']: {error}")
    traceback.print_exception(type(error), error, error.__traceback__)
    if isinstance(error, commands.CommandNotFound):
        return
    try:
        await ctx.reply(f"❌ Terjadi kesalahan pada perintah: `{error}`")
    except Exception:
        pass

@bot.tree.error
async def on_app_command_error(interaction: discord.Interaction, error: discord.app_commands.AppCommandError):
    import traceback
    print(f"\n[Slash Command Error]: {error}")
    traceback.print_exception(type(error), error, error.__traceback__)
    try:
        if interaction.response.is_done():
            await interaction.followup.send(f"❌ Terjadi kesalahan: `{error}`", ephemeral=True)
        else:
            await interaction.response.send_message(f"❌ Terjadi kesalahan: `{error}`", ephemeral=True)
    except Exception:
        pass

@bot.event
async def on_ready():
    print("=" * 50)
    print(f"✅ Bot berhasil login sebagai: {bot.user.name} (ID: {bot.user.id})")
    print(f"Prefix perintah teks: {PREFIX}")
    print("=" * 50)

    activity = discord.Activity(
        type=discord.ActivityType.listening, 
        name="/play | /help"
    )
    await bot.change_presence(status=discord.Status.online, activity=activity)

async def main():
    if not TOKEN or TOKEN == "MASUKKAN_TOKEN_BOT_DISCORD_ANDA_DI_SINI":
        print("\n" + "!" * 60)
        print("PERINGATAN: DISCORD_TOKEN belum diatur!")
        print("Silakan buka file .env dan masukkan token bot Discord Anda.")
        print("!" * 60 + "\n")

    async with bot:
        if TOKEN and TOKEN != "MASUKKAN_TOKEN_BOT_DISCORD_ANDA_DI_SINI":
            await bot.start(TOKEN)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nBot dimatikan oleh pengguna.")
