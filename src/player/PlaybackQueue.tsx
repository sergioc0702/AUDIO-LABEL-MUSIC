import { memo, useRef, useState } from 'react';
import { FlatList, Text, useWindowDimensions, View } from 'react-native';
import { GripVertical, Minus, Music2 } from 'lucide-react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { createStyles, spacing, useColors } from '../theme/theme';
import type { Track } from '../types/Track';
import { IconButton } from '../ui/Buttons';
import { Cover } from '../ui/Cover';
import { Tap } from '../ui/Tap';
import { clamp } from './playerMotion';

const handleWidth = 48;

function QueueSong({
  track,
  active = false,
}: {
  track: Track;
  active?: boolean;
}) {
  const { colors, type } = useColors();
  const styles = useStyles();
  return (
    <>
      <Cover size={42} uri={track.artwork} />
      <View style={styles.details}>
        <Text
          numberOfLines={1}
          style={[type.bodyStrong, active && styles.current]}
        >
          {track.title}
        </Text>
        <Text numberOfLines={1} style={type.caption}>
          {track.artist}
        </Text>
      </View>
      {active ? <Music2 color={colors.accent} size={18} /> : null}
    </>
  );
}

const QueueRow = memo(function QueueRowContent({
  track,
  index,
  count,
  rowHeight,
  active,
  disabled,
  from,
  onMove,
  onPlay,
  onRemove,
}: {
  track: Track;
  index: number;
  count: number;
  rowHeight: number;
  active: boolean;
  disabled: boolean;
  from: SharedValue<number>;
  onMove: (from: number, to: number) => Promise<void>;
  onPlay: (index: number) => void;
  onRemove: (track: Track, index: number) => void;
}) {
  const { colors } = useColors();
  const styles = useStyles();
  const sourceStyle = useAnimatedStyle(() => ({
    opacity: from.value === index ? 0.3 : 1,
  }));
  return (
    <Animated.View style={[styles.row, { height: rowHeight }, sourceStyle]}>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`Arrastrar ${track.title} para reordenar`}
        accessibilityHint="Desliza arriba o abajo para cambiar su posición"
        accessibilityState={{ disabled }}
        accessibilityValue={{ min: 1, now: index + 1, max: count }}
        accessibilityActions={[
          { name: 'increment', label: 'Mover hacia arriba' },
          { name: 'decrement', label: 'Mover hacia abajo' },
        ]}
        onAccessibilityAction={event => {
          const step = event.nativeEvent.actionName === 'increment' ? -1 : 1;
          const to = index + step;
          if (!disabled && to >= 0 && to < count) onMove(index, to);
        }}
        style={styles.handle}
      >
        <GripVertical color={colors.textSecondary} size={20} />
      </View>
      <Tap
        accessibilityRole="button"
        accessibilityLabel={`${active ? 'Reproduciendo' : 'Reproducir'} ${
          track.title
        } de ${track.artist}`}
        disabled={disabled}
        onPress={() => onPlay(index)}
        style={styles.song}
      >
        <QueueSong active={active} track={track} />
      </Tap>
      <IconButton
        disabled={disabled}
        label={`Quitar ${track.title} de la cola`}
        onPress={() => onRemove(track, index)}
      >
        <Minus color={colors.textSecondary} size={22} />
      </IconButton>
    </Animated.View>
  );
});

export function PlaybackQueue({
  tracks,
  currentId,
  disabled,
  onMove,
  onPlay,
  onRemove,
}: {
  tracks: Track[];
  currentId?: string;
  disabled: boolean;
  onMove: (from: number, to: number) => Promise<void>;
  onPlay: (index: number) => void;
  onRemove: (track: Track, index: number) => void;
}) {
  const { type } = useColors();
  const styles = useStyles();
  const { fontScale } = useWindowDimensions();
  const rowHeight = Math.max(64, Math.ceil(fontScale * 39 + 16));
  const count = tracks.length;
  const ref = useAnimatedRef<FlatList<Track>>();
  const scrollOffset = useSharedValue(0);
  const viewport = useSharedValue(0);
  const finger = useSharedValue(0);
  const grip = useSharedValue(0);
  const from = useSharedValue(-1);
  const destination = useSharedValue(-1);
  const [dragged, setDragged] = useState<Track | null>(null);
  const liveQueue = useRef(tracks);
  liveQueue.current = tracks;

  const autoScroll = useFrameCallback(frame => {
    if (from.value < 0 || viewport.value <= 0) return;
    const edge = Math.min(66, viewport.value / 3);
    const strength =
      finger.value < edge
        ? -clamp((edge - finger.value) / edge, 0, 1)
        : clamp((finger.value - viewport.value + edge) / edge, 0, 1);
    if (strength === 0) return;
    const max = Math.max(0, count * rowHeight - viewport.value);
    const next = clamp(
      scrollOffset.value +
        strength * 0.72 * Math.min(frame.timeSincePreviousFrame ?? 16, 25),
      0,
      max,
    );
    if (next !== scrollOffset.value) {
      scrollOffset.value = next;
      scrollTo(ref, 0, next, false);
      destination.value = clamp(
        Math.floor((finger.value + next) / rowHeight),
        0,
        count - 1,
      );
    }
  }, false);

  function begin(index: number) {
    setDragged(tracks[index] ?? null);
    autoScroll.setActive(true);
  }

  function end(source: number, target: number) {
    autoScroll.setActive(false);
    setDragged(null);
    if (
      source >= 0 &&
      target >= 0 &&
      source !== target &&
      liveQueue.current === tracks
    ) {
      onMove(source, target);
    }
  }

  const drag = Gesture.Pan()
    .enabled(!disabled && count > 1)
    .activeOffsetY([-5, 5])
    .onStart(event => {
      const start = event.y - event.translationY + scrollOffset.value;
      const index = Math.floor(start / rowHeight);
      if (index < 0 || index >= count) return;
      from.value = index;
      destination.value = index;
      grip.value = start - index * rowHeight;
      finger.value = event.y;
      scrollTo(ref, 0, scrollOffset.value, false);
      scheduleOnRN(begin, index);
    })
    .onUpdate(event => {
      if (from.value < 0) return;
      finger.value = event.y;
      destination.value = clamp(
        Math.floor((event.y + scrollOffset.value) / rowHeight),
        0,
        count - 1,
      );
    })
    .onFinalize((_event, success) => {
      if (from.value < 0) return;
      const source = from.value;
      const target = success ? destination.value : -1;
      from.value = -1;
      destination.value = -1;
      scheduleOnRN(end, source, target);
    });
  const onScroll = useAnimatedScrollHandler(event => {
    if (from.value < 0) scrollOffset.value = event.contentOffset.y;
  });
  const floatingStyle = useAnimatedStyle(() => ({
    opacity: from.value >= 0 ? 1 : 0,
    transform: [
      {
        translateY: clamp(
          finger.value - grip.value,
          0,
          Math.max(0, viewport.value - rowHeight),
        ),
      },
    ],
  }));
  const markerStyle = useAnimatedStyle(() => {
    const source = from.value;
    const target = destination.value;
    if (source < 0 || target < 0 || source === target) return { opacity: 0 };
    const edge = target * rowHeight + (source < target ? rowHeight - 2 : 0);
    return {
      opacity: 1,
      transform: [{ translateY: edge - scrollOffset.value }],
    };
  });

  return (
    <View
      onLayout={event => {
        viewport.value = event.nativeEvent.layout.height;
      }}
      style={styles.viewport}
    >
      <Animated.FlatList
        ref={ref}
        data={tracks}
        keyExtractor={item => item.id}
        getItemLayout={(_data, index) => ({
          length: rowHeight,
          offset: rowHeight * index,
          index,
        })}
        initialNumToRender={12}
        maxToRenderPerBatch={8}
        windowSize={7}
        onScroll={onScroll}
        scrollEventThrottle={16}
        scrollEnabled={!dragged}
        ListEmptyComponent={
          <Text style={[type.secondary, styles.empty]}>
            No hay canciones en la cola.
          </Text>
        }
        renderItem={({ item, index }) => (
          <QueueRow
            track={item}
            index={index}
            count={count}
            rowHeight={rowHeight}
            active={item.id === currentId}
            disabled={disabled || Boolean(dragged)}
            from={from}
            onMove={onMove}
            onPlay={onPlay}
            onRemove={onRemove}
          />
        )}
      />
      {dragged ? (
        <>
          <Animated.View
            pointerEvents="none"
            style={[styles.marker, markerStyle]}
          />
          <Animated.View
            pointerEvents="none"
            importantForAccessibility="no-hide-descendants"
            style={[styles.floating, { height: rowHeight }, floatingStyle]}
          >
            <QueueSong active={dragged.id === currentId} track={dragged} />
          </Animated.View>
        </>
      ) : null}
      {count > 1 && !disabled ? (
        <GestureDetector gesture={drag}>
          <View
            collapsable={false}
            importantForAccessibility="no"
            style={styles.gestureRail}
          />
        </GestureDetector>
      ) : null}
    </View>
  );
}

const useStyles = createStyles(colors => ({
  viewport: { flex: 1, minHeight: 0, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingRight: spacing.xs },
  song: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  details: { flex: 1, minWidth: 0, gap: 2 },
  current: { color: colors.accent },
  handle: {
    width: handleWidth,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marker: {
    position: 'absolute',
    height: 2,
    left: spacing.md,
    right: spacing.md,
    top: 0,
    backgroundColor: colors.accent,
  },
  gestureRail: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    top: 0,
    width: handleWidth,
  },
  floating: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    top: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surfaceHigh,
    borderRadius: colors.design.radius.md,
  },
  empty: { padding: spacing.xl, textAlign: 'center' },
}));
