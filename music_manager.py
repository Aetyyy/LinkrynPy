import asyncio
import time
import urllib.parse
import aiohttp
import discord
from discord.ext import commands

from audio_source import YTDLSource, build_ffmpeg_options, FFMPEG_EXECUTABLE
from music_queue import MusicQueue, Song
from ui_views import MusicControlView

class MusicManager(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.states: dict[int, MusicQueue] = {}

    def get_guild_state(self, guild_id: int) -> MusicQueue:
        if guild_id not in self.states:
            self.states[guild_id] = MusicQueue()
        return self.states[guild_id]

    async def ensure_voice(self, interaction: discord.Interaction) -> discord.VoiceClient | None:
        user = interaction.user
        guild = interaction.guild

        if not user.voice or not user.voice.channel:
            return None

        target_channel = user.voice.channel
        voice_client = guild.voice_client

        if voice_client is None:
            voice_client = await target_channel.connect()
        elif voice_client.channel != target_channel:
            await voice_client.move_to(target_channel)

        return voice_client

    # ==========================
    # VOICE STATE LISTENER (AUTO-LEAVE JIKA VOICE SEPI)
    # ==========================
    @commands.Cog.listener()
    async def on_voice_state_update(self, member: discord.Member, before: discord.VoiceState, after: discord.VoiceState):
        guild = member.guild
        vc = guild.voice_client
        if not vc or not vc.channel:
            return

        if before.channel == vc.channel:
            non_bot_members = [m for m in vc.channel.members if not m.bot]
            if len(non_bot_members) == 0:
                state = self.get_guild_state(guild.id)
                if state.last_nowplaying_msg:
                    try:
                        await state.last_nowplaying_msg.delete()
                    except Exception:
                        pass
                    state.last_nowplaying_msg = None
                state.clear()
                state.current = None
                vc.stop()
                await vc.disconnect()
                print(f"[Auto-Leave] Bot keluar dari {guild.name} karena voice channel kosong.")

    # ==========================
    # MESSAGE LISTENER (HANYA PESAN USER YANG MEMINDAHKAN EMBED)
    # ==========================
    @commands.Cog.listener()
    async def on_message(self, message: discord.Message):
        # Mencegah loop/spam: abaikan pesan dari bot
        if message.author.bot or not message.guild:
            return

        state = self.get_guild_state(message.guild.id)
        if not state.current or not state.last_nowplaying_msg:
            return

        if message.id == state.last_nowplaying_msg.id:
            return

        if message.channel.id == state.last_nowplaying_msg.channel.id:
            old_msg = state.last_nowplaying_msg
            state.last_nowplaying_msg = None
            try:
                await old_msg.delete()
            except Exception:
                pass

            embed = self.create_nowplaying_embed(state, state.current)
            view = MusicControlView(self.bot, message.guild.id)
            new_msg = await message.channel.send(embed=embed, view=view)
            state.last_nowplaying_msg = new_msg

    # ==========================
    # UPDATE NOW PLAYING CARD (IN-PLACE EDIT)
    # ==========================
    async def update_nowplaying_card(self, guild: discord.Guild, text_channel: discord.abc.Messageable | None = None):
        state = self.get_guild_state(guild.id)
        if not state.current:
            return

        embed = self.create_nowplaying_embed(state, state.current)
        view = MusicControlView(self.bot, guild.id)

        if state.last_nowplaying_msg:
            try:
                await state.last_nowplaying_msg.edit(embed=embed, view=view)
                return
            except Exception:
                pass

        target_channel = text_channel or (state.last_nowplaying_msg.channel if state.last_nowplaying_msg else None)
        if target_channel:
            try:
                new_msg = await target_channel.send(embed=embed, view=view)
                state.last_nowplaying_msg = new_msg
            except Exception:
                pass

    async def apply_filter_realtime(self, guild: discord.Guild, text_channel: discord.abc.Messageable, seek_to: int | None = None):
        state = self.get_guild_state(guild.id)
        vc = guild.voice_client

        if not vc or not state.current:
            return

        if seek_to is None:
            elapsed, _ = state.current.get_progress()
            seek_seconds = elapsed
        else:
            seek_seconds = max(0, seek_to)

        state.is_restarting = True
        if vc.is_playing() or vc.is_paused():
            vc.stop()
            await asyncio.sleep(0.1)

        state.current.start_time = time.time() - seek_seconds

        try:
            webpage_or_url = state.current.url or state.current.data.get('url')
            stream_data = await YTDLSource.get_streamable_data(webpage_or_url, loop=self.bot.loop)
            audio_url = stream_data.get('url') if stream_data else None

            if not audio_url:
                await text_channel.send(f"❌ Gagal memuat ulang stream audio untuk **{state.current.title}**.")
                state.is_restarting = False
                self.play_next(guild, text_channel)
                return

            before_opts, filter_opts = build_ffmpeg_options(
                seek_seconds=seek_seconds,
                bass_boost=state.bass_boost,
                nightcore=state.nightcore,
                speed=state.speed,
                equalizer=state.equalizer,
                vaporwave=state.vaporwave,
                treble=state.treble,
                karaoke=state.karaoke
            )

            raw_source = discord.FFmpegPCMAudio(
                audio_url,
                executable=FFMPEG_EXECUTABLE,
                before_options=before_opts,
                options=filter_opts
            )
            source = discord.PCMVolumeTransformer(raw_source, volume=state.volume)

            def after_playback(error):
                if state.is_restarting:
                    return
                if error:
                    print(f"[Player Error] {error}")
                self.play_next(guild, text_channel)

            state.is_restarting = False
            if vc.is_playing():
                vc.stop()
                await asyncio.sleep(0.05)
            vc.play(source, after=after_playback)

            await self.update_nowplaying_card(guild, text_channel)

        except Exception as e:
            state.is_restarting = False
            print(f"[Apply Filter Error] {e}")
            await text_channel.send(f"❌ Terjadi kesalahan saat menerapkan filter: `{e}`")

    # ==========================
    # AUTOPLAY ENGINE
    # ==========================
    COMPILATION_PATTERNS = [
        r'\bfull\s+album\b',
        r'\bkompilasi\b',
        r'\bcompilation\b',
        r'\bkumpulan\s+lagu\b',
        r'\bgabungan\s+lagu\b',
        r'\bnon\s*stop\b',
        r'\bnonstop\b',
        r'\bmarathon\b',
        r'\bmegamix\b',
        r'\bmedley\b',
        r'\bmashup\b',
        r'\bplaylist\b',
        r'\bdiscography\b',
        r'\b\d+\s*(?:jam|hours?|hrs?)\b',
        r'\bberjam[\s-]*jam\b',
        r'\b\d{2,}\s*menit\b',
        r'\btop\s*\d{2,}\b',
        r'\bbest\s+of\b',
        r'\bpilihan\s+terbaik\b',
        r'\bterbaik\s+sepanjang\s+masa\b',
        r'\bpodcast\b',
        r'\btalk\s*show\b',
        r'\binterview\b',
        r'\bwawancara\b',
        r'\baudiobook\b',
        r'\breview\b',
        r'\breaction\b',
        r'\breaksi\b',
        r'\bbedah\s+lagu\b',
        r'\btutorial\b',
        r'\bchord\b',
        r'\bkunci\s+gitar\b',
        r'\bkaraoke\s+(?:tanpa\s+vokal|no\s+vocal|version)\b',
        r'\binstrumental\s+only\b'
    ]

    WESTERN_BLOCKED_ARTISTS = [
        "ed sheeran", "taylor swift", "billie eilish", "coldplay", "maroon 5", "bruno mars",
        "justin bieber", "adele", "ariana grande", "dua lipa", "the weeknd", "drake",
        "charlie puth", "shawn mendes", "post malone", "olivia rodrigo", "sabrina carpenter",
        "benson boone", "teddy swims", "shaboozey", "katy perry", "eminem", "rihanna",
        "imagine dragons", "onerepublic", "sam smith", "lewis capaldi", "avril lavigne",
        "rita ora", "aurora", "lady gaga", "selena gomez", "miley cyrus", "demi lovato",
        "harry styles", "one direction", "zayn", "sia", "halsey", "twenty one pilots",
        "linkin park", "green day", "queen", "oasis", "bon jovi", "guns n roses", "metallica",
        "nirvana", "red hot chili peppers", "fleetwood mac", "beatles", "michael jackson",
        "elvis", "whitney houston", "celine dion", "mariah carey", "alec benjamin", "conan gray",
        "lauv", "jeremy zucker", "keshi", "jvke", "stephen sanchez", "d4vd", "boywithuke",
        "chappell roan", "travis scott", "kanye", "kendrick", "sza", "doja cat", "cardi b",
        "megan thee stallion", "jack harlow", "marshmello", "alan walker", "chainsmokers",
        "avicii", "david guetta", "calvin harris", "bebe rexha", "camila cabello"
    ]

    @classmethod
    def is_indonesian_song(cls, title: str, uploader: str) -> bool:
        import re
        text = f"{title} {uploader}".lower()

        # Reject immediate western artist presence
        if any(w in text for w in cls.WESTERN_BLOCKED_ARTISTS):
            return False

        indo_artists = [
            "fiersa besari", "fiersa", "tulus", "mahalini", "tiara andini", "feby putri", "nadin amizah",
            "pamungkas", "raisa", "isyana sarasvati", "isyana", "afgan", "rossa", "anji", "armada", "virgoun",
            "peterpan", "ari lasso", "dewa 19", "sheila on 7", "payung teduh", "fourtwnty", "budi doremi",
            "raim laode", "idgitaf", "batas senja", "bernadya", "sal priadi", "juicy luicy", "ardhito pramono",
            "ardhito", "danilla riyadi", "danilla", "hindia", ".feast", "feast", "yovie", "kahitna",
            "glenn fredly", "kerispatih", "samsons", "padi reborn", "padi", "ungu", "wali", "kangen band",
            "d'masiv", "geisha", "kotak", "judika", "rizky febian", "noah", "felix irwan", "denny caknan",
            "happy asmara", "gilga sahid", "gilga", "lavora", "damara de", "damara", "guyon waton", "guyonwaton",
            "ndx aka", "ndx", "niken salindry", "difarina indra", "difarina", "shinta arsinta", "tri suaka",
            "zinidin zidan", "charly van houten", "setia band", "letto", "vierra", "vierratale", "naff",
            "seventeen", "last child", "repvblik", "papinka", "dadali", "hijau daun", "ada band", "yura yunita",
            "ghea indrawari", "dere", "keisya levronka", "ziva magnolya", "lyodra", "fabio asher", "stevan pasaribu",
            "soegi bornean", "jason ranti", "iksan skuter", "ebiet g ade", "chrisye", "iwan fals", "slank",
            "gigi", "jamrud", "tipex", "shaggydog", "the changcuters", "maliq & d'essentials", "maliq",
            "nadhif basalamah", "salma salsabil", "anggi marito", "awdella", "aruma", "fadhilah intan",
            "mario g klau", "chintya gabriella", "hanin dhiya", "tami aulia", "aviwkila", "daun jatuh",
            "masdddho", "hendra kumbara", "ilux", "wandra", "nella kharisma", "via vallen", "didi kempot",
            "om adella", "aneka safari", "ageng music", "new pallapa", "wawes", "aftershine", "esa risty",
            "wahyu f giri", "farel prayoga", "abah lala", "doel sumbang", "azmy z"
        ]
        if any(a in text for a in indo_artists):
            return True

        indo_keywords = [
            "lagu", "akustik", "indonesia", "indo", "lirik", "galau", "santai", 
            "viral", "terbaru", "terbaik", "senja", "cafe", "bucin", "cinta", "hati", 
            "rindu", "menunggu", "bersama", "kamu", "aku", "kita", "bukan", "hanya", 
            "jangan", "tak", "bisa", "tetap", "selalu", "sampai", "waktu", "jalan", 
            "pulang", "malam", "rasa", "kenangan", "sayang", "tembang", "nostalgia",
            "jawa", "koplo", "dangdut", "campursari", "nada", "suara", "jiwa", 
            "sahabat", "kekasih", "patah", "dini", "pagi", "kemarin", "esok", 
            "sendiri", "sepi", "hilang", "pergi", "kembali", "tanpa", "tentang",
            "sebuah", "antara", "saat", "menjadi", "tetaplah", "kau", "dunia", "luka",
            "bahagia", "ruang", "mimpi", "harap", "janji", "bayang", "berdua", "bersamamu",
            "hujan", "mentari", "bintang", "angin", "langit", "pelangi", "sembuh",
            "usai", "kisah", "sempurna", "pesan", "terakhir", "menghargai", "muak", "bohong",
            "sisa", "runtuh", "interaksi", "sepatu", "monokrom", "manusia", "kuat", "labirin",
            "berdamai", "mata", "teman", "kasmaran", "mantan", "terindah", "cantik", "andai",
            "tahu", "terganti", "kini", "mereka", "untungnya", "hidup", "berjalan", "kata",
            "berlebihan", "mungkin", "terlintas", "lama", "romantis", "aduh", "pilihan", "pilihanku",
            "dia", "himalaya", "teduh", "pelukan", "akad", "menuju", "resah", "perempuan",
            "zona", "nyaman", "fana", "merah", "jambu", "kusut", "hitam", "putih", "rumah",
            "evaluasi", "secukupnya", "tawa", "cerita", "komang", "penjaga", "dawai", "sialan",
            "tampar", "lantas", "terpikat", "senyummu", "belas", "ingkar", "adaptasi", "sebentar",
            "berpaling", "dianggap", "terluka", "melukis", "usik", "planet", "rayuan", "gila",
            "melawan", "takkan", "karna", "su", "bunga", "keisya", "levronka"
        ]

        # Use regex word boundaries for accurate token matching
        for kw in indo_keywords:
            if len(kw) <= 4:
                if re.search(r'\b' + re.escape(kw) + r'\b', text):
                    return True
            else:
                if kw in text:
                    return True

        return False

    @classmethod
    def detect_genre_keywords(cls, title: str, uploader: str) -> tuple[str, list[str]]:
        import re
        combined = f"{title} {uploader}".lower()
        
        jawa_indicators = [
            "nresnani", "lavora", "damara", "denny caknan", "happy asmara", "gilga", "ndx", 
            "guyon waton", "guyonwaton", "niken salindry", "shinta arsinta", "difarina", "koplo", "dangdut", 
            "campursari", "jawa", "jowo", "kendang", "om adella", "aneka safari", "ageng music", "new pallapa",
            "tatu", "sanes", "sanese", "bojo", "dumes", "wirang", "kisinan", "nemen", "klebus",
            "rasah bali", "cidro", "banyu moto", "los dol", "mendung tanpo udan", "rungkad",
            "lintang asmoro", "sepine wengi", "suket teki", "kartonyono", "pamer bojo",
            "nemu", "manot", "ginio", "lamunan", "kelingan mantan", "ditinggal rabi",
            "tewas tertimbun masa lalu", "kimcil kepolen", "bojoku galak", "jaran goyang",
            "ojo dibandingke", "mangku purel", "tepung kanji", "ngopi maszeh", "ikan dalam kolam",
            "cundamani", "sigar", "sekti", "pelanggaran", "alum", "kembang wangi", "gampil",
            "teteg ati", "kok iso yo", "iso tanpo kowe", "infone maszeh", "masdddho",
            "hendra kumbara", "ilux", "wandra", "nella kharisma", "via vallen", "didi kempot",
            "esa risty", "wahyu f giri", "farel prayoga", "abah lala", "aftershine", "wawes",
            "tresno", "langgeng dayaning rasa", "pambasilet", "ora iso", "dudu watu", "ora popo",
            "ajur mumur", "sak tenane", "atiku", "wong sepele", "pingal", "satru", "kalih welasku",
            "widodari", "sampek tuwek", "sugeng dalu", "titipane gusti", "tanpo tresnamu"
        ]
        if any(w in combined for w in jawa_indicators):
            return "jawa_koplo", [
                "lagu dangdut koplo jawa hits official music video",
                "lagu pop jawa terbaru hits single",
                "dangdut koplo viral official audio",
                "lagu campursari koplo hits single"
            ]

        indo_acoustic_artists = [
            "bernadya", "feby putri", "nadin amizah", "fiersa besari", "sal priadi",
            "fourtwnty", "payung teduh", "daun jatuh", "soegi bornean", "batas senja",
            "idgitaf", "danilla", "ardhito", "budi doremi", "raim laode", "nadhif basalamah",
            "felix irwan", "tami aulia", "aviwkila", "chintya gabriella", "mario g klau",
            "aruma", "fadhilah intan", "hal", "monita tahalea"
        ]
        is_acoustic_artist = any(a in combined for a in indo_acoustic_artists)
        acoustic_indicators = ["akustik", "acoustic", "fingerstyle", "petikan", "gitar akustik", "cafe santai", "akustik cafe"]
        is_acoustic = any(w in combined for w in acoustic_indicators)
        is_indo = cls.is_indonesian_song(title, uploader)

        if is_acoustic_artist or (is_acoustic and is_indo):
            return "akustik_indo", [
                "lagu pop akustik indonesia hits single",
                "lagu akustik indonesia official music video",
                "lagu indie folk indonesia official audio",
                "lagu senja akustik indonesia official video"
            ]

        if is_indo:
            return "pop_indo", [
                "lagu pop indonesia terpopuler official music video",
                "lagu pop indonesia hits terbaru official audio",
                "lagu galau indonesia hits single"
            ]

        jpop_indicators = [
            "yoasobi", "ado", "eve", "aimer", "lisa", "kessoku", "anime", "ost", "j-pop", "jpop",
            "vocaloid", "radwimps", "kenshi yonezu", "vaundy", "king gnu", "official hige dandism",
            "yuuri", "fujii kaze", "milet", "tuyu", "minami"
        ]
        if any(w in combined for w in jpop_indicators):
            return "jpop_anime", [
                "popular jpop anime songs official audio",
                "j-pop hits music official video",
                "japanese anime ost songs single"
            ]

        kpop_indicators = [
            "bts", "blackpink", "twice", "newjeans", "aespa", "stray kids", "kpop", "k-pop",
            "ive", "le sserafim", "seventeen", "enhypen", "exo", "itzy", "txt", "red velvet",
            "nct", "ateez", "gidle", "(g)i-dle", "babymonster", "illit", "riize"
        ]
        if any(w in combined for w in kpop_indicators):
            return "kpop", [
                "kpop hits songs official music video",
                "popular k-pop songs official audio"
            ]

        rock_indicators = [
            "linkin park", "metallica", "avenged", "slipknot", "queen", "oasis", "green day",
            "muse", "rock", "metal", "bon jovi", "guns n roses", "bring me the horizon",
            "paramore", "my chemical romance", "nirvana", "foo fighters", "system of a down"
        ]
        if any(w in combined for w in rock_indicators):
            return "rock_metal", [
                "rock hits official music video",
                "classic modern rock hits official audio"
            ]

        if is_acoustic:
            return "western_acoustic", [
                "acoustic pop hits official audio",
                "acoustic chill songs official music video"
            ]
        return "western_pop", [
            "pop hits songs official music video",
            "top radio pop hits official audio"
        ]

    async def fetch_autoplay_song(self, guild: discord.Guild, last_song: Song) -> Song | None:
        import re
        state = self.get_guild_state(guild.id)
        raw_title = last_song.title
        
        # Clean title
        clean_title = re.sub(r'[\(\[\{][^\)\]\}]*[\)\]\}]', '', raw_title)
        clean_title = re.sub(r'(?i)\b(official|video|music|audio|lyrics?|remastered|hd|4k|mv|feat\.?|ft\.?)\b', '', clean_title)
        clean_title = ' '.join(clean_title.split()).strip(' -')

        # Clean artist name - specifically remove Autoplay prefix/emojis
        clean_artist = re.sub(r'[\U00010000-\U0010ffff]|[\u2600-\u27ff]|autoplay|•', '', last_song.uploader, flags=re.IGNORECASE)
        clean_artist = re.sub(r'(?i)\b(topic|vevo|official|channel|records|music|audio|video|tv|entertainment|production)\b', '', clean_artist).strip(' -')

        if not state.preferred_genre_keywords or state.preferred_genre_category == "general":
            cat, kws = self.detect_genre_keywords(raw_title, last_song.uploader)
            state.preferred_genre_category = cat
            state.preferred_genre_keywords = kws

        category = state.preferred_genre_category

        search_terms = []
        if clean_artist:
            if category == "akustik_indo":
                search_terms.append(f"{clean_artist} official music video")
                search_terms.append(f"{clean_artist} official audio")
                search_terms.append(f"lagu seperti {clean_artist} single")
            elif category == "jawa_koplo":
                search_terms.append(f"{clean_artist} official music video")
                search_terms.append(f"{clean_artist} official audio")
                search_terms.append(f"lagu seperti {clean_artist} single")
            elif category == "pop_indo":
                search_terms.append(f"{clean_artist} official music video")
                search_terms.append(f"{clean_artist} official audio")
            elif category == "jpop_anime":
                search_terms.append(f"{clean_artist} official audio")
            elif category == "kpop":
                search_terms.append(f"{clean_artist} official music video")
            else:
                search_terms.append(f"{clean_artist} official music video")

        for g_kw in state.preferred_genre_keywords:
            search_terms.append(g_kw)

        # Genre-specific artist anchors to keep genre perfectly locked
        if category == "jawa_koplo":
            search_terms.extend([
                "Denny Caknan official music video",
                "Guyon Waton official video",
                "Gilga Sahid official music video",
                "Lavora official video",
                "Masdddho official music video"
            ])
        elif category == "akustik_indo":
            search_terms.extend([
                "Bernadya official music video",
                "Feby Putri official video",
                "Nadin Amizah official audio",
                "Sal Priadi official music video",
                "Fiersa Besari official audio"
            ])
        elif category == "pop_indo":
            search_terms.extend([
                "Tulus official music video",
                "Mahalini official music video",
                "Tiara Andini official music video",
                "Sheila on 7 official audio"
            ])

        current_title_lower = clean_title.lower()

        for query in search_terms:
            try:
                entries = await YTDLSource.extract_search_list(query, max_results=10, loop=self.bot.loop)
                for entry in entries:
                    cand_title = entry.get('title', '')
                    cand_uploader = entry.get('uploader', '')
                    cand_lower = cand_title.lower().strip()
                    cand_full = f"{cand_lower} {cand_uploader.lower()}"
                    duration = entry.get('duration')

                    # 1. STRICT DURATION CHECK (75s s/d 630s = 1m15s s/d 10m30s)
                    # Automatically avoids 1-hour, 2-hour compilations and livestreams!
                    if not duration or duration < 75 or duration > 630 or entry.get('is_live'):
                        continue

                    # 2. TITLE COMPILATION & NON-SINGLE BLACKLIST
                    if any(re.search(pat, cand_lower) for pat in self.COMPILATION_PATTERNS):
                        continue

                    # 3. TITLE DUPLICATE CHECK
                    if current_title_lower in cand_lower or cand_lower in current_title_lower:
                        continue
                    if cand_lower in state.played_titles:
                        continue

                    # 4. STRICT GENRE VALIDATION
                    if category in ["akustik_indo", "jawa_koplo", "pop_indo"]:
                        if any(w in cand_full for w in self.WESTERN_BLOCKED_ARTISTS):
                            continue
                        
                        if not self.is_indonesian_song(cand_title, cand_uploader):
                            continue

                        if category == "jawa_koplo":
                            jawa_words = [
                                "jawa", "jowo", "koplo", "dangdut", "campursari", "lavora", "damara", "caknan",
                                "asmara", "gilga", "salindry", "safari", "adella", "kisinan", "dumes", "rasah",
                                "ora", "ati", "tresno", "sayang", "kembang", "lungo", "loro", "konco", "banyu",
                                "cidro", "bojo", "nemen", "klebus", "kartonyono", "wirang", "cundamani", "sigar",
                                "sekti", "pelanggaran", "alum", "gampil", "teteg", "masdddho", "wawes", "aftershine"
                            ]
                            # Word boundary match for short words
                            matched_jawa = False
                            for jw in jawa_words:
                                if len(jw) <= 4:
                                    if re.search(r'\b' + re.escape(jw) + r'\b', cand_full):
                                        matched_jawa = True
                                        break
                                else:
                                    if jw in cand_full:
                                        matched_jawa = True
                                        break
                            if not matched_jawa:
                                continue

                        if category == "akustik_indo":
                            indo_acoustic_artists = [
                                "bernadya", "feby putri", "nadin amizah", "fiersa besari", "sal priadi",
                                "fourtwnty", "payung teduh", "daun jatuh", "soegi bornean", "batas senja",
                                "idgitaf", "danilla", "ardhito", "budi doremi", "raim laode", "nadhif basalamah",
                                "felix irwan", "tami aulia", "aviwkila", "chintya gabriella", "mario g klau",
                                "aruma", "fadhilah intan", "hal"
                            ]
                            is_acoustic_artist = any(a in cand_full for a in indo_acoustic_artists)
                            acoustic_words = ["akustik", "acoustic", "santai", "cafe", "cover", "lirik", "pop", "senja", "folk", "indie"]
                            if not is_acoustic_artist and not any(aw in cand_full for aw in acoustic_words):
                                continue

                    elif category == "jpop_anime":
                        jpop_indicators = ["yoasobi", "ado", "eve", "aimer", "lisa", "kessoku", "anime", "ost", "j-pop", "jpop", "vocaloid", "radwimps", "kenshi yonezu", "vaundy", "japan", "japanese"]
                        if not any(jp in cand_full for jp in jpop_indicators):
                            continue

                    elif category == "kpop":
                        kpop_indicators = ["bts", "blackpink", "twice", "newjeans", "aespa", "stray kids", "kpop", "k-pop", "ive", "le sserafim", "seventeen", "enhypen", "exo", "itzy", "korean"]
                        if not any(kp in cand_full for kp in kpop_indicators):
                            continue

                    # 5. VALID CANDIDATE FOUND
                    dummy_requester = guild.me
                    recommended_song = Song(entry, dummy_requester)
                    recommended_song.is_autoplay = True
                    state.played_titles.add(cand_lower)
                    return recommended_song
            except Exception:
                continue

        return None

    def play_next(self, guild: discord.Guild, text_channel: discord.abc.Messageable):
        state = self.get_guild_state(guild.id)
        voice_client = guild.voice_client

        if not voice_client or not voice_client.is_connected():
            return

        if state.auto_leave_task and not state.auto_leave_task.done():
            state.auto_leave_task.cancel()
            state.auto_leave_task = None

        last_ended_song = state.current
        
        if len(state.queue) == 0 and state.autoplay and state.prefetched_autoplay_song:
            next_song = state.prefetched_autoplay_song
            state.prefetched_autoplay_song = None
            if state.current:
                state.history.append(state.current)
            state.current = next_song
            state.current.start_time = time.time()
            state.played_titles.add(state.current.title.lower().strip())
        else:
            next_song = state.next()

        if not next_song and state.autoplay and last_ended_song:
            async def handle_autoplay():
                auto_song = await self.fetch_autoplay_song(guild, last_ended_song)
                if auto_song:
                    state.add(auto_song)
                    self.play_next(guild, text_channel)
                else:
                    self._start_auto_leave(guild, text_channel)

            self.bot.loop.create_task(handle_autoplay())
            return

        if not next_song:
            self._start_auto_leave(guild, text_channel)
            return

        if state.autoplay:
            async def background_prefetch():
                if not state.prefetched_autoplay_song and len(state.queue) == 0:
                    state.prefetched_autoplay_song = await self.fetch_autoplay_song(guild, next_song)
            self.bot.loop.create_task(background_prefetch())

        async def _start_playing():
            try:
                webpage_or_url = next_song.url or next_song.data.get('url')
                stream_data = await YTDLSource.get_streamable_data(webpage_or_url, loop=self.bot.loop)
                audio_url = stream_data.get('url') if stream_data else None

                if not audio_url:
                    await text_channel.send(f"❌ Gagal mendapatkan stream audio untuk **{next_song.title}**.")
                    self.play_next(guild, text_channel)
                    return

                before_opts, filter_opts = build_ffmpeg_options(
                    seek_seconds=0,
                    bass_boost=state.bass_boost,
                    nightcore=state.nightcore,
                    speed=state.speed,
                    equalizer=state.equalizer,
                    vaporwave=state.vaporwave,
                    treble=state.treble,
                    karaoke=state.karaoke
                )

                raw_source = discord.FFmpegPCMAudio(
                    audio_url,
                    executable=FFMPEG_EXECUTABLE,
                    before_options=before_opts,
                    options=filter_opts
                )
                source = discord.PCMVolumeTransformer(raw_source, volume=state.volume)

                def after_playback(error):
                    if state.is_restarting:
                        return
                    if error:
                        print(f"[Player Error] {error}")
                    self.play_next(guild, text_channel)

                if voice_client.is_playing():
                    voice_client.stop()
                    await asyncio.sleep(0.05)
                voice_client.play(source, after=after_playback)

                if state.last_nowplaying_msg:
                    try:
                        await state.last_nowplaying_msg.delete()
                    except Exception:
                        pass
                    state.last_nowplaying_msg = None

                embed = self.create_nowplaying_embed(state, next_song)
                view = MusicControlView(self.bot, guild.id)
                msg = await text_channel.send(embed=embed, view=view)
                state.last_nowplaying_msg = msg

            except Exception as e:
                print(f"[Playback Exception] {e}")
                import traceback
                traceback.print_exc()
                await text_channel.send(f"❌ Terjadi kesalahan saat memutar lagu: `{e}`")
                self.play_next(guild, text_channel)

        self.bot.loop.create_task(_start_playing())

    def _start_auto_leave(self, guild: discord.Guild, text_channel: discord.abc.Messageable):
        state = self.get_guild_state(guild.id)
        voice_client = guild.voice_client

        async def auto_disconnect():
            embed = discord.Embed(
                description="🎵 Antrean lagu telah selesai. Bot akan otomatis keluar dalam **3 menit** jika tidak ada aktivitas.",
                color=discord.Color.light_grey()
            )
            await text_channel.send(embed=embed)
            await asyncio.sleep(180)
            if voice_client and voice_client.is_connected() and not voice_client.is_playing() and not state.queue:
                if state.last_nowplaying_msg:
                    try:
                        await state.last_nowplaying_msg.delete()
                    except Exception:
                        pass
                    state.last_nowplaying_msg = None
                await voice_client.disconnect()
                await text_channel.send("👋 Bot telah keluar dari voice channel karena tidak ada aktivitas.")

        state.auto_leave_task = self.bot.loop.create_task(auto_disconnect())

    def create_nowplaying_embed(self, state: MusicQueue, song: Song) -> discord.Embed:
        guild = song.requester.guild if hasattr(song.requester, 'guild') else None
        vc = guild.voice_client if guild else None
        status_symbol = "⏸️ Dijeda" if vc and vc.is_paused() else "▶️ Sedang Diputar"

        embed = discord.Embed(
            title=f"🎶 {status_symbol}",
            description=f"**[{song.title}]({song.url})**",
            color=discord.Color.green() if not (vc and vc.is_paused()) else discord.Color.orange()
        )
        elapsed, bar = song.get_progress()
        embed.add_field(name="Progress", value=f"`{bar}`\n`{song.format_duration(elapsed)} / {song.format_duration()}`", inline=False)
        artist_display = f"📻 Autoplay • {song.uploader}" if getattr(song, 'is_autoplay', False) else song.uploader
        embed.add_field(name="Artis / Channel", value=artist_display, inline=True)
        embed.add_field(name="Diminta oleh", value=song.requester.mention, inline=True)
        embed.add_field(name="Volume", value=f"{int(state.volume * 100)}%", inline=True)

        filters_active = []
        if state.bass_boost != "off":
            filters_active.append(f"Bass: {state.bass_boost.upper()}")
        if state.equalizer != "off":
            filters_active.append(f"EQ: {state.equalizer.upper()}")
        if state.nightcore:
            filters_active.append("Nightcore")
        if state.vaporwave:
            filters_active.append("Vaporwave")
        if state.treble != 0:
            filters_active.append(f"Treble: {state.treble:+d}dB")
        if state.karaoke:
            filters_active.append("Karaoke")
        if state.speed != 1.0:
            filters_active.append(f"{state.speed}x")

        filter_str = ", ".join(filters_active) if filters_active else "Normal"
        embed.add_field(name="Filter Audio", value=filter_str, inline=True)
        embed.add_field(name="Mode Loop", value=state.loop_mode.upper(), inline=True)
        embed.add_field(name="Autoplay", value="AKTIF 📻" if state.autoplay else "OFF", inline=True)

        if song.thumbnail:
            embed.set_thumbnail(url=song.thumbnail)
        return embed

    async def fetch_lyrics_embed(self, song: Song | None = None, query: str | None = None) -> discord.Embed:
        import re

        search_candidates = []

        if query:
            search_candidates.append(query)
            c_query = re.sub(r'[\(\[\{][^\)\]\}]*[\)\]\}]', '', query).strip(' -')
            if c_query and c_query != query:
                search_candidates.append(c_query)

        elif song:
            raw_title = song.title
            uploader = song.uploader

            clean_title = re.sub(r'[\(\[\{][^\)\]\}]*[\)\]\}]', '', raw_title)
            clean_title = re.sub(r'(?i)\b(official|video|music|audio|lyrics?|lyric\s+video|visualizer|mv|4k|hd|remastered|audio|video|clip\s+officiel|feat\.?|ft\.?)\b', '', clean_title)
            clean_title = ' '.join(clean_title.split()).strip(' -')

            clean_artist = re.sub(r'[\U00010000-\U0010ffff]|[\u2600-\u27ff]|autoplay|•', '', uploader, flags=re.IGNORECASE)
            clean_artist = re.sub(r'(?i)\b(topic|vevo|official|channel|records|music)\b', '', clean_artist).strip(' -')

            if clean_title:
                search_candidates.append(clean_title)
            if clean_artist and clean_title and clean_artist.lower() not in clean_title.lower():
                search_candidates.append(f"{clean_artist} {clean_title}")
            search_candidates.append(raw_title)

        if not search_candidates:
            return discord.Embed(description="❌ Harap tentukan lagu yang ingin dicari liriknya.", color=discord.Color.red())

        lyrics_text = None
        matched_title = None

        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

        async with aiohttp.ClientSession(headers=headers) as session:
            for cand in search_candidates:
                if not cand:
                    continue
                encoded = urllib.parse.quote(cand)
                try:
                    async with session.get(f"https://lrclib.net/api/search?q={encoded}", timeout=aiohttp.ClientTimeout(total=4)) as resp:
                        if resp.status == 200:
                            results = await resp.json()
                            if results and isinstance(results, list):
                                for item in results:
                                    text = item.get("plainLyrics") or item.get("syncedLyrics")
                                    if text:
                                        lyrics_text = text
                                        matched_title = f"{item.get('artistName', '')} - {item.get('trackName', '')}"
                                        break
                except Exception:
                    pass

                if lyrics_text:
                    break

        if not lyrics_text:
            return discord.Embed(description=f"❌ Lirik tidak ditemukan untuk: `{search_candidates[0]}`", color=discord.Color.red())

        if len(lyrics_text) > 4000:
            lyrics_text = lyrics_text[:4000] + "\n\n*(Lirik terpotong karena terlalu panjang)*"

        return discord.Embed(
            title=f"🎤 Lirik Lagu: {matched_title if matched_title and matched_title.strip(' -') else search_candidates[0]}",
            description=lyrics_text,
            color=discord.Color.magenta()
        )

    async def fetch_lyrics(self, query: str) -> tuple[str, str, str | None]:
        embed = await self.fetch_lyrics_embed(query=query)
        if embed.color == discord.Color.red():
            return query, "", None
        title = embed.title.replace("🎤 Lirik Lagu: ", "")
        return title, "", embed.description

async def setup(bot: commands.Bot):
    await bot.add_cog(MusicManager(bot))
