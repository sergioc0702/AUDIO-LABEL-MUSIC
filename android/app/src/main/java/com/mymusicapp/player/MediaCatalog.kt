package com.mymusicapp.player

import java.text.Normalizer
import java.util.Locale

internal data class MediaCatalogEntry(
  val id: String,
  val title: String,
  val artist: String?,
  val album: String?,
)

private fun normalizeCatalogText(value: String): String =
  Normalizer.normalize(value, Normalizer.Form.NFD)
    .replace("\\p{Mn}+".toRegex(), "")
    .lowercase(Locale.ROOT)

internal fun searchMediaCatalog(
  entries: List<MediaCatalogEntry>,
  query: String,
  limit: Int,
): List<String> {
  val term = normalizeCatalogText(query.trim())
  if (term.isEmpty() || limit <= 0) return emptyList()
  return entries.asSequence()
    .filter { entry ->
      listOf(entry.title, entry.artist, entry.album)
        .any { normalizeCatalogText(it.orEmpty()).contains(term) }
    }
    .take(limit)
    .map { it.id }
    .toList()
}

internal fun orderedAvailableMediaIds(
  orderedIds: List<String>,
  availableIds: Collection<String>,
): List<String> {
  val available = availableIds.toHashSet()
  val seen = mutableSetOf<String>()
  return orderedIds.filter { it in available && seen.add(it) }
}
