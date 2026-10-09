# FORMA3D — 3D Product Configurator + E-Commerce

![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)
![Django](https://img.shields.io/badge/Django-6-092E20?logo=django&logoColor=white)
![Django REST Framework](https://img.shields.io/badge/Django_REST_Framework-3.x-A30000?logo=djangorestframework&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-r128-000000?logo=threedotjs&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?logo=javascript&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-green)

A full-stack, made-to-order e-commerce demo where every product is configured
in **real-time 3D** in the browser. Built with **Django + Django REST Framework**
on the backend and **vanilla JavaScript + Three.js** on the frontend — no
frontend framework, no build step, no Node.js required.

> Everything runs from a single Django process: the REST API, the admin panel
> and the storefront itself.

## Screenshots

<!-- After your first run (Quick start below), drop 3–4 screenshots or a short GIF
     here: storefront grid · 3D configurator · cart with snapshot · dark mode.
     A short GIF of the configurator rotating is the single best thing you can add. -->

| Storefront | 3D Configurator |
|---|---|
| *add your screenshot* | *add your screenshot* |

---

## Features

**3D Configurator (Three.js / WebGL)**
- 8 procedurally-built 3D products — lounge chair, ceramic mug, steel bottle, desk lamp,
  studio headphones, wall clock, ceramic vase, scented candle — zero external 3D assets
- Real-time color / material / finish switching across configurable parts (seat, frame, base, glaze, shade…)
- 8 physically-based material recipes (fabric, leather, metal, wood, ceramic, glass, rubber…)
- Procedural studio environment map baked with PMREM for realistic PBR reflections
- OrbitControls: drag to rotate, pinch/scroll to zoom, 360° turntable toggle
- Camera view presets — ¾ / Front / Side / Top — with smooth fly-to transitions
- Live price breakdown that updates with every choice (+ engraving fee, × quantity)
- The cart thumbnail is a snapshot of *your exact configuration*, captured from the WebGL canvas

**E-Commerce**
- Catalog with featured badges, ratings, swatch previews and real 3D thumbnails
- Category filter pills with live counts
- "Recently viewed" strip that remembers the products you configured
- Cart persisted in `localStorage` with quantity steppers and per-item configuration
- **Server-authoritative pricing**: the client never dictates a price — every quote
  (`POST /api/quote/`) and every order (`POST /api/orders/`) is recomputed from the database
- Unknown parts / cross-part options are rejected with a 400
- Checkout with client-side validation + server-side re-validation
- Order confirmation page with order-number lookup (`GET /api/orders/<number>/`)
- Free shipping over $150, $9.90 laser-engraving fee per item — both defined server-side

**Admin (Django admin)**
- Manage products, parts, finishes (color, material, price delta) and browse orders
- URL: `/admin/` — demo credentials **admin / admin1234**

**Responsive — mobile & desktop**
- Desktop: split view — sticky 3D stage left, options panel right
- Mobile: full-width stage on top, options below, sticky "Add to cart" bar
- Touch-first controls (one-finger rotate, two-finger zoom), safe-area insets, tap-friendly targets

**Dark mode**
- Full light/dark theme with a header toggle — persisted in `localStorage`, defaults to the OS preference
- Flash-free loading (theme applied before first paint) and a theme-matched 3D stage
- Custom-property-driven palette — the whole theme lives in one CSS block

**Polish & accessibility**
- Skeleton loading states, scroll-reveal animations, animated price count-up
- `prefers-reduced-motion` respected (animations and camera flights disabled)
- Keyboard focus rings, ARIA labels on all interactive controls, `aria-pressed` toggle states

**Content & pages (portfolio-ready)**
- `/about/` — the story of the project: why it was built, the toolkit, what it demonstrates,
  live "by the numbers" stats pulled from the API, and a roadmap of next steps
- Storefront content sections: "Why FORMA3D" feature band, demo testimonials, a native
  `<details>`-based FAQ, and a newsletter signup band (demo-only, nothing is sent)
- Rich footer with Explore / Project / Developer link columns and an auto-updating year
- Configurator "Details & care" accordion with per-category care instructions

---

## Tech stack

| Layer      | Technology                                        |
|------------|---------------------------------------------------|
| Backend    | Python 3, Django 6, Django REST Framework         |
| Database   | SQLite (swap for Postgres by changing `settings.py`) |
| Frontend   | Vanilla HTML / CSS / JavaScript (ES2017+)         |
| 3D         | Three.js r128 (bundled locally, works offline)    |
| Styling    | Hand-written CSS, custom properties, mobile-first |

---

## Quick start (terminal)

Requires **Python 3.10+**. No Node.js, no build step.

```bash
cd backend

# 1. (optional but recommended) create a virtualenv
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# 2. install dependencies
pip install -r requirements.txt

# 3. run it — migrates, seeds demo data, creates admin, starts the server
bash start.sh                    # serves on http://127.0.0.1:3000
# PORT=8000 bash start.sh        # or any port you like
```

Then open **http://127.0.0.1:3000**

> `start.sh` is a bash script — on **Windows** use the manual commands below
> (or run it from Git Bash), or follow the PyCharm walkthrough instead.

Manual alternative:

```bash
python manage.py migrate
python manage.py seed_demo                 # demo catalog + superuser via start.sh
python manage.py createsuperuser           # or use admin/admin1234
python manage.py runserver 0.0.0.0:3000
```

---

## Run it in PyCharm — step by step

Works the same on Windows, macOS and Linux. PyCharm **Community** is enough.

**Step 0 — Get the project on disk**
Download `3d-product-configurator.zip` and extract it anywhere
(e.g. `C:\projects\3d-product-configurator`). The folder that contains
`manage.py` is the project root — the one this README lives in.

**Step 1 — Open the project**
In PyCharm: **File → Open…** and select the folder that contains `manage.py`
(the `backend` folder — PyCharm detects it as a Django/Python project).

**Step 2 — Create the Python interpreter (virtualenv)**
- **File → Settings → Project → Python Interpreter** (macOS: **PyCharm → Settings**)
- Click the gear / **Add Interpreter → Add Local Interpreter**
- Choose **Virtualenv Environment → New**, base interpreter **Python 3.10+**, location `.venv` → **OK**
- PyCharm creates `.venv/` and indexes the project (bottom progress bar)

**Step 3 — Install dependencies**
- Open the built-in terminal (bottom: **View → Tool Windows → Terminal**) — the `.venv` is auto-activated
- Run:
  ```bash
  pip install -r requirements.txt
  ```
  (PyCharm may also show a yellow bar "Package requirements … are not satisfied"
  — click **Install requirement** there; same result.)

**Step 4 — Set up the database (2 commands)**
In the same terminal:
  ```bash
  python manage.py migrate
  python manage.py seed_demo
  ```
- `migrate` creates `db.sqlite3`
- `seed_demo` fills the catalog with the 8 demo products (94 finishes total),
  safe to re-run; add `--force` to wipe and reseed

**Step 5 — Create a Run configuration**
- **Run → Edit Configurations… → + → Python**
- Name: `runserver`
- Script path: click the folder icon and select **`manage.py`** in the project root
  (if the field shows "module" instead, pick *Module name* and type `manage.py` — both work)
- Parameters: `runserver 0.0.0.0:3000`
- Working directory: the folder that contains `manage.py`
- **OK**

**Step 6 — Run / Debug**
- Press **Shift+F10** (Run) or the green ▶ — the console shows
  *"Starting development server at http://127.0.0.1:3000/"*
- Open **http://127.0.0.1:3000** in your browser (Ctrl/Cmd+Click the link in the console)
- Press **Shift+F9** to run with breakpoints — debugging Django views works normally

**Step 7 — (optional) Django support & admin**
- For template/management-command niceties: **Settings → Languages & Frameworks → Django**,
  enable Django support, set *Settings file* to `config/settings.py`
- Admin panel: **http://127.0.0.1:3000/admin/** — user `admin`, password `admin1234`
  (the seeder created it; change it in the admin or via `python manage.py changepassword admin`)

**Troubleshooting**
| Symptom | Fix |
|---|---|
| `python` runs the wrong version | use `py -3` on Windows, or select the interpreter explicitly in Step 2 |
| `ModuleNotFoundError: django` | the run config isn't using the `.venv` — recheck Step 2/5 interpreter |
| Port 3000 already in use | change the parameter to `runserver 8000` and open `:8000` |
| 3D canvas stays dark | use Chrome/Edge/Firefox — any browser with WebGL (all modern ones) |
| Windows blocks `start.sh` | not needed in PyCharm — Steps 4–6 replace it |

---

## Project structure

```
3d-product-configurator/
├── manage.py
├── requirements.txt
├── start.sh                     # one-command launcher (migrate + seed + serve)
├── config/                      # Django project
│   ├── settings.py              # DRF, CORS, SQLite config
│   ├── urls.py                  # API routes + frontend catch-all
│   └── frontend.py              # serves the storefront from Django
├── catalog/                     # product catalog app
│   ├── models.py                # Product / Part / PartOption
│   ├── serializers.py
│   ├── views.py                 # ReadOnly product ViewSet
│   └── management/commands/seed_demo.py
├── orders/                      # cart → order pipeline
│   ├── pricing.py               # SERVER-SIDE pricing engine (single source of truth)
│   ├── models.py                # Order / OrderItem (configuration snapshots)
│   └── views.py                 # Quote / OrderCreate / OrderDetail
└── frontend/                    # vanilla JS storefront (served by Django)
    ├── index.html               # storefront (hero + catalog grid)
    ├── configurator.html        # 3D configurator page
    ├── checkout.html            # cart + delivery form
    ├── success.html             # order confirmation / tracking
    ├── css/style.css            # design system, responsive at 768px / 1080px
    ├── vendor/                  # three.min.js + OrbitControls (local, offline-friendly)
    └── js/
        ├── api.js               # fetch client + localStorage cart + toast
        ├── layout.js            # shared header/footer, cart badge
        ├── models.js            # procedural 3D models + materials + PMREM environment
        ├── catalog.js           # storefront grid, offscreen 3D thumbnails
        ├── configurator.js      # scene, OrbitControls, live pricing, add-to-cart
        ├── checkout.js          # cart UI, server quote, order placement
        └── success.js           # order lookup + confirmation
```

---

## REST API

Base URL: `http://127.0.0.1:3000` · browsable via DRF's Browsable API renderer.

| Method | Endpoint                     | Description                                        |
|--------|------------------------------|----------------------------------------------------|
| GET    | `/api/products/`             | List products with parts + finishes                |
| GET    | `/api/products/<slug>/`      | Product detail (parts → options with price deltas) |
| POST   | `/api/quote/`                | Server-side price for one or more configured lines |
| POST   | `/api/orders/`               | Checkout — re-validates & re-prices everything     |
| GET    | `/api/orders/<number>/`      | Order status / tracking                            |
| GET    | `/api/health/`               | Liveness probe                                     |

Example — quote a configured chair:

```bash
curl -X POST http://127.0.0.1:3000/api/quote/ \
  -H "Content-Type: application/json" \
  -d '{
        "items": [{
          "slug": "aurora-lounge-chair",
          "quantity": 2,
          "engraving": "ADA",
          "configuration": {"seat": 5, "back": 8, "frame": 12, "base": 17}
        }]
      }'
```

Example — checkout (prices are recomputed, never trusted from the client):

```bash
curl -X POST http://127.0.0.1:3000/api/orders/ \
  -H "Content-Type: application/json" \
  -d '{
        "customer_name": "Ada Lovelace",
        "email": "ada@example.com",
        "address": "12 Analytic Engine Way",
        "city": "London", "postal_code": "NW1 6XE", "country": "UK",
        "items": [{ "slug": "terra-ceramic-mug", "quantity": 3,
                    "configuration": {"body": 18} }]
      }'
```

---

## How the 3D configurator works

1. The API exposes every product as `parts` (e.g. `seat`, `frame`, `base`) and each
   part as `options` (hex color(s) + material kind + price delta + default flag).
2. `frontend/js/models.js` builds each product **procedurally** from Three.js
   primitives and tags every mesh with `userData.partKey` matching the API keys.
3. Selecting an option calls `ModelFactory.applyOption()` — meshes with that
   `partKey` are re-colored / re-materialized instantly (two-tone finishes use
   `color2` for `partSlot: "secondary"` meshes, e.g. the marble base).
4. Pricing shown in the UI is display-only; the server recomputes it in
   `orders/pricing.py` at quote and checkout time.
5. Adding to cart captures the WebGL canvas as a JPEG so the cart shows *your*
   exact build.

### Adding a new product (no code changes needed)

1. In `/admin/` add a Product (pick a `model_type` the renderer knows: `chair`,
   `mug`, `bottle`, `lamp`, `headphones`, `clock`, `vase`, `candle`), add Parts
   with stable keys, add options per part.
2. New finishes/prices appear in the storefront and configurator immediately.
   (To render a brand-new shape, add one builder function in `models.js`.)

---

## Design notes & talking points

- **Why vanilla JS?** Zero build step, zero dependencies, trivially auditable —
  and it demonstrates real understanding of the DOM, fetch, WebGL and state
  management without framework magic.
- **Server-authoritative pricing** — the classic e-commerce lesson: the client
  shows prices for immediacy, the server owns the truth. Try posting a
  manipulated price — it's ignored.
- **Idempotent seeding** — `seed_demo` is safe to re-run; `--force` wipes and reseeds.
- **Same-origin simplicity** — Django serves the API *and* the storefront, so
  there's no CORS setup and deployment is a single process.
- **Performance touches** — pixel-ratio clamped to 2, render loop paused when the
  tab is hidden, one shared offscreen WebGL context for all catalog thumbnails
  (disposed after capture), JPEG (not PNG) cart snapshots to keep localStorage small.

## Ideas to extend

- Stripe/PayPal test-mode payments
- User accounts with order history (Django sessions are already wired)
- GLTF model upload per product (admin-managed)
- Server-side cart with DRF + session auth
- Dockerfile + gunicorn for deployment
