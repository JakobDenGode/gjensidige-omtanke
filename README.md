# Gjensidige Omtanke

A minimal Next.js App Router application with TypeScript and ESLint.
The homepage displays "Gjensidige Omtanke" with lightweight local styles matching
[Gjensidige Builders](https://www.gjensidige.builders/docs/core/?path=/docs/get-started--about).
It loads Gjensidige Display and Sans from the public Gjensidige CDN, with no
Builders npm packages or analytics dependencies. Future functionality is mocked
with local data until real integrations are explicitly requested; see `AGENTS.md`.
There is no authentication, database, or API, and no environment variables are required.

Live app: https://gjensidige-omtanke.vercel.app

Repository: https://github.com/JakobDenGode/gjensidige-omtanke

## Local Development

Use Node.js 24 LTS and npm. With nvm installed:

```bash
nvm install
nvm use
npm ci
npm run dev
```

Open http://localhost:3000. Edit `src/app/page.tsx` to change the homepage.

## Checks

```bash
npm run lint
npm run typecheck
npm run build
```

GitHub Actions runs these checks for pull requests and pushes to `main`.
To serve a production build locally, run `npm start` after building.

## Vercel Deployment

The repository is connected to the `gjensidige-omtanke` Vercel project.
It uses the Next.js preset, the repository root, and Node.js 24.x.
No environment variables are needed.

Vercel deploys `main` to production and creates preview deployments
for pull requests. The Vercel dashboard shows the assigned public URL.

## Scope

Keep this iteration small. Add mocked functionality before introducing real
authentication, Supabase, or REST endpoints. Never commit credentials or `.env` files.
