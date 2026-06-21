# Prompt 06: Implement `/api/add-song`

You are implementing Phase 6 from:

`docs/spotify-backend-build-guide.md`

Goal:

Implement the full Power Automate endpoint:

```http
POST /api/add-song
```

Before coding:

1. Read `docs/spotify-backend-build-guide.md`.
2. Inspect all existing files.
3. Preserve existing project patterns.
4. Verify database, Spotify client, and matching service APIs before integrating.

Tasks:

1. Add API key middleware using `x-api-key`.
2. Add or update `src/routes/addSong.js`.
3. Validate JSON body:
   - `playlistName`
   - `songName`
   - `artistName`
4. Normalize the playlist key case-insensitively.
5. Get playlist from Supabase by `playlist_key`.
6. If missing, create a private Spotify playlist and store it in Supabase.
7. Search Spotify for the requested song and artist.
8. Use the matching service.
9. If no confident match, return HTTP `200` with:

```json
{ "ok": false, "status": "song_not_found" }
```

10. If ambiguous, return HTTP `200` with:

```json
{ "ok": false, "status": "ambiguous_match" }
```

11. Check `playlist_tracks` for duplicates.
12. If duplicate, return:

```json
{ "ok": true, "status": "skipped_duplicate" }
```

13. Add track to Spotify playlist.
14. Insert track into `playlist_tracks`.
15. Return:

```json
{ "ok": true, "status": "added" }
```

16. Use the exact response style from the guide.

Constraints:

- One request handles one song.
- Do not add a batch endpoint.
- Do not allow unauthenticated calls.
- Do not make playlists public.
- Do not commit changes.

Validation:

- Test invalid body.
- Test missing/wrong API key.
- Test manageable song failure if live Spotify is available.
- Test end-to-end only if all secrets are available.

Final response:

- Summarize files changed.
- List the endpoint behavior implemented.
- Include exact curl or PowerShell command to test it.
- Mention any live validation limitations.
