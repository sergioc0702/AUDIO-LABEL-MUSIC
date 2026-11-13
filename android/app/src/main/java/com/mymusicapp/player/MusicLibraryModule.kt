package com.mymusicapp.player

import android.Manifest
import android.app.Activity
import android.app.RecoverableSecurityException
import android.content.BroadcastReceiver
import android.content.ContentUris
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.IntentSender
import android.database.ContentObserver
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.media.AudioManager
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.MediaStore
import android.util.Log
import androidx.core.content.ContextCompat
import androidx.room.withTransaction
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.doublesymmetry.kotlinaudio.audio.EQUALIZER_BAND_COUNT
import com.doublesymmetry.kotlinaudio.audio.EQUALIZER_MAX_GAIN_DB
import com.doublesymmetry.kotlinaudio.audio.EQUALIZER_MIN_GAIN_DB
import com.doublesymmetry.kotlinaudio.audio.SoftwareEqualizer
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.util.UUID
import org.json.JSONObject
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

class MusicLibraryModule(
  private val context: ReactApplicationContext,
) : ReactContextBaseJavaModule(context) {
  private val playlistScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
  private val playlistDatabase = PlaylistDatabase.getInstance(context)
  private val observerHandler = Handler(Looper.getMainLooper())
  private var observerRefresh: Runnable? = null
  private val audioObserver = object : ContentObserver(observerHandler) {
    override fun onChange(selfChange: Boolean, uri: Uri?) {
      observerRefresh?.let(observerHandler::removeCallbacks)
      observerRefresh = Runnable {
        if (context.hasActiveReactInstance()) {
          context.emitDeviceEvent("musicLibraryChanged")
        }
      }.also { observerHandler.postDelayed(it, LIBRARY_CHANGE_DEBOUNCE_MS) }
    }
  }
  private val activityEventListener = object : BaseActivityEventListener() {
    override fun onActivityResult(
      activity: Activity,
      requestCode: Int,
      resultCode: Int,
      data: Intent?,
    ) {
      if (requestCode == BACKUP_EXPORT_REQUEST_CODE || requestCode == BACKUP_IMPORT_REQUEST_CODE) {
        finishBackupRequest(requestCode, resultCode, data?.data)
        return
      }
      if (requestCode in PLAYLIST_EXPORT_REQUEST_CODE..LYRICS_IMPORT_REQUEST_CODE) {
        finishDocumentRequest(resultCode, data?.data)
        return
      }
      if (requestCode != DELETE_REQUEST_CODE) {
        return
      }

      val deletion = pendingDeletion ?: return
      pendingDeletion = null
      if (resultCode != Activity.RESULT_OK) {
        deletion.promise.resolve(false)
        return
      }

      if (deletion.retryAfterConsent) {
        playlistScope.launch {
          try {
            val deletedRows = context.contentResolver.delete(deletion.uri, null, null)
            if (deletedRows == 0) {
              deletion.promise.reject(
                "E_DELETE_NOT_FOUND",
                "La canción ya no está disponible en el dispositivo.",
              )
            } else {
              finishTrackDeletion(deletion)
            }
          } catch (error: Exception) {
            deletion.promise.reject(
              "E_TRACK_DELETE",
              "No se pudo eliminar la canción del dispositivo.",
              error,
            )
          }
        }
      } else {
        finishTrackDeletion(deletion)
      }
    }
  }
  @Volatile
  private var pendingDeletion: PendingDeletion? = null
  @Volatile
  private var pendingBackup: PendingBackup? = null
  @Volatile
  private var pendingDocument: PendingDocument? = null

  init {
    val preferences = context.getSharedPreferences("music_library", Context.MODE_PRIVATE)
    SoftwareEqualizer.update(
      preferences.getBoolean("equalizer_enabled", false),
      List(EQUALIZER_BAND_COUNT) { index ->
        preferences.getFloat("equalizer_gain_$index", 0f)
      },
    )
    context.contentResolver.registerContentObserver(
      MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
      true,
      audioObserver,
    )
    context.addActivityEventListener(activityEventListener)
  }

  override fun getName(): String = "MusicLibrary"

  private val audioManager by lazy {
    context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
  }
  private var volumeReceiver: BroadcastReceiver? = null

  /** Media volume from 0 to 1, read from the system every time. */
  private fun mediaVolume(): WritableMap {
    val max = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
    val min = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      audioManager.getStreamMinVolume(AudioManager.STREAM_MUSIC)
    } else {
      0
    }
    val now = audioManager.getStreamVolume(AudioManager.STREAM_MUSIC)
    return Arguments.createMap().apply {
      putDouble("level", if (max > min) (now - min).toDouble() / (max - min) else 0.0)
      putBoolean("fixed", audioManager.isVolumeFixed)
    }
  }

  @ReactMethod
  fun getMediaVolume(promise: Promise) {
    try {
      promise.resolve(mediaVolume())
    } catch (error: RuntimeException) {
      promise.reject("E_VOLUME", "No se pudo leer el volumen.", error)
    }
  }

  @ReactMethod
  fun setMediaVolume(level: Double, promise: Promise) {
    try {
      if (!audioManager.isVolumeFixed && level.isFinite()) {
        val max = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
        val min = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
          audioManager.getStreamMinVolume(AudioManager.STREAM_MUSIC)
        } else {
          0
        }
        val index = min + Math.round(level.coerceIn(0.0, 1.0) * (max - min)).toInt()
        audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, index, 0)
      }
      promise.resolve(mediaVolume())
    } catch (error: RuntimeException) {
      promise.reject("E_VOLUME", "No se pudo cambiar el volumen.", error)
    }
  }

  /**
   * Android has no public listener for volume changes. This undocumented
   * broadcast only tells the app to read the volume again; JavaScript also
   * polls while the screen that needs it is open, in case it stops arriving.
   */
  @ReactMethod
  fun startVolumeUpdates() {
    if (volumeReceiver != null) {
      return
    }
    val receiver = object : BroadcastReceiver() {
      override fun onReceive(receiverContext: Context?, intent: Intent?) {
        if (context.hasActiveReactInstance()) {
          context.emitDeviceEvent("mediaVolumeChanged", mediaVolume())
        }
      }
    }
    ContextCompat.registerReceiver(
      context,
      receiver,
      IntentFilter("android.media.VOLUME_CHANGED_ACTION"),
      ContextCompat.RECEIVER_NOT_EXPORTED,
    )
    volumeReceiver = receiver
  }

  @ReactMethod
  fun stopVolumeUpdates() {
    volumeReceiver?.let { receiver ->
      try {
        context.unregisterReceiver(receiver)
      } catch (_: IllegalArgumentException) {
        // Already unregistered.
      }
    }
    volumeReceiver = null
  }

  override fun invalidate() {
    stopVolumeUpdates()
    context.contentResolver.unregisterContentObserver(audioObserver)
    observerRefresh?.let(observerHandler::removeCallbacks)
    context.removeActivityEventListener(activityEventListener)
    pendingDeletion?.promise?.reject(
      "E_TRACK_DELETE",
      "La eliminación se canceló porque la aplicación se reinició.",
    )
    pendingDeletion = null
    pendingBackup?.promise?.reject(
      "E_BACKUP",
      "La copia se canceló porque la aplicación se reinició.",
    )
    pendingBackup = null
    pendingDocument?.promise?.reject(
      "E_DOCUMENT",
      "La operación con el archivo se canceló porque la aplicación se reinició.",
    )
    pendingDocument = null
    playlistScope.cancel()
    super.invalidate()
  }

  @ReactMethod
  fun getPlaylists(promise: Promise) {
    runPlaylistOperation(promise, "E_PLAYLISTS_READ", "No se pudieron leer las listas.") {
      val dao = playlistDatabase.playlistDao()
      val tracksByPlaylist = dao.getPlaylistTracks()
        .groupBy { it.playlistId }
        .mapValues { (_, tracks) -> tracks.map { it.trackId } }
      Arguments.createArray().apply {
        dao.getPlaylists().forEach { playlist ->
          pushMap(playlist.toWritableMap(tracksByPlaylist[playlist.id].orEmpty()))
        }
      }
    }
  }

  @ReactMethod
  fun createPlaylist(name: String, promise: Promise) {
    val normalizedName = name.trim()
    if (normalizedName.isEmpty()) {
      promise.reject("E_PLAYLIST_INVALID", "Escribe un nombre para la lista.")
      return
    }

    val playlist = PlaylistEntity(
      id = UUID.randomUUID().toString(),
      name = normalizedName,
      createdAt = System.currentTimeMillis(),
    )
    runPlaylistOperation(promise, "E_PLAYLIST_CREATE", "No se pudo crear la lista.") {
      val dao = playlistDatabase.playlistDao()
      playlistDatabase.withTransaction {
        val playlists = dao.getPlaylists()
        if (playlists.any { it.name.equals(normalizedName, ignoreCase = true) }) {
          throw IllegalArgumentException("Ya existe una lista con ese nombre.")
        }
        dao.insertPlaylist(playlist)
      }
      playlist.toWritableMap(emptyList())
    }
  }

  @ReactMethod
  fun renamePlaylist(playlistId: String, name: String, promise: Promise) {
    val normalizedName = name.trim()
    if (normalizedName.isEmpty()) {
      promise.reject("E_PLAYLIST_INVALID", "Escribe un nombre para la lista.")
      return
    }

    runPlaylistOperation(promise, "E_PLAYLIST_RENAME", "No se pudo renombrar la lista.") {
      val dao = playlistDatabase.playlistDao()
      playlistDatabase.withTransaction {
        val playlist = dao.getPlaylist(playlistId)
          ?: throw IllegalArgumentException("No se encontró la lista seleccionada.")
        if (
          dao.getPlaylists().any {
            it.id != playlistId && it.name.equals(normalizedName, ignoreCase = true)
          }
        ) {
          throw IllegalArgumentException("Ya existe una lista con ese nombre.")
        }
        dao.updatePlaylist(playlist.copy(name = normalizedName))
      }
      null
    }
  }

  @ReactMethod
  fun deletePlaylist(playlistId: String, promise: Promise) {
    runPlaylistOperation(promise, "E_PLAYLIST_DELETE", "No se pudo eliminar la lista.") {
      val dao = playlistDatabase.playlistDao()
      playlistDatabase.withTransaction {
        if (dao.getPlaylist(playlistId) == null) {
          throw IllegalArgumentException("No se encontró la lista seleccionada.")
        }
        dao.deletePlaylist(playlistId)
      }
      null
    }
  }

  @ReactMethod
  fun setPlaylistTracks(playlistId: String, trackIds: ReadableArray, promise: Promise) {
    val normalizedTrackIds = try {
      (0 until trackIds.size()).map { index ->
        trackIds.getString(index)
          ?: throw IllegalArgumentException("La lista contiene una canción no válida.")
      }.distinct()
    } catch (error: RuntimeException) {
      promise.reject("E_PLAYLIST_TRACKS", "La lista contiene una canción no válida.", error)
      return
    }

    runPlaylistOperation(promise, "E_PLAYLIST_TRACKS", "No se pudieron guardar las canciones.") {
      val dao = playlistDatabase.playlistDao()
      playlistDatabase.withTransaction {
        if (dao.getPlaylist(playlistId) == null) {
          throw IllegalArgumentException("No se encontró la lista seleccionada.")
        }
        dao.deletePlaylistTracks(playlistId)
        if (normalizedTrackIds.isNotEmpty()) {
          dao.insertPlaylistTracks(
            normalizedTrackIds.mapIndexed { position, trackId ->
              PlaylistTrackEntity(playlistId, trackId, position)
            },
          )
        }
      }
      null
    }
  }

  /**
   * Turns an album cover into pixel art for the Terminal theme: the center
   * square is shrunk to [size]×[size], dithered into a few shades between
   * [dark] and [light] (colors like "#ffb000"), then enlarged without
   * smoothing so every pixel stays crisp. The result is cached as a PNG and
   * its file URI is returned, or null when the cover cannot be read.
   */
  @ReactMethod
  fun getPixelCover(uri: String, size: Int, dark: String, light: String, promise: Promise) {
    if (uri.isBlank() || size !in 8..MAX_PIXEL_COVER) {
      promise.resolve(null)
      return
    }
    playlistScope.launch {
      try {
        promise.resolve(makePixelCover(Uri.parse(uri), size, Color.parseColor(dark), Color.parseColor(light)))
      } catch (error: Exception) {
        Log.w("MusicLibrary", "Could not make the pixel cover.", error)
        promise.resolve(null)
      }
    }
  }

  private fun makePixelCover(uri: Uri, size: Int, dark: Int, light: Int): String? {
    val directory = File(context.cacheDir, "pixel-covers").apply { mkdirs() }
    val name = "${"$uri|$size|$dark|$light".hashCode().toUInt().toString(16)}-$size.png"
    val file = File(directory, name)
    if (file.isFile && file.length() > 0) return Uri.fromFile(file).toString()

    val resolver = context.contentResolver
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    resolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
    if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null
    var sample = 1
    while (minOf(bounds.outWidth, bounds.outHeight) / (sample * 2) >= size * 4) sample *= 2
    val source = resolver.openInputStream(uri)?.use {
      BitmapFactory.decodeStream(it, null, BitmapFactory.Options().apply { inSampleSize = sample })
    } ?: return null

    val side = minOf(source.width, source.height)
    val square = Bitmap.createBitmap(source, (source.width - side) / 2, (source.height - side) / 2, side, side)
    val small = Bitmap.createScaledBitmap(square, size, size, true)
    val pixels = IntArray(size * size)
    small.getPixels(pixels, 0, size, 0, 0, size, size)
    if (small !== square) small.recycle()
    if (square !== source) square.recycle()
    source.recycle()

    // Light level of each pixel, stretched so the darkest and brightest
    // parts of the cover use the whole range of shades.
    val levels = FloatArray(pixels.size) { index ->
      val color = pixels[index]
      (((color shr 16) and 0xff) * 0.299f + ((color shr 8) and 0xff) * 0.587f + (color and 0xff) * 0.114f) / 255f
    }
    val sorted = levels.sortedArray()
    val low = sorted[(sorted.size * 0.02f).toInt()]
    val high = sorted[((sorted.size - 1) * 0.98f).toInt()].coerceAtLeast(low + 0.05f)

    val shades = PIXEL_SHADES
    val palette = IntArray(shades) { step -> blend(dark, light, step / (shades - 1f)) }
    for (y in 0 until size) {
      for (x in 0 until size) {
        val index = y * size + x
        val level = ((levels[index] - low) / (high - low)).coerceIn(0f, 1f)
        val threshold = (BAYER[(y % 4) * 4 + x % 4] + 0.5f) / 16f - 0.5f
        val shade = (level * (shades - 1) + threshold).toInt().coerceIn(0, shades - 1)
        pixels[index] = palette[shade]
      }
    }
    val art = Bitmap.createBitmap(pixels, size, size, Bitmap.Config.ARGB_8888)
    val scale = (512 / size).coerceAtLeast(1)
    val large = Bitmap.createScaledBitmap(art, size * scale, size * scale, false)
    try {
      val partial = File(directory, "$name.part")
      FileOutputStream(partial).use { large.compress(Bitmap.CompressFormat.PNG, 100, it) }
      if (!partial.renameTo(file)) {
        partial.delete()
        return null
      }
    } finally {
      if (large !== art) large.recycle()
      art.recycle()
    }
    return Uri.fromFile(file).toString()
  }

  private fun blend(from: Int, to: Int, amount: Float): Int {
    fun channel(shift: Int): Int {
      val a = (from shr shift) and 0xff
      val b = (to shr shift) and 0xff
      return (a + (b - a) * amount).toInt().coerceIn(0, 255)
    }
    return Color.rgb(channel(16), channel(8), channel(0))
  }

  @ReactMethod
  fun getLyrics(trackId: String, promise: Promise) {
    if (trackId.isBlank()) {
      promise.reject("E_LYRICS_TRACK", "La canción seleccionada no es válida.")
      return
    }
    runPlaylistOperation(promise, "E_LYRICS_READ", "No se pudieron leer las letras.") {
      playlistDatabase.playlistDao().getLyrics(trackId)
    }
  }

  @ReactMethod
  fun saveLyrics(trackId: String, contents: String, promise: Promise) {
    if (
      trackId.isBlank() || contents.isBlank() ||
      contents.toByteArray(Charsets.UTF_8).size > MAX_LYRICS_FILE_BYTES
    ) {
      promise.reject("E_LYRICS_INVALID", "El archivo de letras está vacío o supera el tamaño permitido.")
      return
    }
    runPlaylistOperation(promise, "E_LYRICS_WRITE", "No se pudieron guardar las letras.") {
      playlistDatabase.playlistDao().saveLyrics(
        TrackLyricsEntity(trackId, contents, System.currentTimeMillis()),
      )
      null
    }
  }

  @ReactMethod
  fun deleteLyrics(trackId: String, promise: Promise) {
    runPlaylistOperation(promise, "E_LYRICS_DELETE", "No se pudieron eliminar las letras.") {
      playlistDatabase.playlistDao().deleteLyrics(trackId)
      null
    }
  }

  @ReactMethod
  fun recordPlaybackHistory(trackId: String, promise: Promise) {
    if (trackId.isBlank()) {
      promise.reject("E_HISTORY_TRACK", "No se puede guardar una canción no válida.")
      return
    }

    runPlaylistOperation(promise, "E_HISTORY_WRITE", "No se pudo guardar el historial.") {
      val dao = playlistDatabase.playlistDao()
      dao.insertPlaybackHistory(
        PlaybackHistoryEntity(trackId = trackId, playedAt = System.currentTimeMillis()),
      )
      dao.prunePlaybackHistory()
      null
    }
  }

  @ReactMethod
  fun getRecentPlayback(promise: Promise) {
    runPlaylistOperation(promise, "E_HISTORY_READ", "No se pudo leer el historial.") {
      Arguments.createArray().apply {
        playlistDatabase.playlistDao().getRecentPlayback().forEach { entry ->
          pushMap(Arguments.createMap().apply {
            putString("trackId", entry.trackId)
            putDouble("playedAt", entry.playedAt.toDouble())
          })
        }
      }
    }
  }

  @ReactMethod
  fun getTopPlayed(promise: Promise) {
    runPlaylistOperation(promise, "E_HISTORY_READ", "No se pudo leer el historial.") {
      Arguments.createArray().apply {
        playlistDatabase.playlistDao().getTopPlayed().forEach { entry ->
          pushMap(Arguments.createMap().apply {
            putString("trackId", entry.trackId)
            putInt("plays", entry.plays)
          })
        }
      }
    }
  }

  @ReactMethod
  fun saveSession(session: String, promise: Promise) {
    context.getSharedPreferences("music_library", Context.MODE_PRIVATE)
      .edit()
      .putString("playback_session", session)
      .apply()
    promise.resolve(null)
  }

  @ReactMethod
  fun savePreference(key: String, value: String, promise: Promise) {
    context.getSharedPreferences("music_library", Context.MODE_PRIVATE)
      .edit()
      .putString("preference_$key", value)
      .apply()
    promise.resolve(null)
  }

  @ReactMethod
  fun getPreference(key: String, promise: Promise) {
    promise.resolve(
      context.getSharedPreferences("music_library", Context.MODE_PRIVATE)
        .getString("preference_$key", null),
    )
  }

  @ReactMethod
  fun shareTrack(trackId: String, title: String, promise: Promise) {
    val mediaId = trackId.toLongOrNull()?.takeIf { it > 0 }
    if (mediaId == null) {
      promise.reject("E_TRACK_INVALID", "La canción seleccionada no es válida.")
      return
    }
    val uri = ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, mediaId)
    val share = Intent(Intent.ACTION_SEND).apply {
      type = context.contentResolver.getType(uri) ?: "audio/*"
      putExtra(Intent.EXTRA_STREAM, uri)
      addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    context.runOnUiQueueThread {
      try {
        val activity = context.currentActivity
          ?: throw IllegalStateException("No hay una pantalla activa para compartir.")
        activity.startActivity(Intent.createChooser(share, "Compartir $title"))
        promise.resolve(null)
      } catch (error: Exception) {
        promise.reject("E_TRACK_SHARE", "No se pudo compartir la canción.", error)
      }
    }
  }

  @ReactMethod
  fun exportBackup(fileName: String, contents: String, promise: Promise) {
    if (contents.toByteArray(Charsets.UTF_8).size > MAX_BACKUP_FILE_BYTES) {
      promise.reject("E_BACKUP_SIZE", "La copia supera el tamaño máximo permitido.")
      return
    }
    val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
      addCategory(Intent.CATEGORY_OPENABLE)
      type = "application/json"
      putExtra(Intent.EXTRA_TITLE, fileName)
    }
    startBackupRequest(intent, BACKUP_EXPORT_REQUEST_CODE, PendingBackup(promise, contents))
  }

  @ReactMethod
  fun importBackup(promise: Promise) {
    val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
      addCategory(Intent.CATEGORY_OPENABLE)
      type = "*/*"
      putExtra(
        Intent.EXTRA_MIME_TYPES,
        arrayOf("application/json", "text/plain", "application/octet-stream"),
      )
    }
    startBackupRequest(intent, BACKUP_IMPORT_REQUEST_CODE, PendingBackup(promise, null))
  }

  private fun startBackupRequest(intent: Intent, requestCode: Int, backup: PendingBackup) {
    if (pendingBackup != null || pendingDocument != null) {
      backup.promise.reject("E_BACKUP", "Ya hay una copia en curso.")
      return
    }
    pendingBackup = backup
    context.runOnUiQueueThread {
      try {
        val activity = context.currentActivity
          ?: throw IllegalStateException("No hay una pantalla activa para elegir el archivo.")
        activity.startActivityForResult(intent, requestCode)
      } catch (error: Exception) {
        pendingBackup = null
        backup.promise.reject("E_BACKUP", "No se pudo abrir el selector de archivos.", error)
      }
    }
  }

  private fun finishBackupRequest(requestCode: Int, resultCode: Int, uri: Uri?) {
    val backup = pendingBackup ?: return
    pendingBackup = null
    val exporting = requestCode == BACKUP_EXPORT_REQUEST_CODE
    if (resultCode != Activity.RESULT_OK || uri == null) {
      backup.promise.resolve(if (exporting) false else null)
      return
    }
    playlistScope.launch {
      try {
        if (exporting) {
          val output = context.contentResolver.openOutputStream(uri)
            ?: throw IOException("Android no pudo abrir el archivo.")
          output.use { it.write(backup.contents.orEmpty().toByteArray(Charsets.UTF_8)) }
          backup.promise.resolve(true)
        } else {
          val input = context.contentResolver.openInputStream(uri)
            ?: throw IOException("Android no pudo abrir el archivo.")
          backup.promise.resolve(readUtf8WithLimit(input, MAX_BACKUP_FILE_BYTES))
        }
      } catch (error: Exception) {
        backup.promise.reject("E_BACKUP", "No se pudo leer o escribir el archivo.", error)
      }
    }
  }

  private class PendingBackup(val promise: Promise, val contents: String?)

  @ReactMethod
  fun exportPlaylistFile(fileName: String, contents: String, promise: Promise) {
    val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
      addCategory(Intent.CATEGORY_OPENABLE)
      type = "audio/x-mpegurl"
      putExtra(Intent.EXTRA_TITLE, fileName)
      putExtra(Intent.EXTRA_MIME_TYPES, arrayOf("audio/x-mpegurl", "application/vnd.apple.mpegurl", "text/plain"))
    }
    startDocumentRequest(
      intent,
      PLAYLIST_EXPORT_REQUEST_CODE,
      PendingDocument(promise, contents, exporting = true, maxBytes = MAX_PLAYLIST_FILE_BYTES),
    )
  }

  @ReactMethod
  fun importPlaylistFile(promise: Promise) {
    val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
      addCategory(Intent.CATEGORY_OPENABLE)
      type = "*/*"
      putExtra(Intent.EXTRA_MIME_TYPES, arrayOf("audio/x-mpegurl", "application/vnd.apple.mpegurl", "text/plain", "application/octet-stream"))
    }
    startDocumentRequest(
      intent,
      PLAYLIST_IMPORT_REQUEST_CODE,
      PendingDocument(promise, null, exporting = false, maxBytes = MAX_PLAYLIST_FILE_BYTES),
    )
  }

  @ReactMethod
  fun importLyricsFile(promise: Promise) {
    val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
      addCategory(Intent.CATEGORY_OPENABLE)
      type = "text/plain"
      putExtra(Intent.EXTRA_MIME_TYPES, arrayOf("text/plain", "application/x-lrc"))
    }
    startDocumentRequest(
      intent,
      LYRICS_IMPORT_REQUEST_CODE,
      PendingDocument(promise, null, exporting = false, maxBytes = MAX_LYRICS_FILE_BYTES),
    )
  }

  private fun startDocumentRequest(intent: Intent, requestCode: Int, document: PendingDocument) {
    if (pendingDocument != null || pendingBackup != null) {
      document.promise.reject("E_DOCUMENT", "Ya hay una operación con archivos en curso.")
      return
    }
    pendingDocument = document
    context.runOnUiQueueThread {
      try {
        val activity = context.currentActivity
          ?: throw IllegalStateException("No hay una pantalla activa para elegir el archivo.")
        activity.startActivityForResult(intent, requestCode)
      } catch (error: Exception) {
        pendingDocument = null
        document.promise.reject("E_DOCUMENT", "No se pudo abrir el selector de archivos.", error)
      }
    }
  }

  private fun finishDocumentRequest(resultCode: Int, uri: Uri?) {
    val document = pendingDocument ?: return
    pendingDocument = null
    if (resultCode != Activity.RESULT_OK || uri == null) {
      document.promise.resolve(if (document.exporting) false else null)
      return
    }
    playlistScope.launch {
      try {
        if (document.exporting) {
          val contents = document.contents.orEmpty().toByteArray(Charsets.UTF_8)
          if (contents.size > document.maxBytes) {
            throw IOException("El archivo supera el tamaño permitido.")
          }
          val output = context.contentResolver.openOutputStream(uri)
            ?: throw IOException("Android no pudo abrir el archivo.")
          output.use { it.write(contents) }
          document.promise.resolve(true)
        } else {
          val input = context.contentResolver.openInputStream(uri)
            ?: throw IOException("Android no pudo abrir el archivo.")
          document.promise.resolve(readUtf8WithLimit(input, document.maxBytes))
        }
      } catch (error: Exception) {
        document.promise.reject("E_DOCUMENT", "No se pudo leer o escribir el archivo.", error)
      }
    }
  }

  private class PendingDocument(
    val promise: Promise,
    val contents: String?,
    val exporting: Boolean,
    val maxBytes: Int,
  )

  @ReactMethod
  fun saveAppearance(appearance: String, promise: Promise) {
    context.getSharedPreferences("music_library", Context.MODE_PRIVATE)
      .edit()
      .putString("appearance", appearance)
      .apply()
    promise.resolve(null)
  }

  @ReactMethod
  fun getAppearance(promise: Promise) {
    val preferences =
      context.getSharedPreferences("music_library", Context.MODE_PRIVATE)
    // Older versions only saved the player theme, which is now a palette.
    val legacyPalette = preferences.getString("player_theme", null)
    promise.resolve(
      preferences.getString("appearance", null)
        ?: legacyPalette?.let { JSONObject().put("paletteId", it).toString() },
    )
  }

  @ReactMethod
  fun getSession(promise: Promise) {
    promise.resolve(
      context.getSharedPreferences("music_library", Context.MODE_PRIVATE)
        .getString("playback_session", null),
    )
  }

  @ReactMethod
  fun clearPlaybackHistory(promise: Promise) {
    runPlaylistOperation(promise, "E_HISTORY_CLEAR", "No se pudo borrar el historial.") {
      playlistDatabase.playlistDao().clearPlaybackHistory()
      null
    }
  }

  @ReactMethod
  fun getPlaybackRate(promise: Promise) {
    try {
      val rate = context
        .getSharedPreferences("music_library", Context.MODE_PRIVATE)
        .getFloat("playback_rate", 1.0f)
      promise.resolve(rate.toDouble())
    } catch (error: RuntimeException) {
      promise.reject("E_PLAYBACK_RATE_READ", "No se pudo leer la velocidad guardada.", error)
    }
  }

  @ReactMethod
  fun setPlaybackRate(rate: Double, promise: Promise) {
    if (!rate.isFinite() || rate !in 0.75..2.0) {
      promise.reject("E_PLAYBACK_RATE_INVALID", "La velocidad debe estar entre 0,75× y 2×.")
      return
    }
    try {
      context.getSharedPreferences("music_library", Context.MODE_PRIVATE)
        .edit()
        .putFloat("playback_rate", rate.toFloat())
        .apply()
      promise.resolve(null)
    } catch (error: RuntimeException) {
      promise.reject("E_PLAYBACK_RATE_WRITE", "No se pudo guardar la velocidad.", error)
    }
  }

  @ReactMethod
  fun getEqualizerSettings(promise: Promise) {
    try {
      val preferences = context.getSharedPreferences("music_library", Context.MODE_PRIVATE)
      val enabled = preferences.getBoolean("equalizer_enabled", false)
      val gains = List(EQUALIZER_BAND_COUNT) { index ->
        preferences.getFloat("equalizer_gain_$index", 0f)
      }
      SoftwareEqualizer.update(enabled, gains)
      promise.resolve(Arguments.createMap().apply {
        putBoolean("enabled", enabled)
        putArray("bandGainsDb", Arguments.createArray().apply {
          gains.forEach { pushDouble(it.toDouble()) }
        })
      })
    } catch (error: RuntimeException) {
      promise.reject("E_EQUALIZER_READ", "No se pudo leer la configuración del ecualizador.", error)
    }
  }

  @ReactMethod
  fun setEqualizerSettings(
    enabled: Boolean,
    bandGainsDb: ReadableArray,
    promise: Promise,
  ) {
    val gains = try {
      if (bandGainsDb.size() != EQUALIZER_BAND_COUNT) {
        throw IllegalArgumentException("El ecualizador requiere cinco bandas.")
      }
      (0 until bandGainsDb.size()).map { index ->
        val gain = bandGainsDb.getDouble(index).toFloat()
        if (
          !gain.isFinite() ||
          gain !in EQUALIZER_MIN_GAIN_DB..EQUALIZER_MAX_GAIN_DB
        ) {
          throw IllegalArgumentException("Cada banda debe estar entre −12 y +12 dB.")
        }
        gain
      }
    } catch (error: RuntimeException) {
      promise.reject("E_EQUALIZER_INVALID", "La configuración del ecualizador no es válida.", error)
      return
    }

    try {
      context.getSharedPreferences("music_library", Context.MODE_PRIVATE)
        .edit()
        .putBoolean("equalizer_enabled", enabled)
        .apply {
          gains.forEachIndexed { index, gain ->
            putFloat("equalizer_gain_$index", gain)
          }
        }
        .apply()
      SoftwareEqualizer.update(enabled, gains)
      promise.resolve(null)
    } catch (error: RuntimeException) {
      promise.reject("E_EQUALIZER_WRITE", "No se pudo guardar la configuración del ecualizador.", error)
    }
  }

  private fun runPlaylistOperation(
    promise: Promise,
    errorCode: String,
    fallbackMessage: String,
    operation: suspend () -> Any?,
  ) {
    playlistScope.launch {
      try {
        promise.resolve(operation())
      } catch (error: Exception) {
        val message = error.message?.takeIf(String::isNotBlank) ?: fallbackMessage
        promise.reject(errorCode, message, error)
      }
    }
  }

  private fun PlaylistEntity.toWritableMap(trackIds: List<String>) = Arguments.createMap().apply {
    putString("id", id)
    putString("name", name)
    putDouble("createdAt", createdAt.toDouble())
    putArray("trackIds", Arguments.createArray().apply {
      trackIds.forEach { trackId -> pushString(trackId) }
    })
  }

  @ReactMethod
  fun getFavoriteTrackIds(promise: Promise) {
    try {
      val favorites = context
        .getSharedPreferences("music_library", Context.MODE_PRIVATE)
        .getStringSet("favorite_track_ids", emptySet())
        .orEmpty()
      val result = Arguments.createArray()
      favorites.sorted().forEach(result::pushString)
      promise.resolve(result)
    } catch (error: RuntimeException) {
      promise.reject("E_FAVORITES_READ", "No se pudieron leer tus canciones favoritas.", error)
    }
  }

  @ReactMethod
  fun setTrackFavorite(trackId: String, isFavorite: Boolean, promise: Promise) {
    try {
      val preferences =
        context.getSharedPreferences("music_library", Context.MODE_PRIVATE)
      val favorites = preferences.getStringSet("favorite_track_ids", emptySet())
        .orEmpty()
        .toMutableSet()
      if (isFavorite) {
        favorites.add(trackId)
      } else {
        favorites.remove(trackId)
      }
      preferences.edit().putStringSet("favorite_track_ids", favorites).apply()
      promise.resolve(null)
    } catch (error: RuntimeException) {
      promise.reject("E_FAVORITES_WRITE", "No se pudo actualizar la canción favorita.", error)
    }
  }

  @ReactMethod
  fun deleteTrack(trackId: String, promise: Promise) {
    val mediaId = trackId.toLongOrNull()?.takeIf { it > 0 }
    if (mediaId == null) {
      promise.reject("E_TRACK_INVALID", "La canción seleccionada no es válida.")
      return
    }

    val readPermission = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      Manifest.permission.READ_MEDIA_AUDIO
    } else {
      Manifest.permission.READ_EXTERNAL_STORAGE
    }
    if (context.checkSelfPermission(readPermission) != PackageManager.PERMISSION_GRANTED) {
      promise.reject("E_PERMISSION", "Se necesita permiso para acceder a la canción.")
      return
    }
    if (
      Build.VERSION.SDK_INT < Build.VERSION_CODES.Q &&
      context.checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) !=
      PackageManager.PERMISSION_GRANTED
    ) {
      promise.reject("E_PERMISSION", "Se necesita permiso para eliminar la canción.")
      return
    }
    if (pendingDeletion != null) {
      promise.reject("E_DELETE_IN_PROGRESS", "Ya hay una eliminación pendiente.")
      return
    }

    val uri = ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, mediaId)
    val deletion = PendingDeletion(trackId, uri, promise)
    when {
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.R -> {
        try {
          requestDeleteConsent(
            deletion,
            MediaStore.createDeleteRequest(context.contentResolver, listOf(uri)).intentSender,
          )
        } catch (error: Exception) {
          promise.reject("E_TRACK_DELETE", "No se pudo solicitar permiso para eliminar la canción.", error)
        }
      }
      Build.VERSION.SDK_INT == Build.VERSION_CODES.Q -> {
        playlistScope.launch {
          try {
            val deletedRows = context.contentResolver.delete(uri, null, null)
            if (deletedRows == 0) {
              promise.reject(
                "E_DELETE_NOT_FOUND",
                "La canción ya no está disponible en el dispositivo.",
              )
            } else {
              finishTrackDeletion(deletion)
            }
          } catch (error: RecoverableSecurityException) {
            requestDeleteConsent(deletion, error.userAction.actionIntent.intentSender, retryAfterConsent = true)
          } catch (error: Exception) {
            promise.reject(
              "E_TRACK_DELETE",
              "No se pudo eliminar la canción del dispositivo.",
              error,
            )
          }
        }
      }
      else -> {
        playlistScope.launch {
          try {
            val deletedRows = context.contentResolver.delete(uri, null, null)
            if (deletedRows == 0) {
              promise.reject(
                "E_DELETE_NOT_FOUND",
                "La canción ya no está disponible en el dispositivo.",
              )
            } else {
              finishTrackDeletion(deletion)
            }
          } catch (error: Exception) {
            promise.reject(
              "E_TRACK_DELETE",
              "No se pudo eliminar la canción del dispositivo.",
              error,
            )
          }
        }
      }
    }
  }

  private fun requestDeleteConsent(
    deletion: PendingDeletion,
    intentSender: IntentSender,
    retryAfterConsent: Boolean = false,
  ) {
    if (pendingDeletion != null) {
      deletion.promise.reject("E_DELETE_IN_PROGRESS", "Ya hay una eliminación pendiente.")
      return
    }
    val pending = deletion.copy(retryAfterConsent = retryAfterConsent)
    pendingDeletion = pending
    context.runOnUiQueueThread {
      try {
        val activity = context.currentActivity
          ?: throw IllegalStateException("No hay una pantalla activa para solicitar permiso.")
        activity.startIntentSenderForResult(
          intentSender,
          DELETE_REQUEST_CODE,
          null,
          0,
          0,
          0,
        )
      } catch (error: Exception) {
        if (pendingDeletion === pending) {
          pendingDeletion = null
        }
        pending.promise.reject(
          "E_TRACK_DELETE",
          "No se pudo solicitar permiso para eliminar la canción.",
          error,
        )
      }
    }
  }

  private fun finishTrackDeletion(deletion: PendingDeletion) {
    playlistScope.launch {
      try {
        val dao = playlistDatabase.playlistDao()
        playlistDatabase.withTransaction {
          dao.deletePlaylistTrackReferences(deletion.trackId)
          dao.deletePlaybackHistoryForTrack(deletion.trackId)
          dao.deleteLyrics(deletion.trackId)
        }
        val preferences =
          context.getSharedPreferences("music_library", Context.MODE_PRIVATE)
        val favorites = preferences.getStringSet("favorite_track_ids", emptySet())
          .orEmpty()
          .toMutableSet()
        favorites.remove(deletion.trackId)
        preferences.edit().putStringSet("favorite_track_ids", favorites).apply()
        deletion.promise.resolve(true)
      } catch (error: Exception) {
        deletion.promise.reject(
          "E_DELETE_CLEANUP",
          "La canción se eliminó, pero no se pudieron limpiar sus datos guardados.",
          error,
        )
      }
    }
  }

  private data class PendingDeletion(
    val trackId: String,
    val uri: Uri,
    val promise: Promise,
    val retryAfterConsent: Boolean = false,
  )

  @ReactMethod
  fun getTracks(promise: Promise) {
    val permission = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      Manifest.permission.READ_MEDIA_AUDIO
    } else {
      Manifest.permission.READ_EXTERNAL_STORAGE
    }

    if (context.checkSelfPermission(permission) != PackageManager.PERMISSION_GRANTED) {
      promise.reject("E_PERMISSION", "Se necesita permiso para leer el audio del dispositivo.")
      return
    }

    playlistScope.launch {
      try {
        promise.resolve(scanTracks())
      } catch (error: SecurityException) {
        promise.reject("E_PERMISSION", "Android denegó el acceso a la biblioteca de audio.", error)
      } catch (error: Exception) {
        promise.reject("E_LIBRARY_QUERY", "No se pudo leer la biblioteca de audio.", error)
      }
    }
  }

  private suspend fun scanTracks(): WritableArray {
    val projection = listOf(
      MediaStore.Audio.Media._ID,
      MediaStore.Audio.Media.TITLE,
      MediaStore.Audio.Media.ARTIST,
      MediaStore.Audio.Media.ALBUM,
      MediaStore.Audio.Media.DURATION,
      MediaStore.Audio.Media.ALBUM_ID,
      MediaStore.Audio.Media.DISPLAY_NAME,
      MediaStore.Audio.Media.DATE_ADDED,
      MediaStore.Audio.Media.DATE_MODIFIED,
      MediaStore.Audio.Media.SIZE,
      MediaStore.Audio.Media.DATA,
      folderColumn(),
    ).distinct().toTypedArray()
    val dao = playlistDatabase.playlistDao()
    val cachedMetadata = dao.getTrackMetadata().associateBy { it.trackId }
    val updatedMetadata = mutableListOf<TrackMetadataEntity>()
    val scannedTrackIds = mutableSetOf<String>()
    val artworkByAlbum = mutableMapOf<Long, String?>()
    val artworkEmittedAlbums = mutableSetOf<Long>()
    val tracks = Arguments.createArray()

    val selection = buildString {
      append("${MediaStore.Audio.Media.IS_MUSIC} != 0")
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        append(" AND ${MediaStore.Audio.Media.IS_RECORDING} = 0")
      }
    }
    val cursor = context.contentResolver.query(
      MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
      projection,
      selection,
      null,
      "${MediaStore.Audio.Media.TITLE} COLLATE NOCASE ASC",
    ) ?: throw IllegalStateException("Android no pudo consultar la biblioteca de audio.")

    cursor.use {
      val idColumn = it.getColumnIndexOrThrow(MediaStore.Audio.Media._ID)
      val titleColumn = it.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE)
      val artistColumn = it.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST)
      val albumColumn = it.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM)
      val durationColumn = it.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION)
      val albumIdColumn = it.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM_ID)
      val displayNameColumn = it.getColumnIndexOrThrow(MediaStore.Audio.Media.DISPLAY_NAME)
      val dateAddedColumn = it.getColumnIndexOrThrow(MediaStore.Audio.Media.DATE_ADDED)
      val dateModifiedColumn = it.getColumnIndexOrThrow(MediaStore.Audio.Media.DATE_MODIFIED)
      val sizeColumn = it.getColumnIndexOrThrow(MediaStore.Audio.Media.SIZE)
      val filePathColumn = it.getColumnIndexOrThrow(MediaStore.Audio.Media.DATA)
      val folderIndex = it.getColumnIndexOrThrow(folderColumn())

      while (it.moveToNext()) {
        val displayName = it.getString(displayNameColumn).orEmpty()
        val indexedTitle = it.getString(titleColumn)
        if (isGeneratedPlaylistFile(displayName) || isGeneratedPlaylistFile(indexedTitle)) {
          continue
        }

        val id = it.getLong(idColumn)
        val trackId = id.toString()
        val albumId = it.getLong(albumIdColumn)
        val dateModified = it.getLong(dateModifiedColumn)
        val size = it.getLong(sizeColumn)
        val uri = ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, id)
        scannedTrackIds.add(trackId)

        if (albumId !in artworkByAlbum) {
          artworkByAlbum[albumId] = findStoredArtwork(albumId)
        }

        val cached = cachedMetadata[trackId]?.takeIf { entry ->
          entry.albumId == albumId && entry.dateModified == dateModified && entry.size == size
        }
        val metadata = if (cached != null) {
          cached
        } else {
          val extracted = extractTrackMetadata(
            uri,
            TrackMetadataEntity(trackId, albumId, dateModified, size, null, null, null, null, null),
            readArtwork = artworkByAlbum[albumId] == null,
          )
          extracted.embeddedArt?.let { bytes ->
            saveArtwork(albumId, bytes)?.let { artwork -> artworkByAlbum[albumId] = artwork }
          }
          updatedMetadata.add(extracted.metadata)
          extracted.metadata
        }

        val title = indexedTitle
          .takeUnless { value -> value.isNullOrBlank() || value == "<unknown>" }
          ?: metadata.title?.takeUnless(String::isBlank)
          ?: displayName.substringBeforeLast('.', displayName).ifBlank { "Pista sin título" }
        val artist = it.getString(artistColumn)
          .takeUnless { value -> value.isNullOrBlank() || value == "<unknown>" }
          ?: metadata.artist?.takeUnless(String::isBlank)
          ?: "Artista desconocido"
        val album = it.getString(albumColumn)
          .takeUnless { value -> value.isNullOrBlank() || value == "<unknown>" }
          ?: metadata.album?.takeUnless(String::isBlank)
          ?: "Álbum desconocido"
        val genre = metadata.genre
        val year = metadata.year

        val track = Arguments.createMap().apply {
          putString("id", trackId)
          putString("uri", uri.toString())
          it.getString(filePathColumn)?.let { path -> putString("filePath", path) }
          putString("title", title.trim())
          putString("artist", artist.trim())
          putString("album", album.trim())
          putString("albumId", albumId.toString())
          if (genre != null) putString("genre", genre) else putNull("genre")
          if (year != null) putInt("year", year) else putNull("year")
          putDouble("duration", it.getLong(durationColumn).toDouble() / 1000.0)
          putDouble("dateAdded", it.getLong(dateAddedColumn).toDouble())
          putString("folder", folderPath(it.getString(folderIndex)))
          val artwork = artworkByAlbum[albumId]
          if (artwork != null && artworkEmittedAlbums.add(albumId)) {
            putString("artwork", artwork)
          } else {
            putNull("artwork")
          }
        }
        tracks.pushMap(track)
      }
    }

    if (updatedMetadata.isNotEmpty()) {
      dao.insertTrackMetadata(updatedMetadata)
    }
    remapTrackIds(
      matchMovedTracks(
        cachedMetadata.filterKeys { it !in scannedTrackIds }.values,
        updatedMetadata.filter { it.trackId !in cachedMetadata },
      ),
    )
    (cachedMetadata.keys - scannedTrackIds).chunked(METADATA_DELETE_BATCH_SIZE).forEach { trackIds ->
      dao.deleteTrackMetadata(trackIds)
    }
    deleteOrphanedArtwork(artworkByAlbum.keys)

    return tracks
  }

  // Android gives a file a new id when it is moved, so one that vanished and one
  // that appeared with the same size and tags are the same song.
  private fun matchMovedTracks(
    vanished: Collection<TrackMetadataEntity>,
    appeared: List<TrackMetadataEntity>,
  ): Map<String, String> {
    fun fingerprint(track: TrackMetadataEntity) = "${track.size}|${track.title}|${track.artist}"
    val appearedByFingerprint = appeared.groupBy(::fingerprint).filterValues { it.size == 1 }
    return vanished.groupBy(::fingerprint)
      .filterValues { it.size == 1 }
      .mapNotNull { (key, tracks) ->
        appearedByFingerprint[key]?.let { tracks.first().trackId to it.first().trackId }
      }
      .toMap()
  }

  private suspend fun remapTrackIds(moved: Map<String, String>) {
    if (moved.isEmpty()) {
      return
    }
    val dao = playlistDatabase.playlistDao()
    playlistDatabase.withTransaction {
      moved.forEach { (oldId, newId) ->
        dao.remapPlaylistTrack(oldId, newId)
        dao.remapPlaybackHistory(oldId, newId)
        dao.deleteLyrics(newId)
        dao.remapLyrics(oldId, newId)
      }
    }
    val preferences = context.getSharedPreferences("music_library", Context.MODE_PRIVATE)
    val favorites = preferences.getStringSet("favorite_track_ids", emptySet())
      .orEmpty()
      .map { moved[it] ?: it }
      .toSet()
    preferences.edit().putStringSet("favorite_track_ids", favorites).apply()
    if (context.hasActiveReactInstance()) {
      context.emitDeviceEvent("musicTracksRemapped")
    }
  }

  // RELATIVE_PATH exists from Android 10; older versions only expose the absolute path.
  @Suppress("DEPRECATION")
  private fun folderColumn() =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      MediaStore.Audio.Media.RELATIVE_PATH
    } else {
      MediaStore.Audio.Media.DATA
    }

  private fun folderPath(value: String?): String {
    val path = value.orEmpty()
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      path.trimEnd('/')
    } else {
      path.substringBeforeLast('/', "")
    }
  }

  private fun extractTrackMetadata(
    uri: Uri,
    base: TrackMetadataEntity,
    readArtwork: Boolean,
  ): ExtractedTrack {
    val retriever = MediaMetadataRetriever()
    try {
      retriever.setDataSource(context, uri)
      val genre = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_GENRE)
        ?.trim()
        ?.takeUnless { value ->
          value.isBlank() || value.lowercase() in setOf("none", "unknown", "<unknown>", "n/a")
        }
      val year = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_YEAR)
        ?.take(4)
        ?.toIntOrNull()
        ?.takeIf { value -> value in 1000..9999 }
      return ExtractedTrack(
        base.copy(
          title = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_TITLE),
          artist = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ARTIST),
          album = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ALBUM),
          genre = genre,
          year = year,
        ),
        if (readArtwork) retriever.embeddedPicture else null,
      )
    } catch (error: RuntimeException) {
      Log.w("MusicLibrary", "Could not read metadata for $uri; using MediaStore values.", error)
      return ExtractedTrack(base, null)
    } finally {
      try {
        retriever.release()
      } catch (error: Exception) {
        Log.w("MusicLibrary", "Could not release the metadata reader for $uri.", error)
      }
    }
  }

  private class ExtractedTrack(
    val metadata: TrackMetadataEntity,
    val embeddedArt: ByteArray?,
  )

  private fun isGeneratedPlaylistFile(name: String?): Boolean =
    name?.startsWith("AutoBackup_", ignoreCase = true) == true ||
      name?.startsWith("AutoPlaylist_", ignoreCase = true) == true

  private fun findStoredArtwork(albumId: Long): String? {
    if (albumId > 0) {
      val albumUri = Uri.parse("content://media/external/audio/albumart/$albumId")
      try {
        context.contentResolver.openInputStream(albumUri)?.use {
          return albumUri.toString()
        }
      } catch (_: IOException) {
        // The album artwork provider may not have a cached image for this album.
      } catch (_: SecurityException) {
        // Fall back to the image extracted from the audio file.
      }
    }

    return artworkFile(albumId).takeIf(File::isFile)?.let { Uri.fromFile(it).toString() }
  }

  // Stored in filesDir: Android may purge cacheDir, and tracks with cached metadata
  // are not opened again to recover their image.
  private fun artworkDirectory() = File(context.filesDir, "artwork")

  private fun artworkFile(albumId: Long) = File(artworkDirectory(), "$albumId.jpg")

  private fun saveArtwork(albumId: Long, bytes: ByteArray): String? {
    val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size) ?: return null
    val longestSide = maxOf(bitmap.width, bitmap.height)
    val scaled = if (longestSide > 512) {
      val scale = 512f / longestSide
      Bitmap.createScaledBitmap(
        bitmap,
        (bitmap.width * scale).toInt().coerceAtLeast(1),
        (bitmap.height * scale).toInt().coerceAtLeast(1),
        true,
      )
    } else {
      bitmap
    }

    val file = artworkFile(albumId)
    val temporaryFile = File(file.path + ".tmp")
    try {
      artworkDirectory().mkdirs()
      FileOutputStream(temporaryFile).use { output ->
        scaled.compress(Bitmap.CompressFormat.JPEG, 82, output)
      }
      if (!temporaryFile.renameTo(file)) {
        throw IOException("Could not move the artwork file into place.")
      }
      return Uri.fromFile(file).toString()
    } catch (error: IOException) {
      Log.w("MusicLibrary", "Could not store artwork for album $albumId.", error)
      temporaryFile.delete()
      return null
    } finally {
      if (scaled !== bitmap) {
        scaled.recycle()
      }
      bitmap.recycle()
    }
  }

  private fun deleteOrphanedArtwork(albumIds: Set<Long>) {
    artworkDirectory().listFiles()?.forEach { file ->
      if (file.nameWithoutExtension.toLongOrNull() !in albumIds) {
        file.delete()
      }
    }
  }

  private companion object {
    const val DELETE_REQUEST_CODE = 7412
    const val BACKUP_EXPORT_REQUEST_CODE = 7413
    const val BACKUP_IMPORT_REQUEST_CODE = 7414
    const val PLAYLIST_EXPORT_REQUEST_CODE = 7415
    const val PLAYLIST_IMPORT_REQUEST_CODE = 7416
    const val LYRICS_IMPORT_REQUEST_CODE = 7417
    const val MAX_PLAYLIST_FILE_BYTES = 10 * 1024 * 1024
    const val MAX_BACKUP_FILE_BYTES = 10 * 1024 * 1024
    const val MAX_LYRICS_FILE_BYTES = 1024 * 1024
    const val MAX_PIXEL_COVER = 128
    const val PIXEL_SHADES = 6
    private val BAYER = floatArrayOf(0f, 8f, 2f, 10f, 12f, 4f, 14f, 6f, 3f, 11f, 1f, 9f, 15f, 7f, 13f, 5f)
    const val LIBRARY_CHANGE_DEBOUNCE_MS = 700L
    const val METADATA_DELETE_BATCH_SIZE = 500
  }
}
