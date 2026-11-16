package com.doublesymmetry.kotlinaudio.audio

import com.google.android.exoplayer2.C
import com.google.android.exoplayer2.audio.AudioProcessor
import com.google.android.exoplayer2.audio.AudioProcessor.AudioFormat
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sqrt

const val CROSSFADE_MAX_SECONDS = 12

/** Playback options shared by the app and the audio pipeline. */
object PlaybackTuning {
    /** Length of the blend between two songs; 0 plays them back to back. */
    @Volatile
    var crossfadeMs: Int = 0
        private set

    /** Set while the next song change must not blend, e.g. "stop after this song". */
    @Volatile
    var crossfadeSuppressed: Boolean = false

    @Volatile
    var normalizeVolume: Boolean = false
        private set

    private val listeners = mutableListOf<() -> Unit>()

    fun setCrossfadeSeconds(seconds: Int) {
        require(seconds in 0..CROSSFADE_MAX_SECONDS)
        crossfadeMs = seconds * 1000
    }

    fun setNormalizeVolume(enabled: Boolean) {
        normalizeVolume = enabled
        synchronized(listeners) { listeners.toList() }.forEach { it() }
    }

    fun addListener(listener: () -> Unit) {
        synchronized(listeners) { listeners.add(listener) }
    }

    fun removeListener(listener: () -> Unit) {
        synchronized(listeners) { listeners.remove(listener) }
    }

    internal fun effectiveCrossfadeMs() = if (crossfadeSuppressed) 0 else crossfadeMs
}

/**
 * Blends the end of a song into the start of the next one.
 *
 * The player hands songs to the audio pipeline one after another, so this
 * processor always keeps the last seconds it received. When the renderer
 * reports that the next input belongs to another song ([onStreamChange]),
 * those held seconds are mixed with the new song instead of being played
 * first. Songs are only blended when both have the same format and the
 * change was automatic: a seek or a skip ([cancelBlend]) plays a clean cut.
 *
 * At a song change the sink configures the processors, asks them to drain
 * (end of stream) and flushes them. The held tail survives that sequence, and
 * because it was never written to the audio track, the sink reports the new
 * song as started exactly when the blend becomes audible.
 */
internal class CrossfadeAudioProcessor : AudioProcessor {
    private var pendingFormat = AudioFormat.NOT_SET
    private var format = AudioFormat.NOT_SET
    private var frameSize = 0
    private var outputBuffer = AudioProcessor.EMPTY_BUFFER
    private var reusableOutputBuffer = AudioProcessor.EMPTY_BUFFER
    private var inputEnded = false

    /** Held audio, oldest first, as a ring of bytes. */
    private var ring = ByteArray(0)
    private var head = 0
    private var size = 0

    /** Bytes of the held tail still to be mixed with the new song. */
    private var mixRemaining = 0
    private var mixTotal = 0
    private var streamChanged = false
    private var reconfigured = false
    private var keepTail = false

    /** The next input belongs to another song. Called on the playback thread. */
    fun onStreamChange() {
        streamChanged = true
    }

    /** A seek or a skip: whatever is held must not be heard. */
    fun cancelBlend() {
        streamChanged = false
        keepTail = false
    }

    override fun configure(inputAudioFormat: AudioFormat): AudioFormat {
        pendingFormat =
            if (
                inputAudioFormat.encoding == C.ENCODING_PCM_16BIT &&
                inputAudioFormat.sampleRate > 0 &&
                inputAudioFormat.channelCount > 0
            ) {
                inputAudioFormat
            } else {
                AudioFormat.NOT_SET
            }
        reconfigured = true
        return pendingFormat
    }

    override fun isActive(): Boolean = pendingFormat != AudioFormat.NOT_SET

    override fun queueInput(inputBuffer: ByteBuffer) {
        if (format == AudioFormat.NOT_SET || !inputBuffer.hasRemaining()) {
            return
        }
        val input = inputBuffer.slice().order(ByteOrder.LITTLE_ENDIAN)
        inputBuffer.position(inputBuffer.limit())
        if (streamChanged) {
            // A song change the sink did not reconfigure for.
            streamChanged = false
            startBlend()
        }

        val output = replaceOutputBuffer(input.remaining() + size)
        if (mixRemaining > 0) {
            mix(input, output)
        }
        if (input.hasRemaining()) {
            val received = input.remaining()
            append(input)
            val target = holdBytes()
            // While the hold is filling, half of what arrives is still played so
            // that the audio track never runs dry.
            val emit = if (size > target) size - target else min(size, alignFrames(received / 2))
            take(emit, output)
        }
        output.flip()
    }

    override fun queueEndOfStream() {
        inputEnded = true
        val blendNext =
            streamChanged && reconfigured && pendingFormat == format && size > 0 &&
                PlaybackTuning.effectiveCrossfadeMs() > 0
        if (blendNext) {
            keepTail = true
            return
        }
        streamChanged = false
        mixRemaining = 0
        if (size > 0) {
            val output = replaceOutputBuffer(size)
            take(size, output)
            output.flip()
        }
    }

    override fun getOutput(): ByteBuffer {
        val output = outputBuffer
        outputBuffer = AudioProcessor.EMPTY_BUFFER
        return output
    }

    override fun isEnded(): Boolean = inputEnded && !outputBuffer.hasRemaining()

    override fun flush() {
        outputBuffer = AudioProcessor.EMPTY_BUFFER
        inputEnded = false
        val blend = keepTail && streamChanged && pendingFormat == format
        format = pendingFormat
        frameSize = if (format == AudioFormat.NOT_SET) 0 else format.channelCount * 2
        reconfigured = false
        keepTail = false
        streamChanged = false
        if (blend) {
            startBlend()
        } else {
            head = 0
            size = 0
            mixRemaining = 0
        }
    }

    override fun reset() {
        pendingFormat = AudioFormat.NOT_SET
        cancelBlend()
        flush()
        ring = ByteArray(0)
        reusableOutputBuffer = AudioProcessor.EMPTY_BUFFER
    }

    private fun startBlend() {
        mixTotal = size
        mixRemaining = size
    }

    private fun holdBytes(): Int {
        val frames = format.sampleRate.toLong() * PlaybackTuning.effectiveCrossfadeMs() / 1000
        return (frames * frameSize).toInt()
    }

    private fun alignFrames(bytes: Int) = bytes - bytes % frameSize

    /** Mixes the oldest held frames with [input], fading one out and the other in. */
    private fun mix(input: ByteBuffer, output: ByteBuffer) {
        val bytes = alignFrames(min(mixRemaining, input.remaining()))
        var done = 0
        while (done < bytes) {
            val progress = (mixTotal - mixRemaining).toFloat() / mixTotal
            // Equal-power curves keep the loudness steady through the blend.
            val fadeOut = sqrt(1f - progress)
            val fadeIn = sqrt(progress)
            repeat(format.channelCount) {
                val low = ring[head].toInt() and 0xff
                val high = ring[(head + 1) % ring.size].toInt()
                val held = (high shl 8) or low
                val mixed = (held * fadeOut + input.short * fadeIn).toInt()
                output.putShort(mixed.coerceIn(-32_768, 32_767).toShort())
                head = (head + 2) % ring.size
            }
            size -= frameSize
            mixRemaining -= frameSize
            done += frameSize
        }
        if (bytes == 0) {
            // Less than one frame left to mix: nothing more to blend.
            mixRemaining = 0
        }
    }

    private fun append(input: ByteBuffer) {
        val count = input.remaining()
        if (size + count > ring.size) {
            val grown = ByteArray(max(size + count, ring.size * 2))
            val first = min(size, ring.size - head)
            System.arraycopy(ring, head, grown, 0, first)
            System.arraycopy(ring, 0, grown, first, size - first)
            ring = grown
            head = 0
        }
        val tail = (head + size) % ring.size
        val first = min(count, ring.size - tail)
        input.get(ring, tail, first)
        input.get(ring, 0, count - first)
        size += count
    }

    private fun take(count: Int, output: ByteBuffer) {
        if (count <= 0) return
        val first = min(count, ring.size - head)
        output.put(ring, head, first)
        output.put(ring, 0, count - first)
        head = (head + count) % ring.size
        size -= count
    }

    private fun replaceOutputBuffer(capacity: Int): ByteBuffer {
        if (reusableOutputBuffer.capacity() < capacity) {
            reusableOutputBuffer =
                ByteBuffer.allocateDirect(capacity).order(ByteOrder.LITTLE_ENDIAN)
        } else {
            reusableOutputBuffer.clear()
        }
        outputBuffer = reusableOutputBuffer
        return reusableOutputBuffer
    }
}
