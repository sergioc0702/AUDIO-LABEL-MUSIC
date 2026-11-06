import type { ComponentType } from 'react';
import { StyleSheet, View } from 'react-native';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import type {
  PlayerSceneId,
  PlayerSceneMotion,
  PlayerTheme,
} from '../../../theme/playerThemes';
import { AuroraScene } from './AuroraScene';

export type PlayerSceneProps = {
  glows: PlayerTheme['scene']['glows'];
  motion: PlayerSceneMotion;
  /** True only while music plays and the player is on screen. Stop loops otherwise. */
  active: boolean;
  /** True when the system asks for fewer animations. Keep the scene still. */
  reducedMotion: boolean;
};

const scenes: Record<PlayerSceneId, ComponentType<PlayerSceneProps>> = {
  aurora: AuroraScene,
};

export function PlayerScene({
  theme,
  active,
}: {
  theme: PlayerTheme;
  active: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const Scene = scenes[theme.scene.id];

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Scene
        active={active}
        glows={theme.scene.glows}
        motion={theme.scene.motion}
        reducedMotion={reducedMotion}
      />
    </View>
  );
}
