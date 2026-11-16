// Picking several songs at once: a long press on a song starts it, and this
// bar shows what can be done with the songs picked.
import { Platform, Text, View } from 'react-native';
import {
  Heart,
  ListEnd,
  ListPlus,
  ListStart,
  Trash2,
  X,
} from 'lucide-react-native';
import { useApp } from '../state/AppContext';
import { spacing, createStyles, useColors } from '../theme/theme';
import type { Track } from '../types/Track';
import { IconButton } from '../ui/Buttons';
import { formatTrackCount } from '../utils/formatTrackCount';

/** What a song row needs to take part in the selection. */
export function useTrackSelection() {
  const { music } = useApp();
  const { selectedIds, toggleSelected } = music;
  const selecting = selectedIds.size > 0;
  return (track: Track) => ({
    selecting,
    selected: selectedIds.has(track.id),
    onSelect: () => toggleSelected(track),
  });
}

export function SelectionBar() {
  const { colors, type } = useColors();
  const styles = useStyles();
  const { music, setPlaylistTarget } = useApp();
  const {
    selectedIds,
    selectedTracks,
    clearSelection,
    addTracksToQueue,
    favoriteSelection,
    confirmDeleteSelection,
  } = music;
  if (selectedIds.size === 0) {
    return null;
  }
  const count = formatTrackCount(selectedIds.size);
  const icon = { color: colors.text, size: 22 };

  return (
    <View accessibilityLabel={`${count} seleccionadas`} style={styles.bar}>
      <IconButton label="Cancelar selección" onPress={clearSelection}>
        <X {...icon} />
      </IconButton>
      <Text numberOfLines={1} style={[type.bodyStrong, styles.count]}>
        {selectedIds.size}
      </Text>
      <IconButton
        label={`Reproducir ${count} a continuación`}
        onPress={async () => {
          await addTracksToQueue(selectedTracks(), 'next');
          clearSelection();
        }}
      >
        <ListStart {...icon} />
      </IconButton>
      <IconButton
        label={`Añadir ${count} al final de la cola`}
        onPress={async () => {
          await addTracksToQueue(selectedTracks(), 'end');
          clearSelection();
        }}
      >
        <ListEnd {...icon} />
      </IconButton>
      <IconButton
        label={`Añadir ${count} a una lista`}
        onPress={() => setPlaylistTarget(selectedTracks())}
      >
        <ListPlus {...icon} />
      </IconButton>
      <IconButton
        label={`Añadir ${count} a favoritas`}
        onPress={favoriteSelection}
      >
        <Heart {...icon} />
      </IconButton>
      {Number(Platform.Version) >= 30 ? (
        <IconButton
          label={`Eliminar ${count} del dispositivo`}
          onPress={confirmDeleteSelection}
        >
          <Trash2 color={colors.danger} size={22} />
        </IconButton>
      ) : null}
    </View>
  );
}

const useStyles = createStyles(colors => ({
  bar: {
    alignItems: 'center',
    backgroundColor: colors.surfaceHigh,
    borderRadius: colors.design.radius.md,
    flexDirection: 'row',
    marginHorizontal: spacing.sm,
    marginTop: spacing.sm,
    minHeight: 56,
  },
  count: { flex: 1, minWidth: 0, textAlign: 'center' },
}));
