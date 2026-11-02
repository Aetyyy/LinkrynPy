import os
import time
import urllib.parse
import aiohttp
from aiohttp import web
from dotenv import load_dotenv
from database import db

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))
DISCORD_CLIENT_ID = os.getenv("DISCORD_CLIENT_ID", "")
DISCORD_CLIENT_SECRET = os.getenv("DISCORD_CLIENT_SECRET", "")

class AuthHandlerMixin:
    """Modul penanganan autentikasi Discord OAuth2 dan manajemen sesi pengguna."""

    def extract_token(self, request):
        if not request:
            return ""
        auth_header = request.headers.get("Authorization", "")
        if auth_header and "Bearer " in auth_header:
            return auth_header.replace("Bearer ", "").strip()
        return request.query.get("token") or ""

    async def get_current_user(self, request):
        if not request:
            return None
        auth_header = request.headers.get("Authorization", "")
        token = auth_header.replace("Bearer ", "").strip() if auth_header else request.query.get("token")
        if not token:
            return None
        if token in self.user_sessions:
            return self.user_sessions[token]

        # Pulihkan sesi dari database users jika bot sempat restart
        user = await db.get_user_by_token(token)
        if user:
            self.user_sessions[token] = user
            return user
        return None

    async def get_auth_me(self, request):
        token = self.extract_token(request)
        user = self.user_sessions.get(token) if token else None

        # Jika belum ada di memory session, pulihkan dari SQLite/Supabase database users
        if not user and token:
            user = await db.get_user_by_token(token)
            if user:
                self.user_sessions[token] = user

        if not user:
            return self.json_response({"authenticated": False})

        u_guild, u_channel = self.find_user_presence(user["id"])
        user_data = dict(user)
        user_data["current_guild_id"] = str(u_guild.id) if u_guild else None
        user_data["current_voice_channel"] = u_channel.name if u_channel else None
        return self.json_response({"authenticated": True, "user": user_data})

    async def get_auth_config(self, request):
        client_id = DISCORD_CLIENT_ID or (str(self.bot.user.id) if self.bot.user else "")
        has_secret = bool(DISCORD_CLIENT_SECRET)
        redirect_uri = f"http://{request.host}/api/auth/callback"
        return self.json_response({
            "has_discord_oauth": bool(client_id),
            "has_secret": has_secret,
            "client_id": client_id,
            "redirect_uri": redirect_uri
        })

    async def discord_login_redirect(self, request):
        client_id = DISCORD_CLIENT_ID or (str(self.bot.user.id) if self.bot.user else "")
        if not client_id:
            return web.HTTPFound("/?auth_error=no_client_id")

        redirect_uri = urllib.parse.quote(f"http://{request.host}/api/auth/callback")

        # Jika client secret ada, gunakan Authorization Code flow standar. Jika tidak, gunakan Implicit Grant
        if DISCORD_CLIENT_SECRET:
            discord_url = f"https://discord.com/api/oauth2/authorize?client_id={client_id}&redirect_uri={redirect_uri}&response_type=code&scope=identify"
        else:
            discord_url = f"https://discord.com/api/oauth2/authorize?client_id={client_id}&redirect_uri={redirect_uri}&response_type=token&scope=identify"

        return web.HTTPFound(discord_url)

    async def discord_oauth_callback(self, request):
        code = request.query.get("code")
        client_id = DISCORD_CLIENT_ID or (str(self.bot.user.id) if self.bot.user else "")

        # 1. Flow dengan Authorization Code (jika secret tersedia)
        if code and DISCORD_CLIENT_SECRET and client_id:
            redirect_uri = f"http://{request.host}/api/auth/callback"
            token_url = "https://discord.com/api/oauth2/token"
            data = {
                "client_id": client_id,
                "client_secret": DISCORD_CLIENT_SECRET,
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": redirect_uri
            }

            async with aiohttp.ClientSession() as session:
                async with session.post(token_url, data=data) as resp:
                    if resp.status != 200:
                        return web.HTTPFound("/?auth_error=token_failed")
                    token_data = await resp.json()
                    access_token = token_data.get("access_token")

                # Ambil data user dari Discord API
                headers = {"Authorization": f"Bearer {access_token}"}
                async with session.get("https://discord.com/api/users/@me", headers=headers) as user_resp:
                    if user_resp.status != 200:
                        return web.HTTPFound("/?auth_error=user_failed")
                    user_info = await user_resp.json()

            token = f"oauth_{user_info['id']}_{int(time.time())}"
            avatar_url = f"https://cdn.discordapp.com/avatars/{user_info['id']}/{user_info['avatar']}.png" if user_info.get("avatar") else "https://cdn.discordapp.com/embed/avatars/0.png"
            user_data = {
                "id": str(user_info["id"]),
                "username": user_info["username"],
                "display_name": user_info.get("global_name") or user_info["username"],
                "avatar": avatar_url,
                "access_token": access_token,
                "token": token
            }
            self.user_sessions[token] = user_data
            await db.save_user(user_data)
            return web.HTTPFound(f"/?token={token}")

        # 2. Flow Implicit Grant (token diteruskan di browser fragment #access_token=...)
        bridge_html = """<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Menghubungkan Linkryn...</title>
</head>
<body style="background:#0c0c0c;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
  <div style="text-align:center;">
    <p style="font-size:18px;font-weight:bold;">Menghubungkan Akun Discord Anda...</p>
    <p style="font-size:13px;color:#888;">Mohon tunggu sebentar...</p>
  </div>
  <script>
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    if (accessToken) {
      fetch('/api/auth/token_exchange', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ access_token: accessToken })
      })
      .then(res => res.json())
      .then(data => {
        if (data.token) {
          localStorage.setItem('linkryn_token', data.token);
          window.location.href = '/';
        } else {
          window.location.href = '/?auth_error=' + encodeURIComponent(data.error || 'failed');
        }
      })
      .catch(function(err) {
        window.location.href = '/?auth_error=network';
      });
    } else {
      window.location.href = '/?auth_error=no_token';
    }
  </script>
</body>
</html>"""
        return web.Response(text=bridge_html, content_type="text/html")

    async def post_token_exchange(self, request):
        """Menerima access_token dari Implicit Grant OAuth2 dan menyimpan user ke database."""
        try:
            body = await request.json()
        except Exception:
            return self.json_response({"error": "Invalid JSON"}, 400)

        access_token = body.get("access_token")
        if not access_token:
            return self.json_response({"error": "Missing access_token"}, 400)

        async with aiohttp.ClientSession() as session:
            headers = {"Authorization": f"Bearer {access_token}"}
            async with session.get("https://discord.com/api/users/@me", headers=headers) as user_resp:
                if user_resp.status != 200:
                    return self.json_response({"error": "Failed to fetch user from Discord"}, 400)
                user_info = await user_resp.json()

        token = f"oauth_{user_info['id']}_{int(time.time())}"
        avatar_url = f"https://cdn.discordapp.com/avatars/{user_info['id']}/{user_info['avatar']}.png" if user_info.get("avatar") else "https://cdn.discordapp.com/embed/avatars/0.png"
        user_data = {
            "id": str(user_info["id"]),
            "username": user_info["username"],
            "display_name": user_info.get("global_name") or user_info["username"],
            "avatar": avatar_url,
            "access_token": access_token,
            "token": token
        }
        self.user_sessions[token] = user_data
        await db.save_user(user_data)
        return self.json_response({"success": True, "token": token, "user": user_data})

