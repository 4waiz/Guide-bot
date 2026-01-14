// --- Imports for Three.js ---
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// ====================== SETTINGS ======================
const ROBOT_IP = "192.168.208.155";   // <-- CHANGE IF YOUR ESP32 IP CHANGES
const ROBOT_BASE = `http://${ROBOT_IP}`;

// ====================== AVATAR CONFIG ======================
const AVATAR_BASE_PATH = "./avatar/avatar/models/";
const AVATARS = [
  { id: "muhammad", label: "Muhammad", file: "muhammad.glb", gender: "male" },
  { id: "anna", label: "Anna", file: "anna.glb", gender: "female" },
  { id: "aki", label: "Aki", file: "aki.glb", gender: "male" },
  { id: "amari", label: "Amari", file: "amari.glb", gender: "female" },
  { id: "leo", label: "Leo", file: "leo.glb", gender: "male" },
  { id: "maya", label: "Maya", file: "maya.glb", gender: "female" },
  { id: "rose", label: "Rose", file: "rose.glb", gender: "female" },
  { id: "shonith", label: "Shonith", file: "shonith.glb", gender: "male" },
  { id: "tom", label: "Tom", file: "tom.glb", gender: "male" },
  { id: "wei", label: "Wei", file: "wei.glb", gender: "female" },
  { id: "zara", label: "Zara", file: "zara.glb", gender: "female" },
  { id: "zola", label: "Zola", file: "zola.glb", gender: "female" }
];
const DEFAULT_AVATAR_ID = "muhammad";

const STATUS_POLL_MS = 1200;
const FETCH_TIMEOUT_MS = 4000;

// ====================== UI ELEMENTS ======================
const speakBtn = document.getElementById("btn-speak");
const pathsBtn = document.getElementById("btn-paths");
const stopSpeechBtn = document.getElementById("btn-stop-speech");
const outputEl = document.getElementById("output");
const statusEl = document.getElementById("status");

// ====================== HELPERS ======================
function addLine(who, text) {
  const p = document.createElement("p");
  p.innerHTML = `<b>${who}:</b> ${text}`;
  outputEl.appendChild(p);
  outputEl.scrollTop = outputEl.scrollHeight;
}

function setStatus(txt) {
  statusEl.textContent = txt;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchWithTimeout(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    return res;
  } finally {
    clearTimeout(t);
  }
}

async function robotGet(path) {
  const url = `${ROBOT_BASE}${path}`;
  console.log("Robot request:", url);
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ====================== TTS (SPEAKING) ======================
function speak(text) {
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    // Try to pick an English voice (or Arabic if you prefer)
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find(x => /en/i.test(x.lang)) || voices[0];
    if (v) u.voice = v;
    u.rate = 1.0;
    u.pitch = 1.0;
    window.speechSynthesis.speak(u);
  } catch (e) {
    console.warn("TTS error:", e);
  }
}

stopSpeechBtn?.addEventListener("click", () => {
  window.speechSynthesis.cancel();
});

// ====================== FAQs ======================
let FAQ_ENTRIES = [];

async function loadFaqs() {
  try {
    const res = await fetch("./faqs.json", { cache: "no-store" });
    const data = await res.json();

    // Your file format is { entries: [...] }
    FAQ_ENTRIES = Array.isArray(data?.entries) ? data.entries : [];
    console.log("FAQs loaded:", FAQ_ENTRIES.length);
  } catch (e) {
    console.warn("Failed to load faqs.json:", e);
    FAQ_ENTRIES = [];
  }
}

function matchFaqAnswer(userText) {
  const t = userText.toLowerCase();
  let best = null;
  let bestScore = 0;

  for (const e of FAQ_ENTRIES) {
    const keys = Array.isArray(e.k) ? e.k : [];
    let score = 0;
    for (const k of keys) {
      if (t.includes(String(k).toLowerCase())) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      best = e;
    }
  }

  return bestScore > 0 ? best : null;
}

// ====================== COMMAND PARSING ======================
function parseCommand(text) {
  const t = text.toLowerCase();

  // HOME / BASE
  if (
    t.includes("back to home") ||
    t.includes("go home") ||
    t.includes("take me home") ||
    t.includes("home base") ||
    t.includes("take me to base") ||
    t.includes("take me to home") ||
    (t.includes("take me") && t.includes("home")) ||
    t.includes("base")
  ) {
    return { type: "home" };
  }

  // TARGETS (testing)
  if (t.includes("banana")) return { type: "target", name: "banana" };
  if (t.includes("apple"))  return { type: "target", name: "apple" };
  if (t.includes("orange")) return { type: "target", name: "orange" };

  // RIGHT / LEFT
  if (t.includes("take me right") || t.includes("go right") || t.includes("turn right")) {
    return { type: "target", name: "right" };
  }
  if (t.includes("take me left") || t.includes("go left") || t.includes("turn left")) {
    return { type: "target", name: "left" };
  }

  return { type: "faq" };
}

// ====================== ROBOT ACTIONS ======================
async function robotGoToTarget(name) {
  addLine("EDGE Guide", "Okay — follow the robot.");
  speak("Okay. Follow the robot.");

  await robotGet(`/api/go?name=${encodeURIComponent(name)}`);

  const st = await waitForRobotToFinish();

  if (st?.lastStopReason === "obstacle") {
    addLine("EDGE Guide", "Obstacle detected — robot stopped.");
    speak("Obstacle detected. Robot stopped.");
    return;
  }

  addLine("EDGE Guide", "You have reached.");
  speak("You have reached.");
}

async function robotGoHome() {
  addLine("EDGE Guide", "Okay — taking you back to home.");
  speak("Okay. Taking you back to home.");

  await robotGet(`/api/home`);

  const st = await waitForRobotToFinish();

  if (st?.lastStopReason === "obstacle") {
    addLine("EDGE Guide", "Obstacle detected — robot stopped.");
    speak("Obstacle detected. Robot stopped.");
    return;
  }

  addLine("EDGE Guide", "We are back at home base.");
  speak("We are back at home base.");
}

async function waitForRobotToFinish() {
  // Poll status until state becomes idle
  for (let i = 0; i < 60; i++) { // ~60 * 300ms = 18s max
    await sleep(300);
    try {
      const st = await robotGet("/api/status");
      console.log("Robot status:", st);

      if (st.state === "idle") return st;
    } catch (e) {
      // ignore transient errors while moving
    }
  }
  return null;
}

// ====================== ROBOT REACHABILITY ======================
async function pingRobot() {
  try {
    await robotGet("/api/status");
    setStatus(`✅ Robot reachable: ${ROBOT_IP}`);
    return true;
  } catch (e) {
    setStatus(`⚠️ Robot not reachable. Check IP: ${ROBOT_IP}`);
    return false;
  }
}

setInterval(pingRobot, STATUS_POLL_MS);

// ====================== SPEECH RECOGNITION ======================
let recognition = null;

function setupSpeech() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    setStatus("❌ SpeechRecognition not supported in this browser.");
    return;
  }

  recognition = new SpeechRec();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = "en-US";

  recognition.onresult = async (event) => {
    const text = event.results?.[0]?.[0]?.transcript || "";
    if (!text) return;

    addLine("You", text);

    // Try command
    const cmd = parseCommand(text);

    // If robot not reachable, still answer FAQ
    const reachable = await pingRobot();

    if (cmd.type === "target" && reachable) {
      try {
        await robotGoToTarget(cmd.name);
      } catch (e) {
        console.error(e);
        addLine("EDGE Guide", "I could not send the command to the robot.");
        speak("I could not send the command to the robot.");
      }
      return;
    }

if (cmd.type === "home" && reachable) {
      try {
        await robotGoHome();
      } catch (e) {
        console.error(e);
        addLine("EDGE Guide", "I could not send the home command to the robot.");
        speak("I could not send the home command to the robot.");
      }
      return;
    }

    // FAQ fallback
    const faq = matchFaqAnswer(text);
    if (faq?.a) {
      addLine("EDGE Guide", faq.a);
      speak(faq.a);
    } else {
      addLine("EDGE Guide", "I didn’t understand. Try: “Take me to banana”, “Take me right”, or “Take me back to home/base”.");
      speak("I didn’t understand. Try take me to banana, take me right, or take me back to home.");
    }
  };

  recognition.onerror = (e) => {
    console.warn("Speech error:", e);
    setStatus("⚠️ Speech error. Try again.");
  };

  recognition.onend = () => {
    speakBtn.disabled = false;
  };
}

speakBtn?.addEventListener("click", () => {
  if (!recognition) setupSpeech();
  if (!recognition) return;

  speakBtn.disabled = true;
  setStatus("🎙️ Listening...");
  recognition.start();
});

pathsBtn?.addEventListener("click", () => {
  addLine("EDGE Guide", `Commands:
- "Take me to banana"
- "Take me to apple"
- "Take me to orange"
- "Take me right"
- "Take me left"
- "Take me back to home"
- "Take me to base"`);
  addLine("EDGE Guide", `Robot IP: ${ROBOT_IP}`);
});

// ====================== INIT ======================
(async function init() {
  await loadFaqs();
  addLine("EDGE Guide", "Salam! I'm your AI assistant. Tap SPEAK and say: 'Take me to banana' (or apple/orange), or 'Take me right/left'.");
  speak("Salam. Tap speak and say, take me to banana.");
  await pingRobot();
})();

// ====================== THREE.JS AVATAR ======================
const avatarContainer = document.getElementById("avatar-container");
const avatarLoading = document.getElementById("avatar-loading");
const avatarThumbnails = document.getElementById("avatar-thumbnails");
const avatarPrevBtn = document.getElementById("avatar-prev");
const avatarNextBtn = document.getElementById("avatar-next");

let scene, camera, renderer;
let model;
let animationLoopStarted = false;
let currentAvatarId = DEFAULT_AVATAR_ID;

// Morph targets
let mouthParts = [];
let eyeParts = [];
let smileParts = [];
let browParts = [];

// Bones
let chestBone = null;
let shoulderL = null;
let shoulderR = null;

// Animation state
let nextBlinkTime = Date.now() + 2000 + Math.random() * 1200;
let headTarget = { x: 0, y: 0 };
let lastPointerLookTime = 0;
let nextIdleHeadTurn = Date.now() + 3500;
let pointerInAvatar = false;
let pointerNorm = { x: 0, y: 0 };

function initAvatar() {
  if (!avatarContainer) return;

  scene = new THREE.Scene();
  scene.background = null;

  camera = new THREE.PerspectiveCamera(
    45,
    avatarContainer.clientWidth / avatarContainer.clientHeight,
    0.1,
    100
  );
  camera.position.set(0, 1.7, 0.6);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(avatarContainer.clientWidth, avatarContainer.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  avatarContainer.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
  scene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
  dirLight.position.set(1, 2, 3);
  scene.add(dirLight);

  startAnimationLoop();
  loadAvatar(DEFAULT_AVATAR_ID);

  window.addEventListener("resize", () => {
    if (!camera || !renderer) return;
    camera.aspect = avatarContainer.clientWidth / avatarContainer.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(avatarContainer.clientWidth, avatarContainer.clientHeight);
  });

  avatarContainer.addEventListener("pointerenter", () => { pointerInAvatar = true; });
  avatarContainer.addEventListener("pointerleave", () => { pointerInAvatar = false; });
  avatarContainer.addEventListener("pointermove", (e) => {
    const rect = avatarContainer.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    pointerNorm.x = x * 2 - 1;
    pointerNorm.y = y * 2 - 1;
    lastPointerLookTime = Date.now();
  });
}

function loadAvatar(avatarId) {
  if (!scene) return;

  const avatar = AVATARS.find((a) => a.id === avatarId) || AVATARS[0];
  if (!avatar) return;
  if (currentAvatarId === avatar.id && model) return;

  currentAvatarId = avatar.id;

  document.querySelectorAll(".avatar-thumb").forEach((t) => {
    t.classList.toggle("selected", t.dataset.avatar === avatar.id);
  });

  if (avatarLoading) {
    avatarLoading.style.display = "flex";
    avatarLoading.textContent = `Loading ${avatar.label}...`;
  }

  mouthParts = [];
  eyeParts = [];
  smileParts = [];
  browParts = [];
  chestBone = null;
  shoulderL = null;
  shoulderR = null;

  if (model) {
    scene.remove(model);
    disposeModel(model);
    model = null;
  }

  const loader = new GLTFLoader();
  loader.load(
    `${AVATAR_BASE_PATH}${avatar.file}`,
    (gltf) => {
      if (avatar.id !== currentAvatarId) {
        disposeModel(gltf.scene);
        return;
      }

      model = gltf.scene;
      scene.add(model);
      if (avatarLoading) avatarLoading.style.display = "none";

      const mouthNames = ["jawOpen", "mouthOpen", "viseme_aa", "viseme_OH", "MouthOpen", "v_aa"];
      const eyeNames = ["eyeBlinkLeft", "eyeBlinkRight", "eyesClosed", "blink", "EyeBlink_L", "EyeBlink_R"];
      const smileNames = ["smile", "smileWide", "mouthSmile", "mouthSmileLeft", "mouthSmileBig", "mouthSmileRight"];
      const browNames = ["browInnerUp", "browUp", "BrowsUp", "browRaise"];

      model.traverse((child) => {
        if (child.isBone) {
          if (!chestBone && /chest|spine2|upperchest/i.test(child.name)) chestBone = child;
          if (!shoulderL && /shoulder.*(L|Left)/i.test(child.name)) shoulderL = child;
          if (!shoulderR && /shoulder.*(R|Right)/i.test(child.name)) shoulderR = child;
        }

        if (child.isMesh && child.morphTargetDictionary) {
          const dict = child.morphTargetDictionary;
          for (let name of mouthNames) {
            if (dict[name] !== undefined) { mouthParts.push({ mesh: child, index: dict[name] }); break; }
          }
          for (let name of eyeNames) {
            if (dict[name] !== undefined) { eyeParts.push({ mesh: child, index: dict[name] }); }
          }
          for (let name of smileNames) {
            if (dict[name] !== undefined) { smileParts.push({ mesh: child, index: dict[name] }); break; }
          }
          for (let name of browNames) {
            if (dict[name] !== undefined) { browParts.push({ mesh: child, index: dict[name] }); break; }
          }
        }
      });

      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const faceHeight = box.max.y - size.y * 0.12;
      camera.position.set(center.x, faceHeight, center.z + 0.55);
      camera.lookAt(center.x, faceHeight, center.z);
    },
    undefined,
    (err) => {
      console.error("Error loading GLB:", err);
      if (avatarLoading) avatarLoading.textContent = "Error loading avatar";
    }
  );
}

function startAnimationLoop() {
  if (animationLoopStarted) return;
  animationLoopStarted = true;
  animate();
}

function animate() {
  requestAnimationFrame(animate);
  const now = Date.now();
  const t = now * 0.001;

  if (model) {
    // Blink
    let blinkVal = 0;
    if (now > nextBlinkTime) {
      if (now < nextBlinkTime + 130) {
        blinkVal = 1;
      } else {
        nextBlinkTime = now + 2000 + Math.random() * 2000;
      }
    }
    eyeParts.forEach((p) => { p.mesh.morphTargetInfluences[p.index] = blinkVal; });

    // Breathing
    const breathe = Math.sin(t * 1.4) * 0.015;
    model.position.y = breathe;

    if (chestBone) chestBone.rotation.x = Math.sin(t * 1.5) * 0.04;
    if (shoulderL && shoulderR) {
      shoulderL.rotation.z = Math.sin(t * 0.8) * 0.03;
      shoulderR.rotation.z = -Math.sin(t * 0.8) * 0.03;
    }

    // Head movement
    const sinceLook = now - lastPointerLookTime;
    if (pointerInAvatar && sinceLook < 2500) {
      headTarget.y = THREE.MathUtils.clamp(pointerNorm.x * 0.35, -0.35, 0.35);
      headTarget.x = THREE.MathUtils.clamp(-pointerNorm.y * 0.2, -0.2, 0.2);
    } else {
      if (now > nextIdleHeadTurn) {
        headTarget.y = (Math.random() - 0.5) * 0.35;
        headTarget.x = (Math.random() - 0.5) * 0.12;
        nextIdleHeadTurn = now + 2000 + Math.random() * 4000;
      }
    }
    model.rotation.y = THREE.MathUtils.lerp(model.rotation.y, headTarget.y, 0.08);
    model.rotation.x = THREE.MathUtils.lerp(model.rotation.x, headTarget.x, 0.08);

    // Idle smile
    smileParts.forEach((p) => { p.mesh.morphTargetInfluences[p.index] = 0.25; });
    browParts.forEach((p) => { p.mesh.morphTargetInfluences[p.index] = 0.02; });
  }

  renderer.render(scene, camera);
}

function disposeModel(obj) {
  obj.traverse((child) => {
    if (child.isMesh) {
      if (child.geometry && child.geometry.dispose) child.geometry.dispose();
      const mat = child.material;
      if (Array.isArray(mat)) {
        mat.forEach((m) => m && m.dispose && m.dispose());
      } else if (mat && mat.dispose) {
        mat.dispose();
      }
    }
  });
}

// Avatar picker
if (avatarThumbnails) {
  avatarThumbnails.addEventListener("click", (e) => {
    const thumb = e.target.closest(".avatar-thumb");
    if (!thumb) return;
    const avatarId = thumb.dataset.avatar;
    if (avatarId) loadAvatar(avatarId);
  });
}

if (avatarPrevBtn && avatarThumbnails) {
  avatarPrevBtn.addEventListener("click", () => {
    avatarThumbnails.parentElement.scrollBy({ left: -100, behavior: "smooth" });
  });
}

if (avatarNextBtn && avatarThumbnails) {
  avatarNextBtn.addEventListener("click", () => {
    avatarThumbnails.parentElement.scrollBy({ left: 100, behavior: "smooth" });
  });
}

// Initialize avatar
initAvatar();
