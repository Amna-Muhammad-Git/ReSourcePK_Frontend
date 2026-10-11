# ReSource PK Frontend

Responsive React web application for the ReSource PK public site and role-aware workspaces.

For beginner clone, credential setup and feature checks, follow [the local preview guide](docs/local-preview-guide.md). The onboarding/catalog patches are included in the consolidated code; do not apply them again.

## Local setup

1. Copy `.env.example` to `.env`.
2. Set `VITE_API_URL` to the deployed or local API ending in `/api/v1`.
3. Run `npm ci` and `npm start`.

Use `npm run build` for the optimized Vite deployment build. Vercel SPA rewrites are defined in `vercel.json`.
