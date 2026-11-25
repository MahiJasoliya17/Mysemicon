"""Catalogue API: category tree and menu, product listings with filters, search suggestions, brands and tags."""
import os
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, HTTPException, Query

from backend import cache, config, content, db
from backend.media import local_image
from backend.rebrand import brand_text

router = APIRouter()

# columns a product card needs (the heavy description / specification columns stay out of listings)
LIST_COLS = ("p.id, p.sku, p.name, p.slug, p.brand_name, p.brand_slug, p.regular_price, p.final_price, p.discount, "
             "p.in_stock, p.available_quantity, p.image, p.has_tiers")

SORTS = {
    "popularity": "p.popularity",
    "latest": "p.queue_id DESC",
    "price_asc": "p.in_stock DESC, p.final_price ASC",
    "price_desc": "p.in_stock DESC, p.final_price DESC",
    "discount": "p.in_stock DESC, p.discount DESC",
    "name": 'p.name_lc COLLATE "C"',
}


def card(row: Dict[str, Any]) -> Dict[str, Any]:
    """A product row (see LIST_COLS) as the JSON card the storefront renders."""
    return {
        "id": row["id"], "sku": row["sku"], "name": brand_text(row["name"]), "slug": row["slug"],
        "brand": brand_text(row["brand_name"]), "brand_slug": row["brand_slug"],
        "price": row["final_price"], "regular": row["regular_price"], "discount": row["discount"],
        "in_stock": row["in_stock"], "qty": row["available_quantity"],
        "image": local_image(row["image"]), "has_tiers": row["has_tiers"],
    }


# ------------------------------------------------------------------ listing core
def _like(text: str) -> str:
    """Escape LIKE wildcards in user input."""
    return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _scope(scope: str) -> Tuple[str, str, List[Any]]:
    """FROM clause, scope condition and params for 'all products', a category slug or 'tag:<slug>'."""
    if not scope:
        return "FROM products p", "", []
    if scope.startswith("tag:"):
        return "FROM product_tags c JOIN products p ON p.id = c.product_id", "c.tag_slug = %s", [scope[4:]]
    return "FROM product_categories c JOIN products p ON p.id = c.product_id", "c.cat_slug = %s", [scope]


def _filters(brand, q, in_stock, min_price, max_price, on_sale) -> Tuple[List[str], List[Any]]:
    conds: List[str] = []
    params: List[Any] = []
    if brand:
        conds.append("p.brand_slug = ANY(%s)")
        params.append([b for b in brand.split(",") if b][:20])
    for token in (q or "").lower().split()[:6]:
        conds.append("(p.name_lc ILIKE %s OR p.sku ILIKE %s OR p.brand_name ILIKE %s)")
        params += [f"%{_like(token)}%"] * 3
    if in_stock:
        conds.append("p.in_stock")
    if min_price is not None:
        conds.append("p.final_price >= %s")
        params.append(min_price)
    if max_price:
        conds.append("p.final_price <= %s")
        params.append(max_price)
    if on_sale:
        conds.append("p.discount > 0")
    return conds, params


def _where(*parts: str) -> str:
    parts = [p for p in parts if p]
    return " WHERE " + " AND ".join(parts) if parts else ""


@cache.ttl(60)
def cached_count(scope: str, brand, q, in_stock, min_price, max_price, on_sale) -> int:
    conds, params = _filters(brand, q, in_stock, min_price, max_price, on_sale)
    if scope and not conds and scope in tree():
        return tree()[scope]["total"]
    source, scope_cond, scope_params = _scope(scope)
    return db.fetch_val(f"SELECT COUNT(*) {source}{_where(scope_cond, *conds)}", scope_params + params)


def run_listing(scope: Optional[str] = None, brand=None, q=None, in_stock=False, min_price=None, max_price=None,
                sort="popularity", page=1, limit=24, on_sale=False) -> Dict[str, Any]:
    scope = scope or ""
    total = cached_count(scope, brand, q, in_stock, min_price, max_price, on_sale)
    conds, params = _filters(brand, q, in_stock, min_price, max_price, on_sale)
    source, scope_cond, scope_params = _scope(scope)
    rows = db.fetch_all(
        f"SELECT {LIST_COLS} {source}{_where(scope_cond, *conds)} ORDER BY {SORTS.get(sort, SORTS['popularity'])} LIMIT %s OFFSET %s",
        scope_params + params + [limit, (page - 1) * limit])
    return {"items": [card(r) for r in rows], "total": total, "page": page, "limit": limit,
            "pages": max(1, (total + limit - 1) // limit)}


@cache.ttl(300)
def cached_facets(scope: str, q: str) -> Dict[str, Any]:
    """Brand counts (top 40) and the price range for a category / tag / search."""
    conds, params = _filters(None, q, False, None, None, False)
    source, scope_cond, scope_params = _scope(scope)
    params = scope_params + params
    branded = _where(scope_cond, *conds, "p.brand_slug <> ''")
    brands = db.fetch_all(f"SELECT p.brand_slug AS slug, COUNT(*) AS n {source}{branded} GROUP BY p.brand_slug ORDER BY n DESC, p.brand_slug LIMIT 40", params)
    names = {r["slug"]: r["name"] for r in db.fetch_all("SELECT slug, name FROM brands WHERE slug = ANY(%s)", ([b["slug"] for b in brands],))}
    price = db.fetch_one(f"SELECT MIN(p.final_price) AS lo, MAX(p.final_price) AS hi {source}{_where(scope_cond, *conds)}", params)
    return {"brands": [{"slug": b["slug"], "name": names.get(b["slug"], b["slug"]), "n": b["n"]} for b in brands],
            "price_min": price["lo"] or 0, "price_max": price["hi"] or 0}


def _listing_args(brand, q, in_stock, min_price, max_price, sort, page, limit):
    return dict(brand=brand, q=q, in_stock=in_stock, min_price=min_price, max_price=max_price, sort=sort, page=page, limit=limit)


# ------------------------------------------------------------------ categories
@cache.ttl(60)
def tree() -> Dict[str, Dict[str, Any]]:
    rows = db.fetch_all("SELECT slug, id, name, banner, parent, children, total, depth FROM categories")
    return {r["slug"]: {**r, "name": brand_text(r["name"])} for r in rows}


def crumbs(slug: Optional[str]) -> List[Dict[str, str]]:
    t, out, seen = tree(), [], set()
    while slug and slug in t and slug not in seen:
        seen.add(slug)
        out.append({"slug": slug, "name": t[slug]["name"]})
        slug = t[slug]["parent"]
    return list(reversed(out))


def _clean_banner(slug: str, banner: str) -> str:
    """Transparent picture made by scripts/clean_category_images.py (no orange circle); the stored banner when there is none."""
    path = os.path.join(config.FRONTEND_DIR, "assets", "cat_clean", slug + ".webp")
    try:
        return f"/assets/cat_clean/{slug}.webp?v={int(os.path.getmtime(path))}"
    except OSError:
        return banner


def cat_brief(slug: str) -> Dict[str, Any]:
    c = tree()[slug]
    return {"slug": slug, "name": c["name"], "banner": _clean_banner(slug, c["banner"]), "total": c["total"], "has_children": bool(c["children"])}


def _by_size(slugs: List[str], t: Dict[str, Any]) -> List[str]:
    return sorted(slugs, key=lambda s: -t[s]["total"])


# Robu.in lists 17 main categories. Our data also has this one-product category ("Prototyping Services"); it stays reachable
# by its address but is not shown in the menu or on the shop page.
HIDDEN_ROOTS = {"services"}


@router.get("/api/menu")
def menu():
    """Top categories with their children (mega menu); the categories on the home page come first."""
    t = tree()
    order = [c["slug"] for c in content.get("home", {}).get("categories", [])]
    roots = sorted((s for s, v in t.items() if v["parent"] is None and s not in HIDDEN_ROOTS),
                   key=lambda s: (order.index(s) if s in order else 99, -t[s]["total"]))
    out = []
    for s in roots:
        if t[s]["total"] == 0 and s not in order:
            continue
        out.append({
            **cat_brief(s),
            "featured": s in order,
            "children": [{**cat_brief(k), "children": [cat_brief(g) for g in _by_size(t[k]["children"], t)[:12]]}
                         for k in _by_size(t[s]["children"], t) if t[k]["total"] > 0],
        })
    return out


@router.get("/api/category/{slug}")
def category(slug: str, brand: Optional[str] = None, q: Optional[str] = None, in_stock: bool = False,
             min_price: Optional[float] = None, max_price: Optional[float] = None, sort: str = "popularity",
             page: int = Query(1, ge=1), limit: int = Query(24, ge=1, le=96)):
    t = tree()
    if slug not in t:
        raise HTTPException(404, "Category not found")
    result = run_listing(slug, **_listing_args(brand, q, in_stock, min_price, max_price, sort, page, limit))
    result["category"] = {**cat_brief(slug), "crumbs": crumbs(slug)}
    result["children"] = [cat_brief(k) for k in _by_size(t[slug]["children"], t) if t[k]["total"] > 0]
    result["facets"] = cached_facets(slug, q or "")
    return result


# ------------------------------------------------------------------ shop, search, brands, tags
@router.get("/api/shop")
@router.get("/api/products")
def shop(brand: Optional[str] = None, q: Optional[str] = None, in_stock: bool = False,
         min_price: Optional[float] = None, max_price: Optional[float] = None, sort: str = "popularity",
         on_sale: bool = False, page: int = Query(1, ge=1), limit: int = Query(24, ge=1, le=96)):
    result = run_listing(None, on_sale=on_sale, **_listing_args(brand, q, in_stock, min_price, max_price, sort, page, limit))
    result["facets"] = cached_facets("", q or "")
    return result


@router.get("/api/suggest")
def suggest(q: str = Query(..., min_length=2)):
    conds, params = _filters(None, q, False, None, None, False)
    rows = db.fetch_all(
        f"SELECT {LIST_COLS} FROM products p{_where(*conds)} ORDER BY (p.name_lc LIKE %s) DESC, p.popularity LIMIT 8",
        params + [_like(q.strip().lower()) + "%"])
    needle = q.lower()
    cats = sorted((cat_brief(k) for k, v in tree().items() if needle in v["name"].lower() and v["total"] > 0),
                  key=lambda c: -c["total"])
    b_rows = db.fetch_all("SELECT slug, name, total FROM brands WHERE LOWER(name) LIKE %s ORDER BY total DESC LIMIT 3", [f"%{needle}%"])
    return {"products": [card(r) for r in rows], "categories": cats[:5], "brands": b_rows}


def _brand_logos() -> Dict[str, str]:
    return {b["brand_slug"]: b["brand_image"] for b in content.get("home", {}).get("brands", [])}


@router.get("/api/brands")
def brands(q: Optional[str] = None, featured: bool = False):
    logos = _brand_logos()
    if featured:
        return [{"slug": b["brand_slug"], "name": b["brand_name"], "logo": b["brand_image"]}
                for b in content.get("home", {}).get("brands", [])]
    out = [{"slug": r["slug"], "name": r["name"], "total": r["total"], "logo": logos.get(r["slug"], "")}
           for r in db.fetch_all("SELECT slug, name, total FROM brands ORDER BY total DESC, name")]
    return [b for b in out if q.lower() in b["name"].lower()] if q else out


@router.get("/api/brand/{slug}")
def brand(slug: str, q: Optional[str] = None, in_stock: bool = False, min_price: Optional[float] = None,
          max_price: Optional[float] = None, sort: str = "popularity", page: int = Query(1, ge=1),
          limit: int = Query(24, ge=1, le=96)):
    row = db.fetch_one("SELECT slug, name, total FROM brands WHERE slug = %s", (slug,))
    if not row:
        raise HTTPException(404, "Brand not found")
    result = run_listing(None, **_listing_args(slug, q, in_stock, min_price, max_price, sort, page, limit))
    result["brand"] = {**row, "logo": _brand_logos().get(slug, "")}
    result["facets"] = {"brands": [], "price_min": 0, "price_max": 0}
    return result


@router.get("/api/tag/{slug}")
def tag(slug: str, brand: Optional[str] = None, q: Optional[str] = None, in_stock: bool = False,
        min_price: Optional[float] = None, max_price: Optional[float] = None, sort: str = "popularity",
        page: int = Query(1, ge=1), limit: int = Query(24, ge=1, le=96)):
    row = db.fetch_one("SELECT slug, name, total FROM tags WHERE slug = %s", (slug,))
    if not row:
        raise HTTPException(404, "Tag not found")
    result = run_listing("tag:" + slug, **_listing_args(brand, q, in_stock, min_price, max_price, sort, page, limit))
    result["tag"] = row
    result["facets"] = cached_facets("tag:" + slug, q or "")
    return result


# ------------------------------------------------------------------ home page product sets
@cache.ttl(120)
def _featured(limit: int, cat: str) -> Tuple[Dict[str, Any], ...]:
    if cat:
        return tuple(run_listing(cat, in_stock=True, sort="discount", limit=limit)["items"])
    out = []
    cats = content.get("home", {}).get("categories", [])
    for c in cats:
        row = db.fetch_one(
            f"SELECT {LIST_COLS} FROM product_categories pc JOIN products p ON p.id = pc.product_id "
            "WHERE pc.cat_slug = %s AND p.in_stock AND p.image <> '' AND p.final_price > 100 "
            "ORDER BY (p.discount > 0) DESC, p.discount DESC, p.popularity ASC LIMIT 1", (c["slug"],)
        )
        if row:
            out.append(card(row))
        if len(out) >= limit:
            break
    if len(out) < limit:
        existing_ids = [p["id"] for p in out]
        placeholders = f"AND p.id NOT IN ({','.join(str(i) for i in existing_ids)})" if existing_ids else ""
        rem = db.fetch_all(
            f"SELECT {LIST_COLS} FROM products p WHERE p.in_stock AND p.final_price > 100 AND p.image <> '' {placeholders} "
            "ORDER BY p.discount DESC, p.popularity LIMIT %s", (limit - len(out),))
        out.extend(card(r) for r in rem)
    return tuple(out)


@router.get("/api/featured")
def featured(cat: Optional[str] = None, limit: int = 11):
    return list(_featured(min(limit, 40), cat or ""))


@cache.ttl(300)
def _hero_products() -> Tuple[Dict[str, Any], ...]:
    """One in-stock, photographed product from each of the first 7 home categories."""
    out = []
    for c in content.get("home", {}).get("categories", []):
        row = db.fetch_one(
            f"SELECT {LIST_COLS} FROM product_categories c JOIN products p ON p.id = c.product_id "
            "WHERE c.cat_slug = %s AND p.in_stock AND p.image <> '' AND p.final_price BETWEEN 300 AND 20000 "
            "ORDER BY p.popularity LIMIT 1 OFFSET 3", (c["slug"],))
        if row:
            out.append({**card(row), "cat": c["name"], "cat_slug": c["slug"]})
        if len(out) == 7:
            break
    return tuple(out)


@router.get("/api/hero")
def hero_products():
    return list(_hero_products())


def product_count() -> int:
    return cached_count("", None, None, False, None, None, False)
