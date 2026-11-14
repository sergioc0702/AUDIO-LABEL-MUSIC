// The UI-thread clock that drives themed animations (useSceneClock), plus the
// animated SVG shapes and small worklet helpers the scenes share.
import { useEffect, useRef } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import Animated, {
  useFrameCallback,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import type { PlayerKit } from './playerKit';

/** Default scene width in units; `unit` is device pixels per unit. */
const W = 320;

export const AnimatedPath = Animated.createAnimatedComponent(Path);
export const AnimatedCircle = Animated.createAnimatedComponent(Circle);
export const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
export const AnimatedRect = Animated.createAnimatedComponent(Rect);
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
    baseWidth = W,
  }: { boost?: number; changeSeconds?: number; baseWidth?: number } = {},
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
      unit.value = Math.max(0.1, event.nativeEvent.layout.width / baseWidth);
    },
  };
}
