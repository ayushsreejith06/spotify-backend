const crypto = require("crypto");
const express = require("express");
const config = require("../config");

const router = express.Router();

const SPOTIFY_AUTHORIZE_URL = "https://accounts.spotify.com/authorize";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_ME_URL = "https://api.spotify.com/v1/me";
const SPOTIFY_SCOPES = [
  "playlist-modify-private",
  "playlist-read-private",
  "user-read-private",
].join(" ");
const STATE_COOKIE_NAME = "spotify_oauth_state";

function assertSpotifyOAuthConfig() {
  const missing = [];

  if (!config.spotifyClientId) missing.push("SPOTIFY_CLIENT_ID");
  if (!config.spotifyClientSecret) missing.push("SPOTIFY_CLIENT_SECRET");
  if (!config.spotifyRedirectUri) missing.push("SPOTIFY_REDIRECT_URI");

  if (missing.length > 0) {
    const error = new Error(`Missing Spotify OAuth environment variables: ${missing.join(", ")}.`);
    error.statusCode = 500;
    error.code = "spotify_auth_config_error";
    throw error;
  }
}

function createBasicAuthHeader() {
  const credentials = `${config.spotifyClientId}:${config.spotifyClientSecret}`;
  return `Basic ${Buffer.from(credentials).toString("base64")}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getCookie(req, name) {
  const cookies = req.headers.cookie ? req.headers.cookie.split(";") : [];
  const prefix = `${name}=`;

  for (const cookie of cookies) {
    const trimmedCookie = cookie.trim();

    if (trimmedCookie.startsWith(prefix)) {
      return decodeURIComponent(trimmedCookie.slice(prefix.length));
    }
  }

  return undefined;
}

function assertValidState(req) {
  const queryState = req.query.state;
  const cookieState = getCookie(req, STATE_COOKIE_NAME);

  if (!queryState || !cookieState || queryState !== cookieState) {
    const error = new Error("Invalid Spotify OAuth state. Start again from /auth/login.");
    error.statusCode = 400;
    error.code = "spotify_auth_error";
    throw error;
  }
}

async function parseSpotifyResponse(response, fallbackMessage) {
  const responseText = await response.text();

  try {
    return JSON.parse(responseText);
  } catch (error) {
    const wrappedError = new Error(responseText || fallbackMessage);
    wrappedError.statusCode = response.status;
    wrappedError.code = "spotify_auth_error";
    wrappedError.cause = error;
    throw wrappedError;
  }
}

async function exchangeAuthorizationCode(code) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: config.spotifyRedirectUri,
  });

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: createBasicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const tokenData = await parseSpotifyResponse(response, "Spotify token exchange failed.");

  if (!response.ok) {
    const error = new Error(tokenData.error_description || tokenData.error || "Spotify token exchange failed.");
    error.statusCode = response.status;
    error.code = "spotify_auth_error";
    throw error;
  }

  return tokenData;
}

async function fetchCurrentSpotifyUser(accessToken) {
  const response = await fetch(SPOTIFY_ME_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const userData = await parseSpotifyResponse(response, "Spotify current-user profile request failed.");

  if (!response.ok) {
    const error = new Error(userData.error?.message || "Spotify current-user profile request failed.");
    error.statusCode = response.status;
    error.code = "spotify_auth_error";
    throw error;
  }

  return userData;
}

function logDevelopmentTokens(tokenData, userData) {
  if (config.nodeEnv !== "development") {
    return;
  }

  console.log("");
  console.log("=== Spotify OAuth setup complete ===");
  console.log(`SPOTIFY_REFRESH_TOKEN=${tokenData.refresh_token || "(not returned by Spotify)"}`);
  console.log(`SPOTIFY_USER_ID=${userData.id}`);
  console.log("Copy these values into .env, then restart the server.");
  console.log("====================================");
  console.log("");
}

function renderDevelopmentSuccess(tokenData, userData) {
  const refreshToken = tokenData.refresh_token || "(not returned by Spotify)";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Spotify OAuth Complete</title>
    <style>
      body { font-family: system-ui, sans-serif; max-width: 760px; margin: 40px auto; line-height: 1.5; }
      pre { background: #f4f4f4; padding: 16px; overflow-wrap: anywhere; white-space: pre-wrap; }
    </style>
  </head>
  <body>
    <h1>Spotify OAuth Complete</h1>
    <p>Copy these values into your local <code>.env</code> file, then restart the server.</p>
    <pre>SPOTIFY_REFRESH_TOKEN=${escapeHtml(refreshToken)}
SPOTIFY_USER_ID=${escapeHtml(userData.id)}</pre>
  </body>
</html>`;
}

router.get("/login", (req, res, next) => {
  try {
    assertSpotifyOAuthConfig();
    const state = crypto.randomBytes(16).toString("hex");

    const params = new URLSearchParams({
      response_type: "code",
      client_id: config.spotifyClientId,
      scope: SPOTIFY_SCOPES,
      redirect_uri: config.spotifyRedirectUri,
      state,
    });

    res.cookie(STATE_COOKIE_NAME, state, {
      httpOnly: true,
      maxAge: 10 * 60 * 1000,
      sameSite: "lax",
      secure: config.nodeEnv === "production",
    });

    res.redirect(`${SPOTIFY_AUTHORIZE_URL}?${params.toString()}`);
  } catch (error) {
    next(error);
  }
});

router.get("/callback", async (req, res, next) => {
  try {
    assertSpotifyOAuthConfig();

    if (req.query.error) {
      const error = new Error(`Spotify authorization failed: ${req.query.error}`);
      error.statusCode = 400;
      error.code = "spotify_auth_error";
      throw error;
    }

    if (!req.query.code) {
      const error = new Error("Missing Spotify authorization code.");
      error.statusCode = 400;
      error.code = "spotify_auth_error";
      throw error;
    }

    assertValidState(req);
    res.clearCookie(STATE_COOKIE_NAME);

    const tokenData = await exchangeAuthorizationCode(req.query.code);
    const userData = await fetchCurrentSpotifyUser(tokenData.access_token);

    logDevelopmentTokens(tokenData, userData);

    if (config.nodeEnv === "development") {
      res.type("html").send(renderDevelopmentSuccess(tokenData, userData));
      return;
    }

    res.json({
      ok: true,
      status: "spotify_oauth_complete",
      message: "Spotify OAuth complete. Store the refresh token securely from server logs or run this flow locally in development.",
      spotifyUserId: userData.id,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
