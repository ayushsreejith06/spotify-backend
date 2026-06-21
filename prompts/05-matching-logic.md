# Prompt 05: Build Song Matching Logic

You are implementing Phase 5 from:

`docs/spotify-backend-build-guide.md`

Goal:

Add strict matching logic so the backend avoids adding the wrong Spotify song.

Before coding:

1. Read `docs/spotify-backend-build-guide.md`.
2. Inspect existing Spotify search result shape from the current code.
3. Preserve project patterns.

Tasks:

1. Add `src/utils/normalize.js`.
2. Add `src/services/matchService.js`.
3. Normalize strings by:
   - trimming
   - lowercasing
   - collapsing repeated spaces
   - removing simple punctuation that commonly differs in song metadata
4. Implement a function that takes:
   - requested song name
   - requested artist name
   - Spotify search results
5. Return one of:
   - confident match
   - no match
   - ambiguous match
6. For ambiguous matches, return candidate objects with:
   - track name
   - artists
   - album
   - Spotify URL
7. Prefer strictness over false positives.

Constraints:

- Do not call Spotify from `matchService`.
- Do not add a heavy fuzzy matching dependency unless clearly justified.
- Do not implement `/api/add-song` yet.
- Do not commit changes.

Validation:

- Add focused tests only if the project already has a test setup.
- Otherwise, add a small temporary/manual validation approach or document test cases in the final response.

Final response:

- Summarize files changed.
- Explain the matching rules briefly.
- List manual test cases used or recommended.
