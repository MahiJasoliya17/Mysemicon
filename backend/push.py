"""Web push notifications to a phone or browser, plus the admin notification list.

Customers get "back in stock" alerts; the owner and staff get new-order / enquiry alerts even when the admin tab is closed.
Push works on Android and desktop browsers over HTTPS (localhost is allowed for testing). On iPhone the site must first be
added to the Home Screen, so an e-mail address is always offered as a fallback.
"""
import base64
import json
import logging
import threading
from typing import Any, Dict, Iterable, List, Optional

from backend import config, db, integrations

log = logging.getLogger("mysemicon.push")
_webpush = None            # pywebpush.webpush, imported lazily (tests replace it)


def _b64(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def _vapid():
    from py_vapid import Vapid01
    pem = integrations.get_secret("vapid_private")
    if pem:
        return Vapid01.from_pem(pem.encode())
    v = Vapid01()
    v.generate_keys()
    integrations.put("vapid_private", v.private_pem().decode())
    return v


def public_key() -> str:
    """Application server key the browser needs to subscribe."""
    from cryptography.hazmat.primitives import serialization
    pub = _vapid().public_key.public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
    return _b64(pub)


def save_subscription(sub: Dict[str, Any], audience: str, admin_id: Optional[int] = None) -> int:
    keys = sub.get("keys") or {}
    if not (sub.get("endpoint") and keys.get("p256dh") and keys.get("auth")):
        raise ValueError("Incomplete push subscription")
    row = db.fetch_one(
        "INSERT INTO push_subscriptions (endpoint, p256dh, auth, audience, admin_id) VALUES (%s, %s, %s, %s, %s) "
        "ON CONFLICT (endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, "
        "audience = CASE WHEN push_subscriptions.audience = 'admin' THEN 'admin' ELSE EXCLUDED.audience END, "
        "admin_id = COALESCE(EXCLUDED.admin_id, push_subscriptions.admin_id) RETURNING id",
        (sub["endpoint"], keys["p256dh"], keys["auth"], audience, admin_id))
    return row["id"]


def _send_one(row: Dict[str, Any], payload: Dict[str, Any]) -> bool:
    """Deliver one push. Returns False when the device has unsubscribed (the subscription is then removed)."""
    global _webpush
    if _webpush is None:
        from pywebpush import webpush
        _webpush = webpush
    try:
        _webpush(subscription_info={"endpoint": row["endpoint"], "keys": {"p256dh": row["p256dh"], "auth": row["auth"]}},
                 data=json.dumps(payload), vapid_private_key=_vapid(),
                 vapid_claims={"sub": "mailto:" + (integrations.get("notify_to") or config.STORE_EMAIL)}, ttl=86400)
        return True
    except Exception as e:
        status = getattr(getattr(e, "response", None), "status_code", None)
        if status in (404, 410):
            db.execute("DELETE FROM push_subscriptions WHERE endpoint = %s", (row["endpoint"],))
            return False
        log.warning("push failed (%s): %s", status, e)
        return True


def send(rows: Iterable[Dict[str, Any]], payload: Dict[str, Any], wait: bool = False) -> int:
    """Push `payload` to the given subscriptions in the background; with wait=True returns how many were delivered."""
    rows = list(rows)
    done = {"n": 0}

    def run() -> None:
        for r in rows:
            if _send_one(r, payload):
                done["n"] += 1
    if wait:
        run()
    elif rows:
        threading.Thread(target=run, daemon=True).start()
    return done["n"]


def admin_devices() -> List[Dict[str, Any]]:
    return db.fetch_all("SELECT * FROM push_subscriptions WHERE audience = 'admin'")


def notify_admin(kind: str, title: str, body: str = "", url: str = "/admin#/orders") -> None:
    """Add to the admin notification list and push it to every enabled admin device."""
    try:
        db.execute("INSERT INTO notifications (kind, title, body, url) VALUES (%s, %s, %s, %s)", (kind, title[:200], body[:500], url))
        send(admin_devices(), {"title": title, "body": body, "url": url, "tag": kind})
    except Exception as e:                                           # a notification must never break an order or a form
        log.warning("admin notification failed: %s", e)
