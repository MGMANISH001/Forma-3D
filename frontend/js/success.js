/* ==========================================================================
   success.js — order confirmation (GET /api/orders/<number>/)
   ========================================================================== */

(async function initSuccess() {
  const sub = document.getElementById('success-sub');
  const body = document.getElementById('success-body');
  const icon = document.getElementById('success-icon');
  const title = document.getElementById('success-title');

  const number = new URLSearchParams(location.search).get('order');
  if (!number) {
    title.textContent = 'No order reference';
    sub.textContent = 'This page needs an order number, e.g. /success/?order=3DC-XXXX.';
    icon.classList.add('error');
    return;
  }

  try {
    const order = await API.getOrder(number);
    document.title = `Order ${order.order_number} — FORMA3D`;

    const lines = (order.items || []).map((it) => {
      const bits = Object.values(it.configuration || {})
        .map((c) => `${c.name || ''}`.trim())
        .filter(Boolean)
        .join(' · ');
      const engraving = it.engraving ? ` — engraved “${escapeHTML(it.engraving)}”` : '';
      return `
        <div class="order-line">
          <div>
            <span class="ol-name">${escapeHTML(it.product_name)}</span>
            <span class="ol-config">× ${it.quantity}${engraving}${bits ? ` · ${escapeHTML(bits)}` : ''}</span>
          </div>
          <span class="ol-price">${fmt(it.line_total)}</span>
        </div>`;
    }).join('');

    body.innerHTML = `
      <div class="order-number">${escapeHTML(order.order_number)}</div>
      <div class="order-lines">${lines}</div>
      <div class="order-totals">
        <div class="summary-row"><span>Subtotal</span><span>${fmt(order.subtotal)}</span></div>
        <div class="summary-row"><span>Shipping</span><span>${order.shipping === 0 ? 'Free' : fmt(order.shipping)}</span></div>
        <div class="summary-row summary-total"><span>Total</span><span>${fmt(order.total)}</span></div>
      </div>
      <p class="success-sub" style="margin-bottom:26px">
        A confirmation was sent to <b>${escapeHTML(order.email)}</b>.<br>
        Your configuration goes to the workshop — assembly takes ~12 working days.
      </p>`;

    sub.textContent = `Thanks ${escapeHTML(order.customer_name.split(' ')[0])}! Your made-to-order pieces are confirmed.`;
    celebrate();
  } catch (err) {
    title.textContent = 'Order not found';
    sub.textContent = `We could not find order ${escapeHTML(number)} — ${err.message}.`;
    icon.classList.add('error');
  }

  /* ---- confetti burst (skipped for errors / reduced motion) ---- */
  function celebrate() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const zone = document.createElement('div');
    zone.className = 'confetti-zone';
    zone.setAttribute('aria-hidden', 'true');
    const colors = ['#C75B39', '#D9A038', '#3E7C4F', '#4A5D4E', '#A8462B', '#E7B9A6', '#1F1D1A'];
    for (let i = 0; i < 30; i++) {
      const piece = document.createElement('i');
      const size = 6 + Math.random() * 6;
      piece.style.cssText = `
        left:${Math.random() * 100}%;
        width:${size}px;height:${size * (0.6 + Math.random())}px;
        background:${colors[i % colors.length]};
        --dx:${Math.round(Math.random() * 180 - 90)}px;
        animation-duration:${2.4 + Math.random() * 1.8}s;
        animation-delay:${Math.random() * 0.7}s`;
      zone.appendChild(piece);
    }
    document.body.appendChild(zone);
    setTimeout(() => zone.remove(), 5500);
  }

  function escapeHTML(s) {
    return String(s || '').replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }
})();
