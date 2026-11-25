"""Product detail API: one product with its specifications, price tiers, related items and live price."""
import re
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException

from backend import content, db, live
from backend.catalog import LIST_COLS, card, crumbs, tree
from backend.media import local_datasheet, local_image
from backend.rebrand import brand_text, rebrand_html

router = APIRouter()

# specification keys that are internal fields of the source catalogue, not real specifications
HIDDEN_SPECS = {
    "SKU", "Name", "URL Key", "Status", "Short Description", "Description", "Meta Title", "Meta Keywords",
    "Meta Description", "Length", "Height", "Width", "Shipping Class", "Shipping Length", "Shipping Width",
    "Shipping Height", "Custom Backorder Message",
}
SERVICE_SLUGS = {"3d-printing-service1", "metal-laser-cutting", "custom-battery-pack", "industrial-3d-printing",
                 "online-laser-cutting-service", "online-pcb-manufacturing-service"}
SERVICE_CATEGORIES = ("robu-services", "services", "prototyping-services")


def plain_text(html: str, limit: int = 200) -> str:
    text = re.sub(r"<[^>]+>", " ", html or "")
    text = re.sub(r"&nbsp;|&#160;", " ", text)
    return re.sub(r"\s+", " ", text).strip()[:limit]


def _service_extra(slug: str) -> Optional[Dict[str, Any]]:
    """Support strip, warranty, tags, SEO fields and related articles of a service page."""
    extra = content.get("service_extra", {}).get(slug)
    if not extra:
        return None
    posts = {p["slug"]: p for p in content.blog_posts()}
    extra = dict(extra)
    extra["articles"] = [
        {"title": posts[a["slug"]]["title"], "slug": a["slug"], "author": posts[a["slug"]].get("created_by") or "",
         "description": posts[a["slug"]].get("description") or "", "banner": posts[a["slug"]].get("banner_url") or "",
         "created_at": posts[a["slug"]].get("created_at") or ""}
        for a in extra.get("articles", []) if a["slug"] in posts]
    return extra


def _cards(sql: str, params: tuple) -> List[Dict[str, Any]]:
    return [card(r) for r in db.fetch_all(sql, params)]


@router.get("/api/product/{slug}")
def product(slug: str):
    row = db.fetch_one("SELECT * FROM products WHERE slug = %s OR id = %s OR sku = %s LIMIT 1", (slug, slug, slug))
    if not row:
        raise HTTPException(404, "Product not found")
    pid = row["id"]
    base = card(row)
    categories: List[Dict[str, Any]] = row["categories"] or []
    specs_all: Dict[str, Any] = row["specifications"] or {}
    is_service = row["slug"] in SERVICE_SLUGS or any(c.get("url_path") in SERVICE_CATEGORIES for c in categories)
    specs = {} if is_service else {k: v for k, v in specs_all.items() if k not in HIDDEN_SPECS and v}   # services carry configurator ids
    terms = rebrand_html(specs_all.get("Terms Of Service") or "") if is_service else ""

    t = tree()
    primary = next((c["url_path"] for c in categories if c.get("url_path") in t and t[c["url_path"]]["total"] > 0), None)
    related = same_brand = []
    if primary:
        related = _cards(f"SELECT {LIST_COLS} FROM product_categories c JOIN products p ON p.id = c.product_id "
                         "WHERE c.cat_slug = %s AND p.in_stock AND p.id <> %s ORDER BY p.popularity LIMIT 8", (primary, pid))
    if row["brand_slug"]:
        same_brand = _cards(f"SELECT {LIST_COLS} FROM products p WHERE p.brand_slug = %s AND p.id <> %s AND p.in_stock "
                            "ORDER BY p.popularity LIMIT 6", (row["brand_slug"], pid))

    tiers = row["moq_tiers"] or []
    reading = live.fetch(row["slug"]) if row["slug"] and not live.is_locked(pid) else None
    faqs, tags = [], []
    warranty = None
    reviews, rating = [], None
    country = row["country_of_origin"] or "India"

    if reading:
        live.apply(base, reading)
        tiers = reading.get("tiers") or tiers
        base["has_tiers"] = bool(tiers)
        faqs = [{"q": brand_text(f.get("question") or ""), "a": rebrand_html(f.get("answer") or "")}
                for f in reading.get("faqs") or [] if f.get("question")]
        tags = [x for x in reading.get("tags") or [] if isinstance(x, dict)]
        if reading.get("warranty"):
            w = reading["warranty"]
            warranty = {"id": w.get("id"), "title": brand_text(w.get("title") or "15 Days Warranty"),
                        "description": rebrand_html(w.get("description") or "")}
        if reading.get("reviews"):
            rev = reading["reviews"]
            rating = rev.get("average_rating")
            reviews = rev
        if reading.get("specs"):
            for item in reading["specs"]:
                k = (item.get("key") or "").rstrip(":").strip()
                v = item.get("value")
                if k and v and k not in HIDDEN_SPECS:
                    specs[k] = brand_text(str(v))
        if reading.get("country"):
            country = reading["country"]

    # Fallback warranty from row specifications or standard 15-day policy
    if not warranty:
        if specs_all.get("Warranty"):
            warranty = {"title": brand_text(str(specs_all["Warranty"])), "description": f"Standard {specs_all['Warranty']} against manufacturing defects."}
        else:
            warranty = {
                "title": "15 Days Warranty",
                "description": "<p>This item is covered with a standard warranty of 15 days from the time of delivery against manufacturing defects only. Replacement will be done against manufacturing defects.</p><hr /><h5><strong>What voids warranty:</strong></h5><p>If the product is subject to misuse, tampering, static discharge, accident, water or fire damage, use of chemicals or soldered/altered in any way.</p>"
            }

    description = row["description"] or ""
    if is_service:
        service = content.get("services_exact_robu", {}).get(row["slug"])
        if service:
            reviews, rating = service.get("reviews") or [], service.get("rating")
            terms = terms or rebrand_html(service.get("terms") or "")
            description = service.get("description") or description
            if "brand" in service:
                base["brand"] = brand_text(service.get("brand") or "")
            if service.get("sku"):
                base["sku"] = service["sku"]
    extra = _service_extra(row["slug"]) if is_service else None

    return {
        **base,
        "faqs": faqs,
        "tags": tags,
        "images": [local_image(u) for u in row["images"] or []],
        "short_description": rebrand_html(row["short_description"] or ""),
        "description": rebrand_html(description),
        "specs": specs,
        "tiers": tiers,
        "attachments": [{"title": a.get("title") or "Datasheet", "url": local_datasheet(a["url"])}
                        for a in row["attachments"] or [] if a.get("url")],
        "country": country,
        "crumbs": crumbs(primary) if primary else [],
        "categories": [{"slug": c.get("url_path"), "name": brand_text(c.get("name"))} for c in categories if c.get("url_path") in t],
        "related": related,
        "same_brand": same_brand,
        "meta": plain_text(row["short_description"] or description, 160),
        "is_service": is_service,
        "terms": terms,
        "extra": extra,
        "warranty": warranty,
        "meta_title": brand_text((extra or {}).get("meta_title") or ""),
        "meta_description": brand_text((extra or {}).get("meta_description") or ""),
        "reviews": reviews,
        "rating": rating,
    }
