import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

/* CYBERTWIN — all incident data is fictional and stays in this browser. */
const $ = (id) => document.getElementById(id);

const serviceInfo = {
  hospital: { name: "Hospital", icon: "🏥", description: "Supports emergency and patient-care services.", x: -6, z: -5, height: 2.8, color: 0x26869a },
  bank: { name: "Bank", icon: "🏦", description: "Represents secure digital banking services.", x: 6, z: -5, height: 3.5, color: 0x526b9b },
  school: { name: "School", icon: "🏫", description: "Represents learning and school information systems.", x: -6, z: 5, height: 2.4, color: 0x397e68 },
  traffic: { name: "Traffic Control", icon: "🚦", description: "Represents smart signals and city traffic monitoring.", x: 6, z: 5, height: 2.0, color: 0x9a7541 },
  power: { name: "Power Grid", icon: "⚡", description: "Represents the city's electricity distribution service.", x: 0, z: 0, height: 3.2, color: 0x65569b }
};

const scenarios = {
  traffic: {
    title: "Traffic overload",
    target: "traffic",
    short: "A sudden increase in requests slows the traffic-control service.",
    detect: "The model notices an unusually high number of sample requests.",
    defence: "A simulated traffic filter separates normal sample requests from the overload.",
    recover: "The traffic-control service is marked online again.",
    icon: "🚦"
  },
  ransomware: {
    title: "Ransomware warning",
    target: "school",
    short: "A fictional school computer is shown with its files locked.",
    detect: "The model flags an unexpected file-change pattern in sample data.",
    defence: "A simulated isolation step prevents the incident from spreading in the model.",
    recover: "A clean demo backup restores the school service.",
    icon: "🔒"
  },
  access: {
    title: "Suspicious login",
    target: "bank",
    short: "A fictional sign-in attempt does not match the expected access pattern.",
    detect: "The model detects a sample login from an unrecognised device.",
    defence: "A simulated access check blocks the sample sign-in and protects the service.",
    recover: "The bank service is checked and returned to normal.",
    icon: "🪪"
  },
  network: {
    title: "Network disruption",
    target: "power",
    short: "A virtual connection to the power-grid service becomes unavailable.",
    detect: "The model notices that a sample connection has stopped responding.",
    defence: "The control centre switches to a simulated backup route.",
    recover: "The power-grid service is marked online after the route check.",
    icon: "📡"
  }
};

const state = {
  services: Object.fromEntries(Object.keys(serviceInfo).map(k => [k, "online"])),
  selected: "hospital",
  incident: null,
  phase: "idle",
  blocked: 0,
  score: 100,
  sound: false
};

// ---------- Small interface helpers ----------
let toastTimer;

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2500);
}

function addLog(title, detail, kind = "cyan") {
  const li = document.createElement("li");
  const dot = document.createElement("span");
  dot.className = `activity-dot ${kind}`;

  const content = document.createElement("div");
  const strong = document.createElement("strong");
  strong.textContent = title;

  const small = document.createElement("small");
  small.textContent = detail;

  const time = document.createElement("time");
  time.textContent = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });

  content.append(strong, small);
  li.append(dot, content, time);
  $("activityLog").prepend(li);

  while ($("activityLog").children.length > 7) {
    $("activityLog").lastElementChild.remove();
  }
}

function updateDashboard() {
  const online = Object.values(state.services)
    .filter(v => v === "online").length;

  $("serviceCount").textContent = "05";
  $("onlineCount").textContent = String(online).padStart(2, "0");
  $("blockedCount").textContent = String(state.blocked).padStart(2, "0");

  $("securityScore").innerHTML =
    `${state.score}<span class="score-unit">/100</span>`;

  $("cityStatus").textContent =
    online === 5 ? "CITY PROTECTED" : "ATTENTION REQUIRED";

  $("cityStatus").style.color =
    online === 5 ? "var(--green)" : "var(--yellow)";

  $("selectedIcon").textContent = serviceInfo[state.selected].icon;
  $("selectedName").textContent = serviceInfo[state.selected].name;
  $("selectedDescription").textContent =
    serviceInfo[state.selected].description;

  const status = state.services[state.selected];

  $("selectedState").textContent = status.toUpperCase();
  $("selectedState").className = `service-state ${status}`;

  if (window.updateCity3D) {
    window.updateCity3D(state.services);
  }

  updateButtons();
}

function updateButtons() {
  const active = state.incident && state.phase !== "recovered";

  $("defendButton").disabled =
    !active || state.phase !== "detected";

  $("restoreButton").disabled =
    !active || state.phase !== "defended";

  document.querySelectorAll(".scenario-button").forEach(btn => {
    btn.disabled = Boolean(active);
  });
}

function setResponse(title, message, badge, phase) {
  $("responseBadge").textContent = badge;
  $("responseContent").innerHTML = "";

  const symbol = document.createElement("div");
  symbol.className = "response-symbol";

  symbol.textContent =
    phase === "detected" ? "⚠️" :
    phase === "defended" ? "🛡️" :
    phase === "recovered" ? "✅" : "🛡️";

  const copy = document.createElement("div");

  const strong = document.createElement("strong");
  strong.textContent = title;

  const p = document.createElement("p");
  p.textContent = message;

  copy.append(strong, p);
  $("responseContent").append(symbol, copy);

  ["Detect", "Defend", "Recover"].forEach((name, i) => {
    const step = $(`step${name}`);
    const activeStep = {
      idle: 0,
      detected: 0,
      defended: 1,
      recovered: 2
    }[phase] ?? 0;

    step.classList.toggle("active", i <= activeStep);
  });
}

function selectService(id) {
  if (!serviceInfo[id]) return;

  state.selected = id;
  updateDashboard();
  toast(`${serviceInfo[id].name} selected`);
}

// ---------- Sound effects ----------
let audioContext;

function beep(
  frequency = 660,
  duration = 0.11,
  type = "sine",
  volume = 0.045
) {
  if (!state.sound) return;

  try {
    audioContext ||= new (
      window.AudioContext || window.webkitAudioContext
    )();

    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;

    gain.gain.setValueAtTime(volume, audioContext.currentTime);

    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + duration
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch {
    // Sound is optional.
  }
}

function successSound() {
  beep(523, .1);
  setTimeout(() => beep(784, .16), 110);
}

function alertSound() {
  beep(260, .18, "triangle");
  setTimeout(() => beep(190, .2, "triangle"), 170);
}

// ---------- Celebration confetti ----------
function confettiBurst() {
  const colors = [
    "#43dce9",
    "#39dfa6",
    "#ffca65",
    "#a78bfa",
    "#ffffff"
  ];

  for (let i = 0; i < 42; i++) {
    const piece = document.createElement("i");

    piece.className = "confetti";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[i % colors.length];

    piece.style.setProperty(
      "--drift",
      `${(Math.random() - .5) * 220}px`
    );

    piece.style.animationDelay = `${Math.random() * .35}s`;

    document.body.append(piece);
    setTimeout(() => piece.remove(), 2300);
  }
}

// ---------- Incident simulation ----------
function startIncident(type) {
  if (state.incident && state.phase !== "recovered") {
    toast("Finish the current incident first.");
    return;
  }

  const scenario = scenarios[type];

  state.incident = { type, ...scenario };
  state.phase = "detected";

  state.services[scenario.target] = "warning";
  state.score = Math.max(45, state.score - 12);

  setResponse(
    `${scenario.title} detected`,
    `${scenario.detect} Target: ${serviceInfo[scenario.target].name}.`,
    "INCIDENT DETECTED",
    "detected"
  );

  addLog(
    `${scenario.title} detected`,
    `${serviceInfo[scenario.target].name}: ${scenario.short}`,
    "yellow"
  );

  updateDashboard();
  alertSound();
  toast(`${scenario.title}: simulated incident detected`);
}

function defendIncident() {
  if (!state.incident || state.phase !== "detected") return;

  const incident = state.incident;

  state.phase = "defended";
  state.services[incident.target] = "offline";

  state.blocked += 1;
  state.score = Math.min(100, state.score + 5);

  setResponse(
    "Defence applied",
    incident.defence,
    "THREAT CONTAINED",
    "defended"
  );

  addLog("Defence applied", incident.defence, "green");

  updateDashboard();
  successSound();

  toast("Threat contained in the simulation. Now restore the service.");
}

function restoreService() {
  if (!state.incident || state.phase !== "defended") return;

  const incident = state.incident;

  state.phase = "recovered";
  state.services[incident.target] = "online";
  state.score = Math.min(100, state.score + 7);

  setResponse(
    "Service recovered",
    incident.recover,
    "CITY SERVICE RESTORED",
    "recovered"
  );

  addLog(
    "Service restored",
    `${serviceInfo[incident.target].name} is back online.`,
    "green"
  );

  updateDashboard();
  successSound();
  confettiBurst();

  toast("Great work! The city service is back online.");

  state.incident = null;
  updateButtons();
}

function resetCity() {
  state.services = Object.fromEntries(
    Object.keys(serviceInfo).map(k => [k, "online"])
  );

  state.incident = null;
  state.phase = "idle";
  state.blocked = 0;
  state.score = 100;

  setResponse(
    "No active incident",
    "Select one of the practice scenarios to see how a cyber response works.",
    "STANDING BY",
    "idle"
  );

  $("activityLog").innerHTML = "";

  addLog(
    "Digital city reset",
    "All five services are online. The security score is 100.",
    "green"
  );

  updateDashboard();
  toast("City reset. All services are online.");
  successSound();
}

// ---------- Information popups ----------
function openModal(title, eyebrow, html) {
  $("modalTitle").textContent = title;
  $("modalEyebrow").textContent = eyebrow;
  $("modalBody").innerHTML = html;
  $("modalBackdrop").hidden = false;
  $("modalOk").focus();
}

function closeModal() {
  $("modalBackdrop").hidden = true;
}

function showHowItWorks() {
  openModal(
    "What makes this a Digital Twin?",
    "THE BIG IDEA",
    `
      <p>A Digital Twin is a virtual representation of a real-world system. In a full real-world deployment, data from sensors and connected systems can update the digital model.</p>
      <ul>
        <li><strong>Real system:</strong> a city with hospitals, banks, schools, roads and power services.</li>
        <li><strong>Data:</strong> information about whether each service is working normally.</li>
        <li><strong>Virtual model:</strong> the 3D city you can explore on this screen.</li>
        <li><strong>Simulation:</strong> try a fictional incident, apply a defence and restore a service.</li>
      </ul>
      <p><strong>Honest project note:</strong> this exhibition version uses sample data and local simulations. It is a learning prototype, not a live connection to a real city.</p>
    `
  );
}

function showTwinSteps() {
  openModal(
    "The 4 steps of a Digital Twin",
    "LEARN IN 30 SECONDS",
    `
      <ol>
        <li><strong>Represent:</strong> create a virtual model of a real-world system.</li>
        <li><strong>Collect data:</strong> receive information about the system. This demo uses clearly labelled sample data.</li>
        <li><strong>Monitor:</strong> display the condition of each service in the control centre.</li>
        <li><strong>Test and improve:</strong> simulate a problem, try a response and observe the result.</li>
      </ol>
      <p>Remember: a 3D picture alone is not a complete Digital Twin. Data and system behaviour make the model useful.</p>
    `
  );
}

// ---------- Three.js 3D city ----------
const canvas = $("cityCanvas");
const stage = $("cityStage");

let renderer, scene, camera, controls;
const buildingMeshes = {};
const statusMeshes = {};
const packetMeshes = [];
const clickableMeshes = [];

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

let selectedRing;

function material(color, extra = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: .65,
    metalness: .12,
    ...extra
  });
}

function makeLabel(text) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;

  const ctx = c.getContext("2d");

  ctx.clearRect(0, 0, c.width, c.height);
  ctx.fillStyle = "rgba(4,18,30,.84)";

  ctx.beginPath();
  ctx.roundRect(12, 18, 488, 92, 22);
  ctx.fill();

  ctx.strokeStyle = "rgba(69,216,232,.7)";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "#eafaff";
  ctx.font = "bold 42px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text.toUpperCase(), 256, 66);

  const texture = new THREE.CanvasTexture(c);

  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false
    })
  );

  sprite.scale.set(3.0, .75, 1);

  return sprite;
}

function addBox(parent, width, height, depth, x, y, z, mat) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    mat
  );

  mesh.position.set(x, y, z);
  parent.add(mesh);

  return mesh;
}

function buildBuilding(id, info) {
  const group = new THREE.Group();

  group.position.set(info.x, 0, info.z);
  scene.add(group);

  // Building platform
  addBox(
    group, 2.7, .18, 2.7,
    0, .09, 0,
    material(0x24465b)
  );

  // Main building
  const body = addBox(
    group,
    1.85,
    info.height,
    1.85,
    0,
    .18 + info.height / 2,
    0,
    material(info.color, { emissive: 0x061521 })
  );

  body.userData.serviceId = id;

  buildingMeshes[id] = body;
  clickableMeshes.push(body);

  // Roof
  addBox(
    group, 2.0, .16, 2.0,
    0, .26 + info.height, 0,
    material(0x9cecf0)
  );

  // Windows
  const rows = Math.max(2, Math.floor(info.height / .65));

  for (let row = 0; row < rows; row++) {
    for (const x of [-.48, .48]) {
      addBox(
        group,
        .28, .25, .045,
        x, .48 + row * .62, .95,
        material(0x8cecff, {
          emissive: 0x14556b,
          emissiveIntensity: .65
        })
      );
    }
  }

  // Status light
  const status = new THREE.Mesh(
    new THREE.SphereGeometry(.16, 12, 10),
    new THREE.MeshStandardMaterial({
      color: 0x39dfa6,
      emissive: 0x167a59,
      emissiveIntensity: .8
    })
  );

  status.position.set(0, .48 + info.height, 0);
  group.add(status);

  statusMeshes[id] = status;

  // Building name
  const label = makeLabel(info.name);
  label.position.set(0, info.height + 1.05, 0);

  group.add(label);
}

function addPacketPath(id, info, index) {
  const from = new THREE.Vector3(0, 3.7, 0);

  const to = new THREE.Vector3(
    info.x,
    info.height + .65,
    info.z
  );

  const mid = new THREE.Vector3(
    (from.x + to.x) / 2,
    3.4,
    (from.z + to.z) / 2
  );

  const curve = new THREE.QuadraticBezierCurve3(
    from, mid, to
  );

  const points = curve.getPoints(24);

  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({
      color: 0x37cfe2,
      transparent: true,
      opacity: .42
    })
  );

  scene.add(line);

  const packet = new THREE.Mesh(
    new THREE.SphereGeometry(.085, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xb6fbff })
  );

  scene.add(packet);

  packetMeshes.push({
    mesh: packet,
    curve,
    offset: index / 5,
    serviceId: id
  });
}

function init3DCity() {
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "low-power"
    });

    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, 1.5)
    );

    renderer.setSize(
      stage.clientWidth,
      stage.clientHeight,
      false
    );

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = false;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x081a29);
    scene.fog = new THREE.Fog(0x081a29, 24, 48);

    camera = new THREE.PerspectiveCamera(
      43,
      stage.clientWidth / stage.clientHeight,
      .1,
      100
    );

    camera.position.set(14, 14, 17);

    controls = new OrbitControls(
      camera,
      renderer.domElement
    );

    controls.target.set(0, .8, 0);
    controls.enableDamping = true;
    controls.dampingFactor = .07;
    controls.minDistance = 10;
    controls.maxDistance = 27;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.update();

    // Lighting
    scene.add(
      new THREE.HemisphereLight(0xb8edff, 0x14283b, 2.0)
    );

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(8, 15, 10);
    scene.add(keyLight);

    // Ground
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      material(0x10283a)
    );

    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -.08;
    scene.add(ground);

    // Grid
    const grid = new THREE.GridHelper(
      28, 28, 0x28627a, 0x1a3b50
    );

    grid.position.y = .015;
    scene.add(grid);

    // Roads
    addBox(
      scene, 25, .08, 2.0,
      0, .015, 0,
      material(0x263d50)
    );

    addBox(
      scene, 2.0, .08, 25,
      0, .02, 0,
      material(0x263d50)
    );

    // Road markings
    for (let i = -10; i <= 10; i += 2) {
      addBox(
        scene, .75, .025, .07,
        i, .07, 0,
        material(0x8eb4c2)
      );

      addBox(
        scene, .07, .025, .75,
        0, .075, i,
        material(0x8eb4c2)
      );
    }

    // Create all five buildings
    Object.entries(serviceInfo).forEach(([id, info]) => {
      buildBuilding(id, info);
    });

    // Create network connections
    Object.entries(serviceInfo).forEach(([id, info], i) => {
      if (id !== "power") {
        addPacketPath(id, info, i);
      }
    });

    // Selected building ring
    selectedRing = new THREE.Mesh(
      new THREE.RingGeometry(1.45, 1.58, 48),
      new THREE.MeshBasicMaterial({
        color: 0x4ce4ed,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: .9
      })
    );

    selectedRing.rotation.x = -Math.PI / 2;
    selectedRing.position.y = .2;
    scene.add(selectedRing);

    update3DStatuses();

    canvas.addEventListener("pointerdown", onCanvasPointerDown);
    window.addEventListener("resize", resize3D);

    $("canvasLoading").classList.add("hidden");

    animate3D();

  } catch (error) {
    console.error("3D scene could not start:", error);

    $("canvasLoading").textContent =
      "3D view could not start. Try a modern browser with WebGL enabled.";
  }
}

function update3DStatuses() {
  for (const [id, mesh] of Object.entries(statusMeshes)) {
    const status = state.services[id];

    const color =
      status === "online" ? 0x39dfa6 :
      status === "warning" ? 0xffca65 :
      0xff647c;

    mesh.material.color.setHex(color);
    mesh.material.emissive.setHex(color);

    const body = buildingMeshes[id];

    body.material.color.setHex(
      status === "offline" ? 0x56616d : serviceInfo[id].color
    );

    body.material.emissive.setHex(
      status === "online" ? 0x061521 : color
    );

    body.material.emissiveIntensity =
      status === "online" ? .08 : .38;
  }

  if (selectedRing && serviceInfo[state.selected]) {
    selectedRing.position.x = serviceInfo[state.selected].x;
    selectedRing.position.z = serviceInfo[state.selected].z;
  }
}

window.updateCity3D = update3DStatuses;

function onCanvasPointerDown(event) {
  const rect = canvas.getBoundingClientRect();

  pointer.x =
    ((event.clientX - rect.left) / rect.width) * 2 - 1;

  pointer.y =
    -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  const hits = raycaster.intersectObjects(
    clickableMeshes,
    false
  );

  if (hits.length) {
    const id = hits[0].object.userData.serviceId;

    if (id) {
      state.selected = id;
      updateDashboard();
      beep(720, .07);
    }
  }
}

function resize3D() {
  if (!renderer || !camera) return;

  const width = Math.max(1, stage.clientWidth);
  const height = Math.max(1, stage.clientHeight);

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height, false);
}

const clock = new THREE.Clock();

function animate3D() {
  requestAnimationFrame(animate3D);

  const elapsed = clock.getElapsedTime();

  controls.update();

  packetMeshes.forEach(packet => {
    const t = (elapsed * .12 + packet.offset) % 1;

    packet.mesh.position.copy(
      packet.curve.getPoint(t)
    );

    packet.mesh.visible =
      state.services[packet.serviceId] !== "offline";
  });

  if (selectedRing) {
    selectedRing.material.opacity =
      .58 + Math.sin(elapsed * 3) * .22;
  }

  renderer.render(scene, camera);
}

// ---------- UI events ----------
document.querySelectorAll(".scenario-button").forEach(button => {
  button.addEventListener("click", () => {
    startIncident(button.dataset.scenario);
  });
});

$("defendButton").addEventListener("click", defendIncident);
$("restoreButton").addEventListener("click", restoreService);
$("resetButton").addEventListener("click", resetCity);

$("helpButton").addEventListener("click", showHowItWorks);
$("learnButton").addEventListener("click", showTwinSteps);

$("modalClose").addEventListener("click", closeModal);
$("modalOk").addEventListener("click", closeModal);

$("modalBackdrop").addEventListener("click", event => {
  if (event.target === $("modalBackdrop")) {
    closeModal();
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeModal();
});

$("soundToggle").addEventListener("click", () => {
  state.sound = !state.sound;

  $("soundToggle").setAttribute(
    "aria-pressed",
    String(state.sound)
  );

  $("soundToggle").innerHTML = state.sound
    ? "🔊 <span>Sound on</span>"
    : "🔇 <span>Sound off</span>";

  if (state.sound) {
    beep(660, .08);
    toast("Sound effects enabled");
  } else {
    toast("Sound effects muted");
  }
});

// ---------- Start the project ----------
updateDashboard();

setResponse(
  "No active incident",
  "Select one of the practice scenarios to see how a cyber response works.",
  "STANDING BY",
  "idle"
);

addLog(
  "Digital city started",
  "Five virtual services are online. No real systems are connected.",
  "green"
);

init3DCity();