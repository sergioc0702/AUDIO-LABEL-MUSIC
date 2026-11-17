import {
  cancelSleepTimer,
  startSleepTimer,
  stopAtEndOfTrack,
} from '../../services/playback/sleepTimer';
import { useApp } from '../../state/AppContext';
import { SheetAction } from '../../ui/Sheet';
import { formatTime } from '../../utils/formatTime';
import { PlaybackPanel } from '../PlaybackPanel';

import { useSleepTimer } from './useSleepTimer';

export function SleepTimerSheet() {
  const { setPlayerSheet, music } = useApp();
  const { timer, secondsLeft } = useSleepTimer();
  const close = () => setPlayerSheet(null);

  return (
    <PlaybackPanel
      subtitle={
        timer.mode === 'time'
          ? `Se pausará en ${formatTime(secondsLeft)}`
          : timer.mode === 'endOfTrack'
          ? 'Se pausará al terminar esta canción'
          : 'Pausa la música automáticamente'
      }
      title="Temporizador"
    >
      {[15, 30, 45, 60, 90].map(minutes => (
        <SheetAction
          key={minutes}
          accessibilityLabel={`Pausar en ${minutes} minutos`}
          label={`${minutes} minutos`}
          onPress={() => {
            startSleepTimer(minutes);
            music.showQueueNotice(
              `La música se pausará en ${minutes} minutos.`,
            );
            close();
          }}
        />
      ))}
      <SheetAction
        label="Al terminar la canción"
        onPress={() => {
          stopAtEndOfTrack();
          music.showQueueNotice('La música se pausará al terminar la canción.');
          close();
        }}
        selected={timer.mode === 'endOfTrack'}
      />
      {timer.mode !== 'off' ? (
        <SheetAction
          accessibilityLabel="Cancelar temporizador"
          danger
          label="Cancelar temporizador"
          onPress={() => {
            cancelSleepTimer();
            close();
          }}
        />
      ) : null}
    </PlaybackPanel>
  );
}
