"""Serve the vanilla-JS storefront from Django.

Django is the *only* server needed to run the whole project:

    python manage.py runserver 0.0.0.0:3000

  http://127.0.0.1:3000/          -> frontend/index.html
  http://127.0.0.1:3000/css/...   -> frontend static assets
  http://127.0.0.1:3000/api/...   -> Django REST API
  http://127.0.0.1:3000/admin/    -> Django admin

Serving the storefront from the API process keeps the demo single-origin
(no CORS setup for the page itself) and makes deployment trivial.
"""
import mimetypes
import os
from pathlib import Path

from django.http import FileResponse, Http404

FRONTEND_DIR = Path(__file__).resolve().parent.parent / 'frontend'


def _safe_path(rel_path: str) -> Path:
    """Resolve ``rel_path`` inside FRONTEND_DIR, blocking path traversal."""
    candidate = (FRONTEND_DIR / rel_path).resolve()
    if not str(candidate).startswith(str(FRONTEND_DIR.resolve())):
        raise Http404()
    return candidate


def serve_frontend(request, path=''):
    """Catch-all view: static assets by path, pages with clean URLs."""
    rel = path.strip('/') or 'index.html'
    full = _safe_path(rel)

    if full.is_dir():
        full = full / 'index.html'

    if not full.exists():
        # Clean URL like /checkout -> try checkout.html before giving up.
        alt = _safe_path(rel + '.html')
        if alt.exists():
            full = alt
        else:
            raise Http404(f'No frontend file for {path!r}')

    content_type, _ = mimetypes.guess_type(str(full))
    # Some systems guess text/plain for .js — force the correct type.
    if full.suffix == '.js':
        content_type = 'text/javascript'
    response = FileResponse(open(full, 'rb'), content_type=content_type or 'application/octet-stream')
    response['Cache-Control'] = 'no-cache' if full.suffix in {'.html', '.js', '.css'} else 'max-age=3600'
    return response
