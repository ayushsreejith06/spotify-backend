const { normalizeText } = require("../utils/normalize");

const MATCH_STATUS = {
  CONFIDENT: "confident_match",
  NO_MATCH: "no_match",
};

function getTrackArtists(track) {
  if (!Array.isArray(track?.artists)) {
    return [];
  }

  return track.artists
    .map((artist) => artist?.name)
    .filter((name) => typeof name === "string" && name.trim().length > 0);
}

function isExactSongMatch(requestedSongName, track) {
  return normalizeText(track?.name) === normalizeText(requestedSongName);
}

function isExactArtistMatch(requestedArtistName, track) {
  const normalizedRequestedArtist = normalizeText(requestedArtistName);

  return getTrackArtists(track).some((artistName) => (
    normalizeText(artistName) === normalizedRequestedArtist
  ));
}

function isConfidentTrackMatch(requestedSongName, requestedArtistName, track) {
  return (
    isExactSongMatch(requestedSongName, track) &&
    isExactArtistMatch(requestedArtistName, track)
  );
}

function findBestTrackMatch(requestedSongName, requestedArtistName, spotifySearchResults) {
  const tracks = Array.isArray(spotifySearchResults) ? spotifySearchResults : [];
  const confidentMatches = tracks.filter((track) => (
    isConfidentTrackMatch(requestedSongName, requestedArtistName, track)
  ));

  if (confidentMatches.length >= 1) {
    return {
      status: MATCH_STATUS.CONFIDENT,
      track: confidentMatches[0],
    };
  }

  return {
    status: MATCH_STATUS.NO_MATCH,
  };
}

module.exports = {
  MATCH_STATUS,
  findBestTrackMatch,
};
