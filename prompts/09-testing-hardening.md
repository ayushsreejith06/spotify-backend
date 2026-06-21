# Prompt 09: Test And Harden Backend

You are implementing Phase 9 from:

`docs/spotify-backend-build-guide.md`

Goal:

Test the backend behavior and harden obvious issues before real weekly use.

Before testing:

1. Read `docs/spotify-backend-build-guide.md`.
2. Inspect existing code and scripts.
3. Identify available test tools.

Tasks:

1. Test or document tests for:
   - `GET /health`
   - missing fields
   - wrong API key
   - new playlist creation
   - existing playlist reuse
   - duplicate song skip
   - unknown song
   - multiple exact Spotify matches using the first exact match
   - Spotify auth failure
   - Supabase failure
2. Add automated tests only if the project already has a test setup or it is simple to add without overbuilding.
3. Fix bugs found during testing.
4. Do not fix unrelated issues.
5. Add `docs/testing-checklist.md` if it does not exist.

Constraints:

- Do not use real secrets in committed files.
- Do not delete user data.
- Do not commit changes.

Final response:

- Summarize what was tested.
- List fixes made.
- List tests that require real Spotify/Supabase credentials.
- List any remaining risks.
