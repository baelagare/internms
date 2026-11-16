# InternMS: low-cost deployment checklist

This repo contains a React/Vite frontend (`frontend/`) and a Laravel 12 API (`backend/`). A practical low-cost starting point is Vercel for the frontend, Render for the API, and Neon for PostgreSQL.

## 1. GitHub preparation

1. In PowerShell, from `C:\projects\internms`, check the repository state:
   ```powershell
   git status --short
   ```
2. Ensure `.env` files are not committed. This repository ignores `backend/.env` and `frontend/.env`; keep them that way.
3. Ensure generated dependency/build directories aren't committed. `frontend/node_modules`, `frontend/dist`, and `backend/vendor` should be ignored. If any are tracked, stop and remove them from Git's index before pushing.
4. Commit and push the intended project files to the connected GitHub repository.

## 2. Neon PostgreSQL

1. Sign up at <https://console.neon.tech> and create a PostgreSQL project in a region close to the Render service.
2. Save the connection host, database, username, and password securely. Do not put credentials in Git.
3. This application requires PostgreSQL migrations. Deploying with the existing schema is not automatic; run the migration command in the Render service's **Pre-Deploy Command** if that option is available on the chosen plan. Otherwise, use Render's one-off shell/job facility on a paid plan or run migrations from a secured local connection to Neon.
4. The Laravel Postgres connection supports `DB_SSLMODE`; set it to `require` for hosted PostgreSQL.

## 3. Render API

1. Go to <https://dashboard.render.com> → **New** → **Web Service**, and connect the GitHub repository.
2. Set **Root Directory** to `backend` and **Language/Runtime** to **Docker**. The Dockerfile is `backend/Dockerfile`. Render builds it in the cloud; a local Docker installation is optional.
3. Start with the free instance for a demo or choose an always-on paid instance for a more reliable app. Free services can sleep when idle; local container files are ephemeral.
4. Set these service environment variables in Render (replace the example values):

   ```text
   APP_NAME=InternMS
   APP_ENV=production
   APP_DEBUG=false
   APP_KEY=base64:REPLACE_WITH_A_NEW_RANDOM_LARAVEL_KEY
   APP_URL=https://YOUR-RENDER-SERVICE.onrender.com
   APP_TIMEZONE=Asia/Manila
   APP_TRUSTED_PROXIES=*
   LOG_CHANNEL=stderr
   LOG_LEVEL=warning
   SANCTUM_EXPIRATION=10080
   DB_CONNECTION=pgsql
   DB_HOST=YOUR-NEON-HOST
   DB_PORT=5432
   DB_DATABASE=YOUR-NEON-DATABASE
   DB_USERNAME=YOUR-NEON-USER
   DB_PASSWORD=YOUR-NEON-PASSWORD
   DB_SSLMODE=require
   SESSION_DRIVER=database
   CACHE_STORE=file
   CACHE_LIMITER=file
   QUEUE_CONNECTION=database
   CORS_ALLOWED_ORIGINS=https://YOUR-VERCEL-SITE.vercel.app
   GOOGLE_CLIENT_ID=YOUR-GOOGLE-OAUTH-CLIENT-ID
   INSTITUTION_EMAIL_DOMAIN=nemsu.edu.ph
   ```

5. Generate a fresh application key with `php artisan key:generate --show` from the backend working directory and paste the result into Render's `APP_KEY`. Never use `key:generate` against an existing production key; changing it later invalidates encrypted application data.
6. After the first Render deploy, test `https://YOUR-RENDER-SERVICE.onrender.com/api/v1/health`.

### Database migrations

The Docker image intentionally does **not** migrate the database on every container start. Configure Render's **Pre-Deploy Command** as:

```sh
php artisan migrate --force
```

A pre-deploy command might not be available on the free plan. If it is unavailable, do not assume the new database has tables: arrange a secure migration run using a supported paid one-off job/shell, or run migrations locally after securely configuring a local environment to connect to the production Neon database. Never run migrations against production without confirming the connection target and reviewing the pending migration list.

## 4. Vercel frontend

1. Go to <https://vercel.com/new> and import the same GitHub repo.
2. Set **Root Directory** to `frontend`, framework preset **Vite**, build command `npm run build`, output directory `dist`.
3. Add environment variables:

   ```text
   VITE_API_BASE_URL=https://YOUR-RENDER-SERVICE.onrender.com/api/v1
   VITE_GOOGLE_CLIENT_ID=YOUR-GOOGLE-OAUTH-CLIENT-ID
   ```

4. Deploy. Vite embeds these public values during the build; changing them requires another frontend deployment.
5. Copy the final Vercel URL and update Render's `CORS_ALLOWED_ORIGINS` to match it exactly, then redeploy the API.

## 5. Google OAuth

In <https://console.cloud.google.com/apis/credentials>, open the OAuth client and add the Vercel URL (for example `https://YOUR-VERCEL-SITE.vercel.app`) to **Authorized JavaScript origins**. Use the same OAuth client ID for both `GOOGLE_CLIENT_ID` on Render and `VITE_GOOGLE_CLIENT_ID` on Vercel.

## 6. Persistent uploaded files

The backend stores uploaded student documents and task-report evidence on Laravel's local `local` disk (`storage/app/private`). Render's free container filesystem is ephemeral, so files can disappear after restarts or redeploys. The current Dockerfile does not add persistent upload storage.

Before using real/student data, either:

- choose a Render plan that supports a persistent disk and mount it at `/var/www/html/storage/app/private`, or
- update the application to use durable object storage (for example Cloudflare R2) and test authenticated file downloads.

A working database alone does not make these uploaded files persistent.

## 7. Smoke checks after deploy

- API health URL returns JSON with `status: ok`.
- Frontend opens at its Vercel URL and routes to `#/login`.
- Browser developer tools show API requests going to the Render URL without CORS or mixed-content errors.
- Test host-representative login and institutional Google login.
- Test file upload and download, then confirm the chosen storage persists across a restart/redeploy.
- Check platform logs and database usage.

## Security and Git cleanup before pushing

The current checkout shows a large restructure in Git: the legacy root application is marked deleted, while `frontend/` and `backend/` are untracked. This may be intentional, but do not blindly restore all deletions or stage everything without reviewing `git status --short`. Check that the intended frontend/backend files, deployment files, and updated ignore files are included in your commit, and exclude local logs, profiles, dependencies, generated output, and secrets.

A root `.env` was tracked in this repository's Git history. Deleting it from the latest working tree does not erase it from previous commits. Before publishing this repository, rotate any passwords, API keys, Google credentials, or Laravel keys that were ever committed. If any are live, revoke/replace them. For a public repository or credentials that must be purged, rewrite Git history with a history-cleaning tool before pushing and coordinate the rewritten history with collaborators. `.gitignore` prevents future accidental additions; it does not remove past secrets.

Additional safeguards:

- Keep `APP_DEBUG=false`, use a unique production `APP_KEY`, and never expose secrets in `VITE_*` values.
- Authentication endpoints have a basic IP-based throttle of 10 requests per minute; adjust only after checking expected traffic and provider support.
- Configure a durable private file store before real uploads. The default Render filesystem is not durable across restarts/redeploys.
- Enable database backups and verify a restore plan before storing real student data. Free database tiers may not include backups or production support.
