# DeployReady

Free tool to check websites and project files for deployment readiness.

- **URL checks**: online status, SSL validity, page load speed, meta/OG tags, mobile viewport.
- **File analyzer**: upload a `.zip` of your project; detects missing files (`package.json`, lockfile, `.env.example`, README, build scripts), broken local imports, and imported packages not in `package.json`.
- **AI Fix Prompts**: each issue ships with a ready-to-copy prompt for Claude / ChatGPT / Cascade.
- **PDF report**: downloadable full report at `/report`.

## Stack

- Next.js 14 (App Router, TypeScript)
- Tailwind CSS (dark UI)
- `jszip` for archive parsing (server-side)
- `jspdf` for client-side PDF generation
- `lucide-react` icons

No database. Stateless. No login.

## Dev

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Deploy

Deploys cleanly on Vercel / Netlify / any Node host.

```bash
npm run build
npm start
```

Domain: [deployready.in](https://deployready.in)
