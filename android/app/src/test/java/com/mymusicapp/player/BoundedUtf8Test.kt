package com.mymusicapp.player

import java.io.ByteArrayInputStream
import java.io.IOException
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class BoundedUtf8Test {
  @Test
  fun readsUtf8WithoutCorruptingAccentsAtTheLimit() {
    val contents = "Canción y corazón"
    assertEquals(
      contents,
      readUtf8WithLimit(ByteArrayInputStream(contents.toByteArray(Charsets.UTF_8)), 128),
    )
  }

  @Test
  fun rejectsFilesOverTheByteLimit() {
    assertThrows(IOException::class.java) {
      readUtf8WithLimit(ByteArrayInputStream(byteArrayOf(1, 2, 3)), 2)
    }
  }
}
