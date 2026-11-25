"""Paths, constants and environment settings shared by the whole backend."""
import os

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
APP_DIR = os.path.dirname(BACKEND_DIR)                      # .../mysemicon
ROOT_DIR = os.path.dirname(APP_DIR)                         # folder holding mysemicon/ and scrap_data/

FRONTEND_DIR = os.path.join(APP_DIR, "frontend")
DATA_DIR = os.path.join(APP_DIR, "data")                    # uploads/ and backups/ live here
UPLOAD_DIR = os.path.join(DATA_DIR, "uploads")
BACKUP_DIR = os.path.join(DATA_DIR, "backups")

MEDIA_DIR = os.path.join(APP_DIR, "media") if os.path.isdir(os.path.join(APP_DIR, "media")) else os.path.join(ROOT_DIR, "scrap_data", "media")
IMAGE_DIR = os.path.join(MEDIA_DIR, "images")
CUTOUT_DIR = os.path.join(MEDIA_DIR, "images_nobg")
DATASHEET_DIR = os.path.join(MEDIA_DIR, "datasheets")

# PostgreSQL connection. Override with the MYSEMICON_DB_URL environment variable,
# e.g. postgresql://user:password@localhost:5432/mysemicon
DATABASE_URL = os.environ.get("MYSEMICON_DB_URL", "postgresql://postgres:@localhost:5432/mysemicon")
# All application tables live in this schema, so they never mix with other tables in the same database.
DB_SCHEMA = os.environ.get("MYSEMICON_DB_SCHEMA", "app")
DB_POOL_MAX = int(os.environ.get("MYSEMICON_DB_POOL", "12"))

STORE_NAME = "MySemicon"
STORE_EMAIL = "support@mysemicon.com"
FREE_SHIPPING_ABOVE = 499.0
SHIPPING_FEE = 49.0
MAX_UPLOAD_BYTES = 50 * 1024 * 1024

# Price and stock of a product are refreshed from the source store on demand.
# Set MS_LIVE_SYNC=0 to serve the stored values only.
LIVE_SYNC = os.environ.get("MS_LIVE_SYNC", "1") != "0"
LIVE_TTL_SECONDS = 900

# Online payments (Razorpay). Create keys in the Razorpay dashboard (Settings > API Keys) and set these environment
# variables before starting the server; without them only cash on delivery is offered.
RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "")
RAZORPAY_WEBHOOK_SECRET = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "")   # Dashboard > Webhooks > secret
COD_ENABLED = os.environ.get("MS_COD", "1") != "0"
COD_MAX_ORDER = float(os.environ.get("MS_COD_MAX", "20000"))              # cash on delivery is hidden above this total

# Optional order e-mails (SMTP). Leave MS_SMTP_HOST empty to skip them.
SMTP_HOST = os.environ.get("MS_SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("MS_SMTP_PORT", "587"))
SMTP_USER = os.environ.get("MS_SMTP_USER", "")
SMTP_PASSWORD = os.environ.get("MS_SMTP_PASSWORD", "")

SITE_URL = os.environ.get("MS_SITE_URL", "http://localhost:8000")          # public address, used in e-mail links
NOTIFY_TO = os.environ.get("MS_NOTIFY_TO", "")                            # store inbox for order/form alerts (default: the admin Settings e-mail)
MAIL_FROM = os.environ.get("MS_MAIL_FROM", "")                            # sender address (default: MS_SMTP_USER)
