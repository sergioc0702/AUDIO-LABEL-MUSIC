package com.mymusicapp.player.widget

/** Reads a "#rrggbb" color; anything else is null. */
internal fun parseHexColor(value: String?): Int? {
  if (value == null || value.length != 7 || value[0] != '#') return null
  val rgb = value.substring(1).toIntOrNull(16) ?: return null
  return 0xFF000000.toInt() or rgb
}
