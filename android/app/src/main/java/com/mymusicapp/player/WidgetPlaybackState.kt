package com.mymusicapp.player

internal data class WidgetPlaybackState(
  val title: String,
  val artist: String,
  val isPlaying: Boolean,
)

internal fun widgetPlaybackState(
  title: String?,
  artist: String?,
  isPlaying: Boolean,
) = WidgetPlaybackState(
  title = title?.takeIf(String::isNotBlank) ?: "Abre Mi Música para empezar",
  artist = artist?.takeIf(String::isNotBlank) ?: "Tu biblioteca local",
  isPlaying = isPlaying,
)
