import type { Dispatch, ElementRef, Ref, SetStateAction } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Clock3,
  Gauge,
  ListMusic,
  SlidersHorizontal,
} from 'lucide-react-native';
import { RepeatMode } from 'react-native-track-player';
import type { EqualizerSettings } from '../native/musicLibrary';
import type { Track } from '../types/Track';
import type { createStyles } from '../theme/createStyles';
import type { AppDesignTokens } from '../theme/tokens';
import { Artwork } from '../components/library/LibraryComponents';
import {
  EqualizerBandControl,
  QueueTrackRow,
} from '../components/player/PlayerControls';
import { ExpandedPlaybackProgress } from '../components/player/PlaybackProgress';
import { formatTime } from '../utils/formatTime';
import { formatTrackCount } from '../utils/formatTrackCount';

type ScreenStyles = ReturnType<typeof createStyles>;

type PlayerScreenProps = {
  colors: AppDesignTokens['colors'];
  styles: ScreenStyles;
  currentTrack: Track | null;
  expandedArtworkSize: number;
  playerExpanded: boolean;
  setPlayerExpanded: Dispatch<SetStateAction<boolean>>;
  playbackSourceLabel: string;
  favoriteIds: Set<string>;
  toggleFavorite: (track: Track) => void;
  seekToPosition: (position: number) => Promise<void>;
  playerReady: boolean;
  shuffleEnabled: boolean;
  queueUpdating: boolean;
  toggleShuffle: () => void;
  skipTrack: (direction: 'next' | 'previous') => void;
  isPlaying: boolean;
  togglePlayback: () => void;
  repeatMode: RepeatMode;
  cycleRepeatMode: () => void;
  playbackQueue: Track[];
  queueVisible: boolean;
  setQueueVisible: Dispatch<SetStateAction<boolean>>;
  sleepTimerVisible: boolean;
  setSleepTimerVisible: Dispatch<SetStateAction<boolean>>;
  sleepTimerDeadline: number | null;
  sleepTimerSecondsLeft: number;
  playbackRate: number;
  changePlaybackRate: () => void;
  equalizerVisible: boolean;
  setEqualizerVisible: Dispatch<SetStateAction<boolean>>;
  equalizerSettings: EqualizerSettings;
  updateEqualizerSettings: (settings: EqualizerSettings) => void;
  changeEqualizerBand: (index: number, gain: number) => void;
  saveQueueAsPlaylist: () => void;
  confirmClearQueue: () => void;
  queueViewportRef: Ref<ElementRef<typeof View>>;
  measureQueueViewport: () => void;
  queueScrollRef: Ref<FlatList<Track>>;
  queueScrollContentHeight: { current: number };
  queueScrollOffset: { current: number };
  getQueueScrollOffset: () => number;
  dragTargetIndex: number | null;
  draggingTrackId: string | null;
  playQueueTrack: (index: number) => void;
  moveQueueTrack: (fromIndex: number, toIndex: number) => Promise<void>;
  updateQueueDrag: (
    trackId: string | null,
    targetIndex: number | null,
    pointerY?: number,
  ) => void;
  removeQueueTrack: (track: Track, index: number) => Promise<boolean>;
  pendingQueueRemoval: { track: Track } | null;
  undoSecondsLeft: number;
  undoQueueRemoval: () => void;
  startSleepTimer: (minutes: number) => void;
  stopSleepTimer: () => void;
};

export const equalizerBands = [
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

export function PlayerScreen(props: PlayerScreenProps) {
  const {
    colors,
    styles,
    currentTrack,
    expandedArtworkSize,
    playerExpanded,
    setPlayerExpanded,
    playbackSourceLabel,
    favoriteIds,
    toggleFavorite,
    seekToPosition,
    playerReady,
    shuffleEnabled,
    queueUpdating,
    toggleShuffle,
    skipTrack,
    isPlaying,
    togglePlayback,
    repeatMode,
    cycleRepeatMode,
    playbackQueue,
    queueVisible,
    setQueueVisible,
    sleepTimerVisible,
    setSleepTimerVisible,
    sleepTimerDeadline,
    sleepTimerSecondsLeft,
    playbackRate,
    changePlaybackRate,
    equalizerVisible,
    setEqualizerVisible,
    equalizerSettings,
    updateEqualizerSettings,
    changeEqualizerBand,
    saveQueueAsPlaylist,
    confirmClearQueue,
    queueViewportRef,
    measureQueueViewport,
    queueScrollRef,
    queueScrollContentHeight,
    queueScrollOffset,
    getQueueScrollOffset,
    dragTargetIndex,
    draggingTrackId,
    playQueueTrack,
    moveQueueTrack,
    updateQueueDrag,
    removeQueueTrack,
    pendingQueueRemoval,
    undoSecondsLeft,
    undoQueueRemoval,
    startSleepTimer,
    stopSleepTimer,
  } = props;

  if (!currentTrack) {
    return null;
  }

  return (
    <Modal
      animationType="slide"
      onRequestClose={() => {
        if (equalizerVisible) {
          setEqualizerVisible(false);
        } else if (sleepTimerVisible) {
          setSleepTimerVisible(false);
        } else if (queueVisible) {
          setQueueVisible(false);
        } else {
          setPlayerExpanded(false);
        }
      }}
      statusBarTranslucent
      visible={playerExpanded}
    >
      <SafeAreaView style={styles.expandedPlayer}>
        <View style={styles.expandedHeader}>
          <Pressable
            accessibilityLabel="Cerrar reproductor"
            android_ripple={{ color: colors.ripple, borderless: true }}
            onPress={() => setPlayerExpanded(false)}
            style={[
              styles.expandedHeaderButton,
              styles.expandedHeaderButtonSurface,
            ]}
          >
            <Text style={styles.expandedHeaderIcon}>⌄</Text>
          </Pressable>
          <View style={styles.expandedHeaderTitle}>
            <Text style={styles.expandedSourceLabel}>AHORA SUENA</Text>
            <Text numberOfLines={1} style={styles.expandedSource}>
              {playbackSourceLabel}
            </Text>
          </View>
          <View style={styles.expandedHeaderButton} />
        </View>

        <ScrollView
          contentContainerStyle={styles.expandedContent}
          showsVerticalScrollIndicator={false}
        >
          <Artwork uri={currentTrack.artwork} size={expandedArtworkSize} />
          <View style={styles.expandedTrackInfo}>
            <View style={styles.expandedTrackText}>
              <Text numberOfLines={2} style={styles.expandedTrackTitle}>
                {currentTrack.title}
              </Text>
              <Text numberOfLines={1} style={styles.expandedTrackArtist}>
                {currentTrack.artist} · {currentTrack.album}
              </Text>
            </View>
            <Pressable
              accessibilityLabel={
                favoriteIds.has(currentTrack.id)
                  ? 'Quitar de favoritas'
                  : 'Añadir a favoritas'
              }
              onPress={() => toggleFavorite(currentTrack)}
              style={styles.expandedFavorite}
            >
              <Text
                style={[
                  styles.expandedFavoriteIcon,
                  favoriteIds.has(currentTrack.id) && styles.favoriteIconActive,
                ]}
              >
                {favoriteIds.has(currentTrack.id) ? '♥' : '♡'}
              </Text>
            </Pressable>
          </View>

          <ExpandedPlaybackProgress
            fallbackDuration={currentTrack.duration}
            onSeek={seekToPosition}
            disabled={!playerReady}
          />

          <View style={styles.expandedControls}>
            <Pressable
              accessibilityLabel={
                shuffleEnabled ? 'Desactivar mezcla' : 'Activar mezcla'
              }
              accessibilityState={{ selected: shuffleEnabled }}
              disabled={queueUpdating}
              onPress={toggleShuffle}
              style={styles.expandedModeButton}
            >
              <Text
                style={[
                  styles.expandedModeIcon,
                  shuffleEnabled && styles.expandedModeActive,
                ]}
              >
                ⇄
              </Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Canción anterior"
              onPress={() => skipTrack('previous')}
              style={styles.expandedSkipButton}
            >
              <Text style={styles.expandedSkipIcon}>|◀</Text>
            </Pressable>
            <Pressable
              accessibilityLabel={isPlaying ? 'Pausar' : 'Reproducir'}
              onPress={togglePlayback}
              style={styles.expandedPlayButton}
            >
              <Text style={styles.expandedPlayIcon}>
                {isPlaying ? 'Ⅱ' : '▶'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Siguiente canción"
              android_ripple={{ color: colors.ripple, borderless: true }}
              onPress={() => skipTrack('next')}
              style={styles.expandedSkipButton}
            >
              <Text style={styles.expandedSkipIcon}>▶|</Text>
            </Pressable>
            <Pressable
              accessibilityLabel={
                repeatMode === RepeatMode.Off
                  ? 'Activar repetir canción'
                  : repeatMode === RepeatMode.Track
                  ? 'Activar repetir cola'
                  : 'Desactivar repetición'
              }
              accessibilityState={{
                selected: repeatMode !== RepeatMode.Off,
                disabled: !playerReady,
              }}
              disabled={!playerReady}
              onPress={cycleRepeatMode}
              style={styles.expandedModeButton}
            >
              <Text
                style={[
                  styles.expandedModeIcon,
                  repeatMode !== RepeatMode.Off && styles.expandedModeActive,
                ]}
              >
                {repeatMode === RepeatMode.Track ? '↻¹' : '↻'}
              </Text>
            </Pressable>
          </View>
          <View style={styles.playerSecondaryActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Abrir cola de reproducción con ${playbackQueue.length} canciones`}
              onPress={() => setQueueVisible(true)}
              style={styles.queueButton}
            >
              <ListMusic color={colors.text} size={22} />
              <View style={styles.playerUtilityBadge}>
                <Text style={styles.playerUtilityBadgeText}>
                  {playbackQueue.length}
                </Text>
              </View>
            </Pressable>
            <View style={styles.playerUtilityActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  sleepTimerDeadline === null
                    ? 'Configurar temporizador de apagado'
                    : `Temporizador, ${formatTime(
                        sleepTimerSecondsLeft,
                      )} restantes`
                }
                onPress={() => setSleepTimerVisible(true)}
                style={[
                  styles.sleepTimerButton,
                  sleepTimerDeadline !== null && styles.sleepTimerActive,
                ]}
              >
                <Clock3 color={colors.text} size={22} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Velocidad de reproducción ${playbackRate}×`}
                onPress={changePlaybackRate}
                style={styles.speedButton}
              >
                <Gauge color={colors.text} size={22} />
                <View style={styles.playerUtilityBadge}>
                  <Text style={styles.playerUtilityBadgeText}>
                    {playbackRate}×
                  </Text>
                </View>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Abrir ecualizador"
                accessibilityState={{ selected: equalizerVisible }}
                onPress={() => setEqualizerVisible(true)}
                style={[
                  styles.speedButton,
                  equalizerSettings.enabled && styles.sleepTimerActive,
                ]}
              >
                <SlidersHorizontal color={colors.text} size={22} />
              </Pressable>
            </View>
          </View>
        </ScrollView>

        {queueVisible ? (
          <View style={styles.queueOverlay}>
            <Pressable
              accessibilityLabel="Cerrar cola"
              onPress={() => setQueueVisible(false)}
              style={styles.queueBackdrop}
            />
            <View style={styles.queueSheet}>
              <View style={styles.queueHandle} />
              <View style={styles.queueHeader}>
                <View>
                  <Text style={styles.queueTitle}>A continuación</Text>
                  <Text style={styles.trackSubtitle}>
                    {formatTrackCount(playbackQueue.length)} en la cola
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel="Cerrar cola"
                  onPress={() => setQueueVisible(false)}
                  style={styles.queueCloseButton}
                >
                  <Text style={styles.queueCloseIcon}>×</Text>
                </Pressable>
              </View>
              <View style={styles.queueActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Guardar cola como lista"
                  disabled={playbackQueue.length === 0 || queueUpdating}
                  onPress={saveQueueAsPlaylist}
                  style={[
                    styles.queueActionButton,
                    (playbackQueue.length === 0 || queueUpdating) &&
                      styles.queueActionDisabled,
                  ]}
                >
                  <Text style={styles.queueActionText}>Guardar como lista</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Vaciar canciones siguientes"
                  disabled={playbackQueue.length <= 1 || queueUpdating}
                  onPress={confirmClearQueue}
                  style={[
                    styles.queueActionButton,
                    (playbackQueue.length <= 1 || queueUpdating) &&
                      styles.queueActionDisabled,
                  ]}
                >
                  <Text style={styles.queueActionText}>Vaciar siguientes</Text>
                </Pressable>
              </View>
              <View
                ref={queueViewportRef}
                onLayout={measureQueueViewport}
                style={styles.queueListViewport}
              >
                <FlatList
                  ref={queueScrollRef}
                  data={playbackQueue}
                  initialNumToRender={12}
                  keyExtractor={track => track.id}
                  ListEmptyComponent={
                    <Text style={styles.queueEmpty}>
                      No hay canciones en la cola.
                    </Text>
                  }
                  maxToRenderPerBatch={8}
                  onContentSizeChange={(_width, height) => {
                    queueScrollContentHeight.current = height;
                  }}
                  onScroll={event => {
                    queueScrollOffset.current =
                      event.nativeEvent.contentOffset.y;
                  }}
                  renderItem={({ item: track, index }) => (
                    <QueueTrackRow
                      track={track}
                      index={index}
                      queueLength={playbackQueue.length}
                      isCurrent={track.id === currentTrack.id}
                      disabled={queueUpdating}
                      getScrollOffset={getQueueScrollOffset}
                      dropTarget={
                        dragTargetIndex === index &&
                        draggingTrackId !== track.id
                      }
                      onPress={() => playQueueTrack(index)}
                      onMove={moveQueueTrack}
                      onDragStateChange={updateQueueDrag}
                      onRemove={() => removeQueueTrack(track, index)}
                    />
                  )}
                  scrollEventThrottle={16}
                  scrollEnabled={!queueUpdating && draggingTrackId === null}
                  showsVerticalScrollIndicator={false}
                  style={styles.queueList}
                  windowSize={7}
                />
              </View>
              {pendingQueueRemoval ? (
                <View
                  accessibilityLiveRegion="polite"
                  style={styles.queueUndoBar}
                >
                  <Text numberOfLines={1} style={styles.queueUndoMessage}>
                    Canción quitada
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Deshacer eliminación, ${undoSecondsLeft} segundos`}
                    disabled={queueUpdating}
                    onPress={undoQueueRemoval}
                    style={styles.queueUndoButton}
                  >
                    <Text style={styles.queueUndoText}>
                      Deshacer · {undoSecondsLeft} s
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}
        {sleepTimerVisible ? (
          <View style={styles.timerOverlay}>
            <Pressable
              accessibilityLabel="Cerrar temporizador"
              onPress={() => setSleepTimerVisible(false)}
              style={styles.queueBackdrop}
            />
            <View style={styles.timerSheet}>
              <View style={styles.queueHandle} />
              <Text style={styles.queueTitle}>Temporizador</Text>
              <Text style={styles.dialogDescription}>
                Pausa la música automáticamente cuando termine el tiempo.
              </Text>
              <View style={styles.timerOptions}>
                {[15, 30, 45, 60].map(minutes => (
                  <Pressable
                    key={minutes}
                    accessibilityRole="button"
                    accessibilityLabel={`Pausar en ${minutes} minutos`}
                    onPress={() => startSleepTimer(minutes)}
                    style={styles.timerOption}
                  >
                    <Text style={styles.timerOptionText}>{minutes} min</Text>
                  </Pressable>
                ))}
              </View>
              {sleepTimerDeadline !== null ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancelar temporizador"
                  onPress={() => {
                    stopSleepTimer();
                    setSleepTimerVisible(false);
                  }}
                  style={styles.timerCancelButton}
                >
                  <Text style={styles.timerCancelText}>
                    Cancelar temporizador · {formatTime(sleepTimerSecondsLeft)}
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                onPress={() => setSleepTimerVisible(false)}
                style={styles.dialogCancelButton}
              >
                <Text style={styles.dialogCancelText}>Cerrar</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
        {equalizerVisible ? (
          <View style={styles.equalizerOverlay}>
            <Pressable
              accessibilityLabel="Cerrar ecualizador"
              onPress={() => setEqualizerVisible(false)}
              style={styles.queueBackdrop}
            />
            <View style={styles.equalizerSheet}>
              <View style={styles.queueHandle} />
              <View style={styles.equalizerHeader}>
                <View>
                  <Text style={styles.queueTitle}>Ecualizador</Text>
                  <Text style={styles.trackSubtitle}>
                    Ajuste de sonido integrado al reproductor
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="switch"
                  accessibilityLabel="Activar ecualizador"
                  accessibilityState={{ checked: equalizerSettings.enabled }}
                  onPress={() =>
                    updateEqualizerSettings({
                      ...equalizerSettings,
                      enabled: !equalizerSettings.enabled,
                    })
                  }
                  style={[
                    styles.equalizerToggle,
                    equalizerSettings.enabled && styles.equalizerToggleActive,
                  ]}
                >
                  <Text style={styles.equalizerToggleText}>
                    {equalizerSettings.enabled ? 'Activado' : 'Desactivado'}
                  </Text>
                </Pressable>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.equalizerPresets}
              >
                {equalizerPresets.map(preset => (
                  <Pressable
                    key={preset.name}
                    accessibilityRole="button"
                    accessibilityLabel={`Usar perfil ${preset.name}`}
                    onPress={() =>
                      updateEqualizerSettings({
                        ...equalizerSettings,
                        bandGainsDb: [...preset.gains],
                      })
                    }
                    style={styles.equalizerPreset}
                  >
                    <Text style={styles.equalizerPresetText}>
                      {preset.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              <View style={styles.equalizerBands}>
                {equalizerBands.map((band, index) => (
                  <EqualizerBandControl
                    key={band.frequency}
                    frequency={band.frequency}
                    label={band.label}
                    value={equalizerSettings.bandGainsDb[index] ?? 0}
                    onChange={gain => changeEqualizerBand(index, gain)}
                  />
                ))}
              </View>
              <Text style={styles.equalizerRange}>
                −12 dB <Text style={styles.equalizerRangeCenter}>0</Text> +12 dB
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setEqualizerVisible(false)}
                style={styles.dialogCancelButton}
              >
                <Text style={styles.dialogCancelText}>Cerrar</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}
