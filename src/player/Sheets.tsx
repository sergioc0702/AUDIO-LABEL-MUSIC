import { useEffect, useRef, useState, type ElementRef } from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
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
import { playerThemes } from '../theme/playerThemes';
import { colors, radius, spacing, type } from '../theme/theme';
import type { Track } from '../types/Track';
import { Button } from '../ui/Buttons';
import { Sheet, SheetAction } from '../ui/Sheet';
import { Snackbar } from '../ui/Snackbar';
import { Tap } from '../ui/Tap';
import { formatTime } from '../utils/formatTime';
import { formatTrackCount } from '../utils/formatTrackCount';
import { EqualizerBandControl, QueueTrackRow } from './controls';

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
  const { playerSheet, setPlayerSheet, music } = useApp();
  const { timer, secondsLeft } = useSleepTimer();
  const close = () => setPlayerSheet(null);

  return (
    <Sheet
      closeLabel="Cerrar temporizador"
      onClose={close}
      subtitle={
        timer.mode === 'time'
          ? `Se pausará en ${formatTime(secondsLeft)}`
          : timer.mode === 'endOfTrack'
          ? 'Se pausará al terminar esta canción'
          : 'Pausa la música automáticamente'
      }
      title="Temporizador"
      visible={playerSheet === 'sleep'}
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
    </Sheet>
  );
}

export function SpeedSheet() {
  const { playerSheet, setPlayerSheet, music } = useApp();

  return (
    <Sheet
      onClose={() => setPlayerSheet(null)}
      title="Velocidad de reproducción"
      visible={playerSheet === 'speed'}
    >
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
    </Sheet>
  );
}

export function EqualizerSheet() {
  const { playerSheet, setPlayerSheet, music } = useApp();
  const { equalizerSettings, updateEqualizerSettings, changeEqualizerBand } =
    music;

  return (
    <Sheet
      closeLabel="Cerrar ecualizador"
      onClose={() => setPlayerSheet(null)}
      visible={playerSheet === 'equalizer'}
    >
      <View style={styles.equalizer}>
        <View style={styles.equalizerHeader}>
          <Text style={type.title}>Ecualizador</Text>
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
                style={[styles.preset, selected && styles.presetSelected]}
              >
                <Text
                  adjustsFontSizeToFit
                  numberOfLines={1}
                  style={[type.label, selected && styles.presetSelectedText]}
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
    </Sheet>
  );
}

export function ThemeSheet() {
  const { playerSheet, setPlayerSheet, playerTheme, selectPlayerTheme } =
    useApp();

  return (
    <Sheet
      closeLabel="Cerrar temas"
      onClose={() => setPlayerSheet(null)}
      subtitle="Se aplica al reproductor"
      title="Tema"
      visible={playerSheet === 'theme'}
    >
      <ScrollView
        contentContainerStyle={styles.themes}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {playerThemes.map(theme => {
          const selected = theme.id === playerTheme.id;
          return (
            <Tap
              key={theme.id}
              accessibilityRole="button"
              accessibilityLabel={`Usar tema ${theme.name}`}
              accessibilityState={{ selected }}
              onPress={() => selectPlayerTheme(theme.id)}
              style={[
                styles.theme,
                { backgroundColor: theme.palette.background },
                selected && styles.themeSelected,
              ]}
            >
              <View style={styles.themeColors}>
                {[theme.palette.accent, theme.palette.control]
                  .concat(theme.sceneColors.slice(1, 2))
                  .map((color, index) => (
                    <View
                      key={index}
                      style={[styles.themeColor, { backgroundColor: color }]}
                    />
                  ))}
              </View>
              <Text
                numberOfLines={1}
                style={[type.label, { color: theme.palette.text }]}
              >
                {theme.name}
              </Text>
              {selected ? (
                <View style={styles.themeCheck}>
                  <Check color={theme.palette.text} size={18} />
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
  const { music } = useApp();
  const {
    queueVisible,
    setQueueVisible,
    playbackQueue,
    currentTrack,
    queueUpdating,
    saveQueueAsPlaylist,
    confirmClearQueue,
    playQueueTrack,
    moveQueueTrack,
    removeQueueTrack,
  } = music;
  const [draggingTrackId, setDraggingTrackId] = useState<string | null>(null);
  const [dragTargetIndex, setDragTargetIndex] = useState<number | null>(null);
  const listRef = useRef<FlatList<Track>>(null);
  const viewportRef = useRef<ElementRef<typeof View>>(null);
  const scrollOffset = useRef(0);
  const contentHeight = useRef(0);
  const viewport = useRef({ top: 0, height: 0 });
  const lastAutoScrollAt = useRef(0);

  function updateDrag(
    trackId: string | null,
    targetIndex: number | null,
    pointerY?: number,
  ) {
    setDraggingTrackId(current => (current === trackId ? current : trackId));
    setDragTargetIndex(current =>
      current === targetIndex ? current : targetIndex,
    );
    if (trackId === null || pointerY === undefined) {
      return;
    }
    const now = Date.now();
    if (now - lastAutoScrollAt.current < 40) {
      return;
    }
    const { top, height } = viewport.current;
    if (height <= 0) {
      return;
    }
    const edgeSize = 56;
    const maxOffset = Math.max(0, contentHeight.current - height);
    let nextOffset = scrollOffset.current;
    if (pointerY < top + edgeSize) {
      nextOffset = Math.max(0, nextOffset - 12);
    } else if (pointerY > top + height - edgeSize) {
      nextOffset = Math.min(maxOffset, nextOffset + 12);
    }
    if (nextOffset !== scrollOffset.current) {
      lastAutoScrollAt.current = now;
      scrollOffset.current = nextOffset;
      listRef.current?.scrollToOffset({ offset: nextOffset, animated: false });
    }
  }

  return (
    <Sheet
      closeLabel="Cerrar cola"
      onClose={() => setQueueVisible(false)}
      sheetStyle={styles.queueSheet}
      subtitle={`${formatTrackCount(playbackQueue.length)} en la cola`}
      title="A continuación"
      visible={queueVisible}
    >
      <View style={styles.queueActions}>
        <Button
          accessibilityLabel="Guardar cola como lista"
          disabled={playbackQueue.length === 0 || queueUpdating}
          label="Guardar como lista"
          onPress={saveQueueAsPlaylist}
          style={styles.queueAction}
          variant="tonal"
        />
        <Button
          accessibilityLabel="Vaciar canciones siguientes"
          disabled={playbackQueue.length <= 1 || queueUpdating}
          label="Vaciar siguientes"
          onPress={confirmClearQueue}
          style={styles.queueAction}
          variant="tonal"
        />
      </View>
      <View
        ref={viewportRef}
        onLayout={() => {
          viewportRef.current?.measureInWindow((_x, top, _width, height) => {
            viewport.current = { top, height };
          });
        }}
        style={styles.queueList}
      >
        <FlatList
          ref={listRef}
          data={playbackQueue}
          initialNumToRender={12}
          keyExtractor={track => track.id}
          ListEmptyComponent={
            <Text style={[type.secondary, styles.queueEmpty]}>
              No hay canciones en la cola.
            </Text>
          }
          maxToRenderPerBatch={8}
          onContentSizeChange={(_width, height) => {
            contentHeight.current = height;
          }}
          onScroll={event => {
            scrollOffset.current = event.nativeEvent.contentOffset.y;
          }}
          renderItem={({ item: track, index }) => (
            <QueueTrackRow
              disabled={queueUpdating}
              dropTarget={
                dragTargetIndex === index && draggingTrackId !== track.id
              }
              getScrollOffset={() => scrollOffset.current}
              index={index}
              isCurrent={track.id === currentTrack?.id}
              onDragStateChange={updateDrag}
              onMove={moveQueueTrack}
              onPress={() => playQueueTrack(index)}
              onRemove={() => removeQueueTrack(track, index)}
              queueLength={playbackQueue.length}
              track={track}
            />
          )}
          scrollEnabled={!queueUpdating && draggingTrackId === null}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          windowSize={7}
        />
      </View>
      <Snackbar bottom={spacing.lg} placement="queue" />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  themes: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  theme: {
    borderColor: colors.outline,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    height: 112,
    justifyContent: 'flex-end',
    padding: spacing.md,
    width: 112,
  },
  themeSelected: { borderColor: colors.text, borderWidth: 2 },
  themeColors: { flexDirection: 'row', gap: spacing.xs },
  themeColor: { borderRadius: 7, height: 14, width: 14 },
  themeCheck: { position: 'absolute', right: spacing.sm, top: spacing.sm },
  equalizer: { gap: spacing.lg, paddingHorizontal: spacing.lg },
  equalizerHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  presets: { flexDirection: 'row', gap: spacing.sm },
  off: { opacity: 0.45 },
  preset: {
    alignItems: 'center',
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.full,
    flex: 1,
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  presetSelected: { backgroundColor: colors.text },
  presetSelectedText: { color: colors.background },
  bands: { flexDirection: 'row', paddingBottom: spacing.md },
  queueSheet: { height: '80%' },
  queueActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  queueAction: { flex: 1, paddingHorizontal: spacing.sm },
  queueList: { flex: 1 },
  queueEmpty: { padding: spacing.xl, textAlign: 'center' },
});
