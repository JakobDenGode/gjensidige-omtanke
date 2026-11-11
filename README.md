# Gjensidige Omtanke

A minimal Next.js App Router application with TypeScript and ESLint.
The first iteration displays "Hello world" at `/`.
There is no authentication, database, or API, and no environment variables are required.

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

Import `JakobDenGode/gjensidige-omtanke` at https://vercel.com/new.
Use the Next.js preset, the repository root, and Node.js 24.x.
No environment variables are needed.

Once connected, Vercel deploys `main` to production and creates preview deployments
for pull requests. The Vercel dashboard shows the assigned public URL.

## Scope

Keep this iteration small. Add mocked functionality before introducing real
authentication, Supabase, or REST endpoints. Never commit credentials or `.env` files.
