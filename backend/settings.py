"""Store settings (contact details, shipping rules, invoice identity), editable in the admin panel.

Stored as the `settings` content document; anything not saved falls back to DEFAULTS.
"""
from typing import Any, Dict

from backend import content

DEFAULTS: Dict[str, Any] = {
    "phone": "1800 266 6123", "phone2": "020 68197600", "email": "support@mysemicon.com", "hours": "9:15 AM to 6:15 PM",
    "address": "Magazine Chowk, Swaraj Colony, Shri Ganesh Colony, Dighi, Pune, Maharashtra 411015",
    "free_shipping_above": 499.0, "shipping_fee": 49.0,
    "company_name": "MySemicon", "gstin": "", "state": "Maharashtra",
}
NUMERIC = ("free_shipping_above", "shipping_fee")


def get() -> Dict[str, Any]:
    return {**DEFAULTS, **content.get("settings", {})}


def save(values: Dict[str, Any]) -> Dict[str, Any]:
    """Merge `values` (known keys only) into the stored settings and return the result.
    Raises ValueError for negative amounts or non-numeric amounts."""
    current = get()
    for key in DEFAULTS:
        if key in values:
            current[key] = float(values[key]) if key in NUMERIC else str(values[key]).strip()
    if any(current[k] < 0 for k in NUMERIC):
        raise ValueError("Amounts cannot be negative")
    content.save("settings", current)
    return current


def free_shipping_above() -> float:
    return float(get()["free_shipping_above"])


def shipping_fee() -> float:
    return float(get()["shipping_fee"])
