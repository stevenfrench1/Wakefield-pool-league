# Transfer to Netlify

Target: `https://wakefield-pool-championship.netlify.app` (existing site ID `1333ce6d-5a96-4a66-90cd-2d3228602bce`). Source: the current Sites project, `appgprj_6aeb921a08648191bd55829d33fc0562`.

## Current status

The Netlify application, generated PostgreSQL migration, authenticated encrypted transfer, old-link redirect and automated tests are prepared. No live data has been moved, no source writes have been paused, and the existing Netlify deployment has not been replaced. `netlify status --json` reports `NOT_LOGGED_IN`. The connected Netlify tools do not provide an upload/deploy operation, and an attempted write of the new owner-email configuration returned `Failed to fetch API: 403`; no target variables were changed. A secure Netlify browser sign-in session has been opened at the user's request to automate dashboard configuration and Git deployment without a personal access token.

The attempted broad listing of Netlify environment variables was rejected by automatic approval review. Do not retry it or retrieve the same secret set through another route. The transfer does not need existing Netlify secrets: configure only the named new runtime values below. Existing unrelated environment variables remain untouched.

## Implementation

- `netlify.toml` builds `netlify-dist/`; modern Netlify Function `club` serves `/api/*`. Browser requests stay on the Netlify hostname. No proxy to Sites is used after transfer.
- `@netlify/database` provisions PostgreSQL, and Netlify applies the generated schema migration from `netlify/database/migrations/` during deployment. Schema is separate from the existing immutable Sites SQLite migrations.
- `lib/postgres-d1.mjs` adapts the existing club API to PostgreSQL, keeping parameter binding, atomic login limits, revision checks and transactional recovery snapshots. A row lock serializes concurrent state saves before snapshot creation and compare-and-swap.
- Pupils keep their existing IDs and PIN hashes. They sign in again after migration. Mr French uses an administrator password on Netlify instead of ChatGPT sign-in. He can choose it privately through a single-use setup link; the salted scrypt hash is stored in the server-only `club_platform` table. Alternatively an existing verifier can be supplied as a Functions secret. Public pupils do not need Netlify or ChatGPT accounts.
- The source export requires a dedicated random transfer token. Current state and every recovery snapshot are encrypted inside the source before export. Source session keys and plaintext PIN hashes are never returned. The destination verifies the signed envelope, validates all club data, re-encrypts recovery snapshots with its own new session key and imports everything in one transaction. Any failure rolls the whole import back. A marker makes a successful transfer idempotent; a nonempty destination without that marker is never overwritten.
- Source writes must be paused for the final transfer. The importer rejects an export that is not frozen. One-time roster configuration is ignored while frozen. Entrants, pairs, draws, matches, results, history and audits are preserved. Administrator identity changes to password login; source login throttles are not copied.
- Missing runtime settings, database access or migration data returns an error. It never creates an empty/sample live club.

## Required secure configuration

Set only these Netlify Functions-scoped values, as secrets except where noted. Do not put values in Git, a deployment archive, command arguments or chat:

| Name | Purpose |
| --- | --- |
| `WAKEFIELD_ADMIN_EMAIL` | Existing owner's email; non-secret identifier. |
| `WAKEFIELD_ADMIN_PASSWORD_HASH` | Optional alternative to the private setup page: salted scrypt verifier. `scripts/admin-password-hash.mjs` accepts the password through stdin, never an argument. |
| `WAKEFIELD_OWNER_SETUP_TOKEN_HASH` | SHA-256 hash of a new random, single-use owner setup token. Supply this instead of `WAKEFIELD_ADMIN_PASSWORD_HASH` to let the owner choose a password privately. |
| `WAKEFIELD_SESSION_SECRET` | New random secret with at least 32 characters. |
| `WAKEFIELD_MIGRATION_TOKEN` | New random secret with at least 32 characters, shared only between source and destination for this transfer. The source calls it `MIGRATION_TOKEN`. |
| `WAKEFIELD_MIGRATION_SOURCE_URL` | `https://wakefield-pool-championship.stevefrench81.chatgpt.site` (non-secret). |

These Netlify keys have a dedicated `WAKEFIELD_` prefix. The function maps them to its internal configuration names. Preparing them does not overwrite the older Netlify application's environment variables. `.github/workflows/ci.yml` automatically runs the synthetic-data test suite, frontend build and function bundle on pull requests and main-branch updates; it has no deployment credentials and cannot publish or move live data.

The private setup URL is `/owner-setup.html#<random-token>`. Give it only to the verified owner. The token stays in the browser fragment and memory, is removed from navigation history on page load, and is sent only in the same-origin HTTPS setup request. It is not stored in browser storage. After the first valid setup the token cannot replace the password. Setup uses an atomic insert, rejects cross-origin requests, and does not accept short passwords. The owner password itself must never enter chat, tool output or source control. After setup, remove `WAKEFIELD_OWNER_SETUP_TOKEN_HASH` and redeploy; the stored verifier keeps administrator login working.

Netlify supplies the database connection automatically. Do not copy a source database dump or credentials into the public directory. Add `.netlify/` to ignores before linking (already done).

For this execution environment, provide a scoped Netlify personal access token securely as `NETLIFY_AUTH_TOKEN` in environment settings. The deployment API is `api.netlify.com`. Live verification/transfer also needs access to the two exact application hostnames above. The environment currently permits package registries and Git hosts, not these domains. Use the environment settings flow; do not bypass the policy.

## Ordered cutover

1. Authenticate the CLI, confirm the target site and check whether Git continuous deployment is configured. If manually publishing a Git-connected project, the next production-branch push can replace the manual deployment; coordinate the source branch before publishing.
2. Configure only the named Netlify values. Deploy a draft first so Netlify can provision the database and apply the migration. Do not share a preview containing pupil data. Check static assets and that the API returns a clear transfer-pending error, with no blank club initialized.
3. Publish the source export code through the existing Sites workflow. Configure its new `MIGRATION_TOKEN` secret with the same value. Leave `MIGRATION_FROZEN` and `MIGRATION_REDIRECT_URL` unset initially; the live app continues operating normally. Existing Sites secrets remain untouched.
4. Prepare the final Netlify production deployment before pausing writes. Set source `MIGRATION_FROZEN=true` through Sites configuration and redeploy. From this point entries, results, PIN resets and recovery writes are temporarily paused, while the original state remains readable and recoverable.
5. Publish the prepared Netlify app and invoke `scripts/transfer-to-netlify.mjs`, passing the transfer token through stdin. It calls the protected destination function, which exports from the frozen source and performs the atomic import. Review only the returned summary: source/target revisions, roster/PIN counts, competition/match/result counts and recovery snapshot count. If anything fails before destination writes begin, keep the source authoritative and remove the freeze through a Sites redeploy. Do not independently reopen both databases for writes.
6. Open the private owner setup link so Mr French can choose his password. Verify the public Netlify config/state/health, sign in as Mr French, and verify an existing pupil PIN without recording a dummy result in the real club. Confirm a synthetic result/approval journey in the isolated test database. Check the joining page and sharing controls. A school laptop must still verify school-network access.
7. Only after the target is verified, set source `MIGRATION_REDIRECT_URL=https://wakefield-pool-championship.netlify.app` and redeploy Sites. Old root and competition/joining links redirect while preserving hash fragments; source writes remain frozen to avoid split data. Keep the old database for recovery.
8. Remove source `MIGRATION_TOKEN`, destination `WAKEFIELD_MIGRATION_TOKEN`, destination `WAKEFIELD_MIGRATION_SOURCE_URL` and completed `WAKEFIELD_OWNER_SETUP_TOKEN_HASH`, then redeploy the corresponding versions. The export/import and owner setup endpoints become inaccessible. Recheck that normal Netlify operation needs no Sites request.

## Validation

`npm test` builds the Sites compatibility worker and runs the existing club suite plus PostgreSQL/PGlite migration tests. `npm run build:netlify` builds the production frontend. Tests cover preservation of original hashes and fixed draws, recovery re-encryption, invalid/tampered/live-source rejection, nonempty-database protection, transaction rollback and replay, source freeze, password/PIN login, spoofed-owner rejection, new competition entries and stale concurrent writers.

The automated checks use synthetic data only. Hosted deployment, real-data transfer, administrator password setup and school-network/browser verification remain pending until deployment access is available.
