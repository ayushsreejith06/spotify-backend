# Prompt 00: Orchestrate The Spotify Backend Build

You are working in this repository:

`C:\Users\ayush_6b\Desktop\folders\Personal\Spotify Backend`

Read the full build guide first:

`docs/spotify-backend-build-guide.md`

Your job is to coordinate the project from start to finish without overbuilding. Do not implement every phase yourself unless I explicitly ask. Instead:

1. Inspect the current repository state.
2. Compare existing files against the guide.
3. Create or update a short task checklist in `docs/build-progress.md`.
4. Identify which phase should be worked on next.
5. Make sure the project keeps the API contract from the guide:
   - `POST /api/add-song`
   - JSON body with `playlistName`, `songName`, `artistName`
   - `x-api-key` authentication
   - manageable `ok: false` responses for song failures
6. Do not change unrelated files.
7. Do not commit unless I explicitly ask.

After inspecting, report:

- Current project status
- Next recommended prompt file to run
- Any blockers or missing secrets
- Any files you changed
