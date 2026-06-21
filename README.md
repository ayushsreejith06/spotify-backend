# Spotify Playlist Automation Backend

Node.js/Express backend for adding songs from Power Automate requests to Spotify playlists. The backend uses a static `x-api-key`, Spotify Web API, and Supabase for playlist and track storage.

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` and fill in local values. Do not commit `.env`.

3. Start the development server:

```bash
npm run dev
```

4. Check the health endpoint:

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{
  "ok": true
}
```

## Production Start

The production server starts with:

```bash
npm start
```

The server listens on `process.env.PORT`, falling back to `3000` for local use.

## Render Deployment

Create a Render Web Service connected to this repository.

Use this build command:

```bash
npm install
```

Use this start command:

```bash
npm start
```

Set these environment variables in Render:

```text
PORT
NODE_ENV
API_KEY
SPOTIFY_CLIENT_ID
SPOTIFY_CLIENT_SECRET
SPOTIFY_USER_ID
SPOTIFY_REDIRECT_URI
SPOTIFY_REFRESH_TOKEN
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

Recommended production values:

```text
NODE_ENV=production
SPOTIFY_REDIRECT_URI=https://YOUR_RENDER_SERVICE_NAME.onrender.com/auth/callback
```

Also add the same production redirect URI to the Spotify Developer Dashboard:

```text
https://YOUR_RENDER_SERVICE_NAME.onrender.com/auth/callback
```

After deploying, verify:

```bash
curl https://YOUR_RENDER_SERVICE_NAME.onrender.com/health
```

Expected response:

```json
{
  "ok": true
}
```

## API Endpoint

```http
POST /api/add-song
```

Required headers:

```http
Content-Type: application/json
x-api-key: YOUR_BACKEND_API_KEY
```

Request body:

```json
{
  "playlistName": "June Week 3",
  "songName": "Blinding Lights",
  "artistName": "The Weeknd"
}
```

## Secret Handling

Do not put real Spotify, Supabase, or API key secrets in committed files. Store local values in `.env` and production values in Render environment variables.
