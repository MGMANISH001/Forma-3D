/* ==========================================================================
   configurator.js — real-time 3D product configurator
   - Three.js scene with OrbitControls (mouse + touch)
   - Options are fetched from the Django API; retinting happens locally,
     pricing is recomputed by the server at quote/checkout time.
   ========================================================================== */

(async function initConfigurator() {
  const stageEl = document.getElementById('stage');
  const canvas = document.getElementById('stage-canvas');
  const loaderEl = document.getElementById('stage-loader');
  const panelScroll = document.getElementById('panel-scroll');
  const panelFooter = document.getElementById('panel-footer');
  const buyBar = document.getElementById('buy-bar');
  const buyBarTotal = document.getElementById('buy-bar-total');
  const buyBarAdd = document.getElementById('buy-bar-add');
  const toast = Toast;

  const ENGRAVING_FEE = 9.90; // display-only mirror of the server constant

  /* ================= state ================= */
  const state = {
    product: null,
    selection: {},     // partKey -> option object
    engraving: '',
    quantity: 1,
  };
  let baseScale = 1;   // normalized model scale — reference for GSAP intro & retint pulse

  /* ================= load product ================= */
  const params = new URLSearchParams(location.search);
  let slug = params.get('product');
  if (!slug) {
    try {
      const list = await API.getProducts();
      slug = list[0] && list[0].slug;
    } catch { /* handled below */ }
  }
  if (!slug) {
    loaderEl.querySelector('p').textContent = 'No product selected.';
    panelScroll.innerHTML = '<p class="product-desc">Open the <a href="/">storefront</a> and pick a product to configure.</p>';
    return;
  }

  let product;
  try {
    product = await API.getProduct(slug);
  } catch (err) {
    loaderEl.querySelector('p').textContent = 'Could not load product.';
    panelScroll.innerHTML = `<p class="product-desc">${String(err.message || err)}<br><br><a href="/">← Back to storefront</a></p>`;
    return;
  }
  state.product = product;
  document.title = `${product.name} — 3D Configurator — FORMA3D`;

  // remember this product for the "Recently viewed" strip on the storefront
  try {
    const KEY = 'forma3d_recent_v1';
    const slugs = JSON.parse(localStorage.getItem(KEY) || '[]').filter((s) => s !== product.slug);
    slugs.unshift(product.slug);
    localStorage.setItem(KEY, JSON.stringify(slugs.slice(0, 8)));
  } catch { /* storage unavailable */ }

  // default selection = every part's default option
  product.parts.forEach((part) => {
    const def = part.options.find((o) => o.is_default) || part.options[0];
    if (def) state.selection[part.key] = def;
  });

  /* ================= three.js scene ================= */
  let renderer, scene, camera, controls, model, initialCam, initialTarget, viewPresets;
  const STAGE_BG = { light: '#F4EEE4', dark: '#211E17' };   // must exist before scene init

  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    scene = new THREE.Scene();
    scene.background = new THREE.Color('#F4EEE4');
    scene.environment = ModelFactory.createEnvironment(renderer);

    camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
    camera.position.set(1.6, 1.05, 1.9);

    controls = new THREE.OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 1.9;
    controls.autoRotateSpeed = 2.4;
    controls.rotateSpeed = 0.85;

    // three-point lighting + soft ground shadow (env map adds reflections)
    scene.add(new THREE.HemisphereLight(0xfff6ea, 0x8d8578, 0.5));
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(2.6, 3.8, 2.2);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -1.7, right: 1.7, top: 1.7, bottom: -1.7, near: 0.5, far: 12 });
    key.shadow.bias = -0.0004;
    const rim = new THREE.DirectionalLight(0xffe9d6, 0.42);
    rim.position.set(-3, 2, -2.6);
    scene.add(key, rim);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(4, 48),
      new THREE.ShadowMaterial({ opacity: 0.17 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    applySceneTheme();   // match the stage to the active light/dark theme

    model = ModelFactory.normalize(ModelFactory.build(product.model_type), 1.15);
    ModelFactory.applyConfiguration(model, state.selection);
    scene.add(model);
    baseScale = model.scale.x;

    fitCamera();

    /* ---- GSAP intro: radial camera dolly + model scale pop (boot only).
         Radial from the orbit target = always inside min/max distance. -- */
    if (window.gsap && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const offset = initialCam.clone().sub(initialTarget).multiplyScalar(1.45);
      camera.position.copy(initialTarget).add(offset);
      gsap.to(camera.position, {
        x: initialCam.x, y: initialCam.y, z: initialCam.z,
        duration: 1.6, ease: 'power3.out', onUpdate: () => controls.update(),
      });
      model.scale.setScalar(baseScale * 0.001);
      gsap.to(model.scale, {
        x: baseScale, y: baseScale, z: baseScale,
        duration: 1.0, delay: 0.2, ease: 'back.out(1.4)',
      });
      gsap.from(canvas, { opacity: 0, duration: 0.8, ease: 'power2.out' });
    }
  } catch (err) {
    // WebGL unavailable — the panel still works, just without 3D.
    loaderEl.classList.add('hide');
    stageEl.insertAdjacentHTML('beforeend',
      `<p style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#8A857C;font-size:14px;text-align:center;padding:20px">
        3D preview unavailable in this browser (${String(err.message || err)}).</p>`);
  }

  /* ---- theme-aware stage: background + shadow strength follow light/dark ---- */
  function applySceneTheme() {
    if (!scene) return;
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    scene.background = new THREE.Color(STAGE_BG[dark ? 'dark' : 'light']);
    scene.traverse((o) => {
      if (o.isMesh && o.material && o.material.isShadowMaterial) {
        o.material.opacity = dark ? 0.34 : 0.17;
      }
    });
  }
  window.addEventListener('forma:theme', applySceneTheme);

  function fitCamera() {
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const radius = Math.max(size.x, size.y, size.z);
    const dist = (size.y / 2) / Math.tan((camera.fov * Math.PI / 180) / 2) + radius * 0.75;
    initialTarget = center.clone();
    initialCam = new THREE.Vector3(
      center.x + dist * 0.52, center.y + size.y * 0.22, center.z + dist * 0.82
    );
    controls.minDistance = dist * 0.55;
    controls.maxDistance = dist * 2.2;
    viewPresets = {
      hero:  { pos: initialCam.clone(), target: initialTarget.clone() },
      front: { pos: new THREE.Vector3(center.x, center.y + size.y * 0.04, center.z + dist), target: initialTarget.clone() },
      side:  { pos: new THREE.Vector3(center.x + dist, center.y + size.y * 0.04, center.z), target: initialTarget.clone() },
      top:   { pos: new THREE.Vector3(center.x, center.y + dist * 0.85, center.z + dist * 0.32), target: initialTarget.clone() },
    };
    resetCamera();
  }

  function resetCamera() {
    camera.position.copy(initialCam);
    controls.target.copy(initialTarget);
    controls.update();
    markViewChip('hero');
  }

  function markViewChip(name) {
    document.querySelectorAll('.view-chip').forEach((c) => {
      const on = c.dataset.view === name;
      c.classList.toggle('active', on);
      c.setAttribute('aria-pressed', String(on));
    });
  }

  /* ---- resize (mobile rotation, panel split) ---- */
  function resize() {
    if (!renderer) return;
    const w = stageEl.clientWidth, h = stageEl.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stageEl);
  resize();

  /* ---- render loop (paused when tab hidden) ---- */
  (function loop() {
    requestAnimationFrame(loop);
    if (document.hidden || !renderer) return;
    controls.update();
    renderer.render(scene, camera);
  })();

  /* ---- stage actions ---- */
  const btnSpin = document.getElementById('btn-spin');
  btnSpin.addEventListener('click', () => {
    controls.autoRotate = !controls.autoRotate;
    btnSpin.setAttribute('aria-pressed', String(controls.autoRotate));
  });
  document.getElementById('btn-reset').addEventListener('click', resetCamera);

  /* ---- camera view presets (¾ / Front / Side / Top) with fly-to tween ---- */
  const REDUCED_MOTION = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let flyRaf = null;
  function flyTo(preset) {
    if (!preset) return;
    controls.autoRotate = false;
    btnSpin.setAttribute('aria-pressed', 'false');
    if (flyRaf) cancelAnimationFrame(flyRaf);
    const p0 = camera.position.clone(), t0 = controls.target.clone();
    if (REDUCED_MOTION) {
      camera.position.copy(preset.pos);
      controls.target.copy(preset.target);
      controls.update();
      return;
    }
    const start = performance.now(), dur = 620;
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    (function step(now) {
      const t = Math.min(1, (now - start) / dur), k = ease(t);
      camera.position.lerpVectors(p0, preset.pos, k);
      controls.target.lerpVectors(t0, preset.target, k);
      controls.update();
      if (t < 1) flyRaf = requestAnimationFrame(step);
    })(performance.now());
  }

  const viewDock = document.getElementById('view-dock');
  if (viewDock) {
    const chips = Array.from(viewDock.querySelectorAll('.view-chip'));
    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        markViewChip(chip.dataset.view);
        flyTo(viewPresets && viewPresets[chip.dataset.view]);
      });
    });
    // manual orbiting cancels the flight and clears the active preset
    controls.addEventListener('start', () => {
      if (flyRaf) { cancelAnimationFrame(flyRaf); flyRaf = null; }
      chips.forEach((c) => { c.classList.remove('active'); c.setAttribute('aria-pressed', 'false'); });
    });
  }

  /* ---- hide the drag hint after the first interaction ---- */
  const stageHint = stageEl.querySelector('.stage-hint');
  const dismissHint = () => { if (stageHint) stageHint.classList.add('fade'); };
  canvas.addEventListener('pointerdown', dismissHint, { once: true });
  canvas.addEventListener('wheel', dismissHint, { once: true, passive: true });

  /* ================= pricing (display-only; server re-verifies) ================= */
  let lastTotal = null;

  function animateTotal(el, to) {
    const from = lastTotal === null ? to : lastTotal;
    if (from === to) { el.textContent = fmt(to); lastTotal = to; return; }
    const start = performance.now();
    const dur = 420;
    function step(now) {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = fmt(from + (to - from) * eased);
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function unitPrice() {
    let p = state.product.base_price;
    Object.values(state.selection).forEach((o) => { p += o.price_delta; });
    if (state.engraving.trim()) p += ENGRAVING_FEE;
    return p;
  }

  function refreshPricing() {
    const qty = state.quantity;
    const unit = unitPrice();
    const rows = [`<div class="breakdown-row"><span>Base price</span><span>${fmt(state.product.base_price)}</span></div>`];

    Object.entries(state.selection).forEach(([key, opt]) => {
      if (opt.price_delta) {
        const part = state.product.parts.find((p) => p.key === key);
        rows.push(`<div class="breakdown-row"><span>${part ? part.name : key} · ${opt.name}</span><span>+${fmt(opt.price_delta)}</span></div>`);
      }
    });
    if (state.engraving.trim()) {
      rows.push(`<div class="breakdown-row"><span>Laser engraving</span><span>+${fmt(ENGRAVING_FEE)}</span></div>`);
    }
    if (qty > 1) {
      rows.push(`<div class="breakdown-row"><span>Quantity</span><span>× ${qty}</span></div>`);
    }
    rows.push(`<div class="breakdown-row total"><span>Total</span><span id="breakdown-total">${fmt(unit * qty)}</span></div>`);

    panelFooter.innerHTML = `
      <div class="breakdown">${rows.join('')}</div>
      <button class="btn btn-primary btn-block btn-add-desktop" id="btn-add" type="button">Add to cart — ${fmt(unit * qty)}</button>`;

    const totalEl = document.getElementById('breakdown-total');
    if (totalEl) animateTotal(totalEl, unit * qty);
    if (buyBarTotal) {
      const buyEl = buyBarTotal;
      const from = lastTotal === null ? unit * qty : lastTotal;
      if (from !== unit * qty) {
        const start = performance.now();
        const tick = (now) => {
          const t = Math.min(1, (now - start) / 420);
          buyEl.textContent = fmt(from + (unit * qty - from) * (1 - Math.pow(1 - t, 3)));
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      } else {
        buyEl.textContent = fmt(unit * qty);
      }
    }
    lastTotal = unit * qty;

    const addBtn = document.getElementById('btn-add');
    if (addBtn) addBtn.addEventListener('click', addToCart);
  }

  /* ================= panel UI ================= */
  function renderPanel() {
    const ratingStars = '★'.repeat(Math.round(state.product.rating));
    const partsHTML = state.product.parts.map((part) => {
      const selected = state.selection[part.key];
      const options = part.options.map((opt) => {
        const sel = selected && selected.id === opt.id ? ' selected' : '';
        const delta = opt.price_delta ? `<span class="opt-delta">${opt.price_delta > 0 ? '+' : ''}${fmt(opt.price_delta)}</span>` : '';
        return `
          <button class="opt${sel}" type="button" data-part="${part.key}" data-option="${opt.id}"
                  style="--dot:${opt.color}" aria-pressed="${!!sel}">
            <span class="opt-dot" style="background:${opt.color}"></span>
            ${opt.name} ${delta}
          </button>`;
      }).join('');
      const selName = selected ? `<span class="part-selected" data-part-selected="${part.key}">${selected.name}</span>` : '';
      return `
        <section class="part-block" aria-label="${part.name}">
          <div class="part-head"><h3 class="part-name">${part.name} ${selName}</h3></div>
          ${part.help_text ? `<p class="part-help">${part.help_text}</p>` : ''}
          <div class="options">${options}</div>
        </section>`;
    }).join('');

    panelScroll.innerHTML = `
      <a class="panel-back" href="/">← Back to collection</a>
      <p class="product-kicker">${state.product.category} · Made to order</p>
      <h1 class="product-title">${state.product.name}</h1>
      <p class="product-rating"><span class="star">${ratingStars}</span> ${state.product.rating} · ${state.product.review_count} reviews</p>
      <p class="product-desc">${state.product.description}</p>
      ${partsHTML}
      <section class="config-extra">
        <div class="engrave-field">
          <label for="engraving">Laser engraving <span class="optional" style="color:var(--muted);font-weight:500;font-size:11.5px">optional</span></label>
          <div class="engrave-input-wrap">
            <input class="engrave-input" id="engraving" type="text" maxlength="24"
                   placeholder="Your text on the product…" value="${state.engraving.replace(/"/g, '&quot;')}">
            <span class="engrave-count" id="engrave-count">0/24</span>
          </div>
          <p class="engrave-fee">+ ${fmt(ENGRAVING_FEE)} per item · engraved before assembly</p>
        </div>
        <div class="qty-field">
          <label for="qty-value">Quantity</label>
          <div class="qty-row">
            <div class="qty-stepper">
              <button type="button" id="qty-minus" aria-label="Decrease quantity">−</button>
              <span class="qty-value" id="qty-value">${state.quantity}</span>
              <button type="button" id="qty-plus" aria-label="Increase quantity">+</button>
            </div>
            <span style="font-size:12.5px;color:var(--muted)">1–20 per order</span>
          </div>
        </div>
      </section>
      ${careHTML()}`;

    function careHTML() {
      const CARE_BY_CATEGORY = {
        Living:   'The frame is joined by hand from kiln-dried hardwood; covers zip off for cleaning. Wipe metal and wood parts with a dry cloth, keep out of prolonged direct sun.',
        Tech:     'Materials are skin-safe and tested for long sessions. Wipe cushions with a slightly damp cloth and store flat to protect the headband shape.',
        Lighting: 'The shade and base are finished by hand — dust with a dry microfibre cloth. Use a LED bulb of 7W or less and avoid damp locations.',
        Decor:    'The quartz movement runs on one AA battery (included). Dust the face with a dry cloth; the anodised ring should not be polished with solvents.',
        Tabletop: 'Food-safe glazes and double-wall insulation where noted. Dishwasher-safe on the gentle cycle; avoid microwave use on metallic finishes.',
        Travel:   'Double-wall vacuum steel keeps drinks hot 12h / cold 24h. Hand-wash the body, clean the lid weekly, and leave it open to dry.',
        Wellness: 'Soy wax with a cotton wick — first burn 2 hours for an even pool. Trim the wick to 5mm before each relight and never leave a burning candle unattended.',
      };
      const care = CARE_BY_CATEGORY[state.product.category] ||
        'Wipe with a soft dry cloth. Every surface is finished by hand, so small variations are part of the character of the piece.';
      return `
        <section class="care-block" aria-label="Details and care">
          <h3 class="care-title">Details &amp; care</h3>
          <details class="care-item">
            <summary>Materials &amp; finish</summary>
            <p>Every variant you can select on the left is a real finish recipe used by the workshop — grains, weaves and anodised metals, priced honestly per option.</p>
          </details>
          <details class="care-item">
            <summary>Care instructions</summary>
            <p>${care}</p>
          </details>
          <details class="care-item">
            <summary>Shipping &amp; returns</summary>
            <p>Made to order in 12 working days, then tracked to your door. Free shipping on orders over $150; otherwise a flat $12.90. 30-day returns on unengraved pieces.</p>
          </details>
        </section>`;
    }

    // option buttons
    panelScroll.querySelectorAll('.opt').forEach((btn) => {
      btn.addEventListener('click', () => {
        const partKey = btn.dataset.part;
        const option = state.product.parts
          .find((p) => p.key === partKey).options
          .find((o) => String(o.id) === btn.dataset.option);
        if (!option) return;
        state.selection[partKey] = option;
        if (model) {
          ModelFactory.applyOption(model, partKey, option);
          /* tactile feedback: the whole model pulses once on every retint */
          if (window.gsap && !REDUCED_MOTION) {
            gsap.fromTo(model.scale,
              { x: baseScale * 1.05, y: baseScale * 1.05, z: baseScale * 1.05 },
              { x: baseScale, y: baseScale, z: baseScale, duration: 0.65,
                ease: 'elastic.out(1, 0.4)', overwrite: 'auto' });
          }
        }
        // update selected styles within this part only
        btn.parentElement.querySelectorAll('.opt').forEach((b) => {
          const on = b === btn;
          b.classList.toggle('selected', on);
          b.setAttribute('aria-pressed', String(on));
        });
        // reflect the choice next to the part title
        const selLabel = panelScroll.querySelector(`[data-part-selected="${partKey}"]`);
        if (selLabel) selLabel.textContent = option.name;
        refreshPricing();
      });
    });

    // engraving
    const engraveInput = document.getElementById('engraving');
    const engraveCount = document.getElementById('engrave-count');
    engraveInput.addEventListener('input', () => {
      state.engraving = engraveInput.value;
      engraveCount.textContent = `${engraveInput.value.length}/24`;
      refreshPricing();
    });

    // quantity
    document.getElementById('qty-minus').addEventListener('click', () => {
      state.quantity = Math.max(1, state.quantity - 1);
      document.getElementById('qty-value').textContent = state.quantity;
      refreshPricing();
    });
    document.getElementById('qty-plus').addEventListener('click', () => {
      state.quantity = Math.min(20, state.quantity + 1);
      document.getElementById('qty-value').textContent = state.quantity;
      refreshPricing();
    });

    refreshPricing();

    /* ---- panel entrance cascade (runs once at boot) ---- */
    if (window.gsap && !REDUCED_MOTION) {
      gsap.from(panelScroll.children, {
        y: 24, opacity: 0, duration: 0.5, stagger: 0.05, ease: 'power2.out', clearProps: 'all',
      });
    }
  }

  /* ================= add to cart ================= */
  function captureThumb() {
    if (!renderer) return '';
    const w = stageEl.clientWidth, h = stageEl.clientHeight;
    try {
      renderer.setSize(360, 270, false);
      camera.aspect = 360 / 270;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
      return renderer.domElement.toDataURL('image/jpeg', 0.72);
    } catch { return ''; }
    finally {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  }

  function addToCart() {
    const selections = Object.entries(state.selection).map(([key, opt]) => {
      const part = state.product.parts.find((p) => p.key === key);
      return {
        part: key,
        part_name: part ? part.name : key,
        option_id: opt.id,
        option_name: opt.name,
        color: opt.color,
        delta: opt.price_delta,
      };
    });
    const configuration = {};
    Object.entries(state.selection).forEach(([key, opt]) => { configuration[key] = opt.id; });

    Cart.add({
      slug: state.product.slug,
      name: state.product.name,
      model_type: state.product.model_type,
      configuration,
      selections,
      engraving: state.engraving.trim(),
      quantity: state.quantity,
      unit_price: unitPrice(),          // display-only; server recomputes
      thumb: captureThumb(),
    });

    toast.show(`Added to cart — ${state.product.name} × ${state.quantity}`);
    const btn = document.getElementById('btn-add');
    if (btn) {
      btn.classList.add('added');
      btn.textContent = 'Added ✓';
      setTimeout(refreshPricing, 900);
    }
  }
  buyBarAdd.addEventListener('click', addToCart);

  /* ================= boot ================= */
  renderPanel();
  if (loaderEl) loaderEl.classList.add('hide');
  buyBar.hidden = false;
})();
