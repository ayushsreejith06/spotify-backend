# Prompt 03: Implement Spotify OAuth Setup

You are implementing Phase 3 from:

`docs/spotify-backend-build-guide.md`

Goal:

Add the one-time Spotify OAuth flow needed to get a refresh token for my Spotify account.

Before coding:

1. Read `docs/spotify-backend-build-guide.md`.
2. Inspect the existing backend structure.
3. Preserve existing patterns.

Tasks:

1. Add or update `src/routes/auth.js`.
2. Implement `GET /auth/login`.
3. Implement `GET /auth/callback`.
4. Use Spotify Authorization Code Flow.
5. Request these scopes:

```text
playlist-modify-private playlist-read-private user-read-private
```

6. Exchange the authorization code for tokens.
7. In development only, display or log the refresh token clearly so I can copy it into `.env`.
8. Also fetch or document how to fetch `SPOTIFY_USER_ID`.
9. Add required environment variables to `.env.example` if missing:
   - `SPOTIFY_CLIENT_ID`
   - `SPOTIFY_CLIENT_SECRET`
   - `SPOTIFY_USER_ID`
   - `SPOTIFY_REDIRECT_URI`
   - `SPOTIFY_REFRESH_TOKEN`

Constraints:

- Do not hardcode secrets.
- Do not commit `.env`.
- Do not implement the main `/api/add-song` workflow yet.
- Keep the OAuth routes simple.
- Do not commit changes.

Validation:

- If Spotify credentials are missing, make sure the app fails with a clear error only when auth routes are used.
- If credentials are available, test `/auth/login` and `/auth/callback`.

Final response:

- Summarize files changed.
- Give exact Spotify Dashboard redirect URI instructions.
- Explain how I get and store the refresh token.
