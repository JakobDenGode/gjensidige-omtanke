# Project Instructions

## Design and Mock Functionality

- Use Gjensidige Builders as the visual reference: https://www.gjensidige.builders/docs/core/?path=/docs/get-started--about
- Recreate only the UI needed for this app with semantic HTML, React, and local CSS. Do not install Builders npm packages or add analytics dependencies.
- Match Builders typography, colors, spacing, and responsive behavior. Keep the required design values in local CSS custom properties rather than duplicating them across components.
- Use Gjensidige Display for headings and Gjensidige Sans for body text via the public Gjensidige CDN font definitions in `src/app/globals.css`.
- Mock all new functionality with local sample data and client-side interactions until explicitly asked to connect real services. Do not introduce authentication, a database, Supabase, or external APIs by default.
- Preserve accessibility when recreating UI: semantic landmarks and headings, labeled controls, keyboard interaction, visible focus, and mobile layouts without horizontal overflow.
- Keep implementations small. Add shared components only when reuse is needed.

## Supabase

- Supabase is explicitly approved for real persistence. Project: `fiobfnbeiqmdlffntxxv` (Stockholm).
- Keep schema changes in `supabase/migrations`. Enable row-level security and restrict records to their authenticated owner; never allow anonymous public access to personal data.
- Only public client keys may use `NEXT_PUBLIC_` variables. Never commit secrets, service-role keys, or database passwords.
- `/design` accounts, requests/offers, and user–friend connections use Supabase. Speech input uses optional browser recognition, with explicit microphone consent and typing fallback. Alerts, devices, professional bookings, appointments, and delegated friend previews are clearly labeled examples, not integrations.
- Use user/friend terminology (Bruker/Venn in Norwegian), not age-based labels. Connection roles are per relationship, not account-wide privileges. A user can have multiple friends. Connections do not automatically share requests or health information.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
