package com.mymusicapp.player.widget

import com.mymusicapp.player.MainActivity
import com.mymusicapp.player.R
import android.app.PendingIntent
import android.appwidget.AppWidgetHostView
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.widget.RemoteViews
import com.doublesymmetry.kotlinaudio.models.RepeatMode
import com.doublesymmetry.kotlinaudio.notification.NotificationExtras
import com.doublesymmetry.trackplayer.model.Track
import com.doublesymmetry.trackplayer.service.MusicService
import java.util.concurrent.Executors

/**
 * The home-screen widget. Each theme's look is drawn by [WidgetPainter] into
 * one picture; invisible touch areas from widget_music.xml sit on the same
 * grid: the heart at the top right and five buttons along the bottom.
 */
class PlaybackWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    updateWidgets(context)
  }

  override fun onAppWidgetOptionsChanged(
    context: Context,
    manager: AppWidgetManager,
    appWidgetId: Int,
    newOptions: Bundle,
  ) {
    updateWidgets(context)
  }

  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    when (val action = intent.action) {
      ACTION_REFRESH -> updateWidgets(context)
      in BUTTON_ACTIONS -> performAction(context, action!!)
    }
  }

  private fun performAction(receiverContext: Context, action: String) {
    // A broadcast receiver's own context is not allowed to bind to a service.
    val context = receiverContext.applicationContext
    val result = goAsync()
    val connection = object : ServiceConnection {
      override fun onServiceConnected(name: ComponentName?, binder: IBinder?) {
        val service = (binder as? MusicService.MusicBinder)?.service
        if (service?.playerInitialized == true) {
          val uri = currentTrack(service)?.uri?.toString()
          when (action) {
            ACTION_PREVIOUS ->
              // Like in the app: past the first seconds, "previous" restarts the song.
              if (service.getPositionInSeconds() > 3.0) service.seekTo(0f) else service.skipToPrevious()
            ACTION_NEXT -> service.skipToNext()
          }
          // Changing song always plays it, even if the music was paused.
          if (action == ACTION_PREVIOUS || action == ACTION_NEXT) service.play()
          when (action) {
            ACTION_BACK -> service.seekBy(-JUMP_SECONDS)
            ACTION_FORWARD -> service.seekBy(JUMP_SECONDS)
            ACTION_TOGGLE -> if (service.playWhenReady) service.pause() else service.play()
            ACTION_REPEAT -> {
              service.setRepeatMode(
                when (service.getRepeatMode()) {
                  RepeatMode.OFF -> RepeatMode.ONE
                  RepeatMode.ONE -> RepeatMode.ALL
                  RepeatMode.ALL -> RepeatMode.OFF
                },
              )
              NotificationExtras.onAction(NotificationExtras.REPEAT, uri)
            }
            ACTION_SHUFFLE -> {
              NotificationExtras.shuffle = !NotificationExtras.shuffle
              NotificationExtras.onAction(NotificationExtras.SHUFFLE, uri)
            }
            ACTION_FAVORITE -> NotificationExtras.onAction(NotificationExtras.FAVORITE, uri)
          }
          NotificationExtras.refresh()
          updateWidgets(context)
          // The player reports the new song and state a moment later.
          Handler(Looper.getMainLooper()).postDelayed({ updateWidgets(context) }, 400)
        } else {
          context.startActivity(
            Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
          )
        }
        try {
          context.unbindService(this)
        } catch (_: IllegalArgumentException) {
        }
        result.finish()
      }

      override fun onServiceDisconnected(name: ComponentName?) = Unit
    }
    val bound = try {
      context.bindService(
        Intent(context, MusicService::class.java),
        connection,
        Context.BIND_AUTO_CREATE,
      )
    } catch (_: RuntimeException) {
      false
    }
    if (!bound) result.finish()
  }

  companion object {
    const val ACTION_REFRESH = "com.mymusicapp.player.WIDGET_REFRESH"
    private const val ACTION_PREVIOUS = "com.mymusicapp.player.WIDGET_PREVIOUS"
    private const val ACTION_TOGGLE = "com.mymusicapp.player.WIDGET_TOGGLE"
    private const val ACTION_NEXT = "com.mymusicapp.player.WIDGET_NEXT"
    private const val ACTION_BACK = "com.mymusicapp.player.WIDGET_BACK"
    private const val ACTION_FORWARD = "com.mymusicapp.player.WIDGET_FORWARD"
    private const val ACTION_SHUFFLE = "com.mymusicapp.player.WIDGET_SHUFFLE"
    private const val ACTION_REPEAT = "com.mymusicapp.player.WIDGET_REPEAT"
    private const val ACTION_FAVORITE = "com.mymusicapp.player.WIDGET_FAVORITE"
    private val BUTTON_ACTIONS = setOf(
      ACTION_PREVIOUS, ACTION_TOGGLE, ACTION_NEXT, ACTION_BACK, ACTION_FORWARD,
      ACTION_SHUFFLE, ACTION_REPEAT, ACTION_FAVORITE,
    )
    private const val JUMP_SECONDS = 10f
    private const val COVER_PIXELS = 360

    /** The size of a 4 × 2 widget on the owner's phone, in dp. */
    private const val DEFAULT_WIDTH = 324f
    private const val DEFAULT_HEIGHT = 188f

    private val drawing = Executors.newSingleThreadExecutor()
    @Volatile
    private var lastState: WidgetState? = null

    fun updateWidgets(anyContext: Context) {
      // Callers may be broadcast receivers, whose context cannot bind to a service.
      val context = anyContext.applicationContext
      val manager = AppWidgetManager.getInstance(context)
      val ids = manager.getAppWidgetIds(ComponentName(context, PlaybackWidgetProvider::class.java))
      if (ids.isEmpty()) return
      val idle = WidgetState(
        title = "Abre Mi Música para empezar",
        artist = "Tu biblioteca local",
        hasTrack = false,
        playing = false,
        favorite = false,
        shuffle = NotificationExtras.shuffle,
        repeatMode = 0,
        position = 0.0,
        duration = 0.0,
        cover = null,
      )

      val connection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName?, binder: IBinder?) {
          val service = (binder as? MusicService.MusicBinder)?.service
          val track = service?.takeIf { it.playerInitialized }?.let(::currentTrack)
          val state = if (service != null && track != null) {
            WidgetState(
              title = track.title?.takeIf(String::isNotBlank) ?: idle.title,
              artist = track.artist?.takeIf(String::isNotBlank) ?: idle.artist,
              hasTrack = true,
              playing = service.playWhenReady,
              favorite = NotificationExtras.isFavorite(track.uri?.toString()),
              shuffle = NotificationExtras.shuffle,
              repeatMode = when (service.getRepeatMode()) {
                RepeatMode.OFF -> 0
                RepeatMode.ONE -> 1
                RepeatMode.ALL -> 2
              },
              position = service.getPositionInSeconds(),
              duration = service.getDurationInSeconds(),
              cover = null,
            )
          } else {
            idle
          }
          val artwork = track?.artwork
          try {
            context.unbindService(this)
          } catch (_: IllegalArgumentException) {
          }
          drawing.execute {
            val full = state.copy(cover = artwork?.let { loadCover(context, it) })
            lastState = full
            ids.forEach { id -> manager.updateAppWidget(id, buildViews(context, manager, id, full)) }
          }
        }

        override fun onServiceDisconnected(name: ComponentName?) = Unit
      }
      val bound = try {
        context.bindService(Intent(context, MusicService::class.java), connection, Context.BIND_AUTO_CREATE)
      } catch (_: RuntimeException) {
        false
      }
      if (!bound) {
        drawing.execute {
          val state = lastState ?: idle
          ids.forEach { id -> manager.updateAppWidget(id, buildViews(context, manager, id, state)) }
        }
      }
    }

    private fun currentTrack(service: MusicService): Track? =
      service.tracks.getOrNull(service.getCurrentTrackIndex())

    private fun buildViews(
      context: Context,
      manager: AppWidgetManager,
      widgetId: Int,
      state: WidgetState,
    ): RemoteViews {
      val (width, height) = widgetSize(context, manager, widgetId)
      val look = WidgetLook.parse(
        context.getSharedPreferences("music_library", Context.MODE_PRIVATE).getString(LOOK_KEY, null),
      )
      val picture = WidgetPainter(
        context.assets,
        look,
        state,
        width,
        height,
        context.resources.displayMetrics.density,
      ).draw()
      val views = RemoteViews(context.packageName, R.layout.widget_music)
      views.setImageViewBitmap(R.id.widget_canvas, picture)
      views.setContentDescription(
        R.id.widget_root,
        if (state.hasTrack) "${state.title} de ${state.artist}. Abrir Mi Música" else "Abrir Mi Música",
      )
      views.setOnClickPendingIntent(
        R.id.widget_root,
        PendingIntent.getActivity(
          context,
          widgetId,
          Intent(context, MainActivity::class.java),
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        ),
      )
      val long = state.longAudio
      bind(views, context, widgetId, R.id.widget_shuffle, ACTION_SHUFFLE, if (state.shuffle) "Desactivar mezcla" else "Mezclar")
      bind(views, context, widgetId, R.id.widget_previous, if (long) ACTION_BACK else ACTION_PREVIOUS, if (long) "Retroceder 10 segundos" else "Canción anterior")
      bind(views, context, widgetId, R.id.widget_play, ACTION_TOGGLE, if (state.playing) "Pausar" else "Reproducir")
      bind(views, context, widgetId, R.id.widget_next, if (long) ACTION_FORWARD else ACTION_NEXT, if (long) "Avanzar 10 segundos" else "Siguiente canción")
      bind(
        views, context, widgetId, R.id.widget_repeat, ACTION_REPEAT,
        when (state.repeatMode) {
          0 -> "Activar repetir canción"
          1 -> "Activar repetir cola"
          else -> "Desactivar repetición"
        },
      )
      bind(views, context, widgetId, R.id.widget_favorite, ACTION_FAVORITE, if (state.favorite) "Quitar de favoritas" else "Añadir a favoritas")
      return views
    }

    private fun bind(views: RemoteViews, context: Context, widgetId: Int, viewId: Int, action: String, label: String) {
      views.setContentDescription(viewId, label)
      views.setOnClickPendingIntent(viewId, pendingIntent(context, widgetId, action))
    }

    /**
     * The widget's size in dp as the launcher reports it, without the padding
     * Android adds around widgets.
     */
    private fun widgetSize(context: Context, manager: AppWidgetManager, widgetId: Int): Pair<Float, Float> {
      val options = manager.getAppWidgetOptions(widgetId)
      val reportedWidth = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH)
      val reportedHeight = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT)
      if (reportedWidth <= 0 || reportedHeight <= 0) return DEFAULT_WIDTH to DEFAULT_HEIGHT
      var width = reportedWidth.toFloat()
      var height = reportedHeight.toFloat()
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val density = context.resources.displayMetrics.density
        @Suppress("DEPRECATION")
        val padding = AppWidgetHostView.getDefaultPaddingForWidget(
          context,
          ComponentName(context, PlaybackWidgetProvider::class.java),
          null,
        )
        width -= (padding.left + padding.right) / density
        height -= (padding.top + padding.bottom) / density
      }
      return width.coerceIn(200f, 600f) to height.coerceIn(150f, 400f)
    }

    /** The last cover read: the widget redraws every few seconds with the same one. */
    private var cachedCover: Pair<Uri, Bitmap?>? = null

    /** The cover as a square picture, or null if it cannot be read. */
    private fun loadCover(context: Context, uri: Uri): Bitmap? {
      cachedCover?.let { (cachedUri, bitmap) -> if (cachedUri == uri) return bitmap }
      return readCover(context, uri).also { cachedCover = uri to it }
    }

    private fun readCover(context: Context, uri: Uri): Bitmap? = try {
      val resolver = context.contentResolver
      val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
      resolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
      if (bounds.outWidth <= 0 || bounds.outHeight <= 0) {
        null
      } else {
        var sample = 1
        while (minOf(bounds.outWidth, bounds.outHeight) / (sample * 2) >= COVER_PIXELS) sample *= 2
        val source = resolver.openInputStream(uri)?.use {
          BitmapFactory.decodeStream(it, null, BitmapFactory.Options().apply { inSampleSize = sample })
        }
        source?.let {
          val side = minOf(it.width, it.height)
          val square = Bitmap.createBitmap(it, (it.width - side) / 2, (it.height - side) / 2, side, side)
          if (square !== it) it.recycle()
          square
        }
      }
    } catch (_: Exception) {
      null
    }

    /** Where the app saves the theme and palette the widget should wear. */
    const val LOOK_KEY = "widget_look"

    private fun pendingIntent(context: Context, widgetId: Int, action: String) =
      PendingIntent.getBroadcast(
        context,
        widgetId * 31 + action.hashCode(),
        Intent(context, PlaybackWidgetProvider::class.java).setAction(action),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
  }
}
