package com.doublesymmetry.kotlinaudio.audio

import kotlin.math.PI
import kotlin.math.sin
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class LoudnessMeterTest {
    private fun tone(sampleRate: Int, channels: Int, amplitude: Double, seconds: Int): FloatArray {
        val frames = sampleRate * seconds
        return FloatArray(frames * channels) { index ->
            (sin(2 * PI * 1_000 * (index / channels) / sampleRate) * amplitude).toFloat()
        }
    }

    /** The standard's reference: a full-scale 1 kHz tone in one channel reads -3.01. */
    @Test
    fun fullScaleToneMatchesTheStandard() {
        listOf(44_100, 48_000).forEach { rate ->
            val meter = LoudnessMeter(rate, 1)
            val samples = tone(rate, 1, 1.0, 3)
            meter.add(samples, samples.size)
            assertEquals(-3.01, meter.loudness()!!, 0.1)
        }
    }

    @Test
    fun stereoIsThreeDecibelsLouderAndQuieterTonesReadLower() {
        val stereo = LoudnessMeter(48_000, 2)
        val loud = tone(48_000, 2, 1.0, 3)
        stereo.add(loud, loud.size)
        assertEquals(0.0, stereo.loudness()!!, 0.1)

        val quiet = LoudnessMeter(48_000, 2)
        val soft = tone(48_000, 2, 0.1, 3)
        quiet.add(soft, soft.size)
        assertEquals(-20.0, quiet.loudness()!!, 0.1)
    }

    @Test
    fun silenceHasNoLoudnessAndQuietPartsDoNotLowerIt() {
        val silent = LoudnessMeter(48_000, 1)
        silent.add(FloatArray(48_000 * 2), 48_000 * 2)
        assertNull(silent.loudness())

        val mixed = LoudnessMeter(48_000, 1)
        val loud = tone(48_000, 1, 0.5, 3)
        mixed.add(loud, loud.size)
        mixed.endWindow()
        mixed.add(FloatArray(48_000 * 3), 48_000 * 3)
        assertEquals(-9.03, mixed.loudness()!!, 0.2)
    }

    @Test
    fun loudSongsAreTurnedDownAndQuietOnesAreLeftAlone() {
        assertEquals(0.5f, levelingGain(-8.0), 0.01f)
        assertEquals(1f, levelingGain(-20.0), 0.001f)
        assertEquals(0.251f, levelingGain(3.0), 0.01f)
    }
}
