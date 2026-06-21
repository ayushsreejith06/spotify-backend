const assert = require("node:assert/strict");
const test = require("node:test");

function clearSpotifyModules() {
  [
    "../src/config",
    "../src/services/spotifyClient",
  ].forEach((modulePath) => {
    delete require.cache[require.resolve(modulePath)];
  });
}

test("Spotify invalid_grant token response is classified as spotify_auth_error", async () => {
  process.env.SPOTIFY_CLIENT_ID = "test_client_id";
  process.env.SPOTIFY_CLIENT_SECRET = "test_client_secret";
  process.env.SPOTIFY_REFRESH_TOKEN = "invalid_refresh_token";
  clearSpotifyModules();

  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: false,
    status: 400,
    headers: {
      get: () => null,
    },
    text: async () => JSON.stringify({
      error: "invalid_grant",
      error_description: "Invalid refresh token",
    }),
  });

  try {
    const { SpotifyClientError, searchTrack } = require("../src/services/spotifyClient");

    await assert.rejects(
      () => searchTrack("As It Was", "Harry Styles"),
      (error) => {
        assert.ok(error instanceof SpotifyClientError);
        assert.equal(error.code, "spotify_auth_error");
        assert.equal(error.statusCode, 400);
        return true;
      },
    );
  } finally {
    global.fetch = originalFetch;
    clearSpotifyModules();
  }
});
