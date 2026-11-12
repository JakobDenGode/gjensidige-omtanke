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

The home screen has a separate "Forespørsler" button. It opens own requests and
requests sent to the signed-in user in pale-blue cards, with expandable details,
cancellation, replies, and reviews. Mine avtaler now contains appointments only.
The friends overview no longer has "Se som venn"; individual "Se tilgang" links
still open the actual shared profile information.

### Helper Travel Distance

Contribution preferences and Min profil offer 1, 3, or 9 km travel radius (default 3).
The authenticated `/api/helpers` endpoint uses Norwegian postal-code coordinates
from Zippopotam.us, cached daily, and filters each helper by their own chosen radius.
Distances are approximate straight-line distances between postal-area locations,
not street-address or road distances. Different cities can match when nearby.
Both parties need resolvable postcodes. Missing locations are excluded, never
guessed from city centers. Exact addresses are not sent to the lookup provider.
Postcodes are used in provider requests; the returned helper list omits them.
There is no guarantee of geographic precision or provider availability for this POC.

Contribution preferences offer eight explicit activities: snow removal, visits,
shopping, gardening, watering plants, mobile/computer help, collecting parcels,
and accompanying walks. Both the contribution dialog and profile use these
choices with task icons. Earlier broad choices are retained as removable legacy
selections rather than automatically assuming willingness for specific tasks.

### Helper Directory

Winter requests can go to users outside the friend network. All completed
profiles are listed, including existing accounts, with name, city, skills, photo,
and real review scores/latest review available to signed-in users. Phone listing
requires a separate opt-in. Private addresses, help needs, and email are never listed.
The winter helper list shows users in the customer's saved city, alphabetically, regardless of
friend connections. It does not filter by skill or use precise geolocation.
Visibility is always enabled and cannot be switched off. Incomplete profiles and
the requesting user's own account are excluded. Requests do not create friendships.
The weather card describes possible melting, not confirmed flooding or insurance.

### Appointments Between Accounts

Mine avtaler shows pale-blue appointment cards with helping/receiving roles,
Norwegian date/time, meeting place, and the real friend's name. Users propose
appointments to connected friends; only the other participant can accept. Pending
proposals are not shown as confirmed. Either participant can cancel.
Each person separately opts in to sharing their own profile phone number for an
appointment. Numbers are exposed only after confirmation while still connected,
and consent can be withdrawn. Appointments remain in participant history after
friend removal, but phone access stops. Requests and reviews remain in a separate
expandable section. No external calendar or email delivery is integrated.

### Profile Pictures

Min profil supports uploading, replacing, and removing an optional photo. This
uses the existing Supabase Storage service, not a new paid provider; storage and
bandwidth still count against the project's plan quotas. Input supports JPEG,
PNG, or WebP up to 5 MB, re-encoded in the browser to a centre-cropped 256px JPEG
without original metadata. One object per user prevents accumulating old versions.

The `profile-photos` bucket is private. Owners can upload/delete only their own
`<user-id>/avatar.jpg`; current friends and household members can view images via
60-second signed URLs. Already-issued links remain valid until they expire after
a friendship ends. Photos appear in friends, households, and helper selection;
missing photos fall back to initials. This POC has no moderation or malware scanner.

### Households, Reviews, and Property Advice

"Min profil" supports home type, a basement flag, a user-reported current snow
flag, and an optional insurer name. These are owner-only and unverified. Insurance
coverage, prices, claims decisions, and sensor observations are not integrated.
When the user reports snow and a basement and MET forecasts above-freezing
temperatures, the app offers precautionary advice about drains and meltwater.
It does not confirm flooding or coverage; keep the snow flag up to date manually.

Create or join a household from the profile page. Each member has a separate
account, joins with a private single-use seven-day invitation, and edits only
their own preferences. Members see names and preferences, not addresses, policy
details, or private requests. Owners can remove members, revoke invitations,
or delete the household; other members can leave. One household per account.

Under "Mine avtaler", request owners can mark an accepted current friend's help
as actually completed and review that helper once per task. Reviews and aggregate
scores are shown only to the helper and their current friends. No fictional
ratings are created. Completion is owner-confirmed, not independently verified.
Choose the helper who actually performed the task; a positive reply alone does
not mean completion. Existing live clients can still cancel through a guarded
status update, but cannot fabricate completed requests or reopen closed tasks.

Security checks:

```bash
npx supabase@latest db query --remote=fiobfnbeiqmdlffntxxv --file supabase/tests/households_reviews.sql --yes
```

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
"Mine avtaler" contains real saved requests and friend responses. "Min profil"
sits next to "Mine venner" in the lower navigation and opens `/design/profile`.
The contribution card updates the signed-in person's help preferences in Supabase,
not the sketch's fictional household members.

The weather action opens four steps: select multiple winter tasks, choose one
actual friend, select alternative dates in the next year and a time window,
then review and send. These structured values are saved and shown to recipients.
The calendar is preferred availability, not confirmed helper availability.
No fictional reviews, photos, or ratings are used for helpers.

Superseded voice controls, header menus, sensor/delegated previews, and fictional
appointments have been removed. The sketch's insurance and snowmelt claims are
not copied into live forecasts: these require verified policy, property, and
snow-cover data. Existing request records are retained.

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

### Customer Profiles and Network Tasks

Onboarding now requires a full name, city, and a review of task preferences.
Street address, Norwegian postal code, and phone are optional and owner-only.
Users may leave either preference list empty. "Min konto → Min profil" edits all fields.
Existing city-only profiles are prompted to complete these fields on next entry.

Connected friends can see name, city, and task preferences through a limited RPC;
they cannot read the underlying profile, street address, postal code, or phone.
Invitations use the saved profile name, and accounts are linked by the authenticated
acceptance of a private single-use code, never by matching an address or name.
Names and email ownership are not verified in the current demo.

The final request step allows selecting one or more friends. No recipients means
a private request. Sharing and creation happen atomically through an RPC that
checks every recipient against the current network. Friends see assigned requests
under "Mine avtaler" and can say whether they can help; owners can review replies
there. A positive response is not a booking or exclusive task assignment.
Contact and scheduling remain outside the app. No email/push delivery is configured.
Removing a friend revokes shared-request access while disconnected. Reconnecting
the same accounts restores access to their earlier shared requests.

Test privacy, sharing, replies, and removal with:

```bash
npx supabase@latest db query --remote=fiobfnbeiqmdlffntxxv --file supabase/tests/network_tasks_access.sql --yes
```

Open "Mine venner" in `/design`. A user creates a private invitation code and
shares it with a friend, who signs into their own account and accepts it.
Codes are single-use, expire after seven days, and are stored only as hashes.
Creating a new code replaces the user's previous invitation. Invitations can be revoked.
A user can connect to multiple friends; roles apply per relationship. Either
participant can remove a connection with confirmation. Connections are visible
only to their participants; requests are shared only with explicitly selected friends.
Connections do not grant access to health data.
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
