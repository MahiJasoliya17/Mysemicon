"""Settings the owner can change from the admin panel (e-mail sending, online-payment keys).

They are saved in the database, so no server access is needed; an environment variable (see config.py) is only the fallback.
Secrets are never sent back to the browser, only whether they are set.
"""
import time
from typing import Any, Dict

from backend import config, db

# setting -> (config fallback, is a secret)
FIELDS = {
    "smtp_host": ("SMTP_HOST", False), "smtp_port": ("SMTP_PORT", False), "smtp_user": ("SMTP_USER", False),
    "smtp_password": ("SMTP_PASSWORD", True), "mail_from": ("MAIL_FROM", False), "notify_to": ("NOTIFY_TO", False),
    "site_url": ("SITE_URL", False),
    "razorpay_key_id": ("RAZORPAY_KEY_ID", False), "razorpay_key_secret": ("RAZORPAY_KEY_SECRET", True),
    "razorpay_webhook_secret": ("RAZORPAY_WEBHOOK_SECRET", True),
}
GROUPS = {"email": ["smtp_host", "smtp_port", "smtp_user", "smtp_password", "mail_from", "notify_to"],
          "payments": ["razorpay_key_id", "razorpay_key_secret", "razorpay_webhook_secret"], "site": ["site_url"]}
_cache: Dict[str, Any] = {"t": 0.0, "v": {}}


def _stored() -> Dict[str, str]:
    if time.time() - _cache["t"] > 15:
        try:
            _cache["v"] = {r["key"]: r["value"] for r in db.fetch_all("SELECT key, value FROM app_secrets")}
        except Exception:
            _cache["v"] = {}
        _cache["t"] = time.time()
    return _cache["v"]


def get(key: str, default: str = "") -> str:
    """Saved value, else the environment value, else `default`."""
    v = _stored().get(key)
    if v not in (None, ""):
        return v
    if key in FIELDS:
        env = getattr(config, FIELDS[key][0], "")
        return str(env) if env not in (None, "") else default
    return default


def get_secret(key: str) -> str:
    """Values that are not owner-editable settings (e.g. the push keys); stored in the same table."""
    return _stored().get(key, "")


def put(key: str, value: str) -> None:
    db.execute("INSERT INTO app_secrets (key, value) VALUES (%s, %s) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated = LOCALTIMESTAMP",
               (key, value))
    _cache["t"] = 0.0


def save(values: Dict[str, Any]) -> None:
    """Save the fields the owner filled in. A blank secret means "keep the current one"; a blank plain field clears it."""
    for k, v in values.items():
        if k not in FIELDS:
            continue
        v = str(v).strip()
        if FIELDS[k][1] and v == "":
            continue
        put(k, v)


def clear(group: str) -> None:
    for k in GROUPS.get(group, []):
        put(k, "")


def status() -> Dict[str, Any]:
    """What the admin form shows: plain values as they are, secrets only as set / not set."""
    out = {}
    for k, (_, secret) in FIELDS.items():
        v = get(k)
        out[k] = {"set": bool(v), "secret": secret, "value": "" if secret else v}
    return out


def email_on() -> bool:
    return bool(get("smtp_host"))


def payments_on() -> bool:
    return bool(get("razorpay_key_id") and get("razorpay_key_secret"))
