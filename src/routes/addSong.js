const express = require("express");
const { getPlaylistByKey, insertPlaylist, getPlaylistTrack, insertPlaylistTrack } = require("../db/playlistStore");
const { findBestTrackMatch, MATCH_STATUS } = require("../services/matchService");
const {
  SpotifyClientError,
  createPrivatePlaylist,
  searchTrack,
  addTrackToPlaylist,
  getPlaylistItems,
} = require("../services/spotifyClient");

const router = express.Router();
const WHITESPACE_REGEX = /\s+/g;

function cleanRequiredText(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(WHITESPACE_REGEX, " ");
}

function getPlaylistKey(playlistName) {
  return playlistName.toLowerCase();
}

function validateRequestBody(body) {
  const playlistName = cleanRequiredText(body?.playlistName);
  const songName = cleanRequiredText(body?.songName);
  const artistName = cleanRequiredText(body?.artistName);

  if (!playlistName || !songName || !artistName) {
    return {
      valid: false,
      response: {
        ok: false,
        status: "invalid_request",
        message: "playlistName, songName, and artistName are required.",
      },
    };
  }

  return {
    valid: true,
    values: {
      playlistName,
      playlistKey: getPlaylistKey(playlistName),
      songName,
      artistName,
    },
  };
}

function getTrackArtists(track) {
  if (!Array.isArray(track?.artists)) {
    return [];
  }

  return track.artists
    .map((artist) => artist?.name)
    .filter((artistName) => typeof artistName === "string" && artistName.trim().length > 0);
}

function buildTrackResponseFields(track, fallbackArtistName) {
  const artists = getTrackArtists(track);

  return {
    trackName: track?.name || "",
    artistName: artists.length > 0 ? artists.join(", ") : fallbackArtistName,
    trackUri: track?.uri || "",
  };
}

async function getOrCreatePlaylist(playlistName, playlistKey) {
  const existingPlaylist = await getPlaylistByKey(playlistKey);

  if (existingPlaylist) {
    return existingPlaylist;
  }

  const spotifyPlaylist = await createPrivatePlaylist(playlistName);

  return insertPlaylist({
    playlistKey,
    playlistName,
    spotifyPlaylistId: spotifyPlaylist.id,
  });
}

function sendSongNotFound(res, { playlistName, songName, artistName }) {
  res.status(200).json({
    ok: false,
    status: "song_not_found",
    playlistName,
    songName,
    artistName,
    message: "No confident Spotify match found. Add manually.",
  });
}

function sendDuplicateSkipped(res, playlist, playlistName, track, fallbackArtistName) {
  res.status(200).json({
    ok: true,
    status: "skipped_duplicate",
    playlistName,
    playlistId: playlist.spotify_playlist_id,
    ...buildTrackResponseFields(track, fallbackArtistName),
    message: "Song already exists in playlist.",
  });
}

function sendAdded(res, playlist, playlistName, track, fallbackArtistName) {
  res.status(200).json({
    ok: true,
    status: "added",
    playlistName,
    playlistId: playlist.spotify_playlist_id,
    ...buildTrackResponseFields(track, fallbackArtistName),
    message: "Song added to playlist.",
  });
}

function getPlaylistItemTrackUri(item) {
  if (typeof item?.track?.uri === "string") {
    return item.track.uri;
  }

  if (typeof item?.uri === "string") {
    return item.uri;
  }

  return "";
}

async function playlistAlreadyContainsTrack(spotifyPlaylistId, trackUri) {
  const items = await getPlaylistItems(spotifyPlaylistId);

  return items.some((item) => getPlaylistItemTrackUri(item) === trackUri);
}

function handleRouteError(error, next) {
  if (error instanceof SpotifyClientError) {
    error.statusCode = error.statusCode || 500;
    next(error);
    return;
  }

  if (error.code === "database_error") {
    error.statusCode = 500;
    next(error);
    return;
  }

  next(error);
}

router.post("/", async (req, res, next) => {
  const validation = validateRequestBody(req.body);

  if (!validation.valid) {
    res.status(400).json(validation.response);
    return;
  }

  const { playlistName, playlistKey, songName, artistName } = validation.values;

  try {
    const playlist = await getOrCreatePlaylist(playlistName, playlistKey);
    const spotifySearchResults = await searchTrack(songName, artistName);
    const match = findBestTrackMatch(songName, artistName, spotifySearchResults);

    if (match.status === MATCH_STATUS.NO_MATCH) {
      sendSongNotFound(res, { playlistName, songName, artistName });
      return;
    }

    const track = match.track;
    const duplicateTrack = await getPlaylistTrack(playlist.spotify_playlist_id, track.uri);

    if (duplicateTrack) {
      sendDuplicateSkipped(res, playlist, playlistName, track, artistName);
      return;
    }

    const existingSpotifyTrack = await playlistAlreadyContainsTrack(playlist.spotify_playlist_id, track.uri);

    if (existingSpotifyTrack) {
      await insertPlaylistTrack({
        spotifyPlaylistId: playlist.spotify_playlist_id,
        spotifyTrackUri: track.uri,
        trackName: track.name,
        artistName: buildTrackResponseFields(track, artistName).artistName,
      });
      sendDuplicateSkipped(res, playlist, playlistName, track, artistName);
      return;
    }

    await addTrackToPlaylist(playlist.spotify_playlist_id, track.uri);
    await insertPlaylistTrack({
      spotifyPlaylistId: playlist.spotify_playlist_id,
      spotifyTrackUri: track.uri,
      trackName: track.name,
      artistName: buildTrackResponseFields(track, artistName).artistName,
    });

    sendAdded(res, playlist, playlistName, track, artistName);
  } catch (error) {
    handleRouteError(error, next);
  }
});

module.exports = router;
