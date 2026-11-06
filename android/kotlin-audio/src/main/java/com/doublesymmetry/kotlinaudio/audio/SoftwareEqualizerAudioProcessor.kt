package com.doublesymmetry.kotlinaudio.audio

import android.content.Context
import com.google.android.exoplayer2.DefaultRenderersFactory
import com.google.android.exoplayer2.audio.AudioProcessor
import com.google.android.exoplayer2.audio.DefaultAudioSink
import com.google.android.exoplayer2.audio.AudioProcessor.AudioFormat
import com.google.android.exoplayer2.C
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.pow
import kotlin.math.roundToInt
import kotlin.math.sin

const val EQUALIZER_BAND_COUNT = 5
const val EQUALIZER_MIN_GAIN_DB = -12f
const val EQUALIZER_MAX_GAIN_DB = 12f

data class EqualizerSettings(
    val enabled: Boolean = false,
    val bandGainsDb: List<Float> = List(EQUALIZER_BAND_COUNT) { 0f },
)

object SoftwareEqualizer {
    @Volatile
    private var settings = EqualizerSettings()

    fun snapshot(): EqualizerSettings = settings

    fun update(enabled: Boolean, bandGainsDb: List<Float>) {
        require(bandGainsDb.size == EQUALIZER_BAND_COUNT)
        require(
            bandGainsDb.all {
                it.isFinite() && it in EQUALIZER_MIN_GAIN_DB..EQUALIZER_MAX_GAIN_DB
            },
        )
        settings = EqualizerSettings(enabled, bandGainsDb.toList())
    }
}

internal class SoftwareEqualizerRenderersFactory(context: Context) :
    DefaultRenderersFactory(context) {
    override fun buildAudioSink(
        context: Context,
        enableFloatOutput: Boolean,
        enableAudioTrackPlaybackParams: Boolean,
        enableOffload: Boolean,
    ) = DefaultAudioSink.Builder(context)
        .setAudioProcessors(arrayOf(SoftwareEqualizerAudioProcessor()))
        .setEnableFloatOutput(enableFloatOutput)
        .setEnableAudioTrackPlaybackParams(enableAudioTrackPlaybackParams)
        .setOffloadMode(
            if (enableOffload) {
                DefaultAudioSink.OFFLOAD_MODE_ENABLED_GAPLESS_REQUIRED
            } else {
                DefaultAudioSink.OFFLOAD_MODE_DISABLED
            },
        )
        .build()
}

internal class SoftwareEqualizerAudioProcessor : AudioProcessor {
    private val frequenciesHz = floatArrayOf(60f, 250f, 1_000f, 4_000f, 12_000f)
    private var sampleRateHz = 0
    private var channelCount = 0
    private var encoding = C.ENCODING_INVALID
    private var configuredFormat = AudioFormat.NOT_SET
    private var outputBuffer = AudioProcessor.EMPTY_BUFFER
    private var reusableOutputBuffer = AudioProcessor.EMPTY_BUFFER
    private var inputEnded = false
    private var cachedGainsDb: List<Float> = emptyList()
    private var coefficients: Array<Coefficients> = emptyArray()
    private var filterStates: Array<Array<FilterState>> = emptyArray()

    override fun configure(inputAudioFormat: AudioFormat): AudioFormat {
        val supportedEncoding =
            inputAudioFormat.encoding == C.ENCODING_PCM_16BIT ||
                inputAudioFormat.encoding == C.ENCODING_PCM_FLOAT
        if (
            !supportedEncoding ||
            inputAudioFormat.sampleRate <= 0 ||
            inputAudioFormat.channelCount <= 0
        ) {
            configuredFormat = AudioFormat.NOT_SET
            return configuredFormat
        }

        if (
            sampleRateHz != inputAudioFormat.sampleRate ||
            channelCount != inputAudioFormat.channelCount ||
            encoding != inputAudioFormat.encoding
        ) {
            sampleRateHz = inputAudioFormat.sampleRate
            channelCount = inputAudioFormat.channelCount
            encoding = inputAudioFormat.encoding
            cachedGainsDb = emptyList()
            filterStates = emptyArray()
        }
        configuredFormat = inputAudioFormat
        return configuredFormat
    }

    override fun isActive(): Boolean = configuredFormat != AudioFormat.NOT_SET

    override fun queueInput(inputBuffer: ByteBuffer) {
        if (!isActive() || !inputBuffer.hasRemaining()) {
            return
        }

        val input = inputBuffer.slice().order(ByteOrder.LITTLE_ENDIAN)
        inputBuffer.position(inputBuffer.limit())
        val settings = SoftwareEqualizer.snapshot()
        if (!settings.enabled || settings.bandGainsDb.all { it == 0f }) {
            resetFilterStates()
            outputBuffer = input
            return
        }

        val bytesPerSample =
            if (encoding == C.ENCODING_PCM_16BIT) Short.SIZE_BYTES else Float.SIZE_BYTES
        if (input.remaining() % bytesPerSample != 0) {
            outputBuffer = input
            return
        }
        prepareFilters(settings.bandGainsDb)

        val output = replaceOutputBuffer(input.remaining())
        var channelIndex = 0
        while (input.hasRemaining()) {
            val inputSample =
                if (encoding == C.ENCODING_PCM_16BIT) {
                    input.short / 32_768f
                } else {
                    input.float
                }
            var sample = inputSample.takeIf(Float::isFinite) ?: 0f
            for (bandIndex in coefficients.indices) {
                sample = filterStates[channelIndex][bandIndex]
                    .process(coefficients[bandIndex], sample)
            }
            sample = sample.coerceIn(-1f, 1f)
            if (encoding == C.ENCODING_PCM_16BIT) {
                output.putShort((sample * 32_767f).roundToInt().coerceIn(-32_768, 32_767).toShort())
            } else {
                output.putFloat(sample)
            }
            channelIndex = (channelIndex + 1) % channelCount
        }
        output.flip()
    }

    override fun queueEndOfStream() {
        inputEnded = true
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
        resetFilterStates()
    }

    override fun reset() {
        flush()
        reusableOutputBuffer = AudioProcessor.EMPTY_BUFFER
        configuredFormat = AudioFormat.NOT_SET
        sampleRateHz = 0
        channelCount = 0
        encoding = C.ENCODING_INVALID
        cachedGainsDb = emptyList()
        coefficients = emptyArray()
        filterStates = emptyArray()
    }

    private fun prepareFilters(gainsDb: List<Float>) {
        if (cachedGainsDb == gainsDb && filterStates.size == channelCount) {
            return
        }
        cachedGainsDb = gainsDb.toList()
        coefficients = Array(EQUALIZER_BAND_COUNT) { bandIndex ->
            createCoefficients(frequenciesHz[bandIndex], gainsDb[bandIndex], sampleRateHz)
        }
        filterStates = Array(channelCount) {
            Array(EQUALIZER_BAND_COUNT) { FilterState() }
        }
    }

    private fun createCoefficients(
        centerFrequencyHz: Float,
        gainDb: Float,
        sampleRate: Int,
    ): Coefficients {
        val frequency = minOf(centerFrequencyHz, sampleRate * 0.45f)
        val omega = (2.0 * PI * frequency / sampleRate).toFloat()
        val alpha = sin(omega) / (2f * 0.70710677f)
        val amplitude = 10.0.pow(gainDb / 40.0).toFloat()
        val cosine = cos(omega)
        val a0 = 1f + alpha / amplitude
        return Coefficients(
            b0 = (1f + alpha * amplitude) / a0,
            b1 = (-2f * cosine) / a0,
            b2 = (1f - alpha * amplitude) / a0,
            a1 = (-2f * cosine) / a0,
            a2 = (1f - alpha / amplitude) / a0,
        )
    }

    private fun replaceOutputBuffer(size: Int): ByteBuffer {
        if (reusableOutputBuffer.capacity() < size) {
            reusableOutputBuffer =
                ByteBuffer.allocateDirect(size).order(ByteOrder.LITTLE_ENDIAN)
        } else {
            reusableOutputBuffer.clear()
        }
        outputBuffer = reusableOutputBuffer
        return reusableOutputBuffer
    }

    private fun resetFilterStates() {
        if (filterStates.isNotEmpty()) {
            filterStates.forEach { channelFilters ->
                channelFilters.forEach(FilterState::reset)
            }
        }
        cachedGainsDb = emptyList()
    }

    private data class Coefficients(
        val b0: Float,
        val b1: Float,
        val b2: Float,
        val a1: Float,
        val a2: Float,
    )

    private class FilterState {
        private var z1 = 0f
        private var z2 = 0f

        fun process(coefficients: Coefficients, input: Float): Float {
            val output = coefficients.b0 * input + z1
            z1 = coefficients.b1 * input - coefficients.a1 * output + z2
            z2 = coefficients.b2 * input - coefficients.a2 * output
            return output
        }

        fun reset() {
            z1 = 0f
            z2 = 0f
        }
    }
}
