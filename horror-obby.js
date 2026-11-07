(function () {
  const SPEED = 6.6;
  const GRAVITY = 24;
  const JUMP = 8.6;

  const CHARACTER_LENGTH = 1.6;
  let campRadius = CHARACTER_LENGTH * 5;
  const THROW_RANGE = CHARACTER_LENGTH * 5;
  const CAMP_X = 0;
  const CAMP_Z = -11;
  const FOREST_RADIUS = 78;
  const DAY_SECONDS = 120;
  const NIGHT_SECONDS = 60;
  const TREE_CLEAR = 28;
  const HERD_SIZE = 4;
  const HUNGER_SECONDS = 45;
  const HOTBAR_MAX = 8;

  const PADS = [
    { x: 0, z: 0, y: 0, w: 8, d: 8, h: 0.7, color: 0x7dce6a },
    { x: 0, z: -9, y: 0.45, w: 5.2, d: 5, h: 0.7, color: 0x8ed96f, sheep: 0 },
    { x: 1.1, z: -15.4, y: 0.85, w: 4.4, d: 4.4, h: 0.7, color: 0x6fbf78 },
    { x: -0.6, z: -26.4, y: 1.4, w: 4.8, d: 4.8, h: 0.7, color: 0x9be07a, sheep: 1 },
    { x: 0.5, z: -32.6, y: 1.55, w: 4.6, d: 4.6, h: 0.7, color: 0x74c48a, sheep: 2 },
    { x: 0, z: -37.4, y: 1.7, w: 7, d: 6.2, h: 0.7, color: 0x88d48b, finish: true }
  ];

  const keys = {};
  const joy = { x: 0, y: 0, active: false };
  let renderer;
  let scene;
  let camera;
  let clock;
  let player;
  let sheepMeshes = [];
  let meadow;
  let forest;
  let trees = [];
  let cloud;
  let cloudPad;
  let portal;
  let running = false;
  let world = "meadow";
  let yaw = 0;
  let pitch = 0.42;
  let vy = 0;
  let grounded = false;
  let ridingCloud = false;
  let jumpQueued = false;
  let lookPointer = null;
  let finished = false;
  let palette;
  let lastPad = null;
  let forestReady = false;

  let campGroup = null;
  let campLight = null;
  let flameMeshes = [];
  let ringDots = [];
  let campGlow = 0;
  let campWash = null;
  let skyMat = null;
  let forestClock = 0;
  let nightBlend = 0;
  let wolf = null;
  let wolfMode = "walk";
  let wolfAngle = 0.4;
  let wolfLost = 0;
  let wolfChaseTime = 0;
  let caught = false;
  let catchTime = 0;
  let catchYaw = 0;
  let catchFace = 0;
  let catchLine = "";
  let nightIntroPlayed = false;
  let nightIntro = null;
  let forestTutorial = null;
  const camPos = new THREE.Vector3();
  const camLook = new THREE.Vector3();
  const shotPos = new THREE.Vector3();
  const shotLook = new THREE.Vector3();
  const tutorialLook = new THREE.Vector3();
  const catchFrom = new THREE.Vector3();
  const catchCamFrom = new THREE.Vector3();
  const catchLookFrom = new THREE.Vector3();
  const catchEye = new THREE.Vector3();
  const catchLook = new THREE.Vector3();
  let axe = null;
  let axeMode = "held";
  let axeT = 0;
  let axeSpin = 0;
  let axeAim = null;
  let axeSheep = null;
  const axeFrom = new THREE.Vector3();
  const axeTo = new THREE.Vector3();
  const axeFlight = new THREE.Vector3();
  let carry = null;
  let logsBurned = 0;
  let walkPhase = 0;
  let slipGap = 3;
  let slipLeft = 0;
  let nearPickup = null;
  let nearBurn = null;
  let forestSheep = [];
  let sheepNight = false;
  let hunger = 10;
  let hungerTick = 0;
  let hotbar = [];
  let clickX = 0;
  let clickY = 0;
  let clickAt = 0;
  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2();
  const CAUGHT_LINES = [
    "Run faster next time lolz",
    "I can tell you always come last in the school race 😂",
    "Tip: Git Gud"
  ];
  const forestSky = new THREE.Color(0x243038);
  const daySky = new THREE.Color(0x8ec6ea);
  const nightSky = new THREE.Color(0x141c24);
  const campSky = new THREE.Color(0xfff1d4);
  const skyLerp = new THREE.Color();

  function start(kind, colors) {
    if (running || !window.THREE) return;
    running = true;
    palette = colors || { skin: "#f3c39a", hair: "#6b3e26", shirt: "#6eb6ff", pants: "#3f5ea8", shoe: "#f7f7f7" };
    const canvas = document.getElementById("view");
    canvas.hidden = false;
    document.getElementById("game-hud").hidden = false;
    document.body.classList.remove("in-forest");
    setHint("Drag to look. Move with WASD, arrows, or the joystick.");
    setSheepCount(0);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 280);
    clock = new THREE.Clock();
    const ambient = new THREE.AmbientLight(0xfff4dd, 0.65);
    ambient.name = "ambient";
    scene.add(ambient);
    const hemi = new THREE.HemisphereLight(0xcfefff, 0x7dce6a, 0.7);
    hemi.name = "hemi";
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff1c9, 1.05);
    sun.position.set(12, 24, 8);
    sun.name = "sun";
    scene.add(sun);

    meadow = new THREE.Group();
    forest = new THREE.Group();
    scene.add(meadow);
    scene.add(forest);
    forest.visible = false;
    buildMeadow();
    buildForest();
    player = makeKid(palette);
    player.position.set(0, PADS[0].y + PADS[0].h, 0);
    scene.add(player);
    bindInput();
    window.addEventListener("resize", onResize);
    renderer.setAnimationLoop(animate);
  }

  function setHint(text) {
    document.getElementById("game-hint").textContent = text;
  }

  function setSheepCount(n) {
    const el = document.getElementById("sheep-count");
    el.hidden = world === "forest";
    el.textContent = "Sheep following: " + n;
  }

  function buildMeadow() {
    scene.background = new THREE.Color(0x9ad7ff);
    scene.fog = new THREE.Fog(0xc7ecff, 28, 78);
    const sunBall = new THREE.Mesh(
      new THREE.SphereGeometry(2.2, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xffe56a })
    );
    sunBall.position.set(16, 18, -10);
    meadow.add(sunBall);
    for (let i = 0; i < 4; i += 1) {
      const puff = new THREE.Mesh(
        new THREE.SphereGeometry(1.4 + (i % 2) * 0.4, 10, 8),
        new THREE.MeshLambertMaterial({ color: 0xffffff })
      );
      puff.position.set(-14 + i * 9, 11 + (i % 3), -8 - i * 6);
      meadow.add(puff);
    }
    PADS.forEach(function (pad, index) {
      meadow.add(makePad(pad));
      sprinkleFlowers(meadow, pad, index);
    });
    cloudPad = { x: 0, y: 1.15, z: -20.8, w: 3.3, d: 3.1, h: 0.45, moving: true };
    cloud = makeCloud();
    meadow.add(cloud);
    portal = new THREE.Mesh(
      new THREE.TorusGeometry(1.55, 0.13, 10, 28),
      new THREE.MeshStandardMaterial({ color: 0xfff3c4, emissive: 0xffc14d, emissiveIntensity: 0.85 })
    );
    const finish = PADS[PADS.length - 1];
    portal.position.set(finish.x, finish.y + finish.h + 1.7, finish.z);
    meadow.add(portal);
    sheepMeshes = [0, 1, 2].map(function (i) {
      const home = PADS.filter(function (pad) { return pad.sheep === i; })[0];
      const mesh = makeSheep(i);
      mesh.position.set(home.x, home.y + home.h, home.z + 0.4);
      mesh.userData = { joined: false, home: home, index: i };
      meadow.add(mesh);
      return mesh;
    });
  }

  function makePad(pad) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(pad.w, pad.h, pad.d),
      new THREE.MeshLambertMaterial({ color: pad.color })
    );
    mesh.position.set(pad.x, pad.y + pad.h / 2, pad.z);
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(pad.w * 0.92, 0.08, pad.d * 0.92),
      new THREE.MeshLambertMaterial({ color: 0xb6f0a4 })
    );
    top.position.y = pad.h / 2 + 0.02;
    mesh.add(top);
    return mesh;
  }

  function sprinkleFlowers(group, pad, index) {
    const colors = [0xff8fab, 0xffd166, 0xffffff, 0xc8b6ff];
    for (let n = 0; n < 4; n += 1) {
      const flower = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 6, 6),
        new THREE.MeshLambertMaterial({ color: colors[(index + n) % colors.length] })
      );
      flower.position.set(
        pad.x + ((n % 2) - 0.5) * pad.w * 0.55,
        pad.y + pad.h + 0.12,
        pad.z + (n < 2 ? -1 : 1) * pad.d * 0.28
      );
      group.add(flower);
    }
  }

  function makeCloud() {
    const group = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: 0xfffdf8 });
    [-0.6, 0.2, 0.7].forEach(function (x, i) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.7 - i * 0.08, 10, 8), mat);
      puff.position.set(x, 0.3, 0);
      group.add(puff);
    });
    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(cloudPad.w, 0.28, cloudPad.d),
      new THREE.MeshLambertMaterial({ color: 0xfff6ea })
    );
    deck.position.y = 0.15;
    group.add(deck);
    return group;
  }

  function buildForest() {
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(FOREST_RADIUS, 48),
      new THREE.MeshLambertMaterial({ color: 0x3d4c38 })
    );
    ground.rotation.x = -Math.PI / 2;
    forest.add(ground);
    plantTrees();
    skyMat = new THREE.MeshBasicMaterial({ color: forestSky.clone(), side: THREE.BackSide, fog: false });
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(FOREST_RADIUS + 40, 20, 12),
      skyMat
    );
    forest.add(sky);
    buildCampfire();
    wolf = makeWolf();
    campWash = document.createElement("div");
    campWash.style.cssText = "position:fixed;inset:0;z-index:5;pointer-events:none;background:#fff4dc;opacity:0;";
    document.body.appendChild(campWash);
  }

  function plantTrees() {
    const minDist = 4.15;
    const attempts = 4600;
    for (let i = 0; i < attempts; i += 1) {
      const t = (i + 0.5) / attempts;
      const radius = 4 + Math.sqrt(t) * (FOREST_RADIUS - 6.2);
      const angle = i * 2.399963;
      const x = Math.cos(angle) * radius + Math.sin(i * 3.1) * 0.85;
      const z = Math.sin(angle) * radius + Math.cos(i * 2.7) * 0.85;
      if (Math.hypot(x, z) > FOREST_RADIUS - 2.2) continue;
      if (Math.hypot(x - CAMP_X, z - CAMP_Z) < TREE_CLEAR) continue;
      let blocked = false;
      for (let j = 0; j < trees.length; j += 1) {
        if (Math.hypot(x - trees[j].x, z - trees[j].z) < minDist) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;
      const tree = makeDeadTree(i);
      const scale = 0.8 + (i % 6) * 0.1;
      tree.scale.setScalar(scale);
      tree.position.set(x, 0, z);
      forest.add(tree);
      trees.push({
        x: x,
        z: z,
        r: 0.72 * scale,
        mesh: tree,
        felled: false,
        fall: 0,
        fallSign: 1,
        settled: false,
        carried: false,
        burned: false,
        atFire: false,
        pickupLock: 0
      });
      if (trees.length >= 900) break;
    }
  }

  function buildCampfire() {
    campGroup = new THREE.Group();
    campGroup.position.set(CAMP_X, 0, CAMP_Z);
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x736b60 });
    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * Math.PI * 2;
      const stone = new THREE.Mesh(
        new THREE.SphereGeometry(0.16 + (i % 2) * 0.05, 7, 6),
        stoneMat
      );
      stone.scale.y = 0.65;
      stone.position.set(Math.cos(angle) * 0.58, 0.1, Math.sin(angle) * 0.58);
      campGroup.add(stone);
    }
    const logMat = new THREE.MeshLambertMaterial({ color: 0x6a4630 });
    [-0.55, 0.55].forEach(function (yaw, i) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.2, 6), logMat);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = yaw;
      log.position.y = 0.18 + i * 0.04;
      campGroup.add(log);
    });
    [0xfff3b0, 0xffb03a, 0xff6a1a].forEach(function (color, i) {
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.18 - i * 0.035, 0.62 - i * 0.1, 7),
        new THREE.MeshBasicMaterial({ color: color, fog: false })
      );
      flame.position.y = 0.48 + i * 0.05;
      flame.userData.baseY = flame.position.y;
      campGroup.add(flame);
      flameMeshes.push(flame);
    });
    campLight = new THREE.PointLight(0xff9a3c, 1.6, 8, 2);
    campLight.position.y = 0.8;
    campGroup.add(campLight);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xffe7b0, fog: false });
    const dots = 40;
    for (let i = 0; i < dots; i += 1) {
      const angle = (i / dots) * Math.PI * 2;
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 5), dotMat);
      dot.position.set(Math.cos(angle) * campRadius, 0.16, Math.sin(angle) * campRadius);
      campGroup.add(dot);
      ringDots.push(dot);
    }
    forest.add(campGroup);
    axe = makeAxe();
  }

  function makeAxe() {
    const group = new THREE.Group();
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.045, 0.62, 6),
      new THREE.MeshLambertMaterial({ color: 0x8a5a32 })
    );
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.12, 0.05),
      new THREE.MeshLambertMaterial({ color: 0xd5dbe3 })
    );
    blade.position.y = 0.28;
    group.add(handle);
    group.add(blade);
    group.visible = false;
    forest.add(group);
    return group;
  }

  function holdAxe() {
    if (!axe || !player) return;
    axeMode = "held";
    axeAim = null;
    axeSheep = null;
    axe.visible = true;
    const hand = player.userData.limbs && player.userData.limbs.rightArm;
    const holder = hand || player;
    if (axe.parent !== holder) holder.add(axe);
    if (hand) {
      axe.position.set(0.02, -0.34, 0.08);
      axe.rotation.set(0.4, 0, 0.35);
    } else {
      axe.position.set(0.34, 0.92, 0.18);
      axe.rotation.set(0.35, 0.2, 0.9);
    }
  }

  function throwAxe(tree) {
    axeMode = "out";
    axeT = 0;
    axeAim = tree;
    axeSheep = null;
    axeSpin = 0;
    if (axe.parent) axe.parent.remove(axe);
    forest.add(axe);
    axeFrom.set(player.position.x, player.position.y + 1.05, player.position.z);
    const dx = tree.x - player.position.x;
    const dz = tree.z - player.position.z;
    const len = Math.hypot(dx, dz) || 1;
    axeTo.set(
      player.position.x + (dx / len) * THROW_RANGE,
      0.85,
      player.position.z + (dz / len) * THROW_RANGE
    );
    axe.position.copy(axeFrom);
  }

  function fellTree(tree) {
    if (!tree || tree.felled) return;
    tree.felled = true;
    tree.fall = 0;
    tree.settled = false;
    tree.fallSign = tree.x >= player.position.x ? 1 : -1;
  }

  function updateFalls(dt) {
    trees.forEach(function (tree) {
      if (!tree.felled || tree.settled || tree.carried) return;
      tree.fall = Math.min(1, tree.fall + dt * 1.7);
      const tipped = tree.fall * tree.fall * (3 - 2 * tree.fall);
      tree.mesh.rotation.z = tipped * (Math.PI / 2) * tree.fallSign;
      if (tree.fall >= 1) tree.settled = true;
    });
  }

  function updateAxe(dt) {
    if (!axe || axeMode === "held") return;
    axeT += dt / 0.62;
    axeSpin += dt * 18;
    const outbound = axeMode === "out";
    const t = Math.min(1, axeT);
    const from = outbound ? axeFrom : axeTo;
    const handY = player.position.y + 1.05;
    if (!outbound) axeFlight.set(player.position.x, handY, player.position.z);
    const to = outbound ? axeTo : axeFlight;
    if (outbound && axeSheep && axeSheep.alive) {
      axeTo.set(axeSheep.x, 0.7, axeSheep.z);
    }
    axe.position.lerpVectors(from, to, t);
    axe.position.y += Math.sin(t * Math.PI) * 1.45;
    axe.rotation.z = axeSpin;
    axe.rotation.x = axeSpin * 0.65;
    if (outbound && axeSheep) {
      if (axeSheep.alive && Math.hypot(axe.position.x - axeSheep.x, axe.position.z - axeSheep.z) < 1.15) {
        butcherSheep(axeSheep);
      }
    } else if (outbound) {
      trees.forEach(function (tree) {
        if (tree.felled) return;
        if (Math.hypot(axe.position.x - tree.x, axe.position.z - tree.z) < tree.r + 0.4) fellTree(tree);
      });
    }
    if (t < 1) return;
    if (outbound) {
      axeMode = "back";
      axeT = 0;
      return;
    }
    holdAxe();
  }

  function treeFromObject(object) {
    let node = object;
    while (node) {
      for (let i = 0; i < trees.length; i += 1) {
        if (trees[i].mesh === node) return trees[i];
      }
      node = node.parent;
    }
    return null;
  }

  function throwAxeAtSheep(sheep) {
    axeMode = "out";
    axeT = 0;
    axeAim = null;
    axeSheep = sheep;
    axeSpin = 0;
    if (axe.parent) axe.parent.remove(axe);
    forest.add(axe);
    axeFrom.set(player.position.x, player.position.y + 1.05, player.position.z);
    axeTo.set(sheep.x, 0.7, sheep.z);
    axe.position.copy(axeFrom);
  }

  function tryThrow(clientX, clientY) {
    if (world !== "forest" || !forestReady || caught || nightIntro || forestTutorial || carry || axeMode !== "held") return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointerNdc, camera);
    const meshes = [];
    trees.forEach(function (tree) { meshes.push(tree.mesh); });
    forestSheep.forEach(function (sheep) {
      if (sheep.alive && sheep.mesh.visible) meshes.push(sheep.mesh);
    });
    const hits = raycaster.intersectObjects(meshes, true);
    for (let i = 0; i < hits.length; i += 1) {
      const sheep = sheepFromObject(hits[i].object);
      if (sheep) {
        if (!sheep.alive || !sheep.mesh.visible) continue;
        const sheepDist = Math.hypot(player.position.x - sheep.x, player.position.z - sheep.z);
        if (sheepDist > THROW_RANGE) continue;
        if (hotbar.length >= HOTBAR_MAX) return;
        throwAxeAtSheep(sheep);
        return;
      }
      const tree = treeFromObject(hits[i].object);
      if (!tree || tree.felled || tree.burned) continue;
      const dist = Math.hypot(player.position.x - tree.x, player.position.z - tree.z);
      if (dist > THROW_RANGE) continue;
      throwAxe(tree);
      return;
    }
  }

  function sheepFromObject(object) {
    let node = object;
    while (node) {
      if (node.userData && node.userData.sheepRef) return node.userData.sheepRef;
      node = node.parent;
    }
    return null;
  }

  function renderHunger() {
    const bar = document.getElementById("hunger-bar");
    if (!bar) return;
    if (bar.children.length !== 10) {
      bar.textContent = "";
      for (let i = 0; i < 10; i += 1) bar.appendChild(document.createElement("i"));
    }
    for (let i = 0; i < 10; i += 1) {
      bar.children[i].className = i < hunger ? "on" : "";
    }
  }

  function renderHotbar() {
    const bar = document.getElementById("hotbar");
    if (!bar) return;
    bar.innerHTML = hotbar.map(function (item, index) {
      const yummy = item.kind === "yummy";
      const name = yummy ? "Yummy mutton strip" : "Raw mutton strip";
      return '<button class="food ' + (yummy ? "yummy" : "raw") + '" type="button" data-food="' + index + '"><i></i><b>' + name + "</b></button>";
    }).join("");
  }

  function eatFood(index) {
    if (forestTutorial) return;
    const item = hotbar[index];
    if (!item) return;
    hunger = Math.min(10, hunger + (item.kind === "yummy" ? 4 : 1));
    hotbar.splice(index, 1);
    renderHunger();
    renderHotbar();
  }

  function cookCarriedMutton() {
    if (campDistance(player.position.x, player.position.z) > campRadius) return;
    let cooked = false;
    hotbar.forEach(function (item) {
      if (item.kind !== "raw") return;
      item.kind = "yummy";
      cooked = true;
    });
    if (cooked) renderHotbar();
  }

  function giveRawMutton() {
    if (hotbar.length >= HOTBAR_MAX) return false;
    hotbar.push({ kind: "raw" });
    renderHotbar();
    return true;
  }

  function butcherSheep(sheep) {
    if (!sheep || !sheep.alive) return;
    if (!giveRawMutton()) return;
    sheep.alive = false;
    sheep.mesh.visible = false;
    if (axeSheep === sheep) axeSheep = null;
  }

  function herdBand() {
    const outer = TREE_CLEAR - 2.5;
    const desired = campRadius + THROW_RANGE + 1.2;
    const inner = Math.min(desired, outer - 3);
    return { inner: inner, outer: outer };
  }

  function findSheepSpot() {
    const band = herdBand();
    for (let i = 0; i < 16; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const dist = band.inner + Math.random() * (band.outer - band.inner);
      const x = CAMP_X + Math.cos(angle) * dist;
      const z = CAMP_Z + Math.sin(angle) * dist;
      if (Math.hypot(x - player.position.x, z - player.position.z) < 4) continue;
      let crowded = false;
      for (let s = 0; s < forestSheep.length; s += 1) {
        const other = forestSheep[s];
        if (!other.alive) continue;
        if (Math.hypot(x - other.x, z - other.z) < 2.4) crowded = true;
      }
      if (!crowded) return { x: x, z: z };
    }
    return { x: CAMP_X + band.inner, z: CAMP_Z };
  }

  function pickSheepTarget(sheep) {
    const spot = findSheepSpot();
    const roam = sheep.mesh.userData.roam;
    roam.tx = spot.x;
    roam.tz = spot.z;
    roam.wait = 0.4 + Math.random() * 1.2;
  }

  function spawnForestSheep() {
    const spot = findSheepSpot();
    const mesh = makeSheep(forestSheep.length % 3);
    mesh.scale.setScalar(1.2);
    mesh.position.set(spot.x, 0, spot.z);
    mesh.userData.roam = { tx: spot.x, tz: spot.z, wait: 0 };
    const sheep = { mesh: mesh, alive: true, x: spot.x, z: spot.z };
    mesh.userData.sheepRef = sheep;
    forest.add(mesh);
    forestSheep.push(sheep);
    pickSheepTarget(sheep);
  }

  function refillHerd() {
    forestSheep.forEach(function (sheep) {
      if (sheep.alive) return;
      const spot = findSheepSpot();
      sheep.alive = true;
      sheep.x = spot.x;
      sheep.z = spot.z;
      sheep.mesh.position.set(spot.x, 0, spot.z);
      sheep.mesh.visible = true;
      pickSheepTarget(sheep);
    });
    while (forestSheep.filter(function (sheep) { return sheep.alive; }).length < HERD_SIZE) {
      spawnForestSheep();
    }
  }

  function keepSheepInClearing(sheep) {
    const band = herdBand();
    const dx = sheep.x - CAMP_X;
    const dz = sheep.z - CAMP_Z;
    const dist = Math.hypot(dx, dz) || 0.001;
    if (dist < band.inner) {
      sheep.x = CAMP_X + (dx / dist) * band.inner;
      sheep.z = CAMP_Z + (dz / dist) * band.inner;
    } else if (dist > band.outer) {
      sheep.x = CAMP_X + (dx / dist) * band.outer;
      sheep.z = CAMP_Z + (dz / dist) * band.outer;
    }
  }

  function updateForestSheep(dt, hide) {
    if (hide) {
      if (!sheepNight) sheepNight = true;
      forestSheep.forEach(function (sheep) { sheep.mesh.visible = false; });
      return;
    }
    if (sheepNight) {
      sheepNight = false;
      refillHerd();
    }
    forestSheep.forEach(function (sheep) {
      if (!sheep.alive) {
        sheep.mesh.visible = false;
        return;
      }
      sheep.mesh.visible = true;
      const roam = sheep.mesh.userData.roam;
      const dx = roam.tx - sheep.x;
      const dz = roam.tz - sheep.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.55) {
        roam.wait -= dt;
        if (roam.wait <= 0) pickSheepTarget(sheep);
      } else {
        const step = Math.min(dist, 1.5 * dt);
        sheep.x += (dx / dist) * step;
        sheep.z += (dz / dist) * step;
      }
      keepSheepInClearing(sheep);
      sheep.mesh.position.set(sheep.x, Math.abs(Math.sin(roam.tx + performance.now() * 0.006)) * 0.04, sheep.z);
      if (dist >= 0.55) sheep.mesh.rotation.y = Math.atan2(dx, dz);
    });
  }

  function updateHunger(dt) {
    if (caught || nightIntro) return;
    hungerTick += dt;
    let changed = false;
    while (hungerTick >= HUNGER_SECONDS) {
      hungerTick -= HUNGER_SECONDS;
      if (hunger > 0) {
        hunger -= 1;
        changed = true;
      }
    }
    if (changed) renderHunger();
    cookCarriedMutton();
  }

  function hideSlip() {
    const slip = document.getElementById("slip-btn");
    if (slip) slip.hidden = true;
  }

  function showSlip() {
    const btn = document.getElementById("slip-btn");
    if (forestTutorial) {
      btn.style.left = "18px";
      btn.style.top = "52px";
      btn.style.transform = "";
    } else {
      const w = window.innerWidth;
      const h = window.innerHeight;
      btn.style.left = (20 + Math.random() * Math.max(40, w - 140)) + "px";
      btn.style.top = (20 + Math.random() * Math.max(40, h - 180)) + "px";
      btn.style.transform = "";
    }
    btn.hidden = false;
  }

  function dropLog(atFire) {
    if (!carry) return;
    const log = carry;
    log.carried = false;
    carry = null;
    hideSlip();
    slipLeft = 0;
    slipGap = 2 + Math.random() * 2;
    if (atFire) {
      const fx = Math.sin(player.rotation.y);
      const fz = Math.cos(player.rotation.y);
      let x = player.position.x + fx * 1.15;
      let z = player.position.z + fz * 1.15;
      const dx = x - CAMP_X;
      const dz = z - CAMP_Z;
      const dist = Math.hypot(dx, dz) || 1;
      const limit = Math.max(1.3, campRadius - 0.8);
      if (dist > limit) {
        x = CAMP_X + (dx / dist) * limit;
        z = CAMP_Z + (dz / dist) * limit;
      }
      log.x = x;
      log.z = z;
      log.atFire = true;
      log.pickupLock = 0;
    } else {
      log.x = player.position.x + Math.sin(player.rotation.y) * 0.8;
      log.z = player.position.z + Math.cos(player.rotation.y) * 0.8;
      log.atFire = false;
      log.pickupLock = 2;
    }
    log.mesh.position.set(log.x, 0.15, log.z);
    log.mesh.rotation.set(0, 0, (Math.PI / 2) * log.fallSign);
    log.settled = true;
  }

  function startCarry(tree) {
    if (carry || !tree || !tree.felled || !tree.settled || tree.atFire || tree.burned || tree.pickupLock > 0) return;
    carry = tree;
    tree.carried = true;
    slipGap = 2 + Math.random() * 2;
    slipLeft = 0;
    hideSlip();
    document.getElementById("pickup-btn").hidden = true;
  }

  function burnLog(tree) {
    if (!tree || !tree.atFire || tree.burned) return;
    tree.burned = true;
    tree.mesh.visible = false;
    logsBurned += 1;
    if (logsBurned % 3 === 0) {
      campRadius *= 1.25;
      ringDots.forEach(function (dot, index) {
        const angle = (index / ringDots.length) * Math.PI * 2;
        dot.position.set(Math.cos(angle) * campRadius, 0.16, Math.sin(angle) * campRadius);
      });
      if (campLight) campLight.distance = 6 + campRadius * 0.35;
    }
    document.getElementById("burn-btn").hidden = true;
    nearBurn = null;
  }

  function updateCarryWalk(dt) {
    const dx = CAMP_X - player.position.x;
    const dz = CAMP_Z - player.position.z;
    const dist = Math.hypot(dx, dz) || 1;
    player.position.x += (dx / dist) * 1.1 * dt;
    player.position.z += (dz / dist) * 1.1 * dt;
    player.position.y = 0;
    vy = 0;
    player.rotation.y = Math.atan2(dx, dz);
    pushOutOfTrees();
    clampForestEdge();
    const face = player.rotation.y;
    carry.mesh.position.set(
      player.position.x + Math.sin(face) * 0.38,
      player.position.y + 0.82,
      player.position.z + Math.cos(face) * 0.38
    );
    carry.mesh.rotation.order = "YXZ";
    carry.mesh.rotation.set(0, face, Math.PI / 2);
    updateLimbs(dt, true);
    if (slipLeft > 0) {
      slipLeft -= dt;
      if (slipLeft <= 0) dropLog(false);
    } else {
      slipGap -= dt;
      if (slipGap <= 0) {
        showSlip();
        slipLeft = 3;
      }
    }
    if (carry && campDistance(player.position.x, player.position.z) <= campRadius) dropLog(true);
  }

  function updateWoodButtons(dt) {
    trees.forEach(function (tree) {
      if (tree.pickupLock > 0) tree.pickupLock = Math.max(0, tree.pickupLock - dt);
    });
    const pickupBtn = document.getElementById("pickup-btn");
    const burnBtn = document.getElementById("burn-btn");
    nearPickup = null;
    nearBurn = null;
    if (carry || caught || world !== "forest") {
      pickupBtn.hidden = true;
      burnBtn.hidden = true;
      return;
    }
    let bestPick = 2.5;
    let bestBurn = 2.5;
    trees.forEach(function (tree) {
      if (!tree.felled || !tree.settled || tree.burned || tree.carried) return;
      const dist = Math.hypot(player.position.x - tree.x, player.position.z - tree.z);
      if (tree.atFire && dist < bestBurn) {
        bestBurn = dist;
        nearBurn = tree;
      } else if (!tree.atFire && tree.pickupLock <= 0 && dist < bestPick) {
        bestPick = dist;
        nearPickup = tree;
      }
    });
    burnBtn.hidden = !nearBurn;
    pickupBtn.hidden = !!nearBurn || !nearPickup;
  }

  function makeLimb(color, width, height, depth) {
    const pivot = new THREE.Group();
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      new THREE.MeshLambertMaterial({ color: color })
    );
    mesh.position.y = -height / 2;
    pivot.add(mesh);
    return pivot;
  }

  function makeWolf() {
    const group = new THREE.Group();
    const fur = new THREE.MeshLambertMaterial({ color: 0x3a3336 });
    const dark = new THREE.MeshLambertMaterial({ color: 0x2a2426 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.05, 0.46), fur);
    body.position.y = 1.7;
    group.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.46, 0.46), fur);
    head.position.y = 2.5;
    group.add(head);
    const mouth = new THREE.Group();
    mouth.position.set(0, 2.18, 0.3);
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.07, 0.24), dark);
    upper.position.set(0, 0.04, 0.06);
    mouth.add(upper);
    const cavity = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.1, 0.1),
      new THREE.MeshBasicMaterial({ color: 0x14080c })
    );
    cavity.position.set(0, -0.02, 0.08);
    mouth.add(cavity);
    const jaw = new THREE.Group();
    jaw.position.set(0, -0.01, -0.04);
    const lower = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 0.22), dark);
    lower.position.set(0, -0.04, 0.12);
    jaw.add(lower);
    const toothMat = new THREE.MeshLambertMaterial({ color: 0xf3eee4 });
    [-0.08, 0, 0.08].forEach(function (x) {
      const upperTooth = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.035, 0.025), toothMat);
      upperTooth.position.set(x, -0.01, 0.14);
      upper.add(upperTooth);
      const lowerTooth = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.025), toothMat);
      lowerTooth.position.set(x, -0.01, 0.2);
      jaw.add(lowerTooth);
    });
    mouth.add(jaw);
    group.add(mouth);
    const faceLight = new THREE.PointLight(0xffd2a8, 0, 8, 2);
    faceLight.position.set(0, 2.35, 1.4);
    group.add(faceLight);
    group.userData.jaw = jaw;
    group.userData.faceLight = faceLight;
    const earMat = new THREE.MeshLambertMaterial({ color: 0x2c2628 });
    [-0.16, 0.16].forEach(function (x) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 4), earMat);
      ear.position.set(x, 2.82, 0);
      group.add(ear);
    });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff3a22, fog: false });
    [-0.12, 0.12].forEach(function (x) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), eyeMat);
      eye.position.set(x, 2.56, 0.26);
      group.add(eye);
    });
    const leftArm = makeLimb(0x332c2e, 0.16, 0.85, 0.16);
    const rightArm = makeLimb(0x332c2e, 0.16, 0.85, 0.16);
    leftArm.position.set(-0.46, 2.05, 0);
    rightArm.position.set(0.46, 2.05, 0);
    group.add(leftArm);
    group.add(rightArm);
    const leftLeg = makeLimb(0x2e282a, 0.2, 1.05, 0.2);
    const rightLeg = makeLimb(0x2e282a, 0.2, 1.05, 0.2);
    leftLeg.position.set(-0.18, 1.15, 0);
    rightLeg.position.set(0.18, 1.15, 0);
    group.add(leftLeg);
    group.add(rightLeg);
    group.userData.limbs = { leftArm: leftArm, rightArm: rightArm, leftLeg: leftLeg, rightLeg: rightLeg };
    group.scale.setScalar(1.7);
    group.visible = false;
    forest.add(group);
    return group;
  }

  function makeDeadTree(index) {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.32, 3.4, 6),
      new THREE.MeshLambertMaterial({ color: index % 2 ? 0x6e5344 : 0x5a4638 })
    );
    trunk.position.y = 1.7;
    group.add(trunk);
    if (index % 3 !== 0) {
      const cap = new THREE.Mesh(
        new THREE.ConeGeometry(1.15, 2.1, 7),
        new THREE.MeshLambertMaterial({ color: 0x2c4634 })
      );
      cap.position.y = 3.5;
      group.add(cap);
    }
    return group;
  }

  function makeKid(colors) {
    const group = new THREE.Group();
    const skin = new THREE.MeshLambertMaterial({ color: colors.skin });
    const shirt = new THREE.MeshLambertMaterial({ color: colors.shirt });
    const pants = new THREE.MeshLambertMaterial({ color: colors.pants });
    const shoes = new THREE.MeshLambertMaterial({ color: colors.shoe });
    const hair = new THREE.MeshLambertMaterial({ color: colors.hair });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.48, 0.28), shirt);
    body.position.y = 0.92;
    group.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), skin);
    head.position.y = 1.38;
    group.add(head);
    const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), hair);
    hairCap.position.y = 1.4;
    group.add(hairCap);
    const leftArm = makeLimb(colors.skin, 0.1, 0.42, 0.1);
    const rightArm = makeLimb(colors.skin, 0.1, 0.42, 0.1);
    leftArm.position.set(-0.3, 1.08, 0);
    rightArm.position.set(0.3, 1.08, 0);
    group.add(leftArm);
    group.add(rightArm);
    const leftLeg = makeLimb(colors.pants, 0.13, 0.36, 0.13);
    const rightLeg = makeLimb(colors.pants, 0.13, 0.36, 0.13);
    leftLeg.position.set(-0.12, 0.62, 0);
    rightLeg.position.set(0.12, 0.62, 0);
    [leftLeg, rightLeg].forEach(function (leg) {
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.09, 0.22), shoes);
      shoe.position.set(0, -0.4, 0.04);
      leg.add(shoe);
    });
    group.add(leftLeg);
    group.add(rightLeg);
    group.userData.limbs = {
      leftArm: leftArm,
      rightArm: rightArm,
      leftLeg: leftLeg,
      rightLeg: rightLeg
    };
    if (colors.star) {
      const star = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.08),
        new THREE.MeshLambertMaterial({ color: 0xfff4b0 })
      );
      star.position.set(0, 0.96, 0.15);
      group.add(star);
    }
    if (colors.glasses) {
      [-0.1, 0.1].forEach(function (x) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.07, 0.012, 6, 10),
          new THREE.MeshBasicMaterial({ color: 0x243044 })
        );
        ring.position.set(x, 1.4, 0.2);
        group.add(ring);
      });
    }
    return group;
  }

  function makeSheep(index) {
    const group = new THREE.Group();
    const woolColors = [0xfffdf8, 0xfff0d2, 0xf3f7ff];
    const wool = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 12, 10),
      new THREE.MeshLambertMaterial({ color: woolColors[index] })
    );
    wool.position.y = 0.55;
    group.add(wool);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 10, 8),
      new THREE.MeshLambertMaterial({ color: 0xf0d2b4 })
    );
    head.position.set(0, 0.62, 0.38);
    group.add(head);
    group.userData.head = head;
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x241c16 });
    [-0.07, 0.07].forEach(function (x) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), eyeMat);
      eye.position.set(x, 0.04, 0.16);
      head.add(eye);
    });
    [-0.16, 0.16].forEach(function (x) {
      [-0.12, 0.12].forEach(function (z) {
        const leg = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.28, 0.08),
          new THREE.MeshLambertMaterial({ color: 0x2b241e })
        );
        leg.position.set(x, 0.16, z);
        group.add(leg);
      });
    });
    return group;
  }


  function bindInput() {
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    const view = renderer.domElement;
    view.addEventListener("pointerdown", onLookDown);
    window.addEventListener("pointermove", onLookMove);
    window.addEventListener("pointerup", onLookUp);
    const stick = document.getElementById("stick");
    stick.addEventListener("pointerdown", onJoyDown);
    stick.addEventListener("pointermove", onJoyMove);
    stick.addEventListener("pointerup", onJoyUp);
    stick.addEventListener("pointercancel", onJoyUp);
    const jumpBtn = document.getElementById("jump-btn");
    jumpBtn.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      jumpQueued = true;
    });
    document.getElementById("pickup-btn").addEventListener("pointerdown", function (event) {
      event.preventDefault();
      event.stopPropagation();
      startCarry(nearPickup);
    });
    document.getElementById("burn-btn").addEventListener("pointerdown", function (event) {
      event.preventDefault();
      event.stopPropagation();
      burnLog(nearBurn);
    });
    document.getElementById("slip-btn").addEventListener("pointerdown", function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (slipLeft <= 0) return;
      slipLeft = 0;
      hideSlip();
      slipGap = 2 + Math.random() * 2;
    });
    document.getElementById("hotbar").addEventListener("pointerdown", function (event) {
      const btn = event.target.closest("[data-food]");
      if (!btn) return;
      event.preventDefault();
      event.stopPropagation();
      eatFood(Number(btn.getAttribute("data-food")));
    });
    document.getElementById("tutorial-skip").addEventListener("pointerdown", function (event) {
      event.preventDefault();
      event.stopPropagation();
      endForestTutorial();
    });
  }

  function onKeyDown(event) {
    if (!running || forestTutorial) return;
    keys[event.code] = true;
    if (event.code === "Space") jumpQueued = true;
    if (event.code === "Space" || event.code.indexOf("Arrow") === 0) event.preventDefault();
  }

  function onKeyUp(event) {
    keys[event.code] = false;
  }

  function onLookDown(event) {
    if (!running || event.target !== renderer.domElement) return;
    lookPointer = event.pointerId;
    clickX = event.clientX;
    clickY = event.clientY;
    clickAt = performance.now();
    renderer.domElement.setPointerCapture(event.pointerId);
  }

  function onLookMove(event) {
    if (!running || caught || nightIntro || forestTutorial || event.pointerId !== lookPointer) return;
    yaw -= (event.movementX || 0) * 0.005;
    pitch = Math.max(0.18, Math.min(1.15, pitch + (event.movementY || 0) * 0.004));
  }

  function onLookUp(event) {
    if (event.pointerId !== lookPointer) return;
    const moved = Math.hypot(event.clientX - clickX, event.clientY - clickY);
    const quick = performance.now() - clickAt < 450;
    lookPointer = null;
    if (moved < 14 && quick) tryThrow(event.clientX, event.clientY);
  }

  function onJoyDown(event) {
    joy.active = true;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    placeJoy(event);
  }

  function onJoyMove(event) {
    if (!joy.active) return;
    placeJoy(event);
  }

  function onJoyUp() {
    joy.active = false;
    joy.x = 0;
    joy.y = 0;
    document.getElementById("knob").style.transform = "translate(0px, 0px)";
  }

  function placeJoy(event) {
    const base = document.getElementById("stick");
    const rect = base.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let x = event.clientX - cx;
    let y = event.clientY - cy;
    const max = rect.width * 0.34;
    const len = Math.hypot(x, y) || 1;
    const clamped = Math.min(max, len);
    x = (x / len) * clamped;
    y = (y / len) * clamped;
    document.getElementById("knob").style.transform = "translate(" + x + "px, " + y + "px)";
    joy.x = x / max;
    joy.y = y / max;
  }

  function readMove() {
    let x = joy.x;
    let z = -joy.y;
    if (keys.KeyA || keys.ArrowLeft) x -= 1;
    if (keys.KeyD || keys.ArrowRight) x += 1;
    if (keys.KeyW || keys.ArrowUp) z += 1;
    if (keys.KeyS || keys.ArrowDown) z -= 1;
    const len = Math.hypot(x, z);
    if (len > 1) {
      x /= len;
      z /= len;
    }
    return { x: x, z: z };
  }

  function platforms() {
    const list = PADS.slice();
    if (world === "meadow" && cloudPad) list.push(cloudPad);
    return list;
  }

  function findGround(x, y, z) {
    if (world === "forest") {
      if (y <= 0.4) return { top: 0, pad: null };
      return null;
    }
    let found = null;
    platforms().forEach(function (pad) {
      const top = pad.y + pad.h;
      const inside = Math.abs(x - pad.x) <= pad.w / 2 + 0.28 && Math.abs(z - pad.z) <= pad.d / 2 + 0.28;
      if (!inside) return;
      if (y >= top - 0.25 && y <= top + 0.55 && (!found || top > found.top)) {
        found = { top: top, pad: pad };
      }
    });
    if (world === "forest" && y <= 0.2) return { top: 0, pad: null };
    return found;
  }

  function updatePlayer(dt) {
    if (caught) return;
    if (nightIntro) {
      settleNightIntroBody(dt);
      return;
    }
    if (forestTutorial) {
      if (forestTutorial.stepId === "carry" && carry) {
        updateCarryWalk(dt);
        return;
      }
      player.position.y = 0;
      vy = 0;
      return;
    }
    if (carry) {
      updateCarryWalk(dt);
      return;
    }
    const move = readMove();
    const sin = Math.sin(yaw);
    const cos = Math.cos(yaw);
    const forwardX = -sin;
    const forwardZ = -cos;
    const rightX = cos;
    const rightZ = -sin;
    const mx = rightX * move.x + forwardX * move.z;
    const mz = rightZ * move.x + forwardZ * move.z;
    player.position.x += mx * SPEED * dt;
    player.position.z += mz * SPEED * dt;
    const walking = mx !== 0 || mz !== 0;
    if (walking) player.rotation.y = Math.atan2(mx, mz);

    vy -= GRAVITY * dt;
    player.position.y += vy * dt;
    const ground = findGround(player.position.x, player.position.y, player.position.z);
    grounded = false;
    ridingCloud = false;
    if (ground && vy <= 0) {
      player.position.y = ground.top;
      vy = 0;
      grounded = true;
      ridingCloud = !!(ground.pad && ground.pad.moving);
      if (ground.pad && !ground.pad.moving) lastPad = ground.pad;
    }
    if (grounded && jumpQueued) {
      vy = JUMP;
      grounded = false;
      jumpQueued = false;
    } else if (!grounded) {
      jumpQueued = false;
    }
    if (world === "meadow" && player.position.y < -6) {
      const home = lastPad || PADS[0];
      player.position.set(home.x, home.y + home.h, home.z);
      vy = 0;
    }
    if (world === "forest") {
      pushOutOfTrees();
      clampForestEdge();
    }
    updateLimbs(dt, walking && grounded);
  }

  function updateLimbs(dt, moving) {
    const limbs = player && player.userData.limbs;
    if (!limbs) return;
    if (moving) walkPhase += dt * (carry ? 6.4 : 10);
    const step = moving ? Math.sin(walkPhase) : 0;
    limbs.leftLeg.rotation.x = step * 0.75;
    limbs.rightLeg.rotation.x = -step * 0.75;
    if (carry) {
      limbs.leftArm.rotation.x = -0.35;
      limbs.rightArm.rotation.x = -0.35;
      limbs.leftArm.rotation.z = -1.45;
      limbs.rightArm.rotation.z = 1.45;
      return;
    }
    limbs.leftArm.rotation.x = -step * 0.6;
    limbs.rightArm.rotation.x = step * 0.6;
    limbs.leftArm.rotation.z = -0.22;
    limbs.rightArm.rotation.z = 0.22;
  }

  function pushOutOfTrees() {
    trees.forEach(function (tree) {
      if (tree.felled) return;
      const dx = player.position.x - tree.x;
      const dz = player.position.z - tree.z;
      const dist = Math.hypot(dx, dz);
      const limit = tree.r || 0.85;
      if (dist < limit && dist > 0.001) {
        player.position.x = tree.x + (dx / dist) * limit;
        player.position.z = tree.z + (dz / dist) * limit;
      }
    });
  }

  function clampForestEdge() {
    const dist = Math.hypot(player.position.x, player.position.z);
    const limit = FOREST_RADIUS - 1.8;
    if (dist > limit) {
      player.position.x *= limit / dist;
      player.position.z *= limit / dist;
    }
  }

  function updateCloud(time, prev) {
    cloudPad.x = Math.sin(time * 0.7) * 1.5;
    cloud.position.set(cloudPad.x, cloudPad.y + cloudPad.h - 0.3, cloudPad.z);
    if (ridingCloud) {
      player.position.x += cloudPad.x - prev.x;
      player.position.z += cloudPad.z - prev.z;
    }
    prev.x = cloudPad.x;
    prev.z = cloudPad.z;
  }

  function updateSheep(dt, time) {
    let following = 0;
    sheepMeshes.forEach(function (mesh) {
      const data = mesh.userData;
      if (!data.joined) {
        const home = data.home;
        const dist = Math.hypot(player.position.x - home.x, player.position.z - home.z);
        mesh.position.y = home.y + home.h + Math.abs(Math.sin(time * 3 + data.index)) * 0.05;
        if (grounded && dist < 3.2) data.joined = true;
        return;
      }
      following += 1;
      const face = player.rotation.y;
      const back = 1.6 + data.index * 0.95;
      const side = (data.index - 1) * 0.55;
      const tx = player.position.x - Math.sin(face) * back + Math.cos(face) * side;
      const tz = player.position.z - Math.cos(face) * back - Math.sin(face) * side;
      mesh.position.x += (tx - mesh.position.x) * Math.min(1, dt * 3.2);
      mesh.position.z += (tz - mesh.position.z) * Math.min(1, dt * 3.2);
      const ty = player.position.y + Math.abs(Math.sin(time * 9 + data.index)) * 0.12;
      mesh.position.y += (ty - mesh.position.y) * Math.min(1, dt * 4);
      mesh.rotation.y = Math.atan2(tx - mesh.position.x, tz - mesh.position.z);
    });
    if (world === "meadow") setSheepCount(following);
  }

  function checkFinish() {
    if (finished || world !== "meadow" || !grounded) return;
    const finish = PADS[PADS.length - 1];
    const top = finish.y + finish.h;
    const dist = Math.hypot(player.position.x - finish.x, player.position.z - finish.z);
    if (dist < 2.5 && player.position.y >= top - 0.35 && player.position.y <= top + 2.4) enterForest();
  }

  function enterForest() {
    finished = true;
    world = "forest";
    const flash = document.getElementById("page-flash");
    flash.style.background = "#07060a";
    flash.classList.add("show");
    setTimeout(function () {
      meadow.visible = false;
      forest.visible = true;
      sheepMeshes.forEach(function (mesh) { mesh.visible = false; });
      player.visible = true;
      player.position.set(CAMP_X, 0, CAMP_Z + 8);
      carry = null;
      hideSlip();
      holdAxe();
      vy = 0;
      forestClock = 0;
      logsBurned = 0;
      nightBlend = 0;
      nightIntroPlayed = false;
      if (nightIntro) endNightIntro();
      campGlow = 0;
      wolfMode = "walk";
      wolfChaseTime = 0;
      caught = false;
      catchTime = 0;
      wolf.visible = false;
      const caughtScreen = document.getElementById("caught-screen");
      if (caughtScreen) caughtScreen.hidden = true;
      document.getElementById("game-hud").style.visibility = "";
      scene.background = daySky.clone();
      scene.fog = new THREE.FogExp2(daySky.getHex(), 0.014);
      forestReady = true;
      document.body.classList.add("in-forest");
      document.getElementById("sheep-count").hidden = false;
      hunger = 10;
      hungerTick = 0;
      hotbar = [];
      sheepNight = false;
      forestSheep.forEach(function (sheep) {
        if (sheep.mesh.parent) sheep.mesh.parent.remove(sheep.mesh);
      });
      forestSheep = [];
      refillHerd();
      document.getElementById("hunger").hidden = false;
      document.getElementById("hotbar").hidden = false;
      renderHunger();
      renderHotbar();
      setHint("");
      beginForestTutorial();
      const storyBubble = document.getElementById("story-bubble");
      const heroBubble = document.getElementById("hero-bubble");
      if (storyBubble) storyBubble.hidden = true;
      if (heroBubble) heroBubble.hidden = true;
      flash.classList.remove("show");
    }, 460);
  }

  function frameFollowCamera() {
    const dist = world === "forest" ? 6.2 : 7.2;
    const lookY = player.position.y + 1.15;
    camPos.set(
      player.position.x + Math.sin(yaw) * Math.cos(pitch) * dist,
      lookY + Math.sin(pitch) * dist * 0.85,
      player.position.z + Math.cos(yaw) * Math.cos(pitch) * dist
    );
    camLook.set(player.position.x, lookY, player.position.z);
  }

  function updateCamera() {
    if (nightIntro) {
      updateNightIntroCamera();
      return;
    }
    if (forestTutorial) {
      if (forestTutorial.snap) {
        camera.position.copy(shotPos);
        tutorialLook.copy(shotLook);
        forestTutorial.snap = false;
      } else {
        const glide = Math.min(1, 0.35);
        camera.position.lerp(shotPos, glide);
        tutorialLook.lerp(shotLook, glide);
      }
      camera.lookAt(tutorialLook);
      return;
    }
    if (caught) {
      updateCatchCamera();
      return;
    }
    frameFollowCamera();
    camera.position.copy(camPos);
    camera.lookAt(camLook);
  }

  function campDistance(x, z) {
    return Math.hypot(x - CAMP_X, z - CAMP_Z);
  }

  function forestPhase() {
    const cycle = DAY_SECONDS + NIGHT_SECONDS;
    const into = forestClock % cycle;
    const isNight = into >= DAY_SECONDS;
    const left = isNight ? NIGHT_SECONDS - (into - DAY_SECONDS) : DAY_SECONDS - into;
    return {
      isNight: isNight,
      dayNumber: Math.floor(forestClock / cycle) + 1,
      left: left
    };
  }

  function formatClock(seconds) {
    const total = Math.max(0, Math.ceil(seconds));
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return mins + ":" + (secs < 10 ? "0" : "") + secs;
  }

  function applyForestLight(glow) {
    const ambient = scene.getObjectByName("ambient");
    const hemi = scene.getObjectByName("hemi");
    const sun = scene.getObjectByName("sun");
    const night = nightBlend;
    if (ambient) ambient.intensity = 0.4 - night * 0.26 + glow * (0.18 + night * 0.42);
    if (hemi) {
      hemi.color.set(0xb7c6d4);
      hemi.intensity = 0.48 - night * 0.3 + glow * (0.16 + night * 0.5);
    }
    if (sun) {
      sun.color.set(night > 0.5 ? 0x9bb0c4 : 0xfff1c4);
      sun.intensity = 0.42 - night * 0.32 + glow * 0.2;
    }
    skyLerp.copy(daySky).lerp(nightSky, night);
    skyLerp.lerp(campSky, glow * (0.22 + night * 0.18));
    scene.background = skyLerp;
    renderer.setClearColor(skyLerp, 1);
    if (skyMat) skyMat.color.copy(skyLerp);
    if (scene.fog) {
      scene.fog.color.copy(skyLerp);
      scene.fog.density = Math.max(0.006, 0.012 + night * 0.014 - glow * 0.008);
    }
    if (campWash) campWash.style.opacity = String(glow * (0.05 + night * 0.07));
    const bright = 1 + glow * (0.06 + night * 0.1);
    renderer.domElement.style.filter = glow > 0.02 ? "brightness(" + bright.toFixed(3) + ")" : "";
  }

  function keepWolfOutsideCircle() {
    const dx = wolf.position.x - CAMP_X;
    const dz = wolf.position.z - CAMP_Z;
    const dist = Math.hypot(dx, dz);
    const min = campRadius + 0.75;
    if (dist < min && dist > 0.001) {
      wolf.position.x = CAMP_X + (dx / dist) * min;
      wolf.position.z = CAMP_Z + (dz / dist) * min;
    }
  }

  function moveWolf(dirX, dirZ, speed, dt) {
    let mx = dirX;
    let mz = dirZ;
    const len = Math.hypot(mx, mz) || 1;
    mx /= len;
    mz /= len;
    const fromFireX = wolf.position.x - CAMP_X;
    const fromFireZ = wolf.position.z - CAMP_Z;
    const fromFire = Math.hypot(fromFireX, fromFireZ) || 0.001;
    const nx = fromFireX / fromFire;
    const nz = fromFireZ / fromFire;
    const inward = -(nx * mx + nz * mz);
    const step = speed * dt;
    const nextDist = Math.hypot(fromFireX + mx * step, fromFireZ + mz * step);
    if (inward > 0.05 && nextDist < campRadius + 0.9) {
      const tanX = -nz;
      const tanZ = nx;
      const sign = mx * tanX + mz * tanZ >= 0 ? 1 : -1;
      const rim = campRadius + 0.9;
      const radial = (rim - fromFire) * 2.4;
      mx = tanX * sign + nx * radial;
      mz = tanZ * sign + nz * radial;
    }
    const nearRing = fromFire < campRadius + 3;
    trees.forEach(function (tree) {
      const tx = wolf.position.x - tree.x;
      const tz = wolf.position.z - tree.z;
      const dist = Math.hypot(tx, tz);
      if (dist < tree.r + 1.5 && dist > 0.001) {
        const push = nearRing ? 0.35 : 1.6;
        mx += (tx / dist) * push;
        mz += (tz / dist) * push;
      }
    });
    const norm = Math.hypot(mx, mz) || 1;
    wolf.position.x += (mx / norm) * speed * dt;
    wolf.position.z += (mz / norm) * speed * dt;
    const edge = Math.hypot(wolf.position.x, wolf.position.z);
    const limit = FOREST_RADIUS - 3;
    if (edge > limit) {
      wolf.position.x *= limit / edge;
      wolf.position.z *= limit / edge;
    }
    keepWolfOutsideCircle();
    wolf.rotation.y = Math.atan2(mx, mz);
  }

  function wolfSeesPlayer() {
    const dx = player.position.x - wolf.position.x;
    const dz = player.position.z - wolf.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 18 || dist < 0.2) return dist < 0.2;
    const aim = Math.atan2(dx, dz);
    let turn = aim - wolf.rotation.y;
    while (turn > Math.PI) turn -= Math.PI * 2;
    while (turn < -Math.PI) turn += Math.PI * 2;
    if (Math.abs(turn) > 0.95) return false;
    const steps = 7;
    for (let i = 1; i < steps; i += 1) {
      const x = wolf.position.x + dx * (i / steps);
      const z = wolf.position.z + dz * (i / steps);
      for (let t = 0; t < trees.length; t += 1) {
        const tree = trees[t];
        if (tree.felled) continue;
        if (Math.hypot(x - tree.x, z - tree.z) < tree.r + 0.25) return false;
      }
    }
    return true;
  }

  function placeWolfForNight() {
    const away = Math.atan2(player.position.z, player.position.x) + Math.PI;
    wolf.position.set(Math.cos(away) * 26, 0, Math.sin(away) * 22);
    keepWolfOutsideCircle();
    wolfMode = "walk";
    wolfLost = 0;
  }

  function smoothStep(t) {
    const x = Math.max(0, Math.min(1, t));
    return x * x * (3 - 2 * x);
  }

  function lerpAngle(from, to, t) {
    let delta = to - from;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    return from + delta * t;
  }

  function chaseSpeed() {
    return SPEED * (wolfChaseTime >= 30 ? 1 : 0.75);
  }

  function beginCatch() {
    if (carry) dropLog(false);
    if (axe && axeMode !== "held") holdAxe();
    caught = true;
    catchTime = 0;
    wolfMode = "caught";
    wolf.position.y = 0;
    catchFrom.set(player.position.x, player.position.y, player.position.z);
    catchYaw = player.rotation.y;
    wolf.rotation.y = Math.atan2(player.position.x - wolf.position.x, player.position.z - wolf.position.z);
    catchFace = wolf.rotation.y + Math.PI;
    catchCamFrom.copy(camera.position);
    catchLookFrom.set(player.position.x, player.position.y + 1.2, player.position.z);
    catchLine = CAUGHT_LINES[Math.floor(Math.random() * CAUGHT_LINES.length)];
    const screen = document.getElementById("caught-screen");
    const line = document.getElementById("caught-line");
    screen.hidden = false;
    screen.style.background = "rgba(5,3,8,0)";
    line.textContent = catchLine;
    line.style.opacity = "0";
    document.getElementById("game-hud").style.visibility = "hidden";
  }

  function updateCaught(dt) {
    catchTime += dt;
    const lift = smoothStep((catchTime - 0.4) / 1.15);
    const turn = smoothStep((catchTime - 1.6) / 1.1);
    const bite = smoothStep((catchTime - 2.8) / 1.05);
    const reach = smoothStep((catchTime - 0.15) / 0.85);
    const fwdX = Math.sin(wolf.rotation.y);
    const fwdZ = Math.cos(wolf.rotation.y);
    const holdX = wolf.position.x + fwdX * 2.35;
    const holdY = 2.5;
    const holdZ = wolf.position.z + fwdZ * 2.35;
    player.position.set(
      catchFrom.x + (holdX - catchFrom.x) * lift,
      catchFrom.y + (holdY - catchFrom.y) * lift,
      catchFrom.z + (holdZ - catchFrom.z) * lift
    );
    player.rotation.y = lerpAngle(catchYaw, catchFace, turn);
    const limbs = wolf.userData.limbs;
    limbs.leftArm.rotation.x = -1.2 * reach;
    limbs.rightArm.rotation.x = -1.2 * reach;
    limbs.leftArm.rotation.z = 0.5 * reach;
    limbs.rightArm.rotation.z = -0.5 * reach;
    limbs.leftLeg.rotation.x = 0;
    limbs.rightLeg.rotation.x = 0;
    wolf.userData.jaw.rotation.x = bite * 1.2;
    wolf.userData.faceLight.intensity = 3.4;
    const ambient = scene.getObjectByName("ambient");
    if (ambient) ambient.intensity = Math.max(ambient.intensity, 0.72);
    player.visible = catchTime < 0.35;
    const fade = smoothStep((catchTime - 4.15) / 1.05);
    document.getElementById("caught-screen").style.background = "rgba(5,3,8," + fade.toFixed(3) + ")";
    document.getElementById("caught-line").style.opacity = String(smoothStep((catchTime - 4.75) / 0.5));
  }

  function updateCatchCamera() {
    const blend = smoothStep(catchTime / 0.4);
    const lift = smoothStep((catchTime - 0.4) / 1.15);
    const turn = smoothStep((catchTime - 1.6) / 1.1);
    const aim = Math.max(lift, turn);
    wolf.updateMatrixWorld(true);
    const mouth = new THREE.Vector3(0, 2.55, 0.42).applyMatrix4(wolf.matrixWorld);
    catchEye.set(player.position.x, player.position.y + 1.48, player.position.z);
    catchLook.set(
      catchEye.x + Math.sin(catchYaw) * 2.2,
      catchEye.y - 0.05,
      catchEye.z + Math.cos(catchYaw) * 2.2
    );
    catchLook.lerp(mouth, aim);
    camera.position.lerpVectors(catchCamFrom, catchEye, blend);
    camera.lookAt(catchLookFrom.clone().lerp(catchLook, blend));
  }

  function updateWolf(dt, time, isNight) {
    if (!wolf) return;
    if (wolfMode === "caught") {
      updateCaught(dt);
      return;
    }
    if (!isNight) {
      wolf.visible = false;
      wolfMode = "walk";
      wolfChaseTime = 0;
      if (wolf.userData.jaw) wolf.userData.jaw.rotation.x = 0;
    if (wolf.userData.faceLight) wolf.userData.faceLight.intensity = 0;
      return;
    }
    if (!wolf.visible) placeWolfForNight();
    wolf.visible = true;
    const sees = wolfSeesPlayer();
    const playerInside = campDistance(player.position.x, player.position.z) <= campRadius;
    if (sees) {
      wolfMode = "chase";
      wolfLost = 0;
    } else if (wolfMode === "chase") {
      if (playerInside) wolfLost = 0;
      else {
        wolfLost += dt;
        if (wolfLost > 2.2) wolfMode = "walk";
      }
    }
    let speed = 2.3;
    let dirX = 0;
    let dirZ = 0;
    if (wolfMode === "chase") {
      wolfChaseTime += dt;
      speed = chaseSpeed();
      if (playerInside) {
        const dx = player.position.x - CAMP_X;
        const dz = player.position.z - CAMP_Z;
        const dist = Math.hypot(dx, dz) || 1;
        const edge = campRadius + 0.9;
        const wolfAngleNow = Math.atan2(wolf.position.z - CAMP_Z, wolf.position.x - CAMP_X);
        const targetAngle = Math.atan2(dz, dx);
        let delta = targetAngle - wolfAngleNow;
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        const wolfDist = Math.hypot(wolf.position.x - CAMP_X, wolf.position.z - CAMP_Z);
        if (Math.abs(delta) < 0.2 && Math.abs(wolfDist - edge) < 1.3) {
          speed = 0;
        } else {
          const turn = delta >= 0 ? 1 : -1;
          const radial = edge - wolfDist;
          dirX = -Math.sin(wolfAngleNow) * turn + Math.cos(wolfAngleNow) * radial;
          dirZ = Math.cos(wolfAngleNow) * turn + Math.sin(wolfAngleNow) * radial;
        }
      } else {
        dirX = player.position.x - wolf.position.x;
        dirZ = player.position.z - wolf.position.z;
        if (Math.hypot(dirX, dirZ) < 1.5) {
          beginCatch();
          return;
        }
      }
    } else {
      wolfChaseTime = 0;
      wolfAngle += dt * 0.22;
      const tx = Math.cos(wolfAngle) * 26;
      const tz = Math.sin(wolfAngle) * 20;
      dirX = tx - wolf.position.x;
      dirZ = tz - wolf.position.z;
    }
    if (speed > 0) moveWolf(dirX, dirZ, speed, dt);
    else wolf.rotation.y = Math.atan2(player.position.x - wolf.position.x, player.position.z - wolf.position.z);
    const limbs = wolf.userData.limbs;
    const swing = Math.sin(time * (wolfMode === "chase" ? 11 : 4.2));
    limbs.leftLeg.rotation.x = swing * 0.7;
    limbs.rightLeg.rotation.x = -swing * 0.7;
    limbs.leftArm.rotation.x = -swing * 0.45;
    limbs.rightArm.rotation.x = swing * 0.45;
    limbs.leftArm.rotation.z = 0;
    limbs.rightArm.rotation.z = 0;
    if (wolf.userData.jaw) wolf.userData.jaw.rotation.x = 0;
    if (wolf.userData.faceLight) wolf.userData.faceLight.intensity = 0;
    wolf.position.y = Math.abs(Math.sin(time * (wolfMode === "chase" ? 11 : 4.2))) * 0.06;
  }

  function settleNightIntroBody(dt) {
    vy -= GRAVITY * dt;
    player.position.y += vy * dt;
    const ground = findGround(player.position.x, player.position.y, player.position.z);
    if (ground && vy <= 0) {
      player.position.y = ground.top;
      vy = 0;
      grounded = true;
    }
    if (!carry) return;
    const face = player.rotation.y;
    carry.mesh.position.set(
      player.position.x + Math.sin(face) * 0.38,
      player.position.y + 0.82,
      player.position.z + Math.cos(face) * 0.38
    );
  }

  function distanceToSegment(px, pz, x0, z0, x1, z1) {
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len2 = dx * dx + dz * dz || 1;
    let t = ((px - x0) * dx + (pz - z0) * dz) / len2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x0 + dx * t), pz - (z0 + dz * t));
  }

  function spotClear(x, z, pad) {
    for (let i = 0; i < trees.length; i += 1) {
      const tree = trees[i];
      if (tree.felled || tree.burned) continue;
      if (Math.hypot(x - tree.x, z - tree.z) < (tree.r || 0.8) + pad) return false;
    }
    return true;
  }

  function findGrazeSpot() {
    const px = player.position.x;
    const pz = player.position.z;
    const originAngle = Math.atan2(pz - CAMP_Z, px - CAMP_X);
    let best = null;
    let bestScore = -1;
    for (let i = 0; i < 24; i += 1) {
      const angle = originAngle + Math.PI * 0.55 + i * 0.26;
      const dist = campRadius + 6 + (i % 5) * 0.8;
      const x = CAMP_X + Math.sin(angle) * dist;
      const z = CAMP_Z + Math.cos(angle) * dist;
      if (Math.hypot(x, z) > FOREST_RADIUS - 10) continue;
      if (!spotClear(x, z, 1.25)) continue;
      const away = Math.hypot(x - px, z - pz);
      if (away < 8) continue;
      if (away > bestScore) {
        bestScore = away;
        best = { x: x, z: z, face: angle + Math.PI / 2 };
      }
    }
    if (best) return best;
    return {
      x: CAMP_X + Math.sin(originAngle + Math.PI) * (campRadius + 7),
      z: CAMP_Z + Math.cos(originAngle + Math.PI) * (campRadius + 7),
      face: originAngle
    };
  }

  function hideTreesNearSegment(x0, z0, x1, z1, pad, into) {
    trees.forEach(function (tree) {
      if (tree.felled || tree.burned || !tree.mesh.visible) return;
      if (into.indexOf(tree) !== -1) return;
      if (distanceToSegment(tree.x, tree.z, x0, z0, x1, z1) < (tree.r || 0.8) + pad) {
        tree.mesh.visible = false;
        into.push(tree);
      }
    });
    return into;
  }

  function makeGrazeGrass() {
    const group = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: 0x3f7a3c });
    for (let i = 0; i < 7; i += 1) {
      const height = 0.22 + (i % 3) * 0.06;
      const blade = new THREE.Mesh(new THREE.ConeGeometry(0.025, height, 4), mat);
      blade.position.set((i - 3) * 0.055, height / 2, (i % 2) * 0.04);
      blade.rotation.z = (i - 3) * 0.18;
      group.add(blade);
    }
    return group;
  }

  function makeQuadWolf(opacity, lead) {
    const group = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({
      color: lead ? 0x2c2426 : 0x1a1214,
      transparent: !lead,
      opacity: lead ? 1 : Math.max(0.06, opacity),
      fog: false,
      depthWrite: lead
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.36, 1.25), mat);
    body.position.set(0, 0.58, 0);
    group.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.26, 0.36), mat);
    head.position.set(0, 0.7, 0.74);
    group.add(head);
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.3), mat);
    snout.position.set(0, 0.58, 1.02);
    group.add(snout);
    [-0.08, 0.08].forEach(function (x) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 4), mat);
      ear.position.set(x, 0.76, 0.58);
      group.add(ear);
    });
    if (lead) {
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2a18, fog: false });
      [-0.1, 0.1].forEach(function (x) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 5), eyeMat);
        eye.position.set(x, 0.6, 0.78);
        group.add(eye);
      });
    }
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.34), mat);
    tail.position.set(0, 0.62, -0.62);
    tail.rotation.x = 0.5;
    group.add(tail);
    const legs = [];
    [[-0.12, 0.42], [0.12, 0.42], [-0.12, -0.48], [0.12, -0.48]].forEach(function (spot, legIndex) {
      const pivot = new THREE.Group();
      pivot.position.set(spot[0], 0.46, spot[1]);
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.5, 0.09), mat);
      leg.position.y = -0.22;
      pivot.add(leg);
      if (!lead) pivot.rotation.x = legIndex === 0 || legIndex === 3 ? 0.8 : -0.8;
      group.add(pivot);
      legs.push(pivot);
    });
    group.userData.legs = legs;
    return group;
  }

  function makeWolfBlur() {
    const group = new THREE.Group();
    group.rotation.order = "YXZ";
    for (let i = 0; i < 4; i += 1) {
      const ghost = makeQuadWolf(0.4 - i * 0.09, i === 0);
      ghost.position.z = -i * 0.28;
      if (i > 0) ghost.scale.z = 1 + i * 0.12;
      ghost.traverse(function (node) { node.renderOrder = i === 0 ? 2 : 3; });
      group.add(ghost);
    }
    group.scale.setScalar(1.55);
    return group;
  }

  function disposeObject(object) {
    if (!object) return;
    const materials = new Set();
    const geometries = new Set();
    object.traverse(function (node) {
      if (node.geometry) geometries.add(node.geometry);
      if (node.material) {
        const list = Array.isArray(node.material) ? node.material : [node.material];
        list.forEach(function (material) { materials.add(material); });
      }
    });
    geometries.forEach(function (geometry) { geometry.dispose(); });
    materials.forEach(function (material) { material.dispose(); });
    if (object.parent) object.parent.remove(object);
  }

  function nightIntroMarks() {
    const blendIn = 0.6;
    const graze = 2.15;
    const swoop = 0.42;
    const hold = 0.95;
    const blendOut = 0.75;
    const swoopAt = blendIn + graze;
    const holdAt = swoopAt + swoop;
    const outAt = holdAt + hold;
    return {
      blendIn: blendIn,
      swoop: swoop,
      swoopAt: swoopAt,
      holdAt: holdAt,
      outAt: outAt,
      endAt: outAt + blendOut
    };
  }

  function shotFrame(intro, time) {
    const breathe = Math.sin(time * 0.7) * 0.03;
    shotPos.set(
      intro.sx + intro.rx * 2.45 + breathe,
      0.58,
      intro.sz + intro.rz * 2.45
    );
    shotLook.set(intro.sx + intro.fx * 0.4, 0.34, intro.sz + intro.fz * 0.4);
  }

  function beginNightIntro() {
    if (nightIntroPlayed || nightIntro) return;
    nightIntroPlayed = true;
    const spot = findGrazeSpot();
    const face = spot.face;
    const fx = Math.sin(face);
    const fz = Math.cos(face);
    const rx = Math.cos(face);
    const rz = -Math.sin(face);
    const sheep = sheepMeshes[0];
    forest.add(sheep);
    sheep.visible = true;
    sheep.scale.setScalar(1);
    sheep.position.set(spot.x, 0, spot.z);
    sheep.rotation.set(0, face, 0);
    const head = sheep.userData.head;
    if (head) {
      head.rotation.set(0, 0, 0);
      head.position.set(0, 0.62, 0.38);
    }
    const grass = makeGrazeGrass();
    grass.position.set(spot.x + fx * 0.58, 0.01, spot.z + fz * 0.58);
    grass.rotation.y = face;
    forest.add(grass);
    const camDist = 2.55;
    const x0 = spot.x - fx * 2.4;
    const z0 = spot.z - fz * 2.4;
    const x1 = spot.x + fx * 2.8;
    const z1 = spot.z + fz * 2.8;
    const hiddenTrees = [];
    hideTreesNearSegment(x0, z0, x1, z1, 1.15, hiddenTrees);
    hideTreesNearSegment(spot.x + rx * camDist, spot.z + rz * camDist, spot.x, spot.z, 0.7, hiddenTrees);
    const blur = makeWolfBlur();
    blur.visible = false;
    forest.add(blur);
    const light = new THREE.PointLight(0xc5d4e8, 0, 12, 2);
    light.position.set(spot.x + rx * 2.2, 2.3, spot.z + rz * 2.2);
    forest.add(light);
    if (wolf) wolf.visible = false;
    frameFollowCamera();
    nightIntro = {
      t: 0,
      sheep: sheep,
      grass: grass,
      blur: blur,
      light: light,
      hiddenTrees: hiddenTrees,
      face: face,
      fx: fx,
      fz: fz,
      rx: rx,
      rz: rz,
      sx: spot.x,
      sz: spot.z,
      camDist: camDist,
      x0: x0,
      z0: z0,
      x1: x1,
      z1: z1,
      gone: false,
      shake: 0,
      wisps: null,
      camFrom: camPos.clone(),
      lookFrom: camLook.clone()
    };
    jumpQueued = false;
    camera.fov = 46;
    camera.updateProjectionMatrix();
    hideSlip();
    document.getElementById("pickup-btn").hidden = true;
    document.getElementById("burn-btn").hidden = true;
    document.getElementById("game-hud").style.visibility = "hidden";
  }

  function updateGraze(intro, time) {
    const head = intro.sheep.userData.head;
    if (!head || intro.gone) return;
    const dip = smoothStep(Math.min(1, Math.max(0, (time - 0.35) / 0.45)));
    head.rotation.x = dip * 1.2;
    head.position.y = 0.48 - dip * 0.3;
    head.position.z = 0.4 + dip * 0.16;
    intro.sheep.rotation.x = dip * 0.22;
  }

  function spawnVanishWisps(intro) {
    const group = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({
      color: 0xfffaf4,
      transparent: true,
      opacity: 1,
      fog: false,
      depthWrite: false
    });
    for (let i = 0; i < 6; i += 1) {
      const bit = new THREE.Mesh(new THREE.SphereGeometry(0.07 + (i % 3) * 0.025, 6, 5), mat);
      bit.position.set(intro.sx, 0.5, intro.sz);
      const angle = (i / 6) * Math.PI * 2;
      bit.userData.vx = Math.cos(angle) * (0.8 + (i % 2) * 0.7);
      bit.userData.vz = Math.sin(angle) * (0.8 + (i % 2) * 0.5);
      bit.userData.vy = 1.1 + (i % 3) * 0.45;
      group.add(bit);
    }
    group.userData.mat = mat;
    forest.add(group);
    intro.wisps = group;
    intro.vanishAt = intro.t;
  }

  function updateWolfBlur(intro, u) {
    const blur = intro.blur;
    blur.visible = u > 0 && u < 1;
    if (!blur.visible) return;
    blur.position.set(
      intro.x0 + (intro.x1 - intro.x0) * u + intro.rx * 1.05,
      0,
      intro.z0 + (intro.z1 - intro.z0) * u + intro.rz * 1.05
    );
    blur.rotation.y = intro.face;
    blur.rotation.x = 0;
    const lead = blur.children[0];
    if (!lead || !lead.userData.legs) return;
    lead.userData.legs.forEach(function (leg, index) {
      const phase = index === 0 || index === 3 ? 0 : Math.PI;
      const gallop = Math.sin(intro.t * 55 + phase);
      leg.rotation.x = gallop * 0.35 + (gallop >= 0 ? 0.85 : -0.85);
    });
  }

  function updateNightIntro(dt) {
    const intro = nightIntro;
    if (!intro) return;
    const marks = nightIntroMarks();
    intro.t += dt;
    applyForestLight(0);
    updateGraze(intro, intro.t);
    if (intro.light) intro.light.intensity = smoothStep(Math.min(1, intro.t / marks.blendIn)) * 22;
    const swoopU = (intro.t - marks.swoopAt) / marks.swoop;
    updateWolfBlur(intro, swoopU);
    if (!intro.gone && swoopU >= 0.47) {
      intro.gone = true;
      intro.sheep.visible = false;
      intro.shake = 0.16;
      spawnVanishWisps(intro);
    }
    if (intro.shake) intro.shake *= Math.exp(-dt * 10);
    if (intro.wisps) {
      intro.wisps.children.forEach(function (bit) {
        bit.userData.vy -= dt * 4.5;
        bit.position.x += bit.userData.vx * dt;
        bit.position.y += bit.userData.vy * dt;
        bit.position.z += bit.userData.vz * dt;
      });
      const fade = Math.max(0, 1 - (intro.t - intro.vanishAt) / 0.55);
      intro.wisps.userData.mat.opacity = fade;
    }
  }

  function updateNightIntroCamera() {
    const intro = nightIntro;
    if (!intro) return;
    const marks = nightIntroMarks();
    shotFrame(intro, intro.t);
    let pos = shotPos;
    let look = shotLook;
    if (intro.t < marks.blendIn) {
      const u = smoothStep(intro.t / marks.blendIn);
      camPos.lerpVectors(intro.camFrom, shotPos, u);
      camLook.lerpVectors(intro.lookFrom, shotLook, u);
      pos = camPos;
      look = camLook;
    } else if (intro.t >= marks.outAt) {
      frameFollowCamera();
      const u = smoothStep((intro.t - marks.outAt) / (marks.endAt - marks.outAt));
      shotPos.lerp(camPos, u);
      shotLook.lerp(camLook, u);
      pos = shotPos;
      look = shotLook;
    }
    camera.position.set(pos.x, pos.y, pos.z);
    if (intro.shake) {
      camera.position.x += Math.sin(intro.t * 70) * intro.shake;
      camera.position.y += Math.cos(intro.t * 63) * intro.shake * 0.6;
      camera.position.z += Math.sin(intro.t * 58) * intro.shake;
    }
    camera.lookAt(look);
  }

  function endNightIntro() {
    const intro = nightIntro;
    if (!intro) return;
    intro.hiddenTrees.forEach(function (tree) {
      if (!tree.burned) tree.mesh.visible = true;
    });
    const head = intro.sheep.userData.head;
    if (head) {
      head.rotation.set(0, 0, 0);
      head.position.set(0, 0.62, 0.38);
    }
    intro.sheep.rotation.x = 0;
    intro.sheep.visible = false;
    intro.sheep.scale.setScalar(1);
    disposeObject(intro.grass);
    disposeObject(intro.blur);
    disposeObject(intro.wisps);
    if (intro.light && intro.light.parent) intro.light.parent.remove(intro.light);
    nightIntro = null;
    jumpQueued = false;
    camera.fov = 60;
    camera.updateProjectionMatrix();
    document.getElementById("game-hud").style.visibility = "";
  }

  function campPoint(angle, dist) {
    return {
      x: CAMP_X + Math.cos(angle) * dist,
      z: CAMP_Z + Math.sin(angle) * dist
    };
  }

  function tutorialSteps() {
    return [
      { id: "sheep", until: 3.4, text: "Throw your axe at a sheep. A Raw mutton strip drops into the hotbar. Eating it fills one hunger pip." },
      { id: "cook", until: 6.7, text: "Bring it into the fire ring and it cooks into a Yummy mutton strip. Eating that fills four hunger pips." },
      { id: "chop", until: 9.9, text: "The same throw chops down a tree." },
      { id: "carry", until: 15.6, text: "Carry the log to the fire. Tap Catch! when it pops up, or the log slips away. Burn it in the ring. Every third log grows the circle." },
      { id: "wolf", until: 22.4, text: "At night the wolf hunts you. Run into the fire. He cannot step inside the ring." }
    ];
  }

  function scrapTutorialProps() {
    const tutorial = forestTutorial;
    if (!tutorial) return;
    if (carry && carry === tutorial.tree) carry = null;
    hideSlip();
    slipLeft = 0;
    if (tutorial.sheep) {
      if (axeSheep === tutorial.sheep) axeSheep = null;
      disposeObject(tutorial.sheep.mesh);
      tutorial.sheep = null;
    }
    if (tutorial.tree) {
      tutorial.tree.carried = false;
      const index = trees.indexOf(tutorial.tree);
      if (index >= 0) trees.splice(index, 1);
      disposeObject(tutorial.tree.mesh);
      tutorial.tree = null;
    }
    nearBurn = null;
    nearPickup = null;
    const burnBtn = document.getElementById("burn-btn");
    const pickupBtn = document.getElementById("pickup-btn");
    if (burnBtn) burnBtn.hidden = true;
    if (pickupBtn) pickupBtn.hidden = true;
  }

  function placeTutorialSheepShot() {
    const sheep = forestTutorial.sheep;
    const midX = (player.position.x + sheep.x) / 2;
    const midZ = (player.position.z + sheep.z) / 2;
    const dx = sheep.x - player.position.x;
    const dz = sheep.z - player.position.z;
    const len = Math.hypot(dx, dz) || 1;
    shotPos.set(midX + (dz / len) * 5.2, 2.4, midZ - (dx / len) * 5.2);
    shotLook.set(midX, 0.8, midZ);
  }

  function enterTutorialStep(id) {
    const tutorial = forestTutorial;
    tutorial.stepStart = tutorial.t;
    tutorial.snap = true;
    if (id === "sheep") {
      const spot = campPoint(0.85, campRadius + 6);
      const stand = campPoint(0.85, campRadius + 1.6);
      tutorial.sheep.x = spot.x;
      tutorial.sheep.z = spot.z;
      tutorial.sheep.mesh.position.set(spot.x, 0, spot.z);
      tutorial.sheep.mesh.rotation.y = Math.atan2(CAMP_X - spot.x, CAMP_Z - spot.z);
      player.position.set(stand.x, 0, stand.z);
      player.rotation.y = Math.atan2(spot.x - stand.x, spot.z - stand.z);
      placeTutorialSheepShot();
      return;
    }
    if (id === "cook") {
      if (tutorial.sheep && tutorial.sheep.alive) butcherSheep(tutorial.sheep);
      tutorial.cookFrom = player.position.clone();
      holdAxe();
      return;
    }
    if (id === "chop") {
      hotbar = [];
      renderHotbar();
      const spot = campPoint(-1.15, campRadius + 5.6);
      const stand = campPoint(-1.15, campRadius + 1.4);
      tutorial.tree.x = spot.x;
      tutorial.tree.z = spot.z;
      tutorial.tree.mesh.position.set(spot.x, 0, spot.z);
      tutorial.tree.mesh.visible = true;
      player.position.set(stand.x, 0, stand.z);
      player.rotation.y = Math.atan2(spot.x - stand.x, spot.z - stand.z);
      holdAxe();
      return;
    }
    if (id === "carry") {
      const tree = tutorial.tree;
      if (!tree.felled) fellTree(tree);
      tree.fall = 1;
      tree.settled = true;
      tree.mesh.rotation.z = (Math.PI / 2) * tree.fallSign;
      tree.mesh.visible = true;
      if (tree.mesh.children[1]) tree.mesh.children[1].visible = false;
      holdAxe();
      const stand = campPoint(-1.15, campRadius + 5.2);
      player.position.set(stand.x, 0, stand.z);
      startCarry(tree);
      showSlip();
      slipLeft = 3.6;
      slipGap = 9;
      return;
    }
    scrapTutorialProps();
    player.position.set(CAMP_X, 0, CAMP_Z);
    player.rotation.y = 0.4;
    wolf.visible = true;
    wolfMode = "walk";
    const start = campPoint(0.4, campRadius + 12);
    wolf.position.set(start.x, 0, start.z);
    if (wolf.userData.jaw) wolf.userData.jaw.rotation.x = 0.4;
  }

  function beginForestTutorial() {
    const sheepSpot = campPoint(0.85, campRadius + 6);
    forestSheep.forEach(function (sheep) {
      if (Math.hypot(sheep.x - sheepSpot.x, sheep.z - sheepSpot.z) < 3.5) {
        sheep.x += 5;
        sheep.z += 2;
        sheep.mesh.position.set(sheep.x, 0, sheep.z);
      }
    });
    const sheepMesh = makeSheep(0);
    sheepMesh.scale.setScalar(1.2);
    sheepMesh.position.set(sheepSpot.x, 0, sheepSpot.z);
    const sheep = { mesh: sheepMesh, alive: true, x: sheepSpot.x, z: sheepSpot.z };
    sheepMesh.userData.sheepRef = sheep;
    forest.add(sheepMesh);
    const treeSpot = campPoint(-1.15, campRadius + 5.6);
    const treeMesh = makeDeadTree(1);
    treeMesh.scale.setScalar(0.95);
    treeMesh.position.set(treeSpot.x, 0, treeSpot.z);
    treeMesh.visible = false;
    forest.add(treeMesh);
    const tree = {
      x: treeSpot.x,
      z: treeSpot.z,
      r: 0.7,
      mesh: treeMesh,
      felled: false,
      fall: 0,
      fallSign: 1,
      settled: false,
      carried: false,
      burned: false,
      atFire: false,
      pickupLock: 0
    };
    trees.push(tree);
    forestTutorial = {
      t: 0,
      stepId: "",
      stepStart: 0,
      sheep: sheep,
      tree: tree,
      threwSheep: false,
      threwChop: false,
      ate: false,
      cookFrom: null
    };
    hunger = 6;
    hungerTick = 0;
    hotbar = [];
    renderHunger();
    renderHotbar();
    document.body.classList.add("tutorial-on");
    document.getElementById("forest-tutorial").hidden = false;
    const stand = campPoint(0.85, campRadius + 1.6);
    player.position.set(stand.x, 0, stand.z);
    placeTutorialSheepShot();
    camera.position.copy(shotPos);
    tutorialLook.copy(shotLook);
    camera.lookAt(tutorialLook);
  }

  function endForestTutorial() {
    if (!forestTutorial) return;
    scrapTutorialProps();
    if (wolf) {
      wolf.visible = false;
      wolfMode = "walk";
      if (wolf.userData.jaw) wolf.userData.jaw.rotation.x = 0;
    }
    nightBlend = 0;
    holdAxe();
    hotbar = [];
    hunger = 10;
    hungerTick = 0;
    renderHunger();
    renderHotbar();
    player.position.set(CAMP_X, 0, CAMP_Z + 3);
    player.rotation.y = 0;
    vy = 0;
    Object.keys(keys).forEach(function (code) { keys[code] = false; });
    joy.x = 0;
    joy.y = 0;
    joy.active = false;
    jumpQueued = false;
    forestTutorial = null;
    document.body.classList.remove("tutorial-on");
    const panel = document.getElementById("forest-tutorial");
    if (panel) panel.hidden = true;
    refillHerd();
  }

  function updateForestTutorial(dt, time) {
    const tutorial = forestTutorial;
    if (!tutorial) return;
    tutorial.t += dt;
    const steps = tutorialSteps();
    let step = steps[steps.length - 1];
    for (let i = 0; i < steps.length; i += 1) {
      if (tutorial.t < steps[i].until) {
        step = steps[i];
        break;
      }
    }
    if (tutorial.t >= steps[steps.length - 1].until) {
      endForestTutorial();
      return;
    }
    if (tutorial.stepId !== step.id) {
      tutorial.stepId = step.id;
      enterTutorialStep(step.id);
    }
    document.getElementById("tutorial-caption").textContent = step.text;
    const local = tutorial.t - tutorial.stepStart;
    if (step.id === "sheep") {
      if (!tutorial.threwSheep && local > 0.45 && axeMode === "held") {
        tutorial.threwSheep = true;
        throwAxeAtSheep(tutorial.sheep);
      }
      placeTutorialSheepShot();
      updateLimbs(dt, false);
    } else if (step.id === "cook") {
      const u = Math.min(1, local / 1.25);
      player.position.lerpVectors(tutorial.cookFrom, new THREE.Vector3(CAMP_X, 0, CAMP_Z), u);
      player.rotation.y = Math.atan2(CAMP_X - player.position.x, CAMP_Z - player.position.z);
      if (campDistance(player.position.x, player.position.z) <= campRadius) cookCarriedMutton();
      if (!tutorial.cooked && hotbar.some(function (item) { return item.kind === "yummy"; })) {
        tutorial.cooked = true;
        hunger = Math.min(10, hunger + 4);
        renderHunger();
      }
      shotPos.set(CAMP_X + 6.5, 3.4, CAMP_Z + 6.5);
      shotLook.set(CAMP_X, 0.5, CAMP_Z);
      updateLimbs(dt, u < 1);
    } else if (step.id === "chop") {
      if (!tutorial.threwChop && local > 0.4 && axeMode === "held") {
        tutorial.threwChop = true;
        throwAxe(tutorial.tree);
      }
      const tree = tutorial.tree;
      const midX = (player.position.x + tree.x) / 2;
      const midZ = (player.position.z + tree.z) / 2;
      const dx = tree.x - player.position.x;
      const dz = tree.z - player.position.z;
      const len = Math.hypot(dx, dz) || 1;
      shotPos.set(midX + (dz / len) * 6.4, 2.8, midZ - (dx / len) * 6.4);
      shotLook.set(midX, 1.15, midZ);
      updateLimbs(dt, false);
    } else if (step.id === "carry") {
      if (slipLeft > 0 && slipLeft < 0.45) {
        slipLeft = 0;
        hideSlip();
        slipGap = 9;
      }
      updateWoodButtons(dt);
      const face = player.rotation.y;
      shotPos.set(
        player.position.x + Math.cos(face) * 7.2,
        3.4,
        player.position.z - Math.sin(face) * 7.2
      );
      shotLook.set(player.position.x, 1.05, player.position.z);
    } else if (step.id === "wolf") {
      const goal = campRadius + 0.9;
      const dx = CAMP_X - wolf.position.x;
      const dz = CAMP_Z - wolf.position.z;
      const dist = Math.hypot(dx, dz) || 1;
      if (dist > goal) {
        const stepMove = Math.min(dist - goal, 6.2 * dt);
        wolf.position.x += (dx / dist) * stepMove;
        wolf.position.z += (dz / dist) * stepMove;
      }
      wolf.rotation.y = Math.atan2(dx, dz);
      wolf.position.y = Math.abs(Math.sin(time * 11)) * 0.06;
      nightBlend = Math.min(0.9, nightBlend + dt * 0.85);
      applyForestLight(campGlow);
      const awayX = wolf.position.x - CAMP_X;
      const awayZ = wolf.position.z - CAMP_Z;
      const away = Math.hypot(awayX, awayZ) || 1;
      shotPos.set(CAMP_X - (awayX / away) * 8.5, 4.6, CAMP_Z - (awayZ / away) * 8.5);
      shotLook.set(CAMP_X + (awayX / away) * 2.2, 0.7, CAMP_Z + (awayZ / away) * 2.2);
      player.rotation.y = Math.atan2(wolf.position.x - player.position.x, wolf.position.z - player.position.z);
      updateLimbs(dt, false);
    }
  }

  let audioCtx = null;
  let forestAudio = null;
  let titleMusic = null;

  const TITLE_MELODY = [64, 67, 69, 67, 72, 71, 67, 64, 65, 69, 72, 69, 67, 64, 62, 60];
  const TITLE_HARMONY = [60, 64, 65, 64, 67, 67, 64, 60, 62, 65, 69, 65, 64, 60, 59, 57];
  const TITLE_BASS = [48, 45, 41, 43];

  function ensureAudio() {
    if (audioCtx) return audioCtx;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
    return audioCtx;
  }

  function titleStillUp() {
    const overlay = document.getElementById("overlay");
    const picker = document.getElementById("picker");
    return (overlay && !overlay.hidden) || (picker && !picker.hidden);
  }

  function playTitleTone(midi, time, duration, peak, type) {
    if (!audioCtx || !titleMusic) return;
    const osc = audioCtx.createOscillator();
    osc.type = type;
    osc.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(peak, time + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(gain);
    gain.connect(titleMusic.bus);
    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  function scheduleTitleMusic() {
    const music = titleMusic;
    if (!music || music.stopped || !audioCtx) return;
    const beat = 0.56;
    while (music.next < audioCtx.currentTime + 0.45) {
      const step = music.step % TITLE_MELODY.length;
      const time = music.next;
      playTitleTone(TITLE_MELODY[step], time, beat * 0.92, 0.46, "sine");
      playTitleTone(TITLE_HARMONY[step], time, beat * 0.92, 0.2, "triangle");
      if (step % 4 === 0) playTitleTone(TITLE_BASS[(step / 4) % TITLE_BASS.length], time, beat * 3.4, 0.28, "triangle");
      music.step += 1;
      music.next += beat;
    }
    if (!music.stopped) setTimeout(scheduleTitleMusic, 140);
  }

  function startTitleMusic() {
    const ctx = ensureAudio();
    if (!ctx || titleMusic || !titleStillUp()) return;
    if (ctx.state === "suspended") ctx.resume();
    const bus = ctx.createGain();
    bus.gain.setValueAtTime(0.0001, ctx.currentTime);
    bus.gain.exponentialRampToValueAtTime(0.9, ctx.currentTime + 0.35);
    bus.connect(ctx.destination);
    titleMusic = { bus: bus, stopped: false, next: ctx.currentTime + 0.08, step: 0 };
    scheduleTitleMusic();
  }

  function stopTitleMusic() {
    const music = titleMusic;
    if (!music || !audioCtx) return;
    music.stopped = true;
    titleMusic = null;
    const now = audioCtx.currentTime;
    music.bus.gain.cancelScheduledValues(now);
    music.bus.gain.setValueAtTime(Math.max(0.0001, music.bus.gain.value), now);
    music.bus.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
  }

  function unlockAudio() {
    const ctx = ensureAudio();
    if (ctx && ctx.state === "suspended") ctx.resume();
    startTitleMusic();
  }

  function buildForestAudio() {
    const ctx = ensureAudio();
    if (!ctx || forestAudio) return;
    const master = ctx.createGain();
    master.gain.value = 0.42;
    master.connect(ctx.destination);

    const dayBus = ctx.createGain();
    dayBus.gain.value = 0;
    dayBus.connect(master);
    const nightBus = ctx.createGain();
    nightBus.gain.value = 0;
    nightBus.connect(master);

    const wind = ctx.createBufferSource();
    const windBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const windData = windBuffer.getChannelData(0);
    for (let i = 0; i < windData.length; i += 1) windData[i] = Math.random() * 2 - 1;
    wind.buffer = windBuffer;
    wind.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = "highpass";
    windFilter.frequency.value = 700;
    const windGain = ctx.createGain();
    windGain.gain.value = 0.015;
    wind.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(dayBus);
    wind.start();

    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = "lowpass";
    droneFilter.frequency.value = 160;
    droneFilter.Q.value = 6;
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.2;
    droneFilter.connect(droneGain);
    droneGain.connect(nightBus);
    const droneA = ctx.createOscillator();
    droneA.type = "sawtooth";
    droneA.frequency.value = 52;
    const droneB = ctx.createOscillator();
    droneB.type = "sawtooth";
    droneB.frequency.value = 77;
    droneA.connect(droneFilter);
    droneB.connect(droneFilter);
    droneA.start();
    droneB.start();

    const air = ctx.createOscillator();
    air.type = "sine";
    air.frequency.value = 311;
    const airGain = ctx.createGain();
    airGain.gain.value = 0.035;
    air.connect(airGain);
    airGain.connect(nightBus);
    air.start();

    const growlFilter = ctx.createBiquadFilter();
    growlFilter.type = "lowpass";
    growlFilter.frequency.value = 120;
    growlFilter.Q.value = 2.4;
    const growlGain = ctx.createGain();
    growlGain.gain.value = 0;
    growlFilter.connect(growlGain);
    growlGain.connect(master);
    const growlBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const growlData = growlBuffer.getChannelData(0);
    for (let i = 0; i < growlData.length; i += 1) growlData[i] = Math.random() * 2 - 1;
    const growlNoise = ctx.createBufferSource();
    growlNoise.buffer = growlBuffer;
    growlNoise.loop = true;
    const growlNoiseGain = ctx.createGain();
    growlNoiseGain.gain.value = 1.4;
    growlNoise.connect(growlNoiseGain);
    growlNoiseGain.connect(growlFilter);
    growlNoise.start();
    const rumble = ctx.createOscillator();
    rumble.type = "sawtooth";
    rumble.frequency.value = 46;
    const rumbleGain = ctx.createGain();
    rumbleGain.gain.value = 0.85;
    rumble.connect(rumbleGain);
    rumbleGain.connect(growlFilter);
    rumble.start();

    forestAudio = {
      dayBus: dayBus,
      nightBus: nightBus,
      droneA: droneA,
      droneB: droneB,
      droneFilter: droneFilter,
      air: air,
      growlFilter: growlFilter,
      growlGain: growlGain,
      chirpAt: 0.4
    };
  }

  function playChirp() {
    if (!audioCtx || !forestAudio) return;
    const ctx = audioCtx;
    const now = ctx.currentTime;
    const notes = Math.random() < 0.5 ? 2 : 1;
    for (let n = 0; n < notes; n += 1) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      const start = now + n * 0.09;
      const freq = 1500 + Math.random() * 1600;
      osc.frequency.setValueAtTime(freq, start);
      osc.frequency.exponentialRampToValueAtTime(Math.max(480, freq * (0.72 + Math.random() * 0.4)), start + 0.07);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.075, start + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.15);
      osc.connect(gain);
      gain.connect(forestAudio.dayBus);
      osc.start(start);
      osc.stop(start + 0.17);
    }
  }

  function updateForestAudio(dt) {
    if (!audioCtx) return;
    if (audioCtx.state === "suspended") audioCtx.resume();
    if (!forestAudio) buildForestAudio();
    if (!forestAudio || !forestReady) return;
    const ctx = audioCtx;
    const now = ctx.currentTime;
    const night = Math.max(0, Math.min(1, nightBlend));
    forestAudio.dayBus.gain.setTargetAtTime(1 - night, now, 0.45);
    forestAudio.nightBus.gain.setTargetAtTime(night, now, 0.55);
    forestAudio.droneFilter.frequency.setTargetAtTime(130 + Math.sin(now * 0.23) * 36, now, 0.4);
    forestAudio.droneB.frequency.setTargetAtTime(74 + Math.sin(now * 0.11) * 6, now, 0.5);
    forestAudio.air.frequency.setTargetAtTime(294 + Math.sin(now * 0.07) * 18, now, 0.6);
    if (night < 0.62) {
      forestAudio.chirpAt -= dt;
      if (forestAudio.chirpAt <= 0) {
        playChirp();
        forestAudio.chirpAt = 0.28 + Math.random() * 1.35;
      }
    }
    let near = 0;
    if (wolf && wolf.visible && player) {
      const dist = Math.hypot(player.position.x - wolf.position.x, player.position.z - wolf.position.z);
      const reach = 16;
      if (dist < reach) {
        near = 1 - dist / reach;
        if (wolfMode === "chase" || wolfMode === "caught") near = Math.min(1, near * 1.25);
      }
    }
    const pulse = 0.72 + Math.sin(now * 9.5) * 0.28;
    const growlLevel = near <= 0 ? 0 : Math.min(1.8, (0.55 + near * 1.25) * pulse);
    forestAudio.growlGain.gain.setTargetAtTime(growlLevel, now, 0.05);
    forestAudio.growlFilter.frequency.setTargetAtTime(160 + near * 260, now, 0.08);
  }

  function updateForest(dt, time) {
    if (!caught && !nightIntro && !forestTutorial) forestClock += dt;
    const phase = forestPhase();
    const nightTarget = phase.isNight ? 1 : 0;
    if (!forestTutorial) nightBlend += (nightTarget - nightBlend) * Math.min(1, dt * 1.4);
    flameMeshes.forEach(function (flame, index) {
      const flick = 0.82 + Math.sin(time * 12 + index * 1.7) * 0.16 + Math.sin(time * 27 + index) * 0.07;
      flame.scale.y = Math.max(0.55, flick);
      flame.position.y = flame.userData.baseY + Math.sin(time * 10 + index) * 0.04;
    });
    if (campLight) campLight.intensity = 1.25 + Math.sin(time * 14) * 0.35;
    const inside = campDistance(player.position.x, player.position.z) <= campRadius ? 1 : 0;
    campGlow += (inside - campGlow) * Math.min(1, dt * 5);
    applyForestLight(campGlow);
    updateFalls(dt);
    updateAxe(dt);
    if (forestTutorial) {
      updateForestTutorial(dt, time);
      return;
    }
    const firstNight = phase.isNight && phase.dayNumber === 1 && !nightIntroPlayed;
    if (firstNight && nightBlend > 0.72 && !caught) beginNightIntro();
    updateForestSheep(dt, phase.isNight || !!nightIntro);
    updateHunger(dt);
    if (nightIntro) {
      updateNightIntro(dt);
      return;
    }
    updateWoodButtons(dt);
    if (firstNight && wolf) wolf.visible = false;
    else updateWolf(dt, time, phase.isNight);
    const clockLine = document.getElementById("sheep-count");
    clockLine.hidden = false;
    clockLine.textContent = (phase.isNight ? "Night " : "Day ") + phase.dayNumber + " · " + formatClock(phase.left);
  }

  const cloudPrev = { x: 0, z: -20.8 };

  function animate() {
    const dt = Math.min(0.05, clock.getDelta());
    const time = clock.elapsedTime;
    if (world === "meadow") {
      updateCloud(time, cloudPrev);
      portal.rotation.y = time * 0.6;
      portal.position.y = PADS[5].y + PADS[5].h + 1.55 + Math.sin(time * 2) * 0.08;
    } else if (forestReady) {
      updateForest(dt, time);
      updateForestAudio(dt);
    }
    updatePlayer(dt);
    if (world === "meadow") {
      updateSheep(dt, time);
      checkFinish();
    }
    updateCamera();
    if (nightIntro && nightIntro.t >= nightIntroMarks().endAt) endNightIntro();
    renderer.render(scene, camera);
  }

  function onResize() {
    if (!renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  document.addEventListener("pointerdown", unlockAudio, true);
  document.addEventListener("keydown", unlockAudio, true);

  window.HorrorObby = { start: start, stopTitle: stopTitleMusic };
})();
