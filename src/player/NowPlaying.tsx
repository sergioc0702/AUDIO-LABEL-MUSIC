import { useRef } from 'react';
import { ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import {
  Captions,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RepeatMode } from 'react-native-track-player';
import { useApp } from '../state/AppContext';
import { createStyles, radius, spacing, useColors } from '../theme/theme';
import { IconButton } from '../ui/Buttons';
import { Cover } from '../ui/Cover';
import { Tap } from '../ui/Tap';
import { formatTime } from '../utils/formatTime';
import { PlayPauseIcon } from './PlayPauseIcon';
import { PlayerScene } from './PlayerScene';
import { PlayerSeekBar } from './PlayerSeekBar';
import { acceptsSwipe, clamp, playerMotion } from './playerMotion';
import { useSleepTimer } from './Sheets';

function Tool({
  active = false,
  caption,
  icon: Icon,
  label,
  onPress,
  wrap,
}: {
  active?: boolean;
  caption: string;
  icon: typeof Moon;
  label: string;
  onPress: () => void;
  wrap: boolean;
}) {
  const { colors, type } = useColors();
  const styles = useStyles();
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.tool, wrap && styles.toolWrapped]}
    >
      <Icon color={active ? colors.accent : colors.text} size={21} />
      <Text
        numberOfLines={2}
        style={[type.caption, styles.toolCaption, active && styles.activeTool]}
      >
        {caption}
      </Text>
    </Tap>
  );
}

function TimerTool({ onPress, wrap }: { onPress: () => void; wrap: boolean }) {
  const { timer, secondsLeft } = useSleepTimer();
  return (
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
      onPress={onPress}
      wrap={wrap}
    />
  );
}

export function NowPlaying({
  covered,
  headerGesture,
  onClose,
}: {
  covered: boolean;
  headerGesture: ReturnType<typeof Gesture.Pan>;
  onClose: () => void;
}) {
  const { music, palette, setPlayerSheet } = useApp();
  const {
    currentTrack: track,
    playerExpanded,
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
  const { colors, type } = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { width, height, fontScale } = useWindowDimensions();
  const availableWidth = width - insets.left - insets.right;
  const landscape = availableWidth >= 620 && width > height;
  const toolsWrap =
    (landscape ? availableWidth / 2 : availableWidth) < 350 || fontScale > 1.25;
  const coverSize = Math.max(
    1,
    Math.min(
      landscape ? availableWidth * 0.42 : availableWidth - spacing.xl * 2,
      landscape ? height - insets.top - insets.bottom - 100 : height * 0.44,
      416,
    ),
  );
  const x = useSharedValue(0);
  const skipPending = useSharedValue(false);
  const pending = useRef(false);

  async function changeTrack(next: 'next' | 'previous') {
    if (pending.current || !playerReady || queueUpdating || covered) {
      if (!pending.current) {
        skipPending.value = false;
        x.value = withTiming(0, {
          duration: playerMotion.settle,
          reduceMotion: ReduceMotion.System,
        });
      }
      return;
    }
    pending.current = true;
    try {
      await skipTrack(next);
    } finally {
      pending.current = false;
      skipPending.value = false;
      if (x.value !== 0) {
        x.value = withTiming(0, {
          duration: playerMotion.settle,
          reduceMotion: ReduceMotion.System,
        });
      }
    }
  }

  const settleDuration = playerMotion.settle;
  const swipe = Gesture.Pan()
    .enabled(playerReady && !covered && !queueUpdating)
    .activeOffsetX([-10, 10])
    .failOffsetY([-15, 15])
    .onUpdate(event => {
      if (!skipPending.value) {
        x.value = clamp(event.translationX, -coverSize * 0.6, coverSize * 0.6);
      }
    })
    .onFinalize((event, success) => {
      if (skipPending.value) return;
      if (
        success &&
        acceptsSwipe(event.translationX, event.velocityX, coverSize * 0.24)
      ) {
        skipPending.value = true;
        scheduleOnRN(changeTrack, event.translationX < 0 ? 'next' : 'previous');
      } else {
        x.value = withTiming(0, {
          duration: settleDuration,
          reduceMotion: ReduceMotion.System,
        });
      }
    });
  const artworkStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));

  if (!track) return null;

  const favorite = favoriteIds.has(track.id);
  const RepeatIcon = repeatMode === RepeatMode.Track ? Repeat1 : Repeat;
  const repeatLabel =
    repeatMode === RepeatMode.Off
      ? 'Activar repetir canción'
      : repeatMode === RepeatMode.Track
      ? 'Activar repetir cola'
      : 'Desactivar repetición';

  return (
    <View style={styles.player}>
      <PlayerScene
        active={isPlaying && playerExpanded && !covered}
        artwork={track.artwork}
        palette={palette}
      />
      <View
        style={[
          styles.top,
          {
            paddingTop: insets.top,
            paddingLeft: insets.left + spacing.xs,
            paddingRight: insets.right + spacing.xs,
          },
        ]}
      >
        <IconButton
          accessibilityHint="También puedes deslizar el encabezado hacia abajo"
          label="Cerrar reproductor"
          onPress={onClose}
        >
          <ChevronDown color={colors.text} size={26} />
        </IconButton>
        <GestureDetector gesture={headerGesture}>
          <View collapsable={false} style={styles.source}>
            <Text numberOfLines={1} style={type.secondary}>
              Desde {playbackSourceLabel}
            </Text>
          </View>
        </GestureDetector>
        <IconButton
          label={`Más acciones para ${track.title}`}
          onPress={() => setQueueTrackDialog({ track, fromLibrary: true })}
        >
          <MoreVertical color={colors.text} size={23} />
        </IconButton>
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          landscape && styles.landscapeScroll,
          {
            paddingBottom: insets.bottom + (landscape ? spacing.xs : spacing.lg),
            paddingLeft: insets.left + spacing.lg,
            paddingRight: insets.right + spacing.lg,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.body, landscape && styles.landscape]}>
          <GestureDetector gesture={swipe}>
            <View
              collapsable={false}
              accessibilityHint="Desliza a los lados para cambiar de canción"
              style={[styles.artworkStage, landscape && styles.landscapeStage]}
            >
              <Animated.View style={artworkStyle}>
                <Cover size={coverSize} uri={track.artwork} />
              </Animated.View>
            </View>
          </GestureDetector>
          <View
            style={[styles.controls, landscape && styles.landscapeControls]}
          >
            <View style={styles.metadata}>
              <View style={styles.trackText}>
                <Text
                  accessibilityRole="header"
                  numberOfLines={2}
                  style={[type.display, landscape && styles.landscapeTitle]}
                >
                  {track.title}
                </Text>
                <Text numberOfLines={2} style={type.secondary}>
                  {track.artist}
                </Text>
              </View>
              <IconButton
                accessibilityState={{ selected: favorite }}
                label={favorite ? 'Quitar de favoritas' : 'Añadir a favoritas'}
                onPress={() => toggleFavorite(track)}
              >
                <Heart
                  color={favorite ? colors.accent : colors.text}
                  fill={favorite ? colors.accent : 'none'}
                  size={25}
                />
              </IconButton>
            </View>

            <PlayerSeekBar
              key={track.id}
              disabled={!playerReady}
              onSeek={seekToPosition}
            />

            <View
              style={[
                styles.transport,
                landscape && styles.landscapeTransport,
                availableWidth < 288 && styles.compactTransport,
              ]}
            >
              <IconButton
                accessibilityState={{ selected: shuffleEnabled }}
                disabled={!playerReady || queueUpdating}
                label={shuffleEnabled ? 'Desactivar mezcla' : 'Activar mezcla'}
                onPress={toggleShuffle}
              >
                <Shuffle
                  color={shuffleEnabled ? colors.accent : colors.text}
                  size={23}
                />
              </IconButton>
              <IconButton
                disabled={!playerReady || queueUpdating}
                label="Canción anterior"
                onPress={() => changeTrack('previous')}
              >
                <SkipBack color={colors.text} fill={colors.text} size={26} />
              </IconButton>
              <Tap
                accessibilityRole="button"
                accessibilityLabel={isPlaying ? 'Pausar' : 'Reproducir'}
                disabled={!playerReady}
                onPress={togglePlayback}
                style={[styles.play, landscape && styles.landscapePlay]}
              >
                <PlayPauseIcon
                  color={colors.onControl}
                  isPlaying={isPlaying}
                  size={29}
                />
              </Tap>
              <IconButton
                disabled={!playerReady || queueUpdating}
                label="Siguiente canción"
                onPress={() => changeTrack('next')}
              >
                <SkipForward color={colors.text} fill={colors.text} size={26} />
              </IconButton>
              <IconButton
                accessibilityState={{ selected: repeatMode !== RepeatMode.Off }}
                disabled={!playerReady}
                label={repeatLabel}
                onPress={cycleRepeatMode}
              >
                <RepeatIcon
                  color={
                    repeatMode === RepeatMode.Off ? colors.text : colors.accent
                  }
                  size={23}
                />
              </IconButton>
            </View>

            <View style={styles.tools}>
              <Tool
                wrap={toolsWrap}
                caption={`Cola · ${playbackQueue.length}`}
                icon={ListMusic}
                label={`Abrir cola de reproducción con ${playbackQueue.length} canciones`}
                onPress={() => setQueueVisible(true)}
              />
              <Tool
                wrap={toolsWrap}
                caption="Letras"
                icon={Captions}
                label={`Abrir letras sincronizadas de ${track.title}`}
                onPress={() => setPlayerSheet('lyrics')}
              />
              <TimerTool
                wrap={toolsWrap}
                onPress={() => setPlayerSheet('sleep')}
              />
              <Tool
                wrap={toolsWrap}
                active={playbackRate !== 1}
                caption={playbackRate === 1 ? 'Velocidad' : `${playbackRate}×`}
                icon={Gauge}
                label={`Velocidad de reproducción ${playbackRate}×`}
                onPress={() => setPlayerSheet('speed')}
              />
              <Tool
                wrap={toolsWrap}
                active={equalizerSettings.enabled}
                caption="EQ"
                icon={SlidersHorizontal}
                label="Abrir ecualizador"
                onPress={() => setPlayerSheet('equalizer')}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const useStyles = createStyles(colors => ({
  player: { flex: 1, overflow: 'hidden' },
  top: { minHeight: 48, flexDirection: 'row', alignItems: 'center' },
  source: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingTop: spacing.md },
  landscapeScroll: { paddingTop: spacing.xs },
  body: { alignSelf: 'center', width: '100%', maxWidth: 990, gap: spacing.xl },
  landscape: { flexDirection: 'row', alignItems: 'center' },
  artworkStage: { alignItems: 'center', overflow: 'hidden' },
  landscapeStage: { flex: 1 },
  controls: { gap: spacing.sm, width: '100%' },
  landscapeControls: { width: '50%', flexShrink: 1, gap: spacing.xs },
  landscapeTitle: { fontSize: 23, lineHeight: 27 },
  metadata: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  trackText: { flex: 1, minWidth: 0, gap: spacing.xs },
  transport: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  landscapeTransport: { paddingVertical: spacing.xs },
  compactTransport: { flexWrap: 'wrap', justifyContent: 'center', rowGap: spacing.sm },
  play: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    width: 64,
    height: 64,
    backgroundColor: colors.control,
  },
  landscapePlay: { width: 52, height: 52 },
  tools: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  tool: {
    flex: 1,
    minWidth: 48,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: 2,
  },
  toolWrapped: { flexGrow: 0, flexBasis: '33.33%' },
  toolCaption: { textAlign: 'center' },
  activeTool: { color: colors.accent },
}));
