import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 8787;
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const API_KEY = process.env.OPENAI_API_KEY;

if (!API_KEY) {
  console.error("[server] Missing OPENAI_API_KEY. Copy .env.example to .env and paste your key.");
  process.exit(1);
}

app.use(cors());
app.use(express.json({ limit: "32kb" }));

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

app.listen(PORT, () => {
  console.log(`[server] BRIDGEBOT API listening on http://localhost:${PORT}`);
});
