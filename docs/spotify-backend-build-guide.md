# Spotify Playlist Automation Backend Build Guide

## 1. Project Summary

Build a small cloud backend that Power Automate can call once per Microsoft Forms response. Each request sends:

- `playlistName`
- `songName`
- `artistName`

The backend will:

- Create a private Spotify playlist if one does not already exist for that playlist name.
- Reuse the existing playlist if it already exists.
- Search Spotify for the requested song and artist.
- Add the song to the playlist.
- Skip the song if it is already in the playlist.
- Return a clean success or failure response that Power Automate can store in Excel.

This project is for one Spotify account only, not multiple Spotify users.

## 2. Recommended Stack

Use this stack unless there is a specific reason to change it:

- Backend: Node.js with Express
- Hosting: Render free web service
- Database: Supabase Postgres free project
- Spotify integration: Spotify Web API using Authorization Code OAuth
- Power Automate integration: HTTP action with JSON body
- Backend protection: static API key using `x-api-key`

Reasoning:

- Express is simple for a single HTTP endpoint.
- Render can host the backend for free, though free services may sleep when inactive.
- Render free services have ephemeral files, so local JSON or SQLite storage is not reliable for deployed storage.
- Supabase Postgres gives persistent cloud storage on a free tier.
- Power Automate can easily call a JSON HTTP endpoint.

## 3. External References

Use these official docs while building:

- Spotify Web API Authorization Code Flow: https://developer.spotify.com/documentation/web-api/tutorials/code-flow
- Spotify Create Playlist endpoint: https://developer.spotify.com/documentation/web-api/reference/create-playlist
- Spotify Search endpoint: https://developer.spotify.com/documentation/web-api/reference/search
- Spotify Add Items to Playlist endpoint: https://developer.spotify.com/documentation/web-api/reference/add-items-to-playlist
- Spotify Get Playlist Items endpoint: https://developer.spotify.com/documentation/web-api/reference/get-playlists-tracks
- Render free web services: https://render.com/docs/free
- Render environment variables: https://render.com/docs/configure-environment-variables
- Supabase JavaScript client: https://supabase.com/docs/reference/javascript/introduction
- Power Automate HTTP connector reference: https://learn.microsoft.com/en-us/connectors/webcontents/

## 4. Target User Flow

1. A user submits or updates an Excel row with playlist name, song name, and artist name.
2. Power Automate loops through rows or form responses one at a time.
3. For each row, Power Automate sends one HTTP request to the backend.
4. The backend creates or finds the playlist.
5. The backend searches Spotify for the song.
6. The backend adds the song if it is not already present.
7. The backend returns a structured JSON result.
8. Power Automate logs failures into Excel for manual review.

## 5. Core Requirements

### 5.1 Functional Requirements

- Accept `playlistName`, `songName`, and `artistName` as JSON.
- Treat playlist names as case-insensitive lookup keys.
- Store playlist mappings in Postgres so the backend does not search all Spotify playlists every time.
- Create playlists as private by default.
- Add songs to existing playlists when the playlist key already exists.
- Skip duplicate songs already present in the target playlist.
- Return one result per request.
- Return manageable errors for Power Automate.
- Support only one Spotify account.
- Do not support collaborative playlists.

### 5.2 Non-Functional Requirements

- Cloud hosted.
- Free or near-free.
- Simple to deploy.
- Efficient enough for weekly batch automation.
- Safe enough to expose publicly by requiring an API key.
- Easy to debug from Power Automate run history.

## 6. API Contract

### 6.1 Endpoint

```http
POST /api/add-song
```

### 6.2 Required Headers

```http
Content-Type: application/json
x-api-key: YOUR_BACKEND_API_KEY
```

### 6.3 Request Body

```json
{
  "playlistName": "June Week 3",
  "songName": "Blinding Lights",
  "artistName": "The Weeknd"
}
```

### 6.4 Success Response: Song Added

```json
{
  "ok": true,
  "status": "added",
  "playlistName": "June Week 3",
  "playlistId": "spotify_playlist_id",
  "trackName": "Blinding Lights",
  "artistName": "The Weeknd",
  "trackUri": "spotify:track:example",
  "message": "Song added to playlist."
}
```

### 6.5 Success Response: Duplicate Skipped

```json
{
  "ok": true,
  "status": "skipped_duplicate",
  "playlistName": "June Week 3",
  "playlistId": "spotify_playlist_id",
  "trackName": "Blinding Lights",
  "artistName": "The Weeknd",
  "trackUri": "spotify:track:example",
  "message": "Song already exists in playlist."
}
```

### 6.6 Failure Response: Song Not Found

Use HTTP `200` for manageable business failures so Power Automate can continue the loop without failing the entire flow.

```json
{
  "ok": false,
  "status": "song_not_found",
  "playlistName": "June Week 3",
  "songName": "Unknown Song",
  "artistName": "Unknown Artist",
  "message": "No confident Spotify match found. Add manually."
}
```

### 6.7 Failure Response: Ambiguous Match

```json
{
  "ok": false,
  "status": "ambiguous_match",
  "playlistName": "June Week 3",
  "songName": "Intro",
  "artistName": "Artist Name",
  "message": "Multiple possible Spotify matches found. Add manually.",
  "candidates": [
    {
      "trackName": "Intro",
      "artists": ["Artist Name"],
      "album": "Album One",
      "spotifyUrl": "https://open.spotify.com/track/example"
    }
  ]
}
```

### 6.8 Failure Response: Invalid Request

Use HTTP `400` only when Power Automate sent bad input.

```json
{
  "ok": false,
  "status": "invalid_request",
  "message": "playlistName, songName, and artistName are required."
}
```

### 6.9 Failure Response: Unauthorized

Use HTTP `401` when the `x-api-key` header is missing or wrong.

```json
{
  "ok": false,
  "status": "unauthorized",
  "message": "Invalid API key."
}
```

## 7. Database Design

Use Supabase Postgres with two tables.

### 7.1 `playlists`

Stores the unique mapping between a case-insensitive playlist tag and the Spotify playlist ID.

```sql
create table playlists (
  id bigserial primary key,
  playlist_key text not null unique,
  playlist_name text not null,
  spotify_playlist_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Example:

- `playlist_name`: `June Week 3`
- `playlist_key`: `june week 3`
- `spotify_playlist_id`: Spotify playlist ID

### 7.2 `playlist_tracks`

Stores songs already added by this backend so duplicate checks are fast.

```sql
create table playlist_tracks (
  id bigserial primary key,
  spotify_playlist_id text not null,
  spotify_track_uri text not null,
  track_name text not null,
  artist_name text not null,
  added_at timestamptz not null default now(),
  unique (spotify_playlist_id, spotify_track_uri)
);
```

### 7.3 Why Store Tracks Locally

Spotify can be checked directly, but a local table is faster and reduces API calls. The backend should still handle Spotify duplicate errors gracefully, but the main duplicate check should use `playlist_tracks`.

## 8. Spotify Developer Setup

### 8.1 Create Spotify App

1. Go to https://developer.spotify.com/dashboard.
2. Log in with your Spotify account.
3. Create a new app.
4. Set the app name, for example `Power Automate Playlist Backend`.
5. Set the app description.
6. Add a redirect URI for local development:

```text
http://localhost:3000/auth/callback
```

7. After deploying to Render, add the production redirect URI:

```text
https://YOUR_RENDER_SERVICE_NAME.onrender.com/auth/callback
```

8. Save the app.
9. Copy the Client ID.
10. Copy the Client Secret.

### 8.2 Required Spotify Scopes

Use these scopes:

```text
playlist-modify-private playlist-read-private user-read-private
```

Add `playlist-modify-public` only if the backend will ever create or modify public playlists. For the current requirements, private playlists are enough.

`user-read-private` is included so the backend can call Spotify's current-user profile endpoint during setup and reliably get your Spotify user ID for playlist creation.

### 8.3 One-Time OAuth Flow

Because this backend controls only your Spotify account, OAuth is needed only once to get a refresh token.

Implement two temporary auth routes:

- `GET /auth/login`
- `GET /auth/callback`

Flow:

1. Start the backend locally.
2. Open `http://localhost:3000/auth/login`.
3. Log in to Spotify.
4. Approve the requested scopes.
5. Spotify redirects to `/auth/callback`.
6. Backend exchanges the returned code for tokens.
7. Save the refresh token securely as an environment variable.

After the refresh token is captured, the production backend can use it to request fresh access tokens automatically.

## 9. Environment Variables

Use these environment variables locally and in Render:

```text
PORT=3000
NODE_ENV=production
API_KEY=generate_a_long_random_secret
SPOTIFY_CLIENT_ID=from_spotify_dashboard
SPOTIFY_CLIENT_SECRET=from_spotify_dashboard
SPOTIFY_USER_ID=from_spotify_current_user_profile
SPOTIFY_REDIRECT_URI=https://YOUR_RENDER_SERVICE_NAME.onrender.com/auth/callback
SPOTIFY_REFRESH_TOKEN=from_one_time_oauth_flow
SUPABASE_URL=from_supabase_project_settings
SUPABASE_SERVICE_ROLE_KEY=from_supabase_project_settings
```

Important:

- Never commit `.env`.
- Use the Supabase service role key only on the backend.
- Do not expose the service role key to frontend code or Power Automate.
- Generate `API_KEY` with a password manager or random secret generator.

## 10. Backend Behavior

### 10.1 Request Validation

The backend must reject requests if:

- `playlistName` is missing or blank.
- `songName` is missing or blank.
- `artistName` is missing or blank.
- `x-api-key` is missing or incorrect.

Normalize values:

- Trim whitespace.
- Collapse repeated spaces.
- Use lower-case playlist key for lookup.

Example:

```text
" June   Week 3 " -> playlistName "June Week 3"
" June   Week 3 " -> playlistKey "june week 3"
```

### 10.2 Playlist Lookup or Creation

Algorithm:

1. Convert `playlistName` to `playlistKey`.
2. Query `playlists` by `playlist_key`.
3. If found, use `spotify_playlist_id`.
4. If not found, call Spotify Create Playlist.
5. Create the playlist as private:

```json
{
  "name": "June Week 3",
  "public": false,
  "collaborative": false,
  "description": "Created by Power Automate Spotify backend."
}
```

6. Insert the new mapping into `playlists`.
7. If another request created the same playlist at the same time, handle the unique constraint by re-reading the playlist row.

### 10.3 Song Search

Search Spotify using both track and artist:

```text
track:Blinding Lights artist:The Weeknd
```

Recommended matching rule:

- Search with limit `5`.
- Normalize track names and artist names.
- Accept the first result only if:
  - Track name is an exact normalized match or very close normalized match.
  - At least one Spotify artist is an exact normalized match or very close normalized match.
- If zero confident matches, return `song_not_found`.
- If multiple similarly confident matches exist, return `ambiguous_match`.

Keep this strict. It is better to fail cleanly than to add the wrong song to a playlist.

### 10.4 Duplicate Check

Algorithm:

1. Query `playlist_tracks` for `spotify_playlist_id` and `spotify_track_uri`.
2. If found, return `skipped_duplicate`.
3. If not found, call Spotify Add Items to Playlist.
4. Insert the track into `playlist_tracks`.
5. If the insert conflicts because another request inserted it first, return `skipped_duplicate`.

Optional extra safety:

- If the local database is missing old data, call Spotify Get Playlist Items before adding.
- This is slower, so use it only if you need to sync pre-existing playlist contents.

### 10.5 Error Handling

Use predictable statuses:

- `added`
- `skipped_duplicate`
- `song_not_found`
- `ambiguous_match`
- `invalid_request`
- `unauthorized`
- `spotify_auth_error`
- `spotify_rate_limited`
- `spotify_api_error`
- `database_error`

Recommended HTTP status behavior:

- `200`: normal success or manageable business failure
- `400`: invalid request body
- `401`: wrong API key
- `429`: Spotify rate limited
- `500`: backend/database/unexpected error

For Power Automate, `song_not_found` and `ambiguous_match` should return HTTP `200` with `ok: false`.

## 11. Suggested Project Structure

```text
spotify-backend/
  docs/
    spotify-backend-build-guide.md
  src/
    index.js
    config.js
    middleware/
      apiKey.js
      errorHandler.js
    routes/
      addSong.js
      auth.js
      health.js
    services/
      spotifyClient.js
      playlistService.js
      trackService.js
      matchService.js
    db/
      supabase.js
    utils/
      normalize.js
  .env.example
  .gitignore
  package.json
  README.md
```

## 12. Implementation Phases

Use these phases to split work across multiple Codex agents. Each phase should be completed with a small PR or isolated commit.

### Phase 1: Project Scaffold

Owner goal:

- Create the Node.js Express project structure.

Tasks:

- Initialize `package.json`.
- Install dependencies:

```bash
npm install express dotenv @supabase/supabase-js
npm install --save-dev nodemon
```

- Add `.gitignore`.
- Add `.env.example`.
- Add `src/index.js`.
- Add `GET /health`.
- Add JSON body parsing.
- Add centralized error handler.

Acceptance criteria:

- `npm start` starts the server.
- `GET /health` returns `{ "ok": true }`.
- Missing routes return clean JSON `404`.

### Phase 2: Supabase Database

Owner goal:

- Create persistent playlist and track storage.

Tasks:

- Create a Supabase project.
- Run the SQL from section 7.
- Add `src/db/supabase.js`.
- Add database helper functions:
  - `getPlaylistByKey`
  - `insertPlaylist`
  - `getPlaylistTrack`
  - `insertPlaylistTrack`
- Handle unique constraint conflicts.

Acceptance criteria:

- Backend can connect to Supabase.
- Playlist rows can be inserted and retrieved.
- Duplicate track insertions do not crash the app.

### Phase 3: Spotify OAuth

Owner goal:

- Get a usable Spotify refresh token.

Tasks:

- Create Spotify Developer app.
- Add local redirect URI.
- Implement `GET /auth/login`.
- Implement `GET /auth/callback`.
- Exchange authorization code for access and refresh tokens.
- Print the refresh token once in local development.
- Store refresh token in `.env`.

Acceptance criteria:

- Visiting `/auth/login` completes Spotify authorization.
- Backend receives a refresh token.
- Refresh token can be used to request new access tokens.

### Phase 4: Spotify API Client

Owner goal:

- Build reusable Spotify API functions.

Tasks:

- Add access token refresh logic.
- Add `createPrivatePlaylist(name)`.
- Add `searchTrack(songName, artistName)`.
- Add `addTrackToPlaylist(playlistId, trackUri)`.
- Add optional `getPlaylistItems(playlistId)`.
- Handle Spotify API errors cleanly.

Acceptance criteria:

- Backend can create a private playlist.
- Backend can search for a track.
- Backend can add a Spotify track URI to a playlist.
- Expired access tokens refresh automatically.

### Phase 5: Matching Logic

Owner goal:

- Avoid adding wrong songs.

Tasks:

- Add text normalization utility.
- Compare normalized song names.
- Compare normalized artist names.
- Return:
  - one confident match
  - no match
  - ambiguous match
- Include candidate data for ambiguous matches.

Acceptance criteria:

- Exact song and artist matches are accepted.
- Obvious wrong artist matches are rejected.
- Ambiguous results return a manageable response for Power Automate.

### Phase 6: Main `/api/add-song` Endpoint

Owner goal:

- Implement the full Power Automate endpoint.

Tasks:

- Add API key middleware.
- Validate request body.
- Normalize playlist key.
- Get or create playlist.
- Search and match song.
- Check duplicate in database.
- Add song to Spotify.
- Store added track in database.
- Return one structured JSON response.

Acceptance criteria:

- New playlist is created when missing.
- Existing playlist is reused.
- Song is added when found.
- Duplicate song is skipped.
- Song failures return HTTP `200` with `ok: false`.
- Invalid input returns HTTP `400`.
- Missing/wrong API key returns HTTP `401`.

### Phase 7: Deployment

Owner goal:

- Deploy the backend to Render.

Tasks:

- Push project to GitHub.
- Create a new Render web service.
- Connect the GitHub repo.
- Set build command:

```bash
npm install
```

- Set start command:

```bash
npm start
```

- Add all environment variables in Render.
- Add production Spotify redirect URI to Spotify Developer Dashboard.
- Redeploy service.

Acceptance criteria:

- `https://YOUR_RENDER_SERVICE_NAME.onrender.com/health` returns success.
- `POST /api/add-song` works from an HTTP client.
- Render logs show no missing environment variables.

### Phase 8: Power Automate Integration

Owner goal:

- Connect the weekly Excel/Form workflow.

Important licensing note:

- The HTTP connector is listed by Microsoft as a Premium Power Automate connector in many environments.
- Confirm your Microsoft account or tenant can use HTTP actions before depending on this design.
- If HTTP is blocked, the fallback is usually a custom connector, Azure Logic Apps, or a different automation tool that can call webhooks.

Tasks:

- In Power Automate, loop through each row or response.
- Add an HTTP action inside the loop.
- Method: `POST`.
- URI:

```text
https://YOUR_RENDER_SERVICE_NAME.onrender.com/api/add-song
```

- Headers:

```json
{
  "Content-Type": "application/json",
  "x-api-key": "YOUR_BACKEND_API_KEY"
}
```

- Body:

```json
{
  "playlistName": "@{items('Apply_to_each')?['Playlist Name']}",
  "songName": "@{items('Apply_to_each')?['Song Name']}",
  "artistName": "@{items('Apply_to_each')?['Artist Name']}"
}
```

- Parse the JSON response.
- If `ok` equals `false`, append a failure row to Excel.
- Continue the loop even when one song fails.

Acceptance criteria:

- Power Automate can add successful songs.
- Failed songs are written to Excel with reason and message.
- One failed song does not stop the weekly automation.

### Phase 9: Testing and Hardening

Owner goal:

- Make the backend reliable before weekly use.

Tasks:

- Test missing fields.
- Test wrong API key.
- Test new playlist creation.
- Test existing playlist reuse.
- Test duplicate song skip.
- Test unknown song.
- Test ambiguous song.
- Test Render cold start from Power Automate.
- Check Supabase rows after each test.

Acceptance criteria:

- All expected responses match the API contract.
- No duplicate rows are created for repeated songs.
- Power Automate receives manageable responses.

## 13. Local Development Steps

### 13.1 Install Node.js

Install the current LTS version of Node.js from:

```text
https://nodejs.org/
```

Check installation:

```bash
node --version
npm --version
```

### 13.2 Create Local `.env`

Create `.env` from `.env.example` after Phase 1.

Example:

```text
PORT=3000
NODE_ENV=development
API_KEY=local_test_key
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_USER_ID=your_spotify_user_id
SPOTIFY_REDIRECT_URI=http://localhost:3000/auth/callback
SPOTIFY_REFRESH_TOKEN=
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 13.3 Start Server

```bash
npm run dev
```

### 13.4 Test Health Endpoint

```bash
curl http://localhost:3000/health
```

Expected:

```json
{
  "ok": true
}
```

### 13.5 Test Add Song Endpoint

```bash
curl -X POST http://localhost:3000/api/add-song ^
  -H "Content-Type: application/json" ^
  -H "x-api-key: local_test_key" ^
  -d "{\"playlistName\":\"Test Playlist\",\"songName\":\"Blinding Lights\",\"artistName\":\"The Weeknd\"}"
```

PowerShell alternative:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3000/api/add-song" `
  -Headers @{ "x-api-key" = "local_test_key" } `
  -ContentType "application/json" `
  -Body '{"playlistName":"Test Playlist","songName":"Blinding Lights","artistName":"The Weeknd"}'
```

## 14. Power Automate Failure Logging

Create an Excel table for failures with columns:

- `Timestamp`
- `Playlist Name`
- `Song Name`
- `Artist Name`
- `Status`
- `Message`
- `Candidate Links`

When backend response has `ok: false`, append a row.

Recommended mapping:

- `Timestamp`: current time
- `Playlist Name`: request playlist name
- `Song Name`: request song name
- `Artist Name`: request artist name
- `Status`: backend `status`
- `Message`: backend `message`
- `Candidate Links`: join candidate Spotify URLs if present

## 15. Efficiency Notes

The backend is efficient enough for weekly batch use because:

- Playlist ID lookup uses Supabase instead of Spotify playlist search.
- Duplicate checks use Supabase instead of scanning Spotify playlist items every request.
- Spotify access tokens are refreshed only when needed.
- Each Power Automate loop iteration sends one small request.

Expected Spotify calls for a new song in an existing playlist:

- Refresh access token if needed.
- Search track.
- Add track.

Expected Spotify calls for a duplicate song already known by the database:

- Refresh access token if needed.
- Search track.
- No add call.

Expected Spotify calls for a new playlist:

- Refresh access token if needed.
- Create playlist.
- Search track.
- Add track.

## 16. Security Checklist

- Require `x-api-key` on `/api/add-song`.
- Store secrets only in `.env` locally and Render environment variables in production.
- Never commit `.env`.
- Never expose Supabase service role key outside the backend.
- Keep Spotify Client Secret private.
- Keep Spotify Refresh Token private.
- Use private playlists by default.
- Do not log full secrets.

## 17. Recommended Agent Work Allocation

If using multiple Codex agents, split work like this:

### Agent A: Scaffold and API Shell

Owns:

- Phase 1
- API key middleware
- Error response format
- Health endpoint

Deliverables:

- Express app runs locally.
- JSON response shape is standardized.

### Agent B: Database Layer

Owns:

- Phase 2
- Supabase schema
- Database helper functions
- Duplicate-safe insert logic

Deliverables:

- Database operations are isolated and tested manually.

### Agent C: Spotify Layer

Owns:

- Phase 3
- Phase 4
- Token refresh
- Spotify API wrapper

Deliverables:

- Backend can authenticate, create playlist, search, and add tracks.

### Agent D: Matching and Endpoint Integration

Owns:

- Phase 5
- Phase 6
- End-to-end endpoint behavior

Deliverables:

- `/api/add-song` implements the full workflow.

### Agent E: Deployment and Power Automate

Owns:

- Phase 7
- Phase 8
- Production environment variables
- Power Automate setup documentation

Deliverables:

- Render deployment works.
- Power Automate can call production endpoint.

## 18. First Build Order

Use this order to avoid blockers:

1. Build Express scaffold.
2. Create Supabase project and tables.
3. Create Spotify Developer app.
4. Implement OAuth and get refresh token.
5. Implement Spotify client.
6. Implement matching logic.
7. Implement `/api/add-song`.
8. Test locally with curl or PowerShell.
9. Deploy to Render.
10. Update Spotify redirect URI for production.
11. Test production endpoint.
12. Connect Power Automate.

## 19. Definition of Done

The project is complete when:

- Power Automate can call `POST /api/add-song`.
- A missing playlist is created privately.
- Existing playlists are reused by case-insensitive name key.
- Matching songs are added.
- Duplicate songs are skipped.
- Unmatched or ambiguous songs are returned as manageable failures.
- Failures can be logged to Excel.
- Secrets are stored only in environment variables.
- Backend runs on free cloud hosting.
- Supabase stores playlist and track mappings.

## 20. Known Tradeoffs

- Render free services may sleep when inactive, so the first request of the weekly run may be slower.
- Supabase free tier limits are enough for this workflow, but storage and project activity limits should be monitored.
- Strict song matching may produce more manual review items, but it reduces wrong song additions.
- Local duplicate tracking is efficient, but if you manually add songs directly in Spotify, the database will not know unless a sync feature is added later.

## 21. Future Enhancements

Add these only after the basic workflow works:

- Batch endpoint for sending many songs at once.
- Admin endpoint to sync existing playlist tracks from Spotify into Supabase.
- Retry handling for Spotify rate limits.
- Better fuzzy matching with confidence scores.
- Web dashboard for reviewing failed songs.
- Endpoint to list all backend-managed playlists.
