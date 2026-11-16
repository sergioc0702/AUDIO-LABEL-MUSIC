package com.doublesymmetry.kotlinaudio.audio

import com.google.android.exoplayer2.C
import com.google.android.exoplayer2.audio.AudioProcessor.AudioFormat
import java.nio.ByteBuffer
import java.nio.ByteOrder
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class CrossfadeAudioProcessorTest {
    private val processor = CrossfadeAudioProcessor()
    private val format = AudioFormat(1_000, 1, C.ENCODING_PCM_16BIT)

    @After
    fun restore() {
        PlaybackTuning.setCrossfadeSeconds(0)
        PlaybackTuning.crossfadeSuppressed = false
        processor.reset()
    }

    private fun start() {
        processor.configure(format)
        processor.flush()
    }

    /** Feeds [count] samples of [value] in small chunks and returns what came out. */
    private fun feed(value: Int, count: Int, chunk: Int = 100): List<Int> {
        val out = mutableListOf<Int>()
        var left = count
        while (left > 0) {
            val size = minOf(chunk, left)
            val input = ByteBuffer.allocateDirect(size * 2).order(ByteOrder.LITTLE_ENDIAN)
            repeat(size) { input.putShort(value.toShort()) }
            input.flip()
            processor.queueInput(input)
            out += drain()
            left -= size
        }
        return out
    }

    private fun drain(): List<Int> {
        val output = processor.output.order(ByteOrder.LITTLE_ENDIAN)
        return List(output.remaining() / 2) { output.short.toInt() }
    }

    /** What the sink does when the next song has the same format. */
    private fun songChange(): List<Int> {
        processor.onStreamChange()
        processor.configure(format)
        processor.queueEndOfStream()
        val out = drain()
        assertTrue(processor.isEnded)
        processor.flush()
        return out
    }

    @Test
    fun withoutCrossfadeEverySampleComesOutAtOnce() {
        start()
        assertEquals(List(250) { 1_000 }, feed(1_000, 250))
        assertEquals(emptyList<Int>(), songChange())
        assertEquals(List(50) { 2_000 }, feed(2_000, 50))
    }

    @Test
    fun theLastSecondsAreBlendedWithTheNextSong() {
        PlaybackTuning.setCrossfadeSeconds(2)
        start()
        // 10 s of the first song: all but the last 2 s are played.
        val first = feed(1_000, 10_000)
        assertEquals(8_000, first.size)
        assertTrue(first.all { it == 1_000 })

        assertEquals(emptyList<Int>(), songChange())
        val second = feed(-1_000, 6_000)
        // The blend takes the place of the held 2 s: one sample out per sample in.
        val blend = second.take(2_000)
        assertTrue(blend.first() > 900)
        assertTrue(blend.last() < -900)
        assertTrue(blend.zipWithNext().all { (a, b) -> b <= a })
        // After it the second song plays alone, while a new tail is held.
        val after = second.drop(2_000)
        assertTrue(after.isNotEmpty() && after.all { it == -1_000 })

        processor.queueEndOfStream()
        val rest = drain()
        assertEquals(6_000 - 2_000, after.size + rest.size)
        assertTrue(processor.isEnded)
    }

    @Test
    fun seekingDropsWhatWasHeld() {
        PlaybackTuning.setCrossfadeSeconds(2)
        start()
        feed(1_000, 5_000)
        processor.onStreamChange()
        processor.configure(format)
        processor.queueEndOfStream()
        processor.cancelBlend()
        processor.flush()

        val out = feed(-1_000, 4_100)
        assertTrue(out.isNotEmpty() && out.all { it == -1_000 })
    }

    @Test
    fun theEndOfTheQueuePlaysTheHeldTail() {
        PlaybackTuning.setCrossfadeSeconds(2)
        start()
        val played = feed(1_000, 5_000)
        processor.queueEndOfStream()
        assertEquals(5_000, played.size + drain().size)
        assertTrue(processor.isEnded)
    }

    @Test
    fun aDifferentFormatIsNotBlended() {
        PlaybackTuning.setCrossfadeSeconds(2)
        start()
        val played = feed(1_000, 5_000)
        processor.onStreamChange()
        processor.configure(AudioFormat(2_000, 1, C.ENCODING_PCM_16BIT))
        processor.queueEndOfStream()
        assertEquals(5_000, played.size + drain().size)
    }

    @Test
    fun stopAfterThisSongPlaysItToTheEnd() {
        PlaybackTuning.setCrossfadeSeconds(2)
        start()
        val played = feed(1_000, 5_000)
        PlaybackTuning.crossfadeSuppressed = true
        processor.onStreamChange()
        processor.configure(format)
        processor.queueEndOfStream()
        assertEquals(5_000, played.size + drain().size)
    }

    @Test
    fun outputStartsBeforeTheHoldIsFull() {
        PlaybackTuning.setCrossfadeSeconds(2)
        start()
        assertEquals(50, feed(1_000, 100).size)
    }
}
