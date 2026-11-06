import { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { useProgress } from 'react-native-track-player';
import { useDesignTokens } from '../../theme/DesignThemeContext';
import { createStyles } from '../../theme/createStyles';
import { ProgressSlider } from './PlayerControls';

export function MiniPlayerProgress({
  duration,
  onPositionChange,
}: {
  duration: number;
  onPositionChange: (position: number) => void;
}) {
  const { position } = useProgress(1000);
  const tokens = useDesignTokens();
  const styles = useMemo(() => createStyles(tokens), [tokens]);

  useEffect(() => {
    onPositionChange(position);
  }, [onPositionChange, position]);

  const progress =
    duration > 0 ? Math.min(100, (position / duration) * 100) : 0;

  return (
    <View style={styles.miniProgressTrack}>
      <View style={[styles.progressFill, { width: `${progress}%` }]} />
    </View>
  );
}

export function ExpandedPlaybackProgress({
  fallbackDuration,
  onSeek,
  disabled,
}: {
  fallbackDuration: number;
  onSeek: (position: number) => Promise<void>;
  disabled: boolean;
}) {
  const progress = useProgress(250);

  return (
    <ProgressSlider
      duration={progress.duration > 0 ? progress.duration : fallbackDuration}
      position={progress.position}
      onSeek={onSeek}
      disabled={disabled}
    />
  );
}
