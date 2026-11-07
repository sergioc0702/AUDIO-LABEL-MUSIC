package com.mymusicapp.player

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.IBinder
import android.os.Build
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

  private fun performAction(context: Context, action: String) {
    val result = goAsync()
    val connection = object : ServiceConnection {
      override fun onServiceConnected(name: ComponentName?, binder: IBinder?) {
        val service = (binder as? MusicService.MusicBinder)?.service
        if (service?.playerInitialized == true) {
          when (action) {
            ACTION_PREVIOUS -> service.skipToPrevious()
            ACTION_NEXT -> service.skipToNext()
            ACTION_TOGGLE -> if (service.playWhenReady) service.pause() else service.play()
          }
          updateWidgets(context)
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
    val bound = context.bindService(
      Intent(context, MusicService::class.java),
      connection,
      Context.BIND_AUTO_CREATE,
    )
    if (!bound) result.finish()
  }

  companion object {
    const val ACTION_REFRESH = "com.mymusicapp.player.WIDGET_REFRESH"
    private const val ACTION_PREVIOUS = "com.mymusicapp.player.WIDGET_PREVIOUS"
    private const val ACTION_TOGGLE = "com.mymusicapp.player.WIDGET_TOGGLE"
    private const val ACTION_NEXT = "com.mymusicapp.player.WIDGET_NEXT"

    fun updateWidgets(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val ids = manager.getAppWidgetIds(ComponentName(context, PlaybackWidgetProvider::class.java))
      if (ids.isEmpty()) return
      ids.forEach { id -> manager.updateAppWidget(id, buildViews(context, id, null, false)) }

      val connection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName?, binder: IBinder?) {
          val service = (binder as? MusicService.MusicBinder)?.service
          val track = if (service?.playerInitialized == true) {
            val index = service.getCurrentTrackIndex()
            service.tracks.getOrNull(index)
          } else null
          val playing = service?.playerInitialized == true && service.playWhenReady
          ids.forEach { widgetId ->
            manager.updateAppWidget(widgetId, buildViews(context, widgetId, track, playing))
          }
          try {
            context.unbindService(this)
          } catch (_: IllegalArgumentException) {
          }
        }

        override fun onServiceDisconnected(name: ComponentName?) = Unit
      }
      context.bindService(Intent(context, MusicService::class.java), connection, Context.BIND_AUTO_CREATE)
    }

    private fun buildViews(
      context: Context,
      widgetId: Int,
      track: com.doublesymmetry.trackplayer.model.Track?,
      playing: Boolean,
    ): RemoteViews {
      val expanded = layoutViews(context, widgetId, track, playing, R.layout.widget_music, compact = false)
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return expanded
      val compact = layoutViews(context, widgetId, track, playing, R.layout.widget_music_compact, compact = true)
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
      layoutId: Int,
      compact: Boolean,
    ): RemoteViews {
      val views = RemoteViews(context.packageName, layoutId)
      val state = widgetPlaybackState(track?.title, track?.artist, playing)
      views.setTextViewText(R.id.widget_title, state.title)
      views.setTextViewText(R.id.widget_artist, state.artist)
      views.setImageViewResource(
        R.id.widget_play,
        if (state.isPlaying) android.R.drawable.ic_media_pause else android.R.drawable.ic_media_play,
      )
      views.setOnClickPendingIntent(R.id.widget_play, pendingIntent(context, widgetId, ACTION_TOGGLE))
      if (!compact) {
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

    private fun pendingIntent(context: Context, widgetId: Int, action: String) =
      PendingIntent.getBroadcast(
        context,
        widgetId + action.hashCode(),
        Intent(context, PlaybackWidgetProvider::class.java).setAction(action),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
  }
}
