/* ==========================================================================
   models.js — procedural 3D product models (Three.js r128, no external assets)

   GEOMETRY RULES (v2 — "showroom build"):
   1. Every product stands exactly on y=0 — no floating parts.
   2. Every joint is real: posts embed INTO rails, cushions rest ON frames,
      handles/grabs overlap the body wall. No visual gaps, no mixed concepts.
   3. Reference silhouettes from real products: mid-century 4-leg lounge chair,
      stoneware café mug, vacuum bottle, task lamp, wired headphones on a
      display stand, stem desk clock, pedestal vase, glass jar candle.

   Every visible mesh is tagged with userData.partKey matching the Django
   `Part.key` values, so the configurator can retint parts by key:

     chair      -> seat | back | frame | base
     mug        -> body | interior | handle
     bottle     -> body | lid | bumper
     lamp       -> shade | arm | base
     headphones -> cups | band | cushions
     clock      -> face | ring | hands
     vase       -> body | lip | foot
     candle     -> jar | wax | lid

   Meshes may also carry userData.partSlot:
     'primary'   -> option.color
     'secondary' -> option.color2 (two-tone finishes)

   Untagged meshes (candle flame, headphone stand, bulb) are fixed props the
   configurator never retints.
   ========================================================================== */

const ModelFactory = (() => {

  /* ---- material recipes per material kind (matches Django Material choices)
     Ceramic/glass/wood upgrade to MeshPhysicalMaterial for a real clearcoat
     (glaze / polish / lacquer) — the biggest single realism win in r128.   */
  const RECIPES = {
    fabric:  { roughness: 0.93, metalness: 0.00 },
    leather: { roughness: 0.44, metalness: 0.02 },
    plastic: { roughness: 0.34, metalness: 0.03 },
    metal:   { roughness: 0.16, metalness: 1.00 },
    wood:    { roughness: 0.50, metalness: 0.00, physical: true, clearcoat: 0.30, clearcoatRoughness: 0.35 },
    ceramic: { roughness: 0.16, metalness: 0.02, physical: true, clearcoat: 0.65, clearcoatRoughness: 0.18 },
    glass:   { roughness: 0.05, metalness: 0.05, transparent: true, opacity: 0.35,
               physical: true, clearcoat: 1.0, clearcoatRoughness: 0.04 },
    rubber:  { roughness: 0.95, metalness: 0.00 },
  };

  function makeMaterial(kind, hex) {
    const r = RECIPES[kind] || RECIPES.plastic;
    const Ctor = r.physical ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
    const m = new Ctor({
      roughness: r.roughness,
      metalness: r.metalness,
      transparent: !!r.transparent,
      opacity: r.opacity !== undefined ? r.opacity : 1,
    });
    if (r.physical) {
      m.clearcoat = r.clearcoat;
      m.clearcoatRoughness = r.clearcoatRoughness;
    }
    m.color.set(hex).convertSRGBToLinear();
    if (typeof TexFactory !== 'undefined') TexFactory.decorate(kind, m);   // procedural maps (textures.js)
    m.userData.kind = kind;
    return m;
  }

  function tag(mesh, partKey, slot = 'primary') {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.partKey = partKey;
    mesh.userData.partSlot = slot;
    return mesh;
  }

  /* prop meshes (never retinted) still cast + receive shadows */
  function prop(mesh) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  /* cylinder stretched between two Vector3 points (for legs / arms / posts) */
  function cylinderBetween(a, b, radius, material, radialSegments = 20) {
    const dir = new THREE.Vector3().subVectors(b, a);
    const geo = new THREE.CylinderGeometry(radius, radius, dir.length(), radialSegments);
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.clone().normalize()
    );
    return mesh;
  }

  /* ================= CHAIR — seat | back | frame | base =================
     Mid-century lounge chair. Structure (all joints overlap):
       4 splayed metal legs  -> embedded into the corner of the seat apron
       apron rails (frame)   -> carry the seat cushion on their top face
       2 rear stiles (frame) -> rise out of the rear rail, lean back
       back panel   (back)   -> mounted between the two stiles
       2 armrests   (frame)  -> tail ends buried in the stiles, front posts
       2 front posts (frame) -> stand on the side rails, hold the armrests   */
  function buildChair() {
    const g = new THREE.Group();
    const seatMat = () => makeMaterial('fabric', '#EDE4D3');
    const frameMat = makeMaterial('wood', '#C89B6A');
    const legMat = makeMaterial('metal', '#9DA3A8');

    /* ---- base: 4 splayed legs + floor glides ---- */
    [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sz]) => {
      const leg = tag(cylinderBetween(
        new THREE.Vector3(sx * 0.235, 0.375, sz * 0.19),    // top — inside apron corner
        new THREE.Vector3(sx * 0.295, 0.006, sz * 0.26),    // bottom — splayed out
        0.023, legMat, 16
      ), 'base');
      const glide = tag(new THREE.Mesh(new THREE.SphereGeometry(0.024, 14, 10), legMat), 'base');
      glide.position.set(sx * 0.295, 0.012, sz * 0.26);
      g.add(leg, glide);
    });

    /* ---- frame: seat apron (4 rails) ---- */
    const apron = [
      [0.52, 0.055, 0.05, 0, 0.36, 0.205],    // front rail
      [0.52, 0.055, 0.05, 0, 0.36, -0.205],   // rear rail
      [0.05, 0.055, 0.46, 0.235, 0.36, 0],    // side rails
      [0.05, 0.055, 0.46, -0.235, 0.36, 0],
    ];
    apron.forEach(([w, h, d, x, y, z]) => {
      const rail = tag(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), frameMat), 'frame');
      rail.position.set(x, y, z);
      g.add(rail);
    });

    /* ---- frame: rear stiles (lean BACK: rotation.x is negative so the top
       goes toward -z. Bottom end lands dead-center inside the rear rail.) -- */
    [-1, 1].forEach((s) => {
      const stile = tag(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.64, 0.06), frameMat), 'frame');
      stile.position.set(s * 0.235, 0.677, -0.25);
      stile.rotation.x = -0.14;
      g.add(stile);
    });

    /* ---- seat cushion: rests exactly on the apron top (y=0.3875) ---- */
    const seat = tag(new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.15, 0.55, 2, 2, 2), seatMat()), 'seat');
    seat.position.set(0, 0.4625, 0.005);
    g.add(seat);

    /* ---- back panel: SAME lean as the stiles, side edges buried 10mm into
       them, bottom end fully inside the cushion volume (no gap, no float) -- */
    const back = tag(new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.52, 0.10), seatMat()), 'back');
    back.position.set(0, 0.72, -0.236);
    back.rotation.x = -0.14;
    g.add(back);

    /* ---- frame: armrests + their front posts ---- */
    [-1, 1].forEach((s) => {
      const arm = tag(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.46), frameMat), 'frame');
      arm.position.set(s * 0.235, 0.72, -0.045);            // tail reaches z=-0.275 → into the stile
      const post = tag(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.35, 0.05), frameMat), 'frame');
      post.position.set(s * 0.235, 0.545, 0.155);           // stands on side rail, top inside the arm
      g.add(arm, post);
    });

    return g;
  }

  /* ================= MUG — body | interior | handle ================= */
  function buildMug() {
    const g = new THREE.Group();

    // Body (slight taper, stands on y=0)
    const body = tag(
      new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.295, 0.82, 44), makeMaterial('ceramic', '#D9C7B2')),
      'body'
    );
    body.position.y = 0.41;
    g.add(body);

    // Interior: open cylinder wall + bottom disk (DoubleSide so the cavity reads)
    const innerMat = makeMaterial('ceramic', '#F4EFE8');
    innerMat.side = THREE.DoubleSide;
    const wall = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.315, 0.27, 0.76, 44, 1, true), innerMat), 'interior');
    wall.position.y = 0.425;
    const bottom = tag(new THREE.Mesh(new THREE.CircleGeometry(0.27, 44), innerMat), 'interior');
    bottom.rotation.x = -Math.PI / 2;
    bottom.position.y = 0.06;
    g.add(wall, bottom);

    /* Handle: half-torus whose two ends are buried inside the body wall.
       Ends at x=0.28 (body radius there ≈ 0.31–0.33) → fully embedded. */
    const handle = tag(
      new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.055, 18, 36, Math.PI), makeMaterial('ceramic', '#D9C7B2')),
      'handle'
    );
    handle.position.set(0.28, 0.44, 0);
    handle.rotation.z = -Math.PI / 2;   // opening faces the mug, bulge outward
    g.add(handle);
    return g;
  }

  /* ================= BOTTLE — body | lid | bumper =================
     Vacuum bottle: straight shell → tapered shoulder → lid screwed on
     top with a carry loop. Lid sits ON the shoulder (no buried parts). */
  function buildBottle() {
    const g = new THREE.Group();

    const bodyMat = makeMaterial('metal', '#C9CDD2');
    const shell = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.295, 0.285, 0.95, 44), bodyMat), 'body');
    shell.position.y = 0.475;
    const shoulder = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.295, 0.20, 44), bodyMat), 'body');
    shoulder.position.y = 1.05;
    g.add(shell, shoulder);

    // Lid on the shoulder top + standing carry loop
    const lidMat = makeMaterial('plastic', '#3A3D42');
    const lid = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.175, 0.15, 36), lidMat), 'lid');
    lid.position.y = 1.225;
    const capTop = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.14, 0.025, 36), lidMat), 'lid');
    capTop.position.y = 1.312;
    const loop = tag(new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.02, 14, 30), lidMat), 'lid');
    loop.position.set(0.10, 1.375, 0);
    g.add(lid, capTop, loop);

    // Silicone bumper ring around the base
    const bumperMat = makeMaterial('rubber', '#4A4D52');
    const bumper = tag(new THREE.Mesh(new THREE.TorusGeometry(0.30, 0.032, 16, 44), bumperMat), 'bumper');
    bumper.rotation.x = Math.PI / 2;
    bumper.position.y = 0.07;
    g.add(bumper);
    return g;
  }

  /* ================= LAMP — shade | arm | base =================
     Task lamp: weighted base plate → two-piece articulated arm (elbow +
     wrist spheres) → capped spun shade. The wrist sphere sits inside the
     shade's top cap, so arm and shade are physically joined.               */
  function buildLamp() {
    const g = new THREE.Group();

    // Weighted base plate (+ secondary top disk for two-tone finishes)
    const baseMat = makeMaterial('metal', '#9A9C9E');
    const plate = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.36, 0.06, 44), baseMat), 'base');
    plate.position.y = 0.03;
    const plateTopMat = makeMaterial('metal', '#DADADA');
    const plateTop = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.30, 0.018, 44), plateTopMat), 'base', 'secondary');
    plateTop.position.y = 0.068;
    g.add(plate, plateTop);

    const armMat = makeMaterial('metal', '#3A3C40');
    const jointA = new THREE.Vector3(0, 0.07, -0.10);
    const jointB = new THREE.Vector3(0, 0.62, 0.02);    // elbow
    const jointC = new THREE.Vector3(0, 0.55, 0.34);    // wrist, above the shade
    const lower = tag(cylinderBetween(jointA, jointB, 0.024, armMat), 'arm');
    const elbow = tag(new THREE.Mesh(new THREE.SphereGeometry(0.036, 18, 14), armMat), 'arm');
    elbow.position.copy(jointB);
    const upper = tag(cylinderBetween(jointB, jointC, 0.020, armMat), 'arm');
    const wrist = tag(new THREE.Mesh(new THREE.SphereGeometry(0.030, 18, 14), armMat), 'arm');
    wrist.position.copy(jointC);
    g.add(lower, elbow, upper, wrist);

    /* Spun reflector shade, slightly tilted, opening downward-forward.
       Top cap closes the cone where the arm enters. */
    const shadeTilt = 0.10;
    const shadeMat = makeMaterial('metal', '#EFEDE6');
    shadeMat.side = THREE.DoubleSide;
    const shade = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.30, 0.27, 40, 1, true), shadeMat), 'shade');
    shade.position.set(0, 0.415, 0.355);
    shade.rotation.x = shadeTilt;
    const cap = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.126, 0.126, 0.014, 40), shadeMat), 'shade');
    cap.position.set(0, 0.548, 0.369);
    cap.rotation.x = shadeTilt;
    const bulb = prop(new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 18, 14),
      new THREE.MeshStandardMaterial({ color: 0xFFE3B0, emissive: 0xFFC46B, emissiveIntensity: 1.4 })
    ));
    bulb.position.set(0, 0.415, 0.348);
    g.add(shade, cap, bulb);
    return g;
  }

  /* ============ HEADPHONES — cups | band | cushions (+ fixed stand) ============
     Wired-style headphones hanging on a display stand:
       band = half-torus; its ends are buried inside the cup shells
       cups raised so the band ends land inside the shell volume
       stand (base plate + post + crossbar) is an untagged prop the band
       rests on — the classic product-photo presentation.                   */
  function buildHeadphones() {
    const g = new THREE.Group();

    const bandMat = makeMaterial('metal', '#3A3C40');
    const band = tag(new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.050, 20, 60, Math.PI), bandMat), 'band');
    band.position.y = 0.40;
    g.add(band);

    [-1, 1].forEach((s) => {
      // Ear cup shell (axis along x); band end (±0.52, 0.40) is inside this volume
      const cupMat = makeMaterial('plastic', '#2A2C30');
      const cup = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.225, 0.13, 36), cupMat), 'cups');
      cup.rotation.z = Math.PI / 2;
      cup.position.set(s * 0.545, 0.36, 0);
      const trim = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.02, 36), cupMat), 'cups');
      trim.rotation.z = Math.PI / 2;
      trim.position.set(s * 0.62, 0.36, 0);
      g.add(cup, trim);

      // Cushion pad on the inner face, overlapping the shell
      const cushMat = makeMaterial('leather', '#D9CFC0');
      const pad = tag(new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.055, 16, 36), cushMat), 'cushions');
      pad.rotation.y = Math.PI / 2;
      pad.position.set(s * 0.472, 0.36, 0);
      g.add(pad);
    });

    /* ---- display stand (fixed prop, never retinted) ----
       Single stub stand: the band rests in a saddle cap on top of the post,
       exactly like real headphone display stands. */
    const standMat = makeMaterial('metal', '#2E3033');
    const basePlate = prop(new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.34, 0.035, 40), standMat));
    basePlate.position.set(0, 0.0175, 0);
    const post = prop(cylinderBetween(
      new THREE.Vector3(0, 0.03, 0), new THREE.Vector3(0, 0.868, 0), 0.022, standMat
    ));
    const saddle = prop(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.035, 0.024, 20), standMat));
    saddle.position.set(0, 0.878, 0);
    g.add(basePlate, post, saddle);
    return g;
  }

  /* ================= CLOCK — face | ring | hands =================
     Stem desk clock: round head on a straight rear post. The post top is
     buried inside the dial disc, the post foot inside the base plate.      */
  function buildClock() {
    const g = new THREE.Group();

    const ringMat = makeMaterial('wood', '#C89B6A');
    const faceMat = makeMaterial('plastic', '#F2EEE6');
    const handsMat = makeMaterial('metal', '#3A3C40');

    /* Clock head (dial face on the xy plane) */
    const head = new THREE.Group();
    head.position.set(0, 0.60, -0.115);

    const dial = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.40, 0.40, 0.06, 48), faceMat), 'face');
    dial.rotation.x = Math.PI / 2;
    const bezel = tag(new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.05, 20, 60), ringMat), 'ring');
    head.add(dial, bezel);

    for (let i = 0; i < 12; i++) {
      const big = i % 3 === 0;
      const marker = tag(new THREE.Mesh(
        new THREE.BoxGeometry(big ? 0.022 : 0.014, big ? 0.075 : 0.045, 0.012), faceMat
      ), 'face');
      const a = (i / 12) * Math.PI * 2;
      const r = 0.335;
      marker.position.set(Math.sin(a) * r, Math.cos(a) * r, 0.037);
      marker.rotation.z = -a;
      head.add(marker);
    }

    // Hands: box offset along its pointing direction from the center pin
    const hand = (w, len, thick, angle) => {
      const h = tag(new THREE.Mesh(new THREE.BoxGeometry(w, len, thick), handsMat), 'hands');
      h.rotation.z = angle;
      const dir = new THREE.Vector2(-Math.sin(angle), Math.cos(angle));
      h.position.set(dir.x * len * 0.42, dir.y * len * 0.42, 0.05);
      return h;
    };
    head.add(hand(0.034, 0.21, 0.014, 2.2), hand(0.024, 0.30, 0.012, -0.7), hand(0.008, 0.33, 0.008, -2.6));
    const pin = tag(new THREE.Mesh(new THREE.SphereGeometry(0.028, 16, 12), handsMat), 'hands');
    pin.position.z = 0.055;
    head.add(pin);

    g.add(head);

    /* Desk stand: straight rear post embedded in dial + base plate */
    const post = tag(cylinderBetween(
      new THREE.Vector3(0, 0.03, -0.12), new THREE.Vector3(0, 0.60, -0.12), 0.026, ringMat
    ), 'ring');
    const foot = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.115, 0.035, 32), ringMat), 'ring');
    foot.position.set(0, 0.0175, -0.12);
    g.add(post, foot);
    return g;
  }

  /* ================= VASE — body | lip | foot ================= */
  function buildVase() {
    const g = new THREE.Group();

    /* Pedestal foot — wider than the body base, so the profile visibly
       emerges out of the foot ring (real thrown-vase silhouette). */
    const foot = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.215, 0.05, 40), makeMaterial('ceramic', '#B08A6A')), 'foot');
    foot.position.y = 0.025;
    g.add(foot);

    // Curved profile lathe (r, y), ceramic with visible inner wall
    const profile = [
      [0.001, 0.045], [0.15, 0.045], [0.19, 0.07], [0.225, 0.14], [0.23, 0.22],
      [0.195, 0.32], [0.13, 0.40], [0.10, 0.47], [0.10, 0.54], [0.125, 0.59], [0.148, 0.62],
    ].map((p) => new THREE.Vector2(p[0], p[1]));
    const bodyMat = makeMaterial('ceramic', '#D9C7B2');
    bodyMat.side = THREE.DoubleSide;
    const body = tag(new THREE.Mesh(new THREE.LatheGeometry(profile, 64), bodyMat), 'body');
    g.add(body);

    const lipMat = makeMaterial('ceramic', '#D9C7B2');
    const lip = tag(new THREE.Mesh(new THREE.TorusGeometry(0.148, 0.022, 14, 44), lipMat), 'lip');
    lip.rotation.x = Math.PI / 2;
    lip.position.y = 0.62;
    g.add(lip);
    return g;
  }

  /* ================= CANDLE — jar | wax | lid ================= */
  function buildCandle() {
    const g = new THREE.Group();

    // Glass vessel standing on y=0. FrontSide only — rendering the inner
    // wall too made the far side read as dark smoked glass.
    const jarMat = makeMaterial('glass', '#EAF2F0');
    jarMat.side = THREE.FrontSide;
    jarMat.opacity = 0.22;
    const jar = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.25, 0.44, 40), jarMat), 'jar');
    jar.position.y = 0.22;
    jar.castShadow = false;
    g.add(jar);

    // Wax fill visible through the glass
    const wax = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.225, 0.205, 0.36, 36), makeMaterial('ceramic', '#F2EAD9')), 'wax');
    wax.position.y = 0.19;
    g.add(wax);

    // Wick + warm flame (fixed, not configurable)
    const wick = prop(new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.008, 0.05, 8),
      new THREE.MeshStandardMaterial({ color: 0x2A2521, roughness: 1 })));
    wick.position.y = 0.395;
    const flame = prop(new THREE.Mesh(
      new THREE.SphereGeometry(0.024, 14, 12),
      new THREE.MeshStandardMaterial({ color: 0xFF9A3C, emissive: 0xFF7A00, emissiveIntensity: 2.4 })
    ));
    flame.scale.set(0.7, 1.9, 0.7);
    flame.position.y = 0.44;
    g.add(wick, flame);

    // Metal lid resting beside the jar
    const lidMat = makeMaterial('metal', '#C9A86A');
    const lid = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.052, 36), lidMat), 'lid');
    lid.position.set(0.46, 0.026, 0.10);
    const knob = tag(new THREE.Mesh(new THREE.SphereGeometry(0.032, 16, 12), lidMat), 'lid');
    knob.position.set(0.46, 0.072, 0.10);
    g.add(lid, knob);
    return g;
  }

  const BUILDERS = {
    chair: buildChair, mug: buildMug, bottle: buildBottle, lamp: buildLamp,
    headphones: buildHeadphones, clock: buildClock, vase: buildVase, candle: buildCandle,
  };

  /**
   * Procedural studio environment (softboxes + warm room) baked through
   * PMREM — gives PBR metals/ceramics realistic reflections without any
   * external HDRI asset. Call once per renderer, assign to scene.environment.
   */
  function createEnvironment(renderer) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = new THREE.Scene();
    env.background = new THREE.Color(0xEDE7DC);

    const softbox = (hex, intensity, w, h, pos) => {
      const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(intensity) });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      mesh.position.copy(pos);
      mesh.lookAt(0, 0.4, 0);
      env.add(mesh);
    };
    softbox(0xFFFFFF, 6.0, 3, 2.2, new THREE.Vector3(2.5, 2.6, 2));    // key
    softbox(0xFFE8D0, 3.0, 2.4, 2, new THREE.Vector3(-2.6, 1.8, -1.6)); // warm fill
    softbox(0xDCE8F5, 2.2, 2.6, 1.6, new THREE.Vector3(0, 3.2, -2.8));  // cool top

    const texture = pmrem.fromScene(env, 0.04).texture;
    pmrem.dispose();
    return texture;
  }

  /* ---- public API ---- */

  function build(modelType) {
    const builder = BUILDERS[modelType] || BUILDERS.chair;
    return builder();
  }

  /** Scale a model group so its height equals targetH (keeps products comparable). */
  function normalize(group, targetH = 1.15) {
    const box = new THREE.Box3().setFromObject(group);
    const size = box.getSize(new THREE.Vector3());
    if (size.y > 0) group.scale.setScalar(targetH / size.y);
    return group;
  }

  /** Re-tint / re-materialize every mesh of one part with an API option payload. */
  function applyOption(group, partKey, option) {
    group.traverse((obj) => {
      if (!obj.isMesh || obj.userData.partKey !== partKey) return;
      const slot = obj.userData.partSlot || 'primary';
      const hex = (slot === 'secondary' && option.color2) ? option.color2 : option.color;
      if (obj.material.userData.kind !== option.material) {
        const next = makeMaterial(option.material, hex);
        if (option.material === 'ceramic') next.side = THREE.DoubleSide;
        if (obj.material.side === THREE.DoubleSide) next.side = THREE.DoubleSide;
        obj.material.dispose();
        obj.material = next;
      } else {
        obj.material.color.set(hex).convertSRGBToLinear();
      }
    });
  }

  /** Apply a whole configuration {partKey: option} in one pass. */
  function applyConfiguration(group, configuration) {
    Object.entries(configuration || {}).forEach(([key, option]) => applyOption(group, key, option));
  }

  return { build, normalize, applyOption, applyConfiguration, makeMaterial, createEnvironment, RECIPES };
})();
