-- MySemicon database schema (PostgreSQL). Applied by `python -m backend.db` and by scripts/migrate_to_postgres.py.
-- Every statement is idempotent, so it is safe to run repeatedly.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------- catalogue
CREATE TABLE IF NOT EXISTS products (
    id                 TEXT PRIMARY KEY,
    queue_id           INTEGER NOT NULL DEFAULT 0,
    sku                TEXT NOT NULL,
    name               TEXT NOT NULL,
    name_lc            TEXT NOT NULL,                       -- lower(name), searched with the trigram index
    slug               TEXT NOT NULL,
    url                TEXT,
    type               TEXT,
    brand_name         TEXT NOT NULL DEFAULT '',
    brand_slug         TEXT NOT NULL DEFAULT '',
    regular_price      DOUBLE PRECISION NOT NULL DEFAULT 0,
    final_price        DOUBLE PRECISION NOT NULL DEFAULT 0,
    discount           INTEGER NOT NULL DEFAULT 0,          -- percent, derived from the two prices
    in_stock           BOOLEAN NOT NULL DEFAULT FALSE,
    available_quantity INTEGER NOT NULL DEFAULT 0,
    country_of_origin  TEXT,
    short_description  TEXT,
    description        TEXT,
    specifications     JSONB NOT NULL DEFAULT '{}'::jsonb,
    categories         JSONB NOT NULL DEFAULT '[]'::jsonb,
    images             JSONB NOT NULL DEFAULT '[]'::jsonb,
    attachments        JSONB NOT NULL DEFAULT '[]'::jsonb,
    moq_tiers          JSONB NOT NULL DEFAULT '[]'::jsonb,
    image              TEXT NOT NULL DEFAULT '',            -- first image URL, for listing cards
    has_tiers          BOOLEAN NOT NULL DEFAULT FALSE,
    popularity         INTEGER NOT NULL DEFAULT 0,          -- sort key: in-stock first, then newest queue id
    scraped_at         TIMESTAMP
);
CREATE INDEX IF NOT EXISTS products_slug_idx       ON products (slug);
CREATE INDEX IF NOT EXISTS products_sku_idx        ON products (sku);
CREATE INDEX IF NOT EXISTS products_popularity_idx ON products (popularity);
CREATE INDEX IF NOT EXISTS products_latest_idx     ON products (queue_id DESC);
CREATE INDEX IF NOT EXISTS products_price_idx      ON products (in_stock DESC, final_price);
CREATE INDEX IF NOT EXISTS products_discount_idx   ON products (in_stock DESC, discount DESC);
CREATE INDEX IF NOT EXISTS products_brand_idx      ON products (brand_slug, popularity);
CREATE INDEX IF NOT EXISTS products_name_trgm      ON products USING gin (name_lc gin_trgm_ops);
CREATE INDEX IF NOT EXISTS products_sku_trgm       ON products USING gin (sku gin_trgm_ops);
CREATE INDEX IF NOT EXISTS products_brand_trgm     ON products USING gin (brand_name gin_trgm_ops);

CREATE TABLE IF NOT EXISTS removed_products (        -- products taken off sale; kept for reference and restore
    id         TEXT PRIMARY KEY,
    data       JSONB NOT NULL,
    removed_at TIMESTAMP NOT NULL DEFAULT LOCALTIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
    slug     TEXT PRIMARY KEY,
    id       INTEGER,
    name     TEXT NOT NULL,
    banner   TEXT NOT NULL DEFAULT '',
    parent   TEXT,
    children JSONB NOT NULL DEFAULT '[]'::jsonb,
    total    INTEGER NOT NULL DEFAULT 0,                 -- products including every sub-category
    depth    INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS brands (
    slug  TEXT PRIMARY KEY,
    name  TEXT NOT NULL,
    total INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS tags (
    slug  TEXT PRIMARY KEY,
    name  TEXT NOT NULL,
    total INTEGER NOT NULL DEFAULT 0
);
-- a product is listed under its categories and all their ancestors
CREATE TABLE IF NOT EXISTS product_categories (
    cat_slug   TEXT NOT NULL,
    product_id TEXT NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    PRIMARY KEY (cat_slug, product_id)
);
CREATE INDEX IF NOT EXISTS product_categories_product_idx ON product_categories (product_id);
CREATE TABLE IF NOT EXISTS product_tags (
    tag_slug   TEXT NOT NULL,
    product_id TEXT NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    PRIMARY KEY (tag_slug, product_id)
);
CREATE INDEX IF NOT EXISTS product_tags_product_idx ON product_tags (product_id);

-- latest price / stock / tier readings from the source store
CREATE TABLE IF NOT EXISTS live_prices (
    slug       TEXT PRIMARY KEY,
    product_id TEXT,
    fetched_at DOUBLE PRECISION NOT NULL,                -- unix time
    price      DOUBLE PRECISION,
    regular    DOUBLE PRECISION,
    in_stock   BOOLEAN NOT NULL DEFAULT FALSE,
    qty        INTEGER NOT NULL DEFAULT 0,
    tiers      JSONB NOT NULL DEFAULT '[]'::jsonb,
    faqs       JSONB NOT NULL DEFAULT '[]'::jsonb,
    tags       JSONB NOT NULL DEFAULT '[]'::jsonb
);
CREATE INDEX IF NOT EXISTS live_prices_product_idx ON live_prices (product_id);

-- ---------------------------------------------------------------- shop: customers, orders, enquiries
CREATE TABLE IF NOT EXISTS users (
    id       SERIAL PRIMARY KEY,
    name     TEXT NOT NULL DEFAULT '',
    email    TEXT NOT NULL UNIQUE,
    phone    TEXT NOT NULL DEFAULT '',
    pw_hash  TEXT NOT NULL,
    salt     TEXT NOT NULL,
    created  TIMESTAMP NOT NULL DEFAULT LOCALTIMESTAMP,
    disabled BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE TABLE IF NOT EXISTS sessions (
    token   TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created TIMESTAMP NOT NULL DEFAULT LOCALTIMESTAMP
);
CREATE TABLE IF NOT EXISTS orders (
    order_id TEXT PRIMARY KEY,
    user_id  INTEGER REFERENCES users (id) ON DELETE SET NULL,
    email    TEXT NOT NULL DEFAULT '',
    phone    TEXT NOT NULL DEFAULT '',
    payload  JSONB NOT NULL,
    total    DOUBLE PRECISION NOT NULL DEFAULT 0,
    status   TEXT NOT NULL DEFAULT 'Confirmed',
    created  TIMESTAMP NOT NULL DEFAULT LOCALTIMESTAMP
);
CREATE INDEX IF NOT EXISTS orders_user_idx    ON orders (user_id, created DESC);
CREATE INDEX IF NOT EXISTS orders_created_idx ON orders (created DESC);
CREATE TABLE IF NOT EXISTS enquiries (
    id      SERIAL PRIMARY KEY,
    kind    TEXT NOT NULL,
    payload JSONB NOT NULL,
    created TIMESTAMP NOT NULL DEFAULT LOCALTIMESTAMP
);
CREATE TABLE IF NOT EXISTS enquiry_meta (
    enquiry_id INTEGER PRIMARY KEY REFERENCES enquiries (id) ON DELETE CASCADE,
    status     TEXT NOT NULL DEFAULT 'new',
    note       TEXT NOT NULL DEFAULT '',
    updated    TIMESTAMP,
    updated_by TEXT
);

-- ---------------------------------------------------------------- shop: admin panel
CREATE TABLE IF NOT EXISTS admins (
    id         SERIAL PRIMARY KEY,
    name       TEXT NOT NULL DEFAULT '',
    email      TEXT NOT NULL UNIQUE,
    pw_hash    TEXT NOT NULL,
    salt       TEXT NOT NULL,
    role       TEXT NOT NULL DEFAULT 'support',
    active     BOOLEAN NOT NULL DEFAULT TRUE,
    created    TIMESTAMP NOT NULL DEFAULT LOCALTIMESTAMP,
    last_login TIMESTAMP
);
CREATE TABLE IF NOT EXISTS admin_sessions (
    token    TEXT PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES admins (id) ON DELETE CASCADE,
    created  TIMESTAMP NOT NULL DEFAULT LOCALTIMESTAMP,
    ip       TEXT
);
CREATE TABLE IF NOT EXISTS audit_log (
    id      SERIAL PRIMARY KEY,
    admin   TEXT NOT NULL DEFAULT '',
    action  TEXT NOT NULL,
    target  TEXT NOT NULL DEFAULT '',
    detail  TEXT NOT NULL DEFAULT '',
    created TIMESTAMP NOT NULL DEFAULT LOCALTIMESTAMP
);
CREATE INDEX IF NOT EXISTS audit_log_created_idx ON audit_log (created DESC);
CREATE TABLE IF NOT EXISTS product_locks (               -- products edited in the admin: never overwritten by live sync
    product_id TEXT PRIMARY KEY,
    locked_at  TIMESTAMP NOT NULL DEFAULT LOCALTIMESTAMP
);

-- ---------------------------------------------------------------- content (replaces the old JSON files)
CREATE TABLE IF NOT EXISTS content (                     -- keyed documents: home, pages, faqs, jobs, videos, site, settings, ...
    key        TEXT PRIMARY KEY,
    data       JSONB NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT LOCALTIMESTAMP
);
CREATE TABLE IF NOT EXISTS blog_posts (
    slug       TEXT PRIMARY KEY,
    created_at TIMESTAMP NOT NULL,
    data       JSONB NOT NULL,                           -- title, description, banner_url, kinds, view_count, ...
    html       TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS blog_posts_created_idx ON blog_posts (created_at DESC);

-- ---------------------------------------------------------------- notifications, push devices, restock requests, owner-editable settings
CREATE TABLE IF NOT EXISTS app_secrets (
    key     TEXT PRIMARY KEY,
    value   TEXT NOT NULL DEFAULT '',
    updated TIMESTAMP NOT NULL DEFAULT LOCALTIMESTAMP
);
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id       SERIAL PRIMARY KEY,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh   TEXT NOT NULL,
    auth     TEXT NOT NULL,
    audience TEXT NOT NULL DEFAULT 'customer',
    admin_id INTEGER,
    created  TIMESTAMP NOT NULL DEFAULT LOCALTIMESTAMP
);
CREATE TABLE IF NOT EXISTS restock_requests (
    id          SERIAL PRIMARY KEY,
    product_id  TEXT NOT NULL,
    slug        TEXT NOT NULL DEFAULT '',
    name        TEXT NOT NULL DEFAULT '',
    email       TEXT NOT NULL DEFAULT '',
    endpoint    TEXT NOT NULL DEFAULT '',
    created     TIMESTAMP NOT NULL DEFAULT LOCALTIMESTAMP,
    notified_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS restock_open_idx ON restock_requests (product_id) WHERE notified_at IS NULL;
CREATE TABLE IF NOT EXISTS notifications (
    id      SERIAL PRIMARY KEY,
    kind    TEXT NOT NULL,
    title   TEXT NOT NULL,
    body    TEXT NOT NULL DEFAULT '',
    url     TEXT NOT NULL DEFAULT '',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created TIMESTAMP NOT NULL DEFAULT LOCALTIMESTAMP
);
CREATE INDEX IF NOT EXISTS notifications_created_idx ON notifications (created DESC);

-- devices that asked to be told about one order's progress
CREATE TABLE IF NOT EXISTS order_push (
    order_id TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    created  TIMESTAMP NOT NULL DEFAULT LOCALTIMESTAMP,
    PRIMARY KEY (order_id, endpoint)
);
