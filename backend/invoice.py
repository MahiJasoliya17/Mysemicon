"""The GST tax invoice (bill) page, shared by the admin panel and the customer's own order pages.

render() returns a self-contained, print-ready HTML page (A4); the browser's Print dialog saves it as a PDF.
"""
import base64
import html as htmllib
import os
import re
from typing import Any, Dict, List, Tuple

from backend import config

_e = htmllib.escape
_logo_cache: List[str] = []


def invoice_no(oid: str) -> str:
    return "INV-" + re.sub(r"\D", "", oid)[-10:]


def words(n: int) -> str:
    """Whole rupees in words, Indian numbering (lakh, crore)."""
    ones = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen",
            "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"]
    tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"]

    def below100(x):
        return ones[x] if x < 20 else tens[x // 10] + ("-" + ones[x % 10] if x % 10 else "")

    def below1000(x):
        return (ones[x // 100] + " hundred" + (" " if x % 100 else "") if x >= 100 else "") + (below100(x % 100) if x % 100 else "")

    if n == 0:
        return "zero"
    parts = []
    for div, name in ((10_000_000, "crore"), (100_000, "lakh"), (1000, "thousand")):
        if n >= div:
            parts.append(below1000(n // div) + " " + name)
            n %= div
    if n:
        parts.append(below1000(n))
    return " ".join(parts)


def _logo() -> str:
    """The store logo as an inline data URI, so the page also works when opened from a downloaded file or a blob."""
    if not _logo_cache:
        try:
            with open(os.path.join(config.FRONTEND_DIR, "assets", "logo.svg"), "rb") as fh:
                _logo_cache.append("data:image/svg+xml;base64," + base64.b64encode(fh.read()).decode())
        except OSError:
            _logo_cache.append("")
    return _logo_cache[0]


def _lines(order: Dict[str, Any]) -> Tuple[List[str], float, float]:
    """Table rows plus (taxable total, tax total); prices include 18% GST."""
    rows, tax_total, taxable_total = [], 0.0, 0.0
    for i, it in enumerate(order.get("items") or [], 1):
        qty = max(1, int(it.get("qty", 1)))
        line = float(it.get("line_total") or 0)
        taxable = round(line / 1.18, 2)
        tax = round(line - taxable, 2)
        taxable_total += taxable
        tax_total += tax
        rows.append(f'<tr><td>{i}</td><td><b>{_e(it.get("name", ""))}</b><small>SKU {_e(str(it.get("sku", "")))}</small></td>'
                    f'<td class="r">{qty}</td><td class="r">{round(taxable / qty, 2):,.2f}</td><td class="r">{taxable:,.2f}</td>'
                    f'<td class="r">18%</td><td class="r">{tax:,.2f}</td><td class="r">{line:,.2f}</td></tr>')
    shipping = float(order.get("shipping") or 0)
    if shipping:
        ship_tax = round(shipping - shipping / 1.18, 2)
        rows.append(f'<tr><td>{len(rows) + 1}</td><td><b>Shipping and handling</b></td><td class="r">1</td><td class="r">{shipping - ship_tax:,.2f}</td>'
                    f'<td class="r">{shipping - ship_tax:,.2f}</td><td class="r">18%</td><td class="r">{ship_tax:,.2f}</td><td class="r">{shipping:,.2f}</td></tr>')
        taxable_total += shipping - ship_tax
        tax_total += ship_tax
    return rows, taxable_total, tax_total


CSS = """
@page{size:A4;margin:14mm}*{box-sizing:border-box}
body{margin:0;background:#eceaf0;font:13px/1.5 'Segoe UI',system-ui,Arial,sans-serif;color:#17121c}
.bar{max-width:820px;margin:18px auto 0;display:flex;justify-content:space-between;align-items:center;padding:0 4px;color:#4a4150}
button{padding:10px 20px;border-radius:8px;border:0;background:#2a1f38;color:#fff;cursor:pointer;font:600 13px 'Segoe UI',system-ui}
.sheet{max-width:820px;margin:12px auto 32px;background:#fff;padding:34px 38px;box-shadow:0 20px 50px -30px rgba(18,15,21,.5);position:relative}
.top{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;padding-bottom:18px;border-bottom:3px solid #2a1f38}
.top img{height:44px;display:block;margin-bottom:10px}.co{color:#4a4150;font-size:12.5px}.co b{color:#17121c;font-size:15px}
.ti{text-align:right}.ti h1{margin:0;font:700 22px/1 Georgia,serif;letter-spacing:.04em;color:#2a1f38}.ti div{margin-top:4px;color:#4a4150}.ti b{color:#17121c}
.stamp{display:inline-block;margin-top:10px;padding:4px 12px;border-radius:999px;font:700 11px system-ui;letter-spacing:.12em;text-transform:uppercase;border:1.5px solid}
.stamp.paid{color:#15803d;border-color:#15803d;background:#f0fdf4}.stamp.cod{color:#b45309;border-color:#b45309;background:#fffbeb}.stamp.unpaid{color:#b42318;border-color:#b42318;background:#fef2f2}
.cols{display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px;margin:20px 0}.cols h3{margin:0 0 6px;font:700 10.5px system-ui;letter-spacing:.14em;text-transform:uppercase;color:#7a7083}
.cols p{margin:0;color:#3d3445}.cols b{color:#17121c}
table{width:100%;border-collapse:collapse;margin-top:6px}th{background:#2a1f38;color:#fff;text-align:left;font:600 10.5px system-ui;letter-spacing:.06em;text-transform:uppercase;padding:8px}
td{padding:9px 8px;border-bottom:1px solid #ebe7ee;vertical-align:top}td small{display:block;color:#7a7083;font-size:11px;margin-top:1px}.r{text-align:right}
.sum{display:flex;justify-content:space-between;gap:24px;margin-top:16px;align-items:flex-start}.words{flex:1;color:#3d3445;padding-top:4px}
.tot{width:300px}.tot td{border:0;padding:4px 8px}.tot .grand td{border-top:2px solid #2a1f38;padding-top:8px;font:700 16px system-ui;color:#2a1f38}
.note{margin-top:28px;padding-top:12px;border-top:1px solid #ebe7ee;color:#7a7083;font-size:11.5px;display:flex;justify-content:space-between;gap:20px}
@media print{body{background:#fff}.bar{display:none}.sheet{box-shadow:none;margin:0;padding:0;max-width:none}}
@media (max-width:640px){.sheet{padding:20px 16px}.top{flex-direction:column}.ti{text-align:left}.cols{grid-template-columns:1fr}table{font-size:11.5px}}
"""


def render(r: Dict[str, Any], st: Dict[str, Any]) -> str:
    """`r` is an orders row (order_id, payload, status), `st` the store settings."""
    o, oid = r["payload"], r["order_id"]
    cu = o.get("customer") or {}
    intra = (cu.get("state") or "").strip().lower() == (st.get("state") or "").strip().lower()
    rows, taxable_total, tax_total = _lines(o)
    total = float(o.get("total") or 0)
    split = (f'<tr><td>CGST 9%</td><td class="r">{tax_total / 2:,.2f}</td></tr><tr><td>SGST 9%</td><td class="r">{tax_total / 2:,.2f}</td></tr>'
             if intra else f'<tr><td>IGST 18%</td><td class="r">{tax_total:,.2f}</td></tr>')
    addr = ", ".join(x for x in [cu.get("address"), cu.get("city"), cu.get("state"), cu.get("pincode")] if x)
    paid, cod = o.get("payment_status") == "Paid", o.get("payment") == "cod"
    stamp = ('<span class="stamp paid">Paid</span>' if paid else '<span class="stamp cod">Pay on delivery</span>' if cod and r["status"] not in ("Cancelled", "Returned")
             else '<span class="stamp unpaid">Payment pending</span>')
    gstin = f'<div>GSTIN: <b>{_e(st["gstin"])}</b></div>' if st.get("gstin") else ""
    buyer = f'<br>GSTIN: {_e(cu["gstin"])}' if cu.get("gstin") else ""
    ref = f'<br>Payment ID: {_e(o["payment_ref"])}' if o.get("payment_ref") else ""
    logo = f'<img src="{_logo()}" alt="{_e(st["company_name"])}">' if _logo() else f'<b>{_e(st["company_name"])}</b>'
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{_e(invoice_no(oid))} - {_e(st["company_name"])}</title><style>{CSS}</style></head><body>
<div class="bar"><span>Tax invoice for order {_e(oid)}</span><button onclick="window.print()">Print / save as PDF</button></div>
<div class="sheet">
<div class="top"><div>{logo}<div class="co"><b>{_e(st["company_name"])}</b><br>{_e(st["address"])}<br>Phone {_e(st["phone"])} &middot; {_e(st["email"])}{gstin}</div></div>
<div class="ti"><h1>TAX INVOICE</h1><div>Invoice no. <b>{_e(invoice_no(oid))}</b></div><div>Order <b>{_e(oid)}</b></div><div>Date <b>{_e(o.get("created", ""))[:10]}</b></div>{stamp}</div></div>
<div class="cols"><div><h3>Bill to</h3><p><b>{_e(cu.get("name", ""))}</b><br>{_e(addr)}<br>{_e(cu.get("phone", ""))}{(" &middot; " + _e(cu["email"])) if cu.get("email") else ""}{buyer}</p></div>
<div><h3>Ship to</h3><p><b>{_e(cu.get("name", ""))}</b><br>{_e(addr)}</p></div>
<div><h3>Payment</h3><p><b>{_e(o.get("payment_label") or str(o.get("payment", "")).upper())}</b><br>{_e(o.get("payment_status", ""))}{ref}</p></div></div>
<table><thead><tr><th>#</th><th>Description</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Taxable</th><th class="r">GST</th><th class="r">Tax</th><th class="r">Amount (&#8377;)</th></tr></thead><tbody>{"".join(rows)}</tbody></table>
<div class="sum"><div class="words">Amount in words:<br><b>Rupees {_e(words(int(round(total))).capitalize())} only</b></div>
<table class="tot"><tr><td>Taxable value</td><td class="r">{taxable_total:,.2f}</td></tr>{split}<tr class="grand"><td>Total</td><td class="r">&#8377; {total:,.2f}</td></tr></table></div>
<div class="note"><span>Prices include GST at 18%. This is a computer-generated invoice and needs no signature.</span><span>Order status: {_e(r["status"])}</span></div>
</div></body></html>"""
