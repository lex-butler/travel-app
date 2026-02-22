# TripSync — Claude Code Guidelines

## Project
React + Vite + TypeScript collaborative trip planning app.
Firebase (Auth, Firestore, Storage) + Zustand + shadcn/ui + Tailwind CSS v4.

## Secrets & Environment Variables

**Never hardcode secrets or API keys in source files.**

- All environment config goes in `.env.local` (gitignored — never committed)
- Frontend Firebase config (`VITE_FIREBASE_*`) is intentionally public-facing; it
  ends up in the browser bundle. Security is enforced via Firebase Security Rules.
- For true backend secrets (third-party API keys, service account credentials, etc.)
  used in Cloud Functions: use **Firebase Secrets Manager**
  (`firebase functions:secrets:set SECRET_NAME`), never `.env` files on the server.
- Never commit `.env`, `.env.local`, or any file containing credentials to git.

## Firebase Project
- Project ID: `travel-app-5cdd1`
- Web App ID: `1:504141892142:web:37fdb2dd0a20db076aadbf`

## Key Conventions
- Path aliases: `@/` → `src/`
- State: Zustand stores in `src/stores/`
- Firebase services: `src/services/` (auth.ts, tripService.ts, etc.)
- Types: `src/types/index.ts` (single source of truth)
- Components: shadcn/ui primitives + custom components in `src/components/`
- Forms: react-hook-form + Zod validation
