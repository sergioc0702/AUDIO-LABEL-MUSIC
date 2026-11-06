import { useMemo, useRef } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View } from 'react-native';
import { SkipForward } from 'lucide-react-native';
import { useApp } from '../state/AppContext';
import { colors, radius, spacing, type } from '../theme/theme';
import { IconButton } from '../ui/Buttons';
import { Cover } from '../ui/Cover';
import { Tap } from '../ui/Tap';
import { PlayPauseIcon } from './PlayPauseIcon';
import { MiniProgress } from './controls';

const swipeDistance = 72;

export function MiniPlayer() {
  const { music } = useApp();
  const {
    currentTrack,
    isPlaying,
    setPlayerExpanded,
    rememberPlaybackPosition,
    skipTrack,
    togglePlayback,
  } = music;
  const dragX = useRef(new Animated.Value(0)).current;
  const actions = useRef({ setPlayerExpanded, skipTrack });
  actions.current = { setPlayerExpanded, skipTrack };

  const gestures = useMemo(() => {
    const settle = () =>
      Animated.spring(dragX, {
        toValue: 0,
        speed: 22,
        bounciness: 0,
        useNativeDriver: true,
      }).start();

    return PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, gesture) =>
        Math.abs(gesture.dx) > 14 || gesture.dy < -14,
      onPanResponderMove: (_, gesture) => {
        if (Math.abs(gesture.dx) > Math.abs(gesture.dy)) {
          dragX.setValue(gesture.dx * 0.6);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        const horizontal = Math.abs(gesture.dx) > Math.abs(gesture.dy);
        if (!horizontal && gesture.dy < -40) {
          actions.current.setPlayerExpanded(true);
        } else if (horizontal && Math.abs(gesture.dx) > swipeDistance) {
          actions.current.skipTrack(gesture.dx < 0 ? 'next' : 'previous');
        }
        settle();
      },
      onPanResponderTerminate: settle,
    });
  }, [dragX]);

  if (!currentTrack) {
    return null;
  }

  return (
    <View {...gestures.panHandlers} style={styles.player}>
      <View style={styles.row}>
        <Tap
          accessibilityRole="button"
          accessibilityLabel={`Abrir reproductor: ${currentTrack.title} de ${currentTrack.artist}`}
          accessibilityHint="Desliza a los lados para cambiar de canción"
          onPress={() => setPlayerExpanded(true)}
          pressedScale={1}
          style={styles.info}
        >
          <Animated.View
            style={[styles.infoContent, { transform: [{ translateX: dragX }] }]}
          >
            <Cover size={44} uri={currentTrack.artwork} />
            <View style={styles.text}>
              <Text numberOfLines={1} style={type.bodyStrong}>
                {currentTrack.title}
              </Text>
              <Text numberOfLines={1} style={type.caption}>
                {currentTrack.artist}
              </Text>
            </View>
          </Animated.View>
        </Tap>
        <IconButton
          label={isPlaying ? 'Pausar' : 'Reproducir'}
          onPress={togglePlayback}
        >
          <PlayPauseIcon color={colors.text} isPlaying={isPlaying} size={24} />
        </IconButton>
        <IconButton label="Siguiente canción" onPress={() => skipTrack('next')}>
          <SkipForward color={colors.text} fill={colors.text} size={24} />
        </IconButton>
      </View>
      <MiniProgress
        duration={currentTrack.duration}
        onPositionChange={rememberPlaybackPosition}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  player: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.md,
    marginHorizontal: spacing.sm,
    overflow: 'hidden',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 60,
    paddingLeft: spacing.sm,
  },
  info: { flex: 1, minWidth: 0 },
  infoContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  text: { flex: 1, minWidth: 0 },
});
