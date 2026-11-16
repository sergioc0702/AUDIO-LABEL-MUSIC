package com.doublesymmetry.kotlinaudio.audio

import kotlin.math.PI
import kotlin.math.log10
import kotlin.math.pow
import kotlin.math.tan

/** How loud songs should sound once leveled, in LUFS. */
const val TARGET_LOUDNESS_LUFS = -14.0

/** Songs are only turned down, never up, so that leveling cannot distort them. */
const val MAX_ATTENUATION_DB = 12.0

/** The volume, from 0 to 1, that brings a song of [lufs] to the target loudness. */
fun levelingGain(lufs: Double): Float {
    val gainDb = (TARGET_LOUDNESS_LUFS - lufs).coerceIn(-MAX_ATTENUATION_DB, 0.0)
    return 10.0.pow(gainDb / 20.0).toFloat()
}

/**
 * Measures how loud audio sounds to a person (ITU-R BS.1770 loudness): the
 * samples go through a filter that weighs frequencies like the ear does, and
 * quiet passages are left out of the average.
 */
class LoudnessMeter(sampleRate: Int, private val channels: Int) {
    private val shelf = shelfCoefficients(sampleRate)
    private val highPass = highPassCoefficients(sampleRate)
    private val shelfState = Array(channels) { DoubleArray(2) }
    private val highPassState = Array(channels) { DoubleArray(2) }

    /** Energy of each 100 ms step; a block is four steps in a row. */
    private val stepFrames = sampleRate / 10
    private var stepEnergy = 0.0
    private var framesInStep = 0
    private val steps = ArrayList<Double>()
    private val blocks = ArrayList<Double>()
    private var channel = 0

    /** Adds interleaved samples between -1 and 1. */
    fun add(samples: FloatArray, count: Int) {
        for (index in 0 until count) {
            var value = samples[index].toDouble()
            value = filter(shelf, shelfState[channel], value)
            value = filter(highPass, highPassState[channel], value)
            stepEnergy += value * value
            channel += 1
            if (channel == channels) {
                channel = 0
                framesInStep += 1
                if (framesInStep == stepFrames) {
                    steps.add(stepEnergy / stepFrames)
                    stepEnergy = 0.0
                    framesInStep = 0
                    if (steps.size >= 4) {
                        blocks.add(steps.takeLast(4).sum() / 4)
                    }
                }
            }
        }
    }

    /** Ends a stretch of audio that does not continue into the next one. */
    fun endWindow() {
        steps.clear()
        stepEnergy = 0.0
        framesInStep = 0
        channel = 0
        shelfState.forEach { it.fill(0.0) }
        highPassState.forEach { it.fill(0.0) }
    }

    /** The loudness of everything added, or null when it was silence or too short. */
    fun loudness(): Double? {
        val audible = blocks.filter { toLufs(it) > ABSOLUTE_GATE_LUFS }
        if (audible.isEmpty()) return null
        val relativeGate = toLufs(audible.average()) - RELATIVE_GATE_LU
        val counted = audible.filter { toLufs(it) > relativeGate }
        if (counted.isEmpty()) return null
        return toLufs(counted.average())
    }

    private fun toLufs(energy: Double) = -0.691 + 10 * log10(energy.coerceAtLeast(1e-12))

    private fun filter(c: DoubleArray, state: DoubleArray, input: Double): Double {
        val output = c[0] * input + state[0]
        state[0] = c[1] * input - c[3] * output + state[1]
        state[1] = c[2] * input - c[4] * output
        return output
    }

    private companion object {
        const val ABSOLUTE_GATE_LUFS = -70.0
        const val RELATIVE_GATE_LU = 10.0

        /** b0, b1, b2, a1, a2 of the high shelf of the K-weighting curve. */
        fun shelfCoefficients(sampleRate: Int): DoubleArray {
            val gain = 10.0.pow(3.999843853973347 / 20)
            val band = gain.pow(0.4996667741545416)
            val k = tan(PI * 1681.974450955533 / sampleRate)
            val q = 0.7071752369554196
            val a0 = 1 + k / q + k * k
            return doubleArrayOf(
                (gain + band * k / q + k * k) / a0,
                2 * (k * k - gain) / a0,
                (gain - band * k / q + k * k) / a0,
                2 * (k * k - 1) / a0,
                (1 - k / q + k * k) / a0,
            )
        }

        fun highPassCoefficients(sampleRate: Int): DoubleArray {
            val k = tan(PI * 38.13547087602444 / sampleRate)
            val q = 0.5003270373238773
            val a0 = 1 + k / q + k * k
            return doubleArrayOf(1.0, -2.0, 1.0, 2 * (k * k - 1) / a0, (1 - k / q + k * k) / a0)
        }
    }
}
