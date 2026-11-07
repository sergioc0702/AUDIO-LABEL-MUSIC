import type { ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { createStyles, spacing, useColors } from '../theme/theme';

/** Layout shared by the panels hosted in the playback window. */
export function PlaybackPanel({
  title,
  subtitle,
  scroll = true,
  children,
}: {
  title: string;
  subtitle?: string;
  scroll?: boolean;
  children: ReactNode;
}) {
  const { type } = useColors();
  const styles = useStyles();
  return (
    <View style={[styles.panel, !scroll && styles.fill]}>
      <View style={styles.header}>
        <Text
          accessibilityRole="header"
          numberOfLines={2}
          style={type.headline}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={type.secondary} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {scroll ? (
        <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        children
      )}
    </View>
  );
}

const useStyles = createStyles(() => ({
  panel: { flexShrink: 1, minHeight: 0 },
  fill: { flex: 1 },
  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  scroll: { flexGrow: 0, flexShrink: 1 },
}));
