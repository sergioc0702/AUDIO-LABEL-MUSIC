import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Check } from 'lucide-react-native';
import {
  getSleepTimer,
  cancelSleepTimer,
  startSleepTimer,
  stopAtEndOfTrack,
  subscribeSleepTimer,
  type SleepTimerState,
} from '../services/sleepTimer';
import { useApp } from '../state/AppContext';
import { playbackRates } from '../state/useMusicController';
import { appThemes } from '../theme/themes';
import { spacing, createStyles, useColors } from '../theme/theme';
import { Button } from '../ui/Buttons';
import { Sheet, SheetAction } from '../ui/Sheet';
import { Snackbar } from '../ui/Snackbar';
import { Tap } from '../ui/Tap';
import { formatTime } from '../utils/formatTime';
import { formatTrackCount } from '../utils/formatTrackCount';
import { currentLyricIndex, parseLrc } from '../utils/lyrics';
import { EqualizerBandControl } from './controls';
import { PlaybackPanel } from './PlaybackPanel';
import { usePlaybackProgress } from './PlaybackProgress';
import { PlaybackQueue } from './PlaybackQueue';

const equalizerBands = [
  { label: 'Graves', frequency: '60 Hz' },
  { label: 'Bajos', frequency: '250 Hz' },
  { label: 'Medios', frequency: '1 kHz' },
  { label: 'Presencia', frequency: '4 kHz' },
  { label: 'Agudos', frequency: '12 kHz' },
];

const equalizerPresets = [
  { name: 'Plano', gains: [0, 0, 0, 0, 0] },
  { name: 'Graves', gains: [5, 4, 0, 0, 0] },
  { name: 'Voz', gains: [-2, 1, 4, 3, 0] },
  { name: 'Acústico', gains: [2, 3, 1, 2, 2] },
  { name: 'Agudos', gains: [0, 0, 1, 4, 5] },
];

export function useSleepTimer() {
  const [timer, setTimer] = useState<SleepTimerState>(getSleepTimer);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => subscribeSleepTimer(setTimer), []);
  useEffect(() => {
    if (timer.mode !== 'time') {
      return;
    }
    const update = () =>
      setSecondsLeft(
        Math.max(0, Math.ceil((timer.deadline - Date.now()) / 1000)),
      );
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  return { timer, secondsLeft };
}

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

export function SpeedSheet() {
  const { colors } = useColors();
  const { setPlayerSheet, music } = useApp();

  return (
    <PlaybackPanel title="Velocidad de reproducción">
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

export function EqualizerSheet() {
  const { fontScale } = useWindowDimensions();
  const { colors, type } = useColors();
  const styles = useStyles();
  const { music } = useApp();
  const { equalizerSettings, updateEqualizerSettings, changeEqualizerBand } =
    music;

  return (
    <PlaybackPanel title="Ecualizador">
      <View style={styles.equalizer}>
        <View style={styles.equalizerHeader}>
          <Text style={type.bodyStrong}>
            {equalizerSettings.enabled ? 'Activado' : 'Desactivado'}
          </Text>
          <Switch
            accessibilityLabel="Activar ecualizador"
            onValueChange={enabled =>
              updateEqualizerSettings({ ...equalizerSettings, enabled })
            }
            thumbColor={colors.text}
            trackColor={{ false: colors.outline, true: colors.accent }}
            value={equalizerSettings.enabled}
          />
        </View>
        <View
          needsOffscreenAlphaCompositing
          style={[styles.presets, !equalizerSettings.enabled && styles.off]}
        >
          {equalizerPresets.map(preset => {
            const selected = preset.gains.every(
              (gain, index) => gain === equalizerSettings.bandGainsDb[index],
            );
            return (
              <Tap
                key={preset.name}
                accessibilityRole="button"
                accessibilityLabel={`Usar perfil ${preset.name}`}
                accessibilityState={{ selected }}
                onPress={() =>
                  updateEqualizerSettings({
                    ...equalizerSettings,
                    bandGainsDb: [...preset.gains],
                  })
                }
                style={[
                  styles.preset,
                  { minWidth: 66 * fontScale },
                  selected && styles.presetSelected,
                ]}
              >
                <Text
                  style={[
                    type.label,
                    styles.presetText,
                    selected && styles.presetSelectedText,
                  ]}
                >
                  {preset.name}
                </Text>
              </Tap>
            );
          })}
        </View>
        <View style={styles.bands}>
          {equalizerBands.map((band, index) => (
            <EqualizerBandControl
              key={band.frequency}
              frequency={band.frequency}
              label={band.label}
              enabled={equalizerSettings.enabled}
              onChange={gain => changeEqualizerBand(index, gain)}
              value={equalizerSettings.bandGainsDb[index] ?? 0}
            />
          ))}
        </View>
      </View>
    </PlaybackPanel>
  );
}

export function LyricsSheet() {
  const { type } = useColors();
  const styles = useStyles();
  const { playerSheet, music } = useApp();
  const { currentTrack, importTrackLyrics, getTrackLyrics, deleteTrackLyrics } =
    music;
  const [contents, setContents] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const visible = playerSheet === 'lyrics';
  const trackId = currentTrack?.id;
  const liveTrackId = useRef(trackId);
  liveTrackId.current = trackId;
  const lines = useMemo(() => parseLrc(contents ?? ''), [contents]);

  useEffect(() => {
    let mounted = true;
    if (!visible || !trackId) {
      return () => {
        mounted = false;
      };
    }
    setLoading(true);
    setLoadError(null);
    setContents(null);
    getTrackLyrics(trackId)
      .then(value => {
        if (mounted) setContents(value);
      })
      .catch(error => {
        if (mounted) {
          setContents(null);
          setLoadError(
            error instanceof Error
              ? error.message
              : 'No se pudieron cargar las letras.',
          );
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [getTrackLyrics, trackId, visible]);

  async function chooseLyrics() {
    if (!currentTrack) return;
    if (await importTrackLyrics(currentTrack)) {
      try {
        const next = await getTrackLyrics(currentTrack.id);
        if (liveTrackId.current === currentTrack.id) {
          setContents(next);
          setLoadError(null);
        }
      } catch (error) {
        setLoadError(
          error instanceof Error
            ? error.message
            : 'No se pudieron cargar las letras.',
        );
      }
    }
  }

  return (
    <PlaybackPanel
      scroll={false}
      subtitle={currentTrack?.artist}
      title={currentTrack?.title ?? 'Letras'}
    >
      {loading ? (
        <Text style={[type.secondary, styles.lyricsMessage]}>
          Cargando letras…
        </Text>
      ) : loadError ? (
        <Text
          accessibilityRole="alert"
          style={[type.secondary, styles.lyricsMessage]}
        >
          {loadError}
        </Text>
      ) : lines.length === 0 ? (
        <Text style={[type.secondary, styles.lyricsMessage]}>
          Aún no hay letras locales para esta canción.
        </Text>
      ) : (
        <SyncedLyrics lines={lines} />
      )}
      <View style={styles.lyricsActions}>
        <Button
          label="Importar archivo LRC"
          multiline
          onPress={chooseLyrics}
          variant="tonal"
        />
        {contents && currentTrack ? (
          <Button
            label="Eliminar letras"
            multiline
            onPress={async () => {
              if (await deleteTrackLyrics(currentTrack.id)) setContents(null);
            }}
            variant="tonal"
          />
        ) : null}
      </View>
    </PlaybackPanel>
  );
}

function SyncedLyrics({ lines }: { lines: ReturnType<typeof parseLrc> }) {
  const { colors, type } = useColors();
  const styles = useStyles();
  const { position } = usePlaybackProgress();
  const activeIndex = currentLyricIndex(lines, position);

  return (
    <ScrollView contentContainerStyle={styles.lyricsLines}>
      {lines.map((line, index) => {
        const active = index === activeIndex;
        return (
          <Text
            accessibilityState={{ selected: active }}
            key={`${line.timeMs}-${index}`}
            style={[
              active ? type.title : type.body,
              { color: active ? colors.accent : colors.textSecondary },
              styles.lyricLine,
            ]}
          >
            {line.text}
          </Text>
        );
      })}
    </ScrollView>
  );
}

export function ThemeSheet() {
  const { colors } = useColors();
  const styles = useStyles();
  const { height } = useWindowDimensions();
  const { playerSheet, setPlayerSheet, theme, selectTheme } = useApp();

  return (
    <Sheet
      closeLabel="Cerrar temas"
      onClose={() => setPlayerSheet(null)}
      subtitle="El diseño de toda la app"
      title="Tema"
      visible={playerSheet === 'theme'}
    >
      <ScrollView
        accessibilityLabel="Lista desplazable de temas disponibles"
        style={[styles.themeList, { maxHeight: height * 0.68 }]}
        showsVerticalScrollIndicator
      >
        {appThemes.map(item => (
          <SheetAction
            key={item.id}
            label={item.name}
            onPress={() => selectTheme(item.id)}
            selected={item.id === theme.id}
            trailing={
              item.id === theme.id ? (
                <Check color={colors.accent} size={22} />
              ) : null
            }
          />
        ))}
      </ScrollView>
    </Sheet>
  );
}

export function PaletteSheet() {
  const { type } = useColors();
  const styles = useStyles();
  const { playerSheet, setPlayerSheet, theme, palette, selectPalette } =
    useApp();

  return (
    <Sheet
      closeLabel="Cerrar paletas de colores"
      lightScrim
      onClose={() => setPlayerSheet(null)}
      subtitle={`Colores del tema ${theme.name}`}
      title="Paleta de colores"
      visible={playerSheet === 'palette'}
    >
      <ScrollView
        contentContainerStyle={styles.palettes}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {theme.palettes.map(item => {
          const selected = item.id === palette.id;
          return (
            <Tap
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`Usar paleta ${item.name}`}
              accessibilityState={{ selected }}
              onPress={() => selectPalette(item.id)}
              style={[
                styles.palette,
                { backgroundColor: item.background },
                selected && styles.paletteSelected,
              ]}
            >
              <View style={styles.paletteColors}>
                {[item.accent, item.control]
                  .concat(item.sceneColors.slice(1, 2))
                  .map((color, index) => (
                    <View
                      key={index}
                      style={[styles.paletteColor, { backgroundColor: color }]}
                    />
                  ))}
              </View>
              <Text
                numberOfLines={1}
                style={[type.label, { color: item.text }]}
              >
                {item.name}
              </Text>
              {selected ? (
                <View style={styles.paletteCheck}>
                  <Check color={item.text} size={18} />
                </View>
              ) : null}
            </Tap>
          );
        })}
      </ScrollView>
    </Sheet>
  );
}

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

const useStyles = createStyles(colors => ({
  themeList: { flexGrow: 0 },
  palettes: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  palette: {
    borderColor: colors.outline,
    borderRadius: colors.design.radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    height: 112,
    justifyContent: 'flex-end',
    padding: spacing.md,
    width: 112,
  },
  paletteSelected: { borderColor: colors.text, borderWidth: 2 },
  paletteColors: { flexDirection: 'row', gap: spacing.xs },
  paletteColor: { borderRadius: 7, height: 14, width: 14 },
  paletteCheck: { position: 'absolute', right: spacing.sm, top: spacing.sm },
  equalizer: { gap: spacing.lg, paddingHorizontal: spacing.lg },
  equalizerHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  off: { opacity: 0.45 },
  preset: {
    alignItems: 'center',
    backgroundColor: colors.surfaceHigh,
    borderRadius: colors.design.radius.full,
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
  },
  presetText: { textAlign: 'center' },
  presetSelected: { backgroundColor: colors.text },
  presetSelectedText: { color: colors.background },
  bands: { flexDirection: 'row', flexWrap: 'wrap', paddingBottom: spacing.md },
  lyricsMessage: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  lyricsLines: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  lyricLine: { textAlign: 'center' },
  lyricsActions: {
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  queueActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  stackedQueueActions: { flexDirection: 'column' },
  queueAction: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    paddingHorizontal: spacing.sm,
  },
  stackedQueueAction: { flexGrow: 0, flexBasis: 'auto' },
}));
