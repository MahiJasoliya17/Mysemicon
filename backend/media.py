"""Where product photos and datasheets live: prefer our own downloaded copy, fall back to the remote URL."""
import hashlib
import os
from functools import lru_cache

from backend import config


def _candidates(url: str):
    name = os.path.basename(url.split("?")[0])
    prefix = hashlib.md5(url.encode("utf-8")).hexdigest()[:8]
    return (f"{prefix}_{name}", name)


@lru_cache(maxsize=200_000)
def _downloaded_image(url: str) -> str:
    """File name of the downloaded original of a remote image ('' when we do not have it)."""
    for name in _candidates(url):
        if os.path.exists(os.path.join(config.IMAGE_DIR, name)):
            return name
    return ""


def local_image(url: str) -> str:
    """Return the full clear downloaded original photo from robu.in, or remote URL if not yet downloaded."""
    if not url:
        return ""
    name = _downloaded_image(url)
    if not name:
        return url
    return f"/media/images/{name}"


def local_datasheet(url: str) -> str:
    for name in _candidates(url):
        if os.path.exists(os.path.join(config.DATASHEET_DIR, name)):
            return f"/media/datasheets/{name}"
    return url
