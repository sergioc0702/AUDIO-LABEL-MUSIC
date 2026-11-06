import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ElementRef,
  type Ref,
  type SetStateAction,
} from 'react';
import {
  Animated,
  FlatList,
  Modal,
  PanResponder,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronDown,
  Clock3,
  Gauge,
  Heart,
  ListMusic,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  X,
} from 'lucide-react-native';
import { RepeatMode } from 'react-native-track-player';
import type { EqualizerSettings } from '../native/musicLibrary';
import type { Track } from '../types/Track';
import { createStyles } from '../theme/createStyles';
import {
  DesignThemeContext,
  useDesignTokens,
} from '../theme/DesignThemeContext';
import { motionDuration, motionEasing } from '../theme/motion';
import { getPlayerTheme, resolvePlayerTokens } from '../theme/playerThemes';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { AnimatedSheet } from '../components/motion/AnimatedSheet';
import { PressableScale } from '../components/motion/PressableScale';
import { PlayPauseIcon } from '../components/player/PlayPauseIcon';
import { PlayerScene } from '../components/player/scenes/PlayerScene';
import { Artwork } from '../components/library/LibraryComponents';
import {
  EqualizerBandControl,
  QueueTrackRow,
} from '../components/player/PlayerControls';
import { ExpandedPlaybackProgress } from '../components/player/PlaybackProgress';
import { formatTime } from '../utils/formatTime';
import { formatTrackCount } from '../utils/formatTrackCount';

type PlayerScreenProps = {
  themeId: string;
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
    themeId,
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

  const baseTokens = useDesignTokens();
  const theme = getPlayerTheme(themeId);
  const tokens = useMemo(
    () => resolvePlayerTokens(baseTokens, theme),
    [baseTokens, theme],
  );
  const { colors } = tokens;
  const styles = createStyles(tokens);
  const reducedMotion = useReducedMotion();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const [mounted, setMounted] = useState(playerExpanded);
  const sheetY = useRef(new Animated.Value(windowHeight)).current;
  const artworkX = useRef(new Animated.Value(0)).current;
  const artworkFade = useRef(new Animated.Value(1)).current;
  const artworkPresence = useRef(new Animated.Value(isPlaying ? 1 : 0)).current;
  const trackInfoFade = useRef(new Animated.Value(1)).current;
  const favoritePop = useRef(new Animated.Value(1)).current;
  const pendingSkip = useRef(0);
  const skipFallback = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragAxis = useRef<'x' | 'y' | null>(null);
  const previousTrackId = useRef(currentTrack?.id);
  const isFavorite = currentTrack ? favoriteIds.has(currentTrack.id) : false;
  const previousFavorite = useRef(isFavorite);

  useEffect(() => {
    if (playerExpanded) {
      setMounted(true);
      Animated.timing(sheetY, {
        toValue: 0,
        duration: reducedMotion ? 0 : motionDuration.enter,
        easing: motionEasing.enter,
        useNativeDriver: true,
      }).start();
      return;
    }
    Animated.timing(sheetY, {
      toValue: windowHeight,
      duration: reducedMotion ? 0 : motionDuration.exit,
      easing: motionEasing.exit,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setMounted(false);
      }
    });
  }, [playerExpanded, reducedMotion, sheetY, windowHeight]);

  // The artwork steps back on pause, so the state reads without looking at the button.
  useEffect(() => {
    Animated.spring(artworkPresence, {
      toValue: isPlaying ? 1 : 0,
      speed: reducedMotion ? 1000 : 10,
      bounciness: reducedMotion ? 0 : 5,
      useNativeDriver: true,
    }).start();
  }, [artworkPresence, isPlaying, reducedMotion]);

  useEffect(() => {
    if (previousTrackId.current === currentTrack?.id) {
      return;
    }
    previousTrackId.current = currentTrack?.id;
    const direction = pendingSkip.current;
    pendingSkip.current = 0;
    if (reducedMotion) {
      artworkX.setValue(0);
      return;
    }
    artworkX.setValue(direction * windowWidth * 0.8);
    artworkFade.setValue(0);
    trackInfoFade.setValue(0);
    Animated.parallel([
      Animated.spring(artworkX, {
        toValue: 0,
        speed: 14,
        bounciness: 3,
        useNativeDriver: true,
      }),
      Animated.timing(artworkFade, {
        toValue: 1,
        duration: motionDuration.state,
        useNativeDriver: true,
      }),
      Animated.timing(trackInfoFade, {
        toValue: 1,
        duration: motionDuration.enter,
        easing: motionEasing.enter,
        useNativeDriver: true,
      }),
    ]).start();
  }, [
    artworkFade,
    artworkX,
    currentTrack?.id,
    reducedMotion,
    trackInfoFade,
    windowWidth,
  ]);

  useEffect(() => {
    if (previousFavorite.current === isFavorite) {
      return;
    }
    previousFavorite.current = isFavorite;
    if (!isFavorite || reducedMotion) {
      return;
    }
    favoritePop.setValue(0.6);
    Animated.spring(favoritePop, {
      toValue: 1,
      speed: 20,
      bounciness: 16,
      useNativeDriver: true,
    }).start();
  }, [favoritePop, isFavorite, reducedMotion]);

  useEffect(
    () => () => {
      if (skipFallback.current) {
        clearTimeout(skipFallback.current);
      }
    },
    [],
  );

  const requestSkip = (direction: 'next' | 'previous') => {
    const sign = direction === 'next' ? 1 : -1;
    pendingSkip.current = sign;
    skipTrack(direction);
    if (skipFallback.current) {
      clearTimeout(skipFallback.current);
    }
    // There may be no track to move to: bring the artwork back if nothing changed.
    skipFallback.current = setTimeout(() => {
      if (pendingSkip.current === sign) {
        pendingSkip.current = 0;
        Animated.spring(artworkX, {
          toValue: 0,
          speed: 16,
          bounciness: 4,
          useNativeDriver: true,
        }).start();
      }
    }, 700);
  };

  const gestureActions = useRef({
    requestSkip,
    setPlayerExpanded,
    windowWidth,
  });
  gestureActions.current = { requestSkip, setPlayerExpanded, windowWidth };

  const gestures = useMemo(() => {
    const settleSheet = () =>
      Animated.spring(sheetY, {
        toValue: 0,
        speed: 20,
        bounciness: 0,
        useNativeDriver: true,
      }).start();
    const settleArtwork = () =>
      Animated.spring(artworkX, {
        toValue: 0,
        speed: 18,
        bounciness: 5,
        useNativeDriver: true,
      }).start();
    const finishSheetDrag = (dy: number, vy: number) => {
      if (dy > 140 || vy > 0.9) {
        gestureActions.current.setPlayerExpanded(false);
      } else {
        settleSheet();
      }
    };

    return {
      header: PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          gesture.dy > 8 && gesture.dy > Math.abs(gesture.dx),
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_, gesture) => {
          sheetY.setValue(Math.max(0, gesture.dy));
        },
        onPanResponderRelease: (_, gesture) => {
          finishSheetDrag(gesture.dy, gesture.vy);
        },
        onPanResponderTerminate: settleSheet,
      }),
      stage: PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          dragAxis.current = null;
        },
        onPanResponderMove: (_, gesture) => {
          if (dragAxis.current === null) {
            if (Math.abs(gesture.dx) < 10 && Math.abs(gesture.dy) < 10) {
              return;
            }
            dragAxis.current =
              Math.abs(gesture.dx) > Math.abs(gesture.dy) ? 'x' : 'y';
          }
          if (dragAxis.current === 'x') {
            artworkX.setValue(gesture.dx);
          } else {
            sheetY.setValue(Math.max(0, gesture.dy));
          }
        },
        onPanResponderRelease: (_, gesture) => {
          if (dragAxis.current === null) {
            return;
          }
          if (dragAxis.current === 'y') {
            finishSheetDrag(gesture.dy, gesture.vy);
            return;
          }
          const width = gestureActions.current.windowWidth;
          if (
            Math.abs(gesture.dx) < width * 0.26 &&
            Math.abs(gesture.vx) < 0.8
          ) {
            settleArtwork();
            return;
          }
          const sign = gesture.dx < 0 ? 1 : -1;
          Animated.timing(artworkX, {
            toValue: -sign * width,
            duration: 140,
            easing: motionEasing.exit,
            useNativeDriver: true,
          }).start(() => {
            gestureActions.current.requestSkip(sign > 0 ? 'next' : 'previous');
          });
        },
        onPanResponderTerminate: () => {
          settleArtwork();
          settleSheet();
        },
      }),
    };
  }, [artworkX, sheetY]);

  if (!currentTrack) {
    return null;
  }

  const repeatLabel =
    repeatMode === RepeatMode.Off
      ? 'Activar repetir canción'
      : repeatMode === RepeatMode.Track
      ? 'Activar repetir cola'
      : 'Desactivar repetición';
  const RepeatIcon = repeatMode === RepeatMode.Track ? Repeat1 : Repeat;

  return (
    <Modal
      animationType="none"
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
      transparent
      visible={mounted}
    >
      <DesignThemeContext.Provider value={tokens}>
        <Animated.View
          style={[
            styles.expandedPlayerShell,
            { transform: [{ translateY: sheetY }] },
          ]}
        >
          <PlayerScene active={isPlaying && playerExpanded} theme={theme} />
          <SafeAreaView style={styles.expandedPlayer}>
            <View
              {...gestures.header.panHandlers}
              style={styles.expandedHeader}
            >
              <PressableScale
                accessibilityLabel="Cerrar reproductor"
                accessibilityHint="También puedes deslizar hacia abajo"
                android_ripple={{ color: colors.ripple, borderless: true }}
                onPress={() => setPlayerExpanded(false)}
                pressedScale={0.88}
                style={[
                  styles.expandedHeaderButton,
                  styles.expandedHeaderButtonSurface,
                ]}
              >
                <ChevronDown color={colors.text} size={24} />
              </PressableScale>
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
              <Animated.View
                {...gestures.stage.panHandlers}
                accessibilityHint="Desliza a los lados para cambiar de canción"
                style={{
                  opacity: artworkFade,
                  transform: [
                    { translateX: artworkX },
                    {
                      rotate: artworkX.interpolate({
                        inputRange: [-windowWidth, windowWidth],
                        outputRange: ['-7deg', '7deg'],
                      }),
                    },
                    {
                      scale: artworkPresence.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1],
                      }),
                    },
                  ],
                }}
              >
                <Artwork
                  uri={currentTrack.artwork}
                  size={expandedArtworkSize}
                />
              </Animated.View>
              <Animated.View
                style={[styles.expandedTrackInfo, { opacity: trackInfoFade }]}
              >
                <View style={styles.expandedTrackText}>
                  <Text numberOfLines={2} style={styles.expandedTrackTitle}>
                    {currentTrack.title}
                  </Text>
                  <Text numberOfLines={1} style={styles.expandedTrackArtist}>
                    {currentTrack.artist} · {currentTrack.album}
                  </Text>
                </View>
                <PressableScale
                  accessibilityLabel={
                    isFavorite ? 'Quitar de favoritas' : 'Añadir a favoritas'
                  }
                  onPress={() => toggleFavorite(currentTrack)}
                  pressedScale={0.85}
                  style={styles.expandedFavorite}
                >
                  <Animated.View
                    style={{ transform: [{ scale: favoritePop }] }}
                  >
                    <Heart
                      color={isFavorite ? colors.accent : colors.muted}
                      fill={isFavorite ? colors.accent : 'none'}
                      size={26}
                    />
                  </Animated.View>
                </PressableScale>
              </Animated.View>

              <ExpandedPlaybackProgress
                fallbackDuration={currentTrack.duration}
                onSeek={seekToPosition}
                disabled={!playerReady}
              />

              <View style={styles.expandedControls}>
                <PressableScale
                  accessibilityLabel={
                    shuffleEnabled ? 'Desactivar mezcla' : 'Activar mezcla'
                  }
                  accessibilityState={{ selected: shuffleEnabled }}
                  disabled={queueUpdating}
                  onPress={toggleShuffle}
                  pressedScale={0.85}
                  style={styles.expandedModeButton}
                >
                  <Shuffle
                    color={shuffleEnabled ? colors.accent : colors.muted}
                    size={22}
                  />
                </PressableScale>
                <PressableScale
                  accessibilityLabel="Canción anterior"
                  onPress={() => requestSkip('previous')}
                  pressedScale={0.85}
                  style={styles.expandedSkipButton}
                >
                  <SkipBack color={colors.text} fill={colors.text} size={28} />
                </PressableScale>
                <PressableScale
                  accessibilityLabel={isPlaying ? 'Pausar' : 'Reproducir'}
                  onPress={togglePlayback}
                  pressedScale={0.9}
                  style={styles.expandedPlayButton}
                >
                  <PlayPauseIcon
                    color={colors.onAccent}
                    isPlaying={isPlaying}
                    size={28}
                  />
                </PressableScale>
                <PressableScale
                  accessibilityLabel="Siguiente canción"
                  android_ripple={{ color: colors.ripple, borderless: true }}
                  onPress={() => requestSkip('next')}
                  pressedScale={0.85}
                  style={styles.expandedSkipButton}
                >
                  <SkipForward
                    color={colors.text}
                    fill={colors.text}
                    size={28}
                  />
                </PressableScale>
                <PressableScale
                  accessibilityLabel={repeatLabel}
                  accessibilityState={{
                    selected: repeatMode !== RepeatMode.Off,
                    disabled: !playerReady,
                  }}
                  disabled={!playerReady}
                  onPress={cycleRepeatMode}
                  pressedScale={0.85}
                  style={styles.expandedModeButton}
                >
                  <RepeatIcon
                    color={
                      repeatMode !== RepeatMode.Off
                        ? colors.accent
                        : colors.muted
                    }
                    size={22}
                  />
                </PressableScale>
              </View>
              <View style={styles.playerSecondaryActions}>
                <PressableScale
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
                </PressableScale>
                <View style={styles.playerUtilityActions}>
                  <PressableScale
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
                  </PressableScale>
                  <PressableScale
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
                  </PressableScale>
                  <PressableScale
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
                  </PressableScale>
                </View>
              </View>
            </ScrollView>

            <AnimatedSheet
              backdropStyle={styles.queueBackdrop}
              closeLabel="Cerrar cola"
              handleStyle={styles.queueHandle}
              onClose={() => setQueueVisible(false)}
              overlayStyle={styles.queueOverlay}
              sheetStyle={styles.queueSheet}
              visible={queueVisible}
            >
              <View style={styles.queueHeader}>
                <View>
                  <Text style={styles.queueTitle}>A continuación</Text>
                  <Text style={styles.trackSubtitle}>
                    {formatTrackCount(playbackQueue.length)} en la cola
                  </Text>
                </View>
                <PressableScale
                  accessibilityLabel="Cerrar cola"
                  onPress={() => setQueueVisible(false)}
                  style={styles.queueCloseButton}
                >
                  <X color={colors.muted} size={22} />
                </PressableScale>
              </View>
              <View style={styles.queueActions}>
                <PressableScale
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
                </PressableScale>
                <PressableScale
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
                </PressableScale>
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
                  <PressableScale
                    accessibilityRole="button"
                    accessibilityLabel={`Deshacer eliminación, ${undoSecondsLeft} segundos`}
                    disabled={queueUpdating}
                    onPress={undoQueueRemoval}
                    style={styles.queueUndoButton}
                  >
                    <Text style={styles.queueUndoText}>
                      Deshacer · {undoSecondsLeft} s
                    </Text>
                  </PressableScale>
                </View>
              ) : null}
            </AnimatedSheet>
            <AnimatedSheet
              backdropStyle={styles.queueBackdrop}
              closeLabel="Cerrar temporizador"
              handleStyle={styles.queueHandle}
              onClose={() => setSleepTimerVisible(false)}
              overlayStyle={styles.timerOverlay}
              sheetStyle={styles.timerSheet}
              visible={sleepTimerVisible}
            >
              <Text style={styles.queueTitle}>Temporizador</Text>
              <Text style={styles.dialogDescription}>
                Pausa la música automáticamente cuando termine el tiempo.
              </Text>
              <View style={styles.timerOptions}>
                {[15, 30, 45, 60].map(minutes => (
                  <PressableScale
                    key={minutes}
                    accessibilityRole="button"
                    accessibilityLabel={`Pausar en ${minutes} minutos`}
                    onPress={() => startSleepTimer(minutes)}
                    style={styles.timerOption}
                  >
                    <Text style={styles.timerOptionText}>{minutes} min</Text>
                  </PressableScale>
                ))}
              </View>
              {sleepTimerDeadline !== null ? (
                <PressableScale
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
                </PressableScale>
              ) : null}
              <PressableScale
                accessibilityRole="button"
                onPress={() => setSleepTimerVisible(false)}
                style={styles.dialogCancelButton}
              >
                <Text style={styles.dialogCancelText}>Cerrar</Text>
              </PressableScale>
            </AnimatedSheet>
            <AnimatedSheet
              backdropStyle={styles.queueBackdrop}
              closeLabel="Cerrar ecualizador"
              handleStyle={styles.queueHandle}
              onClose={() => setEqualizerVisible(false)}
              overlayStyle={styles.equalizerOverlay}
              sheetStyle={styles.equalizerSheet}
              visible={equalizerVisible}
            >
              <View style={styles.equalizerHeader}>
                <View style={styles.equalizerHeaderCopy}>
                  <Text style={styles.queueTitle}>Ecualizador</Text>
                  <Text style={styles.trackSubtitle}>
                    Ajuste de sonido integrado al reproductor
                  </Text>
                </View>
                <PressableScale
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
                </PressableScale>
              </View>
              <View style={styles.equalizerPresets}>
                {equalizerPresets.map(preset => {
                  const selected = preset.gains.every(
                    (gain, index) =>
                      gain === equalizerSettings.bandGainsDb[index],
                  );
                  return (
                    <PressableScale
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
                        styles.equalizerPreset,
                        selected && styles.equalizerPresetSelected,
                      ]}
                    >
                      <Text
                        adjustsFontSizeToFit
                        numberOfLines={1}
                        style={[
                          styles.equalizerPresetText,
                          selected && styles.equalizerPresetTextSelected,
                        ]}
                      >
                        {preset.name}
                      </Text>
                    </PressableScale>
                  );
                })}
              </View>
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
              <PressableScale
                accessibilityRole="button"
                onPress={() => setEqualizerVisible(false)}
                style={styles.dialogCancelButton}
              >
                <Text style={styles.dialogCancelText}>Cerrar</Text>
              </PressableScale>
            </AnimatedSheet>
          </SafeAreaView>
        </Animated.View>
      </DesignThemeContext.Provider>
    </Modal>
  );
}
