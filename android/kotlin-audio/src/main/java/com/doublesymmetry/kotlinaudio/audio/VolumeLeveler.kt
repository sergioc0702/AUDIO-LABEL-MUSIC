package com.doublesymmetry.kotlinaudio.audio

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import android.media.AudioFormat
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.os.Process
import android.os.SystemClock
import com.google.android.exoplayer2.ExoPlayer
import com.google.android.exoplayer2.MediaItem
import com.google.android.exoplayer2.Player
import com.google.android.exoplayer2.Timeline
import java.nio.ByteOrder
import java.util.concurrent.Executors
import timber.log.Timber

/** Measured loudness per song, kept between launches so each song is decoded once. */
private class LoudnessCache(context: Context) :
    SQLiteOpenHelper(context.applicationContext, "loudness.db", null, 1) {
    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL("CREATE TABLE loudness (uri TEXT PRIMARY KEY NOT NULL, lufs REAL)")
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) = Unit

    /** A null value in the result means the song could not be measured. */
    fun read(uri: String): Result? =
        readableDatabase.rawQuery("SELECT lufs FROM loudness WHERE uri = ?", arrayOf(uri)).use {
            if (it.moveToFirst()) Result(if (it.isNull(0)) null else it.getDouble(0)) else null
        }

    fun write(uri: String, lufs: Double?) {
        writableDatabase.insertWithOnConflict(
            "loudness",
            null,
            ContentValues().apply {
                put("uri", uri)
                if (lufs != null) put("lufs", lufs) else putNull("lufs")
            },
            SQLiteDatabase.CONFLICT_REPLACE,
        )
    }

    class Result(val lufs: Double?)
}

/** Decodes a few stretches of a song, spread along it, and measures their loudness. */
internal object LoudnessAnalyzer {
    private const val WINDOW_US = 5_000_000L
    private const val WINDOWS = 6
    private const val WHOLE_SONG_US = 40_000_000L
    private const val TIMEOUT_US = 10_000L
    private const val MAX_MILLIS = 20_000L

    fun measure(context: Context, uri: Uri): Double? {
        val extractor = MediaExtractor()
        var codec: MediaCodec? = null
        try {
            extractor.setDataSource(context, uri, null)
            val track = (0 until extractor.trackCount).firstOrNull {
                extractor.getTrackFormat(it).getString(MediaFormat.KEY_MIME)?.startsWith("audio/") == true
            } ?: return null
            val format = extractor.getTrackFormat(track)
            extractor.selectTrack(track)
            val mime = format.getString(MediaFormat.KEY_MIME) ?: return null
            val duration =
                if (format.containsKey(MediaFormat.KEY_DURATION)) format.getLong(MediaFormat.KEY_DURATION) else 0L
            val decoder = MediaCodec.createDecoderByType(mime)
            codec = decoder
            decoder.configure(format, null, null, 0)
            decoder.start()

            val starts =
                if (duration <= WHOLE_SONG_US) {
                    listOf(0L)
                } else {
                    List(WINDOWS) { index ->
                        (duration * (0.1 + 0.8 * index / (WINDOWS - 1))).toLong() - WINDOW_US / 2
                    }
                }
            val windowLength = if (duration <= WHOLE_SONG_US) WHOLE_SONG_US else WINDOW_US
            val deadline = SystemClock.elapsedRealtime() + MAX_MILLIS
            var meter: LoudnessMeter? = null
            var samples = FloatArray(0)
            val info = MediaCodec.BufferInfo()

            for (start in starts) {
                extractor.seekTo(start.coerceAtLeast(0), MediaExtractor.SEEK_TO_CLOSEST_SYNC)
                decoder.flush()
                meter?.endWindow()
                val end = extractor.sampleTime.coerceAtLeast(0) + windowLength
                var inputDone = false
                var outputDone = false
                while (!outputDone) {
                    if (SystemClock.elapsedRealtime() > deadline) return meter?.loudness()
                    if (!inputDone) {
                        val index = decoder.dequeueInputBuffer(TIMEOUT_US)
                        if (index >= 0) {
                            val buffer = decoder.getInputBuffer(index)
                            val read = buffer?.let { extractor.readSampleData(it, 0) } ?: -1
                            if (read < 0 || extractor.sampleTime > end) {
                                decoder.queueInputBuffer(index, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
                                inputDone = true
                            } else {
                                decoder.queueInputBuffer(index, 0, read, extractor.sampleTime, 0)
                                extractor.advance()
                            }
                        }
                    }
                    val index = decoder.dequeueOutputBuffer(info, TIMEOUT_US)
                    if (index >= 0) {
                        val output = decoder.outputFormat
                        val encoding =
                            if (output.containsKey(MediaFormat.KEY_PCM_ENCODING)) {
                                output.getInteger(MediaFormat.KEY_PCM_ENCODING)
                            } else {
                                AudioFormat.ENCODING_PCM_16BIT
                            }
                        val buffer = decoder.getOutputBuffer(index)
                        if (buffer != null && info.size > 0) {
                            buffer.position(info.offset).limit(info.offset + info.size)
                            buffer.order(ByteOrder.LITTLE_ENDIAN)
                            val current = meter ?: LoudnessMeter(
                                output.getInteger(MediaFormat.KEY_SAMPLE_RATE),
                                output.getInteger(MediaFormat.KEY_CHANNEL_COUNT),
                            ).also { meter = it }
                            val count: Int
                            when (encoding) {
                                AudioFormat.ENCODING_PCM_16BIT -> {
                                    val shorts = buffer.asShortBuffer()
                                    count = shorts.remaining()
                                    if (samples.size < count) samples = FloatArray(count)
                                    for (i in 0 until count) samples[i] = shorts.get(i) / 32_768f
                                }
                                AudioFormat.ENCODING_PCM_FLOAT -> {
                                    val floats = buffer.asFloatBuffer()
                                    count = floats.remaining()
                                    if (samples.size < count) samples = FloatArray(count)
                                    floats.get(samples, 0, count)
                                }
                                else -> return null
                            }
                            current.add(samples, count)
                        }
                        decoder.releaseOutputBuffer(index, false)
                        if (info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) {
                            outputDone = true
                        }
                    }
                }
            }
            return meter?.loudness()
        } catch (error: Exception) {
            Timber.w(error, "Could not measure the loudness of %s", uri)
            return null
        } finally {
            try {
                codec?.stop()
            } catch (_: Exception) {
            }
            codec?.release()
            extractor.release()
        }
    }
}

/**
 * Plays every song at a similar loudness. Songs are measured in the
 * background the first time they come up in the queue; the measured level is
 * applied through the player volume, which takes effect at once.
 */
internal class VolumeLeveler(
    private val context: Context,
    private val player: ExoPlayer,
    private val applyGain: (Float) -> Unit,
) : Player.Listener {
    private val cache = LoudnessCache(context)
    private val main = Handler(Looper.getMainLooper())
    private val worker = Executors.newSingleThreadExecutor { task ->
        Thread({
            Process.setThreadPriority(Process.THREAD_PRIORITY_BACKGROUND)
            task.run()
        }, "loudness")
    }
    private val known = HashMap<String, Double?>()
    private val queued = HashSet<String>()
    private var gain = 1f
    private var ramp: Runnable? = null
    private var released = false
    private val settingsListener = { main.post { refresh(RAMP_MS) }; Unit }

    init {
        PlaybackTuning.addListener(settingsListener)
        player.addListener(this)
    }

    fun release() {
        released = true
        PlaybackTuning.removeListener(settingsListener)
        player.removeListener(this)
        ramp?.let(main::removeCallbacks)
        worker.shutdown()
        cache.close()
    }

    override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
        val blending =
            reason == Player.MEDIA_ITEM_TRANSITION_REASON_AUTO ||
                reason == Player.MEDIA_ITEM_TRANSITION_REASON_REPEAT
        // During a crossfade the level glides from one song's to the other's.
        refresh(if (blending) PlaybackTuning.effectiveCrossfadeMs().coerceAtLeast(0) else 0)
    }

    override fun onTimelineChanged(timeline: Timeline, reason: Int) {
        refresh(RAMP_MS)
    }

    private fun refresh(rampMs: Int) {
        if (released) return
        if (!PlaybackTuning.normalizeVolume) {
            rampTo(1f, rampMs)
            return
        }
        val index = player.currentMediaItemIndex
        val count = player.mediaItemCount
        if (count == 0) return
        val current = uriAt(index)
        for (offset in 0..LOOK_AHEAD) {
            if (index + offset < count) uriAt(index + offset)?.let(::measureLater)
        }
        val lufs = current?.let { known[it] }
        rampTo(if (lufs != null) levelingGain(lufs) else UNKNOWN_GAIN, rampMs)
    }

    private fun uriAt(index: Int): String? {
        val uri = player.getMediaItemAt(index).localConfiguration?.uri ?: return null
        return uri.toString().takeIf { uri.scheme == "content" || uri.scheme == "file" }
    }

    private fun measureLater(uri: String) {
        if (uri in known || !queued.add(uri)) return
        worker.execute {
            val cached = cache.read(uri)
            val lufs = if (cached != null) {
                cached.lufs
            } else {
                LoudnessAnalyzer.measure(context, Uri.parse(uri)).also { cache.write(uri, it) }
            }
            main.post {
                if (released) return@post
                known[uri] = lufs
                queued.remove(uri)
                if (player.mediaItemCount > 0 && uriAt(player.currentMediaItemIndex) == uri) {
                    refresh(RAMP_MS)
                }
            }
        }
    }

    private fun rampTo(target: Float, millis: Int) {
        ramp?.let(main::removeCallbacks)
        ramp = null
        if (millis <= 0 || target == gain) {
            gain = target
            applyGain(gain)
            return
        }
        val from = gain
        val startedAt = SystemClock.uptimeMillis()
        val step = object : Runnable {
            override fun run() {
                val progress = ((SystemClock.uptimeMillis() - startedAt).toFloat() / millis).coerceIn(0f, 1f)
                gain = from + (target - from) * progress
                applyGain(gain)
                if (progress < 1f) main.postDelayed(this, STEP_MS) else ramp = null
            }
        }
        ramp = step
        main.post(step)
    }

    private companion object {
        const val LOOK_AHEAD = 3
        const val RAMP_MS = 400
        const val STEP_MS = 20L

        /** Until a song is measured it plays a little lower, like most songs end up. */
        const val UNKNOWN_GAIN = 0.6f
    }
}
