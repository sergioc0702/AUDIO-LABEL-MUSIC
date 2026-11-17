package com.mymusicapp.player.library

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.net.Uri
import java.io.File
import java.io.FileOutputStream

/**
 * The cover turned into pixel art for the Terminal theme: a centered square,
 * a 4 × 4 Bayer dither and a few shades between two palette colors. Each
 * result is cached as a PNG.
 */
internal object PixelCover {
  private const val PIXEL_SHADES = 6
  private val BAYER = floatArrayOf(0f, 8f, 2f, 10f, 12f, 4f, 14f, 6f, 3f, 11f, 1f, 9f, 15f, 7f, 13f, 5f)

  fun make(context: Context, uri: Uri, size: Int, dark: Int, light: Int): String? {
    val directory = File(context.cacheDir, "pixel-covers").apply { mkdirs() }
    val name = "${"$uri|$size|$dark|$light".hashCode().toUInt().toString(16)}-$size.png"
    val file = File(directory, name)
    if (file.isFile && file.length() > 0) return Uri.fromFile(file).toString()

    val resolver = context.contentResolver
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    resolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
    if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null
    var sample = 1
    while (minOf(bounds.outWidth, bounds.outHeight) / (sample * 2) >= size * 4) sample *= 2
    val source = resolver.openInputStream(uri)?.use {
      BitmapFactory.decodeStream(it, null, BitmapFactory.Options().apply { inSampleSize = sample })
    } ?: return null

    val side = minOf(source.width, source.height)
    val square = Bitmap.createBitmap(source, (source.width - side) / 2, (source.height - side) / 2, side, side)
    val small = Bitmap.createScaledBitmap(square, size, size, true)
    val pixels = IntArray(size * size)
    small.getPixels(pixels, 0, size, 0, 0, size, size)
    if (small !== square) small.recycle()
    if (square !== source) square.recycle()
    source.recycle()

    // Light level of each pixel, stretched so the darkest and brightest
    // parts of the cover use the whole range of shades.
    val levels = FloatArray(pixels.size) { index ->
      val color = pixels[index]
      (((color shr 16) and 0xff) * 0.299f + ((color shr 8) and 0xff) * 0.587f + (color and 0xff) * 0.114f) / 255f
    }
    val sorted = levels.sortedArray()
    val low = sorted[(sorted.size * 0.02f).toInt()]
    val high = sorted[((sorted.size - 1) * 0.98f).toInt()].coerceAtLeast(low + 0.05f)

    val shades = PIXEL_SHADES
    val palette = IntArray(shades) { step -> blend(dark, light, step / (shades - 1f)) }
    for (y in 0 until size) {
      for (x in 0 until size) {
        val index = y * size + x
        val level = ((levels[index] - low) / (high - low)).coerceIn(0f, 1f)
        val threshold = (BAYER[(y % 4) * 4 + x % 4] + 0.5f) / 16f - 0.5f
        val shade = (level * (shades - 1) + threshold).toInt().coerceIn(0, shades - 1)
        pixels[index] = palette[shade]
      }
    }
    val art = Bitmap.createBitmap(pixels, size, size, Bitmap.Config.ARGB_8888)
    val scale = (512 / size).coerceAtLeast(1)
    val large = Bitmap.createScaledBitmap(art, size * scale, size * scale, false)
    try {
      val partial = File(directory, "$name.part")
      FileOutputStream(partial).use { large.compress(Bitmap.CompressFormat.PNG, 100, it) }
      if (!partial.renameTo(file)) {
        partial.delete()
        return null
      }
    } finally {
      if (large !== art) large.recycle()
      art.recycle()
    }
    return Uri.fromFile(file).toString()
  }

  private fun blend(from: Int, to: Int, amount: Float): Int {
    fun channel(shift: Int): Int {
      val a = (from shr shift) and 0xff
      val b = (to shr shift) and 0xff
      return (a + (b - a) * amount).toInt().coerceIn(0, 255)
    }
    return Color.rgb(channel(16), channel(8), channel(0))
  }
}
