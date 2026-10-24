# 🎵 Linkryn V2 - Discord Music Bot

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10%2B-blue?logo=python&logoColor=white" alt="Python Version">
  <img src="https://img.shields.io/badge/Discord.py-2.5%2B-5865F2?logo=discord&logoColor=white" alt="Discord.py">
  <img src="https://img.shields.io/badge/yt--dlp-Latest-red?logo=youtube&logoColor=white" alt="yt-dlp">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License">
</p>

Bot musik Discord modern dengan performa tinggi, modular, dan kaya fitur berbasis **discord.py 2.x** dan **yt-dlp**. Dilengkapi dengan **100% Slash Commands (`/`)**, tombol kontrol UI interaktif, dropdown pencarian lagu, audio filters dinamis, dukungan Spotify, dan auto-disconnect.

---

## ✨ Fitur Utama

- ⚡ **Full Slash Commands (`/`)**: 30+ slash commands modern yang responsif dan tersinkronisasi global.
- 🎛️ **Audio Filters & DSP**: Equalizer (*pop, rock, electronic, classical, vocal*), Bass Boost (*low, medium, high*), Nightcore, Vaporwave, Treble, Karaoke (vocal dampener), dan Speed (*0.5x - 2.0x*).
- 💚 **Spotify & YouTube Ready**: Mendukung link YouTube, YouTube Music, dan Spotify (Track, Playlist, Album) tanpa memerlukan API Key Spotify.
- 🎚️ **Interactive UI & Player**: Embed *Now Playing* dilengkapi dengan Progress Bar (`▬▬🔘▬▬▬▬`), durasi real-time, serta Tombol Kontrol Interaktif (⏯️ Pause/Resume, ⏭️ Skip, 📜 Quick Queue, 🔁 Loop, ⏹️ Stop).
- 🔍 **Interactive Search**: Cari hingga 5 pilihan lagu dan pilih langsung melalui **Dropdown Select Menu**.
- 🗳️ **Fair Play Voting**: Fitur `/voteskip` untuk voting bersama anggota voice channel.
- ⏱️ **Auto Disconnect & Resource Management**: Otomatis meninggalkan voice channel jika bot idle / antrean kosong selama beberapa menit untuk menghemat resource.
- 🛠️ **Auto FFmpeg Detection**: Otomatis mendeteksi path FFmpeg di PATH sistem maupun direktori instalasi WinGet di Windows.

---

## 📋 Daftar Perintah (Slash Commands)

### 🎶 Playback & Kontrol Lagu
| Command | Deskripsi |
| :--- | :--- |
| `/play <query>` | Memutar musik dari judul atau link (YouTube / Spotify). Mendukung playlist. |
| `/playnext <query>` | Menyisipkan lagu langsung ke urutan antrean teratas berikutnya. |
| `/search <query>` | Mencari lagu dan menampilkan menu pilihan interaktif (Dropdown). |
| `/pause` | Menjeda pemutaran lagu saat ini. |
| `/resume` | Melanjutkan kembali lagu yang dijeda. |
| `/skip` | Melewati lagu yang sedang diputar. |
| `/voteskip` | Memulai voting skip bersama user di voice channel. |
| `/skipto <posisi>` | Langsung lompat ke lagu nomor tertentu dalam antrean. |
| `/seek <waktu>` | Lompat ke posisi menit/detik tertentu (contoh: `1:30` atau `90`). |
| `/stop` | Menghentikan musik, mengosongkan antrean, dan keluar dari voice. |
| `/autoplay` | Mengaktifkan/menonaktifkan pemutaran otomatis lagu rekomendasi. |

### 🎛️ Audio Filters & Efek
| Command | Deskripsi |
| :--- | :--- |
| `/bassboost <level>` | Mengatur level bass boost (`off`, `low`, `medium`, `high`). |
| `/equalizer <preset>` | Mengatur equalizer (`off`, `pop`, `rock`, `electronic`, `classical`, `vocal`). |
| `/nightcore <true/false>` | Mengaktifkan / mematikan mode Nightcore. |
| `/vaporwave <true/false>` | Mengaktifkan / mematikan mode Vaporwave. |
| `/speed <multiplier>` | Mengatur kecepatan audio (`0.5x` sampai `2.0x`). |
| `/treble <amount>` | Menambah atau mengurangi treble audio. |
| `/karaoke <true/false>` | Mengaktifkan filter peredam vokal. |
| `/resetfilters` | Menghapus semua efek filter audio kembali ke normal. |
| `/volume <0-150>` | Menyesuaikan volume pemutaran musik secara dinamis. |

### 📜 Antrean & Riwayat
| Command | Deskripsi |
| :--- | :--- |
| `/nowplaying` | Menampilkan lagu yang sedang diputar + tombol kontrol interaktif. |
| `/queue` | Menampilkan daftar antrean dengan tombol navigasi halaman (Paginasi). |
| `/loop <mode>` | Mengatur pengulangan lagu (`off`, `track`, `queue`). |
| `/shuffle` | Mengacak urutan antrean lagu. |
| `/move <dari> <ke>` | Memindahkan urutan posisi lagu di antrean. |
| `/remove <nomor>` | Menghapus lagu tertentu dari antrean. |
| `/clear` | Mengosongkan seluruh antrean lagu. |
| `/history` | Melihat 10 lagu terakhir yang telah diputar. |
| `/replay` | Memutar kembali lagu terakhir dari riwayat. |

### ℹ️ General & Voice
| Command | Deskripsi |
| :--- | :--- |
| `/help` | Menampilkan panduan bantuan seluruh perintah bot. |
| `/lyrics [judul]` | Menampilkan lirik lagu saat ini atau berdasarkan judul yang dicari. |
| `/join` | Meminta bot masuk ke voice channel Anda. |
| `/leave` | Mengeluarkan bot dari voice channel. |
| `/ping` | Menampilkan latensi WebSocket bot ke Discord. |

---

## ⚙️ Persyaratan Sistem (Prerequisites)

1. **Python 3.10** atau yang lebih baru.
2. **FFmpeg** terpasang di sistem dan terdaftar dalam Environment Variable (PATH).
   - **Windows** (via WinGet):
     ```powershell
     winget install "FFmpeg (Shared)"
     ```
   - **Linux (Ubuntu/Debian)**:
     ```bash
     sudo apt update && sudo apt install ffmpeg -y
     ```
   - **macOS**:
     ```bash
     brew install ffmpeg
     ```

---

## 🚀 Panduan Instalasi & Menjalankan Bot

### 1. Clone Repositori
```bash
git clone https://github.com/USERNAME/Linkryn-V2.git
cd Linkryn-V2
```

### 2. Buat & Aktifkan Virtual Environment
- **Windows (PowerShell)**:
  ```powershell
  python -m venv .venv
  .\.venv\Scripts\Activate.ps1
  ```
- **Linux / macOS**:
  ```bash
  python3 -m venv .venv
  source .venv/bin/activate
  ```

### 3. Pasang Dependensi
```bash
pip install -r requirements.txt
```

### 4. Konfigurasi Environment Variable
Salin template konfigurasi `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Buka file `.env` dan masukkan Token Bot Discord Anda:
```env
DISCORD_TOKEN=your_discord_bot_token_here
COMMAND_PREFIX=,
```

> ⚠️ **Catatan Penting:**
> Pastikan di **Discord Developer Portal** (menu *Bot*), opsi **Privileged Gateway Intents** berikut telah diaktifkan:
> - **Server Members Intent**
> - **Message Content Intent**

### 5. Jalankan Bot
```bash
python main.py
```

---

## 📁 Struktur Direktori

```text
Linkryn V2/
├── .env.example         # Template environment variable
├── .gitattributes       # Normalisasi line-ending Git
├── .gitignore           # File yang diabaikan oleh Git
├── README.md            # Dokumentasi proyek
├── requirements.txt     # Daftar pustaka Python
├── main.py              # Entry point utama bot Discord
├── audio_source.py      # Integrasi yt-dlp, FFmpeg DSP & PCM Transformer
├── music_manager.py     # State management pemutar musik per guild
├── music_queue.py       # Struktur data antrean dan metadata lagu
├── spotify_helper.py    # Ekstraksi track/playlist/album Spotify
├── ui_views.py          # Tombol interaktif (Buttons) & Dropdowns
└── commands/            # Modular command cogs
    ├── filters/         # Perintah efek audio & DSP
    ├── general/         # Perintah info, lirik, join/leave
    ├── playback/        # Perintah play, pause, skip, seek, voteskip
    └── queue/           # Perintah antrean, loop, shuffle, nowplaying
```

---

## 📄 Lisensi

Proyek ini dirilis di bawah lisensi [MIT License](LICENSE). Silakan gunakan, kembangkan, dan sesuaikan dengan kebutuhan server Discord Anda!
