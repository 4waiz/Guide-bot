// Vercel serverless function: POST /api/chat
// Proxies chat requests to OpenAI using OPENAI_API_KEY from project env vars.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("[api/chat] Missing OPENAI_API_KEY env var");
    return res.status(500).json({ error: "Server is missing OPENAI_API_KEY." });
  }

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const { system, user } = body;
    if (typeof user !== "string" || !user.trim()) {
      return res.status(400).json({ error: "Missing 'user' message." });
    }

    const defaultSystem = "You are BRIDGEBOT, the AI guide for BRIDGE — an advanced-technology learning, innovation, and demonstration centre in Abu Dhabi. BRIDGE offers hands-on training (Lean, Six Sigma, Lean Digital, Agile, Data Analytics, IoT), labs with cobots, AGVs, digital shop-floor tools, and additive manufacturing, plus programmes like CEO 4.0 and an Engineering Bootcamp, and hosts workshops, competitions, and visits. Never mention 'LIF' or 'Learning & Innovation Factory' — always say 'BRIDGE'. Reply in short, warm English.";

    const messages = [
      { role: "system", content: (system || defaultSystem).slice(0, 2000) },
      { role: "user", content: user.slice(0, 2000) },
    ];

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.5,
        max_tokens: 300,
      }),
    });

    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      console.error("[api/chat] OpenAI error", r.status, detail);
      return res.status(502).json({ error: "Upstream AI error.", status: r.status });
    }

    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content?.trim() || "Sorry, I couldn't come up with a reply.";
    return res.status(200).json({ reply });
  } catch (err) {
    console.error("[api/chat]", err);
    return res.status(500).json({ error: "Server error." });
  }
}
