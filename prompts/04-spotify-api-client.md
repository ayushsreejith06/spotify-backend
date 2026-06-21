# Prompt 04: Build Spotify API Client

You are implementing Phase 4 from:

`docs/spotify-backend-build-guide.md`

Goal:

Create reusable Spotify Web API functions for the backend.

Before coding:

1. Read `docs/spotify-backend-build-guide.md`.
2. Inspect the existing OAuth and project structure.
3. Preserve existing patterns.

Tasks:

1. Add or update `src/services/spotifyClient.js`.
2. Implement access token refresh using:
   - `SPOTIFY_CLIENT_ID`
   - `SPOTIFY_CLIENT_SECRET`
   - `SPOTIFY_REFRESH_TOKEN`
3. Implement:
   - `getCurrentUserProfile()`
   - `createPrivatePlaylist(name)`
   - `searchTrack(songName, artistName)`
   - `addTrackToPlaylist(playlistId, trackUri)`
   - optional `getPlaylistItems(playlistId)`
4. Create private, non-collaborative playlists.
5. Use `SPOTIFY_USER_ID` when creating playlists if needed by the Spotify endpoint.
6. Convert Spotify errors into useful backend errors.
7. Handle rate limits cleanly enough for the main endpoint to return `spotify_rate_limited`.

Constraints:

- Do not implement matching logic here except raw search.
- Do not implement `/api/add-song` here.
- Do not hardcode secrets.
- Do not commit changes.

Validation:

- If Spotify secrets are missing, validate imports and app startup.
- If Spotify secrets are available, manually test profile, playlist creation, search, and add track with safe test data.

Final response:

- Summarize files changed.
- List implemented Spotify functions.
- Mention whether live Spotify API validation was possible.
