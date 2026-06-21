# Spotify Backend Build Progress

Last updated: 2026-06-20

## Current Status

- Phase 0 orchestration: complete.
- Phase 1 project scaffold: not started.
- No Node.js backend files exist yet.
- No API endpoint implementation exists yet.
- No Supabase, Spotify OAuth, Spotify client, matching, deployment, or Power Automate integration work has been started.

## API Contract To Preserve

- `POST /api/add-song`
- JSON body: `playlistName`, `songName`, `artistName`
- Authentication header: `x-api-key`
- Manageable song failures return `200` with `ok: false`.

## Checklist

- [x] Read `docs/spotify-backend-build-guide.md`.
- [x] Inspect repository state.
- [x] Confirm prompt sequence exists.
- [ ] Phase 1: create Express scaffold.
- [ ] Phase 2: add Supabase database layer.
- [ ] Phase 3: implement Spotify OAuth setup.
- [ ] Phase 4: add Spotify API client.
- [ ] Phase 5: add matching logic.
- [ ] Phase 6: implement `POST /api/add-song`.
- [ ] Phase 7: deploy to Render.
- [ ] Phase 8: connect Power Automate.
- [ ] Phase 9: test and harden.

## Next Recommended Prompt

Run `prompts/01-project-scaffold.md`.

## Known Blockers Or Missing Secrets

- Spotify Developer app credentials are not configured yet.
- Spotify refresh token has not been generated yet.
- Supabase project URL and service role key are not configured yet.
- Backend `API_KEY` has not been generated yet.
- The repository is not currently initialized as a Git repository.
