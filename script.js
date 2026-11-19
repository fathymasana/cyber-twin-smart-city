import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

/* ==========================================
   CYBERSHIELD - DIGITAL TWIN SMART CITY
   Complete educational simulation
========================================== */

const $ = (id) => document.getElementById(id);

const state = {
  selected: "hospital",
  incident: null,
  phase: "idle",
  blocked: 0,
  score: 100,
  sound: false,
  services: {
    hospital: "online",
    police: "online",
    power: "online",
    water: "online",
    traffic: "online"
  }
};

const services = {
  hospital: {
    name: "Hospital",
    icon: "🏥",
    description: "Supports emergency and patient-care services.",
    position: [-5, 0, -3],
    color: 0x36d9bb
  },
  police: {
    name: "Police Station",
    icon: "🚓",
    description: "Protects public safety and emergency communications.",
    position: [5, 0, -3],
    color: 0x45aaff
  },
  power: {
    name: "Power Grid",
    icon: "⚡",
    description: "Supplies electricity to essential city services.",
    position: [-5, 0, 4],
    color: 0xffca65
  },
  water: {
    name: "Water Plant",
    icon: "💧",
    description: "Monitors the city's water supply system.",
    position: [5, 0, 4],
    color: 0x45b9ed
  },
  traffic: {
    name: "Traffic Control",
    icon: "🚦",
    description: "Manages smart signals and road monitoring.",
    position: [0, 0, 0],
    color: 0x39dfa6
  }
};

const scenarios = {
  traffic: {
    title: "Traffic Overload",
    target: "traffic",
    icon: "🚦",
    description:
      "The simulator has detected an unusually high number of fictional traffic requests. Traffic control is under pressure.",
    detect:
      "ANOMALY DETECTED: Sample traffic activity is much higher than the normal baseline.",
    defend:
      "DEFENCE APPLIED: The simulated traffic filter has isolated abnormal sample requests.",
    recover:
      "RECOVERY COMPLETE: Traffic control has returned to normal operation.",
    risk: 12
  },

  ransom: {
    title: "Ransomware Warning",
    target: "hospital",
    icon: "🔒",
    description:
      "The hospital's fictional file-monitoring system has detected unusual file changes. Patient services require protection.",
    detect:
      "ANOMALY DETECTED: Sample file activity is outside the normal pattern.",
    defend:
      "DEFENCE APPLIED: The simulated file system has been isolated and protected.",
    recover:
      "RECOVERY COMPLETE: Hospital services have been restored using a fictional clean backup.",
    risk: 20
  },

  login: {
    title: "Suspicious Login",
    target: "police",
    icon: "🪪",
    description:
      "A fictional login record shows an unfamiliar sign-in attempt from an unrecognised device.",
    detect:
      "ANOMALY DETECTED: The sample sign-in does not match the trusted device pattern.",
    defend:
      "DEFENCE APPLIED: The simulated account has been temporarily locked pending verification.",
    recover:
      "RECOVERY COMPLETE: The fictional account has been verified and securely reopened.",
    risk: 10
  },

  network: {
    title: "Network Disruption",
    target: "power",
    icon: "📡",
    description:
      "The virtual power grid has experienced a simulated communication interruption.",
    detect:
      "ANOMALY DETECTED: The sample connection has stopped responding.",
    defend:
      "DEFENCE APPLIED: The affected virtual connection has been isolated.",
    recover:
      "RECOVERY COMPLETE: A simulated backup connection has restored communication.",
    risk: 18
  }
};


/* ==========================================
   SOUND EFFECTS
========================================== */

let audioContext = null;

function playSound(type = "click") {
  if (!state.sound) return;

  try {
    if (!audioContext) {
      audioContext = new (
        window.AudioContext || window.webkitAudioContext
      )();
    }

    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    const sounds = {
      click: [550, 0.08],
      alert: [180, 0.3],
      success: [850, 0.16],
      recovery: [1050, 0.25]
    };

    const [frequency, duration] = sounds[type] || sounds.click;

    oscillator.frequency.setValueAtTime(
      frequency,
      audioContext.currentTime
    );

    if (type === "alert") {
      oscillator.type = "sawtooth";
    } else {
      oscillator.type = "sine";
    }

    gain.gain.setValueAtTime(
      0.0001,
      audioContext.currentTime
    );

    gain.gain.exponentialRampToValueAtTime(
      0.12,
      audioContext.currentTime + 0.02
    );

    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      audioContext.currentTime + duration
    );

    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);

  } catch (error) {
    console.warn("Sound unavailable:", error);
  }
}


/* ==========================================
   NOTIFICATIONS AND CONFETTI
========================================== */

let toastTimer;

function showToast(message) {
  const toast = $("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

function celebrate() {
  const symbols = ["🎉", "✨", "🛡️", "⭐"];

  for (let i = 0; i < 45; i++) {
    const piece = document.createElement("div");

    piece.className = "confetti";
    piece.textContent = symbols[
      Math.floor(Math.random() * symbols.length)
    ];

    piece.style.left = Math.random() * 100 + "vw";
    piece.style.setProperty(
      "--drift",
      (Math.random() * 220 - 110) + "px"
    );

    piece.style.animationDelay = Math.random() * 0.7 + "s";

    document.body.appendChild(piece);

    setTimeout(() => piece.remove(), 2800);
  }
}


/* ==========================================
   ACTIVITY LOG
========================================== */

function addLog(title, description, type = "normal") {
  const log = $("log");
  if (!log) return;

  const li = document.createElement("li");
  const dot = document.createElement("i");
  const content = document.createElement("span");
  const heading = document.createElement("b");
  const detail = document.createElement("small");
  const time = document.createElement("time");

  const colors = {
    normal: "#39dfa6",
    warning: "#ffca65",
    danger: "#ff647c",
    success: "#26e6ce"
  };

  dot.style.background = colors[type] || colors.normal;

  heading.textContent = title;
  detail.textContent = description;

  time.textContent = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });

  content.append(heading, detail);
  li.append(dot, content, time);

  log.prepend(li);

  while (log.children.length > 9) {
    log.lastElementChild.remove();
  }
}


/* ==========================================
   DASHBOARD UPDATES
========================================== */

function updateDashboard() {
  const online = Object.values(state.services)
    .filter(status => status === "online").length;

  if ($("onlineCount")) {
    $("onlineCount").textContent = String(online).padStart(2, "0");
  }

  if ($("blockedCount")) {
    $("blockedCount").textContent = String(state.blocked).padStart(2, "0");
  }

  if ($("score")) {
    $("score").innerHTML = `${state.score}<small>/100</small>`;
  }

  if ($("cityStatus")) {
    $("cityStatus").textContent =
      online === 5 ? "CITY PROTECTED" : "CITY UNDER ALERT";

    $("cityStatus").style.color =
      online === 5 ? "#39dfa6" : "#ffca65";
  }

  update3DStatuses();
}


function updateSelectedService() {
  const service = services[state.selected];
  if (!service) return;

  $("selectedIcon").textContent = service.icon;
  $("selectedName").textContent = service.name;
  $("selectedDesc").textContent = service.description;

  const status = state.services[state.selected];
  const badge = $("selectedState");

  badge.textContent = status.toUpperCase();
  badge.className = "state " + status;
}


/* ==========================================
   INCIDENT RESPONSE DISPLAY
========================================== */

function updateResponseSteps(phase) {
  const steps = {
    detect: $("detectStep"),
    defend: $("defendStep"),
    recover: $("recoverStep")
  };

  const order = ["detect", "defend", "recover"];
  const activeIndex = order.indexOf(phase);

  order.forEach((name, index) => {
    steps[name].classList.toggle(
      "active",
      index <= activeIndex
    );
  });
}


function updateResponseText(icon, message, title, tag) {
  $("responseIcon").textContent = icon;
  $("responseText").textContent = message;
  $("responseTitle").textContent = title;
  $("responseTag").textContent = tag;
}


/* ==========================================
   SIMULATED INCIDENTS
========================================== */

function startIncident(type) {
  if (!scenarios[type]) return;

  if (state.incident && state.phase !== "recovered") {
    showToast("Complete or reset the current incident first!");
    return;
  }

  const incident = scenarios[type];

  state.incident = type;
  state.phase = "detected";

  state.services[incident.target] = "warning";

  state.score = Math.max(0, state.score - incident.risk);

  $("defend").disabled = false;
  $("restore").disabled = true;

  updateResponseSteps("detect");

  updateResponseText(
    "⚠️",
    incident.detect,
    incident.title + " detected!",
    "THREAT DETECTED"
  );

  updateSelectedService();
  updateDashboard();

  addLog(
    "⚠️ " + incident.title + " detected",
    incident.description,
    "warning"
  );

  playSound("alert");

  showToast("⚠️ Cyber incident detected!");

  animateThreat(incident.target);
}


function defendIncident() {
  if (!state.incident || state.phase !== "detected") {
    return;
  }

  const incident = scenarios[state.incident];

  state.phase = "defended";
  state.blocked++;

  state.services[incident.target] = "warning";

  $("defend").disabled = true;
  $("restore").disabled = false;

  updateResponseSteps("defend");

  updateResponseText(
    "🛡️",
    incident.defend,
    "Threat successfully contained",
    "DEFENCE ACTIVE"
  );

  updateSelectedService();
  updateDashboard();

  addLog(
    "🛡️ Threat contained",
    "The simulated defence system protected " + incident.target + ".",
    "success"
  );

  playSound("success");

  showToast("🛡️ Defence successfully applied!");

  celebrate();
}


function recoverIncident() {
  if (!state.incident || state.phase !== "defended") {
    return;
  }

  const incident = scenarios[state.incident];

  state.phase = "recovered";

  state.services[incident.target] = "online";

  state.score = Math.min(100, state.score + 8);

  $("defend").disabled = true;
  $("restore").disabled = true;

  updateResponseSteps("recover");

  updateResponseText(
    "🎉",
    incident.recover,
    "City service recovered!",
    "RECOVERY COMPLETE"
  );

  updateSelectedService();
  updateDashboard();

  addLog(
    "✅ Service restored",
    incident.target + " has returned to normal operation.",
    "success"
  );

  playSound("recovery");

  showToast("🎉 Service successfully recovered!");

  celebrate();
}


function resetCity() {
  state.incident = null;
  state.phase = "idle";
  state.blocked = 0;
  state.score = 100;

  Object.keys(state.services).forEach(id => {
    state.services[id] = "online";
  });

  $("defend").disabled = true;
  $("restore").disabled = true;

  updateResponseSteps("detect");

  updateResponseText(
    "🛡️",
    "Select a practice scenario to see how a cyber response works.",
    "No active incident",
    "STANDING BY"
  );

  updateSelectedService();
  updateDashboard();

  addLog(
    "🔄 City reset",
    "All virtual city services returned to normal.",
    "success"
  );

  playSound("click");

  showToast("City successfully reset!");
}


/* ==========================================
   MODAL POPUPS
========================================== */

function openModal(title, html) {
  $("modalTitle").textContent = title;
  $("modalText").innerHTML = html;
  $("overlay").hidden = false;
}

function closeModal() {
  $("overlay").hidden = true;
}

function showHelp() {
  openModal(
    "What is a Digital Twin?",
    `
      <p>
        A <b>Digital Twin</b> is a virtual representation
        of a real-world object, place or system.
      </p>

      <p>
        Our project creates a virtual smart city containing
        five important services.
      </p>

      <ul>
        <li>🏥 Hospital – healthcare services</li>
        <li>🚓 Police – public safety</li>
        <li>⚡ Power Grid – electricity</li>
        <li>💧 Water Plant – water supply</li>
        <li>🚦 Traffic Control – smart roads</li>
      </ul>

      <p>
        <b>Cybersecurity</b> protects these connected services
        from digital threats.
      </p>

      <p>
        This exhibition uses fictional data and local
        simulations. It does not connect to real infrastructure.
      </p>
    `
  );
}

function showSteps() {
  openModal(
    "How CyberShield Works",
    `
      <ol>
        <li><b>Observe:</b> Explore the virtual 3D smart city.</li>
        <li><b>Detect:</b> Start a simulated cyber incident.</li>
        <li><b>Analyse:</b> Observe the affected city service.</li>
        <li><b>Defend:</b> Apply a simulated security measure.</li>
        <li><b>Recover:</b> Restore the affected service.</li>
      </ol>

      <p>
        The security score represents the educational
        simulation's security condition, not a real security audit.
      </p>

      <p>
        <b>Remember:</b> Never test attacks on real networks
        or computer systems without permission.
      </p>
    `
  );
}


/* =====================================================
   THREE.JS 3D SMART CITY ENGINE
===================================================== */

let scene, camera, renderer, controls;
let raycaster, pointer;

let buildingMeshes = {};
let buildingParts = {};
let networkLines = [];
let packets = [];

let cityReady = false;
let animationFrame = null;
let threatTarget = null;

const clock = new THREE.Clock();

/* ---------- CREATE TEXT LABELS ---------- */

function createLabel(text, color = "#ffffff") {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;

    const context = canvas.getContext("2d");

    context.fillStyle = "rgba(10, 20, 40, 0.85)";
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.strokeStyle = color;
    context.lineWidth = 5;
    context.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);

    context.font = "bold 38px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = color;
    context.fillText(text, 256, 64);

    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(5, 1.25, 1);

    return sprite;
}

/* ---------- CREATE CITY BUILDINGS ---------- */

function createBuilding(id, service) {
    const group = new THREE.Group();

    const baseColor = new THREE.Color(service.color);

    const buildingMaterial = new THREE.MeshStandardMaterial({
        color: baseColor,
        emissive: baseColor,
        emissiveIntensity: 0.15,
        metalness: 0.45,
        roughness: 0.35
    });

    const body = new THREE.Mesh(
        new THREE.BoxGeometry(2.5, 3.5, 2.5),
        buildingMaterial
    );

    body.position.y = 1.75;
    body.userData.serviceId = id;
    group.add(body);

    const roof = new THREE.Mesh(
        new THREE.BoxGeometry(2.7, 0.2, 2.7),
        new THREE.MeshStandardMaterial({
            color: 0x263b59,
            metalness: 0.6,
            roughness: 0.3
        })
    );

    roof.position.y = 3.55;
    roof.userData.serviceId = id;
    group.add(roof);

    // Glowing windows
    const windowMaterial = new THREE.MeshBasicMaterial({
        color: 0x8be9ff
    });

    for (let y = 0.8; y <= 2.8; y += 0.8) {
        for (let x = -0.7; x <= 0.7; x += 0.7) {
            const windowMesh = new THREE.Mesh(
                new THREE.BoxGeometry(0.35, 0.35, 0.06),
                windowMaterial
            );

            windowMesh.position.set(x, y, 1.27);
            windowMesh.userData.serviceId = id;
            group.add(windowMesh);
        }
    }

    group.position.set(
        service.position[0],
        0,
        service.position[2]
    );

    group.userData.serviceId = id;

    scene.add(group);

    buildingMeshes[id] = group;
    buildingParts[id] = {
        body,
        roof,
        material: buildingMaterial
    };

    const label = createLabel(
        service.name,
        "#ffffff"
    );

    label.position.set(
        service.position[0],
        4.7,
        service.position[2]
    );

    scene.add(label);
}

/* ---------- CREATE CITY GROUND ---------- */

function createGround() {
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(45, 45),
        new THREE.MeshStandardMaterial({
            color: 0x101f32,
            roughness: 0.9,
            metalness: 0.1
        })
    );

    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.15;
    scene.add(ground);

    const grid = new THREE.GridHelper(
        45,
        45,
        0x247ba0,
        0x18334c
    );

    grid.position.y = -0.12;
    scene.add(grid);

    // City roads
    const roadMaterial = new THREE.MeshStandardMaterial({
        color: 0x263447,
        roughness: 0.85
    });

    const road1 = new THREE.Mesh(
        new THREE.BoxGeometry(45, 0.04, 2.2),
        roadMaterial
    );

    road1.position.set(0, -0.08, 0);
    scene.add(road1);

    const road2 = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 0.04, 45),
        roadMaterial
    );

    road2.position.set(0, -0.07, 0);
    scene.add(road2);
}

/* ---------- CREATE DECORATIVE TREES ---------- */

function createTrees() {
    const positions = [
        [-9, -8], [9, -8],
        [-9, 8], [9, 8],
        [-13, 0], [13, 0],
        [0, -12], [0, 12],
        [-15, -12], [15, 12]
    ];

    positions.forEach(([x, z]) => {
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12, 0.18, 1, 8),
            new THREE.MeshStandardMaterial({
                color: 0x80552f
            })
        );

        trunk.position.set(x, 0.5, z);
        scene.add(trunk);

        const leaves = new THREE.Mesh(
            new THREE.SphereGeometry(0.65, 12, 12),
            new THREE.MeshStandardMaterial({
                color: 0x20a66a,
                roughness: 0.8
            })
        );

        leaves.position.set(x, 1.3, z);
        scene.add(leaves);
    });
}

/* ---------- CREATE NETWORK CONNECTIONS ---------- */

function createNetwork() {
    const hub = new THREE.Vector3(0, 1.2, 0);

    Object.entries(services).forEach(([id, service]) => {
        const end = new THREE.Vector3(
            service.position[0],
            1.5,
            service.position[2]
        );

        const curve = new THREE.QuadraticBezierCurve3(
            hub,
            new THREE.Vector3(
                service.position[0] * 0.5,
                3,
                service.position[2] * 0.5
            ),
            end
        );

        const points = curve.getPoints(50);

        const geometry = new THREE.BufferGeometry()
            .setFromPoints(points);

        const material = new THREE.LineBasicMaterial({
            color: 0x18bde8,
            transparent: true,
            opacity: 0.55
        });

        const line = new THREE.Line(geometry, material);
        scene.add(line);

        networkLines.push({
            id,
            line,
            curve
        });

        // Moving network packet
        const packet = new THREE.Mesh(
            new THREE.SphereGeometry(0.13, 12, 12),
            new THREE.MeshBasicMaterial({
                color: 0x55eaff
            })
        );

        scene.add(packet);

        packets.push({
            id,
            mesh: packet,
            curve,
            progress: Math.random()
        });
    });
}

/* ---------- INITIALIZE THE 3D CITY ---------- */

function init3D() {
    const canvas = $("cityCanvas");
    const loading = $("loading");

    if (!canvas) {
        console.error("3D canvas with id cityCanvas was not found.");
        return;
    }

    try {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x071426);
        scene.fog = new THREE.Fog(0x071426, 25, 65);

        camera = new THREE.PerspectiveCamera(
            50,
            canvas.clientWidth / Math.max(canvas.clientHeight, 1),
            0.1,
            1000
        );

        camera.position.set(17, 16, 20);

        renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: false
        });

        renderer.setPixelRatio(
            Math.min(window.devicePixelRatio, 2)
        );

        renderer.setSize(
            canvas.clientWidth,
            canvas.clientHeight
        );

        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.06;
        controls.maxPolarAngle = Math.PI / 2.05;
        controls.minDistance = 8;
        controls.maxDistance = 45;
        controls.target.set(0, 1, 0);

        // Lighting
        const ambient = new THREE.AmbientLight(
            0x9bbcff,
            1.4
        );

        scene.add(ambient);

        const mainLight = new THREE.DirectionalLight(
            0xffffff,
            2
        );

        mainLight.position.set(10, 20, 10);
        mainLight.castShadow = true;
        scene.add(mainLight);

        const blueLight = new THREE.PointLight(
            0x087cff,
            35,
            30
        );

        blueLight.position.set(-8, 8, -8);
        scene.add(blueLight);

        raycaster = new THREE.Raycaster();
        pointer = new THREE.Vector2();

        createGround();
        createTrees();

        Object.entries(services).forEach(([id, service]) => {
            createBuilding(id, service);
        });

        createNetwork();

        renderer.domElement.addEventListener(
            "pointerdown",
            handleCityClick
        );

        cityReady = true;

        if (loading) {
            loading.style.display = "none";
        }

        update3DStatuses();
        animate3D();

        addLog("3D smart city initialized successfully.");

    } catch (error) {
        console.error("3D city initialization failed:", error);

        if (loading) {
            loading.textContent =
                "3D city could not load. Check the browser console.";
        }
    }
}

/* ---------- UPDATE BUILDING STATUS COLORS ---------- */

function update3DStatuses() {
    if (!cityReady) return;

    Object.entries(services).forEach(([id, service]) => {
        const parts = buildingParts[id];

        if (!parts) return;

        const status = state.services[id];

        let color = new THREE.Color(service.color);

        if (status === "warning") {
            color = new THREE.Color(0xffb020);
        }

        if (status === "offline") {
            color = new THREE.Color(0xff334f);
        }

        if (status === "online") {
            color = new THREE.Color(service.color);
        }

        parts.material.color.copy(color);
        parts.material.emissive.copy(color);

        parts.material.emissiveIntensity =
            status === "warning" ? 0.65 :
            status === "offline" ? 0.9 : 0.15;
    });

    networkLines.forEach((item) => {
        const status = state.services[item.id];

        item.line.material.color.set(
            status === "offline" ? 0xff334f :
            status === "warning" ? 0xffb020 :
            0x18bde8
        );
    });
}

/* ---------- SELECT A BUILDING ---------- */

function handleCityClick(event) {
    if (!cityReady) return;

    const rect = renderer.domElement.getBoundingClientRect();

    pointer.x =
        ((event.clientX - rect.left) / rect.width) * 2 - 1;

    pointer.y =
        -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);

    const clickableObjects = [];

    Object.values(buildingMeshes).forEach((group) => {
        group.traverse((child) => {
            if (child.isMesh) {
                clickableObjects.push(child);
            }
        });
    });

    const hits = raycaster.intersectObjects(
        clickableObjects,
        false
    );

    if (hits.length > 0) {
        const serviceId = hits[0].object.userData.serviceId;

        if (serviceId && services[serviceId]) {
            state.selected = serviceId;
            updateSelectedService();
            playSound("click");
        }
    }
}

/* ---------- SIMULATED CYBER THREAT ---------- */

function animateThreat(serviceId) {
    threatTarget = serviceId;

    packets.forEach((packet) => {
        if (packet.id === serviceId) {
            packet.mesh.material.color.set(0xff334f);
            packet.mesh.scale.setScalar(1.8);
        } else {
            packet.mesh.material.color.set(0x55eaff);
            packet.mesh.scale.setScalar(1);
        }
    });
}

/* ---------- MAIN 3D ANIMATION LOOP ---------- */

function animate3D() {
    if (!renderer || !scene || !camera) return;

    animationFrame = requestAnimationFrame(animate3D);

    const elapsed = clock.getElapsedTime();

    packets.forEach((packet) => {
        packet.progress += 0.0025;

        if (packet.progress > 1) {
            packet.progress = 0;
        }

        const position = packet.curve.getPointAt(
            packet.progress
        );

        packet.mesh.position.copy(position);

        if (packet.id === threatTarget) {
            const pulse = 1.2 + Math.sin(elapsed * 8) * 0.4;
            packet.mesh.scale.setScalar(pulse);
        }
    });

    Object.values(buildingMeshes).forEach((group) => {
        group.position.y =
            Math.sin(elapsed * 1.2) * 0.025;
    });

    controls.update();
    renderer.render(scene, camera);
}

/* ---------- RESIZE THE 3D VIEW ---------- */

function resize3D() {
    if (!camera || !renderer) return;

    const canvas = renderer.domElement;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if (width === 0 || height === 0) return;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height, false);
}

window.addEventListener("resize", resize3D);
/* =====================================================
   SECTION 3: CONTROLS AND APPLICATION STARTUP
===================================================== */

/* ---------- SAFE BUTTON CONNECTION ---------- */

function connectButton(id, callback) {
    const element = document.getElementById(id);

    if (element) {
        element.addEventListener("click", callback);
    }
}

/* ---------- CONNECT ALL INTERACTIVE CONTROLS ---------- */

function setupEvents() {

    // Incident scenario cards
    document.querySelectorAll(".scenario-card").forEach(card => {
        card.addEventListener("click", () => {
            const scenario =
                card.dataset.case || card.dataset.scenario;

            if (scenario && scenarios[scenario]) {
                startIncident(scenario);
            }
        });
    });

    // Defend and recover buttons
    connectButton("defend", defendIncident);
    connectButton("restore", recoverIncident);

    // Reset simulation
    connectButton("reset", resetCity);
    connectButton("resetBtn", resetCity);

    // Help and instructions
    connectButton("helpBtn", showHelp);
    connectButton("help", showHelp);

    connectButton("stepsBtn", showSteps);
    connectButton("steps", showSteps);

    // Modal close buttons
    connectButton("close", closeModal);
    connectButton("closeModal", closeModal);
    connectButton("modalOk", closeModal);

    // Close modal when clicking outside its content
    const overlay = $("overlay");

    if (overlay) {
        overlay.addEventListener("click", event => {
            if (event.target === overlay) {
                closeModal();
            }
        });
    }

    // Sound on/off
    connectButton("soundBtn", () => {
        state.sound = !state.sound;

        const button = $("soundBtn");

        if (button) {
            button.textContent = state.sound
                ? "🔊 Sound On"
                : "🔇 Sound Off";
        }

        showToast(
            state.sound ? "Sound enabled" : "Sound disabled"
        );
    });

    // Optional incident report download button
    connectButton("reportBtn", downloadIncidentReport);

    // Escape key closes the help or instructions window
    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeModal();
        }
    });
}

/* ---------- DOWNLOAD INCIDENT RESPONSE REPORT ---------- */

function downloadIncidentReport() {

    const currentTime = new Date().toLocaleString();

    const logElement = $("log");

    const logText = logElement
        ? logElement.innerText
        : "No activity log available.";

    const serviceReport = Object.entries(state.services)
        .map(([id, status]) => {
            return `${services[id].name}: ${status.toUpperCase()}`;
        })
        .join("\n");

    const report = `
DIGITAL TWIN - CYBERSECURE SMART CITY
SIMULATED INCIDENT RESPONSE REPORT

Generated: ${currentTime}

----------------------------------------
SIMULATION SUMMARY
----------------------------------------

Security Score: ${state.score}
Blocked Incidents: ${state.blocked}
Simulation Phase: ${state.phase}

----------------------------------------
CITY SERVICE STATUS
----------------------------------------

${serviceReport}

----------------------------------------
ACTIVITY LOG
----------------------------------------

${logText}

----------------------------------------
IMPORTANT NOTICE
----------------------------------------

This report describes an educational simulation.
No real cyberattack or network activity occurred.
`;

    const file = new Blob(
        [report],
        { type: "text/plain" }
    );

    const url = URL.createObjectURL(file);

    const link = document.createElement("a");

    link.href = url;
    link.download = "smart-city-incident-report.txt";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    showToast("Incident report downloaded!");
}

/* ---------- START THE APPLICATION ---------- */

function startApplication() {

    console.log("Starting Cybersecure Smart City...");

    // Connect buttons and interactive controls
    setupEvents();

    // Set initial dashboard values
    if (
        $("selectedName") &&
        $("selectedIcon") &&
        $("selectedDesc") &&
        $("selectedState")
    ) {
        updateSelectedService();
    }

    updateDashboard();

    // Initially disable response buttons
    if ($("defend")) {
        $("defend").disabled = true;
    }

    if ($("restore")) {
        $("restore").disabled = true;
    }

    // Display initial instructions
    if (
        $("responseIcon") &&
        $("responseText") &&
        $("responseTitle")
    ) {
        updateResponseText();
    }

    // Add startup activity
    addLog("Cybersecure Smart City simulation started.");

    addLog("All city services are operating normally.");

    // Initialize the interactive 3D city
    init3D();

    console.log("Cybersecure Smart City is ready!");
}

/* ---------- RUN APPLICATION ---------- */

startApplication();