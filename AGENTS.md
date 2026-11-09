# App development preferences

For all app development, use plain, functional interface text. Do not add promotional slogans, taglines, motivational messages, decorative greetings or invented marketing copy unless the user explicitly requests them. Keep product names, user-provided wording, labels and the instructions/status/error messages needed to use the app. Prefer removing unnecessary copy to replacing it with another slogan.

The user specifically rejected wording such as “A little competition. A lot of good company.” Preserve the welcome heading “Welcome to the Wakefield Pool Championship” because the user explicitly requested it.

## Wakefield app palette

Use predominantly white and neutral grey surfaces and text, with the existing Wakefield yellow (#f6c744) for primary actions and selected states. Avoid green, sage and cream as the main interface colours. Keep semantic error text distinguishable. This palette applies to this app, not every future app.

## Competition rules agreed with Mr French

New competitions use separate voluntary entry lists. The shared landing page offers full singles league, singles knockout, pairs league, and pairs knockout; each also has a dedicated link. Pupils use their existing name/PIN, enter only themselves and submit scores for mandatory administrator approval. New full leagues contain every entrant in one table, with each opponent played once and no scheduled times. Pairs are drawn independently for each competition from its own signed-up entrants and stay fixed throughout. Odd pairs entry counts block the draw until another player or an admin-added registered reserve is available. Closing entries stops pupil changes; drawing fixes entrants, partners, format, match lengths and scoring; names and rules remain editable by the administrator. Further entrants wait for another competition. Preserve saved legacy divisions/cups and all roster/PIN/result data. Do not generate private PINs or draw the real competitions as part of development.

## Championship branding

The application is named “Wakefield Pool Championship” everywhere. The only branding image is the exact owner-supplied PNG at `public/wakefield-logo.png` (SHA-256 `bb0e3686d6d9991c976e4beb519d724f41bf9d79daf3907c936c795bd810a1b6`). Keep the original bytes and reuse it in the desktop/mobile headers, entry/welcome screens, dialogs, footer, settings and favicon, including the standalone demo and setup page. Do not bring back the W monogram, invent/recreate the crest or provide alternative logos. Crossed pool cues over the supplied crest are the only permitted optional alteration; currently the original is used unchanged. The uploaded logo can be recovered from a `read_thread` image URL's file UUID using the native `download_file` tool with the corresponding `file_` hexadecimal identifier. It is now bundled permanently, so do not ask the user to upload it again.

Administrators may add all registered players to an undrawn competition in one tap through Manage entries. This preserves existing entrants, skips duplicates and also works while pupil entries are closed; it must not bypass the fixed-draw guard.

Manage entries must offer a player checkbox list with Shift-click range selection and individual touch selection, plus Add selected players and Add all players. Selected groups are validated and saved atomically. Administrators can edit/rename every competition, including drawn or completed events; after drawing only the name and rules are editable, preserving IDs, links and the fixed draw.

The “Club connected” status is a light green pill (#dcfce7) with dark green text (#166534). This status-specific green is intentional within the otherwise white/grey/yellow app palette.


## Operational controls

Post-draw withdrawals are administrator-only and retain fixed entries/partners and completed scores. Remaining fixtures are walkovers; a pairs withdrawal applies to the whole pair for that competition. Result corrections require a reason and invalidate only dependent knockout/plate results. Keep the automatic pre-change recovery transaction, portable encrypted export/restore, owner-only recovery permissions, monotonic revisions and pupil-session invalidation on restore. Automatic updates must defer during active forms and never overwrite a newer local save. Use synthetic data for development; the real roster/PINs/draws remain operator-managed.
