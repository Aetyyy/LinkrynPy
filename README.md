# 🎵 Linkryn V2 - Discord Music Bot & Spotify-Style Web Dashboard

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10%2B-blue?logo=python&logoColor=white" alt="Python Version">
  <img src="https://img.shields.io/badge/Discord.py-2.5%2B-5865F2?logo=discord&logoColor=white" alt="Discord.py">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React 19">
  <img src="https://img.shields.io/badge/Vite-Fast-646CFF?logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/Supabase-Database-3ECF8E?logo=supabase&logoColor=white" alt="Supabase">
  <img src="https://img.shields.io/badge/yt--dlp-Latest-red?logo=youtube&logoColor=white" alt="yt-dlp">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License">
</p>

**Linkryn V2** adalah bot musik Discord modern berkecepatan tinggi yang terintegrasi langsung dengan **Spotify-Style Web Player Dashboard** berbasis React + Vite. Bot ini dilengkapi dengan **100% Slash Commands (`/`)**, tombol kontrol interaktif di Discord, proteksi voice channel, sistem hak akses DJ & skip terproteksi, rekomendasi lagu cerdas, lirik tersinkronisasi (karaoke highlight), serta sinkronisasi database persisten (**Supabase** dengan fallback otomatis ke **SQLite** lokal).

---

## ✨ Fitur Unggulan

### 🌐 1. Spotify-Style Web Dashboard (`http://localhost:5000`)
- **Beranda Langsung Rekomendasi**: Saat membuka web, langsung disajikan kurasi rekomendasi lagu terpopuler dan filter genre (*Pop Indo, Dangdut Koplo, Akustik Santai, J-Pop/Anime, K-Pop, Rock*).
- **Sidebar Kanan Lipat (Collapsible Right Panel)**:
  - **Daftar Antrean**: Melihat antrean lagu selanjutnya secara langsung tanpa meninggalkan halaman beranda. Bisa disembunyikan (*hide*) kapan saja dengan tombol `X`.
  - **Lirik Realtime & Efek Karaoke**: Teks lirik tersinkronisasi (*synced lyrics*) dengan efek nyala baris aktif (*karaoke glowing highlight*) dan auto-scroll mengikuti irama lagu. Klik pada baris lirik untuk langsung lompat ke detik tersebut!
- **Scrubbing & Playing Time Bar**: Slider progress lagu *real-time* dengan waktu berjalan (`0:00 / 3:45`) dan dukungan seek / lompat posisi lagu.
- **Login Per-User & Otomatis Terhubung**:
  - Web mendeteksi Voice Channel Discord tempat pengguna berada secara otomatis (`🔊 Voice: #General`).
  - Saat menekan tombol putar di web, bot otomatis bergabung ke channel kamu!
  - Mendukung login OAuth2 Discord resmi dan Switcher 1-klik untuk akun member server.

### 🛡️ 2. Proteksi Voice Channel & Sistem Izin Skip / DJ
- **Anti Pindah Paksa**: Jika bot sedang aktif memutar musik untuk pengguna di Voice Channel A, orang lain di Voice Channel B **tidak dapat** memindahkan bot atau memutar lagu secara sembarangan. Mereka harus bergabung ke Voice Channel A.
- **Izin Skip Terproteksi**:
  - Lagu hanya dapat dilewati langsung oleh:
    1. Administrator / Pengelola Server.
    2. Pemilik lagu yang sedang diputar.
    3. Pengguna utama yang memulai sesi bot (*session owner*).
    4. Member yang memiliki role Discord bernama `DJ`.
    5. Member yang diberikan izin khusus oleh pengguna utama.
    6. Pendengar tunggal (jika hanya ada 1 orang di VC).
  - Jika pengguna biasa ingin melewati lagu, bot akan mengirimkan permintaan persetujuan interaktif & voting skip bersama anggota Voice Channel.
- **Perintah Izin Khusus**: Pengguna utama atau Admin dapat memberikan akses skip langsung ke teman menggunakan command `/dj grant @user`.

### 💾 3. Database Cloud (Supabase) + SQLite Fallback
- Mendukung penyimpanan awan menggunakan **Supabase REST API** untuk menyimpan:
  - ❤️ **Lagu yang Disukai (Liked Songs)**: Simpan lagu favorit dari web atau bot (`/like`, `/liked`).
  - 📁 **Koleksi Playlist Kustom**: Buat playlist kustom dan putar sekaligus (`/playlist`).
  - 🕒 **Riwayat Pemutaran (History)**: Daftar lagu yang baru saja diputar di server.
- Jika Supabase belum disetel di `.env`, bot otomatis menggunakan database lokal **SQLite (`linkryn.db`)** tanpa error.

---

## 📖 Panduan Lengkap: Cara Mengambil Link & Kunci dari Supabase

Ikuti langkah-langkah mudah berikut untuk mengaktifkan database Supabase:

### Langkah 1: Buat Akun & Proyek Baru di Supabase
1. Buka website resmi [Supabase](https://supabase.com) dan klik **Start your project** (bisa login menggunakan akun GitHub).
2. Di halaman Dashboard, klik **New Project**.
3. Isi data proyek:
   - **Name**: Masukkan nama bebas (misal: `linkryn-music`).
   - **Database Password**: Buat password yang kuat (simpan jika diperlukan).
   - **Region**: Pilih lokasi terdekat (misal: `Singapore (ap-southeast-1)`).
4. Klik **Create new project** dan tunggu 1-2 menit hingga status database selesai disiapkan (*Active*).

### Langkah 2: Mengambil `SUPABASE_URL` dan `SUPABASE_KEY`
1. Di sidebar sebelah kiri dashboard Supabase, klik ikon **Settings** (⚙️) di bagian bawah.
2. Pilih menu **API** (atau **Data API**).
3. Anda akan melihat bagian:
   - **Project URL**: Ini adalah URL Supabase Anda.
     - Contoh: `https://abcdefghijklm.supabase.co`
     - Salin nilai ini untuk `SUPABASE_URL`.
   - **Project API Keys**: Cari kunci dengan label **`anon` `public`**.
     - Klik tombol **Copy** (ikon salin).
     - Kunci ini berupa string JWT panjang yang diawali `eyJhbGciOi...`
     - Salin nilai ini untuk `SUPABASE_KEY`.

### Langkah 3: Menjalankan Skrip Tabel SQL di Supabase
1. Di sidebar kiri Supabase, klik ikon **SQL Editor** (`>_`).
2. Klik **New query** (atau buat lembar query baru).
3. Salin dan tempel kode SQL berikut, lalu klik tombol **Run** (Ctrl + Enter):

```sql
-- 1. Tabel Lagu yang Disukai (Liked Songs)
CREATE TABLE IF NOT EXISTS liked_songs (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    artist TEXT,
    duration INT,
    thumbnail TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabel Koleksi Playlist
CREATE TABLE IF NOT EXISTS playlists (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabel Isi Lagu dalam Playlist
CREATE TABLE IF NOT EXISTS playlist_songs (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    playlist_id BIGINT REFERENCES playlists(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    artist TEXT,
    duration INT,
    thumbnail TEXT,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabel Riwayat Pemutaran (Play History)
CREATE TABLE IF NOT EXISTS play_history (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    guild_id TEXT NOT NULL,
    user_id TEXT,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    artist TEXT,
    duration INT,
    thumbnail TEXT,
    played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

Setelah muncul pesan `Success. No rows returned`, database Supabase Anda telah siap digunakan 100%!

### Langkah 4: Masukkan ke file `.env`
Buka file `.env` di folder proyek Linkryn V2, lalu tambahkan:
```env
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🔑 Konfigurasi Discord OAuth2 (Opsional untuk Login Web)

Jika ingin mengaktifkan tombol login Discord resmi di dashboard web:
1. Buka [Discord Developer Portal](https://discord.com/developers/applications).
2. Pilih aplikasi bot Anda, masuk ke menu **OAuth2** -> **General**.
3. Di bagian **Redirects**, klik **Add Redirect** dan tambahkan:
   ```
   http://localhost:5000/api/auth/callback
   ```
4. Klik **Save Changes**.
5. Salin **Client ID** dan **Client Secret**, lalu masukkan ke file `.env`:
   ```env
   DISCORD_CLIENT_ID=your_client_id_here
   DISCORD_CLIENT_SECRET=your_client_secret_here
   ```

*(Catatan: Jika OAuth2 tidak disetel, Web Dashboard tetap dapat digunakan secara instan menggunakan fitur 1-klik "Pilih Member Discord".)*

---

## 📋 Daftar Perintah Slash (`/`)

### 🎶 Playback & Kontrol Lagu
| Command | Deskripsi |
| :--- | :--- |
| `/play <query>` | Memutar lagu dari judul, link YouTube, YouTube Music, atau Spotify. |
| `/playnext <query>` | Menyisipkan lagu ke urutan pertama antrean berikutnya. |
| `/search <query>` | Mencari hingga 5 lagu dan memilih melalui dropdown menu interaktif. |
| `/pause` | Menjeda pemutaran lagu saat ini. |
| `/resume` | Melanjutkan lagu yang dijeda. |
| `/skip` | Melewati lagu saat ini (memerlukan izin jika bukan pemilik lagu). |
| `/voteskip` | Mengajukan voting skip bersama anggota voice channel. |
| `/skipto <posisi>` | Langsung melompat ke urutan lagu tertentu dalam antrean. |
| `/seek <waktu>` | Lompat ke posisi menit/detik tertentu (contoh: `1:30` atau `90`). |
| `/stop` | Menghentikan musik, menghapus antrean, dan keluar dari voice channel. |
| `/autoplay` | Menghidupkan atau mematikan pemutaran otomatis lagu rekomendasi. |

### 🛡️ Izin DJ & Akses Khusus
| Command | Deskripsi |
| :--- | :--- |
| `/dj grant <member>` | Berikan akses khusus ke seseorang agar bisa skip lagu tanpa persetujuan. |
| `/dj revoke <member>` | Cabut izin skip khusus dari seseorang. |
| `/dj list` | Menampilkan pemilik sesi utama dan daftar member dengan hak DJ/skip. |

### ❤️ Favorit & Playlist
| Command | Deskripsi |
| :--- | :--- |
| `/like` | Menyukai lagu yang sedang aktif diputar dan menyimpannya ke database. |
| `/liked view` | Melihat daftar lagu yang Anda sukai. |
| `/liked play` | Memutar semua lagu yang Anda sukai ke voice channel. |
| `/playlist create <nama>` | Membuat playlist kustom baru. |
| `/playlist add <id> <lagu>` | Menambahkan lagu ke playlist kustom. |
| `/playlist list` | Melihat daftar playlist kustom milik Anda. |
| `/playlist play <id>` | Memutar seluruh isi playlist kustom ke voice channel. |

### 🎛️ Audio Filters & DSP
| Command | Deskripsi |
| :--- | :--- |
| `/bassboost <level>` | Mengatur tingkat bass boost (`off`, `low`, `medium`, `high`). |
| `/equalizer <preset>` | Mengatur preset equalizer (`off`, `pop`, `rock`, `electronic`, `classical`, `vocal`). |
| `/nightcore <true/false>` | Mengaktifkan / mematikan mode Nightcore. |
| `/vaporwave <true/false>` | Mengaktifkan / mematikan mode Vaporwave. |
| `/speed <multiplier>` | Mengatur kecepatan audio (`0.5x` sampai `2.0x`). |
| `/treble <amount>` | Menambah atau mengurangi treble audio (`-10` sampai `+10` dB). |
| `/karaoke <true/false>` | Mengaktifkan filter peredam vokal penyanyi. |
| `/resetfilters` | Mengembalikan semua filter audio ke kondisi normal. |
| `/volume <0-150>` | Mengatur volume pemutaran lagu secara dinamis. |

### 📜 Antrean & Riwayat
| Command | Deskripsi |
| :--- | :--- |
| `/nowplaying` | Menampilkan embed lagu yang sedang diputar + panel tombol kontrol. |
| `/queue` | Menampilkan daftar antrean dengan tombol navigasi halaman. |
| `/loop <mode>` | Mengatur mode perulangan (`off`, `track`, `queue`). |
| `/shuffle` | Mengacak urutan antrean lagu. |
| `/move <dari> <ke>` | Memindahkan nomor urut lagu dalam antrean. |
| `/remove <nomor>` | Menghapus lagu tertentu dari antrean. |
| `/clear` | Mengosongkan seluruh antrean lagu. |
| `/history` | Melihat riwayat lagu yang telah diputar di server. |
| `/replay` | Memutar kembali lagu terakhir dari riwayat. |

### ℹ️ General & Utilitas
| Command | Deskripsi |
| :--- | :--- |
| `/help` | Menampilkan buku panduan seluruh perintah bot. |
| `/lyrics [judul]` | Menampilkan lirik lagu saat ini atau lirik berdasarkan judul. |
| `/join` | Meminta bot masuk ke voice channel Anda. |
| `/leave` | Mengeluarkan bot dari voice channel. |
| `/ping` | Menampilkan latensi WebSocket bot ke Discord. |

---

## 🚀 Panduan Instalasi & Menjalankan Bot

### 1. Pasang Persyaratan
- **Python 3.10+**
- **FFmpeg** terpasang di sistem dan terdaftar di PATH:
  ```powershell
  winget install "FFmpeg (Shared)"
  ```

### 2. Pasang Dependensi Python
```powershell
pip install -r requirements.txt
```

### 3. Build Tampilan Web (Frontend React)
*(File build produksi sudah disertakan di folder `web/dist`. Jika Anda melakukan modifikasi pada kode React di `web/src/`, jalankan perintah berikut:)*
```powershell
cd web
npm install
npm run build
cd ..
```

### 4. Konfigurasi `.env`
Buka file `.env` dan sesuaikan token bot Anda:
```env
DISCORD_TOKEN=your_bot_token_here
COMMAND_PREFIX=,

# Konfigurasi Supabase Database (Opsional, fallback ke SQLite jika kosong)
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Konfigurasi Discord OAuth2 (Opsional)
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
```

> ⚠️ **Penting di Discord Developer Portal:**
> Pastikan di tab **Bot**, opsi **Privileged Gateway Intents** berikut aktif:
> - **Server Members Intent**
> - **Message Content Intent**

### 5. Jalankan Bot & Web Player
```powershell
.\.venv\Scripts\python.exe main.py
```
- Bot Discord akan otomatis online dan menyinkronkan seluruh slash command.
- Spotify-Style Web Dashboard dapat langsung dibuka di browser: **`http://localhost:5000`**

---

## 📄 Lisensi
Proyek ini dirilis di bawah lisensi [MIT License](LICENSE).
