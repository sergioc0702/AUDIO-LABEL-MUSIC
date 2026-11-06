import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors, radius, spacing, type } from '../theme/theme';
import { Tap } from './Tap';

type TapProps = ComponentProps<typeof Tap>;

export function IconButton({
  children,
  label,
  style,
  ...props
}: Omit<TapProps, 'children' | 'accessibilityLabel'> & {
  children: ReactNode;
  label: string;
}) {
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={label}
      android_ripple={{ color: colors.ripple, borderless: true, radius: 24 }}
      pressedScale={0.9}
      style={[styles.icon, style]}
      {...props}
    >
      {children}
    </Tap>
  );
}

export function Button({
  label,
  accessibilityLabel,
  icon,
  variant = 'filled',
  style,
  ...props
}: Omit<TapProps, 'children'> & {
  label: string;
  icon?: ReactNode;
  variant?: 'filled' | 'tonal';
}) {
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={[
        styles.button,
        variant === 'filled' ? styles.filled : styles.tonal,
        props.disabled && styles.disabled,
        style,
      ]}
      {...props}
    >
      {icon}
      <Text
        numberOfLines={1}
        style={[type.bodyStrong, variant === 'filled' && styles.filledText]}
      >
        {label}
      </Text>
    </Tap>
  );
}

const styles = StyleSheet.create({
  icon: {
    alignItems: 'center',
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  button: {
    alignItems: 'center',
    borderRadius: radius.full,
    flexDirection: 'row',
    gap: spacing.sm,
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  filled: { backgroundColor: colors.accent },
  tonal: { backgroundColor: colors.surfaceHigh },
  filledText: { color: colors.onAccent },
  disabled: { opacity: 0.45 },
});
