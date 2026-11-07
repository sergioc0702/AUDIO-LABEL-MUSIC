import { memo, useEffect, useRef, type ReactNode } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { Animated, Text, View } from 'react-native';
import { ChevronRight, MoreVertical } from 'lucide-react-native';
import {
  radius,
  screenPadding,
  spacing,
  createStyles,
  useColors,
} from '../theme/theme';
import type { Track } from '../types/Track';
import { IconButton } from './Buttons';
import { Cover } from './Cover';
import { Tap } from './Tap';

export const trackRowHeight = 64;
const restingBars = [0.45, 0.9, 0.6];

export function NowPlayingBars({ isPlaying }: { isPlaying: boolean }) {
  const styles = useStyles();
  const reducedMotion = useReducedMotion();
  const bars = useRef([
    new Animated.Value(0.45),
    new Animated.Value(0.9),
    new Animated.Value(0.6),
  ]).current;

  useEffect(() => {
    if (!isPlaying || reducedMotion) {
      bars.forEach((bar, index) => bar.setValue(restingBars[index]));
      return;
    }
    const loops = bars.map((bar, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(bar, {
            toValue: 1,
            duration: 320 + index * 90,
            isInteraction: false,
            useNativeDriver: true,
          }),
          Animated.timing(bar, {
            toValue: 0.3,
            duration: 300 + index * 70,
            isInteraction: false,
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    loops.forEach(loop => loop.start());
    return () => loops.forEach(loop => loop.stop());
  }, [bars, isPlaying, reducedMotion]);

  return (
    <View accessibilityLabel="Reproduciendo" style={styles.bars}>
      {bars.map((bar, index) => (
        <Animated.View
          key={index}
          style={[
            styles.bar,
            !isPlaying && styles.barPaused,
            { transform: [{ scaleY: bar }] },
          ]}
        />
      ))}
    </View>
  );
}

export const TrackRow = memo(function TrackRowContent({
  track,
  subtitle,
  isCurrent,
  isPlaying,
  onPress,
  onMore,
  accessibilityLabel,
  leading,
  trailing,
}: {
  track: Track;
  subtitle?: string;
  isCurrent: boolean;
  isPlaying: boolean;
  onPress: () => void;
  onMore?: () => void;
  accessibilityLabel?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
}) {
  const { colors, type } = useColors();
  const styles = useStyles();
  return (
    <View style={styles.row}>
      {leading}
      <Tap
        accessibilityRole="button"
        accessibilityLabel={
          accessibilityLabel ?? `Reproducir ${track.title} de ${track.artist}`
        }
        android_ripple={{ color: colors.ripple }}
        onLongPress={onMore}
        onPress={onPress}
        style={styles.rowMain}
      >
        <Cover uri={track.artwork} size={48} />
        <View style={styles.rowText}>
          <Text
            numberOfLines={1}
            style={[type.body, isCurrent && styles.current]}
          >
            {track.title}
          </Text>
          <Text numberOfLines={1} style={type.secondary}>
            {subtitle ?? track.artist}
          </Text>
        </View>
        {isCurrent ? <NowPlayingBars isPlaying={isPlaying} /> : null}
      </Tap>
      {trailing}
      {onMore ? (
        <IconButton label={`Más acciones para ${track.title}`} onPress={onMore}>
          <MoreVertical color={colors.textSecondary} size={20} />
        </IconButton>
      ) : null}
    </View>
  );
});

export function ListRow({
  title,
  subtitle,
  leading,
  accessibilityLabel,
  onPress,
  showChevron = true,
  trailing,
}: {
  title: string;
  subtitle?: string;
  leading: ReactNode;
  accessibilityLabel?: string;
  onPress: () => void;
  showChevron?: boolean;
  trailing?: ReactNode;
}) {
  const { colors, type } = useColors();
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <Tap
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        android_ripple={{ color: colors.ripple }}
        onPress={onPress}
        style={styles.rowMain}
      >
        {leading}
        <View style={styles.rowText}>
          <Text numberOfLines={1} style={type.body}>
            {title}
          </Text>
          {subtitle ? (
            <Text numberOfLines={1} style={type.secondary}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {showChevron ? (
          <ChevronRight color={colors.textSecondary} size={20} />
        ) : null}
      </Tap>
      {trailing}
    </View>
  );
}

export function SquareIcon({ children }: { children: ReactNode }) {
  const styles = useStyles();
  return <View style={styles.squareIcon}>{children}</View>;
}

export function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  const { type } = useColors();
  const styles = useStyles();
  return (
    <View style={styles.section}>
      <Text style={type.headline}>{title}</Text>
      {action && onAction ? (
        <Tap
          accessibilityRole="button"
          accessibilityLabel={`${action}: ${title}`}
          hitSlop={14}
          onPress={onAction}
        >
          <Text style={type.secondary}>{action}</Text>
        </Tap>
      ) : null}
    </View>
  );
}

const useStyles = createStyles(colors => ({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: trackRowHeight,
    paddingRight: spacing.xs,
  },
  rowMain: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: trackRowHeight,
    minWidth: 0,
    paddingLeft: screenPadding,
    paddingRight: spacing.sm,
  },
  rowText: { flex: 1, gap: 2, minWidth: 0 },
  current: { color: colors.accent, fontWeight: '600' },
  bars: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 2,
    height: 16,
    width: 16,
  },
  bar: {
    backgroundColor: colors.accent,
    borderRadius: 1,
    height: 16,
    transformOrigin: 'bottom',
    width: 4,
  },
  barPaused: { opacity: 0.55 },
  squareIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.sm,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  section: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
    paddingHorizontal: screenPadding,
    paddingTop: spacing.xl,
  },
}));
