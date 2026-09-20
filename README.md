# FluentBuddy - AI-Powered English Learning Platform

FluentBuddy is an interactive English-learning web app that combines structured practice (speaking, writing, reading) with AI-powered assistance and developer-friendly APIs. It includes a floating AI assistant (Buddy) available across all pages, file upload + PDF/code explain features, invite/notes flows, and contribution analytics.

## Why FluentBuddy

Learners often lack affordable, personalized practice with actionable feedback. FluentBuddy helps by combining leveled exercises with fast AI guidance, real-time speaking practice, and persistent progress tracking.

## Features

- Floating AI assistant (Buddy) — available across all pages; supports text chat, TTS, and optional STT.
- Explain Code: upload source files or paste code, then get line-by-line explanations from the AI.
- PDF Explain: upload PDFs and receive extracted/summarized explanations.
- Practice modules: speaking, writing, reading with instant feedback.
- Notes & Member Invites: collaborative notes and invite/accept flows for team sharing.
- Project analytics: contribution and file-upload statistics, progress dashboards.
- Public shareable read-only project pages.
- Authenticated user profiles with progress persistence.

## Tech stack

Frontend: HTML, CSS, Vanilla JavaScript (shared layout injection), Web Speech API for TTS/STT.

Backend: Node.js + Express. Data persisted in MongoDB via Mongoose. Key integrations:

- Google Gemini / Generative AI (via @google/genai) for Explain Code, chatbot, and STT fallbacks
- Multer for file uploads, pdf-parse for PDF text extraction
- JWT for authentication and route protection

## Project layout (important files)

```
FluentBuddy/
├─ server/
│  ├─ server.js
   │  ├─ controllers/
   │  │  ├─ aiController.js
   │  │  └─ chatbotController.js
   │  ├─ routes/
   │  │  ├─ chatbotRoutes.js
   │  │  └─ authRoutes.js
   │  └─ database/db.js
├─ public/
│  ├─ js/
│  │  ├─ layout.js
   │  │  └─ ChatWidget.js
│  ├─ css/chat-widget.css
│  └─ *.html (dashboard, practice, profile, etc.)
├─ package.json
└─ README.md
```

## Quick start (development)

Prereqs: Node.js (16+), npm, MongoDB running locally or remotely.

1) Install dependencies

```bash
npm install
```

2) Environment

Create a `.env` in the project root with at least:

```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/fluentbuddy
JWT_SECRET=your_jwt_secret
GOOGLE_API_KEY=...  # optional for Gemini integrations
```

3) Run

```bash
npm run dev   # starts server with nodemon (if configured)
npm start     # production start
```

4) Open: http://localhost:3000

## Usage highlights

- Floating AI assistant: click the FAB (bottom-right) to open Buddy; click again to close — it now reliably reopens on each click.
- Chat: type messages or use the mic button for speech input. Buddy replies formally and will avoid markdown/asterisk formatting.
- Explain Code / PDF Explain: use the file upload area in the project page to upload source files or PDFs; the backend extracts content and asks the AI for line-by-line or summarized explanations.
- Notes & Invites: create notes, invite members, and accept/reject invites from the dashboard (see UI flows).
- Public share: generate a read-only public link for projects.

If you are developing locally, use the browser devtools console to see API requests and widget logs.

## Key API endpoints (examples)

- `POST /api/chatbot/query` — send a chat message to Buddy (supports guest queries when allowed)
- `POST /api/chatbot/stt` — submit audio for transcription (protected)
- `POST /api/projects/:id/upload` — upload files for a project (PDF, code files)
- `GET /api/projects/:id/share` — public read-only project page
- `POST /api/auth/login` — login and receive JWT

See `server/routes/` for full route list and implementation details.

## Contributing

Contributions are welcome. Common tasks:

- Improve AI prompts and normalization in `server/controllers/chatbotController.js`.
- Add more file parsers (OCR for scanned PDFs).
- Persist chat history and sessions in the DB.

Please open issues or pull requests. Follow existing code style and run the app locally to test changes.

## Environment & security notes

- Keep secrets in environment variables (`.env` or platform config). Do not commit keys.
- Ensure `JWT_SECRET` is set and strong for production.
- When deploying, enable HTTPS and configure allowed origins for API access.
## Troubleshooting

- If port 3000 is in use, set `PORT` env var: `PORT=3001 npm start`.
- For speech/STT issues, ensure browser permissions and use Chrome for best support.

## License

MIT — educational use encouraged.

---

Updated README — see [README.md](README.md) for details.
# FluentBuddy
