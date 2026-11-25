"""'Notify me when it is back': customers leave a device (push) and/or an e-mail on an out-of-stock product, and are told as soon as it is in stock.

check_all() runs every few minutes in the background and right after the admin changes stock; it asks the live source for
subscribed products only, so the load stays tiny.
"""
import html
import logging
import threading
from typing import Any, Dict, Optional

from backend import config, db, integrations, live, notify, push

log = logging.getLogger("mysemicon.restock")
_lock = threading.Lock()


def subscribe(product_id: str, email: str, endpoint: str) -> Dict[str, Any]:
    prod = db.fetch_one("SELECT id, slug, name FROM products WHERE id = %s", (str(product_id),))
    if not prod:
        raise LookupError("Product not found")
    dup = db.fetch_one(
        "SELECT id FROM restock_requests WHERE product_id = %s AND notified_at IS NULL "
        "AND ((%s <> '' AND endpoint = %s) OR (%s <> '' AND email = %s))", (prod["id"], endpoint, endpoint, email, email))
    if not dup:
        db.execute("INSERT INTO restock_requests (product_id, slug, name, email, endpoint) VALUES (%s, %s, %s, %s, %s)",
                   (prod["id"], prod["slug"], prod["name"], email, endpoint))
    return prod


def is_subscribed(product_id: str, endpoint: str) -> bool:
    return bool(endpoint) and db.fetch_one(
        "SELECT 1 AS x FROM restock_requests WHERE product_id = %s AND endpoint = %s AND notified_at IS NULL", (str(product_id), endpoint)) is not None


def available(product_id: str, slug: str) -> bool:
    """Is it buyable now? Uses the live reading unless the product was edited in the admin panel."""
    row = db.fetch_one("SELECT in_stock FROM products WHERE id = %s", (product_id,))
    if not row:
        return False
    in_stock = bool(row["in_stock"])
    if config.LIVE_SYNC and not live.is_locked(product_id):
        try:
            reading = live.fetch(slug)
            if reading and reading.get("price") is not None:
                in_stock = bool(reading["in_stock"])
        except Exception as e:
            log.warning("live read failed for %s: %s", slug, e)
    return in_stock


def notify_product(product_id: str) -> int:
    """Tell everyone waiting for this product, once. Returns how many requests were closed."""
    with db.transaction() as cur:
        cur.execute("UPDATE restock_requests SET notified_at = LOCALTIMESTAMP WHERE product_id = %s AND notified_at IS NULL RETURNING *", (product_id,))
        reqs = cur.fetchall()
    if not reqs:
        return 0
    name, slug = reqs[0]["name"], reqs[0]["slug"]
    url = f"/product/{slug}/"
    payload = {"title": f"Back in stock: {name[:80]}", "body": "It is available again. Tap to buy before it sells out.", "url": url, "tag": f"restock-{product_id}"}
    endpoints = [r["endpoint"] for r in reqs if r["endpoint"]]
    if endpoints:
        push.send(db.fetch_all("SELECT * FROM push_subscriptions WHERE endpoint = ANY(%s)", (endpoints,)), payload)
    link = integrations.get('site_url').rstrip('/') + url
    for r in reqs:
        if r["email"]:
            notify.send(r["email"], f"{config.STORE_NAME}: {name[:70]} is back in stock",
                        f"Good news! {name} is back in stock.\n\nBuy it here: {link}\n\nStock can sell out quickly, so order soon.\n",
                        f"<div style='font-family:Segoe UI,Arial,sans-serif'><h2>{html.escape(name[:90])} is back in stock</h2><p>Stock can sell out quickly.</p>"
                        f"<p><a href='{link}' style='background:#2a1f38;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none'>Buy now</a></p></div>")
    push.notify_admin("restock", f"{len(reqs)} customer{'s' if len(reqs) != 1 else ''} told: {name[:60]} is back", "They asked to be notified and have been.", f"/admin#/products")
    return len(reqs)


def check_all() -> int:
    """One pass over every product somebody is waiting for."""
    if not _lock.acquire(blocking=False):
        return 0
    done = 0
    try:
        for r in db.fetch_all("SELECT product_id, MIN(slug) AS slug FROM restock_requests WHERE notified_at IS NULL GROUP BY product_id"):
            if available(r["product_id"], r["slug"]):
                done += notify_product(r["product_id"])
    except Exception as e:
        log.warning("restock check failed: %s", e)
    finally:
        _lock.release()
    return done


def kick() -> None:
    """Run a pass right now in the background (after the admin changes stock)."""
    threading.Thread(target=check_all, daemon=True).start()
