import { Easing } from 'react-native-reanimated';

export const playerMotion = {
  enter: 240,
  exit: 180,
  settle: 140,
  entrance: Easing.out(Easing.cubic),
  departure: Easing.inOut(Easing.cubic),
};

export function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.max(min, Math.min(value, max));
}

export function acceptsSwipe(
  distance: number,
  velocity: number,
  threshold: number,
) {
  'worklet';
  return (
    Math.abs(distance) >= threshold ||
    (Math.abs(distance) >= 16 &&
      Math.abs(velocity) >= 800 &&
      Math.sign(distance) === Math.sign(velocity))
  );
}
