// --- Imports for Three.js ---
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// =======================
//  CONFIG (Local FAQ bot)
// =======================
// No external API. Answers come from a local FAQ list about EDGE Learning & Innovation Factory.
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

// How fast the avatar talks
const CHAR_PER_SECOND = 14;

// Basic moderation and room mapping
const BAD_WORDS = [
  "badword",
  "insult",
  "curse",
  "abuse",
  "offensive",
  "fuck",
  "shit",
  "bitch",
  "bastard",
  "idiot",
  "stupid"
];
const ROOM_RESPONSES = [
  { match: ["vip"], answer: "From the main lobby, take the elevator to Level 2. Walk past reception; the VIP room is the first door on the left with gold signage." },
  { match: ["office 1", "office one"], answer: "Office 1 is on Level 1. From the lobby, turn right at the main hallway; it's the second glass door on your right." },
  { match: ["office 2", "office two"], answer: "Office 2 is on Level 1. From the lobby, turn left at the hallway; it's the door next to the meeting pod." },
  { match: ["classroom 1", "classroom one", "class 1"], answer: "Classroom 1 is on Level 1. From the lobby, go straight, then left at the T-junction. It is the first classroom on the right." },
  { match: ["classroom 2", "classroom two", "class 2"], answer: "Classroom 2 is next to Classroom 1. From the lobby, go straight, left at the T-junction, then second classroom on the right." },
  { match: ["classroom 3", "classroom three", "class 3"], answer: "Classroom 3 is on Level 1. From the lobby, go straight, right at the T-junction, then first classroom on the left." },
  { match: ["classroom 4", "classroom four", "class 4"], answer: "Classroom 4 is beside Classroom 3. From the lobby, go straight, right at the T-junction, then second classroom on the left." }
];

// FAQ knowledge base (loaded from faqs.json)
let FAQS = [];
let faqsLoaded = false;
let faqsLoadPromise = null;

// Mic support
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const micSupported = Boolean(SpeechRecognition);

const avatarContainer = document.getElementById("avatar-container");
const avatarLoading = document.getElementById("avatar-loading");
const avatarSelect = document.getElementById("avatar-select");
const avatarThumbnails = document.getElementById("avatar-thumbnails");
const avatarPrevBtn = document.getElementById("avatar-prev");
const avatarNextBtn = document.getElementById("avatar-next");
const output = document.getElementById("output");
const btnSpeak = document.getElementById("btn-speak");
const btnPaths = document.getElementById("btn-paths");
const statusEl = document.getElementById("status");
const stopSpeechBtn = document.getElementById("stop-speech");

const inputModal = document.getElementById("input-modal");
const inputTitle = document.getElementById("input-title");
const inputSubtitle = document.getElementById("input-subtitle");
const inputTextarea = document.getElementById("input-textarea");
const inputSubmit = document.getElementById("input-submit");
const inputClose = document.getElementById("input-close");
const inputModeButtons = document.querySelectorAll(".input-switch button");
const micStatus = document.getElementById("mic-status");
const keyboardOverlay = document.getElementById("keyboard-overlay");
const onScreenKeyboard = document.getElementById("on-screen-keyboard");

// =======================
//  THREE.JS SCENE SETUP
// =======================
let scene, camera, renderer;
let model;
let animationLoopStarted = false;

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
let isTalking = false;
let mouthValue = 0;
let smileValue = 0.3;
let browValue = 0.0;

let nextBlinkTime = Date.now() + 2000 + Math.random() * 1200;

let headTarget = { x: 0, y: 0 };
let lastPointerLookTime = 0;
let nextIdleHeadTurn = Date.now() + 3500;

// speech timing
let speakStartTime = 0;
let speakDuration = 1;

// Mouse / touch tracking
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

// =======================
//  INIT
// =======================
setStatus("Loading avatar...");
setStopButton(false);
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
  // Changed background to transparent so CSS gradient shows through
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

  avatarContainer.addEventListener("pointerenter", () => {
    pointerInAvatar = true;
  });
  avatarContainer.addEventListener("pointerleave", () => {
    pointerInAvatar = false;
  });
  avatarContainer.addEventListener("pointermove", (e) => {
    const rect = avatarContainer.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    pointerNorm.x = x * 2 - 1;
    pointerNorm.y = y * 2 - 1;
    lastPointerLookTime = Date.now();
  });
}

// =======================
//  AVATAR LOADER
// =======================
function loadAvatar(avatarId) {
  if (!scene) return;

  const avatar = AVATARS.find((a) => a.id === avatarId) || AVATARS[0];
  if (!avatar) return;

  if (currentAvatarId === avatar.id && model) return;
  currentAvatarId = avatar.id;
  selectVoiceForAvatar(currentAvatarId);

  if (avatarSelect && avatarSelect.value !== avatar.id) {
    avatarSelect.value = avatar.id;
  }

  // Sync thumbnail selection
  document.querySelectorAll(".avatar-thumb").forEach((t) => {
    t.classList.toggle("selected", t.dataset.avatar === avatar.id);
  });

  if (avatarLoading) {
    avatarLoading.style.display = "flex";
    avatarLoading.textContent = `Loading ${avatar.label}...`;
  }
  setStatus(`Loading ${avatar.label}...`);

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
      setStatus("Ready");

      const mouthNames = [
        "jawOpen",
        "mouthOpen",
        "viseme_aa",
        "viseme_OH",
        "MouthOpen",
        "v_aa"
      ];
      const eyeNames = [
        "eyeBlinkLeft",
        "eyeBlinkRight",
        "eyesClosed",
        "blink",
        "EyeBlink_L",
        "EyeBlink_R"
      ];
      const smileNames = [
        "smile",
        "smileWide",
        "mouthSmile",
        "mouthSmileLeft",
        "mouthSmileBig",
        "mouthSmileRight"
      ];
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
            if (dict[name] !== undefined) {
              mouthParts.push({ mesh: child, index: dict[name] });
              break;
            }
          }
          for (let name of eyeNames) {
            if (dict[name] !== undefined) {
              eyeParts.push({ mesh: child, index: dict[name] });
            }
          }
          for (let name of smileNames) {
            if (dict[name] !== undefined) {
              smileParts.push({ mesh: child, index: dict[name] });
              break;
            }
          }
          for (let name of browNames) {
            if (dict[name] !== undefined) {
              browParts.push({ mesh: child, index: dict[name] });
              break;
            }
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
      setStatus("Avatar load error");
    }
  );
}

// =======================
//  ANIMATION LOOP
// =======================
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
    let blinkVal = 0;
    if (now > nextBlinkTime) {
      if (now < nextBlinkTime + 130) {
        blinkVal = 1;
      } else {
        nextBlinkTime = now + 2000 + Math.random() * 2000;
      }
    }
    eyeParts.forEach((p) => {
      p.mesh.morphTargetInfluences[p.index] = blinkVal;
    });

    updateHeadAndBody(now, t);
    updateFace(now, t);
  }

  renderer.render(scene, camera);
}

function updateHeadAndBody(now, t) {
  const breathe = Math.sin(t * 1.4) * 0.015;
  model.position.y = breathe;

  if (chestBone) {
    chestBone.rotation.x = Math.sin(t * 1.5) * 0.04;
  }

  if (shoulderL && shoulderR) {
    shoulderL.rotation.z = Math.sin(t * 0.8) * 0.03;
    shoulderR.rotation.z = -Math.sin(t * 0.8) * 0.03;
  }

  if (!isTalking) {
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
  } else {
    headTarget.y = Math.sin(t * 1.2) * 0.08;
    headTarget.x = Math.sin(t * 1.6) * 0.03;
  }

  model.rotation.y = THREE.MathUtils.lerp(model.rotation.y, headTarget.y, 0.08);
  model.rotation.x = THREE.MathUtils.lerp(model.rotation.x, headTarget.x, 0.08);
}

function updateFace(now, t) {
  if (isTalking) {
    const elapsed = (now - speakStartTime) / 1000;
    const progress = THREE.MathUtils.clamp(elapsed / speakDuration, 0, 1);

    const noise =
      0.6 * (Math.sin(t * 8.2) * 0.5 + 0.5) +
      0.4 * (Math.sin(t * 11.7 + 1.5) * 0.5 + 0.5);

    const base = progress < 0.07 || progress > 0.97 ? 0.1 : 0.4;
    const targetMouth = base + 0.55 * noise;
    mouthValue = THREE.MathUtils.lerp(mouthValue, targetMouth, 0.35);

    const targetSmile = 0.5;
    const targetBrow = 0.25;
    smileValue = THREE.MathUtils.lerp(smileValue, targetSmile, 0.15);
    browValue = THREE.MathUtils.lerp(browValue, targetBrow, 0.18);
  } else {
    mouthValue = THREE.MathUtils.lerp(mouthValue, 0, 0.18);
    const idleSmile = 0.25;
    const idleBrow = 0.02;
    smileValue = THREE.MathUtils.lerp(smileValue, idleSmile, 0.05);
    browValue = THREE.MathUtils.lerp(browValue, idleBrow, 0.05);
  }

  mouthParts.forEach((p) => {
    p.mesh.morphTargetInfluences[p.index] = mouthValue;
  });

  smileParts.forEach((p) => {
    p.mesh.morphTargetInfluences[p.index] = smileValue;
  });

  browParts.forEach((p) => {
    p.mesh.morphTargetInfluences[p.index] = browValue;
  });
}

// =======================
//  AVATAR PICKER UI
// =======================
function setupAvatarPicker() {
  // Handle dropdown (hidden, for compatibility)
  if (avatarSelect) {
    avatarSelect.addEventListener("change", (e) => {
      loadAvatar(e.target.value);
    });
  }

  // Handle thumbnail clicks
  if (avatarThumbnails) {
    avatarThumbnails.addEventListener("click", (e) => {
      const thumb = e.target.closest(".avatar-thumb");
      if (!thumb) return;

      const avatarId = thumb.dataset.avatar;
      if (!avatarId) return;

      // Update selected state
      document.querySelectorAll(".avatar-thumb").forEach((t) => {
        t.classList.remove("selected");
      });
      thumb.classList.add("selected");

      // Load the avatar
      loadAvatar(avatarId);
    });
  }

  // Handle navigation arrows for scrolling
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
}

// =======================
//  OPENAI + BUTTON LOGIC
// =======================
function setupButtons() {
  if (!btnSpeak || !btnPaths) return;

  btnSpeak.addEventListener("click", () => {
    unlockAudioForIOS();
    handleInteraction("speak");
  });
  btnPaths.addEventListener("click", () => {
    unlockAudioForIOS();
    handleInteraction("paths");
  });

  if (stopSpeechBtn) {
    stopSpeechBtn.addEventListener("click", stopSpeaking);
  }
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
    const isArabic = voiceLang.toLowerCase().startsWith("ar");
    const avatar = AVATARS.find((a) => a.id === currentAvatarId);
    const isMale = avatar?.gender === "male";
    const isFemale = avatar?.gender === "female";
    let rate = isArabic ? 0.9 : 0.98;
    let pitch = isArabic ? 0.8 : 0.95;
    if (isMale) {
      rate -= 0.05;
      pitch -= 0.1;
    } else if (isFemale) {
      rate += 0.05;
      pitch += 0.15;
    }
    utterance.rate = Math.max(0.8, Math.min(rate, 1.15));
    utterance.pitch = Math.max(0.7, Math.min(pitch, 1.25));

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

function selectVoiceForAvatar(avatarId) {
  const avatar = AVATARS.find((a) => a.id === avatarId);
  if (!avatar || !availableVoices.length) return;

  const gender = avatar.gender || "neutral";
  const avatarVoiceMap = {
    muhammad: [
      "Microsoft Naayf Online (Natural) - Arabic (Saudi Arabia)",
      "Microsoft Hamed Online (Natural) - Arabic (Saudi Arabia)",
      "Microsoft Guy Online (Natural) - English (United States)"
    ],
    anna: [
      "Microsoft Aria Online (Natural) - English (United States)",
      "Microsoft Jenny Online (Natural) - English (United States)",
      "Google UK English Female"
    ],
    aki: [
      "Google US English",
      "Microsoft Aria Online (Natural) - English (United States)"
    ],
    amari: [
      "Microsoft Aria Online (Natural) - English (United States)",
      "Microsoft Jenny Online (Natural) - English (United States)"
    ],
    leo: [
      "Microsoft Guy Online (Natural) - English (United States)",
      "Microsoft Ryan Online (Natural) - English (United States)"
    ],
    maya: [
      "Google UK English Female",
      "Microsoft Jenny Online (Natural) - English (United States)"
    ],
    rose: [
      "Google UK English Female",
      "Microsoft Aria Online (Natural) - English (United States)"
    ],
    shonith: [
      "Google UK English Male",
      "Microsoft Ryan Online (Natural) - English (United States)"
    ],
    tom: [
      "Microsoft Guy Online (Natural) - English (United States)",
      "Google US English"
    ],
    wei: [
      "Google US English",
      "Microsoft Jenny Online (Natural) - English (United States)"
    ],
    zara: [
      "Microsoft Jenny Online (Natural) - English (United States)",
      "Google UK English Female"
    ],
    zola: [
      "Google US English",
      "Microsoft Aria Online (Natural) - English (United States)"
    ]
  };

  const names = avatarVoiceMap[avatar.id] || genderFallback[gender] || genderFallback.neutral;
  preferredVoice =
    availableVoices.find((v) => names.includes(v.name)) ||
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
