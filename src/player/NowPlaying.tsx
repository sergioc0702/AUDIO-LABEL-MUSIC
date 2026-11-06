import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronDown,
  Gauge,
  Heart,
  ListMusic,
  Moon,
  MoreVertical,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
} from 'lucide-react-native';
import { RepeatMode } from 'react-native-track-player';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useApp } from '../state/AppContext';
import { motionDuration, motionEasing } from '../theme/motion';
import {
  radius,
  screenPadding,
  spacing,
  createStyles,
  useColors,
} from '../theme/theme';
import { IconButton } from '../ui/Buttons';
import { Cover } from '../ui/Cover';
import { Snackbar } from '../ui/Snackbar';
import { Tap } from '../ui/Tap';
import { formatTime } from '../utils/formatTime';
import { PlayPauseIcon } from './PlayPauseIcon';
import { PlayerScene } from './PlayerScene';
import { useSleepTimer } from './Sheets';
import { PlayerProgress } from './controls';

function Tool({
  label,
  caption,
  active = false,
  icon: Icon,
  onPress,
}: {
  label: string;
  caption: string;
  active?: boolean;
  icon: typeof Gauge;
  onPress: () => void;
}) {
  const { colors, type } = useColors();
  const styles = useStyles();
  const color = active ? colors.accent : colors.textSecondary;
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      onPress={onPress}
      style={styles.tool}
    >
      <Icon color={color} size={22} />
      <Text numberOfLines={1} style={[type.caption, { color }]}>
        {caption}
      </Text>
    </Tap>
  );
}

export function NowPlaying() {
  const { colors, type } = useColors();
  const styles = useStyles();
  const { music, setPlayerSheet, palette } = useApp();
  const {
    currentTrack,
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
    playbackRate,
    equalizerSettings,
    playbackQueue,
    setQueueVisible,
    setQueueTrackDialog,
  } = music;
  const insets = useSafeAreaInsets();
  const { timer, secondsLeft } = useSleepTimer();
  const reducedMotion = useReducedMotion();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const coverSize = Math.min(
    windowWidth - screenPadding * 3,
    windowHeight * 0.42,
  );
  const [mounted, setMounted] = useState(playerExpanded);
  const sheetY = useRef(new Animated.Value(windowHeight)).current;
  const artworkX = useRef(new Animated.Value(0)).current;
  const artworkFade = useRef(new Animated.Value(1)).current;
  const artworkPresence = useRef(new Animated.Value(isPlaying ? 1 : 0)).current;
  const pendingSkip = useRef(0);
  const skipFallback = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragAxis = useRef<'x' | 'y' | null>(null);
  const previousTrackId = useRef(currentTrack?.id);

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

  useEffect(() => {
    Animated.timing(artworkPresence, {
      toValue: isPlaying ? 1 : 0,
      duration: reducedMotion ? 0 : motionDuration.enter,
      easing: motionEasing.enter,
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
    artworkX.setValue(direction * windowWidth * 0.7);
    artworkFade.setValue(0);
    Animated.parallel([
      Animated.timing(artworkX, {
        toValue: 0,
        duration: motionDuration.enter,
        easing: motionEasing.enter,
        useNativeDriver: true,
      }),
      Animated.timing(artworkFade, {
        toValue: 1,
        duration: motionDuration.state,
        useNativeDriver: true,
      }),
    ]).start();
  }, [artworkFade, artworkX, currentTrack?.id, reducedMotion, windowWidth]);

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
          bounciness: 0,
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
        bounciness: 0,
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
        onStartShouldSetPanResponder: () => true,
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

  const isFavorite = favoriteIds.has(currentTrack.id);
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
      navigationBarTranslucent
      onRequestClose={() => setPlayerExpanded(false)}
      statusBarTranslucent
      transparent
      visible={mounted}
    >
      <Animated.View
        style={[
          styles.player,
          {
            backgroundColor: colors.background,
            transform: [{ translateY: sheetY }],
          },
        ]}
      >
        <PlayerScene
          active={isPlaying && playerExpanded}
          artwork={currentTrack.artwork}
          palette={palette}
        />
        <View
          {...gestures.header.panHandlers}
          style={[styles.header, { paddingTop: insets.top + spacing.xs }]}
        >
          <IconButton
            accessibilityHint="También puedes deslizar hacia abajo"
            label="Cerrar reproductor"
            onPress={() => setPlayerExpanded(false)}
          >
            <ChevronDown color={colors.text} size={26} />
          </IconButton>
          <View style={styles.headerText}>
            <Text
              numberOfLines={1}
              style={[type.label, { color: colors.text }]}
            >
              Desde {playbackSourceLabel}
            </Text>
          </View>
          <IconButton
            label={`Más acciones para ${currentTrack.title}`}
            onPress={() =>
              setQueueTrackDialog({ track: currentTrack, fromLibrary: true })
            }
          >
            <MoreVertical color={colors.text} size={24} />
          </IconButton>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + spacing.lg },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            {...gestures.stage.panHandlers}
            accessibilityHint="Desliza a los lados para cambiar de canción"
            style={[
              styles.stage,
              {
                opacity: artworkFade,
                transform: [
                  { translateX: artworkX },
                  {
                    scale: artworkPresence.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.94, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Cover size={coverSize} uri={currentTrack.artwork} />
          </Animated.View>

          <View style={styles.info}>
            <View style={styles.infoText}>
              <Text
                numberOfLines={1}
                style={[type.headline, { color: colors.text }]}
              >
                {currentTrack.title}
              </Text>
              <Text
                numberOfLines={1}
                style={[type.body, { color: colors.textSecondary }]}
              >
                {currentTrack.artist}
              </Text>
            </View>
            <IconButton
              label={isFavorite ? 'Quitar de favoritas' : 'Añadir a favoritas'}
              onPress={() => toggleFavorite(currentTrack)}
            >
              <Heart
                color={isFavorite ? colors.accent : colors.text}
                fill={isFavorite ? colors.accent : 'none'}
                size={26}
              />
            </IconButton>
          </View>

          <PlayerProgress
            disabled={!playerReady}
            fallbackDuration={currentTrack.duration}
            onSeek={seekToPosition}
          />

          <View style={styles.controls}>
            <IconButton
              accessibilityState={{ selected: shuffleEnabled }}
              disabled={queueUpdating}
              label={shuffleEnabled ? 'Desactivar mezcla' : 'Activar mezcla'}
              onPress={toggleShuffle}
            >
              <Shuffle
                color={shuffleEnabled ? colors.accent : colors.text}
                size={24}
              />
            </IconButton>
            <IconButton
              label="Canción anterior"
              onPress={() => requestSkip('previous')}
            >
              <SkipBack color={colors.text} fill={colors.text} size={30} />
            </IconButton>
            <Tap
              accessibilityRole="button"
              accessibilityLabel={isPlaying ? 'Pausar' : 'Reproducir'}
              onPress={togglePlayback}
              pressedScale={0.92}
              style={[styles.play, { backgroundColor: colors.control }]}
            >
              <PlayPauseIcon
                color={colors.onControl}
                isPlaying={isPlaying}
                size={30}
              />
            </Tap>
            <IconButton
              label="Siguiente canción"
              onPress={() => requestSkip('next')}
            >
              <SkipForward color={colors.text} fill={colors.text} size={30} />
            </IconButton>
            <IconButton
              accessibilityState={{
                selected: repeatMode !== RepeatMode.Off,
                disabled: !playerReady,
              }}
              disabled={!playerReady}
              label={repeatLabel}
              onPress={cycleRepeatMode}
            >
              <RepeatIcon
                color={
                  repeatMode !== RepeatMode.Off ? colors.accent : colors.text
                }
                size={24}
              />
            </IconButton>
          </View>

          <View style={styles.tools}>
            <Tool
              caption={`Cola · ${playbackQueue.length}`}
              icon={ListMusic}
              label={`Abrir cola de reproducción con ${playbackQueue.length} canciones`}
              onPress={() => setQueueVisible(true)}
            />
            <Tool
              active={timer.mode !== 'off'}
              caption={
                timer.mode === 'time'
                  ? formatTime(secondsLeft)
                  : timer.mode === 'endOfTrack'
                  ? 'Al terminar'
                  : 'Dormir'
              }
              icon={Moon}
              label="Configurar temporizador de apagado"
              onPress={() => setPlayerSheet('sleep')}
            />
            <Tool
              active={playbackRate !== 1}
              caption={`${playbackRate}×`}
              icon={Gauge}
              label={`Velocidad de reproducción ${playbackRate}×`}
              onPress={() => setPlayerSheet('speed')}
            />
            <Tool
              active={equalizerSettings.enabled}
              caption="Ecualizador"
              icon={SlidersHorizontal}
              label="Abrir ecualizador"
              onPress={() => setPlayerSheet('equalizer')}
            />
          </View>
        </ScrollView>
        <Snackbar bottom={insets.bottom + spacing.sm} placement="player" />
      </Animated.View>
    </Modal>
  );
}

const useStyles = createStyles(() => ({
  player: {
    flex: 1,
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: spacing.xs,
  },
  headerText: { alignItems: 'center', flex: 1, minWidth: 0 },
  content: {
    flexGrow: 1,
    justifyContent: 'space-evenly',
    paddingHorizontal: screenPadding + spacing.xs,
  },
  stage: { alignItems: 'center', borderRadius: radius.md },
  info: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  infoText: { flex: 1, gap: 2, minWidth: 0 },
  controls: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  play: {
    alignItems: 'center',
    borderRadius: radius.full,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  tools: { flexDirection: 'row', justifyContent: 'space-between' },
  tool: { alignItems: 'center', flex: 1, gap: spacing.xs, minHeight: 48 },
}));
