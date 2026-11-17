# Netlify cutover

Target: `https://wakefield-pool-championship.netlify.app` (existing site ID `1333ce6d-5a96-4a66-90cd-2d3228602bce`). Source: the current Sites project, `appgprj_6aeb921a08648191bd55829d33fc0562`.

## Current status

The migration completed on 9 November 2026. Netlify is the live club. The final production deploy is `6af24f2a68991cfaded70edb` and the retired Sites deployment uses version 22 with environment revision 6. Sites forwards web links, including dedicated competition and joining links. The retired Sites API returns HTTP 410. The frozen Sites database is retained for recovery.

The import advanced revision 9 to revision 10 and preserved all 42 registered players and four competitions. The source had zero issued PINs, fixtures, results and recovery snapshots. The temporary transfer token was removed from both hosts, and Netlify's transfer endpoint rejected it after the final deploy.

Mr French's generated administrator password is stored in this Mac's login Keychain as **Wakefield Pool Championship - Netlify**, account **Mr French**. The Netlify configuration stores a password verifier. Treat the saved password and the session secret as private.

## Implementation

- `netlify.toml` builds `netlify-dist/`; modern Netlify Function `club` serves `/api/*`. Browser requests stay on the Netlify hostname. No proxy to Sites is used after transfer.
- `@netlify/database` provisions PostgreSQL, and Netlify applies the generated schema migration from `netlify/database/migrations/` during deployment. Schema is separate from the existing immutable Sites SQLite migrations.
- `lib/postgres-d1.mjs` adapts the existing club API to PostgreSQL, keeping parameter binding, atomic login limits, revision checks and transactional recovery snapshots. A row lock serializes concurrent state saves before snapshot creation and compare-and-swap.
- Pupils keep their existing IDs and PIN hashes. They sign in again after migration. Mr French uses an administrator password on Netlify instead of ChatGPT sign-in; its salted scrypt hash is a Functions secret. Public pupils do not need Netlify or ChatGPT accounts.
- The source export requires a dedicated random transfer token. Current state and every recovery snapshot are encrypted inside the source before export. Source session keys and plaintext PIN hashes are never returned. The destination verifies the signed envelope, validates all club data, re-encrypts recovery snapshots with its own new session key and imports everything in one transaction. Any failure rolls the whole import back. A marker makes a successful transfer idempotent; a nonempty destination without that marker is never overwritten.
- Source writes must be paused for the final transfer. The importer rejects an export that is not frozen. One-time roster configuration is ignored while frozen. Entrants, pairs, draws, matches, results, history and audits are preserved. Administrator identity changes to password login; source login throttles are not copied.
- Missing runtime settings, database access or migration data returns an error. It never creates an empty/sample live club.

## Production configuration

The Netlify production function reads these values from its runtime environment. The current plan uses the supported secret scopes, which include Functions and exclude post-processing. Keep values out of Git, deployment archives, command arguments and chat.

| Name | Purpose |
| --- | --- |
| `ADMIN_EMAIL` | Existing owner's email; non-secret identifier. |
| `ADMIN_PASSWORD_HASH` | Salted scrypt verifier for the new administrator password. `scripts/admin-password-hash.mjs` accepts the password through stdin, never an argument. |
| `SESSION_SECRET` | New random secret with at least 32 characters. |

Netlify supplies the database connection automatically. The repository ignores the local `.netlify/` project link. No Git continuous deployment is configured. With the CLI authenticated and linked to the existing project, `npx netlify deploy --prod` builds and publishes the production app. Netlify applies pending schema migrations on production publication.

`MIGRATION_TOKEN` and `MIGRATION_SOURCE_URL` were temporary settings. Keep them absent in normal operation. The source has `MIGRATION_FROZEN=true` and `MIGRATION_REDIRECT_URL` set to the Netlify origin.

## Transfer sequence

1. Provision the destination schema and verify the destination club is empty. Configure the administrator and session settings, a shared random `MIGRATION_TOKEN` secret, and the source origin as `MIGRATION_SOURCE_URL` on Netlify. Deploy both hosts. Keep Sites writes open during preflight. Confirm Netlify can verify the encrypted export and declines the import until the source is frozen.
2. Set `MIGRATION_FROZEN=true` on Sites and redeploy. Verify the write API refuses changes. Invoke `scripts/transfer-to-netlify.mjs` with the transfer token through stdin. The destination pulls the authenticated export and imports the club in one transaction. If a response is lost, retry with the same token to check the idempotent transfer marker. Reopen the source only after confirming the destination has accepted no live writes.
3. Check the imported counts, production API and administrator access. Publish the Sites redirect with writes frozen and the source token removed. Remove the destination token and source URL and redeploy Netlify. Check both the old links and the production site after cleanup.

## Validation

`npm test` builds the Sites compatibility worker and runs the existing club suite plus PostgreSQL/PGlite migration tests. `npm run build:netlify` builds the production frontend. Tests cover preservation of original hashes and fixed draws, recovery re-encryption, invalid/tampered/live-source rejection, nonempty-database protection, transaction rollback and replay, source freeze, password/PIN login, spoofed-owner rejection, new competition entries and stale concurrent writers.

All 73 automated tests passed using synthetic data. Live checks verified administrator sign-in and recovery access, the final production API and logo, old-link redirects and revoked transfer access. A browser check verified that the general and all four dedicated joining links survive the redirect, shared links use Netlify, and both sign-in forms load. Live pupil sign-in and school-network access were outside the verification. No real PINs were generated, no draws were run and no test results were submitted to the live club.
