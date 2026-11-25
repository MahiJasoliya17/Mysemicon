"""Live price / stock readings from the source store, remembered in the `live_prices` table.

A reading is trusted for LIVE_TTL_SECONDS; products edited in the admin panel (product_locks) are never overwritten.
"""
import json
import threading
import time
from typing import Any, Dict, Optional

from backend import config, db

_QUERY = """query P($slug: String!) { productdetails(slug: $slug, preview_token: "") { data {
  id in_stock available_quantity tags { name slug } price { regular final special discount }
  moq_prices { range_key range_from range_to price } faqs { question answer }
  warranty { id title description } reviews { total average_rating }
  specification { key value } other_info { country_of_origin } } } }"""
_http = threading.local()


def cached(slug: str, product_id: str = "") -> Optional[Dict[str, Any]]:
    """Latest stored reading (no network); `ts` is the unix time it was taken."""
    try:
        return db.fetch_one("SELECT *, fetched_at AS ts FROM live_prices WHERE slug = %s OR product_id = %s",
                            (slug, product_id or slug))
    except Exception:
        return None


def is_locked(product_id: str) -> bool:
    """True when the product was edited in the admin panel."""
    try:
        return db.fetch_val("SELECT 1 FROM product_locks WHERE product_id = %s", (str(product_id),)) is not None
    except Exception:
        return False


def fetch(slug: str) -> Optional[Dict[str, Any]]:
    """Read the current price, stock, quantity tiers, FAQs and tags from the source store and remember them."""
    if not config.LIVE_SYNC:
        return None
    current = cached(slug)
    if current and time.time() - current["ts"] < config.LIVE_TTL_SECONDS:
        return current
    try:
        from curl_cffi import requests as http
        session = getattr(_http, "session", None) or http.Session(impersonate="chrome120")
        _http.session = session
        resp = session.post("https://robu.in/api/proxy/graphql", json={"query": _QUERY, "variables": {"slug": slug}},
                            headers={"Origin": "https://robu.in", "Referer": f"https://robu.in/product/{slug}/"}, timeout=8)
        data = ((resp.json().get("data") or {}).get("productdetails") or {}).get("data")
        if resp.status_code != 200 or not data:
            return current
        price = data.get("price") or {}
        tiers = [{"range": m.get("range_key"), "from_qty": m.get("range_from"), "to_qty": m.get("range_to"), "price": m.get("price")}
                 for m in data.get("moq_prices") or []]
        tags = [{"name": t["name"], "slug": t.get("slug") or ""} for t in data.get("tags") or [] if t.get("name")]
        warranty = data.get("warranty")
        reviews = data.get("reviews")
        specs = data.get("specification")
        country = (data.get("other_info") or {}).get("country_of_origin")
        db.execute(
            "INSERT INTO live_prices (slug, product_id, fetched_at, price, regular, in_stock, qty, tiers, faqs, tags, warranty, reviews, specs, country) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) ON CONFLICT (slug) DO UPDATE SET product_id = EXCLUDED.product_id, "
            "fetched_at = EXCLUDED.fetched_at, price = EXCLUDED.price, regular = EXCLUDED.regular, in_stock = EXCLUDED.in_stock, "
            "qty = EXCLUDED.qty, tiers = EXCLUDED.tiers, faqs = EXCLUDED.faqs, tags = EXCLUDED.tags, "
            "warranty = EXCLUDED.warranty, reviews = EXCLUDED.reviews, specs = EXCLUDED.specs, country = EXCLUDED.country",
            (slug, str(data.get("id")), time.time(), price.get("final"), price.get("regular"), bool(data.get("in_stock")),
             int(float(data.get("available_quantity") or 0)), db.Json(tiers), db.Json(data.get("faqs") or []), db.Json(tags),
             db.Json(warranty) if warranty else None, db.Json(reviews) if reviews else None, db.Json(specs) if specs else None, country))
        return cached(slug)
    except Exception:
        return current


def apply(card: Dict[str, Any], reading: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Overlay a live reading on a product card (price, MRP, discount, stock)."""
    if not reading or reading.get("price") is None:
        return card
    final = float(reading["price"])
    regular = float(reading.get("regular") or final)
    if final <= 0 < regular:
        final = regular
    regular = max(regular, final)
    card.update(price=final, regular=regular,
                discount=round((regular - final) / regular * 100) if regular > final > 0 else 0,
                in_stock=bool(reading["in_stock"]), qty=int(reading["qty"] or 0))
    return card
