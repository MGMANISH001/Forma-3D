/* ==========================================================================
   layout.js — shared header & footer, cart badge, mobile nav, back-to-top
   Pages include <div data-header></div> and <div data-footer></div>.
   ========================================================================== */

(function injectLayout() {
  const headerHost = document.querySelector('[data-header]');
  if (headerHost) {
    headerHost.innerHTML = `
      <header class="site-header">
        <div class="container header-inner">
          <a class="brand" href="/">FORMA<em>3D</em></a>
          <nav class="nav" aria-label="Main">
            <a href="/#shop" data-nav="shop">Shop</a>
            <a href="/#how" data-nav="how">How it works</a>
            <a href="/about/" data-nav="about">About</a>
            <a href="/admin/" target="_blank" rel="noopener">Admin</a>
          </nav>
          <div class="header-spacer"></div>
          <a class="cart-btn" href="/checkout/" aria-label="Open cart">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="9" cy="21" r="1.6"/><circle cx="19" cy="21" r="1.6"/>
              <path d="M2.5 3h2l2.4 12.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L22 7H6"/>
            </svg>
            <span class="cart-count" id="cart-count">0</span>
          </a>
          <button class="theme-toggle" id="theme-toggle" type="button" aria-label="Toggle dark mode" title="Toggle dark mode">
            <svg class="ic-moon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>
            </svg>
            <svg class="ic-sun" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="4"/>
              <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>
            </svg>
          </button>
          <button class="nav-toggle" id="nav-toggle" type="button"
                  aria-label="Open menu" aria-expanded="false" aria-controls="mobile-nav">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round">
              <line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/>
            </svg>
          </button>
        </div>
      </header>
      <nav class="mobile-nav" id="mobile-nav" aria-label="Mobile">
        <a href="/#shop">Shop</a>
        <a href="/#how">How it works</a>
        <a href="/about/">About</a>
        <a href="/admin/" target="_blank" rel="noopener">Admin</a>
      </nav>`;
  }

  const footerHost = document.querySelector('[data-footer]');
  if (footerHost) {
    footerHost.innerHTML = `
      <footer class="site-footer">
        <div class="container footer-cols">
          <div class="footer-brandcol">
            <span class="footer-brand">FORMA<em>3D</em></span>
            <p class="footer-blurb">A made-to-order storefront demo where every product is
            redesigned live in 3D — built as a personal portfolio project with Django REST
            Framework and Three.js.</p>
            <div class="footer-chips">
              <span class="footer-chip">Django 6 · REST</span>
              <span class="footer-chip">Three.js WebGL</span>
              <span class="footer-chip">SQLite</span>
              <span class="footer-chip">Server-side pricing</span>
            </div>
          </div>
          <nav class="footer-col" aria-label="Explore">
            <h4>Explore</h4>
            <a href="/#shop">The collection</a>
            <a href="/#how">How it works</a>
            <a href="/#reviews">Reviews</a>
            <a href="/#faq">FAQ</a>
          </nav>
          <nav class="footer-col" aria-label="Project">
            <h4>Project</h4>
            <a href="/about/">About this project</a>
            <a href="/about/#faq">Tech overview</a>
            <a href="/admin/" target="_blank" rel="noopener">Admin panel</a>
          </nav>
          <nav class="footer-col" aria-label="Developers">
            <h4>For developers</h4>
            <a href="/api/products/" target="_blank" rel="noopener">Products API</a>
            <a href="/api/health/" target="_blank" rel="noopener">Health check</a>
            <a href="/api/orders/" target="_blank" rel="noopener">Orders API</a>
          </nav>
        </div>
        <div class="container footer-base">
          <span>© <span data-year>2026</span> FORMA3D — a portfolio project. Demo store: no real orders or payments.</span>
          <span>Designed &amp; hand-coded, no frameworks.</span>
        </div>
      </footer>`;
  }

  /* ---- mobile menu ---- */
  const toggle = document.getElementById('nav-toggle');
  const mobileNav = document.getElementById('mobile-nav');
  if (toggle && mobileNav) {
    const setOpen = (open) => {
      mobileNav.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };
    toggle.addEventListener('click', () => setOpen(!mobileNav.classList.contains('open')));
    mobileNav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
    document.addEventListener('click', (e) => {
      if (mobileNav.classList.contains('open') && !mobileNav.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
    });
  }

  /* ---- cart badge — reflects item count, pops on increase ---- */
  let lastCount = 0;
  const updateBadge = () => {
    const badge = document.getElementById('cart-count');
    if (!badge) return;
    const n = Cart.count();
    badge.textContent = n > 99 ? '99+' : String(n);
    badge.classList.toggle('show', n > 0);
    if (n > lastCount) {
      badge.classList.remove('pop');
      void badge.offsetWidth;               // restart the animation
      badge.classList.add('pop');
    }
    lastCount = n;
  };
  Cart.onChange(updateBadge);
  updateBadge();

  /* ---- dark / light theme toggle ----
     The theme is applied pre-paint by an inline <head> script on every page
     (no flash). Here we only wire the toggle, persist the choice, keep the
     browser chrome color in sync, and notify other scripts ('forma:theme'). */
  const THEME_COLORS = { light: '#FAF7F2', dark: '#17150F' };
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  const syncThemeColor = () => {
    if (!metaTheme) return;
    metaTheme.setAttribute('content', THEME_COLORS[document.documentElement.getAttribute('data-theme')] || THEME_COLORS.light);
  };
  syncThemeColor();

  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('forma3d_theme', next); } catch { /* private mode */ }
      syncThemeColor();
      window.dispatchEvent(new CustomEvent('forma:theme', { detail: { theme: next } }));
    });
  }

  /* ---- back-to-top button (injected once, appears after scrolling) ---- */
  const toTop = document.createElement('button');
  toTop.className = 'to-top';
  toTop.id = 'to-top';
  toTop.type = 'button';
  toTop.setAttribute('aria-label', 'Back to top');
  toTop.innerHTML = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>`;
  document.body.appendChild(toTop);
  toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  const siteHeader = document.querySelector('.site-header');
  const onScroll = () => {
    toTop.classList.toggle('show', window.scrollY > 620);
    if (siteHeader) siteHeader.classList.toggle('scrolled', window.scrollY > 8);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Highlight the current nav section on the storefront page.
  if (location.pathname === '/') {
    const mark = () => {
      const hash = location.hash || '#shop';
      document.querySelectorAll('.nav a[data-nav]').forEach((a) => {
        a.classList.toggle('active', a.dataset.nav === hash.replace('#', ''));
      });
    };
    mark();
    window.addEventListener('hashchange', mark);
  }
})();
