import { useMemo, useState } from 'react';
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
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RepeatMode } from 'react-native-track-player';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Mask,
  Path,
  Pattern,
  Polygon,
  Rect,
  Stop,
  Text as SvgText,
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
  AnimatedCircle,
  AnimatedEllipse,
  AnimatedG,
  AnimatedPath,
  AnimatedRect,
  clamp01,
  useSceneClock,
  type SceneClock,
} from '../../player/kit/sceneClock';
import { chapterKanji } from './chapterKanji';

/** The page was drawn 336 wide (360 minus the margins); everything scales. */
const BASE = 336;
const HEADER = 52;
const SEEK = 38;
const TIMES = 22;
const TRANSPORT = 90;
const TOOLS = 46;
const FOLIO = 22;
const GAP = 8;
const KATAKANA = { fontWeight: '900' as const };

const WORDS = [
  { jp: 'ドン', es: '¡TUM!', size: 64 },
  { jp: 'ドドド', es: '¡TUM TUM TUM!', size: 50 },
  { jp: 'バン', es: '¡BAM!', size: 64 },
  { jp: 'ズン', es: '¡BUM!', size: 64 },
];

function seeded(k: number, seed: number) {
  const x = Math.sin(k * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** Tapered ink strokes that point at (cx, cy), like manga focus lines. */
function rays(
  cx: number,
  cy: number,
  count: number,
  inner: number,
  spread: number,
  outer: number,
  thin: number,
  extra: number,
  seed: number,
) {
  let d = '';
  for (let n = 0; n < count; n += 1) {
    const a = (n / count) * Math.PI * 2 + (seeded(n, seed) - 0.5) * 0.05;
    const r0 = inner + seeded(n + 50, seed) * spread;
    const w = (thin + seeded(n + 99, seed) * extra) / outer;
    const point = (angle: number, r: number) =>
      `${(cx + Math.cos(angle) * r).toFixed(1)} ${(
        cy +
        Math.sin(angle) * r
      ).toFixed(1)}`;
    d += `M${point(a, r0)} L ${point(a - w, outer)} L ${point(
      a + w,
      outer,
    )} Z `;
  }
  return d;
}

/** Panels slide in from the left, one after another: manga reads right to left. */
function usePageIn(clock: SceneClock, order: number) {
  return useAnimatedStyle(() => {
    const c = clock.change.value;
    if (c === 0) return { opacity: 1, transform: [{ translateX: 0 }] };
    const k = clamp01((1 - c) * 2.2 - order * 0.22);
    const e = 1 - Math.pow(1 - k, 3);
    return {
      opacity: 0.2 + 0.8 * e,
      transform: [
        { translateX: -(1 - e) * 80 },
        { rotate: `${-(1 - e) * 2}deg` },
      ],
    };
  });
}

/** Two sets of focus lines that take turns with the beat. */
function FocusLines({
  clock,
  d,
  set,
  color,
}: {
  clock: SceneClock;
  d: string;
  set: 0 | 1;
  color: string;
}) {
  const props = useAnimatedProps(() => {
    const on = Math.floor(clock.run.value * 2) % 2 === set;
    return { opacity: on ? 1 : 0.15 };
  });
  return <AnimatedPath animatedProps={props} d={d} fill={color} />;
}

function Sfx({
  clock,
  index,
  children,
}: {
  clock: SceneClock;
  index: number;
  children: React.ReactNode;
}) {
  const props = useAnimatedProps(() => {
    const current = Math.floor(clock.run.value * 1.25) % WORDS.length;
    return { opacity: current === index ? clock.play.value : 0 };
  });
  return <AnimatedG animatedProps={props}>{children}</AnimatedG>;
}

function Silence({
  clock,
  children,
}: {
  clock: SceneClock;
  children: React.ReactNode;
}) {
  const props = useAnimatedProps(() => ({ opacity: 1 - clock.play.value }));
  return <AnimatedG animatedProps={props}>{children}</AnimatedG>;
}

/** White letters with a thick ink outline, for katakana and their gloss. */
function InkText({
  x,
  y,
  size,
  fill,
  stroke,
  width,
  family,
  children,
}: {
  x: number;
  y: number;
  size: number;
  fill: string;
  stroke: string;
  width: number;
  family?: string;
  children: string;
}) {
  const font = family ? { fontFamily: family } : KATAKANA;
  return (
    <>
      <SvgText
        {...font}
        fill={stroke}
        fontSize={size}
        stroke={stroke}
        strokeLinejoin="round"
        strokeWidth={width}
        x={x}
        y={y}
      >
        {children}
      </SvgText>
      <SvgText {...font} fill={fill} fontSize={size} x={x} y={y}>
        {children}
      </SvgText>
    </>
  );
}

function SoundEffects({
  clock,
  ink,
  paper,
}: {
  clock: SceneClock;
  ink: string;
  paper: string;
}) {
  const pulse = useAnimatedStyle(() => {
    const beat = Math.abs(Math.sin(clock.run.value * Math.PI * 1.25));
    return { transform: [{ scale: 0.97 + beat * 0.06 * clock.play.value }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[styles.sfx, pulse]}>
      <Svg height={120} viewBox="0 0 200 120" width={200}>
        {WORDS.map((word, index) => (
          <Sfx key={word.jp} clock={clock} index={index}>
            <G transform="rotate(-9, 90, 60)">
              <InkText
                fill={paper}
                size={word.size}
                stroke={ink}
                width={9}
                x={8}
                y={74}
              >
                {word.jp}
              </InkText>
              <InkText
                family="Bangers-Regular"
                fill={ink}
                size={19}
                stroke={paper}
                width={5}
                x={20}
                y={104}
              >
                {word.es}
              </InkText>
            </G>
          </Sfx>
        ))}
        <Silence clock={clock}>
          <G transform="rotate(-6, 90, 60)">
            <InkText fill={paper} size={46} stroke={ink} width={8} x={8} y={72}>
              シーン
            </InkText>
            <InkText
              family="Bangers-Regular"
              fill={ink}
              size={17}
              stroke={paper}
              width={5}
              x={20}
              y={100}
            >
              (SILENCIO)
            </InkText>
          </G>
        </Silence>
      </Svg>
    </Animated.View>
  );
}

/** The song's cover, framed like a pasted-in panel; its border is redrawn on every new song. */
function MangaCover({
  clock,
  uri,
  size,
}: {
  clock: SceneClock;
  uri: string | null | undefined;
  size: number;
}) {
  const { colors } = useColors();
  const s = colors.skin;
  const perimeter = (size - 3) * 4;
  const draw = useAnimatedProps(() => ({
    strokeDashoffset: clock.change.value * perimeter,
  }));
  return (
    <View
      style={[
        styles.cover,
        {
          width: size,
          height: size,
          backgroundColor: s.pop,
          boxShadow: `0 0 0 6px ${s.panel}`,
        },
      ]}
    >
      {uri ? (
        <Image
          fadeDuration={0}
          resizeMethod="resize"
          source={{ uri }}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <Svg height={size} viewBox="0 0 212 212" width={size}>
          <Rect fill={s.pop} height={212} width={212} />
          <Circle cx={138} cy={78} fill={s.accent} r={38} />
          <Path
            d="M0 182 L 0 136 L 44 98 L 78 126 L 118 86 L 166 136 L 212 106 L 212 182 Z"
            fill={s.ink}
          />
          <Path
            d="M0 212 L 0 178 L 212 160 L 212 212 Z"
            fill={s.ink}
            opacity={0.85}
          />
        </Svg>
      )}
      <Svg height={size} style={StyleSheet.absoluteFill} width={size}>
        <AnimatedRect
          animatedProps={draw}
          fill="none"
          height={size - 3}
          stroke={s.ink}
          strokeDasharray={`${perimeter}`}
          strokeWidth={3}
          width={size - 3}
          x={1.5}
          y={1.5}
        />
      </Svg>
    </View>
  );
}

function useDrift(clock: SceneClock, base: number, sign: 1 | -1) {
  return useAnimatedProps(() => ({
    cx: base + Math.sin(clock.wall.value * 0.98) * 2 * sign,
  }));
}

/** The iris, pupil and shine of one eye; they drift a little side to side. */
function Iris({
  clock,
  sign,
  ink,
  shine,
  accent,
}: {
  clock: SceneClock;
  sign: 1 | -1;
  ink: string;
  shine: string;
  accent: string;
}) {
  const iris = useDrift(clock, 86, sign);
  const glow = useDrift(clock, 86, sign);
  const pupil = useDrift(clock, 86, sign);
  const big = useDrift(clock, 78, sign);
  const small = useDrift(clock, 93, sign);
  return (
    <>
      <AnimatedEllipse
        animatedProps={iris}
        cy={112}
        fill={ink}
        rx={19}
        ry={22}
      />
      <AnimatedEllipse
        animatedProps={glow}
        cy={121}
        fill={accent}
        opacity={0.6}
        rx={13}
        ry={9}
      />
      <AnimatedEllipse
        animatedProps={pupil}
        cy={110}
        fill={ink}
        rx={7}
        ry={9}
      />
      <AnimatedCircle animatedProps={big} cy={102} fill={shine} r={5.5} />
      <AnimatedCircle animatedProps={small} cy={119} fill={shine} r={2.6} />
    </>
  );
}

const EYE = 'M38 108 Q 80 86 130 98 Q 124 124 84 130 Q 54 128 38 108 Z';

function OpenEye({ clock, sign }: { clock: SceneClock; sign: 1 | -1 }) {
  const { colors } = useColors();
  const s = colors.skin;
  return (
    <>
      <Path d={EYE} fill={s.panel} />
      <G clipPath="url(#mg-eye)">
        <Iris
          accent={s.accent}
          clock={clock}
          ink={s.ink}
          shine={s.panel}
          sign={sign}
        />
      </G>
      <Path d="M34 104 Q 78 78 130 92 L 132 99 Q 80 86 38 110 Z" fill={s.ink} />
      <Path
        d="M38 106 L 25 97 M 36 111 L 23 110"
        fill="none"
        stroke={s.ink}
        strokeLinecap="round"
        strokeWidth={3}
      />
      <Path
        d="M50 128 Q 86 136 122 116"
        fill="none"
        stroke={s.ink}
        strokeLinecap="round"
        strokeWidth={2.2}
      />
    </>
  );
}

/** A close-up of a pair of eyes: they blink, look around and close in pause. */
function EyesPanel({
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
  const page = usePageIn(clock, 1);
  const open = useAnimatedStyle(() => {
    const t = clock.wall.value % 4.6;
    const k = t > 4.4 ? Math.sin(((t - 4.4) / 0.2) * Math.PI) : 0;
    return {
      opacity: clock.play.value,
      transform: [{ scaleY: 1 - 0.92 * k }],
    };
  });
  const closed = useAnimatedStyle(() => ({ opacity: 1 - clock.play.value }));
  const bang = useAnimatedStyle(() => {
    const c = clock.change.value;
    return {
      opacity: c > 0.15 ? 1 : c / 0.15,
      transform: [{ rotate: '12deg' }, { scale: 1 + c * 0.2 }],
    };
  });
  const box = { width, height };
  return (
    <Animated.View pointerEvents="none" style={[box, page]}>
      <Svg height={height} viewBox="0 0 336 160" width={width}>
        <Defs>
          <Pattern
            height={7}
            id="mg-dots"
            patternUnits="userSpaceOnUse"
            width={7}
          >
            <Circle cx={3.5} cy={3.5} fill={s.tone} r={1.9} />
          </Pattern>
          <LinearGradient id="mg-fade-grad" x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0" stopColor="#ffffff" stopOpacity={0.05} />
            <Stop offset="1" stopColor="#ffffff" stopOpacity={0.75} />
          </LinearGradient>
          <Mask id="mg-fade">
            <Rect fill="url(#mg-fade-grad)" height={160} width={336} />
          </Mask>
          <ClipPath id="mg-eyes-panel">
            <Polygon points="0,34 336,0 336,160 0,160" />
          </ClipPath>
        </Defs>
        <Polygon fill={s.panel} points="0,34 336,0 336,160 0,160" />
        <G clipPath="url(#mg-eyes-panel)">
          <Rect
            fill="url(#mg-dots)"
            height={160}
            mask="url(#mg-fade)"
            width={336}
          />
        </G>
        <G opacity={1}>
          <Path d="M28 66 L 124 82 L 122 90 L 30 75 Z" fill={s.ink} />
          <Path d="M308 66 L 212 82 L 214 90 L 306 75 Z" fill={s.ink} />
        </G>
        <Polygon
          fill="none"
          points="1.5,35 334.5,1.5 334.5,158.5 1.5,158.5"
          stroke={s.ink}
          strokeWidth={2.5}
        />
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, styles.eyesOrigin, open]}>
        <Svg height={height} viewBox="0 0 336 160" width={width}>
          <Defs>
            <ClipPath id="mg-eye">
              <Path d={EYE} />
            </ClipPath>
          </Defs>
          <OpenEye clock={clock} sign={1} />
          <G transform="translate(336, 0) scale(-1, 1)">
            <OpenEye clock={clock} sign={-1} />
          </G>
        </Svg>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, closed]}>
        <Svg height={height} viewBox="0 0 336 160" width={width}>
          <G fill="none" stroke={s.ink} strokeLinecap="round">
            <Path d="M38 108 Q 82 124 130 102" strokeWidth={5} />
            <Path
              d="M54 115 L 50 125 M 74 120 L 72 130 M 96 120 L 98 130 M 116 113 L 121 122"
              strokeWidth={2.5}
            />
            <Path d="M298 108 Q 254 124 206 102" strokeWidth={5} />
            <Path
              d="M282 115 L 286 125 M 262 120 L 264 130 M 240 120 L 238 130 M 220 113 L 215 122"
              strokeWidth={2.5}
            />
          </G>
        </Svg>
      </Animated.View>
      <Animated.Text style={[styles.bang, { color: s.accent }, bang]}>
        !!
      </Animated.Text>
    </Animated.View>
  );
}

/** One line of title: it scrolls like a marquee only when it does not fit. */
function MarqueeTitle({
  clock,
  text,
  color,
}: {
  clock: SceneClock;
  text: string;
  color: string;
}) {
  const [box, setBox] = useState(0);
  const [natural, setNatural] = useState(0);
  const span = useSharedValue(0);
  const fits = natural === 0 || box === 0 || natural <= box;
  span.value = natural + 48;
  const roll = useAnimatedStyle(() => {
    if (span.value <= 48) return { transform: [{ translateX: 0 }] };
    return {
      transform: [{ translateX: -((clock.wall.value * 32) % span.value) }],
    };
  });
  const textStyle = [styles.title, { color }];
  return (
    <View
      onLayout={(event: LayoutChangeEvent) =>
        setBox(event.nativeEvent.layout.width)
      }
      style={styles.marquee}
    >
      {/* Measured off-screen at its natural width. */}
      <View pointerEvents="none" style={styles.measure}>
        <Text
          importantForAccessibility="no-hide-descendants"
          onLayout={(event: LayoutChangeEvent) =>
            setNatural(Math.ceil(event.nativeEvent.layout.width))
          }
          style={textStyle}
        >
          {text}
        </Text>
      </View>
      {fits ? (
        <Text numberOfLines={1} style={[textStyle, styles.centerText]}>
          {text}
        </Text>
      ) : (
        <Animated.View style={[styles.roll, roll]}>
          <Text style={[textStyle, styles.rollGap]}>{text}</Text>
          <Text
            importantForAccessibility="no-hide-descendants"
            style={[textStyle, styles.rollGap]}
          >
            {text}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

/** The title in a speech bubble that crosses the gutter between two panels. */
function TitleBubble({
  clock,
  kit,
  width,
}: {
  clock: SceneClock;
  kit: PlayerKit;
  width: number;
}) {
  const { colors } = useColors();
  const s = colors.skin;
  const page = usePageIn(clock, 2);
  const h = 58;
  return (
    <Animated.View style={[{ width, height: h }, page]}>
      <Svg height={30} style={styles.tail} viewBox="0 0 34 30" width={34}>
        <Path
          d="M8 30 L 6 0 L 28 30"
          fill={s.panel}
          stroke={s.ink}
          strokeLinejoin="round"
          strokeWidth={2.5}
        />
      </Svg>
      <Svg height={h} style={StyleSheet.absoluteFill} width={width}>
        <Ellipse
          cx={width / 2}
          cy={h / 2}
          fill={s.panel}
          rx={width / 2 - 1.5}
          ry={h / 2 - 1.5}
          stroke={s.ink}
          strokeWidth={2.5}
        />
      </Svg>
      <View style={styles.bubbleText}>
        <MarqueeTitle
          clock={clock}
          color={s.ink}
          text={kit.track?.title ?? ''}
        />
      </View>
    </Animated.View>
  );
}

/** A speech-bubble button. */
function Bubble({
  label,
  caption,
  width,
  height,
  active,
  onPress,
  size = 15,
}: {
  label: string;
  caption: string;
  width: number;
  height: number;
  active?: boolean;
  onPress: () => void;
  size?: number;
}) {
  const { colors } = useColors();
  const s = colors.skin;
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.bubble,
        { width, height, transform: [{ scale: pressed ? 0.94 : 1 }] },
      ]}
    >
      <Svg height={height} style={StyleSheet.absoluteFill} width={width}>
        <Ellipse
          cx={width / 2}
          cy={height / 2}
          fill={active ? s.ink : s.panel}
          rx={width / 2 - 1.25}
          ry={height / 2 - 1.25}
          stroke={s.ink}
          strokeWidth={2.5}
        />
      </Svg>
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        numberOfLines={1}
        style={[
          styles.bubbleCaption,
          {
            color: active ? s.panel : s.ink,
            fontSize: size,
            lineHeight: size * 1.25,
          },
        ]}
      >
        {caption}
      </Text>
    </Pressable>
  );
}

/** Timer, speed, equalizer and the song menu: the omake page. */
function Extras({
  kit,
  width,
  onClose,
}: {
  kit: PlayerKit;
  width: number;
  onClose: () => void;
}) {
  const { colors } = useColors();
  const s = colors.skin;
  const insets = useSafeAreaInsets();
  const cell = Math.floor((width - 28 - 10) / 2);
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
      value: 'Listas, álbum y artista',
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
          styles.extras,
          {
            width,
            bottom: insets.bottom + 16,
            backgroundColor: s.panel,
            borderColor: s.ink,
          },
        ]}
      >
        <View style={styles.extrasHead}>
          <Text style={[styles.omake, KATAKANA, { color: s.ink }]}>オマケ</Text>
          <Text style={[styles.extrasTitle, { color: s.ink }]}>EXTRAS</Text>
          <View style={styles.grow} />
          <Pressable
            accessibilityLabel="Cerrar opciones"
            accessibilityRole="button"
            onPress={onClose}
            style={styles.close}
          >
            <Text style={[styles.extrasTitle, { color: s.ink }]}>✕</Text>
          </Pressable>
        </View>
        <View style={styles.extrasGrid}>
          {rows.map(row => (
            <Pressable
              key={row.key}
              accessibilityLabel={`${row.label}: ${row.value}`}
              accessibilityRole="button"
              onPress={() => {
                onClose();
                row.onPress();
              }}
              style={({ pressed }) => [
                styles.extra,
                { width: cell, transform: [{ scale: pressed ? 0.95 : 1 }] },
              ]}
            >
              <Svg height={64} style={StyleSheet.absoluteFill} width={cell}>
                <Ellipse
                  cx={cell / 2}
                  cy={32}
                  fill={s.panel}
                  rx={cell / 2 - 1.25}
                  ry={30.75}
                  stroke={s.ink}
                  strokeWidth={2.5}
                />
              </Svg>
              <Text
                adjustsFontSizeToFit
                numberOfLines={1}
                style={[styles.extraLabel, { color: s.ink }]}
              >
                {row.key === 'menu' ? 'MÁS ACCIONES' : row.label.toUpperCase()}
              </Text>
              <Text
                numberOfLines={1}
                style={[styles.extraValue, { color: s.sub }]}
              >
                {row.value}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

export function MangaPlayer({ covered, headerGesture, onClose }: SkinProps) {
  const kit = usePlayerKit({ covered });
  const clock = useSceneClock(kit, {
    boost: 0,
    changeSeconds: 1.2,
    baseWidth: BASE,
  });
  const { width, height } = useWindowDimensions();
  const { colors } = useColors();
  const insets = useSafeAreaInsets();
  const [more, setMore] = useState(false);
  const heroPage = usePageIn(clock, 0);
  const turn = usePageIn(clock, 2);

  const W = width - 24;
  const S = W / BASE;
  const diag = Math.round(32 * S);
  const eyesH = Math.round(160 * S);
  const overlap = Math.round(26 * S);
  const body = height - insets.top - insets.bottom - HEADER - 6;
  const fixed =
    eyesH - overlap + SEEK + TIMES + TRANSPORT + TOOLS + FOLIO + GAP * 5;
  const heroH = Math.round(Math.max(240, Math.min(380, body - fixed)));
  const cover = Math.round(Math.min(heroH - diag - 72, W * 0.64));
  const coverTop = Math.max(44, Math.round((heroH - diag - cover) / 2 + 8));
  const focusY = coverTop + cover / 2;

  const lines = useMemo(
    () => ({
      a: rays(W / 2, focusY, 70, cover * 0.6, 60, W * 1.3, 2, 4, 1),
      b: rays(W / 2, focusY, 70, cover * 0.6, 60, W * 1.3, 2, 4, 2),
    }),
    [W, cover, focusY],
  );
  const flash = useMemo(
    () => rays(168 * S, 45, 40, 26, 14, 200, 1.5, 3, 3),
    [S],
  );

  if (!kit.track) return null;
  const s = colors.skin;
  const track = kit.track;
  const chapter = Math.max(1, kit.queueIndex + 1);
  const heroPoints = `0,0 ${W},0 ${W},${heroH - diag} 0,${heroH}`;
  const x = (value: number) => (value * S).toFixed(1);
  const playPoints = `${x(88)},1.5 ${x(248)},1.5 ${x(256)},88.5 ${x(80)},88.5`;
  const ends = 2 + kit.progress * (W - 4);
  const brush =
    ends > 6
      ? `M2 18 Q ${ends / 2} 12 ${ends} 13 L ${ends} 23 Q ${ends / 2} 26 2 20 Z`
      : '';
  const toolW = Math.floor((W - 4 * 6) / 5);
  const repeatOne = kit.repeatMode === RepeatMode.Track;
  const tools = [
    {
      key: 'queue',
      caption: 'COLA',
      label: `Abrir cola de reproducción con ${kit.queueCount} canciones`,
      active: false,
      onPress: kit.openQueue,
    },
    {
      key: 'lyrics',
      caption: 'LETRAS',
      label: `Abrir letras de ${track.title}`,
      active: false,
      onPress: kit.openLyrics,
    },
    {
      key: 'shuffle',
      caption: 'MEZCLA',
      label: kit.shuffle ? 'Desactivar mezcla' : 'Activar mezcla',
      active: kit.shuffle,
      onPress: kit.toggleShuffle,
    },
    {
      key: 'repeat',
      caption: repeatOne ? 'UNA' : kit.repeatOn ? 'TODO' : 'REPETIR',
      label: kit.repeatLabel,
      active: kit.repeatOn,
      onPress: kit.cycleRepeat,
    },
    {
      key: 'more',
      caption: 'MÁS',
      label: 'Más opciones: temporizador, velocidad, ecualizador y acciones',
      active: more,
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
          paddingBottom: insets.bottom + 6,
        },
      ]}
    >
      <DragHeader gesture={headerGesture} style={styles.header}>
        <Pressable
          accessibilityLabel="Cerrar reproductor"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.headerButton}
        >
          <Svg fill="none" height={26} viewBox="0 0 24 24" width={26}>
            <Path
              d="M5 9l7 7 7-7"
              stroke={s.ink}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
            />
          </Svg>
        </Pressable>
        <View style={styles.headerInfo}>
          <Text numberOfLines={1} style={[styles.chapter, { color: s.ink }]}>
            CAPÍTULO {chapter}
          </Text>
          <Text numberOfLines={1} style={[styles.source, { color: s.sub }]}>
            {kit.sourceLabel} · {chapter} de {kit.queueCount}
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
          <Svg height={26} viewBox="0 0 24 24" width={26}>
            <Path
              d="M12 20s-7-4.4-9-9.2C1.7 7.4 4 4 7.3 4c2 0 3.6 1.1 4.7 2.8C13.1 5.1 14.7 4 16.7 4 20 4 22.3 7.4 21 10.8 19 15.6 12 20 12 20z"
              fill={kit.favorite ? s.accent : 'none'}
              stroke={kit.favorite ? s.accent : s.ink}
              strokeLinejoin="round"
              strokeWidth={2.4}
            />
          </Svg>
        </Pressable>
      </DragHeader>

      <View
        style={[styles.page, { width: W, height: heroH + eyesH - overlap }]}
      >
        <Animated.View
          accessible
          accessibilityLabel="Página de manga con la portada y líneas de acción"
          onLayout={clock.onLayout}
          style={[{ width: W, height: heroH }, heroPage]}
        >
          <Svg height={heroH} style={StyleSheet.absoluteFill} width={W}>
            <Defs>
              <ClipPath id="mg-hero">
                <Polygon points={heroPoints} />
              </ClipPath>
            </Defs>
            <Polygon fill={s.panel} points={heroPoints} />
            <G clipPath="url(#mg-hero)">
              <FocusLines clock={clock} color={s.ink} d={lines.a} set={0} />
              <FocusLines clock={clock} color={s.ink} d={lines.b} set={1} />
            </G>
            <Polygon
              fill="none"
              points={`1.5,1.5 ${W - 1.5},1.5 ${W - 1.5},${heroH - diag} 1.5,${
                heroH - 1.5
              }`}
              stroke={s.ink}
              strokeWidth={2.5}
            />
          </Svg>
          <View
            style={[
              styles.narration,
              {
                maxWidth: W - 90,
                borderColor: s.ink,
                backgroundColor: s.panel,
              },
            ]}
          >
            <Text numberOfLines={1} style={[styles.artist, { color: s.ink }]}>
              — {track.artist}
            </Text>
          </View>
          <View
            style={[
              styles.vertical,
              { borderColor: s.ink, backgroundColor: s.panel },
            ]}
          >
            {Array.from(chapterKanji(chapter)).map((glyph, index) => (
              <Text
                key={`${glyph}${index}`}
                style={[styles.kanji, KATAKANA, { color: s.ink }]}
              >
                {glyph}
              </Text>
            ))}
          </View>
          <View
            style={[
              styles.coverSpot,
              {
                left: (W - cover) / 2,
                top: coverTop,
              },
            ]}
          >
            <MangaCover clock={clock} size={cover} uri={track.artwork} />
          </View>
          <View style={[styles.sfxSpot, { top: coverTop + cover * 0.55 }]}>
            <SoundEffects clock={clock} ink={s.ink} paper={s.panel} />
          </View>
        </Animated.View>
        <View style={[styles.layer, { top: heroH - overlap }]}>
          <EyesPanel clock={clock} height={eyesH} width={W} />
        </View>
        <View
          style={[
            styles.layer,
            { top: heroH - Math.round(38 * S), left: Math.round(8 * S) },
          ]}
        >
          <TitleBubble clock={clock} kit={kit} width={W - Math.round(16 * S)} />
        </View>
      </View>

      <View style={styles.grow} />

      <SeekArea kit={kit} style={[styles.seek, { width: W }]}>
        <Svg height={SEEK} width={W}>
          <Path
            d={`M2 19 L ${W - 2} 19`}
            opacity={0.6}
            stroke={s.ink}
            strokeDasharray="1 6"
            strokeLinecap="round"
            strokeWidth={2}
          />
          {brush ? <Path d={brush} fill={s.ink} /> : null}
          <Circle
            cx={ends}
            cy={18}
            fill={s.accent}
            r={9}
            stroke={s.ink}
            strokeWidth={2.5}
          />
          <Circle cx={ends - 3} cy={15} fill={s.panel} r={2.4} />
        </Svg>
      </SeekArea>
      <View style={[styles.times, { width: W }]}>
        <Text style={[styles.time, { color: s.ink }]}>
          {formatTime(kit.position)}
        </Text>
        <Text style={[styles.time, { color: s.ink }]}>
          {formatTime(kit.duration)}
        </Text>
      </View>

      <View style={styles.grow} />

      <Animated.View style={[{ width: W, height: TRANSPORT }, turn]}>
        <Svg height={TRANSPORT} style={StyleSheet.absoluteFill} width={W}>
          <Defs>
            <ClipPath id="mg-play">
              <Polygon points={playPoints} />
            </ClipPath>
          </Defs>
          <Polygon
            fill={s.panel}
            points={`1.5,1.5 ${x(80)},1.5 ${x(72)},88.5 1.5,88.5`}
            stroke={s.ink}
            strokeWidth={2.5}
          />
          <Polygon fill={s.accent} points={playPoints} />
          <G clipPath="url(#mg-play)">
            <Path d={flash} fill={s.onAccent} opacity={0.28} />
          </G>
          <Polygon
            fill="none"
            points={playPoints}
            stroke={s.ink}
            strokeWidth={2.5}
          />
          <Polygon
            fill={s.panel}
            points={`${x(256)},1.5 ${W - 1.5},1.5 ${W - 1.5},88.5 ${x(
              264,
            )},88.5`}
            stroke={s.ink}
            strokeWidth={2.5}
          />
          <G fill={s.ink}>
            <Path
              d={`M${x(24)} 45 L ${x(44)} 31 L ${x(44)} 59 Z M ${x(
                40,
              )} 45 L ${x(60)} 31 L ${x(60)} 59 Z`}
            />
            <Path
              d={`M${x(312)} 45 L ${x(292)} 31 L ${x(292)} 59 Z M ${x(
                296,
              )} 45 L ${x(276)} 31 L ${x(276)} 59 Z`}
            />
          </G>
          <G stroke={s.ink} strokeLinecap="round" strokeWidth={2}>
            <Path
              d={`M${x(62)} 36 L ${x(70)} 36 M ${x(62)} 45 L ${x(68)} 45 M ${x(
                62,
              )} 54 L ${x(70)} 54`}
            />
            <Path
              d={`M${x(274)} 36 L ${x(266)} 36 M ${x(274)} 45 L ${x(
                268,
              )} 45 M ${x(274)} 54 L ${x(266)} 54`}
            />
          </G>
        </Svg>
        <Pressable
          accessibilityLabel="Canción anterior"
          accessibilityRole="button"
          disabled={!kit.ready || kit.busy}
          onPress={kit.previous}
          style={[styles.hit, styles.hitStart, { width: 78 * S }]}
        />
        <Pressable
          accessibilityLabel={kit.isPlaying ? 'Pausar' : 'Reproducir'}
          accessibilityRole="button"
          disabled={!kit.ready}
          onPress={kit.toggle}
          style={[styles.hit, { left: 86 * S, width: 164 * S }]}
        >
          <Text style={[styles.playText, { color: s.onAccent }]}>
            {kit.isPlaying ? 'PAUSA' : '¡PLAY!'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Siguiente canción"
          accessibilityRole="button"
          disabled={!kit.ready || kit.busy}
          onPress={kit.next}
          style={[styles.hit, { left: 258 * S, width: W - 258 * S }]}
        />
      </Animated.View>

      <View style={[styles.tools, { width: W }]}>
        {tools.map(tool => (
          <Bubble
            key={tool.key}
            active={tool.active}
            caption={tool.caption}
            height={TOOLS}
            label={tool.label}
            onPress={tool.onPress}
            width={toolW}
          />
        ))}
      </View>

      <Text style={[styles.folio, { color: s.sub }]}>— {chapter} —</Text>

      {more ? (
        <Extras kit={kit} onClose={() => setMore(false)} width={W} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  player: { flex: 1, alignItems: 'center' },
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
  chapter: {
    fontFamily: 'Bangers-Regular',
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: 2,
  },
  source: { fontFamily: 'ComicNeue-Regular', fontSize: 12, lineHeight: 15 },
  page: { marginTop: 4 },
  layer: { position: 'absolute', left: 0 },
  narration: {
    position: 'absolute',
    left: 10,
    top: 10,
    borderWidth: 2,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  artist: { fontFamily: 'ComicNeue-Regular', fontSize: 15, lineHeight: 20 },
  vertical: {
    position: 'absolute',
    right: 10,
    top: 10,
    width: 32,
    borderWidth: 2,
    paddingVertical: 6,
    alignItems: 'center',
  },
  kanji: { fontSize: 15, lineHeight: 20 },
  coverSpot: { position: 'absolute', transform: [{ rotate: '-3deg' }] },
  cover: { overflow: 'hidden' },
  sfx: { width: 200, height: 120 },
  sfxSpot: { position: 'absolute', left: -14 },
  hitStart: { left: 0 },
  eyesOrigin: { transformOrigin: '50% 70%' },
  bang: {
    position: 'absolute',
    right: 14,
    top: '28%',
    fontFamily: 'Bangers-Regular',
    fontSize: 44,
    lineHeight: 54,
  },
  tail: { position: 'absolute', left: 66, top: -22 },
  bubbleText: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  marquee: { overflow: 'hidden', height: 32, justifyContent: 'center' },
  measure: {
    position: 'absolute',
    width: 4000,
    opacity: 0,
    flexDirection: 'row',
  },
  title: {
    fontFamily: 'Bangers-Regular',
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: 1,
  },
  centerText: { textAlign: 'center' },
  roll: { flexDirection: 'row', width: 8000 },
  rollGap: { paddingRight: 48 },
  seek: { height: SEEK, justifyContent: 'center' },
  times: {
    height: TIMES,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  time: {
    fontFamily: 'Bangers-Regular',
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: 1,
  },
  hit: {
    position: 'absolute',
    top: 0,
    height: TRANSPORT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playText: {
    fontFamily: 'Bangers-Regular',
    fontSize: 34,
    lineHeight: 42,
    letterSpacing: 2,
  },
  tools: {
    marginTop: GAP + 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bubble: { alignItems: 'center', justifyContent: 'center' },
  bubbleCaption: {
    fontFamily: 'Bangers-Regular',
    letterSpacing: 1,
    paddingHorizontal: 6,
  },
  folio: {
    height: FOLIO,
    marginTop: GAP,
    fontFamily: 'ComicNeue-Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  grow: { flex: 1 },
  extras: {
    position: 'absolute',
    alignSelf: 'center',
    borderWidth: 2.5,
    padding: 14,
    gap: 12,
  },
  extrasHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  omake: { fontSize: 22, lineHeight: 30 },
  extrasTitle: {
    fontFamily: 'Bangers-Regular',
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: 2,
  },
  close: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  extrasGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  extra: {
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  extraLabel: {
    fontFamily: 'Bangers-Regular',
    fontSize: 17,
    lineHeight: 21,
    letterSpacing: 1,
  },
  extraValue: { fontFamily: 'ComicNeue-Regular', fontSize: 12, lineHeight: 15 },
});
