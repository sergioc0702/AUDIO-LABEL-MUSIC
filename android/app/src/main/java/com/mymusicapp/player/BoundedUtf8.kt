package com.mymusicapp.player

import java.io.ByteArrayOutputStream
import java.io.IOException
import java.io.InputStream

internal fun readUtf8WithLimit(input: InputStream, maxBytes: Int): String {
  require(maxBytes >= 0)
  return input.use { stream ->
    val output = ByteArrayOutputStream()
    val buffer = ByteArray(8192)
    var total = 0
    while (true) {
      val count = stream.read(buffer)
      if (count < 0) break
      total += count
      if (total > maxBytes) {
        throw IOException("El archivo supera el tamaño permitido.")
      }
      output.write(buffer, 0, count)
    }
    String(output.toByteArray(), Charsets.UTF_8)
  }
}
