import { StyleSheet, Text, View } from 'react-native';
import { useApp } from '../state/AppContext';
import { colors, radius, spacing, type } from '../theme/theme';
import { Tap } from './Tap';

type Placement = 'app' | 'player' | 'queue';

/**
 * Each full-screen layer mounts its own copy, because Android draws modals above
 * the app. Only the copy on the top layer shows.
 */
export function Snackbar({
  placement,
  bottom,
}: {
  placement: Placement;
  bottom: number;
}) {
  const { music } = useApp();
  const {
    queueVisible,
    playerExpanded,
    errorMessage,
    errorRetryAction,
    setErrorMessage,
    queueNotice,
    pendingQueueRemoval,
    undoQueueRemoval,
    undoSecondsLeft,
    playlistUndo,
    undoPlaylistRemoval,
  } = music;
  const topLayer: Placement = queueVisible
    ? 'queue'
    : playerExpanded
    ? 'player'
    : 'app';
  const message = pendingQueueRemoval
    ? 'Canción quitada de la cola'
    : playlistUndo
    ? 'Canción quitada de la lista'
    : errorMessage ?? queueNotice;
  if (topLayer !== placement || !message) {
    return null;
  }

  const action = pendingQueueRemoval
    ? {
        label: 'Deshacer',
        accessibilityLabel: `Deshacer eliminación, ${undoSecondsLeft} segundos`,
        onPress: undoQueueRemoval,
      }
    : playlistUndo
    ? {
        label: 'Deshacer',
        accessibilityLabel: 'Deshacer quitar de la lista',
        onPress: undoPlaylistRemoval,
      }
    : errorRetryAction
    ? {
        label: 'Reintentar',
        accessibilityLabel: 'Reintentar',
        onPress: errorRetryAction,
      }
    : errorMessage
    ? {
        label: 'Cerrar',
        accessibilityLabel: 'Cerrar aviso',
        onPress: () => setErrorMessage(null),
      }
    : null;

  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.snackbar, { bottom }]}
    >
      <Text numberOfLines={3} style={[type.body, styles.text]}>
        {message}
      </Text>
      {action ? (
        <Tap
          accessibilityRole="button"
          accessibilityLabel={action.accessibilityLabel}
          onPress={action.onPress}
          style={styles.action}
        >
          <Text style={styles.actionText}>{action.label}</Text>
        </Tap>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  snackbar: {
    alignItems: 'center',
    backgroundColor: colors.text,
    borderRadius: radius.md,
    elevation: 6,
    flexDirection: 'row',
    gap: spacing.sm,
    left: spacing.sm,
    minHeight: 48,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
    position: 'absolute',
    right: spacing.sm,
  },
  text: { color: colors.background, flex: 1, paddingVertical: spacing.sm },
  action: {
    alignItems: 'center',
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  actionText: { color: colors.background, fontSize: 14, fontWeight: '700' },
});
