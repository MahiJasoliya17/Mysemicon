"""Site content stored in PostgreSQL: keyed documents (home, pages, faqs, ...) and blog posts.

    content.get("home", {})              # the document, cached in memory
    content.save("faqs", items)          # write it back (and refresh the cache)
    content.blog_posts()                 # [{slug, title, created_at, ...}] newest first, without the body
    content.blog_html(slug)              # the article body, or None
    content.save_blog(post, html)        # insert / update
    content.delete_blog(slug)

Documents used: home, pages, faqs, jobs, videos, site, settings, service_extra, service_options,
services_exact_robu, mirror_map.
"""
import copy
import threading
from typing import Any, Dict, List, Optional

from backend import db

_lock = threading.Lock()
_docs: Dict[str, Any] = {}
_blogs: Optional[List[Dict[str, Any]]] = None


def get(key: str, default: Any = None) -> Any:
    """Return a deep copy of the stored document, so callers may modify it freely."""
    with _lock:
        if key not in _docs:
            row = db.fetch_one("SELECT data FROM content WHERE key = %s", (key,))
            _docs[key] = row["data"] if row else None
        value = _docs[key]
    return copy.deepcopy(default if value is None else value)


def save(key: str, data: Any) -> None:
    db.execute(
        "INSERT INTO content (key, data, updated_at) VALUES (%s, %s, LOCALTIMESTAMP) "
        "ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = LOCALTIMESTAMP",
        (key, db.Json(data)))
    with _lock:
        _docs[key] = copy.deepcopy(data)


def refresh() -> None:
    """Forget every cached document (after content was changed outside the app)."""
    global _blogs
    with _lock:
        _docs.clear()
        _blogs = None


# ------------------------------------------------------------------ blog posts
def blog_posts() -> List[Dict[str, Any]]:
    """All posts, newest first, without their HTML body."""
    global _blogs
    with _lock:
        if _blogs is None:
            _blogs = [r["data"] for r in db.fetch_all("SELECT data FROM blog_posts ORDER BY created_at DESC")]
        return copy.deepcopy(_blogs)


def blog_html(slug: str) -> Optional[str]:
    row = db.fetch_one("SELECT html FROM blog_posts WHERE slug = %s", (slug,))
    return row["html"] if row else None


def save_blog(post: Dict[str, Any], html: Optional[str] = None) -> None:
    """Insert or update a post. `html=None` keeps the stored body."""
    global _blogs
    db.execute(
        "INSERT INTO blog_posts (slug, created_at, data, html) VALUES (%s, %s, %s, COALESCE(%s, '')) "
        "ON CONFLICT (slug) DO UPDATE SET created_at = EXCLUDED.created_at, data = EXCLUDED.data, "
        "html = COALESCE(%s, blog_posts.html)",
        (post["slug"], post.get("created_at") or None, db.Json(post), html, html))
    with _lock:
        _blogs = None


def delete_blog(slug: str) -> None:
    global _blogs
    db.execute("DELETE FROM blog_posts WHERE slug = %s", (slug,))
    with _lock:
        _blogs = None
