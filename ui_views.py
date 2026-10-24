import discord
from discord import app_commands
from discord.ext import commands

class MusicControlView(discord.ui.View):
    """
    Panel kontrol interaktif lengkap di bawah pesan lagu.
    """
    def __init__(self, bot: commands.Bot, guild_id: int):
        super().__init__(timeout=None)
        self.bot = bot
        self.guild_id = guild_id

    def get_cog(self):
        return self.bot.get_cog("MusicManager") or self.bot.get_cog("Music")

    # BARIS 1: Kontrol Playback Utama
    @discord.ui.button(emoji="⏮️", style=discord.ButtonStyle.secondary, row=0)
    async def restart_song(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Putar ulang dari detik ke-0"""
        cog = self.get_cog()
        state = cog.get_guild_state(interaction.guild_id)
        if not state.current:
            return await interaction.response.send_message("❌ Tidak ada lagu yang sedang diputar.", ephemeral=True)
        await interaction.response.send_message("⏮️ Mengulang lagu dari awal...", ephemeral=True)
        await cog.apply_filter_realtime(interaction.guild, interaction.channel, seek_to=0)

    @discord.ui.button(emoji="⏪", style=discord.ButtonStyle.secondary, row=0)
    async def rewind_15s(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Mundur 15 detik"""
        cog = self.get_cog()
        state = cog.get_guild_state(interaction.guild_id)
        if not state.current:
            return await interaction.response.send_message("❌ Tidak ada lagu yang sedang diputar.", ephemeral=True)
        elapsed, _ = state.current.get_progress()
        new_pos = max(0, elapsed - 15)
        await interaction.response.send_message(f"⏪ Mundur 15 detik ke `{state.current.format_duration(new_pos)}`", ephemeral=True)
        await cog.apply_filter_realtime(interaction.guild, interaction.channel, seek_to=new_pos)

    @discord.ui.button(label="Pause/Resume", emoji="⏯️", style=discord.ButtonStyle.primary, row=0)
    async def toggle_play(self, interaction: discord.Interaction, button: discord.ui.Button):
        voice_client = interaction.guild.voice_client
        if not voice_client:
            return await interaction.response.send_message("Bot sedang tidak terhubung di voice channel.", ephemeral=True)

        if voice_client.is_playing():
            voice_client.pause()
            await interaction.response.send_message("⏸️ Musik dijeda.", ephemeral=True)
        elif voice_client.is_paused():
            voice_client.resume()
            await interaction.response.send_message("▶️ Musik dilanjutkan kembali.", ephemeral=True)
        else:
            return await interaction.response.send_message("Tidak ada lagu yang sedang aktif.", ephemeral=True)
        
        # Perbarui embed kartu musik secara langsung
        cog = self.get_cog()
        await cog.update_nowplaying_card(interaction.guild, interaction.channel)

    @discord.ui.button(emoji="⏩", style=discord.ButtonStyle.secondary, row=0)
    async def forward_15s(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Maju 15 detik"""
        cog = self.get_cog()
        state = cog.get_guild_state(interaction.guild_id)
        if not state.current:
            return await interaction.response.send_message("❌ Tidak ada lagu yang sedang diputar.", ephemeral=True)
        elapsed, _ = state.current.get_progress()
        new_pos = elapsed + 15
        if state.current.duration and new_pos >= state.current.duration:
            return await interaction.response.send_message("❌ Tidak bisa maju melebihi durasi lagu.", ephemeral=True)
        await interaction.response.send_message(f"⏩ Maju 15 detik ke `{state.current.format_duration(new_pos)}`", ephemeral=True)
        await cog.apply_filter_realtime(interaction.guild, interaction.channel, seek_to=new_pos)

    @discord.ui.button(label="Skip", emoji="⏭️", style=discord.ButtonStyle.secondary, row=0)
    async def skip(self, interaction: discord.Interaction, button: discord.ui.Button):
        voice_client = interaction.guild.voice_client
        if not voice_client or not voice_client.is_playing():
            return await interaction.response.send_message("Tidak ada lagu untuk di-skip.", ephemeral=True)
        voice_client.stop()
        await interaction.response.send_message("⏭️ Melewati lagu...", ephemeral=True)

    # BARIS 2: Volume & Utilitas Pemutaran
    @discord.ui.button(emoji="🔉", style=discord.ButtonStyle.secondary, row=1)
    async def vol_down(self, interaction: discord.Interaction, button: discord.ui.Button):
        cog = self.get_cog()
        state = cog.get_guild_state(interaction.guild_id)
        vc = interaction.guild.voice_client
        new_vol = max(0, int(state.volume * 100) - 10)
        state.volume = new_vol / 100.0
        if vc and vc.source and isinstance(vc.source, discord.PCMVolumeTransformer):
            vc.source.volume = state.volume
        await interaction.response.send_message(f"🔉 Volume diturunkan ke **{new_vol}%**", ephemeral=True)

    @discord.ui.button(emoji="🔊", style=discord.ButtonStyle.secondary, row=1)
    async def vol_up(self, interaction: discord.Interaction, button: discord.ui.Button):
        cog = self.get_cog()
        state = cog.get_guild_state(interaction.guild_id)
        vc = interaction.guild.voice_client
        new_vol = min(150, int(state.volume * 100) + 10)
        state.volume = new_vol / 100.0
        if vc and vc.source and isinstance(vc.source, discord.PCMVolumeTransformer):
            vc.source.volume = state.volume
        await interaction.response.send_message(f"🔊 Volume dinaikkan ke **{new_vol}%**", ephemeral=True)

    @discord.ui.button(label="Loop", emoji="🔁", style=discord.ButtonStyle.secondary, row=1)
    async def cycle_loop(self, interaction: discord.Interaction, button: discord.ui.Button):
        cog = self.get_cog()
        state = cog.get_guild_state(interaction.guild_id)
        modes = ["off", "track", "queue"]
        current_idx = modes.index(state.loop_mode)
        next_mode = modes[(current_idx + 1) % len(modes)]
        state.loop_mode = next_mode
        await interaction.response.send_message(f"🔁 Mode loop diatur ke: **{state.loop_mode.upper()}**", ephemeral=True)
        await cog.update_nowplaying_card(interaction.guild, interaction.channel)

    @discord.ui.button(label="Shuffle", emoji="🔀", style=discord.ButtonStyle.secondary, row=1)
    async def shuffle_queue(self, interaction: discord.Interaction, button: discord.ui.Button):
        cog = self.get_cog()
        state = cog.get_guild_state(interaction.guild_id)
        if len(state.queue) < 2:
            return await interaction.response.send_message("❌ Butuh minimal 2 lagu di antrean untuk shuffle.", ephemeral=True)
        state.shuffle()
        await interaction.response.send_message("🔀 Antrean lagu berhasil diacak!", ephemeral=True)

    @discord.ui.button(label="Stop", emoji="⏹️", style=discord.ButtonStyle.danger, row=1)
    async def stop(self, interaction: discord.Interaction, button: discord.ui.Button):
        voice_client = interaction.guild.voice_client
        if not voice_client:
            return await interaction.response.send_message("Bot tidak ada di voice channel.", ephemeral=True)
        cog = self.get_cog()
        state = cog.get_guild_state(interaction.guild_id)
        if state.last_nowplaying_msg:
            try:
                await state.last_nowplaying_msg.delete()
            except Exception:
                pass
            state.last_nowplaying_msg = None
        state.clear()
        state.current = None
        voice_client.stop()
        await voice_client.disconnect()
        await interaction.response.send_message("⏹️ Musik dihentikan dan antrean dibersihkan.", ephemeral=True)

    # BARIS 3: Efek Cepat, Antrean & Lirik
    @discord.ui.button(label="Bass", emoji="💣", style=discord.ButtonStyle.secondary, row=2)
    async def cycle_bass(self, interaction: discord.Interaction, button: discord.ui.Button):
        cog = self.get_cog()
        state = cog.get_guild_state(interaction.guild_id)
        order = ["off", "low", "medium", "high"]
        curr_idx = order.index(state.bass_boost)
        state.bass_boost = order[(curr_idx + 1) % len(order)]
        await interaction.response.send_message(f"💣 Bass Boost diubah ke: **{state.bass_boost.upper()}** (Menerapkan langsung...)", ephemeral=True)
        await cog.apply_filter_realtime(interaction.guild, interaction.channel)

    @discord.ui.button(label="Nightcore", emoji="🌙", style=discord.ButtonStyle.secondary, row=2)
    async def toggle_nightcore(self, interaction: discord.Interaction, button: discord.ui.Button):
        cog = self.get_cog()
        state = cog.get_guild_state(interaction.guild_id)
        state.nightcore = not state.nightcore
        if state.nightcore:
            state.vaporwave = False
        status_str = "AKTIF 🌙" if state.nightcore else "NONAKTIF ☀️"
        await interaction.response.send_message(f"🎛️ Nightcore sekarang: **{status_str}** (Menerapkan langsung...)", ephemeral=True)
        await cog.apply_filter_realtime(interaction.guild, interaction.channel)

    @discord.ui.button(label="Queue", emoji="📜", style=discord.ButtonStyle.secondary, row=2)
    async def show_queue(self, interaction: discord.Interaction, button: discord.ui.Button):
        cog = self.get_cog()
        state = cog.get_guild_state(interaction.guild_id)
        if not state.current and not state.queue:
            return await interaction.response.send_message("Antrean lagu kosong.", ephemeral=True)
        view = QueuePageView(cog, interaction.guild_id, current_page=1)
        await interaction.response.send_message(embed=view.get_embed(), view=view, ephemeral=True)

    @discord.ui.button(label="Autoplay", emoji="📻", style=discord.ButtonStyle.secondary, row=2)
    async def toggle_autoplay(self, interaction: discord.Interaction, button: discord.ui.Button):
        cog = self.get_cog()
        state = cog.get_guild_state(interaction.guild_id)
        state.autoplay = not state.autoplay
        status_text = "AKTIF 📻" if state.autoplay else "NONAKTIF 📴"
        await interaction.response.send_message(f"📻 Autoplay sekarang: **{status_text}**", ephemeral=True)
        await cog.update_nowplaying_card(interaction.guild, interaction.channel)

    @discord.ui.button(label="Lirik", emoji="🎤", style=discord.ButtonStyle.secondary, row=2)
    async def show_lyrics(self, interaction: discord.Interaction, button: discord.ui.Button):
        cog = self.get_cog()
        state = cog.get_guild_state(interaction.guild_id)
        if not state.current:
            return await interaction.response.send_message("❌ Tidak ada lagu yang sedang diputar.", ephemeral=True)
        await interaction.response.defer(ephemeral=True)
        embed = await cog.fetch_lyrics_embed(state.current)
        await interaction.followup.send(embed=embed, ephemeral=True)


class SongSelect(discord.ui.Select):
    """Dropdown pilihan lagu dari hasil pencarian /search"""
    def __init__(self, entries: list[dict], requester: discord.Member, cog):
        self.entries = entries
        self.requester = requester
        self.cog = cog
        
        options = []
        for i, entry in enumerate(entries[:10]):
            title = entry.get('title', 'Unknown Title')[:95]
            duration = int(entry.get('duration', 0))
            mins, secs = divmod(duration, 60)
            dur_str = f"{mins}:{secs:02d}" if duration else "Live"
            options.append(discord.SelectOption(
                label=f"{i+1}. {title}",
                value=str(i),
                description=f"Durasi: {dur_str} | {entry.get('uploader', 'Artis')[:40]}"
            ))

        super().__init__(placeholder="🎵 Pilih lagu yang ingin kamu putar...", options=options)

    async def callback(self, interaction: discord.Interaction):
        if interaction.user.id != self.requester.id:
            return await interaction.response.send_message("❌ Hanya orang yang melakukan pencarian yang dapat memilih lagu ini.", ephemeral=True)

        selected_idx = int(self.values[0])
        entry = self.entries[selected_idx]
        from music_queue import Song
        song = Song(entry, self.requester)
        
        state = self.cog.get_guild_state(interaction.guild_id)
        state.add(song)
        cat, kws = self.cog.detect_genre_keywords(song.title, song.uploader)
        state.preferred_genre_category = cat
        state.preferred_genre_keywords = kws
        state.prefetched_autoplay_song = None
        
        voice_client = await self.cog.ensure_voice(interaction)
        if not voice_client:
            return await interaction.response.send_message("❌ Kamu harus berada di voice channel terlebih dahulu!", ephemeral=True)

        await interaction.response.send_message(f"✅ **{song.title}** berhasil ditambahkan ke dalam antrean!")
        
        if not voice_client.is_playing() and not voice_client.is_paused():
            self.cog.play_next(interaction.guild, interaction.channel)


class SongSearchView(discord.ui.View):
    def __init__(self, entries: list[dict], requester: discord.Member, cog):
        super().__init__(timeout=60)
        self.add_item(SongSelect(entries, requester, cog))


class QueuePageView(discord.ui.View):
    """Paginasi tombol panah untuk /queue"""
    def __init__(self, cog, guild_id: int, current_page: int = 1):
        super().__init__(timeout=120)
        self.cog = cog
        self.guild_id = guild_id
        self.page = current_page

    def get_embed(self) -> discord.Embed:
        state = self.cog.get_guild_state(self.guild_id)
        per_page = 10
        total_pages = max(1, (len(state.queue) + per_page - 1) // per_page)
        self.page = max(1, min(self.page, total_pages))
        start_idx = (self.page - 1) * per_page
        end_idx = start_idx + per_page

        embed = discord.Embed(title="📜 Antrean Musik Server", color=discord.Color.purple())

        if state.current:
            elapsed, bar = state.current.get_progress()
            embed.add_field(
                name="🎶 Sedang Diputar",
                value=f"[{state.current.title}]({state.current.url})\n`{bar}` `{state.current.format_duration(elapsed)} / {state.current.format_duration()}` (oleh {state.current.requester.mention})",
                inline=False
            )

        queue_list = list(state.queue)[start_idx:end_idx]
        if queue_list:
            desc = ""
            for i, s in enumerate(queue_list, start=start_idx + 1):
                desc += f"**{i}.** [{s.title}]({s.url}) | `{s.format_duration()}` (oleh {s.requester.display_name})\n"
            embed.add_field(name="Daftar Antrean", value=desc, inline=False)
        else:
            embed.add_field(name="Daftar Antrean", value="*Tidak ada lagu berikutnya.*", inline=False)

        embed.set_footer(text=f"Halaman {self.page}/{total_pages} | Total: {len(state.queue)} lagu | Loop: {state.loop_mode.upper()}")
        return embed

    @discord.ui.button(emoji="⬅️", style=discord.ButtonStyle.secondary)
    async def prev_page(self, interaction: discord.Interaction, button: discord.ui.Button):
        if self.page > 1:
            self.page -= 1
        await interaction.response.edit_message(embed=self.get_embed(), view=self)

    @discord.ui.button(emoji="➡️", style=discord.ButtonStyle.secondary)
    async def next_page(self, interaction: discord.Interaction, button: discord.ui.Button):
        state = self.cog.get_guild_state(self.guild_id)
        total_pages = max(1, (len(state.queue) + 9) // 10)
        if self.page < total_pages:
            self.page += 1
        await interaction.response.edit_message(embed=self.get_embed(), view=self)
