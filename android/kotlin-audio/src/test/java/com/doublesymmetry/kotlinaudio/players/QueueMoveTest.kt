package com.doublesymmetry.kotlinaudio.players

import org.junit.Assert.assertEquals
import org.junit.Test

class QueueMoveTest {
    @Test
    fun movingUpLeavesItemAtTargetIndex() {
        val queue = mutableListOf("a", "b", "c", "d")

        queue.moveItem(3, 1)

        assertEquals(listOf("a", "d", "b", "c"), queue)
    }

    @Test
    fun movingDownLeavesItemAtTargetIndex() {
        val queue = mutableListOf("a", "b", "c", "d")

        queue.moveItem(0, 2)

        assertEquals(listOf("b", "c", "a", "d"), queue)
    }

    @Test
    fun movingPastTheEndLeavesItemLast() {
        val queue = mutableListOf("a", "b", "c")

        queue.moveItem(0, 10)

        assertEquals(listOf("b", "c", "a"), queue)
    }

    @Test
    fun reorderingUpcomingItemsNeverMovesTheCurrentItem() {
        val queue = mutableListOf("current", "a", "b", "c", "d")
        val target = listOf("current", "d", "b", "a", "c")

        for (index in 1 until target.size) {
            queue.moveItem(queue.indexOf(target[index]), index)
        }

        assertEquals(target, queue)
    }
}
