import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import os from "node:os";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

const app = express();
const PORT = Number(process.env.PORT || 8787);
const HTTPS_PORT = Number(process.env.HTTPS_PORT || 8788);
const HOST = process.env.HOST || "0.0.0.0"; // listen on all interfaces so LAN devices (tablets) can connect
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const API_KEY = process.env.OPENAI_API_KEY;

if (!API_KEY) {
  console.error("[server] Missing OPENAI_API_KEY. Copy .env.example to .env and paste your key.");
  process.exit(1);
}

app.use(cors());
app.use(express.json({ limit: "32kb" }));

// Safari is strict about MIME types for fetched 3D models. Without this, .glb
// files can fail to load or be blocked. Also set long-cache for static assets.
express.static.mime.define({ "model/gltf-binary": ["glb"] });
express.static.mime.define({ "model/gltf+json": ["gltf"] });

app.use(
  express.static(ROOT_DIR, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".glb")) {
        res.setHeader("Content-Type", "model/gltf-binary");
        res.setHeader("Cache-Control", "public, max-age=86400");
      }
    },
  })
);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, model: MODEL });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { system, user } = req.body || {};
    if (typeof user !== "string" || !user.trim()) {
      return res.status(400).json({ error: "Missing 'user' message." });
    }

    const messages = [
      { role: "system", content: (system || "You are BRIDGEBOT, the AI guide for BRIDGE — an advanced-technology learning, innovation, and demonstration centre in Abu Dhabi. BRIDGE offers hands-on training (Lean, Six Sigma, Lean Digital, Agile, Data Analytics, IoT), labs with cobots, AGVs, digital shop-floor tools, and additive manufacturing, plus programmes like CEO 4.0 and an Engineering Bootcamp, and hosts workshops, competitions, and visits. Never mention 'LIF' or 'Learning & Innovation Factory' — always say 'BRIDGE'. Reply in short, warm English.").slice(0, 2000) },
      { role: "user", content: user.slice(0, 2000) },
    ];

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.5,
        max_tokens: 300,
      }),
    });

    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      console.error("[server] OpenAI error", r.status, detail);
      return res.status(502).json({ error: "Upstream AI error.", status: r.status });
    }

    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content?.trim() || "Sorry, I couldn't come up with a reply.";
    res.json({ reply });
  } catch (err) {
    console.error("[server]", err);
    res.status(500).json({ error: "Server error." });
  }
});

function getLanAddresses() {
  const addrs = [];
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) addrs.push(net.address);
    }
  }
  return addrs;
}

function logListening(protocol, port) {
  const lan = getLanAddresses();
  console.log(`[server] BRIDGEBOT listening on ${protocol}://localhost:${port}`);
  for (const ip of lan) console.log(`[server]   LAN: ${protocol}://${ip}:${port}`);
}

http.createServer(app).listen(PORT, HOST, () => logListening("http", PORT));

// Optional HTTPS — required for microphone + SpeechRecognition on non-localhost origins
// (tablets, phones on the LAN). Drop cert.pem + key.pem into server/certs/ to enable.
// Generate with mkcert:  mkcert -install && mkcert <your-pc-ip> localhost 127.0.0.1
const certDir = path.join(__dirname, "certs");
const keyPath = path.join(certDir, "key.pem");
const certPath = path.join(certDir, "cert.pem");
if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  const creds = { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) };
  https.createServer(creds, app).listen(HTTPS_PORT, HOST, () => logListening("https", HTTPS_PORT));
} else {
  console.log(`[server] HTTPS disabled — add server/certs/{key.pem,cert.pem} to enable.`);
  console.log(`[server]   Mic/speech recognition on tablets requires HTTPS.`);
}
