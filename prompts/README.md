# Codex Prompt Index

Use these prompt files by copying the full contents of one file and pasting it into a terminal where a Codex agent is already running in this repository:

`C:\Users\ayush_6b\Desktop\folders\Personal\Spotify Backend`

All prompts reference the main build guide:

`docs/spotify-backend-build-guide.md`

## Recommended Order

1. `00-orchestrator.md`
2. `01-project-scaffold.md`
3. `02-supabase-database.md`
4. `03-spotify-oauth.md`
5. `04-spotify-api-client.md`
6. `05-matching-logic.md`
7. `06-add-song-endpoint.md`
8. `07-deployment-render.md`
9. `08-power-automate-integration.md`
10. `09-testing-hardening.md`
11. `10-final-review.md`

## Parallel Work Guidance

Run `01-project-scaffold.md` first. After the scaffold exists, these can be assigned to separate agents with coordination:

- `02-supabase-database.md`
- `03-spotify-oauth.md`
- `05-matching-logic.md`
- `08-power-automate-integration.md`

These should run after their dependencies are ready:

- `04-spotify-api-client.md` after OAuth routes and env variables exist.
- `06-add-song-endpoint.md` after database, Spotify client, and matching logic exist.
- `07-deployment-render.md` after the main endpoint exists.
- `09-testing-hardening.md` after deployment prep or endpoint completion.
- `10-final-review.md` last.

## Practical Notes

- Start a fresh Codex agent per phase if you want clean context.
- Tell each agent not to commit unless you are ready.
- Keep real secrets in `.env` or cloud environment variables only.
- If agents conflict, use `00-orchestrator.md` to inspect and reconcile the project state.
