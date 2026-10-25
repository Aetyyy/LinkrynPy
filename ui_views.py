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
        if not voice_client or not (voice_client.is_playing() or voice_client.is_paused()):
            return await interaction.response.send_message("❌ Tidak ada lagu untuk di-skip.", ephemeral=True)

        if not interaction.user.voice or interaction.user.voice.channel != voice_client.channel:
            return await interaction.response.send_message("❌ Kamu harus berada di voice channel yang sama dengan bot untuk melakukan skip.", ephemeral=True)

        cog = self.get_cog()
        state = cog.get_guild_state(interaction.guild_id)
        can_skip, reason = state.has_skip_permission(interaction.user, voice_client)
        if can_skip:
            voice_client.stop()
            return await interaction.response.send_message(f"⏭️ **{interaction.user.display_name}** melewati lagu (`{reason}`).")

        listeners = [m for m in voice_client.channel.members if not m.bot]
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
        total_items = len(state.queue)
        total_pages = max(1, (total_items + per_page - 1) // per_page)
        self.page = max(1, min(self.page, total_pages))

        # Update button state (disable boundary buttons)
        if len(self.children) >= 2:
            self.children[0].disabled = (self.page <= 1)
            self.children[1].disabled = (self.page >= total_pages)

        start_idx = (self.page - 1) * per_page
        end_idx = start_idx + per_page

        embed = discord.Embed(title="📜 Antrean Musik Server", color=discord.Color.purple())

        current_info = ""
        if state.current:
            elapsed, bar = state.current.get_progress()
            req_mention = state.current.requester.mention if hasattr(state.current.requester, 'mention') else 'User'
            current_info = (
                f"🎶 **Sedang Diputar:**\n"
                f"[{state.current.title}]({state.current.url})\n"
                f"`{bar}` `{state.current.format_duration(elapsed)} / {state.current.format_duration()}` (oleh {req_mention})\n\n"
            )

        queue_list = list(state.queue)[start_idx:end_idx]
        if queue_list:
            desc = "**Daftar Antrean:**\n"
            for i, s in enumerate(queue_list, start=start_idx + 1):
                clean_t = s.title
                if len(clean_t) > 55:
                    clean_t = clean_t[:52] + "..."
                req_disp = s.requester.display_name if hasattr(s.requester, 'display_name') else 'User'
                desc += f"`{i}.` [{clean_t}]({s.url}) | `{s.format_duration()}` (oleh {req_disp})\n"
        else:
            desc = "**Daftar Antrean:**\n*Tidak ada lagu berikutnya di antrean.*"

        # Pakai embed.description (batas 4096 char) bukan add_field (batas 1024 char) agar tidak pernah 400 Bad Request
        embed.description = (current_info + desc)[:4000]
        embed.set_footer(text=f"Halaman {self.page}/{total_pages} | Total: {total_items} lagu | Loop: {state.loop_mode.upper()}")
        return embed

    @discord.ui.button(emoji="⬅️", style=discord.ButtonStyle.secondary)
    async def prev_page(self, interaction: discord.Interaction, button: discord.ui.Button):
        if self.page > 1:
            self.page -= 1
        embed = self.get_embed()
        await interaction.response.edit_message(embed=embed, view=self)

    @discord.ui.button(emoji="➡️", style=discord.ButtonStyle.secondary)
    async def next_page(self, interaction: discord.Interaction, button: discord.ui.Button):
        state = self.cog.get_guild_state(self.guild_id)
        total_pages = max(1, (len(state.queue) + 9) // 10)
        if self.page < total_pages:
            self.page += 1
        embed = self.get_embed()
        await interaction.response.edit_message(embed=embed, view=self)

class SkipApprovalView(discord.ui.View):
    def __init__(self, bot: commands.Bot, guild_id: int, requester: discord.Member, required_votes: int):
        super().__init__(timeout=60)
        self.bot = bot
        self.guild_id = guild_id
        self.requester = requester
        self.required_votes = required_votes
        self.votes: set[int] = set()

    def get_cog(self):
        return self.bot.get_cog("MusicManager") or self.bot.get_cog("Music")

    @discord.ui.button(label="Setujui Skip (Pemilik / Admin)", emoji="✅", style=discord.ButtonStyle.success)
    async def approve(self, interaction: discord.Interaction, button: discord.ui.Button):
        guild = interaction.guild
        vc = guild.voice_client
        if not vc or not (vc.is_playing() or vc.is_paused()):
            return await interaction.response.send_message("❌ Lagu sudah tidak aktif diputar.", ephemeral=True)

        cog = self.get_cog()
        state = cog.get_guild_state(guild.id)
        can_approve, reason = state.has_skip_permission(interaction.user, vc)
        if not can_approve:
            return await interaction.response.send_message("❌ Hanya pemilik lagu utama, pemutar sesi, atau Admin/DJ yang dapat langsung menyetujui skip.", ephemeral=True)

        vc.stop()
        self.stop()
        await interaction.response.edit_message(
            content=f"✅ Permintaan skip disetujui oleh **{interaction.user.display_name}** ({reason})! Melewati lagu...",
            embed=None,
            view=None
        )

    @discord.ui.button(label="Vote Skip (0)", emoji="🗳️", style=discord.ButtonStyle.primary)
    async def vote(self, interaction: discord.Interaction, button: discord.ui.Button):
        guild = interaction.guild
        vc = guild.voice_client
        if not vc or not (vc.is_playing() or vc.is_paused()):
            return await interaction.response.send_message("❌ Lagu sudah tidak aktif diputar.", ephemeral=True)

        if not interaction.user.voice or interaction.user.voice.channel != vc.channel:
            return await interaction.response.send_message("❌ Kamu harus berada di voice channel yang sama untuk memberikan vote.", ephemeral=True)

        if interaction.user.id in self.votes:
            return await interaction.response.send_message("⚠️ Kamu sudah memberikan vote sebelumnya.", ephemeral=True)

        self.votes.add(interaction.user.id)
        button.label = f"Vote Skip ({len(self.votes)}/{self.required_votes})"

        if len(self.votes) >= self.required_votes:
            vc.stop()
            self.stop()
            await interaction.response.edit_message(
                content=f"🗳️ Voting skip tercapai (**{len(self.votes)}/{self.required_votes}** suara)! Melewati lagu...",
                embed=None,
                view=None
            )
        else:
            await interaction.response.edit_message(view=self)
