import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { motionDuration, motionEasing } from '../../theme/motion';

/** Bottom sheet that slides in, and closes by dragging its handle down. */
export function AnimatedSheet({
  visible,
  onClose,
  closeLabel,
  backdropStyle,
  handleStyle,
  overlayStyle,
  sheetStyle,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  closeLabel: string;
  backdropStyle: StyleProp<ViewStyle>;
  handleStyle: StyleProp<ViewStyle>;
  overlayStyle: StyleProp<ViewStyle>;
  sheetStyle: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const { height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(visible);
  const translateY = useRef(new Animated.Value(height)).current;
  const backdrop = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateY.setValue(reducedMotion ? 0 : height);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: reducedMotion ? 0 : motionDuration.enter,
          easing: motionEasing.enter,
          useNativeDriver: true,
        }),
        Animated.timing(backdrop, {
          toValue: 1,
          duration: motionDuration.state,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: height,
        duration: reducedMotion ? 0 : motionDuration.exit,
        easing: motionEasing.exit,
        useNativeDriver: true,
      }),
      Animated.timing(backdrop, {
        toValue: 0,
        duration: motionDuration.exit,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setMounted(false);
      }
    });
  }, [backdrop, height, reducedMotion, translateY, visible]);

  const dragResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderMove: (_, gesture) => {
          translateY.setValue(Math.max(0, gesture.dy));
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy > 90 || gesture.vy > 0.8) {
            onCloseRef.current();
          } else {
            Animated.spring(translateY, {
              toValue: 0,
              speed: 24,
              bounciness: 0,
              useNativeDriver: true,
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          translateY.setValue(0);
        },
      }),
    [translateY],
  );

  if (!mounted) {
    return null;
  }

  return (
    <View style={overlayStyle}>
      <Animated.View style={[backdropStyle, { opacity: backdrop }]}>
        <Pressable
          accessibilityLabel={closeLabel}
          onPress={onClose}
          style={fill}
        />
      </Animated.View>
      <Animated.View style={[sheetStyle, { transform: [{ translateY }] }]}>
        <View {...dragResponder.panHandlers} style={handleArea}>
          <View style={handleStyle} />
        </View>
        {children}
      </Animated.View>
    </View>
  );
}

const fill = { flex: 1 };
const handleArea = { paddingTop: 6 };
