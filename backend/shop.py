"""Shopping API: cart pricing, checkout, order tracking, customer accounts, enquiries and service quotes."""
import asyncio
import base64
import hashlib
import hmac
import json
import logging
import os
import re
import secrets
import time
import urllib.error
import urllib.request
from typing import Any, Dict, List, Optional

import psycopg2.errors
from fastapi import APIRouter, File, Form, Header, HTTPException, Request, UploadFile
from fastapi.responses import HTMLResponse, StreamingResponse

from backend import config, content, db, integrations, invoice, live, notify, push, restock, settings
from backend.catalog import LIST_COLS, card

router = APIRouter()
_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
LIVE_PRICE_MAX_AGE = 6 * 3600          # a stored live reading older than this is ignored in the cart


def _now() -> str:
    return time.strftime("%Y-%m-%d %H:%M:%S")


# ------------------------------------------------------------------ cart + checkout
def _quote(items: List[Dict[str, Any]]) -> Dict[str, Any]:
    ids = [str(it.get("id")) for it in items]
    rows = {r["id"]: r for r in db.fetch_all(f"SELECT {LIST_COLS}, p.moq_tiers FROM products p WHERE p.id = ANY(%s)", (ids,))}
    lines, subtotal = [], 0.0
    for it in items:
        pid = str(it.get("id"))
        row = rows.get(pid)
        if not row:
            continue
        qty = max(1, min(int(it.get("qty", 1)), 100_000))
        line = card(row)
        reading = live.cached(line["slug"], line["id"]) if config.LIVE_SYNC and not live.is_locked(line["id"]) else None
        fresh = reading if reading and time.time() - reading["ts"] < LIVE_PRICE_MAX_AGE else None
        if fresh:
            live.apply(line, fresh)
        unit = line["price"]
        tiers = (fresh["tiers"] if fresh and fresh["tiers"] else row["moq_tiers"]) or []
        for tier in sorted(tiers, key=lambda x: x.get("from_qty", 0)):
            if qty >= tier.get("from_qty", 0) and tier.get("price"):
                unit = float(tier["price"])
        total = round(unit * qty, 2)
        subtotal += total
        lines.append({**line, "qty": qty, "qty_available": line.get("qty"), "unit": unit, "line_total": total})
    free_above = settings.free_shipping_above()
    shipping = 0.0 if (subtotal >= free_above or subtotal == 0) else settings.shipping_fee()
    return {"items": lines, "subtotal": round(subtotal, 2), "gst_included": round(subtotal * 0.18 / 1.18, 2),
            "shipping": shipping, "total": round(subtotal + shipping, 2), "free_shipping_above": free_above}


@router.post("/api/cart/quote")
def cart_quote(payload: Dict[str, Any]):
    return _quote(payload.get("items", []))


def _user_from(authorization: Optional[str]) -> Optional[Dict[str, Any]]:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    return db.fetch_one(
        "SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id "
        "WHERE s.token = %s AND NOT u.disabled AND s.created >= LOCALTIMESTAMP - INTERVAL '30 days'", (authorization[7:],))


log = logging.getLogger("mysemicon.shop")
UNPAID = ("Awaiting payment", "Payment failed")


def online_enabled() -> bool:
    return True


@router.get("/api/payment/config")
def payment_config():
    """What the checkout page may offer: online payment (key id only, never the secret) and cash on delivery."""
    is_live = integrations.payments_on()
    return {"online": True, "demo": not is_live, "key_id": integrations.get("razorpay_key_id") if is_live else "rzp_test_demo",
            "cod": config.COD_ENABLED, "cod_max": config.COD_MAX_ORDER, "mail": notify.enabled()}


def _gateway(path: str, body: Dict[str, Any]) -> Dict[str, Any]:
    token = base64.b64encode(f"{integrations.get('razorpay_key_id')}:{integrations.get('razorpay_key_secret')}".encode()).decode()
    req = urllib.request.Request("https://api.razorpay.com/v1/" + path, data=json.dumps(body).encode(), method="POST",
                                 headers={"Content-Type": "application/json", "Authorization": "Basic " + token})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as e:
        log.error("gateway rejected %s: %s", path, e.read()[:300])
        raise HTTPException(502, "The payment gateway could not start this payment. Please try again.")
    except Exception as e:                                           # network down, timeout, bad JSON
        log.error("gateway unreachable: %s", e)
        raise HTTPException(502, "The payment gateway is not reachable right now. Please try again in a minute.")


def _start_payment(order: Dict[str, Any]) -> Dict[str, Any]:
    """Create the gateway order for this store order and remember its id; returns what Razorpay Checkout needs."""
    if not integrations.payments_on():
        gid = f"order_demo_{order['order_id']}"
        db.execute("UPDATE orders SET payload = jsonb_set(payload, '{gateway_order_id}', to_jsonb(%s::text)) WHERE order_id = %s",
                   (gid, order["order_id"]))
        return {"key": "rzp_test_demo", "order_id": gid, "amount": int(round(order["total"] * 100)), "currency": "INR", "demo": True}
    g = _gateway("orders", {"amount": int(round(order["total"] * 100)), "currency": "INR", "receipt": order["order_id"],
                            "notes": {"order_id": order["order_id"]}})
    db.execute("UPDATE orders SET payload = jsonb_set(payload, '{gateway_order_id}', to_jsonb(%s::text)) WHERE order_id = %s",
               (g["id"], order["order_id"]))
    return {"key": integrations.get("razorpay_key_id"), "order_id": g["id"], "amount": g["amount"], "currency": "INR", "demo": False}


def _stock_check(quote: Dict[str, Any]) -> None:
    for l in quote["items"]:
        if not l.get("in_stock"):
            raise HTTPException(409, f"'{l['name'][:60]}' is out of stock. Please remove it from your cart.")
        have = l.get("qty_available")
        if have is not None and have > 0 and l["qty"] > have:
            raise HTTPException(409, f"Only {have} units of '{l['name'][:60]}' are available. Please reduce the quantity.")


@router.post("/api/checkout")
def checkout(payload: Dict[str, Any], authorization: Optional[str] = Header(None)):
    quote = _quote(payload.get("items", []))
    if not quote["items"]:
        raise HTTPException(400, "Cart is empty")
    for field in ("name", "phone", "address", "city", "state", "pincode"):
        if not str(payload.get(field, "")).strip():
            raise HTTPException(400, f"Missing {field}")
    if not re.fullmatch(r"[6-9]\d{9}", re.sub(r"\D", "", str(payload["phone"]))[-10:]):
        raise HTTPException(400, "Enter a valid 10-digit mobile number")
    if not re.fullmatch(r"[1-9]\d{5}", str(payload["pincode"]).strip()):
        raise HTTPException(400, "Enter a valid 6-digit pincode")
    email = str(payload.get("email", "")).strip()
    if email and not _EMAIL.match(email):
        raise HTTPException(400, "Enter a valid email address")
    _stock_check(quote)
    method = "cod" if payload.get("payment", "online") == "cod" else "online"
    if method == "cod" and not (config.COD_ENABLED and quote["total"] <= config.COD_MAX_ORDER):
        raise HTTPException(400, "Cash on delivery is not available for this order. Please pay online.")
    if method == "online" and not online_enabled():
        raise HTTPException(400, "Online payment is not enabled yet. Please choose cash on delivery.")
    user = _user_from(authorization)
    order_id = f"MS{int(time.time()) % 10_000_000:07d}{secrets.randbelow(900) + 100}"
    cod = method == "cod"
    status = "Confirmed" if cod else "Awaiting payment"
    order = {
        "order_id": order_id, "created": _now(),
        "customer": {k: str(payload.get(k, "")).strip() for k in ("name", "email", "phone", "address", "city", "state", "pincode", "gstin")},
        "payment": method, "payment_label": "Cash on delivery" if cod else "Online payment",
        "payment_status": "Pay on delivery" if cod else "Pending", "status": status, **quote,
        "history": [{"status": status, "note": "Order placed", "at": _now(), "by": "customer"}],
    }
    db.execute("INSERT INTO orders (order_id, user_id, email, phone, payload, total, status) VALUES (%s, %s, %s, %s, %s, %s, %s)",
               (order_id, user["id"] if user else None, email, order["customer"]["phone"], db.Json(order), quote["total"], status))
    if cod:
        notify.order_placed(order)
        return {**order, "email_queued": notify.enabled() and bool(order["customer"]["email"])}
    try:
        return {**order, "gateway": _start_payment(order)}
    except HTTPException:
        _set_payment(order_id, False, "", "Could not start the payment")
        raise


def _set_payment(order_id: str, ok: bool, ref: str, note: str) -> Optional[Dict[str, Any]]:
    """Move an order to Paid (status Confirmed) or Failed. A paid order is never downgraded; repeated calls change nothing."""
    with db.transaction() as cur:
        cur.execute("SELECT * FROM orders WHERE order_id = %s FOR UPDATE", (order_id,))
        r = cur.fetchone()
        if not r:
            return None
        pl = r["payload"]
        if pl.get("payment_status") == "Paid":
            return pl
        if ok:
            pl.update(status="Confirmed", payment_status="Paid", payment_ref=ref)
        elif pl.get("status") in UNPAID:
            pl.update(status="Payment failed", payment_status="Failed")
        else:
            return pl
        pl.setdefault("history", []).append({"status": pl["status"], "note": note, "at": _now(), "by": "payment gateway"})
        cur.execute("UPDATE orders SET status = %s, payload = %s WHERE order_id = %s", (pl["status"], db.Json(pl), order_id))
    if ok:
        notify.order_placed(pl)
        notify.order_push(pl, "Confirmed", "Payment received")
    return pl


@router.post("/api/payment/verify")
def payment_verify(payload: Dict[str, Any]):
    """Called by the browser after Razorpay Checkout succeeds; the signature proves the payment really happened."""
    oid, g_order, g_pay, sig = (str(payload.get(k, "")) for k in ("order_id", "razorpay_order_id", "razorpay_payment_id", "razorpay_signature"))
    row = db.fetch_one("SELECT payload FROM orders WHERE order_id = %s", (oid,))
    if not row or not online_enabled() or row["payload"].get("gateway_order_id") != g_order:
        raise HTTPException(400, "This payment does not match your order")
    if not integrations.payments_on():
        return _set_payment(oid, True, g_pay or f"pay_demo_{int(time.time())}", "Demo online payment received")
    expected = hmac.new(integrations.get("razorpay_key_secret").encode(), f"{g_order}|{g_pay}".encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, sig):
        raise HTTPException(400, "Payment verification failed. If money was deducted it will be refunded automatically.")
    return _set_payment(oid, True, g_pay, "Payment received")


@router.post("/api/payment/webhook")
async def payment_webhook(request: Request):
    """Razorpay calls this even when the customer closes the tab after paying, so no paid order is ever lost."""
    if not integrations.get("razorpay_webhook_secret"):
        raise HTTPException(503, "Webhook is not configured")
    body = await request.body()
    expected = hmac.new(integrations.get("razorpay_webhook_secret").encode(), body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, request.headers.get("x-razorpay-signature", "")):
        raise HTTPException(400, "Bad signature")
    event = json.loads(body)
    entity = ((event.get("payload") or {}).get("payment") or {}).get("entity") or {}
    order_id = (entity.get("notes") or {}).get("order_id", "")
    if not order_id and entity.get("order_id"):
        row = db.fetch_one("SELECT order_id FROM orders WHERE payload->>'gateway_order_id' = %s", (entity["order_id"],))
        order_id = row["order_id"] if row else ""
    if order_id and event.get("event") in ("payment.captured", "order.paid"):
        _set_payment(order_id, True, entity.get("id", ""), "Payment confirmed by gateway")
    elif order_id and event.get("event") == "payment.failed":
        _set_payment(order_id, False, entity.get("id", ""), "Payment failed")
    return {"ok": True}


@router.post("/api/payment/retry")
def payment_retry(payload: Dict[str, Any]):
    """Pay again for an order that is still unpaid (closed the window, card declined...)."""
    row = db.fetch_one("SELECT email, phone, payload FROM orders WHERE order_id = %s", (str(payload.get("order_id", "")).strip(),))
    contact = str(payload.get("contact", "")).strip().lower()
    if not row or not contact or contact not in (row["email"].lower(), row["phone"].lower()):
        raise HTTPException(404, "No order found for those details")
    order = row["payload"]
    if order.get("status") not in UNPAID or order.get("payment") != "online" or not online_enabled():
        raise HTTPException(400, "This order does not need a payment")
    return {**_start_payment(order), "order_id_store": order["order_id"]}


def _public(order: Dict[str, Any]) -> Dict[str, Any]:
    """The order as a customer may see it: no staff e-mail addresses in the history."""
    o = dict(order)
    o["history"] = [{k: v for k, v in h.items() if k != "by"} for h in o.get("history", [])]
    return o


@router.get("/api/order-tracking")
def order_tracking(order_id: str, contact: str):
    row = db.fetch_one("SELECT email, phone, payload FROM orders WHERE order_id = %s", (order_id.strip(),))
    if not row or not contact.strip() or contact.strip().lower() not in (row["email"].lower(), row["phone"].lower()):
        raise HTTPException(404, "No order found for those details")
    return _public(row["payload"])


@router.get("/api/order-tracking/stream")
async def order_stream(order_id: str, contact: str, request: Request):
    """Server-sent events: the customer's page gets the order again the moment its status changes (checked every 2 seconds)."""
    oid = order_id.strip()

    def load():
        row = db.fetch_one("SELECT email, phone, payload FROM orders WHERE order_id = %s", (oid,))
        if not row or not contact.strip() or contact.strip().lower() not in (row["email"].lower(), row["phone"].lower()):
            return None
        return row["payload"]
    first = await asyncio.to_thread(load)
    if first is None:
        raise HTTPException(404, "No order found for those details")

    async def events():
        last, quiet = "", 0
        yield "retry: 3000\n\n"
        while not await request.is_disconnected():
            o = await asyncio.to_thread(load)
            if o is None:
                return
            sig = f"{o.get('status')}|{o.get('payment_status')}|{len(o.get('history', []))}"
            if sig != last:
                last, quiet = sig, 0
                yield f"data: {json.dumps(_public(o))}\n\n"
            else:
                quiet += 1
                if quiet % 8 == 0:
                    yield ": keep-alive\n\n"
            await asyncio.sleep(2)
    return StreamingResponse(events(), media_type="text/event-stream", headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"})


@router.get("/api/my/orders/{order_id}")
def my_order(order_id: str, authorization: Optional[str] = Header(None)):
    """One order of the signed-in customer, so the tracking page opens without asking for e-mail or phone again."""
    user = _user_from(authorization)
    if not user:
        raise HTTPException(401, "Please sign in")
    row = db.fetch_one("SELECT payload FROM orders WHERE order_id = %s AND user_id = %s", (order_id.strip(), user["id"]))
    if not row:
        raise HTTPException(404, "No order found")
    return _public(row["payload"])


@router.get("/api/invoice/{order_id}", response_class=HTMLResponse)
def customer_invoice(order_id: str, contact: str = "", authorization: Optional[str] = Header(None)):
    """The tax invoice for the customer: same e-mail / mobile check as tracking, or the signed-in owner of the order."""
    row = db.fetch_one("SELECT * FROM orders WHERE order_id = %s", (order_id.strip(),))
    user = _user_from(authorization)
    c = contact.strip().lower()
    allowed = row and ((user and row["user_id"] == user["id"]) or (c and c in (row["email"].lower(), row["phone"].lower())))
    if not allowed or row["status"] in UNPAID:
        raise HTTPException(404, "No invoice available for those details")
    return HTMLResponse(invoice.render(row, settings.get()))


@router.get("/api/my/orders")
def my_orders(authorization: Optional[str] = Header(None)):
    user = _user_from(authorization)
    if not user:
        raise HTTPException(401, "Please sign in")
    return [_public(r["payload"]) for r in db.fetch_all("SELECT payload FROM orders WHERE user_id = %s ORDER BY created DESC", (user["id"],))]


# ------------------------------------------------------------------ customer accounts
def _hash(password: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), 120_000).hex()


@router.post("/api/auth/register")
def register(p: Dict[str, Any]):
    email, password = str(p.get("email", "")).strip().lower(), str(p.get("password", ""))
    if not _EMAIL.match(email) or len(password) < 6:
        raise HTTPException(400, "Enter a valid email and a password of at least 6 characters")
    salt, token = secrets.token_hex(16), secrets.token_hex(24)
    try:
        with db.transaction() as cur:
            cur.execute("INSERT INTO users (name, email, phone, pw_hash, salt) VALUES (%s, %s, %s, %s, %s) RETURNING id",
                        (p.get("name", ""), email, p.get("phone", ""), _hash(password, salt), salt))
            cur.execute("INSERT INTO sessions (token, user_id) VALUES (%s, %s)", (token, cur.fetchone()["id"]))
    except psycopg2.errors.UniqueViolation:
        raise HTTPException(409, "An account with this email already exists")
    return {"token": token, "user": {"name": p.get("name", ""), "email": email}}


_login_failures: Dict[str, List[float]] = {}


@router.post("/api/auth/login")
def login(p: Dict[str, Any], request: Request):
    email = str(p.get("email", "")).strip().lower()
    key = email + "|" + (request.client.host if request.client else "")
    now = time.time()
    recent = [t for t in _login_failures.get(key, []) if now - t < 600]
    if len(recent) >= 8:
        raise HTTPException(429, "Too many failed attempts. Try again in a few minutes.")
    user = db.fetch_one("SELECT * FROM users WHERE email = %s", (email,))
    if user and user["disabled"]:
        raise HTTPException(403, "This account has been disabled. Please contact support.")
    if not user or not hmac.compare_digest(user["pw_hash"], _hash(str(p.get("password", "")), user["salt"])):
        _login_failures[key] = recent + [now]
        raise HTTPException(401, "Incorrect email or password")
    _login_failures.pop(key, None)
    token = secrets.token_hex(24)
    db.execute("INSERT INTO sessions (token, user_id) VALUES (%s, %s)", (token, user["id"]))
    return {"token": token, "user": {"name": user["name"], "email": user["email"]}}


@router.post("/api/auth/logout")
def logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.lower().startswith("bearer "):
        db.execute("DELETE FROM sessions WHERE token = %s", (authorization[7:],))
    return {"ok": True}


@router.get("/api/auth/me")
def me(authorization: Optional[str] = Header(None)):
    user = _user_from(authorization)
    if not user:
        raise HTTPException(401, "Not signed in")
    return {"name": user["name"], "email": user["email"], "phone": user["phone"]}


# ------------------------------------------------------------------ enquiries + service quotes
@router.post("/api/enquiry")
def enquiry(p: Dict[str, Any]):
    kind = str(p.get("kind", "general"))[:40]
    prefix = "ENQ"
    if kind == "seller":
        prefix = "APP"
    elif kind in ("bulk", "b2b"):
        prefix = "B2B"
    elif kind == "atl":
        prefix = "ATL"
    elif kind in ("contact", "support"):
        prefix = "SUP"
    ref = f"{prefix}{secrets.randbelow(900000) + 100000}"
    p["reference"] = ref
    db.execute("INSERT INTO enquiries (kind, payload) VALUES (%s, %s)", (kind, db.Json(p)))
    email = str(p.get("email", "")).strip()
    if kind == "newsletter":
        notify.newsletter_welcome(email, str(p.get("name", "")))
    else:
        notify.form_alert(f"New {kind} request", ref, p, reply_to=email)
        notify.form_ack(email, str(p.get("name", "")), ref, "request")
    return {"ok": True, "reference": ref}


@router.post("/api/service-quote")
async def service_quote(
    slug: str = Form(...), name: str = Form(...), phone: str = Form(...), email: str = Form(...),
    qty: str = Form("1"), notes: str = Form(""), options: str = Form("{}"), file: Optional[UploadFile] = File(None),
):
    """Quote request from a service page: the customer's selections plus the design file."""
    cfg = content.get("service_options", {"types": {}, "slugs": {}})
    kind = cfg["slugs"].get(slug)
    if not kind:
        raise HTTPException(404, "Unknown service")
    if not _EMAIL.match(email.strip()) or len(re.sub(r"\D", "", phone)) < 10:
        raise HTTPException(400, "Enter a valid email and a 10-digit mobile number")
    try:
        chosen = json.loads(options)
        assert isinstance(chosen, dict)
    except (ValueError, AssertionError):
        raise HTTPException(400, "Invalid options")
    reference = f"SQ{secrets.randbelow(900000) + 100000}"
    saved = ""
    if file is not None and file.filename:
        ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
        allowed = (cfg["types"].get(kind) or {}).get("accept", [])
        if allowed and ext not in allowed:
            raise HTTPException(400, "Unsupported file type. Accepted: " + ", ".join(allowed))
        data = await file.read(config.MAX_UPLOAD_BYTES + 1)
        if len(data) > config.MAX_UPLOAD_BYTES:
            raise HTTPException(400, "File is larger than 50 MB. Share a download link in the notes instead.")
        os.makedirs(config.UPLOAD_DIR, exist_ok=True)
        saved = f"{reference}_{re.sub(r'[^A-Za-z0-9._-]', '_', file.filename)[-80:]}"
        with open(os.path.join(config.UPLOAD_DIR, saved), "wb") as fh:
            fh.write(data)
    payload = {"reference": reference, "service": kind, "name": name, "phone": phone, "email": email.strip().lower(),
               "qty": qty, "notes": notes, "options": chosen, "file": saved}
    db.execute("INSERT INTO enquiries (kind, payload) VALUES (%s, %s)", ("service:" + slug, db.Json(payload)))
    notify.form_alert(f"New quote request ({slug})", reference, payload, reply_to=payload["email"])
    notify.form_ack(payload["email"], name, reference, "quote request")
    return {"ok": True, "reference": reference}


# ------------------------------------------------------------------ push notifications + "notify me when back in stock"
@router.get("/api/push/key")
def push_key():
    return {"key": push.public_key()}


@router.post("/api/push/subscribe")
def push_subscribe(p: Dict[str, Any]):
    try:
        push.save_subscription(p.get("subscription") or {}, "customer")
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {"ok": True}


@router.post("/api/restock")
def restock_subscribe(p: Dict[str, Any]):
    """Ask to be told when an out-of-stock product is available: through a subscribed device and/or an e-mail address."""
    pid = str(p.get("product_id", "")).strip()
    email = str(p.get("email", "")).strip()
    sub = p.get("subscription") or {}
    endpoint = ""
    if email and not _EMAIL.match(email):
        raise HTTPException(400, "Enter a valid email address")
    if sub:
        try:
            push.save_subscription(sub, "customer")
            endpoint = sub["endpoint"]
        except ValueError as e:
            raise HTTPException(400, str(e))
    if not (email or endpoint):
        raise HTTPException(400, "Allow notifications on this device or enter an email address")
    prod = db.fetch_one("SELECT id, slug FROM products WHERE id = %s", (pid,))
    if not prod:
        raise HTTPException(404, "Product not found")
    if restock.available(prod["id"], prod["slug"]):
        raise HTTPException(409, "Good news, this product is in stock right now.")
    restock.subscribe(pid, email, endpoint)
    return {"ok": True, "channels": [c for c, on in (("push", endpoint), ("email", email)) if on]}


@router.post("/api/restock/status")
def restock_status(p: Dict[str, Any]):
    return {"subscribed": restock.is_subscribed(str(p.get("product_id", "")), str(p.get("endpoint", "")))}


@router.post("/api/order-tracking/subscribe")
def order_subscribe(p: Dict[str, Any]):
    """Follow one order on this phone/browser: every status change is pushed. Needs the same order number + contact as tracking."""
    row = db.fetch_one("SELECT email, phone FROM orders WHERE order_id = %s", (str(p.get("order_id", "")).strip(),))
    contact = str(p.get("contact", "")).strip().lower()
    if not row or not contact or contact not in (row["email"].lower(), row["phone"].lower()):
        raise HTTPException(404, "No order found for those details")
    try:
        push.save_subscription(p.get("subscription") or {}, "customer")
    except ValueError as e:
        raise HTTPException(400, str(e))
    db.execute("INSERT INTO order_push (order_id, endpoint) VALUES (%s, %s) ON CONFLICT DO NOTHING", (str(p["order_id"]).strip(), p["subscription"]["endpoint"]))
    return {"ok": True}
