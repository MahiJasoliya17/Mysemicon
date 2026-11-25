"""Outgoing e-mail: order confirmations, shipping updates, form acknowledgements and alerts to the store inbox.

Every send runs in a background thread, so a slow or broken mail server never delays or breaks an order or a form.
Mail is switched on by setting MS_SMTP_HOST (see config.py); without it nothing is sent and everything else still works.
"""
import html
import logging
import re
import smtplib
import threading
from email.message import EmailMessage
from typing import Any, Dict, Iterable, Optional

from backend import config, db, integrations, push, settings

log = logging.getLogger("mysemicon.mail")
_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
CUSTOMER_STATUS_MAILS = {          # status set by the admin -> subject line the customer receives
    "Packed": "Your order is packed",
    "Shipped": "Your order has been shipped",
    "Out for delivery": "Your order is out for delivery",
    "Delivered": "Your order was delivered",
    "Cancelled": "Your order was cancelled",
    "Returned": "Your return was received",
}


def enabled() -> bool:
    return integrations.email_on()


def store_inbox() -> str:
    return integrations.get("notify_to") or settings.get().get("email") or config.STORE_EMAIL


def track_url(order_id: str) -> str:
    return f"{integrations.get('site_url').rstrip('/')}/order-tracking/?id={order_id}"


def _deliver(msg: EmailMessage) -> None:
    port, host = int(integrations.get('smtp_port') or 587), integrations.get('smtp_host')
    smtp = smtplib.SMTP_SSL(host, port, timeout=20) if port == 465 else smtplib.SMTP(host, port, timeout=20)
    with smtp:
        smtp.ehlo()
        if port != 465:
            if smtp.has_extn("starttls"):
                smtp.starttls()
                smtp.ehlo()
        if integrations.get("smtp_user") and smtp.has_extn("auth"):
            smtp.login(integrations.get("smtp_user"), integrations.get("smtp_password"))
        smtp.send_message(msg)


def send(to: str, subject: str, text: str, html_body: Optional[str] = None, reply_to: str = "", wait: bool = False) -> str:
    """Send one message. Returns "" on success (or when queued in the background), else the error text when wait=True."""
    if not enabled() or not _EMAIL.match(to or ""):
        return "" if not wait else ("E-mail is not configured (MS_SMTP_HOST is empty)" if not enabled() else "Invalid recipient")
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = f"{config.STORE_NAME} <{integrations.get('mail_from') or integrations.get('smtp_user') or config.STORE_EMAIL}>"
    msg["To"] = to
    if reply_to and _EMAIL.match(reply_to):
        msg["Reply-To"] = reply_to
    msg.set_content(text)
    if html_body:
        msg.add_alternative(html_body, subtype="html")

    def run() -> str:
        try:
            _deliver(msg)
            return ""
        except Exception as e:
            log.warning("mail to %s failed: %s", to, e)
            return f"{type(e).__name__}: {e}"
    if wait:
        return run()
    threading.Thread(target=run, daemon=True).start()
    return ""


# ------------------------------------------------------------------ order mails
def _money(v: Any) -> str:
    return f"Rs {float(v):,.2f}"


def _order_parts(o: Dict[str, Any]) -> Dict[str, str]:
    c = o.get("customer") or {}
    items = o.get("items") or []
    text_items = "\n".join(f"  {i['name'][:70]} x {i['qty']}   {_money(i['line_total'])}" for i in items)
    rows = "".join(f"<tr><td style='padding:6px 0'>{html.escape(i['name'][:80])} &times; {i['qty']}</td><td align='right'>{_money(i['line_total'])}</td></tr>" for i in items)
    addr = ", ".join(x for x in (c.get("address"), c.get("city"), c.get("state"), c.get("pincode")) if x)
    return {"text_items": text_items, "rows": rows, "addr": addr, "name": c.get("name", "")}


def _order_text(o: Dict[str, Any], headline: str) -> str:
    p = _order_parts(o)
    return (f"Hi {p['name']},\n\n{headline}\n\nOrder {o['order_id']}\n{p['text_items']}\n\nShipping: {_money(o.get('shipping', 0))}\n"
            f"Total: {_money(o['total'])}\nPayment: {o.get('payment_label', '')} ({o.get('payment_status', '')})\nDeliver to: {p['addr']}\n\n"
            f"Track your order: {track_url(o['order_id'])}\n\nThank you for shopping with {config.STORE_NAME}.\nNeed help? Reply to this email or write to {store_inbox()}.\n")


def _order_html(o: Dict[str, Any], headline: str) -> str:
    p = _order_parts(o)
    return (f"<div style='font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:auto;color:#15121a'>"
            f"<h2 style='margin:0 0 6px'>{html.escape(headline)}</h2><p style='color:#736a7a;margin:0 0 18px'>Order <b>{o['order_id']}</b></p>"
            f"<table width='100%' style='border-collapse:collapse;border-top:1px solid #e4e1e7;border-bottom:1px solid #e4e1e7'>{p['rows']}"
            f"<tr><td style='padding:6px 0;color:#736a7a'>Shipping</td><td align='right'>{_money(o.get('shipping', 0))}</td></tr>"
            f"<tr><td style='padding:8px 0'><b>Total</b></td><td align='right'><b>{_money(o['total'])}</b></td></tr></table>"
            f"<p style='margin:14px 0 4px'><b>Payment:</b> {html.escape(o.get('payment_label', ''))} &middot; {html.escape(o.get('payment_status', ''))}</p>"
            f"<p style='margin:0 0 18px'><b>Deliver to:</b> {html.escape(p['addr'])}</p>"
            f"<a href='{track_url(o['order_id'])}' style='display:inline-block;background:#2a1f38;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:600'>Track your order</a>"
            f"<p style='color:#736a7a;font-size:13px;margin-top:22px'>Thank you for shopping with {config.STORE_NAME}.</p></div>")


def order_mail(o: Dict[str, Any], subject: str, headline: str) -> None:
    """E-mail the customer about their order (when they gave an address)."""
    to = (o.get("customer") or {}).get("email", "")
    send(to, f"{config.STORE_NAME}: {subject} ({o['order_id']})", _order_text(o, headline), _order_html(o, headline), reply_to=store_inbox())


def order_alert(o: Dict[str, Any], what: str) -> None:
    """Tell the store a new (confirmed) order needs packing."""
    c = o.get("customer") or {}
    p = _order_parts(o)
    body = (f"{what}\n\nOrder {o['order_id']}  -  {_money(o['total'])}  -  {o.get('payment_label', '')} ({o.get('payment_status', '')})\n\n"
            f"Customer: {c.get('name', '')}\nPhone: {c.get('phone', '')}\nEmail: {c.get('email', '')}\nAddress: {p['addr']}\n"
            f"GSTIN: {c.get('gstin', '') or '-'}\n\nItems:\n{p['text_items']}\n\nOpen it in the admin panel: {integrations.get('site_url').rstrip('/')}/admin#/orders/{o['order_id']}\n")
    push.notify_admin("order", f"New order {o['order_id']} - {_money(o['total'])}", f"{c.get('name', '')}, {c.get('city', '')} - {o.get('payment_label', '')}", f"/admin#/orders/{o['order_id']}")
    send(store_inbox(), f"[{config.STORE_NAME}] New order {o['order_id']} - {_money(o['total'])}", body)


def order_placed(o: Dict[str, Any]) -> None:
    """COD order accepted, or online order paid: confirmation to the customer and an alert to the store."""
    paid = o.get("payment_status") == "Paid"
    order_mail(o, "Payment received, order confirmed" if paid else "We received your order",
               "Thank you! Your payment was received and your order is confirmed." if paid else
               "Thank you! Your order is confirmed. You will pay in cash when it is delivered.")
    order_alert(o, "A new order is confirmed and ready to pack.")


def order_status(o: Dict[str, Any], status: str, note: str = "") -> None:
    """Customer e-mail (for the main steps) and a push to every device that follows this order."""
    subject = CUSTOMER_STATUS_MAILS.get(status)
    if subject:
        order_mail(o, subject, subject + "." + (f" {note}" if note else ""))
    order_push(o, status, note)


def order_push(o: Dict[str, Any], status: str, note: str = "") -> None:
    try:
        rows = db.fetch_all("SELECT s.* FROM order_push op JOIN push_subscriptions s ON s.endpoint = op.endpoint WHERE op.order_id = %s", (o["order_id"],))
        if rows:
            push.send(rows, {"title": f"Order {o['order_id']}: {status}", "body": note or "Tap to see the latest on your order.",
                             "url": f"/order-tracking/?id={o['order_id']}", "tag": "order-" + o["order_id"]})
    except Exception as e:
        log.warning("order push failed: %s", e)


# ------------------------------------------------------------------ form mails
def form_alert(title: str, ref: str, fields: Dict[str, Any], reply_to: str = "") -> None:
    """Alert the store about a new enquiry, quote, seller request or job application."""
    lines = [f"{k}: {v}" for k, v in fields.items() if v not in ("", None, {}, []) and k not in ("kind", "reference", "file")]
    body = f"{title}\nReference: {ref}\n\n" + "\n".join(lines) + f"\n\nOpen it in the admin panel: {integrations.get('site_url').rstrip('/')}/admin\n"
    who = str(fields.get("name") or fields.get("email") or fields.get("phone") or "")
    push.notify_admin("enquiry", title, f"{who} - ref {ref}", "/admin#/enquiries")
    send(store_inbox(), f"[{config.STORE_NAME}] {title} {ref}", body, reply_to=reply_to)


def form_ack(to: str, name: str, ref: str, what: str) -> None:
    """Short acknowledgement so the customer knows the request arrived."""
    text = (f"Hi {name or 'there'},\n\nThanks for contacting {config.STORE_NAME}. We have received your {what} "
            f"and our team will get back to you shortly.\n\nYour reference: {ref}\n\nIf you need to add anything, just reply to this email.\n")
    send(to, f"{config.STORE_NAME}: we received your {what} ({ref})", text, reply_to=store_inbox())


def newsletter_welcome(to: str, name: str) -> None:
    send(to, f"Welcome to {config.STORE_NAME}", f"Hi {name or 'there'},\n\nYou are subscribed. Expect one short email a week with new arrivals, restocks and offers.\n\n"
         f"You can unsubscribe any time by replying 'unsubscribe' to any of our emails.\n", reply_to=store_inbox())
