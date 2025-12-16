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

// FAQ knowledge base (about EDGE Learning & Innovation Factory)
const FAQS = [
  {
    q: "What is EDGE Learning & Innovation Factory?",
    a: "EDGE Learning & Innovation Factory is EDGE Group’s training and upskilling hub in Abu Dhabi, focused on advanced technology, digital transformation, and practical industry learning.",
    k: ["what", "edge", "learning", "innovation", "factory", "hub", "center"]
  },
  { q: "Where is the facility located?", a: "The Learning & Innovation Factory is in Abu Dhabi, UAE, within EDGE Group’s facilities. Visitors typically register before arrival.", k: ["where", "location", "abu dhabi", "uae", "address", "facility"] },
  { q: "Do you offer guided tours?", a: "Yes. Tours can be arranged for partners, customers, and education groups. Submit a visit request through EDGE or LIF contact channels.", k: ["tour", "guided", "visit", "site visit", "book tour"] },
  { q: "What programs do you offer?", a: "Programs span robotics, AI/ML, digital transformation, cyber, additive manufacturing, Industry 4.0, and leadership for tech-led operations.", k: ["programs", "courses", "offer", "modules", "catalog"] },
  { q: "Who can enroll?", a: "Professionals, engineers, technicians, and graduates in tech/manufacturing fields can enroll. Some tracks require prerequisites; enterprise cohorts are common.", k: ["enroll", "who", "eligibility", "apply", "join"] },
  { q: "Do you provide corporate training?", a: "Yes. LIF delivers custom corporate programs for EDGE entities and external partners across aerospace, defense, and industry 4.0 topics.", k: ["corporate", "enterprise", "company", "team", "group"] },
  { q: "Are there short courses or bootcamps?", a: "Yes. There are intensive bootcamps and short courses in robotics, AI, cyber, additive manufacturing, and smart factory operations.", k: ["bootcamp", "short course", "intensive", "workshop"] },
  { q: "Do you have online or hybrid learning?", a: "Delivery is primarily hands-on onsite. Some modules can be delivered hybrid or blended on request.", k: ["online", "remote", "hybrid", "virtual"] },
  { q: "What labs are available?", a: "Labs include robotics cells, industrial automation, AI/ML, cyber ranges, additive manufacturing, digital twins, and smart factory simulations.", k: ["lab", "labs", "facilities", "equipment", "workshop"] },
  { q: "Do you have a makerspace?", a: "Yes. The makerspace supports prototyping with 3D printing, laser cutting, electronics benches, and small CNC capability.", k: ["makerspace", "prototype", "prototyping", "3d print", "laser"] },
  { q: "Is there a focus on Industry 4.0?", a: "Yes. Industry 4.0 readiness, digital twins, IoT integration, and smart factory operations are core pillars of the training.", k: ["industry 4.0", "smart factory", "digital twin", "iot", "automation"] },
  { q: "Do you teach robotics programming?", a: "Yes. Courses cover robot programming, safety, and integration with industrial control systems and sensors.", k: ["robotics", "robot", "programming", "arm", "automation"] },
  { q: "Do you cover AI and machine learning?", a: "Yes. AI/ML tracks include model development, deployment, MLOps basics, and applied use cases in industrial contexts.", k: ["ai", "ml", "machine learning", "artificial intelligence"] },
  { q: "Do you teach cybersecurity?", a: "Yes. There are cyber labs with hands-on scenarios for defensive security, OT security, and secure system design.", k: ["cyber", "security", "cybersecurity", "ot security", "defense"] },
  { q: "Do you support additive manufacturing?", a: "Yes. Additive manufacturing training includes design for AM, material selection, and post-processing basics.", k: ["additive", "3d printing", "manufacturing", "am"] },
  { q: "Do you offer internships?", a: "Internship availability varies. Typically coordinated with EDGE entities and partner universities. Inquire through EDGE careers channels.", k: ["intern", "internship", "student", "graduate"] },
  { q: "Is there career support?", a: "Career development is embedded: mentorship, portfolio-worthy projects, and exposure to EDGE tech programs.", k: ["career", "jobs", "placement", "mentorship"] },
  { q: "How long are the programs?", a: "Lengths vary from 1–3 day workshops to multi-week bootcamps and multi-month upskilling tracks.", k: ["duration", "how long", "weeks", "months"] },
  { q: "Do you certify participants?", a: "Programs can include EDGE-branded certificates of completion. Some tracks can align with external certifications on request.", k: ["certificate", "certification", "credentials"] },
  { q: "How do I apply?", a: "Submit an inquiry or application via EDGE Learning & Innovation Factory contact forms or through your organization’s training coordinator.", k: ["apply", "application", "sign up", "register"] },
  { q: "Is there a cost?", a: "Pricing depends on the program scope, duration, and cohort size. Corporate packages and tailored sessions are available.", k: ["cost", "price", "fees", "tuition", "pricing"] },
  { q: "Can programs be customized?", a: "Yes. Content can be tailored to your organization’s tech stack, maturity level, and operational goals.", k: ["custom", "tailor", "bespoke", "adapt", "organization"] },
  { q: "Do you partner with universities?", a: "LIF collaborates with universities and vocational institutes for capstones, internships, and joint training initiatives.", k: ["university", "universities", "college", "academic", "partner"] },
  { q: "Do you host hackathons or challenges?", a: "Yes. Innovation challenges, hackathons, and design sprints are organized periodically to solve real EDGE use cases.", k: ["hackathon", "challenge", "innovation", "sprint"] },
  { q: "Is there hardware training?", a: "Yes. Hands-on with sensors, PLCs, robotics controllers, edge devices, and industrial networking.", k: ["hardware", "plc", "sensors", "edge devices", "controllers"] },
  { q: "Do you teach cloud or edge computing?", a: "Yes. Courses include edge-to-cloud patterns, data pipelines, and secure deployments for industrial workloads.", k: ["cloud", "edge computing", "data pipeline"] },
  { q: "Do you cover AR or VR?", a: "Some modules include AR/VR for training, maintenance support, and visualization in industrial contexts.", k: ["ar", "vr", "augmented", "virtual reality"] },
  { q: "Do you have leadership programs?", a: "Yes. Leadership tracks focus on digital transformation strategy, change management, and tech-enabled operations.", k: ["leadership", "manager", "executive", "strategy"] },
  { q: "Is there a makerspace membership?", a: "Access is typically program-based. Membership-style access can be arranged for approved partners and teams.", k: ["membership", "access", "makerspace membership"] },
  { q: "Can I bring my own project?", a: "Yes, projects can be integrated into training with prior review to ensure safety and fit with lab capabilities.", k: ["own project", "bring project", "custom project"] },
  { q: "Do you support startups?", a: "Startups aligned with advanced tech or industrial domains can request tailored training or prototyping support.", k: ["startup", "startups", "founder", "venture"] },
  { q: "What languages are used?", a: "Primary delivery is in English. Arabic support can be arranged for groups where needed.", k: ["language", "english", "arabic"] },
  { q: "Do you provide equipment safety training?", a: "Yes. Safety inductions and standard operating procedures are part of lab onboarding.", k: ["safety", "ppe", "induction", "sop"] },
  { q: "Are there evening or weekend classes?", a: "Scheduling can be flexible for corporate cohorts; public schedules vary. Inquire for current timings.", k: ["evening", "weekend", "schedule", "timing"] },
  { q: "How many people per cohort?", a: "Cohort sizes vary. Hands-on labs are typically small (8–16) to ensure instructor attention.", k: ["cohort size", "class size", "participants"] },
  { q: "Is housing provided?", a: "Housing is not standard. For visiting cohorts, EDGE can advise on nearby accommodation options.", k: ["housing", "accommodation", "stay"] },
  { q: "Is catering provided?", a: "Basic refreshments can be arranged for cohorts; full catering is arranged on request for longer sessions.", k: ["catering", "food", "meals"] },
  { q: "Do you offer certifications with vendors?", a: "Vendor-aligned certifications can be embedded case-by-case depending on tooling and agreements.", k: ["vendor", "certification", "partners"] },
  { q: "Do you teach data analytics?", a: "Yes. Data analytics for industrial telemetry, dashboards, and KPI tracking is covered in several tracks.", k: ["data", "analytics", "dashboards", "kpi"] },
  { q: "Is there electronics training?", a: "Yes. Basics of circuits, sensors, and embedded prototyping are available in the makerspace context.", k: ["electronics", "circuits", "embedded"] },
  { q: "Do you support defense-focused topics?", a: "Programs align with EDGE domains, including secure systems, autonomy, and ruggedized deployments.", k: ["defense", "aerospace", "secure systems"] },
  { q: "How do I contact the team?", a: "Use the contact options on the EDGE Learning & Innovation Factory site or reach out through your EDGE representative.", k: ["contact", "email", "reach", "phone"] },
  { q: "Do you run innovation sprints?", a: "Yes. Design sprints and rapid prototyping sessions can be scheduled for internal or partner teams.", k: ["design sprint", "innovation sprint", "rapid prototype"] },
  { q: "Do you help with digital transformation?", a: "Yes. Advisory and training for digital transformation roadmaps, capability building, and pilot execution.", k: ["digital transformation", "roadmap", "capability"] },
  { q: "Do you cover supply chain topics?", a: "Select modules address smart manufacturing, logistics visibility, and asset tracking.", k: ["supply chain", "logistics", "tracking"] },
  { q: "Do you offer mentorship?", a: "Mentors from EDGE and partner experts guide projects and capstones during programs.", k: ["mentor", "mentorship", "guidance"] },
  { q: "Is there a demo day?", a: "Some cohorts end with demos to stakeholders to showcase prototypes or project outcomes.", k: ["demo", "showcase", "presentation"] },
  { q: "Can I book the space for events?", a: "Space use is prioritized for training; special events can be arranged on approval.", k: ["book space", "event", "room"] },
  { q: "Do you teach PLCs and industrial controls?", a: "Yes. PLC programming, industrial networking, and controls integration are part of automation tracks.", k: ["plc", "controls", "industrial network"] },
  { q: "Do you cover sustainability topics?", a: "Energy efficiency and sustainable operations can be included depending on cohort objectives.", k: ["sustainability", "energy", "green"] },
  { q: "Do you offer assessments?", a: "Skills assessments and readiness diagnostics can be included at the start/end of programs.", k: ["assessment", "diagnostic", "skills"] },
  { q: "Can we integrate our data?", a: "Yes, with prior review for security and privacy. Synthetic or sanitized datasets are recommended.", k: ["own data", "data integration", "upload data"] },
  { q: "Do you offer scholarships?", a: "Scholarships are not standard; organizational sponsorships are more common. Inquire for current options.", k: ["scholarship", "funding", "sponsor"] },
  { q: "Is there parking?", a: "Visitor parking is available at the facility. Confirm details when scheduling a visit.", k: ["parking", "car"] },
  { q: "Do you run youth programs?", a: "Main focus is professional/industry tracks; youth or outreach programs can be arranged occasionally.", k: ["youth", "school", "k12", "students"] },
  { q: "Do you offer compliance training?", a: "Compliance and standards awareness (e.g., safety, quality) can be embedded as needed.", k: ["compliance", "standards", "quality"] },
  { q: "Do you teach human factors or UX?", a: "Human factors and UX for industrial interfaces can be integrated for relevant cohorts.", k: ["ux", "human factors", "interface"] },
  { q: "Do you help with onboarding new hires?", a: "Yes. Cohorts can be structured as onboarding bootcamps for new technical hires.", k: ["onboarding", "new hires", "orientation"] },
  { q: "Is there post-program support?", a: "Follow-up clinics, office hours, and refreshers can be scheduled after main programs.", k: ["follow up", "support", "office hours"] },
  { q: "Do you measure outcomes?", a: "KPIs and competency assessments can be defined with your team to measure training outcomes.", k: ["outcomes", "kpi", "measure"] },
  { q: "Do you cover change management?", a: "Yes. Leadership modules include change management for tech adoption.", k: ["change management", "adoption"] },
  { q: "How do I get a brochure?", a: "Request a program overview/brochure through the contact form or your EDGE representative.", k: ["brochure", "overview", "pdf"] }
];

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
let activeInputMode = micSupported ? "mic" : "text";
let resolveInput = null;
let recognition = null;
let isRecording = false;
let currentTranscript = "";
let currentUtterance = null;
let preferredVoice = null;
let availableVoices = [];

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
  scene.background = new THREE.Color(0x000000);

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
  renderer.setPixelRatio(window.devicePixelRatio || 1);
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
      avatarThumbnails.parentElement.scrollBy({ left: -200, behavior: "smooth" });
    });
  }

  if (avatarNextBtn && avatarThumbnails) {
    avatarNextBtn.addEventListener("click", () => {
      avatarThumbnails.parentElement.scrollBy({ left: 200, behavior: "smooth" });
    });
  }
}

// =======================
//  OPENAI + BUTTON LOGIC
// =======================
function setupButtons() {
  if (!btnSpeak || !btnPaths) return;

  btnSpeak.addEventListener("click", () => handleInteraction("speak"));
  btnPaths.addEventListener("click", () => handleInteraction("paths"));

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
function findBestFaqAnswer(userMessage) {
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

  inputModeButtons.forEach((btn) => {
    btn.addEventListener("click", () => switchInputMode(btn.dataset.mode));
  });

  if (!micSupported) {
    updateMicStatus("Microphone capture is not supported in this browser. Use text input instead.");
  }

  switchInputMode(activeInputMode);
}

function openInputModal(kind) {
  return new Promise((resolve) => {
    resolveInput = resolve;
    currentTranscript = "";
    if (inputTextarea) inputTextarea.value = "";

    const copy = getInputCopy(kind);
    if (inputTitle) inputTitle.textContent = copy.title;
    if (inputSubtitle) inputSubtitle.textContent = copy.subtitle;
    if (inputTextarea) inputTextarea.placeholder = copy.placeholder;

    activeInputMode = micSupported ? "mic" : "text";
    switchInputMode(activeInputMode);
    updateMicStatus(micSupported ? "Listening..." : "Mic not available. Use text input.");

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
    updateMicStatus("Say something or type your request first.");
    return;
  }

  closeInputModal(text);
}

function closeInputModal(result = null) {
  stopListening();

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
  if (mode === "mic" && !micSupported) {
    activeInputMode = "text";
  } else {
    activeInputMode = mode;
  }

  inputModeButtons.forEach((btn) => {
    const isActive = btn.dataset.mode === activeInputMode;
    btn.classList.toggle("active", isActive);
  });

  if (activeInputMode === "mic" && micSupported) {
    startListening();
  } else {
    stopListening();
    updateMicStatus("Type your question, then send.");
    if (inputTextarea) inputTextarea.focus();
  }
}

function startListening() {
  if (!SpeechRecognition) {
    updateMicStatus("Mic is not supported in this browser.");
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
    updateMicStatus(`Mic error: ${e.error || "unknown"}. Try again or type instead.`);
    setStatus("Ready");
  };

  recognition.onend = () => {
    isRecording = false;
    if (!resolveInput) return;
    if (activeInputMode === "mic" && currentTranscript) {
      return;
    }
    updateMicStatus(currentTranscript ? "Captured speech. You can edit before sending." : "No speech detected. Try again or switch to text.");
    setStatus("Waiting for your input...");
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
  if (recognition && isRecording) {
    recognition.stop();
  }
  isRecording = false;
  recognition = null;
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
    subtitle: "Use the mic for hands-free mode or switch to text input.",
    placeholder: "Ask anything, or say Salam to begin."
  };
}

// =======================
//  SPEECH / LIP SYNC
// =======================
function speakText(text) {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) {
      isTalking = false;
      setStopButton(false);
      return resolve();
    }

    if (currentUtterance) {
      window.speechSynthesis.cancel();
      currentUtterance = null;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    currentUtterance = utterance;
    const voice = preferredVoice || null;
    const voiceLang = voice && voice.lang ? voice.lang : "en-US";
    utterance.voice = voice;
    utterance.lang = voiceLang;
    const isArabic = voiceLang.toLowerCase().startsWith("ar");
    utterance.rate = isArabic ? 0.9 : 0.95;
    utterance.pitch = isArabic ? 0.75 : 0.85;

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
  });
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
  const preferredByGender = {
    female: [
      "Microsoft Aria Online (Natural) - English (United States)",
      "Microsoft Jenny Online (Natural) - English (United States)",
      "Google UK English Female",
      "Google US English"
    ],
    male: [
      "Microsoft Guy Online (Natural) - English (United States)",
      "Microsoft Ryan Online (Natural) - English (United States)",
      "Microsoft Naayf Online (Natural) - Arabic (Saudi Arabia)",
      "Microsoft Hamed Online (Natural) - Arabic (Saudi Arabia)",
      "Google UK English Male"
    ],
    neutral: []
  };

  const names = preferredByGender[gender] || preferredByGender.neutral;
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
