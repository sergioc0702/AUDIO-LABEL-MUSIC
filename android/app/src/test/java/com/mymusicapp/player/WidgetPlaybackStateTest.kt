package com.mymusicapp.player

import org.junit.Assert.assertEquals
import org.junit.Test

class WidgetPlaybackStateTest {
  @Test
  fun usesCurrentTrackAndPlaybackState() {
    assertEquals(
      WidgetPlaybackState("Canción", "Artista", true),
      widgetPlaybackState("Canción", "Artista", true),
    )
  }

  @Test
  fun showsHelpfulEmptyStateAndPauseState() {
    assertEquals(
      WidgetPlaybackState("Abre Mi Música para empezar", "Tu biblioteca local", false),
      widgetPlaybackState(null, null, false),
    )
  }
}
