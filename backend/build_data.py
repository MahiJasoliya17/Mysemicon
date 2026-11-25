"""Rebuild the derived catalogue tables from `products` and the category tree.

  product_categories  every product listed under its categories and all their ancestors
  categories          product totals and depth
  brands              one row per brand with its product count
  tags                product totals

Run after products were imported or changed in bulk:
    python -m backend.build_data
"""
import io
import time
from typing import Dict, Optional

from backend import db


def _ancestors(slug: Optional[str], parents: Dict[str, Optional[str]]):
    out, seen = [], set()
    while slug and slug in parents and slug not in seen:
        seen.add(slug)
        out.append(slug)
        slug = parents[slug]
    return out


def rebuild(conn) -> Dict[str, int]:
    """Rebuild all derived tables inside the given connection (the caller commits)."""
    with conn.cursor() as cur:
        cur.execute("SELECT slug, parent FROM categories")
        parents = {slug: parent for slug, parent in cur.fetchall()}
        cur.execute("TRUNCATE product_categories")
        buf, rows = io.StringIO(), 0
        with conn.cursor(name="products_stream") as stream:        # server-side cursor: constant memory
            stream.itersize = 5000
            stream.execute("SELECT id, categories FROM products")
            for pid, cats in stream:
                seen = set()
                for c in cats or []:
                    for slug in _ancestors((c or {}).get("url_path"), parents):
                        if slug not in seen:
                            seen.add(slug)
                            buf.write(f"{slug}\t{pid}\n")
                            rows += 1
        buf.seek(0)
        cur.copy_expert("COPY product_categories (cat_slug, product_id) FROM STDIN", buf)

        cur.execute("UPDATE categories c SET total = COALESCE(t.n, 0) FROM "
                    "(SELECT cat_slug, COUNT(*) AS n FROM product_categories GROUP BY cat_slug) t WHERE t.cat_slug = c.slug")
        cur.execute("UPDATE categories SET total = 0 WHERE slug NOT IN (SELECT DISTINCT cat_slug FROM product_categories)")
        for slug in parents:
            cur.execute("UPDATE categories SET depth = %s WHERE slug = %s", (len(_ancestors(slug, parents)) - 1, slug))

        cur.execute("TRUNCATE brands")
        cur.execute("INSERT INTO brands (slug, name, total) SELECT brand_slug, MIN(brand_name), COUNT(*) "
                    "FROM products WHERE brand_slug <> '' GROUP BY brand_slug")
        cur.execute("UPDATE tags t SET total = COALESCE(n.c, 0) FROM "
                    "(SELECT tag_slug, COUNT(*) AS c FROM product_tags GROUP BY tag_slug) n WHERE n.tag_slug = t.slug")
        cur.execute("SELECT COUNT(*) FROM brands")
        brands = cur.fetchone()[0]
    return {"product_categories": rows, "categories": len(parents), "brands": brands}


def main() -> None:
    started = time.time()
    conn = db.connect()
    try:
        stats = rebuild(conn)
        conn.commit()
    finally:
        conn.close()
    print(f"rebuilt {stats} in {time.time() - started:.1f}s")


if __name__ == "__main__":
    main()
