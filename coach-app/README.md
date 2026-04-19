# CoachOS (coach-app)

Private coach workspace: clients, session logs, schedule, and a public booking page. With **Supabase** configured, coach routes require **email/password sign-in** (`/login`); the **public booking** page (`/book`) stays open. Data can sync via Supabase or fall back to `localStorage` when env vars are absent.

## Requirements

- **Node.js** 20.19+ (or current LTS). See `engines` in `package.json`.
- **npm** 10+ (comes with Node).

## Run locally

From this folder (`coach-app/`):

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment (Supabase)**

   Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for coach sign-in and data. Create a coach user under **Supabase → Authentication**. Rebuild after changing env vars.

   ```bash
   cp .env.example .env.local
   # edit .env.local
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

6. **Settings → Environment Variables:** add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then **Redeploy**.

`vercel.json` rewrites client routes to `index.html` so `/clients`, `/book`, etc. work on refresh.

### Option B — CLI

From `coach-app/`:

```bash
npx vercel login
npx vercel link    # once per folder
npx vercel --prod
```

Without Supabase env vars, the coach UI runs without login (local development only).

## Coach sign-in

When Supabase is configured, open `/login` and sign in with the coach account. Session persists across refresh (Supabase Auth). Use **Log out** in the coach header to clear the session. The public **`/book`** route does not require sign-in.

## Data storage

Coach data is stored under keys prefixed with `coach-os.v1` in `localStorage`. Clearing site data for your origin removes it. There is no sync between devices.
