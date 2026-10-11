# ReSource PK Frontend

Responsive React web application for the ReSource PK public site and role-aware workspaces.

For beginner clone, credential setup and feature checks, follow [the local preview guide](docs/local-preview-guide.md). The onboarding/catalog patches are included in the consolidated code; do not apply them again.

## Local setup

1. Copy `.env.example` to `.env`.
2. Set `VITE_API_URL` to the deployed or local API ending in `/api/v1`.
3. Run `npm ci` and `npm start`.

Use `npm run build` for the optimized Vite deployment build. Vercel SPA rewrites are defined in `vercel.json`.

## Current catalog verification

Read [Week 2 setup and verification](docs/verification-week-2.md), [delivery status](docs/delivery-status.md) and [catalog ADR 004](docs/adr/004-catalog-completion.md). This UI/API slice needs migrations 004–005 and coordinated deployment; previous sessions must sign in again. Image storage and synthetic seed are explicit optional configuration, not hardcoded data.
