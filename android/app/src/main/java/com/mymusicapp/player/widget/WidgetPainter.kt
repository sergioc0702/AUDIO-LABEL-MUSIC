package com.mymusicapp.player.widget

import android.content.res.AssetManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.DashPathEffect
import android.graphics.LinearGradient
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RadialGradient
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.Typeface
import android.text.TextPaint
import android.text.TextUtils
import androidx.core.graphics.PathParser
import org.json.JSONObject
import kotlin.math.max
import kotlin.math.min

/** What the widget shows right now. */
internal data class WidgetState(
  val title: String,
  val artist: String,
  val hasTrack: Boolean,
  val playing: Boolean,
  val favorite: Boolean,
  val shuffle: Boolean,
  /** 0 off, 1 repeat the song, 2 repeat the queue. */
  val repeatMode: Int,
  val position: Double,
  val duration: Double,
  val cover: Bitmap?,
) {
  /** Podcasts and audiobooks jump a few seconds instead of changing song. */
  val longAudio get() = duration >= LONG_AUDIO_SECONDS
  val progress get() = if (duration > 0) (position / duration).coerceIn(0.0, 1.0).toFloat() else 0f

  companion object {
    const val LONG_AUDIO_SECONDS = 20 * 60.0
  }
}

/** The active theme as the app saved it: its id, palette colors and fonts. */
internal class WidgetLook(
  val theme: String,
  private val colors: Map<String, Int>,
  val display: String?,
  val body: String?,
) {
  fun color(key: String, fallback: Int) = colors[key] ?: fallback
  fun has(key: String) = key in colors

  companion object {
    val DEFAULT = WidgetLook("estandar", emptyMap(), null, null)

    /** Reads what the app saved; anything broken falls back to the standard look. */
    fun parse(json: String?): WidgetLook {
      if (json.isNullOrBlank()) return DEFAULT
      return try {
        val root = JSONObject(json)
        val colors = mutableMapOf<String, Int>()
        listOf("colors", "skin").forEach { group ->
          val values = root.optJSONObject(group) ?: return@forEach
          values.keys().forEach { key ->
            val prefix = if (group == "skin") "skin." else ""
            parseHexColor(values.optString(key))?.let { colors[prefix + key] = it }
          }
        }
        WidgetLook(
          root.optString("theme", "estandar"),
          colors,
          root.optString("display").takeIf { it.isNotBlank() },
          root.optString("body").takeIf { it.isNotBlank() },
        )
      } catch (_: Exception) {
        DEFAULT
      }
    }
  }
}

internal enum class WidgetButton { SHUFFLE, PREVIOUS, PLAY, NEXT, REPEAT }

/**
 * Draws the whole widget of a theme into one bitmap. The layout is the same
 * for every theme, in dp: a 12 dp margin, the cover on the left (108 dp at the
 * usual 324 × 188 size), title, artist and heart beside it with the progress
 * aligned to the cover's bottom, and five equal 44 dp buttons below.
 * widget_music.xml places its touch areas on the same grid.
 */
internal class WidgetPainter(
  private val assets: AssetManager,
  private val look: WidgetLook,
  private val state: WidgetState,
  private val width: Float,
  private val height: Float,
  private val density: Float,
) {
  private lateinit var canvas: Canvas
  private val pad = 12f
  private val gap = 12f
  private val buttonHeight = 44f
  private val coverSize get() = height - pad * 2 - gap - buttonHeight
  private val coverRect get() = RectF(pad, pad, pad + coverSize, pad + coverSize)
  private val infoLeft get() = pad + coverSize + gap
  private val infoRight get() = width - pad
  private val heartRect get() = RectF(infoRight - 32f, pad, infoRight, pad + 32f)
  private val buttonTop get() = height - pad - buttonHeight

  fun draw(): Bitmap {
    val bitmap = Bitmap.createBitmap(
      (width * density).toInt().coerceAtLeast(1),
      (height * density).toInt().coerceAtLeast(1),
      Bitmap.Config.ARGB_8888,
    )
    canvas = Canvas(bitmap)
    canvas.scale(density, density)
    when (look.theme) {
      "kawaii" -> kawaii()
      "brutalista" -> brutalista()
      "terminal" -> terminal()
      "tornamesa" -> tornamesa()
      "mixtape" -> mixtape()
      "taquilla" -> taquilla()
      "pixel" -> pixel()
      "vaporwave" -> vaporwave()
      "manga" -> manga()
      "naveespacial" -> nave()
      "constelacion" -> constelacion()
      "cyberpunk" -> cyberpunk()
      "terror" -> terror()
      "bloques" -> bloques()
      "poder" -> poder()
      else -> estandar()
    }
    return bitmap
  }

  // ---- colors and fonts ----

  private fun c(key: String, fallback: Int) = look.color(key, fallback)
  private fun s(key: String, fallback: Int) = look.color("skin.$key", fallback)
  private val surface get() = c("surface", 0xFF1D1D21.toInt())
  private val surfaceHigh get() = c("surfaceHigh", 0xFF2B2B31.toInt())
  private val outline get() = c("outline", 0xFF3B3B43.toInt())
  private val text get() = c("text", 0xFFFFFFFF.toInt())
  private val sub get() = c("textSecondary", 0xFFB6B6BE.toInt())
  private val accent get() = c("accent", 0xFFFF7A59.toInt())
  private val onAccent get() = c("onAccent", 0xFF2A0A03.toInt())
  private val control get() = c("control", 0xFFFFFFFF.toInt())
  private val onControl get() = c("onControl", 0xFF121214.toInt())
  private val background get() = c("background", 0xFF121214.toInt())

  private fun font(name: String?, bold: Boolean = false): Typeface =
    name?.let { loadFont(assets, it) } ?: if (bold) Typeface.DEFAULT_BOLD else Typeface.DEFAULT

  private val display get() = font(look.display, bold = true)
  private val body get() = font(look.body)

  // ---- drawing helpers ----

  private fun paint(color: Int) = Paint(Paint.ANTI_ALIAS_FLAG).apply { this.color = color }

  private fun rect(r: RectF, color: Int, radius: Float = 0f) {
    canvas.drawRoundRect(r, radius, radius, paint(color))
  }

  private fun frame(r: RectF, color: Int, width: Float, radius: Float = 0f) {
    val half = width / 2
    val inset = RectF(r.left + half, r.top + half, r.right - half, r.bottom - half)
    canvas.drawRoundRect(inset, max(0f, radius - half), max(0f, radius - half), paint(color).apply {
      style = Paint.Style.STROKE
      strokeWidth = width
    })
  }

  private fun circle(cx: Float, cy: Float, r: Float, color: Int) = canvas.drawCircle(cx, cy, r, paint(color))

  private fun ring(cx: Float, cy: Float, r: Float, color: Int, width: Float, dash: FloatArray? = null) {
    canvas.drawCircle(cx, cy, r, paint(color).apply {
      style = Paint.Style.STROKE
      strokeWidth = width
      dash?.let { pathEffect = DashPathEffect(it, 0f) }
    })
  }

  private fun line(x1: Float, y1: Float, x2: Float, y2: Float, color: Int, width: Float, dash: FloatArray? = null) {
    canvas.drawLine(x1, y1, x2, y2, paint(color).apply {
      strokeWidth = width
      strokeCap = Paint.Cap.ROUND
      dash?.let { pathEffect = DashPathEffect(it, 0f) }
    })
  }

  private fun alpha(color: Int, amount: Float) =
    (((color ushr 24) * amount).toInt().coerceIn(0, 255) shl 24) or (color and 0xFFFFFF)

  private fun blend(from: Int, to: Int, amount: Float): Int {
    fun ch(shift: Int): Int {
      val a = (from shr shift) and 0xff
      val b = (to shr shift) and 0xff
      return (a + (b - a) * amount).toInt().coerceIn(0, 255)
    }
    return (0xFF shl 24) or (ch(16) shl 16) or (ch(8) shl 8) or ch(0)
  }

  private fun darker(color: Int, amount: Float = 0.3f) = blend(color, 0xFF000000.toInt(), amount)

  /** Clips the drawing to a rounded rectangle until [block] ends. */
  private fun clipped(r: RectF, radius: Float, block: () -> Unit) {
    canvas.save()
    canvas.clipPath(Path().apply { addRoundRect(r, radius, radius, Path.Direction.CW) })
    block()
    canvas.restore()
  }

  /** Draws a line of text with its top at [top]; too long ends in "…". */
  private fun label(
    value: String,
    left: Float,
    top: Float,
    size: Float,
    color: Int,
    typeface: Typeface,
    maxWidth: Float = infoRight - left,
    spacing: Float = 0f,
    upper: Boolean = false,
    center: Boolean = false,
  ): Float {
    val painter = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
      this.color = color
      textSize = size
      this.typeface = typeface
      letterSpacing = spacing
    }
    val shown = TextUtils.ellipsize(if (upper) value.uppercase() else value, painter, maxWidth, TextUtils.TruncateAt.END).toString()
    val metrics = painter.fontMetrics
    val x = if (center) left + (maxWidth - painter.measureText(shown)) / 2 else left
    canvas.drawText(shown, x, top - metrics.ascent, painter)
    return top + (metrics.descent - metrics.ascent) * 1.08f
  }

  private fun textWidth(value: String, size: Float, typeface: Typeface) =
    Paint().apply { textSize = size; this.typeface = typeface }.measureText(value)

  private fun icon(paths: List<IconPath>, cx: Float, cy: Float, size: Float, color: Int, alpha: Float = 1f) {
    canvas.save()
    canvas.translate(cx - size / 2, cy - size / 2)
    canvas.scale(size / 24f, size / 24f)
    paths.forEach { part ->
      val p = paint(alpha(color, alpha))
      if (part.stroke > 0f) {
        p.style = Paint.Style.STROKE
        p.strokeWidth = part.stroke
        p.strokeCap = Paint.Cap.ROUND
        p.strokeJoin = Paint.Join.ROUND
      }
      canvas.drawPath(iconPath(part.data), p)
    }
    canvas.restore()
  }

  private fun buttonIcon(kind: WidgetButton, sharp: Boolean = false, doubled: Boolean = false): List<IconPath> = when (kind) {
    WidgetButton.SHUFFLE -> listOf(IconPath(if (sharp) SHUFFLE_SHARP else SHUFFLE, 2.4f))
    WidgetButton.REPEAT -> {
      val base = IconPath(if (sharp) REPEAT_SHARP else REPEAT, 2.4f)
      if (state.repeatMode == 1) listOf(base, IconPath(REPEAT_ONE, 2f)) else listOf(base)
    }
    WidgetButton.PLAY -> listOf(IconPath(if (state.playing) PAUSE else PLAY))
    WidgetButton.PREVIOUS ->
      if (state.longAudio) BACK10 else listOf(IconPath(if (doubled) PREVIOUS_DOUBLE else PREVIOUS))
    WidgetButton.NEXT ->
      if (state.longAudio) FORWARD10 else listOf(IconPath(if (doubled) NEXT_DOUBLE else NEXT))
  }

  /** Shuffle and repeat look dimmer while they are off. */
  private fun buttonAlpha(kind: WidgetButton) = when (kind) {
    WidgetButton.SHUFFLE -> if (state.shuffle) 1f else 0.5f
    WidgetButton.REPEAT -> if (state.repeatMode != 0) 1f else 0.5f
    else -> 1f
  }

  private fun buttons(draw: (RectF, WidgetButton) -> Unit) {
    val each = (width - pad * 2 - 8f * 4) / 5
    WidgetButton.values().forEachIndexed { index, kind ->
      val left = pad + index * (each + 8f)
      draw(RectF(left, buttonTop, left + each, buttonTop + buttonHeight), kind)
    }
  }

  private fun centeredIcon(r: RectF, kind: WidgetButton, color: Int, size: Float, sharp: Boolean = false, doubled: Boolean = false) =
    icon(buttonIcon(kind, sharp, doubled), r.centerX(), r.centerY(), size, color, buttonAlpha(kind))

  private fun heart(color: Int, r: RectF = heartRect, size: Float = 17f, shape: String = HEART) {
    val paths = if (state.favorite || shape != HEART) listOf(IconPath(shape)) else listOf(IconPath(HEART, 2f))
    icon(paths, r.centerX(), r.centerY(), size, color, if (state.favorite || shape == HEART) 1f else 0.55f)
  }

  /** The song's cover, or a note drawn in the palette when it has none. */
  private fun cover(r: RectF, radius: Float, placeholder: Int = accent, mark: Int = onAccent) {
    clipped(r, radius) {
      val art = state.cover
      if (art != null) {
        val matrix = Matrix().apply {
          val scale = max(r.width() / art.width, r.height() / art.height)
          setScale(scale, scale)
          postTranslate(r.centerX() - art.width * scale / 2, r.centerY() - art.height * scale / 2)
        }
        canvas.drawBitmap(art, matrix, Paint(Paint.FILTER_BITMAP_FLAG or Paint.ANTI_ALIAS_FLAG))
      } else {
        canvas.drawRect(r, paint(placeholder))
        icon(listOf(IconPath(NOTE)), r.centerX(), r.centerY(), min(r.width(), r.height()) * 0.42f, mark)
      }
    }
  }

  private fun circleCover(cx: Float, cy: Float, r: Float, placeholder: Int = accent, mark: Int = onAccent) {
    canvas.save()
    canvas.clipPath(Path().apply { addCircle(cx, cy, r, Path.Direction.CW) })
    cover(RectF(cx - r, cy - r, cx + r, cy + r), 0f, placeholder, mark)
    canvas.restore()
  }

  /** The cover as big square pixels, for the retro themes. */
  private fun pixelCover(r: RectF, cells: Int, tones: List<Int>) {
    val art = state.cover
    val cell = r.width() / cells
    if (art == null) {
      for (y in 0 until cells) for (x in 0 until cells) {
        val tone = tones[(x * 7 + y * 3 + x * y) % tones.size]
        canvas.drawRect(r.left + x * cell, r.top + y * cell, r.left + (x + 1) * cell - 1f, r.top + (y + 1) * cell - 1f, paint(tone))
      }
      return
    }
    val small = Bitmap.createScaledBitmap(art, cells, cells, true)
    for (y in 0 until cells) for (x in 0 until cells) {
      val pixel = small.getPixel(x, y)
      val light = ((pixel shr 16 and 0xff) * 0.3f + (pixel shr 8 and 0xff) * 0.59f + (pixel and 0xff) * 0.11f) / 255f
      val tone = tones[((1f - light) * (tones.size - 1) + 0.5f).toInt().coerceIn(0, tones.size - 1)]
      canvas.drawRect(r.left + x * cell, r.top + y * cell, r.left + (x + 1) * cell - 1f, r.top + (y + 1) * cell - 1f, paint(tone))
    }
    if (small !== art) small.recycle()
  }

  private fun progressBar(top: Float, height: Float, track: Int, fill: Int, radius: Float, left: Float = infoLeft, right: Float = infoRight) {
    rect(RectF(left, top, right, top + height), track, radius)
    if (state.progress > 0f) {
      rect(RectF(left, top, left + (right - left) * state.progress, top + height), fill, radius)
    }
  }

  private fun segments(top: Float, height: Float, count: Int, on: Int, off: Int, gap: Float = 2f, outlined: Boolean = false) {
    val each = (infoRight - infoLeft - gap * (count - 1)) / count
    val lit = (state.progress * count + 0.5f).toInt()
    for (index in 0 until count) {
      val left = infoLeft + index * (each + gap)
      val r = RectF(left, top, left + each, top + height)
      if (index < lit) rect(r, on) else if (outlined) frame(r, on, 2f) else rect(r, off)
    }
  }

  private fun times(top: Float, size: Float, color: Int, typeface: Typeface, long: Boolean = false, prefix: String = "", spacing: Float = 0f) {
    val start = prefix + formatTime(state.position, long)
    val end = formatTime(state.duration, long)
    label(start, infoLeft, top, size, color, typeface, spacing = spacing)
    val endWidth = textWidth(end, size, typeface) * (1 + spacing)
    label(end, infoRight - endWidth, top, size, color, typeface, maxWidth = endWidth + 2f, spacing = spacing)
  }

  private val titleWidth get() = heartRect.left - 6f - infoLeft
  private val coverBottom get() = pad + coverSize

  // ---- themes ----

  private fun estandar() {
    rect(RectF(0f, 0f, width, height), surface, 24f)
    cover(coverRect, 16f)
    var y = label(state.title, infoLeft, pad, 16f, text, Typeface.DEFAULT_BOLD, titleWidth)
    label(state.artist, infoLeft, y, 13f, sub, Typeface.DEFAULT, titleWidth)
    heart(accent, size = 20f)
    progressBar(coverBottom - 19f, 4f, outline, accent, 2f)
    times(coverBottom - 13f, 11f, sub, Typeface.DEFAULT)
    buttons { r, kind ->
      val play = kind == WidgetButton.PLAY
      rect(r, if (play) control else surfaceHigh, 22f)
      centeredIcon(r, kind, if (play) onControl else if (kind == WidgetButton.SHUFFLE || kind == WidgetButton.REPEAT) sub else text, if (play) 20f else 19f)
    }
  }

  private fun kawaii() {
    val ring = s("ring", outline)
    val soft = s("soft", surfaceHigh)
    val lazo = s("lazo", accent)
    rect(RectF(0f, 0f, width, height), surface, 32f)
    frame(RectF(0f, 0f, width, height), ring, 3f, 32f)
    val cx = coverRect.centerX()
    val cy = coverRect.centerY()
    circle(cx, cy, coverSize / 2, ring)
    circleCover(cx, cy, coverSize / 2 - 7f, soft, accent)
    icon(listOf(IconPath(BOW_LEFT), IconPath(BOW_RIGHT)), pad + 18f, pad + 17f, 36f, lazo)
    circle(pad + 18f, pad + 17f, 4.5f, accent)
    var y = label(state.title, infoLeft, pad + 2f, 17f, text, display, titleWidth)
    label(state.artist, infoLeft, y, 13f, sub, body, titleWidth)
    circle(heartRect.centerX(), heartRect.centerY(), 16f, soft)
    heart(accent)
    val barTop = coverBottom - 28f
    progressBar(barTop + 3f, 8f, soft, lazo, 4f)
    val knob = infoLeft + (infoRight - infoLeft) * state.progress
    circle(knob.coerceIn(infoLeft + 7f, infoRight - 7f), barTop + 7f, 8.5f, surface)
    circle(knob.coerceIn(infoLeft + 7f, infoRight - 7f), barTop + 7f, 7f, accent)
    times(coverBottom - 13f, 11f, sub, font("Fredoka-SemiBold", true))
    buttons { r, kind ->
      when (kind) {
        WidgetButton.PLAY -> {
          rect(r, darker(control), 22f)
          rect(RectF(r.left, r.top, r.right, r.bottom - 3f), control, 22f)
          centeredIcon(RectF(r.left, r.top, r.right, r.bottom - 3f), kind, onControl, 20f)
        }
        WidgetButton.SHUFFLE, WidgetButton.REPEAT -> {
          rect(r, background, 22f)
          centeredIcon(r, kind, sub, 17f)
        }
        else -> {
          rect(r, soft, 22f)
          centeredIcon(r, kind, text, 18f)
        }
      }
    }
  }

  private fun brutalista() {
    val ink = s("ink", text)
    val hot = s("hot", accent)
    val onHot = s("onHot", onAccent)
    val paper = s("paper", 0xFFFFFFFF.toInt())
    rect(RectF(0f, 0f, width, height), background)
    rect(RectF(width - 6f, 6f, width, height), ink)
    rect(RectF(6f, height - 6f, width, height), ink)
    frame(RectF(0f, 0f, width - 6f, height - 6f), ink, 3f)
    cover(coverRect, 0f, hot, onHot)
    frame(coverRect, ink, 3f)
    var y = label(state.title, infoLeft, pad - 2f, 24f, ink, display, titleWidth, upper = true)
    label(state.artist, infoLeft, y - 2f, 12f, sub, font("Archivo-ExtraBold", true), titleWidth, spacing = 0.08f, upper = true)
    rect(heartRect, paper)
    frame(heartRect, ink, 3f)
    heart(hot, size = 15f, shape = DIAMOND)
    segments(coverBottom - 26f, 8f, 10, ink, ink, 3f, outlined = true)
    times(coverBottom - 15f, 13f, ink, display, spacing = 0.06f)
    buttons { r, kind ->
      val play = kind == WidgetButton.PLAY
      rect(r, if (play) hot else paper)
      frame(r, ink, 3f)
      centeredIcon(r, kind, if (play) onHot else ink, if (play) 20f else 17f, sharp = true)
    }
  }

  private fun terminal() {
    val main = text
    val cmd = s("cmd", accent)
    val dim = sub
    val dark = blend(background, main, 0.25f)
    rect(RectF(0f, 0f, width, height), background, 8f)
    frame(RectF(0f, 0f, width, height), main, 2f, 8f)
    pixelCover(coverRect, 6, listOf(cmd, main, dim, dark, blend(background, main, 0.12f)))
    val mono = font("JetBrainsMono-Regular")
    val bold = font("JetBrainsMono-Bold", true)
    var y = label("~/musica \$ play", infoLeft, pad, 12f, dim, mono, titleWidth)
    y = label("> " + state.title, infoLeft, y, 12f, cmd, bold, titleWidth)
    label("  " + state.artist + "_", infoLeft, y, 12f, dim, mono, titleWidth)
    label(if (state.favorite) "[♥]" else "[♡]", heartRect.left + 2f, heartRect.top + 8f, 12f, main, bold, 32f)
    val filled = (state.progress * 18).toInt()
    label("[" + "#".repeat(filled) + "-".repeat(18 - filled) + "]", infoLeft, coverBottom - 32f, 12f, main, mono)
    times(coverBottom - 15f, 11f, dim, mono, long = true)
    val labels = mapOf(
      WidgetButton.SHUFFLE to "[mix]",
      WidgetButton.PREVIOUS to if (state.longAudio) "[-10]" else "[<<]",
      WidgetButton.PLAY to if (state.playing) "[ ❚❚ ]" else "[ ▶ ]",
      WidgetButton.NEXT to if (state.longAudio) "[+10]" else "[>>]",
      WidgetButton.REPEAT to if (state.repeatMode == 1) "[r:1]" else "[rep]",
    )
    buttons { r, kind ->
      val play = kind == WidgetButton.PLAY
      if (play) rect(r, main) else frame(r, dark, 1f)
      val color = if (play) background else if (kind == WidgetButton.SHUFFLE || kind == WidgetButton.REPEAT) alpha(dim, buttonAlpha(kind) + 0.2f) else main
      label(labels.getValue(kind), r.left, r.centerY() - 8f, 13f, color, bold, r.width(), center = true)
    }
  }

  private fun tornamesa() {
    val mat = s("mat", darker(surface))
    val key = s("key", surfaceHigh)
    val keyEdge = s("keyEdge", darker(surface, 0.5f))
    val arm = s("arm", sub)
    val line = s("line", outline)
    rect(RectF(0f, 0f, width, height), keyEdge, 18f)
    rect(RectF(0f, 0f, width, height - 4f), surface, 18f)
    rect(coverRect, mat, 10f)
    val cx = coverRect.centerX()
    val cy = coverRect.centerY()
    val r = coverSize / 2 - 4f
    circle(cx, cy, r, 0xFF111111.toInt())
    listOf(0.88f, 0.76f, 0.64f).forEach { ring(cx, cy, r * it, 0xFF2B2B2B.toInt(), 1f) }
    circleCover(cx, cy, r * 0.48f)
    circle(cx, cy, 2.5f, arm)
    val pivotX = coverRect.right - 14f
    val pivotY = coverRect.top + 12f
    circle(pivotX, pivotY, 7f, arm)
    circle(pivotX, pivotY, 2.5f, key)
    canvas.drawPath(Path().apply {
      moveTo(pivotX, pivotY)
      lineTo(pivotX - 2f, pivotY + coverSize * 0.43f)
      lineTo(pivotX - 14f, pivotY + coverSize * 0.58f)
    }, paint(arm).apply { style = Paint.Style.STROKE; strokeWidth = 3.5f; strokeCap = Paint.Cap.ROUND; strokeJoin = Paint.Join.ROUND })
    var y = label(state.title, infoLeft, pad, 16f, text, display, titleWidth)
    label(state.artist + " · 33⅓ rpm", infoLeft, y, 12f, sub, body, titleWidth)
    circle(heartRect.centerX(), heartRect.centerY(), 16f, key)
    heart(accent, size = 15f)
    val top = coverBottom - 30f
    rect(RectF(infoLeft, top + 4f, infoRight, top + 12f), mat, 4f)
    frame(RectF(infoLeft, top + 4f, infoRight, top + 12f), line, 1f, 4f)
    val knob = infoLeft + (infoRight - infoLeft) * state.progress
    rect(RectF(knob - 5f, top, knob + 5f, top + 16f).apply { offset(-(left - left.coerceIn(infoLeft, infoRight - 10f)), 0f) }, accent, 2f)
    times(coverBottom - 13f, 11f, sub, body)
    buttons { rr, kind ->
      val play = kind == WidgetButton.PLAY
      rect(rr, if (play) darker(accent, 0.35f) else keyEdge, 8f)
      val face = RectF(rr.left, rr.top, rr.right, rr.bottom - 3f)
      rect(face, if (play) accent else key, 8f)
      centeredIcon(face, kind, if (play) onControl else if (kind == WidgetButton.SHUFFLE || kind == WidgetButton.REPEAT) sub else text, if (play) 18f else 16f)
    }
  }

  private fun mixtape() {
    val shell = s("shell", surface)
    val paper = s("label", 0xFFFBF1DC.toInt())
    val ink = s("ink", text)
    val stripe = s("stripe", accent)
    val window = s("window", surfaceHigh)
    val edge = s("edge", 0xFF1A1512.toInt())
    rect(RectF(0f, 0f, width, height), shell, 14f)
    rect(coverRect, paper, 6f)
    cover(RectF(coverRect.left + 6f, coverRect.top + 6f, coverRect.right - 6f, coverRect.bottom - 6f), 3f, stripe, paper)
    val panel = RectF(infoLeft, pad, infoRight, coverBottom)
    rect(panel, paper, 6f)
    val left = infoLeft + 8f
    rect(RectF(left, pad + 6f, heartRect.left - 4f, pad + 10f), stripe, 2f)
    var y = label(state.title, left, pad + 10f, 24f, ink, display, heartRect.left - 6f - left)
    label(state.artist + " · Lado A", left, y - 4f, 11f, ink, font("BarlowCondensed-Bold", true), heartRect.left - 6f - left, spacing = 0.08f, upper = true)
    heart(stripe, RectF(heartRect.left - 4f, heartRect.top + 4f, heartRect.right - 4f, heartRect.bottom + 4f))
    val strip = RectF(infoLeft + 6f, coverBottom - 30f, infoRight - 6f, coverBottom - 6f)
    rect(strip, window, 12f)
    listOf(strip.left + 12f, strip.right - 12f).forEach { x ->
      circle(x, strip.centerY(), 9f, edge)
      circle(x, strip.centerY(), 7.5f, paper)
      circle(x, strip.centerY(), 3f, edge)
    }
    val tapeLeft = strip.left + 26f
    val tapeRight = strip.right - 26f
    rect(RectF(tapeLeft, strip.centerY() - 3f, tapeRight, strip.centerY() + 3f), edge, 3f)
    rect(RectF(tapeLeft, strip.centerY() - 3f, tapeLeft + (tapeRight - tapeLeft) * state.progress, strip.centerY() + 3f), blend(edge, stripe, 0.45f), 3f)
    buttons { r, kind ->
      val fill = when (kind) {
        WidgetButton.PLAY -> c("onControl", 0xFFFFB36B.toInt())
        WidgetButton.SHUFFLE, WidgetButton.REPEAT -> surface
        else -> window
      }
      rect(r, edge, 4f)
      rect(RectF(r.left, r.top, r.right, r.bottom - 4f), fill, 4f)
      centeredIcon(RectF(r.left, r.top, r.right, r.bottom - 4f), kind, s("counter", ink), if (kind == WidgetButton.PLAY) 18f else 17f, doubled = true)
    }
  }

  private fun taquilla() {
    val paper = s("paper", accent)
    val ink = s("ink", background)
    val perf = s("perf", sub)
    val faded = s("faded", surfaceHigh)
    val stamp = s("stamp", accent)
    clipped(RectF(0f, 0f, width, height), 12f) {
      rect(RectF(0f, 0f, width, height), paper)
      val cut = Paint(Paint.ANTI_ALIAS_FLAG).apply { xfermode = android.graphics.PorterDuffXfermode(android.graphics.PorterDuff.Mode.CLEAR) }
      val notchY = coverBottom + gap / 2
      canvas.drawCircle(0f, notchY, 9f, cut)
      canvas.drawCircle(width, notchY, 9f, cut)
      line(14f, notchY, width - 14f, notchY, perf, 2f, floatArrayOf(5f, 5f))
    }
    frame(coverRect, ink, 2f)
    cover(RectF(coverRect.left + 5f, coverRect.top + 5f, coverRect.right - 5f, coverRect.bottom - 5f), 0f, stamp, paper)
    var y = label("ADMITE UNO · Nº 0142", infoLeft, pad, 9f, perf, font("CourierPrime-Bold", true), titleWidth, spacing = 0.2f)
    y = label(state.title, infoLeft, y, 17f, ink, display, titleWidth)
    label(state.artist, infoLeft, y, 12f, ink, font("CourierPrime-Bold", true), titleWidth)
    ring(heartRect.centerX(), heartRect.centerY(), 15f, stamp, 2f)
    heart(stamp, size = 15f)
    progressBar(coverBottom - 20f, 6f, faded, ink, 3f)
    times(coverBottom - 12f, 11f, blend(ink, perf, 0.5f), font("CourierPrime-Bold", true), prefix = "FUNCIÓN ")
    buttons { r, kind ->
      val play = kind == WidgetButton.PLAY
      if (play) rect(r, stamp, 22f) else frame(r, ink, 2f, 22f)
      centeredIcon(r, kind, if (play) paper else ink, if (play) 18f else 16f)
    }
  }

  private fun pixel() {
    val body = s("bg", background)
    val screen = s("screen", surfaceHigh)
    val s1 = s("s1", sub)
    val s2 = s("s2", text)
    val ink = s("ink", text)
    canvas.drawPath(Path().apply {
      addRoundRect(RectF(0f, 0f, width, height), floatArrayOf(14f, 14f, 14f, 14f, 28f, 28f, 14f, 14f), Path.Direction.CW)
    }, paint(body))
    canvas.drawPath(Path().apply {
      addRoundRect(RectF(1.5f, 1.5f, width - 1.5f, height - 1.5f), floatArrayOf(13f, 13f, 13f, 13f, 27f, 27f, 13f, 13f), Path.Direction.CW)
    }, paint(ink).apply { style = Paint.Style.STROKE; strokeWidth = 3f })
    rect(coverRect, s2, 6f)
    val inner = RectF(coverRect.left + 8f, coverRect.top + 8f, coverRect.right - 8f, coverRect.bottom - 8f)
    frame(RectF(inner.left - 2f, inner.top - 2f, inner.right + 2f, inner.bottom + 2f), ink, 2f)
    pixelCover(inner, 8, listOf(body, screen, s1, s2, ink))
    val press = font("PressStart2P-Regular", true)
    val vt = font("VT323-Regular")
    var y = label(state.title, infoLeft, pad + 2f, 10f, ink, press, titleWidth, upper = true)
    y = label(state.artist, infoLeft, y + 2f, 18f, ink, vt, titleWidth)
    label("NIVEL ${(state.position / 60).toInt() + 1}", infoLeft, y - 2f, 16f, s("sub", sub), vt, titleWidth)
    circle(heartRect.centerX(), heartRect.centerY(), 16f, if (state.favorite) ink else s2)
    label("B", heartRect.left, heartRect.top + 11f, 10f, body, press, 32f, center = true)
    val count = 12
    val each = (infoRight - infoLeft - 2f * (count - 1)) / count
    val lit = (state.progress * count + 0.5f).toInt()
    for (index in 0 until count) {
      val left = infoLeft + index * (each + 2f)
      rect(RectF(left, coverBottom - 26f, left + each, coverBottom - 18f), if (index < lit) ink else s1)
    }
    times(coverBottom - 15f, 15f, ink, vt)
    buttons { r, kind ->
      when (kind) {
        WidgetButton.SHUFFLE, WidgetButton.REPEAT -> {
          rect(r, alpha(s1, 0.5f + buttonAlpha(kind) / 2), 22f)
          label(if (kind == WidgetButton.SHUFFLE) "MIX" else if (state.repeatMode == 1) "REP1" else "REP", r.left, r.centerY() - 10f, 18f, ink, vt, r.width(), center = true)
        }
        WidgetButton.PLAY -> {
          rect(r, ink, 22f)
          label(if (state.playing) "II" else "A", r.left, r.centerY() - 6f, 12f, body, press, r.width(), center = true)
        }
        else -> {
          rect(r, ink, 6f)
          if (state.longAudio) {
            label(if (kind == WidgetButton.PREVIOUS) "-10" else "+10", r.left, r.centerY() - 10f, 18f, body, vt, r.width(), center = true)
          } else {
            icon(listOf(IconPath(if (kind == WidgetButton.PREVIOUS) TRIANGLE_LEFT else TRIANGLE_RIGHT)), r.centerX(), r.centerY(), 14f, body)
          }
        }
      }
    }
  }

  private fun vaporwave() {
    val bg = s("bg", background)
    val sky = s("sky1", surface)
    val pink = s("sky2", accent)
    val sun = s("sun1", 0xFFFFB86C.toInt())
    val line = s("line", outline)
    val ink = s("ink", text)
    clipped(RectF(0f, 0f, width, height), 16f) {
      rect(RectF(0f, 0f, width, height), bg)
      rect(RectF(0f, 0f, width, coverBottom + gap / 2), sky)
      val sunY = coverBottom + 4f
      canvas.drawCircle(66f, sunY, 62f, Paint(Paint.ANTI_ALIAS_FLAG).apply {
        shader = LinearGradient(0f, sunY - 62f, 0f, sunY, sun, pink, Shader.TileMode.CLAMP)
      })
      listOf(-26f to 4f, -14f to 5f, -1f to 6f).forEach { (dy, h) -> rect(RectF(0f, sunY + dy, 140f, sunY + dy + h), sky) }
      val horizon = coverBottom + gap / 2
      rect(RectF(0f, horizon, width, height), bg)
      val grid = alpha(pink, 0.55f)
      listOf(2f, 10f, 22f, 40f).forEach { dy -> line(0f, horizon + dy, width, horizon + dy, grid, 1f) }
      listOf(-1.6f, -0.8f, 0f, 0.8f, 1.6f).forEach { k ->
        line(width / 2 + k * 40f, horizon, width / 2 + k * 160f, height, grid, 1f)
      }
    }
    rect(RectF(coverRect.left + 4f, coverRect.top + 4f, coverRect.right + 4f, coverRect.bottom + 4f), pink)
    cover(coverRect, 0f, line, pink)
    frame(coverRect, ink, 2f)
    val vt = font("VT323-Regular")
    var y = label(if (state.playing) "▶ PLAY  SP" else "❚❚ PAUSA  SP", infoLeft, pad, 17f, ink, vt, titleWidth)
    y = label(state.title, infoLeft, y - 2f, 16f, ink, display, titleWidth)
    label(state.artist, infoLeft, y, 12f, sub, display, titleWidth)
    heart(pink)
    progressBar(coverBottom - 21f, 3f, line, pink, 0f)
    times(coverBottom - 15f, 15f, sub, vt, long = true)
    buttons { r, kind ->
      val play = kind == WidgetButton.PLAY
      rect(r, if (play) pink else s("panel", surface))
      if (play) frame(r, ink, 2f) else frame(r, line, 1f)
      centeredIcon(r, kind, if (play) bg else if (kind == WidgetButton.SHUFFLE || kind == WidgetButton.REPEAT) sub else ink, if (play) 18f else 17f, doubled = true)
    }
  }

  private fun manga() {
    val ink = s("ink", text)
    val panel = s("panel", surface)
    rect(RectF(0f, 0f, width, height), background)
    frame(RectF(0f, 0f, width, height), ink, 3f)
    rect(coverRect, panel)
    clipped(coverRect, 0f) {
      val dots = paint(alpha(ink, 0.3f))
      var y = coverRect.top + 3f
      while (y < coverRect.bottom) {
        var x = coverRect.left + 3f
        while (x < coverRect.right) { canvas.drawCircle(x, y, 1.3f, dots); x += 6f }
        y += 6f
      }
      val lines = alpha(ink, 0.45f)
      line(coverRect.left, coverRect.top, coverRect.right, coverRect.bottom, lines, 1.4f)
      line(coverRect.right, coverRect.top, coverRect.left, coverRect.bottom, lines, 1.4f)
    }
    val photo = RectF(coverRect.left + 12f, coverRect.top + 12f, coverRect.right - 12f, coverRect.bottom - 12f)
    canvas.save()
    canvas.rotate(-4f, photo.centerX(), photo.centerY())
    rect(RectF(photo.left - 3f, photo.top - 3f, photo.right + 3f, photo.bottom + 3f), ink)
    cover(photo, 0f, accent, panel)
    canvas.restore()
    frame(coverRect, ink, 3f)
    val bubble = RectF(infoLeft, pad, infoRight, pad + 52f)
    rect(bubble, panel, 16f)
    frame(bubble, ink, 3f, 16f)
    var y = label("¡" + state.title + "!", infoLeft + 10f, pad + 6f, 20f, ink, display, bubble.right - 38f - infoLeft - 10f, spacing = 0.04f)
    label("— " + state.artist, infoLeft + 10f, y - 2f, 12f, s("sub", sub), font("ComicNeue-Regular", true), bubble.right - 38f - infoLeft - 10f)
    heart(accent, RectF(bubble.right - 34f, bubble.centerY() - 16f, bubble.right - 2f, bubble.centerY() + 16f))
    val barTop = coverBottom - 30f
    rect(RectF(infoLeft, barTop, infoRight, barTop + 10f), panel)
    rect(RectF(infoLeft, barTop, infoLeft + (infoRight - infoLeft) * state.progress, barTop + 10f), ink)
    frame(RectF(infoLeft, barTop, infoRight, barTop + 10f), ink, 2f)
    times(coverBottom - 17f, 13f, ink, display, prefix = "P. ", spacing = 0.06f)
    buttons { r, kind ->
      val play = kind == WidgetButton.PLAY
      rect(r, if (play) accent else panel)
      frame(r, ink, 3f)
      if (play) {
        label(if (state.playing) "¡PAUSA!" else "¡PLAY!", r.left, r.centerY() - 9f, 16f, onAccent, display, r.width(), spacing = 0.04f, center = true)
      } else {
        centeredIcon(r, kind, ink, if (kind == WidgetButton.SHUFFLE || kind == WidgetButton.REPEAT) 16f else 18f)
      }
    }
  }

  private fun nave() {
    val bg = s("bg", background)
    val ink = s("ink", text)
    val line = s("line", outline)
    val panel = s("panel", surface)
    val cyan = accent
    rect(RectF(0f, 0f, width, height), bg, 10f)
    frame(RectF(0f, 0f, width, height), line, 1f, 10f)
    val stars = paint(ink)
    listOf(150f to 8f, 214f to 70f, 300f to 6f, 250f to 182f, 130f to 180f).forEach { (x, y) ->
      canvas.drawCircle(x * width / 324f, y * height / 188f, 1f, stars)
    }
    val corner = paint(cyan).apply { style = Paint.Style.STROKE; strokeWidth = 2f }
    canvas.drawPath(Path().apply {
      moveTo(3f, 15f); lineTo(3f, 3f); lineTo(15f, 3f)
      moveTo(width - 15f, 3f); lineTo(width - 3f, 3f); lineTo(width - 3f, 15f)
      moveTo(width - 3f, height - 15f); lineTo(width - 3f, height - 3f); lineTo(width - 15f, height - 3f)
      moveTo(15f, height - 3f); lineTo(3f, height - 3f); lineTo(3f, height - 15f)
    }, corner)
    val cx = coverRect.centerX()
    val cy = coverRect.centerY()
    circleCover(cx, cy, coverSize / 2 - 10f, s("planet", cyan), ink)
    ring(cx, cy, coverSize / 2 - 3f, cyan, 1f, floatArrayOf(4f, 6f))
    line(cx, coverRect.top, cx, coverRect.top + 8f, cyan, 2f)
    line(cx, coverRect.bottom - 8f, cx, coverRect.bottom, cyan, 2f)
    line(coverRect.left, cy, coverRect.left + 8f, cy, cyan, 2f)
    line(coverRect.right - 8f, cy, coverRect.right, cy, cyan, 2f)
    val orbitron = display
    var y = label("DESTINO", infoLeft, pad, 9f, cyan, orbitron, titleWidth, spacing = 0.2f)
    y = label(state.title, infoLeft, y, 13f, ink, orbitron, titleWidth, upper = true)
    label(state.artist, infoLeft, y, 12f, s("sub", sub), body, titleWidth)
    frame(heartRect, cyan, 1f, 4f)
    heart(cyan, size = 14f)
    val bar = RectF(infoLeft, coverBottom - 24f, infoRight, coverBottom - 16f)
    rect(bar, panel)
    frame(bar, line, 1f)
    val count = 10
    val each = (bar.width() - 4f - 2f * (count - 1)) / count
    val lit = (state.progress * count + 0.5f).toInt()
    for (index in 0 until count) {
      val left = bar.left + 2f + index * (each + 2f)
      rect(RectF(left, bar.top + 2f, left + each, bar.bottom - 2f), if (index < lit) cyan else line)
    }
    times(coverBottom - 13f, 9f, s("sub", sub), orbitron, long = true, prefix = "T+", spacing = 0.1f)
    buttons { r, kind ->
      val play = kind == WidgetButton.PLAY
      rect(r, if (play) cyan else panel, 4f)
      if (!play) frame(r, line, 1f, 4f)
      centeredIcon(r, kind, if (play) onAccent else if (kind == WidgetButton.SHUFFLE || kind == WidgetButton.REPEAT) s("sub", sub) else ink, if (play) 17f else 16f)
    }
  }

  private fun constelacion() {
    val bg = s("bg", background)
    val sky = s("sky2", surface)
    val neb = s("neb1", accent)
    val star = s("star", text)
    val line = s("line", outline)
    val panel = s("panel", surface)
    val ink = s("ink", text)
    val coral = s("neb2", accent)
    clipped(RectF(0f, 0f, width, height), 22f) {
      rect(RectF(0f, 0f, width, height), bg)
      circle(40f, 60f, 90f, alpha(sky, 0.7f))
      circle(width - 24f, 0f, 60f, alpha(neb, 0.25f))
      val dot = paint(star)
      listOf(196f to 8f, 250f to 122f, 312f to 96f, 140f to 122f).forEach { (x, y) -> canvas.drawCircle(x * width / 324f, y, 1f, dot) }
    }
    val cx = coverRect.centerX()
    val cy = coverRect.centerY()
    circleCover(cx, cy, coverSize / 2 - 14f, neb, star)
    ring(cx, cy, coverSize / 2 - 8f, star, 1.2f)
    val x0 = coverRect.left
    val y0 = coverRect.top
    val k = coverSize / 108f
    listOf(floatArrayOf(8f, 20f, 24f, 6f), floatArrayOf(24f, 6f, 44f, 4f), floatArrayOf(86f, 100f, 102f, 84f), floatArrayOf(102f, 84f, 104f, 64f)).forEach { seg ->
      line(x0 + seg[0] * k, y0 + seg[1] * k, x0 + seg[2] * k, y0 + seg[3] * k, line, 1f)
    }
    listOf(8f to 20f, 24f to 6f, 44f to 4f, 86f to 100f, 102f to 84f, 104f to 64f).forEachIndexed { index, (x, y) ->
      circle(x0 + x * k, y0 + y * k, if (index % 3 == 1) 2.4f else 1.6f, star)
    }
    val outfit = body
    var y = label("CONSTELACIÓN DEL LOBO", infoLeft, pad, 9f, coral, outfit, titleWidth, spacing = 0.25f)
    y = label(state.title, infoLeft, y, 21f, ink, font("CormorantGaramond-SemiBoldItalic", true), titleWidth)
    label(state.artist, infoLeft, y - 2f, 12f, s("sub", sub), outfit, titleWidth)
    heart(coral, size = 18f, shape = if (state.favorite) STAR else STAR_OUTLINE)
    val barY = coverBottom - 20f
    line(infoLeft, barY, infoRight, barY, line, 1f, floatArrayOf(3f, 3f))
    val reached = infoLeft + (infoRight - infoLeft) * state.progress
    line(infoLeft, barY, reached, barY, star, 1.5f)
    icon(listOf(IconPath(SPARK)), reached.coerceIn(infoLeft + 6f, infoRight - 6f), barY, 12f, star)
    times(coverBottom - 13f, 11f, s("sub", sub), outfit)
    buttons { r, kind ->
      val play = kind == WidgetButton.PLAY
      rect(r, if (play) control else panel, 22f)
      if (!play) frame(r, line, 1f, 22f)
      centeredIcon(r, kind, if (play) onControl else if (kind == WidgetButton.SHUFFLE || kind == WidgetButton.REPEAT) s("sub", sub) else ink, if (play) 18f else 17f)
    }
  }

  private fun cyberpunk() {
    val bg = s("bg", background)
    val hot = s("hot", accent)
    val hotText = s("hotText", hot)
    val onHot = s("onHot", onAccent)
    val ink = s("ink", text)
    val grip = s("grip", surface)
    val key = s("key", surfaceHigh)
    val hud = s("hud", accent)
    val exit = s("exit", 0xFF0F6B3A.toInt())
    val onExit = s("onExit", 0xFFFFFFFF.toInt())
    fun cut(r: RectF, corner: Float) = Path().apply {
      moveTo(r.left + corner, r.top); lineTo(r.right, r.top); lineTo(r.right, r.bottom - corner)
      lineTo(r.right - corner, r.bottom); lineTo(r.left, r.bottom); lineTo(r.left, r.top + corner); close()
    }
    canvas.drawPath(cut(RectF(0f, 0f, width, height), 16f), paint(hot))
    canvas.drawPath(cut(RectF(1.5f, 1.5f, width - 1.5f, height - 1.5f), 15f), paint(bg))
    cover(coverRect, 0f, s("sky2", key), hud)
    clipped(coverRect, 0f) {
      val scan = paint(alpha(bg, 0.35f))
      var y = coverRect.top + coverSize * 0.2f
      while (y < coverRect.bottom) { canvas.drawRect(coverRect.left, y, coverRect.right, y + 2f, scan); y += coverSize * 0.24f }
      rect(RectF(coverRect.left, coverRect.top, coverRect.left + 22f, coverRect.bottom), exit)
      label("音", coverRect.left, coverRect.centerY() - 19f, 14f, onExit, Typeface.DEFAULT_BOLD, 22f, center = true)
      label("楽", coverRect.left, coverRect.centerY() + 1f, 14f, onExit, Typeface.DEFAULT_BOLD, 22f, center = true)
    }
    frame(coverRect, hud, 1f)
    var y = label("// RUTA NEURAL", infoLeft, pad, 10f, hotText, display, titleWidth, spacing = 0.2f)
    y = label(state.title, infoLeft, y, 16f, ink, display, titleWidth, upper = true)
    label(state.artist, infoLeft, y, 12f, s("sub", sub), body, titleWidth)
    rect(heartRect, grip)
    heart(hud, size = 14f)
    val count = 10
    val each = (infoRight - infoLeft - 3f * (count - 1)) / count
    val lit = (state.progress * count + 0.5f).toInt()
    for (index in 0 until count) {
      val left = infoLeft + index * (each + 3f)
      val top = coverBottom - 22f
      canvas.drawPath(Path().apply {
        moveTo(left + 2f, top); lineTo(left + each + 2f, top); lineTo(left + each - 2f, top + 6f); lineTo(left - 2f, top + 6f); close()
      }, paint(if (index < lit) hot else grip))
    }
    times(coverBottom - 13f, 10f, s("sub", sub), display, long = true)
    buttons { r, kind ->
      if (kind == WidgetButton.PLAY) {
        canvas.drawPath(Path().apply {
          moveTo(r.left + 8f, r.top); lineTo(r.right, r.top); lineTo(r.right - 8f, r.bottom); lineTo(r.left, r.bottom); close()
        }, paint(hot))
        centeredIcon(r, kind, onHot, 17f, sharp = true)
      } else {
        rect(r, key)
        centeredIcon(r, kind, if (kind == WidgetButton.SHUFFLE || kind == WidgetButton.REPEAT) s("sub", sub) else ink, 15f, sharp = true)
      }
    }
  }

  private fun terror() {
    val dark = s("dark", 0xFF020101.toInt())
    val wall = s("wall", surfaceHigh)
    val wallLine = s("wallLine", outline)
    val panel = s("panel", surface)
    val paper = s("paper", 0xFFCFC6B0.toInt())
    val paperSub = s("paperSub", sub)
    val noteInk = s("noteInk", background)
    val ink = s("ink", text)
    val red = accent
    val power = s("power", red)
    val onPower = s("onPower", 0xFFFFFFFF.toInt())
    val battery = s("battery", 0xFFCDB85E.toInt())
    val line = s("line", outline)
    clipped(RectF(0f, 0f, width, height), 8f) {
      rect(RectF(0f, 0f, width, height), dark)
      canvas.drawCircle(66f, 66f, 120f, Paint(Paint.ANTI_ALIAS_FLAG).apply {
        shader = RadialGradient(66f, 66f, 120f, intArrayOf(wall, panel, dark), floatArrayOf(0f, 0.55f, 1f), Shader.TileMode.CLAMP)
      })
      line(0f, 40f, width, 40f, wallLine, 1f)
      line(0f, 96f, width, 96f, wallLine, 1f)
      val eye = paint(s("eye", ink))
      canvas.drawOval(RectF(width - 26f, coverBottom + 12f, width - 21f, coverBottom + 15f), eye)
      canvas.drawOval(RectF(width - 17f, coverBottom + 12f, width - 12f, coverBottom + 15f), eye)
    }
    rect(RectF(coverRect.left, coverRect.top + 3f, coverRect.right, coverRect.bottom + 6f), alpha(0xFF000000.toInt(), 0.6f))
    rect(coverRect, paper)
    val photo = RectF(coverRect.left + 6f, coverRect.top + 6f, coverRect.right - 6f, coverRect.bottom - 26f)
    cover(photo, 0f, s("blood", power), paper)
    label("no apagues la luz", coverRect.left, photo.bottom + 3f, 11f, paperSub, display, coverRect.width(), center = true)
    rect(RectF(coverRect.centerX() - 20f, coverRect.top - 6f, coverRect.centerX() + 20f, coverRect.top + 7f), alpha(s("noteOn", battery), 0.85f))
    var y = label(state.title, infoLeft, pad, 17f, ink, display, titleWidth)
    label(state.artist, infoLeft, y, 12f, s("sub", sub), body, titleWidth)
    heart(red)
    val cell = RectF(infoLeft, coverBottom - 30f, infoRight - 6f, coverBottom - 16f)
    frame(cell, s("sub", sub), 2f, 2f)
    rect(RectF(cell.right + 1f, cell.centerY() - 3f, cell.right + 4f, cell.centerY() + 3f), s("sub", sub))
    val count = 6
    val each = (cell.width() - 6f - 2f * (count - 1)) / count
    val lit = ((1f - state.progress) * count + 0.5f).toInt()
    for (index in 0 until count) {
      val left = cell.left + 3f + index * (each + 2f)
      rect(RectF(left, cell.top + 3f, left + each, cell.bottom - 3f), if (index < lit) battery else line)
    }
    times(coverBottom - 13f, 11f, s("sub", sub), body)
    buttons { r, kind ->
      if (kind == WidgetButton.PLAY) {
        rect(r, power, 22f)
        centeredIcon(r, kind, onPower, 17f)
      } else {
        rect(r, s("note", paper))
        centeredIcon(r, kind, noteInk, if (kind == WidgetButton.SHUFFLE || kind == WidgetButton.REPEAT) 15f else 16f)
      }
    }
  }

  private fun bloques() {
    val frameColor = s("frame", surface)
    val frameDark = s("frameDark", darker(surface))
    val board = s("board", background)
    val empty = s("empty", surfaceHigh)
    val panel = s("panel", surfaceHigh)
    val ink = s("ink", text)
    val pieces = listOf(s("p1", accent), s("p2", 0xFF5AD1FF.toInt()), s("p3", 0xFFFFD166.toInt()), s("p4", 0xFF8BE37A.toInt()), s("p5", 0xFFC58BFF.toInt()))
    val onPiece = s("onP1", 0xFF120C10.toInt())
    rect(RectF(0f, 0f, width, height), frameDark, 12f)
    rect(RectF(0f, 0f, width, height - 4f), frameColor, 12f)
    rect(coverRect, board, 4f)
    val cell = (coverSize - 6f - 2f * 5) / 6
    val filled = mapOf(2 to 1, 7 to 1, 8 to 1, 9 to 1, 24 to 2, 29 to 0, 30 to 2, 31 to 2, 32 to 4, 33 to 3, 34 to 0, 35 to 0)
    for (index in 0 until 36) {
      val x = coverRect.left + 3f + (index % 6) * (cell + 2f)
      val y = coverRect.top + 3f + (index / 6) * (cell + 2f)
      rect(RectF(x, y, x + cell, y + cell), filled[index]?.let { pieces[it] } ?: empty)
    }
    val art = RectF(coverRect.left + coverSize * 0.19f, coverRect.top + coverSize * 0.36f, coverRect.right - coverSize * 0.19f, coverRect.top + coverSize * 0.81f)
    cover(art, 0f, pieces[1], onPiece)
    frame(art, ink, 2f)
    val titleBox = RectF(infoLeft, pad, heartRect.left - 6f, pad + 40f)
    rect(titleBox, panel, 4f)
    var y = label(state.title, titleBox.left + 8f, titleBox.top + 5f, 11f, ink, display, titleBox.width() - 16f, upper = true)
    label(state.artist, titleBox.left + 8f, y, 12f, s("sub", sub), body, titleBox.width() - 16f)
    val heartBox = RectF(heartRect.left, heartRect.top, heartRect.right, titleBox.bottom)
    rect(heartBox, darker(pieces[0], 0.35f), 4f)
    rect(RectF(heartBox.left, heartBox.top, heartBox.right, heartBox.bottom - 3f), pieces[0], 4f)
    heart(onPiece, RectF(heartBox.left, heartBox.top, heartBox.right, heartBox.bottom - 3f), 15f)
    val progressBox = RectF(infoLeft, coverBottom - 34f, infoRight, coverBottom)
    rect(progressBox, panel, 4f)
    val mono = display
    label("FILAS ${(state.position / 30).toInt()}", progressBox.left + 8f, progressBox.top + 5f, 9f, s("sub", sub), mono)
    val clock = formatTime(state.position) + " / " + formatTime(state.duration)
    val clockWidth = textWidth(clock, 9f, mono)
    label(clock, progressBox.right - 8f - clockWidth, progressBox.top + 5f, 9f, s("sub", sub), mono, clockWidth + 2f)
    val count = 10
    val each = (progressBox.width() - 16f - 2f * (count - 1)) / count
    val lit = (state.progress * count + 0.5f).toInt()
    for (index in 0 until count) {
      val left = progressBox.left + 8f + index * (each + 2f)
      rect(RectF(left, progressBox.bottom - 13f, left + each, progressBox.bottom - 5f), if (index < lit) pieces[3] else empty)
    }
    val colors = mapOf(
      WidgetButton.SHUFFLE to pieces[4],
      WidgetButton.PREVIOUS to pieces[1],
      WidgetButton.PLAY to pieces[2],
      WidgetButton.NEXT to pieces[1],
      WidgetButton.REPEAT to pieces[3],
    )
    buttons { r, kind ->
      val fill = colors.getValue(kind)
      rect(r, darker(fill, 0.35f), 4f)
      val face = RectF(r.left, r.top, r.right, r.bottom - 4f)
      rect(face, fill, 4f)
      centeredIcon(face, kind, onPiece, if (kind == WidgetButton.PLAY) 17f else 15f, sharp = true)
    }
  }

  private fun poder() {
    val sky = s("sky1", surface)
    val orange = s("sky2", 0xFFC2410C.toInt())
    val ground = s("ground", darker(surface))
    val mesa = s("mesa", surfaceHigh)
    val aura = s("aura", accent)
    val spark = s("spark", 0xFFFFF2A8.toInt())
    val outlineColor = s("outline", 0xFF1A0A14.toInt())
    val panel = s("panel", surface)
    val rock = s("rock", 0xFF7A4A2A.toInt())
    val cloud = s("cloud", sub)
    val scroll = s("scroll", 0xFFF6E7C8.toInt())
    val ink = s("ink", text)
    clipped(RectF(0f, 0f, width, height), 16f) {
      rect(RectF(0f, 0f, width, height), sky)
      val horizon = coverBottom + gap / 2
      rect(RectF(0f, horizon, width, height), ground)
      canvas.drawPath(Path().apply {
        moveTo(0f, horizon + 2f); lineTo(40f, horizon - 4f); lineTo(90f, horizon + 4f); lineTo(150f, horizon - 6f)
        lineTo(220f, horizon + 2f); lineTo(290f, horizon - 4f); lineTo(width, horizon + 2f); lineTo(width, height); lineTo(0f, height); close()
      }, paint(mesa))
      canvas.drawCircle(coverRect.centerX(), coverRect.centerY(), 78f, Paint(Paint.ANTI_ALIAS_FLAG).apply {
        shader = RadialGradient(coverRect.centerX(), coverRect.centerY(), 78f, intArrayOf(alpha(aura, 0.75f), alpha(orange, 0.35f), alpha(sky, 0f)), floatArrayOf(0f, 0.5f, 1f), Shader.TileMode.CLAMP)
      })
      val dot = paint(spark)
      listOf(18f to 16f, 120f to 10f, 116f to 116f).forEach { (x, y) -> canvas.drawCircle(x, y, 1.4f, dot) }
      canvas.drawPath(Path().apply { moveTo(width - 24f, 30f); lineTo(width - 14f, 26f); lineTo(width - 6f, 32f); lineTo(width - 12f, 39f); lineTo(width - 22f, 38f); close() }, paint(rock))
    }
    val cx = coverRect.centerX()
    val cy = coverRect.centerY()
    val r = coverSize / 2 - 7f
    canvas.drawCircle(cx, cy, r + 3f, paint(aura).apply { setShadowLayer(14f, 0f, 0f, aura) })
    circleCover(cx, cy, r, s("gi", aura), outlineColor)
    canvas.drawOval(RectF(cx - r * 0.66f, cy - r * 0.74f, cx - r * 0.02f, cy - r * 0.36f), paint(alpha(0xFFFFFFFF.toInt(), 0.35f)))
    val power = (state.position * 50).toInt()
    var y = label("NIVEL DE PODER " + String.format("%,d", power).replace(',', '.'), infoLeft, pad, 12f, aura, display, titleWidth, spacing = 0.15f)
    y = label(state.title, infoLeft, y, 21f, ink, display, titleWidth, spacing = 0.04f)
    label(state.artist, infoLeft, y - 2f, 13f, cloud, body, titleWidth)
    circle(heartRect.centerX(), heartRect.centerY(), 16f, panel)
    heart(aura, size = 15f)
    val bar = RectF(infoLeft, coverBottom - 28f, infoRight, coverBottom - 18f)
    rect(bar, s("barBack", panel), 5f)
    clipped(bar, 5f) { rect(RectF(bar.left, bar.top, bar.left + bar.width() * state.progress, bar.bottom), aura) }
    frame(bar, outlineColor, 2f, 5f)
    times(coverBottom - 14f, 11f, cloud, body, prefix = "KI ")
    buttons { rr, kind ->
      when (kind) {
        WidgetButton.PLAY -> {
          canvas.drawRoundRect(rr, 22f, 22f, paint(aura).apply { setShadowLayer(10f, 0f, 0f, aura) })
          frame(rr, outlineColor, 3f, 22f)
          centeredIcon(rr, kind, c("onControl", outlineColor), 17f)
        }
        WidgetButton.SHUFFLE, WidgetButton.REPEAT -> {
          rect(rr, panel, 10f)
          centeredIcon(rr, kind, cloud, 15f)
        }
        else -> {
          rect(rr, outlineColor, 10f)
          val face = RectF(rr.left, rr.top, rr.right, rr.bottom - 3f)
          rect(face, rock, 10f)
          centeredIcon(face, kind, scroll, 16f)
        }
      }
    }
  }

  internal class IconPath(val data: String, val stroke: Float = 0f)

  companion object {
    private const val PLAY = "M8 5.5v13l11-6.5z"
    private const val PAUSE = "M7 5h3.2v14H7zM13.8 5H17v14h-3.2z"
    private const val PREVIOUS = "M18 6.5v11L9 12zM5 6h2.6v12H5z"
    private const val NEXT = "M6 6.5v11l9-5.5zM16.4 6H19v12h-2.6z"
    private const val PREVIOUS_DOUBLE = "M12 6.5v11L4 12zM21 6.5v11L13 12z"
    private const val NEXT_DOUBLE = "M3 6.5v11l8-5.5zM12 6.5v11l8-5.5z"
    private const val TRIANGLE_LEFT = "M16 4v16L6 12z"
    private const val TRIANGLE_RIGHT = "M8 4v16l10-8z"
    private const val SHUFFLE = "M4 7h4c4 0 4 10 8 10h3M4 17h4c4 0 4-10 8-10h3"
    private const val SHUFFLE_SHARP = "M3 7h5l8 10h5M3 17h5l8-10h5"
    private const val REPEAT = "M5 12V9.5A2.5 2.5 0 0 1 7.5 7H18M19 12v2.5a2.5 2.5 0 0 1-2.5 2.5H6"
    private const val REPEAT_SHARP = "M4 12V7h15M20 12v5H5"
    private const val REPEAT_ONE = "M11 10.6l1.4-1v4.8"
    private const val HEART = "M12 20C12 20 3.5 14.5 3.5 9A4.25 4.25 0 0 1 12 7.2A4.25 4.25 0 0 1 20.5 9C20.5 14.5 12 20 12 20z"
    private const val DIAMOND = "M12 21L2 11L7 6L12 11L17 6L22 11z"
    private const val STAR = "M12 2.5l2.6 6.4 6.9.5-5.3 4.4 1.7 6.7L12 16.8l-5.9 3.7 1.7-6.7-5.3-4.4 6.9-.5z"
    private const val STAR_OUTLINE = "M12 4.6l2 4.9 5.3.4-4.1 3.4 1.3 5.1L12 15.6l-4.5 2.8 1.3-5.1-4.1-3.4 5.3-.4z"
    private const val SPARK = "M12 0l2.8 9.2L24 12l-9.2 2.8L12 24l-2.8-9.2L0 12l9.2-2.8z"
    private const val NOTE = "M9 4.5v9.8a3 3 0 1 0 2 2.8V8.2l6-1.5v5.6a3 3 0 1 0 2 2.8V4a1 1 0 0 0-1.24-.97l-8 2A1 1 0 0 0 9 6z"
    private const val BOW_LEFT = "M12 12L2 5Q0 12 2 19z"
    private const val BOW_RIGHT = "M12 12L22 5Q24 12 22 19z"
    private val DIGITS = listOf(IconPath("M9.2 10.2L10.4 9.4V15", 2f), IconPath("M14.2 9.4A1.7 2.8 0 0 1 14.2 15A1.7 2.8 0 0 1 14.2 9.4z", 2f))
    private val BACK10 = listOf(IconPath("M12 4.5A7.5 7.5 0 1 1 4.5 12", 2f), IconPath("M12.5 1.5L8.5 4.5L12.5 7.5z")) + DIGITS
    private val FORWARD10 = listOf(IconPath("M12 4.5A7.5 7.5 0 1 0 19.5 12", 2f), IconPath("M11.5 1.5L15.5 4.5L11.5 7.5z")) + DIGITS

    private val paths = HashMap<String, Path>()
    private val fonts = HashMap<String, Typeface?>()

    fun iconPath(data: String): Path = synchronized(paths) {
      paths.getOrPut(data) { PathParser.createPathFromPathData(data) }
    }

    /** A font shipped in assets/fonts, or null when it is not there. */
    fun loadFont(assets: AssetManager, name: String): Typeface? = synchronized(fonts) {
      fonts.getOrPut(name) {
        try {
          Typeface.createFromAsset(assets, "fonts/$name.ttf")
        } catch (_: RuntimeException) {
          null
        }
      }
    }

    fun formatTime(seconds: Double, long: Boolean = false): String {
      val total = max(0, seconds.toInt())
      val text = "%d:%02d".format(total / 60, total % 60)
      return if (long) "%02d:%02d".format(total / 60, total % 60) else text
    }
  }
}
