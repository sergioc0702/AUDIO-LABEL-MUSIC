import { useEffect, useRef } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { createStyles, useColors } from '../../theme/theme';
import type { PlayerKit } from './kit';

export type Batch5Kind = 'fantasiamedieval' | 'lofi' | 'terrorgotico' | 'playa';

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

function Fantasy({ kit }: { kit: PlayerKit }) {
  const { colors } = useColors();
  const styles = useStyles();
  const reduced = useReducedMotion();
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = kit.lively
      ? withRepeat(
          withTiming(1.07, {
            duration: 1500,
            reduceMotion: ReduceMotion.System,
          }),
          -1,
          true,
        )
      : withTiming(1, { duration: 300, reduceMotion: ReduceMotion.System });
  }, [kit.lively, pulse]);
  useTrackPulse(kit, () => {
    if (!reduced)
      pulse.value = withSequence(
        withTiming(1.2, { duration: 100, reduceMotion: ReduceMotion.System }),
        withTiming(1, { duration: 350, reduceMotion: ReduceMotion.System }),
      );
  });
  const orb = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  const runeRotation = useSharedValue(0);
  useEffect(() => {
    runeRotation.value =
      kit.visible && kit.lively
        ? withRepeat(
            withTiming(360, {
              duration: 24000,
              reduceMotion: ReduceMotion.System,
            }),
            -1,
            false,
          )
        : withTiming(0, { duration: 400, reduceMotion: ReduceMotion.System });
  }, [kit.lively, kit.visible, runeRotation]);
  const runes = useAnimatedStyle(() => ({
    transform: [{ rotate: `${runeRotation.value}deg` }],
  }));
  return (
    <Frame
      bg={colors.skin.bg}
      label="Orbe de fantasía medieval rodeado de runas"
    >
      <Animated.View
        style={[styles.runeRing, runes, { borderColor: colors.skin.rune }]}
      >
        <Text style={[styles.rune, { color: colors.skin.rune }]}>
          ᚱ · ✧ · ᚠ · ✦ · ᛟ · ✧
        </Text>
      </Animated.View>
      <Animated.View
        style={[styles.orb, orb, { backgroundColor: colors.skin.orb }]}
      >
        <View
          style={[styles.orbHighlight, { backgroundColor: colors.skin.spark }]}
        />
      </Animated.View>
      <Text
        numberOfLines={1}
        style={[styles.caption, { color: colors.textSecondary }]}
      >
        ✧ {kit.track?.title} ✧
      </Text>
      <Svg
        height="100%"
        style={styles.absolute}
        viewBox="0 0 320 270"
        width="100%"
      >
        {[0, 1, 2, 3, 4, 5].map(i => (
          <Circle
            key={i}
            cx={42 + i * 46}
            cy={42 + (i % 2) * 170}
            fill={colors.skin.spark}
            r={2 + (i % 2)}
            opacity={0.65}
          />
        ))}
      </Svg>
    </Frame>
  );
}

function Lofi({ kit }: { kit: PlayerKit }) {
  const { colors } = useColors();
  const styles = useStyles();
  const reduced = useReducedMotion();
  const lamp = useSharedValue(1);
  useTrackPulse(kit, () => {
    if (!reduced)
      lamp.value = withSequence(
        withTiming(0.25, { duration: 85, reduceMotion: ReduceMotion.System }),
        withTiming(1, { duration: 280, reduceMotion: ReduceMotion.System }),
      );
  });
  const lampStyle = useAnimatedStyle(() => ({ opacity: lamp.value }));
  return (
    <Frame
      bg={colors.skin.night}
      label="Habitación lo-fi con lluvia en la ventana"
    >
      <Svg
        height="100%"
        style={styles.absolute}
        viewBox="0 0 320 270"
        width="100%"
      >
        <Rect fill={colors.skin.city} height="137" width="320" y="0" />
        {Array.from({ length: 18 }, (_, i) => (
          <Rect
            key={`light-${i}`}
            fill={colors.skin.lights}
            height={5}
            opacity={kit.lively ? 0.8 : 0.42}
            width={5}
            x={(i * 47) % 310}
            y={25 + ((i * 33) % 104)}
          />
        ))}
        {Array.from({ length: 17 }, (_, i) => (
          <Line
            key={`rain-${i}`}
            stroke={colors.skin.rain}
            strokeOpacity={0.38}
            strokeWidth={1.5}
            x1={i * 21}
            x2={i * 21 - 8}
            y1={0}
            y2={130}
          />
        ))}
        <Rect fill={colors.skin.desk} height="70" width="320" y="200" />
        <Path d="M211 200V56L244 38 278 57V200" fill={colors.skin.wall} />
        <Path d="M45 200V155L73 138 101 155V200" fill={colors.skin.wall} />
      </Svg>
      <Animated.View
        style={[styles.lamp, lampStyle, { backgroundColor: colors.skin.lamp }]}
      />
      <View style={[styles.mug, { backgroundColor: colors.skin.mug }]} />
      <View style={[styles.plantPot, { backgroundColor: colors.skin.plant }]} />
      <Text style={[styles.caption, { color: colors.textSecondary }]}>
        RAINY EVENING · LOCAL RADIO
      </Text>
    </Frame>
  );
}

function Gothic({ kit }: { kit: PlayerKit }) {
  const { colors } = useColors();
  const styles = useStyles();
  const reduced = useReducedMotion();
  const lightning = useSharedValue(0);
  useTrackPulse(kit, () => {
    if (!reduced)
      lightning.value = withSequence(
        withTiming(1, { duration: 65, reduceMotion: ReduceMotion.System }),
        withTiming(0, { duration: 240, reduceMotion: ReduceMotion.System }),
      );
  });
  const bolt = useAnimatedStyle(() => ({ opacity: lightning.value }));
  return (
    <Frame bg={colors.skin.sky} label="Castillo gótico bajo la luna">
      <Svg
        height="100%"
        style={styles.absolute}
        viewBox="0 0 320 270"
        width="100%"
      >
        <Circle cx="248" cy="48" fill={colors.skin.moon} r="30" />
        <Path
          d="M0 225V118L48 84 90 118V95L137 57 184 95V128L226 93 272 128V82L320 118V270H0Z"
          fill={colors.skin.castle}
        />
        <Path
          d="M43 270V175Q65 140 87 175V270M127 270V150Q160 110 193 150V270M235 270V176Q256 141 277 176V270"
          fill={colors.skin.sky}
        />
        {kit.isPlaying ? (
          <>
            <Path
              d="M72 236Q60 213 73 201Q88 218 72 236Z"
              fill={colors.skin.flame}
            />
            <Path
              d="M248 236Q237 214 249 201Q264 218 248 236Z"
              fill={colors.skin.flame}
            />
          </>
        ) : null}
        {Array.from({ length: 3 }, (_, i) => (
          <Path
            key={i}
            d={`M${54 + i * 94} ${48 + i * 20}q9-9 18 0q9-9 18 0`}
            fill="none"
            stroke={colors.skin.bat}
            strokeWidth={3}
          />
        ))}
        <Path
          d="M0 185Q75 168 150 184T320 179V226Q240 212 160 226T0 220Z"
          fill={colors.skin.fog}
          opacity={0.38}
        />
      </Svg>
      <Animated.View pointerEvents="none" style={[styles.lightning, bolt]}>
        <Svg height="105" width="72" viewBox="0 0 72 105">
          <Path
            d="M41 0 12 57 35 51 22 105 62 41 39 47Z"
            fill={colors.skin.flame}
          />
        </Svg>
      </Animated.View>
      {!kit.isPlaying ? (
        <View style={[styles.smoke, { backgroundColor: colors.skin.fog }]} />
      ) : null}
      <Text style={[styles.caption, { color: colors.textSecondary }]}>
        {kit.isPlaying ? 'VELAS ENCENDIDAS' : 'LAS VELAS DESCANSAN'}
      </Text>
    </Frame>
  );
}

function Beach({ kit }: { kit: PlayerKit }) {
  const { colors } = useColors();
  const styles = useStyles();
  const reduced = useReducedMotion();
  const swell = useSharedValue(0);
  const gulls = useSharedValue(0);
  useTrackPulse(kit, () => {
    if (!reduced)
      swell.value = withSequence(
        withTiming(1, { duration: 220, reduceMotion: ReduceMotion.System }),
        withTiming(0, { duration: 480, reduceMotion: ReduceMotion.System }),
      );
  });
  useEffect(() => {
    gulls.value =
      kit.visible && kit.lively
        ? withRepeat(
            withTiming(1, {
              duration: 3100,
              reduceMotion: ReduceMotion.System,
            }),
            -1,
            true,
          )
        : withTiming(0, { duration: 300, reduceMotion: ReduceMotion.System });
  }, [gulls, kit.lively, kit.visible]);
  const wave = useAnimatedStyle(() => ({
    transform: [
      { translateY: swell.value * -8 },
      { scaleX: 1 + swell.value * 0.06 },
    ],
  }));
  const fly = useAnimatedStyle(() => ({
    transform: [{ translateX: gulls.value * 72 }],
  }));
  return (
    <Frame bg={colors.skin.sky} label="Playa con olas y velero">
      <Svg
        height="100%"
        style={styles.absolute}
        viewBox="0 0 320 270"
        width="100%"
      >
        <Circle
          cx="255"
          cy={55 + kit.progress * 45}
          fill={colors.skin.sun}
          r="30"
        />
        <Path d="M0 130Q70 105 160 132T320 127V270H0Z" fill={colors.skin.sea} />
        <Path
          d="M0 166Q80 137 160 164T320 159V270H0Z"
          fill={colors.skin.seaDeep}
        />
        <Path
          d="M0 202Q80 183 160 204T320 199V270H0Z"
          fill={colors.skin.sand}
        />
        <Path d="M145 142 177 142 170 103Z" fill={colors.skin.boat} />
        <Path d="M172 98V148" stroke={colors.skin.ink} strokeWidth={3} />
      </Svg>
      <Animated.View style={[styles.gulls, fly]}>
        <Svg height="45" width="110" viewBox="0 0 110 45">
          <Path
            d="M3 28Q15 15 27 28Q39 15 51 28M59 17Q70 6 81 17Q92 6 103 17"
            fill="none"
            stroke={colors.skin.bird}
            strokeWidth={3}
          />
        </Svg>
      </Animated.View>
      <Animated.View
        style={[styles.foam, wave, { backgroundColor: colors.skin.foam }]}
      />
      <Text style={[styles.caption, { color: colors.textSecondary }]}>
        OLA #{Math.ceil(kit.progress * 10)}
      </Text>
    </Frame>
  );
}

export function Batch5ThemeScene({
  kind,
  kit,
}: {
  kind: Batch5Kind;
  kit: PlayerKit;
}) {
  if (kind === 'fantasiamedieval') return <Fantasy kit={kit} />;
  if (kind === 'lofi') return <Lofi kit={kit} />;
  if (kind === 'terrorgotico') return <Gothic kit={kit} />;
  return <Beach kit={kit} />;
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
  runeRing: {
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: 100,
    borderStyle: 'dashed',
    borderWidth: 3,
    height: 174,
    justifyContent: 'center',
    marginTop: 14,
    width: 174,
  },
  rune: { fontSize: 10 },
  orb: {
    alignItems: 'center',
    borderRadius: 48,
    height: 86,
    justifyContent: 'flex-start',
    paddingTop: 16,
    position: 'absolute',
    top: 60,
    width: 86,
  },
  orbHighlight: {
    borderRadius: 8,
    height: 17,
    opacity: 0.7,
    transform: [{ rotate: '-30deg' }],
    width: 23,
  },
  lamp: {
    borderRadius: 32,
    height: 54,
    position: 'absolute',
    right: 38,
    top: 45,
    width: 54,
  },
  mug: {
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    bottom: 27,
    height: 40,
    left: 44,
    position: 'absolute',
    width: 46,
  },
  plantPot: {
    bottom: 28,
    height: 40,
    position: 'absolute',
    right: 46,
    width: 35,
  },
  lightning: { position: 'absolute', right: '25%', top: 8 },
  smoke: {
    borderRadius: 16,
    bottom: 54,
    height: 17,
    left: 50,
    opacity: 0.45,
    position: 'absolute',
    width: 17,
  },
  gulls: { left: 20, position: 'absolute', top: 30 },
  foam: {
    borderTopLeftRadius: 80,
    borderTopRightRadius: 80,
    bottom: 52,
    height: 12,
    left: 0,
    position: 'absolute',
    right: 0,
  },
}));
