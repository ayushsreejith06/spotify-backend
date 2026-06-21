# Power Automate Setup

This flow watches a SharePoint folder for a weekly Excel workbook, validates that the workbook has an Excel table, sends each song row to the Spotify backend, and logs rows that need manual review.

Assumed weekly process:

1. Coffee chat sends a new Microsoft Form each week.
2. The form owner exports the responses to Excel.
3. The form owner formats the response range as an Excel table.
4. The form owner uploads the `.xlsx` file to the watched SharePoint folder.
5. Power Automate creates or reuses the Spotify playlist named in the uploaded rows.

The backend accepts one row per request:

```http
POST https://YOUR_RENDER_SERVICE_NAME.onrender.com/api/add-song
```

## Backend Contract This Flow Depends On

This section matches the current backend implementation in this repo.

Health check:

```http
GET https://YOUR_RENDER_SERVICE_NAME.onrender.com/health
```

Expected health response:

```json
{
  "ok": true
}
```

Song request endpoint:

```http
POST https://YOUR_RENDER_SERVICE_NAME.onrender.com/api/add-song
```

Required headers:

```http
Content-Type: application/json
x-api-key: YOUR_BACKEND_API_KEY
```

Required JSON body properties:

```json
{
  "playlistName": "Coffee Chat 2026-06-26",
  "songName": "Blinding Lights",
  "artistName": "The Weeknd"
}
```

The property names are case-sensitive. Do not send `Playlist Name`, `Song Name`, or `Artist Name` as JSON property names. Those are only the Excel table column names.

The backend requires all three values to be non-empty strings. It trims leading/trailing spaces and collapses repeated internal spaces before using them. Playlist lookup is case-insensitive because the backend stores a lowercase playlist key, so `Coffee Chat` and `coffee chat` reuse the same stored playlist.

Successful add response:

```json
{
  "ok": true,
  "status": "added",
  "playlistName": "Coffee Chat 2026-06-26",
  "playlistId": "spotify_playlist_id",
  "trackName": "Blinding Lights",
  "artistName": "The Weeknd",
  "trackUri": "spotify:track:example",
  "message": "Song added to playlist."
}
```

Duplicate response:

```json
{
  "ok": true,
  "status": "skipped_duplicate",
  "playlistName": "Coffee Chat 2026-06-26",
  "playlistId": "spotify_playlist_id",
  "trackName": "Blinding Lights",
  "artistName": "The Weeknd",
  "trackUri": "spotify:track:example",
  "message": "Song already exists in playlist."
}
```

Manageable song-not-found response:

```json
{
  "ok": false,
  "status": "song_not_found",
  "playlistName": "Coffee Chat 2026-06-26",
  "songName": "Definitely Not A Real Song 12345",
  "artistName": "Unknown Artist",
  "message": "No confident Spotify match found. Add manually."
}
```

Error responses use this shape:

```json
{
  "ok": false,
  "status": "invalid_request",
  "message": "playlistName, songName, and artistName are required."
}
```

The main statuses this flow should account for are:

| HTTP status | `status` | Meaning | Flow behavior |
| --- | --- | --- | --- |
| `200` | `added` | Track was added to Spotify and saved in Supabase | No log row needed |
| `200` | `skipped_duplicate` | Track already exists in the playlist | No log row needed |
| `200` | `song_not_found` | Spotify search did not find a confident title and artist match | Append to `FailureLog` and continue |
| `400` | `invalid_request` | Missing or blank `playlistName`, `songName`, or `artistName` | Avoid this by validating rows before HTTP |
| `401` | `unauthorized` | Wrong or missing `x-api-key` | Fix the flow secret |
| `400`, `401`, `403`, or `500` | `spotify_auth_error` | Spotify credentials, refresh token, or backend Spotify environment variable problem | Fix backend environment variables or Spotify OAuth |
| `429` | `spotify_rate_limited` | Spotify rate limit | Retry later or add retry handling |
| `500` | `database_error` | Supabase request failed | Check backend logs and Supabase configuration |
| `500` | `spotify_api_error` or `internal_error` | Unexpected backend or Spotify failure | Check backend logs |

## Flow Summary

Create an automated cloud flow with this structure:

1. SharePoint trigger: `When a file is created (properties only)`.
2. Condition: continue only for `.xlsx` files.
3. Delay briefly so SharePoint and Excel finish processing the upload.
4. Excel action: `Get tables`.
5. Condition: validate at least one table exists.
6. Compose: pick the first table name.
7. Excel action: `List rows present in a table`.
8. `Apply to each`: validate required row fields.
9. If a row is missing required fields, append a failure row and skip the HTTP request for that row.
10. If the row is valid, send it to the backend.
11. Parse the JSON response.
12. If `ok` is `false`, append a failure row to Excel.

## Premium Connector Note

You said premium licensing is available. The `HTTP` action may require Power Automate Premium depending on tenant policy, so this design uses it directly.

## Recommended SharePoint Setup

Create one SharePoint document library folder for uploads, for example:

```text
Shared Documents/Coffee Chat Song Requests/Incoming
```

Create one failure log workbook outside the watched upload folder, for example:

```text
Shared Documents/Coffee Chat Song Requests/Failure Log.xlsx
```

In `Failure Log.xlsx`, create a table named:

```text
FailureLog
```

The `FailureLog` table must have exactly these columns:

```text
Timestamp
Source File
Playlist Name
Song Name
Artist Name
Status
Message
```

The source workbook uploaded each week must be `.xlsx` and must contain at least one Excel table. The first table should include:

```text
Playlist Name
Song Name
Artist Name
```

If the Microsoft Forms export has different column names, rename the table headers before upload or adjust the row mappings in the HTTP body.

Avoid blank rows inside the Excel table. This flow includes a row validation condition so blank required cells are logged as `invalid_request` instead of causing the backend HTTP action to fail.

## Create The Flow

In Power Automate:

1. Select `Create`.
2. Select `Automated cloud flow`.
3. Flow name:

```text
Coffee Chat Spotify Playlist From Excel
```

4. Search for:

```text
SharePoint file created
```

5. Select the SharePoint trigger:

```text
When a file is created (properties only)
```

6. Select `Create`.

## Trigger: When A File Is Created

Select the trigger card. On the `Parameters` tab, fill in:

| Field | Value |
| --- | --- |
| `Site Address` | Select your SharePoint site |
| `Library Name` | Select `Documents` or the library that contains the upload folder |
| `Folder` | Select `/Coffee Chat Song Requests/Incoming` or your chosen upload folder |

Use the folder picker when possible so Power Automate stores the correct folder identifier.

## Add Condition: Only Process Excel Files

Select the `+` below the trigger, then select `Add an action`.

Search for:

```text
condition
```

Select:

```text
Condition
```

Rename this action:

```text
Only process xlsx files
```

Set the condition:

| Left side | Operator | Right side |
| --- | --- | --- |
| Select dynamic content `File name with extension` | `ends with` | `.xlsx` |

If `ends with` is not visible, use this expression on the left side and set the condition to `is equal to` `true`:

```text
@endsWith(toLower(triggerOutputs()?['body/{FilenameWithExtension}']), '.xlsx')
```

Leave the `False` branch empty. All remaining actions go in the `True` branch.

## Add Delay

Inside the `True` branch, select `+`, then `Add an action`.

Search for:

```text
delay
```

Select:

```text
Delay
```

Rename it:

```text
Wait for Excel file availability
```

Fill in:

| Field | Value |
| --- | --- |
| `Count` | `2` |
| `Unit` | `Minute` |

This avoids common Excel connector issues immediately after an upload.

## Add Excel Action: Get Tables

Below the delay, select `+`, then `Add an action`.

Search for:

```text
get tables excel online business
```

Select the Excel Online (Business) action:

```text
Get tables
```

Rename it:

```text
Get tables from uploaded workbook
```

Fill in:

| Field | Value |
| --- | --- |
| `Location` | Select your SharePoint site |
| `Document Library` | Select the same library as the trigger |
| `File` | Select dynamic content `Identifier` from the SharePoint trigger |

If the `File` picker does not show the uploaded file, select `Enter custom value`, then choose dynamic content:

```text
Identifier
```

## Add Condition: Validate Workbook Has A Table

Below `Get tables`, add another `Condition`.

Rename it:

```text
Workbook has at least one table
```

Use this expression on the left side:

```text
@length(body('Get_tables_from_uploaded_workbook')?['value'])
```

Set:

| Operator | Right side |
| --- | --- |
| `is greater than` | `0` |

In the `False` branch, add an Excel `Add a row into a table` action that writes a failure log row saying the uploaded workbook was not in table format.

Fill that failure row like this:

| FailureLog column | Value |
| --- | --- |
| `Timestamp` | Expression: `utcNow()` |
| `Source File` | Dynamic content: `File name with extension` |
| `Playlist Name` | Leave blank |
| `Song Name` | Leave blank |
| `Artist Name` | Leave blank |
| `Status` | `workbook_missing_table` |
| `Message` | `Uploaded workbook does not contain an Excel table. Format the responses as a table and upload again.` |

All remaining actions go in the `True` branch.

## Add Compose: First Table Name

Inside the `True` branch of `Workbook has at least one table`, select `+`, then `Add an action`.

Search for:

```text
compose
```

Select:

```text
Compose
```

Rename it:

```text
First table name
```

In `Inputs`, select the `Expression` tab and enter:

```text
@first(body('Get_tables_from_uploaded_workbook')?['value'])?['name']
```

This uses the first table in the uploaded workbook. For best reliability, keep only one table in each uploaded response workbook.

## Add Excel Action: List Rows Present In A Table

Below `First table name`, select `+`, then `Add an action`.

Search for:

```text
list rows present in a table excel online business
```

Select the Excel Online (Business) action:

```text
List rows present in a table
```

Rename it:

```text
List request rows
```

Fill in:

| Field | Value |
| --- | --- |
| `Location` | Select your SharePoint site |
| `Document Library` | Select the same library as the trigger |
| `File` | Select dynamic content `Identifier` from the SharePoint trigger |
| `Table` | Select `Enter custom value`, then select dynamic content `Outputs` from `First table name` |

Open the action settings and turn on pagination if a weekly form could exceed 256 responses. Set the threshold to a reasonable upper bound, for example:

```text
5000
```

Microsoft documents that `List rows present in a table` returns 256 rows by default unless pagination is enabled.

## Add Apply To Each

Below `List request rows`, select `+`, then `Add an action`.

Search for:

```text
apply to each
```

Select:

```text
Apply to each
```

Rename it:

```text
For each song request row
```

In `Select an output from previous steps`, choose dynamic content:

```text
value
```

Use the `value` from `List request rows`.

## Add Condition: Row Has Required Fields

Inside `For each song request row`, add a `Condition` before the HTTP action.

Rename it:

```text
Row has required fields
```

Use this expression on the left side:

```text
@and(not(empty(trim(string(coalesce(items('For_each_song_request_row')?['Playlist Name'], ''))))), not(empty(trim(string(coalesce(items('For_each_song_request_row')?['Song Name'], ''))))), not(empty(trim(string(coalesce(items('For_each_song_request_row')?['Artist Name'], ''))))))
```

Set:

| Operator | Right side |
| --- | --- |
| `is equal to` | `true` |

If Power Automate gives your loop a different internal name, rebuild the expression with that loop name or use the dynamic content picker for `Playlist Name`, `Song Name`, and `Artist Name`.

In the `False` branch, add an Excel Online (Business) action:

```text
Add a row into a table
```

Rename it:

```text
Append invalid row to log
```

Fill in:

| Field | Value |
| --- | --- |
| `Location` | Select the SharePoint site containing `Failure Log.xlsx` |
| `Document Library` | Select the document library containing the log workbook |
| `File` | Select `Failure Log.xlsx` |
| `Table` | Select `FailureLog` |

Map the table columns:

| FailureLog column | Value |
| --- | --- |
| `Timestamp` | Expression: `utcNow()` |
| `Source File` | Dynamic content `File name with extension` from the SharePoint trigger |
| `Playlist Name` | Dynamic content `Playlist Name` from `List request rows` |
| `Song Name` | Dynamic content `Song Name` from `List request rows` |
| `Artist Name` | Dynamic content `Artist Name` from `List request rows` |
| `Status` | `invalid_request` |
| `Message` | `Playlist Name, Song Name, and Artist Name are required before calling the backend.` |

Leave the rest of the `False` branch empty. Put the HTTP request and all backend response handling in the `True` branch.

## Add HTTP Request

Inside the `True` branch of `Row has required fields`, select `Add an action`.

Search for:

```text
http
```

Select:

```text
HTTP
```

Rename it:

```text
Call Spotify backend
```

Fill in:

| Field | Value |
| --- | --- |
| `Method` | `POST` |
| `URI` | `https://YOUR_RENDER_SERVICE_NAME.onrender.com/api/add-song` |

Headers:

| Header | Value |
| --- | --- |
| `Content-Type` | `application/json` |
| `x-api-key` | `YOUR_BACKEND_API_KEY` |

Body:

```json
{
  "playlistName": "@{items('For_each_song_request_row')?['Playlist Name']}",
  "songName": "@{items('For_each_song_request_row')?['Song Name']}",
  "artistName": "@{items('For_each_song_request_row')?['Artist Name']}"
}
```

If Power Automate gives your loop a different internal name, use the dynamic content picker for the three row fields instead:

| JSON property | Dynamic content to click |
| --- | --- |
| `playlistName` | `Playlist Name` from `List request rows` |
| `songName` | `Song Name` from `List request rows` |
| `artistName` | `Artist Name` from `List request rows` |

The body should still be JSON with property names `playlistName`, `songName`, and `artistName`.

The backend will trim and collapse whitespace, so these values do not need extra cleanup in Power Automate as long as they are non-empty.

## Parse JSON Response

Still inside the `True` branch of `Row has required fields`, add an action below `Call Spotify backend`.

Search for:

```text
parse json
```

Select:

```text
Parse JSON
```

Rename it:

```text
Parse backend response
```

Fill in:

| Field | Value |
| --- | --- |
| `Content` | Dynamic content `Body` from `Call Spotify backend` |

Schema:

```json
{
  "type": "object",
  "properties": {
    "ok": { "type": "boolean" },
    "status": { "type": "string" },
    "playlistName": { "type": "string" },
    "playlistId": { "type": "string" },
    "songName": { "type": "string" },
    "trackName": { "type": "string" },
    "artistName": { "type": "string" },
    "trackUri": { "type": "string" },
    "message": { "type": "string" }
  }
}
```

The backend returns `trackName` for successful matches and `songName` for `song_not_found`, so keep both in the schema. None of these response properties are marked as required because different statuses return different fields.

## Add Condition: Log Backend Failures

Still inside the `True` branch of `Row has required fields`, add a `Condition` below `Parse backend response`.

Rename it:

```text
Backend returned manageable failure
```

Use this expression on the left side:

```text
@body('Parse_backend_response')?['ok']
```

Set:

| Operator | Right side |
| --- | --- |
| `is equal to` | `false` |

In the `False` branch, do nothing. That means `added` and `skipped_duplicate` rows need no failure log entry.

In the `True` branch, add the failure log row.

## Add Failure Log Row

In the `True` branch of `Backend returned manageable failure`, add an Excel Online (Business) action:

```text
Add a row into a table
```

Rename it:

```text
Append backend failure to log
```

Fill in:

| Field | Value |
| --- | --- |
| `Location` | Select the SharePoint site containing `Failure Log.xlsx` |
| `Document Library` | Select the document library containing the log workbook |
| `File` | Select `Failure Log.xlsx` |
| `Table` | Select `FailureLog` |

Map the table columns:

| FailureLog column | Value |
| --- | --- |
| `Timestamp` | Expression: `utcNow()` |
| `Source File` | Dynamic content `File name with extension` from the SharePoint trigger |
| `Playlist Name` | Dynamic content `Playlist Name` from `List request rows` |
| `Song Name` | Dynamic content `Song Name` from `List request rows` |
| `Artist Name` | Dynamic content `Artist Name` from `List request rows` |
| `Status` | Dynamic content `status` from `Parse backend response` |
| `Message` | Dynamic content `message` from `Parse backend response` |

## Important: `ok: false` Must Not Stop The Loop

The backend intentionally returns HTTP `200` with `ok: false` for manageable song issues:

- `song_not_found`

Treat those as row-level failures only. Log them and let `For each song request row` continue to the next Excel row.

These errors usually should stop or alert the flow because they mean the setup is wrong or the service failed. The row validation condition should prevent normal blank-cell data issues from reaching the backend as HTTP `400`.

- HTTP `400`: bad request body or missing required fields that bypassed row validation
- HTTP `401`: wrong or missing `x-api-key`
- HTTP `429`: Spotify rate limit
- HTTP `500`: backend, database, or unexpected service failure

## Test The Flow

Upload a workbook to the watched SharePoint folder with a table like:

| Playlist Name | Song Name | Artist Name |
| --- | --- | --- |
| Coffee Chat 2026-06-26 | Blinding Lights | The Weeknd |
| Coffee Chat 2026-06-26 | Definitely Not A Real Song 12345 | Unknown Artist |
| Coffee Chat 2026-06-26 |  | The Weeknd |

Expected results:

- The first row should be added or skipped as a duplicate.
- The second row should return `ok: false`.
- The second row should be appended to `FailureLog`.
- The third row should be appended to `FailureLog` as `invalid_request` without calling the backend.
- The flow should complete the whole workbook instead of stopping at the failed song.

## Operational Notes

- Upload only one finished weekly workbook at a time.
- Keep the failure log outside the watched incoming folder so writing failures does not trigger the same flow.
- Keep only one table in the uploaded workbook unless you intentionally want the first table to be processed.
- Confirm the source table headers match the HTTP body mappings exactly.
- Do not put the backend API key in the uploaded workbook.
