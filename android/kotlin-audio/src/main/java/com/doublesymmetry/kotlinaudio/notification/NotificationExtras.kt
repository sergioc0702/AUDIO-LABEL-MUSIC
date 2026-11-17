package com.doublesymmetry.kotlinaudio.notification

import android.os.Handler
import android.os.Looper

/**
 * The buttons the app adds to the media notification and the lock screen:
 * favorite, shuffle and repeat. The player draws them; the app says what
 * their state is and what a tap does.
 */
object NotificationExtras {
    const val FAVORITE = "favorite"
    const val SHUFFLE = "shuffle"
    const val REPEAT = "repeat"

    /** Whether the songs after the current one are shuffled. */
    @Volatile
    var shuffle = false
        set(value) {
            field = value
            refresh()
        }

    /** Whether the song at this URI is a favorite. */
    @Volatile
    var isFavorite: (String?) -> Boolean = { false }

    /**
     * Called after a tap, with the action and the URI of the song that was
     * playing. Repeat is already applied by the player when this runs.
     */
    @Volatile
    var onAction: (String, String?) -> Unit = { _, _ -> }

    internal var onChange: (() -> Unit)? = null
    private val main = Handler(Looper.getMainLooper())

    /** Redraws the buttons, e.g. after a favorite changed in the app. */
    fun refresh() {
        main.post { onChange?.invoke() }
    }
}
