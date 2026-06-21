# Prompt 07: Prepare Render Deployment

You are implementing Phase 7 from:

`docs/spotify-backend-build-guide.md`

Goal:

Prepare this backend to deploy cleanly to Render.

Before coding:

1. Read `docs/spotify-backend-build-guide.md`.
2. Inspect existing `package.json`, `.env.example`, and server startup code.
3. Preserve existing project patterns.

Tasks:

1. Ensure `npm start` starts the production server.
2. Ensure the server listens on `process.env.PORT`.
3. Ensure `.env.example` has every required environment variable:
   - `PORT`
   - `NODE_ENV`
   - `API_KEY`
   - `SPOTIFY_CLIENT_ID`
   - `SPOTIFY_CLIENT_SECRET`
   - `SPOTIFY_USER_ID`
   - `SPOTIFY_REDIRECT_URI`
   - `SPOTIFY_REFRESH_TOKEN`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Add deployment notes to `README.md` if missing.
5. Document Render build command:

```bash
npm install
```

6. Document Render start command:

```bash
npm start
```

7. Document production redirect URI format:

```text
https://YOUR_RENDER_SERVICE_NAME.onrender.com/auth/callback
```

Constraints:

- Do not put real secrets in files.
- Do not deploy unless I explicitly ask.
- Do not commit changes.

Validation:

- Run `npm start` locally if possible.
- Confirm `/health` works.

Final response:

- Summarize deployment readiness.
- List exact Render environment variables I need to set.
- Mention any missing project pieces.
