"""Content API: home page, blog, text pages, FAQs, videos, jobs, site menus, store settings and health."""
import os
import re
import secrets
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from backend import catalog, config, content, db, notify, settings
from backend.rebrand import rebrand_html

router = APIRouter()
_EMAIL_REGEX = re.compile(r"^[^@]+@[^@]+\.[^@]+$")


@router.get("/api/home")
def home():
    content.refresh()
    return content.get("home", {})


@router.get("/api/blogs")
def blogs(page: int = 1, limit: int = 12, tutorial: bool = False, q: str = ""):
    kind = "tutorial" if tutorial else "blog"
    posts = [p for p in content.blog_posts() if kind in p.get("kinds", ["blog"])]
    if q:
        posts = [p for p in posts if q.lower() in p["title"].lower()]
    total = len(posts)
    return {"items": posts[(page - 1) * limit: page * limit], "total": total,
            "pages": max(1, (total + limit - 1) // limit), "page": page}


BLOG_ALIASES = {
    "arduino-uno-q-4gb-price-drop-alert-special-offer-at-robuin": "arduino-uno-q-4gb-price-drop-alert-special-offer-at-mysemicon",
}


@router.get("/api/blogs/{slug}")
def blog(slug: str):
    target = BLOG_ALIASES.get(slug, slug)
    posts = content.blog_posts()
    post = next((dict(p) for p in posts if p["slug"] == target), None)
    if post is None:
        raise HTTPException(404, "Post not found")
    html = content.blog_html(target)
    post["html"] = rebrand_html(html) if html else f"<p>{post.get('description', '')}</p>"
    post["related"] = [p for p in posts if p["slug"] != target][:5]
    return post


PAGE_ALIASES = {
    "shipping-refund": "refund-policy",
    "shipping-policy": "refund-policy",
    "return-policy": "refund-policy",
    "terms-and-conditions": "terms-of-service",
    "e-waste": "e-waste-collection-points",
    "bulk-enquiry": "businesstobusiness",
    "robu-b2b": "businesstobusiness",
    "kit-enquiry": "atal",
}


@router.get("/api/page/{slug}")
def cms_page(slug: str):
    target = PAGE_ALIASES.get(slug, slug)
    page = content.get("pages", {}).get(target)
    if not page:
        raise HTTPException(404, "Page not found")
    res = dict(page)
    if "html" in res:
        res["html"] = rebrand_html(res["html"])
    return res


@router.get("/api/faqs")
def faqs():
    return content.get("faqs", [])


@router.get("/api/service-options")
def service_options():
    return content.get("service_options", {"types": {}, "slugs": {}})


@router.get("/api/videos")
def videos():
    return content.get("videos", [])


@router.get("/api/jobs")
def jobs(q: str = "", department: str = "", type: str = ""):
    items = content.get("jobs", [])
    if department and department.lower() != "all":
        items = [j for j in items if j.get("department", "").lower() == department.lower()]
    if type and type.lower() != "all":
        items = [j for j in items if any(t.lower() == type.lower() for t in j.get("types", []))]
    if q:
        ql = q.lower().strip()
        items = [j for j in items if ql in j.get("job_title", "").lower() or ql in j.get("short_description", "").lower() or ql in j.get("department", "").lower()]
    return items


@router.get("/api/jobs/{slug}")
def job_detail(slug: str):
    items = content.get("jobs", [])
    j = next((item for item in items if item.get("slug") == slug), None)
    if not j:
        raise HTTPException(404, "Job opening not found")
    return j


@router.post("/api/jobs/apply")
async def apply_job(
    first_name: str = Form(...),
    last_name: str = Form(""),
    email: str = Form(...),
    phone: str = Form(...),
    job_slug: str = Form(""),
    job_title: str = Form(""),
    city: str = Form(""),
    experience: str = Form(""),
    current_ctc: str = Form(""),
    expected_ctc: str = Form(""),
    notice_period: str = Form(""),
    qualification: str = Form(""),
    message: str = Form(""),
    file: Optional[UploadFile] = File(None),
):
    if not _EMAIL_REGEX.match(email.strip()) or len(re.sub(r"\D", "", phone)) < 10:
        raise HTTPException(400, "Please provide a valid email and 10-digit mobile number")

    reference = f"APP{secrets.randbelow(900000) + 100000}"
    saved_file = ""
    if file is not None and file.filename:
        ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
        allowed_exts = {"pdf", "doc", "docx", "rtf", "odt"}
        if ext not in allowed_exts:
            raise HTTPException(400, f"Unsupported file type (.{ext}). Accepted resume formats: PDF, DOC, DOCX")
        data = await file.read(20 * 1024 * 1024 + 1)
        if len(data) > 20 * 1024 * 1024:
            raise HTTPException(400, "Resume file size exceeds the 20MB limit.")
        os.makedirs(config.UPLOAD_DIR, exist_ok=True)
        clean_name = re.sub(r"[^A-Za-z0-9._-]", "_", file.filename)[-80:]
        saved_file = f"{reference}_{clean_name}"
        with open(os.path.join(config.UPLOAD_DIR, saved_file), "wb") as fh:
            fh.write(data)

    name = f"{first_name.strip()} {last_name.strip()}".strip()
    payload = {
        "reference": reference,
        "kind": "job_application",
        "name": name,
        "first_name": first_name.strip(),
        "last_name": last_name.strip(),
        "email": email.strip().lower(),
        "phone": phone.strip(),
        "job_slug": job_slug,
        "job_title": job_title or "General Application",
        "city": city.strip(),
        "experience": experience,
        "current_ctc": current_ctc,
        "expected_ctc": expected_ctc,
        "notice_period": notice_period,
        "qualification": qualification,
        "message": message.strip(),
        "file": saved_file,
    }
    db.execute(
        "INSERT INTO enquiries (kind, payload) VALUES (%s, %s)",
        (f"job:{job_slug or 'general'}", db.Json(payload))
    )
    notify.form_alert(f"New job application: {job_title or 'General Application'}", reference, payload, reply_to=email.strip())
    notify.form_ack(email.strip(), first_name.strip(), reference, "job application")
    return {
        "ok": True,
        "reference": reference,
        "job_title": job_title,
        "message": f"Thank you, {name}! Your application has been successfully submitted."
    }


@router.get("/api/site")
def site_info():
    return content.get("site", {})


@router.get("/api/settings")
def public_settings():
    """Store contact details and shipping rules, editable in the admin panel."""
    s = settings.get()
    return {"phone": s["phone"], "phone2": s["phone2"], "email": s["email"], "hours": s["hours"], "address": s["address"],
            "freeShip": s["free_shipping_above"]}


@router.get("/api/health")
def health():
    return {"ok": True, "products": catalog.product_count()}

