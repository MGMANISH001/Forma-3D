/* ==========================================================================
   catalog.js — storefront grid + real 3D thumbnails
   Thumbnails are rendered with ONE shared offscreen WebGL context, captured
   to JPEG, then the context is released — cheap and framework-free.
   ========================================================================== */

(async function initCatalog() {
  const grid = document.getElementById('grid');
  if (!grid) return;

  /* ---- 1. skeletons while loading ---- */
  grid.innerHTML = Array.from({ length: 4 }, () => `
    <div class="skel">
      <div class="skel-media"><i></i></div>
      <div class="skel-body"><i style="width:35%"></i><i style="width:75%"></i><i style="width:55%"></i></div>
    </div>`).join('');

  /* ---- 2. fetch products ---- */
  let products;
  try {
    products = await API.getProducts();
  } catch (err) {
    grid.innerHTML = `
      <div class="cart-empty" style="grid-column:1/-1">
        <h2>Could not load the catalog</h2>
        <p>${String(err.message || err)} — is the Django server running?</p>
        <a class="btn btn-ghost" href="/">Retry</a>
      </div>`;
    return;
  }

  /* ---- 3. shared offscreen renderer for thumbnails ---- */
  const TW = 560, TH = 420;
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(TW, TH);
  renderer.setPixelRatio(1);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.position = 'fixed';
  renderer.domElement.style.left = '-9999px';
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#F2ECE2');
  scene.environment = ModelFactory.createEnvironment(renderer);
  const camera = new THREE.PerspectiveCamera(34, TW / TH, 0.1, 50);

  function dressScene() {
    scene.add(new THREE.HemisphereLight(0xfff6ea, 0x8d8578, 0.5));
    const key = new THREE.DirectionalLight(0xffffff, 1.05);
    key.position.set(2.6, 3.6, 2.2);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -1.6, right: 1.6, top: 1.6, bottom: -1.6, near: 0.5, far: 12 });
    key.shadow.bias = -0.0004;
    const rim = new THREE.DirectionalLight(0xffe9d6, 0.4);
    rim.position.set(-3, 2, -2.4);
    scene.add(key, rim);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(4, 48),
      new THREE.ShadowMaterial({ opacity: 0.16 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
  }
  dressScene();

  function shoot(product) {
    const model = ModelFactory.normalize(ModelFactory.build(product.model_type), 1.05);

    // apply default options so the thumb matches the configurator's start state
    const configuration = {};
    (product.parts || []).forEach((part) => {
      const def = part.options.find((o) => o.is_default) || part.options[0];
      if (def) configuration[part.key] = def;
    });
    ModelFactory.applyConfiguration(model, configuration);
    scene.add(model);

    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const dist = (size.y / 2) / Math.tan((camera.fov * Math.PI / 180) / 2) + size.z * 0.9;
    camera.position.set(center.x + dist * 0.55, center.y + size.y * 0.18, center.z + dist * 0.85);
    camera.lookAt(center.x, center.y - size.y * 0.04, center.z);

    renderer.render(scene, camera);
    const data = renderer.domElement.toDataURL('image/jpeg', 0.82);
    scene.remove(model);
    model.traverse((o) => {
      if (o.isMesh) {
        o.geometry.dispose();
        if (o.material.dispose) o.material.dispose();
      }
    });
    return data;
  }

  /* ---- 4. render cards (thumbs generated sequentially) ---- */
  const thumbBySlug = {};   // reused by the "Recently viewed" strip
  const cards = await Promise.all(products.map(async (p, i) => {
    let thumb = '';
    try { thumb = shoot(p); } catch { /* WebGL unavailable — fallback below */ }
    return renderCard(p, thumb, i);
  }));

  grid.innerHTML = cards.join('');

  // free the WebGL context
  renderer.dispose();
  renderer.forceContextLoss && renderer.forceContextLoss();
  renderer.domElement.remove();

  function renderCard(p, thumb, index) {
    if (thumb) thumbBySlug[p.slug] = thumb;
    const swatches = (p.swatches || []).slice(0, 5)
      .map((s) => `<span class="swatch-dot" style="background:${s.color}"></span>`).join('');
    const media = thumb
      ? `<img src="${thumb}" alt="3D preview of ${p.name}" loading="lazy">`
      : `<div style="font-size:44px" role="img" aria-label="${p.name}">🧊</div>`;
    const rating = `
      <span class="card-rating" aria-label="Rated ${p.rating} out of 5">
        <span class="star">★</span>${p.rating}
        <span class="rc">(${p.review_count})</span>
      </span>`;
    return `
      <a class="card" href="/configurator/?product=${encodeURIComponent(p.slug)}" data-category="${p.category}"
         style="animation-delay:${Math.min(index, 8) * 65}ms" aria-label="Configure ${p.name} in 3D">
        <div class="card-media">
          ${media}
          ${p.badge ? `<span class="card-badge">${p.badge}</span>` : ''}
        </div>
        <div class="card-body">
          <span class="card-category">${p.category}</span>
          <h3 class="card-name">${p.name}</h3>
          <p class="card-tagline">${p.tagline}</p>
          <div class="card-meta">
            <span class="card-swatches">${swatches}</span>
            ${rating}
          </div>
          <div class="card-foot">
            <span class="card-price">${fmt(p.base_price)}</span>
            <span class="card-cta">Customize in 3D <span class="arr">→</span></span>
          </div>
        </div>
      </a>`;
  }

  /* ---- 5. category filter pills ---- */
  const filterBar = document.getElementById('filter-bar');
  if (filterBar) {
    const counts = {};
    products.forEach((p) => { counts[p.category] = (counts[p.category] || 0) + 1; });
    const cats = Object.keys(counts).sort();
    filterBar.innerHTML = `
      <button class="filter-pill active" type="button" data-filter="all">All pieces<span class="fp-count">${products.length}</span></button>
      ${cats.map((c) => `
        <button class="filter-pill" type="button" data-filter="${c}">${c}<span class="fp-count">${counts[c]}</span></button>`).join('')}`;

    filterBar.querySelectorAll('.filter-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        filterBar.querySelectorAll('.filter-pill').forEach((b) => b.classList.toggle('active', b === pill));
        const f = pill.dataset.filter;
        grid.querySelectorAll('.card').forEach((card) => {
          const show = f === 'all' || card.dataset.category === f;
          card.classList.toggle('hide-cat', !show);
          if (show) {                       // replay the entrance animation
            card.style.animation = 'none';
            void card.offsetWidth;
            card.style.animation = '';
          }
        });
      });
    });
  }

  /* ---- 6. hero stats + scroll reveal for the steps ---- */
  const statEl = document.getElementById('stat-products');
  if (statEl) statEl.textContent = String(products.length);
  const statOptions = document.getElementById('stat-options');
  if (statOptions) {
    const total = products.reduce((n, p) => n + (p.parts || []).reduce((m, part) => m + (part.options || []).length, 0), 0);
    statOptions.textContent = `${total}`;
  }

  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.15 });
    document.querySelectorAll('.how .step, .how h2, .section-head').forEach((el) => {
      el.classList.add('reveal');
      io.observe(el);
    });
  }

  /* ---- 7. "Recently viewed" strip (slugs recorded by configurator.js) ---- */
  let recentSlugs = [];
  try { recentSlugs = JSON.parse(localStorage.getItem('forma3d_recent_v1') || '[]'); } catch { /* none */ }
  const bySlug = {};
  products.forEach((p) => { bySlug[p.slug] = p; });
  const recentItems = recentSlugs.map((s) => bySlug[s]).filter(Boolean).slice(0, 6);

  if (recentItems.length && grid.insertAdjacentElement) {
    const strip = document.createElement('div');
    strip.className = 'recent';
    strip.innerHTML = `
      <div class="recent-head">
        <h3>Recently viewed</h3>
        <span>Pick up where you left off</span>
      </div>
      <div class="recent-row">
        ${recentItems.map((p) => {
          const media = thumbBySlug[p.slug]
            ? `<img src="${thumbBySlug[p.slug]}" alt="${p.name}">`
            : `<div style="aspect-ratio:4/3;display:flex;align-items:center;justify-content:center;font-size:34px">🧊</div>`;
          return `
            <a class="recent-card" href="/configurator/?product=${encodeURIComponent(p.slug)}" aria-label="Configure ${p.name} again">
              ${media}
              <span class="recent-card-body">
                <span class="recent-card-name">${p.name}</span>
                <span class="recent-card-price">${fmt(p.base_price)}</span>
              </span>
            </a>`;
        }).join('')}
      </div>`;
    grid.insertAdjacentElement('afterend', strip);
  }
})();
