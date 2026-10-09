/* ==========================================================================
   api.js — tiny API client + localStorage cart + toast helper
   All API calls are same-origin: Django serves both the storefront and /api.
   ========================================================================== */

const API = {
  async _request(url, options = {}) {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail = typeof data === 'object' && data !== null
        ? (data.error || Object.values(data).flat().join(' ') || `HTTP ${res.status}`)
        : `HTTP ${res.status}`;
      const err = new Error(detail);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  },

  getProducts()        { return this._request('/api/products/'); },
  getProduct(slug)     { return this._request(`/api/products/${encodeURIComponent(slug)}/`); },
  quote(items)         { return this._request('/api/quote/', { method: 'POST', body: JSON.stringify({ items }) }); },
  createOrder(payload) { return this._request('/api/orders/', { method: 'POST', body: JSON.stringify(payload) }); },
  getOrder(number)     { return this._request(`/api/orders/${encodeURIComponent(number)}/`); },
};

/* --------------------------------------------------------------------------
   Cart — persisted in localStorage. The server *recomputes* every price at
   quote/checkout time; stored prices here are display-only.
   item = { slug, name, model_type, configuration:{partKey:optionId},
            selections:[{part, name, option, color, delta}], engraving,
            quantity, unit_price, thumb }
   -------------------------------------------------------------------------- */
const Cart = {
  KEY: 'forma3d_cart_v1',
  _listeners: [],

  read() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || []; }
    catch { return []; }
  },

  write(items) {
    localStorage.setItem(this.KEY, JSON.stringify(items));
    this._emit();
  },

  add(item) {
    const items = this.read();
    const sig = (i) => `${i.slug}|${i.engraving || ''}|${JSON.stringify(i.configuration || {})}`;
    const idx = items.findIndex((i) => sig(i) === sig(item));
    if (idx > -1) {
      items[idx].quantity = Math.min(20, items[idx].quantity + item.quantity);
    } else {
      items.push(item);
    }
    this.write(items);
  },

  updateQuantity(index, delta) {
    const items = this.read();
    if (!items[index]) return;
    items[index].quantity = Math.max(1, Math.min(20, items[index].quantity + delta));
    this.write(items);
  },

  remove(index) {
    const items = this.read();
    items.splice(index, 1);
    this.write(items);
  },

  clear() { this.write([]); },

  count() { return this.read().reduce((n, i) => n + i.quantity, 0); },

  onChange(cb) { this._listeners.push(cb); },
  _emit() { this._listeners.forEach((cb) => cb(this.read())); },
};

/* --------------------------------------------------------------------------
   Money formatting (USD by default — matches the seeded catalog currency)
   -------------------------------------------------------------------------- */
const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

/* --------------------------------------------------------------------------
   Toast — single element, auto-hide
   -------------------------------------------------------------------------- */
const Toast = (() => {
  let timer;
  return {
    show(message, ms = 2600) {
      const el = document.getElementById('toast');
      if (!el) return;
      el.textContent = message;
      el.style.setProperty('--toast-ms', `${ms}ms`);
      el.classList.add('show');
      clearTimeout(timer);
      timer = setTimeout(() => el.classList.remove('show'), ms);
    },
  };
})();
