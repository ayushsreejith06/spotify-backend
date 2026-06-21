# Prompt 10: Final Project Review

You are reviewing the completed Spotify backend project.

Read first:

- `docs/spotify-backend-build-guide.md`
- `README.md` if present
- `docs/power-automate-setup.md` if present
- `docs/testing-checklist.md` if present

Goal:

Perform a code-review style final pass before production use.

Review for:

1. API contract correctness:
   - `POST /api/add-song`
   - request body fields
   - response statuses
   - manageable `ok: false` failures
2. Security:
   - `x-api-key`
   - no committed secrets
   - Supabase service key backend-only
   - Spotify refresh token not logged in production
3. Spotify behavior:
   - private playlist creation
   - access token refresh
   - strict matching
   - duplicate skip
4. Database behavior:
   - playlist key uniqueness
   - duplicate track uniqueness
   - conflict handling
5. Deployment readiness:
   - `npm start`
   - `PORT`
   - `.env.example`
   - Render instructions
6. Power Automate readiness:
   - one song per request
   - failure logging
   - loop continues on `ok: false`

Output format:

- Findings first, ordered by severity.
- Include file paths and line numbers.
- Then summarize what looks ready.
- Then list exact next actions.

Constraints:

- Do not make changes unless I explicitly ask you to fix findings.
- Do not commit changes.
