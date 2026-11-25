"""Back-office API for MySemicon, mounted at /api/admin (see frontend/admin.html).

Roles
  owner    everything, including admin accounts, settings, backups
  manager  catalogue, content, orders, enquiries, customers
  support  orders, enquiries, customers (read), no catalogue/content edits

Every change is written to the audit log. Admin sessions are bearer tokens (not cookies), expire after 12 hours,
and login attempts are rate limited. A product edited here is locked, so the live price sync from the source store
never overwrites a manual change. All data lives in PostgreSQL (see backend/schema.sql).
"""
import csv
import glob
import hashlib
import hmac
import html as htmllib
import io
import json
import os
import re
import secrets
import subprocess
import time
from typing import Any, Dict, Iterable, List, Optional, Tuple

import psycopg2.errors
from fastapi import APIRouter, Depends, File, Header, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, Response

from backend import cache, config, content, db, integrations, invoice, media, notify, push, restock, settings
from backend.product import HIDDEN_SPECS as STOREFRONT_HIDDEN_SPECS

ASSET_DIR = os.path.join(config.FRONTEND_DIR, "assets", "admin")          # images uploaded from the admin panel
HERO_DIRS = (os.path.join(config.FRONTEND_DIR, "assets", "img"), os.path.join(config.FRONTEND_DIR, "assets", "img_nobg"))

router = APIRouter(prefix="/api/admin")
OWNER, MANAGER, SUPPORT = "owner", "manager", "support"
ROLES = (OWNER, MANAGER, SUPPORT)
ORDER_STATUSES = ["Awaiting payment", "Payment failed", "Confirmed", "Packed", "Shipped", "Out for delivery", "Delivered", "Cancelled", "Returned"]
ENQUIRY_STATUSES = ["new", "in progress", "quoted", "closed"]
INACTIVE_ORDERS = ("Cancelled", "Returned", "Awaiting payment", "Payment failed")                               # not counted as revenue
SESSION_HOURS = 12
STARTED = time.time()

# Internal catalogue fields the storefront never shows. They stay out of the editor but are preserved on save.
HIDDEN_SPECS = set(STOREFRONT_HIDDEN_SPECS) | {"Meta Image", "Original URL", "Channels"}


# --------------------------------------------------------------------------- helpers
def now() -> str:
    return time.strftime("%Y-%m-%d %H:%M:%S")


def hours_ago(hours: float) -> str:
    return time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(time.time() - hours * 3600))


def hash_pw(pw: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac("sha256", pw.encode(), bytes.fromhex(salt), 120_000).hex()


def slugify(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", (s or "").lower()).strip("-")


def like(text: str) -> str:
    return f"%{text}%"


def offset(page: int, limit: int) -> int:
    return (max(page, 1) - 1) * limit


def page_count(total: int, limit: int) -> int:
    return max(1, -(-total // limit))


def count(sql: str, params: Iterable[Any] = ()) -> int:
    return int(db.fetch_val(sql, tuple(params), 0))


def csv_response(filename: str, header: List[str], rows: Iterable[Iterable[Any]]) -> Response:
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(header)
    writer.writerows(rows)
    return Response(buf.getvalue(), media_type="text/csv", headers={"Content-Disposition": f"attachment; filename={filename}"})


def audit(admin: Dict[str, Any], action: str, target: Any = "", detail: Any = "") -> None:
    text = detail if isinstance(detail, str) else json.dumps(detail, ensure_ascii=False)[:2000]
    db.execute("INSERT INTO audit_log (admin, action, target, detail, created) VALUES (%s, %s, %s, %s, %s)",
               (admin["email"], action, str(target), text, now()))


# --------------------------------------------------------------------------- auth
_login_failures: Dict[str, List[float]] = {}


def current_admin(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Sign in required")
    row = db.fetch_one(
        "SELECT a.* FROM admin_sessions s JOIN admins a ON a.id = s.admin_id WHERE s.token = %s AND a.active AND s.created >= %s",
        (authorization[7:], hours_ago(SESSION_HOURS)))
    if not row:
        raise HTTPException(401, "Session expired. Please sign in again.")
    row.pop("pw_hash", None)
    row.pop("salt", None)
    return dict(row)


def need(*roles: str):
    def dependency(admin: Dict[str, Any] = Depends(current_admin)):
        if admin["role"] not in roles:
            raise HTTPException(403, "Your role does not allow this action")
        return admin
    return dependency


ANY = need(OWNER, MANAGER, SUPPORT)
MGR = need(OWNER, MANAGER)
OWN = need(OWNER)


@router.post("/login")
def login(p: Dict[str, Any], request: Request):
    email = str(p.get("email", "")).strip().lower()
    ip = request.client.host if request.client else ""
    key = f"{email}|{ip}"
    t = time.time()
    recent = [x for x in _login_failures.get(key, []) if t - x < 900]
    if len(recent) >= 5:
        raise HTTPException(429, "Too many failed attempts. Try again in 15 minutes.")
    row = db.fetch_one("SELECT * FROM admins WHERE email = %s AND active", (email,))
    if not row or not hmac.compare_digest(row["pw_hash"], hash_pw(str(p.get("password", "")), row["salt"])):
        _login_failures[key] = recent + [t]
        raise HTTPException(401, "Incorrect email or password")
    _login_failures.pop(key, None)
    token = secrets.token_hex(32)
    with db.transaction() as cur:
        cur.execute("INSERT INTO admin_sessions (token, admin_id, created, ip) VALUES (%s, %s, %s, %s)", (token, row["id"], now(), ip))
        cur.execute("UPDATE admins SET last_login = %s WHERE id = %s", (now(), row["id"]))
        cur.execute("DELETE FROM admin_sessions WHERE created < %s", (hours_ago(48),))
    admin = {"email": row["email"], "name": row["name"], "role": row["role"]}
    audit(admin, "login")
    return {"token": token, "admin": admin}


@router.post("/logout")
def logout(authorization: Optional[str] = Header(None), a: Dict = Depends(current_admin)):
    db.execute("DELETE FROM admin_sessions WHERE token = %s", (authorization[7:],))
    return {"ok": True}


@router.get("/me")
def me(a: Dict = Depends(ANY)):
    return {"email": a["email"], "name": a["name"], "role": a["role"], "last_login": a.get("last_login")}


def check_password_strength(pw: str) -> None:
    if len(pw) < 10 or not re.search(r"[A-Za-z]", pw) or not re.search(r"\d", pw):
        raise HTTPException(400, "Password must be at least 10 characters and include letters and numbers")


@router.post("/password")
def change_password(p: Dict[str, Any], a: Dict = Depends(ANY)):
    row = db.fetch_one("SELECT pw_hash, salt FROM admins WHERE id = %s", (a["id"],))
    if not hmac.compare_digest(row["pw_hash"], hash_pw(str(p.get("current", "")), row["salt"])):
        raise HTTPException(400, "Current password is incorrect")
    new = str(p.get("new", ""))
    check_password_strength(new)
    salt = secrets.token_hex(16)
    db.execute("UPDATE admins SET pw_hash = %s, salt = %s WHERE id = %s", (hash_pw(new, salt), salt, a["id"]))
    audit(a, "password changed")
    return {"ok": True}


# --------------------------------------------------------------------------- dashboard
LIVE_ORDER = "status NOT IN ('Cancelled', 'Returned', 'Awaiting payment', 'Payment failed')"


@router.get("/stats")
def stats(a: Dict = Depends(ANY)):
    today = time.strftime("%Y-%m-%d")
    out = {
        "orders": count("SELECT COUNT(*) FROM orders"),
        "orders_today": count("SELECT COUNT(*) FROM orders WHERE created::date = %s", (today,)),
        "revenue": round(db.fetch_val(f"SELECT COALESCE(SUM(total), 0) FROM orders WHERE {LIVE_ORDER}", (), 0), 2),
        "revenue_today": round(db.fetch_val(f"SELECT COALESCE(SUM(total), 0) FROM orders WHERE {LIVE_ORDER} AND created::date = %s", (today,), 0), 2),
        "order_status": {r["status"]: r["n"] for r in db.fetch_all("SELECT status, COUNT(*) AS n FROM orders GROUP BY status")},
        "users": count("SELECT COUNT(*) FROM users"),
        "enquiries_new": count("SELECT COUNT(*) FROM enquiries e LEFT JOIN enquiry_meta m ON m.enquiry_id = e.id WHERE COALESCE(m.status, 'new') = 'new'"),
        "enquiries": count("SELECT COUNT(*) FROM enquiries"),
        "products": count("SELECT COUNT(*) FROM products"),
        "out_of_stock": count("SELECT COUNT(*) FROM products WHERE NOT in_stock"),
        "low_stock": count("SELECT COUNT(*) FROM products WHERE in_stock AND available_quantity <= 5"),
        "archived": count("SELECT COUNT(*) FROM removed_products"),
        "categories": count("SELECT COUNT(*) FROM categories"),
        "brands": count("SELECT COUNT(*) FROM brands"),
        "locked_products": count("SELECT COUNT(*) FROM product_locks"),
    }
    out["recent_orders"] = [
        {"order_id": r["order_id"], "created": r["created"], "total": r["total"], "status": r["status"],
         "name": (r["payload"].get("customer") or {}).get("name", "")}
        for r in db.fetch_all("SELECT * FROM orders ORDER BY created DESC LIMIT 8")]
    out["recent_enquiries"] = [
        {"id": r["id"], "kind": r["kind"], "created": r["created"], "status": r["st"],
         "name": r["payload"].get("name") or r["payload"].get("company") or "", "reference": r["payload"].get("reference", "")}
        for r in db.fetch_all("SELECT e.*, COALESCE(m.status, 'new') AS st FROM enquiries e "
                              "LEFT JOIN enquiry_meta m ON m.enquiry_id = e.id ORDER BY e.id DESC LIMIT 8")]
    out["low_stock_items"] = [
        {"id": r["id"], "name": r["name"], "sku": r["sku"], "qty": r["available_quantity"]}
        for r in db.fetch_all("SELECT id, name, sku, available_quantity FROM products WHERE in_stock AND available_quantity <= 5 "
                              "ORDER BY available_quantity, popularity LIMIT 8")]
    per_day = {r["day"]: r for r in db.fetch_all(
        f"SELECT created::date::text AS day, COUNT(*) AS n, COALESCE(SUM(total), 0) AS revenue FROM orders "
        f"WHERE {LIVE_ORDER} AND created >= %s GROUP BY 1", (hours_ago(14 * 24 + 24),))}
    out["daily"] = []
    for i in range(13, -1, -1):
        day = time.strftime("%Y-%m-%d", time.localtime(time.time() - i * 86400))
        row = per_day.get(day)
        out["daily"].append({"date": day, "orders": row["n"] if row else 0, "revenue": round(row["revenue"], 2) if row else 0})
    return out


# --------------------------------------------------------------------------- orders
def _add_history(payload: Dict[str, Any], status: str, note: str, admin: Dict[str, Any]) -> None:
    payload["status"] = status
    payload.setdefault("history", []).append({"status": status, "note": note, "at": now(), "by": admin["email"]})


def _order_row(r: Dict[str, Any]) -> Dict[str, Any]:
    pl = r["payload"]
    customer = pl.get("customer") or {}
    items = pl.get("items") or []
    return {"order_id": r["order_id"], "created": r["created"], "name": customer.get("name", ""), "email": r["email"], "phone": r["phone"],
            "city": customer.get("city", ""), "total": r["total"], "status": r["status"], "payment": (pl.get("payment_label") or pl.get("payment", "")) + (" - " + pl["payment_status"] if pl.get("payment_status") else ""),
            "items": len(items), "units": sum(int(i.get("qty", 1)) for i in items),
            "summary": (items[0].get("name", "")[:60] + (f" +{len(items) - 1} more" if len(items) > 1 else "")) if items else "",
            "customer_id": r["user_id"]}


def _order_where(q: str, status: str, date_from: str = "", date_to: str = "") -> Tuple[str, List[Any]]:
    where, params = [], []
    if q:
        where.append("(order_id ILIKE %s OR email ILIKE %s OR phone ILIKE %s OR payload::text ILIKE %s)")
        params += [like(q)] * 4
    if status:
        where.append("status = %s")
        params.append(status)
    if date_from:
        where.append("created >= %s")
        params.append(date_from + " 00:00:00")
    if date_to:
        where.append("created <= %s")
        params.append(date_to + " 23:59:59")
    return (" WHERE " + " AND ".join(where)) if where else "", params


@router.get("/orders")
def orders(q: str = "", status: str = "", date_from: str = "", date_to: str = "", sort: str = "new", page: int = 1, limit: int = 25,
           a: Dict = Depends(ANY)):
    where, params = _order_where(q, status, date_from, date_to)
    order = {"new": "created DESC", "old": "created", "high": "total DESC", "low": "total"}.get(sort, "created DESC")
    total = count("SELECT COUNT(*) FROM orders" + where, params)
    rows = db.fetch_all(f"SELECT * FROM orders{where} ORDER BY {order} LIMIT %s OFFSET %s", params + [limit, offset(page, limit)])
    where2, params2 = _order_where(q, "", date_from, date_to)
    counts = {r["status"]: r["n"] for r in db.fetch_all(f"SELECT status, COUNT(*) AS n FROM orders{where2} GROUP BY status", params2)}
    return {"items": [_order_row(r) for r in rows], "total": total, "page": page, "pages": page_count(total, limit),
            "statuses": ORDER_STATUSES, "counts": counts}


@router.get("/orders/export.csv")
def orders_csv(q: str = "", status: str = "", date_from: str = "", date_to: str = "", a: Dict = Depends(ANY)):
    where, params = _order_where(q, status, date_from, date_to)
    rows = [_order_row(r) for r in db.fetch_all(f"SELECT * FROM orders{where} ORDER BY created DESC", params)]
    keys = ["order_id", "created", "name", "email", "phone", "city", "total", "status", "payment", "items", "units"]
    return csv_response("orders.csv", keys, ([o[k] for k in keys] for o in rows))


@router.get("/orders/{oid}")
def order_detail(oid: str, a: Dict = Depends(ANY)):
    r = db.fetch_one("SELECT * FROM orders WHERE order_id = %s", (oid,))
    if not r:
        raise HTTPException(404, "Order not found")
    return {"order": r["payload"], "status": r["status"], "statuses": ORDER_STATUSES, "customer_id": r["user_id"], "invoice_no": _invoice_no(oid)}


@router.patch("/orders/{oid}")
def order_update(oid: str, p: Dict[str, Any], a: Dict = Depends(ANY)):
    status, note = str(p.get("status", "")).strip(), str(p.get("note", "")).strip()[:500]
    if status and status not in ORDER_STATUSES:
        raise HTTPException(400, "Unknown status")
    with db.transaction() as cur:
        cur.execute("SELECT * FROM orders WHERE order_id = %s FOR UPDATE", (oid,))
        r = cur.fetchone()
        if not r:
            raise HTTPException(404, "Order not found")
        status = status or r["status"]
        payload = r["payload"]
        _add_history(payload, status, note, a)
        cur.execute("UPDATE orders SET status = %s, payload = %s WHERE order_id = %s", (status, db.Json(payload), oid))
    if status != r["status"]:
        notify.order_status(payload, status, note)
    audit(a, "order status", oid, {"status": status, "note": note})
    return {"ok": True, "status": status}


@router.post("/orders/bulk")
def orders_bulk(p: Dict[str, Any], a: Dict = Depends(ANY)):
    ids = [str(x) for x in (p.get("ids") or [])][:200]
    status, note = str(p.get("status", "")), str(p.get("note", ""))[:500]
    if status not in ORDER_STATUSES or not ids:
        raise HTTPException(400, "Choose orders and a status")
    done = 0
    with db.transaction() as cur:
        cur.execute("SELECT order_id, payload FROM orders WHERE order_id = ANY(%s) FOR UPDATE", (ids,))
        for r in cur.fetchall():
            payload = r["payload"]
            _add_history(payload, status, note, a)
            cur.execute("UPDATE orders SET status = %s, payload = %s WHERE order_id = %s", (status, db.Json(payload), r["order_id"]))
            notify.order_status(payload, status, note)
            done += 1
    audit(a, "bulk order status", "", {"status": status, "orders": done})
    return {"ok": True, "updated": done}


# --------------------------------------------------------------------------- enquiries
ENQUIRY_SELECT = ("SELECT e.*, COALESCE(m.status, 'new') AS st, m.note AS note "
                  "FROM enquiries e LEFT JOIN enquiry_meta m ON m.enquiry_id = e.id")


def _enquiry(r: Dict[str, Any]) -> Dict[str, Any]:
    pl = r["payload"]
    return {"id": r["id"], "kind": r["kind"], "created": r["created"], "status": r["st"], "note": r["note"] or "",
            "name": pl.get("name") or pl.get("company") or "", "email": pl.get("email", ""), "phone": pl.get("phone", ""),
            "reference": pl.get("reference", ""), "file": pl.get("file", ""), "payload": pl}


def _enquiry_where(kind: str, status: str, q: str = "") -> Tuple[str, List[Any]]:
    where, params = [], []
    if kind:
        where.append("e.kind LIKE %s")
        params.append(kind + "%")
    if status:
        where.append("COALESCE(m.status, 'new') = %s")
        params.append(status)
    if q:
        where.append("e.payload::text ILIKE %s")
        params.append(like(q))
    return (" WHERE " + " AND ".join(where)) if where else "", params


@router.get("/enquiries")
def enquiries(kind: str = "", status: str = "", q: str = "", page: int = 1, limit: int = 25, a: Dict = Depends(ANY)):
    where, params = _enquiry_where(kind, status, q)
    total = count("SELECT COUNT(*) FROM enquiries e LEFT JOIN enquiry_meta m ON m.enquiry_id = e.id" + where, params)
    rows = db.fetch_all(f"{ENQUIRY_SELECT}{where} ORDER BY e.id DESC LIMIT %s OFFSET %s", params + [limit, offset(page, limit)])
    kinds = [r["kind"] for r in db.fetch_all("SELECT DISTINCT kind FROM enquiries ORDER BY kind")]
    return {"items": [_enquiry(r) for r in rows], "total": total, "page": page, "pages": page_count(total, limit),
            "statuses": ENQUIRY_STATUSES, "kinds": kinds}


@router.get("/enquiries/export.csv")
def enquiries_csv(kind: str = "", status: str = "", a: Dict = Depends(ANY)):
    where, params = _enquiry_where(kind, status)
    items = [_enquiry(r) for r in db.fetch_all(f"{ENQUIRY_SELECT}{where} ORDER BY e.id DESC", params)]
    keys = ["id", "reference", "kind", "created", "name", "email", "phone", "status", "note"]
    return csv_response("enquiries.csv", ["id", "reference", "type", "received", "name", "email", "phone", "status", "note"],
                        ([e[k] for k in keys] for e in items))


@router.patch("/enquiries/{eid}")
def enquiry_update(eid: int, p: Dict[str, Any], a: Dict = Depends(ANY)):
    status, note = str(p.get("status", "new")), str(p.get("note", ""))[:2000]
    if status not in ENQUIRY_STATUSES:
        raise HTTPException(400, "Unknown status")
    if not db.fetch_one("SELECT 1 FROM enquiries WHERE id = %s", (eid,)):
        raise HTTPException(404, "Enquiry not found")
    db.execute("INSERT INTO enquiry_meta (enquiry_id, status, note, updated, updated_by) VALUES (%s, %s, %s, %s, %s) "
               "ON CONFLICT (enquiry_id) DO UPDATE SET status = EXCLUDED.status, note = EXCLUDED.note, "
               "updated = EXCLUDED.updated, updated_by = EXCLUDED.updated_by", (eid, status, note, now(), a["email"]))
    audit(a, "enquiry", eid, {"status": status})
    return {"ok": True}


@router.delete("/enquiries/{eid}")
def enquiry_delete(eid: int, a: Dict = Depends(OWN)):
    db.execute("DELETE FROM enquiries WHERE id = %s", (eid,))          # enquiry_meta follows (ON DELETE CASCADE)
    audit(a, "enquiry deleted", eid)
    return {"ok": True}


@router.get("/files/{name}")
def download_file(name: str, a: Dict = Depends(ANY)):
    safe = os.path.basename(name)
    path = os.path.join(config.UPLOAD_DIR, safe)
    if safe != name or not os.path.isfile(path):
        raise HTTPException(404, "File not found")
    return FileResponse(path, filename=safe)


@router.get("/files")
def list_files(a: Dict = Depends(ANY)):
    os.makedirs(config.UPLOAD_DIR, exist_ok=True)
    items = []
    for name in sorted(os.listdir(config.UPLOAD_DIR), reverse=True):
        path = os.path.join(config.UPLOAD_DIR, name)
        items.append({"name": name, "size": os.path.getsize(path),
                      "modified": time.strftime("%Y-%m-%d %H:%M", time.localtime(os.path.getmtime(path)))})
    return {"items": items}


# --------------------------------------------------------------------------- customers
CUSTOMER_STATS = ("COUNT(o.order_id) AS orders, "
                  "COALESCE(SUM(CASE WHEN o.status NOT IN ('Cancelled', 'Returned', 'Awaiting payment', 'Payment failed') THEN o.total END), 0) AS spent")
CUSTOMER_JOIN = "FROM users u LEFT JOIN orders o ON o.user_id = u.id OR LOWER(o.email) = LOWER(u.email)"


@router.get("/users")
def users(q: str = "", sort: str = "new", page: int = 1, limit: int = 25, a: Dict = Depends(ANY)):
    where, params = ("WHERE u.name ILIKE %s OR u.email ILIKE %s OR u.phone ILIKE %s", [like(q)] * 3) if q else ("", [])
    total = count(f"SELECT COUNT(*) FROM users u {where}", params)
    order = {"new": "u.id DESC", "spent": "spent DESC", "orders": "orders DESC", "name": "u.name"}.get(sort, "u.id DESC")
    rows = db.fetch_all(
        f"SELECT u.id, u.name, u.email, u.phone, u.created, u.disabled, {CUSTOMER_STATS}, MAX(o.created) AS last_order "
        f"{CUSTOMER_JOIN} {where} GROUP BY u.id ORDER BY {order} LIMIT %s OFFSET %s", params + [limit, offset(page, limit)])
    return {"items": rows, "total": total, "page": page, "pages": page_count(total, limit)}


@router.get("/users/export.csv")
def users_csv(a: Dict = Depends(MGR)):
    rows = db.fetch_all(f"SELECT u.name, u.email, u.phone, u.created, u.disabled, {CUSTOMER_STATS} {CUSTOMER_JOIN} GROUP BY u.id ORDER BY u.id")
    return csv_response("customers.csv", ["name", "email", "phone", "joined", "disabled", "orders", "total_spent"],
                        ([r["name"], r["email"], r["phone"], r["created"], int(r["disabled"]), r["orders"], r["spent"]] for r in rows))


@router.get("/users/{uid}")
def user_detail(uid: int, a: Dict = Depends(ANY)):
    u = db.fetch_one("SELECT id, name, email, phone, created, disabled FROM users WHERE id = %s", (uid,))
    if not u:
        raise HTTPException(404, "Customer not found")
    rows = db.fetch_all("SELECT * FROM orders WHERE user_id = %s OR LOWER(email) = LOWER(%s) ORDER BY created DESC", (uid, u["email"]))
    live = [r for r in rows if r["status"] not in INACTIVE_ORDERS]
    spent = round(sum(r["total"] for r in live), 2)
    last = rows[0]["payload"].get("customer", {}) if rows else {}
    return {**u, "orders": [_order_row(r) for r in rows], "spent": spent, "order_count": len(rows),
            "aov": round(spent / len(live), 2) if live else 0,
            "address": ", ".join(x for x in [last.get("address"), last.get("city"), last.get("state"), last.get("pincode")] if x),
            "gstin": last.get("gstin", "")}


@router.patch("/users/{uid}")
def user_update(uid: int, p: Dict[str, Any], a: Dict = Depends(MGR)):
    if p.get("password") and len(str(p["password"])) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    with db.transaction() as cur:
        cur.execute("SELECT 1 FROM users WHERE id = %s", (uid,))
        if not cur.fetchone():
            raise HTTPException(404, "Customer not found")
        if "disabled" in p:
            cur.execute("UPDATE users SET disabled = %s WHERE id = %s", (bool(p["disabled"]), uid))
            if p["disabled"]:
                cur.execute("DELETE FROM sessions WHERE user_id = %s", (uid,))
        if p.get("password"):
            salt = secrets.token_hex(16)
            cur.execute("UPDATE users SET pw_hash = %s, salt = %s WHERE id = %s", (hash_pw(str(p["password"]), salt), salt, uid))
            cur.execute("DELETE FROM sessions WHERE user_id = %s", (uid,))
        for field in ("name", "phone"):
            if field in p:
                cur.execute(f"UPDATE users SET {field} = %s WHERE id = %s", (str(p[field])[:120], uid))
    audit(a, "customer", uid, {k: ("***" if k == "password" else v) for k, v in p.items()})
    return {"ok": True}


# --------------------------------------------------------------------------- product helpers
def _category_parents() -> Dict[str, Optional[str]]:
    return {r["slug"]: r["parent"] for r in db.fetch_all("SELECT slug, parent FROM categories")}


def _ancestors(slug: Optional[str], parents: Dict[str, Optional[str]]) -> List[str]:
    out, seen = [], set()
    while slug and slug in parents and slug not in seen:
        seen.add(slug)
        out.append(slug)
        slug = parents[slug]
    return out


def _money(v: Any, field: str) -> float:
    try:
        x = float(v)
    except (TypeError, ValueError):
        raise HTTPException(400, f"{field} must be a number")
    if x < 0 or x > 100_000_000:
        raise HTTPException(400, f"{field} is out of range")
    return round(x, 2)


def _lock(cur, pid: str) -> None:
    cur.execute("INSERT INTO product_locks (product_id, locked_at) VALUES (%s, %s) "
                "ON CONFLICT (product_id) DO UPDATE SET locked_at = EXCLUDED.locked_at", (pid, now()))


def _recount(cur, cats: Iterable[str], brands: Iterable[str]) -> None:
    """Refresh the product totals of the given categories and brands."""
    cats = list(cats)
    if cats:
        cur.execute("UPDATE categories SET total = (SELECT COUNT(*) FROM product_categories WHERE cat_slug = categories.slug) "
                    "WHERE slug = ANY(%s)", (cats,))
    for brand in {b for b in brands if b}:
        cur.execute("SELECT COUNT(*) AS n, MIN(brand_name) AS name FROM products WHERE brand_slug = %s", (brand,))
        row = cur.fetchone()
        cur.execute("INSERT INTO brands (slug, name, total) VALUES (%s, COALESCE(%s, %s), %s) "
                    "ON CONFLICT (slug) DO UPDATE SET total = EXCLUDED.total", (brand, row["name"], brand, row["n"]))


def _sync_derived(cur, pid: str) -> None:
    """Recompute the derived columns of one product and re-list it under its categories (after any edit)."""
    cur.execute("SELECT * FROM products WHERE id = %s", (pid,))
    r = cur.fetchone()
    final, regular = float(r["final_price"] or 0), float(r["regular_price"] or 0)
    if final <= 0 < regular:
        final = regular
    if regular <= 0 < final:
        regular = final
    regular = max(regular, final)
    discount = round((regular - final) / regular * 100) if regular > final > 0 else 0
    images, tiers = r["images"] or [], r["moq_tiers"] or []
    popularity = (0 if r["in_stock"] else 10_000_000) + int(r["queue_id"] or 0)
    cur.execute("UPDATE products SET regular_price = %s, final_price = %s, discount = %s, name_lc = %s, image = %s, has_tiers = %s, "
                "popularity = %s WHERE id = %s",
                (regular, final, discount, (r["name"] or "").lower(), images[0] if images else "", bool(tiers), popularity, pid))
    parents = _category_parents()
    wanted = []
    for c in r["categories"] or []:
        for slug in _ancestors((c or {}).get("url_path"), parents):
            if slug not in wanted:
                wanted.append(slug)
    cur.execute("SELECT cat_slug FROM product_categories WHERE product_id = %s", (pid,))
    before = {x["cat_slug"] for x in cur.fetchall()}
    cur.execute("DELETE FROM product_categories WHERE product_id = %s AND cat_slug <> ALL(%s)", (pid, wanted))
    for slug in wanted:
        cur.execute("INSERT INTO product_categories (cat_slug, product_id) VALUES (%s, %s) ON CONFLICT DO NOTHING", (slug, pid))
    _recount(cur, before | set(wanted), [r["brand_slug"]])


def _apply_fields(cur, pid: str, p: Dict[str, Any]) -> None:
    """Validate the submitted product fields and write them to `products` (derived columns are synced afterwards)."""
    cur.execute("SELECT * FROM products WHERE id = %s", (pid,))
    current = cur.fetchone()
    sets: Dict[str, Any] = {}
    if "name" in p:
        name = str(p["name"]).strip()
        if not name:
            raise HTTPException(400, "Name cannot be empty")
        sets["name"] = name[:300]
    if "sku" in p and str(p["sku"]).strip():
        sets["sku"] = str(p["sku"]).strip()[:60]
    if "brand_name" in p:
        brand = str(p["brand_name"]).strip()
        sets["brand_name"], sets["brand_slug"] = brand, slugify(brand)
    final = _money(p["final_price"], "Price") if "final_price" in p else float(current["final_price"] or 0)
    regular = _money(p["regular_price"], "MRP") if "regular_price" in p else float(current["regular_price"] or 0)
    if "final_price" in p or "regular_price" in p:
        if final <= 0:
            raise HTTPException(400, "Price must be greater than zero")
        regular = max(regular, final)
        sets["final_price"], sets["regular_price"] = final, regular
        sets["discount"] = round((regular - final) / regular * 100) if regular > final else 0
    if "available_quantity" in p:
        qty = _money(p["available_quantity"], "Quantity")
        sets["available_quantity"] = int(qty)
        if "in_stock" not in p:
            sets["in_stock"] = qty > 0
    if "in_stock" in p:
        sets["in_stock"] = bool(p["in_stock"])
    for field in ("country_of_origin", "short_description", "description"):
        if field in p:
            sets[field] = str(p[field])
    if "specs" in p:
        if not isinstance(p["specs"], dict):
            raise HTTPException(400, "Specifications must be a list of name/value pairs")
        kept = {k: v for k, v in (current["specifications"] or {}).items() if k in HIDDEN_SPECS}
        sets["specifications"] = db.Json({**kept, **{str(k): str(v) for k, v in p["specs"].items() if str(k).strip()}})
    if "images" in p:
        if not isinstance(p["images"], list):
            raise HTTPException(400, "Images must be a list")
        sets["images"] = db.Json([str(u) for u in p["images"] if str(u).strip()])
    if "tiers" in p:
        tiers = [{"range": t.get("range") or f'{t.get("from_qty")}-{t.get("to_qty") or ""}', "from_qty": int(t["from_qty"]),
                  "to_qty": int(t["to_qty"]) if t.get("to_qty") not in (None, "") else None, "price": _money(t["price"], "Tier price")}
                 for t in p["tiers"] or []]
        sets["moq_tiers"] = db.Json(tiers)
    if "categories" in p:
        known = {r["slug"]: r for r in db.fetch_all("SELECT slug, id, name FROM categories WHERE slug = ANY(%s)", (list(p["categories"]),))}
        cats = []
        for slug in p["categories"]:
            if slug not in known:
                raise HTTPException(400, f"Unknown category: {slug}")
            cats.append({"id": str(known[slug]["id"]), "name": known[slug]["name"], "url_path": slug})
        if not cats:
            raise HTTPException(400, "Choose at least one category")
        sets["categories"] = db.Json(cats)
    if sets:
        cur.execute("UPDATE products SET " + ", ".join(f"{k} = %s" for k in sets) + " WHERE id = %s", (*sets.values(), pid))


def _product_dict(r: Dict[str, Any], locked: bool) -> Dict[str, Any]:
    cats = r["categories"] or []
    names = {c["slug"]: c["name"] for c in db.fetch_all("SELECT slug, name FROM categories WHERE slug = ANY(%s)", ([c.get("url_path") for c in cats],))}
    return {
        "id": r["id"], "sku": r["sku"], "name": r["name"], "slug": r["slug"], "type": r.get("type"),
        "brand_name": r["brand_name"] or "", "brand_slug": r["brand_slug"] or "",
        "regular_price": r["regular_price"], "final_price": r["final_price"], "discount": r["discount"],
        "in_stock": bool(r["in_stock"]), "available_quantity": r["available_quantity"] or 0,
        "country_of_origin": r["country_of_origin"] or "", "short_description": r["short_description"] or "",
        "description": r["description"] or "", "specs": {k: v for k, v in (r["specifications"] or {}).items() if k not in HIDDEN_SPECS},
        "categories": [{"slug": c.get("url_path"), "name": names.get(c.get("url_path"), c.get("name"))} for c in cats],
        "images": r["images"] or [], "attachments": r["attachments"] or [], "tiers": r["moq_tiers"] or [], "locked": locked,
    }


# Archived products keep the column names of the original catalogue export (JSON columns as text).
_LEGACY_JSON = {"specifications_json": "specifications", "categories_json": "categories", "images_json": "images",
                "attachments_json": "attachments", "moq_tiers_json": "moq_tiers"}
_PLAIN_COLUMNS = ("id", "queue_id", "sku", "name", "slug", "url", "type", "brand_name", "brand_slug", "regular_price", "final_price",
                  "discount", "available_quantity", "country_of_origin", "short_description", "description", "scraped_at")


def _to_archive(r: Dict[str, Any]) -> Dict[str, Any]:
    data = {k: r[k] for k in _PLAIN_COLUMNS}
    data["in_stock"] = int(bool(r["in_stock"]))
    data.update({old: json.dumps(r[new], ensure_ascii=False) for old, new in _LEGACY_JSON.items()})
    return data


def _from_archive(d: Dict[str, Any]) -> Dict[str, Any]:
    """Archived record -> `products` column values."""
    def parse(text, default):
        try:
            return json.loads(text) if text else default
        except ValueError:
            return default

    out = {k: d.get(k) for k in _PLAIN_COLUMNS}
    out["in_stock"] = bool(d.get("in_stock"))
    for old, new in _LEGACY_JSON.items():
        out[new] = parse(d.get(old), {} if new == "specifications" else [])
    return out


def _insert_product(cur, f: Dict[str, Any]) -> None:
    name = f.get("name") or ""
    cur.execute(
        "INSERT INTO products (id, queue_id, sku, name, name_lc, slug, url, type, brand_name, brand_slug, regular_price, final_price, "
        "discount, in_stock, available_quantity, country_of_origin, short_description, description, specifications, categories, "
        "images, attachments, moq_tiers, scraped_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, "
        "%s, %s, %s, %s, %s, %s) ON CONFLICT (id) DO NOTHING",
        (f["id"], f.get("queue_id") or 0, f.get("sku") or f["id"], name, name.lower(), f.get("slug") or f["id"], f.get("url"), f.get("type"),
         f.get("brand_name") or "", f.get("brand_slug") or "", f.get("regular_price") or 0, f.get("final_price") or 0, f.get("discount") or 0,
         bool(f.get("in_stock")), int(float(f.get("available_quantity") or 0)), f.get("country_of_origin"), f.get("short_description"),
         f.get("description"), db.Json(f.get("specifications") or {}), db.Json(f.get("categories") or []), db.Json(f.get("images") or []),
         db.Json(f.get("attachments") or []), db.Json(f.get("moq_tiers") or []), (f.get("scraped_at") or now())[:19].replace("T", " ")))


# --------------------------------------------------------------------------- products
def _product_filters(q: str, category: str, brand: str, stock: str) -> Tuple[str, str, List[Any]]:
    """(join, where, params) for the product list and its CSV export."""
    join, where, params = "", [], []
    if category:
        join = " JOIN product_categories c ON c.product_id = p.id AND c.cat_slug = %s"
        params.append(category)
    if q:
        where.append("(p.name_lc ILIKE %s OR p.sku ILIKE %s OR p.slug ILIKE %s OR p.id = %s)")
        params += [like(q.lower())] * 3 + [q]
    if brand:
        where.append("p.brand_slug = %s")
        params.append(brand)
    if stock == "in":
        where.append("p.in_stock")
    elif stock == "out":
        where.append("NOT p.in_stock")
    elif stock == "low":
        where.append("p.in_stock AND p.available_quantity <= 5")
    return join, (" WHERE " + " AND ".join(where)) if where else "", params


@router.get("/products")
def products(q: str = "", category: str = "", brand: str = "", stock: str = "", sort: str = "new", archived: bool = False,
             page: int = 1, limit: int = 25, a: Dict = Depends(MGR)):
    if archived:
        cond = "data->>'name' ILIKE %s OR data->>'sku' ILIKE %s"
        total = count(f"SELECT COUNT(*) FROM removed_products WHERE {cond}", [like(q)] * 2)
        rows = db.fetch_all(f"SELECT id, data FROM removed_products WHERE {cond} ORDER BY data->>'name' LIMIT %s OFFSET %s",
                            [like(q)] * 2 + [limit, offset(page, limit)])
        return {"items": [{"id": r["id"], "sku": r["data"].get("sku"), "name": r["data"].get("name"), "brand": r["data"].get("brand_name"),
                           "price": r["data"].get("final_price"), "in_stock": bool(r["data"].get("in_stock")),
                           "qty": r["data"].get("available_quantity"), "archived": True} for r in rows],
                "total": total, "page": page, "pages": page_count(total, limit)}
    join, where, params = _product_filters(q, category, brand, stock)
    order = {"new": "p.queue_id DESC", "name": "p.name_lc", "price_asc": "p.final_price", "price_desc": "p.final_price DESC",
             "stock": "p.available_quantity"}.get(sort, "p.queue_id DESC")
    total = count(f"SELECT COUNT(*) FROM products p{join}{where}", params)
    rows = db.fetch_all(f"SELECT p.* FROM products p{join}{where} ORDER BY {order} LIMIT %s OFFSET %s", params + [limit, offset(page, limit)])
    locked = _locked_ids([r["id"] for r in rows])
    return {"items": [{"id": r["id"], "sku": r["sku"], "name": r["name"], "slug": r["slug"], "brand": r["brand_name"], "price": r["final_price"],
                       "regular": r["regular_price"], "in_stock": r["in_stock"], "qty": r["available_quantity"], "img": media.local_image(r["image"]),
                       "locked": r["id"] in locked} for r in rows],
            "total": total, "page": page, "pages": page_count(total, limit)}


def _locked_ids(ids: List[str]) -> set:
    return {r["product_id"] for r in db.fetch_all("SELECT product_id FROM product_locks WHERE product_id = ANY(%s)", (ids,))}


@router.get("/products/export.csv")
def products_csv(q: str = "", category: str = "", brand: str = "", stock: str = "", a: Dict = Depends(MGR)):
    join, where, params = _product_filters(q, category, brand, stock)
    rows = db.fetch_all(f"SELECT p.id, p.sku, p.name, p.brand_name, p.regular_price, p.final_price, p.available_quantity, p.in_stock "
                        f"FROM products p{join}{where} ORDER BY p.queue_id DESC LIMIT 50000", params)
    return csv_response("products.csv", ["id", "sku", "name", "brand", "mrp", "price", "qty", "in_stock"],
                        ([r["id"], r["sku"], r["name"], r["brand_name"], r["regular_price"], r["final_price"], r["available_quantity"],
                          int(r["in_stock"])] for r in rows))


@router.get("/products/{pid}")
def product_get(pid: str, a: Dict = Depends(MGR)):
    row = db.fetch_one("SELECT * FROM products WHERE id = %s", (pid,))
    if row:
        return _product_dict(row, bool(_locked_ids([pid])))
    archived = db.fetch_one("SELECT data FROM removed_products WHERE id = %s", (pid,))
    if not archived:
        raise HTTPException(404, "Product not found")
    return {**_product_dict(_from_archive(archived["data"]), False), "archived": True}


@router.patch("/products/{pid}")
def product_update(pid: str, p: Dict[str, Any], a: Dict = Depends(MGR)):
    with db.transaction() as cur:
        cur.execute("SELECT 1 FROM products WHERE id = %s", (pid,))
        if not cur.fetchone():
            raise HTTPException(404, "Product not found (restore it first if it is archived)")
        _apply_fields(cur, pid, p)
        _sync_derived(cur, pid)
        _lock(cur, pid)
    cache.clear_all()
    audit(a, "product edited", pid, {k: (v if k not in ("description", "short_description") else "...") for k, v in p.items()})
    restock.kick()
    return {"ok": True}


@router.post("/products")
def product_create(p: Dict[str, Any], a: Dict = Depends(MGR)):
    name = str(p.get("name", "")).strip()
    if not name:
        raise HTTPException(400, "Name is required")
    if "final_price" not in p:
        raise HTTPException(400, "Price is required")
    if not p.get("categories"):
        raise HTTPException(400, "Choose at least one category")
    with db.transaction() as cur:
        base = slugify(name)[:120] or "product"
        slug, n = base, 2
        while True:
            cur.execute("SELECT 1 FROM products WHERE slug = %s", (slug,))
            if not cur.fetchone():
                break
            slug, n = f"{base}-{n}", n + 1
        pid = "MS" + str(int(time.time()))[-7:] + str(secrets.randbelow(900) + 100)
        cur.execute("SELECT COALESCE(MAX(queue_id), 0) + 1 AS next FROM products")
        sku = str(p.get("sku") or "").strip() or ("MS-" + pid[2:])
        _insert_product(cur, {"id": pid, "queue_id": cur.fetchone()["next"], "sku": sku, "name": name, "slug": slug,
                              "url": f"/product/{slug}/", "type": "admin", "in_stock": True})
        _apply_fields(cur, pid, {**p, "sku": sku})
        _sync_derived(cur, pid)
        _lock(cur, pid)
    cache.clear_all()
    audit(a, "product created", pid, name)
    return {"ok": True, "id": pid, "slug": slug}


@router.post("/products/{pid}/archive")
def product_archive(pid: str, a: Dict = Depends(MGR)):
    with db.transaction() as cur:
        cur.execute("SELECT * FROM products WHERE id = %s", (pid,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(404, "Product not found")
        cur.execute("SELECT cat_slug FROM product_categories WHERE product_id = %s", (pid,))
        cats = [x["cat_slug"] for x in cur.fetchall()]
        cur.execute("INSERT INTO removed_products (id, data) VALUES (%s, %s) "
                    "ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, removed_at = LOCALTIMESTAMP", (pid, db.Json(_to_archive(row))))
        cur.execute("DELETE FROM products WHERE id = %s", (pid,))          # its category and tag links follow (ON DELETE CASCADE)
        _recount(cur, cats, [row["brand_slug"]])
    cache.clear_all()
    audit(a, "product archived", pid)
    return {"ok": True}


@router.post("/products/{pid}/restore")
def product_restore(pid: str, a: Dict = Depends(MGR)):
    with db.transaction() as cur:
        cur.execute("SELECT data FROM removed_products WHERE id = %s", (pid,))
        archived = cur.fetchone()
        if not archived:
            raise HTTPException(404, "Archived product not found")
        _insert_product(cur, _from_archive(archived["data"]))
        cur.execute("DELETE FROM removed_products WHERE id = %s", (pid,))
        _sync_derived(cur, pid)
    cache.clear_all()
    audit(a, "product restored", pid)
    return {"ok": True}


@router.post("/products/{pid}/unlock")
def product_unlock(pid: str, a: Dict = Depends(MGR)):
    db.execute("DELETE FROM product_locks WHERE product_id = %s", (pid,))
    audit(a, "product unlocked (live price sync resumes)", pid)
    return {"ok": True}


@router.post("/products/bulk")
def products_bulk(p: Dict[str, Any], a: Dict = Depends(MGR)):
    """Rows of {id|sku, price?, mrp?, qty?, in_stock?}. Used by the CSV import."""
    rows = p.get("rows") or []
    if not isinstance(rows, list) or len(rows) > 5000:
        raise HTTPException(400, "Send between 1 and 5000 rows")
    done, errors = 0, []
    with db.transaction() as cur:
        for i, r in enumerate(rows, 1):
            key, sku = str(r.get("id") or "").strip(), str(r.get("sku") or "").strip()
            found = None
            if key:
                cur.execute("SELECT id FROM products WHERE id = %s", (key,))
                found = cur.fetchone()
            if not found and sku:
                cur.execute("SELECT id FROM products WHERE sku = %s", (sku,))
                found = cur.fetchone()
            if not found:
                errors.append(f"row {i}: product not found ({key or sku})")
                continue
            update = {}
            if r.get("price") not in (None, ""):
                update["final_price"] = r["price"]
            if r.get("mrp") not in (None, ""):
                update["regular_price"] = r["mrp"]
            if r.get("qty") not in (None, ""):
                update["available_quantity"] = r["qty"]
            if r.get("in_stock") not in (None, ""):
                update["in_stock"] = str(r["in_stock"]).strip().lower() in ("1", "true", "yes", "y")
            if not update:
                continue
            try:
                _apply_fields(cur, found["id"], update)
            except HTTPException as e:
                errors.append(f"row {i}: {e.detail}")
                continue
            _sync_derived(cur, found["id"])
            _lock(cur, found["id"])
            done += 1
    cache.clear_all()
    audit(a, "bulk update", "", {"updated": done, "errors": len(errors)})
    restock.kick()
    return {"updated": done, "errors": errors[:50]}


# --------------------------------------------------------------------------- categories + brands
@router.get("/categories")
def categories(q: str = "", a: Dict = Depends(MGR)):
    rows = db.fetch_all("SELECT slug, name, parent, total, depth FROM categories ORDER BY depth, name")
    needle = q.lower()
    return {"items": [r for r in rows if not needle or needle in r["name"].lower() or needle in r["slug"]]}


@router.patch("/categories/{slug}")
def category_rename(slug: str, p: Dict[str, Any], a: Dict = Depends(MGR)):
    name = str(p.get("name", "")).strip()
    if not name:
        raise HTTPException(400, "Name is required")
    if not db.execute("UPDATE categories SET name = %s WHERE slug = %s", (name, slug)):
        raise HTTPException(404, "Category not found")
    cache.clear_all()
    audit(a, "category renamed", slug, name)
    return {"ok": True}


@router.get("/brands")
def brands(q: str = "", page: int = 1, limit: int = 50, a: Dict = Depends(MGR)):
    cond = "name ILIKE %s OR slug ILIKE %s"
    total = count(f"SELECT COUNT(*) FROM brands WHERE {cond}", [like(q)] * 2)
    rows = db.fetch_all(f"SELECT * FROM brands WHERE {cond} ORDER BY total DESC LIMIT %s OFFSET %s", [like(q)] * 2 + [limit, offset(page, limit)])
    return {"items": rows, "total": total, "page": page, "pages": page_count(total, limit)}


@router.patch("/brands/{slug}")
def brand_rename(slug: str, p: Dict[str, Any], a: Dict = Depends(MGR)):
    name = str(p.get("name", "")).strip()
    if not name:
        raise HTTPException(400, "Name is required")
    with db.transaction() as cur:
        cur.execute("UPDATE brands SET name = %s WHERE slug = %s", (name, slug))
        if not cur.rowcount:
            raise HTTPException(404, "Brand not found")
        cur.execute("UPDATE products SET brand_name = %s WHERE brand_slug = %s", (name, slug))
    cache.clear_all()
    audit(a, "brand renamed", slug, name)
    return {"ok": True}


# --------------------------------------------------------------------------- uploads
@router.post("/uploads/image")
async def upload_image(file: UploadFile = File(...), a: Dict = Depends(MGR)):
    ext = (file.filename or "").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else ""
    if ext not in ("jpg", "jpeg", "png", "webp", "gif"):
        raise HTTPException(400, "Only JPG, PNG, WEBP or GIF images are allowed")
    data = await file.read(5 * 1024 * 1024 + 1)
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(400, "Image is larger than 5 MB")
    if not any(data.startswith(magic) for magic in (b"\xff\xd8\xff", b"\x89PNG", b"RIFF", b"GIF8")):
        raise HTTPException(400, "That file is not a valid image")
    os.makedirs(ASSET_DIR, exist_ok=True)
    name = secrets.token_hex(8) + "." + ("jpg" if ext == "jpeg" else ext)
    with open(os.path.join(ASSET_DIR, name), "wb") as fh:
        fh.write(data)
    audit(a, "image uploaded", name)
    return {"url": "/assets/admin/" + name}


# --------------------------------------------------------------------------- content
EDITABLE_DOCUMENTS = {"jobs": [], "videos": [], "service_options": {}}          # content key -> value when empty


@router.get("/content/json/{name}")
def json_get(name: str, a: Dict = Depends(MGR)):
    if name not in EDITABLE_DOCUMENTS:
        raise HTTPException(404, "Unknown file")
    return {"name": name, "data": content.get(name, EDITABLE_DOCUMENTS[name])}


@router.put("/content/json/{name}")
def json_put(name: str, p: Dict[str, Any], a: Dict = Depends(MGR)):
    if name not in EDITABLE_DOCUMENTS:
        raise HTTPException(404, "Unknown file")
    if "data" not in p:
        raise HTTPException(400, "Missing data")
    content.save(name, p["data"])
    cache.clear_all()
    audit(a, "content json saved", name)
    return {"ok": True}


@router.get("/content/pages")
def pages_list(a: Dict = Depends(MGR)):
    return {"items": [{"slug": k, "title": v.get("title", ""), "size": len(v.get("html", ""))} for k, v in content.get("pages", {}).items()]}


@router.get("/content/pages/{slug}")
def page_get(slug: str, a: Dict = Depends(MGR)):
    pages = content.get("pages", {})
    if slug not in pages:
        raise HTTPException(404, "Page not found")
    return {"slug": slug, **pages[slug]}


@router.put("/content/pages/{slug}")
def page_put(slug: str, p: Dict[str, Any], a: Dict = Depends(MGR)):
    if not re.match(r"^[a-z0-9][a-z0-9\-]{0,80}$", slug):
        raise HTTPException(400, "Page address may contain only lowercase letters, numbers and dashes")
    pages = content.get("pages", {})
    pages[slug] = {"title": str(p.get("title", slug)), "html": str(p.get("html", ""))}
    content.save("pages", pages)
    cache.clear_all()
    audit(a, "page saved", slug)
    return {"ok": True}


@router.delete("/content/pages/{slug}")
def page_delete(slug: str, a: Dict = Depends(OWN)):
    pages = content.get("pages", {})
    pages.pop(slug, None)
    content.save("pages", pages)
    cache.clear_all()
    audit(a, "page deleted", slug)
    return {"ok": True}


def _faq_html(faqs: List[Dict[str, str]]) -> str:
    intro = ("<p>Here are some of the most common questions we receive about our services. "
             "If you have any other questions, feel free to reach out to us directly.</p>")
    items = "".join(f'<details><summary>{htmllib.escape(f["q"])}</summary><div class="prose">{f["a"]}</div></details>' for f in faqs)
    return intro + '<div class="faq">' + items + "</div>"


@router.get("/content/faqs")
def faqs_get(a: Dict = Depends(MGR)):
    return {"items": content.get("faqs", [])}


@router.put("/content/faqs")
def faqs_put(p: Dict[str, Any], a: Dict = Depends(MGR)):
    items = [{"q": str(f.get("q", "")).strip(), "a": str(f.get("a", "")).strip()} for f in (p.get("items") or []) if str(f.get("q", "")).strip()]
    content.save("faqs", items)
    pages = content.get("pages", {})
    pages["faq"] = {"title": (pages.get("faq") or {}).get("title", "Frequently Asked Questions"), "html": _faq_html(items)}
    content.save("pages", pages)
    cache.clear_all()
    audit(a, "faqs saved", "", len(items))
    return {"ok": True, "count": len(items)}


@router.get("/content/hero")
def hero_get(a: Dict = Depends(MGR)):
    return {"items": content.get("home", {}).get("slides", [])}


@router.put("/content/hero")
def hero_put(p: Dict[str, Any], a: Dict = Depends(MGR)):
    slides = []
    for s in p.get("items") or []:
        image = str(s.get("image", "")).strip()
        if not image:
            raise HTTPException(400, "Every slide needs an image")
        slides.append({"title": str(s.get("title", "")).strip(), "link": str(s.get("link", "")).strip() or "/", "image": image})
    if not slides:
        raise HTTPException(400, "Keep at least one slide")
    home = content.get("home", {})
    home["slides"] = slides
    content.save("home", home)
    cache.clear_all()
    audit(a, "hero slides saved", "", len(slides))
    return {"ok": True, "count": len(slides)}


@router.post("/content/hero/cleanup")
def hero_cleanup(a: Dict = Depends(MGR)):
    """Delete hero image files that no slide uses any more."""
    used = {os.path.basename(s["image"]) for s in content.get("home", {}).get("slides", [])}
    removed = []
    for folder in (*HERO_DIRS, ASSET_DIR):
        if not os.path.isdir(folder):
            continue
        for name in os.listdir(folder):
            is_hero = name.startswith("hero_") or (folder == ASSET_DIR and not name.startswith("prod_"))
            if is_hero and name not in used:
                os.remove(os.path.join(folder, name))
                removed.append(name)
    audit(a, "hero cleanup", "", {"removed": len(removed)})
    return {"removed": removed}


@router.get("/content/blogs")
def blogs_list(q: str = "", page: int = 1, limit: int = 25, a: Dict = Depends(MGR)):
    posts = content.blog_posts()
    if q:
        posts = [x for x in posts if q.lower() in x.get("title", "").lower()]
    total = len(posts)
    part = posts[offset(page, limit): offset(page, limit) + limit]
    return {"items": [{k: x.get(k) for k in ("slug", "title", "created_at", "created_by", "view_count", "kinds")} for x in part],
            "total": total, "page": page, "pages": page_count(total, limit)}


@router.get("/content/blogs/{slug}")
def blog_get(slug: str, a: Dict = Depends(MGR)):
    post = next((x for x in content.blog_posts() if x["slug"] == slug), None)
    if not post:
        raise HTTPException(404, "Post not found")
    return {**post, "html": content.blog_html(slug) or ""}


@router.put("/content/blogs/{slug}")
def blog_put(slug: str, p: Dict[str, Any], a: Dict = Depends(MGR)):
    if not re.match(r"^[a-z0-9][a-z0-9\-]{0,120}$", slug):
        raise HTTPException(400, "Address may contain only lowercase letters, numbers and dashes")
    post = next((x for x in content.blog_posts() if x["slug"] == slug), None) or {
        "slug": slug, "created_at": time.strftime("%Y-%m-%d 00:00:00"), "created_by": a["name"] or "MySemicon", "view_count": 0, "kinds": ["blog"]}
    for key in ("title", "description", "banner_url"):
        if key in p:
            post[key] = str(p[key])
    if p.get("kind") in ("blog", "tutorial"):
        post["kinds"] = [p["kind"]]
    content.save_blog(post, str(p["html"]) if "html" in p else None)
    cache.clear_all()
    audit(a, "blog saved", slug)
    return {"ok": True}


@router.delete("/content/blogs/{slug}")
def blog_delete(slug: str, a: Dict = Depends(MGR)):
    content.delete_blog(slug)
    cache.clear_all()
    audit(a, "blog deleted", slug)
    return {"ok": True}


# --------------------------------------------------------------------------- settings
@router.get("/settings")
def settings_get(a: Dict = Depends(OWN)):
    return settings.get()


@router.put("/settings")
def settings_put(p: Dict[str, Any], a: Dict = Depends(OWN)):
    try:
        current = settings.save(p)
    except (ValueError, TypeError) as e:
        raise HTTPException(400, str(e))
    cache.clear_all()
    audit(a, "settings saved", "", current)
    return {"ok": True}


# --------------------------------------------------------------------------- admin accounts, audit, system
@router.get("/admins")
def admins_list(a: Dict = Depends(OWN)):
    return {"items": db.fetch_all("SELECT id, name, email, role, active, created, last_login FROM admins ORDER BY id"), "roles": list(ROLES)}


@router.post("/admins")
def admin_create(p: Dict[str, Any], a: Dict = Depends(OWN)):
    email, role = str(p.get("email", "")).strip().lower(), str(p.get("role", ""))
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email) or role not in ROLES:
        raise HTTPException(400, "Enter a valid email and role")
    pw = str(p.get("password", ""))
    check_password_strength(pw)
    salt = secrets.token_hex(16)
    try:
        db.execute("INSERT INTO admins (name, email, pw_hash, salt, role, active, created) VALUES (%s, %s, %s, %s, %s, TRUE, %s)",
                   (str(p.get("name", "")).strip(), email, hash_pw(pw, salt), salt, role, now()))
    except psycopg2.errors.UniqueViolation:
        raise HTTPException(409, "An admin with this email already exists")
    audit(a, "admin created", email, role)
    return {"ok": True}


@router.patch("/admins/{aid}")
def admin_update(aid: int, p: Dict[str, Any], a: Dict = Depends(OWN)):
    with db.transaction() as cur:
        cur.execute("SELECT * FROM admins WHERE id = %s", (aid,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(404, "Admin not found")
        cur.execute("SELECT COUNT(*) AS n FROM admins WHERE role = 'owner' AND active")
        owners = cur.fetchone()["n"]
        if row["role"] == "owner" and owners <= 1 and (p.get("active") is False or (p.get("role") and p["role"] != "owner")):
            raise HTTPException(400, "There must be at least one active owner")
        if "role" in p:
            if p["role"] not in ROLES:
                raise HTTPException(400, "Unknown role")
            cur.execute("UPDATE admins SET role = %s WHERE id = %s", (p["role"], aid))
        if "active" in p:
            cur.execute("UPDATE admins SET active = %s WHERE id = %s", (bool(p["active"]), aid))
            if not p["active"]:
                cur.execute("DELETE FROM admin_sessions WHERE admin_id = %s", (aid,))
        if "name" in p:
            cur.execute("UPDATE admins SET name = %s WHERE id = %s", (str(p["name"]).strip(), aid))
        if p.get("password"):
            check_password_strength(str(p["password"]))
            salt = secrets.token_hex(16)
            cur.execute("UPDATE admins SET pw_hash = %s, salt = %s WHERE id = %s", (hash_pw(str(p["password"]), salt), salt, aid))
            cur.execute("DELETE FROM admin_sessions WHERE admin_id = %s", (aid,))
    audit(a, "admin updated", row["email"], {k: ("***" if k == "password" else v) for k, v in p.items()})
    return {"ok": True}


@router.get("/audit")
def audit_list(q: str = "", page: int = 1, limit: int = 50, a: Dict = Depends(OWN)):
    cond = "admin ILIKE %s OR action ILIKE %s OR target ILIKE %s"
    total = count(f"SELECT COUNT(*) FROM audit_log WHERE {cond}", [like(q)] * 3)
    rows = db.fetch_all(f"SELECT * FROM audit_log WHERE {cond} ORDER BY id DESC LIMIT %s OFFSET %s", [like(q)] * 3 + [limit, offset(page, limit)])
    return {"items": rows, "total": total, "page": page, "pages": page_count(total, limit)}


@router.get("/system")
def system(a: Dict = Depends(OWN)):
    backups = sorted(os.listdir(config.BACKUP_DIR), reverse=True)[:10] if os.path.isdir(config.BACKUP_DIR) else []
    tables = db.fetch_all(
        "SELECT c.relname AS name, pg_total_relation_size(c.oid) AS bytes FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace "
        "WHERE n.nspname = %s AND c.relkind = 'r'", (config.DB_SCHEMA,))
    size = {r["name"]: r["bytes"] for r in tables}
    groups = {"catalogue (products, categories, brands)": ("products", "categories", "brands", "product_categories", "product_tags", "tags",
                                                         "removed_products", "live_prices"),
              "shop (orders, customers, admin)": ("orders", "users", "sessions", "enquiries", "enquiry_meta", "admins", "admin_sessions",
                                                  "audit_log", "product_locks"),
              "content (pages, blogs, settings)": ("content", "blog_posts")}
    return {"uptime_minutes": round((time.time() - STARTED) / 60), "server_time": now(),
            "databases": {label: sum(size.get(t, 0) for t in names) for label, names in groups.items()},
            "uploads": len(os.listdir(config.UPLOAD_DIR)) if os.path.isdir(config.UPLOAD_DIR) else 0, "backups": backups}


@router.post("/system/clear-cache")
def system_cache(a: Dict = Depends(OWN)):
    cache.clear_all()
    audit(a, "cache cleared")
    return {"ok": True}


def _find_pg_dump() -> Optional[str]:
    """pg_dump from PATH, or the newest PostgreSQL install on Windows."""
    import shutil
    found = shutil.which("pg_dump")
    if found:
        return found
    candidates = sorted(glob.glob(r"C:\Program Files\PostgreSQL\*\bin\pg_dump.exe"),
                        key=lambda p: int(re.search(r"PostgreSQL\\(\d+)", p).group(1)), reverse=True)
    return candidates[0] if candidates else None


@router.post("/system/backup")
def system_backup(a: Dict = Depends(OWN)):
    """Dump the application schema (catalogue, shop, content) with pg_dump into data/backups/<time>/mysemicon.dump."""
    pg_dump = _find_pg_dump()
    if not pg_dump:
        raise HTTPException(500, "pg_dump was not found. Install the PostgreSQL client tools or add them to PATH.")
    dest = os.path.join(config.BACKUP_DIR, time.strftime("%Y%m%d_%H%M%S"))
    os.makedirs(dest, exist_ok=True)
    result = subprocess.run([pg_dump, "--dbname", config.DATABASE_URL, "--schema", config.DB_SCHEMA, "--format", "custom",
                             "--file", os.path.join(dest, "mysemicon.dump")], capture_output=True, text=True)
    if result.returncode != 0:
        raise HTTPException(500, "Backup failed: " + (result.stderr.strip().splitlines() or ["pg_dump error"])[-1])
    audit(a, "backup", os.path.basename(dest))
    return {"ok": True, "folder": os.path.basename(dest)}


# --------------------------------------------------------------------------- invoices
_invoice_no = invoice.invoice_no


@router.get("/orders/{oid}/invoice")
def order_invoice(oid: str, a: Dict = Depends(ANY)):
    r = db.fetch_one("SELECT * FROM orders WHERE order_id = %s", (oid,))
    if not r:
        raise HTTPException(404, "Order not found")
    return Response(invoice.render(r, settings.get()), media_type="text/html")


# --------------------------------------------------------------------------- analytics, badges, inventory, search
def _pct(cur: float, prev: float) -> Optional[float]:
    return None if not prev else round((cur - prev) / prev * 100, 1)


def _period_summary(rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    live = [r for r in rows if r["status"] not in INACTIVE_ORDERS]
    revenue = round(sum(r["total"] for r in live), 2)
    units = sum(sum(int(i.get("qty", 1)) for i in r["payload"].get("items", [])) for r in live)
    return {"orders": len(rows), "revenue": revenue, "aov": round(revenue / len(live), 2) if live else 0, "units": units}


@router.get("/analytics")
def analytics(days: int = 30, a: Dict = Depends(ANY)):
    days = max(7, min(int(days), 365))
    t_now = time.time()
    start_cur, start_prev = hours_ago(days * 24), hours_ago(days * 48)
    rows = db.fetch_all("SELECT order_id, user_id, email, payload, total, status, created FROM orders WHERE created >= %s", (start_prev,))
    cur_rows = [r for r in rows if r["created"] >= start_cur]
    prev_rows = [r for r in rows if r["created"] < start_cur]
    cs, ps = _period_summary(cur_rows), _period_summary(prev_rows)
    daily = {time.strftime("%Y-%m-%d", time.localtime(t_now - i * 86400)): [0, 0.0] for i in range(days - 1, -1, -1)}
    status_count: Dict[str, int] = {}
    pay: Dict[str, List[float]] = {}
    city: Dict[str, List[float]] = {}
    products_sold: Dict[Any, Dict[str, Any]] = {}
    category_revenue: Dict[str, float] = {}
    top_category: Dict[Any, str] = {}
    buyers: Dict[str, int] = {}
    for r in cur_rows:
        pl = r["payload"]
        dead = r["status"] in INACTIVE_ORDERS
        day = r["created"][:10]
        if day in daily:
            daily[day][0] += 1
            if not dead:
                daily[day][1] += r["total"]
        status_count[r["status"]] = status_count.get(r["status"], 0) + 1
        method = pl.get("payment", "cod")
        town = (pl.get("customer") or {}).get("city", "") or "Unknown"
        pay.setdefault(method, [0, 0.0])[0] += 1
        city.setdefault(town, [0, 0.0])[0] += 1
        buyers[r["email"].lower()] = buyers.get(r["email"].lower(), 0) + 1
        if dead:
            continue
        pay[method][1] += r["total"]
        city[town][1] += r["total"]
        for it in pl.get("items") or []:
            key, line = it.get("id"), float(it.get("line_total", 0))
            entry = products_sold.setdefault(key, {"id": key, "name": it.get("name", ""), "sku": it.get("sku", ""), "image": it.get("image", ""),
                                                   "qty": 0, "revenue": 0.0})
            entry["qty"] += int(it.get("qty", 1))
            entry["revenue"] += line
            if key not in top_category:
                top_category[key] = db.fetch_val(
                    "SELECT k.name FROM product_categories c JOIN categories k ON k.slug = c.cat_slug WHERE c.product_id = %s AND k.depth = 0 LIMIT 1",
                    (str(key),), "Other")
            category_revenue[top_category[key]] = category_revenue.get(top_category[key], 0.0) + line
    new_customers = count("SELECT COUNT(*) FROM users WHERE created >= %s", (start_cur,))
    new_previous = count("SELECT COUNT(*) FROM users WHERE created >= %s AND created < %s", (start_prev, start_cur))
    top_products = sorted(products_sold.values(), key=lambda x: -x["revenue"])[:8]
    for x in top_products:
        x["revenue"] = round(x["revenue"], 2)
        x["image"] = media.local_image(x["image"]) if x["image"] and not str(x["image"]).startswith("/") else x["image"]
    return {
        "days": days, "current": cs, "previous": ps,
        "change": {k: _pct(cs[k], ps[k]) for k in cs},
        "customers": {"new": new_customers, "new_previous": new_previous, "change": _pct(new_customers, new_previous),
                      "buyers": len(buyers), "repeat": sum(1 for v in buyers.values() if v > 1)},
        "daily": [{"date": d, "orders": v[0], "revenue": round(v[1], 2)} for d, v in daily.items()],
        "status": status_count,
        "payment": [{"method": k, "orders": v[0], "revenue": round(v[1], 2)} for k, v in sorted(pay.items(), key=lambda kv: -kv[1][0])],
        "cities": [{"city": k, "orders": v[0], "revenue": round(v[1], 2)} for k, v in sorted(city.items(), key=lambda kv: -kv[1][1])[:8]],
        "top_products": top_products,
        "categories": [{"name": k, "revenue": round(v, 2)} for k, v in sorted(category_revenue.items(), key=lambda kv: -kv[1])[:7]],
    }


@router.get("/badges")
def badges(a: Dict = Depends(ANY)):
    return {"notifications_unread": count("SELECT COUNT(*) FROM notifications WHERE NOT is_read"),
            "orders_new": count("SELECT COUNT(*) FROM orders WHERE status = 'Confirmed'"),
            "orders_to_ship": count("SELECT COUNT(*) FROM orders WHERE status = 'Packed'"),
            "enquiries_new": count("SELECT COUNT(*) FROM enquiries e LEFT JOIN enquiry_meta m ON m.enquiry_id = e.id "
                                   "WHERE COALESCE(m.status, 'new') = 'new' AND e.kind != 'newsletter'"),
            "low_stock": count("SELECT COUNT(*) FROM products WHERE in_stock AND available_quantity <= 5"),
            "out_of_stock": count("SELECT COUNT(*) FROM products WHERE NOT in_stock")}


@router.get("/inventory")
def inventory(show: str = "low", q: str = "", threshold: int = 5, page: int = 1, limit: int = 25, a: Dict = Depends(MGR)):
    where, params = [], []
    if show == "low":
        where.append("in_stock AND available_quantity <= %s")
        params.append(threshold)
    elif show == "out":
        where.append("NOT in_stock")
    elif show == "in":
        where.append("in_stock")
    if q:
        where.append("(name_lc ILIKE %s OR sku ILIKE %s)")
        params += [like(q.lower())] * 2
    clause = (" WHERE " + " AND ".join(where)) if where else ""
    total = count("SELECT COUNT(*) FROM products" + clause, params)
    rows = db.fetch_all("SELECT id, sku, name, brand_name, final_price, regular_price, available_quantity, in_stock, image FROM products"
                        + clause + " ORDER BY available_quantity, popularity LIMIT %s OFFSET %s", params + [limit, offset(page, limit)])
    summary = db.fetch_one("SELECT COUNT(*) AS products, COUNT(*) FILTER (WHERE in_stock) AS in_stock, COUNT(*) FILTER (WHERE NOT in_stock) AS out, "
                           "COUNT(*) FILTER (WHERE in_stock AND available_quantity <= %s) AS low FROM products", (threshold,))
    locked = _locked_ids([r["id"] for r in rows])
    return {"items": [{"id": r["id"], "sku": r["sku"], "name": r["name"], "brand": r["brand_name"], "price": r["final_price"],
                       "qty": r["available_quantity"], "in_stock": r["in_stock"], "img": media.local_image(r["image"]), "locked": r["id"] in locked}
                      for r in rows],
            "total": total, "page": page, "pages": page_count(total, limit), "summary": summary}


@router.get("/search")
def global_search(q: str = "", a: Dict = Depends(ANY)):
    q = q.strip()
    if len(q) < 2:
        return {"orders": [], "customers": [], "products": [], "enquiries": []}
    orders_ = [{"id": r["order_id"], "label": r["order_id"],
                "sub": f'{(r["payload"].get("customer") or {}).get("name", "")} · ₹{r["total"]:,.0f} · {r["status"]}'}
               for r in db.fetch_all("SELECT * FROM orders WHERE order_id ILIKE %s OR email ILIKE %s OR phone ILIKE %s OR payload::text ILIKE %s "
                                     "ORDER BY created DESC LIMIT 5", (like(q),) * 4)]
    customers = [{"id": r["id"], "label": r["name"], "sub": r["email"]}
                 for r in db.fetch_all("SELECT id, name, email FROM users WHERE name ILIKE %s OR email ILIKE %s OR phone ILIKE %s LIMIT 5", (like(q),) * 3)]
    enquiries_ = [{"id": r["id"], "label": r["payload"].get("reference") or f"#{r['id']}", "sub": f'{r["kind"]} · {r["payload"].get("name", "")}'}
                  for r in db.fetch_all("SELECT * FROM enquiries WHERE payload::text ILIKE %s ORDER BY id DESC LIMIT 5", (like(q),))]
    products_ = []
    if a["role"] in (OWNER, MANAGER):
        products_ = [{"id": r["id"], "label": r["name"][:70], "sub": f'{r["sku"]} · ₹{r["final_price"]:,.0f}'}
                     for r in db.fetch_all("SELECT id, name, sku, final_price FROM products WHERE name_lc ILIKE %s OR sku ILIKE %s LIMIT 6",
                                           (like(q.lower()),) * 2)]
    return {"orders": orders_, "customers": customers, "products": products_, "enquiries": enquiries_}


@router.post("/mail/test")
def mail_test(p: Dict[str, Any], a: Dict = Depends(ANY)):
    """Send a test e-mail so the SMTP settings can be checked after deploying."""
    to = str(p.get("to") or a["email"]).strip()
    err = notify.send(to, f"{config.STORE_NAME}: test e-mail", "If you can read this, order and form e-mails are working.", wait=True)
    if err:
        raise HTTPException(502, "Could not send: " + err)
    return {"ok": True, "to": to, "store_inbox": notify.store_inbox()}


@router.get("/mail/status")
def mail_status(a: Dict = Depends(ANY)):
    mine = db.fetch_val("SELECT COUNT(*) FROM push_subscriptions WHERE audience = 'admin' AND admin_id = %s", (a["id"],), 0)
    return {"enabled": notify.enabled(), "store_inbox": notify.store_inbox(), "online_payments": integrations.payments_on(),
            "push_devices": db.fetch_val("SELECT COUNT(*) FROM push_subscriptions WHERE audience = 'admin'", (), 0), "push_mine": mine,
            "waiting_restock": db.fetch_val("SELECT COUNT(*) FROM restock_requests WHERE notified_at IS NULL", (), 0)}


@router.post("/push/subscribe")
def admin_push_subscribe(p: Dict[str, Any], a: Dict = Depends(ANY)):
    try:
        push.save_subscription(p.get("subscription") or {}, "admin", a["id"])
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {"ok": True}


@router.post("/push/test")
def admin_push_test(a: Dict = Depends(ANY)):
    rows = db.fetch_all("SELECT * FROM push_subscriptions WHERE audience = 'admin' AND admin_id = %s", (a["id"],))
    if not rows:
        raise HTTPException(400, "Notifications are not enabled on any of your devices yet")
    n = push.send(rows, {"title": "MySemicon test", "body": "Notifications are working on this device.", "url": "/admin", "tag": "test"}, wait=True)
    return {"ok": True, "delivered": n}


@router.get("/notifications")
def notifications(a: Dict = Depends(ANY)):
    items = db.fetch_all("SELECT id, kind, title, body, url, is_read, created FROM notifications ORDER BY id DESC LIMIT 25")
    return {"items": items, "unread": db.fetch_val("SELECT COUNT(*) FROM notifications WHERE NOT is_read", (), 0)}


@router.post("/notifications/read")
def notifications_read(p: Dict[str, Any], a: Dict = Depends(ANY)):
    ids = [int(i) for i in (p.get("ids") or [])]
    if ids:
        db.execute("UPDATE notifications SET is_read = TRUE WHERE id = ANY(%s)", (ids,))
    else:
        db.execute("UPDATE notifications SET is_read = TRUE WHERE NOT is_read")
    return {"ok": True}


@router.get("/integrations")
def integrations_get(a: Dict = Depends(OWN)):
    return integrations.status()


@router.post("/integrations")
def integrations_save(p: Dict[str, Any], a: Dict = Depends(OWN)):
    """E-mail and online-payment settings, saved in the database. {"clear": "email"|"payments"} switches a group off."""
    if p.get("clear"):
        integrations.clear(str(p["clear"]))
    else:
        integrations.save({k: v for k, v in p.items() if k in integrations.FIELDS})
    audit(a, "integration settings", str(p.get("clear") or "saved"), {"fields": [k for k in p if k in integrations.FIELDS]})
    return {"ok": True}
