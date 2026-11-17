package com.mymusicapp.player.widget

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class WidgetPlaybackStateTest {
  @Test
  fun readsPaletteColors() {
    assertEquals(0xFF101112.toInt(), parseHexColor("#101112"))
    assertEquals(0xFFFF7A59.toInt(), parseHexColor("#ff7a59"))
  }

  @Test
  fun rejectsColorsItCannotRead() {
    assertNull(parseHexColor(null))
    assertNull(parseHexColor("#12345"))
    assertNull(parseHexColor("#zzzzzz"))
    assertNull(parseHexColor("rgb(1,2,3)"))
  }

  @Test
  fun songsOfTwentyMinutesOrMoreJumpInsteadOfSkipping() {
    fun state(duration: Double, position: Double = 0.0) = WidgetState(
      "Canción", "Artista", true, true, false, false, 0, position, duration, null,
    )
    assertEquals(false, state(19 * 60.0).longAudio)
    assertEquals(true, state(20 * 60.0).longAudio)
    assertEquals(0.5f, state(200.0, 100.0).progress)
    assertEquals(0f, state(0.0, 30.0).progress)
  }
}
