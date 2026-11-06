import { useRef, type ComponentProps } from 'react';
import {
  Animated,
  Pressable,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type TapProps = Omit<ComponentProps<typeof AnimatedPressable>, 'style'> & {
  pressedScale?: number;
  style?: StyleProp<ViewStyle>;
};

/** Pressable with a small, quick response to the finger. */
export function Tap({
  pressedScale = 0.97,
  onPressIn,
  onPressOut,
  style,
  ...props
}: TapProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const animateTo = (toValue: number) => {
    Animated.spring(scale, {
      toValue,
      speed: 50,
      bounciness: 0,
      useNativeDriver: true,
    }).start();
  };

  return (
    <AnimatedPressable
      {...props}
      onPressIn={event => {
        animateTo(pressedScale);
        onPressIn?.(event);
      }}
      onPressOut={event => {
        animateTo(1);
        onPressOut?.(event);
      }}
      style={[style, { transform: [{ scale }] }]}
    />
  );
}
