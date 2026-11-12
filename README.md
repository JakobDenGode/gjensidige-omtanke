# Gjensidige Omtanke

A minimal Next.js App Router application with TypeScript and ESLint.
The homepage displays "Gjensidige Omtanke" with lightweight local styles matching
[Gjensidige Builders](https://www.gjensidige.builders/docs/core/?path=/docs/get-started--about).
It loads Gjensidige Display and Sans from the public Gjensidige CDN, with no
Builders npm packages or analytics dependencies. Future functionality is mocked
with local data until real integrations are explicitly requested; see `AGENTS.md`.
The `/design` page supports Supabase email/password accounts and private persisted
help requests/offers, including cancellation. Other services remain prototypes.

## Design Experience

### Live Snow Forecasts

The home screen uses MET Norway Locationforecast, via authenticated `POST /api/weather`.
After signing in, accounts without a city must choose one before entering the app.
The city is stored in the owner-only `customer_profiles` table. Weather loads
automatically for that city. Change it under "Min konto → Endre by".
The initial supported cities are Oslo, Bergen, Trondheim, Stavanger, and Tromsø.
No street address or browser geolocation is collected. City-center coordinates
are sent to MET; the hosting provider may retain request logs.
The server identifies the app to MET and caches forecasts until at least their
Expires time, with a ten-minute minimum. Location data is sent to MET by the server.
MET's terms were reviewed and approved by the project owner before integration:
https://api.met.no/doc/TermsOfService.

A snow or sleet symbol in the next 24 hours' available hourly forecasts displays a suggestion,
not an observation, accumulation estimate, emergency alert, or claim that plowing
is necessary. Snow and sleet are reported separately. An expandable table shows
the source symbols, temperature, and precipitation in mm water (not cm snow).
Missing or stale data shows an error rather than clear weather. Incomplete hourly
coverage is labeled explicitly. City-center forecasts can differ from specific
neighborhoods or the selected Yr location, especially near freezing.
"Jeg trenger hjelp med å måke" opens the real request flow, prefilled for snow
removal. Confirmation saves it privately; no helper is automatically assigned.
Snow removal can also be requested manually, without weather or location access.
There are no background/push notifications. Weather loads on entering the app;
use "Oppdater værvarsel" to refresh it explicitly.
Forecast data is credited to MET Norway under CC BY 4.0; the snow suggestion is
derived by the app. Run forecast tests with `node --test tests/weather.test.mjs` (Node 24).

`/design` follows the revised sketch: a narrow app shell on all screen sizes,
two-column action cards, fixed bottom navigation, and secondary views in dialogs.
"Mine avtaler" contains actual saved requests alongside clearly marked example
appointments. "Min konto" also opens health, home services, and smart products.

The home weather card uses real forecasts and opens saved snow-help requests.
Earlier example-alert components are not displayed in the home screen.
Smart-product states and the friend-view preview are fictional. Real connections
are still managed separately; the preview cannot access another user's records.

Speech input uses browser speech recognition in Norwegian when supported. It
requires an explicit start and microphone permission, stops on dialog dismissal,
and always offers editable text and a typing fallback. Audio may be processed by
the browser vendor; no transcription provider or audio storage is configured.

Official danger alerts, sensors, professional bookings, appointments, and delegated friend
access require separate integrations and explicit authorization rules before use.

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
Configure the two public Supabase variables from `.env.example` in Vercel before
deploying database-connected functionality. Never expose a service-role key.

Vercel deploys `main` to production and creates preview deployments
for pull requests. The Vercel dashboard shows the assigned public URL.

## Supabase Setup

### User–Friend Connections

Open "Mine venner" in `/design`. A user creates a private invitation code and
shares it with a friend, who signs into their own account and accepts it.
Codes are single-use, expire after seven days, and are stored only as hashes.
Creating a new code replaces the user's previous invitation. Invitations can be revoked.
A user can connect to multiple friends; roles apply per relationship. Either
participant can remove a connection with confirmation. Connections are visible
only to their participants and do not grant access to requests or health data.
Display names are supplied by participants, not verified identities.

Dashboard: https://supabase.com/dashboard/project/fiobfnbeiqmdlffntxxv

The project is in Stockholm under JakobDenGode's Org. Local connection settings
are in ignored `.env.local`; `.env.example` documents the required public variables.
The client factory is in `src/lib/supabase.ts`.

Version-controlled migrations define `help_requests` for requests and offers.
Authenticated users can create/read their own records and update their status.
Anonymous access is denied. Sign up on `/design` to sign in immediately.
Email ownership is not verified: confirmation is disabled for this demo.
Signed-out visitors see only the login/registration screen. The application is
not mounted until the session is loaded and signed in. Account details and sign-out
are available in the header's "Min konto" dropdown; Escape or an outside click
closes it. Database row-level security remains the authorization boundary.
Saved requests appear in "Mine avtaler" and survive refreshes. Cancellation
changes the saved status; it does not delete the record or book a real service.

The initial migration has been applied through the CLI query API and registered
in Supabase migration history because the direct `db push` login timed out.

Authentication configuration in `supabase/config.toml` specifies the production
site URL, local/production confirmation redirects, and disabled email confirmation. These
settings have been synced to hosted Auth after reviewing `supabase config diff`.
Before using real personal data or launching beyond the demo, configure custom
SMTP and re-enable email confirmation. The default email service is restricted
and rate-limited. Existing unconfirmed accounts may still need recovery separately.

Run the rollback-only owner isolation test against the hosted project:

```bash
npx supabase@latest db query --remote=fiobfnbeiqmdlffntxxv --file supabase/tests/request_access.sql --yes
```

```bash
npx supabase@latest login
npx supabase@latest db push --remote=fiobfnbeiqmdlffntxxv
```

The initial database password was generated during provisioning and is not stored
in the repository. Reset it in the dashboard if direct database access is needed.

Keep this iteration small. Add mocked functionality before introducing real
authentication, Supabase, or REST endpoints. Never commit credentials or `.env` files.
