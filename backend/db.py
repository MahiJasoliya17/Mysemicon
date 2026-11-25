"""PostgreSQL access for the whole backend: one connection pool and a few small query helpers.

    from backend import db
    rows = db.fetch_all("SELECT * FROM products WHERE brand_slug = %s LIMIT %s", (slug, 10))   # list of dicts
    row  = db.fetch_one("SELECT * FROM products WHERE id = %s", (pid,))                        # dict or None
    n    = db.fetch_val("SELECT COUNT(*) FROM products")                                        # first column
    db.execute("UPDATE products SET in_stock = %s WHERE id = %s", (True, pid))                  # rows changed
    with db.transaction() as cur:                                                               # commit / rollback together
        cur.execute("INSERT INTO orders ...", (...))

Placeholders are always %s. JSONB columns come back as Python objects, TIMESTAMP columns as
'YYYY-MM-DD HH:MM:SS' strings (what the frontend already expects). Pass lists with `= ANY(%s)`.
"""
import os
import threading
from contextlib import contextmanager
from typing import Any, Dict, Iterator, List, Optional, Sequence

import psycopg2
import psycopg2.extensions
from psycopg2.extras import Json, RealDictCursor, execute_values  # noqa: F401  (re-exported for callers)
from psycopg2.pool import ThreadedConnectionPool

from backend import config

# TIMESTAMP (no zone) -> "YYYY-MM-DD HH:MM:SS" text
_TIMESTAMP_AS_TEXT = psycopg2.extensions.new_type(
    (1114,), "TIMESTAMP_TEXT",
    lambda value, cur: value[:19].replace("T", " ") if value else None)
psycopg2.extensions.register_type(_TIMESTAMP_AS_TEXT)

_SEARCH_PATH = f"-c search_path={config.DB_SCHEMA},public"      # public stays for extensions such as pg_trgm
_pool: Optional[ThreadedConnectionPool] = None
_pool_lock = threading.Lock()
Row = Dict[str, Any]


def _get_pool() -> ThreadedConnectionPool:
    global _pool
    if _pool is None:
        with _pool_lock:
            if _pool is None:
                _pool = ThreadedConnectionPool(1, config.DB_POOL_MAX, config.DATABASE_URL, options=_SEARCH_PATH)
    return _pool


def connect():
    """A standalone connection for scripts and bulk loads (not pooled, cursors return tuples). The caller closes it."""
    return psycopg2.connect(config.DATABASE_URL, options=_SEARCH_PATH)


@contextmanager
def transaction() -> Iterator[Any]:
    """Yield a dict cursor; commit on success, roll back on any exception."""
    pool = _get_pool()
    conn = pool.getconn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            yield cur
        conn.commit()
    except BaseException:
        conn.rollback()
        raise
    finally:
        pool.putconn(conn)


def fetch_all(sql: str, params: Sequence[Any] = ()) -> List[Row]:
    with transaction() as cur:
        cur.execute(sql, params)
        return cur.fetchall()


def fetch_one(sql: str, params: Sequence[Any] = ()) -> Optional[Row]:
    with transaction() as cur:
        cur.execute(sql, params)
        return cur.fetchone()


def fetch_val(sql: str, params: Sequence[Any] = (), default: Any = None) -> Any:
    with transaction() as cur:
        cur.execute(sql, params)
        row = cur.fetchone()
    return default if row is None else next(iter(row.values()))


def execute(sql: str, params: Sequence[Any] = ()) -> int:
    with transaction() as cur:
        cur.execute(sql, params)
        return cur.rowcount


def init_schema(conn=None) -> None:
    """Create the schema, tables and indexes that are missing (safe to call on every start-up).
    Pass a connection from `connect()` to run inside the caller's transaction."""
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "schema.sql")
    with open(path, encoding="utf-8") as fh:
        sql = f'CREATE SCHEMA IF NOT EXISTS "{config.DB_SCHEMA}";' + chr(10) + fh.read()
    if conn is not None:
        with conn.cursor() as cur:
            cur.execute(sql)
        return
    with transaction() as cur:
        cur.execute(sql)


def close() -> None:
    global _pool
    if _pool is not None:
        _pool.closeall()
        _pool = None


if __name__ == "__main__":
    init_schema()
    print("schema ready in", config.DATABASE_URL.rsplit("@", 1)[-1])
