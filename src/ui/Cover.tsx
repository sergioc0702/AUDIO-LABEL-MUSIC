import { Image, StyleSheet, View } from 'react-native';
import { Music2 } from 'lucide-react-native';
import { radius, createStyles, useColors } from '../theme/theme';

export function Cover({
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
    borderRadius: round ? size / 2 : size >= 120 ? radius.md : radius.sm,
    height: size,
    width: size,
  };

  return (
    <View style={[styles.cover, shape]}>
      {uri ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} />
      ) : (
        <Music2 color={colors.textSecondary} size={size * 0.4} />
      )}
    </View>
  );
}

const useStyles = createStyles(colors => ({
  cover: {
    alignItems: 'center',
    backgroundColor: colors.surfaceHigh,
    justifyContent: 'center',
    overflow: 'hidden',
  },
}));
