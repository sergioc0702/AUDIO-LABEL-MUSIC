import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, PanResponder, View } from 'react-native';
import { GripVertical } from 'lucide-react-native';
import { radius, createStyles, useColors } from '../theme/theme';
import { trackRowHeight } from './Rows';

export function ReorderRow({
  children,
  disabled,
  index,
  onMove,
  title,
  trackCount,
}: {
  children: ReactNode;
  disabled: boolean;
  index: number;
  onMove: (fromIndex: number, toIndex: number) => void;
  title: string;
  trackCount: number;
}) {
  const { colors } = useColors();
  const styles = useStyles();
  const translateY = useRef(new Animated.Value(0)).current;
  const startIndex = useRef(index);
  const [isDragging, setIsDragging] = useState(false);
  const propsRef = useRef({ disabled, index, onMove, title, trackCount });
  propsRef.current = { disabled, index, onMove, title, trackCount };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !propsRef.current.disabled,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          startIndex.current = propsRef.current.index;
          setIsDragging(true);
          translateY.setValue(0);
        },
        onPanResponderMove: (_event, gesture) => {
          translateY.setValue(gesture.dy);
        },
        onPanResponderRelease: (_event, gesture) => {
          const nextIndex = Math.max(
            0,
            Math.min(
              startIndex.current + Math.round(gesture.dy / trackRowHeight),
              propsRef.current.trackCount - 1,
            ),
          );
          translateY.setValue(0);
          setIsDragging(false);
          if (nextIndex !== startIndex.current) {
            propsRef.current.onMove(startIndex.current, nextIndex);
          }
        },
        onPanResponderTerminate: () => {
          translateY.setValue(0);
          setIsDragging(false);
        },
      }),
    [translateY],
  );

  return (
    <Animated.View
      style={[
        styles.row,
        isDragging && styles.dragging,
        { transform: [{ translateY }] },
      ]}
    >
      <View
        accessibilityRole="adjustable"
        accessibilityLabel={`Arrastrar ${title} para reordenar`}
        accessibilityHint="Arrastra verticalmente para cambiar la posición"
        accessibilityValue={{
          min: 0,
          max: Math.max(0, trackCount - 1),
          now: index,
        }}
        onAccessibilityAction={event => {
          const direction =
            event.nativeEvent.actionName === 'increment' ? 1 : -1;
          const nextIndex = Math.max(
            0,
            Math.min(index + direction, trackCount - 1),
          );
          if (!disabled && nextIndex !== index) {
            onMove(index, nextIndex);
          }
        }}
        {...responder.panHandlers}
        style={styles.handle}
      >
        <GripVertical color={colors.textSecondary} size={20} />
      </View>
      <View style={styles.content}>{children}</View>
    </Animated.View>
  );
}

const useStyles = createStyles(colors => ({
  row: { alignItems: 'center', flexDirection: 'row' },
  dragging: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.md,
    elevation: 6,
    zIndex: 2,
  },
  handle: {
    alignItems: 'center',
    height: 48,
    justifyContent: 'center',
    width: 40,
  },
  content: { flex: 1, minWidth: 0 },
}));
