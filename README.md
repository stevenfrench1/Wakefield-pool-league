# Wakefield Pool Championship

The live club runs on Netlify with Netlify Database. The old Sites address redirects to Netlify, and the frozen source database is retained for recovery. See [NETLIFY-MIGRATION.md](NETLIFY-MIGRATION.md) for the cutover record and deployment instructions.

[Open the championship](https://wakefield-pool-championship.netlify.app/) or [join competitions](https://wakefield-pool-championship.netlify.app/#join).

Signed-out visitors see a dedicated welcome screen with player sign-in, account requests and administrator sign-in. All app pages, navigation, standings, rules and player records are hidden until sign-in. Competition and joining links keep their destination through sign-in. Signing out or detecting an expired session returns to the welcome screen. Players sign in with their display name and PIN. Mr French uses the administrator tab and the Netlify administrator password. Pupils can request an account and choose a PIN on the joining page. Mr French approves requests before the pupil can sign in.

Server-side settings keep the password verifier and session secret out of browser bundles. Session cookies remain signed, HttpOnly, Secure and SameSite=Strict. PINs remain salted scrypt hashes, excluded from state responses. Login attempts are limited atomically. Database updates compare revisions and reject concurrent stale writes.

`npm test` covers the shared app, the Sites compatibility Worker and the Netlify API with PGlite. `npm run build:netlify` emits the production frontend. `npm run db:generate:netlify` generates Netlify PostgreSQL migrations. Keep applied migrations immutable. Sample demo data remains separate in `demo/index.html`.

## School pool rules

The Pool rules page (`#rules`) is available from the header, navigation and footer after signing in. Numbered rules use bold labels and highlight frame-losing fouls, with the same readable formatting inside competition details. The full house rules cover the black, fouls and accumulated shots, colours, cue-ball placement, continuing play, the break and disputes. Exact previous shipped defaults and the original placeholder upgrade automatically; administrator-written rules and all account/competition data are preserved. Rules remain editable and within the 2,000-character backup limit.


## League play in any order

Click or tap a player's name or avatar in standings, match lists, brackets, the versus card or Players to open their match record. The record combines approved played results from singles, pairs, cups, consolation cups and archived seasons. Green ticks and **Won** labels distinguish wins from red crosses and **Lost** labels. Competition and outcome filters update the totals and opponent list; paired results identify both opponents and the player's partner. Multi-frame scores show the selected player first. Recent form uses dated results, and undated legacy results appear last. Pending scores do not count until approved; withdrawal walkovers are listed separately and excluded from played totals. The record is read-only and does not change entries, draws, results or accounts.

League players choose any opponent they have yet to play, at any time. **Choose an opponent** lists all remaining opponents alphabetically and opens the result form for the selected match. There is no suggested next opponent, round, date or playing order. Singles and fixed pairs use the same flow. Pending results leave the opponent picker until approved or returned; approved results count once in standings. Leagues open on **Standings**; **Matches & results** provides searchable match history and approval status.

Starting a league closes entries and fixes its entrants, partners, match length and scoring. New leagues record every opponent pairing once without assigning rounds. Existing saved matches, IDs, rounds, results and partners are retained; saved round numbers no longer influence the interface or play. Knockouts retain their round dependencies.

The exact owner-supplied Wakefield school crest is bundled permanently at `public/wakefield-logo.png` and used unchanged in all branding locations, including the browser icon and standalone demo. The W placeholder is removed. The application name is Wakefield Pool Championship throughout; existing state responses and future writes use that name. No logo upload is needed in Settings.

## Competition entry and draws

### Joining links

Open the [joining page](https://wakefield-pool-championship.netlify.app/#join) from Home or the navigation. Pupils with a PIN sign in. Everyone else requests an account first. A pupil already on the roster selects their name, and a pupil who is absent enters their first name and surname initial. Mr French approves requests under **Players**. Approval activates the existing roster record or creates a new one.

After sign-in, **Choose competitions** lets pupils select events and press **Confirm entries**. Existing entries are shown separately. Each successful save shows a confirmation with links to the entered competitions.

**Share joining links** offers the general page and a dedicated `/#join/<competition-id>` link for each event. After sign-in, a dedicated link preselects its competition if entries are open. Pupils can choose additional events before confirming. Copy link, the device share sheet where supported, WhatsApp and email compose controls are available, with a prepared message. These controls never automatically send messages. Links contain no names, PINs or sign-in credentials, and opening one grants no account or administrator permissions. Existing `/#competition/<id>` viewing links remain valid. Closed or drawn competitions show their status and cannot accept new pupil entries. Unknown links show the available competitions with an explanation after sign-in.

Doubles entries remain individual. Partners are drawn independently for each competition. Default competition names are displayed as Singles league, Doubles league, Singles cup and Doubles cup on the joining page. Renamed events retain their custom names.

Selected entries use one authenticated `enterCompetitions` action, one revision check and one automatic pre-change recovery snapshot. All selected competitions are validated before any entries are added; a closed event or stale revision rejects the whole save. The pupil identity comes from the existing session. Unsaved choices defer automatic refresh; a rejected stale save refreshes the current statuses while retaining the selection for review. No SQL migration or live roster/PIN/draw changes are required.

Automated checks cover selection through login and confirmation, dedicated/unknown/closed links, copy fallback, sharing without credential-bearing query strings, batch-entry permissions and atomic failures, cross-device D1 persistence, revisions and recovery snapshots. Browser layout and device share-sheet verification remain outstanding because this managed environment does not expose `cua_repl.js`.

The home page now offers four independently entered competitions: Full league, Singles knockout, Pairs league, and Pairs knockout. Existing clubs receive these empty, open entry lists additively; no player is automatically entered and no real draw is made by deployment. Existing roster records, PINs, legacy division leagues, cups and results are preserved.

Pupils open the shared link, choose their name and sign in with their PIN. They can enter any open competition and withdraw until entries close. The Share competition button copies a dedicated `/#competition/<id>` link that works before and after drawing. Share club copies `/#competitions`.

Mr French can create more competitions and edit names, singles/pairs, league/knockout format, rules, odd best-of lengths from 1 to 99, final match length, league win points and optional knockout consolation cups before the draw. Close entries pauses pupil changes. For an odd pairs entry list, the draw dialog can add one consenting reserve with a player account, including while entries are closed. Drawing fixes entrants, partners and match lengths. After normal league entries close, pupils can request late entry for Mr French’s approval. Mr French can also add registered players directly, including after the league starts. Started pairs leagues accept two newcomers as a new fixed pair. Knockout draws remain closed to late entry, and post-draw pupil withdrawals are not accepted. Mr French can record a post-draw withdrawal using the administrator tools below. Names and rules remain editable after the draw, including for completed events. Create another knockout competition for the next intake. The administrator can generate/reset pupil PINs from Players; deployment does not generate them.

Full leagues have one table and exactly n(n−1)/2 fixtures: 42 entrants generate 861 fixtures with 41 opponents each. There are no dates or booked playing times. Every unplayed opponent is available equally; the opponent picker excludes results already submitted for approval.

Pairs competitions independently shuffle their own entrants into fixed teams of two. They require at least four entrants and an even entry count. An odd count blocks drawing with “One more player needed”; reopen entries or add a registered reserve. Either partner can submit a score for their own pair. All new competition scores require Mr French’s approval, regardless of the legacy approval toggle. Pending scores do not update standings or advance knockout rounds. Standings use each competition’s saved win points, then frame difference, wins and name. Knockouts generate byes automatically and optional consolation cups include only actual first-round losers, preserving pairs.

Entries and scores use the existing D1 state row and revision checks, so stale simultaneous changes are rejected for retry. New competition fields are added without SQL/schema changes. Existing partners, format, match lengths and scoring stay fixed once drawn. Approved late league entrants receive one new fixture against every existing opponent; existing scores and match IDs stay intact. Administrators can still update the competition name and rules.

### Design and validation

The new entry cards use distinct titles, format/status labels and explicit Enter/View actions. The [Garmin Connect iOS event list](https://mobbin.com/screens/25ab95f9-a80d-4bee-a01c-0e5d1dd67898) was retrieved and visually reviewed through Mobbin as a reference for separating event titles and secondary metadata. The existing Wakefield white/grey/yellow palette is retained; the exact supplied school crest is now the only branding image.

`npm test` covers full round-robin completeness, independent entry lists, entry permissions, odd-pairs reserves, fixed draws, scores submitted by either partner, approvals, knockout sizes/byes/consolation, D1 persistence and revision conflicts, and frontend route/render wiring. Frontend rendering tests use a lightweight DOM adapter, not a browser layout engine. Browser QA for this update was unavailable because the managed environment did not expose `cua_repl.js`; mobile/desktop visual verification remains outstanding. The standalone demo is rebuilt separately and contains sample players only.

The supplied PNG is preserved byte-for-byte (SHA-256 `bb0e3686d6d9991c976e4beb519d724f41bf9d79daf3907c936c795bd810a1b6`). Worker packaging base64-encodes binary PNG assets and decodes them into response bytes with `image/png`; a delivery test compares those bytes with the original file. The standalone demo embeds the same PNG as a data URI. No generated or redrawn crest is used, and no optional crossed cues have been added.

**Manage entries** lists players with active accounts who have entered that competition. Mr French can remove these entries before the draw, and the dialog counts older saved entries that still need a player account. Mr French can use **Enter as Mr French** on an open competition while signed in as administrator. The app finds the existing Mr French roster record and uses the administrator account for that entry.

Edit is available on every competition card and detail page. After a draw, the name and rules can be edited without changing the competition ID, share link, participants, pairings, fixtures or results.


## Operating the club

### Declared match highlights

**Match highlights** is an optional section in the result form. Players select the person who achieved each highlight and, in a multi-frame match, its frame number. Submitting only the winner or score works as before. A forgotten highlight can be added later using **Alerts → Declare a match highlight**, for a submitted or approved played match.

| Badge | Qualifying play | Achievement points | Public milestone alert |
| --- | --- | --- | --- |
| Triple Threat | Pot at least three own colours in one visit without missing or fouling | 30 | No |
| Clearance | Clear all remaining own colours (at least one), then legally pot the nominated black in the same visit without missing or fouling | 50 | Yes |
| Against the Odds | Legally pot the nominated black to win a frame while the opposing side still has all seven colours on the table | 70 | Yes |

The opposing side receives a private alert and confirms or disputes the declaration in **Alerts**. A player cannot confirm their own or their fixed partner’s highlight. In pairs, one opposing player may confirm; any outstanding dispute from the other opponent blocks the award until resolved. A dispute needs a reason, and opponents may update their responses before administrator review. Pending tasks remain visible after notifications are marked read.

Mr French reviews declarations under **Approvals → Match highlight approvals**. Awarding requires an approved played score, an opposing confirmation and no outstanding dispute. Score approval is independent and never waits for highlights. The named individual receives the badge and achievement points once, even if later matches contain the same highlight; their partner does not automatically receive it. Existing unlock animations, player levels and major milestone alerts apply. Wins, streaks, participation and improvement badges still use approved results automatically; sportsmanship badges remain administrator awards.

Declined claims and award removals require a reason. Correcting or reopening a result cancels highlights for the changed fixture and any invalidated knockout dependencies, recalculating badges, points and public milestone alerts. Unrelated match claims remain intact. Returning an unapproved score cancels its declarations, and fresh claims can accompany the resubmission. No highlights are inferred from old scores or awarded for walkovers or byes.

Pending claims, confirmations, disputes and review reasons are visible only to the match participants and administrator. Other viewers receive only approved claim summaries. Declarations, responses and reviews use the existing revision-checked state transaction and encrypted backups; no database schema migration is needed. Synthetic tests cover singles/pairs permissions, result-independent claims, corrections, one-time points, privacy, stale writes and encrypted recovery.

- **Enter a result for any matchup:** sign in as Mr French and choose **Enter result** from Competitions, Result approvals, a drawn competition, a player's Manage player dialog or the account menu. Select the competition, player or fixed pair and opponent. Saving approves the result immediately and updates the standings or knockout draw, player alerts and achievements. Single-frame matches use a winner selection; longer matches accept frame scores within the drawn match length. A pending pupil submission must be approved or returned first. Choosing an already approved result opens the existing correction form and requires a reason. Earlier division leagues and cups are included. Every direct entry keeps the automatic recovery snapshot and a private administrator audit record.
- **School Wi-Fi sign-in:** successful logins do not accumulate against the network limit. Failed guesses are limited to eight per player and network per 15 minutes. A separate network-wide limit of 256 failed guesses protects against cycling through names. Resetting that player's PIN starts a fresh per-player limit. Pupils still use their existing PINs; deployment never generates or resets them.
- **Correct an approved result:** open Matches & results, show played matches, and choose **Correct result**. Administrators can change the frame score or return the fixture to unplayed, with a reason and confirmation. Changing a knockout winner clears only dependent later-round results and affected consolation ties. Saved match IDs, the original draw, fixed pairs and unrelated results remain intact. Pending scores for invalidated fixtures are removed. Score-only changes that retain the winner leave later rounds alone. Corrections are available for new competitions and earlier leagues/cups.
- **Withdraw after drawing:** use **Withdraw player** on the competition, or **Players → Manage player → Withdraw from a competition**. Only Mr French can do this. Completed results remain; remaining fixtures become opponent walkovers. In pairs, either partner's withdrawal withdraws the whole fixed pair for that event. Both sides withdrawn produces no winner. Walkover losers do not qualify for a new consolation draw. Other competitions and PINs are unaffected. Restore the preceding recovery snapshot to undo an accidental withdrawal. Before drawing, use Manage entries instead.
- **Shared updates:** visible pages check the shared revision every 15 seconds and when returning to the page. Changes refresh standings, entries, approvals and fixtures. Open dialogs, focused inputs and unsaved Settings changes defer updates, with an Updates waiting message. A failed connection retries automatically. Hidden pages do not poll. Conflicting saves ask the user to reopen and check the updated fixture instead of retrying an outdated score.
- **Check setup** reports database access, administrator access, roster/PIN counts, competitions, pending results and recovery snapshots. Sign in as Mr French and open **Settings → Check setup**.

### Pupil account recovery

Sign in as Mr French and use **Players → Recover account**, or open a pupil’s **Manage player → Recover account**. Choose the pupil, check their identity, and select **Issue replacement PIN**. Give the displayed six-digit PIN privately to that pupil. It is only displayed in that response; it can also be downloaded. No messages are sent.

Recovery keeps the same roster account, entries, fixed partners, pending results and approved scores. It replaces the salted PIN hash, invalidates that pupil’s existing sessions and restarts their individual sign-in attempt allowance. Other pupils and the administrator stay signed in. The operation requires administrator access and the current revision, saves an encrypted pre-change snapshot atomically, and records a private administrator history entry without the PIN. Existing pupil sessions remain valid on deployment until their own PIN is replaced. Roster-only players must have their sign-up approved or be issued a PIN first. **Forgotten your PIN?** on pupil sign-in explains how to ask Mr French for help without creating a duplicate account.

### Backup and recovery procedure

Club operations save the preceding revision as an encrypted recovery snapshot in the same database transaction. The latest 50 snapshots are retained. Snapshot payloads include private PIN hashes and are encrypted with AES-256-GCM using the server session secret. Only the administrator can list, preview or restore them. Ordinary pupil/visitor state omits PIN hashes, session generations and administrator audit records. Keep `SESSION_SECRET` in private hosting configuration. Rotating it makes earlier server snapshots unreadable.

Before the first playing session, after a draw, and after each playing session, use **Settings → Download encrypted backup**. Choose a passphrase of at least 12 characters and store it separately from the downloaded JSON file in school-approved private storage. Exported files use scrypt-derived AES-256-GCM encryption with random salts/nonces. They contain the roster, PIN hashes, entries, fixed teams, draws, approved/pending results, history and administrator audit records. Portable files can be restored after `SESSION_SECRET` rotation or database loss.

To recover: sign in as the verified owner, open **Settings → Restore backup**, and either preview a server snapshot or choose a downloaded JSON file and enter its passphrase. Check the current-versus-backup counts. Type **RESTORE** to confirm. Restoring uses the current revision to reject intervening updates, saves a safety snapshot before replacement, advances the shared revision, records an audit entry and invalidates existing pupil sessions. Player PINs in the backup still work after signing in again. To undo the restore, preview the most recent snapshot labelled Before restoring the club. Never restore a file from an unknown source. Keep backup files and passphrases off public devices and out of source control.

The application supports state payloads up to 1 MB; exported encrypted files fit below 2 MB. Server-side automatic snapshots and portable backups have separate encryption keys and restore paths. This deployment adds only the `club_backups` table through the generated schema migration; roster, PINs, entries and draws are not migrated or replaced.

### Verification and first live session

The automated suite checks 42 correct sign-ins through one network, per-player throttling, singles/pairs and legacy result corrections, dependent knockout/plate repair, withdrawals and walkovers, automatic refresh deferral/races, encrypted-file tamper detection, restoration after secret rotation, stale restore rejection, bounded snapshot retention, transaction rollback and undoing a restore. A built-Worker integration test uses independent pupil and administrator clients against a shared SQLite-backed D1 adapter: sign in, submit, approve, read the updated result on the other client, correct it, and recover a snapshot. Tests use synthetic players and do not generate real PINs, enter pupils, draw real competitions or change live results.

A physical two-device trial of the published app remains an operator check: verify the roster and securely distribute any missing PINs, sign in as a pupil on one device and Mr French on another, submit an agreed real result, approve it and confirm the first device updates within 15 seconds. Browser tools were unavailable in the managed environment, and direct production HTTP requests were denied by its network policy; automated integration tests do not establish live device/browser behaviour. Use Settings → Check setup for the live database and PIN counts before that trial.

## 11 November 2026 release

Published free-order league play and administrator pupil account recovery to Netlify deployment `6af433200397aa9db0ff3487`. All 79 automated tests passed; the final frontend checks passed after copy changes. Browser checks with isolated sample accounts covered arbitrary opponent selection, pending approval, approval into standings, fixed pairs, the recovery form and a 390-pixel layout without page overflow. No browser warnings or errors were recorded.

Live checks matched the JavaScript, styles, domain module and exact school crest to the published files, confirmed the database was healthy, and verified signed-out account recovery is denied. The shared club stayed at revision 78 and its public state was identical before and after publication. Entries remain open; no real competition was started and no real PIN was issued or replaced. Account recovery was exercised against synthetic PostgreSQL data, not a real pupil account.

## Single-frame league results

Players select the winner and submit for administrator approval. Default league points remain 3 per win and 0 per loss. Single-frame competition leagues break equal points using approved wins between all tied entrants, once every mutual fixture is complete. Unresolved ties share a position marked `=`; alphabetical display order never awards a higher position. Mr French arranges a play-off if a final tie affects the title or qualification. Legacy division tables and multi-frame scoring are preserved.


## 17 November 2026: league versus cards

Published the arcade-style singles/pairs opponent card in deployment `6afc61f40f16682896e26c40`. Player and opponent selection updates a split matchup preview with initials, names and approved league records. No opponent is preselected. Enter result opens the exact selected fixture; pending and completed matches are excluded. Selected match forms defer automatic refresh and can be cleared. Reduced-motion preferences are respected.

Validation: 118 automated tests passed, followed by 29 frontend checks after the final format-label adjustment. The isolated release also passed singles/pairs selection and result-entry checks against the published domain module. Browser checks covered 320, 390 and 1440 pixel layouts, fixed pairs, required opponent selection and result entry with synthetic data. Live browser verification confirmed selection updates the published card.

This was a frontend-only publication assembled from the preceding live assets, including only the versus-card JavaScript and styles. Other ongoing workspace features were excluded. The exact existing backend archive, domain module, crest and hosting configuration were retained. Live API checks returned 200; club state remained identical at revision 98. The standalone demo was regenerated from the current workspace source.


## Late league entries

Mr French can use **League → Manage entries → Add player**, or **Add player** on a started singles league. Choose an existing player account to enter it directly. A started pairs league offers **Add new pair** and requires two newcomers; existing pairs stay together. New fixtures use the saved league match length and scoring. Results already approved or awaiting approval are kept, and existing withdrawals continue to award walkovers.

After normal entries close, a signed-in pupil can choose **Request to join** on the league or joining page. The request does not enter them or create any fixtures. They see **Awaiting Mr French’s approval** and can cancel their request. Mr French reviews requests in **Approvals → League entry requests** or **Manage entries** and approves or declines them. For a started pairs league, choose another waiting applicant to approve both as a new pair, or use Add new pair with two consenting account holders. Open entry lists continue to allow pupils to enter themselves directly. Knockout draws remain fixed.

Entry requests are visible only to their applicant and Mr French. Additions and reviews use the existing revision-checked transaction, encrypted pre-change recovery snapshot and administrator audit history. No SQL migration, live roster changes or PIN resets are required. Synthetic domain, API and interface tests cover approval permissions, duplicate and cancelled requests, declined requests, privacy, concurrent writes, pairs, fixture completeness, result preservation and encrypted recovery.

## Player result entry

Signed-in players start on **Your matches**, with **Enter a result** above the other home content and a header shortcut on every screen. Choose a competition, search the alphabetical list of available opponents, then tap the opponent's row. A sole competition is selected automatically; no opponent is suggested. Competition pages use the same picker with their competition already selected. Fixed pairs show both partners.

The score form places the signed-in player or pair first while preserving the fixture's stored score order. Single-frame matches use explicit winner choices; longer matches use frame-score selectors. A result summary and validation prevent incomplete or tied scores. Optional highlights stay collapsed. Successful submission shows a persistent receipt, and pending results leave the picker until approved or returned. Mr French's approval remains mandatory for new competitions.

`node scripts/player-result-smoke.mjs` checks the sample demo in Chromium, including search, changing opponents, keyboard focus, side-B score mapping for singles and pairs, pending/returned results, and layouts at 320, 390, 768 and 1440 pixels. Set `PLAYWRIGHT_MODULE` if Playwright is installed outside this checkout, and `WPC_DEMO_URL` for a different local demo address. Evidence is in `evidence/player-result-flow-2026-11-17/`.
