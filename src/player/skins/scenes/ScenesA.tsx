import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  Path,
  Rect,
} from 'react-native-svg';
import { useMediaVolume } from '../../../hooks/useMediaVolume';
import { createStyles, useColors } from '../../../theme/theme';
import type { PlayerKit } from '../kit';
import {
  AnimatedCircle,
  AnimatedPath,
  AnimatedRect,
  H,
  Layer,
  SceneBox,
  W,
  clamp01,
  list,
  noise,
  place,
  useSceneClock,
  type SceneClock,
} from './common';

/* ───────────────────────── Acuario ───────────────────────── */

const FISH = [
  { range: 92, base: 92, speed: 0.45, phase: 0 },
  { range: 66, base: 140, speed: 0.6, phase: 2.1 },
  { range: 100, base: 180, speed: 0.35, phase: 4.2 },
];
const BUBBLES = [58, 92, 132, 176, 204, 238, 262];

function wave(y: number, shift: number, amp: number) {
  'worklet';
  let d = 'M' + (-80 + shift) + ' ' + y;
  let a = amp;
  for (let x = -80; x < 400; x += 40) {
    d +=
      ' Q ' +
      (x + 20 + shift) +
      ' ' +
      (y - a) +
      ' ' +
      (x + 40 + shift) +
      ' ' +
      y;
    a = -a;
  }
  return d + ' V ' + (H + 10) + ' H ' + (-80 + shift) + ' Z';
}

function flowOf(clock: SceneClock) {
  'worklet';
  return clock.wall.value * 2 + clock.run.value * 8;
}

function Fish({
  clock,
  index,
  color,
  ink,
}: {
  clock: SceneClock;
  index: number;
  color: string;
  ink: string;
}) {
  const f = FISH[index];
  const style = useAnimatedStyle(() => {
    const a = clock.run.value * f.speed + f.phase;
    const lively = clock.play.value;
    const bob =
      Math.sin(clock.wall.value * (0.3 + 0.6 * lively) + index) *
      (2 + 4 * lively);
    const x = W / 2 - 28 + Math.sin(a) * f.range;
    const y = f.base - 17 + Math.sin(a * 1.7) * 9 + bob;
    return {
      transform: [
        { translateX: x * clock.unit.value },
        { translateY: y * clock.unit.value },
        { scaleX: Math.cos(a) >= 0 ? 1 : -1 },
        { rotate: `${Math.cos(a * 1.7) * 8 * lively}deg` },
      ],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[place(0, 0, 56, 35), style]}>
      <Svg height="100%" viewBox="0 0 64 40" width="100%">
        <Path d="M14 20 L0 8 L3 20 L0 32 Z" fill={color} />
        <Ellipse cx={34} cy={20} fill={color} rx={22} ry={13} />
        <Path d="M30 8 Q 36 2 42 8" fill={color} />
        <Circle cx={46} cy={17} fill={ink} r={3.2} />
        <Path
          d="M26 12 Q 30 20 26 28"
          fill="none"
          opacity={0.35}
          stroke={ink}
          strokeWidth={1.6}
        />
      </Svg>
    </Animated.View>
  );
}

function Bubble({
  clock,
  index,
  color,
}: {
  clock: SceneClock;
  index: number;
  color: string;
}) {
  const props = useAnimatedProps(() => {
    const speed = 1 + (index % 3) * 0.3;
    const y =
      238 -
      ((clock.wall.value * 5 + clock.run.value * 22 * speed + index * 47) %
        190);
    return {
      cx: BUBBLES[index] + Math.sin(clock.wall.value + index) * 4,
      cy: y,
      opacity: clamp01((y - 50) / 50) * 0.9,
    };
  });
  return (
    <AnimatedCircle
      animatedProps={props}
      fill="none"
      r={4 + (index % 3) * 2.5}
      stroke={color}
      strokeWidth={2}
    />
  );
}

function Plant({
  clock,
  x,
  h,
  k,
  width,
  color,
}: {
  clock: SceneClock;
  x: number;
  h: number;
  k: number;
  width: number;
  color: string;
}) {
  const props = useAnimatedProps(() => {
    const sway =
      Math.sin(flowOf(clock) * 0.08 + k) * (6 + 12 * clock.play.value);
    return {
      d:
        'M' +
        x +
        ' 250 Q ' +
        (x + sway * 0.6) +
        ' ' +
        (250 - h / 2) +
        ' ' +
        (x + sway) +
        ' ' +
        (250 - h),
    };
  });
  return (
    <AnimatedPath
      animatedProps={props}
      fill="none"
      stroke={color}
      strokeLinecap="round"
      strokeWidth={width}
    />
  );
}

function AquariumScene({ kit }: { kit: PlayerKit }) {
  const { colors } = useColors();
  const s = colors.skin;
  const clock = useSceneClock(kit, { boost: 3 });
  const fish = list(s.fish, ['#ff7a3d', '#ffd04a', '#ff5c8a']);
  const water = useAnimatedProps(() => ({
    d: wave(50, (flowOf(clock) * 1.6) % 80, 7),
  }));
  const back = useAnimatedProps(() => ({
    d: wave(62, -((flowOf(clock) * 1.1) % 80), 5),
  }));
  return (
    <SceneBox
      background={s.bg ?? colors.background}
      clock={clock}
      label="Pecera con peces que nadan al ritmo de la música"
    >
      <Layer>
        <Defs>
          <ClipPath id="aq-bowl">
            <Circle cx={160} cy={146} r={128} />
          </ClipPath>
        </Defs>
        <Circle cx={160} cy={146} fill={s.glass} r={128} />
        <G clipPath="url(#aq-bowl)">
          <AnimatedPath animatedProps={water} fill={s.water} />
          <AnimatedPath animatedProps={back} fill={s.deep} opacity={0.35} />
          <Path d="M0 252 Q 80 222 160 236 T 320 226 V276 H0 Z" fill={s.sand} />
          <Circle cx={222} cy={244} fill={s.deep} opacity={0.55} r={14} />
          <Circle cx={242} cy={250} fill={s.deep} opacity={0.4} r={9} />
          <Plant
            clock={clock}
            color={s.plant}
            h={104}
            k={0}
            width={10}
            x={74}
          />
          <Plant
            clock={clock}
            color={s.plant}
            h={70}
            k={1.3}
            width={7}
            x={96}
          />
          <Plant
            clock={clock}
            color={s.plant}
            h={92}
            k={2.4}
            width={8}
            x={256}
          />
          {BUBBLES.map((_, index) => (
            <Bubble
              key={index}
              clock={clock}
              color={s.bubble ?? '#ffffff'}
              index={index}
            />
          ))}
        </G>
        <Ellipse
          cx={160}
          cy={24}
          fill="none"
          opacity={0.5}
          rx={80}
          ry={10}
          stroke={s.deep}
          strokeWidth={4}
        />
        <Path
          d="M62 96 Q 72 64 104 48"
          fill="none"
          opacity={0.5}
          stroke="#ffffff"
          strokeLinecap="round"
          strokeWidth={6}
        />
      </Layer>
      {fish.slice(0, 3).map((color, index) => (
        <Fish
          key={index}
          clock={clock}
          color={color}
          index={index}
          ink={s.ink ?? colors.text}
        />
      ))}
    </SceneBox>
  );
}

/* ───────────────────────── Radio de bulbos ───────────────────────── */

const DIAL_X0 = 40;
const DIAL_X1 = 280;

function Tube({
  clock,
  index,
  x,
  color,
}: {
  clock: SceneClock;
  index: number;
  x: number;
  color: string;
}) {
  const glow = useAnimatedProps(() => {
    const live = clock.play.value;
    const tuning = clock.change.value;
    const flick = noise(index * 5 + Math.floor(clock.wall.value * 5));
    const o =
      0.18 +
      live * (0.52 + flick * 0.3) +
      tuning * noise(index + clock.wall.value * 30) * 0.4;
    return { opacity: clamp01(o) };
  });
  const halo = useAnimatedProps(() => ({
    opacity: clamp01(
      (0.1 + clock.play.value * 0.3) *
        (0.8 + noise(index + Math.floor(clock.wall.value * 5)) * 0.4),
    ),
  }));
  return (
    <>
      <AnimatedRect
        animatedProps={halo}
        fill={color}
        height={66}
        rx={20}
        width={42}
        x={x - 8}
        y={124}
      />
      <AnimatedRect
        animatedProps={glow}
        fill={color}
        height={50}
        rx={13}
        width={26}
        x={x}
        y={132}
      />
    </>
  );
}

function RadioScene({ kit }: { kit: PlayerKit }) {
  const { colors } = useColors();
  const styles = useStyles();
  const s = colors.skin;
  const clock = useSceneClock(kit, { boost: 1, changeSeconds: 1 });
  const count = Math.max(1, kit.queueCount);
  const stationX = (i: number) =>
    DIAL_X0 +
    (count > 1
      ? (Math.max(0, i) / (count - 1)) * (DIAL_X1 - DIAL_X0)
      : (DIAL_X1 - DIAL_X0) / 2);
  const needle = useSharedValue(stationX(kit.queueIndex));
  const [tuning, setTuning] = useState(false);
  useEffect(() => {
    const to = stationX(kit.queueIndex);
    if (clock.reduced) {
      needle.value = to;
      return;
    }
    setTuning(true);
    needle.value = withTiming(to, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
    const timer = setTimeout(() => setTuning(false), 900);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kit.queueIndex, count]);
  const needleProps = useAnimatedProps(() => ({ x: needle.value - 1.5 }));
  const eye = useAnimatedProps(() => {
    const signal =
      clock.play.value *
        (0.45 + noise(Math.floor(clock.wall.value * 5) * 3.1) * 0.55) +
      clock.change.value * noise(clock.wall.value * 20) * 0.3;
    const open = (20 + signal * 110) * (Math.PI / 180);
    const r = 20;
    const a0 = -Math.PI / 2 - open / 2;
    const a1 = -Math.PI / 2 + open / 2;
    return {
      d:
        'M160 157 L ' +
        (160 + Math.cos(a0) * r) +
        ' ' +
        (157 + Math.sin(a0) * r) +
        ' A ' +
        r +
        ' ' +
        r +
        ' 0 0 1 ' +
        (160 + Math.cos(a1) * r) +
        ' ' +
        (157 + Math.sin(a1) * r) +
        ' Z',
    };
  });
  const marks = Array.from({ length: Math.min(count, 12) }, (_, n) =>
    count > 12 ? Math.round((n / 11) * (count - 1)) : n,
  );
  return (
    <SceneBox
      background={s.cabinet ?? colors.surface}
      clock={clock}
      label="Radio de bulbos"
      radius={24}
    >
      <Layer>
        <Defs>
          <ClipPath id="radio-grille">
            <Path d="M40 118 V 70 A 120 60 0 0 1 280 70 V 118 Z" />
          </ClipPath>
        </Defs>
        <Rect
          fill="none"
          height={270}
          rx={22}
          stroke={s.cabinetDark}
          strokeWidth={6}
          width={314}
          x={3}
          y={3}
        />
        <G clipPath="url(#radio-grille)">
          <Rect fill={s.grille} height={110} width={240} x={40} y={8} />
          {Array.from({ length: 30 }, (_, i) => (
            <Rect
              key={i}
              fill={s.grilleLine}
              height={110}
              width={2}
              x={46 + i * 8}
              y={8}
            />
          ))}
          <Rect
            fill={s.cabinetDark}
            height={2}
            opacity={0.6}
            width={240}
            x={40}
            y={86}
          />
        </G>
        <Tube clock={clock} color={s.glow ?? colors.accent} index={0} x={62} />
        <Tube clock={clock} color={s.glow ?? colors.accent} index={1} x={102} />
        <Circle cx={160} cy={157} fill={s.cabinetDark} r={24} />
        <Circle cx={160} cy={157} fill={s.eye ?? '#7be0a0'} r={20} />
        <AnimatedPath animatedProps={eye} fill={s.cabinetDark} />
        <Tube clock={clock} color={s.glow ?? colors.accent} index={2} x={192} />
        <Tube clock={clock} color={s.glow ?? colors.accent} index={3} x={232} />
        <Rect
          fill={s.dial}
          height={72}
          rx={10}
          stroke={s.cabinetDark}
          strokeWidth={3}
          width={276}
          x={22}
          y={194}
        />
        {Array.from({ length: 25 }, (_, i) => (
          <Rect
            key={i}
            fill={s.dialInk}
            height={i % 4 ? 7 : 12}
            opacity={0.6}
            width={1}
            x={DIAL_X0 + i * 10}
            y={202}
          />
        ))}
        {marks.map(n => (
          <Circle
            key={n}
            cx={stationX(n)}
            cy={232}
            fill={n === kit.queueIndex ? s.needle : s.dialInk}
            r={n === kit.queueIndex ? 5 : 3}
          />
        ))}
        <AnimatedRect
          animatedProps={needleProps}
          fill={s.needle}
          height={64}
          width={3}
          y={198}
        />
      </Layer>
      <View
        pointerEvents="none"
        style={[place(30, 238, 260, 24), styles.center]}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.dialText,
            { color: s.dialInk, fontFamily: colors.design.fonts.body },
          ]}
        >
          {tuning
            ? 'Sintonizando…'
            : `${(89.3 + (Math.max(0, kit.queueIndex) % 40) * 0.4).toFixed(
                1,
              )} FM · ${kit.track?.title ?? ''}`}
        </Text>
      </View>
      <Pressable
        accessibilityLabel="Dial de estaciones. Toca para sintonizar la siguiente canción"
        accessibilityRole="button"
        onPress={kit.next}
        style={place(22, 194, 276, 72)}
      />
    </SceneBox>
  );
}

/* ───────────────────────── Pixel ───────────────────────── */

const BODY = [
  '....#.......',
  '.....#......',
  '...######...',
  '..########..',
  '.##..##..##.',
  '.##########.',
  '.##########.',
  '.###....###.',
  '..########..',
  '...######...',
];
const FEET = [
  ['..##....##..', '.##......##.'],
  ['...##..##...', '...##..##...'],
];
const BLANK = '............';

function sprite(rows: string[]) {
  let d = '';
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) {
      if (row[x] === '#') d += 'M' + x + ' ' + y + 'h1v1h-1z';
    }
  });
  return d;
}

const SPRITES = {
  walkA: sprite([...BODY, ...FEET[0]]),
  walkB: sprite([...BODY, ...FEET[1]]),
  sit: sprite([BLANK, BLANK, ...BODY]),
  blink: sprite([
    ...BODY.map((row, y) => (y === 4 ? '.##########.' : row)),
    ...FEET[0],
  ]),
};

function PixelBar({
  clock,
  index,
  color,
}: {
  clock: SceneClock;
  index: number;
  color: string;
}) {
  const props = useAnimatedProps(() => {
    const beat = Math.floor(clock.wall.value * 5);
    const live = clock.play.value > 0.5;
    const steps = live ? 1 + Math.floor(noise(index * 7 + beat) * 9) : 1;
    const h = steps * 13;
    return { height: h, y: 206 - h };
  });
  return (
    <AnimatedRect
      animatedProps={props}
      fill={color}
      width={16}
      x={14 + index * 23}
    />
  );
}

function PixelNote({
  clock,
  k,
  color,
}: {
  clock: SceneClock;
  k: number;
  color: string;
}) {
  const style = useAnimatedStyle(() => {
    const life = ((clock.run.value * 10 + k * 15) % 30) / 30;
    return {
      opacity: clock.play.value > 0.5 ? 1 - life : 0,
      transform: [
        {
          translateX:
            (196 + k * 26 + ((life * 30) % 6 < 3 ? 0 : 5)) * clock.unit.value,
        },
        { translateY: (120 - life * 90) * clock.unit.value },
      ],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[place(0, 0, 20, 25), style]}>
      <Svg height="100%" viewBox="0 0 4 5" width="100%">
        <Path d="M2 0h2v1H3v3H2V4H0V3h2z" fill={color} />
      </Svg>
    </Animated.View>
  );
}

function PixelScene({ kit }: { kit: PlayerKit }) {
  const { colors } = useColors();
  const styles = useStyles();
  const s = colors.skin;
  const clock = useSceneClock(kit, { boost: 0, changeSeconds: 1.6 });
  const hero = useAnimatedProps(() => {
    if (clock.play.value < 0.5) return { d: SPRITES.sit };
    if (clock.wall.value % 4 < 0.2) return { d: SPRITES.blink };
    return {
      d: Math.floor(clock.run.value * 3.3) % 2 ? SPRITES.walkB : SPRITES.walkA,
    };
  });
  const heroStyle = useAnimatedStyle(() => {
    const c = clock.change.value;
    const jump = c > 0.5 ? Math.sin(((1 - c) / 0.5) * Math.PI) * 50 : 0;
    const step =
      clock.play.value > 0.5 && Math.floor(clock.run.value * 3.3) % 2 ? -5 : 0;
    return { transform: [{ translateY: (step - jump) * clock.unit.value }] };
  });
  const ground = useAnimatedStyle(() => ({
    transform: [
      { translateX: -((clock.run.value * 40) % 28) * clock.unit.value },
    ],
  }));
  const pause = useAnimatedStyle(() => ({
    opacity:
      clock.play.value < 0.5 && clock.change.value === 0
        ? Math.floor(clock.wall.value * 1.6) % 2
          ? 0
          : 1
        : 0,
  }));
  const banner = useAnimatedStyle(() => ({
    opacity: clock.change.value > 0 ? 1 : 0,
  }));
  const font = colors.design.fonts.display;
  return (
    <SceneBox
      background={s.screen ?? colors.surface}
      clock={clock}
      label="Pantalla de videojuego con un personaje que camina"
      radius={0}
    >
      <Layer>
        {Array.from({ length: 13 }, (_, i) => (
          <PixelBar
            key={i}
            clock={clock}
            color={s.s1 ?? colors.surfaceHigh}
            index={i}
          />
        ))}
        <Rect fill={s.s2} height={64} width={W} x={0} y={212} />
        <Rect
          fill="none"
          height={H - 6}
          stroke={s.ink}
          strokeWidth={6}
          width={W - 6}
          x={3}
          y={3}
        />
      </Layer>
      <Animated.View
        pointerEvents="none"
        style={[place(0, 212, W + 56, 8), ground]}
      >
        <Svg height="100%" viewBox={`0 0 ${W + 56} 8`} width="100%">
          {Array.from({ length: 14 }, (_, i) => (
            <Rect key={i} fill={s.ink} height={8} width={8} x={i * 28} y={0} />
          ))}
        </Svg>
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[place(124, 140, 72, 72), heroStyle]}
      >
        <Svg height="100%" viewBox="0 0 12 12" width="100%">
          <AnimatedPath animatedProps={hero} fill={s.ink} />
        </Svg>
      </Animated.View>
      <PixelNote clock={clock} color={s.s2 ?? colors.text} k={0} />
      <PixelNote clock={clock} color={s.s2 ?? colors.text} k={1} />
      <Animated.View
        pointerEvents="none"
        style={[place(0, 40, W, 40), styles.center, banner]}
      >
        <Text style={[styles.pixelBanner, { color: s.ink, fontFamily: font }]}>
          NIVEL {kit.queueIndex + 1}
        </Text>
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[place(0, 40, W, 40), styles.center, pause]}
      >
        <Text style={[styles.pixelBanner, { color: s.ink, fontFamily: font }]}>
          PAUSA
        </Text>
      </Animated.View>
    </SceneBox>
  );
}

/* ───────────────────────── Acuarela ───────────────────────── */

function blobPath(
  cx: number,
  cy: number,
  r: number,
  seed: number,
  t: number,
  wobble: number,
) {
  'worklet';
  const n = 9;
  const pts: number[][] = [];
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    const k =
      1 +
      (noise(seed * 7 + i) - 0.5) * 0.28 +
      Math.sin(t * 0.7 + i * 1.7 + seed) * wobble;
    pts.push([cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k]);
  }
  let d = '';
  for (let i = 0; i < n; i += 1) {
    const p = pts[i];
    const q = pts[(i + 1) % n];
    const mx = (p[0] + q[0]) / 2;
    const my = (p[1] + q[1]) / 2;
    d +=
      i === 0
        ? 'M' + mx + ' ' + my
        : ' Q ' + p[0] + ' ' + p[1] + ' ' + mx + ' ' + my;
  }
  const p = pts[0];
  const q = pts[1];
  return (
    d +
    ' Q ' +
    p[0] +
    ' ' +
    p[1] +
    ' ' +
    (p[0] + q[0]) / 2 +
    ' ' +
    (p[1] + q[1]) / 2 +
    ' Z'
  );
}

type BlobSpec = { x: number; y: number; r: number; speed: number };

function layoutFor(seed: number): BlobSpec[] {
  return Array.from({ length: 5 }, (_, n) => ({
    x: 60 + noise(seed * 31 + n * 7.3) * 200,
    y: 56 + noise(seed * 17 + n * 3.1 + 0.5) * 164,
    r: 46 + noise(seed * 11 + n * 5.7) * 46,
    speed: 0.4 + noise(n * 9.1) * 0.5,
  }));
}

type BlobProps = {
  clock: SceneClock;
  spec: BlobSpec;
  seed: number;
  color: string;
  wet: SharedValue<number>;
};

function blobShape(
  clock: SceneClock,
  spec: BlobSpec,
  seed: number,
  wet: SharedValue<number>,
  scale: number,
) {
  'worklet';
  const t = clock.wall.value * 0.3 + clock.run.value;
  const grow = 1 - Math.pow(clock.change.value, 3);
  const breathe = 1 + Math.sin(t * spec.speed * 2 + seed) * 0.09 * wet.value;
  const r = Math.max(1, spec.r * scale * (0.35 + 0.65 * grow) * breathe);
  return blobPath(
    spec.x + Math.sin(t * spec.speed * 0.5) * 8,
    spec.y + Math.cos(t * spec.speed * 0.4) * 8,
    r,
    seed,
    t * spec.speed,
    0.06 * wet.value,
  );
}

function BlobWash({
  clock,
  spec,
  seed,
  color,
  wet,
  scale,
}: BlobProps & { scale: number }) {
  const props = useAnimatedProps(() => ({
    d: blobShape(clock, spec, seed, wet, scale),
  }));
  return <AnimatedPath animatedProps={props} fill={color} opacity={0.22} />;
}

/** A dried blob keeps a darker rim, like real watercolor. */
function BlobEdge({ clock, spec, seed, color, wet }: BlobProps) {
  const props = useAnimatedProps(() => ({
    d: blobShape(clock, spec, seed, wet, 1),
    strokeOpacity: 0.55 * (1 - wet.value),
  }));
  return (
    <AnimatedPath
      animatedProps={props}
      fill="none"
      stroke={color}
      strokeWidth={2.5}
    />
  );
}

function Blob(props: BlobProps) {
  return (
    <>
      <BlobWash {...props} scale={1} />
      <BlobEdge {...props} />
      <BlobWash {...props} scale={0.82} />
      <BlobWash {...props} scale={0.6} />
    </>
  );
}

function WatercolorScene({ kit }: { kit: PlayerKit }) {
  const { colors } = useColors();
  const styles = useStyles();
  const s = colors.skin;
  const clock = useSceneClock(kit, { boost: 1, changeSeconds: 2.4 });
  const blobs = list(s.blobs, [
    '#4f8fd6',
    '#f08a6c',
    '#f5c84c',
    '#7cc4a4',
    '#b38cd9',
  ]);
  const seed = Math.max(0, kit.queueIndex) + 1;
  const specs = useMemo(() => layoutFor(seed), [seed]);
  const wet = useSharedValue(kit.isPlaying ? 1 : 0);
  useEffect(() => {
    wet.value = withTiming(kit.isPlaying ? 1 : 0, {
      duration: clock.reduced ? 0 : 2400,
      reduceMotion: ReduceMotion.System,
    });
  }, [clock.reduced, kit.isPlaying, wet]);
  const drop = useAnimatedProps(() => {
    const c = clock.change.value;
    const k = 1 - Math.pow(c, 3);
    return { r: c > 0 ? 6 + k * 110 : 0, opacity: c * 0.5 };
  });
  return (
    <SceneBox
      background={s.paper2 ?? colors.surface}
      clock={clock}
      label="Lámina de acuarela que se mueve con la música"
      radius={4}
    >
      <Layer>
        {specs.map((spec, n) => (
          <Blob
            key={`${seed}-${n}`}
            clock={clock}
            color={blobs[(n + seed) % blobs.length]}
            seed={seed + n}
            spec={spec}
            wet={wet}
          />
        ))}
        <AnimatedCircle
          animatedProps={drop}
          cx={specs[0].x}
          cy={specs[0].y}
          fill={blobs[seed % blobs.length]}
        />
      </Layer>
      <View
        pointerEvents="none"
        style={[place(180, 248, 130, 24), styles.right]}
      >
        <Text
          style={[
            styles.wetText,
            {
              color: s.sub ?? colors.textSecondary,
              fontFamily: colors.design.fonts.display,
            },
          ]}
        >
          {kit.isPlaying ? 'húmeda' : 'secándose'}
        </Text>
      </View>
    </SceneBox>
  );
}

/* ───────────────────────── Neón de bar ───────────────────────── */

function humOf(clock: SceneClock, level: SharedValue<number>) {
  'worklet';
  return (
    clock.play.value *
    (0.35 +
      level.value *
        0.65 *
        (0.85 + noise(Math.floor(clock.wall.value * 5)) * 0.15))
  );
}

function NeonLetter({
  ch,
  index,
  clock,
  color,
  off,
  font,
  level,
}: {
  ch: string;
  index: number;
  clock: SceneClock;
  color: string;
  off: string;
  font?: string;
  level: SharedValue<number>;
}) {
  const styles = useStyles();
  const lit = useAnimatedStyle(() => {
    const c = clock.change.value;
    const dark =
      clock.play.value < 0.5 ||
      (c > 0 &&
        noise(index * 13 + Math.floor(clock.wall.value * 30)) < c * 0.8);
    return { opacity: dark ? 0 : 0.6 + humOf(clock, level) * 0.4 };
  });
  return (
    <View>
      <Text style={[styles.neonLetter, { color: off, fontFamily: font }]}>
        {ch}
      </Text>
      <Animated.Text
        style={[
          styles.neonLetter,
          styles.neonLit,
          { color, fontFamily: font, textShadowColor: color },
          lit,
        ]}
      >
        {ch}
      </Animated.Text>
    </View>
  );
}

function NeonScene({ kit }: { kit: PlayerKit }) {
  const { colors } = useColors();
  const styles = useStyles();
  const s = colors.skin;
  const clock = useSceneClock(kit, { boost: 0, changeSeconds: 2.2 });
  const volume = useMediaVolume(kit.visible);
  const level = useSharedValue(volume.level);
  useEffect(() => {
    level.value = volume.level;
  }, [level, volume.level]);
  const tubeA = s.tubeA ?? colors.accent;
  const tubeB = s.tubeB ?? colors.accent;
  const off = s.off ?? colors.outline;
  const glowWide = useAnimatedProps(() => ({
    strokeOpacity:
      clock.play.value < 0.5 ? 0 : 0.05 + 0.18 * humOf(clock, level),
  }));
  const glowMid = useAnimatedProps(() => ({
    strokeOpacity:
      clock.play.value < 0.5 ? 0 : 0.15 + 0.3 * humOf(clock, level),
  }));
  const tube = useAnimatedProps(() => ({
    stroke: clock.play.value < 0.5 ? off : tubeB,
  }));
  const note = useAnimatedStyle(() => {
    const on = clock.play.value;
    const buzz =
      on > 0.5 && level.value > 0.7
        ? (noise(clock.wall.value * 40) - 0.5) * 2.4
        : 0;
    return {
      opacity: 0.3 + on * 0.7,
      transform: [
        { translateX: buzz * clock.unit.value },
        {
          rotate: `${
            Math.sin(clock.wall.value * 6) * (2 + level.value * 6) * on
          }deg`,
        },
      ],
    };
  });
  const letters = Array.from(kit.track?.title ?? '');
  const font = colors.design.fonts.display;
  const sendVolume = (x: number, width: number) =>
    volume.change(clamp01(x / Math.max(1, width)));
  const [trackWidth, setTrackWidth] = useState(1);
  return (
    <View>
      <SceneBox
        background={s.wall ?? colors.background}
        clock={clock}
        label="Letrero de neón con el título de la canción"
        radius={18}
      >
        <Layer>
          {Array.from({ length: 10 }, (_, row) =>
            Array.from({ length: 6 }, (__, col) => (
              <Rect
                key={`${row}-${col}`}
                fill={s.brick}
                height={24}
                opacity={0.6}
                width={60}
                x={col * 64 - (row % 2 ? 32 : 0)}
                y={row * 28}
              />
            )),
          )}
          <AnimatedRect
            animatedProps={glowWide}
            fill="none"
            height={196}
            rx={26}
            stroke={tubeB}
            strokeWidth={22}
            width={276}
            x={22}
            y={40}
          />
          <AnimatedRect
            animatedProps={glowMid}
            fill="none"
            height={196}
            rx={26}
            stroke={tubeB}
            strokeWidth={10}
            width={276}
            x={22}
            y={40}
          />
          <AnimatedRect
            animatedProps={tube}
            fill="none"
            height={196}
            rx={26}
            strokeWidth={4}
            width={276}
            x={22}
            y={40}
          />
          <Rect fill={off} height={30} width={3} x={90} y={10} />
          <Rect fill={off} height={30} width={3} x={228} y={10} />
        </Layer>
        <View
          pointerEvents="none"
          style={[place(36, 52, 248, 172), styles.neonInner]}
        >
          <Text
            style={[
              styles.neonSmall,
              { color: tubeB, fontFamily: font, textShadowColor: tubeB },
            ]}
          >
            AHORA SUENA
          </Text>
          <View style={styles.neonWord}>
            {letters.map((ch, index) => (
              <NeonLetter
                key={`${index}-${ch}`}
                ch={ch === ' ' ? ' ' : ch}
                clock={clock}
                color={tubeA}
                font={font}
                index={index}
                level={level}
                off={off}
              />
            ))}
          </View>
          <Text
            numberOfLines={1}
            style={[
              styles.neonArtist,
              { color: tubeB, fontFamily: font, textShadowColor: tubeB },
            ]}
          >
            {kit.track?.artist}
          </Text>
        </View>
        <Animated.View
          pointerEvents="none"
          style={[place(246, 50, 34, 34), note]}
        >
          <Svg
            fill="none"
            height="100%"
            stroke={tubeB}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            viewBox="0 0 24 24"
            width="100%"
          >
            <Path d="M9 18V6l10-2v12" />
            <Circle cx={6.5} cy={18} r={2.5} />
            <Circle cx={16.5} cy={16} r={2.5} />
          </Svg>
        </Animated.View>
      </SceneBox>
      <View style={styles.volumeRow}>
        <Text style={[styles.volumeLabel, { color: colors.textSecondary }]}>
          Volumen
        </Text>
        <Pressable
          accessibilityActions={[
            { name: 'increment', label: 'Subir volumen' },
            { name: 'decrement', label: 'Bajar volumen' },
          ]}
          accessibilityLabel="Volumen del teléfono"
          accessibilityHint="El letrero brilla más con el volumen alto"
          accessibilityRole="adjustable"
          accessibilityValue={{
            min: 0,
            max: 100,
            now: Math.round(volume.level * 100),
          }}
          disabled={volume.fixed}
          onAccessibilityAction={event =>
            volume.change(
              volume.level +
                (event.nativeEvent.actionName === 'increment' ? 0.05 : -0.05),
            )
          }
          onLayout={event => setTrackWidth(event.nativeEvent.layout.width)}
          onMoveShouldSetResponder={() => !volume.fixed}
          onResponderGrant={event =>
            sendVolume(event.nativeEvent.locationX, trackWidth)
          }
          onResponderMove={event =>
            sendVolume(event.nativeEvent.locationX, trackWidth)
          }
          onStartShouldSetResponder={() => !volume.fixed}
          style={styles.volumeTrack}
        >
          <View style={[styles.volumeBar, { backgroundColor: off }]}>
            <View
              style={[
                styles.volumeFill,
                {
                  backgroundColor: tubeB,
                  width: `${Math.round(volume.level * 100)}%`,
                },
              ]}
            />
          </View>
        </Pressable>
        <Text
          style={[
            styles.volumeLabel,
            styles.volumePercent,
            { color: colors.textSecondary },
          ]}
        >
          {Math.round(volume.level * 100)}%
        </Text>
      </View>
    </View>
  );
}

export type ScenesAKind = 'acuario' | 'radio' | 'pixel' | 'acuarela' | 'neon';

export function ScenesA({ kind, kit }: { kind: ScenesAKind; kit: PlayerKit }) {
  if (kind === 'acuario') return <AquariumScene kit={kit} />;
  if (kind === 'radio') return <RadioScene kit={kit} />;
  if (kind === 'pixel') return <PixelScene kit={kit} />;
  if (kind === 'acuarela') return <WatercolorScene kit={kit} />;
  return <NeonScene kit={kit} />;
}

const useStyles = createStyles(colors => ({
  center: { alignItems: 'center', justifyContent: 'center' },
  right: { alignItems: 'flex-end', justifyContent: 'center' },
  dialText: { fontSize: 12 },
  pixelBanner: { fontSize: 18 },
  wetText: { fontSize: 15 },
  neonInner: { alignItems: 'center', justifyContent: 'center', gap: 8 },
  neonSmall: { fontSize: 12, letterSpacing: 4, textShadowRadius: 8 },
  neonWord: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  neonLetter: { fontSize: 32, lineHeight: 40 },
  neonLit: { position: 'absolute', left: 0, top: 0, textShadowRadius: 12 },
  neonArtist: { fontSize: 18, textShadowRadius: 8 },
  volumeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  volumeLabel: { fontSize: 12 },
  volumePercent: { minWidth: 36, textAlign: 'right' },
  volumeTrack: { flex: 1, height: 48, justifyContent: 'center' },
  volumeBar: {
    borderRadius: colors.design.radius.full,
    height: 6,
    overflow: 'hidden',
    width: '100%',
  },
  volumeFill: { height: 6 },
}));
