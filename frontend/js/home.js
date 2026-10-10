/* ==========================================================================
   home.js — storefront content behaviors shared by index.html + about.html
   1. GSAP animations: hero intro timeline, scroll reveals (ScrollTrigger),
      stat count-ups  — with a graceful IntersectionObserver fallback
   2. Newsletter signup (demo — stays on the page, confirms via toast)
   3. Auto year in the footer
   4. About page "by the numbers" — pulled live from the products API
   ========================================================================== */

(function initHome() {
  const HAS_GSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- animated number count-up (GSAP) --------------------------------- */
  function countUp(el) {
    if (!el || !HAS_GSAP || REDUCED) return;
    const end = parseInt(el.textContent, 10);
    if (isNaN(end) || end === 0) return;
    const obj = { v: 0 };
    gsap.to(obj, {
      v: end, duration: 1.3, ease: 'power2.out',
      onUpdate: () => { el.textContent = String(Math.round(obj.v)); },
    });
  }

  /* ================= 1. GSAP animations ================================= */
  if (HAS_GSAP && !REDUCED) {
    gsap.registerPlugin(ScrollTrigger);

    /* -- hero entrance timeline (storefront only) -- */
    if (document.querySelector('.hero')) {
      gsap.timeline({ defaults: { ease: 'power3.out' } })
        .from('.hero .eyebrow', { y: 16, opacity: 0, duration: 0.5 })
        .from('.hero h1', { y: 36, opacity: 0, duration: 0.75 }, '-=0.28')
        .from('.hero .hero-sub', { y: 22, opacity: 0, duration: 0.6 }, '-=0.40')
        .from('.hero .hero-cta .btn', { y: 16, opacity: 0, duration: 0.5, stagger: 0.09 }, '-=0.35')
        .from('.hero .hero-stats > div', { y: 18, opacity: 0, duration: 0.5, stagger: 0.08 }, '-=0.30');
    }

    /* -- scroll-triggered reveals: [data-reveal] bands + how-it-works steps -- */
    const revealables = gsap.utils.toArray('[data-reveal], .how .step, .how h2');
    if (revealables.length) {
      gsap.set(revealables, { opacity: 0, y: 34 });
      ScrollTrigger.batch(revealables, {
        start: 'top 88%',
        once: true,
        onEnter: (batch) => gsap.to(batch, {
          opacity: 1, y: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out', overwrite: true,
        }),
      });
    }

    /* -- hero stat counters (values arrive async from catalog.js) -- */
    window.addEventListener('forma:stats', () => {
      countUp(document.getElementById('stat-products'));
      countUp(document.getElementById('stat-options'));
    });
  } else {
    /* -- fallback: original IntersectionObserver reveal (no GSAP / reduced motion) -- */
    const revealables = document.querySelectorAll('[data-reveal]');
    if (revealables.length && 'IntersectionObserver' in window && !REDUCED) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
      revealables.forEach((el, i) => {
        el.classList.add('reveal');
        el.style.transitionDelay = `${(i % 4) * 60}ms`;
        io.observe(el);
      });
    }
  }

  /* ================= 2. newsletter (demo) =============================== */
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

  /* ================= 3. auto year in footer ============================= */
  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });

  /* ================= 4. about page live stats =========================== */
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
      countUp(statProducts);
      if (statParts) countUp(statParts);
      if (statOptions) countUp(statOptions);
    }).catch(() => { /* keep the static fallback numbers */ });
  }
})();
