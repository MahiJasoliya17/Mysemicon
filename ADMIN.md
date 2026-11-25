# MySemicon admin panel

Open **http://localhost:8000/admin** (not linked from the storefront, and marked noindex).

## First sign-in
There is no default account. Create one from the `mysemicon` folder:

    python -m scripts.create_admin you@example.com "Your Name"            # asks for a password
    python -m scripts.create_admin you@example.com "Your Name" --generate # prints a random password once

Passwords need 10+ characters with letters and numbers. More admins are added in the panel (Admin users).

## Roles
| Role | Can do |
|---|---|
| owner | everything, including store settings, admin users, activity log, backups |
| manager | products, categories, brands, content, service options, orders, enquiries, customers |
| support | orders, enquiries, customer list (read) |

## Sample data (for review only)
The store ships with realistic **sample** customers, orders, enquiries and quote requests so every screen can be reviewed.
They use your real products and prices, `@example.com` addresses and are all tagged as sample data.

    python -m scripts.seed_demo --remove     # deletes exactly the sample data and nothing else
    python -m scripts.seed_demo              # adds it again

Both commands work on the PostgreSQL database; the ids of the sample rows are kept in the `demo_manifest` content document.

**Run `--remove` before the site goes live.** The panel works the same without it; the screens simply start empty.

## What each area does
- **Dashboard** - 7/30/90-day revenue chart, orders, average order, units, new and repeat customers with change vs the previous period, orders by status, payment split, top products, sales by category, top cities, and a "needs attention" list. A bell in the top bar and a global search (orders, customers, products, enquiries) are on every screen.
- **Reports** - the same figures as tables, with CSV export.
- **Orders** - status tabs with counts, search, date range, sort, change a status straight from the list, bulk-update many orders, a printable **GST tax invoice** (CGST+SGST or IGST by state, amount in words), a shipping label, CSV export. The customer's order-tracking page shows the new status.
- **Enquiries & quotes** - contact, bulk, kit, seller and service-quote requests, with status, notes, reply-by-email and the customer's uploaded design file.
- **Customers** - sort by spend, a profile page per customer (orders, lifetime spend, average order, last address), disable/enable, reset password, CSV export.
- **Products** - search/filter, edit every field (price, MRP, stock, descriptions, specs, images, categories, bulk price breaks), create, archive/restore, CSV export and CSV import of prices and stock.
- **Inventory** - low-stock / out-of-stock lists with quick inline price and quantity editing.
- **Categories / Brands** - rename.
- **Content & pages** - pages, FAQs, home slider (with upload and unused-image cleanup), blog posts, careers, videos.
- **Service options** - the choices on the service pages.
- **Store settings** - phone, email, hours, address, free-shipping amount and shipping fee (applied to the whole shop immediately), plus the business name, GSTIN and state printed on invoices. **Enter your GSTIN here before issuing invoices.**
- **Activity log** - every change, by whom, and when.
- **System & backups** - clear cache, back up orders/customers/admins and content, download customer uploads.

## How product edits work
An edit is saved straight to the `products` table in PostgreSQL, so it is live at once. The product is then marked
**manual**: the live price sync from the source store, `refresh_prices.py` and `refresh_content.py` all skip it, so your
price is never overwritten. "Resume live sync" on the product removes that protection.

Note: `python -m backend.build_data` rebuilds the category, brand and tag tables from `products`, which already
contains your edits.

## Security notes
Admin sessions last 12 hours, sign-in is rate limited (5 failures per 15 minutes), every mutation is logged, and the API
checks the role on every call. Use HTTPS if you ever expose the site beyond your own machine.
