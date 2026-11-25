# MySemicon

Online electronics store: a FastAPI backend serving a single-page frontend, with **PostgreSQL** as the only database
(108,717 products, 1,430 categories, 1,078 brands, 485 blog posts).

## Run
    pip install -r requirements.txt
    python -m uvicorn backend.main:app --port 8000      # then open http://localhost:8000   (admin panel: /admin)

The database connection comes from `MYSEMICON_DB_URL` (default `postgresql://postgres:@localhost:5432/mysemicon`).
All tables live in the schema `app` (`MYSEMICON_DB_SCHEMA`) and are created on start-up from `backend/schema.sql`.
For anything beyond local use, create a dedicated database user with a password and set `MYSEMICON_DB_URL`.

## Structure
    mysemicon/
      backend/
        main.py        app assembly, static files, single-page-app fallback
        config.py      paths, constants, environment settings
        db.py          PostgreSQL pool and query helpers          schema.sql  every table and index
        catalog.py     categories, menu, listings, search, brands, tags
        product.py     product detail page data                   live.py     live price / stock sync
        shop.py        cart, checkout, orders, accounts, enquiries, service quotes
        pages.py       home, blog, text pages, FAQs, videos, jobs, site data
        admin.py       back-office API (see ADMIN.md)
        content.py     site content documents and blog posts      settings.py store settings
        media.py       local photo / datasheet lookup             rebrand.py  store-name replacement in served text
        cache.py       small TTL cache                            build_data.py  rebuilds category / brand / tag tables
      frontend/        index.html, admin.html, css/, js/, assets/ (logo, banners, category and product images)
      scripts/         maintenance tools (run as `python -m scripts.<name> --help`):
                       migrate_to_postgres, create_admin, seed_demo, refresh_prices, refresh_content, mirror_media,
                       scrape_blogs, build_robu_content, remove_bg, remove_bg_ai
      data/            uploads/ (customer design files), backups/ (admin backups)
    ../scrap_data/     product photos and datasheets (media/) and the scraper's own staging queue

## Database
| Area | Tables |
|---|---|
| Catalogue | products, removed_products, categories, brands, tags, product_categories, product_tags, live_prices |
| Customers and shop | users, sessions, orders, enquiries, enquiry_meta |
| Admin panel | admins, admin_sessions, audit_log, product_locks |
| Content | content (home, pages, faqs, jobs, videos, site, settings, service pages, mirror_map), blog_posts |

After a new scrape into `scrap_data/queue/master_catalog.db`: `python -m scripts.migrate_to_postgres --only catalog`.
Set support phone/email in the admin panel (Store settings).
