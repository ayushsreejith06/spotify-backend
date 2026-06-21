const { getSupabaseClient } = require("./supabase");

function isUniqueConstraintError(error) {
  return error && error.code === "23505";
}

function throwDatabaseError(error) {
  const wrappedError = new Error(error.message || "Database operation failed.");
  wrappedError.code = "database_error";
  wrappedError.cause = error;
  throw wrappedError;
}

async function getPlaylistByKey(playlistKey) {
  const { data, error } = await getSupabaseClient()
    .from("playlists")
    .select("*")
    .eq("playlist_key", playlistKey)
    .maybeSingle();

  if (error) {
    throwDatabaseError(error);
  }

  return data;
}

async function insertPlaylist({ playlistKey, playlistName, spotifyPlaylistId }) {
  const row = {
    playlist_key: playlistKey,
    playlist_name: playlistName,
    spotify_playlist_id: spotifyPlaylistId,
  };

  const { data, error } = await getSupabaseClient()
    .from("playlists")
    .insert(row)
    .select("*")
    .single();

  if (!error) {
    return data;
  }

  if (isUniqueConstraintError(error)) {
    const existingPlaylist = await getPlaylistByKey(playlistKey);

    if (existingPlaylist) {
      return existingPlaylist;
    }
  }

  throwDatabaseError(error);
}

async function getPlaylistTrack(spotifyPlaylistId, spotifyTrackUri) {
  const { data, error } = await getSupabaseClient()
    .from("playlist_tracks")
    .select("*")
    .eq("spotify_playlist_id", spotifyPlaylistId)
    .eq("spotify_track_uri", spotifyTrackUri)
    .maybeSingle();

  if (error) {
    throwDatabaseError(error);
  }

  return data;
}

async function insertPlaylistTrack({ spotifyPlaylistId, spotifyTrackUri, trackName, artistName }) {
  const row = {
    spotify_playlist_id: spotifyPlaylistId,
    spotify_track_uri: spotifyTrackUri,
    track_name: trackName,
    artist_name: artistName,
  };

  const { data, error } = await getSupabaseClient()
    .from("playlist_tracks")
    .insert(row)
    .select("*")
    .single();

  if (!error) {
    return data;
  }

  if (isUniqueConstraintError(error)) {
    return getPlaylistTrack(spotifyPlaylistId, spotifyTrackUri);
  }

  throwDatabaseError(error);
}

module.exports = {
  getPlaylistByKey,
  insertPlaylist,
  getPlaylistTrack,
  insertPlaylistTrack,
};
