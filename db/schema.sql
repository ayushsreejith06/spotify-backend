create table playlists (
  id bigserial primary key,
  playlist_key text not null unique,
  playlist_name text not null,
  spotify_playlist_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table playlist_tracks (
  id bigserial primary key,
  spotify_playlist_id text not null,
  spotify_track_uri text not null,
  track_name text not null,
  artist_name text not null,
  added_at timestamptz not null default now(),
  unique (spotify_playlist_id, spotify_track_uri)
);
