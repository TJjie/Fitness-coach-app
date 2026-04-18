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

1. Push the repo (or connect the repo in Vercel).
2. **Root directory:** set the Vercel project **Root Directory** to `coach-app` if the Git repo root is above this folder (e.g. monorepo `incoming-project/`).
3. **Framework preset:** Vite (auto-detected). Build command: `npm run build`, output: `dist`.
4. **Environment variables (optional):** add `VITE_ACCESS_PASSWORD` in Vercel if you want the optional gate. Redeploy after adding/changing it.
5. `vercel.json` in this folder rewrites client-side routes to `index.html` so React Router works on refresh and deep links (`/clients`, `/book`, etc.).

No server, database, or `VITE_*` secrets are required for core behavior.

## Optional access phrase

If `VITE_ACCESS_PASSWORD` is set at **build** time, the app shows a single password screen until the correct phrase is entered. Unlock state is kept in **`sessionStorage`** (cleared when the tab closes).

**Limitation:** the value is compiled into the frontend bundle. It only discourages casual visitors, not someone inspecting the assets.

## Data storage

Coach data is stored under keys prefixed with `coach-os.v1` in `localStorage`. Clearing site data for your origin removes it. There is no sync between devices.
