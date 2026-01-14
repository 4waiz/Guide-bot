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

// Avatar selection
let currentAvatarId = DEFAULT_AVATAR_ID;

// Input modal state
let activeInputMode = "mic";
let resolveInput = null;
let recognition = null;
let isRecording = false;
let currentTranscript = "";
let currentUtterance = null;
let preferredVoice = null;
let availableVoices = [];
let retryListenTimeout = null;
let audioUnlocked = false;

// Voice-first (Siri-like) state
let voiceFirstRecognition = null;
let isVoiceFirstListening = false;
let voiceFirstTranscript = "";
let currentVoiceMode = "speak"; // "speak" or "paths"

// =======================
//  INIT
// =======================
setStatus("Loading avatar...");
setStopButton(false);
setGlowState("idle");
initAvatar();
setupAvatarPicker();
setupButtons();
setupInputModal();
initVoiceSelection();

// =======================
//  AVATAR INIT
// =======================
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

// =======================
//  OPENAI + BUTTON LOGIC
// =======================
function setupButtons() {
  if (!btnSpeak || !btnPaths) return;

  // Voice-first flow for Speak button (no modal)
  btnSpeak.addEventListener("click", () => {
    unlockAudioForIOS();
    handleVoiceFirst("speak");
  });

  // Voice-first flow for Paths button (no modal)
  btnPaths.addEventListener("click", () => {
    unlockAudioForIOS();
    handleVoiceFirst("paths");
  });

  if (stopSpeechBtn) {
    stopSpeechBtn.addEventListener("click", stopAllSpeechActivity);
  }
}

// =======================
//  GLOW STATE MANAGEMENT
// =======================
function setGlowState(state) {
  const rootEl = document.getElementById("root");
  // Avatar container glow (Siri ring)
  if (avatarContainer) {
    avatarContainer.classList.remove("state-idle", "state-listening", "state-thinking", "state-speaking");
    if (state) {
      avatarContainer.classList.add(`state-${state}`);
    }
  }

  // Edge glow (iOS-style screen edges)
  if (rootEl) {
    rootEl.classList.remove("ui-idle", "ui-listening", "ui-thinking", "ui-speaking");
    if (state) {
      rootEl.classList.add(`ui-${state}`);
    }
  }
}

// =======================
//  VOICE-FIRST FLOW (shared for Speak & Paths)
// =======================
function handleVoiceFirst(mode = "speak") {
  // If already listening, stop and process if we have transcript
  if (isVoiceFirstListening && voiceFirstRecognition) {
    voiceFirstRecognition.stop();
    return;
  }

  // Check if SpeechRecognition is supported
  if (!SpeechRecognition) {
    setStatus("Voice not supported — please type");
    setGlowState("idle");
    // Fallback to modal for typing
    handleInteraction(mode);
    return;
  }

  // Set mode and start voice-first listening
  currentVoiceMode = mode;
  startVoiceFirstListening();
}

function startVoiceFirstListening() {
  if (isVoiceFirstListening) return;

  voiceFirstRecognition = new SpeechRecognition();
  voiceFirstRecognition.lang = "en-US";
  voiceFirstRecognition.interimResults = true;
  voiceFirstRecognition.maxAlternatives = 1;
  voiceFirstRecognition.continuous = false;

  voiceFirstRecognition.onstart = () => {
    isVoiceFirstListening = true;
    voiceFirstTranscript = "";
    setStatus("Listening...");
    setGlowState("listening");
    setButtonsDisabled(false); // Keep speak button enabled to stop early
    setStopButton(true); // Enable stop button
    if (output) {
      output.innerHTML = `<strong>You:</strong> <span style="color:#64748b; font-style:italic;">Listening...</span>`;
    }
  };

  voiceFirstRecognition.onresult = (event) => {
    let interimTranscript = "";
    let finalTranscript = "";

    for (let i = 0; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        finalTranscript += result[0].transcript;
      } else {
        interimTranscript += result[0].transcript;
      }
    }

    // Show interim results
    const displayText = finalTranscript || interimTranscript;
    voiceFirstTranscript = displayText.trim();

    if (output && displayText) {
      const escaped = escapeHtml(displayText);
      output.innerHTML = `<strong>You:</strong> ${escaped}`;
    }
  };

  voiceFirstRecognition.onend = () => {
    isVoiceFirstListening = false;

    // Process the transcript if we have one
    if (voiceFirstTranscript) {
      processVoiceFirstInput(voiceFirstTranscript);
    } else {
      // No transcript captured
      setStatus("No speech detected — try again");
      setGlowState("idle");
      setStopButton(false);
      const buttonLabel = currentVoiceMode === "paths" ? "Paths" : "Speak";
      if (output) {
        output.innerHTML = `<strong>EDGE Guide:</strong> I didn't catch that. Tap ${buttonLabel} and try again.`;
      }
    }

    voiceFirstRecognition = null;
  };

  voiceFirstRecognition.onerror = (event) => {
    isVoiceFirstListening = false;
    voiceFirstRecognition = null;
    setStopButton(false);

    if (event.error === "not-allowed" || event.error === "permission-denied") {
      setStatus("Mic permission denied — please type");
      setGlowState("idle");
      // Fallback to modal
      handleInteraction(currentVoiceMode);
    } else if (event.error === "no-speech") {
      setStatus("No speech detected — try again");
      setGlowState("idle");
      const buttonLabel = currentVoiceMode === "paths" ? "Paths" : "Speak";
      if (output) {
        output.innerHTML = `<strong>EDGE Guide:</strong> I didn't hear anything. Tap ${buttonLabel} and try again.`;
      }
    } else {
      setStatus(`Mic error: ${event.error}`);
      setGlowState("idle");
    }
  };

  try {
    voiceFirstRecognition.start();
  } catch (err) {
    console.error("Failed to start voice recognition:", err);
    isVoiceFirstListening = false;
    voiceFirstRecognition = null;
    setStatus("Voice not supported — please type");
    setGlowState("idle");
    setStopButton(false);
    // Fallback to modal for typing
    handleInteraction(currentVoiceMode);
  }
}

async function processVoiceFirstInput(userInput) {
  try {
    setButtonsDisabled(true);
    setStopButton(true); // Keep stop button enabled during processing

    // Check moderation
    const moderationIssue = moderateInput(userInput);
    if (moderationIssue) {
      const bot = formatTextForOutput("EDGE Guide", moderationIssue);
      output.innerHTML = bot;
      setStatus("Ready");
      setGlowState("idle");
      setStopButton(false);
      setButtonsDisabled(false);
      return;
    }

    // Check for room directions first (applies to both modes)
    const roomAnswer = getRoomAnswer(userInput);
    if (roomAnswer) {
      const you = formatTextForOutput("You", userInput);
      const bot = formatTextForOutput("EDGE Guide", roomAnswer);
      output.innerHTML = `${you}<br><br>${bot}`;
      setStatus("Speaking...");
      setGlowState("speaking");
      await speakText(roomAnswer);
      setStatus("Ready");
      setGlowState("idle");
      setStopButton(false);
      setButtonsDisabled(false);
      return;
    }

    // Show thinking state
    setStatus("Thinking...");
    setGlowState("thinking");
    const you = formatTextForOutput("You", userInput);
    output.innerHTML = `${you}<br><br><strong>EDGE Guide:</strong> <span style="color:#64748b; font-style:italic;">Thinking...</span>`;

    // Get response using the current mode for system prompt
    const systemPrompt = buildSystemPrompt(currentVoiceMode);
    const reply = await callOpenAI(systemPrompt, userInput);

    // Display response
    const bot = formatTextForOutput("EDGE Guide", reply);
    output.innerHTML = `${you}<br><br>${bot}`;

    // Speak the response
    setStatus("Speaking...");
    setGlowState("speaking");
    await speakText(reply);

    setStatus("Ready");
    setGlowState("idle");
  } catch (err) {
    console.error("Voice-first processing error:", err);
    if (output) {
      output.innerHTML = `<strong>Error:</strong> ${escapeHtml(err.message || "Something went wrong.")}`;
    }
    setStatus("Error");
    setGlowState("idle");
  } finally {
    setButtonsDisabled(false);
    setStopButton(false);
  }
}

// Stop all speech activity (recognition + synthesis)
function stopAllSpeechActivity() {
  // Stop voice-first recognition if active
  if (voiceFirstRecognition && isVoiceFirstListening) {
    voiceFirstRecognition.abort();
    isVoiceFirstListening = false;
    voiceFirstRecognition = null;
  }

  // Stop modal recognition if active
  if (recognition && isRecording) {
    recognition.abort();
    isRecording = false;
    recognition = null;
  }

  // Stop speech synthesis
  stopSpeaking();

  // Reset all states
  setGlowState("idle");
  setStopButton(false);
  setButtonsDisabled(false);
  setStatus("Stopped");

  // Brief delay then show Ready
  setTimeout(() => {
    if (!isVoiceFirstListening && !isTalking) {
      setStatus("Ready");
    }
  }, 1000);
}

async function handleInteraction(kind) {
  try {
    setButtonsDisabled(true);
    setStatus("Waiting for your input...");

    const userInput = await openInputModal(kind);
    if (!userInput || !userInput.trim()) {
      setStatus("Ready");
      return;
    }

    const moderationIssue = moderateInput(userInput.trim());
    if (moderationIssue) {
      const bot = formatTextForOutput("EDGE Guide", moderationIssue);
      output.innerHTML = bot;
      setStatus("Ready");
      return;
    }

    const roomAnswer = getRoomAnswer(userInput);
    if (roomAnswer) {
      const you = formatTextForOutput("You", userInput.trim());
      const bot = formatTextForOutput("EDGE Guide", roomAnswer);
      output.innerHTML = `${you}<br><br>${bot}`;
      setStatus("Speaking...");
      await speakText(roomAnswer);
      setStatus("Ready");
      return;
    }

    const systemPrompt = buildSystemPrompt(kind);
    setStatus("Thinking...");
    const reply = await callOpenAI(systemPrompt, userInput.trim());

    const you = formatTextForOutput("You", userInput.trim());
    const bot = formatTextForOutput("EDGE Guide", reply);
    output.innerHTML = `${you}<br><br>${bot}`;

    setStatus("Speaking...");
    await speakText(reply);
    setStatus("Ready");
  } catch (err) {
    console.error(err);
    if (output) {
      output.innerHTML = `<strong>Error:</strong> ${escapeHtml(err.message || "Something went wrong with the AI call.")}`;
    }
    setStatus("Error");
  } finally {
    setButtonsDisabled(false);
    setStopButton(false);
  }
}

function buildSystemPrompt(kind) {
  if (kind === "paths") {
    return "You are an indoor navigation assistant at EDGE. The user is starting from the main lobby. Reply only in English with short, step-by-step walking directions within the building. Max 5 steps.";
  }
  return "You are a friendly AI guide in a technology training center called EDGE. Reply only in English. Keep answers concise and conversational.";
}

function setButtonsDisabled(disabled) {
  if (btnSpeak) btnSpeak.disabled = disabled;
  if (btnPaths) btnPaths.disabled = disabled;
}

function setStatus(text) {
  if (statusEl) statusEl.textContent = text || "";
}

// --- Local FAQ engine ---
function getSmallTalkAnswer(userMessage) {
  const txt = (userMessage || "").toLowerCase().trim();
  if (!txt) return "";

  const greetings = ["hello", "hi", "hey", "salam", "good morning", "good evening"];
  if (greetings.some((g) => txt.startsWith(g) || txt.includes(` ${g}`))) {
    return "Hi there! I am the EDGE guide. Ask me about the Learning & Innovation Factory programs, labs, or visits.";
  }

  if (txt.includes("how are you")) {
    return "I am doing great and ready to help you learn about the EDGE Learning & Innovation Factory.";
  }

  if (txt.includes("who are you") || txt.includes("what are you")) {
    return "I am the EDGE Learning & Innovation Factory guide. I can tell you about programs, labs, visits, and training options.";
  }

  if (txt.includes("thank")) {
    return "You are welcome! Let me know if you want details on programs, labs, or visits.";
  }

  return "";
}

function moderateInput(userMessage) {
  const txt = (userMessage || "").toLowerCase();
  if (!txt.trim()) return "";
  if (BAD_WORDS.some((bad) => txt.includes(bad))) {
    return "Please keep our chat respectful. I can help with EDGE questions, directions, and programs.";
  }
  return "";
}

function getRoomAnswer(userMessage) {
  const txt = (userMessage || "").toLowerCase();
  if (!txt.trim()) return "";
  for (const room of ROOM_RESPONSES) {
    if (room.match.some((m) => txt.includes(m))) {
      return room.answer;
    }
  }
  return "";
}

function findBestFaqAnswer(userMessage) {
  if (!Array.isArray(FAQS) || !FAQS.length) return "";
  const text = (userMessage || "").toLowerCase();
  if (!text.trim()) return "";

  let best = { score: 0, answer: "" };
  FAQS.forEach((item) => {
    let score = 0;
    item.k.forEach((kw) => {
      if (text.includes(kw)) score += 2;
    });
    if (item.q.toLowerCase().includes(text)) score += 1; // rough similarity boost
    if (score > best.score) best = { score, answer: item.a };
  });

  return best.score > 0 ? best.answer : "";
}

async function callOpenAI(systemPrompt, userMessage) {
  await ensureFaqsLoaded();
  const smallTalk = getSmallTalkAnswer(userMessage);
  if (smallTalk) return smallTalk;

  const answer = findBestFaqAnswer(userMessage);
  if (answer) return answer;
  return "I don't have that in my local notes yet. Ask about EDGE Learning & Innovation Factory programs, labs, visits, or training options.";
}

// =======================
//  INPUT MODAL + MIC
// =======================
function setupInputModal() {
  if (!inputModal) return;

  inputModal.addEventListener("click", (e) => {
    if (e.target === inputModal) closeInputModal(null);
  });

  if (inputClose) {
    inputClose.addEventListener("click", () => closeInputModal(null));
  }

  if (inputSubmit) {
    inputSubmit.addEventListener("click", submitInput);
  }

  if (inputTextarea) {
    inputTextarea.addEventListener("input", () => {
      currentTranscript = inputTextarea.value;
      clearRetryListening();
    });
    inputTextarea.addEventListener("focus", () => {
      switchInputMode("type");
      showKeyboardOverlay();
    });
    inputTextarea.addEventListener("click", () => {
      switchInputMode("type");
      showKeyboardOverlay();
    });
  }

  inputModeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.mode || "mic";
      switchInputMode(mode);
      if (mode === "type") {
        showKeyboardOverlay();
      } else {
        hideKeyboardOverlay();
      }
    });
  });

  if (onScreenKeyboard) {
    onScreenKeyboard.addEventListener("click", handleKeyboardClick);
  }

  if (keyboardOverlay) {
    keyboardOverlay.addEventListener("click", (e) => {
      if (e.target === keyboardOverlay) {
        hideKeyboardOverlay();
      }
    });
  }

  if (!micSupported) {
    updateMicStatus("Microphone capture is not supported in this browser. Use the on-screen keyboard instead.");
  }

  switchInputMode("mic");
}

function handleKeyboardClick(event) {
  const keyBtn = event.target.closest("button[data-key]");
  if (!keyBtn) return;
  event.preventDefault();
  applyKeyboardInput(keyBtn.dataset.key);
}

function applyKeyboardInput(key) {
  if (!inputTextarea) return;

  const start = inputTextarea.selectionStart ?? inputTextarea.value.length;
  const end = inputTextarea.selectionEnd ?? inputTextarea.value.length;
  let value = inputTextarea.value;
  let cursor = end;

  if (key === "backspace") {
    if (start !== end) {
      value = value.slice(0, start) + value.slice(end);
      cursor = start;
    } else if (start > 0) {
      value = value.slice(0, start - 1) + value.slice(end);
      cursor = start - 1;
    }
  } else if (key === "space") {
    value = value.slice(0, start) + " " + value.slice(end);
    cursor = start + 1;
  } else if (key === "clear") {
    value = "";
    cursor = 0;
  } else if (key === "enter") {
    value = value.slice(0, start) + "\n" + value.slice(end);
    cursor = start + 1;
  } else if (key && key.length) {
    value = value.slice(0, start) + key + value.slice(end);
    cursor = start + key.length;
  }

  inputTextarea.value = value;
  currentTranscript = value;
  clearRetryListening();
  inputTextarea.focus();
  inputTextarea.setSelectionRange(cursor, cursor);
}

function openInputModal(kind) {
  return new Promise((resolve) => {
    resolveInput = resolve;
    currentTranscript = "";
    clearRetryListening();
    hideKeyboardOverlay();
    if (inputTextarea) inputTextarea.value = "";

    const copy = getInputCopy(kind);
    if (inputTitle) inputTitle.textContent = copy.title;
    if (inputSubtitle) inputSubtitle.textContent = copy.subtitle;
    if (inputTextarea) inputTextarea.placeholder = copy.placeholder;

    activeInputMode = micSupported ? "mic" : "type";
    switchInputMode(activeInputMode);
    updateMicStatus(micSupported ? "Listening..." : "Mic not available. Use the on-screen keyboard.");

    if (inputModal) {
      inputModal.classList.add("show");
      inputModal.setAttribute("aria-hidden", "false");
    }
  });
}

function submitInput() {
  if (!resolveInput) return;

  const text = (inputTextarea?.value || "").trim();
  if (!text) {
    updateMicStatus("Say something or type with the on-screen keyboard first.");
    return;
  }

  closeInputModal(text);
}

function closeInputModal(result = null) {
  clearRetryListening();
  stopListening();
  hideKeyboardOverlay();

  if (inputModal) {
    inputModal.classList.remove("show");
    inputModal.setAttribute("aria-hidden", "true");
  }

  if (resolveInput) {
    const resolver = resolveInput;
    resolveInput = null;
    resolver(result);
  }
}

function switchInputMode(mode) {
  if (mode === "mic" && micSupported) {
    activeInputMode = "mic";
  } else {
    activeInputMode = "type";
  }

  inputModeButtons.forEach((btn) => {
    const isActive = btn.dataset.mode === activeInputMode;
    btn.classList.toggle("active", isActive);
  });

  if (activeInputMode === "mic" && micSupported) {
    hideKeyboardOverlay();
    startListening();
  } else {
    stopListening();
    updateMicStatus("Type with the on-screen keyboard.");
    showKeyboardOverlay();
    if (inputTextarea) inputTextarea.focus();
  }
}

function startListening() {
  clearRetryListening();
  if (activeInputMode !== "mic") return;
  if (!SpeechRecognition) {
    updateMicStatus("Mic is not supported in this browser. Use the on-screen keyboard.");
    return;
  }

  if (isRecording) return;
  stopListening();

  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  recognition.continuous = false;

  recognition.onstart = () => {
    isRecording = true;
    currentTranscript = "";
    updateMicStatus("Listening...");
    setStatus("Listening...");
  };

  recognition.onerror = (e) => {
    isRecording = false;
    const isNoSpeech = e && e.error === "no-speech";
    setStatus(isNoSpeech ? "Waiting for your input..." : "Ready");
    const message = isNoSpeech
      ? "No speech detected. Listening again in 5 seconds..."
      : `Mic error: ${e.error || "unknown"}. Say that again or type with the keyboard.`;
    updateMicStatus(message);
    if (isNoSpeech) {
      scheduleRetryListening();
    }
  };

  recognition.onend = () => {
    isRecording = false;
    if (!resolveInput || activeInputMode !== "mic") return;
    if (currentTranscript) {
      return;
    }
    updateMicStatus("No speech detected. Listening again in 5 seconds...");
    setStatus("Waiting for your input...");
    scheduleRetryListening();
  };

  recognition.onresult = (event) => {
    let transcript = "";
    for (let i = 0; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    currentTranscript = transcript.trim();
    if (inputTextarea) inputTextarea.value = currentTranscript;
    updateMicStatus("Listening...");

    const last = event.results[event.results.length - 1];
    if (last.isFinal && currentTranscript && activeInputMode === "mic") {
      setTimeout(() => closeInputModal(currentTranscript), 20);
    }
  };

  recognition.start();
}

function stopListening() {
  clearRetryListening();
  if (recognition && isRecording) {
    recognition.stop();
  }
  isRecording = false;
  recognition = null;
}

function scheduleRetryListening() {
  clearRetryListening();
  if (!resolveInput || !micSupported || activeInputMode !== "mic") return;
  retryListenTimeout = setTimeout(() => {
    retryListenTimeout = null;
    if (!resolveInput || !micSupported || activeInputMode !== "mic" || isRecording) return;
    startListening();
  }, 5000);
}

function clearRetryListening() {
  if (retryListenTimeout) {
    clearTimeout(retryListenTimeout);
    retryListenTimeout = null;
  }
}

function showKeyboardOverlay() {
  if (!keyboardOverlay) return;
  keyboardOverlay.classList.add("show");
  if (inputTextarea) inputTextarea.focus();
}

function hideKeyboardOverlay() {
  if (!keyboardOverlay) return;
  keyboardOverlay.classList.remove("show");
}

function getInputCopy(kind) {
  if (kind === "paths") {
    return {
      title: "Where should we go?",
      subtitle: "Ask for a room or area and I will give short, step-by-step directions.",
      placeholder: "Example: Take me to Lab 1 or Classroom B2."
    };
  }
  return {
    title: "Talk to the guide",
    subtitle: "Use the mic or type with the on-screen keyboard.",
    placeholder: "Ask anything, or say Salam to begin."
  };
}

// =======================
//  SPEECH / LIP SYNC
// =======================

// iOS/Safari requires audio to be "unlocked" by a user gesture
function unlockAudioForIOS() {
  if (audioUnlocked || !window.speechSynthesis) return;

  // Create a silent utterance to unlock audio
  const silence = new SpeechSynthesisUtterance("");
  silence.volume = 0;
  silence.rate = 10; // Fast so it's instant
  window.speechSynthesis.speak(silence);
  audioUnlocked = true;
}

function speakText(text) {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) {
      isTalking = false;
      setStopButton(false);
      return resolve();
    }

    // Ensure audio is unlocked on iOS
    unlockAudioForIOS();

    if (currentUtterance) {
      window.speechSynthesis.cancel();
      currentUtterance = null;
    }

    // iOS workaround: small delay after cancel
    setTimeout(() => {
      actuallySpeak(text, resolve);
    }, 100);
  });
}

function actuallySpeak(text, resolve) {
    const utterance = new SpeechSynthesisUtterance(text);
    currentUtterance = utterance;
    const voice = preferredVoice || null;
    const voiceLang = voice && voice.lang ? voice.lang : "en-US";
    utterance.voice = voice;
    utterance.lang = voiceLang;

    // Get avatar-specific voice settings for distinct voices
    const settings = avatarVoiceSettings[currentAvatarId] || { pitch: 1.0, rate: 1.0 };
    utterance.pitch = Math.max(0.5, Math.min(settings.pitch, 2.0));
    utterance.rate = Math.max(0.5, Math.min(settings.rate, 1.5));

    utterance.onstart = () => {
      isTalking = true;
      const len = text.length;
      speakDuration = Math.max(1.5, len / CHAR_PER_SECOND);
      speakStartTime = Date.now();
      setStopButton(true);
    };

    utterance.onend = () => {
      isTalking = false;
      currentUtterance = null;
      setStopButton(false);
      resolve();
    };

    utterance.onerror = () => {
      isTalking = false;
      currentUtterance = null;
      setStopButton(false);
      resolve();
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
}

function stopSpeaking() {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  isTalking = false;
  currentUtterance = null;
  setStopButton(false);
  setStatus("Stopped");
}

// =======================
//  HELPERS
// =======================
function updateMicStatus(text) {
  if (micStatus) micStatus.textContent = text;
}

function setStopButton(enabled) {
  if (stopSpeechBtn) stopSpeechBtn.disabled = !enabled;
}

// Voice settings per avatar - each has distinct pitch/rate for unique sound
const avatarVoiceSettings = {
  muhammad: { pitch: 0.85, rate: 0.92, gender: "male" },
  anna: { pitch: 1.15, rate: 1.0, gender: "female" },
  aki: { pitch: 0.95, rate: 1.05, gender: "male" },
  amari: { pitch: 1.2, rate: 0.95, gender: "female" },
  leo: { pitch: 0.8, rate: 0.88, gender: "male" },
  maya: { pitch: 1.25, rate: 1.02, gender: "female" },
  rose: { pitch: 1.1, rate: 0.98, gender: "female" },
  shonith: { pitch: 0.9, rate: 0.95, gender: "male" },
  tom: { pitch: 0.75, rate: 0.9, gender: "male" },
  wei: { pitch: 1.18, rate: 1.0, gender: "female" },
  zara: { pitch: 1.22, rate: 0.97, gender: "female" },
  zola: { pitch: 1.12, rate: 1.03, gender: "female" }
};

function selectVoiceForAvatar(avatarId) {
  const avatar = AVATARS.find((a) => a.id === avatarId);
  if (!avatar || !availableVoices.length) return;

  const gender = avatar.gender || "neutral";

  // Voice preferences per avatar - includes iOS, Windows, Chrome voices
  const avatarVoiceMap = {
    muhammad: [
      "Microsoft Naayf Online (Natural) - Arabic (Saudi Arabia)",
      "Microsoft Guy Online (Natural) - English (United States)",
      "Alex", "Daniel", "Google UK English Male", "Aaron"
    ],
    anna: [
      "Microsoft Aria Online (Natural) - English (United States)",
      "Samantha", "Karen", "Google UK English Female", "Fiona"
    ],
    aki: [
      "Microsoft Ryan Online (Natural) - English (United States)",
      "Alex", "Daniel", "Google US English", "Tom"
    ],
    amari: [
      "Microsoft Jenny Online (Natural) - English (United States)",
      "Samantha", "Tessa", "Google UK English Female", "Moira"
    ],
    leo: [
      "Microsoft Guy Online (Natural) - English (United States)",
      "Daniel", "Alex", "Google UK English Male", "Oliver"
    ],
    maya: [
      "Microsoft Aria Online (Natural) - English (United States)",
      "Karen", "Samantha", "Google UK English Female", "Victoria"
    ],
    rose: [
      "Microsoft Jenny Online (Natural) - English (United States)",
      "Moira", "Samantha", "Google UK English Female", "Kate"
    ],
    shonith: [
      "Microsoft Ryan Online (Natural) - English (United States)",
      "Rishi", "Daniel", "Google UK English Male", "Alex"
    ],
    tom: [
      "Microsoft Guy Online (Natural) - English (United States)",
      "Alex", "Fred", "Google US English", "Ralph"
    ],
    wei: [
      "Microsoft Jenny Online (Natural) - English (United States)",
      "Ting-Ting", "Samantha", "Google US English", "Mei-Jia"
    ],
    zara: [
      "Microsoft Aria Online (Natural) - English (United States)",
      "Tessa", "Karen", "Google UK English Female", "Samantha"
    ],
    zola: [
      "Microsoft Jenny Online (Natural) - English (United States)",
      "Samantha", "Victoria", "Google US English", "Fiona"
    ]
  };

  // Gender fallback voices
  const genderFallback = {
    male: ["Alex", "Daniel", "Google UK English Male", "Microsoft Guy Online (Natural) - English (United States)"],
    female: ["Samantha", "Karen", "Google UK English Female", "Microsoft Aria Online (Natural) - English (United States)"],
    neutral: ["Samantha", "Alex", "Google US English"]
  };

  const names = avatarVoiceMap[avatar.id] || genderFallback[gender] || genderFallback.neutral;

  // Try to find a matching voice
  preferredVoice =
    availableVoices.find((v) => names.some(n => v.name.includes(n))) ||
    availableVoices.find((v) => {
      // Match by gender for fallback
      const isFemale = /female|samantha|karen|victoria|fiona|moira|tessa/i.test(v.name);
      const isMale = /male|alex|daniel|tom|fred|ralph/i.test(v.name);
      if (gender === "female") return isFemale;
      if (gender === "male") return isMale && !isFemale;
      return true;
    }) ||
    availableVoices.find((v) => v.lang && v.lang.toLowerCase().startsWith("en")) ||
    availableVoices[0] ||
    null;
}

function disposeModel(obj) {
  obj.traverse((child) => {
    if (child.isMesh) {
      if (child.geometry && child.geometry.dispose) {
        child.geometry.dispose();
      }
      const mat = child.material;
      if (Array.isArray(mat)) {
        mat.forEach((m) => m && m.dispose && m.dispose());
      } else if (mat && mat.dispose) {
        mat.dispose();
      }
    }
  });
}

function escapeHtml(str) {
  return (str || "").replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      case "'": return "&#39;";
      default: return ch;
    }
  });
}

function formatTextForOutput(label, text) {
  const safe = escapeHtml(text).replace(/\n/g, "<br>");
  return `<strong>${label}:</strong> ${safe}`;
}

function initVoiceSelection() {
  const pickVoice = () => {
    availableVoices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
    if (!availableVoices.length) return;
    selectVoiceForAvatar(currentAvatarId);
  };

  pickVoice();
  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = pickVoice;
  }
}

async function ensureFaqsLoaded() {
  if (faqsLoaded) return FAQS;
  if (!faqsLoadPromise) {
    faqsLoadPromise = loadFaqsFromJson();
  }
  try {
    await faqsLoadPromise;
  } catch (err) {
    console.error("Failed to load FAQs:", err);
  }
  return FAQS;
}

function expandFaqTemplates(templates = []) {
  const generated = [];
  templates.forEach((tpl) => {
    const prefixes = Array.isArray(tpl.prefixes) && tpl.prefixes.length ? tpl.prefixes : [""];
    const suffixes = Array.isArray(tpl.suffixes) && tpl.suffixes.length ? tpl.suffixes : [""];
    const subjects = Array.isArray(tpl.subjects) ? tpl.subjects : [];
    const answerTemplate = tpl.answer || "";
    subjects.forEach((subjectRaw) => {
      const subject = subjectRaw.trim();
      if (!subject) return;
      prefixes.forEach((pre) => {
        suffixes.forEach((suf) => {
          const qParts = [];
          if (pre && pre.trim()) qParts.push(pre.trim());
          qParts.push(subject);
          if (suf && suf.trim()) qParts.push(suf.trim());
          const q = qParts.join(" ").replace(/\s+/g, " ").trim();
          const a = answerTemplate.replace(/\{\{subject\}\}/g, subject);
          const baseKeywords = Array.isArray(tpl.keywords) ? tpl.keywords : [];
          const keywords = [...baseKeywords, subject.toLowerCase()];
          if (q && a) {
            generated.push({ q, a, k: keywords.map((kw) => kw.toLowerCase()) });
          }
        });
      });
    });
  });
  return generated;
}

async function loadFaqsFromJson() {
  try {
    const resp = await fetch("./faqs.json", { cache: "no-cache" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    const entries = Array.isArray(data) ? data : Array.isArray(data.entries) ? data.entries : [];
    const templates = Array.isArray(data.templates) ? data.templates : [];
    const generated = expandFaqTemplates(templates);

    let combined = [...entries, ...generated];

    // Ensure at least 1000 items for coverage
    if (combined.length && combined.length < 1000) {
      const padding = [];
      let idx = 0;
      while (combined.length + padding.length < 1000) {
        const base = combined[idx % combined.length];
        padding.push({
          q: `${base.q} (detail ${idx})`,
          a: base.a,
          k: base.k
        });
        idx += 1;
      }
      combined = combined.concat(padding);
    }

    FAQS = combined;
    faqsLoaded = true;
    return FAQS;
  } catch (err) {
    faqsLoaded = true;
    FAQS = [];
    throw err;
  }
}
// Initialize avatar
initAvatar();
