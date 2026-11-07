package com.mymusicapp.player

import org.junit.Assert.assertEquals
import org.junit.Test

class MediaCatalogTest {
  private val tracks = listOf(
    MediaCatalogEntry("1", "Luna", "Artista A", "Noche"),
    MediaCatalogEntry("2", "Sol", "Artista B", "Día"),
    MediaCatalogEntry("3", "Lluvia", "Artista A", "Noche"),
  )

  @Test
  fun searchMatchesTitleArtistAndAlbumWithoutEmptyResults() {
    assertEquals(listOf("1"), searchMediaCatalog(tracks, " luna ", 100))
    assertEquals(listOf("1", "3"), searchMediaCatalog(tracks, "artista a", 100))
    assertEquals(listOf("1", "3"), searchMediaCatalog(tracks, "noche", 100))
    assertEquals(emptyList<String>(), searchMediaCatalog(tracks, "  ", 100))
  }

  @Test
  fun searchHonorsResultLimit() {
    assertEquals(listOf("1"), searchMediaCatalog(tracks, "artista a", 1))
  }

  @Test
  fun searchIgnoresAccentsLikeThePhoneLibrarySearch() {
    assertEquals(listOf("2"), searchMediaCatalog(tracks, "dia", 100))
    assertEquals(listOf("2"), searchMediaCatalog(tracks, "DÍA", 100))
  }

  @Test
  fun playlistResolutionKeepsOrderAndSkipsMissingOrDuplicateIds() {
    assertEquals(
      listOf("3", "1", "2"),
      orderedAvailableMediaIds(listOf("3", "missing", "1", "3", "2"), tracks.map { it.id }),
    )
  }
}
