import { useEffect, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { SkipForward } from 'lucide-react-native';
import Svg, {
  Defs,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';
import { formatTime } from '../utils/formatTime';
import { useApp } from '../state/AppContext';
import { createStyles, spacing, useColors } from '../theme/theme';
import { IconButton } from '../ui/Buttons';
import { Cover } from '../ui/Cover';
import { Tap } from '../ui/Tap';
import { PlayPauseIcon } from './PlayPauseIcon';
import { usePlaybackProgress } from './PlaybackProgress';
import { acceptsSwipe, clamp, playerMotion } from './playerMotion';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { ShihTzu } from '../themes/kawaii/ShihTzu';

/** The record turns while the song plays, like on the turntable. */
function SpinningRecord({
  uri,
  playing,
}: {
  uri: string | null | undefined;
  playing: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const turn = useSharedValue(0);
  useEffect(() => {
    if (!playing || reducedMotion) {
      cancelAnimation(turn);
      return;
    }
    turn.value = withRepeat(
      withTiming(turn.value + 360, { duration: 1800, easing: Easing.linear }),
      -1,
    );
    return () => cancelAnimation(turn);
  }, [playing, reducedMotion, turn]);
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${turn.value}deg` }],
  }));
  return (
    <Animated.View
      style={[
        {
          width: 46,
          height: 46,
          borderRadius: 23,
          backgroundColor: '#101012',
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Cover round size={22} uri={uri} />
    </Animated.View>
  );
}

function MiniPosition({
  ink = false,
  glow = false,
}: {
  ink?: boolean;
  glow?: boolean;
}) {
  const { position, duration } = usePlaybackProgress();
  const styles = useStyles();
  return (
    <View style={[styles.progress, ink && styles.inkProgress]}>
      <View
        style={[
          styles.progressFill,
          ink && styles.inkFill,
          glow && styles.glowFill,
          {
            transform: [
              { scaleX: duration > 0 ? clamp(position / duration, 0, 1) : 0 },
            ],
          },
        ]}
      />
    </View>
  );
}

/** The Constelación progress: a thin line of light that ends in a star. */
function MiniStarLine() {
  const { position, duration } = usePlaybackProgress();
  const styles = useStyles();
  const { colors } = useColors();
  const share = duration > 0 ? clamp(position / duration, 0, 1) : 0;
  return (
    <View style={styles.starTrack}>
      <View style={[styles.starFill, { width: `${share * 100}%` }]} />
      <View style={[styles.starTip, { left: `${share * 100}%` }]}>
        <Svg height={14} width={14}>
          <Path
            d="M7 0 Q 8.5 5.5 14 7 Q 8.5 8.5 7 14 Q 5.5 8.5 0 7 Q 5.5 5.5 7 0 Z"
            fill={colors.accent}
          />
        </Svg>
      </View>
    </View>
  );
}

const BLOCKS = 24;

/** The Pixel progress: a row of blocks that light up like a game meter. */
function MiniBlocks({ color }: { color?: string }) {
  const { position, duration } = usePlaybackProgress();
  const styles = useStyles();
  const { colors } = useColors();
  const fill = color ?? colors.skin.bodyInk ?? colors.text;
  const lit = Math.round(
    (duration > 0 ? clamp(position / duration, 0, 1) : 0) * BLOCKS,
  );
  return (
    <View style={styles.blocks}>
      {Array.from({ length: BLOCKS }, (_, n) => (
        <View
          key={n}
          style={[styles.blockCell, n < lit && { backgroundColor: fill }]}
        />
      ))}
    </View>
  );
}

/** The Vaporwave progress: a neon line that ends in a glowing sun. */
function MiniSunLine() {
  const { position, duration } = usePlaybackProgress();
  const styles = useStyles();
  const { colors } = useColors();
  const k = colors.skin;
  const share = duration > 0 ? clamp(position / duration, 0, 1) : 0;
  return (
    <View style={styles.sunTrack}>
      <Svg height={3} style={styles.sunLine} width="100%">
        <Defs>
          <LinearGradient id="vw-mini-line" x1="0" x2="1" y1="0" y2="0">
            <Stop offset="0" stopColor={k.chromaB ?? colors.accent} />
            <Stop offset="1" stopColor={k.accent ?? colors.accent} />
          </LinearGradient>
        </Defs>
        <Rect fill="url(#vw-mini-line)" height={3} width={`${share * 100}%`} />
      </Svg>
      <View style={[styles.sunDot, { left: `${share * 100}%` }]} />
    </View>
  );
}

/** The on-screen display of a VCR: "▶ PLAY 0:52". */
function VhsCounter({ playing }: { playing: boolean }) {
  const { position } = usePlaybackProgress();
  const { colors, type } = useColors();
  return (
    <Text
      numberOfLines={1}
      style={[type.caption, { color: colors.skin.accent ?? colors.accent }]}
    >
      {playing ? '▶ PLAY' : '❚❚ PAUSA'} {formatTime(position)}
    </Text>
  );
}

/** The tracking line of a worn tape that rolls down now and then. */
function TrackingLine({ active }: { active: boolean }) {
  const reducedMotion = useReducedMotion();
  const styles = useStyles();
  const roll = useSharedValue(0);
  useEffect(() => {
    if (!active || reducedMotion) {
      cancelAnimation(roll);
      roll.value = 0;
      return;
    }
    roll.value = withRepeat(
      withSequence(
        withDelay(
          5000,
          withTiming(1, { duration: 1800, easing: Easing.linear }),
        ),
        withTiming(0, { duration: 0 }),
      ),
      -1,
    );
    return () => cancelAnimation(roll);
  }, [active, reducedMotion, roll]);
  const style = useAnimatedStyle(() => ({
    opacity: roll.value > 0 ? 0.4 : 0,
    transform: [{ translateY: -8 + roll.value * 90 }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.tracking, style]} />
  );
}

export function MiniPlayer() {
  const { music } = useApp();
  const {
    currentTrack: track,
    isPlaying,
    playerExpanded,
    playerReady,
    queueUpdating,
    setPlayerExpanded,
    skipTrack,
    togglePlayback,
  } = music;
  const { colors, type } = useColors();
  const styles = useStyles();
  const variant = colors.design.mini;
  const ink =
    variant === 'band'
      ? colors.skin.bandInk ?? colors.text
      : variant === 'cassette'
      ? colors.skin.shellInk ?? colors.text
      : variant === 'ticket'
      ? colors.skin.ink ?? colors.text
      : variant === 'handheld'
      ? colors.skin.bodyInk ?? colors.text
      : variant === 'vhs'
      ? colors.skin.ink ?? colors.text
      : colors.text;
  const shift = useSharedValue(0);
  const busy = useSharedValue(false);
  const inFlight = useRef(false);
  const expand = () => setPlayerExpanded(true);
  const duration = playerMotion.settle;

  async function skip(direction: 'next' | 'previous') {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      if (playerReady && !queueUpdating) await skipTrack(direction);
    } finally {
      inFlight.current = false;
      busy.value = false;
      shift.value = withTiming(0, {
        duration,
        reduceMotion: ReduceMotion.System,
      });
    }
  }

  const horizontal = Gesture.Pan()
    .enabled(playerReady && !queueUpdating)
    .activeOffsetX([-10, 10])
    .failOffsetY([-14, 14])
    .onUpdate(event => {
      if (!busy.value) shift.value = clamp(event.translationX * 0.65, -68, 68);
    })
    .onFinalize((event, success) => {
      if (busy.value) return;
      if (success && acceptsSwipe(event.translationX, event.velocityX, 64)) {
        busy.value = true;
        scheduleOnRN(skip, event.translationX < 0 ? 'next' : 'previous');
      } else {
        shift.value = withTiming(0, {
          duration,
          reduceMotion: ReduceMotion.System,
        });
      }
    });
  const upwards = Gesture.Pan()
    .activeOffsetY(-10)
    .failOffsetX([-14, 14])
    .onEnd((event, success) => {
      if (
        success &&
        event.translationY < 0 &&
        acceptsSwipe(event.translationY, event.velocityY, 36)
      ) {
        scheduleOnRN(expand);
      }
    });
  const artworkStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shift.value }],
  }));

  if (!track) return null;

  return (
    <View style={[styles.dock, styles[variant]]}>
      {variant === 'vhs' ? (
        <>
          <View style={styles.vhsEdge} />
          <TrackingLine active={isPlaying && !playerExpanded} />
        </>
      ) : null}
      <View style={styles.row}>
        <GestureDetector gesture={Gesture.Race(horizontal, upwards)}>
          <View collapsable={false} style={styles.trackArea}>
            <Tap
              accessibilityRole="button"
              accessibilityLabel={`Abrir reproductor: ${track.title} de ${track.artist}`}
              accessibilityHint="Desliza hacia arriba para abrir o a los lados para cambiar de canción"
              onPress={expand}
              style={styles.trackTouch}
            >
              <Animated.View style={[styles.song, artworkStyle]}>
                {variant === 'dog' ? (
                  <ShihTzu
                    active={isPlaying && !playerExpanded}
                    bow={colors.skin.lazo ?? colors.accent}
                    mood={isPlaying ? 'tranquilo' : 'triste'}
                    quiet
                    size={52}
                  />
                ) : variant === 'vinyl' ? (
                  <SpinningRecord
                    playing={isPlaying && !playerExpanded}
                    uri={track.artwork}
                  />
                ) : variant === 'handheld' ? (
                  <View style={styles.bezel}>
                    <Cover size={44} uri={track.artwork} />
                    <View
                      style={[
                        styles.led,
                        isPlaying && {
                          backgroundColor: colors.skin.led ?? colors.accent,
                        },
                      ]}
                    />
                  </View>
                ) : variant === 'orb' ? (
                  <View
                    style={[
                      styles.orbCover,
                      {
                        borderColor: colors.skin.spark ?? colors.accent,
                        boxShadow: `0 0 14px ${
                          colors.skin.aura ?? colors.accent
                        }`,
                      },
                    ]}
                  >
                    <Cover round size={44} uri={track.artwork} />
                  </View>
                ) : variant === 'tiles' ? (
                  <View style={styles.tileCover}>
                    <Cover size={44} uri={track.artwork} />
                  </View>
                ) : variant === 'battery' ? (
                  <View
                    style={[
                      styles.polaroid,
                      { backgroundColor: colors.skin.paper ?? colors.text },
                    ]}
                  >
                    <Cover size={40} uri={track.artwork} />
                  </View>
                ) : variant === 'speedo' ? (
                  <View style={styles.speedoCover}>
                    <Cover size={44} uri={track.artwork} />
                  </View>
                ) : variant === 'vhs' ? (
                  <View style={styles.chroma}>
                    <Cover size={44} uri={track.artwork} />
                  </View>
                ) : variant === 'cockpit' ? (
                  <View style={styles.planet}>
                    <Cover round size={44} uri={track.artwork} />
                  </View>
                ) : (
                  <Cover size={44} uri={track.artwork} />
                )}
                <View style={styles.info}>
                  <Text
                    numberOfLines={1}
                    style={[type.bodyStrong, { color: ink }]}
                  >
                    {track.title}
                  </Text>
                  {variant === 'vhs' ? (
                    <View style={styles.osd}>
                      <VhsCounter playing={isPlaying} />
                      <Text
                        numberOfLines={1}
                        style={[
                          type.caption,
                          styles.osdArtist,
                          { color: colors.skin.sub ?? colors.textSecondary },
                        ]}
                      >
                        {track.artist}
                      </Text>
                    </View>
                  ) : (
                    <Text
                      numberOfLines={1}
                      style={[
                        type.caption,
                        ink !== colors.text && { color: ink },
                      ]}
                    >
                      {track.artist}
                    </Text>
                  )}
                </View>
              </Animated.View>
            </Tap>
          </View>
        </GestureDetector>
        {variant === 'panel' ? (
          // The gutter between two manga panels.
          <Svg height={62} width={12}>
            <Line
              stroke={colors.text}
              strokeWidth={2.5}
              x1={9}
              x2={3}
              y1={0}
              y2={62}
            />
          </Svg>
        ) : null}
        {variant === 'handheld' ? (
          // The round B and A buttons of a handheld console.
          <View style={styles.handButtons}>
            <Pressable
              accessibilityLabel="Siguiente canción"
              accessibilityRole="button"
              disabled={!playerReady || queueUpdating}
              hitSlop={4}
              onPress={() => skip('next')}
              style={[styles.roundButton, styles.bButton]}
            >
              <SkipForward
                color={colors.skin.btnInk ?? colors.onAccent}
                fill={colors.skin.btnInk ?? colors.onAccent}
                size={16}
              />
            </Pressable>
            <Pressable
              accessibilityLabel={isPlaying ? 'Pausar' : 'Reproducir'}
              accessibilityRole="button"
              disabled={!playerReady}
              hitSlop={4}
              onPress={togglePlayback}
              style={[styles.roundButton, styles.aButton]}
            >
              <PlayPauseIcon
                color={colors.skin.btnInk ?? colors.onAccent}
                isPlaying={isPlaying}
                size={20}
              />
            </Pressable>
          </View>
        ) : variant === 'block' ? (
          <Pressable
            accessibilityLabel={isPlaying ? 'Pausar' : 'Reproducir'}
            accessibilityRole="button"
            disabled={!playerReady}
            onPress={togglePlayback}
            style={styles.blockPlay}
          >
            <Text
              style={[
                type.headline,
                { color: colors.skin.onHot ?? colors.onAccent },
              ]}
            >
              {isPlaying ? 'Pausa' : 'Play'}
            </Text>
          </Pressable>
        ) : (
          <IconButton
            disabled={!playerReady}
            label={isPlaying ? 'Pausar' : 'Reproducir'}
            onPress={togglePlayback}
          >
            <PlayPauseIcon color={ink} isPlaying={isPlaying} size={24} />
          </IconButton>
        )}
        {variant === 'handheld' ? null : (
          <IconButton
            disabled={!playerReady || queueUpdating}
            label="Siguiente canción"
            onPress={() => skip('next')}
          >
            <SkipForward color={ink} fill={ink} size={24} />
          </IconButton>
        )}
      </View>
      {playerExpanded ? (
        <View style={styles.progress} />
      ) : variant === 'handheld' ? (
        <MiniBlocks />
      ) : variant === 'speedo' ? (
        <MiniBlocks color={colors.accent} />
      ) : variant === 'battery' ? (
        <MiniBlocks color={colors.skin.battery ?? colors.accent} />
      ) : variant === 'tiles' ? (
        <MiniBlocks color={colors.accent} />
      ) : variant === 'orb' ? (
        <MiniPosition glow />
      ) : variant === 'vhs' ? (
        <MiniSunLine />
      ) : variant === 'starlit' ? (
        <MiniStarLine />
      ) : (
        <MiniPosition glow={variant === 'cockpit'} ink={variant === 'panel'} />
      )}
    </View>
  );
}

const useStyles = createStyles(colors => ({
  dock: {
    marginHorizontal: spacing.sm,
    backgroundColor: colors.surfaceHigh,
    borderRadius: colors.design.radius.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 62,
    paddingRight: spacing.xs,
  },
  trackArea: { flex: 1, minWidth: 0, overflow: 'hidden' },
  trackTouch: {
    minHeight: 60,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  song: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  info: { flex: 1, minWidth: 0, gap: 2 },
  card: {},
  dog: { borderRadius: 40 },
  block: {
    backgroundColor: colors.background,
    borderWidth: colors.design.line,
    borderColor: colors.text,
    marginHorizontal: 0,
  },
  band: { backgroundColor: colors.skin.band ?? colors.surfaceHigh },
  vinyl: {},
  cassette: { backgroundColor: colors.skin.shell ?? colors.surfaceHigh },
  ticket: {
    backgroundColor: colors.skin.paper ?? colors.surfaceHigh,
    borderRightWidth: 0,
  },
  panel: {
    backgroundColor: colors.surfaceHigh,
    borderColor: colors.text,
    borderRadius: 0,
    borderWidth: 2.5,
  },
  cockpit: {
    borderColor: colors.outline,
    borderWidth: 1.5,
  },
  planet: {
    borderRadius: 22,
    boxShadow: `0 0 12px ${colors.accent}`,
  },
  blockPlay: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 92,
    backgroundColor: colors.skin.hot ?? colors.accent,
  },
  progress: { height: 2, backgroundColor: colors.outline },
  progressFill: {
    height: 2,
    backgroundColor: colors.accent,
    transformOrigin: 'left',
  },
  inkProgress: { height: 4, backgroundColor: colors.background },
  inkFill: { height: 4, backgroundColor: colors.text },
  glowFill: { boxShadow: `0 0 8px ${colors.accent}` },
  orb: {
    backgroundColor: colors.surface,
    borderColor: colors.skin.outline ?? colors.outline,
    borderRadius: 14,
    borderWidth: 2,
  },
  orbCover: { borderRadius: 26, borderWidth: 2 },
  tiles: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.skin.frameDark ?? colors.outline,
    borderBottomWidth: 5,
    borderRadius: 14,
    paddingBottom: 8,
  },
  tileCover: {
    borderBottomColor: 'rgba(0,0,0,0.25)',
    borderBottomWidth: 3,
    borderRadius: 6,
    borderTopColor: 'rgba(255,255,255,0.35)',
    borderTopWidth: 2,
    overflow: 'hidden',
  },
  battery: {
    backgroundColor: colors.surface,
    borderColor: colors.outline,
    borderRadius: 4,
    borderWidth: 1,
    paddingBottom: 8,
  },
  polaroid: {
    paddingBottom: 8,
    paddingHorizontal: 3,
    paddingTop: 3,
    transform: [{ rotate: '-4deg' }],
  },
  speedo: {
    backgroundColor: colors.surface,
    borderColor: colors.accent,
    borderRadius: 8,
    borderWidth: 1,
    paddingBottom: 8,
  },
  speedoCover: {
    borderColor: colors.control,
    borderRadius: colors.design.radius.sm,
    borderWidth: 2,
    boxShadow: `0 0 10px ${colors.control}`,
  },
  starlit: {
    backgroundColor: colors.surface,
    borderColor: colors.outline,
    borderRadius: 20,
    borderWidth: 1,
    paddingBottom: 10,
  },
  starTrack: {
    backgroundColor: colors.outline,
    height: 2,
    marginHorizontal: spacing.lg,
  },
  starFill: { backgroundColor: colors.accent, height: 2 },
  starTip: { marginLeft: -7, position: 'absolute', top: -6 },
  handheld: {
    backgroundColor: colors.skin.body ?? colors.surfaceHigh,
    borderColor: colors.skin.bezel ?? colors.outline,
    borderRadius: 0,
    borderWidth: 2,
    paddingBottom: 6,
  },
  bezel: {
    backgroundColor: colors.skin.bezel ?? colors.outline,
    padding: 4,
  },
  led: {
    backgroundColor: colors.skin.bezel ?? colors.outline,
    height: 3,
    left: 1,
    position: 'absolute',
    top: 1,
    width: 3,
  },
  handButtons: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing.xs,
  },
  roundButton: {
    alignItems: 'center',
    borderRadius: 999,
    boxShadow: 'inset -2px -3px 0 rgba(0,0,0,0.25)',
    justifyContent: 'center',
  },
  bButton: {
    backgroundColor: colors.skin.bBtn ?? colors.accent,
    height: 40,
    marginTop: 12,
    width: 40,
  },
  aButton: {
    backgroundColor: colors.skin.aBtn ?? colors.accent,
    height: 46,
    marginTop: -8,
    width: 46,
  },
  blocks: { flexDirection: 'row', gap: 2, paddingHorizontal: spacing.sm },
  blockCell: { flex: 1, height: 6, backgroundColor: 'rgba(0,0,0,0.14)' },
  vhs: {
    backgroundColor: colors.skin.panel ?? colors.surfaceHigh,
    borderColor: colors.skin.line ?? colors.outline,
    borderRadius: 16,
    borderWidth: 1,
    boxShadow: `0 0 18px ${colors.accent}33`,
    paddingBottom: 8,
  },
  vhsEdge: {
    backgroundColor: colors.accent,
    borderLeftColor: colors.skin.chromaA ?? colors.accent,
    borderLeftWidth: 110,
    borderRightColor: colors.skin.chromaB ?? colors.accent,
    borderRightWidth: 110,
    height: 2,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  tracking: {
    backgroundColor: colors.skin.ink ?? colors.text,
    height: 4,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  chroma: {
    borderRadius: colors.design.radius.sm,
    boxShadow: `-2px 0 0 ${colors.skin.chromaA ?? colors.accent}, 2px 0 0 ${
      colors.skin.chromaB ?? colors.accent
    }`,
  },
  osd: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  osdArtist: { flex: 1 },
  sunTrack: {
    backgroundColor: colors.skin.line ?? colors.outline,
    borderRadius: 2,
    height: 3,
    marginHorizontal: spacing.md,
  },
  sunLine: { position: 'absolute', left: 0, top: 0 },
  sunDot: {
    backgroundColor: colors.skin.sun1 ?? colors.accent,
    borderRadius: 5,
    boxShadow: `0 0 8px ${colors.skin.sun1 ?? colors.accent}`,
    height: 9,
    marginLeft: -4,
    position: 'absolute',
    top: -3,
    width: 9,
  },
}));
