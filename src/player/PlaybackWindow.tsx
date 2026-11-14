import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useApp } from '../state/AppContext';
import { createStyles, spacing, useColors } from '../theme/theme';
import { IconButton } from '../ui/Buttons';
import { Snackbar } from '../ui/Snackbar';
import { ThemedPlayer } from './ThemedPlayer';
import { acceptsSwipe, playerMotion } from './playerMotion';
import {
  EqualizerSheet,
  LyricsSheet,
  QueueSheet,
  SleepTimerSheet,
  SpeedSheet,
} from './Sheets';

const panels = {
  queue: { content: QueueSheet, close: 'Cerrar cola', tall: true },
  lyrics: { content: LyricsSheet, close: 'Cerrar letras', tall: true },
  sleep: {
    content: SleepTimerSheet,
    close: 'Cerrar temporizador',
    tall: false,
  },
  speed: { content: SpeedSheet, close: 'Cerrar velocidad', tall: false },
  equalizer: {
    content: EqualizerSheet,
    close: 'Cerrar ecualizador',
    tall: false,
  },
} as const;

function useSlide<T extends string>(
  requested: T | null,
  ready: boolean,
  reducedMotion: boolean,
) {
  const [retained, setRetained] = useState<T | null>(null);
  const request = useRef(requested);
  request.current = requested;
  const progress = useSharedValue(0);
  const dragY = useSharedValue(0);

  useEffect(() => {
    function release() {
      if (request.current === null) setRetained(null);
    }
    if (requested !== null) {
      setRetained(requested);
      dragY.value = 0;
    }
    if (!ready || reducedMotion) {
      progress.value = ready && requested !== null ? 1 : 0;
      if (requested === null) release();
      return;
    }
    progress.value = withTiming(
      requested !== null ? 1 : 0,
      {
        duration: requested !== null ? playerMotion.enter : playerMotion.exit,
        easing:
          requested !== null ? playerMotion.entrance : playerMotion.departure,
        reduceMotion: ReduceMotion.System,
      },
      finished => {
        if (finished && requested === null) scheduleOnRN(release);
      },
    );
    return () => cancelAnimation(progress);
  }, [dragY, progress, ready, reducedMotion, requested]);

  return { presented: requested ?? retained, progress, dragY };
}

export function PlaybackWindow() {
  const { music, playerSheet, setPlayerSheet, playlistTarget } = useApp();
  const {
    currentTrack,
    playerExpanded,
    queueVisible,
    setPlayerExpanded,
    setQueueVisible,
  } = music;
  const { colors } = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const [ready, setReady] = useState(false);
  const selected = queueVisible
    ? 'queue'
    : playerSheet && playerSheet in panels
    ? (playerSheet as keyof typeof panels)
    : null;
  const open = Boolean(playerExpanded && currentTrack);
  const player = useSlide(open ? 'player' : null, ready, reducedMotion);
  const panel = useSlide(selected, ready, reducedMotion);
  const { dragY: playerDrag, progress: playerProgress } = player;
  const { dragY: panelDrag, progress: panelProgress } = panel;
  const visible = Boolean(player.presented || panel.presented);
  const closePlayer = () => setPlayerExpanded(false);
  const closePanel = () => {
    if (selected === 'queue') setQueueVisible(false);
    else setPlayerSheet(null);
  };
  const dismiss = () => {
    if (selected) closePanel();
    else if (open) closePlayer();
  };

  useEffect(() => {
    if (!visible) setReady(false);
  }, [visible]);

  const dragPlayer = Gesture.Pan()
    .enabled(open && !panel.presented)
    .activeOffsetY(8)
    .failOffsetX([-16, 16])
    .onUpdate(event => {
      playerDrag.value = Math.max(0, event.translationY);
    })
    .onFinalize((event, success) => {
      if (
        success &&
        event.translationY > 0 &&
        acceptsSwipe(
          event.translationY,
          event.velocityY,
          Math.min(150, height * 0.22),
        )
      ) {
        scheduleOnRN(closePlayer);
      } else {
        playerDrag.value = withTiming(0, {
          duration: playerMotion.settle,
          reduceMotion: ReduceMotion.System,
        });
      }
    });
  const dragPanel = Gesture.Pan()
    .enabled(Boolean(selected))
    .activeOffsetY(8)
    .failOffsetX([-16, 16])
    .onUpdate(event => {
      panelDrag.value = Math.max(0, event.translationY);
    })
    .onFinalize((event, success) => {
      if (
        success &&
        event.translationY > 0 &&
        acceptsSwipe(event.translationY, event.velocityY, 104)
      ) {
        scheduleOnRN(closePanel);
      } else {
        panelDrag.value = withTiming(0, {
          duration: playerMotion.settle,
          reduceMotion: ReduceMotion.System,
        });
      }
    });
  const playerStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY:
          (1 - playerProgress.value) * height +
          playerDrag.value * playerProgress.value,
      },
    ],
  }));
  const panelStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY:
          (1 - panelProgress.value) * height +
          panelDrag.value * panelProgress.value,
      },
    ],
  }));
  const veil = useAnimatedStyle(() => ({ opacity: panelProgress.value }));
  const shownPanel = panel.presented ? panels[panel.presented] : null;
  const Panel = shownPanel?.content;

  if (!visible) return null;

  return (
    <Modal
      animationType="none"
      navigationBarTranslucent
      onRequestClose={dismiss}
      onShow={() => setReady(true)}
      statusBarTranslucent
      transparent
      visible
    >
      <GestureHandlerRootView style={styles.window}>
        {player.presented && currentTrack ? (
          <Animated.View
            importantForAccessibility={
              panel.presented ? 'no-hide-descendants' : 'auto'
            }
            pointerEvents={open && !panel.presented ? 'auto' : 'none'}
            style={[styles.player, playerStyle]}
          >
            <ThemedPlayer
              covered={Boolean(
                panel.presented ||
                  music.queueTrackDialog ||
                  playlistTarget ||
                  music.playlistNameDialog,
              )}
              headerGesture={dragPlayer}
              onClose={closePlayer}
            />
            <Snackbar bottom={insets.bottom + spacing.sm} placement="player" />
          </Animated.View>
        ) : null}
        {shownPanel && Panel ? (
          <View
            style={StyleSheet.absoluteFill}
            pointerEvents={selected ? 'auto' : 'none'}
          >
            <Animated.View style={[styles.veil, veil]}>
              <Pressable
                accessible={false}
                onPress={closePanel}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
            <Animated.View
              accessibilityViewIsModal
              style={[
                styles.panel,
                {
                  width: Math.min(width, 620),
                  maxHeight: height - insets.top - spacing.sm,
                  paddingBottom: insets.bottom + spacing.sm,
                },
                shownPanel.tall && { height: height * 0.84 },
                panelStyle,
              ]}
            >
              <View style={styles.panelTop}>
                <GestureDetector gesture={dragPanel}>
                  <View collapsable={false} style={styles.gripArea}>
                    <View style={styles.grip} />
                  </View>
                </GestureDetector>
                <IconButton label={shownPanel.close} onPress={closePanel}>
                  <X color={colors.text} size={22} />
                </IconButton>
              </View>
              <Panel />
            </Animated.View>
          </View>
        ) : null}
      </GestureHandlerRootView>
    </Modal>
  );
}

const useStyles = createStyles(colors => ({
  window: { flex: 1 },
  player: { ...StyleSheet.absoluteFill, backgroundColor: colors.background },
  veil: { ...StyleSheet.absoluteFill, backgroundColor: colors.scrim },
  panel: {
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderTopLeftRadius: colors.design.radius.sheet,
    borderTopRightRadius: colors.design.radius.sheet,
    overflow: 'hidden',
  },
  panelTop: {
    flexDirection: 'row',
    paddingLeft: 48 + spacing.sm,
    paddingRight: spacing.sm,
    alignItems: 'center',
  },
  gripArea: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grip: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.outline,
  },
}));
