"""MySemicon - API and static server.

    pip install -r requirements.txt
    python -m uvicorn backend.main:app --port 8000

PostgreSQL connection: see backend/config.py (MYSEMICON_DB_URL). Tables are created on start-up.
"""
import asyncio
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from backend import admin, catalog, config, db, pages, product, rebrand, restock, shop


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_schema()

    async def watch_restocks():
        await asyncio.sleep(30)
        while True:
            await asyncio.to_thread(restock.check_all)       # tells waiting customers as soon as a product is back
            await asyncio.sleep(180)
    watcher = asyncio.create_task(watch_restocks())
    yield
    watcher.cancel()
    db.close()


app = FastAPI(title="MySemicon API", version="4.0.0", lifespan=lifespan)
for module in (catalog, product, pages, shop, admin):
    app.include_router(module.router)
app.middleware("http")(rebrand.middleware)


@app.middleware("http")
async def revalidate_ui(request, call_next):
    """Page, CSS and JS are revalidated on every load so UI changes show up without a hard refresh."""
    response = await call_next(request)
    if not request.url.path.startswith(("/api/", "/media/", "/assets/")):
        response.headers["Cache-Control"] = "no-cache"
    return response


# ------------------------------------------------------------------ static files + single-page app
for mount, folder in (("/media/cutout", config.CUTOUT_DIR), ("/media/images", config.IMAGE_DIR),
                      ("/media/datasheets", config.DATASHEET_DIR)):
    if os.path.isdir(folder):
        app.mount(mount, StaticFiles(directory=folder), name=mount)
for mount in ("assets", "css", "js"):
    app.mount(f"/{mount}", StaticFiles(directory=os.path.join(config.FRONTEND_DIR, mount)), name=mount)


@app.get("/favicon.svg")
def favicon_svg():
    svg_path = os.path.join(config.FRONTEND_DIR, "assets", "favicon.svg")
    return FileResponse(svg_path, media_type="image/svg+xml")


@app.get("/favicon.ico")
def favicon():
    ico_path = os.path.join(config.FRONTEND_DIR, "assets", "favicon.ico")
    if os.path.isfile(ico_path):
        return FileResponse(ico_path, media_type="image/x-icon", headers={"Cache-Control": "no-cache, no-store, must-revalidate"})
    return FileResponse(os.path.join(config.FRONTEND_DIR, "assets", "favicon.svg"), media_type="image/svg+xml", headers={"Cache-Control": "no-cache, no-store, must-revalidate"})


@app.get("/admin")
@app.get("/admin/{rest:path}")
def admin_page(rest: str = ""):
    return FileResponse(os.path.join(config.FRONTEND_DIR, "admin.html"),
                        headers={"X-Robots-Tag": "noindex, nofollow", "Cache-Control": "no-store"})


@app.get("/{full_path:path}")
def spa(full_path: str):
    if full_path.startswith("api/"):
        return JSONResponse({"detail": "Not found"}, status_code=404)
    path = os.path.join(config.FRONTEND_DIR, full_path)
    if full_path and os.path.isfile(path) and os.path.abspath(path).startswith(config.FRONTEND_DIR):
        return FileResponse(path)
    return FileResponse(os.path.join(config.FRONTEND_DIR, "index.html"))

