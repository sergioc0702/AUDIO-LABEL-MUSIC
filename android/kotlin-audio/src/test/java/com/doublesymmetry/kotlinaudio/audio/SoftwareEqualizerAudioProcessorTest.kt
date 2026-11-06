package com.doublesymmetry.kotlinaudio.audio

import com.google.android.exoplayer2.C
import com.google.android.exoplayer2.audio.AudioProcessor
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.abs
import kotlin.math.sin
import kotlin.math.sqrt
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

class SoftwareEqualizerAudioProcessorTest {
    private val processor = SoftwareEqualizerAudioProcessor()

    @After
    fun resetSettings() {
        SoftwareEqualizer.update(false, List(EQUALIZER_BAND_COUNT) { 0f })
        processor.reset()
    }

    @Test
    fun disabledEqualizerPassesPcmSamplesThroughUnchanged() {
        SoftwareEqualizer.update(false, List(EQUALIZER_BAND_COUNT) { 0f })
        processor.configure(AudioProcessor.AudioFormat(48_000, 1, C.ENCODING_PCM_16BIT))
        val input = ByteBuffer.allocateDirect(4).order(ByteOrder.LITTLE_ENDIAN)
            .putShort(1_234)
            .putShort(-1_234)
        input.flip()

        processor.queueInput(input)
        val output = processor.getOutput().order(ByteOrder.LITTLE_ENDIAN)

        assertEquals(1_234, output.short.toInt())
        assertEquals(-1_234, output.short.toInt())
    }

    @Test
    fun enabledBandBoostsMatchingSignalRelativeToOtherBands() {
        SoftwareEqualizer.update(true, listOf(12f, 0f, 0f, 0f, 0f))
        processor.configure(AudioProcessor.AudioFormat(48_000, 1, C.ENCODING_PCM_16BIT))

        val boostedRms = rms(processTone(frequencyHz = 60.0, amplitude = 3_000))
        processor.flush()
        val otherRms = rms(processTone(frequencyHz = 4_000.0, amplitude = 3_000))

        assertTrue(boostedRms / otherRms > 3.0)
    }

    @Test
    fun highGainDoesNotClipLoudSignal() {
        SoftwareEqualizer.update(true, listOf(12f, 0f, 0f, 0f, 0f))
        processor.configure(AudioProcessor.AudioFormat(48_000, 1, C.ENCODING_PCM_16BIT))

        val output = processTone(frequencyHz = 60.0, amplitude = 30_000)

        assertTrue(output.maxOf { sample -> abs(sample) } < 32_000)
    }

    @Test
    fun settingsRejectGainsOutsideSupportedRange() {
        assertThrows(IllegalArgumentException::class.java) {
            SoftwareEqualizer.update(true, listOf(13f, 0f, 0f, 0f, 0f))
        }
    }

    /** Returns the second half of the output, once the filters have settled. */
    private fun processTone(frequencyHz: Double, amplitude: Int): List<Int> {
        val sampleCount = 9_600
        val input = ByteBuffer.allocateDirect(sampleCount * Short.SIZE_BYTES)
            .order(ByteOrder.LITTLE_ENDIAN)
        repeat(sampleCount) { index ->
            val sample = sin(2.0 * Math.PI * frequencyHz * index / 48_000) * amplitude
            input.putShort(sample.toInt().toShort())
        }
        input.flip()

        processor.queueInput(input)
        val output = processor.getOutput().order(ByteOrder.LITTLE_ENDIAN)
        return List(sampleCount) { output.short.toInt() }.drop(sampleCount / 2)
    }

    private fun rms(samples: List<Int>): Double =
        sqrt(samples.sumOf { sample -> sample.toDouble() * sample } / samples.size)
}
