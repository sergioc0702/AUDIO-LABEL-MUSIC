import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Line, Path } from 'react-native-svg';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { createStyles, useColors } from '../../theme/theme';
import type { PlayerKit } from './kit';

export type Batch4Kind =
  | 'manga'
  | 'steampunk'
  | 'naveespacial'
  | 'y2k'
  | 'western';

function Frame({
  children,
  label,
  bg,
}: {
  children: React.ReactNode;
  label: string;
  bg: string;
}) {
  const styles = useStyles();
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={[styles.frame, { backgroundColor: bg }]}
    >
      {children}
    </View>
  );
}

function useTrackPulse(kit: PlayerKit, callback: () => void) {
  const last = useRef(kit.track?.id);
  const latest = useRef(callback);
  latest.current = callback;
  useEffect(() => {
    if (
      kit.visible &&
      kit.track?.id &&
      last.current &&
      kit.track.id !== last.current
    )
      latest.current();
    last.current = kit.track?.id;
  }, [kit.track?.id, kit.visible]);
}

function Manga({ kit }: { kit: PlayerKit }) {
  const { colors } = useColors();
  const styles = useStyles();
  const reduced = useReducedMotion();
  const impact = useSharedValue(0);
  const [zap, setZap] = useState(false);
  useTrackPulse(kit, () => {
    setZap(true);
    if (!reduced)
      impact.value = withSequence(
        withTiming(1, { duration: 80, reduceMotion: ReduceMotion.System }),
        withTiming(0, { duration: 210, reduceMotion: ReduceMotion.System }),
      );
  });
  useEffect(() => {
    if (!zap) return;
    const timeout = setTimeout(() => setZap(false), 350);
    return () => clearTimeout(timeout);
  }, [zap]);
  const burst = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 + impact.value * 0.18 },
      { rotate: `${impact.value * -3}deg` },
    ],
  }));
  return (
    <Frame bg={colors.skin.bg} label="Viñeta de manga con líneas de acción">
      <Svg
        height="100%"
        style={styles.absolute}
        viewBox="0 0 320 270"
        width="100%"
      >
        <Path
          d="M0 0H155V130H0ZM165 0H320V130H165ZM0 140H320V270H0Z"
          fill={colors.skin.panel}
          stroke={colors.skin.ink}
          strokeWidth={4}
        />
        <Circle
          cx="160"
          cy="144"
          fill={colors.skin.pop}
          r="77"
          stroke={colors.skin.ink}
          strokeWidth={4}
        />
        {Array.from({ length: 18 }, (_, i) => (
          <Line
            key={i}
            stroke={colors.skin.ink}
            strokeWidth={2}
            x1={160 + Math.cos((i * Math.PI) / 9) * 84}
            x2={160 + Math.cos((i * Math.PI) / 9) * 143}
            y1={144 + Math.sin((i * Math.PI) / 9) * 84}
            y2={144 + Math.sin((i * Math.PI) / 9) * 143}
          />
        ))}
      </Svg>
      <Animated.View style={[styles.burst, burst]}>
        <Text style={[styles.burstText, { color: colors.skin.popInk }]}>
          {zap ? '¡ZAS!' : kit.lively ? '¡PUM!' : '¡TUM!'}
        </Text>
      </Animated.View>
      <Text style={[styles.caption, { color: colors.textSecondary }]}>
        VIÑETA SONORA
      </Text>
    </Frame>
  );
}

function Steampunk({ kit }: { kit: PlayerKit }) {
  const { colors } = useColors();
  const styles = useStyles();
  const spin = useSharedValue(0);
  const reduced = useReducedMotion();
  const last = useRef(kit.track?.id);
  useEffect(() => {
    spin.value =
      kit.visible && kit.lively
        ? withRepeat(
            withTiming(360, {
              duration: 9000,
              reduceMotion: ReduceMotion.System,
            }),
            -1,
            false,
          )
        : withTiming(0, { duration: 300, reduceMotion: ReduceMotion.System });
  }, [kit.lively, kit.visible, spin]);
  useEffect(() => {
    if (
      kit.visible &&
      kit.track?.id &&
      last.current &&
      kit.track.id !== last.current &&
      !reduced
    ) {
      spin.value = withSequence(
        withTiming(360, { duration: 720, reduceMotion: ReduceMotion.System }),
        withTiming(720, { duration: 720, reduceMotion: ReduceMotion.System }),
      );
    }
    last.current = kit.track?.id;
  }, [kit.track?.id, kit.visible, reduced, spin]);
  const gearStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }],
  }));
  return (
    <Frame bg={colors.skin.bg} label="Engranajes y manómetro steampunk">
      <Svg
        height="100%"
        style={styles.absolute}
        viewBox="0 0 320 270"
        width="100%"
      >
        <Circle
          cx="91"
          cy="140"
          fill={colors.skin.metal}
          r="62"
          stroke={colors.skin.metalDark}
          strokeWidth={10}
        />
        <Circle
          cx="91"
          cy="140"
          fill={colors.skin.bg}
          r="18"
          stroke={colors.skin.accent}
          strokeWidth={8}
        />
        <Circle
          cx="220"
          cy="147"
          fill={colors.skin.metalDark}
          r="48"
          stroke={colors.skin.metal}
          strokeWidth={9}
        />
        <Circle
          cx="220"
          cy="147"
          fill={colors.skin.bg}
          r="14"
          stroke={colors.skin.accent}
          strokeWidth={7}
        />
        <Circle
          cx="160"
          cy="76"
          fill={colors.skin.dial}
          r="42"
          stroke={colors.skin.accent}
          strokeWidth={5}
        />
        <Path
          d={`M160 76 L${160 + Math.sin(kit.progress * Math.PI) * 28} ${
            76 - Math.cos(kit.progress * Math.PI) * 28
          }`}
          stroke={colors.skin.dialInk}
          strokeWidth={4}
        />
      </Svg>
      <Animated.View
        style={[styles.gear, gearStyle, { borderColor: colors.skin.metal }]}
      >
        <View
          style={[styles.gearHub, { backgroundColor: colors.skin.metalDark }]}
        />
      </Animated.View>
      <Text style={[styles.caption, { color: colors.textSecondary }]}>
        PRESIÓN · {Math.round(kit.progress * 100)}%
      </Text>
    </Frame>
  );
}

function SpaceCabin({ kit }: { kit: PlayerKit }) {
  const { colors } = useColors();
  const styles = useStyles();
  const reduced = useReducedMotion();
  const hyper = useSharedValue(0);
  const orbit = useSharedValue(0);
  useTrackPulse(kit, () => {
    if (!reduced)
      hyper.value = withSequence(
        withTiming(1, { duration: 120, reduceMotion: ReduceMotion.System }),
        withTiming(0, { duration: 430, reduceMotion: ReduceMotion.System }),
      );
  });
  useEffect(() => {
    orbit.value = kit.lively
      ? withRepeat(
          withTiming(360, {
            duration: 11000,
            reduceMotion: ReduceMotion.System,
          }),
          -1,
          false,
        )
      : withTiming(0, { duration: 400, reduceMotion: ReduceMotion.System });
  }, [kit.lively, orbit]);
  const jump = useAnimatedStyle(() => ({
    opacity: 1 - hyper.value * 0.25,
    transform: [{ scaleX: 1 + hyper.value * 0.14 }],
  }));
  const radar = useAnimatedStyle(() => ({
    transform: [{ rotate: `${orbit.value}deg` }],
  }));
  return (
    <Frame bg={colors.skin.space} label="Ventana de nave espacial con planeta">
      <Animated.View style={[styles.space, jump]}>
        <Svg height="100%" viewBox="0 0 320 270" width="100%">
          {Array.from({ length: 28 }, (_, i) => (
            <Circle
              key={i}
              cx={(i * 79) % 320}
              cy={(i * 43) % 185}
              fill={colors.skin.star}
              r={i % 5 === 0 ? 3 : 1.5}
              opacity={0.45 + (i % 4) * 0.12}
            />
          ))}
          <Circle cx="178" cy="127" fill={colors.skin.planet} r="57" />
          <Path
            d="M128 130Q178 88 228 126Q178 171 128 130Z"
            fill={colors.skin.planet2}
            opacity={0.7}
          />
          <Ellipse
            cx="178"
            cy="132"
            fill="none"
            rx="84"
            ry="24"
            stroke={colors.skin.ring}
            strokeWidth={5}
          />
          <Path d="M0 205H320" stroke={colors.skin.accent} strokeWidth={3} />
        </Svg>
      </Animated.View>
      <Animated.View
        style={[styles.radar, radar, { borderColor: colors.skin.ring }]}
      />
      <Text style={[styles.caption, { color: colors.textSecondary }]}>
        CABINA · SECTOR LOCAL
      </Text>
    </Frame>
  );
}

function Y2K({ kit }: { kit: PlayerKit }) {
  const { colors } = useColors();
  const styles = useStyles();
  const reduced = useReducedMotion();
  const spin = useSharedValue(0);
  const eject = useSharedValue(0);
  useEffect(() => {
    spin.value = kit.lively
      ? withRepeat(
          withTiming(360, {
            duration: 9000,
            reduceMotion: ReduceMotion.System,
          }),
          -1,
          false,
        )
      : withTiming(0, { duration: 400, reduceMotion: ReduceMotion.System });
  }, [kit.lively, spin]);
  useTrackPulse(kit, () => {
    if (!reduced)
      eject.value = withSequence(
        withTiming(1, { duration: 120, reduceMotion: ReduceMotion.System }),
        withTiming(0, { duration: 330, reduceMotion: ReduceMotion.System }),
      );
  });
  const disc = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${spin.value}deg` },
      { translateY: eject.value * -16 },
    ],
    opacity: 1 - eject.value * 0.2,
  }));
  return (
    <Frame bg={colors.skin.bg} label="Disco compacto cromado Y2K">
      <Animated.View
        style={[styles.cd, disc, { borderColor: colors.skin.chrome }]}
      >
        <View
          style={[styles.cdShine, { backgroundColor: colors.skin.holo1 }]}
        />
        <View
          style={[styles.cdShine2, { backgroundColor: colors.skin.holo2 }]}
        />
        <View
          style={[styles.cdShine3, { backgroundColor: colors.skin.holo3 }]}
        />
        <View style={[styles.cdHole, { backgroundColor: colors.skin.bg }]} />
      </Animated.View>
      <Text style={[styles.caption, { color: colors.textSecondary }]}>
        COMPACT DISC · ORIGINAL MIX
      </Text>
    </Frame>
  );
}

function Western({ kit }: { kit: PlayerKit }) {
  const { colors } = useColors();
  const styles = useStyles();
  const reduced = useReducedMotion();
  const shake = useSharedValue(0);
  const tumble = useSharedValue(0);
  useTrackPulse(kit, () => {
    if (!reduced)
      shake.value = withSequence(
        withTiming(1, { duration: 80, reduceMotion: ReduceMotion.System }),
        withTiming(0, { duration: 180, reduceMotion: ReduceMotion.System }),
      );
  });
  useEffect(() => {
    tumble.value = kit.lively
      ? withRepeat(
          withTiming(320, {
            duration: 10000,
            reduceMotion: ReduceMotion.System,
          }),
          -1,
          false,
        )
      : withTiming(0, { duration: 500, reduceMotion: ReduceMotion.System });
  }, [kit.lively, tumble]);
  const sign = useAnimatedStyle(() => ({
    transform: [{ rotate: `${Math.sin(shake.value * 9) * 2}deg` }],
  }));
  const tumbleweed = useAnimatedStyle(() => ({
    transform: [
      { translateX: tumble.value },
      { rotate: `${tumble.value * 2}deg` },
    ],
  }));
  return (
    <Frame
      bg={colors.skin.sky}
      label="Cartel western de se busca en el desierto"
    >
      <Svg
        height="100%"
        style={styles.absolute}
        viewBox="0 0 320 270"
        width="100%"
      >
        <Circle
          cx="245"
          cy={48 + kit.progress * 68}
          fill={colors.skin.sun}
          r="28"
        />
        <Path
          d="M0 178 86 98 155 170 238 88 320 165V270H0Z"
          fill={colors.skin.mesaFar}
        />
        <Path
          d="m0 212 96-72 68 66 77-58 79 56v66H0Z"
          fill={colors.skin.mesa}
        />
        <Path
          d="M65 270V200m0 25-20-15m20 4 19-18m-19 38 22 16"
          fill="none"
          stroke={colors.skin.cactus}
          strokeWidth={8}
        />
      </Svg>
      <Animated.View
        style={[styles.poster, sign, { backgroundColor: colors.skin.poster }]}
      >
        <Text style={[styles.posterTitle, { color: colors.skin.posterInk }]}>
          SE BUSCA
        </Text>
        <Text
          numberOfLines={2}
          style={[styles.posterTrack, { color: colors.skin.posterInk }]}
        >
          {kit.track?.title}
        </Text>
        <Text style={[styles.posterTrack, { color: colors.skin.posterInk }]}>
          RECOMPENSA: UNA CANCIÓN
        </Text>
      </Animated.View>
      <Animated.View
        style={[
          styles.tumbleweed,
          tumbleweed,
          { borderColor: colors.skin.sand },
        ]}
      />
    </Frame>
  );
}

export function Batch4ThemeScene({
  kind,
  kit,
}: {
  kind: Batch4Kind;
  kit: PlayerKit;
}) {
  if (kind === 'manga') return <Manga kit={kit} />;
  if (kind === 'steampunk') return <Steampunk kit={kit} />;
  if (kind === 'naveespacial') return <SpaceCabin kit={kit} />;
  if (kind === 'y2k') return <Y2K kit={kit} />;
  return <Western kit={kit} />;
}

const useStyles = createStyles(colors => ({
  frame: {
    alignSelf: 'center',
    aspectRatio: 1.16,
    borderRadius: colors.design.radius.lg,
    maxHeight: 300,
    overflow: 'hidden',
    width: '100%',
  },
  absolute: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  caption: {
    bottom: 7,
    fontSize: 10,
    left: 5,
    position: 'absolute',
    right: 5,
    textAlign: 'center',
  },
  burst: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    left: 0,
    right: 0,
    top: '40%',
  },
  burstText: {
    fontSize: 28,
    fontWeight: '900',
    textShadowColor: colors.skin.pop,
    textShadowRadius: 8,
  },
  gear: {
    alignItems: 'center',
    borderRadius: 52,
    borderWidth: 4,
    height: 104,
    justifyContent: 'center',
    position: 'absolute',
    right: 26,
    top: 62,
    width: 104,
  },
  gearHub: { borderRadius: 20, height: 40, width: 40 },
  space: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  radar: {
    borderRadius: 60,
    borderStyle: 'dashed',
    borderWidth: 2,
    height: 120,
    position: 'absolute',
    right: 22,
    top: 18,
    width: 120,
  },
  cd: {
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: 120,
    borderWidth: 15,
    height: 210,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 210,
  },
  cdShine: {
    height: 80,
    left: 15,
    opacity: 0.7,
    position: 'absolute',
    top: 6,
    width: 175,
  },
  cdShine2: {
    bottom: 8,
    height: 68,
    opacity: 0.6,
    position: 'absolute',
    right: 0,
    width: 156,
  },
  cdShine3: {
    bottom: 20,
    height: 70,
    opacity: 0.35,
    position: 'absolute',
    left: 30,
    width: 130,
  },
  cdHole: { borderRadius: 16, height: 32, width: 32 },
  poster: {
    alignItems: 'center',
    alignSelf: 'center',
    borderColor: colors.skin.posterInk,
    borderWidth: 3,
    justifyContent: 'center',
    maxWidth: 220,
    minHeight: 138,
    padding: 10,
    transform: [{ rotate: '-2deg' }],
    width: '72%',
  },
  posterTitle: { fontSize: 20, fontWeight: '900' },
  posterTrack: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 5,
    textAlign: 'center',
  },
  tumbleweed: {
    borderRadius: 22,
    borderStyle: 'dashed',
    borderWidth: 4,
    bottom: 22,
    height: 34,
    left: 0,
    position: 'absolute',
    width: 34,
  },
}));
