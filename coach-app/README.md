# CoachOS (coach-app)

Private coach workspace: clients, session logs, schedule, and a public booking page. Data stays in **this browser** via `localStorage` (no backend).

## Requirements

- **Node.js** 20.19+ (or current LTS). See `engines` in `package.json`.
- **npm** 10+ (comes with Node).

## Run locally

From this folder (`coach-app/`):

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **(Optional) Access phrase**

   Copy `.env.example` to `.env` and set `VITE_ACCESS_PASSWORD` if you want a simple gate before the app loads. Rebuild after changing env vars.

   ```bash
   cp .env.example .env
   # edit .env — optional
   ```

3. **Start dev server**

   ```bash
   npm run dev
   ```

   Open the URL Vite prints (usually `http://localhost:5173`).

4. **Production build (sanity check)**

   ```bash
   npm run build
   npm run preview
   ```

## Scripts

| Command           | Purpose                          |
| ----------------- | -------------------------------- |
| `npm run dev`     | Local development with HMR       |
| `npm run build`   | Typecheck + Vite build → `dist/` |
| `npm run preview` | Serve `dist/` locally            |
| `npm run lint`    | ESLint                           |

## Deploy to Vercel

### Option A — Dashboard (recommended first time)

1. **Push Git to GitHub** (if this isn’t on GitHub yet): create an empty repo, then from the repo root (parent of `coach-app` if you use the monorepo layout):

   ```bash
   git remote add origin https://github.com/YOU/YOUR-REPO.git
   git push -u origin main
   ```

2. In [Vercel](https://vercel.com): **Add New… → Project** → import that GitHub repo.

3. **Root Directory:** set to **`coach-app`** (the folder that contains `package.json` and `vercel.json`).

4. Leave **Framework Preset** as Vite (or “Other” with **Build** `npm run build` and **Output** `dist`).

5. **Deploy.** Your app URL will look like `https://something.vercel.app`.

6. *(Optional)* **Settings → Environment Variables:** add `VITE_ACCESS_PASSWORD`, then **Redeploy** so the access gate is baked into the build.

`vercel.json` rewrites client routes to `index.html` so `/clients`, `/book`, etc. work on refresh.

### Option B — CLI

From `coach-app/`:

```bash
npx vercel login
npx vercel link    # once per folder
npx vercel --prod
```

No server, database, or `VITE_*` secrets are required for core behavior.

## Optional access phrase

If `VITE_ACCESS_PASSWORD` is set at **build** time, the app shows a single password screen until the correct phrase is entered. Unlock state is kept in **`sessionStorage`** (cleared when the tab closes).

**Limitation:** the value is compiled into the frontend bundle. It only discourages casual visitors, not someone inspecting the assets.

## Data storage

Coach data is stored under keys prefixed with `coach-os.v1` in `localStorage`. Clearing site data for your origin removes it. There is no sync between devices.
