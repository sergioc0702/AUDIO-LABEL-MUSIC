import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RepeatMode } from 'react-native-track-player';
import {
  FileText,
  ListMusic,
  MoreHorizontal,
  Repeat,
  Repeat1,
  Shuffle,
} from 'lucide-react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { useColors } from '../../theme/theme';
import { formatTime } from '../../utils/formatTime';
import {
  DragHeader,
  SeekArea,
  usePlayerKit,
  type PlayerKit,
  type SkinProps,
} from '../../player/kit/playerKit';
import {
  AnimatedPath,
  noise,
  useSceneClock,
  type SceneClock,
} from '../../player/kit/sceneClock';
import {
  FIGURE_H,
  FIGURE_STARS,
  FIGURE_W,
  figureIndexFor,
  starFigures,
} from './starFigures';

const SERIF = 'CormorantGaramond-SemiBold';
const SERIF_ITALIC = 'CormorantGaramond-SemiBoldItalic';
const BODY = 'Outfit-Regular';
const BODY_MEDIUM = 'Outfit-Medium';
const HEADER = 52;
const SEEK = 52;
const TIMES = 18;
const TRANSPORT = 108;
const PILLS = 48;
const FAR = 54;
const BEADS = 12;

/** Plain copies of the figures, so the UI thread can read them. */
const POSE_A = starFigures.map(figure => figure.a.flat());
const POSE_B = starFigures.map(figure => figure.b.flat());
const EDGES = starFigures.map(figure => figure.edges.flat());

/** Where a morph between two animals is, 0 to 1 (change falls from 1 to 0). */
function morphPhase(change: number) {
  'worklet';
  return change > 0 ? 1 - change : 1;
}

/** A four-pointed star with curved sides, as an SVG path. */
function sparkle(x: number, y: number, r: number) {
  'worklet';
  const q = r * 0.22;
  const n = (v: number) => Math.round(v * 10) / 10;
  return `M${n(x)} ${n(y - r)}Q${n(x + q)} ${n(y - q)} ${n(x + r)} ${n(y)}Q${n(
    x + q,
  )} ${n(y + q)} ${n(x)} ${n(y + r)}Q${n(x - q)} ${n(y + q)} ${n(x - r)} ${n(
    y,
  )}Q${n(x - q)} ${n(y - q)} ${n(x)} ${n(y - r)}Z`;
}

/**
 * The living constellation: the animal of the song, made of stars, that
 * moves while the music plays, bursts into loose stars when the song changes
 * and gathers into the next animal.
 */
function Creature({
  clock,
  from,
  to,
  poke,
  width,
  height,
}: {
  clock: SceneClock;
  from: SharedValue<number>;
  to: SharedValue<number>;
  poke: SharedValue<number>;
  width: number;
  height: number;
}) {
  const { colors } = useColors();
  const s = colors.skin;
  const fit = Math.min((width - 16) / FIGURE_W, (height - 8) / FIGURE_H);
  const ox = (width - FIGURE_W * fit) / 2;
  const oy = (height - FIGURE_H * fit) / 2;

  // The stars are placed once per frame; the lines, their glow and the
  // stars all read from it.
  const frame = useDerivedValue(() => {
    const play = clock.play.value;
    const w =
      ((Math.sin(clock.run.value * 2.2) + 1) / 2) * play +
      ((Math.sin(clock.wall.value * 0.8) + 1) / 2) * 0.2 * (1 - play);
    const k = morphPhase(clock.change.value);
    const since = clock.wall.value - poke.value;
    const hop =
      since >= 0 && since < 0.7 ? Math.sin((since / 0.7) * Math.PI) * 26 : 0;
    const a = POSE_A[to.value];
    const b = POSE_B[to.value];
    const fa = POSE_A[from.value];
    const fb = POSE_B[from.value];
    const xs: number[] = [];
    const ys: number[] = [];
    for (let j = 0; j < FIGURE_STARS; j += 1) {
      let x = a[j * 2] + (b[j * 2] - a[j * 2]) * w;
      let y = a[j * 2 + 1] + (b[j * 2 + 1] - a[j * 2 + 1]) * w;
      if (k < 1) {
        const sx = 20 + noise(j + from.value * 31 + to.value * 7) * 280;
        const sy = 10 + noise(j + 50 + from.value * 31 + to.value * 7) * 280;
        if (k < 0.5) {
          const e = (k / 0.5) * (k / 0.5);
          const px = fa[j * 2] + (fb[j * 2] - fa[j * 2]) * w;
          const py = fa[j * 2 + 1] + (fb[j * 2 + 1] - fa[j * 2 + 1]) * w;
          x = px + (sx - px) * e;
          y = py + (sy - py) * e;
        } else {
          const e = 1 - (1 - (k - 0.5) / 0.5) * (1 - (k - 0.5) / 0.5);
          x = sx + (x - sx) * e;
          y = sy + (y - sy) * e;
        }
      }
      xs.push(Math.round((ox + x * fit) * 10) / 10);
      ys.push(
        Math.round((oy + (y - hop * (0.6 + 0.4 * Math.sin(j))) * fit) * 10) /
          10,
      );
    }
    let lines = '';
    const edges = EDGES[k < 0.5 ? from.value : to.value];
    for (let e = 0; e < edges.length; e += 2) {
      lines += `M${xs[edges[e]]} ${ys[edges[e]]}L${xs[edges[e + 1]]} ${
        ys[edges[e + 1]]
      }`;
    }
    let stars = '';
    for (let j = 0; j < FIGURE_STARS; j += 1) {
      const tw = 0.75 + 0.25 * Math.sin(clock.wall.value * 3 + j * 1.7);
      stars += sparkle(xs[j], ys[j], (j % 4 === 0 ? 8.5 : 6) * tw * fit);
    }
    const fade = k < 1 ? Math.abs(k - 0.5) * 2 : 1;
    return {
      lines: lines || 'M0 0',
      stars: stars || 'M0 0',
      opacity: (0.45 + 0.45 * play) * fade,
    };
  });
  const glow = useAnimatedProps(() => ({
    d: frame.value.lines,
    opacity: frame.value.opacity * 0.35,
  }));
  const lines = useAnimatedProps(() => ({
    d: frame.value.lines,
    opacity: frame.value.opacity,
  }));
  const stars = useAnimatedProps(() => ({ d: frame.value.stars }));
  return (
    <Svg height={height} pointerEvents="none" width={width}>
      <AnimatedPath
        animatedProps={glow}
        fill="none"
        stroke={s.accent}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={7}
      />
      <AnimatedPath
        animatedProps={lines}
        fill="none"
        stroke={s.line2}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.6}
      />
      <AnimatedPath animatedProps={stars} fill={s.star} />
    </Svg>
  );
}

/** Painted nebulae and far stars that twinkle, behind everything. */
function Sky({
  clock,
  width,
  height,
}: {
  clock: SceneClock;
  width: number;
  height: number;
}) {
  const { colors } = useColors();
  const s = colors.skin;
  const groups = useMemo(
    () =>
      [0, 1, 2].map(g =>
        Array.from({ length: FAR / 3 }, (_, k) => {
          const n = g * 100 + k;
          return {
            key: n,
            x: noise(n + 1) * width,
            y: noise(n + 300) * height,
            r: 0.5 + noise(n + 600) * 1.1,
          };
        }),
      ),
    [height, width],
  );
  const blink = (g: number) => {
    'worklet';
    return {
      opacity:
        0.35 +
        0.65 * ((Math.sin(clock.wall.value * (1.1 + g * 0.4) + g * 2) + 1) / 2),
    };
  };
  const twinkle = [
    useAnimatedStyle(() => blink(0)),
    useAnimatedStyle(() => blink(1)),
    useAnimatedStyle(() => blink(2)),
  ];
  const drift = (dir: number) => {
    'worklet';
    const t = Math.sin(clock.wall.value * 0.12 * dir);
    return {
      transform: [
        { translateX: t * 16 },
        { translateY: t * -10 },
        { scale: 1 + 0.06 * Math.abs(t) },
      ],
    };
  };
  const nebA = useAnimatedStyle(() => drift(1));
  const nebB = useAnimatedStyle(() => drift(-1));
  const shoot = useAnimatedStyle(() => {
    const p = (clock.wall.value % 11) / 11;
    if (p < 0.82 || p > 0.92) return { opacity: 0 };
    const k = (p - 0.82) / 0.1;
    return {
      opacity: k < 0.2 ? k * 5 : 1 - k,
      transform: [
        { translateX: -k * width * 0.8 },
        { translateY: k * width * 0.36 },
        { rotate: '-24deg' },
      ],
    };
  });
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg height={height} style={StyleSheet.absoluteFill} width={width}>
        <Defs>
          <LinearGradient id="cs-sky" x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0" stopColor={s.sky2} />
            <Stop offset="0.55" stopColor={s.bg} />
            <Stop offset="1" stopColor={s.bg} />
          </LinearGradient>
        </Defs>
        <Rect fill="url(#cs-sky)" height={height} width={width} />
      </Svg>
      {[
        {
          style: nebA,
          color: s.neb1,
          left: -80,
          top: 90,
          w: 330,
          h: 260,
          o: 0.55,
        },
        {
          style: nebB,
          color: s.neb2,
          left: width - 210,
          top: 250,
          w: 300,
          h: 280,
          o: 0.45,
        },
      ].map((neb, i) => (
        <Animated.View
          key={i}
          renderToHardwareTextureAndroid
          style={[
            styles.nebula,
            { left: neb.left, top: neb.top, width: neb.w, height: neb.h },
            neb.style,
          ]}
        >
          <Svg height={neb.h} width={neb.w}>
            <Defs>
              <RadialGradient cx="50%" cy="50%" id={`cs-neb-${i}`} r="50%">
                <Stop offset="0" stopColor={neb.color} stopOpacity={neb.o} />
                <Stop offset="1" stopColor={neb.color} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect fill={`url(#cs-neb-${i})`} height={neb.h} width={neb.w} />
          </Svg>
        </Animated.View>
      ))}
      {groups.map((group, g) => (
        <Animated.View
          key={g}
          renderToHardwareTextureAndroid
          style={[StyleSheet.absoluteFill, twinkle[g]]}
        >
          <Svg height={height} width={width}>
            {group.map(star => (
              <Circle
                key={star.key}
                cx={star.x}
                cy={star.y}
                fill={s.star}
                r={star.r}
              />
            ))}
          </Svg>
        </Animated.View>
      ))}
      <Animated.View
        style={[
          styles.shooting,
          { left: width - 30, backgroundColor: s.star },
          shoot,
        ]}
      />
    </View>
  );
}

/** The cover as a card; it turns over when the song changes. */
function CoverCard({
  clock,
  kit,
  size,
}: {
  clock: SceneClock;
  kit: PlayerKit;
  size: number;
}) {
  const { colors } = useColors();
  const s = colors.skin;
  const flip = useAnimatedStyle(() => {
    const k = morphPhase(clock.change.value);
    if (k >= 1)
      return { transform: [{ perspective: 700 }, { rotateY: '0deg' }] };
    const turn = k < 0.45 ? k / 0.45 : k > 0.55 ? (1 - k) / 0.45 : 1;
    return {
      transform: [
        { perspective: 700 },
        { rotateY: `${turn * 90}deg` },
        { scale: 1 - turn * 0.1 },
      ],
    };
  });
  const uri = kit.track?.artwork;
  return (
    <Animated.View
      accessibilityLabel={`Portada de ${kit.track?.title ?? ''}`}
      accessibilityRole="image"
      accessible
      style={[
        styles.card,
        {
          width: size,
          height: size,
          borderColor: s.line,
          backgroundColor: s.panel,
        },
        flip,
      ]}
    >
      {uri ? (
        <Image
          fadeDuration={0}
          resizeMethod="resize"
          source={{ uri }}
          style={{ width: size, height: size }}
        />
      ) : (
        <Svg height={size} viewBox="0 0 100 100" width={size}>
          <Defs>
            <LinearGradient id="cs-cover" x1="0" x2="0" y1="0" y2="1">
              <Stop offset="0" stopColor={s.neb2} />
              <Stop offset="1" stopColor={s.neb1} />
            </LinearGradient>
          </Defs>
          <Rect fill="url(#cs-cover)" height={100} width={100} />
          <Circle cx={64} cy={38} fill={s.star} opacity={0.9} r={15} />
          <Path
            d="M0 72 Q 26 56 50 68 T 100 62 L 100 100 L 0 100 Z"
            fill={s.bg}
            opacity={0.6}
          />
        </Svg>
      )}
    </Animated.View>
  );
}

/** One line of title that rolls like a marquee only when it does not fit. */
function Marquee({
  clock,
  text,
  style,
}: {
  clock: SceneClock;
  text: string;
  style: object;
}) {
  const [box, setBox] = useState(0);
  const [natural, setNatural] = useState(0);
  const span = useSharedValue(0);
  span.value = natural + 60;
  const fits = natural === 0 || box === 0 || natural <= box;
  const roll = useAnimatedStyle(() => {
    if (span.value <= 60) return { transform: [{ translateX: 0 }] };
    return {
      transform: [{ translateX: -((clock.wall.value * 28) % span.value) }],
    };
  });
  return (
    <View
      onLayout={(event: LayoutChangeEvent) =>
        setBox(event.nativeEvent.layout.width)
      }
      style={styles.marquee}
    >
      <View pointerEvents="none" style={styles.measure}>
        <Text
          importantForAccessibility="no-hide-descendants"
          onLayout={(event: LayoutChangeEvent) =>
            setNatural(Math.ceil(event.nativeEvent.layout.width))
          }
          style={style}
        >
          {text}
        </Text>
      </View>
      {fits ? (
        <Text numberOfLines={1} style={[style, styles.centered]}>
          {text}
        </Text>
      ) : (
        <Animated.View style={[styles.roll, roll]}>
          <Text style={[style, styles.rollGap]}>{text}</Text>
          <Text
            importantForAccessibility="no-hide-descendants"
            style={[style, styles.rollGap]}
          >
            {text}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

/** The seek bar: a wavy string of stars that light up as the song goes. */
function StarString({ kit, width }: { kit: PlayerKit; width: number }) {
  const { colors } = useColors();
  const s = colors.skin;
  const pad = 10;
  const point = (u: number) => [
    pad + u * (width - pad * 2),
    SEEK / 2 + Math.sin(u * Math.PI * 3) * 9,
  ];
  let all = '';
  let done = '';
  for (let k = 0; k <= 60; k += 1) {
    const u = k / 60;
    const [x, y] = point(u);
    all += `${k ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)} `;
    if (u <= kit.progress)
      done += `${k ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)} `;
  }
  const [kx, ky] = point(kit.progress);
  done += `${done ? 'L' : 'M'}${kx.toFixed(1)} ${ky.toFixed(1)}`;
  let lit = '';
  let dim = '';
  for (let k = 0; k <= BEADS; k += 1) {
    const u = k / BEADS;
    const [x, y] = point(u);
    if (u <= kit.progress) lit += `${sparkle(x, y, 5)} `;
    else dim += `${sparkle(x, y, 3.2)} `;
  }
  return (
    <SeekArea kit={kit} style={[styles.seek, { width }]}>
      <Svg height={SEEK} pointerEvents="none" width={width}>
        <Path d={all} fill="none" stroke={s.line} strokeWidth={1.2} />
        <Path
          d={done}
          fill="none"
          stroke={s.accent}
          strokeLinecap="round"
          strokeWidth={1.8}
        />
        {dim ? <Path d={dim} fill={s.line2} /> : null}
        {lit ? <Path d={lit} fill={s.accent} /> : null}
        <Circle cx={kx} cy={ky} fill={s.accent} opacity={0.3} r={11} />
        <Circle cx={kx} cy={ky} fill={s.star} r={4.5} />
      </Svg>
    </SeekArea>
  );
}

/** The play button: a big four-pointed star that glows while it plays. */
function StarButton({ clock, kit }: { clock: SceneClock; kit: PlayerKit }) {
  const { colors } = useColors();
  const s = colors.skin;
  const halo = useAnimatedStyle(() => {
    const b = (Math.sin(clock.wall.value * 2) + 1) / 2;
    return {
      opacity: 0.18 + 0.32 * b * clock.play.value,
      transform: [{ scale: 0.9 + 0.12 * b * clock.play.value }],
    };
  });
  return (
    <View style={styles.starBox}>
      <Animated.View
        pointerEvents="none"
        style={[styles.starHalo, { backgroundColor: s.accent }, halo]}
      />
      <Pressable
        accessibilityLabel={kit.isPlaying ? 'Pausar' : 'Reproducir'}
        accessibilityRole="button"
        disabled={!kit.ready}
        onPress={kit.toggle}
        style={({ pressed }) => [
          styles.starPress,
          { transform: [{ scale: pressed ? 0.94 : 1 }] },
        ]}
      >
        <Svg
          height={104}
          style={StyleSheet.absoluteFill}
          viewBox="0 0 100 100"
          width={104}
        >
          <Path
            d="M50 2 C 55 38, 62 45, 98 50 C 62 55, 55 62, 50 98 C 45 62, 38 55, 2 50 C 38 45, 45 38, 50 2 Z"
            fill={s.accent}
          />
        </Svg>
        <Svg height={22} viewBox="0 0 22 22" width={22}>
          {kit.isPlaying ? (
            <>
              <Rect
                fill={s.onAccent}
                height={16}
                rx={1.5}
                width={4}
                x={5}
                y={3}
              />
              <Rect
                fill={s.onAccent}
                height={16}
                rx={1.5}
                width={4}
                x={13}
                y={3}
              />
            </>
          ) : (
            <Path d="M7 3 L 19 11 L 7 19 Z" fill={s.onAccent} />
          )}
        </Svg>
      </Pressable>
    </View>
  );
}

/** Shuffle or repeat, at the sides of the transport, with a dot when on. */
function SideToggle({
  label,
  on,
  onPress,
  children,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  const { colors } = useColors();
  const s = colors.skin;
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={({ pressed }) => [styles.side, { opacity: pressed ? 0.6 : 1 }]}
    >
      {children}
      <View
        style={[
          styles.sideDot,
          { backgroundColor: on ? s.accent : 'transparent' },
        ]}
      />
    </Pressable>
  );
}

function Skip({
  label,
  forward,
  disabled,
  onPress,
}: {
  label: string;
  forward: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const { colors } = useColors();
  const s = colors.skin;
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.skip,
        { opacity: disabled ? 0.45 : pressed ? 0.6 : 1 },
      ]}
    >
      <Svg height={24} viewBox="0 0 32 24" width={32}>
        <Path
          d={
            forward
              ? 'M4 3 L 15 12 L 4 21 M 17 3 L 28 12 L 17 21'
              : 'M15 3 L 4 12 L 15 21 M 28 3 L 17 12 L 28 21'
          }
          fill="none"
          stroke={s.ink}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2.4}
        />
      </Svg>
    </Pressable>
  );
}

/** Timer, speed, equalizer and the song menu. */
function Beyond({ kit, onClose }: { kit: PlayerKit; onClose: () => void }) {
  const { colors } = useColors();
  const s = colors.skin;
  const insets = useSafeAreaInsets();
  const rows = [
    {
      key: 'sleep',
      label: 'Temporizador',
      value: kit.sleepOn ? kit.sleepCaption : 'Apagado',
      onPress: kit.openSleep,
    },
    {
      key: 'speed',
      label: 'Velocidad',
      value: `${kit.rate}×`,
      onPress: kit.openSpeed,
    },
    {
      key: 'eq',
      label: 'Ecualizador',
      value: kit.equalizerOn ? 'Activado' : 'Apagado',
      onPress: kit.openEqualizer,
    },
    {
      key: 'menu',
      label: 'Más acciones de la canción',
      value: '›',
      onPress: kit.openMenu,
    },
  ];
  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable
        accessibilityLabel="Cerrar opciones"
        accessibilityRole="button"
        onPress={onClose}
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}
      />
      <View
        style={[
          styles.sheet,
          {
            paddingBottom: insets.bottom + 20,
            backgroundColor: s.panel,
            borderColor: s.line,
          },
        ]}
      >
        <Text style={[styles.sheetTitle, { color: s.accent }]}>
          Más allá de las estrellas
        </Text>
        {rows.map(row => (
          <Pressable
            key={row.key}
            accessibilityLabel={`${row.label}: ${row.value}`}
            accessibilityRole="button"
            onPress={() => {
              onClose();
              row.onPress();
            }}
            style={[styles.sheetRow, { borderTopColor: s.line }]}
          >
            <Text style={[styles.sheetLabel, { color: s.ink }]}>
              {row.label}
            </Text>
            <Text style={[styles.sheetValue, { color: s.sub }]}>
              {row.value}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function ConstelacionPlayer({
  covered,
  headerGesture,
  onClose,
}: SkinProps) {
  const kit = usePlayerKit({ covered });
  const clock = useSceneClock(kit, {
    boost: 2,
    changeSeconds: 1.6,
    baseWidth: 360,
  });
  const { width, height } = useWindowDimensions();
  const { colors } = useColors();
  const insets = useSafeAreaInsets();
  const [more, setMore] = useState(false);

  // The animal of the song, and the one it turns from after a change.
  const figure = figureIndexFor(kit.track?.id);
  const from = useSharedValue(figure);
  const to = useSharedValue(figure);
  const last = useRef(figure);
  useEffect(() => {
    if (last.current !== figure) {
      from.value = last.current;
      to.value = figure;
      last.current = figure;
    } else {
      from.value = figure;
      to.value = figure;
    }
  }, [figure, from, to]);
  const poke = useSharedValue(-10);

  const nameStyle = useAnimatedStyle(() => {
    const k = morphPhase(clock.change.value);
    return { opacity: k < 0.5 ? 0 : (k - 0.5) * 2 };
  });

  const body = height - insets.top - insets.bottom - HEADER;
  const fixed = 40 + 22 + SEEK + TIMES + TRANSPORT + PILLS + 52;
  const stageH = Math.round(Math.max(300, Math.min(430, body - fixed)));
  const coverSize = Math.round(Math.min(width * 0.6, stageH * 0.56));

  if (!kit.track) return null;
  const s = colors.skin;
  const animal = starFigures[figure];
  const position = Math.max(1, kit.queueIndex + 1);
  const repeatOne = kit.repeatMode === RepeatMode.Track;
  const RepeatIcon = repeatOne ? Repeat1 : Repeat;
  const pills = [
    {
      key: 'queue',
      caption: 'Cola',
      label: `Abrir cola de reproducción con ${kit.queueCount} canciones`,
      Icon: ListMusic,
      onPress: kit.openQueue,
    },
    {
      key: 'lyrics',
      caption: 'Letras',
      label: `Abrir letras de ${kit.track.title}`,
      Icon: FileText,
      onPress: kit.openLyrics,
    },
    {
      key: 'more',
      caption: 'Más',
      label: 'Más opciones: temporizador, velocidad, ecualizador y acciones',
      Icon: MoreHorizontal,
      onPress: () => setMore(true),
    },
  ];

  return (
    <View
      style={[
        styles.player,
        {
          backgroundColor: s.bg,
          paddingTop: insets.top,
          paddingBottom: insets.bottom + 8,
        },
      ]}
    >
      <Sky clock={clock} height={height} width={width} />

      <DragHeader gesture={headerGesture} style={styles.header}>
        <Pressable
          accessibilityLabel="Cerrar reproductor"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.headerButton}
        >
          <Svg fill="none" height={24} viewBox="0 0 24 24" width={24}>
            <Path
              d="M5 9l7 7 7-7"
              stroke={s.ink}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.2}
            />
          </Svg>
        </Pressable>
        <View style={styles.headerInfo}>
          <Text numberOfLines={1} style={[styles.heading, { color: s.ink }]}>
            Bestiario celeste
          </Text>
          <Text numberOfLines={1} style={[styles.source, { color: s.sub }]}>
            {kit.sourceLabel} · {position} de {kit.queueCount}
          </Text>
        </View>
        <Pressable
          accessibilityLabel={
            kit.favorite ? 'Quitar de favoritas' : 'Añadir a favoritas'
          }
          accessibilityRole="button"
          onPress={kit.toggleFavorite}
          style={styles.headerButton}
        >
          <Svg height={24} viewBox="0 0 24 24" width={24}>
            <Path
              d="M12 20s-7-4.4-9-9.2C1.7 7.4 4 4 7.3 4c2 0 3.6 1.1 4.7 2.8C13.1 5.1 14.7 4 16.7 4 20 4 22.3 7.4 21 10.8 19 15.6 12 20 12 20z"
              fill={kit.favorite ? s.accent : 'none'}
              stroke={kit.favorite ? s.accent : s.ink}
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </Svg>
        </Pressable>
      </DragHeader>

      <View
        onLayout={clock.onLayout}
        style={[styles.stage, { width, height: stageH }]}
      >
        <Animated.Text
          style={[styles.figureName, { color: s.accent }, nameStyle]}
        >
          {animal.title}
        </Animated.Text>
        <View style={[styles.cardSpot, { top: (stageH - coverSize) / 2 }]}>
          <CoverCard clock={clock} kit={kit} size={coverSize} />
        </View>
        <View pointerEvents="none" style={styles.creature}>
          <Creature
            clock={clock}
            from={from}
            height={stageH - 44}
            poke={poke}
            to={to}
            width={width}
          />
        </View>
        <Pressable
          accessibilityLabel={`Despertar a ${animal.name}`}
          accessibilityRole="button"
          onPress={() => {
            poke.value = clock.wall.value;
          }}
          style={styles.pokeArea}
        />
        <Text style={[styles.hint, { color: s.sub }]}>
          {kit.isPlaying
            ? 'Toca la constelación para despertarla'
            : 'Duerme mientras la música descansa'}
        </Text>
      </View>

      <View style={styles.grow} />

      <View style={styles.titleBox}>
        <Marquee
          clock={clock}
          style={[styles.title, { color: s.ink }]}
          text={kit.track.title}
        />
        <Text numberOfLines={1} style={[styles.artist, { color: s.sub }]}>
          {kit.track.artist}
        </Text>
      </View>

      <StarString kit={kit} width={width - 28} />
      <View style={[styles.times, { width: width - 36 }]}>
        <Text style={[styles.time, { color: s.sub }]}>
          {formatTime(kit.position)}
        </Text>
        <Text style={[styles.time, { color: s.sub }]}>
          {formatTime(kit.duration)}
        </Text>
      </View>

      <View style={styles.grow} />

      <View style={[styles.transport, { width: width - 16 }]}>
        <SideToggle
          label={kit.shuffle ? 'Desactivar mezcla' : 'Activar mezcla'}
          on={kit.shuffle}
          onPress={kit.toggleShuffle}
        >
          <Shuffle color={kit.shuffle ? s.accent : s.ink} size={22} />
        </SideToggle>
        <Skip
          disabled={!kit.ready || kit.busy}
          forward={false}
          label="Canción anterior"
          onPress={kit.previous}
        />
        <StarButton clock={clock} kit={kit} />
        <Skip
          disabled={!kit.ready || kit.busy}
          forward
          label="Siguiente canción"
          onPress={kit.next}
        />
        <SideToggle
          label={kit.repeatLabel}
          on={kit.repeatOn}
          onPress={kit.cycleRepeat}
        >
          <RepeatIcon color={kit.repeatOn ? s.accent : s.ink} size={22} />
        </SideToggle>
      </View>

      <View style={[styles.pills, { width: width - 32 }]}>
        {pills.map(pill => (
          <Pressable
            key={pill.key}
            accessibilityLabel={pill.label}
            accessibilityRole="button"
            onPress={pill.onPress}
            style={({ pressed }) => [
              styles.pill,
              {
                backgroundColor: s.panel,
                borderColor: s.line,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <pill.Icon color={s.accent} size={18} />
            <Text numberOfLines={1} style={[styles.pillText, { color: s.ink }]}>
              {pill.caption}
            </Text>
          </Pressable>
        ))}
      </View>

      {more ? <Beyond kit={kit} onClose={() => setMore(false)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  player: { flex: 1, alignItems: 'center', overflow: 'hidden' },
  nebula: { position: 'absolute' },
  shooting: {
    position: 'absolute',
    top: 70,
    width: 90,
    height: 2,
    borderRadius: 1,
    opacity: 0,
  },
  header: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    height: HEADER,
    paddingHorizontal: 6,
  },
  headerButton: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: { flex: 1, minWidth: 0, alignItems: 'center' },
  heading: { fontFamily: SERIF_ITALIC, fontSize: 20, lineHeight: 26 },
  source: { fontFamily: BODY, fontSize: 13, lineHeight: 16 },
  stage: { alignItems: 'center' },
  figureName: {
    fontFamily: SERIF,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 5,
    marginTop: 4,
  },
  cardSpot: { position: 'absolute', alignItems: 'center', left: 0, right: 0 },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    boxShadow: '0 18px 40px rgba(0,0,0,0.45)',
  },
  creature: { position: 'absolute', left: 0, top: 24 },
  pokeArea: { position: 'absolute', left: 0, right: 0, top: 24, bottom: 20 },
  hint: {
    position: 'absolute',
    bottom: 2,
    fontFamily: BODY,
    fontSize: 12,
    lineHeight: 16,
  },
  grow: { flex: 1 },
  titleBox: { width: '100%', paddingHorizontal: 24, alignItems: 'center' },
  marquee: {
    overflow: 'hidden',
    height: 40,
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  measure: {
    position: 'absolute',
    width: 4000,
    opacity: 0,
    flexDirection: 'row',
  },
  roll: { flexDirection: 'row', width: 8000 },
  rollGap: { paddingRight: 60 },
  centered: { textAlign: 'center' },
  title: { fontFamily: SERIF, fontSize: 32, lineHeight: 40 },
  artist: { fontFamily: BODY, fontSize: 16, lineHeight: 22 },
  seek: { height: SEEK, marginTop: 6, justifyContent: 'center' },
  times: {
    height: TIMES,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  time: { fontFamily: BODY, fontSize: 13, lineHeight: 16 },
  transport: {
    height: TRANSPORT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  side: {
    width: 52,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  sideDot: { width: 5, height: 5, borderRadius: 3 },
  skip: {
    width: 60,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starBox: {
    width: 104,
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starHalo: { position: 'absolute', width: 84, height: 84, borderRadius: 42 },
  starPress: {
    width: 104,
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pills: { height: PILLS, flexDirection: 'row', gap: 10, marginTop: 10 },
  pill: {
    flex: 1,
    minWidth: 0,
    height: PILLS,
    borderRadius: PILLS / 2,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pillText: { fontFamily: BODY_MEDIUM, fontSize: 15, lineHeight: 19 },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sheetTitle: {
    fontFamily: SERIF_ITALIC,
    fontSize: 24,
    lineHeight: 30,
    textAlign: 'center',
    paddingBottom: 6,
  },
  sheetRow: {
    minHeight: 54,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sheetLabel: { fontFamily: BODY, fontSize: 17, lineHeight: 22, flexShrink: 1 },
  sheetValue: { fontFamily: BODY, fontSize: 14, lineHeight: 18 },
});
