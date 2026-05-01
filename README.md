# BRIDGEBOT

A 3D avatar chatbot that acts as the AI guide for **BRIDGE** — an advanced-technology learning, innovation, and demonstration centre in Abu Dhabi, located inside the EDGE Group campus.

Visitors can ask BRIDGEBOT for directions (VIP room, offices, classrooms), facility information, and details about BRIDGE programmes (Lean, Six Sigma, Lean Digital, Agile, Data Analytics, IoT, CEO 4.0, Engineering Bootcamp, etc.). The bot replies with voice and a lip-synced 3D avatar.

## Features

- 3D avatar (`muhammad.glb`) rendered with Three.js
- Voice interaction — text-to-speech replies and SpeechRecognition input
- Local FAQ lookup via [faqs.json](faqs.json) for instant directions and facility answers
- Falls back to OpenAI (`gpt-4o-mini` by default) for open-ended questions, proxied through the backend so the API key stays server-side
- Light/dark theme with persisted preference
- LAN-ready: the dev server listens on `0.0.0.0` so tablets and phones on the same network can connect
- Two deploy targets out of the box:
  - **Local Express server** ([server/server.js](server/server.js)) for development and on-site kiosks
  - **Vercel serverless function** ([api/chat.js](api/chat.js)) for hosted deployment

## Project structure

```
.
├── index.html          # UI shell, styles, theme bootstrap
├── app.js              # Avatar, voice, chat, FAQ matching, OpenAI client
├── muhammad.glb        # 3D avatar model
├── audio1-4.mp3        # Idle/greeting audio clips
├── faqs.json           # Local Q&A knowledge base
├── avatar/             # Avatar assets
├── vendor/three/       # Vendored Three.js (no CDN dependency)
├── server/server.js    # Express server (local dev / kiosk)
└── api/chat.js         # Vercel serverless handler (hosted deploy)
```

## Setup

```bash
npm install
```

Create a `.env` file in the project root:

```
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini   # optional, this is the default
PORT=8787                  # optional
HTTPS_PORT=8788            # optional
```

## Running locally

Run the API server and the static front-end together:

```bash
npm run dev:all
```

Or run them separately:

```bash
npm run server   # API on http://localhost:8787
npm run dev      # static site via `npx serve`
```

Open the printed URL in a browser. The server also logs LAN addresses so you can open the bot on a tablet on the same Wi-Fi.

### HTTPS for tablets (microphone access)

Browsers block microphone and SpeechRecognition on non-localhost origins unless the page is served over HTTPS. To enable HTTPS for LAN devices, drop a cert and key into `server/certs/`:

```bash
mkcert -install
mkcert <your-pc-ip> localhost 127.0.0.1
# move the generated files to server/certs/cert.pem and server/certs/key.pem
```

The server picks them up automatically and starts an HTTPS listener on `HTTPS_PORT`.

## Deploying to Vercel

The repo is Vercel-ready: static assets are served from the project root and the chat endpoint lives at [api/chat.js](api/chat.js). Set `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`) in the Vercel project's environment variables, then deploy.

## Editing the knowledge base

[faqs.json](faqs.json) holds the local Q&A entries. Each entry has:

- `q` — canonical question (for reference)
- `a` — answer the bot speaks
- `k` — keywords used for matching the user's input

Add or edit entries to teach the bot about new rooms, facilities, or programmes. Anything not matched locally falls through to OpenAI.

## Authors

Built by **Awaiz Ahmed** and **Haroon Siddiqui** (Software Engineers at BRIDGE), with **Babu** on the team.
