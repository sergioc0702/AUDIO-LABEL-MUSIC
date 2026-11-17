import { useCallback, useEffect, useState } from 'react';
import type { Track } from '../../types/Track';

/** The songs picked with a long press, for the selection bar. */
export function useSelection({
  tracks,
  tracksById,
}: {
  tracks: Track[];
  tracksById: Map<string, Track>;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // A song that left the library cannot stay selected.
  useEffect(() => {
    setSelectedIds(current => {
      if (current.size === 0) {
        return current;
      }
      const kept = new Set([...current].filter(id => tracksById.has(id)));
      return kept.size === current.size ? current : kept;
    });
  }, [tracksById]);

  const toggleSelected = useCallback((track: Track) => {
    setSelectedIds(current => {
      const updated = new Set(current);
      if (updated.has(track.id)) {
        updated.delete(track.id);
      } else {
        updated.add(track.id);
      }
      return updated;
    });
  }, []);
  const clearSelection = useCallback(() => {
    setSelectedIds(current => (current.size === 0 ? current : new Set()));
  }, []);
  /** The selected songs in the order the library lists them. */
  function selectedTracks() {
    return tracks.filter(track => selectedIds.has(track.id));
  }

  return { selectedIds, toggleSelected, clearSelection, selectedTracks };
}
