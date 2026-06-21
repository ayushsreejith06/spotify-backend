const config = require("../config");

const SPOTIFY_API_BASE_URL = "https://api.spotify.com/v1";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const ACCESS_TOKEN_EXPIRY_BUFFER_MS = 60 * 1000;
const DEFAULT_PLAYLIST_DESCRIPTION = "Created by Power Automate Spotify backend.";

let cachedAccessToken;
let cachedAccessTokenExpiresAt = 0;
let refreshInFlight;

class SpotifyClientError extends Error {
  constructor(message, { code, statusCode, retryAfter, details } = {}) {
    super(message);
    this.name = "SpotifyClientError";
    this.code = code || "spotify_api_error";
    this.statusCode = statusCode || 500;
    this.retryAfter = retryAfter;
    this.details = details;
  }
}

function assertSpotifyClientConfig() {
  const missing = [];

  if (!config.spotifyClientId) missing.push("SPOTIFY_CLIENT_ID");
  if (!config.spotifyClientSecret) missing.push("SPOTIFY_CLIENT_SECRET");
  if (!config.spotifyRefreshToken) missing.push("SPOTIFY_REFRESH_TOKEN");

  if (missing.length > 0) {
    throw new SpotifyClientError(
      `Missing Spotify API environment variables: ${missing.join(", ")}.`,
      {
        code: "spotify_auth_error",
        statusCode: 500,
      },
    );
  }
}

function createBasicAuthHeader() {
  const credentials = `${config.spotifyClientId}:${config.spotifyClientSecret}`;
  return `Basic ${Buffer.from(credentials).toString("base64")}`;
}

async function parseResponseBody(response) {
  const responseText = await response.text();

  if (!responseText) {
    return undefined;
  }

  try {
    return JSON.parse(responseText);
  } catch (error) {
    throw new SpotifyClientError("Spotify returned an invalid JSON response.", {
      code: "spotify_api_error",
      statusCode: response.status,
      details: responseText,
    });
  }
}

function getSpotifyErrorMessage(body, fallbackMessage) {
  if (body?.error_description) {
    return body.error_description;
  }

  if (typeof body?.error === "string") {
    return body.error;
  }

  if (body?.error?.message) {
    return body.error.message;
  }

  return fallbackMessage;
}

function createSpotifyResponseError(response, body) {
  const retryAfter = response.headers.get("retry-after");
  const spotifyErrorCode = typeof body?.error === "string" ? body.error : undefined;

  if (response.status === 429) {
    return new SpotifyClientError("Spotify rate limit exceeded.", {
      code: "spotify_rate_limited",
      statusCode: 429,
      retryAfter: retryAfter ? Number(retryAfter) : undefined,
      details: body,
    });
  }

  if (
    response.status === 401 ||
    response.status === 403 ||
    spotifyErrorCode === "invalid_grant" ||
    spotifyErrorCode === "invalid_client"
  ) {
    return new SpotifyClientError(
      getSpotifyErrorMessage(body, "Spotify authorization failed."),
      {
        code: "spotify_auth_error",
        statusCode: response.status,
        details: body,
      },
    );
  }

  return new SpotifyClientError(
    getSpotifyErrorMessage(body, "Spotify API request failed."),
    {
      code: "spotify_api_error",
      statusCode: response.status,
      details: body,
    },
  );
}

async function refreshAccessToken() {
  assertSpotifyClientConfig();

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: config.spotifyRefreshToken,
  });

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: createBasicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const tokenData = await parseResponseBody(response);

  if (!response.ok) {
    throw createSpotifyResponseError(response, tokenData);
  }

  cachedAccessToken = tokenData.access_token;
  cachedAccessTokenExpiresAt = Date.now() + (tokenData.expires_in * 1000);

  return cachedAccessToken;
}

async function getAccessToken({ forceRefresh = false } = {}) {
  if (
    !forceRefresh &&
    cachedAccessToken &&
    Date.now() < cachedAccessTokenExpiresAt - ACCESS_TOKEN_EXPIRY_BUFFER_MS
  ) {
    return cachedAccessToken;
  }

  if (!refreshInFlight) {
    refreshInFlight = refreshAccessToken().finally(() => {
      refreshInFlight = undefined;
    });
  }

  return refreshInFlight;
}

async function spotifyRequest(path, { method = "GET", query, body, retryOnUnauthorized = true } = {}) {
  const accessToken = await getAccessToken();
  const url = new URL(`${SPOTIFY_API_BASE_URL}${path}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const responseBody = await parseResponseBody(response);

  if (response.status === 401 && retryOnUnauthorized) {
    cachedAccessToken = undefined;
    cachedAccessTokenExpiresAt = 0;

    return spotifyRequest(path, {
      method,
      query,
      body,
      retryOnUnauthorized: false,
    });
  }

  if (!response.ok) {
    throw createSpotifyResponseError(response, responseBody);
  }

  return responseBody;
}

function assertNonEmptyString(value, name) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new SpotifyClientError(`${name} is required.`, {
      code: "spotify_api_error",
      statusCode: 500,
    });
  }
}

async function getCurrentUserProfile() {
  return spotifyRequest("/me");
}

async function createPrivatePlaylist(name) {
  assertNonEmptyString(name, "Playlist name");

  const playlist = await spotifyRequest("/me/playlists", {
    method: "POST",
    body: {
      name: name.trim(),
      public: false,
      collaborative: false,
      description: DEFAULT_PLAYLIST_DESCRIPTION,
    },
  });

  await spotifyRequest(`/playlists/${encodeURIComponent(playlist.id)}`, {
    method: "PUT",
    body: {
      public: false,
      collaborative: false,
    },
  });

  const verifiedPlaylist = await spotifyRequest(`/playlists/${encodeURIComponent(playlist.id)}`);

  return verifiedPlaylist;
}

async function searchTrack(songName, artistName) {
  assertNonEmptyString(songName, "Song name");
  assertNonEmptyString(artistName, "Artist name");

  const data = await spotifyRequest("/search", {
    query: {
      q: `track:${songName.trim()} artist:${artistName.trim()}`,
      type: "track",
      limit: 5,
    },
  });

  return data.tracks?.items || [];
}

async function addTrackToPlaylist(playlistId, trackUri) {
  assertNonEmptyString(playlistId, "Playlist ID");
  assertNonEmptyString(trackUri, "Track URI");

  return spotifyRequest(`/playlists/${encodeURIComponent(playlistId)}/items`, {
    method: "POST",
    body: {
      uris: [trackUri],
    },
  });
}

async function getPlaylistItems(playlistId) {
  assertNonEmptyString(playlistId, "Playlist ID");

  const items = [];
  let offset = 0;
  let total = 0;

  do {
    const data = await spotifyRequest(`/playlists/${encodeURIComponent(playlistId)}/items`, {
      query: {
        limit: 100,
        offset,
      },
    });

    const pageItems = data.items || [];
    items.push(...pageItems);
    total = data.total || items.length;
    offset += pageItems.length;

    if (pageItems.length === 0) {
      break;
    }
  } while (offset < total);

  return items;
}

module.exports = {
  SpotifyClientError,
  getCurrentUserProfile,
  createPrivatePlaylist,
  searchTrack,
  addTrackToPlaylist,
  getPlaylistItems,
};
