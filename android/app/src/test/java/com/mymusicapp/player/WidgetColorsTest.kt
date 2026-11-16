package com.mymusicapp.player

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class WidgetColorsTest {
  @Test
  fun readsThePaletteColors() {
    val colors = WidgetColors.parse(listOf("#101112", "#ffffff", "#c0c0c0", "#ff7a59", "#2a0a03"))
    assertEquals(0xFF101112.toInt(), colors.background)
    assertEquals(0xFFFFFFFF.toInt(), colors.text)
    assertEquals(0xFFFF7A59.toInt(), colors.button)
    assertEquals(0xFF2A0A03.toInt(), colors.onButton)
  }

  @Test
  fun keepsTheDefaultLookWhenAColorIsMissingOrWrong() {
    assertEquals(WidgetColors.DEFAULT, WidgetColors.parse(listOf(null, null, null, null, null)))
    assertEquals(
      WidgetColors.DEFAULT,
      WidgetColors.parse(listOf("#101112", "#ffffff", "rgb(1,2,3)", "#ff7a59", "#2a0a03")),
    )
    assertNull(parseHexColor("#12345"))
    assertNull(parseHexColor("#zzzzzz"))
  }
}
