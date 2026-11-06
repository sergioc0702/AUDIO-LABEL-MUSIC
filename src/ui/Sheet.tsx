import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { motionDuration, motionEasing } from '../theme/motion';
import { radius, spacing, createStyles, useColors } from '../theme/theme';
import { Tap } from './Tap';

/** Bottom sheet. Android Back, the scrim and dragging the handle all close it. */
export function Sheet({
  visible,
  onClose,
  closeLabel = 'Cerrar',
  title,
  subtitle,
  sheetStyle,
  lightScrim = false,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  closeLabel?: string;
  title?: string;
  subtitle?: string;
  sheetStyle?: StyleProp<ViewStyle>;
  /** Keeps what is behind visible, for a live preview. */
  lightScrim?: boolean;
  children: ReactNode;
}) {
  const { type } = useColors();
  const styles = useStyles();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(visible);
  const translateY = useRef(new Animated.Value(height)).current;
  const scrim = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: reducedMotion ? 0 : motionDuration.enter,
          easing: motionEasing.enter,
          useNativeDriver: true,
        }),
        Animated.timing(scrim, {
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
      Animated.timing(scrim, {
        toValue: 0,
        duration: motionDuration.exit,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setMounted(false);
      }
    });
  }, [height, reducedMotion, scrim, translateY, visible]);

  const drag = useMemo(
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

  return (
    <Modal
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
      transparent
      visible={mounted}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.scrim,
            lightScrim && styles.scrimLight,
            { opacity: scrim },
          ]}
        >
          <Pressable
            accessibilityLabel={closeLabel}
            onPress={onClose}
            style={styles.fill}
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + spacing.sm },
            sheetStyle,
            { transform: [{ translateY }] },
          ]}
        >
          <View {...drag.panHandlers} style={styles.handleArea}>
            <View style={styles.handle} />
          </View>
          {title ? (
            <View style={styles.header}>
              <Text numberOfLines={2} style={type.title}>
                {title}
              </Text>
              {subtitle ? (
                <Text numberOfLines={1} style={type.secondary}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
          ) : null}
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

export function SheetAction({
  icon,
  label,
  accessibilityLabel,
  danger = false,
  selected = false,
  trailing,
  onPress,
}: {
  icon?: ReactNode;
  label: string;
  accessibilityLabel?: string;
  danger?: boolean;
  selected?: boolean;
  trailing?: ReactNode;
  onPress: () => void;
}) {
  const { colors, type } = useColors();
  const styles = useStyles();
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      android_ripple={{ color: colors.ripple }}
      onPress={onPress}
      pressedScale={1}
      style={styles.action}
    >
      {icon}
      <Text
        numberOfLines={1}
        style={[
          type.body,
          styles.actionLabel,
          danger && styles.danger,
          selected && styles.selected,
        ]}
      >
        {label}
      </Text>
      {trailing}
    </Tap>
  );
}

const useStyles = createStyles(colors => ({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: colors.scrim },
  scrimLight: { backgroundColor: 'transparent' },
  fill: { flex: 1 },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    maxHeight: '88%',
  },
  handleArea: { alignItems: 'center', paddingVertical: spacing.md },
  handle: {
    backgroundColor: colors.outline,
    borderRadius: 2,
    height: 4,
    width: 36,
  },
  header: {
    gap: 2,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  action: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.lg,
    minHeight: 52,
    paddingHorizontal: spacing.xl,
  },
  actionLabel: { flex: 1 },
  danger: { color: colors.danger },
  selected: { fontWeight: '700' },
}));
