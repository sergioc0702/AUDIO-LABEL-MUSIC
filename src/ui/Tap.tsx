import { useRef, type ComponentProps } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { motionDuration, motionEasing } from '../theme/motion';
import { useColors } from '../theme/theme';
import {
  Animated,
  Pressable,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type TapProps = Omit<ComponentProps<typeof Pressable>, 'style'> & {
  pressedScale?: number;
  style?: StyleProp<ViewStyle>;
};

/** Native ripple is the default feedback. Prominent controls can opt into scale. */
export function Tap({ pressedScale = 1, ...props }: TapProps) {
  const { colors } = useColors();
  const rippleProps = { android_ripple: { color: colors.ripple }, ...props };
  return pressedScale === 1 ? (
    <Pressable {...rippleProps} />
  ) : (
    <ScalingTap {...rippleProps} pressedScale={pressedScale} />
  );
}

function ScalingTap({
  pressedScale,
  onPressIn,
  onPressOut,
  style,
  ...props
}: TapProps & { pressedScale: number }) {
  const reducedMotion = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const animateTo = (toValue: number) => {
    Animated.timing(scale, {
      toValue,
      duration: motionDuration.feedback,
      easing: motionEasing.enter,
      isInteraction: false,
      useNativeDriver: true,
    }).start();
  };

  if (reducedMotion) {
    return (
      <Pressable
        {...props}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={style}
      />
    );
  }

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
