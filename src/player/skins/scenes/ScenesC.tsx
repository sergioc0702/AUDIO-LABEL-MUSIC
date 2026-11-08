import { Text, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Pattern,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { formatTime } from '../../../utils/formatTime';
import { createStyles, useColors } from '../../../theme/theme';
import type { PlayerKit } from '../kit';
import {
  AnimatedCircle,
  AnimatedLine,
  AnimatedPath,
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
const STAR =
  'M12 0 C 13 9 15 11 24 12 C 15 13 13 15 12 24 C 11 15 9 13 0 12 C 9 11 11 9 12 0 Z';

/* ───────────────────────── Manga ───────────────────────── */

const SPEED_LINES = (() => {
  let d = '';
  for (let n = 0; n < 40; n += 1) {
    const a = (n / 40) * Math.PI * 2;
    const b = a + 0.035;
    d += `M200 200 L ${200 + Math.cos(a) * 300} ${200 + Math.sin(a) * 300} L ${
      200 + Math.cos(b) * 300
    } ${200 + Math.sin(b) * 300} Z `;
  }
  return d;
})();
const WORDS = ['¡TUM!', '¡PUM!', '¡BUM!', '¡TSS!'];

function Burst({
  clock,
  seed,
  fill,
  ink,
}: {
  clock: SceneClock;
  seed: number;
  fill: string;
  ink: string;
}) {
  const props = useAnimatedProps(() => {
    const live = clock.play.value > 0.5;
    const beat = live ? Math.floor(clock.wall.value * 2.5) % 2 : 0;
    const grow = (live ? (beat ? 1.08 : 0.94) : 0.8) + clock.change.value * 0.2;
    let pts = '';
    for (let n = 0; n < 28; n += 1) {
      const a = (n / 28) * Math.PI * 2;
      const r = (n % 2 ? 46 : 74 + noise(n + seed) * 14) * grow;
      pts +=
        (n ? ' L ' : 'M') +
        (160 + Math.cos(a) * r * 1.3).toFixed(1) +
        ' ' +
        (88 + Math.sin(a) * r * 0.85).toFixed(1);
    }
    return { d: pts + ' Z' };
  });
  return (
    <AnimatedPath
      animatedProps={props}
      fill={fill}
      stroke={ink}
      strokeLinejoin="round"
      strokeWidth={4}
    />
  );
}

function Sfx({
  clock,
  index,
  word,
  color,
  font,
}: {
  clock: SceneClock;
  index: number;
  word: string;
  color: string;
  font?: string;
}) {
  const styles = useStyles();
  const style = useAnimatedStyle(() => {
    const live = clock.play.value > 0.5;
    const c = clock.change.value;
    let show = false;
    if (index === 4) show = c > 0;
    else if (index === 5) show = !live && c === 0;
    else
      show =
        live && c === 0 && Math.floor(clock.wall.value * 1.25) % 4 === index;
    const beat = Math.floor(clock.wall.value * 2.5) % 2;
    return {
      opacity: show ? 1 : 0,
      transform: [
        { rotate: '-8deg' },
        { scale: index === 4 ? 1.15 : beat ? 1.08 : 1 },
      ],
    };
  });
  return (
    <Animated.Text style={[styles.sfx, { color, fontFamily: font }, style]}>
      {word}
    </Animated.Text>
  );
}

function Manga({ kit }: { kit: PlayerKit }) {
  const { colors } = useColors();
  const styles = useStyles();
  const s = colors.skin;
  const clock = useSceneClock(kit, { boost: 0, changeSeconds: 1 });
  const ink = s.ink ?? colors.text;
  const font = colors.design.fonts.display;
  const panel = useAnimatedStyle(() => {
    const c = clock.change.value;
    return {
      transform: [
        { rotate: `${c > 0 ? (Math.floor(c * 10) % 2 ? -2 : 2) : 0}deg` },
        { scale: 1 + c * 0.06 },
      ],
    };
  });
  const spin = useAnimatedStyle(() => ({
    opacity: 0.25 + 0.65 * clock.play.value,
    transform: [{ rotate: `${(clock.run.value * 6) % 360}deg` }],
  }));
  return (
    <SceneBox
      background={s.bg ?? colors.background}
      clock={clock}
      label="Viñetas de manga que laten con la música"
      radius={0}
    >
      <Animated.View
        style={[
          place(4, 4, 312, 176),
          styles.panel,
          { borderColor: ink, backgroundColor: s.panel },
          panel,
        ]}
      >
        <Animated.View
          style={[
            {
              position: 'absolute',
              left: '-36%',
              top: '-70%',
              width: '172%',
              aspectRatio: 1,
            },
            spin,
          ]}
        >
          <Svg height="100%" viewBox="0 0 400 400" width="100%">
            <Path d={SPEED_LINES} fill={s.tone} />
          </Svg>
        </Animated.View>
        <Svg height="100%" style={FILL} viewBox="0 0 320 176" width="100%">
          <Burst
            clock={clock}
            fill={s.pop ?? '#ffffff'}
            ink={ink}
            seed={kit.queueIndex}
          />
        </Svg>
        <View pointerEvents="none" style={[FILL, styles.center]}>
          {WORDS.map((word, index) => (
            <View key={word} style={[FILL, styles.center]}>
              <Sfx
                clock={clock}
                color={s.popInk ?? ink}
                font={font}
                index={index}
                word={word}
              />
            </View>
          ))}
          <View style={[FILL, styles.center]}>
            <Sfx
              clock={clock}
              color={s.popInk ?? ink}
              font={font}
              index={4}
              word="¡ZAS!"
            />
          </View>
          <View style={[FILL, styles.center]}>
            <Sfx
              clock={clock}
              color={s.popInk ?? ink}
              font={font}
              index={5}
              word="…"
            />
          </View>
        </View>
      </Animated.View>
      <View
        style={[
          place(4, 188, 152, 84),
          styles.panel,
          { borderColor: ink, backgroundColor: s.panel },
        ]}
      >
        <Svg height="100%" style={FILL} width="100%">
          <Defs>
            <Pattern
              height={8}
              id="manga-tone"
              patternUnits="userSpaceOnUse"
              width={8}
            >
              <Circle cx={4} cy={4} fill={s.tone} r={1.5} />
            </Pattern>
          </Defs>
          <Rect fill="url(#manga-tone)" height="100%" width="100%" />
        </Svg>
        <View style={[FILL, styles.center]}>
          <View
            style={[
              styles.bubble,
              { backgroundColor: s.panel, borderColor: ink },
            ]}
          >
            <Text style={[styles.bubbleText, { color: ink }]}>
              {kit.isPlaying ? '¡Esta suena fuerte!' : 'Shh… en pausa'}
            </Text>
          </View>
        </View>
      </View>
      <View
        style={[
          place(164, 188, 152, 84),
          styles.panel,
          styles.center,
          { borderColor: ink, backgroundColor: s.accent },
        ]}
      >
        <Text style={[styles.chapter, { color: s.onAccent, fontFamily: font }]}>
          {kit.queueIndex + 1}
        </Text>
        <Text style={[styles.chapterSub, { color: s.onAccent }]}>
          DE {kit.queueCount}
        </Text>
      </View>
    </SceneBox>
  );
}

/* ───────────────────────── Steampunk ───────────────────────── */

function gearPath(teeth: number, r: number, depth: number, c: number) {
  let d = '';
  for (let n = 0; n < teeth * 2; n += 1) {
    const a0 = (n / (teeth * 2)) * Math.PI * 2;
    const a1 = ((n + 1) / (teeth * 2)) * Math.PI * 2;
    const rr = n % 2 ? r : r + depth;
    d += `${n ? 'L' : 'M'}${(c + Math.cos(a0) * rr).toFixed(1)} ${(
      c +
      Math.sin(a0) * rr
    ).toFixed(1)} L${(c + Math.cos(a1) * rr).toFixed(1)} ${(
      c +
      Math.sin(a1) * rr
    ).toFixed(1)} `;
  }
  return d + 'Z';
}

const GEAR_BIG = gearPath(14, 50, 10, 60);
const GEAR_SMALL = gearPath(9, 27, 8, 35);

function Gear({
  clock,
  x,
  y,
  size,
  path,
  ratio,
  offset,
  fill,
  hub,
}: {
  clock: SceneClock;
  x: number;
  y: number;
  size: number;
  path: string;
  ratio: number;
  offset: number;
  fill: string;
  hub: string;
}) {
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${clock.run.value * 24 * ratio + offset}deg` }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[place(x - size / 2, y - size / 2, size, size), style]}
    >
      <Svg height="100%" viewBox={`0 0 ${size} ${size}`} width="100%">
        <Path d={path} fill={fill} />
        <Circle cx={size / 2} cy={size / 2} fill={hub} r={size * 0.18} />
        <Circle cx={size / 2} cy={size / 2} fill={fill} r={size * 0.07} />
      </Svg>
    </Animated.View>
  );
}

function Puff({
  clock,
  n,
  color,
}: {
  clock: SceneClock;
  n: number;
  color: string;
}) {
  const props = useAnimatedProps(() => {
    const life = ((clock.run.value * 2.8 + n * 0.9) % 3.6) / 3.6;
    const big = 1 + clock.change.value * 0.8;
    return {
      cx: 296 - life * 26,
      cy: 40 - life * 50 * big,
      r: (7 + life * 20) * big,
      opacity:
        clamp01(clock.play.value + clock.change.value) * (1 - life) * 0.6,
    };
  });
  return <AnimatedCircle animatedProps={props} fill={color} />;
}

function Steampunk({ kit }: { kit: PlayerKit }) {
  const { colors } = useColors();
  const styles = useStyles();
  const s = colors.skin;
  const clock = useSceneClock(kit, { boost: 6, changeSeconds: 2 });
  const needle = useAnimatedProps(() => {
    const a =
      (-120 +
        clock.play.value *
          (40 +
            clock.progress.value * 160 +
            Math.sin(clock.wall.value * 7) * 3)) *
        (Math.PI / 180) -
      Math.PI / 2;
    const tip = [86 + Math.cos(a) * 42, 86 + Math.sin(a) * 42];
    const side = a + Math.PI / 2;
    return {
      d:
        'M' +
        (86 + Math.cos(side) * 3) +
        ' ' +
        (86 + Math.sin(side) * 3) +
        ' L ' +
        tip[0] +
        ' ' +
        tip[1] +
        ' L ' +
        (86 - Math.cos(side) * 3) +
        ' ' +
        (86 - Math.sin(side) * 3) +
        ' Z',
    };
  });
  const ticks = Array.from({ length: 11 }, (_, n) => {
    const a = (-120 + n * 24) * (Math.PI / 180) - Math.PI / 2;
    return `M${86 + Math.cos(a) * 36} ${86 + Math.sin(a) * 36} L${
      86 + Math.cos(a) * 44
    } ${86 + Math.sin(a) * 44} `;
  }).join('');
  const metal = s.metal ?? colors.surfaceHigh;
  const dark = s.metalDark ?? colors.outline;
  return (
    <SceneBox
      background={s.panel ?? colors.surface}
      clock={clock}
      label="Engranajes de vapor que giran con la música"
      radius={14}
    >
      <Layer>
        <Rect
          fill="none"
          height={270}
          rx={12}
          stroke={dark}
          strokeWidth={5}
          width={314}
          x={3}
          y={3}
        />
        {[
          [14, 14],
          [306, 14],
          [14, 262],
          [306, 262],
        ].map(([x, y]) => (
          <Circle key={`${x}-${y}`} cx={x} cy={y} fill={metal} r={4} />
        ))}
        <Path
          d="M262 276 V 64 Q 262 46 280 46 H 296"
          fill="none"
          stroke={dark}
          strokeWidth={14}
        />
        <Rect fill={metal} height={18} rx={3} width={20} x={292} y={37} />
        <Circle cx={86} cy={86} fill={metal} r={58} />
        <Circle cx={86} cy={86} fill={s.dial} r={49} />
        <Path d={ticks} stroke={s.dialInk} strokeWidth={2} />
        <Path
          d="M119 116 A 44 44 0 0 0 128 76"
          fill="none"
          stroke={s.accent}
          strokeWidth={5}
        />
        <AnimatedPath animatedProps={needle} fill={s.dialInk} />
        <Circle cx={86} cy={86} fill={dark} r={6} />
        {[0, 1, 2, 3].map(n => (
          <Puff key={n} clock={clock} color={s.steam ?? '#ffffff'} n={n} />
        ))}
      </Layer>
      <Gear
        clock={clock}
        fill={metal}
        hub={dark}
        offset={0}
        path={GEAR_BIG}
        ratio={1}
        size={120}
        x={110}
        y={204}
      />
      <Gear
        clock={clock}
        fill={dark}
        hub={metal}
        offset={10}
        path={GEAR_SMALL}
        ratio={-1.75}
        size={70}
        x={202}
        y={238}
      />
      <Gear
        clock={clock}
        fill={metal}
        hub={dark}
        offset={0}
        path={GEAR_SMALL}
        ratio={-1.75}
        size={70}
        x={196}
        y={152}
      />
      <View
        pointerEvents="none"
        style={[place(26, 150, 120, 16), styles.center]}
      >
        <Text
          style={[
            styles.plate,
            { color: s.sub, fontFamily: colors.design.fonts.display },
          ]}
        >
          PRESIÓN
        </Text>
      </View>
    </SceneBox>
  );
}

/* ───────────────────────── Nave espacial ───────────────────────── */

function SpaceStar({
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
    const warp = c > 0 ? Math.sin((1 - c) * Math.PI) : 0;
    const baseX = noise(n * 3.1) * W;
    const y = noise(n * 7.3 + 2) * H;
    const raw = (baseX - clock.run.value * (4 + noise(n) * 8)) % W;
    const x = raw < 0 ? raw + W : raw;
    const a = Math.atan2(y - H / 2, x - W / 2);
    const len = 2 + warp * 90 * (0.5 + noise(n * 9));
    return {
      x1: x,
      y1: y,
      x2: x + Math.cos(a) * len,
      y2: y + Math.sin(a) * len,
    };
  });
  return (
    <AnimatedLine
      animatedProps={props}
      opacity={0.4 + noise(n * 5) * 0.6}
      stroke={color}
      strokeLinecap="round"
      strokeWidth={2}
    />
  );
}

function Nave({ kit }: { kit: PlayerKit }) {
  const { colors } = useColors();
  const styles = useStyles();
  const s = colors.skin;
  const clock = useSceneClock(kit, { boost: 8, changeSeconds: 1.8 });
  const px = 140 + (Math.max(0, kit.queueIndex) % 3) * 16;
  const bands = useAnimatedProps(() => {
    let d = '';
    for (let n = 0; n < 5; n += 1) {
      const y = 70 + n * 26;
      const shift = (clock.run.value * 12 + n * 40) % 180;
      d +=
        'M' +
        (px - 90) +
        ' ' +
        y +
        ' h 180 v ' +
        (6 + (n % 3) * 4) +
        ' h -180 z ';
      d += 'M' + (px - 80 + shift) + ' ' + (y + 12) + ' h 40 v 4 h -40 z ';
    }
    return { d };
  });
  const planet = useAnimatedStyle(() => {
    const c = clock.change.value;
    return { opacity: c > 0 ? 1 - Math.sin((1 - c) * Math.PI) : 1 };
  });
  const sweep = useAnimatedStyle(() => ({
    transform: [{ rotate: `${(clock.wall.value * 60) % 360}deg` }],
  }));
  const blip = useAnimatedStyle(() => {
    const a = (clock.wall.value * 60) % 360;
    return { opacity: clock.play.value > 0.5 && a > 40 && a < 160 ? 1 : 0.2 };
  });
  const hud = kit.isPlaying ? 'MOTORES ESTABLES' : 'MOTORES EN ESPERA';
  return (
    <SceneBox
      background={s.space ?? '#02050d'}
      clock={clock}
      label="Ventana de una nave espacial"
      radius={36}
    >
      <Layer>
        {Array.from({ length: 30 }, (_, n) => (
          <SpaceStar key={n} clock={clock} color={s.star ?? '#ffffff'} n={n} />
        ))}
      </Layer>
      <Animated.View pointerEvents="none" style={[FILL, planet]}>
        <Layer>
          <Defs>
            <ClipPath id="nave-planet">
              <Circle cx={px} cy={120} r={74} />
            </ClipPath>
          </Defs>
          <Circle cx={px} cy={120} fill={s.planet} r={74} />
          <G clipPath="url(#nave-planet)">
            <AnimatedPath
              animatedProps={bands}
              fill={s.planet2}
              opacity={0.55}
            />
            <Circle
              cx={px + 36}
              cy={120}
              fill={s.space}
              opacity={0.45}
              r={74}
            />
          </G>
          <Ellipse
            cx={px}
            cy={120}
            fill="none"
            opacity={0.7}
            rx={116}
            ry={20}
            stroke={s.ring}
            strokeWidth={3}
            transform={`rotate(-14 ${px} 120)`}
          />
        </Layer>
      </Animated.View>
      <View
        style={[
          place(232, 190, 76, 76),
          styles.radar,
          { borderColor: s.accent },
        ]}
      >
        <Animated.View style={[FILL, sweep]}>
          <Svg height="100%" viewBox="0 0 76 76" width="100%">
            <Path
              d="M38 38 L38 0 A38 38 0 0 1 70.9 19 Z"
              fill={s.accent}
              opacity={0.4}
            />
          </Svg>
        </Animated.View>
        <View
          style={[
            styles.radarDot,
            { backgroundColor: s.accent, left: '46%', top: '46%' },
          ]}
        />
        <Animated.View
          style={[
            styles.radarDot,
            { backgroundColor: s.accent, left: '66%', top: '24%' },
            blip,
          ]}
        />
      </View>
      <View pointerEvents="none" style={place(16, 222, 200, 44)}>
        <Text
          style={[
            styles.hud,
            { color: s.accent, fontFamily: colors.design.fonts.display },
          ]}
        >
          {`${hud}\nSECTOR ${String(kit.queueIndex + 1).padStart(
            2,
            '0',
          )} · ${formatTime(kit.position)}`}
        </Text>
      </View>
      <Layer>
        <Rect
          fill="none"
          height={270}
          rx={34}
          stroke={s.line}
          strokeWidth={5}
          width={314}
          x={3}
          y={3}
        />
      </Layer>
    </SceneBox>
  );
}

/* ───────────────────────── Y2K ───────────────────────── */

function Bubble({ clock, n }: { clock: SceneClock; n: number }) {
  const props = useAnimatedProps(() => ({
    cx: 24 + noise(n * 4.1) * 270,
    cy: H + 20 - ((clock.run.value * (8 + n * 2) + n * 70) % (H + 60)),
  }));
  return (
    <AnimatedCircle
      animatedProps={props}
      fill="url(#y2k-bubble)"
      opacity={0.75}
      r={13 + noise(n * 2.3) * 15}
    />
  );
}

function Sparkle({ clock, n }: { clock: SceneClock; n: number }) {
  const style = useAnimatedStyle(() => ({
    opacity: Math.max(0, Math.sin(clock.wall.value * 1.5 + n * 1.7)),
    transform: [
      {
        scale:
          0.6 + Math.max(0, Math.sin(clock.wall.value * 1.5 + n * 1.7)) * 0.5,
      },
    ],
  }));
  const size = 16 + n * 4;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        place(26 + noise(n * 6.1) * 270, 16 + noise(n * 3.7) * 240, size, size),
        style,
      ]}
    >
      <Svg height="100%" viewBox="0 0 24 24" width="100%">
        <Path d={STAR} fill="#ffffff" />
      </Svg>
    </Animated.View>
  );
}

function Y2K({ kit }: { kit: PlayerKit }) {
  const { colors } = useColors();
  const s = colors.skin;
  const clock = useSceneClock(kit, { boost: 4, changeSeconds: 1.6 });
  const holo = [s.holo1, s.holo2, s.holo3, s.chrome].map(
    c => c ?? colors.surfaceHigh,
  );
  const sheen = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${(clock.wall.value * 10 + clock.run.value * 10) % 360}deg` },
    ],
  }));
  const disc = useAnimatedStyle(() => {
    const c = clock.change.value;
    const eject = c > 0 ? Math.sin((1 - c) * Math.PI) : 0;
    return {
      transform: [
        { translateY: -eject * 300 * clock.unit.value },
        { rotate: `${(clock.run.value * 90) % 360}deg` },
      ],
    };
  });
  const wedges = Array.from({ length: 12 }, (_, n) => {
    const a0 = (n / 12) * Math.PI * 2;
    const a1 = ((n + 1) / 12) * Math.PI * 2;
    return {
      d: `M100 100 L ${100 + Math.cos(a0) * 100} ${
        100 + Math.sin(a0) * 100
      } A 100 100 0 0 1 ${100 + Math.cos(a1) * 100} ${
        100 + Math.sin(a1) * 100
      } Z`,
      fill: n % 4 === 3 ? '#ffffff' : holo[n % 4],
    };
  });
  return (
    <SceneBox
      background={holo[0]}
      clock={clock}
      label="Disco tornasol que gira sobre un fondo holográfico"
      radius={40}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            left: '-40%',
            top: '-60%',
            width: '180%',
            aspectRatio: 1,
          },
          sheen,
        ]}
      >
        <Svg height="100%" viewBox="0 0 100 100" width="100%">
          <Defs>
            <LinearGradient id="y2k-holo" x1="0" x2="1" y1="0" y2="1">
              <Stop offset="0" stopColor={holo[0]} />
              <Stop offset="0.33" stopColor={holo[1]} />
              <Stop offset="0.66" stopColor={holo[2]} />
              <Stop offset="1" stopColor={holo[0]} />
            </LinearGradient>
          </Defs>
          <Rect fill="url(#y2k-holo)" height={100} width={100} />
        </Svg>
      </Animated.View>
      <Layer>
        <Defs>
          <RadialGradient cx="32%" cy="28%" id="y2k-bubble" r="70%">
            <Stop offset="0" stopColor="#ffffff" />
            <Stop offset="0.4" stopColor={holo[0]} />
            <Stop offset="1" stopColor={holo[3]} />
          </RadialGradient>
        </Defs>
        {[0, 1, 2, 3, 4].map(n => (
          <Bubble key={n} clock={clock} n={n} />
        ))}
      </Layer>
      <Animated.View
        pointerEvents="none"
        style={[place(60, 38, 200, 200), disc]}
      >
        <Svg height="100%" viewBox="0 0 200 200" width="100%">
          {wedges.map((w, n) => (
            <Path key={n} d={w.d} fill={w.fill} opacity={0.9} />
          ))}
          <Circle
            cx={100}
            cy={100}
            fill={s.panel}
            r={34}
            stroke={s.line}
            strokeWidth={9}
          />
          <Circle cx={100} cy={100} fill={s.bg} r={10} />
        </Svg>
      </Animated.View>
      {[0, 1, 2, 3].map(n => (
        <Sparkle key={n} clock={clock} n={n} />
      ))}
    </SceneBox>
  );
}

/* ───────────────────────── Western ───────────────────────── */

function DustPuff({
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
    const k = 1 - c;
    return {
      cx: 50 + n * 80 + noise(n) * 30,
      cy: 152 - k * 26,
      r: c > 0 ? 10 + k * 30 : 0,
      opacity: c * 0.7,
    };
  });
  return <AnimatedCircle animatedProps={props} fill={color} />;
}

function Western({ kit }: { kit: PlayerKit }) {
  const { colors } = useColors();
  const styles = useStyles();
  const s = colors.skin;
  const clock = useSceneClock(kit, { boost: 2, changeSeconds: 1.4 });
  const poster = useAnimatedStyle(() => {
    const c = clock.change.value;
    const tilt =
      c > 0
        ? Math.sin(c * 18) * c * 5
        : Math.sin(clock.wall.value * 0.5) * 0.8 * clock.play.value;
    return { transform: [{ rotate: `${tilt}deg` }] };
  });
  const sun = useAnimatedProps(() => ({ cy: 44 + clock.progress.value * 50 }));
  const weed = useAnimatedStyle(() => {
    const roll = clock.run.value * 32;
    return {
      transform: [
        { translateX: ((roll % 290) - 20) * clock.unit.value },
        { translateY: -Math.abs(Math.sin(roll / 18)) * 8 * clock.unit.value },
        { rotate: `${(roll * 4) % 360}deg` },
      ],
    };
  });
  const display = colors.design.fonts.display;
  return (
    <SceneBox
      background={s.bg ?? colors.background}
      clock={clock}
      label="Cartel de se busca en el desierto"
      radius={4}
    >
      <Animated.View
        style={[
          place(22, 6, 276, 264),
          { transformOrigin: '50% 0%', backgroundColor: s.poster },
          styles.poster,
          poster,
        ]}
      >
        <View style={[styles.pin, { backgroundColor: s.accent }]} />
        <Text
          style={[styles.wanted, { color: s.posterInk, fontFamily: display }]}
        >
          SE BUSCA
        </Text>
        <View
          style={[
            styles.scene,
            { borderColor: s.posterInk, backgroundColor: s.sky },
          ]}
        >
          <Svg height="100%" viewBox="0 0 240 150" width="100%">
            <AnimatedCircle animatedProps={sun} cx={170} fill={s.sun} r={24} />
            <Path
              d="M0 116 L 26 116 L 34 80 L 80 80 L 90 116 L 142 116 L 150 92 L 194 92 L 202 116 L 240 116 V 150 H 0 Z"
              fill={s.mesaFar}
            />
            <Path
              d="M0 150 V 108 L 20 108 L 28 70 L 62 70 L 70 108 H 240 V 150 Z"
              fill={s.mesa}
            />
            <Path d="M0 128 Q 120 118 240 130 V 150 H 0 Z" fill={s.sand} />
            <Path
              d="M196 134 V 92 M196 110 Q 184 110 184 98 M196 104 Q 208 104 208 90"
              fill="none"
              stroke={s.cactus}
              strokeLinecap="round"
              strokeWidth={8}
            />
            {[0, 1, 2].map(n => (
              <DustPuff
                key={n}
                clock={clock}
                color={s.sand ?? '#e8c48a'}
                n={n}
              />
            ))}
          </Svg>
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                left: 0,
                top: '76%',
                width: '10%',
                aspectRatio: 1,
              },
              weed,
            ]}
          >
            <Svg height="100%" viewBox="-12 -12 24 24" width="100%">
              <Circle fill="none" r={10} stroke={s.posterInk} strokeWidth={2} />
              <Path
                d="M-8 -4 L 7 5 M-5 7 L 6 -7 M-9 2 L 9 -2 M0 -10 L 2 10"
                stroke={s.posterInk}
                strokeWidth={1.6}
              />
            </Svg>
          </Animated.View>
        </View>
        <Text
          numberOfLines={1}
          style={[styles.reward, { color: s.posterInk, fontFamily: display }]}
        >
          Recompensa: {formatTime(kit.duration)} de música
        </Text>
      </Animated.View>
    </SceneBox>
  );
}

export type ScenesCKind =
  | 'manga'
  | 'steampunk'
  | 'naveespacial'
  | 'y2k'
  | 'western';

export function ScenesC({ kind, kit }: { kind: ScenesCKind; kit: PlayerKit }) {
  if (kind === 'manga') return <Manga kit={kit} />;
  if (kind === 'steampunk') return <Steampunk kit={kit} />;
  if (kind === 'naveespacial') return <Nave kit={kit} />;
  if (kind === 'y2k') return <Y2K kit={kit} />;
  return <Western kit={kit} />;
}

const useStyles = createStyles(() => ({
  center: { alignItems: 'center', justifyContent: 'center' },
  panel: { borderWidth: 4, overflow: 'hidden' },
  sfx: { fontSize: 50, lineHeight: 58 },
  bubble: {
    borderRadius: 40,
    borderWidth: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  bubbleText: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  chapter: { fontSize: 46, lineHeight: 50 },
  chapterSub: { fontSize: 11, letterSpacing: 2 },
  plate: { fontSize: 11, letterSpacing: 2 },
  radar: { borderRadius: 999, borderWidth: 1.5, overflow: 'hidden' },
  radarDot: { borderRadius: 3, height: 6, position: 'absolute', width: 6 },
  hud: { fontSize: 10, letterSpacing: 1, lineHeight: 17 },
  poster: { alignItems: 'center', paddingHorizontal: 16, paddingTop: 10 },
  pin: { borderRadius: 5, height: 10, position: 'absolute', top: 5, width: 10 },
  wanted: { fontSize: 32, letterSpacing: 2, marginTop: 6 },
  scene: {
    aspectRatio: 240 / 150,
    borderWidth: 3,
    marginTop: 6,
    overflow: 'hidden',
    width: '100%',
  },
  reward: { fontSize: 14, marginTop: 8 },
}));
