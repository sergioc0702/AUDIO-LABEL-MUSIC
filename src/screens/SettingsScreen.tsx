import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Clock3,
  Gauge,
  History,
  Palette,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react-native';
import { useApp } from '../state/AppContext';
import { colors, screenPadding, spacing, type } from '../theme/theme';
import { IconButton } from '../ui/Buttons';
import { ListRow, SquareIcon } from '../ui/Rows';

export function SettingsScreen() {
  const { music, nav, setPlayerSheet, playerTheme } = useApp();
  const insets = useSafeAreaInsets();
  const { tracks, playbackRate, equalizerSettings, loadLibrary } = music;
  const iconProps = { color: colors.textSecondary, size: 22 };

  return (
    <ScrollView
      contentContainerStyle={{ paddingTop: insets.top + spacing.xs }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topBar}>
        <IconButton label="Volver" onPress={nav.pop}>
          <ArrowLeft color={colors.text} size={24} />
        </IconButton>
        <Text style={type.headline}>Ajustes</Text>
      </View>

      <Text style={[type.label, styles.group]}>Reproducción</Text>
      <ListRow
        leading={
          <SquareIcon>
            <SlidersHorizontal {...iconProps} />
          </SquareIcon>
        }
        onPress={() => setPlayerSheet('equalizer')}
        subtitle={equalizerSettings.enabled ? 'Activado' : 'Desactivado'}
        title="Ecualizador"
      />
      <ListRow
        leading={
          <SquareIcon>
            <Gauge {...iconProps} />
          </SquareIcon>
        }
        onPress={() => setPlayerSheet('speed')}
        subtitle={`${playbackRate}×`}
        title="Velocidad"
      />
      <ListRow
        leading={
          <SquareIcon>
            <Clock3 {...iconProps} />
          </SquareIcon>
        }
        onPress={() => setPlayerSheet('sleep')}
        title="Temporizador"
      />

      <ListRow
        leading={
          <SquareIcon>
            <Palette {...iconProps} />
          </SquareIcon>
        }
        onPress={() => setPlayerSheet('theme')}
        subtitle={playerTheme.name}
        title="Tema del reproductor"
      />

      <Text style={[type.label, styles.group]}>Biblioteca</Text>
      <ListRow
        leading={
          <SquareIcon>
            <RefreshCw {...iconProps} />
          </SquareIcon>
        }
        onPress={() => {
          music.showQueueNotice('Actualizando biblioteca…');
          loadLibrary(false);
        }}
        showChevron={false}
        subtitle={`${tracks.length} canciones encontradas`}
        title="Actualizar biblioteca"
      />
      <ListRow
        accessibilityLabel="Borrar historial de reproducción"
        leading={
          <SquareIcon>
            <History {...iconProps} />
          </SquareIcon>
        }
        onPress={music.clearRecentPlayback}
        showChevron={false}
        title="Borrar historial"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  group: {
    color: colors.textSecondary,
    paddingBottom: spacing.xs,
    paddingHorizontal: screenPadding,
    paddingTop: spacing.xl,
  },
});
