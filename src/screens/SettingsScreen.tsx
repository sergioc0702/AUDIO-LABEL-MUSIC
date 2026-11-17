import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Clock3,
  Blend,
  Download,
  FolderCog,
  Gauge,
  History,
  LayoutTemplate,
  Palette,
  RefreshCw,
  SlidersHorizontal,
  Timer,
  Upload,
  Volume2,
} from 'lucide-react-native';
import { useApp } from '../state/AppContext';
import { shortAudioSeconds } from '../state/music/useLibrary';
import {
  screenPadding,
  spacing,
  createStyles,
  useColors,
} from '../theme/theme';
import { IconButton } from '../ui/Buttons';
import { ListRow, SquareIcon } from '../ui/Rows';

export function SettingsScreen() {
  const { colors, type } = useColors();
  const styles = useStyles();
  const { music, nav, setPlayerSheet, theme, palette } = useApp();
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
        accessibilityLabel={`Volumen parejo, ${
          music.levelVolume ? 'activado' : 'desactivado'
        }`}
        leading={
          <SquareIcon>
            <Volume2 {...iconProps} />
          </SquareIcon>
        }
        onPress={music.toggleLevelVolume}
        showChevron={false}
        subtitle={`Baja las canciones más fuertes · ${
          music.levelVolume ? 'Activado' : 'Desactivado'
        }`}
        title="Volumen parejo"
      />
      <ListRow
        accessibilityLabel={`Fundido entre canciones, ${
          music.crossfadeSeconds > 0
            ? `${music.crossfadeSeconds} segundos`
            : 'desactivado'
        }`}
        leading={
          <SquareIcon>
            <Blend {...iconProps} />
          </SquareIcon>
        }
        onPress={() => setPlayerSheet('crossfade')}
        subtitle={
          music.crossfadeSeconds > 0
            ? `${music.crossfadeSeconds} segundos`
            : 'Desactivado'
        }
        title="Fundido entre canciones"
      />

      <Text style={[type.label, styles.group]}>Apariencia</Text>
      <ListRow
        accessibilityLabel={`Tema, ${theme.name}`}
        leading={
          <SquareIcon>
            <LayoutTemplate {...iconProps} />
          </SquareIcon>
        }
        onPress={() => setPlayerSheet('theme')}
        subtitle={theme.name}
        title="Tema"
      />
      <ListRow
        accessibilityLabel={`Paleta de colores, ${palette.name}`}
        leading={
          <SquareIcon>
            <Palette {...iconProps} />
          </SquareIcon>
        }
        onPress={() => setPlayerSheet('palette')}
        subtitle={palette.name}
        title="Paleta de colores"
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
        accessibilityLabel={`Carpetas de la biblioteca, ${music.excludedFolders.length} ocultas`}
        leading={
          <SquareIcon>
            <FolderCog {...iconProps} />
          </SquareIcon>
        }
        onPress={() => setPlayerSheet('folders')}
        subtitle={
          music.excludedFolders.length > 0
            ? `${music.excludedFolders.length} ocultas`
            : 'Se muestran todas'
        }
        title="Carpetas"
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
      <ListRow
        accessibilityLabel={`Ocultar audios cortos, ${
          music.hideShortAudio ? 'activado' : 'desactivado'
        }`}
        leading={
          <SquareIcon>
            <Timer {...iconProps} />
          </SquareIcon>
        }
        onPress={music.toggleHideShortAudio}
        showChevron={false}
        subtitle={`Menos de ${shortAudioSeconds} segundos · ${
          music.hideShortAudio ? 'Activado' : 'Desactivado'
        }`}
        title="Ocultar audios cortos"
      />

      <Text style={[type.label, styles.group]}>Copia de seguridad</Text>
      <ListRow
        leading={
          <SquareIcon>
            <Upload {...iconProps} />
          </SquareIcon>
        }
        onPress={music.exportLibraryBackup}
        showChevron={false}
        subtitle="Favoritas y listas en un archivo"
        title="Guardar copia"
      />
      <ListRow
        leading={
          <SquareIcon>
            <Download {...iconProps} />
          </SquareIcon>
        }
        onPress={music.restoreLibraryBackup}
        showChevron={false}
        subtitle="Añade lo guardado, sin borrar nada"
        title="Restaurar copia"
      />
    </ScrollView>
  );
}

const useStyles = createStyles(colors => ({
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
}));
