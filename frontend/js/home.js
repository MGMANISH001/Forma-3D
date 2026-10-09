/* ==========================================================================
   home.js — storefront content behaviors shared by index.html + about.html
   1. Scroll-reveal for [data-reveal] elements (skipped for reduced motion)
   2. Newsletter signup (demo — stays on the page, confirms via toast)
   3. Auto year in the footer
   4. About page "by the numbers" — pulled live from the products API
   ========================================================================== */

(function initHome() {
  /* ---- 1. scroll reveal ------------------------------------------------ */
  const revealables = document.querySelectorAll('[data-reveal]');
  if (revealables.length && 'IntersectionObserver' in window &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealables.forEach((el, i) => {
      el.classList.add('reveal');
      // small stagger inside the same viewport batch
      el.style.transitionDelay = `${(i % 4) * 60}ms`;
      io.observe(el);
    });
  }

  /* ---- 2. newsletter (demo) -------------------------------------------- */
  const form = document.getElementById('newsletter-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('newsletter-email');
      const email = (input.value || '').trim();
      const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
      if (!valid) {
        Toast.show('Please enter a valid email address.');
        input.focus();
        return;
      }
      // Demo storefront: nothing is sent anywhere — acknowledge and reset.
      Toast.show(`Welcome aboard, ${email} — this demo stores nothing. 🎉`, 3600);
      form.reset();
    });
  }

  /* ---- 3. auto year in footer ------------------------------------------ */
  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });

  /* ---- 4. about page live stats ---------------------------------------- */
  const statProducts = document.getElementById('stat-live-products');
  if (statProducts && typeof API !== 'undefined') {
    const statOptions = document.getElementById('stat-live-options');
    const statParts = document.getElementById('stat-live-parts');
    API.getProducts().then((products) => {
      let options = 0, parts = 0;
      products.forEach((p) => {
        parts += (p.parts || []).length;
        options += (p.parts || []).reduce((n, part) => n + (part.options || []).length, 0);
      });
      statProducts.textContent = String(products.length);
      if (statParts) statParts.textContent = String(parts);
      if (statOptions) statOptions.textContent = String(options);
    }).catch(() => { /* keep the static fallback numbers */ });
  }
})();
