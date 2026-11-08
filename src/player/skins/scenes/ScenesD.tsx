import { Text, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Path,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
  TextPath,
} from 'react-native-svg';
import { createStyles, useColors } from '../../../theme/theme';
import type { PlayerKit } from '../kit';
import {
  AnimatedCircle,
  AnimatedEllipse,
  AnimatedPath,
  AnimatedRect,
  H,
  Layer,
  SceneBox,
  W,
  clamp01,
  noise,
  place,
  useSceneClock,
  type SceneClock,
} from './common';

const FILL = {
  position: 'absolute' as const,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

/* ───────────────────────── Fantasía medieval ───────────────────────── */

function Spark({
  clock,
  n,
  color,
}: {
  clock: SceneClock;
  n: number;
  color: string;
}) {
  const props = useAnimatedProps(() => {
    const life =
      ((clock.run.value * (0.9 + noise(n) * 0.8) * 10 + n * 31) % 100) / 100;
    const on = clamp01(clock.play.value + clock.change.value);
    return {
      cx: 60 + noise(n * 3.3) * 200 + Math.sin(life * 6 + n) * 10,
      cy: 250 - life * 220,
      opacity: on > 0.1 ? Math.sin(life * Math.PI) : 0.15,
    };
  });
  return (
    <AnimatedCircle animatedProps={props} fill={color} r={1.5 + (n % 3)} />
  );
}

function Fantasy({ kit }: { kit: PlayerKit }) {
  const { colors } = useColors();
  const s = colors.skin;
  const clock = useSceneClock(kit, { boost: 2, changeSeconds: 1.6 });
  const ring = useAnimatedStyle(() => ({
    transform: [{ rotate: `${(clock.run.value * 8) % 360}deg` }],
  }));
  const orb = useAnimatedStyle(() => ({
    transform: [
      {
        translateY:
          Math.sin(clock.wall.value * 0.6) *
          (2 + 6 * clock.play.value) *
          clock.unit.value,
      },
    ],
  }));
  const glow = useAnimatedProps(() => ({
    r: 64 + clock.play.value * (12 + Math.sin(clock.wall.value * 2.5) * 9),
  }));
  const flash = useAnimatedProps(() => {
    const c = clock.change.value;
    return { r: 50 + (1 - c) * 200, opacity: c * 0.55 };
  });
  return (
    <SceneBox
      background={s.panel ?? colors.surface}
      clock={clock}
      label="Orbe mágico dentro de un círculo de runas"
      radius={12}
    >
      <Layer>
        <Path
          d="M3 273 V 140 A 157 137 0 0 1 317 140 V 273 Z"
          fill="none"
          stroke={s.line}
          strokeWidth={3}
        />
        <Rect
          fill={s.mist}
          height={30}
          opacity={0.6}
          rx={15}
          width={280}
          x={20}
          y={236}
        />
        <Path d="M118 250 L 202 250 L 190 224 L 130 224 Z" fill={s.line} />
      </Layer>
      <Animated.View
        pointerEvents="none"
        style={[place(42, 8, 236, 236), ring]}
      >
        <Svg height="100%" viewBox="0 0 236 236" width="100%">
          <Defs>
            <Path d="M118 22 a 96 96 0 1 1 -0.1 0 Z" id="fantasy-ring" />
          </Defs>
          <Circle
            cx={118}
            cy={118}
            fill="none"
            opacity={0.7}
            r={96}
            stroke={s.rune}
            strokeWidth={1.5}
          />
          <Circle
            cx={118}
            cy={118}
            fill="none"
            opacity={0.6}
            r={114}
            stroke={s.rune}
            strokeDasharray="3 9"
            strokeWidth={1}
          />
          <SvgText fill={s.rune} fontSize={13} letterSpacing={6}>
            <TextPath href="#fantasy-ring">
              ᚠᚢᚦᚨᚱᚲ ᛗᛁ ᛗᚢᛋᛁᚲᚨ ᚷᚹᚺᚾ ᛁᛃᛇᛈ ᛉᛊᛏᛒ ᛖᛗᛚᛜ
            </TextPath>
          </SvgText>
        </Svg>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[FILL, orb]}>
        <Layer>
          <Defs>
            <RadialGradient cx="40%" cy="35%" id="fantasy-orb" r="70%">
              <Stop offset="0" stopColor="#ffffff" />
              <Stop offset="0.35" stopColor={s.orb} />
              <Stop offset="1" stopColor={s.orbDeep} />
            </RadialGradient>
          </Defs>
          <AnimatedCircle
            animatedProps={glow}
            cx={160}
            cy={126}
            fill={s.orb}
            opacity={0.18}
          />
          <Circle cx={160} cy={126} fill="url(#fantasy-orb)" r={54} />
          <Path
            d="M134 108 Q 150 88 176 94"
            fill="none"
            opacity={0.6}
            stroke="#ffffff"
            strokeLinecap="round"
            strokeWidth={5}
          />
        </Layer>
      </Animated.View>
      <Layer>
        {Array.from({ length: 10 }, (_, n) => (
          <Spark key={n} clock={clock} color={s.spark ?? '#ffffff'} n={n} />
        ))}
        <AnimatedCircle
          animatedProps={flash}
          cx={160}
          cy={126}
          fill={s.spark}
        />
      </Layer>
    </SceneBox>
  );
}

/* ───────────────────────── Lo-fi ───────────────────────── */

const WINDOW = { x: 30, y: 22, w: 180, h: 160 };

function CityLights({
  clock,
  seed,
  color,
}: {
  clock: SceneClock;
  seed: number;
  color: string;
}) {
  const props = useAnimatedProps(() => {
    const step = Math.floor(clock.wall.value / 6);
    let d = '';
    const blocks = [
      [18, 86, 18],
      [52, 70, 24],
      [98, 94, 18],
      [122, 60, 18],
      [150, 110, 22],
    ];
    for (let b = 0; b < blocks.length; b += 1) {
      const [x, y, w] = blocks[b];
      for (let yy = y; yy < 150; yy += 12) {
        for (let xx = x; xx < x + w; xx += 8) {
          if (noise(xx * 5 + yy * 3 + b + seed * 7 + step) > 0.5)
            d += 'M' + (WINDOW.x + xx) + ' ' + (WINDOW.y + yy) + 'h4v5h-4z';
        }
      }
    }
    return { d: d || 'M0 0' };
  });
  return <AnimatedPath animatedProps={props} fill={color} />;
}

function WindowRain({ clock, color }: { clock: SceneClock; color: string }) {
  const props = useAnimatedProps(() => {
    let d = '';
    const t = clock.wall.value * (30 + 20 * clock.play.value);
    for (let n = 0; n < 24; n += 1) {
      const x = WINDOW.x + ((n * 29) % WINDOW.w);
      const y = WINDOW.y + ((t + n * 41) % (WINDOW.h + 20)) - 14;
      d += 'M' + x + ' ' + y + ' l -2 10 ';
    }
    return { d };
  });
  return (
    <AnimatedPath
      animatedProps={props}
      opacity={0.6}
      stroke={color}
      strokeWidth={1.2}
    />
  );
}

function Lofi({ kit }: { kit: PlayerKit }) {
  const { colors } = useColors();
  const styles = useStyles();
  const s = colors.skin;
  const clock = useSceneClock(kit, { boost: 0, changeSeconds: 1.2 });
  const lamp = useAnimatedProps(() => {
    const c = clock.change.value;
    const flicker = c > 0 ? (Math.floor(c * 12) % 3 ? 0.08 : 0.4) : 0.32;
    return { opacity: flicker };
  });
  const steam = useAnimatedProps(() => {
    const w = (k: number) => Math.sin(clock.wall.value * 1.2 + k) * 5;
    return {
      d:
        'M244 186 c ' +
        w(0) +
        ' -10 ' +
        -w(1) +
        ' -18 0 -28 M258 184 c ' +
        w(2) +
        ' -12 ' +
        -w(3) +
        ' -20 0 -32',
      strokeOpacity: 0.25 + 0.5 * clock.play.value,
    };
  });
  return (
    <SceneBox
      background={s.wall ?? colors.surface}
      clock={clock}
      label="Cuarto acogedor con lluvia en la ventana"
      radius={22}
    >
      <Layer>
        <Defs>
          <ClipPath id="lofi-window">
            <Rect
              height={WINDOW.h}
              width={WINDOW.w}
              x={WINDOW.x}
              y={WINDOW.y}
            />
          </ClipPath>
        </Defs>
        <Rect
          fill={s.night}
          height={WINDOW.h}
          width={WINDOW.w}
          x={WINDOW.x}
          y={WINDOW.y}
        />
        <G clipPath="url(#lofi-window)">
          <Path
            d={`M${WINDOW.x} ${WINDOW.y + WINDOW.h} V ${WINDOW.y + 104} H ${
              WINDOW.x + 20
            } V ${WINDOW.y + 76} H ${WINDOW.x + 44} V ${WINDOW.y + 114} H ${
              WINDOW.x + 60
            } V ${WINDOW.y + 62} H ${WINDOW.x + 90} V ${WINDOW.y + 98} H ${
              WINDOW.x + 108
            } V ${WINDOW.y + 86} H ${WINDOW.x + 132} V ${WINDOW.y + 52} H ${
              WINDOW.x + 156
            } V ${WINDOW.y + 106} H ${WINDOW.x + WINDOW.w} V ${
              WINDOW.y + WINDOW.h
            } Z`}
            fill={s.city}
          />
          <CityLights
            clock={clock}
            color={s.lights ?? '#ffd38a'}
            seed={Math.max(0, kit.queueIndex)}
          />
          <WindowRain clock={clock} color={s.rain ?? '#ffffff'} />
        </G>
        <Rect
          fill="none"
          height={WINDOW.h + 10}
          stroke={s.desk}
          strokeWidth={8}
          width={WINDOW.w + 10}
          x={WINDOW.x - 5}
          y={WINDOW.y - 5}
        />
        <Path
          d={`M${WINDOW.x + WINDOW.w / 2} ${WINDOW.y} V ${
            WINDOW.y + WINDOW.h
          } M${WINDOW.x} ${WINDOW.y + WINDOW.h / 2} H ${WINDOW.x + WINDOW.w}`}
          stroke={s.desk}
          strokeWidth={5}
        />
        <AnimatedCircle
          animatedProps={lamp}
          cx={280}
          cy={110}
          fill={s.lamp}
          r={70}
        />
        <Path
          d="M250 210 L 272 98 L 284 102"
          fill="none"
          opacity={0.7}
          stroke={s.ink}
          strokeLinecap="round"
          strokeWidth={5}
        />
        <Path d="M262 84 L 306 96 L 296 122 L 256 110 Z" fill={s.accent} />
        <Rect fill={s.desk} height={70} width={W} x={0} y={206} />
        <Path
          d="M40 210 Q 46 176 30 160 M40 210 Q 52 172 70 166 M40 210 Q 30 184 12 182"
          fill="none"
          stroke={s.plant}
          strokeLinecap="round"
          strokeWidth={7}
        />
        <Rect
          fill={s.accent}
          height={26}
          opacity={0.85}
          rx={4}
          width={34}
          x={24}
          y={196}
        />
        <Rect fill={s.panel} height={12} rx={3} width={96} x={110} y={198} />
        <Rect fill={s.line} height={10} rx={3} width={84} x={116} y={188} />
        <Rect fill={s.mug} height={38} rx={7} width={36} x={232} y={176} />
        <Path
          d="M268 184 q 14 0 14 11 t -14 11"
          fill="none"
          stroke={s.mug}
          strokeWidth={5}
        />
        <AnimatedPath
          animatedProps={steam}
          fill="none"
          stroke={s.mug}
          strokeLinecap="round"
          strokeWidth={3}
        />
      </Layer>
      <View pointerEvents="none" style={place(18, 236, 280, 32)}>
        <Text style={[styles.note, { color: s.mug }]}>
          {kit.isPlaying ? 'respira… sigue la música' : 'una pausa está bien'}
        </Text>
      </View>
    </SceneBox>
  );
}

/* ───────────────────────── Terror gótico ───────────────────────── */

function Bat({
  clock,
  k,
  speed,
  y,
  scale,
  color,
}: {
  clock: SceneClock;
  k: number;
  speed: number;
  y: number;
  scale: number;
  color: string;
}) {
  const style = useAnimatedStyle(() => {
    const a = clock.run.value * speed + k;
    const flap =
      clock.play.value > 0.5
        ? Math.sin(clock.wall.value * 14 + k) > 0
          ? 1
          : -0.5
        : 1;
    return {
      transform: [
        { translateX: (160 - 24 + Math.sin(a) * 120) * clock.unit.value },
        { translateY: (y + Math.sin(a * 2.3) * 16) * clock.unit.value },
        { scale },
        { scaleY: flap },
      ],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[place(0, 0, 48, 20), style]}>
      <Svg height="100%" viewBox="-24 -10 48 20" width="100%">
        <Path
          d="M0 0 Q -10 -10 -24 -4 Q -16 0 -14 6 Q -6 2 0 6 Q 6 2 14 6 Q 16 0 24 -4 Q 10 -10 0 0 Z"
          fill={color}
        />
      </Svg>
    </Animated.View>
  );
}

function Flame({
  clock,
  x,
  y,
  k,
  color,
}: {
  clock: SceneClock;
  x: number;
  y: number;
  k: number;
  color: string;
}) {
  const props = useAnimatedProps(() => {
    const t = clock.wall.value * 9;
    const h = 14 + Math.sin(t + k) * 3 + noise(Math.floor(t) + k) * 3;
    const sway = Math.sin(t * 0.7 + k) * 2;
    return {
      d:
        'M' +
        (x - 5) +
        ' ' +
        y +
        ' Q ' +
        (x - 6) +
        ' ' +
        (y - h * 0.5) +
        ' ' +
        (x + sway) +
        ' ' +
        (y - h) +
        ' Q ' +
        (x + 6) +
        ' ' +
        (y - h * 0.5) +
        ' ' +
        (x + 5) +
        ' ' +
        y +
        ' Z',
      opacity: clock.play.value,
    };
  });
  return <AnimatedPath animatedProps={props} fill={color} />;
}

function Smoke({
  clock,
  x,
  y,
  k,
  color,
}: {
  clock: SceneClock;
  x: number;
  y: number;
  k: number;
  color: string;
}) {
  const props = useAnimatedProps(() => ({
    d:
      'M' +
      x +
      ' ' +
      y +
      ' q ' +
      Math.sin(clock.wall.value + k) * 6 +
      ' -12 0 -24 t 0 -24',
    strokeOpacity: (1 - clock.play.value) * 0.6,
  }));
  return (
    <AnimatedPath
      animatedProps={props}
      fill="none"
      stroke={color}
      strokeWidth={2}
    />
  );
}

function Gothic({ kit }: { kit: PlayerKit }) {
  const { colors } = useColors();
  const s = colors.skin;
  const clock = useSceneClock(kit, { boost: 1, changeSeconds: 1 });
  // A single short flash, never a strobe.
  const lightning = useAnimatedProps(() => {
    const c = clock.change.value;
    return { opacity: c > 0.8 ? ((c - 0.8) / 0.2) * 0.75 : 0 };
  });
  const windowsLit = useAnimatedProps(() => ({
    opacity:
      0.15 +
      clock.play.value * (0.55 + noise(Math.floor(clock.wall.value * 3)) * 0.3),
  }));
  const fogA = useAnimatedProps(() => ({
    cx: 160 + Math.sin(clock.wall.value * 0.2) * 40,
  }));
  const fogB = useAnimatedProps(() => ({
    cx: 160 - Math.sin(clock.wall.value * 0.25) * 50,
  }));
  return (
    <SceneBox
      background={s.sky ?? colors.background}
      clock={clock}
      label="Castillo bajo la luna con murciélagos y velas"
      radius={6}
    >
      <Layer>
        <Circle cx={222} cy={70} fill={s.moon} r={40} />
        <Circle cx={240} cy={60} fill={s.sky} opacity={0.25} r={34} />
        <Path
          d="M36 276 V 172 L 50 152 L 64 172 V 134 H 78 V 114 L 92 92 L 106 114 V 134 H 120 V 190 H 146 V 88 L 164 60 L 182 88 V 190 H 210 V 144 L 224 126 L 238 144 V 210 H 284 V 182 L 298 168 L 312 182 V 276 Z"
          fill={s.castle}
        />
        <AnimatedRect
          animatedProps={windowsLit}
          fill={s.flame}
          height={20}
          rx={7}
          width={14}
          x={157}
          y={116}
        />
        <AnimatedRect
          animatedProps={windowsLit}
          fill={s.flame}
          height={16}
          rx={6}
          width={12}
          x={86}
          y={146}
        />
      </Layer>
      <Bat
        clock={clock}
        color={s.bat ?? '#000000'}
        k={0}
        scale={1}
        speed={0.35}
        y={110}
      />
      <Bat
        clock={clock}
        color={s.bat ?? '#000000'}
        k={2}
        scale={0.7}
        speed={0.5}
        y={84}
      />
      <Bat
        clock={clock}
        color={s.bat ?? '#000000'}
        k={4}
        scale={0.55}
        speed={0.28}
        y={146}
      />
      <Layer>
        <AnimatedEllipse
          animatedProps={fogA}
          cy={262}
          fill={s.fog}
          opacity={0.55}
          rx={190}
          ry={30}
        />
        <AnimatedEllipse
          animatedProps={fogB}
          cy={276}
          fill={s.fog}
          opacity={0.45}
          rx={150}
          ry={22}
        />
        <Rect fill={s.moon} height={44} rx={3} width={14} x={38} y={222} />
        <Rect fill={s.moon} height={50} rx={3} width={14} x={268} y={216} />
        <Flame
          clock={clock}
          color={s.flame ?? '#ffb44a'}
          k={0}
          x={45}
          y={222}
        />
        <Flame
          clock={clock}
          color={s.flame ?? '#ffb44a'}
          k={2}
          x={275}
          y={216}
        />
        <Smoke clock={clock} color={s.sub ?? '#999999'} k={0} x={45} y={220} />
        <Smoke clock={clock} color={s.sub ?? '#999999'} k={2} x={275} y={214} />
        <AnimatedRect
          animatedProps={lightning}
          fill={s.moon}
          height={H}
          width={W}
          x={0}
          y={0}
        />
      </Layer>
    </SceneBox>
  );
}

/* ───────────────────────── Playa ───────────────────────── */

function waveLine(
  y: number,
  shift: number,
  a: number,
  len: number,
  close: boolean,
) {
  'worklet';
  let d = 'M -40 ' + y;
  for (let x = -40; x <= 360; x += 20)
    d += ' L ' + x + ' ' + (y + Math.sin((x + shift) / len) * a);
  return close ? d + ' V ' + (H + 10) + ' H -40 Z' : d;
}

function Gull({
  clock,
  k,
  y,
  speed,
  color,
}: {
  clock: SceneClock;
  k: number;
  y: number;
  speed: number;
  color: string;
}) {
  const props = useAnimatedProps(() => {
    if (clock.play.value < 0.5) return { d: 'M0 0' };
    const cx = 30 + ((clock.run.value * speed + k * 120) % 300);
    const f = Math.sin(clock.wall.value * 5 + k) * 5;
    return {
      d:
        'M' +
        (cx - 12) +
        ' ' +
        (y + f) +
        ' Q ' +
        (cx - 6) +
        ' ' +
        (y - 6) +
        ' ' +
        cx +
        ' ' +
        y +
        ' Q ' +
        (cx + 6) +
        ' ' +
        (y - 6) +
        ' ' +
        (cx + 12) +
        ' ' +
        (y + f),
    };
  });
  return (
    <AnimatedPath
      animatedProps={props}
      fill="none"
      stroke={color}
      strokeLinecap="round"
      strokeWidth={2.5}
    />
  );
}

function Beach({ kit }: { kit: PlayerKit }) {
  const { colors } = useColors();
  const s = colors.skin;
  const clock = useSceneClock(kit, { boost: 1, changeSeconds: 1.8 });
  const amp = (k: number) => {
    'worklet';
    return 3 + 6 * clock.play.value * k;
  };
  const sun = useAnimatedProps(() => ({ cy: 70 + clock.progress.value * 46 }));
  const back = useAnimatedProps(() => ({
    d: waveLine(
      166,
      -clock.run.value * 18 - clock.wall.value * 4,
      amp(0.7),
      30,
      true,
    ),
  }));
  const front = useAnimatedProps(() => ({
    d: waveLine(
      188,
      clock.run.value * 30 + clock.wall.value * 6,
      amp(1),
      24,
      true,
    ),
  }));
  const foam = useAnimatedProps(() => ({
    d: waveLine(
      188,
      clock.run.value * 30 + clock.wall.value * 6,
      amp(1),
      24,
      false,
    ),
  }));
  const shore = useAnimatedProps(() => {
    const c = clock.change.value;
    const k = c > 0 ? Math.sin((1 - c) * Math.PI) : 0;
    return {
      d:
        'M -10 ' +
        (H + 10) +
        ' L -10 ' +
        (244 - k * 30) +
        ' Q 110 ' +
        (232 - k * 30) +
        ' 330 ' +
        (254 - k * 22) +
        ' V ' +
        (H + 10) +
        ' Z',
    };
  });
  const wash = useAnimatedProps(() => {
    const c = clock.change.value;
    const k = c > 0 ? Math.sin((1 - c) * Math.PI) : 0;
    return {
      d:
        'M -10 ' +
        (H + 10) +
        ' V ' +
        (244 - k * 80) +
        ' Q 160 ' +
        (220 - k * 80) +
        ' 330 ' +
        (244 - k * 80) +
        ' V ' +
        (H + 10) +
        ' Z',
      opacity: k * 0.85,
    };
  });
  const boat = useAnimatedStyle(() => {
    const x = 120 + Math.sin(clock.run.value * 0.1) * 60;
    const phase = (x + clock.run.value * 18 + clock.wall.value * 4) / 30;
    const a = amp(0.7);
    return {
      transform: [
        { translateX: (x - 32) * clock.unit.value },
        { translateY: (166 - 48 + Math.sin(phase) * a) * clock.unit.value },
        { rotate: `${Math.cos(phase) * (3 + 5 * clock.play.value)}deg` },
      ],
    };
  });
  return (
    <SceneBox
      background={s.sky ?? colors.surface}
      clock={clock}
      label="Playa con olas, un velero y gaviotas"
      radius={28}
    >
      <Layer>
        <AnimatedCircle animatedProps={sun} cx={240} fill={s.sun} r={36} />
        <Gull
          clock={clock}
          color={s.bird ?? colors.text}
          k={0}
          speed={15}
          y={56}
        />
        <Gull
          clock={clock}
          color={s.bird ?? colors.text}
          k={1}
          speed={12}
          y={82}
        />
        <AnimatedPath animatedProps={back} fill={s.seaDeep} />
      </Layer>
      <Animated.View pointerEvents="none" style={[place(0, 0, 64, 62), boat]}>
        <Svg height="100%" viewBox="-32 -48 64 62" width="100%">
          <Path d="M-30 0 H 30 L 20 14 H -20 Z" fill={s.boat} />
          <Path d="M0 0 V -46 L 26 -6 Z" fill={s.foam} />
          <Path d="M0 -46 V 0" stroke={s.ink} strokeWidth={2} />
        </Svg>
      </Animated.View>
      <Layer>
        <AnimatedPath animatedProps={front} fill={s.sea} />
        <AnimatedPath
          animatedProps={foam}
          fill="none"
          opacity={0.8}
          stroke={s.foam}
          strokeWidth={3}
        />
        <AnimatedPath animatedProps={shore} fill={s.sand} />
        <AnimatedPath animatedProps={wash} fill={s.foam} />
      </Layer>
    </SceneBox>
  );
}

export type ScenesDKind =
  | 'fantasiamedieval'
  | 'lofi'
  | 'terrorgotico'
  | 'playa';

export function ScenesD({ kind, kit }: { kind: ScenesDKind; kit: PlayerKit }) {
  if (kind === 'fantasiamedieval') return <Fantasy kit={kit} />;
  if (kind === 'lofi') return <Lofi kit={kit} />;
  if (kind === 'terrorgotico') return <Gothic kit={kit} />;
  return <Beach kit={kit} />;
}

const useStyles = createStyles(colors => ({
  note: { fontFamily: 'Caveat', fontSize: 24, color: colors.text },
}));
