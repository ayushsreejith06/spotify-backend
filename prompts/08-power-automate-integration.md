# Prompt 08: Document Power Automate Integration

You are implementing Phase 8 from:

`docs/spotify-backend-build-guide.md`

Goal:

Create simple Power Automate integration instructions for calling the backend once per Excel/Form row.

Before writing:

1. Read `docs/spotify-backend-build-guide.md`.
2. Inspect existing README/docs.

Tasks:

1. Add or update `docs/power-automate-setup.md`.
2. Explain the Power Automate flow:
   - trigger weekly or from Forms/Excel
   - list rows/responses
   - apply to each row
   - send HTTP request
   - parse JSON response
   - append failures to Excel
3. Include the HTTP method, URL, headers, and body.
4. Include example dynamic field placeholders.
5. Include the failure logging table columns:
   - `Timestamp`
   - `Playlist Name`
   - `Song Name`
   - `Artist Name`
   - `Status`
   - `Message`
   - `Candidate Links`
6. Explain that `ok: false` should not stop the loop.
7. Mention that the HTTP connector may require Power Automate Premium.

Constraints:

- Documentation only.
- Do not change backend code unless needed to correct a mismatch in the docs.
- Do not commit changes.

Final response:

- Summarize documentation added.
- Point me to the file.
- Mention the Premium HTTP connector caveat.
