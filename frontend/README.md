# InternMS frontend

React 18 + Vite 5 + Tailwind CSS 3. Laravel API integration is enabled for the Milestone 6 contract.

## Run locally

With dependencies already installed, run from `C:\projects\internms\frontend`:

```powershell
npm.cmd run dev
```

Open http://localhost:5173/#/login or http://localhost:5173/#/register.
Authentication uses the Laravel API: Google Workspace ID-token sign-in for institutional roles and email/password for host company representatives. Protected screens require a real API-issued Sanctum token.

The API base URL is `VITE_API_BASE_URL` (default `http://localhost:8000/api/v1`). Google Identity Services requires `VITE_GOOGLE_CLIENT_ID`; leave it empty only when testing the host-company login tab.

## Checks

```powershell
npm.cmd test
npm.cmd run test:smoke
npm.cmd run build
npm.cmd run preview
```

The smoke command checks local HTTP serving and server-rendered empty screens, not browser interactions or accessibility compliance. No lint tool/script or typecheck script is configured. No packages were installed during Phase 2.

## Structure

- `c:\projects\internms\src\components`: existing shared UI and authentication screens.
- `c:\projects\internms\src\hooks`: shared React hooks.
- `c:\projects\internms\src\views`: role modules.
- `c:\projects\internms\src\services`: API transport, workspace normalization, mutation adapters, and read-only presentation helpers.
- `c:\projects\internms\src\config`: unfilled institution catalog.
- `c:\projects\internms\tests`: empty-state and validation checks without demo identities.
- `c:\projects\internms\docs\PHASE-2-REPORT.md`: cleanup results, limitations and retained files.
- `c:\projects\internms\docs\phase-2-file-changes.json`: complete per-file change manifest.

Copy `c:\projects\internms\frontend\.env.example` to `c:\projects\internms\frontend\.env` and set the API URL and Google client ID. `.env` is the local configuration file and is ignored by Git; `.env.example` is a safe template and should contain no real credentials. Never place private secrets in `VITE_*` variables.

Historical verification documents are retained and marked historical; they describe the removed implementation, not the current app. Old browser storage is not read or trusted. Clear site data manually if you want old records removed from a previously used browser; the cleanup does not access your browser profile.
