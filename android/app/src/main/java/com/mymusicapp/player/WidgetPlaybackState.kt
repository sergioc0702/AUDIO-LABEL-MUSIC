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

/** The colors of the widget, as ARGB ints. They follow the palette chosen in the app. */
internal data class WidgetColors(
  val background: Int,
  val text: Int,
  val secondary: Int,
  val button: Int,
  val onButton: Int,
) {
  companion object {
    val DEFAULT = WidgetColors(
      background = 0xFF202126.toInt(),
      text = 0xFFFFFFFF.toInt(),
      secondary = 0xFFC4C5CC.toInt(),
      button = 0xFFFFFFFF.toInt(),
      onButton = 0xFF202126.toInt(),
    )

    /** Reads "#rrggbb" colors; anything else keeps the default look. */
    fun parse(values: List<String?>): WidgetColors {
      val colors = values.map(::parseHexColor)
      if (colors.size != 5 || colors.any { it == null }) return DEFAULT
      return WidgetColors(colors[0]!!, colors[1]!!, colors[2]!!, colors[3]!!, colors[4]!!)
    }
  }
}

internal fun parseHexColor(value: String?): Int? {
  if (value == null || value.length != 7 || value[0] != '#') return null
  val rgb = value.substring(1).toIntOrNull(16) ?: return null
  return 0xFF000000.toInt() or rgb
}
