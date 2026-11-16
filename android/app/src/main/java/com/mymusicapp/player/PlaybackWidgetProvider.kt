package com.mymusicapp.player

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.BitmapShader
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Shader
import android.net.Uri
import android.os.Build
import android.view.View
import android.util.SizeF
import android.widget.RemoteViews
import com.doublesymmetry.trackplayer.service.MusicService

class PlaybackWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    updateWidgets(context)
  }

  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    when (intent.action) {
      ACTION_REFRESH -> updateWidgets(context)
      ACTION_PREVIOUS, ACTION_TOGGLE, ACTION_NEXT -> performAction(context, intent.action!!)
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
          when (action) {
            ACTION_PREVIOUS ->
              // Like in the app: past the first seconds, "previous" restarts the song.
              if (service.getPositionInSeconds() > 3.0) service.seekTo(0f) else service.skipToPrevious()
            ACTION_NEXT -> service.skipToNext()
            ACTION_TOGGLE -> if (service.playWhenReady) service.pause() else service.play()
          }
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

    fun updateWidgets(anyContext: Context) {
      // Callers may be broadcast receivers, whose context cannot bind to a service.
      val context = anyContext.applicationContext
      val manager = AppWidgetManager.getInstance(context)
      val ids = manager.getAppWidgetIds(ComponentName(context, PlaybackWidgetProvider::class.java))
      if (ids.isEmpty()) return
      val showIdle = {
        ids.forEach { id -> manager.updateAppWidget(id, buildViews(context, id, null, false, null)) }
      }

      val connection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName?, binder: IBinder?) {
          val service = (binder as? MusicService.MusicBinder)?.service
          val track = if (service?.playerInitialized == true) {
            val index = service.getCurrentTrackIndex()
            service.tracks.getOrNull(index)
          } else null
          val playing = service?.playerInitialized == true && service.playWhenReady
          val artwork = track?.artwork
          // Decoding the cover must not hold up the main thread.
          Thread {
            val cover = artwork?.let { loadCover(context, it) }
            ids.forEach { widgetId ->
              manager.updateAppWidget(widgetId, buildViews(context, widgetId, track, playing, cover))
            }
          }.start()
          try {
            context.unbindService(this)
          } catch (_: IllegalArgumentException) {
          }
        }

        override fun onServiceDisconnected(name: ComponentName?) = Unit
      }
      // The widget keeps showing the last song until the player answers, so it
      // does not blink on every update.
      val bound = try {
        context.bindService(Intent(context, MusicService::class.java), connection, Context.BIND_AUTO_CREATE)
      } catch (_: RuntimeException) {
        false
      }
      if (!bound) showIdle()
    }

    private fun buildViews(
      context: Context,
      widgetId: Int,
      track: com.doublesymmetry.trackplayer.model.Track?,
      playing: Boolean,
      cover: Bitmap?,
    ): RemoteViews {
      val colors = readColors(context)
      val expanded =
        layoutViews(context, widgetId, track, playing, cover, colors, R.layout.widget_music, compact = false)
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return expanded
      val compact =
        layoutViews(context, widgetId, track, playing, cover, colors, R.layout.widget_music_compact, compact = true)
      return RemoteViews(
        mapOf(
          SizeF(160f, 72f) to compact,
          SizeF(250f, 110f) to expanded,
        ),
      )
    }

    private fun layoutViews(
      context: Context,
      widgetId: Int,
      track: com.doublesymmetry.trackplayer.model.Track?,
      playing: Boolean,
      cover: Bitmap?,
      colors: WidgetColors,
      layoutId: Int,
      compact: Boolean,
    ): RemoteViews {
      val views = RemoteViews(context.packageName, layoutId)
      val state = widgetPlaybackState(track?.title, track?.artist, playing)
      views.setTextViewText(R.id.widget_title, state.title)
      views.setTextViewText(R.id.widget_artist, state.artist)
      views.setTextColor(R.id.widget_title, colors.text)
      views.setTextColor(R.id.widget_artist, colors.secondary)
      views.setInt(R.id.widget_background, "setColorFilter", colors.background)
      views.setInt(R.id.widget_cover_empty, "setColorFilter", blend(colors.background, colors.text, 0.12f))
      views.setInt(R.id.widget_cover_icon, "setColorFilter", colors.secondary)
      views.setInt(R.id.widget_play_background, "setColorFilter", colors.button)
      views.setInt(R.id.widget_play, "setColorFilter", colors.onButton)
      if (cover != null) {
        views.setImageViewBitmap(R.id.widget_cover, cover)
        views.setViewVisibility(R.id.widget_cover, View.VISIBLE)
      } else {
        views.setViewVisibility(R.id.widget_cover, View.GONE)
      }
      views.setImageViewResource(
        R.id.widget_play,
        if (state.isPlaying) R.drawable.ic_widget_pause else R.drawable.ic_widget_play,
      )
      views.setContentDescription(
        R.id.widget_play,
        if (state.isPlaying) "Pausar" else "Reproducir",
      )
      views.setOnClickPendingIntent(R.id.widget_play, pendingIntent(context, widgetId, ACTION_TOGGLE))
      if (!compact) {
        views.setInt(R.id.widget_previous, "setColorFilter", colors.text)
        views.setInt(R.id.widget_next, "setColorFilter", colors.text)
        views.setOnClickPendingIntent(R.id.widget_previous, pendingIntent(context, widgetId, ACTION_PREVIOUS))
        views.setOnClickPendingIntent(R.id.widget_next, pendingIntent(context, widgetId, ACTION_NEXT))
      }
      views.setOnClickPendingIntent(
        R.id.widget_root,
        PendingIntent.getActivity(
          context,
          widgetId,
          Intent(context, MainActivity::class.java),
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        ),
      )
      return views
    }

    private fun readColors(context: Context): WidgetColors {
      val preferences = context.getSharedPreferences("music_library", Context.MODE_PRIVATE)
      return WidgetColors.parse(WIDGET_COLOR_KEYS.map { preferences.getString(it, null) })
    }

    private fun blend(from: Int, to: Int, amount: Float): Int {
      fun channel(shift: Int): Int {
        val a = (from shr shift) and 0xff
        val b = (to shr shift) and 0xff
        return (a + (b - a) * amount).toInt().coerceIn(0, 255)
      }
      return (0xFF shl 24) or (channel(16) shl 16) or (channel(8) shl 8) or channel(0)
    }

    private var lastCover: Pair<String, Bitmap>? = null

    /** The cover as a small square with rounded corners, or null if it cannot be read. */
    private fun loadCover(context: Context, uri: Uri): Bitmap? {
      val key = uri.toString()
      lastCover?.takeIf { it.first == key }?.let { return it.second }
      return try {
        val resolver = context.contentResolver
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        resolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null
        var sample = 1
        while (minOf(bounds.outWidth, bounds.outHeight) / (sample * 2) >= COVER_PIXELS) sample *= 2
        val source = resolver.openInputStream(uri)?.use {
          BitmapFactory.decodeStream(it, null, BitmapFactory.Options().apply { inSampleSize = sample })
        } ?: return null
        val side = minOf(source.width, source.height)
        val square = Bitmap.createBitmap(source, (source.width - side) / 2, (source.height - side) / 2, side, side)
        val scaled = Bitmap.createScaledBitmap(square, COVER_PIXELS, COVER_PIXELS, true)
        val rounded = Bitmap.createBitmap(COVER_PIXELS, COVER_PIXELS, Bitmap.Config.ARGB_8888)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
          shader = BitmapShader(scaled, Shader.TileMode.CLAMP, Shader.TileMode.CLAMP)
        }
        val radius = COVER_PIXELS * 14f / 84f
        Canvas(rounded).drawRoundRect(
          RectF(0f, 0f, COVER_PIXELS.toFloat(), COVER_PIXELS.toFloat()),
          radius,
          radius,
          paint,
        )
        rounded.also { lastCover = key to it }
      } catch (_: Exception) {
        null
      }
    }

    private const val COVER_PIXELS = 252
    val WIDGET_COLOR_KEYS = listOf(
      "widget_background",
      "widget_text",
      "widget_secondary",
      "widget_button",
      "widget_on_button",
    )

    private fun pendingIntent(context: Context, widgetId: Int, action: String) =
      PendingIntent.getBroadcast(
        context,
        widgetId + action.hashCode(),
        Intent(context, PlaybackWidgetProvider::class.java).setAction(action),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
  }
}
