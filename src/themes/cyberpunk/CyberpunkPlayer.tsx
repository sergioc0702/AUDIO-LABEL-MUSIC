import { useMemo, useState, type ReactNode } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RepeatMode } from 'react-native-track-player';
import { scheduleOnRN } from 'react-native-worklets';
import { Repeat, Repeat1, Shuffle } from 'lucide-react-native';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Pattern,
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

const DISPLAY = 'ChakraPetch-Bold';
const BODY = 'ChakraPetch-Medium';
const MONO = 'JetBrainsMono-Regular';
const KANJI = { fontWeight: '900' as const };
const SIGNS = [
  ['夜', '市'],
  ['音', '楽'],
  ['未', '来'],
  ['電', '気'],
  ['酒', '場'],
  ['東', '京'],
];
const TYPED = '目標を確認';

/** Where the song change is, 0 to 1 (change falls from 1 to 0). */
function changePhase(change: number) {
  'worklet';
  return change > 0 ? 1 - change : 1;
}

/** A neon sign that rushes past at one side of the highway. */
function ZoomSign({
  clock,
  index,
  vx,
  vy,
  reach,
  color,
}: {
  clock: SceneClock;
  index: number;
  vx: number;
  vy: number;
  reach: number;
  color: string;
}) {
  const left = index % 2 === 0;
  const style = useAnimatedStyle(() => {
    const p = (clock.run.value * 0.45 + index / SIGNS.length) % 1;
    const e = p * p;
    return {
      opacity: p < 0.12 ? p / 0.12 : 1,
      transform: [
        { translateX: (left ? -1 : 1) * e * reach },
        { translateY: e * reach * 0.7 },
        { scale: 0.12 + e * 1.5 },
      ],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.sign,
        {
          left: vx - 12,
          top: vy - 24,
          borderColor: color,
          boxShadow: `0 0 10px ${color}`,
        },
        style,
      ]}
    >
      {SIGNS[index].map(ch => (
        <Text key={ch} style={[styles.signText, KANJI, { color }]}>
          {ch}
        </Text>
      ))}
    </Animated.View>
  );
}

/** A streak of light at the edge of sight, for speed. */
function Streak({
  clock,
  index,
  x,
  top,
  color,
}: {
  clock: SceneClock;
  index: number;
  x: number;
  top: number;
  color: string;
}) {
  const style = useAnimatedStyle(() => {
    const p = (clock.run.value * 1.4 + index * 0.17) % 1;
    return {
      opacity: (p < 0.3 ? p / 0.3 : 1 - p) * 0.8 * clock.play.value,
      transform: [{ translateY: -40 + p * 340 }, { scaleY: 0.4 + p }],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.streak, { left: x, top, backgroundColor: color }, style]}
    />
  );
}

/** The ride: sky, skyline, the elevated highway and what rushes past. */
function Highway({
  clock,
  width,
  height,
  dir,
}: {
  clock: SceneClock;
  width: number;
  height: number;
  dir: SharedValue<number>;
}) {
  const { colors } = useColors();
  const s = colors.skin;
  const vx = width / 2;
  const vy = height * 0.44;
  const lights = useMemo(
    () =>
      Array.from({ length: 30 }, (_, k) => ({
        key: k,
        x: noise(k + 1) * (width - 4),
        y: vy - 90 + noise(k + 40) * 88,
        c: [s.amber, s.hud, s.hot][k % 3],
      })),
    [s.amber, s.hot, s.hud, vy, width],
  );
  const sky = height * 0.45;
  const skyline = useMemo(() => {
    const steps = [
      200, 170, 210, 150, 196, 180, 220, 186, 230, 230, 190, 160, 206, 140, 196,
      176, 214, 182,
    ];
    const step = width / (steps.length - 1);
    let d = `M0 ${vy + 8}`;
    steps.forEach((h, i) => {
      const y = vy + 8 - (270 - h) * (height / 820) * 1.1;
      d += ` V ${y.toFixed(1)} H ${(i * step + step).toFixed(1)}`;
    });
    return `${d} V ${vy + 8} Z`;
  }, [height, vy, width]);
  const lane = (k: number) =>
    // A lane line from the vanishing point to the bottom edge.
    `M${vx + k * 8} ${vy} L ${vx + k * width * 0.23} ${height}`;
  const lanes = useAnimatedProps(() => ({
    strokeDashoffset: -((clock.run.value * 140) % 60),
  }));
  const swerve = useAnimatedStyle(() => {
    const k = changePhase(clock.change.value);
    const w = k < 1 ? Math.sin(Math.min(1, k / 0.7) * Math.PI) : 0;
    return {
      transform: [
        { translateX: -dir.value * 46 * w },
        { skewX: `${dir.value * 6 * w}deg` },
      ],
    };
  });
  const reach = width * 0.62;
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, swerve]}
    >
      <Svg height={height} style={StyleSheet.absoluteFill} width={width}>
        <Defs>
          <LinearGradient id="rn-sky" x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0" stopColor={s.sky1} />
            <Stop offset="0.7" stopColor={s.sky2} />
            <Stop offset="1" stopColor={s.horizon} />
          </LinearGradient>
        </Defs>
        <Rect fill={s.bg} height={height} width={width} />
        <Rect fill="url(#rn-sky)" height={sky} width={width} />
        <Path d={skyline} fill={s.city} />
        {lights.map(l => (
          <Rect key={l.key} fill={l.c} height={2} width={2} x={l.x} y={l.y} />
        ))}
        <Path
          d={`M${vx - 12} ${vy} L ${vx + 12} ${vy} L ${
            width + 60
          } ${height} L -60 ${height} Z`}
          fill={s.road}
        />
        <Line
          stroke={s.hud}
          strokeWidth={3}
          x1={vx - 12}
          x2={-60}
          y1={vy}
          y2={height}
        />
        <Line
          stroke={s.hud}
          strokeWidth={3}
          x1={vx + 12}
          x2={width + 60}
          y1={vy}
          y2={height}
        />
      </Svg>
      <Svg height={height} style={StyleSheet.absoluteFill} width={width}>
        <AnimatedPath
          animatedProps={lanes}
          d={`${lane(-1)} ${lane(1)}`}
          opacity={0.75}
          stroke={s.ink}
          strokeDasharray="18 42"
          strokeWidth={3}
        />
      </Svg>
      {SIGNS.map((_, i) => (
        <ZoomSign
          key={i}
          clock={clock}
          color={[s.hot, s.hud, s.amber][i % 3]}
          index={i}
          reach={reach}
          vx={vx}
          vy={vy}
        />
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <Streak
          key={i}
          clock={clock}
          color={i % 2 ? s.hud : s.hot}
          index={i}
          top={vy + 20}
          x={i < 4 ? 10 + i * 18 : width - 70 + (i - 4) * 18}
        />
      ))}
    </Animated.View>
  );
}

/** The billboard: the cover, coming closer as the song plays. */
function Billboard({
  clock,
  kit,
  size,
  dir,
}: {
  clock: SceneClock;
  kit: PlayerKit;
  size: number;
  dir: SharedValue<number>;
}) {
  const { colors } = useColors();
  const s = colors.skin;
  const approach = useAnimatedStyle(() => {
    const k = changePhase(clock.change.value);
    const arrive = k < 1 ? Math.max(0, (k - 0.55) / 0.45) : 1;
    return {
      opacity: arrive,
      transform: [
        { translateY: size * 0.5 },
        { scale: (0.7 + clock.progress.value * 0.45) * (0.2 + 0.8 * arrive) },
        { translateY: -size * 0.5 },
      ],
    };
  });
  const lock = useAnimatedStyle(() => {
    const k = changePhase(clock.change.value);
    const e = k < 1 ? Math.max(0, (k - 0.6) / 0.4) : 1;
    return { opacity: e, transform: [{ scale: 1.6 - 0.6 * e }] };
  });
  const glitch = useAnimatedStyle(() => {
    const k = changePhase(clock.change.value);
    if (k >= 0.55 || k <= 0) return { opacity: 0 };
    const step = Math.floor(k * 18) % 4;
    return {
      opacity: 0.85,
      top: [size * 0.1, size * 0.55, size * 0.3, size * 0.75][step],
      transform: [{ translateX: [-14, 12, -8, 6][step] }],
    };
  });
  const swipe = Gesture.Pan()
    .activeOffsetX([-16, 16])
    .failOffsetY([-14, 14])
    .onEnd(event => {
      if (Math.abs(event.translationX) < 50) return;
      const step = event.translationX < 0 ? 1 : -1;
      dir.value = step;
      scheduleOnRN(step > 0 ? kit.next : kit.previous);
    });
  const twice = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      scheduleOnRN(kit.toggle);
    });
  const uri = kit.track?.artwork;
  const lockBox = size + 36;
  return (
    <GestureDetector gesture={Gesture.Race(swipe, twice)}>
      <Animated.View
        accessibilityLabel={`Portada de ${kit.track?.title ?? ''}`}
        accessibilityHint="Desliza para cambiar de canción o toca dos veces para pausar"
        accessibilityRole="image"
        accessible
        collapsable={false}
        style={[{ width: size, height: size + 30 }, approach]}
      >
        <View
          style={[
            styles.board,
            {
              width: size,
              height: size,
              borderColor: s.hot,
              boxShadow: `0 0 28px ${s.hot}`,
              backgroundColor: s.key,
            },
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
              <Rect fill={s.sky2} height={100} width={100} />
              <Circle cx={64} cy={40} fill={s.hud} r={17} />
              <Path
                d="M0 74 L 18 60 L 30 66 L 46 50 L 62 62 L 80 48 L 100 60 L 100 100 L 0 100 Z"
                fill={s.city}
              />
            </Svg>
          )}
          <Svg height={size} style={StyleSheet.absoluteFill} width={size}>
            <Defs>
              <Pattern
                height={3}
                id="rn-scan"
                patternUnits="userSpaceOnUse"
                width={4}
              >
                <Rect fill="#000000" height={1} opacity={0.22} width={4} />
              </Pattern>
            </Defs>
            <Rect fill="url(#rn-scan)" height={size} width={size} />
          </Svg>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.glitch,
              { height: size * 0.16, backgroundColor: s.hud },
              glitch,
            ]}
          />
        </View>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.lock,
            { left: -18, top: -18, width: lockBox, height: lockBox },
            lock,
          ]}
        >
          <Svg height={lockBox} width={lockBox}>
            <Path
              d={`M2 32 V 2 H 32 M ${lockBox - 32} 2 H ${lockBox - 2} V 32 M ${
                lockBox - 2
              } ${lockBox - 32} V ${lockBox - 2} H ${lockBox - 32} M 32 ${
                lockBox - 2
              } H 2 V ${lockBox - 32}`}
              fill="none"
              stroke={s.hud}
              strokeWidth={3}
            />
          </Svg>
        </Animated.View>
        <View style={[styles.posts, { paddingHorizontal: size * 0.17 }]}>
          <View style={[styles.post, { backgroundColor: s.post }]} />
          <View style={[styles.post, { backgroundColor: s.post }]} />
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

/** Neon rings that rush at you when the song changes. */
function Tunnel({
  clock,
  cx,
  cy,
}: {
  clock: SceneClock;
  cx: number;
  cy: number;
}) {
  const { colors } = useColors();
  const s = colors.skin;
  const ring = (delay: number) => {
    'worklet';
    const k = changePhase(clock.change.value);
    const t = k < 1 ? Math.max(0, (k - delay) / (1 - delay)) : 1;
    return {
      opacity: t < 1 ? 0.9 * (1 - t) : 0,
      transform: [{ scale: 0.1 + t * 3.1 }],
    };
  };
  const a = useAnimatedStyle(() => ring(0));
  const b = useAnimatedStyle(() => ring(0.2));
  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ring,
          {
            left: cx - 100,
            top: cy - 100,
            width: 200,
            height: 200,
            borderColor: s.hud,
          },
          a,
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ring,
          {
            left: cx - 70,
            top: cy - 70,
            width: 140,
            height: 140,
            borderColor: s.hot,
          },
          b,
        ]}
      />
    </>
  );
}

/** 目標を確認 ("target confirmed"), written letter by letter. */
function Typing({ clock }: { clock: SceneClock }) {
  const { colors } = useColors();
  const style = useAnimatedStyle(() => {
    const p = (clock.wall.value % 3) / 3;
    return {
      width: Math.min(TYPED.length, Math.floor((p / 0.6) * TYPED.length)) * 14,
    };
  });
  return (
    <Animated.View style={[styles.typing, style]}>
      <Text
        numberOfLines={1}
        style={[styles.typed, KANJI, { color: colors.skin.hud }]}
      >
        {TYPED}
      </Text>
    </Animated.View>
  );
}

/** A bar of the signal window, moving with the music. */
function SignalBar({ clock, index }: { clock: SceneClock; index: number }) {
  const { colors } = useColors();
  const style = useAnimatedStyle(() => {
    const v =
      (Math.sin(clock.wall.value * (6 + noise(index + 9) * 5) + index) + 1) / 2;
    return {
      transform: [{ scaleY: 0.2 + v * 0.8 * (0.25 + 0.75 * clock.play.value) }],
    };
  });
  return (
    <Animated.View
      style={[styles.bar, { backgroundColor: colors.skin.hotText }, style]}
    />
  );
}

/** One line that rolls like a marquee only when it does not fit. */
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
  span.value = natural + 40;
  const fits = natural === 0 || box === 0 || natural <= box;
  const roll = useAnimatedStyle(() => {
    if (span.value <= 40) return { transform: [{ translateX: 0 }] };
    return {
      transform: [{ translateX: -((clock.wall.value * 26) % span.value) }],
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
        <Text numberOfLines={1} style={style}>
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

/** A window of the implant that floats a little. */
function Floating({
  clock,
  phase,
  style,
  children,
}: {
  clock: SceneClock;
  phase: number;
  style: object;
  children: ReactNode;
}) {
  const float = useAnimatedStyle(() => {
    const t = Math.sin(clock.wall.value * 0.9 + phase);
    return { transform: [{ translateX: t * 2 }, { translateY: t * -4 }] };
  });
  return <Animated.View style={[style, float]}>{children}</Animated.View>;
}

/** The holographic speedometer: the song's progress, and the seek bar. */
function Speedometer({ kit, width }: { kit: PlayerKit; width: number }) {
  const { colors } = useColors();
  const s = colors.skin;
  const r = Math.min(110, width / 2 - 8);
  const cx = width / 2;
  const cy = r + 14;
  const ang = Math.PI - kit.progress * Math.PI;
  const ex = cx + Math.cos(ang) * r;
  const ey = cy - Math.sin(ang) * r;
  const arc =
    kit.progress <= 0.001
      ? `M${cx - r} ${cy}`
      : `M${cx - r} ${cy} A ${r} ${r} 0 0 1 ${ex.toFixed(1)} ${ey.toFixed(1)}`;
  const ticks = Array.from({ length: 13 }, (_, k) => {
    const a = Math.PI - (k / 12) * Math.PI;
    return {
      key: k,
      x1: cx + Math.cos(a) * (r - 20),
      y1: cy - Math.sin(a) * (r - 20),
      x2: cx + Math.cos(a) * (r - 12),
      y2: cy - Math.sin(a) * (r - 12),
    };
  });
  return (
    <SeekArea kit={kit} style={{ width, height: cy + 8 }}>
      <Svg height={cy + 8} pointerEvents="none" width={width}>
        <Path
          d={`M${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          opacity={0.2}
          stroke={s.hud}
          strokeLinecap="round"
          strokeWidth={14}
        />
        <Path
          d={arc}
          fill="none"
          stroke={s.hud}
          strokeLinecap="round"
          strokeWidth={14}
        />
        {ticks.map(t => (
          <Line
            key={t.key}
            opacity={0.7}
            stroke={s.hud}
            strokeWidth={2}
            x1={t.x1}
            x2={t.x2}
            y1={t.y1}
            y2={t.y2}
          />
        ))}
        <Line
          stroke={s.hotText}
          strokeLinecap="round"
          strokeWidth={3}
          x1={cx}
          x2={cx + Math.cos(ang) * (r - 32)}
          y1={cy}
          y2={cy - Math.sin(ang) * (r - 32)}
        />
      </Svg>
      <View pointerEvents="none" style={[styles.speedText, { top: cy - 62 }]}>
        <Text style={[styles.clock, { color: s.ink, textShadowColor: s.hud }]}>
          {formatTime(kit.position)}
        </Text>
      </View>
      <View pointerEvents="none" style={[styles.speedText, { top: cy - 27 }]}>
        <Text style={[styles.clockSub, { color: s.sub }]}>
          / {formatTime(kit.duration)} · SINCRONÍA{' '}
          {Math.round(kit.progress * 100)}%
        </Text>
      </View>
    </SeekArea>
  );
}

/** Timer, speed, equalizer and the song menu. */
function Settings({ kit, onClose }: { kit: PlayerKit; onClose: () => void }) {
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
            bottom: insets.bottom + 16,
            backgroundColor: s.dash,
            borderColor: s.hud,
            boxShadow: `0 0 24px ${s.hud}`,
          },
        ]}
      >
        <View style={styles.sheetHead}>
          <Text style={[styles.sheetKanji, KANJI, { color: s.hud }]}>設定</Text>
          <Text style={[styles.sheetTitle, { color: s.ink }]}>AJUSTES</Text>
        </View>
        {rows.map(row => (
          <Pressable
            key={row.key}
            accessibilityLabel={`${row.label}: ${row.value}`}
            accessibilityRole="button"
            onPress={() => {
              onClose();
              row.onPress();
            }}
            style={[styles.sheetRow, { borderTopColor: s.post }]}
          >
            <Text style={[styles.sheetLabel, { color: s.ink }]}>
              {row.label}
            </Text>
            <Text style={[styles.sheetValue, { color: s.hud }]}>
              {row.value.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function RoundKey({
  label,
  disabled,
  onPress,
  forward,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
  forward: boolean;
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
        styles.round,
        {
          backgroundColor: s.key,
          borderColor: s.hud,
          boxShadow: `0 0 10px ${s.hud}`,
          opacity: disabled ? 0.5 : 1,
          transform: [{ scale: pressed ? 0.93 : 1 }],
        },
      ]}
    >
      <Svg height={18} viewBox="0 0 30 22" width={24}>
        <Path
          d={
            forward
              ? 'M3 2 L 14 11 L 3 20 Z M 16 2 L 27 11 L 16 20 Z'
              : 'M14 2 L 3 11 L 14 20 Z M 27 2 L 16 11 L 27 20 Z'
          }
          fill={s.ink}
        />
      </Svg>
    </Pressable>
  );
}

function GripToggle({
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
      style={({ pressed }) => [
        styles.gripKey,
        {
          backgroundColor: on ? s.hud : s.key,
          transform: [{ scale: pressed ? 0.93 : 1 }],
        },
      ]}
    >
      {children}
    </Pressable>
  );
}

export function CyberpunkPlayer({
  covered,
  headerGesture,
  onClose,
}: SkinProps) {
  const kit = usePlayerKit({ covered });
  const clock = useSceneClock(kit, {
    boost: 3,
    changeSeconds: 1.3,
    baseWidth: 360,
  });
  const { width, height } = useWindowDimensions();
  const { colors } = useColors();
  const insets = useSafeAreaInsets();
  const [more, setMore] = useState(false);
  const dir = useSharedValue(1);

  if (!kit.track) return null;
  const s = colors.skin;
  const H = height - insets.top - insets.bottom;
  const y = (v: number) => (v / 820) * H;
  const roadH = y(600);
  const board = 168;
  const boardTop = y(150);
  const gauge = Math.min(236, width - 124);
  const position = Math.max(1, kit.queueIndex + 1);
  const nextIndex = kit.queueIndex + 1;
  const upNext = kit.queue[nextIndex];
  const repeatOne = kit.repeatMode === RepeatMode.Track;
  const RepeatIcon = repeatOne ? Repeat1 : Repeat;
  const route = String(position).padStart(2, '0');
  const ink = (on: boolean) => (on ? s.onHud : s.ink);

  return (
    <View
      style={[styles.player, { backgroundColor: s.bg, paddingTop: insets.top }]}
    >
      <View
        onLayout={clock.onLayout}
        style={[styles.scene, { top: insets.top, height: roadH }]}
      >
        <Highway clock={clock} dir={dir} height={roadH} width={width} />
      </View>

      <View style={[styles.boardSpot, { top: insets.top + boardTop }]}>
        <Billboard clock={clock} dir={dir} kit={kit} size={board} />
      </View>
      <View style={[styles.lockText, { top: insets.top + y(366) }]}>
        <Typing clock={clock} />
        <Text style={[styles.mono, { color: s.sub }]}>
          OBJETIVO FIJADO · DIST{' '}
          {formatTime(Math.max(0, kit.duration - kit.position))}
        </Text>
      </View>
      <Tunnel clock={clock} cx={width / 2} cy={insets.top + y(262)} />

      {upNext ? (
        <Pressable
          accessibilityLabel={`Siguiente salida: reproducir ${upNext.title}`}
          accessibilityRole="button"
          onPress={() => kit.playQueueTrack(nextIndex)}
          style={[
            styles.exit,
            {
              top: insets.top + y(236),
              backgroundColor: s.exit,
              borderColor: s.ink,
            },
          ]}
        >
          <View style={styles.exitHead}>
            <Text style={[styles.exitKanji, KANJI, { color: s.onExit }]}>
              出口
            </Text>
            <Text style={[styles.exitSmall, { color: s.onExit }]}>
              SALIDA {String(nextIndex + 1).padStart(2, '0')} ↗
            </Text>
          </View>
          <Text
            numberOfLines={1}
            style={[styles.exitTitle, { color: s.onExit }]}
          >
            {upNext.title}
          </Text>
        </Pressable>
      ) : null}

      <Svg
        height={H}
        pointerEvents="none"
        style={[styles.frame, { top: insets.top }]}
        width={width}
      >
        <Path
          d={`M10 70 V 10 H 70 M ${width - 70} 10 H ${width - 10} V 70`}
          fill="none"
          opacity={0.7}
          stroke={s.hud}
          strokeWidth={2}
        />
      </Svg>

      <DragHeader gesture={headerGesture} style={styles.header}>
        <Pressable
          accessibilityLabel="Cerrar reproductor"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.headerButton}
        >
          <Svg fill="none" height={22} viewBox="0 0 24 24" width={22}>
            <Path
              d="M5 9l7 7 7-7"
              stroke={s.hud}
              strokeLinecap="square"
              strokeWidth={2.4}
            />
          </Svg>
        </Pressable>
        <View style={styles.headerInfo}>
          <Text numberOfLines={1}>
            <Text style={[styles.headKanji, KANJI, { color: s.hud }]}>
              神経リンク
            </Text>
            <Text style={[styles.heading, { color: s.ink }]}>
              {' '}
              · RUTA {route}
            </Text>
          </Text>
          <Text numberOfLines={1} style={[styles.mono, { color: s.sub }]}>
            {kit.sourceLabel.toUpperCase()} {position}/{kit.queueCount} ·{' '}
            {kit.isPlaying ? 'EN MARCHA' : 'FRENO'}
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
          <Svg height={22} viewBox="0 0 24 24" width={22}>
            <Path
              d="M12 20s-7-4.4-9-9.2C1.7 7.4 4 4 7.3 4c2 0 3.6 1.1 4.7 2.8C13.1 5.1 14.7 4 16.7 4 20 4 22.3 7.4 21 10.8 19 15.6 12 20 12 20z"
              fill={kit.favorite ? s.hot : 'none'}
              stroke={kit.favorite ? s.hot : s.hud}
              strokeLinejoin="round"
              strokeWidth={2.2}
            />
          </Svg>
        </Pressable>
        <Pressable
          accessibilityLabel="Más opciones: temporizador, velocidad, ecualizador y acciones"
          accessibilityRole="button"
          onPress={() => setMore(true)}
          style={styles.headerButton}
        >
          <Svg fill="none" height={22} viewBox="0 0 24 24" width={22}>
            <Path
              d="M4 7h16M4 12h16M4 17h10"
              stroke={s.hud}
              strokeWidth={2.2}
            />
          </Svg>
        </Pressable>
      </DragHeader>

      <Floating
        clock={clock}
        phase={0}
        style={[
          styles.window,
          {
            left: 12,
            top: insets.top + y(70),
            width: width * 0.55,
            backgroundColor: s.glass,
            borderColor: s.hud,
          },
        ]}
      >
        <Text style={[styles.winHead, KANJI, { color: s.hud }]}>
          名前 · EN LA VALLA
        </Text>
        <Marquee
          clock={clock}
          style={[styles.winTitle, { color: s.ink }]}
          text={kit.track.title}
        />
        <Text numberOfLines={1} style={[styles.winSub, { color: s.sub }]}>
          {kit.track.artist}
        </Text>
      </Floating>
      <Floating
        clock={clock}
        phase={2}
        style={[
          styles.window,
          styles.signal,
          {
            right: 12,
            top: insets.top + y(84),
            backgroundColor: s.glass2,
            borderColor: s.hotText,
          },
        ]}
      >
        <Text style={[styles.winHead, KANJI, { color: s.hotText }]}>
          信号 · SEÑAL
        </Text>
        <View style={styles.bars}>
          {Array.from({ length: 12 }, (_, i) => (
            <SignalBar key={i} clock={clock} index={i} />
          ))}
        </View>
      </Floating>

      <Svg
        height={H}
        pointerEvents="none"
        style={[styles.frame, { top: insets.top }]}
        width={width}
      >
        <Path
          d={`M0 ${y(670)} Q ${width / 2} ${y(610)} ${width} ${y(
            670,
          )} V ${H} H 0 Z`}
          fill={s.dash}
        />
        <Path
          d={`M0 ${y(670)} Q ${width / 2} ${y(610)} ${width} ${y(670)}`}
          fill="none"
          stroke={s.hot}
          strokeWidth={2}
        />
      </Svg>
      <Text style={[styles.hint, { top: insets.top + y(400), color: s.sub }]}>
        ‹ DESLIZA LA VALLA PARA CAMBIAR · 2 TOQUES = PAUSA ›
      </Text>

      <View
        style={[
          styles.gauge,
          {
            left: (width - gauge) / 2,
            top: insets.top + y(616) - Math.min(110, gauge / 2 - 8) - 14,
          },
        ]}
      >
        <Speedometer kit={kit} width={gauge} />
      </View>

      <View
        style={[
          styles.grip,
          styles.gripLeft,
          {
            top: insets.top + y(650),
            backgroundColor: s.grip,
            borderColor: s.post,
          },
        ]}
      >
        <RoundKey
          disabled={!kit.ready || kit.busy}
          forward={false}
          label="Canción anterior"
          onPress={kit.previous}
        />
        <GripToggle
          label={kit.shuffle ? 'Desactivar mezcla' : 'Activar mezcla'}
          on={kit.shuffle}
          onPress={kit.toggleShuffle}
        >
          <Shuffle color={ink(kit.shuffle)} size={20} />
        </GripToggle>
      </View>
      <View
        style={[
          styles.grip,
          styles.gripRight,
          {
            top: insets.top + y(650),
            backgroundColor: s.grip,
            borderColor: s.post,
          },
        ]}
      >
        <RoundKey
          disabled={!kit.ready || kit.busy}
          forward
          label="Siguiente canción"
          onPress={kit.next}
        />
        <GripToggle
          label={kit.repeatLabel}
          on={kit.repeatOn}
          onPress={kit.cycleRepeat}
        >
          <RepeatIcon color={ink(kit.repeatOn)} size={20} />
        </GripToggle>
      </View>

      <View style={[styles.centerRow, { top: insets.top + y(658) }]}>
        <Pressable
          accessibilityLabel={kit.isPlaying ? 'Pausar' : 'Reproducir'}
          accessibilityRole="button"
          disabled={!kit.ready}
          onPress={kit.toggle}
          style={({ pressed }) => [
            styles.ignition,
            {
              backgroundColor: s.hot,
              boxShadow: `0 0 24px ${s.hot}`,
              transform: [{ scale: pressed ? 0.94 : 1 }],
            },
          ]}
        >
          <Svg height={24} viewBox="0 0 30 30" width={24}>
            {kit.isPlaying ? (
              <>
                <Rect fill={s.onHot} height={20} width={6} x={7} y={5} />
                <Rect fill={s.onHot} height={20} width={6} x={17} y={5} />
              </>
            ) : (
              <Path d="M9 4 L 26 15 L 9 26 Z" fill={s.onHot} />
            )}
          </Svg>
          <Text style={[styles.ignitionText, KANJI, { color: s.onHot }]}>
            {kit.isPlaying ? '停止' : '発進'}
          </Text>
        </Pressable>
      </View>
      <View
        style={[styles.centerRow, styles.pills, { top: insets.top + y(758) }]}
      >
        <Pressable
          accessibilityLabel={`Abrir cola de reproducción con ${kit.queueCount} canciones`}
          accessibilityRole="button"
          onPress={kit.openQueue}
          style={[
            styles.pill,
            { backgroundColor: s.glass, borderColor: s.hud },
          ]}
        >
          <Text style={[styles.pillKanji, KANJI, { color: s.hud }]}>列</Text>
          <Text style={[styles.pillText, { color: s.ink }]}>Cola</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={`Abrir letras de ${kit.track.title}`}
          accessibilityRole="button"
          onPress={kit.openLyrics}
          style={[
            styles.pill,
            { backgroundColor: s.glass, borderColor: s.hud },
          ]}
        >
          <Text style={[styles.pillKanji, KANJI, { color: s.hud }]}>詞</Text>
          <Text style={[styles.pillText, { color: s.ink }]}>Letras</Text>
        </Pressable>
      </View>

      {more ? <Settings kit={kit} onClose={() => setMore(false)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  player: { flex: 1, overflow: 'hidden' },
  scene: { position: 'absolute', left: 0, right: 0, overflow: 'hidden' },
  sign: {
    position: 'absolute',
    width: 24,
    paddingVertical: 3,
    borderRadius: 3,
    borderWidth: 2,
    alignItems: 'center',
  },
  signText: { fontSize: 13, lineHeight: 15 },
  streak: { position: 'absolute', width: 2, height: 60 },
  boardSpot: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  board: { borderRadius: 4, borderWidth: 3, overflow: 'hidden' },
  glitch: { position: 'absolute', left: 0, right: 0 },
  lock: { position: 'absolute' },
  posts: { flexDirection: 'row', justifyContent: 'space-between' },
  post: { width: 6, height: 30 },
  ring: { position: 'absolute', borderRadius: 999, borderWidth: 5, opacity: 0 },
  lockText: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  typing: { height: 18, overflow: 'hidden' },
  typed: { fontSize: 13, lineHeight: 18, width: 80 },
  mono: { fontFamily: MONO, fontSize: 11, lineHeight: 15 },
  exit: {
    position: 'absolute',
    right: 8,
    width: 104,
    minHeight: 44,
    borderRadius: 4,
    borderWidth: 2,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  exitHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  exitKanji: { fontSize: 11, lineHeight: 14 },
  exitSmall: { fontFamily: DISPLAY, fontSize: 10, lineHeight: 14 },
  exitTitle: { fontFamily: DISPLAY, fontSize: 13, lineHeight: 17 },
  frame: { position: 'absolute', left: 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: 8,
    gap: 2,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: { flex: 1, minWidth: 0 },
  headKanji: { fontSize: 13, lineHeight: 18 },
  heading: {
    fontFamily: DISPLAY,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 2,
  },
  window: {
    position: 'absolute',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  signal: { width: 124 },
  winHead: { fontSize: 11, lineHeight: 15 },
  winTitle: { fontFamily: DISPLAY, fontSize: 18, lineHeight: 25 },
  winSub: { fontFamily: BODY, fontSize: 13, lineHeight: 17 },
  marquee: { overflow: 'hidden', height: 25, justifyContent: 'center' },
  measure: {
    position: 'absolute',
    width: 4000,
    opacity: 0,
    flexDirection: 'row',
  },
  roll: { flexDirection: 'row', width: 8000 },
  rollGap: { paddingRight: 40 },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 28,
    marginTop: 3,
  },
  bar: { flex: 1, height: 28, transformOrigin: 'bottom' },
  speedText: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  clock: {
    fontFamily: MONO,
    fontSize: 28,
    lineHeight: 34,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  clockSub: { fontFamily: MONO, fontSize: 11, lineHeight: 14 },
  hint: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: MONO,
    fontSize: 10,
    lineHeight: 13,
  },
  gauge: { position: 'absolute' },
  centerRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  grip: {
    position: 'absolute',
    width: 84,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  gripLeft: {
    left: 0,
    borderTopRightRadius: 42,
    borderBottomRightRadius: 42,
    borderRightWidth: 2,
  },
  gripRight: {
    right: 0,
    borderTopLeftRadius: 42,
    borderBottomLeftRadius: 42,
    borderLeftWidth: 2,
  },
  round: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gripKey: {
    width: 48,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ignition: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  ignitionText: { fontSize: 11, lineHeight: 14 },
  pills: { flexDirection: 'row', gap: 8 },
  pill: {
    width: 76,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  pillKanji: { fontSize: 13, lineHeight: 16 },
  pillText: { fontFamily: DISPLAY, fontSize: 13, lineHeight: 16 },
  sheet: {
    position: 'absolute',
    left: 12,
    right: 12,
    borderRadius: 8,
    borderWidth: 2,
    padding: 16,
    gap: 4,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    paddingBottom: 6,
  },
  sheetKanji: { fontSize: 20, lineHeight: 26 },
  sheetTitle: {
    fontFamily: DISPLAY,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: 3,
  },
  sheetRow: {
    minHeight: 52,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sheetLabel: { fontFamily: BODY, fontSize: 17, lineHeight: 22, flexShrink: 1 },
  sheetValue: {
    fontFamily: DISPLAY,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 1,
  },
});
