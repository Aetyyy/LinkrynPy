"""
Modular Server Handlers for Linkryn Web Dashboard.
Memisahkan seluruh tanggung jawab routing web server ke dalam modul-modul kohesif.
"""

from .auth_handler import AuthHandlerMixin
from .status_handler import StatusHandlerMixin
from .playback_handler import PlaybackHandlerMixin
from .filter_handler import FilterHandlerMixin
from .library_handler import LibraryHandlerMixin
from .playlist_handler import PlaylistHandlerMixin

__all__ = [
    "AuthHandlerMixin",
    "StatusHandlerMixin",
    "PlaybackHandlerMixin",
    "FilterHandlerMixin",
    "LibraryHandlerMixin",
    "PlaylistHandlerMixin",
]

