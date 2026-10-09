/* ==========================================================================
   models.js — procedural 3D product models (Three.js r128, no external assets)

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
     'secondary' -> option.color2 (two-tone finishes, e.g. marble)
   ========================================================================== */

const ModelFactory = (() => {

  /* ---- material recipes per material kind (matches Django Material choices) */
  const RECIPES = {
    fabric:  { roughness: 0.96, metalness: 0.00 },
    leather: { roughness: 0.52, metalness: 0.04 },
    plastic: { roughness: 0.34, metalness: 0.05 },
    metal:   { roughness: 0.26, metalness: 0.88 },
    wood:    { roughness: 0.58, metalness: 0.00 },
    ceramic: { roughness: 0.22, metalness: 0.05 },
    glass:   { roughness: 0.08, metalness: 0.10, transparent: true, opacity: 0.5 },
    rubber:  { roughness: 0.92, metalness: 0.00 },
  };

  function makeMaterial(kind, hex) {
    const r = RECIPES[kind] || RECIPES.plastic;
    const m = new THREE.MeshStandardMaterial({
      roughness: r.roughness,
      metalness: r.metalness,
      transparent: !!r.transparent,
      opacity: r.opacity !== undefined ? r.opacity : 1,
    });
    m.color.set(hex).convertSRGBToLinear();
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

  /* cylinder stretched between two Vector3 points (for arms / legs) */
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

  /* ================= CHAIR — seat | back | frame | base ================= */
  function buildChair() {
    const g = new THREE.Group();
    const M = (hex) => makeMaterial('fabric', hex);

    // Seat cushion
    const seat = tag(new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.14, 0.60, 2, 2, 2), M('#EDE4D3')), 'seat');
    seat.position.set(0, 0.45, 0.02);
    // Slightly rounded look: bevel via scaled edges is skipped — keep crisp box.
    g.add(seat);

    // Backrest (tilted)
    const back = tag(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.55, 0.12), M('#EDE4D3')), 'back');
    back.position.set(0, 0.80, -0.25);
    back.rotation.x = -0.16;
    g.add(back);

    // Wooden frame: two side panels + armrests + back stiles
    const frameMat = makeMaterial('wood', '#C89B6A');
    [-1, 1].forEach((s) => {
      const panel = tag(new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.34, 0.58), frameMat), 'frame');
      panel.position.set(s * 0.315, 0.28, 0.02);
      const arm = tag(new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.045, 0.50), frameMat), 'frame');
      arm.position.set(s * 0.315, 0.60, 0.05);
      const stile = tag(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.62, 0.05), frameMat), 'frame');
      stile.position.set(s * 0.30, 0.72, -0.30);
      stile.rotation.x = -0.16;
      g.add(panel, arm, stile);
    });

    // Swivel base: column + 4 star legs + casters
    const steelMat = makeMaterial('metal', '#9DA3A8');
    const column = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.030, 0.038, 0.30, 24), steelMat), 'base');
    column.position.set(0, 0.16, 0.02);
    g.add(column);
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const dir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
      const leg = tag(
        cylinderBetween(
          dir.clone().multiplyScalar(0.06).setY(0.06),
          dir.clone().multiplyScalar(0.30).setY(0.012),
          0.022, steelMat
        ),
        'base'
      );
      const caster = tag(new THREE.Mesh(new THREE.SphereGeometry(0.026, 16, 12), steelMat), 'base');
      caster.position.copy(dir).multiplyScalar(0.31).setY(0.024);
      g.add(leg, caster);
    }
    return g;
  }

  /* ================= MUG — body | interior | handle ================= */
  function buildMug() {
    const g = new THREE.Group();

    // Body (slight taper)
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

    // Handle (C-shaped arc, gap facing the mug)
    const handle = tag(new THREE.Mesh(new THREE.TorusGeometry(0.20, 0.052, 18, 36, Math.PI * 1.3), makeMaterial('ceramic', '#D9C7B2')), 'handle');
    handle.position.set(0.47, 0.42, 0);
    handle.rotation.z = Math.PI * 1.4;
    g.add(handle);
    return g;
  }

  /* ================= BOTTLE — body | lid | bumper ================= */
  function buildBottle() {
    const g = new THREE.Group();

    const bodyMat = makeMaterial('metal', '#E8E9E4');
    const shell = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.295, 0.285, 0.95, 44), bodyMat), 'body');
    shell.position.y = 0.475;
    const dome = tag(new THREE.Mesh(new THREE.SphereGeometry(0.295, 44, 20, 0, Math.PI * 2, 0, Math.PI / 2), bodyMat), 'body');
    dome.position.y = 0.95;
    g.add(shell, dome);

    // Lid + carry loop
    const lidMat = makeMaterial('plastic', '#E8E9E4');
    const lid = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.26, 0.17, 36), lidMat), 'lid');
    lid.position.y = 1.03;
    const loop = tag(new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.02, 14, 30), lidMat), 'lid');
    loop.position.set(0.19, 1.115, 0);
    loop.rotation.x = Math.PI / 2;
    g.add(lid, loop);

    // Silicone bumper ring
    const bumperMat = makeMaterial('rubber', '#D8D8D4');
    const bumper = tag(new THREE.Mesh(new THREE.TorusGeometry(0.30, 0.032, 16, 44), bumperMat), 'bumper');
    bumper.rotation.x = Math.PI / 2;
    bumper.position.y = 0.07;
    g.add(bumper);
    return g;
  }

  /* ================= LAMP — shade | arm | base ================= */
  function buildLamp() {
    const g = new THREE.Group();

    // Weighted base plate (+ secondary top disk for two-tone marble)
    const baseMat = makeMaterial('wood', '#9A9C9E');
    const plate = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.36, 0.06, 44), baseMat), 'base');
    plate.position.y = 0.03;
    const plateTopMat = makeMaterial('wood', '#DADADA');
    const plateTop = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.30, 0.018, 44), plateTopMat), 'base', 'secondary');
    plateTop.position.y = 0.068;
    g.add(plate, plateTop);

    const armMat = makeMaterial('metal', '#3A3C40');
    const jointA = new THREE.Vector3(0, 0.07, -0.10);
    const jointB = new THREE.Vector3(0, 0.62, 0.02);   // elbow
    const jointC = new THREE.Vector3(0, 0.55, 0.34);   // wrist above the shade
    const lower = tag(cylinderBetween(jointA, jointB, 0.024, armMat), 'arm');
    const elbow = tag(new THREE.Mesh(new THREE.SphereGeometry(0.036, 18, 14), armMat), 'arm');
    elbow.position.copy(jointB);
    const upper = tag(cylinderBetween(jointB, jointC, 0.020, armMat), 'arm');
    const wrist = tag(new THREE.Mesh(new THREE.SphereGeometry(0.030, 18, 14), armMat), 'arm');
    wrist.position.copy(jointC);
    g.add(lower, elbow, upper, wrist);

    // Spun reflector shade (openEnded, DoubleSide) + emissive bulb
    const shadeMat = makeMaterial('metal', '#EFEDE6');
    shadeMat.side = THREE.DoubleSide;
    const shade = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.30, 0.27, 40, 1, true), shadeMat), 'shade');
    shade.position.set(0, 0.40, 0.36);
    shade.rotation.x = Math.PI * 0.92;
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 18, 14),
      new THREE.MeshStandardMaterial({ color: 0xFFE3B0, emissive: 0xFFC46B, emissiveIntensity: 1.4 })
    );
    bulb.position.set(0, 0.415, 0.355);
    g.add(shade, bulb);
    return g;
  }

  /* ================= HEADPHONES — cups | band | cushions ================= */
  function buildHeadphones() {
    const g = new THREE.Group();

    // Headband: half-torus arching over the top (xy-plane, +y up)
    const bandMat = makeMaterial('metal', '#3A3C40');
    const band = tag(new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.045, 20, 60, Math.PI), bandMat), 'band');
    band.position.y = 0.42;
    g.add(band);

    [-1, 1].forEach((s) => {
      // Slider / yoke connecting band end to cup top
      const yoke = tag(cylinderBetween(
        new THREE.Vector3(s * 0.52, 0.42, 0),
        new THREE.Vector3(s * 0.545, 0.40, 0),
        0.018, bandMat
      ), 'band');
      g.add(yoke);

      // Ear cup shell (axis along x) + outer trim ring
      const cupMat = makeMaterial('metal', '#2A2C30');
      const cup = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.225, 0.13, 36), cupMat), 'cups');
      cup.rotation.z = Math.PI / 2;
      cup.position.set(s * 0.545, 0.30, 0);
      const trim = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.02, 36), cupMat), 'cups');
      trim.rotation.z = Math.PI / 2;
      trim.position.set(s * (0.545 + 0.075), 0.30, 0);
      g.add(cup, trim);

      // Cushion pad on the inner face
      const cushMat = makeMaterial('leather', '#D9CFC0');
      const pad = tag(new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.055, 16, 36), cushMat), 'cushions');
      pad.rotation.y = Math.PI / 2;
      pad.position.set(s * 0.47, 0.30, 0);
      g.add(pad);
    });
    return g;
  }

  /* ================= CLOCK — face | ring | hands ================= */
  function buildClock() {
    const g = new THREE.Group();

    const ringMat = makeMaterial('wood', '#C89B6A');
    const faceMat = makeMaterial('plastic', '#F2EEE6');
    const handsMat = makeMaterial('metal', '#3A3C40');

    /* Clock head, raised on its stand (dial face on the xz→xy plane) */
    const head = new THREE.Group();
    head.position.y = 0.55;
    head.rotation.x = -0.05; // gentle desk-clock lean-back

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

    // Desk stand: rear post + foot plate
    const post = tag(cylinderBetween(
      new THREE.Vector3(0, 0.05, -0.17), new THREE.Vector3(0, 0.56, -0.07), 0.024, ringMat
    ), 'ring');
    const foot = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.115, 0.035, 32), ringMat), 'ring');
    foot.position.set(0, 0.0175, -0.18);
    g.add(post, foot);
    return g;
  }

  /* ================= VASE — body | lip | foot ================= */
  function buildVase() {
    const g = new THREE.Group();

    // Curved profile lathe (r, y), ceramic with visible inner wall
    const profile = [
      [0.001, 0.02], [0.14, 0.02], [0.19, 0.05], [0.225, 0.12], [0.23, 0.20],
      [0.195, 0.30], [0.13, 0.38], [0.10, 0.45], [0.10, 0.52], [0.125, 0.57], [0.15, 0.60],
    ].map((p) => new THREE.Vector2(p[0], p[1]));
    const bodyMat = makeMaterial('ceramic', '#D9C7B2');
    bodyMat.side = THREE.DoubleSide;
    const body = tag(new THREE.Mesh(new THREE.LatheGeometry(profile, 48), bodyMat), 'body');
    g.add(body);

    const lipMat = makeMaterial('ceramic', '#D9C7B2');
    const lip = tag(new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.02, 14, 44), lipMat), 'lip');
    lip.rotation.x = Math.PI / 2;
    lip.position.y = 0.60;
    g.add(lip);

    const foot = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.165, 0.04, 40), makeMaterial('ceramic', '#B08A6A')), 'foot');
    foot.position.y = 0.02;
    g.add(foot);
    return g;
  }

  /* ================= CANDLE — jar | wax | lid ================= */
  function buildCandle() {
    const g = new THREE.Group();

    // Glass vessel (transparent, no solid shadow)
    const jarMat = makeMaterial('glass', '#EAF2F0');
    jarMat.side = THREE.DoubleSide;
    const jar = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.25, 0.44, 40), jarMat), 'jar');
    jar.position.y = 0.24;
    jar.castShadow = false;
    g.add(jar);

    // Wax fill visible through the glass
    const wax = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.225, 0.21, 0.34, 36), makeMaterial('ceramic', '#F2EAD9')), 'wax');
    wax.position.y = 0.20;
    g.add(wax);

    // Wick + glow (fixed, not configurable)
    const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.008, 0.05, 8),
      new THREE.MeshStandardMaterial({ color: 0x2A2521, roughness: 1 }));
    wick.position.y = 0.395;
    const flame = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 14, 12),
      new THREE.MeshStandardMaterial({ color: 0xFFC46B, emissive: 0xFF9D2E, emissiveIntensity: 1.8 })
    );
    flame.scale.set(0.75, 1.7, 0.75);
    flame.position.y = 0.455;
    g.add(wick, flame);

    // Metal lid resting beside the jar
    const lidMat = makeMaterial('metal', '#C9A86A');
    const lid = tag(new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.05, 36), lidMat), 'lid');
    lid.position.set(0.46, 0.05, 0.10);
    const knob = tag(new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 12), lidMat), 'lid');
    knob.position.set(0.46, 0.095, 0.10);
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
