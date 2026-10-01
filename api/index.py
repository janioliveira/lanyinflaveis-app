"""Vercel serverless entrypoint — wraps the FastAPI app in /app/backend/server.py.

Vercel's @vercel/python runtime (v4+) auto-detects an ASGI application exported
as the variable `app` from this file. All /api/* requests are forwarded here.
"""
import os
import sys
from pathlib import Path

# Make /app/backend importable regardless of where Vercel runs us from.
BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND_DIR))

# Vercel does not create a .env file — all config comes from the dashboard
# Environment Variables. Guard against missing values so cold start never 500s.
os.environ.setdefault("MONGO_URL", "")
os.environ.setdefault("DB_NAME", "lany_inflaveis")
os.environ.setdefault("JWT_SECRET", "change-me-in-vercel-env")
os.environ.setdefault("ADMIN_EMAIL", "admin@lanyinflaveis.com")
os.environ.setdefault("ADMIN_PASSWORD", "Admin@123")
os.environ.setdefault("FRONTEND_URL", "")
os.environ.setdefault("EMAIL_FROM_NAME", "Lany Infláveis")

from server import app  # noqa: E402
