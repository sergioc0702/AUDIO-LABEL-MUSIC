import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
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
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';
import { createStyles, useColors } from '../../../theme/theme';
import type { PlayerKit } from '../kit';
import {
  AnimatedCircle,
  AnimatedEllipse,
  AnimatedLine,
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

const STAR =
  'M12 0 C 13 9 15 11 24 12 C 15 13 13 15 12 24 C 11 15 9 13 0 12 C 9 11 11 9 12 0 Z';

/* ───────────────────────── Constelación ───────────────────────── */

const POINTS = [
  [46, 222],
  [112, 140],
  [184, 176],
  [240, 92],
  [284, 36],
];

function Dust({
  clock,
  n,
  color,
}: {
  clock: SceneClock;
  n: number;
  color: string;
}) {
  const props = useAnimatedProps(() => ({
    opacity:
      0.2 +
      0.6 * Math.abs(Math.sin(clock.wall.value * (0.3 + noise(n) * 0.6) + n)),
  }));
  return (
    <AnimatedCircle
      animatedProps={props}
      cx={noise(n * 3.3) * W}
      cy={noise(n * 7.7 + 1) * H}
      fill={color}
      r={0.6 + Math.floor(noise(n * 5.1) * 3) * 0.5}
    />
  );
}

function StarButton({
  clock,
  x,
  y,
  current,
  lit,
  color,
  accent,
  dim,
  label,
  onPress,
  size,
}: {
  clock: SceneClock;
  x: number;
  y: number;
  current: boolean;
  lit: boolean;
  color: string;
  accent: string;
  dim: string;
  label: string;
  onPress: () => void;
  size: number;
}) {
  const pulse = useAnimatedStyle(() => {
    const p = current
      ? ((Math.sin(clock.wall.value * 3) + 1) / 2) * clock.play.value
      : 0;
    return { transform: [{ scale: 1 + p * 0.22 }] };
  });
  const halo = useAnimatedStyle(() => ({
    opacity: current
      ? 0.18 +
        ((Math.sin(clock.wall.value * 3) + 1) / 2) * 0.16 * clock.play.value
      : 0,
  }));
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={[
        place(x - 26, y - 26, 52, 52),
        { alignItems: 'center', justifyContent: 'center' },
      ]}
    >
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: '100%',
            aspectRatio: 1,
            borderRadius: 999,
            backgroundColor: accent,
          },
          halo,
        ]}
      />
      <Animated.View
        style={[{ width: `${(size / 52) * 100}%`, aspectRatio: 1 }, pulse]}
      >
        <Svg height="100%" viewBox="0 0 24 24" width="100%">
          <Path d={STAR} fill={current ? accent : lit ? color : dim} />
        </Svg>
      </Animated.View>
    </Pressable>
  );
}

function Constellation({ kit }: { kit: PlayerKit }) {
  const { colors } = useColors();
  const styles = useStyles();
  const s = colors.skin;
  const clock = useSceneClock(kit, { boost: 0, changeSeconds: 1.8 });
  const count = kit.queue.length;
  const start = Math.max(
    0,
    Math.min(kit.queueIndex - 1, count - POINTS.length),
  );
  const songs = kit.queue.slice(start, start + POINTS.length);
  const cur = Math.max(0, kit.queueIndex - start);
  const from = POINTS[Math.min(cur, POINTS.length - 1)];
  const to = POINTS[Math.min(cur + 1, POINTS.length - 1)];
  const run = useAnimatedProps(() => ({
    x2: from[0] + (to[0] - from[0]) * clock.progress.value,
    y2: from[1] + (to[1] - from[1]) * clock.progress.value,
  }));
  const head = useAnimatedProps(() => ({
    cx: from[0] + (to[0] - from[0]) * clock.progress.value,
    cy: from[1] + (to[1] - from[1]) * clock.progress.value,
  }));
  const shooting = useAnimatedStyle(() => {
    const c = clock.change.value;
    const k = 1 - c;
    return {
      opacity: c > 0 ? Math.sin(k * Math.PI) : 0,
      transform: [
        { translateX: (-100 + k * 480) * clock.unit.value },
        { translateY: (16 + k * 120) * clock.unit.value },
        { rotate: '18deg' },
      ],
    };
  });
  const labelX = Math.max(70, Math.min(W - 70, from[0]));
  return (
    <SceneBox
      background={s.sky ?? colors.background}
      clock={clock}
      label="Tu cola convertida en constelación"
    >
      <Layer>
        <Ellipse
          cx={160}
          cy={130}
          fill={s.haze}
          opacity={0.12}
          rx={260}
          ry={60}
          transform="rotate(-24 160 130)"
        />
        {Array.from({ length: 34 }, (_, n) => (
          <Dust key={n} clock={clock} color={s.star ?? '#ffffff'} n={n} />
        ))}
        {POINTS.slice(0, Math.max(0, songs.length - 1)).map(([x1, y1], k) => {
          const [x2, y2] = POINTS[k + 1];
          const done = k < cur;
          return (
            <Line
              key={k}
              stroke={done ? s.star : s.dim}
              strokeDasharray={done ? undefined : '2 6'}
              strokeLinecap="round"
              strokeWidth={done ? 1.6 : 1.2}
              x1={x1}
              x2={x2}
              y1={y1}
              y2={y2}
            />
          );
        })}
        {cur + 1 < songs.length ? (
          <>
            <AnimatedLine
              animatedProps={run}
              stroke={s.accent}
              strokeLinecap="round"
              strokeWidth={2.5}
              x1={from[0]}
              y1={from[1]}
            />
            <AnimatedCircle animatedProps={head} fill={s.accent} r={3.5} />
          </>
        ) : null}
      </Layer>
      {songs.map((track, n) => (
        <StarButton
          key={track.id}
          accent={s.accent ?? colors.accent}
          clock={clock}
          color={s.star ?? '#ffffff'}
          current={n === cur}
          dim={s.dim ?? colors.outline}
          label={
            n === cur
              ? `Sonando: ${track.title}`
              : `Reproducir ${track.title} de ${track.artist}`
          }
          lit={n <= cur}
          onPress={() => kit.playQueueTrack(start + n)}
          size={
            n === cur ? 32 : 16 + Math.min(10, (track.duration ?? 200) / 40)
          }
          x={POINTS[n][0]}
          y={POINTS[n][1]}
        />
      ))}
      <View
        pointerEvents="none"
        style={[place(labelX - 80, from[1] + 30, 160, 20), styles.center]}
      >
        <Text
          numberOfLines={1}
          style={[styles.small, { color: s.sub ?? colors.textSecondary }]}
        >
          {kit.track?.title}
        </Text>
      </View>
      <Animated.View
        pointerEvents="none"
        style={[place(0, 0, 90, 2), { backgroundColor: s.star }, shooting]}
      />
    </SceneBox>
  );
}

/* ───────────────────────── Jardín ───────────────────────── */

function leafPath(
  x: number,
  y: number,
  len: number,
  width: number,
  angle: number,
) {
  'worklet';
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const tipX = x + c * len;
  const tipY = y + s * len;
  const mx = x + c * len * 0.45;
  const my = y + s * len * 0.45;
  return (
    'M' +
    x +
    ' ' +
    y +
    ' Q ' +
    (mx - s * width) +
    ' ' +
    (my + c * width) +
    ' ' +
    tipX +
    ' ' +
    tipY +
    ' Q ' +
    (mx + s * width) +
    ' ' +
    (my - c * width) +
    ' ' +
    x +
    ' ' +
    y +
    ' Z'
  );
}

const BASE_X = 160;
const BASE_Y = 214;

function stemGeometry(clock: SceneClock, droop: SharedValue<number>) {
  'worklet';
  const p = clock.progress.value;
  const h = (14 + p * 168) * (1 - droop.value * 0.08);
  const sway =
    Math.sin(clock.wall.value * 0.7) *
    10 *
    (1 - droop.value) *
    clock.play.value;
  const bend = sway + droop.value * 46;
  const cx = BASE_X + bend * 0.25;
  const cy = BASE_Y - h * 0.55;
  const tx = BASE_X + bend;
  const ty = BASE_Y - h + droop.value * h * 0.18;
  return { p, cx, cy, tx, ty };
}

function Leaf({
  clock,
  droop,
  n,
  color,
}: {
  clock: SceneClock;
  droop: SharedValue<number>;
  n: number;
  color: string;
}) {
  const props = useAnimatedProps(() => {
    const g = stemGeometry(clock, droop);
    const grow = clamp01((g.p - (0.12 + n * 0.14)) / 0.08);
    const k = 0.22 + n * 0.15;
    const u = 1 - k;
    const x = u * u * BASE_X + 2 * u * k * g.cx + k * k * g.tx;
    const y = u * u * BASE_Y + 2 * u * k * g.cy + k * k * g.ty;
    const side = n % 2 ? -1 : 1;
    const tilt =
      (-28 +
        droop.value * 48 +
        Math.sin(clock.wall.value * 0.8 + n) * 4 * (1 - droop.value)) *
      (Math.PI / 180);
    const angle = side > 0 ? tilt : Math.PI - tilt;
    return {
      d:
        grow > 0
          ? leafPath(
              x,
              y,
              36 * (0.4 + 0.6 * grow),
              11 * (0.4 + 0.6 * grow),
              angle,
            )
          : 'M0 0',
    };
  });
  return <AnimatedPath animatedProps={props} fill={color} />;
}

function Petal({
  clock,
  droop,
  n,
  color,
}: {
  clock: SceneClock;
  droop: SharedValue<number>;
  n: number;
  color: string;
}) {
  const props = useAnimatedProps(() => {
    const g = stemGeometry(clock, droop);
    const open = clamp01((g.p - 0.82) / 0.14) * (1 - droop.value * 0.4);
    const angle = (n * 60 + clock.wall.value * 4) * (Math.PI / 180);
    return {
      d: open > 0 ? leafPath(g.tx, g.ty, 30 * open, 9 * open, angle) : 'M0 0',
    };
  });
  return <AnimatedPath animatedProps={props} fill={color} />;
}

function Garden({ kit }: { kit: PlayerKit }) {
  const { colors } = useColors();
  const s = colors.skin;
  const clock = useSceneClock(kit, { boost: 0 });
  const droop = useSharedValue(kit.isPlaying ? 0 : 1);
  useEffect(() => {
    droop.value = withTiming(kit.isPlaying ? 0 : 1, {
      duration: clock.reduced ? 0 : 2600,
      reduceMotion: ReduceMotion.System,
    });
  }, [clock.reduced, droop, kit.isPlaying]);
  const stem = useAnimatedProps(() => {
    const g = stemGeometry(clock, droop);
    return {
      d:
        'M' +
        BASE_X +
        ' ' +
        BASE_Y +
        ' Q ' +
        g.cx +
        ' ' +
        g.cy +
        ' ' +
        g.tx +
        ' ' +
        g.ty,
    };
  });
  const bud = useAnimatedProps(() => {
    const g = stemGeometry(clock, droop);
    const open = clamp01((g.p - 0.82) / 0.14);
    return { cx: g.tx, cy: g.ty, r: 5 + Math.min(1, g.p / 0.8) * 7 + open * 2 };
  });
  const fly = useAnimatedStyle(() => {
    const t = clock.wall.value * 0.5;
    return {
      opacity: clock.play.value > 0.5 && clock.progress.value > 0.3 ? 1 : 0,
      transform: [
        { translateX: (160 - 12 + Math.sin(t) * 110) * clock.unit.value },
        { translateY: (100 + Math.sin(t * 2) * 36) * clock.unit.value },
      ],
    };
  });
  const wings = useAnimatedStyle(() => ({
    transform: [
      { scaleX: 0.3 + Math.abs(Math.sin(clock.wall.value * 9)) * 0.7 },
    ],
  }));
  return (
    <SceneBox
      background={s.sky ?? colors.surface}
      clock={clock}
      label="Planta que crece con la canción y florece al final"
    >
      <Layer>
        <Circle cx={270} cy={50} fill={s.center} opacity={0.5} r={24} />
        <Path d="M0 236 Q 80 214 160 222 T 320 216 V276 H0 Z" fill={s.ground} />
        <AnimatedPath
          animatedProps={stem}
          fill="none"
          stroke={s.stem}
          strokeLinecap="round"
          strokeWidth={7}
        />
        {[0, 1, 2, 3, 4].map(n => (
          <Leaf
            key={n}
            clock={clock}
            color={s.leaf ?? colors.accent}
            droop={droop}
            n={n}
          />
        ))}
        {[0, 1, 2, 3, 4, 5].map(n => (
          <Petal
            key={n}
            clock={clock}
            color={s.petal ?? colors.accent}
            droop={droop}
            n={n}
          />
        ))}
        <AnimatedCircle animatedProps={bud} fill={s.center} />
        <Path d="M108 224 L 212 224 L 202 274 L 118 274 Z" fill={s.pot} />
        <Rect fill={s.potDark} height={20} rx={6} width={124} x={98} y={210} />
      </Layer>
      <Animated.View pointerEvents="none" style={[place(0, 0, 24, 18), fly]}>
        <Animated.View style={[{ flex: 1 }, wings]}>
          <Svg height="100%" viewBox="0 0 24 18" width="100%">
            <Ellipse cx={6} cy={9} fill={s.wing} rx={6} ry={8} />
            <Ellipse cx={18} cy={9} fill={s.wing} rx={6} ry={8} />
            <Rect fill={s.ink} height={14} rx={1.5} width={3} x={10.5} y={2} />
          </Svg>
        </Animated.View>
      </Animated.View>
    </SceneBox>
  );
}

/* ───────────────────────── Origami ───────────────────────── */

const O = [150, 150];
const A = [40, 40];
const B = [260, 40];
const C = [260, 260];
const D = [40, 260];
const M1 = [150, 40];
const M2 = [260, 150];
const M3 = [150, 260];
const M4 = [40, 150];
const FLAT = [
  [O, A, M1],
  [O, M1, B],
  [O, B, M2],
  [O, M2, C],
  [O, C, M3],
  [O, M3, D],
  [O, D, M4],
  [O, M4, A],
];
const CRANE = [
  [
    [150, 150],
    [52, 46],
    [128, 144],
  ],
  [
    [150, 150],
    [128, 144],
    [94, 90],
  ],
  [
    [152, 150],
    [240, 40],
    [174, 142],
  ],
  [
    [152, 150],
    [174, 142],
    [208, 94],
  ],
  [
    [106, 164],
    [150, 132],
    [196, 164],
  ],
  [
    [106, 164],
    [196, 164],
    [152, 196],
  ],
  [
    [110, 166],
    [56, 98],
    [98, 170],
  ],
  [
    [194, 164],
    [262, 110],
    [202, 172],
  ],
];
const SHADE = [0, 1, 0, 1, 0, 2, 1, 2];

function foldOf(clock: SceneClock) {
  'worklet';
  // Unfold to a flat sheet during the first half of a change, then fold back.
  const c = clock.change.value;
  const raw = c === 0 ? 1 : c > 0.5 ? (c - 0.5) / 0.5 : 1 - c / 0.5;
  return raw * raw * (3 - 2 * raw);
}

function Facet({
  clock,
  n,
  fill,
}: {
  clock: SceneClock;
  n: number;
  fill: string;
}) {
  const props = useAnimatedProps(() => {
    const k = foldOf(clock);
    const wing =
      clock.play.value > 0.5 ? Math.sin(clock.run.value * 2.2) * 16 * k : 0;
    let pts = '';
    for (let v = 0; v < 3; v += 1) {
      const flat = FLAT[n][v];
      let tx = CRANE[n][v][0];
      let ty = CRANE[n][v][1];
      if ((n === 0 || n === 2) && v === 1) ty += wing;
      if ((n === 1 || n === 3) && v === 2) ty += wing * 0.6;
      tx = flat[0] + (tx - flat[0]) * k + 10;
      ty = flat[1] + (ty - flat[1]) * k - 14;
      pts += (v ? ' L ' : 'M') + tx.toFixed(1) + ' ' + ty.toFixed(1);
    }
    return { d: pts + ' Z' };
  });
  return <AnimatedPath animatedProps={props} fill={fill} />;
}

function Origami({ kit }: { kit: PlayerKit }) {
  const { colors } = useColors();
  const s = colors.skin;
  const clock = useSceneClock(kit, { boost: 0, changeSeconds: 3 });
  const sheets = list(s.sheets, [
    '#e9584a',
    '#c8463a',
    '#a3362d',
    '#f2b84b',
    '#d99b2e',
    '#b57c1e',
    '#4a8fc2',
    '#3a74a0',
    '#2c5a7d',
  ]);
  const [sheet, setSheet] = useState(Math.max(0, kit.queueIndex));
  const last = useRef(kit.queueIndex);
  useEffect(() => {
    if (kit.queueIndex === last.current) return;
    last.current = kit.queueIndex;
    const timer = setTimeout(
      () => setSheet(Math.max(0, kit.queueIndex)),
      clock.reduced ? 0 : 1500,
    );
    return () => clearTimeout(timer);
  }, [clock.reduced, kit.queueIndex]);
  const groups = Math.max(1, Math.floor(sheets.length / 3));
  const g = (sheet % groups) * 3;
  const tone = [
    sheets[g],
    sheets[g + 1] ?? sheets[g],
    sheets[g + 2] ?? sheets[g],
  ];
  const lift = useAnimatedStyle(() => {
    const k = foldOf(clock);
    const hover =
      clock.play.value > 0.5 ? Math.sin(clock.run.value * 1.1) * 6 * k : 4 * k;
    return {
      transform: [
        { translateY: hover * clock.unit.value },
        { rotate: `${(1 - k) * -8}deg` },
      ],
    };
  });
  const crease = useAnimatedProps(() => ({
    strokeOpacity: (1 - foldOf(clock)) * 0.5,
  }));
  const shadow = useAnimatedProps(() => {
    const k = foldOf(clock);
    return { rx: 60 + (1 - k) * 60, cy: 240 + (1 - k) * 12 };
  });
  const head = useAnimatedProps(() => ({
    opacity: foldOf(clock) > 0.9 ? 1 : 0,
  }));
  return (
    <SceneBox
      background={s.line ?? colors.surface}
      clock={clock}
      label="Grulla de papel que se dobla con cada canción"
      radius={2}
    >
      <Layer>
        <AnimatedEllipse
          animatedProps={shadow}
          cx={162}
          fill={s.ink ?? colors.text}
          opacity={0.12}
          ry={9}
        />
      </Layer>
      <Animated.View
        pointerEvents="none"
        style={[
          { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
          lift,
        ]}
      >
        <Layer>
          {FLAT.map((_, n) => (
            <Facet key={n} clock={clock} fill={tone[SHADE[n]]} n={n} />
          ))}
          <AnimatedPath
            animatedProps={head}
            d="M66 84 L48 94 L72 94 Z"
            fill={tone[2]}
          />
          <AnimatedPath
            animatedProps={crease}
            d="M50 26 L270 246 M270 26 L50 246 M160 26 V246 M50 136 H270"
            fill="none"
            stroke={s.ink}
            strokeDasharray="4 5"
            strokeWidth={1}
          />
        </Layer>
      </Animated.View>
    </SceneBox>
  );
}

/* ───────────────────────── Cyberpunk ───────────────────────── */

const BUILDINGS = [
  [30, 128, 24, 50],
  [80, 80, 36, 92],
  [146, 150, 32, 22],
  [182, 54, 28, 120],
  [238, 116, 32, 80],
  [296, 150, 20, 40],
];

function Windows({ clock, color }: { clock: SceneClock; color: string }) {
  const props = useAnimatedProps(() => {
    const step = Math.floor(
      clock.wall.value * (clock.play.value > 0.5 ? 1.6 : 0.25),
    );
    let d = '';
    for (let b = 0; b < BUILDINGS.length; b += 1) {
      const [x, y, w, h] = BUILDINGS[b];
      for (let yy = y; yy < y + h; yy += 10) {
        for (let xx = x; xx < x + w; xx += 8) {
          if (noise(xx * 3 + yy * 7 + b + step) > 0.55)
            d += 'M' + xx + ' ' + yy + 'h4v5h-4z';
        }
      }
    }
    return { d: d || 'M0 0' };
  });
  return <AnimatedPath animatedProps={props} fill={color} opacity={0.85} />;
}

function Rain({
  clock,
  color,
  count,
  speed,
  width,
}: {
  clock: SceneClock;
  color: string;
  count: number;
  speed: number;
  width: number;
}) {
  const props = useAnimatedProps(() => {
    let d = '';
    const t = clock.wall.value * 3 + clock.run.value * 12;
    for (let n = 0; n < count; n += 1) {
      const x = (n * 37) % W;
      const y = ((t * speed * (6 + (n % 3) * 2) + n * 53) % (H + 40)) - 30;
      d += 'M' + x + ' ' + y + ' l -3 14 ';
    }
    return { d };
  });
  return (
    <AnimatedPath
      animatedProps={props}
      opacity={0.35}
      stroke={color}
      strokeWidth={width}
    />
  );
}

function GlitchBar({
  clock,
  n,
  color,
}: {
  clock: SceneClock;
  n: number;
  color: string;
}) {
  const props = useAnimatedProps(() => {
    const c = clock.change.value;
    const t = Math.floor(clock.wall.value * 20);
    return {
      opacity: c > 0 ? 0.85 : 0,
      x: noise(t + n) * 240,
      y: noise(t * 2 + n) * 250,
      width: 40 + noise(n + t * 3) * 120,
      height: 3 + noise(n * 5 + t) * 10,
    };
  });
  return <AnimatedRect animatedProps={props} fill={color} />;
}

function Cyberpunk({ kit }: { kit: PlayerKit }) {
  const { colors } = useColors();
  const styles = useStyles();
  const s = colors.skin;
  const clock = useSceneClock(kit, { boost: 2, changeSeconds: 1.2 });
  const shake = useAnimatedStyle(() => ({
    transform: [
      {
        translateX:
          clock.change.value > 0
            ? (noise(clock.wall.value * 40) - 0.5) * 14 * clock.unit.value
            : 0,
      },
    ],
  }));
  const scan = useAnimatedProps(() => ({
    y: 56 + ((clock.wall.value * 30) % 120),
  }));
  const split = useAnimatedStyle(() => ({
    opacity: clock.change.value > 0 ? 0.9 : 0,
    transform: [
      { translateX: (3 + clock.change.value * 6) * clock.unit.value },
    ],
  }));
  const split2 = useAnimatedStyle(() => ({
    opacity: clock.change.value > 0 ? 0.9 : 0,
    transform: [
      { translateX: -(3 + clock.change.value * 6) * clock.unit.value },
    ],
  }));
  const live = useAnimatedStyle(() => ({
    opacity:
      clock.play.value > 0.5
        ? Math.floor(clock.wall.value * 1.5) % 2
          ? 0.25
          : 1
        : 1,
  }));
  const mono = 'ShareTechMono-Regular';
  const bpm = 118 + (((kit.track?.title.length ?? 0) * 7) % 30);
  return (
    <SceneBox
      background={s.panel ?? colors.surface}
      clock={clock}
      label="Ciudad cyberpunk con lluvia"
      radius={0}
    >
      <Animated.View
        style={[
          { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
          shake,
        ]}
      >
        <Layer>
          <Rain
            clock={clock}
            color={s.hot ?? colors.accent}
            count={34}
            speed={1}
            width={1}
          />
          <Path
            d="M0 276 V 178 H 26 V 124 H 56 V 196 H 76 V 76 H 120 V 172 H 140 V 146 H 180 V 50 H 214 V 166 H 234 V 112 H 274 V 190 H 292 V 146 H 320 V 276 Z"
            fill={s.city}
          />
          <Windows clock={clock} color={s.accent ?? colors.accent} />
          <AnimatedRect
            animatedProps={scan}
            fill={s.hot}
            height={2}
            width={34}
            x={180}
          />
          <Line
            opacity={0.6}
            stroke={s.accent}
            strokeDasharray="6 6"
            x1={0}
            x2={W}
            y1={244}
            y2={244}
          />
          {[0, 1, 2].map(n => (
            <GlitchBar
              key={n}
              clock={clock}
              color={n % 2 ? s.hot ?? colors.accent : s.accent ?? colors.accent}
              n={n}
            />
          ))}
          <Path
            d={`M2 2 H ${W - 26} L ${W - 2} 26 V ${H - 2} H 26 L 2 ${H - 26} Z`}
            fill="none"
            stroke={s.accent}
            strokeWidth={3}
          />
        </Layer>
        <View pointerEvents="none" style={place(14, 12, 150, 60)}>
          <Text style={[styles.hud, { color: s.accent, fontFamily: mono }]}>
            {`SEÑAL  ${kit.isPlaying ? 97 : 0}%\nBPM    ${
              kit.isPlaying ? bpm : '---'
            }\nPISTA  ${String(kit.queueIndex + 1).padStart(2, '0')}/${String(
              kit.queueCount,
            ).padStart(2, '0')}`}
          </Text>
        </View>
        <Animated.View
          pointerEvents="none"
          style={[place(176, 12, 100, 18), live]}
        >
          <Text
            style={[
              styles.hud,
              { color: s.hot, fontFamily: mono, textAlign: 'right' },
            ]}
          >
            {kit.isPlaying ? '● EN VIVO' : 'EN PAUSA'}
          </Text>
        </Animated.View>
        <View
          pointerEvents="none"
          style={[place(16, 250, 288, 22), styles.center]}
        >
          <Animated.Text
            numberOfLines={1}
            style={[
              styles.cyberTitle,
              styles.overlay,
              { color: s.hot, fontFamily: mono },
              split,
            ]}
          >
            {kit.track?.title}
          </Animated.Text>
          <Animated.Text
            numberOfLines={1}
            style={[
              styles.cyberTitle,
              styles.overlay,
              { color: s.accent, fontFamily: mono },
              split2,
            ]}
          >
            {kit.track?.title}
          </Animated.Text>
          <Text
            numberOfLines={1}
            style={[styles.cyberTitle, { color: s.ink, fontFamily: mono }]}
          >
            {kit.track?.title}
          </Text>
        </View>
      </Animated.View>
    </SceneBox>
  );
}

/* ───────────────────────── Vaporwave ───────────────────────── */

const HORIZON = 170;

function Grid({ clock, color }: { clock: SceneClock; color: string }) {
  const props = useAnimatedProps(() => {
    const phase = (clock.run.value * 0.3 + clock.change.value * 0.6) % 1;
    let d = '';
    for (let n = 0; n < 9; n += 1) {
      const k = (n + phase) / 9;
      const y = HORIZON + k * k * (H - HORIZON);
      d += 'M0 ' + y.toFixed(1) + ' H ' + W + ' ';
    }
    return { d };
  });
  return (
    <AnimatedPath
      animatedProps={props}
      fill="none"
      stroke={color}
      strokeWidth={1.5}
    />
  );
}

function SunCuts({ clock, color }: { clock: SceneClock; color: string }) {
  const props = useAnimatedProps(() => {
    let d = '';
    for (let n = 0; n < 6; n += 1) {
      const y = 108 + n * 12 + ((clock.run.value * 4) % 12);
      const h = 1 + n * 1.3;
      d += 'M50 ' + y.toFixed(1) + ' h 220 v ' + h.toFixed(1) + ' h -220 z ';
    }
    return { d };
  });
  return <AnimatedPath animatedProps={props} fill={color} />;
}

function Tracking({ clock, n }: { clock: SceneClock; n: number }) {
  const props = useAnimatedProps(() => ({
    opacity: clock.change.value > 0 ? 0.35 : 0,
    y: (clock.wall.value * 230 + n * 140) % H,
    x: (noise(Math.floor(clock.wall.value * 20) + n) - 0.5) * 30,
  }));
  return (
    <AnimatedRect
      animatedProps={props}
      fill="#ffffff"
      height={6 + n * 10}
      width={W + 40}
    />
  );
}

function Palm({
  clock,
  mirror,
  color,
}: {
  clock: SceneClock;
  mirror: boolean;
  color: string;
}) {
  const style = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${
          Math.sin(clock.wall.value * 0.5 + (mirror ? 1 : 0)) *
          (0.5 + 2.5 * clock.play.value)
        }deg`,
      },
    ],
  }));
  const x = mirror ? 268 : 0;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        place(x, 50, 52, 124),
        { transformOrigin: mirror ? '60% 100%' : '40% 100%' },
        style,
      ]}
    >
      <Svg height="100%" viewBox="0 0 52 124" width="100%">
        <G transform={mirror ? 'translate(52 0) scale(-1 1)' : undefined}>
          <Path
            d="M22 124 C 26 90 22 60 30 34 M30 34 C 12 26 0 34 -6 46 M30 34 C 26 16 12 8 0 10 M30 34 C 42 18 58 16 70 22 M30 34 C 50 36 60 48 64 60"
            fill="none"
            stroke={color}
            strokeLinecap="round"
            strokeWidth={6}
          />
        </G>
      </Svg>
    </Animated.View>
  );
}

function Vaporwave({ kit }: { kit: PlayerKit }) {
  const { colors } = useColors();
  const styles = useStyles();
  const s = colors.skin;
  const clock = useSceneClock(kit, { boost: 3, changeSeconds: 1.4 });
  const jitter = useAnimatedStyle(() => ({
    transform: [
      {
        translateX:
          clock.change.value > 0
            ? (noise(clock.wall.value * 30) - 0.5) * 16 * clock.unit.value
            : 0,
      },
    ],
  }));
  const ff = useAnimatedStyle(() => ({
    opacity: clock.change.value > 0 ? 1 : 0,
  }));
  const normal = useAnimatedStyle(() => ({
    opacity: clock.change.value > 0 ? 0 : 1,
  }));
  const vhs = 'VT323-Regular';
  const time = `0:${String(Math.floor(kit.position / 60)).padStart(
    2,
    '0',
  )}:${String(Math.floor(kit.position % 60)).padStart(2, '0')}`;
  return (
    <SceneBox
      background={s.floor ?? colors.background}
      clock={clock}
      label="Atardecer vaporwave con cuadrícula"
      radius={6}
    >
      <Animated.View
        style={[
          { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
          jitter,
        ]}
      >
        <Layer>
          <Defs>
            <LinearGradient id="vw-sky" x1="0" x2="0" y1="0" y2="1">
              <Stop offset="0" stopColor={s.sky1} />
              <Stop offset="1" stopColor={s.sky2} />
            </LinearGradient>
            <LinearGradient id="vw-sun" x1="0" x2="0" y1="0" y2="1">
              <Stop offset="0" stopColor={s.sun1} />
              <Stop offset="1" stopColor={s.sun2} />
            </LinearGradient>
            <ClipPath id="vw-sky-clip">
              <Rect height={HORIZON} width={W} x={0} y={0} />
            </ClipPath>
          </Defs>
          <Rect fill="url(#vw-sky)" height={HORIZON} width={W} x={0} y={0} />
          <G clipPath="url(#vw-sky-clip)">
            <Circle cx={160} cy={146} fill="url(#vw-sun)" r={92} />
            <SunCuts clock={clock} color={s.sky2 ?? colors.background} />
          </G>
          <Grid clock={clock} color={s.grid ?? colors.accent} />
          <Path
            d={`M160 ${HORIZON} L -200 ${H} M160 ${HORIZON} L -60 ${H} M160 ${HORIZON} L 50 ${H} M160 ${HORIZON} L 160 ${H} M160 ${HORIZON} L 270 ${H} M160 ${HORIZON} L 380 ${H} M160 ${HORIZON} L 520 ${H}`}
            stroke={s.grid}
            strokeWidth={1.5}
          />
          <Tracking clock={clock} n={0} />
          <Tracking clock={clock} n={1} />
        </Layer>
        <Palm clock={clock} color={s.palm ?? colors.text} mirror={false} />
        <Palm clock={clock} color={s.palm ?? colors.text} mirror />
        <View pointerEvents="none" style={place(12, 8, 180, 30)}>
          <Animated.Text
            style={[
              styles.vhs,
              { fontFamily: vhs, textShadowColor: s.palm },
              normal,
            ]}
          >
            {kit.isPlaying ? '▶ PLAY' : 'II PAUSA'}
          </Animated.Text>
          <Animated.Text
            style={[
              styles.vhs,
              styles.overlay,
              { fontFamily: vhs, textShadowColor: s.palm },
              ff,
            ]}
          >
            ▶▶ AVANZAR
          </Animated.Text>
        </View>
        <View
          pointerEvents="none"
          style={[place(180, 246, 128, 26), styles.right]}
        >
          <Text
            style={[styles.vhs, { fontFamily: vhs, textShadowColor: s.palm }]}
          >
            {time}
          </Text>
        </View>
      </Animated.View>
    </SceneBox>
  );
}

export type ScenesBKind =
  | 'constelacion'
  | 'jardin'
  | 'origami'
  | 'cyberpunk'
  | 'vaporwave';

export function ScenesB({ kind, kit }: { kind: ScenesBKind; kit: PlayerKit }) {
  if (kind === 'constelacion') return <Constellation kit={kit} />;
  if (kind === 'jardin') return <Garden kit={kit} />;
  if (kind === 'origami') return <Origami kit={kit} />;
  if (kind === 'cyberpunk') return <Cyberpunk kit={kit} />;
  return <Vaporwave kit={kit} />;
}

const useStyles = createStyles(() => ({
  center: { alignItems: 'center', justifyContent: 'center' },
  right: { alignItems: 'flex-end', justifyContent: 'center' },
  overlay: { position: 'absolute', left: 0, right: 0 },
  small: { fontSize: 12, letterSpacing: 1 },
  hud: { fontSize: 12, lineHeight: 17 },
  cyberTitle: { fontSize: 15, textAlign: 'center', textTransform: 'uppercase' },
  vhs: {
    color: '#ffffff',
    fontSize: 22,
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 1,
  },
}));
