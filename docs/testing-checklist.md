# Testing Checklist

Use this checklist before relying on the weekly Power Automate flow. Do not paste real secrets into committed files, screenshots, or logs.

## Automated Local Tests

Run:

```bash
npm test
```

Covered with mocked Spotify and Supabase dependencies:

- `GET /health` returns HTTP `200` and `{ "ok": true }`.
- Missing `playlistName`, `songName`, or `artistName` returns HTTP `400` with `invalid_request`.
- Wrong `x-api-key` returns HTTP `401` with `unauthorized`.
- New playlist path creates a playlist, stores it, adds the track, and returns `added`.
- Existing playlist path reuses the stored playlist ID and returns `added`.
- Duplicate song path skips Spotify add and returns `skipped_duplicate`.
- Spotify duplicate fallback skips tracks already present in Spotify and backfills Supabase.
- Unknown song path returns HTTP `200` with `song_not_found`.
- Multiple exact Spotify results use the first Spotify-ranked exact title and artist match.
- Spotify authorization failures return `spotify_auth_error`.
- Supabase failures return `database_error`.

## Manual Credential Tests

These require real local or Render environment variables:

- Start the backend with valid `.env` values.
- Call `GET /health`.
- Call `POST /api/add-song` with a valid API key and a new test playlist name.
- Repeat the same request and confirm the second response is `skipped_duplicate`.
- Change only the casing of `playlistName` and confirm the same playlist is reused.
- Submit an intentionally unknown song and confirm Power Automate receives HTTP `200` with `song_not_found`.
- Submit a popular song with multiple exact Spotify releases and confirm the backend adds the first exact title and artist match.
- Temporarily use an invalid Spotify refresh token in a local environment and confirm a `spotify_auth_error` response.
- Temporarily use invalid Supabase credentials in a local environment and confirm a `database_error` response.
- On Render, test after the service has been idle long enough to sleep and confirm Power Automate tolerates the cold start.

## Supabase Checks

After manual tests:

- `playlists` has one row per case-insensitive playlist key.
- `playlist_tracks` has one row per added track URI per playlist.
- Repeated requests do not create duplicate `playlist_tracks` rows.
- Test rows can be identified by their temporary playlist names before any manual cleanup.

## Remaining Risks

- Local duplicate tracking does not know about tracks manually added in Spotify unless a sync feature is added.
- Concurrent duplicate requests can still race around the Spotify add call; the database unique constraint protects stored rows, not Spotify playlist item duplication.
- Render free services can sleep, so the first weekly request may be slower.
