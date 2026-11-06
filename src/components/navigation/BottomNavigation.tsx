import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import type { Music2 } from 'lucide-react-native';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import type { createStyles } from '../../theme/createStyles';
import type { AppDesignTokens } from '../../theme/tokens';

const horizontalPadding = 7;

export function BottomNavigation<Id extends string>({
  colors,
  styles,
  items,
  selectedId,
  onSelect,
}: {
  colors: AppDesignTokens['colors'];
  styles: ReturnType<typeof createStyles>;
  items: { id: Id; label: string; icon: typeof Music2 }[];
  selectedId: Id;
  onSelect: (id: Id) => void;
}) {
  const reducedMotion = useReducedMotion();
  const [itemWidth, setItemWidth] = useState(0);
  const selectedIndex = items.findIndex(item => item.id === selectedId);
  const indicatorX = useRef(new Animated.Value(selectedIndex)).current;
  const labelReveal = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    labelReveal.setValue(reducedMotion ? 1 : 0);
    Animated.parallel([
      Animated.spring(indicatorX, {
        toValue: selectedIndex,
        speed: reducedMotion ? 1000 : 16,
        bounciness: reducedMotion ? 0 : 5,
        useNativeDriver: true,
      }),
      Animated.timing(labelReveal, {
        toValue: 1,
        duration: 180,
        delay: reducedMotion ? 0 : 70,
        useNativeDriver: true,
      }),
    ]).start();
  }, [indicatorX, labelReveal, reducedMotion, selectedIndex]);

  return (
    <View
      accessibilityRole="tablist"
      onLayout={event => {
        setItemWidth(
          (event.nativeEvent.layout.width - horizontalPadding * 2) /
            items.length,
        );
      }}
      style={styles.bottomNavigation}
    >
      {itemWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.navigationIndicator,
            {
              left: horizontalPadding,
              width: itemWidth,
              transform: [
                {
                  translateX: indicatorX.interpolate({
                    inputRange: [0, Math.max(1, items.length - 1)],
                    outputRange: [0, itemWidth * Math.max(1, items.length - 1)],
                  }),
                },
              ],
            },
          ]}
        />
      ) : null}
      {items.map(item => {
        const selected = selectedId === item.id;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected }}
            onPress={() => onSelect(item.id)}
            style={styles.navigationItem}
          >
            <item.icon
              color={selected ? colors.onAccent : colors.muted}
              fill={selected ? colors.onAccent : 'none'}
              size={21}
              strokeWidth={2}
            />
            {selected ? (
              <Animated.Text
                numberOfLines={1}
                style={[
                  styles.navigationLabelSelected,
                  { opacity: labelReveal },
                ]}
              >
                {item.label}
              </Animated.Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
