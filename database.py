import os
import time
import json
import sqlite3
import urllib.parse
import aiohttp
from typing import List, Dict, Optional
from dotenv import load_dotenv

# Muat environment variable dari .env
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", os.getenv("SUPABASE_KEY", os.getenv("SUPABASE_ANON_KEY", ""))).strip()

SQLITE_PATH = os.path.join(os.path.dirname(__file__), "linkryn.db")

def normalize_yt_url(u: str) -> str:
    if not u:
        return ""
    import re
    m = re.search(r'(?:v=|\/)([0-9A-Za-z_-]{11})', u)
    if m:
        return f"https://www.youtube.com/watch?v={m.group(1)}"
    return u.split('&')[0].strip()

class DatabaseManager:
    def __init__(self):
        global SUPABASE_URL, SUPABASE_KEY
        if not SUPABASE_URL:
            SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
        if not SUPABASE_KEY:
            SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", os.getenv("SUPABASE_KEY", os.getenv("SUPABASE_ANON_KEY", ""))).strip()

        self.use_supabase = bool(SUPABASE_URL and SUPABASE_KEY)
        self.init_sqlite()
        self._session: Optional[aiohttp.ClientSession] = None

        if self.use_supabase:
            print(f"[Database] Terhubung ke Supabase Database Cloud: {SUPABASE_URL}")
        else:
            print("[Database] PERINGATAN: Supabase belum disetel di .env, menggunakan SQLite lokal")

    def init_sqlite(self):
        """Memastikan tabel lokal SQLite selalu siap sedia sebagai backup andal."""
        try:
            conn = sqlite3.connect(SQLITE_PATH)
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    username TEXT NOT NULL,
                    display_name TEXT,
                    avatar TEXT,
                    access_token TEXT,
                    session_token TEXT UNIQUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS liked_songs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    url TEXT NOT NULL,
                    duration INTEGER DEFAULT 0,
                    thumbnail TEXT,
                    uploader TEXT,
                    artist TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, url)
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS playlists (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, name)
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS playlist_songs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    playlist_id INTEGER NOT NULL,
                    title TEXT NOT NULL,
                    url TEXT NOT NULL,
                    duration INTEGER DEFAULT 0,
                    thumbnail TEXT,
                    uploader TEXT,
                    artist TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS play_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    guild_id TEXT NOT NULL,
                    user_id TEXT,
                    title TEXT NOT NULL,
                    url TEXT NOT NULL,
                    duration INTEGER DEFAULT 0,
                    thumbnail TEXT,
                    uploader TEXT,
                    played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"[SQLite Init Error] {e}")

    def _supabase_headers(self, upsert: bool = False):
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        if upsert:
            headers["Prefer"] = "resolution=merge-duplicates,return=representation"
        return headers

    async def get_session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            timeout = aiohttp.ClientTimeout(total=6)
            self._session = aiohttp.ClientSession(headers=self._supabase_headers(), timeout=timeout)
        return self._session

    # ==========================
    # USERS & SESSIONS
    # ==========================
    async def save_user(self, user_dict: dict) -> bool:
        uid = str(user_dict.get("id"))
        uname = user_dict.get("username", "Unknown")
        dname = user_dict.get("display_name", uname)
        avatar = user_dict.get("avatar", "")
        access_tok = user_dict.get("access_token", "")
        sess_tok = user_dict.get("token") or user_dict.get("session_token", "")

        # 1. Simpan ke database lokal SQLite
        try:
            conn = sqlite3.connect(SQLITE_PATH)
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO users (id, username, display_name, avatar, access_token, session_token, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(id) DO UPDATE SET
                    username = excluded.username,
                    display_name = excluded.display_name,
                    avatar = excluded.avatar,
                    access_token = excluded.access_token,
                    session_token = excluded.session_token,
                    updated_at = CURRENT_TIMESTAMP
            """, (uid, uname, dname, avatar, access_tok, sess_tok))
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"[SQLite Error] save_user: {e}")

        # 2. Sinkronkan ke Supabase jika aktif
        if self.use_supabase:
            try:
                payload = {
                    "id": uid,
                    "username": uname,
                    "display_name": dname,
                    "avatar": avatar,
                    "access_token": access_tok,
                    "session_token": sess_tok
                }
                session = await self.get_session()
                async with session.post(f"{SUPABASE_URL}/rest/v1/users", json=payload, headers=self._supabase_headers(upsert=True)) as resp:
                    resp_text = await resp.text()
                    if resp.status not in (200, 201, 204):
                        if resp.status == 401 or "42501" in resp_text:
                            print("[Supabase RLS Notice] Tabel 'users' memiliki Row Level Security aktif. Data tersimpan dengan aman di database lokal.")
                        else:
                            print(f"[Supabase Notice] save_user status {resp.status}: {resp_text[:120]}")
            except Exception as e:
                print(f"[Supabase Error] save_user: {e}")

        return True

    async def get_user_by_token(self, session_token: str) -> Optional[dict]:
        if not session_token:
            return None

        # 1. Cek dari Supabase terlebih dahulu
        if self.use_supabase:
            try:
                enc_token = urllib.parse.quote(session_token)
                session = await self.get_session()
                async with session.get(f"{SUPABASE_URL}/rest/v1/users?session_token=eq.{enc_token}&select=*") as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        if data:
                            u = data[0]
                            return {
                                "id": str(u.get("id")),
                                "username": u.get("username"),
                                "display_name": u.get("display_name"),
                                "avatar": u.get("avatar"),
                                "token": u.get("session_token")
                            }
                    else:
                        await resp.text()
            except Exception as e:
                print(f"[Supabase Error] get_user_by_token: {e}")

        # 2. Cek dari database lokal SQLite
        try:
            conn = sqlite3.connect(SQLITE_PATH)
            cur = conn.cursor()
            cur.execute("SELECT id, username, display_name, avatar, session_token FROM users WHERE session_token = ?", (session_token,))
            row = cur.fetchone()
            conn.close()
            if row:
                return {
                    "id": row[0],
                    "username": row[1],
                    "display_name": row[2],
                    "avatar": row[3],
                    "token": row[4]
                }
        except Exception as e:
            print(f"[SQLite Error] get_user_by_token: {e}")

        return None

    # ==========================
    # LIKED SONGS
    # ==========================
    async def add_liked_song(self, user_id: str, song: dict) -> bool:
        artist_val = song.get("artist") or song.get("uploader") or "Unknown Artist"
        title_val = song.get("title", "Unknown")
        url_val = song.get("url", "")
        dur_val = int(song.get("duration") or 0)
        thumb_val = song.get("thumbnail")

        # 1. Simpan selalu ke SQLite lokal agar respon instan & tidak pernah gagal
        try:
            conn = sqlite3.connect(SQLITE_PATH)
            cur = conn.cursor()
            cur.execute("""
                INSERT OR REPLACE INTO liked_songs (user_id, title, url, duration, thumbnail, uploader, artist)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (str(user_id), title_val, url_val, dur_val, thumb_val, artist_val, artist_val))
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"[SQLite Error] add_liked_song: {e}")

        # 2. Sinkronkan ke Supabase Cloud
        if self.use_supabase:
            try:
                session = await self.get_session()
                # Di Supabase skemanya menggunakan kolom 'artist'
                payload = {
                    "user_id": str(user_id),
                    "title": title_val,
                    "url": url_val,
                    "duration": dur_val,
                    "thumbnail": thumb_val,
                    "artist": artist_val
                }
                async with session.post(f"{SUPABASE_URL}/rest/v1/liked_songs", json=payload, headers=self._supabase_headers(upsert=True)) as resp:
                    resp_text = await resp.text()
                    if resp.status not in (200, 201, 204):
                        if resp.status == 401 or "42501" in resp_text:
                            pass
                        elif "PGRST204" in resp_text and "uploader" in resp_text:
                            # Coba kolom uploader jika skema berbeda
                            alt_payload = {**payload, "uploader": artist_val}
                            del alt_payload["artist"]
                            async with session.post(f"{SUPABASE_URL}/rest/v1/liked_songs", json=alt_payload) as alt_r:
                                await alt_r.text()
            except Exception as e:
                print(f"[Supabase Error] add_liked_song: {e}")

        return True

    async def remove_liked_song(self, user_id: str, url: str) -> bool:
        norm_target = normalize_yt_url(url)

        # 1. Hapus dari SQLite lokal
        try:
            conn = sqlite3.connect(SQLITE_PATH)
            cur = conn.cursor()
            cur.execute("SELECT id, url FROM liked_songs WHERE user_id = ?", (str(user_id),))
            for r in cur.fetchall():
                if normalize_yt_url(r[1]) == norm_target or r[1] == url:
                    cur.execute("DELETE FROM liked_songs WHERE id = ?", (r[0],))
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"[SQLite Error] remove_liked_song: {e}")

        # 2. Hapus dari Supabase Cloud
        if self.use_supabase:
            try:
                session = await self.get_session()
                enc_url = urllib.parse.quote(url)
                async with session.delete(f"{SUPABASE_URL}/rest/v1/liked_songs?user_id=eq.{user_id}&url=eq.{enc_url}") as resp:
                    await resp.text()
                async with session.get(f"{SUPABASE_URL}/rest/v1/liked_songs?user_id=eq.{user_id}&select=id,url") as list_resp:
                    if list_resp.status == 200:
                        for row in await list_resp.json():
                            if normalize_yt_url(row.get("url", "")) == norm_target:
                                async with session.delete(f"{SUPABASE_URL}/rest/v1/liked_songs?id=eq.{row['id']}") as del_r:
                                    await del_r.text()
            except Exception as e:
                print(f"[Supabase Error] remove_liked_song: {e}")

        return True

    async def is_song_liked(self, user_id: str, url: str) -> bool:
        if not user_id or not url:
            return False
        norm_target = normalize_yt_url(url)

        # Cek SQLite lokal dahulu (cepat & akurat)
        try:
            conn = sqlite3.connect(SQLITE_PATH)
            cur = conn.cursor()
            cur.execute("SELECT id, url FROM liked_songs WHERE user_id = ?", (str(user_id),))
            rows = cur.fetchall()
            conn.close()
            for r in rows:
                if normalize_yt_url(r[1]) == norm_target or r[1] == url:
                    return True
        except Exception:
            pass

        # Cek Supabase
        if self.use_supabase:
            try:
                session = await self.get_session()
                async with session.get(f"{SUPABASE_URL}/rest/v1/liked_songs?user_id=eq.{user_id}&select=id,url") as resp:
                    if resp.status == 200:
                        rows = await resp.json()
                        for r in rows:
                            if normalize_yt_url(r.get("url", "")) == norm_target or r.get("url") == url:
                                return True
                    else:
                        await resp.text()
            except Exception:
                pass

        return False

    async def get_liked_songs(self, user_id: str) -> list[dict]:
        # 1. Coba ambil dari Supabase Cloud
        if self.use_supabase:
            try:
                session = await self.get_session()
                async with session.get(f"{SUPABASE_URL}/rest/v1/liked_songs?user_id=eq.{user_id}&order=id.desc") as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        if data and isinstance(data, list):
                            res = []
                            for s in data:
                                art = s.get("artist") or s.get("uploader") or "Artis"
                                res.append({
                                    "id": s.get("id"),
                                    "title": s.get("title", "Unknown"),
                                    "url": s.get("url", ""),
                                    "duration": s.get("duration", 0),
                                    "thumbnail": s.get("thumbnail"),
                                    "uploader": art,
                                    "artist": art
                                })
                            if res:
                                return res
                    else:
                        await resp.text()
            except Exception as e:
                print(f"[Supabase Error] get_liked_songs: {e}")

        # 2. Ambil dari SQLite lokal
        try:
            conn = sqlite3.connect(SQLITE_PATH)
            cur = conn.cursor()
            cur.execute("SELECT id, title, url, duration, thumbnail, uploader, artist FROM liked_songs WHERE user_id = ? ORDER BY id DESC", (str(user_id),))
            rows = cur.fetchall()
            conn.close()
            return [
                {
                    "id": r[0],
                    "title": r[1],
                    "url": r[2],
                    "duration": r[3],
                    "thumbnail": r[4],
                    "uploader": r[6] or r[5] or "Artis",
                    "artist": r[6] or r[5] or "Artis"
                }
                for r in rows
            ]
        except Exception as e:
            print(f"[SQLite Error] get_liked_songs: {e}")
            return []

    # ==========================
    # PLAYLISTS
    # ==========================
    async def create_playlist(self, user_id: str, name: str) -> Optional[dict]:
        clean_name = name.strip()
        if not clean_name:
            return None

        p_id = None
        # 1. Simpan ke SQLite lokal
        try:
            conn = sqlite3.connect(SQLITE_PATH)
            cur = conn.cursor()
            cur.execute("INSERT INTO playlists (user_id, name) VALUES (?, ?)", (str(user_id), clean_name))
            p_id = cur.lastrowid
            conn.commit()
            conn.close()
        except sqlite3.IntegrityError:
            # Nama duplikat
            pass
        except Exception as e:
            print(f"[SQLite Error] create_playlist: {e}")

        # 2. Sinkronkan ke Supabase Cloud
        if self.use_supabase:
            try:
                payload = {"user_id": str(user_id), "name": clean_name}
                session = await self.get_session()
                async with session.post(f"{SUPABASE_URL}/rest/v1/playlists", json=payload) as resp:
                    resp_text = await resp.text()
                    if resp.status in (200, 201):
                        data = json.loads(resp_text)
                        if isinstance(data, list) and data:
                            item = data[0]
                            return {
                                "id": item.get("id", p_id),
                                "user_id": str(user_id),
                                "name": clean_name,
                                "song_count": 0,
                                "songs_count": 0
                            }
                    elif resp.status == 401 or "42501" in resp_text:
                        print("[Supabase RLS Notice] Tabel 'playlists' memiliki Row Level Security aktif. Data tersimpan di database lokal.")
            except Exception as e:
                print(f"[Supabase Error] create_playlist: {e}")

        if p_id:
            return {"id": p_id, "user_id": str(user_id), "name": clean_name, "song_count": 0, "songs_count": 0}
        return None

    async def get_user_playlists(self, user_id: str) -> list[dict]:
        # 1. Coba ambil dari Supabase Cloud
        if self.use_supabase:
            try:
                session = await self.get_session()
                async with session.get(f"{SUPABASE_URL}/rest/v1/playlists?user_id=eq.{user_id}&select=*&order=id.desc") as resp:
                    if resp.status == 200:
                        playlists = await resp.json()
                        if playlists and isinstance(playlists, list):
                            pl_ids = [str(p["id"]) for p in playlists if "id" in p]
                            if pl_ids:
                                ids_str = ",".join(pl_ids)
                                async with session.get(f"{SUPABASE_URL}/rest/v1/playlist_songs?select=playlist_id&playlist_id=in.({ids_str})") as songs_resp:
                                    if songs_resp.status == 200:
                                        songs_data = await songs_resp.json()
                                        count_map = {}
                                        for row in songs_data:
                                            pid = row.get("playlist_id")
                                            count_map[pid] = count_map.get(pid, 0) + 1
                                        for p in playlists:
                                            cnt = count_map.get(p.get("id"), 0)
                                            p["song_count"] = cnt
                                            p["songs_count"] = cnt
                                    else:
                                        await songs_resp.text()
                            return playlists
                    else:
                        await resp.text()
            except Exception as e:
                print(f"[Supabase Error] get_user_playlists: {e}")

        # 2. Ambil dari SQLite lokal
        try:
            conn = sqlite3.connect(SQLITE_PATH)
            cur = conn.cursor()
            cur.execute("""
                SELECT p.id, p.name, COUNT(ps.id) as song_count
                FROM playlists p
                LEFT JOIN playlist_songs ps ON p.id = ps.playlist_id
                WHERE p.user_id = ?
                GROUP BY p.id
                ORDER BY p.id DESC
            """, (str(user_id),))
            rows = cur.fetchall()
            conn.close()
            return [{"id": r[0], "name": r[1], "song_count": r[2], "songs_count": r[2]} for r in rows]
        except Exception as e:
            print(f"[SQLite Error] get_user_playlists: {e}")
            return []

    async def get_playlist_songs(self, playlist_id: int, user_id: str | None = None) -> list[dict]:
        # 1. Coba ambil dari Supabase Cloud
        if self.use_supabase:
            try:
                session = await self.get_session()
                if user_id:
                    async with session.get(f"{SUPABASE_URL}/rest/v1/playlists?id=eq.{playlist_id}&user_id=eq.{user_id}&select=id") as chk_resp:
                        if chk_resp.status == 200:
                            owners = await chk_resp.json()
                            if not owners:
                                pass
                        await chk_resp.text()

                async with session.get(f"{SUPABASE_URL}/rest/v1/playlist_songs?playlist_id=eq.{playlist_id}&order=id.asc") as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        if data and isinstance(data, list):
                            return [
                                {
                                    "id": s.get("id"),
                                    "playlist_id": s.get("playlist_id"),
                                    "title": s.get("title", "Unknown"),
                                    "url": s.get("url", ""),
                                    "duration": s.get("duration", 0),
                                    "thumbnail": s.get("thumbnail"),
                                    "uploader": s.get("artist") or s.get("uploader") or "Artis",
                                    "artist": s.get("artist") or s.get("uploader") or "Artis"
                                }
                                for s in data
                            ]
                    else:
                        await resp.text()
            except Exception as e:
                print(f"[Supabase Error] get_playlist_songs: {e}")

        # 2. Ambil dari SQLite lokal
        try:
            conn = sqlite3.connect(SQLITE_PATH)
            cur = conn.cursor()
            if user_id:
                cur.execute("SELECT id FROM playlists WHERE id = ? AND user_id = ?", (playlist_id, str(user_id)))
                if not cur.fetchone():
                    conn.close()
                    return []

            cur.execute("SELECT id, title, url, duration, thumbnail, uploader, artist FROM playlist_songs WHERE playlist_id = ? ORDER BY id ASC", (playlist_id,))
            rows = cur.fetchall()
            conn.close()
            return [
                {
                    "id": r[0],
                    "title": r[1],
                    "url": r[2],
                    "duration": r[3],
                    "thumbnail": r[4],
                    "uploader": r[6] or r[5] or "Artis",
                    "artist": r[6] or r[5] or "Artis"
                }
                for r in rows
            ]
        except Exception as e:
            print(f"[SQLite Error] get_playlist_songs: {e}")
            return []

    async def add_to_playlist(self, playlist_id: int, song: dict, user_id: str | None = None) -> bool:
        artist_val = song.get("artist") or song.get("uploader") or "Unknown Artist"
        title_val = song.get("title", "Unknown")
        url_val = song.get("url", "")
        dur_val = int(song.get("duration") or 0)
        thumb_val = song.get("thumbnail")

        # 1. Simpan ke SQLite lokal
        local_saved = False
        try:
            conn = sqlite3.connect(SQLITE_PATH)
            cur = conn.cursor()
            if user_id:
                cur.execute("SELECT id FROM playlists WHERE id = ? AND user_id = ?", (playlist_id, str(user_id)))
                if not cur.fetchone():
                    # Jika id tidak cocok karena id dibuat di Supabase, cek apakah ada playlist milik user
                    pass
            cur.execute("""
                INSERT INTO playlist_songs (playlist_id, title, url, duration, thumbnail, uploader, artist)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (playlist_id, title_val, url_val, dur_val, thumb_val, artist_val, artist_val))
            conn.commit()
            conn.close()
            local_saved = True
        except Exception as e:
            print(f"[SQLite Error] add_to_playlist: {e}")

        # 2. Sinkronkan ke Supabase Cloud
        if self.use_supabase:
            try:
                session = await self.get_session()
                payload = {
                    "playlist_id": playlist_id,
                    "title": title_val,
                    "url": url_val,
                    "duration": dur_val,
                    "thumbnail": thumb_val,
                    "artist": artist_val
                }
                async with session.post(f"{SUPABASE_URL}/rest/v1/playlist_songs", json=payload) as resp:
                    resp_text = await resp.text()
                    if resp.status in (200, 201, 204):
                        return True
                    elif "uploader" in resp_text:
                        alt_payload = {**payload, "uploader": artist_val}
                        del alt_payload["artist"]
                        async with session.post(f"{SUPABASE_URL}/rest/v1/playlist_songs", json=alt_payload) as alt_r:
                            await alt_r.text()
            except Exception as e:
                print(f"[Supabase Error] add_to_playlist: {e}")

        return local_saved

    async def remove_from_playlist(self, playlist_id: int, song_id: int, user_id: str | None = None) -> bool:
        # SQLite
        try:
            conn = sqlite3.connect(SQLITE_PATH)
            cur = conn.cursor()
            cur.execute("DELETE FROM playlist_songs WHERE id = ? AND playlist_id = ?", (song_id, playlist_id))
            conn.commit()
            conn.close()
        except Exception:
            pass

        # Supabase
        if self.use_supabase:
            try:
                session = await self.get_session()
                async with session.delete(f"{SUPABASE_URL}/rest/v1/playlist_songs?id=eq.{song_id}&playlist_id=eq.{playlist_id}") as resp:
                    await resp.text()
            except Exception:
                pass

        return True

    async def delete_playlist(self, user_id: str, playlist_id: int) -> bool:
        # SQLite
        try:
            conn = sqlite3.connect(SQLITE_PATH)
            cur = conn.cursor()
            cur.execute("DELETE FROM playlist_songs WHERE playlist_id = ?", (playlist_id,))
            cur.execute("DELETE FROM playlists WHERE id = ? AND user_id = ?", (playlist_id, str(user_id)))
            conn.commit()
            conn.close()
        except Exception:
            pass

        # Supabase
        if self.use_supabase:
            try:
                session = await self.get_session()
                async with session.delete(f"{SUPABASE_URL}/rest/v1/playlist_songs?playlist_id=eq.{playlist_id}") as r1:
                    await r1.text()
                async with session.delete(f"{SUPABASE_URL}/rest/v1/playlists?id=eq.{playlist_id}&user_id=eq.{user_id}") as r2:
                    await r2.text()
            except Exception:
                pass

        return True

    # ==========================
    # HISTORY
    # ==========================
    async def add_history(self, guild_id: str, song: dict, user_id: str = None):
        artist_val = song.get("uploader") or song.get("artist") or "Unknown Artist"
        title_val = song.get("title", "Unknown")
        url_val = song.get("url", "")
        dur_val = int(song.get("duration") or 0)
        thumb_val = song.get("thumbnail")

        try:
            conn = sqlite3.connect(SQLITE_PATH)
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO play_history (guild_id, user_id, title, url, duration, thumbnail, uploader)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (str(guild_id), str(user_id) if user_id else None, title_val, url_val, dur_val, thumb_val, artist_val))
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"[History Save Error] {e}")

        if self.use_supabase:
            try:
                payload = {
                    "guild_id": str(guild_id),
                    "user_id": str(user_id) if user_id else None,
                    "title": title_val,
                    "url": url_val,
                    "duration": dur_val,
                    "thumbnail": thumb_val,
                    "uploader": artist_val
                }
                session = await self.get_session()
                async with session.post(f"{SUPABASE_URL}/rest/v1/play_history", json=payload) as resp:
                    await resp.text()
            except Exception:
                pass

    async def get_history(self, guild_id: str, limit: int = 25) -> list[dict]:
        # Coba Supabase
        if self.use_supabase:
            try:
                session = await self.get_session()
                async with session.get(f"{SUPABASE_URL}/rest/v1/play_history?guild_id=eq.{guild_id}&order=id.desc&limit={limit}") as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        if data and isinstance(data, list):
                            return [
                                {
                                    "id": r.get("id"),
                                    "title": r.get("title"),
                                    "url": r.get("url"),
                                    "duration": r.get("duration", 0),
                                    "thumbnail": r.get("thumbnail"),
                                    "uploader": r.get("uploader") or r.get("artist") or "Artis",
                                    "played_at": r.get("played_at") or r.get("created_at")
                                }
                                for r in data
                            ]
                    else:
                        await resp.text()
            except Exception:
                pass

        # Fallback lokal
        try:
            conn = sqlite3.connect(SQLITE_PATH)
            cur = conn.cursor()
            cur.execute("""
                SELECT id, title, url, duration, thumbnail, uploader, played_at
                FROM play_history
                WHERE guild_id = ?
                ORDER BY id DESC
                LIMIT ?
            """, (str(guild_id), limit))
            rows = cur.fetchall()
            conn.close()
            return [
                {"id": r[0], "title": r[1], "url": r[2], "duration": r[3], "thumbnail": r[4], "uploader": r[5], "played_at": r[6]}
                for r in rows
            ]
        except Exception as e:
            print(f"[History Get Error] {e}")
            return []

db = DatabaseManager()
