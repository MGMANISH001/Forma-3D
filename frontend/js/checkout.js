/* ==========================================================================
   checkout.js — cart page + checkout form
   Totals come from POST /api/quote/ (server-authoritative), then the order
   is placed via POST /api/orders/ which re-validates everything again.
   ========================================================================== */

(function initCheckout() {
  const itemsHost = document.getElementById('cart-items');
  const layoutEl = document.getElementById('checkout-layout');
  const sumSubtotal = document.getElementById('sum-subtotal');
  const sumShipping = document.getElementById('sum-shipping');
  const sumTotal = document.getElementById('sum-total');
  const form = document.getElementById('checkout-form');
  const placeBtn = document.getElementById('btn-place-order');

  /* ---------- empty-cart state ---------- */
  function renderEmpty() {
    layoutEl.style.display = 'none';
    itemsHost.innerHTML = `
      <div class="cart-empty">
        <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="9" cy="21" r="1.6"/><circle cx="19" cy="21" r="1.6"/>
          <path d="M2.5 3h2l2.4 12.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L22 7H6"/>
        </svg>
        <h2>Your cart is empty</h2>
        <p>Head to the collection and configure something in 3D.</p>
        <a class="btn btn-primary" href="/">Browse the collection</a>
      </div>`;
  }

  /* ---------- cart items ---------- */
  function renderItem(item, index) {
    const configBits = (item.selections || [])
      .map((s) => `<b>${s.part_name}:</b> ${s.option_name}`)
      .join(' · ');
    const engraving = item.engraving
      ? `<span class="engraved"> · Engraved: “${escapeHTML(item.engraving)}”</span>` : '';
    return `
      <article class="cart-item">
        <img class="cart-thumb" src="${item.thumb || ''}" alt="Configured ${escapeHTML(item.name)}" onerror="this.style.visibility='hidden'">
        <div class="cart-item-body">
          <div class="cart-item-top">
            <a class="cart-item-name" href="/configurator/?product=${encodeURIComponent(item.slug)}">${escapeHTML(item.name)}</a>
            <span class="cart-item-price">${fmt(item.unit_price)} <span style="color:var(--muted);font-weight:500">×</span> ${item.quantity}</span>
          </div>
          <p class="cart-item-config">${configBits}${engraving}</p>
          <div class="cart-item-actions">
            <div class="qty-stepper" aria-label="Quantity">
              <button type="button" data-dec="${index}" ${item.quantity <= 1 ? 'disabled' : ''} aria-label="Decrease">−</button>
              <span class="qty-value">${item.quantity}</span>
              <button type="button" data-inc="${index}" ${item.quantity >= 20 ? 'disabled' : ''} aria-label="Increase">+</button>
            </div>
            <div style="display:flex;align-items:center;gap:14px">
              <span class="line-total">${fmt(item.unit_price * item.quantity)}</span>
              <button class="remove-btn" type="button" data-remove="${index}">Remove</button>
            </div>
          </div>
        </div>
      </article>`;
  }

  function renderItems(items) {
    itemsHost.innerHTML = items.map(renderItem).join('');

    itemsHost.querySelectorAll('[data-inc]').forEach((b) =>
      b.addEventListener('click', () => { Cart.updateQuantity(+b.dataset.inc, +1); render(); }));
    itemsHost.querySelectorAll('[data-dec]').forEach((b) =>
      b.addEventListener('click', () => { Cart.updateQuantity(+b.dataset.dec, -1); render(); }));
    itemsHost.querySelectorAll('[data-remove]').forEach((b) =>
      b.addEventListener('click', () => { Cart.remove(+b.dataset.remove); render(); }));
  }

  /* ---------- server quote (debounced) ---------- */
  let quoteTimer;
  function requestQuote() {
    clearTimeout(quoteTimer);
    quoteTimer = setTimeout(runQuote, 250);
  }

  async function runQuote() {
    const items = Cart.read();
    if (!items.length) return renderEmpty();
    sumSubtotal.textContent = '…';
    sumShipping.textContent = '…';
    sumTotal.textContent = '…';
    try {
      const quote = await API.quote(items.map((i) => ({
        slug: i.slug,
        quantity: i.quantity,
        engraving: i.engraving || '',
        configuration: i.configuration || {},
      })));
      sumSubtotal.textContent = fmt(quote.subtotal);
      sumShipping.textContent = quote.shipping === 0 ? 'Free' : fmt(quote.shipping);
      sumTotal.textContent = fmt(quote.total);
      updateShippingProgress(quote.subtotal);
    } catch (err) {
      sumSubtotal.textContent = '—';
      sumShipping.textContent = '—';
      sumTotal.textContent = '—';
      Toast.show(`Could not verify prices: ${err.message}`);
    }
  }

  /* ---------- free-shipping progress (mirrors the $150 server threshold) ---------- */
  const FREE_SHIPPING_AT = 150;
  function updateShippingProgress(subtotal) {
    const bar = document.getElementById('ship-progress');
    const fill = document.getElementById('ship-progress-fill');
    const label = document.getElementById('ship-progress-label');
    if (!bar || !fill || !label) return;
    bar.hidden = false;
    const pct = Math.max(0, Math.min(100, (subtotal / FREE_SHIPPING_AT) * 100));
    requestAnimationFrame(() => { fill.style.width = `${pct}%`; });
    label.innerHTML = subtotal >= FREE_SHIPPING_AT
      ? '<b>Free shipping unlocked</b> — your order ships on us.'
      : `Add <b>${fmt(FREE_SHIPPING_AT - subtotal)}</b> more for free shipping.`;
  }

  /* ---------- form validation ---------- */
  const validators = {
    customer_name: (v) => v.trim().length >= 2 || 'Please enter your full name.',
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || 'Please enter a valid email address.',
    address: (v) => v.trim().length >= 4 || 'Please enter your street address.',
    city: (v) => v.trim().length >= 2 || 'Please enter your city.',
    postal_code: (v) => v.trim().length >= 3 || 'Please enter your postal code.',
    country: (v) => v.trim().length >= 2 || 'Please enter your country.',
  };

  function validateField(input) {
    const rule = validators[input.name];
    if (!rule) return true;
    const result = rule(input.value);
    const fieldEl = input.closest('.field');
    const errEl = document.querySelector(`[data-error-for="${input.id}"]`);
    if (result === true) {
      fieldEl.classList.remove('invalid');
      if (errEl) errEl.textContent = '';
      return true;
    }
    fieldEl.classList.add('invalid');
    if (errEl) errEl.textContent = result;
    return false;
  }

  form.querySelectorAll('input[name], textarea[name]').forEach((input) => {
    input.addEventListener('blur', () => validateField(input));
    input.addEventListener('input', () => {
      if (input.closest('.field').classList.contains('invalid')) validateField(input);
    });
  });

  /* ---------- place order ---------- */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const items = Cart.read();
    if (!items.length) return renderEmpty();

    const inputs = [...form.querySelectorAll('input[name], textarea[name]')];
    const allValid = inputs.map(validateField).every(Boolean);
    if (!allValid) {
      form.querySelector('.field.invalid input')?.focus();
      return;
    }

    const payload = {
      customer_name: form.customer_name.value,
      email: form.email.value,
      phone: form.phone.value,
      address: form.address.value,
      city: form.city.value,
      postal_code: form.postal_code.value,
      country: form.country.value,
      note: form.note.value,
      items: items.map((i) => ({
        slug: i.slug,
        quantity: i.quantity,
        engraving: i.engraving || '',
        configuration: i.configuration || {},
      })),
    };

    placeBtn.disabled = true;
    placeBtn.textContent = 'Placing order…';
    try {
      const order = await API.createOrder(payload);
      Cart.clear();
      location.href = `/success/?order=${encodeURIComponent(order.order_number)}`;
    } catch (err) {
      Toast.show(`Order failed: ${err.message}`);
      placeBtn.disabled = false;
      placeBtn.textContent = 'Place order';
    }
  });

  /* ---------- boot ---------- */
  function render() {
    const items = Cart.read();
    if (!items.length) return renderEmpty();
    renderItems(items);
    requestQuote();
  }
  render();
  Cart.onChange(() => { if (!Cart.read().length) renderEmpty(); });
})();

function escapeHTML(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
