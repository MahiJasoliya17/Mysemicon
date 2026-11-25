"""Show this store's name instead of the source store's, and point mirrored images at local copies.

  brand_text(text)      product / category names
  rebrand_html(html)    descriptions and articles (also removes <script> blocks and keeps links on this site)
  rebrand_json(obj)     any JSON-able value: visible text is renamed, URLs / slugs / file names are left alone
  middleware            applies rebrand_json to the content-heavy /api responses
"""
import html as htmllib
import json
import re

from fastapi import Request, Response

from backend import config, content

NAME = config.STORE_NAME

# API paths whose JSON is rewritten before it is sent
_PATHS = ("/api/faqs", "/api/settings", "/api/service-options", "/api/product/", "/api/page/", "/api/blogs", "/api/home", "/api/site", "/api/menu", "/api/jobs",
          "/api/videos", "/api/brands", "/api/featured", "/api/hero", "/api/brand/", "/api/category/", "/api/tag/")
_SKIP_KEYS = {"slug", "url", "link", "href", "image", "image_url", "banner", "banner_url", "logo", "img", "src", "id", "created_at", "path"}
_NAME = re.compile(r"(?<![\w/.@%=\-])ROBU\.IN(?![\w/\-])|(?<![\w/.@%=\-])Robu(?:\.in)?(?:(?=[’'])|(?![\w/\-]))", re.I)
_AT_NAME = re.compile(r"(?<=\s)@ROBU\.IN\b", re.I)
_EMAIL = re.compile(r"([\w.\-]+)@(?:www\.)?robu\.in(?![\w\-])", re.I)
_SUPPORT_URL = re.compile(r"https?://support\.robu\.in/?", re.I)
_MEDIA_URL = re.compile(
    r"https?://robu-prod-media\.s3[\w.\-]*\.amazonaws\.com/[^\s\"'<>)\\]+|"
    r"https?://(?:www\.)?robu\.in/_next/image/\?url=[^\s\"'<>)\\]+|"
    r"https?://(?:www\.|backend\.)?robu\.in/(?:wp-content|images|media|storage)/[^\s\"'<>)\\]+", re.I)


def _swap_email(match: "re.Match") -> str:
    """info@robu.in -> the store address; any other name@robu.in -> name@<store domain>."""
    local = match.group(1).lower()
    return config.STORE_EMAIL if local in ("info", "support", "contact") else f"{local}@{config.STORE_EMAIL.split('@')[1]}"


def _contact_links(text: str) -> str:
    """Source-store e-mail addresses and support-portal links -> this store's own."""
    text = _SUPPORT_URL.sub("/contact/", text)
    text = text.replace(">/contact/<", ">MySemicon support<")
    return _EMAIL.sub(_swap_email, text)


def brand_text(text: str) -> str:
    """Robu / Robu.in -> MySemicon."""
    return re.sub(r"\bRobu(?:\.in)?\b", NAME, text or "", flags=re.I)


def rebrand_html(html: str) -> str:
    if not html:
        return ""
    html = re.sub(r"<script.*?</script>", "", html, flags=re.S | re.I)
    html = _contact_links(html)
    html = re.sub(r"https?://(?:www\.)?robu\.in/", "/", html)
    html = re.sub(r"\bRobu\.in\b", NAME, html)
    html = re.sub(r"\bRobu's\b", NAME + "'s", html)
    html = re.sub(r"\bROBU(?:\.IN)?\b", NAME.upper(), html)
    return re.sub(r"\bRobu\b", NAME, html)


def _rename(match: "re.Match") -> str:
    text = match.group(0)
    return NAME.upper() if text.isupper() else NAME


def rebrand_text(text: str) -> str:
    """Rename the source store in visible copy; URLs, slugs and e-mail addresses are left alone."""
    if "obu" not in text.lower() or text.startswith(("http://", "https://", "/")) and " " not in text:
        return text
    text = _contact_links(text)
    return _NAME.sub(_rename, _AT_NAME.sub(NAME.upper(), text))


def localize(text: str) -> str:
    """Replace source-store image URLs by the local copies listed in the `mirror_map` content document."""
    if "robu" not in text.lower():
        return text
    mirror = content.get("mirror_map", {})
    return _MEDIA_URL.sub(lambda m: mirror.get(htmllib.unescape(m.group(0)), m.group(0)), text)


def rebrand_json(value, key: str = ""):
    if isinstance(value, str):
        value = localize(value)
        return value if key in _SKIP_KEYS else rebrand_text(value)
    if isinstance(value, list):
        return [rebrand_json(v, key) for v in value]
    if isinstance(value, dict):
        return {k: rebrand_json(v, k) for k, v in value.items()}
    return value


async def middleware(request: Request, call_next):
    response = await call_next(request)
    if response.status_code != 200 or not request.url.path.startswith(_PATHS):
        return response
    body = b"".join([chunk async for chunk in response.body_iterator])
    try:
        body = json.dumps(rebrand_json(json.loads(body)), ensure_ascii=False).encode()
    except ValueError:
        pass
    headers = {k: v for k, v in response.headers.items() if k.lower() not in ("content-length", "content-type")}
    return Response(content=body, status_code=200, headers=headers, media_type="application/json")
