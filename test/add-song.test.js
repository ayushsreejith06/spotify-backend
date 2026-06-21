const assert = require("node:assert/strict");
const test = require("node:test");

const API_KEY = "test_api_key";

function makeTrack({ id, name = "Blinding Lights", artists = ["The Weeknd"] }) {
  return {
    id,
    name,
    uri: `spotify:track:${id}`,
    artists: artists.map((artistName) => ({ name: artistName })),
    album: { name: `Album ${id}` },
    external_urls: { spotify: `https://open.spotify.com/track/${id}` },
  };
}

function clearAppModules() {
  [
    "../src/app",
    "../src/config",
    "../src/middleware/apiKey",
    "../src/middleware/errorHandler",
    "../src/routes/addSong",
    "../src/routes/auth",
    "../src/routes/health",
    "../src/services/matchService",
    "../src/services/spotifyClient",
    "../src/db/playlistStore",
    "../src/utils/normalize",
  ].forEach((modulePath) => {
    delete require.cache[require.resolve(modulePath)];
  });
}

async function startTestServer(options = {}) {
  process.env.API_KEY = API_KEY;
  process.env.NODE_ENV = "test";
  clearAppModules();

  const calls = {
    createPrivatePlaylist: [],
    searchTrack: [],
    addTrackToPlaylist: [],
    getPlaylistItems: [],
    getPlaylistByKey: [],
    insertPlaylist: [],
    getPlaylistTrack: [],
    insertPlaylistTrack: [],
  };

  const playlistRows = [...(options.playlists || [])];
  const trackRows = [...(options.tracks || [])];

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

  const databaseError = () => {
    const error = new Error("Supabase request failed.");
    error.code = "database_error";
    throw error;
  };

  require.cache[require.resolve("../src/db/playlistStore")] = {
    exports: {
      getPlaylistByKey: async (playlistKey) => {
        calls.getPlaylistByKey.push(playlistKey);
        if (options.databaseFailure) databaseError();
        return playlistRows.find((playlist) => playlist.playlist_key === playlistKey) || null;
      },
      insertPlaylist: async ({ playlistKey, playlistName, spotifyPlaylistId }) => {
        calls.insertPlaylist.push({ playlistKey, playlistName, spotifyPlaylistId });
        if (options.databaseFailure) databaseError();
        const playlist = {
          playlist_key: playlistKey,
          playlist_name: playlistName,
          spotify_playlist_id: spotifyPlaylistId,
        };
        playlistRows.push(playlist);
        return playlist;
      },
      getPlaylistTrack: async (spotifyPlaylistId, spotifyTrackUri) => {
        calls.getPlaylistTrack.push({ spotifyPlaylistId, spotifyTrackUri });
        if (options.databaseFailure) databaseError();
        return trackRows.find((track) => (
          track.spotify_playlist_id === spotifyPlaylistId &&
          track.spotify_track_uri === spotifyTrackUri
        )) || null;
      },
      insertPlaylistTrack: async ({ spotifyPlaylistId, spotifyTrackUri, trackName, artistName }) => {
        calls.insertPlaylistTrack.push({ spotifyPlaylistId, spotifyTrackUri, trackName, artistName });
        if (options.databaseFailure) databaseError();
        const existingTrack = trackRows.find((track) => (
          track.spotify_playlist_id === spotifyPlaylistId &&
          track.spotify_track_uri === spotifyTrackUri
        ));

        if (existingTrack) return existingTrack;

        const track = {
          spotify_playlist_id: spotifyPlaylistId,
          spotify_track_uri: spotifyTrackUri,
          track_name: trackName,
          artist_name: artistName,
        };
        trackRows.push(track);
        return track;
      },
    },
  };

  require.cache[require.resolve("../src/services/spotifyClient")] = {
    exports: {
      SpotifyClientError,
      createPrivatePlaylist: async (name) => {
        calls.createPrivatePlaylist.push(name);
        if (options.spotifyAuthFailure) {
          throw new SpotifyClientError("Spotify authorization failed.", {
            code: "spotify_auth_error",
            statusCode: 401,
          });
        }
        return { id: options.createdPlaylistId || "new_playlist_id", name };
      },
      searchTrack: async (songName, artistName) => {
        calls.searchTrack.push({ songName, artistName });
        if (options.spotifyAuthFailure) {
          throw new SpotifyClientError("Spotify authorization failed.", {
            code: "spotify_auth_error",
            statusCode: 401,
          });
        }
        return options.searchResults || [makeTrack({ id: "track_1" })];
      },
      addTrackToPlaylist: async (playlistId, trackUri) => {
        calls.addTrackToPlaylist.push({ playlistId, trackUri });
        if (options.spotifyAuthFailure) {
          throw new SpotifyClientError("Spotify authorization failed.", {
            code: "spotify_auth_error",
            statusCode: 401,
          });
        }
        return { snapshot_id: "snapshot_id" };
      },
      getPlaylistItems: async (playlistId) => {
        calls.getPlaylistItems.push(playlistId);
        if (options.spotifyAuthFailure) {
          throw new SpotifyClientError("Spotify authorization failed.", {
            code: "spotify_auth_error",
            statusCode: 401,
          });
        }
        return options.playlistItems || [];
      },
      getCurrentUserProfile: async () => ({ id: "spotify_user_id" }),
    },
  };

  const app = require("../src/app");
  const server = await new Promise((resolve) => {
    const listeningServer = app.listen(0, () => resolve(listeningServer));
  });

  return {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    calls,
    close: () => new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    }),
  };
}

async function requestJson(server, path, { method = "GET", apiKey = API_KEY, body } = {}) {
  const headers = {};

  if (apiKey !== undefined) {
    headers["x-api-key"] = apiKey;
  }

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${server.baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  return {
    status: response.status,
    body: await response.json(),
  };
}

test("GET /health returns ok", async () => {
  const server = await startTestServer();

  try {
    const response = await requestJson(server, "/health");

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { ok: true });
  } finally {
    await server.close();
  }
});

test("POST /api/add-song rejects missing fields", async () => {
  const server = await startTestServer();

  try {
    const response = await requestJson(server, "/api/add-song", {
      method: "POST",
      body: { playlistName: "Test Playlist", songName: " " },
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.status, "invalid_request");
  } finally {
    await server.close();
  }
});

test("POST /api/add-song rejects wrong API key", async () => {
  const server = await startTestServer();

  try {
    const response = await requestJson(server, "/api/add-song", {
      method: "POST",
      apiKey: "wrong",
      body: {
        playlistName: "Test Playlist",
        songName: "Blinding Lights",
        artistName: "The Weeknd",
      },
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.status, "unauthorized");
  } finally {
    await server.close();
  }
});

test("POST /api/add-song creates a new playlist and adds a song", async () => {
  const server = await startTestServer();

  try {
    const response = await requestJson(server, "/api/add-song", {
      method: "POST",
      body: {
        playlistName: " June   Week 3 ",
        songName: "Blinding Lights",
        artistName: "The Weeknd",
      },
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.status, "added");
    assert.equal(response.body.playlistName, "June Week 3");
    assert.equal(response.body.playlistId, "new_playlist_id");
    assert.deepEqual(server.calls.createPrivatePlaylist, ["June Week 3"]);
    assert.equal(server.calls.insertPlaylist.length, 1);
    assert.equal(server.calls.addTrackToPlaylist.length, 1);
  } finally {
    await server.close();
  }
});

test("POST /api/add-song reuses an existing playlist", async () => {
  const server = await startTestServer({
    playlists: [{
      playlist_key: "june week 3",
      playlist_name: "June Week 3",
      spotify_playlist_id: "existing_playlist_id",
    }],
  });

  try {
    const response = await requestJson(server, "/api/add-song", {
      method: "POST",
      body: {
        playlistName: "June Week 3",
        songName: "Blinding Lights",
        artistName: "The Weeknd",
      },
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.status, "added");
    assert.equal(response.body.playlistId, "existing_playlist_id");
    assert.equal(server.calls.createPrivatePlaylist.length, 0);
    assert.equal(server.calls.addTrackToPlaylist[0].playlistId, "existing_playlist_id");
  } finally {
    await server.close();
  }
});

test("POST /api/add-song skips a duplicate song", async () => {
  const server = await startTestServer({
    playlists: [{
      playlist_key: "june week 3",
      playlist_name: "June Week 3",
      spotify_playlist_id: "existing_playlist_id",
    }],
    tracks: [{
      spotify_playlist_id: "existing_playlist_id",
      spotify_track_uri: "spotify:track:track_1",
      track_name: "Blinding Lights",
      artist_name: "The Weeknd",
    }],
  });

  try {
    const response = await requestJson(server, "/api/add-song", {
      method: "POST",
      body: {
        playlistName: "June Week 3",
        songName: "Blinding Lights",
        artistName: "The Weeknd",
      },
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.status, "skipped_duplicate");
    assert.equal(server.calls.addTrackToPlaylist.length, 0);
    assert.equal(server.calls.getPlaylistItems.length, 0);
    assert.equal(server.calls.insertPlaylistTrack.length, 0);
  } finally {
    await server.close();
  }
});

test("POST /api/add-song skips and backfills when Spotify already contains a track missing from Supabase", async () => {
  const server = await startTestServer({
    playlists: [{
      playlist_key: "june week 3",
      playlist_name: "June Week 3",
      spotify_playlist_id: "existing_playlist_id",
    }],
    playlistItems: [{
      track: makeTrack({ id: "track_1" }),
    }],
  });

  try {
    const response = await requestJson(server, "/api/add-song", {
      method: "POST",
      body: {
        playlistName: "June Week 3",
        songName: "Blinding Lights",
        artistName: "The Weeknd",
      },
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.status, "skipped_duplicate");
    assert.equal(server.calls.getPlaylistItems.length, 1);
    assert.equal(server.calls.addTrackToPlaylist.length, 0);
    assert.equal(server.calls.insertPlaylistTrack.length, 1);
  } finally {
    await server.close();
  }
});

test("POST /api/add-song returns song_not_found for unknown songs", async () => {
  const server = await startTestServer({
    searchResults: [makeTrack({ id: "wrong_track", name: "Save Your Tears" })],
  });

  try {
    const response = await requestJson(server, "/api/add-song", {
      method: "POST",
      body: {
        playlistName: "June Week 3",
        songName: "Unknown Song",
        artistName: "Unknown Artist",
      },
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.status, "song_not_found");
    assert.equal(server.calls.addTrackToPlaylist.length, 0);
  } finally {
    await server.close();
  }
});

test("POST /api/add-song trusts the first exact title and artist match", async () => {
  const server = await startTestServer({
    searchResults: [
      makeTrack({ id: "track_1", name: "Intro", artists: ["Artist Name"] }),
      makeTrack({ id: "track_2", name: "Intro", artists: ["Artist Name"] }),
    ],
  });

  try {
    const response = await requestJson(server, "/api/add-song", {
      method: "POST",
      body: {
        playlistName: "June Week 3",
        songName: "Intro",
        artistName: "Artist Name",
      },
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.status, "added");
    assert.equal(response.body.trackUri, "spotify:track:track_1");
    assert.equal(server.calls.addTrackToPlaylist.length, 1);
  } finally {
    await server.close();
  }
});

test("POST /api/add-song trusts the first later exact match when the top result is not exact", async () => {
  const server = await startTestServer({
    searchResults: [
      makeTrack({ id: "wrong_track", name: "Intro Remix", artists: ["Artist Name"] }),
      makeTrack({ id: "track_1", name: "Intro", artists: ["Artist Name"] }),
      makeTrack({ id: "track_2", name: "Intro", artists: ["Artist Name"] }),
    ],
  });

  try {
    const response = await requestJson(server, "/api/add-song", {
      method: "POST",
      body: {
        playlistName: "June Week 3",
        songName: "Intro",
        artistName: "Artist Name",
      },
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.status, "added");
    assert.equal(response.body.trackUri, "spotify:track:track_1");
    assert.equal(server.calls.addTrackToPlaylist.length, 1);
  } finally {
    await server.close();
  }
});

test("POST /api/add-song returns spotify_auth_error when Spotify auth fails", async () => {
  const server = await startTestServer({ spotifyAuthFailure: true });

  try {
    const response = await requestJson(server, "/api/add-song", {
      method: "POST",
      body: {
        playlistName: "June Week 3",
        songName: "Blinding Lights",
        artistName: "The Weeknd",
      },
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.status, "spotify_auth_error");
  } finally {
    await server.close();
  }
});

test("POST /api/add-song returns database_error when Supabase fails", async () => {
  const server = await startTestServer({ databaseFailure: true });

  try {
    const response = await requestJson(server, "/api/add-song", {
      method: "POST",
      body: {
        playlistName: "June Week 3",
        songName: "Blinding Lights",
        artistName: "The Weeknd",
      },
    });

    assert.equal(response.status, 500);
    assert.equal(response.body.status, "database_error");
  } finally {
    await server.close();
  }
});
