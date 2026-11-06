import { useRef, type ComponentProps } from 'react';
import {
  Animated,
  Pressable,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type PressableScaleProps = Omit<
  ComponentProps<typeof AnimatedPressable>,
  'style'
> & {
  pressedScale?: number;
  style?: StyleProp<ViewStyle>;
};

/** Pressable that gives way under the finger and settles back on release. */
export function PressableScale({
  pressedScale = 0.96,
  onPressIn,
  onPressOut,
  style,
  ...props
}: PressableScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const animateTo = (toValue: number) => {
    Animated.spring(scale, {
      toValue,
      speed: 50,
      bounciness: toValue === 1 ? 6 : 0,
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
