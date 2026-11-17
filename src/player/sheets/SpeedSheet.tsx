import { View } from 'react-native';
import { Check } from 'lucide-react-native';
import { jumpSeconds } from '../../services/playback/player';
import { useApp } from '../../state/AppContext';
import { playbackRates } from '../../state/music/useSoundSettings';
import { useColors } from '../../theme/theme';
import { Button } from '../../ui/Buttons';
import { SheetAction } from '../../ui/Sheet';
import { PlaybackPanel } from '../PlaybackPanel';

import { useStyles } from './sheetStyles';

export function SpeedSheet() {
  const { colors } = useColors();
  const styles = useStyles();
  const { setPlayerSheet, music } = useApp();

  return (
    <PlaybackPanel title="Velocidad de reproducción">
      <View style={styles.jumps}>
        <Button
          accessibilityLabel={`Retroceder ${jumpSeconds} segundos`}
          label={`− ${jumpSeconds} s`}
          onPress={() => music.jumpBy(-jumpSeconds)}
          style={styles.jump}
          variant="tonal"
        />
        <Button
          accessibilityLabel={`Avanzar ${jumpSeconds} segundos`}
          label={`+ ${jumpSeconds} s`}
          onPress={() => music.jumpBy(jumpSeconds)}
          style={styles.jump}
          variant="tonal"
        />
      </View>
      {playbackRates.map(rate => (
        <SheetAction
          key={rate}
          label={rate === 1 ? 'Normal' : `${rate}×`}
          onPress={() => {
            music.changePlaybackRate(rate);
            setPlayerSheet(null);
          }}
          selected={rate === music.playbackRate}
          trailing={
            rate === music.playbackRate ? (
              <Check color={colors.text} size={20} />
            ) : undefined
          }
        />
      ))}
    </PlaybackPanel>
  );
}
