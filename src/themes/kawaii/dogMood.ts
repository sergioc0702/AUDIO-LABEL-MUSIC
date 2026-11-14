export type DogMood = 'triste' | 'ansioso' | 'tranquilo' | 'feliz';

/** Below this media volume the dog asks for more. */
const LOW_VOLUME = 0.35;
/** Above this media volume the dog jumps for joy. */
const HIGH_VOLUME = 0.7;

export function dogMood(
  playing: boolean,
  level: number,
  petted: boolean,
): DogMood {
  if (petted) return 'feliz';
  if (!playing) return 'triste';
  if (level < LOW_VOLUME) return 'ansioso';
  if (level > HIGH_VOLUME) return 'feliz';
  return 'tranquilo';
}
