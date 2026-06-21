# Prompt 01: Build Project Scaffold

You are implementing Phase 1 from:

`docs/spotify-backend-build-guide.md`

Goal:

Create the Node.js Express backend scaffold for the Spotify Power Automate backend.

Requirements:

1. Initialize a Node.js project if `package.json` does not exist.
2. Use Express.
3. Add `dotenv`.
4. Add a clean folder structure:
   - `src/index.js`
   - `src/config.js`
   - `src/routes/health.js`
   - `src/middleware/errorHandler.js`
5. Add `GET /health` returning:

```json
{ "ok": true }
```

6. Add JSON body parsing.
7. Add a centralized JSON error handler.
8. Add clean JSON `404` responses.
9. Add `.env.example`.
10. Add `.gitignore`.
11. Add scripts:
   - `npm start`
   - `npm run dev`

Constraints:

- Follow the architecture in the build guide.
- Do not implement Spotify logic yet.
- Do not implement Supabase logic yet.
- Keep the code simple and readable.
- Do not commit changes.

Validation:

- Run `npm install` if needed.
- Run the server if possible.
- Test `GET /health`.

Final response:

- Summarize files created or changed.
- Show how to start the server.
- Mention any validation that could not be completed.
