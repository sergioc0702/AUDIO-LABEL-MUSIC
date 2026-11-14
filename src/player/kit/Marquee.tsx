// A one-line title that scrolls when it does not fit.
import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import type { SceneClock } from './sceneClock';

/**
 * One line of text that rolls like a marquee only when it does not fit.
 * The roll runs on the UI thread from the scene clock.
 */
export function Marquee({
  clock,
  text,
  style,
  height,
  gap = 48,
  center = false,
}: {
  clock: SceneClock;
  text: string;
  style: StyleProp<TextStyle>;
  height: number;
  gap?: number;
  center?: boolean;
}) {
  const [box, setBox] = useState(0);
  const [natural, setNatural] = useState(0);
  const span = useSharedValue(0);
  span.value = natural + gap;
  const fits = natural === 0 || box === 0 || natural <= box;
  const roll = useAnimatedStyle(() => {
    if (span.value <= gap) return { transform: [{ translateX: 0 }] };
    return {
      transform: [{ translateX: -((clock.wall.value * 26) % span.value) }],
    };
  });
  return (
    <View
      onLayout={(event: LayoutChangeEvent) =>
        setBox(event.nativeEvent.layout.width)
      }
      style={[styles.box, { height }]}
    >
      <View pointerEvents="none" style={styles.measure}>
        <Text
          importantForAccessibility="no-hide-descendants"
          onLayout={(event: LayoutChangeEvent) =>
            setNatural(Math.ceil(event.nativeEvent.layout.width))
          }
          style={style}
        >
          {text}
        </Text>
      </View>
      {fits ? (
        <Text numberOfLines={1} style={[style, center && styles.center]}>
          {text}
        </Text>
      ) : (
        <Animated.View style={[styles.roll, roll]}>
          <Text style={[style, { paddingRight: gap }]}>{text}</Text>
          <Text
            importantForAccessibility="no-hide-descendants"
            style={[style, { paddingRight: gap }]}
          >
            {text}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { overflow: 'hidden', justifyContent: 'center', alignSelf: 'stretch' },
  measure: {
    position: 'absolute',
    width: 4000,
    opacity: 0,
    flexDirection: 'row',
  },
  roll: { flexDirection: 'row', width: 8000 },
  center: { textAlign: 'center' },
});
