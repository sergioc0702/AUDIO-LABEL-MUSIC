import { useWindowDimensions, View } from 'react-native';
import { useApp } from '../../state/AppContext';
import { spacing } from '../../theme/theme';
import { Button } from '../../ui/Buttons';
import { Snackbar } from '../../ui/Snackbar';
import { formatTrackCount } from '../../utils/formatTrackCount';
import { PlaybackPanel } from '../PlaybackPanel';
import { PlaybackQueue } from '../PlaybackQueue';

import { useStyles } from './sheetStyles';

export function QueueSheet() {
  const styles = useStyles();
  const { width, fontScale } = useWindowDimensions();
  const stacked = width < 340 && fontScale > 1.25;
  const { music } = useApp();
  const {
    playbackQueue,
    currentTrack,
    queueUpdating,
    saveQueueAsPlaylist,
    confirmClearQueue,
    playQueueTrack,
    moveQueueTrack,
    removeQueueTrack,
  } = music;

  return (
    <PlaybackPanel
      scroll={false}
      subtitle={`${formatTrackCount(playbackQueue.length)} en la cola`}
      title="A continuación"
    >
      <View
        style={[styles.queueActions, stacked && styles.stackedQueueActions]}
      >
        <Button
          accessibilityLabel="Guardar cola como lista"
          disabled={playbackQueue.length === 0 || queueUpdating}
          label="Guardar como lista"
          multiline
          onPress={saveQueueAsPlaylist}
          style={[styles.queueAction, stacked && styles.stackedQueueAction]}
          variant="tonal"
        />
        <Button
          accessibilityLabel="Vaciar canciones siguientes"
          disabled={playbackQueue.length <= 1 || queueUpdating}
          label="Vaciar siguientes"
          multiline
          onPress={confirmClearQueue}
          style={[styles.queueAction, stacked && styles.stackedQueueAction]}
          variant="tonal"
        />
      </View>
      <PlaybackQueue
        tracks={playbackQueue}
        currentId={currentTrack?.id}
        disabled={queueUpdating}
        onMove={moveQueueTrack}
        onPlay={playQueueTrack}
        onRemove={removeQueueTrack}
      />
      <Snackbar bottom={spacing.lg} placement="queue" />
    </PlaybackPanel>
  );
}
