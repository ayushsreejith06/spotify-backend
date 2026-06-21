# Prompt 02: Build Supabase Database Layer

You are implementing Phase 2 from:

`docs/spotify-backend-build-guide.md`

Goal:

Add the Supabase database layer for playlist and track storage.

Before coding:

1. Read `docs/spotify-backend-build-guide.md`.
2. Inspect the existing project structure.
3. Preserve existing style and patterns.

Tasks:

1. Ensure `@supabase/supabase-js` is installed.
2. Add `src/db/supabase.js`.
3. Add database service/helper functions, either in `src/db/` or `src/services/`, consistent with the existing structure:
   - `getPlaylistByKey(playlistKey)`
   - `insertPlaylist({ playlistKey, playlistName, spotifyPlaylistId })`
   - `getPlaylistTrack(spotifyPlaylistId, spotifyTrackUri)`
   - `insertPlaylistTrack({ spotifyPlaylistId, spotifyTrackUri, trackName, artistName })`
4. Handle duplicate insert conflicts safely.
5. Add the Supabase variables to `.env.example` if missing:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
6. Add a SQL schema file at `db/schema.sql` with the exact tables from the guide:
   - `playlists`
   - `playlist_tracks`

Constraints:

- Do not use local JSON or SQLite for deployed storage.
- Do not expose the Supabase service role key outside backend code.
- Do not implement Spotify logic in this phase.
- Do not commit changes.

Validation:

- If Supabase secrets are not available, do not fake a live connection.
- Validate syntax and module imports as much as possible.
- If the app can start without secrets, verify it still starts.

Final response:

- Summarize files changed.
- Explain how to run the SQL in Supabase.
- State whether live Supabase validation was possible.
