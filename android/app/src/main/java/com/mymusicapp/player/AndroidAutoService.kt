package com.mymusicapp.player

import android.content.ComponentName
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.ServiceConnection
import android.content.ContentUris
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.MediaStore
import android.support.v4.media.MediaBrowserCompat
import android.support.v4.media.MediaDescriptionCompat
import android.support.v4.media.RatingCompat
import android.support.v4.media.session.MediaSessionCompat
import androidx.media.MediaBrowserServiceCompat
import com.doublesymmetry.trackplayer.model.Track
import com.doublesymmetry.trackplayer.service.MusicService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/** Browsable local library backed by the same TrackPlayer media session and queue. */
class AndroidAutoService : MediaBrowserServiceCompat() {
  private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
  private val mainHandler = Handler(Looper.getMainLooper())
  @Volatile private var cachedTracks: List<Track> = emptyList()
  @Volatile private var cachedCatalog: List<MediaCatalogEntry> = emptyList()
  @Volatile private var cacheReady = false
  @Volatile private var cachedPlaylists: Map<String, List<String>> = emptyMap()
  @Volatile private var cachedPlaylistNames: Map<String, String> = emptyMap()
  @Volatile private var cachedFavorites: Set<String> = emptySet()
  private var playerService: MusicService? = null
  private var tokenInstalled = false
  private var bound = false
  private val playerReadyReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
      playerService?.let { tryInstallSession(it, 0) }
    }
  }

  private val playerConnection = object : ServiceConnection {
    override fun onServiceConnected(name: ComponentName?, binder: IBinder?) {
      val local = (binder as? MusicService.MusicBinder)?.service ?: return
      playerService = local
      try {
        if (!local.playerInitialized) {
          local.setupPlayer(Bundle().apply { putBoolean("autoHandleInterruptions", true) })
        }
        tryInstallSession(local, 20)
      } catch (_: Exception) {
        tryInstallSession(local, 20)
      }
    }

    override fun onServiceDisconnected(name: ComponentName?) {
      playerService = null
      tokenInstalled = false
    }
  }

  override fun onCreate() {
    super.onCreate()
    val readyFilter = IntentFilter(ACTION_PLAYER_READY)
    if (android.os.Build.VERSION.SDK_INT >= 33) {
      registerReceiver(playerReadyReceiver, readyFilter, Context.RECEIVER_NOT_EXPORTED)
    } else {
      @Suppress("DEPRECATION")
      registerReceiver(playerReadyReceiver, readyFilter)
    }
    bound = bindService(
      Intent(this, MusicService::class.java),
      playerConnection,
      Context.BIND_AUTO_CREATE,
    )
    scope.launch(Dispatchers.IO) {
      try {
        refreshCache()
      } catch (_: Exception) {
      } finally {
        cacheReady = true
        withContext(Dispatchers.Main.immediate) {
          playerService?.let { tryInstallSession(it, 20) }
        }
      }
    }
  }

  override fun onDestroy() {
    scope.cancel()
    unregisterReceiver(playerReadyReceiver)
    if (bound) unbindService(playerConnection)
    super.onDestroy()
  }

  override fun onGetRoot(
    clientPackageName: String,
    clientUid: Int,
    rootHints: Bundle?,
  ): BrowserRoot? {
    if (packageManager.getPackagesForUid(clientUid)?.contains(clientPackageName) != true) {
      return null
    }
    return BrowserRoot(ROOT_ID, null)
  }

  override fun onLoadChildren(
    parentId: String,
    result: Result<MutableList<MediaBrowserCompat.MediaItem>>,
  ) {
    result.detach()
    scope.launch {
      val children = try {
        withContext(Dispatchers.IO) {
          refreshCache()
          browse(parentId)
        }
      } catch (_: Exception) {
        emptyList()
      }
      result.sendResult(children.toMutableList())
    }
  }

  override fun onLoadItem(
    itemId: String,
    result: Result<MediaBrowserCompat.MediaItem>,
  ) {
    result.detach()
    scope.launch {
      val item = try {
        withContext(Dispatchers.IO) {
          refreshCache()
          cachedTracks.firstOrNull { trackId(it) == itemId }?.toMediaItem()
        }
      } catch (_: Exception) {
        null
      }
      result.sendResult(item)
    }
  }

  override fun onSearch(
    query: String,
    extras: Bundle?,
    result: Result<MutableList<MediaBrowserCompat.MediaItem>>,
  ) {
    result.detach()
    scope.launch {
      val matches = try {
        withContext(Dispatchers.IO) {
          refreshCache()
          val tracksById = cachedTracks.associateBy(::trackId)
          searchMediaCatalog(cachedCatalog, query, MAX_SEARCH_RESULTS)
            .mapNotNull(tracksById::get)
            .map { it.toMediaItem() }
        }
      } catch (_: Exception) {
        emptyList()
      }
      result.sendResult(matches.toMutableList())
    }
  }

  private fun tryInstallSession(service: MusicService, retriesLeft: Int) {
    val session = service.externalMediaSession
    if (service.playerInitialized && session != null && cacheReady && !tokenInstalled) {
      service.setAndroidAutoResolver(::resolvePlaybackRequest)
      setSessionToken(session.sessionToken)
      tokenInstalled = true
    } else if (retriesLeft > 0) {
      mainHandler.postDelayed({ tryInstallSession(service, retriesLeft - 1) }, 500)
    }
  }

  private fun resolvePlaybackRequest(mediaId: String?, query: String?): List<Track>? {
    if (!query.isNullOrBlank()) {
      val tracksById = cachedTracks.associateBy(::trackId)
      return searchMediaCatalog(cachedCatalog, query, MAX_SEARCH_RESULTS)
        .mapNotNull(tracksById::get)
    }
    val id = mediaId ?: return null
    when {
      id.startsWith(PLAYLIST_PREFIX) -> {
        val playlistId = id.removePrefix(PLAYLIST_PREFIX)
        return tracksInPlaylist(playlistId)
      }
      id == FAVORITES_ID -> {
        return cachedTracks.filter { trackId(it) in cachedFavorites }
      }
      id.startsWith(ARTIST_PREFIX) -> {
        val artist = Uri.decode(id.removePrefix(ARTIST_PREFIX))
        return cachedTracks.filter { it.artist.equals(artist, ignoreCase = true) }
      }
      id.startsWith(ALBUM_PREFIX) -> {
        val albumId = id.removePrefix(ALBUM_PREFIX)
        return cachedTracks.filter { it.originalItem?.getString("albumId") == albumId }
      }
      else -> return cachedTracks.firstOrNull { trackId(it) == id }?.let(::listOf)
    }
  }

  private suspend fun refreshCache() {
    val tracks = readTracks()
    val dao = PlaylistDatabase.getInstance(this).playlistDao()
    val playlistEntities = dao.getPlaylists()
    val playlistTracks = dao.getPlaylistTracks().groupBy { it.playlistId }
      .mapValues { (_, rows) -> rows.sortedBy { it.position }.map { it.trackId } }
    cachedTracks = tracks
    cachedCatalog = tracks.map { track ->
      MediaCatalogEntry(trackId(track), track.title.orEmpty(), track.artist, track.album)
    }
    cachedPlaylists = playlistTracks
    cachedPlaylistNames = playlistEntities.associate { it.id to it.name }
    cachedFavorites = getSharedPreferences("music_library", Context.MODE_PRIVATE)
      .getStringSet("favorite_track_ids", emptySet()).orEmpty().toSet()
    cacheReady = true
  }

  private fun browse(parentId: String): List<MediaBrowserCompat.MediaItem> {
    val tracks = cachedTracks
    return when {
      parentId == ROOT_ID -> listOf(
        category(ARTISTS_ID, "Artistas"),
        category(ALBUMS_ID, "Álbumes"),
        category(PLAYLISTS_ID, "Listas"),
        category(FAVORITES_ID, "Favoritas"),
      )
      parentId == ARTISTS_ID -> tracks.mapNotNull { it.artist?.takeIf(String::isNotBlank) }
        .distinctBy { it.lowercase() }
        .sortedBy { it.lowercase() }
        .map { value -> category(ARTIST_PREFIX + Uri.encode(value), value) }
      parentId.startsWith(ARTIST_PREFIX) -> {
        val artist = Uri.decode(parentId.removePrefix(ARTIST_PREFIX))
        tracks.filter { it.artist.equals(artist, ignoreCase = true) }.map { it.toMediaItem() }
      }
      parentId == ALBUMS_ID -> tracks.groupBy { it.originalItem?.getString("albumId").orEmpty() }
        .values.mapNotNull { albumTracks -> albumTracks.firstOrNull() }
        .sortedWith(compareBy({ it.album.orEmpty().lowercase() }, { it.artist.orEmpty().lowercase() }))
        .map { track ->
          category(
            ALBUM_PREFIX + track.originalItem?.getString("albumId").orEmpty(),
            track.album ?: "Álbum desconocido",
            track.artist,
          )
        }
      parentId.startsWith(ALBUM_PREFIX) -> {
        val albumId = parentId.removePrefix(ALBUM_PREFIX)
        tracks.filter { it.originalItem?.getString("albumId") == albumId }.map { it.toMediaItem() }
      }
      parentId == PLAYLISTS_ID -> cachedPlaylistNames.entries
        .sortedBy { it.value.lowercase() }
        .map { (id, name) -> category(PLAYLIST_PREFIX + id, name) }
      parentId.startsWith(PLAYLIST_PREFIX) -> {
        tracksInPlaylist(parentId.removePrefix(PLAYLIST_PREFIX)).map { it.toMediaItem() }
      }
      parentId == FAVORITES_ID -> tracks.filter { trackId(it) in cachedFavorites }.map { it.toMediaItem() }
      else -> emptyList()
    }
  }

  private fun tracksInPlaylist(playlistId: String): List<Track> {
    val tracksById = cachedTracks.associateBy(::trackId)
    return orderedAvailableMediaIds(
      cachedPlaylists[playlistId].orEmpty(),
      tracksById.keys,
    ).mapNotNull(tracksById::get)
  }

  private fun category(id: String, title: String, subtitle: String? = null) =
    MediaBrowserCompat.MediaItem(
      MediaDescriptionCompat.Builder()
        .setMediaId(id)
        .setTitle(title)
        .setSubtitle(subtitle)
        .build(),
      MediaBrowserCompat.MediaItem.FLAG_BROWSABLE,
    )

  private fun Track.toMediaItem() = MediaBrowserCompat.MediaItem(
    MediaDescriptionCompat.Builder()
      .setMediaId(trackId(this))
      .setTitle(title ?: "Pista sin título")
      .setSubtitle(listOfNotNull(artist, album).joinToString(" · "))
      .setIconUri(artwork)
      .build(),
    MediaBrowserCompat.MediaItem.FLAG_PLAYABLE,
  )

  private fun trackId(track: Track): String = track.originalItem?.getString("id").orEmpty()

  private fun readTracks(): List<Track> {
    val permission = if (android.os.Build.VERSION.SDK_INT >= 33) {
      android.Manifest.permission.READ_MEDIA_AUDIO
    } else {
      android.Manifest.permission.READ_EXTERNAL_STORAGE
    }
    if (checkSelfPermission(permission) != PackageManager.PERMISSION_GRANTED) return emptyList()

    val projection = arrayOf(
      MediaStore.Audio.Media._ID,
      MediaStore.Audio.Media.TITLE,
      MediaStore.Audio.Media.ARTIST,
      MediaStore.Audio.Media.ALBUM,
      MediaStore.Audio.Media.DURATION,
      MediaStore.Audio.Media.ALBUM_ID,
    )
    val selection = buildString {
      append("${MediaStore.Audio.Media.IS_MUSIC} != 0")
      if (android.os.Build.VERSION.SDK_INT >= 31) {
        append(" AND ${MediaStore.Audio.Media.IS_RECORDING} = 0")
      }
    }
    val rows = mutableListOf<Track>()
    val cursor = contentResolver.query(
      MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
      projection,
      selection,
      null,
      "${MediaStore.Audio.Media.TITLE} COLLATE NOCASE ASC",
    ) ?: return rows
    cursor.use {
      val idColumn = it.getColumnIndexOrThrow(MediaStore.Audio.Media._ID)
      val titleColumn = it.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE)
      val artistColumn = it.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST)
      val albumColumn = it.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM)
      val durationColumn = it.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION)
      val albumIdColumn = it.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM_ID)
      while (it.moveToNext()) {
        val id = it.getLong(idColumn)
        val albumId = it.getLong(albumIdColumn)
        val uri = ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, id)
        val bundle = Bundle().apply {
          putString("id", id.toString())
          putString("url", uri.toString())
          putString("title", it.getString(titleColumn)?.takeIf(String::isNotBlank) ?: "Pista sin título")
          putString("artist", it.getString(artistColumn)?.takeIf(String::isNotBlank) ?: "Artista desconocido")
          putString("album", it.getString(albumColumn)?.takeIf(String::isNotBlank) ?: "Álbum desconocido")
          putString("albumId", albumId.toString())
          putString("artwork", ContentUris.withAppendedId(MediaStore.Audio.Albums.EXTERNAL_CONTENT_URI, albumId).toString())
          putDouble("duration", it.getLong(durationColumn).coerceAtLeast(0) / 1000.0)
        }
        rows.add(Track(this, bundle, RatingCompat.RATING_NONE))
      }
    }
    return rows
  }

  companion object {
    private const val ROOT_ID = "root"
    private const val ARTISTS_ID = "artists"
    private const val ALBUMS_ID = "albums"
    private const val PLAYLISTS_ID = "playlists"
    private const val FAVORITES_ID = "favorites"
    private const val ARTIST_PREFIX = "artist:"
    private const val ALBUM_PREFIX = "album:"
    private const val PLAYLIST_PREFIX = "playlist:"
    private const val MAX_SEARCH_RESULTS = 100
    private const val ACTION_PLAYER_READY = "com.mymusicapp.player.TRACK_PLAYER_READY"
  }
}
