import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, Text, View } from 'react-native';
import { GripVertical, Minus, Music2 } from 'lucide-react-native';
import { useProgress } from 'react-native-track-player';
import { radius, spacing, createStyles, useColors } from '../theme/theme';
import { queueAutoScrollStep } from '../utils/queueDrag';
import type { Track } from '../types/Track';
import { Cover } from '../ui/Cover';
import { formatTime } from '../utils/formatTime';

export const queueRowHeight = 60;

export function ProgressSlider({
  duration,
  position,
  onSeek,
  disabled,
}: {
  duration: number;
  position: number;
  onSeek: (position: number) => Promise<void>;
  disabled: boolean;
}) {
  const { colors } = useColors();
  const styles = useStyles();
  const [width, setWidth] = useState(0);
  const [previewPosition, setPreviewPosition] = useState<number | null>(null);
  const dragStartX = useRef(0);
  const thumbScale = useRef(new Animated.Value(1)).current;
  const propsRef = useRef({ disabled, duration, onSeek, width });
  propsRef.current = { disabled, duration, onSeek, width };

  const positionForX = (x: number) => {
    const { duration: trackDuration, width: sliderWidth } = propsRef.current;
    if (sliderWidth <= 0 || trackDuration <= 0) {
      return 0;
    }

    return (
      (Math.max(0, Math.min(sliderWidth, x)) / sliderWidth) * trackDuration
    );
  };

  const seekResponder = useMemo(() => {
    const animateThumb = (toValue: number) =>
      Animated.spring(thumbScale, {
        toValue,
        speed: 30,
        bounciness: 6,
        useNativeDriver: true,
      }).start();

    return PanResponder.create({
      onStartShouldSetPanResponder: () =>
        !propsRef.current.disabled &&
        propsRef.current.duration > 0 &&
        propsRef.current.width > 0,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: event => {
        dragStartX.current = event.nativeEvent.locationX;
        animateThumb(1.6);
        setPreviewPosition(positionForX(dragStartX.current));
      },
      onPanResponderMove: (_, gesture) => {
        setPreviewPosition(positionForX(dragStartX.current + gesture.dx));
      },
      onPanResponderRelease: async (_, gesture) => {
        const targetPosition = positionForX(dragStartX.current + gesture.dx);
        animateThumb(1);
        try {
          await propsRef.current.onSeek(targetPosition);
        } finally {
          setPreviewPosition(null);
        }
      },
      onPanResponderTerminate: () => {
        animateThumb(1);
        setPreviewPosition(null);
      },
      onShouldBlockNativeResponder: () => true,
    });
  }, [thumbScale]);
  const displayedPosition = Math.max(
    0,
    Math.min(duration, previewPosition ?? position),
  );
  const progressRatio = duration > 0 ? displayedPosition / duration : 0;

  return (
    <View style={styles.expandedProgressContainer}>
      <View
        {...seekResponder.panHandlers}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Avanzar en la canción"
        accessibilityHint="Toca o arrastra para elegir la posición de reproducción"
        accessibilityValue={{
          min: 0,
          max: duration,
          now: displayedPosition,
        }}
        accessibilityActions={[
          { name: 'increment', label: 'Avanzar 10 segundos' },
          { name: 'decrement', label: 'Retroceder 10 segundos' },
        ]}
        onAccessibilityAction={event => {
          if (disabled || duration <= 0) {
            return;
          }
          const offset =
            event.nativeEvent.actionName === 'increment'
              ? 10
              : event.nativeEvent.actionName === 'decrement'
              ? -10
              : 0;
          if (offset !== 0) {
            onSeek(Math.max(0, Math.min(duration, displayedPosition + offset)));
          }
        }}
        onLayout={event => {
          const nextWidth = event.nativeEvent.layout.width;
          propsRef.current.width = nextWidth;
          setWidth(nextWidth);
        }}
        style={[
          styles.expandedProgressTouchArea,
          disabled && styles.queueActionDisabled,
        ]}
      >
        <View
          pointerEvents="none"
          style={[
            styles.expandedProgressTrack,
            { backgroundColor: colors.outline },
          ]}
        >
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: colors.accent,
                width: `${progressRatio * 100}%`,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.progressThumb,
              {
                backgroundColor: colors.accent,
                left: `${progressRatio * 100}%`,
                transform: [{ scale: thumbScale }],
              },
            ]}
          />
          {previewPosition !== null ? (
            <View
              style={[
                styles.progressBubble,
                { left: `${progressRatio * 100}%` },
              ]}
            >
              <Text style={styles.progressBubbleText}>
                {formatTime(displayedPosition)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={styles.expandedTimes}>
        <Text style={[styles.trackSubtitle, { color: colors.textSecondary }]}>
          {formatTime(displayedPosition)}
        </Text>
        <Text style={[styles.trackSubtitle, { color: colors.textSecondary }]}>
          -{formatTime(duration - displayedPosition)}
        </Text>
      </View>
    </View>
  );
}

export function EqualizerBandControl({
  label,
  frequency,
  value,
  enabled,
  onChange,
}: {
  label: string;
  frequency: string;
  value: number;
  enabled: boolean;
  onChange: (value: number) => void;
}) {
  const styles = useStyles();
  const sliderHeight = useRef(144);
  const startY = useRef(0);
  const propsRef = useRef({ onChange, value });
  propsRef.current = { onChange, value };

  const valueForY = (y: number) => {
    const ratio = Math.max(0, Math.min(1, y / sliderHeight.current));
    return Math.max(-12, Math.min(12, Math.round(12 - ratio * 24)));
  };
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: event => {
          startY.current = event.nativeEvent.locationY;
          propsRef.current.onChange(valueForY(startY.current));
        },
        onPanResponderMove: (_, gesture) => {
          propsRef.current.onChange(valueForY(startY.current + gesture.dy));
        },
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
      }),
    [],
  );
  const markerY = ((12 - value) / 24) * sliderHeight.current;
  const centerY = sliderHeight.current / 2;
  const fillTop = Math.min(markerY, centerY);
  const fillHeight = Math.abs(markerY - centerY);

  return (
    <View
      needsOffscreenAlphaCompositing
      style={[styles.equalizerBand, !enabled && styles.equalizerOff]}
    >
      <Text style={styles.equalizerBandFrequency}>{frequency}</Text>
      <View
        {...responder.panHandlers}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`${label}, ${frequency}`}
        accessibilityValue={{
          min: -12,
          max: 12,
          now: value,
          text: `${value > 0 ? '+' : ''}${value} dB`,
        }}
        accessibilityActions={[
          { name: 'increment', label: 'Aumentar un decibel' },
          { name: 'decrement', label: 'Reducir un decibel' },
        ]}
        onAccessibilityAction={event => {
          const direction =
            event.nativeEvent.actionName === 'increment' ? 1 : -1;
          propsRef.current.onChange(
            Math.max(-12, Math.min(12, propsRef.current.value + direction)),
          );
        }}
        onLayout={event => {
          sliderHeight.current = event.nativeEvent.layout.height;
        }}
        style={styles.equalizerSliderTouchArea}
      >
        <View style={styles.equalizerSliderTrack} />
        <View
          style={[
            styles.equalizerSliderFill,
            { height: fillHeight, top: fillTop },
          ]}
        />
        <View
          style={[
            styles.equalizerSliderThumb,
            {
              top: Math.max(
                0,
                Math.min(sliderHeight.current - 16, markerY - 8),
              ),
            },
          ]}
        />
      </View>
      <Text style={styles.equalizerBandValue}>
        {value > 0 ? '+' : ''}
        {value} dB
      </Text>
      <Text style={styles.equalizerBandLabel}>{label}</Text>
    </View>
  );
}

export function QueueTrackRow({
  track,
  index,
  queueLength,
  isCurrent,
  disabled,
  dropTarget,
  getScrollOffset,
  getViewportHeight,
  onPress,
  onMove,
  onAutoScroll,
  onDragStateChange,
  onRemove,
}: {
  track: Track;
  index: number;
  queueLength: number;
  isCurrent: boolean;
  disabled: boolean;
  dropTarget: boolean;
  getScrollOffset: () => number;
  getViewportHeight: () => number;
  onPress: () => void;
  onMove: (fromIndex: number, toIndex: number) => Promise<void>;
  onAutoScroll: (delta: number) => void;
  onDragStateChange: (
    trackId: string | null,
    targetIndex: number | null,
  ) => void;
  onRemove: () => Promise<boolean>;
}) {
  const { colors } = useColors();
  const styles = useStyles();
  const translateY = useRef(new Animated.Value(0)).current;
  const dragScale = useRef(new Animated.Value(1)).current;
  const dragTargetIndex = useRef(index);
  const dragStartIndex = useRef(index);
  const dragStartScrollOffset = useRef(0);
  const dragStartPointerY = useRef(0);
  const dragDy = useRef(0);
  const dragDirectionAnchor = useRef(0);
  const dragDirection = useRef<-1 | 0 | 1>(0);
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const dragReleaseInProgress = useRef(false);
  const suppressTrackPress = useRef(false);
  const suppressTrackPressTimeout = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  useEffect(
    () => () => {
      if (suppressTrackPressTimeout.current) {
        clearTimeout(suppressTrackPressTimeout.current);
      }
      if (autoScrollTimer.current) {
        clearInterval(autoScrollTimer.current);
      }
    },
    [],
  );
  const propsRef = useRef({
    disabled,
    getScrollOffset,
    getViewportHeight,
    index,
    onAutoScroll,
    onDragStateChange,
    onMove,
    onRemove,
    queueLength,
    trackId: track.id,
  });
  propsRef.current = {
    disabled,
    getScrollOffset,
    getViewportHeight,
    index,
    onAutoScroll,
    onDragStateChange,
    onMove,
    onRemove,
    queueLength,
    trackId: track.id,
  };

  const dragResponder = useMemo(() => {
    function dragDistance() {
      return (
        dragDy.current +
        propsRef.current.getScrollOffset() -
        dragStartScrollOffset.current
      );
    }

    function followDrag() {
      const distance = dragDistance();
      translateY.setValue(distance);
      dragTargetIndex.current = Math.max(
        0,
        Math.min(
          dragStartIndex.current + Math.round(distance / queueRowHeight),
          propsRef.current.queueLength - 1,
        ),
      );
      propsRef.current.onDragStateChange(
        propsRef.current.trackId,
        dragTargetIndex.current,
      );
    }

    function stopAutoScroll() {
      if (autoScrollTimer.current) {
        clearInterval(autoScrollTimer.current);
        autoScrollTimer.current = null;
      }
    }

    function startAutoScroll() {
      stopAutoScroll();
      autoScrollTimer.current = setInterval(() => {
        const step = queueAutoScrollStep(
          dragStartPointerY.current + dragDy.current,
          propsRef.current.getViewportHeight(),
          dragDirection.current,
        );
        if (step !== 0) {
          propsRef.current.onAutoScroll(step);
          followDrag();
        }
      }, 16);
    }

    return PanResponder.create({
      onStartShouldSetPanResponder: () =>
        !propsRef.current.disabled && !dragReleaseInProgress.current,
      onPanResponderTerminationRequest: () => false,
      onMoveShouldSetPanResponderCapture: (_, gesture) =>
        !propsRef.current.disabled &&
        !dragReleaseInProgress.current &&
        Math.abs(gesture.dy) > 12 &&
        Math.abs(gesture.dy) > Math.abs(gesture.dx) * 1.2,
      onPanResponderGrant: (_, gesture) => {
        if (suppressTrackPressTimeout.current) {
          clearTimeout(suppressTrackPressTimeout.current);
          suppressTrackPressTimeout.current = null;
        }
        suppressTrackPress.current = true;
        setIsDragging(true);
        dragStartIndex.current = propsRef.current.index;
        dragTargetIndex.current = dragStartIndex.current;
        dragStartScrollOffset.current = propsRef.current.getScrollOffset();
        // Where the finger is inside the list, without measuring the window:
        // the sheet may still be moving, and that would give a wrong position.
        dragStartPointerY.current =
          (dragStartIndex.current + 0.5) * queueRowHeight -
          dragStartScrollOffset.current;
        dragDy.current = gesture.dy;
        dragDirectionAnchor.current = gesture.dy;
        dragDirection.current = 0;
        propsRef.current.onDragStateChange(
          propsRef.current.trackId,
          dragStartIndex.current,
        );
        startAutoScroll();
        translateY.stopAnimation();
        translateY.setValue(0);
        Animated.spring(dragScale, {
          toValue: 1.1,
          speed: 22,
          bounciness: 7,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderMove: (_, gesture) => {
        dragDy.current = gesture.dy;
        const moved = gesture.dy - dragDirectionAnchor.current;
        if (Math.abs(moved) >= 6) {
          dragDirection.current = moved < 0 ? -1 : 1;
          dragDirectionAnchor.current = gesture.dy;
        }
        followDrag();
      },
      onPanResponderRelease: (_, gesture) => {
        stopAutoScroll();
        dragReleaseInProgress.current = true;
        dragDy.current = gesture.dy;
        const offset = Math.round(dragDistance() / queueRowHeight);
        const fromIndex = dragStartIndex.current;
        const toIndex = Math.max(
          0,
          Math.min(fromIndex + offset, propsRef.current.queueLength - 1),
        );
        const snappedOffset = (toIndex - fromIndex) * queueRowHeight;
        Animated.parallel([
          Animated.spring(translateY, {
            toValue: snappedOffset,
            useNativeDriver: true,
            speed: 24,
            bounciness: 0,
          }),
          Animated.spring(dragScale, {
            toValue: 1,
            speed: 20,
            bounciness: 0,
            useNativeDriver: true,
          }),
        ]).start(({ finished }) => {
          if (!finished) {
            dragReleaseInProgress.current = false;
            setIsDragging(false);
            propsRef.current.onDragStateChange(null, null);
            return;
          }

          translateY.setValue(0);
          setIsDragging(false);
          dragReleaseInProgress.current = false;
          propsRef.current.onDragStateChange(null, null);
          if (fromIndex !== toIndex) {
            propsRef.current.onMove(fromIndex, toIndex);
          }
          suppressTrackPressTimeout.current = setTimeout(() => {
            suppressTrackPress.current = false;
            suppressTrackPressTimeout.current = null;
          }, 300);
        });
      },
      onPanResponderTerminate: () => {
        stopAutoScroll();
        setIsDragging(false);
        dragReleaseInProgress.current = false;
        propsRef.current.onDragStateChange(null, null);
        suppressTrackPressTimeout.current = setTimeout(() => {
          suppressTrackPress.current = false;
          suppressTrackPressTimeout.current = null;
        }, 300);
        Animated.parallel([
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }),
          Animated.spring(dragScale, {
            toValue: 1,
            useNativeDriver: true,
          }),
        ]).start();
      },
    });
  }, [dragScale, translateY]);

  return (
    <View
      style={[
        styles.queueRowContainer,
        isDragging && styles.queueRowContainerDragging,
      ]}
    >
      {dropTarget && !isDragging ? (
        <View pointerEvents="none" style={styles.queueDropMarker}>
          <View style={styles.queueDropMarkerDot} />
          <Text style={styles.queueDropMarkerText}>Soltar aquí</Text>
          <View style={styles.queueDropMarkerLine} />
        </View>
      ) : null}
      <Animated.View
        style={[
          styles.queueTrack,
          {
            transform: [{ translateY }, { scale: dragScale }],
          },
          isDragging && styles.queueTrackDragging,
        ]}
      >
        <View
          {...dragResponder.panHandlers}
          accessible
          accessibilityRole="button"
          accessibilityLabel={`Arrastrar ${track.title} para reordenar`}
          accessibilityHint="Mantén y desliza arriba o abajo para cambiar su posición"
          accessibilityActions={[
            { name: 'increment', label: 'Mover hacia arriba' },
            { name: 'decrement', label: 'Mover hacia abajo' },
          ]}
          accessibilityState={{ disabled }}
          onAccessibilityAction={event => {
            if (disabled) {
              return;
            }
            if (event.nativeEvent.actionName === 'increment') {
              onMove(index, Math.max(0, index - 1));
            } else if (event.nativeEvent.actionName === 'decrement') {
              onMove(index, index + 1);
            }
          }}
          style={[
            styles.queueDragHandle,
            disabled && styles.queueActionDisabled,
          ]}
        >
          <GripVertical color={colors.textSecondary} size={20} />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${isCurrent ? 'Reproduciendo' : 'Reproducir'} ${
            track.title
          } de ${track.artist}`}
          onPress={() => {
            if (!suppressTrackPress.current) {
              onPress();
            }
          }}
          style={styles.queueTrackMain}
        >
          <Cover uri={track.artwork} size={44} />
          <View style={styles.trackDetails}>
            <Text
              numberOfLines={1}
              style={[styles.trackTitle, isCurrent && styles.queueCurrentTrack]}
            >
              {track.title}
            </Text>
            <Text numberOfLines={1} style={styles.trackSubtitle}>
              {track.artist}
            </Text>
          </View>
          {isCurrent ? <Music2 color={colors.accent} size={20} /> : null}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Quitar ${track.title} de la cola`}
          accessibilityState={{ disabled }}
          disabled={disabled}
          hitSlop={6}
          onPress={() => {
            propsRef.current.onRemove();
          }}
          style={[
            styles.queueRemoveButton,
            disabled && styles.queueActionDisabled,
          ]}
        >
          <Minus color={colors.textSecondary} size={20} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

export function MiniProgress({
  duration,
  onPositionChange,
}: {
  duration: number;
  onPositionChange: (position: number) => void;
}) {
  const styles = useStyles();
  const { position } = useProgress(1000);

  useEffect(() => {
    onPositionChange(position);
  }, [onPositionChange, position]);

  const progress =
    duration > 0 ? Math.min(100, (position / duration) * 100) : 0;

  return (
    <View style={styles.miniTrack}>
      <View style={[styles.miniFill, { width: `${progress}%` }]} />
    </View>
  );
}

export function PlayerProgress({
  fallbackDuration,
  onSeek,
  disabled,
}: {
  fallbackDuration: number;
  onSeek: (position: number) => Promise<void>;
  disabled: boolean;
}) {
  const progress = useProgress(250);

  return (
    <ProgressSlider
      duration={progress.duration > 0 ? progress.duration : fallbackDuration}
      position={progress.position}
      onSeek={onSeek}
      disabled={disabled}
    />
  );
}

const useStyles = createStyles((colors, typeValues) => ({
  miniTrack: { backgroundColor: colors.outline, height: 2 },
  miniFill: { backgroundColor: colors.text, height: 2 },
  expandedProgressContainer: { width: '100%' },
  expandedProgressTouchArea: { height: 36, justifyContent: 'center' },
  expandedProgressTrack: {
    backgroundColor: colors.outline,
    borderRadius: 2,
    height: 4,
    width: '100%',
  },
  progressFill: {
    backgroundColor: colors.accent,
    borderRadius: 2,
    height: 4,
  },
  progressThumb: {
    backgroundColor: colors.accent,
    borderRadius: 7,
    height: 14,
    marginLeft: -7,
    position: 'absolute',
    top: -5,
    width: 14,
  },
  progressBubble: {
    alignItems: 'center',
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.sm,
    bottom: 16,
    marginLeft: -30,
    paddingVertical: 4,
    position: 'absolute',
    width: 60,
  },
  progressBubbleText: {
    ...typeValues.label,
    fontVariant: ['tabular-nums'],
  },
  expandedTimes: { flexDirection: 'row', justifyContent: 'space-between' },
  trackSubtitle: {
    ...typeValues.caption,
    fontVariant: ['tabular-nums'],
  },
  queueActionDisabled: { opacity: 0.45 },
  equalizerBand: { alignItems: 'center', flex: 1, gap: spacing.xs },
  equalizerOff: { opacity: 0.45 },
  equalizerBandFrequency: typeValues.caption,
  equalizerSliderTouchArea: {
    alignItems: 'center',
    height: 144,
    width: 48,
  },
  equalizerSliderTrack: {
    backgroundColor: colors.outline,
    borderRadius: 2,
    height: '100%',
    width: 4,
  },
  equalizerSliderFill: {
    backgroundColor: colors.text,
    position: 'absolute',
    width: 4,
  },
  equalizerSliderThumb: {
    backgroundColor: colors.text,
    borderRadius: 8,
    height: 16,
    position: 'absolute',
    width: 28,
  },
  equalizerBandValue: typeValues.label,
  equalizerBandLabel: typeValues.caption,
  queueRowContainer: { height: queueRowHeight },
  queueRowContainerDragging: { zIndex: 2 },
  queueDropMarker: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    left: spacing.lg,
    position: 'absolute',
    right: spacing.lg,
    top: -8,
    zIndex: 1,
  },
  queueDropMarkerDot: {
    backgroundColor: colors.accent,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  queueDropMarkerText: typeValues.caption,
  queueDropMarkerLine: { backgroundColor: colors.accent, flex: 1, height: 2 },
  queueTrack: {
    alignItems: 'center',
    flexDirection: 'row',
    height: queueRowHeight,
    paddingRight: spacing.xs,
  },
  queueTrackDragging: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.md,
    elevation: 6,
  },
  queueDragHandle: {
    alignItems: 'center',
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  queueTrackMain: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minWidth: 0,
  },
  trackDetails: { flex: 1, gap: 2, minWidth: 0 },
  trackTitle: typeValues.body,
  queueCurrentTrack: { color: colors.accent, fontWeight: '600' },
  queueRemoveButton: {
    alignItems: 'center',
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
}));
