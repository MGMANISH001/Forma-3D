/* ==========================================================================
   textures.js — procedural PBR texture maps (canvas-based, ZERO external assets)

   DESIGN RULES (v2 — "studio smooth"):
   1. LOW FREQUENCY ONLY. Real materials photographed for catalogs show broad,
      soft tonal variation — not per-pixel noise. Every painter draws shapes
      spanning 5–30% of the tile; nothing smaller than ~1px survives.
   2. TINY CONTRAST. The grayscale maps swing ±3..10 levels around a near-white
      base, so the material's `color` dominates and the texture only breaks up
      the flatness (this is what keeps live retinting believable).
   3. SEAMLESS TILING. Grain lines use periodic sine curves; soft blobs are
      drawn 9× (wrapped around every edge) so tiles never show a seam.
   4. map + bumpMap ONLY. The color map is never reused as a roughnessMap —
      that mistake flattened metals to chalk. `roughness`/`metalness` stay
      authored in models.js RECIPES so steel reflects, glaze shines, etc.

   Public API: TexFactory.decorate(kind, material)
   ========================================================================== */

const TexFactory = (() => {

  if (typeof THREE === 'undefined') return { decorate: () => {} };

  /* per-kind knobs: canvas size, UV tiling, bump strength, env reflection */
  const KINDS = {
    fabric:  { size: 512, repeat: [2.6, 2.6], bump: 0.020, env: 0.35 },
    leather: { size: 512, repeat: [1.5, 1.5], bump: 0.014, env: 0.55 },
    plastic: { size: 128, repeat: [1.5, 1.5], bump: 0.004, env: 0.90 },
    metal:   { size: 256, repeat: [1, 1],     bump: 0.003, env: 1.50 },
    wood:    { size: 512, repeat: [1.3, 1.3], bump: 0.010, env: 0.50 },
    ceramic: { size: 256, repeat: [1, 1],     bump: 0.003, env: 1.20 },
    glass:   { size: 64,  repeat: [1, 1],     bump: 0.002, env: 1.60 },
    rubber:  { size: 256, repeat: [2, 2],     bump: 0.014, env: 0.30 },
  };

  const cache = {};

  function makeCanvas(size) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    return [c, c.getContext('2d')];
  }

  /* grayscale helper — everything is painted as `rgb(v,v,v)` */
  const gray = (v, a = 1) => {
    const q = Math.max(0, Math.min(255, Math.round(v)));
    return `rgba(${q},${q},${q},${a})`;
  };

  function fill(ctx, size, v) {
    ctx.fillStyle = gray(v);
    ctx.fillRect(0, 0, size, size);
  }

  /* Soft round blob, drawn wrapped on all edges so tiling stays seamless. */
  function blob(ctx, s, x, y, r, v, alpha) {
    for (const ox of [-s, 0, s]) {
      for (const oy of [-s, 0, s]) {
        const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
        g.addColorStop(0, gray(v, alpha));
        g.addColorStop(1, gray(v, 0));
        ctx.fillStyle = g;
        ctx.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
      }
    }
  }

  /* several soft tonal blobs — the bread & butter of smooth organic surfaces */
  function tonalClouds(ctx, s, count, rMin, rMax, spread, alpha) {
    for (let i = 0; i < count; i++) {
      const light = Math.random() > 0.5;
      blob(ctx, s, Math.random() * s, Math.random() * s,
           rMin + Math.random() * (rMax - rMin),
           light ? 232 + spread : 232 - spread,
           alpha * (0.6 + Math.random() * 0.8));
    }
  }

  /* ============================ painters ============================ */

  const PAINTERS = {

    /* WOOD — smooth satin plank: soft column tones + fine wavy grain lines.
       Grain lines are low-contrast and drawn 3× (wrapped) so seams never show. */
    wood(ctx, s) {
      const ph = Math.random() * Math.PI * 2;
      for (let x = 0; x < s; x++) {                 // periodic per-column tone
        const t = (x / s) * Math.PI * 2;
        const v = 231 + Math.sin(t * 3 + ph) * 4 + Math.sin(t * 7 + ph * 1.7) * 2.5;
        ctx.fillStyle = gray(v);
        ctx.fillRect(x, 0, 1, s);
      }
      tonalClouds(ctx, s, 5, 90, 170, 6, 0.10);     // broad tonal drift
      for (let i = 0; i < 26; i++) {                // fine wavy grain lines
        const x0 = Math.random() * s;
        const wph = Math.random() * Math.PI * 2;
        const amp = 2 + Math.random() * 3;
        ctx.strokeStyle = gray(214 + Math.random() * 8, 0.30 + Math.random() * 0.20);
        ctx.lineWidth = 0.7 + Math.random() * 1.1;
        for (const off of [-s, 0, s]) {
          ctx.beginPath();
          ctx.moveTo(x0 + off, -4);
          for (let y = 0; y <= s + 4; y += 8) {
            ctx.lineTo(x0 + off + Math.sin((y / s) * Math.PI * 4 + wph) * amp, y);
          }
          ctx.stroke();
        }
      }
      for (let i = 0; i < 6; i++) {                 // a few slightly darker streaks
        const x0 = Math.random() * s;
        ctx.strokeStyle = gray(206, 0.22);
        ctx.lineWidth = 1.6 + Math.random() * 1.6;
        for (const off of [-s, 0, s]) {
          ctx.beginPath();
          ctx.moveTo(x0 + off, -4);
          for (let y = 0; y <= s + 4; y += 10) {
            ctx.lineTo(x0 + off + Math.sin((y / s) * Math.PI * 2 + i) * 4, y);
          }
          ctx.stroke();
        }
      }
    },

    /* FABRIC — linen / bouclé weave: soft crossed bands + gentle mottling.
       Bands are wide (tile/16) and faint so they never strobe at distance. */
    fabric(ctx, s) {
      fill(ctx, s, 234);
      const band = s / 16;
      for (let y = 0; y < s; y += band * 2) {       // soft weft rows
        ctx.fillStyle = gray(238, 0.55);
        ctx.fillRect(0, y, s, band);
      }
      for (let x = 0; x < s; x += band * 2) {       // soft warp columns
        ctx.fillStyle = gray(230, 0.50);
        ctx.fillRect(x, 0, band, s);
      }
      tonalClouds(ctx, s, 9, 40, 100, 4, 0.09);     // slub / dye variation
      for (let i = 0; i < 220; i++) {               // thread glints
        ctx.fillStyle = gray(246, 0.10);
        const x = Math.random() * s, y = Math.random() * s;
        ctx.fillRect(x, y, 2 + Math.random() * 2, 1.2);
      }
    },

    /* LEATHER — full-grain: large soft hide tones + sparse fine pores.
       No creases/scratches — those read as damage at product scale. */
    leather(ctx, s) {
      fill(ctx, s, 231);
      tonalClouds(ctx, s, 12, 60, 150, 5, 0.12);
      tonalClouds(ctx, s, 16, 25, 60, 3, 0.10);
      for (let i = 0; i < 260; i++) {               // fine pores
        const x = Math.random() * s, y = Math.random() * s;
        ctx.fillStyle = gray(218, 0.07);
        ctx.beginPath();
        ctx.ellipse(x, y, 0.5 + Math.random() * 0.7, 0.4 + Math.random() * 0.6,
                    Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
    },

    /* PLASTIC — injection-mold smooth: near-flat with the faintest sheen drift */
    plastic(ctx, s) {
      fill(ctx, s, 238);
      tonalClouds(ctx, s, 4, 30, 70, 2, 0.08);
      for (let i = 0; i < 240; i++) {
        ctx.fillStyle = gray(233, 0.05);
        ctx.fillRect(Math.random() * s, Math.random() * s, 0.8, 0.8);
      }
    },

    /* METAL — brushed steel: broad horizontal sheen + whisper-fine streaks.
       Contrast is deliberately tiny so metalness/env reflection dominates. */
    metal(ctx, s) {
      const g = ctx.createLinearGradient(0, 0, s, 0);   // anisotropic sheen
      g.addColorStop(0, gray(219));
      g.addColorStop(0.5, gray(235));
      g.addColorStop(1, gray(219));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 70; i++) {                    // brush streaks
        const y = Math.random() * s;
        ctx.fillStyle = gray(210 + Math.random() * 34, 0.05 + Math.random() * 0.04);
        ctx.fillRect(0, y, s, 1 + Math.random() * 1.6);
      }
      for (let i = 0; i < 12; i++) {                    // wider polishing bands
        const y = Math.random() * s;
        ctx.fillStyle = gray(242, 0.05);
        ctx.fillRect(0, y, s, 3 + Math.random() * 5);
      }
    },

    /* CERAMIC — smooth reactive glaze: cloud-like kiln variation, no grit */
    ceramic(ctx, s) {
      fill(ctx, s, 240);
      tonalClouds(ctx, s, 8, 70, 160, 3.5, 0.10);
      tonalClouds(ctx, s, 5, 20, 50, 2, 0.08);
      for (let i = 0; i < 40; i++) {                    // rare tiny kiln dots
        ctx.fillStyle = gray(230, 0.05);
        ctx.beginPath();
        ctx.arc(Math.random() * s, Math.random() * s, 0.5 + Math.random() * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    },

    /* GLASS — near-clear with two faint polish arcs */
    glass(ctx, s) {
      fill(ctx, s, 247);
      ctx.strokeStyle = gray(240, 0.12);
      for (let i = 0; i < 3; i++) {
        ctx.lineWidth = 1 + Math.random();
        ctx.beginPath();
        const y = s * (0.25 + Math.random() * 0.5);
        ctx.moveTo(0, y);
        ctx.quadraticCurveTo(s / 2, y + (Math.random() - 0.5) * 12, s, y);
        ctx.stroke();
      }
    },

    /* RUBBER — matte silicone: soft dimple cloud, no hard dots */
    rubber(ctx, s) {
      fill(ctx, s, 217);
      tonalClouds(ctx, s, 10, 40, 90, 5, 0.10);
      for (let i = 0; i < 420; i++) {
        ctx.fillStyle = gray(210, 0.06);
        ctx.beginPath();
        ctx.arc(Math.random() * s, Math.random() * s, 0.5 + Math.random() * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  };

  function textureFor(kind) {
    if (cache[kind]) return cache[kind];
    const cfg = KINDS[kind] || KINDS.plastic;
    const painter = PAINTERS[kind] || PAINTERS.plastic;
    const [c, ctx] = makeCanvas(cfg.size);
    painter(ctx, cfg.size);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(cfg.repeat[0], cfg.repeat[1]);
    t.encoding = THREE.sRGBEncoding;
    t.anisotropy = 8;
    cache[kind] = t;
    return t;
  }

  /**
   * Apply the procedural texture set of `kind` onto `material`:
   * a subtle grayscale color map (tinted by material.color) plus the same
   * soft canvas as a *gentle* bump map. roughness/metalness are NOT touched —
   * they are authored per material kind in models.js.
   */
  function decorate(kind, material) {
    const cfg = KINDS[kind];
    if (!cfg) return;
    const t = textureFor(kind);
    material.map = t;
    material.bumpMap = t;
    material.bumpScale = cfg.bump;
    if ('envMapIntensity' in material) material.envMapIntensity = cfg.env;
    material.needsUpdate = true;
  }

  return { decorate };
})();
