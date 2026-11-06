package com.doublesymmetry.kotlinaudio.audio

import com.google.android.exoplayer2.C
import com.google.android.exoplayer2.audio.AudioProcessor
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.abs
import kotlin.math.sin
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
    fun enabledBandChangesMatchingPcmSignal() {
        SoftwareEqualizer.update(true, listOf(12f, 0f, 0f, 0f, 0f))
        processor.configure(AudioProcessor.AudioFormat(48_000, 1, C.ENCODING_PCM_16BIT))
        val input = ByteBuffer.allocateDirect(4_800 * Short.SIZE_BYTES)
            .order(ByteOrder.LITTLE_ENDIAN)
        repeat(4_800) { index ->
            val sample = (sin(2.0 * Math.PI * 60.0 * index / 48_000) * 3_000).toInt()
            input.putShort(sample.toShort())
        }
        input.flip()

        processor.queueInput(input)
        val output = processor.getOutput().order(ByteOrder.LITTLE_ENDIAN)
        val outputSamples = IntArray(4_800) { output.short.toInt() }
        val inputRms = 3_000 / kotlin.math.sqrt(2.0)
        val outputRms = kotlin.math.sqrt(
            outputSamples.drop(2_400).sumOf { sample -> sample.toDouble() * sample } /
                2_400,
        )

        assertTrue(abs(outputRms - inputRms) > inputRms)
    }

    @Test
    fun settingsRejectGainsOutsideSupportedRange() {
        assertThrows(IllegalArgumentException::class.java) {
            SoftwareEqualizer.update(true, listOf(13f, 0f, 0f, 0f, 0f))
        }
    }
}
