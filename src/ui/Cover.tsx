import { memo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Music2 } from 'lucide-react-native';
import { createStyles, useColors } from '../theme/theme';

export const Cover = memo(function CoverImage({
  uri,
  size,
  round = false,
}: {
  uri: string | null | undefined;
  size: number;
  round?: boolean;
}) {
  const { colors } = useColors();
  const styles = useStyles();
  const shape = {
    borderRadius: round
      ? size / 2
      : size >= 120
      ? colors.design.radius.md
      : colors.design.radius.sm,
    height: size,
    width: size,
    // Brutalist covers are framed like everything else in that theme.
    borderWidth: colors.design.line >= 3 && size >= 56 ? colors.design.line : 0,
    borderColor: colors.text,
  };

  return (
    <View style={[styles.cover, shape]}>
      {uri ? (
        <Image
          fadeDuration={0}
          resizeMethod="resize"
          source={{ uri }}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <Music2 color={colors.textSecondary} size={size * 0.4} />
      )}
    </View>
  );
});

const useStyles = createStyles(colors => ({
  cover: {
    alignItems: 'center',
    backgroundColor: colors.surfaceHigh,
    justifyContent: 'center',
    overflow: 'hidden',
  },
}));
