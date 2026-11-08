import { useEffect, useRef, type ReactNode } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  useFrameCallback,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Ellipse,
  G,
  Line,
  Path,
  Polygon,
  Rect,
} from 'react-native-svg';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { createStyles } from '../../../theme/theme';
import type { PlayerKit } from '../kit';

/** Every scene draws in this box; the frame keeps the same ratio. */
export const W = 320;
export const H = 276;

export const AnimatedPath = Animated.createAnimatedComponent(Path);
export const AnimatedCircle = Animated.createAnimatedComponent(Circle);
export const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
export const AnimatedRect = Animated.createAnimatedComponent(Rect);
export const AnimatedLine = Animated.createAnimatedComponent(Line);
export const AnimatedPolygon = Animated.createAnimatedComponent(Polygon);
export const AnimatedG = Animated.createAnimatedComponent(G);

export function noise(seed: number) {
  'worklet';
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

export function clamp01(value: number) {
  'worklet';
  return Math.max(0, Math.min(1, value));
}

/** A tone with alpha, for colors stored as #rrggbb. */
export function alpha(color: string | undefined, amount: number) {
  if (!color || color.length !== 7) return color ?? 'transparent';
  const hex = Math.round(clamp01(amount) * 255)
    .toString(16)
    .padStart(2, '0');
  return color + hex;
}

/** Colors stored as "a,b,c" in a skin. */
export function list(value: string | undefined, fallback: string[]) {
  const items = (value ?? '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
  return items.length ? items : fallback;
}

export type SceneClock = {
  /** Seconds since the scene became visible, even when paused. */
  wall: SharedValue<number>;
  /** Seconds of music: stops in pause, runs faster right after a change. */
  run: SharedValue<number>;
  /** 1 right after another song starts, falls to 0. */
  change: SharedValue<number>;
  /** Eases between 0 (paused) and 1 (playing). */
  play: SharedValue<number>;
  /** Song progress from 0 to 1, smoothed. */
  progress: SharedValue<number>;
  /** Device pixels per scene unit, for transforms on views. */
  unit: SharedValue<number>;
  reduced: boolean;
  onLayout: (event: LayoutChangeEvent) => void;
};

/**
 * The time base of a themed scene. It runs on the UI thread while the player
 * is visible and stops when it is closed, covered or motion is reduced.
 */
export function useSceneClock(
  kit: PlayerKit,
  {
    boost = 3,
    changeSeconds = 1.4,
  }: { boost?: number; changeSeconds?: number } = {},
): SceneClock {
  const reduced = useReducedMotion();
  const wall = useSharedValue(0);
  const run = useSharedValue(0);
  const change = useSharedValue(0);
  const play = useSharedValue(kit.isPlaying ? 1 : 0);
  const playing = useSharedValue(kit.isPlaying ? 1 : 0);
  const target = useSharedValue(kit.progress);
  const progress = useSharedValue(kit.progress);
  const rate = useSharedValue(kit.rate || 1);
  const unit = useSharedValue(1);

  useEffect(() => {
    playing.value = kit.isPlaying ? 1 : 0;
    if (reduced) play.value = playing.value;
  }, [kit.isPlaying, play, playing, reduced]);
  useEffect(() => {
    target.value = kit.progress;
    if (reduced) progress.value = kit.progress;
  }, [kit.progress, progress, reduced, target]);
  useEffect(() => {
    rate.value = kit.rate || 1;
  }, [kit.rate, rate]);

  const last = useRef(kit.track?.id);
  useEffect(() => {
    const id = kit.track?.id;
    if (id && last.current && id !== last.current) {
      change.value = reduced ? 0 : 1;
      progress.value = 0;
    }
    last.current = id;
  }, [change, kit.track?.id, progress, reduced]);

  const frame = useFrameCallback(info => {
    const dt = Math.min(0.05, (info.timeSincePreviousFrame ?? 16) / 1000);
    wall.value += dt;
    play.value += (playing.value - play.value) * Math.min(1, dt * 3);
    const c = change.value;
    change.value = Math.max(0, c - dt / changeSeconds);
    run.value += dt * rate.value * (play.value + c * boost);
    // Big jumps (seeking) are shown at once, small ones glide.
    const gap = target.value - progress.value;
    progress.value =
      Math.abs(gap) > 0.08
        ? target.value
        : progress.value + gap * Math.min(1, dt * 4);
  }, false);

  const active = kit.visible && !reduced;
  useEffect(() => {
    frame.setActive(active);
  }, [active, frame]);

  return {
    wall,
    run,
    change,
    play,
    progress,
    unit,
    reduced,
    onLayout: event => {
      unit.value = Math.max(0.1, event.nativeEvent.layout.width / W);
    },
  };
}

/** The scene's frame: fixed ratio, rounded, with its own background. */
export function SceneBox({
  clock,
  label,
  background,
  children,
  radius,
}: {
  clock: SceneClock;
  label: string;
  background: string;
  children: ReactNode;
  radius?: number;
}) {
  const styles = useStyles();
  return (
    <View
      accessible
      accessibilityLabel={label}
      onLayout={clock.onLayout}
      style={[
        styles.box,
        { backgroundColor: background },
        radius !== undefined && { borderRadius: radius },
      ]}
    >
      {children}
    </View>
  );
}

/** A full-size SVG layer in scene units. */
export function Layer({ children }: { children: ReactNode }) {
  const styles = useStyles();
  return (
    <Svg
      height="100%"
      pointerEvents="none"
      style={styles.layer}
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
    >
      {children}
    </Svg>
  );
}

/** Places a child view of scene size w×h with its top-left at x,y. */
export function place(x: number, y: number, w: number, h: number) {
  return {
    position: 'absolute' as const,
    left: `${(x / W) * 100}%` as const,
    top: `${(y / H) * 100}%` as const,
    width: `${(w / W) * 100}%` as const,
    height: `${(h / H) * 100}%` as const,
  };
}

const useStyles = createStyles(colors => ({
  box: {
    alignSelf: 'center',
    aspectRatio: W / H,
    borderRadius: colors.design.radius.lg,
    maxWidth: 348,
    overflow: 'hidden',
    width: '100%',
  },
  layer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
}));
