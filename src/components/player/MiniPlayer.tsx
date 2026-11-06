import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  PanResponder,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SkipForward } from 'lucide-react-native';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import type { createStyles } from '../../theme/createStyles';
import { motionDuration, motionEasing } from '../../theme/motion';
import type { AppDesignTokens } from '../../theme/tokens';
import type { Track } from '../../types/Track';
import { Artwork } from '../library/LibraryComponents';
import { PressableScale } from '../motion/PressableScale';
import { MiniPlayerProgress } from './PlaybackProgress';
import { PlayPauseIcon } from './PlayPauseIcon';

const swipeDistance = 72;

export function MiniPlayer({
  colors,
  styles,
  track,
  isPlaying,
  onOpen,
  onPositionChange,
  onSkip,
  onTogglePlayback,
}: {
  colors: AppDesignTokens['colors'];
  styles: ReturnType<typeof createStyles>;
  track: Track;
  isPlaying: boolean;
  onOpen: () => void;
  onPositionChange: (position: number) => void;
  onSkip: (direction: 'next' | 'previous') => void;
  onTogglePlayback: () => void;
}) {
  const { width } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const entrance = useRef(new Animated.Value(0)).current;
  const dragX = useRef(new Animated.Value(0)).current;
  const content = useRef(new Animated.Value(1)).current;
  const pendingDirection = useRef(0);
  const previousTrackId = useRef(track.id);
  const actions = useRef({ onOpen, onSkip });
  actions.current = { onOpen, onSkip };

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: reducedMotion ? 0 : motionDuration.enter,
      easing: motionEasing.enter,
      useNativeDriver: true,
    }).start();
  }, [entrance, reducedMotion]);

  useEffect(() => {
    if (previousTrackId.current === track.id) {
      return;
    }
    previousTrackId.current = track.id;
    const direction = pendingDirection.current;
    pendingDirection.current = 0;
    if (reducedMotion) {
      dragX.setValue(0);
      return;
    }
    dragX.setValue(direction * width * 0.35);
    content.setValue(0);
    Animated.parallel([
      Animated.timing(dragX, {
        toValue: 0,
        duration: motionDuration.enter,
        easing: motionEasing.enter,
        useNativeDriver: true,
      }),
      Animated.timing(content, {
        toValue: 1,
        duration: motionDuration.state,
        useNativeDriver: true,
      }),
    ]).start();
  }, [content, dragX, reducedMotion, track.id, width]);

  const gestures = useMemo(() => {
    const settle = () =>
      Animated.spring(dragX, {
        toValue: 0,
        speed: 22,
        bounciness: 4,
        useNativeDriver: true,
      }).start();

    return PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, gesture) =>
        Math.abs(gesture.dx) > 14 || gesture.dy < -14,
      onPanResponderMove: (_, gesture) => {
        if (Math.abs(gesture.dx) > Math.abs(gesture.dy)) {
          dragX.setValue(gesture.dx);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        const horizontal = Math.abs(gesture.dx) > Math.abs(gesture.dy);
        if (!horizontal && gesture.dy < -40) {
          settle();
          actions.current.onOpen();
        } else if (horizontal && Math.abs(gesture.dx) > swipeDistance) {
          const direction = gesture.dx < 0 ? 1 : -1;
          pendingDirection.current = direction;
          actions.current.onSkip(direction > 0 ? 'next' : 'previous');
          settle();
        } else {
          settle();
        }
      },
      onPanResponderTerminate: settle,
    });
  }, [dragX]);

  return (
    <Animated.View
      {...gestures.panHandlers}
      style={[
        styles.miniPlayer,
        {
          opacity: entrance,
          transform: [
            {
              translateY: entrance.interpolate({
                inputRange: [0, 1],
                outputRange: [28, 0],
              }),
            },
          ],
        },
      ]}
    >
      <MiniPlayerProgress
        duration={track.duration}
        onPositionChange={onPositionChange}
      />
      <View style={styles.miniPlayerRow}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`Abrir reproductor: ${track.title} de ${track.artist}`}
          accessibilityHint="Desliza a los lados para cambiar de canción"
          android_ripple={{ color: colors.ripple }}
          onPress={onOpen}
          pressedScale={0.98}
          style={styles.miniTrackInfo}
        >
          <Animated.View
            style={[
              styles.miniTrackContent,
              {
                opacity: content,
                transform: [
                  {
                    translateX: dragX.interpolate({
                      inputRange: [-width, width],
                      outputRange: [-width * 0.6, width * 0.6],
                    }),
                  },
                ],
              },
            ]}
          >
            <Artwork uri={track.artwork} size={44} />
            <View style={styles.nowPlayingDetails}>
              <Text numberOfLines={1} style={styles.nowPlayingTitle}>
                {track.title}
              </Text>
              <Text numberOfLines={1} style={styles.trackSubtitle}>
                {track.artist}
              </Text>
            </View>
          </Animated.View>
        </PressableScale>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Pausar' : 'Reproducir'}
          onPress={onTogglePlayback}
          pressedScale={0.88}
          style={styles.playButton}
        >
          <PlayPauseIcon
            color={colors.onAccent}
            isPlaying={isPlaying}
            size={20}
          />
        </PressableScale>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Siguiente canción"
          onPress={() => {
            pendingDirection.current = 1;
            onSkip('next');
          }}
          pressedScale={0.88}
          style={styles.miniNextButton}
        >
          <SkipForward color={colors.text} size={22} />
        </PressableScale>
      </View>
    </Animated.View>
  );
}
